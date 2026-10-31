-- ============================================================================
-- Stok & varian dari panel admin (HP atau laptop, tanpa Excel)
--   1. variants.stock_qty      : jumlah stok tersisa (kosong = tidak dihitung, cukup Tersedia/Habis)
--      variants.stock_changed_at: kapan stok varian terakhir berubah
--      Stok otomatis Habis saat jumlah 0 dan Tersedia lagi saat ditambah.
--   2. ubah_jumlah_stok()      : tambah/kurangi (+1/−1) atau isi angka langsung
--   3. simpan_varian()         : tambah varian baru / ubah nama, tipe, durasi, harga, HPP, tampil
--   4. stok berkurang 1 per item saat pesanan jadi Aktif, kembali kalau pesanan dibatalkan
--   5. sinkron_stok()          : pemeriksaan stok otomatis tiap 5 jam (pg_cron), juga bisa diklik di panel
--   6. katalog_json()          : + jumlah sisa per varian & waktu stok terakhir dicek per aplikasi
-- Jalankan di SQL Editor Supabase SETELAH migration garansi. Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------- 1. kolom stok
alter table public.variants add column if not exists stock_qty int check (stock_qty is null or stock_qty between 0 and 100000);
alter table public.variants add column if not exists stock_changed_at timestamptz;
update public.variants set stock_changed_at = updated_at where stock_changed_at is null;
alter table public.orders add column if not exists stock_taken boolean not null default false;

-- riwayat: catat juga perubahan jumlah stok & durasi
alter table public.price_history drop constraint if exists price_history_field_check;
alter table public.price_history add constraint price_history_field_check
  check (field in ('dibuat', 'harga', 'hpp', 'stok', 'tampil', 'label', 'jumlah', 'durasi', 'tipe'));

-- Status Tersedia/Habis selalu mengikuti jumlah (kalau jumlahnya dihitung)
create or replace function public._stok_varian()
returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.stock_qty is not null then new.stock := case when new.stock_qty > 0 then 'tersedia' else 'habis' end; end if;
    new.stock_changed_at := now();
    return new;
  end if;
  if new.stock_qty is distinct from old.stock_qty and new.stock_qty is not null then
    new.stock := case when new.stock_qty > 0 then 'tersedia' else 'habis' end;
  elsif new.stock is distinct from old.stock and new.stock_qty is not null then
    -- diubah lewat tombol Tersedia/Habis atau Excel
    if new.stock = 'habis' then new.stock_qty := 0;
    elsif new.stock_qty = 0 then new.stock_qty := null;
    end if;
  end if;
  if (new.stock, new.stock_qty) is distinct from (old.stock, old.stock_qty) then
    new.stock_changed_at := now();
  end if;
  return new;
end $$;
drop trigger if exists stok_varian on public.variants;
create trigger stok_varian before insert or update on public.variants
  for each row execute function public._stok_varian();

-- waktu pemeriksaan stok otomatis terakhir (dibaca website)
create table if not exists public.stock_checks (
  id         int primary key default 1 check (id = 1),
  checked_at timestamptz not null default now(),
  fixed      int not null default 0
);
insert into public.stock_checks default values on conflict (id) do nothing;
alter table public.stock_checks enable row level security;
drop policy if exists publik_baca on public.stock_checks;
create policy publik_baca on public.stock_checks for select to anon, authenticated using (true);

-- ---------------------------------------------------------------- 2. ubah jumlah stok
-- p_delta: +1 / −1 (atau angka lain); kalau p_delta kosong, p_jumlah diisi langsung (kosong = tidak dihitung)
create or replace function public.ubah_jumlah_stok(p_code text, p_jumlah int default null, p_delta int default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_old public.variants;
  v_new public.variants;
  v_qty int;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into v_old from public.variants where code = p_code for update;
  if v_old.id is null then raise exception 'Varian % tidak ditemukan', p_code; end if;
  v_qty := case when p_delta is not null then greatest(0, coalesce(v_old.stock_qty, 0) + p_delta) else p_jumlah end;
  if v_qty is not null and (v_qty < 0 or v_qty > 100000) then raise exception 'Jumlah stok harus 0 sampai 100000'; end if;

  update public.variants set stock_qty = v_qty, updated_at = now() where id = v_old.id returning * into v_new;
  if v_old.stock_qty is distinct from v_new.stock_qty then
    insert into public.price_history(variant_id, field, old_value, new_value)
    values (v_old.id, 'jumlah', coalesce(v_old.stock_qty::text, 'tidak dihitung'), coalesce(v_new.stock_qty::text, 'tidak dihitung'));
  end if;
  if v_old.stock is distinct from v_new.stock then
    insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'stok', v_old.stock, v_new.stock);
  end if;
  return jsonb_build_object('code', p_code, 'jumlah', v_new.stock_qty, 'stok', v_new.stock, 'diubah', v_new.stock_changed_at);
end $$;
revoke execute on function public.ubah_jumlah_stok(text, int, int) from public, anon;
grant execute on function public.ubah_jumlah_stok(text, int, int) to authenticated;

-- ---------------------------------------------------------------- 3. tambah / ubah varian
-- p: {code?, app_id, tipe, varian, harga, durasi_hari?, hpp?, jumlah?, hitung?, tampil?}
--   code kosong = varian baru. tipe = nama tipe akun (dibuat kalau belum ada di aplikasi itu).
--   Harga dari panel disimpan sebagai "harga manual" supaya file Excel berikutnya ikut memakai harga ini.
create or replace function public.simpan_varian(p jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_old   public.variants;
  v_new   public.variants;
  v_cost  public.variant_costs;
  v_app   bigint := (p->>'app_id')::bigint;
  v_tipe  text := btrim(coalesce(p->>'tipe', ''));
  v_label text := btrim(coalesce(p->>'varian', ''));
  v_harga int  := (p->>'harga')::int;
  v_hari  int  := nullif(p->>'durasi_hari', '')::int;
  v_hpp   int;
  v_grp   bigint;
  v_qty   int;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if nullif(p->>'code', '') is not null then
    select * into v_old from public.variants where code = p->>'code' for update;
    if v_old.id is null then raise exception 'Varian % tidak ditemukan', p->>'code'; end if;
    if v_app is null then select g.app_id into v_app from public.plan_groups g where g.id = v_old.group_id; end if;
  end if;
  if v_app is null or not exists (select 1 from public.apps where id = v_app) then raise exception 'Pilih aplikasinya'; end if;
  if length(v_tipe) not between 1 and 60 then raise exception 'Tipe akun harus 1 sampai 60 huruf'; end if;
  if length(v_label) not between 1 and 60 then raise exception 'Nama varian harus 1 sampai 60 huruf'; end if;
  if v_harga is null or v_harga not between 1000 and 100000000 then raise exception 'Harga harus Rp1.000 sampai Rp100.000.000'; end if;
  if v_hari is not null and v_hari not between 1 and 36500 then raise exception 'Durasi harus 1 sampai 36500 hari'; end if;
  if p ? 'hpp' then
    v_hpp := nullif(p->>'hpp', '')::int;
    if v_hpp is not null and v_hpp not between 0 and 100000000 then raise exception 'HPP tidak valid'; end if;
  end if;

  -- tipe akun: pakai yang sudah ada (tanpa beda huruf besar/kecil) atau buat baru
  select g.id into v_grp from public.plan_groups g where g.app_id = v_app and g.label_key = public.norm_key(v_tipe);
  if v_grp is null then
    insert into public.plan_groups(app_id, label, sort)
    values (v_app, v_tipe, coalesce((select max(sort) + 1 from public.plan_groups where app_id = v_app), 0))
    returning id into v_grp;
  end if;
  if exists (select 1 from public.variants x where x.group_id = v_grp and x.label_key = public.norm_key(v_label)
             and x.id is distinct from v_old.id) then
    raise exception 'Varian "%" sudah ada di tipe %', v_label, v_tipe;
  end if;

  if v_old.id is null then
    v_qty := case when coalesce((p->>'hitung')::boolean, false) then coalesce((p->>'jumlah')::int, 0) end;
    insert into public.variants(group_id, label, duration_days, price, stock_qty, is_active, sort)
    values (v_grp, v_label, v_hari, v_harga, v_qty, coalesce((p->>'tampil')::boolean, true),
            coalesce((select max(sort) + 1 from public.variants where group_id = v_grp), 0))
    returning * into v_new;
    insert into public.variant_costs(variant_id, hpp, manual_price) values (v_new.id, v_hpp, v_harga);
    insert into public.price_history(variant_id, field, new_value) values (v_new.id, 'dibuat', v_harga::text);
  else
    update public.variants set
      group_id = v_grp, label = v_label, duration_days = v_hari, price = v_harga,
      is_active = coalesce((p->>'tampil')::boolean, is_active),
      stock_qty = case when p ? 'hitung' then case when (p->>'hitung')::boolean then coalesce((p->>'jumlah')::int, stock_qty, 0) end
                       else stock_qty end,
      updated_at = now()
    where id = v_old.id returning * into v_new;
    select * into v_cost from public.variant_costs where variant_id = v_old.id;
    insert into public.variant_costs as vc (variant_id, hpp, manual_price)
    values (v_old.id, case when p ? 'hpp' then v_hpp end, v_harga)
    on conflict (variant_id) do update set
      hpp = case when p ? 'hpp' then excluded.hpp else vc.hpp end,
      manual_price = case when v_old.price is distinct from v_harga or vc.manual_price is not null then v_harga else vc.manual_price end,
      updated_at = now();
    if v_old.price is distinct from v_new.price then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'harga', v_old.price::text, v_new.price::text);
    end if;
    if p ? 'hpp' and v_cost.hpp is distinct from v_hpp then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'hpp', v_cost.hpp::text, v_hpp::text);
    end if;
    if v_old.label is distinct from v_new.label then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'label', v_old.label, v_new.label);
    end if;
    if v_old.group_id is distinct from v_new.group_id then
      insert into public.price_history(variant_id, field, old_value, new_value)
      values (v_old.id, 'tipe', (select label from public.plan_groups where id = v_old.group_id), v_tipe);
    end if;
    if v_old.duration_days is distinct from v_new.duration_days then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'durasi', v_old.duration_days::text, v_new.duration_days::text);
    end if;
    if v_old.is_active is distinct from v_new.is_active then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'tampil', v_old.is_active::text, v_new.is_active::text);
    end if;
    if v_old.stock_qty is distinct from v_new.stock_qty then
      insert into public.price_history(variant_id, field, old_value, new_value)
      values (v_old.id, 'jumlah', coalesce(v_old.stock_qty::text, 'tidak dihitung'), coalesce(v_new.stock_qty::text, 'tidak dihitung'));
    end if;
    if v_old.stock is distinct from v_new.stock then
      insert into public.price_history(variant_id, field, old_value, new_value) values (v_old.id, 'stok', v_old.stock, v_new.stock);
    end if;
    -- tipe akun lama yang jadi kosong dihapus
    if v_old.group_id <> v_grp and not exists (select 1 from public.variants where group_id = v_old.group_id) then
      delete from public.plan_groups where id = v_old.group_id;
    end if;
  end if;
  return jsonb_build_object('code', v_new.code, 'harga', v_new.price, 'jumlah', v_new.stock_qty, 'stok', v_new.stock, 'baru', v_old.id is null);
end $$;
revoke execute on function public.simpan_varian(jsonb) from public, anon;
grant execute on function public.simpan_varian(jsonb) to authenticated;

-- ---------------------------------------------------------------- 4. stok mengikuti pesanan
create or replace function public._stok_pesanan()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('aktif', 'selesai') and not new.stock_taken then
    update public.variants v set stock_qty = greatest(0, v.stock_qty - x.n), updated_at = now()
    from (select variant_id, count(*)::int as n from public.order_items where order_id = new.id and variant_id is not null group by variant_id) x
    where v.id = x.variant_id and v.stock_qty is not null;
    new.stock_taken := true;
  elsif new.status = 'batal' and new.stock_taken then
    update public.variants v set stock_qty = v.stock_qty + x.n, updated_at = now()
    from (select variant_id, count(*)::int as n from public.order_items where order_id = new.id and variant_id is not null group by variant_id) x
    where v.id = x.variant_id and v.stock_qty is not null;
    new.stock_taken := false;
  end if;
  return new;
end $$;
drop trigger if exists stok_pesanan on public.orders;
create trigger stok_pesanan before update of status on public.orders
  for each row when (new.status is distinct from old.status) execute function public._stok_pesanan();
revoke execute on function public._stok_pesanan() from public, anon, authenticated;

-- ---------------------------------------------------------------- 5. pemeriksaan stok otomatis
-- Merapikan status yang tidak cocok dengan jumlahnya, lalu mencatat waktu pemeriksaan.
create or replace function public.sinkron_stok()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  -- lewat website/panel harus admin; dari jadwal pg_cron (tanpa login) boleh
  if coalesce(current_setting('request.jwt.claims', true), '') <> '' and not public.is_admin() then raise exception 'Hanya admin'; end if;
  update public.variants set stock = case when stock_qty > 0 then 'tersedia' else 'habis' end
  where stock_qty is not null and stock <> case when stock_qty > 0 then 'tersedia' else 'habis' end;
  get diagnostics n = row_count;
  update public.stock_checks set checked_at = now(), fixed = n where id = 1;
  return jsonb_build_object('dicek', now(), 'dirapikan', n);
end $$;
revoke execute on function public.sinkron_stok() from public, anon;
grant execute on function public.sinkron_stok() to authenticated;

-- jadwal tiap 5 jam (butuh ekstensi pg_cron; kalau belum bisa, website tetap memakai waktu perubahan stok terakhir)
do $cron$
begin
  begin
    create extension if not exists pg_cron with schema pg_catalog;
  exception when others then
    raise notice 'pg_cron belum aktif (%). Aktifkan di Database > Extensions, lalu jalankan file ini lagi.', sqlerrm;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'ixvii-cek-stok';
    perform cron.schedule('ixvii-cek-stok', '0 */5 * * *', 'select public.sinkron_stok()');
  end if;
end
$cron$;
select public.sinkron_stok();

-- ---------------------------------------------------------------- 6. tampilan admin & katalog publik
create or replace view public.v_katalog_admin with (security_invoker = true) as
select v.code,
       c.label  as kategori,
       a.name   as aplikasi,
       g.label  as tipe,
       v.label  as varian,
       vc.hpp,
       vc.markup,
       vc.manual_price as harga_manual,
       v.price  as harga,
       v.price - vc.hpp as untung,
       case when vc.hpp is not null and v.price > 0 then round((v.price - vc.hpp)::numeric / v.price, 4) end as margin_pct,
       case when vc.hpp is not null then
         ceil(greatest(vc.hpp + s.min_margin_rp, vc.hpp / (1 - s.min_margin_pct)) / 500.0)::int * 500
       end as harga_minimum,
       vc.hpp is null as hpp_kosong,
       v.stock  as stok,
       v.is_active as tampil,
       vc.admin_note as catatan,
       v.updated_at,
       c.sort as sort_kategori, a.sort as sort_aplikasi, g.sort as sort_tipe, v.sort as sort_varian,
       vc.bundle_max_pct as batas_diskon_manual,
       public.batas_bundle(v.price, vc.hpp, vc.bundle_max_pct) as batas_bundle,
       v.stock_qty as stok_jumlah,
       v.duration_days as durasi_hari,
       a.id as app_id,
       v.stock_changed_at as stok_diubah
from public.variants v
join public.plan_groups g on g.id = v.group_id
join public.apps a        on a.id = g.app_id
join public.categories c  on c.id = a.category_id
left join public.variant_costs vc on vc.variant_id = v.id
cross join public.pricing_settings s;
revoke all on public.v_katalog_admin from anon;

-- katalog publik: + "q" (sisa stok, hanya kalau dihitung) dan "stok_at" per aplikasi
create or replace function public.katalog_json() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'updated', to_char((select max(updated_at) from public.variants) at time zone 'Asia/Jakarta', 'YYYY-MM-DD'),
    'cek_stok', (select checked_at from public.stock_checks where id = 1),
    'cats', coalesce(jsonb_agg(jsonb_build_object('label', c.label, 'desc', coalesce(c.description, ''),
                                                  'label_en', c.label_en, 'desc_en', c.description_en, 'apps', ai.apps)
                               order by c.sort, c.id) filter (where ai.apps is not null), '[]'::jsonb))
  from public.categories c
  cross join lateral (
    select jsonb_agg(jsonb_build_object('id', a.id, 'slug', a.slug, 'name', a.name, 'desc', coalesce(a.description, ''),
                                        'desc_en', a.description_en, 'logo', a.logo_url, 'featured', a.is_featured,
                                        'stok_at', gi.stok_at, 'groups', gi.groups)
                     order by a.sort, a.id) filter (where gi.groups is not null) as apps
    from public.apps a
    cross join lateral (
      select jsonb_agg(jsonb_build_object('label', g.label, 'items', vi.items) order by g.sort, g.id)
               filter (where vi.items is not null) as groups,
             max(vi.stok_at) as stok_at
      from public.plan_groups g
      cross join lateral (
        select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', v.code, 'd', v.label, 'p', v.price,
                                            's', case v.stock when 'habis' then 0 else 1 end,
                                            'h', v.duration_days, 'q', v.stock_qty))
                         order by v.sort, v.id) as items,
               max(v.stock_changed_at) as stok_at
        from public.variants v
        where v.group_id = g.id and v.is_active
      ) vi
      where g.app_id = a.id
    ) gi
    where a.category_id = c.id and a.is_active
  ) ai
$$;
grant execute on function public.katalog_json() to anon, authenticated;
