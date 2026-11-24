// Pasang IXVII.CO sebagai aplikasi (PWA): daftarkan service worker dan tampilkan popup ajakan.
// - Chrome/Edge/Samsung Internet (Android & komputer): tombol "Pasang sekarang" membuka dialog pasang bawaan browser.
// - iPhone/iPad (Safari): popup berisi langkah "Bagikan → Tambah ke Layar Utama" (iOS tidak punya dialog otomatis).
// - Safari Mac: langkah "File → Tambahkan ke Dock".
// - Browser di dalam aplikasi (Instagram, TikTok, Facebook, …): ajak buka di Chrome/Safari dulu.
// Popup muncul sendiri sekali, lalu diam 7 hari bila ditutup. Tautan "Pasang aplikasi" di footer bisa membukanya kapan saja.
import { el } from './ui.js';
import { t } from './i18n.js';

const KUNCI_TUTUP = 'ixvii-pasang-tutup';
const JEDA_TAMPIL = 7000;               // ms setelah halaman terbuka
const DIAM_SETELAH_TUTUP = 7 * 864e5;   // 7 hari

const ua = navigator.userAgent;
const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const macSafari = !ios && /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(ua);
const dalamAplikasi = /FBAN|FBAV|Instagram|Line\/|TikTok|musical_ly|Twitter|Snapchat/i.test(ua);
export const sudahTerpasang = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

let tunda = null;      // event beforeinstallprompt yang disimpan
let popup = null;
let jadwal = 0;

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { /* tidak wajib */ }));
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();          // ganti bilah bawaan Chrome dengan popup IXVII.CO
  tunda = e;
  jadwalkan();
  document.querySelectorAll('.tautan-pasang').forEach((a) => { a.hidden = false; });
});
window.addEventListener('appinstalled', () => {
  tunda = null;
  tutup(false);
  document.querySelectorAll('.tautan-pasang').forEach((a) => { a.hidden = true; });
  try { localStorage.setItem(KUNCI_TUTUP, String(Date.now() + 3650 * 864e5)); } catch { /* abaikan */ }
});

const baruDitutup = () => {
  try { return Date.now() - Number(localStorage.getItem(KUNCI_TUTUP) || 0) < DIAM_SETELAH_TUTUP; } catch { return false; }
};
const bisaPasang = () => !!tunda || ios || macSafari || dalamAplikasi;

/** Jadwalkan popup otomatis (sekali per kunjungan, bila memang bisa dipasang). */
function jadwalkan() {
  if (jadwal || popup || sudahTerpasang() || baruDitutup() || !bisaPasang()) return;
  jadwal = setTimeout(() => buka(false), JEDA_TAMPIL);
}

const IKON_BAGIKAN = 'M12 3v12M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7';
const IKON_TAMBAH = 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 8v8M8 12h8';
const garis = (d) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '2'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
  s.append(p); return s;
};

function langkah() {
  if (tunda) return null;
  if (dalamAplikasi) return el('p', { class: 'pasang-catatan' }, t('pasang.dalamApp'));
  if (ios) {
    return el('ol', { class: 'pasang-langkah' },
      el('li', {}, t('pasang.ios1a'), el('span', { class: 'pasang-ikon' }, garis(IKON_BAGIKAN)), t('pasang.ios1b')),
      el('li', {}, t('pasang.ios2a'), el('span', { class: 'pasang-ikon' }, garis(IKON_TAMBAH)), el('b', {}, t('pasang.ios2b'))),
      el('li', {}, t('pasang.ios3')));
  }
  if (macSafari) return el('p', { class: 'pasang-catatan' }, t('pasang.mac'));
  return el('p', { class: 'pasang-catatan' }, t('pasang.umum'));
}

/** Buka popup. manual = dibuka dari tautan (selalu tampil, termasuk petunjuk umum). */
export function buka(manual = true) {
  clearTimeout(jadwal); jadwal = 0;
  if (popup || sudahTerpasang()) return;
  if (!manual && (baruDitutup() || !bisaPasang())) return;
  const tombolPasang = tunda
    ? el('button', { class: 'tombol', type: 'button', onclick: pasang }, t('pasang.tombol'))
    : null;
  popup = el('aside', { class: 'popup-pasang', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'pasang-judul' },
    el('button', { class: 'pasang-x', type: 'button', 'aria-label': t('pasang.tutup'), onclick: () => tutup(true) }, '×'),
    el('div', { class: 'pasang-kepala' },
      el('img', { src: '/assets/brand/icon-192.png', alt: '', width: 56, height: 56 }),
      el('div', {},
        el('h2', { id: 'pasang-judul' }, t('pasang.judul')),
        el('p', {}, t('pasang.teks')))),
    el('ul', { class: 'pasang-poin' },
      el('li', {}, t('pasang.p1')), el('li', {}, t('pasang.p2')), el('li', {}, t('pasang.p3'))),
    langkah(),
    el('div', { class: 'pasang-aksi' },
      tombolPasang,
      el('button', { class: 'tombol garis', type: 'button', onclick: () => tutup(true) }, t(tunda ? 'pasang.nanti' : 'pasang.mengerti'))));
  document.body.append(popup);
  requestAnimationFrame(() => popup?.classList.add('tampil'));
  document.addEventListener('keydown', esc);
  if (manual) popup.querySelector('button.tombol, .pasang-x')?.focus();
}

function esc(e) { if (e.key === 'Escape') tutup(true); }

function tutup(ingat) {
  clearTimeout(jadwal); jadwal = 0;
  document.removeEventListener('keydown', esc);
  if (ingat) { try { localStorage.setItem(KUNCI_TUTUP, String(Date.now())); } catch { /* abaikan */ } }
  const p = popup; popup = null;
  if (!p) return;
  p.classList.remove('tampil');
  setTimeout(() => p.remove(), 300);
}

async function pasang() {
  if (!tunda) return;
  const e = tunda; tunda = null;
  e.prompt();
  const { outcome } = await e.userChoice.catch(() => ({ outcome: 'dismissed' }));
  tutup(outcome !== 'accepted');
}

/** Tautan "Pasang aplikasi" untuk footer; tersembunyi bila sudah dibuka sebagai aplikasi. */
export function tautanPasang() {
  return el('a', { class: 'tautan-pasang', href: '#pasang', hidden: sudahTerpasang(),
    onclick: (e) => { e.preventDefault(); buka(true); } }, t('pasang.tautan'));
}

/** Dipanggil sekali per halaman dari pasangKerangka(). */
export function mulaiPasang() {
  if (ios || macSafari || dalamAplikasi) jadwalkan();
}
