# FynPet UI

Mode: Operate. Implement only the user's approved Stitch screens. All UI is designed in Google Stitch; never invent screens in code.

## Direction (changed 16 November 2026, decision D-01)

Dark-first "Midnight Ledger" replaces the 10 November warm cream / indigo direction. Full rationale and tokens: `REDESIGN/01_AUDIT_AND_STRATEGY.md`. Progress: `REDESIGN/00_PROGRESS_TRACKER.md`.

Status: **direction approved. Approved screens: desktop Shell + Dashboard (with conditions; see `REDESIGN/05_CODEX_HANDOFF_SHELL_DASHBOARD.md`, references in `REDESIGN/reference/`).** Mobile Shell + Dashboard also approved with conditions (`REDESIGN/09_CODEX_HANDOFF_MOBILE_SHELL_DASHBOARD.md`; references in `REDESIGN/reference/mobile_*`). Mobile bottom nav: solid background, no blur; labels Home, Transactions, Budgets, More with a raised Add button. Page background as rendered in the approved frames is #111319. Until a Stitch design for a screen is approved, that screen keeps the existing 10 November implementation (`public/stitch.css`). The 10 November export in `../STITCH DESIGNS/export_2026-11-10/` is now legacy reference only.

Tokens: canvas #0A0D12, card #121720, raised #1A212C, border #252E3B; text #F4F6F8 / #A3AEBD / #7C8797 (tertiary only at 14px+); placeholders #8590A0 (`--ink-ph`, 5.0:1 on raised inputs). Money shows whole shillings or both cent digits ("KES 2,880.50"), never one. Display currency (Settings → "Show amounts in", `public/display.js`) changes only what is shown, at the person's saved rates: USD/EUR/GBP with 2 decimals, TZS/UGX whole, currency codes never symbols; differences are worked out from converted figures so each screen adds up; budgets and goals stay set in KES. Accent lime #C6F432 with #0A0D12 text for actions and selection only. Income #34D399, expense and over-budget #FB7185, savings #818CF8, warning #FBBF24. Colour carries meaning: green only for income, coral only for expense. Manrope for headings and numerals (tabular), Inter for UI text, self-hosted. Radius 20 / 12 / pill; 4px spacing scale; borders, not shadows. Secondary type >=12px; mobile input/body text >=16px; touch targets >=44px. Light theme follows after dark is approved.

## Structure (unchanged)

Desktop: shared sidebar with Dashboard, Transactions, Budgets, Analytics, M-Pesa Import, Settings and an obvious Ask Fyn AI action. Mobile: Home, Transactions, Add, Budgets, More. More exposes Analytics, Import, Settings and AI. Full-screen mobile AI hides bottom navigation. Dialogs and AI use scrollable content and reachable fixed actions, including short windows and virtual keyboards.

## Rules (unchanged)

Preserve real calculations, data, authentication and event delegation. Prototype demo figures, fake keyboard markup, state toolbars, unsupported statuses, CDN scripts and inline handlers must not be imported into production. No invented balances, cards, subscriptions, roles or AI insights: FynPet has no accounts and no admin features. Keep saved historical currency conversions and real sync states. Use exact local PDF / Netlify / Anthropic consent wording. Verify at 320, 375, 768, 1024 and 1440px.
