-- ============================================================================
-- ixvii.co: katalog, HPP, dan impor dari Excel
-- Jalankan sekali di Supabase (SQL Editor atau `supabase db push`), lalu seed_katalog.sql.
--
-- Prinsip:
--   * Harga jual (variants.price) boleh dibaca publik. HPP, markup, harga manual, dan
--     catatan internal ada di variant_costs, yang HANYA bisa dibaca admin.
--   * Admin = user dengan app_metadata.role = 'admin' (set dari dashboard/service role,
--     tidak bisa diubah user sendiri).
--   * Impor Excel lewat satu RPC (impor_katalog) yang berjalan dalam satu transaksi:
--     semua baris masuk, atau tidak ada sama sekali. Setiap perubahan dicatat di
--     price_history dan bisa dibatalkan per unggahan (batalkan_impor).
-- ============================================================================

-- ---------------------------------------------------------------- utilitas
create or replace function public.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- kunci pencocokan nama: "1Bulan" = "1 Bulan", "RCTI+ " = "rcti"
create or replace function public.norm_key(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]', '', 'g')
$$;

-- ---------------------------------------------------------------- tabel katalog
create table public.categories (
  id          bigint generated always as identity primary key,
  label       text not null unique,
  description text,
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);

create table public.apps (
  id          bigint generated always as identity primary key,
  category_id bigint not null references public.categories(id),
  name        text not null,
  name_key    text generated always as (public.norm_key(name)) stored unique,
  description text,
  is_active   boolean not null default true,
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);

create table public.plan_groups (
  id         bigint generated always as identity primary key,
  app_id     bigint not null references public.apps(id) on delete cascade,
  label      text not null,
  label_key  text generated always as (public.norm_key(label)) stored,
  sort       int not null default 0,
  unique (app_id, label_key)
);

create sequence public.variant_code_seq;

create table public.variants (
  id             bigint generated always as identity primary key,
  code           text not null unique
                 default ('V' || lpad(nextval('public.variant_code_seq')::text, 4, '0')),
  group_id       bigint not null references public.plan_groups(id) on delete cascade,
  label          text not null,                      -- label asli, mis. '5U 1 Bulan'
  label_key      text generated always as (public.norm_key(label)) stored,
  duration_qty   numeric,
  duration_unit  text check (duration_unit in ('hari','minggu','bulan','tahun','lifetime')),
  duration_days  int,
  user_count     int,
  device         text,
  price          int not null check (price between 1000 and 100000000),
  stock          text not null default 'tersedia' check (stock in ('tersedia','habis')),
  is_active      boolean not null default true,
  sort           int not null default 0,
  updated_at     timestamptz not null default now(),
  unique (group_id, label_key)
);
create index variants_group_idx on public.variants(group_id);

-- data harga internal: HPP NULL = belum diisi
create table public.variant_costs (
  variant_id   bigint primary key references public.variants(id) on delete cascade,
  hpp          int check (hpp is null or hpp >= 0),
  markup       numeric check (markup is null or markup >= 0),   -- 0.35 = 35% dari HPP
  manual_price int check (manual_price is null or manual_price >= 1000),
  admin_note   text,
  updated_at   timestamptz not null default now()
);

-- batas margin untuk Custom Bundling Builder (isi angkanya sendiri)
create table public.pricing_settings (
  id                  int primary key default 1 check (id = 1),
  min_margin_pct      numeric not null default 0.15,  -- margin minimum dari harga jual
  min_margin_rp       int     not null default 2000,
  bundle_fallback_pct numeric not null default 0      -- diskon maks varian TANPA HPP (0 = tidak ikut diskon)
);
insert into public.pricing_settings default values;

-- ---------------------------------------------------------------- riwayat impor
create table public.import_batches (
  id             uuid primary key default gen_random_uuid(),
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  file_name      text,
  data_version   timestamptz,
  summary        jsonb,
  status         text not null default 'applied' check (status in ('applied','rolled_back')),
  rolled_back_at timestamptz
);

create table public.price_history (
  id         bigint generated always as identity primary key,
  variant_id bigint references public.variants(id) on delete set null,
  batch_id   uuid references public.import_batches(id) on delete set null,
  field      text not null check (field in ('dibuat','harga','hpp','stok','tampil','label')),
  old_value  text,
  new_value  text,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);
create index price_history_batch_idx on public.price_history(batch_id);
create index price_history_variant_idx on public.price_history(variant_id, changed_at desc);

-- ---------------------------------------------------------------- RLS
alter table public.categories       enable row level security;
alter table public.apps             enable row level security;
alter table public.plan_groups      enable row level security;
alter table public.variants         enable row level security;
alter table public.variant_costs    enable row level security;
alter table public.pricing_settings enable row level security;
alter table public.import_batches   enable row level security;
alter table public.price_history    enable row level security;

-- publik: hanya baca yang aktif
create policy publik_baca on public.categories  for select to anon, authenticated using (true);
create policy publik_baca on public.apps        for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy publik_baca on public.plan_groups for select to anon, authenticated using (true);
create policy publik_baca on public.variants    for select to anon, authenticated using (is_active or (select public.is_admin()));

-- admin: semua tabel
do $$
declare t text;
begin
  foreach t in array array['categories','apps','plan_groups','variants','variant_costs',
                           'pricing_settings','import_batches','price_history'] loop
    execute format('create policy admin_semua on public.%I for all to authenticated
                    using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- view admin
-- Satu baris per varian, lengkap dengan HPP, margin, dan harga minimum (untuk bundling).
create or replace view public.v_katalog_admin with (security_invoker = true) as
select v.code,
       c.label  as kategori,
       a.name   as aplikasi,
       g.label  as tipe,
       v.label  as varian,
       vc.hpp,
       vc.markup,
       vc.manual_price as harga_manual,
       v.price  as harga,
       v.price - vc.hpp as untung,
       case when vc.hpp is not null and v.price > 0 then round((v.price - vc.hpp)::numeric / v.price, 4) end as margin_pct,
       case when vc.hpp is not null then
         ceil(greatest(vc.hpp + s.min_margin_rp, vc.hpp / (1 - s.min_margin_pct)) / 500.0)::int * 500
       end as harga_minimum,
       vc.hpp is null as hpp_kosong,
       v.stock  as stok,
       v.is_active as tampil,
       vc.admin_note as catatan,
       v.updated_at,
       c.sort as sort_kategori, a.sort as sort_aplikasi, g.sort as sort_tipe, v.sort as sort_varian
from public.variants v
join public.plan_groups g on g.id = v.group_id
join public.apps a        on a.id = g.app_id
join public.categories c  on c.id = a.category_id
left join public.variant_costs vc on vc.variant_id = v.id
cross join public.pricing_settings s;

revoke all on public.v_katalog_admin from anon;

-- ---------------------------------------------------------------- katalog untuk website
-- Bentuk JSON sama dengan katalog-cadangan.json lama: {cats:[{label,desc,apps:[{name,desc,groups:[{label,items:[{id,d,p,s}]}]}]}], updated}
create or replace function public.katalog_json() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'updated', to_char((select max(updated_at) from public.variants) at time zone 'Asia/Jakarta', 'YYYY-MM-DD'),
    'cats', coalesce(jsonb_agg(jsonb_build_object('label', c.label, 'desc', coalesce(c.description, ''), 'apps', ai.apps)
                               order by c.sort, c.id) filter (where ai.apps is not null), '[]'::jsonb))
  from public.categories c
  cross join lateral (
    select jsonb_agg(jsonb_build_object('name', a.name, 'desc', coalesce(a.description, ''), 'groups', gi.groups)
                     order by a.sort, a.id) filter (where gi.groups is not null) as apps
    from public.apps a
    cross join lateral (
      select jsonb_agg(jsonb_build_object('label', g.label, 'items', vi.items) order by g.sort, g.id)
               filter (where vi.items is not null) as groups
      from public.plan_groups g
      cross join lateral (
        select jsonb_agg(jsonb_build_object('id', v.code, 'd', v.label, 'p', v.price,
                                            's', case v.stock when 'habis' then 0 else 1 end)
                         order by v.sort, v.id) as items
        from public.variants v
        where v.group_id = g.id and v.is_active
      ) vi
      where g.app_id = a.id
    ) gi
    where a.category_id = c.id and a.is_active
  ) ai
$$;

-- ---------------------------------------------------------------- RPC impor
-- p_rows: array hasil bacaWorkbook() (lihat src/alur-impor.js -> keBarisRpc)
-- Kunci "hpp" yang TIDAK ADA di objek = HPP tidak diubah; "hpp": null + "hapus_hpp": true = HPP dihapus.
create or replace function public.impor_katalog(
  p_rows               jsonb,
  p_nama_file          text default null,
  p_versi_data         timestamptz default null,
  p_nonaktifkan_hilang boolean default false
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  r         jsonb;
  n         int;
  v_batch   uuid;
  v_cat     bigint;
  v_app     bigint;
  v_grp     bigint;
  v_old     public.variants;
  v_new     public.variants;
  v_cost    public.variant_costs;
  v_hpp     int;
  v_markup  numeric;
  v_manual  int;
  v_harga   int;
  v_server  int;
  v_stok    text;
  v_tampil  boolean;
  v_dipakai bigint[] := '{}';
  c_baru int := 0; c_ubah int := 0; c_sama int := 0; c_nonaktif int := 0;
  v_ubah    boolean;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mengimpor katalog';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Tidak ada baris untuk diimpor';
  end if;
  if p_versi_data is not null and (exists (select 1 from public.variants where updated_at > p_versi_data)
                                   or exists (select 1 from public.variant_costs where updated_at > p_versi_data)) then
    raise exception 'Katalog sudah berubah sejak file ini diunduh. Unduh ulang Excel terbaru dari panel admin.';
  end if;

  insert into public.import_batches(file_name, data_version) values (p_nama_file, p_versi_data)
  returning id into v_batch;

  for r, n in select e, o from jsonb_array_elements(p_rows) with ordinality as x(e, o) loop
    -- ---- kategori, aplikasi, tipe paket
    insert into public.categories(label, sort) values (r->>'kategori', n)
    on conflict (label) do nothing;
    select id into v_cat from public.categories where label = r->>'kategori';

    select id into v_app from public.apps where name_key = public.norm_key(r->>'aplikasi');
    if v_app is null then
      insert into public.apps(category_id, name, sort) values (v_cat, r->>'aplikasi', n) returning id into v_app;
    else
      update public.apps set category_id = v_cat, name = r->>'aplikasi', updated_at = now()
      where id = v_app and (category_id <> v_cat or name <> r->>'aplikasi');
    end if;

    select id into v_grp from public.plan_groups where app_id = v_app and label_key = public.norm_key(r->>'tipe');
    if v_grp is null then
      insert into public.plan_groups(app_id, label, sort) values (v_app, r->>'tipe', n) returning id into v_grp;
    else
      update public.plan_groups set label = r->>'tipe' where id = v_grp and label <> r->>'tipe';
    end if;

    -- ---- varian lama: dari ID, atau dari kunci aplikasi + tipe + varian
    v_old := null;
    if r->>'code' is not null then
      select * into v_old from public.variants where code = r->>'code';
      if v_old.id is null then
        raise exception 'Baris %: ID Varian % tidak dikenal. Kosongkan ID untuk varian baru.', r->>'baris_excel', r->>'code';
      end if;
    else
      select * into v_old from public.variants where group_id = v_grp and label_key = public.norm_key(r->>'varian');
    end if;
    if v_old.id = any(v_dipakai) then
      raise exception 'Baris %: varian ini muncul lebih dari sekali di file', r->>'baris_excel';
    end if;

    v_cost := null;
    if v_old.id is not null then
      select * into v_cost from public.variant_costs where variant_id = v_old.id;
    end if;

    -- ---- harga: dihitung ulang di server, harus sama dengan hitungan di browser
    v_hpp    := case when r ? 'hpp' then (r->>'hpp')::int else v_cost.hpp end;
    v_markup := (r->>'markup')::numeric;
    v_manual := (r->>'harga_manual')::int;
    v_server := coalesce(v_manual,
                         case when v_hpp is not null and v_markup is not null
                              then (ceil(round(v_hpp * (1 + v_markup), 2) / 1000) * 1000)::int end);
    v_harga  := coalesce(v_server, (r->>'harga')::int);
    if v_harga is null then
      raise exception 'Baris %: harga tidak bisa ditentukan (isi HPP + Markup atau Harga Manual)', r->>'baris_excel';
    end if;
    if r ? 'harga' and (r->>'harga')::int is distinct from v_harga then
      raise exception 'Baris %: harga % dari file tidak cocok dengan hitungan server %', r->>'baris_excel', r->>'harga', v_harga;
    end if;

    v_stok   := coalesce(r->>'stok', v_old.stock, 'tersedia');
    v_tampil := coalesce((r->>'tampil')::boolean, v_old.is_active, true);

    -- ---- simpan varian
    if v_old.id is null then
      insert into public.variants(group_id, label, duration_qty, duration_unit, duration_days, user_count, device,
                                  price, stock, is_active, sort)
      values (v_grp, r->>'varian', (r->>'durasi_jumlah')::numeric, r->>'durasi_satuan', (r->>'durasi_hari')::int,
              (r->>'jumlah_user')::int, r->>'perangkat', v_harga, v_stok, v_tampil, n)
      returning * into v_new;
      insert into public.price_history(variant_id, batch_id, field, new_value) values (v_new.id, v_batch, 'dibuat', v_harga::text);
      c_baru := c_baru + 1;
    else
      v_ubah := (v_old.price, v_old.stock, v_old.is_active, v_old.label, v_old.group_id)
                is distinct from (v_harga, v_stok, v_tampil, r->>'varian', v_grp);
      update public.variants set
        group_id = v_grp, label = r->>'varian',
        duration_qty = (r->>'durasi_jumlah')::numeric, duration_unit = r->>'durasi_satuan',
        duration_days = (r->>'durasi_hari')::int, user_count = (r->>'jumlah_user')::int, device = r->>'perangkat',
        price = v_harga, stock = v_stok, is_active = v_tampil, sort = n,
        updated_at = case when v_ubah then now() else updated_at end
      where id = v_old.id
      returning * into v_new;
      if v_old.price is distinct from v_harga then
        insert into public.price_history(variant_id, batch_id, field, old_value, new_value)
        values (v_new.id, v_batch, 'harga', v_old.price::text, v_harga::text);
      end if;
      if v_old.stock is distinct from v_stok then
        insert into public.price_history(variant_id, batch_id, field, old_value, new_value)
        values (v_new.id, v_batch, 'stok', v_old.stock, v_stok);
      end if;
      if v_old.is_active is distinct from v_tampil then
        insert into public.price_history(variant_id, batch_id, field, old_value, new_value)
        values (v_new.id, v_batch, 'tampil', v_old.is_active::text, v_tampil::text);
      end if;
      if v_old.label is distinct from r->>'varian' then
        insert into public.price_history(variant_id, batch_id, field, old_value, new_value)
        values (v_new.id, v_batch, 'label', v_old.label, r->>'varian');
      end if;
    end if;
    v_dipakai := v_dipakai || v_new.id;

    -- ---- data internal (HPP, markup, harga manual, catatan)
    if v_cost.hpp is distinct from v_hpp then
      insert into public.price_history(variant_id, batch_id, field, old_value, new_value)
      values (v_new.id, v_batch, 'hpp', v_cost.hpp::text, v_hpp::text);
      v_ubah := true;
    end if;
    insert into public.variant_costs as vc (variant_id, hpp, markup, manual_price, admin_note)
    values (v_new.id, v_hpp, v_markup, v_manual, r->>'catatan')
    on conflict (variant_id) do update set
      hpp = excluded.hpp, markup = excluded.markup, manual_price = excluded.manual_price,
      admin_note = case when r ? 'catatan' then excluded.admin_note else vc.admin_note end,
      updated_at = now()
    where (vc.hpp, vc.markup, vc.manual_price, vc.admin_note)
          is distinct from (excluded.hpp, excluded.markup, excluded.manual_price,
                            case when r ? 'catatan' then excluded.admin_note else vc.admin_note end);

    if v_old.id is not null then
      if v_ubah then c_ubah := c_ubah + 1; else c_sama := c_sama + 1; end if;
    end if;
  end loop;

  -- ---- varian yang tidak ada di file: dibiarkan, kecuali diminta dinonaktifkan
  if p_nonaktifkan_hilang then
    with mati as (
      update public.variants set is_active = false, updated_at = now()
      where is_active and not (id = any(v_dipakai))
      returning id
    ), log as (
      insert into public.price_history(variant_id, batch_id, field, old_value, new_value)
      select id, v_batch, 'tampil', 'true', 'false' from mati returning 1
    )
    select count(*) into c_nonaktif from log;
  end if;

  update public.import_batches
  set summary = jsonb_build_object('baru', c_baru, 'berubah', c_ubah, 'sama', c_sama, 'dinonaktifkan', c_nonaktif)
  where id = v_batch;

  return jsonb_build_object('batch_id', v_batch, 'baru', c_baru, 'berubah', c_ubah,
                            'sama', c_sama, 'dinonaktifkan', c_nonaktif);
end $$;

-- ---------------------------------------------------------------- RPC batalkan impor
-- Mengembalikan nilai lama untuk satu unggahan. Nilai yang sudah diubah lagi oleh unggahan
-- berikutnya tidak ditimpa (dilaporkan sebagai konflik). Varian yang dibuat unggahan ini
-- disembunyikan, bukan dihapus.
create or replace function public.batalkan_impor(p_batch_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  h record;
  c_balik int := 0;
  c_konflik int := 0;
  ok boolean;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  perform 1 from public.import_batches where id = p_batch_id and status = 'applied' for update;
  if not found then raise exception 'Unggahan tidak ditemukan atau sudah dibatalkan'; end if;

  for h in select * from public.price_history where batch_id = p_batch_id order by id desc loop
    ok := false;
    if h.field = 'harga' then
      update public.variants set price = h.old_value::int, updated_at = now()
      where id = h.variant_id and price::text = h.new_value returning true into ok;
    elsif h.field = 'stok' then
      update public.variants set stock = h.old_value, updated_at = now()
      where id = h.variant_id and stock = h.new_value returning true into ok;
    elsif h.field = 'tampil' then
      update public.variants set is_active = h.old_value::boolean, updated_at = now()
      where id = h.variant_id and is_active::text = h.new_value returning true into ok;
    elsif h.field = 'label' then
      update public.variants set label = h.old_value, updated_at = now()
      where id = h.variant_id and label = h.new_value returning true into ok;
    elsif h.field = 'hpp' then
      update public.variant_costs set hpp = h.old_value::int, updated_at = now()
      where variant_id = h.variant_id and hpp::text is not distinct from h.new_value returning true into ok;
    elsif h.field = 'dibuat' then
      update public.variants set is_active = false, updated_at = now()
      where id = h.variant_id returning true into ok;
    end if;
    if coalesce(ok, false) then c_balik := c_balik + 1; else c_konflik := c_konflik + 1; end if;
  end loop;

  update public.import_batches set status = 'rolled_back', rolled_back_at = now() where id = p_batch_id;
  return jsonb_build_object('dikembalikan', c_balik, 'konflik', c_konflik);
end $$;

-- hanya user login (dan RLS/is_admin) yang boleh memanggil RPC ini
revoke execute on function public.impor_katalog(jsonb, text, timestamptz, boolean) from public, anon;
revoke execute on function public.batalkan_impor(uuid) from public, anon;
grant execute on function public.impor_katalog(jsonb, text, timestamptz, boolean) to authenticated;
grant execute on function public.batalkan_impor(uuid) to authenticated;
grant execute on function public.katalog_json() to anon, authenticated;
