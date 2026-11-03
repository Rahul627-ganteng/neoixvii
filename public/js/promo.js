// Halaman Promo Terkini: kampanye (dari poster story) dengan hitung mundur, bundle berstok & BEST DEAL,
// promo biasa, dan ajakan rakit bundle. Bundle bisa langsung dipesan dari panel samping.
import { ambilKatalog, ambilPromo, ambilToko, diskonTertinggi } from './api.js';
import { hitungMundur } from './gabung.js';
import { harga, inggris, labelTipe, labelVarian, pasangKurs, persen, t, tanggal } from './i18n.js';
import { panelPesan } from './pesan.js';
import { el, ikonApp, kerangkaMemuat, pasangKerangka, pasangTilt, pesanGagal, tulisCatatanKurs, urlApp } from './ui.js';

pasangKerangka('/promo/');
pasangTilt();

const isi = document.getElementById('isi');
const pilihBahasa = (id, en) => (inggris() && en ? en : id);
// hari terakhir promo berakhir pukul 23.59 WIB
const akhirHari = (tgl) => `${tgl}T23:59:59+07:00`;
const besokDari = (tgl) => new Date(Date.parse(`${tgl}T12:00:00+07:00`) + 864e5).toISOString().slice(0, 10);

function kartuPromo(p) {
  return el('article', { class: 'promo-kartu kaca' },
    p.banner ? el('img', { class: 'banner', src: p.banner, alt: '', loading: 'lazy' }) : null,
    el('div', { class: 'isi' },
      p.lencana ? el('span', { class: 'lencana-kampanye' }, p.lencana) : null,
      el('h3', {}, pilihBahasa(p.title, p.title_en)),
      pilihBahasa(p.body, p.body_en) ? el('p', {}, pilihBahasa(p.body, p.body_en)) : null,
      p.ends && p.hitung ? el('div', { class: 'promo-hm' }, el('small', {}, t('promo.berakhir')), hitungMundur(akhirHari(p.ends), { kecil: true }))
        : p.ends ? el('span', { class: 'sampai' }, t('promo.sampai', { tgl: tanggal(p.ends + 'T00:00:00') })) : null,
      p.link ? el('a', { class: 'lihat', href: p.link }, t('promo.lihat')) : null));
}

// poster asli dibuka besar di atas halaman
function bukaPoster(src, judul) {
  const tutup = el('button', { type: 'button', class: 'tombol garis poster-tutup', autofocus: true }, t('promo.tutup'));
  const d = el('dialog', { class: 'poster-dialog', 'aria-label': judul },
    el('img', { src, alt: t('promo.posterAlt', { judul }) }), tutup);
  tutup.addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
}

function stokBundle(b) {
  if (b.habis) return el('div', { class: 'stok-bundle habis' }, el('span', {}, t('promo.habis')));
  if (b.stok == null) return null;
  const sedikit = b.stok <= 2;
  const bar = b.stok_awal > 0 ? el('span', { class: 'stok-bar', 'aria-hidden': 'true' },
    el('i', { style: `width:${Math.max(6, Math.round((b.stok / b.stok_awal) * 100))}%` })) : null;
  return el('div', { class: 'stok-bundle' + (sedikit ? ' sedikit' : '') },
    el('span', {}, sedikit ? t('promo.tinggal', { n: b.stok }) : t('promo.sisa', { n: b.stok })), bar);
}

function ajakanRakit(promo) {
  const atas = diskonTertinggi(promo);
  if (!atas) return null;
  return el('section', { class: 'seksi' }, el('div', { class: 'ajakan kaca' },
    el('div', {}, el('h3', {}, t('promo.rakitJ')), el('p', {}, t('promo.rakitT', { pct: persen(atas.pct), n: atas.min }))),
    el('a', { class: 'tombol', href: '/rakit/' }, t('promo.rakitTombol'))));
}

// Promo Terkini dibagi per kelompok aplikasi
const KELOMPOK = ['editing', 'ai', 'streaming', 'lainnya'];
let kelompok = new URLSearchParams(location.search).get('k');

function tampilkan(promo, apps, toko) {
  // yang sudah lewat tanggalnya disembunyikan juga di sisi browser (data bisa dari cache sesi)
  const hari = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const masih = (x) => !x.ends || x.ends >= hari;
  const semuaPromo = (promo?.promos ?? []).filter(masih);
  const semuaBundle = (promo?.bundles ?? []).filter(masih);
  const idKampanye = new Set(semuaBundle.map((b) => b.kampanye).filter(Boolean));
  const jumlah = (k) => semuaPromo.filter((p) => (p.kelompok || 'lainnya') === k && !idKampanye.has(p.id)).length
    + semuaBundle.filter((b) => (b.kelompok || 'lainnya') === k).length;
  const tampilKelompok = KELOMPOK.filter((k) => k !== 'lainnya' || jumlah(k) > 0);
  if (!tampilKelompok.includes(kelompok)) kelompok = tampilKelompok.find((k) => jumlah(k) > 0) ?? 'editing';
  const promos = semuaPromo.filter((p) => (p.kelompok || 'lainnya') === kelompok);
  const bundles = semuaBundle.filter((b) => (b.kelompok || 'lainnya') === kelompok);
  const kampanye = promos.filter((p) => idKampanye.has(p.id) && bundles.some((b) => b.kampanye === p.id));
  const promoBiasa = promos.filter((p) => !idKampanye.has(p.id));
  const bundleBiasa = bundles.filter((b) => !kampanye.some((p) => p.id === b.kampanye));

  const bagian = [el('nav', { class: 'tab-kelompok', 'aria-label': t('promo.kelompok') }, tampilKelompok.map((k) => el('a', {
    href: `?k=${k}`, class: 'chip', 'aria-current': k === kelompok ? 'page' : null,
    onclick: (e) => { e.preventDefault(); kelompok = k; history.replaceState(null, '', `?k=${k}`); tampilkan(promo, apps, toko); },
  }, t(`promo.k.${k}`), el('small', {}, jumlah(k)))))];

  // panel pesan dipakai bersama oleh semua bundle di kelompok ini
  const ada = kampanye.length || bundleBiasa.length;
  const { aside, atur } = ada ? panelPesan({ toko, tanya: t('wa.umum'), judul: t('promo.bundlemu'), kosong: t('promo.belumPilih') }) : {};

  const kartuBundle = (b) => {
    const tombol = el('button', { class: 'tombol' + (b.best ? '' : ' garis'), type: 'button', disabled: b.habis || null }, b.habis ? t('promo.habisTombol') : t('promo.ambil'));
    const hemat = b.normal > b.price ? b.normal - b.price : 0;
    const k = el('article', { class: 'bundle-kartu kaca kartu-3d' + (b.best ? ' best' : '') + (b.habis ? ' habis' : ''), 'aria-current': 'false' },
      b.best ? el('span', { class: 'pita-best' }, t('promo.best')) : null,
      b.banner ? el('img', { class: 'banner', src: b.banner, alt: '', loading: 'lazy', style: 'aspect-ratio:16/7;object-fit:cover;width:100%' }) : null,
      el('div', { class: 'isi' },
        el('h3', {}, pilihBahasa(b.name, b.name_en)),
        pilihBahasa(b.desc, b.desc_en) ? el('p', { class: 'redup', style: 'margin:0;font-size:14px' }, pilihBahasa(b.desc, b.desc_en)) : null,
        el('ul', {}, b.items.map((i) => {
          const app = apps.find((a) => a.slug === i.slug) ?? { nama: i.app, kunciKategori: null };
          return el('li', {}, ikonApp(app),
            el('a', { href: urlApp(i.slug) }, el('b', {}, i.app), ' · ', labelTipe(i.tipe), ' · ', labelVarian(i.d)),
            i.q > 1 ? el('span', { class: 'kali', title: t('promo.kaliT', { n: i.q }) }, `×${i.q}`) : null);
        })),
        !b.kampanye && b.ends && b.hitung ? el('div', { class: 'promo-hm' }, el('small', {}, t('promo.berakhir')), hitungMundur(akhirHari(b.ends), { kecil: true }))
          : !b.kampanye && b.ends ? el('span', { class: 'redup', style: 'font-size:12.5px' }, t('promo.sampai', { tgl: tanggal(b.ends + 'T00:00:00') })) : null,
        stokBundle(b),
        el('div', { class: 'harga-bundle' },
          el('b', {}, harga(b.price)),
          hemat ? el('s', {}, harga(b.normal)) : null,
          hemat ? el('span', { class: 'hemat-lencana' }, t('promo.hematPct', { n: harga(hemat), p: Math.round((hemat / b.normal) * 100) })) : null),
        tombol));
    tombol.addEventListener('click', () => {
      for (const x of document.querySelectorAll('.bundle-kartu')) {
        x.setAttribute('aria-current', String(x === k));
        const tb = x.querySelector('.isi > .tombol');
        if (tb && !tb.disabled) tb.textContent = x === k ? t('promo.dipilih') : t('promo.ambil');
      }
      atur({
        baris: [pilihBahasa(b.name, b.name_en), ...b.items.map((i) => `${i.app} · ${labelTipe(i.tipe)} · ${labelVarian(i.d)}${i.q > 1 ? ` ×${i.q}` : ''}`)],
        total: b.price, normal: b.normal, kirim: { bundle: b.id },
      });
      if (matchMedia('(max-width: 899px)').matches) aside.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return k;
  };

  const blok = [];
  for (const p of kampanye) {
    const isiK = bundles.filter((b) => b.kampanye === p.id);
    const sisaTotal = isiK.reduce((s, b) => s + (b.habis ? 0 : b.stok ?? 0), 0);
    const judul = pilihBahasa(p.title, p.title_en);
    blok.push(el('section', { class: 'kampanye', style: p.warna ? `--kampanye:${p.warna}` : null, 'aria-label': judul },
      el('div', { class: 'kampanye-kepala' },
        el('div', { class: 'kampanye-teks' },
          p.lencana ? el('span', { class: 'lencana-kampanye' }, p.lencana) : null,
          el('h2', {}, judul),
          pilihBahasa(p.body, p.body_en) ? el('p', {}, pilihBahasa(p.body, p.body_en)) : null,
          el('div', { class: 'kampanye-fakta' },
            el('span', {}, t('promo.nBundle', { n: isiK.length })),
            isiK.some((b) => b.best) ? el('span', {}, t('promo.nBest', { n: isiK.filter((b) => b.best).length })) : null,
            sisaTotal ? el('span', {}, t('promo.sisaTotal', { n: sisaTotal })) : null)),
        p.ends && p.hitung === false ? el('div', { class: 'kampanye-akhir' }, el('small', {}, t('promo.sampai', { tgl: tanggal(p.ends + 'T00:00:00') })))
        : p.ends ? el('div', { class: 'kampanye-akhir' },
          el('small', {}, t('promo.berakhir')),
          hitungMundur(akhirHari(p.ends), { kecil: true, selesai: () => setTimeout(muat, 1500) }),
          el('small', { class: 'normal-lagi' }, t('promo.normalLagi', { tgl: tanggal(besokDari(p.ends) + 'T00:00:00') }))) : null,
        p.banner ? el('button', { type: 'button', class: 'poster-mini', onclick: () => bukaPoster(p.banner, judul), 'aria-label': t('promo.lihatPoster') },
          el('img', { src: p.banner, alt: '', loading: 'lazy' }), el('span', {}, t('promo.lihatPoster'))) : null),
      el('div', { class: 'promo-daftar' }, isiK.map(kartuBundle))));
  }

  if (promoBiasa.length) {
    blok.push(el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, t('promo.promo'))),
      el('div', { class: 'promo-daftar' }, promoBiasa.map(kartuPromo))));
  }
  if (bundleBiasa.length) {
    blok.push(el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, t('promo.bundle'))),
      el('div', { class: 'promo-daftar' }, bundleBiasa.map(kartuBundle))));
  }

  if (ada) {
    bagian.push(el('div', { class: 'tata-detail tata-promo', style: 'margin-top:0' }, el('div', { class: 'atas-detail' }, blok), aside));
  } else bagian.push(...blok);

  if (!promos.length && !bundles.length) bagian.push(el('div', { class: 'kosong kaca' }, el('p', {}, t('promo.kosongK', { k: t(`promo.k.${kelompok}`) }))));
  bagian.push(ajakanRakit(promo));
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
