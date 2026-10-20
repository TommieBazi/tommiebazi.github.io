/* offline cache for Tommie BaZi Studio — bump VERSION when files change */
var VERSION = 'tbz-studio-1';
var FILES = ['./', 'index.html', 'core.js', 'lunar.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', '../thai-places.json'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); if (r.ok && new URL(e.request.url).origin === location.origin) caches.open(VERSION).then(function (c) { c.put(e.request, cp); }); return r; }).catch(function () { return caches.match(e.request); }));
});
