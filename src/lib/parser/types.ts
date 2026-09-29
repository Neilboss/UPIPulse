// UPIPulse Core Type Definitions

export type TransactionType =
  | 'DEBIT'
  | 'CREDIT'
  | 'REFUND'
  | 'TRANSFER'
  | 'INTERNAL_TRANSFER'
  | 'UNKNOWN';

export type ParserStatus = 'PARSED' | 'NEEDS_REVIEW' | 'UNSUPPORTED';

export type TransactionSource = 'UPI' | 'Bank SMS' | 'UPI + Bank SMS' | 'Manual';

export interface ParsedTransaction {
  amount: number | null;
  type: TransactionType;
  merchant: string | null;
  accountMask: string | null;
  bankName: string | null;
  balanceAfter: number | null;
  refId: string | null;
  transactionAt: string | null; // ISO string if extracted
  source: TransactionSource;
  confidence: number; // 0.0 to 1.0
  status: ParserStatus;
  explanation: string;
  rawText: string;
  normalizedText: string;
}

export interface TransactionRecord {
  id: string;
  amount: number;
  type: TransactionType;
  merchant: string;
  category: string;
  account_id: string | null;
  balance_after: number | null;
  ref_id: string | null;
  source: TransactionSource;
  parser_status: ParserStatus;
  parser_confidence: number;
  raw_text: string;
  transaction_at: string | null;
  ingested_at: string;
  fingerprint: string;
  is_internal_transfer: number;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface AccountRecord {
  id: string;
  bank_name: string;
  account_mask: string;
  balance: number | null;
  balance_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthly_budget: number;
}

export interface SettingsRecord {
  id: string;
  api_key: string;
  monthly_budget_total: number;
  created_at: string;
  updated_at: string;
}
