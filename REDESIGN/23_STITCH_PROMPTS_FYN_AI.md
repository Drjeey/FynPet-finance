# Stitch prompts, one at a time: Fyn AI

Paste **one block at a time**, in order. Wait for Stitch to finish each one before pasting the next. After the last block, export the .zip and send me the file name.

Order: **F1 to F8**.

Already built and approved, so never redraw: Dashboard, Transactions, Budgets, Analytics, Settings, Add flow, Import review, the shell (sidebar, top bar, floating mobile nav), the toast, the "What Fyn AI sees" disclosure dialog from Settings.

Facts the design must respect (they are how the app works):
- Fyn AI is a right-hand slide-over panel on desktop (440px) and a full-height sheet on phones. It is reached from the lime "Ask Fyn AI" button, the top-bar sparkle button, the "Ask Fyn about this" buttons on Analytics, and More on phones.
- Three tabs: Chat, Insights, History.
- It needs a signed-in account and the user's agreement before anything is sent. Only a summary is sent: name, monthly totals, budgets and up to 10 recent transactions. Kenyan phone numbers are removed first.
- Daily limit message: "Daily AI limit reached. It resets at midnight UTC."
- It gives general guidance, not regulated financial advice. Answers cite only real amounts and categories, never invented numbers. Real categories only: Food & Groceries, Transport, Utilities, Entertainment, Health, Shopping, Savings, Income, Transfer, Other. No bank accounts, cards or balances.

---

## F1: Desktop panel, chat

```
Continue in the same FynPet project. Design FYN AI as a right slide-over panel, desktop 1440 wide, one frame named "Fyn AI - desktop chat". The panel is 440px wide, full height, over the real Dashboard (dimmed on the left).

Rules for this and every frame: same dark colours, fonts and components as the approved Dashboard and Settings. Nothing under 12px, sentence case, 44px tap targets. Add a small "Sample data - design preview" tag. No claims about encryption, real-time data or professional financial advice.

Panel content, top to bottom:
1. Header: a small lime spark icon, "Fyn AI", the line "Answers from your recorded finances", and a close X (44px).
2. One-line privacy note in a subtle box: "After you agree, your question and a summary of your records are sent to Anthropic through our server. Kenyan phone numbers are removed first."
3. Tabs: "Chat" (selected), "Insights", "History".
4. Conversation: a greeting from Fyn "Hi Wanjiru. Ask me about your spending, budgets or savings." Then the user's bubble (lime, right): "How am I doing this month?" Then Fyn's answer (dark card, left): "You have spent KES 41,120 of your KES 57,000 monthly budgets (72%) with 12 days left. Entertainment is KES 800 over its KES 5,000 limit. Food & Groceries has KES 9,500 left." followed by a separate line in bold "Next step: raise the Entertainment limit or pause it until 1 December."
5. Suggestion chips in one horizontal row that wraps: "Cash flow", "Budget check", "Spending issues", "Savings target", "Action plan", "Where to cut".
6. Composer: a multi-line text field "Ask about your finances" and a round lime send button with an arrow (44px). Under it the small note "Fyn gives general guidance, not regulated financial advice."
```

## F2: Typing and answer states

```
Continue in the same FynPet project. Create two desktop 1440 frames of the same panel, same dark theme and rules as "Fyn AI - desktop chat" (nothing under 12px, sample-data tag).

Frame 1, "Fyn AI - typing": the user's question "Where can I cut spending?" is shown, and below it Fyn's bubble shows three softly pulsing dots and the text "Fyn is reading your summary". The send button is disabled and the composer says "Wait for the answer".
Frame 2, "Fyn AI - long answer": a longer answer shown as a short paragraph, then a plain bulleted list of three items (each naming a real category and an amount, for example "Entertainment: KES 5,800 this month, KES 800 over"), then the bold "Next step:" line. The panel scrolls inside, composer stays pinned at the bottom.
```

## F3: Insights tab

```
Continue in the same FynPet project. Create one desktop 1440 frame named "Fyn AI - insights", same panel, dark theme and rules (nothing under 12px, sample-data tag). The "Insights" tab is selected.

Four plain rows, each with a short title, a figure, and a status in WORDS (never only a colour): "Savings rate" 21% "Good"; "Emergency fund" 1.8 months "Low, aim for 3"; "Net cash flow" +KES 26,800 "Positive"; "Independence progress" 3.8% "Early days". Under them a full-width lime button "Generate AI analysis" and the small note "Sends a summary of your records to Fyn AI after you agree."
```

## F4: History

```
Continue in the same FynPet project. Create two desktop 1440 frames, same panel, dark theme and rules (nothing under 12px, sample-data tag). The "History" tab is selected.

Frame 1, "Fyn AI - history": a list of past questions, newest first, each row with the question (one line, ellipsis if long), the date ("17 Nov"), and a chevron. Rows: "How am I doing this month?", "Where can I cut spending?", "Do I have enough saved if something goes wrong?". A small text button at the bottom "Clear history".
Frame 2, "Fyn AI - history empty": a centred icon, "No questions yet", and "Your questions and Fyn's answers appear here. They are saved on this device." with a button "Ask a question".
```

## F5: Not ready states

```
Continue in the same FynPet project. Create four desktop 1440 frames of the same panel, same dark theme and rules (nothing under 12px, sample-data tag). The Chat tab is selected and the composer is disabled in the first one only.

Frame 1, "Fyn AI - sign in required": a centred icon, "Sign in to use Fyn AI", "Your records stay on this device. Signing in lets Fyn answer from your recorded finances.", a lime "Sign in" button and an outlined "Create account".
Frame 2, "Fyn AI - no data yet": greeting, then the message "Add a few transactions first and Fyn can answer from your records." with a lime "Add transaction" button (one plus) and an outlined "Import M-Pesa statement".
Frame 3, "Fyn AI - daily limit": an amber notice inside the chat "You have used today's Fyn AI questions. They reset at midnight UTC." The composer is disabled.
Frame 4, "Fyn AI - service busy": a coral outlined notice "Fyn is busy right now. Try again in a minute." with a "Try again" outlined button under the last question.
```

## F6: Consent dialog

```
Continue in the same FynPet project. Create one desktop 1440 frame named "Fyn AI - consent", over the dimmed Dashboard with the panel visible behind, same dark theme and rules (nothing under 12px, sample-data tag).

A centred modal 480px wide, title "Before you use AI" with a close X (44px). Text: "FynPet uses Anthropic to answer questions and extract transactions from M-Pesa statements." Two short sections: "Advisor questions": "Your name, monthly totals, budgets and up to 10 recent transactions are sent through our server to Anthropic." and "Statement import": "The PDF opens on your device. Extracted text, including dates, amounts and merchant or sender names, is sent the same way after you agree." Closing line "Your choice: nothing is sent until you agree. You can turn this off in Settings." Buttons: outlined "Not now" and lime "Agree and continue".
```

## F7: Mobile

```
Continue in the same FynPet project. Create three MOBILE frames, 375 x 812. Same dark colours and components as the approved mobile pages. Nothing under 12px, inputs 16px, 44px tap targets, sample-data tag.

Fyn AI opens as a full-height sheet from the top bar with rounded top corners and a handle, the floating bottom navigation hidden.

Frame 1, "Fyn AI - mobile chat": header (spark icon, "Fyn AI", "Answers from your recorded finances", close X), the privacy note (collapsed to one line with a "More" text button), tabs Chat / Insights / History, the same conversation as the desktop chat (greeting, question, answer with "Next step:" line), horizontally scrolling suggestion chips, and a composer pinned above the safe area with the send button and the note "General guidance, not regulated financial advice."
Frame 2, "Fyn AI - mobile insights": the four insight rows and the "Generate AI analysis" button.
Frame 3, "Fyn AI - mobile history": the three history rows and "Clear history".
```

## F8: Mobile states

```
Continue in the same FynPet project. Create four MOBILE frames, 375 x 812, as the full-height Fyn AI sheet with the same header, tabs and dark theme as "Fyn AI - mobile chat" (nothing under 12px, inputs 16px, 44px tap targets, sample-data tag).

Frame 1, "Fyn AI - mobile sign in required": "Sign in to use Fyn AI" with full-width lime "Sign in" and outlined "Create account".
Frame 2, "Fyn AI - mobile typing": the question, then Fyn's pulsing dots "Fyn is reading your summary"; composer disabled.
Frame 3, "Fyn AI - mobile daily limit": the amber limit notice, composer disabled.
Frame 4, "Fyn AI - mobile consent": the consent as a bottom sheet with the same text as the desktop consent and full-width buttons "Agree and continue" (lime) and "Not now" (outlined).
```
