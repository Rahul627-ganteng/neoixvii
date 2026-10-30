-- ============================================================================
-- Tahap 6 + tambahan:
--   1. Teks bahasa Inggris (kategori, aplikasi, FAQ)
--   2. store_settings: nomor WhatsApp, info pembayaran, kurs USD, buka/tutup pesanan
--   3. plan_type_info: penjelasan tipe paket (Sharing, Private, ...) + kelebihan/kekurangan
--   4. site_faqs: FAQ di beranda (yang belum dijawab disimpan sebagai draf)
--   5. katalog_json versi 3 (teks Inggris)
--   6. orders + order_items, RPC buat_pesanan (publik) dan ubah_status_pesanan (admin)
-- Jalankan sekali di SQL Editor Supabase, SETELAH migration Tahap 5.
-- ============================================================================

-- ---------------------------------------------------------------- 1. bahasa Inggris
alter table public.categories add column if not exists label_en text, add column if not exists description_en text;
alter table public.apps       add column if not exists description_en text;
alter table public.app_faqs   add column if not exists question_en text, add column if not exists answer_en text;

update public.categories c set label_en = v.l, description_en = v.d
from (values
  ('Nonton',  'Streaming', 'Netflix, Disney+, Viu, and other streaming services'),
  ('AI',      'AI',        'Paid AI assistants'),
  ('Editing', 'Editing',   'Design, photo, and video apps'),
  ('Edukasi', 'Study & Work', 'Apps for learning and work'),
  ('Musik',   'Music',     'Ad-free music streaming'),
  ('Lainnya', 'Others',    'Single products')
) as v(k, l, d)
where c.label = v.k;

update public.apps a set description_en = v.d
from (values
  ('Netflix', 'Films, series, and documentaries from around the world, plus originals you can only watch here.'),
  ('Viu', 'Korean, Japanese, and other Asian dramas with subtitles, many released alongside their home country.'),
  ('Disney+', 'Disney, Pixar, Marvel, Star Wars, and National Geographic, plus Asian series on the Star channel.'),
  ('IQIYI', 'Chinese and Korean dramas and variety shows, including many of its own original titles.'),
  ('We TV', 'Chinese, Thai, and Korean dramas from Tencent, complete with subtitles.'),
  ('Dramabox', 'Short vertical dramas with episodes only a few minutes long, easy to watch anywhere.'),
  ('HBO STANDAR', 'Warner Bros. films and HBO series such as House of the Dragon and The Last of Us.'),
  ('HBO ULTIMATE', 'Everything in the standard plan, plus 4K quality and more screens watching at once.'),
  ('Amazon Prime Video', 'Amazon Originals such as The Boys and Reacher, plus a catalog of Hollywood films.'),
  ('Loklok', 'Asian films and dramas with subtitles, light enough for mid-range phones.'),
  ('B-station', 'The international version of Bilibili: anime, donghua, and Asian creator content with subtitles.'),
  ('Vidio Platinum', 'Indonesian shows, soap operas, and sports, including the Premier League and Liga 1.'),
  ('Vision+ Sport', 'MNC''s sports package, including football league and international matches.'),
  ('Reelshort', 'Original short drama series in vertical format, with plenty of romance and revenge stories.'),
  ('RCTI+', 'Live MNC TV channels, soap operas, and local shows in one app.'),
  ('Youku', 'Chinese dramas and films from Alibaba, strong in martial arts and historical dramas.'),
  ('Youtube Indplan', 'Ad-free videos, background play, downloads, and YouTube Music included.'),
  ('Crunchyroll', 'The largest anime library, with many titles streaming hours after they air in Japan.'),
  ('GROK', 'xAI''s assistant connected to X, good at casual chat and trending topics.'),
  ('Chatgpt GO', 'The most affordable paid ChatGPT plan, with much higher limits than the free version.'),
  ('Chatgpt Plus', 'Access to OpenAI''s latest models, faster responses, plus file and image analysis.'),
  ('Claude AI', 'Anthropic''s AI assistant, strong at long-form writing, polishing documents, and reading files.'),
  ('Gemini AI', 'Google''s AI connected to Search, Docs, and Gmail, ideal if you work in the Google ecosystem.'),
  ('Perplexity AI', 'An answer engine that always cites its sources, great for research and coursework.'),
  ('Canva', 'Design posters, CVs, presentations, and social media content with thousands of ready-made templates.'),
  ('Polarr', 'Photo editor with thousands of community-made filters and precise color control.'),
  ('Wink', 'AI video and photo enhancer from Meitu: upscale to 4K and fix blurry footage.'),
  ('SCRL', 'Collage and Instagram carousel maker with seamless transitions between slides.'),
  ('Ibis Paint', 'Digital drawing with hundreds of brushes, layers, and recordings of your drawing process.'),
  ('Picsart', 'Edit photos, remove objects, and make your own stickers in one app.'),
  ('VSCO', 'Film-style filters behind many aesthetic feeds, plus in-depth color controls.'),
  ('Alight Motion Pro', 'Advanced animation and visual effects right on your phone, a favorite among video editors.'),
  ('Dazz Cam', 'Analog camera effects, VHS filters, and light leaks for a vintage photo look.'),
  ('Capcut', 'The go-to video editor for TikTok creators: trending templates, auto captions, and background removal.'),
  ('Lightroom Pro', 'Adobe''s photo editor with presets, professional color correction, and sync across devices.'),
  ('Remini Web', 'Sharpens blurry photos and restores old ones using AI.'),
  ('Meitu VIP+', 'Face retouching, beauty filters, and photo templates popular across Asia.'),
  ('Zoom 100', 'Online meetings for up to 100 participants without the 40-minute cutoff.'),
  ('Grammarly', 'Checks English grammar and writing style, useful for essays and work emails.'),
  ('WPS Pro', 'A lightweight Office alternative for documents and PDFs, without watermarks.'),
  ('Quillbot', 'Paraphrases and summarizes text, helping you rewrite sentences without changing their meaning.'),
  ('Camscanner', 'Turns photos of documents into clean PDFs, with text recognition and signatures.'),
  ('Duolingo', 'Learn a foreign language through short daily lessons; the paid version is ad-free with unlimited hearts.'),
  ('Scribd', 'A digital library of ebooks, audiobooks, and academic documents.'),
  ('Goodnotes', 'Handwritten notes on your tablet, PDF annotation, and tidy lecture notes.'),
  ('MS 365', 'Word, Excel, PowerPoint, and OneDrive storage in one subscription.'),
  ('Spotify', 'Ad-free music and podcasts that you can download and play offline.'),
  ('Apple Music', 'A complete music catalog with lossless quality and spatial audio, without ads.'),
  ('IFAKE', 'Creates mock chat screenshots for content, mockups, or jokes.')
) as v(n, d)
where a.name = v.n and a.description_en is null;

-- ---------------------------------------------------------------- 2. pengaturan toko
create table if not exists public.store_settings (
  id              int primary key default 1 check (id = 1),
  whatsapp_number text,                  -- format internasional tanpa +, mis. 6281234567890
  payment_info    text,                  -- cara bayar (Indonesia), dikirim di pesan WhatsApp
  payment_info_en text,
  usd_rate        numeric check (usd_rate is null or usd_rate > 0),   -- rupiah per 1 USD
  usd_rate_source text,
  usd_rate_at     timestamptz,
  orders_open     boolean not null default true,
  updated_at      timestamptz not null default now()
);
insert into public.store_settings default values on conflict (id) do nothing;

-- ---------------------------------------------------------------- 3. penjelasan tipe paket
-- keywords dicocokkan per kata pada nama tipe paket: "Private (5 Profile)" cocok dengan 'private',
-- tapi "Semiprivate" tidak (bisa ditambah sendiri sebagai entri lain di panel admin).
create table if not exists public.plan_type_info (
  id           bigint generated always as identity primary key,
  keywords     text[] not null,
  title        text not null,
  title_en     text,
  body         text not null,
  body_en      text,
  pros         text,      -- satu poin per baris
  pros_en      text,
  cons         text,
  cons_en      text,
  sort         int not null default 0,
  is_published boolean not null default true,
  updated_at   timestamptz not null default now()
);

insert into public.plan_type_info (keywords, title, title_en, body, body_en, pros, pros_en, cons, cons_en, sort)
select * from (values
  (array['sharing'],
   'Sharing (akun bersama)', 'Sharing (shared account)',
   'Kamu memakai satu akun premium bersama beberapa pembeli lain. Biasanya setiap pengguna mendapat profil atau slot sendiri, sedangkan akun utamanya dikelola oleh kami.',
   'You use one premium account together with a few other buyers. Each user usually gets their own profile or slot, while we manage the main account.',
   E'Harga paling hemat\nCocok untuk mencoba atau pemakaian ringan\nTidak perlu mengurus tagihan langganan',
   E'The most affordable price\nGreat for trying an app or light use\nNo need to handle the subscription billing',
   E'Tidak boleh mengganti password atau pengaturan akun\nJumlah perangkat atau layar dibagi dengan pengguna lain\nDi beberapa aplikasi, profil atau riwayat bisa terlihat oleh pengguna lain',
   E'You may not change the password or account settings\nDevices or screens are shared with other users\nIn some apps, profiles or history can be seen by other users',
   10),
  (array['private', 'privat'],
   'Private (akun pribadi)', 'Private (personal account)',
   'Akun premium hanya untukmu. Kamu tidak berbagi dengan pembeli lain, jadi profil dan slot perangkat di paket itu bisa kamu pakai sendiri atau bersama keluarga.',
   'A premium account just for you. You do not share it with other buyers, so the profiles and device slots in the plan are yours or your family''s to use.',
   E'Tidak berbagi dengan orang yang tidak dikenal\nProfil dan slot perangkat untukmu\nLebih leluasa mengatur profil dan preferensi',
   E'No sharing with strangers\nProfiles and device slots are all yours\nMore freedom to set up profiles and preferences',
   E'Harga lebih tinggi daripada sharing\nKalau hanya dipakai sesekali, sharing biasanya lebih hemat',
   E'Costs more than sharing\nIf you only use it occasionally, sharing is usually better value',
   20)
) as v
where not exists (select 1 from public.plan_type_info);

-- ---------------------------------------------------------------- 4. FAQ beranda
create table if not exists public.site_faqs (
  id           bigint generated always as identity primary key,
  question     text not null,
  answer       text not null default '',
  question_en  text,
  answer_en    text,
  sort         int not null default 0,
  is_published boolean not null default false,   -- draf tidak tampil di website
  updated_at   timestamptz not null default now()
);

insert into public.site_faqs (question, answer, question_en, answer_en, sort, is_published)
select * from (values
  ('Bagaimana cara memesan?',
   'Pilih aplikasi dan paketnya, klik Pesan sekarang, lalu isi nama dan nomor WhatsApp. Kamu akan diarahkan ke WhatsApp kami dengan pesan berisi kode pesanan dan totalnya. Setelah pembayaran dikonfirmasi, admin mengirimkan detail akunnya.',
   'How do I order?',
   'Choose an app and plan, tap Order now, then enter your name and WhatsApp number. You will be taken to our WhatsApp with a message containing your order code and total. Once payment is confirmed, our admin sends you the account details.',
   10, true),
  ('Apa beda paket Sharing dan Private?',
   'Sharing berarti satu akun premium dipakai bersama beberapa pembeli, jadi harganya paling hemat. Private berarti akun hanya untukmu. Penjelasan lengkap beserta kelebihan dan kekurangannya ada di halaman setiap aplikasi.',
   'What is the difference between Sharing and Private plans?',
   'Sharing means one premium account is used by several buyers, so it is the cheapest option. Private means the account is yours alone. Each app page explains both in detail, including the pros and cons.',
   20, true),
  ('Apakah harga dan stok di website selalu terbaru?',
   'Ya. Harga dan label Tersedia/Habis diambil langsung dari katalog kami setiap kali halaman dibuka.',
   'Are the prices and stock on the website always up to date?',
   'Yes. Prices and the Available/Sold out labels come straight from our catalog every time you open a page.',
   30, true),
  ('Bagaimana kalau paket yang kuinginkan habis?',
   'Paket berlabel Habis belum bisa dipesan. Pilih durasi atau tipe paket lain, atau tanyakan jadwal restock lewat WhatsApp.',
   'What if the plan I want is sold out?',
   'Plans marked Sold out cannot be ordered yet. Pick another duration or plan type, or ask us about restocking on WhatsApp.',
   40, true),
  ('Apakah harga bisa dilihat dalam dolar AS?',
   'Bisa. Ganti bahasa ke English di bagian atas halaman, dan harga tampil dalam dolar AS memakai kurs terbaru sebagai perkiraan. Pembayaran tetap mengikuti instruksi admin di WhatsApp.',
   'Can I see prices in US dollars?',
   'Yes. In English mode, prices are shown in US dollars using the latest exchange rate as an estimate. Payment follows the instructions our admin sends on WhatsApp.',
   50, true),
  ('Metode pembayaran apa saja yang diterima?', '', 'Which payment methods do you accept?', null, 60, false),
  ('Berapa lama akun dikirim setelah pembayaran?', '', 'How long does it take to receive my account after paying?', null, 70, false),
  ('Apakah ada garansi?', '', 'Is there a warranty?', null, 80, false),
  ('Bagaimana kalau akun bermasalah di tengah masa langganan?', '', 'What if my account has a problem during the subscription?', null, 90, false)
) as v
where not exists (select 1 from public.site_faqs);

-- ---------------------------------------------------------------- RLS tabel baru
alter table public.store_settings enable row level security;
alter table public.plan_type_info enable row level security;
alter table public.site_faqs      enable row level security;

create policy publik_baca on public.store_settings for select to anon, authenticated using (true);
create policy publik_baca on public.plan_type_info for select to anon, authenticated using (is_published or (select public.is_admin()));
create policy publik_baca on public.site_faqs      for select to anon, authenticated using (is_published or (select public.is_admin()));
do $$
declare t text;
begin
  foreach t in array array['store_settings', 'plan_type_info', 'site_faqs'] loop
    execute format('create policy admin_semua on public.%I for all to authenticated
                    using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- 5. katalog_json versi 3
-- Tambahan: cat.label_en, cat.desc_en, app.desc_en. Kunci lama tetap.
create or replace function public.katalog_json() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'updated', to_char((select max(updated_at) from public.variants) at time zone 'Asia/Jakarta', 'YYYY-MM-DD'),
    'cats', coalesce(jsonb_agg(jsonb_build_object('label', c.label, 'desc', coalesce(c.description, ''),
                                                  'label_en', c.label_en, 'desc_en', c.description_en, 'apps', ai.apps)
                               order by c.sort, c.id) filter (where ai.apps is not null), '[]'::jsonb))
  from public.categories c
  cross join lateral (
    select jsonb_agg(jsonb_build_object('id', a.id, 'slug', a.slug, 'name', a.name, 'desc', coalesce(a.description, ''),
                                        'desc_en', a.description_en, 'logo', a.logo_url, 'featured', a.is_featured,
                                        'groups', gi.groups)
                     order by a.sort, a.id) filter (where gi.groups is not null) as apps
    from public.apps a
    cross join lateral (
      select jsonb_agg(jsonb_build_object('label', g.label, 'items', vi.items) order by g.sort, g.id)
               filter (where vi.items is not null) as groups
      from public.plan_groups g
      cross join lateral (
        select jsonb_agg(jsonb_build_object('id', v.code, 'd', v.label, 'p', v.price,
                                            's', case v.stock when 'habis' then 0 else 1 end,
                                            'h', v.duration_days)
                         order by v.sort, v.id) as items
        from public.variants v
        where v.group_id = g.id and v.is_active
      ) vi
      where g.app_id = a.id
    ) gi
    where a.category_id = c.id and a.is_active
  ) ai
$$;
grant execute on function public.katalog_json() to anon, authenticated;

-- ---------------------------------------------------------------- 6. pesanan
create table if not exists public.orders (
  id            bigint generated always as identity primary key,
  code          text not null unique,
  customer_name text not null,
  customer_wa   text not null,
  lang          text not null default 'id' check (lang in ('id', 'en')),
  total         int  not null check (total > 0),
  total_usd     numeric,
  usd_rate      numeric,
  status        text not null default 'menunggu_bayar'
                check (status in ('menunggu_bayar', 'dibayar', 'aktif', 'selesai', 'batal')),
  starts_on     date,
  ends_on       date,
  admin_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_wa_idx on public.orders(customer_wa, created_at desc);

create table if not exists public.order_items (
  id            bigint generated always as identity primary key,
  order_id      bigint not null references public.orders(id) on delete cascade,
  variant_id    bigint references public.variants(id) on delete set null,
  variant_code  text not null,
  app_name      text not null,
  plan_label    text not null,
  variant_label text not null,
  price         int  not null,
  duration_days int
);
create index if not exists order_items_order_idx on public.order_items(order_id);

alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
-- data pembeli hanya untuk admin; pembeli membuat pesanan lewat RPC buat_pesanan
create policy admin_semua on public.orders for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_semua on public.order_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Membuat pesanan. Harga SELALU diambil dari database, bukan dari browser.
create or replace function public.buat_pesanan(p_items jsonb, p_nama text, p_wa text, p_bahasa text default 'id')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s       public.store_settings;
  v_nama  text := btrim(coalesce(p_nama, ''));
  v_wa    text := regexp_replace(coalesce(p_wa, ''), '\D', '', 'g');
  v_lang  text := case when p_bahasa = 'en' then 'en' else 'id' end;
  v_code  text;
  v_order bigint;
  v_total int := 0;
  v_items jsonb := '[]'::jsonb;
  r       record;
  c       text;
  v_codes text[];
begin
  select * into s from public.store_settings where id = 1;
  if s.whatsapp_number is null or not s.orders_open then
    raise exception 'Pemesanan belum dibuka';
  end if;
  if length(v_nama) < 2 or length(v_nama) > 60 then
    raise exception 'Nama harus 2 sampai 60 huruf';
  end if;
  if v_wa like '0%' then v_wa := '62' || substr(v_wa, 2);
  elsif v_wa like '8%' and length(v_wa) between 9 and 13 then v_wa := '62' || v_wa;
  end if;
  if length(v_wa) < 9 or length(v_wa) > 15 then
    raise exception 'Nomor WhatsApp tidak valid';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 10 then
    raise exception 'Pilih 1 sampai 10 paket';
  end if;
  if (select count(*) from public.orders where customer_wa = v_wa and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Terlalu banyak pesanan dari nomor ini. Coba lagi 10 menit lagi atau hubungi kami di WhatsApp.';
  end if;
  -- rem darurat kalau ada yang mengirim pesanan palsu terus-menerus dengan nomor berbeda-beda
  if (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Sedang banyak pesanan. Coba lagi beberapa menit lagi atau hubungi kami di WhatsApp.';
  end if;

  select array_agg(distinct e->>'code') into v_codes from jsonb_array_elements(p_items) e;

  v_code := 'IX' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
  insert into public.orders (code, customer_name, customer_wa, lang, total)
  values (v_code, v_nama, v_wa, v_lang, 1)          -- total diisi setelah item dihitung
  returning id into v_order;

  foreach c in array v_codes loop
    select v.id, v.code, v.label, v.price, v.stock, v.duration_days, g.label as tipe, a.name as aplikasi
      into r
    from public.variants v
    join public.plan_groups g on g.id = v.group_id
    join public.apps a on a.id = g.app_id
    where v.code = c and v.is_active and a.is_active;
    if r.id is null then raise exception 'Paket % tidak tersedia', c; end if;
    if r.stock = 'habis' then raise exception 'Paket % % sedang habis', r.aplikasi, r.label; end if;
    insert into public.order_items (order_id, variant_id, variant_code, app_name, plan_label, variant_label, price, duration_days)
    values (v_order, r.id, r.code, r.aplikasi, r.tipe, r.label, r.price, r.duration_days);
    v_total := v_total + r.price;
    v_items := v_items || jsonb_build_object('aplikasi', r.aplikasi, 'tipe', r.tipe, 'varian', r.label, 'harga', r.price);
  end loop;

  update public.orders set
    total = v_total,
    usd_rate = s.usd_rate,
    total_usd = case when s.usd_rate is not null then round(ceil(v_total / s.usd_rate * 100) / 100, 2) end
  where id = v_order;

  return jsonb_build_object(
    'kode', v_code, 'total', v_total,
    'total_usd', case when s.usd_rate is not null then round(ceil(v_total / s.usd_rate * 100) / 100, 2) end,
    'items', v_items, 'whatsapp', s.whatsapp_number,
    'pembayaran', case when v_lang = 'en' then coalesce(s.payment_info_en, s.payment_info) else s.payment_info end);
end $$;

revoke execute on function public.buat_pesanan(jsonb, text, text, text) from public;
grant execute on function public.buat_pesanan(jsonb, text, text, text) to anon, authenticated;

-- Mengubah status pesanan (admin). Saat jadi "aktif", tanggal mulai = hari ini (WIB) dan
-- tanggal berakhir = mulai + durasi terpanjang dari paket di pesanan itu.
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

  update public.orders set
    status = p_status,
    starts_on = v_mulai,
    ends_on = case when v_mulai is not null and v_hari is not null then v_mulai + v_hari else ends_on end,
    admin_note = coalesce(p_catatan, admin_note),
    updated_at = now()
  where id = o.id
  returning * into o;
  return to_jsonb(o);
end $$;

revoke execute on function public.ubah_status_pesanan(text, text, text) from public, anon;
grant execute on function public.ubah_status_pesanan(text, text, text) to authenticated;
