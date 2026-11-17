# Stitch prompts: Transactions and Budgets

Run these in the same Stitch project, **one at a time** (Transactions first). After each, export the .zip and send me the file name. I will review it, then build what you approve.

What is already built and approved, so Stitch must **not** redraw it: the Dashboard, the shell (sidebar, top bar, floating mobile nav), the Add/Edit transaction dialog and sheet, the transaction detail sheet, the Add choice sheet, the toast with Undo, the sync banner.

What these two pages need that is new: Transactions gets category and date filters (small new feature). Budgets gets "left per day", "Raise limit" on over-budget cards and a "last month" hint when setting a limit.

---

## Prompt 1: Transactions

```
Design the TRANSACTIONS page for the existing FynPet project, desktop (1440) and mobile (375 x 812). Use the approved shell exactly (sidebar with Transactions highlighted, top bar with the page title once, one search field; on mobile the floating bottom nav with Transactions active). Same colours, fonts and components as the approved Dashboard. Do NOT redraw the Add transaction dialog or sheet, the transaction detail sheet or the toast: they already exist.

Rules: FynPet has no bank accounts, cards or balances. Use only these categories: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other. No claims about encryption, automatic sync or real time. Nothing under 12px, sentence case, amounts never wrap, one plus sign on Add buttons, 44px tap targets, all sample figures consistent. Add a small "Sample data - design preview" tag.

DESKTOP FRAMES
1. "Transactions - desktop": one card. Header row: "64 transactions" on the left; outlined "Export CSV" and lime "Add transaction" on the right. Toolbar: filter chips "All" (selected, lime), "Income", "Expenses", "Savings", "Transfers"; ONE search field "Search transactions"; a "Filters" button with a count badge. Under the toolbar, applied filters as pills ("Food & Groceries x", "1 Nov - 30 Nov x") and a "Clear all" text button. Table columns: Description (name, with the category as a small chip under it), Date ("16 Nov 2026" on one line), Source ("Imported" or "Manual" with a small dot), Amount (right-aligned, tabular, never wraps; expenses "-KES 4,850" in coral, income "+KES 85,000" in mint, savings in indigo), and an ALWAYS-VISIBLE "..." button (44px) at the end of each row that opens a small menu with Edit and Delete. Clicking anywhere else on the row opens the details. Rows: Naivas Westlands, Uber trip, KPLC token purchase, Salary - Tech Services Ltd (Income), Netflix subscription, M-Shwari deposit (Savings), Chama contribution (Transfer), Pharmacy - Goodlife (Health). Footer: "Showing 1-12 of 64" and pagination (Previous, 1 2 3 ... 6, Next) with the current page in lime.
2. "Transactions - row menu": the same page with one row's "..." menu open (Edit, Delete).
3. "Transactions - filters panel": a right-hand panel 360px wide over the page: "Filters" with a close X; "Date range" with From and To inputs and quick pills "This month", "Last month", "Last 3 months"; "Category" as a checkbox list of the ten categories; footer buttons "Reset" (outlined) and "Apply filters" (lime).
4. "Transactions - empty": the card with a centred icon, "No transactions yet", "Add one yourself or import an M-Pesa statement. Records are saved on this device.", buttons "Add your first transaction" (lime) and "Import M-Pesa statement" (outlined).
5. "Transactions - no results": search "xyz" typed, "No transactions match your search", "Clear search and filters" button.
6. "Transactions - delete confirm": centred dialog 420px: "Delete transaction?", "Naivas Westlands will be permanently deleted. This cannot be undone.", buttons "Cancel" and a coral "Delete".

MOBILE FRAMES
7. "Transactions - mobile": top bar (FP mark, title "Transactions", sync button, avatar). A horizontally scrolling row of filter chips (All, Income, Expenses, Savings, Transfers) followed by a "Filters" icon button. One search field (16px text, 44px high). The list grouped by date headers ("Today", "Yesterday", "14 Nov") with 64px rows: 40px category icon, name, "Food & Groceries - Imported" at 12px or larger, amount right-aligned. Tapping a row opens the approved detail sheet. A "Load more" button at the end of the list. Floating solid bottom nav.
8. "Transactions - mobile filters sheet": the same content as the desktop filters panel as a bottom sheet with a sticky "Reset" and "Apply filters" footer.
9. "Transactions - mobile empty" and "Transactions - mobile no results".

Motion (150-300ms, off under reduced motion): chip selection slides, panel and sheet slide in, a newly saved row highlights once.
```

### Review checklist for Prompt 1
One search field; the page title appears once; the "..." menu is visible without hovering; amounts never wrap; filters are visible and clearable; mobile rows show the real category and source; empty and no-results states have a next action.

---

## Prompt 2: Budgets

```
Design the BUDGETS page for the existing FynPet project, desktop (1440) and mobile (375 x 812). Use the approved shell exactly (Budgets highlighted; the page title appears once, in the top bar). Same colours, fonts and components as the approved Dashboard. Do NOT redraw the shell, the Dashboard or the toast.

Rules: only these categories: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other. Budgets are monthly, one per category. No accounts, cards or balances. Nothing under 12px, sentence case, amounts never wrap, 44px tap targets, consistent sample figures. Add a small "Sample data - design preview" tag.

DESKTOP FRAMES
1. "Budgets - desktop": top row: "November" and a lime "New budget" button. One summary line, not three cards: "KES 15,880 left across 4 budgets - 72% used - about KES 1,130 a day". Below, budget cards in a two-column grid. Each card shows the one thing that matters: category icon and name; a large "KES 9,500 left"; "about KES 680 a day"; a progress bar (mint under 80%, amber from 80%, coral when over, with the word "over"); "Spent KES 15,500 of KES 25,000"; and a "..." button (44px) with Edit and Delete. Cards: Food & Groceries 25,000 limit, spent 15,500 (62%); Transport 12,000, spent 10,560 (88%, amber); Entertainment 5,000, spent 5,800 (over by 16%: "KES 800 over", with buttons "Raise limit" and "View transactions"); Utilities 15,000, spent 6,000 (40%). A dashed "Add a budget" card at the end.
2. "Budgets - empty": "No budgets yet", "Set a monthly limit for a category to see how much is left.", lime "Create budget".
3. "Budget - new dialog" (modal 480px over the dimmed page): "New budget"; Category select (categories that already have a budget are disabled and say "Already has a budget"); Monthly limit (KES) input; under it a helper "Last month you spent KES 17,900 on Food & Groceries." with a "Use this amount" text button; footer "Cancel" and lime "Create budget".
4. "Budget - edit dialog" (title "Edit budget", button "Save changes") and "Budget - error" ("A budget for this category already exists." under the category field, coral outline).
5. "Budget - delete confirm": "Delete budget?", "The Food & Groceries budget will be deleted. Your transactions are not affected.", "Cancel" and a coral "Delete".
6. "Budget - raise limit": a small dialog 420px "Raise Entertainment limit", current limit KES 5,000, input for the new limit, "Cancel" and "Save".

MOBILE FRAMES
7. "Budgets - mobile": top bar; the one-line summary as a compact card with a thin overall progress bar; the budget cards in a single column with the same content as desktop; the "..." button opens an action sheet (Edit, Delete); a lime "New budget" button at the top right of the title row; floating solid bottom nav with Budgets active.
8. "Budgets - mobile empty", "Budget - mobile new/edit sheet" (bottom sheet with a sticky "Create budget" footer), "Budget - mobile action sheet", "Budget - mobile delete confirm".

Motion (150-400ms, off under reduced motion): progress bars fill from 0 once; the over-budget bar pulses once; sheets slide up.
```

### Review checklist for Prompt 2
Words as well as colour for over budget; "left per day" is present; the duplicate-category rule is explained, not just blocked; delete says transactions are not affected; the last-month hint is honest (hidden when there is no spend).
