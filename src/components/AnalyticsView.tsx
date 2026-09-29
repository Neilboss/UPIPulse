'use client';

import React from 'react';
import { Download, PieChart, TrendingUp, Store } from 'lucide-react';

interface AnalyticsViewProps {
  analytics: any;
}

export function AnalyticsView({ analytics }: AnalyticsViewProps) {
  const formatCurrency = (amt: number | null | undefined) => {
    if (amt === null || amt === undefined) return '₹0';
    return '₹' + amt.toLocaleString('en-IN');
  };

  const handleExport = (format: 'csv' | 'json') => {
    window.location.href = `/api/export?format=${format}`;
  };

  const currentSpend = analytics?.currentMonthSpend || 0;
  const categories = analytics?.categoryBreakdown || [];
  const dailySpend = analytics?.dailySpend || [];
  const topMerchants = analytics?.topMerchants || [];

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-xl font-bold tracking-tight text-white">Spend Analytics</h1>
        <p className="text-xs text-zinc-400">Current month spending insights and trends</p>
      </div>

      {/* Spend Summary Card */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
          <span>Monthly Spend</span>
          <span>{analytics?.budgetUsedPercent || 0}% of budget</span>
        </div>
        <p className="text-2xl font-extrabold text-white">{formatCurrency(currentSpend)}</p>
        <div className="w-full h-2 bg-zinc-800 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              analytics?.budgetUsedPercent > 90
                ? 'bg-rose-500'
                : analytics?.budgetUsedPercent > 70
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, analytics?.budgetUsedPercent || 0)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-zinc-400 mt-2">
          <span>Budget: {formatCurrency(analytics?.monthlyBudget)}</span>
          <span>Remaining: {formatCurrency(analytics?.remainingBudget)}</span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-1.5 mb-3">
          <PieChart className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Category Breakdown
          </h2>
        </div>

        {categories.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3 text-center">No categorized expenses this month.</p>
        ) : (
          <div className="space-y-2.5">
            {categories.map((cat: any) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-zinc-200 font-medium">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-100 font-mono font-semibold">{formatCurrency(cat.amount)}</span>
                    <span className="text-zinc-500 ml-1.5 text-[11px]">({cat.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, cat.percentage)}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Spend Histogram (Last 14 Days) */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Daily Spend (Last 14 Days)
          </h2>
        </div>

        {dailySpend.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3 text-center">No daily spend records yet.</p>
        ) : (
          <div className="space-y-1.5 pt-1">
            {dailySpend.map((d: any) => {
              const maxDay = Math.max(...dailySpend.map((x: any) => x.amount), 1);
              const widthPct = Math.round((d.amount / maxDay) * 100);

              return (
                <div key={d.day} className="flex items-center gap-2 text-xs">
                  <span className="w-16 font-mono text-[10px] text-zinc-400 shrink-0">{d.day.slice(5)}</span>
                  <div className="flex-1 h-3.5 bg-zinc-800/80 rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/80 rounded transition-all duration-300"
                      style={{ width: `${Math.max(4, widthPct)}%` }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono text-[11px] text-zinc-200 shrink-0">
                    {formatCurrency(d.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Merchants */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-1.5 mb-3">
          <Store className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Top Spenders This Month
          </h2>
        </div>

        {topMerchants.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3 text-center">No merchant data yet.</p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {topMerchants.map((m: any, idx: number) => (
              <div key={m.merchant} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-mono text-zinc-500 w-4">{idx + 1}.</span>
                  <div className="min-w-0">
                    <p className="text-zinc-200 font-semibold truncate">{m.merchant}</p>
                    <p className="text-[10px] text-zinc-500">{m.category} • {m.count} txns</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-zinc-100 shrink-0 ml-2">
                  {formatCurrency(m.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Export / Backup Section */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl space-y-2">
        <h3 className="text-xs font-semibold text-zinc-300">Data Export & Backup</h3>
        <p className="text-[11px] text-zinc-400">
          Download your complete financial records directly to your device (no cloud dependencies).
        </p>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => handleExport('csv')}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-zinc-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-zinc-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
