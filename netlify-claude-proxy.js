/**
 * FynPet — Netlify Serverless Function Proxy
 * File: netlify/functions/claude-proxy.js
 *
 * SETUP:
 * 1. Create folder: netlify/functions/
 * 2. Place this file inside it as claude-proxy.js
 * 3. Deploy your site to Netlify (drag & drop the folder)
 * 4. In FynPet Settings, set Proxy URL to:
 *      /.netlify/functions/claude-proxy
 *
 * Netlify free tier: 125,000 function requests/month — more than enough.
 * The API key is sent in the request body (NEVER stored server-side).
 */

const https = require('https');

exports.handler = async (event) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
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

  let parsed;
  try {
    parsed = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: { message: 'Invalid JSON' } }),
    };
  }

  const { apiKey, ...payload } = parsed;

  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: { message: 'Invalid or missing apiKey' } }),
    };
  }

  // Forward to Anthropic
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
