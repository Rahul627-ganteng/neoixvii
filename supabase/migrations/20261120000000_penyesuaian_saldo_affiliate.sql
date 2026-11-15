-- ============================================================================
-- Ubah saldo affiliate secara manual, lengkap dengan keterangan
--   1. affiliate_adjustments        : catatan penyesuaian (+ bonus / koreksi, − potongan) per affiliate
--   2. v_saldo_affiliate            : saldo tersedia ikut menghitung penyesuaian (kolom baru: penyesuaian)
--   3. sesuaikan_saldo_affiliate()  : tambah / kurangi / jadikan saldo sekian, wajib ada keterangan
--      hapus_penyesuaian_affiliate(): batalkan satu penyesuaian
--   4. saldo_affiliate()            : halaman saldo pribadi affiliate ikut menampilkan penyesuaian
-- Jalankan di SQL Editor Supabase SETELAH 20261119000000_ulasan_aplikasi.sql. Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------- 1. tabel penyesuaian
create table if not exists public.affiliate_adjustments (
  id         bigint generated always as identity primary key,
  partner_id bigint not null references public.partners(id) on delete cascade,
  amount     int not null check (amount <> 0 and amount between -100000000 and 100000000),
  note       text not null check (length(btrim(note)) between 3 and 200),
  show_note  boolean not null default true,          -- keterangan terlihat di halaman saldo affiliate
  adj_on     date not null default public.hari_ini_wib(),
  created_at timestamptz not null default now()
);
create index if not exists affiliate_adjustments_partner_idx on public.affiliate_adjustments(partner_id, adj_on desc);
alter table public.affiliate_adjustments enable row level security;
drop policy if exists admin_semua on public.affiliate_adjustments;
create policy admin_semua on public.affiliate_adjustments for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.affiliate_adjustments from anon;

-- ---------------------------------------------------------------- 2. saldo per affiliate
-- Kolom lama tetap di urutan yang sama; "penyesuaian" ditambahkan di akhir.
create or replace view public.v_saldo_affiliate with (security_invoker = true) as
select p.id as partner_id, p.name, p.kind, p.whatsapp, p.referral_code, p.payout_to, p.is_active,
       p.commission_pct, coalesce(p.commission_pct, st.rate_pct) as rate_pct,
       coalesce(s.n, 0) as n, coalesce(s.omzet, 0) as omzet, coalesce(s.untung, 0) as untung, coalesce(s.komisi, 0) as komisi,
       coalesce(w.dibayar, 0) as dibayar, coalesce(w.ditahan, 0) as ditahan,
       coalesce(s.komisi, 0) + coalesce(j.total, 0) - coalesce(w.dibayar, 0) - coalesce(w.ditahan, 0) as tersedia,
       coalesce(s.untung, 0) - coalesce(s.komisi, 0) as untung_owner,
       s.terakhir, p.balance_token is not null as punya_link,
       coalesce(j.total, 0) as penyesuaian
from public.partners p
cross join public.affiliate_settings st
left join lateral (select count(*)::int as n, sum(price)::int as omzet, sum(price - coalesce(hpp, price))::int as untung,
                          sum(commission)::int as komisi, max(sold_on) as terakhir
                   from public.affiliate_sales where partner_id = p.id) s on true
left join lateral (select sum(amount) filter (where status = 'dibayar')::int as dibayar,
                          sum(amount) filter (where status = 'dijadwalkan')::int as ditahan
                   from public.affiliate_withdrawals where partner_id = p.id) w on true
left join lateral (select sum(amount)::int as total from public.affiliate_adjustments where partner_id = p.id) j on true
where st.id = 1;
revoke all on public.v_saldo_affiliate from anon;

-- ---------------------------------------------------------------- 3. ubah saldo
-- p_jumlah: + menambah, − mengurangi. p_jadi: saldo tujuan (selisihnya dihitung di sini, mengabaikan p_jumlah).
-- Saldo tidak boleh jadi minus (penarikan yang sedang diproses ikut diperhitungkan).
create or replace function public.sesuaikan_saldo_affiliate(p_partner bigint, p_jumlah int, p_catatan text,
                                                           p_jadi int default null, p_tampil boolean default true)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_saldo int;
  v_jumlah int;
  v_ket text := btrim(regexp_replace(coalesce(p_catatan, ''), '\s+', ' ', 'g'));
  v_id bigint;
  rp text;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select tersedia into v_saldo from public.v_saldo_affiliate where partner_id = p_partner;
  if v_saldo is null then raise exception 'Affiliate tidak ditemukan'; end if;
  rp := replace(to_char(v_saldo, 'FM999,999,999,990'), ',', '.');
  if p_jadi is not null then
    if p_jadi < 0 then raise exception 'Saldo tujuan tidak boleh minus'; end if;
    v_jumlah := p_jadi - v_saldo;
    if v_jumlah = 0 then raise exception 'Saldo sudah Rp%', rp; end if;
  else
    v_jumlah := p_jumlah;
    if v_jumlah is null or v_jumlah = 0 then raise exception 'Isi jumlah penyesuaiannya'; end if;
  end if;
  if abs(v_jumlah) > 100000000 then raise exception 'Jumlah penyesuaian terlalu besar'; end if;
  if length(v_ket) < 3 then raise exception 'Tulis keterangannya, minimal 3 huruf'; end if;
  if length(v_ket) > 200 then raise exception 'Keterangan maksimal 200 huruf'; end if;
  if v_saldo + v_jumlah < 0 then raise exception 'Saldo jadi minus. Saldo sekarang Rp%', rp; end if;
  insert into public.affiliate_adjustments (partner_id, amount, note, show_note)
  values (p_partner, v_jumlah, v_ket, coalesce(p_tampil, true))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'jumlah', v_jumlah, 'saldo', v_saldo + v_jumlah);
end $$;
revoke execute on function public.sesuaikan_saldo_affiliate(bigint, int, text, int, boolean) from public, anon;
grant execute on function public.sesuaikan_saldo_affiliate(bigint, int, text, int, boolean) to authenticated;

create or replace function public.hapus_penyesuaian_affiliate(p_id bigint)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  a public.affiliate_adjustments;
  v_saldo int;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select * into a from public.affiliate_adjustments where id = p_id;
  if not found then raise exception 'Penyesuaian tidak ditemukan'; end if;
  select tersedia into v_saldo from public.v_saldo_affiliate where partner_id = a.partner_id;
  if v_saldo - a.amount < 0 then
    raise exception 'Saldo jadi minus kalau penyesuaian ini dihapus (sebagian sudah ditarik). Tambahkan penyesuaian pengurang saja.';
  end if;
  delete from public.affiliate_adjustments where id = p_id;
  return jsonb_build_object('saldo', v_saldo - a.amount);
end $$;
revoke execute on function public.hapus_penyesuaian_affiliate(bigint) from public, anon;
grant execute on function public.hapus_penyesuaian_affiliate(bigint) to authenticated;

-- ---------------------------------------------------------------- 4. halaman saldo pribadi affiliate
-- Sama seperti sebelumnya + 'penyesuaian' (total) dan daftar penyesuaian. Keterangan hanya ikut kalau show_note.
create or replace function public.saldo_affiliate(p_token text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'nama', p.name, 'kode', p.referral_code, 'jenis', p.kind, 'komisi_pct', coalesce(p.commission_pct, st.rate_pct),
    'n', coalesce(b.n, 0), 'komisi', coalesce(b.komisi, 0), 'dibayar', coalesce(b.dibayar, 0), 'diproses', coalesce(b.ditahan, 0),
    'saldo', coalesce(b.tersedia, 0), 'min_tarik', st.min_withdraw, 'tanggal_bayar', st.payday,
    'bayar_berikut', public.tanggal_bayar_affiliate(),
    'penyesuaian', coalesce(b.penyesuaian, 0),
    'bulan_ini', (select coalesce(sum(commission), 0) from public.affiliate_sales
                  where partner_id = p.id and date_trunc('month', sold_on::timestamp) = date_trunc('month', public.hari_ini_wib()::timestamp)),
    'penjualan', coalesce((select jsonb_agg(jsonb_build_object('tgl', s.sold_on, 'app', s.app_name, 'tipe', s.plan_label,
                                                                'varian', s.variant_label, 'komisi', s.commission) order by s.sold_on desc, s.id desc)
                           from (select * from public.affiliate_sales where partner_id = p.id order by sold_on desc, id desc limit 60) s), '[]'::jsonb),
    'penarikan', coalesce((select jsonb_agg(jsonb_build_object('diajukan', w.requested_on, 'jadwal', w.scheduled_on, 'jumlah', w.amount,
                                                                'status', w.status, 'dibayar', w.paid_on) order by w.requested_on desc, w.id desc)
                           from public.affiliate_withdrawals w where w.partner_id = p.id), '[]'::jsonb),
    'daftar_penyesuaian', coalesce((select jsonb_agg(jsonb_build_object('tgl', j.adj_on, 'jumlah', j.amount,
                                                                         'ket', case when j.show_note then j.note end) order by j.adj_on desc, j.id desc)
                                    from (select * from public.affiliate_adjustments where partner_id = p.id order by adj_on desc, id desc limit 60) j), '[]'::jsonb))
  from public.partners p
  cross join public.affiliate_settings st
  left join public.v_saldo_affiliate b on b.partner_id = p.id
  where p_token ~ '^[0-9a-f]{32}$' and p.balance_token = p_token and st.id = 1
$$;
grant execute on function public.saldo_affiliate(text) to anon, authenticated;
