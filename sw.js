/* عاملُ الخدمة: الهيكلُ من الذاكرة، والبياناتُ من الشبكةِ أوّلاً. ارفعِ V مع كلِّ تعديل. */
var V = 'eshraf-v3';
var SHELL = ['./', './index.html', './css/eshraf.css?v=3', './js/config.js?v=3', './js/fb.js?v=3', './js/charts.js?v=3', './js/app.js?v=3',
  './img/logo.svg', './img/logo-cream.svg', './fonts/sakkal-400.woff2', './fonts/sakkal-700.woff2', './fonts/poster-700.woff2', './fonts/poster-900.woff2', './manifest.webmanifest'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   /* فايربيس وغيرُه: الشبكةُ مباشرة */
  e.respondWith(caches.match(e.request, { ignoreSearch: false }).then(function (r) {
    var net = fetch(e.request).then(function (res) { if (res && res.ok) caches.open(V).then(function (c) { c.put(e.request, res.clone()); }); return res; }).catch(function () { return r; });
    return r || net;
  }));
});
