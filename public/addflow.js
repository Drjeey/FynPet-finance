// Pure rules for the Add transaction form: no DOM, storage or network.

export const ALL_CATEGORIES = ['food', 'transport', 'utilities', 'entertainment', 'health', 'shopping', 'savings', 'income', 'transfer', 'other'];

// Categories offered for each type. "More" in the form still lists every category.
const FOR_TYPE = {
  expense: ['food', 'transport', 'utilities', 'entertainment', 'health', 'shopping', 'other'],
  income: ['income', 'other'],
  savings: ['savings', 'other'],
  transfer: ['transfer', 'other'],
};
const FALLBACK_QUICK = { expense: ['food', 'transport', 'utilities', 'other'], income: ['income', 'other'], savings: ['savings', 'other'], transfer: ['transfer', 'other'] };

export const defaultCategory = type => (FOR_TYPE[type] || FOR_TYPE.expense)[0];

// Up to four quick-pick categories: the ones this person uses most for this type, padded with sensible defaults.
// "other" always stays available at the end of an expense list.
export function quickCategories(transactions, type, limit = 4) {
  const allowed = FOR_TYPE[type] || FOR_TYPE.expense, counts = new Map();
  for (const tx of transactions) {
    if (tx.type === type && allowed.includes(tx.category) && !tx.deletedAt) counts.set(tx.category, (counts.get(tx.category) || 0) + 1);
  }
  const used = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key).filter(key => key !== 'other');
  const picks = [...used, ...FALLBACK_QUICK[type].filter(key => !used.includes(key) && key !== 'other')];
  const result = picks.slice(0, allowed.includes('other') ? limit - 1 : limit);
  if (allowed.includes('other')) result.push('other');
  return result.slice(0, limit);
}

const normalise = text => String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');

// The category last used for the same description (case and spacing ignored), or null.
export function categoryForDescription(transactions, description, type) {
  const wanted = normalise(description);
  if (wanted.length < 3) return null;
  let best = null;
  for (const tx of transactions) {
    if (tx.deletedAt || tx.type !== type || normalise(tx.description) !== wanted) continue;
    if (!best || (tx.date || '') >= (best.date || '')) best = tx;
  }
  return best ? best.category : null;
}

const LABELS = { food: 'Food & Groceries', transport: 'Transport', utilities: 'Utilities', entertainment: 'Entertainment', health: 'Health', shopping: 'Shopping', savings: 'Savings', income: 'Income', transfer: 'Transfer', other: 'Other' };
// What is saved when the person leaves the description empty.
export const defaultDescription = (category, type) => type === 'income' ? 'Income' : (LABELS[category] || 'Transaction');

// "12,50" and "1 200.5" are accepted. Returns a number rounded to cents, or NaN.
export function parseAmount(text) {
  const cleaned = String(text ?? '').trim().replace(/\s+/g, '').replace(/,(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') return NaN;
  return Math.round(Number(cleaned) * 100) / 100;
}
