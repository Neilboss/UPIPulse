# UPIPulse 🇮🇳 ⚡

**UPIPulse** is an India-first personal finance tracking application designed to convert Indian bank SMS and UPI push notifications (Google Pay, PhonePe, Paytm, CRED) into clean, structured financial insights—**automatically, securely, and 100% locally**.

No account aggregators, no cloud-scraping bank credentials, and no external tracking.

---

## ✨ Features

- **⚡ Complementary Fusion Engine**: Intelligently merges Google Pay/PhonePe notifications (which have clean merchant names) with Bank SMS alerts (which have account masks and available balances) into a single unified transaction.
- **🛡️ Multi-Level Deduplication**:
  - **L1 (Exact UTR / Reference ID)**: Automatically dedupes bank ledger alerts and UPI notifications.
  - **L2 (Candidate Fingerprint)**: Matches amount, direction, and merchant similarity within a tight time window.
- **📱 Installable Mobile App (PWA)**: Add UPIPulse directly to your Android or iPhone home screen with 2 taps. Opens in full-screen standalone mode with no browser URL bars.
- **🤖 Background Automation via MacroDroid**: Silently forwards incoming bank alerts to your private local/cloud webhook in milliseconds.
- **🏦 Top Indian Banks & UPI Apps Supported**:
  - **Banks**: HDFC, SBI, ICICI, Axis, Kotak Mahindra, Punjab National Bank (PNB), and generic fallbacks.
  - **UPI Apps**: Google Pay, PhonePe, Paytm, CRED.
- **🔍 100% Transparent Ledger**:
  - Every transaction links back to its original raw SMS/notification text.
  - Clear **"Last Reported Balance"** timestamps instead of misleading "Live Balance" claims.
  - Low-confidence or ambiguous alerts are flagged as **"Needs Review"** instead of guessing.
- **🔒 Privacy-First**: All data is stored in a local SQLite database (`data/upipulse.db`) with WAL mode enabled.

---

## 🏗️ Architecture & Pipeline

```text
[Incoming Alert (SMS / UPI Notification)]
             │
             ▼
     1. Normalize       ── Cleans whitespace, ₹ symbols, currency tokens, amount formatting
             │
             ▼
     2. Pre-Filter      ── Drops OTPs, spam, and non-transactional messages
             │
             ▼
     3. Parse           ── Deterministic regex extraction of amount, direction, merchant, account, balance, UTR
             │
             ▼
     4. Validate        ── Verifies positive amount, direction, assigns confidence score
             │
             ▼
     5. Dedup & Fuse    ── Level 1 (UTR) + Level 2 (Fingerprint) + Level 3 (UPI + Bank SMS Fusion)
             │
             ▼
     6. Categorize      ── Smart merchant categorizer (Food, Travel, Shopping, Utilities, etc.)
             │
             ▼
     7. Store & Sync    ── Persisted in local SQLite WAL database; updates reported account balances
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.17.0 or later)
- npm

### 1. Clone & Install
```bash
git clone https://github.com/Neilboss/UPIPulse.git
cd UPIPulse
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!TIP]
> The server automatically binds to `0.0.0.0:3000`, so any device on your local Wi-Fi can access it using your computer's IP (e.g. `http://192.168.1.15:3000`).

---

## 📱 Using as a Mobile App (PWA)

You don't need to compile or sideload a risky `.apk`! UPIPulse is an installable Progressive Web App.

1. **Ensure your phone and computer are on the same Wi-Fi network**.
2. Open Chrome on your phone and enter:
   ```text
   http://<YOUR_COMPUTER_IP>:3000
   ```
   *(You can find your computer's IP by running `ipconfig` on Windows or `ifconfig` on Mac/Linux).*
3. Tap the **3 dots menu (`⋮`)** in Chrome &rarr; tap **"Install App"** (or **"Add to Home Screen"**).
4. Launch **UPIPulse** from your phone's home screen. It will open in full-screen standalone mode just like a native app!

---

## 🤖 Automatic Ingestion (MacroDroid Setup)

To automatically record your expenses when you make payments on your phone:

1. Install **MacroDroid** (Free from Google Play Store).
2. Create a new Macro:
   - **Trigger**: `Notification` &rarr; `Notification Received` &rarr; Select your SMS app (Google Messages) and UPI apps (Google Pay, PhonePe, Paytm, CRED).
   - **Action**: `Connectivity` &rarr; `HTTP Request`:
     - **Method**: `POST`
     - **URL**: `http://<YOUR_COMPUTER_IP>:3000/api/ingest`
     - **Headers**:
       - `x-api-key: [Your API Key from Sync & Test tab]`
       - `Content-Type: application/json`
     - **Body (JSON)**:
       ```json
       {
         "text": "[notification_text]",
         "sender": "[package_name]"
       }
       ```
3. Save the Macro. Whenever you pay or receive money, your dashboard updates in real time!

---

## 🧪 Testing

UPIPulse includes a comprehensive 54-test validation suite covering regex parsing, bank fixtures, UPI notifications, deduplication, and financial analytics integrity:

```bash
npm test
```

To run a production build:
```bash
npm run build
```

---

## 🛡️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) with WAL mode
- **Validation**: [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Mobile Engine**: Progressive Web App (PWA Manifest, Apple Touch Icons, Standalone Display)

---

## 📄 License

MIT License. Open source and privacy-friendly.
