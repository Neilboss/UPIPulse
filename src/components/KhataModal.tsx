'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, ArrowUpRight, ArrowDownLeft, CheckCircle2, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { KhataManager, KhataPerson, KhataEntry } from '../lib/people/khataTracker';

interface KhataModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefill?: {
    personName?: string;
    amount?: number;
    note?: string;
    transactionId?: string;
  };
}

export function KhataModal({ isOpen, onClose, prefill }: KhataModalProps) {
  const [people, setPeople] = useState<KhataPerson[]>([]);
  const [totalToReceive, setTotalToReceive] = useState(0);
  const [totalToPay, setTotalToPay] = useState(0);
  const [entries, setEntries] = useState<KhataEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'add'>('overview');

  // Form State
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'YOU_LENT' | 'YOU_BORROWED'>('YOU_LENT');
  const [note, setNote] = useState('');

  const refreshData = () => {
    const summary = KhataManager.getPeopleSummary();
    setPeople(summary.people);
    setTotalToReceive(summary.totalToReceive);
    setTotalToPay(summary.totalToPay);
    setEntries(KhataManager.getEntries());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      if (prefill) {
        setPersonName(prefill.personName || '');
        setAmount(prefill.amount ? prefill.amount.toString() : '');
        setNote(prefill.note || '');
        setActiveTab('add');
      } else {
        setActiveTab('overview');
      }
    }
  }, [isOpen, prefill]);

  if (!isOpen) return null;

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!personName.trim() || isNaN(numAmount) || numAmount <= 0) return;

    KhataManager.addEntry({
      personId: 'p_' + personName.trim().toLowerCase(),
      personName: personName.trim(),
      amount: numAmount,
      type,
      note: note.trim(),
      transactionId: prefill?.transactionId,
    });

    setPersonName('');
    setAmount('');
    setNote('');
    refreshData();
    setActiveTab('overview');
  };

  const handleSettle = (id: string) => {
    KhataManager.settleEntry(id);
    refreshData();
  };

  const handleDelete = (id: string) => {
    KhataManager.deleteEntry(id);
    refreshData();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Khata (People Ledger)</h2>
              <p className="text-xs text-zinc-400">Track split bills, lent & borrowed money</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full bg-zinc-800 hover:bg-zinc-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-2 mt-4 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'overview' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            People & Balances
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'add' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Record Entry
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
            {/* Total cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
                <span className="text-[10px] uppercase font-semibold text-emerald-400">You Will Receive</span>
                <p className="text-lg font-bold text-emerald-300 mt-0.5">
                  ₹{totalToReceive.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-xl">
                <span className="text-[10px] uppercase font-semibold text-rose-400">You Owe Others</span>
                <p className="text-lg font-bold text-rose-300 mt-0.5">
                  ₹{totalToPay.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* People List */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Friends & Balances
              </h3>
              {people.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/60">
                  <p className="text-xs">No active split balances.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">Tap "Record Entry" or use "Split" on any transaction.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {people.map((p) => {
                    const isOwed = p.netBalance > 0;
                    return (
                      <div
                        key={p.id}
                        className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white">{p.name}</h4>
                            <p className="text-[11px] text-zinc-400">
                              {isOwed ? 'Owes you' : 'You owe'}{' '}
                              <span className={isOwed ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                ₹{Math.abs(p.netBalance).toLocaleString('en-IN')}
                              </span>
                            </p>
                          </div>
                        </div>

                        {isOwed && (
                          <a
                            href={KhataManager.generateWhatsAppReminder(p.name, p.netBalance)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-1 transition"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-medium hidden sm:inline">Remind</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Unsettled Entries */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Recent Ledger Entries
              </h3>
              <div className="space-y-2">
                {entries.filter((e) => !e.settled).slice(0, 6).map((e) => (
                  <div
                    key={e.id}
                    className="p-2.5 bg-zinc-950/40 border border-zinc-800/60 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-white">
                        <span>{e.personName}</span>
                        <span className="text-zinc-500">·</span>
                        <span className={e.type === 'YOU_LENT' ? 'text-emerald-400' : 'text-rose-400'}>
                          {e.type === 'YOU_LENT' ? 'Lent' : 'Borrowed'} ₹{e.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {e.note && <p className="text-[11px] text-zinc-400 mt-0.5">{e.note}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSettle(e.id)}
                        className="px-2 py-1 bg-zinc-800 hover:bg-emerald-950/40 hover:text-emerald-400 text-zinc-300 rounded text-[10px] font-semibold transition"
                      >
                        Settle
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Add Entry */}
        {activeTab === 'add' && (
          <form onSubmit={handleAddEntry} className="flex-1 overflow-y-auto mt-4 space-y-3.5 pr-1">
            <div>
              <label className="text-xs font-medium text-zinc-300">Person's Name</label>
              <input
                type="text"
                required
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="e.g. Rahul, Sneha"
                className="w-full mt-1.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300">Amount (₹)</label>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full mt-1.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300">Type</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setType('YOU_LENT')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                    type === 'YOU_LENT'
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  You Lent (They owe you)
                </button>
                <button
                  type="button"
                  onClick={() => setType('YOU_BORROWED')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                    type === 'YOU_BORROWED'
                      ? 'bg-rose-950/40 border-rose-500/60 text-rose-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  You Borrowed (You owe)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300">Note / Reason</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Dinner at Swiggy, Movie ticket"
                className="w-full mt-1.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-600/20 active:scale-[0.99] transition"
            >
              Save to Khata
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
