/**
 * FynPet — Cloudflare Worker
 * File: cf-worker.js
 *
 * SETUP:
 * 1. Go to https://workers.cloudflare.com → Create a Service → name it "fynpet"
 * 2. Click "Quick Edit" and paste this entire file → Save and Deploy
 * 3. In Settings → Variables, add these secrets (click "Add variable" → "Encrypt"):
 *      ANTHROPIC_API_KEY  = sk-ant-...your Anthropic key...
 *      SUPABASE_URL       = https://xxxx.supabase.co
 *      SUPABASE_ANON_KEY  = eyJhbGci...your Supabase anon key...
 *      ALLOWED_ORIGIN     = https://your-netlify-site.netlify.app  (or your custom domain)
 * 4. Copy the worker URL (e.g. https://fynpet.yourname.workers.dev)
 * 5. In index.html, set: const CF_WORKER_URL = 'https://fynpet.yourname.workers.dev'
 *
 * Two routes:
 *   GET  /config  → returns { supabaseUrl, supabaseAnonKey } for the frontend to init Supabase
 *   POST /        → proxies Claude API requests using the server-side ANTHROPIC_API_KEY
 *
 * Cloudflare Workers free tier: 100,000 requests/day.
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = self.ALLOWED_ORIGIN || '';

  const corsHeaders = {
    'Access-Control-Allow-Origin':  allowed || origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);

  // ── GET /config — serve Supabase credentials to the frontend ──
  if (request.method === 'GET' && url.pathname === '/config') {
    if (!self.SUPABASE_URL || !self.SUPABASE_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: 'CF Worker secrets not configured (SUPABASE_URL, SUPABASE_ANON_KEY)' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ supabaseUrl: self.SUPABASE_URL, supabaseAnonKey: self.SUPABASE_ANON_KEY }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── POST / — Claude API proxy ──────────────────────────────
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: { message: 'Method not allowed' } }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const apiKey = self.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: 'Server misconfiguration: ANTHROPIC_API_KEY not set' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: 'Invalid JSON body' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Strip any client-supplied key — server key takes precedence
  delete payload.apiKey;

  // Restrict to allowed models
  const ALLOWED_MODELS = ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-20250514'];
  if (!payload.model || !ALLOWED_MODELS.includes(payload.model)) {
    payload.model = 'claude-sonnet-4-6';
  }

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await anthropicResponse.text();
  return new Response(responseBody, {
    status: anthropicResponse.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
