-- ============================================================================
-- Tahap 11 (persiapan launch): halaman kebijakan yang bisa diubah dari panel admin
--   site_pages: syarat layanan, kebijakan privasi, garansi & refund (Indonesia + Inggris)
--   Isi awal = DRAF. Periksa dan sesuaikan di panel admin → Toko & konten → Halaman kebijakan.
-- Format isi: ## Judul, ### Subjudul, paragraf, daftar "- " atau "1. ", **tebal**, [teks](https://…).
-- Jalankan di SQL Editor Supabase SETELAH migration affiliate. Aman dijalankan ulang
-- (isi yang sudah kamu ubah tidak ditimpa).
-- ============================================================================

create table if not exists public.site_pages (
  slug        text primary key check (slug in ('syarat', 'privasi', 'garansi')),
  title       text not null check (length(title) between 2 and 80),
  title_en    text,
  body        text not null default '' check (length(body) <= 20000),
  body_en     text check (body_en is null or length(body_en) <= 20000),
  updated_at  timestamptz not null default now()
);
alter table public.site_pages enable row level security;
drop policy if exists publik_baca on public.site_pages;
create policy publik_baca on public.site_pages for select to anon, authenticated using (true);
drop policy if exists admin_semua on public.site_pages;
create policy admin_semua on public.site_pages for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.site_pages (slug, title, title_en, body, body_en) values
('syarat', 'Syarat layanan', 'Terms of service',
$id$IXVII.CO menjual akses langganan aplikasi premium (streaming, AI, editing, dan lainnya) dalam bentuk akun sharing atau private sesuai paket yang dipilih. IXVII.CO bukan bagian dari dan tidak berafiliasi dengan platform aplikasi yang dijual.

## Pemesanan dan pembayaran

1. Pilih paket di website, lalu kirim pesanan lewat WhatsApp dari keranjang.
2. Admin mengonfirmasi ketersediaan dan mengirim cara pembayaran.
3. Akun dikirim setelah pembayaran terkonfirmasi.

Harga yang berlaku adalah harga saat pesanan dibuat. Harga dapat berubah sewaktu-waktu tanpa mengubah pesanan yang sudah dibayar.

## Masa aktif

- Masa aktif dihitung sejak akun dikirim dan pesanan berstatus Aktif, bukan sejak pesanan dibuat.
- Paket 1 bulan berlaku 27 sampai 30 hari, mengikuti siklus tagihan akun dari platform.
- Pengingat dikirim lewat WhatsApp sebelum masa aktif berakhir bagi pembeli yang sudah mengaktifkan garansi.

## Aturan pemakaian

- Jangan mengubah email, password, nama profil, atau pengaturan akun kecuali admin mengizinkan.
- Pakai hanya profil dan jumlah perangkat yang sesuai paket.
- Jangan membagikan akun ke orang lain di luar paket yang dibeli.

Pelanggaran aturan ini membuat garansi gugur dan akses dapat dihentikan tanpa pengembalian dana.

## Kontak

Pertanyaan tentang pesanan, garansi, atau syarat ini dapat dikirim lewat WhatsApp admin yang tertera di website.$id$,
$en$IXVII.CO sells access to premium app subscriptions (streaming, AI, editing, and more) as shared or private accounts according to the plan you choose. IXVII.CO is not part of and is not affiliated with the platforms whose subscriptions it sells.

## Orders and payment

1. Choose a plan on the website, then send your order on WhatsApp from the cart.
2. The admin confirms availability and sends payment instructions.
3. Your account is sent once payment is confirmed.

The price that applies is the price when the order was made. Prices may change at any time without affecting orders that have already been paid.

## Active period

- The active period starts when the account is delivered and the order is marked Active, not when the order is created.
- A 1-month plan lasts 27 to 30 days, following the platform's billing cycle.
- Buyers who have activated their warranty receive a WhatsApp reminder before the active period ends.

## Usage rules

- Do not change the email, password, profile name, or account settings unless the admin allows it.
- Use only the profile and number of devices included in your plan.
- Do not share the account with people outside the plan you bought.

Breaking these rules voids the warranty, and access may be stopped without a refund.

## Contact

Questions about orders, warranties, or these terms can be sent to the admin WhatsApp number shown on the website.$en$),

('privasi', 'Kebijakan privasi', 'Privacy policy',
$id$Halaman ini menjelaskan data apa yang dikumpulkan IXVII.CO, untuk apa, dan bagaimana kamu bisa meminta datamu dihapus.

## Data yang dikumpulkan

- **Saat memesan:** nama dan nomor WhatsApp, paket yang dipilih, dan riwayat pesanan.
- **Saat aktivasi garansi:** nomor HP aktif, perangkat yang dipakai, dan screenshot bukti berhasil login.
- **Saat menulis ulasan:** rating dan isi ulasan. Nama ditampilkan disamarkan (misalnya "Siti N.") atau sebagai anonim.
- **Mitra dan affiliate:** nama, kontak, kode referral, catatan penjualan, dan tujuan pembayaran komisi.

## Untuk apa data dipakai

- Memproses pesanan dan mengirim akun.
- Menjalankan garansi dan mengirim pengingat sebelum masa aktif berakhir.
- Menghitung dan membayar komisi mitra.

Data tidak dijual dan tidak dibagikan ke pihak lain untuk iklan.

## Penyimpanan dan keamanan

- Data disimpan di database Supabase dengan akses yang dibatasi untuk admin.
- Screenshot garansi disimpan di penyimpanan privat yang hanya bisa dibuka admin.
- Kontak mitra hanya tampil di halaman Mitra resmi kalau mitra tersebut mengizinkan.

## Penyimpanan di browser

Website menyimpan pilihan bahasa, tema, dan isi keranjang di browsermu sendiri. Tidak ada cookie iklan atau pelacak pihak ketiga.

## Layanan pihak ketiga

Website memakai Supabase (database), Netlify (hosting), Google Fonts (huruf), dan WhatsApp (pemesanan). Layanan tersebut dapat menerima alamat IP saat halaman dibuka.

## Hak kamu

Kamu bisa meminta salinan atau penghapusan datamu lewat WhatsApp admin. Data pesanan yang masih dibutuhkan untuk garansi atau pembukuan dapat disimpan sampai keperluannya selesai.$id$,
$en$This page explains what data IXVII.CO collects, why, and how you can ask for your data to be deleted.

## Data we collect

- **When you order:** your name and WhatsApp number, the plan you chose, and your order history.
- **When you activate a warranty:** your active phone number, the device you use, and a screenshot showing you have logged in.
- **When you write a review:** your rating and review. Your name is shown shortened (for example "Siti N.") or as anonymous.
- **Partners and affiliates:** name, contact details, referral code, sales records, and commission payout details.

## How we use it

- To process orders and deliver accounts.
- To run warranties and send reminders before your active period ends.
- To calculate and pay partner commissions.

We do not sell your data or share it with others for advertising.

## Storage and security

- Data is stored in a Supabase database with access limited to the admin.
- Warranty screenshots are kept in private storage that only the admin can open.
- Partner contact details appear on the Official partners page only with the partner's permission.

## Browser storage

The website stores your language, theme, and cart in your own browser. There are no advertising cookies or third-party trackers.

## Third-party services

The website uses Supabase (database), Netlify (hosting), Google Fonts (typefaces), and WhatsApp (ordering). These services may receive your IP address when a page loads.

## Your rights

You can ask for a copy of your data or for it to be deleted via the admin WhatsApp. Order data still needed for a warranty or bookkeeping may be kept until that need ends.$en$),

('garansi', 'Garansi & refund', 'Warranty & refunds',
$id$## Cara mengaktifkan garansi

1. Setelah menerima akun dan berhasil login, buka link aktivasi garansi yang dikirim admin (atau balas pesan aktivasi di WhatsApp).
2. Isi nama, nomor HP aktif, perangkat yang dipakai, dan unggah screenshot bukti sudah berhasil login.
3. Kirim **dalam 1x24 jam** sejak akun dikirim.

Garansi hanya aktif jika form dikirim dalam 1x24 jam. Pembeli yang tidak mengirim form tetap bisa memakai akun sampai masa aktif berakhir, tetapi tanpa garansi.

## Yang ditanggung garansi

Selama masa aktif, jika akun tidak bisa login atau fitur premium hilang **bukan karena kesalahan pembeli**, admin akan memperbaiki akun atau menggantinya dengan akun lain.

Hubungi admin lewat WhatsApp dengan menyertakan kode pesanan dan screenshot masalahnya.

## Yang tidak ditanggung

- Melanggar aturan pemakaian di Syarat layanan (mengubah password atau profil, memakai perangkat melebihi paket, membagikan akun).
- Salah memilih paket atau perangkat yang tidak didukung platform.
- Masa aktif yang sudah berakhir.

## Refund

- **Belum bayar:** pesanan bisa dibatalkan kapan saja tanpa biaya.
- **Sudah bayar tapi akun belum dikirim** (misalnya stok habis): dana dikembalikan penuh.
- **Akun sudah dikirim:** pembayaran tidak dapat dikembalikan, kecuali admin tidak dapat memperbaiki atau mengganti akun dalam masa garansi. Dalam hal itu, dana dikembalikan sebanding dengan sisa hari masa aktif.

Refund dikirim ke rekening atau e-wallet yang kamu sebutkan ke admin.$id$,
$en$## How to activate your warranty

1. After you receive the account and log in successfully, open the warranty activation link from the admin (or reply to the activation message on WhatsApp).
2. Fill in your name, active phone number, the device you use, and upload a screenshot showing you have logged in.
3. Send it **within 24 hours** of receiving the account.

The warranty is only active if the form is sent within 24 hours. Buyers who do not send the form can still use the account until the active period ends, but without a warranty.

## What the warranty covers

During the active period, if the account cannot log in or premium features disappear **through no fault of the buyer**, the admin will fix the account or replace it with another one.

Contact the admin on WhatsApp with your order code and a screenshot of the problem.

## What is not covered

- Breaking the usage rules in the Terms of service (changing the password or profile, using more devices than the plan allows, sharing the account).
- Choosing the wrong plan, or a device the platform does not support.
- Active periods that have already ended.

## Refunds

- **Not yet paid:** you can cancel the order at any time at no cost.
- **Paid but the account has not been sent** (for example, out of stock): full refund.
- **Account already sent:** payments are not refunded, unless the admin cannot fix or replace the account during the warranty period. In that case, the refund is proportional to the remaining days of the active period.

Refunds are sent to the bank account or e-wallet you give the admin.$en$)
on conflict (slug) do nothing;
