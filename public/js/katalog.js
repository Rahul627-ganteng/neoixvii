import { ambilKatalog } from './api.js';
import { el, kartuApp, kerangkaMemuat, pasangKerangka, pasangTilt, pesanGagal } from './ui.js';

pasangKerangka('/katalog/');
pasangTilt();

const hasil = document.getElementById('hasil');
const info = document.getElementById('info-hasil');
const kotakCari = document.getElementById('kotak-cari');
const filter = document.getElementById('filter-kategori');
const SEMUA = 'Semua';

const params = new URLSearchParams(location.search);
let pilihKategori = params.get('kategori') || SEMUA;
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
  if (pilihKategori !== SEMUA && !kategori.some((k) => k.label === pilihKategori)) pilihKategori = SEMUA;

  filter.replaceChildren(...[{ label: SEMUA, jumlah: apps.length }, ...kategori].map((k) =>
    el('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(k.label === pilihKategori),
      onclick: () => { pilihKategori = k.label; simpanUrl(); tampilkan(); },
    }, k.label, el('small', {}, k.jumlah))));

  const kata = bersih(kataCari).split(/\s+/).filter(Boolean);
  const cocok = apps.filter((a) =>
    (pilihKategori === SEMUA || a.kategori === pilihKategori) &&
    kata.every((w) => bersih(`${a.nama} ${a.desc} ${a.kategori} ${a.tipe.join(' ')}`).includes(w)));

  if (!cocok.length) {
    info.textContent = '';
    hasil.replaceChildren(el('div', { class: 'kosong kaca' },
      el('p', {}, `Tidak ada aplikasi yang cocok dengan “${kataCari}”.`),
      el('button', { class: 'tombol garis', type: 'button', onclick: () => { kataCari = ''; kotakCari.value = ''; pilihKategori = SEMUA; simpanUrl(); tampilkan(); } }, 'Tampilkan semua')));
    return;
  }

  info.textContent = `${cocok.length} aplikasi`;
  if (pilihKategori === SEMUA && !kata.length) {
    // tampilan per kategori
    hasil.replaceChildren(...kategori.map((k) => {
      const isi = cocok.filter((a) => a.kategori === k.label);
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
    data = await ambilKatalog();
    tampilkan();
  } catch {
    hasil.replaceChildren(pesanGagal('Katalog belum bisa dimuat. Periksa koneksi internet lalu coba lagi.', muat));
  }
}
muat();
