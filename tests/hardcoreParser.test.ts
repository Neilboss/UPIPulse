import { parseTransactionMessage } from '../src/lib/parser/smsParser';
import { categorizeTransaction } from '../src/lib/parser/categorizer';
import { checkDuplicateAndFuse } from '../src/lib/parser/deduplicator';
import { LocalFinanceService } from '../src/lib/services/localFinanceService';
import { AuthService } from '../src/lib/services/authService';
import Database from 'better-sqlite3';

export function runHardcoreTests() {
  console.log('\n--- HARDCORE INDIAN BANK SMS & UPI TEST SUITE ---');

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // ==========================================
  // SECTION 1: AUTHENTICATION & HELD DUMMY CREDENTIALS
  // ==========================================
  console.log('\n[Phase 1] Dummy Credentials & Auth Verification:');
  const held = AuthService.getHeldCredentials();
  assert('Default email is user@upipulse.app', held.email === 'user@upipulse.app');
  assert('Default password is password123', held.password === 'password123');

  const invalidLogin = AuthService.login('wrong@email.com', 'badpass');
  assert('Rejects invalid credentials', !invalidLogin.success);

  const validLogin = AuthService.login('user@upipulse.app', 'password123');
  assert('Successfully authenticates with dummy credentials', validLogin.success && !!validLogin.user);
  assert('Authenticated user session active', AuthService.isAuthenticated());

  // ==========================================
  // SECTION 2: 12 MAJOR INDIAN BANKS & UPI DEBITS
  // ==========================================
  console.log('\n[Phase 2] High-Stress Multi-Bank Parsing:');

  const bankTestCases = [
    // 1. HDFC Zomato Debit
    {
      bank: 'HDFC Bank',
      sms: 'HDFC Bank: Rs 850.00 debited from a/c **4321 on 12-10-24 to VPA zomato@icici (UPI ref 428192830111). Avl bal: Rs 48,250.00',
      expectedAmount: 850,
      expectedType: 'DEBIT',
      expectedMask: 'XX4321',
      expectedBal: 48250,
      expectedRef: '428192830111',
    },
    // 2. HDFC Salary Credit
    {
      bank: 'HDFC Bank',
      sms: 'HDFC Bank: Rs 75,000.00 credited to a/c **4321 on 01-10-24 by INFOSYS LTD (ref 987654321012). Avl bal: Rs 123,250.00',
      expectedAmount: 75000,
      expectedType: 'CREDIT',
      expectedMask: 'XX4321',
      expectedBal: 123250,
      expectedRef: '987654321012',
    },
    // 3. HDFC ATM Withdrawal
    {
      bank: 'HDFC Bank',
      sms: 'HDFC Bank: Rs 2,000.00 debited from a/c **4321 at HDFC ATM on 05-10-24. Avl bal: Rs 46,250.00',
      expectedAmount: 2000,
      expectedType: 'DEBIT',
      expectedMask: 'XX4321',
      expectedBal: 46250,
      expectedRef: null,
    },
    // 4. HDFC Refund
    {
      bank: 'HDFC Bank',
      sms: 'HDFC Bank: Rs 499.00 credited to a/c **4321 on 08-10-24 as refund from AMAZON PAY. Avl bal: Rs 46,749.00',
      expectedAmount: 499,
      expectedType: 'REFUND',
      expectedMask: 'XX4321',
      expectedBal: 46749,
      expectedRef: null,
    },
    // 5. SBI Swiggy Debit
    {
      bank: 'State Bank of India',
      sms: 'Dear SBI User, your A/c X9876 is debited by Rs.450.00 on 12Oct24 by transfer to UPI/427192837412/SWIGGY. Bal: Rs.22,430.10',
      expectedAmount: 450,
      expectedType: 'DEBIT',
      expectedMask: 'XX9876',
      expectedBal: 22430.1,
      expectedRef: '427192837412',
    },
    // 6. SBI UPI Credit
    {
      bank: 'State Bank of India',
      sms: 'Dear SBI User, your A/c X9876 is credited by Rs.2,500.00 on 11Oct24 by UPI/429182736451/Rahul. Bal: Rs.24,930.10',
      expectedAmount: 2500,
      expectedType: 'CREDIT',
      expectedMask: 'XX9876',
      expectedBal: 24930.1,
      expectedRef: '429182736451',
    },
    // 7. ICICI Blinkit Debit
    {
      bank: 'ICICI Bank',
      sms: 'Acct XX098 debited with INR 1,899.00 on 12-Oct-24. Info: UPI/BLINKIT/427189230111. Available Balance is INR 38,150.75.',
      expectedAmount: 1899,
      expectedType: 'DEBIT',
      expectedMask: 'XX098',
      expectedBal: 38150.75,
      expectedRef: '427189230111',
    },
    // 8. ICICI ATM Withdrawal
    {
      bank: 'ICICI Bank',
      sms: 'Acct XX098 debited with INR 3,000.00 on 10-Oct-24 from ATM. Avail Bal: INR 35,150.75.',
      expectedAmount: 3000,
      expectedType: 'DEBIT',
      expectedMask: 'XX098',
      expectedBal: 35150.75,
      expectedRef: null,
    },
    // 9. Axis Uber Debit
    {
      bank: 'Axis Bank',
      sms: 'INR 650.00 debited from A/c no. XX5678 on 12-10-24 19:22:10. Info: UPI/UBER/42718299. Bal: INR 14,750.',
      expectedAmount: 650,
      expectedType: 'DEBIT',
      expectedMask: 'XX5678',
      expectedBal: 14750,
      expectedRef: '42718299',
    },
    // 10. Kotak Netflix Debit
    {
      bank: 'Kotak Bank',
      sms: 'Sent Rs.649.00 from Kotak Bank AC XX1122 to NETFLIX on 12-Oct-24. Ref: 428192830112',
      expectedAmount: 649,
      expectedType: 'DEBIT',
      expectedMask: 'XX1122',
      expectedBal: null,
      expectedRef: '428192830112',
    },
    // 11. PNB Debit
    {
      bank: 'PNB',
      sms: 'Your A/c XX9012 is debited by Rs 750.00 on 11-10-24. Avl Bal: Rs 18,250.00. Ref: 428192830114',
      expectedAmount: 750,
      expectedType: 'DEBIT',
      expectedMask: 'XX9012',
      expectedBal: 18250,
      expectedRef: '428192830114',
    },
    // 12. Generic Canara Bank
    {
      bank: 'Canara Bank (Generic)',
      sms: 'Canara Bank: Rs. 1,250.00 debited from a/c no XX3344 on 12-10-2024 to BigBasket. Avl Bal: Rs. 9,500.00',
      expectedAmount: 1250,
      expectedType: 'DEBIT',
      expectedMask: 'XX3344',
      expectedBal: 9500,
      expectedRef: null,
    },
    // 13. Generic Bank of Baroda
    {
      bank: 'Bank of Baroda (Generic)',
      sms: 'Bank of Baroda: INR 520.00 debited from Account XX7788 on 10-10-24 at Starbucks. Available Balance: INR 12,300.00',
      expectedAmount: 520,
      expectedType: 'DEBIT',
      expectedMask: 'XX7788',
      expectedBal: 12300,
      expectedRef: null,
    },
    // 14. Google Pay Debit
    {
      bank: 'Google Pay',
      sms: 'Paid ₹420 to Blue Tokai Coffee',
      expectedAmount: 420,
      expectedType: 'DEBIT',
      expectedMask: null,
      expectedBal: null,
      expectedRef: null,
    },
    // 15. Google Pay Credit
    {
      bank: 'Google Pay',
      sms: 'Money received! ₹1,500 from Vikram Sharma',
      expectedAmount: 1500,
      expectedType: 'CREDIT',
      expectedMask: null,
      expectedBal: null,
      expectedRef: null,
    },
    // 16. PhonePe Debit
    {
      bank: 'PhonePe',
      sms: 'Transaction Successful: Paid ₹299 to Hotstar',
      expectedAmount: 299,
      expectedType: 'DEBIT',
      expectedMask: null,
      expectedBal: null,
      expectedRef: null,
    },
    // 17. CRED Debit
    {
      bank: 'CRED',
      sms: 'Payment of ₹3,499 to HDFC Credit Card successful via CRED',
      expectedAmount: 3499,
      expectedType: 'DEBIT',
      expectedMask: null,
      expectedBal: null,
      expectedRef: null,
    },
  ];

  for (const tc of bankTestCases) {
    const res = parseTransactionMessage(tc.sms);
    assert(
      `${tc.bank}: Parsed amount ₹${tc.expectedAmount}`,
      res.amount === tc.expectedAmount,
      `got ${res.amount}`
    );
    assert(
      `${tc.bank}: Correct type ${tc.expectedType}`,
      res.type === tc.expectedType,
      `got ${res.type}`
    );
    if (tc.expectedMask) {
      assert(
        `${tc.bank}: Account mask ${tc.expectedMask}`,
        res.accountMask === tc.expectedMask,
        `got ${res.accountMask}`
      );
    }
    if (tc.expectedBal !== null && tc.expectedBal !== undefined) {
      assert(
        `${tc.bank}: Balance after ₹${tc.expectedBal}`,
        res.balanceAfter === tc.expectedBal,
        `got ${res.balanceAfter}`
      );
    }
  }

  // ==========================================
  // SECTION 3: SPAM, OTP & ADVERSARIAL MESSAGES
  // ==========================================
  console.log('\n[Phase 3] Anti-Spam & OTP Isolation:');

  const spamMessages = [
    'Your OTP for NetBanking login is 839201. Valid for 10 mins. Do not share with anyone including bank staff.',
    '492019 is your secret code for online transaction. Do not share this OTP.',
    'Congratulations! You are eligible for pre-approved personal loan of Rs 500000 at zero processing fee. Click here to apply now.',
    'Get flat 50% off on your next purchase at Dominos! Use code TREAT50 today.',
    'Dear Customer, apply now for instant credit card with lifetime free benefits and Rs 2000 cashback.',
    'Your Aadhaar verification code is 192837. Do not share.',
  ];

  for (const spam of spamMessages) {
    const res = parseTransactionMessage(spam);
    assert(
      `Safely isolates non-financial: "${spam.slice(0, 35)}..."`,
      res.status === 'UNSUPPORTED' || res.amount === null,
      `status: ${res.status}, amount: ${res.amount}`
    );
  }

  // ==========================================
  // SECTION 4: SMART DEDUPLICATION & COMPLEMENTARY FUSION
  // ==========================================
  console.log('\n[Phase 4] Complementary Fusion Engine:');

  const gpayMsg = parseTransactionMessage('Paid ₹450 to Blue Tokai Coffee');
  const hdfcMsg = parseTransactionMessage(
    'HDFC Bank: Rs 450.00 debited from a/c **4321 on 12-10-24 to VPA bluetokai@hdfc (UPI ref 888899991111). Avl bal: Rs 15,000.00'
  );

  assert('GPay has clean merchant Blue Tokai Coffee', gpayMsg.merchant?.includes('Blue Tokai') === true);
  assert('HDFC has account mask XX4321 and balance 15000', hdfcMsg.accountMask === 'XX4321' && hdfcMsg.balanceAfter === 15000);

  // In-memory test db for fusion testing
  const testDb = new Database(':memory:');
  testDb.exec(`
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

  testDb.prepare(`
    INSERT INTO transactions (
      id, amount, type, merchant, category, account_id, balance_after,
      ref_id, source, parser_status, parser_confidence, raw_text,
      transaction_at, ingested_at, fingerprint, is_internal_transfer,
      is_deleted, created_at, updated_at
    ) VALUES (
      'txn_gpay_1', 450, 'DEBIT', 'Blue Tokai Coffee', 'Food', NULL, NULL,
      '888899991111', 'UPI', 'PARSED', 0.85, 'Paid ₹450 to Blue Tokai Coffee',
      datetime('now'), datetime('now'), 'fp_450', 0, 0, datetime('now'), datetime('now')
    )
  `).run();

  const fusionResult = checkDuplicateAndFuse(hdfcMsg, testDb);

  assert('Fusion detected via UTR/refId', fusionResult.isDuplicate && fusionResult.isFused);
  assert('Fused source identifies as UPI + Bank SMS', fusionResult.fusedTransaction?.source === 'UPI + Bank SMS');
  assert('Fused transaction retains clean merchant', fusionResult.fusedTransaction?.merchant === 'Blue Tokai Coffee');
  assert('Fused transaction adds balanceAfter ₹15,000', fusionResult.fusedTransaction?.balance_after === 15000);

  console.log('\n====================================================');
  console.log(`HARDCORE TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================\n');

  return { passed, failed };
}

if (require.main === module) {
  const result = runHardcoreTests();
  if (result.failed > 0) process.exit(1);
  process.exit(0);
}
