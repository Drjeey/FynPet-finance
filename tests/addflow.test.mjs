import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quickCategories, categoryForDescription, defaultCategory, defaultDescription, parseAmount } from '../public/addflow.js';

const tx = (description, category, type = 'expense', date = '2026-11-01') => ({ description, category, type, date });

test('quick categories start with what this person uses most, then defaults, and keep Other last', () => {
  const rows = [tx('a', 'health'), tx('b', 'health'), tx('c', 'shopping'), tx('d', 'food')];
  assert.deepEqual(quickCategories(rows, 'expense'), ['health', 'shopping', 'food', 'other']);
  assert.deepEqual(quickCategories([], 'expense'), ['food', 'transport', 'utilities', 'other']);
  assert.deepEqual(quickCategories([], 'income'), ['income', 'other']);
  assert.deepEqual(quickCategories([tx('x', 'savings', 'savings')], 'savings'), ['savings', 'other']);
});

test('quick categories ignore other types and deleted rows', () => {
  const rows = [tx('a', 'health', 'income'), { ...tx('b', 'shopping'), deletedAt: '2026-11-02' }];
  assert.deepEqual(quickCategories(rows, 'expense'), ['food', 'transport', 'utilities', 'other']);
});

test('the category comes from the latest transaction with the same description', () => {
  const rows = [tx('Naivas', 'shopping', 'expense', '2026-10-01'), tx(' naivas ', 'food', 'expense', '2026-11-01'), tx('Naivas', 'food', 'income', '2026-11-05')];
  assert.equal(categoryForDescription(rows, 'NAIVAS', 'expense'), 'food');
  assert.equal(categoryForDescription(rows, 'Naivas', 'income'), 'food');
  assert.equal(categoryForDescription(rows, 'Quickmart', 'expense'), null);
  assert.equal(categoryForDescription(rows, 'Na', 'expense'), null);
});

test('defaults', () => {
  assert.equal(defaultCategory('expense'), 'food');
  assert.equal(defaultCategory('income'), 'income');
  assert.equal(defaultCategory('unknown'), 'food');
  assert.equal(defaultDescription('transport', 'expense'), 'Transport');
  assert.equal(defaultDescription('income', 'income'), 'Income');
});

test('amounts accept commas, spaces and decimals, and reject anything else', () => {
  assert.equal(parseAmount('1500'), 1500);
  assert.equal(parseAmount('1,500'), 1500);
  assert.equal(parseAmount('1 200.5'), 1200.5);
  assert.equal(parseAmount('12,50'), 12.5);
  assert.equal(parseAmount('0.125'), 0.13);
  assert.equal(parseAmount('.5'), 0.5);
  for (const bad of ['', '.', 'abc', '12abc', '-5', '1.2.3', null, undefined]) assert.ok(Number.isNaN(parseAmount(bad)), String(bad));
});
