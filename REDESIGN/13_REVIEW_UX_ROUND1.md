# Review of the UX rework, round 1

16 November 2026. From `stitch_fynpet_kenyan_finance_dashboard.zip` (updated export; screenshots plus exported HTML, read but not run). Three new frames arrived: `dashboard_desktop`, `dashboard_first_use_4`, `import_review_desktop`. Copied to `REDESIGN/reference/v2_*`.

## Verdict

**This is a real improvement.** The Dashboard now answers "how am I doing and what needs attention?" in one screen, and Import review asks the user to look at one row instead of 58. Approve both with conditions. The first-use frame needs copy fixes. **Seven of the ten frames I asked for did not arrive**: mobile Dashboard, mobile first use, all Add-transaction frames, mobile Import review.

| Frame | Verdict |
|---|---|
| `dashboard_desktop` | Approve with conditions |
| `import_review_desktop` | Approve with conditions |
| `dashboard_first_use_4` | Revise (false claims) |
| Mobile Dashboard, mobile first use | **Not delivered** |
| Add transaction (mobile sheet, choice sheet, desktop modal) | **Not delivered** |
| Import review mobile | **Not delivered** |

## What got better
- Dashboard: one "This month" card with the net figure and both actions; a **Needs attention** list with one button per item; six blocks instead of nine; budgets show "KES 9,500 left · about KES 680 a day"; text is larger and easier to scan; one consistent shell on all three frames.
- Import review: plain-English summary ("We found 58 transactions. 51 look good, 6 are already in FynPet, 1 needs your check."), totals check in one sentence, the single row that needs a decision first, the rest collapsed, "51 will be saved" in a sticky footer.

## Conditions — Dashboard
1. **Category colours break the colour rules.** Lime is used for Food & Groceries in the donut and teal-green for Transport (green means income; lime means actions), and the pink for Entertainment sits next to coral. Use blue, violet, amber, sand, slate and grey for categories.
2. **Hero bar mismatch.** The legend says "Income" (mint) and "Spent" (coral), but the bar shows "Spent 63%" and "Retained 37%". Make the bar match the legend, or relabel it "Spent / Kept" and drop the Income mint dot.
3. **Donut legend collides** ("34%KES 18,224"), and lists five categories that add up to 93% with no "Other". Add "Other 7%" and give the columns room.
4. **"Auto-categorized via statement tags"** under Recent transactions is an invented claim. Remove.
5. **Tooltip covers the top of the highlighted bar**, and ~20 labels are still 11 px. Raise to 12 px.
6. **Budgets card has about 180 px of blank space** under three rows because it matches the height of the transactions card. Let the cards size to their content, or add the "Last month you spent…" line.
7. No accessible names on icon buttons (0 `aria-label`s); add during the build.
8. The sample's five transactions all say "16 Nov"; real data will have varied dates, so this is only a mock-up issue.

## Conditions — First use (`dashboard_first_use_4`)
- **Remove "ZERO-KNOWLEDGE SETUP"**: false, because statement text goes to Anthropic after consent.
- **Remove "Local SQLite client storage"**: FynPet uses browser localStorage, not SQLite.
- **Remove "Nothing is uploaded to cloud storage"** and **"No third-party financial tracking"**: misleading once AI import or sync is used. Use: "Your records stay on this device until you sign in."
- Show "KES 0" without ".00".
- Structure is good: three numbered steps with one button each.

## Conditions — Import review (`import_review_desktop`)
1. **The page title says "Dashboard" and no sidebar item is highlighted.** It must say "M-Pesa import" with M-Pesa Import active (the shell must follow the page).
2. **The sticky footer hides the bottom of the page**: the "Privacy guarantee" card is cut off behind it and the sample tag covers the Save button. Add bottom padding equal to the footer height. (The sample tag is prototype only.)
3. **Remove "Privacy guarantee"** as a heading ("guarantee" overclaims); use the approved wording under a plain "How your data is handled" heading: "The PDF is opened in your browser and never uploaded. The transaction text (dates, amounts, merchant and counterparty names) is sent through Netlify to Anthropic to be categorised after you agree. Phone numbers are removed first."
4. **Jargon:** "M-PESA STATEMENT INGESTION", "Algorithmic classifications", "Duplicate prevention", "Inflow/Outflow detected". Use "M-Pesa import", "Suggested categories", "Already in FynPet", "Money in / Money out".
5. "Every row has been parsed locally in browser memory" is only half true (the PDF is read locally; the text is categorised by AI after consent). Say: "We read your PDF on this device."
6. The row has both a "Category: Other" dropdown and a "Change category" button; keep one control.

## Still to design (next Stitch round)
Mobile Dashboard and first use; Add transaction (mobile sheet, choice sheet, desktop modal); mobile Import review. Then the other pages in the new, simpler style (Transactions, Budgets, Analytics, Settings, Fyn AI, dialogs, mobile), using the same shell.

## Stitch prompt — UX rework, round 2

```
Continue the FynPet UX rework in the same project. Keep the new simplified Dashboard (desktop) and Import review (desktop) frames and the single shell. Make ONLY these changes, then create the missing frames.

CHANGES
1. "Dashboard - desktop": category colours in the donut and legends use blue, violet, amber, sand, slate and grey only (no lime, no green, no pink or coral); the legend shows Food & Groceries 34%, Transport 21%, Utilities 16%, Shopping 12%, Entertainment 10%, Other 7% with amounts, columns spaced so "34%" and "KES 18,224" never touch. The hero bar's legend must match the bar: segments "Spent" (coral) and "Kept" (mint) with "Income KES 85,000" shown as plain text. Remove "Auto-categorized via statement tags". Minimum text 12px. Let the Budgets and Recent transactions cards size to their content, and add under the budget rows: "Last month you spent KES 17,900 on Food & Groceries." Tooltip sits above the highlighted bar without covering it.
2. "Dashboard - first use": remove the label "Zero-knowledge setup" and the line "Local SQLite client storage...". Replace the footer with "Your records stay on this device until you sign in." Show "KES 0" without ".00".
3. "Import review - desktop": page title "M-Pesa import" with M-Pesa Import highlighted in the sidebar; heading "How your data is handled" with only the approved wording "The PDF is opened in your browser and never uploaded. The transaction text (dates, amounts, merchant and counterparty names) is sent through Netlify to Anthropic to be categorised after you agree. Phone numbers are removed first."; replace jargon: "M-Pesa import" (not "statement ingestion"), "Suggested categories ready to save", "Already in FynPet", "Money in" / "Money out"; first sentence under the summary "We read your PDF on this device."; keep one category control on the check row; add bottom padding so no content is hidden behind the sticky footer.

NEW FRAMES (use the same shell and rules; real categories only; 12px minimum; sample-data tag)
4. "Dashboard - mobile" (375 x 812): the same six blocks stacked in this order: This month (net figure, income, spent, "Add transaction" and "Import statement" buttons), Needs attention (up to three rows with one button each), Cash flow (7D/1M/3M), Where your money went, Budgets (three closest to limit with "left per day"), Recent transactions (5 rows). No more than about four screens long. The first screen shows the net figure and the Add transaction button. Solid floating bottom nav: Home, Transactions, Add, Budgets, More.
5. "Dashboard - mobile first use": "This month KES 0" with the sentence "Add your first transaction or import a statement to see your month." and the three numbered steps as stacked cards with one button each.
6. "Add - choice sheet" (mobile): small bottom sheet with two large rows, "Add a transaction" (type it in) and "Import M-Pesa statement" (from a PDF).
7. "Add transaction - mobile sheet": bottom sheet with a very large amount input "KES 0" (48px) and the numeric keypad open; segmented "Expense / Income" with a small "More types" link for Savings and Transfer; four suggested category chips (Food & Groceries, Transport, Utilities, Other) plus "More"; lime "Save" button; text button "Save and add another"; a collapsed "More details" line (description, date defaulting to today, currency, notes). Also "Add transaction - saved" showing the toast "Transaction saved - Undo" above the nav.
8. "Add transaction - desktop dialog" (modal 480px) with the same simplified form, "More details" collapsed, and "Add transaction - error" with the message "Enter an amount greater than zero." under the amount field.
9. "Import review - mobile" (375 x 812): summary sentence, totals line, the "Needs your check" row first with one category control and "Skip this one", collapsed "Already in FynPet (6)" and "Looks good (51)" with Show, a "How your data is handled" link, sticky "Save 51 transactions" button above the safe area.
```

## After round 2
If these come back clean, I will approve the Dashboard, Add flow and Import review (desktop and mobile), then rewrite prompts for Transactions, Budgets, Analytics, Settings, Fyn AI and the dialogs in the same simplified style and shell.
