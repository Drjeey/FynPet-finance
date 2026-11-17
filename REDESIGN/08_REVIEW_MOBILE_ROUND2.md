# Mobile design review, round 2 — Shell + Dashboard

Reviewed 16 November 2026 from `stitch_fynpet_kenyan_mobile2.zip` (screenshots plus exported HTML, read but not run).

## Which files are current

| Use | Folder | Copied to |
|---|---|---|
| **Master dashboard** | `mobile_dashboard_with_data_2` | `REDESIGN/reference/mobile_main/` |
| First use | `mobile_dashboard_first_use_2` | `REDESIGN/reference/mobile_first_use/` |
| More menu | `mobile_more_menu_2` | `REDESIGN/reference/mobile_more/` |
| Detail sheet (layout only) | `mobile_transaction_detail_sheet` | `REDESIGN/reference/mobile_detail_sheet/` |
| **Not used** | `mobile_dashboard_sync_error_2` and every `_1` folder | — |

## The nine round-1 fixes

| # | Fix | Result |
|---|---|---|
| 1 | Sync-error frame = master plus banner | **Failed again.** `sync_error_2` is still a different design: "Target Status: On Track", "+14% vs target", "Monthly Budgets", times like "Today, 2:15 PM", "Naivas Supermarket", "City Ride", no cash flow chart, no month comparison, truncated "Food & Groceri…". Not used. The banner is a single component, so I will specify it from the desktop frame instead of asking Stitch for a third try. |
| 2 | Banner fully visible | The banner is visible in that frame, but its text is truncated ("Your change…"). Moot, see 1. |
| 3 | Nav labels | **Done.** Home, Transactions, Add, Budgets, More. |
| 4 | "Add transaction", tile "Transactions" | **Done.** |
| 5 | Minimum 12 px | **Partly.** The 11 px label style dropped from 60 to 25 uses in the master and 24 in the sheet frame. |
| 6 | Hero chip shortened | **Done** ("+12.4%"). |
| 7 | First-use fixes | **Done.** Tiles fit ("No income yet…"), "Auto-categorized" and "30-day timeline" are gone, 7D/1M/3M selector present, chips wrap. The hero title and the "Awaiting first transaction" chip still wrap onto two lines. |
| 8 | Detail sheet frame | **Delivered, with a stacking bug.** The sheet shows merchant, amount, category, date, source and notes, but the floating nav sits in front of it (both use z-index 50), hiding the Edit and Delete buttons. |
| 9 | More menu | **Done.** No version string, no "securely", profile card fully visible, new footer line. |
| 10 | Solid nav (no blur) | **Not done.** `backdrop-blur` remains in the markup of all frames. |
| 11 | Motion | **Not delivered.** No keyframes and no reduced-motion rule in any mobile frame. The desktop frames already contain them; use those. |

## Verdict: approve with conditions

The master dashboard, first-use and More frames are sound: structure, colour rules, real categories and truthful copy. The remaining items are mechanical and I will list them as conditions in the Codex handoff instead of spending a third Stitch round.

## Conditions for implementation

1. **Sync-error state** = master frame plus the amber banner from the desktop design (`REDESIGN/reference/dashboard_main/`), placed under the top bar and above the pinned period control. Text must wrap or fit fully; the page content shifts down.
2. **Detail sheet** sits above the bottom nav (higher stacking order), the nav is hidden while it is open, Edit and Delete are fully visible, content scrolls if the phone is short, focus moves into the sheet and returns on close, closes on Escape, backdrop tap and the X.
3. **Nav background solid** (`#1A212C`, 1 px `#252E3B` border). No blur anywhere.
4. **12 px text floor.** Every 11 px label becomes 12 px.
5. **Hero title and chip** must not wrap: shorten to "Net cash flow" with the period shown by the pinned selector, or let the chip drop below the number.
6. **Recent rows:** the meta line must not be cut mid-word ("M-P…"): use "Imported" instead of "M-Pesa import", or allow two lines.
7. **Cash flow y-axis labels** must not sit over the last bars; draw them in the left gutter or behind the bars.
8. **Motion** follows the desktop frames (`REDESIGN/reference/dashboard_motion/`): same keyframes and timings, all off under reduced motion.
9. **First-use hero:** keep the title on one line, put "Awaiting first transaction" under the number.
10. **Data truthfulness** same rules as desktop: every figure computed from real data, no sample text, only real categories.
11. **Check the nav label "Transactions" fits at 320 px.** If it does not, shrink the Add button margin before shortening the label.
12. Prototype-only items must not ship: the Tailwind and Material Symbols CDNs, the inline sheet script, and the "Sample data" tag.
