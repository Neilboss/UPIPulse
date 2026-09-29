'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Copy, Check, RefreshCw, Key, Wifi, Play, HelpCircle, Terminal, Download, Share2, CheckCircle2 } from 'lucide-react';
import { TestBench } from './TestBench';

interface SyncViewProps {
  onRefreshData?: () => void;
}

export function SyncView({ onRefreshData }: SyncViewProps) {
  const [activeTab, setActiveTab] = useState<'macrodroid' | 'testbench'>('macrodroid');
  const [settings, setSettings] = useState<any>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const fetchSettings = async (reveal = false) => {
    try {
      const res = await fetch(`/api/settings?reveal=${reveal}`);
      const data = await res.json();
      setSettings(data);
      if (reveal) {
        setRevealedKey(data.apiKey);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSettings(false);
  }, []);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRotateKey = async () => {
    if (!confirm('Are you sure you want to rotate your API key? You will need to update MacroDroid with the new key.')) return;
    setIsRotating(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotateApiKey: true }),
      });
      const data = await res.json();
      if (data.success) {
        setRevealedKey(data.newApiKey);
        fetchSettings(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRotating(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!revealedKey && !settings?.apiKey) return;
    setIsTestingWebhook(true);
    setTestResult(null);

    // If key not revealed, fetch it first
    let keyToUse = revealedKey;
    if (!keyToUse) {
      const res = await fetch('/api/settings?reveal=true');
      const data = await res.json();
      keyToUse = data.apiKey;
      setRevealedKey(data.apiKey);
    }

    try {
      const pingRes = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': keyToUse!,
        },
        body: JSON.stringify({
          text: 'Paid ₹10 to UPIPulse Test Bench via UPI',
          sender: 'Test Ping',
        }),
      });
      const result = await pingRes.json();
      setTestResult(result);
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      setTestResult({ error: e.message || 'Webhook ping failed' });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header */}
      <div className="pt-1">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-emerald-400" />
          Sync & Automation Hub
        </h1>
        <p className="text-xs text-zinc-400">
          Connect your Android phone or test messages directly
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
        <button
          onClick={() => setActiveTab('macrodroid')}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'macrodroid'
              ? 'bg-zinc-800 text-emerald-400 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Android Automation (MacroDroid)
        </button>
        <button
          onClick={() => setActiveTab('testbench')}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'testbench'
              ? 'bg-zinc-800 text-emerald-400 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Manual Test Bench
        </button>
      </div>

      {activeTab === 'testbench' ? (
        <TestBench
          apiKey={revealedKey || undefined}
          onTransactionSaved={onRefreshData}
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile App (PWA) Install Card */}
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/30 border border-emerald-500/20 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Use on Your Phone (Install App)</h3>
                  <p className="text-[11px] text-zinc-400">Add to Home Screen for full-screen native app feel</p>
                </div>
              </div>
              {isInstalled && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Installed
                </span>
              )}
            </div>

            {deferredPrompt && !isInstalled && (
              <button
                onClick={handleInstallClick}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Install UPIPulse App Now</span>
              </button>
            )}

            <div className="bg-zinc-950/60 border border-zinc-800/80 p-3 rounded-lg space-y-2 text-[11px] text-zinc-300">
              <p className="font-semibold text-zinc-200">How to add to phone home screen in 2 taps:</p>
              <div className="space-y-1.5 pl-1">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-mono font-bold">1.</span>
                  <span>Open <code className="text-emerald-300 font-mono text-[10px] bg-zinc-900 px-1 py-0.5 rounded">{settings?.webhookUrl?.replace('/api/ingest', '') || 'http://<laptop-ip>:3000'}</code> in your phone&apos;s Chrome browser.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-mono font-bold">2.</span>
                  <span>Tap Chrome menu (<strong className="text-white">⋮</strong>) &rarr; Tap <strong className="text-emerald-400">&ldquo;Install App&rdquo;</strong> or <strong className="text-emerald-400">&ldquo;Add to Home Screen&rdquo;</strong>.</span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 italic pt-1">
                ★ No APK download needed, no security warnings, and it opens in standalone mode without any browser URL bars!
              </p>
            </div>
          </div>

          {/* LAN Connectivity Notice */}
          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>Local Network (Wi-Fi) Connectivity</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Your phone and laptop must be on the same Wi-Fi network. <span className="text-zinc-200 font-mono">localhost</span> will not work from your phone; MacroDroid must use your laptop&apos;s Wi-Fi IP address below:
            </p>

            {/* Webhook URL */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider">
                Webhook URL (POST)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={settings?.webhookUrl || 'Loading...'}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono select-all"
                />
                <button
                  onClick={() => settings?.webhookUrl && handleCopy(settings.webhookUrl, 'url')}
                  className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 flex items-center gap-1 transition-colors shrink-0"
                >
                  {copiedField === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'url' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider">
                  Secret Ingestion API Key (x-api-key)
                </label>
                <button
                  onClick={() => fetchSettings(!revealedKey)}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  {revealedKey ? 'Hide Key' : 'Reveal Key'}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={revealedKey || settings?.apiKey || '••••••••••••••••'}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono select-all"
                />
                <button
                  onClick={() => {
                    const k = revealedKey || settings?.apiKey;
                    if (k) handleCopy(k, 'key');
                  }}
                  className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 flex items-center gap-1 transition-colors shrink-0"
                >
                  {copiedField === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'key' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleRotateKey}
                  disabled={isRotating}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-700 shrink-0"
                  title="Rotate API Key"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Test Webhook Ping */}
            <div className="pt-2">
              <button
                onClick={handleTestWebhook}
                disabled={isTestingWebhook}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-zinc-700 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isTestingWebhook ? 'Testing...' : 'Send Test Ping to Webhook'}</span>
              </button>

              {testResult && (
                <div
                  className={`mt-2 p-2.5 rounded-lg text-xs font-mono ${
                    testResult.success
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  {testResult.success
                    ? `✓ Webhook ping verified! ID: ${testResult.transactionId} (${testResult.status})`
                    : `✗ Ping failed: ${testResult.error}`}
                </div>
              )}
            </div>
          </div>

          {/* MacroDroid Setup Guide */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Step-by-Step MacroDroid Configuration</span>
            </h3>

            <ol className="space-y-2.5 text-xs text-zinc-300 list-decimal list-inside leading-relaxed">
              <li>
                <span className="font-semibold text-white">Install MacroDroid:</span> Free on Google Play Store on your Android phone.
              </li>
              <li>
                <span className="font-semibold text-white">Add Macro Trigger:</span>
                <p className="text-[11px] text-zinc-400 pl-4 mt-0.5">
                  Select <strong className="text-zinc-200">Notification → Notification Received</strong>. Choose your messaging app (Google Messages, Truecaller) and UPI apps (Google Pay, PhonePe, Paytm).
                </p>
              </li>
              <li>
                <span className="font-semibold text-white">Add Macro Action:</span>
                <p className="text-[11px] text-zinc-400 pl-4 mt-0.5">
                  Select <strong className="text-zinc-200">Connectivity → HTTP Request</strong>.
                </p>
                <div className="pl-4 mt-1.5 space-y-1 text-[11px] font-mono">
                  <p><span className="text-zinc-400">Method:</span> <strong className="text-emerald-400">POST</strong></p>
                  <p><span className="text-zinc-400">URL:</span> <span className="text-zinc-300">{settings?.webhookUrl || 'http://192.168.x.x:3000/api/ingest'}</span></p>
                  <p><span className="text-zinc-400">Header:</span> <span className="text-zinc-300">x-api-key: [Your API Key]</span></p>
                  <p><span className="text-zinc-400">Content Type:</span> <span className="text-zinc-300">application/json</span></p>
                </div>
              </li>
              <li>
                <span className="font-semibold text-white">Request Body (JSON):</span>
                <div className="pl-4 mt-1">
                  <pre className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] text-emerald-400 font-mono overflow-x-auto">
{`{
  "text": "[notification_text]",
  "sender": "[package_name]"
}`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`{\n  "text": "[notification_text]",\n  "sender": "[package_name]"\n}`, 'body')}
                    className="mt-1 text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedField === 'body' ? 'Copied JSON Template' : 'Copy JSON Template'}</span>
                  </button>
                </div>
              </li>
              <li>
                <span className="font-semibold text-white">Save & Done!</span>
                <p className="text-[11px] text-zinc-400 pl-4 mt-0.5">
                  Whenever your bank or GPay/PhonePe sends a notification, MacroDroid will silently forward it to your UPIPulse dashboard within milliseconds.
                </p>
              </li>
            </ol>
          </div>

          {/* Remote Access / Tunnel Guide */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-xl space-y-1.5 text-xs">
            <h4 className="font-semibold text-zinc-300">Optional: Remote Access Outside Home Wi-Fi</h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              If you want MacroDroid to sync payments when you are away from home on mobile data (4G/5G), you can run a free, secure tunnel on your laptop:
            </p>
            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-300">
              <code>npx cloudflared tunnel --url http://localhost:3000</code>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              Then paste the generated <span className="font-mono">trycloudflare.com/api/ingest</span> URL into MacroDroid.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
