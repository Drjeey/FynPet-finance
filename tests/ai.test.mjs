// Tests for netlify/functions/ai.mjs against local mock Anthropic + Supabase servers.
// No network calls leave the machine and no Anthropic credits are used.
// Run: npm test
import { test, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const usage = new Map();
mock.module('@netlify/blobs', {
  namedExports: {
    getStore: () => ({
      get: async (k) => usage.get(k) ?? null,
      set: async (k, v) => { usage.set(k, v); },
    }),
  },
});

let lastAnthropic = null;     // { url, headers, body } of the last request to the mock Anthropic API
let anthropicReply = null;    // message object the mock returns

const server = http.createServer(async (req, res) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (req.url.startsWith('/auth/v1/user')) {
    const ok = req.headers.authorization === 'Bearer good-token';
    res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(ok ? { id: 'user-1' } : { msg: 'invalid' }));
  }
  if (req.url.startsWith('/v1/messages')) {
    lastAnthropic = { url: req.url, headers: req.headers, body: JSON.parse(raw) };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(anthropicReply));
  }
  res.writeHead(404); res.end();
});

let handler;
before(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  Object.assign(process.env, {
    ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: base,
    SUPABASE_URL: base, SUPABASE_ANON_KEY: 'anon', AI_DAILY_LIMIT: '3',
  });
  handler = (await import('../netlify/functions/ai.mjs')).default;
});
after(() => server.close());

const message = (text, stop_reason = 'end_turn') => ({
  id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
  content: [{ type: 'text', text }], stop_reason, usage: { input_tokens: 1, output_tokens: 1 },
});
const call = (body, token = 'good-token') => handler(new Request('http://localhost/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
}));

test('rejects requests without a valid Supabase session', async () => {
  assert.equal((await call({ mode: 'advisor', message: 'hi' }, null)).status, 401);
  assert.equal((await call({ mode: 'advisor', message: 'hi' }, 'bad-token')).status, 401);
});

test('advisor: server builds the prompt, redacts phone numbers, uses fallbacks', async () => {
  usage.clear();
  anthropicReply = message('Spend less on **transport**.');
  const res = await call({ mode: 'advisor', message: 'How am I doing?', context: 'Sent to 0712 345 678 KES 500' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).text, 'Spend less on **transport**.');
  const { body, headers } = lastAnthropic;
  assert.equal(body.model, 'claude-opus-5-5');
  assert.equal(body.fallbacks, 'default');
  assert.match(headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
  assert.equal(body.max_tokens, 4000);
  assert.match(body.system, /You are Fyn/);
  assert.match(body.messages[0].content, /\[phone\]/);
  assert.doesNotMatch(body.messages[0].content, /0712/);
});

test('import: uses a JSON schema and drops invalid rows', async () => {
  usage.clear();
  anthropicReply = message(JSON.stringify({ transactions: [
    { description: 'Naivas Westlands', amount: 1250.5, type: 'expense', category: 'food', date: '2026-10-01', receipt: 'SGH4XK2LMN' },
    { description: 'Bad date', amount: 10, type: 'expense', category: 'food', date: '01/10/2026', receipt: '' },
    { description: 'Negative', amount: -5, type: 'expense', category: 'food', date: '2026-10-01', receipt: '' },
  ] }));
  const res = await call({ mode: 'import', text: 'SGH4XK2LMN 2026-10-01 Naivas 1,250.50' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.transactions.length, 1);
  assert.equal(data.rejected, 2);
  assert.equal(data.transactions[0].receipt, 'SGH4XK2LMN');
  assert.equal(lastAnthropic.body.output_config.format.type, 'json_schema');
  assert.equal(lastAnthropic.body.max_tokens, 16000);
});

test('import: reports truncated output instead of silently returning nothing', async () => {
  usage.clear();
  anthropicReply = message('{"transactions": [', 'max_tokens');
  assert.equal((await call({ mode: 'import', text: 'x' })).status, 422);
});

test('rejects oversized input before calling Anthropic', async () => {
  usage.clear();
  lastAnthropic = null;
  assert.equal((await call({ mode: 'import', text: 'x'.repeat(9000) })).status, 413);
  assert.equal(lastAnthropic, null);
});

test('enforces the per-user daily quota', async () => {
  usage.clear();
  anthropicReply = message('ok');
  for (let i = 0; i < 3; i++) assert.equal((await call({ mode: 'advisor', message: 'q' })).status, 200);
  assert.equal((await call({ mode: 'advisor', message: 'q' })).status, 429);
});
