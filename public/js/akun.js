// Data yang disimpan di perangkat pembeli: akun member, riwayat pesanan dari perangkat ini, dan isi "Bikin Bundlemu".
const KUNCI_MEMBER = 'ixvii-member';
const KUNCI_RIWAYAT = 'ixvii-riwayat';
const KUNCI_BUNDLE = 'ixvii-bundle';
const KUNCI_LANGGANAN = 'ixvii-langganan';
const KUNCI_AJAK = 'ixvii-ajak';

const baca = (k, awal) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? awal; } catch { return awal; } };
const tulis = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* mode privat */ } };

/** { token, nama, kode } atau null (kode = kode ajak teman milik member) */
export const ambilMember = () => { const m = baca(KUNCI_MEMBER, null); return m && typeof m.token === 'string' && m.token.length >= 24 ? m : null; };
export function simpanMember(m) {
  const lama = ambilMember();
  tulis(KUNCI_MEMBER, m ? { token: m.token, nama: m.nama, kode: m.kode ?? (lama?.token === m.token ? lama.kode : null) ?? null } : null);
}

/** Riwayat pesanan dari perangkat ini: [{ kode, t, cek, items: [{ kode, slug, aplikasi, varian }] }], terbaru dulu.
 *  cek = token status pesanan (halaman Langganan saya). */
export const ambilRiwayat = () => (Array.isArray(baca(KUNCI_RIWAYAT, [])) ? baca(KUNCI_RIWAYAT, []) : []);
export function catatRiwayat(hasil, cek = null) {
  const items = (hasil?.items ?? []).filter((i) => i.kode).map((i) => ({ kode: i.kode, slug: i.slug, aplikasi: i.aplikasi, varian: i.varian }));
  if (!items.length && !cek) return;
  const lama = ambilRiwayat().find((r) => r.kode === hasil.kode);
  tulis(KUNCI_RIWAYAT, [{ kode: hasil.kode, t: lama?.t ?? Date.now(), cek: cek ?? lama?.cek ?? null, items: items.length ? items : lama?.items ?? [] },
    ...ambilRiwayat().filter((r) => r.kode !== hasil.kode)].slice(0, 10));
}
/** Token status pesanan dari perangkat ini (maks. 10). */
export const tokenRiwayat = () => ambilRiwayat().map((r) => r.cek).filter((x) => typeof x === 'string' && /^[0-9a-f]{32}$/.test(x));

/** Token "Langganan saya" (dari link WhatsApp) yang tersimpan di perangkat ini. */
export const ambilLangganan = () => { const v = baca(KUNCI_LANGGANAN, null); return typeof v === 'string' && /^[0-9a-f]{24,64}$/.test(v) ? v : null; };
export const simpanLangganan = (tok) => tulis(KUNCI_LANGGANAN, tok || null);

/** Kode ajak teman dari link ?ajak=… : { kode, t }, berlaku 30 hari sejak dibuka. */
export const ambilAjak = () => { const a = baca(KUNCI_AJAK, null); return a && typeof a.kode === 'string' && Date.now() - a.t < 30 * 864e5 ? a : null; };
export const simpanAjak = (kode) => tulis(KUNCI_AJAK, kode ? { kode, t: Date.now() } : null);

/** Isi "Bikin Bundlemu": daftar kode varian (satu per aplikasi). */
export const ambilBundle = () => { const b = baca(KUNCI_BUNDLE, []); return Array.isArray(b) ? b.filter((x) => typeof x === 'string').slice(0, 10) : []; };
export const simpanBundle = (kode) => tulis(KUNCI_BUNDLE, kode.length ? [...new Set(kode)].slice(0, 10) : null);
