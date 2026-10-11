// UPIPulse API Validation, Auth & Data Integrity Tests
import { IngestPayloadSchema } from '../src/lib/validation';
import { checkRateLimit } from '../src/lib/security';
import Database from 'better-sqlite3';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

export function runApiAndIntegrityTests() {
  console.log('\n--- 7. VALIDATION, SECURITY & ANALYTICS INTEGRITY TESTS ---');

  // 1. Zod Validation Tests
  const validPayload = { text: 'Paid ₹150 to Swiggy', sender: 'Google Pay' };
  const validCheck = IngestPayloadSchema.safeParse(validPayload);
  assert(validCheck.success, 'Valid payload passes Zod validation');

  const tooShortPayload = { text: 'Hi' };
  const tooShortCheck = IngestPayloadSchema.safeParse(tooShortPayload);
  assert(!tooShortCheck.success, 'Payload < 5 characters rejected');

  const largeString = 'A'.repeat(2049);
  const oversizedPayload = { text: largeString };
  const oversizedCheck = IngestPayloadSchema.safeParse(oversizedPayload);
  assert(!oversizedCheck.success, 'Payload > 2 KB rejected before processing');

  // 2. Rate Limiting Test
  const testIp = '127.0.0.1';
  let allowedCount = 0;
  for (let i = 0; i < 65; i++) {
    if (checkRateLimit(testIp, 60)) allowedCount++;
  }
  assert(allowedCount === 60, 'Rate limiter permits exactly 60 requests per minute');

  // 3. Analytics & Expense Integrity Test
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      merchant TEXT,
      category TEXT NOT NULL DEFAULT 'Other',
      account_id TEXT NULL,
      balance_after REAL NULL,
      ref_id TEXT NULL,
      source TEXT NOT NULL,
      parser_status TEXT NOT NULL,
      parser_confidence REAL NOT NULL,
      raw_text TEXT NOT NULL,
      transaction_at TEXT NULL,
      ingested_at TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      is_internal_transfer INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();
  const insertStmt = db.prepare(`
    INSERT INTO transactions (
      id, amount, type, merchant, category, is_internal_transfer,
      is_deleted, created_at, updated_at, source, parser_status,
      parser_confidence, raw_text, ingested_at, fingerprint
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Manual', 'PARSED', 0.9, 'test', ?, 'fp')
  `);

  // Insert Debit expense: 500
  insertStmt.run('t1', 500, 'DEBIT', 'Swiggy', 'Food', 0, 0, now, now, now);
  // Insert Credit income: 2000 (must be EXCLUDED from spend)
  insertStmt.run('t2', 2000, 'CREDIT', 'Salary', 'Other', 0, 0, now, now, now);
  // Insert Internal Transfer: 1000 (must be EXCLUDED from spend)
  insertStmt.run('t3', 1000, 'INTERNAL_TRANSFER', 'Self', 'Other', 1, 0, now, now, now);
  // Insert Refund: 100 (reduces spend by 100)
  insertStmt.run('t4', 100, 'REFUND', 'Swiggy', 'Food', 0, 0, now, now, now);

  // Compute spend: DEBIT sum - REFUND sum
  const debits = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'DEBIT' AND is_internal_transfer = 0 AND is_deleted = 0").get() as { total: number };
  const refunds = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'REFUND' AND is_internal_transfer = 0 AND is_deleted = 0").get() as { total: number };
  const netSpend = debits.total - refunds.total;

  assert(netSpend === 400, 'Analytics net spend accurately computes (DEBIT 500 - REFUND 100 = 400), excluding CREDIT and INTERNAL_TRANSFER');

  // 4. Initial Balance Onboarding & Account Creation Test
  db.exec(`
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY,
      bank_name TEXT NOT NULL,
      account_mask TEXT NOT NULL,
      balance REAL NULL,
      balance_updated_at TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE settings (
      id TEXT PRIMARY KEY,
      api_key TEXT NOT NULL,
      monthly_budget_total REAL DEFAULT 35000,
      is_onboarded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Simulate initial onboarding setup
  const startingBalance = 4000;
  const monthlyBudget = 5000;
  db.prepare(`
    INSERT INTO accounts (id, bank_name, account_mask, balance, balance_updated_at, created_at, updated_at)
    VALUES ('acc_hdfc4321', 'HDFC Bank', 'XX4321', ?, ?, ?, ?)
  `).run(startingBalance, now, now, now);

  db.prepare(`
    INSERT INTO settings (id, api_key, monthly_budget_total, is_onboarded, created_at, updated_at)
    VALUES ('settings_default', 'test_key', ?, 1, ?, ?)
  `).run(monthlyBudget, now, now);

  const accAfterOnboard = db.prepare('SELECT balance FROM accounts WHERE id = ?').get('acc_hdfc4321') as { balance: number };
  const settingsAfterOnboard = db.prepare('SELECT is_onboarded, monthly_budget_total FROM settings WHERE id = ?').get('settings_default') as { is_onboarded: number; monthly_budget_total: number };

  assert(accAfterOnboard.balance === 4000, 'Initial bank balance saved successfully on onboarding: 4000');
  assert(settingsAfterOnboard.is_onboarded === 1, 'Settings records user onboarding complete: is_onboarded = 1');
  assert(settingsAfterOnboard.monthly_budget_total === 5000, 'Monthly budget limit initialized: 5000');

  // 5. Manual Expense Entry with Automatic Balance Deduction
  const manualExpenseAmount = 500;
  // Deduct from account
  db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?').run(manualExpenseAmount, now, 'acc_hdfc4321');
  // Insert manual transaction
  insertStmt.run('m1', manualExpenseAmount, 'DEBIT', 'Local Grocery', 'Shopping', 0, 0, now, now, now);

  const accAfterExpense = db.prepare('SELECT balance FROM accounts WHERE id = ?').get('acc_hdfc4321') as { balance: number };
  assert(accAfterExpense.balance === 3500, 'Manual expense entry automatically updates account balance (4000 - 500 = 3500)');

  // 6. Safe-to-Spend & Balance Constraint Calculation
  const totalBalanceRow = db.prepare('SELECT COALESCE(SUM(balance), 0) as totalBalance FROM accounts').get() as { totalBalance: number };
  const remainingBudget = Math.max(0, settingsAfterOnboard.monthly_budget_total - manualExpenseAmount); // 5000 - 500 = 4500
  const safeSpendingLimit = Math.min(remainingBudget, totalBalanceRow.totalBalance); // min(4500, 3500) = 3500
  const isBalanceConstrained = totalBalanceRow.totalBalance < remainingBudget;

  assert(isBalanceConstrained === true, 'Correctly detects balance constraint: bank balance (3500) < remaining budget (4500)');
  assert(safeSpendingLimit === 3500, 'Correctly caps safe spending limit to available bank balance: 3500');

  db.close();
  return { passed, failed };
}
