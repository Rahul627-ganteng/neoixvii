// Halaman member: daftar (nama + nomor WA), akun (benefit, riwayat pembelian, status garansi), minta ulang link akun.
// Link akun /member/?k=… bersifat pribadi: disimpan di perangkat lalu dihapus dari alamat halaman.
import { akunMember, ambilProgramMember, ambilToko, daftarMember, kirimLinkMember } from './api.js';
import { ambilMember, simpanMember } from './akun.js';
import { harga, labelTipe, labelVarian, persen, rupiah, t, tanggal, teksGalat } from './i18n.js';
import { el, ikonApp, pasangKerangka, tautanWa, urlApp } from './ui.js';

pasangKerangka('/member/');
const isi = document.getElementById('isi');
const pc = (n) => persen(Number(n) / 100);
const hariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
let toko = null;

function teksProgram(pr) {
  if (!pr) return null;
  const berlaku = pr.berlaku ?? (pr.aktif && (!pr.mulai || pr.mulai <= hariIni()) && (!pr.sampai || pr.sampai >= hariIni()));
  if (!berlaku || Number(pr.pct ?? pr.diskon_pct) <= 0) return null;
  return {
    utama: t('member.benefit1', { pct: pc(pr.pct ?? pr.diskon_pct) }),
    besar: t('member.benefit2', { pct: pc(pr.besar_pct ?? pr.diskon_besar_pct), min: rupiah(pr.min ?? pr.min_besar) }),
    masa: pr.sampai ? t('member.sampai', { tgl: tanggal(pr.sampai + 'T00:00:00') }) : null,
  };
}

// ---------------------------------------------------------------- daftar
async function tampilDaftar(catatan) {
  const pr = await ambilProgramMember();
  const p = teksProgram(pr);
  const nama = el('input', { type: 'text', name: 'name', autocomplete: 'name', required: true, minlength: 2, maxlength: 60 });
  const wa = el('input', { type: 'tel', name: 'tel', autocomplete: 'tel', inputmode: 'tel', required: true, maxlength: 20, placeholder: t('pesan.waContoh') });
  const galat = el('div', { class: 'galat', role: 'alert', hidden: true });
  const kirim = el('button', { class: 'tombol', type: 'submit' }, t('member.daftarTombol'));
  const form = el('form', { class: 'form-pesan form-daftar', novalidate: true },
    el('label', {}, t('pesan.nama'), nama), el('label', {}, t('pesan.wa'), wa), galat, kirim,
    el('p', { class: 'catatan', style: 'margin:0' }, t('member.catatanDaftar')));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (nama.value.trim().length < 2 || wa.value.replace(/\D/g, '').length < 9) { galat.textContent = t('pesan.wajib'); galat.hidden = false; return; }
    kirim.disabled = true; kirim.textContent = t('pesan.proses'); galat.hidden = true;
    try {
      const h = await daftarMember(nama.value.trim(), wa.value.trim());
      if (h.baru) { simpanMember({ token: h.token, nama: h.nama }); pasangKerangka('/member/'); return tampilAkun(true); }
      tampilSudah(h, wa.value.trim());
    } catch (err) {
      galat.textContent = err instanceof TypeError ? t('pesan.gagal') : teksGalat(err.message); galat.hidden = false;
    } finally { kirim.disabled = false; kirim.textContent = t('member.daftarTombol'); }
  });

  isi.replaceChildren(
    catatan ? el('div', { class: 'kosong kaca', style: 'margin-bottom:16px' }, el('p', { style: 'margin:0' }, catatan)) : '',
    el('div', { class: 'tata-member' },
      el('section', { class: 'kaca kartu-member-ajak' },
        el('span', { class: 'gabung-label merah' }, t('member.label')),
        el('h2', {}, p ? t('member.ajakJudul', { pct: pc(pr.diskon_pct) }) : t('member.ajakJudulUmum')),
        el('ul', { class: 'gabung-poin gelap' },
          p ? el('li', {}, el('span', { class: 'tanda', 'aria-hidden': 'true' }, '✓'), p.utama) : null,
          p ? el('li', {}, el('span', { class: 'tanda', 'aria-hidden': 'true' }, '✓'), p.besar) : null,
          el('li', {}, el('span', { class: 'tanda', 'aria-hidden': 'true' }, '✓'), t('member.benefit3')),
          el('li', {}, el('span', { class: 'tanda', 'aria-hidden': 'true' }, '✓'), t('member.benefit4'))),
        p?.masa ? el('p', { class: 'redup', style: 'margin:8px 0 0' }, p.masa) : null),
      el('section', { class: 'kaca kartu-form' },
        el('h2', {}, t('member.daftarJudul')),
        el('p', { class: 'redup' }, t('member.daftarSub')),
        form,
        el('details', { class: 'lupa-link' }, el('summary', {}, t('member.sudahMember')), formLupa()))));
}

function formLupa() {
  const wa = el('input', { type: 'tel', inputmode: 'tel', maxlength: 20, placeholder: t('pesan.waContoh'), 'aria-label': t('pesan.wa') });
  const status = el('p', { class: 'catatan', role: 'status', style: 'margin:8px 0 0' });
  const tombol = el('button', { class: 'tombol garis kecil', type: 'button' }, t('member.kirimLink'));
  tombol.addEventListener('click', async () => {
    if (wa.value.replace(/\D/g, '').length < 9) { status.textContent = t('pesan.wajib'); return; }
    tombol.disabled = true;
    try {
      const h = await kirimLinkMember(wa.value.trim());
      status.replaceChildren(h.wa_siap ? t('member.linkTerkirim') : t('member.linkManual'), ' ',
        !h.wa_siap && toko?.whatsapp_number ? el('a', { href: tautanWa(toko.whatsapp_number, t('wa.mintaLink', { wa: wa.value.trim() })), target: '_blank', rel: 'noopener' }, t('member.chatAdmin')) : '');
    } catch (err) { status.textContent = teksGalat(err.message); }
    tombol.disabled = false;
  });
  return el('div', { class: 'baris-kupon', style: 'flex-wrap:wrap' }, wa, tombol, status);
}

function tampilSudah(h, wa) {
  isi.replaceChildren(el('div', { class: 'kosong kaca' },
    el('h2', {}, t('member.sudahJudul')),
    el('p', {}, h.terkirim ? t('member.linkTerkirim') : t('member.linkManual')),
    !h.terkirim && toko?.whatsapp_number
      ? el('a', { class: 'tombol wa', href: tautanWa(toko.whatsapp_number, t('wa.mintaLink', { wa })), target: '_blank', rel: 'noopener' }, t('member.chatAdmin')) : null,
    el('button', { class: 'tombol garis', type: 'button', onclick: () => tampilDaftar() }, t('member.kembali'))));
}

// ---------------------------------------------------------------- akun
const LABEL_STATUS = { menunggu_bayar: ['status.menunggu', 'kuning'], dibayar: ['status.dibayar', 'biru'], aktif: ['status.aktif', 'hijau'], selesai: ['status.selesai', ''], batal: ['status.batal', 'merah'] };

function infoGaransi(o) {
  const hari = hariIni();
  if (o.garansi === 'aktif') {
    if (o.sampai && o.sampai < hari) return el('span', { class: 'lencana' }, t('member.gSelesai'));
    return el('span', { class: 'lencana ada' }, '✓ ', o.sampai ? t('member.gAktifSampai', { tgl: tanggal(o.sampai + 'T00:00:00') }) : t('member.gAktif'));
  }
  if (o.garansi === 'tidak_aktif') return el('span', { class: 'lencana habis' }, t('member.gTidak'));
  if (!['aktif', 'selesai'].includes(o.status)) return null;
  if (o.link_garansi) return el('a', { class: 'tombol kecil', href: `/garansi/?t=${encodeURIComponent(o.link_garansi)}` }, t('member.gIsi'));
  return el('span', { class: 'lencana sedikit' }, t('member.gBelum'));
}

function kartuPesanan(o) {
  const [kunci, warna] = LABEL_STATUS[o.status] ?? [o.status, ''];
  const pertama = o.items.find((i) => i.slug);
  return el('article', { class: 'pesanan-member kaca' },
    el('div', { class: 'atas' },
      el('div', {}, el('b', { class: 'kode' }, o.kode), el('small', { class: 'redup' }, ' · ', tanggal(o.tanggal))),
      el('span', { class: 'lencana ' + (warna ? `status-${warna}` : '') }, t(kunci))),
    el('ul', { class: 'item-member' }, o.items.map((i) => el('li', {},
      ikonApp({ nama: i.app, logo: i.logo, kunciKategori: null }),
      el('span', {}, el('b', {}, i.app), el('small', {}, `${labelTipe(i.tipe)} · ${labelVarian(i.varian)}`))))),
    el('div', { class: 'bawah' },
      el('div', {}, el('b', {}, harga(o.total)), Number(o.diskon) > 0 ? el('small', { class: 'hemat' }, ' ', t('member.hematRp', { rp: harga(o.diskon) })) : null,
        o.sampai && ['aktif', 'selesai'].includes(o.status) ? el('div', { class: 'redup', style: 'font-size:13px' }, t('member.masaAktif', { tgl: tanggal(o.sampai + 'T00:00:00') })) : null),
      el('div', { class: 'row-aksi' }, infoGaransi(o),
        pertama ? el('a', { class: 'tombol garis kecil', href: urlApp(pertama.slug) }, t('member.beliLagi')) : null)));
}

async function tampilAkun(baru = false) {
  const m = ambilMember();
  if (!m) return tampilDaftar();
  isi.replaceChildren(el('div', { class: 'memuat', style: 'height:180px' }));
  let a;
  try { a = await akunMember(m.token); }
  catch (err) {
    if (/tidak valid/i.test(err.message)) { simpanMember(null); pasangKerangka('/member/'); return tampilDaftar(t('member.linkKadaluarsa')); }
    isi.replaceChildren(el('div', { class: 'kosong kaca' }, el('p', {}, t('pesan.gagal')),
      el('button', { class: 'tombol garis', type: 'button', onclick: () => tampilAkun() }, t('gagal.ulang'))));
    return;
  }
  if (a.nama !== m.nama) simpanMember({ token: m.token, nama: a.nama });
  const p = teksProgram(a.program);
  const salin = el('button', { class: 'tombol garis kecil', type: 'button' }, t('member.salinLink'));
  salin.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(`${location.origin}/member/?k=${m.token}`); salin.textContent = t('pesan.disalin'); }
    catch { salin.textContent = t('member.salinGagal'); }
  });
  const keluar = el('button', { class: 'tombol garis kecil', type: 'button' }, t('member.keluar'));
  keluar.addEventListener('click', () => { if (confirm(t('member.keluarTanya'))) { simpanMember(null); pasangKerangka('/member/'); tampilDaftar(); } });

  isi.replaceChildren(
    baru ? el('div', { class: 'sambut-member', role: 'status' }, el('b', {}, t('member.selamat')), ' ', t('member.selamatTeks')) : '',
    el('div', { class: 'tata-member' },
      el('section', { class: 'kaca profil-member' },
        el('div', { class: 'avatar', 'aria-hidden': 'true' }, a.nama.trim()[0].toUpperCase()),
        el('div', {},
          el('h2', {}, t('member.halo', { nama: a.nama })),
          el('div', { class: 'redup' }, el('span', { class: 'lencana ada' }, '✓ ', t('member.aktif')), ' ', a.wa),
          el('div', { class: 'redup', style: 'font-size:13px;margin-top:4px' }, t('member.sejak', { tgl: tanggal(a.sejak + 'T00:00:00') }))),
        el('div', { class: 'hemat-total' }, el('small', {}, t('member.totalHemat')), el('b', {}, harga(a.hemat)))),
      el('section', { class: 'kaca benefit-member' },
        el('h3', {}, t('member.benefitJudul')),
        p ? el('ul', { class: 'gabung-poin gelap' },
          el('li', {}, el('span', { class: 'tanda', 'aria-hidden': 'true' }, '✓'), p.utama),
          el('li', {}, el('span', { class: 'tanda', 'aria-hidden': 'true' }, '✓'), p.besar)) : el('p', { class: 'redup' }, t('member.programOff')),
        p?.masa ? el('p', { class: 'redup', style: 'margin:0 0 8px' }, p.masa) : null,
        el('p', { class: 'catatan' }, t('member.caraPakai')),
        el('a', { class: 'tombol', href: '/katalog/' }, t('member.belanja')))),
    el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, t('member.riwayat'))),
      a.pesanan.length ? el('div', { class: 'daftar-pesanan-member' }, a.pesanan.map(kartuPesanan))
        : el('div', { class: 'kosong kaca' }, el('p', { style: 'margin:0' }, t('member.belumPesan')))),
    el('div', { class: 'aksi-akun' }, salin, keluar, el('p', { class: 'catatan', style: 'margin:0;flex-basis:100%' }, t('member.linkPribadi'))));
}

// ---------------------------------------------------------------- mulai
(async () => {
  toko = await ambilToko();
  const k = new URLSearchParams(location.search).get('k');
  if (k && /^[a-f0-9]{24,64}$/i.test(k)) {
    simpanMember({ token: k, nama: ambilMember()?.nama || '' });
    history.replaceState(null, '', '/member/');   // token tidak tertinggal di alamat halaman
    pasangKerangka('/member/');
  }
  tampilAkun();
})();
