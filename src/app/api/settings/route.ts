import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import crypto from 'crypto';
import { getDb } from '../../../lib/db';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const settings = db.prepare('SELECT * FROM settings LIMIT 1').get() as any;

    const { searchParams } = new URL(req.url);
    const revealKey = searchParams.get('reveal') === 'true';

    const localIp = getLocalIp();
    const webhookUrl = `http://${localIp}:3000/api/ingest`;

    return NextResponse.json({
      monthlyBudgetTotal: settings?.monthly_budget_total || 35000,
      isOnboarded: !!settings?.is_onboarded,
      apiKey: revealKey ? settings?.api_key : `${settings?.api_key?.substring(0, 7)}••••••••••••••••`,
      webhookUrl,
      localIp,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();
    const now = new Date().toISOString();

    if (body.rotateApiKey) {
      const newKey = 'upi_' + crypto.randomBytes(16).toString('hex');
      db.prepare(`
        UPDATE settings SET api_key = ?, updated_at = ?
        WHERE id = 'settings_default'
      `).run(newKey, now);

      return NextResponse.json({ success: true, newApiKey: newKey, message: 'API Key rotated successfully' });
    }

    let updated = false;

    if (body.monthlyBudgetTotal && typeof body.monthlyBudgetTotal === 'number' && body.monthlyBudgetTotal > 0) {
      db.prepare(`
        UPDATE settings SET monthly_budget_total = ?, updated_at = ?
        WHERE id = 'settings_default'
      `).run(body.monthlyBudgetTotal, now);
      updated = true;
    }

    if (body.isOnboarded !== undefined) {
      db.prepare(`
        UPDATE settings SET is_onboarded = ?, updated_at = ?
        WHERE id = 'settings_default'
      `).run(body.isOnboarded ? 1 : 0, now);
      updated = true;
    }

    if (updated) {
      return NextResponse.json({ success: true, message: 'Settings updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid settings update' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
