# Stitch prompts, one at a time: Settings and account dialogs

Paste **one block at a time**, in order. Wait for Stitch to finish each one before pasting the next. After the last block, export the .zip and send me the file name.

Order: **S1 to S9**.

Already built and approved, so never redraw: Dashboard, Transactions, Budgets, Analytics, Add flow, Import review, the shell (sidebar, top bar, floating mobile nav), the toast.

What Settings really contains today (design only these): account and sync status, profile name, exchange rates to KES (USD, EUR, GBP, TZS, UGX), privacy and AI consent, data management (Export CSV, Clear local data). The long-term target moves to Analytics, so it is NOT in Settings. There is no "forgot password" flow yet, so do not draw one. The confirm dialogs must say exactly what happens.

---

## S1: Desktop page (signed out)

```
Continue in the same FynPet project. Design the SETTINGS page, desktop 1440 wide, one frame named "Settings - desktop signed out".

Rules for this and every frame: use the approved shell exactly (sidebar with Settings highlighted; top bar with the page title shown ONCE). Same dark colours, fonts and components as the approved Dashboard, Budgets and Analytics pages. FynPet has no bank accounts, cards or balances. No claims about encryption, automatic or real-time sync, or offline-first storage terms. Nothing under 12px, sentence case, 44px tap targets. Add a small "Sample data - design preview" tag.

Content: stacked cards, max width 800px, each with a heading and one line of help text.
1. "Account": a status line "Saved on this device only" with a small grey dot, the text "Sign in to keep your records on your account and open them on another device.", a lime button "Sign in" and an outlined "Create account". 
2. "Profile": one field "Your name" (value "Wanjiru") and a lime "Save" button.
3. "Exchange rates": help text "Estimates, not live rates. Each transaction keeps the rate used when it was saved." Five rows with the label "1 USD =" then an input and "KES": USD 130, EUR 145, GBP 165, TZS 0.045, UGX 0.034. A lime "Save rates" button.
4. "Privacy and Fyn AI": the text "Your records are saved in this browser. Fyn AI only sees data after you agree." Status line "Fyn AI: you have agreed" with an outlined "Review what is sent" and a text button "Turn off Fyn AI".
5. "Your data": outlined "Export CSV" and a coral outlined "Clear data on this device".
```

## S2: Signed in

```
Continue in the same FynPet project. Create one desktop 1440 frame named "Settings - signed in". Same page, shell, dark theme and rules as "Settings - desktop signed out" (nothing under 12px, sample-data tag).

Only the "Account" card changes: a status line with a mint dot "Synced just now", the signed-in email "wanjiru@example.com", and two buttons: lime "Sync now" and outlined "Sign out". Under it a small line "Fyn AI is available on your account." Everything else stays the same. Also draw a second frame "Settings - sync problem" with the Account card showing an amber dot and "Could not sync. Your records are safe on this device." with a lime "Try again" button and the outlined "Sign out".
```

## S3: Sign in dialog

```
Continue in the same FynPet project. Create one frame, desktop 1440 wide, named "Sign in - dialog", over the dimmed Settings page (same shell, dark theme and rules; nothing under 12px, sample-data tag).

A centred modal 440px wide. A segmented control at the top: "Sign in" (selected, lime) and "Create account". Title "Sign in to sync", text "Open your records on any device.". Fields: "Email" (placeholder you@example.com) and "Password" (with a "Show" toggle, 44px). A full-width lime button "Sign in". Under it a text button "Continue without signing in". Small text under that: "Your records stay on this device until you sign in." A close X (44px) top right.
```

## S4: Create account and check email

```
Continue in the same FynPet project. Create two desktop 1440 frames over the dimmed Settings page, same modal style, dark theme and rules as "Sign in - dialog" (nothing under 12px, sample-data tag).

Frame 1, "Create account - dialog": same modal with "Create account" selected. Title "Create your account". Fields "Email", "Password" (with Show toggle) and the helper "At least 8 characters." Full-width lime button "Create account". Text button "Continue without signing in".

Frame 2, "Create account - check email": the same modal replaced by a confirmation: a mint check icon, the title "Check your email", the text "We sent a link to wanjiru@example.com. Open it to confirm your account, then come back and sign in." and two buttons: lime "Go to sign in" and a text button "Use a different email".
```

## S5: Sign in errors and loading

```
Continue in the same FynPet project. Create three desktop 1440 frames over the dimmed Settings page, same modal, dark theme and rules as "Sign in - dialog" (nothing under 12px, sample-data tag).

Frame 1, "Sign in - wrong password": an error box above the button, coral outline: "That email or password is not right. Check them and try again." and the password field outlined in coral.
Frame 2, "Sign in - invalid email": under the Email field in coral "Enter a valid email address." and the field outlined in coral.
Frame 3, "Sign in - loading": the button shows a small spinner and "Signing in..." and is disabled; the fields are disabled.
```

## S6: Confirm dialogs

```
Continue in the same FynPet project. Create three desktop 1440 frames, each a centred 420px confirm dialog over the dimmed Settings page (same shell, dark theme and rules; nothing under 12px, sample-data tag).

Frame 1, "Confirm - clear device data": coral outlined icon, title "Clear data on this device?", text "All transactions and budgets saved in this browser will be removed. Records already synced to your account are not affected.", buttons "Cancel" (outlined) and "Clear data" (coral).
Frame 2, "Confirm - sign out": title "Sign out?", text "Your synced records stay on your account. Data on this device will be cleared so the next person cannot see it.", buttons "Cancel" and "Sign out" (lime).
Frame 3, "Confirm - sign out with unsynced changes": amber icon, title "Some changes are not synced", text "3 changes have not reached your account. If you sign out now they will be lost.", buttons "Sync first" (lime) and "Sign out anyway" (coral outlined) and a text "Cancel".
```

## S7: Fyn AI disclosure

```
Continue in the same FynPet project. Create two desktop 1440 frames over the dimmed Settings page, same modal, dark theme and rules (nothing under 12px, sample-data tag).

Frame 1, "Fyn AI - what is sent": a centred 480px modal titled "What Fyn AI sees" with a close X. Two short sections: "Questions you ask": "Your name, monthly totals, budgets and up to 10 recent transactions are sent to Anthropic, through our server, to answer." and "Statement import": "Text read from your M-Pesa PDF, including dates, amounts and merchant or sender names, is sent the same way. The PDF itself stays on your device." A closing line "Nothing is sent until you agree. You can turn this off any time." Buttons: outlined "Close" and coral outlined "Turn off Fyn AI".
Frame 2, "Fyn AI - turned off": the Settings "Privacy and Fyn AI" card with the status "Fyn AI: off. You will be asked before the next request." and a lime button "Review and turn on", plus the toast at the bottom "Fyn AI turned off".
```

## S8: Mobile Settings

```
Continue in the same FynPet project. Create two MOBILE frames, 375 x 812.

Use the approved mobile shell exactly: top bar with the FP mark, the title "Settings", a sync button and the avatar; the floating solid bottom navigation with "More" active (Settings is reached from More). Same dark colours and components as the approved mobile pages. Nothing under 12px, inputs 16px, 44px tap targets, sample-data tag.

Frame 1, "Settings - mobile signed out": the same cards as the desktop page stacked full width: Account (status, "Sign in" lime full width, "Create account" outlined full width), Profile, Exchange rates (each rate a row: "1 USD =" input "KES"), Privacy and Fyn AI, Your data.
Frame 2, "Settings - mobile signed in": the Account card showing "Synced just now", the email, "Sync now" (lime) and "Sign out" (outlined), the rest unchanged.
```

## S9: Mobile account sheet

```
Continue in the same FynPet project. Create three MOBILE frames, 375 x 812, as bottom sheets (rounded top corners 24px, handle bar, bottom navigation hidden) over the dimmed mobile Settings page, same dark theme and rules as "Settings - mobile signed out" (nothing under 12px, inputs 16px, 44px tap targets, sample-data tag).

Frame 1, "Sign in - mobile sheet": the segmented control "Sign in" / "Create account", title "Sign in to sync", fields Email and Password (Show toggle), full-width lime "Sign in", text button "Continue without signing in", and the line "Your records stay on this device until you sign in.". Show the keyboard-safe layout (buttons visible above the safe area).
Frame 2, "Create account - mobile check email": the "Check your email" confirmation as in the desktop version, with full-width "Go to sign in" and a text "Use a different email".
Frame 3, "Confirm - mobile sign out with unsynced changes": the amber confirm with "Sync first" (lime, full width), "Sign out anyway" (coral outlined, full width) and "Cancel" text.
```
