// Small response helpers shared by the Netlify functions.

export function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

export function error(status, message) {
  return json(status, { error: { message } });
}

// Reads an env var at request time (Netlify injects env vars per deploy context).
export function env(name, fallback = '') {
  return process.env[name] ?? fallback;
}

// Browser-safe Supabase key. Prefer current publishable keys; support legacy anon keys.
export function supabasePublicKey() {
  return env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY');
}
