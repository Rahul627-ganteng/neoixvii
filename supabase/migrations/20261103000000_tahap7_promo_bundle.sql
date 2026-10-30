-- ============================================================================
-- Tahap 7: promo, bundle, dan Rakit Bundle Sendiri (Custom Bundling Builder)
--   1. bundle_rules : diskon bertingkat menurut jumlah aplikasi yang dirakit
--   2. promos       : banner/pengumuman promo dengan tanggal mulai & selesai
--   3. bundles      : paket bundle buatan admin dengan harga tetap (+ bundle_items)
--   4. bucket Storage publik "banners"
--   5. promo_json() : promo & bundle yang sedang berlaku (bundle otomatis hilang kalau ada varian habis)
--   6. bundle_quote(): hitung diskon rakitan. Diskon tiap varian dibatasi harga_minimum (dari HPP +
--                      pricing_settings), jadi rakitan tidak pernah di bawah batas aman. HPP tidak dikirim.
--   7. orders: kolom diskon & jenis pesanan; buat_pesanan menghitung ulang harga bundle/rakitan di server
-- Jalankan sekali di SQL Editor Supabase, SETELAH migration Tahap 6.
-- ============================================================================

create or replace function public.hari_ini_wib() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Jakarta')::date
$$;

-- ---------------------------------------------------------------- 1. aturan diskon rakitan
create table if not exists public.bundle_rules (
  id           bigint generated always as identity primary key,
  min_apps     int     not null unique check (min_apps between 2 and 20),
  discount_pct numeric not null check (discount_pct > 0 and discount_pct <= 0.5),   -- 0.05 = 5%
  updated_at   timestamptz not null default now()
);
-- Angka awal hanya CONTOH supaya halaman bisa dicoba. Ubah di panel admin → Promo & bundle.
insert into public.bundle_rules (min_apps, discount_pct)
select * from (values (2, 0.05), (3, 0.08), (4, 0.10)) v(m, d)
where not exists (select 1 from public.bundle_rules);

-- ---------------------------------------------------------------- 2. promo
create table if not exists public.promos (
  id          bigint generated always as identity primary key,
  title       text not null,
  title_en    text,
  body        text,
  body_en     text,
  banner_url  text,
  link_url    text check (link_url is null or link_url ~ '^(/|https://)'),
  starts_on   date,
  ends_on     date,
  is_active   boolean not null default true,
  sort        int not null default 0,
  updated_at  timestamptz not null default now(),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);

-- ---------------------------------------------------------------- 3. bundle harga tetap
create table if not exists public.bundles (
  id             bigint generated always as identity primary key,
  name           text not null,
  name_en        text,
  description    text,
  description_en text,
  banner_url     text,
  price          int  not null check (price >= 1000),
  starts_on      date,
  ends_on        date,
  is_active      boolean not null default false,     -- bundle baru berstatus draf
  sort           int not null default 0,
  updated_at     timestamptz not null default now(),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);
create table if not exists public.bundle_items (
  bundle_id  bigint not null references public.bundles(id) on delete cascade,
  variant_id bigint not null references public.variants(id) on delete cascade,
  primary key (bundle_id, variant_id)
);

alter table public.bundle_rules enable row level security;
alter table public.promos       enable row level security;
alter table public.bundles      enable row level security;
alter table public.bundle_items enable row level security;

create policy publik_baca on public.bundle_rules for select to anon, authenticated using (true);
create policy publik_baca on public.promos for select to anon, authenticated using (
  (is_active and (starts_on is null or starts_on <= public.hari_ini_wib()) and (ends_on is null or ends_on >= public.hari_ini_wib()))
  or (select public.is_admin()));
create policy publik_baca on public.bundles for select to anon, authenticated using (
  (is_active and (starts_on is null or starts_on <= public.hari_ini_wib()) and (ends_on is null or ends_on >= public.hari_ini_wib()))
  or (select public.is_admin()));
create policy publik_baca on public.bundle_items for select to anon, authenticated using (true);
do $$
declare t text;
begin
  foreach t in array array['bundle_rules', 'promos', 'bundles', 'bundle_items'] loop
    execute format('create policy admin_semua on public.%I for all to authenticated
                    using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- Ringkasan bundle untuk admin: total normal, batas aman (jumlah harga_minimum), status stok.
create or replace view public.v_bundle_admin with (security_invoker = true) as
select b.id, b.name, b.price, b.is_active, b.starts_on, b.ends_on,
       count(bi.variant_id)::int                         as jumlah_item,
       coalesce(sum(k.harga), 0)::int                   as total_normal,
       -- sama dengan Rakit Bundle: paket yang harganya sudah di bawah harga_minimum tidak didiskon
       case when bool_and(k.hpp is not null and k.hpp > 0) then sum(least(k.harga, k.harga_minimum))::int end as batas_aman,
       coalesce(bool_and(k.tampil and k.stok = 'tersedia'), false) as semua_tersedia
from public.bundles b
left join public.bundle_items bi on bi.bundle_id = b.id
left join public.variants v      on v.id = bi.variant_id
left join public.v_katalog_admin k on k.code = v.code
group by b.id;
revoke all on public.v_bundle_admin from anon;

-- ---------------------------------------------------------------- 4. bucket banner
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;
create policy banners_admin_tambah on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and (select public.is_admin()));
create policy banners_admin_ubah on storage.objects for update to authenticated
  using (bucket_id = 'banners' and (select public.is_admin()))
  with check (bucket_id = 'banners' and (select public.is_admin()));
create policy banners_admin_hapus on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and (select public.is_admin()));

-- ---------------------------------------------------------------- 5. promo & bundle yang berlaku
create or replace function public.promo_json()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'promos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'title_en', p.title_en, 'body', p.body,
                                          'body_en', p.body_en, 'banner', p.banner_url, 'link', p.link_url, 'ends', p.ends_on)
                       order by p.sort, p.id)
      from public.promos p
      where p.is_active and (p.starts_on is null or p.starts_on <= public.hari_ini_wib())
        and (p.ends_on is null or p.ends_on >= public.hari_ini_wib())), '[]'::jsonb),
    'bundles', coalesce((
      select jsonb_agg(x.j order by x.sort, x.id) from (
        select b.id, b.sort, jsonb_build_object(
          'id', b.id, 'name', b.name, 'name_en', b.name_en, 'desc', b.description, 'desc_en', b.description_en,
          'banner', b.banner_url, 'ends', b.ends_on,
          'price', least(b.price, sum(v.price)), 'normal', sum(v.price),
          'items', jsonb_agg(jsonb_build_object('code', v.code, 'app', a.name, 'slug', a.slug, 'tipe', g.label,
                                                'd', v.label, 'p', v.price, 'h', v.duration_days) order by a.sort, g.sort, v.sort)) as j
        from public.bundles b
        join public.bundle_items bi on bi.bundle_id = b.id
        join public.variants v      on v.id = bi.variant_id
        join public.plan_groups g   on g.id = v.group_id
        join public.apps a          on a.id = g.app_id
        where b.is_active and (b.starts_on is null or b.starts_on <= public.hari_ini_wib())
          and (b.ends_on is null or b.ends_on >= public.hari_ini_wib())
        group by b.id
        -- sembunyikan otomatis kalau ada varian/aplikasi yang disembunyikan atau habis
        having bool_and(v.is_active and a.is_active and v.stock = 'tersedia') and count(*) >= 2
      ) x), '[]'::jsonb),
    'rules', coalesce((select jsonb_agg(jsonb_build_object('min', r.min_apps, 'pct', r.discount_pct) order by r.min_apps)
                       from public.bundle_rules r), '[]'::jsonb))
$$;
grant execute on function public.promo_json() to anon, authenticated;

-- ---------------------------------------------------------------- 6. hitung rakitan
-- Fungsi internal: TIDAK boleh dipanggil langsung dari browser (bisa dipakai menebak HPP).
create or replace function public._hitung_rakit(p_codes text[])
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  s        public.pricing_settings;
  v_codes  text[];
  v_n      int;
  v_pct    numeric;
  v_normal int := 0;
  v_ruang  numeric := 0;
  v_diskon int;
  v_items  jsonb := '[]'::jsonb;
  r        record;
  v_batas  numeric;
begin
  select * into s from public.pricing_settings where id = 1;
  select array_agg(distinct c) into v_codes from unnest(coalesce(p_codes, '{}')) c where c is not null and c <> '';
  if v_codes is null then raise exception 'Pilih paket dulu'; end if;
  if cardinality(v_codes) > 10 then raise exception 'Maksimal 10 paket dalam satu rakitan'; end if;

  for r in
    select v.code, v.label, v.price, v.stock, v.duration_days, g.label as tipe, a.id as app_id, a.name as aplikasi, vc.hpp
    from unnest(v_codes) c(code)
    left join public.variants v on v.code = c.code and v.is_active
    left join public.plan_groups g on g.id = v.group_id
    left join public.apps a on a.id = g.app_id and a.is_active
    left join public.variant_costs vc on vc.variant_id = v.id
    order by a.sort, g.sort, v.sort
  loop
    if r.app_id is null then raise exception 'Ada paket yang sudah tidak tersedia. Muat ulang halaman.'; end if;
    if r.stock = 'habis' then raise exception 'Paket % % sedang habis', r.aplikasi, r.label; end if;
    v_items := v_items || jsonb_build_object('code', r.code, 'app_id', r.app_id, 'aplikasi', r.aplikasi, 'tipe', r.tipe,
                                             'varian', r.label, 'harga', r.price, 'durasi', r.duration_days, 'hpp', r.hpp);
  end loop;

  select count(distinct (e->>'app_id')) into v_n from jsonb_array_elements(v_items) e;
  if v_n < jsonb_array_length(v_items) then raise exception 'Pilih satu paket untuk setiap aplikasi'; end if;

  select coalesce(max(discount_pct), 0) into v_pct from public.bundle_rules where min_apps <= v_n;

  -- Ruang diskon tiap varian:
  --   HPP terisi (> 0): sampai harga_minimum (rumusnya sama dengan v_katalog_admin)
  --   HPP kosong atau 0 : maksimal bundle_fallback_pct dari harga (0 = tidak ikut diskon)
  for r in select (e->>'harga')::int as harga, (e->>'hpp')::int as hpp from jsonb_array_elements(v_items) e loop
    v_normal := v_normal + r.harga;
    if r.hpp is not null and r.hpp > 0 then
      v_batas := ceil(greatest(r.hpp + s.min_margin_rp, r.hpp / (1 - s.min_margin_pct)) / 500.0) * 500;
      v_ruang := v_ruang + least(r.harga * v_pct, greatest(r.harga - v_batas, 0));
    else
      v_ruang := v_ruang + least(r.harga * v_pct, r.harga * s.bundle_fallback_pct);
    end if;
  end loop;
  v_diskon := (floor(v_ruang / 500) * 500)::int;   -- dibulatkan ke bawah, kelipatan Rp500

  return jsonb_build_object(
    'items', (select jsonb_agg(e - 'hpp' - 'app_id') from jsonb_array_elements(v_items) e),
    'jumlah_app', v_n, 'persen', v_pct, 'total_normal', v_normal, 'diskon', v_diskon, 'total', v_normal - v_diskon);
end $$;
revoke execute on function public._hitung_rakit(text[]) from public, anon, authenticated;

-- RPC publik untuk halaman Rakit: hanya total normal, diskon, dan total akhir (tanpa HPP).
create or replace function public.bundle_quote(p_codes text[])
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  h jsonb := public._hitung_rakit(p_codes);
  b jsonb;
begin
  select jsonb_build_object('min', min_apps, 'pct', discount_pct) into b
  from public.bundle_rules where min_apps > (h->>'jumlah_app')::int order by min_apps limit 1;
  return h || jsonb_build_object('berikutnya', b);
end $$;
revoke execute on function public.bundle_quote(text[]) from public;
grant execute on function public.bundle_quote(text[]) to anon, authenticated;

-- ---------------------------------------------------------------- 7. pesanan
alter table public.orders
  add column if not exists kind        text not null default 'satuan' check (kind in ('satuan', 'rakit', 'bundle')),
  add column if not exists discount    int  not null default 0 check (discount >= 0),
  add column if not exists bundle_id   bigint references public.bundles(id) on delete set null,
  add column if not exists bundle_name text;

drop function if exists public.buat_pesanan(jsonb, text, text, text);
create or replace function public.buat_pesanan(p_items jsonb, p_nama text, p_wa text, p_bahasa text default 'id', p_rakit boolean default false)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s        public.store_settings;
  v_nama   text := btrim(coalesce(p_nama, ''));
  v_wa     text := regexp_replace(coalesce(p_wa, ''), '\D', '', 'g');
  v_lang   text := case when p_bahasa = 'en' then 'en' else 'id' end;
  v_code   text;
  v_order  bigint;
  v_kind   text := 'satuan';
  v_normal int := 0;
  v_diskon int := 0;
  v_items  jsonb := '[]'::jsonb;
  v_codes  text[];
  v_bundle public.bundles;
  v_paket  text;
  v_total  int;
  v_hitung jsonb;
  r        record;
  c        text;
begin
  select * into s from public.store_settings where id = 1;
  if s.whatsapp_number is null or not s.orders_open then
    raise exception 'Pemesanan belum dibuka';
  end if;
  if length(v_nama) < 2 or length(v_nama) > 60 then
    raise exception 'Nama harus 2 sampai 60 huruf';
  end if;
  if v_wa like '0%' then v_wa := '62' || substr(v_wa, 2);
  elsif v_wa like '8%' and length(v_wa) between 9 and 13 then v_wa := '62' || v_wa;
  end if;
  if length(v_wa) < 9 or length(v_wa) > 15 then
    raise exception 'Nomor WhatsApp tidak valid';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 10 then
    raise exception 'Pilih 1 sampai 10 paket';
  end if;
  if (select count(*) from public.orders where customer_wa = v_wa and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Terlalu banyak pesanan dari nomor ini. Coba lagi 10 menit lagi atau hubungi kami di WhatsApp.';
  end if;
  -- rem darurat kalau ada yang mengirim pesanan palsu terus-menerus dengan nomor berbeda-beda
  if (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Sedang banyak pesanan. Coba lagi beberapa menit lagi atau hubungi kami di WhatsApp.';
  end if;

  if exists (select 1 from jsonb_array_elements(p_items) e where e ? 'bundle') then
    -- bundle harga tetap: satu bundle per pesanan
    if jsonb_array_length(p_items) <> 1 then raise exception 'Satu pesanan hanya untuk satu bundle'; end if;
    select b.* into v_bundle from public.bundles b
    where b.id = (p_items->0->>'bundle')::bigint and b.is_active
      and (b.starts_on is null or b.starts_on <= public.hari_ini_wib())
      and (b.ends_on is null or b.ends_on >= public.hari_ini_wib());
    if v_bundle.id is null then raise exception 'Bundle ini sedang tidak tersedia'; end if;
    select array_agg(v.code) into v_codes from public.bundle_items bi join public.variants v on v.id = bi.variant_id
    where bi.bundle_id = v_bundle.id;
    if coalesce(cardinality(v_codes), 0) < 2 then raise exception 'Bundle ini sedang tidak tersedia'; end if;
    v_kind := 'bundle';
    v_paket := case when v_lang = 'en' then coalesce(v_bundle.name_en, v_bundle.name) else v_bundle.name end;
  else
    select array_agg(distinct e->>'code') into v_codes from jsonb_array_elements(p_items) e where coalesce(e->>'code', '') <> '';
    if v_codes is null then raise exception 'Pilih 1 sampai 10 paket'; end if;
  end if;

  v_code := 'IX' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
  insert into public.orders (code, customer_name, customer_wa, lang, total)
  values (v_code, v_nama, v_wa, v_lang, 1)          -- total diisi setelah item dihitung
  returning id into v_order;

  foreach c in array v_codes loop
    select v.id, v.code, v.label, v.price, v.stock, v.duration_days, g.label as tipe, a.name as aplikasi
      into r
    from public.variants v
    join public.plan_groups g on g.id = v.group_id
    join public.apps a on a.id = g.app_id
    where v.code = c and v.is_active and a.is_active;
    if r.id is null then
      if v_kind = 'bundle' then raise exception 'Bundle ini sedang tidak tersedia'; end if;
      raise exception 'Paket % tidak tersedia', c;
    end if;
    if r.stock = 'habis' then raise exception 'Paket % % sedang habis', r.aplikasi, r.label; end if;
    insert into public.order_items (order_id, variant_id, variant_code, app_name, plan_label, variant_label, price, duration_days)
    values (v_order, r.id, r.code, r.aplikasi, r.tipe, r.label, r.price, r.duration_days);
    v_normal := v_normal + r.price;
    v_items := v_items || jsonb_build_object('aplikasi', r.aplikasi, 'tipe', r.tipe, 'varian', r.label, 'harga', r.price);
  end loop;

  if v_kind = 'bundle' then
    v_diskon := greatest(v_normal - v_bundle.price, 0);
  elsif p_rakit and cardinality(v_codes) >= 2 then
    v_hitung := public._hitung_rakit(v_codes);     -- aturan yang sama dengan halaman Rakit
    v_diskon := (v_hitung->>'diskon')::int;
    v_kind := 'rakit';
  end if;
  v_total := v_normal - v_diskon;

  update public.orders set
    total = v_total,
    discount = v_diskon,
    kind = v_kind,
    bundle_id = v_bundle.id,
    bundle_name = v_bundle.name,
    usd_rate = s.usd_rate,
    total_usd = case when s.usd_rate is not null then round(ceil(v_total / s.usd_rate * 100) / 100, 2) end
  where id = v_order;

  return jsonb_build_object(
    'kode', v_code, 'jenis', v_kind, 'paket', v_paket,
    'total_normal', v_normal, 'diskon', v_diskon, 'total', v_total,
    'total_usd', case when s.usd_rate is not null then round(ceil(v_total / s.usd_rate * 100) / 100, 2) end,
    'items', v_items, 'whatsapp', s.whatsapp_number,
    'pembayaran', case when v_lang = 'en' then coalesce(s.payment_info_en, s.payment_info) else s.payment_info end);
end $$;

revoke execute on function public.buat_pesanan(jsonb, text, text, text, boolean) from public;
grant execute on function public.buat_pesanan(jsonb, text, text, text, boolean) to anon, authenticated;
