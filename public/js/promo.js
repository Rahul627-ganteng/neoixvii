// Halaman Promo & bundle: promo yang berjalan, bundle harga tetap (bisa langsung dipesan), dan ajakan rakit bundle.
import { ambilKatalog, ambilPromo, ambilToko } from './api.js';
import { harga, inggris, labelTipe, labelVarian, pasangKurs, persen, t, tanggal } from './i18n.js';
import { panelPesan } from './pesan.js';
import { el, ikonApp, kerangkaMemuat, pasangKerangka, pasangTilt, pesanGagal, tulisCatatanKurs, urlApp } from './ui.js';

pasangKerangka('/promo/');
pasangTilt();

const isi = document.getElementById('isi');
const pilihBahasa = (id, en) => (inggris() && en ? en : id);

function kartuPromo(p) {
  return el('article', { class: 'promo-kartu kaca' },
    p.banner ? el('img', { class: 'banner', src: p.banner, alt: '', loading: 'lazy' }) : null,
    el('div', { class: 'isi' },
      el('h3', {}, pilihBahasa(p.title, p.title_en)),
      pilihBahasa(p.body, p.body_en) ? el('p', {}, pilihBahasa(p.body, p.body_en)) : null,
      p.ends ? el('span', { class: 'sampai' }, t('promo.sampai', { tgl: tanggal(p.ends + 'T00:00:00') })) : null,
      p.link ? el('a', { class: 'lihat', href: p.link }, t('promo.lihat')) : null));
}

function ajakanRakit(aturan) {
  if (!aturan?.length) return null;
  const atas = aturan.at(-1);
  return el('section', { class: 'seksi' }, el('div', { class: 'ajakan kaca' },
    el('div', {}, el('h3', {}, t('promo.rakitJ')), el('p', {}, t('promo.rakitT', { pct: persen(atas.pct), n: atas.min }))),
    el('a', { class: 'tombol', href: '/rakit/' }, t('promo.rakitTombol'))));
}

function tampilkan(promo, apps, toko) {
  const promos = promo?.promos ?? [];
  const bundles = promo?.bundles ?? [];
  const bagian = [];
  if (promos.length) {
    bagian.push(el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, t('promo.promo'))),
      el('div', { class: 'promo-daftar' }, promos.map(kartuPromo))));
  }

  if (bundles.length) {
    const { aside, atur } = panelPesan({ toko, tanya: t('wa.umum'), judul: t('promo.bundlemu'), kosong: t('promo.belumPilih') });
    const kartu = bundles.map((b) => {
      const tombol = el('button', { class: 'tombol garis', type: 'button' }, t('promo.pilih'));
      const k = el('article', { class: 'bundle-kartu kaca kartu-3d', 'aria-current': 'false' },
        b.banner ? el('img', { class: 'banner', src: b.banner, alt: '', loading: 'lazy', style: 'aspect-ratio:16/7;object-fit:cover;width:100%' }) : null,
        el('div', { class: 'isi' },
          el('h3', {}, pilihBahasa(b.name, b.name_en)),
          pilihBahasa(b.desc, b.desc_en) ? el('p', { class: 'redup', style: 'margin:0;font-size:14px' }, pilihBahasa(b.desc, b.desc_en)) : null,
          el('ul', {}, b.items.map((i) => {
            const app = apps.find((a) => a.slug === i.slug) ?? { nama: i.app, kunciKategori: null };
            return el('li', {}, ikonApp(app),
              el('a', { href: urlApp(i.slug) }, el('b', {}, i.app), ' · ', labelTipe(i.tipe), ' · ', labelVarian(i.d)));
          })),
          b.ends ? el('span', { class: 'redup', style: 'font-size:12.5px' }, t('promo.sampai', { tgl: tanggal(b.ends + 'T00:00:00') })) : null,
          el('div', { class: 'harga-bundle' },
            el('b', {}, harga(b.price)),
            b.normal > b.price ? el('s', {}, harga(b.normal)) : null,
            b.normal > b.price ? el('span', { class: 'hemat-lencana' }, t('promo.hemat', { n: harga(b.normal - b.price) })) : null),
          tombol));
      tombol.addEventListener('click', () => {
        for (const x of document.querySelectorAll('.bundle-kartu')) {
          x.setAttribute('aria-current', String(x === k));
          x.querySelector('.isi > .tombol').textContent = x === k ? t('promo.dipilih') : t('promo.pilih');
        }
        atur({
          baris: [pilihBahasa(b.name, b.name_en), ...b.items.map((i) => `${i.app} · ${labelTipe(i.tipe)} · ${labelVarian(i.d)}`)],
          total: b.price, normal: b.normal, kirim: { bundle: b.id },
        });
        if (matchMedia('(max-width: 899px)').matches) aside.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return k;
    });
    bagian.push(el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, t('promo.bundle'))),
      el('div', { class: 'tata-detail', style: 'margin-top:0' },
        el('div', { class: 'atas-detail' }, el('div', { class: 'promo-daftar' }, kartu)),
        aside)));
  }

  if (!promos.length && !bundles.length) bagian.push(el('div', { class: 'kosong kaca' }, el('p', {}, t('promo.kosong'))));
  bagian.push(ajakanRakit(promo?.rules));
  isi.replaceChildren(...bagian.filter(Boolean));
}

async function muat() {
  isi.replaceChildren(el('div', { class: 'promo-daftar' }, kerangkaMemuat(3)));
  try {
    const [promo, { apps }, toko] = await Promise.all([ambilPromo(), ambilKatalog(), ambilToko()]);
    pasangKurs(toko);
    tulisCatatanKurs();
    tampilkan(promo, apps, toko);
  } catch (err) {
    console.error(err);
    isi.replaceChildren(pesanGagal(t('gagal.katalog'), muat));
  }
}
muat();
