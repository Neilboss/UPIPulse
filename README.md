<div align="center">

# UPIPulse 🇮🇳 ⚡

**India's smartest UPI & SMS finance tracker — now as a native Android app.**

Auto-reads your bank SMS, tracks spending, forecasts cash flow, and keeps your Khata — all 100% offline and private.

[![Release](https://img.shields.io/github/v/release/Neilboss/UPIPulse?color=brightgreen&label=Latest%20APK)](https://github.com/Neilboss/UPIPulse/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android-green?logo=android)](https://github.com/Neilboss/UPIPulse/releases/latest)
[![Built with](https://img.shields.io/badge/built%20with-Next.js%20%2B%20Capacitor-black?logo=next.js)](https://nextjs.org/)

[📲 Download APK](https://github.com/Neilboss/UPIPulse/releases/latest) · [📖 Build Guide](ANDROID.md) · [🐛 Report Bug](https://github.com/Neilboss/UPIPulse/issues)

</div>

---

## 📲 Download & Install

> **No Google Play needed.** Download directly from GitHub Releases.

1. Go to **[Releases → Latest](https://github.com/Neilboss/UPIPulse/releases/latest)** and download `UPIPulse-vX.X.X-debug.apk`
2. On your phone: **Settings → Security → Install unknown apps** → enable for your browser/files app
3. Tap the APK → **Install**
4. Open UPIPulse and grant **SMS permissions** when prompted ✅

---

## ✨ Features

### 📩 Auto SMS Reading
Reads your bank transaction SMS automatically — no manual entry needed. Supports real-time capture of new SMS and bulk import of history (last 30/60/90 days).

### 🔮 Cash Flow Forecast
Predicts your upcoming expenses based on spending patterns. Know how much you'll spend this week *before* it happens.

### 🔁 Subscription Detector
Automatically identifies recurring charges (Netflix, Spotify, Swiggy One, etc.) from your SMS history. Never miss a silent renewal again.

### 📒 Khata Ledger
Track money lent to or borrowed from friends. Add entries, mark as settled, and see the running balance — like a digital Udhar book.

### 💸 Smart Transaction Parsing
Deterministic regex engine parses UPI and bank SMS with high accuracy:
- **UPI Apps**: Google Pay, PhonePe, Paytm, CRED
- **Banks**: HDFC, SBI, ICICI, Axis, Kotak, PNB + generic fallbacks

### 🔀 Complementary Fusion Engine
Merges Google Pay/PhonePe notifications (clean merchant names) with bank SMS (account masks + balance) into a single unified transaction — no duplicates, full context.

### 🛡️ Multi-Level Deduplication
- **L1 (UTR / Ref ID)** — exact match deduplication
- **L2 (Fingerprint)** — amount + direction + merchant similarity within a time window
- **L3 (UPI + Bank SMS Fusion)** — links the UPI confirmation to the bank debit alert

### 🔍 Transparent Ledger
- Every transaction links back to its original raw SMS text
- "Last Reported Balance" timestamps (not fake "Live Balance")
- Low-confidence or ambiguous alerts flagged as **Needs Review**

### 🔒 100% Private & Offline
All data lives in a local SQLite database on your device. No cloud sync, no account aggregators, no credential scraping.

---

## 🏗️ Architecture

```text
[Incoming SMS / UPI Notification]
             │
             ▼
   1. Normalize       ── Cleans whitespace, ₹ symbols, currency tokens
             │
             ▼
   2. Pre-Filter      ── Drops OTPs, spam, non-transactional messages
             │
             ▼
   3. Parse           ── Regex extraction: amount, direction, merchant, account, balance, UTR
             │
             ▼
   4. Validate        ── Verifies positive amount, assigns confidence score
             │
             ▼
   5. Dedup & Fuse    ── L1 (UTR) + L2 (Fingerprint) + L3 (UPI+Bank fusion)
             │
             ▼
   6. Categorize      ── Food, Travel, Shopping, Utilities, Entertainment, etc.
             │
             ▼
   7. Smart Analysis  ── Subscription detector, cash flow forecast, Khata ledger
             │
             ▼
   8. Store           ── Local SQLite WAL database; updates account balances
```

---

## 🚀 Getting Started (Web / Development)

### Prerequisites
- Node.js v18.17.0 or later
- npm

### 1. Clone & Install
```bash
git clone https://github.com/Neilboss/UPIPulse.git
cd UPIPulse
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!TIP]
> The server binds to `0.0.0.0:3000` — any device on the same Wi-Fi can access it via your computer's IP (e.g. `http://192.168.1.15:3000`).

---

## 🤖 Automatic Ingestion (MacroDroid Setup)

For the **web version**, auto-forward SMS via MacroDroid:

1. Install **MacroDroid** from Google Play
2. Create a Macro:
   - **Trigger**: Notification Received → SMS app + UPI apps (Google Pay, PhonePe, Paytm, CRED)
   - **Action**: HTTP Request → POST
     - **URL**: `http://<YOUR_COMPUTER_IP>:3000/api/ingest`
     - **Headers**: `x-api-key: <your key>`, `Content-Type: application/json`
     - **Body**:
       ```json
       { "text": "[notification_text]", "sender": "[package_name]" }
       ```
3. Save — transactions now appear on the dashboard automatically!

> [!NOTE]
> The **Android APK** reads SMS natively and does not need MacroDroid.

---

## 🧪 Testing

60 tests covering parsing, deduplication, forecasting, subscription detection, and Khata logic:

```bash
npm test
```

Build for production web:
```bash
npm run build
```

Build Android APK:
```bash
npm run build:mobile      # exports static site
cd android
.\gradlew.bat assembleDebug
```

See [ANDROID.md](ANDROID.md) for the full Android build & signing guide.

---

## 🛡️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 14](https://nextjs.org/) — App Router, React 18, TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Database | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) with WAL mode |
| Mobile | [Capacitor](https://capacitorjs.com/) — native Android wrapper |
| Native SMS | Custom `SmsReaderPlugin` (Java) + `SmsReceiver` BroadcastReceiver |
| Validation | [Zod](https://zod.dev/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Testing | Custom Node.js test runner (60 tests) |

---

## 📂 Project Structure

```
UPIPulse/
├── src/
│   ├── app/               # Next.js pages & API routes
│   ├── components/        # UI components (Dashboard, Transactions, Khata, etc.)
│   └── lib/
│       ├── parser/        # SMS parsing, deduplication, categorization
│       ├── detector/      # Subscription detector
│       ├── forecast/      # Cash flow predictor
│       ├── people/        # Khata ledger
│       └── services/      # localFinanceService, smsBridge
├── android/               # Capacitor Android project
│   └── app/src/main/java/com/upipulse/app/
│       ├── MainActivity.java
│       ├── SmsReaderPlugin.java   # Native SMS Capacitor plugin
│       └── SmsReceiver.java       # BroadcastReceiver for live SMS
├── tests/                 # 60-test validation suite
├── ANDROID.md             # Android build & testing guide
└── capacitor.config.json  # Capacitor configuration
```

---

## 📄 License

MIT License — open source and privacy-friendly.
