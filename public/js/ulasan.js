// Formulir ulasan dari link sekali pakai (/ulasan/?t=TOKEN). Tanpa token yang sah, formulir tidak tampil.
import { infoUlasan, kirimUlasan } from './api.js';
import { t, tanggal, teksGalat } from './i18n.js';
import { el, pasangKerangka, pilihBintang } from './ui.js';

pasangKerangka('');

const isi = document.getElementById('isi');
const token = new URLSearchParams(location.search).get('t') || '';
const MAKS = 600;

function tidakValid() {
  isi.replaceChildren(el('div', { class: 'kosong kaca' },
    el('p', {}, t('ulasan.tidakValid')),
    el('a', { class: 'tombol garis', href: '/testimoni/' }, t('ulasan.keTestimoni'))));
}

function formulir(data) {
  const per = data.apps.map((a, i) => {
    const bintang = pilihBintang(`nilai-${i}`, t('ulasan.nilai', { app: a.name }));
    const sisa = el('small', { class: 'redup' }, `0/${MAKS}`);
    const teks = el('textarea', { maxlength: MAKS, rows: 3, placeholder: t('ulasan.isi'), 'aria-label': `${t('ulasan.isi')} — ${a.name}`,
      oninput: () => { sisa.textContent = `${teks.value.length}/${MAKS}`; } });
    return { a, bintang, teks, kotak: el('fieldset', { class: 'ulasan-app kaca' },
      el('legend', {}, t('ulasan.nilai', { app: a.name })), bintang, teks, sisa) };
  });
  const anonim = el('input', { type: 'checkbox', id: 'anonim' });
  const namaTampil = el('p', { class: 'redup', style: 'font-size:13.5px;margin:0' });
  const gambarNama = () => { namaTampil.textContent = t('ulasan.namaTampil', { nama: anonim.checked ? 'Pembeli IXVII.CO' : data.nama }); };
  anonim.addEventListener('change', gambarNama);
  gambarNama();
  const galat = el('div', { class: 'galat', role: 'alert', hidden: true });
  const kirim = el('button', { class: 'tombol', type: 'submit' }, t('ulasan.kirim'));
  const form = el('form', { class: 'form-ulasan', novalidate: true, onchange: () => { galat.hidden = true; } },
    el('p', {}, t('ulasan.halo', { nama: data.nama })),
    el('p', { class: 'redup', style: 'margin-top:-6px;font-size:13.5px' }, t('ulasan.dibeli', { tgl: tanggal(data.dibeli + 'T00:00:00') })),
    per.map((x) => x.kotak),
    el('label', { class: 'row-cek' }, anonim, t('ulasan.anonim')), namaTampil,
    galat, kirim);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ulasan = per.filter((x) => x.bintang.nilai() > 0).map((x) => ({ app: x.a.name, rating: x.bintang.nilai(), isi: x.teks.value.trim() }));
    if (!ulasan.length) { galat.textContent = t('ulasan.minimal'); galat.hidden = false; return; }
    kirim.disabled = true; kirim.textContent = t('ulasan.mengirim'); galat.hidden = true;
    try {
      await kirimUlasan(token, ulasan, anonim.checked);
      isi.replaceChildren(el('div', { class: 'kosong kaca' }, el('p', {}, t('ulasan.terima')),
        el('a', { class: 'tombol garis', href: '/testimoni/' }, t('ulasan.keTestimoni'))));
    } catch (err) {
      galat.textContent = err instanceof TypeError ? t('pesan.gagal') : teksGalat(err.message);
      galat.hidden = false;
      kirim.disabled = false; kirim.textContent = t('ulasan.kirim');
    }
  });
  isi.replaceChildren(form);
}

async function muat() {
  if (!/^[0-9a-f]{32}$/.test(token)) return tidakValid();
  isi.replaceChildren(el('div', { class: 'memuat', style: 'height:220px' }));
  try { formulir(await infoUlasan(token)); }
  catch { tidakValid(); }
}
muat();
