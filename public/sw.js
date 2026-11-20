// FynPet service worker: makes the app installable and lets the app shell open without a connection.
// Records already live in the browser (localStorage), so an offline launch shows them.
// Never cached: /api/* (config and Fyn AI) and anything on another origin (Supabase sign-in and sync).
// Code, styles and pages are network-first, so a new deploy is picked up on the next online visit;
// the cache is only the fallback when the network is unavailable.

const CACHE = 'fynpet-shell-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'favicon.svg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'stitch.css', 'midnight.css',
  'app.js', 'addflow.js', 'advisor.js', 'analytics.js', 'budgets.js', 'calc.js', 'csv.js', 'display.js',
  'icons.js', 'importreview.js', 'mpesa.js', 'settings.js', 'sync.js', 'txfilter.js',
  'vendor/supabase.js', 'vendor/fonts/manrope-latin-wght-normal.woff2', 'vendor/fonts/inter-latin-wght-normal.woff2',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('fynpet-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const { request } = event, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;

  // Pages: try the network, fall back to the cached app shell.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('index.html')));
    return;
  }

  // Everything else on this site: network first, keep a copy, fall back to the copy when offline.
  // PDF.js and its data files are cached the first time a statement is read.
  event.respondWith(fetch(request).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request, { ignoreSearch: true }).then(hit => hit || Response.error())));
});
