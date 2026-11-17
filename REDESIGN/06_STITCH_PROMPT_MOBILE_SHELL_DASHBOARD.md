# Stitch prompt 2 — Mobile shell + Dashboard (375 × 812)

Run this in the **same Stitch project** (13575091748076985008) so it inherits the approved design system and the desktop frames stay untouched. Choose **Mobile**.

## A. Screen analysis

- **Purpose:** the Home tab on a phone. Most FynPet users in Kenya are on mobile, so this is the main experience, not a shrunken desktop.
- **User:** a person checking money in a few seconds, one-handed, often on a mid-range Android phone and a slow connection.
- **Must show (all real):** net cash flow, income, expenses, total saved, transaction count, 7D/1M/3M period, cash flow chart, spending by category, budgets, recent transactions, emergency-fund coverage, savings streak, Fyn AI entry, sync state.
- **Key actions:** add a transaction (always one tap away), import an M-Pesa statement, switch period, open a transaction to edit or delete it, ask Fyn, sync.
- **Navigation (fixed by the product):** Home, Transactions, Add, Budgets, More. More holds Analytics, M-Pesa Import, Settings, Fyn AI.
- **Differences from desktop:** one column; a floating bottom navigation bar; no sidebar and no hover (so edit and delete move into a detail sheet); the transactions table becomes a list; the first screenful must show the hero number and the Add action.
- **Lessons from the desktop reviews, built in from the start:** no accounts or balances, no encryption or auto-sync claims, only real category names, amounts never wrap, nothing under 12 px, sentence case labels, one plus sign on "Add" buttons, salary shown as Income.

## B. Copy-ready Stitch prompt

```
Design the MOBILE version of the FynPet Dashboard for the existing project. Reuse the approved FynPet design system and the look of the existing desktop frames exactly (dark theme, lime accent, Manrope for numerals and headings, Inter for text, same colours and component styles). Do not change the desktop frames. Create new MOBILE frames at 375 x 812.

Product context: FynPet is a personal finance app for Kenya. Currency is KES. It has NO bank accounts, cards or balances; never show them. Do not claim encryption, automatic sync, SIM or SMS reading, or real-time updates. Use only these category names: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other.

COLOURS (same as desktop): page background #111319, card #121720, raised #1A212C, border #252E3B, text #F4F6F8, secondary text #A3AEBD (never darker for text), lime accent #C6F432 with dark text #0A0D12 for primary actions, selection and focus only. Income and "money in" mint #34D399. Expense and over-budget coral #FB7185. Savings indigo #818CF8. Warning amber #FBBF24. Green only means income; coral only means expense or over budget.

TYPE: Manrope for headings and numbers (tabular figures), Inter for other text. Hero number 36px bold, card numbers 24px, section titles 18px semibold, body 14-16px, nothing below 12px. Sentence case labels, no all-caps. Currency amounts never wrap and are right-aligned in lists.

SHAPE: card radius 20px, inner 12px, pills fully round. Page side padding 16px, gap between cards 12px. Borders not shadows. All tap targets at least 44 x 44px. Respect the iPhone and Android safe areas (status bar at top, home indicator at bottom).

FRAMES TO CREATE (four):
1. "Mobile - Dashboard with data"
2. "Mobile - Dashboard first use"
3. "Mobile - Dashboard sync error" (identical to frame 1 except the banner)
4. "Mobile - More menu"

FRAME 1 - DASHBOARD WITH DATA (a long scrolling page, one column):
- Status bar area, then a top bar 56px: left the FynPet "FP" lime rounded-square mark (36px) with the title "Dashboard" and the date "Mon, 16 Nov" in secondary text; right a circular 44px sparkle icon button (Ask Fyn AI), a circular 44px sync icon button, and a 36px avatar with initial "Y". No role label, no name text.
- Directly under it a full-width segmented control, 44px tall, three options "7D", "1M" (selected, lime fill), "3M". It stays visible (sticky) while scrolling.
- Hero card "Net cash flow - This month": "KES 31,400" 36px bold, mint chip "+12.4% vs last month". A slim two-segment bar (income mint, expenses coral). Legend on two lines: "Income KES 85,000" and "Expenses KES 53,600", and a pill "Savings rate 18.2%". Under a hairline, the comparison "This month vs last month": two thin paired bars labelled "Income KES 85,000 vs 78,600  +8.1%" and "Expenses KES 53,600 vs 55,400  -3.2%". Two buttons at the bottom of the card side by side: lime "Add transaction" (icon plus text, one plus only) and outlined "Import M-Pesa".
- 2x2 grid of metric tiles (each about 165 x 112): "Income KES 85,000 +8.1%", "Expenses KES 53,600 -3.2% less spent", "Total saved KES 142,000 - 71% of savings target", "Transactions 64 - 58 imported". Small 32px rounded icon top left, no arrows.
- "Cash flow" card: title, small legend (Income, Expenses, Last month), grouped bars for four weeks (1-7 Nov, 8-14 Nov, 15-21 Nov selected, 22-28 Nov), y-axis labels KES 10k, 20k, 30k at 12px, a dashed previous-period line. The selected bar group shows a tooltip card above it with "15-21 Nov", "Income  KES 28,500", "Expenses  KES 14,200" (a space between label and value). Tapping a bar group selects it. Under the chart one line of text: "Expenses were highest on 14-21 November." and "Updated 2m ago".
- "Spending by category" card: a donut (about 160px) with "KES 53.6k" and "Expenses" at 22px centred with clear space from the ring, then a legend list below it (full width): Food & Groceries 34% KES 18,224; Transport 21% KES 11,256; Utilities 16% KES 8,576; Shopping 12% KES 6,432; Entertainment 10% KES 5,360; Other 7% KES 3,752. Ring colours: blue, violet, teal, amber, sand, slate (no pink, no lime, no mint). A "Details" link on the title row.
- "Budgets" card: title "Budgets" with "Manage" link. Show 3 rows plus a link "See all 4 budgets": "Food & Groceries  KES 9,500 left" with a mint bar at 62% and "62% used  Budget KES 25,000"; "Transport  KES 1,440 left" amber bar 88%; "Entertainment  KES 800 over" coral bar full width and the words "Exceeded by 16%". Footer: "Resets in 14 days" and a "New budget" link.
- "Recent transactions" card: title with "View all". A LIST, not a table. Each row 64px: a 40px rounded icon, then two lines: name (16px medium) and "Category - 16 Nov - Imported" (12px secondary); amount right-aligned on the first line, e.g. "-KES 4,850" with a coral minus and "+KES 85,000" in mint. Rows: Naivas Westlands (Food & Groceries, 16 Nov, Imported, -KES 4,850); Uber trip (Transport, 15 Nov, Imported, -KES 950); KPLC token purchase (Utilities, 14 Nov, Imported, -KES 2,000); Salary - Tech Kenya Ltd (Income, 12 Nov, Manual, +KES 85,000); Netflix subscription (Entertainment, 10 Nov, Manual, -KES 1,100). Footer "Showing 5 of 64 transactions". Tapping a row opens a bottom sheet (draw it as a small annotated overlay under the frame or as a fifth frame "Transaction detail sheet"): handle bar, merchant, amount, category, date, source, notes, and two buttons "Edit" (outlined) and "Delete" (coral outline). Edit and delete are NOT shown on rows.
- Two compact cards side by side (half width each): "Emergency fund" with a small progress ring and "2.4 months of expenses covered"; "Savings streak" with three dots and "3 months".
- A "Ask Fyn" card: input-style row "Ask Fyn about your spending..." with sparkle icon, and three suggestion chips that wrap: "Where did my money go this month?", "Am I over budget?", "How can I save more?". No invented insights.
- FLOATING BOTTOM NAVIGATION: a pill-shaped bar floating 12px above the bottom edge with 16px side margins, height 64px, background #1A212C with a 1px #252E3B border, subtle blur is NOT allowed. Five items: Home (active: lime icon and label on a soft lime-tinted pill), Transactions, Add (a 52px lime circle with a plus icon, raised slightly above the bar), Budgets, More. Labels 12px under icons. Leave 96px of bottom padding so content is never hidden behind it.

FRAME 2 - FIRST USE: same layout and the same skeleton. All values "KES 0" in secondary text; hero shows "Awaiting first transaction" and an empty bar; chart replaced by a dashed baseline and "No activity yet"; donut an empty ring with "KES 0"; budgets "No budgets yet" with a "Create budget" button; recent transactions "No transactions recorded yet. Saved on this device. Sign in to back up and sync." with a lime "Add your first transaction" and an outlined "Import an M-Pesa statement"; emergency fund "Set a target"; streak "0 months". Tile text: "Awaiting first credit or salary", "No debits recorded yet", "Track savings progress here", "Recorded this month". Sentence case labels everywhere.

FRAME 3 - SYNC ERROR: frame 1 plus an amber banner under the top bar: "Couldn't sync. Your changes are saved on this device." with a "Try again" button and a dismiss X. Nothing else changes.

FRAME 4 - MORE MENU: top bar title "More". A vertical list of 56px rows with icon, title, one-line description and a chevron: "Analytics - Spending trends and savings", "M-Pesa Import - Bring in a PDF statement", "Settings - Profile, rates and privacy", "Fyn AI - Ask about your recorded finances". Below, a card showing sync status "Saved on this device" with a green dot and an outlined button "Sign in to sync". Same floating bottom navigation with More active. No role label, no "Admin".

MICRO-ANIMATIONS (150-500ms, ease-out, all disabled under reduced motion): numbers count up once on first load; chart bars rise in a short stagger; donut sweeps once; budget bars fill; the over-budget bar pulses once; segmented control selection slides; floating nav active pill slides; the Add button presses down 1px and the bottom sheet slides up; sync dot pulses only while syncing; toast slides up above the nav.

ACCESSIBILITY: text meets AA contrast; no text below 12px; icon-only buttons have labels; colour is never the only signal (over budget uses the words "over" and "Exceeded by"); charts have a text summary.

Add a small removable tag in the top right of each frame: "Sample data - design preview".
```

## C. Image prompts

None needed. The logo mark already exists.

## D. Review checklist (when you share the zip)

1. Hero number and the Add action are both visible in the first screenful without scrolling.
2. Floating nav: five items, Add raised, active state clear, content never hidden behind it, safe-area spacing.
3. Every tap target is at least 44 px; no hover-only actions (edit and delete live in the detail sheet).
4. No amount wraps; nothing is under 12 px; secondary text is the lighter grey.
5. Transactions are a list, not a squeezed table; the category, date and source line fits at 375 px.
6. Colour rules hold: mint = income, coral = expense/over budget, lime = actions only.
7. Only real category names; no accounts, balances, encryption, SIM or real-time claims.
8. First-use, sync-error and More frames share one skeleton with frame 1.
9. Donut centre has clear space; tooltip has spacing; no leftover "Goal" chip; one plus sign per Add button.
10. Sticky period control does not cover content; works at 320 px width (ask me to test that after approval).
11. Motion is purposeful and finite, with a reduced-motion rule in the code.

## E. Implementation handoff

Not yet. After you approve I will write the Codex prompt for the mobile shell and dashboard (it replaces the current mobile bottom bar and "More" page, and must follow Part A and the desktop work).

## Notes on the run

- If Stitch creates desktop-sized frames, tell it: "Use mobile frames, 375 x 812."
- If it produces only some of the four frames, ask for the missing ones one at a time rather than re-running everything.
- Export the .zip again and send me the new file name (it may end in "(2)").
