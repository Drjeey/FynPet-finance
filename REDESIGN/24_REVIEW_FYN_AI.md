# Fyn AI: review of the Stitch export (6).zip

Frames received (22): desktop chat, typing, long answer, insights, history, history empty, sign in required, no data yet, daily limit, service busy, consent, turned off, what is sent; mobile chat, insights, history, typing, daily limit, sign in required, consent.

## Verdict: approve with conditions, building from the chat frames plus my spec

## Important finding about the export
Every desktop frame after "Fyn AI - desktop chat" renders as a copy of the chat panel (the tab and state never change in the picture), even though the text for each state sits in the exported code. The pictures cannot be used to judge the desktop states (insights, history, typing, long answer, not-ready states, consent). The mobile frames do show their states, so I use those for content and layout, and the spec below for desktop. No redo is needed unless you want to see the desktop states drawn.

## What works
- Desktop chat panel: 440px slide-over, clear header, one-line privacy note, tabs, greeting, answer with real figures and two small budget bars, bold "Next step:" line, chips, composer, disclaimer. Wording is accurate.
- Mobile: insights rows with words ("Good", "Low, aim for 3", "Positive", "Early days"), history list, sign-in-required, daily limit notice, consent buttons.

## Conditions (applied in the build)
| # | Problem | Build decision |
|---|---|---|
| 1 | Mobile states show "End-to-end encrypted · Reads financial state..." under the header. Not true. | Remove. Use the plain privacy note only. |
| 2 | Mobile consent says "Zero retention policy for training data". Not something we can promise. | Remove. Consent text stays exactly the approved wording. |
| 3 | Daily limit card shows "0/5 left". The real limit is set on the server (60 by default). | Show only "You have used today's Fyn AI questions. They reset at midnight UTC." No counter. |
| 4 | History shows an "Auto-synced snapshot, Reflects M-Pesa & KES accounts, Fresh" card. | Remove. History is only the saved questions, plus "Clear history". |
| 5 | Insights shows "BETA", "March 2025", "KES 142k deficit", "M-Pesa + Bank", a "30-day trajectory +4.2%" strip and "FI: KES 18.5M". Invented or wrong. | Four rows only: Savings rate, Emergency fund, Net cash flow, Independence progress, with real figures and words. No beta tag, date, trend strip or bank wording. |
| 6 | Mobile headers repeat the page name ("Fyn Ai Mobile Chat") and a second "Fyn AI + BETA" header; subtitle "Personal Finance Intelligence". | One header: spark, "Fyn AI", "Answers from your recorded finances", close. |
| 7 | Composer has a microphone icon. Voice is not supported. | Remove. |
| 8 | Desktop chat disclaimer is cut off by the sample-data tag ("Fyn gives general guidance, no..."). | Full line shown: "Fyn gives general guidance, not regulated financial advice." |
| 9 | Send button uses a diagonal arrow on desktop and an up arrow on mobile. | One send icon (the app's existing one). |

## Build spec
- Panel: right slide-over 440px on desktop, full-height sheet on phones. Same tabs and logic as today (Chat, Insights, History), restyled to Midnight Ledger. Opens from the Ask Fyn AI button, top-bar sparkle, Analytics "Ask Fyn about this", and More.
- Chat: greeting uses the real name; answers render text with amounts highlighted; a "Next step:" line is bold when the answer has one; typing state "Fyn is reading your summary" with three dots, send disabled; chips: Cash flow, Budget check, Spending issues, Savings target, Action plan, Where to cut.
- Not-ready states in the chat area: sign in required (Sign in, Create account), no data yet (Add transaction, Import M-Pesa statement), daily limit (amber, composer disabled), service busy (coral, "Try again"), plus the consent dialog "Before you use AI" with the approved text.
- Insights: four rows from real data with words for status, "Generate AI analysis" button and the line "Sends a summary of your records to Fyn AI after you agree."
- History: saved questions newest first with date; tapping reopens the answer; "Clear history"; empty state "No questions yet".
- No claims about encryption, retention or training. Real categories only.
