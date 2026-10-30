import { ambilKatalog, ambilToko } from './api.js';
import { labelTipe, pasangKurs, t } from './i18n.js';
import { el, kartuApp, kerangkaMemuat, pasangKerangka, pasangTilt, pesanGagal, tulisCatatanKurs } from './ui.js';

pasangKerangka('/katalog/');
pasangTilt();

const hasil = document.getElementById('hasil');
const info = document.getElementById('info-hasil');
const kotakCari = document.getElementById('kotak-cari');
const filter = document.getElementById('filter-kategori');
const SEMUA = '';   // kunci kategori kosong = semua

const params = new URLSearchParams(location.search);
let pilihKategori = params.get('kategori') || SEMUA;   // kunci kategori (nama Indonesia, sama di kedua bahasa)
let kataCari = params.get('q') || '';
kotakCari.value = kataCari;
let data = null;

const bersih = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ');

function simpanUrl() {
  const p = new URLSearchParams();
  if (pilihKategori !== SEMUA) p.set('kategori', pilihKategori);
  if (kataCari) p.set('q', kataCari);
  history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
}

function tampilkan() {
  const { kategori, apps } = data;
  if (pilihKategori !== SEMUA && !kategori.some((k) => k.kunci === pilihKategori || k.label === pilihKategori)) pilihKategori = SEMUA;
  // tautan lama mungkin memakai label bahasa Inggris
  const kat = kategori.find((k) => k.label === pilihKategori);
  if (kat) pilihKategori = kat.kunci;

  filter.replaceChildren(...[{ kunci: SEMUA, label: t('katalog.semua'), jumlah: apps.length }, ...kategori].map((k) =>
    el('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(k.kunci === pilihKategori),
      onclick: () => { pilihKategori = k.kunci; simpanUrl(); tampilkan(); },
    }, k.label, el('small', {}, k.jumlah))));

  const kata = bersih(kataCari).split(/\s+/).filter(Boolean);
  const cocok = apps.filter((a) =>
    (pilihKategori === SEMUA || a.kunciKategori === pilihKategori) &&
    kata.every((w) => bersih(`${a.nama} ${a.desc} ${a.kategori} ${a.kunciKategori} ${a.tipe.join(' ')} ${a.tipe.map(labelTipe).join(' ')}`).includes(w)));

  if (!cocok.length) {
    info.textContent = '';
    hasil.replaceChildren(el('div', { class: 'kosong kaca' },
      el('p', {}, t('katalog.kosong', { q: kataCari })),
      el('button', { class: 'tombol garis', type: 'button', onclick: () => { kataCari = ''; kotakCari.value = ''; pilihKategori = SEMUA; simpanUrl(); tampilkan(); } }, t('katalog.tampilSemua'))));
    return;
  }

  info.textContent = t('katalog.jumlah', { n: cocok.length });
  if (pilihKategori === SEMUA && !kata.length) {
    // tampilan per kategori
    hasil.replaceChildren(...kategori.map((k) => {
      const isi = cocok.filter((a) => a.kunciKategori === k.kunci);
      return el('section', { class: 'seksi' },
        el('div', { class: 'seksi-kepala' }, el('h2', {}, k.label), el('span', { class: 'redup', style: 'font-size:13px' }, k.desc)),
        el('div', { class: 'grid' }, isi.map(kartuApp)));
    }));
  } else {
    hasil.replaceChildren(el('div', { class: 'grid' }, cocok.map(kartuApp)));
  }
}

let jeda;
kotakCari.addEventListener('input', () => {
  clearTimeout(jeda);
  jeda = setTimeout(() => { kataCari = kotakCari.value.trim(); simpanUrl(); if (data) tampilkan(); }, 150);
});

async function muat() {
  hasil.replaceChildren(el('div', { class: 'grid' }, kerangkaMemuat(9)));
  try {
    const [katalog, toko] = await Promise.all([ambilKatalog(), ambilToko()]);
    pasangKurs(toko);
    tulisCatatanKurs();
    data = katalog;
    tampilkan();
  } catch {
    hasil.replaceChildren(pesanGagal(t('gagal.katalog'), muat));
  }
}
muat();
