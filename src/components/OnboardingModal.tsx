'use client';

import React, { useState } from 'react';
import { Building2, Wallet, Target, Sparkles, Check, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [bankName, setBankName] = useState('HDFC Bank');
  const [customBank, setCustomBank] = useState('');
  const [accountMask, setAccountMask] = useState('');
  const [balance, setBalance] = useState<string>('5000');
  const [monthlyBudget, setMonthlyBudget] = useState<string>('5000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const popularBanks = ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numBalance = parseFloat(balance);
    const numBudget = parseFloat(monthlyBudget);

    if (isNaN(numBalance) || numBalance < 0) {
      setError('Please enter a valid starting balance (e.g. 4000)');
      return;
    }

    if (isNaN(numBudget) || numBudget <= 0) {
      setError('Please enter a valid monthly budget limit (e.g. 5000)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const chosenBank = bankName === 'Other' ? (customBank.trim() || 'My Bank') : bankName;
    const cleanMask = accountMask.trim() ? (accountMask.startsWith('XX') ? accountMask : `XX${accountMask}`) : 'XX1234';

    try {
      // 1. Create initial bank account
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: chosenBank,
          accountMask: cleanMask,
          balance: numBalance,
        }),
      });

      // 2. Set monthly budget and mark onboarded
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyBudgetTotal: numBudget,
          isOnboarded: true,
        }),
      });

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-1">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Welcome to UPIPulse</h2>
          <p className="text-xs text-zinc-400">
            Let&apos;s set your starting bank balance and budget so you know exactly how much is safe to spend.
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Primary Bank Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Primary Bank Name
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {popularBanks.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBankName(b)}
                  className={`py-1.5 px-2 text-[11px] rounded-lg border font-medium transition-colors text-center truncate ${
                    bankName === b
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            {bankName === 'Other' && (
              <input
                type="text"
                placeholder="Enter bank name (e.g. Canara Bank, Federal Bank)"
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            )}
          </div>

          {/* Account Last 4 Digits */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Account Last 4 Digits (Optional)
              </label>
              <span className="text-[10px] text-zinc-500">Matches bank SMS alerts</span>
            </div>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 4321 (or XX4321)"
              value={accountMask}
              onChange={(e) => setAccountMask(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 2. Initial Bank Balance */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              Current Available Bank Balance (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="4000"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2.5 text-base font-bold text-emerald-400 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-[10px] text-zinc-500">
              Future bank messages will automatically keep this balance synchronized.
            </p>
          </div>

          {/* 3. Monthly Spending Budget */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              Monthly Spending Target (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="100"
                step="any"
                required
                placeholder="5000"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm font-semibold text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2 pt-0.5">
              {[5000, 10000, 20000, 35000].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setMonthlyBudget(preset.toString())}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono transition-colors"
                >
                  ₹{preset.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-zinc-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            {isSubmitting ? (
              <span>Saving setup...</span>
            ) : (
              <>
                <span>Start Tracking My Expenses</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
