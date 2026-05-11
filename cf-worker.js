/**
 * FynPet — Cloudflare Worker Proxy
 * File: cf-worker.js
 *
 * SETUP (free Cloudflare account required):
 * 1. Go to https://workers.cloudflare.com
 * 2. Click "Create a Service" → name it e.g. "fynpet-proxy"
 * 3. Click "Quick Edit" and paste this entire file
 * 4. Click "Save and Deploy"
 * 5. Copy the worker URL (e.g. https://fynpet-proxy.yourname.workers.dev)
 * 6. In FynPet Settings, set Proxy URL to that URL
 *
 * Cloudflare Workers free tier: 100,000 requests/day — more than enough.
 * Workers run at the edge (fastest latency globally).
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let parsed;
  try {
    parsed = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: { message: 'Invalid JSON body' } }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { apiKey, ...payload } = parsed;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: 'Missing apiKey in request body' } }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Forward to Anthropic
  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':       'application/json',
      'x-api-key':          apiKey,
      'anthropic-version':  '2023-06-01',
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await anthropicResponse.text();

  return new Response(responseBody, {
    status: anthropicResponse.status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
