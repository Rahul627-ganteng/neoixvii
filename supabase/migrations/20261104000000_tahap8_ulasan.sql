-- ============================================================================
-- Tahap 8: testimoni Verified Purchase
--   1. review_tokens : link ulasan sekali pakai, dibuat admin untuk pesanan berstatus aktif/selesai
--   2. reviews       : ulasan per aplikasi dari pesanan itu (menunggu → tampil / disembunyikan)
--   3. RPC admin     : buat_link_ulasan(kode pesanan)
--   4. RPC publik    : info_ulasan(token), kirim_ulasan(token, ...), ulasan_json()
-- Data pembeli (nama lengkap, nomor WA, kode pesanan) tidak pernah dikirim ke halaman publik.
-- Jalankan di SQL Editor Supabase SETELAH migration Tahap 7. Aman dijalankan ulang.
-- ============================================================================

-- "Muhammad Rahul" → "Muhammad R."; satu kata → kata itu saja
create or replace function public.samarkan_nama(p_nama text)
returns text
language sql immutable set search_path = '' as $$
  select case
    when k[2] is null then initcap(left(k[1], 20))
    else initcap(left(k[1], 20)) || ' ' || upper(left(k[2], 1)) || '.'
  end
  from (select regexp_split_to_array(btrim(regexp_replace(coalesce(p_nama, ''), '\s+', ' ', 'g')), ' ') as k) x
$$;

-- ---------------------------------------------------------------- tabel
create table if not exists public.review_tokens (
  token      text primary key default replace(gen_random_uuid()::text, '-', ''),
  order_id   bigint not null references public.orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  used_at    timestamptz
);
create index if not exists review_tokens_order_idx on public.review_tokens(order_id);

create table if not exists public.reviews (
  id           bigint generated always as identity primary key,
  order_id     bigint references public.orders(id) on delete set null,
  app_id       bigint references public.apps(id) on delete set null,
  app_name     text not null,
  rating       int  not null check (rating between 1 and 5),
  body         text check (body is null or length(body) <= 600),
  display_name text not null,
  lang         text not null default 'id' check (lang in ('id', 'en')),
  purchased_on date not null,
  status       text not null default 'menunggu' check (status in ('menunggu', 'tampil', 'disembunyikan')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (order_id, app_name)
);
create index if not exists reviews_status_idx on public.reviews(status, created_at desc);

alter table public.review_tokens enable row level security;
alter table public.reviews       enable row level security;
-- hanya admin yang bisa membaca tabelnya langsung; pengunjung lewat RPC di bawah
drop policy if exists admin_semua on public.review_tokens;
drop policy if exists admin_semua on public.reviews;
create policy admin_semua on public.review_tokens for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_semua on public.reviews for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- admin: buat link
-- Mengembalikan token yang masih berlaku (belum dipakai, belum kedaluwarsa) atau membuat yang baru.
create or replace function public.buat_link_ulasan(p_kode text)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  o public.orders;
  t public.review_tokens;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into o from public.orders where code = p_kode;
  if o.id is null then raise exception 'Pesanan % tidak ditemukan', p_kode; end if;
  if o.status not in ('aktif', 'selesai') then
    raise exception 'Link ulasan hanya untuk pesanan berstatus Aktif atau Selesai';
  end if;
  select * into t from public.review_tokens
  where order_id = o.id and used_at is null and expires_at > now() order by created_at desc limit 1;
  if t.token is null then
    insert into public.review_tokens (order_id) values (o.id) returning * into t;
  end if;
  return jsonb_build_object('token', t.token, 'berlaku_sampai', t.expires_at, 'nama', o.customer_name,
                            'wa', o.customer_wa, 'lang', o.lang, 'kode', o.code);
end $$;
revoke execute on function public.buat_link_ulasan(text) from public, anon;
grant execute on function public.buat_link_ulasan(text) to authenticated;

-- ---------------------------------------------------------------- publik: halaman ulasan
-- Data untuk formulir ulasan. Hanya nama samaran dan daftar aplikasi; kode & nomor WA tidak dikirim.
create or replace function public.info_ulasan(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  t public.review_tokens;
  o public.orders;
begin
  select * into t from public.review_tokens where token = p_token;
  if t.token is null or t.used_at is not null or t.expires_at <= now() then
    raise exception 'Link ulasan tidak valid atau sudah dipakai';
  end if;
  select * into o from public.orders where id = t.order_id;
  return jsonb_build_object(
    'nama', public.samarkan_nama(o.customer_name),
    'dibeli', (o.created_at at time zone 'Asia/Jakarta')::date,
    'lang', o.lang,
    'apps', coalesce((
      select jsonb_agg(distinct jsonb_build_object('id', a.id, 'name', coalesce(a.name, oi.app_name), 'slug', a.slug))
      from public.order_items oi
      left join public.variants v on v.id = oi.variant_id
      left join public.plan_groups g on g.id = v.group_id
      left join public.apps a on a.id = g.app_id
      where oi.order_id = o.id), '[]'::jsonb));
end $$;
grant execute on function public.info_ulasan(text) to anon, authenticated;

-- p_ulasan: [{"app": "Netflix", "rating": 5, "isi": "..."}, ...] — satu per aplikasi di pesanan itu.
-- p_anonim = true → nama tampil "Pembeli IXVII.CO".
create or replace function public.kirim_ulasan(p_token text, p_ulasan jsonb, p_anonim boolean default false)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t      public.review_tokens;
  o      public.orders;
  e      jsonb;
  v_app  record;
  v_isi  text;
  v_nil  int;
  v_n    int := 0;
begin
  select * into t from public.review_tokens where token = p_token for update;
  if t.token is null or t.used_at is not null or t.expires_at <= now() then
    raise exception 'Link ulasan tidak valid atau sudah dipakai';
  end if;
  select * into o from public.orders where id = t.order_id;
  if p_ulasan is null or jsonb_typeof(p_ulasan) <> 'array' or jsonb_array_length(p_ulasan) = 0 or jsonb_array_length(p_ulasan) > 10 then
    raise exception 'Beri nilai minimal untuk satu aplikasi';
  end if;

  for e in select * from jsonb_array_elements(p_ulasan) loop
    v_nil := case when (e->>'rating') ~ '^[1-5]$' then (e->>'rating')::int end;
    if v_nil is null then raise exception 'Nilai harus 1 sampai 5 bintang'; end if;
    v_isi := nullif(btrim(regexp_replace(coalesce(e->>'isi', ''), '[\r\n]{3,}', E'\n\n', 'g')), '');
    if length(v_isi) > 600 then raise exception 'Ulasan maksimal 600 huruf'; end if;
    -- aplikasi harus benar-benar ada di pesanan ini
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

  update public.review_tokens set used_at = now() where token = t.token;
  return jsonb_build_object('tersimpan', v_n);
end $$;
grant execute on function public.kirim_ulasan(text, jsonb, boolean) to anon, authenticated;

-- ---------------------------------------------------------------- publik: daftar testimoni
create or replace function public.ulasan_json()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'ulasan', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'app', r.app_name, 'slug', a.slug, 'rating', r.rating, 'isi', r.body,
               'nama', r.display_name, 'lang', r.lang,
               'dibeli', to_char(r.purchased_on, 'YYYY-MM'), 'tanggal', (r.created_at at time zone 'Asia/Jakarta')::date)
             order by r.created_at desc)
      from (select * from public.reviews where status = 'tampil' order by created_at desc limit 300) r
      left join public.apps a on a.id = r.app_id), '[]'::jsonb),
    'ringkasan', coalesce((
      select jsonb_agg(jsonb_build_object('app', x.app_name, 'slug', x.slug, 'rata', x.rata, 'jumlah', x.jumlah) order by x.jumlah desc, x.app_name)
      from (select r.app_name, a.slug, round(avg(r.rating), 1) as rata, count(*) as jumlah
            from public.reviews r left join public.apps a on a.id = r.app_id
            where r.status = 'tampil' group by r.app_name, a.slug) x), '[]'::jsonb))
$$;
grant execute on function public.ulasan_json() to anon, authenticated;
