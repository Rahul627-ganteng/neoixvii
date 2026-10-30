# neoixvii

Website ixvii.co. HTML/CSS/JS biasa tanpa build, diterbitkan Netlify dari folder `public/`.

| Folder / file | Isi | Terbit di web? |
|---|---|---|
| `public/` | Semua halaman website: beranda (`index.html`), `katalog/`, `aplikasi/?app=<slug>`, dan `admin-impor/` (impor HPP dari Excel). | Ya |
| `public/admin/` | Panel admin (`/admin/`): ringkasan, stok cepat, logo/FAQ/harga resmi, margin, riwayat impor, dan Unduh Excel (`template-katalog.xlsx` + `js/ekspor.js`). | Ya, tapi hanya admin yang bisa memakai |
| `public/js/` | `config.js` (alamat Supabase), `api.js` (ambil data lewat REST), `ui.js` (kartu, header, efek 3D), dan skrip tiap halaman. | Ya |
| `public/css/site.css` | Tata letak dan komponen halaman publik. | Ya |
| `supabase/migrations/` | File SQL perubahan database (dijalankan manual di Supabase SQL Editor). | Tidak |
| `supabase/seed_katalog.sql` | Isi awal katalog, **berisi HPP**. | Tidak |
| `public/assets/brand/` | Logo (putih untuk latar gelap, maroon, hitam) dan favicon. | Ya |
| `public/css/brand.css` | Warna dan font: judul Helvetica Bold kapital, isi Inter. | Ya |
| `netlify.toml` | Pengaturan Netlify: `publish = "public"`. | — |

Aturan:
1. HPP tidak boleh terbuka untuk publik. File Excel HPP tidak dimasukkan ke repo ini.
2. Service role key / secret key Supabase tidak boleh ada di repo.
3. Perubahan database = file baru di `supabase/migrations/`, dijalankan berurutan sesuai tanggal di nama file.

Font: Akira Expanded hanya dipakai di dalam gambar logo. File font-nya (versi demo) tidak dimasukkan ke repo dan tidak dipasang di website.
