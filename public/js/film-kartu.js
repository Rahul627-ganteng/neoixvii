// Kartu film & serial, dipakai halaman Info Film, beranda, dan halaman aplikasi.
import { harga, inggris, t, tanggal } from './i18n.js';
import { el, sampulFilm, urlApp, waktuTayang } from './ui.js';

const pilih = (id, en) => (inggris() && en ? en : id);

/**
 * @param f      baris dari film_json()
 * @param apps   daftar aplikasi dari katalog (untuk harga mulai)
 */
export function kartuFilm(f, apps = []) {
  const app = f.slug ? apps.find((a) => a.slug === f.slug) : null;
  const sinopsis = pilih(f.sinopsis, f.sinopsis_en);
  const teks = sinopsis ? el('p', { class: 'sinopsis' }, sinopsis) : null;
  const baca = sinopsis && sinopsis.length > 160
    ? el('button', { type: 'button', class: 'baca', onclick: (e) => {
      const buka = teks.classList.toggle('buka');
      e.target.textContent = t(buka ? 'film.tutup' : 'film.baca');
    } }, t('film.baca')) : null;
  return el('article', { class: 'film-kartu kaca' },
    el('div', { class: 'sampul-wadah' }, sampulFilm(f),
      el('div', { class: 'label-atas' },
        el('span', { class: 'lencana ' + (f.status === 'akan' ? 'akan' : 'sedang') }, waktuTayang(f)),
        el('span', { class: 'lencana' }, t(f.jenis === 'serial' ? 'film.serial' : 'film.film')))),
    el('div', { class: 'isi' },
      el('h3', {}, f.judul),
      el('div', { class: 'meta' },
        f.app ? el('span', {}, t('film.diApp', { app: f.app })) : null,
        f.genre ? el('span', {}, f.genre) : null,
        el('span', {}, f.status === 'akan' ? t('film.tayang', { tgl: tanggal(f.rilis + 'T00:00:00') })
          : f.akhir ? t('film.sampai', { tgl: tanggal(f.akhir + 'T00:00:00') }) : null)),
      teks, baca,
      el('div', { class: 'aksi' },
        f.slug ? el('a', { class: 'tombol', href: urlApp(f.slug) }, t('film.langganan', { app: f.app }),
          app && !app.habisSemua ? el('small', {}, t('film.mulai', { harga: harga(app.hargaMulai) })) : null) : null,
        f.trailer && /^https:\/\//.test(f.trailer) ? el('a', { class: 'tombol garis', href: f.trailer, target: '_blank', rel: 'noopener nofollow' }, t('film.trailer')) : null)));
}

/** Versi ringkas untuk daftar kecil (halaman aplikasi). */
export function barisFilm(f) {
  return el('a', { class: 'film-baris', href: `/film/?app=${encodeURIComponent(f.slug || '')}` },
    sampulFilm(f, 'kecil'),
    el('span', {}, el('b', {}, f.judul), el('small', {}, waktuTayang(f))));
}
