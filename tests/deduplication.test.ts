// UPIPulse Deduplication & Fusion Test Suite
import Database from 'better-sqlite3';
import { checkDuplicateAndFuse } from '../src/lib/parser/deduplicator';
import { parseTransactionMessage } from '../src/lib/parser/smsParser';

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

export function runDeduplicationTests() {
  console.log('\n--- 6. DEDUPLICATION & FUSION TESTS ---');

  // Create an in-memory database for isolated testing
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

  // Scenario 1: Pre-populate with a Google Pay UPI notification
  const gpaySms = 'Paid ₹450 to Swiggy';
  const gpayParsed = parseTransactionMessage(gpaySms);

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO transactions (
      id, amount, type, merchant, category, account_id, balance_after,
      ref_id, source, parser_status, parser_confidence, raw_text,
      transaction_at, ingested_at, fingerprint, is_internal_transfer,
      is_deleted, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'txn_gpay_1',
    gpayParsed.amount,
    gpayParsed.type,
    gpayParsed.merchant,
    'Food',
    null,
    null,
    '427182930192', // UTR
    'UPI',
    'PARSED',
    0.85,
    gpaySms,
    null,
    now,
    'fp_gpay_1',
    0,
    0,
    now,
    now
  );

  // Scenario 1b: Bank SMS arrives 1 minute later with same UTR
  const hdfcSms = 'HDFC Bank: Rs 450.00 debited from a/c **4321 on 28-09-24 to VPA paytm-12345@paytm (UPI ref 427182930192). Avl bal: Rs 12,400.00';
  const hdfcParsed = parseTransactionMessage(hdfcSms);

  const fuseResult = checkDuplicateAndFuse(hdfcParsed, db);
  assert(fuseResult.isDuplicate === true, 'Identifies incoming bank SMS as duplicate via UTR');
  assert(fuseResult.isFused === true, 'Successfully fuses complementary UPI and Bank SMS');
  assert(fuseResult.fusedTransaction?.source === 'UPI + Bank SMS', 'Fused transaction source marked as UPI + Bank SMS');
  assert(fuseResult.fusedTransaction?.merchant === 'Swiggy', 'Fused transaction retains cleaner UPI merchant: Swiggy');
  assert(fuseResult.fusedTransaction?.balance_after === 12400, 'Fused transaction adds reported balance: 12400');

  // Scenario 2: Identical message sent again (e.g. duplicate webhook trigger)
  const duplicateGpayResult = checkDuplicateAndFuse(gpayParsed, db);
  assert(duplicateGpayResult.isDuplicate === true, 'Identifies exact duplicate message');
  assert(duplicateGpayResult.isFused === false, 'Does not fuse identical source types twice');

  // Scenario 3: Negative test - Two separate transactions of same amount at different merchants
  const starbucksSms = 'Paid ₹450 to Starbucks';
  const starbucksParsed = parseTransactionMessage(starbucksSms);
  const separateResult = checkDuplicateAndFuse(starbucksParsed, db);
  assert(separateResult.isDuplicate === false, 'Does NOT merge different merchants even with identical amounts');

  db.close();
  return { passed, failed };
}
