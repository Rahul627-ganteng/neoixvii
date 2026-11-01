-- ============================================================================
-- Revisi: Promo Terkini per kelompok, Blog berita aplikasi, bayar QRIS, garansi dari admin, HPP per item
--   1. promos.kelompok & bundles.kelompok : editing / ai / streaming / lainnya (kosong = otomatis dari kategori)
--   2. posts                                : berita aplikasi untuk Blog (+ bucket publik "blog")
--   3. store_settings.qris_url & qris_aktif : gambar QRIS untuk tombol "Bayar sekarang"
--   4. aktifkan_garansi_admin()             : admin mengaktifkan garansi langsung dari pesanan (+ screenshot)
--   5. ubah_hpp_pesanan()                   : admin mengubah HPP item pesanan (misalnya saat promo)
-- Jalankan di SQL Editor Supabase SETELAH migration pesanan_admin_laporan. Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------- 1. kelompok promo
create or replace function public.kelompok_kategori(p_label text)
returns text
language sql immutable set search_path = '' as $$
  select case
    when lower(p_label) like '%edit%' or lower(p_label) like '%desain%' or lower(p_label) like '%design%' then 'editing'
    when lower(p_label) in ('ai', 'a.i.') or lower(p_label) like 'ai %' or lower(p_label) like '% ai' then 'ai'
    when lower(p_label) in ('nonton', 'musik', 'streaming', 'film', 'video', 'music') then 'streaming'
    else 'lainnya'
  end
$$;
alter table public.promos  add column if not exists kelompok text check (kelompok is null or kelompok in ('editing', 'ai', 'streaming', 'lainnya'));
alter table public.bundles add column if not exists kelompok text check (kelompok is null or kelompok in ('editing', 'ai', 'streaming', 'lainnya'));

create or replace function public.promo_json()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'promos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'title_en', p.title_en, 'body', p.body,
                                          'body_en', p.body_en, 'banner', p.banner_url, 'link', p.link_url, 'ends', p.ends_on,
                                          'kelompok', coalesce(p.kelompok, (
                                            select public.kelompok_kategori(c.label) from public.apps a join public.categories c on c.id = a.category_id
                                            where p.link_url like '/aplikasi/?app=%' and a.slug = split_part(split_part(p.link_url, 'app=', 2), '&', 1) limit 1), 'lainnya'))
                       order by p.sort, p.id)
      from public.promos p
      where p.is_active and (p.starts_on is null or p.starts_on <= public.hari_ini_wib())
        and (p.ends_on is null or p.ends_on >= public.hari_ini_wib())), '[]'::jsonb),
    'bundles', coalesce((
      select jsonb_agg(x.j order by x.sort, x.id) from (
        select b.id, b.sort, jsonb_build_object(
          'id', b.id, 'name', b.name, 'name_en', b.name_en, 'desc', b.description, 'desc_en', b.description_en,
          'banner', b.banner_url, 'ends', b.ends_on,
          'kelompok', coalesce(b.kelompok, mode() within group (order by public.kelompok_kategori(c.label)), 'lainnya'),
          -- harga tidak pernah di bawah batas untung, dan tidak pernah di atas harga normal
          'price', least(sum(v.price), greatest(b.price, (ceil(sum(public.batas_bundle(v.price, vc.hpp, vc.bundle_max_pct)) / 500.0) * 500)::int)),
          'normal', sum(v.price),
          'items', jsonb_agg(jsonb_build_object('code', v.code, 'app', a.name, 'slug', a.slug, 'tipe', g.label,
                                                'd', v.label, 'p', v.price, 'h', v.duration_days) order by a.sort, g.sort, v.sort)) as j
        from public.bundles b
        join public.bundle_items bi on bi.bundle_id = b.id
        join public.variants v      on v.id = bi.variant_id
        join public.plan_groups g   on g.id = v.group_id
        join public.apps a          on a.id = g.app_id
        join public.categories c    on c.id = a.category_id
        left join public.variant_costs vc on vc.variant_id = v.id
        where b.is_active and (b.starts_on is null or b.starts_on <= public.hari_ini_wib())
          and (b.ends_on is null or b.ends_on >= public.hari_ini_wib())
        group by b.id
        -- sembunyikan otomatis kalau ada varian/aplikasi yang disembunyikan atau habis
        having bool_and(v.is_active and a.is_active and v.stock = 'tersedia') and count(*) >= 2
      ) x), '[]'::jsonb),
    'rules', coalesce((select jsonb_agg(jsonb_build_object('min', r.min_apps, 'pct', r.discount_pct) order by r.min_apps)
                       from public.bundle_rules r), '[]'::jsonb),
    'durasi', coalesce((select jsonb_agg(jsonb_build_object('hari', d.min_days, 'pct', d.extra_pct) order by d.min_days)
                        from public.bundle_duration_rules d), '[]'::jsonb))
$$;
grant execute on function public.promo_json() to anon, authenticated;

-- ---------------------------------------------------------------- 2. blog
create table if not exists public.posts (
  id           bigint generated always as identity primary key,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 90),
  title        text not null check (length(title) between 3 and 140),
  title_en     text check (title_en is null or length(title_en) <= 140),
  excerpt      text check (excerpt is null or length(excerpt) <= 300),
  excerpt_en   text check (excerpt_en is null or length(excerpt_en) <= 300),
  body         text not null default '' check (length(body) <= 40000),
  body_en      text check (body_en is null or length(body_en) <= 40000),
  cover_url    text,
  app_id       bigint references public.apps(id) on delete set null,
  source_url   text check (source_url is null or source_url ~ '^https://'),
  is_published boolean not null default false,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists posts_terbit_idx on public.posts(published_at desc) where is_published;
alter table public.posts enable row level security;
drop policy if exists publik_baca on public.posts;
create policy publik_baca on public.posts for select to anon, authenticated
  using ((is_published and published_at <= now()) or (select public.is_admin()));
drop policy if exists admin_semua on public.posts;
create policy admin_semua on public.posts for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into storage.buckets (id, name, public) values ('blog', 'blog', true) on conflict (id) do nothing;
drop policy if exists blog_admin_tambah on storage.objects;
drop policy if exists blog_admin_ubah on storage.objects;
drop policy if exists blog_admin_hapus on storage.objects;
create policy blog_admin_tambah on storage.objects for insert to authenticated
  with check (bucket_id = 'blog' and (select public.is_admin()));
create policy blog_admin_ubah on storage.objects for update to authenticated
  using (bucket_id = 'blog' and (select public.is_admin())) with check (bucket_id = 'blog' and (select public.is_admin()));
create policy blog_admin_hapus on storage.objects for delete to authenticated
  using (bucket_id = 'blog' and (select public.is_admin()));

-- ---------------------------------------------------------------- 3. QRIS
alter table public.store_settings add column if not exists qris_url text;
alter table public.store_settings add column if not exists qris_aktif boolean not null default true;

-- ---------------------------------------------------------------- 4. garansi dari admin
alter table public.warranties drop constraint if exists warranties_source_check;
alter table public.warranties add constraint warranties_source_check check (source in ('form', 'tempel', 'admin'));

-- Data diambil dari pesanan (nama, nomor, aplikasi, durasi, tanggal beli). Device & screenshot opsional.
create or replace function public.aktifkan_garansi_admin(p_kode text, p_device text default null, p_screenshot text default null,
                                                         p_catatan text default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  o    public.orders;
  w    public.warranties;
  v_tepat boolean;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into o from public.orders where code = p_kode;
  if o.id is null then raise exception 'Pesanan % tidak ditemukan', p_kode; end if;
  if o.status not in ('aktif', 'selesai') then raise exception 'Garansi hanya untuk pesanan berstatus Aktif atau Selesai'; end if;
  if p_screenshot is not null and p_screenshot !~ '^admin/' then raise exception 'Screenshot tidak valid'; end if;
  v_tepat := case when o.delivered_at is null then null else now() <= o.delivered_at + interval '24 hours' end;

  select * into w from public.warranties where order_id = o.id order by id limit 1;
  if w.id is null then
    insert into public.warranties (order_id, customer_name, phone, app_name, duration, purchased_on, device, screenshot_path,
                                   source, on_time, status, admin_note)
    select o.id, left(o.customer_name, 80), nullif(o.customer_wa, ''),
           string_agg(distinct i.app_name, ', '), string_agg(i.app_name || case when i.variant_label <> '-' then ' ' || i.variant_label else '' end, ', ' order by i.id),
           (o.created_at at time zone 'Asia/Jakarta')::date, nullif(btrim(p_device), ''), p_screenshot,
           'admin', v_tepat, 'aktif', nullif(btrim(p_catatan), '')
    from public.order_items i where i.order_id = o.id
    returning * into w;
  else
    update public.warranties set status = 'aktif',
      device = coalesce(nullif(btrim(p_device), ''), device),
      screenshot_path = coalesce(p_screenshot, screenshot_path),
      admin_note = coalesce(nullif(btrim(p_catatan), ''), admin_note)
    where id = w.id returning * into w;
  end if;
  return jsonb_build_object('id', w.id, 'status', w.status, 'tepat_waktu', w.on_time, 'baru', w.source = 'admin' and w.submitted_at > now() - interval '5 seconds');
end $$;
revoke execute on function public.aktifkan_garansi_admin(text, text, text, text) from public, anon;
grant execute on function public.aktifkan_garansi_admin(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------- 5. ubah HPP item pesanan
-- p_items: [{id, hpp}] (hpp kosong = tidak diketahui). Komisi affiliate pesanan itu ikut dihitung ulang.
create or replace function public.ubah_hpp_pesanan(p_kode text, p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  e jsonb;
  n int := 0;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into o from public.orders where code = p_kode for update;
  if o.id is null then raise exception 'Pesanan % tidak ditemukan', p_kode; end if;
  for e in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if nullif(e->>'hpp', '') is not null and ((e->>'hpp')::int < 0 or (e->>'hpp')::int > 100000000) then raise exception 'HPP tidak valid'; end if;
    update public.order_items set hpp = nullif(e->>'hpp', '')::int
    where id = (e->>'id')::bigint and order_id = o.id and hpp is distinct from nullif(e->>'hpp', '')::int;
    n := n + (case when found then 1 else 0 end);
  end loop;
  -- komisi affiliate dari pesanan ini mengikuti HPP baru
  if n > 0 and o.partner_id is not null and o.status in ('aktif', 'selesai') then
    delete from public.affiliate_sales where order_id = o.id and source = 'pesanan';
    perform public._komisi_dari_pesanan(o.id);
  end if;
  return jsonb_build_object('diubah', n,
    'hpp', (select sum(coalesce(hpp, 0)) from public.order_items where order_id = o.id),
    'komisi', (select coalesce(sum(commission), 0) from public.affiliate_sales where order_id = o.id));
end $$;
revoke execute on function public.ubah_hpp_pesanan(text, jsonb) from public, anon;
grant execute on function public.ubah_hpp_pesanan(text, jsonb) to authenticated;

-- ---------------------------------------------------------------- 6. HPP dari panel Stok & harga
-- Mengubah HPP di panel tidak lagi menggeser harga jual saat impor Excel berikutnya (harga panel dikunci sebagai harga manual).
create or replace function public.simpan_varian(p jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_old   public.variants;
  v_new   public.variants;
  v_cost  public.variant_costs;
  v_app   bigint := (p->>'app_id')::bigint;
  v_tipe  text := btrim(coalesce(p->>'tipe', ''));
  v_label text := btrim(coalesce(p->>'varian', ''));
  v_harga int  := (p->>'harga')::int;
  v_hari  int  := nullif(p->>'durasi_hari', '')::int;
  v_hpp   int;
  v_grp   bigint;
  v_qty   int;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if nullif(p->>'code', '') is not null then
    select * into v_old from public.variants where code = p->>'code' for update;
    if v_old.id is null then raise exception 'Varian % tidak ditemukan', p->>'code'; end if;
    if v_app is null then select g.app_id into v_app from public.plan_groups g where g.id = v_old.group_id; end if;
  end if;
  if v_app is null or not exists (select 1 from public.apps where id = v_app) then raise exception 'Pilih aplikasinya'; end if;
  if length(v_tipe) not between 1 and 60 then raise exception 'Tipe akun harus 1 sampai 60 huruf'; end if;
  if length(v_label) not between 1 and 60 then raise exception 'Nama varian harus 1 sampai 60 huruf'; end if;
  if v_harga is null or v_harga not between 1000 and 100000000 then raise exception 'Harga harus Rp1.000 sampai Rp100.000.000'; end if;
  if v_hari is not null and v_hari not between 1 and 36500 then raise exception 'Durasi harus 1 sampai 36500 hari'; end if;
  if p ? 'hpp' then
    v_hpp := nullif(p->>'hpp', '')::int;
    if v_hpp is not null and v_hpp not between 0 and 100000000 then raise exception 'HPP tidak valid'; end if;
  end if;

  -- tipe akun: pakai yang sudah ada (tanpa beda huruf besar/kecil) atau buat baru
  select g.id into v_grp from public.plan_groups g where g.app_id = v_app and g.label_key = public.norm_key(v_tipe);
  if v_grp is null then
    insert into public.plan_groups(app_id, label, sort)
    values (v_app, v_tipe, coalesce((select max(sort) + 1 from public.plan_groups where app_id = v_app), 0))
    returning id into v_grp;
  end if;
  if exists (select 1 from public.variants x where x.group_id = v_grp and x.label_key = public.norm_key(v_label)
             and x.id is distinct from v_old.id) then
    raise exception 'Varian "%" sudah ada di tipe %', v_label, v_tipe;
  end if;

  if v_old.id is null then
    v_qty := case when coalesce((p->>'hitung')::boolean, false) then coalesce((p->>'jumlah')::int, 0) end;
    insert into public.variants(group_id, label, duration_days, price, stock_qty, is_active, sort)
    values (v_grp, v_label, v_hari, v_harga, v_qty, coalesce((p->>'tampil')::boolean, true),
            coalesce((select max(sort) + 1 from public.variants where group_id = v_grp), 0))
    returning * into v_new;
    insert into public.variant_costs(variant_id, hpp, manual_price) values (v_new.id, v_hpp, v_harga);
    insert into public.price_history(variant_id, field, new_value) values (v_new.id, 'dibuat', v_harga::text);
  else
    update public.variants set
      group_id = v_grp, label = v_label, duration_days = v_hari, price = v_harga,
      is_active = coalesce((p->>'tampil')::boolean, is_active),
      stock_qty = case when p ? 'hitung' then case when (p->>'hitung')::boolean then coalesce((p->>'jumlah')::int, stock_qty, 0) end
                       else stock_qty end,
      updated_at = now()
    where id = v_old.id returning * into v_new;
    select * into v_cost from public.variant_costs where variant_id = v_old.id;
    insert into public.variant_costs as vc (variant_id, hpp, manual_price)
    values (v_old.id, case when p ? 'hpp' then v_hpp end, v_harga)
    on conflict (variant_id) do update set
      hpp = case when p ? 'hpp' then excluded.hpp else vc.hpp end,
      manual_price = v_harga,   -- harga dari panel dikunci, jadi mengubah HPP tidak menggeser harga jual saat impor Excel
      updated_at = now();
    if v_old.price is distinct from v_new.price then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'harga', v_old.price::text, v_new.price::text);
    end if;
    if p ? 'hpp' and v_cost.hpp is distinct from v_hpp then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'hpp', v_cost.hpp::text, v_hpp::text);
    end if;
    if v_old.label is distinct from v_new.label then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'label', v_old.label, v_new.label);
    end if;
    if v_old.group_id is distinct from v_new.group_id then
      insert into public.price_history(variant_id, field, old_value, new_value)
      values (v_old.id, 'tipe', (select label from public.plan_groups where id = v_old.group_id), v_tipe);
    end if;
    if v_old.duration_days is distinct from v_new.duration_days then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'durasi', v_old.duration_days::text, v_new.duration_days::text);
    end if;
    if v_old.is_active is distinct from v_new.is_active then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'tampil', v_old.is_active::text, v_new.is_active::text);
    end if;
    if v_old.stock_qty is distinct from v_new.stock_qty then
      insert into public.price_history(variant_id, field, old_value, new_value)
      values (v_old.id, 'jumlah', coalesce(v_old.stock_qty::text, 'tidak dihitung'), coalesce(v_new.stock_qty::text, 'tidak dihitung'));
    end if;
    if v_old.stock is distinct from v_new.stock then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'stok', v_old.stock, v_new.stock);
    end if;
    -- tipe akun lama yang jadi kosong dihapus
    if v_old.group_id <> v_grp and not exists (select 1 from public.variants where group_id = v_old.group_id) then
      delete from public.plan_groups where id = v_old.group_id;
    end if;
  end if;
  return jsonb_build_object('code', v_new.code, 'harga', v_new.price, 'jumlah', v_new.stock_qty, 'stok', v_new.stock, 'baru', v_old.id is null);
end $$;
revoke execute on function public.simpan_varian(jsonb) from public, anon;
grant execute on function public.simpan_varian(jsonb) to authenticated;
