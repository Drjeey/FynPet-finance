# Review: display currency (Stitch export 7)

Export: `stitch_fynpet_kenyan_finance_dashboard (7).zip`, reviewed 19 November 2026. Prompts: `25_STITCH_PROMPTS_DISPLAY_CURRENCY.md`.

**Verdict: approved with build conditions.** The patterns the feature needs came through clearly. Stitch also drifted the shell on several frames and invented copy, but the build restyles the pages that already exist, so those problems are listed below as things to ignore, not as a reason to redo the frames.

## Frame by frame

| Frame | Verdict | Notes |
|---|---|---|
| Settings - display currency (C1) | Approved | The card is placed correctly, with the right copy and the "Worked out from your rates" list. The toast text wraps and gets clipped ("Showing amounts in / USD"); build it on one line. |
| Settings - display currency picker (C1) | Rejected, not needed | It draws two open lists and puts the select in place of the Profile name field. The build uses a native `<select>`. |
| Dashboard - shown in USD (C2) | Approved with conditions | The USD pill, tooltip, "KES 51,270.50 recorded", chart axis and tooltip, donut, Needs attention and the original amount under each recent transaction are all right. **The hero still reads "KES 31,400"**; build it as USD 394.39. The Budgets card and the "Last month you spent" line are still in KES; build them in the shown currency, and keep "Limit set in KES" for limits only. The sample tag covers the "Other" legend row. |
| Budgets - shown in USD (C3) | Approved with conditions | The summary line, "USD 22.16 over", "Spent USD 114.47 of USD 92.31" and "Limit set in KES ..." on every card are approved. Ignore the broken logo images, "Local DB Ready", the "November 2024" year and the extra logo in the top bar. The sample summary (6.70 left) doesn't match the four cards Stitch invented; the build computes it from real data. |
| Budget dialog - shown in USD (C3) | Approved with conditions | The KES field and "About USD 92.31 at your saved rate." are approved. Drop the invented "Instant local recalculation / offline ledger" box and "Category is locked for active ledger periods". Use "USD 172.30" instead of "$172.30": no currency symbols anywhere. |
| Transactions - shown in USD (C3) | Approved with conditions | The USD amount with the original small and muted beneath it is approved, and the figures are correct. Ignore the duplicated "19 transactions" heading, the white search box and the misaligned category indent. Subtitle: "19 transactions · shown in USD". |
| Analytics - shown in USD (C4) | Approved with conditions | The saving sentence, "Goal set in KES 3,000,000", the table in USD and the export note are approved. Ignore the 2024 years and the invented copy ("Long-term independence", "6-month median rate"). **The table shows the cent problem:** July 615.38 − 473.08 = 142.30, but net shows 142.31. The build must compute net from the converted figures (rule 5). |
| Home - shown in USD (mobile) (C5) | Approved with conditions | The hero, "recorded" line, warning and transaction originals are approved. The USD pill belongs in the top bar to the left of sync, not in a separate "Base view: US Dollar" card. Use "USD 360", not "$360", in the chart. "Nov 2024" should be 2026. Keep the approved bottom nav. |
| Settings - display currency (mobile) (C5) | Approved with conditions | The card content is right. The bottom nav is wrong: use the approved Home, Transactions, raised Add, Budgets, More. Ignore the broken logo, the back row and the made-up GBP rate of 168.50. |
| Display currency - bottom sheet (mobile) (C5) | Approved with conditions | The six radio rows, the note and "Edit exchange rates" are approved. The title must be "Show amounts in" (Stitch wrote "Account Security"). Drop "Choose your primary display valuation", the "KES Base" chip and the "1 KES ≈ $0.0077" badge. Tapping a row applies it and closes the sheet; no "Apply Currency" button. |
| Dashboard - back to KES (C6) | Rejected, not needed | It isn't the approved dashboard: the layout is different, text is truncated and a "TABULAR KES FIGURES" label leaked in. The current build is the KES reference; with KES chosen, nothing extra is shown. |
| Transaction detail - shown in USD (mobile) (C6) | Approved with conditions | "-USD 5.00" and the "Entered as USD 5.00 · saved as KES 650 on 19 Nov" row are approved. Ignore the "Account Security" title, the "Completed" status, the branch/location card, "Nairobi CBD Express" and the extra "Base value" chip; keep the approved sheet with Edit and Delete. |

## Build conditions

1. **Display only.** No change to stored records, `amountKes`, budgets, goals, sync or the CSV export (which stays in the entry currency plus KES).
2. Add a setting `displayCurrency` (default KES), stored with the other per-profile settings, and synced only if settings already sync.
3. Convert using the person's saved rates: `kes / rate[cur]`. If a rate is missing or not above zero, fall back to KES and show nothing extra.
4. Precision: USD, EUR and GBP show 2 decimals; TZS and UGX show whole numbers; KES keeps `fmtMoney`. Use codes, never symbols.
5. **Each screen adds up.** Convert every recorded total once, then work out differences ("left", "over", net, per day) from the converted figures in cents.
6. Indicators: a pill in the top bar with the rate tooltip (it opens the bottom sheet on phone); "KES … recorded" under the hero; the original amount under a row when its entry currency differs from the shown currency; "Limit set in KES …" on budget cards; "Goal set in KES …"; "Entered as … · saved as KES … on …" in the transaction detail.
7. The budget and goal inputs stay in KES, with an "About USD … at your saved rate." hint.
8. When KES is chosen, every page looks exactly as it does today.
9. No claims of live or official rates anywhere.
