import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertToKes, amountKes, sumKes, categoryTotals, nairobiDate, monthKey, periodBounds, periodStats, chartSeries, emergencyFundMonths } from '../public/calc.js';

const tx = (amount, currency = 'KES', extra = {}) => ({ amount, currency, type: 'expense', category: 'food', date: '2026-10-10', ...extra });

test('currency totals convert all supported currencies and add in cents', () => {
  assert.equal(sumKes([tx(100), tx(10, 'USD'), tx(1, 'EUR'), tx(1, 'GBP'), tx(100, 'TZS'), tx(1000, 'UGX')]), 1748.5);
  assert.equal(sumKes([tx(0.1), tx(0.2)]), 0.3);
  assert.equal(convertToKes(1.005), 1.01);
  assert.equal(convertToKes(10, 'USD', { USD: 140 }), 1400);
  assert.throws(() => convertToKes(1, 'USD', { USD: -1 }), RangeError);
  assert.throws(() => convertToKes(Infinity), RangeError);
  assert.throws(() => convertToKes(1, 'INVALID'), RangeError);
});

test('saved KES values survive rate changes and database numeric strings', () => {
  assert.equal(amountKes(tx(10, 'USD', { amountKes: 1300 }), { USD: 150 }), 1300);
  assert.equal(amountKes(tx(10, 'USD', { amount_kes: '1300.50' })), 1300.5);
  assert.equal(amountKes(tx(0.01, 'UGX', { amountKes: 0 })), 0);
  assert.equal(amountKes(tx(10, 'USD', { amountKes: 'bad' })), 1300);
});

test('period, category and type totals exclude deleted rows and transfers', () => {
  const records = [tx(10, 'USD'), tx(99, 'KES', { category: 'health' }),
    tx(50, 'KES', { date: '2026-09-30' }), tx(90, 'KES', { type: 'transfer' }),
    tx(200, 'KES', { deleted_at: '2026-10-11' })];
  const options = { type: 'expense', from: '2026-10-01', to: '2026-10-31' };
  assert.equal(sumKes(records, { ...options, category: 'food' }), 1300);
  assert.deepEqual(categoryTotals(records, options), { food: 1300, health: 99 });
});

test('Nairobi midnight changes the date and month before UTC midnight', () => {
  const before = new Date('2026-10-31T20:59:59Z'), after = new Date('2026-10-31T21:00:00Z');
  assert.equal(nairobiDate(before), '2026-10-31');
  assert.equal(nairobiDate(after), '2026-11-01');
  assert.equal(monthKey(after), '2026-11');
  assert.deepEqual(periodBounds('month', after), { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(periodBounds('week', after), { from: '2026-10-26', to: '2026-11-01' });
  assert.deepEqual(periodBounds('week', after, true), { from: '2026-10-19', to: '2026-10-25' });
});

test('calendar periods cross years and leap days without missing dates', () => {
  assert.deepEqual(periodBounds('month', new Date('2024-03-01T00:00Z'), true), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(periodBounds('3m', new Date('2026-01-31T12:00Z')), { from: '2025-11-01', to: '2026-01-31' });
  assert.deepEqual(periodBounds('3m', new Date('2026-01-31T12:00Z'), true), { from: '2025-08-01', to: '2025-10-31' });
});

test('dashboard comparisons use converted amounts across the month boundary', () => {
  const stats = periodStats([
    tx(10, 'USD', { type: 'income', date: '2026-11-01' }),
    tx(650, 'KES', { type: 'income', date: '2026-10-31' }),
    tx(5, 'USD', { type: 'savings', date: '2026-11-01' }),
    tx(2, 'USD', { date: '2026-11-01' }),
  ], 'month', new Date('2026-10-31T21:01Z'));
  assert.equal(stats.income, 1300);
  assert.equal(stats.exp, 260);
  assert.equal(stats.sav, 650);
  assert.equal(stats.savingsRate, '50.0');
  assert.equal(stats.incChg, '100.0');
  assert.equal(stats.txCount, 3);
});

test('chart buckets include every day exactly once and match period totals', () => {
  const now = new Date('2026-10-31T12:00Z');
  const records = Array.from({ length: 31 }, (_, i) => tx(1, 'USD', { date: `2026-10-${String(i + 1).padStart(2, '0')}` }));
  const month = chartSeries(records, 'month', now);
  assert.equal(month.expenses.reduce((a, b) => a + b, 0), 4030);
  assert.equal(month.labels.at(-1), '29–31');
  const week = chartSeries(records, 'week', now);
  assert.deepEqual(week.labels, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  assert.equal(week.expenses.reduce((a, b) => a + b, 0), 910);
  assert.deepEqual(chartSeries(records, '3m', now).labels, ['Aug', 'Sept', 'Oct']);
});

test('emergency coverage uses three complete months and includes empty months', () => {
  const records = [tx(3000, 'KES', { type: 'savings' }),
    tx(10, 'USD', { date: '2026-07-31' }), tx(1700, 'KES', { date: '2026-09-01' }),
    tx(999999, 'KES', { date: '2026-10-01' }), tx(999999, 'KES', { date: '2026-06-30' })];
  assert.equal(emergencyFundMonths(records, new Date('2026-10-21T12:00Z')), 3);
  assert.equal(emergencyFundMonths([], new Date('2026-10-21T12:00Z')), 0);
});
