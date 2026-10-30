-- ============================================================================
-- Tahap 5: pendukung panel admin
--   * versi_katalog(): cap waktu perubahan terakhir (harga, stok, HPP). Ditulis ke file
--     "Unduh Excel" supaya file lama tidak bisa menimpa perubahan yang lebih baru.
--   * ubah_stok(): ganti Tersedia/Habis satu varian dari panel, sekaligus dicatat di riwayat.
-- Jalankan sekali di SQL Editor Supabase, SETELAH migration Tahap 4.
-- ============================================================================

create or replace function public.versi_katalog() returns timestamptz
language sql stable security invoker set search_path = '' as $$
  select greatest(
    (select max(updated_at) from public.variants),
    (select max(updated_at) from public.variant_costs)
  )
$$;

create or replace function public.ubah_stok(p_code text, p_stok text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_old public.variants;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if p_stok not in ('tersedia', 'habis') then raise exception 'Stok harus tersedia atau habis'; end if;

  select * into v_old from public.variants where code = p_code for update;
  if v_old.id is null then raise exception 'Varian % tidak ditemukan', p_code; end if;
  if v_old.stock = p_stok then
    return jsonb_build_object('code', p_code, 'stok', p_stok, 'berubah', false);
  end if;

  update public.variants set stock = p_stok, updated_at = now() where id = v_old.id;
  insert into public.price_history(variant_id, field, old_value, new_value)
  values (v_old.id, 'stok', v_old.stock, p_stok);
  return jsonb_build_object('code', p_code, 'stok', p_stok, 'berubah', true);
end $$;

revoke execute on function public.versi_katalog() from public, anon;
revoke execute on function public.ubah_stok(text, text) from public, anon;
grant execute on function public.versi_katalog() to authenticated;
grant execute on function public.ubah_stok(text, text) to authenticated;
