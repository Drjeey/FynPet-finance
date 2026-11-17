# Codex handoff — Mobile Shell + Dashboard (Part C)

> **Update 16 Nov 2026:** the mobile Home layout here predates the UX rework. Wait for the new mobile Dashboard frames (see `13_REVIEW_UX_ROUND1.md`) before building. The shell, detail sheet and More page notes still apply.


Mobile design approved with conditions on 16 November 2026. This is **Part C**. Do it after:
- **Part A** (sync/data integrity) is merged, and
- **Part B** (desktop shell and dashboard, `05_CODEX_HANDOFF_SHELL_DASHBOARD.md`) is merged, because Part C reuses its tokens, fonts, data mapping, chart code, motion and banner. Do not duplicate them.

Branch: `feat/mobile-midnight`. Scope: viewport below 1024 px (320, 375, 768). Desktop must not change.

Reference files (open them; do not copy their HTML, which loads Tailwind, Google Fonts and Material Symbols from CDNs):
- `REDESIGN/reference/mobile_main/` — master dashboard (`screen.png`, `code.html`)
- `REDESIGN/reference/mobile_first_use/`
- `REDESIGN/reference/mobile_more/`
- `REDESIGN/reference/mobile_detail_sheet/` — layout only; has a stacking bug (see conditions)
- `REDESIGN/reference/dashboard_main/` — the sync-error **banner** component (the mobile sync-error frame was rejected)
- `REDESIGN/reference/dashboard_motion/` — keyframes and timings (the mobile frames contain no motion code)
- Rules: `DESIGN.md`, `PRODUCT.md`, `REDESIGN/08_REVIEW_MOBILE_ROUND2.md` (conditions)

## Prompt for Codex

```
You are working in the FynPet repo (vanilla JS, Netlify Functions, Supabase). Branch: feat/mobile-midnight. Prerequisite: Parts A and B are merged (tokens in public/midnight.css, self-hosted Manrope/Inter, dashboard data mapping, chart drawing, motion, sync banner). If they are not, stop and say so.

Implement the APPROVED mobile Home (Dashboard), mobile shell and More page for viewports < 1024 px. Match the reference frames. Do not change desktop (>= 1024 px), calculations (calc.js maths), auth, sync, event delegation (data-click + ACTIONS) or the CSP.

INSPECT FIRST
public/index.html (#mob-nav, #page-more, #sidebar mobile behaviour, #page-dashboard, modals, advisor panel), public/app.js (mobGoPage, goPage, toggleMobSidebar, toggleAdvisor, the viewport() helper in BOOT that sets --viewport-height and inert states, openEditTx, confirmDel, renderRecentTx, renderStatCards, renderBudgetStatus, drawMainChart, drawDonutChart, setChartPeriod), public/midnight.css and stitch.css, DESIGN.md (mobile rules), the five reference folders.

SHELL
- Top bar 56 px: FP mark (inline SVG from Part B), title ("Dashboard", or the current page name) with the Nairobi date ("Mon, 16 Nov"), 44 px icon buttons for Ask Fyn AI (toggleAdvisor) and Sync (syncNow), a 36 px avatar with the saved initial (default "Y" from "You"; no role). Respect the top safe area.
- Pinned period control (7D / 1M / 3M, 44 px) under the top bar; it must sit BELOW the top bar and the sync banner, never under them. Same setChartPeriod behaviour as desktop.
- Floating pill bottom navigation: Home, Transactions, Add, Budgets, More. Pill 64 px high, 16 px side margins, 12 px above the bottom plus safe area. SOLID background #1A212C with a 1px #252E3B border: no blur, no transparency, no backdrop-filter. Add is a 52 px lime circle, raised slightly, opens openAddTx (does not navigate). Active item: lime icon and label on a soft lime-tinted pill that slides between items. Labels 12 px, exactly "Home", "Transactions", "Budgets", "More". Page content gets bottom padding so nothing hides behind the nav.
- At 320 px verify "Transactions" fits. If it does not, reduce the pill's inner padding or the Add button's margins first; do NOT rename the label.
- The full-screen Fyn AI chat on mobile still hides the bottom nav and keeps its virtual-keyboard handling.
- Sidebar markup stays for desktop; on mobile it remains hidden/inert as today.

HOME (master frame: REDESIGN/reference/mobile_main)
One column, 16 px side padding, 12 px gap. Cards in this order, all from real data using the Part B mapping (do not hard-code anything):
1. Hero "Net cash flow - This month": number 36 px, delta chip "+12.4%" (hide when no previous data), income/expense split bar, legend on separate lines, savings-rate pill, "This month vs last month" paired bars (hide when previous period empty), buttons "Add transaction" (lime, openAddTx) and "Import M-Pesa" (goPage mpesa). The title and the chip must NOT wrap: title is "Net cash flow" with the period shown by the pinned selector, or the chip drops under the number.
2. 2x2 tiles: Income, Expenses, Total saved ("<n>% of savings target" or "Set a savings target" link), Transactions ("n imported"). Tile subtitles fit without truncation.
3. Cash flow chart (canvas, existing chartSeries): selected bar group shows the "15-21 Nov  Peak week  In 28.5k  Out 14.2k" style strip from real data; tap selects a bar group; y-axis labels in the left gutter or behind the bars, never over bars; text summary line; "Updated <relative time>" only if a real timestamp exists, otherwise omit.
4. Spending by category: donut ~160 px, "KES 53.6k" at 22 px with 16 px clearance, legend list below with real category labels.
5. Budgets: up to 3 rows then "See all n budgets" (goes to Budgets); words as well as colour for over budget.
6. Recent transactions as a LIST (not a table): 64 px rows, 40 px icon, name, meta line "Category - 16 Nov - Imported" (use "Imported" or "Manual", never cut mid-word: allow a second line), amount right-aligned and never wrapping (+KES in mint, minus in coral). Tapping a row opens the detail sheet. No hover actions.
7. Emergency fund (months, from emergencyFundMonths) and Savings streak, side by side.
8. "Ask Fyn" card: input row opens the advisor with the typed or chosen question pre-filled (existing consent flow before any send); chips wrap onto several lines.
First use (no transactions): REDESIGN/reference/mobile_first_use; same skeleton; "Add your first transaction" and "Import an M-Pesa statement"; keep the hero title on one line and put "Awaiting first transaction" under the number.

DETAIL SHEET (layout: reference/mobile_detail_sheet)
- Bottom sheet, rounded top 24 px, background #121720, handle bar, title "Transaction detail", merchant, amount (coral for expense, mint for income), rows: Category, Date, Source ("Imported from M-Pesa statement" or "Added manually"), Notes ("No notes" when empty). Buttons "Edit" (openEditTx) and "Delete" (confirmDel, which uses the existing confirm modal), 48 px tall, side by side, always fully visible.
- STACKING: the sheet must be above the bottom nav (the reference has both at z-index 50 and the nav hides the buttons). Hide or lower the nav while the sheet is open.
- Behaviour: open from a row tap; backdrop dims the page; close on X, backdrop tap and Escape; focus moves into the sheet and returns to the tapped row; focus is trapped inside; body scroll is locked; the sheet scrolls internally on short screens (320 x 568 and with the virtual keyboard); respect the bottom safe area. Implement with a data-click action added to ACTIONS and a dialog (role="dialog", aria-modal, aria-labelledby). No inline script.

MORE PAGE (reference/mobile_more)
Title "More"; profile card ("Your ledger", "KES - Kenya", "Local only" or the signed-in email and sync state); rows with icon, title and description, 56 px: Analytics, M-Pesa Import (PDF badge), Settings, Fyn AI; sync card ("Saved on this device" / real states, "Sign in to sync"); footer line "Your records stay on this device until you sign in." (show only when not signed in). No version string, no "securely", no role.

SYNC-ERROR STATE
Reuse the banner from Part B (amber, "Couldn't sync. Your changes are saved on this device.", "Try again" = syncNow, dismiss X). On mobile it sits below the top bar and above the pinned period control; text wraps, never truncated; content shifts down. It appears only while the real sync status is 'error'.

TOKENS AND TYPE
Same as desktop (Part B / DESIGN.md). Minimum text 12 px (the reference uses 11 px labels; use 12 px). Inputs and body text 16 px on mobile. Sentence case. Secondary text colour #A3AEBD. Tap targets >= 44 px. No all-caps labels. Colour meaning: mint income only, coral expense/over budget only, lime actions and selection only.

MOTION (copy timings from reference/dashboard_motion; off under prefers-reduced-motion)
Count-up once per load, bars rise in a short stagger, donut sweep, budget fill, one pulse on over-budget bar, sliding segmented control and nav pill, sheet slides up, sync dot pulses only while syncing, toast slides above the nav. Canvas charts animate with requestAnimationFrame and skip animation on resize.

ACCESSIBILITY
Accessible names on every icon-only control (Ask Fyn AI, Sync, profile, Add transaction, Close, Edit, Delete). Nav is a <nav aria-label="Mobile navigation"> with aria-current on the active item. Charts have a text summary and a visually hidden data table. Live region (polite) for toasts and sync status. Focus rings visible. Contrast AA (report measured numbers). Page must be usable with the screen reader announcing amounts as "KES 4,850 spent".

CONSTRAINTS
No inline scripts or handlers, no CDN assets (replace Material Symbols with the existing SVG icon module public/icons.js, adding icons as needed), no new dependencies, no demo data, no "Sample data" tag, escape all data with escHtml(). Do not delete pages or functions. The Transactions, Budgets, Analytics, Import and Settings pages keep their current layout; they must stay usable beside the new mobile shell and bottom nav (add bottom padding, no overlap).

VALIDATE
1. npm run check and npm test pass.
2. Browser checks at 320x568, 360x640, 375x812, 390x844, 768x1024 and a landscape phone 812x375: no horizontal scroll, no wrapped amounts, no text under 12 px, nothing hidden behind the bottom nav, nav label "Transactions" fits at 320.
3. Empty data, one transaction, and 200+ mixed transactions (throwaway local profile only): hero, tiles, chart, donut, budgets and list agree with calc.js; donut percentages sum to 100.
4. Detail sheet: open, Edit, Delete (confirm modal), Escape, backdrop, focus return, focus trap, short screen, virtual keyboard simulation (visualViewport resize).
5. Keyboard and screen-reader pass; reduced motion on and off.
6. Force a failed sync (offline): banner position, text, Try again, dismiss.
7. Fyn AI: open from top bar and More; full-screen chat hides the nav; no data sent before consent.
8. Console has no CSP violations or errors; desktop (>= 1024 px) screenshots before and after are identical.
9. Screenshots at 375 for Home with data, first use, banner, sheet and More; list every difference from the references.

REPORT
List changed files, what was verified with evidence, and what was NOT verified (real iOS and Android devices, software keyboard, real account, real statement). Do not claim tests you did not run. Open a PR; do not merge.
```

## Order of work

1. Part A: sync and data integrity (`feat` none, branch `fix/sync-integrity`).
2. Part B: desktop shell and dashboard.
3. Part C: this handoff.
4. Next Stitch sections: Transactions (list, filters, add/edit sheet), then Budgets, Analytics, M-Pesa Import (with the parser rework), Fyn AI and consent, Settings and sign-in, light theme.
