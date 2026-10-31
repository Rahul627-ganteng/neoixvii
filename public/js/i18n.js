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
    'app.tersedia': 'Tersedia', 'app.habis': 'Habis', 'app.sisa': 'Sisa {n}', 'app.stokDicek': 'Stok dicek otomatis {waktu}', 'app.stokDiubah': 'Stok diperbarui {waktu}',
    'app.ratingSingkat': '{rata} · {n} ulasan', 'app.pilihanmu': 'Pilihanmu', 'app.belumPilih': 'Belum ada paket dipilih.',
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
    'nav.promo': 'Promo', 'nav.rakit': 'Rakit',
    'judul.promo': 'Promo & bundle — IXVII.CO', 'judul.rakit': 'Rakit bundle — IXVII.CO',
    'meta.promo': 'Promo dan bundle hemat langganan aplikasi premium di IXVII.CO.',
    'meta.rakit': 'Rakit bundle langganan aplikasi premium sendiri. Makin banyak aplikasinya, makin besar diskonnya.',
    'seksi.promo': 'Promo & bundle', 'beranda.promoT': '{n} promo dan bundle sedang berjalan.', 'beranda.promoTombol': 'Lihat promo',
    'promo.judul': 'Promo & bundle', 'promo.sub': 'Paket hemat pilihan kami. Bundle otomatis hilang kalau salah satu paketnya habis.',
    'promo.promo': 'Promo berjalan', 'promo.bundle': 'Bundle hemat', 'promo.sampai': 'Berlaku sampai {tgl}', 'promo.lihat': 'Lihat →',
    'promo.pilih': 'Pilih bundle', 'promo.dipilih': 'Dipilih ✓', 'promo.hemat': 'Hemat {n}', 'promo.kosong': 'Belum ada promo atau bundle saat ini.',
    'promo.rakitJ': 'Mau pilih sendiri?', 'promo.rakitT': 'Rakit bundle dari aplikasi mana pun. Hemat hingga {pct} untuk {n} aplikasi atau lebih.',
    'promo.rakitTombol': 'Rakit bundle', 'promo.bundlemu': 'Bundle pilihanmu', 'promo.belumPilih': 'Belum ada bundle dipilih.',
    'rakit.judul': 'Rakit bundle sendiri', 'rakit.sub': 'Pilih satu paket dari beberapa aplikasi. Makin banyak aplikasinya, makin besar diskonnya.',
    'rakit.tingkat': '{n} aplikasi', 'rakit.tingkatPlus': '{n}+ aplikasi', 'rakit.hingga': 'hemat hingga {pct}',
    'rakit.cari': 'Cari aplikasi…', 'rakit.cariLabel': 'Cari aplikasi untuk dirakit', 'rakit.hapusPilihan': 'Hapus dari rakitan',
    'rakit.rakitanmu': 'Rakitanmu', 'rakit.kosong': 'Belum ada paket. Pilih paket dari daftar aplikasi.',
    'rakit.lagi': 'Tambah {n} aplikasi lagi untuk hemat hingga {pct}.', 'rakit.maks': 'Kamu sudah dapat diskon tertinggi.',
    'rakit.belumAturan': 'Diskon rakitan belum diatur, jadi harganya dijumlahkan biasa.', 'rakit.hapus': 'Hapus {app}',
    'rakit.maks10': 'Maksimal 10 aplikasi dalam satu rakitan.', 'rakit.ajak': 'Rakit dengan aplikasi lain, hemat hingga {pct} →',
    'rakit.bar': '{n} aplikasi · {total}', 'rakit.lihat': 'Lihat rakitan',
    'rakit.bonusJudul': 'Bonus durasi panjang:', 'rakit.durasiMin': 'mulai {d}', 'rakit.bonusLencana': 'bonus +{pct}',
    'rakit.catatanDiskon': 'Diskon dihitung otomatis per paket (jumlah aplikasi + bonus durasi), bisa berbeda tiap paket, dan dibulatkan ke bawah.', 'rakit.tidakAda': 'Tidak ada aplikasi yang cocok.',
    'pesan.hemat': 'Hemat {n}',
    'wa.rakit': 'Rakit bundle sendiri', 'wa.bundle': 'Bundle', 'wa.subtotal': 'Subtotal', 'wa.diskon': 'Diskon bundle',
    'kaki.ulasan': 'Ulasan pembeli', 'seksi.ulasan': 'Kata pembeli',
    'judul.testimoni': 'Ulasan pembeli — IXVII.CO', 'judul.ulasan': 'Tulis ulasan — IXVII.CO',
    'meta.testimoni': 'Ulasan asli dari pembeli langganan aplikasi premium di IXVII.CO, lengkap dengan bulan pembeliannya.',
    'testi.judul': 'Ulasan pembeli', 'testi.sub': 'Semua ulasan di sini ditulis pembeli sungguhan lewat link khusus setelah pesanannya aktif.',
    'testi.verified': 'Verified Purchase', 'testi.dibeli': 'dibeli {bulan}', 'testi.semua': 'Semua',
    'testi.kosong': 'Belum ada ulasan. Halaman ini hanya berisi ulasan dari pembeli sungguhan.',
    'testi.kosongApp': 'Belum ada ulasan untuk aplikasi ini.',
    'testi.rata': '{rata} dari 5 · {n} ulasan', 'testi.lihat': 'Lihat semua ulasan →', 'testi.bintang': '{n} dari 5 bintang',
    'app.ulasan': 'Ulasan pembeli',
    'ulasan.judul': 'Tulis ulasan', 'ulasan.halo': 'Halo {nama}, terima kasih sudah berlangganan di IXVII.CO. Bagaimana pengalamanmu?',
    'ulasan.dibeli': 'Pesanan tanggal {tgl}', 'ulasan.nilai': 'Nilai untuk {app}', 'ulasan.bintang': '{n} bintang',
    'ulasan.isi': 'Ceritakan pengalamanmu (opsional)', 'ulasan.anonim': 'Jangan tampilkan namaku',
    'ulasan.namaTampil': 'Namamu tampil sebagai “{nama}”. Nomor WhatsApp tidak pernah ditampilkan.',
    'ulasan.kirim': 'Kirim ulasan', 'ulasan.mengirim': 'Mengirim…', 'ulasan.minimal': 'Beri bintang untuk minimal satu aplikasi.',
    'ulasan.terima': 'Terima kasih! Ulasanmu sudah kami terima dan akan tampil setelah dicek admin.',
    'ulasan.tidakValid': 'Link ulasan ini tidak valid, sudah dipakai, atau sudah kedaluwarsa. Ulasan hanya bisa ditulis lewat link dari admin setelah pembelian.',
    'ulasan.keTestimoni': 'Lihat ulasan pembeli lain',
    'kaki.tentang': 'Tentang', 'kaki.mitra': 'Mitra resmi',
    'judul.tentang': 'Tentang — IXVII.CO', 'judul.mitra': 'Mitra resmi — IXVII.CO',
    'meta.tentang': 'Kenali Rahul Paris, founder IXVII.CO: toko langganan aplikasi premium yang cepat, bergaransi, dan dilayani langsung.',
    'meta.mitra': 'Daftar reseller dan affiliator resmi IXVII.CO. Cek nama atau kode referral sebelum membeli.',
    'tentang.label': 'Founder IXVII.CO', 'tentang.fokus': 'Fokus', 'tentang.luar': 'Di luar kerja',
    'tentang.chat': 'Chat lewat WhatsApp', 'tentang.mitra': 'Lihat mitra resmi', 'tentang.waPesan': 'Halo Kak Rahul, saya mau tanya soal IXVII.CO.',
    'tentang.kosong': 'Profil belum tersedia.',
    'mitra.judul': 'Mitra resmi', 'mitra.sub': 'Reseller dan affiliator yang terdaftar di IXVII.CO. Cek dulu sebelum membeli lewat pihak lain.',
    'mitra.cari': 'Cek nama atau kode referral…', 'mitra.cariLabel': 'Cek mitra', 'mitra.semua': 'Semua', 'mitra.reseller': 'Reseller', 'mitra.affiliator': 'Affiliator',
    'mitra.semuaKota': 'Semua kota', 'mitra.kotaLabel': 'Saring kota',
    'mitra.terdaftar': '{nama} terdaftar sebagai mitra resmi IXVII.CO.',
    'mitra.tidakTerdaftar': '“{q}” tidak terdaftar sebagai mitra resmi IXVII.CO. Pastikan kamu membeli lewat mitra di daftar ini atau langsung ke admin.',
    'mitra.verified': 'Terverifikasi', 'mitra.kode': 'Kode', 'mitra.sejak': 'Mitra sejak {bulan}',
    'mitra.kosong': 'Daftar mitra resmi sedang disiapkan.', 'mitra.tidakAda': 'Tidak ada mitra yang cocok.', 'mitra.jumlah': '{n} mitra',
    'mitra.gabungJ': 'Ingin jadi mitra?', 'mitra.gabungT': 'Jadi reseller atau affiliator IXVII.CO dan dapatkan bimbingan langsung dari admin.',
    'mitra.gabungTombol': 'Daftar lewat WhatsApp', 'mitra.gabungWa': 'Halo IXVII.CO, saya tertarik jadi reseller/affiliator.',
    'nav.film': 'Film', 'kaki.film': 'Info film',
    'judul.film': 'Info film & serial — IXVII.CO',
    'meta.film': 'Film dan serial baru di Netflix, Disney+, Viu, dan platform lain. Langganan sekalian di IXVII.CO.',
    'film.judul': 'Info film & serial', 'film.sub': 'Judul baru di platform yang kami jual, dirangkum oleh tim IXVII.CO.',
    'film.sedang': 'Sedang tayang', 'film.akan': 'Akan tayang', 'film.semuaPlatform': 'Semua platform',
    'film.film': 'Film', 'film.serial': 'Serial', 'film.tayang': 'Tayang {tgl}', 'film.sejak': 'Tayang sejak {tgl}', 'film.sampai': 'sampai {tgl}',
    'film.hariIni': 'Tayang hari ini', 'film.hariLagi': '{n} hari lagi', 'film.besok': 'Besok',
    'film.langganan': 'Langganan {app}', 'film.mulai': 'mulai {harga}', 'film.trailer': 'Trailer ↗',
    'film.kosong': 'Belum ada info film di sini.', 'film.seksi': 'Baru tayang', 'film.lihat': 'Lihat semua →',
    'film.diApp': 'Tayang di {app}', 'film.baca': 'Baca selengkapnya', 'film.tutup': 'Tutup',
    'judul.garansi': 'Aktivasi garansi — IXVII.CO',
    'garansi.judul': 'Aktivasi garansi', 'garansi.halo': 'Halo {nama}! Isi form ini setelah berhasil login, supaya masa garansi resmi berjalan dan nomormu masuk daftar pengingat sebelum akun berakhir.',
    'garansi.pesanan': 'Pesananmu', 'garansi.dibeli': 'Dibeli {tgl}', 'garansi.berakhir': 'Berakhir {tgl}',
    'garansi.batas': 'Kirim sebelum {waktu}', 'garansi.lewat': 'Batas 1x24 jam sudah lewat, jadi garansi belum aktif. Form tetap bisa dikirim dan admin akan meninjaunya.',
    'garansi.nama': 'Nama', 'garansi.hp': 'No. HP aktif (WhatsApp)', 'garansi.hpContoh': '0812xxxxxxx', 'garansi.device': 'Device yang dipakai',
    'garansi.deviceContoh': 'mis. iPhone 13, Smart TV Samsung', 'garansi.ss': 'Screenshot bukti sudah berhasil login', 'garansi.ssPilih': 'Pilih screenshot',
    'garansi.ssGanti': 'Ganti screenshot', 'garansi.ulasanJudul': 'Rating & ulasan (opsional)', 'garansi.ulasanSub': 'Ulasanmu tampil di halaman Ulasan pembeli setelah dicek admin.',
    'garansi.kirim': 'Aktifkan garansi', 'garansi.mengunggah': 'Mengunggah screenshot…', 'garansi.mengirim': 'Mengirim…',
    'garansi.wajib': 'Isi nama, nomor HP, device, dan unggah screenshot login dulu.', 'garansi.bukanGambar': 'File harus berupa gambar (JPG, PNG, atau WebP).',
    'garansi.aktif': 'Garansi aktif ✓ Terima kasih! Data kamu sudah tercatat dan kami akan mengingatkan sebelum akun berakhir.',
    'garansi.ditinjau': 'Terima kasih, data kamu sudah terkirim. Karena lewat 1x24 jam, garansi belum aktif; admin akan meninjau dan menghubungimu.',
    'garansi.masa': 'Masa aktif berakhir {tgl}',
    'garansi.terimaUlasan': 'Ulasanmu juga sudah kami terima.',
    'garansi.tidakValid': 'Link aktivasi garansi ini tidak valid, sudah dipakai, atau sudah kedaluwarsa. Hubungi admin lewat WhatsApp kalau butuh link baru.',
    'garansi.chat': 'Chat admin',
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
    'app.tersedia': 'Available', 'app.habis': 'Sold out', 'app.sisa': 'Only {n} left', 'app.stokDicek': 'Stock checked automatically {waktu}', 'app.stokDiubah': 'Stock updated {waktu}',
    'app.ratingSingkat': '{rata} · {n} review{s}', 'app.pilihanmu': 'Your pick', 'app.belumPilih': 'No plan selected yet.',
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
    'nav.promo': 'Deals', 'nav.rakit': 'Build',
    'judul.promo': 'Deals & bundles — IXVII.CO', 'judul.rakit': 'Bundle builder — IXVII.CO',
    'meta.promo': 'Deals and money-saving bundles for premium app subscriptions at IXVII.CO.',
    'meta.rakit': 'Build your own bundle of premium app subscriptions. The more apps, the bigger the discount.',
    'seksi.promo': 'Deals & bundles', 'beranda.promoT': '{n} deals and bundles running now.', 'beranda.promoTombol': 'See deals',
    'promo.judul': 'Deals & bundles', 'promo.sub': 'Our money-saving picks. A bundle disappears automatically when one of its plans sells out.',
    'promo.promo': 'Current deals', 'promo.bundle': 'Bundles', 'promo.sampai': 'Ends {tgl}', 'promo.lihat': 'View →',
    'promo.pilih': 'Choose bundle', 'promo.dipilih': 'Selected ✓', 'promo.hemat': 'Save {n}', 'promo.kosong': 'No deals or bundles right now.',
    'promo.rakitJ': 'Want to pick your own?', 'promo.rakitT': 'Build a bundle from any apps. Save up to {pct} on {n} or more apps.',
    'promo.rakitTombol': 'Build a bundle', 'promo.bundlemu': 'Your bundle', 'promo.belumPilih': 'No bundle selected yet.',
    'rakit.judul': 'Build your own bundle', 'rakit.sub': 'Pick one plan from each of several apps. The more apps, the bigger the discount.',
    'rakit.tingkat': '{n} apps', 'rakit.tingkatPlus': '{n}+ apps', 'rakit.hingga': 'save up to {pct}',
    'rakit.cari': 'Search apps…', 'rakit.cariLabel': 'Search apps to add', 'rakit.hapusPilihan': 'Remove from bundle',
    'rakit.rakitanmu': 'Your bundle', 'rakit.kosong': 'No plans yet. Pick plans from the app list.',
    'rakit.lagi': 'Add {n} more app{s} to save up to {pct}.', 'rakit.maks': "You've unlocked the top discount.",
    'rakit.belumAturan': 'Bundle discounts are not set up yet, so prices are simply added up.', 'rakit.hapus': 'Remove {app}',
    'rakit.maks10': 'Up to 10 apps per bundle.', 'rakit.ajak': 'Bundle it with other apps and save up to {pct} →',
    'rakit.bar': '{n} app{s} · {total}', 'rakit.lihat': 'View bundle',
    'rakit.bonusJudul': 'Longer-plan bonus:', 'rakit.durasiMin': '{d}+', 'rakit.bonusLencana': '+{pct} bonus',
    'rakit.catatanDiskon': 'Discounts are worked out per plan (number of apps + duration bonus), can differ between plans, and are rounded down.', 'rakit.tidakAda': 'No matching apps.',
    'pesan.hemat': 'You save {n}',
    'wa.rakit': 'Custom bundle', 'wa.bundle': 'Bundle', 'wa.subtotal': 'Subtotal', 'wa.diskon': 'Bundle discount',
    'kaki.ulasan': 'Customer reviews', 'seksi.ulasan': 'What buyers say',
    'judul.testimoni': 'Customer reviews — IXVII.CO', 'judul.ulasan': 'Write a review — IXVII.CO',
    'meta.testimoni': 'Genuine reviews from IXVII.CO buyers of premium app subscriptions, with the month they purchased.',
    'testi.judul': 'Customer reviews', 'testi.sub': 'Every review here comes from a real buyer, through a private link sent after their order went live.',
    'testi.verified': 'Verified Purchase', 'testi.dibeli': 'purchased {bulan}', 'testi.semua': 'All',
    'testi.kosong': 'No reviews yet. This page only shows reviews from real buyers.',
    'testi.kosongApp': 'No reviews for this app yet.',
    'testi.rata': '{rata} out of 5 · {n} review{s}', 'testi.lihat': 'See all reviews →', 'testi.bintang': '{n} out of 5 stars',
    'app.ulasan': 'Customer reviews',
    'ulasan.judul': 'Write a review', 'ulasan.halo': 'Hi {nama}, thanks for subscribing at IXVII.CO. How was your experience?',
    'ulasan.dibeli': 'Order from {tgl}', 'ulasan.nilai': 'Rating for {app}', 'ulasan.bintang': '{n} star{s}',
    'ulasan.isi': 'Tell us about it (optional)', 'ulasan.anonim': "Don't show my name",
    'ulasan.namaTampil': 'Your name will appear as “{nama}”. Your WhatsApp number is never shown.',
    'ulasan.kirim': 'Submit review', 'ulasan.mengirim': 'Submitting…', 'ulasan.minimal': 'Please rate at least one app.',
    'ulasan.terima': 'Thank you! We received your review. It will appear after a quick check by our admin.',
    'ulasan.tidakValid': 'This review link is invalid, already used, or expired. Reviews can only be written through the link our admin sends after a purchase.',
    'ulasan.keTestimoni': 'See other reviews',
    'kaki.tentang': 'About', 'kaki.mitra': 'Official partners',
    'judul.tentang': 'About — IXVII.CO', 'judul.mitra': 'Official partners — IXVII.CO',
    'meta.tentang': 'Meet Rahul Paris, founder of IXVII.CO: premium app subscriptions that are fast, guaranteed, and personally handled.',
    'meta.mitra': 'Official IXVII.CO resellers and affiliates. Check a name or referral code before you buy.',
    'tentang.label': 'Founder of IXVII.CO', 'tentang.fokus': 'Focus', 'tentang.luar': 'Off the clock',
    'tentang.chat': 'Chat on WhatsApp', 'tentang.mitra': 'See official partners', 'tentang.waPesan': 'Hi Rahul, I have a question about IXVII.CO.',
    'tentang.kosong': 'Profile not available yet.',
    'mitra.judul': 'Official partners', 'mitra.sub': 'Resellers and affiliates registered with IXVII.CO. Check here before buying through someone else.',
    'mitra.cari': 'Check a name or referral code…', 'mitra.cariLabel': 'Check a partner', 'mitra.semua': 'All', 'mitra.reseller': 'Reseller', 'mitra.affiliator': 'Affiliate',
    'mitra.semuaKota': 'All cities', 'mitra.kotaLabel': 'Filter by city',
    'mitra.terdaftar': '{nama} is a registered IXVII.CO partner.',
    'mitra.tidakTerdaftar': '“{q}” is not a registered IXVII.CO partner. Make sure you buy through a partner on this list or directly from our admin.',
    'mitra.verified': 'Verified', 'mitra.kode': 'Code', 'mitra.sejak': 'Partner since {bulan}',
    'mitra.kosong': 'Our list of official partners is coming soon.', 'mitra.tidakAda': 'No matching partners.', 'mitra.jumlah': '{n} partner{s}',
    'mitra.gabungJ': 'Want to become a partner?', 'mitra.gabungT': 'Become an IXVII.CO reseller or affiliate and get guidance straight from our admin.',
    'mitra.gabungTombol': 'Apply on WhatsApp', 'mitra.gabungWa': 'Hello IXVII.CO, I am interested in becoming a reseller/affiliate.',
    'nav.film': 'Shows', 'kaki.film': 'New releases',
    'judul.film': 'New films & series — IXVII.CO',
    'meta.film': 'New films and series on Netflix, Disney+, Viu and more. Subscribe at IXVII.CO.',
    'film.judul': 'New films & series', 'film.sub': 'New titles on the platforms we sell, summed up by the IXVII.CO team.',
    'film.sedang': 'Now streaming', 'film.akan': 'Coming soon', 'film.semuaPlatform': 'All platforms',
    'film.film': 'Film', 'film.serial': 'Series', 'film.tayang': 'Releases {tgl}', 'film.sejak': 'Streaming since {tgl}', 'film.sampai': 'until {tgl}',
    'film.hariIni': 'Out today', 'film.hariLagi': 'in {n} day{s}', 'film.besok': 'Tomorrow',
    'film.langganan': 'Get {app}', 'film.mulai': 'from {harga}', 'film.trailer': 'Trailer ↗',
    'film.kosong': 'No titles here yet.', 'film.seksi': 'New releases', 'film.lihat': 'See all →',
    'film.diApp': 'Streaming on {app}', 'film.baca': 'Read more', 'film.tutup': 'Show less',
    'judul.garansi': 'Warranty activation — IXVII.CO',
    'garansi.judul': 'Warranty activation', 'garansi.halo': 'Hi {nama}! Fill in this form after you have logged in, so your warranty officially starts and we can remind you before your account expires.',
    'garansi.pesanan': 'Your order', 'garansi.dibeli': 'Purchased {tgl}', 'garansi.berakhir': 'Expires {tgl}',
    'garansi.batas': 'Send before {waktu}', 'garansi.lewat': 'The 24-hour window has passed, so the warranty is not active yet. You can still send the form and our admin will review it.',
    'garansi.nama': 'Name', 'garansi.hp': 'Active phone number (WhatsApp)', 'garansi.hpContoh': 'with country code, e.g. 6281…', 'garansi.device': 'Device you use',
    'garansi.deviceContoh': 'e.g. iPhone 13, Samsung Smart TV', 'garansi.ss': 'Screenshot showing you are logged in', 'garansi.ssPilih': 'Choose screenshot',
    'garansi.ssGanti': 'Change screenshot', 'garansi.ulasanJudul': 'Rating & review (optional)', 'garansi.ulasanSub': 'Your review appears on the Customer reviews page after a quick check.',
    'garansi.kirim': 'Activate warranty', 'garansi.mengunggah': 'Uploading screenshot…', 'garansi.mengirim': 'Submitting…',
    'garansi.wajib': 'Please fill in your name, phone number, device, and upload a login screenshot.', 'garansi.bukanGambar': 'The file must be an image (JPG, PNG, or WebP).',
    'garansi.aktif': 'Warranty active ✓ Thank you! Your details are saved and we will remind you before your account expires.',
    'garansi.ditinjau': 'Thank you, your details were sent. Since the 24-hour window has passed, your warranty is not active yet; our admin will review it and contact you.',
    'garansi.masa': 'Active period ends {tgl}',
    'garansi.terimaUlasan': 'We received your review too.',
    'garansi.tidakValid': 'This warranty link is invalid, already used, or expired. Contact our admin on WhatsApp if you need a new link.',
    'garansi.chat': 'Chat with admin',
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
/** 0.05 → "5%" */
export const persen = (p) => `${(Math.round(Number(p) * 1000) / 10).toLocaleString(inggris() ? 'en-US' : 'id-ID')}%`;
/** "2026-10" → "Oktober 2026" / "October 2026" */
export const bulanTahun = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString(inggris() ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' });
export const tanggal = (d) => new Date(d).toLocaleDateString(inggris() ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
/** "3 jam lalu", "kemarin", "2 hari lalu" */
export function relatif(iso) {
  const detik = (Date.parse(iso) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(inggris() ? 'en' : 'id', { numeric: 'auto' });
  const abs = Math.abs(detik);
  if (abs < 60) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(detik / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(detik / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(detik / 86400), 'day');
  return tanggal(iso);
}
/** Angka rating 4,9 / 4.9 */
export const angkaRating = (x) => Number(x).toLocaleString(inggris() ? 'en-US' : 'id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** "27–30 November 2026" (rentang tanggal; satu tanggal kalau sama). */
export function rentangTanggal(a, b) {
  if (!a || a === b) return tanggal(b);
  try {
    return new Intl.DateTimeFormat(inggris() ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).formatRange(new Date(a), new Date(b));
  } catch { return `${tanggal(a)} – ${tanggal(b)}`; }
}

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
    [/Pilih 1 sampai 10/, 'Please pick a plan first.'],
    [/satu paket untuk setiap aplikasi/, 'Pick one plan per app.'],
    [/Bundle ini sedang tidak tersedia/, 'This bundle is not available right now.'],
    [/Maksimal 10 paket/, 'Up to 10 plans per bundle.'],
    [/sudah tidak tersedia/, 'One of the plans is no longer available. Please reload the page.'],
    [/Pilih paket dulu/, 'Please pick a plan first.'],
    [/Link ulasan tidak valid/, t('ulasan.tidakValid')],
    [/Link garansi tidak valid/, t('garansi.tidakValid')],
    [/Nama harus 2 sampai 80/, 'Name must be 2 to 80 characters.'],
    [/Nomor HP tidak valid/, 'Please enter a valid phone number.'],
    [/Tulis device/, 'Please tell us which device you use.'],
    [/Unggah screenshot/, 'Please upload a screenshot showing you are logged in.'],
    [/Nilai harus 1 sampai 5/, 'Please choose 1 to 5 stars.'],
    [/Ulasan maksimal 600/, 'Reviews can be up to 600 characters.'],
    [/Beri nilai minimal/, 'Please rate at least one app.'],
    [/tidak tersedia/, 'This plan is no longer available.'],
  ];
  return peta.find(([re]) => re.test(pesan))?.[1] ?? t('pesan.gagal');
}
