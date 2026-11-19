// Regression tests for the November 2026 functionality audit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropReceiptDuplicates } from '../public/sync.js';
import { amountError, MAX_AMOUNT, parseAmount } from '../public/addflow.js';
import { selectionTotals } from '../public/importreview.js';
import { budgetSummary } from '../public/budgets.js';
import { monthlyRows, coverStatus } from '../public/analytics.js';

const T = '2026-11-01T10:00:00.000Z';

test('a never-synced copy of a receipt already on the account is dropped; the server copy stays', () => {
  const records = [
    { id: 'local', externalRef: 'SGH4XK2LMN', dirty: true },        // imported here, not yet pushed
    { id: 'server', externalRef: 'SGH4XK2LMN', syncedAt: T },        // pulled from another device
    { id: 'plain', dirty: true },                                     // typed in by hand, no receipt
    { id: 'other', externalRef: 'QWE1234567', syncedAt: T },
  ];
  const { records: kept, dropped } = dropReceiptDuplicates(records);
  assert.deepEqual(dropped, ['local']);
  assert.deepEqual(kept.map(r => r.id), ['server', 'plain', 'other']);
});

test('two unsynced copies of one receipt keep only the first; distinct receipts are untouched', () => {
  const { records, dropped } = dropReceiptDuplicates([
    { id: 'a', externalRef: 'AAA1111111' }, { id: 'b', externalRef: 'AAA1111111' }, { id: 'c', externalRef: 'BBB2222222' },
  ]);
  assert.deepEqual(records.map(r => r.id), ['a', 'c']);
  assert.deepEqual(dropped, ['b']);
  assert.equal(dropReceiptDuplicates([]).dropped.length, 0);
});

test('money fields reject zero, negatives and amounts the database column cannot hold', () => {
  assert.equal(amountError(1500), '');
  assert.equal(amountError(MAX_AMOUNT), '');
  assert.match(amountError(0), /greater than zero/);
  assert.match(amountError(NaN), /greater than zero/);
  assert.match(amountError(parseAmount('1,000,000,000.01')), /up to 1,000,000,000/);
  assert.match(amountError(parseAmount('99999999999999'), 'a limit'), /^Enter a limit up to/);
});

test('import footer totals add up in cents', () => {
  const rows = [
    { amount: 0.1, type: 'expense', include: true }, { amount: 0.2, type: 'expense', include: true },
    { amount: 1000.05, type: 'income', include: true }, { amount: 999, type: 'expense', include: false },
  ];
  assert.deepEqual(selectionTotals(rows), { count: 3, moneyIn: 1000.05, moneyOut: 0.3 });
});

test('budget summary totals are exact across many fractional limits', () => {
  const rows = Array.from({ length: 10 }, () => ({ budget: { limit: 0.1 }, spent: 0.1, over: false }));
  const s = budgetSummary(rows, new Date('2026-11-16T09:00:00Z'));
  assert.equal(s.limit, 1);
  assert.equal(s.spent, 1);
  assert.equal(s.left, 0);
});

test('monthly net is rounded to cents', () => {
  const tx = (type, amount) => ({ type, amount, currency: 'KES', category: 'other', date: '2026-11-05' });
  const [row] = monthlyRows([tx('income', 0.3), tx('expense', 0.1), tx('expense', 0.2)], new Date('2026-11-16T09:00:00Z'), undefined, 1);
  assert.equal(row.net, 0);
});

test('emergency cover uses this month when there is no earlier spending (Fyn and Analytics share this figure)', () => {
  const tx = (type, amount, date) => ({ type, amount, currency: 'KES', category: 'other', date });
  const data = [tx('expense', 10000, '2026-11-03'), tx('savings', 20000, '2026-11-04')];
  assert.equal(coverStatus(data, new Date('2026-11-16T09:00:00Z')).months, 2);
});
