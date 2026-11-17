# Codex handoff — Shell + Dashboard (desktop)

> **Update 16 Nov 2026:** the Dashboard layout in this handoff is superseded by the simplified design in `12_UX_CRITIQUE_AND_REWORK.md` and `13_REVIEW_UX_ROUND1.md` (references: `reference/v2_dashboard*`). Part A is done. Tokens, data mapping and constraints below still apply; take the layout from the v2 references.


Design approved with conditions on 16 November 2026. Two separate pieces of work, **in this order**, each its own branch and pull request:

- **Part A — data-integrity fixes** (no visual change). Must land first, so the new charts never show resurrected or lost data.
- **Part B — Shell + Dashboard restyle** (desktop, 1024 px and up; mobile follows as its own Stitch round).

Reference files (open them, do not guess):
`REDESIGN/reference/dashboard_main/` (canonical layout, banner hidden by default) · `REDESIGN/reference/dashboard_first_use/` · `REDESIGN/reference/dashboard_motion/` · `REDESIGN/reference/logo/logo-mark.png`.
Each folder has `screen.png` and Stitch's `code.html`. **Use them as a visual and behavioural reference only.** Do not copy the HTML: it loads the Tailwind CDN and Google Fonts, and it contains sample numbers.

Read first: `DESIGN.md`, `PRODUCT.md`, `README.md` (front-end rules), `REDESIGN/01_AUDIT_AND_STRATEGY.md` (issue IDs F-xx), `REDESIGN/04_REVIEW_ROUND2.md`.

---

# PART A — Prompt for Codex (data integrity)

```
You are working in the FynPet repo (vanilla JS, Netlify Functions, Supabase). Do NOT change any visual design in this task. Branch: fix/sync-integrity.

Goal: fix four verified bugs. Preserve all existing calculations, event delegation (data-click + ACTIONS), the CSP (no inline scripts/handlers), per-profile local caches and all 21 existing tests.

Inspect first: public/app.js (functions execDel, confirmDel, saveTx, saveBudget, syncNow, pushToSupabase, pullFromSupabase, signOut, onSignedIn, normalizeTx/normalizeBudget, Store, exportCSV, saveAllConfig and the BOOT block), supabase/migrations/001_init.sql (deleted_at and updated_at columns already exist), tests/schema.test.mjs.

1) F-01 Deletes must propagate. Today deleting only filters the local array; push only upserts; pull re-adds remote rows the device lacks, so deleted items return.
   - Soft delete: set deletedAt (ISO) on the local record instead of removing it; keep it in storage until it has synced, then it may be purged locally.
   - Push sends deleted_at for tombstoned rows (transactions and budgets). Pull must not resurrect a row whose remote deleted_at is set, and must apply remote deletions locally.
   - All views and totals must ignore deleted rows (calc.js already skips deletedAt / deleted_at; make sure every list, search, export and the advisor context do too).
   - budgets: the partial unique index only covers non-deleted rows; creating a new budget for a category whose old one is deleted must work.

2) F-02 Multi-device edits. Pull currently ignores any remote id already present locally and push overwrites everything.
   - Add updatedAt on local records (set on every create/edit/delete). Pull rows changed since the last successful sync (use updated_at; store lastSyncAt per profile). For a row that exists on both sides, the newer updatedAt wins (last-write-wins). Push only rows changed since last sync (an outbox or a changed-since check), not the whole table.
   - Keep legacy local rows without updatedAt working (treat as old).

3) F-03 Sign-out must not destroy unsynced data. syncNow swallows its own errors, so signOut clears the cache even when sync failed.
   - Make syncNow return { ok: true } or { ok: false, error }. Keep status updates for the UI.
   - signOut: if the last sync failed or there are unsynced changes, do NOT clear the cache silently. Show a confirm dialog built with the existing confirm-modal (not window.confirm) saying unsynced changes will be lost, with "Stay signed in" and "Sign out anyway". Only clear after success or explicit choice.

4) Small fixes
   - F-09 CSV export: prefix any cell that starts with = + - @ (or tab/CR) with a single quote, for description and notes. Add a unit test by moving the escaping into a small pure function (e.g. public/csv.js) imported by app.js.
   - F-10 Remove the hard-coded "Jeremy" and "Admin" defaults (saveAllConfig and BOOT block, and the corresponding HTML). Default display name is "You". Remove the role field from Settings and the top bar entirely; do not leave an empty label.

Tests (add; keep existing ones green):
   - Pure functions for merge/last-write-wins and tombstone handling placed in a testable module (e.g. public/sync.js) with node tests: delete propagates and does not resurrect; newer remote edit wins; newer local edit wins; legacy rows without updatedAt; budget recreate after delete.
   - CSV escaping test.
   - Extend tests/schema.test.mjs if the client needs a column or policy that is missing (do not weaken RLS).

Validate: npm run check; npm test; then run the app locally (npm run dev) in two browser contexts signed in to a test Supabase project only if one is configured; otherwise state clearly that two-device behaviour was tested with the pure-function tests only. Do not claim a live two-device test you did not run.

Deliverable: a PR with a short note listing which findings (F-01, F-02, F-03, F-09, F-10) are fixed, tests added, and anything not verified. Do not merge. Never put real keys or user data in code, logs or the PR.
```

---

# PART B — Prompt for Codex (Shell + Dashboard)

Start only after Part A is merged. Branch: `feat/dashboard-midnight`.

```
You are working in the FynPet repo. Branch: feat/dashboard-midnight. Implement the APPROVED dark "Midnight Ledger" design for the application shell and the Dashboard page (desktop, viewport >= 1024 px). Do not redesign anything; match the reference files. Do not change calculations, auth, sync, or event delegation.

Reference (open and compare against them; do not copy their HTML):
- REDESIGN/reference/dashboard_main/screen.png + code.html   (canonical layout)
- REDESIGN/reference/dashboard_first_use/screen.png + code.html
- REDESIGN/reference/dashboard_motion/code.html              (keyframes and motion timings)
- REDESIGN/reference/logo/logo-mark.png
- DESIGN.md (tokens and rules), PRODUCT.md (never promise unimplemented things)

SCOPE
In scope: sidebar, top bar, the Dashboard page (#page-dashboard), the sync-error banner, empty/first-use state, motion, logo.
Out of scope: every other page and all modals (they keep the current look and must still work and not look broken beside the new shell: if a global rule would break them, scope the new styles to the shell and dashboard). Mobile (< 1024 px) keeps the current mobile layout for now; the new dark tokens must not make mobile unreadable, so keep the current light styles under a media query until the mobile Stitch round.

INSPECT FIRST
public/index.html (sidebar #sidebar, top bar, #page-dashboard, #stat-cards, #main-canvas, #donut-canvas, #donut-legend, budget status, recent transactions, #gamification-card, advisor entry), public/app.js (renderStatCards, drawMainChart, drawDonutChart, renderBudgetStatus, renderRecentTx, renderGamification, setChartPeriod, goPage, setSyncStatus, toggleAdvisor, exportCSV, syncNow, searchGlobalTx), public/calc.js, public/stitch.css, public/icons.js, netlify.toml (CSP).

TOKENS (put in one stylesheet as CSS custom properties, e.g. public/midnight.css, linked after stitch.css)
- Page background #111319 (as rendered in the approved frames). Card #121720. Raised #1A212C. Border #252E3B, hover border #3A4658.
- Text 1 #F4F6F8, text 2 #A3AEBD. Do not use any dimmer grey for text under 14 px.
- Accent lime #C6F432 with text #0A0D12: primary buttons, active nav, selected segment, focus ring. Never to mean "good".
- Income #34D399. Expense and over-budget #FB7185. Savings #818CF8. Warning #FBBF24.
- Donut categories: blue, violet, teal-grey, amber, sand, slate; no lime, no coral, no mint, no pink.
- Fonts: Manrope (headings, numerals, tabular figures) and Inter (UI). SELF-HOST them: add the woff2 files under public/fonts/, @font-face with font-display: swap, preload the two main files, and remove the fonts.googleapis.com link; tighten the CSP in netlify.toml (drop fonts.googleapis.com / fonts.gstatic.com once nothing uses them; keep everything else). Note: the other pages currently use Source Serif 4 and JetBrains Mono; keep those self-hosted too only if still referenced, otherwise leave their current loading untouched and change nothing outside this scope.
- Radius: cards 20px, inner 12px, pills full. Spacing 4px scale. Borders, not shadows. No all-caps tracked labels. Minimum text 12px, secondary text uses text 2. Touch targets >= 44px. Never let a currency amount wrap (white-space: nowrap, tabular-nums).

APPLY THESE CORRECTIONS TO THE STITCH DESIGN (conditions of approval)
1. First-use: use sentence-case labels; no "+ +" double plus (icon OR text plus, not both); the transactions tile says "Recorded this month", never "across accounts".
2. A salary/income row shows the category "Income", never "Transfer" (this is real data; just render each row's true category).
3. Donut centre: total at 22px (use compact form like "KES 53.6k" for >= 100,000), with >= 16px clear space inside the ring.
4. Chart tooltip: label and value separated ("Expenses  KES 14,200"); anchored above the hovered bar; never covering neighbouring bars; also shown on keyboard focus.
5. Do not render the "Goal 71%" chip; the Total saved tile shows "<n>% of savings target" only when a savings target exists (setting fireTarget), otherwise "Set a savings target" link to Settings.
6. Remove "Sample data - design preview", all sample figures, and any text not backed by real data (see mapping below).
7. Budgets card: no blank gap; if few budgets, let the card shrink or show the "Last month you spent KES x on <category>" line only when that value is real.
8. Smallest text is 12px (the design's 11px label style becomes 12px).

DATA MAPPING (every number must come from real data; never hard-code)
- Hero "Net cash flow · This month": income - expenses for the selected period using periodStats / sumKes (calc.js). Delta chip vs previous period: periodStats.incChg/expChg logic; hide the chip when there is no previous data. Savings rate: periodStats.savingsRate.
- Hero "This month vs last month" pairs: sumKes for income and expense on periodBounds(period) vs periodBounds(period, now, true). Hide when previous period is empty ("No previous period recorded").
- Tiles: Income, Expenses (+ change chips from periodStats), Total saved (totalSaved), Transactions (txCount, and "n via M-Pesa" = count of source === 'import' in the period).
- Period control 7D / 1M / 3M: existing setChartPeriod; it drives hero, tiles, chart, donut and budgets (as today). Keep the current period semantics from calc.js (week = last 7 days; month and 3m = calendar).
- Cash flow chart: chartSeries (existing buckets; the labels may differ from the mock, that is fine). The dashed previous-period line needs a NEW pure function in calc.js (previous-period series using the same bucket count) WITH tests; if it cannot be made unambiguous for week/month/3m, ship the chart without the line and say so. Axis max = nice round number above the max data value. Text summary line below the chart is computed ("Expenses were highest in <label>."); omit when no expenses.
- Donut + legend: categoryTotals for the period, real category labels from CATS (Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Transfer, Other); show top 5 plus "Other" grouping if more than 6; percentages sum to 100. "Details" link goes to Analytics.
- Budgets card: renderBudgetStatus data. Left = limit - spent; over budget shows "KES x over" and a words label, not colour only. "Resets in n days" = days until the end of the Nairobi calendar month. "Manage" opens the Budgets page; "New budget" uses openAddBudget.
- Recent transactions: latest 6 non-deleted, columns Description (category chip beneath), Date ("16 Nov"), Source ("Imported" / "Manual" with small dot), Amount (signed; expense in primary text with coral sign; income mint). Row Edit / Delete icon buttons appear on hover and on keyboard focus (reuse openEditTx / confirmDel), 44px targets, with aria-labels. "6 new today" chip only if createdAt is today (Nairobi). Footer "Showing 6 of N transactions" (N = non-deleted count). "View all" goes to Transactions.
- Emergency fund ring and text: emergencyFundMonths (calc.js); show "Set a target" state when zero history. Savings streak: calcSavingsStreak; dots = streak up to 3. Text "3 months target achieved" only when streak >= 3.
- Fyn strip: the input opens the advisor (toggleAdvisor) with the typed or chosen question pre-filled; do NOT send anything without consent (existing ensureAiConsent flow). Chips use the three prompts from the design. Never show invented insights.
- Top bar: title and date (Nairobi), search = searchGlobalTx, Export = exportCSV, Sync = syncNow, profile chip with initial and the saved name (default "You"; no role).
- Sidebar: fixed to viewport height, items Dashboard, Transactions, Budgets, Analytics, M-Pesa Import, Settings (goPage), "Ask Fyn AI" lime button (toggleAdvisor), sync status from setSyncStatus (real states: Saved on this device / Syncing / Synced <time> / Sync failed), "Sign in to sync" opens the auth modal.
- Sync-error banner: render only while the sync status is 'error'; message "Couldn't sync. Your changes are saved on this device." with "Try again" (syncNow) and a dismiss button; hide on next success.
- Truthfulness (PRODUCT.md): no claims about encryption, automatic or real-time M-Pesa/SIM sync, "recognized automatically", or accounts.

STATES
- First use (no transactions): the first-use frame: zero values, empty ring, dashed baseline "No activity yet", two actions "Add your first transaction" (openAddTx) and "Import an M-Pesa statement" (goPage mpesa), note "Saved on this device. Sign in to back up and sync."
- Loading: skeleton blocks shaped like the cards, shown until the first render completes.
- No budgets: "No budgets yet" + "Create budget".
- Error: banner above; nothing else changes.

MOTION (match reference/dashboard_motion/code.html; durations 150–500 ms; all of it disabled under prefers-reduced-motion: reduce, where values appear immediately)
- Numbers count up once on first load only (not on every re-render).
- Bars grow from the baseline with a short stagger; donut sweeps once; budget bars fill; the over-budget bar pulses once (not looped); sync dot pulses only while syncing; toast slides in and out.
- Card hover: border to #3A4658 and 2px lift. Row hover: background #1A212C and actions fade in. Nav active pill slides; segmented control selection slides; buttons press 1px.
- Charts are drawn on canvas today. Keep canvas drawing (do not add a charting library) but animate with requestAnimationFrame and respect reduced motion. Skip animation when the period changes via resize.

ACCESSIBILITY
- Every icon-only button has an accessible name (Export CSV, Sync, Edit transaction, Delete transaction, Close banner, etc.). Focus ring 2px lime with 2px offset. Visible focus order: sidebar, top bar, content.
- Each chart has a text summary and an accessible data table alternative (visually hidden, or a "View as table" toggle) built from the same series. Donut legend is the text alternative for the donut.
- Colour is never the only signal (over budget has the words "over"/"Exceeded by n%").
- Contrast: check text on lime, text 2 on cards, and chart labels with a contrast tool; report the numbers. WCAG AA minimum.
- Live region (polite) for toasts and the sync status.

LOGO
- Use REDESIGN/reference/logo/logo-mark.png as the visual spec. Build the mark as an inline SVG (lime #C6F432 rounded square with dark "FP") in the sidebar and as a favicon (public/favicon.svg), with no external image requests. Keep the wordmark "FynPet" and caption "KES ledger" as text.

CONSTRAINTS (non-negotiable)
- No inline <script>, no inline event handlers, no CDN scripts or styles; keep event delegation (data-click + ACTIONS). Prefer classes in midnight.css over inline style attributes in the markup you touch (remove existing inline styles in the dashboard markup as you go).
- Escape all data with escHtml() before inserting into HTML.
- Do not delete existing functions or pages. Do not change calc.js maths. Do not seed demo data. Do not add dependencies.
- Keep working: Transactions, Budgets, Analytics, M-Pesa Import, Settings, Fyn AI panel, auth modal, consent modal, mobile layout. They may look unchanged, but must not be broken or unreadable next to the new shell.

VALIDATE
1. npm run check, npm test (all existing + new tests pass).
2. Run the app (npm run dev, or the project's preview server) and check at 1024, 1280, 1440 and 1920 px: no horizontal scroll, no wrapped amounts, no text under 12px, no clipped card content; and at 768/375/320 that nothing is broken (mobile keeps its current layout).
3. With empty data, with one transaction, and with at least 200 mixed transactions (create them in a throwaway local profile, never in a real one), across 7D/1M/3M, check hero, tiles, chart, donut, budgets and table against the calculations: totals must equal calc.js results; donut percentages sum to 100; the chart total equals the period total.
4. Keyboard-only pass through the whole dashboard; screen-reader names present; reduced-motion on (animations off) and off (animations on).
5. Sync-error banner: force a failed sync (offline) and confirm banner, status text and "Try again" behave.
6. Console: no CSP violations or errors.
7. Take screenshots at 1440 and 1024 for: with data, first use, sync error; compare with the reference screenshots and list every difference.
8. Regression: add, edit, delete a transaction and a budget; CSV export; advisor open/close; sign-in modal; import page loads.

REPORT
List files changed, what was verified (with evidence) and what was NOT verified (real device, real account, real statement). Do not claim live sync, AI or two-device tests you did not run. Open a PR and do not merge.
```

---

# After the PR

I will review it against the checklist (colour semantics, data mapping, accessibility, motion, CSP, no leftover mock text) before you merge. Next Stitch round after this: **mobile shell + dashboard**.
