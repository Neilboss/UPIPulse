import { NextRequest, NextResponse } from 'next/server';
import { parseTransactionMessage } from '../../../lib/parser/smsParser';
import { categorizeTransaction } from '../../../lib/parser/categorizer';
import { checkDuplicateAndFuse } from '../../../lib/parser/deduplicator';
import { getDb } from '../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text field is required' }, { status: 400 });
    }

    if (text.length > 2048) {
      return NextResponse.json({ error: 'Payload exceeds 2 KB limit' }, { status: 413 });
    }

    // 1. Dry run parse
    const parsed = parseTransactionMessage(text);

    // 2. Predict category
    const category = categorizeTransaction(parsed.merchant, parsed.normalizedText);

    // 3. Dry run duplicate / fusion check against existing database
    const db = getDb();
    const duplicateCheck = checkDuplicateAndFuse(parsed, db);

    return NextResponse.json({
      success: true,
      parsed: {
        ...parsed,
        predictedCategory: category,
      },
      duplicateCheck: {
        isDuplicate: duplicateCheck.isDuplicate,
        isFused: duplicateCheck.isFused,
        existingTransactionId: duplicateCheck.existingTransactionId,
        reason: duplicateCheck.reason,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
