# Stitch prompts, one at a time: Transactions and Budgets

Paste **one block at a time**, in order. Wait for Stitch to finish each one before pasting the next. Every block starts with the same short rules, so Stitch has them each time. After the last block of a page, export the .zip and send me the file name.

Order: **T1 to T7** (Transactions), then **B1 to B6** (Budgets).

Already built and approved, so never redraw: the Dashboard, the shell (sidebar, top bar, floating mobile nav), the Add transaction dialog and sheet, the transaction detail sheet, the toast with Undo.

---

# TRANSACTIONS

## T1: Desktop page

```
Continue in the same FynPet project. Design the TRANSACTIONS page, desktop 1440 wide, one frame named "Transactions - desktop".

Rules for this and every frame: use the approved shell exactly (sidebar with Transactions highlighted; top bar with the page title shown ONCE and one search field). Same dark colours, fonts and components as the approved Dashboard. FynPet has no bank accounts, cards or balances. Only these categories: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other. No claims about encryption, automatic sync or real time. Nothing under 12px, sentence case, amounts never wrap, 44px tap targets, one plus sign on Add buttons. Add a small "Sample data - design preview" tag.

Content: one card. Header row: "64 transactions" on the left; outlined "Export CSV" and lime "Add transaction" on the right. Toolbar: filter chips "All" (selected, lime), "Income", "Expenses", "Savings", "Transfers"; ONE search field "Search transactions"; a "Filters" button with a count badge "2". Under the toolbar show applied filters as pills "Food & Groceries x" and "1 Nov - 30 Nov x" with a "Clear all" text button.

Table columns: Description (the name, with the category as a small chip under it), Date ("16 Nov 2026" on one line), Source ("Imported" or "Manual" with a small dot), Amount (right-aligned, tabular, never wraps: expenses "-KES 4,850" in coral, income "+KES 85,000" in mint, savings in indigo), and an ALWAYS-VISIBLE "..." button (44px) at the end of each row. Eight rows: Naivas Westlands (Food & Groceries, Imported), Uber trip (Transport, Imported), KPLC token purchase (Utilities, Imported), Salary - Tech Services Ltd (Income, Manual, +KES 85,000), Netflix subscription (Entertainment, Manual), M-Shwari deposit (Savings, Imported), Chama contribution (Transfer, Manual), Pharmacy - Goodlife (Health, Imported). Footer: "Showing 1-12 of 64" and pagination (Previous, 1 2 3 ... 6, Next) with the current page in lime.
```

## T2: Row menu and delete confirmation

```
Continue in the same FynPet project. Create two frames, using the exact same page, shell and rules as "Transactions - desktop" (dark theme, real categories only, no balances or accounts, nothing under 12px, amounts never wrap, sample-data tag).

Frame 1, "Transactions - row menu": the same page with the "..." button on the "Naivas Westlands" row pressed and a small menu open next to it with two items: "Edit" and "Delete" (Delete in coral). Both items are at least 44px tall.

Frame 2, "Transactions - delete confirm": the same page dimmed behind a centred dialog 420px wide. A coral outlined icon, the title "Delete transaction?", the text "Naivas Westlands will be permanently deleted. This cannot be undone.", and two buttons: "Cancel" (outlined) and "Delete" (coral).
```

## T3: Filters panel

```
Continue in the same FynPet project. Create one frame named "Transactions - filters panel", desktop 1440 wide, same page, shell and rules as "Transactions - desktop" (dark theme, real categories only, no balances or accounts, nothing under 12px, sample-data tag).

The Transactions page is dimmed behind a right-hand panel 360px wide, full height. Header: "Filters" with a close X (44px). Sections:
1. "Date range": two inputs "From" and "To", and three quick pills below them: "This month", "Last month", "Last 3 months".
2. "Category": a checkbox list of the ten categories (Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other); show Food & Groceries checked.
Footer (sticky): "Reset" (outlined) and "Apply filters" (lime).
```

## T4: Desktop empty and no results

```
Continue in the same FynPet project. Create two frames, desktop 1440 wide, same shell and rules as "Transactions - desktop" (dark theme, nothing under 12px, sample-data tag). The page title appears once, in the top bar.

Frame 1, "Transactions - empty": a card with the toolbar disabled, and in the middle a centred icon, the heading "No transactions yet", the text "Add one yourself or import an M-Pesa statement. Records are saved on this device.", and two buttons: "Add your first transaction" (lime, with one plus sign) and "Import M-Pesa statement" (outlined).

Frame 2, "Transactions - no results": the toolbar with the text "xyz" typed in the search field, and in the middle a centred icon, the heading "No transactions match your search", the text "Try a different word or clear your filters.", and one button "Clear search and filters" (outlined).
```

## T5: Mobile list

```
Continue in the same FynPet project. Create one MOBILE frame, 375 x 812, named "Transactions - mobile".

Use the approved mobile shell exactly: top bar with the FP mark, the title "Transactions", a sync button and the avatar; the floating solid bottom navigation (Home, Transactions active, raised lime Add, Budgets, More). Same dark colours and components as the approved Dashboard. Real categories only (Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other). No balances or accounts. Nothing under 12px, inputs 16px, 44px tap targets, amounts never wrap, sample-data tag.

Content: a horizontally scrolling row of filter chips (All selected in lime, Income, Expenses, Savings, Transfers) followed by a "Filters" icon button with a count badge. Below it ONE search field "Search transactions" (44px high). Then the list grouped by date headers "Today", "Yesterday", "14 Nov", with 64px rows: a 40px category icon, the name (16px), the line "Food & Groceries - Imported" (12px or larger, secondary colour) and the amount on the right (coral for expenses, mint for income). Rows: Naivas Westlands, Uber trip, KPLC token purchase, Salary - Tech Services Ltd (Income), Netflix subscription, M-Shwari deposit (Savings). End the list with a "Load more" button. Do not draw row actions: tapping a row opens the detail sheet that already exists.
```

## T6: Mobile filters sheet

```
Continue in the same FynPet project. Create one MOBILE frame, 375 x 812, named "Transactions - mobile filters sheet". Same mobile shell, dark theme and rules as "Transactions - mobile" (real categories only, nothing under 12px, 44px tap targets, sample-data tag).

The mobile Transactions page is dimmed behind a bottom sheet about 85% of the screen height with rounded top corners (24px) and a handle bar. Title "Filters" with a close X (44px). Sections: "Date range" with "From" and "To" inputs (16px text) and quick pills "This month", "Last month", "Last 3 months"; "Category" as a checkbox list of the ten categories (Food & Groceries shown checked). A sticky footer above the safe area: "Reset" (outlined) and "Apply filters" (lime), side by side, 48px tall. The bottom navigation is hidden while the sheet is open.
```

## T7: Mobile empty and no results

```
Continue in the same FynPet project. Create two MOBILE frames, 375 x 812, with the same mobile shell, floating bottom navigation (Transactions active), dark theme and rules as "Transactions - mobile" (nothing under 12px, 44px tap targets, sample-data tag).

Frame 1, "Transactions - mobile empty": the filter chips and search field shown but disabled, and a centred icon, the heading "No transactions yet", the text "Add one yourself or import an M-Pesa statement. Saved on this device.", and two full-width buttons: "Add your first transaction" (lime, one plus sign) and "Import M-Pesa statement" (outlined).

Frame 2, "Transactions - mobile no results": the text "xyz" typed in the search field, a centred icon, the heading "No transactions match your search", the text "Try a different word or clear your filters.", and a full-width outlined button "Clear search and filters".
```

---

# BUDGETS

## B1: Desktop page

```
Continue in the same FynPet project. Design the BUDGETS page, desktop 1440 wide, one frame named "Budgets - desktop".

Rules for this and every frame: use the approved shell exactly (sidebar with Budgets highlighted; top bar with the page title shown ONCE). Same dark colours, fonts and components as the approved Dashboard. FynPet has no bank accounts, cards or balances. Only these categories: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other. Budgets are monthly, one per category. Nothing under 12px, sentence case, amounts never wrap, 44px tap targets, one plus sign on Add buttons. Add a small "Sample data - design preview" tag.

Content: top row with the heading "November" on the left and a lime "New budget" button on the right. Directly under it ONE summary line (not three cards): "KES 15,880 left across 4 budgets - 72% used - about KES 1,130 a day". Below, budget cards in a two-column grid. Each card shows the one thing that matters: category icon and name; a large "KES 9,500 left"; "about KES 680 a day"; a progress bar (mint under 80%, amber from 80% up, coral when over, always with a word such as "over"); "Spent KES 15,500 of KES 25,000"; and a "..." button (44px) with Edit and Delete.

Cards: Food & Groceries, limit 25,000, spent 15,500 (62%, mint). Transport, limit 12,000, spent 10,560 (88%, amber, "KES 1,440 left"). Entertainment, limit 5,000, spent 5,800 (over by 16%: "KES 800 over", coral, with two buttons "Raise limit" and "View transactions"). Utilities, limit 15,000, spent 6,000 (40%, mint). Finally a dashed "Add a budget" card.
```

## B2: Empty state

```
Continue in the same FynPet project. Create one frame, desktop 1440 wide, named "Budgets - empty". Same shell (Budgets highlighted, page title once), dark theme and rules as "Budgets - desktop" (nothing under 12px, sample-data tag).

Show the heading "November" and the lime "New budget" button. In the middle of the page a centred card with an icon, the heading "No budgets yet", the text "Set a monthly limit for a category to see how much is left.", and one lime button "Create budget" (one plus sign).
```

## B3: New budget dialog

```
Continue in the same FynPet project. Create one frame, desktop 1440 wide, named "Budget - new dialog". Same shell, dark theme and rules as "Budgets - desktop" (real categories only, nothing under 12px, sample-data tag).

The Budgets page is dimmed behind a centred modal 480px wide. Title "New budget" with a close X (44px). Fields: "Category" (a select; Food & Groceries, Transport, Entertainment and Utilities are disabled and each says "Already has a budget"; Health is selected); "Monthly limit (KES)" (an input showing 8,000). Under the limit input a helper line "Last month you spent KES 6,200 on Health." with a small text button "Use this amount". Footer: "Cancel" (outlined) and "Create budget" (lime).
```

## B4: Edit, error, delete and raise limit

```
Continue in the same FynPet project. Create four desktop 1440 frames over the dimmed Budgets page, same shell, dark theme and rules as before (real categories only, nothing under 12px, sample-data tag).

Frame 1, "Budget - edit dialog": the same modal as "Budget - new dialog" but titled "Edit budget", Category set to Food & Groceries, limit 25,000, and the button "Save changes".

Frame 2, "Budget - duplicate error": the new-budget modal with Category set to Food & Groceries, the select outlined in coral, and under it the message "A budget for this category already exists."

Frame 3, "Budget - delete confirm": a centred dialog 420px: title "Delete budget?", text "The Food & Groceries budget will be deleted. Your transactions are not affected.", buttons "Cancel" (outlined) and "Delete" (coral).

Frame 4, "Budget - raise limit": a small centred dialog 420px: title "Raise Entertainment limit", the line "Current limit KES 5,000. Spent KES 5,800.", one input "New monthly limit (KES)" showing 6,000, and buttons "Cancel" (outlined) and "Save" (lime).
```

## B5: Mobile page

```
Continue in the same FynPet project. Create one MOBILE frame, 375 x 812, named "Budgets - mobile".

Use the approved mobile shell exactly: top bar with the FP mark, the title "Budgets", a sync button and the avatar; the floating solid bottom navigation (Home, Transactions, raised lime Add, Budgets active, More). Same dark colours and components as the approved Dashboard. Real categories only. No balances or accounts. Nothing under 12px, 44px tap targets, amounts never wrap, sample-data tag.

Content: a title row with "November" on the left and a lime "New budget" button (one plus sign) on the right. Under it ONE compact summary card: "KES 15,880 left across 4 budgets", "72% used - about KES 1,130 a day" and a thin overall progress bar. Then the same four budget cards as the desktop page in a single column: Food & Groceries (KES 9,500 left, about KES 680 a day, 62%), Transport (KES 1,440 left, about KES 100 a day, 88%, amber), Entertainment (KES 800 over, coral, with buttons "Raise limit" and "View transactions"), Utilities (KES 9,000 left, 40%). Each card has a "..." button (44px).
```

## B6: Mobile sheets and empty state

```
Continue in the same FynPet project. Create four MOBILE frames, 375 x 812, same mobile shell, dark theme and rules as "Budgets - mobile" (real categories only, nothing under 12px, 44px tap targets, sample-data tag).

Frame 1, "Budgets - mobile empty": the title row and the lime "New budget" button, and a centred card with an icon, the heading "No budgets yet", the text "Set a monthly limit for a category to see how much is left.", and a full-width lime button "Create budget". Floating bottom navigation with Budgets active.

Frame 2, "Budget - mobile action sheet": the budgets page dimmed behind a small bottom sheet (rounded top, handle bar) titled "Food & Groceries" with two rows, each 56px: "Edit" and "Delete" (coral).

Frame 3, "Budget - mobile new sheet": a bottom sheet about 80% high titled "New budget" with a close X; the "Category" select, the "Monthly limit (KES)" input (16px text) and the helper "Last month you spent KES 6,200 on Health." with "Use this amount"; a sticky footer with a full-width lime "Create budget" button above the safe area. The bottom navigation is hidden while the sheet is open.

Frame 4, "Budget - mobile delete confirm": a bottom sheet titled "Delete budget?" with the text "The Food & Groceries budget will be deleted. Your transactions are not affected." and two full-width buttons: "Cancel" (outlined) and "Delete" (coral).
```
