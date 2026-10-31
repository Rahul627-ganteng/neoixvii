import { ambilDetail, ambilInfoTipe, ambilKatalog, ambilPromo, ambilToko, ambilUlasan, diskonTertinggi } from './api.js';
import { harga, inggris, labelTipe, labelVarian, pasangKurs, persen, t, tanggal, teksDurasi } from './i18n.js';
import { panelPesan } from './pesan.js';
import { bintang, daftarFaq, el, gabung, ikonApp, kartuApp, kartuUlasan, pasangKerangka, pasangTilt, pesanGagal, tulisCatatanKurs, urlKategori } from './ui.js';

pasangKerangka('/katalog/');
pasangTilt();

const isi = document.getElementById('isi');
const slug = new URLSearchParams(location.search).get('app') || '';

const pilihBahasa = (id, en) => (inggris() && en ? en : id);
const baris = (s) => String(s ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
const kata = (s) => String(s ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const mengandung = (label, kunci) => ` ${kata(label).join(' ')} `.includes(` ${kata(kunci).join(' ')} `);

function tidakDitemukan() {
  document.title = `${t('app.tidakAda')} — IXVII.CO`;
  isi.replaceChildren(el('div', { class: 'kosong kaca', style: 'margin-top:32px' },
    el('h1', { style: 'font-size:22px;margin:0 0 8px' }, t('app.tidakAda')),
    el('p', { class: 'redup' }, t('app.tidakAdaSub')),
    el('a', { class: 'tombol', href: '/katalog/' }, t('app.kembali'))));
}

/** Penjelasan tipe paket yang cocok dengan nama grup (mis. "Sharing", "Private"). */
function cocokTipe(label, infoTipe) {
  return infoTipe.find((i) => (i.keywords || []).some((k) => mengandung(label, k)));
}

// ---------------------------------------------------------------- bagian halaman
function bagianGrup(app, infoTipe, pilih) {
  return app.grup.map((g, gi) => {
    const info = cocokTipe(g.label, infoTipe);
    return el('section', { class: 'grup kaca' },
      el('div', { class: 'grup-kepala' },
        el('h2', { id: `grup-${gi}` }, labelTipe(g.label)),
        info ? el('a', { href: `#tipe-${infoTipe.indexOf(info)}` }, t('app.apaItu', { tipe: pilihBahasa(info.title, info.title_en).replace(/\s*\(.*\)\s*$/, '') })) : null),
      el('div', { class: 'paket', role: 'radiogroup', 'aria-labelledby': `grup-${gi}` },
        g.items.map((v) => {
          const habis = v.s === 0;
          const data = { ...v, tipe: g.label };
          return el('label', { class: 'opsi' + (habis ? ' habis' : '') },
            el('input', { type: 'radio', name: 'paket', value: v.id, disabled: habis, onchange: () => pilih(data) }),
            el('span', {}, el('span', { class: 'lbl' }, labelVarian(v.d)), el('br'),
              el('span', { class: 'lencana ' + (habis ? 'habis' : 'ada') }, habis ? t('app.habis') : t('app.tersedia'))),
            el('span', { class: 'hrg' }, harga(v.p)));
        })));
  });
}

function bagianTipe(app, infoTipe) {
  const dipakai = [];
  for (const g of app.grup) {
    const i = cocokTipe(g.label, infoTipe);
    if (i && !dipakai.includes(i)) dipakai.push(i);
  }
  if (!dipakai.length) return null;
  return el('section', { class: 'grup kaca', id: 'tentang-tipe' },
    el('h2', {}, t('app.tentangTipe')),
    el('div', { class: 'info-tipe' }, dipakai.map((i) => {
      const plus = baris(pilihBahasa(i.pros, i.pros_en));
      const min = baris(pilihBahasa(i.cons, i.cons_en));
      return el('article', { id: `tipe-${infoTipe.indexOf(i)}` },
        el('h3', {}, pilihBahasa(i.title, i.title_en)),
        el('p', {}, pilihBahasa(i.body, i.body_en)),
        plus.length ? [el('p', { class: 'sub' }, t('app.kelebihan')), el('ul', { class: 'plus' }, plus.map((x) => el('li', {}, x)))] : null,
        min.length ? [el('p', { class: 'sub' }, t('app.kekurangan')), el('ul', { class: 'min' }, min.map((x) => el('li', {}, x)))] : null);
    })));
}

/** Ulasan pembeli (Verified Purchase) untuk aplikasi ini: ringkasan + 3 terbaru. */
function bagianUlasan(app, data) {
  const semua = (data?.ulasan ?? []).filter((u) => u.slug === app.slug);
  if (!semua.length) return null;
  const rata = semua.reduce((s, u) => s + u.rating, 0) / semua.length;
  const angka = rata.toLocaleString(inggris() ? 'en-US' : 'id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return el('section', { class: 'grup kaca', id: 'ulasan-app' },
    el('h2', {}, t('app.ulasan')),
    el('p', { class: 'ringkas-ulasan' }, bintang(rata), t('testi.rata', { rata: angka, n: semua.length, s: semua.length === 1 ? '' : 's' })),
    el('div', { class: 'ulasan-daftar' }, semua.slice(0, 3).map((u) => kartuUlasan(u, { denganApp: false }))),
    el('a', { class: 'tautan-faq', href: `/testimoni/?app=${encodeURIComponent(app.slug)}` }, t('testi.lihat')));
}

// Perbandingan harga resmi vs IXVII.CO (paket dengan durasi sama, harga termurah yang tersedia).
function bagianBanding(app, resmi) {
  if (!resmi.length) return null;
  const isiBaris = resmi.map((r) => {
    const sama = app.varian.filter((v) => v.s !== 0 && v.h === r.duration_days);
    const termurah = sama.length ? sama.reduce((a, b) => (b.p < a.p ? b : a)) : null;
    const hemat = termurah && termurah.p < r.price ? Math.round((1 - termurah.p / r.price) * 100) : null;
    return el('tr', {},
      el('td', {}, r.label, r.note ? el('div', { class: 'redup', style: 'font-size:12px' }, r.note) : null),
      el('td', { class: 'angka' }, harga(r.price)),
      el('td', { class: 'angka' }, termurah ? harga(termurah.p) : '–',
        termurah ? el('div', { class: 'redup', style: 'font-size:12px' }, `${labelTipe(termurah.tipe)} · ${labelVarian(termurah.d)}`) : null),
      el('td', { class: 'angka' }, hemat != null ? el('span', { class: 'hemat' }, `${hemat}%`) : '–'));
  });
  const dicek = resmi.map((r) => r.checked_at).filter(Boolean).sort().at(-1);
  return el('section', { class: 'grup kaca' },
    el('h2', {}, t('app.banding')),
    el('div', { style: 'overflow-x:auto' }, el('table', { class: 'banding' },
      el('thead', {}, el('tr', {}, el('th', {}, t('app.bandingResmi')), el('th', { class: 'angka' }, t('app.bandingHargaResmi')),
        el('th', { class: 'angka' }, t('app.bandingKami')), el('th', { class: 'angka' }, t('app.bandingHemat')))),
      el('tbody', {}, isiBaris))),
    dicek ? el('p', { class: 'redup', style: 'font-size:12px;margin:10px 0 0' }, t('app.dicek', { tgl: tanggal(dicek) })) : null);
}

const PERANGKAT = /\b(android|andro|ios|iphone|ipad|pc|laptop|desktop|mac|macos|windows|tv|smart ?tv|all dev(ices)?)\b/i;

/** Tanya-jawab yang disusun otomatis dari data paket aplikasi ini. */
function faqOtomatis(app, infoTipe) {
  const out = [];
  const ada = app.varian.filter((v) => v.s !== 0);
  const tipe = gabung(app.grup.map((g) => labelTipe(g.label)));
  const n = app.varian.length;
  const hari = app.varian.map((v) => v.h).filter((h) => h > 0);
  const vars = { app: app.nama, tipe, n, s: n === 1 ? '' : 's' };
  if (hari.length && Math.min(...hari) !== Math.max(...hari)) {
    out.push({ q: t('faq.paket.q', vars), a: t('faq.paket.a', { ...vars, min: teksDurasi(Math.min(...hari)), max: teksDurasi(Math.max(...hari)) }) });
  } else {
    out.push({ q: t('faq.paket.q', vars), a: t('faq.paket.a1', vars) });
  }

  if (ada.length) {
    const m = ada.reduce((a, b) => (b.p < a.p ? b : a));
    out.push({ q: t('faq.murah.q', vars), a: t('faq.murah.a', { harga: harga(m.p), tipe: labelTipe(m.tipe), varian: labelVarian(m.d) }) });
  }

  // Sharing vs Private, kalau dua-duanya dijual
  const termurahDari = (cek) => {
    const daftar = ada.filter((v) => cek(v.tipe));
    return daftar.length ? Math.min(...daftar.map((v) => v.p)) : null;
  };
  const s = termurahDari((l) => mengandung(l, 'sharing'));
  const p = termurahDari((l) => mengandung(l, 'private') || mengandung(l, 'privat'));
  if (s != null && p != null) {
    out.push({ q: t('faq.pilih.q'), a: t('faq.pilih.a', { s: harga(s), p: harga(p) }) });
  }

  const khusus = [];
  for (const g of app.grup) {
    if (PERANGKAT.test(g.label)) khusus.push(labelTipe(g.label));
    else for (const v of g.items) if (PERANGKAT.test(v.d)) khusus.push(`${labelTipe(g.label)} · ${labelVarian(v.d)}`);
  }
  if (khusus.length) {
    out.push({ q: t('faq.perangkat.q'), a: t('faq.perangkat.a', { daftar: gabung([...new Set(khusus)].slice(0, 6)) }) });
  }

  out.push({ q: t('faq.cara.q', vars), a: t('faq.cara.a') });
  return out;
}

function bagianFaq(app, infoTipe, faqs) {
  const dariAdmin = faqs
    .map((f) => ({ q: pilihBahasa(f.question, f.question_en), a: pilihBahasa(f.answer, f.answer_en) }))
    .filter((f) => f.q && f.a);
  return el('section', { class: 'grup kaca faq', id: 'faq-app' },
    el('h2', {}, t('app.faq')),
    daftarFaq([...faqOtomatis(app, infoTipe), ...dariAdmin]),
    el('a', { class: 'tautan-faq', href: '/#faq' }, t('app.lihatFaqUmum')));
}

// ---------------------------------------------------------------- ringkasan & pemesanan
function bagianPesan(app, toko, promo) {
  // ajakan rakit bundle (kalau aturan diskon rakitan sudah ada)
  const tertinggi = diskonTertinggi(promo);
  const ajak = tertinggi ? el('a', { class: 'ajak-rakit', href: '/rakit/' }, t('rakit.ajak', { pct: persen(tertinggi.pct) })) : null;
  const { aside, atur } = panelPesan({ toko, tanya: t('wa.tanya', { app: app.nama }), sisipan: ajak ? [ajak] : [] });
  const pilih = (v) => {
    atur({ baris: [`${labelTipe(v.tipe)} · ${labelVarian(v.d)}`], total: v.p, kirim: { kode: [v.id] } });
    if (ajak) ajak.href = `/rakit/?pilih=${encodeURIComponent(v.id)}`;
  };
  return { aside, pilih };
}

// ---------------------------------------------------------------- susun halaman
function tampilkan(app, semua, detail, toko, infoTipe, promo, ulasan) {
  document.title = `${app.nama} — IXVII.CO`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.app', { app: app.nama, desc: app.desc }));

  const { aside, pilih } = bagianPesan(app, toko, promo);
  const lain = semua.filter((a) => a.kunciKategori === app.kunciKategori && a.slug !== app.slug && !a.habisSemua).slice(0, 4);

  isi.replaceChildren(...[
    el('nav', { class: 'remah', 'aria-label': t('app.remah') },
      el('a', { href: '/katalog/' }, t('nav.katalog')), ' / ',
      el('a', { href: urlKategori(app.kunciKategori) }, app.kategori), ' / ', app.nama),
    el('div', { class: 'kepala-app' }, ikonApp(app, true),
      el('div', {}, el('a', { class: 'kat', href: urlKategori(app.kunciKategori) }, app.kategori),
        el('h1', {}, app.nama))),
    el('p', { class: 'desk-app redup' }, app.desc),
    el('div', { class: 'tata-detail' },
      el('div', { class: 'atas-detail' }, bagianGrup(app, infoTipe, pilih)),
      aside,
      el('div', { class: 'bawah-detail' }, bagianTipe(app, infoTipe), bagianUlasan(app, ulasan), bagianBanding(app, detail.resmi), bagianFaq(app, infoTipe, detail.faqs))),
    lain.length ? el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, t('app.lainnya', { kat: app.kategori })),
        el('a', { href: urlKategori(app.kunciKategori) }, t('app.lihatSemua'))),
      el('div', { class: 'grid' }, lain.map(kartuApp))) : null].filter(Boolean));

  // pilih otomatis paket tersedia termurah
  const termurah = app.varian.filter((v) => v.s !== 0).sort((a, b) => a.p - b.p)[0];
  if (termurah) {
    const r = isi.querySelector(`input[value="${CSS.escape(termurah.id)}"]`);
    if (r) { r.checked = true; pilih(termurah); }
  }
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

async function muat() {
  isi.replaceChildren(el('div', { class: 'memuat', style: 'margin-top:32px;height:280px' }));
  try {
    const [{ apps }, toko, infoTipe, promo, ulasan] = await Promise.all([ambilKatalog(), ambilToko(), ambilInfoTipe(), ambilPromo(), ambilUlasan()]);
    pasangKurs(toko);
    tulisCatatanKurs();
    const app = apps.find((a) => a.slug === slug);
    if (!app) return tidakDitemukan();
    const detail = await ambilDetail(app.id);
    tampilkan(app, apps, detail, toko, infoTipe, promo, ulasan);
  } catch (err) {
    console.error(err);
    isi.replaceChildren(pesanGagal(t('gagal.app'), muat));
  }
}
muat();
