-- ============================================================================
-- Kampanye "Tanggal Tua Sale" (24–28 November 2026): 1 promo + 10 bundle harga tetap.
--   • Semua bundle terikat ke promo ini (promo_id), aktif 24–28 Nov, lalu hilang sendiri.
--   • Stok bundle = jumlah slot promo; berkurang otomatis setiap ada pesanan.
--   • harga_tetap = false: kalau HPP di panel sudah naik, website otomatis menaikkan harga
--     ke batas aman (HPP + margin minimum), jadi tidak ada paket yang dijual rugi.
--   • "3 bulan" untuk Canva Head, ChatGPT Plus, dan Disney+ = paket 1 bulan × 3 (bundle_items.qty).
-- Jalankan di SQL Editor Supabase SETELAH 20261121000000_langganan_kabari_ajak_sorotan.sql.
-- Aman dijalankan ulang: kampanye lama berjudul sama dihapus dulu, lalu dibuat ulang.
-- ============================================================================

do $$
declare
  v_promo  bigint;
  v_bundle bigint;
  v_var    bigint;
  v_sort   int;
  b        jsonb;
  it       jsonb;
  i        int := 0;
  -- kode varian + nama aplikasi yang diharapkan (dicek supaya tidak salah paket kalau kode pernah berubah)
  v_paket constant jsonb := '{
    "capcut_3b":   {"code": "V0135", "app": "Capcut",        "varian": "3 Bulan"},
    "capcut_6b":   {"code": "V0136", "app": "Capcut",        "varian": "6 Bulan"},
    "capcut_1t":   {"code": "V0137", "app": "Capcut",        "varian": "1 Tahun"},
    "lr_preset":   {"code": "V0145", "app": "Lightroom Pro", "varian": "1 Tahun Preset"},
    "canva_tp_1t": {"code": "V0107", "app": "Canva",         "varian": "1 Tahun"},
    "canva_head":  {"code": "V0110", "app": "Canva",         "varian": "Head 1 Bulan"},
    "gemini_1t":   {"code": "V0101", "app": "Gemini AI",     "varian": "1 Tahun Priv"},
    "gpt_8u_1b":   {"code": "V0090", "app": "Chatgpt Plus",  "varian": "8U 1 Bulan"},
    "nf_3b":       {"code": "V0006", "app": "Netflix",       "varian": "3 Bulan"},
    "dis_6u_1b":   {"code": "V0026", "app": "Disney+",       "varian": "1 Bulan"}
  }'::jsonb;
  v_bundles constant jsonb := '[
    {"name": "Bos Desain 3 Bulan", "name_en": "Design Boss 3 Months", "price": 149000, "stock": 12, "best": true,
     "desc": "Canva Head 3 bulan (bisa undang tim) + Lightroom Pro 1 tahun lengkap preset.",
     "desc_en": "Canva Head for 3 months (invite your team) + Lightroom Pro 1 year with presets.",
     "items": [["canva_head", 3], ["lr_preset", 1]]},
    {"name": "Estetik Setahun Anti Boncos", "name_en": "Aesthetic Year, Budget Safe", "price": 89000, "stock": 20, "best": false,
     "desc": "Dua aplikasi setahun: Canva Team Pro 1 tahun + Lightroom Pro 1 tahun lengkap preset.",
     "desc_en": "Two apps for a full year: Canva Team Pro 1 year + Lightroom Pro 1 year with presets.",
     "items": [["canva_tp_1t", 1], ["lr_preset", 1]]},
    {"name": "Sultan Konten Setahun", "name_en": "Content Sultan, 1 Year", "price": 299000, "stock": 5, "best": false,
     "desc": "Paket kreator paling lengkap: CapCut Sharing 1 tahun + Lightroom Pro 1 tahun preset + Canva Team Pro 1 tahun.",
     "desc_en": "The complete creator kit: CapCut Sharing 1 year + Lightroom Pro 1 year with presets + Canva Team Pro 1 year.",
     "items": [["capcut_1t", 1], ["lr_preset", 1], ["canva_tp_1t", 1]]},
    {"name": "Tangga Hemat CapCut 3 Bulan", "name_en": "CapCut Saver Ladder, 3 Months", "price": 69000, "stock": 7, "best": false,
     "desc": "CapCut Sharing 3 bulan. Makin panjang durasinya, makin murah per bulannya.",
     "desc_en": "CapCut Sharing for 3 months. The longer you go, the cheaper each month gets.",
     "items": [["capcut_3b", 1]]},
    {"name": "Tangga Hemat CapCut 6 Bulan", "name_en": "CapCut Saver Ladder, 6 Months", "price": 125000, "stock": 5, "best": false,
     "desc": "CapCut Sharing 6 bulan, jatuhnya sekitar Rp20.800 per bulan.",
     "desc_en": "CapCut Sharing for 6 months, about Rp20,800 a month.",
     "items": [["capcut_6b", 1]]},
    {"name": "Tangga Hemat CapCut 1 Tahun", "name_en": "CapCut Saver Ladder, 1 Year", "price": 219000, "stock": 3, "best": false,
     "desc": "CapCut Sharing 1 tahun, jatuhnya sekitar Rp18.250 per bulan. Slot paling sedikit.",
     "desc_en": "CapCut Sharing for 1 year, about Rp18,250 a month. Fewest slots.",
     "items": [["capcut_1t", 1]]},
    {"name": "Duo Otak Encer", "name_en": "Big Brain Duo", "price": 229000, "stock": 7, "best": false,
     "desc": "Dua AI sekaligus: Gemini Pro privat 1 tahun + ChatGPT Plus 3 bulan.",
     "desc_en": "Two AIs at once: Gemini Pro private 1 year + ChatGPT Plus 3 months.",
     "items": [["gemini_1t", 1], ["gpt_8u_1b", 3]]},
    {"name": "Asisten Pribadi 3 Bulan", "name_en": "Personal Assistant, 3 Months", "price": 159000, "stock": 10, "best": false,
     "desc": "ChatGPT Plus 3 bulan, diperpanjang tiap bulan oleh admin.",
     "desc_en": "ChatGPT Plus for 3 months, renewed monthly by our admin.",
     "items": [["gpt_8u_1b", 3]]},
    {"name": "Maraton Libur Natal", "name_en": "Holiday Binge Pack", "price": 209000, "stock": 8, "best": false,
     "desc": "Netflix 1P1U 3 bulan + Disney+ 3 bulan. Pas untuk libur akhir tahun.",
     "desc_en": "Netflix 1P1U 3 months + Disney+ 3 months. Perfect for the year-end holidays.",
     "items": [["nf_3b", 1], ["dis_6u_1b", 3]]},
    {"name": "Freelancer Siap Tempur", "name_en": "Battle-Ready Freelancer", "price": 239000, "stock": 5, "best": false,
     "desc": "Canva Team Pro 1 tahun + CapCut Sharing 6 bulan + Gemini Pro privat 1 tahun.",
     "desc_en": "Canva Team Pro 1 year + CapCut Sharing 6 months + Gemini Pro private 1 year.",
     "items": [["canva_tp_1t", 1], ["capcut_6b", 1], ["gemini_1t", 1]]}
  ]'::jsonb;
  v_mulai  constant date := '2026-11-24';
  v_sampai constant date := '2026-11-28';
  v_key    text;
  v_cek    record;
begin
  -- 1. pastikan semua kode varian masih menunjuk paket yang benar
  for v_key in select jsonb_object_keys(v_paket) loop
    select v.id, a.name as app, v.label into v_cek
    from public.variants v
    join public.plan_groups g on g.id = v.group_id
    join public.apps a on a.id = g.app_id
    where v.code = v_paket->v_key->>'code';
    if v_cek.id is null then
      raise exception 'Kode % (%) tidak ada di katalog. Sesuaikan kodenya di file ini.', v_paket->v_key->>'code', v_key;
    end if;
    if v_cek.app <> v_paket->v_key->>'app' or v_cek.label <> v_paket->v_key->>'varian' then
      raise exception 'Kode % sekarang berisi "% %", bukan "% %". Sesuaikan kodenya di file ini.',
        v_paket->v_key->>'code', v_cek.app, v_cek.label, v_paket->v_key->>'app', v_paket->v_key->>'varian';
    end if;
  end loop;

  -- 2. hapus kampanye lama dengan judul sama (pesanan lama tetap tercatat)
  delete from public.bundles where promo_id in (select id from public.promos where title = 'Tanggal Tua Sale');
  delete from public.promos where title = 'Tanggal Tua Sale';

  -- 3. promo
  select coalesce(min(sort), 0) - 10 into v_sort from public.promos;   -- tampil paling atas
  insert into public.promos (title, title_en, body, body_en, link_url, lencana, warna, starts_on, ends_on, is_active, sort, hitung_mundur)
  values ('Tanggal Tua Sale', 'End of Month Sale',
          'Tanggal tua, tetap premium. 8 paket spesial berdurasi panjang: makin lama durasinya, makin murah per bulannya. Slot terbatas, hanya 24–28 November.',
          'Payday is far, premium stays. 8 special long-duration packs: the longer the plan, the cheaper each month. Limited slots, 24–28 November only.',
          '/promo/', 'Sampai 28 Nov', '#800203', v_mulai, v_sampai, true, v_sort, true)
  returning id into v_promo;

  -- 4. bundle
  select coalesce(max(sort), 0) into v_sort from public.bundles;
  for b in select * from jsonb_array_elements(v_bundles) loop
    i := i + 1;
    insert into public.bundles (name, name_en, description, description_en, price, harga_tetap, stock_qty, best_deal,
                                promo_id, starts_on, ends_on, is_active, sort)
    values (b->>'name', b->>'name_en', b->>'desc', b->>'desc_en', (b->>'price')::int, false, (b->>'stock')::int,
            (b->>'best')::boolean, v_promo, v_mulai, v_sampai, true, v_sort + i * 10)
    returning id into v_bundle;
    for it in select * from jsonb_array_elements(b->'items') loop
      select id into v_var from public.variants where code = v_paket->(it->>0)->>'code';
      insert into public.bundle_items (bundle_id, variant_id, qty) values (v_bundle, v_var, (it->>1)::int);
    end loop;
  end loop;
end $$;

-- 5. cek hasil: harga_tampil harus sama dengan price. Kalau lebih tinggi, berarti HPP di panel sudah naik
--    dan website memakai batas aman; sesuaikan harga di poster/video atau naikkan harganya di menu Promo & bundle.
select b.name, b.price as harga_promo, a.harga_tampil, a.total_normal, b.stock_qty as slot, a.semua_tersedia
from public.bundles b
join public.v_bundle_admin a on a.id = b.id
where b.promo_id = (select id from public.promos where title = 'Tanggal Tua Sale')
order by b.sort;
