-- ============================================================================
-- Tahap 10a: Info Film yang diisi admin
--   1. films       : judul film/serial, sinopsis (tulis dengan kata-kata sendiri), tanggal tayang,
--                    poster opsional, platform = aplikasi di katalog (app_id)
--   2. status otomatis dari tanggal: akan tayang (sebelum tanggal tayang), sedang tayang,
--                    selesai (lewat tanggal berakhir, tidak tampil di website)
--   3. film_json()  : daftar untuk website (hanya yang aktif & belum selesai)
--   4. bucket Storage publik "posters"
-- Jalankan di SQL Editor Supabase SETELAH migration Tahap 9. Aman dijalankan ulang.
-- Data dari TMDB TIDAK dipakai di sini (lisensi gratis TMDB hanya untuk non-komersial).
-- ============================================================================

create table if not exists public.films (
  id            bigint generated always as identity primary key,
  title         text not null check (length(title) between 1 and 120),
  kind          text not null default 'film' check (kind in ('film', 'serial')),
  app_id        bigint references public.apps(id) on delete set null,   -- platform tempat tayang
  release_on    date not null,
  ends_on       date,                                                   -- opsional: tayangan berakhir / keluar dari platform
  synopsis      text check (synopsis is null or length(synopsis) <= 500),
  synopsis_en   text check (synopsis_en is null or length(synopsis_en) <= 500),
  genre         text,
  poster_url    text,
  trailer_url   text check (trailer_url is null or trailer_url ~ '^https://'),
  is_active     boolean not null default true,
  sort          int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_on is null or ends_on >= release_on)
);
create index if not exists films_release_idx on public.films(release_on desc);

alter table public.films enable row level security;
drop policy if exists admin_semua on public.films;
create policy admin_semua on public.films for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.status_film(p_rilis date, p_akhir date)
returns text
language sql stable set search_path = '' as $$
  select case
    when p_rilis > public.hari_ini_wib() then 'akan'
    when p_akhir is not null and p_akhir < public.hari_ini_wib() then 'selesai'
    else 'sedang'
  end
$$;

-- Daftar publik: sedang tayang (terbaru dulu) lalu akan tayang (paling dekat dulu).
create or replace function public.film_json()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.j order by x.urut, x.kunci), '[]'::jsonb)
  from (
    select case when public.status_film(f.release_on, f.ends_on) = 'sedang' then 0 else 1 end as urut,
           case when public.status_film(f.release_on, f.ends_on) = 'sedang'
                then (public.hari_ini_wib() - f.release_on) else (f.release_on - public.hari_ini_wib()) end * 1000 + f.sort as kunci,
           jsonb_build_object(
             'id', f.id, 'judul', f.title, 'jenis', f.kind, 'sinopsis', f.synopsis, 'sinopsis_en', f.synopsis_en,
             'genre', f.genre, 'poster', f.poster_url, 'trailer', f.trailer_url,
             'rilis', f.release_on, 'akhir', f.ends_on, 'status', public.status_film(f.release_on, f.ends_on),
             'app', a.name, 'slug', a.slug, 'app_logo', a.logo_url, 'kategori', c.label) as j
    from public.films f
    left join public.apps a on a.id = f.app_id and a.is_active
    left join public.categories c on c.id = a.category_id
    where f.is_active and public.status_film(f.release_on, f.ends_on) <> 'selesai'
  ) x
$$;
grant execute on function public.film_json() to anon, authenticated;

-- ---------------------------------------------------------------- bucket poster
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do nothing;
drop policy if exists posters_admin_tambah on storage.objects;
drop policy if exists posters_admin_ubah on storage.objects;
drop policy if exists posters_admin_hapus on storage.objects;
create policy posters_admin_tambah on storage.objects for insert to authenticated
  with check (bucket_id = 'posters' and (select public.is_admin()));
create policy posters_admin_ubah on storage.objects for update to authenticated
  using (bucket_id = 'posters' and (select public.is_admin()))
  with check (bucket_id = 'posters' and (select public.is_admin()));
create policy posters_admin_hapus on storage.objects for delete to authenticated
  using (bucket_id = 'posters' and (select public.is_admin()));
