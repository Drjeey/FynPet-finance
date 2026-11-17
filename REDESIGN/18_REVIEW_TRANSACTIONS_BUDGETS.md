# Review: Transactions and Budgets

17 November 2026, from `stitch_fynpet_kenyan_finance_dashboard (4).zip` (about 30 new frames; screenshots plus exported code, read but not run). Usable frames are copied to `REDESIGN/reference/v3_*`.

## Verdict

**The two main pages are good enough to build from.** Several of the supporting frames (filters panel, filters sheet, mobile sheets) are broken or cropped in Stitch, so I will build those from the written spec in `17_STITCH_PROMPTS_ONE_AT_A_TIME.md`, using the look of the approved frames. I recommend approving with conditions instead of another Stitch round.

| Frame | Verdict |
|---|---|
| Transactions desktop (`transactions_desktop_3`) | Approve with conditions |
| Transactions mobile list (`transactions_mobile_2`) | Approve with conditions |
| Transactions row menu, empty, no results, delete confirm | Approve with conditions (copy and layout from spec) |
| Transactions filters panel and mobile filters sheet | **Defective**: build from spec |
| Budgets desktop (`budgets_desktop_2`) | Approve with conditions |
| Budgets mobile (`budgets_mobile`) | Approve with conditions |
| Budget new dialog, raise limit, edit, error, delete | Approve with conditions |
| Budget mobile sheets (new, action, delete confirm) | Cropped or missing screenshots: build from spec |

## What is good
- Transactions: filter chips, applied-filter pills with Clear all, category chip under each name, source with a dot, nowrap amounts in coral, mint and indigo, pagination in lime, and (mobile) rows grouped by date with Load more.
- Budgets: summary line, "KES 9,500 left · about KES 680 a day", word status ("Over limit", "KES 800 over", "Limit exceeded by 16%"), Raise limit and View transactions on the over-budget card, a "..." menu on every card, last-month hint with "Use this amount", disabled "(Already has a budget)" categories in the new dialog.

## Problems and how the build handles them
| # | Problem | Build rule |
|---|---|---|
| 1 | **Transactions desktop shows the page title twice** (top bar and a large heading) and **two search fields** (top bar and toolbar). | Title once in the top bar. On this page the toolbar search is the page search and the top-bar search is hidden. |
| 2 | **The "..." button is missing from every row** in the main frame (the Actions column is empty). It only appears in the row-menu frame. | Always-visible "..." (44 px) on every row with Edit and Delete. |
| 3 | **Filters panel frame is broken**: no panel background, text overlaps the table and the header buttons. Mobile filters sheet and budget mobile new sheet are cropped. | Built from my written spec: solid 360 px side panel (desktop) and bottom sheet (phone) with sticky Reset and Apply. |
| 4 | **Wrong titles and demo chrome** in mobile frames: title "Dashboard" with the date on the Transactions pages, a "Demo views / Active ledger" tab strip, a broken "Minimal app logo" image. | Real page titles; no demo strips; inline FP mark. |
| 5 | **Budgets desktop has a month switcher** (previous and next arrows), "14 days left", "November 2024", "Prorated to 30 Nov", a "Local DB Ready" chip and a search box promising "tags". | None of these exist. Show "November 2026" for the current month only, no arrows, no chip. |
| 6 | **Budgets mobile bottom nav says "Txns"** and the Transport bar is lime (the action colour) instead of amber. | Nav labels as built (Transactions). Warning is amber. |
| 7 | **Transactions mobile empty says "Saved locally & encrypted on this device".** False. | Remove; use "Saved on this device". |
| 8 | Wrong icons (a swap icon on Uber trip), icon set differs between frames. | Use the app's own category icons. |
| 9 | Mobile Budgets header ("November / 14 days remaining") collides with the New budget button. | Title row wraps; button below the heading on narrow screens. |
| 10 | Large "Add a budget" dashed card is taller than a real budget card. | Same height as a normal card. |
| 11 | Text under 12 px in several frames (up to 13 uses in some). | 12 px floor. |

## Build conditions (apply in the build)
- Shell, title and nav exactly as already built; the page highlights in the sidebar and the mobile nav.
- Real data everywhere: budgets from calc functions, "left per day" = remaining ÷ days left in the month, last-month spend from the previous calendar month, filters applied to the real list.
- New for Transactions: category and date-range filters with applied pills, Clear all, and results count; row "..." menu; row click opens the existing detail sheet; mobile list grouped by date with Load more.
- New for Budgets: "Raise limit" and "View transactions" on over-budget cards (View transactions opens Transactions filtered to that category and month); Edit and Delete in a "..." menu; the new/edit dialog with disabled already-budgeted categories and the last-month hint; delete says transactions are not affected.
- Accessibility: names on all icon buttons, menus and sheets with focus handling, status in words not colour only, 44 px targets.
- Prototype-only items do not ship: sample tag, CDN Tailwind and fonts, demo strips.
