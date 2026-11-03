-- ============================================================================
-- Produk Digital, rak ebook, hitung mundur promo, dan iklan produk mitra
--   1. promos/bundles.hitung_mundur : hitung mundur bisa dinyalakan per promo & per bundle
--   2. Ebook jadi banyak buku       : ebook_buku, ebook_hak (buku milik tiap pembaca), progres per buku, rak ebook
--   3. produk (+ rahasia, ulasan)   : produk digital (ebook, template, preset, kelas, lainnya) dengan promo & hitung mundur
--   4. pesan_produk()               : pesan produk; setelah dibayar, ebook masuk rak / tautan dikirim otomatis
--   5. ulas_produk()                : ulasan hanya dari pembeli (kode pesanan + nomor WA)
--   6. Iklan mitra                  : orang lain mengajukan iklan produk digitalnya, admin menyetujui & menentukan masa tayang
--   7. laku_varian()                : data penjualan untuk saran bundle di panel admin
-- Jalankan di SQL Editor Supabase SETELAH migration ebook_reseller. Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------- 1. hitung mundur
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'promos' and column_name = 'hitung_mundur') then
    alter table public.promos add column hitung_mundur boolean not null default false;
    -- kampanye dari generator poster sudah memakai hitung mundur
    update public.promos p set hitung_mundur = true where exists (select 1 from public.bundles b where b.promo_id = p.id);
  end if;
end $$;
-- promo/kampanye baru memakai hitung mundur kecuali dimatikan admin (promo lama tetap seperti sebelumnya)
alter table public.promos alter column hitung_mundur set default true;
alter table public.bundles add column if not exists hitung_mundur boolean not null default false;

create or replace function public.promo_json()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'promos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'title_en', p.title_en, 'body', p.body,
                                          'body_en', p.body_en, 'banner', p.banner_url, 'link', p.link_url, 'ends', p.ends_on,
                                          'lencana', p.lencana, 'warna', p.warna, 'hitung', p.hitung_mundur,
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
          'banner', b.banner_url, 'ends', least(b.ends_on, max(p.ends_on)), 'kampanye', b.promo_id, 'hitung', b.hitung_mundur,
          'kelompok', coalesce(b.kelompok, max(p.kelompok), mode() within group (order by public.kelompok_kategori(c.label)), 'lainnya'),
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
        having bool_and(v.is_active and a.is_active)
      ) x), '[]'::jsonb),
    'rules', coalesce((select jsonb_agg(jsonb_build_object('min', r.min_apps, 'pct', r.discount_pct) order by r.min_apps)
                       from public.bundle_rules r), '[]'::jsonb),
    'durasi', coalesce((select jsonb_agg(jsonb_build_object('hari', d.min_days, 'pct', d.extra_pct) order by d.min_days)
                        from public.bundle_duration_rules d), '[]'::jsonb))
$$;
grant execute on function public.promo_json() to anon, authenticated;

-- ---------------------------------------------------------------- 2. banyak ebook
create table if not exists public.ebook_buku (
  id             bigint generated always as identity primary key,
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  judul          text not null check (length(judul) between 2 and 120),
  subjudul       text check (subjudul is null or length(subjudul) <= 200),
  label          text check (label is null or length(label) <= 80),
  warna          text check (warna is null or warna ~ '^#[0-9a-fA-F]{6}$'),
  sampul_url     text,
  minta_akses    boolean not null default false,     -- boleh diminta lewat formulir (khusus panduan reseller)
  tampil         boolean not null default true,
  urut           int not null default 0,
  updated_at     timestamptz not null default now()
);
alter table public.ebook_buku enable row level security;
drop policy if exists admin_semua on public.ebook_buku;
create policy admin_semua on public.ebook_buku for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.ebook_buku from anon;

insert into public.ebook_buku (slug, judul, subjudul, label, warna, sampul_url, minta_akses, urut)
select 'panduan-reseller', i.judul, i.subjudul, i.label, '#800203', '/assets/produk/panduan-reseller.jpg', true, 0
from public.ebook_info i where i.id = 1
on conflict (slug) do nothing;

create or replace function public._ebook_buku_utama()
returns bigint language sql stable set search_path = '' as $$
  select id from public.ebook_buku where slug = 'panduan-reseller'
$$;
alter table public.ebook_bab add column if not exists buku_id bigint references public.ebook_buku(id) on delete cascade;
update public.ebook_bab set buku_id = public._ebook_buku_utama() where buku_id is null;
alter table public.ebook_bab alter column buku_id set default public._ebook_buku_utama();
alter table public.ebook_bab alter column buku_id set not null;
alter table public.ebook_bab drop constraint if exists ebook_bab_slug_key;
create unique index if not exists ebook_bab_buku_slug on public.ebook_bab (buku_id, slug);

create table if not exists public.ebook_hak (
  akses_id   bigint not null references public.ebook_akses(id) on delete cascade,
  buku_id    bigint not null references public.ebook_buku(id) on delete cascade,
  sumber     text not null default 'admin' check (sumber in ('minta', 'admin', 'pesanan')),
  order_id   bigint references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (akses_id, buku_id)
);
alter table public.ebook_hak enable row level security;
revoke all on public.ebook_hak from anon, authenticated;
insert into public.ebook_hak (akses_id, buku_id, sumber)
select a.id, public._ebook_buku_utama(), case when a.sumber = 'admin' then 'admin' else 'minta' end
from public.ebook_akses a where a.status = 'aktif'
on conflict do nothing;

-- progres disimpan per buku: { "<slug buku>": { bab, dibaca, cek } }
alter table public.ebook_progres drop constraint if exists ebook_progres_data_check;
alter table public.ebook_progres add constraint ebook_progres_data_check check (pg_column_size(data) <= 30000);
update public.ebook_progres set data = jsonb_build_object('panduan-reseller', data)
where (data ? 'dibaca' or data ? 'cek' or data ? 'bab') and not data ? 'panduan-reseller';

-- kabar ke pembaca: akses aktif + daftar ebook di raknya
create or replace function public._ebook_kabari(a public.ebook_akses, p_sandi text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.notif_settings;
  i public.ebook_info;
  v_rak text;
  v_teks text;
  v_wa bigint;
  v_mail bigint;
begin
  select * into s from public.notif_settings where id = 1;
  select * into i from public.ebook_info where id = 1;
  select string_agg('• ' || b.judul, chr(10) order by h.created_at) into v_rak
  from public.ebook_hak h join public.ebook_buku b on b.id = h.buku_id where h.akses_id = a.id;
  v_teks := 'Halo ' || a.nama || '! Ebook kamu di IXVII.CO sudah bisa dibaca.' || chr(10) || chr(10)
    || coalesce(v_rak || chr(10) || chr(10), '')
    || 'Buka: ' || coalesce(s.site_url, 'https://ixviico.shop') || '/ebook/' || chr(10)
    || 'Email: ' || a.email || chr(10)
    || case when p_sandi is not null then 'Password: ' || p_sandi || chr(10) || '(Simpan baik-baik. Bisa diganti setelah masuk.)'
            else 'Password: yang sudah kamu pakai sebelumnya.' end || chr(10) || chr(10)
    || 'Ebook ini khusus untukmu: bisa dibuka di maksimal ' || coalesce(a.maks_perangkat, i.maks_perangkat) || ' perangkat, '
    || 'tidak bisa diunduh, dan tidak boleh disebarkan atau dijual kembali.' || chr(10)
    || 'Selamat belajar! — IXVII.CO';
  if a.wa is not null then v_wa := public._kirim_wa('ebook_aktif', a.wa, v_teks); end if;
  v_mail := public._kirim_email_ke('ebook_aktif', a.email, 'Ebook IXVII.CO kamu sudah bisa dibaca', v_teks);
  return jsonb_build_object('wa', v_wa is not null, 'email', v_mail is not null);
end $$;
revoke execute on function public._ebook_kabari(public.ebook_akses, text) from public, anon, authenticated;

-- beri satu buku ke email (akun dibuat kalau belum ada). Mengembalikan {akses, sandi (kalau akun baru), baru}
create or replace function public._ebook_beri_buku(p_nama text, p_email text, p_wa text, p_buku bigint, p_sumber text, p_order bigint)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.ebook_akses;
  v_email text := public._ebook_rapikan_email(p_email);
  v_sandi text;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email pembeli tidak valid'; end if;
  select * into a from public.ebook_akses where email = v_email;
  if a.id is null then
    v_sandi := public._ebook_sandi_acak();
    insert into public.ebook_akses (nama, email, wa, pass_hash, status, sumber, disetujui_at)
    values (left(coalesce(nullif(btrim(p_nama), ''), split_part(v_email, '@', 1)), 60), v_email, public._rapikan_wa(p_wa),
            extensions.crypt(v_sandi, extensions.gen_salt('bf', 10)), 'aktif', 'admin', now())
    returning * into a;
  elsif a.status in ('menunggu', 'ditolak') then
    -- pembeli yang belum disetujui: aktifkan dengan password baru (password lama tidak diketahui admin)
    v_sandi := public._ebook_sandi_acak();
    update public.ebook_akses set status = 'aktif', disetujui_at = coalesce(disetujui_at, now()),
      pass_hash = extensions.crypt(v_sandi, extensions.gen_salt('bf', 10)), wa = coalesce(wa, public._rapikan_wa(p_wa))
    where id = a.id returning * into a;
  end if;
  insert into public.ebook_hak (akses_id, buku_id, sumber, order_id) values (a.id, p_buku, p_sumber, p_order)
  on conflict (akses_id, buku_id) do nothing;
  perform public._ebook_catat(a.id, 'diberi_buku', (select slug from public.ebook_buku where id = p_buku));
  return jsonb_build_object('akses', a.id, 'sandi', v_sandi, 'baru', v_sandi is not null, 'dicabut', a.status = 'dicabut');
end $$;
revoke execute on function public._ebook_beri_buku(text, text, text, bigint, text, bigint) from public, anon, authenticated;

drop function if exists public.ebook_isi(text, text);
create or replace function public.ebook_isi(p_token text, p_perangkat text, p_buku text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.ebook_akses := public._ebook_sesi(p_token, p_perangkat);
  b public.ebook_buku;
  v_prog jsonb;
  v_rak jsonb;
begin
  select coalesce(data, '{}'::jsonb) into v_prog from public.ebook_progres where akses_id = a.id;
  v_prog := coalesce(v_prog, '{}'::jsonb);
  select coalesce(jsonb_agg(jsonb_build_object('slug', k.slug, 'judul', k.judul, 'subjudul', k.subjudul, 'label', k.label,
                                               'warna', k.warna, 'sampul', k.sampul_url,
                                               'bab', (select count(*) from public.ebook_bab x where x.buku_id = k.id and x.tampil),
                                               'dibaca', coalesce(jsonb_array_length(v_prog->k.slug->'dibaca'), 0))
                            order by k.urut, h.created_at), '[]'::jsonb)
    into v_rak
  from public.ebook_hak h join public.ebook_buku k on k.id = h.buku_id
  where h.akses_id = a.id and k.tampil;
  if p_buku is null then
    return jsonb_build_object('pembaca', jsonb_build_object('id', a.id, 'nama', a.nama, 'email', a.email,
                                                            'wa', case when a.wa is not null then left(a.wa, 4) || '••••' || right(a.wa, 3) end),
                              'rak', v_rak);
  end if;
  select k.* into b from public.ebook_buku k join public.ebook_hak h on h.buku_id = k.id and h.akses_id = a.id
  where k.slug = p_buku and k.tampil;
  if b.id is null then raise exception 'Ebook ini belum ada di rakmu'; end if;
  return jsonb_build_object(
    'info', jsonb_build_object('slug', b.slug, 'judul', b.judul, 'subjudul', b.subjudul, 'label', b.label, 'warna', b.warna, 'sampul', b.sampul_url),
    'pembaca', jsonb_build_object('id', a.id, 'nama', a.nama, 'email', a.email,
                                  'wa', case when a.wa is not null then left(a.wa, 4) || '••••' || right(a.wa, 3) end),
    'bab', coalesce((select jsonb_agg(jsonb_build_object('slug', x.slug, 'label', x.label, 'judul', x.judul, 'ringkas', x.ringkas,
                                                         'ikon', x.ikon, 'isi', x.isi) order by x.urut, x.id)
                     from public.ebook_bab x where x.buku_id = b.id and x.tampil), '[]'::jsonb),
    'progres', coalesce(v_prog->b.slug, '{}'::jsonb),
    'rak', v_rak);
end $$;
grant execute on function public.ebook_isi(text, text, text) to anon, authenticated;

drop function if exists public.ebook_simpan_progres(text, text, jsonb);
create or replace function public.ebook_simpan_progres(p_token text, p_perangkat text, p_data jsonb, p_buku text default 'panduan-reseller')
returns boolean
language plpgsql security definer set search_path = '' as $$
declare a public.ebook_akses := public._ebook_sesi(p_token, p_perangkat);
begin
  if jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) > 6000 then raise exception 'Data progres tidak valid'; end if;
  if not exists (select 1 from public.ebook_hak h join public.ebook_buku k on k.id = h.buku_id where h.akses_id = a.id and k.slug = p_buku) then
    raise exception 'Ebook ini belum ada di rakmu';
  end if;
  insert into public.ebook_progres (akses_id, data, updated_at) values (a.id, jsonb_build_object(p_buku, p_data), now())
  on conflict (akses_id) do update set data = public.ebook_progres.data || jsonb_build_object(p_buku, p_data), updated_at = now();
  return true;
end $$;
grant execute on function public.ebook_simpan_progres(text, text, jsonb, text) to anon, authenticated;

-- disetujui (permintaan dari halaman ebook) → dapat buku panduan reseller
create or replace function public.ebook_setujui(p_id bigint)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.ebook_akses;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  update public.ebook_akses set status = 'aktif', disetujui_at = coalesce(disetujui_at, now()), gagal_masuk = 0, kunci_sampai = null
  where id = p_id returning * into a;
  if a.id is null then raise exception 'Akses tidak ditemukan'; end if;
  insert into public.ebook_hak (akses_id, buku_id, sumber)
  select a.id, k.id, 'minta' from public.ebook_buku k where k.minta_akses
  on conflict do nothing;
  perform public._ebook_catat(a.id, 'disetujui', null);
  return public._ebook_kabari(a, null);
end $$;

-- p: { nama, email, wa, buku (slug, default panduan-reseller), booking, catatan, maks_perangkat, reset_sandi }
drop function if exists public.ebook_beri_akses(jsonb);
create or replace function public.ebook_beri_akses(p jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_nama text := btrim(regexp_replace(coalesce(p->>'nama', ''), '\s+', ' ', 'g'));
  v_buku public.ebook_buku;
  r jsonb;
  a public.ebook_akses;
  v_sandi text;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if length(v_nama) not between 2 and 60 then raise exception 'Nama harus 2 sampai 60 huruf'; end if;
  if nullif(p->>'maks_perangkat', '') is not null and (p->>'maks_perangkat')::int not between 1 and 5 then raise exception 'Batas perangkat 1 sampai 5'; end if;
  select * into v_buku from public.ebook_buku where slug = coalesce(nullif(p->>'buku', ''), 'panduan-reseller');
  if v_buku.id is null then raise exception 'Ebook tidak ditemukan'; end if;
  r := public._ebook_beri_buku(v_nama, p->>'email', p->>'wa', v_buku.id, 'admin', null);
  v_sandi := r->>'sandi';
  if v_sandi is null and coalesce((p->>'reset_sandi')::boolean, false) then
    v_sandi := public._ebook_sandi_acak();
    update public.ebook_akses set pass_hash = extensions.crypt(v_sandi, extensions.gen_salt('bf', 10)), gagal_masuk = 0, kunci_sampai = null
    where id = (r->>'akses')::bigint;
  end if;
  update public.ebook_akses set
    nama = v_nama, wa = coalesce(public._rapikan_wa(p->>'wa'), wa), status = case when status = 'dicabut' then 'aktif' else status end,
    booking_id = coalesce(nullif(p->>'booking', '')::bigint, booking_id), catatan = coalesce(nullif(btrim(p->>'catatan'), ''), catatan),
    maks_perangkat = coalesce(nullif(p->>'maks_perangkat', '')::int, maks_perangkat)
  where id = (r->>'akses')::bigint returning * into a;
  perform public._ebook_catat(a.id, 'diberi_akses', v_buku.slug);
  return jsonb_build_object('id', a.id, 'sandi', v_sandi, 'baru', (r->>'baru')::boolean, 'buku', v_buku.judul) || public._ebook_kabari(a, v_sandi);
end $$;
revoke execute on function public.ebook_beri_akses(jsonb) from public, anon;
grant execute on function public.ebook_beri_akses(jsonb) to authenticated;

create or replace function public.ebook_cabut_buku(p_akses bigint, p_buku text)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  delete from public.ebook_hak h using public.ebook_buku k where h.buku_id = k.id and h.akses_id = p_akses and k.slug = p_buku;
  perform public._ebook_catat(p_akses, 'buku_dicabut', p_buku);
  return true;
end $$;
revoke execute on function public.ebook_cabut_buku(bigint, text) from public, anon;
grant execute on function public.ebook_cabut_buku(bigint, text) to authenticated;

create or replace function public.ebook_daftar_akses()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare i public.ebook_info;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into i from public.ebook_info where id = 1;
  return jsonb_build_object(
    'maks_perangkat', i.maks_perangkat,
    'buku', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'slug', k.slug, 'judul', k.judul, 'tampil', k.tampil,
                                                          'pembaca', (select count(*) from public.ebook_hak h where h.buku_id = k.id)) order by k.urut, k.id)
                      from public.ebook_buku k), '[]'::jsonb),
    'akses', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'nama', a.nama, 'email', a.email, 'wa', a.wa, 'status', a.status, 'sumber', a.sumber, 'catatan', a.catatan,
      'booking', a.booking_id, 'dibuat', a.created_at, 'disetujui', a.disetujui_at, 'terakhir', a.terakhir_masuk,
      'maks', coalesce(a.maks_perangkat, i.maks_perangkat), 'terkunci', a.kunci_sampai > now(),
      'buku', coalesce((select jsonb_agg(jsonb_build_object('slug', k.slug, 'judul', k.judul, 'sumber', h.sumber) order by h.created_at)
                        from public.ebook_hak h join public.ebook_buku k on k.id = h.buku_id where h.akses_id = a.id), '[]'::jsonb),
      'perangkat', coalesce((select jsonb_agg(jsonb_build_object('ua', p.ua, 'pertama', p.pertama, 'terakhir', p.terakhir) order by p.pertama)
                             from public.ebook_perangkat p where p.akses_id = a.id), '[]'::jsonb),
      'ditolak_7h', (select count(*) from public.ebook_log l where l.akses_id = a.id and l.acara = 'ditolak_perangkat' and l.created_at > now() - interval '7 days'))
      order by (a.status = 'menunggu') desc, a.created_at desc) from public.ebook_akses a), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- 3. produk digital
create table if not exists public.produk (
  id            bigint generated always as identity primary key,
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 80),
  nama          text not null check (length(nama) between 3 and 120),
  subjudul      text check (subjudul is null or length(subjudul) <= 200),
  kategori      text not null default 'ebook' check (kategori in ('ebook', 'template', 'preset', 'kelas', 'lainnya')),
  cover_url     text,
  deskripsi     text check (deskripsi is null or length(deskripsi) <= 20000),
  isi           text check (isi is null or length(isi) <= 3000),               -- yang didapat, satu baris satu poin
  format        text check (format is null or length(format) <= 80),           -- mis. "Ebook interaktif · 8 bab"
  harga         int not null default 0 check (harga between 0 and 100000000),
  harga_promo   int check (harga_promo is null or harga_promo >= 0),
  promo_mulai   timestamptz,
  promo_sampai  timestamptz,
  label_promo   text check (label_promo is null or length(label_promo) <= 40),
  hitung_mundur boolean not null default true,
  hpp           int check (hpp is null or hpp >= 0),
  terjual_luar  int not null default 0 check (terjual_luar >= 0),             -- penjualan asli di luar website
  tipe_kirim    text not null default 'manual' check (tipe_kirim in ('ebook', 'tautan', 'manual', 'luar')),
  buku_id       bigint references public.ebook_buku(id) on delete set null,
  tautan_beli   text check (tautan_beli is null or tautan_beli ~ '^(https://|/)'),
  pemilik       text not null default 'ixvii' check (pemilik in ('ixvii', 'mitra')),
  penjual_nama  text check (penjual_nama is null or length(penjual_nama) <= 60),
  penjual_wa    text,
  penjual_email text,
  paket_iklan   text,
  iklan_sampai  date,
  catatan_admin text,
  status        text not null default 'draf' check (status in ('draf', 'tayang', 'menunggu', 'ditolak', 'berakhir')),
  unggulan      boolean not null default false,
  urut          int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (promo_mulai is null or promo_sampai is null or promo_sampai > promo_mulai)
);
create index if not exists produk_tayang on public.produk (status, kategori, urut);

-- tautan unduhan / pesan pengiriman: hanya admin & sistem
create table if not exists public.produk_rahasia (
  produk_id  bigint primary key references public.produk(id) on delete cascade,
  tautan     text check (tautan is null or tautan ~ '^https://'),
  pesan      text check (pesan is null or length(pesan) <= 1500),
  updated_at timestamptz not null default now()
);
create table if not exists public.produk_ulasan (
  id         bigint generated always as identity primary key,
  produk_id  bigint not null references public.produk(id) on delete cascade,
  order_id   bigint references public.orders(id) on delete set null,
  nama       text not null check (length(nama) between 1 and 60),
  bintang    int not null check (bintang between 1 and 5),
  teks       text check (teks is null or length(teks) <= 600),
  sumber     text not null default 'pembeli' check (sumber in ('pembeli', 'luar')),
  tampil     boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists produk_ulasan_satu on public.produk_ulasan (produk_id, order_id) where order_id is not null;

create table if not exists public.iklan_paket (
  id     bigint generated always as identity primary key,
  nama   text not null check (length(nama) between 2 and 60),
  hari   int not null check (hari between 1 and 365),
  harga  int not null check (harga >= 0),
  aktif  boolean not null default true,
  urut   int not null default 0
);
insert into public.iklan_paket (nama, hari, harga, urut)
select * from (values ('Tayang 7 hari', 7, 15000, 1), ('Tayang 14 hari', 14, 25000, 2), ('Tayang 30 hari', 30, 45000, 3)) v(n, h, p, u)
where not exists (select 1 from public.iklan_paket);
create table if not exists public.iklan_setelan (
  id      int primary key default 1 check (id = 1),
  aktif   boolean not null default true,
  syarat  text not null default $s$Produk harus milikmu sendiri atau kamu punya izin menjualnya.
Tidak menerima produk bajakan, akun curian, konten dewasa, judi, investasi bodong, atau yang melanggar hukum.
Pembayaran produk terjadi langsung antara pembeli dan penjual. IXVII.CO hanya menayangkan iklan dan tidak menjamin produk mitra.
Iklan diperiksa admin sebelum tayang. Biaya tayang dibayar setelah iklan disetujui dan tidak dikembalikan kalau iklan diturunkan karena melanggar.$s$
);
insert into public.iklan_setelan (id) values (1) on conflict (id) do nothing;

alter table public.produk         enable row level security;
alter table public.produk_rahasia enable row level security;
alter table public.produk_ulasan  enable row level security;
alter table public.iklan_paket    enable row level security;
alter table public.iklan_setelan  enable row level security;
do $$
declare t text;
begin
  foreach t in array array['produk', 'produk_rahasia', 'produk_ulasan', 'iklan_paket', 'iklan_setelan'] loop
    execute format('drop policy if exists admin_semua on public.%I', t);
    execute format('create policy admin_semua on public.%I for all to authenticated
                    using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;
drop policy if exists publik_baca on public.iklan_paket;
create policy publik_baca on public.iklan_paket for select to anon, authenticated using (aktif or (select public.is_admin()));
drop policy if exists publik_baca on public.iklan_setelan;
create policy publik_baca on public.iklan_setelan for select to anon, authenticated using (true);
revoke all on public.produk, public.produk_rahasia, public.produk_ulasan from anon;

-- sampul produk (publik, hanya admin yang mengunggah)
insert into storage.buckets (id, name, public) values ('produk', 'produk', true) on conflict (id) do nothing;
drop policy if exists produk_admin_tambah on storage.objects;
drop policy if exists produk_admin_ubah on storage.objects;
drop policy if exists produk_admin_hapus on storage.objects;
create policy produk_admin_tambah on storage.objects for insert to authenticated with check (bucket_id = 'produk' and (select public.is_admin()));
create policy produk_admin_ubah on storage.objects for update to authenticated
  using (bucket_id = 'produk' and (select public.is_admin())) with check (bucket_id = 'produk' and (select public.is_admin()));
create policy produk_admin_hapus on storage.objects for delete to authenticated using (bucket_id = 'produk' and (select public.is_admin()));

-- pesanan produk
alter table public.orders drop constraint if exists orders_kind_check;
alter table public.orders add constraint orders_kind_check check (kind in ('satuan', 'rakit', 'bundle', 'produk'));
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists produk_terkirim boolean not null default false;
alter table public.order_items add column if not exists produk_id bigint references public.produk(id) on delete set null;

-- harga yang berlaku sekarang
create or replace function public._produk_promo_aktif(p public.produk)
returns boolean language sql stable set search_path = '' as $$
  select p.harga_promo is not null and p.harga_promo < p.harga
     and (p.promo_mulai is null or p.promo_mulai <= now()) and (p.promo_sampai is null or p.promo_sampai > now())
$$;
create or replace function public._produk_terlihat(p public.produk)
returns boolean language sql stable set search_path = '' as $$
  select p.status = 'tayang' and (p.pemilik = 'ixvii' or (p.iklan_sampai is not null and p.iklan_sampai >= public.hari_ini_wib()))
$$;

create or replace function public._produk_kartu(p public.produk)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', p.slug, 'nama', p.nama, 'sub', p.subjudul, 'kategori', p.kategori, 'cover', p.cover_url, 'format', p.format,
    'harga', p.harga,
    'promo', case when public._produk_promo_aktif(p) then jsonb_build_object('harga', p.harga_promo, 'sampai', p.promo_sampai,
                                                                               'label', p.label_promo, 'hitung', p.hitung_mundur) end,
    'terjual', p.terjual_luar + (select count(distinct o.id) from public.order_items i join public.orders o on o.id = i.order_id
                                 where i.produk_id = p.id and o.status in ('dibayar', 'aktif', 'selesai')),
    'rating', (select jsonb_build_object('rata', round(avg(u.bintang)::numeric, 1), 'n', count(*)) from public.produk_ulasan u
               where u.produk_id = p.id and u.tampil having count(*) > 0),
    'unggulan', p.unggulan, 'pemilik', p.pemilik, 'penjual', case when p.pemilik = 'mitra' then p.penjual_nama end,
    'tautan', case when p.pemilik = 'mitra' or p.tipe_kirim = 'luar' then p.tautan_beli end,
    'kirim', p.tipe_kirim, 'baru', p.created_at > now() - interval '30 days')
$$;
revoke execute on function public._produk_kartu(public.produk) from public, anon, authenticated;

create or replace function public.produk_json()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'produk', coalesce((select jsonb_agg(public._produk_kartu(p) order by (p.pemilik = 'mitra'), p.unggulan desc, p.urut, p.id)
                        from public.produk p where public._produk_terlihat(p)), '[]'::jsonb),
    'iklan', (select aktif from public.iklan_setelan where id = 1))
$$;
grant execute on function public.produk_json() to anon, authenticated;

create or replace function public.produk_detail(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p public.produk;
begin
  select * into p from public.produk where slug = p_slug;
  if p.id is null or not public._produk_terlihat(p) then return null; end if;
  return public._produk_kartu(p) || jsonb_build_object(
    'deskripsi', p.deskripsi, 'isi', p.isi,
    'bab', case when p.buku_id is not null then (select jsonb_agg(jsonb_build_object('label', b.label, 'judul', b.judul, 'ringkas', b.ringkas, 'ikon', b.ikon) order by b.urut, b.id)
                                                 from public.ebook_bab b where b.buku_id = p.buku_id and b.tampil) end,
    'ulasan', coalesce((select jsonb_agg(jsonb_build_object('nama', u.nama, 'bintang', u.bintang, 'teks', u.teks, 'sumber', u.sumber, 'tgl', u.created_at) order by u.created_at desc)
                        from (select * from public.produk_ulasan where produk_id = p.id and tampil order by created_at desc limit 30) u), '[]'::jsonb),
    'lain', coalesce((select jsonb_agg(public._produk_kartu(x) order by x.unggulan desc, x.urut) from (
                        select * from public.produk x where x.id <> p.id and x.kategori = p.kategori and public._produk_terlihat(x)
                        order by x.unggulan desc, x.urut limit 4) x), '[]'::jsonb));
end $$;
grant execute on function public.produk_detail(text) to anon, authenticated;

-- ---------------------------------------------------------------- 4. pesan produk & kirim otomatis
create or replace function public.pesan_produk(p_slug text, p_nama text, p_wa text, p_email text default null, p_bahasa text default 'id')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s       public.store_settings;
  p       public.produk;
  v_nama  text := btrim(coalesce(p_nama, ''));
  v_wa    text := public._rapikan_wa(p_wa);
  v_email text := public._ebook_rapikan_email(p_email);
  v_lang  text := case when p_bahasa = 'en' then 'en' else 'id' end;
  v_harga int;
  v_code  text;
  v_order bigint;
begin
  select * into s from public.store_settings where id = 1;
  if s.whatsapp_number is null or not s.orders_open then raise exception 'Pemesanan belum dibuka'; end if;
  select * into p from public.produk where slug = p_slug;
  if p.id is null or not public._produk_terlihat(p) then raise exception 'Produk ini sedang tidak tersedia'; end if;
  if p.pemilik <> 'ixvii' or p.tipe_kirim = 'luar' then raise exception 'Produk ini dibeli langsung di toko penjualnya'; end if;
  if length(v_nama) < 2 or length(v_nama) > 60 then raise exception 'Nama harus 2 sampai 60 huruf'; end if;
  if v_wa is null then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email tidak valid'; end if;
  if p.tipe_kirim = 'ebook' and v_email is null then raise exception 'Isi email untuk masuk ke rak ebook'; end if;
  if (select count(*) from public.orders where customer_wa = v_wa and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Terlalu banyak pesanan dari nomor ini. Coba lagi 10 menit lagi atau hubungi kami di WhatsApp.';
  end if;
  if (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Sedang banyak pesanan. Coba lagi beberapa menit lagi atau hubungi kami di WhatsApp.';
  end if;
  v_harga := case when public._produk_promo_aktif(p) then p.harga_promo else p.harga end;
  if v_harga <= 0 then raise exception 'Harga produk belum diatur'; end if;

  v_code := 'IX' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
  insert into public.orders (code, customer_name, customer_wa, customer_email, lang, total, discount, kind, channel)
  values (v_code, v_nama, v_wa, v_email, v_lang, v_harga, p.harga - v_harga, 'produk', 'web')
  returning id into v_order;
  insert into public.order_items (order_id, variant_id, variant_code, app_name, plan_label, variant_label, price, duration_days, hpp, produk_id)
  values (v_order, null, 'PD-' || p.id, p.nama,
          case p.kategori when 'ebook' then 'Ebook' when 'template' then 'Template' when 'preset' then 'Preset' when 'kelas' then 'Kelas' else 'Produk digital' end,
          'Produk digital', p.harga, null, p.hpp, p.id);
  perform public._notif_pesanan(v_order);
  return jsonb_build_object('kode', v_code, 'produk', p.nama, 'total', v_harga, 'total_normal', p.harga, 'diskon', p.harga - v_harga,
    'kirim', p.tipe_kirim, 'email', v_email, 'whatsapp', s.whatsapp_number,
    'pembayaran', case when v_lang = 'en' then coalesce(s.payment_info_en, s.payment_info) else s.payment_info end,
    'qris', case when s.qris_aktif then s.qris_url end);
end $$;
revoke execute on function public.pesan_produk(text, text, text, text, text) from public;
grant execute on function public.pesan_produk(text, text, text, text, text) to anon, authenticated;

-- setelah pesanan dibayar: ebook masuk rak, tautan unduhan dikirim
create or replace function public._kirim_produk()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v jsonb;
  s public.notif_settings;
  v_teks text;
begin
  if new.produk_terkirim or new.status not in ('dibayar', 'aktif', 'selesai') then return new; end if;
  select * into s from public.notif_settings where id = 1;
  for r in select p.*, rh.tautan as rahasia, rh.pesan as rahasia_pesan from public.order_items i
           join public.produk p on p.id = i.produk_id left join public.produk_rahasia rh on rh.produk_id = p.id
           where i.order_id = new.id loop
    begin
      if r.tipe_kirim = 'ebook' and r.buku_id is not null then
        if new.customer_email is null then
          perform public._notif_owner('pesanan', 'produk_manual', 'Pesanan ' || new.code || ' belum punya email',
            'Ebook ' || r.nama || ' belum bisa masuk rak karena email pembeli kosong. Beri akses manual di panel → Ebook.');
        else
          v := public._ebook_beri_buku(new.customer_name, new.customer_email, new.customer_wa, r.buku_id, 'pesanan', new.id);
          perform public._ebook_kabari(a, (v->>'sandi')) from public.ebook_akses a where a.id = (v->>'akses')::bigint;
        end if;
      elsif r.tipe_kirim = 'tautan' and r.rahasia is not null then
        v_teks := 'Halo ' || new.customer_name || '! Terima kasih sudah membeli *' || r.nama || '* di IXVII.CO.' || chr(10) || chr(10)
          || coalesce(r.rahasia_pesan || chr(10) || chr(10), '') || 'Tautan produkmu: ' || r.rahasia || chr(10) || chr(10)
          || 'Tautan ini khusus untukmu, jangan dibagikan ya. Kode pesanan: ' || new.code;
        perform public._kirim_wa('produk_kirim', new.customer_wa, v_teks);
        if new.customer_email is not null then perform public._kirim_email_ke('produk_kirim', new.customer_email, r.nama || ' — IXVII.CO', v_teks); end if;
      else
        perform public._notif_owner('pesanan', 'produk_manual', 'Kirim manual: ' || r.nama,
          'Pesanan ' || new.code || ' sudah dibayar. Kirim ' || r.nama || ' ke ' || new.customer_name || ' (wa.me/' || new.customer_wa || ').');
      end if;
    exception when others then
      raise warning 'pengiriman produk % gagal: %', r.nama, sqlerrm;
    end;
  end loop;
  new.produk_terkirim := true;
  return new;
end $$;
revoke execute on function public._kirim_produk() from public, anon, authenticated;
drop trigger if exists kirim_produk on public.orders;
create trigger kirim_produk before update of status on public.orders
  for each row when (new.kind = 'produk' and new.status is distinct from old.status) execute function public._kirim_produk();

-- ---------------------------------------------------------------- 5. ulasan pembeli
create or replace function public.ulas_produk(p_slug text, p_kode text, p_wa text, p_bintang int, p_teks text default null, p_nama text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.produk;
  o public.orders;
begin
  select * into p from public.produk where slug = p_slug;
  if p.id is null then raise exception 'Produk tidak ditemukan'; end if;
  if coalesce(p_bintang, 0) not between 1 and 5 then raise exception 'Pilih 1 sampai 5 bintang'; end if;
  if length(coalesce(p_teks, '')) > 600 then raise exception 'Ulasan maksimal 600 huruf'; end if;
  select * into o from public.orders where code = upper(btrim(coalesce(p_kode, ''))) and customer_wa = public._rapikan_wa(p_wa);
  if o.id is null or not exists (select 1 from public.order_items where order_id = o.id and produk_id = p.id) then
    raise exception 'Kode pesanan atau nomor WhatsApp tidak cocok dengan pembelian produk ini';
  end if;
  if o.status not in ('dibayar', 'aktif', 'selesai') then raise exception 'Ulasan bisa diberikan setelah pesanan dibayar'; end if;
  insert into public.produk_ulasan (produk_id, order_id, nama, bintang, teks)
  values (p.id, o.id, left(coalesce(nullif(btrim(p_nama), ''), split_part(o.customer_name, ' ', 1)), 60), p_bintang, nullif(btrim(p_teks), ''))
  on conflict (produk_id, order_id) where order_id is not null
  do update set bintang = excluded.bintang, teks = excluded.teks, nama = excluded.nama, created_at = now();
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.ulas_produk(text, text, text, int, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 6. iklan mitra
create or replace function public._slug_produk(p_teks text)
returns text
language plpgsql stable set search_path = '' as $$
declare
  v_dasar text := left(trim(both '-' from regexp_replace(lower(coalesce(p_teks, '')), '[^a-z0-9]+', '-', 'g')), 60);
  v text;
  n int := 1;
begin
  if length(v_dasar) < 3 then v_dasar := 'produk-' || v_dasar; end if;
  v := trim(both '-' from v_dasar);
  while exists (select 1 from public.produk where slug = v) loop
    n := n + 1; v := trim(both '-' from v_dasar) || '-' || n;
  end loop;
  return v;
end $$;

-- p: { penjual_nama, penjual_wa, penjual_email, nama, kategori, harga, tautan_beli, deskripsi, sampul (tautan), paket (id), setuju }
create or replace function public.ajukan_iklan(p jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  st public.iklan_setelan;
  pk public.iklan_paket;
  ns public.notif_settings;
  v_wa text := public._rapikan_wa(p->>'penjual_wa');
  v_penjual text := btrim(regexp_replace(coalesce(p->>'penjual_nama', ''), '\s+', ' ', 'g'));
  v_nama text := btrim(regexp_replace(coalesce(p->>'nama', ''), '\s+', ' ', 'g'));
  v_tautan text := btrim(coalesce(p->>'tautan_beli', ''));
  v_id bigint;
begin
  select * into st from public.iklan_setelan where id = 1;
  select * into ns from public.notif_settings where id = 1;
  if not st.aktif then raise exception 'Pengajuan iklan sedang ditutup'; end if;
  if not coalesce((p->>'setuju')::boolean, false) then raise exception 'Setujui syarat iklan dulu'; end if;
  if length(v_penjual) not between 2 and 60 then raise exception 'Nama penjual 2 sampai 60 huruf'; end if;
  if v_wa is null then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if length(v_nama) not between 3 and 120 then raise exception 'Nama produk 3 sampai 120 huruf'; end if;
  if coalesce(p->>'kategori', '') not in ('ebook', 'template', 'preset', 'kelas', 'lainnya') then raise exception 'Pilih kategori produk'; end if;
  if coalesce((p->>'harga')::int, -1) not between 0 and 100000000 then raise exception 'Harga tidak valid'; end if;
  if v_tautan !~ '^https://[^\s]+\.[^\s]+$' or length(v_tautan) > 300 then raise exception 'Tautan toko harus diawali https://'; end if;
  if length(coalesce(p->>'deskripsi', '')) not between 20 and 1500 then raise exception 'Deskripsi 20 sampai 1.500 huruf'; end if;
  if nullif(p->>'sampul', '') is not null and (p->>'sampul' !~ '^https://' or length(p->>'sampul') > 300) then raise exception 'Tautan gambar sampul harus diawali https://'; end if;
  select * into pk from public.iklan_paket where id = nullif(p->>'paket', '')::bigint and aktif;
  if pk.id is null then raise exception 'Pilih paket tayang'; end if;
  if (select count(*) from public.produk where pemilik = 'mitra' and created_at > now() - interval '1 hour') >= 15 then
    raise exception 'Sedang banyak pengajuan. Coba lagi nanti.';
  end if;
  if (select count(*) from public.produk where pemilik = 'mitra' and penjual_wa = v_wa and created_at > now() - interval '1 day') >= 3 then
    raise exception 'Maksimal 3 pengajuan per hari dari nomor yang sama';
  end if;
  insert into public.produk (slug, nama, kategori, harga, deskripsi, tautan_beli, pemilik, penjual_nama, penjual_wa, penjual_email,
                             paket_iklan, catatan_admin, status, tipe_kirim, hitung_mundur)
  values (public._slug_produk(v_nama), v_nama, p->>'kategori', (p->>'harga')::int, btrim(p->>'deskripsi'), v_tautan, 'mitra', v_penjual, v_wa,
          public._ebook_rapikan_email(p->>'penjual_email'), pk.nama || ' (' || public._rupiah(pk.harga) || ')',
          case when nullif(p->>'sampul', '') is not null then 'Sampul dari penjual: ' || (p->>'sampul') end, 'menunggu', 'luar', false)
  returning id into v_id;
  perform public._notif_owner('daftar', 'iklan_baru', 'Pengajuan iklan: ' || v_nama,
    'Penjual: ' || v_penjual || ' (wa.me/' || v_wa || ')' || chr(10) || 'Produk: ' || v_nama || ' · ' || public._rupiah((p->>'harga')::int) || chr(10)
    || 'Paket: ' || pk.nama || ' · ' || public._rupiah(pk.harga) || chr(10) || 'Toko: ' || v_tautan || chr(10)
    || 'Periksa di panel: ' || coalesce(ns.site_url, 'https://ixviico.shop') || '/admin/#produk');
  return jsonb_build_object('ok', true, 'paket', pk.nama, 'biaya', pk.harga,
                            'wa_admin', (select whatsapp_number from public.store_settings where id = 1));
end $$;
grant execute on function public.ajukan_iklan(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------- 7. data untuk panel admin
create or replace function public.produk_statistik()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  return coalesce((select jsonb_object_agg(p.id, jsonb_build_object(
    'terjual_web', (select count(distinct o.id) from public.order_items i join public.orders o on o.id = i.order_id
                    where i.produk_id = p.id and o.status in ('dibayar', 'aktif', 'selesai')),
    'menunggu', (select count(distinct o.id) from public.order_items i join public.orders o on o.id = i.order_id
                 where i.produk_id = p.id and o.status = 'menunggu_bayar'),
    'omzet', (select coalesce(sum(o.total), 0) from public.orders o where o.status in ('dibayar', 'aktif', 'selesai')
              and exists (select 1 from public.order_items i where i.order_id = o.id and i.produk_id = p.id)),
    'rating', (select round(avg(u.bintang)::numeric, 1) from public.produk_ulasan u where u.produk_id = p.id and u.tampil),
    'ulasan', (select count(*) from public.produk_ulasan u where u.produk_id = p.id)))
    from public.produk p), '{}'::jsonb);
end $$;
revoke execute on function public.produk_statistik() from public, anon;
grant execute on function public.produk_statistik() to authenticated;

create or replace function public.laku_varian(p_hari int default 30)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  return coalesce((select jsonb_object_agg(x.code, x.n) from (
    select i.variant_code as code, sum(i.qty)::int as n
    from public.order_items i join public.orders o on o.id = i.order_id
    where o.status in ('dibayar', 'aktif', 'selesai') and o.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_hari, 30), 365)))
      and i.variant_id is not null
    group by i.variant_code) x), '{}'::jsonb);
end $$;
revoke execute on function public.laku_varian(int) from public, anon;
grant execute on function public.laku_varian(int) to authenticated;

-- ---------------------------------------------------------------- produk unggulan: Panduan Reseller
insert into public.produk (slug, nama, subjudul, kategori, cover_url, format, deskripsi, isi, harga, harga_promo, promo_sampai, label_promo,
                           tipe_kirim, buku_id, status, unggulan, urut)
select 'panduan-reseller', 'Panduan Reseller Aplikasi Premium',
  'Mulai dari nol, bangun sistem jualan, dan dapatkan pembeli pertama.', 'ebook', '/assets/produk/panduan-reseller.jpg',
  'Ebook interaktif · 18 bab',
  $d$Panduan langkah demi langkah untuk memulai bisnis reseller aplikasi premium: dari cara kerja supplier, menghitung HPP dan margin, membuat poster dan katalog, sampai SOP jualan 14 langkah.

:::kartu
Untuk siapa | Kamu yang ingin mulai jualan aplikasi premium tanpa modal stok besar.
Isinya | 18 bab dengan kalkulator HPP, simulasi untung, checklist, dan SOP yang bisa dicentang.
Cara baca | Dibuka di rak ebook IXVII.CO, maksimal 2 perangkat, progres tersimpan.
:::

:::catatan
Ebook ini berisi materinya saja. Pendampingan face to face, daftar supplier, template poster, dan bonus Canva Head termasuk di **Program Reseller** ([lihat programnya](/reseller/)).
:::$d$,
  E'18 bab panduan reseller dari nol\nKalkulator HPP & simulasi untung\nChecklist memulai jualan yang tersimpan\nSOP jualan 14 langkah\nContoh poster promo asli IXVII.CO\nAkses selamanya di rak ebook',
  149000, 99000, '2026-11-30 23:59:59+07', 'Harga peluncuran', 'ebook', public._ebook_buku_utama(), 'tayang', true, 0
where not exists (select 1 from public.produk where slug = 'panduan-reseller');
