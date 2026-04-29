const CACHE_NAME = 'reading-fun-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './api.js',
  './app.js',
  './manifest.json',
  './icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  // Do not cache API calls to generative language API
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
      return;
  }
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
