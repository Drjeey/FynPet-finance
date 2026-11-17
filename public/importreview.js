// Pure rules for the M-Pesa import review: no DOM, storage or network.
// Rows look like { description, amount, type, category, date, receipt } (validated by netlify/functions/ai.mjs).

const norm = text => String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
const cents = value => Math.round(Number(value) * 100);

// Same day, same amount, same first 35 characters of the description.
export const rowKey = row => `${row.date}|${cents(row.amount)}|${norm(row.description).slice(0, 35)}`;

// Split statement text at line breaks so no transaction is cut in half.
export function splitChunks(text, size = 3500) {
  const chunks = []; let rest = String(text || '').trim();
  while (rest.length > 0) {
    if (rest.length <= size) { chunks.push(rest); break; }
    const lastBreak = rest.lastIndexOf('\n', size), end = lastBreak > size * 0.5 ? lastBreak : size;
    chunks.push(rest.slice(0, end)); rest = rest.slice(end).trimStart();
  }
  return chunks;
}

// Drop repeats inside the file itself: same receipt, or (without a receipt) same day, amount and description.
export function dedupeWithinFile(rows) {
  const seen = new Set(), kept = [];
  for (const row of rows) {
    const key = row.receipt || rowKey(row);
    if (seen.has(key)) continue;
    seen.add(key); kept.push(row);
  }
  return { rows: kept, repeats: rows.length - kept.length };
}

export const inRange = (date, from, to) => (!from || date >= from) && (!to || date <= to);

// Sort parsed rows into: look good, need a check, already in FynPet, and outside the chosen dates.
//  - same receipt as a saved transaction: already in FynPet (skipped)
//  - same day + amount + description as a saved transaction (e.g. typed in by hand): needs a check, left out by default
//  - category "other": needs a check, kept by default so the person can pick a category or skip it
export function classifyRows(rows, existing, { from = '', to = '' } = {}) {
  const live = existing.filter(tx => !tx.deletedAt);
  const receipts = new Set(live.map(tx => tx.externalRef).filter(Boolean));
  const keys = new Set(live.map(tx => rowKey(tx)));
  const out = { fresh: [], check: [], duplicates: [], outside: [] };
  rows.forEach((row, index) => {
    const item = { ...row, key: index };
    if (!inRange(row.date, from, to)) out.outside.push(item);
    else if (row.receipt && receipts.has(row.receipt)) out.duplicates.push({ ...item, include: false });
    else if (keys.has(rowKey(row))) out.check.push({ ...item, reason: 'possible-duplicate', include: false });
    else if (row.category === 'other') out.check.push({ ...item, reason: 'category', include: true });
    else out.fresh.push({ ...item, include: true });
  });
  return out;
}

// Find a "Total  <paid in>  <paid out>" line in the statement text. Returns null when there is none.
// NOT TESTED against real Safaricom statements: when nothing matches, the app says it could not check.
export function statementTotals(text) {
  const match = String(text || '').match(/^[ \t]*total[^\n\d-]{0,40}(-?[\d,]+\.\d{2})[ \t]+(-?[\d,]+\.\d{2})[ \t]*$/im);
  if (!match) return null;
  const parse = value => Math.abs(Number(value.replace(/,/g, '')));
  return { paidIn: parse(match[1]), paidOut: parse(match[2]) };
}

const total = rows => rows.reduce((sum, row) => sum + cents(row.amount), 0) / 100;

// Compare what we read with the statement's own totals. `rows` is everything we read, before any filtering.
export function reconcile(rows, totals, { rangeSet = false } = {}) {
  const moneyIn = total(rows.filter(row => row.type === 'income'));
  const moneyOut = total(rows.filter(row => row.type !== 'income'));
  if (rangeSet) return { status: 'skipped', reason: 'range', moneyIn, moneyOut };
  if (!totals) return { status: 'unavailable', moneyIn, moneyOut };
  const diffIn = Math.round((moneyIn - totals.paidIn) * 100) / 100, diffOut = Math.round((moneyOut - totals.paidOut) * 100) / 100;
  const ok = Math.abs(diffIn) <= 1 && Math.abs(diffOut) <= 1;
  return { status: ok ? 'match' : 'differs', moneyIn, moneyOut, statementIn: totals.paidIn, statementOut: totals.paidOut, diffIn, diffOut };
}

// success: everything we read was saved. partial: some rows or parts could not be read. failed: nothing saved because of an error.
export function importStatus({ saved, unreadRows = 0, failedParts = 0, error = null }) {
  if (error && saved === 0) return 'failed';
  return unreadRows > 0 || failedParts > 0 ? 'partial' : 'success';
}

// Plain-English reason for a failed import.
export function failureReason(error) {
  const text = String(error?.message || error || '');
  if (error?.name === 'PasswordException' || /password/i.test(text)) return { code: 'password', short: 'Wrong password', text: 'The password did not unlock the PDF.', next: 'Check the password Safaricom gave you (usually your National ID number) and try again.' };
  if (/no text|scanned/i.test(text)) return { code: 'no-text', short: 'No text found', text: 'No text was found in the PDF. Scanned statements are not supported.', next: 'Download the statement again from Safaricom as a PDF and try again.' };
  if (/sign in/i.test(text)) return { code: 'signin', short: 'Not signed in', text: 'You need to sign in to read statements with Fyn AI.', next: 'Sign in, then try again. Your PDF stays on this device.' };
  if (/agree/i.test(text)) return { code: 'consent', short: 'AI not agreed', text: 'AI features are off until you agree to the disclosure.', next: 'Choose "Agree and continue" when asked, or add transactions by hand.' };
  if (/limit/i.test(text)) return { code: 'limit', short: 'Daily limit', text: "You've used today's AI quota.", next: 'It resets at midnight UTC. Try again tomorrow.' };
  if (/no transactions/i.test(text)) return { code: 'empty', short: 'No transactions found', text: 'No transactions were found in this statement.', next: 'Check that you chose the full M-Pesa statement PDF, then try again.' };
  return { code: 'ai', short: 'AI unavailable', text: 'Fyn AI could not read this statement right now.', next: 'Try again in a minute. If it keeps failing, add the transactions by hand.' };
}
