import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';

export async function GET() {
  try {
    const db = getDb();

    // 1. Fetch settings for monthly budget
    const settings = db
      .prepare('SELECT monthly_budget_total FROM settings LIMIT 1')
      .get() as { monthly_budget_total: number } | undefined;
    const monthlyBudget = settings?.monthly_budget_total || 35000;

    // 2. Current Month Total Spend (DEBITS - REFUNDS, excluding CREDIT & INTERNAL_TRANSFER)
    const currentMonthDebits = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE is_deleted = 0 
        AND is_internal_transfer = 0
        AND type = 'DEBIT'
        AND strftime('%Y-%m', COALESCE(transaction_at, ingested_at)) = strftime('%Y-%m', 'now')
    `).get() as { total: number };

    const currentMonthRefunds = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE is_deleted = 0 
        AND is_internal_transfer = 0
        AND type = 'REFUND'
        AND strftime('%Y-%m', COALESCE(transaction_at, ingested_at)) = strftime('%Y-%m', 'now')
    `).get() as { total: number };

    const currentMonthSpend = Math.max(0, currentMonthDebits.total - currentMonthRefunds.total);

    // 3. Daily Velocity: Spend divided by day of month
    const currentDay = new Date().getDate();
    const dailyAverageSpend = Math.round(currentMonthSpend / Math.max(1, currentDay));

    // 4. Category Breakdown for current month
    const categoryRows = db.prepare(`
      SELECT 
        category,
        COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount WHEN type = 'REFUND' THEN -amount ELSE 0 END), 0) as spend
      FROM transactions
      WHERE is_deleted = 0
        AND is_internal_transfer = 0
        AND type IN ('DEBIT', 'REFUND')
        AND strftime('%Y-%m', COALESCE(transaction_at, ingested_at)) = strftime('%Y-%m', 'now')
      GROUP BY category
      HAVING spend > 0
      ORDER BY spend DESC
    `).all() as { category: string; spend: number }[];

    const categoriesMeta = db.prepare('SELECT name, color, icon FROM categories').all() as { name: string; color: string; icon: string }[];
    const colorMap = new Map(categoriesMeta.map((c) => [c.name, c.color]));

    const categoryBreakdown = categoryRows.map((row) => ({
      name: row.category,
      amount: row.spend,
      percentage: currentMonthSpend > 0 ? Math.round((row.spend / currentMonthSpend) * 100) : 0,
      color: colorMap.get(row.category) || '#64748b',
    }));

    // 5. Daily Spend for the last 14 days
    const dailySpendRows = db.prepare(`
      SELECT 
        strftime('%Y-%m-%d', COALESCE(transaction_at, ingested_at)) as day,
        COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount WHEN type = 'REFUND' THEN -amount ELSE 0 END), 0) as amount
      FROM transactions
      WHERE is_deleted = 0
        AND is_internal_transfer = 0
        AND type IN ('DEBIT', 'REFUND')
        AND date(COALESCE(transaction_at, ingested_at)) >= date('now', '-14 days')
      GROUP BY day
      ORDER BY day ASC
    `).all() as { day: string; amount: number }[];

    // 6. Top Merchants this month
    const topMerchants = db.prepare(`
      SELECT 
        merchant,
        category,
        COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount WHEN type = 'REFUND' THEN -amount ELSE 0 END), 0) as total,
        COUNT(*) as count
      FROM transactions
      WHERE is_deleted = 0
        AND is_internal_transfer = 0
        AND type IN ('DEBIT', 'REFUND')
        AND strftime('%Y-%m', COALESCE(transaction_at, ingested_at)) = strftime('%Y-%m', 'now')
        AND merchant IS NOT NULL
        AND merchant != 'Unknown Merchant'
      GROUP BY merchant
      ORDER BY total DESC
      LIMIT 5
    `).all() as { merchant: string; category: string; total: number; count: number }[];

    return NextResponse.json({
      currentMonthSpend,
      monthlyBudget,
      remainingBudget: Math.max(0, monthlyBudget - currentMonthSpend),
      budgetUsedPercent: Math.min(100, Math.round((currentMonthSpend / monthlyBudget) * 100)),
      dailyAverageSpend,
      categoryBreakdown,
      dailySpend: dailySpendRows,
      topMerchants,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
