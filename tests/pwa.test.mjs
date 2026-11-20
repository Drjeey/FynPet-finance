import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const sw = readFileSync('public/sw.js', 'utf8');
const shell = JSON.parse(`[${sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].replace(/'/g, '"').replace(/,\s*$/, '')}]`);
const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
const html = readFileSync('public/index.html', 'utf8');

test('the service worker caches every script the app loads', () => {
  const scripts = readdirSync('public').filter(f => f.endsWith('.js') && f !== 'sw.js');
  for (const file of scripts) assert.ok(shell.includes(file), `${file} missing from SHELL in sw.js`);
});

test('every file in the shell exists (vendor files come from npm run build)', () => {
  for (const file of shell.filter(f => f !== './' && !f.startsWith('vendor/'))) assert.ok(existsSync(`public/${file}`), `${file} does not exist`);
});

test('the service worker never caches the API or other sites', () => {
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(sw, /url\.origin !== self\.location\.origin/);
});

test('manifest has what browsers need to offer install', () => {
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  const sizes = manifest.icons.map(i => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifest.icons.some(i => i.purpose === 'maskable'));
  for (const icon of manifest.icons) assert.ok(existsSync(`public/${icon.src}`), `${icon.src} missing`);
});

test('the page links the manifest and the Apple touch icon', () => {
  assert.match(html, /<link rel="manifest" href="manifest.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" href="icons\/apple-touch-icon.png">/);
});
