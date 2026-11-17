// Pure rules for the Transactions page: filtering, ordering and grouping. No DOM, storage or network.
import { periodBounds, shiftDate } from './calc.js';

const norm = text => String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Newest first; for the same day, the one added last comes first.
export function sortTransactions(rows) {
  return [...rows].sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

// filters: { type: 'all'|'income'|'expense'|'savings'|'transfer', query, categories: [], from, to } (dates are YYYY-MM-DD)
export function filterTransactions(rows, { type = 'all', query = '', categories = [], from = '', to = '' } = {}) {
  const q = norm(query);
  return sortTransactions(rows.filter(tx => {
    if (tx.deletedAt) return false;
    if (type !== 'all' && tx.type !== type) return false;
    if (categories.length && !categories.includes(tx.category)) return false;
    if (from && tx.date < from) return false;
    if (to && tx.date > to) return false;
    return !q || norm(tx.description).includes(q) || norm(tx.category).includes(q) || norm(tx.notes).includes(q);
  }));
}

// How many filters (beyond the type chips and the search box) are applied.
export const countFilters = ({ categories = [], from = '', to = '' } = {}) => categories.length + (from || to ? 1 : 0);

// Quick date ranges for the filter panel, in Nairobi calendar months (the 3-month range includes the current month).
export function quickRange(name, now = new Date()) {
  if (name === 'last-month') return periodBounds('month', now, true);
  if (name === '3m') return periodBounds('3m', now);
  return periodBounds('month', now);
}

// Group already-sorted rows by day. `rel` is 'today', 'yesterday' or null; the caller formats the labels.
export function groupByDate(rows, today) {
  const yesterday = shiftDate(today, -1), groups = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last && last.date === row.date) last.rows.push(row);
    else groups.push({ date: row.date, rel: row.date === today ? 'today' : row.date === yesterday ? 'yesterday' : null, rows: [row] });
  }
  return groups;
}
