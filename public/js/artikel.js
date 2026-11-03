// Halaman artikel blog (/blog/baca/?p=slug).
import { ambilArtikel, ambilBerita, ambilToko } from './api.js';
import { inggris, pasangKurs, t, tanggal } from './i18n.js';
import { kartuBerita, pilihBahasa, sampulBerita } from './blog-kartu.js';
import { renderIsi } from './ebook-render.js';
import { el, ikonApp, pasangKerangka, urlApp } from './ui.js';

pasangKerangka('/blog/');
const isi = document.getElementById('isi');
const slug = new URLSearchParams(location.search).get('p') || '';

async function muat() {
  isi.replaceChildren(el('div', { class: 'memuat', style: 'height:360px' }));
  const [a, lain, toko] = await Promise.all([ambilArtikel(slug), ambilBerita({ batas: 7 }), ambilToko()]);
  pasangKurs(toko);
  if (!a) {
    isi.replaceChildren(el('div', { class: 'kosong kaca' }, el('p', {}, t('blog.tidakAda')), el('a', { class: 'tombol garis', href: '/blog/' }, t('blog.kembali'))));
    return;
  }
  const judul = pilihBahasa(a.title, a.title_en);
  const ringkas = pilihBahasa(a.excerpt, a.excerpt_en);
  document.title = `${judul} — IXVII.CO`;
  if (ringkas) document.querySelector('meta[name="description"]')?.setAttribute('content', ringkas);
  const sumber = (() => { try { return a.source_url ? new URL(a.source_url).hostname.replace(/^www\./, '') : null; } catch { return null; } })();
  const bagikan = `https://wa.me/?text=${encodeURIComponent(`${judul}\n${location.origin}${location.pathname}?p=${encodeURIComponent(a.slug)}`)}`;
  const lainnya = (lain ?? []).filter((b) => b.slug !== a.slug).slice(0, 3);
  isi.replaceChildren(
    el('nav', { class: 'remah', 'aria-label': 'Breadcrumb' }, el('a', { href: '/blog/' }, 'Blog'), ' / ', judul),
    el('article', { class: 'artikel' },
      el('header', {},
        el('div', { class: 'meta-berita' }, a.apps?.name ? el('a', { class: 'lencana', href: `/blog/?app=${encodeURIComponent(a.apps.slug)}` }, a.apps.name)
          : a.topik && a.topik !== 'aplikasi' ? el('a', { class: 'lencana', href: `/blog/?topik=${a.topik}` }, t('blog.topik.' + a.topik)) : null,
          el('time', { datetime: a.published_at }, tanggal(a.published_at))),
        el('h1', {}, judul),
        ringkas ? el('p', { class: 'lead redup' }, ringkas) : null),
      sampulBerita(a, 'sampul-artikel'),
      el('div', { class: 'kebijakan isi-artikel eb-teks kaca' }, renderIsi(pilihBahasa(a.body, a.body_en) || a.body),
        sumber ? el('p', { class: 'redup', style: 'font-size:13px' }, `${t('blog.sumber')}: `, el('a', { href: a.source_url, target: '_blank', rel: 'noopener' }, sumber)) : null),
      el('div', { class: 'row-lencana', style: 'margin:14px 0' }, el('a', { class: 'tombol garis wa', href: bagikan, target: '_blank', rel: 'noopener' }, t('blog.bagikan'))),
      a.apps?.slug ? el('aside', { class: 'ajakan kaca' },
        el('div', { style: 'display:flex;gap:12px;align-items:center' }, ikonApp({ nama: a.apps.name, logo: a.apps.logo_url, kunciKategori: null }),
          el('div', {}, el('h3', {}, t('blog.langganan', { app: a.apps.name })), el('p', {}, t('blog.langgananT')))),
        el('a', { class: 'tombol', href: urlApp(a.apps.slug) }, t('blog.lihatPaket'))) : null),
    lainnya.length ? el('section', { class: 'seksi' }, el('div', { class: 'seksi-kepala' }, el('h2', {}, t('blog.lainnya')), el('a', { href: '/blog/' }, t('blog.kembali'))),
      el('div', { class: 'grid-berita' }, lainnya.map(kartuBerita))) : null);
}
muat();
