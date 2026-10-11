'use client';

import React, { useState } from 'react';
import { X, PlusCircle, ArrowDownLeft, ArrowUpRight, RefreshCw, Check, Tag, Building2, Calendar } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: any[];
  onSuccess: () => void;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}: AddExpenseModalProps) {
  const [type, setType] = useState<'DEBIT' | 'CREDIT' | 'TRANSFER'>('DEBIT');
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [category, setCategory] = useState<string>('Food');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [transactionAt, setTransactionAt] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ['Food', 'Travel', 'Shopping', 'Utilities', 'Investment', 'P2P', 'Other'];

  const quickSuggestions = [
    { label: 'Chai / Coffee', cat: 'Food' },
    { label: 'Swiggy / Zomato', cat: 'Food' },
    { label: 'Auto / Cab', cat: 'Travel' },
    { label: 'Grocery / Kirana', cat: 'Shopping' },
    { label: 'Cash Payment', cat: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    if (!merchant.trim()) {
      setError('Please enter payee / merchant or description');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          type,
          merchant: merchant.trim(),
          category,
          accountId: selectedAccountId || null,
          transactionAt: new Date(transactionAt).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save transaction');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              type === 'DEBIT' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {type === 'DEBIT' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {type === 'DEBIT' ? 'Add Expense' : type === 'CREDIT' ? 'Add Income' : 'Add Transfer'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector Tabs */}
          <div className="grid grid-cols-3 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setType('DEBIT')}
              className={`py-1.5 rounded-lg transition-colors ${
                type === 'DEBIT' ? 'bg-rose-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('CREDIT')}
              className={`py-1.5 rounded-lg transition-colors ${
                type === 'CREDIT' ? 'bg-emerald-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType('TRANSFER')}
              className={`py-1.5 rounded-lg transition-colors ${
                type === 'TRANSFER' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Transfer
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-zinc-400 font-bold text-lg">₹</span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-xl font-extrabold text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Merchant / Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
              {type === 'DEBIT' ? 'Paid To / Merchant' : 'Received From / Description'}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Swiggy, Chai Stall, Local Supermarket"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {quickSuggestions.map((s) => (
                <button
                  type="button"
                  key={s.label}
                  onClick={() => {
                    setMerchant(s.label);
                    setCategory(s.cat);
                  }}
                  className="px-2 py-0.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 rounded-full text-[10px] text-zinc-300 transition-colors"
                >
                  + {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1">
              <Tag className="w-3 h-3 text-emerald-400" />
              Category
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`py-1.5 px-2 text-[11px] rounded-lg border font-medium transition-colors text-center truncate ${
                    category === c
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Account Selector */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-emerald-400" />
              Account (Syncs Balance)
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">None / Untracked Cash</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} ({acc.account_mask}) — Balance: ₹{acc.balance?.toLocaleString('en-IN') ?? 'N/A'}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={transactionAt}
              onChange={(e) => setTransactionAt(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg ${
              type === 'DEBIT'
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                : 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-emerald-500/20'
            }`}
          >
            {isSubmitting ? (
              <span>Saving Transaction...</span>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Save {type === 'DEBIT' ? 'Expense' : type === 'CREDIT' ? 'Income' : 'Transfer'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
