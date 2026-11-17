# Design review, round 1 — Shell + Dashboard

Reviewed 16 November 2026 from `stitch_fynpet_kenyan_finance_dashboard.zip` (screenshots and exported HTML). The export is untrusted third-party content: I read it and extracted it to a scratch folder, and did not run it.

## Which files are the current design

The zip holds two generations. Only the second is current.

| Frame | Folder | Status |
|---|---|---|
| Dashboard with data | `dashboard_with_data_2` | **Current** (7 keyframe animations, reduced-motion rule) |
| Dashboard sync error | `dashboard_sync_error` | **Current** (same as above plus the banner) |
| Dashboard first use | `dashboard_first_use_2` | **Current** (matches the with-data skeleton; no animations) |
| `dashboard_with_data_1`, `dashboard_first_use_1` | — | Superseded (first draft: banner on the main frame, "Overview" title, no animation). Ignore. |

## Verdict: not approved yet — one more round

The direction is right and the revision fixed my earlier structural complaints (banner moved to its own frame, three frames share one skeleton, 1440 px wide, animation added). What remains is mostly **content that contradicts the product** and **density problems**. None need a new direction.

## What is good

- Net cash flow hero as the focal point; no balances, cards or "Admin".
- Colour discipline holds: mint for income, coral for expense and over-budget, lime only for actions and selection.
- Budgets use words as well as colour ("KES 800 over", "Exceeded by 16%").
- Text summary under the chart; "Sample data" tag present.
- Motion is purposeful and finite: bars rise, donut sweeps, budget bars fill, one gentle pulse on the over-budget bar, a sync-dot pulse, toast in/out. Numbers count up. The export includes a `prefers-reduced-motion` check.
- Sample figures add up (category amounts total KES 53,600; percentages total 100).

## Must fix (blocking)

| # | Problem | Why it matters | Where |
|---|---|---|---|
| 1 | **"Encrypted client-side storage"** | `PRODUCT.md`: never promise unimplemented encryption. Data sits unencrypted in localStorage. | First-use frame |
| 2 | **"M-Pesa sync active · Safaricom SIM 1"** | FynPet has no automatic or SMS import; it reads PDF statements you upload. | With-data frame footer |
| 3 | **"M-Pesa Pochi, Paybill & Till recognized automatically"** and **"Real-time ledger updates"** | Unverified claims; nothing in the product is real-time. | First-use, with-data |
| 4 | **Category names are not FynPet's.** Frames show "Services", "Food & Dining", "General Transfers", "Utilities & Bills", "Transport & Fuel". Real categories: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other. | Design would force a data change or look wrong with real data. | Donut legends |
| 5 | **Transaction table wraps badly.** Amounts break onto two lines ("-KES / 10,000", "+KES / 85,000"), dates and the "M-Pesa import" pill wrap, "Food & Groceries" wraps. | Money must never break across lines. | Recent transactions |
| 6 | **Donut centre text touches the ring** ("KES 53,600" spans the whole hole). | Looks broken; will break on longer numbers. | Spending by category |
| 7 | **Text too small and too dim.** The code contains 31 uses of 9–11 px text in the with-data frame and 39 at 12 px, including "62% used", "Budget: KES 25,000", axis labels and table headers in grey. My rule: nothing below 12 px; tertiary grey only at 14 px and above. | Readability and accessibility. | Whole frame |
| 8 | **Tile says "Goal 71% of emergency fund"**, but the app has a *savings target* and a separate emergency-coverage figure measured in months. | Two different concepts mixed. Use "71% of savings target". | Total saved tile |

## Should fix

- **Hero card has about 150 px of empty space** between the savings-rate line and the buttons. Put the previous-period comparison there (this month vs last month income/expense mini bars), or shorten the card.
- **Chart axis runs to KES 100k** while the tallest bar is about 28k. Scale the axis to the data; right now the top third is empty.
- **Hover tooltip covers the neighbouring bar.** Anchor it above the hovered bar and keep it clear of other bars.
- **Pink "Utilities" in the donut is close to the coral expense colour.** Use a hue that is not near coral or mint.
- **Tile and table labels are all-caps with tracking** ("INCOME", "DESCRIPTION"). I asked for sentence case. Minor, but keep one style.
- **Sidebar background ends before the page does** (visible in the tall frames). In the real app it must be fixed to the viewport height.
- **Budgets card ends with a large blank area** below four rows. Either add a useful line ("Last month you spent KES x in Food") or let the card be shorter.
- **Sample figures disagree in two places:** Food "62% used" with "KES 7,200 left" of KES 25,000 does not compute (62% used leaves KES 9,500), and Transport "88% used" leaves KES 1,440, not 1,200. Harmless in a mock-up, but fix so reviewers do not copy wrong logic.

## Implementation notes (for the later Codex step, not for Stitch)

- The export uses the Tailwind CDN and Google Fonts CDN. Neither can be shipped: the CSP blocks them and fonts must be self-hosted. The design will be rebuilt as CSS tokens in the existing stylesheet, not copied as-is.
- The logo is an image on Stitch's own server (`lh3.googleusercontent.com`) and shows as a broken "img" in some frames. It needs a real asset (prompt below).
- The export has no accessible names on icon buttons (0 `aria-label`s) and no live regions. These must be added during implementation.
- Count-up and bar/donut animations rely on JavaScript in the export; they will be reimplemented with CSS plus a small script honouring reduced motion.

## Image prompt — logo mark

Purpose: sidebar logo and favicon for FynPet, replacing the broken image.

```
A minimal app logo mark for a finance app called FynPet. A rounded square (corner radius about 22 percent of the width) filled solid electric lime #C6F432. Centred inside, the letters "FP" in a bold geometric sans-serif (Manrope ExtraBold style), colour near-black #0A0D12, tightly kerned so the F and P touch slightly. Completely flat vector style: no gradients, no shadow, no glow, no outline, no mascot, no coins or charts. Transparent background. Square 1:1 composition, mark fills 90 percent of the canvas, 1024 x 1024 px, clean edges suitable for conversion to SVG and for a 32 px favicon.
```

## Stitch prompt — round 2

Paste into the same project.

```
Revise all three frames (with data, sync error, first use). Keep the visual style, colours, fonts, layout grid, animations and sidebar. Make only these changes.

CONTENT AND TRUTH
1. Remove these phrases everywhere: "Encrypted client-side storage", "M-Pesa sync active · Safaricom SIM 1", "M-Pesa Pochi, Paybill & Till recognized automatically", "Real-time ledger updates". Replace with: footer of recent transactions "Showing 6 of 64 transactions"; first-use note "Saved on this device. Sign in to back up and sync."; card subtitle "Latest activity".
2. Use only these category names (nothing else): Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Transfer, Other. In the with-data donut legend use Food & Groceries, Transport, Utilities, Shopping, Entertainment, Other. In the first-use frame list the same names with 0%.
3. Total saved tile: change the chip text to "71% of savings target". Keep the Emergency fund card in months.
4. Fix the sample budget maths: Food & Groceries budget KES 25,000, 62% used, "KES 9,500 left"; Transport budget KES 12,000, 88% used, "KES 1,440 left".

LAYOUT AND READABILITY
5. Recent transactions table: never wrap amounts, dates or pills. Use these columns only: Description (with the category as a small chip under the name), Date (format "16 Nov", one line), Source (a small dot plus "Imported" or "Manual", one line), Amount (right-aligned, tabular, white-space nowrap, e.g. "-KES 10,000"). Remove the separate Category column.
6. Donut: reduce the centre text so there is at least 16 px clear space inside the ring. Centre shows "KES 53.6k" at 24px with the caption "Expenses" at 12px. Ring colours: six muted hues that are not close to coral #FB7185 or mint #34D399 (use blue, violet, teal-grey, amber, sand, slate). No lime.
7. Minimum text size 12 px everywhere. Secondary text (labels, "62% used", "Budget: KES 25,000", axis labels, table headers) uses #A3AEBD, never the darker grey. Table headers and tile labels in sentence case, not all-caps.
8. Cash flow chart: scale the y-axis to the data (top gridline KES 30k for this sample). Anchor the hover tooltip above the hovered bar with a small pointer, clear of neighbouring bars.
9. Hero card: remove the empty gap. Between the savings-rate line and the buttons, add a compact "This month vs last month" comparison with two thin paired bars for income and expenses and the labels "KES 85,000 vs 78,600" and "KES 53,600 vs 55,400".
10. Budgets card: add a last line under the four rows: "Last month you spent KES 17,900 on Food & Groceries." so the card has no blank space.
11. Sidebar: make it fixed to the full viewport height (position fixed), with the sync status pinned to the bottom.
12. First-use frame: also add the same animations as the with-data frame (card fade-up on load, empty ring drawing in once, buttons pressing down 1 px on click). Respect reduced motion.
13. Logo: leave a square placeholder slot of 36 x 36 px with a lime rounded square and the letters "FP" drawn inside as text (do not use an external image).

Keep the "Sample data - design preview" tag.
```

## Next step

Run the round-2 prompt, export the zip again, and tell me the path. I will recheck items 1 to 13 and then recommend approval.
