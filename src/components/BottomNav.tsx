'use client';

import React from 'react';
import { LayoutDashboard, ReceiptText, BarChart3, Smartphone } from 'lucide-react';
import clsx from 'clsx';

export type TabType = 'home' | 'transactions' | 'analytics' | 'sync';

interface BottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  needsReviewCount?: number;
}

export function BottomNav({ currentTab, onTabChange, needsReviewCount = 0 }: BottomNavProps) {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: LayoutDashboard },
    {
      id: 'transactions' as TabType,
      label: 'Transactions',
      icon: ReceiptText,
      badge: needsReviewCount > 0 ? needsReviewCount : undefined,
    },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
    { id: 'sync' as TabType, label: 'Sync & Test', icon: Smartphone },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800">
      <div className="max-w-md mx-auto flex items-center justify-around py-2 px-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'flex flex-col items-center justify-center flex-1 py-1 relative transition-colors',
                isActive ? 'text-emerald-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <div className="relative">
                <Icon className={clsx('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-zinc-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
