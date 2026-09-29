// UPIPulse India-Focused Rule-Based Categorizer

export interface CategoryRule {
  category: string;
  keywords: string[];
}

export const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'Food',
    keywords: [
      'swiggy',
      'zomato',
      'blinkit',
      'zepto',
      'instamart',
      'bigbasket',
      'chai point',
      'starbucks',
      'mcdonald',
      'domino',
      'kfc',
      'pizza',
      'burger',
      'restaurant',
      'cafe',
      'bakery',
      'biryani',
      'tea',
      'coffee',
      'dhabba',
      'bhojanalaya',
      'sweets',
      'kitchen',
      'baker',
      'hotel',
    ],
  },
  {
    category: 'Travel',
    keywords: [
      'uber',
      'ola',
      'rapido',
      'namma yatri',
      'metro',
      'irctc',
      'railway',
      'makemytrip',
      'goibibo',
      'cleartrip',
      'indigo',
      'air india',
      'akasa',
      'redbus',
      'fuel',
      'petrol',
      'diesel',
      'hpcl',
      'bpcl',
      'iocl',
      'shell',
      'toll',
      'fastag',
    ],
  },
  {
    category: 'Shopping',
    keywords: [
      'amazon',
      'flipkart',
      'myntra',
      'ajio',
      'meesho',
      'nykaa',
      'tata cliq',
      'croma',
      'reliance digital',
      'decathlon',
      'zara',
      'h&m',
      'uniqlo',
      'trends',
      'westside',
      'dmart',
      'retail',
      'apparel',
      'footwear',
    ],
  },
  {
    category: 'Utilities',
    keywords: [
      'jio',
      'airtel',
      'vodafone',
      'vi',
      'bsnl',
      'bescom',
      'tata power',
      'adani electricity',
      'mseb',
      'uppcl',
      'billdesk',
      'electricity',
      'water',
      'gas',
      'broadband',
      'act fibernet',
      'hathway',
      'airtel dth',
      'tata sky',
      'recharge',
      'maintenance',
    ],
  },
  {
    category: 'Investment',
    keywords: [
      'zerodha',
      'groww',
      'angelone',
      'upstox',
      'kuvera',
      'indmoney',
      'mutual fund',
      'sip',
      'coin',
      'smallcase',
      'nse',
      'bse',
      'icici direct',
      'hdfc securities',
      'ppfas',
      'nippon',
      'mirae',
    ],
  },
  {
    category: 'P2P',
    keywords: [
      '@okaxis',
      '@oksbi',
      '@okhdfcbank',
      '@okicici',
      '@paytm',
      '@ybl',
      '@ibl',
      '@axl',
      'sent to',
      'received from',
      'transfer to',
      'transfer from',
    ],
  },
];

export function categorizeTransaction(merchant: string | null, rawText: string): string {
  const textToScan = `${merchant || ''} ${rawText}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (textToScan.includes(keyword.toLowerCase())) {
        return rule.category;
      }
    }
  }

  return 'Other';
}
