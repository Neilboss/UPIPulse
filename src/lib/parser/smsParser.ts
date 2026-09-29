// UPIPulse Deterministic Indian Bank & UPI SMS Parser Engine
import { ParsedTransaction, ParserStatus, TransactionSource, TransactionType } from './types';
import { normalizeText, preFilterMessage } from './normalizer';
import { BANK_PATTERNS } from './patterns';

export function parseTransactionMessage(raw: string): ParsedTransaction {
  const preFilter = preFilterMessage(raw);
  const normalized = preFilter.normalizedText;

  // If rejected by pre-filter (e.g. pure OTP or promotional offer)
  if (!preFilter.isFinancial) {
    return {
      amount: null,
      type: 'UNKNOWN',
      merchant: null,
      accountMask: null,
      bankName: null,
      balanceAfter: null,
      refId: null,
      transactionAt: null,
      source: 'Manual',
      confidence: 0.0,
      status: 'UNSUPPORTED',
      explanation: preFilter.rejectReason || 'Non-financial or unsupported format',
      rawText: raw,
      normalizedText: normalized,
    };
  }

  // 1. Try known bank / UPI app patterns
  for (const pattern of BANK_PATTERNS) {
    if (pattern.identify(normalized)) {
      const extracted = pattern.extract(normalized);
      if (extracted && extracted.amount !== null && extracted.amount > 0) {
        // Calculate deterministic confidence
        let confidence = 0.65;
        const reasons: string[] = [`Matched ${pattern.bankName} signature`];

        if (extracted.type !== 'UNKNOWN') {
          confidence += 0.15;
          reasons.push(`Identified ${extracted.type} direction`);
        }
        if (extracted.accountMask) {
          confidence += 0.10;
          reasons.push(`Account mask ${extracted.accountMask}`);
        }
        if (extracted.refId) {
          confidence += 0.05;
          reasons.push(`Reference ID extracted`);
        }
        if (extracted.merchant) {
          confidence += 0.05;
          reasons.push(`Merchant: ${extracted.merchant}`);
        }

        confidence = Math.min(1.0, Math.round(confidence * 100) / 100);
        const status: ParserStatus = confidence >= 0.70 ? 'PARSED' : 'NEEDS_REVIEW';

        return {
          amount: extracted.amount,
          type: extracted.type,
          merchant: extracted.merchant || 'Unknown Merchant',
          accountMask: extracted.accountMask,
          bankName: pattern.bankName,
          balanceAfter: extracted.balanceAfter,
          refId: extracted.refId,
          transactionAt: extracted.transactionAt,
          source: pattern.source,
          confidence,
          status,
          explanation: reasons.join('; '),
          rawText: raw,
          normalizedText: normalized,
        };
      }
    }
  }

  // 2. Generic Fallback Parser
  const genericResult = parseGenericFallback(normalized);
  if (genericResult && genericResult.amount !== null && genericResult.amount > 0) {
    let confidence = 0.50;
    const reasons: string[] = ['Extracted via generic financial rule'];

    if (genericResult.type !== 'UNKNOWN') {
      confidence += 0.15;
      reasons.push(`Direction: ${genericResult.type}`);
    }
    if (genericResult.accountMask) {
      confidence += 0.10;
      reasons.push(`Account: ${genericResult.accountMask}`);
    }
    if (genericResult.refId) {
      confidence += 0.05;
      reasons.push(`Ref ID found`);
    }
    if (genericResult.merchant && genericResult.merchant !== 'Unknown Merchant') {
      confidence += 0.05;
      reasons.push(`Counterparty: ${genericResult.merchant}`);
    }

    confidence = Math.min(0.85, Math.round(confidence * 100) / 100);
    const status: ParserStatus = confidence >= 0.70 ? 'PARSED' : 'NEEDS_REVIEW';

    return {
      amount: genericResult.amount,
      type: genericResult.type,
      merchant: genericResult.merchant || 'Unknown Merchant',
      accountMask: genericResult.accountMask,
      bankName: genericResult.bankName || 'Unknown Bank',
      balanceAfter: genericResult.balanceAfter,
      refId: genericResult.refId,
      transactionAt: null,
      source: genericResult.source,
      confidence,
      status,
      explanation: reasons.join('; '),
      rawText: raw,
      normalizedText: normalized,
    };
  }

  // 3. Fallback when amount could not be extracted
  return {
    amount: null,
    type: 'UNKNOWN',
    merchant: null,
    accountMask: null,
    bankName: null,
    balanceAfter: null,
    refId: null,
    transactionAt: null,
    source: 'Manual',
    confidence: 0.1,
    status: 'UNSUPPORTED',
    explanation: 'Could not reliably extract transaction amount or direction',
    rawText: raw,
    normalizedText: normalized,
  };
}

function parseGenericFallback(text: string) {
  // Amount
  const amtMatch = text.match(/₹\s*([\d]+(?:\.\d{1,2})?)/i);
  if (!amtMatch) return null;
  const amount = parseFloat(amtMatch[1]);

  // Direction
  const isDebit = /\b(debited|spent|paid|sent|withdrawn)\b/i.test(text);
  const isCredit = /\b(credited|received|deposit|deposited)\b/i.test(text);
  const isRefund = /\b(refund|refunded|reversed)\b/i.test(text);
  const type: TransactionType = isRefund ? 'REFUND' : isDebit ? 'DEBIT' : isCredit ? 'CREDIT' : 'UNKNOWN';

  // Account Mask
  const acctMatch = text.match(/(?:a\/c|acct|card|account)\s*(?:no\.?)?\s*(?:[*Xx]+)?(\d{3,4})/i);
  const accountMask = acctMatch ? `XX${acctMatch[1]}` : null;

  // Balance
  const balMatch = text.match(/(?:avl\s*bal|available\s*balance|bal)\s*[:\s]*₹\s*([\d]+(?:\.\d{1,2})?)/i);
  const balanceAfter = balMatch ? parseFloat(balMatch[1]) : null;

  // Ref / UTR
  const refMatch = text.match(/\b(?:ref(?:\s+no\.?)?|rrn|upi\s+ref)\s*[:\s]*(\d{8,16})/i);
  const refId = refMatch ? refMatch[1] : null;

  // Merchant
  let merchant: string | null = null;
  const toMatch = text.match(/\b(?:to|at|vpa)\s+([A-Za-z0-9\s._&-]{2,30}?)(?=\s+(?:on|via|ref|bal|using)|\.|$)/i);
  if (toMatch) {
    const candidate = toMatch[1].trim();
    if (!candidate.toLowerCase().includes('account') && !candidate.toLowerCase().includes('a/c')) {
      merchant = candidate;
    }
  }

  // Source detection
  const isUpi = /\b(upi|gpay|phonepe|paytm|bhim)\b/i.test(text);
  const source: TransactionSource = isUpi ? 'UPI' : 'Bank SMS';

  return {
    amount,
    type,
    merchant,
    accountMask,
    bankName: isUpi ? 'UPI App' : 'Bank',
    balanceAfter,
    refId,
    source,
  };
}
