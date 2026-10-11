'use client';

import React from 'react';
import { X, Calendar, RefreshCw, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { SubscriptionItem } from '../lib/detector/subscriptions';

interface SubscriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: SubscriptionItem[];
}

export function SubscriptionsModal({ isOpen, onClose, subscriptions }: SubscriptionsModalProps) {
  if (!isOpen) return null;

  const totalMonthlyCommitment = subscriptions.reduce((acc, s) => acc + s.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Subscriptions & Bills</h2>
              <p className="text-xs text-zinc-400">Automatically detected from recurring SMS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full bg-zinc-800 hover:bg-zinc-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Monthly Commitment */}
        <div className="mt-4 p-4 bg-zinc-950 border border-zinc-800/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Total Monthly Commitments
            </span>
            <p className="text-xl font-extrabold text-white mt-0.5">
              ₹{totalMonthlyCommitment.toLocaleString('en-IN')}
            </p>
          </div>
          <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full font-medium">
            {subscriptions.length} active
          </span>
        </div>

        {/* Subscriptions List */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 pr-1">
          {subscriptions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recurring bills or subscriptions detected yet.</p>
              <p className="text-xs text-zinc-600 mt-1">
                Scan your SMS history to automatically detect recurring services like Netflix, Spotify, broadband, or rent.
              </p>
            </div>
          ) : (
            subscriptions.map((sub) => {
              const isUrgent = sub.daysRemaining <= 3;
              return (
                <div
                  key={sub.id}
                  className="p-3.5 bg-zinc-950/60 border border-zinc-800/70 hover:border-zinc-700/80 rounded-xl flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300">
                      {sub.merchant.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        {sub.merchant}
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                          {sub.category}
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Due in{' '}
                        <span className={isUrgent ? 'text-amber-400 font-semibold' : 'text-zinc-300 font-medium'}>
                          {sub.daysRemaining === 0 ? 'Today' : `${sub.daysRemaining} days`}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">
                      ₹{sub.amount.toLocaleString('en-IN')}
                    </span>
                    <p className="text-[10px] text-zinc-500 uppercase">{sub.frequency}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 mt-3">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] text-white font-medium rounded-xl text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
