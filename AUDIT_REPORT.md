# FynPet functionality audit — 19 November 2026

Branch `review/netlify-currency-foundation`. Changes are uncommitted.

## A. Executive summary

The app was in better shape than most: pure finance logic is separated from the DOM, money is summed in cents, RLS is per-command, AI calls are server-side with quotas, CSP blocks inline scripts, and all 88 existing tests passed. Every button and form in the markup is connected to a real handler (checked by script).

The serious problems were in sync and data integrity, where one bad row could stop sync permanently and silently:

1. Deleting an imported transaction, then importing the same statement again, broke sync for good (unique receipt index also covered soft-deleted rows).
2. An amount of 10¹² or more overflowed the `numeric(14,2)` column, with the same effect.
3. "Clear history" never deleted Fyn history from the account, although the dialog said it would.
4. "Continue without signing in" threw away the Supabase client's auth listener. Signing in later could leave the dialog stuck on "Signing in…".

There were also cross-module inconsistencies, privacy gaps on shared devices and stale screens. All 14 issues below are fixed. 97 tests pass, and the main journeys were checked in a browser.

## B. Issues found and fixed

| # | Area | Problem | Root cause | Fix | Verified by |
|---|------|---------|-----------|-----|-------------|
| 1 | Sync / import | Re-importing a statement after deleting one of its transactions made every later sync fail | `transactions_user_external_ref` unique index included soft-deleted rows | Migration `002_receipt_unique_live_only.sql` makes the index apply to live rows only (non-destructive). Until the migration is applied, the client also clears `external_ref` when it pushes a delete | Reproduced the failure on the real schema in PGlite; new schema test |
| 2 | Sync / import | Importing a receipt that another device had already saved to the account would block sync, once that row was pulled | Two live rows with one receipt; the unsynced one can never be pushed | `dropReceiptDuplicates()` in `sync.js` keeps the server copy and drops never-synced duplicates after each pull. Pulled rows now carry `syncedAt` | Unit tests |
| 3 | Amount entry | Amounts and budget limits had no upper limit, and values ≥ 10¹² overflow the DB and jam sync | No ceiling on typed amounts (import already capped at 10⁹) | `amountError()` / `MAX_AMOUNT` (1,000,000,000) used for transactions, new budgets and raised limits | Unit tests; browser: shows "Enter an amount up to 1,000,000,000." and nothing is saved |
| 4 | Fyn history | "Clear history" cleared the device only; the account kept everything. Per-answer history upload never ran | `.catch()` called on Supabase query builders, which only implement `then()`: a TypeError before the request was sent | Await the builder and check `error`. Tell the person if the account copy could not be cleared | Proved the TypeError in Node with the pinned supabase-js |
| 5 | Auth | After "Continue without signing in", a later sign-in could hang. `recheckCloudConfig` stacked duplicate listeners | `skipAuth` nulled the client; `getSbClient()` then made a new client without `onAuthStateChange` | One factory that always attaches the listener; `dropSbClient()` unsubscribes; skip keeps the client | Code path; needs hosted Supabase for end-to-end testing (see C) |
| 6 | Cross-module refresh | Adding, editing or deleting a transaction from Budgets or Analytics (phone "+", Fyn panel) left that page showing old figures | Save, delete and undo only re-rendered Dashboard and Transactions | Use `rerenderCurrentPage()` | Browser: Budgets card went from 61,200 to 62,434.56 straight away |
| 7 | Currency integrity | Editing only the note or description of a foreign-currency transaction re-valued it at today's rate | KES value always recomputed on save | Keep the saved `amountKes` when amount and currency are unchanged | Browser: USD 10 stayed KES 1,300 after the rate changed to 140 |
| 8 | Editing | Editing a transaction deleted on another device said "updated" but saved nothing | `idx === -1` case ignored | Shows an inline error instead | Code review |
| 9 | Dates | A date with a 5-digit year was saved, then silently dropped on the next load | Save accepted any non-empty date; load requires YYYY-MM-DD | Same check on save | Code review |
| 10 | Calculations | Fyn Insights and the AI context showed a different emergency-fund figure from the Analytics page, and assumed a 6-month goal | Two formulas (`emergencyFundMonths` with no fallback for the current month vs `coverStatus`) | Fyn uses `coverStatus` and the person's own goal | Unit test |
| 11 | Precision | Import footer totals, budget summary totals and monthly net were float sums | Summed without cents | `selectionTotals()` and summaries now work in cents; net is rounded | Unit tests (0.1+0.2 cases) |
| 12 | Privacy | After signing out, the previous person's Fyn conversation stayed on screen | Chat DOM never reset | Reset chat on every account switch | Code review |
| 13 | Privacy / data loss | "Clear data on this device" discarded unsynced changes without warning and left the server session valid | `localStorage.clear()` only | Warns with the unsynced count; signs out on the server first | Code review |
| 14 | Export | CSV: non-ASCII text garbled in Excel; download could be cancelled in Firefox/Safari; filename used the UTC date | No BOM; URL revoked straight after `click()` | UTF-8 BOM, anchor attached to the page, delayed revoke, Nairobi date | Browser: bytes `EF BB BF`, formula cells neutralised |
| — | AI function | Unknown modes used up quota; a Blobs outage returned a raw 500 | Quota charged before mode check; unguarded await | Mode validated first; quota errors return a clean 503 | New AI test |

## C. Outstanding issues and limits

**Not tested end to end (external services):** sign-in, sign-up, sync between devices, Fyn AI and M-Pesa PDF import. The local server stubs `/api/config` as offline, and the connected Supabase project is unrelated to FynPet, so it was not touched. Fixes 1, 2, 4, 5 and 12 are covered by unit and schema tests and code review only.

**Needs action from you:**
- Apply `supabase/migrations/002_receipt_unique_live_only.sql` to the FynPet Supabase project.
- Then test, on a deploy preview: sign up, sign in, two-device sync, delete and re-import, and Clear history.

**Known limits left as they are:**
- One bad row still fails the whole sync batch. Per-row isolation and quarantine would be more robust.
- Every sync re-uploads all Fyn history (up to 100 rows).
- Import history is kept on the device only. The `import_history` table is unused.
- There is no password reset.
- The sign-in dialog opens on every load for signed-out users.
- Clock skew between devices can pick the wrong last-write winner (documented trade-off).

**Dead code removed (follow-up):** the old Milestones card, the old table row and its CSS, unused stats and cloud-status helpers, `saveConfig`, `connectSupabase` / `recheckCloudConfig`, and the test-only `periodStats` / `emergencyFundMonths`. Their tests now cover the live equivalents.

## D. Test results

- `npm run check`: pass.
- `npm test`: **97/97 pass** (88 existing + 9 new: `tests/auditfixes.test.mjs`, schema re-import test, AI unknown-mode test).
- `npm run build`: pass. `npm audit --omit=dev`: 0 vulnerabilities.
- Browser, local device-only mode:
  - create budget; add a transaction from Budgets; check the same figures on Dashboard, Transactions and Analytics (88,000 − 62,434.56 = 25,565.44; savings rate 20.9%)
  - edit, including currency and rate change; validation; delete with confirmation; undo; reload persistence; CSV export
  - phone layout at 375 px with no horizontal overflow
  - no console errors
- The browser's existing data was snapshotted first and restored exactly afterwards.

## E. Recommended next steps

1. Apply migration 002, then run the hosted checks in C.
2. Make sync resilient per row: push in smaller batches, isolate rejected rows, and show which record failed.
3. Add CI that runs `npm run check`, `npm test` and `npm run build` on every PR.
4. Add a password-reset flow, and only show the sign-in prompt once per session.
5. Sync Fyn history incrementally; sync or drop `import_history`.
