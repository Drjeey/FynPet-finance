// Pure sync rules: no browser state, storage or network access.
//
// Model
//  - Every local record has `updatedAt` (time of its last local change) and, while it has changes the
//    server has not confirmed, `dirty: true`.
//  - After a push the server's own `updated_at` for that row is remembered as `syncedAt`.
//    A server row whose updated_at equals `syncedAt` is just our own write coming back and is ignored.
//  - A delete is kept as a tombstone { table, id, deletedAt } until the server has it.
//  - When both sides changed the same row, the later timestamp wins (last-write-wins). A device whose
//    clock is minutes off can pick the wrong winner; that trade-off is accepted for a personal app.
// Sync order is: pull and merge, then push what is still pending.

// When a record last changed. Records saved before sync v2 fall back to createdAt, then to "".
export const stamp = record => record.updatedAt || record.createdAt || '';

// Records that need pushing. On the very first sync everything is pushed.
export function pendingRecords(records, firstSync = false) {
  return firstSync ? records.slice() : records.filter(record => record.dirty);
}

// Record the server's confirmation of pushed rows.
//   confirmed: Map id -> { stamp, syncedAt }  (stamp = the record's stamp when it was sent)
// A row edited again while the push was running stays dirty.
export function markSynced(records, confirmed) {
  return records.map(record => {
    const done = confirmed.get(record.id);
    if (!done) return record;
    const { dirty, ...rest } = record;
    return stamp(record) === done.stamp ? { ...rest, syncedAt: done.syncedAt } : { ...record, syncedAt: done.syncedAt };
  });
}

// One live transaction per M-Pesa receipt (the server enforces this with a unique index).
// If this device imported a receipt that another device had already saved to the account, the local
// copy has never reached the server (no syncedAt); pushing it would fail and block every later sync.
// Those never-synced copies are dropped in favour of the copy the server already has.
// Returns { records, dropped } where dropped lists the removed ids.
export function dropReceiptDuplicates(records) {
  const onServer = new Set(records.filter(r => r.externalRef && r.syncedAt).map(r => r.externalRef));
  const seen = new Set(), kept = [], dropped = [];
  for (const record of records) {
    const ref = record.externalRef;
    if (ref && !record.syncedAt && (onServer.has(ref) || seen.has(ref))) { dropped.push(record.id); continue; }
    if (ref) seen.add(ref);
    kept.push(record);
  }
  return { records: kept, dropped };
}

// Add (or refresh) a tombstone. Returns a new list.
export function addTombstone(tombstones, table, id, deletedAt) {
  return [...tombstones.filter(t => !(t.table === table && t.id === id)), { table, id, deletedAt }];
}

// Merge server rows into local records.
//   local       local records (live rows only)
//   remote      [{ id, updatedAt, deletedAt, record }]  `record` is the local-shape row, or null when deleted/invalid
//   tombstones  this table's pending local deletes
//   options     { table, uniqueKey, now }  uniqueKey keeps one live record per value (one budget per category)
// Returns { records, tombstones, changed }.
export function mergeRemote(local, remote, tombstones = [], { table, uniqueKey, now = new Date().toISOString() } = {}) {
  const byId = new Map(local.map(record => [record.id, record]));
  const tombs = new Map(tombstones.map(t => [t.id, t]));
  let changed = 0;

  for (const { id, updatedAt = '', deletedAt = null, record = null } of remote) {
    const tomb = tombs.get(id);
    if (tomb) {
      if (deletedAt) { tombs.delete(id); continue; }               // the server already has the delete
      if (tomb.deletedAt >= updatedAt) continue;                   // our delete is newer: keep it and push it
      tombs.delete(id);                                            // the server edit is newer: the row comes back
    }
    const mine = byId.get(id);
    if (deletedAt) {
      if (mine && (!mine.dirty || stamp(mine) <= deletedAt)) { byId.delete(id); changed++; }
      continue;                                                    // a newer unsynced local edit survives and is pushed back
    }
    if (!record) continue;
    if (mine && mine.syncedAt === updatedAt) continue;             // our own write echoed back
    if (mine && !mine.dirty && stamp(mine) === updatedAt) continue; // already have exactly this version
    if (!mine || !mine.dirty || updatedAt > stamp(mine)) {         // no unsynced local change, or the server change is later
      byId.set(id, record); changed++;
    }
  }

  if (uniqueKey) {
    const seen = new Map();
    for (const record of [...byId.values()]) {
      const other = seen.get(record[uniqueKey]);
      if (!other) { seen.set(record[uniqueKey], record); continue; }
      const [keep, drop] = stamp(record) > stamp(other) ? [record, other] : [other, record];
      seen.set(record[uniqueKey], keep);
      byId.delete(drop.id);
      tombs.set(drop.id, { table, id: drop.id, deletedAt: now });
      changed++;
    }
  }
  return { records: [...byId.values()], tombstones: [...tombs.values()], changed };
}
