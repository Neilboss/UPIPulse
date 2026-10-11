import React, { useState } from 'react';
import { Play, Check, AlertCircle, Sparkles, Save, Copy, RotateCcw, Zap, CheckCircle2 } from 'lucide-react';
import { LocalFinanceService } from '../lib/services/localFinanceService';

interface TestBenchProps {
  apiKey?: string;
  onTransactionSaved?: () => void;
}

const SAMPLE_MESSAGES = [
  {
    label: 'HDFC Zomato',
    text: 'HDFC Bank: Rs 850.00 debited from a/c **4321 on 12-10-24 to VPA zomato@icici (UPI ref 428192830111). Avl bal: Rs 48,250.00',
  },
  {
    label: 'HDFC Salary',
    text: 'HDFC Bank: Rs 75,000.00 credited to a/c **4321 on 01-10-24 by INFOSYS LTD (ref 987654321012). Avl bal: Rs 123,250.00',
  },
  {
    label: 'SBI Swiggy',
    text: 'Dear SBI User, your A/c X9876 is debited by Rs.450.00 on 12Oct24 by transfer to UPI/427192837412/SWIGGY. Bal: Rs.22,430.10',
  },
  {
    label: 'SBI P2P Credit',
    text: 'Dear SBI User, your A/c X9876 is credited by Rs.2,500.00 on 11Oct24 by UPI/429182736451/Rahul. Bal: Rs.24,930.10',
  },
  {
    label: 'ICICI Blinkit',
    text: 'Acct XX098 debited with INR 1,899.00 on 12-Oct-24. Info: UPI/BLINKIT/427189230111. Available Balance is INR 38,150.75.',
  },
  {
    label: 'Axis Uber',
    text: 'INR 650.00 debited from A/c no. XX5678 on 12-10-24 19:22:10. Info: UPI/UBER/42718299. Bal: INR 14,750.',
  },
  {
    label: 'Kotak Netflix',
    text: 'Sent Rs.649.00 from Kotak Bank AC XX1122 to NETFLIX on 12-Oct-24. Ref: 428192830112',
  },
  {
    label: 'Google Pay',
    text: 'Paid ₹420 to Blue Tokai Coffee',
  },
  {
    label: 'PhonePe Hotstar',
    text: 'Transaction Successful: Paid ₹299 to Hotstar',
  },
  {
    label: 'CRED Credit Card',
    text: 'Payment of ₹3,499 to HDFC Credit Card successful via CRED',
  },
];

const HARDCORE_BATCH_MESSAGES = [
  'HDFC Bank: Rs 75,000.00 credited to a/c **4321 on 01-10-24 by TECHCORP INDIA (ref 987654321012). Avl bal: Rs 123,250.00',
  'HDFC Bank: Rs 850.00 debited from a/c **4321 on 02-10-24 to VPA zomato@icici (UPI ref 428192830111). Avl bal: Rs 122,400.00',
  'HDFC Bank: Rs 649.00 debited from a/c **4321 on 03-10-24 to NETFLIX ENTERTAINMENT. Avl bal: Rs 121,751.00',
  'HDFC Bank: Rs 2,000.00 debited from a/c **4321 at HDFC ATM on 04-10-24. Avl bal: Rs 119,751.00',
  'HDFC Bank: Rs 1,450.00 debited from a/c **4321 for BESCOM BILL on 05-10-24. Avl bal: Rs 118,301.00',
  'HDFC Bank: Rs 499.00 credited to a/c **4321 on 06-10-24 as refund from AMAZON PAY. Avl bal: Rs 118,800.00',
  'Dear SBI User, your A/c X9876 is debited by Rs.450.00 on 02Oct24 by transfer to UPI/427192837412/SWIGGY. Bal: Rs.24,550.00',
  'Dear SBI User, your A/c X9876 is credited by Rs.2,500.00 on 04Oct24 by UPI/429182736451/Rahul. Bal: Rs.27,050.00',
  'Dear SBI User, your A/c X9876 is debited by Rs.119.00 on 05Oct24 by UPI/429182736452/SPOTIFY. Bal: Rs.26,931.00',
  'Dear SBI User, your A/c X9876 is debited by Rs.3,200.00 on 07Oct24 at SBI ATM. Bal: Rs.23,731.00',
  'Dear SBI User, your A/c X9876 is credited by Rs.340.00 on 08Oct24 by INT.PAID. Bal: Rs.24,071.00',
  'Acct XX098 debited with INR 1,899.00 on 03-Oct-24. Info: UPI/BLINKIT/427189230111. Available Balance is INR 38,150.75.',
  'Acct XX098 debited with INR 3,420.00 on 06-Oct-24 at NATURES BASKET. Available Balance is INR 34,730.75.',
  'Acct XX098 credited with INR 5,000.00 on 08-Oct-24 by IMPS transfer from Priya. Available Balance is INR 39,730.75.',
  'INR 650.00 debited from A/c no. XX5678 on 04-10-24 19:22:10. Info: UPI/UBER/42718299. Bal: INR 14,750.',
  'INR 1,200.00 credited to A/c no. XX5678 on 05-10-24 10:15:00. Info: UPI/Amit/987123. Bal: INR 15,950.',
  'INR 2,899.00 debited from A/c no. XX5678 on 07-10-24. Info: UPI/FLIPKART/991122. Bal: INR 13,051.',
  'Sent Rs.299.00 from Kotak Bank AC XX1122 to HOTSTAR on 05-Oct-24. Ref: 428192830112',
  'Received Rs.1,500.00 in Kotak Bank AC XX1122 from Sneha on 07-Oct-24. Ref: 428192830113',
  'Canara Bank: Rs. 1,250.00 debited from a/c no XX3344 on 06-10-2024 to BigBasket. Avl Bal: Rs. 9,500.00',
  'Bank of Baroda: INR 520.00 debited from Account XX7788 on 08-10-24 at Starbucks. Available Balance: INR 12,300.00',
  'Paid ₹420 to Blue Tokai Coffee',
  'Paid ₹149 to Swiggy One',
  'Transaction Successful: Paid ₹89 to Chai Point',
  'Payment of ₹3,499 to HDFC Credit Card successful via CRED',
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

  const [isInjectingBatch, setIsInjectingBatch] = useState(false);
  const [batchStats, setBatchStats] = useState<{ inserted: number; fused: number; duplicates: number } | null>(null);

  const handleInjectHardcoreBatch = () => {
    setIsInjectingBatch(true);
    setBatchStats(null);

    try {
      const messages = HARDCORE_BATCH_MESSAGES.map((body, i) => ({
        body,
        address: 'BANK-SMS',
        date: Date.now() - (HARDCORE_BATCH_MESSAGES.length - i) * 86400000,
      }));

      const res = LocalFinanceService.ingestHistoricalBatch(messages);
      setBatchStats({
        inserted: res.inserted,
        fused: res.fused,
        duplicates: res.duplicates,
      });

      if (onTransactionSaved) {
        onTransactionSaved();
      }
    } catch (e: any) {
      console.error(e);
      alert('Error injecting dummy batch: ' + e.message);
    } finally {
      setIsInjectingBatch(false);
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

      {/* 1-Click Hardcore Test Action */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-cyan-950/30 border border-emerald-500/30 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">Hardcore Test Injection</span>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
            25 Bank Messages
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Instantly simulate a full month of transactions across HDFC, SBI, ICICI, Axis, Kotak, GPay, PhonePe, salary credits, ATM withdrawals & subscriptions.
        </p>
        <button
          onClick={handleInjectHardcoreBatch}
          disabled={isInjectingBatch}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all"
        >
          <Zap className={`w-3.5 h-3.5 ${isInjectingBatch ? 'animate-spin' : ''}`} />
          <span>{isInjectingBatch ? 'Ingesting 25 Messages...' : 'Run Hardcore Test (Inject 25 Dummy Bank Messages)'}</span>
        </button>

        {batchStats && (
          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-around text-center text-xs animate-in fade-in">
            <div>
              <span className="text-[10px] text-emerald-400 block font-semibold">Inserted</span>
              <span className="font-bold font-mono text-emerald-300">{batchStats.inserted}</span>
            </div>
            <div>
              <span className="text-[10px] text-cyan-400 block font-semibold">Fused</span>
              <span className="font-bold font-mono text-cyan-300">{batchStats.fused}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block font-semibold">Duplicates</span>
              <span className="font-bold font-mono text-zinc-300">{batchStats.duplicates}</span>
            </div>
          </div>
        )}
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
