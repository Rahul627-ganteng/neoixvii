import { ambilFaqUmum, ambilKatalog, ambilPromo, ambilToko, diskonTertinggi } from './api.js';
import { inggris, pasangKurs, persen, t } from './i18n.js';
import { daftarFaq, el, kartuApp, kerangkaMemuat, pasangKerangka, pasangTilt, pesanGagal, tautanWa, tulisCatatanKurs, urlKategori } from './ui.js';

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
