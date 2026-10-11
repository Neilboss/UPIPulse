import { parseTransactionMessage } from '../parser/smsParser';
import { categorizeTransaction } from '../parser/categorizer';
import { ParsedTransaction } from '../parser/types';

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

export class LocalFinanceService {
  private static TXN_KEY = 'upipulse_local_transactions';
  private static ACC_KEY = 'upipulse_local_accounts';
  private static CAT_KEY = 'upipulse_local_categories';
  private static SET_KEY = 'upipulse_local_settings';

  private static isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  // --- INITIAL SEEDING ---
  public static initDefaults() {
    if (!this.isBrowser()) return;

    if (!localStorage.getItem(this.CAT_KEY)) {
      const defaultCategories: LocalCategory[] = [
        { id: 'cat-food', name: 'Food', icon: 'Utensils', color: '#f97316', monthly_budget: 8000 },
        { id: 'cat-travel', name: 'Travel', icon: 'Car', color: '#06b6d4', monthly_budget: 3000 },
        { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', monthly_budget: 5000 },
        { id: 'cat-utilities', name: 'Utilities', icon: 'Zap', color: '#eab308', monthly_budget: 4000 },
        { id: 'cat-investment', name: 'Investment', icon: 'TrendingUp', color: '#10b981', monthly_budget: 10000 },
        { id: 'cat-p2p', name: 'P2P', icon: 'Users', color: '#8b5cf6', monthly_budget: 3000 },
        { id: 'cat-other', name: 'Other', icon: 'Tag', color: '#64748b', monthly_budget: 2000 },
      ];
      localStorage.setItem(this.CAT_KEY, JSON.stringify(defaultCategories));
    }

    if (!localStorage.getItem(this.SET_KEY)) {
      const defaultSettings: LocalSettings = {
        id: 'settings_default',
        api_key: 'upi_' + Math.random().toString(36).substring(2, 15),
        monthly_budget_total: 35000,
        is_onboarded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(this.SET_KEY, JSON.stringify(defaultSettings));
    }
  }

  // --- ACCOUNTS ---
  public static getAccounts(): LocalAccount[] {
    if (!this.isBrowser()) return [];
    try {
      const raw = localStorage.getItem(this.ACC_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static saveAccount(acc: Omit<LocalAccount, 'id' | 'created_at' | 'updated_at'> & { id?: string }): LocalAccount {
    const accounts = this.getAccounts();
    const now = new Date().toISOString();
    let target = accounts.find((a) => (acc.id && a.id === acc.id) || a.account_mask === acc.account_mask);

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

    if (this.isBrowser()) {
      localStorage.setItem(this.ACC_KEY, JSON.stringify(accounts));
    }
    return target;
  }

  // --- TRANSACTIONS ---
  public static getTransactions(): LocalTransaction[] {
    if (!this.isBrowser()) return [];
    try {
      const raw = localStorage.getItem(this.TXN_KEY);
      const txns: LocalTransaction[] = raw ? JSON.parse(raw) : [];
      return txns.filter((t) => !t.is_deleted);
    } catch {
      return [];
    }
  }

  public static saveTransaction(txn: LocalTransaction) {
    if (!this.isBrowser()) return;
    const txns = this.getTransactions();
    const idx = txns.findIndex((t) => t.id === txn.id);
    if (idx >= 0) {
      txns[idx] = txn;
    } else {
      txns.unshift(txn);
    }
    localStorage.setItem(this.TXN_KEY, JSON.stringify(txns));
  }

  // --- INGESTION & PIPELINE ---
  public static ingestMessage(rawText: string, sender: string): {
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

    // L2: Exact raw text match or amount + type + account match
    if (!isDuplicate && !isFused) {
      const exactMatch = existingTxns.find((t) => {
        if (t.raw_text.trim() === rawText.trim()) return true;
        if (t.amount === parsed.amount && t.type === parsed.type && t.account_mask === parsed.accountMask) {
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

    // Find or create account
    let accountId: string | null = null;
    let accountMask = parsed.accountMask;
    let bankName = parsed.bankName || 'Bank';

    if (accountMask) {
      let acc = accounts.find((a) => a.account_mask.toLowerCase() === accountMask!.toLowerCase());
      if (!acc) {
        acc = this.saveAccount({
          bank_name: bankName,
          account_mask: accountMask,
          balance: parsed.balanceAfter ?? null,
          balance_updated_at: parsed.balanceAfter !== null && parsed.balanceAfter !== undefined ? now : null,
        });
      } else if (parsed.balanceAfter !== null && parsed.balanceAfter !== undefined) {
        acc.balance = parsed.balanceAfter;
        acc.balance_updated_at = now;
        this.saveAccount(acc);
      }
      accountId = acc.id;
    }

    if (isFused && targetTxn) {
      targetTxn.merchant = targetTxn.merchant || parsed.merchant;
      targetTxn.source = 'UPI + Bank SMS';
      targetTxn.balance_after = parsed.balanceAfter ?? targetTxn.balance_after;
      targetTxn.parser_confidence = Math.min(1.0, (targetTxn.parser_confidence + parsed.confidence) / 2 + 0.1);
      targetTxn.updated_at = now;
      if (accountId && !targetTxn.account_id) {
        targetTxn.account_id = accountId;
        targetTxn.account_mask = accountMask;
        targetTxn.bank_name = bankName;
      }
      localStorage.setItem(this.TXN_KEY, JSON.stringify(existingTxns));
      return { success: true, action: 'FUSED', transaction: targetTxn };
    }

    const category = categorizeTransaction(parsed.merchant, parsed.normalizedText);
    const fingerprint = (parsed.refId || `${parsed.amount}_${parsed.type}_${Date.now()}`);

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
      transaction_at: parsed.transactionAt ? new Date(parsed.transactionAt).toISOString() : now,
      ingested_at: now,
      fingerprint,
      is_internal_transfer: 0,
      is_deleted: 0,
      created_at: now,
      updated_at: now,
      bank_name: bankName,
      account_mask: accountMask,
    };

    existingTxns.unshift(newTxn);
    localStorage.setItem(this.TXN_KEY, JSON.stringify(existingTxns));

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
      const res = this.ingestMessage(msg.body, msg.address || 'SMS');
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
  public static getAnalytics() {
    const transactions = this.getTransactions();
    const accounts = this.getAccounts();
    const categories = this.getCategories();
    const settings = this.getSettings();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let totalMonthSpend = 0;
    let totalMonthIncome = 0;
    const categoryTotals: Record<string, number> = {};

    for (const t of transactions) {
      const tDate = new Date(t.transaction_at || t.ingested_at);
      if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
        if (t.type === 'DEBIT') {
          totalMonthSpend += t.amount;
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        } else if (t.type === 'REFUND') {
          totalMonthSpend = Math.max(0, totalMonthSpend - t.amount);
          categoryTotals[t.category] = Math.max(0, (categoryTotals[t.category] || 0) - t.amount);
        } else if (t.type === 'CREDIT') {
          totalMonthIncome += t.amount;
        }
      }
    }

    const totalBankBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
    const monthlyBudget = settings.monthly_budget_total || 30000;
    const remainingBudget = Math.max(0, monthlyBudget - totalMonthSpend);

    return {
      totalMonthSpend,
      totalMonthIncome,
      netSavings: totalMonthIncome - totalMonthSpend,
      totalBankBalance,
      monthlyBudget,
      remainingBudget,
      categorySpend: Object.entries(categoryTotals).map(([name, amount]) => ({
        name,
        amount,
        percentage: totalMonthSpend > 0 ? Math.round((amount / totalMonthSpend) * 100) : 0,
      })),
      accounts,
      recentTransactions: transactions.slice(0, 15),
    };
  }

  // --- SETTINGS & CATEGORIES ---
  public static getCategories(): LocalCategory[] {
    if (!this.isBrowser()) return [];
    try {
      const raw = localStorage.getItem(this.CAT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static getSettings(): LocalSettings {
    if (!this.isBrowser()) {
      return {
        id: 'settings_default',
        api_key: 'default_key',
        monthly_budget_total: 35000,
        is_onboarded: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    try {
      const raw = localStorage.getItem(this.SET_KEY);
      return raw ? JSON.parse(raw) : {
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
    if (this.isBrowser()) {
      localStorage.setItem(this.SET_KEY, JSON.stringify(updated));
    }
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

  public static importDataJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.accounts && Array.isArray(parsed.accounts)) {
        localStorage.setItem(this.ACC_KEY, JSON.stringify(parsed.accounts));
      }
      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        localStorage.setItem(this.TXN_KEY, JSON.stringify(parsed.transactions));
      }
      if (parsed.categories && Array.isArray(parsed.categories)) {
        localStorage.setItem(this.CAT_KEY, JSON.stringify(parsed.categories));
      }
      if (parsed.settings) {
        localStorage.setItem(this.SET_KEY, JSON.stringify(parsed.settings));
      }
      return true;
    } catch {
      return false;
    }
  }
}
