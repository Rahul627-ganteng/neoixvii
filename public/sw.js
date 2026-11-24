// Service worker IXVII.CO: membuat website bisa dipasang sebagai aplikasi + halaman offline.
// Strategi "jaringan dulu": isi selalu yang terbaru dari server; cache hanya dipakai saat offline.
// Data (Supabase), panel admin, dan halaman pribadi TIDAK pernah disimpan di cache.
const VERSI = 'ixvii-v1';
const OFFLINE = '/offline.html';
const PRA_SIMPAN = [
  OFFLINE, '/css/brand.css', '/css/site.css',
  '/assets/brand/icon-192.png', '/assets/brand/emblem-putih.png', '/assets/brand/emblem-hitam.png',
];
const JANGAN_SIMPAN = ['/admin', '/admin-impor', '/.netlify/', '/garansi/', '/member/', '/langganan/', '/mitra/saldo', '/reseller/ebook'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(PRA_SIMPAN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((kunci) => Promise.all(kunci.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;                 // Supabase, CDN: langsung ke jaringan
  if (JANGAN_SIMPAN.some((p) => url.pathname.startsWith(p))) return; // halaman pribadi & admin

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (/^\/(css|js|assets)\//.test(url.pathname)) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const salinan = res.clone(); caches.open(VERSI).then((c) => c.put(req, salinan)); }
      return res;
    }).catch(() => caches.match(req)));
  }
});
