-- ═══════════════════════════════════════════════════════════
-- FynPet schema v2.1 — run after 001_init.sql.
--
-- Deleting a transaction is a soft delete (deleted_at is set; the row stays).
-- In 001 the one-import-per-receipt index also covered deleted rows, so after a person
-- deleted an imported transaction and imported the same statement again, the new row
-- collided with the deleted one and every later sync from that device failed.
--
-- The receipt is now unique among live rows only. This is non-destructive: no data is
-- changed, and the new index is less strict than the old one, so creating it cannot fail.
-- ═══════════════════════════════════════════════════════════

drop index if exists public.transactions_user_external_ref;
create unique index transactions_user_external_ref on public.transactions (user_id, external_ref)
  where external_ref is not null and deleted_at is null;
