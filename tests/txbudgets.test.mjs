import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterTransactions, countFilters, quickRange, groupByDate, sortTransactions } from '../public/txfilter.js';
import { budgetRows, budgetSummary, lastMonthSpent, categoryChoices, suggestRaise, BUDGET_CATEGORIES } from '../public/budgets.js';

const tx = (description, amount, category, date, extra = {}) => ({ description, amount, category, date, type: 'expense', currency: 'KES', createdAt: date + 'T08:00:00Z', ...extra });
const NOW = new Date('2026-11-16T09:00:00Z');
const rows = [
  tx('Naivas Westlands', 4850, 'food', '2026-11-16'), tx('Uber trip', 950, 'transport', '2026-11-15'),
  tx('Salary', 85000, 'income', '2026-11-12', { type: 'income' }), tx('Netflix', 5800, 'entertainment', '2026-11-10', { notes: 'Family plan' }),
  tx('Old shop', 100, 'food', '2026-10-05'), { ...tx('Deleted', 5, 'food', '2026-11-01'), deletedAt: '2026-11-02' },
];

test('filters combine type, search, categories and dates, and skip deleted rows', () => {
  assert.equal(filterTransactions(rows).length, 5);
  assert.deepEqual(filterTransactions(rows, { type: 'income' }).map(r => r.description), ['Salary']);
  assert.deepEqual(filterTransactions(rows, { query: '  FAMILY ' }).map(r => r.description), ['Netflix']);
  assert.deepEqual(filterTransactions(rows, { categories: ['food'], from: '2026-11-01', to: '2026-11-30' }).map(r => r.description), ['Naivas Westlands']);
  assert.deepEqual(filterTransactions(rows, { to: '2026-10-31' }).map(r => r.description), ['Old shop']);
  assert.equal(filterTransactions(rows, { query: 'zzz' }).length, 0);
});

test('newest first, and for one day the one added last first', () => {
  const sorted = sortTransactions([tx('a', 1, 'food', '2026-11-01', { createdAt: '2026-11-01T08:00:00Z' }), tx('b', 1, 'food', '2026-11-01', { createdAt: '2026-11-01T09:00:00Z' }), tx('c', 1, 'food', '2026-11-02')]);
  assert.deepEqual(sorted.map(r => r.description), ['c', 'b', 'a']);
});

test('filter count includes categories and a date range once', () => {
  assert.equal(countFilters({}), 0);
  assert.equal(countFilters({ categories: ['food', 'health'], from: '2026-11-01', to: '2026-11-30' }), 3);
  assert.equal(countFilters({ to: '2026-11-30' }), 1);
});

test('quick ranges follow Nairobi calendar months', () => {
  assert.deepEqual(quickRange('month', NOW), { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(quickRange('last-month', NOW), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(quickRange('3m', NOW), { from: '2026-09-01', to: '2026-11-30' });
});

test('rows are grouped by day with today and yesterday marked', () => {
  const groups = groupByDate(filterTransactions(rows), '2026-11-16');
  assert.deepEqual(groups.map(g => [g.date, g.rel, g.rows.length]), [['2026-11-16', 'today', 1], ['2026-11-15', 'yesterday', 1], ['2026-11-12', null, 1], ['2026-11-10', null, 1], ['2026-10-05', null, 1]]);
});

test('budget rows give what is left, per day, tone and how far over', () => {
  const budgets = [{ id: 'b1', category: 'food', limit: 25000 }, { id: 'b2', category: 'entertainment', limit: 5000 }, { id: 'b3', category: 'transport', limit: 1000 }];
  const [food, ent, transport] = budgetRows(budgets, rows, NOW);
  assert.equal(food.spent, 4850); assert.equal(food.left, 20150); assert.equal(food.tone, 'ok'); assert.equal(food.perDay, Math.round(20150 / 15));
  assert.equal(ent.over, true); assert.equal(ent.tone, 'bad'); assert.equal(ent.overPct, 16); assert.equal(ent.perDay, 0);
  assert.equal(transport.tone, 'warn'); assert.equal(transport.pct, 95);
});

test('the summary adds up and says when the total is over', () => {
  const budgets = [{ id: 'b1', category: 'food', limit: 5000 }, { id: 'b2', category: 'entertainment', limit: 5000 }];
  const summary = budgetSummary(budgetRows(budgets, rows, NOW), NOW);
  assert.deepEqual([summary.count, summary.limit, summary.spent, summary.left, summary.pctUsed, summary.overCount, summary.over], [2, 10000, 10650, -650, 107, 1, true]);
  assert.equal(summary.perDay, 0);
  assert.equal(budgetSummary([], NOW).pctUsed, 0);
});

test('last month spending is read from the previous calendar month', () => {
  assert.equal(lastMonthSpent(rows, 'food', NOW), 100);
  assert.equal(lastMonthSpent(rows, 'health', NOW), 0);
});

test('categories that already have a budget are marked, except the one being edited', () => {
  const budgets = [{ id: 'b1', category: 'food' }, { id: 'b2', category: 'savings' }];
  const choices = categoryChoices(budgets, null);
  assert.deepEqual(choices.filter(c => c.taken).map(c => c.key), ['food']);
  assert.equal(choices.length, BUDGET_CATEGORIES.length);
  assert.equal(categoryChoices(budgets, 'b1').find(c => c.key === 'food').taken, false);
  assert.ok(categoryChoices(budgets, 'b2').some(c => c.key === 'savings'));
});

test('a suggested raise is a round number above what was spent', () => {
  assert.equal(suggestRaise(5800), 6000); assert.equal(suggestRaise(5000), 5500); assert.equal(suggestRaise(0), 500);
});
