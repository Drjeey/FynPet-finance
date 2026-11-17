import { getStore } from '@netlify/blobs';
import { env, supabasePublicKey } from './http.mjs';

// Verifies the caller's Supabase access token by asking Supabase Auth who it belongs to.
// Returns the user object, or null when the token is missing, expired or invalid.
export async function getUser(req) {
  const match = (req.headers.get('authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;

  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: supabasePublicKey(), Authorization: `Bearer ${match[1]}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ? user : null;
}

// Per-user daily request cap, stored in Netlify Blobs. Not atomic: two requests racing
// at the limit may both pass, which is acceptable for a cost guard.
// `cost` lets cheap calls weigh less: one statement chunk costs a fifth of an advisor question,
// so importing a long statement does not use up the person's daily questions.
export async function consumeDailyQuota(userId, cost = 1) {
  const limit = parseInt(env('AI_DAILY_LIMIT', '60'), 10);
  const store = getStore('ai-usage');
  const key = `${new Date().toISOString().slice(0, 10)}/${userId}`;
  const used = parseFloat((await store.get(key)) || '0') || 0;
  if (used + cost > limit + 1e-9) return { ok: false, limit };
  const next = Math.round((used + cost) * 100) / 100;
  await store.set(key, String(next));
  return { ok: true, limit, used: next };
}
