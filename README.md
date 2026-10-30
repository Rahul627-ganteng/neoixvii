# neoixvii

Website ixvii.co. HTML/CSS/JS biasa tanpa build, diterbitkan Netlify dari folder `public/`.

| Folder / file | Isi | Terbit di web? |
|---|---|---|
| `public/` | Semua halaman website. `public/admin-impor/` = halaman impor HPP dari Excel. | Ya |
| `supabase/migrations/` | File SQL perubahan database (dijalankan manual di Supabase SQL Editor). | Tidak |
| `supabase/seed_katalog.sql` | Isi awal katalog, **berisi HPP**. | Tidak |
| `netlify.toml` | Pengaturan Netlify: `publish = "public"`. | — |

Aturan:
1. HPP tidak boleh terbuka untuk publik. File Excel HPP tidak dimasukkan ke repo ini.
2. Service role key / secret key Supabase tidak boleh ada di repo.
3. Perubahan database = file baru di `supabase/migrations/`.
