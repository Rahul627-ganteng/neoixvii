// Halaman "Langganan saya": sisa masa aktif, status garansi, tombol perpanjang, kupon pribadi, dan riwayat pesanan.
// Link pribadi /langganan/?k=… dikirim lewat WhatsApp (pengingat atau "Kirim link ke WhatsApp saya").
// Tanpa link: status pesanan yang dibuat dari perangkat ini (token per pesanan, /langganan/?p=…).
import { ambilProgramMember, ambilToko, kirimLinkLangganan, langgananSaya, statusPesanan } from './api.js';
import { ambilLangganan, ambilMember, catatRiwayat, simpanLangganan, tokenRiwayat } from './akun.js';
import { harga, labelTipe, labelVarian, persen, rupiah, t, tanggal, teksGalat } from './i18n.js';
import { bukaKabari } from './kabari.js';
import { el, ikonApp, pasangKerangka, tautanWa } from './ui.js';

pasangKerangka('/langganan/');
const isi = document.getElementById('isi');
const params = new URLSearchParams(location.search);
const appSorot = params.get('app') || '';
let toko = null;

const tgl = (d) => (d ? tanggal(d + 'T00:00:00') : '–');
const SIMPAN_KONTAK = 'ixvii-kontak';
const simpanKontak = (nama, wa) => {
  try { localStorage.setItem(SIMPAN_KONTAK, JSON.stringify({ nama: nama || '', wa: wa ? '+' + String(wa).replace(/\D/g, '') : '' })); } catch { /* abaikan */ }
};
const STATUS = { menunggu_bayar: ['status.menunggu', 'kuning'], dibayar: ['status.dibayar', 'biru'], aktif: ['status.aktif', 'hijau'], selesai: ['status.selesai', ''], batal: ['status.batal', 'merah'] };

// ---------------------------------------------------------------- kartu satu langganan
function lencanaSisa(l) {
  if (l.keadaan === 'memesan') return el('span', { class: 'lencana status-biru' }, t('lg.memesan'));
  if (l.sisa < 0) return el('span', { class: 'lencana status-merah' }, t('lg.lewat', { n: -l.sisa }));
  if (l.sisa === 0) return el('span', { class: 'lencana status-merah' }, t('lg.hariIni'));
  if (l.sisa <= 7) return el('span', { class: 'lencana status-kuning' }, t('lg.sisa', { n: l.sisa }));
  return el('span', { class: 'lencana status-hijau' }, t('lg.aktifSisa', { n: l.sisa }));
}

function infoGaransi(l) {
  if (l.garansi === 'aktif') return el('span', { class: 'lencana ada' }, '✓ ', t('member.gAktif'));
  if (l.garansi === 'tidak_aktif') return el('span', { class: 'lencana habis' }, t('member.gTidak'));
  if (l.link_garansi) return el('a', { class: 'tombol garis kecil', href: `/garansi/?t=${encodeURIComponent(l.link_garansi)}` }, t('member.gIsi'));
  return null;
}

function tombolPerpanjang(l, data) {
  const p = l.perpanjang;
  if (p && p.tersedia && l.slug) {
    return el('a', {
      class: 'tombol', href: `/aplikasi/?app=${encodeURIComponent(l.slug)}&pilih=${encodeURIComponent(p.kode)}&perpanjang=1`,
      onclick: () => simpanKontak(data.nama, data.wa),
    }, t('lg.perpanjang'), el('small', {}, ` · ${harga(p.harga)}`));
  }
  if (p && !p.tersedia) {
    return el('button', {
      class: 'tombol garis', type: 'button',
      onclick: () => { simpanKontak(data.nama, data.wa); bukaKabari({ app: l.app, varian: [{ id: p.kode, d: p.varian, tipe: p.tipe }] }); },
    }, t('kabari.tombolBesar'));
  }
  if (toko?.whatsapp_number) {
    return el('a', { class: 'tombol garis wa', href: tautanWa(toko.whatsapp_number, t('lg.waPerpanjang', { app: l.app, kode: l.kode })), target: '_blank', rel: 'noopener' }, t('lg.perpanjangWa'));
  }
  return null;
}

function kartuLangganan(l, data) {
  const durasi = Number(l.durasi) || 0;
  const lewatHari = durasi ? Math.min(durasi, Math.max(0, durasi - l.sisa)) : 0;
  const pct = durasi ? Math.round((lewatHari / durasi) * 100) : 100;
  const nada = l.sisa < 0 || l.sisa === 0 ? 'merah' : l.sisa <= 7 ? 'kuning' : 'hijau';
  const p = l.perpanjang;
  const kartu = el('article', { class: 'kartu-langganan kaca' + (l.slug && l.slug === appSorot ? ' disorot' : ''), id: l.slug ? `langganan-${l.slug}` : null },
    el('div', { class: 'atas' },
      el('div', { class: 'app-langganan' }, ikonApp({ nama: l.app, logo: l.logo, kunciKategori: null }),
        el('div', {}, el('h3', {}, l.app), el('small', { class: 'redup' }, `${labelTipe(l.tipe)} · ${labelVarian(l.varian)}`))),
      lencanaSisa(l)),
    el('div', { class: 'masa-aktif' },
      el('div', { class: 'bar-masa nada-' + nada, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': t('lg.barLabel') },
        el('span', { style: `width:${pct}%` })),
      el('div', { class: 'tanggal-masa' },
        el('span', {}, t('lg.mulai'), ' ', el('b', {}, tgl(l.mulai))),
        el('span', {}, t('lg.berakhir'), ' ', el('b', {}, tgl(l.berakhir)))),
      l.berakhir_awal && l.berakhir_awal !== l.berakhir && l.sisa >= 0 ? el('p', { class: 'catatan', style: 'margin:4px 0 0' }, t('lg.toleransi', { tgl: tgl(l.berakhir_awal) })) : null),
    el('div', { class: 'bawah' },
      el('div', { class: 'row-aksi' }, infoGaransi(l), el('small', { class: 'redup' }, t('lg.pesanan', { kode: l.kode }))),
      el('div', { class: 'row-aksi' },
        p && p.tersedia && !p.sama ? el('small', { class: 'redup' }, t('lg.paketLain', { paket: `${labelTipe(p.tipe)} · ${labelVarian(p.varian)}` })) : null,
        tombolPerpanjang(l, data))));
  return kartu;
}

// ---------------------------------------------------------------- kupon & riwayat
function teksPotongan(k) {
  return k.jenis === 'persen' ? `${Number(k.nilai)}%${k.maks ? ` (${t('lg.maks', { rp: rupiah(k.maks) })})` : ''}` : rupiah(k.nilai);
}
function bagianKupon(kupon) {
  if (!kupon?.length) return null;
  return el('section', { class: 'seksi' },
    el('div', { class: 'seksi-kepala' }, el('h2', {}, t('lg.kuponJudul'))),
    el('div', { class: 'daftar-kupon-saya' }, kupon.map((k) => {
      const salin = el('button', { class: 'tombol garis kecil', type: 'button' }, t('lg.salinKode'));
      salin.addEventListener('click', async () => { try { await navigator.clipboard.writeText(k.kode); salin.textContent = t('pesan.disalin'); } catch { /* biarkan */ } });
      return el('div', { class: 'kupon-saya kaca' },
        el('div', {}, el('span', { class: 'gabung-label merah' }, t(k.sumber === 'hadiah_ajak' ? 'lg.kuponHadiah' : 'lg.kuponKembali')),
          el('b', { class: 'kode-kupon-besar' }, k.kode),
          el('div', { class: 'redup' }, t('lg.kuponPotongan', { potongan: teksPotongan(k) }),
            k.min ? ` · ${t('lg.kuponMin', { rp: rupiah(k.min) })}` : '', k.sampai ? ` · ${t('lg.kuponSampai', { tgl: tanggal(k.sampai) })}` : '')),
        salin);
    })),
    el('p', { class: 'catatan' }, t('lg.kuponCatatan')));
}

function langkahStatus(status) {
  if (status === 'batal') return null;
  const urut = ['menunggu_bayar', 'dibayar', 'aktif'];
  const posisi = status === 'selesai' ? 3 : urut.indexOf(status);
  return el('ol', { class: 'langkah-status', 'aria-label': t('lg.langkahLabel') },
    [['lg.lk1', 0], ['lg.lk2', 1], ['lg.lk3', 2]].map(([k, i]) => el('li', { class: i < posisi ? 'selesai' : i === posisi ? 'sekarang' : '' }, t(k))));
}

function kartuPesanan(o, { langkah = false } = {}) {
  const [kunci, warna] = STATUS[o.status] ?? [o.status, ''];
  return el('article', { class: 'pesanan-member kaca' },
    el('div', { class: 'atas' },
      el('div', {}, el('b', { class: 'kode' }, o.kode), el('small', { class: 'redup' }, ' · ', tanggal(o.tanggal))),
      el('span', { class: 'lencana ' + (warna ? `status-${warna}` : '') }, t(kunci))),
    langkah ? langkahStatus(o.status) : null,
    el('ul', { class: 'item-member' }, (o.items ?? []).map((i) => el('li', {},
      ikonApp({ nama: i.app, logo: i.logo, kunciKategori: null }),
      el('span', {}, el('b', {}, i.app), el('small', {}, `${labelTipe(i.tipe)} · ${labelVarian(i.varian)}`))))),
    el('div', { class: 'bawah' },
      el('div', {}, el('b', {}, harga(o.total)), Number(o.diskon) > 0 ? el('small', { class: 'hemat' }, ' ', t('member.hematRp', { rp: harga(o.diskon) })) : null,
        o.sampai && ['aktif', 'selesai'].includes(o.status) ? el('div', { class: 'redup', style: 'font-size:13px' }, t('member.masaAktif', { tgl: tgl(o.sampai) })) : null,
        o.status === 'menunggu_bayar' ? el('div', { class: 'redup', style: 'font-size:13px' }, t('lg.belumBayar')) : null,
        o.status === 'dibayar' ? el('div', { class: 'redup', style: 'font-size:13px' }, t('lg.diproses')) : null),
      el('div', { class: 'row-aksi' },
        o.link_garansi ? el('a', { class: 'tombol kecil', href: `/garansi/?t=${encodeURIComponent(o.link_garansi)}` }, t('member.gIsi')) : null,
        o.status === 'menunggu_bayar' && toko?.whatsapp_number
          ? el('a', { class: 'tombol garis kecil wa', href: tautanWa(toko.whatsapp_number, t('lg.waBayar', { kode: o.kode })), target: '_blank', rel: 'noopener' }, t('lg.konfirmasi')) : null)));
}

// ---------------------------------------------------------------- minta link lewat WhatsApp
function formMintaLink() {
  const wa = el('input', { type: 'tel', inputmode: 'tel', maxlength: 20, placeholder: t('pesan.waContoh'), 'aria-label': t('pesan.wa') });
  try { wa.value = JSON.parse(localStorage.getItem(SIMPAN_KONTAK) || '{}').wa || ''; } catch { /* abaikan */ }
  const status = el('p', { class: 'catatan', role: 'status', style: 'margin:8px 0 0' });
  const tombol = el('button', { class: 'tombol', type: 'submit' }, t('lg.kirimLink'));
  const form = el('form', { class: 'baris-kupon', novalidate: true, style: 'flex-wrap:wrap' }, wa, tombol, status);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (wa.value.replace(/\D/g, '').length < 9) { status.textContent = t('pesan.wajib'); return; }
    tombol.disabled = true;
    try {
      const h = await kirimLinkLangganan(wa.value.trim());
      status.replaceChildren(h.wa_siap ? t('lg.linkTerkirim') : t('lg.linkManual'), ' ',
        !h.wa_siap && toko?.whatsapp_number ? el('a', { href: tautanWa(toko.whatsapp_number, t('lg.waMintaLink', { wa: wa.value.trim() })), target: '_blank', rel: 'noopener' }, t('member.chatAdmin')) : '');
    } catch (err) { status.textContent = err instanceof TypeError ? t('pesan.gagal') : teksGalat(err.message); }
    tombol.disabled = false;
  });
  return form;
}

// ---------------------------------------------------------------- tampilan dengan link pribadi
async function tampilPribadi(token, dariMember) {
  isi.replaceChildren(el('div', { class: 'memuat', style: 'height:220px' }));
  let data;
  try { data = await langgananSaya(token); }
  catch (err) {
    if (/tidak valid/i.test(err.message)) {
      if (!dariMember) simpanLangganan(null);
      return tampilPerangkat(t('lg.linkKadaluarsa'));
    }
    isi.replaceChildren(el('div', { class: 'kosong kaca' }, el('p', {}, t('pesan.gagal')),
      el('button', { class: 'tombol garis', type: 'button', onclick: () => tampilPribadi(token, dariMember) }, t('gagal.ulang'))));
    return;
  }
  const langganan = data.langganan ?? [];
  const aktif = langganan.filter((l) => l.sisa >= 0);
  const hampir = aktif.filter((l) => l.sisa <= 7);
  const keluar = !dariMember ? el('button', { class: 'tombol garis kecil', type: 'button' }, t('lg.keluar')) : null;
  keluar?.addEventListener('click', () => { if (confirm(t('lg.keluarTanya'))) { simpanLangganan(null); tampilPerangkat(); } });
  let ajakMember = null;
  if (!data.member) {
    const pr = await ambilProgramMember();
    const hari = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
    if (pr?.aktif && Number(pr.diskon_pct) > 0 && (!pr.mulai || pr.mulai <= hari) && (!pr.sampai || pr.sampai >= hari)) {
      ajakMember = el('div', { class: 'ajak-member kaca' },
        el('div', {}, el('span', { class: 'gabung-label merah' }, t('member.label')),
          el('h3', {}, t('member.ajakJudul', { pct: persen(Number(pr.diskon_pct) / 100) })),
          el('p', {}, t('lg.memberTeks'))),
        el('a', { class: 'tombol', href: '/member/' }, t('member.ajakTombol')));
    }
  }

  isi.replaceChildren(...[
    el('section', { class: 'kaca sapa-langganan' },
      el('div', { class: 'avatar', 'aria-hidden': 'true' }, String(data.nama || '?').trim()[0]?.toUpperCase() ?? '?'),
      el('div', {},
        el('h2', {}, t('member.halo', { nama: String(data.nama || '').split(' ')[0] })),
        el('p', { class: 'redup', style: 'margin:2px 0 0' },
          aktif.length ? t('lg.ringkas', { n: aktif.length, s: aktif.length === 1 ? '' : 's' }) : t('lg.ringkasKosong'),
          hampir.length ? ` · ${t('lg.ringkasHampir', { n: hampir.length })}` : '')),
      data.member ? el('a', { class: 'tombol garis kecil', href: '/member/' }, t('nav.akun')) : null),
    el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, t('lg.judulLangganan'))),
      langganan.length ? el('div', { class: 'daftar-langganan' }, langganan.map((l) => kartuLangganan(l, data)))
        : el('div', { class: 'kosong kaca' }, el('p', { style: 'margin:0 0 10px' }, t('lg.belumAda')), el('a', { class: 'tombol', href: '/katalog/' }, t('member.belanja')))),
    bagianKupon(data.kupon),
    ajakMember,
    data.pesanan?.length ? el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, t('member.riwayat'))),
      el('div', { class: 'daftar-pesanan-member' }, data.pesanan.slice(0, 12).map((o) => kartuPesanan(o, { langkah: ['menunggu_bayar', 'dibayar'].includes(o.status) })))) : null,
    el('div', { class: 'aksi-akun' }, keluar, el('p', { class: 'catatan', style: 'margin:0;flex-basis:100%' }, t('lg.linkPribadi')))].filter(Boolean));
  if (appSorot) requestAnimationFrame(() => document.getElementById(`langganan-${appSorot}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}

// ---------------------------------------------------------------- tanpa link: pesanan dari perangkat ini
async function tampilPerangkat(catatan) {
  const token = tokenRiwayat();
  let pesanan = [];
  if (token.length) {
    isi.replaceChildren(el('div', { class: 'memuat', style: 'height:180px' }));
    try { pesanan = await statusPesanan(token); } catch { pesanan = []; }
  }
  isi.replaceChildren(...[
    catatan ? el('div', { class: 'kosong kaca', style: 'margin-bottom:16px' }, el('p', { style: 'margin:0' }, catatan)) : '',
    pesanan.length ? el('section', { class: 'seksi', style: 'padding-top:0' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, t('lg.dariPerangkat'))),
      el('div', { class: 'daftar-pesanan-member' }, pesanan.map((o) => kartuPesanan(o, { langkah: true })))) : null,
    el('section', { class: 'kaca kartu-form minta-link' },
      el('h2', {}, t('lg.mintaJudul')),
      el('p', { class: 'redup' }, t('lg.mintaSub')),
      formMintaLink(),
      el('p', { class: 'catatan', style: 'margin:10px 0 0' }, t('lg.mintaCatatan'))),
    !pesanan.length ? el('p', { class: 'redup', style: 'margin-top:16px' }, t('lg.belumPesanPerangkat'), ' ', el('a', { href: '/katalog/' }, t('member.belanja'))) : null].filter(Boolean));
}

// ---------------------------------------------------------------- mulai
(async () => {
  toko = await ambilToko();
  const k = params.get('k');
  const p = params.get('p');
  if (k && /^[a-f0-9]{24,64}$/i.test(k)) simpanLangganan(k.toLowerCase());
  if (p && /^[a-f0-9]{32}$/i.test(p)) {
    // link status pesanan dari halaman sukses: simpan ke riwayat perangkat ini
    try { const [o] = await statusPesanan([p.toLowerCase()]); if (o) catatRiwayat({ kode: o.kode, items: [] }, p.toLowerCase()); } catch { /* abaikan */ }
  }
  if (k || p) history.replaceState(null, '', '/langganan/' + (appSorot ? `?app=${encodeURIComponent(appSorot)}` : ''));   // token tidak tertinggal di alamat
  const tok = ambilLangganan();
  const member = ambilMember();
  if (tok) return tampilPribadi(tok, false);
  if (member) return tampilPribadi(member.token, true);
  return tampilPerangkat();
})();
