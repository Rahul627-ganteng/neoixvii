// Saran bundle: meracik usulan bundle baru dari katalog asli (harga jual + HPP) dan penjualan 30 hari terakhir.
// Diadaptasi dari "Racik bundle" IXVII.CO: harga dihitung dari batas untung (margin & untung minimum), condong ke paket
// bermargin lebar dan yang sedang laris, lalu setiap usulan dinilai (Bagus / Layak / Perlu diperbaiki / Terlalu murah / Jangan dijual).
import { el, isian, q, rp, toast } from './alat.js';

const SIMPAN = 'ixvii-admin-saran';
const MOMEN = [['0.35', 'Promo harian'], ['0.55', 'Payday sale'], ['0.75', 'Flash sale'], ['0.9', 'Cuci gudang']];
const LABEL_MOMEN = { 0.35: 'PROMO HARI INI', 0.55: 'PAYDAY SALE', 0.75: 'FLASH SALE', 0.9: 'CUCI GUDANG' };
const JENIS = [['beda', 'Beda kategori (mis. Nonton + AI)'], ['sama', 'Kategori sama (mis. 2 aplikasi editing)'], ['campur', 'Campur'], ['durasi', 'Durasi panjang (hemat dibanding bulanan)']];

const TEMA = {
  Nonton: ['Maraton Akhir Pekan', 'Paket Begadang', 'Nonton Sampai Pagi', 'Paket Rebahan', 'Anti Bosan Sebulan', 'Malam Panjang'],
  Editing: ['Bengkel Konten', 'Studio Saku', 'Paket Sat-Set', 'Editing Komplit', 'Dapur Kreator', 'Ruang Edit'],
  AI: ['Otak Tambahan', 'Paket Mikir Cepat', 'Asisten Pribadi', 'Ruang Ide', 'Paket Sat-Set AI'],
  Edukasi: ['Paket Nugas', 'Skripsi Kelar', 'Deadline Aman', 'Belajar Tanpa Rem', 'Meja Belajar'],
  Musik: ['Teman Perjalanan', 'Paket Kuping', 'Musik Sepuasnya', 'Playlist Tanpa Henti'],
  Lainnya: ['Paket Iseng', 'Koleksi Random'],
};
const DUO = {
  'Editing+AI': ['Paket Konten Kreator', 'Duo Produktif', 'Bengkel Ide', 'Kreator Sat-Set'],
  'Edukasi+AI': ['Paket Anak Kuliah', 'Deadline Aman', 'Tugas Kelar Cepat', 'Otak Kedua'],
  'Nonton+Musik': ['Paket Rebahan', 'Hiburan Nonstop', 'Mata dan Telinga', 'Paket Healing'],
  'Nonton+Editing': ['Nonton dan Berkarya', 'Siang Ngedit Malam Nonton', 'Paket Kreator Santai'],
  'AI+Nonton': ['Hiburan Pintar', 'Santai Tapi Produktif'],
  'Editing+Musik': ['Paket Estetik', 'Konten dan Nada'],
  'Edukasi+Editing': ['Paket Tugas Kelar', 'Nugas Sambil Ngedit'],
  'Edukasi+Nonton': ['Belajar dan Rehat', 'Paket Anak Kos'],
};
const BANYAK = ['Paket Serba Bisa', 'Borongan Sebulan', 'Satu Paket Semua', 'Paket Komplit', 'Paket Segalanya', 'Seri XVII'];
const VIBE = {
  Nonton: ['Begadang', 'Maraton', 'Rebahan', 'Nonton Terus', 'Malam Panjang', 'Anti Bosan'],
  Editing: ['Sat-Set', 'Berkarya', 'Ngedit Santai', 'Dapur Konten', 'Rapi Terus'],
  AI: ['Mikir Cepat', 'Otak Tambahan', 'Sat-Set', 'Auto Kelar'],
  Edukasi: ['Nugas', 'Deadline Aman', 'Belajar Terus', 'Tugas Kelar'],
  Musik: ['Setel Terus', 'Kuping Senang', 'Teman Jalan'],
  Lainnya: ['Iseng', 'Serba Ada'],
};
const acak = (a) => a[Math.floor(Math.random() * a.length)];
const kocok = (a) => a.slice().sort(() => Math.random() - 0.5);

/** Lama paket dalam bulan (dari durasi_hari, atau dibaca dari label varian). null = selamanya/tidak diketahui. */
function bulan(v) {
  if (v.durasi_hari) return v.durasi_hari / 30;
  const s = String(v.varian || '').toLowerCase();
  if (/lifetime|permanen|selamanya/.test(s)) return null;
  let m = s.match(/(\d+)\s*(tahun|thn)/); if (m) return +m[1] * 12;
  m = s.match(/(\d+)\s*(bulan|bln)/); if (m) return +m[1];
  m = s.match(/(\d+)\s*(hari|days?)/); if (m) return +m[1] / 30;
  m = s.match(/(?:^|\s)(\d+)\s*b(?:\b|\s)/); if (m) return +m[1];
  return null;
}
const bulanan = (v) => { const b = bulan(v); return b !== null && b >= 0.9 && b <= 1.1; };

/** Harga bundle dari batas untung: lantai = max(HPP/(1-margin), HPP+untung min, batas bundle per paket). */
export function hargaSaran({ hpp, normal, batas = 0 }, { minM, minP, intensitas, bulat }) {
  const lantaiMargin = minM >= 100 ? Infinity : hpp / (1 - minM / 100);
  const lantai = Math.max(lantaiMargin, hpp + minP, batas);
  if (lantai > normal) return null;
  let p = normal - (normal - lantai) * intensitas;
  if (bulat === 900) {
    p = Math.floor(p / 1000) * 1000 + 900;
    if (p > normal) p -= 1000;
    while (p < lantai) p += 1000;
  } else {
    p = Math.floor(p / bulat) * bulat;
    while (p < lantai) p += bulat;
  }
  return p > normal || p < lantai ? null : p;
}

/** Penilaian satu bundle (dipakai saran & editor bundle). items: [{harga, hpp, kategori, qty}] */
export function penilaian(items, harga, { minM = 20, minP = 8000, p75 = Infinity, p90 = Infinity } = {}) {
  const hpp = items.reduce((s, i) => s + (i.hpp ?? 0) * (i.qty ?? 1), 0);
  const normal = items.reduce((s, i) => s + i.harga * (i.qty ?? 1), 0);
  const lantai = Math.ceil(Math.max(minM >= 100 ? Infinity : hpp / (1 - minM / 100), hpp + minP));
  const untung = harga - hpp;
  const margin = harga > 0 ? untung / harga : 0;
  const hemat = normal - harga;
  const disk = normal > 0 ? hemat / normal : 0;
  const n = items.reduce((s, i) => s + (i.qty ?? 1), 0);
  const poin = [];
  let skor = 0;
  if (untung < 0) poin.push([false, `Di bawah modal. Tiap bundle terjual kamu rugi ${rp(-untung)}.`]);
  else if (untung < minP) poin.push([false, `Untungnya cuma ${rp(untung)}, di bawah untung minimum ${rp(minP)}.`]);
  else if (margin * 100 < minM) poin.push([false, `Margin ${Math.round(margin * 100)}%, di bawah batas ${minM}%. Harga aman terendah ${rp(lantai)}.`]);
  else { poin.push([true, `Untung bersih ${rp(untung)} dengan margin ${Math.round(margin * 100)}%.`]); skor += 2; }
  if (harga > normal) poin.push([false, `Lebih mahal dari beli satuan (${rp(normal)}). Pembeli tidak punya alasan mengambilnya.`]);
  else if (disk < 0.05) poin.push([false, `Potongannya cuma ${Math.round(disk * 100)}%. Terlalu tipis untuk disebut promo.`]);
  else if (disk < 0.15) { poin.push([true, `Potongan ${Math.round(disk * 100)}% (hemat ${rp(hemat)}). Wajar untuk promo harian.`]); skor += 1; }
  else if (disk <= 0.35) { poin.push([true, `Potongan ${Math.round(disk * 100)}% (hemat ${rp(hemat)}). Cukup kuat untuk payday atau flash sale.`]); skor += 2; }
  else { poin.push([true, `Potongan ${Math.round(disk * 100)}% (hemat ${rp(hemat)}). Sangat agresif, cocok untuk cuci gudang.`]); skor += 1; }
  if (harga > p90) poin.push([false, `${rp(harga)} lebih mahal dari 90% paket satuan di katalogmu. Targetkan pembeli lama.`]);
  else if (harga > p75) poin.push([false, `${rp(harga)} masuk 25% termahal di katalogmu. Butuh alasan kuat supaya orang berani.`]);
  else { poin.push([true, `${rp(harga)} masih di rentang yang biasa dibayar pembelimu.`]); skor += 1; }
  if (n >= 4) poin.push([false, `${n} paket dalam satu bundle terlalu ramai. Orang jarang butuh semuanya.`]);
  else if (n <= 1 && items.length <= 1) poin.push([true, '1 paket durasi panjang: cocok untuk pembeli yang sudah pasti pakai lama.']);
  else { poin.push([true, `${n} paket, jumlah yang paling mudah dipahami pembeli.`]); skor += 1; }
  const kat = [...new Set(items.map((i) => i.kategori).filter(Boolean))];
  if (kat.length > 1) poin.push([true, `Menggabungkan ${kat.join(' dan ')}, jadi ada dua alasan berbeda untuk membeli.`]);
  let vonis, kelas, ringkas;
  if (untung < 0 || harga > normal) { vonis = 'Jangan dijual'; kelas = 'merah'; ringkas = 'Harga ini merugikanmu'; }
  else if (margin * 100 < minM || untung < minP) { vonis = 'Terlalu murah'; kelas = 'merah'; ringkas = `Naikkan ke ${rp(lantai)} atau lebih`; }
  else if (skor >= 5) { vonis = 'Bagus'; kelas = 'hijau'; ringkas = 'Untung aman, tawaran menarik'; }
  else if (skor >= 4) { vonis = 'Layak'; kelas = 'hijau'; ringkas = 'Bisa jalan, ada yang bisa diperbaiki'; }
  else { vonis = 'Perlu diperbaiki'; kelas = 'kuning'; ringkas = 'Untung aman, tapi tawarannya kurang meyakinkan'; }
  return { vonis, kelas, ringkas, poin, untung, margin, hemat, disk, hpp, normal, lantai };
}

function namaOtomatis(items, kat, dipakai) {
  const A = [...new Set(items.map((i) => i.aplikasi))];
  const bln = items.map(bulan).filter((x) => x != null).map(Math.round);
  const dur = bln.length && bln.every((x) => x === bln[0]) ? (bln[0] >= 12 ? 'Setahun' : bln[0] === 1 ? 'Sebulan' : `${bln[0]} Bulan`) : '';
  const vibe = acak(VIBE[items[0].kategori] || VIBE.Lainnya);
  const pola = [];
  if (kat.length === 1) pola.push(...kocok(TEMA[kat[0]] || []).slice(0, 2));
  else if (kat.length === 2) pola.push(...(DUO[`${kat[0]}+${kat[1]}`] || DUO[`${kat[1]}+${kat[0]}`] || []));
  else pola.push(...BANYAK);
  if (A.length === 2) pola.push(`${A[0]} x ${A[1]}`, `Duo ${A[0]} ${A[1]}`, `Kombo ${A[0]} ${A[1]}`);
  else if (A.length === 3) pola.push(`Trio ${A[0]} ${A[1]} ${A[2]}`, `${A[0]} dan Dua Temannya`);
  else if (A.length === 1) pola.push(`${A[0]}${dur ? ' ' + dur : ''} Hemat`, `Borongan ${A[0]}`, `${A[0]} Puas-Puas`);
  pola.push(`${vibe} bareng ${A[0]}`);
  if (dur) pola.push(`${vibe} ${dur}`);
  const urut = kocok(pola.filter(Boolean));
  for (const n of urut) { const k = n.toLowerCase(); if (!dipakai.has(k)) { dipakai.add(k); return n; } }
  return urut[0] || 'Bundle Hemat';
}

function caption(b, gaya, momen) {
  const hemat = b.normal - b.harga;
  const pct = Math.round((hemat / b.normal) * 100);
  const daftar = b.items.map((i) => `• ${i.aplikasi} ${i.tipe}, ${i.varian}`).join('\n');
  if (gaya === 'ig') return `${b.nama} ⚡\n\n${daftar}\n\nNormal ${rp(b.normal)}, sekarang ${rp(b.harga)}. Hemat ${rp(hemat)}.\n\nSemua akun bergaransi selama masa aktif. Order lewat link di bio.\n\n#akunpremium #premiummurah #${b.items[0].aplikasi.toLowerCase().replace(/[^a-z0-9]/g, '')} #promoakun`;
  if (gaya === 'story') return `${LABEL_MOMEN[momen] || 'PROMO'}\n${b.nama}\n\n${daftar}\n\n${rp(b.normal)} → ${rp(b.harga)}\nHEMAT ${pct}%\n\nOrder di ixviico.shop/promo`;
  return `⚡ ${LABEL_MOMEN[momen] || 'PROMO'} IXVII.CO ⚡\n\n${b.nama.toUpperCase()}\n${daftar}\n\n${b.eceran && b.eceran > b.normal ? `Kalau beli bulanan ${b.bulan} kali: ${rp(b.eceran)}\n` : ''}Harga normal: ${rp(b.normal)}\nHarga bundle: ${rp(b.harga)}\nHemat ${rp(hemat)} (${pct}%)\n\nGaransi selama masa aktif, dibantu sampai bisa login.\nOrder: ixviico.shop/promo`;
}

/**
 * Kartu "Saran bundle" di menu Promo & bundle.
 * ctx: { supabase, varian (v_katalog_admin + kategori), promos, adaHitung, kodeKeId, muatUlang }
 */
export function kartuSaran(ctx, bundles) {
  const { supabase } = ctx;
  let simpan = {};
  try { simpan = JSON.parse(localStorage.getItem(SIMPAN) || '{}'); } catch { /* abaikan */ }
  const kolam = ctx.varian.filter((v) => v.tampil && v.stok !== 'habis' && (v.stok_jumlah == null || v.stok_jumlah > 0) && v.hpp != null && v.harga > 0);
  const kategori = [...new Set(kolam.map((v) => v.kategori).filter(Boolean))];
  const hargaUrut = ctx.varian.filter((v) => v.tampil).map((v) => v.harga).sort((a, b) => a - b);
  const persentil = (x) => hargaUrut[Math.min(hargaUrut.length - 1, Math.floor(hargaUrut.length * x))] ?? Infinity;
  const P75 = persentil(0.75), P90 = persentil(0.9);
  const namaAda = new Set(bundles.map((b) => String(b.name || '').toLowerCase()));
  let laku = {};
  let hasil = [];

  const fJenis = el('select', {}, JENIS.map(([k, l]) => el('option', { value: k, selected: k === (simpan.jenis || 'beda') }, l)));
  const fIsi = el('select', {}, [['2', '2 aplikasi'], ['3', '3 aplikasi'], ['mix', '2 atau 3']].map(([k, l]) => el('option', { value: k, selected: k === (simpan.isi || '2') }, l)));
  const fMomen = el('select', {}, MOMEN.map(([k, l]) => el('option', { value: k, selected: k === (simpan.momen || '0.55') }, l)));
  const fBulat = el('select', {}, [['1000', 'Ribuan (Rp1.000)'], ['5000', 'Rp5.000'], ['900', 'Akhiran 900 (mis. 49.900)']].map(([k, l]) => el('option', { value: k, selected: k === (simpan.bulat || '1000') }, l)));
  const fMinM = el('input', { type: 'number', min: 0, max: 90, value: simpan.minM ?? 20 });
  const fMinP = el('input', { type: 'number', min: 0, step: 500, value: simpan.minP ?? 8000 });
  const fJumlah = el('input', { type: 'number', min: 1, max: 12, value: simpan.jumlah ?? 6 });
  const fLaris = el('input', { type: 'checkbox', checked: simpan.laris !== false });
  const aktifKat = new Set(simpan.kat?.length ? simpan.kat.filter((k) => kategori.includes(k)) : kategori);
  const chipKat = el('div', { class: 'row', style: 'gap:6px' });
  const gambarChip = () => chipKat.replaceChildren(...kategori.map((k) => {
    const b = el('button', { type: 'button', class: 'kecil ' + (aktifKat.has(k) ? '' : 'sec'), 'aria-pressed': String(aktifKat.has(k)) }, k);
    b.addEventListener('click', () => { if (aktifKat.has(k)) aktifKat.delete(k); else aktifKat.add(k); gambarChip(); });
    return b;
  }));
  gambarChip();
  const pesan = el('div');
  const daftar = el('div', { class: 'saran-daftar' });
  const tombol = el('button', { type: 'button' }, 'Buat saran bundle');

  const cfg = () => ({ minM: Number(fMinM.value) || 0, minP: Number(fMinP.value) || 0, intensitas: Number(fMomen.value), bulat: Number(fBulat.value) });
  const bobot = (v) => Math.pow(Math.max(0.05, (v.harga - v.hpp) / v.harga), 2) * (fLaris.checked ? 1 + Math.log1p(laku[v.code] || 0) : 1);
  const ambilBerbobot = (pool) => {
    const total = pool.reduce((s, v) => s + bobot(v), 0);
    let r = Math.random() * total;
    for (const v of pool) { r -= bobot(v); if (r <= 0) return v; }
    return pool.at(-1);
  };
  const jadi = (items, jenis, kat, extra = {}) => {
    const hpp = items.reduce((s, v) => s + v.hpp, 0);
    const normal = items.reduce((s, v) => s + v.harga, 0);
    const batas = items.reduce((s, v) => s + (v.batas_bundle ?? 0), 0);
    const harga = hargaSaran({ hpp, normal, batas }, cfg());
    if (harga == null || (normal - harga) / normal < 0.05) return null;
    return { jenis, items, kat, hpp, normal, harga, nama: namaOtomatis(items, kat, namaPakai), ...extra };
  };
  let namaPakai = new Set();

  function kombo(sama) {
    let size = fIsi.value === 'mix' ? (Math.random() < 0.5 ? 2 : 3) : Number(fIsi.value);
    const items = [], pakai = new Set();
    let kat;
    if (sama) {
      const katPool = [...aktifKat].filter((k) => new Set(kolam.filter((v) => v.kategori === k && bulanan(v)).map((v) => v.aplikasi)).size >= 2);
      if (!katPool.length) return null;
      const k = acak(katPool);
      size = Math.min(size, new Set(kolam.filter((v) => v.kategori === k && bulanan(v)).map((v) => v.aplikasi)).size);
      for (let n = 0; n < size; n++) {
        const pool = kolam.filter((v) => v.kategori === k && bulanan(v) && !pakai.has(v.aplikasi));
        if (!pool.length) return null;
        const v = ambilBerbobot(pool); pakai.add(v.aplikasi); items.push(v);
      }
      kat = [k];
    } else {
      const katPool = [...aktifKat].filter((k) => kolam.some((v) => v.kategori === k && bulanan(v)));
      size = Math.min(size, katPool.length);
      if (size < 2) return null;
      kat = kocok(katPool).slice(0, size);
      for (const k of kat) {
        const pool = kolam.filter((v) => v.kategori === k && bulanan(v) && !pakai.has(v.aplikasi));
        if (!pool.length) return null;
        const v = ambilBerbobot(pool); pakai.add(v.aplikasi); items.push(v);
      }
    }
    return jadi(items, sama ? 'sama' : 'kombo', kat);
  }
  // paket panjang vs beli bulanan
  const PASANGAN = (() => {
    const g = {};
    for (const v of kolam) (g[`${v.aplikasi}|${v.tipe}`] ||= []).push(v);
    const out = [];
    for (const list of Object.values(g)) {
      const dasar = list.find(bulanan);
      if (!dasar) continue;
      for (const v of list) {
        const m = bulan(v);
        if (m && m >= 2.5 && v !== dasar) out.push({ dasar, panjang: v, bulan: Math.round(m), murah: v.harga / (dasar.harga * Math.round(m)) < 0.75 });
      }
    }
    return out;
  })();
  function durasi() {
    const pool = PASANGAN.filter((p) => aktifKat.has(p.panjang.kategori));
    if (!pool.length) return null;
    const p = acak(pool);
    return jadi([p.panjang], 'durasi', [p.panjang.kategori], { bulan: p.bulan, eceran: p.murah ? null : p.dasar.harga * p.bulan });
  }

  async function buat() {
    try { localStorage.setItem(SIMPAN, JSON.stringify({ jenis: fJenis.value, isi: fIsi.value, momen: fMomen.value, bulat: fBulat.value, minM: fMinM.value, minP: fMinP.value, jumlah: fJumlah.value, laris: fLaris.checked, kat: [...aktifKat] })); } catch { /* abaikan */ }
    if (!aktifKat.size) { pesan.replaceChildren(el('div', { class: 'msg warn' }, 'Pilih minimal satu kategori.')); return; }
    if (fJenis.value === 'beda' && aktifKat.size < 2) { pesan.replaceChildren(el('div', { class: 'msg warn' }, 'Beda kategori butuh minimal dua kategori aktif.')); return; }
    if (fLaris.checked && !Object.keys(laku).length) laku = await q(supabase.rpc('laku_varian', { p_hari: 30 })).catch(() => ({}));
    const jumlah = Math.min(12, Math.max(1, Number(fJumlah.value) || 6));
    const out = [], lihat = new Set();
    namaPakai = new Set(namaAda);
    for (let coba = 0; out.length < jumlah && coba < 1500; coba++) {
      const j = fJenis.value;
      const b = j === 'durasi' ? durasi() : j === 'sama' ? kombo(true) : j === 'campur' ? (Math.random() < 0.3 ? durasi() : kombo(Math.random() < 0.5)) : kombo(false);
      if (!b) continue;
      const tanda = b.items.map((v) => v.code).sort().join('|');
      if (lihat.has(tanda)) continue;
      lihat.add(tanda); out.push(b);
    }
    hasil = out;
    const c = cfg();
    pesan.replaceChildren(out.length === jumlah
      ? el('div', { class: 'msg ok' }, `${out.length} saran, semuanya lolos margin minimum ${c.minM}% dan untung minimum ${rp(c.minP)}. Harga sudah memperhitungkan batas bundle per paket.`)
      : el('div', { class: 'msg warn' }, out.length ? `Baru ${out.length} saran yang lolos batas untung. Longgarkan sedikit batasannya untuk dapat lebih banyak.`
        : 'Tidak ada kombinasi yang lolos. Turunkan margin minimum, kecilkan untung minimum, pilih momen promo yang lebih tipis, atau aktifkan kategori lain.'));
    gambar();
  }

  function kartu(b) {
    const nilai = penilaian(b.items.map((v) => ({ harga: v.harga, hpp: v.hpp, kategori: v.kategori })), b.harga, { ...cfg(), p75: P75, p90: P90 });
    const hemat = b.normal - b.harga, untung = b.harga - b.hpp;
    const wH = (b.hpp / b.normal) * 100, wU = (untung / b.normal) * 100, wD = (hemat / b.normal) * 100;
    const nama = el('input', { type: 'text', value: b.nama, 'aria-label': 'Nama bundle' });
    nama.addEventListener('change', () => { b.nama = nama.value.trim() || b.nama; });
    const harga = el('input', { type: 'number', min: 1000, step: 500, value: b.harga, style: 'width:120px', 'aria-label': 'Harga bundle' });
    harga.addEventListener('change', () => { b.harga = Math.max(1000, Math.round(Number(harga.value) || b.harga)); gambar(); });
    const acakNama = el('button', { type: 'button', class: 'sec kecil' }, 'Acak nama');
    acakNama.addEventListener('click', () => { b.nama = namaOtomatis(b.items, b.kat, namaPakai); nama.value = b.nama; });
    // teks promo
    const teks = el('textarea', { rows: 8, class: 'saran-teks', hidden: true });
    const gayaB = (g, l) => el('button', { type: 'button', class: 'sec kecil', onclick: () => { teks.hidden = false; salin.classList.remove('hidden'); teks.value = caption(b, g, Number(fMomen.value)); } }, l);
    const salin = el('button', { type: 'button', class: 'kecil hidden' }, 'Salin teks');
    salin.addEventListener('click', async () => { try { await navigator.clipboard.writeText(teks.value); toast('Teks disalin'); } catch { teks.select(); } });
    // jadikan bundle
    const kampanye = el('select', { 'aria-label': 'Masukkan ke kampanye' }, el('option', { value: '' }, 'Bundle biasa (bukan kampanye)'),
      (ctx.promos || []).filter((p) => p.is_active !== false).map((p) => el('option', { value: p.id }, `Kampanye: ${p.title}`)));
    const tampil = el('input', { type: 'checkbox' });
    const jadikan = el('button', { type: 'button', class: 'kecil' }, 'Jadikan bundle');
    jadikan.addEventListener('click', async () => {
      if (nilai.kelas === 'merah' && !confirm(`Penilaian: ${nilai.vonis}. ${nilai.ringkas}. Tetap simpan?`)) return;
      jadikan.disabled = true;
      try {
        const isi = {
          name: b.nama.trim(), description: b.jenis === 'durasi' && b.eceran ? `Lebih hemat dari beli bulanan ${b.bulan}× (${rp(b.eceran)}).` : null,
          price: b.harga, harga_tetap: false, is_active: tampil.checked, best_deal: false, promo_id: kampanye.value ? Number(kampanye.value) : null,
          sort: (bundles.length + 1) * 10, updated_at: new Date().toISOString(),
        };
        if (ctx.adaHitung) isi.hitung_mundur = false;
        const baru = await q(supabase.from('bundles').insert(isi).select().single());
        await q(supabase.from('bundle_items').insert(b.items.map((v) => ({ bundle_id: baru.id, variant_id: ctx.kodeKeId.get(v.code), qty: 1 }))));
        toast(tampil.checked ? 'Bundle dibuat dan tampil di halaman Promo' : 'Bundle dibuat sebagai draf. Atur tanggal & tampilkan di "Bundle harga tetap".');
        ctx.muatUlang?.();
      } catch (err) { toast('Gagal: ' + err.message, true); jadikan.disabled = false; }
    });
    const larisItem = b.items.filter((v) => laku[v.code]);
    return el('article', { class: 'saran-kartu' },
      el('div', { class: 'saran-atas' },
        el('div', { class: 'saran-nama' }, el('div', { class: 'row', style: 'gap:6px' }, nama, acakNama),
          el('div', { class: 'muted', style: 'font-size:12.5px;margin-top:4px' }, b.jenis === 'durasi'
            ? `Paket ${b.bulan} bulan${b.eceran ? `, setara ${rp(b.eceran)} kalau beli bulanan` : ''}`
            : `${b.items.length} aplikasi · ${b.kat.join(' + ')}`)),
        el('div', { class: 'saran-harga' }, el('label', { class: 'muted', style: 'font-size:12px' }, 'Harga bundle'), harga,
          el('s', { class: 'muted' }, rp(b.normal)), el('b', { class: 'hijau-teks' }, `Hemat ${rp(hemat)} (${Math.round((hemat / b.normal) * 100)}%)`))),
      el('ul', { class: 'saran-item' }, b.items.map((v) => el('li', {}, el('b', {}, v.aplikasi), ` ${v.tipe} · ${v.varian}`, el('span', {}, rp(v.harga)),
        laku[v.code] ? el('span', { class: 'tag hijau' }, `laku ${laku[v.code]}× / 30 hari`) : null))),
      el('div', { class: 'saran-bar', 'aria-hidden': 'true' }, el('i', { class: 'h', style: `width:${wH.toFixed(1)}%` }), el('i', { class: 'u', style: `width:${Math.max(0, wU).toFixed(1)}%` }), el('i', { class: 'd', style: `width:${wD.toFixed(1)}%` })),
      el('div', { class: 'saran-angka' },
        el('span', {}, 'Modal ', el('b', {}, rp(b.hpp))), el('span', {}, 'Untung ', el('b', {}, rp(untung))),
        el('span', {}, 'Margin ', el('b', {}, `${Math.round((untung / b.harga) * 100)}%`)), el('span', {}, 'Diskon ', el('b', {}, rp(hemat)))),
      b.items.some((v) => v.hpp === 0) ? el('div', { class: 'msg warn', style: 'margin:8px 0 0' }, 'Ada paket ber-HPP 0, untung sebenarnya bisa lebih kecil.') : null,
      el('details', { class: 'saran-nilai' }, el('summary', {}, el('span', { class: 'tag ' + nilai.kelas }, nilai.vonis), ' ', el('span', { class: 'muted' }, nilai.ringkas),
        larisItem.length ? el('span', { class: 'muted' }, ' · berisi paket yang sedang laris') : null),
      el('ul', {}, nilai.poin.map(([ya, t]) => el('li', { class: ya ? 'ya' : 'tidak' }, t)))),
      el('div', { class: 'row', style: 'margin-top:10px;gap:6px' }, el('span', { class: 'muted' }, 'Teks promo:'), gayaB('wa', 'WhatsApp'), gayaB('ig', 'Instagram'), gayaB('story', 'Story'), salin),
      teks,
      el('div', { class: 'row saran-aksi' }, kampanye, el('label', { class: 'row muted' }, tampil, 'langsung tampil'), jadikan));
  }
  const gambar = () => daftar.replaceChildren(...hasil.map(kartu));
  tombol.addEventListener('click', buat);

  return el('section', { class: 'card', id: 'saranBundle' },
    el('h2', {}, 'Saran bundle baru'),
    el('p', { class: 'sub' }, 'Usulan bundle dari katalog dan HPP aslimu. Harga dihitung supaya tetap di atas batas untung, condong ke paket bermargin lebar dan yang laku 30 hari terakhir. Setiap usulan diberi penilaian dan teks promo siap kirim. Klik "Jadikan bundle" untuk menyimpannya (bisa sebagai draf atau langsung masuk kampanye).'),
    el('div', { class: 'grid2' }, isian('Susunan', fJenis), isian('Isi bundle', fIsi), isian('Momen promo', fMomen), isian('Pembulatan harga', fBulat),
      isian('Margin minimum (%)', fMinM), isian('Untung minimum (Rp)', fMinP), isian('Jumlah saran', fJumlah),
      el('label', { class: 'row muted', style: 'align-self:end' }, fLaris, 'Utamakan paket yang laris 30 hari terakhir')),
    el('div', { style: 'margin:10px 0' }, el('label', { class: 'f' }, 'Kategori'), chipKat),
    el('div', { class: 'row' }, tombol), pesan, daftar);
}
