import { getStore } from '@netlify/blobs';
import { env } from './http.mjs';

// Verifies the caller's Supabase access token by asking Supabase Auth who it belongs to.
// Returns the user object, or null when the token is missing, expired or invalid.
export async function getUser(req) {
  const match = (req.headers.get('authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;

  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: `Bearer ${match[1]}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ? user : null;
}

// Per-user daily request cap, stored in Netlify Blobs. Not atomic: two requests racing
// at the limit may both pass, which is acceptable for a cost guard.
export async function consumeDailyQuota(userId) {
  const limit = parseInt(env('AI_DAILY_LIMIT', '60'), 10);
  const store = getStore('ai-usage');
  const key = `${new Date().toISOString().slice(0, 10)}/${userId}`;
  const used = parseInt((await store.get(key)) || '0', 10);
  if (used >= limit) return { ok: false, limit };
  await store.set(key, String(used + 1));
  return { ok: true, limit, used: used + 1 };
}
