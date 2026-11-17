import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stamp, pendingRecords, markSynced, addTombstone, mergeRemote } from '../public/sync.js';
import { csvText } from '../public/csv.js';

const T1 = '2026-11-01T10:00:00.000Z', T2 = '2026-11-02T10:00:00.000Z', T3 = '2026-11-03T10:00:00.000Z', T4 = '2026-11-04T10:00:00.000Z';
const row = (id, updatedAt, extra = {}) => ({ id, description: `row ${id}`, updatedAt, ...extra });
const remote = (id, updatedAt, deletedAt = null, record = undefined) =>
  ({ id, updatedAt, deletedAt, record: deletedAt ? null : (record ?? row(id, updatedAt)) });

test('stamp falls back to createdAt, then empty', () => {
  assert.equal(stamp({ updatedAt: T2, createdAt: T1 }), T2);
  assert.equal(stamp({ createdAt: T1 }), T1);
  assert.equal(stamp({}), '');
});

test('pendingRecords returns dirty rows, or everything on the first sync', () => {
  const rows = [row('a', T1), row('b', T3, { dirty: true })];
  assert.deepEqual(pendingRecords(rows).map(r => r.id), ['b']);
  assert.deepEqual(pendingRecords(rows, true).map(r => r.id), ['a', 'b']);
});

test('markSynced clears dirty and remembers the server time; a row edited during the push stays dirty', () => {
  const rows = [row('a', T2, { dirty: true }), row('b', T3, { dirty: true }), row('c', T1)];
  const confirmed = new Map([['a', { stamp: T2, syncedAt: T4 }], ['b', { stamp: T2, syncedAt: T4 }]]);
  const [a, b, c] = markSynced(rows, confirmed);
  assert.deepEqual([a.dirty, a.syncedAt], [undefined, T4]);
  assert.deepEqual([b.dirty, b.syncedAt], [true, T4]);
  assert.equal(c.syncedAt, undefined);
});

test('addTombstone replaces an older tombstone for the same row', () => {
  const list = addTombstone(addTombstone([], 'transactions', 'a', T1), 'transactions', 'a', T2);
  assert.deepEqual(list, [{ table: 'transactions', id: 'a', deletedAt: T2 }]);
});

test('a row deleted on the server disappears locally and is not resurrected', () => {
  const merged = mergeRemote([row('a', T1), row('b', T1)], [remote('a', T2, T2)]);
  assert.deepEqual(merged.records.map(r => r.id), ['b']);
  assert.equal(merged.changed, 1);
});

test('a local delete is not undone by an older server copy and stays queued for pushing', () => {
  const tombs = [{ table: 'transactions', id: 'a', deletedAt: T3 }];
  const merged = mergeRemote([], [remote('a', T2)], tombs);
  assert.deepEqual(merged.records, []);
  assert.deepEqual(merged.tombstones, tombs);
});

test('a newer server edit beats an older local delete', () => {
  const tombs = [{ table: 'transactions', id: 'a', deletedAt: T1 }];
  const merged = mergeRemote([], [remote('a', T2)], tombs);
  assert.deepEqual(merged.records.map(r => r.id), ['a']);
  assert.deepEqual(merged.tombstones, []);
});

test('once the server also has the delete, the tombstone is dropped', () => {
  const tombs = [{ table: 'transactions', id: 'a', deletedAt: T2 }];
  const merged = mergeRemote([], [remote('a', T2, T2)], tombs);
  assert.deepEqual(merged.tombstones, []);
});

test('an edit made on another device replaces a clean local copy, whatever the clocks say', () => {
  const clean = row('a', T3, { description: 'old', syncedAt: T1 });
  const merged = mergeRemote([clean], [remote('a', T2, null, row('a', T2, { description: 'new' }))]);
  assert.equal(merged.records[0].description, 'new');
});

test('our own write coming back is ignored, so a newer local edit is not lost', () => {
  const mine = row('a', T2, { description: 'edited again', dirty: true, syncedAt: T3 });
  const merged = mergeRemote([mine], [remote('a', T3, null, row('a', T3, { description: 'first push' }))]);
  assert.equal(merged.records[0].description, 'edited again');
  assert.equal(merged.changed, 0);
});

test('when both sides changed, the later timestamp wins', () => {
  const newerLocal = row('a', T3, { description: 'mine', dirty: true });
  assert.equal(mergeRemote([newerLocal], [remote('a', T2, null, row('a', T2, { description: 'theirs' }))]).records[0].description, 'mine');
  const olderLocal = row('a', T1, { description: 'mine', dirty: true });
  assert.equal(mergeRemote([olderLocal], [remote('a', T2, null, row('a', T2, { description: 'theirs' }))]).records[0].description, 'theirs');
});

test('a local edit that is not yet synced survives a server delete made earlier', () => {
  const merged = mergeRemote([row('a', T3, { dirty: true })], [remote('a', T2, T2)]);
  assert.deepEqual(merged.records.map(r => r.id), ['a']);
});

test('a clean local row is removed by a server delete even if its stamp is later (clock skew)', () => {
  const merged = mergeRemote([row('a', T3, { syncedAt: T1 })], [remote('a', T2, T2)]);
  assert.deepEqual(merged.records, []);
});

test('rows already held at exactly this version are not counted as changes', () => {
  const merged = mergeRemote([row('a', T2)], [remote('a', T2)]);
  assert.equal(merged.changed, 0);
});

test('legacy rows without timestamps, marked dirty on first sync, lose to a dated remote row', () => {
  const merged = mergeRemote([{ id: 'a', description: 'legacy', dirty: true }], [remote('a', T1, null, row('a', T1, { description: 'dated' }))]);
  assert.equal(merged.records[0].description, 'dated');
});

test('unknown remote rows are added, invalid ones skipped', () => {
  const merged = mergeRemote([row('a', T1)], [remote('b', T2), { id: 'c', updatedAt: T2, deletedAt: null, record: null }]);
  assert.deepEqual(merged.records.map(r => r.id), ['a', 'b']);
});

test('budgets keep one live record per category; the older one is queued for deletion', () => {
  const local = [{ id: 'b1', category: 'food', limit: 100, updatedAt: T1 }];
  const incoming = [remote('b2', T2, null, { id: 'b2', category: 'food', limit: 200, updatedAt: T2 })];
  const merged = mergeRemote(local, incoming, [], { table: 'budgets', uniqueKey: 'category', now: T3 });
  assert.deepEqual(merged.records.map(r => r.id), ['b2']);
  assert.deepEqual(merged.tombstones, [{ table: 'budgets', id: 'b1', deletedAt: T3 }]);
});

test('a budget can be recreated for a category after its old one was deleted', () => {
  const tombs = [{ table: 'budgets', id: 'old', deletedAt: T2 }];
  const local = [{ id: 'new', category: 'food', limit: 300, updatedAt: T3, dirty: true }];
  const merged = mergeRemote(local, [remote('old', T1, null, { id: 'old', category: 'food', limit: 100, updatedAt: T1 })], tombs, { table: 'budgets', uniqueKey: 'category' });
  assert.deepEqual(merged.records.map(r => r.id), ['new']);
  assert.deepEqual(merged.tombstones, tombs);
});

test('CSV cells that could run as spreadsheet formulas are neutralised', () => {
  assert.equal(csvText('=HYPERLINK("http://x","y")'), `"'=HYPERLINK(""http://x"",""y"")"`);
  assert.equal(csvText('+254 shop'), `"'+254 shop"`);
  assert.equal(csvText('-refund'), `"'-refund"`);
  assert.equal(csvText('@SUM(A1)'), `"'@SUM(A1)"`);
  assert.equal(csvText('\tcmd'), `"'\tcmd"`);
  assert.equal(csvText('Naivas, Westlands'), '"Naivas, Westlands"');
  assert.equal(csvText('say "hi"'), '"say ""hi"""');
  assert.equal(csvText(null), '""');
});
