// Service worker Gawean -- cache-first untuk shell app & korpus jawaban,
// network-first untuk navigasi supaya pembeli selalu melihat versi terbaru
// saat online, tapi tetap bisa membuka chat saat offline.
const CACHE = "gawean-v2";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/main.css",
  "css/tokens.css",
  "css/base.css",
  "css/shell.css",
  "css/chat.css",
  "css/panels.css",
  "css/desktop.css",
  "js/boot.js",
  "js/main.js",
];
// Korpus jawaban ikut di-cache saat install agar chat tetap berfungsi offline.
// Daftar file bersumber dari data/manifest.json (path sudah lengkap "data/...").
const CORPUS = Object.freeze(
  Promise.resolve().then(async () => {
    try {
      const idx = await fetch("data/manifest.json").then((r) => r.json());
      return Array.isArray(idx?.files) ? idx.files : [];
    } catch {
      return [];
    }
  })
);

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => CORPUS)
      .then((files) => (files.length ? caches.open(CACHE).then((c) => c.addAll(files)) : null))
      .catch(() => null) // jangan gagalkan install bila sebagian korpus gagal
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigasi: coba jaringan dulu (konten terbaru), fallback ke cache/offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("index.html", copy));
          return res;
        })
        .catch(() => caches.match("index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Aset statis & data korpus: cache dulu, isi cache saat miss.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && (url.pathname.endsWith(".json") || /\.(css|js|png|svg|webp)$/.test(url.pathname))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
