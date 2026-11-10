// Pure finance calculations: no browser state, storage, or network access.
// These defaults are editable estimates, not a live exchange-rate feed.
export const DEFAULT_RATES = Object.freeze({ KES: 1, USD: 130, EUR: 145, GBP: 165, TZS: 0.045, UGX: 0.034 });
const cents = value => Math.round((Number(value) + Number.EPSILON) * 100);

export function convertToKes(amount, currency = 'KES', rates = DEFAULT_RATES) {
  const rate = currency === 'KES' ? 1 : Number(rates[currency] ?? DEFAULT_RATES[currency]);
  if (!Number.isFinite(Number(amount)) || !Number.isFinite(rate) || rate <= 0) {
    throw new RangeError('Amount and exchange rate must be valid numbers.');
  }
  return cents(Number(amount) * rate) / 100;
}

// A saved conversion preserves historical totals when settings change later.
export function amountKes(tx, rates = DEFAULT_RATES) {
  const saved = tx.amountKes ?? tx.amount_kes;
  return saved != null && Number.isFinite(Number(saved)) && Number(saved) >= 0
    ? cents(saved) / 100 : convertToKes(tx.amount, tx.currency || 'KES', rates);
}

export function sumKes(transactions, { type, category, from, to } = {}, rates = DEFAULT_RATES) {
  return transactions.reduce((total, tx) => {
    if (tx.deletedAt || tx.deleted_at || (type && tx.type !== type) ||
        (category && tx.category !== category) || (from && tx.date < from) || (to && tx.date > to)) return total;
    return total + cents(amountKes(tx, rates));
  }, 0) / 100;
}

export function categoryTotals(transactions, options = {}, rates = DEFAULT_RATES) {
  const categories = [...new Set(transactions.map(tx => tx.category))];
  return Object.fromEntries(categories.map(category => [category, sumKes(transactions, { ...options, category }, rates)])
    .filter(([, total]) => total > 0));
}

export function nairobiDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function monthKey(now = new Date(), offset = 0) {
  const [year, month] = nairobiDate(now).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

function monthEnd(month) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10);
}

// Month and 3m mean calendar periods, including the current calendar month.
export function periodBounds(period = 'month', now = new Date(), previous = false) {
  if (period === 'week') {
    const to = shiftDate(nairobiDate(now), previous ? -7 : 0);
    return { from: shiftDate(to, -6), to };
  }
  const count = period === '3m' ? 3 : 1;
  const last = monthKey(now, previous ? -count : 0);
  return { from: `${monthKey(now, (previous ? -count : 0) - count + 1)}-01`, to: monthEnd(last) };
}

export function periodStats(transactions, period = 'month', now = new Date(), rates = DEFAULT_RATES) {
  const current = periodBounds(period, now), previous = periodBounds(period, now, true);
  const total = (type, bounds) => sumKes(transactions, { type, ...bounds }, rates);
  const income = total('income', current), exp = total('expense', current), sav = total('savings', current);
  const pInc = total('income', previous), pExp = total('expense', previous);
  return {
    income, exp, sav, totalSaved: total('savings', {}),
    savingsRate: income > 0 ? (sav / income * 100).toFixed(1) : '0.0',
    incChg: pInc > 0 ? ((income - pInc) / pInc * 100).toFixed(1) : '0',
    expChg: pExp > 0 ? ((exp - pExp) / pExp * 100).toFixed(1) : '0',
    txCount: transactions.filter(tx => !tx.deletedAt && !tx.deleted_at && tx.date >= current.from && tx.date <= current.to).length,
  };
}

export function chartSeries(transactions, period = 'month', now = new Date(), rates = DEFAULT_RATES) {
  const bounds = periodBounds(period, now);
  const buckets = [];
  if (period === 'week') {
    for (let i = 0; i < 7; i++) {
      const date = shiftDate(bounds.from, i);
      const label = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-KE', { weekday: 'short', timeZone: 'Africa/Nairobi' });
      buckets.push({ label, from: date, to: date });
    }
  } else if (period === '3m') {
    for (let i = -2; i <= 0; i++) {
      const month = monthKey(now, i);
      const label = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-KE', { month: 'short', timeZone: 'Africa/Nairobi' });
      buckets.push({ label, from: `${month}-01`, to: monthEnd(month) });
    }
  } else {
    const days = Number(bounds.to.slice(8)), size = Math.ceil(days / 8);
    for (let day = 1; day <= days; day += size) {
      const end = Math.min(day + size - 1, days), prefix = bounds.from.slice(0, 8);
      buckets.push({ label: `${day}–${end}`, from: prefix + String(day).padStart(2, '0'), to: prefix + String(end).padStart(2, '0') });
    }
  }
  return {
    labels: buckets.map(bucket => bucket.label),
    income: buckets.map(bucket => sumKes(transactions, { ...bucket, type: 'income' }, rates)),
    expenses: buckets.map(bucket => sumKes(transactions, { ...bucket, type: 'expense' }, rates)),
  };
}

// Use the last three completed months, including months with no expenses.
// A partial current month must not make the emergency fund look larger.
export function emergencyFundMonths(transactions, now = new Date(), rates = DEFAULT_RATES) {
  const expenses = sumKes(transactions, {
    type: 'expense', from: `${monthKey(now, -3)}-01`, to: monthEnd(monthKey(now, -1)),
  }, rates);
  const savings = sumKes(transactions, { type: 'savings' }, rates);
  return expenses > 0 ? savings / (expenses / 3) : 0;
}
