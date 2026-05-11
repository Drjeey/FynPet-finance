/**
 * FynPet — Netlify Serverless Function Proxy
 * File: netlify/functions/claude-proxy.js
 *
 * SETUP:
 * 1. Deploy this folder to Netlify (drag & drop)
 * 2. In Netlify dashboard → Site settings → Environment variables:
 *      ANTHROPIC_API_KEY = sk-ant-...your key...
 * 3. In FynPet Settings, set Proxy URL to:
 *      /.netlify/functions/claude-proxy
 *    Leave the API key field blank — it's now stored server-side.
 */

const https = require('https');

const ALLOWED_ORIGIN = process.env.SITE_URL || 'https://fynpet.com';

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: { message: 'Method not allowed' } }),
    };
  }

  // API key lives in Netlify env — never touches the browser
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: { message: 'Server misconfiguration: missing API key' } }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: { message: 'Invalid JSON' } }),
    };
  }

  // Strip any client-supplied apiKey — server key takes precedence
  delete payload.apiKey;

  // Restrict to allowed models only
  const ALLOWED_MODELS = ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];
  if (!payload.model || !ALLOWED_MODELS.includes(payload.model)) {
    payload.model = 'claude-sonnet-4-6';
  }

  const bodyStr = JSON.stringify(payload);

  const result = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':       'application/json',
        'Content-Length':     Buffer.byteLength(bodyStr),
        'x-api-key':          apiKey,
        'anthropic-version':  '2023-06-01',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });

  return {
    statusCode: result.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: result.body,
  };
};
