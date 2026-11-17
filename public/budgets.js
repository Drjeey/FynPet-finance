// Pure rules for the Budgets page: no DOM, storage or network. Budgets are monthly, one per category.
import { sumKes, periodBounds, daysLeftInMonth, DEFAULT_RATES } from './calc.js';

// Spending categories a budget can track. Income, transfers and savings are not "spent", so they are not offered.
export const BUDGET_CATEGORIES = ['food', 'transport', 'utilities', 'entertainment', 'health', 'shopping', 'other'];

const round2 = value => Math.round(value * 100) / 100;

// One row per budget for the current calendar month (Nairobi).
export function budgetRows(budgets, transactions, now = new Date(), rates = DEFAULT_RATES) {
  const bounds = periodBounds('month', now), days = daysLeftInMonth(now);
  return budgets.map(budget => {
    const spent = sumKes(transactions, { type: 'expense', category: budget.category, ...bounds }, rates);
    const left = round2(budget.limit - spent), over = spent > budget.limit;
    const pct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    return {
      budget, spent, left, over, pct,
      perDay: !over && left > 0 ? Math.round(left / days) : 0,
      overPct: over ? Math.round(((spent - budget.limit) / budget.limit) * 100) : 0,
      tone: over ? 'bad' : pct >= 80 ? 'warn' : 'ok',
    };
  });
}

// The one-line summary at the top of the page.
export function budgetSummary(rows, now = new Date()) {
  const limit = rows.reduce((sum, row) => sum + row.budget.limit, 0), spent = rows.reduce((sum, row) => sum + row.spent, 0);
  const left = round2(limit - spent);
  return { count: rows.length, limit, spent, left, over: left < 0, overCount: rows.filter(row => row.over).length,
    pctUsed: limit > 0 ? Math.round((spent / limit) * 100) : 0, perDay: left > 0 ? Math.round(left / daysLeftInMonth(now)) : 0 };
}

// What was spent in a category during the previous calendar month.
export function lastMonthSpent(transactions, category, now = new Date(), rates = DEFAULT_RATES) {
  return sumKes(transactions, { type: 'expense', category, ...periodBounds('month', now, true) }, rates);
}

// Categories for the new/edit dialog; ones that already have a budget are marked (except the one being edited).
export function categoryChoices(budgets, editingId = null) {
  const taken = new Set(budgets.filter(b => b.id !== editingId).map(b => b.category));
  const keys = [...BUDGET_CATEGORIES];
  const current = budgets.find(b => b.id === editingId)?.category;
  if (current && !keys.includes(current)) keys.push(current);   // an older budget in a category we no longer offer stays editable
  return keys.map(key => ({ key, taken: taken.has(key) }));
}

// A round next limit (a multiple of 500) that is above what was spent.
export const suggestRaise = spent => (Math.floor(spent / 500) + 1) * 500;
