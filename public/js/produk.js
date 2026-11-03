// Halaman Produk Digital: daftar per kategori (ebook, template, preset, kelas, lainnya), produk unggulan,
// iklan mitra berlabel "Iklan", dan halaman detail (?p=slug) dengan pemesanan QRIS + ulasan pembeli asli.
// Angka terjual & rating datang dari database (pesanan dibayar + penjualan asli yang dicatat admin, ulasan pembeli terverifikasi).
import { ambilDetailProduk, ambilProduk, ambilToko, pesanProduk, ulasProduk } from './api.js';
import { renderIsi, ikon as ikonEbook } from './ebook-render.js';
import { hitungMundur } from './gabung.js';
import { angkaRating, inggris, pasangKurs, harga, rupiah, t, teksGalat, tanggal } from './i18n.js';
import { bintang, el, kerangkaMemuat, pasangKerangka, pesanGagal, pilihBintang, tautanWa, tulisCatatanKurs } from './ui.js';

pasangKerangka('/produk/');
const isi = document.getElementById('isi');
const KATEGORI = ['ebook', 'template', 'preset', 'kelas', 'lainnya'];
const SIMPAN_KONTAK = 'ixvii-kontak';
const params = new URLSearchParams(location.search);
let toko = null;

const hargaAktif = (p) => (p.promo ? p.promo.harga : p.harga);
const potong = (p) => (p.promo && p.harga > p.promo.harga ? Math.round(((p.harga - p.promo.harga) / p.harga) * 100) : 0);
const urlProduk = (slug) => `/produk/?p=${encodeURIComponent(slug)}`;
const isi2 = (...x) => x.flat().filter((n) => n != null && n !== false);

/** Hitung mundur satu baris untuk kartu: "⏱ 27h 07:29:31". */
function hitungMini(sampai) {
  const target = Date.parse(sampai);
  const teks = el('span');
  const w = el('span', { class: 'pd-hm-mini', role: 'timer', 'aria-label': t('hm.label', { tgl: tanggal(sampai) }) }, el('span', { 'aria-hidden': 'true' }, '⏱ '), teks);
  const dua = (n) => String(n).padStart(2, '0');
  let jalan, pernah = false;
  const tulis = () => {
    const sisa = Math.max(0, target - Date.now());
    const d = Math.floor(sisa / 864e5), h = Math.floor(sisa / 36e5) % 24, m = Math.floor(sisa / 6e4) % 60, dt = Math.floor(sisa / 1e3) % 60;
    teks.textContent = `${d ? `${d}${inggris() ? 'd' : 'h'} ` : ''}${dua(h)}:${dua(m)}:${dua(dt)}`;
    if (!sisa) clearInterval(jalan);
  };
  tulis();
  jalan = setInterval(() => { if (w.isConnected) pernah = true; else if (pernah) { clearInterval(jalan); return; } tulis(); }, 1000);
  return w;
}

function sampul(p, kelas = '') {
  return el('div', { class: 'pd-sampul ' + kelas },
    p.cover ? el('img', { src: p.cover, alt: '', loading: 'lazy', width: 900, height: 1200 })
      : el('span', { class: 'pd-sampul-kosong' }, p.nama));
}

function infoSosial(p) {
  const r = p.rating;
  return el('div', { class: 'pd-sosial' },
    r ? [bintang(r.rata), el('b', {}, angkaRating(r.rata)), el('span', { class: 'redup' }, t('produk.ulasanN', { n: r.n }))]
      : (p.baru || !p.terjual) ? el('span', { class: 'pd-baru' }, t('produk.baru')) : null,
    p.terjual > 0 ? el('span', { class: 'redup' }, (r ? ' · ' : '') + t('produk.terjual', { n: p.terjual.toLocaleString(inggris() ? 'en-US' : 'id-ID') })) : null);
}

function blokHarga(p, { besar = false } = {}) {
  const pct = potong(p);
  return el('div', { class: 'pd-harga' + (besar ? ' besar' : '') },
    el('b', {}, harga(hargaAktif(p))),
    pct ? el('s', {}, harga(p.harga)) : null,
    pct ? el('span', { class: 'pd-potong' }, `−${pct}%`) : null);
}

function kartu(p) {
  const mitra = p.pemilik === 'mitra';
  const pct = potong(p);
  return el('a', { class: 'pd-kartu kaca' + (mitra ? ' mitra' : ''), href: urlProduk(p.slug) },
    el('div', { class: 'pd-kartu-gambar' }, sampul(p),
      mitra ? el('span', { class: 'pd-label iklan' }, t('produk.iklan'))
        : pct ? el('span', { class: 'pd-label promo' }, p.promo.label || `−${pct}%`) : null),
    el('div', { class: 'pd-kartu-isi' },
      el('span', { class: 'pd-kat' }, t('produk.k.' + p.kategori), p.format ? ` · ${p.format.replace(/^Ebook interaktif · /i, '')}` : ''),
      el('h3', {}, p.nama),
      mitra && p.penjual ? el('span', { class: 'pd-penjual' }, t('produk.oleh', { nama: p.penjual })) : null,
      infoSosial(p),
      blokHarga(p),
      p.promo?.hitung && p.promo.sampai ? hitungMini(p.promo.sampai) : null));
}

function unggulan(p) {
  return el('section', { class: 'pd-unggulan kaca' },
    el('a', { href: urlProduk(p.slug), class: 'pd-unggulan-gambar', 'aria-label': p.nama }, sampul(p)),
    el('div', { class: 'pd-unggulan-isi' },
      el('span', { class: 'pd-kicker' }, t('produk.unggulan'), ' · ', t('produk.k.' + p.kategori)),
      el('h2', {}, p.nama),
      p.sub ? el('p', { class: 'redup' }, p.sub) : null,
      infoSosial(p),
      blokHarga(p, { besar: true }),
      p.promo?.hitung && p.promo.sampai ? el('div', { class: 'pd-hm' }, el('small', {}, t('produk.promoBerakhir')), hitungMundur(p.promo.sampai)) : null,
      el('a', { class: 'tombol', href: urlProduk(p.slug) }, t('produk.lihat'))));
}

function ajakanBawah(iklanAktif) {
  return el('section', { class: 'seksi pd-ajakan-dua' },
    el('div', { class: 'ajakan kaca' },
      el('div', {}, el('h3', {}, t('produk.rakJ')), el('p', {}, t('produk.rakT'))),
      el('a', { class: 'tombol garis', href: '/ebook/' }, t('produk.rakTombol'))),
    iklanAktif ? el('div', { class: 'ajakan kaca' },
      el('div', {}, el('h3', {}, t('produk.iklanJ')), el('p', {}, t('produk.iklanT'))),
      el('a', { class: 'tombol', href: '/produk/iklan/' }, t('produk.iklanTombol'))) : null);
}

// ---------------------------------------------------------------- daftar
async function daftar() {
  isi.replaceChildren(kerangkaMemuat(6));
  const data = await ambilProduk();
  const semua = data.produk ?? [];
  const milikKita = semua.filter((p) => p.pemilik !== 'mitra');
  const mitra = semua.filter((p) => p.pemilik === 'mitra');
  const ada = KATEGORI.filter((k) => semua.some((p) => p.kategori === k));
  let aktif = ada.includes(params.get('k')) ? params.get('k') : 'semua';

  const chips = el('div', { class: 'chips', role: 'toolbar', 'aria-label': t('iklan.kategori') });
  const grid = el('div', { class: 'grid pd-grid' });
  const gridMitra = el('div', { class: 'grid pd-grid' });
  const seksiMitra = el('section', { class: 'seksi', hidden: true },
    el('div', { class: 'seksi-kepala' }, el('div', {}, el('h2', {}, t('produk.mitraJ')), el('p', { class: 'redup', style: 'margin:4px 0 0;font-size:14px' }, t('produk.mitraT')))),
    gridMitra);
  const gambar = () => {
    chips.replaceChildren(...['semua', ...ada].map((k) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(k === aktif),
      onclick: () => { aktif = k; const u = new URL(location.href); if (k === 'semua') u.searchParams.delete('k'); else u.searchParams.set('k', k); history.replaceState(null, '', u); gambar(); } },
    k === 'semua' ? t('produk.semua') : t('produk.k.' + k),
    el('small', {}, ' ', String((k === 'semua' ? semua : semua.filter((p) => p.kategori === k)).length)))));
    const cocok = (p) => aktif === 'semua' || p.kategori === aktif;
    const kita = milikKita.filter(cocok);
    const m = mitra.filter(cocok);
    grid.replaceChildren(...(kita.length ? kita.map(kartu) : m.length ? [] : [el('p', { class: 'kosong kaca' }, t('produk.kosong'))]));
    grid.hidden = !kita.length && !!m.length;
    gridMitra.replaceChildren(...m.map(kartu));
    seksiMitra.hidden = !m.length;
  };
  gambar();
  const utama = milikKita.find((p) => p.unggulan);
  isi.replaceChildren(...isi2(
    utama ? unggulan(utama) : null,
    el('section', { class: 'seksi' }, chips, el('div', { style: 'height:16px' }), grid),
    seksiMitra,
    ajakanBawah(data.iklan)));
}

// ---------------------------------------------------------------- detail
function formPesan(p) {
  const bisa = !!(toko?.whatsapp_number && toko.orders_open);
  const kotak = el('aside', { class: 'ringkasan kaca pd-beli', 'aria-label': t('produk.pesanJ') });
  const atas = [
    el('h2', {}, t('produk.pesanJ')),
    blokHarga(p, { besar: true }),
    potong(p) ? el('div', { class: 'pd-hemat' }, t('produk.hemat', { n: harga(p.harga - p.promo.harga) }), p.promo.label ? ` · ${p.promo.label}` : '') : null,
    p.promo?.hitung && p.promo.sampai ? el('div', { class: 'pd-hm' }, el('small', {}, t('produk.promoBerakhir')), hitungMundur(p.promo.sampai, { kecil: true })) : null,
  ];
  if (p.pemilik === 'mitra' || p.kirim === 'luar') {
    kotak.append(...isi2(atas,
      p.tautan ? el('a', { class: 'tombol', href: p.tautan, target: '_blank', rel: 'sponsored noopener' }, t('produk.beliMitra')) : null,
      el('p', { class: 'catatan' }, t('produk.mitraCatatan'))));
    return kotak;
  }
  if (!bisa) {
    kotak.append(...isi2(atas, el('p', { class: 'catatan' }, t('produk.tutup')),
      toko?.whatsapp_number ? el('a', { class: 'tombol wa', href: tautanWa(toko.whatsapp_number, `${t('produk.waPesan')} ${p.nama}`), target: '_blank', rel: 'noopener' }, t('produk.tanyaAdmin')) : null));
    return kotak;
  }
  const simpan = (() => { try { return JSON.parse(localStorage.getItem(SIMPAN_KONTAK) || '{}'); } catch { return {}; } })();
  const ebook = p.kirim === 'ebook';
  const nama = el('input', { type: 'text', autocomplete: 'name', required: true, minlength: 2, maxlength: 60, value: simpan.nama || '' });
  const wa = el('input', { type: 'tel', autocomplete: 'tel', inputmode: 'tel', required: true, maxlength: 20, placeholder: t('pesan.waContoh'), value: simpan.wa || '' });
  const email = el('input', { type: 'email', autocomplete: 'email', required: ebook, maxlength: 120, value: simpan.email || '' });
  const galat = el('div', { class: 'galat', role: 'alert', hidden: true });
  const kirim = el('button', { class: 'tombol', type: 'submit' }, t('produk.pesan'));
  const form = el('form', { class: 'form-pesan' },
    el('label', {}, t('pesan.nama'), nama), el('label', {}, t('pesan.wa'), wa),
    el('label', {}, ebook ? t('produk.email') : t('produk.emailOpsional'), email),
    ebook ? el('p', { class: 'catatan', style: 'margin:0' }, t('produk.emailWajib')) : null,
    galat, kirim);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    galat.hidden = true; kirim.disabled = true; kirim.textContent = '…';
    try {
      const h = await pesanProduk({ slug: p.slug, nama: nama.value.trim(), wa: wa.value.trim(), email: email.value.trim() });
      try { localStorage.setItem(SIMPAN_KONTAK, JSON.stringify({ ...simpan, nama: nama.value.trim(), wa: wa.value.trim(), email: email.value.trim() })); } catch { /* abaikan */ }
      kotak.replaceChildren(...isi2(sukses(p, h, nama.value.trim())));
      kotak.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      galat.textContent = teksGalat(err.message); galat.hidden = false;
      kirim.disabled = false; kirim.textContent = t('produk.pesan');
    }
  });
  kotak.append(...isi2(atas, form,
    el('p', { class: 'catatan' }, t(ebook ? 'produk.alurEbook' : p.kirim === 'tautan' ? 'produk.alurTautan' : 'produk.alurManual')),
    inggris() ? el('p', { class: 'catatan' }, t('produk.indo')) : null));
  return kotak;
}

function sukses(p, h, nama) {
  const nominal = rupiah(h.total);
  const pesanWa = [t('produk.waPesan'), `- ${h.produk}: ${nominal}`, h.diskon > 0 ? `${t('wa.diskon')}: -${rupiah(h.diskon)}` : null,
    `${t('wa.kode')}: ${h.kode}`, `${t('wa.nama')}: ${nama}`, h.email ? `Email: ${h.email}` : null, '', t('wa.sudahBayar', { nominal })]
    .filter((x) => x != null).join('\n');
  const nomor = h.whatsapp || toko?.whatsapp_number;
  const qris = toko?.qris_aktif === false ? null : (h.qris || toko?.qris_url || '/assets/bayar/qris-ixvii.jpg');
  const salin = el('button', { class: 'salin-nominal', type: 'button' }, t('pesan.salin'));
  salin.addEventListener('click', async () => { try { await navigator.clipboard.writeText(String(h.total)); salin.textContent = t('pesan.disalin'); } catch { /* biarkan */ } });
  return [
    el('h2', {}, t('produk.berhasil')),
    el('div', {}, el('div', { class: 'redup', style: 'font-size:12px' }, t('pesan.kodeLabel')), el('div', { class: 'kode' }, h.kode)),
    el('p', { style: 'margin:0' }, t('produk.bayarDulu', { nominal })),
    qris ? el('div', { class: 'bayar-qris' },
      el('div', { class: 'nominal-qris' }, el('span', {}, t('pesan.bayarTepat')), el('b', {}, nominal), salin),
      el('img', { class: 'gambar-qris', src: qris, alt: t('pesan.altQris'), width: 1135, height: 1600, loading: 'lazy' }),
      el('a', { class: 'tombol garis', href: qris, download: 'QRIS-IXVII.CO.jpg' }, t('pesan.unduhQris'))) : null,
    el('a', { class: 'tombol wa', href: tautanWa(nomor, pesanWa), target: '_blank', rel: 'noopener' }, t('produk.konfirmasi')),
    h.pembayaran ? el('details', { class: 'cara-lain' }, el('summary', {}, t('pesan.caraLain')), el('pre', {}, h.pembayaran)) : null,
    el('p', { class: 'catatan' }, t(p.kirim === 'ebook' ? 'produk.alurEbook' : p.kirim === 'tautan' ? 'produk.alurTautan' : 'produk.alurManual')),
  ];
}

function bagianUlasan(p) {
  const ul = p.ulasan ?? [];
  const daftarU = ul.length ? el('div', { class: 'pd-ulasan-daftar' }, ul.map((u) => el('article', { class: 'ulasan-kartu kaca' },
    el('div', { class: 'atas' }, bintang(u.bintang),
      u.sumber === 'pembeli' ? el('span', { class: 'lencana verified' }, '✓ ', t('testi.verified')) : el('span', { class: 'lencana' }, t('produk.ulasLuar'))),
    u.teks ? el('p', {}, u.teks) : null,
    el('div', { class: 'bawah' }, el('b', {}, u.nama), el('span', { class: 'redup' }, ' · ', tanggal(u.tgl))))))
    : el('p', { class: 'redup' }, t('produk.belumUlasan'));
  if (p.pemilik === 'mitra') return el('section', { class: 'seksi' }, el('h2', {}, t('produk.ulasanJ')), daftarU);

  const kode = el('input', { type: 'text', required: true, maxlength: 20, autocomplete: 'off', style: 'text-transform:uppercase' });
  const wa = el('input', { type: 'tel', required: true, maxlength: 20, inputmode: 'tel', placeholder: t('pesan.waContoh') });
  const nama = el('input', { type: 'text', maxlength: 60 });
  const teks = el('textarea', { rows: 3, maxlength: 600 });
  const nilai = pilihBintang('pd-bintang', t('produk.ulasanJ'));
  const info = el('div', { role: 'status' });
  const tombol = el('button', { type: 'submit', class: 'tombol' }, t('produk.kirimUlasan'));
  const form = el('form', { class: 'form-pesan pd-form-ulasan' },
    el('div', { class: 'pd-dua' }, el('label', {}, t('produk.kodePesanan'), kode), el('label', {}, t('pesan.wa'), wa)),
    nilai, el('label', {}, t('produk.ulasTeks'), teks), el('label', {}, t('produk.ulasNama'), nama), info, tombol);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!nilai.nilai()) { info.replaceChildren(el('div', { class: 'galat' }, teksGalat('Pilih 1 sampai 5 bintang'))); return; }
    tombol.disabled = true;
    try {
      await ulasProduk({ slug: p.slug, kode: kode.value, wa: wa.value, bintang: nilai.nilai(), teks: teks.value, nama: nama.value });
      form.replaceChildren(el('div', { class: 'galat ok' }, t('produk.ulasanTerkirim')));
    } catch (err) { info.replaceChildren(el('div', { class: 'galat' }, teksGalat(err.message))); tombol.disabled = false; }
  });
  return el('section', { class: 'seksi' }, el('h2', {}, t('produk.ulasanJ')), daftarU,
    el('details', { class: 'pd-tulis kaca' }, el('summary', {}, t('produk.tulisUlasan')), form));
}

async function detail(slug) {
  isi.replaceChildren(kerangkaMemuat(2));
  let p;
  try { p = await ambilDetailProduk(slug); } catch (err) { isi.replaceChildren(pesanGagal(teksGalat(err.message), () => detail(slug))); return; }
  if (!p) { isi.replaceChildren(el('div', { class: 'kosong kaca' }, el('p', {}, t('produk.tidakAda')), el('a', { class: 'tombol garis', href: '/produk/' }, t('produk.kembali')))); return; }
  document.title = `${p.nama} — IXVII.CO`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', p.sub || p.nama);
  document.querySelector('.judul-halaman')?.closest('section')?.setAttribute('hidden', '');
  const daftarIsi = (p.isi || '').split('\n').map((x) => x.trim()).filter(Boolean);
  isi.replaceChildren(...isi2(
    el('a', { class: 'pd-kembali', href: '/produk/' + (p.kategori ? `?k=${p.kategori}` : '') }, t('produk.kembali')),
    el('div', { class: 'pd-detail' },
      el('div', { class: 'pd-detail-kepala' },
        el('div', { class: 'pd-detail-sampul' }, sampul(p), p.pemilik === 'mitra' ? el('span', { class: 'pd-label iklan' }, t('produk.iklan')) : null),
        el('div', {},
          el('span', { class: 'pd-kicker' }, p.format || t('produk.k.' + p.kategori)),
          el('h1', { class: 'judul-halaman' }, p.nama),
          p.sub ? el('p', { class: 'redup pd-sub' }, p.sub) : null,
          p.pemilik === 'mitra' && p.penjual ? el('p', { class: 'pd-penjual' }, t('produk.oleh', { nama: p.penjual })) : null,
          infoSosial(p))),
      el('div', { class: 'pd-detail-kanan' }, formPesan(p)),
      el('div', { class: 'pd-detail-isi' }, ...isi2(
        daftarIsi.length ? el('section', { class: 'seksi' }, el('h2', {}, t('produk.isiJ')),
          el('ul', { class: 'pd-centang' }, daftarIsi.map((x) => el('li', {}, x)))) : null,
        p.deskripsi ? el('section', { class: 'seksi pd-deskripsi' }, el('h2', {}, t('produk.tentangJ')),
          p.pemilik === 'mitra' ? el('p', { class: 'pd-teks-mitra' }, p.deskripsi) : el('div', { class: 'eb-teks' }, renderIsi(p.deskripsi))) : null,
        p.bab?.length ? el('section', { class: 'seksi' }, el('h2', {}, t('produk.babJ')),
          el('ol', { class: 'pd-bab' }, p.bab.map((b) => el('li', {}, el('span', { class: 'pd-bab-ikon' }, ikonEbook(b.ikon, 20)),
            el('div', {}, el('small', {}, /^\d+$/.test(b.label) ? `Bab ${b.label}` : b.label), el('b', {}, b.judul), b.ringkas ? el('span', {}, b.ringkas) : null))))) : null,
        bagianUlasan(p)))),
    p.lain?.length ? el('section', { class: 'seksi' }, el('h2', {}, t('produk.lainJ')), el('div', { class: 'grid pd-grid' }, p.lain.map(kartu))) : null));
}

(async () => {
  toko = await ambilToko();
  pasangKurs(toko);
  tulisCatatanKurs();
  const slug = params.get('p');
  if (slug) await detail(slug);
  else {
    try { await daftar(); } catch (err) { isi.replaceChildren(pesanGagal(teksGalat(err.message), () => location.reload())); }
  }
})();
