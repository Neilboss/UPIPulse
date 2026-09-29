// UPIPulse Comprehensive Parser Test Suite
import { parseTransactionMessage } from '../src/lib/parser/smsParser';
import { normalizeText, preFilterMessage } from '../src/lib/parser/normalizer';
import { categorizeTransaction } from '../src/lib/parser/categorizer';

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

export function runParserTests() {
  console.log('\n--- 1. NORMALIZATION & PRE-FILTER TESTS ---');

  const rawSms = 'HDFC Bank:  Rs.  450.00  debited   from a/c **4321';
  const norm = normalizeText(rawSms);
  assert(norm.includes('₹450.00') && norm.includes('XX4321'), 'Normalizes currency and account masks properly');

  const otpMsg = 'Dear Customer, 482910 is your secret OTP for login to netbanking. Do not share OTP with anyone.';
  const otpRes = preFilterMessage(otpMsg);
  assert(!otpRes.isFinancial && otpRes.rejectReason?.includes('OTP'), 'Pre-filter safely rejects non-transactional OTP messages');

  const promoMsg = 'Congratulations! You are eligible for a Pre-approved Personal Loan of Rs. 5,00,000. Apply now!';
  const promoRes = preFilterMessage(promoMsg);
  assert(!promoRes.isFinancial && promoRes.rejectReason?.includes('offer'), 'Pre-filter safely rejects promotional loan spam');

  console.log('\n--- 2. BANK SMS FIXTURE TESTS ---');

  // HDFC Debit with VPA
  const hdfcDebit = 'HDFC Bank: Rs 450.00 debited from a/c **4321 on 28-09-24 to VPA paytm-12345@paytm (UPI ref 427182930192). Avl bal: Rs 12,400.00';
  const hdfcParsed = parseTransactionMessage(hdfcDebit);
  assert(hdfcParsed.status === 'PARSED', 'HDFC Debit parses with PARSED status');
  assert(hdfcParsed.amount === 450, 'HDFC Debit extracts amount: 450');
  assert(hdfcParsed.accountMask === 'XX4321', 'HDFC Debit extracts accountMask: XX4321');
  assert(hdfcParsed.balanceAfter === 12400, 'HDFC Debit extracts balanceAfter: 12400');
  assert(hdfcParsed.refId === '427182930192', 'HDFC Debit extracts refId: 427182930192');
  assert(hdfcParsed.type === 'DEBIT', 'HDFC Debit detects DEBIT direction');

  // SBI Debit with UPI
  const sbiDebit = 'Dear SBI User, your A/c X9876 is debited by Rs.120.00 on 28Sep24 by transfer to UPI/427192837412/SWIGGY. Bal: Rs.5,230.10';
  const sbiParsed = parseTransactionMessage(sbiDebit);
  assert(sbiParsed.status === 'PARSED', 'SBI Debit parses with PARSED status');
  assert(sbiParsed.amount === 120, 'SBI Debit extracts amount: 120');
  assert(sbiParsed.merchant?.toUpperCase() === 'SWIGGY', 'SBI Debit extracts merchant: SWIGGY');
  assert(sbiParsed.refId === '427192837412', 'SBI Debit extracts refId');
  assert(sbiParsed.balanceAfter === 5230.10, 'SBI Debit extracts balanceAfter: 5230.10');

  // ICICI Debit at Merchant
  const iciciDebit = 'Acct XX098 debited with INR 899.00 on 28-Sep-24. Info: UPI/AMAZON/427189230111. Available Balance is INR 28,150.75.';
  const iciciParsed = parseTransactionMessage(iciciDebit);
  assert(iciciParsed.amount === 899, 'ICICI Debit extracts amount: 899');
  assert(iciciParsed.merchant?.toUpperCase() === 'AMAZON', 'ICICI Debit extracts merchant: AMAZON');
  assert(iciciParsed.accountMask === 'XX098', 'ICICI Debit extracts accountMask: XX098');
  assert(iciciParsed.balanceAfter === 28150.75, 'ICICI Debit extracts balanceAfter: 28150.75');

  // Axis Debit
  const axisDebit = 'INR 1,299.00 debited from A/c no. XX5678 on 28-09-24 14:22:10. Info: UPI/SWIGGY/427182. Bal: INR 15,400.';
  const axisParsed = parseTransactionMessage(axisDebit);
  assert(axisParsed.amount === 1299, 'Axis Debit extracts amount: 1299');
  assert(axisParsed.merchant?.toUpperCase() === 'SWIGGY', 'Axis Debit extracts merchant: SWIGGY');
  assert(axisParsed.accountMask === 'XX5678', 'Axis Debit extracts accountMask: XX5678');
  assert(axisParsed.balanceAfter === 15400, 'Axis Debit extracts balanceAfter: 15400');

  // Kotak Debit
  const kotakDebit = 'Sent Rs.250.00 from Kotak Bank AC X1234 to XYZ on 28-09-24. Ref 427218392104.';
  const kotakParsed = parseTransactionMessage(kotakDebit);
  assert(kotakParsed.amount === 250, 'Kotak Debit extracts amount: 250');
  assert(kotakParsed.type === 'DEBIT', 'Kotak Debit extracts DEBIT type');
  assert(kotakParsed.merchant === 'XYZ', 'Kotak Debit extracts merchant: XYZ');

  // PNB Debit
  const pnbDebit = 'Dear Customer, A/c *9012 debited with Rs.350.00 on 28-09-24 via UPI. Ref 427189001234. Avl Bal: Rs.4500.00';
  const pnbParsed = parseTransactionMessage(pnbDebit);
  assert(pnbParsed.amount === 350, 'PNB Debit extracts amount: 350');
  assert(pnbParsed.accountMask === 'XX9012', 'PNB Debit extracts accountMask: XX9012');
  assert(pnbParsed.balanceAfter === 4500, 'PNB Debit extracts balanceAfter: 4500');

  console.log('\n--- 3. UPI APP NOTIFICATION TESTS ---');

  // Google Pay
  const gpayMsg = 'Paid ₹250 to Blue Tokai Coffee';
  const gpayParsed = parseTransactionMessage(gpayMsg);
  assert(gpayParsed.amount === 250, 'GPay extracts amount: 250');
  assert(gpayParsed.merchant === 'Blue Tokai Coffee', 'GPay extracts clean merchant: Blue Tokai Coffee');
  assert(gpayParsed.type === 'DEBIT', 'GPay extracts DEBIT type');

  // PhonePe
  const phonepeMsg = 'Transaction Successful: Paid ₹89 to Swiggy';
  const phonepeParsed = parseTransactionMessage(phonepeMsg);
  assert(phonepeParsed.amount === 89, 'PhonePe extracts amount: 89');
  assert(phonepeParsed.merchant === 'Swiggy', 'PhonePe extracts merchant: Swiggy');

  // Paytm
  const paytmMsg = 'Paid ₹60 at Chai Point';
  const paytmParsed = parseTransactionMessage(paytmMsg);
  assert(paytmParsed.amount === 60, 'Paytm extracts amount: 60');
  assert(paytmParsed.merchant === 'Chai Point', 'Paytm extracts merchant: Chai Point');

  console.log('\n--- 4. CATEGORIZATION TESTS ---');
  assert(categorizeTransaction('Swiggy', '') === 'Food', 'Categorizes Swiggy as Food');
  assert(categorizeTransaction('Uber India', '') === 'Travel', 'Categorizes Uber as Travel');
  assert(categorizeTransaction('Amazon Pay', '') === 'Shopping', 'Categorizes Amazon as Shopping');
  assert(categorizeTransaction('BESCOM Electricity', '') === 'Utilities', 'Categorizes BESCOM as Utilities');
  assert(categorizeTransaction('Zerodha Broking', '') === 'Investment', 'Categorizes Zerodha as Investment');

  console.log('\n--- 5. AMBIGUOUS & UNSUPPORTED HANDLING ---');
  const unsupportedMsg = 'Random text with no monetary amount or financial context';
  const unsupportedParsed = parseTransactionMessage(unsupportedMsg);
  assert(unsupportedParsed.status === 'UNSUPPORTED', 'Marks arbitrary text as UNSUPPORTED without inventing amounts');

  return { passed, failed };
}
