
# Design review, round 2 — Shell + Dashboard

Reviewed 16 November 2026 from `stitch_fynpet_kenyan_finance_dashboard (1).zip` (screenshots plus exported HTML, read but not run).

## Which files are current

| Frame | Folder | Note |
|---|---|---|
| With data | `dashboard_with_data_3` | Round 2, but **drifted from the sync-error frame** (see below) |
| Sync error | `dashboard_sync_error_2` | Round 2, the most polished frame. Use as the **canonical dashboard** (banner is the only difference) |
| First use | `dashboard_first_use_3` | Round 2 |
| Logo | `fynpet_app_logo_mark` | New asset |
| Ignore | `*_1`, `dashboard_with_data_2`, `dashboard_first_use_2`, `dashboard_sync_error_1`, `fynpet_logo` | Earlier rounds |

## The 13 requested changes

| # | Change | Result | Evidence |
|---|---|---|---|
| 1 | Remove false claims (encryption, SIM sync, auto-recognition, real-time) | **Done** in with-data and sync-error. First-use now reads "Saved on this device. Sign in to back up and sync." | grep: 0 banned phrases in those two |
| 2 | Real category names | **Done.** Food & Groceries, Transport, Utilities, Shopping, Entertainment, Other | Screenshots |
| 3 | "71% of savings target" | **Done** in sync-error and first-use. with-data still shows a leftover "Goal 71%" chip beside it | Screenshots |
| 4 | Fix budget sums | **Done** (KES 9,500 left; KES 1,440 left) | Screenshots |
| 5 | Table never wraps | **Done.** Amounts, dates and "Imported/Manual" stay on one line; category sits under the name | Screenshots |
| 6 | Donut centre has room | **Not done.** "KES 53.6k" still nearly touches the ring in both data frames. Ring colours are fixed (no pink, no lime) | Screenshots |
| 7 | Minimum 12 px, lighter grey | **Mostly.** with-data has no 8–11 px classes, but sync-error still uses an 11 px label style 11 times. Labels are sentence case in the data frames | Code: `label-sm` = 11 px |
| 8 | Chart axis and tooltip | **Mostly.** Axis now scales to the data (30k top). Tooltip sits above the hovered bar. New glitch: "ExpensesKES 14,200" has no space between label and value | Screenshots |
| 9 | Hero gap | **Done.** Two-bar "This month vs last month" comparison. The sync-error version (boxed income/expenses) is the better one | Screenshots |
| 10 | Budgets last line | **Done**, but a ~130 px blank gap remains above "Resets in 14 days" | Screenshots |
| 11 | Fixed sidebar | **Done in code** (`fixed … h-screen`). The sidebar looks short in tall screenshots only because of how the capture was taken | Code |
| 12 | First-use animations | **Partly.** Two keyframes plus a reduced-motion rule. Fine for an empty state | Code |
| 13 | Logo | **Done.** "FP" lime tile now renders in the sidebar. The standalone mark has the F's top bar merging into the P; readable, acceptable | Screenshots |

## Remaining problems

**Blocking (small, mechanical fixes)**
1. **First-use says "Total volume across accounts."** FynPet has no accounts. Change to "Recorded this month".
2. **First-use shows "+ + Add transaction" and "+ + Add your first transaction"** (double plus: icon plus text). Remove the text plus.
3. **Salary row is tagged "Transfer"** in the sync-error frame. Salary is Income. The with-data frame has it right.
4. **Donut centre still crowds the ring** (item 6). Shrink to 22 px or place the total outside the ring.

**Should fix**
5. **Frames have drifted from each other.** with-data uses different chips, a different hero comparison, a swapped Entertainment/Other order and a leftover "Goal 71%" chip. Sync-error is the reference.
6. **First-use uses all-caps tracked labels** ("NET CASH FLOW", "INCOME", "EMERGENCY FUND"); data frames use sentence case.
7. **Tooltip text spacing** ("ExpensesKES 14,200").
8. **11 px labels remain** in the sync-error frame.
9. **Blank gap in the Budgets card.**
10. **Pill "Sample data - design preview" overlaps the Recent transactions header** in first-use. It is a prototype tag and will not ship, so ignore it.

**Carried to implementation (not Stitch's job)**
- Tailwind and Google Fonts CDNs are used in the export; they get replaced with CSS tokens and self-hosted fonts.
- No accessible names on icon buttons (0 `aria-label`s); add them.
- Chart text summary and over-budget words must be real, computed values.

## Recommendation

**Approve with conditions.** The direction, structure, colour rules, motion and copy are now sound. The remaining items are small glitches, not design decisions, and I can list them as corrections in the Codex handoff instead of spending another Stitch round. Canonical reference for implementation: `dashboard_sync_error_2` (banner hidden by default), `dashboard_first_use_3` (with fixes 1, 2, 6 applied), motion from `dashboard_with_data_3` and `dashboard_sync_error_2`.

If you prefer a cleaner source of truth, ask Stitch for one more pass with these four lines:

```
Small fixes only. 1) In "first use", change "Total volume across accounts" to "Recorded this month", remove the extra "+" in both "+ Add transaction" buttons (the icon already shows a plus), and use sentence-case labels instead of all-caps. 2) In "sync error", tag the Salary row "Income", not "Transfer". 3) In all frames, make the donut centre text 22px so it has at least 16px clearance from the ring, and add a space between "Expenses" and the value in the chart tooltip. 4) Make "with data" identical to "sync error" apart from the banner (same hero comparison, chips, legend order), and remove the extra "Goal 71%" chip.
```
