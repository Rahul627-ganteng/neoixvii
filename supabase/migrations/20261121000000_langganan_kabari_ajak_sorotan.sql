-- ============================================================================
-- Masa langganan & pengingat perpanjang, "Kabari saya kalau tersedia", ajak teman dapat kupon,
-- halaman "Langganan saya", dan headline beranda.
--   1. Kupon pribadi & kupon publik  : kupon khusus satu nomor WA, khusus pembeli baru, tampil di headline
--   2. Masa langganan                : v_langganan (satu baris per pesanan × aplikasi) untuk menu "Masa langganan"
--   3. Pengingat otomatis (Fonnte)   : H-3, hari terakhir, dan kupon ajakan kembali; dikirim tiap jam (pg_cron)
--   4. Halaman "Langganan saya"      : link pribadi per nomor WA (/langganan/?k=…) + status pesanan dari perangkat
--   5. Kabari saat tersedia          : daftar tunggu per varian, otomatis dikabari saat stok Tersedia lagi
--   6. Ajak teman                    : setiap member punya kode ajak; teman dapat potongan, pengajak dapat kupon hadiah
--   7. Headline beranda              : susunan headline (otomatis & manual) yang diatur dari panel
-- Pesan WhatsApp memakai template di menu Notifikasi (bisa diubah). Tidak ada harga yang dijual di bawah HPP.
-- Jalankan di SQL Editor Supabase SETELAH 20261120000000_penyesuaian_saldo_affiliate.sql. Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------- 0. alat bantu
-- Item pesanan → id aplikasi (dari varian; item manual dicocokkan dari namanya, mis. "Canva 2 Tahun" → Canva)
create or replace function public._app_item(p_variant bigint, p_nama text)
returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce((select g.app_id from public.variants v join public.plan_groups g on g.id = v.group_id where v.id = p_variant),
                  public.cocokkan_app(p_nama))
$$;
revoke execute on function public._app_item(bigint, text) from public, anon;
grant execute on function public._app_item(bigint, text) to authenticated;

-- 20 Nov 2026 / 20 Nov 2026 (bulan dalam bahasa pembeli)
create or replace function public._tgl_teks(p date, p_lang text default 'id')
returns text language sql immutable set search_path = '' as $$
  select case when p is null then '' else
    extract(day from p)::int || ' '
    || (case when p_lang = 'en' then array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
             else array['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'] end)[extract(month from p)::int]
    || ' ' || extract(year from p)::int end
$$;

-- "10% (maks Rp10.000)" atau "Rp5.000"
create or replace function public._teks_potongan(p_jenis text, p_nilai numeric, p_maks int, p_lang text default 'id')
returns text language sql immutable set search_path = '' as $$
  select case when p_jenis = 'persen'
    then trim_scale(p_nilai)::text || '%' || case when p_maks is not null then case when p_lang = 'en' then ' (up to ' else ' (maks ' end || public._rupiah(p_maks) || ')' else '' end
    else public._rupiah(p_nilai::bigint) end
$$;

-- template sesuai bahasa pembeli: kunci_en dipakai untuk pembeli berbahasa Inggris kalau ada
create or replace function public._template_bahasa(p_kunci text, p_lang text, p_isi jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select public._isi_template(coalesce(
    (select isi from public.pesan_otomatis where p_lang = 'en' and kunci = p_kunci || '_en'),
    (select isi from public.pesan_otomatis where kunci = p_kunci)), p_isi)
$$;
revoke execute on function public._template_bahasa(text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- 1. kupon pribadi & publik
alter table public.coupons add column if not exists sumber text not null default 'admin';
alter table public.coupons drop constraint if exists coupons_sumber_cek;
alter table public.coupons add constraint coupons_sumber_cek check (sumber in ('admin', 'ajak', 'hadiah_ajak', 'kembali'));
alter table public.coupons add column if not exists khusus_wa text;          -- hanya bisa dipakai nomor ini
alter table public.coupons add column if not exists khusus_baru boolean not null default false;   -- hanya pembelian pertama
alter table public.coupons add column if not exists pemilik_member bigint references public.members(id) on delete cascade;
alter table public.coupons add column if not exists tampil_publik boolean not null default false;  -- tampil di headline beranda
alter table public.coupons add column if not exists teks_publik text check (teks_publik is null or length(teks_publik) <= 140);
create index if not exists coupons_khusus_wa on public.coupons (khusus_wa) where khusus_wa is not null;
create unique index if not exists coupons_ajak_member on public.coupons (pemilik_member) where sumber = 'ajak';

-- Diskon member + kupon (sama seperti sebelumnya) + aturan kupon pribadi, kupon pembeli baru, dan kode ajak teman.
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
  v_wa_cek text;
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
  v_wa_cek := coalesce(v_wa, m.wa);

  if v_kode <> '' then
    select * into k from public.coupons where code = v_kode;
    if k.id is null or not k.is_active then v_galat := 'Kode kupon tidak ditemukan';
    elsif k.mulai is not null and k.mulai > now() then v_galat := 'Kupon ini belum berlaku';
    elsif k.sampai is not null and k.sampai < now() then v_galat := 'Kupon ini sudah berakhir';
    elsif k.khusus_member and m.id is null then v_galat := 'Kupon ini khusus member IXVII.CO';
    elsif k.khusus_wa is not null and v_wa_cek is distinct from k.khusus_wa then
      v_galat := 'Kupon ini khusus untuk nomor WhatsApp penerimanya';
    elsif k.sumber = 'ajak' and not coalesce((select aktif from public.ajak_program where id = 1), false) then
      v_galat := 'Program ajak teman sedang tidak berjalan';
    elsif k.pemilik_member is not null
      and (k.pemilik_member = m.id or v_wa_cek = (select x.wa from public.members x where x.id = k.pemilik_member)) then
      v_galat := 'Kode ajak teman tidak bisa dipakai sendiri';
    elsif k.khusus_baru and v_wa_cek is not null
      and exists (select 1 from public.orders o where o.customer_wa = v_wa_cek and o.status in ('dibayar', 'aktif', 'selesai')) then
      v_galat := 'Kode ajak teman hanya untuk pembelian pertama';
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
    'kupon', case when k.id is not null and v_galat is null then jsonb_build_object('id', k.id, 'kode', k.code, 'rp', v_krp, 'ket',
               case when k.sumber = 'admin' then k.keterangan end, 'sumber', k.sumber) end,
    'kupon_galat', v_galat,
    'catatan', v_catatan,
    'dibatasi', v_dibatasi,
    'total', v_mrp + v_krp);
end $$;
revoke execute on function public._diskon_tambahan(int, int, text, text, text) from public, anon, authenticated;

-- Kupon pribadi baru (ajakan kembali & hadiah ajak teman). Kode acak, sekali pakai, khusus satu nomor.
create or replace function public._buat_kupon_pribadi(p_awalan text, p_wa text, p_sumber text, p_jenis text, p_nilai numeric,
                                                      p_maks int, p_min int, p_hari int, p_ket text)
returns public.coupons
language plpgsql security definer set search_path = '' as $$
declare
  k public.coupons;
  v_kode text;
begin
  loop
    v_kode := p_awalan || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    exit when not exists (select 1 from public.coupons where code = v_kode);
  end loop;
  insert into public.coupons (code, keterangan, jenis, nilai, maks_diskon, min_belanja, mulai, sampai, kuota, per_nomor,
                              khusus_member, gabung_member, is_active, sumber, khusus_wa)
  values (v_kode, left(p_ket, 120), p_jenis, p_nilai, case when p_jenis = 'persen' then p_maks end, coalesce(p_min, 0),
          now(), now() + make_interval(days => greatest(coalesce(p_hari, 14), 1)), 1, 1,
          false, true, true, p_sumber, p_wa)
  returning * into k;
  return k;
end $$;
revoke execute on function public._buat_kupon_pribadi(text, text, text, text, numeric, int, int, int, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- 2. masa langganan
-- link pribadi "Langganan saya" per nomor WhatsApp
create table if not exists public.pembeli (
  wa text primary key,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  link_dikirim_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.pembeli enable row level security;
drop policy if exists admin_semua on public.pembeli;
create policy admin_semua on public.pembeli for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.pembeli from anon;

create or replace function public._token_pembeli(p_wa text)
returns text
language plpgsql security definer set search_path = '' as $$
declare v text; v_wa text := public._rapikan_wa(p_wa);
begin
  if v_wa is null then return null; end if;
  insert into public.pembeli (wa) values (v_wa) on conflict (wa) do nothing;
  select token into v from public.pembeli where wa = v_wa;
  return v;
end $$;
revoke execute on function public._token_pembeli(text) from public, anon, authenticated;

-- token per pesanan: halaman status pesanan dari perangkat yang memesan
alter table public.orders add column if not exists cek_token text unique default replace(gen_random_uuid()::text, '-', '');
update public.orders set cek_token = replace(gen_random_uuid()::text, '-', '') where cek_token is null;

-- tandai manual dari panel: sudah perpanjang (di luar website) / tidak perpanjang
create table if not exists public.langganan_tandai (
  order_id bigint not null references public.orders(id) on delete cascade,
  app_key text not null,
  status text not null check (status in ('diperpanjang', 'tidak')),
  updated_at timestamptz not null default now(),
  primary key (order_id, app_key)
);
alter table public.langganan_tandai enable row level security;
drop policy if exists admin_semua on public.langganan_tandai;
create policy admin_semua on public.langganan_tandai for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.langganan_tandai from anon;

create table if not exists public.pengingat_setelan (
  id int primary key default 1 check (id = 1),
  aktif boolean not null default true,
  hari_sebelum int not null default 3 check (hari_sebelum between 1 and 14),
  kirim_hari_h boolean not null default true,
  ajak_kembali boolean not null default true,
  hari_kembali int not null default 7 check (hari_kembali between 1 and 60),
  kupon_jenis text not null default 'persen' check (kupon_jenis in ('persen', 'nominal')),
  kupon_nilai numeric not null default 5 check (kupon_nilai > 0),
  kupon_maks int default 10000 check (kupon_maks is null or kupon_maks > 0),
  kupon_hari int not null default 14 check (kupon_hari between 1 and 90),
  maks_per_jam int not null default 15 check (maks_per_jam between 1 and 100),
  jam_mulai int not null default 9 check (jam_mulai between 0 and 23),
  jam_selesai int not null default 20 check (jam_selesai between 0 and 23),
  terakhir_jalan timestamptz,
  updated_at timestamptz not null default now(),
  constraint pengingat_persen_wajar check (kupon_jenis <> 'persen' or kupon_nilai <= 50)
);
insert into public.pengingat_setelan (id) values (1) on conflict (id) do nothing;
alter table public.pengingat_setelan enable row level security;
drop policy if exists admin_semua on public.pengingat_setelan;
create policy admin_semua on public.pengingat_setelan for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.pengingat_setelan from anon;

create table if not exists public.pengingat_log (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  app_key text not null,
  berakhir date,
  jenis text not null check (jenis in ('sebelum', 'hari_h', 'kembali', 'manual', 'manual_wa')),
  status text not null check (status in ('dikirim', 'gagal')),
  kupon_id bigint references public.coupons(id) on delete set null,
  request_id bigint,
  created_at timestamptz not null default now()
);
create index if not exists pengingat_log_kunci on public.pengingat_log (order_id, app_key, berakhir);
create index if not exists pengingat_log_baru on public.pengingat_log (created_at desc);
alter table public.pengingat_log enable row level security;
drop policy if exists admin_baca on public.pengingat_log;
create policy admin_baca on public.pengingat_log for select to authenticated using ((select public.is_admin()));
revoke all on public.pengingat_log from anon;

-- Satu baris per pesanan × aplikasi yang punya masa aktif. "keadaan":
--   aktif        : masih berjalan
--   lewat        : sudah berakhir dan belum diperpanjang
--   memesan      : sudah membuat pesanan baru untuk aplikasi yang sama, belum dibayar (≤ 7 hari)
--   diperpanjang : ada pesanan baru yang sudah dibayar/aktif untuk aplikasi yang sama, atau ditandai admin
--   tidak        : ditandai admin tidak diperpanjang (tidak diingatkan lagi)
create or replace view public.v_langganan with (security_invoker = true) as
with item as (
  select o.id as order_id, o.code, o.customer_name, o.customer_wa, o.lang, o.status, o.created_at, o.starts_on, o.member_id,
         i.id as item_id, i.app_name, i.plan_label, i.variant_label, i.variant_code, i.variant_id, i.duration_days,
         public._app_item(i.variant_id, i.app_name) as app_id,
         coalesce(o.starts_on + i.duration_days, o.ends_on) as berakhir
  from public.orders o
  join public.order_items i on i.order_id = o.id
  where o.status in ('aktif', 'selesai') and i.produk_id is null
), satu as (
  select distinct on (x.order_id, coalesce(x.app_id::text, lower(x.app_name)))
         x.*, coalesce(x.app_id::text, lower(x.app_name)) as app_key
  from item x
  where x.berakhir is not null
  order by x.order_id, coalesce(x.app_id::text, lower(x.app_name)), x.berakhir desc, x.item_id
)
select s.order_id, s.code, s.customer_name, s.customer_wa, s.lang, s.status, s.created_at, s.starts_on, s.member_id,
       s.app_key, s.app_id, coalesce(a.name, s.app_name) as app_name, s.plan_label, s.variant_label, s.variant_code, s.variant_id,
       s.duration_days, a.slug, a.logo_url, s.berakhir,
       s.berakhir - case when s.duration_days >= 28 then 3 else 0 end as berakhir_awal,
       s.berakhir - public.hari_ini_wib() as sisa_hari,
       baru.code as baru_kode, baru.status as baru_status, t.status as tandai,
       case when t.status = 'diperpanjang' or baru.status in ('dibayar', 'aktif', 'selesai') then 'diperpanjang'
            when t.status = 'tidak' then 'tidak'
            when baru.status = 'menunggu_bayar' and baru.created_at > now() - interval '7 days' then 'memesan'
            when s.berakhir < public.hari_ini_wib() then 'lewat'
            else 'aktif' end as keadaan,
       lg.sebelum_at, lg.hari_h_at, lg.kembali_at, lg.manual_at, coalesce(lg.gagal_n, 0) as gagal_n
from satu s
left join public.apps a on a.id = s.app_id
left join lateral (
  select o2.code, o2.status, o2.created_at
  from public.orders o2
  join public.order_items i2 on i2.order_id = o2.id
  where o2.customer_wa = s.customer_wa and o2.id <> s.order_id and o2.created_at > s.created_at and o2.status <> 'batal'
    and coalesce(public._app_item(i2.variant_id, i2.app_name)::text, lower(i2.app_name)) = s.app_key
  order by (o2.status = 'menunggu_bayar'), o2.created_at desc
  limit 1
) baru on true
left join public.langganan_tandai t on t.order_id = s.order_id and t.app_key = s.app_key
left join lateral (
  select max(pl.created_at) filter (where pl.jenis = 'sebelum' and pl.status = 'dikirim') as sebelum_at,
         max(pl.created_at) filter (where pl.jenis = 'hari_h' and pl.status = 'dikirim') as hari_h_at,
         max(pl.created_at) filter (where pl.jenis = 'kembali' and pl.status = 'dikirim') as kembali_at,
         max(pl.created_at) filter (where pl.jenis in ('manual', 'manual_wa')) as manual_at,
         count(*) filter (where pl.status = 'gagal') as gagal_n
  from public.pengingat_log pl
  where pl.order_id = s.order_id and pl.app_key = s.app_key and pl.berakhir is not distinct from s.berakhir
) lg on true;
revoke all on public.v_langganan from anon;

-- ---------------------------------------------------------------- 3. pesan otomatis (bisa diubah di menu Notifikasi)
insert into public.pesan_otomatis (kunci, judul, isi) values
('pengingat_sebelum', 'Pengingat: beberapa hari sebelum berakhir', $t${salam} Kak {nama} 👋

Langganan {app} kamu di IXVII.CO akan berakhir *{tgl}* ({sisa} hari lagi).

Biar tidak terputus, perpanjang lewat link ini. Sisa masa aktif semua langgananmu juga ada di sana:
{link}

Kalau tidak ingin diperpanjang, abaikan saja pesan ini ya 🙏$t$),
('pengingat_sebelum_en', 'Pengingat: beberapa hari sebelum berakhir (English)', $t$Hi {nama} 👋

Your {app} subscription at IXVII.CO ends on *{tgl}* ({sisa} days left).

Renew here to keep it running. You can also check the remaining time of all your subscriptions there:
{link}

If you don't want to renew, just ignore this message 🙏$t$),
('pengingat_hari_h', 'Pengingat: hari terakhir', $t${salam} Kak {nama} 👋

Masa aktif {app} kamu di IXVII.CO berakhir *{kapan}*.

Mau lanjut? Perpanjang di sini, prosesnya cepat:
{link}

Terima kasih sudah langganan di IXVII.CO 🙏$t$),
('pengingat_hari_h_en', 'Pengingat: hari terakhir (English)', $t$Hi {nama} 👋

Your {app} subscription at IXVII.CO ends *{kapan}*.

Want to keep using it? Renew here, it only takes a minute:
{link}

Thank you for subscribing at IXVII.CO 🙏$t$),
('pengingat_lewat', 'Pengingat manual: sudah berakhir', $t$Halo Kak {nama} 👋

Masa aktif {app} kamu di IXVII.CO sudah berakhir {tgl}. Mau diperpanjang? Pesan lagi lewat link ini ya:
{link}$t$),
('pengingat_lewat_en', 'Pengingat manual: sudah berakhir (English)', $t$Hi {nama} 👋

Your {app} subscription at IXVII.CO ended on {tgl}. Would you like to renew? You can order again here:
{link}$t$),
('ajak_kembali', 'Ajak kembali + kupon pribadi', $t${salam} Kak {nama} 👋

Sudah {lama} hari sejak langganan {app} kamu berakhir. Kalau mau pakai lagi, ada kupon khusus buat kamu:

🎟️ *{kupon}* · potongan {potongan}
Berlaku sampai {berlaku}, hanya untuk nomor ini.

Pesan lagi di sini, lalu tempel kodenya di kolom kupon:
{link}$t$),
('ajak_kembali_en', 'Ajak kembali + kupon pribadi (English)', $t$Hi {nama} 👋

It has been {lama} days since your {app} subscription ended. If you'd like to use it again, here's a coupon just for you:

🎟️ *{kupon}* · {potongan} off
Valid until {berlaku}, for this number only.

Order again here and paste the code into the coupon field:
{link}$t$),
('langganan_link', 'Link "Langganan saya"', $t$Halo Kak {nama} 👋

Ini link *Langganan saya* di IXVII.CO. Isinya sisa masa aktif, status garansi, dan tombol perpanjang untuk semua pesananmu:
{link}

Jangan bagikan link ini ke orang lain ya.$t$),
('langganan_link_en', 'Link "Langganan saya" (English)', $t$Hi {nama} 👋

Here is your *My subscriptions* link at IXVII.CO. It shows the remaining time, warranty status, and a renew button for all your orders:
{link}

Please don't share this link with anyone.$t$),
('stok_tersedia', 'Kabari saat stok tersedia lagi', $t${salam} Kak {nama} 👋

Kabar baik! *{app} {paket}* sudah *tersedia lagi* di IXVII.CO dengan harga {harga}.{catatan}

Pesan sekarang lewat link ini:
{link}

Kamu dapat pesan ini karena minta dikabari di website IXVII.CO.$t$),
('stok_tersedia_en', 'Kabari saat stok tersedia lagi (English)', $t$Hi {nama} 👋

Good news! *{app} {paket}* is *back in stock* at IXVII.CO for {harga}.{catatan}

Order now here:
{link}

You're getting this message because you asked to be notified on the IXVII.CO website.$t$),
('ajak_hadiah', 'Ajak teman: hadiah untuk pengajak', $t${salam} Kak {nama} 🎉

Temanmu *{teman}* baru saja belanja di IXVII.CO pakai kode ajakmu *{kode_ajak}*. Terima kasih sudah mengajak!

Ini hadiah untukmu:
🎟️ *{kupon}* · potongan {potongan}
Berlaku sampai {berlaku}, khusus nomor ini, dan bisa digabung dengan diskon member.

Pakai di pembelian berikutnya: {link}$t$)
on conflict (kunci) do nothing;

-- ---------------------------------------------------------------- 3b. kirim pengingat
create or replace function public._dalam_jam_kirim()
returns boolean language sql stable security definer set search_path = '' as $$
  select extract(hour from now() at time zone 'Asia/Jakarta')::int between s.jam_mulai and s.jam_selesai
  from public.pengingat_setelan s where s.id = 1
$$;
revoke execute on function public._dalam_jam_kirim() from public, anon, authenticated;

-- Susun pesan untuk satu pembeli. p_baris: [{app, paket, slug, berakhir, sisa}] (urut berakhir paling awal)
create or replace function public._pesan_pengingat(p_jenis text, p_nama text, p_wa text, p_lang text, p_baris jsonb,
                                                   p_kupon public.coupons default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  ns public.notif_settings;
  v_en boolean := p_lang = 'en';
  v_app text;
  v_awal date := (p_baris->0->>'berakhir')::date;
  v_sisa int := (p_baris->0->>'sisa')::int;
  v_link text;
  v_kunci text;
begin
  select * into ns from public.notif_settings where id = 1;
  select case when count(*) = 1 then '*' || min(e->>'app') || '* (' || min(e->>'paket') || ')'
              else string_agg('*' || (e->>'app') || '*', ', ') end
    into v_app from jsonb_array_elements(p_baris) e;
  v_link := ns.site_url || '/langganan/?k=' || public._token_pembeli(p_wa)
            || coalesce('&app=' || nullif(p_baris->0->>'slug', ''), '');
  v_kunci := case p_jenis when 'sebelum' then 'pengingat_sebelum' when 'hari_h' then 'pengingat_hari_h'
                          when 'kembali' then 'ajak_kembali' else 'pengingat_lewat' end;
  return public._template_bahasa(v_kunci, p_lang, jsonb_build_object(
    'nama', split_part(btrim(p_nama), ' ', 1), 'app', v_app, 'tgl', public._tgl_teks(v_awal, p_lang),
    'sisa', greatest(v_sisa, 0)::text, 'lama', greatest(-v_sisa, 0)::text,
    'kapan', case when v_sisa = 0 then (case when v_en then 'today' else 'hari ini' end) || ' (' || public._tgl_teks(v_awal, p_lang) || ')'
                  when v_sisa = -1 then (case when v_en then 'yesterday' else 'kemarin' end) || ' (' || public._tgl_teks(v_awal, p_lang) || ')'
                  else public._tgl_teks(v_awal, p_lang) end,
    'link', v_link,
    'kupon', p_kupon.code, 'potongan', public._teks_potongan(p_kupon.jenis, p_kupon.nilai, p_kupon.maks_diskon, p_lang),
    'berlaku', public._tgl_teks((p_kupon.sampai at time zone 'Asia/Jakarta')::date, p_lang)));
end $$;
revoke execute on function public._pesan_pengingat(text, text, text, text, jsonb, public.coupons) from public, anon, authenticated;

-- Dijalankan tiap jam oleh pg_cron (dan tombol "Kirim sekarang" di panel).
-- Satu pembeli paling banyak satu pesan per putaran; langganan yang berakhir di hari yang dekat digabung.
create or replace function public.kirim_pengingat_otomatis(p_paksa boolean default false)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  st public.pengingat_setelan;
  g record;
  k public.coupons;
  v_pesan text;
  v_req bigint;
  v_kirim int := 0;
  v_gagal int := 0;
  v_sudah text[] := '{}';
  v_stok int := 0;
  v_rincian jsonb := '[]'::jsonb;
begin
  -- lewat panel harus admin; dari jadwal pg_cron (tanpa login) boleh
  if coalesce(current_setting('request.jwt.claims', true), '') <> '' and not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into st from public.pengingat_setelan where id = 1;
  update public.pengingat_setelan set terakhir_jalan = now() where id = 1;
  if not public._wa_siap() then
    return jsonb_build_object('terkirim', 0, 'alasan', 'WhatsApp (Fonnte) belum tersambung. Isi token Fonnte di menu Notifikasi.');
  end if;
  if not p_paksa and not public._dalam_jam_kirim() then
    return jsonb_build_object('terkirim', 0, 'alasan', 'Di luar jam kirim');
  end if;
  -- daftar tunggu stok yang tertunda (stok tersedia saat malam / WA belum tersambung)
  v_stok := public._kabari_semua_tertunda();
  if not st.aktif and not p_paksa then
    return jsonb_build_object('terkirim', 0, 'stok_dikabari', v_stok, 'alasan', 'Pengingat otomatis sedang dimatikan');
  end if;

  for g in
    with calon as (
      select l.*, case
        when l.sisa_hari between 1 and st.hari_sebelum and coalesce(l.duration_days, 30) >= 7
             and l.sebelum_at is null and l.hari_h_at is null then 'sebelum'
        when st.kirim_hari_h and l.sisa_hari between -1 and 0 and l.hari_h_at is null then 'hari_h'
        when st.ajak_kembali and l.sisa_hari between -(st.hari_kembali + 7) and -st.hari_kembali and l.kembali_at is null
             and not exists (select 1 from public.coupons c where c.sumber = 'kembali' and c.khusus_wa = l.customer_wa
                             and c.created_at > now() - interval '30 days') then 'kembali'
      end as jenis
      from public.v_langganan l
      where l.keadaan in ('aktif', 'lewat') and l.customer_wa is not null and l.gagal_n < 3
    )
    select c.customer_wa, c.jenis, min(c.customer_name) as nama, min(c.lang) as lang,
           jsonb_agg(jsonb_build_object('order_id', c.order_id, 'app_key', c.app_key, 'app', c.app_name,
                                        'paket', c.plan_label || ' · ' || c.variant_label, 'slug', c.slug,
                                        'berakhir', c.berakhir, 'sisa', c.sisa_hari) order by c.berakhir, c.app_name) as baris
    from calon c
    where c.jenis is not null
    group by c.customer_wa, c.jenis
    order by case c.jenis when 'hari_h' then 0 when 'sebelum' then 1 else 2 end, min(c.berakhir)
  loop
    exit when v_kirim >= st.maks_per_jam;
    continue when g.customer_wa = any (v_sudah);
    v_sudah := v_sudah || g.customer_wa;
    k := null;
    if g.jenis = 'kembali' then
      k := public._buat_kupon_pribadi('BALIK', g.customer_wa, 'kembali', st.kupon_jenis, st.kupon_nilai, st.kupon_maks, 0, st.kupon_hari,
             'Ajak kembali · ' || g.nama || ' · ' || (select string_agg(distinct e->>'app', ', ') from jsonb_array_elements(g.baris) e));
    end if;
    v_pesan := public._pesan_pengingat(g.jenis, g.nama, g.customer_wa, g.lang, g.baris, k);
    v_req := public._kirim_wa('pengingat_' || g.jenis, g.customer_wa, v_pesan);
    insert into public.pengingat_log (order_id, app_key, berakhir, jenis, status, kupon_id, request_id)
    select (e->>'order_id')::bigint, e->>'app_key', (e->>'berakhir')::date, g.jenis,
           case when v_req is null then 'gagal' else 'dikirim' end, k.id, v_req
    from jsonb_array_elements(g.baris) e;
    if v_req is null then
      v_gagal := v_gagal + 1;
      if k.id is not null then update public.coupons set is_active = false where id = k.id; end if;
    else
      v_kirim := v_kirim + 1;
      v_rincian := v_rincian || jsonb_build_object('nama', g.nama, 'jenis', g.jenis, 'n', jsonb_array_length(g.baris));
    end if;
  end loop;
  return jsonb_build_object('terkirim', v_kirim, 'gagal', v_gagal, 'stok_dikabari', v_stok, 'rincian', v_rincian);
end $$;
revoke execute on function public.kirim_pengingat_otomatis(boolean) from public, anon;
grant execute on function public.kirim_pengingat_otomatis(boolean) to authenticated;

-- Pengingat manual dari panel untuk satu langganan.
-- p_kirim = true: dikirim lewat Fonnte. false: hanya menyusun teks + link wa.me (dikirim dari HP admin).
create or replace function public.pengingat_manual(p_order bigint, p_app_key text, p_kirim boolean default true)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  l record;
  v_jenis text;
  v_pesan text;
  v_req bigint;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into l from public.v_langganan where order_id = p_order and app_key = p_app_key;
  if l.order_id is null then raise exception 'Langganan tidak ditemukan'; end if;
  v_jenis := case when l.sisa_hari > 0 then 'sebelum' when l.sisa_hari >= -1 then 'hari_h' else 'lewat' end;
  v_pesan := public._pesan_pengingat(v_jenis, l.customer_name, l.customer_wa, l.lang,
    jsonb_build_array(jsonb_build_object('app', l.app_name, 'paket', l.plan_label || ' · ' || l.variant_label, 'slug', l.slug,
                                         'berakhir', l.berakhir, 'sisa', l.sisa_hari)));
  if p_kirim then
    if not public._wa_siap() then raise exception 'WhatsApp (Fonnte) belum tersambung. Pakai tombol WA manual.'; end if;
    v_req := public._kirim_wa('pengingat_manual', l.customer_wa, v_pesan);
  end if;
  insert into public.pengingat_log (order_id, app_key, berakhir, jenis, status, request_id)
  values (l.order_id, l.app_key, l.berakhir, case when p_kirim then 'manual' else 'manual_wa' end,
          case when p_kirim and v_req is null then 'gagal' else 'dikirim' end, v_req);
  return jsonb_build_object('pesan', v_pesan, 'wa', l.customer_wa, 'terkirim', v_req is not null);
end $$;
revoke execute on function public.pengingat_manual(bigint, text, boolean) from public, anon;
grant execute on function public.pengingat_manual(bigint, text, boolean) to authenticated;

create or replace function public.tandai_langganan(p_order bigint, p_app_key text, p_status text)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if p_status is null then
    delete from public.langganan_tandai where order_id = p_order and app_key = p_app_key;
  elsif p_status in ('diperpanjang', 'tidak') then
    insert into public.langganan_tandai (order_id, app_key, status) values (p_order, p_app_key, p_status)
    on conflict (order_id, app_key) do update set status = excluded.status, updated_at = now();
  else raise exception 'Status tidak dikenal';
  end if;
end $$;
revoke execute on function public.tandai_langganan(bigint, text, text) from public, anon;
grant execute on function public.tandai_langganan(bigint, text, text) to authenticated;

-- link "Langganan saya" untuk disalin/dikirim admin
create or replace function public.link_langganan(p_wa text)
returns text
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  v := public._token_pembeli(p_wa);
  if v is null then raise exception 'Nomor WhatsApp tidak valid'; end if;
  return (select site_url from public.notif_settings where id = 1) || '/langganan/?k=' || v;
end $$;
revoke execute on function public.link_langganan(text) from public, anon;
grant execute on function public.link_langganan(text) to authenticated;

-- ---------------------------------------------------------------- 4. halaman "Langganan saya" (publik)
-- Paket untuk tombol Perpanjang: varian yang sama kalau masih dijual & tersedia, kalau tidak paket termurah
-- yang tersedia dengan tipe sama, lalu paket apa saja dari aplikasi itu.
create or replace function public._paket_perpanjang(p_variant bigint, p_app bigint)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('kode', v.code, 'tipe', g.label, 'varian', v.label, 'harga', v.price,
                            'tersedia', v.stock <> 'habis', 'sama', v.id = p_variant)
  from public.variants v
  join public.plan_groups g on g.id = v.group_id
  join public.apps a on a.id = g.app_id
  where g.app_id = p_app and v.is_active and a.is_active
  order by (v.id = p_variant and v.stock <> 'habis') desc,
           (v.stock <> 'habis') desc,
           (g.label = (select g2.label from public.variants v2 join public.plan_groups g2 on g2.id = v2.group_id where v2.id = p_variant)) desc,
           (v.duration_days = (select v3.duration_days from public.variants v3 where v3.id = p_variant)) desc,
           v.price, v.id
  limit 1
$$;
revoke execute on function public._paket_perpanjang(bigint, bigint) from public, anon, authenticated;

create or replace function public._link_garansi(p_order bigint)
returns text language sql stable security definer set search_path = '' as $$
  select t.token from public.review_tokens t
  where t.order_id = p_order and t.used_at is null and t.expires_at > now()
    and not exists (select 1 from public.warranties w where w.order_id = p_order)
  order by t.created_at desc limit 1
$$;
revoke execute on function public._link_garansi(bigint) from public, anon, authenticated;

create or replace function public._items_pesanan(p_order bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('app', coalesce(a.name, i.app_name), 'tipe', i.plan_label, 'varian', i.variant_label,
                                               'kode', i.variant_code, 'slug', a.slug, 'logo', a.logo_url, 'harga', i.price) order by i.id), '[]'::jsonb)
  from public.order_items i
  left join public.apps a on a.id = public._app_item(i.variant_id, i.app_name)
  where i.order_id = p_order
$$;
revoke execute on function public._items_pesanan(bigint) from public, anon, authenticated;

-- p_token: token "Langganan saya" (dikirim lewat WhatsApp) atau token akun member
create or replace function public.langganan_saya(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_tok text := btrim(coalesce(p_token, ''));
  v_wa text;
  v_member public.members;
  v_nama text;
begin
  if v_tok !~ '^[0-9a-f]{24,64}$' then raise exception 'Link langganan tidak valid'; end if;
  select wa into v_wa from public.pembeli where token = v_tok;
  if v_wa is null then
    select * into v_member from public.members where token = v_tok and is_active;
    v_wa := v_member.wa;
  else
    select * into v_member from public.members where wa = v_wa and is_active;
  end if;
  if v_wa is null then raise exception 'Link langganan tidak valid'; end if;
  select customer_name into v_nama from public.orders where customer_wa = v_wa order by created_at desc limit 1;

  return jsonb_build_object(
    'nama', coalesce(v_member.name, v_nama),
    'wa', v_wa,
    'member', v_member.id is not null,
    'langganan', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kode', l.code, 'app', l.app_name, 'app_key', l.app_key, 'slug', l.slug, 'logo', l.logo_url,
        'tipe', l.plan_label, 'varian', l.variant_label, 'mulai', l.starts_on, 'berakhir', l.berakhir, 'berakhir_awal', l.berakhir_awal,
        'durasi', l.duration_days, 'sisa', l.sisa_hari, 'keadaan', l.keadaan,
        'garansi', (select w.status from public.warranties w where w.order_id = l.order_id order by w.created_at desc limit 1),
        'link_garansi', public._link_garansi(l.order_id),
        'perpanjang', case when l.app_id is not null then public._paket_perpanjang(l.variant_id, l.app_id) end)
        order by (l.keadaan = 'lewat'), l.berakhir)
      from public.v_langganan l
      where l.customer_wa = v_wa and l.keadaan <> 'diperpanjang' and l.sisa_hari >= -45), '[]'::jsonb),
    'pesanan', coalesce((
      select jsonb_agg(jsonb_build_object('kode', o.code, 'tanggal', o.created_at, 'status', o.status, 'total', o.total,
                                          'diskon', o.discount, 'mulai', o.starts_on, 'sampai', o.ends_on,
                                          'items', public._items_pesanan(o.id), 'link_garansi', public._link_garansi(o.id))
                       order by o.created_at desc)
      from (select * from public.orders where customer_wa = v_wa order by created_at desc limit 30) o), '[]'::jsonb),
    'kupon', coalesce((
      select jsonb_agg(jsonb_build_object('kode', c.code, 'jenis', c.jenis, 'nilai', c.nilai, 'maks', c.maks_diskon,
                                          'min', c.min_belanja, 'sampai', c.sampai, 'sumber', c.sumber) order by c.sampai)
      from public.coupons c
      where c.khusus_wa = v_wa and c.is_active and (c.sampai is null or c.sampai > now())
        and not exists (select 1 from public.orders o where o.coupon_id = c.id and o.status <> 'batal')), '[]'::jsonb));
end $$;
grant execute on function public.langganan_saya(text) to anon, authenticated;

-- Status pesanan dari perangkat yang memesan (token per pesanan, tanpa data pribadi pembeli)
create or replace function public.status_pesanan(p_tokens text[])
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'kode', o.code, 'tanggal', o.created_at, 'status', o.status, 'total', o.total, 'diskon', o.discount,
           'mulai', o.starts_on, 'sampai', o.ends_on, 'items', public._items_pesanan(o.id),
           'link_garansi', public._link_garansi(o.id)) order by o.created_at desc), '[]'::jsonb)
  from public.orders o
  where o.cek_token in (select x from unnest(coalesce(p_tokens, '{}'::text[])) x where x ~ '^[0-9a-f]{32}$' limit 10)
$$;
grant execute on function public.status_pesanan(text[]) to anon, authenticated;

-- Token status pesanan untuk halaman sukses (hanya sesaat setelah pesanan dibuat, dengan nomor yang sama)
create or replace function public.token_pesanan(p_kode text, p_wa text)
returns text
language sql stable security definer set search_path = '' as $$
  select o.cek_token from public.orders o
  where o.code = upper(btrim(coalesce(p_kode, ''))) and o.customer_wa = public._rapikan_wa(p_wa)
    and o.created_at > now() - interval '2 hours'
$$;
grant execute on function public.token_pesanan(text, text) to anon, authenticated;

-- "Kirim link ke WhatsApp saya". Jawaban sama untuk nomor yang pernah belanja maupun tidak.
create or replace function public.kirim_link_langganan(p_wa text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_wa text := public._rapikan_wa(p_wa);
  v_nama text;
  v_lang text;
  p public.pembeli;
begin
  if v_wa is null then raise exception 'Nomor WhatsApp tidak valid'; end if;
  select customer_name, lang into v_nama, v_lang from public.orders
  where customer_wa = v_wa and status <> 'batal' order by created_at desc limit 1;
  if v_nama is not null and public._wa_siap() then
    perform public._token_pembeli(v_wa);
    select * into p from public.pembeli where wa = v_wa;
    if p.link_dikirim_at is null or p.link_dikirim_at < now() - interval '10 minutes' then
      perform public._kirim_wa('langganan_link', v_wa, public._template_bahasa('langganan_link', v_lang, jsonb_build_object(
        'nama', split_part(btrim(v_nama), ' ', 1),
        'link', (select site_url from public.notif_settings where id = 1) || '/langganan/?k=' || p.token)));
      update public.pembeli set link_dikirim_at = now() where wa = v_wa;
    end if;
  end if;
  return jsonb_build_object('wa_siap', public._wa_siap());
end $$;
grant execute on function public.kirim_link_langganan(text) to anon, authenticated;

-- ---------------------------------------------------------------- 5. kabari saat tersedia
create table if not exists public.stok_tunggu (
  id bigint generated always as identity primary key,
  variant_id bigint not null references public.variants(id) on delete cascade,
  nama text check (nama is null or length(nama) between 1 and 60),
  wa text not null,
  lang text not null default 'id' check (lang in ('id', 'en')),
  status text not null default 'menunggu' check (status in ('menunggu', 'dikabari', 'batal')),
  created_at timestamptz not null default now(),
  dikabari_at timestamptz
);
create unique index if not exists stok_tunggu_satu on public.stok_tunggu (variant_id, wa) where status = 'menunggu';
create index if not exists stok_tunggu_varian on public.stok_tunggu (variant_id, status);
alter table public.stok_tunggu enable row level security;
drop policy if exists admin_semua on public.stok_tunggu;
create policy admin_semua on public.stok_tunggu for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.stok_tunggu from anon;

-- daftar dari halaman aplikasi (paket yang sedang habis)
create or replace function public.kabari_tersedia(p_kode text, p_wa text, p_nama text default null, p_bahasa text default 'id')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v record;
  v_wa text := public._rapikan_wa(p_wa);
  v_nama text := nullif(btrim(regexp_replace(coalesce(p_nama, ''), '\s+', ' ', 'g')), '');
begin
  if v_wa is null then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if length(v_nama) > 60 then raise exception 'Nama harus 2 sampai 60 huruf'; end if;
  select x.id, x.stock into v from public.variants x
  join public.plan_groups g on g.id = x.group_id join public.apps a on a.id = g.app_id
  where x.code = p_kode and x.is_active and a.is_active;
  if v.id is null then raise exception 'Paket % tidak tersedia', p_kode; end if;
  if v.stock <> 'habis' then return jsonb_build_object('tersedia', true); end if;
  if exists (select 1 from public.stok_tunggu where variant_id = v.id and wa = v_wa and status = 'menunggu') then
    return jsonb_build_object('ok', true, 'sudah', true, 'wa_siap', public._wa_siap());
  end if;
  if (select count(*) from public.stok_tunggu where wa = v_wa and created_at > now() - interval '10 minutes') >= 5
     or (select count(*) from public.stok_tunggu where wa = v_wa and status = 'menunggu') >= 20 then
    raise exception 'Terlalu banyak permintaan dari nomor ini. Coba lagi nanti.';
  end if;
  if (select count(*) from public.stok_tunggu where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'Sedang banyak permintaan. Coba lagi beberapa menit lagi.';
  end if;
  insert into public.stok_tunggu (variant_id, nama, wa, lang) values (v.id, v_nama, v_wa, case when p_bahasa = 'en' then 'en' else 'id' end);
  return jsonb_build_object('ok', true, 'wa_siap', public._wa_siap());
end $$;
grant execute on function public.kabari_tersedia(text, text, text, text) to anon, authenticated;

-- Kirim kabar ke daftar tunggu satu varian (paling banyak 100 sekali jalan). Hasil: jumlah yang dikabari.
create or replace function public._kabari_varian(p_variant bigint)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v record;
  w record;
  ns public.notif_settings;
  v_req bigint;
  n int := 0;
begin
  if not public._wa_siap() then return 0; end if;
  select x.id, x.code, x.label, x.price, x.stock, x.stock_qty, g.label as tipe, a.name as app, a.slug into v
  from public.variants x join public.plan_groups g on g.id = x.group_id join public.apps a on a.id = g.app_id
  where x.id = p_variant and x.is_active and a.is_active;
  if v.id is null or v.stock = 'habis' then return 0; end if;
  select * into ns from public.notif_settings where id = 1;
  for w in select * from public.stok_tunggu where variant_id = v.id and status = 'menunggu' order by created_at limit 100 loop
    v_req := public._kirim_wa('stok_tersedia', w.wa, public._template_bahasa('stok_tersedia', w.lang, jsonb_build_object(
      'nama', coalesce(split_part(w.nama, ' ', 1), case when w.lang = 'en' then 'there' else 'Kak' end),
      'app', v.app, 'paket', v.tipe || ' · ' || v.label, 'harga', public._rupiah(v.price),
      'catatan', case when v.stock_qty is not null and v.stock_qty <= 5
                      then case when w.lang = 'en' then ' Only ' || v.stock_qty || ' left, first come first served.'
                                else ' Stoknya terbatas (sisa ' || v.stock_qty || '), siapa cepat dia dapat ya.' end
                      else '' end,
      'link', ns.site_url || '/aplikasi/?app=' || v.slug || '&pilih=' || v.code)));
    if v_req is not null then
      update public.stok_tunggu set status = 'dikabari', dikabari_at = now() where id = w.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public._kabari_varian(bigint) from public, anon, authenticated;

create or replace function public._kabari_semua_tertunda()
returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select distinct t.variant_id from public.stok_tunggu t join public.variants v on v.id = t.variant_id
           where t.status = 'menunggu' and v.stock <> 'habis' and v.is_active loop
    n := n + public._kabari_varian(r.variant_id);
  end loop;
  return n;
end $$;
revoke execute on function public._kabari_semua_tertunda() from public, anon, authenticated;

-- Stok Habis → Tersedia: langsung kabari (di luar jam kirim, menunggu jadwal berikutnya)
create or replace function public._stok_tersedia_lagi()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.stock = 'habis' and new.stock <> 'habis' and new.is_active and public._dalam_jam_kirim()
     and exists (select 1 from public.stok_tunggu where variant_id = new.id and status = 'menunggu') then
    perform public._kabari_varian(new.id);
  end if;
  return null;
exception when others then
  raise warning 'kabari stok gagal: %', sqlerrm;
  return null;
end $$;
revoke execute on function public._stok_tersedia_lagi() from public, anon, authenticated;
drop trigger if exists stok_tersedia_lagi on public.variants;
create trigger stok_tersedia_lagi after update of stock, stock_qty, is_active on public.variants
  for each row when (old.stock = 'habis' and new.stock is distinct from old.stock)
  execute function public._stok_tersedia_lagi();

-- tombol "Kabari sekarang" di panel
create or replace function public.kabari_sekarang(p_kode text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.variants;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into v from public.variants where code = p_kode;
  if v.id is null then raise exception 'Paket % tidak ditemukan', p_kode; end if;
  if v.stock = 'habis' then raise exception 'Stok paket ini masih Habis. Ubah jadi Tersedia dulu.'; end if;
  if not public._wa_siap() then raise exception 'WhatsApp (Fonnte) belum tersambung. Pakai tombol WA manual.'; end if;
  return jsonb_build_object('dikabari', public._kabari_varian(v.id),
                            'sisa', (select count(*) from public.stok_tunggu where variant_id = v.id and status = 'menunggu'));
end $$;
revoke execute on function public.kabari_sekarang(text) from public, anon;
grant execute on function public.kabari_sekarang(text) to authenticated;

-- ---------------------------------------------------------------- 6. ajak teman
create table if not exists public.ajak_program (
  id int primary key default 1 check (id = 1),
  aktif boolean not null default true,
  teman_jenis text not null default 'persen' check (teman_jenis in ('persen', 'nominal')),
  teman_nilai numeric not null default 5 check (teman_nilai > 0),
  teman_maks int default 10000 check (teman_maks is null or teman_maks > 0),
  teman_min int not null default 0 check (teman_min >= 0),
  hadiah_jenis text not null default 'nominal' check (hadiah_jenis in ('persen', 'nominal')),
  hadiah_nilai numeric not null default 5000 check (hadiah_nilai > 0),
  hadiah_maks int check (hadiah_maks is null or hadiah_maks > 0),
  hadiah_min int not null default 0 check (hadiah_min >= 0),
  hadiah_hari int not null default 60 check (hadiah_hari between 1 and 365),
  maks_hadiah_bulan int not null default 10 check (maks_hadiah_bulan between 1 and 100),
  kirim_wa boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint ajak_teman_persen check (teman_jenis <> 'persen' or teman_nilai <= 50),
  constraint ajak_hadiah_persen check (hadiah_jenis <> 'persen' or hadiah_nilai <= 50)
);
insert into public.ajak_program (id) values (1) on conflict (id) do nothing;
alter table public.ajak_program enable row level security;
drop policy if exists publik_baca on public.ajak_program;
drop policy if exists admin_ubah on public.ajak_program;
create policy publik_baca on public.ajak_program for select to anon, authenticated using (true);
create policy admin_ubah on public.ajak_program for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.members add column if not exists kode_ajak text unique;

-- "Rahul Paris" → RAHUL27 (unik di member & kupon)
create or replace function public._kode_ajak_baru(p_nama text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_dasar text := left(upper(regexp_replace(split_part(btrim(coalesce(p_nama, '')), ' ', 1), '[^A-Za-z]', '', 'g')), 8);
  v text;
  n int := 0;
begin
  if length(v_dasar) < 3 then v_dasar := 'TEMAN'; end if;
  loop
    n := n + 1;
    v := v_dasar || lpad((floor(random() * case when n < 20 then 90 else 900 end) + 10)::int::text, 2, '0');
    exit when not exists (select 1 from public.coupons where code = v) and not exists (select 1 from public.members where kode_ajak = v);
  end loop;
  return v;
end $$;
revoke execute on function public._kode_ajak_baru(text) from public, anon, authenticated;

-- kupon ajak (satu per member) mengikuti aturan program
create or replace function public._pasang_kupon_ajak(p_member bigint)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  m public.members;
  pr public.ajak_program;
begin
  select * into m from public.members where id = p_member;
  select * into pr from public.ajak_program where id = 1;
  if m.id is null then return; end if;
  if m.kode_ajak is null then
    update public.members set kode_ajak = public._kode_ajak_baru(m.name) where id = m.id returning * into m;
  end if;
  insert into public.coupons (code, keterangan, jenis, nilai, maks_diskon, min_belanja, kuota, per_nomor, khusus_member,
                              gabung_member, is_active, sumber, khusus_baru, pemilik_member)
  values (m.kode_ajak, 'Kode ajak teman · ' || m.name, pr.teman_jenis, pr.teman_nilai,
          case when pr.teman_jenis = 'persen' then pr.teman_maks end, pr.teman_min, null, 1, false, false,
          m.is_active and pr.aktif, 'ajak', true, m.id)
  on conflict do nothing;
end $$;
revoke execute on function public._pasang_kupon_ajak(bigint) from public, anon, authenticated;

create or replace function public._member_ajak()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public._pasang_kupon_ajak(new.id);
  elsif new.is_active is distinct from old.is_active then
    update public.coupons set is_active = new.is_active and coalesce((select aktif from public.ajak_program where id = 1), true), updated_at = now()
    where pemilik_member = new.id and sumber = 'ajak';
  end if;
  return null;
exception when others then
  raise warning 'kode ajak gagal: %', sqlerrm;
  return null;
end $$;
revoke execute on function public._member_ajak() from public, anon, authenticated;
drop trigger if exists member_ajak on public.members;
create trigger member_ajak after insert or update of is_active on public.members
  for each row execute function public._member_ajak();

-- member lama ikut dapat kode ajak
do $$ declare r record; begin
  for r in select m.id from public.members m
           where not exists (select 1 from public.coupons c where c.pemilik_member = m.id and c.sumber = 'ajak') loop
    perform public._pasang_kupon_ajak(r.id);
  end loop;
end $$;

-- aturan program berubah → semua kode ajak ikut
create or replace function public._sinkron_kupon_ajak()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.coupons c set jenis = new.teman_jenis, nilai = new.teman_nilai,
         maks_diskon = case when new.teman_jenis = 'persen' then new.teman_maks end, min_belanja = new.teman_min,
         is_active = new.aktif and coalesce((select m.is_active from public.members m where m.id = c.pemilik_member), false),
         updated_at = now()
  where c.sumber = 'ajak';
  return null;
end $$;
revoke execute on function public._sinkron_kupon_ajak() from public, anon, authenticated;
drop trigger if exists sinkron_kupon_ajak on public.ajak_program;
create trigger sinkron_kupon_ajak after update on public.ajak_program
  for each row execute function public._sinkron_kupon_ajak();

create table if not exists public.ajak_hadiah (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members(id) on delete cascade,
  order_id bigint not null unique references public.orders(id) on delete cascade,
  teman text,
  kupon_id bigint references public.coupons(id) on delete set null,
  status text not null check (status in ('diberikan', 'batas', 'dibatalkan')),
  created_at timestamptz not null default now()
);
create index if not exists ajak_hadiah_member on public.ajak_hadiah (member_id, created_at desc);
alter table public.ajak_hadiah enable row level security;
drop policy if exists admin_baca on public.ajak_hadiah;
create policy admin_baca on public.ajak_hadiah for select to authenticated using ((select public.is_admin()));
revoke all on public.ajak_hadiah from anon;

-- Pesanan teman (pakai kode ajak) jadi Aktif/Selesai → pengajak dapat kupon hadiah. Dibatalkan → hadiah yang belum dipakai ikut batal.
create or replace function public._hadiah_ajak()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k public.coupons;
  pr public.ajak_program;
  m public.members;
  h public.coupons;
  ns public.notif_settings;
  v_n int;
begin
  if new.coupon_id is null then return null; end if;
  select * into k from public.coupons where id = new.coupon_id;
  if k.sumber is distinct from 'ajak' or k.pemilik_member is null then return null; end if;
  if new.status in ('aktif', 'selesai') and old.status not in ('aktif', 'selesai') then
    if exists (select 1 from public.ajak_hadiah where order_id = new.id) then return null; end if;
    select * into pr from public.ajak_program where id = 1;
    select * into m from public.members where id = k.pemilik_member;
    if m.id is null or not m.is_active or m.wa = new.customer_wa then return null; end if;
    select count(*) into v_n from public.ajak_hadiah
    where member_id = m.id and status = 'diberikan'
      and date_trunc('month', created_at at time zone 'Asia/Jakarta') = date_trunc('month', now() at time zone 'Asia/Jakarta');
    if v_n >= pr.maks_hadiah_bulan then
      insert into public.ajak_hadiah (member_id, order_id, teman, status) values (m.id, new.id, public.samarkan_nama(new.customer_name), 'batas');
      return null;
    end if;
    h := public._buat_kupon_pribadi('HADIAH', m.wa, 'hadiah_ajak', pr.hadiah_jenis, pr.hadiah_nilai, pr.hadiah_maks, pr.hadiah_min,
                                    pr.hadiah_hari, 'Hadiah ajak teman · ' || m.name || ' · pesanan ' || new.code);
    insert into public.ajak_hadiah (member_id, order_id, teman, kupon_id, status)
    values (m.id, new.id, public.samarkan_nama(new.customer_name), h.id, 'diberikan');
    if pr.kirim_wa and public._wa_siap() then
      select * into ns from public.notif_settings where id = 1;
      perform public._kirim_wa('ajak_hadiah', m.wa, public._template('ajak_hadiah', jsonb_build_object(
        'nama', split_part(m.name, ' ', 1), 'teman', public.samarkan_nama(new.customer_name), 'kode_ajak', m.kode_ajak,
        'kupon', h.code, 'potongan', public._teks_potongan(h.jenis, h.nilai, h.maks_diskon),
        'berlaku', public._tgl_teks((h.sampai at time zone 'Asia/Jakarta')::date), 'link', ns.site_url || '/katalog/')));
    end if;
  elsif new.status = 'batal' then
    update public.coupons c set is_active = false, updated_at = now()
    from public.ajak_hadiah a
    where a.order_id = new.id and c.id = a.kupon_id
      and not exists (select 1 from public.orders o where o.coupon_id = c.id and o.status <> 'batal');
    update public.ajak_hadiah set status = 'dibatalkan' where order_id = new.id and status = 'diberikan';
  end if;
  return null;
exception when others then
  raise warning 'hadiah ajak gagal: %', sqlerrm;
  return null;
end $$;
revoke execute on function public._hadiah_ajak() from public, anon, authenticated;
drop trigger if exists hadiah_ajak on public.orders;
create trigger hadiah_ajak after update of status on public.orders
  for each row when (new.status is distinct from old.status) execute function public._hadiah_ajak();

-- Info kode ajak untuk sambutan di website (nama depan pengajak + besar potongan)
create or replace function public.info_ajak(p_kode text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('kode', c.code, 'nama', split_part(m.name, ' ', 1), 'jenis', c.jenis, 'nilai', c.nilai,
                            'maks', c.maks_diskon, 'min', c.min_belanja)
  from public.coupons c
  join public.members m on m.id = c.pemilik_member
  join public.ajak_program p on p.id = 1
  where c.code = upper(regexp_replace(coalesce(p_kode, ''), '[^A-Za-z0-9]', '', 'g'))
    and c.sumber = 'ajak' and c.is_active and m.is_active and p.aktif
$$;
grant execute on function public.info_ajak(text) to anon, authenticated;

-- Bagian "Ajak teman" di halaman akun member
create or replace function public.ajak_member(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  m public.members;
  pr public.ajak_program;
begin
  select * into m from public.members where token = btrim(coalesce(p_token, '')) and length(btrim(coalesce(p_token, ''))) >= 24 and is_active;
  if m.id is null then raise exception 'Link akun member tidak valid'; end if;
  select * into pr from public.ajak_program where id = 1;
  return jsonb_build_object(
    'aktif', pr.aktif, 'kode', m.kode_ajak,
    'teman', jsonb_build_object('jenis', pr.teman_jenis, 'nilai', pr.teman_nilai, 'maks', pr.teman_maks, 'min', pr.teman_min),
    'hadiah', jsonb_build_object('jenis', pr.hadiah_jenis, 'nilai', pr.hadiah_nilai, 'maks', pr.hadiah_maks, 'hari', pr.hadiah_hari),
    'batas_bulan', pr.maks_hadiah_bulan,
    'berhasil', (select count(*) from public.ajak_hadiah a where a.member_id = m.id and a.status <> 'dibatalkan'),
    'menunggu', (select count(*) from public.orders o join public.coupons c on c.id = o.coupon_id
                 where c.pemilik_member = m.id and c.sumber = 'ajak' and o.status in ('menunggu_bayar', 'dibayar')),
    'riwayat', coalesce((
      select jsonb_agg(jsonb_build_object('tgl', a.created_at, 'teman', a.teman, 'status', a.status, 'kupon', c.code,
                                          'jenis', c.jenis, 'nilai', c.nilai, 'maks', c.maks_diskon, 'sampai', c.sampai,
                                          'dipakai', exists (select 1 from public.orders o where o.coupon_id = c.id and o.status <> 'batal'),
                                          'aktif', c.is_active) order by a.created_at desc)
      from (select * from public.ajak_hadiah where member_id = m.id order by created_at desc limit 30) a
      left join public.coupons c on c.id = a.kupon_id), '[]'::jsonb));
end $$;
grant execute on function public.ajak_member(text) to anon, authenticated;

-- ---------------------------------------------------------------- 7. headline beranda
create table if not exists public.sorotan (
  id bigint generated always as identity primary key,
  jenis text not null check (jenis in ('promo', 'bundle', 'kupon', 'toppick', 'member', 'ajak', 'affiliate', 'reseller', 'film', 'blog', 'manual')),
  aktif boolean not null default true,
  urutan int not null default 0,
  label text check (label is null or length(label) <= 30),
  judul text check (judul is null or length(judul) <= 90),
  teks text check (teks is null or length(teks) <= 220),
  tombol text check (tombol is null or length(tombol) <= 30),
  tautan text check (tautan is null or tautan ~ '^(/|https://)'),
  gambar_url text check (gambar_url is null or gambar_url ~ '^(/|https://)'),
  judul_en text check (judul_en is null or length(judul_en) <= 90),
  teks_en text check (teks_en is null or length(teks_en) <= 220),
  tombol_en text check (tombol_en is null or length(tombol_en) <= 30),
  mulai timestamptz,
  sampai timestamptz,
  updated_at timestamptz not null default now(),
  check (jenis <> 'manual' or judul is not null)
);
create unique index if not exists sorotan_otomatis on public.sorotan (jenis) where jenis <> 'manual';
alter table public.sorotan enable row level security;
drop policy if exists admin_semua on public.sorotan;
create policy admin_semua on public.sorotan for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- website membaca lewat sorotan_json()
revoke all on public.sorotan from anon;

insert into public.sorotan (jenis, urutan)
select j, n from (values ('promo', 10), ('bundle', 20), ('kupon', 30), ('toppick', 40), ('member', 50), ('ajak', 60),
                         ('affiliate', 70), ('reseller', 80), ('film', 90), ('blog', 100)) v(j, n)
on conflict do nothing;

create or replace function public.sorotan_json()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'sorotan', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'jenis', s.jenis, 'label', s.label, 'judul', s.judul, 'teks', s.teks,
                                          'tombol', s.tombol, 'tautan', s.tautan, 'gambar', s.gambar_url,
                                          'judul_en', s.judul_en, 'teks_en', s.teks_en, 'tombol_en', s.tombol_en, 'sampai', s.sampai)
                       order by s.urutan, s.id)
      from public.sorotan s
      where s.aktif and (s.mulai is null or s.mulai <= now()) and (s.sampai is null or s.sampai > now())), '[]'::jsonb),
    'kupon', coalesce((
      select jsonb_agg(jsonb_build_object('kode', c.code, 'jenis', c.jenis, 'nilai', c.nilai, 'maks', c.maks_diskon,
                                          'min', c.min_belanja, 'sampai', c.sampai, 'member', c.khusus_member, 'teks', c.teks_publik)
                       order by c.sampai nulls last, c.id)
      from public.coupons c
      where c.tampil_publik and c.is_active and c.sumber = 'admin' and c.khusus_wa is null
        and (c.mulai is null or c.mulai <= now()) and (c.sampai is null or c.sampai > now())
        and (c.kuota is null or (select count(*) from public.orders o where o.coupon_id = c.id and o.status <> 'batal') < c.kuota)), '[]'::jsonb),
    'ajak', (select jsonb_build_object('aktif', p.aktif, 'jenis', p.teman_jenis, 'nilai', p.teman_nilai, 'maks', p.teman_maks,
                                       'hadiah_jenis', p.hadiah_jenis, 'hadiah_nilai', p.hadiah_nilai, 'hadiah_maks', p.hadiah_maks)
             from public.ajak_program p where p.id = 1),
    'affiliate', (select jsonb_build_object('pct', a.rate_pct, 'min_tarik', a.min_withdraw) from public.affiliate_settings a where a.id = 1))
$$;
grant execute on function public.sorotan_json() to anon, authenticated;

-- ---------------------------------------------------------------- 8. jadwal
-- Pengingat & kabar stok dicek tiap jam (menit ke-20). Pesan hanya terkirim di jam kirim (default 09.00–20.59 WIB).
do $cron$
begin
  begin
    create extension if not exists pg_cron with schema pg_catalog;
  exception when others then
    raise notice 'pg_cron belum aktif (%). Aktifkan di Database > Extensions, lalu jalankan file ini lagi.', sqlerrm;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'ixvii-pengingat';
    perform cron.schedule('ixvii-pengingat', '20 * * * *', 'select public.kirim_pengingat_otomatis()');
  end if;
end
$cron$;
