// Pure Analytics helpers: no DOM, storage or network. All amounts are KES.
import { sumKes, monthKey, DEFAULT_RATES } from './calc.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const monthShort = key => MONTHS[Number(key.slice(5, 7)) - 1];
export const monthLong = key => FULL[Number(key.slice(5, 7)) - 1];
export const monthTitle = key => `${monthShort(key)} ${key.slice(0, 4)}`;

// One row per calendar month, oldest first.
// saved = money moved to savings, net = income minus expenses, rate = saved / income (null without income).
export function monthlyRows(transactions, now = new Date(), rates = DEFAULT_RATES, count = 6) {
  const rows = [];
  for (let i = count - 1; i >= 0; i--) {
    const key = monthKey(now, -i), range = { from: `${key}-01`, to: `${key}-31` };
    const income = sumKes(transactions, { type: 'income', ...range }, rates);
    const expenses = sumKes(transactions, { type: 'expense', ...range }, rates);
    const saved = sumKes(transactions, { type: 'savings', ...range }, rates);
    rows.push({ key, label: monthShort(key), title: monthTitle(key), income, expenses, saved, net: income - expenses,
      rate: income > 0 ? Math.round((saved / income) * 1000) / 10 : null, current: i === 0 });
  }
  return rows;
}

export const hasAnyData = transactions => transactions.some(t => !t.deletedAt && !t.deleted_at);

// "You saved KES 18,400 in November, 21% of your income."
export function savingsSentence(row, fmt) {
  if (!row) return '';
  const name = monthLong(row.key);
  if (row.saved <= 0) return `You have not saved anything in ${name} yet.`;
  const rate = row.rate != null ? `, ${Math.round(row.rate)}% of your income` : '';
  return `You saved ${fmt(row.saved)} in ${name}${rate}.`;
}

// Average spending per month over the last three full months; falls back to this month so far.
export function avgMonthlyExpenses(transactions, now = new Date(), rates = DEFAULT_RATES) {
  const past = sumKes(transactions, { type: 'expense', from: `${monthKey(now, -3)}-01`, to: `${monthKey(now, -1)}-31` }, rates) / 3;
  if (past > 0) return past;
  return sumKes(transactions, { type: 'expense', from: `${monthKey(now)}-01`, to: `${monthKey(now)}-31` }, rates);
}

export const clampGoalMonths = value => {
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) && n >= 1 && n <= 24 ? Math.round(n * 10) / 10 : null;
};

// How many months of spending the savings cover, and how that compares with the goal.
export function coverStatus(transactions, now = new Date(), rates = DEFAULT_RATES, goalMonths = 6) {
  const saved = sumKes(transactions, { type: 'savings' }, rates), monthly = avgMonthlyExpenses(transactions, now, rates);
  const months = monthly > 0 ? saved / monthly : 0;
  const goal = clampGoalMonths(goalMonths) ?? 6;
  return { saved, monthly, months, goal, pct: Math.min(100, (months / goal) * 100), tick3: goal > 3 ? (3 / goal) * 100 : null, met: months >= goal };
}

// Progress toward the long-term target, and the pace at the average monthly savings so far.
export function independenceStatus(transactions, now = new Date(), rates = DEFAULT_RATES, target = 3000000) {
  const saved = sumKes(transactions, { type: 'savings' }, rates);
  const active = new Set(transactions.filter(t => !t.deletedAt && !t.deleted_at && t.date).map(t => t.date.slice(0, 7)));
  const avgSaved = active.size ? saved / active.size : 0;
  const goal = Number(target) > 0 ? Number(target) : 3000000;
  const remaining = Math.max(0, goal - saved);
  const years = remaining === 0 ? 0 : avgSaved > 0 ? remaining / (avgSaved * 12) : null;
  return { saved, target: goal, pct: Math.min(100, (saved / goal) * 100), avgSaved, years,
    suggested: Math.round(avgMonthlyExpenses(transactions, now, rates) * 12 * 25) };
}

export const paceText = years => years == null ? 'Add savings to see your pace.' : years === 0 ? 'You have reached your target.'
  : years < 1 ? 'At your current pace: under a year.' : `At your current pace: about ${years.toFixed(1)} years.`;

// Position and size of bars for a simple SVG-free chart (heights are percentages of the tallest bar).
export function barHeights(rows) {
  const max = Math.max(...rows.map(r => r.saved), 0);
  return rows.map(r => (max > 0 ? Math.max(r.saved > 0 ? 4 : 0, Math.round((r.saved / max) * 100)) : 0));
}
