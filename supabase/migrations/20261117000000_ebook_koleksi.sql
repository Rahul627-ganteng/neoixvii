-- =====================================================================
-- IXVII.CO — Koleksi 10 ebook interaktif untuk halaman Produk Digital
-- Jalankan SETELAH 20261116000000_produk_digital.sql.
-- Aman dijalankan ulang: hanya menambah buku, bab, dan produk yang belum ada
-- (bab/produk yang sudah kamu edit di panel tidak ditimpa).
-- Semua produk mulai tanpa ulasan dan tanpa angka terjual (tampil "Produk baru").
-- =====================================================================

insert into public.ebook_buku (slug, judul, subjudul, label, warna, sampul_url, minta_akses, tampil, urut)
values
  ('personal-branding-dari-nol', 'Personal Branding dari Nol', 'Bikin orang ingat, percaya, lalu mencarimu. Cukup mulai dari HP.', 'Ebook interaktif · Personal branding', '#7a1f5c', '/assets/produk/personal-branding-dari-nol.jpg', false, true, 1),
  ('freelance-pertama-30-hari', 'Freelance Pertama', 'Rencana 30 hari dari memilih jasa, portofolio, tarif, sampai invoice pertama.', 'Ebook interaktif · Freelance', '#0f5c4d', '/assets/produk/freelance-pertama-30-hari.jpg', false, true, 2),
  ('canva-konten-menjual', 'Canva untuk Konten yang Menjual', 'Desain feed, story, dan poster promo yang rapi walau kamu bukan desainer.', 'Ebook interaktif · Desain', '#5b2bd6', '/assets/produk/canva-konten-menjual.jpg', false, true, 3),
  ('capcut-reels-kilat', 'CapCut Reels Kilat', 'Edit video pendek yang ditonton sampai habis, cukup dari HP.', 'Ebook interaktif · Editing video', '#1a1a1a', '/assets/produk/capcut-reels-kilat.jpg', false, true, 4),
  ('foto-estetik-lightroom', 'Foto Estetik dengan Lightroom HP', 'Edit foto produk dan feed yang konsisten, plus cara membuat preset sendiri.', 'Ebook interaktif · Editing foto', '#a24a17', '/assets/produk/foto-estetik-lightroom.jpg', false, true, 5),
  ('copywriting-jualan-closing', 'Copywriting Jualan yang Bikin Closing', 'Rumus caption, chat, dan penawaran yang membuat orang yakin membeli, tanpa memaksa.', 'Ebook interaktif · Copywriting', '#9c1239', '/assets/produk/copywriting-jualan-closing.jpg', false, true, 6),
  ('ai-kerja-cepat', 'AI Kerja Cepat', 'Prompt siap pakai untuk konten, jualan, dan kerjaan harian dengan ChatGPT, Claude, atau Gemini.', 'Ebook interaktif · AI & produktivitas', '#1f3a93', '/assets/produk/ai-kerja-cepat.jpg', false, true, 7),
  ('kalender-konten-30-hari', 'Kalender Konten 30 Hari', 'Ide konten sebulan penuh untuk jualan online. Tinggal sesuaikan dan centang.', 'Ebook interaktif · Strategi konten', '#2f6f3a', '/assets/produk/kalender-konten-30-hari.jpg', false, true, 8),
  ('jualan-produk-digital', 'Jualan Produk Digital Pertamamu', 'Dari ide, membuat, menentukan harga, sampai terjual. Tanpa stok barang.', 'Ebook interaktif · Bisnis digital', '#c2410c', '/assets/produk/jualan-produk-digital.jpg', false, true, 9),
  ('affiliate-pemula', 'Affiliate TikTok & Shopee untuk Pemula', 'Pilih produk, bikin konten review yang jujur, dan hitung potensi komisimu.', 'Ebook interaktif · Affiliate', '#d9480f', '/assets/produk/affiliate-pemula.jpg', false, true, 10)
on conflict (slug) do nothing;

insert into public.ebook_bab (buku_id, slug, label, judul, ringkas, ikon, urut, isi)
select b.id, v.slug, v.label, v.judul, v.ringkas, v.ikon, v.urut, v.isi
from (values
('personal-branding-dari-nol', 'brand-itu-ingatan', '01', 'Brand itu ingatan orang', 'Personal branding bukan soal terkenal, tapi soal apa yang orang ingat tentangmu.', 'lampu', 10, $t$Coba bayangkan seseorang bertanya ke temanmu, "Kenal orang yang jago bikin desain feed?" atau "Ada yang jual akun streaming terpercaya?" Kalau namamu yang muncul di kepala temanmu, itulah personal branding yang bekerja.

Personal branding adalah **ingatan dan kesan** yang tertinggal di kepala orang setelah mereka melihat kamu, kontenmu, atau berurusan denganmu. Kamu tidak bisa sepenuhnya mengatur apa yang orang pikirkan, tapi kamu bisa mengarahkannya lewat tiga hal.

:::kartu
1. Jelas | Orang paham kamu membantu siapa dan soal apa. Kalau kamu membahas semuanya, orang tidak ingat apa-apa.
2. Konsisten | Topik, gaya visual, dan cara bicaramu sama dari minggu ke minggu, sehingga mudah dikenali.
3. Terbukti | Ada hasil nyata: karya, proses kerja, cerita pembeli asli. Bukti mengubah "katanya" menjadi "percaya".
:::

## Brand bukan pencitraan

Banyak orang mundur karena merasa personal branding itu pura-pura. Justru sebaliknya: brand yang awet dibangun dari hal yang **benar-benar kamu lakukan**. Kamu cukup memilih bagian dirimu yang relevan untuk ditunjukkan, lalu menunjukkannya dengan rapi dan terus-menerus.

:::banding kiri="Pencitraan" kanan="Personal branding"
Pamer hasil tanpa proses | Menunjukkan proses, termasuk salah dan belajarnya
Klaim "terbaik", "nomor 1" tanpa bukti | Bukti karya dan cerita pembeli asli
Ikut semua tren supaya viral | Memilih tren yang cocok dengan topikmu
Beli followers biar terlihat besar | Tumbuh pelan dengan orang yang memang tertarik
:::

## Kenapa sekarang penting

Orang membeli dari orang yang mereka kenal dan percaya. Di media sosial, "kenal" terbentuk lewat konten. Kalau dua penjual menawarkan barang yang sama dengan harga mirip, pembeli memilih yang terasa lebih **nyata**: wajahnya terlihat, cara jelasnya enak, dan responsnya cepat.

:::tips
Kamu tidak perlu memulai dengan wajah kalau belum nyaman. Suara, tangan yang sedang bekerja, tulisan khasmu, atau warna yang konsisten juga bisa menjadi ciri.
:::

:::kuis
? Mana yang paling menggambarkan personal branding?
- Punya followers sebanyak mungkin
+ Kesan yang tertinggal di kepala orang tentang kamu dan keahlianmu
- Logo dan warna yang bagus
> Followers dan logo hanya alat. Intinya adalah apa yang orang ingat dan percayai tentangmu.
? Kamu baru mulai dan belum punya klien. Bukti apa yang bisa kamu tunjukkan?
- Belum bisa apa-apa, tunggu dapat klien dulu
+ Proses belajar, latihan karya, dan proyek contoh yang kamu buat sendiri
- Testimoni karangan supaya terlihat meyakinkan
> Proses dan karya latihan adalah bukti yang jujur. Testimoni karangan merusak kepercayaan kalau ketahuan.
:::$t$),
('personal-branding-dari-nol', 'temukan-posisimu', '02', 'Temukan posisimu', 'Pilih satu irisan yang membuatmu mudah diingat: keahlian, minat, dan kebutuhan orang.', 'target', 20, $t$Kesalahan paling umum di awal adalah ingin dikenal untuk semuanya. Hasilnya, orang bingung harus mengingatmu sebagai apa. Posisi (sering disebut *niche*) adalah irisan kecil tempat kamu paling mudah diingat.

![Posisimu ada di irisan tiga lingkaran: yang kamu bisa, yang kamu suka, dan yang orang butuhkan.](/assets/ebook/personal-branding-dari-nol/irisan-posisi.svg)

## Tiga pertanyaan penentu

### 1. Apa yang kamu bisa?
Tulis keahlian yang sudah bisa kamu kerjakan hari ini, walau belum sempurna. Contoh: desain di Canva, edit video, menjelaskan hal teknis dengan sederhana, memasak, jualan online.

### 2. Apa yang kamu suka bahas berulang kali?
Kalau kamu tidak suka topiknya, kamu akan berhenti di minggu ketiga. Pilih topik yang tetap menarik walau tidak ada yang menonton.

### 3. Siapa yang butuh, dan masalah apa yang mereka punya?
Keahlian baru bernilai kalau menyelesaikan masalah seseorang. Semakin spesifik orangnya, semakin mudah kamu bicara ke mereka.

:::checklist id=pb-posisi
Aku sudah menulis minimal 3 keahlian yang bisa kukerjakan sekarang
Aku sudah memilih 1 topik yang sanggup kubahas 3 bulan ke depan
Aku tahu siapa orang yang paling sering butuh keahlianku
Aku bisa menyebut 3 masalah yang sering mereka alami
Aku sudah menulis kalimat posisiku (lihat rumus di bawah)
:::

## Rumus kalimat posisi

> Aku membantu **[siapa]** untuk **[hasil yang mereka mau]** lewat **[caramu]**.

| Terlalu umum | Lebih jelas |
|---|---|
| Aku desainer grafis | Aku membantu UMKM kuliner bikin feed Instagram yang bikin lapar lewat template Canva |
| Aku jualan aplikasi premium | Aku membantu mahasiswa dapat aplikasi premium legal dan murah, bergaransi, tanpa ribet |
| Aku suka edit video | Aku membantu coach dan guru les mengubah materi jadi Reels 30 detik yang gampang dipahami |
| Aku content creator | Aku membagikan resep masak 15 menit untuk anak kos dengan bahan di bawah Rp20.000 |

:::catatan
Posisi bukan penjara. Mulailah sempit supaya mudah diingat. Setelah orang mengenalmu, kamu bisa melebar ke topik yang berdekatan.
:::

:::kuis
? Mana kalimat posisi yang paling kuat?
- Aku membantu semua orang sukses di internet
+ Aku membantu penjual kue rumahan menulis caption yang bikin orang DM
- Aku kreatif dan suka belajar hal baru
> Kalimat yang kuat menyebut siapa, hasil apa, dan caranya. "Semua orang" berarti tidak ada yang merasa diajak bicara.
:::$t$),
('personal-branding-dari-nol', 'profil-tiga-detik', '03', 'Profil yang menjelaskan dalam 3 detik', 'Orang yang mampir ke profilmu memutuskan ikut atau pergi dalam hitungan detik.', 'orang', 30, $t$Saat kontenmu muncul di beranda seseorang, langkah berikutnya biasanya mampir ke profil. Di sana mereka bertanya dalam hati: *ini akun tentang apa, dan apa untungnya buatku?* Profil yang baik menjawab dua pertanyaan itu sebelum jempolnya bergerak.

## Bagian profil yang paling berpengaruh

:::alur
Foto | Wajah jelas atau logo sederhana, kontras dengan latar
Nama | Tambahkan kata kunci: "Rina · Desain Feed UMKM"
Bio | Kalimat posisi + bukti + ajakan
Tautan | Satu tujuan: katalog, WhatsApp, atau portofolio
Sorotan | Testimoni asli, cara order, karya
:::

## Contoh bio sebelum dan sesudah

:::banding kiri="Sebelum" kanan="Sesudah"
"Just a girl who loves design ✨" | "Bikin feed UMKM kuliner jadi bikin lapar 🍜"
"DM for order" | "Template Canva siap pakai · order lewat link di bawah"
Tidak ada bukti | "120+ desain feed sejak 2024" (pakai angka asli milikmu)
Lima tautan berbeda | Satu tautan menuju katalog atau WhatsApp
:::

:::profil
@rina.desainfeed
Desainer grafis
Bikin feed UMKM kuliner jadi bikin lapar 🍜
Template Canva siap pakai + jasa desain bulanan
Lihat contoh di sorotan "Karya" ⬇️
rina.my.id/katalog
:::

:::tips
Pakai angka hanya kalau benar. Kalau belum punya angka, tulis prosesnya: "Belajar desain tiap hari, cek progresnya di sorotan".
:::

## Checklist profil

:::checklist id=pb-profil
Foto profil terlihat jelas saat dikecilkan
Nama akun memuat kata kunci keahlianku
Baris pertama bio menjelaskan aku membantu siapa
Ada satu bukti nyata (karya, angka asli, atau proses)
Ada ajakan yang jelas: klik, DM, atau lihat sorotan
Tautan hanya menuju satu tujuan utama
Sorotan berisi: Karya, Testimoni asli, Cara order
Tiga postingan teratas di-*pin* adalah konten terbaikku
:::$t$),
('personal-branding-dari-nol', 'pilar-dan-cerita', '04', 'Pilar konten & cerita', 'Supaya tidak bingung mau posting apa, bagi kontenmu ke empat pilar.', 'katalog', 40, $t$Kehabisan ide biasanya terjadi karena kita mulai dari nol setiap hari. Solusinya: tentukan **pilar konten**, yaitu kelompok topik yang kamu ulang terus dengan sudut berbeda.

:::kartu
Edukasi | Tips, cara, kesalahan umum. Membuat orang merasa terbantu dan menyimpan kontenmu.
Cerita | Proses kerja, pengalaman, di balik layar. Membuat orang merasa kenal.
Bukti | Hasil karya, ulasan pembeli asli, perbandingan sebelum-sesudah. Membuat orang percaya.
Penawaran | Produk, jasa, promo, cara order. Membuat orang tahu ke mana harus membeli.
:::

Perbandingan awal yang enak dipakai: **4 edukasi : 2 cerita : 2 bukti : 2 penawaran** dari setiap 10 konten. Sesuaikan setelah kamu melihat mana yang paling disukai pengikutmu.

## Dari satu ide jadi banyak konten

:::alur
Satu topik | Contoh: "cara memilih warna feed"
Tips | 3 kesalahan memilih warna feed
Cerita | Waktu aku salah pilih warna untuk klien pertama
Bukti | Feed klien sebelum dan sesudah ganti palet
Penawaran | Template palet siap pakai, cek katalog
:::

## Rumus cerita singkat

Cerita yang paling mudah ditulis mengikuti alur **Dulu – Masalah – Titik balik – Sekarang**.

:::langkah
**Dulu:** gambarkan kondisi awal secara jujur. "Dulu aku posting tiap hari tapi yang lihat cuma 50 orang."
**Masalah:** apa yang membuatmu frustrasi. "Ternyata kontenku membahas semuanya, jadi orang tidak tahu aku siapa."
**Titik balik:** apa yang kamu ubah. "Aku fokus hanya membahas desain untuk UMKM kuliner."
**Sekarang:** hasil yang jujur, tidak dilebih-lebihkan. "Pengikutku belum banyak, tapi yang DM untuk tanya jasa makin sering."
:::

:::peringatan
Jangan mengarang cerita sukses. Orang bisa merasakan cerita yang dibuat-buat, dan satu kebohongan yang ketahuan bisa menghapus kepercayaan yang kamu bangun berbulan-bulan.
:::$t$),
('personal-branding-dari-nol', 'konsisten-tanpa-capek', '05', 'Konsisten tanpa capek', 'Konsistensi datang dari sistem, bukan dari semangat.', 'kalender', 50, $t$Semangat di minggu pertama itu wajar, lalu hilang di minggu ketiga. Yang membuat akun bertahan adalah **sistem kecil** yang tetap jalan walau kamu sedang malas.

## Tiga kebiasaan yang menyelamatkan

:::kartu
Batch | Bikin 3–5 konten sekaligus di satu waktu, misalnya Minggu sore. Lebih cepat daripada bikin satu per hari.
Bank ide | Catat setiap pertanyaan pembeli dan komentar di catatan HP. Itu adalah ide konten gratis.
Ritme realistis | Lebih baik 3 kali seminggu selama setahun daripada tiap hari selama dua minggu.
:::

## Kalender 7 hari pertama

Centang setiap hari yang sudah kamu kerjakan. Progresnya tersimpan di akunmu.

:::kalender id=pb-kalender
Senin | Edukasi | 3 kesalahan yang sering dilakukan pemula di bidangmu
Selasa | Cerita | Kenapa kamu memulai, ceritakan dengan jujur
Rabu | Edukasi | Satu tips yang bisa langsung dipraktikkan hari ini
Kamis | Bukti | Satu karya atau hasil kerjamu, jelaskan prosesnya
Jumat | Penawaran | Apa yang kamu tawarkan dan cara memesannya
Sabtu | Cerita | Di balik layar: alat, meja kerja, atau rutinitasmu
Minggu | Batch | Tidak posting, siapkan 3 konten untuk minggu depan
:::

## Rencana 30 hari

:::garis-waktu
Minggu 1 | Rapikan profil, tulis kalimat posisi, posting 3–4 konten perkenalan
Minggu 2 | Fokus edukasi. Catat konten mana yang paling banyak disimpan
Minggu 3 | Tambah bukti: karya, proses, ulasan asli dari teman atau pembeli
Minggu 4 | Mulai penawaran pertama. Evaluasi: pilar mana yang paling disukai?
:::

:::tips
Kalau benar-benar kehabisan ide, jawab satu pertanyaan yang paling sering ditanyakan orang kepadamu. Itu hampir selalu jadi konten yang berguna.
:::$t$),
('personal-branding-dari-nol', 'dari-dikenal-ke-dibayar', '06', 'Dari dikenal ke dibayar', 'Ubah perhatian menjadi percakapan, lalu percakapan menjadi pesanan.', 'koin', 60, $t$Dikenal itu bagus, tapi tagihan dibayar dengan pesanan. Jembatan dari pengikut ke pembeli hampir selalu sama: **percakapan**.

:::alur
Konten | Orang mengenalmu dan merasa terbantu
Ajakan | "Mau template-nya? Komen PALET" atau "DM aku"
Percakapan | Tanya kebutuhannya dulu, bukan langsung jualan
Penawaran | Satu pilihan yang paling cocok, harga jelas
Bukti baru | Minta ulasan asli, jadikan konten bukti berikutnya
:::

## Contoh percakapan

:::chat
Dita: Kak, lihat konten palet warna kemarin. Bisa bantu feed toko kueku?
Kamu: Bisa banget, Kak Dita! Boleh tahu tokonya jual kue apa dan sekarang posting di mana saja?
Dita: Kue kering, di IG aja. Tapi feednya berantakan.
Kamu: Siap. Aku punya paket 9 desain feed + 1 template story Rp150.000, selesai 3 hari. Mau kukirim contoh hasil untuk toko kue sebelumnya?
Dita: Boleh kak.
:::

Perhatikan polanya: tanya dulu, dengarkan, baru tawarkan **satu** pilihan yang paling cocok. Terlalu banyak pilihan malah membuat orang menunda.

## Minta ulasan dengan cara yang enak

Setelah pekerjaan selesai dan pembeli puas, kirim pesan sederhana: *"Kak, kalau berkenan, boleh tulis 1–2 kalimat pengalamanmu? Mau aku tampilkan di sorotan."* Simpan tangkapan layarnya dengan izin pembeli.

:::peringatan
Jangan membeli followers, like, atau menulis testimoni palsu. Selain melanggar aturan platform, angka palsu tidak pernah berubah menjadi pembeli.
:::

## Checklist akhir

:::checklist id=pb-akhir
Kalimat posisiku sudah ada di bio
Aku punya 4 pilar konten dan bank ide
Aku posting dengan ritme yang sanggup kujalani
Setiap konten penawaran punya ajakan yang jelas
Aku punya template pesan untuk menjawab DM
Aku menyimpan ulasan asli dengan izin pembeli
:::

:::kutipan
Orang tidak mengingat semua kontenmu. Mereka mengingat perasaan terbantu yang konsisten.
:::$t$),
('freelance-pertama-30-hari', 'pilih-jasa', '01', 'Pilih jasa yang bisa dijual minggu ini', 'Mulai dari keahlian yang sudah kamu punya, bukan yang ingin kamu pelajari tahun depan.', 'tas', 10, $t$Freelance pertama paling cepat terjadi kalau kamu menjual sesuatu yang **sudah bisa kamu kerjakan sekarang**, walau masih sederhana. Belajar keahlian baru tetap boleh, tapi jalankan sambil menjual yang sudah ada.

## Jasa yang ramah pemula

:::kartu
Desain konten | Feed Instagram, poster promo, menu, banner marketplace. Alat: Canva, Figma.
Edit video pendek | Reels, TikTok, potongan podcast. Alat: CapCut, VN, Premiere.
Admin media sosial | Jadwal posting, balas komentar, laporan bulanan untuk UMKM.
Penulisan | Caption, deskripsi produk, artikel blog, naskah video.
Data & administrasi | Input data, rapikan spreadsheet, transkrip, riset sederhana.
Terjemahan | Inggris–Indonesia untuk dokumen, subtitle, atau deskripsi produk.
:::

## Cara memilih satu

Beri nilai 1–5 untuk setiap jasa yang kamu pertimbangkan, lalu pilih yang totalnya paling tinggi.

| Pertanyaan | Bobot |
|---|---|
| Aku sudah bisa mengerjakannya tanpa tutorial dari awal | Tinggi |
| Banyak orang di sekitarku (UMKM, teman, komunitas) yang butuh | Tinggi |
| Bisa selesai dalam 1–3 hari per proyek | Sedang |
| Alatnya gratis atau sudah kupunya | Sedang |
| Aku tidak bosan mengerjakannya berulang kali | Sedang |

:::tips
Satu jasa, satu target pembeli. "Desain feed untuk toko kue" lebih mudah dijual daripada "desain apa saja".
:::

:::kuis
? Kamu bisa edit video di CapCut dan sedang belajar 3D. Apa yang sebaiknya kamu jual minggu ini?
+ Jasa edit video pendek, sambil tetap belajar 3D
- Tunggu sampai 3D-mu mahir baru mulai freelance
- Jual keduanya supaya peluangnya lebih besar
> Jual yang sudah bisa kamu kerjakan dengan baik. Keahlian baru bisa ditambahkan setelah kamu punya klien dan ritme kerja.
:::$t$),
('freelance-pertama-30-hari', 'portofolio-tanpa-klien', '02', 'Portofolio tanpa klien', 'Klien membeli bukti. Kalau belum punya klien, buat bukti sendiri.', 'katalog', 20, $t$"Belum ada klien, jadi belum ada portofolio. Belum ada portofolio, jadi tidak dapat klien." Lingkaran ini bisa diputus dengan **proyek contoh**: pekerjaan yang kamu buat sendiri seolah-olah untuk klien sungguhan.

## Tiga proyek contoh yang cukup

:::langkah
Pilih **satu bisnis nyata di sekitarmu** (warung kopi, toko kue teman, bengkel). Buat ulang konten mereka versi yang lebih baik. Tulis jelas bahwa ini proyek latihan, bukan pesanan mereka.
Buat **satu proyek dari brief buatan sendiri**. Contoh: "Brand skincare lokal butuh 3 poster promo Ramadan."
Kerjakan **satu proyek gratis atau barter** untuk teman atau komunitas dengan imbalan ulasan asli dan izin memajang karyanya.
:::

## Format studi kasus

Jangan hanya memajang gambar. Klien ingin melihat **cara berpikirmu**. Setiap karya cukup dijelaskan dalam empat bagian:

:::alur arah=bawah
Masalah | Feed toko kue terlihat gelap dan tidak konsisten
Proses | Menentukan palet hangat, membuat 3 template, foto ulang 5 produk
Hasil | 9 postingan yang rapi dan seragam (tunjukkan sebelum–sesudah)
Pelajaran | Foto produk dengan cahaya jendela membuat warna kue lebih menarik
:::

:::peringatan
Untuk proyek contoh memakai brand orang lain, tulis "proyek latihan / konsep" dan jangan klaim mereka sebagai klienmu. Kejujuran ini justru membuatmu terlihat profesional.
:::

## Tempat memajang

- Sorotan Instagram atau postingan yang di-*pin*
- Satu halaman Google Drive/Notion/Canva yang rapi dengan tautan publik
- Profil Behance, Dribbble, atau LinkedIn untuk klien korporat

:::checklist id=fl-porto
Aku punya 3 karya contoh di bidang jasaku
Setiap karya punya penjelasan masalah, proses, dan hasil
Proyek latihan diberi label dengan jujur
Portofolioku bisa dibuka dengan satu tautan
Ada kontak dan cara memesan di halaman portofolio
:::$t$),
('freelance-pertama-30-hari', 'tarif-tidak-rugi', '03', 'Tarif yang tidak bikin rugi', 'Hitung dari kebutuhanmu, lalu cocokkan dengan pasar.', 'kalkulator', 30, $t$Banyak freelancer pemula menetapkan harga dengan menebak, lalu kelelahan karena dibayar terlalu murah. Mulailah dari angka yang kamu butuhkan, lalu bandingkan dengan harga pasar.

:::tarif target=4000000 biaya=400000 jam=20
:::

## Ubah menjadi paket

Klien lebih mudah memilih dari paket daripada dari tarif per jam. Buat tiga tingkat, dan arahkan perhatian ke paket tengah.

| Paket | Isi (contoh desain feed) | Harga contoh |
|---|---|---|
| Basic | 3 desain feed, 1× revisi | Rp90.000 |
| Standar | 9 desain feed + 1 template story, 2× revisi | Rp240.000 |
| Premium | 15 desain feed + 3 template story + palet brand, 3× revisi | Rp390.000 |

:::catatan
Angka di atas hanya contoh. Isi paket dengan hasil kalkulatormu dan cek harga freelancer lain di bidang yang sama sebelum memutuskan.
:::

## Aturan agar tidak rugi

:::banding kiri="Bikin rugi" kanan="Lebih sehat"
Revisi tanpa batas | Jumlah revisi tertulis di paket
Mulai kerja tanpa DP | DP 50% sebelum mulai
Harga beda-beda tiap orang tanpa alasan | Paket tetap, tambahan dihitung terpisah
Ikut perang harga paling murah | Bersaing di kecepatan, kerapian, dan komunikasi
:::

:::kuis
? Klien minta "sekalian" tambah 5 desain di luar paket. Apa yang sebaiknya kamu lakukan?
- Kerjakan saja supaya klien senang
+ Sampaikan dengan sopan bahwa itu di luar paket dan berikan harga tambahannya
- Tolak tanpa penjelasan
> Pekerjaan tambahan berhak dibayar. Sampaikan dengan ramah, sebutkan harganya, dan biarkan klien memilih.
:::$t$),
('freelance-pertama-30-hari', 'jemput-klien', '04', 'Cari klien: platform & jemput bola', 'Gabungkan dua cara: dicari lewat platform dan menawarkan langsung.', 'magnet', 40, $t$Klien pertama jarang datang sendiri. Kamu perlu berada di tempat mereka mencari, sekaligus menyapa mereka secara langsung dengan cara yang sopan.

![Corong klien: dari dilihat, diajak bicara, sampai pesan ulang.](/assets/ebook/freelance-pertama-30-hari/corong-klien.svg)

## Tempat mencari klien

:::kartu
Platform freelance | Fiverr, Upwork, Sribulancer, Projects.co.id. Persaingan ketat, tapi kliennya memang sedang mencari.
LinkedIn | Cocok untuk penulisan, desain, dan admin untuk perusahaan. Tulis postingan proses kerja.
Instagram & TikTok | Pamerkan karya dan proses. Klien UMKM banyak menemukan jasa di sini.
Grup komunitas | Grup Facebook, Telegram, atau Discord sesuai bidang. Bantu dulu, jualan belakangan.
Bisnis sekitar | Warung, toko, klinik, sekolah di dekatmu. Datang atau kirim pesan dengan contoh nyata.
Jaringan pribadi | Kabari teman dan keluarga bahwa kamu menerima jasa. Banyak klien pertama datang dari sini.
:::

## Template pesan jemput bola

Pesan yang baik itu **pendek, personal, dan memberi sesuatu dulu**.

:::chat
Kamu: Halo Kak, aku Rina, desainer feed untuk UMKM kuliner. Aku suka banget menu baru Kopi Senja yang kemarin diposting!
Kamu: Aku iseng bikin 1 contoh desain promo untuk menu itu, siapa tahu berguna. Boleh aku kirim gambarnya?
Pemilik: Boleh kak, kirim aja.
Kamu: Ini ya Kak. Kalau suka gayanya, aku ada paket 9 desain per bulan. Kalau belum perlu, desain ini boleh dipakai gratis.
:::

:::peringatan
Jangan kirim pesan yang sama ke ratusan orang sekaligus. Selain dianggap spam, nomormu bisa diblokir. Lebih baik 5 pesan personal per hari.
:::

:::sop id=fl-jemput
Pilih 5 calon klien yang konten atau tokonya bisa kamu bantu
Tulis satu hal spesifik yang kamu suka dari bisnis mereka
Siapkan satu contoh kecil yang relevan
Kirim pesan personal, jangan langsung menyebut harga
Catat siapa yang membalas dan follow-up 3 hari kemudian, cukup sekali
:::$t$),
('freelance-pertama-30-hari', 'brief-kontrak-dp', '05', 'Brief, kontrak mini & DP', 'Proyek yang lancar dimulai dari kesepakatan yang tertulis.', 'perisai', 50, $t$Sebagian besar masalah freelance, seperti revisi tanpa ujung, telat bayar, atau hasil yang "bukan ini yang aku mau", bisa dicegah sebelum pekerjaan dimulai.

## Kumpulkan brief

:::form judul="Contoh form brief klien" ikon=pena
Nama bisnis & kontak
Apa yang dibutuhkan (jenis & jumlah)
Tujuan (promo, branding, peluncuran)
Target pembeli
Contoh gaya yang disukai (tautan/screenshot)
Logo, foto produk, dan teks yang wajib ada
Tenggat waktu
:::

## Kontrak mini lewat chat

Kamu tidak perlu dokumen hukum yang rumit untuk proyek kecil. Cukup satu pesan ringkas yang disetujui klien:

> Ringkasan pesanan: 9 desain feed + 1 template story · 2× revisi · selesai 3 hari kerja setelah DP · Total Rp240.000, DP 50% (Rp120.000), pelunasan sebelum file final dikirim. Balas "setuju" untuk mulai ya, Kak.

## Alur proyek

:::sop id=fl-proyek
Terima brief lengkap dan konfirmasi pemahaman
Kirim ringkasan pesanan, tunggu "setuju"
Terima DP 50%, catat tanggal mulai
Kirim draf pertama dengan watermark atau resolusi rendah
Kumpulkan revisi dalam satu daftar, sesuai jatah
Terima pelunasan
Kirim file final dan cara memakainya
Minta ulasan asli dan izin memajang karya
:::

:::tips
Kirim pembaruan singkat di tengah proyek walau belum ditanya. Klien yang merasa diberi kabar jarang rewel.
:::$t$),
('freelance-pertama-30-hari', 'rencana-30-hari', '06', 'Kirim, revisi, ulang order & rencana 30 hari', 'Klien kedua dan ketiga paling sering datang dari klien pertama.', 'bendera', 60, $t$Proyek selesai bukan akhir. Klien yang puas bisa memesan lagi dan merekomendasikanmu ke temannya. Dua hal yang membuat itu terjadi: **pengalaman yang mudah** dan **kesan terakhir yang baik**.

:::kartu
Serah terima rapi | File diberi nama jelas, dikelompokkan, ada catatan cara pakai.
Tawarkan lanjutan | "Kalau bulan depan butuh lagi, aku bisa siapkan jadwal tetap."
Minta ulasan | Satu atau dua kalimat jujur, simpan dengan izin.
Jaga hubungan | Sapa lagi saat ada momen promo besar, seperti Lebaran, 11.11, atau akhir tahun.
:::

## Rencana 30 hari

:::garis-waktu
Hari 1–3 | Pilih satu jasa, tulis kalimat posisi, siapkan profil
Hari 4–10 | Buat 3 proyek contoh dan studi kasusnya
Hari 11–12 | Hitung tarif, susun 3 paket, siapkan template pesan
Hari 13–25 | Kirim 5 pesan personal per hari, posting 3 karya per minggu, daftar di 1 platform
Hari 26–30 | Kerjakan proyek pertama, minta ulasan, evaluasi apa yang berhasil
:::

:::checklist id=fl-30
Jasaku sudah jelas dan spesifik
Portofolio berisi 3 studi kasus
Paket dan tarif sudah tertulis
Aku sudah mengirim minimal 50 pesan personal
Aku punya template ringkasan pesanan dan alur DP
Klien pertamaku sudah memberi ulasan asli
:::

:::kuis
? Setelah proyek pertama selesai, langkah apa yang paling berdampak untuk klien berikutnya?
- Langsung cari klien baru dan lupakan yang lama
+ Minta ulasan asli, pajang karya dengan izin, dan tawarkan kerja sama lanjutan
- Turunkan harga supaya klien lama mau order lagi
> Ulasan, portofolio, dan klien yang kembali adalah sumber klien baru yang paling murah.
:::$t$),
('canva-konten-menjual', 'prinsip-lima-detik', '01', 'Prinsip 5 detik', 'Orang menggulir cepat. Desainmu harus bisa dipahami dalam sekejap.', 'kuas', 10, $t$Di beranda media sosial, desainmu bersaing dengan ratusan konten lain. Orang hanya memberi waktu beberapa detik sebelum lanjut menggulir. Dalam waktu itu mereka harus menangkap **satu pesan utama**.

![Hierarki visual: mata membaca judul dulu, lalu gambar, lalu ajakan.](/assets/ebook/canva-konten-menjual/hierarki.svg)

## Tiga prinsip yang paling berpengaruh

:::kartu
1. Hierarki | Tentukan urutan baca: judul paling besar, detail lebih kecil, ajakan paling kontras. Kalau semua besar, tidak ada yang terbaca.
2. Kontras | Teks gelap di latar terang, atau sebaliknya. Hindari teks di atas foto ramai tanpa kotak atau bayangan.
3. Ruang kosong | Beri jarak di tepi dan antarelemen. Ruang kosong membuat desain terlihat mahal dan mudah dibaca.
:::

:::banding kiri="Bikin pusing" kanan="Mudah dibaca"
5 jenis font dalam satu desain | Maksimal 2 font: satu untuk judul, satu untuk isi
Semua teks ukurannya sama | Judul 2–3 kali lebih besar dari isi
Elemen menempel di tepi | Jarak tepi minimal sekitar 5% dari lebar desain
Banyak warna mencolok | 1 warna utama, 1 aksen, sisanya netral
Teks di atas foto ramai | Pakai kotak semi transparan di belakang teks
:::

:::tips
Uji cepat: kecilkan desainmu sampai seukuran jempol di layar HP. Kalau judulnya masih terbaca, hierarkimu sudah benar.
:::

:::kuis
? Poster promo diskon. Elemen apa yang sebaiknya paling menonjol?
- Logo toko
+ Angka diskon atau manfaat utamanya
- Alamat dan jam buka
> Orang berhenti karena tawaran. Logo dan detail tetap ada, tapi ukurannya lebih kecil.
:::$t$),
('canva-konten-menjual', 'warna-dan-font', '02', 'Warna & font brand', 'Pilih sekali, pakai terus. Konsistensi membuat akunmu mudah dikenali.', 'kuas', 20, $t$Akun yang mudah dikenali biasanya memakai warna dan font yang sama dari postingan ke postingan. Kamu tidak perlu jadi desainer untuk ini. Cukup tentukan sekali dan simpan.

## Rumus 60–30–10

Pakai **60%** warna netral (latar), **30%** warna utama brand, dan **10%** warna aksen untuk hal yang harus diklik atau diperhatikan, seperti harga, tombol, atau label promo.

:::palet
#FAF7F2 | Krem | Latar utama, 60%
#2B2B2B | Arang | Teks dan judul
#5B2BD6 | Ungu brand | Bidang warna dan elemen utama, 30%
#FFB84D | Kuning aksen | Harga, label promo, tombol, 10%
#E9E3FF | Ungu muda | Kotak info dan latar sekunder
:::

:::catatan
Palet di atas hanya contoh. Ambil warna utama dari logo atau produkmu, lalu cari pasangannya. Di Canva, kamu bisa menyimpan warna dan font di **Brand Kit** (fitur Canva Pro) supaya selalu tersedia.
:::

## Pasangan font yang aman

| Judul | Isi | Kesan |
|---|---|---|
| Montserrat Bold | Inter | Modern, bersih, cocok untuk teknologi dan jasa |
| Playfair Display | Lato | Elegan, cocok untuk fashion, kecantikan, kue |
| Poppins SemiBold | Open Sans | Ramah dan mudah dibaca untuk edukasi |
| Bebas Neue | Roboto | Tegas dan padat untuk promo, olahraga, gaming |

:::peringatan
Font dekoratif (tulisan tangan, script, atau 3D) hanya untuk 1–3 kata. Jangan dipakai untuk paragraf karena sulit dibaca di layar kecil.
:::

:::checklist id=cv-brand
Aku sudah memilih 1 warna utama dan 1 warna aksen
Aku menyimpan kode warna (#hex) di catatan atau Brand Kit
Aku memilih 1 font judul dan 1 font isi
Aku punya logo versi terang dan versi gelap
:::$t$),
('canva-konten-menjual', 'carousel-lima-slide', '03', 'Carousel yang digeser sampai habis', 'Struktur 5 slide untuk konten edukasi yang disimpan dan dibagikan.', 'katalog', 30, $t$Carousel (postingan beberapa slide) cocok untuk edukasi karena orang bisa menyimpannya. Kunci carousel yang berhasil: slide pertama membuat penasaran, slide terakhir memberi arah.

:::alur
Slide 1 · Hook | Janji manfaat atau masalah: "5 kesalahan foto produk yang bikin sepi pembeli"
Slide 2–4 · Isi | Satu poin per slide, teks singkat, ada gambar contoh
Slide 5 · Ringkasan | Rangkum poinnya dalam satu tampilan
Slide terakhir · Ajakan | "Simpan untuk nanti" atau "Cek katalog di bio"
:::

## Cara membuat di Canva

:::langkah
Buat desain ukuran **1080 × 1350 px** (potret 4:5) agar memenuhi layar HP.
Desain slide 1 dulu dengan judul besar dan visual kuat. Ini yang menentukan orang menggeser atau tidak.
Gandakan halaman (**Duplikat halaman**) untuk slide berikutnya supaya posisi judul dan margin tetap sama.
Beri penanda di pojok, misalnya "1/6" atau panah kecil "geser →", agar orang tahu masih ada lanjutan.
Unduh semua halaman sebagai PNG, lalu unggah sesuai urutan.
:::

:::kartu
Satu ide per slide | Kalau perlu lebih dari 25 kata, pecah menjadi dua slide.
Konsisten posisi | Judul selalu di tempat yang sama agar enak digeser.
Visual nyata | Tangkapan layar, foto produk, atau ikon sederhana lebih membantu daripada hiasan.
:::

:::tips
Tulis isinya dulu di catatan HP, baru buka Canva. Desain akan jauh lebih cepat kalau kamu tidak memikirkan kata-kata sambil mendesain.
:::$t$),
('canva-konten-menjual', 'poster-promo', '04', 'Poster promo yang bikin klik', 'Poster yang bagus menjawab: ada apa, untung apa, sampai kapan, pesan di mana.', 'megafon', 40, $t$Poster promo punya satu tugas: membuat orang **berhenti, paham, lalu bertindak**. Semua elemen di poster harus membantu salah satu dari tiga hal itu.

:::poster keterangan="Contoh struktur poster promo: judul tawaran, harga, 3 manfaat, ajakan, dan kontak."
PROMO AKHIR BULAN
Kue kering premium toples 500 gr
Rp89.000 (normal Rp110.000)
✓ Tanpa pengawet
✓ Dikirim hari yang sama
✓ Bisa tulis kartu ucapan
Pesan sebelum 30 November
WA 0812-xxxx-xxxx
:::

## Urutan elemen

:::langkah
**Judul tawaran** di bagian atas, besar, maksimal 5 kata.
**Visual produk** yang jelas, jangan tertutup teks.
**Harga** dengan warna aksen. Kalau ada harga normal, tampilkan dengan coret, dan pastikan angkanya jujur.
**3 manfaat** singkat dengan ikon centang.
**Batas waktu atau stok** jika memang ada.
**Ajakan dan kontak** di bagian bawah.
:::

:::peringatan
Jangan memasang harga coret yang tidak pernah berlaku atau hitung mundur yang terus diulang. Pembeli yang merasa ditipu tidak akan kembali, dan bisa melanggar aturan perlindungan konsumen.
:::

:::checklist id=cv-poster
Judul bisa dibaca saat poster dikecilkan
Hanya ada 1 pesan utama
Harga dan syarat promo jelas
Batas waktu sesuai kenyataan
Kontak atau cara pesan terlihat
Warna dan font sesuai brand
Sudah dicek ejaan dan angka
:::$t$),
('canva-konten-menjual', 'kerja-cepat', '05', 'Kerja cepat di Canva', 'Template milik sendiri dan kebiasaan kecil yang menghemat jam kerja.', 'roket', 50, $t$Desainer yang cepat tidak mendesain dari nol setiap kali. Mereka punya **template sendiri** dan kebiasaan kerja yang rapi.

## Pintasan yang sering dipakai

| Tombol | Fungsi |
|---|---|
| T | Tambah kotak teks |
| R | Tambah persegi |
| L | Tambah garis |
| C | Tambah lingkaran |
| Ctrl/Cmd + D | Duplikat elemen |
| Ctrl/Cmd + G | Kelompokkan elemen |
| Shift + klik | Pilih beberapa elemen |
| Ctrl/Cmd + Z | Batalkan |

:::catatan
Pintasan di atas untuk Canva versi web dan desktop. Di aplikasi HP, gunakan tombol Duplikat dan Kelompokkan di menu elemen.
:::

## Bangun pustaka template

:::sop id=cv-template
Buat satu desain feed, satu story, dan satu poster promo dengan warna dan font brand
Simpan di folder khusus, beri nama "TEMPLATE · Feed", "TEMPLATE · Story", dan seterusnya
Setiap kali butuh desain baru, buat salinan template, jangan edit aslinya
Ganti teks dan foto saja, posisi dan ukuran tetap
Untuk ukuran lain, pakai fitur ubah ukuran (Canva Pro) atau buat template per ukuran
:::

:::tips
Sisihkan satu jam di akhir pekan untuk membuat semua desain minggu depan sekaligus. Menyalin template lima kali jauh lebih cepat daripada lima kali membuka Canva dari nol.
:::$t$),
('canva-konten-menjual', 'ekspor-dan-cek', '06', 'Ekspor & cek sebelum posting', 'Ukuran yang tepat dan pengecekan terakhir agar desain tidak terpotong atau buram.', 'centang', 60, $t$Desain bagus bisa rusak karena ukuran salah: terpotong di beranda, tertutup tombol, atau buram setelah diunggah.

## Ukuran yang paling sering dipakai

| Kebutuhan | Ukuran (px) | Rasio |
|---|---|---|
| Feed Instagram potret | 1080 × 1350 | 4:5 |
| Feed persegi | 1080 × 1080 | 1:1 |
| Story, Reels, TikTok | 1080 × 1920 | 9:16 |
| Thumbnail YouTube | 1280 × 720 | 16:9 |
| Banner toko marketplace | Cek panduan terbaru di pusat edukasi penjual | Bervariasi |

:::catatan
Untuk story dan Reels, jauhkan teks penting dari sekitar 250 px bagian atas dan bawah, karena area itu tertutup nama akun, caption, dan tombol.
:::

## Format file

:::kartu
PNG | Untuk desain dengan teks dan warna rata. Paling tajam.
JPG | Untuk desain yang didominasi foto. Ukuran file lebih kecil.
PDF | Untuk dicetak (pilih PDF Print) atau dikirim sebagai dokumen.
MP4 | Untuk desain dengan animasi.
:::

:::checklist id=cv-ekspor
Ukuran desain sesuai platform tujuan
Teks penting aman dari area tombol
Diunduh sebagai PNG untuk desain teks
Sudah dicek di layar HP sebelum diunggah
Caption dan tagar sudah disiapkan
:::

:::kuis
? Kamu membuat desain untuk story. Ukuran mana yang tepat?
- 1080 × 1080
+ 1080 × 1920
- 1280 × 720
> Story memakai rasio 9:16 (1080 × 1920 px) agar memenuhi layar HP.
? Teks promo di story tertutup nama akun. Apa penyebabnya?
+ Teks diletakkan terlalu dekat dengan tepi atas
- Font yang dipakai kurang tebal
- File diunduh sebagai PNG
> Bagian atas dan bawah story tertutup elemen aplikasi. Letakkan teks penting di area tengah.
:::$t$),
('capcut-reels-kilat', 'anatomi-video', '01', 'Anatomi video 15–30 detik', 'Tiga detik pertama menentukan apakah videomu ditonton atau dilewati.', 'video', 10, $t$Video pendek yang ditonton sampai habis hampir selalu punya struktur yang sama. Kalau kamu memahami strukturnya, mengedit menjadi jauh lebih mudah karena kamu tahu apa yang harus dipotong.

![Struktur video pendek: hook di awal, isi di tengah, ajakan di akhir.](/assets/ebook/capcut-reels-kilat/struktur-video.svg)

:::alur
Hook · 0–3 detik | Alasan untuk tetap menonton: masalah, hasil, atau pertanyaan
Isi · 3–25 detik | Satu ide, ditunjukkan cepat dengan potongan pendek
Ajakan · 2–5 detik terakhir | Apa yang harus dilakukan penonton: simpan, komen, cek bio
:::

## Jenis hook yang sering berhasil

:::kartu
Hasil dulu | Tunjukkan hasil akhir di detik pertama, baru prosesnya. "Dari feed berantakan jadi begini."
Masalah | "Foto produkmu gelap terus? Coba ini."
Kesalahan | "Berhenti melakukan ini kalau mau videomu ditonton."
Pertanyaan | "Kamu tahu kenapa pembeli cuma tanya harga lalu menghilang?"
Angka | "3 setting HP yang bikin videomu lebih tajam."
:::

## 10 kalimat hook siap pakai

- "Jangan beli [produk] sebelum nonton ini."
- "Ini cara [hasil] cuma dalam [waktu]."
- "Kesalahan nomor satu saat [aktivitas]."
- "Aku coba [hal] selama 7 hari, ini hasilnya."
- "Kalau kamu [kondisi], video ini buat kamu."
- "Bedanya [A] dan [B] yang jarang dibahas."
- "Simpan ini sebelum kamu [aktivitas]."
- "Rahasia [hasil] tanpa [hal yang dibenci]."
- "Pembeli sering tanya ini, jadi aku jawab di sini."
- "Satu trik kecil yang mengubah [hal]."

:::peringatan
Hook harus sesuai isi. Hook yang menjanjikan sesuatu lalu tidak ditepati membuat penonton kesal dan cenderung tidak mau menonton videomu lagi.
:::$t$),
('capcut-reels-kilat', 'rekam-dengan-benar', '02', 'Rekam dengan benar', 'Editing tidak bisa menyelamatkan video yang gelap, goyang, atau suaranya bising.', 'kamera', 20, $t$Kualitas video lebih banyak ditentukan saat merekam daripada saat mengedit. Kabar baiknya, HP yang kamu punya sekarang sudah cukup.

:::banding kiri="Hasil kurang" kanan="Hasil lebih baik"
Merekam membelakangi jendela | Menghadap jendela, cahaya jatuh ke wajah atau produk
Kamera dipegang sambil berjalan | HP disandarkan atau pakai tripod murah
Merekam horizontal | Merekam vertikal 9:16
Mikrofon jauh, ruangan bergema | Dekatkan HP atau pakai mikrofon klip, ruangan bertirai atau berkarpet
Zoom digital | Dekatkan HP ke objek
:::

## Pengaturan kamera

:::langkah
Bersihkan lensa kamera. Lensa berminyak membuat video terlihat buram.
Pilih resolusi **1080p** dan **30 fps** untuk video bicara, atau 60 fps untuk gerakan cepat.
Kunci fokus dan eksposur dengan menekan lama layar pada objek (di banyak HP muncul tulisan kunci AE/AF).
Rekam beberapa detik lebih panjang di awal dan akhir agar mudah dipotong.
Rekam ulang bagian yang salah, jangan dipaksakan. Potong nanti saat edit.
:::

:::checklist id=cc-rekam
Lensa sudah dibersihkan
Posisi HP vertikal dan stabil
Cahaya dari depan, bukan dari belakang
Suara diuji dengan rekaman 5 detik
Latar belakang rapi dan tidak mengganggu
Baterai dan memori cukup
:::

:::tips
Rekam juga *B-roll*: potongan pendek tangan bekerja, produk dari beberapa sudut, atau suasana. Potongan ini menyelamatkan videomu saat kamu perlu menutup bagian yang membosankan.
:::$t$),
('capcut-reels-kilat', 'edit-dasar', '03', 'Edit dasar di CapCut', 'Potong yang tidak perlu. Video pendek yang bagus terasa padat.', 'kuas', 30, $t$Edit dasar terdiri dari tiga pekerjaan: **memilih**, **memotong**, dan **menyusun**. Efek dan transisi itu nomor sekian.

:::sop id=cc-edit
Buat proyek baru, masukkan semua klip sesuai urutan cerita
Atur rasio ke 9:16 di menu rasio
Potong awal dan akhir setiap klip yang tidak terpakai
Pakai Split untuk memotong jeda diam, napas panjang, dan kata "eee"
Hapus pengulangan. Kalau satu kalimat direkam 3 kali, pilih yang terbaik
Sisipkan B-roll di atas bagian yang panjang (pakai overlay)
Tonton dari awal tanpa suara: apakah tetap bisa dipahami?
:::

## Patokan durasi

| Jenis video | Durasi yang enak |
|---|---|
| Tips cepat | 15–25 detik |
| Tutorial singkat | 30–60 detik |
| Review produk | 20–45 detik |
| Cerita atau vlog pendek | 30–90 detik |

:::catatan
Nama menu bisa berbeda sedikit di setiap versi CapCut. Kalau tidak menemukan sebuah menu, ketuk klip dulu, karena banyak alat baru muncul setelah klip dipilih.
:::

:::kuis
? Videomu 45 detik dan terasa lambat. Apa yang pertama kamu lakukan?
+ Potong jeda diam dan kalimat yang diulang
- Tambahkan lebih banyak transisi
- Percepat seluruh video 2×
> Video terasa lambat karena ada bagian kosong. Memotong jeda membuat video padat tanpa membuat suaramu terdengar aneh.
:::$t$),
('capcut-reels-kilat', 'teks-caption-musik', '04', 'Teks, caption & musik', 'Banyak orang menonton tanpa suara. Teks membantu mereka tetap paham.', 'chat', 40, $t$Sebagian penonton menonton dengan suara mati, terutama di tempat umum. Teks di layar membuat pesanmu tetap sampai.

## Tiga jenis teks

:::kartu
Judul hook | Di 3 detik pertama, besar, maksimal 6 kata. Ulangi isi hook dalam bentuk tulisan.
Caption otomatis | Gunakan fitur caption/teks otomatis CapCut, lalu periksa ejaannya satu per satu.
Label penjelas | Kata kunci kecil di tengah video: "Langkah 2", "Sebelum", "Sesudah".
:::

## Area aman teks

Bagian bawah layar tertutup caption dan nama akun, sedangkan sisi kanan tertutup tombol suka dan komentar. Letakkan teks penting di **tengah layar**, sedikit di atas garis tengah.

| Area | Tertutup oleh |
|---|---|
| Atas (±10%) | Nama aplikasi, tab, jam |
| Bawah (±20%) | Caption, nama akun, musik |
| Kanan (±15%) | Tombol suka, komentar, bagikan |

## Musik dan suara

:::langkah
Atur volume musik jauh lebih pelan dari suaramu, kira-kira sepertiga.
Pilih musik yang temponya sesuai ritme potonganmu.
Untuk konten bisnis, pakai audio dari pustaka platform atau musik bebas royalti yang jelas lisensinya.
:::

:::peringatan
Musik populer di aplikasi edit belum tentu boleh dipakai untuk akun bisnis atau iklan. Kalau videomu dipakai untuk jualan, pastikan lisensi musiknya mengizinkan agar video tidak dibisukan atau diturunkan.
:::$t$),
('capcut-reels-kilat', 'transisi-dan-ritme', '05', 'Transisi & ritme', 'Ritme yang enak membuat orang tidak sadar videonya sudah selesai.', 'alur', 50, $t$Ritme adalah perasaan "mengalir" saat menonton. Ritme terbentuk dari **panjang potongan**, **perubahan gambar**, dan **ketukan musik**.

:::kartu
Jump cut | Potongan langsung tanpa transisi. Paling sering dipakai untuk video bicara.
B-roll | Gambar pendukung di atas suara. Menutup potongan dan membuat video lebih hidup.
Zoom ringan | Perbesar sedikit di kalimat penting untuk memberi penekanan.
Match cut | Potongan dengan gerakan atau bentuk yang sama, misalnya tangan menutup kotak lalu membuka di tempat lain.
Ketukan musik | Potong tepat di ketukan agar terasa rapi.
:::

## Rumus ritme sederhana

:::alur
Ganti gambar | Setiap 2–4 detik, ganti sudut, B-roll, atau zoom
Penekanan | Zoom atau teks di kalimat paling penting
Jeda kecil | Satu momen tenang sebelum ajakan
Ajakan | Tutup dengan jelas dan cepat
:::

:::banding kiri="Berlebihan" kanan="Pas"
Transisi berbeda di setiap potongan | Jump cut, sesekali satu transisi halus
Efek suara di semua tempat | Efek suara hanya untuk momen penting
Teks bergerak di sepanjang video | Animasi teks hanya di awal
:::

:::tips
Tonton ulang videomu dengan kecepatan normal. Bagian yang membuatmu ingin menggeser adalah bagian yang perlu dipotong.
:::$t$),
('capcut-reels-kilat', 'ekspor-dan-upload', '06', 'Ekspor & upload', 'Pengaturan terakhir yang menentukan videomu tajam atau buram.', 'pesawat', 60, $t$Setelah mengedit dengan susah payah, jangan sampai videomu buram karena salah ekspor.

## Pengaturan ekspor

| Pengaturan | Pilihan |
|---|---|
| Resolusi | 1080p |
| Frame rate | Sama dengan saat merekam, biasanya 30 fps |
| Rasio | 9:16 |
| Kualitas/bitrate | Tinggi atau rekomendasi |

## Sebelum upload

:::checklist id=cc-upload
Hook muncul di 3 detik pertama
Teks penting berada di area aman
Caption sudah dicek ejaannya
Musik pelan dan lisensinya aman
Ada ajakan yang jelas di akhir
Sampul video (cover) dipilih dari frame yang menarik
Caption postingan berisi kata kunci topik
:::

## Evaluasi setelah 48 jam

Lihat analitik videomu. Jangan hanya melihat jumlah penonton. Lihat juga **berapa lama orang menonton** dan **di detik ke berapa mereka pergi**. Bagian itu yang perlu diperbaiki di video berikutnya.

:::kuis
? Banyak penonton pergi di detik ke-2. Apa yang perlu diperbaiki?
+ Hook di awal video
- Ajakan di akhir video
- Pilihan musik
> Penonton yang pergi sangat awal berarti hook belum membuat mereka penasaran. Coba tunjukkan hasil atau masalah lebih cepat.
? Frame rate ekspor yang paling aman?
- Selalu 60 fps
+ Sama dengan frame rate saat merekam
- Serendah mungkin agar file kecil
> Menyamakan frame rate dengan rekaman mencegah gerakan patah-patah.
:::$t$),
('foto-estetik-lightroom', 'baca-foto', '01', 'Baca fotomu dulu', 'Sebelum menggeser slider, pahami apa yang kurang dari fotomu.', 'kamera', 10, $t$Kesalahan pemula adalah langsung memakai filter. Hasilnya, foto terang malah jadi terlalu terang, foto kuning makin kuning. Biasakan **menilai foto dulu**, baru mengedit.

## Empat pertanyaan sebelum mengedit

:::kartu
Terang atau gelap? | Apakah objek utamanya terlihat jelas, atau ada bagian yang terlalu putih atau terlalu hitam?
Hangat atau dingin? | Apakah putih terlihat kuning (terlalu hangat) atau kebiruan (terlalu dingin)?
Lurus? | Apakah garis meja, dinding, atau horizon miring?
Fokus ke mana? | Apa yang harus dilihat pertama kali, dan apa yang mengganggu?
:::

![Panel Lightroom versi HP: kelompok Cahaya, Warna, dan Efek.](/assets/ebook/foto-estetik-lightroom/panel-slider.svg)

## Mengenal histogram

Histogram adalah grafik kecil yang menunjukkan sebaran terang-gelap foto. Bagian kiri berarti gelap dan bagian kanan berarti terang.

- Grafik menumpuk di **kiri**: foto cenderung gelap.
- Grafik menumpuk di **kanan**: foto cenderung terang, waspadai bagian putih yang hilang detailnya.
- Grafik **menyebar** dari kiri ke kanan: kontras cukup seimbang.

:::tips
Edit dengan kecerahan layar HP di tengah, sekitar 50–70%. Kalau layar terlalu terang, kamu cenderung membuat foto terlalu gelap, dan sebaliknya.
:::$t$),
('foto-estetik-lightroom', 'urutan-edit', '02', 'Urutan edit 6 langkah', 'Urutan yang sama untuk setiap foto membuat hasilmu konsisten.', 'alur', 20, $t$Mengedit secara acak membuat setiap foto terasa berbeda. Ikuti urutan yang sama setiap kali agar hasilnya seragam dan lebih cepat.

:::sop id=lr-urutan
**Potong & luruskan**: atur rasio (4:5 untuk feed) dan luruskan garis
**Cahaya**: atur Exposure dulu, lalu Highlights dan Shadows
**Kontras**: atur Whites, Blacks, dan Contrast secukupnya
**Warna dasar**: atur Temp dan Tint sampai putih terlihat putih
**Warna detail**: atur Mix/HSL untuk warna tertentu
**Sentuhan akhir**: Texture, Clarity, Dehaze, dan Vignette tipis
:::

## Fungsi setiap slider

| Kelompok | Slider | Fungsinya |
|---|---|---|
| Cahaya | Exposure | Terang-gelap keseluruhan |
| Cahaya | Contrast | Jarak antara bagian terang dan gelap |
| Cahaya | Highlights | Bagian paling terang, turunkan untuk mengembalikan detail langit dan kain putih |
| Cahaya | Shadows | Bagian gelap, naikkan untuk melihat detail di bayangan |
| Cahaya | Whites / Blacks | Titik paling putih dan paling hitam |
| Warna | Temp / Tint | Hangat-dingin dan hijau-magenta |
| Warna | Vibrance / Saturation | Kepekatan warna; Vibrance lebih halus |
| Efek | Texture / Clarity | Ketajaman detail kecil dan sedang |
| Efek | Dehaze | Mengurangi kesan berkabut |
| Efek | Vignette | Menggelapkan atau mencerahkan tepi foto |

:::peringatan
Saturation dan Clarity mudah berlebihan. Kalau kulit terlihat oranye atau foto terlihat "kasar", turunkan kembali.
:::$t$),
('foto-estetik-lightroom', 'resep-warna', '03', 'Resep warna', 'Tiga gaya warna populer dengan angka awal yang bisa kamu sesuaikan.', 'kuas', 30, $t$Resep di bawah adalah **titik awal**, bukan angka mutlak. Setiap foto punya cahaya berbeda, jadi geser sedikit sampai terasa pas.

:::palet
#F3E6D3 | Krem hangat | Kafe, kue, fashion kasual
#FFFFFF | Putih bersih | Produk skincare, gadget, katalog
#2E2A27 | Gelap moody | Kopi, makanan malam, produk premium
:::

## Resep 1 · Krem hangat

| Slider | Angka awal |
|---|---|
| Exposure | +0,2 sampai +0,4 |
| Contrast | −10 |
| Highlights | −30 |
| Shadows | +20 |
| Temp | +8 |
| Saturation | −10 |
| Mix: Oranye | Saturation −5, Luminance +10 |
| Mix: Biru | Saturation −30 |

## Resep 2 · Putih bersih

| Slider | Angka awal |
|---|---|
| Exposure | +0,4 sampai +0,7 |
| Contrast | +5 |
| Highlights | −20 |
| Whites | +20 |
| Temp | −3 (sampai putih terlihat netral) |
| Vibrance | +5 |
| Clarity | +5 |

## Resep 3 · Gelap moody

| Slider | Angka awal |
|---|---|
| Exposure | −0,3 |
| Contrast | +15 |
| Highlights | −40 |
| Shadows | −10 |
| Blacks | −15 |
| Temp | +5 |
| Saturation | −15 |
| Vignette | −15 |

:::tips
Untuk satu feed, pilih **satu** resep saja. Gaya yang konsisten lebih penting daripada gaya yang sedang tren.
:::$t$),
('foto-estetik-lightroom', 'foto-produk', '04', 'Foto produk untuk jualan', 'Pembeli online tidak bisa memegang barang. Fotomu harus menggantikan tangan mereka.', 'tas', 40, $t$Di toko online, foto adalah pengganti tangan pembeli. Foto yang jelas mengurangi pertanyaan, mengurangi komplain, dan membuat pembeli lebih yakin.

:::banding kiri="Membuat ragu" kanan="Membuat yakin"
Warna di foto beda dengan aslinya | Warna mendekati aslinya, putih terlihat putih
Hanya satu sudut | Depan, samping, detail, dan saat dipakai
Latar ramai | Latar polos atau sesuai suasana produk
Tidak ada pembanding ukuran | Ada tangan atau benda lain sebagai skala
Terlalu banyak efek | Edit untuk memperjelas, bukan mengubah produk
:::

## Set foto lengkap

:::checklist id=lr-produk
Foto utama: produk penuh, latar bersih
Foto detail: tekstur, bahan, atau label
Foto ukuran: produk dipegang atau di samping benda pembanding
Foto dipakai: produk dalam penggunaan nyata
Foto isi paket: semua yang didapat pembeli
Semua foto diedit dengan resep yang sama
:::

:::peringatan
Jangan mengedit sampai produk terlihat berbeda dari aslinya, misalnya warna kain berubah atau noda dihapus. Pembeli yang menerima barang berbeda dari foto berhak komplain dan meminta pengembalian dana.
:::

:::tips
Cahaya terbaik dan gratis adalah jendela di pagi atau sore hari. Letakkan produk di samping jendela dan pakai kertas putih di sisi lain untuk memantulkan cahaya ke bayangan.
:::$t$),
('foto-estetik-lightroom', 'preset-sendiri', '05', 'Membuat preset sendiri', 'Simpan hasil edit terbaikmu agar bisa dipakai ulang dalam satu ketukan.', 'bintang', 50, $t$Preset adalah kumpulan pengaturan yang disimpan. Dengan preset, kamu bisa memberi gaya yang sama ke puluhan foto dalam hitungan detik.

:::langkah
Edit satu foto yang mewakili gaya feed-mu sampai benar-benar puas.
Buka menu titik tiga (⋯) lalu pilih **Buat preset** (Create Preset).
Beri nama yang jelas, misalnya "IXVII Krem Hangat".
Pilih pengaturan yang ingin disimpan. Biasanya **jangan centang** Crop, Geometri, dan perbaikan lokal agar preset bisa dipakai di foto lain.
Simpan di grup preset milikmu.
Untuk foto berikutnya, buka menu **Preset**, pilih preset buatanmu, lalu sesuaikan Exposure dan Temp sedikit.
:::

:::catatan
Nama menu bisa sedikit berbeda tergantung versi aplikasi dan bahasa yang dipakai. Alat edit dasar bisa dipakai gratis, sedangkan beberapa fitur seperti edit bagian tertentu (masking) atau sinkronisasi bisa membutuhkan langganan.
:::

## Supaya preset tetap konsisten

:::kartu
Satu sumber cahaya | Foto di tempat dan jam yang mirip agar preset bekerja sama baiknya.
Koreksi dulu | Samakan Exposure dan Temp sebelum memakai preset.
Uji di grid | Lihat 9 foto berjejer di feed. Kalau ada yang berbeda sendiri, sesuaikan.
:::

:::peringatan
Preset buatanmu boleh kamu jual. Tapi jangan menjual ulang preset buatan orang lain, baik yang dibeli maupun yang gratis, kecuali lisensinya mengizinkan.
:::$t$),
('foto-estetik-lightroom', 'latihan', '06', 'Latihan & evaluasi', 'Latihan singkat untuk melatih mata dan menguji pemahamanmu.', 'centang', 60, $t$Mata editor terlatih dengan cara membandingkan. Lakukan latihan di bawah dengan foto milikmu sendiri.

:::sop id=lr-latihan
Ambil 5 foto produk yang sama di tempat yang sama
Edit foto pertama dengan urutan 6 langkah
Simpan sebagai preset
Pakai preset di 4 foto lainnya, lalu sesuaikan sedikit
Susun kelimanya berdampingan. Apakah warnanya sudah seragam?
Bandingkan dengan foto asli. Apakah produk masih terlihat seperti aslinya?
:::

:::kuis
? Kain putih di fotomu terlihat kekuningan. Slider apa yang pertama kamu geser?
+ Temp ke arah biru (dingin)
- Saturation dinaikkan
- Clarity dinaikkan
> Kain putih yang kekuningan berarti foto terlalu hangat. Geser Temp sedikit ke arah biru sampai putih terlihat netral.
? Langit di fotomu putih polos tanpa detail. Apa yang kamu atur?
- Shadows dinaikkan
+ Highlights diturunkan
- Vignette diturunkan
> Highlights mengatur bagian paling terang. Menurunkannya bisa mengembalikan detail awan selama detail itu masih terekam.
? Kenapa Crop sebaiknya tidak disimpan di preset?
+ Karena komposisi setiap foto berbeda
- Karena Crop membuat warna berubah
- Karena preset tidak bisa menyimpan Crop
> Preset dipakai di banyak foto dengan komposisi berbeda. Crop yang ikut tersimpan bisa memotong bagian penting.
:::$t$),
('copywriting-jualan-closing', 'beli-karena-hasil', '01', 'Orang membeli hasil, bukan fitur', 'Ubah daftar spesifikasi menjadi alasan untuk membeli.', 'target', 10, $t$Penjual sering menulis apa yang ada di produknya. Pembeli ingin tahu **apa yang berubah dalam hidupnya** setelah membeli. Itu perbedaan antara fitur dan manfaat.

![Tangga fitur ke hasil: semakin naik, semakin terasa alasan untuk membeli.](/assets/ebook/copywriting-jualan-closing/tangga-manfaat.svg)

## Fitur → Manfaat → Hasil

| Fitur | Manfaat | Hasil yang dirasakan |
|---|---|---|
| Kapasitas 20.000 mAh | Bisa mengisi HP 4–5 kali | Tenang seharian di luar tanpa cari colokan |
| Akun premium bergaransi | Kalau error, diganti | Tidak takut uang hilang |
| Template Canva 30 desain | Tinggal ganti teks | Feed rapi dalam 15 menit seminggu |
| Bahan katun combed 30s | Adem dan menyerap keringat | Nyaman dipakai seharian di cuaca panas |

Cara cepat menemukan manfaat: setelah menulis fitur, tanyakan **"terus kenapa?"** dua kali.

> "Kapasitas 20.000 mAh." Terus kenapa? "Bisa isi HP 4–5 kali." Terus kenapa? "Kamu tidak perlu panik baterai habis saat perjalanan."

:::banding kiri="Fokus fitur" kanan="Fokus hasil"
"Kertas 100 gsm, ukuran A5" | "Tebal dan tidak tembus tinta, enak dibawa ke mana-mana"
"Kelas online 8 modul" | "Dalam 2 minggu kamu sudah bisa membuat poster promo sendiri"
"Netflix 1 bulan sharing" | "Nonton series favorit dengan harga sepiring nasi goreng"
:::

:::kuis
? Mana kalimat yang paling fokus pada hasil?
- Sepatu dengan sol karet 3 cm
- Sepatu tersedia ukuran 36–44
+ Jalan seharian tanpa kaki pegal
> Hasil adalah perasaan atau perubahan yang dialami pembeli. Fitur tetap disebut sebagai bukti, tapi sesudah hasilnya.
:::$t$),
('copywriting-jualan-closing', 'aida-dan-pas', '02', 'Rumus AIDA & PAS', 'Dua kerangka yang membuat tulisan jualan runtut dan mudah diikuti.', 'alur', 20, $t$Kamu tidak perlu berbakat menulis. Kamu cukup mengikuti **kerangka**. Dua kerangka yang paling sering dipakai adalah AIDA dan PAS.

## AIDA

:::alur
Attention | Hentikan guliran: hook, angka, atau pertanyaan
Interest | Buat penasaran: masalah atau fakta menarik
Desire | Buat ingin: manfaat, hasil, bukti
Action | Beri arah: cara beli, batas waktu yang nyata
:::

> **A:** Feed toko kamu masih berantakan? **I:** Ternyata pembeli menilai toko dari 9 postingan teratas. **D:** Dengan 30 template ini, feed-mu rapi dan seragam dalam 15 menit, tanpa jago desain. **A:** Ketik TEMPLATE di komentar, aku kirim katalognya.

## PAS

:::alur
Problem | Sebut masalah yang dirasakan pembeli
Agitate | Gambarkan akibatnya kalau dibiarkan, jujur dan tidak menakut-nakuti berlebihan
Solution | Tawarkan produkmu sebagai jalan keluar
:::

> **P:** Langganan streaming sendiri-sendiri bikin dompet tipis. **A:** Belum lagi kalau tiba-tiba akun tidak bisa dipakai dan uangmu tidak kembali. **S:** Paket premium bergaransi dari kami: harga lebih ringan, kalau ada kendala langsung dibantu.

:::kartu
Pakai AIDA | Untuk caption panjang, deskripsi produk, dan halaman penjualan.
Pakai PAS | Untuk konten pendek, iklan, dan produk yang menyelesaikan masalah jelas.
:::

:::tips
Tulis dulu bebas, lalu rapikan ke kerangka. Menulis sambil memikirkan rumus sering membuat tulisan kaku.
:::$t$),
('copywriting-jualan-closing', 'hook-dan-judul', '03', 'Hook & judul', 'Kalimat pertama hanya punya satu tugas: membuat orang membaca kalimat kedua.', 'megafon', 30, $t$Sebagian besar orang hanya membaca baris pertama. Kalau baris pertama tidak menarik, sisa tulisanmu tidak dibaca, sebagus apa pun isinya.

## 12 template hook

:::kartu
1. Masalah langsung | "Masih bingung [masalah]?"
2. Kesalahan | "Berhenti [kebiasaan] kalau mau [hasil]."
3. Angka | "[Angka] cara [hasil] tanpa [hal yang dibenci]."
4. Sebelum-sesudah | "Dari [kondisi buruk] jadi [kondisi baik] dalam [waktu]."
5. Rahasia kecil | "Satu hal yang jarang dibahas soal [topik]."
6. Untuk siapa | "Khusus kamu yang [kondisi spesifik]."
7. Pertanyaan | "Kenapa [hal yang membingungkan]?"
8. Perbandingan | "[A] atau [B]? Ini bedanya."
9. Cerita | "Kemarin ada pembeli yang tanya [pertanyaan]…"
10. Tantangan | "Coba [hal kecil] selama 7 hari."
11. Peringatan | "Jangan beli [produk] sebelum cek ini."
12. Hemat | "Cara dapat [hasil] dengan budget [angka]."
:::

:::peringatan
Hook yang menarik tetap harus jujur. Jangan menjanjikan hasil yang tidak bisa dibuktikan, seperti "pasti untung" atau "dijamin viral".
:::

:::kuis
? Kamu jual template feed untuk toko kue. Hook mana yang paling spesifik?
- Template bagus, harga murah!
+ Khusus kamu yang jualan kue rumahan: feed rapi tanpa sewa desainer
- Ayo beli template sekarang juga
> Hook yang menyebut siapa dan hasil apa membuat orang merasa diajak bicara langsung.
:::$t$),
('copywriting-jualan-closing', 'caption-yang-menjual', '04', 'Caption yang menjual', 'Struktur caption yang mudah dibaca di layar HP.', 'pena', 40, $t$Caption yang panjang tetap bisa dibaca sampai habis asalkan **mudah dipindai**: paragraf pendek, ada jeda, dan jelas ujungnya.

## Struktur caption

:::langkah
**Hook** di baris pertama, maksimal satu kalimat.
**Konteks** 1–2 kalimat: kenapa ini penting.
**Isi** berupa poin atau langkah, satu baris satu ide.
**Bukti**: hasil, cerita pembeli asli, atau detail produk.
**Ajakan** yang spesifik: "Klik link di bio", "Ketik MAU", "DM kata TEMPLATE".
:::

## Contoh sebelum dan sesudah

:::banding kiri="Sebelum" kanan="Sesudah"
"Ready template Canva kak, harga murah, minat DM" | "Feed toko kamu masih belang-belang? 😅"
(tidak ada konteks) | "Pembeli menilai tokomu dari 9 postingan teratas."
(tidak ada manfaat) | "30 template ini bikin feed seragam: ganti teks, selesai."
(tidak ada bukti) | "Sudah dipakai 40+ toko kue (angka asli dari penjualanmu)."
"Minat DM" | "Ketik TEMPLATE di komentar, aku kirim contohnya."
:::

:::checklist id=cw-caption
Baris pertama bisa berdiri sendiri dan membuat penasaran
Paragraf maksimal 2–3 baris
Ada manfaat, bukan hanya fitur
Ada bukti yang jujur
Ajakan spesifik dan hanya satu
Sudah dibaca ulang di layar HP
:::

:::tips
Bacakan caption-mu dengan suara keras. Kalau ada kalimat yang membuatmu tersandung, sederhanakan.
:::$t$),
('copywriting-jualan-closing', 'chat-closing', '05', 'Chat closing di WhatsApp', 'Penjualan paling sering terjadi di chat. Jawab dengan membantu, bukan mendesak.', 'chat', 50, $t$Banyak calon pembeli hilang di chat bukan karena harganya, tapi karena balasannya lambat, kaku, atau tidak membantu mereka memutuskan.

## "Harganya berapa?"

Jawab harganya langsung, lalu bantu memilih. Jangan memancing dengan "boleh tahu buat apa dulu?" tanpa menyebut harga.

:::chat
Pembeli: Kak, Canva Pro berapa?
Kamu: Halo Kak! Canva Pro 1 bulan Rp25.000, 3 bulan Rp60.000. Semua bergaransi selama masa aktif 😊
Kamu: Kakak pakainya untuk desain jualan sendiri atau untuk tim?
Pembeli: Sendiri aja kak, buat feed olshop.
Kamu: Kalau rutin bikin feed, yang 3 bulan lebih hemat Rp15.000. Mau aku buatkan pesanannya?
:::

*Harga di contoh percakapan hanya ilustrasi. Pakai harga tokomu sendiri.*

## "Mahal, kak"

Jangan langsung banting harga. Jelaskan nilainya, lalu tawarkan pilihan yang lebih sesuai.

:::chat
Pembeli: Agak mahal ya kak.
Kamu: Paham, Kak. Bedanya, di sini akunnya bergaransi, jadi kalau ada kendala diganti tanpa biaya tambahan.
Kamu: Kalau mau coba dulu, ada paket 1 bulan Rp25.000. Nanti kalau cocok bisa lanjut paket hemat.
:::

## "Nanti dulu ya"

:::chat
Pembeli: Nanti dulu deh kak, mikir-mikir.
Kamu: Siap, Kak, santai aja. Aku kirim ringkasan harganya biar gampang dicek nanti ya.
Kamu: Kalau ada yang mau ditanyakan, langsung chat aku saja 🙏
:::

:::banding kiri="Mendesak" kanan="Membantu"
"Buruan kak, nanti nyesel!" | Beri informasi yang dibutuhkan untuk memutuskan
Follow-up setiap jam | Follow-up sekali, 1–2 hari kemudian
Banting harga di chat pertama | Tawarkan paket yang lebih sesuai kebutuhan
:::$t$),
('copywriting-jualan-closing', 'penawaran-dan-etika', '06', 'Penawaran yang jujur', 'Urgensi asli, bukti asli, dan janji yang bisa ditepati.', 'perisai', 60, $t$Copywriting yang baik membuat orang **paham dan yakin**. Copywriting yang buruk membuat orang membeli lalu menyesal. Yang pertama membangun pelanggan setia, yang kedua menghasilkan komplain.

## Penawaran yang kuat

:::kartu
Jelas | Apa yang didapat, berapa harganya, dan bagaimana cara mendapatkannya.
Bernilai | Bonus atau paket yang benar-benar berguna, bukan sekadar menambah jumlah.
Aman | Garansi, kebijakan refund, atau cara komplain yang jelas.
Mendesak dengan alasan nyata | Stok terbatas atau promo berakhir di tanggal tertentu, dan memang benar begitu.
:::

:::peringatan
Hindari: harga coret yang tidak pernah berlaku, hitung mundur yang terus diulang, testimoni karangan, angka "terjual" palsu, dan janji hasil seperti "pasti untung". Selain merusak kepercayaan, praktik seperti ini bisa melanggar aturan platform dan perlindungan konsumen.
:::

## Checklist sebelum posting

:::checklist id=cw-etika
Semua angka (harga, terjual, rating) adalah angka asli
Testimoni berasal dari pembeli asli dan dipakai dengan izin
Batas waktu promo sesuai kenyataan
Syarat dan ketentuan ditulis jelas
Janji hasil realistis dan bisa kupertanggungjawabkan
Ada cara menghubungi kalau pembeli punya kendala
:::

:::kuis
? Promo sudah berakhir, tapi penjualan masih ramai. Apa yang paling tepat?
- Pasang hitung mundur baru dengan promo yang sama tanpa pengumuman
+ Umumkan jujur bahwa promo diperpanjang, atau buat promo baru dengan alasan yang jelas
- Biarkan banner "berakhir hari ini" terus tampil
> Memperpanjang promo boleh, asalkan disampaikan jujur. Hitung mundur palsu membuat pembeli tidak percaya pada promo berikutnya.
:::

:::kutipan
Tulisan jualan terbaik terdengar seperti teman yang paham produknya dan jujur soal kekurangannya.
:::$t$),
('ai-kerja-cepat', 'cara-kerja-ai', '01', 'Cara kerja AI & batasnya', 'AI itu asisten yang cepat dan pintar menulis, tapi tetap perlu kamu periksa.', 'kilau', 10, $t$AI chat seperti ChatGPT, Claude, dan Gemini bekerja dengan menebak rangkaian kata yang paling masuk akal berdasarkan permintaanmu dan pola yang ia pelajari. Karena itu, AI sangat baik untuk **menulis, merangkum, dan memberi ide**, tapi bisa keliru soal fakta.

:::kartu
Sangat membantu | Draf tulisan, ide konten, merapikan kalimat, merangkum dokumen, menerjemahkan, menjelaskan konsep, membuat rumus spreadsheet.
Perlu dicek | Angka, harga, tanggal, aturan, nama orang, kutipan, dan informasi terbaru.
Sebaiknya jangan | Menyerahkan keputusan penting tanpa dicek, atau memasukkan data rahasia orang lain.
:::

## Kenapa AI bisa salah?

AI tidak selalu "mencari" jawaban seperti mesin pencari. Kalau tidak tahu, ia bisa membuat jawaban yang terdengar meyakinkan tapi keliru. Beberapa aplikasi AI punya fitur pencarian web, tapi hasilnya tetap perlu kamu cek ke sumber aslinya.

:::peringatan
Jangan memasukkan password, nomor kartu, data pribadi pembeli, atau dokumen rahasia kantor ke AI publik. Hapus atau samarkan data sensitif sebelum meminta bantuan.
:::

:::tips
Anggap AI sebagai karyawan baru yang cepat dan rajin. Beri arahan yang jelas, periksa hasil kerjanya, dan beri masukan kalau kurang tepat.
:::

:::kuis
? Tugas mana yang paling cocok diserahkan ke AI tanpa banyak cek?
+ Membuat 10 variasi judul untuk caption
- Menentukan aturan pajak terbaru untuk tokomu
- Menulis harga produk kompetitor hari ini
> Variasi judul adalah tugas kreatif yang mudah kamu nilai sendiri. Aturan dan harga terbaru harus dicek ke sumber resmi.
:::$t$),
('ai-kerja-cepat', 'anatomi-prompt', '02', 'Anatomi prompt', 'Jawaban yang bagus datang dari permintaan yang jelas.', 'pena', 20, $t$Prompt adalah pesan atau perintah yang kamu kirim ke AI. Semakin jelas prompt-mu, semakin sedikit kamu perlu mengulang.

![Lima bagian prompt yang lengkap: peran, tugas, konteks, format, dan contoh.](/assets/ebook/ai-kerja-cepat/anatomi-prompt.svg)

| Bagian | Pertanyaannya | Contoh |
|---|---|---|
| Peran | AI berperan sebagai siapa? | "Kamu copywriter untuk toko online" |
| Tugas | Apa yang harus dibuat? | "Tulis 5 caption Instagram" |
| Konteks | Untuk siapa dan tentang apa? | "Produk: template Canva untuk toko kue, target ibu rumah tangga" |
| Format | Bentuk hasilnya seperti apa? | "Maks. 80 kata, ada 1 emoji, akhiri dengan ajakan" |
| Contoh | Gaya seperti apa yang kamu mau? | "Gayanya santai seperti contoh ini: …" |

:::banding kiri="Prompt kurang jelas" kanan="Prompt jelas"
"Buatkan caption" | "Kamu copywriter toko online. Tulis 5 caption Instagram untuk template Canva toko kue."
(tanpa target) | "Targetnya ibu rumah tangga yang jualan kue dari rumah dan tidak jago desain."
(tanpa format) | "Maks. 80 kata, bahasa santai, 1 emoji, akhiri dengan ajakan ketik TEMPLATE."
(tanpa contoh) | "Gaya bahasanya seperti ini: 'Feed rapi tanpa ribet, cukup ganti teks.'"
:::

## Memperbaiki jawaban

Jarang ada jawaban sempurna di percobaan pertama. Lanjutkan percakapan dengan perbaikan yang spesifik:

- "Lebih singkat, maksimal 50 kata."
- "Bahasanya kurang santai, ubah seperti ngobrol dengan teman."
- "Nomor 3 bagus. Buat 5 variasi lain dengan gaya seperti nomor 3."
- "Hapus klaim yang tidak bisa dibuktikan."
- "Tanyakan dulu ke aku informasi apa yang kamu butuhkan sebelum menulis."

:::tips
Prompt terakhir di atas sangat berguna untuk tugas besar. Biarkan AI bertanya dulu, jawab pertanyaannya, baru minta hasil.
:::$t$),
('ai-kerja-cepat', 'prompt-konten', '03', 'Prompt untuk konten', 'Ide, caption, naskah video, dan carousel dalam hitungan menit.', 'katalog', 30, $t$Salin prompt di bawah, lalu ganti bagian dalam kurung siku **[ … ]** dengan informasi bisnismu.

### Bank ide 30 hari
> Kamu ahli strategi konten untuk [jenis bisnis]. Targetku [target pembeli]. Buat 30 ide konten untuk sebulan dengan 4 pilar: edukasi, cerita, bukti, dan penawaran. Tampilkan dalam tabel: hari, pilar, judul konten, format (carousel/Reels/story).

### Caption dengan rumus
> Tulis 3 caption Instagram untuk [produk] memakai rumus PAS (masalah, akibat, solusi). Target: [target]. Bahasa santai, maks. 100 kata, tanpa klaim berlebihan, akhiri dengan ajakan [ajakan].

### Naskah Reels 30 detik
> Buat naskah video pendek 30 detik tentang [topik]. Format: hook 3 detik, 3 poin isi, ajakan penutup. Tulis juga teks yang muncul di layar dan saran B-roll untuk setiap bagian.

### Carousel edukasi
> Ubah topik "[topik]" menjadi carousel 6 slide. Slide 1 hook, slide 2–5 satu poin per slide (maks. 25 kata), slide 6 ringkasan dan ajakan. Beri saran visual untuk setiap slide.

### Mengubah satu konten jadi banyak
> Ini caption-ku: "[tempel caption]". Ubah menjadi: 1 naskah Reels, 3 story, 1 tweet/thread pendek, dan 1 pesan broadcast WhatsApp.

:::catatan
AI tidak tahu konten apa yang sedang ramai hari ini kecuali ia punya akses pencarian. Untuk tren, cek langsung di aplikasinya, lalu minta AI membantu menyesuaikan dengan bisnismu.
:::

:::checklist id=ai-konten
Aku sudah mencoba prompt bank ide untuk bisnisku
Aku menyimpan 3 caption terbaik sebagai contoh gaya
Aku mencoba mengubah satu caption menjadi banyak format
Aku memeriksa semua klaim dan angka sebelum posting
:::$t$),
('ai-kerja-cepat', 'prompt-jualan', '04', 'Prompt untuk jualan & layanan pelanggan', 'Deskripsi produk, balasan chat, dan penanganan komplain.', 'tas', 40, $t$AI sangat membantu untuk menyiapkan **template balasan** yang konsisten. Kamu tetap yang mengirim dan menyesuaikannya ke setiap pembeli.

### Deskripsi produk marketplace
> Tulis deskripsi produk untuk marketplace. Produk: [nama]. Fitur: [daftar fitur]. Target: [target]. Struktur: kalimat pembuka manfaat, 5 poin manfaat, spesifikasi, isi paket, cara pakai, garansi. Jangan tambahkan fitur yang tidak kusebut.

### Template balasan chat
> Aku jualan [produk] lewat WhatsApp. Buat template balasan yang ramah dan singkat untuk situasi berikut: tanya harga, minta diskon, tanya cara bayar, tanya garansi, belum membalas setelah ditawari. Gaya bahasa: sopan, santai, pakai "Kak".

### Menangani komplain
> Pembeli komplain: "[isi komplain]". Kebijakanku: [kebijakan garansi/refund]. Tulis balasan yang meminta maaf dengan tulus, menjelaskan langkah penyelesaian sesuai kebijakan, dan tidak menyalahkan pembeli.

## Contoh hasil

:::chat
Pembeli: Kak, akunnya kok nggak bisa login?
Kamu: Mohon maaf atas kendalanya, Kak 🙏 Boleh kirim tangkapan layar pesan error-nya?
Kamu: Sesuai garansi, akan kami cek dan ganti paling lambat 1×24 jam kalau memang dari akun kami.
Pembeli: Ini kak screenshot-nya.
Kamu: Terima kasih, Kak. Sudah kami terima dan sedang diproses. Nanti aku kabari di chat ini ya.
:::

:::peringatan
Saat menempel chat pembeli ke AI, hapus nama, nomor HP, email, dan alamat. Cukup tempel isi masalahnya.
:::$t$),
('ai-kerja-cepat', 'prompt-kerja-harian', '05', 'Prompt untuk kerjaan harian', 'Merangkum, menulis email, rumus spreadsheet, dan belajar hal baru.', 'layar', 50, $t$### Merangkum dokumen
> Rangkum teks berikut menjadi 5 poin utama dan 3 tindakan yang perlu kulakukan. Gunakan bahasa sederhana. Teks: [tempel teks].

### Email profesional
> Tulis email singkat dan sopan ke [penerima] untuk [tujuan]. Poin yang harus ada: [poin]. Nada: profesional tapi hangat. Maks. 120 kata, beri 2 pilihan subjek email.

### Rumus spreadsheet
> Di Google Sheets, kolom A berisi tanggal, kolom B nama produk, kolom C jumlah, dan kolom D harga. Buatkan rumus untuk menghitung total penjualan per produk di bulan ini, lalu jelaskan cara kerjanya langkah demi langkah.

### Belajar konsep baru
> Jelaskan [konsep] seolah aku pemula. Pakai analogi sehari-hari, beri 1 contoh, lalu buat 3 soal latihan beserta jawabannya.

### Merencanakan minggu
> Ini daftar pekerjaanku minggu ini: [daftar]. Waktu kerjaku [jam] per hari. Susun jadwal Senin–Jumat, kelompokkan pekerjaan yang mirip, dan beri tanda mana yang paling penting.

:::kartu
Cek rumus | Coba rumus di beberapa baris contoh sebelum dipakai di data asli.
Cek ringkasan | Bandingkan ringkasan dengan dokumen aslinya, terutama angka dan tanggal.
Cek email | Pastikan nama, tanggal, dan janji di email memang benar.
:::

:::tips
Simpan prompt yang sering kamu pakai di catatan HP. Lama-lama kamu punya pustaka prompt pribadi yang sesuai dengan pekerjaanmu.
:::$t$),
('ai-kerja-cepat', 'alur-kerja-aman', '06', 'Alur kerja AI yang aman', 'Kebiasaan yang membuat AI benar-benar menghemat waktu, bukan menambah masalah.', 'perisai', 60, $t$AI paling berguna kalau dipakai dalam alur kerja yang jelas: kamu menentukan arah, AI membuat draf, dan kamu yang memeriksa serta memutuskan.

:::alur
Tentukan tujuan | Apa hasil akhirnya dan untuk siapa
Beri konteks | Pakai rumus 5 bagian prompt
Minta draf | Minta beberapa variasi sekaligus
Periksa | Cek fakta, angka, nada bahasa, dan klaim
Sesuaikan | Edit dengan gaya dan pengetahuanmu sendiri
:::

## Checklist keamanan

:::checklist id=ai-aman
Aku tidak memasukkan password, nomor kartu, atau data pribadi orang lain
Aku memeriksa fakta, angka, dan aturan ke sumber resmi
Aku tidak menyalin mentah-mentah karya orang lain lewat AI
Aku membaca ulang setiap tulisan AI sebelum dikirim atau diposting
Aku tetap bertanggung jawab atas apa yang kuposting
Aku mengikuti aturan kantor atau klien soal penggunaan AI
:::

:::kuis
? AI memberi angka statistik yang sangat meyakinkan untuk caption-mu. Apa yang kamu lakukan?
- Langsung pakai, karena AI pasti benar
+ Cek ke sumber aslinya dulu, atau hapus angka itu
- Ganti angkanya supaya lebih besar
> AI bisa membuat angka yang terdengar benar tapi keliru. Angka tanpa sumber yang jelas lebih baik tidak dipakai.
? Cara terbaik meminta AI menulis dengan gayamu?
+ Beri contoh tulisanmu sendiri dan minta AI meniru gayanya
- Minta AI "menulis dengan bagus"
- Ulang prompt yang sama berkali-kali
> Contoh adalah petunjuk paling kuat. AI lebih mudah meniru gaya yang ia lihat langsung.
:::

:::kutipan
AI tidak menggantikan orang yang bekerja. AI menggantikan pekerjaan berulang yang sebelumnya menghabiskan waktunya.
:::$t$),
('kalender-konten-30-hari', 'pilar-konten', '01', 'Empat pilar konten', 'Fondasi kalender: konten apa yang dibuat dan berapa porsinya.', 'katalog', 10, $t$Setiap ide di kalender ini masuk ke salah satu dari empat pilar. Dengan pilar, kontenmu tidak hanya berisi jualan, sehingga orang tetap tertarik mengikuti akunmu.

![Porsi empat pilar konten dalam sebulan.](/assets/ebook/kalender-konten-30-hari/pilar-konten.svg)

:::kartu
Edukasi · 40% | Tips, cara, kesalahan umum, perbandingan. Tujuannya membuat orang merasa terbantu dan menyimpan kontenmu.
Cerita · 20% | Di balik layar, perjalanan usaha, keseharian. Tujuannya membuat orang merasa kenal.
Bukti · 20% | Ulasan pembeli asli, hasil, proses pengerjaan, unboxing. Tujuannya membangun kepercayaan.
Penawaran · 20% | Produk, promo, cara order, bundling. Tujuannya mengarahkan orang untuk membeli.
:::

## Cara memakai kalender ini

:::langkah
Baca ide setiap hari, lalu ganti contoh dengan produk atau jasamu.
Kalau satu ide belum cocok, tukar dengan ide lain di pilar yang sama.
Siapkan konten minggu depan setiap akhir pekan (batch).
Centang hari yang sudah diposting. Progres tersimpan otomatis.
Di akhir bulan, lakukan evaluasi di Bab 06.
:::

## Format konten

| Format | Cocok untuk |
|---|---|
| Carousel | Edukasi bertahap, daftar tips, perbandingan |
| Reels/TikTok | Hook cepat, sebelum-sesudah, tutorial singkat |
| Story | Polling, tanya jawab, promo harian, di balik layar |
| Foto tunggal | Produk, kutipan, ulasan pembeli |

:::tips
Kalau waktumu terbatas, posting 3–4 kali seminggu dari kalender ini dan pakai sisanya sebagai cadangan ide.
:::$t$),
('kalender-konten-30-hari', 'minggu-1', '02', 'Minggu 1 · Perkenalan', 'Buat orang tahu siapa kamu, apa yang kamu jual, dan kenapa harus percaya.', 'bendera', 20, $t$Minggu pertama fokus pada **perkenalan**. Orang baru yang mampir ke akunmu harus langsung paham apa yang kamu tawarkan.

:::kalender id=kk-m1
Hari 1 | Cerita | Perkenalan: siapa kamu, jual apa, dan kenapa memulai
Hari 2 | Edukasi | 3 hal yang perlu dicek sebelum membeli [jenis produkmu]
Hari 3 | Bukti | Proses pengemasan atau pengerjaan pesanan (video 15 detik)
Hari 4 | Edukasi | Kesalahan yang sering dilakukan pembeli [jenis produk]
Hari 5 | Penawaran | Produk terlaris + cara order langkah demi langkah
Hari 6 | Cerita | Di balik layar: tempat kerja, alat, atau rutinitas pagi
Hari 7 | Bukti | Ulasan pembeli asli (minta izin dulu) + ucapan terima kasih
:::

## Hook minggu ini

- "Halo, aku [nama], dan ini alasan aku mulai jualan [produk]."
- "Sebelum beli [produk], cek 3 hal ini dulu."
- "Begini cara kami menyiapkan pesananmu."
- "Pembeli paling sering salah di bagian ini."

:::tips
Sematkan (pin) postingan Hari 1 dan Hari 5 di profil. Keduanya menjawab pertanyaan orang baru: kamu siapa dan cara membeli bagaimana.
:::$t$),
('kalender-konten-30-hari', 'minggu-2', '03', 'Minggu 2 · Edukasi & kepercayaan', 'Tunjukkan bahwa kamu paham produkmu dan peduli pada pembeli.', 'lampu', 30, $t$Minggu kedua memperdalam **edukasi**. Konten edukasi yang bagus sering disimpan dan dibagikan, sehingga menjangkau orang baru.

:::kalender id=kk-m2
Hari 8 | Edukasi | Perbandingan: [pilihan A] vs [pilihan B], mana yang cocok untukmu
Hari 9 | Cerita | Kesalahan terbesarmu saat memulai usaha dan pelajarannya
Hari 10 | Edukasi | Cara merawat atau memakai [produk] agar awet
Hari 11 | Bukti | Sebelum-sesudah atau hasil pemakaian dari pembeli asli
Hari 12 | Penawaran | Paket hemat atau bundling untuk kebutuhan tertentu
Hari 13 | Edukasi | Mitos vs fakta seputar [produk/industri]
Hari 14 | Cerita | Tanya jawab di story: kumpulkan pertanyaan pengikut
:::

## Hook minggu ini

- "[A] atau [B]? Ini bedanya yang jarang dibahas."
- "Kesalahan yang hampir bikin aku berhenti jualan."
- "Biar [produk] awet, lakukan ini."
- "Mitos: [mitos]. Faktanya…"

:::catatan
Simpan jawaban dari Hari 14. Pertanyaan pengikut adalah bahan konten edukasi untuk minggu-minggu berikutnya.
:::$t$),
('kalender-konten-30-hari', 'minggu-3', '04', 'Minggu 3 · Bukti & interaksi', 'Ajak pengikut terlibat dan tampilkan hasil nyata.', 'orang', 40, $t$Minggu ketiga fokus pada **bukti dan interaksi**. Orang lebih percaya pada pengalaman pembeli lain daripada kata-kata penjual.

:::kalender id=kk-m3
Hari 15 | Bukti | Kumpulan ulasan asli minggu ini (dengan izin pembeli)
Hari 16 | Edukasi | Jawab 3 pertanyaan pengikut dari Hari 14
Hari 17 | Cerita | Hari biasa di usahamu dari pagi sampai malam
Hari 18 | Penawaran | Produk yang jarang diketahui + manfaat utamanya
Hari 19 | Edukasi | Tutorial singkat memakai produk (Reels 30 detik)
Hari 20 | Bukti | Unboxing pesanan pembeli atau proses packing besar
Hari 21 | Cerita | Polling di story: produk apa yang ingin dihadirkan berikutnya
:::

## Hook minggu ini

- "Ini kata mereka setelah mencoba [produk]."
- "Kalian tanya, aku jawab."
- "Produk ini jarang dilirik, padahal…"
- "Satu menit cara pakai [produk] yang benar."

:::peringatan
Gunakan hanya ulasan asli dan minta izin sebelum menampilkan nama atau foto pembeli. Jangan membuat ulasan sendiri atau menyuruh teman menulis ulasan palsu.
:::$t$),
('kalender-konten-30-hari', 'minggu-4', '05', 'Minggu 4 · Penawaran & penutup bulan', 'Saatnya mengajak membeli, dengan promo yang jujur.', 'megafon', 50, $t$Minggu keempat adalah waktu yang pas untuk **penawaran**, karena pengikut sudah mengenal dan lebih percaya padamu. Dua hari bonus di akhir menutup bulan dengan rapi.

:::kalender id=kk-m4
Hari 22 | Edukasi | Cara memilih [produk] sesuai kebutuhan dan budget
Hari 23 | Penawaran | Pengumuman promo akhir bulan + tanggal berakhirnya
Hari 24 | Bukti | Ulasan pembeli yang membeli paket promo sebelumnya
Hari 25 | Cerita | Kenapa kamu membuat promo ini (alasan yang jujur)
Hari 26 | Penawaran | Pengingat promo: sisa waktu atau sisa stok yang asli
Hari 27 | Edukasi | FAQ: jawaban untuk pertanyaan yang paling sering muncul
Hari 28 | Penawaran | Hari terakhir promo + cara order cepat
Hari 29 | Cerita | Terima kasih untuk pembeli bulan ini + rekap singkat
Hari 30 | Edukasi | Bocoran rencana bulan depan + polling ide
:::

## Hook minggu ini

- "Bingung pilih yang mana? Ini panduannya."
- "Promo akhir bulan dimulai hari ini, berakhir [tanggal]."
- "Tinggal [jumlah asli] stok untuk harga promo."
- "Terima kasih sudah belanja bulan ini 🙏"

:::peringatan
Sebut tanggal berakhir dan sisa stok yang sebenarnya. Kalau promo diperpanjang, umumkan dengan jujur.
:::$t$),
('kalender-konten-30-hari', 'ukur-dan-ulangi', '06', 'Ukur & ulangi', 'Lihat konten mana yang bekerja, lalu buat lebih banyak yang seperti itu.', 'grafik', 60, $t$Kalender ini bisa dipakai berulang kali. Setiap bulan, ganti ide yang kurang berhasil dengan variasi dari ide yang paling berhasil.

## Metrik yang perlu dilihat

| Metrik | Artinya | Pilar yang biasanya kuat |
|---|---|---|
| Jangkauan | Berapa banyak orang yang melihat | Edukasi, Reels |
| Disimpan | Kontenmu dianggap berguna | Edukasi |
| Dibagikan | Orang ingin teman mereka melihat | Edukasi, cerita |
| Komentar & DM | Orang tertarik bicara denganmu | Cerita, penawaran |
| Klik link & pesanan | Konten mendorong pembelian | Penawaran, bukti |

## Evaluasi bulanan

:::checklist id=kk-evaluasi
Aku mencatat 3 konten dengan jangkauan tertinggi
Aku mencatat 3 konten dengan simpanan dan DM terbanyak
Aku tahu pilar mana yang paling disukai pengikut
Aku tahu format mana yang paling sering ditonton (carousel/Reels/story)
Aku mengganti 5 ide terlemah dengan variasi ide terbaik
Aku menyiapkan konten minggu pertama bulan depan
:::

:::kuis
? Konten edukasi banyak disimpan, tapi DM sepi. Apa yang sebaiknya dicoba?
+ Tambahkan ajakan yang jelas di akhir konten edukasi, misalnya "DM kata TIPS untuk dapat panduan lengkap"
- Berhenti membuat konten edukasi
- Posting penawaran setiap hari
> Konten edukasi sudah berhasil menarik perhatian. Ajakan yang jelas membantu mengubah perhatian itu menjadi percakapan.
? Mana yang paling menunjukkan konten dianggap berguna?
- Jumlah like
+ Jumlah disimpan
- Jumlah hashtag
> Orang menyimpan konten yang ingin mereka buka lagi. Itu tanda konten edukasimu bernilai.
:::$t$),
('jualan-produk-digital', 'produk-yang-dicari', '01', 'Produk digital apa yang dicari orang', 'Pilih jenis produk yang cocok dengan keahlianmu dan kebutuhan pembeli.', 'lampu', 10, $t$Produk digital adalah produk yang dikirim dalam bentuk file, akses, atau tautan. Sekali dibuat, ia bisa dijual berkali-kali. Bukan berarti mudah: tetap harus berguna, rapi, dan dipasarkan.

:::kartu
Ebook & panduan | Menjelaskan cara melakukan sesuatu langkah demi langkah. Cocok untuk keahlian yang bisa ditulis.
Template | Desain Canva, CV, proposal, spreadsheet keuangan, planner Notion. Pembeli menghemat waktu.
Preset & filter | Preset Lightroom, LUT video, filter. Cocok untuk fotografer dan editor.
Kelas online | Video atau sesi langsung. Nilainya tinggi, tapi membuatnya butuh waktu lebih lama.
Printable | Lembar kerja anak, kalender, planner untuk dicetak sendiri.
Aset kreatif | Font, ikon, ilustrasi, sound effect, mockup.
:::

## Cara menemukan ide yang dicari

:::langkah
Tulis 10 pertanyaan yang paling sering ditanyakan orang kepadamu.
Cari kata kunci topikmu di marketplace digital, YouTube, dan TikTok. Lihat produk apa yang sudah ada dan ulasan apa yang ditulis pembelinya.
Baca ulasan bintang 3: di sanalah pembeli menulis apa yang **kurang** dari produk yang ada.
Pilih satu masalah spesifik yang bisa kamu bantu selesaikan lebih baik.
:::

:::tips
Produk yang sudah banyak dijual bukan tanda kamu terlambat. Itu tanda ada pembelinya. Tugasmu adalah membuat versi yang lebih jelas, lebih spesifik, atau lebih cocok untuk kelompok tertentu.
:::

:::kuis
? Kamu jago membuat laporan keuangan di Google Sheets. Produk apa yang paling cepat dibuat?
+ Template spreadsheet keuangan UMKM siap pakai beserta panduan singkat
- Kelas online 20 jam tentang akuntansi
- Aplikasi keuangan buatan sendiri
> Template bisa dibuat dalam hitungan hari dan langsung menghemat waktu pembeli. Kelas dan aplikasi bisa jadi langkah berikutnya.
:::$t$),
('jualan-produk-digital', 'validasi-ide', '02', 'Validasi sebelum membuat', 'Pastikan ada yang mau membayar sebelum kamu menghabiskan berminggu-minggu.', 'target', 20, $t$Kesalahan paling mahal adalah membuat produk selama sebulan, lalu ternyata tidak ada yang membeli. Validasi adalah cara murah untuk menguji ide **sebelum** dibuat lengkap.

:::alur
Tanya | Polling story atau tanya langsung ke 10 orang target
Tawarkan | Halaman sederhana dengan daftar isi dan harga
Pra-pesan | Buka pre-order atau daftar tunggu dengan harga awal
Putuskan | Lanjut kalau ada yang pesan, ubah kalau sepi
:::

## Contoh percakapan validasi

:::chat
Kamu: Kak Sinta, aku lagi bikin template spreadsheet untuk catat stok dan untung toko online. Boleh tanya sebentar?
Sinta: Boleh dong.
Kamu: Sekarang Kakak catat stok pakai apa? Bagian mana yang paling bikin repot?
Sinta: Pakai buku tulis. Paling repot hitung untung per produk.
Kamu: Kalau ada template yang otomatis menghitung untung per produk, Kakak tertarik beli di harga sekitar Rp35.000?
Sinta: Kalau gampang dipakai di HP, mau sih.
:::

Perhatikan: kamu bertanya soal **masalah** dulu, baru soal produk dan harga. Jawaban "mau sih" juga belum sama dengan membeli, jadi tetap uji dengan pre-order.

:::checklist id=pd-validasi
Aku sudah bicara dengan minimal 10 calon pembeli
Aku tahu masalah utama yang ingin mereka selesaikan
Aku sudah membuat daftar isi atau gambaran produk
Aku sudah menguji harga dengan pre-order atau daftar tunggu
Minimal ada beberapa orang yang benar-benar membayar atau mendaftar
:::

:::catatan
Kalau memakai pre-order, tulis tanggal rilis dengan jelas dan tepati. Kalau batal, kembalikan uang pembeli sepenuhnya.
:::$t$),
('jualan-produk-digital', 'versi-pertama', '03', 'Versi pertama dalam 7 hari', 'Selesai lebih baik daripada sempurna. Rilis, dengarkan, lalu perbaiki.', 'roket', 30, $t$Versi pertama tidak harus lengkap. Yang penting **menyelesaikan satu masalah dengan baik**. Kamu bisa menambah bab, template, atau bonus di versi berikutnya, dan pembeli awal biasanya mendapat pembaruannya gratis.

:::garis-waktu
Hari 1 | Tulis janji produk dalam satu kalimat dan daftar isi
Hari 2 | Kumpulkan bahan: catatan, contoh, tangkapan layar
Hari 3–4 | Buat isi utama: tulis bab atau desain template
Hari 5 | Rapikan tampilan: sampul, font, warna yang konsisten
Hari 6 | Uji ke 2–3 orang: apakah mudah dipahami dan dipakai?
Hari 7 | Perbaiki dari masukan, siapkan halaman penjualan
:::

## Alat yang cukup untuk memulai

:::kartu
Menulis | Google Docs, Notion, atau Canva untuk ebook bergambar.
Desain | Canva atau Figma untuk sampul, template, dan mockup.
Video | CapCut atau OBS untuk kelas dan tutorial.
Pengiriman | Google Drive dengan tautan, platform jualan digital, atau rak ebook di website.
:::

:::sop id=pd-buat
Janji produk sudah ditulis dalam satu kalimat
Daftar isi sudah final untuk versi pertama
Isi utama selesai dan sudah dibaca ulang
Sampul dan tampilan rapi serta konsisten
Sudah diuji oleh 2–3 orang
Masukan penting sudah diperbaiki
:::$t$),
('jualan-produk-digital', 'harga-yang-menjual', '04', 'Harga yang menjual', 'Harga bukan hanya biaya. Harga adalah cara pembeli menilai nilai produkmu.', 'koin', 40, $t$Produk digital hampir tidak punya biaya produksi per unit, jadi harga ditentukan oleh **nilai bagi pembeli** dan **harga pasar**, bukan oleh modal.

![Tangga harga: dari produk gratis sampai produk premium.](/assets/ebook/jualan-produk-digital/tangga-harga.svg)

## Tangga harga

| Tingkat | Contoh | Fungsi |
|---|---|---|
| Gratis | Checklist PDF, 3 template contoh | Mengumpulkan calon pembeli dan membangun kepercayaan |
| Pembuka (±Rp15.000–50.000) | Ebook singkat, paket preset kecil | Pembelian pertama yang ringan |
| Utama (±Rp50.000–200.000) | Paket template lengkap, ebook interaktif | Produk andalan |
| Premium (±Rp200.000 ke atas) | Kelas, mentoring, paket lengkap | Untuk pembeli yang ingin hasil lebih cepat |

:::catatan
Rentang harga di atas hanya gambaran. Cek harga produk sejenis, lalu sesuaikan dengan kedalaman isi dan hasil yang dijanjikan.
:::

## Strategi yang sering dipakai

:::kartu
Harga ganjil | Rp49.000 terasa lebih ringan daripada Rp50.000. Pakai secukupnya, jangan berlebihan.
Paket | Gabungkan 2–3 produk dengan harga lebih hemat daripada membeli satuan.
Harga peluncuran | Harga lebih murah untuk pembeli awal dengan batas waktu yang jelas dan jujur.
Tingkatan | Basic, Lengkap, Lengkap + bonus. Banyak orang memilih tingkat tengah.
:::

:::peringatan
Harga coret harus berasal dari harga yang benar-benar berlaku. Jangan menaikkan harga normal hanya supaya diskonnya terlihat besar.
:::

:::kuis
? Kenapa produk gratis tetap berguna di tangga harga?
+ Membuat orang mengenal kualitasmu sebelum membeli
- Karena produk gratis selalu menghasilkan uang
- Supaya pembeli tidak perlu membeli produk utama
> Produk gratis membangun kepercayaan. Orang yang terbantu oleh produk gratis lebih mungkin membeli produk berbayar.
:::$t$),
('jualan-produk-digital', 'tempat-jualan', '05', 'Tempat jualan & pengiriman', 'Pilih tempat yang memudahkan pembeli membayar dan menerima produk.', 'tas', 50, $t$Pembeli produk digital ingin dua hal: **bayar dengan mudah** dan **langsung menerima produknya**. Pilih tempat jualan yang memenuhi keduanya.

:::kartu
Website sendiri | Kendali penuh atas tampilan dan data pembeli. Butuh usaha untuk mendatangkan pengunjung.
Platform jualan digital | Pembayaran dan pengiriman otomatis. Ada potongan biaya per transaksi.
Marketplace | Banyak pengunjung, tapi aturan produk digital berbeda-beda. Cek kebijakannya dulu.
Media sosial + WhatsApp | Cepat dimulai. Pengiriman manual, jadi siapkan template pesan.
Iklan di IXVII.CO | Pasang produk digitalmu di halaman Produk Digital IXVII.CO dengan label Iklan. Pembeli diarahkan ke tautan tokomu.
:::

:::catatan
Pasang iklan produk digitalmu di [halaman Produk Digital IXVII.CO](/produk/iklan/). Pengajuan diperiksa admin sebelum tayang.
:::

## Cara mengirim produk

:::sop id=pd-kirim
Simpan file di folder khusus dengan nama yang rapi
Atur tautan agar hanya bisa dilihat, bukan diedit
Siapkan pesan pengiriman: ucapan terima kasih, tautan, cara pakai, dan kontak bantuan
Catat setiap pembeli: nama, tanggal, produk, dan cara bayar
Kirim pembaruan gratis ke pembeli lama kalau ada versi baru
:::

:::tips
Tambahkan nama pembeli di file (misalnya di halaman pertama PDF). Cara sederhana ini membuat orang berpikir dua kali sebelum menyebarkan file yang dibelinya.
:::$t$),
('jualan-produk-digital', 'peluncuran', '06', 'Peluncuran & perlindungan', 'Rencana rilis seminggu dan cara melindungi karyamu.', 'bendera', 60, $t$Peluncuran yang baik dimulai **sebelum** produk dijual. Orang yang sudah menunggu lebih mungkin membeli di hari pertama.

:::alur
H-7 | Cerita proses pembuatan, tunjukkan cuplikan isi
H-3 | Buka daftar tunggu, tunjukkan daftar isi lengkap
Hari H | Umumkan rilis, harga peluncuran, dan batas waktunya
H+3 | Tampilkan ulasan pembeli awal (asli, dengan izin)
H+7 | Pengingat terakhir harga peluncuran, lalu kembali ke harga normal
:::

## Lindungi karyamu

:::kartu
Lisensi jelas | Tulis apa yang boleh dan tidak boleh dilakukan pembeli, misalnya untuk pemakaian pribadi atau komersial.
Nama pembeli | Cantumkan nama atau email pembeli di file.
Akses terbatas | Pakai platform yang membatasi akses atau perangkat.
Bukti karya | Simpan file asli dan tanggal pembuatannya.
:::

:::peringatan
Jangan menjual ulang ebook, template, atau preset buatan orang lain, termasuk yang berlabel PLR, kecuali lisensinya jelas mengizinkan dan kamu mematuhi syaratnya. Hindari juga memakai foto, font, atau musik tanpa lisensi komersial.
:::

:::checklist id=pd-luncur
Halaman penjualan sudah menjelaskan isi, manfaat, harga, dan cara akses
Pembayaran dan pengiriman sudah diuji dengan pembelian percobaan
Lisensi pemakaian sudah ditulis
Konten H-7 sampai H+7 sudah dijadwalkan
Template pesan untuk pembeli dan pertanyaan umum sudah siap
Aku tahu cara meminta ulasan asli setelah pembeli mencoba produknya
:::

:::kutipan
Produk digital pertamamu tidak harus sempurna. Yang penting selesai, berguna, dan terus kamu perbaiki.
:::$t$),
('affiliate-pemula', 'cara-kerja-affiliate', '01', 'Cara kerja affiliate', 'Kamu mempromosikan, pembeli membeli lewat tautanmu, kamu mendapat komisi.', 'rute', 10, $t$Dalam program affiliate, kamu membantu penjual menjual produknya. Setiap pembelian yang terjadi lewat tautan atau keranjang di kontenmu menghasilkan komisi, yaitu persentase dari harga produk.

![Alur affiliate: konten, tautan produk, pembelian, lalu komisi.](/assets/ebook/affiliate-pemula/alur-affiliate.svg)

:::alur
Gabung program | Daftar program affiliate di aplikasi dan penuhi syaratnya
Pilih produk | Ambil tautan atau tambahkan produk ke etalase
Buat konten | Video atau postingan yang menunjukkan produk
Pembeli membeli | Lewat tautan atau keranjang di kontenmu
Komisi | Masuk setelah pesanan selesai dan lewat masa pengembalian
:::

## Istilah yang perlu kamu tahu

| Istilah | Artinya |
|---|---|
| Komisi | Persentase dari harga produk yang kamu dapat untuk setiap penjualan |
| Konversi | Persentase penonton atau pengunjung yang akhirnya membeli |
| Etalase / showcase | Daftar produk yang kamu promosikan di akunmu |
| Pesanan selesai | Pesanan yang sudah diterima dan tidak dikembalikan; biasanya baru dihitung komisinya |
| Pengembalian | Pesanan yang dibatalkan atau dikembalikan; komisinya biasanya batal |

:::peringatan
Jangan membeli produk sendiri lewat tautan affiliate-mu atau meminta teman membeli lalu membatalkan. Kebanyakan platform melarangnya, dan akunmu bisa ditangguhkan.
:::$t$),
('affiliate-pemula', 'pilih-produk', '02', 'Memilih produk & niche', 'Produk yang tepat membuat konten lebih mudah dibuat dan lebih dipercaya.', 'target', 20, $t$Kesalahan umum pemula adalah mempromosikan semua produk yang komisinya besar. Akibatnya, akun terlihat seperti katalog acak dan penonton tidak percaya.

## Pilih niche dulu

:::kartu
Rumah & dapur | Alat masak, penyimpanan, kebersihan. Mudah didemonstrasikan.
Kecantikan & perawatan | Skincare, makeup, perawatan rambut. Butuh kejujuran ekstra soal hasil.
Gadget & aksesori | Charger, earphone, tripod, aksesori HP. Cocok untuk review perbandingan.
Fashion | Pakaian, tas, sepatu. Cocok untuk konten "cara padu padan".
Bayi & anak | Perlengkapan bayi, mainan edukasi. Pembeli sangat teliti dan butuh rasa aman.
Hobi & olahraga | Alat olahraga, perlengkapan hobi. Komunitasnya loyal.
:::

## Kriteria produk yang layak dipromosikan

:::checklist id=af-produk
Rating produk baik dan ulasan pembelinya masuk akal
Toko punya reputasi baik dan respons cepat
Harga wajar dibandingkan produk sejenis
Produknya mudah ditunjukkan manfaatnya dalam video
Aku pernah mencoba atau bisa mendapatkan sampelnya
Produk sesuai dengan niche akunku
Komisi dan syarat program sudah kucek di aplikasi
:::

:::tips
Mulailah dari produk yang sudah kamu punya di rumah. Kamu bisa membuat konten hari ini juga, dan ulasanmu lebih jujur karena berdasarkan pengalaman nyata.
:::

:::kuis
? Mana pilihan produk yang paling baik untuk akun dengan niche dapur?
+ Wajan anti lengket yang sudah kamu pakai sebulan dan ratingnya bagus
- Skincare dengan komisi paling besar
- Produk viral apa saja yang sedang ramai
> Produk yang sesuai niche dan sudah kamu coba membuat kontenmu lebih meyakinkan dan akunmu lebih dipercaya.
:::$t$),
('affiliate-pemula', 'konten-review-jujur', '03', 'Konten review yang jujur', 'Orang membeli dari kreator yang mereka percaya, bukan dari yang paling heboh.', 'video', 30, $t$Konten affiliate yang paling awet adalah konten yang **membantu orang memutuskan**, bukan konten yang memaksa membeli.

:::kartu
1. Unboxing & kesan pertama | Buka paket, tunjukkan isi, kualitas bahan, dan ukuran sebenarnya.
2. Sebelum-sesudah | Tunjukkan masalah, lalu hasil setelah memakai produk. Jangan dilebih-lebihkan.
3. Perbandingan | Bandingkan 2–3 produk sejenis dengan harga berbeda. Sebut kelebihan dan kekurangannya.
4. Tutorial | Cara memakai produk dengan benar dari awal sampai akhir.
5. "3 alasan" | Tiga alasan membeli, dan satu alasan *tidak* membeli. Kejujuran ini membuat penonton percaya.
:::

:::banding kiri="Menurunkan kepercayaan" kanan="Membangun kepercayaan"
"Produk terbaik di dunia!" | "Ini cocok untukmu kalau…, kurang cocok kalau…"
Hanya menunjukkan kelebihan | Menyebut kekurangan dengan jujur
Membaca ulang deskripsi toko | Menunjukkan pemakaian nyata
Klaim hasil medis atau "pasti" | Menceritakan pengalaman pribadi apa adanya
Tidak memberi tahu bahwa ini tautan affiliate | Terbuka bahwa kamu mendapat komisi
:::

:::peringatan
Untuk produk kesehatan, kecantikan, dan makanan, jangan membuat klaim yang tidak bisa dibuktikan, seperti menyembuhkan penyakit atau memutihkan dalam 3 hari. Selain melanggar aturan platform, klaim seperti ini bisa merugikan penonton.
:::$t$),
('affiliate-pemula', 'skrip-30-detik', '04', 'Skrip video 30 detik', 'Kerangka skrip yang bisa dipakai untuk hampir semua produk.', 'pena', 40, $t$Video affiliate yang bagus singkat, jelas, dan menunjukkan produk sejak awal. Pakai kerangka di bawah, lalu sesuaikan dengan produkmu.

:::alur
0–3 dtk · Hook | Masalah atau hasil yang langsung terlihat
3–20 dtk · Bukti | Tunjukkan produk dipakai, 2–3 manfaat utama
20–26 dtk · Jujur | Satu kekurangan atau untuk siapa produk ini kurang cocok
26–30 dtk · Ajakan | "Cek keranjang kuning" atau "link di etalase"
:::

## Contoh skrip

| Waktu | Yang diucapkan | Yang terlihat di layar |
|---|---|---|
| 0–3 dtk | "Rak bumbu dapurku dulu berantakan begini." | Dapur berantakan, lalu potongan cepat ke hasil rapi |
| 3–10 dtk | "Rak ini muat 12 toples dan bisa ditempel tanpa bor." | Memasang rak di dinding |
| 10–20 dtk | "Toplesnya rapat, jadi bumbu tidak cepat lembap." | Membuka-tutup toples, menata bumbu |
| 20–26 dtk | "Kekurangannya, perekatnya butuh dinding yang rata." | Menunjuk bagian perekat |
| 26–30 dtk | "Kalau mau dapur rapi, cek di keranjang ya." | Hasil akhir dapur + teks ajakan |

:::sop id=af-skrip
Tulis hook yang menunjukkan masalah atau hasil
Pilih 2–3 manfaat yang bisa ditunjukkan, bukan hanya diucapkan
Tulis satu kekurangan dengan jujur
Tulis ajakan yang sesuai fitur platform
Rekam B-roll produk dari beberapa sudut
Cek kembali: apakah ada klaim yang berlebihan?
:::

:::tips
Rekam beberapa video sekaligus untuk satu produk dengan hook yang berbeda. Hook yang paling banyak ditonton bisa dipakai lagi untuk produk lain.
:::$t$),
('affiliate-pemula', 'hitung-potensi', '05', 'Hitung potensi komisimu', 'Pakai angka realistis supaya kamu bisa menyusun target yang masuk akal.', 'kalkulator', 50, $t$Penghasilan affiliate bergantung pada tiga angka: **harga produk**, **persentase komisi**, dan **konversi**. Coba ubah angka di simulasi ini dengan data dari produk yang kamu pilih.

:::komisi harga=120000 persen=5 konversi=0.3
:::

## Cara membaca hasilnya

:::kartu
Konversi kecil itu wajar | Dari ratusan penonton, mungkin hanya sedikit yang membeli. Karena itu konsistensi membuat konten penting.
Komisi besar belum tentu lebih baik | Produk dengan komisi kecil tapi banyak dibutuhkan bisa menghasilkan lebih banyak.
Pengembalian mengurangi komisi | Pilih produk yang kualitasnya baik agar pesanan tidak banyak dikembalikan.
:::

## Contoh perbandingan

| Produk | Harga | Komisi | Komisi per produk |
|---|---|---|---|
| Rak bumbu | Rp85.000 | 6% | Rp5.100 |
| Earphone nirkabel | Rp250.000 | 3% | Rp7.500 |
| Serum wajah | Rp120.000 | 8% | Rp9.600 |

:::catatan
Angka di atas hanya contoh untuk latihan berhitung. Besaran komisi asli berbeda-beda per produk, toko, dan periode kampanye. Lihat angka yang benar di dashboard affiliate-mu.
:::$t$),
('affiliate-pemula', 'rutinitas-harian', '06', 'Rutinitas harian & evaluasi', 'Affiliate adalah permainan konsistensi. Buat rutinitas kecil yang bisa dijalani setiap hari.', 'kalender', 60, $t$Kebanyakan kreator affiliate yang bertahan tidak membuat video viral setiap hari. Mereka **rutin** membuat konten, mencatat hasilnya, dan mengulang yang berhasil.

## Checklist harian

Checklist ini mulai ulang setiap hari.

:::checklist id=af-harian harian=ya
Cek dashboard: produk mana yang terjual kemarin
Balas komentar dan pertanyaan penonton
Rekam atau edit 1–2 video
Posting sesuai jadwal
Catat produk baru yang layak dicoba
:::

## Kalender 7 hari pertama

:::kalender id=af-kalender
Senin | Unboxing | Produk yang sudah kamu punya di rumah
Selasa | Tutorial | Cara memakai produk yang sama dengan benar
Rabu | Perbandingan | 2 produk sejenis dengan harga berbeda
Kamis | 3 alasan | 3 alasan membeli + 1 alasan tidak membeli
Jumat | Sebelum-sesudah | Masalah dan hasil setelah memakai produk
Sabtu | Live atau tanya jawab | Jawab pertanyaan penonton seputar produk
Minggu | Evaluasi | Catat video terbaik dan rencanakan minggu depan
:::

:::kuis
? Videomu banyak ditonton tapi produknya jarang terjual. Apa yang perlu dicek pertama?
+ Apakah produknya sesuai dengan penonton dan apakah ajakannya jelas
- Ganti semua produk dengan yang komisinya paling besar
- Posting lebih sering tanpa mengubah apa pun
> Penonton banyak tapi tidak membeli biasanya berarti produk kurang cocok dengan penonton, atau penonton belum tahu cara membelinya.
? Kapan komisi affiliate biasanya dihitung?
- Saat penonton mengeklik tautan
- Saat pembeli memasukkan produk ke keranjang
+ Setelah pesanan selesai dan tidak dikembalikan
> Kebanyakan program menghitung komisi setelah pesanan selesai. Cek ketentuan pastinya di aplikasi yang kamu pakai.
:::$t$)
) v(buku, slug, label, judul, ringkas, ikon, urut, isi)
join public.ebook_buku b on b.slug = v.buku
where not exists (select 1 from public.ebook_bab x where x.buku_id = b.id and x.slug = v.slug);

-- produk di toko: harga normal + harga peluncuran sampai 30 November 2026 23:59 WIB
insert into public.produk (slug, nama, subjudul, kategori, cover_url, format, deskripsi, isi, harga, harga_promo, promo_sampai,
                           label_promo, tipe_kirim, buku_id, status, urut)
select v.slug, v.nama, v.sub, 'ebook', v.cover, v.format, v.deskripsi, v.isi, v.harga, v.promo, '2026-11-30 23:59:59+07',
       'Harga peluncuran', 'ebook', b.id, 'tayang', v.urut
from (values
('personal-branding-dari-nol', 'Personal Branding dari Nol', 'Bikin orang ingat, percaya, lalu mencarimu. Cukup mulai dari HP.', '/assets/produk/personal-branding-dari-nol.jpg', 'Ebook interaktif · 6 bab', $t$Panduan praktis untuk kamu yang ingin dikenal karena keahlianmu, entah itu jualan, freelance, atau membangun karier. Tidak perlu jadi selebgram dulu. Yang kamu butuhkan: posisi yang jelas, profil yang menjelaskan dalam 3 detik, dan konten yang konsisten.

:::kartu
Untuk siapa | Pemilik usaha kecil, freelancer, reseller, dan siapa pun yang mau dikenal karena keahliannya.
Yang kamu kerjakan | Menentukan posisi, merapikan profil, menyusun pilar konten, dan rencana 30 hari.
Interaktif | Kuis, checklist profil, kalender konten yang bisa dicentang, dan contoh percakapan.
:::$t$, $t$6 bab bergambar dan interaktif
Rumus kalimat posisi "Aku membantu…" plus contoh
Checklist profil Instagram/TikTok yang siap dicentang
Kalender konten 7 hari dan rencana 30 hari
Contoh percakapan dari konten ke penawaran
Akses selamanya di rak ebook IXVII.CO (maks. 2 perangkat)$t$, 59000, 39000, 1),
('freelance-pertama-30-hari', 'Freelance Pertama', 'Rencana 30 hari dari memilih jasa, portofolio, tarif, sampai invoice pertama.', '/assets/produk/freelance-pertama-30-hari.jpg', 'Ebook interaktif · 6 bab', $t$Ingin mulai freelance tapi bingung harus jual jasa apa, pasang tarif berapa, dan cari klien di mana? Ebook ini memecahnya menjadi rencana 30 hari yang bisa kamu jalankan sambil kuliah atau kerja.

:::kartu
Untuk siapa | Pemula yang belum pernah dapat klien, atau sudah pernah tapi belum rutin.
Yang kamu kerjakan | Memilih jasa, membuat 3 portofolio, menghitung tarif, menjemput klien, dan mengelola proyek.
Interaktif | Kalkulator tarif, template pesan, contoh brief, SOP proyek yang bisa dicentang, dan kuis.
:::

:::catatan
Ini rencana kerja, bukan jaminan penghasilan. Hasilnya bergantung pada jasa yang kamu pilih, kualitas karya, dan seberapa rutin kamu menjalankan langkahnya.
:::$t$, $t$6 bab bergambar dan interaktif
Kalkulator tarif freelance (per jam dan per proyek)
Template pesan menawarkan jasa yang sopan dan tidak spam
Contoh form brief klien dan alur proyek dengan DP
Rencana 30 hari yang bisa dicentang
Akses selamanya di rak ebook IXVII.CO (maks. 2 perangkat)$t$, 69000, 45000, 2),
('canva-konten-menjual', 'Canva untuk Konten yang Menjual', 'Desain feed, story, dan poster promo yang rapi walau kamu bukan desainer.', '/assets/produk/canva-konten-menjual.jpg', 'Ebook interaktif · 6 bab', $t$Desain yang menjual bukan soal efek yang ramai, tapi soal pesan yang cepat ditangkap. Ebook ini mengajarkan prinsip desain yang paling sering dipakai di konten jualan, lalu langsung mempraktikkannya di Canva.

:::kartu
Untuk siapa | Pemilik toko online, admin media sosial, reseller, dan pemula yang ingin desainnya terlihat rapi.
Yang kamu pelajari | Hierarki, warna, font, carousel, poster promo, dan cara kerja cepat di Canva.
Interaktif | Palet warna contoh, contoh tata letak poster, checklist sebelum posting, dan kuis.
:::$t$, $t$6 bab bergambar dan interaktif
Prinsip desain 5 detik: hierarki, kontras, ruang kosong
Contoh palet warna dan pasangan font yang aman
Struktur carousel 5 slide yang membuat orang menggeser sampai habis
Checklist poster promo dan tabel ukuran ekspor
Akses selamanya di rak ebook IXVII.CO (maks. 2 perangkat)$t$, 49000, 35000, 3),
('capcut-reels-kilat', 'CapCut Reels Kilat', 'Edit video pendek yang ditonton sampai habis, cukup dari HP.', '/assets/produk/capcut-reels-kilat.jpg', 'Ebook interaktif · 6 bab', $t$Video pendek adalah cara tercepat untuk dikenal, tapi banyak video ditinggal di detik pertama. Ebook ini membahas cara merekam, menyusun, dan mengedit Reels/TikTok di CapCut supaya penonton bertahan dan mengerti pesanmu.

:::kartu
Untuk siapa | Penjual online, kreator pemula, dan admin media sosial yang mengedit dari HP.
Yang kamu pelajari | Struktur video 15–30 detik, teknik merekam, edit dasar, teks, musik, ritme, dan ekspor.
Interaktif | Diagram struktur video, checklist sebelum merekam dan upload, serta kuis.
:::$t$, $t$6 bab bergambar dan interaktif
Struktur video 15–30 detik: hook, isi, ajakan
10 contoh kalimat hook yang bisa langsung dipakai
Checklist merekam dengan HP (cahaya, suara, framing)
Alur edit dasar di CapCut dan pengaturan ekspor
Akses selamanya di rak ebook IXVII.CO (maks. 2 perangkat)$t$, 49000, 35000, 4),
('foto-estetik-lightroom', 'Foto Estetik dengan Lightroom HP', 'Edit foto produk dan feed yang konsisten, plus cara membuat preset sendiri.', '/assets/produk/foto-estetik-lightroom.jpg', 'Ebook interaktif · 6 bab', $t$Feed yang terlihat "mahal" biasanya bukan karena kameranya mahal, tapi karena warnanya konsisten. Ebook ini mengajarkan urutan edit di Lightroom versi HP (bisa dipakai gratis untuk alat dasar), resep warna, foto produk untuk jualan, dan cara menyimpan preset milikmu sendiri.

:::kartu
Untuk siapa | Penjual online, pemilik kafe dan kuliner, kreator, dan siapa pun yang ingin feed-nya seragam.
Yang kamu pelajari | Membaca cahaya, urutan edit 6 langkah, resep warna, foto produk, dan membuat preset.
Interaktif | Panel slider bergambar, SOP edit yang bisa dicentang, resep angka awal, dan kuis.
:::$t$, $t$6 bab bergambar dan interaktif
Urutan edit 6 langkah yang bisa dicentang
3 resep warna: krem hangat, putih bersih, gelap moody
Checklist foto produk untuk marketplace dan Instagram
Cara membuat dan memakai preset sendiri
Akses selamanya di rak ebook IXVII.CO (maks. 2 perangkat)$t$, 49000, 29000, 5),
('copywriting-jualan-closing', 'Copywriting Jualan yang Bikin Closing', 'Rumus caption, chat, dan penawaran yang membuat orang yakin membeli, tanpa memaksa.', '/assets/produk/copywriting-jualan-closing.jpg', 'Ebook interaktif · 6 bab', $t$Produk bagus tidak laku kalau orang tidak mengerti kenapa mereka butuh. Ebook ini membahas cara menulis caption, judul, dan balasan chat yang menjelaskan manfaat dengan jujur sampai pembeli yakin.

:::kartu
Untuk siapa | Penjual online, reseller, admin toko, dan freelancer yang menjual lewat media sosial dan WhatsApp.
Yang kamu pelajari | Manfaat vs fitur, rumus AIDA dan PAS, 12 template hook, caption, chat closing, dan etika.
Interaktif | Tabel sebelum-sesudah, contoh percakapan WhatsApp, checklist caption, dan kuis.
:::$t$, $t$6 bab bergambar dan interaktif
Cara mengubah fitur menjadi manfaat dan hasil
Rumus AIDA dan PAS lengkap dengan contoh
12 template hook untuk caption dan video
Contoh balasan chat untuk "harganya berapa?", "mahal", dan "nanti dulu"
Akses selamanya di rak ebook IXVII.CO (maks. 2 perangkat)$t$, 59000, 39000, 6),
('ai-kerja-cepat', 'AI Kerja Cepat', 'Prompt siap pakai untuk konten, jualan, dan kerjaan harian dengan ChatGPT, Claude, atau Gemini.', '/assets/produk/ai-kerja-cepat.jpg', 'Ebook interaktif · 6 bab', $t$AI bisa menghemat jam kerja kalau kamu tahu cara memintanya. Ebook ini mengajarkan anatomi prompt yang baik, lalu memberi kumpulan prompt siap pakai untuk membuat konten, membalas pembeli, dan menyelesaikan pekerjaan harian, lengkap dengan cara mengecek hasilnya.

:::kartu
Untuk siapa | Penjual online, freelancer, mahasiswa, dan pekerja kantoran yang ingin bekerja lebih cepat.
Yang kamu pelajari | Cara kerja dan batas AI, anatomi prompt, prompt konten, prompt jualan, prompt kerja harian, dan keamanan data.
Interaktif | Perbandingan prompt buruk vs baik, contoh percakapan, checklist keamanan, dan kuis.
:::$t$, $t$6 bab bergambar dan interaktif
Rumus prompt 5 bagian: peran, tugas, konteks, format, contoh
30+ prompt siap pakai untuk konten, jualan, dan kerja harian
Cara memperbaiki jawaban AI yang kurang pas
Checklist keamanan data dan cek fakta
Akses selamanya di rak ebook IXVII.CO (maks. 2 perangkat)$t$, 59000, 39000, 7),
('kalender-konten-30-hari', 'Kalender Konten 30 Hari', 'Ide konten sebulan penuh untuk jualan online. Tinggal sesuaikan dan centang.', '/assets/produk/kalender-konten-30-hari.jpg', 'Ebook interaktif · 6 bab', $t$Tidak perlu lagi bingung mau posting apa hari ini. Kalender ini berisi 30 ide konten yang disusun per minggu dengan pola edukasi, cerita, bukti, dan penawaran. Setiap hari bisa kamu centang, dan progresnya tersimpan di akunmu.

:::kartu
Untuk siapa | Penjual online, UMKM, reseller, dan admin media sosial yang ingin posting rutin tanpa kehabisan ide.
Isinya | 4 minggu kalender + 2 hari bonus, template hook, dan cara mengevaluasi hasil.
Interaktif | Kalender yang bisa dicentang per hari, checklist evaluasi, dan kuis.
:::$t$, $t$6 bab bergambar dan interaktif
30 ide konten per hari dengan pilar dan format
Kalender yang bisa dicentang, progres tersimpan
Template hook untuk setiap jenis konten
Tabel metrik dan cara evaluasi bulanan
Akses selamanya di rak ebook IXVII.CO (maks. 2 perangkat)$t$, 39000, 25000, 8),
('jualan-produk-digital', 'Jualan Produk Digital Pertamamu', 'Dari ide, membuat, menentukan harga, sampai terjual. Tanpa stok barang.', '/assets/produk/jualan-produk-digital.jpg', 'Ebook interaktif · 6 bab', $t$Ebook, template, preset, kelas, dan printable bisa dijual berulang kali tanpa stok. Ebook ini memandumu memilih ide yang dicari orang, memvalidasinya sebelum membuat, menyusun versi pertama dalam seminggu, menentukan harga, dan meluncurkannya.

:::kartu
Untuk siapa | Freelancer, kreator, guru, dan siapa pun yang punya keahlian dan ingin mengemasnya menjadi produk.
Yang kamu kerjakan | Memilih jenis produk, validasi, membuat versi pertama, menyusun harga, memilih tempat jualan, dan meluncurkan.
Interaktif | Rencana 7 hari, tangga harga bergambar, checklist peluncuran, contoh percakapan validasi, dan kuis.
:::$t$, $t$6 bab bergambar dan interaktif
Daftar jenis produk digital yang banyak dicari
Cara validasi ide sebelum menghabiskan waktu membuatnya
Rencana membuat versi pertama dalam 7 hari
Tangga harga dan strategi bundling
Checklist peluncuran dan perlindungan hak cipta
Akses selamanya di rak ebook IXVII.CO (maks. 2 perangkat)$t$, 69000, 45000, 9),
('affiliate-pemula', 'Affiliate TikTok & Shopee untuk Pemula', 'Pilih produk, bikin konten review yang jujur, dan hitung potensi komisimu.', '/assets/produk/affiliate-pemula.jpg', 'Ebook interaktif · 6 bab', $t$Affiliate memungkinkanmu mendapat komisi dari produk orang lain tanpa menyetok barang. Ebook ini menjelaskan cara kerjanya, cara memilih produk, membuat konten review yang jujur, menulis skrip video 30 detik, dan menghitung potensi komisi secara realistis.

:::kartu
Untuk siapa | Pemula yang ingin mulai affiliate di TikTok, Shopee, atau platform lain dari HP.
Yang kamu pelajari | Cara kerja affiliate, memilih produk dan niche, format konten review, skrip video, perhitungan komisi, dan rutinitas harian.
Interaktif | Simulasi komisi, kalender 7 hari, checklist harian, contoh skrip, dan kuis.
:::

:::catatan
Syarat, besaran komisi, dan aturan program affiliate bisa berubah sewaktu-waktu. Selalu cek ketentuan terbaru langsung di aplikasi masing-masing platform. Ebook ini tidak menjamin penghasilan.
:::$t$, $t$6 bab bergambar dan interaktif
Alur cara kerja affiliate bergambar
Kriteria memilih produk yang layak dipromosikan
5 format konten review yang jujur
Contoh skrip video 30 detik
Simulator komisi dan kalender 7 hari
Akses selamanya di rak ebook IXVII.CO (maks. 2 perangkat)$t$, 59000, 39000, 10)
) v(slug, nama, sub, cover, format, deskripsi, isi, harga, promo, urut)
join public.ebook_buku b on b.slug = v.slug
on conflict (slug) do nothing;
