-- ============================================================================
-- Tahap 9: profil owner dan direktori mitra resmi
--   1. owner_profile : satu baris profil pemilik untuk halaman Tentang (bisa diedit di panel admin)
--   2. partners      : reseller & affiliator. Tabelnya hanya untuk admin; pengunjung lewat mitra_json(),
--                      dan kontak (WA/Instagram) hanya dikirim kalau mitra mengizinkan (show_contact).
--   3. bucket Storage publik "profiles" untuk foto owner & mitra
-- Jalankan di SQL Editor Supabase SETELAH migration Tahap 8. Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------- 1. profil owner
create table if not exists public.owner_profile (
  id           int primary key default 1 check (id = 1),
  name         text not null,
  full_name    text,
  role         text,
  role_en      text,
  city         text,
  city_en      text,
  quote        text,
  about        text,
  about_en     text,
  highlights   jsonb  not null default '[]'::jsonb,   -- [{title, title_en, body, body_en}]
  interests    text[] not null default '{}',
  interests_en text[] not null default '{}',
  photo_url    text,
  updated_at   timestamptz not null default now()
);

insert into public.owner_profile (id, name, full_name, role, role_en, city, city_en, quote, about, about_en, highlights, interests, interests_en, photo_url)
values (1,
  'Rahul Paris',
  'Muhammad Rahul Paris Kurniawan',
  'Founder & Lead Admin',
  'Founder & Lead Admin',
  'Kediri, Jawa Timur',
  'Kediri, East Java',
  'Building smart digital solutions with integrity, passion, and creative vision.',
  E'Halo, saya Rahul. Saya membangun IXVII.CO supaya langganan aplikasi premium terasa mudah dan bisa dipercaya: akses cepat, bergaransi, dan setiap pesanan dilayani langsung lewat WhatsApp.\n\nLatar belakang saya ada di desain grafis, media digital, dan pendidikan. Dari situ saya belajar bahwa sesuatu yang rapi dan jelas membuat orang merasa aman. Prinsip yang sama saya pakai di IXVII.CO, termasuk untuk teman-teman yang ingin tumbuh bersama lewat program reseller dan affiliate.',
  E'Hi, I''m Rahul. I built IXVII.CO so premium app subscriptions feel simple and trustworthy: fast access, a warranty, and every order handled personally over WhatsApp.\n\nMy background is in graphic design, digital media, and education. It taught me that clear, well-made things make people feel safe. I run IXVII.CO on the same principle, including for friends who want to grow with us through our reseller and affiliate programs.',
  '[{"title": "Operasional digital", "title_en": "Digital operations",
     "body": "Mengelola ekosistem IXVII.CO, otomatisasi dengan Google Apps Script & Sheets, dan jaringan reseller & affiliate.",
     "body_en": "Running the IXVII.CO ecosystem, automation with Google Apps Script & Sheets, and our reseller & affiliate network."},
    {"title": "Desain & media kreatif", "title_en": "Creative design & media",
     "body": "Desain grafis, branding visual, vector art, dan pengarahan konten kreatif.",
     "body_en": "Graphic design, visual branding, vector art, and creative content direction."},
    {"title": "Pendidik & penulis", "title_en": "Educator & writer",
     "body": "Mahasiswa Studi Agama-Agama dan pengajar bahasa Arab & Inggris yang senang mengkaji literatur dan menulis.",
     "body_en": "Comparative religion student and Arabic & English teacher who enjoys literature and writing."}]'::jsonb,
  array['Smart casual & dark academia', 'Hybrid strength training', 'Musik & K-Pop', 'Kopi'],
  array['Smart casual & dark academia', 'Hybrid strength training', 'Music & K-Pop', 'Coffee'],
  '/assets/owner/rahul-paris.webp')
on conflict (id) do nothing;

alter table public.owner_profile enable row level security;
drop policy if exists publik_baca on public.owner_profile;
drop policy if exists admin_semua on public.owner_profile;
create policy publik_baca on public.owner_profile for select to anon, authenticated using (true);
create policy admin_semua on public.owner_profile for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- 2. mitra
create table if not exists public.partners (
  id            bigint generated always as identity primary key,
  name          text not null check (length(name) between 2 and 80),
  kind          text not null default 'reseller' check (kind in ('reseller', 'affiliator')),
  city          text,
  whatsapp      text,                       -- format 62812…
  instagram     text,                       -- tanpa @
  referral_code text unique,                -- huruf besar, dibuat otomatis kalau kosong
  photo_url     text,
  bio           text check (bio is null or length(bio) <= 200),
  is_verified   boolean not null default true,
  show_contact  boolean not null default false,   -- kontak tampil di website hanya dengan izin mitra
  is_active     boolean not null default true,
  sort          int not null default 0,
  joined_on     date default public.hari_ini_wib(),
  admin_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Rapikan data apa pun sumbernya (formulir, tempel teks, Excel)
create or replace function public._rapikan_mitra()
returns trigger
language plpgsql set search_path = '' as $$
declare
  v text;
  dasar text;
begin
  new.name := btrim(regexp_replace(coalesce(new.name, ''), '\s+', ' ', 'g'));
  -- "budi santoso" / "BUDI SANTOSO" → "Budi Santoso" (nama yang sudah bercampur huruf besar-kecil dibiarkan)
  if new.name = lower(new.name) or new.name = upper(new.name) then new.name := initcap(new.name); end if;
  new.city := nullif(btrim(regexp_replace(coalesce(new.city, ''), '\s+', ' ', 'g')), '');
  new.bio  := nullif(btrim(coalesce(new.bio, '')), '');

  v := regexp_replace(coalesce(new.whatsapp, ''), '\D', '', 'g');
  if v like '0%' then v := '62' || substr(v, 2);
  elsif v like '8%' then v := '62' || v;
  end if;
  new.whatsapp := nullif(v, '');

  v := lower(btrim(coalesce(new.instagram, '')));
  v := regexp_replace(v, '^.*instagram\.com/', '');
  v := split_part(split_part(v, '/', 1), '?', 1);
  v := regexp_replace(v, '[^a-z0-9._]', '', 'g');
  new.instagram := nullif(left(v, 30), '');

  new.referral_code := nullif(upper(regexp_replace(coalesce(new.referral_code, ''), '[^A-Za-z0-9]', '', 'g')), '');
  if new.referral_code is null then
    dasar := coalesce(nullif(left(upper(regexp_replace(new.name, '[^A-Za-z]', '', 'g')), 5), ''), 'MITRA');
    loop
      new.referral_code := dasar || lpad(floor(random() * 100)::int::text, 2, '0');
      exit when not exists (select 1 from public.partners p where p.referral_code = new.referral_code and p.id is distinct from new.id);
    end loop;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists rapikan_mitra on public.partners;
create trigger rapikan_mitra before insert or update on public.partners
  for each row execute function public._rapikan_mitra();

alter table public.partners enable row level security;
drop policy if exists admin_semua on public.partners;
create policy admin_semua on public.partners for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Daftar publik: hanya mitra aktif; nomor WA & Instagram hanya kalau mitra mengizinkan.
create or replace function public.mitra_json()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'nama', p.name, 'jenis', p.kind, 'kota', p.city, 'kode', p.referral_code,
           'foto', p.photo_url, 'bio', p.bio, 'verified', p.is_verified, 'sejak', to_char(p.joined_on, 'YYYY-MM'),
           'wa', case when p.show_contact then p.whatsapp end,
           'ig', case when p.show_contact then p.instagram end)
         order by p.sort, p.name), '[]'::jsonb)
  from public.partners p
  where p.is_active
$$;
grant execute on function public.mitra_json() to anon, authenticated;

-- ---------------------------------------------------------------- 3. bucket foto
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;
drop policy if exists profiles_admin_tambah on storage.objects;
drop policy if exists profiles_admin_ubah on storage.objects;
drop policy if exists profiles_admin_hapus on storage.objects;
create policy profiles_admin_tambah on storage.objects for insert to authenticated
  with check (bucket_id = 'profiles' and (select public.is_admin()));
create policy profiles_admin_ubah on storage.objects for update to authenticated
  using (bucket_id = 'profiles' and (select public.is_admin()))
  with check (bucket_id = 'profiles' and (select public.is_admin()));
create policy profiles_admin_hapus on storage.objects for delete to authenticated
  using (bucket_id = 'profiles' and (select public.is_admin()));
