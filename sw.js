const CACHE = "ctr-v5";
const FILES = [
  "./index.html",
  "./styles.css",
  "./app.js?v=20260724-2",
  "./manifest.webmanifest"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});