# Stitch prompts, one at a time: display currency

Paste **one block at a time**, in order. Wait for Stitch to finish each one before pasting the next. After the last block, export the .zip and send me the file name.

Order: **C1 to C6**.

Already built and approved, so never redraw anything except what each block names: the shell (sidebar, top bar, floating mobile nav), Dashboard, Transactions, Budgets, Analytics, Settings, Add flow, Import review, Fyn AI panel, toast.

## What this feature is (design only this)

A new setting, **"Show amounts in"**, lets the person view totals in KES (default), USD, EUR, GBP, TZS or UGX.

- **Nothing about saving changes.** Transactions are still saved in the currency they were entered in, with the KES value fixed at the time. Budgets are still set and tracked in KES. Only the figures on screen change.
- **Conversions use the person's own saved rates** (Settings → Exchange rates, all "1 X = n KES"). Cross pairs come from those: with 1 USD = KES 130 and 1 EUR = KES 145, 1 EUR = 1.12 USD.
- **There are no live or official rates.** Every converted screen must say so, briefly.
- **Precision:** USD, EUR and GBP show 2 decimals. TZS and UGX show whole numbers. KES keeps its current rule (whole shillings, or two decimals when there are cents).
- **Each screen adds up in the shown currency.** Every recorded amount is converted once; "left", "over" and other differences are worked out from those converted figures, so no screen is off by a cent (USD 13.85 − USD 11.15 shows as USD 2.70).

Sample figures below use 1 USD = KES 130 and are already worked out; use them exactly.

---

## C1: Settings, desktop, with the new setting

```
Continue in the same FynPet project. Edit the approved "Settings - desktop signed out" design into one new desktop 1440 frame named "Settings - display currency". Keep the approved shell, dark theme, fonts and components exactly; only the cards named below change. Rules for this and every frame: nothing under 12px, sentence case, 44px tap targets, no claims about live, official or real-time exchange rates. Add a small "Sample data - design preview" tag.

Add a new card directly ABOVE "Exchange rates", titled "Display currency", with the help line "Choose the currency your totals are shown in."
Inside it:
1. A labelled select "Show amounts in" with the value "USD - US dollar". Options (show the list open in a second frame named "Settings - display currency picker"): KES - Kenyan shilling (default), USD - US dollar, EUR - Euro, GBP - British pound, TZS - Tanzanian shilling, UGX - Ugandan shilling.
2. A small muted info line with an info icon: "Converted at your saved rates below, not live rates. Transactions keep the currency they were entered in, and budgets are still tracked in KES."
3. A small "Worked out from your rates" list in muted text, two lines: "1 USD = KES 130" and "1 EUR = 1.12 USD".
No save button: the choice applies as soon as it is picked (show the toast "Showing amounts in USD" at the bottom of the frame).

The "Exchange rates" card below stays exactly as approved (1 USD = 130, 1 EUR = 145, 1 GBP = 165, 1 TZS = 0.045, 1 UGX = 0.034 KES, "Save rates").
```

## C2: Dashboard, desktop, shown in USD

```
Continue in the same FynPet project. Edit the approved desktop Dashboard into one new desktop 1440 frame named "Dashboard - shown in USD". Same shell, dark theme and rules (nothing under 12px, sample-data tag). Change only the currency of the figures and add the indicator described here.

1. In the top bar, next to the page title and date, a small outlined pill "USD" with a tiny info icon; its tooltip (draw it open) reads "Shown in USD at your saved rate, 1 USD = KES 130. Change in Settings."
2. Hero card: "USD 394.39" net cash flow. Under it: "Income USD 676.92" and "Spent USD 282.53". Below the big number, one muted line: "KES 51,270.50 recorded". The spent/kept bar and the "vs October" chip stay as they are.
3. Cash flow chart: axis labels "USD 0", "USD 250", "USD 500", "USD 750"; tooltip for the 1-4 Nov bar: "Income USD 676.92 / Expenses USD 109.47".
4. "Where your money went": centre "Total spent" with a small "USD" and "282.53"; legend amounts in USD with 2 decimals: Food & Groceries 114.47, Shopping 61.53, Transport 46.92, Utilities 26.92, Health 21.54, Other 11.15.
5. "Needs attention": "Food & Groceries is USD 22.16 over budget".
6. Recent transactions: amounts in USD. When a transaction was entered in a different currency from the one shown, its original amount sits beneath in small muted text. Java House shows only "-USD 5.00" (it was entered in USD). KPLC prepaid shows "-USD 26.92" with "KES 3,500" beneath.
```

## C3: Budgets and Transactions, desktop, shown in USD

```
Continue in the same FynPet project. Create two desktop 1440 frames, edited from the approved Budgets and Transactions pages. Same shell, dark theme and rules (nothing under 12px, sample-data tag). Each keeps the "USD" pill in the top bar from "Dashboard - shown in USD".

Frame 1, "Budgets - shown in USD":
- The summary line: "USD 6.70 left across 4 budgets · 97% used · about USD 0.56 a day".
- Food & Groceries card: big "USD 22.16 over", "Limit exceeded by 24%", "Spent USD 114.47 of USD 92.31", and under the card's title one muted line "Limit set in KES 12,000". Every budget card shows this "Limit set in KES ..." line.
- Entertainment card: "USD 2.70 left", "Spent USD 11.15 of USD 13.85", "Limit set in KES 1,800".

Frame 2, "Budget dialog - shown in USD": the approved "Edit budget" dialog over the dimmed Budgets page. The limit field stays in KES: label "Monthly limit (KES)", value "12,000". Under the field, muted: "About USD 92.31 at your saved rate." Save button as approved.

Frame 3, "Transactions - shown in USD": the approved table with the Amount column in USD ("-USD 5.00", "-USD 11.15", "+USD 676.92"). Rows entered in KES show the original small and muted beneath the USD amount ("KES 1,450"). The page subtitle reads "19 transactions · shown in USD".
```

## C4: Analytics, desktop, shown in USD

```
Continue in the same FynPet project. Create one desktop 1440 frame "Analytics - shown in USD", edited from the approved Analytics page. Same shell, dark theme and rules (nothing under 12px, sample-data tag), with the "USD" pill in the top bar.

- "Am I saving?" sentence: "You saved USD 141.54 in November, 21% of your income." Bar tooltips in USD.
- "How close am I to my goal?": "USD 395.38 of USD 23,076.92", 1.7%, and a muted line "Goal set in KES 3,000,000".
- Monthly summary table: every money column in USD with 2 decimals; Savings rate column unchanged.
- "Export CSV" stays as approved, with a muted note beside it: "Exports in the currency each transaction was entered in, plus KES."
```

## C5: Phone, shown in USD

```
Continue in the same FynPet project. Create three phone frames, 375 wide, using the approved mobile shell (FP top bar, floating bottom nav with raised Add) and the same dark theme and rules (nothing under 12px, 44px tap targets, sample-data tag).

Frame 1, "Home - shown in USD (mobile)": the approved mobile Home with the figures from "Dashboard - shown in USD". The "USD" pill sits in the top bar, left of the sync button; tapping it opens Frame 3.
Frame 2, "Settings - display currency (mobile)": the "Display currency" card from "Settings - display currency" at phone width; the select is full width.
Frame 3, "Display currency - bottom sheet (mobile)": a bottom sheet titled "Show amounts in" listing the six currencies as 56px rows with radio buttons (USD selected), the muted note "Converted at your saved rates, not live rates.", and a text link "Edit exchange rates" at the bottom.
```

## C6: Back to KES and a converted-figure detail

```
Continue in the same FynPet project. Create two frames with the same dark theme and rules (nothing under 12px, sample-data tag).

Frame 1, desktop 1440, "Dashboard - back to KES": the approved Dashboard exactly as it is today (KES figures), with no currency pill in the top bar. This confirms that when KES is chosen, nothing extra is shown.

Frame 2, phone 375, "Transaction detail - shown in USD (mobile)": the approved transaction detail sheet for "Java House". Big amount "-USD 5.00". A details row "Entered as" with "USD 5.00 · saved as KES 650 on 19 Nov". Edit and Delete buttons as approved.
```
