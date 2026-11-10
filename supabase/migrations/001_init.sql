-- ═══════════════════════════════════════════════════════════
-- FynPet schema v2 — run once on a NEW Supabase project
-- (Dashboard → SQL Editor, or `supabase db push`).
--
-- Changes from fynpet-supabase-schema.sql (audit S5, F1, F4, F6, F14):
--  • user_id is NOT NULL and defaults to the caller; primary keys are (user_id, id)
--  • currency / amount_kes / external_ref / deleted_at columns
--  • updated_at maintained by trigger (needed for incremental sync)
--  • one unique budget per user + category; one import per M-Pesa receipt
--  • RLS policies per command, scoped to the `authenticated` role
--  • views run with the caller's permissions (security_invoker), so RLS applies
--  • the anon role has no table access at all
-- ═══════════════════════════════════════════════════════════

-- ── Shared: keep updated_at current ─────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Transactions ────────────────────────────────────────────
create table public.transactions (
  id            text        not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  user_id       uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  description   text        not null check (char_length(description) between 1 and 300),
  amount        numeric(14,2) not null check (amount > 0),
  currency      text        not null default 'KES' check (currency in ('KES','USD','EUR','GBP','TZS','UGX')),
  amount_kes    numeric(14,2) check (amount_kes is null or amount_kes >= 0),
  type          text        not null check (type in ('income','expense','savings','transfer')),
  category      text        not null default 'other'
                check (category in ('food','transport','utilities','entertainment','health','shopping','savings','income','transfer','other')),
  date          date        not null,
  notes         text        check (notes is null or char_length(notes) <= 500),
  source        text        not null default 'manual' check (source in ('manual','import','ai','synced')),
  import_batch  text,
  external_ref  text        check (external_ref is null or external_ref ~ '^[A-Z0-9]{8,12}$'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  primary key (user_id, id)
);
create unique index transactions_user_external_ref on public.transactions (user_id, external_ref) where external_ref is not null;
create index transactions_user_date    on public.transactions (user_id, date desc);
create index transactions_user_updated on public.transactions (user_id, updated_at);
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- ── Budgets ─────────────────────────────────────────────────
create table public.budgets (
  id            text        not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  user_id       uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  category      text        not null
                check (category in ('food','transport','utilities','entertainment','health','shopping','savings','income','transfer','other')),
  monthly_limit numeric(14,2) not null check (monthly_limit > 0),
  period        text        not null default 'monthly' check (period = 'monthly'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  primary key (user_id, id)
);
create unique index budgets_one_per_category on public.budgets (user_id, category, period) where deleted_at is null;
create trigger budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

-- ── Import history ──────────────────────────────────────────
create table public.import_history (
  id          text        not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  filename    text        not null check (char_length(filename) <= 200),
  tx_count    integer     not null default 0 check (tx_count >= 0),
  rejected    integer     not null default 0 check (rejected >= 0),
  status      text        not null default 'success' check (status in ('success','partial','failed')),
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- ── AI advisor history ──────────────────────────────────────
create table public.advisor_history (
  id               text        not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  user_id          uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  prompt           text        not null check (char_length(prompt) <= 4000),
  response         text        not null check (char_length(response) <= 20000),
  model            text,
  context_snapshot jsonb,
  created_at       timestamptz not null default now(),
  primary key (user_id, id)
);
create index advisor_history_user_created on public.advisor_history (user_id, created_at desc);

-- ── Row level security: each user sees and changes only their own rows ──
do $$
declare t text;
begin
  foreach t in array array['transactions','budgets','import_history','advisor_history'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t || '_delete_own', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

-- ── Views (run as the caller, so the RLS above applies) ─────
create view public.monthly_summary with (security_invoker = on) as
select
  user_id,
  date_trunc('month', date)::date                                   as month,
  sum(coalesce(amount_kes, amount)) filter (where type = 'income')  as income,
  sum(coalesce(amount_kes, amount)) filter (where type = 'expense') as expenses,
  sum(coalesce(amount_kes, amount)) filter (where type = 'savings') as savings,
  count(*)                                                          as transaction_count
from public.transactions
where deleted_at is null
group by user_id, date_trunc('month', date);

create view public.current_month_by_category with (security_invoker = on) as
select
  user_id,
  category,
  sum(coalesce(amount_kes, amount)) as total_spent,
  count(*)                          as transaction_count
from public.transactions
where deleted_at is null
  and type = 'expense'
  and date_trunc('month', date) = date_trunc('month', current_date)
group by user_id, category;

revoke all on public.monthly_summary, public.current_month_by_category from anon;
grant select on public.monthly_summary, public.current_month_by_category to authenticated;
