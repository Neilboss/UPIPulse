import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { TransactionUpdateSchema } from '../../../../lib/validation';

export function generateStaticParams() {
  return [];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json();

    const validation = TransactionUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.flatten() }, { status: 400 });
    }

    const { merchant, category, type, amount, is_internal_transfer } = validation.data;
    const db = getDb();
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE transactions SET
        merchant = COALESCE(?, merchant),
        category = COALESCE(?, category),
        type = COALESCE(?, type),
        amount = COALESCE(?, amount),
        is_internal_transfer = COALESCE(?, is_internal_transfer),
        parser_status = 'PARSED',
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `).run(
      merchant !== undefined ? merchant : null,
      category !== undefined ? category : null,
      type !== undefined ? type : null,
      amount !== undefined ? amount : null,
      is_internal_transfer !== undefined ? is_internal_transfer : null,
      now,
      id
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Transaction updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const db = getDb();
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE transactions SET
        is_deleted = 1,
        updated_at = ?
      WHERE id = ?
    `).run(now, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
