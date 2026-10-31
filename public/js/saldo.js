// Halaman saldo komisi pribadi untuk affiliate (/mitra/saldo/?k=TOKEN).
// Hanya menampilkan data milik affiliate itu: komisi, penarikan. Tanpa HPP, tanpa nama pembeli.
import { ambilSaldoAffiliate, ambilToko } from './api.js';
import { inggris, labelVarian, t, tanggal } from './i18n.js';
import { el, pasangKerangka, tautanWa } from './ui.js';

pasangKerangka('');

const isi = document.getElementById('isi');
const token = new URLSearchParams(location.search).get('k') || '';
const rp = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString(inggris() ? 'en-US' : 'id-ID');
const tgl = (d) => (d ? tanggal(d + 'T00:00:00') : '–');
const hariIni = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

async function tidakValid() {
  const toko = await ambilToko();
  isi.replaceChildren(el('div', { class: 'kosong kaca' },
    el('p', {}, t('saldo.tidakValid')),
    toko?.whatsapp_number ? el('a', { class: 'tombol wa', href: tautanWa(toko.whatsapp_number), target: '_blank', rel: 'noopener' }, t('saldo.chat')) : null));
}

function tampilkan(d, toko) {
  const bisa = d.saldo >= d.min_tarik && d.saldo > 0;
  const sisa = Math.round((Date.parse(d.bayar_berikut) - Date.parse(hariIni())) / 864e5);
  const persen = d.min_tarik > 0 ? Math.max(0, Math.min(100, (d.saldo / d.min_tarik) * 100)) : 100;
  const wa = toko?.whatsapp_number
    ? el('a', { class: 'tombol' + (bisa ? '' : ' garis'), target: '_blank', rel: 'noopener',
      href: tautanWa(toko.whatsapp_number, bisa ? t('saldo.waTarik', { nama: d.nama, kode: d.kode, rp: rp(d.saldo) }) : t('saldo.waTanya', { nama: d.nama, kode: d.kode })) },
    bisa ? t('saldo.tarik') : t('saldo.tanya')) : null;
  const kotak = (label, nilai) => el('div', { class: 'saldo-angka kaca' }, el('span', {}, label), el('b', {}, nilai));

  document.title = `${t('saldo.judul')} · ${d.nama} — IXVII.CO`;
  isi.replaceChildren(
    el('div', { class: 'saldo-kepala' },
      el('p', { class: 'saldo-halo' }, t('saldo.halo', { nama: d.nama })),
      el('div', { class: 'row-lencana' }, d.kode ? el('span', { class: 'lencana' }, t('saldo.kode', { kode: d.kode })) : null,
        el('span', { class: 'lencana' }, t('saldo.persen', { pct: Number(d.komisi_pct).toLocaleString(inggris() ? 'en-US' : 'id-ID') })))),
    el('section', { class: 'saldo-utama kaca' },
      el('span', { class: 'redup' }, bisa ? t('saldo.bisa') : t('saldo.saldo')),
      el('b', { class: 'saldo-besar' }, rp(d.saldo)),
      el('div', { class: 'saldo-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(d.min_tarik), 'aria-valuenow': String(Math.max(0, d.saldo)) },
        el('span', { style: `width:${persen}%` })),
      el('p', { class: 'redup' }, bisa ? t('saldo.cukup', { min: rp(d.min_tarik) }) : t('saldo.kurang', { rp: rp(d.min_tarik - Math.max(0, d.saldo)), min: rp(d.min_tarik) })),
      el('p', {}, t('saldo.bayar', { tgl: tgl(d.bayar_berikut) }), ' · ', sisa <= 0 ? t('saldo.hariIni') : t('saldo.lagi', { n: sisa })),
      wa),
    el('div', { class: 'saldo-grid' },
      kotak(t('saldo.total'), rp(d.komisi)), kotak(t('saldo.bulanIni'), rp(d.bulan_ini)), kotak(t('saldo.dibayar'), rp(d.dibayar)),
      kotak(t('saldo.diproses'), rp(d.diproses)), kotak(t('saldo.penjualan'), d.n)),
    el('section', { class: 'grup kaca' },
      el('h2', {}, t('saldo.riwayat')),
      d.penjualan.length ? el('ul', { class: 'saldo-daftar' }, d.penjualan.map((s) => el('li', {},
        el('div', {}, el('b', {}, s.app), el('div', { class: 'redup' }, [s.tipe, s.varian && labelVarian(s.varian)].filter(Boolean).join(' · '), ' · ', tgl(s.tgl))),
        el('b', { class: 'plus' }, '+' + rp(s.komisi)))))
        : el('p', { class: 'redup' }, t('saldo.kosong'))),
    d.penarikan.length ? el('section', { class: 'grup kaca' },
      el('h2', {}, t('saldo.riwayatTarik')),
      el('ul', { class: 'saldo-daftar' }, d.penarikan.map((w) => el('li', {},
        el('div', {}, el('b', {}, rp(w.jumlah)), el('div', { class: 'redup' }, tgl(w.diajukan))),
        el('span', { class: 'lencana ' + (w.status === 'dibayar' ? 'ada' : 'sedikit') },
          w.status === 'dibayar' ? t('saldo.st.dibayar', { tgl: tgl(w.dibayar) }) : t('saldo.st.dijadwalkan', { tgl: tgl(w.jadwal) })))))) : null,
    el('p', { class: 'redup saldo-catatan' }, t('saldo.cara', { tgl: d.tanggal_bayar })),
    el('p', { class: 'redup saldo-catatan' }, t('saldo.pribadi')));
}

async function muat() {
  if (!/^[0-9a-f]{32}$/.test(token)) return tidakValid();
  isi.replaceChildren(el('div', { class: 'memuat', style: 'height:320px' }));
  try {
    const [d, toko] = await Promise.all([ambilSaldoAffiliate(token), ambilToko()]);
    if (!d) return tidakValid();
    tampilkan(d, toko);
  } catch { tidakValid(); }
}
muat();
