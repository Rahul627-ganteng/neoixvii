-- ============================================================================
-- Affiliate: komisi dari untung, saldo, penarikan, halaman saldo pribadi
--   1. affiliate_settings  : aturan komisi (persen dari untung, bagian minimum untuk owner, pembulatan,
--                            minimum penarikan, tanggal bayar)
--   2. partners            : + komisi per affiliate, tujuan bayar, token halaman saldo
--   3. affiliate_sales     : penjualan yang dibawa affiliate (dari tempel teks atau dari pesanan)
--      orders.partner_id   : pesanan atas nama affiliate → komisi tercatat otomatis saat Aktif,
--                            terhapus kalau pesanan Batal
--   4. affiliate_withdrawals: penarikan (dijadwalkan → dibayar)
--   5. saldo_affiliate()   : data halaman saldo pribadi /mitra/saldo/?k=… (tanpa HPP & nama pembeli)
-- Jalankan di SQL Editor Supabase SETELAH migration stok_varian. Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------- 1. aturan komisi
create table if not exists public.affiliate_settings (
  id             int primary key default 1 check (id = 1),
  rate_pct       numeric not null default 30   check (rate_pct between 0 and 90),     -- % dari untung
  min_owner_pct  numeric not null default 50   check (min_owner_pct between 0 and 100), -- bagian untung minimum untuk owner
  min_owner_rp   int     not null default 2000 check (min_owner_rp >= 0),              -- untung minimum owner per transaksi
  round_to       int     not null default 500  check (round_to in (1, 100, 500, 1000)),
  min_withdraw   int     not null default 25000 check (min_withdraw >= 0),
  payday         int     not null default 28   check (payday between 1 and 28),
  updated_at     timestamptz not null default now()
);
insert into public.affiliate_settings default values on conflict (id) do nothing;
alter table public.affiliate_settings enable row level security;
drop policy if exists admin_semua on public.affiliate_settings;
create policy admin_semua on public.affiliate_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Komisi = persen dari untung, tapi untung owner tidak pernah di bawah batas. Dibulatkan ke bawah.
-- HPP kosong = untung tidak diketahui → komisi 0 (isi HPP dulu).
create or replace function public.komisi_affiliate(p_harga int, p_hpp int, p_rate numeric)
returns int
language sql stable set search_path = '' as $$
  select case when p_hpp is null or p_harga is null or p_harga - p_hpp <= 0 or coalesce(p_rate, 0) <= 0 then 0
    else greatest(0, (floor(least(round((p_harga - p_hpp) * p_rate / 100.0),
                                  greatest(0, (p_harga - p_hpp) - s.min_owner_rp),
                                  (p_harga - p_hpp) * (1 - s.min_owner_pct / 100.0)) / s.round_to) * s.round_to)::int)
  end
  from public.affiliate_settings s where s.id = 1
$$;
revoke execute on function public.komisi_affiliate(int, int, numeric) from public, anon;
grant execute on function public.komisi_affiliate(int, int, numeric) to authenticated;

-- ---------------------------------------------------------------- 2. data affiliate di tabel mitra
alter table public.partners add column if not exists commission_pct numeric check (commission_pct is null or commission_pct between 0 and 90);
alter table public.partners add column if not exists payout_to text check (payout_to is null or length(payout_to) <= 120);
alter table public.partners add column if not exists balance_token text unique;

-- ---------------------------------------------------------------- 3. penjualan affiliate
alter table public.orders add column if not exists partner_id bigint references public.partners(id) on delete set null;

create table if not exists public.affiliate_sales (
  id            bigint generated always as identity primary key,
  partner_id    bigint not null references public.partners(id) on delete cascade,
  order_id      bigint references public.orders(id) on delete set null,
  order_item_id bigint unique references public.order_items(id) on delete set null,   -- satu item pesanan hanya sekali berkomisi
  sold_on       date not null default public.hari_ini_wib(),
  buyer_name    text,
  app_name      text not null,
  plan_label    text,
  variant_label text,
  variant_code  text,
  category      text,
  price         int not null check (price >= 0),
  hpp           int check (hpp is null or hpp >= 0),
  rate_pct      numeric not null,
  commission    int not null check (commission >= 0),
  source        text not null default 'tempel' check (source in ('tempel', 'pesanan', 'manual')),
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists affiliate_sales_partner_idx on public.affiliate_sales(partner_id, sold_on desc);
create index if not exists affiliate_sales_order_idx on public.affiliate_sales(order_id);
alter table public.affiliate_sales enable row level security;
drop policy if exists admin_semua on public.affiliate_sales;
create policy admin_semua on public.affiliate_sales for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public._rate_affiliate(p_partner bigint)
returns numeric
language sql stable set search_path = '' as $$
  select coalesce((select commission_pct from public.partners where id = p_partner),
                  (select rate_pct from public.affiliate_settings where id = 1), 0)
$$;

-- Catat beberapa penjualan sekaligus (hasil tempel teks). Komisi dihitung ulang di sini.
-- p_rows: [{app, tipe?, varian?, kode?, kategori?, harga, hpp?}]
create or replace function public.catat_penjualan_affiliate(p_partner bigint, p_rows jsonb, p_tanggal date default null,
                                                            p_pembeli text default null, p_catatan text default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  r jsonb;
  v_rate numeric;
  v_n int := 0;
  v_k int := 0;
  v_kom int;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if not exists (select 1 from public.partners where id = p_partner) then raise exception 'Pilih affiliate dulu'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then raise exception 'Belum ada produk'; end if;
  if jsonb_array_length(p_rows) > 100 then raise exception 'Maksimal 100 produk sekali simpan'; end if;
  v_rate := public._rate_affiliate(p_partner);
  for r in select * from jsonb_array_elements(p_rows) loop
    if coalesce(btrim(r->>'app'), '') = '' then raise exception 'Nama aplikasi kosong'; end if;
    if (r->>'harga')::int is null or (r->>'harga')::int < 0 then raise exception 'Harga % tidak valid', r->>'app'; end if;
    v_kom := public.komisi_affiliate((r->>'harga')::int, nullif(r->>'hpp', '')::int, v_rate);
    insert into public.affiliate_sales (partner_id, sold_on, buyer_name, app_name, plan_label, variant_label, variant_code, category,
                                        price, hpp, rate_pct, commission, source, note)
    values (p_partner, coalesce(p_tanggal, public.hari_ini_wib()), nullif(btrim(p_pembeli), ''), btrim(r->>'app'),
            nullif(r->>'tipe', ''), nullif(r->>'varian', ''), nullif(r->>'kode', ''), nullif(r->>'kategori', ''),
            (r->>'harga')::int, nullif(r->>'hpp', '')::int, v_rate, v_kom, 'tempel', nullif(btrim(p_catatan), ''));
    v_n := v_n + 1; v_k := v_k + v_kom;
  end loop;
  return jsonb_build_object('n', v_n, 'komisi', v_k, 'rate', v_rate);
end $$;
revoke execute on function public.catat_penjualan_affiliate(bigint, jsonb, date, text, text) from public, anon;
grant execute on function public.catat_penjualan_affiliate(bigint, jsonb, date, text, text) to authenticated;

-- Komisi dari pesanan: satu baris per item. Harga dibayar = harga item dikurangi bagian diskon rakitan/bundle.
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
         i.variant_label, i.variant_code, c.label, x.dibayar, vc.hpp, v_rate,
         public.komisi_affiliate(x.dibayar, vc.hpp, v_rate), 'pesanan'
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

-- Admin memilih affiliate untuk sebuah pesanan (kosong = tanpa affiliate)
create or replace function public.atur_affiliate_pesanan(p_kode text, p_partner bigint)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  n int := 0;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into o from public.orders where code = p_kode for update;
  if o.id is null then raise exception 'Pesanan % tidak ditemukan', p_kode; end if;
  if p_partner is not null and not exists (select 1 from public.partners where id = p_partner) then raise exception 'Affiliate tidak ditemukan'; end if;
  if o.partner_id is distinct from p_partner then
    delete from public.affiliate_sales where order_id = o.id and source = 'pesanan';
    update public.orders set partner_id = p_partner, updated_at = now() where id = o.id;
  end if;
  if p_partner is not null and o.status in ('aktif', 'selesai') then n := public._komisi_dari_pesanan(o.id); end if;
  return jsonb_build_object('kode', p_kode, 'partner', p_partner, 'dicatat', n,
    'komisi', (select coalesce(sum(commission), 0) from public.affiliate_sales where order_id = o.id));
end $$;
revoke execute on function public.atur_affiliate_pesanan(text, bigint) from public, anon;
grant execute on function public.atur_affiliate_pesanan(text, bigint) to authenticated;

-- Otomatis: pesanan Aktif/Selesai → komisi tercatat; Batal → komisi pesanan itu dihapus
create or replace function public._affiliate_pesanan()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.partner_id is not null and new.status in ('aktif', 'selesai') then
    perform public._komisi_dari_pesanan(new.id);
  elsif new.status = 'batal' then
    delete from public.affiliate_sales where order_id = new.id and source = 'pesanan';
  end if;
  return null;
end $$;
revoke execute on function public._affiliate_pesanan() from public, anon, authenticated;
drop trigger if exists affiliate_pesanan on public.orders;
create trigger affiliate_pesanan after update of status on public.orders
  for each row when (new.status is distinct from old.status) execute function public._affiliate_pesanan();

-- Ubah komisi % seorang affiliate; p_lama = true → penjualan yang sudah tercatat ikut dihitung ulang
create or replace function public.ubah_komisi_affiliate(p_partner bigint, p_rate numeric, p_lama boolean default false)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  n int := 0;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if p_rate is not null and (p_rate < 0 or p_rate > 90) then raise exception 'Komisi harus 0 sampai 90%%'; end if;
  update public.partners set commission_pct = p_rate, updated_at = now() where id = p_partner;
  if p_lama then
    update public.affiliate_sales s set rate_pct = public._rate_affiliate(p_partner),
           commission = public.komisi_affiliate(s.price, s.hpp, public._rate_affiliate(p_partner))
    where s.partner_id = p_partner;
    get diagnostics n = row_count;
  end if;
  return jsonb_build_object('rate', public._rate_affiliate(p_partner), 'dihitung_ulang', n);
end $$;
revoke execute on function public.ubah_komisi_affiliate(bigint, numeric, boolean) from public, anon;
grant execute on function public.ubah_komisi_affiliate(bigint, numeric, boolean) to authenticated;

-- ---------------------------------------------------------------- 4. penarikan
create table if not exists public.affiliate_withdrawals (
  id           bigint generated always as identity primary key,
  partner_id   bigint not null references public.partners(id) on delete cascade,
  amount       int not null check (amount > 0),
  requested_on date not null default public.hari_ini_wib(),
  scheduled_on date,
  status       text not null default 'dijadwalkan' check (status in ('dijadwalkan', 'dibayar')),
  paid_on      date,
  note         text check (note is null or length(note) <= 200),
  created_at   timestamptz not null default now()
);
create index if not exists affiliate_withdrawals_partner_idx on public.affiliate_withdrawals(partner_id);
alter table public.affiliate_withdrawals enable row level security;
drop policy if exists admin_semua on public.affiliate_withdrawals;
create policy admin_semua on public.affiliate_withdrawals for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- tanggal bayar berikutnya (hari ini masih boleh)
create or replace function public.tanggal_bayar_affiliate(p_dari date default null)
returns date
language sql stable set search_path = '' as $$
  select case when make_date(extract(year from d)::int, extract(month from d)::int, s.payday) >= d
              then make_date(extract(year from d)::int, extract(month from d)::int, s.payday)
              else (make_date(extract(year from d)::int, extract(month from d)::int, s.payday) + interval '1 month')::date end
  from public.affiliate_settings s, (select coalesce(p_dari, public.hari_ini_wib()) as d) x
  where s.id = 1
$$;

-- Saldo per affiliate (admin)
create or replace view public.v_saldo_affiliate with (security_invoker = true) as
select p.id as partner_id, p.name, p.kind, p.whatsapp, p.referral_code, p.payout_to, p.is_active,
       p.commission_pct, coalesce(p.commission_pct, st.rate_pct) as rate_pct,
       coalesce(s.n, 0) as n, coalesce(s.omzet, 0) as omzet, coalesce(s.untung, 0) as untung, coalesce(s.komisi, 0) as komisi,
       coalesce(w.dibayar, 0) as dibayar, coalesce(w.ditahan, 0) as ditahan,
       coalesce(s.komisi, 0) - coalesce(w.dibayar, 0) - coalesce(w.ditahan, 0) as tersedia,
       coalesce(s.untung, 0) - coalesce(s.komisi, 0) as untung_owner,
       s.terakhir, p.balance_token is not null as punya_link
from public.partners p
cross join public.affiliate_settings st
left join lateral (select count(*)::int as n, sum(price)::int as omzet, sum(price - coalesce(hpp, price))::int as untung,
                          sum(commission)::int as komisi, max(sold_on) as terakhir
                   from public.affiliate_sales where partner_id = p.id) s on true
left join lateral (select sum(amount) filter (where status = 'dibayar')::int as dibayar,
                          sum(amount) filter (where status = 'dijadwalkan')::int as ditahan
                   from public.affiliate_withdrawals where partner_id = p.id) w on true
where st.id = 1;
revoke all on public.v_saldo_affiliate from anon;

create or replace function public.ajukan_penarikan(p_partner bigint, p_jumlah int, p_jadwal date default null, p_catatan text default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_saldo int;
  v_min int;
  v_id bigint;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select tersedia into v_saldo from public.v_saldo_affiliate where partner_id = p_partner;
  select min_withdraw into v_min from public.affiliate_settings where id = 1;
  if v_saldo is null then raise exception 'Affiliate tidak ditemukan'; end if;
  if p_jumlah is null or p_jumlah <= 0 then raise exception 'Isi jumlah penarikannya'; end if;
  if p_jumlah < v_min then raise exception 'Minimum penarikan Rp%', replace(to_char(v_min, 'FM999,999,999'), ',', '.'); end if;
  if p_jumlah > v_saldo then raise exception 'Saldo hanya Rp%', replace(to_char(v_saldo, 'FM999,999,999'), ',', '.'); end if;
  insert into public.affiliate_withdrawals (partner_id, amount, scheduled_on, note)
  values (p_partner, p_jumlah, coalesce(p_jadwal, public.tanggal_bayar_affiliate()), nullif(btrim(p_catatan), ''))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'saldo', v_saldo - p_jumlah);
end $$;
revoke execute on function public.ajukan_penarikan(bigint, int, date, text) from public, anon;
grant execute on function public.ajukan_penarikan(bigint, int, date, text) to authenticated;

-- ---------------------------------------------------------------- 5. halaman saldo pribadi
create or replace function public.buat_link_saldo(p_partner bigint, p_baru boolean default false)
returns text
language plpgsql security invoker set search_path = '' as $$
declare
  v text;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select balance_token into v from public.partners where id = p_partner;
  if not found then raise exception 'Affiliate tidak ditemukan'; end if;
  if v is null or p_baru then
    v := replace(gen_random_uuid()::text, '-', '');
    update public.partners set balance_token = v where id = p_partner;
  end if;
  return v;
end $$;
revoke execute on function public.buat_link_saldo(bigint, boolean) from public, anon;
grant execute on function public.buat_link_saldo(bigint, boolean) to authenticated;

-- Data untuk affiliate sendiri: tanpa HPP, tanpa nama pembeli, tanpa untung owner
create or replace function public.saldo_affiliate(p_token text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'nama', p.name, 'kode', p.referral_code, 'jenis', p.kind, 'komisi_pct', coalesce(p.commission_pct, st.rate_pct),
    'n', coalesce(b.n, 0), 'komisi', coalesce(b.komisi, 0), 'dibayar', coalesce(b.dibayar, 0), 'diproses', coalesce(b.ditahan, 0),
    'saldo', coalesce(b.tersedia, 0), 'min_tarik', st.min_withdraw, 'tanggal_bayar', st.payday,
    'bayar_berikut', public.tanggal_bayar_affiliate(),
    'bulan_ini', (select coalesce(sum(commission), 0) from public.affiliate_sales
                  where partner_id = p.id and date_trunc('month', sold_on::timestamp) = date_trunc('month', public.hari_ini_wib()::timestamp)),
    'penjualan', coalesce((select jsonb_agg(jsonb_build_object('tgl', s.sold_on, 'app', s.app_name, 'tipe', s.plan_label,
                                                                'varian', s.variant_label, 'komisi', s.commission) order by s.sold_on desc, s.id desc)
                           from (select * from public.affiliate_sales where partner_id = p.id order by sold_on desc, id desc limit 60) s), '[]'::jsonb),
    'penarikan', coalesce((select jsonb_agg(jsonb_build_object('diajukan', w.requested_on, 'jadwal', w.scheduled_on, 'jumlah', w.amount,
                                                                'status', w.status, 'dibayar', w.paid_on) order by w.requested_on desc, w.id desc)
                           from public.affiliate_withdrawals w where w.partner_id = p.id), '[]'::jsonb))
  from public.partners p
  cross join public.affiliate_settings st
  left join public.v_saldo_affiliate b on b.partner_id = p.id
  where p_token ~ '^[0-9a-f]{32}$' and p.balance_token = p_token and st.id = 1
$$;
grant execute on function public.saldo_affiliate(text) to anon, authenticated;
