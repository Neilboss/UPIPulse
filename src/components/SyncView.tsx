'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, Key, Wifi, Play, HelpCircle, Terminal, Download, Share2, CheckCircle2, Inbox, ShieldCheck, Database, Upload, AlertCircle } from 'lucide-react';
import { TestBench } from './TestBench';
import { SmsBridge } from '../lib/services/smsBridge';
import { LocalFinanceService } from '../lib/services/localFinanceService';

interface SyncViewProps {
  onRefreshData?: () => void;
}

export function SyncView({ onRefreshData }: SyncViewProps) {
  const [activeTab, setActiveTab] = useState<'sms' | 'backup' | 'testbench'>('sms');
  const [isScanning, setIsScanning] = useState(false);
  const [scanDays, setScanDays] = useState(90);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; found: number } | null>(null);
  const [scanResults, setScanResults] = useState<{
    total: number;
    inserted: number;
    fused: number;
    duplicates: number;
    rejected: number;
  } | null>(null);

  const [isNative, setIsNative] = useState(false);
  const [exportJson, setExportJson] = useState<string | null>(null);

  useEffect(() => {
    setIsNative(SmsBridge.isNativeAndroid());
  }, []);

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanProgress({ current: 0, total: 100, found: 0 });
    setScanResults(null);

    try {
      // 1. Request permissions if native
      await SmsBridge.requestSmsPermissions();

      // 2. Fetch SMS
      const messages = await SmsBridge.fetchHistoricalSms(scanDays);

      if (messages.length === 0) {
        setScanResults({ total: 0, inserted: 0, fused: 0, duplicates: 0, rejected: 0 });
        setIsScanning(false);
        return;
      }

      setScanProgress({ current: 0, total: messages.length, found: 0 });

      // 3. Batch Ingest
      const result = LocalFinanceService.ingestHistoricalBatch(messages, (current, total, found) => {
        setScanProgress({ current, total, found });
      });

      setScanResults(result);
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (e) {
      console.error('Scan failed', e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleExportData = () => {
    const data = LocalFinanceService.exportDataJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upipulse_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = LocalFinanceService.importDataJson(content);
        if (success) {
          alert('Data backup successfully restored!');
          if (onRefreshData) onRefreshData();
        } else {
          alert('Invalid backup file.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header */}
      <div className="pt-1">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-emerald-400" />
          On-Device SMS & Sync Hub
        </h1>
        <p className="text-xs text-zinc-400">
          Automatic bank SMS capture and instant historical import
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-3 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
        <button
          onClick={() => setActiveTab('sms')}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'sms'
              ? 'bg-zinc-800 text-emerald-400 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          SMS Scanner
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'backup'
              ? 'bg-zinc-800 text-emerald-400 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Backup & Export
        </button>
        <button
          onClick={() => setActiveTab('testbench')}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'testbench'
              ? 'bg-zinc-800 text-emerald-400 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Test Bench
        </button>
      </div>

      {activeTab === 'testbench' ? (
        <TestBench onTransactionSaved={onRefreshData} />
      ) : activeTab === 'backup' ? (
        /* Backup & Restore View */
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Full Local Backup & Export</h3>
                <p className="text-xs text-zinc-400">100% private. Save or move your database anywhere.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleExportData}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                Download JSON Backup
              </button>

              <label className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition">
                <Upload className="w-4 h-4" />
                Restore from Backup File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
        /* SMS Scanner View (Default) */
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-xs font-semibold text-white block">
                  {isNative ? 'Native Android SMS Engine' : 'On-Device SMS Parser'}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {isNative ? 'Listening for incoming bank & UPI SMS' : 'Offline local ingestion active'}
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              100% Private
            </span>
          </div>

          {/* Historical Scan Card */}
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/20 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Import Past SMS History</h3>
                <p className="text-xs text-zinc-400">
                  Scans your device SMS inbox to build your full ledger from day one
                </p>
              </div>
            </div>

            {/* Time range picker */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Time Window to Scan
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '30 Days', val: 30 },
                  { label: '60 Days', val: 60 },
                  { label: '90 Days', val: 90 },
                  { label: '180 Days', val: 180 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setScanDays(item.val)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                      scanDays === item.val
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scan Action Button */}
            <button
              onClick={handleStartScan}
              disabled={isScanning}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-[0.99]"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning Inbox & Parsing...' : `Scan Last ${scanDays} Days SMS`}</span>
            </button>

            {/* Progress Bar */}
            {isScanning && scanProgress && (
              <div className="space-y-1.5 pt-2 animate-in fade-in">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Processing messages...</span>
                  <span className="font-mono">{scanProgress.current} / {scanProgress.total}</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200"
                    style={{ width: `${Math.round((scanProgress.current / scanProgress.total) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-emerald-400 font-mono text-center pt-1">
                  Found {scanProgress.found} financial transactions so far
                </p>
              </div>
            )}

            {/* Scan Results Summary */}
            {scanResults && (
              <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Scan Completed Successfully</span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1 text-center font-mono">
                  <div className="p-1 bg-zinc-900 rounded">
                    <span className="text-[10px] text-zinc-500 block">Scanned</span>
                    <span className="text-xs font-bold text-white">{scanResults.total}</span>
                  </div>
                  <div className="p-1 bg-zinc-900 rounded">
                    <span className="text-[10px] text-emerald-400 block">Inserted</span>
                    <span className="text-xs font-bold text-emerald-400">{scanResults.inserted}</span>
                  </div>
                  <div className="p-1 bg-zinc-900 rounded">
                    <span className="text-[10px] text-cyan-400 block">Fused</span>
                    <span className="text-xs font-bold text-cyan-400">{scanResults.fused}</span>
                  </div>
                  <div className="p-1 bg-zinc-900 rounded">
                    <span className="text-[10px] text-zinc-500 block">Duplicates</span>
                    <span className="text-xs font-bold text-zinc-400">{scanResults.duplicates}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Guarantee Note */}
          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/60 rounded-xl flex items-start gap-2.5 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="text-zinc-200">Zero Cloud Ingestion:</strong> All SMS messages are read and parsed directly on your phone's processor. No financial data, account numbers, or balances ever leave your device.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
