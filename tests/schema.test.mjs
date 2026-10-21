// Runs supabase/migrations/001_init.sql on an in-process Postgres (PGlite) with a
// minimal stand-in for Supabase's auth schema and roles, then checks row-level security.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
let db;

// Run SQL as a Supabase API role, optionally as a signed-in user.
async function as(role, userId, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId || ''}', false); set role ${role};`);
  try { return await db.query(sql, params); } finally { await db.exec('reset role;'); }
}

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;  -- Supabase's default
    insert into auth.users values ('${A}'), ('${B}');
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/001_init.sql', import.meta.url), 'utf8'));
});

const tx = (id, extra = '') =>
  `insert into public.transactions (id, description, amount, type, category, date${extra ? ', external_ref' : ''})
   values ('${id}', 'Naivas', 1250, 'expense', 'food', current_date${extra ? `, '${extra}'` : ''})`;

test('users only see their own transactions', async () => {
  await as('authenticated', A, tx('a1'));
  await as('authenticated', B, tx('b1'));
  const seenByA = await as('authenticated', A, 'select id, user_id from public.transactions');
  assert.deepEqual(seenByA.rows.map(r => r.id), ['a1']);
  assert.equal(seenByA.rows[0].user_id, A, 'user_id defaults to the caller');
});

test('a user cannot write rows for someone else', async () => {
  await assert.rejects(as('authenticated', A,
    `insert into public.transactions (id, user_id, description, amount, type, date) values ('x1', '${B}', 'x', 1, 'expense', current_date)`),
    /row-level security/);
  const upd = await as('authenticated', A, `update public.transactions set amount = 1 where id = 'b1'`);
  assert.equal(upd.affectedRows ?? 0, 0);
  const del = await as('authenticated', A, `delete from public.transactions where id = 'b1'`);
  assert.equal(del.affectedRows ?? 0, 0);
});

test('summary views respect RLS (security_invoker)', async () => {
  const a = await as('authenticated', A, 'select user_id from public.monthly_summary');
  assert.deepEqual(a.rows.map(r => r.user_id), [A]);
  const c = await as('authenticated', B, 'select user_id from public.current_month_by_category');
  assert.deepEqual(c.rows.map(r => r.user_id), [B]);
});

test('the anon role cannot read anything', async () => {
  await assert.rejects(as('anon', null, 'select * from public.transactions'), /permission denied/);
  await assert.rejects(as('anon', null, 'select * from public.monthly_summary'), /permission denied/);
});

test('constraints: receipt dedupe, one budget per category, valid values', async () => {
  await as('authenticated', A, tx('a2', 'SGH4XK2LMN'));
  await assert.rejects(as('authenticated', A, tx('a3', 'SGH4XK2LMN')), /duplicate key/);
  await as('authenticated', B, tx('b2', 'SGH4XK2LMN'));   // same receipt, different user: allowed
  await as('authenticated', A, `insert into public.budgets (id, category, monthly_limit) values ('bg1', 'food', 5000)`);
  await assert.rejects(as('authenticated', A, `insert into public.budgets (id, category, monthly_limit) values ('bg2', 'food', 10)`), /duplicate key/);
  await assert.rejects(as('authenticated', A, `insert into public.transactions (id, description, amount, type, date) values ('a9', 'x', -5, 'expense', current_date)`), /check constraint/);
  await assert.rejects(as('authenticated', A, `insert into public.transactions (id, description, amount, type, date) values ('a"><x', 'x', 5, 'expense', current_date)`), /check constraint/);
});

test('updated_at is maintained by the trigger', async () => {
  const before = (await as('authenticated', A, `select updated_at from public.transactions where id = 'a1'`)).rows[0].updated_at;
  await new Promise(r => setTimeout(r, 20));
  await db.exec('begin; commit;');   // new transaction so now() advances
  await as('authenticated', A, `update public.transactions set notes = 'edited' where id = 'a1'`);
  const after = (await as('authenticated', A, `select updated_at from public.transactions where id = 'a1'`)).rows[0].updated_at;
  assert.ok(after > before);
});
