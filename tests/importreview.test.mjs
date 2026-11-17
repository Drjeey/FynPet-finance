import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowKey, splitChunks, dedupeWithinFile, classifyRows, statementTotals, reconcile, importStatus, failureReason } from '../public/importreview.js';

const row = (description, amount, extra = {}) => ({ description, amount, type: 'expense', category: 'food', date: '2026-11-10', receipt: '', ...extra });

test('chunks break at line ends and never lose text', () => {
  const text = Array.from({ length: 40 }, (_, i) => `LINE ${i} ${'x'.repeat(30)}`).join('\n');
  const chunks = splitChunks(text, 200);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(c => c.length <= 200));
  assert.equal(chunks.join('\n').replace(/\s+/g, ''), text.replace(/\s+/g, ''));
  assert.deepEqual(splitChunks('', 200), []);
  assert.deepEqual(splitChunks('short', 200), ['short']);
});

test('repeats inside the file are dropped by receipt, or by day + amount + description when there is no receipt', () => {
  const rows = [row('Naivas', 100, { receipt: 'ABC12345XY' }), row('Naivas again', 100, { receipt: 'ABC12345XY' }), row('Kiosk', 50), row('KIOSK ', 50), row('Kiosk', 60)];
  const { rows: kept, repeats } = dedupeWithinFile(rows);
  assert.equal(kept.length, 3); assert.equal(repeats, 2);
});

test('rows are sorted into good, check, already saved and outside the dates', () => {
  const existing = [
    { description: 'Old import', amount: 10, date: '2026-11-01', externalRef: 'RECEIPT001' },
    { description: 'Lunch', amount: 300, date: '2026-11-10' },
    { description: 'Deleted one', amount: 5, date: '2026-11-02', externalRef: 'DELETED001', deletedAt: '2026-11-03' },
  ];
  const rows = [
    row('Same receipt', 10, { receipt: 'RECEIPT001', date: '2026-11-01' }),
    row('lunch', 300),
    row('Paybill 888820', 3200, { category: 'other' }),
    row('Quickmart', 450),
    row('Before the range', 20, { date: '2026-10-01' }),
    row('Was deleted', 5, { receipt: 'DELETED001', date: '2026-11-02' }),
  ];
  const result = classifyRows(rows, existing, { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(result.duplicates.map(r => r.description), ['Same receipt']);
  assert.deepEqual(result.check.map(r => [r.description, r.reason, r.include]), [['lunch', 'possible-duplicate', false], ['Paybill 888820', 'category', true]]);
  assert.deepEqual(result.fresh.map(r => r.description), ['Quickmart', 'Was deleted']);
  assert.deepEqual(result.outside.map(r => r.description), ['Before the range']);
  assert.equal(result.fresh.length + result.check.length + result.duplicates.length + result.outside.length, rows.length);
});

test('with no date range every row is kept', () => {
  assert.equal(classifyRows([row('a', 1, { date: '1999-01-01' })], []).fresh.length, 1);
});

test('statement totals are read from a Total line, or reported as missing', () => {
  assert.deepEqual(statementTotals('SUMMARY\nTotal: 85,000.00 53,600.00\nDetails'), { paidIn: 85000, paidOut: 53600 });
  assert.deepEqual(statementTotals('  TOTAL  1,000.50   -250.00 '), { paidIn: 1000.5, paidOut: 250 });
  assert.equal(statementTotals('Total transactions: 58'), null);
  assert.equal(statementTotals('no totals here'), null);
  assert.equal(statementTotals(''), null);
});

test('reconciliation matches, differs, is unavailable, or is skipped when a date range is set', () => {
  const rows = [row('Salary', 85000, { type: 'income', category: 'income' }), row('Rent', 50000), row('Save', 3600, { type: 'savings' })];
  assert.equal(reconcile(rows, { paidIn: 85000, paidOut: 53600 }).status, 'match');
  const differs = reconcile(rows, { paidIn: 85000, paidOut: 54800 });
  assert.equal(differs.status, 'differs'); assert.equal(differs.diffOut, -1200);
  assert.equal(reconcile(rows, null).status, 'unavailable');
  assert.deepEqual(reconcile(rows, { paidIn: 1, paidOut: 1 }, { rangeSet: true }).status, 'skipped');
});

test('import status is honest about partial and failed imports', () => {
  assert.equal(importStatus({ saved: 51 }), 'success');
  assert.equal(importStatus({ saved: 48, unreadRows: 3 }), 'partial');
  assert.equal(importStatus({ saved: 40, failedParts: 1 }), 'partial');
  assert.equal(importStatus({ saved: 0, error: new Error('x') }), 'failed');
  assert.equal(importStatus({ saved: 5, error: new Error('x') }), 'success');
});

test('failure reasons are in plain words with a next step', () => {
  assert.equal(failureReason({ name: 'PasswordException', message: 'x' }).code, 'password');
  assert.equal(failureReason(new Error('No text found in this PDF')).code, 'no-text');
  assert.equal(failureReason(new Error('Sign in to use AI features.')).code, 'signin');
  assert.equal(failureReason(new Error('AI features are off until you agree to send data to Claude.')).code, 'consent');
  assert.equal(failureReason(new Error('Daily AI limit reached (60 requests).')).code, 'limit');
  assert.equal(failureReason(new Error('No transactions were found in this statement.')).code, 'empty');
  assert.equal(failureReason(new Error('boom')).code, 'ai');
  assert.ok(['password','no-text','signin','consent','limit','empty','ai'].every(c => failureReason(new Error(c === 'ai' ? 'x' : c === 'no-text' ? 'no text' : c === 'empty' ? 'no transactions' : c)).short));
  assert.ok(failureReason(new Error('boom')).next.length > 10);
});

test('row keys ignore case and spacing', () => {
  assert.equal(rowKey(row('  Naivas   Westlands ', 10.5)), rowKey(row('naivas westlands', 10.50)));
});
