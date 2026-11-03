// Kartu berita blog (dipakai di halaman Blog, artikel, halaman aplikasi, dan beranda).
import { inggris, t, tanggal } from './i18n.js';
import { el } from './ui.js';

export const pilihBahasa = (id, en) => (inggris() && en ? en : id);
export const urlBerita = (slug) => `/blog/baca/?p=${encodeURIComponent(slug)}`;

/** Sampul: gambar admin, atau sampul bergaya IXVII.CO dengan nama aplikasi. */
export function sampulBerita(p, kelas = 'sampul-berita') {
  if (p.cover_url) return el('img', { class: kelas, src: p.cover_url, alt: '', loading: 'lazy' });
  return el('div', { class: `${kelas} kosong`, 'aria-hidden': 'true' }, el('span', {}, p.apps?.name || (p.topik && p.topik !== 'aplikasi' ? t('blog.topik.' + p.topik) : 'IXVII.CO')));
}

export function kartuBerita(p) {
  return el('a', { class: 'kartu-berita kaca', href: urlBerita(p.slug) },
    sampulBerita(p),
    el('div', { class: 'isi' },
      el('div', { class: 'meta-berita' }, p.apps?.name ? el('span', { class: 'lencana' }, p.apps.name)
        : p.topik && p.topik !== 'aplikasi' ? el('span', { class: 'lencana' }, t('blog.topik.' + p.topik)) : null,
        el('time', { datetime: p.published_at }, tanggal(p.published_at))),
      el('h3', {}, pilihBahasa(p.title, p.title_en)),
      pilihBahasa(p.excerpt, p.excerpt_en) ? el('p', { class: 'redup' }, pilihBahasa(p.excerpt, p.excerpt_en)) : null));
}
