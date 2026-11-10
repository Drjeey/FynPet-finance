import { test } from 'node:test';
import assert from 'node:assert/strict';
import config from '../netlify/functions/config.mjs';

test('public config reports AI ready only when every cloud setting is present', async () => {
  const names = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'];
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const read = async () => (await config()).json();
  try {
    for (const name of names) delete process.env[name];
    assert.deepEqual(await read(), { supabaseUrl: null, supabasePublicKey: null, aiEnabled: false });

    process.env.ANTHROPIC_API_KEY = 'server-secret';
    process.env.SUPABASE_URL = 'https://fynpet-test.supabase.co';
    assert.equal((await read()).aiEnabled, false);

    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    assert.deepEqual(await read(), {
      supabaseUrl: 'https://fynpet-test.supabase.co',
      supabasePublicKey: 'sb_publishable_test',
      aiEnabled: true,
    });

    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    process.env.SUPABASE_ANON_KEY = 'legacy-anon';
    assert.equal((await read()).supabasePublicKey, 'legacy-anon');
    assert.equal((await read()).aiEnabled, true);
  } finally {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
});
