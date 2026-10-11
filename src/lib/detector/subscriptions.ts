export interface SubscriptionItem {
  id: string;
  merchant: string;
  amount: number;
  frequency: 'MONTHLY' | 'YEARLY' | 'QUARTERLY';
  lastPaidAt: string;
  nextDueDate: string;
  daysRemaining: number;
  category: string;
  confidence: number;
}

const KNOWN_SUBSCRIPTION_KEYWORDS: Record<string, { category: string; defaultDays: number }> = {
  netflix: { category: 'Entertainment', defaultDays: 30 },
  spotify: { category: 'Entertainment', defaultDays: 30 },
  prime: { category: 'Entertainment', defaultDays: 30 },
  hotstar: { category: 'Entertainment', defaultDays: 30 },
  youtube: { category: 'Entertainment', defaultDays: 30 },
  apple: { category: 'Utilities', defaultDays: 30 },
  'google one': { category: 'Utilities', defaultDays: 30 },
  airtel: { category: 'Utilities', defaultDays: 30 },
  jio: { category: 'Utilities', defaultDays: 30 },
  act: { category: 'Utilities', defaultDays: 30 },
  'tata play': { category: 'Utilities', defaultDays: 30 },
  bescom: { category: 'Utilities', defaultDays: 30 },
  rent: { category: 'Rent', defaultDays: 30 },
  emi: { category: 'Loans & EMI', defaultDays: 30 },
  sip: { category: 'Investment', defaultDays: 30 },
  zerodha: { category: 'Investment', defaultDays: 30 },
  groww: { category: 'Investment', defaultDays: 30 },
};

export function detectSubscriptions(
  transactions: Array<{
    id: string;
    amount: number;
    merchant?: string | null;
    type: string;
    category?: string;
    transaction_at?: string | null;
    ingested_at: string;
  }>
): SubscriptionItem[] {
  const debits = transactions.filter((t) => t.type === 'DEBIT' && t.merchant);
  const merchantGroups: Record<string, Array<{ amount: number; date: Date; category?: string }>> = {};

  for (const t of debits) {
    const rawMerchant = (t.merchant || '').trim();
    if (!rawMerchant) continue;
    const cleanKey = rawMerchant.toLowerCase();
    const date = new Date(t.transaction_at || t.ingested_at);

    if (!merchantGroups[cleanKey]) {
      merchantGroups[cleanKey] = [];
    }
    merchantGroups[cleanKey].push({ amount: t.amount, date, category: t.category });
  }

  const detected: SubscriptionItem[] = [];
  const now = new Date();

  for (const [key, items] of Object.entries(merchantGroups)) {
    // Sort items by date descending (newest first)
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    const latest = items[0];

    // Check if known subscription keyword
    let isKnown = false;
    let matchedCategory = latest.category || 'Utilities';

    for (const [keyword, info] of Object.entries(KNOWN_SUBSCRIPTION_KEYWORDS)) {
      if (key.includes(keyword)) {
        isKnown = true;
        matchedCategory = info.category;
        break;
      }
    }

    // Check if repeat transaction pattern (2+ payments with similar amount)
    let isRepeat = false;
    if (items.length >= 2) {
      const avgIntervalDays = (items[0].date.getTime() - items[items.length - 1].date.getTime()) / (1000 * 60 * 60 * 24 * (items.length - 1));
      if (avgIntervalDays >= 20 && avgIntervalDays <= 45) {
        isRepeat = true;
      }
    }

    if (isKnown || isRepeat) {
      const nextDue = new Date(latest.date);
      nextDue.setDate(nextDue.getDate() + 30);

      // If next due is past, roll forward by 30 days until it's future
      while (nextDue.getTime() < now.getTime()) {
        nextDue.setDate(nextDue.getDate() + 30);
      }

      const diffMs = nextDue.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const formattedMerchant = key
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      detected.push({
        id: `sub_${key.replace(/[^a-z0-9]/g, '_')}`,
        merchant: formattedMerchant,
        amount: latest.amount,
        frequency: 'MONTHLY',
        lastPaidAt: latest.date.toISOString(),
        nextDueDate: nextDue.toISOString(),
        daysRemaining,
        category: matchedCategory,
        confidence: isKnown && isRepeat ? 0.95 : isKnown ? 0.85 : 0.75,
      });
    }
  }

  // Sort by days remaining (soonest first)
  detected.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return detected;
}
