/* Service worker — offline-first app shell. Firebase requests are never cached (the app has its own offline queue). */
const VERSION = "kk-v1.0.2";
const SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-32.png"
];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== "kk-fonts").map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function swr(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  const net = fetch(request).then((r) => { if (r && (r.ok || r.type === "opaque")) cache.put(request, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (FONT_HOSTS.includes(url.hostname)) { e.respondWith(swr(req, "kk-fonts")); return; }
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then((hit) => {
        const refresh = fetch(req).then((r) => { if (r && r.ok) caches.open(VERSION).then((c) => c.put("./index.html", r.clone())); return r; }).catch(() => null);
        return hit || refresh || Response.error();
      })
    );
    return;
  }
  e.respondWith(swr(req, VERSION));
});
