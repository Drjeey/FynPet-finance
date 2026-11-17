# Review of UX rework, round 2, and prompts for the remaining pages

17 November 2026. From `stitch_fynpet_kenyan_finance_dashboard (2).zip`.
Note: for the three desktop frames (`dashboard_desktop`, `dashboard_first_use_4`, `import_review_desktop`) this export contained **only the code, no screenshots**, so I checked them from the code (colours, text, titles, claims) and could not look at them visually. The mobile and Add frames I reviewed visually and in code.

## Verdict

**The core experience is now good.** Dashboard (desktop and mobile), first use, Import review (desktop and mobile) and the mobile Add transaction sheet are approved with conditions. Two frames need redoing: the **Add choice sheet** and the **Add desktop dialog**.

| Frame | Verdict |
|---|---|
| `dashboard_desktop` | Approve with conditions (code-checked) |
| `dashboard_mobile` | Approve with conditions |
| `dashboard_first_use_4`, `dashboard_mobile_first_use` | Approve with conditions |
| `import_review_desktop` | Approve with conditions (code-checked) |
| `import_review_mobile` | Approve with conditions |
| `add_transaction_mobile_sheet` | Approve with conditions |
| `add_choice_sheet` | **Redo** |
| `add_transaction_desktop_dialog` | **Redo** (frame is cut off) |
| "Transaction saved - Undo" toast frame | Not delivered |

## What round 2 fixed (verified)
Desktop Dashboard code now has the donut in blue, violet, amber, sand, slate and grey (no lime/green/pink), the hero bar legend uses "Kept", the "Last month you spent KES 17,900 on Food & Groceries" line, and the "Auto-categorized" claim is gone. First use no longer says "zero-knowledge" or "SQLite" and ends with "Your records stay on this device until you sign in." Import review is titled "M-Pesa import", has "How your data is handled" with the approved wording and "We read your PDF on this device."

## Conditions to carry into the build

**Dashboard (desktop and mobile)**
1. Mobile "Needs attention" text is cut off ("Entertainment is KE…", "6 changes aren't bac…", "You haven't imported a s…"). Put the button under the sentence, or wrap to two lines.
2. Mobile Recent transactions shows the literal word **"Category"** and a cut-off "Impo…" instead of the real category and source. Use real data: "Food & Groceries · 16 Nov · Imported", allow two lines.
3. Donut centre text still crowds the ring on mobile; ~35 labels are 11 px (make 12 px); chart tooltip covers the top of the bar.
4. First use (both): remove "Nothing is uploaded to cloud storage" (misleading once AI import or sync is used) and the "KES Tabular" chip on mobile; show "KES 0" without ".00".

**Import review (desktop and mobile)**
5. Mobile shows **"✓ No PII sent  ✓ Client-side parser"**. **False**: counterparty names and amounts are sent to Anthropic after consent. Remove both chips; the approved paragraph already says what is sent.
6. Mobile page title says "Add Transaction" and a chip says "STATEMENT PARSED"; title must be "M-Pesa import". Remove "Mark verified" (extra step; the category choice and "Skip this one" are enough).
7. Replace jargon still in desktop code: "Algorithmic classifications" → "Suggested categories", "Duplicate prevention" → remove; "Statement reconciliation" → "Totals check".
8. Sticky footer must not hide content (bottom padding).

**Add transaction**
9. Mobile sheet: the dimmed background shows **"Total balance KES 142,850"** and "M-Pesa Out": FynPet has no balances. The background must be the Dashboard.
10. The sheet draws its **own number keypad**. Build with the phone's native numeric keyboard (`inputmode="decimal"`) instead; the layout above the keypad is what we keep.
11. Header says "Add Transaction" above a sheet that also says it; keep one title.

## Redo: Add choice sheet and desktop dialog
- **Choice sheet** problems: titles truncated ("Add a transacti…", "Import M-Pesa …"); the badge **"AUTO"** on the import row implies automatic import; the footer **"Encrypted on device • Local parsing only"** is false; the bottom nav shows Overview, Ledger, Settings instead of Home, Transactions, Budgets, More; the heading text is clipped under the header; the sheet fills the page.
- **Desktop dialog**: the frame is cropped; the amount field, More details and the Save/Cancel buttons do not appear, and the error state does not show the amount field.

## Stitch prompt R3 — fix and finish the Add flow
```
Fix these frames in the same project. Same shell, colours and rules as the approved Dashboard (no balances or accounts, no encryption/auto-sync claims, 12px minimum, sample-data tag).

1. "Add - choice sheet" (mobile 375 x 812): the approved Dashboard dimmed behind a small bottom sheet with a handle bar. Title "Add to FynPet". Two large rows, each with an icon, a one-line title that is NOT truncated, a one-line description and a chevron: "Add a transaction" / "Type it in yourself" and "Import M-Pesa statement" / "From a Safaricom PDF". No badges, no footer note. The bottom nav stays visible below the dim with the normal labels Home, Transactions, Add, Budgets, More. A close X in the sheet's top right.
2. "Add transaction - mobile sheet": make the dimmed background the Dashboard (This month card, not a balance). Remove the on-screen number pad drawing: show the sheet as it looks with the phone's own keyboard open (a plain grey keyboard block at the bottom is fine). Keep the amount input, Expense/Income segmented control, "More types", category chips, "More details", Save and "Save and add another". One title only.
3. "Add transaction - saved" (mobile): the Dashboard with the toast "Transaction saved - Undo" above the bottom nav.
4. "Add transaction - desktop dialog" (1440, page dimmed): a complete centred modal 480px wide and fully visible: title "Add transaction" with a close X; large Amount input "KES" (with a small currency select); Expense/Income segmented control with "More types"; category quick-pick chips (Food & Groceries, Transport, Utilities, Other, More); "More details" collapsed; footer buttons "Cancel" (outlined) and lime "Save". Also "Add transaction - desktop error": the same modal with the Amount field outlined in coral and the message "Enter an amount greater than zero." under it. Also "Add transaction - desktop more details" with description, date (today), currency, notes expanded.
5. Import review (mobile): title "M-Pesa import" with the stepper; remove "STATEMENT PARSED", "Mark verified", "No PII sent" and "Client-side parser"; rename "Statement reconciliation" to "Totals check"; keep the approved "How your data is handled" paragraph.
6. Dashboard (mobile): the three "Needs attention" rows show the full sentence on two lines with the button underneath; recent transaction meta lines show the real category and source ("Food & Groceries · 16 Nov · Imported"), never the word "Category".
```

---

# Remaining pages, in the simplified style

Same principles as the Dashboard rework: one question per card, one primary action, always-visible 44 px actions, 14 px+ body text (16 px on phones), nothing under 12 px, plain words, **one shell**. Run after R3, one prompt at a time. Each covers desktop and mobile.

## Prompt T — Transactions (with filters and dialogs)
```
Design TRANSACTIONS for the existing FynPet project using the approved shell (page title "Transactions" appears once, in the top bar; the sidebar highlights Transactions). Real categories only: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other. No balances or accounts; 12px minimum; sentence case; sample-data tag.
Desktop (1440): header row with "64 transactions" and the lime "Add transaction" and outlined "Export CSV". One toolbar: filter chips All / Income / Expenses / Savings / Transfers, ONE search field, a "Filters" button with a count badge. Applied filters as pills with "Clear all". A table with columns Description (name, with the category chip under it), Date, Source ("Imported" or "Manual"), Amount (right-aligned, nowrap, coral minus / mint plus) and an always-visible "..." button per row (44px) that opens a small menu Edit / Delete; clicking a row opens a right-hand details panel (merchant, amount, category, date, source, notes, Edit and Delete buttons). 12 rows per page with "Showing 1-12 of 64" and pagination. Frames: "Transactions - desktop", "Transactions - details panel", "Transactions - filters panel" (date range with quick pills This month / Last month / Last 3 months, category checkboxes, amount range, Reset and Apply), "Transactions - empty", "Transactions - no results", "Transactions - delete confirm" ("Delete transaction? Naivas Westlands will be permanently deleted. This cannot be undone.").
Mobile (375 x 812): "Transactions - mobile": top bar, horizontally scrolling chips with a Filters button, one search field, a list grouped by date headers ("Today", "Yesterday", "14 Nov") with 64px rows (icon, name, "Food & Groceries · Imported", amount); tapping a row opens the approved detail sheet. Frames: list, filters sheet, empty, no results.
```

## Prompt B — Budgets
```
Design BUDGETS using the approved shell (title once; Budgets highlighted). Desktop: "Budgets" header with "November" and lime "New budget". One summary line (not three cards): "KES 15,880 left across 4 budgets - 72% used - about KES 1,130 a day". Cards in a two-column grid, each showing the one thing that matters: category icon and name, a large "KES 9,500 left", "about KES 680 a day", a progress bar (mint under 80%, amber 80-99%, coral over, with the word "over"), "Spent KES 15,500 of KES 25,000", and a "..." menu (Edit, Delete) with a 44px target. The over-budget card says "KES 800 over" and offers two buttons: "Raise limit" and "View transactions". A dashed "Add a budget" card. Frames: desktop, empty ("Set a monthly limit for a category to see how much is left." + "Create budget"), "New budget" dialog (480px: Category select with already-budgeted categories disabled and labelled "Already has a budget", Monthly limit input, helper "Last month you spent KES 17,900 on Food & Groceries." with a "Use this amount" button), "Edit budget", "Budget - duplicate error", "Delete budget" confirm ("Your transactions are not affected."). Mobile: list of the same cards, "..." action sheet, New/Edit bottom sheet with sticky "Create budget", empty state.
```

## Prompt A — Analytics (plain questions)
```
Design ANALYTICS using the approved shell. Three sections, each a plain question with a short answer and one next step; no score. Desktop: 1) "Am I saving?" - the 6-month savings chart (Jun-Nov, bars, tap/hover tooltip), a one-line text summary and the savings rate for this month; "View as table" toggle. 2) "Am I covered if something goes wrong?" - emergency fund "2.4 months of expenses saved" with a bar to 6 months and the sentence "Aim for 3 to 6 months." and a button "Set a savings goal". 3) "How close am I to my goal?" - independence target "KES 142,000 of KES 3,000,000 (4.7%)", a bar, "At your current pace: about 6.8 years", and a plain explanation "A common rule is 25 times yearly expenses." with "Change target". A Monthly summary table with columns Month, Income, Expenses, Saved (savings transactions), Net (income minus expenses), Savings rate (saved divided by income): the numbers must differ between Saved and Net. Frames: desktop, empty ("No data yet" with Add transaction and Import buttons), mobile (stacked sections, summary as six cards), mobile empty. Mobile reaches Analytics from More. A small outlined "Ask Fyn about this" button on each section (opens the assistant with a pre-filled question; says "Uses Fyn AI after you agree").
```

## Prompt S — Settings and account dialogs
```
Design SETTINGS and the account dialogs using the approved shell (Settings highlighted). Settings is one group visible at a time: a left list (Account, Preferences, Privacy and data) on desktop and a segmented control on mobile. Account: "Saved on this device" or "Signed in as tester@example.com - Synced 9:21 PM" with the right button (Sign in / Sync now and Sign out); a separate frame for each of: not signed in, signed in, sync problem ("Couldn't sync. Your changes are saved on this device." + Try again). Preferences: Name (used in greetings), Independence target (KES) with the plain explanation, Exchange rates to KES for USD, EUR, GBP, TZS and UGX (estimates, with the approved sentence "Editable estimates, not live rates. Each transaction keeps the rate it was saved with; changing a rate affects only new or edited transactions."), rate error frame ("Enter a rate greater than zero."). Privacy and data: AI consent status with "Review AI disclosure" and "Turn off AI consent"; "Export CSV"; "Clear data on this device" (coral outline, caption "Data already synced to your account is not affected."). A sticky "Save settings" bar at the bottom of the viewport, shown only when something changed (own frame). No version numbers, no storage meters, no encryption claims. Dialogs (desktop modals and mobile bottom sheets): "Sign in to sync" (Sign in / Create account, email, password with show/hide, "Continue without signing in", note "You can sign in later from Settings.", never opens by itself), sign-in error ("Incorrect email or password."), create account ("Use at least 10 characters."), "Check your email" (confirmation sent, Resend), "Add this device's records to your account?" (12 transactions and 2 budgets on this device; buttons "Add to my account" and "Keep them separate on this device"; "Nothing is deleted either way."), "Sign out?" (records synced stay safe; records only on this device are removed) and "Sign out without syncing?" ("Your latest changes could not be synced. If you sign out now they will be removed from this device." with "Stay signed in" and "Sign out anyway"), "Clear all data on this device?" (type DELETE to confirm).
```

## Prompt F — Fyn AI
```
Design FYN AI using the approved shell. Desktop: a right slide-over panel 440px over the real Dashboard. Header "Fyn AI - Answers from your recorded finances", close. A one-line privacy note: "After you agree, your question and a summary of your records are sent to Anthropic through Netlify. Phone numbers are removed first." Tabs Chat / Insights / History. Chat: a greeting that uses only real figures, a question, an answer that cites only amounts and categories (for example "You have spent KES 41,120 of your KES 57,000 monthly budget (72%) with 14 days left. Entertainment is KES 800 over its KES 5,000 limit; Food & Groceries has KES 9,500 left.") followed by one "Next step" line, suggestion chips (Cash flow, Budget check, Spending issues, Savings target, Action plan, Where to cut), a multi-line composer with a clear send arrow, and the note "Fyn gives general guidance, not regulated financial advice." Frames: chat, typing, insights (four rows with status in words: Savings rate, Emergency fund, Net cash flow, Independence progress; "Generate AI analysis" button), history (list and empty), sign-in required ("Sign in to use Fyn AI. Your records stay on this device."), daily limit ("You've used today's AI questions. They reset at midnight UTC."), service busy ("Fyn is busy. Try again in a minute."), no data yet, and the consent dialog with EXACTLY: title "Before you use AI"; "FynPet uses Anthropic to answer questions and extract transactions from M-Pesa statements."; "Advisor questions: Your profile name, monthly totals, budgets and up to 10 recent transaction summaries are sent through Netlify to Anthropic."; "Statement import: The PDF opens locally. Extracted text, including dates, amounts and merchant or counterparty names, is sent through Netlify to Anthropic after consent."; "Your choice: Phone numbers are removed before Anthropic processing. You can use manual records and CSV export without AI. Turn off consent in Settings at any time."; buttons "Not now" and "Agree and continue". Mobile: full-screen chat that hides the bottom nav, composer above the keyboard, the same tabs as a segmented control, the same states, and the consent as a bottom sheet.
```

## Light theme (last, optional)
Use the prompt in `10_STITCH_PROMPTS_REMAINING_PAGES.md`, prompt 7.

## Suggested order
R3 → Transactions (T) → Budgets (B) → Analytics (A) → Settings (S) → Fyn AI (F) → light theme. After each, send the zip path and I review. When Dashboard, Add flow, Import review and Transactions are approved, I can start building them here.
