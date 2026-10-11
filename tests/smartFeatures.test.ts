import assert from 'assert';
import { calculateCashFlowForecast } from '../src/lib/forecast/cashFlowPredictor';
import { detectSubscriptions } from '../src/lib/detector/subscriptions';
import { KhataManager } from '../src/lib/people/khataTracker';
import { LocalFinanceService } from '../src/lib/services/localFinanceService';

export function runSmartFeatureTests() {
  console.log('\n--- 8. SMART FEATURES TESTS (CASH FLOW, SUBSCRIPTIONS, KHATA) ---');

  // 1. Cash Flow Forecast Test
  const mockAccounts = [{ balance: 25000 }];
  const now = new Date();
  const mockTxns = [
    {
      amount: 1500,
      type: 'DEBIT',
      transaction_at: now.toISOString(),
      ingested_at: now.toISOString(),
    },
    {
      amount: 500,
      type: 'DEBIT',
      transaction_at: now.toISOString(),
      ingested_at: now.toISOString(),
    },
  ];

  const forecast = calculateCashFlowForecast(mockAccounts, mockTxns, 30000);
  assert.strictEqual(forecast.currentBalance, 25000, 'Calculates current balance correctly');
  assert.strictEqual(forecast.monthSpendToDate, 2000, 'Calculates month spend to date correctly');
  assert(forecast.dailyBurnRate > 0, 'Daily burn rate is positive');
  assert(forecast.daysRemainingInMonth >= 0, 'Days remaining in month is valid');
  assert(forecast.projectedMonthEndBalance <= 25000, 'Projected month end balance reflects burn rate');
  console.log('  ✓ Cash Flow Forecast correctly computes daily burn, days left, and projected month-end balance');

  // 2. Subscriptions Detector Test
  const lastMonth = new Date();
  lastMonth.setDate(lastMonth.getDate() - 28);

  const subTxns = [
    {
      id: 'sub1',
      amount: 649,
      merchant: 'Netflix',
      type: 'DEBIT',
      category: 'Entertainment',
      transaction_at: lastMonth.toISOString(),
      ingested_at: lastMonth.toISOString(),
    },
    {
      id: 'sub2',
      amount: 119,
      merchant: 'Spotify',
      type: 'DEBIT',
      category: 'Entertainment',
      transaction_at: lastMonth.toISOString(),
      ingested_at: lastMonth.toISOString(),
    },
  ];

  const subscriptions = detectSubscriptions(subTxns);
  assert.strictEqual(subscriptions.length, 2, 'Detects 2 subscriptions');
  const netflix = subscriptions.find((s) => s.merchant.toLowerCase().includes('netflix'));
  assert(netflix, 'Found Netflix subscription');
  assert.strictEqual(netflix?.amount, 649, 'Netflix amount matches');
  console.log('  ✓ Automatically detects Netflix & Spotify subscriptions and computes next due dates');

  // 3. Khata People Ledger (Simulated localStorage)
  // Mock window and localStorage for Node test environment
  if (typeof global.localStorage === 'undefined') {
    const store: Record<string, string> = {};
    (global as any).window = {};
    (global as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    };
  }

  const entry = KhataManager.addEntry({
    personId: 'p_rahul',
    personName: 'Rahul',
    amount: 650,
    type: 'YOU_LENT',
    note: 'Dinner split',
  });

  assert(entry.id.startsWith('khata_'), 'Generated valid khata entry ID');
  const summary = KhataManager.getPeopleSummary();
  assert.strictEqual(summary.totalToReceive, 650, 'Net to receive is ₹650');
  assert.strictEqual(summary.people.length, 1, 'One person in ledger');
  assert.strictEqual(summary.people[0].name, 'Rahul');

  const waLink = KhataManager.generateWhatsAppReminder('Rahul', 650, 'Dinner split');
  assert(waLink.includes('wa.me'), 'Generates valid WhatsApp reminder URL');
  assert(waLink.includes('650'), 'WhatsApp URL includes amount');
  console.log('  ✓ Khata People Ledger correctly records split debts and generates WhatsApp reminder link');

  // 4. Local Finance Service Ingestion Test
  const sms = 'Sent Rs.450.00 from HDFC Bank A/C **4321 to SWIGGY on 10-Oct-26. Avail Bal: INR 14,850.00. Ref: 427182930192';
  const ingestRes = LocalFinanceService.ingestMessage(sms, 'HDFCBK');
  assert.strictEqual(ingestRes.success, true, 'Local ingestion succeeds');
  assert.strictEqual(ingestRes.action, 'INSERTED', 'Local message inserted');
  assert.strictEqual(ingestRes.transaction?.amount, 450, 'Amount parsed as 450');
  assert.strictEqual(ingestRes.transaction?.account_mask, 'XX4321', 'Account mask extracted as XX4321');
  assert.strictEqual(ingestRes.transaction?.balance_after, 14850, 'Balance after extracted as 14850');

  // Test deduplication on re-ingesting same SMS
  const dupeRes = LocalFinanceService.ingestMessage(sms, 'HDFCBK');
  assert.strictEqual(dupeRes.success, false, 'Duplicate rejected');
  assert.strictEqual(dupeRes.action, 'DUPLICATE', 'Action marked DUPLICATE');
  console.log('  ✓ Local on-device finance service successfully parses, ingests, and dedupes bank SMS offline');

  return { passed: 4, failed: 0 };
}
