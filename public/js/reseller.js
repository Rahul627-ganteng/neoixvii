// Halaman Reseller: benefit, harga promo + hitung mundur (diatur di panel admin), booking slot, bayar QRIS.
import { ambilProgramReseller, ambilToko, daftarReseller } from './api.js';
import { bandingGabung, daftarBenefit, hitungMundur, promoBerjalan } from './gabung.js';
import { inggris, rupiah, t, tanggal, teksGalat } from './i18n.js';
import { el, pasangKerangka, tautanWa } from './ui.js';

pasangKerangka('/reseller/');
const isi = document.getElementById('isi');

function blokQris(toko, nominal, teksWa) {
  const qris = toko?.qris_aktif === false ? null : (toko?.qris_url || '/assets/bayar/qris-ixvii.jpg');
  const wa = toko?.whatsapp_number;
  return el('div', { class: 'bayar-qris' },
    nominal ? el('div', { class: 'nominal-qris' }, el('span', {}, t('pesan.bayarTepat')), el('b', {}, rupiah(nominal))) : null,
    qris ? el('img', { class: 'gambar-qris', src: qris, alt: t('pesan.altQris'), width: 1135, height: 1600, loading: 'lazy' }) : null,
    qris ? el('a', { class: 'tombol garis', href: qris, download: 'QRIS-IXVII.CO.jpg' }, t('pesan.unduhQris')) : null,
    wa ? el('a', { class: 'tombol wa', href: tautanWa(wa, teksWa), target: '_blank', rel: 'noopener' }, t('reseller.kirimBukti')) : null);
}

function formBooking(pr, toko) {
  const nama = el('input', { type: 'text', name: 'name', autocomplete: 'name', required: true, minlength: 2, maxlength: 60 });
  const wa = el('input', { type: 'tel', name: 'tel', autocomplete: 'tel', inputmode: 'tel', required: true, maxlength: 20, placeholder: t('pesan.waContoh') });
  const kota = el('input', { type: 'text', name: 'city', autocomplete: 'address-level2', maxlength: 60 });
  const catatan = el('textarea', { name: 'note', rows: 2, maxlength: 300, placeholder: t('reseller.catatanContoh') });
  const galat = el('div', { class: 'galat', role: 'alert', hidden: true });
  const kirim = el('button', { class: 'tombol', type: 'submit' }, t('reseller.booking'));
  const wadah = el('div');
  const form = el('form', { class: 'form-pesan', novalidate: true },
    el('label', {}, t('pesan.nama'), nama), el('label', {}, t('pesan.wa'), wa),
    el('label', {}, t('reseller.kota'), kota), el('label', {}, t('reseller.catatan'), catatan),
    galat, kirim);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (nama.value.trim().length < 2 || wa.value.replace(/\D/g, '').length < 9) { galat.textContent = t('pesan.wajib'); galat.hidden = false; return; }
    kirim.disabled = true; kirim.textContent = t('pesan.proses'); galat.hidden = true;
    try {
      const h = await daftarReseller({ nama: nama.value.trim(), wa: wa.value.trim(), kota: kota.value.trim(), catatan: catatan.value.trim() });
      const teksWa = t('wa.reseller', { nama: nama.value.trim(), harga: h.harga ? rupiah(h.harga) : '-' });
      wadah.replaceChildren(el('div', { class: 'sukses' },
        el('h2', {}, h.sudah ? t('reseller.sudah') : t('reseller.berhasil')),
        el('p', { style: 'margin:0' }, h.harga ? t('reseller.lanjutBayar', { harga: rupiah(h.harga) }) : t('reseller.tunggu')),
        h.terkirim ? el('p', { class: 'catatan', style: 'margin:0' }, t('reseller.terkirim')) : null,
        h.harga ? blokQris(toko, h.harga, teksWa + '\n\n' + t('wa.sudahBayar', { nominal: rupiah(h.harga) }))
          : toko?.whatsapp_number ? el('a', { class: 'tombol wa', href: tautanWa(toko.whatsapp_number, teksWa), target: '_blank', rel: 'noopener' }, t('reseller.chatAdmin')) : null));
      wadah.querySelector('.sukses').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      galat.textContent = err instanceof TypeError ? t('pesan.gagal') : teksGalat(err.message); galat.hidden = false;
      kirim.disabled = false; kirim.textContent = t('reseller.booking');
    }
  });
  wadah.append(form);
  return wadah;
}

async function muat() {
  const [pr, toko] = await Promise.all([ambilProgramReseller(), ambilToko()]);
  if (!pr || !pr.aktif) {
    isi.replaceChildren(el('section', { class: 'seksi' }, el('div', { class: 'kosong kaca' },
      el('h1', { class: 'judul-halaman' }, t('reseller.tutupJudul')), el('p', {}, t('reseller.tutup')),
      toko?.whatsapp_number ? el('a', { class: 'tombol wa', href: tautanWa(toko.whatsapp_number, t('wa.resellerTanya')), target: '_blank', rel: 'noopener' }, t('reseller.chatAdmin')) : null)));
    return;
  }
  const promo = promoBerjalan(pr);
  const sudahLewat = pr.sampai && Date.parse(pr.sampai) < Date.now();
  const hargaBlok = el('div', { class: 'harga-reseller' },
    el('div', { class: 'worth' }, t('reseller.worth'), ' ', el('s', {}, rupiah(pr.harga_normal))),
    promo ? el('div', { class: 'harga-besar' }, rupiah(pr.harga_promo)) : el('div', { class: 'harga-besar kecil' }, t('reseller.batchBerikut')),
    promo && pr.periode_teks ? el('div', { class: 'periode' }, pr.periode_teks) : null,
    promo && pr.sampai ? el('div', { class: 'hm-wadah' }, el('small', {}, t('reseller.berakhirDalam', { tgl: tanggal(pr.sampai) })),
      hitungMundur(pr.sampai, { selesai: () => setTimeout(muat, 1500) })) : null,
    sudahLewat ? el('p', { class: 'periode' }, t('reseller.lewat')) : null,
    promo && pr.slot_teks ? el('div', { class: 'slot' }, pr.slot_teks) : null);
  const cocok = String(pr.cocok ?? '').split('\n').map((x) => x.trim()).filter(Boolean);

  isi.replaceChildren(
    el('section', { class: 'hero-reseller' },
      el('div', { class: 'hero-reseller-isi' },
        el('span', { class: 'gabung-label' }, promo ? pr.label_promo : t('gabung.resellerLabel')),
        el('h1', {}, pr.judul),
        el('p', { class: 'sub' }, pr.subjudul),
        el('a', { class: 'tombol putih', href: '#booking' }, t('reseller.bookingSekarang'))),
      el('div', { class: 'hero-reseller-samping' },
        el('img', { src: '/assets/brand/logo-putih.png', alt: 'IXVII.CO', width: 274, height: 282 }),
        cocok.length ? el('div', { class: 'cocok' }, el('b', {}, t('reseller.cocok')), el('ul', {}, cocok.map((c) => el('li', {}, c)))) : null)),
    el('div', { class: 'tata-reseller' },
      el('section', { class: 'kaca kartu-benefit' },
        el('h2', {}, t('reseller.kenapa')),
        el('p', { class: 'redup' }, t('reseller.kenapaSub')),
        daftarBenefit(pr.benefit)),
      el('section', { class: 'kaca kartu-booking', id: 'booking' },
        hargaBlok,
        el('h2', {}, t('reseller.formJudul')),
        el('p', { class: 'redup' }, t('reseller.formSub')),
        formBooking(pr, toko))),
    el('section', { class: 'seksi' }, bandingGabung(pr)),
    el('section', { class: 'seksi' }, el('div', { class: 'ajakan kaca' },
      el('div', {}, el('h3', {}, t('reseller.ebookJ')), el('p', {}, t('reseller.ebookT'))),
      el('a', { class: 'tombol garis', href: '/reseller/ebook/' }, t('reseller.ebookTombol')))),
    inggris() ? el('p', { class: 'catatan' }, t('reseller.indo')) : '');
}
muat();
