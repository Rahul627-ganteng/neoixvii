-- ============================================================================
-- Ulasan dari pesanan manual ikut tersambung ke aplikasinya
--   Pesanan yang dibuat dari panel dengan "item di luar katalog" (misalnya "Canva 2 Tahun") tidak
--   punya varian, jadi ulasannya dulu tersimpan tanpa aplikasi: tampil di halaman Testimoni, tetapi
--   tidak muncul di halaman aplikasinya dan tidak ikut rating di katalog.
--   1. cocokkan_app(nama) : cari aplikasi dari nama item ("Canva 2 Tahun" → Canva)
--   2. _simpan_ulasan     : ulasan baru dari item manual langsung disambungkan
--   3. ulasan lama yang belum tersambung disambungkan sekarang
--   4. ulasan_json        : ringkasan rating dikelompokkan per aplikasi
-- Jalankan di SQL Editor Supabase SETELAH 20261118000000_konten_film_blog.sql. Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------- 1. nama item → aplikasi
-- Nama sama persis (tanpa beda huruf besar/kecil), atau nama aplikasi terpanjang yang menjadi awal nama item
-- ("Canva 2 Tahun" → "Canva", "Netflix Premium 1 Bulan" → "Netflix"). Null kalau tidak ada yang cocok.
create or replace function public.cocokkan_app(p_nama text)
returns bigint
language sql stable set search_path = '' as $$
  select a.id
  from public.apps a, (select lower(btrim(regexp_replace(coalesce(p_nama, ''), '\s+', ' ', 'g'))) as n) x
  where x.n <> '' and (lower(a.name) = x.n or x.n like lower(a.name) || ' %')
  order by (lower(a.name) = x.n) desc, length(a.name) desc, a.is_active desc, a.id
  limit 1
$$;
revoke execute on function public.cocokkan_app(text) from public, anon;

-- ---------------------------------------------------------------- 2. simpan ulasan (form ulasan & form garansi)
create or replace function public._simpan_ulasan(p_order_id bigint, p_ulasan jsonb, p_anonim boolean)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  o     public.orders;
  e     jsonb;
  v_app record;
  v_id  bigint;
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
    -- item manual (tanpa varian): cari aplikasinya dari nama item
    v_id := coalesce(v_app.id, public.cocokkan_app(v_app.name));
    insert into public.reviews (order_id, app_id, app_name, rating, body, display_name, lang, purchased_on)
    values (o.id, v_id, v_app.name, v_nil, v_isi,
            case when p_anonim then 'Pembeli IXVII.CO' else public.samarkan_nama(o.customer_name) end,
            o.lang, (o.created_at at time zone 'Asia/Jakarta')::date)
    on conflict (order_id, app_name) do nothing;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke execute on function public._simpan_ulasan(bigint, jsonb, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. sambungkan ulasan lama
update public.reviews r set app_id = public.cocokkan_app(r.app_name), updated_at = now()
where r.app_id is null and public.cocokkan_app(r.app_name) is not null;

-- ---------------------------------------------------------------- 4. daftar testimoni publik
-- Kartu tetap memakai nama item yang dibeli ("Canva 2 Tahun"); ringkasan rating per aplikasi (Canva).
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
      select jsonb_agg(jsonb_build_object('app', x.app, 'slug', x.slug, 'rata', x.rata, 'jumlah', x.jumlah) order by x.jumlah desc, x.app)
      from (select coalesce(a.name, r.app_name) as app, a.slug, round(avg(r.rating), 1) as rata, count(*) as jumlah
            from public.reviews r left join public.apps a on a.id = r.app_id
            where r.status = 'tampil' group by coalesce(a.name, r.app_name), a.slug) x), '[]'::jsonb))
$$;
grant execute on function public.ulasan_json() to anon, authenticated;
