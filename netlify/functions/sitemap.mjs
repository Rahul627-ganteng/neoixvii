// /sitemap.xml — halaman publik + satu halaman per aplikasi aktif dari katalog (dibaca dengan kunci publik).
export const config = { path: '/sitemap.xml' };

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dokzzrrgdjyzxdhmjqkr.supabase.co';
// kunci publishable memang publik (sama dengan public/js/config.js); data tetap dilindungi RLS
const KUNCI_PUBLIK = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_9YuRt-Jvik5OuP30a76xCg_NL0EM9EZ';
const HALAMAN = ['/', '/katalog/', '/promo/', '/rakit/', '/produk/', '/produk/iklan/', '/film/', '/blog/', '/testimoni/', '/tentang/', '/mitra/', '/reseller/', '/affiliate/', '/syarat/', '/privasi/', '/garansi-refund/'];

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function isiSitemap(origin, katalog, berita = [], produk = []) {
  const apps = (katalog?.cats ?? []).flatMap((c) => c.apps ?? []);
  const tgl = katalog?.updated || null;
  const url = (loc, lastmod) => `  <url><loc>${xml(origin + loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...HALAMAN.map((h) => url(h, h === '/' || h === '/katalog/' ? tgl : null)),
    ...apps.filter((a) => a.slug).map((a) => url(`/aplikasi/?app=${encodeURIComponent(a.slug)}`, a.stok_at ? String(a.stok_at).slice(0, 10) : tgl)),
    ...(produk ?? []).filter((p) => p.slug && p.pemilik !== 'mitra').map((p) => url(`/produk/?p=${encodeURIComponent(p.slug)}`, null)),
    ...(berita ?? []).filter((b) => b.slug).map((b) => url(`/blog/baca/?p=${encodeURIComponent(b.slug)}`, String(b.updated_at || b.published_at || '').slice(0, 10) || null)),
    '</urlset>', ''].join('\n');
}

export default async (req) => {
  let katalog = null, berita = [], produk = [];
  try {
    const rp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/produk_json`, {
      method: 'POST', headers: { apikey: KUNCI_PUBLIK, 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(6000) });
    if (rp.ok) produk = (await rp.json())?.produk ?? [];
  } catch { /* toko produk digital belum dipasang */ }
  try {
    const rb = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=slug,published_at,updated_at&order=published_at.desc&limit=500`, {
      headers: { apikey: KUNCI_PUBLIK }, signal: AbortSignal.timeout(6000) });
    if (rb.ok) berita = await rb.json();
  } catch { /* blog belum dibuat */ }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/katalog_json`, {
      method: 'POST', headers: { apikey: KUNCI_PUBLIK, 'content-type': 'application/json' }, body: '{}',
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) katalog = await r.json();
  } catch { /* tetap kirim halaman utama kalau katalog gagal dibaca */ }
  return new Response(isiSitemap(new URL(req.url).origin, katalog, berita, produk), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
};
