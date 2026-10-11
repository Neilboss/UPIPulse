import React from 'react';
import { ArrowUpRight, ArrowDownLeft, AlertCircle, Building2, ChevronRight, Zap, Plus, AlertTriangle, ShieldCheck, Wallet, Calendar, Users, TrendingDown, Clock } from 'lucide-react';
import { TabType } from './BottomNav';
import { CashFlowForecast } from '../lib/forecast/cashFlowPredictor';

interface DashboardViewProps {
  analytics: any;
  accounts: any[];
  recentTransactions: any[];
  needsReviewCount: number;
  onNavigate: (tab: TabType, filter?: string) => void;
  onSelectTransaction: (txn: any) => void;
  onOpenAddExpense?: () => void;
  onOpenManageAccounts?: () => void;
  onOpenSubscriptions?: () => void;
  onOpenKhata?: () => void;
  onOpenLogin?: () => void;
  currentUser?: any;
  cashFlowForecast?: CashFlowForecast | null;
  subscriptionsCount?: number;
  khataSummary?: { totalToReceive: number; totalToPay: number } | null;
}

export function DashboardView({
  analytics,
  accounts,
  recentTransactions,
  needsReviewCount,
  onNavigate,
  onSelectTransaction,
  onOpenAddExpense,
  onOpenManageAccounts,
  onOpenSubscriptions,
  onOpenKhata,
  onOpenLogin,
  currentUser,
  cashFlowForecast,
  subscriptionsCount = 0,
  khataSummary,
}: DashboardViewProps) {
  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const formatCurrency = (amt: number | null | undefined) => {
    if (amt === null || amt === undefined) return '₹0';
    return '₹' + amt.toLocaleString('en-IN');
  };

  const formatTimestamp = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            UPIPulse
          </h1>
          <p className="text-xs text-zinc-400">{currentMonthName}</p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenLogin && (
            <button
              onClick={onOpenLogin}
              className="text-[11px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 px-2.5 py-1.5 rounded-full text-zinc-300 flex items-center gap-1.5 transition-colors"
              title="Account & Dummy Login"
            >
              <span className={`w-2 h-2 rounded-full ${currentUser?.isLoggedIn ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="font-mono max-w-[110px] truncate">
                {currentUser?.email ? currentUser.email.split('@')[0] : 'Sign In'}
              </span>
            </button>
          )}
          {onOpenAddExpense && (
            <button
              onClick={onOpenAddExpense}
              className="text-xs bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-zinc-950 font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-all shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('sync')}
            className="text-xs bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 p-2 rounded-full text-zinc-300 flex items-center transition-colors"
            title="Sync Status"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Needs Review Alert Banner */}
      {needsReviewCount > 0 && (
        <button
          onClick={() => onNavigate('transactions', 'needsReview')}
          className="w-full bg-amber-950/40 border border-amber-600/40 hover:border-amber-500/60 p-3 rounded-xl flex items-center justify-between transition-all text-left group"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-200">
                {needsReviewCount} {needsReviewCount === 1 ? 'Transaction Needs' : 'Transactions Need'} Review
              </p>
              <p className="text-[11px] text-amber-400/80">
                Low parser confidence or ambiguous fields. Tap to verify.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Hero Spending Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Total Month Spend
          </span>
          <span className="text-xs bg-zinc-800/90 text-zinc-300 px-2 py-0.5 rounded-md font-mono">
            {formatCurrency(analytics?.dailyAverageSpend)}/day avg
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(analytics?.currentMonthSpend)}
          </span>
        </div>

        {/* Budget Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Budget: {formatCurrency(analytics?.monthlyBudget)}</span>
            <span className={analytics?.budgetUsedPercent > 85 ? 'text-amber-400 font-semibold' : ''}>
              {analytics?.budgetUsedPercent || 0}% used
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                analytics?.budgetUsedPercent > 90
                  ? 'bg-rose-500'
                  : analytics?.budgetUsedPercent > 70
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, analytics?.budgetUsedPercent || 0)}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-400 text-right">
            Remaining: <span className="text-zinc-200 font-medium">{formatCurrency(analytics?.remainingBudget)}</span>
          </p>
        </div>

        {/* Safe-to-Spend & Balance-Aware Alert */}
        {analytics?.isBalanceConstrained ? (
          <div className="mt-3 p-3 rounded-xl bg-amber-950/40 border border-amber-600/50 space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-amber-200">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Safe to Spend: {formatCurrency(analytics?.safeSpendingLimit)}</span>
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                Balance Constrained
              </span>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Your remaining budget is {formatCurrency(analytics?.remainingBudget)}, but your total bank balance is {formatCurrency(analytics?.totalBankBalance)}. Keep spending below <strong className="text-amber-100">{formatCurrency(analytics?.safeSpendingLimit)}</strong> to avoid overdrawing your account.
            </p>
          </div>
        ) : analytics?.hasAccounts ? (
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safe to Spend (Balance Supported):</span>
            </span>
            <span className="text-emerald-400 font-bold font-mono">
              {formatCurrency(analytics?.safeSpendingLimit)}
            </span>
          </div>
        ) : null}
      </div>

      {/* Cash Flow Forecast Card */}
      {cashFlowForecast && (
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Cash Flow Forecast
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                cashFlowForecast.status === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : cashFlowForecast.status === 'MODERATE'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {cashFlowForecast.status === 'HEALTHY' ? 'Healthy Run-Rate' : cashFlowForecast.status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 border-y border-zinc-800/60 text-center">
            <div className="p-1.5">
              <span className="text-[10px] text-zinc-400 block">Daily Burn</span>
              <span className="text-sm font-bold text-white font-mono">
                {formatCurrency(cashFlowForecast.dailyBurnRate)}
              </span>
            </div>
            <div className="p-1.5 border-x border-zinc-800/60">
              <span className="text-[10px] text-zinc-400 block">Days Left</span>
              <span className="text-sm font-bold text-cyan-400 font-mono">
                {cashFlowForecast.daysRemainingInMonth}d
              </span>
            </div>
            <div className="p-1.5">
              <span className="text-[10px] text-zinc-400 block">Month-End Bal</span>
              <span
                className={`text-sm font-bold font-mono ${
                  cashFlowForecast.projectedMonthEndBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {formatCurrency(cashFlowForecast.projectedMonthEndBalance)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>{cashFlowForecast.statusMessage}</span>
            <span className="text-zinc-300 font-medium font-mono">
              Safe: {formatCurrency(cashFlowForecast.safeDailyBudget)}/d
            </span>
          </p>
        </div>
      )}

      {/* Quick Action Badges: Subscriptions & Khata */}
      <div className="grid grid-cols-2 gap-2.5">
        {onOpenSubscriptions && (
          <button
            onClick={onOpenSubscriptions}
            className="p-3 bg-zinc-900/90 border border-zinc-800/90 hover:border-indigo-500/50 rounded-xl flex items-center justify-between text-left group transition"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Subscriptions</span>
                <span className="text-[10px] text-zinc-400">{subscriptionsCount} active detected</span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 transition" />
          </button>
        )}

        {onOpenKhata && (
          <button
            onClick={onOpenKhata}
            className="p-3 bg-zinc-900/90 border border-zinc-800/90 hover:border-purple-500/50 rounded-xl flex items-center justify-between text-left group transition"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Khata / Split</span>
                <span className="text-[10px] text-zinc-400">
                  {khataSummary && khataSummary.totalToReceive > 0
                    ? `+₹${khataSummary.totalToReceive.toLocaleString('en-IN')}`
                    : 'Track debts'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-purple-400 transition" />
          </button>
        )}
      </div>

      {/* Last Reported Account Balances */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Last Reported Balances
          </h2>
          {onOpenManageAccounts && (
            <button
              onClick={onOpenManageAccounts}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
            >
              <Wallet className="w-3 h-3" />
              <span>Manage / Edit Balance</span>
            </button>
          )}
        </div>

        {accounts.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl text-center">
            <Building2 className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
            <p className="text-xs text-zinc-400">No bank accounts detected yet.</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Paste or sync a bank SMS, or enter your starting balance manually.
            </p>
            {onOpenManageAccounts && (
              <button
                onClick={onOpenManageAccounts}
                className="mt-2.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Set Starting Bank Balance</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-200">{acc.bank_name}</h3>
                    <span className="text-[11px] font-mono text-zinc-400">{acc.account_mask}</span>
                  </div>
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                    Account
                  </span>
                </div>

                <div className="mt-2.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
                    Last Reported Balance
                  </span>
                  <span className="text-lg font-bold text-emerald-400">
                    {acc.balance !== null ? formatCurrency(acc.balance) : 'Not Reported'}
                  </span>
                </div>

                {acc.balance_updated_at && (
                  <p className="text-[10px] text-zinc-400 mt-1 border-t border-zinc-800/60 pt-1">
                    Updated from bank message · {formatTimestamp(acc.balance_updated_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Recent Transactions
          </h2>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center"
          >
            View all
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800/60 p-6 rounded-xl text-center">
            <p className="text-xs text-zinc-400">No transactions recorded yet.</p>
            <button
              onClick={() => onNavigate('sync')}
              className="mt-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Open Test Bench to paste an SMS
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentTransactions.slice(0, 5).map((txn) => {
              const isDebit = txn.type === 'DEBIT';
              const isRefund = txn.type === 'REFUND';

              return (
                <div
                  key={txn.id}
                  onClick={() => onSelectTransaction(txn)}
                  className="bg-zinc-900/70 hover:bg-zinc-800/60 border border-zinc-800/80 p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isRefund
                          ? 'bg-purple-950/60 text-purple-400 border border-purple-800/40'
                          : isDebit
                          ? 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                          : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                      }`}
                    >
                      {isDebit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-zinc-200 truncate">
                          {txn.merchant || 'Unknown Merchant'}
                        </p>
                        {txn.parser_status === 'NEEDS_REVIEW' && (
                          <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-800/60 px-1 py-0.2 rounded font-medium">
                            Review
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                        <span>{txn.category}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-zinc-400">
                          {txn.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold font-mono ${
                        isRefund
                          ? 'text-purple-400'
                          : isDebit
                          ? 'text-zinc-100'
                          : 'text-emerald-400'
                      }`}
                    >
                      {isDebit ? `- ${formatCurrency(txn.amount)}` : `+ ${formatCurrency(txn.amount)}`}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {formatTimestamp(txn.transaction_at || txn.ingested_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
