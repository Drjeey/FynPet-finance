# FynPet Development Plan

A step-by-step plan for turning FynPet into a secure, reliable, mobile-first app on **Netlify + Supabase**, built from the October 2026 system audit. Finding IDs in brackets (S1, F4, M2…) refer to that audit report.

## Verified local status — 21 October 2026

The original completion notes below record earlier work; they are not evidence of a current production deployment.

- Local Git has a baseline commit and the published `review/netlify-currency-foundation` branch. Git is signed in as Drjeey; [draft PR #2](https://github.com/Drjeey/FynPet-finance/pull/2) is open. Review, merge and deployment remain pending.
- Six AI tests and six database tests passed before changes. Eight calculation tests have been added for B1 (20 automated tests total).
- B1 implementation is ready locally: a pure calculation module, saved KES conversions, UGX settings, consistent currency totals, Nairobi calendar periods, and emergency coverage using three completed months.
- Browser checks passed under the configured CSP with isolated sample data: dashboard/advisor/budget agreement, analytics, date defaults, rates, creating transactions, reload persistence, and chart period after resize.
- B4 overlaps implemented locally: real weekday labels, complete monthly chart buckets, three months in 3M, and the correct donut period after resize. Hosted and real-phone acceptance remain pending.
- B5 already includes budget uniqueness checks on edit. Other B5 tasks remain open.
- B2 sync remains the next major correctness task: deleted rows can return, stale clients can overwrite edits, and failed sign-out sync can lose unsynced cache data.
- There is no FynPet Netlify project yet. Deployment, hosted account settings, legacy key rotation (if applicable), and real password-protected M-Pesa imports remain unverified.
- The user will set up a separate FynPet Supabase project manually in a different account. The connected **FP-AFRICA STRIDE APP** project was not modified.
- See [REVIEW_STATUS.md](REVIEW_STATUS.md) for evidence and remaining setup details.

**How to use this plan**
- Do the steps in order. Each one is small enough to ship and test on its own.
- Every step has a **Done when** check. Don't move on until it passes.
- Tick the box when a step is merged and deployed.
- One step = one branch = one pull request. Netlify builds a deploy preview for each PR; test there before merging.

**Legend:** ✅ done · 🔧 code change · 👤 manual task (dashboard or account) · ⏱ rough effort

---

## Step 0 — Foundations and moving to Netlify

### ☑ 0.1 Replace Cloudflare with Netlify Functions ✅ 🔧 [S1, S10, S11]
Done in this change:
- `netlify/functions/ai.mjs` (`POST /api/ai`) now handles the advisor and M-Pesa extraction. It requires a Supabase sign-in, rate-limits per IP (20/min) and per user (`AI_DAILY_LIMIT`/day), builds prompts on the server, redacts phone numbers, caps output size, and validates import rows against a JSON schema.
- `netlify/functions/config.mjs` (`GET /api/config`) serves the Supabase URL and anon key from Netlify env vars.
- `cf-worker.js`, the old Netlify proxy and the two legacy local proxies are deleted. `public/index.html` no longer references Cloudflare.
- The site moved to `public/`, so source files and `.env` can never be published.
- Model updated to `claude-opus-5-5` (override with `ANTHROPIC_MODEL`), with server-side refusal fallback enabled.
- Tests: `npm test` (6 tests, offline mocks).

### ◐ 0.2 Put the project under version control 👤 ⏱ 15 min
```bash
git init
git add .
git commit -m "Baseline: Netlify functions replace Cloudflare worker"
```
Local initialization and the baseline commit are complete. The user supplied the existing public repository `Drjeey/FynPet-finance`. Still pending: publish the review branch and review its changes.
**Done when:** the repository is on GitHub and `.env` / `node_modules` are not in it.

### ☐ 0.3 Connect Netlify to Git and set environment variables 👤 ⏱ 30 min
1. There is no Netlify project yet. Import `Drjeey/FynPet-finance` as a new project, using the tested review branch for preview or `main` after review/merge. See [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md).
2. **Site configuration → Environment variables → Add a variable:**
   - `ANTHROPIC_API_KEY`: check **Contains secret values**; scope **Functions**.
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`: scope **Functions** (values come from step A1).
   - Optional: `AI_DAILY_LIMIT` (default 60), `ANTHROPIC_MODEL`.
3. Trigger a deploy.

**Done when:** `https://fynpet.netlify.app/api/config` returns `"aiEnabled": true`, and the deploy log shows the rate-limit rule applied (post-processing stage).

### ☐ 0.4 Shut down the Cloudflare worker and rotate the key 👤 ⏱ 15 min [S1]
1. Anthropic Console → **Usage**: look for traffic you don't recognise. Set a **monthly spend limit** and an alert.
2. Anthropic Console → **API keys**: create a new key, put it in Netlify (0.3), then **delete the old key** that the worker used.
3. Cloudflare dashboard → Workers → `fynpet` → **Delete**.

**Done when:** `https://fynpet.mrjayhub.workers.dev` no longer responds, and the old key is revoked.

### ☐ 0.5 Local development set up 🔧 ⏱ 15 min
`npm install` → `cp .env.example .env` → fill in values → `npx netlify-cli dev`.
**Done when:** the app runs at `http://localhost:8888`, sign-in works, and the advisor answers.

---

## Phase A — Critical security and stability (≈ 1 week)

### ◐ A1 New Supabase project with a corrected schema 👤🔧 ⏱ 1 day [S4, S5, F14]
> **Status:** code ✅. `supabase/migrations/001_init.sql` is written, and `tests/schema.test.mjs` proves the two-user isolation, the security_invoker views, no anon access, and the constraints (6/6 database tests pass; the other 6 original tests cover AI functions). The app now syncs `currency`, `amount_kes`, `external_ref` and `import_batch`, and upserts on `(user_id, id)`. The old `fynpet-supabase-schema.sql` was deleted. **Still to do:** identify/create the project, run the migration, and set the env vars.
Earlier audit note: the old project (`agefdrvvfhficftrwfpg`) was reported deleted. Its current state was not independently verified in this review.
1. Create a new project (region `eu-west-*`).
2. Write `supabase/migrations/001_init.sql` to replace `fynpet-supabase-schema.sql`:
   - `user_id uuid not null default auth.uid()` on every table.
   - transactions: add `currency text not null default 'KES'`, `amount_kes numeric(14,2)`, `external_ref text`, `deleted_at timestamptz`; `unique (user_id, external_ref)`; index `(user_id, updated_at)`.
   - a trigger that sets `updated_at = now()` on update.
   - budgets: `unique (user_id, category, period)`.
   - views: `create view … with (security_invoker = on)`.
   - one RLS policy per command, using `(select auth.uid())`.
3. Run the migration. In **Advisors → Security**, confirm there are 0 errors.
4. Put the URL and anon key into Netlify (0.3).

**Done when:** two test users each see only their own rows, including in both views.

### ☐ A2 Supabase Auth settings 👤 (after A1) ⏱ 1 h [S12]
Site URL and redirect URLs = your Netlify domain plus deploy previews. Turn on email confirmation and leaked-password protection, and set a minimum password length of 10.
**Done when:** sign-up sends a confirmation email that links back to the site.

### ☑ A3 Remove the XSS sinks ✅ 🔧 [S2]
> **Done:** all 91 inline handlers are replaced by `data-*` attributes routed through an allow-listed dispatcher (`ACTIONS` in `app.js`). AI output is escaped before formatting. Every record from storage, sync or import is validated (`normalizeTx` and friends). Verified in the browser with an injection corpus across descriptions, IDs, dates, categories, currencies, notes, filenames and AI replies: 0 injected elements and 0 executions.
- `formatMsg`: escape HTML first, then apply `**bold**` formatting.
- Replace every `onclick="…('${…}')"` built from data with `data-id` attributes and one delegated click listener per list.
- Build rows with `textContent` and DOM APIs (or a tiny `html` template helper that escapes every value).

**Done when:** a Playwright test seeds descriptions, notes and AI replies with an XSS payload list, and none of them execute.

### ☑ A4 Upgrade and pin third-party scripts ✅ 🔧 [S3, S9]
> **Done:** PDF.js 6.4.299 (legacy build, `isEvalSupported:false`) and supabase-js 2.117.2 are pinned in package-lock and self-hosted from `public/vendor/` (`npm run build`). Verified: a generated statement PDF extracts line by line under the CSP. *Not yet tested with a real password-protected M-Pesa PDF.*
- PDF.js → a current 4.x/5.x release, pinned, with an `integrity` hash, and `getDocument({ …, isEvalSupported: false })`.
- supabase-js: pin the exact version with `integrity`, and load it with `defer`.

**Done when:** a real M-Pesa PDF still imports, and the page loads no unpinned script.

### ☑ A5 Keep accounts separate on shared devices ✅ 🔧 [S6, S7]
> **Done:** the cache is kept per profile (`fynpet_u_<userId>_*`). Sign-out syncs, then removes that account's cache. On first sign-in the app asks before adding device-only data to the account. Verified: user B sees none of user A's data after A signs out.
Namespace the localStorage keys by user ID. Clear cached data on sign-out. When a local-only user signs in, ask whether to add their local data to the account.
**Done when:** user A signs out, user B signs in on the same browser, and B sees none of A's data.

### ☑ A6 Content-Security-Policy ✅ 🔧 [S9]
> **Done:** `script-src 'self'` and the other directives are set in `netlify.toml`; the script moved to `public/app.js`. Verified locally under the same header: all pages, forms, the advisor and PDF import work with no CSP violations. *Check securityheaders.com after deploy.*
After A3, add a CSP header in `netlify.toml`: `default-src 'self'`, script-src limited to self plus the pinned CDNs, `connect-src` = self + `https://*.supabase.co`, `frame-ancestors 'none'`. Inline scripts must first be moved to a `public/app.js` file.
**Done when:** securityheaders.com grades the site A, and the console shows no CSP violations in a full click-through.

### ☑ A7 Honest privacy notice and AI consent ✅ 🔧 [S8]
> **Done:** the import and About copy now describe what is actually stored and sent. A one-time consent dialog appears before any data goes to Claude (`AI_CONSENT_VERSION`). Verified: decline and Escape send nothing; agree sends.
Rewrite the "Privacy guaranteed" and "encrypted" claims. Before the first AI use, show a one-time notice of what is sent to Anthropic, with a consent checkbox.
**Done when:** every privacy claim on screen is accurate.

**Phase A exit:** all P0 audit items are re-tested and closed. Remaining: A1 (create the project), A2, and steps 0.2–0.4, which are all manual. Bonus fixes along the way: F8 (PDF read failures now abort clearly) and F14 (no duplicate budget on edit).

---

## Phase B — Core functional correctness (≈ 2 weeks)

### ◐ B1 One calculation module + currency [F4, F15] ⏱ 2 days
> **Local implementation complete, deployment pending.** `public/calc.js` owns conversions, period/category totals, date ranges, chart buckets and emergency coverage. Transactions keep `amountKes` locally and sync it as `amount_kes`. New or edited transactions use the configured rate; older records without a conversion are converted once on load. Emergency coverage uses three completed calendar months, counting empty months as zero expenses. No expense history returns zero coverage. Eight calculation tests and a local browser check cover this implementation.

Move every "sum by period, type and category" into pure functions (`calc.js`). Store `currency` and `amount_kes` on save. All dashboards use `amount_kes`. Add the UGX rate to Settings. Fix the metric definitions (emergency fund = savings ÷ average monthly expenses over the last 3 months).
**Test:** unit tests for each function, covering month ends and the Nairobi timezone.

### ☐ B2 Sync v2 [F1, F2, F3] ⏱ 4–5 days
Soft deletes (`deleted_at`), an outbox of changed rows, and an incremental pull (`updated_at > lastSync`) with last-write-wins. Sync shows its status and retries when the device comes back online.
**Test:** two browser contexts: delete on A disappears on B; edit on B appears on A.

### ☐ B3 Import v2 [F5–F8] ⏱ 3–4 days
- A deterministic M-Pesa row parser (receipt, time, details, paid in / withdrawn) in the browser; send only descriptions to `/api/ai` for categorisation.
- Apply the Date From/To filter. Abort cleanly if PDF.js fails. Record the real import status (success / partial / failed) and how many rows were rejected.
- Save the `external_ref` unique key to the database (A1).

**Test:** importing a redacted real statement fixture twice adds 0 rows the second time.

### ☐ B4 Date and chart fixes [F9–F12] ⏱ 1 day
Use local (Nairobi) dates instead of `toISOString`. Generate real weekday labels. Bucket the 1M chart properly. Keep the selected period when the window is resized.

### ☐ B5 Small workflow fixes [F13, F14, F16–F19] ⏱ 1–2 days
Top-bar search opens Transactions with the query. Check budget uniqueness when editing. Prevent double submits on AI analysis. Remember the "local only" choice. Use a windowed pager. Remove placeholders (Upgrade button, "Admin", sign-out on avatar click).

---

## Phase C — Mobile-first redesign and accessibility (≈ 2 weeks)

### ☐ C1 Design tokens and components ⏱ 2 days
Formalise the tokens: type scale with a 12px minimum and 16px body on mobile; secondary text contrast ≥ 4.5:1. Components: Button, IconButton, ListRow, Sheet, Pill, ProgressBar, StatTile, EmptyState.

### ☐ C2 Mobile transaction list [M1, M2] ⏱ 3 days
Under 768px, show a card list grouped by day with day totals. Tapping a row opens a bottom sheet with Edit and Delete. Delete gets an undo toast.

### ☐ C3 Top bar, bottom nav and quick-add [M3, M8] ⏱ 2 days
Mobile top bar: title + search icon + avatar menu. Bottom nav: Home · Transactions · **＋ Add** · Budgets · More. Use `100dvh` and safe-area insets.

### ☐ C4 Forms [M6] ⏱ 1 day
16px inputs, `inputmode="decimal"` for amounts, single column under 480px, full-height sheet modals.

### ☐ C5 Accessibility [M5, M7, M9] ⏱ 2–3 days
Real `<button>` and `<a>` elements, `aria-label`s, `<dialog>` with focus management, visible focus rings, a table alternative for each chart, and `prefers-reduced-motion`.

**Phase C exit:** at 320 / 375 / 768 / 1280px there is no clipped content and no horizontal scroll, all targets are ≥ 44px, and axe reports 0 serious issues.

---

## Phase D — Architecture, performance and quality (≈ 1–2 weeks)

### ☐ D1 Split the single HTML file into modules ⏱ 3 days
`public/app/` ES modules: `store`, `sync`, `calc`, `import`, `ai`, `ui/*`. Optionally add Vite to bundle and minify; Netlify builds it.

### ☐ D2 IndexedDB storage ⏱ 2 days
Move transactions out of localStorage (5 MB limit), and handle quota errors.

### ☐ D3 Automated tests in CI ⏱ 2 days
GitHub Actions: `npm test` + Playwright (desktop and mobile viewports, XSS suite, axe) + Lighthouse CI budgets (LCP < 2.5 s on mobile, bundle ≤ 100 KB gz excluding supabase-js). Netlify deploys only when CI passes.

### ☐ D4 Monitoring ⏱ 1 day
Function error logging (Netlify logs, plus Sentry if wanted), Anthropic usage alerts, a weekly Supabase advisor check.

---

## Phase E — Features (ongoing, one at a time)
- ☐ E1 Accounts and balances (M-Pesa, bank, SACCO), with transfers between them
- ☐ E2 Payee rules: categories learnt from your corrections; AI only as a fallback
- ☐ E3 Recurring bills and a "safe to spend" figure
- ☐ E4 Installable PWA with offline quick-add
- ☐ E5 Streaming advisor replies
- ☐ E6 Account export and deletion (Data Protection Act)

## Phase F — Release routine (from now on)
- Every PR: deploy preview + tests green + a manual check on a real phone.
- Every DB change: a migration file + RLS tests with two users + Supabase advisors.
- Monthly: dependency updates (pinned versions ≥ 2 weeks old), a restore drill from backup, and a review of Anthropic spend.

---

## Decisions still open
| # | Decision | Recommendation |
|---|---|---|
| D2 | AI requires sign-in | **Implemented in 0.1** — needed to stop abuse |
| D3 | Local-first vs cloud-first | Local-first + outbox sync (B2) |
| D4 | Build step (Vite) | Yes, in D1 |
| D5 | What data goes to Anthropic | Descriptions/aggregates only; phones redacted (done); consent (A7) |
| D7 | Model | `claude-opus-5-5` default; switch with `ANTHROPIC_MODEL` |
