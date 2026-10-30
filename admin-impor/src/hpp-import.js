// hpp-import.js — pembaca file Excel HPP & harga untuk panel admin ixvii.co
//
// Membaca DUA format:
//   1. Template baru  (sheet "Katalog", ada kolom "ID Varian")
//   2. File HPP lama  (Jenis | Aplikasi | Keterangan | Durasi | Harga Asli | Margin | Harga Jual | HARGA FINAL,
//                      dengan merged cells)
//
// Tidak bergantung pada library apa pun. Yang dibutuhkan hanya objek workbook dari SheetJS:
//   import * as XLSX from 'xlsx'   // pasang dari https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz, BUKAN `npm i xlsx`
//   const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
//   const hasil = bacaWorkbook(wb)
//
// Aturan harga sama persis dengan rumus di Excel:
//   Harga Final = Harga Manual, atau HPP + HPP × Markup dibulatkan ke atas ke kelipatan Rp1.000.

export const BATAS = { hargaMin: 1000, hargaMax: 100_000_000, markupMax: 20, barisMax: 2000 };

const JENIS_KE_KATEGORI = {
  streaming: 'Nonton', nonton: 'Nonton',
  musicapp: 'Musik', music: 'Musik', musik: 'Musik',
  editingapps: 'Editing', editing: 'Editing',
  aithings: 'AI', ai: 'AI',
  educationalapps: 'Edukasi', edukasi: 'Edukasi',
  miscellaneous: 'Lainnya', lainnya: 'Lainnya',
};

// header dinormalisasi (huruf kecil, hanya a-z0-9) -> kunci kolom
const ALIAS = {
  id: ['idvarian', 'id', 'sku', 'kode'],
  kategori: ['kategori', 'jenis', 'category'],
  aplikasi: ['aplikasi', 'app', 'produk', 'namaaplikasi'],
  tipe: ['tipepaket', 'tipe', 'keterangan', 'grup', 'paket'],
  varian: ['variandurasi', 'varian', 'durasi'],
  hpp: ['hpprp', 'hpp', 'hargaasli', 'modal', 'hargamodal', 'hargapokok'],
  markup: ['markupdarihpp', 'markup', 'margin'], // "Margin" di file HPP lama sebenarnya markup dari HPP
  manual: ['hargamanualrp', 'hargamanual'],
  hargaJual: ['hargajual'],
  final: ['hargafinalrp', 'hargafinal'],
  stok: ['stok', 'stock'],
  tampil: ['tampildiweb', 'tampil', 'aktif'],
  catatan: ['catataninternal', 'catatan'],
};
const NAMA_KOLOM = {
  id: 'ID Varian', kategori: 'Kategori', aplikasi: 'Aplikasi', tipe: 'Tipe Paket', varian: 'Varian / Durasi',
  hpp: 'HPP', markup: 'Markup', manual: 'Harga Manual', final: 'Harga Final', hargaJual: 'Harga Jual',
  stok: 'Stok', tampil: 'Tampil di Web', catatan: 'Catatan',
};

// ---------------------------------------------------------------- utilitas
export const norm = (s) => String(s ?? '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
const bersih = (s) => String(s ?? '').replace(/[ ​﻿]/g, ' ').replace(/\s+/g, ' ').trim();
const kosong = (c) => c == null || c.v == null || (typeof c.v === 'string' && bersih(c.v) === '');
const rp = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');

function kolomKeHuruf(c) {
  let s = '';
  for (c += 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
  return s;
}
const alamat = (r, c) => kolomKeHuruf(c) + (r + 1);
function bacaRef(ref) {
  const m = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(String(ref || '').toUpperCase());
  if (!m) return null;
  const col = (s) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return { s: { r: +m[2] - 1, c: col(m[1]) }, e: { r: +(m[4] || m[2]) - 1, c: col(m[3] || m[1]) } };
}

/** Harga final dari HPP + markup, sama dengan CEILING(ROUND(HPP*(1+Markup),2),1000) di Excel. */
export function hitungHargaFinal(hpp, markup) {
  const mentah = Math.round(hpp * (1 + markup) * 100) / 100;
  return Math.ceil(mentah / 1000) * 1000;
}

/**
 * Baca angka Rupiah dari sel. Menerima 45000, "45.000", "45,000", "Rp 45.000", "45rb", "1,5jt".
 * Hasil: { value } | { kosong: true } | { hapus: true } (isi "-") | { error }
 */
export function bacaRupiah(cell) {
  if (kosong(cell)) return { kosong: true };
  if (typeof cell.v === 'number') {
    const v = Math.round(cell.v);
    return Math.abs(v - cell.v) > 1e-6 ? { value: v, warn: 'Ada desimal, dibulatkan' } : { value: v };
  }
  let s = String(cell.v).replace(/[ ​﻿\s]/g, '').replace(/^['=]/, '').replace(/^(rp|idr)\.?/i, '');
  if (/^[-–—]$/.test(s) || /^(kosong|hapus)$/i.test(s)) return { hapus: true };
  let kali = 1;
  const suf = /(rb|ribu|k|jt|juta)$/i.exec(s);
  if (suf) { kali = /^j/i.test(suf[1]) ? 1e6 : 1e3; s = s.slice(0, -suf[1].length); }
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');                         // 45.000 / 45,000
  else if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) s = s.split(',')[0].replace(/\./g, '');  // 45.000,00
  else if (/^\d+[.,]\d{1,2}$/.test(s)) {
    if (kali === 1) return { error: `"${cell.w ?? cell.v}" punya desimal; harga harus bilangan bulat` };
    s = s.replace(',', '.');                                                                // 1,5jt / 45,5rb
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return { error: `"${cell.w ?? cell.v}" bukan angka Rupiah` };
  return { value: Math.round(parseFloat(s) * kali) };
}

/** Markup sebagai pecahan: 0.35 = 35%. Menerima angka, "35%", "0,35". */
export function bacaMarkup(cell) {
  if (kosong(cell)) return { kosong: true };
  let v;
  if (typeof cell.v === 'number') v = cell.v;
  else {
    const s = String(cell.v).replace(/\s/g, '').replace(',', '.');
    const m = /^(-?\d+(?:\.\d+)?)(%?)$/.exec(s);
    if (!m) return { error: `"${cell.v}" bukan angka markup. Ketik 35% atau 0,35` };
    v = m[2] ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  }
  if (v < 0) return { error: 'Markup tidak boleh negatif' };
  if (v > BATAS.markupMax) return { error: `Markup ${Math.round(v * 100)}% terlalu besar. Kalau maksudnya ${Math.round(v)}%, ketik ${Math.round(v)}%` };
  return { value: Math.round(v * 1e6) / 1e6 };
}

/** Pecah label varian jadi data terstruktur. Label asli tetap dipakai untuk tampilan. */
export function bacaVarian(label) {
  const asli = bersih(label);
  const s = asli.replace(/½/g, '.5').toLowerCase();
  const out = { label: asli, durasiJumlah: null, durasiSatuan: null, durasiHari: null, jumlahUser: null, perangkat: null, terbaca: false };
  if (/lifetime|permanen|selamanya/.test(s)) Object.assign(out, { durasiSatuan: 'lifetime', terbaca: true });
  const m = /(\d+(?:\.\d+)?)\s*(hari|days?|minggu|mgg|weeks?|bulan|bln|months?|tahun|thn|years?|b)(?![a-z])/.exec(s);
  if (m) {
    const [satuan, hari] = /^(hari|day)/.test(m[2]) ? ['hari', 1] : /^(minggu|mgg|week)/.test(m[2]) ? ['minggu', 7]
      : /^(tahun|thn|year)/.test(m[2]) ? ['tahun', 365] : ['bulan', 30];
    Object.assign(out, { durasiJumlah: +m[1], durasiSatuan: satuan, durasiHari: Math.round(+m[1] * hari), terbaca: true });
  }
  const u = /(\d+)\s*u(?:ser)?s?(?![a-z])/.exec(s);
  if (u) out.jumlahUser = +u[1];
  if (/all\s*dev/.test(s)) out.perangkat = 'semua';
  else if (/\bios\b/.test(s)) out.perangkat = 'ios';
  else if (/\bandro(id)?\b/.test(s)) out.perangkat = 'android';
  else if (/\btv\b/.test(s)) out.perangkat = 'tv';
  else if (/\bmobile\b/.test(s)) out.perangkat = 'mobile';
  return out;
}

export const kunciVarian = (aplikasi, tipe, varian) => `${norm(aplikasi)}|${norm(tipe)}|${norm(varian)}`;

// ---------------------------------------------------------------- pembaca utama
function cariHeader(ws, range) {
  for (let r = range.s.r; r <= Math.min(range.s.r + 9, range.e.r); r++) {
    const map = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const h = norm(ws[alamat(r, c)]?.v);
      if (!h) continue;
      for (const [key, al] of Object.entries(ALIAS)) if (al.includes(h) && !(key in map)) { map[key] = c; break; }
    }
    const adaHarga = 'hpp' in map || 'manual' in map || 'final' in map;
    if ('aplikasi' in map && 'varian' in map && adaHarga && Object.keys(map).length >= 4) return { row: r, map };
  }
  return null;
}

function isiMerge(ws) {
  for (const mg of ws['!merges'] ?? []) {
    const src = ws[alamat(mg.s.r, mg.s.c)];
    for (let r = mg.s.r; r <= mg.e.r; r++)
      for (let c = mg.s.c; c <= mg.e.c; c++)
        if (r !== mg.s.r || c !== mg.s.c) ws[alamat(r, c)] = src ? { ...src, f: undefined, dariMerge: true } : undefined;
  }
}

function bacaInfoTambahan(wb) {
  const aplikasi = {}, kategori = {};
  let versiData = null;
  const ap = wb.Sheets[wb.SheetNames.find((n) => norm(n) === 'aplikasi')];
  if (ap?.['!ref']) {
    const rg = bacaRef(ap['!ref']);
    for (let r = 1; r <= rg.e.r; r++) {
      const nama = bersih(ap[alamat(r, 1)]?.v);
      if (nama) aplikasi[nama] = { kategori: bersih(ap[alamat(r, 0)]?.v) || null, deskripsi: bersih(ap[alamat(r, 2)]?.v) || null };
    }
  }
  const rf = wb.Sheets[wb.SheetNames.find((n) => norm(n) === 'referensi')];
  if (rf?.['!ref']) {
    const rg = bacaRef(rf['!ref']);
    if (norm(rf[alamat(0, 0)]?.v) === 'kategori')
      for (let r = 1; r <= Math.min(rg.e.r, 30); r++) {   // daftar kategori sampai sel kosong pertama
        const k = bersih(rf[alamat(r, 0)]?.v);
        if (!k) break;
        kategori[JENIS_KE_KATEGORI[norm(k)] ?? k] = { deskripsi: bersih(rf[alamat(r, 1)]?.v) || null };
      }
    for (let r = 0; r <= Math.min(rg.e.r, 40); r++)
      for (let c = 0; c <= rg.e.c; c++)
        if (norm(rf[alamat(r, c)]?.v) === 'versidata') versiData = bersih(rf[alamat(r, c + 1)]?.v) || null;
  }
  return { aplikasi, kategori, versiData };
}

/**
 * Baca workbook SheetJS. Hasil:
 * { format: 'template'|'hpp-lama', sheet, baris: [...], adaError, ringkasan, aplikasi, kategori, versiData }
 * Setiap baris: { barisExcel, code, kategori, aplikasi, tipe, varian, durasi, hpp, hapusHpp, markup,
 *                 hargaManual, harga, stok, tampil, catatan, errors: [{kolom, pesan}], warnings: [...] }
 * hpp === undefined artinya "tidak diubah"; hapusHpp === true artinya HPP dikosongkan.
 */
export function bacaWorkbook(wb) {
  const urutan = [...wb.SheetNames].sort((a, b) => (norm(b) === 'katalog') - (norm(a) === 'katalog'));
  let ws, header, sheet;
  for (const nama of urutan) {
    const cand = wb.Sheets[nama];
    if (!cand?.['!ref']) continue;
    const h = cariHeader(cand, bacaRef(cand['!ref']));
    if (h) { ws = cand; header = h; sheet = nama; break; }
  }
  if (!ws) throw new Error('Tabel tidak ditemukan. Pastikan ada kolom Aplikasi, Varian/Durasi, dan HPP atau Harga. Pakai template dari panel admin.');

  const range = bacaRef(ws['!ref']);
  if (range.e.r - header.row > BATAS.barisMax) throw new Error(`File terlalu besar (lebih dari ${BATAS.barisMax} baris).`);
  isiMerge(ws);
  const col = header.map;
  const format = 'id' in col ? 'template' : 'hpp-lama';
  const sel = (r, k) => (col[k] == null ? undefined : ws[alamat(r, col[k])]);
  const teks = (r, k) => bersih(sel(r, k)?.v);

  const baris = [];
  const dilihat = new Map();
  const terakhir = { kategori: '', aplikasi: '', tipe: '' };

  for (let r = header.row + 1; r <= range.e.r; r++) {
    const isiUtama = ['id', 'aplikasi', 'varian', 'hpp', 'manual'].some((k) => !kosong(sel(r, k)));
    if (!isiUtama) continue;
    const errors = [], warnings = [];
    const err = (k, pesan) => errors.push({ kolom: NAMA_KOLOM[k] ?? k, pesan });
    const warn = (k, pesan) => warnings.push({ kolom: NAMA_KOLOM[k] ?? k, pesan });

    // teks identitas (file lama: sel kosong = lanjutan baris di atasnya)
    const ident = {};
    for (const k of ['kategori', 'aplikasi', 'tipe']) {
      ident[k] = teks(r, k);
      if (format === 'hpp-lama') { if (!ident[k]) ident[k] = terakhir[k]; else terakhir[k] = ident[k]; }
    }
    const code = teks(r, 'id') || null;
    const varianTeks = teks(r, 'varian');
    if (!ident.aplikasi) err('aplikasi', 'Wajib diisi');
    if (!ident.tipe) err('tipe', 'Wajib diisi');
    if (!varianTeks) err('varian', 'Wajib diisi');
    let kategori = ident.kategori || null;
    if (kategori) {
      const k = JENIS_KE_KATEGORI[norm(kategori)];
      if (k) kategori = k; else warn('kategori', `"${kategori}" kategori baru`);
    } else err('kategori', 'Wajib diisi');

    // harga
    const hpp = bacaRupiah(sel(r, 'hpp'));
    const markup = bacaMarkup(sel(r, 'markup'));
    let manual = bacaRupiah(sel(r, 'manual'));
    const fc = sel(r, 'final'), gc = sel(r, 'hargaJual');
    if (format === 'hpp-lama') {
      // di file lama, angka yang diketik langsung (bukan rumus) di HARGA FINAL / Harga Jual = harga manual
      if (fc && !kosong(fc) && !fc.f) manual = bacaRupiah(fc);
      else if (gc && !kosong(gc) && !gc.f) manual = bacaRupiah(gc);
    } else if (fc && !kosong(fc) && !fc.f && manual.kosong) {
      manual = bacaRupiah(fc);
      warn('final', 'Harga Final diketik langsung (rumus tertimpa). Dipakai sebagai harga manual');
    }
    if (hpp.error) err('hpp', hpp.error);
    if (hpp.hapus && format !== 'template') err('hpp', 'Tanda "-" hanya dipakai di template');
    if (markup.error) err('markup', markup.error);
    if (manual.error) err('manual', manual.error);
    if (manual.hapus) err('manual', 'Kosongkan selnya saja untuk kembali ke rumus');
    for (const x of [hpp, manual]) if (x.warn) warn('hpp', x.warn);

    let harga = null;
    if (manual.value != null) harga = manual.value;
    else if (hpp.value != null && markup.value != null) harga = hitungHargaFinal(hpp.value, markup.value);
    if (harga == null && !errors.length) {
      if (hpp.hapus) err('manual', 'HPP dihapus: isi Harga Manual supaya varian tetap punya harga');
      else if (hpp.value != null) err('markup', 'Markup kosong, harga tidak bisa dihitung');
      else err('hpp', 'Isi HPP + Markup, atau Harga Manual');
    }
    if (harga != null) {
      if (harga < BATAS.hargaMin) err('final', `${rp(harga)} terlalu kecil. Maksudnya ${rp(harga * 1000)}?`);
      if (harga > BATAS.hargaMax) err('final', `${rp(harga)} terlalu besar`);
      if (hpp.value != null && hpp.value > 0 && harga <= hpp.value) warn('final', `Harga ${rp(harga)} tidak lebih tinggi dari HPP ${rp(hpp.value)} (rugi/impas)`);
      if (hpp.value === 0) warn('hpp', 'HPP 0. Benar gratis, atau belum diisi?');
      // cocokkan dengan nilai yang tersimpan di Excel (kalau file sudah dibuka & disimpan di Excel)
      if (fc?.f && typeof fc.v === 'number' && fc.v !== harga)
        warn('final', `Excel menampilkan ${rp(fc.v)}, hitungan sistem ${rp(harga)}. Yang dipakai ${rp(harga)}`);
    }

    // stok & tampil (file lama tidak punya kolom ini -> undefined = tidak diubah)
    let stok, tampil;
    if ('stok' in col) {
      const s = norm(teks(r, 'stok'));
      stok = ['', 'tersedia', 'ada', 'ready', '1', 'ya'].includes(s) ? 'tersedia'
        : ['habis', 'kosong', '0', 'tidak', 'soldout'].includes(s) ? 'habis' : null;
      if (!stok) err('stok', `"${teks(r, 'stok')}" harus Tersedia atau Habis`);
    }
    if ('tampil' in col) {
      const t = norm(teks(r, 'tampil'));
      tampil = ['', 'ya', 'y', '1', 'aktif', 'true'].includes(t) ? true : ['tidak', 'no', 'n', '0', 'nonaktif', 'false'].includes(t) ? false : null;
      if (tampil == null) err('tampil', `"${teks(r, 'tampil')}" harus Ya atau Tidak`);
    }

    const durasi = bacaVarian(varianTeks);
    if (varianTeks && !durasi.terbaca) warn('varian', 'Durasi tidak terbaca otomatis (label tetap dipakai apa adanya)');

    // duplikat
    const kunci = kunciVarian(ident.aplikasi, ident.tipe, varianTeks);
    for (const k of [code && `id:${code}`, ident.aplikasi && varianTeks && `kunci:${kunci}`].filter(Boolean)) {
      if (dilihat.has(k)) err(k.startsWith('id:') ? 'id' : 'varian', `Duplikat dengan baris ${dilihat.get(k)}`);
      else dilihat.set(k, r + 1);
    }

    baris.push({
      barisExcel: r + 1, code, kategori, aplikasi: ident.aplikasi || null, tipe: ident.tipe || null,
      varian: varianTeks || null, durasi,
      hpp: hpp.value ?? (hpp.hapus ? null : undefined), hapusHpp: !!hpp.hapus,
      markup: markup.value ?? null, hargaManual: manual.value ?? null, harga,
      stok, tampil, catatan: 'catatan' in col ? teks(r, 'catatan') || null : undefined,
      errors, warnings,
    });
  }

  const info = bacaInfoTambahan(wb);
  const jumlahError = baris.reduce((n, b) => n + b.errors.length, 0);
  return {
    format, sheet, baris, adaError: jumlahError > 0, ...info,
    ringkasan: {
      baris: baris.length, error: jumlahError,
      peringatan: baris.reduce((n, b) => n + b.warnings.length, 0),
      tanpaHpp: baris.filter((b) => b.hpp == null).length,
    },
  };
}

// ---------------------------------------------------------------- pratinjau perubahan
/**
 * Bandingkan hasil baca dengan katalog saat ini (dari view v_katalog_admin).
 * `sekarang`: [{ code, kategori, aplikasi, tipe, varian, harga, hpp, stok, tampil }]
 * Hasil: { baru, berubah: [{ baris, lama, perubahan: [{kolom, lama, baru}] }], sama, tidakAdaDiFile }
 */
export function bandingkan(baris, sekarang) {
  const byCode = new Map(sekarang.map((v) => [v.code, v]));
  const byKunci = new Map(sekarang.map((v) => [kunciVarian(v.aplikasi, v.tipe, v.varian), v]));
  const terpakai = new Set();
  const hasil = { baru: [], berubah: [], sama: [], tidakAdaDiFile: [], idTidakDikenal: [] };
  for (const b of baris) {
    let lama = b.code ? byCode.get(b.code) : byKunci.get(kunciVarian(b.aplikasi, b.tipe, b.varian));
    if (b.code && !lama) { hasil.idTidakDikenal.push(b); continue; }
    if (!lama) { hasil.baru.push(b); continue; }
    terpakai.add(lama.code);
    const perubahan = [];
    const cek = (kolom, lamaV, baruV) => { if (baruV !== undefined && baruV !== lamaV) perubahan.push({ kolom, lama: lamaV, baru: baruV }); };
    cek('Harga', lama.harga, b.harga);
    cek('HPP', lama.hpp ?? null, b.hapusHpp ? null : b.hpp);
    cek('Stok', lama.stok, b.stok);
    cek('Tampil di Web', lama.tampil, b.tampil);
    for (const k of ['kategori', 'aplikasi', 'tipe', 'varian']) if (b[k]) cek(NAMA_KOLOM[k], lama[k], b[k]);
    (perubahan.length ? hasil.berubah : hasil.sama).push(perubahan.length ? { baris: b, lama, perubahan } : b);
  }
  hasil.tidakAdaDiFile = sekarang.filter((v) => !terpakai.has(v.code));
  return hasil;
}

/** Bentuk baris yang dikirim ke RPC impor_katalog. Kunci yang tidak ada = "tidak diubah". */
export function keBarisRpc(b) {
  const o = {
    baris_excel: b.barisExcel, code: b.code, kategori: b.kategori, aplikasi: b.aplikasi, tipe: b.tipe, varian: b.varian,
    durasi_jumlah: b.durasi.durasiJumlah, durasi_satuan: b.durasi.durasiSatuan, durasi_hari: b.durasi.durasiHari,
    jumlah_user: b.durasi.jumlahUser, perangkat: b.durasi.perangkat,
    markup: b.markup, harga_manual: b.hargaManual, harga: b.harga,
  };
  if (b.hapusHpp) o.hpp = null;
  else if (b.hpp !== undefined) o.hpp = b.hpp;
  if (b.stok !== undefined) o.stok = b.stok;
  if (b.tampil !== undefined) o.tampil = b.tampil;
  if (b.catatan !== undefined) o.catatan = b.catatan;
  return o;
}

/** Ubah ke format katalog-cadangan.json lama ({cats:[{label,desc,apps:[{name,desc,groups:[{label,items:[{d,p,s}]}]}]}]}). Tanpa HPP. */
export function keKatalogJSON(baris, { aplikasi = {}, kategori = {} } = {}) {
  const cats = [];
  const cari = (arr, key, val, buat) => arr.find((x) => x[key] === val) ?? (arr.push(buat()), arr[arr.length - 1]);
  for (const b of baris) {
    if (b.tampil === false || b.harga == null) continue;
    const cat = cari(cats, 'label', b.kategori, () => ({ label: b.kategori, desc: kategori[b.kategori]?.deskripsi ?? '', apps: [] }));
    const app = cari(cat.apps, 'name', b.aplikasi, () => ({ name: b.aplikasi, desc: aplikasi[b.aplikasi]?.deskripsi ?? '', groups: [] }));
    const grp = cari(app.groups, 'label', b.tipe, () => ({ label: b.tipe, items: [] }));
    grp.items.push({ id: b.code ?? undefined, d: b.varian, p: b.harga, s: b.stok === 'habis' ? 0 : 1 });
  }
  return { cats, updated: new Date().toISOString().slice(0, 10) };
}
