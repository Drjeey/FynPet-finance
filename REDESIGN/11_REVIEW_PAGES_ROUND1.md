# Design review, round 1 — Transactions, Budgets, Analytics, Import, Fyn AI, Settings

Reviewed 16 November 2026 from `stitch_fynpet_kenyan_finance_dashboard.zip` (updated export, 85 files; screenshots plus exported HTML, read but not run).

## What arrived

Ten new desktop frames: `transactions_desktop`, `budgets_desktop`, `analytics_desktop`, `import_upload`, `import_reading`, `import_review`, `import_done`, `fyn_ai_desktop_panel_chat`, `settings_desktop`.

**Missing from the seven prompts** (about 30 frames): every mobile frame; the Transactions filters panel, empty and no-results states, add/edit and delete dialogs; the Budgets empty state and budget dialogs; Analytics empty state; Import mobile; Fyn AI insights, history, states and the consent dialog; Settings sign-in, merge, sign-out and clear-data dialogs; the light theme.

## Verdict

**Not approved as a set.** Four pages are close and can be approved with conditions. Import (three of four frames) and Settings contain claims the product cannot back, so they need a revision. All mobile and dialog frames still need designing.

| Page | Verdict |
|---|---|
| Transactions (desktop) | Approve with conditions |
| Budgets (desktop) | Approve with conditions |
| Analytics (desktop) | Approve with conditions |
| Fyn AI chat panel (desktop) | Approve with conditions |
| Import: upload | Approve with conditions |
| Import: reading, review, done | **Revise** |
| Settings (desktop) | **Revise** |
| Everything in the "Missing" list | **Still to design** |

## One rule for every page: the shell comes from the Dashboard, not from these frames

The sidebars and top bars drift from frame to frame: a broken "Minimal app logo" image on four Import frames, "FINTECH KENYA" instead of "KES ledger", a **"PRO" badge on Ask Fyn AI** (there is no paid tier), a top bar that says "Transactions / 64 transactions" on the Budgets page, a "Synced" chip next to "Saved on this device", a search box promising "paybills, tags" (there are no tags), and different nav styles on Settings. I will build **one** shell, taken from the approved Dashboard, and take only the **page content area** from each of these frames.

## Blocking problems (claims the product cannot support)

| # | Where | Problem | Fix |
|---|---|---|---|
| 1 | Import reading | "**Did you know?** You can also link your business Till or Paybill numbers under account settings for automated daily sync." There is no linking and no automatic sync. | Remove |
| 2 | Import reading | "**Zero-knowledge** local parsing". The statement text is sent to Anthropic, so this is false. | Use the approved wording only |
| 3 | Import review | "Processed locally via **encrypted parser**" | Remove; no encryption claim |
| 4 | Import review | "AI categorized 50 of 51 items with **>95% statistical confidence** based on historical Kenyan paybill profiles" | Remove; invented statistic |
| 5 | Import review | **"Verified Org"** and **"Recurring"** tags on rows | Remove; no such data |
| 6 | Import done | "**100% matched by Fyn AI**" and categories "Groceries", "Utilities & Paybill", "P2P Transfers", "Transport & Fuel" | Use real categories; remove the claim |
| 7 | Import reading | "**Account 254712•••890**" shown under the file name | Remove; FynPet does not read or show account numbers |
| 8 | Import reading | Made-up metrics: "Parsing speed 42 TX/s", "Est. ~3 seconds remaining", "Auto-tagging rule: Enabled" | Show only the real stages and "chunk n of N" |
| 9 | Import upload | Password hint "Usually your ID **or phone number**" | "Usually your National ID number" |
| 10 | Import upload | "PDF **max 25MB**" and "e-mail or MySafaricom statements" | Remove unless the code enforces it |
| 11 | Settings | "**Encrypted** client-side storage cache", "**Encrypted vaults**", "**IndexedDB 1.4 MB / 50 MB**" | Remove. Data sits unencrypted in localStorage. |
| 12 | Settings | **"1 ZAR … Invalid input"** | FynPet supports USD, EUR, GBP, TZS and UGX only |
| 13 | Settings | "Current trajectory KES **1,840,500** of 3,000,000 — **61.3%** On track" and "at a 4% safe withdrawal rate this represents KES 120,000 passive cash flow" | Contradicts Analytics (KES 142,000, 4.7%). Remove both lines. |
| 14 | Settings | "KES Ledger **v2.4**" | App version is 5.1.0; remove |
| 15 | Fyn AI | Sample answer blames "your Netflix subscription and weekend outing" | Fyn can only cite amounts and categories, not causes; change the sample |

## Page notes

### Transactions (desktop): approve with conditions
Good: clear filter chips, applied-filter pills with "Clear all", category chip under each name, "Imported"/"Manual" source, right-aligned nowrap amounts with coral/mint, real categories, pagination, Filters badge.
Conditions: the row **Actions** column is empty (show Edit and Delete on hover **and** keyboard focus, or always show a "…" menu); the page title is duplicated in the top bar and the header; search appears twice (keep one); savings rows use an indigo minus — keep, but add the word "Savings" in the chip (present); sample tag overlaps the last row (prototype only). Still to design: filters panel, empty, no results, add/edit, delete, mobile list.

### Budgets (desktop): approve with conditions
Good: three summary cards, cards with words ("KES 800 over", "Exceeded by 16%"), amber state, dashed "Add a budget" card, sort control.
Conditions: page title "Budgets" is small plain text, not the page-title style; "Exceeded by 16%Resets in 14 days" run together; edit and trash icons are tiny, tight to the card edge and not 44 px; "Food & groceries" should read "Food & Groceries"; summary values are small and squeezed beside their captions. Still to design: new/edit dialog with the "last month" hint, delete confirm, empty, mobile.

### Analytics (desktop): approve with conditions
Good: plain-language "Independence target" with the 25× explanation, "View as table" toggle, status in words, info icons, text summary under the chart, "Uses Fyn AI after you agree".
Conditions: the top bar overlaps the page title and hides the "Get AI analysis" button; tooltip wraps "KES / 28,100"; **definitions disagree**: the table's "Saved" equals "Net" in every row and its rate (36.9%) differs from the health card's savings rate (18%). In the app, savings rate = savings transactions ÷ income and net = income − expenses; show both as separate columns, computed correctly. "Recommended focus: Expand emergency cash reserve" is acceptable only if it is simply the lowest-scoring factor, computed. "Target cap" should read "Target". Still to design: empty and mobile.

### Fyn AI chat panel (desktop): approve with conditions
Closest to the brief. Good: privacy line, tabs, answer with a small table and "Suggested next step", chips, composer and the guidance note.
Conditions: **send button icon is a diagonal arrow (↖)**; use a normal send arrow. Greeting "Hi Y!" must use the saved name, or just "Hi!". Background shows a different dashboard (Overview, Cash flow, Budget & limits…); the real shell applies. Fix sample answer (blocking #15). Still to design: Insights, History, error states, consent dialog, mobile.

### Import: upload — approve with conditions; reading, review, done — revise
Good: three-step flow, exact privacy wording on every frame, real date range with "Only rows inside this range are kept", import history with words (Success, Partly imported, Failed (Wrong password)), summary cards, reconciliation banner, "Possible duplicate" unchecked by default, "Needs review (1)" and "Excluded (6)" tabs, sticky "Save 51 transactions", "Nothing is saved until you confirm." This is the right design for the parser rework.
Revise: all blocking items 1–10 above, plus: the review table is wider than its card (the Notes & status column is cut off and "Possible du…" is clipped); prototype chrome is visible ("Statement variance preview (simulation state)", "Import variants & troubleshooting — PREVIEW REFERENCE", "Variant A/B"); the Done frame shows "Statement period 01 May 2024 – 31 May 2024" against a November 2026 flow and mixes failure and partial variants into the success page (they need their own frames); amounts show ".00" here but not elsewhere; jargon ("Data ingress", "Automated ledger", "Decryption failure", "Pipelines").

### Settings (desktop): revise
Good structure (section list, cards for account, profile, independence target, exchange rates, privacy, data), correct rate-help wording and the "Enter a rate greater than zero." error, Agreed chip, destructive action with its caption.
Revise: blocking items 11–14; the frame is only 855 px wide so text is tiny (many 11 px labels); prototype chrome ("Modal demos: Sign in / Merge / Sign out / Clear", "Device only / Signed in / Sync error" toggle, "System configuration"); the unsaved-changes bar floats over the Independence target card and hides its label; display-name field has an unexplained icon. The three sync states must be separate frames, not a toggle.

## Rules for the next rounds
Everything from the dashboard reviews still applies (real categories, no accounts/cards, no encryption or auto-sync claims, nothing under 12 px, amounts never wrap, sentence case, solid nav). Additionally: **no "Pro" badge, no version numbers, no invented statistics, no prototype controls inside a frame.** One state per frame.

---

## Stitch prompt A — fix the existing frames

Paste into the same project.

```
Revise the existing frames (do not change the dashboard frames). Use the approved Dashboard shell on every page: sidebar with the FP mark and "KES ledger" caption, the lime "Ask Fyn AI" button with NO badge, and the normal top bar (page title with the date, one search field "Search transactions", sync icon, avatar "Y"). Do not use any image for the logo; draw "FP" as text in a lime rounded square. Remove "FINTECH KENYA", "PRO", "Synced" chips and any version number. Every frame is 1440 px wide with 12px minimum text and no prototype controls inside the frames.

1. Import (all four frames): remove "Did you know?" card; remove "Zero-knowledge local parsing" and "Client-side sandbox execution"; remove "encrypted parser" and the "statistical confidence" line; remove "Verified Org" and "Recurring"; remove the account number under the file name, "Parsing speed", "Est. ~3 seconds remaining", "Auto-tagging rule", "Live stream", "Automated ledger", "Data ingress"; password hint: "Usually your National ID number"; remove "PDF max 25MB" and the Safaricom e-mail line. Under every privacy note use ONLY this wording: "The PDF is opened in your browser and never uploaded. The transaction text (dates, amounts, merchant and counterparty names) is sent through Netlify to Anthropic to be categorised after you agree. Phone numbers are removed first." Reading frame: keep the real stages ("Opening PDF in your browser", "Reading transactions", "Categorising with Fyn AI - chunk 3 of 8", "Checking for duplicates", "Preparing review") and "Nothing is saved until you confirm." with a progress bar and Cancel, no invented metrics. Review frame: make the table fit inside the card (columns Include, Date, Description, Category, Amount; move the notes into a small chip under the description such as "Possible duplicate" or "Check category"); remove the "simulation state" row; amounts without decimals ("-KES 4,850"). Done frame: keep only the success state ("51 transactions saved", Saved 51, Skipped as duplicates 6, Not imported 1 with the reason "Airtime reversal", statement period "1 Nov - 30 Nov 2026", buttons View transactions and Import another statement); remove the "Top detected categories" box and "100% matched"; create two NEW frames "Import - partly imported" (amber, "48 of 51 saved. 3 rows could not be read and were skipped.", list of the 3 rows, button "Review skipped rows") and "Import - failed" (coral, "Couldn't read this statement", the three reasons Wrong password, No text found - scanned statements are not supported, Fyn AI unavailable, each with what to do, and "Try again"). Also keep the Import history table from the upload frame.
2. Settings: make the frame 1440 wide with 14px+ body text. Remove "Encrypted client-side storage cache", "Encrypted vaults", the storage meter, "KES Ledger v2.4", "System configuration", the "Modal demos" buttons and the state toggle. Remove the "Current trajectory ... 61.3% On track" box and the "4% safe withdrawal rate" sentence. Exchange rates: only USD, EUR, GBP, TZS, UGX (five inputs); show the error state on UGX ("Enter a rate greater than zero.") in a separate frame "Settings - rate error". Account card: create three separate frames "Settings - not signed in", "Settings - signed in" ("Signed in as tester@example.com", "Synced 9:21 PM", Sync now, Sign out), "Settings - sync problem" (amber banner "Couldn't sync. Your changes are saved on this device." + Try again). The "You have unsaved changes" bar must be a sticky bar at the bottom of the viewport, never over content: create it as its own frame "Settings - unsaved changes".
3. Budgets: use the same page-title style as Transactions (28px title "Budgets"); put a 12px gap between "Exceeded by 16%" and "Resets in 14 days" (stack them on two lines); make edit and delete icon buttons 44px with tooltips, inside the card padding; use "Food & Groceries". Larger summary numbers (28px) with the caption below, not beside.
4. Transactions: show Edit and Delete icon buttons in the Actions column on row hover and keyboard focus (draw one row in the hover state); remove the duplicate title in the top bar and keep one search field.
5. Analytics: move the title and the "Get AI analysis" button below the top bar so nothing overlaps; make the tooltip wide enough for "Net saved: KES 28,100" on one line; replace "Target cap" with "Target"; in the Monthly summary table use columns Month, Income, Expenses, Saved (savings transactions only), Net (income minus expenses), Savings rate (saved divided by income), with different numbers in Saved and Net (e.g. Nov: Saved KES 15,400, Net KES 31,400, rate 18.1%), and make the Financial health "Savings rate" equal the current month's rate (18%).
6. Fyn AI: replace the send icon with a normal arrow (up-right paper-plane or up arrow); greeting "Hi! I have 64 transactions on record..." (no initial); rewrite the sample answer to cite only amounts and categories: "You have spent KES 41,120 of your KES 57,000 monthly budget (72%) with 14 days left. Entertainment is KES 800 over its KES 5,000 limit; Food & Groceries has KES 9,500 left and Utilities KES 9,000." Suggested next step: "Hold optional Entertainment spending until 1 December." Place the panel over the real Dashboard (not a different layout).
```

## Stitch prompt B — missing desktop frames
Run after A is approved.

```
For the existing FynPet project, create these DESKTOP (1440) frames using the approved shell and the page content already designed. One state per frame, no prototype controls, same rules as before (real categories only, no claims of encryption/auto-sync, 12px minimum, "Sample data - design preview" tag):
1. "Transactions - filters panel" (right panel 360px: Date range with From/To and quick pills This month, Last month, Last 3 months; Category checkboxes for the ten categories; Amount min and max; footer Reset and Apply filters).
2. "Transactions - empty", "Transactions - no results".
3. "Add transaction - dialog" (modal 520px: Amount with currency select KES/USD/EUR/GBP/TZS/UGX, Type segmented Expense/Income/Savings/Transfer, Description, Category, Date, Notes; footer Cancel and Save entry), "Add transaction - error" (inline message "Enter an amount greater than zero." and coral field outline), "Edit transaction - dialog" (button "Save changes"), "Delete transaction - confirm" ("Delete transaction?" "Naivas Westlands will be permanently deleted. This cannot be undone.").
4. "Budgets - empty", "Budget - new dialog" (Category select with already-budgeted categories disabled and noted, Monthly limit, helper "Last month you spent KES 17,900 on Food & Groceries." with "Use this amount"), "Budget - edit dialog", "Budget - duplicate error", "Budget - delete confirm" ("Your transactions are not affected").
5. "Analytics - empty" (no data: dashed chart baselines, health rows "Not enough data", buttons Add transaction and Import an M-Pesa statement).
6. "Fyn AI - insights tab", "Fyn AI - history tab", "Fyn AI - history empty", and the states "Fyn AI - sign in required", "Fyn AI - daily limit reached", "Fyn AI - service busy", "Fyn AI - no data yet", "Fyn AI - waiting".
7. "Fyn AI consent - dialog" (420px) with EXACTLY: title "Before you use AI". "FynPet uses Anthropic to answer questions and extract transactions from M-Pesa statements." Section "Advisor questions": "Your profile name, monthly totals, budgets and up to 10 recent transaction summaries are sent through Netlify to Anthropic." Section "Statement import": "The PDF opens locally. Extracted text, including dates, amounts and merchant or counterparty names, is sent through Netlify to Anthropic after consent." Section "Your choice": "Phone numbers are removed before Anthropic processing. You can use manual records and CSV export without AI. Turn off consent in Settings at any time." Buttons "Not now" and "Agree and continue".
8. Account dialogs: "Sign in - dialog" (modal 420px: "Sign in to sync", segmented Sign in / Create account, Email, Password with show/hide, lime Sign in, text button "Continue without signing in", note "You can sign in later from Settings."), "Sign in - error" ("Incorrect email or password."), "Create account" (helper "Use at least 10 characters."), "Check your email" (confirmation sent to you@example.com, Resend email). "Merge - dialog": "Add this device's records to your account?" "This device has 12 transactions and 2 budgets that are not in an account. Add them to tester@example.com?" buttons "Add to my account" and "Keep them separate on this device", note "Nothing is deleted either way." "Sign out - confirm": "Sign out?" "Records synced to your account stay safe. Records stored only on this device will be removed when you sign out." buttons Cancel and Sign out; "Sign out - unsynced warning": "Sign out without syncing?" "Your latest changes could not be synced. If you sign out now they will be removed from this device." buttons "Stay signed in" and "Sign out anyway". "Clear data - confirm": "Clear all data on this device?" "This removes records stored in this browser. Data synced to your account is not affected." with a field that requires typing DELETE, buttons Cancel and Clear data.
```

## Stitch prompt C — mobile frames for every page
Run after B. One prompt covers the mobile version of each page; it reuses the approved mobile shell, floating nav and detail sheet.

```
For the existing FynPet project, create MOBILE frames (375 x 812) for every page below, using the approved mobile shell (top bar with FP mark, solid floating bottom navigation with Home, Transactions, Add, Budgets, More, 12px minimum text, 44px targets, 16px inputs) and the same content and states as the approved desktop frames. One state per frame. Real categories only; no encryption/auto-sync/Pro/version claims; "Sample data - design preview" tag.
1. Transactions: list grouped by date with horizontally scrolling filter chips and a Filters icon button, search, load more; "Transactions - filters sheet"; "Transactions - empty"; "Transactions - no results"; "Add transaction - sheet" (92% height, sticky Save entry footer) and the same with the keyboard open; "Add transaction - error"; "Edit transaction - sheet"; "Delete - confirm sheet".
2. Budgets: summary card with overall progress, single-column budget cards with a "..." menu opening an action sheet (Edit, Delete); empty; new/edit budget sheet; delete confirm.
3. Analytics (reached from More): independence card, savings trend (tap a bar), health list, monthly summary as six cards (Income, Expenses, Saved, Net, Savings rate); empty.
4. M-Pesa Import (reached from More): upload (large "Choose statement" button, settings, privacy note), reading (stages), review (summary chips, reconciliation banner, row cards with checkbox, category select, amount; sticky "Save 51 transactions"), done, partly imported, failed, import history as cards.
5. Fyn AI: full-screen chat that hides the bottom nav, with the keyboard open; insights; history; sign-in required; daily limit; service busy; consent as a bottom sheet with the exact approved wording.
6. Settings (reached from More): stacked cards as on desktop, sticky Save settings, rate error, plus bottom sheets for Sign in (with keyboard), Create account, Check your email, Merge, Sign out, Sign out without syncing, Clear data.
```
