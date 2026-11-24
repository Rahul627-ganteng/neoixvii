-- Perbaikan unggahan gambar dari panel admin (logo, banner, poster film, foto profil, blog, produk)
--
-- Masalah: Supabase Storage menolak unggahan dengan opsi upsert ("new row violates row-level
-- security policy") kalau tidak ada kebijakan SELECT di storage.objects, walau kebijakan
-- INSERT/UPDATE sudah benar. Panel sekarang sudah tidak memakai upsert (nama file selalu baru),
-- jadi unggahan jalan TANPA migrasi ini. Migrasi ini hanya pengaman supaya admin juga bisa
-- membaca/menimpa berkas di bucket publik kalau suatu saat dibutuhkan.
--
-- Aman dijalankan berulang. Hanya akun admin (app_metadata.role = 'admin') yang mendapat izin.

do $$
declare
  b text;
begin
  foreach b in array array['logos', 'banners', 'posters', 'profiles', 'blog', 'produk'] loop
    execute format('drop policy if exists %I on storage.objects', b || '_admin_baca');
    execute format(
      'create policy %I on storage.objects for select to authenticated using (bucket_id = %L and (select public.is_admin()))',
      b || '_admin_baca', b);
  end loop;
end $$;
