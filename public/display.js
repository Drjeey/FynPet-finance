// Display currency: pure helpers, no DOM, storage or network.
// Only what is shown changes. Records keep their entry currency and fixed KES value; budgets and goals stay in KES.
// Conversions use the person's saved rates ("1 X = n KES"), never live rates.
import { DEFAULT_RATES } from './calc.js';

export const DISPLAY_CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'TZS', 'UGX'];
export const CURRENCY_NAMES = { KES: 'Kenyan shilling', USD: 'US dollar', EUR: 'Euro', GBP: 'British pound', TZS: 'Tanzanian shilling', UGX: 'Ugandan shilling' };

// USD, EUR and GBP show two decimals; TZS and UGX whole units. KES keeps its own rule (whole shillings, or both cent digits).
export const decimalsFor = code => (code === 'TZS' || code === 'UGX' ? 0 : 2);

const groupNumber = (value, min, max) => value.toLocaleString('en-KE', { minimumFractionDigits: min, maximumFractionDigits: max });

// Formats a figure that is already in `code` units, without the code.
export function formatAmount(value, code) {
  const n = Number(value) || 0;
  if (code === 'KES') {
    const v = Math.round(n * 100) / 100;
    return groupNumber(v, Number.isInteger(v) ? 0 : 2, 2);
  }
  const d = decimalsFor(code);
  return groupNumber(Math.round(n * 10 ** d) / 10 ** d, d, d);
}

// A rate is usable when it is a number above zero. KES is always 1.
export function rateFor(code, rates = DEFAULT_RATES) {
  if (code === 'KES') return 1;
  const r = Number(rates?.[code]);
  return Number.isFinite(r) && r > 0 ? r : null;
}

// How many `to` one unit of `from` is worth, from the saved KES rates. Returns null when a rate is missing.
export function crossRate(from, to, rates = DEFAULT_RATES) {
  const a = rateFor(from, rates), b = rateFor(to, rates);
  return a && b ? a / b : null;
}

// Builds the display helpers for one render. Unknown codes or missing rates fall back to KES.
export function makeDisplay(code, rates = DEFAULT_RATES) {
  const wanted = DISPLAY_CURRENCIES.includes(code) ? code : 'KES';
  const rate = rateFor(wanted, rates);
  const cur = rate ? wanted : 'KES', r = rate || 1;
  const unit = cur === 'KES' ? 100 : 10 ** decimalsFor(cur);           // smallest shown step: cents, or whole TZS/UGX
  const round = v => Math.round((Number(v) + Number.EPSILON * Math.sign(Number(v) || 0)) * unit) / unit;
  // Every recorded KES total is converted once, to the shown precision.
  const conv = kes => round((Number(kes) || 0) / r);
  // Differences are worked out from converted figures so each screen adds up ("13.85 - 11.15 = 2.70").
  const diff = (aKes, bKes) => Math.round((conv(aKes) - conv(bKes)) * unit) / unit;
  const sum = list => list.reduce((t, kes) => t + Math.round(conv(kes) * unit), 0) / unit;
  const num = value => formatAmount(value, cur);                         // value already converted
  const fmt = value => `${cur} ${num(value)}`;                           // value already converted
  return {
    code: cur, active: cur !== 'KES', rate: r, unit, conv, diff, sum, round, num, fmt,
    money: kes => fmt(conv(kes)),                                        // KES in, shown currency out
  };
}

// A saved rate as typed: small rates such as 0.045 keep their digits (up to 4 decimals).
export const rateText = rate => groupNumber(Number(rate), 0, 4);

// The "worked out from your rates" lines for Settings.
export function rateLines(code, rates = DEFAULT_RATES) {
  if (code === 'KES' || !rateFor(code, rates)) return [];
  const lines = [{ left: `1 ${code}`, right: `KES ${rateText(rateFor(code, rates))}` }];
  const other = code === 'EUR' ? 'USD' : 'EUR', cross = crossRate(other, code, rates);
  if (cross) lines.push({ left: `1 ${other}`, right: `${code} ${groupNumber(cross, 2, cross < 0.1 ? 4 : 2)}` });
  return lines;
}
