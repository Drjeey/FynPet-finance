#!/usr/bin/env node
/**
 * FynPet Local Proxy Server
 * ──────────────────────────────────────────────────────────────
 * Runs a lightweight HTTP relay that:
 *   1. Accepts POST /proxy from the browser (CORS allowed)
 *   2. Forwards the request to api.anthropic.com with your API key
 *   3. Returns the response back to the browser
 *
 * WHY THIS IS NEEDED:
 * Browsers enforce CORS (Cross-Origin Resource Sharing). Anthropic's
 * API does not send Access-Control-Allow-Origin headers, so direct
 * fetch() calls from any webpage are blocked by the browser.
 * This proxy runs on your machine and acts as a relay.
 *
 * SETUP (one-time):
 *   Node.js required (https://nodejs.org - free)
 *   No npm install needed — uses only built-in modules
 *
 * USAGE:
 *   node fynpet-proxy.js
 *
 * Then in FynPet Settings → Proxy URL:
 *   http://localhost:3001/proxy
 *
 * The proxy only accepts requests from localhost and will shut down
 * when you close the terminal. Your API key is never logged.
 */

const http  = require('http');
const https = require('https');

const PORT = 3001;
const ANTHROPIC_HOST = 'api.anthropic.com';

const server = http.createServer((req, res) => {
  // CORS headers — allow the FynPet page to call this proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only accept POST /proxy
  if (req.method !== 'POST' || req.url !== '/proxy') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Not found. Use POST /proxy' } }));
    return;
  }

  // Read request body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Invalid JSON body' } }));
      return;
    }

    // Extract apiKey from body (never log it)
    const { apiKey, ...payload } = parsed;

    if (!apiKey) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Missing apiKey in request body' } }));
      return;
    }

    // Forward to Anthropic
    const bodyStr = JSON.stringify(payload);
    const options = {
      hostname: ANTHROPIC_HOST,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'Content-Length':     Buffer.byteLength(bodyStr),
        'x-api-key':          apiKey,
        'anthropic-version':  '2023-06-01',
      },
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let responseData = '';
      proxyRes.on('data', chunk => { responseData += chunk; });
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type':                  'application/json',
          'Access-Control-Allow-Origin':   '*',
        });
        res.end(responseData);
      });
    });

    proxyReq.on('error', (err) => {
      console.error('[FynPet Proxy] Anthropic request failed:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Upstream error: ' + err.message } }));
    });

    proxyReq.write(bodyStr);
    proxyReq.end();
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║     FynPet Proxy Server — Running        ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log(`  ║  Listening on: http://localhost:${PORT}     ║`);
  console.log('  ║  Proxy URL:    http://localhost:3001/proxy ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log('  ║  Paste the Proxy URL above into:         ║');
  console.log('  ║  FynPet → Settings → Proxy URL           ║');
  console.log('  ║                                          ║');
  console.log('  ║  Press Ctrl+C to stop                    ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ✕ Port ${PORT} is already in use.`);
    console.error(`  Either stop the other process or change PORT in this file.\n`);
  } else {
    console.error('\n  ✕ Server error:', err.message, '\n');
  }
  process.exit(1);
});
