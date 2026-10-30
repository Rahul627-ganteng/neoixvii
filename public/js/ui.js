// Komponen tampilan yang dipakai ulang semua halaman publik.
import { catatanKurs, gantiBahasa, gantiTema, harga, inggris, labelTipe, t, temaTerang } from './i18n.js';

/** Membuat elemen dengan aman: teks selalu dimasukkan sebagai teks, bukan HTML. */
export function el(tag, attrs = {}, ...anak) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'value') e.value = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const a of anak.flat()) if (a != null && a !== false) e.append(a instanceof Node ? a : document.createTextNode(String(a)));
  return e;
}

/** Ikon SVG kecil (garis sederhana buatan sendiri). */
const NS = 'http://www.w3.org/2000/svg';
function svg(d, { isi = false, ukuran = 24 } = {}) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', `0 0 ${ukuran} ${ukuran}`);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('fill', isi ? 'currentColor' : 'none');
  s.setAttribute('stroke', isi ? 'none' : 'currentColor');
  s.setAttribute('stroke-width', '2');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  for (const p of [].concat(d)) { const path = document.createElementNS(NS, 'path'); path.setAttribute('d', p); s.append(path); }
  return s;
}
const IKON = {
  bulan: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  matahari: ['M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4'],
};
// simbol kategori di pojok ikon aplikasi (bentuk sederhana, bukan logo merek)
const SIMBOL = {
  Nonton: { d: 'M8 5v14l11-7z', isi: true },
  AI: { d: 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z', isi: true },
  Editing: { d: ['M4 20l4-1 11-11-3-3L5 16z', 'M14 6l3 3'] },
  Edukasi: { d: ['M2 7l10-4 10 4-10 4z', 'M6 9v5c0 1.7 2.7 3 6 3s6-1.3 6-3V9'] },
  Musik: { d: ['M9 18V5l11-2v13', 'M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'] },
  Lainnya: { d: 'M5 12h.01M12 12h.01M19 12h.01' },
};

const HALAMAN = [
  { href: '/', kunci: 'nav.beranda', kelas: 'nav-beranda' },   // di HP disembunyikan; logo juga menuju beranda
  { href: '/katalog/', kunci: 'nav.katalog' },
  { href: '/promo/', kunci: 'nav.promo' },
  { href: '/rakit/', kunci: 'nav.rakit' },
];

/** Ganti teks statis di HTML sesuai bahasa: data-t (isi), data-t-placeholder, data-t-aria, data-t-content. */
export function terjemahkanHalaman(vars = {}) {
  for (const e of document.querySelectorAll('[data-t]')) e.textContent = t(e.dataset.t, vars);
  for (const e of document.querySelectorAll('[data-t-placeholder]')) e.placeholder = t(e.dataset.tPlaceholder, vars);
  for (const e of document.querySelectorAll('[data-t-aria]')) e.setAttribute('aria-label', t(e.dataset.tAria, vars));
  for (const e of document.querySelectorAll('[data-t-content]')) e.setAttribute('content', t(e.dataset.tContent, vars));
  document.documentElement.classList.remove('terjemah');
}

/** Pasang header & footer ke elemen #kepala dan #kaki, lalu terjemahkan teks statis halaman. */
export function pasangKerangka(aktif, vars) {
  terjemahkanHalaman(vars);
  const kepala = document.getElementById('kepala');
  if (kepala) {
    const tombolTema = el('button', { class: 'alat', type: 'button' });
    const gambarTema = () => {
      tombolTema.replaceChildren(svg(temaTerang() ? IKON.bulan : IKON.matahari));
      tombolTema.setAttribute('aria-label', t(temaTerang() ? 'alat.tema.gelap' : 'alat.tema.terang'));
      tombolTema.title = tombolTema.getAttribute('aria-label');
    };
    gambarTema();
    tombolTema.addEventListener('click', () => { gantiTema(); gambarTema(); });
    const tombolBahasa = el('button', { class: 'alat', type: 'button', 'aria-label': t('alat.bahasa'), title: t('alat.bahasa'), onclick: gantiBahasa },
      inggris() ? 'ID' : 'EN');
    kepala.replaceChildren(el('div', { class: 'wadah' },
      el('a', { class: 'merek', href: '/', 'aria-label': 'IXVII.CO' },
        el('img', { class: 'hanya-gelap', src: '/assets/brand/emblem-putih.png', alt: '', width: 274, height: 183 }),
        el('img', { class: 'hanya-terang', src: '/assets/brand/emblem-maroon.png', alt: '', width: 273, height: 183 }),
        el('span', {}, 'IXVII.CO')),
      el('div', { class: 'kanan' },
        el('nav', { class: 'nav', 'aria-label': 'Menu' },
          HALAMAN.map((h) => el('a', { href: h.href, class: h.kelas, 'aria-current': h.href === aktif ? 'page' : null }, t(h.kunci)))),
        tombolBahasa, tombolTema)));
  }
  const kaki = document.getElementById('kaki');
  if (kaki) {
    kaki.replaceChildren(el('div', { class: 'wadah' },
      el('span', {}, t('kaki.hak', { tahun: new Date().getFullYear() })),
      el('span', {}, t('kaki.info')),
      el('span', { class: 'catatan-kurs', hidden: true })));
  }
}

/** Tampilkan catatan kurs dolar di footer (hanya di mode Inggris). Panggil setelah pasangKurs(). */
export function tulisCatatanKurs() {
  const c = document.querySelector('#kaki .catatan-kurs');
  if (!c) return;
  c.textContent = catatanKurs();
  c.hidden = !c.textContent;
}

/** Gabungkan daftar: "A, B dan C" / "A, B and C". */
export function gabung(daftar) {
  if (daftar.length < 2) return daftar.join('');
  return daftar.slice(0, -1).join(', ') + (inggris() ? ' and ' : ' dan ') + daftar.at(-1);
}

/** Tautan WhatsApp dengan pesan terisi. */
export const tautanWa = (nomor, teks) => `https://wa.me/${String(nomor).replace(/\D/g, '')}${teks ? '?text=' + encodeURIComponent(teks) : ''}`;

/** Ikon aplikasi: logo unggahan admin, atau monogram bergaya IXVII.CO dengan simbol kategori. */
export function ikonApp(app, besar = false) {
  const kelas = 'ikon-app' + (besar ? ' besar' : '');
  if (app.logo) return el('div', { class: kelas + ' logo' }, el('img', { src: app.logo, alt: '', loading: 'lazy' }));
  const kata = app.nama.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
  const inisial = (kata.length > 1 && !/^\d/.test(kata[1]) ? kata[0][0] + kata[1][0] : kata[0].slice(0, 2)).toUpperCase();
  const simbol = SIMBOL[app.kunciKategori];
  return el('div', { class: kelas, 'aria-hidden': 'true' },
    el('span', { class: 'ini' }, inisial),
    simbol ? svg(simbol.d, { isi: simbol.isi }) : null);
}

export const urlApp = (slug) => `/aplikasi/?app=${encodeURIComponent(slug)}`;
export const urlKategori = (kunci) => `/katalog/?kategori=${encodeURIComponent(kunci)}`;

/** Kartu aplikasi untuk grid beranda & katalog. */
export function kartuApp(app) {
  const tipe = [...new Set(app.tipe)].slice(0, 3);
  return el('a', { class: 'kartu-app kaca kartu-3d', href: urlApp(app.slug) },
    el('div', { class: 'atas' }, ikonApp(app),
      el('div', {}, el('h3', {}, app.nama), el('div', { class: 'kat' }, app.kategori))),
    el('p', {}, app.desc),
    el('div', { class: 'tipe' }, tipe.map((x) => el('span', { class: 'lencana' }, labelTipe(x)))),
    el('div', { class: 'bawah' },
      app.habisSemua
        ? el('span', { class: 'lencana habis' }, t('kartu.habis'))
        : el('div', { class: 'harga-mulai' }, el('small', {}, t('kartu.mulai')), el('b', {}, harga(app.hargaMulai))),
      el('span', { class: 'lencana' }, t('kartu.paket', { n: app.varian.length }))));
}

export function kerangkaMemuat(jumlah = 6) {
  return Array.from({ length: jumlah }, () => el('div', { class: 'memuat', 'aria-hidden': 'true' }));
}

export function pesanGagal(teks, ulang) {
  return el('div', { class: 'kosong kaca' },
    el('p', {}, teks),
    el('button', { class: 'tombol garis', type: 'button', onclick: ulang }, t('gagal.ulang')));
}

/** Daftar tanya-jawab (details/summary). */
export function daftarFaq(item) {
  return item.map((f) => el('details', {}, el('summary', {}, f.q), el('p', {}, f.a)));
}

/** Efek miring 3D halus saat kursor di atas kartu (mati di layar sentuh & saat pengguna minta gerak dikurangi). */
export function pasangTilt(root = document) {
  const boleh = matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!boleh) return;
  root.addEventListener('pointermove', (e) => {
    const k = e.target.closest?.('.kartu-3d');
    if (!k) return;
    const r = k.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    k.style.transform = `perspective(800px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-2px)`;
  });
  root.addEventListener('pointerout', (e) => {
    const k = e.target.closest?.('.kartu-3d');
    if (k && !k.contains(e.relatedTarget)) k.style.transform = '';
  });
}
