// Halaman pendaftaran Affiliate: aturan main, alur kerja, formulir. Setelah daftar, pendaftar langsung
// menerima 2 pesan (aturan main & alur kerja) di layar, dan lewat WhatsApp kalau notifikasi sudah disambungkan.
import { ambilProgramReseller, ambilToko, daftarAffiliate } from './api.js';
import { bandingGabung } from './gabung.js';
import { inggris, t, teksGalat } from './i18n.js';
import { el, pasangKerangka, tautanWa } from './ui.js';

pasangKerangka('/affiliate/');
const isi = document.getElementById('isi');

/** Teks gaya WhatsApp (*tebal*, _miring_) → elemen, baris baru tetap. */
function teksWa(s) {
  const wadah = el('div', { class: 'teks-wa' });
  for (const [i, bagian] of String(s ?? '').split(/(\*[^*\n]+\*|_[^_\n]+_)/g).entries()) {
    if (!bagian) continue;
    if (i % 2 && bagian.startsWith('*')) wadah.append(el('b', {}, bagian.slice(1, -1)));
    else if (i % 2) wadah.append(el('i', {}, bagian.slice(1, -1)));
    else wadah.append(bagian);
  }
  return wadah;
}

const poin = (kunci) => el('ul', {}, t(kunci).split('\n').map((b) => el('li', {}, b)));
const kartuAturan = (no, judul, isiEl, kelas = '') => el('article', { class: 'aturan kaca ' + kelas },
  no ? el('span', { class: 'aturan-no', 'aria-hidden': 'true' }, no) : null, el('h3', {}, judul), isiEl);

function formDaftar(toko) {
  const nama = el('input', { type: 'text', name: 'name', autocomplete: 'name', required: true, minlength: 2, maxlength: 60 });
  const wa = el('input', { type: 'tel', name: 'tel', autocomplete: 'tel', inputmode: 'tel', required: true, maxlength: 20, placeholder: t('pesan.waContoh') });
  const kota = el('input', { type: 'text', name: 'city', autocomplete: 'address-level2', maxlength: 60 });
  const ig = el('input', { type: 'text', name: 'instagram', maxlength: 60, placeholder: '@username' });
  const tampil = el('input', { type: 'checkbox', id: 'aff-tampil' });
  const setuju = el('input', { type: 'checkbox', id: 'aff-setuju', required: true });
  const galat = el('div', { class: 'galat', role: 'alert', hidden: true });
  const kirim = el('button', { class: 'tombol', type: 'submit' }, t('aff.daftarTombol'));
  const wadah = el('div');
  const form = el('form', { class: 'form-pesan', novalidate: true },
    el('label', {}, t('pesan.nama'), nama), el('label', {}, t('pesan.wa'), wa),
    el('div', { class: 'grid2-form' }, el('label', {}, t('aff.kota'), kota), el('label', {}, t('aff.ig'), ig)),
    el('label', { class: 'centang', for: 'aff-tampil' }, tampil, el('span', {}, t('aff.tampil'))),
    el('label', { class: 'centang', for: 'aff-setuju' }, setuju, el('span', {}, t('aff.setuju'))),
    galat, kirim);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (nama.value.trim().length < 2 || wa.value.replace(/\D/g, '').length < 9) { galat.textContent = t('pesan.wajib'); galat.hidden = false; return; }
    if (!setuju.checked) { galat.textContent = t('aff.wajibSetuju'); galat.hidden = false; setuju.focus(); return; }
    kirim.disabled = true; kirim.textContent = t('pesan.proses'); galat.hidden = true;
    try {
      const h = await daftarAffiliate({ nama: nama.value.trim(), wa: wa.value.trim(), kota: kota.value.trim(), sosmed: ig.value.trim(), tampil: tampil.checked, setuju: true });
      wadah.replaceChildren(h.sudah ? hasilSudah(h, toko) : hasilBaru(h, toko));
      wadah.firstChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      galat.textContent = err instanceof TypeError ? t('pesan.gagal') : teksGalat(err.message); galat.hidden = false;
      kirim.disabled = false; kirim.textContent = t('aff.daftarTombol');
    }
  });
  wadah.append(form);
  return wadah;
}

function hasilSudah(h, toko) {
  return el('div', { class: 'sukses' },
    el('h2', {}, t('aff.sudahJudul')),
    el('p', { style: 'margin:0' }, t('aff.sudah.' + (h.status || 'menunggu'))),
    toko?.whatsapp_number ? el('a', { class: 'tombol wa', href: tautanWa(toko.whatsapp_number, t('wa.affTanya')), target: '_blank', rel: 'noopener' }, t('aff.chatAdmin')) : null);
}

function hasilBaru(h, toko) {
  const salin = (teks) => {
    const b = el('button', { class: 'tombol garis kecil', type: 'button' }, t('aff.salin'));
    b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(teks); b.textContent = t('pesan.disalin'); } catch { /* biarkan */ } });
    return b;
  };
  return el('div', { class: 'sukses' },
    el('h2', {}, t('aff.berhasil')),
    el('p', { style: 'margin:0' }, t('aff.kodeKamu'), ' ', el('b', { class: 'kode' }, h.kode), ' ', el('small', { class: 'redup' }, t('aff.kodeAktif'))),
    el('p', { class: 'catatan', style: 'margin:0' }, h.terkirim ? t('aff.terkirim') : t('aff.bacaDulu')),
    ...(h.pesan ?? []).map((p, i) => el('article', { class: 'pesan-otomatis' },
      el('div', { class: 'row-aksi' }, el('b', {}, t(i ? 'aff.pesan2' : 'aff.pesan1')), salin(p)),
      teksWa(p))),
    toko?.whatsapp_number ? el('a', { class: 'tombol wa', href: tautanWa(toko.whatsapp_number, t('wa.affBaru', { nama: h.nama, kode: h.kode })), target: '_blank', rel: 'noopener' }, t('aff.konfirmasi')) : null);
}

async function muat() {
  const [toko, pr] = await Promise.all([ambilToko(), ambilProgramReseller()]);
  isi.replaceChildren(
    el('section', { class: 'hero-reseller hero-affiliate' },
      el('div', { class: 'hero-reseller-isi' },
        el('span', { class: 'gabung-label' }, t('gabung.affiliateLabel')),
        el('h1', {}, t('aff.h1')),
        el('p', { class: 'sub' }, t('aff.sub')),
        el('a', { class: 'tombol putih', href: '#daftar' }, t('aff.daftarSekarang'))),
      el('div', { class: 'angka-affiliate' },
        el('div', {}, el('b', {}, '30%'), el('small', {}, t('aff.angka1'))),
        el('div', {}, el('b', {}, 'Rp10.000'), el('small', {}, t('aff.angka2'))),
        el('div', {}, el('b', {}, 'Rp7.000'), el('small', {}, t('aff.angka3'))))),
    el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', { class: 'judul-besar' }, '📋 ', t('aff.aturanJudul'))),
      el('p', { class: 'redup', style: 'max-width:760px' }, t('aff.aturanIntro')),
      el('div', { class: 'grid-aturan' },
        kartuAturan('1', t('aff.r1j'), el('p', {}, t('aff.r1'))),
        kartuAturan('2', t('aff.r2j'), el('p', {}, t('aff.r2'))),
        kartuAturan('3', t('aff.r3j'), el('div', {}, el('p', {}, t('aff.r3')), poin('aff.r3poin'))),
        kartuAturan('4', t('aff.r4j'), el('p', {}, t('aff.r4'))),
        kartuAturan('5', t('aff.r5j'), el('p', {}, t('aff.r5'))),
        kartuAturan(null, t('aff.tarikJ'), el('div', {}, el('p', {}, t('aff.tarik')), poin('aff.tarikPoin')), 'lebar'),
        kartuAturan(null, t('aff.laranganJ'), poin('aff.larangan'), 'larangan'),
        kartuAturan(null, t('aff.percobaanJ'), el('p', {}, t('aff.percobaan'))),
        kartuAturan(null, '📂 ' + t('aff.dapatJ'), el('div', {}, el('p', {}, t('aff.dapat')), poin('aff.dapatPoin'))))),
    el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', { class: 'judul-besar' }, t('aff.alurJudul'), ' ', el('span', { 'aria-hidden': 'true' }, '💸✨'))),
      el('ol', { class: 'alur-kerja' }, [1, 2, 3, 4, 5, 6].map((n) => el('li', { class: 'kaca' },
        el('span', { class: 'aturan-no', 'aria-hidden': 'true' }, String(n)),
        el('div', {}, el('b', {}, t(`aff.a${n}j`)), el('p', {}, t(`aff.a${n}`))))))),
    el('section', { class: 'seksi', id: 'daftar' },
      el('div', { class: 'kartu-booking kaca form-affiliate' },
        el('h2', {}, t('aff.formJudul')),
        el('p', { class: 'redup' }, t('aff.formSub')),
        formDaftar(toko))),
    pr ? el('section', { class: 'seksi' }, bandingGabung(pr)) : '',
    inggris() ? el('p', { class: 'catatan' }, t('aff.indo')) : '');
  if (location.hash === '#daftar') document.getElementById('daftar').scrollIntoView();
}
muat();
