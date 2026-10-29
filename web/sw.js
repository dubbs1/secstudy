// Offline copy of the app. Network first, so a new version shows up as soon as you're online;
// the cached copy is used when there is no connection.
importScripts('js/version.js');
const CACHE = 'secstudy-' + APP_VERSION;
// Every file in web/ except this one. tests/structure.test.js fails when this list and the folder differ.
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/version.js', './js/theme-boot.js', './js/util.js', './js/store.js', './js/course.js', './js/app.js',
  './js/content/exam.js', './js/content/lessons.js', './js/content/questions.js', './js/content/labs.js',
  './js/content/visuals.js', './js/content/scenarios.js', './js/views/visual.js', './js/views/today.js', './js/views/interact.js',
  './js/views/shared.js', './js/views/header.js', './js/views/learn.js', './js/views/practice.js',
  './js/views/labs.js', './js/views/timer.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-1024.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // cache:'reload' stores fresh copies, not whatever the browser cache still holds from the last release.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, {cache:'no-cache'}).then(res => {   // skip the HTTP cache so all files come from one release
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('./index.html')))
  );
});
