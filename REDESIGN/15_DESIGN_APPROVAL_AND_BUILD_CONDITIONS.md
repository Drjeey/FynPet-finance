# Approval of the core flows, and conditions for the build

17 November 2026. Reviewed from `stitch_fynpet_kenyan_finance_dashboard (3).zip` after prompt R3.

## Approved (with the conditions below)

| Flow | Frames (copied to `REDESIGN/reference/`) |
|---|---|
| Dashboard, desktop, with data | `v2_dashboard` (code only; screenshot is in `13` review round) |
| Dashboard, desktop, first use | `v2_dashboard_first_use` |
| Dashboard, mobile, with data and first use | `v2_mobile_dashboard`, `v2_mobile_first_use` |
| Add choice sheet (mobile) | `v2_add_choice` |
| Add transaction, mobile sheet | `v2_add_mobile` |
| Add transaction, desktop dialog (standard, error, expanded) | `v2_add_desktop` |
| Import review, desktop and mobile | `v2_import_review`, `v2_import_review_mobile` |
| Shell, detail sheet, More menu (mobile) | `mobile_detail_sheet`, `mobile_more` |

R3 fixed the choice sheet (full titles, no "AUTO" badge, no "Encrypted" line, correct nav labels), the desktop dialog (now complete: amount, type, category chips, More details, Cancel and Save, with error and expanded states) and the mobile Import review (title "M-Pesa import", no "No PII sent", no "Client-side parser", "Totals check").

## Not fixed by Stitch: handled in the build
1. **Mobile Dashboard**: "Needs attention" text is cut off and Recent transactions show the word "Category" and "Impo…". The build uses real data and wraps text onto two lines, with the button under the sentence.
2. **Choice sheet and Add dialog backgrounds** show pet-themed sample rows ("Pet Food & Treats", "Services", "Care"), a "Remaining budget" line and KPI cards with "Total balance". The build uses the real Dashboard behind them. **No balances anywhere.**
3. **Mobile Add sheet**: the symbol keyboard in the frame is only a mock-up. Use `inputmode="decimal"` on the amount field so the phone shows its numeric pad. "Save and add another" must stay visible with the keyboard open (sticky footer, sheet scrolls).
4. **Desktop dialog**: delete the "KES Ledger" label; show **either** category chips **or** the dropdown, not both (chips with a "More" chip that opens the full list); the three states (standard, error, expanded) are real states, not tabs; drop the demo tab bar.
5. **Import review mobile**: show the summary ("We found 58 transactions…") **before** "Needs your check"; make "Skip this one" a visible secondary button; drop any "Mark verified" leftover in the code.
6. **Import review desktop**: replace "Algorithmic classifications" with "Suggested categories", remove "Duplicate prevention"; keep bottom padding so the sticky footer hides nothing.
7. **Dashboard**: 12 px minimum text, tooltip above the bar, donut centre with 16 px clear space, "KES 0" without ".00" in first use, remove "Nothing is uploaded to cloud storage" and "KES Tabular".
8. **Add toast**: "Transaction saved · Undo" is in the mobile sheet code but not drawn as a frame; build it as a toast above the nav with a working Undo.
9. **Accessibility** (all frames): accessible names on icon buttons, chart text summaries, live region for toasts and sync status, focus handling for sheets and dialogs.
10. The exports use the Tailwind and Google font CDNs and Material Symbols; none of these ship. The build uses CSS tokens, self-hosted fonts and the existing SVG icon module.

## Order of build (here, in this repository)
1. Shell and design tokens (dark theme, self-hosted fonts, logo as inline SVG).
2. Desktop Dashboard and first use.
3. Add transaction (desktop dialog, mobile sheet and choice sheet) and Undo.
4. Mobile Dashboard and bottom nav.
5. Import review (this depends on the parser rework: summary, totals check, duplicates, exceptions).

## Still to design in Stitch
Transactions, Budgets, Analytics, Settings and account dialogs, Fyn AI and consent (prompts T, B, A, S, F in `14_REVIEW_UX_ROUND2_AND_NEXT_PROMPTS.md`), then the light theme.
