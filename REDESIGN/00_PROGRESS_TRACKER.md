# FynPet redesign — progress tracker and decision log

Last updated: 16 November 2026

## Status by section

Statuses: NOT STARTED · UNDER AUDIT · AUDIT COMPLETED · STITCH PROMPT PREPARED · DESIGN GENERATED · DESIGN UNDER REVIEW · DESIGN APPROVED · IMPLEMENTATION IN PROGRESS · TESTING · COMPLETED

| Section | Audit | Stitch design | Approval | Implementation | Testing |
|---|---|---|---|---|---|
| 1. Shell + Dashboard (desktop) | AUDIT COMPLETED | DESIGN APPROVED (with conditions, 2026-11-16; project 13575091748076985008) | Approved | NOT STARTED (handoff ready: 05_CODEX_HANDOFF_SHELL_DASHBOARD.md; Part A sync fixes first) | NOT STARTED |
| 2. Dashboard first-use state | AUDIT COMPLETED | STITCH PROMPT PREPARED (Frame B, same prompt) | — | NOT STARTED | NOT STARTED |
| 3. Mobile shell + dashboard | AUDIT COMPLETED | DESIGN APPROVED (with conditions, 2026-11-16; reviews 07 and 08; handoff 09_CODEX_HANDOFF_MOBILE_SHELL_DASHBOARD.md; sync-error state specified from the desktop banner) | — | NOT STARTED | NOT STARTED |
| 4. Transactions | AUDIT COMPLETED | APPROVED (18_REVIEW) | BUILT | VERIFIED (1440/375/320, fake backend) | NOT COMMITTED |
| 5. Budgets | AUDIT COMPLETED | APPROVED (18_REVIEW) | BUILT | VERIFIED (1440/375/320, fake backend) | NOT COMMITTED |
| 6. Analytics | AUDIT COMPLETED | APPROVED with conditions (20_REVIEW) | BUILT | VERIFIED (1440/320, local server) | NOT COMMITTED |
| 7. M-Pesa Import (+ parser rework) | AUDIT COMPLETED | DESIGN UNDER REVIEW (upload ok; reading/review/done need revision, see 11_REVIEW; mobile missing) | — | NOT STARTED | NOT STARTED |
| 8. Fyn AI + consent | AUDIT COMPLETED | APPROVED with conditions (24_REVIEW) | BUILT | VERIFIED (geometry at 375/1440, fake backend) | NOT COMMITTED |
| 9. Settings + sign-in/sync | AUDIT COMPLETED | APPROVED with conditions (22_REVIEW) | BUILT | VERIFIED (1440/375/320, fake backend) | NOT COMMITTED |
| 10. Light theme | AUDIT COMPLETED | STITCH PROMPT PREPARED (prompt 7, optional) | — | NOT STARTED | NOT STARTED |
| 11. Display currency (new feature) | Not applicable (new) | APPROVED with conditions (26_REVIEW_DISPLAY_CURRENCY.md, export 7, 2026-11-19) | Approved | BUILT (public/display.js) | VERIFIED (1440/375, local server, sample data); NOT COMMITTED |
| Administration | Not applicable: no admin features exist | — | — | — | — |

Audit scope note: code review plus `npm test` and `npm audit`. No live browser, sync, AI or real-statement testing was done (see report).

## Open decisions

| ID | Decision | Status |
|---|---|---|
| D-01 | Replace warm-cream/indigo with dark-first "Midnight Ledger"; update `DESIGN.md` | **APPROVED 2026-11-16** (DESIGN.md updated; light theme to follow later) |
| D-02 | Keep vanilla JS, restyle in place | Recommended, awaiting you |
| D-03 | Fix sync/sign-out data-loss bugs (F-01–F-03) alongside the redesign | Recommended, awaiting you |
| D-04 | Remove "Admin" role label and "Jeremy" default | Recommended, awaiting you |

## Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-11-19 | Display currency changes only what is shown: records stay in their entry currency with fixed KES values, budgets stay in KES, conversions use the person's saved rates (cross pairs derived from them), and each screen adds up in the shown currency | Keeps saved history and budgets unchanged; no live-rate claims (PRODUCT.md) |
| 2026-11-19 | Display-currency designs (export 7) approved with conditions; picker and "back to KES" frames rejected as not needed; build conditions in 26_REVIEW_DISPLAY_CURRENCY.md | Patterns clear; Stitch drift handled as build corrections |
| 2026-11-16 | All UI is designed in Google Stitch only; Claude writes prompts and reviews | User's rule |
| 2026-11-16 | Dashboard hero is net cash flow, not "balance" | FynPet has no accounts; a balance would be invented |
| 2026-11-16 | Lime accent kept separate from income green | Brand and "good" must not look the same |
| 2026-11-16 | No admin screen designed | No admin functionality exists |
| 2026-11-16 | Shell + Dashboard approved with conditions; canonical frames copied to REDESIGN/reference/; page background is #111319 as rendered in the approved frames | Remaining glitches handled as corrections in the Codex handoff |
| 2026-11-16 | Implementation split: Part A sync/data fixes (F-01–F-03, F-09, F-10) first, then Part B dashboard | Charts must not show resurrected or lost data |
| 2026-11-16 | User chose to implement here, not in Codex. Part A done in this session (uncommitted, branch review/netlify-currency-foundation): F-01, F-02, F-03, F-09, F-10 fixed; new public/sync.js, public/csv.js, tests/sync.test.mjs; 40/40 tests pass; sync scenarios verified in the browser against a fake Supabase (not a real project) | Part B (desktop) next |
| 2026-11-16 | User said designs/layouts were poor and caused UX problems. Dashboard reopened; simplified Dashboard and Import review designed (12_UX_CRITIQUE_AND_REWORK.md, 13_REVIEW_UX_ROUND1.md). Earlier dashboard approvals superseded for layout; Part A unaffected | Round 2 prompt in 13 |
| 2026-11-17 | UX rework round 2 reviewed (14_REVIEW_UX_ROUND2_AND_NEXT_PROMPTS.md): Dashboard desktop+mobile, first use, Import review desktop+mobile, Add mobile sheet approved with conditions; Add choice sheet and Add desktop dialog to redo (prompt R3); prompts for remaining pages rewritten in the simplified style | Next: R3, then Transactions, Budgets, Analytics, Settings, Fyn AI |
| 2026-11-17 | R3 reviewed: Dashboard (desktop, mobile), first use, Add flow (choice sheet, mobile sheet, desktop dialog) and Import review (desktop, mobile) approved with build conditions (15_DESIGN_APPROVAL_AND_BUILD_CONDITIONS.md) | Build can start; Transactions, Budgets, Analytics, Settings, Fyn AI still to design |
| 2026-11-17 | Built in this session (uncommitted): dark theme tokens (public/midnight.css), self-hosted Manrope/Inter, FP logo + favicon, sidebar/top bar, desktop Dashboard + first use + Needs attention + sync banner, new calc.js helpers with tests (45/45 pass). Checked in the browser at 320, 375, 768, 1024, 1440 against a fake Supabase. Not yet built: Add flow redesign, mobile bottom nav/Dashboard layout, Import review, other pages (now dark but old layout) | Next: Add transaction flow, then mobile |
| 2026-11-17 | Add flow built (uncommitted): amount-first form with Expense/Income and More types, quick category chips and More, More details collapsed, description-based category suggestion, Save and add another, Undo toast, Add choice sheet on the mobile Add button, same form for Edit; pure rules in public/addflow.js with tests (50/50 pass); verified in the browser at 1440 and 375 | Next: mobile Dashboard/nav layout, Import review |
| 2026-11-17 | Mobile built (uncommitted): FP top bar with Home title, floating solid bottom nav (Home, Transactions, raised Add, Budgets, More; labels fit at 320), transaction detail sheet (Edit/Delete) from Recent rows, redesigned More page with sync/sign-in card, toast above nav. Verified at 320, 375 and 1440 in the browser; 50/50 tests pass | Next: Import review (needs the parser rework), then Transactions, Budgets, Analytics, Settings, Fyn AI as designs arrive |
| 2026-11-17 | Import review built (uncommitted): Upload, Reading, Review (summary, totals check, needs-your-check rows, already-in-FynPet, looks good, sticky save), Done, Failed, honest history; date range now applied; duplicates by receipt and by day+amount+description; failed parts can be retried; import chunks cost 0.2 of a daily AI question; pure rules in public/importreview.js; 60/60 tests. Verified in the browser with a generated test PDF and a fake AI endpoint, not a real Safaricom statement or the real AI | Totals check needs a real statement to confirm the Total-line format |
| 2026-11-16 | D-01 approved: dark-first "Midnight Ledger" replaces cream/indigo | User approval; references are dark fintech |

## Known issues (from the register)

HIGH: F-01 deletes reappear after sync · F-02 multi-device edits lost/overwritten · F-03 sign-out can clear unsynced data · F-07 AI-extracted statement figures unreconciled · F-20 hosted environment unverified.
MEDIUM: F-04, F-05, F-06, F-08, F-09, F-10, F-11, F-12, F-13, F-15.
LOW: F-14, F-16, F-17, F-18, F-19, F-21.
Full detail: `01_AUDIT_AND_STRATEGY.md`.

## Dependencies

- Import screen design depends on the parser rework (preview and reconciliation need new data).
- Sync fixes (F-01–F-03) should land before the redesigned dashboard is shown to real users, so new charts do not display resurrected data.
- Every screen depends on the Shell + Dashboard design system being approved.

## Unresolved questions

1. Dark only at launch, or dark and light together?
2. Is a collapsible 72px icon rail wanted at tablet widths?
3. Should the AI quota be shown to users?
