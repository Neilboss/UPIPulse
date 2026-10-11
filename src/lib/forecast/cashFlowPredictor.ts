export interface CashFlowForecast {
  currentBalance: number;
  monthSpendToDate: number;
  monthIncomeToDate: number;
  dailyBurnRate: number;
  daysRemainingInMonth: number;
  projectedMonthEndSpend: number;
  projectedMonthEndBalance: number;
  safeDailyBudget: number;
  status: 'HEALTHY' | 'MODERATE' | 'CRITICAL';
  statusMessage: string;
}

export function calculateCashFlowForecast(
  accounts: Array<{ balance?: number | null }>,
  transactions: Array<{
    amount: number;
    type: string;
    transaction_at?: string | null;
    ingested_at: string;
  }>,
  monthlyBudget: number = 30000
): CashFlowForecast {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayDate = now.getDate();

  // Total days in current month
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysPassed = Math.max(1, todayDate);
  const daysRemainingInMonth = Math.max(0, totalDaysInMonth - todayDate);

  // Total reported bank balance across accounts
  const currentBalance = accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);

  // Filter transactions for current month
  let monthSpendToDate = 0;
  let monthIncomeToDate = 0;

  for (const txn of transactions) {
    const txnDate = new Date(txn.transaction_at || txn.ingested_at);
    if (txnDate.getFullYear() === currentYear && txnDate.getMonth() === currentMonth) {
      if (txn.type === 'DEBIT') {
        monthSpendToDate += txn.amount;
      } else if (txn.type === 'REFUND') {
        monthSpendToDate = Math.max(0, monthSpendToDate - txn.amount);
      } else if (txn.type === 'CREDIT') {
        monthIncomeToDate += txn.amount;
      }
    }
  }

  // Daily burn rate
  const dailyBurnRate = Math.round(monthSpendToDate / daysPassed);
  const projectedMonthEndSpend = monthSpendToDate + dailyBurnRate * daysRemainingInMonth;
  const projectedMonthEndBalance = Math.round(currentBalance - dailyBurnRate * daysRemainingInMonth);

  // Safe daily budget based on remaining budget or available balance
  const remainingBudget = Math.max(0, monthlyBudget - monthSpendToDate);
  const safeDailyBudget = daysRemainingInMonth > 0 ? Math.round(Math.min(remainingBudget, currentBalance) / daysRemainingInMonth) : 0;

  let status: 'HEALTHY' | 'MODERATE' | 'CRITICAL' = 'HEALTHY';
  let statusMessage = 'On track. Spending is within safe daily limits.';

  if (projectedMonthEndBalance < 0 || (currentBalance > 0 && dailyBurnRate * daysRemainingInMonth > currentBalance)) {
    status = 'CRITICAL';
    statusMessage = `High burn rate (₹${dailyBurnRate}/day). At this pace, funds may deplete before month-end.`;
  } else if (projectedMonthEndSpend > monthlyBudget) {
    status = 'MODERATE';
    statusMessage = `Projected to exceed budget by ₹${Math.round(projectedMonthEndSpend - monthlyBudget).toLocaleString('en-IN')}.`;
  }

  return {
    currentBalance,
    monthSpendToDate,
    monthIncomeToDate,
    dailyBurnRate,
    daysRemainingInMonth,
    projectedMonthEndSpend,
    projectedMonthEndBalance,
    safeDailyBudget,
    status,
    statusMessage,
  };
}
