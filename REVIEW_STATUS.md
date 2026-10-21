# FynPet review and implementation status

Reviewed locally on 21 October 2026.

## Working directory and version control

The application root is the inner `FynPet-finance-main` directory. The parent contains `.claude/launch.json` and `STITCH DESIGNS/`.

A local Git repository now contains a baseline of the application, documentation, migration and tests. Work for B1 was isolated on `fix/currency-calculations`. `.env`, `node_modules/` and generated vendor assets are ignored. The unrelated `awx.py` AWS document generator is identical to the existing GitHub copy and is preserved unchanged.

The user identified `https://github.com/Drjeey/FynPet-finance`. It is public, and its default branch is `main`. The remote is configured and its history has been fetched. GitHub main still contains the older Cloudflare implementation, so the publication branch includes the already-present local Netlify migration alongside B1. The GitHub connector reports read access only. No merge into main has been performed.

## B1: shared calculations

Implemented locally:

- `public/calc.js`: pure conversions, period/category totals, Nairobi dates, chart buckets and emergency coverage.
- Dashboard, budgets, analytics, advisor context, gamification, CSV export and sync use saved KES conversions.
- New/edited transactions save `amountKes`; database reads/writes preserve `amount_kes`. Legacy records are converted once on load using configured rates.
- USD/EUR/GBP/TZS/UGX rates are editable estimates. Settings rejects non-positive or invalid rates. Changing rates does not revalue existing saved records.
- Emergency coverage uses the last three completed calendar months, including months without expenses. No history returns zero, not infinity.
- Date ranges/defaults follow Africa/Nairobi, including around UTC midnight and month/year boundaries.
- Monthly charts include all dates, 3M charts use three months, weekday labels follow the dates, and resizing retains the selected donut period.
- The donut includes every expense category instead of silently excluding categories outside the top five.

## Verification

- Initial review: all 12 original tests passed (six AI, six database).
- Added eight calculation tests: supported currencies, cent rounding, saved conversions, category/type filters, Nairobi midnight, leap years, year boundaries, period comparisons, chart coverage, emergency coverage.
- Browser smoke check: isolated sample data in Chrome, with the configured Content-Security-Policy and a device timezone of America/Los_Angeles at Nairobi's month boundary. Confirmed page boot, dashboard/budget/advisor agreement, emergency coverage, date defaults, UGX settings, historical conversion stability, creating a USD transaction at a new rate, reload persistence, and chart period after resize. No page errors occurred.
- Browser cloud configuration was stubbed as local-only. No real authentication, production deployment or paid AI call was exercised.

## Remaining priorities

1. Publish the review branch to the supplied GitHub repository, then review the PR and deploy preview. The user has no Netlify project for FynPet yet; create one from the supplied repository.
2. The user will manually create a separate FynPet Supabase project in a different account. The connected **FP-AFRICA STRIDE APP** project is unrelated and was not modified.
3. Verify migration, authentication settings, two-user isolation and AI configuration in the intended hosted environment.
4. FynPet will use Netlify, not Cloudflare. Verify retirement/key rotation only if an old worker was actually deployed; this review has not verified its live state.
5. B2: persistent outbox, soft deletes, incremental pulls, conflict handling, retry/status behavior, and safe sign-out after sync failure. Existing sync still uploads all rows and only adds unfamiliar remote IDs.
6. B3: deterministic M-Pesa parsing, applied date filters, preserved rejection counts and honest partial/failed import statuses; test a real redacted password-protected statement twice.
7. Finish remaining workflow tasks, then the mobile/accessibility redesign and CI.

Local implementation is not marked shipped: deploy-preview, production and real-phone acceptance remain pending. The parent `.claude/launch.json` still refers to a temporary server outside the project; use the README's Netlify development workflow instead. `npm run dev` currently requires a separately available Netlify CLI.
