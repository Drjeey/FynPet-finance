# Settings and account dialogs: review of the Stitch export (5).zip (second upload)

The zip holds the whole project (99 frames). The Settings set is: settings_desktop_signed_out, settings_signed_in, settings_sync_problem, settings_mobile_signed_out, settings_mobile_signed_in, sign_in_dialog, sign_in_wrong_password, sign_in_invalid_email, sign_in_loading, sign_in_mobile_sheet, create_account_dialog, create_account_check_email_1/2, create_account_mobile_check_email, confirm_clear_device_data, confirm_sign_out, confirm_sign_out_with_unsynced_changes, confirm_mobile_sign_out_with_unsynced_changes, fyn_ai_what_is_sent, fyn_ai_turned_off. Where there are duplicates (_1/_2) the later one wins. I looked at the main frames of each group; the rest follow the same patterns and I will check them while building.

## Verdict: approve with conditions (no redo)

## What works
- Desktop page: five clean cards (Account, Profile, Exchange rates, Privacy and Fyn AI, Your data), no side nav, no independence target, no unsaved-changes bar. Good hierarchy and 44px targets.
- Account states: signed out, signed in ("Synced just now"), sync problem (amber, "Try again"), all with plain wording.
- Dialogs: sign in, wrong password, check email, confirm sign out with unsynced changes, Fyn AI disclosure (accurate: name, monthly totals, budgets, up to 10 recent transactions, "Nothing is sent until you agree").

## Conditions (I apply these in the build)
| # | Problem | Build decision |
|---|---|---|
| 1 | Top bar shows "Personal Finance" beside the logo. | Use the approved shell: page title "Settings" once. |
| 2 | Sign-in dialog and mobile sheet show "Forgot password?". There is no reset flow. | Leave out. (Can be added later with a real reset flow.) |
| 3 | Desktop sign-in: the close X overlaps the Sign in / Create account control. | X sits in its own row above the control. |
| 4 | Mobile sheet is titled "Account Security". | Title "Sign in to sync" only. |
| 5 | Mobile Settings: a second "Settings" heading under the top bar, "Offline mode" pill, "AI ACTIVE" badge, stat tiles "Local entries 142 / Storage used 184 KB", footer "FynPet Mobile v2.4.1, Encrypted storage", a refresh icon on Exchange rates, wrong bottom nav (Dashboard, Transactions, Budgets, Analytics, More without the raised Add). | Drop all of these. Use the approved mobile shell, Settings reached from More. Encryption is not claimed anywhere. |
| 6 | Sync-problem frame shows exchange rates as read-only text and adds "Session Active" and "KES ledger v2.4" chips. | Rates stay editable inputs; no extra chips. |
| 7 | Clear-data dialog adds "Local unsynced M-Pesa drafts and imported PDF records stored strictly offline will be irreversibly erased". Not how the app works. | Keep only: "All transactions and budgets saved in this browser will be removed. Records already synced to your account are not affected." Coral Clear data button. |
| 8 | Profile help reads "Your personal details for your local session". | "Used in greetings and your avatar." |
| 9 | Mobile "Create account" button is low contrast. | Outlined with visible border. |
| 10 | Missing: validation for an exchange rate of zero or blank. | Inline "Enter a rate greater than zero." and keep the old value. |

## Build spec
- Settings page max width 800px, five cards as in the frames. Account card has three states (signed out, signed in, sync problem). Signed out: "Sign in" and "Create account" open the auth dialog on the matching tab.
- Auth dialog: segmented Sign in / Create account, email and password with Show toggle, inline errors (invalid email, wrong password, short password "Use at least 8 characters."), loading state that disables the form, "Check your email" confirmation after sign-up, "Continue without signing in". Phone: bottom sheet.
- Sign out: if there are unsynced changes (dirty rows or pending deletes) show the amber dialog with the real count and "Sync first" / "Sign out anyway" / Cancel; otherwise the plain sign-out confirm ("Data on this device will be cleared so the next person cannot see it.").
- Clear data on this device: confirm dialog replaces the browser pop-up.
- Fyn AI: "Review what is sent" opens the disclosure dialog; "Turn off Fyn AI" removes consent and shows the toast and the off state with "Review and turn on".
- Exchange rates: five inputs (USD, EUR, GBP, TZS, UGX), Save rates, same storage as today.
- All secrets stay in Netlify env vars; nothing key-related appears in Settings.
