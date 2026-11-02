// Menu panel admin: kotak-kotak besar dengan ikon (gampang dipencet di HP), papan "Semua menu" per kelompok,
// dan tombol mode terang / gelap (tersimpan di perangkat ini).
import { el } from './alat.js';

const NS = 'http://www.w3.org/2000/svg';
function ikon(d) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  for (const x of [].concat(d)) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', x); s.append(p); }
  return s;
}

// gambar garis sederhana buatan sendiri
const IKON = {
  ringkasan: ['M4 13h6V4H4zM14 20h6v-9h-6zM14 4h6v4h-6zM4 20h6v-3H4z'],
  pesanan: ['M6 3h12l1 4H5z', 'M5 7h14l-1.2 12.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z', 'M9 11a3 3 0 0 0 6 0'],
  laporan: ['M4 20V10M10 20V4M16 20v-7M22 20H2'],
  stok: ['M3 7.5L12 3l9 4.5-9 4.5z', 'M3 7.5v9L12 21l9-4.5v-9', 'M12 12v9'],
  aplikasi: ['M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'],
  garansi: ['M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z', 'M8.5 12l2.5 2.5 4.5-5'],
  ulasan: ['M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z'],
  promo: ['M3 12V4h8l10 10-8 8z', 'M7.5 8.5h.01'],
  toko: ['M4 9l1.5-5h13L20 9', 'M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0', 'M5 11v9h14v-9', 'M10 20v-5h4v5'],
  member: ['M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z', 'M9 12.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM5.5 16.5c.6-1.6 2-2.5 3.5-2.5s2.9.9 3.5 2.5M15 10h3M15 13.5h3'],
  affiliate: ['M8.5 12.5a3 3 0 1 0 0-.01', 'M18 6a3 3 0 1 0 0-.01M18 18a3 3 0 1 0 0-.01', 'M11.2 11l4.2-2.6M11.2 13.6l4.2 2.6'],
  reseller: ['M3 10l2-6h14l2 6', 'M3 10h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z', 'M5 14v6h14v-6', 'M9.5 20v-3.5h5V20'],
  mitra: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5', 'M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.9 3 2.7 3.5 5.2'],
  film: ['M3 5h18v14H3z', 'M7 5v14M17 5v14M3 9.5h4M17 9.5h4M3 14.5h4M17 14.5h4'],
  blog: ['M4 5h12v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z', 'M16 9h4v10a2 2 0 0 1-4 0', 'M7.5 9h5M7.5 12.5h5M7.5 16h3'],
  notifikasi: ['M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z', 'M10 20a2 2 0 0 0 4 0'],
  margin: ['M19 5L5 19', 'M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  riwayat: ['M3.5 12a8.5 8.5 0 1 0 2.5-6', 'M3 4v4h4', 'M12 8v4.5l3 2'],
  impor: ['M6 3h8l4 4v14H6z', 'M14 3v4h4', 'M9 13l3 3 3-3M12 9.5V16'],
  semua: ['M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z'],
  bulan: ['M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.6 6.6 0 0 0 10 10z'],
  matahari: ['M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z', 'M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4'],
  tutup: ['M6 6l12 12M18 6L6 18'],
};

const KELOMPOK = [
  ['Penjualan', ['ringkasan', 'pesanan', 'laporan', 'garansi', 'ulasan']],
  ['Produk & harga', ['stok', 'aplikasi', 'promo', 'margin', 'riwayat', 'impor']],
  ['Pelanggan & mitra', ['member', 'affiliate', 'reseller', 'mitra']],
  ['Konten & pengaturan', ['toko', 'blog', 'film', 'notifikasi']],
];
const kunciDari = (a) => (a.getAttribute('href').startsWith('#') ? a.getAttribute('href').slice(1) : 'impor');

// ---------------------------------------------------------------- mode terang / gelap
const SIMPAN_TEMA = 'ixvii-admin-tema';
const temaSekarang = () => (document.documentElement.dataset.tema === 'gelap' ? 'gelap' : 'terang');
function pasangTema() {
  const tombol = document.getElementById('tombolTema');
  if (!tombol) return;
  const gambar = () => {
    const gelap = temaSekarang() === 'gelap';
    tombol.replaceChildren(ikon(gelap ? IKON.matahari : IKON.bulan), el('span', {}, gelap ? 'Terang' : 'Gelap'));
    tombol.setAttribute('aria-label', gelap ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
    tombol.title = tombol.getAttribute('aria-label');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', gelap ? '#0e0e10' : '#800203');
  };
  tombol.addEventListener('click', () => {
    const baru = temaSekarang() === 'gelap' ? 'terang' : 'gelap';
    document.documentElement.dataset.tema = baru;
    try { localStorage.setItem(SIMPAN_TEMA, baru); } catch { /* mode privat */ }
    gambar();
    window.dispatchEvent(new Event('ganti-tema'));
  });
  gambar();
}

// ---------------------------------------------------------------- kotak menu
export function pasangMenu() {
  pasangTema();
  const nav = document.getElementById('menu');
  const tautan = [...nav.querySelectorAll('a')];
  // kotak di baris atas: ikon + nama
  for (const a of tautan) {
    const k = kunciDari(a);
    a.dataset.menu = k;
    a.classList.add('ubin');
    if (!a.querySelector('svg')) a.prepend(el('span', { class: 'ubin-ikon' }, ikon(IKON[k] ?? IKON.semua)));
  }
  // tombol "Semua menu" di awal baris
  const bukaSemua = el('button', { type: 'button', class: 'ubin ubin-semua', 'aria-haspopup': 'dialog', 'aria-controls': 'papanMenu' },
    el('span', { class: 'ubin-ikon' }, ikon(IKON.semua)), el('span', {}, 'Semua menu'));
  nav.querySelector('.baris').prepend(bukaSemua);

  // papan "Semua menu" per kelompok (tautannya salinan dari baris atas)
  const byKunci = new Map(tautan.map((a) => [a.dataset.menu, a]));
  const tutup = el('button', { type: 'button', class: 'papan-tutup', 'aria-label': 'Tutup menu' }, ikon(IKON.tutup));
  const papan = el('div', { class: 'papan-menu', id: 'papanMenu', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Semua menu', hidden: true },
    el('div', { class: 'papan-isi' },
      el('div', { class: 'papan-kepala' }, el('b', {}, 'Semua menu'), tutup),
      KELOMPOK.map(([judul, kunci]) => el('section', { class: 'papan-grup' },
        el('h3', {}, judul),
        el('div', { class: 'papan-ubin' }, kunci.filter((k) => byKunci.has(k)).map((k) => {
          const asli = byKunci.get(k);
          const salinan = asli.cloneNode(true);
          salinan.addEventListener('click', () => setTimeout(tutupPapan, 0));
          return salinan;
        }))))));
  document.body.append(papan);
  let fokusSebelum = null;
  function bukaPapan() {
    fokusSebelum = document.activeElement;
    papan.hidden = false;
    document.body.classList.add('papan-terbuka');
    for (const b of document.querySelectorAll('[aria-controls="papanMenu"]')) b.setAttribute('aria-expanded', 'true');
    (papan.querySelector('a[aria-current="page"]') ?? papan.querySelector('a'))?.focus();
  }
  function tutupPapan() {
    if (papan.hidden) return;
    papan.hidden = true;
    document.body.classList.remove('papan-terbuka');
    for (const b of document.querySelectorAll('[aria-controls="papanMenu"]')) b.setAttribute('aria-expanded', 'false');
    fokusSebelum?.focus?.({ preventScroll: true });
  }
  bukaSemua.addEventListener('click', bukaPapan);
  document.getElementById('tombolSemuaMenu')?.addEventListener('click', bukaPapan);
  tutup.addEventListener('click', tutupPapan);
  papan.addEventListener('click', (e) => { if (e.target === papan) tutupPapan(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tutupPapan(); });
}

/** Tandai menu yang sedang dibuka di baris atas & papan, lalu geser baris supaya kotaknya terlihat. */
export function tandaiMenu(nama) {
  for (const a of document.querySelectorAll('[data-menu]')) a.setAttribute('aria-current', a.dataset.menu === nama ? 'page' : 'false');
  const aktif = document.querySelector('#menu a[aria-current="page"]');
  const baris = document.querySelector('#menu .baris');
  if (aktif && baris && baris.scrollWidth > baris.clientWidth) {
    baris.scrollTo({ left: aktif.offsetLeft - (baris.clientWidth - aktif.offsetWidth) / 2 });
  }
}
