# FynPet: GitHub, Netlify and a separate Supabase project

## Confirmed choices

- Repository: [Drjeey/FynPet-finance](https://github.com/Drjeey/FynPet-finance).
- Hosting/API: Netlify. No Cloudflare configuration is needed.
- Database/accounts: a dedicated Supabase project that the user will create in a different account.
- The existing connected FP-AFRICA STRIDE APP project must not be used for FynPet.

## 1. Review the GitHub changes

GitHub main is older than this local project. The publication branch includes the local Netlify migration, corrected database migration, security changes, tests and calculation fixes. Review it before merging into main.

## 2. Create FynPet in the intended Supabase account

1. Create a new, empty project for FynPet in that account.
2. Run `supabase/migrations/001_init.sql` in its SQL Editor. This migration is intended for a new project, not an existing app's database.
3. Run the project's Security Advisor and resolve errors before adding real data.
4. Keep the project URL and frontend API key ready for Netlify. The application currently names its frontend-key environment variable `SUPABASE_ANON_KEY`; use a public anon/publishable key, never a privileged secret/service-role key.

Supabase describes frontend versus privileged keys in its [API-key documentation](https://supabase.com/docs/guides/getting-started/api-keys).

## 3. Create the Netlify project

Import the existing GitHub repository into a new Netlify project. For a preview, select the published review branch; switch the production branch to main after review and merge. Netlify supports importing an existing repository as described in its [setup guide](https://docs.netlify.com/start/quickstarts/deploy-from-repository/).

Use these values from this project's `netlify.toml`:

| Setting | Value |
|---|---|
| Base directory | Repository root; leave empty |
| Build command | `npm run build` |
| Publish directory | `public` |
| Functions directory | `netlify/functions` |
| Node version | `22` |

The repeated local folder names are not a GitHub monorepo layout. Do not set the Netlify base directory to either local folder name. [Netlify configuration reference](https://docs.netlify.com/build/configure-builds/file-based-configuration/).

Set these environment variables in the Netlify project, with Functions scope where available:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | URL of the new FynPet Supabase project |
| `SUPABASE_ANON_KEY` | That project's public frontend key |
| `ANTHROPIC_API_KEY` | Anthropic key; mark as secret |
| `ANTHROPIC_MODEL` | Optional override for a model available to the Anthropic account |
| `AI_DAILY_LIMIT` | Optional; defaults to 60 requests per user per UTC day |

Enter secret values directly in Netlify rather than posting them in chat or committing them. Redeploy after changing environment variables. See [Netlify's environment-variable guide](https://docs.netlify.com/build/environment-variables/get-started/).

## 4. Connect authentication to the new site

Once Netlify supplies the site URL, set it as the Supabase Auth Site URL and allow the intended callback URLs. Add preview URLs only for environments you intend to test. Enable email confirmation and apply the password requirements from A2 in the development plan. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

## 5. Acceptance checks

- `/api/config` returns the intended project URL and AI availability. Never expect a privileged key in this response.
- Two test accounts can each create data and can see only their own records.
- Sign-in/confirmation returns to the new Netlify URL.
- Advisor requests succeed only after sign-in and consent.
- Test a redacted, password-protected real M-Pesa statement; inspect the imported rows before trusting totals.
- Check the interface on a real phone.

Cloud sync is still at the B2 stage described in REVIEW_STATUS.md. Until that work is finished, deletion/conflict handling and failed-sync sign-out are known limitations.
