'use client';

import React, { useState, useEffect } from 'react';
import { BottomNav, TabType } from '../components/BottomNav';
import { DashboardView } from '../components/DashboardView';
import { TransactionsView } from '../components/TransactionsView';
import { AnalyticsView } from '../components/AnalyticsView';
import { SyncView } from '../components/SyncView';
import { OnboardingModal } from '../components/OnboardingModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { ManageAccountsModal } from '../components/ManageAccountsModal';
import { SubscriptionsModal } from '../components/SubscriptionsModal';
import { KhataModal } from '../components/KhataModal';
import { LocalFinanceService } from '../lib/services/localFinanceService';
import { SmsBridge } from '../lib/services/smsBridge';
import { calculateCashFlowForecast, CashFlowForecast } from '../lib/forecast/cashFlowPredictor';
import { detectSubscriptions, SubscriptionItem } from '../lib/detector/subscriptions';
import { KhataManager } from '../lib/people/khataTracker';

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [initialTxnFilter, setInitialTxnFilter] = useState<string | undefined>(undefined);

  const [analytics, setAnalytics] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [needsReviewCount, setNeedsReviewCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // New smart feature states
  const [cashFlowForecast, setCashFlowForecast] = useState<CashFlowForecast | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [khataSummary, setKhataSummary] = useState<{ totalToReceive: number; totalToPay: number } | null>(null);

  // Modals state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [showKhata, setShowKhata] = useState(false);
  const [khataPrefill, setKhataPrefill] = useState<any>(null);

  const loadData = async (checkOnboarding = false) => {
    LocalFinanceService.initDefaults();

    let loadedAccounts: any[] = [];
    let loadedTxns: any[] = [];
    let loadedAnalytics: any = null;
    let isOnboarded = false;

    // Try fetching from server API first
    try {
      const [analyticsRes, accountsRes, txnsRes, settingsRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/accounts'),
        fetch('/api/transactions?limit=100'),
        fetch('/api/settings'),
      ]);

      if (analyticsRes.ok && accountsRes.ok && txnsRes.ok && settingsRes.ok) {
        const [analyticsData, accountsData, txnsData, settingsData] = await Promise.all([
          analyticsRes.json(),
          accountsRes.json(),
          txnsRes.json(),
          settingsRes.json(),
        ]);

        loadedAccounts = accountsData.accounts || [];
        loadedTxns = txnsData.transactions || [];
        loadedAnalytics = analyticsData;
        isOnboarded = settingsData.isOnboarded;
      }
    } catch {
      // Offline mode or running natively without server
    }

    // Blend / Fallback to local on-device store if native or if local has data
    const localTxns = LocalFinanceService.getTransactions();
    const localAccs = LocalFinanceService.getAccounts();

    if (localTxns.length > 0 || loadedTxns.length === 0) {
      // Merge unique by ID
      const txnMap = new Map();
      [...loadedTxns, ...localTxns].forEach((t) => txnMap.set(t.id, t));
      loadedTxns = Array.from(txnMap.values()).sort((a, b) => {
        const dateA = new Date(a.transaction_at || a.ingested_at).getTime();
        const dateB = new Date(b.transaction_at || b.ingested_at).getTime();
        return dateB - dateA;
      });

      const accMap = new Map();
      [...loadedAccounts, ...localAccs].forEach((a) => accMap.set(a.id || a.account_mask, a));
      loadedAccounts = Array.from(accMap.values());

      if (!loadedAnalytics) {
        loadedAnalytics = LocalFinanceService.getAnalytics();
      }
    }

    setAccounts(loadedAccounts);
    setTransactions(loadedTxns);
    setAnalytics(loadedAnalytics);

    const reviewCount = loadedTxns.filter((t) => t.parser_status === 'NEEDS_REVIEW').length;
    setNeedsReviewCount(reviewCount);

    // Compute Cash Flow Forecast
    const forecast = calculateCashFlowForecast(
      loadedAccounts,
      loadedTxns,
      loadedAnalytics?.monthlyBudget || 30000
    );
    setCashFlowForecast(forecast);

    // Compute Subscriptions & Bills
    const detectedSubs = detectSubscriptions(loadedTxns);
    setSubscriptions(detectedSubs);

    // Compute Khata Summary
    const khata = KhataManager.getPeopleSummary();
    setKhataSummary({ totalToReceive: khata.totalToReceive, totalToPay: khata.totalToPay });

    // Check onboarding
    if (checkOnboarding && !isOnboarded && loadedAccounts.length === 0 && localAccs.length === 0) {
      setShowOnboarding(true);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData(true);

    // Register live background SMS listener
    SmsBridge.registerIncomingSmsListener((msg) => {
      LocalFinanceService.ingestMessage(msg.body, msg.address);
      loadData(false);
    });
  }, []);

  const handleNavigate = (tab: TabType, filter?: string) => {
    setCurrentTab(tab);
    if (tab === 'transactions' && filter) {
      setInitialTxnFilter(filter);
    }
  };

  const handleSplitToKhata = (txn: any) => {
    setKhataPrefill({
      personName: '',
      amount: Math.round(txn.amount / 2),
      note: `${txn.merchant || 'Expense'} Split`,
      transactionId: txn.id,
    });
    setShowKhata(true);
  };

  return (
    <div className="flex-1 flex flex-col">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-xs text-zinc-400 font-mono">Loading UPIPulse...</p>
          </div>
        </div>
      ) : (
        <>
          {currentTab === 'home' && (
            <DashboardView
              analytics={analytics}
              accounts={accounts}
              recentTransactions={transactions}
              needsReviewCount={needsReviewCount}
              onNavigate={handleNavigate}
              onSelectTransaction={(_txn) => {
                handleNavigate('transactions');
              }}
              onOpenAddExpense={() => setShowAddExpense(true)}
              onOpenManageAccounts={() => setShowManageAccounts(true)}
              onOpenSubscriptions={() => setShowSubscriptions(true)}
              onOpenKhata={() => {
                setKhataPrefill(null);
                setShowKhata(true);
              }}
              cashFlowForecast={cashFlowForecast}
              subscriptionsCount={subscriptions.length}
              khataSummary={khataSummary}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              needsReviewCount={needsReviewCount}
              initialFilter={initialTxnFilter}
              onRefresh={loadData}
              onOpenAddExpense={() => setShowAddExpense(true)}
              onSplitToKhata={handleSplitToKhata}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView analytics={analytics} />
          )}

          {currentTab === 'sync' && (
            <SyncView onRefreshData={loadData} />
          )}
        </>
      )}

      {/* Onboarding Modal for First-Time Users */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          loadData(false);
        }}
      />

      {/* Manual Expense / Transaction Entry Modal */}
      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        accounts={accounts}
        onSuccess={() => loadData(false)}
      />

      {/* Manage Bank Accounts & Balances Modal */}
      <ManageAccountsModal
        isOpen={showManageAccounts}
        onClose={() => setShowManageAccounts(false)}
        accounts={accounts}
        onSuccess={() => loadData(false)}
      />

      {/* Subscriptions & Bills Modal */}
      <SubscriptionsModal
        isOpen={showSubscriptions}
        onClose={() => setShowSubscriptions(false)}
        subscriptions={subscriptions}
      />

      {/* Khata People Ledger Modal */}
      <KhataModal
        isOpen={showKhata}
        onClose={() => {
          setShowKhata(false);
          setKhataPrefill(null);
          loadData(false);
        }}
        prefill={khataPrefill}
      />

      {/* Persistent Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => {
          setInitialTxnFilter(undefined);
          setCurrentTab(tab);
        }}
        needsReviewCount={needsReviewCount}
      />
    </div>
  );
}
