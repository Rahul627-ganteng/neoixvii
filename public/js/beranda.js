import { akunMember, ambilBerita, ambilFaqUmum, ambilFilm, ambilKatalog, ambilProgramMember, ambilProgramReseller, ambilPromo, ambilSorotan, ambilTerlaris, ambilToko, ambilUlasan, diskonTertinggi, infoAjak } from './api.js';
import { ambilAjak, ambilBundle, ambilMember, ambilRiwayat, simpanAjak, simpanBundle } from './akun.js';
import { kartuFilm } from './film-kartu.js';
import { bandingGabung, kartuGabung } from './gabung.js';
import { pasangSorotan, sambutanAjak, susunSorotan } from './sorotan.js';
import { inggris, labelTipe, labelVarian, pasangKurs, persen, rupiah, t, tanggal } from './i18n.js';
import { daftarFaq, el, ikonKategori, kartuApp, kartuUlasan, kerangkaMemuat, pasangKerangka, pasangTilt, pesanGagal, tautanWa, tulisCatatanKurs, urlKategori } from './ui.js';

pasangKerangka('/', { n: t('hero.banyak') });
pasangTilt();

const $ = (id) => document.getElementById(id);
const wadahUnggulan = $('unggulan');
const wadahKategori = $('daftar-kategori');
let katalog = null;

async function muat() {
  wadahUnggulan.replaceChildren(...kerangkaMemuat(4));
  wadahKategori.replaceChildren(...kerangkaMemuat(6));
  try {
    const [kat, toko] = await Promise.all([ambilKatalog(), ambilToko()]);
    katalog = kat;
    const { kategori, apps } = kat;
    pasangKurs(toko);
    tulisCatatanKurs();

    const lain = apps.filter((a) => !/^(netflix|chatgpt|canva|spotify)/i.test(a.nama)).length;
    $('hero-teks').textContent = t('hero.teks', { n: lain });

    gambarKategori(kategori, apps);
    gambarPita(apps);
    muatSorotan(apps);
    muatTerlaris(apps);
    muatTerakhir(apps);
    muatMember();
    muatFaq(toko);
    muatPromo();
    muatUlasan();
    muatFilm(apps);
    muatGabung();
    gambarBarBundle();
  } catch {
    wadahKategori.replaceChildren();
    wadahUnggulan.replaceChildren(pesanGagal(t('gagal.katalog'), muat));
  }
}

// ---------------------------------------------------------------- headline (kabar terkini)
async function muatSorotan(apps) {
  const [sorotan, promo, terlaris, member, reseller, film, berita] = await Promise.all([
    ambilSorotan(), ambilPromo(), ambilTerlaris(), ambilProgramMember(), ambilProgramReseller(), ambilFilm(), ambilBerita({ batas: 1 })]);
  const slides = susunSorotan({ sorotan, promo, terlaris, member, reseller, film, berita, apps, bySlug: new Map(apps.map((a) => [a.slug, a])) });
  const wadah = $('sorotan');
  pasangSorotan(wadah, slides);
  document.querySelector('.hero')?.classList.toggle('ada-sorotan', !wadah.hidden);
}

// sambutan untuk pengunjung dari link ajak teman (?ajak=KODE)
async function muatAjak() {
  const a = ambilAjak();
  if (!a) return;
  try { if (sessionStorage.getItem('ixvii-ajak-tutup') === a.kode) return; } catch { /* abaikan */ }
  const info = await infoAjak(a.kode);
  if (!info) { simpanAjak(null); return; }
  const wadah = $('sambut-ajak');
  wadah.replaceChildren(sambutanAjak(info, () => { wadah.hidden = true; try { sessionStorage.setItem('ixvii-ajak-tutup', a.kode); } catch { /* abaikan */ } }));
  wadah.hidden = false;
}
muatAjak();

// ---------------------------------------------------------------- "Kamu butuh aplikasi apa?"
// pita nama aplikasi yang berjalan (teks saja, bukan logo merek)
function gambarPita(apps) {
  const nama = [...new Set(apps.filter((a) => !a.habisSemua).map((a) => a.nama.replace(/\s+(premium|pro|plus)$/i, '').trim()))].slice(0, 24);
  if (nama.length < 4) return;
  const isi = (sembunyi) => el('div', { class: 'pita-isi', 'aria-hidden': sembunyi ? 'true' : null },
    nama.map((n) => el('span', { class: 'pita-item' }, n)));
  $('pita-jalan').replaceChildren(isi(false), isi(true));
  $('pita-jalan').style.setProperty('--durasi-pita', `${Math.max(28, nama.length * 3)}s`);
  $('pita-app').hidden = false;
}

function gambarKategori(kategori, apps) {
  wadahKategori.replaceChildren(...kategori.map((k) => {
    const isi = apps.filter((a) => a.kunciKategori === k.kunci);
    const contoh = isi.filter((a) => !a.habisSemua).concat(isi.filter((a) => a.habisSemua)).slice(0, 4).map((a) => a.nama);
    const sisa = isi.length - contoh.length;
    return el('a', { class: 'kat-besar kaca', href: urlKategori(k.kunci) },
      ikonKategori(k.kunci),
      el('span', { class: 'kat-teks' },
        el('b', {}, k.label),
        el('small', { class: 'kat-jumlah' }, t('kategori.jumlah', { n: isi.length })),
        el('span', { class: 'kat-isi' }, contoh.join(', ') + (sisa > 0 ? ` ${t('kategori.lainnya', { n: sisa })}` : ''))),
      el('span', { class: 'kat-panah', 'aria-hidden': 'true' }, '→'));
  }));
}

// ---------------------------------------------------------------- bundle dari beranda
const varianDari = (app, kode) => app.varian.find((v) => v.id === kode && v.s !== 0)
  ?? [...app.varian].filter((v) => v.s !== 0).sort((a, b) => a.p - b.p)[0] ?? null;

function tombolBundle(app, kode) {
  const v = varianDari(app, kode);
  if (!v) return el('span', { class: 'lencana habis' }, t('kartu.habis'));
  const tombol = el('button', { class: 'tombol garis kecil tombol-bundle', type: 'button' });
  const gambar = () => {
    const ada = ambilBundle().includes(v.id);
    tombol.textContent = ada ? t('bundle.sudah') : t('bundle.tambah');
    tombol.setAttribute('aria-pressed', String(ada));
  };
  tombol.addEventListener('click', () => {
    let isi = ambilBundle();
    // satu paket per aplikasi: ganti paket lama dari aplikasi yang sama
    const kodeApp = new Set(app.varian.map((x) => x.id));
    if (isi.includes(v.id)) isi = isi.filter((x) => x !== v.id);
    else isi = [...isi.filter((x) => !kodeApp.has(x)), v.id].slice(-10);
    simpanBundle(isi);
    document.querySelectorAll('.tombol-bundle').forEach((b) => b.dispatchEvent(new Event('segar')));
    gambarBarBundle();
  });
  tombol.addEventListener('segar', gambar);
  gambar();
  return el('div', { class: 'aksi-kartu' },
    el('small', {}, `${labelTipe(v.tipe)} · ${labelVarian(v.d)}`), tombol);
}

function kartuDenganAksi(app, kode, { peringkat, catatan } = {}) {
  return el('div', { class: 'kartu-aksi' },
    peringkat ? el('span', { class: 'peringkat', 'aria-label': t('beranda.peringkat', { n: peringkat }) }, `#${peringkat}`) : null,
    kartuApp(app),
    catatan ? el('p', { class: 'catatan-kartu' }, catatan) : null,
    tombolBundle(app, kode));
}

function gambarBarBundle() {
  let bar = $('bar-bundle');
  const isi = ambilBundle();
  if (!bar) {
    bar = el('div', { id: 'bar-bundle', class: 'bar-bundle', hidden: true });
    document.body.append(bar);
  }
  const nama = katalog ? isi.map((k) => katalog.apps.find((a) => a.varian.some((v) => v.id === k))?.nama).filter(Boolean) : [];
  bar.hidden = !isi.length;
  bar.replaceChildren(
    el('span', {}, t('bundle.bar', { n: isi.length }), nama.length ? el('small', {}, nama.join(', ')) : null),
    el('a', { class: 'tombol', href: `/rakit/?pilih=${encodeURIComponent(isi.join(','))}` }, t('bundle.lanjut')));
}

// ---------------------------------------------------------------- top picked bulan ini
async function muatTerlaris(apps) {
  const data = await ambilTerlaris();
  const bySlug = new Map(apps.map((a) => [a.slug, a]));
  let daftar = (data?.apps ?? []).map((x) => ({ app: bySlug.get(x.slug), kode: x.kode })).filter((x) => x.app && !x.app.habisSemua);
  if (data?.periode === '60hari') $('terlaris-sub').textContent = t('beranda.topSub60');
  if (daftar.length < 4) {
    // belum cukup data penjualan: lengkapi dengan aplikasi unggulan pilihan admin
    const ada = new Set(daftar.map((x) => x.app.slug));
    let tambahan = apps.filter((a) => a.unggulan && !a.habisSemua && !ada.has(a.slug));
    if (!tambahan.length) tambahan = [...new Set(apps.map((a) => a.kunciKategori))].map((k) => apps.find((a) => a.kunciKategori === k && !a.habisSemua && !ada.has(a.slug))).filter(Boolean);
    daftar = daftar.concat(tambahan.map((app) => ({ app, kode: null })));
    if (!data?.apps?.length) $('terlaris-sub').textContent = t('beranda.topSubPilihan');
  }
  const jumlahLaris = (data?.apps ?? []).length;
  wadahUnggulan.replaceChildren(...daftar.slice(0, 6).map((x, i) => kartuDenganAksi(x.app, x.kode, { peringkat: i < jumlahLaris ? i + 1 : null })));
}

// ---------------------------------------------------------------- terakhir kamu beli
async function muatTerakhir(apps) {
  const bySlug = new Map(apps.map((a) => [a.slug, a]));
  const byKode = new Map(apps.flatMap((a) => a.varian.map((v) => [v.id, a])));
  let riwayat = ambilRiwayat().flatMap((r) => r.items.map((i) => ({ ...i, t: r.t })));
  const m = ambilMember();
  if (m) {
    try {
      const akun = await akunMember(m.token);
      const dariAkun = (akun.pesanan ?? []).filter((o) => o.status !== 'batal')
        .flatMap((o) => o.items.map((i) => ({ kode: i.kode, slug: i.slug, varian: i.varian, t: Date.parse(o.tanggal) })));
      riwayat = [...dariAkun, ...riwayat].sort((a, b) => b.t - a.t);
    } catch { /* link member tidak berlaku lagi: pakai riwayat perangkat ini */ }
  } else $('terakhir-link').href = '/member/';
  const sudah = new Set();
  const pilih = [];
  for (const r of riwayat) {
    const app = bySlug.get(r.slug) ?? byKode.get(r.kode);
    if (!app || sudah.has(app.slug)) continue;
    sudah.add(app.slug);
    pilih.push({ app, kode: r.kode, catatan: t('beranda.terakhirInfo', { varian: labelVarian(r.varian ?? ''), tgl: tanggal(r.t) }) });
    if (pilih.length === 4) break;
  }
  if (!pilih.length) return;
  $('terakhir-isi').replaceChildren(...pilih.map((x) => kartuDenganAksi(x.app, x.kode, { catatan: x.catatan })));
  $('terakhir-beranda').hidden = false;
}

// ---------------------------------------------------------------- ajakan member
async function muatMember() {
  if (ambilMember()) return;
  const pr = await ambilProgramMember();
  const hari = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  if (!pr?.aktif || Number(pr.diskon_pct) <= 0 || (pr.mulai && pr.mulai > hari) || (pr.sampai && pr.sampai < hari)) return;
  const pc = (n) => persen(Number(n) / 100);
  $('member-beranda').replaceChildren(el('div', { class: 'ajak-member kaca' },
    el('div', {},
      el('span', { class: 'gabung-label merah' }, t('member.label')),
      el('h3', {}, t('member.ajakJudul', { pct: pc(pr.diskon_pct) })),
      el('p', {}, t('member.ajakTeks', { besar: pc(pr.diskon_besar_pct), min: rupiah(pr.min_besar) }),
        pr.sampai ? ` ${t('member.sampai', { tgl: tanggal(pr.sampai + 'T00:00:00') })}` : '')),
    el('a', { class: 'tombol', href: '/member/' }, t('member.ajakTombol'))));
  $('member-beranda').hidden = false;
}

// ---------------------------------------------------------------- reseller & affiliate
async function muatGabung() {
  const pr = await ambilProgramReseller();
  if (!pr) return;
  $('gabung-isi').replaceChildren(...kartuGabung(pr));
  $('banding-isi').replaceChildren(bandingGabung(pr));
  $('gabung').hidden = false;
}

async function muatFaq(toko) {
  const en = inggris();
  const faq = (await ambilFaqUmum())
    .map((f) => ({ q: (en && f.question_en) || f.question, a: (en && f.answer_en) || f.answer }))
    .filter((f) => f.q && f.a);
  if (!faq.length) return;
  $('faq-umum').replaceChildren(...daftarFaq(faq));
  if (toko?.whatsapp_number) {
    const p = $('faq-wa');
    p.replaceChildren(t('faq.masihTanya'), ' ',
      el('a', { href: tautanWa(toko.whatsapp_number, t('wa.umum')), target: '_blank', rel: 'noopener' }, t('faq.chatWa')));
    p.hidden = false;
  }
  $('faq').hidden = false;
  if (location.hash === '#faq') $('faq').scrollIntoView();
}

async function muatFilm(apps) {
  const film = (await ambilFilm()) ?? [];
  if (!film.length) return;
  // 2 sedang tayang terbaru + 2 akan tayang terdekat (atau sisanya dari yang ada)
  const sedang = film.filter((f) => f.status === 'sedang');
  const akan = film.filter((f) => f.status === 'akan');
  const pilih = [...sedang.slice(0, 2), ...akan.slice(0, 2)];
  for (const f of [...sedang.slice(2), ...akan.slice(2)]) if (pilih.length < 4) pilih.push(f);
  $('film-isi').replaceChildren(...pilih.map((f) => kartuFilm(f, apps)));
  $('film-beranda').hidden = false;
}

async function muatUlasan() {
  const data = await ambilUlasan();
  const ulasan = data?.ulasan ?? [];
  if (!ulasan.length) return;
  // utamakan ulasan yang ada tulisannya
  const pilih = [...ulasan.filter((u) => u.isi), ...ulasan.filter((u) => !u.isi)].slice(0, 3);
  $('ulasan-isi').replaceChildren(...pilih.map((u) => kartuUlasan(u)));
  $('ulasan-beranda').hidden = false;
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
  $('promo-isi').replaceChildren(...kartu);
  $('promo-beranda').hidden = false;
}

muat();
