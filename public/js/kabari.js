// "Kabari saya kalau tersedia": jendela kecil untuk paket yang sedang habis.
// Pembeli meninggalkan nomor WhatsApp; begitu admin mengubah stok jadi Tersedia, pesan otomatis terkirim.
import { kabariTersedia } from './api.js';
import { labelTipe, labelVarian, t, teksGalat } from './i18n.js';
import { el } from './ui.js';

const SIMPAN_KONTAK = 'ixvii-kontak';

/**
 * @param {object} o
 * @param {string} o.app        nama aplikasi
 * @param {Array<{id:string,d:string,tipe:string}>} o.varian  paket habis yang bisa dipilih (satu = langsung dipakai)
 * @param {string} [o.pilih]    kode paket yang dipilih awal
 */
export function bukaKabari({ app, varian, pilih }) {
  const kontak = (() => { try { return JSON.parse(localStorage.getItem(SIMPAN_KONTAK) || '{}'); } catch { return {}; } })();
  const judulId = 'kabari-judul';
  const pilihan = varian.length > 1
    ? el('select', { name: 'paket', 'aria-label': t('kabari.paket') }, varian.map((v) => el('option', { value: v.id, selected: v.id === pilih }, `${labelTipe(v.tipe)} · ${labelVarian(v.d)}`)))
    : null;
  const nama = el('input', { type: 'text', name: 'name', autocomplete: 'name', maxlength: 60, value: kontak.nama || '' });
  const wa = el('input', { type: 'tel', name: 'tel', autocomplete: 'tel', inputmode: 'tel', required: true, maxlength: 20, placeholder: t('pesan.waContoh'), value: kontak.wa || '' });
  const galat = el('div', { class: 'galat', role: 'alert', hidden: true });
  const kirim = el('button', { class: 'tombol', type: 'submit' }, t('kabari.kirim'));
  const tutup = el('button', { class: 'tutup-dialog', type: 'button', 'aria-label': t('bagi.tutup') }, '×');
  const isi = el('div', { class: 'isi-kabari' });

  const form = el('form', { class: 'form-pesan', novalidate: true },
    pilihan ? el('label', {}, t('kabari.paket'), pilihan) : el('p', { class: 'paket-kabari' }, el('b', {}, `${labelTipe(varian[0].tipe)} · ${labelVarian(varian[0].d)}`)),
    el('label', {}, t('kabari.nama'), nama),
    el('label', {}, t('pesan.wa'), wa),
    galat, kirim,
    el('p', { class: 'catatan', style: 'margin:0' }, t('kabari.catatan')));
  isi.append(form);

  const dialog = el('dialog', { class: 'dialog-bagikan dialog-kabari', 'aria-labelledby': judulId },
    el('div', { class: 'kepala-dialog' },
      el('div', {}, el('span', { class: 'gabung-label merah' }, t('kabari.label')), el('h2', { id: judulId }, t('kabari.judul', { app }))),
      tutup),
    el('p', { class: 'redup', style: 'margin:0 0 12px' }, t('kabari.sub')),
    isi);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (wa.value.replace(/\D/g, '').length < 9) { galat.textContent = t('pesan.wajib'); galat.hidden = false; wa.focus(); return; }
    kirim.disabled = true; kirim.textContent = t('pesan.proses'); galat.hidden = true;
    try {
      const kode = pilihan ? pilihan.value : varian[0].id;
      const h = await kabariTersedia({ kode, wa: wa.value.trim(), nama: nama.value.trim() });
      try { localStorage.setItem(SIMPAN_KONTAK, JSON.stringify({ ...kontak, nama: nama.value.trim() || kontak.nama || '', wa: wa.value.trim() })); } catch { /* abaikan */ }
      const v = varian.find((x) => x.id === kode) ?? varian[0];
      isi.replaceChildren(el('div', { class: 'sukses-kabari', role: 'status' },
        el('span', { class: 'ikon-sukses', 'aria-hidden': 'true' }, h.tersedia ? '✓' : '🔔'),
        el('h3', {}, h.tersedia ? t('kabari.sudahAda') : h.sudah ? t('kabari.sudahDaftar') : t('kabari.berhasil')),
        el('p', { class: 'redup' }, h.tersedia ? t('kabari.sudahAdaTeks') : t('kabari.berhasilTeks', { paket: `${app} ${labelTipe(v.tipe)} · ${labelVarian(v.d)}` })),
        h.tersedia ? el('button', { class: 'tombol', type: 'button', onclick: () => location.reload() }, t('kabari.muatUlang'))
          : el('button', { class: 'tombol garis', type: 'button', onclick: () => dialog.close() }, t('kabari.oke'))));
    } catch (err) {
      galat.textContent = err instanceof TypeError ? t('pesan.gagal') : teksGalat(err.message); galat.hidden = false;
      kirim.disabled = false; kirim.textContent = t('kabari.kirim');
    }
  });
  tutup.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => setTimeout(() => dialog.remove(), 0));
  document.body.append(dialog);
  dialog.showModal();
  (wa.value ? (pilihan ?? kirim) : wa).focus();
}
