// GET /api/config — public client configuration read from Netlify environment variables.
// The Supabase anon key is designed to be public; access control is enforced by RLS.
import { json, env } from '../lib/http.mjs';

export default async () => {
  const supabaseUrl = env('SUPABASE_URL');
  const supabaseAnonKey = env('SUPABASE_ANON_KEY');
  return json(200, {
    supabaseUrl: supabaseUrl || null,
    supabaseAnonKey: supabaseAnonKey || null,
    aiEnabled: Boolean(env('ANTHROPIC_API_KEY')) && Boolean(supabaseUrl),
  }, { 'Cache-Control': 'public, max-age=300' });
};

export const config = { path: '/api/config', method: 'GET' };
