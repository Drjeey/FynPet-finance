import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyRows, savingsSentence, avgMonthlyExpenses, coverStatus, independenceStatus, paceText, clampGoalMonths, barHeights, hasAnyData } from '../public/analytics.js';

const NOW = new Date('2026-11-16T09:00:00Z');
const t = (type, amount, date, extra = {}) => ({ type, amount, date, category: type === 'savings' ? 'savings' : 'food', currency: 'KES', ...extra });
const data = [
  t('income', 88000, '2026-11-02'), t('expense', 61200, '2026-11-10'), t('savings', 18400, '2026-11-12'),
  t('income', 89500, '2026-10-02'), t('expense', 60000, '2026-10-10'), t('savings', 12000, '2026-10-12'),
  t('expense', 60000, '2026-09-10'), t('expense', 63000, '2026-08-10'), t('savings', 5000, '2026-08-20'),
  { ...t('expense', 999999, '2026-10-15'), deletedAt: '2026-10-16' },
];

test('monthly rows: saved and net are different numbers, oldest first, current flagged', () => {
  const rows = monthlyRows(data, NOW);
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map(r => r.label), ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
  const nov = rows[5];
  assert.equal(nov.income, 88000); assert.equal(nov.expenses, 61200); assert.equal(nov.saved, 18400);
  assert.equal(nov.net, 26800); assert.notEqual(nov.net, nov.saved);
  assert.equal(nov.rate, 20.9); assert.equal(nov.current, true);
  assert.equal(rows[2].rate, null);          // August has no income
  assert.equal(rows[4].expenses, 60000);     // the deleted row is ignored
});

test('sentence for saving, not saving and no income', () => {
  const fmt = n => `KES ${n.toLocaleString('en-US')}`;
  assert.equal(savingsSentence({ key: '2026-11', saved: 18400, rate: 20.9 }, fmt), 'You saved KES 18,400 in November, 21% of your income.');
  assert.equal(savingsSentence({ key: '2026-11', saved: 500, rate: null }, fmt), 'You saved KES 500 in November.');
  assert.equal(savingsSentence({ key: '2026-11', saved: 0, rate: null }, fmt), 'You have not saved anything in November yet.');
});

test('average expenses use the last three full months, else this month', () => {
  assert.equal(avgMonthlyExpenses(data, NOW), (60000 + 60000 + 63000) / 3);
  assert.equal(avgMonthlyExpenses([t('expense', 900, '2026-11-03')], NOW), 900);
  assert.equal(avgMonthlyExpenses([], NOW), 0);
});

test('cover status: months saved against the goal, with the 3-month tick', () => {
  const s = coverStatus(data, NOW, undefined, 6);
  assert.equal(s.saved, 35400); assert.equal(s.monthly, 61000);
  assert.ok(Math.abs(s.months - 35400 / 61000) < 1e-9);
  assert.equal(s.tick3, 50); assert.equal(s.met, false);
  assert.equal(coverStatus(data, NOW, undefined, 3).tick3, null);
  assert.equal(coverStatus([], NOW).months, 0);
  assert.equal(coverStatus(data, NOW, undefined, 0.5).goal, 6);   // invalid goal falls back
});

test('goal months accept 1 to 24 only', () => {
  assert.equal(clampGoalMonths('6'), 6); assert.equal(clampGoalMonths('1.5.2'), null);
  assert.equal(clampGoalMonths('0'), null); assert.equal(clampGoalMonths('25'), null); assert.equal(clampGoalMonths('abc'), null);
});

test('independence: progress, pace in years and the 25x suggestion', () => {
  const s = independenceStatus(data, NOW, undefined, 3000000);
  assert.equal(s.saved, 35400);
  assert.equal(s.avgSaved, 35400 / 4);
  assert.ok(Math.abs(s.years - (3000000 - 35400) / (s.avgSaved * 12)) < 1e-9);
  assert.equal(s.suggested, 61000 * 12 * 25);
  assert.equal(independenceStatus([t('expense', 5, '2026-11-01')], NOW).years, null);
  assert.equal(independenceStatus([t('savings', 4000000, '2026-11-01')], NOW, undefined, 3000000).years, 0);
  assert.equal(paceText(null), 'Add savings to see your pace.');
  assert.equal(paceText(6.84), 'At your current pace: about 6.8 years.');
  assert.equal(paceText(0.4), 'At your current pace: under a year.');
});

test('bar heights scale to the tallest bar and keep small savings visible', () => {
  assert.deepEqual(barHeights([{ saved: 0 }, { saved: 10 }, { saved: 1000 }]), [0, 4, 100]);
  assert.deepEqual(barHeights([{ saved: 0 }, { saved: 0 }]), [0, 0]);
  assert.equal(hasAnyData([]), false);
  assert.equal(hasAnyData([{ ...t('expense', 1, '2026-11-01'), deletedAt: 'x' }]), false);
  assert.equal(hasAnyData(data), true);
});
