-- ============================================================================
-- Info Film: jadwal Desember 2026 & Januari 2027
--   1. Film/serial yang tayang sebelum 1 November 2026 disembunyikan (is_active = false),
--      TIDAK dihapus: bisa diaktifkan lagi kapan saja dari panel Film.
--   2. Tambah 18 judul original platform yang tayang 1 Desember 2026 s.d. 22 Januari 2027
--      (Netflix, Prime Video, Disney+). Tanggal mengikuti pengumuman resmi/media per 27 Nov 2026.
--   Poster dikosongkan: halaman Info Film otomatis memakai sampul bawaan bergaya IXVII.CO
--   (nama platform + judul). Poster bisa diunggah dari panel Film bila kamu punya izinnya.
-- Aman dijalankan ulang: judul + aplikasi yang sudah ada dilewati.
-- ============================================================================

-- ---------------------------------------------------------------- 1. sembunyikan jadwal lama
update public.films
set is_active = false, updated_at = now()
where is_active and release_on < date '2026-11-01';

-- ---------------------------------------------------------------- 2. jadwal baru
insert into public.films (title, kind, app_id, release_on, ends_on, genre, synopsis, synopsis_en)
select v.judul, v.jenis, a.id, v.rilis::date, v.akhir::date, v.genre, v.sinopsis, v.sinopsis_en
from (values
  -- ===== Desember 2026
  ('Trinity', 'serial', 'netflix', '2026-12-01', null, 'Thriller, Politik',
   'Seorang perwira angkatan laut (Gugu Mbatha-Raw) menjalin kedekatan dengan menteri pertahanan (Richard Madden), lalu menemukan jejak rahasia yang mungkin mengaitkannya dengan ancaman global. Tujuh episode sekaligus.',
   'A heroic naval officer (Gugu Mbatha-Raw) grows close to the secretary of defense (Richard Madden) and uncovers secrets that may tie him to a global threat. Seven episodes at once.'),
  ('The Man with the Bag', 'film', 'amazon-prime-video', '2026-12-02', null, 'Aksi, Komedi, Natal',
   'Karung hadiah Sinterklas (Arnold Schwarzenegger) dicuri. Ia merekrut Vance (Alan Ritchson), pencuri dari daftar anak nakal, untuk merebutnya kembali sebelum Natal.',
   'Santa Claus (Arnold Schwarzenegger) has his sack of presents stolen and recruits Vance (Alan Ritchson), a thief from his naughty list, to steal it back before Christmas.'),
  ('La Bola Negra', 'film', 'netflix', '2026-12-02', null, 'Drama',
   'Film Spanyol yang digadang-gadang menjadi salah satu pesaing kuat Oscar 2027, dibintangi deretan talenta Spanyol.',
   'A Spanish film tipped as a major Oscars 2027 contender, featuring a slate of Spanish talent.'),
  ('Pride and Prejudice', 'serial', 'netflix', '2026-12-03', null, 'Drama, Romansa, Klasik',
   'Adaptasi baru novel Jane Austen karya Dolly Alderton dalam enam episode. Emma Corrin sebagai Elizabeth Bennet, Jack Lowden sebagai Mr. Darcy, dan Olivia Colman sebagai Mrs. Bennet.',
   'Dolly Alderton''s six-part adaptation of Jane Austen''s classic, with Emma Corrin as Elizabeth Bennet, Jack Lowden as Mr. Darcy and Olivia Colman as Mrs. Bennet.'),
  ('Diary of a Wimpy Kid Christmas: The Getaway', 'film', 'disney', '2026-12-04', null, 'Animasi, Keluarga, Komedi',
   'Greg Heffley dan keluarganya kembali dalam petualangan liburan Natal yang kacau di film animasi terbaru Diary of a Wimpy Kid.',
   'Greg Heffley and his family return for a chaotic Christmas getaway in the latest animated Diary of a Wimpy Kid film.'),
  ('The December Breeze', 'serial', 'netflix', '2026-12-04', null, 'Drama',
   'Serial drama Kolombia tentang empat sahabat dari kalangan atas yang melawan aturan dunia mereka dan menemukan bahwa hasrat bisa menentukan takdir.',
   'A Colombian drama about four high-society friends who defy the norms of their world and discover that desire can shape their destiny.'),
  ('Sacred Jewel', 'serial', 'amazon-prime-video', '2026-12-05', null, 'Drakor, Sejarah',
   'Drama sejarah Korea (judul lain: The Bead of God) yang dibintangi Ahn Bo-hyun, Lee Sung-min, Claudia Kim, dan Ha Yoon-kyung.',
   'A Korean historical drama (also known as The Bead of God) starring Ahn Bo-hyun, Lee Sung-min, Claudia Kim and Ha Yoon-kyung.'),
  ('Tantara', 'serial', 'netflix', '2026-12-11', '2026-12-25', 'Drakor, Sejarah, Musik',
   'Song Hye-kyo dan Gong Yoo beradu akting di industri hiburan Korea era 1960-an sampai 1980-an. Min-ja berjuang keluar dari kemiskinan dan masuk ke dunia rekaman, didukung sahabat kecilnya, Dong-gu.',
   'Song Hye-kyo and Gong Yoo star in a story set in Korea''s entertainment industry from the 1960s to the 1980s, as Min-ja fights her way out of poverty into the recording business with help from childhood friend Dong-gu.'),
  ('Give Me Some Sugah', 'film', 'netflix', '2026-12-16', null, 'Komedi, Romansa',
   'Seorang perempuan Chicago (Taraji P. Henson) mempertaruhkan segalanya untuk membuka toko kue impiannya, lalu sebuah pertemuan tak terduga mengubah hidupnya.',
   'A Chicago woman (Taraji P. Henson) risks it all to open her dream bakery, and a fateful encounter changes everything.'),
  ('Beast Games Musim 3', 'serial', 'amazon-prime-video', '2026-12-16', null, 'Reality, Kompetisi',
   'Kompetisi berhadiah raksasa dari MrBeast kembali dengan edisi juara dunia.',
   'MrBeast''s mega-prize competition returns with a world champions edition.'),
  ('Mission: Cross 2', 'film', 'netflix', '2026-12-25', null, 'Aksi, Komedi',
   'Lanjutan film aksi komedi Korea yang kembali dibintangi Hwang Jung-min dan Yeom Jung-ah.',
   'The Korean action-comedy sequel, with Hwang Jung-min and Yeom Jung-ah returning.'),
  -- ===== Januari 2027
  ('The Twin', 'serial', 'netflix', '2027-01-01', null, 'Kriminal, Thriller',
   'Jamie Dornan memerankan dua tokoh, si kembar Adam dan Lee, dalam serial noir kriminal Inggris enam episode yang diadaptasi dari serial Norwegia Twin.',
   'Jamie Dornan plays twins Adam and Lee in a six-part British crime noir adapted from the Norwegian series Twin.'),
  ('Ink', 'film', 'netflix', '2027-01-08', null, 'Drama',
   'Film drama garapan Danny Boyle dengan naskah James Graham, dibintangi Jack O''Connell, Guy Pearce, dan Claire Foy.',
   'A drama directed by Danny Boyle and written by James Graham, starring Jack O''Connell, Guy Pearce and Claire Foy.'),
  ('3 Body Problem Musim 2', 'serial', 'netflix', '2027-01-14', null, 'Fiksi Ilmiah, Drama',
   'Musim kedua serial fiksi ilmiah tentang kontak manusia dengan peradaban asing dan ancamannya bagi Bumi.',
   'The second season of the sci-fi series about humanity''s contact with an alien civilization and the threat it poses to Earth.'),
  ('The Take', 'film', 'netflix', '2027-01-15', null, 'Drama, Thriller',
   'Film thriller dengan deretan bintang besar: Denzel Washington, Robert Pattinson, dan Daisy Edgar-Jones.',
   'A thriller starring Denzel Washington, Robert Pattinson and Daisy Edgar-Jones.'),
  ('Blue Eye Samurai Musim 2', 'serial', 'netflix', '2027-01-19', null, 'Anime, Aksi',
   'Musim kedua serial animasi aksi tentang Mizu, pendekar pedang bermata biru yang menempuh jalan balas dendam di Jepang era Edo.',
   'The second season of the animated action series about Mizu, a blue-eyed sword master on a path of revenge in Edo-era Japan.'),
  ('Ginny & Georgia Musim 4', 'serial', 'netflix', '2027-01-21', null, 'Drama, Komedi',
   'Ibu muda Georgia dan putrinya Ginny kembali. Semua 10 episode musim keempat tayang sekaligus.',
   'Young mom Georgia and her daughter Ginny are back, with all 10 episodes of season four dropping at once.'),
  ('The Palace of Secrets', 'serial', 'netflix', '2027-01-22', null, 'Drama',
   'Serial drama original Netflix berbahasa asing yang membuka jadwal tayang awal 2027.',
   'A foreign-language Netflix original drama series arriving in early 2027.')
) as v(judul, jenis, app, rilis, akhir, genre, sinopsis, sinopsis_en)
left join public.apps a on a.slug = v.app
where not exists (select 1 from public.films f where lower(f.title) = lower(v.judul) and f.app_id is not distinct from a.id);
