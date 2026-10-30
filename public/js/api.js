// Mengambil data publik dari Supabase lewat REST (tanpa supabase-js, supaya halaman ringan).
// Hanya memakai publishable key di header `apikey`; HPP tidak pernah ikut terkirim.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const HEADER = { apikey: SUPABASE_ANON_KEY };
const CACHE_KEY = 'ixvii-katalog-v2';
const CACHE_MS = 5 * 60 * 1000;

export const slugify = (t) => String(t ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function ambil(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADER });
  if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
  return res.json();
}

/** Katalog lengkap dari rpc katalog_json, disimpan sebentar di sessionStorage. */
export async function ambilKatalog() {
  try {
    const simpan = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (simpan && Date.now() - simpan.t < CACHE_MS) return olah(simpan.data);
  } catch { /* sessionStorage tidak tersedia: lanjut ambil dari server */ }
  const data = await ambil('rpc/katalog_json');
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch { /* abaikan */ }
  return olah(data);
}

/** FAQ dan harga resmi satu aplikasi. Kalau tabelnya belum ada, kembalikan daftar kosong. */
export async function ambilDetail(appId) {
  if (appId == null) return { faqs: [], resmi: [] };
  const aman = (p) => ambil(p).catch(() => []);
  const [faqs, resmi] = await Promise.all([
    aman(`app_faqs?select=question,answer&app_id=eq.${encodeURIComponent(appId)}&order=sort.asc,id.asc`),
    aman(`official_prices?select=label,price,duration_days,note,checked_at&app_id=eq.${encodeURIComponent(appId)}&order=sort.asc,id.asc`),
  ]);
  return { faqs, resmi };
}

// Ubah bentuk katalog_json menjadi daftar aplikasi yang mudah dipakai halaman.
function olah(data) {
  const kategori = [];
  const apps = [];
  for (const c of data?.cats ?? []) {
    kategori.push({ label: c.label, desc: c.desc, jumlah: c.apps.length });
    for (const a of c.apps) {
      const varian = a.groups.flatMap((g) => g.items.map((i) => ({ ...i, tipe: g.label })));
      const tersedia = varian.filter((v) => v.s !== 0);
      apps.push({
        id: a.id ?? null,
        slug: a.slug || slugify(a.name),
        nama: a.name,
        desc: a.desc,
        logo: a.logo || null,
        unggulan: !!a.featured,
        kategori: c.label,
        grup: a.groups,
        varian,
        hargaMulai: tersedia.length ? Math.min(...tersedia.map((v) => v.p)) : null,
        habisSemua: tersedia.length === 0,
        tipe: a.groups.map((g) => g.label),
      });
    }
  }
  return { kategori, apps, diperbarui: data?.updated ?? null };
}
