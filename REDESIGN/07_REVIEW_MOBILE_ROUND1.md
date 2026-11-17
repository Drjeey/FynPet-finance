# Mobile design review, round 1 — Shell + Dashboard

Reviewed 16 November 2026 from `stitch_fynpet_kenyan_mobile.zip` (screenshots plus exported HTML, read but not run). Screenshots are small, so text-level judgments about size come from the code, not the pictures.

## Frames received

| Frame | Verdict |
|---|---|
| `mobile_dashboard_with_data` | **Good base.** Use as the master. |
| `mobile_dashboard_first_use` | Close; minor fixes. |
| `mobile_dashboard_sync_error` | **Rejected.** It is a different design, not frame 1 plus a banner. |
| `mobile_more_menu` | Close; minor fixes. |
| Transaction detail sheet | **Not delivered as a frame.** A hidden sheet exists in the with-data code (`detailSheet`, Edit and Delete) but I could not review it visually. |

## Verdict: not approved yet — one revision round

## What works (with-data frame)

- One column in the right order, with the hero number and the Add action visible in the first screenful.
- Floating pill navigation with a raised lime Add button; clear active state; safe-area class present.
- Real category names, with a donut legend whose figures match the desktop (KES 18,224 and so on).
- Budgets use words as well as colour ("KES 800 over", "Exceeded by 16%").
- Transactions are a list, not a squeezed table; rows carry category, date and source; amounts are right-aligned.
- Includes "This month vs last month" comparison, emergency fund, savings streak and the Ask Fyn card with prompts.
- No false claims (encryption, SIM sync, "real-time") in any of the four frames.

## Must fix

| # | Problem | Where |
|---|---|---|
| 1 | **Sync-error frame is a different generation.** Hero shows "MoM Baseline", "Sync M-Pesa" (implies automatic sync), "Total Income 3 credits logged", "Avg KES 837 / day"; categories "Home Utilities, Dining Out, Digital Subs, Health & Care" (not real); transactions show "Visa", "Equity Bank", "Virtual Card" and clock times (FynPet tracks no cards or banks); different amounts from the main frame; title-case labels. | sync_error |
| 2 | **The banner is half hidden** behind the sticky top bar ("Couldn't sync. Your change…"). | sync_error |
| 3 | **Text below 12 px.** The code uses the 11 px label style 60 times in the with-data frame (41 in sync-error, 21 in first-use). | all |
| 4 | **Bottom nav says "History"**; the product (and desktop) says "Transactions". | all |
| 5 | **"Add entry" / "Add Entry"**; the product says "Add transaction". | with-data, sync_error |
| 6 | **Detail sheet is not shown** as a frame, so I cannot confirm it holds the merchant, amount, category, date, source, notes, and Edit and Delete buttons. | with-data |
| 7 | **Navigation bar uses a blur background** (`backdrop-blur`). I asked for none: it hurts legibility and is costly on mid-range Androids. | all |
| 8 | **More menu: "FynPet v1.0.4"** is an invented version, and the profile card is clipped at the top under the header. | more |
| 9 | **Motion not delivered.** There are no keyframes and no reduced-motion rule in any mobile frame. Desktop already has them, so this is fixed by reusing those at implementation, but the frames should show them for review. | all |

## Should fix

- Hero title "Net cash flow · This month" and the "+12.4% vs last month" chip each wrap to two lines, which crowds the top of the card. Shorten the chip to "+12.4%".
- First-use: legend "Income KES / 0" wraps; tile subtitles are cut with an ellipsis ("Awaiting first credit or s…", "Track savings progress…"); the footer says "Auto-categorized", which is only true for AI-imported rows, so drop it; "30-day timeline" is not a real option (periods are 7D/1M/3M).
- Ask Fyn chips are cut at the right edge in first-use; fine if they scroll, but add a visible hint or let them wrap as specified.
- Segmented 7D/1M/3M control looks clipped under the top bar in the full-page screenshot. Confirm it sits below the bar when pinned.
- Tile labels "Income" / "Expenses" are fine; "Records" should say "Transactions".
- More menu footer text "securely" in "back up and sync your ledger securely": remove "securely" (no security claim we can prove).

## Notes for implementation (not Stitch's job)

- The export uses the Tailwind CDN, Google Material Symbols and Google Fonts; all will be replaced with CSS tokens, the existing SVG icon module and self-hosted fonts. The detail sheet's inline script becomes a normal `data-click` action.
- Add accessible names to icon buttons and an accessible table alternative to each chart.
- Mobile Fyn AI stays a full-screen view that hides the bottom nav (per `DESIGN.md`).

## Stitch prompt — mobile round 2

Paste into the same project.

```
Revise the four MOBILE frames. Keep the style, colours, fonts and layout of "Mobile - Dashboard with data", which is the master.

1. "Mobile - Dashboard sync error": delete and recreate it as an exact copy of "Mobile - Dashboard with data" (same content, same numbers, same labels) with only an amber banner added directly below the top bar and above the segmented control: "Couldn't sync. Your changes are saved on this device." with a "Try again" button and a dismiss X. The banner must be fully visible, not covered by the top bar; the page content simply moves down. Do not use the words "Sync M-Pesa", "MoM Baseline", "Visa", "Equity Bank", "Virtual Card", "credits logged" or "debits logged", and use only these categories: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other.
2. Bottom navigation labels, in every frame: "Home", "Transactions", Add (raised lime circle), "Budgets", "More". Replace "History" with "Transactions". Make the navigation background solid #1A212C with a 1px #252E3B border: no blur or transparency.
3. Rename every "Add entry" or "Add Entry" button to "Add transaction". Rename the tile "Records" to "Transactions".
4. Minimum text size 12px everywhere; replace every 11px label with 12px. Secondary text colour #A3AEBD.
5. Hero card: shorten the delta chip to "+12.4%" so the title "Net cash flow - This month" and the chip sit on one line each without wrapping.
6. First use: remove "Auto-categorized" and "30-day timeline"; the cash flow card shows the 7D/1M/3M selector like the main frame. Make the tile subtitles fit without truncation (shorten to: "No income yet", "No expenses yet", "Savings appear here", "Recorded this month"). Make the legend "Income KES 0" stay on one line. Let the Ask Fyn chips wrap onto several lines.
7. Create a fifth frame, "Mobile - Transaction detail sheet": the with-data dashboard dimmed behind a bottom sheet that rises from the bottom (handle bar, rounded top corners 24px, background #121720). Contents: "Naivas Westlands", amount "-KES 4,850" in coral, a list of rows: Category "Food & Groceries", Date "16 Nov 2026", Source "Imported from M-Pesa statement", Notes "No notes". Two buttons, each 48px tall, full width side by side: "Edit" (outlined) and "Delete" (coral outline). A close X in the top right.
8. More menu: remove "FynPet v1.0.4 - Offline-first personal finance"; replace with the single line "Your records stay on this device until you sign in." Remove the word "securely". Move the profile card down so it is fully visible below the header (nothing clipped), and show only the initial "Y", the title "Your ledger" and "KES - Kenya", with the "Local only" chip.
9. Add the same micro-animations as the desktop frames and write them into the prototype code: count-up on first load, bars rising with a short stagger, donut sweep, budget bars filling, one single pulse on the over-budget bar, sliding selection in the segmented control and the bottom nav, bottom sheet sliding up, sync dot pulsing only while syncing. All of it disabled under prefers-reduced-motion.

Keep the "Sample data - design preview" tag.
```

## Next step

Run it, export the zip, and send me the file name. I will check the nine items and the new detail-sheet frame, then recommend approval.
