/* Tabellträning – Copyright (C) 2026 Björn Brunken – GPL-3.0-or-later, se LICENSE */
/* Service worker: sparar alla filer så att appen fungerar offline (bara via http/https). */
var CACHE = 'tabelltraning-v2';
var FILES = [
  './', 'index.html', 'manifest.json', 'icon.svg', 'css/style.css',
  'js/core.js', 'js/learn.js', 'js/profiles.js', 'js/home.js', 'js/practice.js',
  'js/tests.js', 'js/tools.js', 'js/games.js', 'js/classroom.js',
  'fonts/andika-400.woff2', 'fonts/andika-700.woff2', 'fonts/fredoka.woff2'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    });
  }));
});
