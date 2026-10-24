/* Offline shell for Mainichi. CACHE is stamped by build.sh, so a rebuild retires the old one. */
const CACHE = "mainichi-20261023223256";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg",
              "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache first: the puzzle must open on a train with no signal. Anything fetched
   successfully is kept, which picks up the Google Fonts files on the first run. */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) {
        if (new URL(e.request.url).origin === location.origin) {
          fetch(e.request).then(r => {
            if (r && r.ok) caches.open(CACHE).then(c => c.put(e.request, r));
          }).catch(() => {});
        }
        return hit;
      }
      return fetch(e.request).then(r => {
        if (r && (r.ok || r.type === "opaque")) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
