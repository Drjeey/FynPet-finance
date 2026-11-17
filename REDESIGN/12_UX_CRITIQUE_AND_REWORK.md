# UX critique and rework brief

16 November 2026. Prompted by the user's feedback that the designs and layouts are poor and cause usability problems.

**What I got wrong.** My reviews checked claims, wording, text size and colour rules. They did not judge whether the screens are easy to use, and I approved layouts "with conditions" that are crowded and inconsistent. This document reviews the designs as a person using FynPet would. These are judgments from the screenshots, not user-tested.

## Problems, in order of impact

| # | Problem | Evidence | Why it hurts |
|---|---|---|---|
| 1 | **The Dashboard has too many things on it.** Nine blocks: hero, four tiles, cash flow, donut, budgets, transactions, emergency fund, streak, Fyn strip. The tiles repeat the hero's income and expenses. | Desktop and mobile Dashboard frames; the mobile page is about eight screens long | The first question ("how am I doing, what should I do?") is buried. Monarch is criticised for exactly this. |
| 2 | **The shell changes from page to page.** Different logo (broken image on Import), "FINTECH KENYA", a "PRO" badge, different top bars, different nav styles, a "Synced" chip beside "Saved on this device". | Import, Settings, Budgets, Analytics frames | Users lose their place and distrust the app. |
| 3 | **Adding a transaction is slow.** It is the most frequent task, yet the form has seven fields and starts with Amount plus a currency select. | Add transaction design (prompt 1) | Tracking apps die when logging takes more than a few seconds. |
| 4 | **Import review asks the user to check 58 rows with a seven-column editable table.** | `import_review` | Nobody will read 58 rows; the one row that needs attention is hidden among 57. The table is also wider than its card. |
| 5 | **Important actions are hidden or tiny.** Edit and delete only on hover (empty Actions column), 16 px icons at card edges on Budgets, "Get AI analysis" hidden behind the top bar on Analytics. | Transactions, Budgets, Analytics frames | Fails on touch and for keyboard users. |
| 6 | **Small, low-contrast text.** Dozens of 11–12 px labels in grey on near-black (31 in the desktop Dashboard, 60 on mobile before fixes, 24–27 on Import and Settings). | Code counts from every review | Hard to read, especially on phones outdoors. |
| 7 | **Jargon.** "Data ingress", "Automated ledger", "Pipelines", "Decryption failure", "FIRE", "Mathematical reconciliation". | Import, Analytics | A first-time user does not know what these mean. |
| 8 | **The mobile menu hides core flows.** Import (the app's main selling point) and Analytics sit under More. | Mobile shell | Core features are three taps away. |
| 9 | **Analytics gives a score without an action.** Four bars and a "Recommended focus" line; the table's "Saved" and "Net" are identical. | `analytics_desktop` | Information without a next step. |
| 10 | **Settings is one very long page with demo chrome inside it**, drawn narrow so type is tiny. | `settings_desktop` | Hard to scan; people cannot find the one setting they want. |

## What the rework changes

**Principles:** one main task per screen; answer one question per card; at most five things visible before scrolling; always one clear primary action; the same shell everywhere; larger text (14 px body on desktop, 16 px on phones; nothing below 12 px; secondary text in the lighter grey); plain words.

### 1. Dashboard — answer "how am I doing and what needs attention?"
Keep **six** things, in this order:
1. **This month** card: net cash flow (big), income and expenses as two small figures, change versus last month, one "Add transaction" button. No separate tiles.
2. **Needs attention** (only shown when there is something): "Entertainment is KES 800 over budget", "6 transactions not backed up", "Last import was 21 days ago". Each with one button.
3. **Cash flow** chart with 7D / 1M / 3M.
4. **Where your money went**: donut and top five categories.
5. **Budgets**: the three closest to their limit, with "left per day".
6. **Recent transactions**: last five, tap to open.
Move to other pages: Emergency fund and Savings streak to Analytics; Fyn AI stays reachable from the sidebar button and the top bar (not a card).

### 2. Adding a transaction — three taps
Amount first, with the numeric keyboard open; type defaults to Expense; date defaults to today; category suggested from the description or the last category used for that merchant; **description, notes, currency and date are collapsed under "More details"**. One primary button. "Save and add another" as the secondary. After saving, a toast with **Undo**.
On mobile the **Add** button opens a small sheet with two choices: **Add manually** and **Import a statement**, so Import is one tap away.

### 3. Import — review exceptions, not rows
Review screen shows:
- a plain summary ("We found 58 transactions. 51 look good, 6 are already in FynPet, 1 needs your check");
- **only the rows that need a decision** (one row here), each with one clear action;
- "51 look good" collapsed, with "Show all" for those who want to check;
- the totals check in one sentence;
- one button: "Save 51 transactions".
No inline category dropdowns on every row; open a row to change its category.

### 4. Transactions
One search field; filter chips visible; **always-visible "..." menu** per row (Edit, Delete) in a 44 px target, plus tap-to-open details; the date range and category filters in a panel; group rows by day on mobile; sticky header on long lists.

### 5. Budgets
Cards show the one thing that matters: **"KES 9,500 left · KES 680 a day"**. Over-budget cards offer "Raise limit" or "View transactions". Edit and delete in a 44 px "..." menu. Setting a budget shows last month's spend.

### 6. Analytics
Three plain questions as headings: **"Am I saving?"** (trend and savings rate), **"Am I covered if something goes wrong?"** (emergency fund in months), **"How close am I to my goal?"** (independence target). Drop the score and the redundant column; each section ends with one next step. Monthly table becomes cards on mobile.

### 7. Settings
Group into **Account**, **Preferences**, **Privacy and data** as tabs or a left list, one group visible at a time; save bar fixed at the bottom of the viewport.

### 8. Mobile navigation
Bottom bar: **Home, Transactions, Add, Budgets, More**. Add opens "Add manually / Import statement". More holds Analytics, Fyn AI, Settings. A small badge on More when something needs attention.

### 9. One shell
Sidebar and top bar exactly as on the Dashboard frame; no page may redraw them.

## What this means for earlier approvals

The Dashboard (desktop and mobile) that I marked "approved with conditions" falls under problem 1. I recommend **reopening it** before anyone builds Part B or Part C. Part A (sync fixes) is not affected and is already done.

Everything else is unchanged: no accounts or cards, only real categories, no false claims, the exact consent and privacy wording.

## Stitch prompt — UX rework, round 1 (highest impact first)

Paste into the same project. It covers the three screens people use every day: Dashboard, Add transaction, Import review. Run it before prompts A, B and C; I will rewrite those afterwards to match.

```
Rework three screens of the existing FynPet project for usability, keeping the dark theme, colours, fonts and the FP logo mark (draw "FP" as text in a lime rounded square; no image logo). Use ONE shell on all frames: left sidebar 248px (logo, lime "Ask Fyn AI" button without any badge, Dashboard, Transactions, Budgets, Analytics, M-Pesa Import, Settings, sync status at the bottom), top bar with the page title and date, one search field, a sync icon button and the avatar "Y". Goals: easier to understand at a glance, fewer elements, larger text (body 14px or more on desktop, 16px on mobile, nothing below 12px, secondary text #A3AEBD), plain words, one clear primary action per screen, every action reachable by touch and keyboard (44px targets, labelled). Real categories only: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other. FynPet has no bank accounts or cards. No claims about encryption, automatic sync, real time, Pro plans or version numbers. Add a "Sample data - design preview" tag.

FRAMES

A. "Dashboard - desktop" (1440). Only these blocks, in this order, with generous spacing (24px gaps):
 1. "This month" card (full width): label "This month", net cash flow "KES 31,400" in 48px, a mint chip "+12.4% vs October". Beside the number, two small figures: "Income KES 85,000" and "Spent KES 53,600". A slim bar showing the split. Right side of the card: lime button "Add transaction" and outlined "Import M-Pesa statement". No separate metric tiles.
 2. "Needs attention" card (shown only when needed): up to three rows, each with an icon, one sentence and one button: "Entertainment is KES 800 over budget" [View budget]; "6 changes aren't backed up yet" [Sync now]; "You haven't imported a statement since 21 October" [Import].
 3. Two columns: "Cash flow" chart card (segmented 7D / 1M / 3M, bars for income mint and spending coral, y-axis KES 10k/20k/30k, tooltip, one-line text summary) and "Where your money went" card (donut with KES 53.6k, legend of the top 5 categories with amount and percentage).
 4. Two columns: "Budgets" card (three budgets closest to their limit, each "Food & Groceries - KES 9,500 left - about KES 680 a day" with a bar; the over-budget one says "KES 800 over" with the word) and "Recent transactions" card (5 rows: icon, name, "Category - 16 Nov - Imported", amount right-aligned; click opens details; "View all").
 Remove emergency fund, savings streak, the Ask Fyn strip and the four tiles from this page.
B. "Dashboard - mobile" (375 x 812): same six blocks stacked; the first screen must show "This month" with the net figure and the "Add transaction" button; Needs attention as a swipe-free list; the page should be no longer than about four screens. Floating solid bottom nav: Home, Transactions, Add, Budgets, More.
C. "Dashboard - first use" desktop and mobile: "This month" shows KES 0 with the sentence "Add your first transaction or import a statement to see your month." and the two buttons; the other blocks are replaced by one friendly "Get started" card with three numbered steps (1 Add or import transactions, 2 Set a budget, 3 Ask Fyn a question) each with a button.
D. "Add transaction - mobile sheet" (375 x 812): bottom sheet opened by the Add button. Top: a very large amount input "KES 0" (48px) with the numeric keypad open, a segmented control "Expense / Income" (Savings and Transfer under a small "More types" link), a suggested category row of 4 chips (Food & Groceries, Transport, Utilities, Other) with a "More" chip, and one lime button "Save". A collapsed line "More details" that expands to description, date (default today), currency, notes. Secondary text button "Save and add another". Show also the state after saving: toast "Transaction saved - Undo".
E. "Add - mobile choice sheet": tapping the raised Add button first shows a small sheet with two large rows: "Add a transaction" (type it in) and "Import M-Pesa statement" (from a PDF); then frame D.
F. "Add transaction - desktop" (modal 480px) with the same simplified form and "More details" collapsed.
G. "Import review - desktop" (1440): stepper Upload / Review / Done at the top. Plain summary sentence: "We found 58 transactions. 51 look good, 6 are already in FynPet, 1 needs your check." A reconciliation line: "Totals match your statement: money in KES 85,000, money out KES 53,600." Section "Needs your check (1)": one row card: "Paybill 888820 - Unknown, 5 Nov, -KES 3,200" with a category chip "Other" and buttons "Change category" and "Skip this one". Section "Already in FynPet (6)" collapsed, with "Show". Section "Looks good (51)" collapsed, with "Show all 51". Sticky footer: "51 will be saved" and lime button "Save 51 transactions", outlined "Back". Only use the approved privacy wording where privacy appears: "The PDF is opened in your browser and never uploaded. The transaction text (dates, amounts, merchant and counterparty names) is sent through Netlify to Anthropic to be categorised after you agree. Phone numbers are removed first."
H. "Import review - mobile" (375 x 812): same content as cards, the "Needs your check" row first, sticky "Save 51 transactions" above the nav-free footer.

Motion (150-300ms, disabled under reduced motion): numbers count up once, bars rise once, sheets slide up, toast slides in.
```

## Questions for you

1. **Which screens feel worst to you?** Tell me and I will put them first.
2. **Reopen the Dashboard?** I recommend yes, using this brief.
3. After round 1 comes back, I will rewrite prompts A, B and C so they match the simpler design and the single shell.
