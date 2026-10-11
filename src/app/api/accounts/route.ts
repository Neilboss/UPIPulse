import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id: customId, bankName, accountMask, balance } = body;

    const db = getDb();
    const now = new Date().toISOString();

    const cleanBank = (bankName || 'Primary Bank').trim();
    const cleanMask = (accountMask || 'XX0000').trim().toUpperCase();
    const initialBalance = typeof balance === 'number' ? Math.max(0, balance) : parseFloat(balance) || 0;

    // Check if account with same mask or id already exists
    const existing = db.prepare(`
      SELECT id FROM accounts WHERE account_mask = ? OR id = ?
    `).get(cleanMask, customId || '') as { id: string } | undefined;

    let targetId = existing?.id || customId;
    if (!targetId) {
      const slug = cleanMask.toLowerCase().replace(/[^a-z0-9]/g, '');
      targetId = 'acc_' + (slug || crypto.randomBytes(4).toString('hex'));
    }

    if (existing) {
      db.prepare(`
        UPDATE accounts SET
          bank_name = ?,
          account_mask = ?,
          balance = ?,
          balance_updated_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(cleanBank, cleanMask, initialBalance, now, now, targetId);
    } else {
      db.prepare(`
        INSERT INTO accounts (id, bank_name, account_mask, balance, balance_updated_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(targetId, cleanBank, cleanMask, initialBalance, now, now, now);
    }

    const saved = db.prepare('SELECT * FROM accounts WHERE id = ?').get(targetId);

    return NextResponse.json({
      success: true,
      account: saved,
      message: existing ? 'Account balance updated' : 'Account created successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
