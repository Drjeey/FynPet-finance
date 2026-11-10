# FynPet

Personal finance app for Kenya. Users record manual transactions, set category budgets, inspect spending and savings, import M-Pesa PDF statements and optionally use Fyn AI. User-approved design comes from Stitch; hosting is Netlify. A separate Supabase project will be configured by the user.

Transactions and configuration are stored locally in the browser; authenticated users may sync through Supabase. PDF opening/text extraction occurs in the browser; statement transaction extraction and AI questions send text/context through Netlify to Anthropic after consent and sign-in. Server code removes phone numbers. Never promise offline AI, automatic SMS import, live official FX, retention guarantees or unimplemented encryption.

Keep existing calculations, account isolation and history. Estimated exchange rates affect new/edited transactions; existing recorded KES conversions remain unchanged. Do not seed demo financial data into a real profile. Current work is a local UI implementation of approved screens, with deployment outside this change.
