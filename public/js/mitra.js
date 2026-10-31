// Direktori mitra resmi: cari nama/kode referral untuk memastikan seseorang benar-benar mitra IXVII.CO.
import { ambilMitra, ambilToko } from './api.js';
import { bulanTahun, t } from './i18n.js';
import { el, kerangkaMemuat, pasangKerangka, pesanGagal, tautanWa } from './ui.js';

pasangKerangka('/mitra/');

const isi = document.getElementById('isi');
const info = document.getElementById('info-hasil');
const cekHasil = document.getElementById('cek-hasil');
const kotakCari = document.getElementById('kotak-cari');
const filterJenis = document.getElementById('filter-jenis');
const filterKota = document.getElementById('filter-kota');
filterJenis.setAttribute('aria-label', t('mitra.judul'));
const AVATAR = '/assets/brand/avatar-anonim.svg';

const params = new URLSearchParams(location.search);
let kata = params.get('q') || '';
let jenis = params.get('jenis') || '';
let kota = params.get('kota') || '';
kotakCari.value = kata;
let data = [];
let toko = null;

const bersih = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const labelJenis = (j) => t(j === 'affiliator' ? 'mitra.affiliator' : 'mitra.reseller');

function simpanUrl() {
  const p = new URLSearchParams();
  if (kata) p.set('q', kata);
  if (jenis) p.set('jenis', jenis);
  if (kota) p.set('kota', kota);
  history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
}

function kartu(m) {
  return el('article', { class: 'mitra-kartu kaca' },
    el('div', { class: 'atas' },
      el('img', { class: 'avatar', src: m.foto || AVATAR, alt: '', width: 56, height: 56, loading: 'lazy', onerror: (e) => { e.target.src = AVATAR; } }),
      el('div', { class: 'nama' }, el('h3', {}, m.nama),
        el('div', { class: 'meta' }, el('span', { class: 'lencana' }, labelJenis(m.jenis)), m.kota ? el('span', { class: 'redup' }, m.kota) : null))),
    m.bio ? el('p', { class: 'redup bio' }, m.bio) : null,
    el('div', { class: 'baris-kode' },
      m.verified ? el('span', { class: 'lencana verified' }, '✓ ', t('mitra.verified')) : null,
      el('span', {}, t('mitra.kode'), ' ', el('b', { class: 'kode' }, m.kode))),
    m.sejak ? el('small', { class: 'redup' }, t('mitra.sejak', { bulan: bulanTahun(m.sejak) })) : null,
    m.wa || m.ig ? el('div', { class: 'kontak' },
      m.wa ? el('a', { class: 'tombol wa kecil', href: tautanWa(m.wa), target: '_blank', rel: 'noopener' }, 'WhatsApp') : null,
      m.ig && /^[a-z0-9._]{1,30}$/.test(m.ig) ? el('a', { class: 'tombol garis kecil', href: `https://instagram.com/${m.ig}`, target: '_blank', rel: 'noopener' }, '@' + m.ig) : null) : null);
}

function ajakanGabung() {
  if (!toko?.whatsapp_number) return null;
  return el('section', { class: 'seksi' }, el('div', { class: 'ajakan kaca' },
    el('div', {}, el('h3', {}, t('mitra.gabungJ')), el('p', {}, t('mitra.gabungT'))),
    el('a', { class: 'tombol wa', href: tautanWa(toko.whatsapp_number, t('mitra.gabungWa')), target: '_blank', rel: 'noopener' }, t('mitra.gabungTombol'))));
}

function tampilkan() {
  // filter jenis & kota
  const kotaAda = [...new Set(data.map((m) => m.kota).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (kota && !kotaAda.includes(kota)) kota = '';
  filterJenis.replaceChildren(...[['', t('mitra.semua')], ['reseller', t('mitra.reseller')], ['affiliator', t('mitra.affiliator')]].map(([k, l]) =>
    el('button', { class: 'chip', type: 'button', 'aria-pressed': String(k === jenis), onclick: () => { jenis = k; simpanUrl(); tampilkan(); } },
      l, el('small', {}, k ? data.filter((m) => m.jenis === k).length : data.length))));
  filterKota.replaceChildren(el('option', { value: '' }, t('mitra.semuaKota')), ...kotaAda.map((k) => el('option', { value: k, selected: k === kota }, k)));
  filterKota.hidden = kotaAda.length < 2;

  // cek nama / kode
  const q = bersih(kata);
  const cocokCari = (m) => !q || bersih(m.nama).includes(q) || bersih(m.kode) === q.replace(/ /g, '') || bersih(m.kota).includes(q);
  if (q.length >= 2) {
    const ketemu = data.filter((m) => bersih(m.nama).includes(q) || bersih(m.kode) === q.replace(/ /g, ''));
    cekHasil.replaceChildren(ketemu.length
      ? el('div', { class: 'cek ok' }, '✓ ', t('mitra.terdaftar', { nama: ketemu.slice(0, 3).map((m) => `${m.nama} (${m.kode})`).join(', ') }))
      : el('div', { class: 'cek tidak' }, '⚠ ', t('mitra.tidakTerdaftar', { q: kata })));
  } else cekHasil.replaceChildren();

  if (!data.length) {
    info.textContent = '';
    isi.replaceChildren(...[el('div', { class: 'kosong kaca' }, el('p', {}, t('mitra.kosong'))), ajakanGabung()].filter(Boolean));
    return;
  }
  const hasil = data.filter((m) => (!jenis || m.jenis === jenis) && (!kota || m.kota === kota) && cocokCari(m));
  info.textContent = t('mitra.jumlah', { n: hasil.length, s: hasil.length === 1 ? '' : 's' });
  isi.replaceChildren(...[hasil.length ? el('div', { class: 'mitra-daftar' }, hasil.map(kartu))
    : el('div', { class: 'kosong kaca' }, el('p', {}, t('mitra.tidakAda'))), ajakanGabung()].filter(Boolean));
}

let jeda;
kotakCari.addEventListener('input', () => { clearTimeout(jeda); jeda = setTimeout(() => { kata = kotakCari.value.trim(); simpanUrl(); tampilkan(); }, 200); });
filterKota.addEventListener('change', () => { kota = filterKota.value; simpanUrl(); tampilkan(); });

async function muat() {
  isi.replaceChildren(el('div', { class: 'mitra-daftar' }, kerangkaMemuat(3)));
  try {
    const [mitra, tk] = await Promise.all([ambilMitra(), ambilToko()]);
    data = mitra ?? [];
    toko = tk;
    tampilkan();
  } catch (err) {
    console.error(err);
    isi.replaceChildren(pesanGagal(t('gagal.katalog'), muat));
  }
}
muat();
