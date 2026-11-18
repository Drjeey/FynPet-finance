import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEmail, passwordError, authMessage, unsyncedCount, changesText, validateRates, accountView } from '../public/settings.js';

test('email check', () => {
  assert.equal(isEmail('wanjiru@example.com'), true);
  assert.equal(isEmail(' a@b.co '), true);
  for (const bad of ['', 'abc', 'a@b', 'a@@b.com', 'a b@c.com', null]) assert.equal(isEmail(bad), false);
});

test('password rules differ for sign in and sign up', () => {
  assert.equal(passwordError('', 'in'), 'Enter your password.');
  assert.equal(passwordError('short', 'in'), '');
  assert.equal(passwordError('', 'up'), 'Choose a password.');
  assert.equal(passwordError('1234567', 'up'), 'Use at least 8 characters.');
  assert.equal(passwordError('12345678', 'up'), '');
});

test('authentication errors become plain words', () => {
  assert.equal(authMessage({ message: 'Invalid login credentials' }).field, 'password');
  assert.match(authMessage({ message: 'Email not confirmed' }).message, /Confirm your email/);
  assert.match(authMessage({ message: 'User already registered' }).message, /already exists/);
  assert.match(authMessage({ message: 'Email rate limit exceeded' }).message, /Too many/);
  assert.match(authMessage(new TypeError('Failed to fetch')).message, /Could not reach/);
  assert.equal(authMessage({ message: 'boom 500' }).message, 'Something went wrong. Please try again.');
});

test('unsynced changes count dirty rows, pending deletes, and everything before the first sync', () => {
  const base = { transactions: [{ dirty: true }, {}, { dirty: true }], budgets: [{ dirty: true }, {}], tombstones: [{}] };
  assert.equal(unsyncedCount({ ...base, signedIn: false }), 0);
  assert.equal(unsyncedCount({ ...base, signedIn: true, lastSyncAt: '2026-11-17T10:00:00Z' }), 4);
  assert.equal(unsyncedCount({ ...base, signedIn: true }), 6);
  assert.equal(changesText(1), '1 change has not reached your account.');
  assert.equal(changesText(3), '3 changes have not reached your account.');
});

test('rates must all be greater than zero', () => {
  const ok = validateRates({ USD: '130', EUR: '145', GBP: '165', TZS: '0.045', UGX: '0.034' });
  assert.equal(ok.ok, true); assert.equal(ok.values.TZS, 0.045);
  const bad = validateRates({ USD: '0', EUR: '', GBP: 'abc', TZS: '-1', UGX: '1' });
  assert.deepEqual(Object.keys(bad.errors).sort(), ['EUR', 'GBP', 'TZS', 'USD']);
  assert.equal(bad.ok, false);
  assert.equal(validateRates({ USD: '1,300', EUR: '1', GBP: '1', TZS: '1', UGX: '1' }).values.USD, 1300);
});

test('account view covers the five states', () => {
  assert.equal(accountView({ signedIn: false }).state, 'local');
  assert.equal(accountView({ signedIn: false, available: false }).state, 'unavailable');
  assert.equal(accountView({ signedIn: true, email: 'a@b.co', dot: 'connected', label: 'Synced 7:36 PM' }).headline, 'Synced 7:36 PM');
  assert.equal(accountView({ signedIn: true, dot: 'error' }).state, 'problem');
  assert.equal(accountView({ signedIn: true, dot: 'syncing' }).state, 'syncing');
  assert.equal(accountView({ signedIn: true, dot: 'connected', label: 'Ready' }).headline, 'Signed in');
});
