// Form aktivasi garansi dari link sekali pakai (/garansi/?t=TOKEN): data pembeli + screenshot login,
// sekaligus rating & ulasan opsional. Screenshot dikecilkan dulu di HP supaya cepat terunggah.
import { ambilToko, infoGaransi, kirimGaransi, unggahScreenshot } from './api.js';
import { inggris, labelTipe, labelVarian, rentangTanggal, t, tanggal, teksGalat } from './i18n.js';
import { el, pasangKerangka, pilihBintang, tautanWa } from './ui.js';

pasangKerangka('');

const isi = document.getElementById('isi');
const token = new URLSearchParams(location.search).get('t') || '';
const MAKS_ULASAN = 600;

const waktu = (iso) => new Date(iso).toLocaleString(inggris() ? 'en-US' : 'id-ID',
  { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + (inggris() ? ' (WIB)' : ' WIB');

async function tidakValid() {
  const toko = await ambilToko();
  isi.replaceChildren(el('div', { class: 'kosong kaca' },
    el('p', {}, t('garansi.tidakValid')),
    toko?.whatsapp_number ? el('a', { class: 'tombol wa', href: tautanWa(toko.whatsapp_number), target: '_blank', rel: 'noopener' }, t('garansi.chat')) : null));
}

/** Kecilkan gambar ke sisi terpanjang 1600 px, JPEG ~82%. */
async function kecilkan(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, gagal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = gagal; i.src = url; });
    const skala = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * skala); c.height = Math.round(img.naturalHeight * skala);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
  } finally { URL.revokeObjectURL(url); }
}

function formulir(d) {
  const lewat = d.batas && Date.parse(d.batas) < Date.now();
  const apps = [...new Map(d.items.map((i) => [i.name, i])).values()];

  const nama = el('input', { type: 'text', name: 'name', autocomplete: 'name', maxlength: 80, required: true });
  const hp = el('input', { type: 'tel', name: 'tel', autocomplete: 'tel', inputmode: 'tel', maxlength: 20, placeholder: t('garansi.hpContoh'), required: true });
  const device = el('input', { type: 'text', maxlength: 120, placeholder: t('garansi.deviceContoh'), required: true });
  let ss = null;
  const pratinjau = el('img', { class: 'ss-pratinjau', alt: '', hidden: true });
  const pilihSs = el('input', { type: 'file', accept: 'image/*', class: 'tersembunyi', id: 'ss' });
  const labelSs = el('label', { class: 'tombol garis', for: 'ss' }, t('garansi.ssPilih'));
  pilihSs.addEventListener('change', async () => {
    const f = pilihSs.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { tunjukGalat(t('garansi.bukanGambar')); return; }
    try {
      ss = await kecilkan(f);
      pratinjau.src = URL.createObjectURL(ss); pratinjau.hidden = false;
      labelSs.textContent = t('garansi.ssGanti');
      galat.hidden = true;
    } catch { tunjukGalat(t('garansi.bukanGambar')); }
  });

  const per = apps.map((a, i) => {
    const bintang = pilihBintang(`g-nilai-${i}`, t('ulasan.nilai', { app: a.name }));
    const teks = el('textarea', { maxlength: MAKS_ULASAN, rows: 2, placeholder: t('ulasan.isi'), 'aria-label': `${t('ulasan.isi')} — ${a.name}` });
    return { a, bintang, teks, kotak: el('fieldset', { class: 'ulasan-app kaca' }, el('legend', {}, t('ulasan.nilai', { app: a.name })), bintang, teks) };
  });
  const anonim = el('input', { type: 'checkbox', id: 'anonim' });

  const galat = el('div', { class: 'galat', role: 'alert', hidden: true });
  const tunjukGalat = (teks) => { galat.textContent = teks; galat.hidden = false; };
  const kirim = el('button', { class: 'tombol', type: 'submit' }, t('garansi.kirim'));

  const form = el('form', { class: 'form-ulasan', novalidate: true },
    el('p', {}, t('garansi.halo', { nama: d.nama })),
    el('div', { class: 'garansi-info kaca' },
      el('b', {}, t('garansi.pesanan')),
      el('ul', {}, d.items.map((i) => el('li', {}, `${i.name} · ${labelTipe(i.tipe)} · ${labelVarian(i.varian)}`))),
      el('small', { class: 'redup' }, t('garansi.dibeli', { tgl: tanggal(d.dibeli + 'T00:00:00') }),
        d.berakhir ? ` · ${t('garansi.masa', { tgl: rentangTanggal(d.berakhir_awal && d.berakhir_awal + 'T00:00:00', d.berakhir + 'T00:00:00') })}` : ''),
      d.batas ? el('div', { class: 'batas ' + (lewat ? 'lewat' : '') }, lewat ? t('garansi.lewat') : t('garansi.batas', { waktu: waktu(d.batas) })) : null),
    el('label', { class: 'isian-g' }, t('garansi.nama'), nama),
    el('label', { class: 'isian-g' }, t('garansi.hp'), hp),
    el('label', { class: 'isian-g' }, t('garansi.device'), device),
    el('div', { class: 'isian-g' }, el('span', {}, t('garansi.ss')), pilihSs, labelSs, pratinjau),
    el('h2', { class: 'judul-kecil-g' }, t('garansi.ulasanJudul')),
    el('p', { class: 'redup', style: 'margin:-8px 0 0;font-size:13.5px' }, t('garansi.ulasanSub')),
    per.map((x) => x.kotak),
    el('label', { class: 'row-cek' }, anonim, t('ulasan.anonim')),
    galat, kirim);
  form.addEventListener('change', (e) => { if (e.target !== pilihSs) galat.hidden = true; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (nama.value.trim().length < 2 || hp.value.replace(/\D/g, '').length < 8 || device.value.trim().length < 2 || !ss) {
      tunjukGalat(t('garansi.wajib')); return;
    }
    const ulasan = per.filter((x) => x.bintang.nilai() > 0).map((x) => ({ app: x.a.name, rating: x.bintang.nilai(), isi: x.teks.value.trim() }));
    kirim.disabled = true; galat.hidden = true;
    try {
      kirim.textContent = t('garansi.mengunggah');
      const path = await unggahScreenshot(token, ss);
      kirim.textContent = t('garansi.mengirim');
      const h = await kirimGaransi({ token, nama: nama.value.trim(), hp: hp.value.trim(), device: device.value.trim(), screenshot: path, ulasan, anonim: anonim.checked });
      isi.replaceChildren(el('div', { class: 'kosong kaca garansi-sukses' },
        el('p', {}, h.tepat_waktu === false ? t('garansi.ditinjau') : t('garansi.aktif')),
        h.ulasan ? el('p', { class: 'redup' }, t('garansi.terimaUlasan')) : null,
        el('a', { class: 'tombol garis', href: '/' }, 'IXVII.CO')));
    } catch (err) {
      tunjukGalat(err instanceof TypeError ? t('pesan.gagal') : teksGalat(err.message));
      kirim.disabled = false; kirim.textContent = t('garansi.kirim');
    }
  });
  isi.replaceChildren(form);
}

async function muat() {
  if (!/^[0-9a-f]{32}$/.test(token)) return tidakValid();
  isi.replaceChildren(el('div', { class: 'memuat', style: 'height:260px' }));
  try { formulir(await infoGaransi(token)); }
  catch { tidakValid(); }
}
muat();
