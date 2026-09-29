import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '../../../lib/db';
import { generateFingerprint } from '../../../lib/parser/deduplicator';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const bank = searchParams.get('bank');
    const type = searchParams.get('type');
    const needsReview = searchParams.get('needsReview');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const db = getDb();
    let query = `
      SELECT t.*, a.bank_name, a.account_mask
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.is_deleted = 0
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (t.merchant LIKE ? OR t.ref_id LIKE ? OR t.raw_text LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category && category !== 'All') {
      query += ` AND t.category = ?`;
      params.push(category);
    }

    if (bank && bank !== 'All') {
      query += ` AND (t.account_id = ? OR a.account_mask = ?)`;
      params.push(bank, bank);
    }

    if (type && type !== 'All') {
      query += ` AND t.type = ?`;
      params.push(type);
    }

    if (needsReview === 'true') {
      query += ` AND t.parser_status = 'NEEDS_REVIEW'`;
    }

    query += ` ORDER BY COALESCE(t.transaction_at, t.ingested_at) DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const transactions = db.prepare(query).all(...params);

    const totalCount = db.prepare(`
      SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 0
    `).get() as { count: number };

    const needsReviewCount = db.prepare(`
      SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 0 AND parser_status = 'NEEDS_REVIEW'
    `).get() as { count: number };

    return NextResponse.json({
      transactions,
      totalCount: totalCount.count,
      needsReviewCount: needsReviewCount.count,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, type, merchant, category, accountId, transactionAt } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid positive amount is required' }, { status: 400 });
    }

    const db = getDb();
    const id = 'txn_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();
    const txnType = type || 'DEBIT';
    const txnMerchant = merchant || 'Manual Entry';
    const txnCategory = category || 'Other';
    const fingerprint = generateFingerprint(amount, txnType, accountId || null, txnMerchant);

    db.prepare(`
      INSERT INTO transactions (
        id, amount, type, merchant, category, account_id, balance_after,
        ref_id, source, parser_status, parser_confidence, raw_text,
        transaction_at, ingested_at, fingerprint, is_internal_transfer,
        is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'Manual', 'PARSED', 1.0, ?, ?, ?, ?, 0, 0, ?, ?)
    `).run(
      id,
      amount,
      txnType,
      txnMerchant,
      txnCategory,
      accountId || null,
      `Manual entry: ${txnMerchant} - ₹${amount}`,
      transactionAt || now,
      now,
      fingerprint,
      now,
      now
    );

    return NextResponse.json({ success: true, transactionId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
