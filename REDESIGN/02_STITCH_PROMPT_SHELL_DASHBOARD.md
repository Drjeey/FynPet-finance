# Stitch prompt 1 — Application shell + Dashboard (desktop 1440×900)

Use Stitch in **Desktop** mode. Paste the prompt in the box below as one message. Generate **two frames**: A (with data) and B (first-use, no data). If Stitch produces only one, paste prompt B separately and tell it to keep the same design system.

## A. Screen analysis

- **Purpose:** the first screen after opening FynPet. Answers "how am I doing this period, and what should I do next?"
- **User:** an individual in Kenya tracking money by hand and through M-Pesa statements.
- **Must display (all real, computed today):** income, expenses, net cash flow (income minus expenses), total saved, savings rate, transaction count, change versus the previous period, cash flow over time (7 days / 1 month / 3 months), spending by category, budget progress, recent transactions, emergency-fund coverage in months, savings streak.
- **Actions:** add transaction, import M-Pesa statement, ask Fyn AI, search transactions, export CSV, sync, switch period, open any transaction to edit or delete.
- **Existing problems:** four equal-weight cards with no focal point; empty first-use screen shows four zeros and a blank chart; hard-coded "Jeremy / Admin"; milestones card is visually disconnected.
- **Not shown on purpose:** bank balances, cards, subscriptions. FynPet has no accounts, so these would be invented.

## B. Copy-ready Stitch prompt

```
Design the desktop Dashboard and application shell for "FynPet", a personal finance web app for people in Kenya. Currency is Kenyan shillings, written "KES 48,250" (no decimals unless non-zero cents). The app records transactions manually or by importing M-Pesa PDF statements, tracks category budgets and savings, and has an AI assistant called "Fyn". It has no bank accounts or cards, so do NOT show account balances, credit cards or subscriptions.

CANVAS: Desktop, 1440 x 900. Dark theme.

VISUAL DIRECTION: premium, calm, numbers-first fintech. Near-black surfaces, one lime accent, large rounded cards, big bold numerals, pill-shaped controls. Reference mood: modern dark fintech dashboards with a hero metric card, a bar chart with a floating tooltip and a donut with a legend. Do not use glassmorphism, gradients on charts, mascots, stock photos or decorative illustrations.

COLOUR TOKENS (use exactly):
- Page background #0A0D12
- Card surface #121720, raised surface (inputs, chips) #1A212C, 1px border #252E3B
- Text primary #F4F6F8, secondary #A3AEBD, tertiary #7C8797 (only 14px or larger)
- Accent lime #C6F432 for primary buttons, active navigation and selected states. Text on lime is #0A0D12.
- Income (money in) mint #34D399. Expense (money out, over budget) coral #FB7185. Savings indigo #818CF8. Warning amber #FBBF24.
- Colour carries meaning: green only for income, coral only for expense or over-budget. Never use lime to mean "good".

TYPOGRAPHY: Manrope for headings and all numbers (bold, tabular figures), Inter for all other text. Hero number 44px bold; card numbers 28px bold; page title 28px semibold; body 14px; labels and captions never below 12px, sentence case, no all-caps tracking.

SHAPE AND SPACING: card radius 20px, inner elements 12px, buttons and chips fully rounded. 4px spacing scale. Page padding 32px, gap between cards 20px, card padding 24px. Use borders, not shadows.

SHELL:
1. Left sidebar, 248px wide, surface #121720, full height.
   - Top: FynPet logo (a simple lime rounded square with the letters "FP") and the wordmark "FynPet" with a small caption "KES ledger".
   - Directly under it, a full-width lime pill button with a sparkle icon: "Ask Fyn AI".
   - Navigation list, each 44px tall with a line icon and label: Dashboard (ACTIVE: lime text on a subtle lime-tinted pill), Transactions, Budgets, Analytics, M-Pesa Import, Settings.
   - Bottom: a sync status row with a small dot and the text "Saved on this device" and a secondary outlined button "Sign in to sync".
2. Top bar (height 72px, no background, bottom border): left shows the page title "Dashboard" and today's date "Monday, 16 November 2026" in secondary text. Right shows a 320px search field with the placeholder "Search transactions", a circular icon button for "Export CSV", a circular icon button for "Sync", and a profile chip with a round initial "Y" and the name "You". No role label.

DASHBOARD CONTENT (12-column grid):

Row 1
- Hero card (6 columns): label "Net cash flow · This month". Value "KES 31,400" at 44px. Beneath it a delta chip "+12.4% vs last month" in mint. Below that a slim two-segment horizontal bar showing income vs expenses proportions, with the legend "Income KES 85,000" (mint dot) and "Expenses KES 53,600" (coral dot). A line of secondary text: "Savings rate 18.2%". At the bottom of the card two buttons: lime "+ Add transaction" and outlined "Import M-Pesa".
- Four compact metric tiles in a 2x2 grid (6 columns total): "Income" KES 85,000 (mint delta chip +8.1%), "Expenses" KES 53,600 (coral delta chip -3.2% shown as a decrease), "Total saved" KES 142,000, "Transactions" 64. Each tile has a small icon in a 36px rounded square at top left and a small diagonal arrow at top right.

Row 2
- Cash flow chart card (8 columns). Title "Cash flow", subtitle "Income and expenses". Top-right segmented control with three options: "7D", "1M" (selected, lime fill), "3M". Grouped vertical bars per day-range: mint for income, coral for expenses, rounded tops, thin grid lines in #252E3B, y-axis labels in secondary text. Show one bar group hovered with a floating tooltip card listing the date range, Income and Expenses values. A faint dashed line shows the previous period total for comparison, with a legend entry "Last month".
- Spending by category card (4 columns). A donut chart with the total expenses in the centre ("KES 53,600", caption "Expenses"), and a legend list of the top 5 categories with a colour dot, name, percentage and amount: Food & Groceries 34%, Transport 21%, Utilities 16%, Shopping 12%, Other 17%. Use a restrained set of six muted hues and grey for Other.

Row 3
- Budgets card (4 columns). Title "Budgets" with a "Manage" text link. Four rows, each with category name, "KES 7,200 left" and a progress bar. States: Food 62% used (mint bar), Transport 88% (amber bar with the text "KES 1,200 left"), Entertainment over budget (coral bar, text "KES 800 over"), Utilities 40% (mint).
- Recent transactions card (8 columns). Title "Recent transactions" with a "View all" link. A table with columns: Description (with a small category chip beneath), Date, Source (pill: "Manual" or "M-Pesa import"), Amount (right-aligned, tabular; expenses as "-KES 1,250" in primary text with a coral minus, income as "+KES 85,000" in mint). Six rows with realistic Kenyan items: Naivas Westlands, Uber trip, KPLC token purchase, Salary, Netflix, M-Shwari deposit. On row hover, show small Edit and Delete icon buttons at the right (44px hit areas).

Row 4 (full width, 12 columns, slim)
- A card with three parts side by side: "Emergency fund: 2.4 months of expenses covered" with a small progress ring; "Savings streak: 3 months" with three filled dots; and a Fyn AI prompt area with an input "Ask Fyn about your spending" and three suggestion chips ("Where did my money go this month?", "Am I over budget?", "How can I save more?"). Do not write invented AI insights as facts.

STATES (add as small annotated variations if possible):
- Loading: skeleton blocks with the same shapes as the cards.
- Sync error: an amber banner under the top bar: "Couldn't sync. Your changes are saved on this device." with a "Try again" button.
- Over budget: coral bar and a coral "over" amount, never colour alone: also include the word "over".

INTERACTION NOTES: hover on cards lifts the border to #3A4658; focus rings are 2px lime with 2px offset; buttons are at least 44px tall; chart tooltips appear on hover and on keyboard focus. Segmented control switches the whole dashboard period.

ACCESSIBILITY: all text meets WCAG AA contrast against its surface; every icon button has a text label (tooltip); chart cards include a one-line text summary under the chart such as "Expenses were highest on 14-21 November." Respect reduced motion.

LABEL the page with a small removable tag in the bottom-right corner: "Sample data - design preview".

DELIVER: Frame A "Dashboard - with data". Then Frame B "Dashboard - first use": same shell, all numbers shown as "KES 0" in tertiary text, chart area replaced by a dashed baseline and the message "No activity yet", donut replaced by an empty ring, and in place of the table a centred panel with two large buttons: "+ Add your first transaction" (lime) and "Import an M-Pesa statement" (outlined), plus the note "Your records stay on this device until you sign in." Keep every other element identical.
```

## C. Image-generation prompts

None required. The brand mark is a simple geometric logo, and decorative imagery would work against the numbers-first direction. If you later want a first-use illustration, ask me and I will write a separate prompt.

## D. Review checklist (when you share the Stitch result)

Send me screenshots of Frames A and B and I will check each of these:

1. Hero reads as one number first; nothing competes with it.
2. Only mint means income, only coral means expense or over budget; lime used for actions and selection only.
3. Contrast: text on lime, tertiary text, chart labels.
4. Every item on the sidebar and top bar matches FynPet's real pages and actions (no balances, cards, "Admin", or invented AI insights).
5. Table amounts are right-aligned and tabular; hover actions have 44px targets.
6. Over-budget and approaching-limit states do not rely on colour alone.
7. Chart legend, tooltip and previous-period line are legible; the text summary is present.
8. The empty state gives two obvious next steps and is not mistaken for an error.
9. Spacing follows the 4px scale and is consistent between cards.
10. It still looks right if the sidebar collapses to a 72px icon rail at 1024px width (I will ask for that variant next).

## E. Implementation handoff

Not yet. I will write the Codex implementation prompt only after you approve the design, as required.
