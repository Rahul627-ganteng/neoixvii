// Halaman Blog: daftar berita aplikasi, bisa disaring per aplikasi (?app=slug).
import { ambilBerita, ambilToko } from './api.js';
import { pasangKurs, t } from './i18n.js';
import { kartuBerita } from './blog-kartu.js';
import { el, kerangkaMemuat, pasangKerangka, pesanGagal } from './ui.js';

pasangKerangka('/blog/');
const isi = document.getElementById('isi');
const awal = new URLSearchParams(location.search);
// saringan: aplikasi (?app=slug) atau topik (?topik=islami / tips)
let saring = awal.get('topik') ? `topik:${awal.get('topik')}` : awal.get('app');
const TOPIK = ['islami', 'tips'];

function tampilkan(berita) {
  const apps = [...new Map(berita.filter((b) => b.apps?.slug).map((b) => [b.apps.slug, b.apps.name])).entries()];
  const topik = TOPIK.filter((k) => berita.some((b) => b.topik === k));
  const cocok = !saring ? berita : saring.startsWith('topik:') ? berita.filter((b) => b.topik === saring.slice(6)) : berita.filter((b) => b.apps?.slug === saring);
  const url = (kunci) => (!kunci ? '/blog/' : kunci.startsWith('topik:') ? `?topik=${encodeURIComponent(kunci.slice(6))}` : `?app=${encodeURIComponent(kunci)}`);
  const chip = (kunci, nama) => el('a', {
    class: 'chip', href: url(kunci), 'aria-current': (saring || null) === kunci ? 'page' : null,
    onclick: (e) => { e.preventDefault(); saring = kunci; history.replaceState(null, '', url(kunci)); tampilkan(berita); },
  }, nama);
  isi.replaceChildren(
    apps.length + topik.length > 1 ? el('nav', { class: 'tab-kelompok', 'aria-label': 'Filter' }, chip(null, t('blog.semua')),
      topik.map((k) => chip(`topik:${k}`, t('blog.topik.' + k))), apps.map(([s, n]) => chip(s, n))) : null,
    cocok.length ? el('div', { class: 'grid-berita' }, cocok.map(kartuBerita)) : el('div', { class: 'kosong kaca' }, el('p', {}, t('blog.kosong'))));
}

async function muat() {
  isi.replaceChildren(el('div', { class: 'grid-berita' }, kerangkaMemuat(6)));
  const [berita, toko] = await Promise.all([ambilBerita({ batas: 60 }), ambilToko()]);
  pasangKurs(toko);
  if (berita == null) { isi.replaceChildren(pesanGagal(t('blog.kosong'), muat)); return; }
  tampilkan(berita);
}
muat();
