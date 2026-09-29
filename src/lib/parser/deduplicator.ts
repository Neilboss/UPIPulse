// UPIPulse Multi-Level Deduplication & UPI + Bank SMS Fusion Engine
import crypto from 'crypto';
import { Database } from 'better-sqlite3';
import { ParsedTransaction, TransactionRecord } from './types';

export interface DeduplicationResult {
  isDuplicate: boolean;
  isFused: boolean;
  existingTransactionId?: string;
  fusedTransaction?: Partial<TransactionRecord>;
  reason?: string;
}

export function generateFingerprint(
  amount: number,
  type: string,
  accountMask: string | null,
  merchant: string | null
): string {
  const normMerchant = (merchant || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const normAccount = (accountMask || 'none').toUpperCase();
  const raw = `${amount.toFixed(2)}_${type}_${normAccount}_${normMerchant}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

export function checkDuplicateAndFuse(
  incoming: ParsedTransaction,
  db: Database
): DeduplicationResult {
  if (!incoming.amount || incoming.amount <= 0) {
    return { isDuplicate: false, isFused: false };
  }

  // --- LEVEL 1: Exact Reference ID / UTR match within 24 hours ---
  if (incoming.refId && incoming.refId.length >= 6) {
    const existing = db
      .prepare(`
        SELECT * FROM transactions 
        WHERE ref_id = ? AND is_deleted = 0
        ORDER BY created_at DESC LIMIT 1
      `)
      .get(incoming.refId) as TransactionRecord | undefined;

    if (existing) {
      // Check if this can be fused (e.g. one was UPI notification, other is Bank SMS)
      const canFuse =
        (existing.source === 'UPI' && incoming.source === 'Bank SMS') ||
        (existing.source === 'Bank SMS' && incoming.source === 'UPI');

      if (canFuse) {
        // Fuse best attributes
        const cleanMerchant =
          incoming.source === 'UPI' && incoming.merchant && incoming.merchant !== 'Unknown Merchant'
            ? incoming.merchant
            : existing.merchant !== 'Unknown Merchant'
            ? existing.merchant
            : incoming.merchant || 'Unknown Merchant';

        const accountMask = incoming.source === 'Bank SMS' ? incoming.accountMask : existing.account_id;
        const balanceAfter = incoming.source === 'Bank SMS' && incoming.balanceAfter !== null
          ? incoming.balanceAfter
          : existing.balance_after;

        const fusedConfidence = Math.min(0.98, Math.max(existing.parser_confidence, incoming.confidence) + 0.1);

        return {
          isDuplicate: true,
          isFused: true,
          existingTransactionId: existing.id,
          fusedTransaction: {
            merchant: cleanMerchant,
            balance_after: balanceAfter,
            source: 'UPI + Bank SMS',
            parser_confidence: fusedConfidence,
            parser_status: 'PARSED',
            updated_at: new Date().toISOString(),
          },
          reason: `Fused UPI notification and Bank SMS via matching Ref ID ${incoming.refId}`,
        };
      }

      // Exact duplicate
      return {
        isDuplicate: true,
        isFused: false,
        existingTransactionId: existing.id,
        reason: `Duplicate transaction with identical Ref ID ${incoming.refId}`,
      };
    }
  }

  // --- LEVEL 2: Candidate Fingerprint match within 10-minute window ---
  const candidates = db
    .prepare(`
      SELECT * FROM transactions
      WHERE amount = ? AND type = ? AND is_deleted = 0
      AND datetime(ingested_at) >= datetime('now', '-10 minutes')
      ORDER BY ingested_at DESC LIMIT 5
    `)
    .all(incoming.amount, incoming.type) as TransactionRecord[];

  for (const candidate of candidates) {
    const sameAccount = incoming.accountMask && candidate.account_id && incoming.accountMask === candidate.account_id;
    const sameMerchant =
      incoming.merchant &&
      candidate.merchant &&
      incoming.merchant !== 'Unknown Merchant' &&
      candidate.merchant !== 'Unknown Merchant' &&
      (incoming.merchant.toLowerCase().includes(candidate.merchant.toLowerCase()) ||
        candidate.merchant.toLowerCase().includes(incoming.merchant.toLowerCase()));

    // Case A: Complementary fusion (UPI + Bank SMS)
    const isComplementarySource =
      (candidate.source === 'UPI' && incoming.source === 'Bank SMS') ||
      (candidate.source === 'Bank SMS' && incoming.source === 'UPI');

    if (isComplementarySource && (sameMerchant || sameAccount)) {
      const cleanMerchant =
        incoming.source === 'UPI' && incoming.merchant && incoming.merchant !== 'Unknown Merchant'
          ? incoming.merchant
          : candidate.merchant;

      const balanceAfter =
        incoming.source === 'Bank SMS' && incoming.balanceAfter !== null
          ? incoming.balanceAfter
          : candidate.balance_after;

      return {
        isDuplicate: true,
        isFused: true,
        existingTransactionId: candidate.id,
        fusedTransaction: {
          merchant: cleanMerchant,
          balance_after: balanceAfter,
          source: 'UPI + Bank SMS',
          parser_confidence: 0.95,
          parser_status: 'PARSED',
          updated_at: new Date().toISOString(),
        },
        reason: `Fused complementary UPI and Bank SMS within 10-minute window`,
      };
    }

    // Case B: Same source duplicate within 10 minutes for exact same merchant
    if (candidate.source === incoming.source && sameMerchant) {
      return {
        isDuplicate: true,
        isFused: false,
        existingTransactionId: candidate.id,
        reason: `Duplicate message from same source within time window`,
      };
    }
  }

  return { isDuplicate: false, isFused: false };
}
