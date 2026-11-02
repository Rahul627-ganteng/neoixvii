-- ============================================================================
-- Ebook Panduan Reseller (khusus pembeli program reseller)
--   1. ebook_info, ebook_bab      : isi ebook di database, bisa diubah dari panel admin (tidak ada di file website)
--   2. ebook_akses                : pembaca (nama, email, WA, password ter-hash), status menunggu/aktif/ditolak/dicabut
--   3. ebook_perangkat, ebook_sesi: maksimal 2 perangkat per akun, sesi 30 hari
--   4. ebook_log, ebook_progres   : riwayat masuk & perangkat, checklist/bab terakhir pembaca
--   5. RPC pembaca                : ebook_minta_akses, ebook_masuk, ebook_isi, ebook_simpan_progres, ebook_keluar
--   6. RPC admin                  : ebook_daftar_akses, ebook_setujui, ebook_tolak, ebook_cabut, ebook_reset_perangkat,
--                                   ebook_reset_sandi, ebook_beri_akses
--   Notifikasi ke owner (WA/email) saat ada permintaan akses, perangkat baru, dan percobaan di perangkat ke-3.
-- Jalankan di SQL Editor Supabase SETELAH migration poster_promo. Aman dijalankan ulang.
-- Butuh ekstensi pgcrypto (bawaan Supabase, skema "extensions").
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- 1. isi ebook
create table if not exists public.ebook_info (
  id         int primary key default 1 check (id = 1),
  judul      text not null default 'Panduan Reseller Aplikasi Premium',
  subjudul   text not null default 'Mulai dari Nol, Bangun Sistem Jualan, dan Dapatkan Pembeli Pertama',
  label      text not null default 'Starter Guide untuk Calon Reseller IXVII.CO',
  maks_perangkat int not null default 2 check (maks_perangkat between 1 and 5),
  updated_at timestamptz not null default now()
);
insert into public.ebook_info (id) values (1) on conflict (id) do nothing;

create table if not exists public.ebook_bab (
  id         bigint generated always as identity primary key,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label      text not null check (length(label) between 1 and 12),       -- "01", "Bonus"
  judul      text not null check (length(judul) between 2 and 120),
  ringkas    text check (ringkas is null or length(ringkas) <= 300),
  ikon       text not null default 'buku',
  isi        text not null default '' check (length(isi) <= 60000),
  urut       int not null default 0,
  tampil     boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.ebook_info enable row level security;
alter table public.ebook_bab  enable row level security;
drop policy if exists admin_semua on public.ebook_info;
drop policy if exists admin_semua on public.ebook_bab;
create policy admin_semua on public.ebook_info for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_semua on public.ebook_bab  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.ebook_info, public.ebook_bab from anon;

-- ---------------------------------------------------------------- 2–4. pembaca
create table if not exists public.ebook_akses (
  id             bigint generated always as identity primary key,
  nama           text not null,
  email          text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  wa             text,
  pass_hash      text not null,
  status         text not null default 'menunggu' check (status in ('menunggu', 'aktif', 'ditolak', 'dicabut')),
  sumber         text not null default 'minta' check (sumber in ('minta', 'admin')),
  booking_id     bigint references public.reseller_bookings(id) on delete set null,
  catatan        text,
  maks_perangkat int,
  gagal_masuk    int not null default 0,
  kunci_sampai   timestamptz,
  created_at     timestamptz not null default now(),
  disetujui_at   timestamptz,
  terakhir_masuk timestamptz
);
create table if not exists public.ebook_perangkat (
  id        bigint generated always as identity primary key,
  akses_id  bigint not null references public.ebook_akses(id) on delete cascade,
  perangkat text not null,
  ua        text,
  pertama   timestamptz not null default now(),
  terakhir  timestamptz not null default now(),
  unique (akses_id, perangkat)
);
create table if not exists public.ebook_sesi (
  token_hash  text primary key,
  akses_id    bigint not null references public.ebook_akses(id) on delete cascade,
  perangkat   text not null,
  dibuat      timestamptz not null default now(),
  kedaluwarsa timestamptz not null default now() + interval '30 days',
  terakhir    timestamptz not null default now()
);
create table if not exists public.ebook_log (
  id        bigint generated always as identity primary key,
  akses_id  bigint references public.ebook_akses(id) on delete cascade,
  acara     text not null,
  detail    text,
  ip        text,
  ua        text,
  created_at timestamptz not null default now()
);
create index if not exists ebook_log_baru on public.ebook_log (created_at desc);
create table if not exists public.ebook_progres (
  akses_id  bigint primary key references public.ebook_akses(id) on delete cascade,
  data      jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 8000),
  updated_at timestamptz not null default now()
);

-- semuanya privat: pembaca hanya lewat RPC, admin lewat RPC & log
alter table public.ebook_akses     enable row level security;
alter table public.ebook_perangkat enable row level security;
alter table public.ebook_sesi      enable row level security;
alter table public.ebook_log       enable row level security;
alter table public.ebook_progres   enable row level security;
revoke all on public.ebook_akses, public.ebook_perangkat, public.ebook_sesi, public.ebook_log, public.ebook_progres from anon, authenticated;
drop policy if exists admin_baca on public.ebook_log;
create policy admin_baca on public.ebook_log for select to authenticated using ((select public.is_admin()));
grant select on public.ebook_log to authenticated;

-- ---------------------------------------------------------------- alat bantu
create or replace function public._ebook_klien()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'ip', nullif(split_part(coalesce(nullif(current_setting('request.headers', true), '')::jsonb->>'x-forwarded-for', ''), ',', 1), ''),
    'ua', left(coalesce(nullif(current_setting('request.headers', true), '')::jsonb->>'user-agent', ''), 200))
$$;

create or replace function public._ebook_catat(p_akses bigint, p_acara text, p_detail text)
returns void language sql security definer set search_path = '' as $$
  delete from public.ebook_log where created_at < now() - interval '180 days';
  insert into public.ebook_log (akses_id, acara, detail, ip, ua)
  select p_akses, p_acara, left(p_detail, 300), k->>'ip', k->>'ua' from (select public._ebook_klien() k) x;
$$;
revoke execute on function public._ebook_catat(bigint, text, text) from public, anon, authenticated;

-- email ke alamat mana pun (pembeli), memakai pengaturan Resend yang sama dengan notifikasi owner
create or replace function public._kirim_email_ke(p_acara text, p_ke text, p_subjek text, p_teks text)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  s public.notif_settings;
  v_req bigint;
begin
  select * into s from public.notif_settings where id = 1;
  if p_ke is null then return null; end if;
  if s.resend_key is null then perform public._catat_notif(p_acara, 'email', p_ke, p_subjek, 'dilewati', 'API key Resend belum diisi', null); return null; end if;
  if not public._pg_net_aktif() then perform public._catat_notif(p_acara, 'email', p_ke, p_subjek, 'dilewati', 'Ekstensi pg_net belum aktif', null); return null; end if;
  begin
    execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 15000)' into v_req
      using 'https://api.resend.com/emails',
            jsonb_build_object('from', s.email_from, 'to', jsonb_build_array(p_ke), 'subject', p_subjek,
                               'html', public._html_email(p_teks), 'text', p_teks),
            jsonb_build_object('Authorization', 'Bearer ' || s.resend_key, 'Content-Type', 'application/json');
    perform public._catat_notif(p_acara, 'email', p_ke, p_subjek, 'dikirim', null, v_req);
  exception when others then
    perform public._catat_notif(p_acara, 'email', p_ke, p_subjek, 'gagal', sqlerrm, null);
  end;
  return v_req;
end $$;
revoke execute on function public._kirim_email_ke(text, text, text, text) from public, anon, authenticated;

create or replace function public._ebook_rapikan_email(p text)
returns text language sql immutable set search_path = '' as $$
  select nullif(lower(btrim(coalesce(p, ''))), '')
$$;

-- kabari pembeli bahwa aksesnya aktif (WA + email). p_sandi diisi kalau password dibuatkan admin.
create or replace function public._ebook_kabari(a public.ebook_akses, p_sandi text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.notif_settings;
  i public.ebook_info;
  v_teks text;
  v_wa bigint;
  v_mail bigint;
begin
  select * into s from public.notif_settings where id = 1;
  select * into i from public.ebook_info where id = 1;
  v_teks := 'Halo ' || a.nama || '! Akses *' || i.judul || '* kamu sudah aktif.' || chr(10) || chr(10)
    || 'Buka: ' || coalesce(s.site_url, 'https://ixviico.shop') || '/reseller/ebook/' || chr(10)
    || 'Email: ' || a.email || chr(10)
    || case when p_sandi is not null then 'Password: ' || p_sandi || chr(10) || '(Simpan baik-baik. Bisa diganti setelah masuk.)'
            else 'Password: yang kamu buat saat meminta akses.' end || chr(10) || chr(10)
    || 'Ebook ini khusus untukmu: bisa dibuka di maksimal ' || coalesce(a.maks_perangkat, i.maks_perangkat) || ' perangkat, '
    || 'tidak bisa diunduh, dan tidak boleh disebarkan atau dijual kembali.' || chr(10)
    || 'Selamat belajar! — IXVII.CO';
  if a.wa is not null then v_wa := public._kirim_wa('ebook_aktif', a.wa, v_teks); end if;
  v_mail := public._kirim_email_ke('ebook_aktif', a.email, 'Akses ' || i.judul || ' sudah aktif', v_teks);
  return jsonb_build_object('wa', v_wa is not null, 'email', v_mail is not null);
end $$;
revoke execute on function public._ebook_kabari(public.ebook_akses, text) from public, anon, authenticated;

-- password acak yang mudah dibaca (tanpa 0/O/1/l)
create or replace function public._ebook_sandi_acak()
returns text language sql volatile set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', 1 + (get_byte(b, g) % 55), 1), '')
  from (select extensions.gen_random_bytes(10) b) x, generate_series(0, 9) g
$$;

-- ---------------------------------------------------------------- 5. RPC pembaca
create or replace function public.ebook_minta_akses(p_nama text, p_email text, p_wa text, p_sandi text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.notif_settings;
  v_nama text := btrim(regexp_replace(coalesce(p_nama, ''), '\s+', ' ', 'g'));
  v_email text := public._ebook_rapikan_email(p_email);
  v_wa text := public._rapikan_wa(p_wa);
  a public.ebook_akses;
begin
  select * into s from public.notif_settings where id = 1;
  if length(v_nama) not between 2 and 60 then raise exception 'Nama harus 2 sampai 60 huruf'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 120 then raise exception 'Email tidak valid'; end if;
  if v_wa is null then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if length(coalesce(p_sandi, '')) < 8 or length(p_sandi) > 72 then raise exception 'Password minimal 8 karakter'; end if;
  if (select count(*) from public.ebook_akses where created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Sedang banyak permintaan. Coba lagi beberapa menit lagi.';
  end if;
  select * into a from public.ebook_akses where email = v_email;
  if a.id is not null then
    if a.status = 'aktif' then raise exception 'Email ini sudah punya akses. Silakan masuk.'; end if;
    if a.status in ('ditolak', 'dicabut') then raise exception 'Akses untuk email ini tidak aktif. Hubungi admin IXVII.CO.'; end if;
    -- masih menunggu: perbarui data & password, jangan kirim notifikasi berulang
    update public.ebook_akses set nama = v_nama, wa = v_wa, pass_hash = extensions.crypt(p_sandi, extensions.gen_salt('bf', 10))
    where id = a.id;
    return jsonb_build_object('status', 'menunggu', 'ulang', true);
  end if;
  insert into public.ebook_akses (nama, email, wa, pass_hash)
  values (v_nama, v_email, v_wa, extensions.crypt(p_sandi, extensions.gen_salt('bf', 10)))
  returning * into a;
  perform public._ebook_catat(a.id, 'minta', null);
  perform public._notif_owner('daftar', 'ebook_minta', 'Permintaan akses ebook reseller: ' || a.nama,
    'Nama: ' || a.nama || chr(10) || 'Email: ' || a.email || chr(10) || 'WhatsApp: wa.me/' || a.wa || chr(10)
    || 'Setujui di panel: ' || coalesce(s.site_url, 'https://ixviico.shop') || '/admin/#ebook');
  return jsonb_build_object('status', 'menunggu');
end $$;
grant execute on function public.ebook_minta_akses(text, text, text, text) to anon, authenticated;

create or replace function public.ebook_masuk(p_email text, p_sandi text, p_perangkat text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  i public.ebook_info;
  a public.ebook_akses;
  s public.notif_settings;
  v_email text := public._ebook_rapikan_email(p_email);
  v_maks int;
  v_n int;
  v_token text;
  v_baru boolean := false;
  k jsonb := public._ebook_klien();
begin
  select * into i from public.ebook_info where id = 1;
  select * into s from public.notif_settings where id = 1;
  if coalesce(p_perangkat, '') !~ '^[A-Za-z0-9-]{16,64}$' then raise exception 'Perangkat tidak dikenali. Muat ulang halaman.'; end if;
  if (select count(*) from public.ebook_log where acara = 'gagal' and created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'Terlalu banyak percobaan masuk. Coba lagi beberapa menit lagi.';
  end if;
  select * into a from public.ebook_akses where email = v_email;
  -- kegagalan yang dicatat dikembalikan sebagai {galat}, bukan exception, supaya catatan & hitungan salah password tidak ikut dibatalkan
  if a.id is null then
    perform public._ebook_catat(null, 'gagal', 'email tidak terdaftar');
    return jsonb_build_object('galat', 'Email belum terdaftar. Minta akses dulu.');
  end if;
  if a.kunci_sampai is not null and a.kunci_sampai > now() then
    raise exception 'Terlalu banyak password salah. Coba lagi % menit lagi.', ceil(extract(epoch from a.kunci_sampai - now()) / 60)::int;
  end if;
  if a.pass_hash <> extensions.crypt(coalesce(p_sandi, ''), a.pass_hash) then
    update public.ebook_akses set gagal_masuk = gagal_masuk + 1,
      kunci_sampai = case when gagal_masuk + 1 >= 5 then now() + interval '15 minutes' end
    where id = a.id;
    perform public._ebook_catat(a.id, 'gagal', 'password salah');
    return jsonb_build_object('galat', case when a.gagal_masuk + 1 >= 5 then 'Password salah 5 kali. Coba lagi 15 menit lagi.' else 'Email atau password salah' end);
  end if;
  update public.ebook_akses set gagal_masuk = 0, kunci_sampai = null where id = a.id;
  if a.status = 'menunggu' then raise exception 'Akses kamu masih menunggu persetujuan admin. Kamu akan dikabari lewat WhatsApp.'; end if;
  if a.status <> 'aktif' then raise exception 'Akses untuk akun ini tidak aktif. Hubungi admin IXVII.CO.'; end if;

  v_maks := coalesce(a.maks_perangkat, i.maks_perangkat);
  if not exists (select 1 from public.ebook_perangkat where akses_id = a.id and perangkat = p_perangkat) then
    select count(*) into v_n from public.ebook_perangkat where akses_id = a.id;
    if v_n >= v_maks then
      perform public._ebook_catat(a.id, 'ditolak_perangkat', 'perangkat ke-' || (v_n + 1));
      if (select count(*) from public.ebook_log where akses_id = a.id and acara = 'ditolak_perangkat' and created_at > now() - interval '6 hours') <= 1 then
        perform public._notif_owner('daftar', 'ebook_perangkat', 'Ebook dicoba dibuka di perangkat ke-' || (v_n + 1),
          'Akun: ' || a.nama || ' (' || a.email || ')' || chr(10) || 'WhatsApp: wa.me/' || coalesce(a.wa, '-') || chr(10)
          || 'Perangkat: ' || coalesce(k->>'ua', '-') || chr(10)
          || 'Ditolak otomatis (batas ' || v_maks || ' perangkat). Kalau dia memang ganti HP, reset perangkat di panel: '
          || coalesce(s.site_url, 'https://ixviico.shop') || '/admin/#ebook');
      end if;
      return jsonb_build_object('galat', 'Akun ini sudah dipakai di ' || v_maks || ' perangkat. Kalau kamu ganti HP atau browser, minta admin mereset perangkat.');
    end if;
    insert into public.ebook_perangkat (akses_id, perangkat, ua) values (a.id, p_perangkat, k->>'ua');
    v_baru := true;
  end if;
  update public.ebook_perangkat set terakhir = now(), ua = coalesce(k->>'ua', ua) where akses_id = a.id and perangkat = p_perangkat;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  delete from public.ebook_sesi where kedaluwarsa < now() or (akses_id = a.id and perangkat = p_perangkat);
  insert into public.ebook_sesi (token_hash, akses_id, perangkat) values (encode(extensions.digest(v_token, 'sha256'), 'hex'), a.id, p_perangkat);
  update public.ebook_akses set terakhir_masuk = now() where id = a.id;
  perform public._ebook_catat(a.id, case when v_baru then 'perangkat_baru' else 'masuk' end, null);
  if v_baru then
    perform public._notif_owner('daftar', 'ebook_masuk', 'Ebook dibuka di perangkat baru: ' || a.nama,
      'Akun: ' || a.nama || ' (' || a.email || ')' || chr(10) || 'Perangkat ke-' || (select count(*) from public.ebook_perangkat where akses_id = a.id)
      || ' dari ' || v_maks || chr(10) || 'Perangkat: ' || coalesce(k->>'ua', '-'));
  end if;
  return jsonb_build_object('token', v_token, 'nama', a.nama);
end $$;
grant execute on function public.ebook_masuk(text, text, text) to anon, authenticated;

-- sesi yang sah → baris akses; selain itu galat
create or replace function public._ebook_sesi(p_token text, p_perangkat text)
returns public.ebook_akses
language plpgsql security definer set search_path = '' as $$
declare
  ss public.ebook_sesi;
  a public.ebook_akses;
begin
  if coalesce(p_token, '') !~ '^[0-9a-f]{64}$' then raise exception 'Sesi berakhir. Silakan masuk lagi.'; end if;
  select * into ss from public.ebook_sesi where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if ss.token_hash is null or ss.kedaluwarsa < now() or ss.perangkat <> coalesce(p_perangkat, '') then
    raise exception 'Sesi berakhir. Silakan masuk lagi.';
  end if;
  select * into a from public.ebook_akses where id = ss.akses_id;
  if a.status <> 'aktif' then
    delete from public.ebook_sesi where akses_id = a.id;
    raise exception 'Akses untuk akun ini tidak aktif. Hubungi admin IXVII.CO.';
  end if;
  update public.ebook_sesi set terakhir = now() where token_hash = ss.token_hash and terakhir < now() - interval '5 minutes';
  return a;
end $$;
revoke execute on function public._ebook_sesi(text, text) from public, anon, authenticated;

create or replace function public.ebook_isi(p_token text, p_perangkat text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.ebook_akses := public._ebook_sesi(p_token, p_perangkat);
  i public.ebook_info;
begin
  select * into i from public.ebook_info where id = 1;
  return jsonb_build_object(
    'info', jsonb_build_object('judul', i.judul, 'subjudul', i.subjudul, 'label', i.label),
    'pembaca', jsonb_build_object('id', a.id, 'nama', a.nama, 'email', a.email,
                                  'wa', case when a.wa is not null then left(a.wa, 4) || '••••' || right(a.wa, 3) end),
    'bab', coalesce((select jsonb_agg(jsonb_build_object('slug', b.slug, 'label', b.label, 'judul', b.judul, 'ringkas', b.ringkas,
                                                         'ikon', b.ikon, 'isi', b.isi) order by b.urut, b.id)
                     from public.ebook_bab b where b.tampil), '[]'::jsonb),
    'progres', coalesce((select data from public.ebook_progres where akses_id = a.id), '{}'::jsonb));
end $$;
grant execute on function public.ebook_isi(text, text) to anon, authenticated;

create or replace function public.ebook_simpan_progres(p_token text, p_perangkat text, p_data jsonb)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare a public.ebook_akses := public._ebook_sesi(p_token, p_perangkat);
begin
  if jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) > 6000 then raise exception 'Data progres tidak valid'; end if;
  insert into public.ebook_progres (akses_id, data, updated_at) values (a.id, p_data, now())
  on conflict (akses_id) do update set data = excluded.data, updated_at = now();
  return true;
end $$;
grant execute on function public.ebook_simpan_progres(text, text, jsonb) to anon, authenticated;

create or replace function public.ebook_ganti_sandi(p_token text, p_perangkat text, p_lama text, p_baru text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare a public.ebook_akses := public._ebook_sesi(p_token, p_perangkat);
begin
  if a.pass_hash <> extensions.crypt(coalesce(p_lama, ''), a.pass_hash) then raise exception 'Password lama salah'; end if;
  if length(coalesce(p_baru, '')) < 8 or length(p_baru) > 72 then raise exception 'Password minimal 8 karakter'; end if;
  update public.ebook_akses set pass_hash = extensions.crypt(p_baru, extensions.gen_salt('bf', 10)) where id = a.id;
  -- perangkat lain harus masuk ulang
  delete from public.ebook_sesi where akses_id = a.id and perangkat <> p_perangkat;
  perform public._ebook_catat(a.id, 'ganti_sandi', null);
  return true;
end $$;
grant execute on function public.ebook_ganti_sandi(text, text, text, text) to anon, authenticated;

create or replace function public.ebook_keluar(p_token text)
returns boolean
language sql security definer set search_path = '' as $$
  delete from public.ebook_sesi where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  select true;
$$;
grant execute on function public.ebook_keluar(text) to anon, authenticated;

-- ---------------------------------------------------------------- 6. RPC admin
create or replace function public.ebook_daftar_akses()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare i public.ebook_info;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into i from public.ebook_info where id = 1;
  return jsonb_build_object(
    'maks_perangkat', i.maks_perangkat,
    'akses', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'nama', a.nama, 'email', a.email, 'wa', a.wa, 'status', a.status, 'sumber', a.sumber, 'catatan', a.catatan,
      'booking', a.booking_id, 'dibuat', a.created_at, 'disetujui', a.disetujui_at, 'terakhir', a.terakhir_masuk,
      'maks', coalesce(a.maks_perangkat, i.maks_perangkat), 'terkunci', a.kunci_sampai > now(),
      'perangkat', coalesce((select jsonb_agg(jsonb_build_object('ua', p.ua, 'pertama', p.pertama, 'terakhir', p.terakhir) order by p.pertama)
                             from public.ebook_perangkat p where p.akses_id = a.id), '[]'::jsonb),
      'ditolak_7h', (select count(*) from public.ebook_log l where l.akses_id = a.id and l.acara = 'ditolak_perangkat' and l.created_at > now() - interval '7 days'))
      order by (a.status = 'menunggu') desc, a.created_at desc) from public.ebook_akses a), '[]'::jsonb));
end $$;
revoke execute on function public.ebook_daftar_akses() from public, anon;
grant execute on function public.ebook_daftar_akses() to authenticated;

create or replace function public.ebook_setujui(p_id bigint)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.ebook_akses;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  update public.ebook_akses set status = 'aktif', disetujui_at = coalesce(disetujui_at, now()), gagal_masuk = 0, kunci_sampai = null
  where id = p_id returning * into a;
  if a.id is null then raise exception 'Akses tidak ditemukan'; end if;
  perform public._ebook_catat(a.id, 'disetujui', null);
  return public._ebook_kabari(a, null);
end $$;
revoke execute on function public.ebook_setujui(bigint) from public, anon;
grant execute on function public.ebook_setujui(bigint) to authenticated;

create or replace function public.ebook_tolak(p_id bigint, p_catatan text default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  update public.ebook_akses set status = 'ditolak', catatan = coalesce(nullif(btrim(p_catatan), ''), catatan) where id = p_id;
  delete from public.ebook_sesi where akses_id = p_id;
  perform public._ebook_catat(p_id, 'ditolak', p_catatan);
  return true;
end $$;
revoke execute on function public.ebook_tolak(bigint, text) from public, anon;
grant execute on function public.ebook_tolak(bigint, text) to authenticated;

create or replace function public.ebook_cabut(p_id bigint, p_catatan text default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  update public.ebook_akses set status = 'dicabut', catatan = coalesce(nullif(btrim(p_catatan), ''), catatan) where id = p_id;
  delete from public.ebook_sesi where akses_id = p_id;
  perform public._ebook_catat(p_id, 'dicabut', p_catatan);
  return true;
end $$;
revoke execute on function public.ebook_cabut(bigint, text) from public, anon;
grant execute on function public.ebook_cabut(bigint, text) to authenticated;

create or replace function public.ebook_reset_perangkat(p_id bigint)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  delete from public.ebook_perangkat where akses_id = p_id;
  delete from public.ebook_sesi where akses_id = p_id;
  update public.ebook_akses set gagal_masuk = 0, kunci_sampai = null where id = p_id;
  perform public._ebook_catat(p_id, 'reset_perangkat', null);
  return true;
end $$;
revoke execute on function public.ebook_reset_perangkat(bigint) from public, anon;
grant execute on function public.ebook_reset_perangkat(bigint) to authenticated;

-- password baru acak, dikirim ke WA/email pembeli dan ditampilkan sekali ke admin
create or replace function public.ebook_reset_sandi(p_id bigint)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.ebook_akses;
  v_sandi text := public._ebook_sandi_acak();
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  update public.ebook_akses set pass_hash = extensions.crypt(v_sandi, extensions.gen_salt('bf', 10)), gagal_masuk = 0, kunci_sampai = null
  where id = p_id returning * into a;
  if a.id is null then raise exception 'Akses tidak ditemukan'; end if;
  delete from public.ebook_sesi where akses_id = a.id;
  perform public._ebook_catat(a.id, 'reset_sandi', null);
  return jsonb_build_object('sandi', v_sandi) || case when a.status = 'aktif' then public._ebook_kabari(a, v_sandi) else '{}'::jsonb end;
end $$;
revoke execute on function public.ebook_reset_sandi(bigint) from public, anon;
grant execute on function public.ebook_reset_sandi(bigint) to authenticated;

-- p: { nama, email, wa, booking (opsional), catatan, maks_perangkat (opsional) }
create or replace function public.ebook_beri_akses(p jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_nama text := btrim(regexp_replace(coalesce(p->>'nama', ''), '\s+', ' ', 'g'));
  v_email text := public._ebook_rapikan_email(p->>'email');
  v_wa text := public._rapikan_wa(p->>'wa');
  v_sandi text := public._ebook_sandi_acak();
  a public.ebook_akses;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if length(v_nama) not between 2 and 60 then raise exception 'Nama harus 2 sampai 60 huruf'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email tidak valid'; end if;
  if nullif(p->>'maks_perangkat', '') is not null and (p->>'maks_perangkat')::int not between 1 and 5 then raise exception 'Batas perangkat 1 sampai 5'; end if;
  if exists (select 1 from public.ebook_akses where email = v_email) then
    update public.ebook_akses set nama = v_nama, wa = coalesce(v_wa, wa), status = 'aktif', disetujui_at = coalesce(disetujui_at, now()),
      pass_hash = extensions.crypt(v_sandi, extensions.gen_salt('bf', 10)), gagal_masuk = 0, kunci_sampai = null,
      booking_id = coalesce(nullif(p->>'booking', '')::bigint, booking_id), catatan = coalesce(nullif(btrim(p->>'catatan'), ''), catatan),
      maks_perangkat = coalesce(nullif(p->>'maks_perangkat', '')::int, maks_perangkat)
    where email = v_email returning * into a;
  else
    insert into public.ebook_akses (nama, email, wa, pass_hash, status, sumber, booking_id, catatan, maks_perangkat, disetujui_at)
    values (v_nama, v_email, v_wa, extensions.crypt(v_sandi, extensions.gen_salt('bf', 10)), 'aktif', 'admin',
            nullif(p->>'booking', '')::bigint, nullif(btrim(p->>'catatan'), ''), nullif(p->>'maks_perangkat', '')::int, now())
    returning * into a;
  end if;
  perform public._ebook_catat(a.id, 'diberi_akses', null);
  return jsonb_build_object('id', a.id, 'sandi', v_sandi) || public._ebook_kabari(a, v_sandi);
end $$;
revoke execute on function public.ebook_beri_akses(jsonb) from public, anon;
grant execute on function public.ebook_beri_akses(jsonb) to authenticated;

-- ---------------------------------------------------------------- isi awal ebook (tidak menimpa yang sudah diubah)
insert into public.ebook_bab (slug, label, judul, ringkas, ikon, urut, isi) values
('selamat-datang', '01', 'Selamat Datang di Dunia Reseller', 'Apa itu bisnis reseller aplikasi digital dan apa yang jadi fokusmu.', 'roket', 10, $isi$
Selamat datang.

Kalau kamu sedang membaca ebook ini, berarti kamu sudah mengambil satu langkah untuk mencoba membangun penghasilan dari bisnis reseller aplikasi digital.

Bisnis ini memiliki sistem yang sederhana. Kamu mendapatkan produk dari supplier, menentukan harga jual sendiri, kemudian menawarkan produk tersebut kepada calon pembeli.

:::kartu
Tidak perlu membuat aplikasinya | Produknya sudah ada. Kamu tinggal menawarkannya.
Tidak perlu membangun dari awal | Akses aplikasinya disiapkan oleh supplier.
Fokus kamu | Menemukan pembeli, memberikan pelayanan yang baik, dan mengelola transaksi dengan rapi.
:::

Tentu saja, setiap pekerjaan memiliki tantangan. Kalau ditanya apakah menjadi reseller itu susah atau mudah, jawabannya tergantung cara kamu menjalankannya.

- Ada bagian yang mudah.
- Ada bagian yang membutuhkan ketelitian.
- Ada saat ketika pembeli ramai.
- Ada juga saat ketika tidak ada yang membeli.

Yang penting adalah **konsistensi**.

:::kutipan
Kalau mau mendapatkan hasil dari jualan, kamu harus siap menjalankan proses jualannya.
:::
$isi$),
('cara-kerja', '02', 'Cara Kerja Bisnis Reseller', 'Alur supplier → reseller → pembeli, dan dari mana margin kotor kamu.', 'alur', 20, $isi$
Secara sederhana, alurnya seperti ini:

:::alur
Supplier | Sumber akses aplikasi
Reseller | Kamu, yang menentukan harga jual
Pembeli | Pelanggan yang membayar ke kamu
:::

Contohnya: kamu mendapatkan akses aplikasi dari supplier dengan harga **Rp28.000**, lalu menentukan harga jual menjadi **Rp45.000**.

## Ketika ada pembeli

:::langkah
Pembeli melakukan pembayaran kepada kamu.
Kamu menerima pembayaran.
Kamu melakukan order kepada supplier.
Supplier memproses pesanan.
Kamu memberikan akses kepada pembeli.
Kamu mencatat data transaksi.
Kamu mengaktifkan sistem garansi jika produk menyediakan garansi.
:::

Selisih antara harga jual dan biaya produk menjadi **margin kotor** kamu. Coba ubah angkanya:

:::hitung-hpp hpp=28000 jual=45000
:::

Angka tersebut hanya contoh. Kamu bebas menentukan harga selama tetap masuk akal, kompetitif, dan sesuai dengan ketentuan supplier serta produk yang kamu jual.
$isi$),
('persiapan', '03', 'Persiapan Sebelum Mulai', 'Empat hal yang perlu kamu siapkan sebelum menerima pesanan pertama.', 'tas', 30, $isi$
Sebelum mulai jualan, siapkan beberapa hal.

## 1. Akun Telegram

Telegram akan digunakan untuk berkomunikasi dengan supplier atau mengakses channel supplier yang kamu gunakan.

Beberapa supplier menerima order secara manual. Beberapa lainnya menggunakan bot. Sistem order setiap supplier bisa berbeda.

:::tips
Pelajari cara kerja supplier sebelum menerima banyak pesanan.
:::

## 2. Rekening atau E-Wallet

Siapkan metode pembayaran yang mudah digunakan pelanggan.

:::kartu
Mobile banking | Transfer antarbank yang paling umum.
DANA & GoPay | Praktis untuk pembeli yang terbiasa e-wallet.
QRIS | Satu kode untuk hampir semua aplikasi pembayaran.
Lainnya | Metode pembayaran digital lain yang tersedia.
:::

Semakin mudah pelanggan membayar, semakin sederhana proses transaksi.

## 3. Akun Media Sosial

Kamu bisa menggunakan WhatsApp, Instagram, TikTok, Telegram, atau platform lain yang sesuai.

Tidak harus langsung memiliki semuanya. Mulai dari platform yang paling sering kamu gunakan.

## 4. Template Promosi

Kamu membutuhkan materi visual untuk menawarkan produk. Minimal siapkan:

- Poster harga
- Poster promo
- Story
- Katalog
- Konten edukasi
- Testimoni pelanggan

Dalam program ini, template desain akan diberikan untuk membantu kamu memulai.
$isi$),
('telegram-supplier', '04', 'Telegram dan Supplier', 'Cara memilih supplier yang bisa dipercaya dan dua cara order: manual dan bot.', 'pesawat', 40, $isi$
Telegram menjadi salah satu bagian penting dalam sistem reseller karena banyak supplier produk digital menggunakan Telegram sebagai media komunikasi dan pemesanan.

Di dalam program ini, kamu akan mendapatkan daftar channel supplier yang sudah digunakan dan dianggap terpercaya berdasarkan pengalaman transaksi.

:::peringatan
Jangan menganggap semua channel di Telegram aman. Selalu lakukan pengecekan sebelum melakukan transaksi.
:::

## Yang perlu diperhatikan

:::checklist id=cek-supplier
Reputasi supplier
Respons admin
Sistem garansi
Harga
Ketentuan produk
Cara order
Riwayat transaksi
Kejelasan layanan setelah pembelian
:::

Jika kamu menemukan supplier lain dari TikTok, Instagram, atau platform lain, lakukan pengecekan sendiri sebelum menggunakannya.

**Jangan langsung percaya hanya karena harga murah.**

## Order manual

Order manual berarti kamu melakukan pemesanan langsung kepada admin atau seller. Biasanya format order sudah disediakan. Kamu tinggal mengikuti instruksi yang diberikan supplier.

## Order melalui bot

Beberapa supplier menggunakan bot Telegram. Sistem setiap bot bisa berbeda. Biasanya kamu akan diminta memilih:

:::alur
Produk
Durasi
Paket
Metode pembayaran
Data yang diperlukan
:::

Ikuti instruksi bot dengan teliti. Jangan terburu-buru melakukan pembayaran sebelum memahami produk yang akan dibeli.
$isi$),
('hpp-harga', '05', 'Menentukan HPP dan Harga Jual', 'Apa itu HPP, cara menghitung margin, dan tiga strategi harga.', 'kalkulator', 50, $isi$
Salah satu kemampuan penting dalam bisnis reseller adalah menentukan harga.

## Apa itu HPP?

HPP adalah **Harga Pokok Penjualan**. Sederhananya, HPP adalah biaya yang kamu keluarkan untuk mendapatkan produk yang akan kamu jual.

Supplier menjual sebuah produk dengan harga **Rp28.000**, maka **HPP = Rp28.000**. Kemudian kamu menentukan **harga jual = Rp45.000**.

:::hitung-hpp hpp=28000 jual=45000
:::

## Apakah harus mengambil untung besar?

Tidak. Kamu bisa menentukan margin berdasarkan strategi toko kamu.

:::strategi
Strategi harga murah | 28000 | 35000
Strategi harga menengah | 28000 | 45000
Strategi harga premium | 28000 | 50000
:::

Yang penting, kamu memahami biaya, margin, risiko, dan harga pasar.

:::peringatan
Jangan menentukan harga hanya berdasarkan keinginan.
:::
$isi$),
('materi-promosi', '06', 'Membuat Materi Promosi', 'Isi poster yang wajib ada, struktur poster sederhana, dan contoh poster.', 'megafon', 60, $isi$
Setelah menentukan harga, kamu membutuhkan materi promosi. Poster berfungsi untuk membuat calon pembeli mengetahui:

:::kartu
Produk | Aplikasi apa saja yang tersedia.
Harga & durasi | Berapa harganya dan berapa lama aksesnya.
Keunggulan | Kenapa pembeli perlu produk ini.
Cara order | Langkah memesan dan kontak penjual.
Promo | Promo yang sedang berjalan.
:::

Kamu bisa menggunakan poster untuk Instagram Story, WhatsApp Status, TikTok, Telegram, broadcast, dan personal chat.

## Struktur poster sederhana

:::poster
NAMA APLIKASI
Premium Access
1 Bulan • RpXX.XXX
Fitur premium
Akses sesuai paket
Garansi sesuai ketentuan
ORDER NOW
Contact: @username
:::

Tidak perlu memenuhi poster dengan terlalu banyak tulisan. Buat informasi utama mudah dibaca.

## Contoh poster promo IXVII.CO

![Contoh poster promo aplikasi AI](/assets/ebook/contoh-poster-ai.jpg)
![Contoh poster promo aplikasi streaming](/assets/ebook/contoh-poster-streaming.jpg)
![Contoh poster promo aplikasi editing](/assets/ebook/contoh-poster-editing.jpg)

Perhatikan polanya: satu judul besar, nama paket yang jelas, harga besar, potongan dari harga normal, sisa stok, dan tenggat promo.

## Template desain

Kamu akan mendapatkan template desain yang dapat digunakan untuk memulai jualan. Kamu tinggal mengganti nama aplikasi, harga, durasi, fitur, kontak, dan promo.

Kamu juga bisa menyesuaikan desain dengan identitas toko kamu sendiri.
$isi$),
('katalog-harga', '07', 'Membuat Katalog Harga', 'Katalog supaya pelanggan bisa melihat semua pilihan tanpa bertanya satu per satu.', 'katalog', 70, $isi$
Selain poster, kamu bisa membuat katalog. Katalog berguna ketika produk yang kamu jual sudah banyak.

Daripada pelanggan bertanya:

:::kutipan
Ada aplikasi apa aja?
:::

Kamu bisa langsung mengirimkan katalog. Katalog dapat berisi:

| Produk | Durasi | Harga |
|---|---|---|
| Canva | 1 Bulan | RpXX.XXX |
| CapCut | 1 Bulan | RpXX.XXX |
| Lightroom | 1 Bulan | RpXX.XXX |
| Netflix | 1 Bulan | RpXX.XXX |

Kamu bisa menggunakan platform seperti **Padlet** atau platform katalog digital lainnya.

:::tips
Tujuannya sederhana: buat pelanggan bisa melihat pilihan produk tanpa harus bertanya satu per satu.
:::
$isi$),
('order-pembayaran', '08', 'Sistem Order dan Pembayaran', 'Alur dasar dari pesanan masuk sampai transaksi direkap.', 'dompet', 80, $isi$
Gunakan sistem yang sederhana.

## Alur dasar

:::alur arah=bawah
Pembeli memesan
Kamu konfirmasi produk dan harga
Pembeli melakukan pembayaran
Kamu melakukan order ke supplier
Supplier memproses pesanan
Akses diterima
Akses diberikan kepada pembeli
Data transaksi direkap
:::

Sistem ini membuat kamu tidak perlu membeli stok dalam jumlah besar sebelum mendapatkan pelanggan.

## Contoh

Seorang pelanggan memesan Canva. Harga jual kamu **Rp45.000**.

:::langkah
Pelanggan melakukan pembayaran Rp45.000.
Setelah pembayaran dikonfirmasi, kamu melakukan order kepada supplier sesuai harga HPP.
Setelah akses diterima, kamu memberikan informasi akses kepada pelanggan sesuai prosedur supplier.
Simpan bukti transaksi.
:::
$isi$),
('garansi-rekap', '09', 'Sistem Garansi dan Rekap Pelanggan', 'Data yang perlu dicatat, form aktivasi garansi, dan peluang repeat order.', 'perisai', 90, $isi$
Ini salah satu bagian yang sering dilupakan reseller pemula. Setiap transaksi sebaiknya dicatat.

Kenapa? Karena kamu perlu mengetahui:

:::kartu
Siapa yang membeli | Nama dan nomor yang bisa dihubungi.
Produk & durasi | Apa yang dibeli dan berapa lama.
Kapan membeli | Tanggal beli dan kapan masa akses berakhir.
Device | Perangkat yang digunakan pelanggan.
Status garansi | Aktif atau tidak, sesuai ketentuan supplier.
:::

Dengan data tersebut, kamu bisa mengetahui kapan pelanggan harus melakukan perpanjangan.

## Form aktivasi garansi

Setelah pelanggan berhasil login, kamu dapat meminta data sesuai ketentuan garansi supplier. Contoh format:

:::form
Nama
No. HP Aktif
Aplikasi
Durasi
Tanggal Beli
Device yang Dipakai
Screenshot bukti berhasil login
:::

Data tersebut kemudian kamu rekap. Kamu bisa menggunakan pencatatan manual atau bantuan AI untuk membantu mengelola data.

## Kenapa rekap ini penting?

Misalnya pelanggan membeli akses selama 30 hari:

:::garis-waktu
1 September | Pelanggan membeli akses 30 hari
25 September | Kirim pengingat perpanjangan
1 Oktober | Masa akses berakhir
:::

Ketika pelanggan melaporkan masalah, kamu bisa mengecek data transaksi terlebih dahulu. Kamu juga bisa menghubungi pelanggan ketika masa akses mendekati akhir.

:::tips
Ini membuka peluang untuk mendapatkan **repeat order**.
:::
$isi$),
('cari-pembeli', '10', 'Cara Mendapatkan Pembeli', 'Menawarkan produk lewat WhatsApp, Instagram, dan TikTok secara konsisten.', 'magnet', 100, $isi$
Memiliki produk tidak otomatis membuat produk terjual. Kamu perlu menawarkan produk secara konsisten.

## WhatsApp

Gunakan WhatsApp Status, broadcast kepada kontak yang relevan, personal chat, testimoni, dan promo.

Jangan hanya mengunggah harga. Berikan alasan kenapa produk tersebut berguna. Contoh:

:::kutipan
Butuh Canva Premium untuk desain tugas, konten, atau bisnis? Tersedia paket dengan harga terjangkau. Chat untuk cek stok dan durasi.
:::

## Instagram

Gunakan Story, Feed, Reels, Highlight, testimoni, dan katalog. Buat akun jualan terlihat rapi dan gunakan identitas visual yang konsisten.

## TikTok

TikTok bisa digunakan untuk mendapatkan calon pembeli melalui konten. Contohnya:

:::alur
"3 fitur Canva yang sering tidak diketahui pemula." | Konten edukasi
"Kalau kamu membutuhkan akses premium, cek katalog di bio." | Ajakan di akhir konten
:::

Dengan cara ini, kamu tidak hanya mengandalkan posting harga.
$isi$),
('platform', '11', 'Platform yang Bisa Digunakan', 'Kegunaan tiap platform dan aturan yang perlu kamu hormati.', 'perangkat', 110, $isi$
Kamu dapat menggunakan beberapa platform:

:::kartu
WhatsApp | Cocok untuk komunikasi langsung dan repeat order.
Instagram | Cocok untuk membangun branding dan menampilkan katalog.
TikTok | Cocok untuk menjangkau calon pembeli melalui konten.
Telegram | Cocok untuk komunikasi dengan supplier dan komunitas.
:::

## Tentang platform dan kebijakan

Setiap platform memiliki aturan mengenai produk digital dan penjualan layanan.

:::peringatan
Pastikan produk yang kamu jual memiliki hak distribusi atau izin yang sesuai. Jangan menggunakan metode yang bertujuan menghindari sistem keamanan atau moderasi platform.
:::

Jika sebuah produk atau supplier memiliki risiko pelanggaran kebijakan, pertimbangkan kembali sebelum menjualnya. Fokus pada supplier dan produk yang jelas legalitas serta ketentuan penggunaannya.
$isi$),
('alur-penjualan', '12', 'Alur Penjualan dari Awal sampai Selesai', 'SOP 14 langkah yang bisa kamu ikuti setiap ada pesanan.', 'rute', 120, $isi$
Gunakan alur berikut sebagai SOP sederhana. Tandai tiap langkah saat kamu mempraktikkannya.

:::sop id=sop-jualan
Upload poster atau konten.
Calon pembeli menghubungi kamu.
Tanyakan produk dan durasi yang diinginkan.
Berikan harga.
Konfirmasi pesanan.
Kirim metode pembayaran.
Pastikan pembayaran masuk.
Order produk kepada supplier.
Tunggu proses supplier.
Berikan akses kepada pelanggan.
Minta bukti login jika diperlukan untuk aktivasi garansi.
Masukkan data pelanggan ke rekap.
Catat tanggal berakhirnya akses.
Follow up pelanggan ketika waktunya tepat.
:::
$isi$),
('tantangan', '13', 'Tantangan Menjadi Reseller', 'Lima hal yang pasti kamu hadapi dan cara menyikapinya.', 'gunung', 130, $isi$
Jangan masuk ke bisnis ini dengan ekspektasi bahwa setiap hari pasti mendapatkan order. Ada beberapa hal yang perlu kamu hadapi.

## 1. Tidak langsung mendapatkan pembeli

Ini normal. Kamu perlu membangun kepercayaan.

## 2. Harus konsisten membuat konten

Kalau kamu berhenti menawarkan produk, kemungkinan orang mengetahui toko kamu juga berkurang.

## 3. Harus teliti

Kesalahan kecil saat order bisa menyebabkan masalah. Periksa:

:::checklist id=cek-order
Produk
Durasi
Email atau data pelanggan
Harga
Metode pembayaran
:::

## 4. Harus mampu menghadapi komplain

Tidak semua pelanggan akan berjalan mulus. Tetap gunakan komunikasi yang jelas.

## 5. Harus belajar

Supplier bisa berubah. Harga bisa berubah. Platform bisa berubah. Tren juga berubah.

:::kutipan
Karena itu, jangan berhenti belajar.
:::
$isi$),
('yang-didapat', '14', 'Apa yang Kamu Dapatkan dari Program Ini', 'Sebelas hal yang kamu dapatkan, termasuk pendampingan face to face.', 'hadiah', 140, $isi$
Program reseller ini dirancang agar kamu tidak memulai semuanya sendirian. Dalam program ini, kamu akan mendapatkan:

:::kartu
01. Panduan Membuat HPP | Belajar menentukan HPP dan menghitung margin jualan.
02. Akses Informasi Supplier | Daftar channel supplier yang digunakan dalam sistem.
03. Panduan Sistem Jual Beli | Alur dari pelanggan melakukan order sampai produk diterima.
04. Template Desain Poster | Template untuk membantu membuat materi promosi.
05. Bonus Canva Head 2 Bulan | Bonus untuk membantu kamu memulai proses desain dan promosi.
06. Contoh Poster | Contoh materi promosi yang sudah digunakan.
07. Strategi Mendapatkan Pembeli | Cara menawarkan produk lewat media sosial dan komunikasi langsung.
08. Contoh Katalog Padlet | Contoh sistem katalog untuk menampilkan produk dan harga.
09. Contoh Sistem Pembayaran | Contoh penggunaan QRIS atau alternatif seperti GoPay Merchant.
10. Form Garansi | Contoh format pengumpulan data pelanggan dan cara menggunakannya.
11. Pendampingan Face to Face | Praktik langsung bersama IXVII.CO, bukan hanya membaca teori.
:::

Bagian penting dari program ini adalah praktik langsung. Materi seperti HPP, template, cara penggunaan, contoh transaksi, sistem katalog, dan sistem garansi akan dijelaskan secara langsung agar kamu tidak hanya membaca teori.
$isi$),
('checklist', '15', 'Checklist Memulai Jualan', 'Centang satu per satu. Progresmu tersimpan di akunmu.', 'centang', 150, $isi$
Sebelum mulai menawarkan produk, pastikan kamu sudah memiliki:

:::checklist id=mulai-jualan
Akun Telegram
Supplier yang jelas dan terpercaya
Mobile banking atau e-wallet
QRIS atau metode pembayaran
Nama toko
Identitas visual toko
Harga jual
Poster
Katalog
Template promosi
Form garansi
Rekap pelanggan
Sistem pencatatan transaksi
Akun WhatsApp/Instagram/TikTok
Strategi mendapatkan pembeli
:::

Kalau semuanya sudah siap, kamu sudah bisa mulai.
$isi$),
('bonus-keuntungan', 'Bonus', 'Formula Sederhana Menghitung Keuntungan', 'Hitung margin kotor harian, mingguan, dan bulanan dari jumlah order.', 'koin', 160, $isi$
Gunakan rumus:

:::kutipan
Harga Jual − HPP = Margin Kotor
:::

Contoh: harga jual **Rp45.000**, HPP **Rp28.000**, maka margin **Rp17.000**.

Geser jumlah order per hari untuk melihat perkiraannya:

:::simulasi margin=17000
:::

:::catatan
Angka tersebut merupakan contoh perhitungan margin kotor. Biaya pembayaran, refund, promo, komplain, atau biaya operasional lain perlu diperhitungkan jika ada.
:::
$isi$),
('mindset', 'Mindset', 'Mindset Reseller', 'Ubah cara berpikir, lalu jalankan empat kebiasaan kecil setiap hari.', 'lampu', 170, $isi$
Jangan berpikir:

:::kutipan
"Saya sudah punya produk. Kenapa tidak ada yang beli?"
:::

Ubah menjadi:

:::kutipan
"Apa yang bisa saya lakukan hari ini agar lebih banyak orang mengetahui produk saya?"
:::

Coba lakukan setiap hari:

:::checklist id=harian harian=ya
1 konten
1 promosi
1 follow up
1 evaluasi
:::

Tidak perlu menunggu semuanya sempurna untuk mulai. Mulai dari sistem sederhana, kemudian perbaiki berdasarkan pengalaman.
$isi$),
('penutup', 'Penutup', 'Penutup', 'Bangun sistemnya, dapatkan pembeli pertama, lalu ulangi.', 'bendera', 180, $isi$
Bisnis reseller terlihat sederhana karena sistem dasarnya memang sederhana. Namun, hasilnya tetap bergantung pada cara kamu menjalankannya.

- Kamu perlu belajar menjual.
- Kamu perlu belajar berkomunikasi.
- Kamu perlu belajar membuat konten.
- Kamu perlu belajar mengelola pelanggan.
- Kamu juga perlu belajar mencatat transaksi.

Jangan mengejar hasil besar di hari pertama.

:::alur arah=bawah
Bangun sistemnya terlebih dahulu
Dapatkan pembeli pertama
Layani dengan baik
Minta feedback
Bangun kepercayaan
Kemudian ulangi prosesnya
:::

**Selamat memulai perjalananmu sebagai reseller.**

:::kutipan
Build the system. Find the customers. Make the sale. Keep improving.
:::
$isi$)
on conflict (slug) do nothing;
