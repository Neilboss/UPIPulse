-- UPIPulse SQLite Database Schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_mask TEXT NOT NULL,
  balance REAL NULL,
  balance_updated_at TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  monthly_budget REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  type TEXT NOT NULL, -- DEBIT, CREDIT, REFUND, TRANSFER, INTERNAL_TRANSFER, UNKNOWN
  merchant TEXT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  account_id TEXT NULL,
  balance_after REAL NULL,
  ref_id TEXT NULL,
  source TEXT NOT NULL, -- 'UPI', 'Bank SMS', 'UPI + Bank SMS', 'Manual'
  parser_status TEXT NOT NULL, -- 'PARSED', 'NEEDS_REVIEW', 'UNSUPPORTED'
  parser_confidence REAL NOT NULL,
  raw_text TEXT NOT NULL,
  transaction_at TEXT NULL,
  ingested_at TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  is_internal_transfer INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  api_key TEXT NOT NULL,
  monthly_budget_total REAL DEFAULT 30000,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_ref_id ON transactions(ref_id);
CREATE INDEX IF NOT EXISTS idx_transactions_fingerprint ON transactions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_at ON transactions(transaction_at);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_accounts_mask ON accounts(account_mask);
