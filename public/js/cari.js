// Pencarian cepat di header: satu kotak untuk mencari aplikasi, kategori, bundle & promo,
// produk digital, artikel blog, FAQ, dan halaman situs. Dibuka lewat ikon kaca pembesar,
// tombol "/" atau Ctrl/⌘ + K. Data baru diambil saat pertama kali dibuka (halaman tetap ringan).
import { ambilBerita, ambilFaqUmum, ambilKatalog, ambilProduk, ambilPromo } from './api.js';
import { harga, inggris, labelTipe, t } from './i18n.js';
import { urlBerita } from './blog-kartu.js';
import { el, ikonApp, urlApp, urlKategori } from './ui.js';

const KUNCI_RIWAYAT = 'ixvii-cari-riwayat';
const pilih = (id, en) => (inggris() && en ? en : id);

// ---------------------------------------------------------------- pencocokan teks
/** huruf kecil, tanpa aksen & tanda baca, supaya "Disney+" ketemu dengan "disney". */
const rapikan = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\+/g, ' plus ').replace(/[^a-z0-9]+/g, ' ').trim();

// kata yang orang ketik ≠ kata di katalog: perluas dengan padanannya
const PADANAN = {
  nonton: 'streaming film series netflix disney vidio viu prime', film: 'streaming nonton', drakor: 'viu streaming nonton',
  musik: 'music spotify apple', lagu: 'musik spotify', desain: 'design canva', design: 'desain canva',
  edit: 'editing capcut lightroom canva', video: 'capcut editing', foto: 'lightroom editing photo', photo: 'foto lightroom',
  ai: 'chatgpt gemini perplexity claude', gpt: 'chatgpt', chat: 'chatgpt', belajar: 'edukasi education buku', buku: 'perlego ebook baca',
  kuliah: 'edukasi perlego', skripsi: 'perlego edukasi', murah: 'promo bundle diskon hemat', diskon: 'promo bundle hemat',
  hemat: 'promo bundle', paket: 'bundle', patungan: 'sharing', bareng: 'sharing', sendiri: 'private', pribadi: 'private',
  garansi: 'garansi refund klaim', refund: 'garansi', bayar: 'qris pembayaran', jualan: 'reseller affiliate', komisi: 'affiliate',
};

/** Ubah kueri jadi daftar kata (plus padanannya, bobot lebih rendah). */
function kataKueri(q) {
  const utama = rapikan(q).split(' ').filter(Boolean);
  const tambahan = utama.flatMap((k) => (PADANAN[k] ? PADANAN[k].split(' ') : []));
  return { utama, tambahan: tambahan.filter((k) => !utama.includes(k)) };
}

/** Jarak edit ≤ 1 (salah ketik satu huruf): "netflik" tetap ketemu "netflix". */
function mirip(a, b) {
  if (Math.abs(a.length - b.length) > 1 || a.length < 4) return false;
  let i = 0, j = 0, beda = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++beda > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return beda + (a.length - i) + (b.length - j) <= 1;
}

/** Skor satu kata kueri terhadap teks: awal judul > awal kata > di dalam kata > salah ketik. */
function skorKata(k, judul, isi, longgar = true) {
  if (judul.startsWith(k)) return 10;
  const kataJudul = judul.split(' ');
  if (kataJudul.some((w) => w.startsWith(k))) return 8;
  if (k.length >= 3 && judul.includes(k)) return 6;
  const kataIsi = isi.split(' ');
  if (kataIsi.some((w) => w.startsWith(k))) return 4;
  if (k.length >= 3 && isi.includes(k)) return 2;
  if (!longgar) return 0;   // padanan kata: tanpa toleransi salah ketik
  if (kataJudul.some((w) => mirip(k, w))) return 5;
  if (kataIsi.some((w) => mirip(k, w))) return 1.5;
  return 0;
}

/** Semua kata utama harus cocok (di judul atau isi); padanan hanya menambah skor. */
function skor(item, { utama, tambahan }) {
  let total = 0;
  for (const k of utama) {
    const s = Math.max(skorKata(k, item.j, item.i), ...((PADANAN[k] || '').split(' ').filter(Boolean).map((p) => skorKata(p, item.j, item.i, false) * 0.6)));
    if (!s) return 0;
    total += s;
  }
  for (const k of tambahan) total += skorKata(k, item.j, item.i, false) * 0.2;
  return total + (item.bobot || 0);
}

// ---------------------------------------------------------------- indeks
let indeks = null;
let memuat = null;

const HALAMAN = () => [
  ['/katalog/', t('nav.katalog'), 'katalog semua aplikasi daftar harga'],
  ['/promo/', t('nav.promo'), 'promo diskon bundle hemat kampanye'],
  ['/rakit/', t('nav.rakit'), 'rakit bundle sendiri gabung aplikasi diskon otomatis'],
  ['/produk/', t('nav.produk'), 'produk digital ebook template preset'],
  ['/film/', t('nav.film'), 'info film series tayang streaming'],
  ['/blog/', t('nav.blog'), 'blog berita artikel tips'],
  ['/testimoni/', t('nav.testimoni'), 'testimoni ulasan review pembeli'],
  ['/reseller/', pilih('Jadi Reseller', 'Become a Reseller'), 'reseller jualan bisnis toko sendiri mentoring hpp'],
  ['/affiliate/', t('nav.affiliator'), 'affiliate affiliator komisi gratis jualan uang jajan'],
  ['/member/', t('nav.member'), 'member akun poin kupon daftar masuk'],
  ['/langganan/', pilih('Langganan Saya', 'My Subscriptions'), 'langganan saya perpanjang masa aktif cek pesanan'],
  ['/garansi-refund/', pilih('Garansi & Refund', 'Warranty & Refund'), 'garansi refund klaim aturan'],
  ['/tentang/', pilih('Tentang IXVII.CO', 'About IXVII.CO'), 'tentang kami owner profil kontak'],
  ['/syarat/', pilih('Syarat & Ketentuan', 'Terms'), 'syarat ketentuan aturan'],
  ['/privasi/', pilih('Kebijakan Privasi', 'Privacy'), 'privasi data'],
];

async function bangunIndeks() {
  const [katalog, promo, berita, produk, faq] = await Promise.all([
    ambilKatalog().catch(() => null), ambilPromo(), ambilBerita({ batas: 60 }), ambilProduk(), ambilFaqUmum(),
  ]);
  const item = [];
  const tambah = (o) => item.push({ ...o, j: rapikan(o.judul), i: rapikan(o.cari) });

  for (const a of katalog?.apps ?? []) {
    tambah({ jenis: 'app', judul: a.nama, href: urlApp(a.slug), app: a, bobot: a.unggulan ? 1 : 0,
      sub: [a.kategori, a.tipe.map(labelTipe).join(' · ')].filter(Boolean).join(' · '),
      cari: [a.kategori, a.kunciKategori, a.desc, ...a.tipe, ...a.varian.map((v) => v.d)].join(' '),
      kanan: a.habisSemua ? t('cari.habis') : a.hargaMulai != null ? t('cari.mulai', { h: harga(a.hargaMulai) }) : '' });
  }
  for (const k of katalog?.kategori ?? []) {
    tambah({ jenis: 'kategori', judul: k.label, href: urlKategori(k.kunci), sub: t('cari.jumlahApp', { n: k.jumlah }), cari: `${k.kunci} ${k.desc ?? ''} kategori` });
  }
  const hari = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const masih = (x) => !x.ends || x.ends >= hari;
  for (const b of (promo?.bundles ?? []).filter(masih)) {
    tambah({ jenis: 'promo', judul: pilih(b.name, b.name_en), href: `/promo/?k=${encodeURIComponent(b.kelompok || 'lainnya')}`, bobot: b.best ? 1.5 : 0.5,
      sub: (b.items ?? []).map((i) => i.app).join(' + '), cari: `bundle paket promo ${(b.items ?? []).map((i) => `${i.app} ${i.tipe} ${i.d}`).join(' ')}`,
      kanan: b.habis ? t('cari.habis') : b.price ? harga(b.price) : '' });
  }
  for (const p of (promo?.promos ?? []).filter(masih)) {
    tambah({ jenis: 'promo', judul: pilih(p.title, p.title_en), href: `/promo/?k=${encodeURIComponent(p.kelompok || 'lainnya')}`, bobot: 0.5,
      sub: p.lencana || t('nav.promo'), cari: `promo diskon ${p.lencana ?? ''} ${pilih(p.body ?? '', p.body_en ?? '')}` });
  }
  for (const p of produk?.produk ?? []) {
    const h = p.promo ? p.promo.harga : p.harga;
    tambah({ jenis: 'produk', judul: p.nama, href: `/produk/?p=${encodeURIComponent(p.slug)}`, sub: [p.kategori, p.format].filter(Boolean).join(' · ') || t('nav.produk'),
      cari: `produk digital ebook ${p.kategori ?? ''} ${p.format ?? ''} ${p.sub ?? ''}`, kanan: h ? harga(h) : '' });
  }
  for (const b of berita ?? []) {
    tambah({ jenis: 'artikel', judul: pilih(b.title, b.title_en), href: urlBerita(b.slug),
      sub: b.apps?.name || t('nav.blog'), cari: `artikel blog berita ${b.apps?.name ?? ''} ${b.topik ?? ''} ${pilih(b.excerpt ?? '', b.excerpt_en ?? '')}` });
  }
  for (const f of faq ?? []) {
    tambah({ jenis: 'faq', judul: pilih(f.question, f.question_en), href: '/#faq', sub: 'FAQ', cari: `faq tanya ${pilih(f.answer, f.answer_en)}` });
  }
  for (const [href, judul, kata] of HALAMAN()) tambah({ jenis: 'halaman', judul, href, sub: t('cari.halaman'), cari: kata });
  return { item, apps: katalog?.apps ?? [] };
}

const URUT_JENIS = ['app', 'promo', 'kategori', 'produk', 'artikel', 'faq', 'halaman'];
const BATAS = { app: 6, promo: 3, kategori: 3, produk: 3, artikel: 3, faq: 3, halaman: 3 };

function cari(q) {
  const kueri = kataKueri(q);
  if (!kueri.utama.length || !indeks) return [];
  const hasil = indeks.item.map((it) => ({ it, s: skor(it, kueri) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const per = new Map();
  for (const { it } of hasil) {
    const d = per.get(it.jenis) ?? [];
    if (d.length < BATAS[it.jenis]) { d.push(it); per.set(it.jenis, d); }
  }
  // kelompok dengan hasil terbaik tampil paling atas
  const terbaik = new Map(); hasil.forEach(({ it, s }) => { if (!terbaik.has(it.jenis)) terbaik.set(it.jenis, s); });
  return URUT_JENIS.filter((j) => per.has(j)).sort((a, b) => terbaik.get(b) - terbaik.get(a)).map((j) => [j, per.get(j)]);
}

// ---------------------------------------------------------------- riwayat
const riwayat = () => { try { return JSON.parse(localStorage.getItem(KUNCI_RIWAYAT) || '[]'); } catch { return []; } };
function ingat(q) {
  const k = q.trim(); if (k.length < 2) return;
  try { localStorage.setItem(KUNCI_RIWAYAT, JSON.stringify([k, ...riwayat().filter((r) => r.toLowerCase() !== k.toLowerCase())].slice(0, 5))); } catch { /* abaikan */ }
}

// ---------------------------------------------------------------- tampilan
const NS = 'http://www.w3.org/2000/svg';
const IKON_JENIS = {
  promo: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01',
  kategori: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  produk: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM20 17v4H6.5',
  artikel: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',
  faq: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  halaman: 'M5 12h14M13 6l6 6-6 6',
  riwayat: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
};
export const IKON_CARI = ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'];
function garis(d) {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  for (const p of [].concat(d)) {
    const path = document.createElementNS(NS, 'path'); path.setAttribute('d', p); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round'); s.append(path);
  }
  return s;
}

/** Tebalkan bagian judul yang cocok dengan kueri. */
function sorot(judul, q) {
  const kata = rapikan(q).split(' ').filter((k) => k.length > 1);
  if (!kata.length) return [judul];
  const pola = new RegExp(`(${kata.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return judul.split(pola).map((bag, i) => (i % 2 ? el('mark', {}, bag) : bag));
}

let panel = null, input = null, daftar = null, pemicu = null, aktif = -1, tautan = [];

function tutup() {
  if (!panel) return;
  panel.classList.remove('buka');
  document.documentElement.classList.remove('cari-buka');
  const p = panel; panel = null;
  setTimeout(() => p.remove(), 180);
  pemicu?.setAttribute('aria-expanded', 'false');
  pemicu?.focus();
}

function pilihAktif(i) {
  aktif = Math.max(-1, Math.min(i, tautan.length - 1));
  tautan.forEach((a, n) => a.setAttribute('aria-selected', n === aktif ? 'true' : 'false'));
  if (aktif >= 0) { input.setAttribute('aria-activedescendant', tautan[aktif].id); tautan[aktif].scrollIntoView({ block: 'nearest' }); }
  else input.removeAttribute('aria-activedescendant');
}

function baris(it, q, n) {
  const ikon = it.jenis === 'app' ? ikonApp(it.app) : el('span', { class: 'cari-ikon' }, garis(IKON_JENIS[it.jenis]));
  return el('a', { class: 'cari-hasil', href: it.href, id: `cari-h${n}`, role: 'option', 'aria-selected': 'false',
    onclick: () => ingat(input.value || it.judul) },
  ikon,
  el('span', { class: 'cari-teks' }, el('b', {}, ...sorot(it.judul, q)), it.sub ? el('small', {}, it.sub) : null),
  it.kanan ? el('span', { class: 'cari-kanan' }, it.kanan) : null);
}

function gambar() {
  const q = input.value.trim();
  aktif = -1; tautan = [];
  if (!q) {
    const r = riwayat();
    const populer = (indeks?.apps ?? []).filter((a) => a.unggulan && !a.habisSemua).slice(0, 6);
    daftar.replaceChildren(
      r.length ? el('div', { class: 'cari-grup' }, el('p', { class: 'cari-label' }, t('cari.terakhir')),
        el('div', { class: 'cari-chip' }, ...r.map((k) => el('button', { type: 'button', onclick: () => { input.value = k; gambar(); } }, garis(IKON_JENIS.riwayat), k)))) : null,
      el('div', { class: 'cari-grup' }, el('p', { class: 'cari-label' }, t('cari.coba')),
        el('div', { class: 'cari-chip' }, ...[...populer.map((a) => a.nama), t('cari.saranPromo'), t('cari.saranAi'), 'Reseller']
          .map((k) => el('button', { type: 'button', onclick: () => { input.value = k; gambar(); } }, k)))),
      memuat && !indeks ? el('p', { class: 'cari-kosong' }, t('cari.memuat')) : null);
    return;
  }
  if (!indeks) { daftar.replaceChildren(el('p', { class: 'cari-kosong' }, t('cari.memuat'))); return; }
  const grup = cari(q);
  let n = 0;
  const isi = grup.map(([jenis, it]) => el('div', { class: 'cari-grup', role: 'group', 'aria-label': t(`cari.j.${jenis}`) },
    el('p', { class: 'cari-label' }, t(`cari.j.${jenis}`)), ...it.map((x) => baris(x, q, n++))));
  const semua = el('a', { class: 'cari-hasil cari-semua', href: `/katalog/?q=${encodeURIComponent(q)}`, id: `cari-h${n}`, role: 'option', 'aria-selected': 'false', onclick: () => ingat(q) },
    el('span', { class: 'cari-ikon' }, garis(IKON_CARI)), el('span', { class: 'cari-teks' }, el('b', {}, t('cari.semua', { q }))));
  daftar.replaceChildren(...(isi.length ? isi : [el('p', { class: 'cari-kosong' }, t('cari.nihil', { q }))]), semua);
  tautan = [...daftar.querySelectorAll('.cari-hasil')];
  if (isi.length) pilihAktif(0);
}

export function bukaCari() {
  if (panel) { input.focus(); return; }
  input = el('input', { type: 'search', class: 'cari-input', placeholder: t('cari.placeholder'), 'aria-label': t('cari.label'),
    autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search', role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'cari-daftar', 'aria-autocomplete': 'list' });
  daftar = el('div', { class: 'cari-daftar', id: 'cari-daftar', role: 'listbox', 'aria-label': t('cari.label') });
  panel = el('div', { class: 'cari-lapis', onclick: (e) => { if (e.target === e.currentTarget) tutup(); } },
    el('div', { class: 'cari-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('cari.label') },
      el('div', { class: 'cari-kepala' }, el('span', { class: 'cari-ikon-input' }, garis(IKON_CARI)), input,
        el('button', { type: 'button', class: 'cari-tutup', onclick: tutup, 'aria-label': t('pasang.tutup') }, 'Esc')),
      daftar,
      el('div', { class: 'cari-kaki' }, el('span', {}, el('kbd', {}, '↑'), el('kbd', {}, '↓'), ' ', t('cari.pindah')), el('span', {}, el('kbd', {}, '↵'), ' ', t('cari.buka')))));
  input.addEventListener('input', gambar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); pilihAktif(aktif + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pilihAktif(aktif - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const tuju = tautan[aktif] ?? tautan.at(-1);
      if (tuju) { ingat(input.value); location.href = tuju.href; }
    }
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); tutup(); }
    if (e.key === 'Tab') {   // fokus tetap di dalam panel
      const f = [...panel.querySelectorAll('input, button, a[href]')];
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.body.append(panel);
  document.documentElement.classList.add('cari-buka');
  pemicu?.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => { panel?.classList.add('buka'); input.focus(); });
  gambar();
  if (!indeks) {
    memuat ??= bangunIndeks().then((x) => { indeks = x; }).catch(() => { indeks = { item: [], apps: [] }; });
    memuat.then(() => { if (panel) gambar(); });
  }
}

/** Tombol kaca pembesar untuk header + pintasan keyboard. */
export function tombolCari() {
  pemicu = el('button', { class: 'alat cari-alat', type: 'button', 'aria-label': t('cari.label'), title: `${t('cari.label')} (/)`,
    'aria-haspopup': 'dialog', 'aria-expanded': 'false', onclick: bukaCari },
  garis(IKON_CARI), el('span', { class: 'cari-petunjuk' }, t('cari.pendek')), el('kbd', { class: 'cari-kbd' }, '/'));
  return pemicu;
}

document.addEventListener('keydown', (e) => {
  const ketik = /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
  if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !ketik)) { e.preventDefault(); bukaCari(); }
});
