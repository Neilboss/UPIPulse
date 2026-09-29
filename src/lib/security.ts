import crypto from 'crypto';
import { getDb } from './db';

// In-memory rate limiting map for local app
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();

export function checkRateLimit(ipOrKey: string, limit: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(ipOrKey);

  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(ipOrKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function authenticateApiKey(providedKey: string | null): boolean {
  if (!providedKey || typeof providedKey !== 'string') {
    return false;
  }

  const db = getDb();
  const row = db.prepare('SELECT api_key FROM settings LIMIT 1').get() as { api_key: string } | undefined;

  if (!row || !row.api_key) {
    return false;
  }

  const expectedKey = row.api_key;

  try {
    const bufA = Buffer.from(providedKey);
    const bufB = Buffer.from(expectedKey);

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
