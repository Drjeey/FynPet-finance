// Pure helpers for Settings and account dialogs: no DOM, storage or network.

export const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value ?? '').trim());

// Returns an inline error message, or '' when the password is acceptable.
export function passwordError(password, mode) {
  const value = String(password ?? '');
  if (!value) return mode === 'up' ? 'Choose a password.' : 'Enter your password.';
  if (mode === 'up' && value.length < 8) return 'Use at least 8 characters.';
  return '';
}

// Turns an authentication error into plain words. `field` says where to show it ('email', 'password' or '' for the box).
export function authMessage(error) {
  const text = String(error?.message ?? error ?? '').toLowerCase();
  if (/invalid login|invalid credentials|wrong password/.test(text)) return { field: 'password', message: 'That email or password is not right. Check them and try again.' };
  if (/not confirmed/.test(text)) return { field: '', message: 'Confirm your email first. Open the link we sent you, then sign in.' };
  if (/already (registered|exists)/.test(text)) return { field: '', message: 'An account with this email already exists. Try signing in.' };
  if (/rate limit|too many/.test(text)) return { field: '', message: 'Too many attempts. Wait a minute and try again.' };
  if (/network|failed to fetch|fetch failed|offline/.test(text)) return { field: '', message: 'Could not reach the server. Check your connection and try again.' };
  if (/weak|password should/.test(text)) return { field: 'password', message: 'Use at least 8 characters.' };
  return { field: '', message: 'Something went wrong. Please try again.' };
}

// How many changes have not reached the account yet.
export function unsyncedCount({ signedIn, transactions = [], budgets = [], tombstones = [], lastSyncAt = null }) {
  if (!signedIn) return 0;
  if (!lastSyncAt) return transactions.length + budgets.length + tombstones.length;
  return transactions.filter(t => t.dirty).length + budgets.filter(b => b.dirty).length + tombstones.length;
}

export const changesText = n => `${n} change${n === 1 ? ' has' : 's have'} not reached your account.`;

// Exchange rates: every rate must be a number above zero. Returns { values, errors } keyed by currency.
export const RATE_CURRENCIES = ['USD', 'EUR', 'GBP', 'TZS', 'UGX'];
export function validateRates(inputs) {
  const values = {}, errors = {};
  for (const code of RATE_CURRENCIES) {
    const n = Number(String(inputs[code] ?? '').replace(/,/g, '').trim());
    if (!String(inputs[code] ?? '').trim() || !Number.isFinite(n) || n <= 0) errors[code] = 'Enter a rate greater than zero.';
    else values[code] = n;
  }
  return { values, errors, ok: Object.keys(errors).length === 0 };
}

// Account card content from plain facts, so the page and tests agree.
export function accountView({ signedIn, email = '', dot = 'local', label = '', available = true }) {
  if (!available) return { state: 'unavailable', headline: 'Sign-in is not available here', note: 'Your records are saved on this device.' };
  if (!signedIn) return { state: 'local', headline: 'Saved on this device only', note: 'Sign in to keep your records on your account and open them on another device.' };
  if (dot === 'error') return { state: 'problem', headline: 'Could not sync. Your records are safe on this device.', email };
  if (dot === 'syncing') return { state: 'syncing', headline: 'Syncing...', email };
  return { state: 'synced', headline: label && /sync/i.test(label) ? label : 'Signed in', email };
}
