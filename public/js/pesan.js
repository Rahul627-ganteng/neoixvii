// Panel ringkasan + formulir pesanan WhatsApp, dipakai halaman aplikasi, promo, dan rakit bundle.
import { buatPesanan } from './api.js';
import { catatanKurs, formatUsd, harga, inggris, labelTipe, labelVarian, pakaiUsd, rupiah, t, teksGalat } from './i18n.js';
import { el, tautanWa } from './ui.js';

const SIMPAN_KONTAK = 'ixvii-kontak';

/**
 * @param {object} o
 * @param {object|null} o.toko       baris store_settings (nomor WA, buka/tutup)
 * @param {string} o.tanya           teks pesan WA untuk tombol "Tanya lewat WhatsApp" saat pemesanan tutup
 * @param {string} [o.judul]         judul panel
 * @param {string} [o.kosong]        teks saat belum ada pilihan
 * @param {Node[]} [o.sisipan]       elemen tambahan di bawah total (mis. petunjuk diskon)
 * @returns {{ aside: HTMLElement, atur: (p: Pilihan|null) => void, sibuk: (b: boolean) => void }}
 *
 * Pilihan = { baris: string[], total: number, normal?: number, kirim: { kode?: string[], bundle?: number, rakit?: boolean } }
 */
export function panelPesan({ toko, tanya, judul: teksJudul = t('app.pilihanmu'), kosong = t('app.belumPilih'), sisipan = [] }) {
  let pilihan = null;
  let menunggu = false;
  const bisaPesan = !!(toko?.whatsapp_number && toko.orders_open);

  const judul = el('h2', {}, teksJudul);
  const daftar = el('div', { class: 'pilihan redup' }, kosong);
  const normal = el('div', { class: 'normal', hidden: true });
  const total = el('div', { class: 'total' }, '–');
  const totalIdr = el('div', { class: 'total-idr' });
  const tombol = el('button', { class: 'tombol', type: 'button', disabled: true, onclick: () => tampil('form') }, t('app.pesan'));

  const kontak = (() => { try { return JSON.parse(localStorage.getItem(SIMPAN_KONTAK) || '{}'); } catch { return {}; } })();
  const inputNama = el('input', { type: 'text', name: 'name', autocomplete: 'name', required: true, minlength: 2, maxlength: 60, value: kontak.nama || '' });
  const inputWa = el('input', { type: 'tel', name: 'tel', autocomplete: 'tel', inputmode: 'tel', required: true, maxlength: 20, placeholder: t('pesan.waContoh'), value: kontak.wa || '' });
  const galat = el('div', { class: 'galat', role: 'alert', hidden: true });
  const kirim = el('button', { class: 'tombol', type: 'submit' }, t('pesan.kirim'));
  const form = el('form', { class: 'form-pesan', hidden: true, novalidate: true, onsubmit: kirimPesanan },
    el('label', {}, t('pesan.nama'), inputNama),
    el('label', {}, t('pesan.wa'), inputWa),
    galat, kirim,
    el('button', { class: 'tombol garis', type: 'button', onclick: () => tampil('pilih') }, t('pesan.batal')));
  const sukses = el('div', { class: 'sukses', hidden: true, tabindex: '-1' });

  const catatan = el('p', { class: 'catatan' });
  if (bisaPesan) catatan.append(t('app.pesanCatatan'));
  else {
    catatan.append(t('app.tutup'));
    if (toko?.whatsapp_number) {
      catatan.append(' ', el('a', { href: tautanWa(toko.whatsapp_number, tanya), target: '_blank', rel: 'noopener' }, t('app.tanyaWa')));
    }
  }
  const kurs = catatanKurs();
  const catatanUsd = kurs ? el('p', { class: 'catatan' }, kurs) : null;

  const bagianPilih = [judul, daftar, normal, total, totalIdr, ...sisipan];
  function tampil(mode) {
    for (const e of bagianPilih) e.hidden = mode === 'sukses' || (e === normal && !(pilihan?.normal > pilihan?.total));
    tombol.hidden = mode !== 'pilih';
    form.hidden = mode !== 'form';
    sukses.hidden = mode !== 'sukses';
    catatan.hidden = mode === 'sukses';
    if (mode === 'form') { galat.hidden = true; (inputNama.value ? inputWa : inputNama).focus(); }
    if (mode === 'sukses') sukses.focus();
  }
  const segarkanTombol = () => { tombol.disabled = !bisaPesan || !pilihan || menunggu; kirim.disabled = menunggu || !pilihan; };

  function tunjukGalat(teks) { galat.textContent = teks; galat.hidden = false; }

  async function kirimPesanan(e) {
    e.preventDefault();
    const nama = inputNama.value.trim();
    const wa = inputWa.value.trim();
    if (!pilihan) return tunjukGalat(teksGalat('Pilih 1 sampai 10 paket'));
    if (nama.length < 2 || wa.replace(/\D/g, '').length < 8) return tunjukGalat(t('pesan.wajib'));
    kirim.disabled = true; kirim.textContent = t('pesan.proses'); galat.hidden = true;
    try {
      const hasil = await buatPesanan({ ...pilihan.kirim, nama, wa });
      try { localStorage.setItem(SIMPAN_KONTAK, JSON.stringify({ nama, wa })); } catch { /* abaikan */ }
      tulisSukses(hasil, nama);
      tampil('sukses');
    } catch (err) {
      tunjukGalat(err instanceof TypeError ? t('pesan.gagal') : teksGalat(err.message));
    } finally {
      kirim.disabled = false; kirim.textContent = t('pesan.kirim');
    }
  }

  function tulisSukses(hasil, nama) {
    const teksTotal = inggris() && hasil.total_usd != null
      ? `${formatUsd(Number(hasil.total_usd))} (${rupiah(hasil.total)})` : rupiah(hasil.total);
    const diskon = Number(hasil.diskon || 0);
    const pesanWa = [
      t('wa.halo'),
      hasil.jenis === 'bundle' ? `${t('wa.bundle')}: ${hasil.paket}` : hasil.jenis === 'rakit' ? t('wa.rakit') : null,
      ...(hasil.items || []).map((i) => `- ${i.aplikasi} · ${labelTipe(i.tipe)} · ${labelVarian(i.varian)}: ${rupiah(i.harga)}`),
      '',
      diskon ? `${t('wa.subtotal')}: ${rupiah(hasil.total_normal)}` : null,
      diskon ? `${t('wa.diskon')}: -${rupiah(diskon)}` : null,
      `${t('wa.kode')}: ${hasil.kode}`,
      `${t('wa.total')}: ${teksTotal}`,
      `${t('wa.nama')}: ${nama}`,
    ].filter((x) => x != null).join('\n');
    sukses.replaceChildren(
      el('h2', {}, t('pesan.berhasil')),
      el('div', {}, el('div', { class: 'redup', style: 'font-size:12px' }, t('pesan.kodeLabel')), el('div', { class: 'kode' }, hasil.kode)),
      el('pre', {}, pesanWa),
      el('a', { class: 'tombol wa', href: tautanWa(hasil.whatsapp || toko.whatsapp_number, pesanWa), target: '_blank', rel: 'noopener' }, t('pesan.lanjutWa')),
      el('p', { class: 'catatan', style: 'margin:0' }, t('pesan.catatanWa')),
      ...(hasil.pembayaran ? [el('p', { class: 'sub' }, t('pesan.bayar')), el('pre', {}, hasil.pembayaran)] : []),
      el('button', { class: 'tombol garis', type: 'button', onclick: () => tampil('pilih') }, t('pesan.lagi')));
  }

  const aside = el('aside', { class: 'ringkasan kaca', 'aria-label': t('app.ringkasan') },
    ...bagianPilih, tombol, form, sukses, catatan, catatanUsd);

  /** Ganti isi pilihan (null = kosong). */
  function atur(p) {
    pilihan = p && p.baris?.length ? p : null;
    if (!pilihan) {
      daftar.replaceChildren(kosong);
      total.textContent = '–'; totalIdr.textContent = ''; normal.hidden = true;
    } else {
      daftar.replaceChildren(...pilihan.baris.map((b) => el('div', {}, b)));
      total.textContent = harga(pilihan.total);
      totalIdr.textContent = pakaiUsd() ? t('app.rupiah', { rp: rupiah(pilihan.total) }) : '';
      const hemat = pilihan.normal > pilihan.total;
      normal.replaceChildren(...(hemat ? [el('s', {}, harga(pilihan.normal)), ' ', el('span', { class: 'hemat' }, t('pesan.hemat', { n: harga(pilihan.normal - pilihan.total) }))] : []));
      normal.hidden = !hemat;
    }
    segarkanTombol();
    if (!sukses.hidden) tampil('pilih');
    if (!pilihan && !form.hidden) tampil('pilih');
  }
  /** Tandai sedang menghitung harga (tombol pesan dinonaktifkan sementara). */
  function sibuk(b) { menunggu = b; aside.classList.toggle('sibuk', b); segarkanTombol(); }

  return { aside, atur, sibuk };
}
