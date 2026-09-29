'use client';

import React, { useState } from 'react';
import { Play, Check, AlertCircle, Sparkles, Save, Copy, RotateCcw } from 'lucide-react';

interface TestBenchProps {
  apiKey?: string;
  onTransactionSaved?: () => void;
}

const SAMPLE_MESSAGES = [
  {
    label: 'HDFC Bank',
    text: 'HDFC Bank: Rs 450.00 debited from a/c **4321 on 28-09-24 to VPA paytm-12345@paytm (UPI ref 427182930192). Avl bal: Rs 12,400.00',
  },
  {
    label: 'SBI UPI',
    text: 'Dear SBI User, your A/c X9876 is debited by Rs.120.00 on 28Sep24 by transfer to UPI/427192837412/SWIGGY. Bal: Rs.5,230.10',
  },
  {
    label: 'ICICI Bank',
    text: 'Acct XX098 debited with INR 899.00 on 28-Sep-24. Info: UPI/AMAZON/427189230111. Available Balance is INR 28,150.75.',
  },
  {
    label: 'Axis Bank',
    text: 'INR 1,299.00 debited from A/c no. XX5678 on 28-09-24 14:22:10. Info: UPI/SWIGGY/427182. Bal: INR 15,400.',
  },
  {
    label: 'Google Pay',
    text: 'Paid ₹250 to Blue Tokai Coffee',
  },
  {
    label: 'PhonePe',
    text: 'Transaction Successful: Paid ₹89 to Swiggy',
  },
  {
    label: 'Paytm',
    text: 'Paid ₹60 at Chai Point',
  },
];

export function TestBench({ apiKey, onTransactionSaved }: TestBenchProps) {
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseResult, setParseResult] = useState<any | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleDryRunParse = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      setParseResult(data);
    } catch (e: any) {
      console.error(e);
      alert('Error parsing message: ' + e.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveToTransactions = async () => {
    if (!inputText.trim() || !apiKey) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ text: inputText, sender: 'Test Bench' }),
      });
      const data = await res.json();

      if (data.success) {
        setSaveMessage(
          data.duplicate
            ? (data.fused ? '✓ Fused with existing transaction successfully!' : '✓ Already imported (duplicate detected)')
            : '✓ Transaction saved to database successfully!'
        );
        if (onTransactionSaved) onTransactionSaved();
      } else {
        setSaveMessage('✗ Could not save: ' + (data.error || 'Unsupported'));
      }
    } catch (e: any) {
      console.error(e);
      setSaveMessage('✗ Network error saving transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amt: number | null | undefined) => {
    if (amt === null || amt === undefined) return '₹0';
    return '₹' + amt.toLocaleString('en-IN');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          SMS & Notification Test Bench
        </h2>
        <p className="text-[11px] text-zinc-400 mt-0.5">
          Paste any Indian bank SMS or UPI notification to inspect extracted fields in real time.
        </p>
      </div>

      {/* Quick Sample Chips */}
      <div>
        <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
          Quick Test Templates
        </label>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {SAMPLE_MESSAGES.map((sample) => (
            <button
              key={sample.label}
              onClick={() => {
                setInputText(sample.text);
                setParseResult(null);
                setSaveMessage(null);
              }}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 font-medium whitespace-nowrap transition-colors"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="space-y-1.5">
        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setSaveMessage(null);
          }}
          placeholder="Paste bank SMS or UPI notification text here..."
          className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
        />

        <div className="flex gap-2">
          <button
            onClick={handleDryRunParse}
            disabled={!inputText.trim() || isParsing}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-medium py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-zinc-700"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isParsing ? 'Parsing...' : 'Parse Message (Dry Run)'}</span>
          </button>

          {inputText && (
            <button
              onClick={() => {
                setInputText('');
                setParseResult(null);
                setSaveMessage(null);
              }}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 rounded-xl"
              title="Clear"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Save Message Alert */}
      {saveMessage && (
        <div
          className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            saveMessage.startsWith('✓')
              ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-700/60 text-rose-300'
          }`}
        >
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Parsed Inspection Card */}
      {parseResult?.parsed && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <span className="text-xs font-bold text-white">Parser Inspection Result</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  parseResult.parsed.status === 'PARSED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : parseResult.parsed.status === 'NEEDS_REVIEW'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {parseResult.parsed.status}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {Math.round(parseResult.parsed.confidence * 100)}%
              </span>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Explanation:</span>
            <span>{parseResult.parsed.explanation}</span>
          </div>

          {/* Extracted Fields Table */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Amount</span>
              <span className="text-sm font-bold font-mono text-white">
                {parseResult.parsed.amount !== null ? formatCurrency(parseResult.parsed.amount) : 'Not Found'}
              </span>
            </div>

            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Direction</span>
              <span
                className={`text-xs font-bold font-mono ${
                  parseResult.parsed.type === 'DEBIT'
                    ? 'text-rose-400'
                    : parseResult.parsed.type === 'CREDIT'
                    ? 'text-emerald-400'
                    : 'text-purple-400'
                }`}
              >
                {parseResult.parsed.type}
              </span>
            </div>

            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Merchant / Payee</span>
              <span className="text-xs font-medium text-zinc-200 truncate block">
                {parseResult.parsed.merchant || 'Unknown Merchant'}
              </span>
            </div>

            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Predicted Category</span>
              <span className="text-xs font-medium text-emerald-400">
                {parseResult.parsed.predictedCategory}
              </span>
            </div>

            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Account / Card Mask</span>
              <span className="text-xs font-mono text-zinc-300">
                {parseResult.parsed.accountMask || 'Not present in text'}
              </span>
            </div>

            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Last Reported Balance</span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                {parseResult.parsed.balanceAfter !== null ? formatCurrency(parseResult.parsed.balanceAfter) : 'None reported'}
              </span>
            </div>

            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800 col-span-2">
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Reference ID / UTR</span>
              <span className="text-xs font-mono text-zinc-300">
                {parseResult.parsed.refId || 'Not found'}
              </span>
            </div>
          </div>

          {/* Duplicate Check Insight */}
          {parseResult.duplicateCheck && (
            <div
              className={`p-2.5 rounded-xl text-[11px] ${
                parseResult.duplicateCheck.isDuplicate
                  ? 'bg-amber-950/40 border border-amber-800/60 text-amber-300'
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-400'
              }`}
            >
              <span className="font-semibold block">Deduplication Status:</span>
              <span>
                {parseResult.duplicateCheck.isDuplicate
                  ? parseResult.duplicateCheck.reason
                  : 'Unique transaction — would create a new record in database.'}
              </span>
            </div>
          )}

          {/* Commit Action Button */}
          {parseResult.parsed.amount !== null && (
            <button
              onClick={handleSaveToTransactions}
              disabled={isSaving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save As Transaction'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
