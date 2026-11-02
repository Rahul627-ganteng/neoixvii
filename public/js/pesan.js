// Panel ringkasan + formulir pesanan WhatsApp, dipakai halaman aplikasi, promo, dan rakit bundle.
import { buatPesanan, cekDiskon } from './api.js';
import { ambilMember, catatRiwayat, simpanBundle } from './akun.js';
import { catatanKurs, formatUsd, harga, inggris, labelTipe, labelVarian, pakaiUsd, persen, rupiah, t, teksGalat } from './i18n.js';
import { el, tautanWa } from './ui.js';

const SIMPAN_KONTAK = 'ixvii-kontak';
const pc = (n) => persen(Number(n) / 100);   // 4 → "4%"

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
  const member = ambilMember();
  const inputNama = el('input', { type: 'text', name: 'name', autocomplete: 'name', required: true, minlength: 2, maxlength: 60, value: kontak.nama || member?.nama || '' });
  const inputWa = el('input', { type: 'tel', name: 'tel', autocomplete: 'tel', inputmode: 'tel', required: true, maxlength: 20, placeholder: t('pesan.waContoh'), value: kontak.wa || '' });
  const galat = el('div', { class: 'galat', role: 'alert', hidden: true });
  const kirim = el('button', { class: 'tombol', type: 'submit' }, t('pesan.kirim'));

  // ---- member & kupon: dihitung di database, ditampilkan sebelum pesanan dikirim
  let kuponAktif = null;
  let urutCek = 0;
  const infoMember = el('div', { class: 'info-member', hidden: true });
  const inputKupon = el('input', { type: 'text', name: 'coupon', autocomplete: 'off', maxlength: 24, placeholder: t('pesan.kuponContoh'), 'aria-label': t('pesan.kuponLabel') });
  const tombolKupon = el('button', { class: 'tombol garis kecil', type: 'button' }, t('pesan.kuponPakai'));
  const statusKupon = el('div', { class: 'status-kupon', role: 'status' });
  const kotakKupon = el('details', { class: 'kupon', hidden: true },
    el('summary', {}, t('pesan.kuponTanya')),
    el('div', { class: 'baris-kupon' }, inputKupon, tombolKupon), statusKupon);
  const rincian = el('div', { class: 'rincian-bayar', hidden: true, 'aria-live': 'polite' });
  tombolKupon.addEventListener('click', () => {
    if (kuponAktif) { kuponAktif = null; inputKupon.value = ''; inputKupon.disabled = false; tombolKupon.textContent = t('pesan.kuponPakai'); statusKupon.textContent = ''; perbaruiDiskon(); return; }
    const k = inputKupon.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (k.length < 3) { statusKupon.textContent = t('pesan.kuponPendek'); statusKupon.className = 'status-kupon galat-kecil'; return; }
    kuponAktif = k; perbaruiDiskon(true);
  });
  inputKupon.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); tombolKupon.click(); } });
  let jedaWa;
  inputWa.addEventListener('input', () => { clearTimeout(jedaWa); jedaWa = setTimeout(() => perbaruiDiskon(), 600); });

  const baris = (label, nilai, kelas = '') => el('div', { class: kelas }, el('span', {}, label), el('b', {}, nilai));
  async function perbaruiDiskon(dariTombol = false) {
    if (!pilihan) return;
    const nomor = urutCek += 1;
    const wa = inputWa.value.replace(/\D/g, '').length >= 9 ? inputWa.value : null;
    let d;
    try { d = await cekDiskon({ ...pilihan.kirim, wa, member: member?.token, kupon: kuponAktif }); }
    catch { return; }
    if (nomor !== urutCek) return;          // ada hitungan yang lebih baru
    if (!d) { kotakKupon.hidden = true; infoMember.hidden = true; rincian.hidden = true; return; }
    kotakKupon.hidden = false;
    // member
    const pr = d.program ?? {};
    infoMember.hidden = false;
    if (d.member && Number(d.member.pct) > 0) {
      infoMember.className = 'info-member ok';
      infoMember.replaceChildren(el('span', { 'aria-hidden': 'true' }, '✓ '), t('pesan.memberOk', { pct: pc(d.member.pct) }));
    } else if (d.member) {
      infoMember.className = 'info-member ok';
      infoMember.replaceChildren(el('span', { 'aria-hidden': 'true' }, '✓ '), t('pesan.memberAda'));
    } else if (pr.aktif && Number(pr.pct) > 0) {
      infoMember.className = 'info-member';
      infoMember.replaceChildren(t('pesan.memberAjak', { pct: pc(pr.pct), besar: pc(pr.besar_pct), min: rupiah(pr.min) }), ' ',
        el('a', { href: '/member/', target: '_blank', rel: 'noopener' }, t('pesan.memberDaftar')));
    } else infoMember.hidden = true;
    // kupon
    if (kuponAktif) {
      if (d.kupon_galat) {
        statusKupon.textContent = teksGalat(d.kupon_galat); statusKupon.className = 'status-kupon galat-kecil';
        kuponAktif = null;
      } else if (d.kupon) {
        inputKupon.value = d.kupon.kode; inputKupon.disabled = true; tombolKupon.textContent = t('pesan.kuponHapus');
        statusKupon.className = 'status-kupon ok';
        statusKupon.textContent = Number(d.kupon.rp) > 0 ? t('pesan.kuponOk', { kode: d.kupon.kode, rp: rupiah(d.kupon.rp) })
          : d.catatan === 'member_lebih_besar' ? t('pesan.memberLebih') : t('pesan.kuponNol');
        if (Number(d.kupon.rp) > 0 && d.catatan === 'kupon_menggantikan_member') statusKupon.textContent += ' ' + t('pesan.memberGanti');
      }
    } else if (dariTombol === false && !inputKupon.disabled) statusKupon.textContent = '';
    // rincian harga
    const mrp = Number(d.member?.rp || 0), krp = Number(d.kupon?.rp || 0);
    rincian.hidden = !(mrp || krp);
    rincian.replaceChildren(...(mrp || krp ? [
      baris(t('pesan.subtotal'), harga(d.subtotal)),
      mrp ? baris(t('pesan.dMember', { pct: pc(d.member.pct) }), '-' + harga(mrp), 'hemat') : null,
      krp ? baris(t('pesan.dKupon', { kode: d.kupon.kode }), '-' + harga(krp), 'hemat') : null,
      baris(t('pesan.totalBayar'), harga(d.total), 'jumlah'),
      d.dibatasi ? el('p', { class: 'catatan', style: 'margin:0' }, t('pesan.dibatasi')) : null,
    ].filter(Boolean) : []));
  }

  const form = el('form', { class: 'form-pesan', hidden: true, novalidate: true, onsubmit: kirimPesanan },
    el('label', {}, t('pesan.nama'), inputNama),
    el('label', {}, t('pesan.wa'), inputWa),
    infoMember, kotakKupon, rincian,
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
    if (mode === 'form') { galat.hidden = true; (inputNama.value ? inputWa : inputNama).focus(); perbaruiDiskon(); }
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
      const hasil = await buatPesanan({ ...pilihan.kirim, nama, wa, member: member?.token, kupon: kuponAktif });
      try { localStorage.setItem(SIMPAN_KONTAK, JSON.stringify({ nama, wa })); } catch { /* abaikan */ }
      catatRiwayat(hasil);
      if (pilihan.kirim.rakit) simpanBundle([]);   // bundle rakitan sudah dipesan
      if (kuponAktif) { kuponAktif = null; inputKupon.value = ''; inputKupon.disabled = false; tombolKupon.textContent = t('pesan.kuponPakai'); statusKupon.textContent = ''; }
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
    const rinci = hasil.diskon_paket != null;   // database baru: diskon dirinci per jenis
    const dPaket = rinci ? Number(hasil.diskon_paket || 0) : diskon;
    const pesanWa = [
      t('wa.halo'),
      hasil.jenis === 'bundle' ? `${t('wa.bundle')}: ${hasil.paket}` : hasil.jenis === 'rakit' ? t('wa.rakit') : null,
      ...(hasil.items || []).map((i) => `- ${i.aplikasi} · ${labelTipe(i.tipe)} · ${labelVarian(i.varian)}: ${rupiah(i.harga)}`),
      '',
      diskon ? `${t('wa.subtotal')}: ${rupiah(hasil.total_normal)}` : null,
      dPaket ? `${t('wa.diskon')}: -${rupiah(dPaket)}` : null,
      rinci && Number(hasil.diskon_member) ? `${t('wa.dMember', { pct: pc(hasil.member_pct) })}: -${rupiah(hasil.diskon_member)}` : null,
      rinci && Number(hasil.diskon_kupon) ? `${t('wa.dKupon', { kode: hasil.kupon })}: -${rupiah(hasil.diskon_kupon)}` : null,
      `${t('wa.kode')}: ${hasil.kode}`,
      `${t('wa.total')}: ${teksTotal}`,
      `${t('wa.nama')}: ${nama}`,
    ].filter((x) => x != null).join('\n');
    const nomorWa = hasil.whatsapp || toko.whatsapp_number;
    const kepala = [
      el('h2', {}, t('pesan.berhasil')),
      el('div', {}, el('div', { class: 'redup', style: 'font-size:12px' }, t('pesan.kodeLabel')), el('div', { class: 'kode' }, hasil.kode))];
    const caraLain = hasil.pembayaran ? el('details', { class: 'cara-lain' }, el('summary', {}, t('pesan.caraLain')), el('pre', {}, hasil.pembayaran)) : null;
    const lagi = el('button', { class: 'tombol garis', type: 'button', onclick: () => tampil('pilih') }, t('pesan.lagi'));
    const qris = toko?.qris_aktif === false ? null : (toko?.qris_url || '/assets/bayar/qris-ixvii.jpg');
    if (!qris) {
      sukses.replaceChildren(...kepala, el('pre', {}, pesanWa),
        el('a', { class: 'tombol wa', href: tautanWa(nomorWa, pesanWa), target: '_blank', rel: 'noopener' }, t('pesan.lanjutWa')),
        el('p', { class: 'catatan', style: 'margin:0' }, t('pesan.catatanWa')), caraLain, lagi);
      return;
    }
    // stok tersedia: pembeli bisa langsung bayar QRIS, atau tanya stok dulu ke admin
    const nominal = rupiah(hasil.total);
    const salin = el('button', { class: 'salin-nominal', type: 'button', 'aria-label': t('pesan.salin') }, t('pesan.salin'));
    salin.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(String(hasil.total)); salin.textContent = t('pesan.disalin'); } catch { /* biarkan */ }
    });
    const bagianQris = el('div', { class: 'bayar-qris', hidden: true },
      el('div', { class: 'nominal-qris' }, el('span', {}, t('pesan.bayarTepat')), el('b', {}, nominal), salin),
      el('img', { class: 'gambar-qris', src: qris, alt: t('pesan.altQris'), width: 1135, height: 1600, loading: 'lazy' }),
      el('a', { class: 'tombol garis', href: qris, download: 'QRIS-IXVII.CO.jpg' }, t('pesan.unduhQris')),
      el('ol', { class: 'langkah-qris' }, el('li', {}, t('pesan.langkah1')), el('li', {}, t('pesan.langkah2', { nominal })), el('li', {}, t('pesan.langkah3'))),
      inggris() ? el('p', { class: 'catatan', style: 'margin:0' }, t('pesan.qrisIndo')) : null,
      el('a', { class: 'tombol wa', href: tautanWa(nomorWa, `${pesanWa}\n\n${t('wa.sudahBayar', { nominal })}`), target: '_blank', rel: 'noopener' }, t('pesan.sudahBayar')),
      el('p', { class: 'catatan', style: 'margin:0' }, t('pesan.akunDikirim')));
    const tombolBayar = el('button', { class: 'tombol', type: 'button', 'aria-expanded': 'false' }, t('pesan.bayarQris'));
    tombolBayar.addEventListener('click', () => {
      bagianQris.hidden = !bagianQris.hidden;
      tombolBayar.setAttribute('aria-expanded', String(!bagianQris.hidden));
      if (!bagianQris.hidden) bagianQris.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    sukses.replaceChildren(...kepala,
      el('p', { style: 'margin:0' }, t('pesan.pilihLanjut')),
      el('div', { class: 'pilihan-bayar' }, tombolBayar,
        el('a', { class: 'tombol garis wa', href: tautanWa(nomorWa, `${pesanWa}\n\n${t('wa.tanyaStok')}`), target: '_blank', rel: 'noopener' }, t('pesan.tanyaStok'))),
      bagianQris, caraLain, lagi);
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
