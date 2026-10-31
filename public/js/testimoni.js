// Halaman Ulasan pembeli: hanya ulasan Verified Purchase yang sudah ditampilkan admin.
import { ambilUlasan } from './api.js';
import { inggris, t } from './i18n.js';
import { bintang, el, kartuUlasan, kerangkaMemuat, pasangKerangka, pesanGagal } from './ui.js';

pasangKerangka('/testimoni/');

const isi = document.getElementById('isi');
const info = document.getElementById('info-hasil');
const filter = document.getElementById('filter-app');
filter.setAttribute('aria-label', t('testi.judul'));
let pilih = new URLSearchParams(location.search).get('app') || '';
let data = null;

const angka = (x) => Number(x).toLocaleString(inggris() ? 'en-US' : 'id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function tampilkan() {
  const ulasan = data?.ulasan ?? [];
  const ringkasan = data?.ringkasan ?? [];
  if (pilih && !ringkasan.some((r) => r.slug === pilih)) pilih = '';
  const semua = { slug: '', app: t('testi.semua'), jumlah: ulasan.length,
    rata: ulasan.length ? ulasan.reduce((s, u) => s + u.rating, 0) / ulasan.length : null };
  filter.replaceChildren(...(ulasan.length ? [semua, ...ringkasan] : []).map((r) => el('button', {
    class: 'chip', type: 'button', 'aria-pressed': String((r.slug || '') === pilih),
    onclick: () => { pilih = r.slug || ''; history.replaceState(null, '', location.pathname + (pilih ? `?app=${encodeURIComponent(pilih)}` : '')); tampilkan(); },
  }, r.app, r.rata != null ? el('small', {}, `★ ${angka(r.rata)} (${r.jumlah})`) : null)));

  const cocok = pilih ? ulasan.filter((u) => u.slug === pilih) : ulasan;
  if (!cocok.length) {
    info.textContent = '';
    isi.replaceChildren(el('div', { class: 'kosong kaca' }, el('p', {}, t('testi.kosong'))));
    return;
  }
  const rata = cocok.reduce((s, u) => s + u.rating, 0) / cocok.length;
  info.replaceChildren(bintang(rata), ' ', t('testi.rata', { rata: angka(rata), n: cocok.length, s: cocok.length === 1 ? '' : 's' }));
  isi.replaceChildren(el('div', { class: 'ulasan-daftar' }, cocok.map((u) => kartuUlasan(u, { denganApp: !pilih }))));
}

async function muat() {
  isi.replaceChildren(el('div', { class: 'ulasan-daftar' }, kerangkaMemuat(3)));
  try {
    data = await ambilUlasan();
    tampilkan();
  } catch {
    isi.replaceChildren(pesanGagal(t('gagal.katalog'), muat));
  }
}
muat();
