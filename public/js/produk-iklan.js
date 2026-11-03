// Halaman pengajuan iklan produk digital dari penjual lain (mitra).
// Iklan tidak langsung tayang: admin memeriksa dulu, lalu penjual membayar paket tayang.
// Gambar sampul hanya lewat tautan (tidak ada unggahan file dari pengunjung anonim).
import { ajukanIklan, ambilInfoIklan, ambilToko } from './api.js';
import { inggris, rupiah, t, teksGalat } from './i18n.js';
import { el, kerangkaMemuat, pasangKerangka, tautanWa } from './ui.js';

pasangKerangka('/produk/');
const isi = document.getElementById('isi');
const KATEGORI = ['ebook', 'template', 'preset', 'kelas', 'lainnya'];

const isian = (label, input, cat) => el('label', { class: 'isian-g' }, label, input, cat ? el('small', { class: 'redup' }, cat) : null);

(async () => {
  isi.replaceChildren(kerangkaMemuat(2));
  const [{ paket, setelan }, toko] = await Promise.all([ambilInfoIklan(), ambilToko()]);
  const wa = toko?.whatsapp_number;
  const alur = el('section', { class: 'seksi' }, el('h2', {}, t('iklan.alurJ')),
    el('ol', { class: 'pd-alur' }, ['a1', 'a2', 'a3', 'a4', 'a5'].map((k, i) => el('li', {}, el('span', {}, String(i + 1)), t('iklan.' + k)))));
  const daftarPaket = el('section', { class: 'seksi' }, el('h2', {}, t('iklan.paketJ')),
    el('div', { class: 'pd-paket' }, paket.map((p) => el('div', { class: 'kaca pd-paket-kartu' },
      el('b', {}, p.nama), el('span', { class: 'redup' }, t('iklan.hari', { n: p.hari })), el('strong', {}, rupiah(p.harga))))));
  const syarat = setelan?.syarat ? el('section', { class: 'seksi' }, el('h2', {}, t('iklan.syaratJ')),
    el('ul', { class: 'pd-centang syarat' }, setelan.syarat.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => el('li', {}, x))),
    inggris() ? el('p', { class: 'catatan' }, t('produk.indo')) : null) : null;

  if (!setelan?.aktif || !paket.length) {
    isi.replaceChildren(alur, el('div', { class: 'kosong kaca' }, el('p', {}, t('iklan.tutup')),
      wa ? el('a', { class: 'tombol wa', href: tautanWa(wa, 'Halo IXVII.CO, aku ingin pasang iklan produk digital.'), target: '_blank', rel: 'noopener' }, t('iklan.chatAdmin')) : null));
    return;
  }

  const f = {
    penjual_nama: el('input', { type: 'text', required: true, minlength: 2, maxlength: 60, autocomplete: 'organization' }),
    penjual_wa: el('input', { type: 'tel', required: true, maxlength: 20, inputmode: 'tel', autocomplete: 'tel', placeholder: t('pesan.waContoh') }),
    penjual_email: el('input', { type: 'email', maxlength: 120, autocomplete: 'email' }),
    nama: el('input', { type: 'text', required: true, minlength: 3, maxlength: 120 }),
    kategori: el('select', { required: true }, KATEGORI.map((k) => el('option', { value: k }, t('produk.k.' + k)))),
    harga: el('input', { type: 'number', required: true, min: 0, max: 100000000, step: 1000, inputmode: 'numeric' }),
    tautan_beli: el('input', { type: 'url', required: true, maxlength: 300, placeholder: 'https://' }),
    deskripsi: el('textarea', { required: true, minlength: 20, maxlength: 1500, rows: 5 }),
    sampul: el('input', { type: 'url', maxlength: 300, placeholder: 'https://' }),
  };
  const pilihan = el('div', { class: 'pd-paket pilih', role: 'radiogroup', 'aria-label': t('iklan.pilihPaket') },
    paket.map((p, i) => el('label', { class: 'kaca pd-paket-kartu' },
      el('input', { type: 'radio', name: 'paket', value: p.id, required: true, checked: i === 0 }),
      el('b', {}, p.nama), el('span', { class: 'redup' }, t('iklan.hari', { n: p.hari })), el('strong', {}, rupiah(p.harga)))));
  const setuju = el('input', { type: 'checkbox', required: true });
  const galat = el('div', { class: 'galat', role: 'alert', hidden: true });
  const kirim = el('button', { type: 'submit', class: 'tombol' }, t('iklan.kirim'));
  const form = el('form', { class: 'kaca pd-form-iklan' },
    el('h2', {}, t('iklan.formJ')),
    el('div', { class: 'pd-dua' }, isian(t('iklan.namaPenjual'), f.penjual_nama), isian(t('pesan.wa'), f.penjual_wa)),
    isian(t('iklan.emailPenjual'), f.penjual_email),
    el('div', { class: 'pd-dua' }, isian(t('iklan.namaProduk'), f.nama), isian(t('iklan.kategori'), f.kategori)),
    el('div', { class: 'pd-dua' }, isian(t('iklan.harga'), f.harga), isian(t('iklan.tautan'), f.tautan_beli)),
    isian(t('iklan.deskripsi'), f.deskripsi),
    isian(t('iklan.sampul'), f.sampul),
    el('fieldset', { class: 'pd-fieldset' }, el('legend', {}, t('iklan.pilihPaket')), pilihan),
    el('label', { class: 'pd-setuju' }, setuju, el('span', {}, t('iklan.setuju'))),
    galat, kirim);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    galat.hidden = true; kirim.disabled = true;
    const data = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.value.trim()]));
    data.harga = Number(data.harga || 0);
    data.paket = form.querySelector('input[name=paket]:checked')?.value || '';
    data.setuju = setuju.checked;
    try {
      const h = await ajukanIklan(data);
      const nomor = h.wa_admin || wa;
      form.replaceChildren(...[el('h2', {}, t('iklan.berhasil')), el('p', {}, t('iklan.berhasilT', { biaya: rupiah(h.biaya) })),
        nomor ? el('a', { class: 'tombol wa', href: tautanWa(nomor, `Halo IXVII.CO, aku baru mengajukan iklan "${data.nama}" (${h.paket}).`), target: '_blank', rel: 'noopener' }, t('iklan.chatAdmin')) : null].filter(Boolean));
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      galat.textContent = teksGalat(err.message); galat.hidden = false; kirim.disabled = false;
    }
  });
  isi.replaceChildren(...[alur, daftarPaket, syarat, el('section', { class: 'seksi' }, form)].filter(Boolean));
})();
