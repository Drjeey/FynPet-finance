# Stitch prompts — all remaining pages

Run these **in the same Stitch project** (13575091748076985008), **one prompt at a time, in this order**, so each page inherits the approved dashboard design. After each run, export the .zip and send me the path; I review it before you start the next one.

| # | Prompt | Frames | New capability needed in code? |
|---|---|---|---|
| 1 | Transactions, add/edit transaction, delete confirm | desktop + mobile | Category and date filters (small) |
| 2 | Budgets and budget dialog | desktop + mobile | "Last month you spent" hint (small) |
| 3 | Analytics | desktop + mobile | None |
| 4 | M-Pesa Import (new review-before-saving flow) | desktop + mobile | **Yes: parser rework, preview, reconciliation** |
| 5 | Fyn AI panel, chat, consent | desktop + mobile | None |
| 6 | Settings, sign-in, account/sync dialogs | desktop + mobile | Replaces browser pop-ups with designed dialogs |
| 7 | Light theme (optional, last) | dashboard + one page | Theme switch |

## Global rules (already inside every prompt; keep them if you edit one)

Same design system as the approved frames (dark, `#111319` page, `#121720` cards, lime `#C6F432` only for actions/selection, mint income, coral expense and over-budget, indigo savings, amber warning; Manrope numerals and headings, Inter text). Learned from the dashboard reviews: **no bank accounts, cards or balances; no encryption, automatic-sync, SIM or real-time claims; only the real categories (Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other); amounts never wrap; nothing under 12 px; sentence-case labels; one plus sign on "Add" buttons; solid navigation with no blur; salary shown as Income; all sample figures must add up; sample-data tag on each frame.** Desktop frames 1440 wide, mobile 375 × 812. Reuse the approved sidebar, top bar, floating mobile nav and components exactly.

---

# PROMPT 1 — Transactions, add/edit, delete

## Analysis
Today: header with count, "Export CSV", "Add transaction"; filter chips (All, Income, Expenses, Savings, Transfers); search; table (Transaction, Category, Amount KES, Actions); 12-per-page pagination; add/edit dialog (amount + currency, type, description, category, date, notes, inline error); delete confirmation. Problems: no category or date filter, hover-only actions, source info buried. New (needs small code change): a Filters panel with category and date range.

## Stitch prompt
```
For the existing FynPet project, design the TRANSACTIONS page and its dialogs. Follow every rule of the approved FynPet design system and the approved Dashboard frames (dark theme, same sidebar, top bar and floating mobile navigation with "Transactions" active). Context: personal finance app for Kenya, currency KES; NO bank accounts, cards or balances; no encryption/auto-sync/real-time claims; only these categories: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other. Amounts never wrap; nothing under 12px; sentence case; one plus sign on Add buttons; sample figures consistent. Add a small "Sample data - design preview" tag.

Create these frames:

1. "Transactions - desktop" (1440). Page title "Transactions" with subtitle "64 transactions". Top right: outlined "Export CSV", lime "Add transaction". Below, a card containing: a toolbar with filter chips "All" (selected, lime), "Income", "Expenses", "Savings", "Transfers"; a search field "Search transactions"; a "Filters" button that shows a count badge "2". Under the toolbar, applied-filter pills "Food & Groceries x", "1 Nov - 30 Nov x" and a "Clear all" text button. Table columns: Description (merchant name with the category as a small chip underneath), Date ("16 Nov 2026", one line), Source ("Imported" or "Manual" with a small dot), Amount (right-aligned, tabular, nowrap: expenses "-KES 4,850" with coral minus, income "+KES 85,000" mint), Actions column with Edit and Delete icon buttons (44px targets, visible on row hover AND on keyboard focus, each with a tooltip label). 8 realistic rows (Naivas Westlands, Uber trip, KPLC token purchase, Salary - Tech Services Ltd (Income), Netflix subscription, M-Shwari deposit (Savings), Chama contribution (Transfer), Pharmacy - Goodlife (Health)). Footer: "Showing 1-12 of 64" and pagination (previous, 1 2 3 ... 6, next) with the current page in lime.
2. "Transactions - filters panel" (1440): same page with a right-side panel 360px wide, header "Filters" with a close X; sections "Date range" (From, To date inputs and quick pills "This month", "Last month", "Last 3 months"), "Category" (multi-select checkbox list of the ten categories), "Amount" (min and max KES inputs); footer buttons "Reset" (outlined) and "Apply filters" (lime).
3. "Transactions - empty" (1440): the page with no transactions: dashed card, icon, "No transactions yet", "Add one manually or import an M-Pesa statement. Saved on this device.", buttons "Add your first transaction" (lime) and "Import an M-Pesa statement". And "Transactions - no results": search "xyz", "No transactions match your search", "Clear filters" button.
4. "Add transaction - desktop dialog" (1440, dimmed page behind): centred modal 520px: title "Add transaction", close X. Fields: Amount (large input with a currency select KES/USD/EUR/GBP/TZS/UGX attached) and Type (segmented: Expense, Income, Savings, Transfer; Expense selected); Description (placeholder "e.g. Naivas Supermarket, Uber, Salary"); Category select (the ten categories) and Date; Notes (optional). Helper text under currency when not KES: "Estimated KES value: KES 6,500 at 1 USD = KES 130 (your saved estimate)". Footer: "Cancel" (outlined) and "Save entry" (lime). Show a second variant "Add transaction - error" with an inline error banner "Enter an amount greater than zero." and the Amount field outlined in coral with the same words under it. A third variant "Edit transaction" with title "Edit transaction" and the button "Save changes".
5. "Delete transaction - confirm" (desktop dialog 420px): coral outline icon, title "Delete transaction?", text "Naivas Westlands will be permanently deleted. This cannot be undone.", buttons "Cancel" and a coral "Delete".
6. "Transactions - mobile" (375 x 812): top bar "Transactions" (FP mark, title, count "64"); a horizontally scrollable row of filter chips (All, Income, Expenses, Savings, Transfers) with a "Filters" icon button at the right; search field (16px text, 44px tall); transactions as a LIST grouped by date headers ("Today", "Yesterday", "14 Nov"): 64px rows (40px icon, merchant name 16px, "Category - Imported" 12px, amount right-aligned, nowrap). Tapping a row opens the approved detail sheet (do not redraw it). Floating bottom nav with Transactions active. A "Load more" button at the end.
7. "Add transaction - mobile sheet" (375 x 812): bottom sheet 92% height, rounded top 24px, handle bar, title "Add transaction", close X. Same fields stacked, 16px inputs, 48px controls, type as a 4-segment control, a sticky footer with full-width lime "Save entry" above the safe area. Also show it with the on-screen keyboard open (keyboard drawn as a plain grey block so the sticky footer and the focused field stay visible).
8. "Filters - mobile sheet" (375 x 812): same content as frame 2 as a bottom sheet with sticky "Reset" and "Apply filters".

Motion (150-300ms, ease-out, all disabled under reduced motion): row hover fade-in of actions, chip selection slides, panel/sheet slides in, new row highlights once after saving, toast slides up.
```

## Review checklist
Actions reachable by keyboard and touch; no wrapped amounts; filter state visible and clearable; errors in words not only colour; sheet footer stays visible with the keyboard; the same icons and chips as the dashboard.

---

# PROMPT 2 — Budgets

## Analysis
Today: header "Budgets - Monthly category spending limits" and "+ New Budget"; three summary cards (Total budget, Total spent with "n over", Remaining with On track/Over); a grid of budget cards (category icon and name, "KES x/month", spent, left/over, progress bar, "% used", Edit, Delete); empty state; dialog with category and monthly limit. One budget per category (duplicates are blocked). New (small): show last month's spend for the chosen category when setting a limit, as Monzo does.

## Stitch prompt
```
For the existing FynPet project, design the BUDGETS page and its dialog, following the approved design system, the approved Dashboard frames and the Global rules (no accounts or cards; only the ten real categories; amounts never wrap; nothing under 12px; sentence case; one plus sign on Add buttons; consistent sample figures; "Sample data - design preview" tag).

Frames:
1. "Budgets - desktop" (1440): title "Budgets", subtitle "Monthly category spending limits for November", lime button "New budget". Three summary cards: "Total budget KES 57,000" (caption "This month"), "Total spent KES 41,120" (caption "72% of budget", chip "1 over" in coral), "Remaining KES 15,880" (caption "Available to spend", chip "On track" mint). Below, a 3-column grid of budget cards. Each card: 40px category icon tile, category name, "KES 25,000 per month", spent amount large, a right-aligned status "KES 9,500 left" (mint) or "KES 800 over" (coral, with the words), a progress bar (mint under 80%, amber 80-99%, coral over), "62% used" and "Resets in 14 days", and Edit and Delete icon buttons (44px, labelled). Cards: Food & Groceries 25,000 / spent 15,500 (62%); Transport 12,000 / 10,560 (88%, amber); Entertainment 5,000 / 5,800 (over by 16%); Utilities 15,000 / 6,000 (40%). A dashed "Add a budget" card at the end of the grid.
2. "Budgets - empty" (1440): "No budgets yet", "Set a monthly limit for a category to see how much is left.", lime "Create budget".
3. "Budget dialog - new" (1440, dimmed page): modal 480px, title "New budget", Category select (the ten categories; categories that already have a budget are disabled with the note "Already has a budget"), Monthly limit (KES) input, and a helper line under it: "Last month you spent KES 17,900 on Food & Groceries." with a small "Use this amount" text button. Footer "Cancel" and lime "Create budget". Variant "Edit budget" (title "Edit budget", button "Save changes") and variant with an error "A budget for this category already exists." Also a delete confirmation dialog: "Delete budget?" "Food & Groceries budget will be permanently deleted. Your transactions are not affected.", "Cancel" and coral "Delete".
4. "Budgets - mobile" (375 x 812): top bar "Budgets"; summary as one compact card (Total budget, Spent, Remaining) with a thin overall progress bar; budget cards as a single column list (same content as desktop, Edit and Delete as a "..." menu with 44px target that opens a small action sheet); a lime "New budget" button at the top right of the title row; floating bottom nav with Budgets active. Show the empty state too ("Budgets - mobile empty").
5. "Budget - mobile sheet": bottom sheet for New/Edit budget with sticky "Create budget" footer.

Motion: progress bars fill from 0 once, the over-budget bar pulses once, cards lift 2px on hover, sheet slides up. All disabled under reduced motion.
```

## Review checklist
Words as well as colour for over budget; duplicate-category rule explained, not just blocked; last-month hint honest (no invented data); delete says transactions are not affected.

---

# PROMPT 3 — Analytics

## Analysis
Today: "Get AI Analysis" button; FIRE (financial independence) progress card (saved vs target, bar, four stats: progress %, years at current rate, average monthly savings, target); 6-month savings trend chart; Financial health score with four factors (savings rate, emergency fund in months, budget adherence, expense/income ratio); 6-month summary table (Month, Income, Expenses, Saved, Rate, Net). Problems: canvas charts with no text alternative; table too wide for phones. "FIRE" is jargon for most users, so label it "Independence target" with a plain explanation.

## Stitch prompt
```
For the existing FynPet project, design the ANALYTICS page, following the approved design system, Dashboard frames and Global rules (no accounts/cards; real categories only; amounts never wrap; nothing under 12px; sentence case; consistent sample figures; "Sample data - design preview" tag).

Frames:
1. "Analytics - desktop" (1440): title "Analytics", subtitle "Understand your recorded spending and savings"; right side outlined button with sparkle icon "Get AI analysis" (opens Fyn; it requires sign-in and consent, so add a small caption "Uses Fyn AI after you agree"). Rows:
 - Card "Independence target" (plain-language subtitle "How close your savings are to the amount that could cover your living costs. A common rule is 25 times yearly expenses."): "KES 142,000 saved" and "Target KES 3,000,000", a thick progress bar at 4.7%, four small stats: "Progress 4.7%", "At current rate 6.8 years" (with the footnote "Based on your average monthly savings"), "Average monthly savings KES 20,900", "Target KES 3,000k".
 - Left card "6-month savings trend" (net savings per month, bars Jun-Nov with mint for positive and coral for negative, KES axis 0 to 30k, selected month tooltip, one-line text summary "Savings were highest in October."). Right card "Financial health": four rows each with a name, value and bar, plus a word status (not colour only): "Savings rate 18% - Good", "Emergency fund 2.4 months - Low (aim for 6)", "Budget adherence 75% - Good", "Spending vs income 63% - Healthy". Each row has a small info icon that explains the measure in one sentence.
 - Card "Monthly summary" table: Month, Income, Expenses, Saved, Savings rate, Net; 6 rows Nov to Jun going back; amounts right-aligned, nowrap; negative net in coral with a minus sign; a "View as table" toggle on the chart cards for screen readers.
2. "Analytics - empty" (1440): all cards present but with "No data yet", dashed chart baselines, health factors showing "Not enough data", and a lime "Add transaction" and outlined "Import an M-Pesa statement".
3. "Analytics - mobile" (375 x 812): top bar "Analytics" and an icon-only "Get AI analysis" button (labelled), independence card, trend chart (6 bars, tap to select, tooltip above), health factors as a vertical list, and the monthly summary as a LIST of 6 cards (month heading; Income, Expenses, Saved, Net in a 2x2 grid) instead of a table. Floating bottom nav shows "More" active (Analytics lives under More). Also "Analytics - mobile empty".

Motion: bars rise once with stagger, progress bars fill once, tooltip fades. Disabled under reduced motion.
```

## Review checklist
"Independence target" wording clear; no invented projections beyond "at current rate"; each chart has a text summary; the table becomes cards on mobile; status always in words.

---

# PROMPT 4 — M-Pesa Import (new flow)

## Analysis
Today: drop zone, privacy note, password and date range, five fake-feeling progress steps, a result box, history. Problems found in the audit: date range does nothing (F-04); history always says "Success" (F-05); re-import can duplicate rows without receipts (F-06); AI-read figures are never checked against the statement (F-07). New flow to design (code will follow): **Upload → Review before saving → Result**, with a reconciliation check, duplicate handling and honest statuses. Required wording (do not paraphrase): "The PDF is opened in your browser and never uploaded. The transaction text (dates, amounts, merchant and counterparty names) is sent through Netlify to Anthropic to be categorised after you agree. Phone numbers are removed first."

## Stitch prompt
```
For the existing FynPet project, design the M-PESA IMPORT page as a three-step flow, following the approved design system, Dashboard frames and Global rules (no accounts/cards; real categories only; no claims of automatic or SMS import; no encryption claims; amounts never wrap; nothing under 12px; sentence case; consistent sample figures; "Sample data - design preview" tag). Use this exact privacy wording wherever the privacy note appears: "The PDF is opened in your browser and never uploaded. The transaction text (dates, amounts, merchant and counterparty names) is sent through Netlify to Anthropic to be categorised after you agree. Phone numbers are removed first."

Add a stepper at the top of the page: "1 Upload", "2 Review", "3 Done" (current step in lime).

Frames:
1. "Import - upload" (desktop 1440): title "M-Pesa import", subtitle "Add transactions from a Safaricom PDF statement". Left column (7/12): large dashed drop zone "Drop your M-Pesa statement here" with the helper "Password-protected PDFs work. Use the password Safaricom gave you." and a "Choose file" button; after a file is chosen, a file card (name "MPESA_Statement_Nov2026.pdf", size "184 KB", remove X). Right column (5/12) card "Import settings": "PDF password" (show/hide button), "Date from" and "Date to" (these limit which rows are imported; helper "Only rows inside this range are kept."), and a lime "Read statement" button. Under both, the privacy note card with the exact wording above and a link "How your data is handled".
2. "Import - reading" (desktop): same layout, the button disabled, and a progress card with the real stages as a vertical list: "Opening PDF in your browser" (done), "Reading transactions" (done), "Categorising with Fyn AI - chunk 3 of 8" (in progress, spinner), "Checking for duplicates", "Preparing review". A "Cancel" button. Nothing is saved yet: say "Nothing is saved until you confirm."
3. "Import - review" (desktop): summary strip of 4 cards: "Found 58 transactions", "New 51", "Already in FynPet 6" (will be skipped), "Needs attention 1". A reconciliation banner (mint): "Totals match the statement: money in KES 85,000, money out KES 53,600." and a second variant (amber) "Totals differ from the statement by KES 1,200. Check the highlighted rows before saving." Below, a table with a select-all checkbox: columns Include (checkbox), Date, Description, Category (an inline select, AI-suggested ones marked with a small sparkle), Type, Amount (nowrap, signed). Rows flagged "Possible duplicate" (amber chip, unchecked by default) and "Low confidence" (amber chip). A sticky footer: "51 selected - Expenses KES 41,200, Income KES 85,000", outlined "Back", lime "Save 51 transactions".
4. "Import - done" (desktop): success card: "51 transactions saved", three stats ("Saved 51", "Skipped as duplicates 6", "Not imported 1"), status chip "Success" (or "Partly imported" in amber when some were skipped for problems), buttons "View transactions" and "Import another statement". Also a failure variant "Couldn't read this statement" with the reason in words (wrong password; no text found - scanned statements are not supported; AI unavailable), and what to do, plus "Try again".
5. "Import - history" section under the upload frame: table File, Imported on, Saved, Skipped, Status (Success green, Partly imported amber, Failed coral, each with words), and an empty state "No imports yet".
6. "Import - mobile" (375 x 812): four frames: upload (drop zone becomes a large "Choose statement" button, settings below, privacy note collapsed with "Read how your data is handled"), reading (stages list), review (summary chips scrollable, reconciliation banner, rows as cards with a checkbox, description, category select, amount; sticky footer "Save 51 transactions"), done. Floating nav shows "More" active.

States to add: "AI consent needed" (before the reading step, the approved consent dialog appears; do not redraw it), "Sign-in needed" ("Sign in to read statements with Fyn AI. Your PDF stays on your device." button Sign in).

Motion: stage checks tick in, progress bar fills, review rows fade in in a short stagger. Disabled under reduced motion.
```

## Review checklist
Exact privacy wording; "Nothing is saved until you confirm" visible; reconciliation shown honestly in both states; statuses in words; duplicates unchecked by default; no claim of automatic import.

---

# PROMPT 5 — Fyn AI panel, chat and consent

## Analysis
Today: slide-over panel with header, privacy line, tabs Chat / Insights / History, messages, six quick prompts (Cash flow, Budget check, Spending issues, FIRE advice, Action plan, Where to cut), composer. Insights tab: health cards (savings rate, emergency fund, net balance, independence progress), "This month" (income, expenses, saved) and "Generate AI analysis". History tab: past questions that replay. Errors: not signed in, daily limit reached, busy, timeout. Consent dialog has three disclosures.

## Stitch prompt
```
For the existing FynPet project, design FYN AI (the assistant), following the approved design system, Dashboard frames and Global rules (no accounts/cards; no claims beyond what exists; amounts never wrap; nothing under 12px; sentence case; "Sample data - design preview" tag). Fyn only answers from the person's recorded transactions and gives general guidance, not regulated financial advice. Say so once, in small text, under the composer: "Fyn gives general guidance, not regulated financial advice."

Frames:
1. "Fyn AI - desktop panel, chat" (1440): the Dashboard dimmed behind a right slide-over panel 440px wide, full height. Header: sparkle icon in a lime tile, "Fyn AI", caption "Answers from your recorded finances", close X. A privacy line (12px): "After you agree, your question and a summary of your records are sent to Anthropic through Netlify. Phone numbers are removed first." Tabs: Chat (selected), Insights, History. Conversation: Fyn greeting "Hi Y! I have 64 transactions on record. This month: income KES 85,000, expenses KES 53,600, savings rate 18.2%. Ask me anything.", a user bubble "Am I over budget?", Fyn answer (3-4 sentences, key amounts in bold, naming Entertainment as KES 800 over, ending with one concrete step). A typing indicator variant. Quick prompt chips (wrapping): "Cash flow", "Budget check", "Spending issues", "Savings target", "Action plan", "Where to cut". Composer: multi-line input "Ask about your finances", a lime send button (44px), the small guidance note.
2. "Fyn AI - desktop, insights tab": four metric rows (Savings rate 18% - "Fair", Emergency fund 2.4 months - "Low", Net balance KES 31,400 - "Good", Independence progress 4.7% - "Low"; status words and a target line such as "Aim for 6 months"), a "This month" group (Income, Expenses, Saved), and a lime "Generate AI analysis" button.
3. "Fyn AI - desktop, history tab": list of past questions (question text, date, 2-line answer preview), tap to reopen; and an empty state "No conversations yet".
4. "Fyn AI - states" (desktop panel variants, each its own frame or clearly labelled sections): "Sign in required" ("Sign in to use Fyn AI. Your records stay on this device." + Sign in button), "Daily limit reached" ("You've used today's AI questions. They reset at midnight UTC."), "Service busy" ("Fyn is busy. Try again in a minute." + Try again), "No data yet" (greeting that suggests adding transactions, chips still available), "Waiting" (typing dots).
5. "Fyn AI consent - desktop dialog" (420px modal) with this exact content. Title "Before you use AI". Intro: "FynPet uses Anthropic to answer questions and extract transactions from M-Pesa statements." Section "Advisor questions": "Your profile name, monthly totals, budgets and up to 10 recent transaction summaries are sent through Netlify to Anthropic." Section "Statement import": "The PDF opens locally. Extracted text, including dates, amounts and merchant or counterparty names, is sent through Netlify to Anthropic after consent." Section "Your choice": "Phone numbers are removed before Anthropic processing. You can use manual records and CSV export without AI. Turn off consent in Settings at any time." Buttons: outlined "Not now" and lime "Agree and continue". Same dialog as a mobile bottom sheet.
6. "Fyn AI - mobile" (375 x 812): FULL-SCREEN chat that hides the bottom navigation: top bar with back arrow, "Fyn AI", overflow for Insights and History (or the three tabs as a segmented control under the bar), message list, quick-prompt chips in a horizontally scrolling row above the composer, composer pinned to the bottom with 16px text and 44px send button. Also show it with the on-screen keyboard open (plain grey block) so the composer and the last message stay visible. Also mobile Insights and History tabs and one error state.

Motion: panel slides in, messages fade up, typing dots, send button press. Disabled under reduced motion.
```

## Review checklist
Consent text exactly as given; privacy line present; guidance note present; every error has a next action; mobile composer stays above the keyboard; no invented insights shown as facts.

---

# PROMPT 6 — Settings, sign-in and account dialogs

## Analysis
Today: Settings cards for Account & sync (Fyn AI status, account sync status, sign-in/out, recheck), Profile (name), Independence target (KES), Exchange rates (USD, EUR, GBP, TZS, UGX as editable estimates), Privacy & AI (review disclosure, turn off consent), Data management (Export CSV, Clear local data). Sign-in is a modal that opens by itself after one second (audit F-11); merging device data into an account uses a browser pop-up; sign-out and "clear data" use browser pop-ups; the new "Sign out without syncing?" warning uses the generic confirm dialog.

## Stitch prompt
```
For the existing FynPet project, design SETTINGS and the ACCOUNT dialogs, following the approved design system, Dashboard frames and Global rules (no accounts/cards in the banking sense; no encryption or auto-sync claims; amounts never wrap; nothing under 12px; sentence case; "Sample data - design preview" tag). There is no "role" and no admin: do not show them.

Frames:
1. "Settings - desktop" (1440): title "Settings", subtitle "Your profile, exchange rates and privacy". A two-column layout with a left in-page list (Account, Profile, Independence target, Exchange rates, Privacy and AI, Data) that scrolls to sections, and cards:
 - "Account and sync": state not signed in: "Saved on this device" with a status dot, text "Sign in to back up your records and use them on another device.", lime "Sign in", and small status rows "Fyn AI: Ready after you sign in" and "Account sync: Available". Variant signed in: "Signed in as tester@example.com", "Synced 9:21 PM" (green dot), buttons "Sync now" and outlined "Sign out"; variant with a sync problem: amber "Couldn't sync. Your changes are saved on this device." and "Try again".
 - "Profile": Name field (placeholder "You") with "Used in greetings and your avatar.".
 - "Independence target": "Target amount (KES)" with the plain explanation "A common rule is 25 times yearly expenses.".
 - "Exchange rates to KES": heading note "Editable estimates, not live rates. Each transaction keeps the rate it was saved with; changing a rate affects only new or edited transactions." Five inputs: 1 USD = 130, 1 EUR = 145, 1 GBP = 165, 1 TZS = 0.045, 1 UGX = 0.034, with an inline error state for "Enter a rate greater than zero.".
 - "Privacy and AI": text "Your records are saved in this browser. Signing in lets you sync them across devices. Fyn AI uses Anthropic after your consent; phone numbers are removed first." AI consent status chip ("Agreed" or "Not agreed"), buttons "Review AI disclosure" and "Turn off AI consent".
 - "Data": "Export CSV" button, and a coral-outline "Clear data on this device" with the caption "Data already synced to your account is not affected.".
 A sticky "Save settings" bar appears only when there are unsaved changes ("You have unsaved changes").
2. "Sign in - desktop modal" (420px): title "Sign in to sync", subtitle "Back up your records and use them on another device". Segmented "Sign in" / "Create account". Email and Password (show/hide), lime "Sign in" button, text button "Continue without signing in" with the caption "You can sign in later from Settings." Variants: error ("Incorrect email or password."), loading ("Signing in..."), create account with the helper "Use at least 10 characters.", and "Check your email" (after sign-up: envelope icon, "We sent a confirmation link to you@example.com. Open it on this device to finish.", "Resend email" button). IMPORTANT: this dialog is opened by the person, never automatically on page load.
3. "Merge device data" dialog (modal 460px): title "Add this device's records to your account?", text "This device has 12 transactions and 2 budgets that are not in an account. Add them to tester@example.com?", buttons lime "Add to my account" and outlined "Keep them separate on this device". Small note: "Nothing is deleted either way."
4. "Sign out" confirm (modal 420px): "Sign out?", "Records synced to your account stay safe. Records stored only on this device will be removed when you sign out." buttons "Cancel" and coral "Sign out". And the warning variant: "Sign out without syncing?", "Your latest changes could not be synced. If you sign out now they will be removed from this device.", buttons "Stay signed in" and coral "Sign out anyway".
5. "Clear data" confirm: "Clear all data on this device?" "This removes records stored in this browser. Data synced to your account is not affected." Buttons "Cancel" and coral "Clear data". Type "DELETE" confirm input as an extra safety step.
6. "Settings - mobile" (375 x 812): top bar "Settings" with a back arrow (reached from More), the same sections as stacked cards, 16px inputs, sticky "Save settings" button above the nav (only when changed). Also mobile versions as bottom sheets of Sign in (with the keyboard open), Merge, Sign out and Clear data.

Motion: dialog fade and scale, sheet slide-up, status dot pulses only while syncing, save bar slides in. Disabled under reduced motion.
```

## Review checklist
Sign-in never auto-opens; local-first choice always available; exact wording for the unsynced sign-out warning; no "role"; rate error in words; every destructive action names what happens to which data.

---

# PROMPT 7 — Light theme (optional, last)

```
For the existing FynPet project, create a LIGHT version of the approved design system and show it on three frames: "Dashboard - light (desktop 1440)", "Dashboard - light (mobile 375 x 812)" and "Transactions - light (desktop)". Keep layout, spacing, type and components identical to the dark frames; change only colours. Tokens: page #F5F7FA, card #FFFFFF, raised #F0F3F7, border #DDE3EA, primary text #0F172A, secondary text #475569, lime accent #C6F432 used only as a fill with dark text #0A0D12 (never as text or icon on white), income #047857, expense #BE123C, savings #4F46E5, warning #B45309, chart palette recalculated for white backgrounds, focus ring 2px #3F6212. All text must meet WCAG AA contrast on its background; do not use lime for text. Add a theme switch in Settings and the top bar showing Light / Dark / System.
```
