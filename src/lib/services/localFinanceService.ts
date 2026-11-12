import { parseTransactionMessage } from '../parser/smsParser';
import { categorizeTransaction } from '../parser/categorizer';

export interface LocalAccount {
  id: string;
  bank_name: string;
  account_mask: string;
  balance: number | null;
  balance_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalTransaction {
  id: string;
  amount: number;
  type: string;
  merchant: string | null;
  category: string;
  account_id: string | null;
  balance_after: number | null;
  ref_id: string | null;
  source: string;
  parser_status: string;
  parser_confidence: number;
  raw_text: string;
  transaction_at: string | null;
  ingested_at: string;
  fingerprint: string;
  is_internal_transfer: number;
  is_deleted: number;
  created_at: string;
  updated_at: string;
  bank_name?: string | null;
  account_mask?: string | null;
}

export interface LocalCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthly_budget: number;
}

export interface LocalSettings {
  id: string;
  api_key: string;
  monthly_budget_total: number;
  is_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CATEGORIES: LocalCategory[] = [
  { id: 'cat-food', name: 'Food', icon: 'Utensils', color: '#f97316', monthly_budget: 8000 },
  { id: 'cat-travel', name: 'Travel', icon: 'Car', color: '#06b6d4', monthly_budget: 3000 },
  { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', monthly_budget: 5000 },
  { id: 'cat-utilities', name: 'Utilities', icon: 'Zap', color: '#eab308', monthly_budget: 4000 },
  { id: 'cat-investment', name: 'Investment', icon: 'TrendingUp', color: '#10b981', monthly_budget: 10000 },
  { id: 'cat-p2p', name: 'P2P', icon: 'Users', color: '#8b5cf6', monthly_budget: 3000 },
  { id: 'cat-other', name: 'Other', icon: 'Tag', color: '#64748b', monthly_budget: 2000 },
];

export class LocalFinanceService {
  private static TXN_KEY = 'upipulse_local_transactions';
  private static ACC_KEY = 'upipulse_local_accounts';
  private static CAT_KEY = 'upipulse_local_categories';
  private static SET_KEY = 'upipulse_local_settings';

  // Fallback in-memory storage for SSR / Node test environments
  private static memoryStore: Record<string, string> = {};

  private static getItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return this.memoryStore[key] ?? null;
      }
    }
    return this.memoryStore[key] ?? null;
  }

  private static setItem(key: string, value: string): void {
    this.memoryStore[key] = value;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Ignore quota / private browsing errors
      }
    }
  }

  // --- INITIAL SEEDING ---
  public static initDefaults() {
    if (!this.getItem(this.CAT_KEY)) {
      this.setItem(this.CAT_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    }

    if (!this.getItem(this.SET_KEY)) {
      const defaultSettings: LocalSettings = {
        id: 'settings_default',
        api_key: 'upi_' + Math.random().toString(36).substring(2, 15),
        monthly_budget_total: 35000,
        is_onboarded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.setItem(this.SET_KEY, JSON.stringify(defaultSettings));
    }
  }

  // --- ACCOUNTS ---
  public static getAccounts(): LocalAccount[] {
    try {
      const raw = this.getItem(this.ACC_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static saveAccount(acc: Omit<LocalAccount, 'id' | 'created_at' | 'updated_at'> & { id?: string }): LocalAccount {
    const accounts = this.getAccounts();
    const now = new Date().toISOString();
    let target = accounts.find(
      (a) => (acc.id && a.id === acc.id) || a.account_mask.toLowerCase() === acc.account_mask.toLowerCase()
    );

    if (target) {
      target.bank_name = acc.bank_name || target.bank_name;
      if (acc.balance !== undefined && acc.balance !== null) {
        target.balance = acc.balance;
        target.balance_updated_at = acc.balance_updated_at || now;
      }
      target.updated_at = now;
    } else {
      target = {
        id: acc.id || 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        bank_name: acc.bank_name,
        account_mask: acc.account_mask,
        balance: acc.balance ?? null,
        balance_updated_at: acc.balance_updated_at || (acc.balance !== null ? now : null),
        created_at: now,
        updated_at: now,
      };
      accounts.push(target);
    }

    this.setItem(this.ACC_KEY, JSON.stringify(accounts));
    return target;
  }

  // --- TRANSACTIONS ---
  private static getAllTransactionsRaw(): LocalTransaction[] {
    try {
      const raw = this.getItem(this.TXN_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static getTransactions(): LocalTransaction[] {
    return this.getAllTransactionsRaw().filter((t) => !t.is_deleted);
  }

  public static saveTransaction(txn: LocalTransaction) {
    const txns = this.getAllTransactionsRaw();
    const idx = txns.findIndex((t) => t.id === txn.id);
    if (idx >= 0) {
      txns[idx] = txn;
    } else {
      txns.unshift(txn);
    }
    this.setItem(this.TXN_KEY, JSON.stringify(txns));
  }

  public static addManualTransaction(input: {
    amount: number;
    type: 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'REFUND' | 'INTERNAL_TRANSFER';
    merchant: string;
    category: string;
    accountId?: string | null;
    transactionAt?: string;
    id?: string;
  }): LocalTransaction {
    const now = new Date().toISOString();
    const accounts = this.getAccounts();
    let updatedBalance: number | null = null;
    let bankName: string | null = null;
    let accountMask: string | null = null;

    if (input.accountId) {
      const acc = accounts.find((a) => a.id === input.accountId);
      if (acc) {
        bankName = acc.bank_name;
        accountMask = acc.account_mask;
        if (acc.balance !== null && acc.balance !== undefined) {
          if (input.type === 'DEBIT') {
            updatedBalance = Math.max(0, acc.balance - input.amount);
          } else if (input.type === 'CREDIT' || input.type === 'REFUND') {
            updatedBalance = acc.balance + input.amount;
          } else {
            updatedBalance = acc.balance;
          }
          acc.balance = updatedBalance;
          acc.balance_updated_at = now;
          this.saveAccount(acc);
        }
      }
    }

    const isInternal = input.type === 'TRANSFER' || input.type === 'INTERNAL_TRANSFER' ? 1 : 0;
    const newTxn: LocalTransaction = {
      id: input.id || 'txn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      amount: input.amount,
      type: input.type === 'TRANSFER' ? 'INTERNAL_TRANSFER' : input.type,
      merchant: input.merchant || 'Manual Entry',
      category: input.category || 'Other',
      account_id: input.accountId || null,
      balance_after: updatedBalance,
      ref_id: null,
      source: 'Manual',
      parser_status: 'PARSED',
      parser_confidence: 1.0,
      raw_text: `Manual entry: ${input.merchant} - ₹${input.amount}`,
      transaction_at: input.transactionAt || now,
      ingested_at: now,
      fingerprint: `manual_${input.amount}_${input.type}_${Date.now()}`,
      is_internal_transfer: isInternal,
      is_deleted: 0,
      created_at: now,
      updated_at: now,
      bank_name: bankName,
      account_mask: accountMask,
    };

    this.saveTransaction(newTxn);
    return newTxn;
  }

  public static updateTransaction(
    id: string,
    updates: Partial<Pick<LocalTransaction, 'merchant' | 'category' | 'type' | 'amount' | 'is_internal_transfer'>>
  ): boolean {
    const txns = this.getAllTransactionsRaw();
    const idx = txns.findIndex((t) => t.id === id && !t.is_deleted);
    if (idx === -1) return false;

    const current = txns[idx];
    txns[idx] = {
      ...current,
      merchant: updates.merchant !== undefined ? updates.merchant : current.merchant,
      category: updates.category !== undefined ? updates.category : current.category,
      type: updates.type !== undefined ? updates.type : current.type,
      amount: updates.amount !== undefined ? updates.amount : current.amount,
      is_internal_transfer:
        updates.is_internal_transfer !== undefined
          ? updates.is_internal_transfer
          : updates.type === 'INTERNAL_TRANSFER'
          ? 1
          : current.is_internal_transfer,
      parser_status: 'PARSED',
      updated_at: new Date().toISOString(),
    };
    this.setItem(this.TXN_KEY, JSON.stringify(txns));
    return true;
  }

  public static deleteTransaction(id: string): boolean {
    const txns = this.getAllTransactionsRaw();
    const idx = txns.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    txns[idx].is_deleted = 1;
    txns[idx].updated_at = new Date().toISOString();
    this.setItem(this.TXN_KEY, JSON.stringify(txns));
    return true;
  }

  // --- INGESTION & PIPELINE ---
  public static ingestMessage(
    rawText: string,
    sender: string,
    timestamp?: number | string
  ): {
    success: boolean;
    action: string;
    transaction?: LocalTransaction;
    reason?: string;
  } {
    const parsed = parseTransactionMessage(rawText);
    if (parsed.status === 'UNSUPPORTED' || !parsed.amount) {
      return { success: false, action: 'REJECTED', reason: 'Non-transactional or unsupported SMS' };
    }

    const existingTxns = this.getTransactions();
    const accounts = this.getAccounts();

    // Deduplication check
    let isDuplicate = false;
    let isFused = false;
    let targetTxn: LocalTransaction | null = null;

    // L1: Exact Reference / UTR
    if (parsed.refId && parsed.refId.length >= 6) {
      const match = existingTxns.find((t) => t.ref_id === parsed.refId);
      if (match) {
        if (
          (match.source === 'UPI' && parsed.source === 'Bank SMS') ||
          (match.source === 'Bank SMS' && parsed.source === 'UPI')
        ) {
          isFused = true;
          targetTxn = match;
        } else {
          isDuplicate = true;
        }
      }
    }

    // L2: Exact raw text match or near-simultaneous identical transaction
    if (!isDuplicate && !isFused) {
      const normIncomingMerchant = (parsed.merchant || '').toLowerCase().trim();
      const exactMatch = existingTxns.find((t) => {
        if (t.raw_text.trim() === rawText.trim()) return true;
        if (
          t.amount === parsed.amount &&
          t.type === parsed.type &&
          t.account_mask &&
          parsed.accountMask &&
          t.account_mask === parsed.accountMask &&
          (t.merchant || '').toLowerCase().trim() === normIncomingMerchant &&
          (!parsed.refId || !t.ref_id || t.ref_id === parsed.refId)
        ) {
          return true;
        }
        return false;
      });
      if (exactMatch) {
        isDuplicate = true;
      }
    }

    if (isDuplicate) {
      return { success: false, action: 'DUPLICATE', reason: 'Already imported' };
    }

    const now = new Date().toISOString();
    const effectiveTxnTime = timestamp
      ? new Date(timestamp).toISOString()
      : parsed.transactionAt
      ? new Date(parsed.transactionAt).toISOString()
      : now;

    // Find or create account
    let accountId: string | null = null;
    const accountMask = parsed.accountMask;
    const bankName = parsed.bankName || 'Bank';

    if (accountMask) {
      let acc = accounts.find((a) => a.account_mask.toLowerCase() === accountMask.toLowerCase());
      if (!acc) {
        acc = this.saveAccount({
          bank_name: bankName,
          account_mask: accountMask,
          balance: parsed.balanceAfter ?? null,
          balance_updated_at: parsed.balanceAfter !== null && parsed.balanceAfter !== undefined ? effectiveTxnTime : null,
        });
      } else if (parsed.balanceAfter !== null && parsed.balanceAfter !== undefined) {
        acc.balance = parsed.balanceAfter;
        acc.balance_updated_at = effectiveTxnTime;
        this.saveAccount(acc);
      }
      accountId = acc.id;
    }

    if (isFused && targetTxn) {
      const allRaw = this.getAllTransactionsRaw();
      const idx = allRaw.findIndex((t) => t.id === targetTxn!.id);
      const cleanMerchant =
        parsed.source === 'UPI' && parsed.merchant && parsed.merchant !== 'Unknown Merchant'
          ? parsed.merchant
          : targetTxn.merchant && targetTxn.merchant !== 'Unknown Merchant'
          ? targetTxn.merchant
          : parsed.merchant || targetTxn.merchant;

      targetTxn.merchant = cleanMerchant;
      targetTxn.source = 'UPI + Bank SMS';
      targetTxn.balance_after = parsed.balanceAfter ?? targetTxn.balance_after;
      targetTxn.parser_confidence = Math.min(1.0, (targetTxn.parser_confidence + parsed.confidence) / 2 + 0.1);
      targetTxn.parser_status = 'PARSED';
      targetTxn.updated_at = now;
      if (accountId && !targetTxn.account_id) {
        targetTxn.account_id = accountId;
        targetTxn.account_mask = accountMask;
        targetTxn.bank_name = bankName;
      }
      if (idx >= 0) {
        allRaw[idx] = targetTxn;
        this.setItem(this.TXN_KEY, JSON.stringify(allRaw));
      }
      return { success: true, action: 'FUSED', transaction: targetTxn };
    }

    const category = categorizeTransaction(parsed.merchant, parsed.normalizedText);
    const fingerprint = parsed.refId || `${parsed.amount}_${parsed.type}_${Date.now()}`;

    // New transaction
    const newTxn: LocalTransaction = {
      id: 'txn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      amount: parsed.amount,
      type: parsed.type,
      merchant: parsed.merchant,
      category,
      account_id: accountId,
      balance_after: parsed.balanceAfter ?? null,
      ref_id: parsed.refId ?? null,
      source: parsed.source,
      parser_status: parsed.status,
      parser_confidence: parsed.confidence,
      raw_text: parsed.rawText,
      transaction_at: effectiveTxnTime,
      ingested_at: now,
      fingerprint,
      is_internal_transfer: 0,
      is_deleted: 0,
      created_at: now,
      updated_at: now,
      bank_name: bankName,
      account_mask: accountMask,
    };

    const allRaw = this.getAllTransactionsRaw();
    allRaw.unshift(newTxn);
    this.setItem(this.TXN_KEY, JSON.stringify(allRaw));

    return { success: true, action: 'INSERTED', transaction: newTxn };
  }

  // --- BATCH HISTORICAL INGESTION ---
  public static ingestHistoricalBatch(
    messages: Array<{ body: string; address?: string; date?: number | string }>,
    onProgress?: (processed: number, total: number, inserted: number) => void
  ): {
    total: number;
    inserted: number;
    fused: number;
    duplicates: number;
    rejected: number;
  } {
    // Sort oldest to newest so balances & history build chronologically
    const sorted = [...messages].sort((a, b) => {
      const timeA = typeof a.date === 'number' ? a.date : new Date(a.date || 0).getTime();
      const timeB = typeof b.date === 'number' ? b.date : new Date(b.date || 0).getTime();
      return timeA - timeB;
    });

    let inserted = 0;
    let fused = 0;
    let duplicates = 0;
    let rejected = 0;

    for (let i = 0; i < sorted.length; i++) {
      const msg = sorted[i];
      const res = this.ingestMessage(msg.body, msg.address || 'SMS', msg.date);
      if (res.action === 'INSERTED') inserted++;
      else if (res.action === 'FUSED') fused++;
      else if (res.action === 'DUPLICATE') duplicates++;
      else rejected++;

      if (onProgress && (i % 10 === 0 || i === sorted.length - 1)) {
        onProgress(i + 1, sorted.length, inserted + fused);
      }
    }

    return {
      total: sorted.length,
      inserted,
      fused,
      duplicates,
      rejected,
    };
  }

  // --- ANALYTICS ---
  public static computeAnalyticsFromData(
    transactions: any[],
    accounts: any[],
    monthlyBudgetOverride?: number
  ) {
    const categories = this.getCategories();
    const settings = this.getSettings();
    const colorMap = new Map(categories.map((c) => [c.name, c.color]));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = Math.max(1, now.getDate());
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    let currentMonthDebits = 0;
    let currentMonthRefunds = 0;
    let totalMonthIncome = 0;
    const categoryTotals: Record<string, number> = {};
    const dailyTotals: Record<string, number> = {};
    const merchantTotals: Record<string, { merchant: string; category: string; total: number; count: number }> = {};

    for (const t of transactions) {
      if (t.is_deleted || t.is_internal_transfer) continue;
      const tDate = new Date(t.transaction_at || t.ingested_at);
      if (isNaN(tDate.getTime())) continue;

      const isCurrentMonth = tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;

      if (isCurrentMonth) {
        if (t.type === 'DEBIT') {
          currentMonthDebits += t.amount;
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;

          if (t.merchant && t.merchant !== 'Unknown Merchant') {
            const mKey = t.merchant;
            if (!merchantTotals[mKey]) {
              merchantTotals[mKey] = { merchant: t.merchant, category: t.category || 'Other', total: 0, count: 0 };
            }
            merchantTotals[mKey].total += t.amount;
            merchantTotals[mKey].count += 1;
          }
        } else if (t.type === 'REFUND') {
          currentMonthRefunds += t.amount;
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) - t.amount;
          if (t.merchant && merchantTotals[t.merchant]) {
            merchantTotals[t.merchant].total = Math.max(0, merchantTotals[t.merchant].total - t.amount);
          }
        } else if (t.type === 'CREDIT') {
          totalMonthIncome += t.amount;
        }
      }

      if (tDate >= fourteenDaysAgo && (t.type === 'DEBIT' || t.type === 'REFUND')) {
        const dayKey = tDate.toISOString().slice(0, 10);
        const delta = t.type === 'DEBIT' ? t.amount : -t.amount;
        dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + delta;
      }
    }

    const currentMonthSpend = Math.max(0, currentMonthDebits - currentMonthRefunds);
    const dailyAverageSpend = Math.round(currentMonthSpend / currentDay);

    const categoryBreakdown = Object.entries(categoryTotals)
      .filter(([, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: currentMonthSpend > 0 ? Math.round((amount / currentMonthSpend) * 100) : 0,
        color: colorMap.get(name) || '#64748b',
      }));

    const dailySpend = Object.entries(dailyTotals)
      .filter(([, amt]) => amt > 0)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, amount]) => ({ day, amount }));

    const topMerchants = Object.values(merchantTotals)
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const accountsWithBal = accounts.filter((a) => a.balance !== null && a.balance !== undefined);
    const totalBankBalance = accountsWithBal.reduce((acc, a) => acc + Number(a.balance || 0), 0);
    const hasAccounts = accountsWithBal.length > 0;
    const monthlyBudget = monthlyBudgetOverride || settings.monthly_budget_total || 35000;
    const remainingBudget = Math.max(0, monthlyBudget - currentMonthSpend);
    const safeSpendingLimit = hasAccounts ? Math.min(remainingBudget, totalBankBalance) : remainingBudget;
    const isBalanceConstrained = hasAccounts && totalBankBalance < remainingBudget;
    const budgetUsedPercent = Math.min(100, Math.round((currentMonthSpend / monthlyBudget) * 100));

    return {
      currentMonthSpend,
      totalMonthSpend: currentMonthSpend,
      totalMonthIncome,
      netSavings: totalMonthIncome - currentMonthSpend,
      totalBankBalance,
      monthlyBudget,
      remainingBudget,
      safeSpendingLimit,
      isBalanceConstrained,
      hasAccounts,
      budgetUsedPercent,
      dailyAverageSpend,
      categoryBreakdown,
      categorySpend: categoryBreakdown,
      dailySpend,
      topMerchants,
      accounts,
      recentTransactions: transactions.slice(0, 15),
    };
  }

  public static getAnalytics() {
    this.initDefaults();
    const transactions = this.getTransactions();
    const accounts = this.getAccounts();
    return this.computeAnalyticsFromData(transactions, accounts);
  }

  // --- SETTINGS & CATEGORIES ---
  public static getCategories(): LocalCategory[] {
    try {
      const raw = this.getItem(this.CAT_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  public static getSettings(): LocalSettings {
    try {
      const raw = this.getItem(this.SET_KEY);
      return raw
        ? JSON.parse(raw)
        : {
            id: 'settings_default',
            api_key: 'default_key',
            monthly_budget_total: 35000,
            is_onboarded: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
    } catch {
      return {
        id: 'settings_default',
        api_key: 'default_key',
        monthly_budget_total: 35000,
        is_onboarded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  public static updateSettings(partial: Partial<LocalSettings>): LocalSettings {
    const cur = this.getSettings();
    const updated = { ...cur, ...partial, updated_at: new Date().toISOString() };
    this.setItem(this.SET_KEY, JSON.stringify(updated));
    return updated;
  }

  // --- EXPORT & BACKUP ---
  public static exportDataJson(): string {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        accounts: this.getAccounts(),
        transactions: this.getTransactions(),
        categories: this.getCategories(),
        settings: this.getSettings(),
      },
      null,
      2
    );
  }

  public static exportDataCsv(transactions?: any[]): string {
    const rows = transactions || this.getTransactions();
    const headers = [
      'ID',
      'Date',
      'Type',
      'Amount',
      'Merchant',
      'Category',
      'Bank',
      'Account Mask',
      'Balance After',
      'Reference ID',
      'Source',
      'Confidence',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };

    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.transaction_at || r.ingested_at,
          r.type,
          r.amount,
          r.merchant,
          r.category,
          r.bank_name || '',
          r.account_mask || '',
          r.balance_after ?? '',
          r.ref_id || '',
          r.source,
          r.parser_confidence,
        ]
          .map(escapeCsv)
          .join(',')
      );
    }
    return lines.join('\n');
  }

  public static importDataJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.accounts && Array.isArray(parsed.accounts)) {
        this.setItem(this.ACC_KEY, JSON.stringify(parsed.accounts));
      }
      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        this.setItem(this.TXN_KEY, JSON.stringify(parsed.transactions));
      }
      if (parsed.categories && Array.isArray(parsed.categories)) {
        this.setItem(this.CAT_KEY, JSON.stringify(parsed.categories));
      }
      if (parsed.settings) {
        this.setItem(this.SET_KEY, JSON.stringify(parsed.settings));
      }
      return true;
    } catch {
      return false;
    }
  }
}
