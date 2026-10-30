-- ============================================================================
-- Tahap 4: data untuk tampilan katalog
--   * apps.logo_url, apps.is_featured (produk unggulan di beranda), apps.slug (alamat halaman)
--   * app_faqs: tanya-jawab per aplikasi
--   * official_prices: harga resmi untuk perbandingan "hemat x%"
--   * bucket Storage publik "logos"
--   * katalog_json() ditambah id, slug, logo, featured per aplikasi dan durasi (hari) per paket
-- Jalankan sekali di SQL Editor Supabase, SETELAH 20261030000000_katalog_hpp.sql.
-- ============================================================================

-- alamat ramah: "Vision+ Sport" -> "vision-sport"
create or replace function public.slugify(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select trim(both '-' from regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]+', '-', 'g'))
$$;

alter table public.apps
  add column if not exists logo_url    text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists slug        text generated always as (public.slugify(name)) stored;
create unique index if not exists apps_slug_key on public.apps (slug);

-- ---------------------------------------------------------------- FAQ per aplikasi
create table if not exists public.app_faqs (
  id         bigint generated always as identity primary key,
  app_id     bigint not null references public.apps(id) on delete cascade,
  question   text not null,
  answer     text not null,
  sort       int not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists app_faqs_app_idx on public.app_faqs(app_id, sort);

-- ---------------------------------------------------------------- harga resmi
-- Satu baris per paket resmi yang dibandingkan, mis. "Netflix Premium" Rp186.000 / 30 hari.
create table if not exists public.official_prices (
  id            bigint generated always as identity primary key,
  app_id        bigint not null references public.apps(id) on delete cascade,
  label         text not null,
  price         int  not null check (price > 0),
  duration_days int  not null default 30 check (duration_days > 0),
  note          text,
  checked_at    date,                       -- kapan harga resmi terakhir dicek
  sort          int  not null default 0,
  updated_at    timestamptz not null default now()
);
create index if not exists official_prices_app_idx on public.official_prices(app_id, sort);

alter table public.app_faqs        enable row level security;
alter table public.official_prices enable row level security;

create policy publik_baca on public.app_faqs        for select to anon, authenticated using (true);
create policy publik_baca on public.official_prices for select to anon, authenticated using (true);
create policy admin_semua on public.app_faqs for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_semua on public.official_prices for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- bucket logo
-- Bucket publik: siapa pun bisa melihat gambar lewat URL publiknya; hanya admin yang bisa mengunggah.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy logos_admin_tambah on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (select public.is_admin()));
create policy logos_admin_ubah on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (select public.is_admin()))
  with check (bucket_id = 'logos' and (select public.is_admin()));
create policy logos_admin_hapus on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (select public.is_admin()));

-- ---------------------------------------------------------------- katalog_json versi 2
-- Kunci lama (cats, label, desc, apps, name, groups, items, id, d, p, s) tetap sama.
-- Tambahan: app.id, app.slug, app.logo, app.featured, item.h (durasi dalam hari, null = lifetime/tidak terbaca)
create or replace function public.katalog_json() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'updated', to_char((select max(updated_at) from public.variants) at time zone 'Asia/Jakarta', 'YYYY-MM-DD'),
    'cats', coalesce(jsonb_agg(jsonb_build_object('label', c.label, 'desc', coalesce(c.description, ''), 'apps', ai.apps)
                               order by c.sort, c.id) filter (where ai.apps is not null), '[]'::jsonb))
  from public.categories c
  cross join lateral (
    select jsonb_agg(jsonb_build_object('id', a.id, 'slug', a.slug, 'name', a.name, 'desc', coalesce(a.description, ''),
                                        'logo', a.logo_url, 'featured', a.is_featured, 'groups', gi.groups)
                     order by a.sort, a.id) filter (where gi.groups is not null) as apps
    from public.apps a
    cross join lateral (
      select jsonb_agg(jsonb_build_object('label', g.label, 'items', vi.items) order by g.sort, g.id)
               filter (where vi.items is not null) as groups
      from public.plan_groups g
      cross join lateral (
        select jsonb_agg(jsonb_build_object('id', v.code, 'd', v.label, 'p', v.price,
                                            's', case v.stock when 'habis' then 0 else 1 end,
                                            'h', v.duration_days)
                         order by v.sort, v.id) as items
        from public.variants v
        where v.group_id = g.id and v.is_active
      ) vi
      where g.app_id = a.id
    ) gi
    where a.category_id = c.id and a.is_active
  ) ai
$$;

grant execute on function public.katalog_json() to anon, authenticated;
