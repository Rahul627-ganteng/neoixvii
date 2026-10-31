// Membaca data mitra dari teks yang dikirim mitra (format "Nama: ...") atau dari baris Excel.
// Fungsi murni tanpa akses jaringan, supaya mudah diuji.

const ALIAS = {
  nama: ['nama', 'name', 'nama lengkap', 'full name', 'nama mitra', 'nama reseller', 'nama affiliator'],
  jenis: ['jenis', 'tipe', 'type', 'peran', 'role', 'sebagai', 'daftar sebagai', 'kategori', 'jenis mitra', 'mendaftar sebagai'],
  kota: ['kota', 'domisili', 'city', 'asal', 'asal kota', 'lokasi', 'alamat', 'kota domisili', 'kota asal'],
  wa: ['wa', 'whatsapp', 'no wa', 'nomor wa', 'no whatsapp', 'nomor whatsapp', 'no hp', 'nomor hp', 'hp', 'nomor', 'telepon',
    'telp', 'no telp', 'phone', 'kontak', 'no wa aktif', 'nomor wa aktif', 'wa aktif'],
  ig: ['ig', 'instagram', 'insta', 'akun ig', 'username ig', 'akun instagram', 'username instagram'],
  kode: ['kode', 'kode referral', 'referral', 'kode ref', 'ref', 'referral code', 'kode mitra'],
  bio: ['bio', 'tentang', 'keterangan', 'deskripsi', 'tentang saya'],
  kontak: ['tampilkan kontak', 'kontak boleh tampil', 'tampil kontak', 'izin kontak', 'show contact', 'kontak tampil', 'boleh tampilkan kontak'],
  aktif: ['aktif', 'active', 'status aktif'],
};
const PETA = new Map(Object.entries(ALIAS).flatMap(([k, daftar]) => daftar.map((a) => [a, k])));

/** "📱 No. WA :" → "no wa" → kunci "wa" */
export function kunciKolom(teks) {
  const t = String(teks ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return PETA.get(t) ?? null;
}

export function rapikanJenis(v) {
  const s = String(v ?? '').toLowerCase();
  if (/aff|afil/.test(s)) return 'affiliator';
  if (/res|seller|agen|dropship/.test(s)) return 'reseller';
  return null;
}

export function yaTidak(v) {
  const s = String(v ?? '').trim().toLowerCase();
  if (/^(ya|y|yes|iya|boleh|true|1|aktif|tampil|tampilkan)$/.test(s)) return true;
  if (/^(tidak|tdk|t|no|n|false|0|nonaktif|jangan|sembunyikan)$/.test(s)) return false;
  return null;
}

export function rapikanWa(n) {
  let d = String(n ?? '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
}

export function rapikanIg(v) {
  let s = String(v ?? '').trim().toLowerCase();
  s = s.replace(/^.*instagram\.com\//, '').split('/')[0].split('?')[0].replace(/^@/, '');
  return s.replace(/[^a-z0-9._]/g, '').slice(0, 30);
}

/** Rapikan satu calon mitra dan beri catatan galat kalau ada yang kurang. */
export function rapikanMitra(m) {
  const hasil = {
    nama: String(m.nama ?? '').replace(/\s+/g, ' ').trim(),
    jenis: rapikanJenis(m.jenis),
    kota: String(m.kota ?? '').replace(/\s+/g, ' ').trim() || null,
    wa: rapikanWa(m.wa) || null,
    ig: rapikanIg(m.ig) || null,
    kode: String(m.kode ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '') || null,
    bio: String(m.bio ?? '').trim().slice(0, 200) || null,
    kontak: yaTidak(m.kontak),
    aktif: yaTidak(m.aktif),
    catatan: [],
  };
  if (hasil.nama.length < 2) hasil.catatan.push('Nama belum diisi');
  if (!hasil.jenis) { hasil.catatan.push('Jenis tidak dikenali, dianggap Reseller'); hasil.jenis = 'reseller'; }
  if (hasil.wa && (hasil.wa.length < 9 || hasil.wa.length > 15)) hasil.catatan.push('Nomor WA tampak salah');
  return hasil;
}

/**
 * Baca teks seperti:
 *   Nama: Budi Santoso
 *   Daftar sebagai: Reseller
 *   Kota: Malang
 *   No WA: 0812...
 * Beberapa mitra boleh ditempel sekaligus; mitra baru dimulai setiap kali ada baris "Nama".
 */
export function bacaTeksMitra(teks) {
  const daftar = [];
  let cur = {};
  const ada = (o) => Object.keys(o).length > 0;
  for (const mentah of String(teks ?? '').split(/\r?\n/)) {
    const baris = mentah.replace(/^[\s\-–*•·>#\d.)]+(?=\D)/u, '').trim();
    if (!baris || /^[-=_]{3,}$/.test(baris)) continue;
    const i = baris.search(/[:=：]/);
    if (i <= 0) continue;
    const kunci = kunciKolom(baris.slice(0, i));
    const nilai = baris.slice(i + 1).trim();
    if (!kunci) continue;
    if (kunci === 'nama' && cur.nama) { daftar.push(cur); cur = {}; }
    cur[kunci] = nilai;
  }
  if (ada(cur)) daftar.push(cur);
  return daftar.map(rapikanMitra);
}

/** Baris Excel (array of array, baris pertama = judul kolom) → calon mitra. */
export function barisExcelKeMitra(baris) {
  if (!baris?.length) return [];
  const judul = baris[0].map(kunciKolom);
  return baris.slice(1)
    .filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
    .map((r) => {
      const m = {};
      judul.forEach((k, i) => { if (k && r[i] != null && String(r[i]).trim() !== '') m[k] = String(r[i]); });
      return rapikanMitra(m);
    });
}

const bersih = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();

/** Cocokkan calon mitra dengan data yang sudah ada: kode referral dulu, lalu nama + jenis. */
export function cocokkan(calon, ada) {
  return calon.map((m) => {
    const lama = (m.kode && ada.find((a) => a.referral_code === m.kode))
      || ada.find((a) => bersih(a.name) === bersih(m.nama) && a.kind === m.jenis);
    return { ...m, lama: lama ?? null };
  });
}

/** Ubah calon mitra jadi baris tabel partners. Kolom kosong tidak menimpa data lama. */
export function keBaris(m, { baru }) {
  const b = {};
  if (m.nama) b.name = m.nama;
  if (m.jenis) b.kind = m.jenis;
  if (m.kota) b.city = m.kota;
  if (m.wa) b.whatsapp = m.wa;
  if (m.ig) b.instagram = m.ig;
  if (m.kode) b.referral_code = m.kode;
  if (m.bio) b.bio = m.bio;
  if (m.kontak != null) b.show_contact = m.kontak;
  else if (baru) b.show_contact = false;
  if (m.aktif != null) b.is_active = m.aktif;
  return b;
}
