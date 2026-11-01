-- ============================================================================
-- Membership, kode kupon, notifikasi WhatsApp & email, program reseller, pendaftaran affiliate, terlaris
--   1. member_program : diskon member (default 4%, 10% untuk belanja ≥ Rp100.000) + masa berlaku
--      members        : pendaftaran cukup nama + nomor WA; link akun pribadi /member/?k=…
--   2. coupons        : kode kupon dengan masa berlaku, kuota, minimal belanja, khusus member
--      Diskon dihitung di database (cek_diskon untuk pratinjau, buat_pesanan untuk pesanan) dan
--      TIDAK PERNAH membuat harga di bawah HPP.
--   3. Notifikasi: WhatsApp lewat Fonnte, email lewat Resend, dikirim dari database (ekstensi pg_net).
--      Token disimpan di tabel privat (tidak bisa dibaca dari website), diisi lewat panel admin.
--   4. pesan_otomatis : template pesan WA (aturan main & alur affiliate, sambutan member & reseller)
--   5. reseller_program + reseller_bookings : halaman /reseller/ (harga, countdown, benefit) & booking slot
--   6. pendaftaran affiliate lewat /affiliate/ → masuk ke tabel partners (menunggu diterima admin)
--   7. terlaris_json  : aplikasi paling laku bulan ini untuk beranda
-- Jalankan di SQL Editor Supabase SETELAH 20261112000000_revisi_blog_qris.sql. Aman dijalankan ulang.
-- ============================================================================

-- pg_net: kirim HTTP dari database. Kalau gagal di sini, aktifkan lewat Database → Extensions → pg_net.
do $$ begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net belum aktif (%). Aktifkan lewat Database → Extensions → pg_net.', sqlerrm;
end $$;

-- ---------------------------------------------------------------- alat bantu
create or replace function public._rapikan_wa(p text)
returns text language sql immutable set search_path = '' as $$
  select case when length(x) between 9 and 15 then x end
  from (select case when d like '0%' then '62' || substr(d, 2)
                    when d like '8%' then '62' || d else d end as x
        from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) a) b
$$;

create or replace function public._rupiah(p bigint)
returns text language sql immutable set search_path = '' as $$
  select 'Rp' || replace(to_char(coalesce(p, 0), 'FM999G999G999G990'), ',', '.')
$$;

create or replace function public._salam()
returns text language sql stable set search_path = '' as $$
  select case when h between 4 and 10 then 'Selamat pagi' when h between 11 and 14 then 'Selamat siang'
              when h between 15 and 17 then 'Selamat sore' else 'Selamat malam' end
  from (select extract(hour from now() at time zone 'Asia/Jakarta')::int as h) x
$$;

-- {nama}, {salam}, {kode}, {link}, … diganti dengan nilai di p_isi
create or replace function public._isi_template(p_teks text, p_isi jsonb)
returns text language plpgsql stable set search_path = '' as $$
declare
  v text := coalesce(p_teks, '');
  k text;
begin
  v := replace(v, '{salam}', public._salam());
  for k in select jsonb_object_keys(coalesce(p_isi, '{}'::jsonb)) loop
    v := replace(v, '{' || k || '}', coalesce(p_isi->>k, ''));
  end loop;
  return v;
end $$;

-- ---------------------------------------------------------------- 1. membership
create table if not exists public.member_program (
  id int primary key default 1 check (id = 1),
  aktif boolean not null default true,
  diskon_pct numeric(4,1) not null default 4 check (diskon_pct between 0 and 50),
  diskon_besar_pct numeric(4,1) not null default 10 check (diskon_besar_pct between 0 and 50),
  min_besar int not null default 100000 check (min_besar >= 0),
  mulai date,
  sampai date,
  updated_at timestamptz not null default now()
);
insert into public.member_program (id) values (1) on conflict (id) do nothing;
alter table public.member_program enable row level security;
drop policy if exists publik_baca on public.member_program;
drop policy if exists admin_ubah on public.member_program;
create policy publik_baca on public.member_program for select to anon, authenticated using (true);
create policy admin_ubah on public.member_program for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create table if not exists public.members (
  id bigint generated always as identity primary key,
  name text not null check (length(name) between 2 and 60),
  wa text not null unique,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  is_active boolean not null default true,
  sumber text not null default 'web' check (sumber in ('web', 'admin')),
  catatan text,
  link_dikirim_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists members_dibuat on public.members (created_at desc);
alter table public.members enable row level security;
drop policy if exists admin_semua on public.members;
create policy admin_semua on public.members for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- 2. kupon
create table if not exists public.coupons (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[A-Z0-9]{3,20}$'),
  keterangan text,
  jenis text not null default 'persen' check (jenis in ('persen', 'nominal')),
  nilai numeric not null check (nilai > 0),
  maks_diskon int check (maks_diskon is null or maks_diskon > 0),
  min_belanja int not null default 0 check (min_belanja >= 0),
  mulai timestamptz,
  sampai timestamptz,
  kuota int check (kuota is null or kuota > 0),
  per_nomor int default 1 check (per_nomor is null or per_nomor > 0),
  khusus_member boolean not null default false,
  gabung_member boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_persen_wajar check (jenis <> 'persen' or nilai <= 90)
);
alter table public.coupons enable row level security;
drop policy if exists admin_semua on public.coupons;
create policy admin_semua on public.coupons for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public._rapikan_kupon()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.code := upper(regexp_replace(coalesce(new.code, ''), '[^A-Za-z0-9]', '', 'g'));
  new.keterangan := nullif(btrim(coalesce(new.keterangan, '')), '');
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists rapikan_kupon on public.coupons;
create trigger rapikan_kupon before insert or update on public.coupons
  for each row execute function public._rapikan_kupon();

alter table public.orders add column if not exists member_id bigint references public.members(id) on delete set null;
alter table public.orders add column if not exists member_discount int not null default 0;
alter table public.orders add column if not exists coupon_id bigint references public.coupons(id) on delete set null;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists coupon_discount int not null default 0;
create index if not exists orders_member on public.orders (member_id, created_at desc) where member_id is not null;
create index if not exists orders_kupon on public.orders (coupon_id) where coupon_id is not null;

-- pesanan dengan nomor member otomatis masuk riwayat member (dari website maupun panel admin)
create or replace function public._tautkan_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.member_id is null and new.customer_wa is not null then
    select m.id into new.member_id from public.members m where m.wa = new.customer_wa and m.is_active;
  end if;
  return new;
end $$;
revoke execute on function public._tautkan_member() from public, anon, authenticated;
drop trigger if exists tautkan_member on public.orders;
create trigger tautkan_member before insert on public.orders
  for each row execute function public._tautkan_member();

-- Diskon member + kupon untuk subtotal tertentu (setelah diskon bundle/rakit).
-- Tidak pernah memotong lebih dari (subtotal − HPP). Kupon biasa tidak digabung diskon member: dipakai yang lebih besar.
create or replace function public._diskon_tambahan(p_subtotal int, p_hpp int, p_wa text, p_token text, p_kupon text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  pr public.member_program;
  m public.members;
  k public.coupons;
  v_wa text := public._rapikan_wa(p_wa);
  v_kode text := upper(regexp_replace(coalesce(p_kupon, ''), '[^A-Za-z0-9]', '', 'g'));
  v_hari date := public.hari_ini_wib();
  v_pct numeric := 0;
  v_mrp int := 0;
  v_krp int := 0;
  v_galat text;
  v_catatan text;
  v_maks int;
  v_lewat text;
  v_dibatasi boolean := false;
begin
  select * into pr from public.member_program where id = 1;
  if nullif(btrim(coalesce(p_token, '')), '') is not null then
    select * into m from public.members where token = btrim(p_token) and is_active;
    if m.id is not null then v_lewat := 'akun'; end if;
  end if;
  if m.id is null and v_wa is not null then
    select * into m from public.members where wa = v_wa and is_active;
    if m.id is not null then v_lewat := 'nomor'; end if;
  end if;
  if m.id is not null and pr.aktif
     and (pr.mulai is null or pr.mulai <= v_hari) and (pr.sampai is null or pr.sampai >= v_hari) then
    v_pct := case when p_subtotal >= pr.min_besar then pr.diskon_besar_pct else pr.diskon_pct end;
    v_mrp := (floor(p_subtotal * v_pct / 100 / 100) * 100)::int;
  end if;

  if v_kode <> '' then
    select * into k from public.coupons where code = v_kode;
    if k.id is null or not k.is_active then v_galat := 'Kode kupon tidak ditemukan';
    elsif k.mulai is not null and k.mulai > now() then v_galat := 'Kupon ini belum berlaku';
    elsif k.sampai is not null and k.sampai < now() then v_galat := 'Kupon ini sudah berakhir';
    elsif k.khusus_member and m.id is null then v_galat := 'Kupon ini khusus member IXVII.CO';
    elsif p_subtotal < k.min_belanja then v_galat := 'Minimal belanja ' || public._rupiah(k.min_belanja) || ' untuk kupon ini';
    elsif k.kuota is not null and (select count(*) from public.orders o where o.coupon_id = k.id and o.status <> 'batal') >= k.kuota then
      v_galat := 'Kuota kupon ini sudah habis';
    elsif k.per_nomor is not null and v_wa is not null
      and (select count(*) from public.orders o where o.coupon_id = k.id and o.customer_wa = v_wa and o.status <> 'batal') >= k.per_nomor then
      v_galat := 'Kupon ini sudah dipakai nomor ini';
    else
      v_krp := case when k.jenis = 'persen' then (floor(p_subtotal * k.nilai / 100 / 100) * 100)::int else least(k.nilai::int, p_subtotal) end;
      if k.maks_diskon is not null then v_krp := least(v_krp, k.maks_diskon); end if;
      if not k.gabung_member and v_mrp > 0 then
        if v_krp >= v_mrp then v_mrp := 0; v_pct := 0; v_catatan := 'kupon_menggantikan_member';
        else v_krp := 0; v_catatan := 'member_lebih_besar'; end if;
      end if;
    end if;
  end if;

  -- jangan sampai di bawah modal
  v_maks := greatest(0, p_subtotal - greatest(coalesce(p_hpp, 0), 0));
  if v_mrp + v_krp > v_maks then
    v_dibatasi := true;
    v_mrp := least(v_mrp, v_maks);
    v_krp := least(v_krp, v_maks - v_mrp);
  end if;

  return jsonb_build_object(
    'member', case when m.id is not null then jsonb_build_object('id', m.id, 'pct', v_pct, 'rp', v_mrp, 'lewat', v_lewat) end,
    'kupon', case when k.id is not null and v_galat is null then jsonb_build_object('id', k.id, 'kode', k.code, 'rp', v_krp, 'ket', k.keterangan) end,
    'kupon_galat', v_galat,
    'catatan', v_catatan,
    'dibatasi', v_dibatasi,
    'total', v_mrp + v_krp);
end $$;
revoke execute on function public._diskon_tambahan(int, int, text, text, text) from public, anon, authenticated;

-- Hitung subtotal keranjang (harga normal, diskon bundle/rakit, total HPP) tanpa membuat pesanan.
create or replace function public._subtotal_keranjang(p_items jsonb, p_rakit boolean)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
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
    where b.id = (p_items->0->>'bundle')::bigint and b.is_active
      and (b.starts_on is null or b.starts_on <= public.hari_ini_wib())
      and (b.ends_on is null or b.ends_on >= public.hari_ini_wib());
    if v_bundle.id is null then raise exception 'Bundle ini sedang tidak tersedia'; end if;
    select array_agg(v.code) into v_codes from public.bundle_items bi join public.variants v on v.id = bi.variant_id
    where bi.bundle_id = v_bundle.id;
    v_jenis := 'bundle';
  else
    select array_agg(distinct e->>'code') into v_codes from jsonb_array_elements(p_items) e where coalesce(e->>'code', '') <> '';
  end if;
  if v_codes is null then raise exception 'Pilih 1 sampai 10 paket'; end if;
  for r in
    select v.price, coalesce(vc.hpp, 0) as hpp, public.batas_bundle(v.price, vc.hpp, vc.bundle_max_pct) as batas
    from public.variants v
    join public.plan_groups g on g.id = v.group_id
    join public.apps a on a.id = g.app_id
    left join public.variant_costs vc on vc.variant_id = v.id
    where v.code = any (v_codes) and v.is_active and a.is_active
  loop
    v_normal := v_normal + r.price; v_batas := v_batas + r.batas; v_hpp := v_hpp + r.hpp;
  end loop;
  if v_jenis = 'bundle' then
    v_diskon := v_normal - least(v_normal, greatest(v_bundle.price, (ceil(v_batas / 500.0) * 500)::int));
  elsif p_rakit and cardinality(v_codes) >= 2 then
    v_diskon := (public._hitung_rakit(v_codes)->>'diskon')::int;
    v_jenis := 'rakit';
  end if;
  return jsonb_build_object('normal', v_normal, 'diskon', v_diskon, 'subtotal', v_normal - v_diskon, 'hpp', v_hpp, 'jenis', v_jenis);
end $$;
revoke execute on function public._subtotal_keranjang(jsonb, boolean) from public, anon, authenticated;

-- Pratinjau diskon di formulir pesanan. Tidak menyebut nama member (nomor saja tidak membuka data).
create or replace function public.cek_diskon(p_items jsonb, p_wa text default null, p_member text default null,
                                             p_kupon text default null, p_rakit boolean default false)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  s jsonb := public._subtotal_keranjang(p_items, p_rakit);
  x jsonb;
  pr public.member_program;
begin
  x := public._diskon_tambahan((s->>'subtotal')::int, (s->>'hpp')::int, p_wa, p_member, p_kupon);
  select * into pr from public.member_program where id = 1;
  return jsonb_build_object(
    'normal', s->'normal', 'diskon_paket', s->'diskon', 'subtotal', s->'subtotal',
    'member', case when x->'member' is not null and x->'member' <> 'null'::jsonb
                   then jsonb_build_object('pct', x->'member'->'pct', 'rp', x->'member'->'rp', 'lewat', x->'member'->'lewat') end,
    'kupon', case when x->'kupon' <> 'null'::jsonb then jsonb_build_object('kode', x->'kupon'->'kode', 'rp', x->'kupon'->'rp', 'ket', x->'kupon'->'ket') end,
    'kupon_galat', x->'kupon_galat', 'catatan', x->'catatan', 'dibatasi', x->'dibatasi',
    'total', (s->>'subtotal')::int - (x->>'total')::int,
    'program', jsonb_build_object('aktif', pr.aktif and (pr.mulai is null or pr.mulai <= public.hari_ini_wib())
                                           and (pr.sampai is null or pr.sampai >= public.hari_ini_wib()),
                                  'pct', pr.diskon_pct, 'besar_pct', pr.diskon_besar_pct, 'min', pr.min_besar));
end $$;
grant execute on function public.cek_diskon(jsonb, text, text, text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------- 3. notifikasi
create table if not exists public.notif_settings (
  id int primary key default 1 check (id = 1),
  owner_wa text,
  owner_email text,
  fonnte_token text,
  resend_key text,
  email_from text not null default 'IXVII.CO <onboarding@resend.dev>',
  site_url text not null default 'https://ixviico.shop',
  wa_pesanan boolean not null default true,
  email_pesanan boolean not null default true,
  wa_daftar boolean not null default true,
  email_daftar boolean not null default true,
  auto_affiliate boolean not null default true,
  auto_member boolean not null default true,
  auto_reseller boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.notif_settings (id, owner_wa)
select 1, public._rapikan_wa(s.whatsapp_number) from public.store_settings s where s.id = 1
on conflict (id) do nothing;
insert into public.notif_settings (id) values (1) on conflict (id) do nothing;
-- privat: tanpa policy → tidak bisa dibaca/diubah lewat API, hanya lewat fungsi di bawah
alter table public.notif_settings enable row level security;
revoke all on public.notif_settings from anon, authenticated;

create table if not exists public.notif_log (
  id bigint generated always as identity primary key,
  acara text not null,
  saluran text not null check (saluran in ('wa', 'email')),
  tujuan text,
  ringkas text,
  status text not null check (status in ('dikirim', 'dilewati', 'gagal')),
  alasan text,
  request_id bigint,
  created_at timestamptz not null default now()
);
create index if not exists notif_log_baru on public.notif_log (created_at desc);
alter table public.notif_log enable row level security;
drop policy if exists admin_baca on public.notif_log;
create policy admin_baca on public.notif_log for select to authenticated using ((select public.is_admin()));

create or replace function public._pg_net_aktif()
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'net' and p.proname in ('http_get', 'http_post') group by n.nspname having count(distinct p.proname) = 2)
$$;

create or replace function public._catat_notif(p_acara text, p_saluran text, p_tujuan text, p_ringkas text,
                                               p_status text, p_alasan text, p_req bigint)
returns void language sql security definer set search_path = '' as $$
  delete from public.notif_log where created_at < now() - interval '60 days';
  insert into public.notif_log (acara, saluran, tujuan, ringkas, status, alasan, request_id)
  values (p_acara, p_saluran,
          case when p_saluran = 'wa' then left(p_tujuan, 5) || '****' || right(p_tujuan, 3) else p_tujuan end,
          left(regexp_replace(coalesce(p_ringkas, ''), '\s+', ' ', 'g'), 120), p_status, p_alasan, p_req);
$$;

create or replace function public._kirim_wa(p_acara text, p_tujuan text, p_pesan text)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  s public.notif_settings;
  v_wa text := public._rapikan_wa(p_tujuan);
  v_req bigint;
begin
  select * into s from public.notif_settings where id = 1;
  if v_wa is null then perform public._catat_notif(p_acara, 'wa', p_tujuan, p_pesan, 'dilewati', 'Nomor tujuan kosong', null); return null; end if;
  if s.fonnte_token is null then perform public._catat_notif(p_acara, 'wa', v_wa, p_pesan, 'dilewati', 'Token Fonnte belum diisi', null); return null; end if;
  if not public._pg_net_aktif() then perform public._catat_notif(p_acara, 'wa', v_wa, p_pesan, 'dilewati', 'Ekstensi pg_net belum aktif', null); return null; end if;
  begin
    execute 'select net.http_get(url := $1, params := $2, timeout_milliseconds := 15000)' into v_req
      using 'https://api.fonnte.com/send',
            jsonb_build_object('token', s.fonnte_token, 'target', v_wa, 'message', p_pesan, 'countryCode', '62');
    perform public._catat_notif(p_acara, 'wa', v_wa, p_pesan, 'dikirim', null, v_req);
  exception when others then
    perform public._catat_notif(p_acara, 'wa', v_wa, p_pesan, 'gagal', sqlerrm, null);
  end;
  return v_req;
end $$;

-- teks WA (*tebal*, baris baru) → HTML email sederhana
create or replace function public._html_email(p_teks text)
returns text language sql immutable set search_path = '' as $$
  select '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#16161a">'
    || regexp_replace(
         regexp_replace(replace(replace(replace(coalesce(p_teks, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
           '\*([^*\n]+)\*', '<b>\1</b>', 'g'),
         '\n', '<br>', 'g')
    || '<p style="color:#6b6b72;font-size:12px;margin-top:20px">Notifikasi otomatis dari website IXVII.CO</p></div>'
$$;

create or replace function public._kirim_email(p_acara text, p_subjek text, p_teks text)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  s public.notif_settings;
  v_req bigint;
begin
  select * into s from public.notif_settings where id = 1;
  if s.owner_email is null then perform public._catat_notif(p_acara, 'email', null, p_subjek, 'dilewati', 'Email owner belum diisi', null); return null; end if;
  if s.resend_key is null then perform public._catat_notif(p_acara, 'email', s.owner_email, p_subjek, 'dilewati', 'API key Resend belum diisi', null); return null; end if;
  if not public._pg_net_aktif() then perform public._catat_notif(p_acara, 'email', s.owner_email, p_subjek, 'dilewati', 'Ekstensi pg_net belum aktif', null); return null; end if;
  begin
    execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 15000)' into v_req
      using 'https://api.resend.com/emails',
            jsonb_build_object('from', s.email_from, 'to', jsonb_build_array(s.owner_email), 'subject', p_subjek,
                               'html', public._html_email(p_teks), 'text', p_teks),
            jsonb_build_object('Authorization', 'Bearer ' || s.resend_key, 'Content-Type', 'application/json');
    perform public._catat_notif(p_acara, 'email', s.owner_email, p_subjek, 'dikirim', null, v_req);
  exception when others then
    perform public._catat_notif(p_acara, 'email', s.owner_email, p_subjek, 'gagal', sqlerrm, null);
  end;
  return v_req;
end $$;

-- p_jenis: 'pesanan' (pesanan baru) atau 'daftar' (member/affiliate/reseller baru)
create or replace function public._notif_owner(p_jenis text, p_acara text, p_judul text, p_teks text)
returns void
language plpgsql security definer set search_path = '' as $$
declare s public.notif_settings;
begin
  select * into s from public.notif_settings where id = 1;
  if (p_jenis = 'pesanan' and s.wa_pesanan) or (p_jenis = 'daftar' and s.wa_daftar) then
    perform public._kirim_wa(p_acara, s.owner_wa, '*' || p_judul || '*' || chr(10) || p_teks);
  end if;
  if (p_jenis = 'pesanan' and s.email_pesanan) or (p_jenis = 'daftar' and s.email_daftar) then
    perform public._kirim_email(p_acara, p_judul, p_teks);
  end if;
exception when others then
  raise warning 'notifikasi owner gagal: %', sqlerrm;
end $$;

create or replace function public._wa_siap()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select fonnte_token is not null from public.notif_settings where id = 1), false) and public._pg_net_aktif()
$$;

create or replace function public._notif_pesanan(p_order bigint)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  s public.notif_settings;
  v_item text;
  n int;
begin
  select * into o from public.orders where id = p_order;
  select * into s from public.notif_settings where id = 1;
  select string_agg('• ' || i.app_name || ' ' || i.plan_label || ' · ' || i.variant_label || ' — ' || public._rupiah(i.price), chr(10) order by i.id), count(*)
    into v_item, n from public.order_items i where i.order_id = o.id;
  perform public._notif_owner('pesanan', 'pesanan_baru',
    'Pesanan baru ' || o.code || ' · ' || public._rupiah(o.total),
    'Nama: ' || o.customer_name || chr(10)
    || 'WhatsApp: wa.me/' || o.customer_wa || chr(10)
    || coalesce(case o.kind when 'bundle' then 'Bundle: ' || o.bundle_name || chr(10) when 'rakit' then 'Bikin Bundlemu' || chr(10) end, '')
    || coalesce(v_item, '') || chr(10)
    || case when o.discount > 0 then 'Diskon: -' || public._rupiah(o.discount)
         || case when o.member_discount > 0 then ' (member -' || public._rupiah(o.member_discount) || ')' else '' end
         || case when o.coupon_code is not null then ' (kupon ' || o.coupon_code || ')' else '' end || chr(10) else '' end
    || '*Total: ' || public._rupiah(o.total) || '*' || chr(10)
    || case when o.member_id is not null then 'Member IXVII ✓' || chr(10) else '' end
    || 'Panel: ' || s.site_url || '/admin/#pesanan');
exception when others then
  raise warning 'notifikasi pesanan gagal: %', sqlerrm;
end $$;

revoke execute on function public._kirim_wa(text, text, text) from public, anon, authenticated;
revoke execute on function public._kirim_email(text, text, text) from public, anon, authenticated;
revoke execute on function public._notif_owner(text, text, text, text) from public, anon, authenticated;
revoke execute on function public._notif_pesanan(bigint) from public, anon, authenticated;
revoke execute on function public._catat_notif(text, text, text, text, text, text, bigint) from public, anon, authenticated;
revoke execute on function public._wa_siap() from public, anon, authenticated;

-- ---- untuk panel admin (token tidak pernah dikirim balik, hanya 4 huruf terakhir)
create or replace function public.status_notif()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.notif_settings;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into s from public.notif_settings where id = 1;
  return jsonb_build_object(
    'owner_wa', s.owner_wa, 'owner_email', s.owner_email, 'email_from', s.email_from, 'site_url', s.site_url,
    'fonnte', s.fonnte_token is not null, 'fonnte_akhir', right(s.fonnte_token, 4),
    'resend', s.resend_key is not null, 'resend_akhir', right(s.resend_key, 4),
    'wa_pesanan', s.wa_pesanan, 'email_pesanan', s.email_pesanan, 'wa_daftar', s.wa_daftar, 'email_daftar', s.email_daftar,
    'auto_affiliate', s.auto_affiliate, 'auto_member', s.auto_member, 'auto_reseller', s.auto_reseller,
    'pg_net', public._pg_net_aktif());
end $$;
revoke execute on function public.status_notif() from public, anon;
grant execute on function public.status_notif() to authenticated;

create or replace function public.simpan_notif(p jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if p ? 'owner_email' and nullif(btrim(p->>'owner_email'), '') is not null
     and btrim(p->>'owner_email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Alamat email tidak valid';
  end if;
  update public.notif_settings set
    owner_wa      = case when p ? 'owner_wa' then public._rapikan_wa(p->>'owner_wa') else owner_wa end,
    owner_email   = case when p ? 'owner_email' then nullif(lower(btrim(p->>'owner_email')), '') else owner_email end,
    fonnte_token  = case when p ? 'fonnte_token' then nullif(btrim(p->>'fonnte_token'), '') else fonnte_token end,
    resend_key    = case when p ? 'resend_key' then nullif(btrim(p->>'resend_key'), '') else resend_key end,
    email_from    = case when p ? 'email_from' and nullif(btrim(p->>'email_from'), '') is not null then btrim(p->>'email_from') else email_from end,
    site_url      = case when p ? 'site_url' and p->>'site_url' ~ '^https://' then rtrim(p->>'site_url', '/') else site_url end,
    wa_pesanan    = coalesce((p->>'wa_pesanan')::boolean, wa_pesanan),
    email_pesanan = coalesce((p->>'email_pesanan')::boolean, email_pesanan),
    wa_daftar     = coalesce((p->>'wa_daftar')::boolean, wa_daftar),
    email_daftar  = coalesce((p->>'email_daftar')::boolean, email_daftar),
    auto_affiliate = coalesce((p->>'auto_affiliate')::boolean, auto_affiliate),
    auto_member   = coalesce((p->>'auto_member')::boolean, auto_member),
    auto_reseller = coalesce((p->>'auto_reseller')::boolean, auto_reseller),
    updated_at = now()
  where id = 1;
  return public.status_notif();
end $$;
revoke execute on function public.simpan_notif(jsonb) from public, anon;
grant execute on function public.simpan_notif(jsonb) to authenticated;

create or replace function public.tes_notif()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.notif_settings; v_wa bigint; v_email bigint;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into s from public.notif_settings where id = 1;
  v_wa := public._kirim_wa('tes', s.owner_wa, '*Tes notifikasi IXVII.CO* ✅' || chr(10) || 'Kalau pesan ini masuk, notifikasi WhatsApp sudah tersambung.');
  v_email := public._kirim_email('tes', 'Tes notifikasi IXVII.CO', 'Kalau email ini masuk, notifikasi email sudah tersambung. ✅');
  return jsonb_build_object('wa', v_wa, 'email', v_email);
end $$;
revoke execute on function public.tes_notif() from public, anon;
grant execute on function public.tes_notif() to authenticated;

-- Riwayat kiriman + jawaban server Fonnte/Resend (jawaban disimpan pg_net ± 6 jam)
create or replace function public.log_notif(p_batas int default 40)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if public._pg_net_aktif() and to_regclass('net._http_response') is not null then
    execute 'select coalesce(jsonb_agg(jsonb_build_object(''id'', l.id, ''acara'', l.acara, ''saluran'', l.saluran, ''tujuan'', l.tujuan,
               ''ringkas'', l.ringkas, ''status'', l.status, ''alasan'', l.alasan, ''waktu'', l.created_at,
               ''http'', r.status_code, ''jawaban'', left(coalesce(r.error_msg, r.content::text), 200)) order by l.id desc), ''[]''::jsonb)
             from (select * from public.notif_log order by id desc limit $1) l left join net._http_response r on r.id = l.request_id'
      into v using least(greatest(coalesce(p_batas, 40), 1), 200);
  else
    select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'acara', l.acara, 'saluran', l.saluran, 'tujuan', l.tujuan,
             'ringkas', l.ringkas, 'status', l.status, 'alasan', l.alasan, 'waktu', l.created_at) order by l.id desc), '[]'::jsonb)
      into v from (select * from public.notif_log order by id desc limit least(greatest(coalesce(p_batas, 40), 1), 200)) l;
  end if;
  return v;
end $$;
revoke execute on function public.log_notif(int) from public, anon;
grant execute on function public.log_notif(int) to authenticated;

-- ---------------------------------------------------------------- 4. template pesan otomatis
create table if not exists public.pesan_otomatis (
  kunci text primary key,
  judul text not null,
  isi text not null check (length(isi) between 1 and 6000),
  updated_at timestamptz not null default now()
);
alter table public.pesan_otomatis enable row level security;
drop policy if exists admin_semua on public.pesan_otomatis;
create policy admin_semua on public.pesan_otomatis for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.pesan_otomatis (kunci, judul, isi) values
('affiliate_aturan', 'Affiliate: aturan main (pesan 1)', $t${salam} Kak {nama} 👋

Selamat datang dan terima kasih sudah menunjukkan ketertarikan untuk bergabung dalam Program Affiliate IXVII.CO.

Sebelum kita mulai dan mendaftarkan kode kamu, ada Satu Halaman Aturan Main yang wajib kamu baca dan pahami agar kerja sama kita enak, transparan, dan tidak ada kesalahpahaman ke depannya:

📋 *Aturan Main Affiliate IXVII.CO*
*1. Skema Komisi:* Kamu berhak mendapatkan komisi 30% dari margin setiap produk yang berhasil terjual.

*2. Produk Andalan & Potensi:* Ada banyak produk digital siap jual. Sebagai contoh, produk seperti CapCut Sharing 1 Tahun komisinya ada di Rp 27.000 dan Picsart Privat 1 Tahun di Rp 22.000. Bahan promosi lengkap sudah disediakan! Apalagi kalau lagi masa-masa payday sale atau promo, bisa besar itu komisinya.

*3. Mekanisme Order:*
Terdapat dua cara yang bisa dipilih oleh affiliate saat ada transaksi:
- Langsung ke Admin: Calon pembeli diarahkan langsung untuk menghubungi admin IXVII.CO agar diproses oleh admin.
- Melalui Affiliate (Reseller/Agen): Affiliate dapat menanyakan stok terlebih dahulu kepada admin, lalu memproses pembayaran dari pembeli, dan mengirimkan bukti pembayarannya beserta data order ke admin untuk diselesaikan.

*4. Aturan Klaim Pembeli:* Siapa pun yang mengirimkan nomor calon pembeli ke admin duluan, maka dialah yang berhak atas komisi penjualan tersebut (siapa cepat, dia dapat).

*5. Pencatatan Komisi:* Komisi baru akan dihitung secara resmi setelah pembeli mengirimkan screenshot bukti login.

*Ketentuan Penarikan Saldo (Withdrawal):*
Terdapat dua cara penarikan komisi yang bisa dipilih:
- Penarikan Reguler / Bulanan: Jadwal pembayaran rutin dilakukan setiap tanggal 28 setiap bulannya (Tanggal 26 admin akan mengirimkan rekap saldo, silakan balas "TARIK" atau "NANTI").
- Penarikan Fleksibel (Minimal Rp 7.000): Jika sewaktu-waktu saldo sudah mencapai minimal Rp 7.000, kamu bisa langsung mengajukan penarikan di luar tanggal 28.
- Minimum penarikan standar untuk rekap bulanan adalah Rp 25.000.

*Larangan Keras:*
- Dilarang keras menjanjikan garansi di luar ketentuan resmi yang diberikan oleh IXVII.CO.
- Dilarang keras membahas atau membocorkan sumber akun/suplier utama.

*Masa Percobaan & Target:* Setiap affiliate baru akan diberikan masa percobaan selama 30 hari dengan target minimal 3 penjualan untuk bisa melanjutkan kerja sama. Sebagai apresiasi, ada Bonus Penjualan Pertama sebesar Rp 10.000 (khusus 1 kali transaksi perdana untuk membantumu pecah telur!).

📂 *Apa Saja yang Kamu Dapatkan?*
Jika kamu bersedia mengikuti aturan di atas, kamu akan langsung mendapatkan akses ke dalam folder khusus yang berisi:
- Daftar harga lengkap beserta rincian komisinya.
- Poster Siap Unggah
- Caption siap unggah

Kode affiliate kamu: *{kode}* (aktif setelah dikonfirmasi admin)$t$),
('affiliate_alur', 'Affiliate: alur kerja (pesan 2)', $t$*FLOW CARA KERJA AFFILIATE IXVII.CO* 💸✨

1. Sebar Poster & Promosi: Teruskan poster + caption dari grup WA ke Kontak WA, IG Story, Telegram, atau media sosialmu lainnya untuk cari pembeli.
2. Cek Stok ke Admin: Kalau ada yang berminat, tanyakan ketersediaan stok aplikasinya ke Admin IXVII terlebih dahulu.
3. Pembayaran QRIS: Jika stok tersedia, arahkan pembeli untuk melakukan pembayaran langsung via QRIS IXVII.
4. Konfirmasi & Proses Order: Kirimkan bukti pembayaran ke Admin agar pesanan akun segera diproses.
5. Aktivasi & Testimoni: Pastikan pembeli berhasil login, mengisi Form Garansi IXVII, serta mengirimkan screenshot sebagai testimoni bersama.
6. Pendataan Komisi ke Saldo kamu: Selamat! Komisi sesuai ketentuan tiap aplikasi langsung menjadi milikmu!

Ini yaa sekiranya ada temen-temen yang masih bingung urutan kerjanya begimanaa 😊$t$),
('member_selamat', 'Member: sambutan setelah daftar', $t${salam} Kak {nama} 👋

Membership IXVII.CO kamu sudah *aktif* ✅

Benefit kamu:
- Diskon {pct}% setiap belanja di ixviico.shop
- Diskon {pct_besar}% untuk belanja {min} ke atas
- Riwayat pembelian & status garansi dalam satu halaman

Link akun member kamu (simpan, jangan dibagikan):
{link}

Pakai nomor WhatsApp ini saat memesan supaya diskonnya otomatis masuk.$t$),
('member_link', 'Member: kirim ulang link akun', $t$Halo Kak {nama} 👋
Ini link akun member IXVII.CO kamu:
{link}

Jangan bagikan link ini ke orang lain ya.$t$),
('reseller_daftar', 'Reseller: setelah booking slot', $t${salam} Kak {nama} 👋

Terima kasih sudah booking slot *Reseller IXVII.CO* ({harga}). 🙌
Admin akan segera menghubungimu untuk konfirmasi pembayaran dan jadwal mentoring 1-on-1.

Kalau mau langsung amankan slot, bayar via QRIS IXVII sebesar {harga} lalu kirim bukti bayarnya ke chat ini ya.$t$)
on conflict (kunci) do nothing;

create or replace function public._template(p_kunci text, p_isi jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select public._isi_template((select isi from public.pesan_otomatis where kunci = p_kunci), p_isi)
$$;
revoke execute on function public._template(text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- 1b. daftar member (publik)
create or replace function public._kirim_link_member(m public.members, p_kunci text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare s public.notif_settings; pr public.member_program;
begin
  select * into s from public.notif_settings where id = 1;
  select * into pr from public.member_program where id = 1;
  if not s.auto_member or not public._wa_siap() then return false; end if;
  if m.link_dikirim_at is not null and m.link_dikirim_at > now() - interval '10 minutes' then return true; end if;
  perform public._kirim_wa(p_kunci, m.wa, public._template(p_kunci, jsonb_build_object(
    'nama', m.name, 'link', s.site_url || '/member/?k=' || m.token,
    'pct', trim_scale(pr.diskon_pct)::text, 'pct_besar', trim_scale(pr.diskon_besar_pct)::text, 'min', public._rupiah(pr.min_besar))));
  update public.members set link_dikirim_at = now() where id = m.id;
  return true;
end $$;
revoke execute on function public._kirim_link_member(public.members, text) from public, anon, authenticated;

create or replace function public.daftar_member(p_nama text, p_wa text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_nama text := btrim(regexp_replace(coalesce(p_nama, ''), '\s+', ' ', 'g'));
  v_wa text := public._rapikan_wa(p_wa);
  m public.members;
begin
  if length(v_nama) < 2 or length(v_nama) > 60 then raise exception 'Nama harus 2 sampai 60 huruf'; end if;
  if v_wa is null then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if v_nama = lower(v_nama) or v_nama = upper(v_nama) then v_nama := initcap(v_nama); end if;
  select * into m from public.members where wa = v_wa;
  if m.id is not null then
    if not m.is_active then raise exception 'Membership nomor ini sedang nonaktif. Hubungi admin lewat WhatsApp.'; end if;
    return jsonb_build_object('sudah', true, 'terkirim', public._kirim_link_member(m, 'member_link'));
  end if;
  if (select count(*) from public.members where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Sedang banyak pendaftaran. Coba lagi beberapa menit lagi.';
  end if;
  insert into public.members (name, wa) values (v_nama, v_wa) returning * into m;
  perform public._notif_owner('daftar', 'member_baru', 'Member baru: ' || m.name,
    'Nama: ' || m.name || chr(10) || 'WhatsApp: wa.me/' || m.wa || chr(10)
    || 'Total member: ' || (select count(*) from public.members where is_active));
  perform public._kirim_link_member(m, 'member_selamat');
  return jsonb_build_object('baru', true, 'token', m.token, 'nama', m.name);
end $$;
grant execute on function public.daftar_member(text, text) to anon, authenticated;

-- "Lupa link akun": kirim ulang lewat WhatsApp. Jawaban sama untuk nomor terdaftar maupun tidak.
create or replace function public.kirim_link_member(p_wa text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where wa = public._rapikan_wa(p_wa) and is_active;
  if m.id is not null then perform public._kirim_link_member(m, 'member_link'); end if;
  return jsonb_build_object('wa_siap', public._wa_siap());
end $$;
grant execute on function public.kirim_link_member(text) to anon, authenticated;

-- Halaman akun member: profil, benefit, riwayat pesanan, status garansi.
create or replace function public.akun_member(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  m public.members;
  pr public.member_program;
begin
  select * into m from public.members where token = btrim(coalesce(p_token, '')) and length(btrim(coalesce(p_token, ''))) >= 24;
  if m.id is null or not m.is_active then raise exception 'Link akun member tidak valid'; end if;
  select * into pr from public.member_program where id = 1;
  return jsonb_build_object(
    'nama', m.name,
    'wa', '+' || left(m.wa, 4) || ' ' || repeat('•', greatest(length(m.wa) - 7, 3)) || ' ' || right(m.wa, 3),
    'sejak', (m.created_at at time zone 'Asia/Jakarta')::date,
    'program', jsonb_build_object('aktif', pr.aktif, 'pct', pr.diskon_pct, 'besar_pct', pr.diskon_besar_pct, 'min', pr.min_besar,
                                  'mulai', pr.mulai, 'sampai', pr.sampai,
                                  'berlaku', pr.aktif and (pr.mulai is null or pr.mulai <= public.hari_ini_wib())
                                             and (pr.sampai is null or pr.sampai >= public.hari_ini_wib())),
    'hemat', (select coalesce(sum(o.discount), 0) from public.orders o where o.member_id = m.id and o.status <> 'batal'),
    'pesanan', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kode', o.code, 'tanggal', o.created_at, 'status', o.status, 'total', o.total, 'diskon', o.discount,
        'diskon_member', o.member_discount, 'kupon', o.coupon_code, 'mulai', o.starts_on, 'sampai', o.ends_on,
        'items', (select coalesce(jsonb_agg(jsonb_build_object('app', i.app_name, 'tipe', i.plan_label, 'varian', i.variant_label,
                                                                'kode', i.variant_code, 'slug', a.slug, 'logo', a.logo_url) order by i.id), '[]'::jsonb)
                  from public.order_items i
                  left join public.variants v on v.id = i.variant_id
                  left join public.plan_groups g on g.id = v.group_id
                  left join public.apps a on a.id = g.app_id
                  where i.order_id = o.id),
        'garansi', (select w.status from public.warranties w where w.order_id = o.id order by w.created_at desc limit 1),
        'link_garansi', (select t.token from public.review_tokens t
                         where t.order_id = o.id and t.used_at is null and t.expires_at > now()
                           and not exists (select 1 from public.warranties w where w.order_id = o.id)
                         order by t.created_at desc limit 1))
        order by o.created_at desc)
      from (select * from public.orders where member_id = m.id order by created_at desc limit 50) o), '[]'::jsonb));
end $$;
grant execute on function public.akun_member(text) to anon, authenticated;

-- ---------------------------------------------------------------- buat_pesanan: + member & kupon, notifikasi
drop function if exists public.buat_pesanan(jsonb, text, text, text, boolean);
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
  v_codes  text[];
  v_bundle public.bundles;
  v_paket  text;
  v_total  int;
  v_hitung jsonb;
  v_x      jsonb;
  v_member bigint;
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
  if (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Sedang banyak pesanan. Coba lagi beberapa menit lagi atau hubungi kami di WhatsApp.';
  end if;

  if exists (select 1 from jsonb_array_elements(p_items) e where e ? 'bundle') then
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
  values (v_code, v_nama, v_wa, v_lang, 1)
  returning id, member_id into v_order, v_member;

  foreach c in array v_codes loop
    select v.id, v.code, v.label, v.price, v.stock, v.duration_days, g.label as tipe, a.name as aplikasi, a.slug,
           coalesce(vc.hpp, 0) as hpp, public.batas_bundle(v.price, vc.hpp, vc.bundle_max_pct) as batas
      into r
    from public.variants v
    join public.plan_groups g on g.id = v.group_id
    join public.apps a on a.id = g.app_id
    left join public.variant_costs vc on vc.variant_id = v.id
    where v.code = c and v.is_active and a.is_active;
    if r.id is null then
      if v_kind = 'bundle' then raise exception 'Bundle ini sedang tidak tersedia'; end if;
      raise exception 'Paket % tidak tersedia', c;
    end if;
    if r.stock = 'habis' then raise exception 'Paket % % sedang habis', r.aplikasi, r.label; end if;
    insert into public.order_items (order_id, variant_id, variant_code, app_name, plan_label, variant_label, price, duration_days)
    values (v_order, r.id, r.code, r.aplikasi, r.tipe, r.label, r.price, r.duration_days);
    v_normal := v_normal + r.price;
    v_batas  := v_batas + r.batas;
    v_hpp    := v_hpp + r.hpp;
    v_items := v_items || jsonb_build_object('aplikasi', r.aplikasi, 'tipe', r.tipe, 'varian', r.label, 'harga', r.price,
                                             'kode', r.code, 'slug', r.slug);
  end loop;

  if v_kind = 'bundle' then
    v_paket_diskon := v_normal - least(v_normal, greatest(v_bundle.price, (ceil(v_batas / 500.0) * 500)::int));
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

-- admin: tautkan pesanan lama dengan nomor yang sama ke member
create or replace function public.tautkan_pesanan_member(p_member bigint)
returns int
language plpgsql security invoker set search_path = '' as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  update public.orders o set member_id = m.id from public.members m
  where m.id = p_member and o.customer_wa = m.wa and o.member_id is null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.tautkan_pesanan_member(bigint) from public, anon;
grant execute on function public.tautkan_pesanan_member(bigint) to authenticated;

-- ---------------------------------------------------------------- 5. program reseller
create table if not exists public.reseller_program (
  id int primary key default 1 check (id = 1),
  aktif boolean not null default true,
  judul text not null default 'PAYDAY MODAL BUATMU BIKIN TOKOMU SENDIRI!',
  subjudul text not null default 'Mulai perjalanan jualan aplikasi premium kamu sendiri, dibimbing oleh IXVII.CO!',
  label_promo text not null default 'Flash Sale Payday',
  periode_teks text default 'Spesial Payday Sale November',
  harga_normal int not null default 1500000 check (harga_normal >= 0),
  harga_promo int not null default 275000 check (harga_promo >= 0),
  mulai timestamptz default '2026-11-01 00:00:00+07',
  sampai timestamptz default '2026-11-30 23:59:59+07',
  slot_teks text default 'Book dulu sekarang sebelum kehabisan slot!',
  benefit text not null default $b$**1-on-1 Mentorship Sampai Bisa!**
Full Akses Materi & Sistem
- HPP Editable
- Sistem QRIS
- Padlet untuk list harga
Akses ke Channel Terpercaya untuk bisnis reseller
Template Form Garansi
Template Desain untuk promosi
Panduan Keamanan reseller
Step by step dari 0!
**BONUS CANVA HEAD 3 BULAN untuk di awal reselling!**
**DAN MASIH BANYAK LAGI!**$b$,
  cocok text not null default $c$Pelajar
Mahasiswa
Cari uang jajan tambahan!
Siapapun itu, cuma modal HP & kuota!$c$,
  updated_at timestamptz not null default now()
);
insert into public.reseller_program (id) values (1) on conflict (id) do nothing;
alter table public.reseller_program enable row level security;
drop policy if exists publik_baca on public.reseller_program;
drop policy if exists admin_ubah on public.reseller_program;
create policy publik_baca on public.reseller_program for select to anon, authenticated using (true);
create policy admin_ubah on public.reseller_program for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create table if not exists public.reseller_bookings (
  id bigint generated always as identity primary key,
  name text not null,
  wa text not null,
  kota text,
  catatan text,
  harga int,
  status text not null default 'baru' check (status in ('baru', 'dihubungi', 'lunas', 'batal')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reseller_bookings_baru on public.reseller_bookings (created_at desc);
alter table public.reseller_bookings enable row level security;
drop policy if exists admin_semua on public.reseller_bookings;
create policy admin_semua on public.reseller_bookings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.daftar_reseller(p_nama text, p_wa text, p_kota text default null, p_catatan text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  pr public.reseller_program;
  s public.notif_settings;
  v_nama text := btrim(regexp_replace(coalesce(p_nama, ''), '\s+', ' ', 'g'));
  v_wa text := public._rapikan_wa(p_wa);
  v_promo boolean;
  v_harga int;
  b public.reseller_bookings;
  v_kirim boolean := false;
begin
  select * into pr from public.reseller_program where id = 1;
  select * into s from public.notif_settings where id = 1;
  if not pr.aktif then raise exception 'Pendaftaran reseller sedang ditutup'; end if;
  if length(v_nama) < 2 or length(v_nama) > 60 then raise exception 'Nama harus 2 sampai 60 huruf'; end if;
  if v_wa is null then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if (select count(*) from public.reseller_bookings where created_at > now() - interval '10 minutes') >= 15 then
    raise exception 'Sedang banyak pendaftaran. Coba lagi beberapa menit lagi.';
  end if;
  select * into b from public.reseller_bookings where wa = v_wa and status in ('baru', 'dihubungi') order by id desc limit 1;
  if b.id is not null then
    return jsonb_build_object('sudah', true, 'harga', b.harga, 'wa_admin', (select whatsapp_number from public.store_settings where id = 1));
  end if;
  v_promo := (pr.mulai is null or pr.mulai <= now()) and (pr.sampai is null or pr.sampai >= now());
  v_harga := case when v_promo then pr.harga_promo end;   -- di luar periode promo: harga dikonfirmasi admin
  insert into public.reseller_bookings (name, wa, kota, catatan, harga)
  values (v_nama, v_wa, nullif(left(btrim(coalesce(p_kota, '')), 60), ''), nullif(left(btrim(coalesce(p_catatan, '')), 300), ''), v_harga)
  returning * into b;
  perform public._notif_owner('daftar', 'reseller_baru', 'Booking reseller: ' || b.name || coalesce(' · ' || public._rupiah(b.harga), ' (daftar tunggu)'),
    'Nama: ' || b.name || chr(10) || 'WhatsApp: wa.me/' || b.wa || chr(10)
    || coalesce('Kota: ' || b.kota || chr(10), '') || coalesce('Catatan: ' || b.catatan || chr(10), '')
    || 'Harga: ' || coalesce(public._rupiah(b.harga) || ' (' || pr.label_promo || ')', 'di luar periode promo, konfirmasi dulu') || chr(10)
    || 'Panel: ' || s.site_url || '/admin/#reseller');
  if s.auto_reseller and public._wa_siap() then
    perform public._kirim_wa('reseller_sambutan', b.wa, public._template('reseller_daftar',
      jsonb_build_object('nama', b.name, 'harga', coalesce(public._rupiah(b.harga), 'sesuai info admin'))));
    v_kirim := true;
  end if;
  return jsonb_build_object('baru', true, 'harga', b.harga, 'promo', v_promo, 'terkirim', v_kirim,
                            'wa_admin', (select whatsapp_number from public.store_settings where id = 1));
end $$;
grant execute on function public.daftar_reseller(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 6. pendaftaran affiliate
alter table public.partners add column if not exists pendaftaran text check (pendaftaran in ('baru', 'diterima', 'ditolak'));
alter table public.partners add column if not exists daftar_at timestamptz;

create or replace function public.daftar_affiliate(p_nama text, p_wa text, p_kota text default null, p_sosmed text default null,
                                                   p_tampil boolean default false, p_setuju boolean default false)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.notif_settings;
  v_nama text := btrim(regexp_replace(coalesce(p_nama, ''), '\s+', ' ', 'g'));
  v_wa text := public._rapikan_wa(p_wa);
  p public.partners;
  v_pesan text[];
  v_kirim boolean := false;
begin
  select * into s from public.notif_settings where id = 1;
  if not coalesce(p_setuju, false) then raise exception 'Centang persetujuan aturan main dulu'; end if;
  if length(v_nama) < 2 or length(v_nama) > 60 then raise exception 'Nama harus 2 sampai 60 huruf'; end if;
  if v_wa is null then raise exception 'Nomor WhatsApp tidak valid'; end if;
  select * into p from public.partners where whatsapp = v_wa order by id limit 1;
  if p.id is not null then
    return jsonb_build_object('sudah', true,
      'status', case when p.pendaftaran = 'baru' then 'menunggu' when p.is_active then 'aktif' else 'nonaktif' end);
  end if;
  if (select count(*) from public.partners where daftar_at > now() - interval '10 minutes') >= 15 then
    raise exception 'Sedang banyak pendaftaran. Coba lagi beberapa menit lagi.';
  end if;
  insert into public.partners (name, kind, whatsapp, city, instagram, show_contact, is_active, is_verified, pendaftaran, daftar_at, admin_note)
  values (v_nama, 'affiliator', v_wa, left(p_kota, 60), left(p_sosmed, 80), coalesce(p_tampil, false), false, false, 'baru', now(),
          'Daftar lewat website')
  returning * into p;
  v_pesan := array[
    public._template('affiliate_aturan', jsonb_build_object('nama', p.name, 'kode', p.referral_code)),
    public._template('affiliate_alur', jsonb_build_object('nama', p.name, 'kode', p.referral_code))];
  perform public._notif_owner('daftar', 'affiliate_baru', 'Pendaftar affiliate: ' || p.name,
    'Nama: ' || p.name || chr(10) || 'WhatsApp: wa.me/' || p.whatsapp || chr(10)
    || coalesce('Kota: ' || p.city || chr(10), '') || coalesce('Sosmed: ' || p.instagram || chr(10), '')
    || 'Kode: ' || p.referral_code || chr(10)
    || 'Terima/tolak di panel: ' || s.site_url || '/admin/#affiliate');
  if s.auto_affiliate and public._wa_siap() then
    perform public._kirim_wa('affiliate_aturan', p.whatsapp, v_pesan[1]);
    perform public._kirim_wa('affiliate_alur', p.whatsapp, v_pesan[2]);
    v_kirim := true;
  end if;
  return jsonb_build_object('baru', true, 'nama', p.name, 'kode', p.referral_code, 'pesan', to_jsonb(v_pesan), 'terkirim', v_kirim,
                            'wa_admin', (select whatsapp_number from public.store_settings where id = 1));
end $$;
grant execute on function public.daftar_affiliate(text, text, text, text, boolean, boolean) to anon, authenticated;

-- ---------------------------------------------------------------- 7. terlaris bulan ini
-- Hanya urutan aplikasi & paket yang paling sering dibeli (tanpa angka penjualan).
create or replace function public.terlaris_json()
returns jsonb
language sql stable security definer set search_path = '' as $$
  with batas as (
    select (date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta') as bulan,
           now() - interval '60 days' as cadangan
  ), jual as (
    select a.slug, i.variant_code, o.created_at >= (select bulan from batas) as bulan_ini
    from public.order_items i
    join public.orders o on o.id = i.order_id
    join public.variants v on v.id = i.variant_id
    join public.plan_groups g on g.id = v.group_id
    join public.apps a on a.id = g.app_id
    where o.status in ('dibayar', 'aktif', 'selesai') and a.is_active and v.is_active
      and o.created_at >= least((select bulan from batas), (select cadangan from batas))
  ), pakai as (
    select case when (select count(distinct slug) from jual where bulan_ini) >= 4 then 'bulan' else '60hari' end as periode
  ), hitung as (
    select j.slug, j.variant_code, count(*) as n
    from jual j, pakai
    where pakai.periode = '60hari' or j.bulan_ini
    group by 1, 2
  ), per_app as (
    select slug, sum(n) as n, (array_agg(variant_code order by n desc, variant_code))[1] as kode
    from hitung group by slug
  )
  select jsonb_build_object('periode', (select periode from pakai),
    'apps', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'kode', kode) order by n desc, slug)
                      from (select * from per_app order by n desc, slug limit 8) x), '[]'::jsonb))
$$;
grant execute on function public.terlaris_json() to anon, authenticated;
