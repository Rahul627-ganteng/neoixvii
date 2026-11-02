// Data yang disimpan di perangkat pembeli: akun member, riwayat pesanan dari perangkat ini, dan isi "Bikin Bundlemu".
const KUNCI_MEMBER = 'ixvii-member';
const KUNCI_RIWAYAT = 'ixvii-riwayat';
const KUNCI_BUNDLE = 'ixvii-bundle';

const baca = (k, awal) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? awal; } catch { return awal; } };
const tulis = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* mode privat */ } };

/** { token, nama } atau null */
export const ambilMember = () => { const m = baca(KUNCI_MEMBER, null); return m && typeof m.token === 'string' && m.token.length >= 24 ? m : null; };
export const simpanMember = (m) => tulis(KUNCI_MEMBER, m ? { token: m.token, nama: m.nama } : null);

/** Riwayat pesanan dari perangkat ini: [{ kode, t, items: [{ kode, slug, aplikasi, varian }] }], terbaru dulu. */
export const ambilRiwayat = () => (Array.isArray(baca(KUNCI_RIWAYAT, [])) ? baca(KUNCI_RIWAYAT, []) : []);
export function catatRiwayat(hasil) {
  const items = (hasil?.items ?? []).filter((i) => i.kode).map((i) => ({ kode: i.kode, slug: i.slug, aplikasi: i.aplikasi, varian: i.varian }));
  if (!items.length) return;
  tulis(KUNCI_RIWAYAT, [{ kode: hasil.kode, t: Date.now(), items }, ...ambilRiwayat().filter((r) => r.kode !== hasil.kode)].slice(0, 10));
}

/** Isi "Bikin Bundlemu": daftar kode varian (satu per aplikasi). */
export const ambilBundle = () => { const b = baca(KUNCI_BUNDLE, []); return Array.isArray(b) ? b.filter((x) => typeof x === 'string').slice(0, 10) : []; };
export const simpanBundle = (kode) => tulis(KUNCI_BUNDLE, kode.length ? [...new Set(kode)].slice(0, 10) : null);
