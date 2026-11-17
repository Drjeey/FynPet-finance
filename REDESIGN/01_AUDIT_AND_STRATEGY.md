# FynPet — Audit, Benchmark and Redesign Strategy

Prepared 16 November 2026. Covers Steps 1–8 of the master prompt.

## How to read the evidence labels

| Label | Meaning |
|---|---|
| **VERIFIED-CODE** | I read the code and the behaviour follows from it. I did not run the app to see it happen. |
| **VERIFIED-RUN** | I ran a command or test and saw the result. |
| **SUSPECTED** | A plausible risk I could not confirm from code alone. |
| **NOT TESTED** | Needs a live environment (hosted Supabase, Anthropic, real phone, real statement). |

What I actually ran: `npm test` (21/21 passed) and `npm audit --omit=dev` (0 vulnerabilities). I did **not** launch the app in a browser, sign in, sync, call the AI, or import a real PDF. Every behavioural finding below is therefore VERIFIED-CODE unless stated.

---

# PART 1 — Discovery (Phase 1)

## 1.1 What the system is

A personal-finance app for Kenya (KES-first, M-Pesa aware). It is **not** a multi-account banking product: it has no bank balances, cards or account linking. It tracks transactions, budgets and savings, and has an AI advisor.

| Layer | Implementation |
|---|---|
| Front end | Single static page: `public/index.html` (1,202 lines, markup plus a large inline `<style>`), `public/app.js` (1,742 lines, ES module), `public/calc.js` (pure maths), `public/icons.js`, `public/stitch.css` (overrides). No framework, no bundler. |
| Charts | Hand-drawn `<canvas>` (cash flow, donut, trend). |
| Server | Two Netlify Functions: `GET /api/config` and `POST /api/ai` (advisor + M-Pesa extraction). |
| Data | `localStorage` per profile (`fynpet_u_<userId>_*`), synced to Supabase Postgres when signed in. |
| Auth | Supabase email/password. The AI function verifies the bearer token against Supabase Auth. |
| AI | Anthropic via the server; prompts built server-side; phone numbers redacted; per-IP rate limit and per-user daily quota (Netlify Blobs). |
| Database | `transactions`, `budgets`, `import_history`, `advisor_history`, two summary views. RLS on every table. `deleted_at` columns exist. |
| Tests | 21 passing: AI function (mocked), calculations, config, schema/RLS (in-process Postgres). **No front-end tests.** |
| Deploy | Netlify. Draft PR #2 has a preview. Production has not received this implementation (per the repo's own notes, not re-checked today). |

**Important context.** The app already went through a Stitch design pass on 10 November 2026 (warm cream, indigo, Source Serif headings). `DESIGN.md` currently says "implement the approved Stitch screens, not a new visual direction". Your new reference images are a different direction (dark, high-contrast fintech). That is a deliberate change of direction, so `DESIGN.md` must be updated when you approve it (see Decision D-01).

## 1.2 Application inventory

| Screen | Current functionality | Technical implementation | Current issues | Recommended improvement |
|---|---|---|---|---|
| **Dashboard** | 4 stat cards (income, expenses, total saved, transaction count), cash-flow chart (7D/1M/3M), donut by category, budget status, recent transactions, milestones/streak | `renderStatCards`, `drawMainChart`, `drawDonutChart`, `renderBudgetStatus`, `renderGamification`; maths in `calc.js` | Empty state shows four zeros and a blank chart; no single "what should I look at" focus; milestones card uses 53 inline styles; canvas charts | Hero "net cash flow" with income/expense split; clearer first-use state; richer chart tooltips |
| **Transactions** | Search, type filter, paginated table, add/edit/delete, CSV export | `renderTxPage`, `txRow`, `saveTx`, `confirmDel` | Hard delete only (sync bug F-01); no date or category filter; no bulk actions | Filter bar with date range and category; soft delete with undo |
| **Budgets** | One monthly limit per category, progress, add/edit/delete | `renderBudgetsPage`, `saveBudget` | No rollover, no "safe to spend", no alerts | Remaining-per-day figure and over-budget callouts |
| **Analytics** | Trend chart, health factors, emergency-fund coverage, 6-month table | `renderAnalytics`, `drawTrendChart`, `renderHealthFactors` | Canvas charts have no text alternative (SUSPECTED, not grepped for every canvas) | Chart + data-table toggle |
| **M-Pesa Import** | Password-protected PDF read in the browser, text chunked to AI for extraction, dedupe by receipt, import history | `runImport`, `parseWithClaude`, `/api/ai` `mode:'import'` | Date range fields have no effect (F-04); history always says "Success" (F-05); re-import duplicates rows without receipts (F-06) | Deterministic parser, preview-before-save, reconciliation totals |
| **Fyn AI** | Slide-over chat, insights tab, history tab, consent dialog | `toggleAdvisor`, `callClaude`, `/api/ai` `mode:'advisor'` | Needs sign-in; daily quota is shared with import | Keep; restyle; show quota remaining |
| **Settings** | Profile name/role, savings target, estimated FX rates, AI consent, sync status, data management | `loadSettingsPage`, `saveAllConfig`, `saveConfig` | Defaults to "Jeremy" / "Admin" for every user (F-10) | Neutral defaults; remove "role" |
| **Auth** | Sign-in/sign-up modal, skip to local mode | `submitAuth`, `onSignedIn` | Modal auto-opens 1 second after load for every signed-out visitor (F-11); merge prompt uses a browser `confirm()` | Calmer, in-product prompt; designed merge dialog |
| **Shell** | Desktop sidebar; mobile bottom nav (Home, Transactions, Add, Budgets, More) | `goPage`, `mobGoPage` | Works; visually dated relative to the new references | Redesign per Part 4 |
| **Administration** | **Does not exist.** The "Admin" label in the profile is cosmetic. | — | Misleading label | Remove the label. Do not design an admin area. |

Not present, so not audited: accounts/cards, notifications, user management, import of non-M-Pesa data.

## 1.3 User and journeys

- **User:** an individual in Kenya who tracks money mostly through M-Pesa and wants to see spending and savings clearly. Currency is KES with occasional USD/EUR/GBP/TZS/UGX.
- **Primary journeys:** (1) log or import transactions; (2) see where this month's money went; (3) stay inside budgets; (4) ask Fyn a question.
- **Friction today:** an immediate sign-in prompt; empty-state dashboards that look broken; import that feels opaque; no feedback when sync fails.

---

# PART 2 — Audit (Phase 2)

## 2.1 What is working well (VERIFIED-RUN / VERIFIED-CODE)

- Strict CSP (`script-src 'self'`), no inline handlers, escaping through `escHtml()`, AI output escaped before formatting.
- Secrets stay on the server. The browser only receives the public Supabase key.
- RLS tested with two users; `anon` role has no table access; views use `security_invoker` (VERIFIED-RUN, schema tests).
- Money maths is centralised in `calc.js`, uses integer cents, saves the KES conversion at entry time so historical totals do not move. 8 tests cover it.
- Per-profile local caches stop accounts mixing on a shared device.
- 0 known vulnerabilities in production dependencies.

## 2.2 Issue register

Severity: CRITICAL / HIGH / MEDIUM / LOW as defined in the brief. I found **no CRITICAL** issue in the code. Two items marked "deployment" could be critical depending on facts I cannot see (F-20).

| ID | Issue | Category | Sev | Evidence | Recommended fix | Depends on |
|---|---|---|---|---|---|---|
| F-01 | **Deleted transactions and budgets come back.** Delete only filters the local array; sync only upserts local rows and then adds any remote row the device does not have. After the next sync the deleted row is pulled back. | Functional / data integrity | HIGH | VERIFIED-CODE: `execDel` (app.js 1185–1198), `pushToSupabase` (573–597), `pullFromSupabase` (599–624). Schema has `deleted_at` but the client never sets it. | Soft delete (`deleted_at`), push tombstones, filter them on pull | B2 in DEVELOPMENT_PLAN |
| F-02 | **Edits on one device never reach another, and a stale device can overwrite newer data.** Pull ignores any remote id already present locally; push upserts everything. | Functional / data integrity | HIGH | VERIFIED-CODE, same lines as F-01 | Incremental sync on `updated_at`, change outbox, last-write-wins with a visible conflict note | F-01 |
| F-03 | **Sign-out can destroy unsynced data.** `signOut` does `await syncNow().catch(()=>{})`, but `syncNow` catches its own errors and never rejects. So if sync fails (offline, server error) the account cache is cleared anyway. | Functional / data loss | HIGH | VERIFIED-CODE: `signOut` (1413–1426) and `syncNow` (557–571) | Make sync return success/failure; block or warn before clearing when it fails | — |
| F-04 | **Import date range does nothing.** The From/To inputs get default values but are never read when importing. | Functional | MEDIUM | VERIFIED-CODE: only references to `imp-from` / `imp-to` are the two default-setting lines (1709–1714) | Apply the range, or remove the fields | B3 |
| F-05 | **Import history always shows "Success", and rejected rows are not shown.** The server returns a `rejected` count per chunk; the client discards it, and the history row is hard-coded to "✓ Success". | Functional / trust | MEDIUM | VERIFIED-CODE: `renderImportHistory` (1336), `_parseChunk` (1328–1331) | Record real status and counts; show "n of m rows imported" | B3 |
| F-06 | **Re-importing a statement can duplicate rows that have no receipt number.** Duplicate skipping is `!t.receipt \|\| !knownReceipts.has(...)`, so any row without a receipt is always added. | Functional / data integrity | MEDIUM | VERIFIED-CODE (1256–1257) | Fallback key of date + amount + normalised description; preview before saving | B3 |
| F-07 | **Statement figures come from a language model with no reconciliation.** An extraction error would silently change totals. Nothing checks imported totals against the statement. | Financial integrity | HIGH | VERIFIED-CODE (design). Actual error rate NOT TESTED; no real statement has been tried. | Deterministic row parser in the browser; AI only for categorisation; show a preview and statement-total check | B3 |
| F-08 | **Each import chunk uses one unit of the daily AI quota.** A long statement can use a large share of the 60 daily requests, leaving none for the advisor. | Functional | MEDIUM | VERIFIED-CODE: `consumeDailyQuota` runs once per request; client sends one request per ~3,500-character chunk | Count an import as one unit, or give import its own quota | — |
| F-09 | **CSV export is open to spreadsheet formula injection.** Descriptions beginning `=`, `+`, `-` or `@` are written unchanged. Counterparty names in M-Pesa statements are controlled by other people. | Security | MEDIUM | VERIFIED-CODE: `exportCSV` (1503) | Prefix such cells with `'` | — |
| F-10 | **Every new user is called "Jeremy" with the role "Admin".** Seen in the 10 November screenshot. No admin features exist. | UX / trust | MEDIUM | VERIFIED-CODE (1482–1483, 1717–1718) and the screenshot | Neutral default ("You"), remove role | — |
| F-11 | **Sign-in modal opens by itself after 1 second** for every signed-out visitor, which fights the app's local-first promise. | UX | MEDIUM | VERIFIED-CODE (line 37) | Offer sign-in in context (sync banner, Settings) | Auth screen redesign |
| F-12 | **Maintainability: a 1,742-line script, 1,202-line HTML with a large inline `<style>` plus `stitch.css` overriding it, 53 inline `style=` attributes, HTML built as strings.** Two styling systems fight each other and the CSP has to allow `'unsafe-inline'` styles. | Architecture | MEDIUM | VERIFIED-CODE | Introduce design tokens in one stylesheet, remove inline styles screen by screen as each is redesigned. A framework rewrite is **not** needed. | Design system |
| F-13 | **No front-end tests.** The XSS and currency browser checks were done by hand. | Quality | MEDIUM | VERIFIED-RUN (test folder contains only function, calc, config and schema tests) | Add Playwright smoke tests before the redesign touches each screen | — |
| F-14 | **Local storage writes are unguarded.** `Store.set` can throw if the browser quota is full; `loadProfileData` rewrites every list on each load. | Reliability | LOW | SUSPECTED (not reproduced) | Wrap writes, report "storage full" | — |
| F-15 | **Charts are canvas drawings.** Screen-reader users get no data. | Accessibility | MEDIUM | SUSPECTED for each canvas; a quick check of every canvas is still needed | Data-table alternative and an accessible summary line under each chart | Design system |
| F-16 | **Window resize redraws three charts on every event with no debounce.** | Performance | LOW | VERIFIED-CODE (1675). Impact NOT MEASURED. | Debounce / ResizeObserver | — |
| F-17 | **Fonts load from Google Fonts at run time.** Extra third-party request and a privacy consideration; the CSP has to allow it. | Privacy / performance | LOW | VERIFIED-CODE (index.html 7–9) | Self-host the chosen fonts | Design system |
| F-18 | **`awx.py` (78 KB AWS study-document generator) sits in the project root.** Unrelated to FynPet. | Hygiene | LOW | VERIFIED-CODE | Move it out of the repo | — |
| F-19 | **No continuous integration.** | Quality | LOW | The README lists CI as pending | Run `npm run check` and `npm test` on every PR | — |
| F-20 | **Hosted environment not verified.** Supabase project, email-confirmation and password-length settings (plan step A2), AI environment variables, old Cloudflare worker/key retirement (plan 0.4) are all marked as manual and incomplete. | Deployment / security | HIGH (could be CRITICAL if the old worker or key is still live) | NOT TESTED — I cannot see the hosted accounts | Complete plan steps 0.3, 0.4, A1, A2 before any public launch | Manual |
| F-21 | **The quota counter is not atomic**, so two simultaneous requests at the limit can both pass. The code says so. | Security / cost | LOW | VERIFIED-CODE (auth.mjs) | Acceptable as a cost guard; revisit if abused | — |

Security checklist coverage: authentication (F-11, F-20), session handling (supabase-js, not custom), access control (RLS verified), API security (token check, rate limit; only the code was read), input validation (server whitelists type/category/date/receipt; verified in tests), XSS (escape-first approach; I read `escHtml`/`formatMsg`, no browser injection run today), CSRF (bearer-token API, no cookies, so low exposure), SQL injection (no raw SQL in app code), secrets (none in repo; `.env` ignored), dependencies (0 vulnerabilities), audit trail (**none** — no change log of edits; acceptable for a personal app).

## 2.3 Performance (NOT MEASURED)

No profiling was done. By inspection: all calculations run in the browser over the full in-memory list, several times per render. That is fine for a few thousand transactions and should be re-measured after the redesign. The server work is two small functions plus one Anthropic call per request, bounded by a 50-second timeout.

---

# PART 3 — Benchmark (Phase 3)

Sources are third-party reviews and vendor pages found on 16 November 2026. Where I could not confirm a detail from an official source I say so. I did not open the apps themselves.

| Product | What it does well | Source | What FynPet should take |
|---|---|---|---|
| **Copilot Money** | Reviewers consistently call its design the best in the category: clean, uncluttered dashboard, clear spending and net-worth graphs. Fixed layout rather than configurable. | [Origin comparison](https://useorigin.com/resources/blog/copilot-vs-monarch-which-is-better-for-your-financial-life), [Penny Hoarder review](https://www.thepennyhoarder.com/budgeting/budgeting-copilot-money-review/) | One clear hero number, generous spacing, few widgets |
| **Monarch Money** | Widget-based customisable dashboard; more powerful but described as busier, leaving users to "connect the dots" | [Origin comparison](https://useorigin.com/resources/blog/copilot-vs-monarch-which-is-better-for-your-financial-life) | Avoid a busy widget wall; surface one interpretation per card |
| **YNAB** | Zero-based model: every shilling gets a job; category targets (monthly, weekly, by-date); "Age of Money" | [YNAB glossary](https://support.ynab.com/en_us/ynab-glossary-a-guide-BJd80SORq.md) | Budgets framed as "left to spend", with targets. Interface details are from reviews only; I found no official design documentation. |
| **Monzo** | Budgets per category with last month's spend shown when you set a limit; customisable home with tappable insight "spotlights"; pots separate spending from saving. Community criticism: two overlapping ways to adjust budgets is confusing. | [Monzo budgeting](https://monzo.com/us/features/budget-with-monzo), [Monzo home screen](https://monzo.com/blog/monzo-us-blog/new-home-screen), [community thread](https://community.monzo.com/t/budget-summary-and-adjustment-multiple-ways-to-do-one-thing-is-confusing/106445) | Show last month's spend when setting a budget; one way to edit a budget |
| **Revolut** | Analytics by day/week/month/year, compare with the previous period, drill to merchant; custom categories. Users complained when category budgets disappeared in a redesign. | [Revolut help](https://help.revolut.com/help/app-features/budgeting-and-analytics/how-does-the-analytics-feature-work/), [community thread](https://community.revolut.com/t/budgeting-and-analytics/208320?page=7) | Period comparison on every chart; keep category budgets visible at a glance |
| **Kenyan M-Pesa trackers** (FlowWise, PesaTrail, Cashiro, paybillke planner) | Parse M-Pesa SMS or statements; some store data only on the device; Cashiro is open source and imports PDF statements | [FlowWise](https://play.google.com/store/apps/details?id=com.flowwise.app), [PesaTrail](https://similarweb.com/zh-tw/app/google/com.dmk.pesatrail), [Buxfer Kenya page](https://www.buxfer.com/countries/114/kenya), [paybillke planner](https://paybillke.com/calculators/budget-planner-kenya) | Privacy as a selling point: say plainly what stays on the device. No independent reviews exist, so "best" cannot be claimed. |

Not benchmarked: Wise, Wealthfront, Empower and Actual Budget, because FynPet has no accounts, investments or transfers. I would rather benchmark fewer, relevant products than pad the list.

## Comparison matrix

| Design / feature | Competitor examples | FynPet today | Opportunity |
|---|---|---|---|
| One dominant number on home | Copilot | Four equal stat cards | Net cash flow hero |
| Period comparison on charts | Revolut | Percentage chips on cards only | Overlay previous period on the chart |
| Budget set-up uses past spend | Monzo | Blank limit field | Show last month's spend beside the field |
| Budget as "left to spend" | YNAB, Monzo | Percentage bar | "KES x left · KES y/day" |
| Tappable insights | Monzo | Separate AI drawer | Insight strip that opens Fyn with a question pre-filled (no invented insights) |
| Privacy clarity | Local-first Kenyan apps | Accurate consent dialog | Make the local-first promise visible on the dashboard |
| Honest empty states | Industry norm | Four zeros | First-use state with two clear actions |
| Dark mode | Most fintech | Light only | Dark-first with a light option |

---

# PART 4 — Reference images and design direction

## 4.1 What each reference contributes

| # | Reference | Take | Leave |
|---|---|---|---|
| 1 | Soft green mascot onboarding (light) | Calm, reassuring tone for first-use and completion moments; rounded floating nav | The mascot and cloud illustration: off-brand for a ledger |
| 2 | Dark fitness app, lime accent (stats, calendar, segmented tabs) | **Lime accent on near-black**, segmented Daily/Weekly/Monthly control, rounded metric tiles with a small arrow, circular nav buttons | Blue calendar card, the fitness content |
| 3 | "Ethereal" desktop dashboard | **Hero card** with a big number and two actions, income/expense tiles with coloured delta chips, donut with category legend, bar chart with a floating tooltip, subscription list | Card stack and subscriptions (FynPet has no cards); the pastel gradient hero (too loud) |
| 4 | Brown/orange POS dashboard (glass, heat-map) | AI "ask something" input as a first-class element; glow only on the active nav item | Brown palette, heat-map, glass navigation bar (hurts legibility) |
| 5 | Dark green/lime portfolio (mobile) | Floating pill bottom nav, bold balance with delta, **chart with a crosshair tooltip**, white/lime pill buttons | Trading actions (buy/sell/exchange) |
| 6 | Blue dark desktop dashboard | Left icon sidebar, line chart with a tooltip, side column of secondary items | Card-hologram visuals, contacts, groups |

Common thread: near-black surfaces, one saturated accent, large rounded cards, big numerals, pill controls, restrained delta chips. That is the direction.

## 4.2 Proposed design system — "Midnight Ledger" (for approval)

**Principles:** numbers first; one accent; colour means something; calm, not busy; Kenyan context (KES, M-Pesa) visible, not decorated.

**Colour (dark default, light theme to follow once dark is approved)**

| Token | Value | Use |
|---|---|---|
| canvas | `#0A0D12` | Page background |
| surface-1 | `#121720` | Cards |
| surface-2 | `#1A212C` | Inputs, raised items |
| border | `#252E3B` | 1px outlines |
| text-1 / 2 / 3 | `#F4F6F8` / `#A3AEBD` / `#7C8797` | Primary / secondary / tertiary (tertiary only at 14px or larger) |
| accent | `#C6F432` | Primary buttons, active nav, selection. Text on accent is `#0A0D12`. |
| income | `#34D399` | Money in only |
| expense | `#FB7185` | Money out and over-budget only |
| savings | `#818CF8` | Savings; keeps a link to the current indigo brand |
| warning | `#FBBF24` | Approaching budget limit |

The accent (lime) is deliberately different from the income green so "brand" and "good" never look the same. All text pairs above should be checked with a contrast tool once Stitch renders them; I have not measured them.

**Type:** Manrope (headings and numerals, tabular figures) and Inter (UI text). Drops the serif and the monospace currency figures. Minimum 12px secondary text, 16px mobile inputs, 44px touch targets (carried over from the current `DESIGN.md`, which was sound). Fonts self-hosted.

**Shape:** card radius 20px, inner 12px, pills fully round. Spacing on a 4px scale; page padding 32px desktop, 16px mobile; 20px card gap. Borders instead of shadows on dark surfaces.

**Components:** primary (lime) / secondary (outlined) / ghost buttons; segmented control; metric tile; chart card with tooltip; category chip; source pill (Manual / Imported); progress bar with three states; table row with hover actions; slide-over; modal; toast; skeleton; empty state.

**Motion:** 150–200ms ease-out for hover and focus; chart draw-in once; everything off under `prefers-reduced-motion`.

**Avoid:** glassmorphism on navigation, gradients on data, mascots, decorative imagery, fake account balances.

## 4.3 Honest constraint on what the dashboard can show

The references show "total balance" and cards. FynPet has no accounts, so a balance would be invented. The hero must be derived from real data: **net cash flow for the period** (income minus expenses), with savings rate and period comparison.

---

# PART 5 — Redesign order and first screen (Step 8)

1. **Application shell + Dashboard (desktop)** ← start here
2. Dashboard first-use state
3. Mobile shell + dashboard
4. Transactions (list, filters, add/edit sheet)
5. Budgets
6. Analytics
7. M-Pesa Import (plus the parser rework, since the UI depends on preview/reconciliation)
8. Fyn AI panel and consent
9. Settings and sign-in/sync
10. Light theme

**Why Shell + Dashboard first:** the shell and the dashboard define every token, component and layout rule the other nine screens will reuse. If they are wrong, everything after inherits the mistake. The dashboard also touches the most existing logic, so it is the best test of whether a Stitch design can be wired to the real calculations.

**Do before any implementation, in parallel with design (no UI change):** fix F-01 to F-03 and F-09/F-10. They are small, independent of the look, and affect trust in the numbers the new dashboard will show.

---

# PART 6 — Decisions I need from you

| ID | Decision | My recommendation |
|---|---|---|
| D-01 | Replace the approved warm-cream/indigo direction with dark-first "Midnight Ledger" (update `DESIGN.md`) | Yes, with a light theme afterwards so users who prefer light are not lost |
| D-02 | Keep the vanilla JS stack (restyle in place) | Yes. A framework rewrite adds risk without helping users. |
| D-03 | Fix F-01–F-03 before or alongside the redesign | Alongside, as a separate small change |
| D-04 | Remove the "Admin" role label and "Jeremy" default | Yes |
