// Mengambil data publik dari Supabase lewat REST (tanpa supabase-js, supaya halaman ringan).
// Hanya memakai publishable key di header `apikey`; HPP dan data pembeli tidak pernah ikut terkirim.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { inggris } from './i18n.js';

const HEADER = { apikey: SUPABASE_ANON_KEY };
const CACHE_MS = 2 * 60 * 1000;   // katalog & promo disimpan sebentar supaya pindah halaman terasa cepat

export const slugify = (t) => String(t ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function ambil(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADER });
  if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
  return res.json();
}

/** Ambil dengan cache singkat di sessionStorage. */
async function ambilSimpan(kunci, path) {
  try {
    const s = JSON.parse(sessionStorage.getItem(kunci) || 'null');
    if (s && Date.now() - s.t < CACHE_MS) return s.data;
  } catch { /* sessionStorage tidak tersedia */ }
  const data = await ambil(path);
  try { sessionStorage.setItem(kunci, JSON.stringify({ t: Date.now(), data })); } catch { /* abaikan */ }
  return data;
}

/** Katalog lengkap dari rpc katalog_json. */
export async function ambilKatalog() {
  // cache v4: ada sisa stok & waktu cek stok. Rating ulasan ikut ditempel ke tiap aplikasi.
  const [data, ulasan] = await Promise.all([ambilSimpan('ixvii-katalog-v4', 'rpc/katalog_json'), ambilUlasan()]);
  const hasil = olah(data);
  const rating = new Map((ulasan?.ringkasan ?? []).map((r) => [r.slug, r]));
  for (const a of hasil.apps) {
    const r = rating.get(a.slug);
    if (r) a.rating = { rata: Number(r.rata), jumlah: r.jumlah };
  }
  return hasil;
}

/** Pengaturan toko yang boleh publik: nomor WhatsApp, cara bayar, kurs USD, buka/tutup pesanan. */
export async function ambilToko() {
  try {
    // tidak disimpan di cache: buka/tutup pesanan, nomor WA, dan kurs harus langsung berlaku
    const rows = await ambil('store_settings?select=whatsapp_number,payment_info,payment_info_en,usd_rate,usd_rate_at,orders_open&id=eq.1');
    return rows[0] ?? null;
  } catch { return null; }   // tabel belum dibuat: website tetap jalan, pesanan ditutup
}

/** Penjelasan tipe paket (Sharing, Private, ...). */
export async function ambilInfoTipe() {
  try { return await ambilSimpan('ixvii-tipe-v1', 'plan_type_info?select=keywords,title,title_en,body,body_en,pros,pros_en,cons,cons_en&order=sort.asc,id.asc'); }
  catch { return []; }
}

/** FAQ umum di beranda (hanya yang sudah diterbitkan). */
export async function ambilFaqUmum() {
  try { return await ambil('site_faqs?select=question,answer,question_en,answer_en&order=sort.asc,id.asc'); }
  catch { return []; }
}

/** FAQ dan harga resmi satu aplikasi. */
export async function ambilDetail(appId) {
  if (appId == null) return { faqs: [], resmi: [] };
  const aman = (p) => ambil(p).catch(() => []);
  const id = encodeURIComponent(appId);
  const [faqs, resmi] = await Promise.all([
    aman(`app_faqs?select=question,answer,question_en,answer_en&app_id=eq.${id}&order=sort.asc,id.asc`)
      .then((r) => (r.length ? r : aman(`app_faqs?select=question,answer&app_id=eq.${id}&order=sort.asc,id.asc`))),
    aman(`official_prices?select=label,price,duration_days,note,checked_at&app_id=eq.${id}&order=sort.asc,id.asc`),
  ]);
  return { faqs, resmi };
}

async function rpc(nama, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nama}`, {
    method: 'POST',
    headers: { ...HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Gagal (${res.status})`);
  return data;
}

/**
 * Buat pesanan lewat RPC. Harga, diskon rakitan, dan harga bundle dihitung ulang di database.
 * kode = daftar kode varian; bundle = id bundle harga tetap; rakit = true untuk diskon rakitan.
 */
export function buatPesanan({ kode = [], bundle = null, rakit = false, nama, wa }) {
  const p_items = bundle != null ? [{ bundle }] : kode.map((c) => ({ code: c }));
  const body = { p_items, p_nama: nama, p_wa: wa, p_bahasa: inggris() ? 'en' : 'id' };
  if (rakit) body.p_rakit = true;   // dikirim hanya kalau perlu, supaya tetap jalan di database lama
  return rpc('buat_pesanan', body);
}

/** Promo, bundle yang berlaku, dan aturan diskon rakitan. Null kalau migration Tahap 7 belum dijalankan. */
export async function ambilPromo() {
  try { return await ambilSimpan('ixvii-promo-v1', 'rpc/promo_json'); }
  catch { return null; }
}

/** Info film & serial (sedang/akan tayang). Null kalau Tahap 10 belum dijalankan. */
export async function ambilFilm() {
  try { return await ambilSimpan('ixvii-film-v1', 'rpc/film_json'); }
  catch { return null; }
}

/** Profil owner untuk halaman Tentang. Null kalau Tahap 9 belum dijalankan. */
export async function ambilProfil() {
  try { return (await ambilSimpan('ixvii-profil-v1', 'owner_profile?select=*&id=eq.1'))[0] ?? null; }
  catch { return null; }
}
/** Mitra resmi yang aktif (kontak hanya kalau mitra mengizinkan). */
export async function ambilMitra() {
  try { return await ambilSimpan('ixvii-mitra-v1', 'rpc/mitra_json'); }
  catch { return null; }
}

/** Ulasan pembeli yang sudah ditampilkan admin + ringkasan rating per aplikasi. Null kalau Tahap 8 belum dijalankan. */
export async function ambilUlasan() {
  try { return await ambilSimpan('ixvii-ulasan-v1', 'rpc/ulasan_json'); }
  catch { return null; }
}
/** Halaman kebijakan (syarat, privasi, garansi). Null kalau belum ada. */
export async function ambilHalaman(slug) {
  try { return (await ambil(`site_pages?select=slug,title,title_en,body,body_en,updated_at&slug=eq.${encodeURIComponent(slug)}`))[0] ?? null; }
  catch { return null; }
}
/** Saldo komisi affiliate dari link pribadinya (tanpa HPP & nama pembeli). Null kalau link salah. */
export const ambilSaldoAffiliate = (token) => rpc('saldo_affiliate', { p_token: token });
/** Data form aktivasi garansi dari link sekali pakai. */
export const infoGaransi = (token) => rpc('info_garansi', { p_token: token });
/** Unggah screenshot bukti login ke bucket privat "garansi" (hanya bisa dengan link yang sah). */
export async function unggahScreenshot(token, blob) {
  const path = `${token}/login-${Date.now()}.jpg`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/garansi/${path}`, {
    method: 'POST',
    headers: { ...HEADER, 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'false' },
    body: blob,
  });
  if (!res.ok) {
    const d = await res.json().catch(() => null);
    throw new Error(d?.message || d?.error || `Gagal mengunggah screenshot (${res.status})`);
  }
  return path;
}
/** Kirim aktivasi garansi (+ rating & ulasan opsional). */
export const kirimGaransi = ({ token, nama, hp, device, screenshot, ulasan, anonim }) =>
  rpc('kirim_garansi', { p_token: token, p_nama: nama, p_hp: hp, p_device: device, p_screenshot: screenshot, p_ulasan: ulasan?.length ? ulasan : null, p_anonim: !!anonim });

/** Data formulir ulasan dari link sekali pakai. */
export const infoUlasan = (token) => rpc('info_ulasan', { p_token: token });
/** Kirim ulasan: ulasan = [{ app, rating, isi }]. */
export const kirimUlasan = (token, ulasan, anonim) => rpc('kirim_ulasan', { p_token: token, p_ulasan: ulasan, p_anonim: !!anonim });

/** Diskon rakitan tertinggi yang diiklankan: tingkat jumlah aplikasi teratas + bonus durasi terbesar. */
export function diskonTertinggi(promo) {
  const atas = promo?.rules?.at(-1);
  if (!atas) return null;
  const bonus = Math.max(0, ...(promo.durasi ?? []).map((d) => Number(d.pct)));
  return { pct: Number(atas.pct) + bonus, min: Number(atas.min) };
}

/** Hitung total rakitan (diskon dibatasi batas aman di server). */
export const hitungRakit = (kode) => rpc('bundle_quote', { p_codes: kode });

// Ubah bentuk katalog_json menjadi daftar aplikasi yang mudah dipakai halaman.
function olah(data) {
  const en = inggris();
  const kategori = [];
  const apps = [];
  for (const c of data?.cats ?? []) {
    const namaKat = (en && c.label_en) || c.label;
    kategori.push({ kunci: c.label, label: namaKat, desc: (en && c.desc_en) || c.desc, jumlah: c.apps.length });
    for (const a of c.apps) {
      const varian = a.groups.flatMap((g) => g.items.map((i) => ({ ...i, tipe: g.label })));
      const tersedia = varian.filter((v) => v.s !== 0);
      apps.push({
        id: a.id ?? null,
        slug: a.slug || slugify(a.name),
        nama: a.name,
        desc: (en && a.desc_en) || a.desc,
        logo: a.logo || null,
        unggulan: !!a.featured,
        kategori: namaKat,
        kunciKategori: c.label,
        grup: a.groups,
        varian,
        hargaMulai: tersedia.length ? Math.min(...tersedia.map((v) => v.p)) : null,
        habisSemua: tersedia.length === 0,
        tipe: a.groups.map((g) => g.label),
        stokAt: a.stok_at ?? null,
        cekStok: data?.cek_stok ?? null,
      });
    }
  }
  return { kategori, apps, diperbarui: data?.updated ?? null };
}
