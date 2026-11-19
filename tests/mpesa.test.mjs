// Rule-based M-Pesa statement reader. The sample follows Safaricom's statement layout
// (newest first, money out negative, page headers between rows); all names and numbers are made up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatement, splitRows, isoDate, kindOf, counterparty, merchantCategory } from '../public/mpesa.js';

const STATEMENT = `M-PESA STATEMENT
Customer Name: TEST CUSTOMER  Statement Period: 01 Nov 2026 - 09 Nov 2026
SUMMARY
TRANSACTION TYPE PAID IN PAID OUT
TOTAL: 20,000.00 13,248.50
DETAILED STATEMENT
Receipt No. Completion Time Details Transaction Status Paid In Withdrawn Balance
TKA9QW1ZXA 2026-11-09 16:00:12 Merchant Payment to 654321 - UNKNOWN TRADERS COMPLETED -250.00 7,751.50
TKA8QW1ZXA 2026-11-08 15:00:00 Customer Withdrawal At Agent Till 123456 - SHOP MART COMPLETED 1,000.00 8,001.50
Page 1 of 2
Receipt No. Completion Time Details Transaction Status Paid In Withdrawn Balance
TKA7QW1ZXB 2026-11-07 11:11:11 Pay Bill to 400200 - UBER KENYA FAILED -700.00 9,001.50
TKA6QW1ZXA 2026-11-06 10:00:00 Airtime Purchase COMPLETED -100.00 9,001.50
TKA5QW1ZXA 2026-11-05 07:45:00 M-Shwari Deposit COMPLETED -5,000.00 9,101.50
TKA4QW1ZXA 2026-11-04 18:00:00 Customer Transfer of Funds Charge COMPLETED -33.00 14,101.50
TKA4QW1ZXA 2026-11-04 18:00:00 Customer Transfer to 2547******123 - JOHN
DOE COMPLETED -3,000.00 14,134.50
TKA3QW1ZXA 2026-11-03 12:30:00 Merchant Payment to 123456 - NAIVAS WESTLANDS COMPLETED -2,350.50 17,134.50
TKA2QW1ZXA 2026-11-02 09:10:00 Pay Bill Charge COMPLETED -15.00 19,485.00
TKA2QW1ZXA 2026-11-02 09:10:00 Pay Bill to 888880 - KPLC PREPAID Acc. 12345678 COMPLETED -1,500.00 19,500.00
TKA1QW1ZXA 2026-11-01 08:00:00 Funds received from 2547******456 - JANE WANJIKU COMPLETED 20,000.00 21,000.00
Page 2 of 2
Disclaimer: this statement is for information only. 1,234.56 5,678.90`;

test('reads every completed row, skips failed rows and leaves charges out', () => {
  const s = parseStatement(STATEMENT);
  assert.equal(s.recognized, true);
  assert.equal(s.notCompleted, 1);
  assert.deepEqual(s.charges, { count: 2, total: 48 });
  assert.equal(s.unreadable, 0);
  assert.deepEqual(s.rows.map(r => r.receipt), ['TKA1QW1ZXA', 'TKA2QW1ZXA', 'TKA3QW1ZXA', 'TKA4QW1ZXA', 'TKA5QW1ZXA', 'TKA6QW1ZXA', 'TKA8QW1ZXA', 'TKA9QW1ZXA']);
});

test('each row gets a readable description, type and category', () => {
  const byRef = Object.fromEntries(parseStatement(STATEMENT).rows.map(r => [r.receipt, r]));
  assert.deepEqual(byRef.TKA1QW1ZXA, { description: 'From JANE WANJIKU', amount: 20000, type: 'income', category: 'income', date: '2026-11-01', receipt: 'TKA1QW1ZXA' });
  assert.deepEqual([byRef.TKA2QW1ZXA.description, byRef.TKA2QW1ZXA.type, byRef.TKA2QW1ZXA.category], ['KPLC PREPAID', 'expense', 'utilities']);
  assert.deepEqual([byRef.TKA3QW1ZXA.description, byRef.TKA3QW1ZXA.category, byRef.TKA3QW1ZXA.amount], ['NAIVAS WESTLANDS', 'food', 2350.5]);
  assert.deepEqual([byRef.TKA4QW1ZXA.description, byRef.TKA4QW1ZXA.type], ['To JOHN DOE', 'transfer']);   // details wrapped onto two lines
  assert.deepEqual([byRef.TKA5QW1ZXA.description, byRef.TKA5QW1ZXA.type, byRef.TKA5QW1ZXA.category], ['To M-Shwari', 'savings', 'savings']);
  assert.deepEqual([byRef.TKA6QW1ZXA.description, byRef.TKA6QW1ZXA.category], ['Airtime', 'utilities']);
  assert.deepEqual([byRef.TKA9QW1ZXA.description, byRef.TKA9QW1ZXA.category], ['UNKNOWN TRADERS', 'other']);   // goes to "Needs your check"
});

test('a withdrawal printed without a minus sign is read as money out from the running balance', () => {
  const row = parseStatement(STATEMENT).rows.find(r => r.receipt === 'TKA8QW1ZXA');
  assert.deepEqual([row.description, row.type, row.amount], ['Cash withdrawal - SHOP MART', 'transfer', 1000]);
});

test('every row is checked against the running balance', () => {
  assert.deepEqual(parseStatement(STATEMENT).balance, { checked: 9, mismatches: 0 });
  const broken = STATEMENT.replace('COMPLETED -2,350.50 17,134.50', 'COMPLETED -2,305.50 17,134.50');
  assert.equal(parseStatement(broken).balance.mismatches, 1);   // only the misread row disagrees with its printed balance
});

test('numbers in a footer after the last row are not read as its amounts', () => {
  const last = parseStatement(STATEMENT).rows.find(r => r.receipt === 'TKA1QW1ZXA');
  assert.equal(last.amount, 20000);
  assert.equal(splitRows(STATEMENT).rows.at(-1).amounts.length, 2);
});

test('text that is not a statement is not recognised, so the app falls back to Fyn AI', () => {
  assert.equal(parseStatement('Hello world 2026-11-01 1,000.00').recognized, false);
  assert.equal(parseStatement('').recognized, false);
  const mostlyBroken = 'ABC1234567 2026-11-01 10:00:00 Something\nABC1234568 2026-11-02 10:00:00 Else\nABC1234569 2026-11-03 10:00:00 Pay Bill to 1 - X COMPLETED -5.00 10.00';
  assert.equal(parseStatement(mostlyBroken).recognized, false);
});

test('day-first dates are accepted and impossible dates rejected', () => {
  assert.equal(isoDate('09/11/2026'), '2026-11-09');
  assert.equal(isoDate('2026-11-09'), '2026-11-09');
  assert.equal(isoDate('2026-02-30'), null);
  const { rows } = splitRows('QWE1234567 09/11/2026 08:05 Airtime Purchase Completed -50.00 950.00');
  assert.equal(rows[0].date, '2026-11-09');
});

test('wording and merchant rules', () => {
  assert.equal(kindOf('Customer Transfer of Funds Charge'), 'charge');
  assert.equal(kindOf('M-Shwari Withdraw'), 'savings');
  assert.equal(kindOf('OverDraft of Credit Party'), 'fuliza');
  assert.equal(kindOf('Business Payment from 123456 - ACME LTD'), 'received');
  assert.equal(merchantCategory('BOLT TECHNOLOGY'), 'transport');
  assert.equal(merchantCategory('GOODLIFE PHARMACY'), 'health');
  assert.equal(merchantCategory('Some shop'), null);
  assert.equal(counterparty('Customer Transfer to 0722***123 - MARY A'), 'MARY A');
});

test('M-Shwari withdrawals come back as transfers, not income', () => {
  const text = 'QWE1234567 2026-11-01 10:00:00 M-Shwari Withdraw COMPLETED 2,000.00 2,500.00\nQWE1234568 2026-11-02 10:00:00 Airtime Purchase COMPLETED -100.00 2,400.00';
  const [first] = parseStatement(text).rows;
  assert.deepEqual([first.description, first.type, first.category], ['From M-Shwari', 'transfer', 'transfer']);
});
