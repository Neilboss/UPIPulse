import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const db = getDb();
    const transactions = db.prepare(`
      SELECT 
        t.id,
        t.amount,
        t.type,
        t.merchant,
        t.category,
        a.bank_name,
        a.account_mask,
        t.balance_after,
        t.ref_id,
        t.source,
        t.parser_status,
        t.parser_confidence,
        t.transaction_at,
        t.ingested_at
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.is_deleted = 0
      ORDER BY COALESCE(t.transaction_at, t.ingested_at) DESC
    `).all() as any[];

    if (format === 'csv') {
      const headers = [
        'ID',
        'Amount',
        'Type',
        'Merchant',
        'Category',
        'Bank',
        'Account Mask',
        'Balance After',
        'Ref ID',
        'Source',
        'Parser Status',
        'Confidence',
        'Transaction Time',
        'Ingested Time',
      ];

      const rows = transactions.map((t) => [
        t.id,
        t.amount,
        t.type,
        `"${(t.merchant || '').replace(/"/g, '""')}"`,
        t.category,
        t.bank_name || '',
        t.account_mask || '',
        t.balance_after ?? '',
        t.ref_id || '',
        t.source,
        t.parser_status,
        t.parser_confidence,
        t.transaction_at || '',
        t.ingested_at || '',
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="upipulse_transactions.csv"',
        },
      });
    }

    return new NextResponse(JSON.stringify(transactions, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="upipulse_transactions.json"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
