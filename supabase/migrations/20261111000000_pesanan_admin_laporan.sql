-- ============================================================================
-- Hapus varian, pesanan dari panel admin, laporan omzet & profit
--   1. hapus_varian()          : hapus varian permanen (pesanan lama tetap utuh karena menyimpan nama & harga)
--   2. order_items.hpp          : HPP disimpan per item saat pesanan dibuat, supaya profit lama tidak berubah
--      orders.paid_at           : kapan pesanan dibayar (dasar tanggal laporan)
--      orders.channel           : sumber penjualan (web, WhatsApp, Instagram, TikTok, Shopee, offline, lainnya)
--   3. buat_pesanan_admin()     : admin mencatat pesanan yang tidak lewat website
--   4. laporan_penjualan()      : omzet, HPP, komisi affiliate, profit per hari / minggu / bulan
-- Jalankan di SQL Editor Supabase SETELAH migration kebijakan. Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------- 1. hapus varian
alter table public.price_history drop constraint if exists price_history_field_check;
alter table public.price_history add constraint price_history_field_check
  check (field in ('dibuat', 'harga', 'hpp', 'stok', 'tampil', 'label', 'jumlah', 'durasi', 'tipe', 'dihapus'));

create or replace function public.hapus_varian(p_code text)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v      public.variants;
  v_app  text;
  v_tipe text;
  v_bnd  text;
  v_n    int;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into v from public.variants where code = p_code for update;
  if v.id is null then raise exception 'Varian % tidak ditemukan', p_code; end if;
  select a.name, g.label into v_app, v_tipe from public.plan_groups g join public.apps a on a.id = g.app_id where g.id = v.group_id;
  select string_agg(b.name, ', ') into v_bnd from public.bundle_items bi join public.bundles b on b.id = bi.bundle_id where bi.variant_id = v.id;
  if v_bnd is not null then
    raise exception 'Varian ini dipakai di bundle %. Keluarkan dari bundle dulu, atau sembunyikan saja.', v_bnd;
  end if;
  select count(*) into v_n from public.order_items where variant_id = v.id;
  -- riwayat tetap ada (variant_id jadi kosong); nama varian dicatat di teksnya
  insert into public.price_history(variant_id, field, old_value, new_value)
  values (v.id, 'dihapus', format('%s · %s %s %s · Rp%s', v.code, v_app, v_tipe, v.label, v.price), 'dihapus');
  delete from public.variants where id = v.id;
  if not exists (select 1 from public.variants where group_id = v.group_id) then
    delete from public.plan_groups where id = v.group_id;
  end if;
  return jsonb_build_object('code', v.code, 'pesanan_lama', v_n);
end $$;
revoke execute on function public.hapus_varian(text) from public, anon;
grant execute on function public.hapus_varian(text) to authenticated;

-- ---------------------------------------------------------------- 2. data untuk laporan
alter table public.order_items add column if not exists hpp int check (hpp is null or hpp >= 0);
update public.order_items i set hpp = vc.hpp
from public.variant_costs vc where vc.variant_id = i.variant_id and i.hpp is null;

create or replace function public._hpp_item()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.hpp is null and new.variant_id is not null then
    select hpp into new.hpp from public.variant_costs where variant_id = new.variant_id;
  end if;
  return new;
end $$;
revoke execute on function public._hpp_item() from public, anon, authenticated;
drop trigger if exists hpp_item on public.order_items;
create trigger hpp_item before insert on public.order_items for each row execute function public._hpp_item();

alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists channel text not null default 'web'
  check (channel in ('web', 'whatsapp', 'instagram', 'tiktok', 'shopee', 'offline', 'lainnya'));
update public.orders set paid_at = coalesce(delivered_at, updated_at, created_at)
where paid_at is null and status in ('dibayar', 'aktif', 'selesai');

create or replace function public._tanggal_bayar()
returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status in ('dibayar', 'aktif', 'selesai') and new.paid_at is null then new.paid_at := now(); end if;
  if new.status = 'menunggu_bayar' then new.paid_at := null; end if;
  return new;
end $$;
drop trigger if exists tanggal_bayar on public.orders;
create trigger tanggal_bayar before update of status on public.orders
  for each row when (new.status is distinct from old.status) execute function public._tanggal_bayar();

-- komisi affiliate memakai HPP yang tersimpan di item pesanan (termasuk item di luar katalog)
create or replace function public._komisi_dari_pesanan(p_order bigint)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  v_rate numeric;
  v_normal int;
  n int;
begin
  select * into o from public.orders where id = p_order;
  if o.partner_id is null then return 0; end if;
  v_rate := public._rate_affiliate(o.partner_id);
  select sum(price) into v_normal from public.order_items where order_id = o.id;
  insert into public.affiliate_sales (partner_id, order_id, order_item_id, sold_on, buyer_name, app_name, plan_label, variant_label,
                                      variant_code, category, price, hpp, rate_pct, commission, source)
  select o.partner_id, o.id, i.id, (o.created_at at time zone 'Asia/Jakarta')::date, o.customer_name, i.app_name, i.plan_label,
         i.variant_label, i.variant_code, c.label, x.dibayar, coalesce(i.hpp, vc.hpp), v_rate,
         public.komisi_affiliate(x.dibayar, coalesce(i.hpp, vc.hpp), v_rate), 'pesanan'
  from public.order_items i
  cross join lateral (select case when v_normal > 0 then round(i.price::numeric * o.total / v_normal)::int else i.price end as dibayar) x
  left join public.variant_costs vc on vc.variant_id = i.variant_id
  left join public.variants v on v.id = i.variant_id
  left join public.plan_groups g on g.id = v.group_id
  left join public.apps a on a.id = g.app_id
  left join public.categories c on c.id = a.category_id
  where i.order_id = o.id
  on conflict (order_item_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public._komisi_dari_pesanan(bigint) from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. pesanan dari panel admin
-- p: {nama, wa?, lang?, channel, status, tanggal?, diskon?, catatan?, partner?,
--     items: [{code, harga?} | {app, tipe?, varian?, harga, hpp?, hari?}]}
--   code = varian katalog (harga boleh diubah, HPP ikut katalog); tanpa code = item di luar katalog.
--   tanggal = tanggal transaksi (boleh mundur untuk mencatat penjualan yang terlewat).
create or replace function public.buat_pesanan_admin(p jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_nama    text := btrim(coalesce(p->>'nama', ''));
  v_wa      text := regexp_replace(coalesce(p->>'wa', ''), '\D', '', 'g');
  v_lang    text := case when p->>'lang' = 'en' then 'en' else 'id' end;
  v_channel text := coalesce(nullif(p->>'channel', ''), 'whatsapp');
  v_status  text := coalesce(nullif(p->>'status', ''), 'menunggu_bayar');
  v_tgl     date := coalesce(nullif(p->>'tanggal', '')::date, public.hari_ini_wib());
  v_diskon  int  := greatest(0, coalesce(nullif(p->>'diskon', '')::int, 0));
  v_partner bigint := nullif(p->>'partner', '')::bigint;
  v_waktu   timestamptz;
  v_code    text;
  v_order   bigint;
  v_normal  int := 0;
  v_hari    int;
  v_total   int;
  e         jsonb;
  r         record;
  v_harga   int;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if length(v_nama) not between 2 and 60 then raise exception 'Nama pembeli harus 2 sampai 60 huruf'; end if;
  if v_wa like '0%' then v_wa := '62' || substr(v_wa, 2);
  elsif v_wa like '8%' and length(v_wa) between 9 and 13 then v_wa := '62' || v_wa;
  end if;
  if v_wa <> '' and length(v_wa) not between 9 and 15 then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if v_status not in ('menunggu_bayar', 'dibayar', 'aktif', 'selesai') then raise exception 'Status awal tidak dikenal'; end if;
  if v_channel not in ('web', 'whatsapp', 'instagram', 'tiktok', 'shopee', 'offline', 'lainnya') then raise exception 'Sumber penjualan tidak dikenal'; end if;
  if v_tgl > public.hari_ini_wib() then raise exception 'Tanggal transaksi tidak boleh di masa depan'; end if;
  if v_tgl < public.hari_ini_wib() - 366 then raise exception 'Tanggal transaksi paling lama setahun yang lalu'; end if;
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 or jsonb_array_length(p->'items') > 30 then
    raise exception 'Isi 1 sampai 30 item';
  end if;
  if v_partner is not null and not exists (select 1 from public.partners where id = v_partner) then raise exception 'Affiliate tidak ditemukan'; end if;

  v_waktu := case when v_tgl = public.hari_ini_wib() then now() else (v_tgl + time '12:00') at time zone 'Asia/Jakarta' end;
  v_code := 'IX' || to_char(v_waktu at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
  insert into public.orders (code, customer_name, customer_wa, lang, total, channel, partner_id, admin_note, created_at, updated_at)
  values (v_code, v_nama, v_wa, v_lang, 1, v_channel, v_partner, nullif(btrim(p->>'catatan'), ''), v_waktu, now())
  returning id into v_order;

  for e in select * from jsonb_array_elements(p->'items') loop
    v_harga := nullif(e->>'harga', '')::int;
    if nullif(e->>'code', '') is not null then
      select v.id, v.code, v.label, v.price, v.duration_days, g.label as tipe, a.name as aplikasi into r
      from public.variants v join public.plan_groups g on g.id = v.group_id join public.apps a on a.id = g.app_id
      where v.code = e->>'code';
      if r.id is null then raise exception 'Varian % tidak ditemukan', e->>'code'; end if;
      v_harga := coalesce(v_harga, r.price);
      if v_harga < 0 or v_harga > 100000000 then raise exception 'Harga % tidak valid', r.aplikasi; end if;
      insert into public.order_items (order_id, variant_id, variant_code, app_name, plan_label, variant_label, price, duration_days, hpp)
      values (v_order, r.id, r.code, r.aplikasi, r.tipe, r.label, v_harga, r.duration_days, nullif(e->>'hpp', '')::int);
    else
      if length(btrim(coalesce(e->>'app', ''))) not between 1 and 80 then raise exception 'Nama item di luar katalog wajib diisi'; end if;
      if v_harga is null or v_harga < 0 or v_harga > 100000000 then raise exception 'Harga % tidak valid', e->>'app'; end if;
      insert into public.order_items (order_id, variant_id, variant_code, app_name, plan_label, variant_label, price, duration_days, hpp)
      values (v_order, null, 'MANUAL', btrim(e->>'app'), coalesce(nullif(btrim(e->>'tipe'), ''), '-'), coalesce(nullif(btrim(e->>'varian'), ''), '-'),
              v_harga, nullif(e->>'hari', '')::int, nullif(e->>'hpp', '')::int);
    end if;
    v_normal := v_normal + v_harga;
  end loop;

  if v_diskon > v_normal then raise exception 'Diskon lebih besar dari total harga'; end if;
  v_total := v_normal - v_diskon;
  if v_total <= 0 then raise exception 'Total pesanan harus lebih dari Rp0'; end if;
  update public.orders set total = v_total, discount = v_diskon where id = v_order;

  -- status awal lewat jalur yang sama dengan tombol status (stok, garansi, komisi affiliate ikut jalan)
  if v_status <> 'menunggu_bayar' then
    perform public.ubah_status_pesanan(v_code, v_status, null);
    if v_tgl < public.hari_ini_wib() then
      select max(duration_days) into v_hari from public.order_items where order_id = v_order;
      update public.orders set
        paid_at = v_waktu,
        starts_on = case when starts_on is not null then v_tgl end,
        ends_on = case when starts_on is not null and v_hari is not null then v_tgl + v_hari else ends_on end,
        ends_earliest = case when starts_on is not null and v_hari is not null then v_tgl + v_hari - case when v_hari >= 28 then 3 else 0 end else ends_earliest end,
        delivered_at = case when delivered_at is not null then v_waktu end
      where id = v_order;
    end if;
  end if;
  return jsonb_build_object('kode', v_code, 'total', v_total, 'diskon', v_diskon, 'status', v_status);
end $$;
revoke execute on function public.buat_pesanan_admin(jsonb) from public, anon;
grant execute on function public.buat_pesanan_admin(jsonb) to authenticated;

-- ---------------------------------------------------------------- 4. laporan omzet & profit
-- Pesanan dihitung kalau statusnya Dibayar, Aktif, atau Selesai, pada tanggal dibayar (WIB).
-- Omzet = total dibayar (sudah dikurangi diskon). HPP = HPP per item saat pesanan dibuat.
-- Profit = omzet − HPP − komisi affiliate pesanan itu. Item tanpa HPP dihitung HPP 0 dan dilaporkan jumlahnya.
create or replace function public.laporan_penjualan(p_satuan text, p_dari date, p_sampai date)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_unit text := case p_satuan when 'hari' then 'day' when 'minggu' then 'week' when 'bulan' then 'month' end;
  v_step interval := case p_satuan when 'hari' then interval '1 day' when 'minggu' then interval '1 week' else interval '1 month' end;
  v jsonb;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if v_unit is null then raise exception 'Satuan harus hari, minggu, atau bulan'; end if;
  if p_dari is null or p_sampai is null or p_sampai < p_dari then raise exception 'Rentang tanggal tidak valid'; end if;
  if p_sampai - p_dari > 3700 then raise exception 'Rentang maksimal 10 tahun'; end if;

  with o as (
    select o.id, o.total, o.channel, o.kind,
           (coalesce(o.paid_at, o.delivered_at, o.created_at) at time zone 'Asia/Jakarta')::date as tgl
    from public.orders o
    where o.status in ('dibayar', 'aktif', 'selesai')
  ), o2 as (
    select o.*, coalesce(i.n, 0) as n, coalesce(i.hpp, 0) as hpp, coalesce(i.kosong, 0) as kosong, coalesce(k.k, 0) as komisi
    from o
    left join lateral (select count(*)::int as n, sum(coalesce(hpp, 0))::bigint as hpp, (count(*) filter (where hpp is null))::int as kosong
                       from public.order_items where order_id = o.id) i on true
    left join lateral (select sum(commission)::bigint as k from public.affiliate_sales where order_id = o.id) k on true
    where o.tgl between p_dari and p_sampai
  ), seri as (
    select g::date as periode from generate_series(date_trunc(v_unit, p_dari::timestamp), p_sampai::timestamp, v_step) g
  ), per as (
    select date_trunc(v_unit, tgl::timestamp)::date as periode, count(*)::int as pesanan, sum(n)::int as item,
           sum(total)::bigint as omzet, sum(hpp)::bigint as hpp, sum(komisi)::bigint as komisi, sum(kosong)::int as tanpa_hpp
    from o2 group by 1
  ), item as (
    -- harga dibayar per item = harga item dikurangi bagian diskon pesanan (rakitan, bundle, diskon admin)
    select i.app_name, i.price, i.hpp, o2.total, sum(i.price) over (partition by i.order_id) as normal, o2.id as order_id
    from public.order_items i join o2 on o2.id = i.order_id
  )
  select jsonb_build_object(
    'satuan', p_satuan, 'dari', p_dari, 'sampai', p_sampai,
    'periode', coalesce((select jsonb_agg(jsonb_build_object(
        'periode', s.periode, 'pesanan', coalesce(per.pesanan, 0), 'item', coalesce(per.item, 0), 'omzet', coalesce(per.omzet, 0),
        'hpp', coalesce(per.hpp, 0), 'komisi', coalesce(per.komisi, 0),
        'profit', coalesce(per.omzet, 0) - coalesce(per.hpp, 0) - coalesce(per.komisi, 0), 'tanpa_hpp', coalesce(per.tanpa_hpp, 0))
        order by s.periode) from seri s left join per on per.periode = s.periode), '[]'::jsonb),
    'total', (select jsonb_build_object('pesanan', count(*), 'item', coalesce(sum(n), 0), 'omzet', coalesce(sum(total), 0),
        'hpp', coalesce(sum(hpp), 0), 'komisi', coalesce(sum(komisi), 0),
        'profit', coalesce(sum(total), 0) - coalesce(sum(hpp), 0) - coalesce(sum(komisi), 0), 'tanpa_hpp', coalesce(sum(kosong), 0)) from o2),
    'aplikasi', coalesce((select jsonb_agg(x order by (x->>'profit')::bigint desc) from (
        select jsonb_build_object('aplikasi', app_name, 'item', count(*),
          'omzet', sum(case when normal > 0 then round(price::numeric * total / normal) else price end)::bigint,
          'hpp', sum(coalesce(hpp, 0))::bigint,
          'profit', (sum(case when normal > 0 then round(price::numeric * total / normal) else price end) - sum(coalesce(hpp, 0)))::bigint,
          'tanpa_hpp', count(*) filter (where hpp is null)) as x
        from item group by app_name) a), '[]'::jsonb),
    'sumber', coalesce((select jsonb_agg(jsonb_build_object('sumber', channel, 'pesanan', n, 'omzet', omzet, 'profit', profit) order by omzet desc) from (
        select channel, count(*) as n, sum(total)::bigint as omzet, (sum(total) - sum(hpp) - sum(komisi))::bigint as profit
        from o2 group by channel) s), '[]'::jsonb),
    'affiliate_luar', (select jsonb_build_object('n', count(*), 'omzet', coalesce(sum(price), 0), 'komisi', coalesce(sum(commission), 0))
        from public.affiliate_sales where order_id is null and sold_on between p_dari and p_sampai)
  ) into v;
  return v;
end $$;
revoke execute on function public.laporan_penjualan(text, date, date) from public, anon;
grant execute on function public.laporan_penjualan(text, date, date) to authenticated;
