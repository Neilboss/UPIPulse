import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '../../../lib/db';
import { IngestPayloadSchema } from '../../../lib/validation';
import { authenticateApiKey, checkRateLimit } from '../../../lib/security';
import { parseTransactionMessage } from '../../../lib/parser/smsParser';
import { categorizeTransaction } from '../../../lib/parser/categorizer';
import { checkDuplicateAndFuse, generateFingerprint } from '../../../lib/parser/deduplicator';

export async function POST(req: NextRequest) {
  try {
    const headerKey =
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      null;

    if (!authenticateApiKey(headerKey)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing API key' }, { status: 401 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || 'local';
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const validation = IngestPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const { text } = validation.data;
    const db = getDb();

    const parsed = parseTransactionMessage(text);

    if (parsed.status === 'UNSUPPORTED' || parsed.amount === null || parsed.amount <= 0) {
      return NextResponse.json({
        success: false,
        status: 'UNSUPPORTED',
        error: parsed.explanation || 'Message does not contain a recognizable financial transaction',
      }, { status: 200 });
    }

    const dedup = checkDuplicateAndFuse(parsed, db);

    if (dedup.isDuplicate) {
      if (dedup.isFused && dedup.existingTransactionId && dedup.fusedTransaction) {
        const fused = dedup.fusedTransaction;
        db.prepare(`
          UPDATE transactions SET
            merchant = COALESCE(?, merchant),
            balance_after = COALESCE(?, balance_after),
            source = ?,
            parser_confidence = ?,
            parser_status = ?,
            updated_at = ?
          WHERE id = ?
        `).run(
          fused.merchant || null,
          fused.balance_after || null,
          fused.source,
          fused.parser_confidence,
          fused.parser_status,
          fused.updated_at,
          dedup.existingTransactionId
        );

        if (parsed.accountMask && parsed.balanceAfter !== null) {
          syncAccountBalance(db, parsed.bankName || 'Bank', parsed.accountMask, parsed.balanceAfter);
        }

        return NextResponse.json({
          success: true,
          duplicate: true,
          fused: true,
          transactionId: dedup.existingTransactionId,
          message: dedup.reason,
        });
      }

      return NextResponse.json({
        success: true,
        duplicate: true,
        fused: false,
        transactionId: dedup.existingTransactionId,
        message: 'Already imported',
      });
    }

    const category = categorizeTransaction(parsed.merchant, parsed.normalizedText);

    let accountId: string | null = null;
    if (parsed.accountMask) {
      accountId = syncAccountBalance(db, parsed.bankName || 'Bank', parsed.accountMask, parsed.balanceAfter);
    }

    const id = 'txn_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();
    const fingerprint = generateFingerprint(
      parsed.amount,
      parsed.type,
      parsed.accountMask,
      parsed.merchant
    );

    db.prepare(`
      INSERT INTO transactions (
        id, amount, type, merchant, category, account_id, balance_after,
        ref_id, source, parser_status, parser_confidence, raw_text,
        transaction_at, ingested_at, fingerprint, is_internal_transfer,
        is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `).run(
      id,
      parsed.amount,
      parsed.type,
      parsed.merchant || 'Unknown Merchant',
      category,
      accountId,
      parsed.balanceAfter,
      parsed.refId,
      parsed.source,
      parsed.status,
      parsed.confidence,
      parsed.rawText,
      parsed.transactionAt,
      now,
      fingerprint,
      now,
      now
    );

    return NextResponse.json({
      success: true,
      transactionId: id,
      status: parsed.status,
      duplicate: false,
      confidence: parsed.confidence,
      merchant: parsed.merchant || 'Unknown Merchant',
      amount: parsed.amount,
      category,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

function syncAccountBalance(
  db: any,
  bankName: string,
  accountMask: string,
  balanceAfter: number | null
): string {
  const existingAcc = db.prepare('SELECT id, balance FROM accounts WHERE account_mask = ?').get(accountMask) as { id: string; balance: number | null } | undefined;
  const now = new Date().toISOString();

  if (existingAcc) {
    if (balanceAfter !== null) {
      db.prepare(`
        UPDATE accounts SET
          balance = ?,
          balance_updated_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(balanceAfter, now, now, existingAcc.id);
    }
    return existingAcc.id;
  }

  const newId = 'acc_' + accountMask.toLowerCase().replace(/[^a-z0-9]/g, '');
  db.prepare(`
    INSERT INTO accounts (id, bank_name, account_mask, balance, balance_updated_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId,
    bankName,
    accountMask,
    balanceAfter,
    balanceAfter !== null ? now : null,
    now,
    now
  );

  return newId;
}
