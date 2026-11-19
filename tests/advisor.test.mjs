import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAiError, splitNextStep, greeting, insightRows, shortDate, panelState } from '../public/advisor.js';

test('errors are sorted into the right panel state', () => {
  const cases = {
    'Sign in to use AI features.': 'signin',
    'AI features are off until you agree to send data to Claude.': 'consent',
    'Daily AI limit reached (60 requests). It resets at midnight UTC.': 'limit',
    'Too many requests — wait a minute and try again.': 'busy',
    'AI request failed (503).': 'busy',
    'Could not reach the server. Check your connection and try again.': 'network',
    'Failed to fetch': 'network',
    'Something odd': 'other',
  };
  for (const [message, kind] of Object.entries(cases)) assert.equal(classifyAiError({ message }), kind, message);
  assert.equal(classifyAiError(undefined), 'other');
});

test('a closing Next step line is split off', () => {
  const r = splitNextStep('You spent KES 41,120.\nEntertainment is over.\n\n**Next step:** raise the limit.');
  assert.equal(r.body, 'You spent KES 41,120.\nEntertainment is over.');
  assert.equal(r.next, 'raise the limit.');
  assert.equal(splitNextStep('Next step: pause it').next, 'pause it');
  assert.deepEqual(splitNextStep('No step here.'), { body: 'No step here.', next: '' });
  assert.equal(splitNextStep('Next step:').next, '');            // empty line is not a step
  assert.equal(splitNextStep('Next step: early\nthen more text').next, '');   // only a closing line counts
});

test('greeting uses the name or a neutral fallback', () => {
  assert.equal(greeting('Wanjiru'), 'Hi Wanjiru. Ask me about your spending, budgets or savings.');
  assert.match(greeting(''), /^Hi there\./);
});

test('insight rows give a status in words', () => {
  const fmt = n => `KES ${n.toLocaleString('en-US')}`;
  const rows = insightRows({ savingsRate: '21.0', emergencyMonths: '1.8', netCashFlow: 26800, independencePct: '3.8%' }, fmt);
  assert.deepEqual(rows.map(r => r.title), ['Savings rate', 'Emergency fund', 'Net cash flow', 'Independence progress']);
  assert.deepEqual(rows.map(r => r.figure), ['21%', '1.8 months', '+KES 26,800', '3.8%']);
  assert.deepEqual(rows.map(r => r.word), ['Good', 'Low, aim for 3', 'Positive', 'Early days']);
  const bad = insightRows({ savingsRate: 4, emergencyMonths: 7, netCashFlow: -500, independencePct: 60 }, fmt);
  assert.deepEqual(bad.map(r => r.word), ['Low, aim for 20%', 'Strong', 'Negative', 'Well on the way']);
  assert.equal(bad[2].figure, '-KES 500');
  assert.equal(bad[2].tone, 'bad');
});

test('short dates and panel states', () => {
  assert.equal(shortDate('2026-11-17T21:30:00Z'), '17 Nov');
  assert.equal(shortDate('nope'), '');
  assert.equal(panelState({ signedIn: false, hasData: true, limited: false }), 'signin');
  assert.equal(panelState({ signedIn: true, hasData: false, limited: false }), 'nodata');
  assert.equal(panelState({ signedIn: true, hasData: true, limited: true }), 'limit');
  assert.equal(panelState({ signedIn: true, hasData: true, limited: false }), '');
});
