// UPIPulse Indian Banking & UPI Regex Pattern Registry
import { TransactionSource, TransactionType } from './types';

export interface BankPattern {
  id: string;
  bankName: string;
  source: TransactionSource;
  identify: (text: string) => boolean;
  extract: (text: string) => {
    amount: number | null;
    type: TransactionType;
    merchant: string | null;
    accountMask: string | null;
    balanceAfter: number | null;
    refId: string | null;
    transactionAt: string | null;
  } | null;
}

export const BANK_PATTERNS: BankPattern[] = [
  // 1. HDFC Bank
  {
    id: 'hdfc_sms',
    bankName: 'HDFC Bank',
    source: 'Bank SMS',
    identify: (text) => /\bHDFC\s*Bank\b/i.test(text),
    extract: (text) => {
      const isDebit = /\bdebited\b/i.test(text);
      const isCredit = /\bcredited\b/i.test(text);
      const isRefund = /\brefund\b/i.test(text);

      const type: TransactionType = isRefund ? 'REFUND' : isDebit ? 'DEBIT' : isCredit ? 'CREDIT' : 'UNKNOWN';

      const amtMatch = text.match(/₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;

      const acctMatch = text.match(/a\/c\s+(?:no\.?\s*)?(?:[*Xx]+)(\d{3,4})/i);
      const accountMask = acctMatch ? `XX${acctMatch[1]}` : null;

      const balMatch = text.match(/Av(?:ai)?l\s+bal(?:ance)?\s*[:\s]*₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const balanceAfter = balMatch ? parseFloat(balMatch[1]) : null;

      const refMatch = text.match(/(?:UPI\s+ref(?:\s+no\.?)?|ref(?:\s+no\.?)?)\s*[:\s]*(\d{8,16})/i);
      const refId = refMatch ? refMatch[1] : null;

      let merchant: string | null = null;
      const vpaMatch = text.match(/(?:to\s+VPA|linked\s+to\s+VPA)\s+([a-zA-Z0-9.\-_@]+)/i);
      if (vpaMatch) {
        merchant = vpaMatch[1];
      } else {
        const toMatch = text.match(/(?:to|at|info:)\s+([A-Za-z0-9\s._&-]{2,30}?)(?=\s+(?:on|via|ref|bal|avl)|\.|$)/i);
        if (toMatch) merchant = toMatch[1].trim();
      }

      return {
        amount,
        type,
        merchant,
        accountMask,
        balanceAfter,
        refId,
        transactionAt: null,
      };
    },
  },

  // 2. State Bank of India (SBI)
  {
    id: 'sbi_sms',
    bankName: 'State Bank of India',
    source: 'Bank SMS',
    identify: (text) => /\bSBI\b/i.test(text),
    extract: (text) => {
      const isDebit = /\bdebited\b/i.test(text);
      const isCredit = /\bcredited\b/i.test(text);
      const isRefund = /\brefund\b/i.test(text);
      const type: TransactionType = isRefund ? 'REFUND' : isDebit ? 'DEBIT' : isCredit ? 'CREDIT' : 'UNKNOWN';

      const amtMatch = text.match(/₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;

      const acctMatch = text.match(/A\/c\s+(?:no\.?\s*)?(?:[*Xx]+)(\d{3,4})/i);
      const accountMask = acctMatch ? `XX${acctMatch[1]}` : null;

      const balMatch = text.match(/\bBal(?:ance)?\s*[:\s]*₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const balanceAfter = balMatch ? parseFloat(balMatch[1]) : null;

      let refId: string | null = null;
      let merchant: string | null = null;

      const upiCompound = text.match(/UPI\/(\d{8,16})\/([A-Za-z0-9_-]+)/i);
      if (upiCompound) {
        refId = upiCompound[1];
        merchant = upiCompound[2].trim();
      } else {
        const refMatch = text.match(/\b(?:ref(?:\s+no\.?)?|rrn)\s*[:\s]*(\d{8,16})/i);
        if (refMatch) refId = refMatch[1];
      }

      return {
        amount,
        type,
        merchant,
        accountMask,
        balanceAfter,
        refId,
        transactionAt: null,
      };
    },
  },

  // 3. ICICI Bank
  {
    id: 'icici_sms',
    bankName: 'ICICI Bank',
    source: 'Bank SMS',
    identify: (text) => /\bICICI\b/i.test(text) || /\bAcct\s+XX\d{3,4}\b/i.test(text),
    extract: (text) => {
      const isDebit = /\bdebited\b/i.test(text) || /\bwithdrawal\b/i.test(text);
      const isCredit = /\bcredited\b/i.test(text);
      const isRefund = /\brefund\b/i.test(text);
      const type: TransactionType = isRefund ? 'REFUND' : isDebit ? 'DEBIT' : isCredit ? 'CREDIT' : 'UNKNOWN';

      const amtMatch = text.match(/₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;

      const acctMatch = text.match(/Acct\s+(?:no\.?\s*)?(?:[*Xx]+)(\d{3,4})/i);
      const accountMask = acctMatch ? `XX${acctMatch[1]}` : null;

      const balMatch = text.match(/(?:Available\s+Balance\s+(?:is\s+)?|Avail\s+Bal\s*[:\s]*)₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const balanceAfter = balMatch ? parseFloat(balMatch[1]) : null;

      let refId: string | null = null;
      let merchant: string | null = null;

      const infoUpi = text.match(/Info:\s*UPI\/([A-Za-z0-9\s._&-]+)\/(\d{8,16})/i);
      if (infoUpi) {
        merchant = infoUpi[1].trim();
        refId = infoUpi[2];
      } else {
        const atmMatch = text.match(/\bfrom\s+ATM\b/i);
        if (atmMatch) merchant = 'ATM Cash Withdrawal';
      }

      return {
        amount,
        type,
        merchant,
        accountMask,
        balanceAfter,
        refId,
        transactionAt: null,
      };
    },
  },

  // 4. Axis Bank
  {
    id: 'axis_sms',
    bankName: 'Axis Bank',
    source: 'Bank SMS',
    identify: (text) => /\bAxis\b/i.test(text) || /\bA\/c\s+no\.\s+XX\d{3,4}\b/i.test(text),
    extract: (text) => {
      const isDebit = /\bdebited\b/i.test(text);
      const isCredit = /\bcredited\b/i.test(text);
      const isRefund = /\brefund\b/i.test(text);
      const type: TransactionType = isRefund ? 'REFUND' : isDebit ? 'DEBIT' : isCredit ? 'CREDIT' : 'UNKNOWN';

      const amtMatch = text.match(/₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;

      const acctMatch = text.match(/A\/c\s+(?:no\.?\s*)?(?:[*Xx]+)(\d{3,4})/i);
      const accountMask = acctMatch ? `XX${acctMatch[1]}` : null;

      const balMatch = text.match(/\bBal(?:ance)?\s*[:\s]*₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const balanceAfter = balMatch ? parseFloat(balMatch[1]) : null;

      let refId: string | null = null;
      let merchant: string | null = null;

      const upiMatch = text.match(/Info:\s*UPI\/([A-Za-z0-9\s._&-]+)\/(\d{6,16})/i);
      if (upiMatch) {
        merchant = upiMatch[1].trim();
        refId = upiMatch[2];
      }

      return {
        amount,
        type,
        merchant,
        accountMask,
        balanceAfter,
        refId,
        transactionAt: null,
      };
    },
  },

  // 5. Kotak Mahindra Bank
  {
    id: 'kotak_sms',
    bankName: 'Kotak Bank',
    source: 'Bank SMS',
    identify: (text) => /\bKotak\b/i.test(text),
    extract: (text) => {
      const isDebit = /\bSent\b/i.test(text) || /\bdebited\b/i.test(text);
      const isCredit = /\bReceived\b/i.test(text) || /\bcredited\b/i.test(text);
      const type: TransactionType = isDebit ? 'DEBIT' : isCredit ? 'CREDIT' : 'UNKNOWN';

      const amtMatch = text.match(/₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;

      const acctMatch = text.match(/(?:Kotak\s+Bank\s+)?A\/?C\s+(?:[*Xx]+)?(\d{3,4})/i);
      const accountMask = acctMatch ? `XX${acctMatch[1]}` : null;

      const refMatch = text.match(/\bRef\s*[:\s]*(\d{8,16})/i);
      const refId = refMatch ? refMatch[1] : null;

      let merchant: string | null = null;
      const toMatch = text.match(/\bto\s+([A-Za-z0-9\s._&-]+?)(?=\s+on\b|\s+Ref\b|\.|$)/i);
      const fromMatch = text.match(/\bfrom\s+([A-Za-z0-9\s._&-]+?)(?=\s+on\b|\s+Ref\b|\.|$)/i);
      if (isDebit && toMatch) merchant = toMatch[1].trim();
      if (isCredit && fromMatch) merchant = fromMatch[1].trim();

      return {
        amount,
        type,
        merchant,
        accountMask,
        balanceAfter: null,
        refId,
        transactionAt: null,
      };
    },
  },

  // 6. Punjab National Bank (PNB)
  {
    id: 'pnb_sms',
    bankName: 'PNB',
    source: 'Bank SMS',
    identify: (text) => /\bPNB\b/i.test(text) || /\bPunjab\s+National\s+Bank\b/i.test(text),
    extract: (text) => {
      const isDebit = /\bdebited\b/i.test(text);
      const isCredit = /\bcredited\b/i.test(text);
      const type: TransactionType = isDebit ? 'DEBIT' : isCredit ? 'CREDIT' : 'UNKNOWN';

      const amtMatch = text.match(/₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;

      const acctMatch = text.match(/A\/c\s+(?:[*Xx]+)(\d{3,4})/i);
      const accountMask = acctMatch ? `XX${acctMatch[1]}` : null;

      const balMatch = text.match(/Av(?:ai)?l\s+Bal(?:ance)?\s*[:\s]*₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const balanceAfter = balMatch ? parseFloat(balMatch[1]) : null;

      const refMatch = text.match(/\bRef\s*[:\s]*(\d{8,16})/i);
      const refId = refMatch ? refMatch[1] : null;

      return {
        amount,
        type,
        merchant: null,
        accountMask,
        balanceAfter,
        refId,
        transactionAt: null,
      };
    },
  },

  // 7. Google Pay (UPI Notification)
  {
    id: 'gpay_notif',
    bankName: 'Google Pay',
    source: 'UPI',
    identify: (text) =>
      /\bGoogle\s*Pay\b/i.test(text) ||
      /\b(?:Paid|You\s+paid)\s+₹\s*[\d.]+\s+to\b/i.test(text) ||
      /\b₹[\d.]+\s+received\s+from\b/i.test(text) ||
      /\bMoney\s+received!\s+₹/i.test(text),
    extract: (text) => {
      const isCredit = /\breceived\b/i.test(text);
      const type: TransactionType = isCredit ? 'CREDIT' : 'DEBIT';

      const amtMatch = text.match(/₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;

      let merchant: string | null = null;
      if (isCredit) {
        const fromMatch = text.match(/(?:received\s+from|from)\s+([A-Za-z0-9\s._&-]+?)(?=\.|$)/i);
        if (fromMatch) merchant = fromMatch[1].trim();
      } else {
        const toMatch = text.match(/(?:Paid|You\s+paid)\s+₹\s*[\d.]+\s+to\s+([A-Za-z0-9\s._&-]+?)(?=\.|$)/i);
        if (toMatch) merchant = toMatch[1].trim();
      }

      return {
        amount,
        type,
        merchant,
        accountMask: null,
        balanceAfter: null,
        refId: null,
        transactionAt: null,
      };
    },
  },

  // 8. PhonePe (UPI Notification)
  {
    id: 'phonepe_notif',
    bankName: 'PhonePe',
    source: 'UPI',
    identify: (text) =>
      /\bPhonePe\b/i.test(text) ||
      /\bTransaction\s+Successful:\s+Paid\b/i.test(text) ||
      /\b₹[\d.]+\s+sent\s+to\b/i.test(text),
    extract: (text) => {
      const isCredit = /\breceived\b/i.test(text);
      const type: TransactionType = isCredit ? 'CREDIT' : 'DEBIT';

      const amtMatch = text.match(/₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;

      let merchant: string | null = null;
      let accountMask: string | null = null;

      const acctMatch = text.match(/A\/c\s+(?:[*Xx]+)(\d{3,4})/i);
      if (acctMatch) accountMask = `XX${acctMatch[1]}`;

      const toMatch = text.match(/(?:Paid|sent\s+to)\s+([A-Za-z0-9\s._&-]+?)(?=\.|\s+using|$)/i);
      if (toMatch) {
        const candidate = toMatch[1].trim();
        if (!candidate.startsWith('A/c')) {
          merchant = candidate;
        }
      }

      return {
        amount,
        type,
        merchant,
        accountMask,
        balanceAfter: null,
        refId: null,
        transactionAt: null,
      };
    },
  },

  // 9. Paytm (UPI Notification)
  {
    id: 'paytm_notif',
    bankName: 'Paytm',
    source: 'UPI',
    identify: (text) =>
      /\bPaytm\b/i.test(text) ||
      /\bPaid\s+₹\s*[\d.]+\s+at\b/i.test(text) ||
      /\bMoney\s+sent\s+to\b/i.test(text),
    extract: (text) => {
      const isCredit = /\breceived\b/i.test(text);
      const type: TransactionType = isCredit ? 'CREDIT' : 'DEBIT';

      const amtMatch = text.match(/₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;

      let merchant: string | null = null;
      const atMatch = text.match(/Paid\s+₹\s*[\d.]+\s+at\s+([A-Za-z0-9\s._&-]+?)(?=\.|$)/i);
      const toMatch = text.match(/Money\s+sent\s+to\s+([A-Za-z0-9\s._&-]+?):/i);
      if (atMatch) merchant = atMatch[1].trim();
      else if (toMatch) merchant = toMatch[1].trim();

      return {
        amount,
        type,
        merchant,
        accountMask: null,
        balanceAfter: null,
        refId: null,
        transactionAt: null,
      };
    },
  },

  // 10. CRED (UPI / Card Alert)
  {
    id: 'cred_notif',
    bankName: 'CRED',
    source: 'UPI',
    identify: (text) => /\bCRED\b/i.test(text) && /\bsuccessful\b/i.test(text),
    extract: (text) => {
      const amtMatch = text.match(/₹\s*([\d]+(?:\.\d{1,2})?)/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;

      let merchant: string | null = null;
      const toMatch = text.match(/Payment\s+of\s+₹[\d.]+\s+to\s+([A-Za-z0-9\s._&-]+?)\s+successful/i);
      if (toMatch) merchant = toMatch[1].trim();

      return {
        amount,
        type: 'DEBIT',
        merchant,
        accountMask: null,
        balanceAfter: null,
        refId: null,
        transactionAt: null,
      };
    },
  },
];
