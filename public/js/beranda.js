import { ambilFaqUmum, ambilFilm, ambilKatalog, ambilPromo, ambilToko, ambilUlasan, diskonTertinggi } from './api.js';
import { kartuFilm } from './film-kartu.js';
import { inggris, pasangKurs, persen, t } from './i18n.js';
import { daftarFaq, el, kartuApp, kartuUlasan, kerangkaMemuat, pasangKerangka, pasangTilt, pesanGagal, tautanWa, tulisCatatanKurs, urlKategori } from './ui.js';

pasangKerangka('/', { n: t('hero.banyak') });
pasangTilt();

const wadahUnggulan = document.getElementById('unggulan');
const wadahKategori = document.getElementById('daftar-kategori');

async function muat() {
  wadahUnggulan.replaceChildren(...kerangkaMemuat(6));
  try {
    const [{ kategori, apps }, toko] = await Promise.all([ambilKatalog(), ambilToko()]);
    pasangKurs(toko);
    tulisCatatanKurs();

    const lain = apps.filter((a) => !/^(netflix|chatgpt|canva|spotify)/i.test(a.nama)).length;
    document.getElementById('hero-teks').textContent = t('hero.teks', { n: lain });

    wadahKategori.replaceChildren(...kategori.map((k) =>
      el('a', { class: 'chip', href: urlKategori(k.kunci) }, k.label, el('small', {}, k.jumlah))));

    // Produk unggulan pilihan admin; kalau belum ada, ambil aplikasi pertama dari tiap kategori.
    let pilihan = apps.filter((a) => a.unggulan && !a.habisSemua);
    if (!pilihan.length) pilihan = kategori.map((k) => apps.find((a) => a.kunciKategori === k.kunci && !a.habisSemua)).filter(Boolean);
    wadahUnggulan.replaceChildren(...pilihan.slice(0, 6).map(kartuApp));
    muatFaq(toko);
    muatPromo();
    muatUlasan();
    muatFilm(apps);
  } catch {
    wadahUnggulan.replaceChildren(pesanGagal(t('gagal.katalog'), muat));
  }
}

async function muatFaq(toko) {
  const en = inggris();
  const faq = (await ambilFaqUmum())
    .map((f) => ({ q: (en && f.question_en) || f.question, a: (en && f.answer_en) || f.answer }))
    .filter((f) => f.q && f.a);
  if (!faq.length) return;
  document.getElementById('faq-umum').replaceChildren(...daftarFaq(faq));
  if (toko?.whatsapp_number) {
    const p = document.getElementById('faq-wa');
    p.replaceChildren(t('faq.masihTanya'), ' ',
      el('a', { href: tautanWa(toko.whatsapp_number, t('wa.umum')), target: '_blank', rel: 'noopener' }, t('faq.chatWa')));
    p.hidden = false;
  }
  document.getElementById('faq').hidden = false;
  if (location.hash === '#faq') document.getElementById('faq').scrollIntoView();
}

async function muatFilm(apps) {
  const film = (await ambilFilm()) ?? [];
  if (!film.length) return;
  // 2 sedang tayang terbaru + 2 akan tayang terdekat (atau sisanya dari yang ada)
  const sedang = film.filter((f) => f.status === 'sedang');
  const akan = film.filter((f) => f.status === 'akan');
  const pilih = [...sedang.slice(0, 2), ...akan.slice(0, 2)];
  for (const f of [...sedang.slice(2), ...akan.slice(2)]) if (pilih.length < 4) pilih.push(f);
  document.getElementById('film-isi').replaceChildren(...pilih.map((f) => kartuFilm(f, apps)));
  document.getElementById('film-beranda').hidden = false;
}

async function muatUlasan() {
  const data = await ambilUlasan();
  const ulasan = data?.ulasan ?? [];
  if (!ulasan.length) return;
  // utamakan ulasan yang ada tulisannya
  const pilih = [...ulasan.filter((u) => u.isi), ...ulasan.filter((u) => !u.isi)].slice(0, 3);
  document.getElementById('ulasan-isi').replaceChildren(...pilih.map((u) => kartuUlasan(u)));
  document.getElementById('ulasan-beranda').hidden = false;
}

async function muatPromo() {
  const promo = await ambilPromo();
  if (!promo) return;
  const jumlah = (promo.promos?.length ?? 0) + (promo.bundles?.length ?? 0);
  const atas = diskonTertinggi(promo);
  const kartu = [];
  if (jumlah) {
    kartu.push(el('div', { class: 'ajakan kaca' },
      el('div', {}, el('h3', {}, t('seksi.promo')), el('p', {}, t('beranda.promoT', { n: jumlah }))),
      el('a', { class: 'tombol garis', href: '/promo/' }, t('beranda.promoTombol'))));
  }
  if (atas) {
    kartu.push(el('div', { class: 'ajakan kaca' },
      el('div', {}, el('h3', {}, t('promo.rakitJ')), el('p', {}, t('promo.rakitT', { pct: persen(atas.pct), n: atas.min }))),
      el('a', { class: 'tombol', href: '/rakit/' }, t('promo.rakitTombol'))));
  }
  if (!kartu.length) return;
  document.getElementById('promo-isi').replaceChildren(...kartu);
  document.getElementById('promo-beranda').hidden = false;
}

muat();
