'use client';

import React, { useState } from 'react';
import { X, Building2, Wallet, Plus, Check } from 'lucide-react';

interface ManageAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: any[];
  onSuccess: () => void;
}

export function ManageAccountsModal({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}: ManageAccountsModalProps) {
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountMask, setAccountMask] = useState('');
  const [balance, setBalance] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const startEdit = (acc: any) => {
    setEditingAccountId(acc.id);
    setBankName(acc.bank_name);
    setAccountMask(acc.account_mask);
    setBalance(acc.balance?.toString() || '0');
  };

  const resetForm = () => {
    setEditingAccountId(null);
    setBankName('HDFC Bank');
    setAccountMask('');
    setBalance('');
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance) || numBalance < 0) {
      setError('Please enter a valid balance');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const cleanMask = accountMask.trim() ? (accountMask.startsWith('XX') ? accountMask : `XX${accountMask}`) : 'XX1234';

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAccountId || undefined,
          bankName: bankName.trim() || 'Primary Bank',
          accountMask: cleanMask,
          balance: numBalance,
        }),
      });

      if (!res.ok) throw new Error('Failed to update account');

      onSuccess();
      resetForm();
      if (editingAccountId) onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Manage Accounts & Balances
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Existing Accounts List */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
            Current Bank Accounts
          </label>
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-zinc-950 border border-zinc-800/80 p-3 rounded-xl flex justify-between items-center"
              >
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">{acc.bank_name}</h4>
                  <p className="text-[11px] font-mono text-zinc-400">{acc.account_mask}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-400">
                    ₹{acc.balance !== null ? acc.balance.toLocaleString('en-IN') : 'N/A'}
                  </span>
                  <button
                    onClick={() => startEdit(acc)}
                    className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-1 rounded border border-zinc-700"
                  >
                    Edit Balance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add / Edit Form */}
        <form onSubmit={handleSave} className="bg-zinc-950/60 border border-zinc-800 p-3.5 rounded-xl space-y-3">
          <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{editingAccountId ? 'Update Account Balance' : 'Add Another Account'}</span>
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-mono text-zinc-400">Bank Name</label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. SBI, HDFC, ICICI"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono text-zinc-400">Last 4 Digits</label>
              <input
                type="text"
                value={accountMask}
                onChange={(e) => setAccountMask(e.target.value)}
                placeholder="e.g. 1234 or XX1234"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-mono text-zinc-400">Available Balance (₹)</label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="e.g. 4000"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-400"
            />
          </div>

          <div className="flex gap-2 pt-1">
            {editingAccountId && (
              <button
                type="button"
                onClick={resetForm}
                className="py-1.5 px-3 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-zinc-950 flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingAccountId ? 'Update Balance' : 'Save Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
