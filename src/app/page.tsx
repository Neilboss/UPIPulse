'use client';

import React, { useState, useEffect } from 'react';
import { BottomNav, TabType } from '../components/BottomNav';
import { DashboardView } from '../components/DashboardView';
import { TransactionsView } from '../components/TransactionsView';
import { AnalyticsView } from '../components/AnalyticsView';
import { SyncView } from '../components/SyncView';

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [initialTxnFilter, setInitialTxnFilter] = useState<string | undefined>(undefined);

  const [analytics, setAnalytics] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [needsReviewCount, setNeedsReviewCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [analyticsRes, accountsRes, txnsRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/accounts'),
        fetch('/api/transactions?limit=100'),
      ]);

      const [analyticsData, accountsData, txnsData] = await Promise.all([
        analyticsRes.json(),
        accountsRes.json(),
        txnsRes.json(),
      ]);

      setAnalytics(analyticsData);
      setAccounts(accountsData.accounts || []);
      setTransactions(txnsData.transactions || []);
      setNeedsReviewCount(txnsData.needsReviewCount || 0);
    } catch (err) {
      console.error('Failed to load UPIPulse data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNavigate = (tab: TabType, filter?: string) => {
    setCurrentTab(tab);
    if (tab === 'transactions' && filter) {
      setInitialTxnFilter(filter);
    }
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
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              needsReviewCount={needsReviewCount}
              initialFilter={initialTxnFilter}
              onRefresh={loadData}
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
