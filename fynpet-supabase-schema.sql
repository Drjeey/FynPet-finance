-- ═══════════════════════════════════════════════════════════
-- FYNPET SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor (Database → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- 1. TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
  id            TEXT PRIMARY KEY,
  description   TEXT NOT NULL,
  amount        NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  type          TEXT NOT NULL CHECK (type IN ('income','expense','savings','transfer')),
  category      TEXT NOT NULL DEFAULT 'other',
  date          DATE NOT NULL,
  notes         TEXT,
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','import','ai','synced')),
  import_batch  TEXT,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_date     ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_tx_type     ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_tx_user     ON transactions(user_id);

-- 2. BUDGETS
CREATE TABLE IF NOT EXISTS public.budgets (
  id            TEXT PRIMARY KEY,
  category      TEXT NOT NULL,
  monthly_limit NUMERIC(14,2) NOT NULL CHECK (monthly_limit > 0),
  period        TEXT NOT NULL DEFAULT 'monthly',
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. IMPORT HISTORY
CREATE TABLE IF NOT EXISTS public.import_history (
  id          TEXT PRIMARY KEY,
  filename    TEXT NOT NULL,
  tx_count    INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'success',
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ADVISOR HISTORY (AI financial advice logs)
-- This is the key table — stores every conversation turn with Claude
CREATE TABLE IF NOT EXISTS public.advisor_history (
  id          TEXT PRIMARY KEY,
  prompt      TEXT NOT NULL,        -- user's question
  response    TEXT NOT NULL,        -- Claude's answer
  model       TEXT DEFAULT 'claude-sonnet-4-20250514',
  -- Snapshot of key financial metrics at time of conversation
  -- Allows you to review advice in the context of your finances at that time
  context_snapshot JSONB,           -- { income, expenses, savings, savingsRate, emergencyFundMonths }
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_adv_user    ON advisor_history(user_id);
CREATE INDEX IF NOT EXISTS idx_adv_created ON advisor_history(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Users can only read/write their own data
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_history   ENABLE ROW LEVEL SECURITY;

-- Transactions policies
-- auth.uid() IS NOT NULL ensures only authenticated users can access rows
CREATE POLICY "users_own_transactions" ON public.transactions
  FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Budgets policies
CREATE POLICY "users_own_budgets" ON public.budgets
  FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Import history policies
CREATE POLICY "users_own_imports" ON public.import_history
  FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Advisor history policies
CREATE POLICY "users_own_advisor_history" ON public.advisor_history
  FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- HELPFUL VIEWS
-- ═══════════════════════════════════════════════════════════

-- Monthly summary view
CREATE OR REPLACE VIEW public.monthly_summary AS
SELECT
  DATE_TRUNC('month', date) AS month,
  SUM(CASE WHEN type = 'income'   THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'expense'  THEN amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN type = 'savings'  THEN amount ELSE 0 END) AS savings,
  CASE
    WHEN SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) > 0
    THEN ROUND(SUM(CASE WHEN type = 'savings' THEN amount ELSE 0 END) /
         SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) * 100, 1)
    ELSE 0
  END AS savings_rate_pct,
  COUNT(*) AS transaction_count,
  user_id
FROM public.transactions
GROUP BY DATE_TRUNC('month', date), user_id
ORDER BY month DESC;

-- Category spend view (current month)
CREATE OR REPLACE VIEW public.current_month_by_category AS
SELECT
  category,
  SUM(amount) AS total_spent,
  COUNT(*) AS transaction_count,
  user_id
FROM public.transactions
WHERE
  type = 'expense'
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY category, user_id
ORDER BY total_spent DESC;

-- ═══════════════════════════════════════════════════════════
-- NOTES FOR SETUP
-- ═══════════════════════════════════════════════════════════
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Go to Settings > API in Supabase dashboard
--    - Copy "Project URL" → paste in FynPet Settings > Supabase URL
--    - Copy "anon public" key → paste in FynPet Settings > Anon Key
-- 3. Click "Connect & Test" in FynPet
-- 4. All transactions, budgets, and AI advisor history will sync automatically
--
-- NOTE: The app works WITHOUT Supabase (localStorage only).
-- Supabase adds cross-device sync and persistence.
-- The advisor_history table lets you review past AI advice
-- alongside the financial snapshot from that moment in time.
