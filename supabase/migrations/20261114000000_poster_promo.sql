-- ============================================================================
-- Generator promo dari poster story
--   1. bundle_items.qty            : satu paket bisa dihitung 2× (mis. Canva 1 Tahun ×2 = 2 tahun)
--   2. bundles: stok, best deal, kampanye (promo_id), harga_tetap; promos: lencana & warna tema
--      harga_tetap = pakai harga yang diisi admin persis (boleh di bawah margin minimum, misalnya harga poster promo)
--   3. order_items.qty             : stok & HPP ikut jumlahnya
--   4. promo_json() baru           : bundle 1 paket boleh, stok & "habis", best deal, kampanye
--   5. pesanan bundle              : cek & kurangi stok bundle, qty, bundle 1 paket
--   6. Baca poster dengan AI       : Claude dipanggil dari database (pg_net), API key disimpan privat
--   7. simpan_kampanye()           : simpan promo + semua bundle hasil generator sekaligus
-- Jalankan di SQL Editor Supabase SETELAH migration member_kupon_notif. Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------- 1–3. kolom baru
alter table public.bundle_items add column if not exists qty int not null default 1;
alter table public.bundle_items drop constraint if exists bundle_items_qty_cek;
alter table public.bundle_items add constraint bundle_items_qty_cek check (qty between 1 and 12);

alter table public.bundles
  add column if not exists stock_qty  int,
  add column if not exists stock_awal int,
  add column if not exists best_deal  boolean not null default false,
  add column if not exists promo_id   bigint references public.promos(id) on delete set null,
  add column if not exists harga_tetap boolean not null default false;
alter table public.bundles drop constraint if exists bundles_stok_cek;
alter table public.bundles add constraint bundles_stok_cek check (stock_qty is null or stock_qty between 0 and 9999);
create index if not exists bundles_promo on public.bundles (promo_id);

alter table public.promos
  add column if not exists lencana text,
  add column if not exists warna   text;
alter table public.promos drop constraint if exists promos_lencana_cek;
alter table public.promos add constraint promos_lencana_cek check (lencana is null or length(lencana) <= 40);
alter table public.promos drop constraint if exists promos_warna_cek;
alter table public.promos add constraint promos_warna_cek check (warna is null or warna ~ '^#[0-9a-fA-F]{6}$');

alter table public.order_items add column if not exists qty int not null default 1;
alter table public.order_items drop constraint if exists order_items_qty_cek;
alter table public.order_items add constraint order_items_qty_cek check (qty between 1 and 12);

-- stok awal dipakai untuk bilah "sisa stok" di website
create or replace function public._stok_awal_bundle()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.stock_qty is null then new.stock_awal := null;
  else new.stock_awal := greatest(coalesce(new.stock_awal, 0), new.stock_qty);
  end if;
  return new;
end $$;
drop trigger if exists stok_awal_bundle on public.bundles;
create trigger stok_awal_bundle before insert or update of stock_qty, stock_awal on public.bundles
  for each row execute function public._stok_awal_bundle();

-- HPP item pesanan = HPP satuan × jumlah
create or replace function public._hpp_item()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.hpp is null and new.variant_id is not null then
    select hpp * coalesce(new.qty, 1) into new.hpp from public.variant_costs where variant_id = new.variant_id;
  end if;
  return new;
end $$;
revoke execute on function public._hpp_item() from public, anon, authenticated;

-- stok varian (sesuai jumlah) dan stok bundle ikut status pesanan
create or replace function public._stok_pesanan()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('aktif', 'selesai') and not new.stock_taken then
    update public.variants v set stock_qty = greatest(0, v.stock_qty - x.n), updated_at = now()
    from (select variant_id, sum(qty)::int as n from public.order_items where order_id = new.id and variant_id is not null group by variant_id) x
    where v.id = x.variant_id and v.stock_qty is not null;
    if new.bundle_id is not null then
      update public.bundles set stock_qty = greatest(0, stock_qty - 1), updated_at = now()
      where id = new.bundle_id and stock_qty is not null;
    end if;
    new.stock_taken := true;
  elsif new.status = 'batal' and new.stock_taken then
    update public.variants v set stock_qty = v.stock_qty + x.n, updated_at = now()
    from (select variant_id, sum(qty)::int as n from public.order_items where order_id = new.id and variant_id is not null group by variant_id) x
    where v.id = x.variant_id and v.stock_qty is not null;
    if new.bundle_id is not null then
      update public.bundles set stock_qty = stock_qty + 1, updated_at = now()
      where id = new.bundle_id and stock_qty is not null;
    end if;
    new.stock_taken := false;
  end if;
  return new;
end $$;
revoke execute on function public._stok_pesanan() from public, anon, authenticated;

-- Harga bundle yang dipakai website. Biasanya tidak pernah di bawah batas untung (HPP + margin minimum);
-- kalau admin mencentang "harga tetap", harga yang diisi dipakai persis. Tidak pernah di atas harga normal.
create or replace function public._harga_bundle(p_harga int, p_tetap boolean, p_normal int, p_batas int)
returns int language sql immutable set search_path = '' as $$
  select case when p_tetap then least(p_normal, p_harga)
              else least(p_normal, greatest(p_harga, (ceil(p_batas / 500.0) * 500)::int)) end
$$;

-- ---------------------------------------------------------------- 4. bundle yang berlaku & promo_json
-- Bundle berlaku: aktif, dalam tanggal, dan (kalau bagian kampanye) kampanyenya juga aktif.
create or replace function public._bundle_berlaku(p_id bigint)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bundles b
    left join public.promos p on p.id = b.promo_id
    where b.id = p_id and b.is_active
      and (b.starts_on is null or b.starts_on <= public.hari_ini_wib())
      and (b.ends_on is null or b.ends_on >= public.hari_ini_wib())
      and (b.promo_id is null or (p.is_active
           and (p.starts_on is null or p.starts_on <= public.hari_ini_wib())
           and (p.ends_on is null or p.ends_on >= public.hari_ini_wib()))))
$$;
revoke execute on function public._bundle_berlaku(bigint) from public, anon;
grant execute on function public._bundle_berlaku(bigint) to authenticated;

create or replace function public.promo_json()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'promos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'title_en', p.title_en, 'body', p.body,
                                          'body_en', p.body_en, 'banner', p.banner_url, 'link', p.link_url, 'ends', p.ends_on,
                                          'lencana', p.lencana, 'warna', p.warna,
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
          'banner', b.banner_url, 'ends', least(b.ends_on, max(p.ends_on)), 'kampanye', b.promo_id,
          'kelompok', coalesce(b.kelompok, max(p.kelompok), mode() within group (order by public.kelompok_kategori(c.label)), 'lainnya'),
          -- harga tidak pernah di bawah batas untung, dan tidak pernah di atas harga normal
          'price', public._harga_bundle(b.price, b.harga_tetap, sum(v.price * bi.qty)::int, sum(public.batas_bundle(v.price, vc.hpp, vc.bundle_max_pct) * bi.qty)::int),
          'normal', sum(v.price * bi.qty),
          'stok', b.stock_qty, 'stok_awal', b.stock_awal, 'best', b.best_deal,
          'habis', coalesce(b.stock_qty = 0, false) or bool_or(v.stock = 'habis' or (v.stock_qty is not null and v.stock_qty < bi.qty)),
          'items', jsonb_agg(jsonb_build_object('code', v.code, 'app', a.name, 'slug', a.slug, 'tipe', g.label,
                                                'd', v.label, 'p', v.price, 'h', v.duration_days, 'q', bi.qty) order by a.sort, g.sort, v.sort)) as j
        from public.bundles b
        join public.bundle_items bi on bi.bundle_id = b.id
        join public.variants v      on v.id = bi.variant_id
        join public.plan_groups g   on g.id = v.group_id
        join public.apps a          on a.id = g.app_id
        join public.categories c    on c.id = a.category_id
        left join public.variant_costs vc on vc.variant_id = v.id
        left join public.promos p   on p.id = b.promo_id
        where public._bundle_berlaku(b.id)
        group by b.id
        -- sembunyikan otomatis kalau ada varian/aplikasi yang disembunyikan; yang habis tetap tampil dengan tanda HABIS
        having bool_and(v.is_active and a.is_active)
      ) x), '[]'::jsonb),
    'rules', coalesce((select jsonb_agg(jsonb_build_object('min', r.min_apps, 'pct', r.discount_pct) order by r.min_apps)
                       from public.bundle_rules r), '[]'::jsonb),
    'durasi', coalesce((select jsonb_agg(jsonb_build_object('hari', d.min_days, 'pct', d.extra_pct) order by d.min_days)
                        from public.bundle_duration_rules d), '[]'::jsonb))
$$;
grant execute on function public.promo_json() to anon, authenticated;

-- ringkasan bundle untuk admin (dengan jumlah, stok, kampanye)
drop view if exists public.v_bundle_admin;
create view public.v_bundle_admin with (security_invoker = true) as
select x.*, public._harga_bundle(x.price, x.harga_tetap, x.total_normal, x.batas_aman) as harga_tampil
from (
  select b.id, b.name, b.price, b.is_active, b.starts_on, b.ends_on, b.harga_tetap,
         count(bi.variant_id)::int                 as jumlah_item,
         coalesce(sum(k.hpp * bi.qty), 0)::int     as total_hpp,
         bool_or(k.hpp is null)                    as ada_hpp_kosong,
         coalesce(sum(k.harga * bi.qty), 0)::int   as total_normal,
         least(coalesce(sum(k.harga * bi.qty), 0), ceil(coalesce(sum(k.batas_bundle * bi.qty), 0) / 500.0) * 500)::int as batas_aman,
         coalesce(bool_and(k.tampil and k.stok = 'tersedia'), false) as semua_tersedia,
         b.stock_qty, b.stock_awal, b.best_deal, b.promo_id,
         public._bundle_berlaku(b.id)              as berlaku
  from public.bundles b
  left join public.bundle_items bi on bi.bundle_id = b.id
  left join public.variants v      on v.id = bi.variant_id
  left join public.v_katalog_admin k on k.code = v.code
  group by b.id
) x;
revoke all on public.v_bundle_admin from anon;

-- ---------------------------------------------------------------- 5. keranjang & pesanan
create or replace function public._subtotal_keranjang(p_items jsonb, p_rakit boolean)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_daftar jsonb;
  v_codes text[];
  v_bundle public.bundles;
  v_normal int := 0;
  v_batas int := 0;
  v_hpp int := 0;
  v_diskon int := 0;
  v_jenis text := 'satuan';
  r record;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 10 then
    raise exception 'Pilih 1 sampai 10 paket';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where e ? 'bundle') then
    select b.* into v_bundle from public.bundles b
    where b.id = (p_items->0->>'bundle')::bigint and public._bundle_berlaku(b.id);
    if v_bundle.id is null then raise exception 'Bundle ini sedang tidak tersedia'; end if;
    if v_bundle.stock_qty is not null and v_bundle.stock_qty <= 0 then raise exception 'Bundle ini sudah habis'; end if;
    select jsonb_agg(jsonb_build_object('code', v.code, 'q', bi.qty)) into v_daftar
    from public.bundle_items bi join public.variants v on v.id = bi.variant_id where bi.bundle_id = v_bundle.id;
    v_jenis := 'bundle';
  else
    select jsonb_agg(jsonb_build_object('code', x.code, 'q', 1)) into v_daftar
    from (select distinct e->>'code' as code from jsonb_array_elements(p_items) e where coalesce(e->>'code', '') <> '') x;
  end if;
  if v_daftar is null then raise exception 'Pilih 1 sampai 10 paket'; end if;
  select array_agg(d->>'code') into v_codes from jsonb_array_elements(v_daftar) d;
  for r in
    select v.price, coalesce(vc.hpp, 0) as hpp, public.batas_bundle(v.price, vc.hpp, vc.bundle_max_pct) as batas, (d->>'q')::int as q
    from jsonb_array_elements(v_daftar) d
    join public.variants v on v.code = d->>'code'
    join public.plan_groups g on g.id = v.group_id
    join public.apps a on a.id = g.app_id
    left join public.variant_costs vc on vc.variant_id = v.id
    where v.is_active and a.is_active
  loop
    v_normal := v_normal + r.price * r.q; v_batas := v_batas + r.batas * r.q; v_hpp := v_hpp + r.hpp * r.q;
  end loop;
  if v_jenis = 'bundle' then
    v_diskon := v_normal - public._harga_bundle(v_bundle.price, v_bundle.harga_tetap, v_normal, v_batas);
  elsif p_rakit and cardinality(v_codes) >= 2 then
    v_diskon := (public._hitung_rakit(v_codes)->>'diskon')::int;
    v_jenis := 'rakit';
  end if;
  return jsonb_build_object('normal', v_normal, 'diskon', v_diskon, 'subtotal', v_normal - v_diskon, 'hpp', v_hpp, 'jenis', v_jenis);
end $$;
revoke execute on function public._subtotal_keranjang(jsonb, boolean) from public, anon, authenticated;

create or replace function public.buat_pesanan(p_items jsonb, p_nama text, p_wa text, p_bahasa text default 'id',
                                               p_rakit boolean default false, p_member text default null, p_kupon text default null)
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
  v_batas  int := 0;
  v_hpp    int := 0;
  v_diskon int := 0;
  v_paket_diskon int := 0;
  v_items  jsonb := '[]'::jsonb;
  v_daftar jsonb;
  v_codes  text[];
  v_bundle public.bundles;
  v_paket  text;
  v_total  int;
  v_hitung jsonb;
  v_x      jsonb;
  v_member bigint;
  v_label  text;
  r        record;
  d        record;
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
  if (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Sedang banyak pesanan. Coba lagi beberapa menit lagi atau hubungi kami di WhatsApp.';
  end if;

  if exists (select 1 from jsonb_array_elements(p_items) e where e ? 'bundle') then
    if jsonb_array_length(p_items) <> 1 then raise exception 'Satu pesanan hanya untuk satu bundle'; end if;
    select b.* into v_bundle from public.bundles b
    where b.id = (p_items->0->>'bundle')::bigint and public._bundle_berlaku(b.id);
    if v_bundle.id is null then raise exception 'Bundle ini sedang tidak tersedia'; end if;
    if v_bundle.stock_qty is not null and v_bundle.stock_qty <= 0 then raise exception 'Bundle ini sudah habis'; end if;
    select jsonb_agg(jsonb_build_object('code', v.code, 'q', bi.qty) order by a.sort, g.sort, v.sort) into v_daftar
    from public.bundle_items bi
    join public.variants v on v.id = bi.variant_id
    join public.plan_groups g on g.id = v.group_id
    join public.apps a on a.id = g.app_id
    where bi.bundle_id = v_bundle.id;
    if v_daftar is null then raise exception 'Bundle ini sedang tidak tersedia'; end if;
    v_kind := 'bundle';
    v_paket := case when v_lang = 'en' then coalesce(v_bundle.name_en, v_bundle.name) else v_bundle.name end;
  else
    select jsonb_agg(jsonb_build_object('code', x.code, 'q', 1)) into v_daftar
    from (select distinct e->>'code' as code from jsonb_array_elements(p_items) e where coalesce(e->>'code', '') <> '') x;
    if v_daftar is null then raise exception 'Pilih 1 sampai 10 paket'; end if;
  end if;
  select array_agg(e->>'code') into v_codes from jsonb_array_elements(v_daftar) e;

  v_code := 'IX' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
  insert into public.orders (code, customer_name, customer_wa, lang, total)
  values (v_code, v_nama, v_wa, v_lang, 1)
  returning id, member_id into v_order, v_member;

  for d in select * from jsonb_to_recordset(v_daftar) as x(code text, q int) loop
    r := null;
    select v.id, v.code, v.label, v.price, v.stock, v.stock_qty, v.duration_days, g.label as tipe, a.name as aplikasi, a.slug,
           coalesce(vc.hpp, 0) as hpp, public.batas_bundle(v.price, vc.hpp, vc.bundle_max_pct) as batas
      into r
    from public.variants v
    join public.plan_groups g on g.id = v.group_id
    join public.apps a on a.id = g.app_id
    left join public.variant_costs vc on vc.variant_id = v.id
    where v.code = d.code and v.is_active and a.is_active;
    if r.id is null then
      if v_kind = 'bundle' then raise exception 'Bundle ini sedang tidak tersedia'; end if;
      raise exception 'Paket % tidak tersedia', d.code;
    end if;
    if r.stock = 'habis' or (r.stock_qty is not null and r.stock_qty < d.q) then
      if v_kind = 'bundle' then raise exception 'Bundle ini sudah habis'; end if;
      raise exception 'Paket % % sedang habis', r.aplikasi, r.label;
    end if;
    v_label := r.label || case when d.q > 1 then ' ×' || d.q else '' end;
    insert into public.order_items (order_id, variant_id, variant_code, app_name, plan_label, variant_label, price, duration_days, qty)
    values (v_order, r.id, r.code, r.aplikasi, r.tipe, v_label, r.price * d.q, r.duration_days * d.q, d.q);
    v_normal := v_normal + r.price * d.q;
    v_batas  := v_batas + r.batas * d.q;
    v_hpp    := v_hpp + r.hpp * d.q;
    v_items := v_items || jsonb_build_object('aplikasi', r.aplikasi, 'tipe', r.tipe, 'varian', v_label, 'harga', r.price * d.q,
                                             'kode', r.code, 'slug', r.slug, 'qty', d.q);
  end loop;

  if v_kind = 'bundle' then
    v_paket_diskon := v_normal - public._harga_bundle(v_bundle.price, v_bundle.harga_tetap, v_normal, v_batas);
  elsif p_rakit and cardinality(v_codes) >= 2 then
    v_hitung := public._hitung_rakit(v_codes);
    v_paket_diskon := (v_hitung->>'diskon')::int;
    v_kind := 'rakit';
  end if;

  -- diskon member & kupon (tidak di bawah HPP)
  v_x := public._diskon_tambahan(v_normal - v_paket_diskon, v_hpp, v_wa, p_member, p_kupon);
  if nullif(btrim(coalesce(p_kupon, '')), '') is not null and v_x->>'kupon_galat' is not null then
    raise exception '%', v_x->>'kupon_galat';
  end if;
  v_diskon := v_paket_diskon + (v_x->>'total')::int;
  v_total := v_normal - v_diskon;

  update public.orders set
    total = v_total,
    discount = v_diskon,
    kind = v_kind,
    bundle_id = v_bundle.id,
    bundle_name = v_bundle.name,
    member_id = coalesce((v_x->'member'->>'id')::bigint, v_member),
    member_discount = coalesce((v_x->'member'->>'rp')::int, 0),
    coupon_id = (v_x->'kupon'->>'id')::bigint,
    coupon_code = v_x->'kupon'->>'kode',
    coupon_discount = coalesce((v_x->'kupon'->>'rp')::int, 0),
    usd_rate = s.usd_rate,
    total_usd = case when s.usd_rate is not null then round(ceil(v_total / s.usd_rate * 100) / 100, 2) end
  where id = v_order;

  perform public._notif_pesanan(v_order);

  return jsonb_build_object(
    'kode', v_code, 'jenis', v_kind, 'paket', v_paket,
    'total_normal', v_normal, 'diskon', v_diskon, 'diskon_paket', v_paket_diskon,
    'diskon_member', coalesce((v_x->'member'->>'rp')::int, 0), 'member_pct', (v_x->'member'->>'pct')::numeric,
    'kupon', v_x->'kupon'->>'kode', 'diskon_kupon', coalesce((v_x->'kupon'->>'rp')::int, 0),
    'total', v_total,
    'total_usd', case when s.usd_rate is not null then round(ceil(v_total / s.usd_rate * 100) / 100, 2) end,
    'items', v_items, 'whatsapp', s.whatsapp_number,
    'pembayaran', case when v_lang = 'en' then coalesce(s.payment_info_en, s.payment_info) else s.payment_info end);
end $$;
revoke execute on function public.buat_pesanan(jsonb, text, text, text, boolean, text, text) from public;
grant execute on function public.buat_pesanan(jsonb, text, text, text, boolean, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 6. baca poster dengan AI (Claude)
-- API key disimpan di tabel privat tanpa policy: tidak bisa dibaca dari website maupun panel.
create table if not exists public.ai_settings (
  id            int primary key default 1 check (id = 1),
  anthropic_key text,
  model         text not null default 'claude-sonnet-5-5',
  updated_at    timestamptz not null default now()
);
insert into public.ai_settings (id) values (1) on conflict (id) do nothing;
alter table public.ai_settings enable row level security;
revoke all on public.ai_settings from anon, authenticated;

create table if not exists public.poster_reads (
  id          bigint generated always as identity primary key,
  image_url   text not null,
  kelompok    text,
  model       text,
  request_id  bigint,
  status      text not null default 'diproses' check (status in ('diproses', 'selesai', 'gagal')),
  hasil       jsonb,
  galat       text,
  pemakaian   jsonb,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  selesai_at  timestamptz
);
alter table public.poster_reads enable row level security;
drop policy if exists admin_baca on public.poster_reads;
create policy admin_baca on public.poster_reads for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.poster_reads from anon, authenticated;

create or replace function public.status_ai()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare a public.ai_settings;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into a from public.ai_settings where id = 1;
  return jsonb_build_object(
    'kunci', a.anthropic_key is not null,
    'akhir', case when a.anthropic_key is not null then right(a.anthropic_key, 4) end,
    'model', a.model,
    'pg_net', public._pg_net_aktif(),
    'bulan_ini', (select count(*) from public.poster_reads where status = 'selesai'
                  and created_at >= date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'),
    'token_bulan_ini', (select coalesce(sum((pemakaian->>'input_tokens')::int + (pemakaian->>'output_tokens')::int), 0)
                        from public.poster_reads where status = 'selesai'
                        and created_at >= date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'));
end $$;
revoke execute on function public.status_ai() from public, anon;
grant execute on function public.status_ai() to authenticated;

-- p: { "kunci": "sk-ant-…" (kosongkan untuk tidak mengubah), "hapus": true, "model": "claude-sonnet-5-5" }
create or replace function public.simpan_ai(p jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_kunci text := btrim(coalesce(p->>'kunci', ''));
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if v_kunci <> '' and (v_kunci !~ '^sk-ant-[A-Za-z0-9_-]{20,}$' or length(v_kunci) > 300) then
    raise exception 'API key Claude harus diawali sk-ant-';
  end if;
  if coalesce(p->>'model', '') <> '' and p->>'model' not in ('claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5') then
    raise exception 'Model tidak dikenal';
  end if;
  update public.ai_settings set
    anthropic_key = case when coalesce((p->>'hapus')::boolean, false) then null when v_kunci <> '' then v_kunci else anthropic_key end,
    model = coalesce(nullif(p->>'model', ''), model),
    updated_at = now()
  where id = 1;
  return public.status_ai();
end $$;
revoke execute on function public.simpan_ai(jsonb) from public, anon;
grant execute on function public.simpan_ai(jsonb) to authenticated;

-- Skema jawaban AI (JSON terstruktur)
create or replace function public._skema_poster()
returns jsonb language sql immutable set search_path = '' as $$
  select '{
    "type": "object", "additionalProperties": false,
    "required": ["judul", "subjudul", "lencana", "kelompok", "tanggal_normal", "berakhir_teks", "bundles"],
    "properties": {
      "judul": {"type": "string"},
      "subjudul": {"type": "string"},
      "lencana": {"type": "string"},
      "kelompok": {"type": "string", "enum": ["editing", "ai", "streaming", "lainnya"]},
      "tanggal_normal": {"type": "integer"},
      "berakhir_teks": {"type": "string"},
      "bundles": {"type": "array", "items": {
        "type": "object", "additionalProperties": false,
        "required": ["nama", "nama_en", "deskripsi", "deskripsi_en", "deskripsi_poster", "harga", "potongan", "harga_coret", "stok", "best_deal", "isi", "catatan"],
        "properties": {
          "nama": {"type": "string"}, "nama_en": {"type": "string"},
          "deskripsi": {"type": "string"}, "deskripsi_en": {"type": "string"}, "deskripsi_poster": {"type": "string"},
          "harga": {"type": "integer"}, "potongan": {"type": "integer"}, "harga_coret": {"type": "integer"},
          "stok": {"type": "integer"}, "best_deal": {"type": "boolean"},
          "isi": {"type": "array", "items": {"type": "object", "additionalProperties": false, "required": ["kode", "qty"],
                  "properties": {"kode": {"type": "string"}, "qty": {"type": "integer"}}}},
          "catatan": {"type": "string"}
        }}}
    }}'::jsonb
$$;

-- Mulai membaca poster. Hasilnya diambil dengan hasil_poster(id) beberapa detik kemudian.
create or replace function public.baca_poster(p_url text, p_kelompok text default null)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  a public.ai_settings;
  v_katalog text;
  v_prompt text;
  v_req bigint;
  v_id bigint;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into a from public.ai_settings where id = 1;
  if a.anthropic_key is null then raise exception 'API key Claude belum diisi'; end if;
  if not public._pg_net_aktif() then raise exception 'Ekstensi pg_net belum aktif'; end if;
  if p_url is null or p_url !~ '^https://[A-Za-z0-9.-]+/storage/v1/object/public/banners/[A-Za-z0-9._/-]+$' or length(p_url) > 500 then
    raise exception 'Alamat poster tidak valid';
  end if;
  if (select count(*) from public.poster_reads where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Sudah 30 poster dibaca dalam 1 jam. Coba lagi nanti.';
  end if;

  select string_agg(format('%s | %s | %s | %s | %s | %s', v.code, a2.name, g.label, v.label, v.price, coalesce(v.duration_days, 0)),
                    chr(10) order by c.sort, a2.sort, g.sort, v.sort)
    into v_katalog
  from public.variants v
  join public.plan_groups g on g.id = v.group_id
  join public.apps a2 on a2.id = g.app_id
  join public.categories c on c.id = a2.category_id
  where v.is_active and a2.is_active;

  v_prompt := 'Baca poster story promo di atas, lalu isi data sesuai skema. Aturan:
1. Satu blok produk di poster = satu bundle, urut dari atas ke bawah.
2. nama: judul blok dengan huruf besar-kecil yang wajar (contoh "CLAUDE SHARING 3U" menjadi "Claude Sharing 3U").
3. deskripsi_poster: teks deskripsi blok persis seperti di poster, tanpa baris stok dan potongan.
4. deskripsi: tulis ulang deskripsi_poster menjadi 1-2 kalimat bahasa Indonesia yang jelas dan santai. Sebutkan isi paket dan durasinya. Jangan menambah klaim, fitur, atau angka yang tidak ada di poster.
5. nama_en dan deskripsi_en: terjemahan bahasa Inggris yang natural.
6. harga: harga promo dalam rupiah penuh (130K = 130000). potongan dan harga_coret diambil dari tulisan "POTONGAN X DARI Y" (potongan = X, harga_coret = Y). Kalau angka besar di poster tidak sama dengan Y - X, pakai angka besar itu dan jelaskan di catatan. Isi 0 kalau tidak ada.
7. stok: angka di tulisan stok (mis. "STOK TERSISA 3 BUAH" = 3). 0 kalau tidak ada.
8. best_deal: true kalau blok itu punya label BEST DEAL. Label ini biasanya menempel di atas angka harga blok tersebut.
9. isi: cocokkan produk dengan katalog di bawah memakai kode varian. Pilih aplikasi, tipe, dan durasi yang paling sesuai dengan judul dan deskripsi. Kalau durasi di poster adalah kelipatan durasi sebuah varian (mis. "2 bulan" padahal yang ada 1 bulan, atau "2Y" padahal yang ada 1 tahun), pakai varian itu dengan qty kelipatannya; selain itu qty = 1. Kalau beberapa varian sama cocoknya, pilih yang total harga katalognya paling dekat dengan harga_coret. Jangan memakai kode yang tidak ada di katalog. Kalau ragu atau tidak ketemu, kosongkan isi dan jelaskan di catatan.
10. catatan: keraguan singkat untuk admin dalam bahasa Indonesia (kosong kalau yakin).
11. judul: judul besar poster dengan huruf besar-kecil wajar (mis. "Payday Sale Countdown"). subjudul: kalimat penjelasan di bawah judul dengan huruf kalimat. lencana: tulisan sorotan pendek seperti "Last Day Sale!" (kosong kalau tidak ada).
12. kelompok: editing, ai, streaming, atau lainnya, menurut tulisan "SEMUA APLIKASI ..." atau isi produknya.
13. tanggal_normal: tanggal (1-31) harga kembali normal kalau disebut (mis. "TANGGAL 3 BALIK HARGA NORMAL" = 3). 0 kalau tidak ada.
14. berakhir_teks: kalimat di poster tentang kapan promo berakhir, persis (kosong kalau tidak ada).
Hari ini ' || to_char(public.hari_ini_wib(), 'YYYY-MM-DD') || '.' ||
    case when p_kelompok in ('editing', 'ai', 'streaming', 'lainnya') then ' Admin memilih kelompok: ' || p_kelompok || '.' else '' end || '

Katalog (kode | aplikasi | tipe | varian | harga | durasi hari):
' || coalesce(v_katalog, '(kosong)');

  execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 120000)' into v_req
    using 'https://api.anthropic.com/v1/messages',
          jsonb_build_object(
            'model', a.model,
            'max_tokens', 8000,
            'system', 'Kamu membantu toko IXVII.CO (penjual langganan aplikasi premium) mengubah poster story promo menjadi data promo untuk website. Teliti membaca angka harga dan stok. Jawab hanya sesuai skema.',
            'messages', jsonb_build_array(jsonb_build_object('role', 'user', 'content', jsonb_build_array(
              jsonb_build_object('type', 'image', 'source', jsonb_build_object('type', 'url', 'url', p_url)),
              jsonb_build_object('type', 'text', 'text', v_prompt)))),
            'output_config', jsonb_build_object('format', jsonb_build_object('type', 'json_schema', 'schema', public._skema_poster()))),
          jsonb_build_object('x-api-key', a.anthropic_key, 'anthropic-version', '2026-10-21', 'content-type', 'application/json');

  insert into public.poster_reads (image_url, kelompok, model, request_id)
  values (p_url, nullif(p_kelompok, ''), a.model, v_req)
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.baca_poster(text, text) from public, anon;
grant execute on function public.baca_poster(text, text) to authenticated;

-- Ambil hasil bacaan. status: diproses / selesai / gagal
create or replace function public.hasil_poster(p_id bigint)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.poster_reads;
  v_status int;
  v_isi text;
  v_timeout boolean;
  v_err text;
  v_ada boolean := false;
  j jsonb;
  v_teks text;
  v_galat text;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into p from public.poster_reads where id = p_id;
  if p.id is null then raise exception 'Bacaan poster tidak ditemukan'; end if;
  if p.status <> 'diproses' then
    return jsonb_build_object('status', p.status, 'hasil', p.hasil, 'galat', p.galat, 'pemakaian', p.pemakaian);
  end if;

  if to_regclass('net._http_response') is not null then
    execute 'select true, status_code, content, timed_out, error_msg from net._http_response where id = $1'
      into v_ada, v_status, v_isi, v_timeout, v_err using p.request_id;
  end if;
  if not coalesce(v_ada, false) then
    if p.created_at < now() - interval '4 minutes' then
      update public.poster_reads set status = 'gagal', galat = 'Server AI tidak menjawab. Coba lagi.', selesai_at = now() where id = p.id;
      return jsonb_build_object('status', 'gagal', 'galat', 'Server AI tidak menjawab. Coba lagi.');
    end if;
    return jsonb_build_object('status', 'diproses', 'detik', extract(epoch from now() - p.created_at)::int);
  end if;

  begin j := v_isi::jsonb; exception when others then j := null; end;
  if coalesce(v_timeout, false) or v_status is null then
    v_galat := 'Waktu habis saat menghubungi Claude' || coalesce(' (' || v_err || ')', '') || '. Coba lagi.';
  elsif v_status <> 200 then
    v_galat := case
      when v_status = 401 then 'API key Claude salah atau sudah dicabut.'
      when v_status = 403 then 'API key ini tidak punya izin memakai model tersebut.'
      when v_status = 429 then 'Batas pemakaian API tercapai. Tunggu sebentar lalu coba lagi.'
      when v_status in (500, 529) then 'Server Claude sedang sibuk. Coba lagi beberapa saat lagi.'
      when coalesce(j->'error'->>'message', '') ilike '%credit%' then 'Saldo kredit API habis. Isi saldo di console.anthropic.com.'
      else 'Claude menolak permintaan (' || v_status || ')' end
      || coalesce(' — ' || left(j->'error'->>'message', 200), '');
  else
    select e->>'text' into v_teks from jsonb_array_elements(j->'content') e where e->>'type' = 'text' limit 1;
    if j->>'stop_reason' = 'max_tokens' then v_galat := 'Poster terlalu panjang untuk dibaca sekaligus.';
    elsif j->>'stop_reason' = 'refusal' or v_teks is null then v_galat := 'Claude tidak memberi jawaban untuk poster ini.';
    else
      begin
        update public.poster_reads set status = 'selesai', hasil = v_teks::jsonb, pemakaian = j->'usage', selesai_at = now() where id = p.id;
        return jsonb_build_object('status', 'selesai', 'hasil', v_teks::jsonb, 'pemakaian', j->'usage');
      exception when others then
        v_galat := 'Jawaban AI tidak terbaca. Coba lagi.';
      end;
    end if;
  end if;
  update public.poster_reads set status = 'gagal', galat = v_galat, pemakaian = j->'usage', selesai_at = now() where id = p.id;
  return jsonb_build_object('status', 'gagal', 'galat', v_galat);
end $$;
revoke execute on function public.hasil_poster(bigint) from public, anon;
grant execute on function public.hasil_poster(bigint) to authenticated;

-- ---------------------------------------------------------------- 7. simpan kampanye dari generator
-- p: { promo: {title, title_en, body, body_en, banner_url, lencana, warna, kelompok, starts_on, ends_on, is_active},
--      bundles: [{name, name_en, description, description_en, price, harga_tetap, stock_qty, best_deal, is_active, items: [{code, qty}]}] }
create or replace function public.simpan_kampanye(p jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  pr jsonb := p->'promo';
  b jsonb;
  it jsonb;
  v_promo bigint;
  v_bundle bigint;
  v_kel text := nullif(pr->>'kelompok', '');
  v_mulai date := nullif(pr->>'starts_on', '')::date;
  v_sampai date := nullif(pr->>'ends_on', '')::date;
  v_sort int;
  v_ids bigint[] := '{}';
  v_var bigint;
  i int := 0;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if length(btrim(coalesce(pr->>'title', ''))) not between 3 and 120 then raise exception 'Judul promo 3 sampai 120 huruf'; end if;
  if v_kel is not null and v_kel not in ('editing', 'ai', 'streaming', 'lainnya') then raise exception 'Kelompok tidak dikenal'; end if;
  if v_mulai is not null and v_sampai is not null and v_sampai < v_mulai then raise exception 'Tanggal selesai sebelum tanggal mulai'; end if;
  if jsonb_typeof(p->'bundles') <> 'array' or jsonb_array_length(p->'bundles') = 0 or jsonb_array_length(p->'bundles') > 30 then
    raise exception 'Isi 1 sampai 30 bundle';
  end if;

  select coalesce(max(sort), 0) + 10 into v_sort from public.promos;
  insert into public.promos (title, title_en, body, body_en, banner_url, lencana, warna, kelompok, starts_on, ends_on, is_active, sort)
  values (btrim(pr->>'title'), nullif(btrim(pr->>'title_en'), ''), nullif(btrim(pr->>'body'), ''), nullif(btrim(pr->>'body_en'), ''),
          nullif(pr->>'banner_url', ''), nullif(btrim(pr->>'lencana'), ''), nullif(pr->>'warna', ''), v_kel, v_mulai, v_sampai,
          coalesce((pr->>'is_active')::boolean, true), v_sort)
  returning id into v_promo;

  select coalesce(max(sort), 0) into v_sort from public.bundles;
  for b in select * from jsonb_array_elements(p->'bundles') loop
    i := i + 1;
    if length(btrim(coalesce(b->>'name', ''))) not between 2 and 80 then raise exception 'Bundle ke-%: nama 2 sampai 80 huruf', i; end if;
    if coalesce((b->>'price')::int, 0) < 1000 then raise exception 'Bundle "%": harga minimal Rp1.000', b->>'name'; end if;
    if nullif(b->>'stock_qty', '') is not null and (b->>'stock_qty')::int not between 0 and 9999 then raise exception 'Bundle "%": stok 0 sampai 9999', b->>'name'; end if;
    if jsonb_typeof(b->'items') <> 'array' or jsonb_array_length(b->'items') = 0 or jsonb_array_length(b->'items') > 8 then
      raise exception 'Bundle "%": pilih 1 sampai 8 paket', b->>'name';
    end if;
    insert into public.bundles (name, name_en, description, description_en, price, harga_tetap, stock_qty, best_deal, kelompok, promo_id,
                                starts_on, ends_on, is_active, sort)
    values (btrim(b->>'name'), nullif(btrim(b->>'name_en'), ''), nullif(btrim(b->>'description'), ''), nullif(btrim(b->>'description_en'), ''),
            (b->>'price')::int, coalesce((b->>'harga_tetap')::boolean, false), nullif(b->>'stock_qty', '')::int,
            coalesce((b->>'best_deal')::boolean, false), v_kel, v_promo,
            v_mulai, v_sampai, coalesce((b->>'is_active')::boolean, true), v_sort + i * 10)
    returning id into v_bundle;
    for it in select * from jsonb_array_elements(b->'items') loop
      select id into v_var from public.variants where code = upper(btrim(it->>'code'));
      if v_var is null then raise exception 'Bundle "%": kode % tidak ada di katalog', b->>'name', it->>'code'; end if;
      if coalesce((it->>'qty')::int, 1) not between 1 and 12 then raise exception 'Bundle "%": jumlah paket 1 sampai 12', b->>'name'; end if;
      insert into public.bundle_items (bundle_id, variant_id, qty) values (v_bundle, v_var, coalesce((it->>'qty')::int, 1))
      on conflict (bundle_id, variant_id) do update set qty = least(12, public.bundle_items.qty + excluded.qty);
    end loop;
    v_ids := v_ids || v_bundle;
  end loop;
  return jsonb_build_object('promo', v_promo, 'bundles', v_ids);
end $$;
revoke execute on function public.simpan_kampanye(jsonb) from public, anon;
grant execute on function public.simpan_kampanye(jsonb) to authenticated;

-- Hapus kampanye beserta bundle-nya (bundle yang sudah pernah dipesan tetap tercatat di pesanan)
create or replace function public.hapus_kampanye(p_promo bigint)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  delete from public.bundles where promo_id = p_promo;
  get diagnostics n = row_count;
  delete from public.promos where id = p_promo;
  return jsonb_build_object('bundle_dihapus', n);
end $$;
revoke execute on function public.hapus_kampanye(bigint) from public, anon;
grant execute on function public.hapus_kampanye(bigint) to authenticated;
