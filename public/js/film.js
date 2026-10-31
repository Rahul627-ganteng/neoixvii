// Halaman Info Film: sedang tayang / akan tayang, saring per platform, tombol langganan ke halaman aplikasi.
import { ambilFilm, ambilKatalog, ambilToko } from './api.js';
import { pasangKurs, t } from './i18n.js';
import { kartuFilm } from './film-kartu.js';
import { el, kerangkaMemuat, pasangKerangka, pesanGagal, tulisCatatanKurs } from './ui.js';

pasangKerangka('/film/');

const isi = document.getElementById('isi');
const tab = document.getElementById('tab-status');
const filterApp = document.getElementById('filter-app');
tab.setAttribute('aria-label', t('film.judul'));
filterApp.setAttribute('aria-label', t('film.semuaPlatform'));

const params = new URLSearchParams(location.search);
let status = params.get('status') === 'akan' ? 'akan' : 'sedang';
let app = params.get('app') || '';
let film = [];
let apps = [];

function simpanUrl() {
  const p = new URLSearchParams();
  if (status === 'akan') p.set('status', 'akan');
  if (app) p.set('app', app);
  history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
}

function tampilkan() {
  const platform = [...new Map(film.filter((f) => f.slug).map((f) => [f.slug, f.app])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  if (app && !platform.some(([s]) => s === app)) app = '';
  const diApp = film.filter((f) => !app || f.slug === app);
  // kalau tab yang dipilih kosong tapi tab lain ada isinya, pindah otomatis
  if (!diApp.some((f) => f.status === status) && diApp.some((f) => f.status !== status)) status = status === 'akan' ? 'sedang' : 'akan';

  tab.replaceChildren(...[['sedang', t('film.sedang')], ['akan', t('film.akan')]].map(([k, l]) => el('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(k === status), onclick: () => { status = k; simpanUrl(); tampilkan(); },
  }, l, el('small', {}, diApp.filter((f) => f.status === k).length))));
  filterApp.replaceChildren(...(platform.length > 1 ? [['', t('film.semuaPlatform')], ...platform] : []).map(([s, l]) => el('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(s === app), onclick: () => { app = s; simpanUrl(); tampilkan(); },
  }, l)));

  const daftar = diApp.filter((f) => f.status === status);
  isi.replaceChildren(daftar.length ? el('div', { class: 'film-daftar' }, daftar.map((f) => kartuFilm(f, apps)))
    : el('div', { class: 'kosong kaca' }, el('p', {}, t('film.kosong'))));
}

async function muat() {
  isi.replaceChildren(el('div', { class: 'film-daftar' }, kerangkaMemuat(3)));
  try {
    const [f, katalog, toko] = await Promise.all([ambilFilm(), ambilKatalog().catch(() => ({ apps: [] })), ambilToko()]);
    pasangKurs(toko);
    tulisCatatanKurs();
    film = f ?? [];
    apps = katalog.apps;
    tampilkan();
  } catch (err) {
    console.error(err);
    isi.replaceChildren(pesanGagal(t('gagal.katalog'), muat));
  }
}
muat();
