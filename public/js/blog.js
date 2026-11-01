// Halaman Blog: daftar berita aplikasi, bisa disaring per aplikasi (?app=slug).
import { ambilBerita, ambilToko } from './api.js';
import { pasangKurs, t } from './i18n.js';
import { kartuBerita } from './blog-kartu.js';
import { el, kerangkaMemuat, pasangKerangka, pesanGagal } from './ui.js';

pasangKerangka('/blog/');
const isi = document.getElementById('isi');
let saring = new URLSearchParams(location.search).get('app');

function tampilkan(berita) {
  const apps = [...new Map(berita.filter((b) => b.apps?.slug).map((b) => [b.apps.slug, b.apps.name])).entries()];
  const cocok = saring ? berita.filter((b) => b.apps?.slug === saring) : berita;
  const chip = (slug, nama) => el('a', {
    class: 'chip', href: slug ? `?app=${encodeURIComponent(slug)}` : '/blog/', 'aria-current': (saring || null) === slug ? 'page' : null,
    onclick: (e) => { e.preventDefault(); saring = slug; history.replaceState(null, '', slug ? `?app=${encodeURIComponent(slug)}` : '/blog/'); tampilkan(berita); },
  }, nama);
  isi.replaceChildren(
    apps.length > 1 ? el('nav', { class: 'tab-kelompok', 'aria-label': 'Filter' }, chip(null, t('blog.semua')), apps.map(([s, n]) => chip(s, n))) : null,
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
