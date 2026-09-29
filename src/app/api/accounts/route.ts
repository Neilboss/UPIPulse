import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';

export async function GET() {
  try {
    const db = getDb();
    const accounts = db.prepare(`
      SELECT 
        id,
        bank_name,
        account_mask,
        balance,
        balance_updated_at,
        created_at,
        updated_at
      FROM accounts
      ORDER BY updated_at DESC
    `).all();

    return NextResponse.json({ accounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
