// Bahasa (Indonesia / English), tema (gelap / terang), dan format harga (Rupiah / dolar AS).
// Bahasa & tema dipasang lebih awal oleh skrip kecil di <head> supaya tidak berkedip.

const SIMPAN_BAHASA = 'ixvii-bahasa';
const SIMPAN_TEMA = 'ixvii-tema';

export const bahasa = () => (document.documentElement.lang === 'en' ? 'en' : 'id');
export const inggris = () => bahasa() === 'en';

export function gantiBahasa() {
  const baru = inggris() ? 'id' : 'en';
  try { localStorage.setItem(SIMPAN_BAHASA, baru); } catch { /* abaikan */ }
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  location.replace(url);  // muat ulang supaya semua teks & harga ikut berganti
}

export const temaTerang = () => document.documentElement.dataset.tema === 'terang';
export function gantiTema() {
  const baru = temaTerang() ? 'gelap' : 'terang';
  document.documentElement.dataset.tema = baru;
  try { localStorage.setItem(SIMPAN_TEMA, baru); } catch { /* abaikan */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', baru === 'terang' ? '#f6f4f4' : '#0e0e10');
  return baru;
}

// ---------------------------------------------------------------- kamus
const KAMUS = {
  id: {
    'nav.beranda': 'Beranda', 'nav.katalog': 'Katalog',
    'alat.tema.terang': 'Pakai mode terang', 'alat.tema.gelap': 'Pakai mode gelap', 'alat.bahasa': 'Switch to English',
    'kaki.hak': '© {tahun} IXVII.CO · Your App Solver', 'kaki.info': 'Harga dan stok diperbarui langsung dari katalog kami.',
    'hero.judul1': 'Langganan aplikasi premium,', 'hero.judul2': 'lebih hemat.',
    'hero.teks': 'Netflix, ChatGPT, Canva, Spotify, dan {n} aplikasi lain. Pilih paket sharing atau private, lalu cek harga dan stoknya langsung.',
    'hero.katalog': 'Lihat katalog', 'hero.kategori': 'Pilih kategori',
    'poin1.j': 'Harga jelas per paket', 'poin1.t': 'Setiap durasi dan tipe paket tampil dengan harganya masing-masing.',
    'poin2.j': 'Stok selalu terbaru', 'poin2.t': 'Label Tersedia dan Habis diambil langsung dari katalog kami.',
    'poin3.j': 'Sharing atau private', 'poin3.t': 'Pilih berbagi akun supaya lebih murah, atau akun pribadi untuk dipakai sendiri.',
    'seksi.kategori': 'Kategori', 'seksi.semuaApp': 'Semua aplikasi →', 'seksi.pilihan': 'Pilihan untukmu', 'seksi.lihatKatalog': 'Lihat katalog →',
    'seksi.faq': 'Pertanyaan umum',
    'kartu.mulai': 'mulai', 'kartu.paket': '{n} paket', 'kartu.habis': 'Stok habis',
    'katalog.judul': 'Katalog', 'katalog.sub': 'Pilih kategori atau ketik nama aplikasi.', 'katalog.cari': 'Cari Netflix, ChatGPT, Canva…',
    'katalog.semua': 'Semua', 'katalog.jumlah': '{n} aplikasi', 'katalog.kosong': 'Tidak ada aplikasi yang cocok dengan “{q}”.', 'katalog.tampilSemua': 'Tampilkan semua',
    'gagal.katalog': 'Katalog belum bisa dimuat. Periksa koneksi internet lalu coba lagi.', 'gagal.ulang': 'Coba lagi',
    'gagal.app': 'Data aplikasi belum bisa dimuat. Periksa koneksi internet lalu coba lagi.',
    'app.tidakAda': 'Aplikasi tidak ditemukan', 'app.tidakAdaSub': 'Mungkin namanya berubah atau sedang tidak dijual.', 'app.kembali': 'Kembali ke katalog',
    'app.tersedia': 'Tersedia', 'app.habis': 'Habis', 'app.pilihanmu': 'Pilihanmu', 'app.belumPilih': 'Belum ada paket dipilih.',
    'app.pesan': 'Pesan sekarang', 'app.tutup': 'Pemesanan belum dibuka. Tanyakan dulu lewat WhatsApp kami.',
    'app.lainnya': '{kat} lainnya', 'app.lihatSemua': 'Lihat semua →',
    'app.tentangTipe': 'Tentang tipe paket', 'app.kelebihan': 'Kelebihan', 'app.kekurangan': 'Kekurangan',
    'app.banding': 'Bandingkan dengan harga resmi', 'app.bandingResmi': 'Paket resmi', 'app.bandingHargaResmi': 'Harga resmi',
    'app.bandingKami': 'Di IXVII.CO', 'app.bandingHemat': 'Hemat', 'app.dicek': 'Harga resmi dicek {tgl}.',
    'app.faq': 'Tanya jawab', 'app.faqUmum': 'Pertanyaan lain soal pemesanan ada di beranda.',
    'faq.paket.q': 'Paket {app} apa saja yang tersedia?',
    'faq.paket.a': 'Tipe paket: {tipe}. Ada {n} pilihan dengan durasi {min} sampai {max}.',
    'faq.paket.a1': 'Tipe paket: {tipe}. Ada {n} pilihan.',
    'faq.murah.q': 'Berapa harga {app} yang paling murah?', 'faq.murah.a': 'Mulai {harga} untuk paket {tipe} · {varian}.',
    'faq.pilih.q': 'Pilih Sharing atau Private?',
    'faq.pilih.a': 'Sharing lebih hemat (mulai {s}) karena akunnya dipakai bersama. Private untukmu sendiri (mulai {p}). Kelebihan dan kekurangannya ada di bagian Tentang tipe paket.',
    'faq.perangkat.q': 'Apakah ada paket khusus perangkat tertentu?',
    'faq.perangkat.a': 'Ada. Paket berikut khusus perangkat tertentu: {daftar}. Pilih yang sesuai dengan perangkatmu.',
    'faq.cara.q': 'Bagaimana cara memesan {app}?',
    'faq.cara.a': 'Pilih paket di halaman ini, klik Pesan sekarang, lalu isi nama dan nomor WhatsApp. Kamu akan diarahkan ke WhatsApp kami dengan pesan berisi kode pesanan dan totalnya.',
    'durasi.hari': '{n} hari', 'durasi.bulan': '{n} bulan', 'durasi.tahun': '{n} tahun', 'durasi.lifetime': 'seumur hidup',
    'pesan.nama': 'Nama', 'pesan.wa': 'Nomor WhatsApp', 'pesan.waContoh': '0812xxxxxxx', 'pesan.kirim': 'Buat pesanan',
    'pesan.batal': 'Batal', 'pesan.proses': 'Membuat pesanan…', 'pesan.berhasil': 'Pesanan dibuat',
    'pesan.kodeLabel': 'Kode pesanan', 'pesan.lanjutWa': 'Kirim pesanan lewat WhatsApp', 'pesan.bayar': 'Cara bayar',
    'pesan.catatanWa': 'Klik tombol di atas untuk mengirim pesanan ke admin. Simpan kode pesananmu.',
    'pesan.lagi': 'Pesan paket lain',
    'wa.halo': 'Halo IXVII.CO, saya mau pesan:', 'wa.kode': 'Kode pesanan', 'wa.total': 'Total', 'wa.nama': 'Nama',
    'hero.banyak': 'puluhan', 'poin.label': 'Keunggulan',
    'judul.beranda': 'IXVII.CO — Your App Solver', 'judul.katalog': 'Katalog — IXVII.CO', 'judul.app': 'Aplikasi — IXVII.CO',
    'meta.beranda': 'Langganan aplikasi premium (streaming, AI, editing, dan lainnya) dengan harga lebih hemat. Lihat paket, harga, dan stok terbaru.',
    'meta.katalog': 'Semua aplikasi premium di IXVII.CO: streaming, AI, editing, edukasi, dan musik, lengkap dengan harga dan stok.',
    'meta.app': '{app} di IXVII.CO: {desc}',
    'katalog.cariLabel': 'Cari aplikasi', 'katalog.filter': 'Filter kategori',
    'faq.masihTanya': 'Masih ada pertanyaan?', 'faq.chatWa': 'Chat kami di WhatsApp',
    'app.remah': 'Lokasi halaman', 'app.ringkasan': 'Ringkasan pilihan', 'app.apaItu': 'Apa itu {tipe}?',
    'app.tanyaWa': 'Tanya lewat WhatsApp', 'app.pesanCatatan': 'Pembayaran dan pengiriman akun dilakukan lewat WhatsApp admin.',
    'app.rupiah': '', 'app.lihatFaqUmum': 'Lihat FAQ umum →',
    'pesan.wajib': 'Isi nama dan nomor WhatsApp dulu.', 'pesan.gagal': 'Pesanan belum bisa dibuat. Coba lagi sebentar lagi.',
    'wa.tanya': 'Halo IXVII.CO, saya mau tanya soal {app}.', 'wa.umum': 'Halo IXVII.CO, saya mau tanya.',
    'usd.catatan': '',
  },
  en: {
    'nav.beranda': 'Home', 'nav.katalog': 'Catalog',
    'alat.tema.terang': 'Use light mode', 'alat.tema.gelap': 'Use dark mode', 'alat.bahasa': 'Ganti ke Bahasa Indonesia',
    'kaki.hak': '© {tahun} IXVII.CO · Your App Solver', 'kaki.info': 'Prices and stock come straight from our catalog.',
    'hero.judul1': 'Premium app subscriptions,', 'hero.judul2': 'for less.',
    'hero.teks': 'Netflix, ChatGPT, Canva, Spotify, and {n} more apps. Pick a sharing or private plan and check prices and stock instantly.',
    'hero.katalog': 'Browse catalog', 'hero.kategori': 'Pick a category',
    'poin1.j': 'Clear pricing per plan', 'poin1.t': 'Every duration and plan type is listed with its own price.',
    'poin2.j': 'Always-current stock', 'poin2.t': 'Available and Sold out labels come straight from our catalog.',
    'poin3.j': 'Sharing or private', 'poin3.t': 'Share an account to save money, or get a personal account just for you.',
    'seksi.kategori': 'Categories', 'seksi.semuaApp': 'All apps →', 'seksi.pilihan': 'Picked for you', 'seksi.lihatKatalog': 'Browse catalog →',
    'seksi.faq': 'Frequently asked questions',
    'kartu.mulai': 'from', 'kartu.paket': '{n} plans', 'kartu.habis': 'Sold out',
    'katalog.judul': 'Catalog', 'katalog.sub': 'Pick a category or type an app name.', 'katalog.cari': 'Search Netflix, ChatGPT, Canva…',
    'katalog.semua': 'All', 'katalog.jumlah': '{n} apps', 'katalog.kosong': 'No apps match “{q}”.', 'katalog.tampilSemua': 'Show all',
    'gagal.katalog': 'The catalog could not be loaded. Check your connection and try again.', 'gagal.ulang': 'Try again',
    'gagal.app': 'This app could not be loaded. Check your connection and try again.',
    'app.tidakAda': 'App not found', 'app.tidakAdaSub': 'It may have been renamed or is no longer sold.', 'app.kembali': 'Back to catalog',
    'app.tersedia': 'Available', 'app.habis': 'Sold out', 'app.pilihanmu': 'Your pick', 'app.belumPilih': 'No plan selected yet.',
    'app.pesan': 'Order now', 'app.tutup': 'Ordering is not open yet. Ask us on WhatsApp first.',
    'app.lainnya': 'More in {kat}', 'app.lihatSemua': 'See all →',
    'app.tentangTipe': 'About the plan types', 'app.kelebihan': 'Pros', 'app.kekurangan': 'Cons',
    'app.banding': 'Compare with official prices', 'app.bandingResmi': 'Official plan', 'app.bandingHargaResmi': 'Official price',
    'app.bandingKami': 'At IXVII.CO', 'app.bandingHemat': 'Save', 'app.dicek': 'Official prices checked on {tgl}.',
    'app.faq': 'FAQ', 'app.faqUmum': 'More questions about ordering are answered on the home page.',
    'faq.paket.q': 'Which {app} plans are available?',
    'faq.paket.a': 'Plan types: {tipe}. {n} option{s} in total, lasting from {min} to {max}.',
    'faq.paket.a1': 'Plan types: {tipe}. {n} option{s} in total.',
    'faq.murah.q': 'What is the cheapest {app} plan?', 'faq.murah.a': 'From {harga} for {tipe} · {varian}.',
    'faq.pilih.q': 'Should I choose Sharing or Private?',
    'faq.pilih.a': 'Sharing is cheaper (from {s}) because the account is shared. Private is yours alone (from {p}). See the pros and cons under About the plan types.',
    'faq.perangkat.q': 'Are there plans for specific devices?',
    'faq.perangkat.a': 'Yes. These plans are for specific devices: {daftar}. Pick the one that matches your device.',
    'faq.cara.q': 'How do I order {app}?',
    'faq.cara.a': 'Pick a plan on this page, tap Order now, then enter your name and WhatsApp number. You will be taken to our WhatsApp with a message containing your order code and total.',
    'durasi.hari': '{n} day{s}', 'durasi.bulan': '{n} month{s}', 'durasi.tahun': '{n} year{s}', 'durasi.lifetime': 'lifetime',
    'pesan.nama': 'Name', 'pesan.wa': 'WhatsApp number', 'pesan.waContoh': 'with country code, e.g. 6281…', 'pesan.kirim': 'Place order',
    'pesan.batal': 'Cancel', 'pesan.proses': 'Placing order…', 'pesan.berhasil': 'Order placed',
    'pesan.kodeLabel': 'Order code', 'pesan.lanjutWa': 'Send order via WhatsApp', 'pesan.bayar': 'How to pay',
    'pesan.catatanWa': 'Tap the button above to send your order to our admin. Keep your order code.',
    'pesan.lagi': 'Order another plan',
    'wa.halo': 'Hello IXVII.CO, I would like to order:', 'wa.kode': 'Order code', 'wa.total': 'Total', 'wa.nama': 'Name',
    'hero.banyak': 'dozens', 'poin.label': 'Why IXVII.CO',
    'judul.beranda': 'IXVII.CO — Your App Solver', 'judul.katalog': 'Catalog — IXVII.CO', 'judul.app': 'App — IXVII.CO',
    'meta.beranda': 'Premium app subscriptions (streaming, AI, editing, and more) for less. See plans, prices, and live stock.',
    'meta.katalog': 'Every premium app at IXVII.CO: streaming, AI, editing, study, and music, with prices and stock.',
    'meta.app': '{app} at IXVII.CO: {desc}',
    'katalog.cariLabel': 'Search apps', 'katalog.filter': 'Filter by category',
    'faq.masihTanya': 'Still have questions?', 'faq.chatWa': 'Chat with us on WhatsApp',
    'app.remah': 'Breadcrumb', 'app.ringkasan': 'Your selection', 'app.apaItu': 'What is {tipe}?',
    'app.tanyaWa': 'Ask on WhatsApp', 'app.pesanCatatan': 'Payment and account delivery happen over WhatsApp with our admin.',
    'app.rupiah': '{rp} in Indonesian rupiah', 'app.lihatFaqUmum': 'See general FAQ →',
    'pesan.wajib': 'Please enter your name and WhatsApp number.', 'pesan.gagal': 'Your order could not be placed. Please try again shortly.',
    'wa.tanya': 'Hello IXVII.CO, I have a question about {app}.', 'wa.umum': 'Hello IXVII.CO, I have a question.',
    'usd.catatan': 'Prices in US dollars are estimates at 1 USD = {kurs} ({tgl}).',
  },
};

export function t(kunci, v = {}) {
  const teks = KAMUS[bahasa()][kunci] ?? KAMUS.id[kunci] ?? kunci;
  return teks.replace(/\{(\w+)\}/g, (_, n) => (v[n] ?? ''));
}

// ---------------------------------------------------------------- harga
let kurs = null;            // rupiah per 1 USD
let kursTanggal = null;
export function pasangKurs(toko) {
  kurs = toko?.usd_rate ? Number(toko.usd_rate) : null;
  kursTanggal = toko?.usd_rate_at || null;
}
export const pakaiUsd = () => inggris() && kurs > 0;
export const rupiah = (n) => (n == null ? '–' : 'Rp' + Number(n).toLocaleString(inggris() ? 'en-US' : 'id-ID'));
export const formatUsd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
export const usd = (n) => (n == null || !kurs ? null : formatUsd(Math.ceil((n / kurs) * 100) / 100));
/** Harga utama: dolar AS di mode Inggris (kalau kurs ada), selain itu Rupiah. */
export const harga = (n) => (pakaiUsd() ? usd(n) : rupiah(n));
export function catatanKurs() {
  if (!pakaiUsd()) return '';
  const tgl = kursTanggal ? new Date(kursTanggal).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return t('usd.catatan', { kurs: rupiah(Math.round(kurs)), tgl });
}
export const tanggal = (d) => new Date(d).toLocaleDateString(inggris() ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

// ---------------------------------------------------------------- teks data
/** Label varian ke bahasa Inggris: "3 Hari" → "3 Days", "1Bulan" → "1 Month", "1 Tahun Priv" → "1 Year Private". */
export function labelVarian(d) {
  if (!inggris() || !d) return d;
  const jamak = (n, kata) => `${n} ${kata}${String(n).replace(',', '.') === '1' ? '' : 's'}`;
  return String(d)
    .replace(/(\d+(?:[.,]\d+)?)\s*Hari\b/gi, (_, n) => jamak(n, 'Day'))
    .replace(/(\d+(?:[.,]\d+)?)\s*Bulan/gi, (_, n) => jamak(n, 'Month'))
    .replace(/(\d+)B\b/g, (_, n) => jamak(n, 'Month'))
    .replace(/\((\d+½?)\s*Tahun\)/gi, '($1 Years)')
    .replace(/(\d+(?:[.,]\d+)?)\s*Tahun\b/gi, (_, n) => jamak(n, 'Year'))
    .replace(/\bPriv(at)?\b/gi, 'Private').replace(/\bPrem\b/g, 'Premium').replace(/\bAndro\b/gi, 'Android')
    .replace(/\bAll Dev\b/gi, 'All Devices').replace(/\bAkun Seller\b/gi, 'Seller Account');
}
/** Nama tipe paket ke bahasa Inggris. */
export function labelTipe(l) {
  if (!inggris() || !l) return l;
  return String(l).replace(/\bPrivat\b/g, 'Private').replace(/\bStandar\b/g, 'Standard').replace(/\bAkun Seller\b/g, 'Seller Account')
    .replace(/\bBulanan\b/g, 'Monthly').replace(/\bAndro\b/g, 'Android').replace(/\bPrem\b/g, 'Premium').replace(/\(5 Profile\)/, '(5 Profiles)');
}
/** Durasi dalam hari → teks ("30" → "1 bulan" / "1 month"). */
export function teksDurasi(h) {
  if (h == null) return t('durasi.lifetime');
  const s = (n) => (n === 1 ? '' : 's');
  if (h % 365 === 0) return t('durasi.tahun', { n: h / 365, s: s(h / 365) });
  if (h % 30 === 0) return t('durasi.bulan', { n: h / 30, s: s(h / 30) });
  return t('durasi.hari', { n: h, s: s(h) });
}

/** Pesan galat dari database ke bahasa Inggris. */
export function teksGalat(pesan) {
  if (!inggris()) return pesan;
  const peta = [
    [/Pemesanan belum dibuka/, 'Ordering is not open yet.'],
    [/Nama harus/, 'Name must be 2 to 60 characters.'],
    [/Nomor WhatsApp tidak valid/, 'Please enter a valid WhatsApp number with country code.'],
    [/Terlalu banyak pesanan/, 'Too many orders from this number. Please try again in 10 minutes or contact us on WhatsApp.'],
    [/Sedang banyak pesanan/, 'We are receiving a lot of orders right now. Please try again in a few minutes or contact us on WhatsApp.'],
    [/sedang habis/, 'This plan has just sold out. Please pick another one.'],
    [/tidak tersedia/, 'This plan is no longer available.'],
    [/Pilih 1 sampai 10/, 'Please pick a plan first.'],
  ];
  return peta.find(([re]) => re.test(pesan))?.[1] ?? t('pesan.gagal');
}
