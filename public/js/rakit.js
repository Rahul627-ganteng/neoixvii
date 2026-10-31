// Rakit bundle sendiri: pembeli memilih satu paket dari beberapa aplikasi, diskon dihitung di server
// (rpc bundle_quote) dan tidak pernah membuat harga turun di bawah batas aman.
import { ambilKatalog, ambilPromo, ambilToko, hitungRakit } from './api.js';
import { harga, labelTipe, labelVarian, pasangKurs, persen, t, teksDurasi, teksGalat } from './i18n.js';
import { panelPesan } from './pesan.js';
import { el, ikonApp, kerangkaMemuat, pasangKerangka, pesanGagal, tulisCatatanKurs } from './ui.js';

pasangKerangka('/rakit/');

const MAKS = 10;
const isi = document.getElementById('isi');
const wadahTingkat = document.getElementById('tingkat');
const bersih = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ');

let data = null;          // { kategori, apps }
let aturan = [];          // [{min, pct}]
let bonusDurasi = [];     // [{hari, pct}] bonus untuk paket berdurasi panjang
const pilihan = new Map(); // slug aplikasi → varian (dengan tipe & nama aplikasi)
let panel = null;
let petunjuk = null;
let bar = null;            // bilah bawah di HP: jumlah aplikasi + total, tombol ke ringkasan
let panelTerlihat = false;
let urutHitung = 0;
let jedaHitung;
let filterKategori = '';
let kataCari = '';

// ---------------------------------------------------------------- tingkat diskon
function gambarTingkat() {
  if (!aturan.length) { wadahTingkat.replaceChildren(el('span', {}, t('rakit.belumAturan'))); return; }
  const n = pilihan.size;
  const aktif = [...aturan].reverse().find((a) => n >= a.min);
  wadahTingkat.replaceChildren(...aturan.map((a, i) => el('span', { 'aria-current': String(a === aktif) },
    el('b', {}, t(i === aturan.length - 1 ? 'rakit.tingkatPlus' : 'rakit.tingkat', { n: a.min })),
    t('rakit.hingga', { pct: persen(a.pct) }))),
  bonusDurasi.length ? el('div', { class: 'tingkat-durasi' }, el('small', {}, t('rakit.bonusJudul')),
    bonusDurasi.map((d) => el('span', {}, el('b', {}, t('rakit.durasiMin', { d: teksDurasi(d.hari) })), `+${persen(d.pct)}`))) : null);
}

/** Bonus durasi untuk paket dengan durasi h hari (0 kalau tidak ada). */
const bonusUntuk = (h) => Math.max(0, ...bonusDurasi.filter((d) => (h ?? 0) >= d.hari).map((d) => d.pct));

// ---------------------------------------------------------------- daftar aplikasi
function simpanUrl() {
  const p = new URLSearchParams();
  if (pilihan.size) p.set('pilih', [...pilihan.values()].map((v) => v.id).join(','));
  history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
}

function kartuApp(app) {
  const v = pilihan.get(app.slug);
  const kecil = el('small', {}, v ? `${labelTipe(v.tipe)} · ${labelVarian(v.d)} · ${harga(v.p)}`
    : app.habisSemua ? t('kartu.habis') : `${t('kartu.mulai')} ${harga(app.hargaMulai)}`);
  const d = el('details', { class: 'rakit-app kaca' + (v ? ' terpilih' : ''), 'data-slug': app.slug },
    el('summary', {}, ikonApp(app), el('span', { class: 'nama' }, el('b', {}, app.nama), kecil)));
  // isi baru dibuat saat dibuka supaya halaman tetap ringan
  d.addEventListener('toggle', () => {
    if (!d.open || d.dataset.siap) return;
    d.dataset.siap = '1';
    d.append(el('div', { class: 'badan' },
      app.grup.map((g) => el('div', {},
        el('h4', {}, labelTipe(g.label)),
        el('div', { class: 'paket', role: 'radiogroup', 'aria-label': `${app.nama} ${labelTipe(g.label)}` },
          g.items.map((i) => {
            const habis = i.s === 0;
            const x = { ...i, tipe: g.label, app: app.nama, slug: app.slug };
            const input = el('input', { type: 'radio', name: `rakit-${app.slug}`, value: i.id, disabled: habis, checked: pilihan.get(app.slug)?.id === i.id });
            input.addEventListener('change', () => {
              if (!pilihan.has(app.slug) && pilihan.size >= MAKS) { input.checked = false; tulisPetunjuk(t('rakit.maks10')); return; }
              pilihan.set(app.slug, x);
              d.open = false;
              perbarui();
            });
            const bonus = aturan.length ? bonusUntuk(i.h) : 0;
            return el('label', { class: 'opsi' + (habis ? ' habis' : '') }, input,
              el('span', {}, el('span', { class: 'lbl' }, labelVarian(i.d)), el('br'),
                el('span', { class: 'lencana ' + (habis ? 'habis' : 'ada') }, habis ? t('app.habis') : t('app.tersedia')),
                bonus && !habis ? el('span', { class: 'lencana bonus' }, t('rakit.bonusLencana', { pct: persen(bonus) })) : null),
              el('span', { class: 'hrg' }, harga(i.p)));
          })))),
      pilihan.has(app.slug) ? el('button', { class: 'tombol garis hapus-pilihan', type: 'button', onclick: () => { pilihan.delete(app.slug); perbarui(); } }, t('rakit.hapusPilihan')) : null));
  });
  return d;
}

function gambarDaftar() {
  const { kategori, apps } = data;
  const kata = bersih(kataCari).split(/\s+/).filter(Boolean);
  const cocok = apps.filter((a) => (!filterKategori || a.kunciKategori === filterKategori) &&
    kata.every((w) => bersih(`${a.nama} ${a.kategori} ${a.kunciKategori}`).includes(w)));
  const chips = document.getElementById('rakit-kategori');
  chips.replaceChildren(...[{ kunci: '', label: t('katalog.semua'), jumlah: apps.length }, ...kategori].map((k) =>
    el('button', { class: 'chip', type: 'button', 'aria-pressed': String(k.kunci === filterKategori),
      onclick: () => { filterKategori = k.kunci; gambarDaftar(); } }, k.label, el('small', {}, k.jumlah))));
  document.getElementById('rakit-daftar').replaceChildren(...(cocok.length ? cocok.map(kartuApp)
    : [el('p', { class: 'redup' }, t('rakit.tidakAda'))]));
}

// ---------------------------------------------------------------- panel & harga
function tulisPetunjuk(teks, maks = false) {
  petunjuk.textContent = teks || '';
  petunjuk.className = 'petunjuk' + (maks ? ' maks' : '');
  petunjuk.hidden = !teks;
}

function daftarTerpilih() {
  return el('ul', { class: 'terpilih-daftar' }, [...pilihan.values()].map((v) => el('li', {},
    el('span', {}, el('b', {}, v.app), el('small', {}, `${labelTipe(v.tipe)} · ${labelVarian(v.d)} · ${harga(v.p)}`)),
    el('button', { type: 'button', 'aria-label': t('rakit.hapus', { app: v.app }), title: t('rakit.hapus', { app: v.app }),
      onclick: () => { pilihan.delete(v.slug); perbarui(); } }, '×'))));
}

function perbarui() {
  simpanUrl();
  gambarTingkat();
  gambarDaftar();
  clearTimeout(jedaHitung);
  if (!pilihan.size) { panel.atur(null); panel.sibuk(false); tulisPetunjuk(aturan.length ? t('rakit.lagi', sisa(0)) : ''); tulisBar(0); return; }
  const kode = [...pilihan.values()].map((v) => v.id);
  const normal = [...pilihan.values()].reduce((s, v) => s + v.p, 0);
  // tampilkan dulu jumlah biasa, lalu ganti dengan hasil server
  panel.atur({ baris: [daftarTerpilih()], total: normal, kirim: { kode } });
  panel.sibuk(true);
  tulisBar(normal);
  const nomor = ++urutHitung;
  jedaHitung = setTimeout(async () => {
    try {
      const q = await hitungRakit(kode);
      if (nomor !== urutHitung) return;
      panel.atur({ baris: [daftarTerpilih()], total: q.total, normal: q.total_normal, kirim: { kode, rakit: true } });
      tulisBar(q.total);
      if (q.berikutnya) tulisPetunjuk(t('rakit.lagi', sisa(q.jumlah_app, q.berikutnya)));
      else if (aturan.length) tulisPetunjuk(t('rakit.maks'), true);
      else tulisPetunjuk(t('rakit.belumAturan'));
    } catch (err) {
      if (nomor !== urutHitung) return;
      // server lama / galat: pesan tetap bisa dibuat tanpa diskon
      tulisPetunjuk(/404|Could not find|Gagal \(/.test(err.message) ? t('rakit.belumAturan') : teksGalat(err.message));
    } finally {
      if (nomor === urutHitung) panel.sibuk(false);
    }
  }, 250);
}

function tulisBar(total) {
  if (!bar) return;
  const n = pilihan.size;
  bar.querySelector('span').textContent = t('rakit.bar', { n, s: n === 1 ? '' : 's', total: harga(total) });
  bar.hidden = !n || panelTerlihat;
}

/** Variabel untuk teks "Tambah n aplikasi lagi…". */
function sisa(n, berikut = aturan.find((a) => a.min > n)) {
  if (!berikut) return { n: 0, s: '', pct: '' };
  const k = berikut.min - n;
  return { n: k, s: k === 1 ? '' : 's', pct: persen(berikut.pct) };
}

// ---------------------------------------------------------------- muat
async function muat() {
  isi.replaceChildren(el('div', { class: 'rakit-daftar' }, kerangkaMemuat(4)));
  try {
    const [katalog, promo, toko] = await Promise.all([ambilKatalog(), ambilPromo(), ambilToko()]);
    pasangKurs(toko);
    tulisCatatanKurs();
    data = katalog;
    aturan = (promo?.rules ?? []).map((r) => ({ min: Number(r.min), pct: Number(r.pct) })).sort((a, b) => a.min - b.min);
    bonusDurasi = (promo?.durasi ?? []).map((d) => ({ hari: Number(d.hari), pct: Number(d.pct) })).sort((a, b) => a.hari - b.hari);

    // pilihan awal dari URL (?pilih=V0004,V0171), misalnya dari halaman aplikasi
    const kodeAwal = (new URLSearchParams(location.search).get('pilih') || '').split(',').filter(Boolean);
    for (const app of data.apps) {
      const v = app.varian.find((x) => kodeAwal.includes(x.id) && x.s !== 0);
      if (v && pilihan.size < MAKS) pilihan.set(app.slug, { ...v, app: app.nama, slug: app.slug });
    }

    petunjuk = el('p', { class: 'petunjuk', hidden: true });
    panel = panelPesan({ toko, tanya: t('wa.umum'), judul: t('rakit.rakitanmu'), kosong: t('rakit.kosong'),
      sisipan: [petunjuk, el('p', { class: 'catatan', style: 'margin:0 0 12px' }, t('rakit.catatanDiskon'))] });
    const cari = el('input', { id: 'rakit-cari', type: 'search', placeholder: t('rakit.cari'), autocomplete: 'off', style: 'padding-left:16px' });
    let jeda;
    cari.addEventListener('input', () => { clearTimeout(jeda); jeda = setTimeout(() => { kataCari = cari.value.trim(); gambarDaftar(); }, 150); });
    isi.replaceChildren(el('div', { class: 'tata-detail', style: 'margin-top:8px' },
      el('div', { class: 'atas-detail' },
        el('div', { class: 'cari', style: 'margin-top:0' },
          el('label', { class: 'tersembunyi', for: 'rakit-cari' }, t('rakit.cariLabel')), cari),
        el('div', { class: 'chips', id: 'rakit-kategori', role: 'group', 'aria-label': t('katalog.filter'), style: 'margin-bottom:14px' }),
        el('div', { class: 'rakit-daftar', id: 'rakit-daftar' })),
      panel.aside));
    bar = el('div', { class: 'bar-rakit', hidden: true }, el('span', {}),
      el('button', { class: 'tombol', type: 'button', onclick: () => panel.aside.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, t('rakit.lihat')));
    document.body.append(bar);
    new IntersectionObserver(([e]) => { panelTerlihat = e.isIntersecting; bar.hidden = !pilihan.size || panelTerlihat; })
      .observe(panel.aside);
    perbarui();
  } catch (err) {
    console.error(err);
    isi.replaceChildren(pesanGagal(t('gagal.katalog'), muat));
  }
}
muat();
