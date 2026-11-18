# Stitch prompts, one at a time: Analytics

Paste **one block at a time**, in order. Wait for Stitch to finish each one before pasting the next. After the last block, export the .zip and send me the file name.

Order: **A1 to A7**.

Already built and approved, so never redraw: the Dashboard, the shell (sidebar, top bar, floating mobile nav), Transactions, Budgets, the Add transaction dialog and sheet, the toast with Undo.

What the page must answer (plain questions, no invented score): "Am I saving?", "Am I covered if something goes wrong?", "How close am I to my goal?". The old "Financial Health Score" is dropped.

---

## A1: Desktop page

```
Continue in the same FynPet project. Design the ANALYTICS page, desktop 1440 wide, one frame named "Analytics - desktop".

Rules for this and every frame: use the approved shell exactly (sidebar with Analytics highlighted; top bar with the page title shown ONCE). Same dark colours, fonts and components as the approved Dashboard and Budgets pages. FynPet has no bank accounts, cards or balances. Only these categories: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other. No claims about encryption, automatic sync or real time. No made-up scores or grades. Nothing under 12px, sentence case, amounts never wrap, 44px tap targets, one plus sign on Add buttons. Add a small "Sample data - design preview" tag.

Content: three stacked cards, each a plain question as its heading, a short answer, and one next step.

Card 1, "Am I saving?": a 6-month bar chart (Jun to Nov, one bar per month for money saved, the current month in lime and the others muted), a one-line summary "You saved KES 18,400 in November, 21% of your income." and a small "View as table" toggle. A small outlined button "Ask Fyn about this" at the bottom right.

Card 2, "Am I covered if something goes wrong?": the big line "2.4 months of expenses saved", a progress bar toward 6 months with tick marks at 3 and 6, the sentence "Aim for 3 to 6 months." and a button "Set a savings goal". "Ask Fyn about this" outlined button.

Card 3, "How close am I to my goal?": "KES 142,000 of KES 3,000,000" and "4.7%", a progress bar, "At your current pace: about 6.8 years", the plain explanation "A common rule is 25 times your yearly expenses." and a text button "Change target". "Ask Fyn about this" outlined button.

Below the cards, a card titled "Monthly summary" with a table: columns Month, Income, Expenses, Saved, Net, Savings rate. Six rows (Nov to Jun). Saved (money moved to savings) and Net (income minus expenses) must be different numbers, for example Nov: Income KES 88,000, Expenses KES 61,200, Saved KES 18,400, Net KES 26,800, Savings rate 21%. Numbers right-aligned and tabular, net positive in mint and negative in coral.
```

## A2: Table view and chart tooltip

```
Continue in the same FynPet project. Create two desktop 1440 frames, same shell, cards, dark theme and rules as "Analytics - desktop" (nothing under 12px, sample-data tag, no scores).

Frame 1, "Analytics - chart tooltip": the same page with the pointer on the October bar of the "Am I saving?" chart. A small tooltip above it: "October", "Saved KES 12,000", "Savings rate 14%".

Frame 2, "Analytics - saving as table": the same page with "View as table" switched on: the chart in card 1 is replaced by a compact table with columns Month, Saved, Savings rate for the six months, and the toggle now reads "View as chart".
```

## A3: Desktop empty

```
Continue in the same FynPet project. Create one desktop 1440 frame named "Analytics - empty". Same shell (Analytics highlighted, page title once), dark theme and rules as "Analytics - desktop" (nothing under 12px, sample-data tag, no scores).

In the middle of the page a centred card with an icon, the heading "No data yet", the text "Add a few transactions and your savings picture appears here. Records are saved on this device.", and two buttons: "Add transaction" (lime, one plus sign) and "Import M-Pesa statement" (outlined).
```

## A4: Savings goal and target dialogs

```
Continue in the same FynPet project. Create two desktop 1440 frames over the dimmed Analytics page, same shell, dark theme and rules as "Analytics - desktop" (nothing under 12px, sample-data tag).

Frame 1, "Analytics - set savings goal dialog": a centred modal 480px wide. Title "Set a savings goal" with a close X (44px). One field "How many months of expenses do you want saved?" with the value 6 and the helper text "Most people aim for 3 to 6 months. Your monthly expenses average KES 61,200." Footer: "Cancel" (outlined) and "Save goal" (lime). Show an error variant text in a small note under the field: "Enter a number between 1 and 24."

Frame 2, "Analytics - change target dialog": a centred modal 480px wide. Title "Change your target" with a close X. Field "Target amount (KES)" showing 3,000,000, and below it the helper "A common rule is 25 times your yearly expenses. For you that is about KES 18,360,000." with a small text button "Use this amount". Footer: "Cancel" (outlined) and "Save target" (lime).
```

## A5: "Ask Fyn" consent

```
Continue in the same FynPet project. Create one desktop 1440 frame named "Analytics - ask Fyn consent", over the dimmed Analytics page, same shell, dark theme and rules as "Analytics - desktop" (nothing under 12px, sample-data tag).

A centred modal 480px wide. Title "Ask Fyn about this?" with a close X (44px). Text: "Fyn AI will see a summary of your records (totals by month and category, no names or phone numbers) to answer. Nothing is sent until you agree." Below it a read-only box with the pre-filled question "Am I saving enough each month?". Footer: "Cancel" (outlined) and "Agree and ask" (lime).
```

## A6: Mobile

```
Continue in the same FynPet project. Create one MOBILE frame, 375 x 812, named "Analytics - mobile".

Use the approved mobile shell exactly: top bar with the FP mark, the title "Analytics", a sync button and the avatar; the floating solid bottom navigation with "More" shown active (Analytics is reached from More). Same dark colours and components as the approved mobile Dashboard. No scores, no balances or accounts. Nothing under 12px, 44px tap targets, amounts never wrap, sample-data tag.

Content, stacked full-width cards: "Am I saving?" (6-month bar chart, current month in lime, one-line summary, "View as table" toggle, "Ask Fyn about this" outlined button); "Am I covered if something goes wrong?" ("2.4 months of expenses saved", progress bar to 6 months, "Aim for 3 to 6 months.", button "Set a savings goal", "Ask Fyn about this"); "How close am I to my goal?" ("KES 142,000 of KES 3,000,000 - 4.7%", progress bar, "At your current pace: about 6.8 years", "A common rule is 25 times your yearly expenses.", text button "Change target", "Ask Fyn about this"). Then a "Monthly summary" shown as six small cards instead of a table, each with the month as the title and rows Income, Expenses, Saved, Net, Savings rate (Saved and Net must differ).
```

## A7: Mobile empty

```
Continue in the same FynPet project. Create one MOBILE frame, 375 x 812, named "Analytics - mobile empty". Same mobile shell (title "Analytics", floating bottom navigation with More active), dark theme and rules as "Analytics - mobile" (nothing under 12px, 44px tap targets, sample-data tag).

A centred icon, the heading "No data yet", the text "Add a few transactions and your savings picture appears here. Saved on this device.", and two full-width buttons: "Add transaction" (lime, one plus sign) and "Import M-Pesa statement" (outlined).
```
