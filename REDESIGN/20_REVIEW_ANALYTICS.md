# Analytics: review of the Stitch export (5).zip

Frames received (9): desktop, chart tooltip, saving as table, empty, set savings goal dialog, change target dialog, ask Fyn consent, mobile, mobile empty.

## Verdict: approve with conditions (no redo needed; I fix these in the build)

## What works
- Plain-question structure ("Am I saving?", "Am I covered if something goes wrong?", "How close am I to my goal?") with one next step each. No score.
- Dialogs (savings goal with error line, change target with "Use this amount", consent with the pre-filled question) are clear, 44px+ targets, correct tone.
- Mobile stacks the sections and turns the monthly table into cards.

## Problems, and what I do in the build
| # | Problem in the frames | Build decision |
|---|---|---|
| 1 | Desktop shows the three questions side by side. Content is cramped: "of KES 3,000,000" is clipped, the buffer bar labels ("3m target", "6m fully funded") overlap, "Set a savings goal" wraps to three lines. | Stack the three cards full width (as the prompt asked), two-column inside each card where it helps. Labels sit under the bar, never on it. Buttons never wrap. |
| 2 | Monthly summary shows Net equal to Saved in five of six rows, which defeats the "numbers must differ" rule. Saved = savings transactions, Net = income minus expenses; real data decides, the sample was just wrong. | Build from real calculations. Columns stay Month, Income, Expenses, Saved, Net, Savings rate. |
| 3 | Top bar shows a "Local DB Ready" pill and the subtitle "Trends & Financial Health". | Remove both. Title once ("Analytics"), keep the approved shell only. |
| 4 | Extra items nobody asked for: "6-month median rate", "Saved figures reflect ledger transfers..." footnote, mono-case eyebrow labels (SAVINGS CONSISTENCY, SAFETY BUFFER, LONG-TERM INDEPENDENCE). | Drop median and eyebrows. Keep one short footnote under the table: "Saved is money moved to savings. Net is income minus expenses." |
| 5 | Empty state has three marketing tiles ("M-Pesa SMS parsing", "Track daily spend ... bank transfers, or Till payments") and the line "Offline first - Stored strictly in browser IndexedDB". These describe features and storage claims we do not make. | Empty state is only the icon, "No data yet", the sentence, and the two buttons. |
| 6 | (Checked against ai.mjs/advisor data) Consent dialog says "Local processing - No personal identifiers shared". Not true: a summary is sent to the Fyn AI service. | Replace with what is actually sent (name, monthly totals, budgets, up to 10 recent transactions) and "Nothing is sent until you agree." |
| 7 | Mobile chart renders empty (no bars) in the export. | Build the chart myself with real bars and a tap tooltip. |
| 8 | Sample year 2024. | Irrelevant to the build (real dates are used). |

## Build spec
- Page order: three question cards, then Monthly summary (Export CSV button kept).
- Card 1: 6-month bars (current month lime, others muted), tap/hover tooltip (month, Saved, Savings rate), "View as table" toggle (Month, Saved, Savings rate), one-line summary. Keyboard focusable bars.
- Card 2: months of expenses saved = savings total divided by average monthly expenses; bar to 6 months with ticks at 3 and 6; "Set a savings goal" dialog (1 to 24 months, inline error).
- Card 3: progress toward the independence target; pace in years; "Change target" dialog with "Use this amount" (25 times yearly expenses).
- "Ask Fyn about this" opens the consent dialog; only after "Agree and ask" does anything go to the AI function.
- Empty: "No data yet" with Add transaction and Import M-Pesa statement.
- Phone: reached from More; same cards stacked, monthly summary as cards.
