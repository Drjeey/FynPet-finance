## Summary

Moves FynPet from the old Cloudflare setup to Netlify Functions and Supabase, fixes the currency totals, and (new in this update) fixes the sync data-loss bugs and rebuilds the interface in the dark "Midnight Ledger" design.

**Still a draft.** Do not merge until the checklist at the bottom is done.

## What this PR contains

### Platform and money logic (earlier commits)
- Netlify Functions replace the Cloudflare Worker: `POST /api/ai` (advisor and M-Pesa extraction, behind a Supabase sign-in, per-IP rate limit, per-user daily quota) and `GET /api/config`.
- One calculation module (`public/calc.js`): saved KES conversions, Nairobi calendar periods, chart buckets, emergency-fund coverage.
- Supabase schema with row-level security (`supabase/migrations/001_init.sql`), per-account local caches, a strict Content-Security-Policy, and AI consent.

### Sync fixes (new)
- **Deleted items no longer come back.** Deletes are kept as tombstones until the server has them (`public/sync.js`).
- **Edits sync between devices.** Pull then push, per-table cursors, last-write-wins, and the server's echo of our own writes is ignored, so a newer local edit is not overwritten.
- **Sign-out no longer loses unsynced data.** If the final sync fails, a confirmation explains what will be removed.
- CSV export neutralises cells that start with `=`, `+`, `-` or `@` (`public/csv.js`).
- Removed the hard-coded "Jeremy" / "Admin" defaults and the Role field.
- Failed syncs now show as errors instead of being silently ignored.

### New interface (new)
- Dark theme (`public/midnight.css`), self-hosted Manrope and Inter. Google Fonts and its CSP entries are removed. FP logo and favicon.
- **Dashboard:** net cash flow for the month, "Needs attention" (over-budget categories, unbacked changes, old import), cash-flow chart with tooltip and text alternative, spending donut with real categories, budgets with "left per day", recent transactions, first-use state, sync-error banner. New helpers and tests in `calc.js`.
- **Add flow** (`public/addflow.js`): amount-first form, quick categories, collapsed details, Save and add another, Undo toast, and an Add choice sheet on phones.
- **Phones:** floating bottom navigation, transaction detail sheet, redesigned More page.
- **M-Pesa import** rebuilt as review-before-saving: Upload, Reading, Review (summary, totals check, rows that need a check, already-in-FynPet, looks good), Done and Failed. The date range is now applied, duplicates are found by receipt and by day + amount + description, unread parts can be retried, and history shows the real status. Statement chunks now cost 0.2 of a daily AI question (`public/importreview.js`, `netlify/lib/auth.mjs`).
- Pages not yet redesigned (Transactions, Budgets, Analytics, Settings, Fyn AI) are dark and readable but keep their old layouts.
- `REDESIGN/` holds the audit, Stitch design reviews, approved reference frames and a progress tracker.

## Verification

| Check | Result |
|---|---|
| `npm run check`, `npm test` | 60 of 60 pass (calc, sync, add flow, import review, AI function, schema/RLS, config) |
| Import review in the browser | Generated test PDF and a fake AI endpoint: review, save, re-import (all rows already in FynPet), a failed part with retry, 375 px layout |
| `npm audit` (production dependencies) | 0 vulnerabilities (checked earlier in this work) |
| Browser, against a **fake in-memory Supabase** | Push, delete (stays deleted), edit and delete from "another device", failed sync, safe sign-out, Undo, Save and add another, keyboard use of the chart; Dashboard checked at 320, 375, 768, 1024 and 1440 px (no horizontal scroll, no text under 12 px, amounts never wrap) |

## Not verified

- A **real Supabase project** and real sign-in, including email confirmation.
- **Two real devices** editing the same data (last-write-wins assumes the device clocks are roughly right).
- A **real phone**, software keyboard and safe areas.
- The AI advisor and M-Pesa import against the live Anthropic service, and a real password-protected statement.
- Measured colour contrast numbers and reduced-motion behaviour in the browser.
- The import **totals check** reads a "Total <paid in> <paid out>" line from the statement text. That format is a guess and has not been tried on a real Safaricom statement; if it is not found the app says so instead of claiming a match.
- Statement extraction is still done by the AI, not by a deterministic parser.

## Before merging

- [ ] Netlify deploy preview opens and looks right on a phone
- [ ] Supabase project created and `supabase/migrations/001_init.sql` applied; Security Advisor shows no errors
- [ ] Netlify environment variables set for previews and production (`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`)
- [ ] Supabase auth: site URL and preview redirect URL set; email confirmation on; minimum password length 10
- [ ] Sign up, sign in, add a transaction, delete it, sync, and check it does not return; repeat from a second device
- [ ] Old Cloudflare worker removed and its API key rotated, if it was ever deployed
- [ ] Close PR #1 (Cloudflare bot configuration) unmerged

🤖 Generated with [Claude Code](https://claude.com/claude-code)
