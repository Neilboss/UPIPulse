// UPIPulse Normalizer & Pre-Filter

export interface PreFilterResult {
  isFinancial: boolean;
  rejectReason?: string;
  normalizedText: string;
}

export function normalizeText(raw: string): string {
  if (!raw) return '';

  return (
    raw
      // Replace non-breaking spaces and tabs with standard space
      .replace(/[\u00A0\t\r\n]+/g, ' ')
      // Normalize currency indicators: Rs., Rs, INR, inr to standard INR token
      .replace(/(?:Rs\.?|INR)\s*/gi, '₹')
      // Remove commas inside numbers e.g. 14,250.00 -> 14250.00
      .replace(/(\d),(\d)/g, '$1$2')
      // Standardize masked account symbols: XXXXX1234, **1234, *1234 -> XX1234
      .replace(/[*X]{2,}(\d{3,4})/gi, 'XX$1')
      // Collapse multiple spaces
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

export function preFilterMessage(raw: string): PreFilterResult {
  const normalized = normalizeText(raw);

  if (!normalized || normalized.length < 5) {
    return {
      isFinancial: false,
      rejectReason: 'Message is too short or empty',
      normalizedText: normalized,
    };
  }

  // 1. Strict OTP detection (must not be marked as a financial transaction)
  const otpPatterns = [
    /\b(?:is\s+your|use)\s+(?:one\s*time\s*password|otp)\b/i,
    /\b(?:otp|secret\s*code)\s*(?:is|for)\s*[:\s]*\d{4,8}\b/i,
    /\bdo\s+not\s+share\s+(?:this\s+)?otp\b/i,
    /\botp\s+to\s+login\b/i,
    /\bverification\s+code\s+is\s+\d{4,8}\b/i,
  ];

  for (const pattern of otpPatterns) {
    // If it has OTP patterns and NO explicit debit/credit financial wording
    if (pattern.test(normalized) && !/\b(debited|credited|sent|received|spent)\b/i.test(normalized)) {
      return {
        isFinancial: false,
        rejectReason: 'Non-transactional OTP / verification message',
        normalizedText: normalized,
      };
    }
  }

  // 2. Strict Marketing / Spam / Loan offer detection
  const promoPatterns = [
    /\bcongratulations!?\s+you\s+are\s+eligible\b/i,
    /\bpre-approved\s+(?:personal\s+)?loan\b/i,
    /\bapply\s+now\s+for\s+(?:credit\s+card|instant\s+loan)\b/i,
    /\binstant\s+loan\s+approval\b/i,
    /\bget\s+flat\s+\d+%\s+off\s+on\b/i,
  ];

  for (const pattern of promoPatterns) {
    if (pattern.test(normalized) && !/\b(debited|credited|avl bal|available balance)\b/i.test(normalized)) {
      return {
        isFinancial: false,
        rejectReason: 'Promotional / marketing offer message',
        normalizedText: normalized,
      };
    }
  }

  return {
    isFinancial: true,
    normalizedText: normalized,
  };
}
