import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDisplay, formatAmount, crossRate, rateLines, decimalsFor } from '../public/display.js';

const RATES = { KES: 1, USD: 130, EUR: 145, GBP: 165, TZS: 0.045, UGX: 0.034 };

test('KES display is unchanged: whole shillings or both cent digits', () => {
  const d = makeDisplay('KES', RATES);
  assert.equal(d.active, false);
  assert.equal(d.money(2880.5), 'KES 2,880.50');
  assert.equal(d.money(12000), 'KES 12,000');
  assert.equal(d.diff(12000, 14880), -2880);
});

test('USD shows two decimals at the saved rate', () => {
  const d = makeDisplay('USD', RATES);
  assert.equal(d.active, true);
  assert.equal(d.money(650), 'USD 5.00');
  assert.equal(d.money(51270.5), 'USD 394.39');
  assert.equal(d.money(12000), 'USD 92.31');
});

test('TZS and UGX show whole numbers', () => {
  assert.equal(decimalsFor('TZS'), 0);
  assert.equal(makeDisplay('TZS', RATES).money(100), 'TZS 2,222');
  assert.equal(makeDisplay('UGX', RATES).money(100), 'UGX 2,941');
});

test('differences come from converted figures so each screen adds up', () => {
  const d = makeDisplay('USD', RATES);
  // Limit KES 1,800 and spent KES 1,450: USD 13.85 - USD 11.15 must read USD 2.70, not 2.69.
  assert.equal(d.conv(1800), 13.85);
  assert.equal(d.conv(1450), 11.15);
  assert.equal(d.diff(1800, 1450), 2.7);
  assert.equal(d.sum([1800, 1450]), 25);
});

test('missing or bad rate falls back to KES', () => {
  assert.equal(makeDisplay('USD', { USD: 0 }).code, 'KES');
  assert.equal(makeDisplay('XYZ', RATES).code, 'KES');
});

test('cross rates are derived from the KES rates', () => {
  assert.equal(Math.round(crossRate('EUR', 'USD', RATES) * 100) / 100, 1.12);
  assert.deepEqual(rateLines('USD', RATES), [{ left: '1 USD', right: 'KES 130' }, { left: '1 EUR', right: 'USD 1.12' }]);
  assert.equal(rateLines('EUR', RATES)[1].left, '1 USD');
  assert.deepEqual(rateLines('KES', RATES), []);
});

test('formatAmount groups thousands', () => {
  assert.equal(formatAmount(23076.923, 'USD'), '23,076.92');
  assert.equal(formatAmount(-5, 'USD'), '-5.00');
});

test('small rates keep their digits', () => {
  assert.deepEqual(rateLines('TZS', RATES)[0], { left: '1 TZS', right: 'KES 0.045' });
});
