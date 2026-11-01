// Halaman kebijakan (syarat layanan, privasi, garansi & refund). Isinya diubah admin di panel.
import { ambilHalaman, ambilToko } from './api.js';
import { inggris, t, tanggal } from './i18n.js';
import { tampilkanTeks } from './teks.js';
import { el, pasangKerangka, tautanWa } from './ui.js';

pasangKerangka('');
const isi = document.getElementById('isi');
const slug = document.body.dataset.halaman;
const HALAMAN = [['syarat', '/syarat/', 'kaki.syarat'], ['privasi', '/privasi/', 'kaki.privasi'], ['garansi', '/garansi-refund/', 'kaki.garansi']];

async function muat() {
  isi.replaceChildren(el('div', { class: 'memuat', style: 'height:320px' }));
  const [h, toko] = await Promise.all([ambilHalaman(slug), ambilToko()]);
  const lain = el('nav', { class: 'kebijakan-lain', 'aria-label': t('kebijakan.lain') },
    HALAMAN.map(([s, href, k]) => el('a', { href, 'aria-current': s === slug ? 'page' : null }, t(k))));
  if (!h) {
    isi.replaceChildren(el('div', { class: 'kosong kaca' }, el('p', {}, t('kebijakan.siap')),
      toko?.whatsapp_number ? el('a', { class: 'tombol wa', href: tautanWa(toko.whatsapp_number), target: '_blank', rel: 'noopener' }, t('saldo.chat')) : null), lain);
    return;
  }
  const judul = (inggris() && h.title_en) || h.title;
  const badan = (inggris() && h.body_en) || h.body;
  document.title = `${judul} — IXVII.CO`;
  isi.replaceChildren(
    el('section', { class: 'seksi' }, el('h1', { class: 'judul-halaman' }, judul),
      el('p', { class: 'redup' }, t('kebijakan.diperbarui', { tgl: tanggal(h.updated_at) }))),
    el('article', { class: 'kebijakan kaca' }, tampilkanTeks(badan)),
    lain);
}
muat();
