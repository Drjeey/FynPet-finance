// GET /api/config — public client configuration read from Netlify environment variables.
// The publishable key is browser-safe; access control is enforced by RLS.
import { json, env, supabasePublicKey } from '../lib/http.mjs';

export default async () => {
  const supabaseUrl = env('SUPABASE_URL');
  const publicKey = supabasePublicKey();
  return json(200, {
    supabaseUrl: supabaseUrl || null,
    supabasePublicKey: publicKey || null,
    aiEnabled: Boolean(env('ANTHROPIC_API_KEY') && supabaseUrl && publicKey),
  }, { 'Cache-Control': 'public, max-age=300' });
};

export const config = { path: '/api/config', method: 'GET' };
