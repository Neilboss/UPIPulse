'use client';

import React, { useState } from 'react';
import { Search, Filter, AlertCircle, ArrowUpRight, ArrowDownLeft, X, Trash2, Check, FileText } from 'lucide-react';

interface TransactionsViewProps {
  transactions: any[];
  needsReviewCount: number;
  initialFilter?: string;
  onRefresh: () => void;
}

export function TransactionsView({
  transactions,
  needsReviewCount,
  initialFilter,
  onRefresh,
}: TransactionsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>(initialFilter === 'needsReview' ? 'needsReview' : 'All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeModalTxn, setActiveModalTxn] = useState<any | null>(null);
  const [showRawMsg, setShowRawMsg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for activeModalTxn
  const [editMerchant, setEditMerchant] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editInternal, setEditInternal] = useState(0);

  const openEditModal = (txn: any) => {
    setActiveModalTxn(txn);
    setEditMerchant(txn.merchant || '');
    setEditCategory(txn.category || 'Other');
    setEditType(txn.type || 'DEBIT');
    setEditAmount(txn.amount || 0);
    setEditInternal(txn.is_internal_transfer || 0);
    setShowRawMsg(false);
  };

  const handleSaveModal = async () => {
    if (!activeModalTxn) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/transactions/${activeModalTxn.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: editMerchant,
          category: editCategory,
          type: editType,
          amount: editAmount,
          is_internal_transfer: editInternal,
        }),
      });
      if (res.ok) {
        setActiveModalTxn(null);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteModal = async () => {
    if (!activeModalTxn) return;
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/transactions/${activeModalTxn.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActiveModalTxn(null);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const categories = ['All', 'Food', 'Travel', 'Shopping', 'Utilities', 'Investment', 'P2P', 'Other'];

  // Filter transactions in memory
  const filtered = transactions.filter((t) => {
    if (selectedType === 'needsReview' && t.parser_status !== 'NEEDS_REVIEW') return false;
    if (selectedType === 'DEBIT' && t.type !== 'DEBIT') return false;
    if (selectedType === 'CREDIT' && t.type !== 'CREDIT') return false;
    if (selectedType === 'REFUND' && t.type !== 'REFUND') return false;
    if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;

    if (search.trim()) {
      const s = search.toLowerCase();
      const matchMerchant = (t.merchant || '').toLowerCase().includes(s);
      const matchRef = (t.ref_id || '').toLowerCase().includes(s);
      const matchRaw = (t.raw_text || '').toLowerCase().includes(s);
      if (!matchMerchant && !matchRef && !matchRaw) return false;
    }

    return true;
  });

  const formatCurrency = (amt: number | null | undefined) => {
    if (amt === null || amt === undefined) return '₹0';
    return '₹' + amt.toLocaleString('en-IN');
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-3 pb-6">
      {/* Header & Search */}
      <div className="pt-1">
        <h1 className="text-xl font-bold tracking-tight text-white mb-2">Transactions</h1>
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by merchant, UTR, or bank..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80 transition-colors"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setSelectedType('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            selectedType === 'All'
              ? 'bg-zinc-100 text-zinc-950 font-semibold'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All
        </button>

        <button
          onClick={() => setSelectedType('needsReview')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            selectedType === 'needsReview'
              ? 'bg-amber-500 text-zinc-950 font-semibold'
              : 'bg-zinc-900 border border-zinc-800 text-amber-400 hover:bg-zinc-800'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Needs Review ({needsReviewCount})</span>
        </button>

        <button
          onClick={() => setSelectedType('DEBIT')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            selectedType === 'DEBIT'
              ? 'bg-rose-500 text-white font-semibold'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Expenses
        </button>

        <button
          onClick={() => setSelectedType('CREDIT')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            selectedType === 'CREDIT'
              ? 'bg-emerald-500 text-zinc-950 font-semibold'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Income
        </button>

        <button
          onClick={() => setSelectedType('REFUND')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            selectedType === 'REFUND'
              ? 'bg-purple-500 text-white font-semibold'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Refunds
        </button>
      </div>

      {/* Category Sub-Filters */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 text-[11px]">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              selectedCategory === cat
                ? 'bg-zinc-800 text-emerald-400 font-medium'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800/60 p-8 rounded-xl text-center">
            <p className="text-xs text-zinc-400">No transactions match your filters.</p>
          </div>
        ) : (
          filtered.map((txn) => {
            const isDebit = txn.type === 'DEBIT';
            const isRefund = txn.type === 'REFUND';

            return (
              <div
                key={txn.id}
                onClick={() => openEditModal(txn)}
                className="bg-zinc-900/80 hover:bg-zinc-800/70 border border-zinc-800/80 p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
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
                        <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800/80 px-1.5 py-0.2 rounded font-medium">
                          Review
                        </span>
                      )}
                      {txn.is_internal_transfer === 1 && (
                        <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-800/80 px-1 py-0.2 rounded font-medium">
                          Transfer
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                      <span>{txn.category}</span>
                      <span>•</span>
                      <span>{txn.account_mask || txn.bank_name || 'Bank'}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-zinc-400">{txn.source}</span>
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
                    {formatTime(txn.transaction_at || txn.ingested_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit / Details Modal */}
      {activeModalTxn && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
              <h2 className="text-sm font-bold text-white">Transaction Details</h2>
              <button
                onClick={() => setActiveModalTxn(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Alert if Needs Review */}
            {activeModalTxn.parser_status === 'NEEDS_REVIEW' && (
              <div className="bg-amber-950/40 border border-amber-700/50 p-2.5 rounded-lg flex items-start gap-2 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Confidence: {Math.round(activeModalTxn.parser_confidence * 100)}%</span>
                  <p className="text-[11px] text-amber-400/90 mt-0.5">
                    Please verify or edit the merchant name and category below.
                  </p>
                </div>
              </div>
            )}

            {/* Editable Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Merchant / Payee</label>
                <input
                  type="text"
                  value={editMerchant}
                  onChange={(e) => setEditMerchant(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-100 font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="DEBIT">DEBIT (Expense)</option>
                    <option value="CREDIT">CREDIT (Income)</option>
                    <option value="REFUND">REFUND</option>
                    <option value="INTERNAL_TRANSFER">INTERNAL TRANSFER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-100 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Read-only audit details */}
              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 space-y-1 text-[11px] text-zinc-400">
                <div className="flex justify-between">
                  <span>Source:</span>
                  <span className="text-zinc-200 font-mono">{activeModalTxn.source}</span>
                </div>
                {activeModalTxn.ref_id && (
                  <div className="flex justify-between">
                    <span>Reference / UTR:</span>
                    <span className="text-zinc-200 font-mono">{activeModalTxn.ref_id}</span>
                  </div>
                )}
                {activeModalTxn.account_mask && (
                  <div className="flex justify-between">
                    <span>Account:</span>
                    <span className="text-zinc-200 font-mono">{activeModalTxn.account_mask}</span>
                  </div>
                )}
                {activeModalTxn.balance_after !== null && (
                  <div className="flex justify-between">
                    <span>Reported Balance:</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {formatCurrency(activeModalTxn.balance_after)}
                    </span>
                  </div>
                )}
              </div>

              {/* Accordion for Raw Message */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowRawMsg(!showRawMsg)}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showRawMsg ? 'Hide Original Message' : 'View Original Bank Message'}</span>
                </button>
                {showRawMsg && (
                  <div className="mt-1.5 p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-300 break-all whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {activeModalTxn.raw_text}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleDeleteModal}
                className="p-2 text-rose-400 hover:bg-rose-950/40 border border-rose-900/60 rounded-lg transition-colors"
                title="Delete Transaction"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveModal}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
