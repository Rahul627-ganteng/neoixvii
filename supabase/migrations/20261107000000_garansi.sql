-- ============================================================================
-- Aktivasi garansi (+ rating & ulasan di form yang sama)
--   Alur: pesanan Aktif → admin kirim link /garansi/?t=… lewat WhatsApp → pembeli mengisi nama, nomor HP,
--   device, dan screenshot bukti login (+ rating/ulasan opsional) dalam 1x24 jam → garansi tercatat.
--   Pembeli yang membalas lewat WhatsApp dengan format teks tetap bisa dicatat: admin menempel balasannya
--   di panel → dibaca otomatis → disimpan ke tabel yang sama.
--   1. orders.delivered_at : waktu akun dikirim (saat status jadi Aktif), dasar hitungan 1x24 jam
--      orders.ends_earliest: paket bulanan/tahunan dianggap penuh sejak hari ke-27 dari 30 (toleransi 3 hari),
--      jadi pengingat dikirim sebelum tanggal paling awal akun bisa berakhir
--   Garansi AKTIF hanya kalau form/balasan dikirim ≤ 24 jam sejak akun dikirim. Pesanan aktif tanpa form = garansi tidak aktif.
--   2. warranties          : data aktivasi garansi (hanya admin)
--   3. bucket privat "garansi": screenshot hanya bisa diunggah lewat link yang sah, hanya admin yang bisa melihat
--   4. RPC publik info_garansi / kirim_garansi (memakai token link yang sama dengan link ulasan)
-- Jalankan di SQL Editor Supabase SETELAH migration Tahap 10. Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------- 1. waktu akun dikirim
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists ends_earliest date;
-- isi untuk pesanan lama yang sudah punya tanggal berakhir
update public.orders o set ends_earliest = o.ends_on - case
    when (select max(i.duration_days) from public.order_items i where i.order_id = o.id) >= 28 then 3 else 0 end
where o.ends_on is not null and o.ends_earliest is null;

create or replace function public.ubah_status_pesanan(p_kode text, p_status text, p_catatan text default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  o public.orders;
  v_mulai date;
  v_hari  int;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if p_status not in ('menunggu_bayar', 'dibayar', 'aktif', 'selesai', 'batal') then raise exception 'Status tidak dikenal'; end if;
  select * into o from public.orders where code = p_kode for update;
  if o.id is null then raise exception 'Pesanan % tidak ditemukan', p_kode; end if;

  v_mulai := o.starts_on;
  if p_status = 'aktif' and v_mulai is null then
    v_mulai := (now() at time zone 'Asia/Jakarta')::date;
  end if;
  select max(duration_days) into v_hari from public.order_items where order_id = o.id;

  -- masa aktif dihitung sejak status Aktif (sudah bayar & akun dikirim).
  -- Paket ≥ 28 hari: 1 bulan = 27–30 hari, jadi ends_earliest = ends_on − 3 hari.
  update public.orders set
    status = p_status,
    starts_on = v_mulai,
    ends_on = case when v_mulai is not null and v_hari is not null then v_mulai + v_hari else ends_on end,
    ends_earliest = case when v_mulai is not null and v_hari is not null
                         then v_mulai + v_hari - case when v_hari >= 28 then 3 else 0 end else ends_earliest end,
    delivered_at = case when p_status = 'aktif' then coalesce(delivered_at, now()) else delivered_at end,
    admin_note = coalesce(p_catatan, admin_note),
    updated_at = now()
  where id = o.id
  returning * into o;
  return to_jsonb(o);
end $$;

-- ---------------------------------------------------------------- 2. data garansi
create table if not exists public.warranties (
  id              bigint generated always as identity primary key,
  order_id        bigint references public.orders(id) on delete set null,
  customer_name   text not null check (length(customer_name) between 1 and 80),
  phone           text,                      -- 62812…
  app_name        text,
  duration        text,
  purchased_on    date,
  purchased_text  text,                      -- tanggal beli sesuai tulisan pembeli
  device          text check (device is null or length(device) <= 120),
  screenshot_path text,                      -- di bucket privat "garansi"
  source          text not null default 'form' check (source in ('form', 'tempel')),
  on_time         boolean,                   -- dikirim ≤ 24 jam sejak akun dikirim (null = tidak diketahui)
  status          text not null default 'aktif' check (status in ('aktif', 'tidak_aktif')),   -- tidak_aktif: lewat 24 jam / dibatalkan admin
  admin_note      text,
  submitted_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists warranties_order_idx on public.warranties(order_id);

alter table public.warranties enable row level security;
drop policy if exists admin_semua on public.warranties;
create policy admin_semua on public.warranties for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- 3. bucket screenshot (privat)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('garansi', 'garansi', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- link (token) masih berlaku? Dipakai policy unggah supaya pengunjung tanpa link tidak bisa mengunggah.
create or replace function public.token_garansi_sah(p_token text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.review_tokens t
                 where t.token = p_token and t.used_at is null and t.expires_at > now())
$$;
grant execute on function public.token_garansi_sah(text) to anon, authenticated;

drop policy if exists garansi_unggah_lewat_link on storage.objects;
drop policy if exists garansi_admin_baca on storage.objects;
drop policy if exists garansi_admin_unggah on storage.objects;
drop policy if exists garansi_admin_hapus on storage.objects;
create policy garansi_unggah_lewat_link on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'garansi' and public.token_garansi_sah((storage.foldername(name))[1]));
create policy garansi_admin_unggah on storage.objects for insert to authenticated
  with check (bucket_id = 'garansi' and (storage.foldername(name))[1] = 'admin' and (select public.is_admin()));
create policy garansi_admin_baca on storage.objects for select to authenticated
  using (bucket_id = 'garansi' and (select public.is_admin()));
create policy garansi_admin_hapus on storage.objects for delete to authenticated
  using (bucket_id = 'garansi' and (select public.is_admin()));

-- ---------------------------------------------------------------- 4. ulasan bersama (dipakai form ulasan & form garansi)
create or replace function public._simpan_ulasan(p_order_id bigint, p_ulasan jsonb, p_anonim boolean)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  o     public.orders;
  e     jsonb;
  v_app record;
  v_isi text;
  v_nil int;
  v_n   int := 0;
begin
  select * into o from public.orders where id = p_order_id;
  if p_ulasan is null or jsonb_typeof(p_ulasan) <> 'array' then return 0; end if;
  if jsonb_array_length(p_ulasan) > 10 then raise exception 'Beri nilai minimal untuk satu aplikasi'; end if;
  for e in select * from jsonb_array_elements(p_ulasan) loop
    v_nil := case when (e->>'rating') ~ '^[1-5]$' then (e->>'rating')::int end;
    if v_nil is null then raise exception 'Nilai harus 1 sampai 5 bintang'; end if;
    v_isi := nullif(btrim(regexp_replace(coalesce(e->>'isi', ''), '[\r\n]{3,}', E'\n\n', 'g')), '');
    if length(v_isi) > 600 then raise exception 'Ulasan maksimal 600 huruf'; end if;
    select distinct a.id, coalesce(a.name, oi.app_name) as name into v_app
    from public.order_items oi
    left join public.variants v on v.id = oi.variant_id
    left join public.plan_groups g on g.id = v.group_id
    left join public.apps a on a.id = g.app_id
    where oi.order_id = o.id and coalesce(a.name, oi.app_name) = e->>'app'
    limit 1;
    if v_app.name is null then raise exception 'Aplikasi % tidak ada di pesanan ini', e->>'app'; end if;
    insert into public.reviews (order_id, app_id, app_name, rating, body, display_name, lang, purchased_on)
    values (o.id, v_app.id, v_app.name, v_nil, v_isi,
            case when p_anonim then 'Pembeli IXVII.CO' else public.samarkan_nama(o.customer_name) end,
            o.lang, (o.created_at at time zone 'Asia/Jakarta')::date)
    on conflict (order_id, app_name) do nothing;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke execute on function public._simpan_ulasan(bigint, jsonb, boolean) from public, anon, authenticated;

-- form ulasan Tahap 8 sekarang memakai fungsi bersama di atas
create or replace function public.kirim_ulasan(p_token text, p_ulasan jsonb, p_anonim boolean default false)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t   public.review_tokens;
  v_n int;
begin
  select * into t from public.review_tokens where token = p_token for update;
  if t.token is null or t.used_at is not null or t.expires_at <= now() then
    raise exception 'Link ulasan tidak valid atau sudah dipakai';
  end if;
  if p_ulasan is null or jsonb_typeof(p_ulasan) <> 'array' or jsonb_array_length(p_ulasan) = 0 then
    raise exception 'Beri nilai minimal untuk satu aplikasi';
  end if;
  v_n := public._simpan_ulasan(t.order_id, p_ulasan, p_anonim);
  update public.review_tokens set used_at = now() where token = t.token;
  return jsonb_build_object('tersimpan', v_n);
end $$;
grant execute on function public.kirim_ulasan(text, jsonb, boolean) to anon, authenticated;

-- ---------------------------------------------------------------- 5. form aktivasi garansi
create or replace function public.info_garansi(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  t public.review_tokens;
  o public.orders;
begin
  select * into t from public.review_tokens where token = p_token;
  if t.token is null or t.used_at is not null or t.expires_at <= now() then
    raise exception 'Link garansi tidak valid atau sudah dipakai';
  end if;
  select * into o from public.orders where id = t.order_id;
  return jsonb_build_object(
    'nama', public.samarkan_nama(o.customer_name),
    'dibeli', (o.created_at at time zone 'Asia/Jakarta')::date,
    'batas', o.delivered_at + interval '24 hours',
    'berakhir', o.ends_on,
    'berakhir_awal', o.ends_earliest,
    'lang', o.lang,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'name', coalesce(a.name, oi.app_name), 'slug', a.slug,
                                          'tipe', oi.plan_label, 'varian', oi.variant_label) order by oi.id)
      from public.order_items oi
      left join public.variants v on v.id = oi.variant_id
      left join public.plan_groups g on g.id = v.group_id
      left join public.apps a on a.id = g.app_id
      where oi.order_id = o.id), '[]'::jsonb));
end $$;
grant execute on function public.info_garansi(text) to anon, authenticated;

-- p_screenshot = path di bucket "garansi", harus di folder token ini dan sudah terunggah.
-- p_ulasan (opsional) = [{"app": "Netflix", "rating": 5, "isi": "..."}]
create or replace function public.kirim_garansi(p_token text, p_nama text, p_hp text, p_device text, p_screenshot text,
                                                p_ulasan jsonb default null, p_anonim boolean default false)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t      public.review_tokens;
  o      public.orders;
  v_nama text := btrim(coalesce(p_nama, ''));
  v_hp   text := regexp_replace(coalesce(p_hp, ''), '\D', '', 'g');
  v_dev  text := btrim(coalesce(p_device, ''));
  v_tepat boolean;
  v_n    int := 0;
begin
  select * into t from public.review_tokens where token = p_token for update;
  if t.token is null or t.used_at is not null or t.expires_at <= now() then
    raise exception 'Link garansi tidak valid atau sudah dipakai';
  end if;
  select * into o from public.orders where id = t.order_id;
  if length(v_nama) < 2 or length(v_nama) > 80 then raise exception 'Nama harus 2 sampai 80 huruf'; end if;
  if v_hp like '0%' then v_hp := '62' || substr(v_hp, 2); elsif v_hp like '8%' then v_hp := '62' || v_hp; end if;
  if length(v_hp) < 9 or length(v_hp) > 15 then raise exception 'Nomor HP tidak valid'; end if;
  if length(v_dev) < 2 or length(v_dev) > 120 then raise exception 'Tulis device yang dipakai'; end if;
  if p_screenshot is null or split_part(p_screenshot, '/', 1) <> t.token then
    raise exception 'Unggah screenshot bukti sudah berhasil login';
  end if;
  -- pastikan file benar-benar terunggah; dilewati kalau peran database tidak bisa melihat semua isi storage
  if exists (select 1 from pg_catalog.pg_roles r where r.rolname = current_user and (r.rolbypassrls or r.rolsuper)) then
    begin
      if not exists (select 1 from storage.objects s where s.bucket_id = 'garansi' and s.name = p_screenshot) then
        raise exception 'Unggah screenshot bukti sudah berhasil login';
      end if;
    exception when insufficient_privilege then null;
    end;
  end if;

  v_tepat := case when o.delivered_at is null then null else now() <= o.delivered_at + interval '24 hours' end;
  insert into public.warranties (order_id, customer_name, phone, app_name, duration, purchased_on, device, screenshot_path, source, on_time, status)
  select o.id, v_nama, v_hp,
         string_agg(distinct oi.app_name, ', '),
         string_agg(oi.app_name || ' ' || oi.variant_label, ', '),
         (o.created_at at time zone 'Asia/Jakarta')::date, v_dev, p_screenshot, 'form', v_tepat,
         case when v_tepat = false then 'tidak_aktif' else 'aktif' end
  from public.order_items oi where oi.order_id = o.id;

  if p_ulasan is not null and jsonb_typeof(p_ulasan) = 'array' and jsonb_array_length(p_ulasan) > 0 then
    v_n := public._simpan_ulasan(o.id, p_ulasan, p_anonim);
  end if;
  update public.review_tokens set used_at = now() where token = t.token;
  return jsonb_build_object('tepat_waktu', v_tepat, 'ulasan', v_n);
end $$;
grant execute on function public.kirim_garansi(text, text, text, text, text, jsonb, boolean) to anon, authenticated;
