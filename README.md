# FynPet — AI Financial Intelligence

> **A full-stack personal finance dashboard for Nairobi, Kenya.**  
> Real-time cash flow analysis, M-Pesa PDF import, AI advisor powered by Claude, and Supabase cloud sync — all in a single HTML file.

---

## Table of Contents

1. [What it does](#what-it-does)
2. [File structure](#file-structure)
3. [Quick start](#quick-start)
4. [Setting up the AI (required)](#setting-up-the-ai-required)
5. [Supabase database setup](#supabase-database-setup)
6. [M-Pesa PDF import](#m-pesa-pdf-import)
7. [Deploying to the web](#deploying-to-the-web)
8. [Feature reference](#feature-reference)
9. [Tech stack](#tech-stack)
10. [Design system](#design-system)
11. [Troubleshooting](#troubleshooting)

---

## What it does

FynPet gives you a complete picture of your finances in one place:

- **Dashboard** — income vs expenses bar chart, category donut, stat cards with month-over-month change
- **Transactions** — full CRUD (add, edit, delete), filter by type, search, paginated table, CSV export
- **Budgets** — per-category monthly limits with live spend tracking and over-budget alerts
- **Analytics** — 6-month savings trend, financial health score, FIRE progress calculator, monthly summary table
- **M-Pesa Import** — upload your Safaricom PDF statement; Claude AI extracts and categorises every transaction automatically
- **AI Advisor** — a live chat panel powered by Claude that reads your actual transaction data and gives you personalised financial advice, cash flow analysis, and action plans
- **Supabase Sync** — all data syncs to the cloud automatically so it persists across devices and browser clears

---

## File structure

```
fynpet-v5.html              ← The entire application (open this in your browser)
fynpet-proxy.js             ← Local Node.js proxy server (needed for AI)
netlify-claude-proxy.js     ← Netlify serverless function (rename to claude-proxy.js)
cf-worker.js                ← Cloudflare Worker proxy
netlify.toml                ← Netlify deploy config
fynpet-supabase-schema.sql  ← Run this in Supabase SQL Editor to create tables
fynpet_schema.sql           ← Extended schema with RLS and triggers
```

> **All your data** is stored in your browser's `localStorage` by default. Supabase adds optional cloud backup and cross-device sync.

---

## Quick start

**Option 1 — Just open the file:**
```
1. Download fynpet-v5.html
2. Double-click it to open in your browser
3. Start adding transactions manually
```
The app works immediately without any setup. AI features require a proxy (see below).

**Option 2 — Run locally with a server (recommended):**
```bash
# Using Python (no install needed)
python3 -m http.server 8000
# Then open http://localhost:8000/fynpet-v5.html
```

---

## Setting up the AI (required)

**Why a proxy is needed:** Browsers enforce a security policy called CORS that blocks direct calls to `api.anthropic.com`. A lightweight proxy server relays the request server-side. Your API key is never logged or stored anywhere except your own browser.

### Step 1 — Get a Claude API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and generate an API key (`sk-ant-api03-…`)
3. Add some credits (the advisor uses `claude-sonnet-4-20250514` — approx $0.003 per message)

### Step 2 — Run a proxy (choose one)

#### Option A — Local Node.js (fastest, 30 seconds)

Requires [Node.js](https://nodejs.org) (free).

```bash
node fynpet-proxy.js
# Terminal shows: Listening on http://localhost:3001
```

Set **Proxy URL** in FynPet Settings to:
```
http://localhost:3001/proxy
```

> Keep this terminal open while using the app. Restart it any time.

#### Option B — Netlify (free, permanent, works from any device)

1. Create a folder with these files:
   ```
   fynpet-v5.html
   netlify.toml
   netlify/functions/claude-proxy.js   ← rename netlify-claude-proxy.js to this
   ```
2. Go to [app.netlify.com](https://app.netlify.com) → drag and drop the folder
3. Set **Proxy URL** in FynPet Settings to:
   ```
   /.netlify/functions/claude-proxy
   ```

#### Option C — Cloudflare Worker (fastest globally, free tier)

1. Go to [workers.cloudflare.com](https://workers.cloudflare.com) → Create a Service
2. Paste the contents of `cf-worker.js` into the editor
3. Deploy and copy the worker URL
4. Set **Proxy URL** in FynPet Settings to your worker URL

### Step 3 — Configure in the app

1. Open FynPet → click **API & Config** in the left sidebar
2. Paste your `sk-ant-…` API key into the **API Key** field
3. Paste your proxy URL into the **Proxy URL** field
4. Click **Save Key**
5. Click **Test** to verify it works

Once connected, the AI Advisor panel (click **AI** in the topbar) will automatically load your financial data and you can start asking questions.

---

## Supabase database setup

Supabase is optional. Without it, all data lives in your browser's localStorage. With it, your data syncs to the cloud.

### Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project (free tier is sufficient)
2. Choose a region close to Kenya (e.g. `ap-southeast-1` Singapore or `eu-west-1` Ireland)

### Step 2 — Run the schema

1. In your Supabase dashboard → **SQL Editor**
2. Paste the entire contents of `fynpet-supabase-schema.sql`
3. Click **Run**

This creates four tables:

| Table | Purpose |
|-------|---------|
| `transactions` | All income, expenses, savings, and transfers |
| `budgets` | Monthly category spending limits |
| `import_history` | Log of M-Pesa PDF imports |
| `advisor_history` | AI advisor conversation history with financial snapshots |

### Step 3 — Connect in the app

1. In Supabase dashboard → **Settings → API**
2. Copy your **Project URL** and **anon public** key
3. In FynPet → **API & Config** → paste both fields
4. Click **Connect & Test**

The sync status indicator in the sidebar will turn green when connected. From that point on, every transaction save, edit, delete, and import automatically syncs to Supabase.

---

## M-Pesa Import

FynPet can read your official Safaricom M-Pesa PDF statements and extract every transaction automatically.

### How to get your statement

1. Open the **M-Pesa** app or go to [mysafaricom.co.ke](https://www.mysafaricom.co.ke)
2. Navigate to **M-Pesa** → **Statement** → select a date range
3. Download the PDF — it will be password-protected

### Importing

1. Go to **M-Pesa Import** in the sidebar
2. Upload your PDF (drag and drop or click **Choose File**)
3. Enter your **National ID number** as the PDF password (Safaricom default)
4. Set optional date filters if you want to limit the range
5. Click **Import & Analyse**

The pipeline runs in 5 steps:
1. Decrypt the PDF using your password (via PDF.js — runs in-browser, no upload)
2. Extract all transaction text from every page
3. Send text to Claude AI for categorisation (food, transport, utilities, etc.)
4. Run financial pattern analysis
5. Save all transactions to localStorage and Supabase

> **Privacy:** Your PDF never leaves your device. Only extracted text is sent to the Claude API for categorisation. No raw files are stored anywhere.

### Category mapping

Claude uses Kenyan merchant context to categorise transactions:

| Merchant type | Category |
|--------------|----------|
| Naivas, Quickmart, Carrefour, Uchumi | Food & Groceries |
| Uber, Bolt, Matatu, parking, fuel | Transport |
| KPLC, Nairobi Water, Zuku, Safaricom | Utilities |
| Netflix, DStv, Showmax, restaurants | Entertainment |
| Pharmacy, hospital, clinic | Health |
| M-Shwari, KCB Goal, SACCO | Savings |
| Salary, wage credit, stipend | Income |
| Person-to-person send money | Transfer |

---

## Deploying to the web

### Netlify (recommended — free)

```
1. Create folder with: fynpet-v5.html, netlify.toml, netlify/functions/claude-proxy.js
2. Go to app.netlify.com
3. Drag and drop the folder onto the deploy area
4. Your site is live instantly at a *.netlify.app URL
```

The `netlify.toml` file automatically routes `/api/claude` to the serverless function, so no Proxy URL configuration is needed — just paste your API key.

### Vercel

```bash
npm i -g vercel
vercel --prod
```

Create `api/claude.js` using the same code as `netlify-claude-proxy.js` (Vercel uses the same Node.js runtime).

### Self-hosted (VPS/server)

Run the Node.js proxy as a persistent service:

```bash
# Using PM2 (process manager)
npm install -g pm2
pm2 start fynpet-proxy.js --name fynpet-proxy
pm2 save
pm2 startup

# Set Proxy URL in FynPet to https://your-domain.com/proxy
```

---

## Feature reference

### Dashboard

- **Stat cards** — Total Income, Total Expenses, Total Saved (all time), Transaction count. Each shows month-over-month % change.
- **Cash Flow chart** — Bar chart of income vs expenses. Toggle between 7-day, 1-month, and 3-month views.
- **Category breakdown** — Donut chart of this month's spending by category with KES amounts and percentages.
- **Recent transactions** — Last 8 transactions with category pills, amount (colour-coded), and source badges.

### Transactions

- **Add** — Amount, description, type (income/expense/savings/transfer), category, date, notes
- **Edit** — Click the ✎ icon on any row (appears on hover)
- **Delete** — Click × icon with confirmation dialog
- **Filter** — All / Income / Expenses / Savings / Transfers
- **Search** — Real-time search by description or category
- **Pagination** — 12 rows per page with navigation
- **Export CSV** — Downloads all transactions as a properly formatted CSV file

### Budgets

- **Create** — Set a monthly KES limit for any spending category
- **Track** — Live spend vs limit progress bars updated from your transactions
- **Over-budget alert** — Cards turn red when you exceed the limit, show exact overspend amount
- **Edit/Delete** — Full CRUD with category uniqueness validation

### Analytics

- **FIRE calculator** — Progress toward Financial Independence (25× annual expenses). Shows % complete, years to target at current savings rate, and average monthly savings.
- **6-month trend** — Line chart of net savings per month
- **Financial health score** — Four factors: Savings Rate, Emergency Fund, Budget Adherence, Expense Ratio — each with a coloured progress bar and verdict
- **Monthly summary table** — Income, expenses, saved, savings rate %, and net change for the last 6 months

### AI Advisor

The advisor panel slides in from the right (click **AI** in the topbar).

**Chat tab** — Ask anything about your finances. The advisor has access to:
- All your transactions (filtered by current month and all-time)
- Budget limits and current spend per category
- 6-month income/expense/savings trend
- Emergency fund coverage in months
- FIRE progress percentage
- Last 10 individual transactions

**Quick prompts:**
- Cash flow analysis
- Budget check
- Spending issues
- FIRE advice
- Action plan
- Where to cut

**Insights tab** — Live financial health metrics without needing to send a message.

**History tab** — Previous conversations, tappable to replay in the chat view.

**Tone modes** — Configure in the AI Advisor prompt:
- `Balanced` — honest analysis, acknowledges wins and problems equally
- `Tough Love` — direct, calls out bad patterns bluntly
- `Coach` — motivational, FIRE-framework language, celebrates wins

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) — no build step |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Database | Supabase (PostgreSQL + auto-generated REST API) |
| Auth | Supabase Auth (optional) |
| PDF parsing | PDF.js (loaded from Cloudflare CDN) |
| Fonts | DM Serif Display, DM Sans, IBM Plex Mono (Google Fonts) |
| Proxy | Node.js (local), Netlify Functions, or Cloudflare Workers |
| Local storage | Browser localStorage (primary), Supabase (sync layer) |

---

## Design system

FynPet v5 uses a **Refined Editorial** design language — warm cream surfaces, deep charcoal typography, and monospaced numerics as a visual signature.

### Colour palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F5F2EE` | Page background (warm cream) |
| `--surface` | `#FDFCFA` | Card surfaces |
| `--ink` | `#1C1917` | Primary text (warm charcoal) |
| `--blue` | `#3730A3` | Brand accent (deep indigo) |
| `--teal` | `#059669` | Positive/income (warm emerald) |
| `--rose` | `#DC2626` | Negative/expenses (coral red) |
| `--amber` | `#D97706` | Warnings / FIRE progress |

### Typography

| Font | Role |
|------|------|
| DM Serif Display (italic) | Page titles, card headings, modal titles |
| DM Sans | Body text, labels, buttons |
| IBM Plex Mono | All financial figures, amounts, percentages, tags |

---

## Troubleshooting

### "Network error: Failed to fetch" / AI not responding

This is a CORS block — the browser cannot call `api.anthropic.com` directly. You need a proxy running. See [Setting up the AI](#setting-up-the-ai-required).

### AI gives generic advice instead of using my data

Check that you have transactions in the system. The AI builds context from your real data — with no transactions, it can only give general guidance. Add at least a few transactions or import an M-Pesa statement first.

### M-Pesa import fails with "Wrong PDF password"

Your PDF password is your **National ID number** (the 8-digit number on your ID card), not your M-Pesa PIN. Safaricom sets the PDF password to your ID number by default.

### Supabase sync shows "Connection failed"

1. Confirm the Project URL format is exactly `https://xxxx.supabase.co` (no trailing slash)
2. Use the **anon public** key (not the service role key)
3. Make sure you ran the SQL schema in Step 2 of database setup — without the tables, the sync will fail
4. Check that Row Level Security policies were created (they're in the schema file)

### Data disappeared after clearing browser history

Without Supabase connected, all data lives in `localStorage`. Clearing browser data deletes it. Set up Supabase sync to prevent this — once connected, your data is safe in the cloud even if you clear your browser.

### Charts show "No data"

Charts only populate when there are transactions in the system. Add transactions manually or import an M-Pesa statement to see charts.

### The proxy works locally but not after deployment

When deploying to Netlify, the proxy URL should be `/.netlify/functions/claude-proxy` (relative, not absolute). When using a Cloudflare Worker, use the full `https://` URL. When self-hosting, make sure your server has HTTPS — browsers block mixed-content requests.

---

## Data privacy

- **Your API key** is stored only in your browser's `localStorage`. It is sent only to your proxy server and from there to Anthropic. It is never stored server-side.
- **Your transactions** are stored in your browser's `localStorage` and, if configured, in your own Supabase project. They are never sent to any third party.
- **M-Pesa PDFs** are parsed entirely in-browser using PDF.js. The raw PDF bytes never leave your device. Only the extracted plain text is sent to Claude for categorisation.
- **AI conversations** are sent to Anthropic's API. Anthropic's API does not use API submissions for model training.

---

## Contributing / extending

FynPet is a single-file application — all logic is in `fynpet-v5.html`. To extend it:

- **Add a new page** — Add a `<div class="page" id="page-yourpage">` block and a nav item calling `goPage('yourpage', this)`
- **Add a new category** — Add an entry to the `CATS` object in the JavaScript section
- **Modify the AI system prompt** — Edit the `buildSystemPrompt()` function
- **Add a new chart** — Create a canvas element and draw with the HTML Canvas 2D API (same pattern as `drawMainChart` and `drawTrendChart`)
- **Extend Supabase schema** — Add columns to the schema SQL and update `pushToSupabase()` / `pullFromSupabase()` functions

---

*Built by Jeremy Kasule — ZABU Web Systems, Nairobi, Kenya.*
