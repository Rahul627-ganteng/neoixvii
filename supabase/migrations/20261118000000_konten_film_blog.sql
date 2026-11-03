-- ============================================================================
-- Konten Info Film & Blog
--   1. posts.topik : kategori artikel (aplikasi / tips / islami / berita) untuk filter di halaman Blog
--   2. films       : 95 film & serial yang sedang dan akan tayang di aplikasi streaming,
--                    lengkap dengan sinopsis (ID + EN) dan poster info bergaya IXVII.CO
--                    (/assets/film/...). Poster resmi bisa diunggah dari panel Film untuk menggantinya.
--   3. posts       : 35 artikel (25 tentang aplikasi & tips, 10 Islami), masing-masing dengan
--                    sampul dan infografis (/assets/blog/...)
-- Jalankan di SQL Editor Supabase SETELAH 20261117000000_ebook_koleksi.sql. Aman dijalankan ulang:
-- judul film yang sudah ada (judul + aplikasi sama) dan artikel dengan slug yang sama dilewati,
-- jadi isi yang sudah kamu edit dari panel tidak tertimpa.
-- ============================================================================

-- ---------------------------------------------------------------- 1. topik artikel
alter table public.posts add column if not exists topik text not null default 'aplikasi';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'posts_topik_check' and conrelid = 'public.posts'::regclass) then
    alter table public.posts add constraint posts_topik_check check (topik in ('aplikasi', 'tips', 'islami', 'berita'));
  end if;
end $$;
create index if not exists posts_topik_idx on public.posts(topik, published_at desc) where is_published;

-- ---------------------------------------------------------------- 2. film & serial
insert into public.films (title, kind, app_id, release_on, genre, synopsis, synopsis_en, poster_url)
select v.judul, v.jenis, a.id, v.rilis::date, v.genre, v.sinopsis, v.sinopsis_en, v.poster
from (values
  ('East of Eden', 'serial', 'netflix', '2026-10-01', 'Drama, Sejarah',
   'Adaptasi novel klasik John Steinbeck tentang beberapa generasi keluarga Trask di lembah Salinas, California. Florence Pugh memimpin kisah tentang cinta, iri hati, dan pilihan antara baik dan jahat yang diwariskan dari ayah ke anak.',
   'Florence Pugh leads this limited adaptation of John Steinbeck''s novel about generations of the Trask family and the choices between good and evil they pass down.',
   '/assets/film/east-of-eden.jpg'),
  ('Your Personal Taxi', 'serial', 'netflix', '2026-10-01', 'Drama, Fantasi',
   'Seorang sopir taksi misterius hanya mengantar penumpang yang sudah memesan lebih dulu. Di setiap perjalanan, penumpangnya berbagi kisah hidup dan pulang membawa satu lagu yang seolah dipilih khusus untuk mereka.',
   'A mysterious taxi driver only picks up passengers who booked ahead. Each ride becomes a story shared, and a song chosen just for them.',
   '/assets/film/your-personal-taxi.jpg'),
  ('Blue Box Musim 2', 'serial', 'netflix', '2026-10-04', 'Anime, Romansa, Olahraga',
   'Taiki, pemain bulu tangkis SMA, terus berlatih menuju turnamen besar sambil menata perasaannya kepada Chinatsu, kakak kelas pemain basket yang tinggal serumah dengannya. Musim kedua anime romansa olahraga yang manis ini.',
   'Badminton player Taiki keeps chasing his tournament dreams while sorting out his feelings for basketball star Chinatsu in the sweet second season.',
   '/assets/film/blue-box-musim-2.jpg'),
  ('Below', 'serial', 'netflix', '2026-10-08', 'Horor, Misteri',
   'Sebuah kota pesisir terpencil mendadak dicekam ketakutan ketika makhluk misterius dari dalam air mulai meneror warganya. Serial terbatas yang memadukan misteri kota kecil dan horor laut.',
   'A remote coastal town is gripped by fear when a mysterious creature from the water begins terrorizing its residents.',
   '/assets/film/below.jpg'),
  ('Take Charge of My Heart', 'serial', 'netflix', '2026-10-09', 'Romansa, Fantasi',
   'Pewaris konglomerat yang hidup dengan jantung buatan menemukan bahwa baterai jantungnya bisa diisi ulang oleh seorang perempuan yang punya kekuatan listrik. Keduanya membuat kesepakatan yang pelan-pelan berubah menjadi cinta.',
   'A chaebol heir with an artificial heart learns that a woman with electric powers can recharge it, and their deal slowly turns into romance.',
   '/assets/film/take-charge-of-my-heart.jpg'),
  ('Doctor X', 'serial', 'netflix', '2026-10-09', 'Drama Medis',
   'Seorang ahli bedah jenius yang bekerja lepas menolak tunduk pada politik rumah sakit universitas. Dengan tangan dingin di ruang operasi, ia melawan para petinggi yang lebih peduli jabatan daripada pasien.',
   'A brilliant freelance surgeon refuses to play the politics of a university hospital and takes on executives who care more about power than patients.',
   '/assets/film/doctor-x.jpg'),
  ('100 Days of Deception', 'serial', 'netflix', '2026-10-10', 'Sejarah, Thriller',
   'Di Gyeongseong pada masa penjajahan Jepang, seorang pencopet direkrut pejuang kemerdekaan untuk menyusup ke pemerintahan kolonial selama 100 hari. Ia bertemu penerjemah elite yang menyimpan rahasia besar.',
   'In colonial-era Gyeongseong, a pickpocket is recruited by independence fighters to infiltrate the government for 100 days, crossing paths with a secretive elite translator.',
   '/assets/film/100-days-of-deception.jpg'),
  ('Animals', 'film', 'netflix', '2026-10-09', 'Thriller, Kriminal',
   'Seorang calon wali kota dan istrinya harus mengambil langkah nekat ketika putra mereka diculik. Semakin dalam mereka terlibat, semakin kabur batas antara melindungi keluarga dan melanggar hukum.',
   'A mayoral candidate and his wife take drastic action after their son is kidnapped, blurring the line between protecting family and breaking the law.',
   '/assets/film/animals.jpg'),
  ('The Trap', 'serial', 'netflix', '2026-10-13', 'Thriller, Kriminal',
   'Penulis yang sepuluh tahun mengurung diri akhirnya keluar rumah untuk memancing pembunuh adiknya. Serial thriller Jerman tentang trauma, umpan, dan permainan kucing-tikus.',
   'A reclusive author leaves home for the first time in a decade to bait her sister''s killer in this German thriller.',
   '/assets/film/the-trap.jpg'),
  ('The Diplomat Musim 4', 'serial', 'netflix', '2026-10-15', 'Drama Politik, Thriller',
   'Diplomat senior Amerika kembali menghadapi krisis internasional bertubi-tubi sambil menjaga pernikahannya yang makin rumit. Musim keempat drama politik yang tegang dan penuh dialog tajam.',
   'A veteran U.S. diplomat juggles international crises and a strained marriage in the fourth season of the sharp political drama.',
   '/assets/film/the-diplomat-musim-4.jpg'),
  ('Balaraw: Blood Island', 'serial', 'netflix', '2026-10-15', 'Horor, Misteri',
   'Seorang perempuan muda menelusuri pulau yang tidak ada di peta untuk mencari ibunya yang hilang. Di sana ia menemukan rahasia keluarga dan teror yang selama ini disembunyikan. Serial horor dari Filipina.',
   'A young woman searches an uncharted island for her missing mother and uncovers family secrets in this Filipino horror mystery.',
   '/assets/film/balaraw-blood-island.jpg'),
  ('The Storm', 'film', 'netflix', '2026-10-15', 'Bencana, Drama',
   'Film drama bencana dari Swedia tentang orang-orang yang berjuang bertahan ketika badai dahsyat menghantam dan memaksa mereka mengambil keputusan hidup-mati.',
   'A Swedish disaster drama about people fighting to survive when a devastating storm hits.',
   '/assets/film/the-storm.jpg'),
  ('Sacrifice', 'film', 'netflix', '2026-10-16', 'Thriller, Komedi Satir',
   'Seorang bintang film disandera kelompok aktivis lingkungan di tengah gala amal yang glamor. Malam penuh kemewahan berubah menjadi negosiasi menegangkan yang membuka kemunafikan banyak orang.',
   'A movie star is taken hostage by eco-activists during a glitzy charity gala, and the night turns into a tense standoff.',
   '/assets/film/sacrifice.jpg'),
  ('The Disciple', 'film', 'netflix', '2026-10-16', 'Drama Biografi, Musik',
   'Kisah nyata seorang pendatang yang masuk ke lingkaran grup hip-hop Wu-Tang Clan dan ikut melahirkan album kontroversial yang hanya dibuat satu salinan, Once Upon a Time in Shaolin.',
   'The true story of an outsider who joins the Wu-Tang Clan''s world and helps create the one-copy album Once Upon a Time in Shaolin.',
   '/assets/film/the-disciple.jpg'),
  ('Cyberpunk: Edgerunners 2', 'serial', 'netflix', '2026-10-20', 'Anime, Sci-Fi, Aksi',
   'Kembali ke Night City yang penuh neon, implan sibernetik, dan geng bayaran. Kelanjutan anime laga fiksi ilmiah yang dulu memikat penonton lewat animasi penuh warna dan cerita yang menyesakkan.',
   'A return to neon-soaked Night City in the follow-up to the hit sci-fi action anime.',
   '/assets/film/cyberpunk-edgerunners-2.jpg'),
  ('Nobody Wants This Musim 3', 'serial', 'netflix', '2026-10-22', 'Komedi Romantis',
   'Hubungan podcaster yang blak-blakan dan rabi yang santun memasuki babak baru. Perbedaan keyakinan, keluarga yang ikut campur, dan rencana masa depan membuat cinta mereka diuji lagi dengan cara yang lucu.',
   'The outspoken podcaster and the charming rabbi face new tests of faith, family, and the future in season three.',
   '/assets/film/nobody-wants-this-musim-3.jpg'),
  ('Lupin Bagian 4', 'serial', 'netflix', '2026-10-23', 'Kriminal, Heist',
   'Omar Sy kembali sebagai Assane Diop, pencuri flamboyan yang terinspirasi Arsène Lupin. Di Paris, ia merancang aksi pencurian baru yang cerdik sambil melindungi orang-orang yang ia sayangi.',
   'Omar Sy returns as gentleman thief Assane Diop for a new Paris heist chapter.',
   '/assets/film/lupin-bagian-4.jpg'),
  ('Dead-End Job', 'serial', 'netflix', '2026-10-30', 'Horor, Fantasi',
   'Pria yang terlilit utang tergoda pekerjaan paruh waktu bergaji besar di sebuah agensi aneh. Aturannya ketat, termasuk tutup mulut, dan setiap shift ternyata mempertaruhkan nyawa di tempat kerja yang supranatural.',
   'A debt-ridden man takes a high-paying part-time job with strict rules and finds himself in a deadly supernatural workplace.',
   '/assets/film/dead-end-job.jpg'),
  ('A Couple of Lies', 'serial', 'netflix', '2026-10-30', 'Thriller, Misteri',
   'Dua pasangan bertukar rumah untuk liburan, lalu terjebak dalam jaring pengawasan dan manipulasi. Serial nordic noir dari Swedia tentang rahasia yang terbongkar satu per satu.',
   'Two couples swap homes for a holiday and get caught in a web of surveillance and manipulation in this Swedish noir.',
   '/assets/film/a-couple-of-lies.jpg'),
  ('Did Someone Happen to Mention Me?', 'serial', 'netflix', '2026-10-01', 'Komedi, Drama',
   'Seorang aktor panggung terkenal pulang dari London dan mendapati semua orang di kampung halamannya sudah melupakan dirinya. Komedi tentang ketenaran, ego, dan mencari tempat untuk kembali.',
   'A famous stage actor returns home from London to find everyone has forgotten him.',
   '/assets/film/did-someone-happen-to-mention-me.jpg'),
  ('Schumacher ''94: The Birth of a Legend', 'film', 'netflix', '2026-10-02', 'Dokumenter, Olahraga',
   'Dokumenter tentang musim Formula 1 tahun 1994, ketika Michael Schumacher berubah dari pembalap kuda hitam menjadi juara dunia untuk pertama kalinya.',
   'A look back at the 1994 Formula 1 season, when Michael Schumacher went from underdog to world champion.',
   '/assets/film/schumacher-94-the-birth-of-a-legend.jpg'),
  ('Hollywood Arts', 'serial', 'netflix', '2026-10-15', 'Komedi, Musikal',
   'Spin-off Victorious. Trina Vega kembali ke sekolah seni lamanya untuk membimbing generasi baru penyanyi, penari, dan aktor yang penuh ambisi.',
   'In this Victorious spinoff, Trina Vega returns to her alma mater to mentor a new generation of performers.',
   '/assets/film/hollywood-arts.jpg'),
  ('The One About Matthew Perry', 'serial', 'netflix', '2026-10-27', 'Dokumenter',
   'Serial dokumenter tentang hidup, karier, dan warisan Matthew Perry, pemeran Chandler di Friends, termasuk perjuangan pribadinya di balik layar.',
   'A docuseries on the life, career, and legacy of the Friends star.',
   '/assets/film/the-one-about-matthew-perry.jpg'),
  ('Bass X Machina', 'serial', 'netflix', '2026-11-03', 'Anime, Aksi, Western',
   'Di Wild West ala steampunk yang tak kenal hukum, seorang ayah terpaksa menjadi hakim sekaligus algojo demi melindungi keluarganya. Terinspirasi secara longgar dari legenda penegak hukum Bass Reeves.',
   'In a lawless steampunk West, a father becomes judge, jury, and executioner to protect his family.',
   '/assets/film/bass-x-machina.jpg'),
  ('A Dog''s Perfect Christmas', 'film', 'netflix', '2026-11-04', 'Keluarga, Drama',
   'Keluarga yang sedang renggang menjelang Natal mendapat bantuan tak terduga dari seekor anjing basset tua yang bijak. Film hangat untuk ditonton bersama keluarga.',
   'A family in crisis at Christmas gets help from a wise old basset hound.',
   '/assets/film/a-dog-s-perfect-christmas.jpg'),
  ('Anaesthesia', 'serial', 'netflix', '2026-11-04', 'Drama Medis',
   'Seorang dokter yang gagal dalam sebuah operasi pindah ke rumah sakit daerah untuk memulai ulang hidupnya. Serial drama medis dari Polandia tentang rasa bersalah dan kesempatan kedua.',
   'After a botched surgery, a doctor moves to a local hospital to rebuild his life in this Polish medical drama.',
   '/assets/film/anaesthesia.jpg'),
  ('Taken: Natalee Holloway', 'film', 'netflix', '2026-11-04', 'Dokumenter, True Crime',
   'Dokumenter yang menelusuri pencarian puluhan tahun atas Natalee Holloway, remaja Amerika yang hilang di Aruba pada 2005.',
   'Traces the decades-long search for Natalee Holloway, who vanished in Aruba in 2005.',
   '/assets/film/taken-natalee-holloway.jpg'),
  ('Black Doves Musim 2', 'serial', 'netflix', '2026-11-05', 'Thriller Mata-Mata',
   'Helen dan Sam terseret perburuan jawaban setelah sebuah serangan, tepat ketika suami Helen hampir menjadi perdana menteri. Spionase London yang dingin, rapi, dan penuh pengkhianatan.',
   'After an attack, Helen and Sam hunt for answers just as Helen''s husband nears becoming prime minister.',
   '/assets/film/black-doves-musim-2.jpg'),
  ('One Year to Live, Buy a Man', 'film', 'netflix', '2026-11-05', 'Komedi Romantis',
   'Perempuan super hemat yang divonis hanya punya waktu setahun memutuskan ''membeli'' seorang host klub malam. Kesepakatan aneh itu berbelok ke arah yang tidak pernah ia duga. Film Jepang.',
   'A frugal woman with a year to live ''buys'' a nightclub host, and the arrangement takes an unexpected turn.',
   '/assets/film/one-year-to-live-buy-a-man.jpg'),
  ('Possible Love', 'film', 'netflix', '2026-11-06', 'Drama',
   'Karya sutradara Lee Chang-dong. Seorang pekerja yang baru di-PHK dan istrinya bertemu pembuat film dokumenter beserta pasangannya, dan pertemuan itu membuka luka serta pertanyaan lama tentang cinta.',
   'From Lee Chang-dong: a laid-off worker and his wife meet a documentary filmmaker and her spouse.',
   '/assets/film/possible-love.jpg'),
  ('Under Siege', 'serial', 'netflix', '2026-11-06', 'Drama Sejarah',
   'Serial Kolombia tentang pengepungan Istana Kehakiman di Bogotá pada 1985 dan dampaknya yang masih terasa sampai sekarang.',
   'A Colombian series on the 1985 siege of the Palace of Justice and its lasting impact.',
   '/assets/film/under-siege.jpg'),
  ('The Devil''s Plan Musim 3', 'serial', 'netflix', '2026-11-10', 'Reality, Kompetisi',
   'Enam belas peserta dikurung dan diadu dalam permainan kecerdasan, strategi, dan aliansi demi hadiah uang dan gengsi. Reality show Korea yang bikin penonton ikut berpikir.',
   'Sixteen players compete in a high-stakes test of intelligence and strategy in the Korean reality show.',
   '/assets/film/the-devil-s-plan-musim-3.jpg'),
  ('The Body', 'serial', 'netflix', '2026-11-11', 'Horor',
   'Ritual inisiasi Halloween sebuah tim dansa putri berakhir tragis. Rasa bersalah, hasrat, dan penampakan hantu mulai menghantui para anggotanya.',
   'An all-girls dance squad''s Halloween initiation unleashes guilt, desire, and ghostly visions.',
   '/assets/film/the-body.jpg'),
  ('ChiaroScuro', 'serial', 'netflix', '2026-11-11', 'Misteri, Thriller',
   'Seorang ahli seni membantu polisi mengusut kasus di sebuah museum di Roma, yang ternyata berkaitan dengan masa lalunya sendiri. Serial misteri Italia.',
   'An art expert helps police with a case in a Roman museum connected to his own past.',
   '/assets/film/chiaroscuro.jpg'),
  ('Alicia''s Law', 'serial', 'netflix', '2026-11-11', 'Drama Hukum',
   'Setelah hidupnya berantakan, Alicia kembali ke dunia hukum dan membangun ulang dirinya dari nol. Serial drama Meksiko tentang bangkit dan memperjuangkan keadilan.',
   'After her life comes undone, Alicia returns to law and redefines herself in this Mexican drama.',
   '/assets/film/alicia-s-law.jpg'),
  ('Avedon', 'film', 'netflix', '2026-11-11', 'Dokumenter, Biografi',
   'Ron Howard menyutradarai dokumenter tentang fotografer Richard Avedon, sosok yang mengubah wajah fotografi mode dan potret abad ke-20.',
   'Ron Howard directs a look at photographer Richard Avedon''s life and influence.',
   '/assets/film/avedon.jpg'),
  ('Allen', 'film', 'netflix', '2026-11-12', 'Sci-Fi',
   'Dua puluh tahun setelah pengalaman bertemu alien saat kecil, seorang sahabat lama kembali membawa rahasia yang bisa mengakhiri dunia. Film fiksi ilmiah dari Australia.',
   'Twenty years after a childhood alien encounter, an old friend returns with a world-ending secret.',
   '/assets/film/allen.jpg'),
  ('Miracles of the ER', 'serial', 'netflix', '2026-11-12', 'Drama Medis',
   'Lulusan kedokteran yang biasa-biasa saja harus membuktikan diri di antara rekan-rekan elite di unit gawat darurat yang serba kacau. Serial medis dari Taiwan.',
   'An average medical graduate must prove himself among elite peers in a chaotic ER.',
   '/assets/film/miracles-of-the-er.jpg'),
  ('Serangan Balik', 'film', 'netflix', '2026-11-12', 'Aksi, Thriller',
   'Film laga Indonesia. Seorang veteran yang dihantui rasa bersalah harus bersatu dengan cucu-cucunya yang lama terasing ketika geng kriminal berbahaya datang mengancam keluarga mereka.',
   'An Indonesian action thriller: a guilt-ridden veteran and his estranged grandchildren unite against a deadly gang.',
   '/assets/film/serangan-balik.jpg'),
  ('Heartland', 'film', 'netflix', '2026-11-13', 'Misteri, Thriller',
   'Jessica Chastain berperan sebagai mantan penyanyi country yang menyelidiki hilangnya keponakannya, bintang muda yang sedang naik daun di Nashville.',
   'Jessica Chastain plays a retired country singer investigating her rising-star niece''s disappearance in Nashville.',
   '/assets/film/heartland.jpg'),
  ('Murder in Galicia', 'serial', 'netflix', '2026-11-13', 'Kriminal, Drama',
   'Seorang sersan mencurigai sang suami setelah istrinya diserang di rumah pada malam hari. Serial kriminal Spanyol yang terinspirasi kasus nyata.',
   'A sergeant suspects the husband after a woman is attacked at night in this Spanish crime drama.',
   '/assets/film/murder-in-galicia.jpg'),
  ('Guarding Stars', 'film', 'netflix', '2026-11-18', 'Komedi Romantis',
   'Seorang pengawal pribadi perempuan dan aktor yang ia jaga berpura-pura menjadi pasangan selama liburan di peternakan Montana. Pura-pura pacaran yang lama-lama terasa sungguhan.',
   'A bodyguard and her actor client pose as a couple at a Montana ranch.',
   '/assets/film/guarding-stars.jpg'),
  ('Valentina and the 12 Signs', 'serial', 'netflix', '2026-11-18', 'Komedi Romantis',
   'Setelah putus cinta, Valentina memutuskan berkencan dengan satu pria dari setiap zodiak. Komedi romantis Brasil yang ringan dan penuh kejutan.',
   'After a breakup, Valentina decides to date one man from each zodiac sign.',
   '/assets/film/valentina-and-the-12-signs.jpg'),
  ('The Law of Beasts', 'serial', 'netflix', '2026-11-18', 'Kriminal, Thriller',
   'Bebasnya seorang terpidana pembunuh anak menyalakan lagi konflik lama antara seorang penyidik dan psikiater. Serial kriminal Polandia yang kelam.',
   'A convicted child murderer''s release reignites conflict between an investigator and a psychiatrist.',
   '/assets/film/the-law-of-beasts.jpg'),
  ('Gentle Monster', 'film', 'netflix', '2026-11-18', 'Thriller',
   'Awal baru sebuah keluarga di pedesaan hancur seketika ketika polisi datang dan rahasia gelap terungkap. Film thriller dari Austria.',
   'A family''s fresh start in the countryside is shattered by a police visit and a dark secret.',
   '/assets/film/gentle-monster.jpg'),
  ('The Altruists', 'serial', 'netflix', '2026-11-19', 'Drama Kriminal, Biografi',
   'Dramatisasi naik dan runtuhnya bursa kripto FTX lewat hubungan Sam Bankman-Fried dan Caroline Ellison. Kisah ambisi, uang, dan janji ''berbuat baik'' yang berakhir di pengadilan.',
   'Dramatizes the rise and collapse of FTX through Sam Bankman-Fried and Caroline Ellison.',
   '/assets/film/the-altruists.jpg'),
  ('Steps', 'film', 'netflix', '2026-11-20', 'Animasi, Fantasi, Musikal',
   'Kisah Cinderella dari sudut pandang Lilith, saudara tirinya. Setelah tidak sengaja mengubah saudarinya menjadi katak, Lilith justru menjadi pahlawan dalam petualangan musikal yang kocak.',
   'Cinderella''s stepsister Lilith becomes the hero after accidentally turning her sister into a frog.',
   '/assets/film/steps.jpg'),
  ('Primetime Preacher$', 'film', 'netflix', '2026-11-20', 'Dokumenter',
   'Dokumenter tentang para penginjil televisi Amerika tahun 1980-an dan skandal yang menjatuhkan mereka.',
   'A documentary on 1980s televangelists and the scandals that brought them down.',
   '/assets/film/primetime-preacher.jpg'),
  ('The Mosquito Bowl', 'film', 'netflix', '2026-11-25', 'Drama Perang, Olahraga',
   'Kisah nyata empat bintang football kampus yang mendaftar menjadi Marinir setelah serangan Pearl Harbor, lalu menggelar pertandingan legendaris sebelum bertempur di Okinawa.',
   'Four college football stars enlist in the Marines after Pearl Harbor in this true war story.',
   '/assets/film/the-mosquito-bowl.jpg'),
  ('Fool Night', 'serial', 'netflix', '2026-11-26', 'Anime, Sci-Fi, Misteri',
   'Di masa depan tanpa sinar matahari, manusia bisa diubah menjadi tumbuhan penghasil oksigen. Seorang pemuda yang bisa mendengar suara tumbuhan terseret misteri di balik teknologi itu. Adaptasi manga.',
   'In a sunless future where humans can become plants, a young man who hears plants'' voices is drawn into a mystery.',
   '/assets/film/fool-night.jpg'),
  ('The Hunting Wives Musim 2', 'serial', 'netflix', '2026-11-26', 'Thriller',
   'Sophie dan Margo kembali bertemu di tengah rahasia lama dan musuh baru. Pertanyaannya kini: siapa sebenarnya yang sedang berburu dan siapa yang diburu?',
   'Sophie and Margo reunite amid old secrets and new foes, questioning who is hunting whom.',
   '/assets/film/the-hunting-wives-musim-2.jpg'),
  ('Komedi Kacau Musim 2', 'serial', 'netflix', '2026-11-26', 'Komedi',
   'Serial Indonesia karya Raditya Dika. Panca berjuang menyelamatkan kafe komedi tunggalnya yang sedang krisis, sambil menghadapi tingkah para komika dan masalah rumah tangga sendiri.',
   'Raditya Dika''s Indonesian comedy series: Panca fights to save his struggling stand-up café.',
   '/assets/film/komedi-kacau-musim-2.jpg'),
  ('Always on Call', 'serial', 'netflix', '2026-11-26', 'Drama Medis',
   'Staf instalasi gawat darurat di Oslo menghadapi masalah pribadi dan seorang rekan baru yang berisiko. Serial drama medis dari Norwegia.',
   'Oslo ER staff face personal struggles and a risky new hire in this Norwegian medical drama.',
   '/assets/film/always-on-call.jpg'),
  ('The Hunchback, Soul of Paris', 'film', 'netflix', '2026-11-27', 'Romansa, Sejarah',
   'Paris tahun 1830 sedang bergolak. Seorang pria bungkuk yang terjepit pusaran politik jatuh cinta dengan cinta yang mustahil. Tafsir baru kisah klasik dari Prancis.',
   'In 1830 Paris, a hunchback caught in political turmoil faces an impossible love.',
   '/assets/film/the-hunchback-soul-of-paris.jpg'),
  ('The Child', 'film', 'netflix', '2026-11-27', 'Drama',
   'Setelah putranya yang berusia sembilan tahun meninggal dalam ledakan gas, seorang ibu berusaha membangun kembali hidupnya. Drama Spanyol yang menyentuh tentang duka dan harapan.',
   'After her 9-year-old son dies in a gas explosion, a mother tries to rebuild her life.',
   '/assets/film/the-child.jpg'),
  ('Narnia: The Magician''s Nephew', 'film', 'netflix', '2027-04-02', 'Fantasi, Petualangan',
   'Greta Gerwig mengadaptasi kisah asal-usul Narnia karya C.S. Lewis. Digory dan Polly menemukan Hutan di Antara Dunia-Dunia dan menyaksikan lahirnya negeri ajaib itu. Tayang di bioskop Februari 2027, lalu di Netflix.',
   'Greta Gerwig adapts C.S. Lewis''s Narnia origin story; in theaters February 2027, then on Netflix.',
   '/assets/film/narnia-the-magician-s-nephew.jpg'),
  ('Between Steps', 'serial', 'disney', '2026-10-05', 'Drama, Romansa',
   'Mantan perenang yang kehilangan satu kaki menemukan tujuan baru di dunia robotika. Ia bertemu mahasiswi tingkat akhir yang juga sedang mengubah arah hidupnya. Drama Korea yang hangat dan penuh harapan.',
   'A former swimmer who lost a leg finds new purpose in robotics and meets a student also changing course.',
   '/assets/film/between-steps.jpg'),
  ('VisionQuest', 'serial', 'disney', '2026-10-14', 'Superhero, Sci-Fi',
   'Vision yang dibangun ulang mencoba memahami keberadaannya sambil menyembunyikan kepribadian AI di dalam dirinya. Ia lalu kabur bersama seorang pemuda yang terhubung dengan masa lalunya. Serial Marvel.',
   'A rebuilt Vision hides the AI personalities inside him and goes on the run in this Marvel series.',
   '/assets/film/visionquest.jpg'),
  ('The Remarried Empress', 'serial', 'disney', '2026-11-04', 'Drama Kerajaan, Fantasi',
   'Permaisuri Navier tetap tenang ketika Kaisar Sovieshu membawa selir ke istana. Saat diminta bercerai, ia setuju dengan satu syarat: boleh menikah lagi dengan Pangeran Heinrey dari Kerajaan Barat. Adaptasi webtoon populer.',
   'Empress Navier agrees to a divorce on one condition: she may remarry Prince Heinrey of the Western Kingdom.',
   '/assets/film/the-remarried-empress.jpg'),
  ('Wolves Up Close with Bertie Gregory', 'serial', 'disney', '2026-11-06', 'Dokumenter Alam',
   'Penjelajah National Geographic Bertie Gregory mendekat ke kehidupan kawanan serigala liar: cara mereka berburu, membesarkan anak, dan bertahan di alam yang keras.',
   'National Geographic explorer Bertie Gregory gets up close with wild wolf packs.',
   '/assets/film/wolves-up-close-with-bertie-gregory.jpg'),
  ('Expedition: Saving Our Seas', 'film', 'disney', '2026-11-14', 'Dokumenter Alam',
   'Ekspedisi menyelami lautan untuk melihat ancaman yang dihadapi ekosistem laut dan orang-orang yang berusaha menyelamatkannya.',
   'An expedition into the oceans to see the threats facing marine life and the people fighting to save it.',
   '/assets/film/expedition-saving-our-seas.jpg'),
  ('How The Tudors Lost Their Heads', 'serial', 'disney', '2026-11-17', 'Dokumenter Sejarah',
   'Serial sejarah tentang dinasti Tudor di Inggris: intrik istana, pernikahan politik, dan eksekusi yang mengubah jalannya sejarah.',
   'A history series on the Tudor dynasty''s intrigue, marriages, and executions.',
   '/assets/film/how-the-tudors-lost-their-heads.jpg'),
  ('Percy Jackson and the Olympians Musim 3', 'serial', 'disney', '2026-11-20', 'Fantasi, Petualangan',
   'Mengadaptasi buku The Titan''s Curse. Percy dan sahabat-sahabatnya berpacu menyelamatkan Annabeth dan menghentikan para Titan yang mengancam Olympus.',
   'Adapting The Titan''s Curse, Percy and friends race to rescue Annabeth and stop the Titans.',
   '/assets/film/percy-jackson-and-the-olympians-musim-3.jpg'),
  ('Mickey''s Home Alone', 'film', 'disney', '2026-11-27', 'Animasi, Keluarga',
   'Tayangan spesial liburan Disney untuk keluarga yang dibintangi Mickey Mouse dan kawan-kawan. Cocok untuk ditonton bersama anak-anak menjelang akhir tahun.',
   'A Disney holiday special for the whole family starring Mickey Mouse and friends.',
   '/assets/film/mickey-s-home-alone.jpg'),
  ('Carrie', 'serial', 'amazon-prime-video', '2026-10-07', 'Horor',
   'Mike Flanagan mengadaptasi novel pertama Stephen King. Carrie White, remaja pemalu yang terus dirundung, menemukan kekuatan telekinesis yang perlahan tak lagi bisa ia kendalikan.',
   'Mike Flanagan''s adaptation of Stephen King''s first novel about bullied teen Carrie White and her telekinetic power.',
   '/assets/film/carrie.jpg'),
  ('Love in Disguise', 'serial', 'amazon-prime-video', '2026-10-19', 'Romansa, Aksi',
   'Mantan anggota pasukan khusus menyamar sebagai pria untuk menjadi sekretaris pribadi seorang pewaris konglomerat yang sedang dicurigai membunuh. Drama Korea penuh aksi dan salah paham.',
   'A former special-forces agent disguises herself as a man to become secretary to a chaebol heir suspected of murder.',
   '/assets/film/love-in-disguise.jpg'),
  ('The Terminal List Musim 2', 'serial', 'amazon-prime-video', '2026-10-21', 'Aksi, Thriller',
   'James Reece kembali dalam kelanjutan serial laga militer yang keras dan penuh konspirasi. Diadaptasi dari novel Jack Carr.',
   'James Reece returns in the hard-hitting military action thriller based on Jack Carr''s novels.',
   '/assets/film/the-terminal-list-musim-2.jpg'),
  ('Final Table', 'serial', 'amazon-prime-video', '2026-10-24', 'Romansa, Kuliner',
   'Chef yang lama berkarier di luar negeri bergabung dengan restoran keluarga yang kini dikelola orang yang tidak paham dapur. Mereka ikut kompetisi masak demi menyelamatkan restoran, dan romansa ikut tumbuh.',
   'A chef returns home to help save a family restaurant through a cooking competition, and romance follows.',
   '/assets/film/final-table.jpg'),
  ('The Greatest', 'serial', 'amazon-prime-video', '2026-11-04', 'Drama Biografi, Olahraga',
   'Drama resmi tentang Muhammad Ali yang melihat hidupnya di luar ring tinju: keyakinan, prinsip, keluarga, dan keberanian melawan arus. Diproduseri bersama Lonnie Ali.',
   'An authorized drama about Muhammad Ali''s life beyond the boxing ring.',
   '/assets/film/the-greatest.jpg'),
  ('Devils'' Crest', 'serial', 'amazon-prime-video', '2026-11-06', 'Anime, Fantasi',
   'Ketika gim realitas virtual menyatu dengan dunia nyata, seorang pemain muda mendapati teman sekelasnya berubah menjadi monster. Anime fantasi aksi.',
   'When a VR game merges with reality, a young player finds his classmate turned into a monster.',
   '/assets/film/devils-crest.jpg'),
  ('The Lord of the Rings: The Rings of Power Musim 3', 'serial', 'amazon-prime-video', '2026-11-11', 'Fantasi, Petualangan',
   'Pasukan Sauron menguasai sebagian besar Dunia Tengah. Galadriel dan bangsa-bangsa merdeka harus bersatu menghentikannya sebelum kegelapan Zaman Kedua mencapai puncaknya.',
   'With Sauron''s forces conquering Middle-earth, Galadriel and the free peoples must unite to stop him.',
   '/assets/film/the-lord-of-the-rings-the-rings-of-power-musim-3.jpg'),
  ('Madden', 'film', 'amazon-prime-video', '2026-11-18', 'Drama Biografi, Olahraga',
   'Nicolas Cage menjadi John Madden, pelatih yang membawa Raiders juara Super Bowl, lalu menjadi komentator legendaris dan wajah gim Madden NFL. Christian Bale berperan sebagai Al Davis.',
   'Nicolas Cage plays John Madden, from Super Bowl-winning coach to broadcasting legend.',
   '/assets/film/madden.jpg'),
  ('Clashing Through the Snow', 'film', 'amazon-prime-video', '2026-11-23', 'Komedi Romantis',
   'Dua editor penerbitan yang bersaing terpaksa berbagi mobil sewaan menuju New York, sambil sama-sama mengincar kontrak buku yang sama. Komedi romantis musim liburan.',
   'Two rival editors share a rental car to New York while competing for the same book deal.',
   '/assets/film/clashing-through-the-snow.jpg'),
  ('Blade Runner 2099', 'serial', 'amazon-prime-video', '2026-11-25', 'Sci-Fi, Thriller',
   'Lima puluh tahun setelah Blade Runner 2049, Los Angeles dibentuk oleh para replikan. Michelle Yeoh menjadi replikan Blade Runner yang menua, sementara Hunter Schafer memerankan buronan yang mencuri identitas Blade Runner.',
   'Set 50 years after Blade Runner 2049, with Michelle Yeoh as an aging replicant Blade Runner.',
   '/assets/film/blade-runner-2099.jpg'),
  ('Nine to Six', 'serial', 'amazon-prime-video', '2026-11-25', 'Romansa, Drama Kantor',
   'Ahli hukum Kang Yi-ji yang tidak percaya cinta mulai goyah setelah bertemu karyawan magang yang hangat dan atasannya yang misterius. Adaptasi drama China The Rational Life.',
   'Love-skeptic legal expert Kang Yi-ji starts to change after meeting a warm intern and his boss.',
   '/assets/film/nine-to-six.jpg'),
  ('Make Me Tingle', 'serial', 'hbo-standar', '2026-10-15', 'Komedi Romantis',
   'Perempuan dari keluarga konservatif mendapat pekerjaan di perusahaan rintisan produk dewasa. Pekerjaan yang membuatnya canggung itu justru membuatnya lebih berani menjadi diri sendiri. Drama Korea.',
   'A woman from a conservative family joins an adult-products startup, and the job changes her life.',
   '/assets/film/make-me-tingle.jpg'),
  ('The Gilded Age Musim 4', 'serial', 'hbo-standar', '2026-11-01', 'Drama Periode',
   'New York akhir abad ke-19 kembali dipenuhi perebutan status antara keluarga kaya lama dan orang kaya baru. Carrie Coon, Christine Baranski, dan Cynthia Nixon kembali dalam drama kostum mewah HBO.',
   'Old money and new money keep clashing in late-19th-century New York in season four.',
   '/assets/film/the-gilded-age-musim-4.jpg'),
  ('City of God: The Fight Rages On Musim 2', 'serial', 'hbo-standar', '2026-11-08', 'Drama Kriminal',
   'Kelanjutan dunia film legendaris City of God. Konflik antara polisi, bandar narkoba, dan milisi di sebuah favela Rio de Janeiro makin memanas.',
   'Conflict between police, dealers, and militias intensifies in the favela in season two.',
   '/assets/film/city-of-god-the-fight-rages-on-musim-2.jpg'),
  ('When a Witness Recants', 'film', 'hbo-standar', '2026-11-17', 'Dokumenter, True Crime',
   'Dokumenter karya Dawn Porter tentang tiga pria yang dihukum keliru atas pembunuhan tahun 1983 dan menghabiskan 36 tahun di penjara sebelum kebenaran terungkap.',
   'Dawn Porter''s documentary about three men wrongly convicted of a 1983 murder who spent 36 years in prison.',
   '/assets/film/when-a-witness-recants.jpg'),
  ('Tony', 'film', 'hbo-standar', '2026-11-20', 'Drama Biografi, Kuliner',
   'Film A24 tentang masa muda Anthony Bourdain sebelum menjadi chef dan penulis terkenal. Dominic Sessa memerankan Tony muda yang liar, lapar pengalaman, dan jatuh cinta pada dunia dapur.',
   'A24''s portrait of a young Anthony Bourdain, played by Dominic Sessa, before he became famous.',
   '/assets/film/tony.jpg'),
  ('Bayangan Dendam', 'serial', 'viu', '2026-10-22', 'Thriller, Misteri',
   'Viu Original dari Malaysia. Kematian yang awalnya dianggap wajar ternyata mengarah ke kasus pembunuhan. Semuanya berawal dari pengkhianatan cinta yang menyimpan banyak rahasia.',
   'A Viu Original from Malaysia: a seemingly natural death turns out to be murder rooted in betrayal.',
   '/assets/film/bayangan-dendam.jpg'),
  ('One of a Kind Romance', 'serial', 'viu', '2026-11-09', 'Komedi Romantis',
   'Pencari kerja bernama Kong Yu-il tak sengaja menjadi manajer aktor papan atas Tak Mu-i, yang ternyata penggemar berat novel tulisannya. Keduanya saling menguatkan di tengah luka masing-masing. Dibintangi Joy Red Velvet.',
   'A job seeker becomes manager to a top star who turns out to be a fan of her novel. Starring Joy of Red Velvet.',
   '/assets/film/one-of-a-kind-romance.jpg'),
  ('Good Partner Musim 2', 'serial', 'viu', '2026-11-20', 'Drama Hukum',
   'Pengacara perceraian Cha Eun-kyung kini memimpin firma sendiri dan kembali menangani klien-klien baru bersama Kang Hye-sung. Kasus rumah tangga yang pelik, dibawakan dengan hangat dan jenaka.',
   'Divorce lawyer Cha Eun-kyung, now running her own firm, takes on new clients in season two.',
   '/assets/film/good-partner-musim-2.jpg'),
  ('Shadow Punisher', 'serial', 'iqiyi', '2026-10-02', 'Wuxia, Misteri',
   'Li Si menyamar masuk ke Biro Penangkap Ilahi demi mengungkap misteri kematian Pangeran Keempat. Drama wuxia penuh intrik yang dibintangi Luo Yunxi.',
   'Li Si goes undercover in the Divine Constabulary to solve the Fourth Prince''s death. Starring Luo Yunxi.',
   '/assets/film/shadow-punisher.jpg'),
  ('Love in Red Dust', 'serial', 'iqiyi', '2026-10-14', 'Romansa, Misteri',
   'Jenderal Yuwen Hong Ce membongkar korupsi persenjataan, sementara Wen Ding Yi kehilangan keluarganya. Jalan mereka bersilangan dalam penyelidikan yang dibumbui romansa. Juga tayang di Viu.',
   'A general exposes weapons corruption while a grieving woman seeks the truth. Also on Viu.',
   '/assets/film/love-in-red-dust.jpg'),
  ('When I Meet the Moon', 'serial', 'iqiyi', '2026-11-04', 'Romansa',
   'Mahasiswi pascasarjana yang pemalu bertemu lagi dengan cinta pertamanya semasa SMA. Hubungan mereka sempat kandas karena beda pandangan, lalu trauma lama sang pria muncul ke permukaan.',
   'A shy graduate student reconnects with her high-school crush as his buried trauma resurfaces.',
   '/assets/film/when-i-meet-the-moon.jpg'),
  ('Yunchu''s Vengeance', 'serial', 'iqiyi', '2026-11-12', 'Balas Dendam, Kerajaan',
   'Bangsawan perempuan yang dikhianati dan dibunuh di kehidupan sebelumnya terlahir kembali, lalu menyusun balas dendam lewat politik istana. Dibintangi Esther Yu.',
   'A betrayed noblewoman is reborn and plots revenge through palace politics. Starring Esther Yu.',
   '/assets/film/yunchu-s-vengeance.jpg'),
  ('The Vanishing Beauty', 'serial', 'we-tv', '2026-10-09', 'Drama Urban, Romansa',
   'Hidup blogger Yu Meng hancur tepat di ulang tahun pernikahannya yang kelima, termasuk dimanfaatkan keluarga mertua. Ia bangkit dan menata ulang hidupnya.',
   'Blogger Yu Meng''s life falls apart on her fifth wedding anniversary, and she fights to rebuild it.',
   '/assets/film/the-vanishing-beauty.jpg'),
  ('Main Api Musim 2', 'serial', 'we-tv', '2026-11-20', 'Thriller Psikologis',
   'Serial Indonesia dengan Luna Maya dan Darius Sinathrya. Kelanjutan kisah cinta terlarang dan obsesi berbahaya yang berujung perselingkuhan dan pengkhianatan dalam rumah tangga.',
   'Indonesian psychological thriller about forbidden love and dangerous obsession, season two.',
   '/assets/film/main-api-musim-2.jpg'),
  ('Where The Mask Ends', 'serial', 'youku', '2026-10-14', 'Romansa Sejarah',
   'Drama sejarah romantis tentang pernikahan pengganti, identitas rahasia, dan konflik keluarga yang perlahan membuka siapa sebenarnya orang di balik topeng.',
   'A historical romance of substitute marriage, secret identities, and family conflict.',
   '/assets/film/where-the-mask-ends.jpg'),
  ('Main Belakang', 'serial', 'vidio-platinum', '2026-10-22', 'Drama, Romansa',
   'Vidio Original. Pernikahan Bella dan Chico mulai retak ketika sebuah rahasia muncul, sementara rumah tangga Donna dan Evan yang tampak sempurna juga menyimpan hal yang tak terduga.',
   'A Vidio Original about two marriages unraveling as secrets surface.',
   '/assets/film/main-belakang.jpg'),
  ('The Apothecary Diaries Musim 3', 'serial', 'crunchyroll', '2026-10-02', 'Anime, Misteri, Sejarah',
   'Maomao, ahli racun dan obat yang bekerja di istana kekaisaran, kembali memecahkan misteri dengan logika dan pengetahuannya. Musim ketiga anime misteri istana yang populer.',
   'Palace apothecary Maomao solves new mysteries with her knowledge of medicine and poison.',
   '/assets/film/the-apothecary-diaries-musim-3.jpg'),
  ('Black Clover Musim 2', 'serial', 'crunchyroll', '2026-10-03', 'Anime, Aksi, Fantasi',
   'Asta, pemuda tanpa sihir yang bercita-cita menjadi Kaisar Sihir, kembali bersama Black Bulls dalam pertarungan yang lebih besar.',
   'Magicless Asta returns with the Black Bulls on his quest to become Wizard King.',
   '/assets/film/black-clover-musim-2.jpg'),
  ('Aoashi Musim 2', 'serial', 'crunchyroll', '2026-10-04', 'Anime, Olahraga',
   'Ashito Aoi terus berkembang di akademi sepak bola klub profesional, belajar membaca permainan dan berjuang menembus tim utama.',
   'Ashito Aoi keeps growing at a pro club''s youth academy in the football anime''s second season.',
   '/assets/film/aoashi-musim-2.jpg'),
  ('Magic Knight Rayearth', 'serial', 'crunchyroll', '2026-10-07', 'Anime, Fantasi',
   'Tiga siswi dari Tokyo dipanggil ke dunia Cephiro untuk menjadi Ksatria Sihir dan menyelamatkan seorang putri. Adaptasi anime baru dari manga klasik CLAMP.',
   'Three Tokyo schoolgirls are summoned to Cephiro to become Magic Knights in this new adaptation of the CLAMP classic.',
   '/assets/film/magic-knight-rayearth.jpg')
) as v(judul, jenis, app, rilis, genre, sinopsis, sinopsis_en, poster)
left join public.apps a on a.slug = v.app
where not exists (select 1 from public.films f where lower(f.title) = lower(v.judul) and f.app_id is not distinct from a.id);

-- ---------------------------------------------------------------- 3. artikel blog
insert into public.posts (slug, title, excerpt, body, cover_url, app_id, topik, is_published, published_at)
select v.slug, v.judul, v.ringkas, v.isi, v.sampul, a.id, v.topik, true, v.terbit::timestamptz
from (values
  ('netflix-disney-prime-hbo-max-pilih-mana', 'Netflix, Disney+, Prime Video, atau HBO Max: Mana yang Paling Cocok Buatmu?',
   'Empat raksasa streaming punya kekuatan yang berbeda. Ini cara memilih berdasarkan selera tontonan, bukan sekadar ikut-ikutan.',
   'Hampir semua orang pernah bingung: langganan yang mana dulu? Jawabannya sederhana, tapi jarang dipakai: **pilih berdasarkan tontonan yang paling sering kamu cari**, bukan berdasarkan platform yang paling ramai dibicarakan.

![Kekuatan tiap platform](/assets/blog/netflix-disney-prime-hbo-max-pilih-mana-info.jpg)

## Netflix: paling lengkap untuk segala selera

Netflix unggul di keberagaman. Drama Korea, anime, film Indonesia, dokumenter kriminal, sampai reality show kompetisi ada di satu tempat. Bulan ini saja ada *Black Doves* musim 2, *The Altruists*, dan film laga Indonesia *Serangan Balik*. Kalau di rumah seleranya campur aduk, Netflix paling aman.

## Disney+: rumahnya Marvel, Pixar, dan keluarga

Disney+ cocok kalau kamu atau keluargamu penggemar Marvel, Star Wars, Pixar, dan National Geographic. Belakangan Disney+ juga rajin menayangkan drama Korea orisinal seperti *The Remarried Empress*. Untuk keluarga dengan anak, katalog animasinya sulit dikalahkan.

## Prime Video: serial mahal dan film Amazon

Prime Video dikenal lewat serial berbujet besar seperti *The Rings of Power* yang musim ketiganya tayang November ini, serta *Blade Runner 2099*. Katalog film Hollywood-nya juga lumayan, plus beberapa drama Korea seperti *Love in Disguise* dan *Nine to Six*.

## HBO Max: kualitas serial kelas atas

HBO terkenal dengan serial yang ditulis dan dibuat serius, dari drama kostum *The Gilded Age* sampai serial kriminal *City of God*. Kalau kamu suka cerita yang padat dan karakter yang kuat, HBO Max layak dicoba.

:::banding kiri="Kurang tepat" kanan="Lebih tepat"
Langganan semua sekaligus lalu jarang ditonton | Pilih satu, habiskan daftar tontonan, lalu ganti
Memilih karena satu judul viral | Memilih karena 3–5 judul yang memang ingin ditonton
Lupa mematikan perpanjangan | Catat tanggal berakhir langganan
:::

## Strategi hemat: rotasi

Kamu tidak harus berlangganan empat-empatnya sepanjang tahun. Banyak penonton memakai pola **rotasi**: satu bulan Netflix, bulan berikutnya Disney+ saat serial favorit tayang, lalu kembali lagi. Cek jadwal judul baru di halaman [Info Film](/film/) supaya rotasimu pas dengan tanggal tayang.

:::tips
Buat daftar 5 judul yang ingin kamu tonton bulan ini. Platform yang paling banyak muncul di daftar itu adalah langganan bulan ini.
:::

:::kuis
? Kamu suka drama Korea, film Indonesia, dan anime. Platform mana yang paling cocok?
+ Netflix
- HBO Max
- Disney+
> Netflix punya katalog drama Korea, film Indonesia, dan anime yang paling beragam di antara keempatnya.
:::
',
   '/assets/blog/netflix-disney-prime-hbo-max-pilih-mana.jpg', 'netflix'::text, 'aplikasi', '2026-11-03 09:00:00+07'),
  ('beda-akun-sharing-dan-private', 'Akun Sharing vs Private: Bedanya Apa dan Mana yang Kamu Butuhkan?',
   'Sharing lebih murah, private lebih leluasa. Kenali perbedaannya supaya tidak salah pilih paket aplikasi premium.',
   'Saat membeli aplikasi premium, kamu biasanya bertemu dua pilihan: **sharing** dan **private**. Keduanya sama-sama premium, tapi cara pakainya berbeda.

![Sharing vs Private](/assets/blog/beda-akun-sharing-dan-private-info.jpg)

## Apa itu akun sharing?

Akun sharing berarti satu akun premium dipakai beberapa orang, masing-masing dengan profil atau slot sendiri. Karena biayanya dibagi, harganya jauh lebih murah. Konsekuensinya, ada aturan yang harus dijaga bersama, misalnya tidak mengganti password, tidak mengubah pengaturan akun, dan hanya memakai profil milik sendiri.

## Apa itu akun private?

Akun private dipakai sendiri. Kamu bebas mengatur profil, bahasa, dan perangkat sesuai batas paket aplikasinya. Harganya lebih tinggi, tapi cocok untuk kamu yang ingin privasi penuh atau memakainya bersama keluarga sendiri.

| Pertanyaan | Pilih sharing | Pilih private |
|---|---|---|
| Budget terbatas? | Ya | |
| Butuh ganti pengaturan akun? | | Ya |
| Dipakai satu orang saja? | Ya | Bisa |
| Dipakai beberapa anggota keluarga? | | Ya |
| Baru ingin mencoba aplikasinya? | Ya | |

## Aturan main akun sharing

:::checklist id=blog-sharing
Pakai hanya profil atau slot milikmu
Jangan mengganti password, email, atau metode pembayaran
Jangan menghapus atau mengganti nama profil orang lain
Patuhi batas perangkat yang disepakati
Hubungi admin kalau ada kendala, jangan diutak-atik sendiri
:::

:::peringatan
Melanggar aturan sharing bisa membuat akun bermasalah untuk semua pengguna, dan biasanya membuat garansi tidak berlaku. Baca ketentuan [garansi & refund](/garansi-refund/) sebelum membeli.
:::

## Jadi, pilih yang mana?

Kalau kamu menonton sendiri dan ingin hemat, sharing biasanya sudah cukup. Kalau kamu ingin kendali penuh atau dipakai bersama keluarga, private lebih nyaman. Setiap aplikasi di [katalog IXVII.CO](/katalog/) menampilkan penjelasan tipe paketnya sebelum kamu memesan.
',
   '/assets/blog/beda-akun-sharing-dan-private.jpg', null, 'tips', '2026-11-02 10:00:00+07'),
  ('viu-iqiyi-wetv-drakor-dracin', 'Viu, iQIYI, atau WeTV: Aplikasi Terbaik untuk Pecinta Drakor dan Dracin',
   'Penggemar drama Asia punya banyak pilihan. Ini perbedaan Viu, iQIYI, dan WeTV supaya kamu tidak salah langganan.',
   'Kalau tontonan utamamu adalah drama Korea (drakor) atau drama China (dracin), aplikasi streaming umum belum tentu yang paling pas. Viu, iQIYI, dan WeTV dibangun khusus untuk penonton drama Asia.

![Kenali kekuatannya](/assets/blog/viu-iqiyi-wetv-drakor-dracin-info.jpg)

## Viu: andalan drakor terbaru

Viu dikenal cepat menayangkan drama Korea setelah tayang di negara asalnya, lengkap dengan subtitle Indonesia. Bulan ini ada *One of a Kind Romance* yang dibintangi Joy Red Velvet dan *Good Partner* musim 2. Viu juga punya serial orisinal dari Indonesia dan Malaysia, seperti *Bayangan Dendam*.

## iQIYI: gudangnya drama China

iQIYI kuat di drama China, mulai dari wuxia seperti *Shadow Punisher*, romansa misteri *Love in Red Dust*, sampai drama balas dendam istana *Yunchu''s Vengeance*. Kalau kamu suka kisah kolosal dan kostum megah, iQIYI pilihan utama.

## WeTV: drama Tencent dan serial lokal

WeTV menayangkan banyak drama produksi Tencent dan beberapa serial orisinal Indonesia, termasuk *Main Api* musim 2 yang tayang November ini. Cocok untuk kamu yang suka dracin modern dan drama lokal yang penuh konflik.

:::kartu
Suka drakor terbaru | Mulai dari Viu
Suka dracin kolosal & wuxia | Mulai dari iQIYI
Suka dracin modern & serial lokal | Mulai dari WeTV
Suka semuanya | Rotasi tiap bulan sesuai judul yang tayang
:::

:::tips
Drama Asia biasanya tayang bertahap, satu sampai dua episode per minggu. Kalau ingin maraton, tunggu sampai serialnya hampir tamat lalu langganan sebulan penuh.
:::

Lihat jadwal drama Asia terbaru beserta sinopsisnya di halaman [Info Film](/film/).
',
   '/assets/blog/viu-iqiyi-wetv-drakor-dracin.jpg', 'viu', 'aplikasi', '2026-11-01 14:00:00+07'),
  ('tontonan-baru-november-2026', 'Tontonan Baru November 2026 di Semua Aplikasi Streaming',
   'Dari Rings of Power musim 3 sampai drama Korea The Remarried Empress, ini rangkuman judul yang layak masuk daftar tontonan bulan ini.',
   'November biasanya jadi bulan yang padat sebelum musim liburan. Tahun ini juga begitu. Berikut sorotan dari berbagai aplikasi, dikelompokkan supaya mudah dipilih.

![Sorotan November 2026](/assets/blog/tontonan-baru-november-2026-info.jpg)

## Untuk penggemar fantasi dan fiksi ilmiah

- **The Rings of Power musim 3** (Prime Video, 11 November): Sauron makin berkuasa dan Galadriel harus menyatukan bangsa-bangsa merdeka.
- **Percy Jackson and the Olympians musim 3** (Disney+, 20 November): mengadaptasi buku *The Titan''s Curse*.
- **Blade Runner 2099** (Prime Video, 25 November): Michelle Yeoh memerankan replikan Blade Runner yang menua.

## Untuk pecinta drama Asia

- **The Remarried Empress** (Disney+, 4 November): adaptasi webtoon populer tentang permaisuri yang memilih menikah lagi.
- **One of a Kind Romance** (Viu, 9 November) dan **Good Partner musim 2** (Viu, 20 November).
- **Yunchu''s Vengeance** (iQIYI, 12 November): drama balas dendam di istana.

## Untuk yang suka thriller dan kisah nyata

- **Black Doves musim 2** (Netflix, 5 November): spionase London yang dingin dan rapi.
- **The Altruists** (Netflix, 19 November): dramatisasi runtuhnya bursa kripto FTX.
- **When a Witness Recants** (HBO Max, 17 November): dokumenter tentang tiga pria yang 36 tahun dipenjara karena putusan keliru.

## Dari Indonesia

- **Serangan Balik** (Netflix, 12 November): film laga tentang veteran yang melindungi keluarganya.
- **Main Api musim 2** (WeTV, 20 November) dan **Komedi Kacau musim 2** (Netflix, 26 November).

:::catatan
Tanggal tayang bisa berbeda di tiap negara dan kadang berubah. Daftar lengkap 90+ judul beserta sinopsisnya ada di halaman [Info Film](/film/), dan kami perbarui berkala.
:::
',
   '/assets/blog/tontonan-baru-november-2026.jpg', null, 'tips', '2026-11-03 12:00:00+07'),
  ('fitur-canva-pro-paling-berguna', '7 Fitur Canva Pro yang Paling Berguna untuk Konten Jualan',
   'Bukan cuma template premium. Ini fitur Canva Pro yang benar-benar menghemat waktu saat membuat konten setiap minggu.',
   'Canva versi gratis sudah sangat membantu. Tapi kalau kamu membuat konten setiap minggu untuk jualan atau klien, beberapa fitur Canva Pro bisa menghemat banyak jam kerja.

![Fitur Canva Pro favorit](/assets/blog/fitur-canva-pro-paling-berguna-info.jpg)

## 1. Brand Kit

Simpan logo, kode warna, dan font brand di satu tempat. Setiap membuat desain baru, warna dan font itu langsung tersedia. Hasilnya, feed jadi lebih konsisten tanpa harus mengingat kode warna.

## 2. Ubah ukuran desain

Satu desain feed bisa diubah menjadi story, banner, atau thumbnail dalam beberapa klik. Kamu tinggal merapikan posisi elemen, bukan mendesain ulang dari nol.

## 3. Hapus latar belakang

Foto produk yang diambil di meja berantakan bisa dibuat bersih dalam satu klik. Sangat berguna untuk katalog dan poster promo.

## 4. Elemen dan template premium

Pilihan foto, ilustrasi, ikon, dan template jauh lebih banyak. Ini membantu kalau kamu kehabisan ide tata letak.

## 5. Penjadwal konten

Desain bisa dijadwalkan untuk diunggah ke beberapa media sosial langsung dari Canva, sehingga kamu bisa membuat konten seminggu sekaligus.

## 6. Folder tanpa batas dan kerja tim

Desain klien, template, dan aset bisa dirapikan per folder, lalu dibagikan ke tim untuk diedit bersama.

## 7. Ekspor lebih fleksibel

Misalnya mengunduh PNG dengan latar transparan untuk logo atau stiker.

:::tips
Fitur Pro paling terasa manfaatnya kalau kamu punya rutinitas. Buat template feed, story, dan poster sekali, simpan di Brand Kit, lalu tinggal salin setiap minggu.
:::

:::catatan
Nama dan cakupan fitur bisa berubah sesuai pembaruan Canva. Detail paket Canva yang tersedia ada di [halaman Canva](/aplikasi/?app=canva).
:::
',
   '/assets/blog/fitur-canva-pro-paling-berguna.jpg', 'canva', 'aplikasi', '2026-10-30 10:00:00+07'),
  ('capcut-pro-vs-gratis', 'CapCut Pro vs Gratis: Kapan Kamu Perlu Upgrade?',
   'CapCut gratis sudah lengkap untuk pemula. Tapi ada beberapa situasi di mana versi Pro benar-benar terasa bedanya.',
   'CapCut adalah aplikasi edit video yang paling banyak dipakai kreator pemula di Indonesia. Versi gratisnya sudah bisa memotong, menambah teks, musik, dan caption. Lalu, kapan perlu Pro?

![CapCut Gratis vs Pro](/assets/blog/capcut-pro-vs-gratis-info.jpg)

## Cukup pakai yang gratis kalau…

- Kamu baru belajar dan membuat 1–3 video per minggu.
- Videomu sederhana: potongan, teks, musik, transisi dasar.
- Kamu belum punya gaya visual yang tetap.

## Pertimbangkan Pro kalau…

- Kamu membuat konten rutin untuk jualan, klien, atau akun yang sedang tumbuh.
- Kamu sering memakai efek, filter, atau template yang berlabel Pro.
- Kamu ingin fitur AI yang lebih lengkap untuk menghemat waktu, seperti caption otomatis dan penghapus latar.
- Kamu mengedit di beberapa perangkat dan butuh penyimpanan cloud lebih besar.

:::banding kiri="Boros" kanan="Efektif"
Langganan Pro tapi cuma bikin 1 video sebulan | Pakai gratis dulu sampai rutin
Pakai efek berlebihan karena "sudah bayar" | Pakai efek seperlunya, fokus ke cerita
Lupa durasi langganan | Pilih durasi sesuai rencana konten
:::

## Sharing atau private?

CapCut Pro tersedia dalam tipe sharing dan private. Sharing lebih hemat untuk kreator perorangan, sedangkan private cocok kalau kamu ingin mengelola akun sendiri. Baca juga [perbedaan akun sharing dan private](/blog/baca/?p=beda-akun-sharing-dan-private).

:::tips
Sebelum upgrade, catat fitur Pro yang benar-benar sering kamu klik selama dua minggu. Kalau daftarnya panjang, upgrade akan terasa sepadan.
:::

Ingin belajar edit video pendek dari dasar? Ebook [CapCut Reels Kilat](/produk/?p=capcut-reels-kilat) membahas struktur video, teknik merekam, sampai ekspor.
',
   '/assets/blog/capcut-pro-vs-gratis.jpg', 'capcut', 'aplikasi', '2026-10-28 15:00:00+07'),
  ('lightroom-vsco-picsart-edit-foto', 'Lightroom, VSCO, atau Picsart: Aplikasi Edit Foto Mana yang Cocok?',
   'Tiga aplikasi edit foto populer dengan karakter berbeda. Ini cara memilih sesuai kebutuhan: foto produk, feed estetik, atau desain kreatif.',
   'Ketiganya sama-sama aplikasi edit foto, tapi tujuan dan gayanya berbeda. Memilih yang tepat membuat waktu edit jauh lebih singkat.

![Pilih sesuai kebutuhan](/assets/blog/lightroom-vsco-picsart-edit-foto-info.jpg)

## Lightroom: kontrol warna paling detail

Lightroom cocok untuk kamu yang ingin hasil konsisten dan rapi, misalnya foto produk atau feed bisnis. Kamu bisa mengatur cahaya, warna per kanal, dan menyimpan **preset** sendiri supaya puluhan foto punya gaya yang sama.

## VSCO: filter estetik yang cepat

VSCO terkenal dengan filter bernuansa film yang halus. Cocok untuk feed personal yang ingin terlihat estetik tanpa banyak menggeser slider.

## Picsart: edit kreatif dan desain

Picsart lebih ke arah kreatif: kolase, stiker, teks, efek, dan alat AI untuk mengganti latar. Cocok untuk konten media sosial yang ramai dan playful.

| Kebutuhan | Pilihan utama |
|---|---|
| Foto produk marketplace | Lightroom |
| Feed estetik pribadi | VSCO |
| Konten lucu, kolase, stiker | Picsart |
| Preset buatan sendiri | Lightroom |

:::tips
Satu feed sebaiknya memakai satu gaya warna. Kalau kamu memakai lebih dari satu aplikasi, gunakan untuk tugas berbeda: misalnya Lightroom untuk warna, Picsart untuk menambah teks.
:::

Belajar mengedit foto produk dan membuat preset sendiri ada di ebook [Foto Estetik dengan Lightroom HP](/produk/?p=foto-estetik-lightroom).
',
   '/assets/blog/lightroom-vsco-picsart-edit-foto.jpg', 'lightroom-pro', 'aplikasi', '2026-10-26 11:00:00+07'),
  ('alight-motion-vs-capcut', 'Alight Motion vs CapCut: Untuk Edit Video yang Seperti Apa?',
   'Sama-sama editor video di HP, tapi Alight Motion unggul di animasi dan motion graphic, sedangkan CapCut di kecepatan edit konten.',
   'Banyak kreator memakai keduanya sekaligus. Bukan karena salah satunya kurang bagus, tapi karena keduanya unggul di hal berbeda.

![Alight Motion vs CapCut](/assets/blog/alight-motion-vs-capcut-info.jpg)

## Kapan memakai CapCut

CapCut paling enak untuk konten harian: memotong klip, menambah caption otomatis, musik, dan template yang sedang tren. Kalau targetmu membuat Reels atau TikTok dengan cepat, CapCut biasanya cukup.

## Kapan memakai Alight Motion

Alight Motion bekerja dengan **keyframe**, sehingga kamu bisa mengatur gerakan elemen secara detail. Cocok untuk teks beranimasi, logo bergerak, motion graphic, dan edit gaya anime yang butuh ketepatan.

:::kartu
Konten jualan harian | CapCut
Intro & logo animasi | Alight Motion
Lirik/teks berjalan rapi | Alight Motion
Video tren dengan template | CapCut
:::

## Alur kerja gabungan

1. Buat elemen animasi (judul, logo, transisi khusus) di Alight Motion.
2. Ekspor sebagai video, lalu masukkan ke CapCut.
3. Susun klip, tambah musik dan caption di CapCut.

:::tips
Simpan proyek animasi yang sering dipakai, misalnya intro 3 detik dengan logo, lalu tinggal ganti teksnya setiap membuat video baru.
:::

## Pertanyaan yang sering muncul

**Bisakah memakai keduanya sekaligus?** Bisa, dan banyak editor melakukannya. Buat elemen animasi seperti judul, transisi, atau logo bergerak di Alight Motion, ekspor dengan latar transparan atau warna polos, lalu gabungkan di CapCut bersama klip utama, musik, dan teks otomatis.

**Mana yang lebih ringan di HP?** CapCut umumnya lebih ringan untuk menyusun klip. Alight Motion bisa terasa berat saat memakai banyak lapisan dan efek. Kurangi resolusi pratinjau atau bagi proyek menjadi beberapa bagian kalau HP mulai patah-patah.

**Apa yang paling terasa di versi Pro?** Hilangnya watermark dan terbukanya efek serta fitur premium. Kalau kamu mengunggah konten secara rutin atau mengerjakan pesanan klien, dua hal ini biasanya sudah cukup jadi alasan.
',
   '/assets/blog/alight-motion-vs-capcut.jpg', 'alight-motion-pro', 'aplikasi', '2026-10-24 16:00:00+07'),
  ('chatgpt-go-plus-claude-gemini-pilih-mana', 'ChatGPT Go, ChatGPT Plus, Claude, atau Gemini: Mana untuk Kuliah dan Kerja?',
   'Asisten AI makin banyak dan paketnya beragam. Ini cara memilih berdasarkan kebutuhan harian, bukan sekadar yang paling ramai.',
   'ChatGPT, Claude, dan Gemini sama-sama asisten AI yang bisa diajak menulis, merangkum, menjelaskan materi, dan membantu kerja. Perbedaannya sering terasa di gaya jawaban, batas pemakaian, dan fitur tambahan.

![Cara memilih asisten AI](/assets/blog/chatgpt-go-plus-claude-gemini-pilih-mana-info.jpg)

## ChatGPT Go vs ChatGPT Plus

**ChatGPT Go** adalah paket yang lebih terjangkau dengan batas pesan, pembuatan gambar, unggah file, dan memori yang lebih longgar dibanding versi gratis. Indonesia termasuk negara pertama yang mendapat paket ini. **ChatGPT Plus** memberi batas yang lebih besar dan akses fitur yang lebih lengkap, cocok untuk pemakaian berat setiap hari.

## Claude

Claude disukai banyak penulis dan pelajar karena jawabannya runtut dan nyaman dibaca, serta kuat untuk membaca dokumen panjang. Cocok untuk merangkum jurnal, menyusun draf tulisan, dan membantu menulis kode.

## Gemini

Gemini terhubung erat dengan layanan Google, sehingga praktis untuk kamu yang banyak bekerja di Gmail, Docs, dan Drive.

:::banding kiri="Pemakaian kurang bijak" kanan="Pemakaian yang tepat"
Menyalin jawaban AI mentah-mentah untuk tugas | Pakai AI untuk memahami, lalu tulis dengan kata-kata sendiri
Percaya semua angka dan kutipan | Cek fakta dan sumber aslinya
Memasukkan data pribadi orang lain | Samarkan data sensitif
:::

:::tips
Uji ketiganya dengan satu tugas yang sama, misalnya merangkum satu bab materi kuliah. Pilih yang hasilnya paling sesuai gaya belajarmu.
:::

:::catatan
Fitur dan batas tiap paket AI sering diperbarui. Cek detail terbaru di halaman masing-masing aplikasi di [katalog IXVII.CO](/katalog/). Ingin memakai AI lebih efektif? Ada ebook [AI Kerja Cepat](/produk/?p=ai-kerja-cepat) dengan 30+ prompt siap pakai.
:::
',
   '/assets/blog/chatgpt-go-plus-claude-gemini-pilih-mana.jpg', 'chatgpt-go', 'aplikasi', '2026-10-22 09:30:00+07'),
  ('perplexity-untuk-riset-dan-tugas', 'Perplexity untuk Riset: Cara Cepat Cari Jawaban Lengkap dengan Sumbernya',
   'Perplexity menggabungkan mesin pencari dan AI. Jawabannya disertai sumber, sehingga cocok untuk riset awal tugas dan pekerjaan.',
   'Berbeda dari asisten AI biasa, Perplexity bekerja seperti mesin pencari yang bisa diajak ngobrol. Setiap jawaban biasanya disertai daftar sumber, sehingga kamu bisa memeriksa dari mana informasinya berasal.

![Alur riset dengan Perplexity](/assets/blog/perplexity-untuk-riset-dan-tugas-info.jpg)

## Cocok untuk apa?

- Riset awal tugas kuliah atau laporan kerja.
- Mencari perbandingan produk, layanan, atau aturan terbaru.
- Merangkum berita dari beberapa sumber sekaligus.

## Contoh pertanyaan yang baik

:::kartu
Kurang jelas | "Jelaskan inflasi"
Lebih jelas | "Jelaskan penyebab inflasi Indonesia 2025–2026 dalam 5 poin, sertakan sumber resmi"
Kurang jelas | "Laptop bagus"
Lebih jelas | "Bandingkan 3 laptop di bawah 10 juta untuk desain grafis, fokus RAM dan layar"
:::

## Gratis atau Pro?

Versi gratis sudah cukup untuk pencarian ringan. Versi Pro memberi lebih banyak pencarian mendalam per hari, pilihan model AI, dan unggah file untuk dianalisis. Kalau kamu riset hampir setiap hari, Pro akan terasa manfaatnya.

:::peringatan
Sumber yang dikutip AI tetap perlu dibuka dan dibaca. Kadang AI salah menyimpulkan isi sumber. Untuk tugas akademik, kutip sumber aslinya, bukan jawaban AI-nya.
:::

:::tips
Tambahkan kata "sumber resmi" atau "jurnal" di pertanyaanmu agar hasil yang ditampilkan lebih bisa dipertanggungjawabkan.
:::

## Pertanyaan yang sering muncul

**Apakah jawaban Perplexity pasti benar?** Tidak. Perplexity membantu menemukan dan merangkum sumber, tetapi rangkumannya tetap bisa keliru atau kurang lengkap. Buka sumber yang dikutip, terutama untuk angka, tanggal, dan kutipan langsung.

**Bolehkah dipakai untuk tugas sekolah atau kuliah?** Pakai sebagai alat bantu riset, bukan untuk menyalin jawaban. Ikuti aturan dosen atau sekolahmu soal penggunaan AI, dan kutip sumber asli yang kamu baca, bukan Perplexity-nya.

**Apa bedanya dengan mesin pencari biasa?** Mesin pencari memberi daftar tautan yang harus kamu baca satu per satu. Perplexity langsung menyusun jawaban dari beberapa sumber sekaligus, lengkap dengan tautannya, sehingga cocok sebagai titik awal riset.
',
   '/assets/blog/perplexity-untuk-riset-dan-tugas.jpg', 'perplexity-ai', 'aplikasi', '2026-10-20 10:00:00+07'),
  ('spotify-vs-apple-music', 'Spotify vs Apple Music: Mana yang Lebih Cocok untuk Telingamu?',
   'Dua layanan musik terbesar dengan kekuatan berbeda: rekomendasi playlist dan podcast di Spotify, kualitas audio dan integrasi iPhone di Apple Music.',
   'Keduanya sama-sama memberi jutaan lagu tanpa iklan, bisa diunduh untuk didengar offline, dan bisa diputar di banyak perangkat. Yang membedakan adalah pengalaman sehari-harinya.

![Spotify vs Apple Music](/assets/blog/spotify-vs-apple-music-info.jpg)

## Spotify: jagonya rekomendasi

Spotify terkenal dengan playlist personal yang pas dengan selera, serta katalog podcast yang sangat besar. Kalau kamu suka menemukan lagu baru tanpa repot mencari, Spotify biasanya lebih memanjakan.

## Apple Music: kualitas audio dan ekosistem Apple

Apple Music menawarkan kualitas audio tinggi, termasuk lossless dan spatial audio untuk lagu tertentu, serta lirik yang tampil sinkron. Kalau kamu memakai iPhone, AirPods, atau Mac, semuanya terasa menyatu. Apple Music juga tersedia di Android.

| Kamu tipe… | Pilihan |
|---|---|
| Suka playlist otomatis & podcast | Spotify |
| Pakai iPhone & AirPods | Apple Music |
| Mendengar di banyak perangkat berbeda | Spotify |
| Peduli kualitas audio | Apple Music |

:::tips
Pindah layanan bukan berarti kehilangan playlist. Ada aplikasi pihak ketiga untuk memindahkan playlist antar layanan, atau kamu bisa membuat ulang playlist favoritmu sedikit demi sedikit.
:::

Paket Spotify dan Apple Music yang tersedia bisa kamu lihat di halaman [Spotify](/aplikasi/?app=spotify) dan [Apple Music](/aplikasi/?app=apple-music).

## Pertanyaan yang sering muncul

**Bisakah pindah dari Spotify ke Apple Music tanpa kehilangan playlist?** Bisa dengan bantuan layanan pemindah playlist pihak ketiga. Tidak semua lagu selalu cocok sempurna, jadi periksa lagi playlist yang penting setelah dipindahkan.

**Mana yang lebih cocok untuk podcast?** Spotify lebih kuat untuk podcast karena semuanya ada dalam satu aplikasi. Pengguna Apple Music biasanya mendengarkan podcast lewat aplikasi Apple Podcasts yang terpisah.

**Apakah kualitas lossless terasa bedanya?** Bedanya paling terasa dengan headphone atau speaker yang bagus dan file yang tidak dikompres ulang. Dengan earphone Bluetooth biasa, perbedaannya sering tidak terlalu terasa.
',
   '/assets/blog/spotify-vs-apple-music.jpg', 'spotify', 'aplikasi', '2026-10-18 13:00:00+07'),
  ('youtube-premium-worth-it', 'YouTube Premium: Benarkah Worth It untuk Pemakaian Sehari-hari?',
   'Tanpa iklan, bisa diputar di latar belakang, dan bisa diunduh. Ini hitung-hitungan sederhana apakah YouTube Premium sepadan untukmu.',
   'Kalau kamu membuka YouTube lebih dari satu jam setiap hari, iklan bisa menghabiskan banyak waktu. YouTube Premium menghilangkan itu, plus beberapa fitur lain yang sering terlupakan.

![Yang kamu dapat](/assets/blog/youtube-premium-worth-it-info.jpg)

## Fitur yang paling terasa

- **Tanpa iklan** di video, termasuk saat menonton di TV.
- **Putar di latar belakang**: kajian, podcast, atau musik tetap jalan saat layar HP mati.
- **Unduh video** untuk ditonton offline, cocok saat perjalanan.
- **YouTube Music Premium** sudah termasuk, jadi tidak perlu langganan musik terpisah.

## Hitung-hitungan sederhana

Bayangkan kamu menonton 2 jam sehari dan rata-rata melihat beberapa menit iklan per jam. Dalam sebulan, waktu yang habis untuk iklan bisa mencapai beberapa jam. Kalau waktu itu berharga untukmu, Premium layak dipertimbangkan.

:::kartu
Sangat cocok | Sering mendengar kajian, podcast, atau musik dari YouTube
Cocok | Sering menonton di perjalanan dan butuh unduhan
Kurang perlu | Hanya membuka YouTube sesekali
:::

:::tips
Kalau kamu sudah berlangganan Spotify atau Apple Music hanya untuk musik, coba bandingkan: YouTube Premium mungkin bisa menggantikan keduanya sekaligus.
:::

## Pertanyaan yang sering muncul

**Apakah YouTube Music ikut didapat?** Ya, YouTube Premium sudah termasuk YouTube Music Premium, jadi kamu bisa mendengarkan musik tanpa iklan dan memutarnya di latar belakang.

**Apakah video yang diunduh bisa ditonton selamanya?** Tidak. Unduhan tersimpan di dalam aplikasi dan perlu tersambung internet secara berkala agar tetap bisa diputar. Unduhan juga tidak bisa dipindahkan sebagai file video biasa.

**Kapan Premium paling terasa manfaatnya?** Saat kamu menonton YouTube berjam-jam setiap hari, sering mendengarkan kajian atau podcast dengan layar mati, atau sering bepergian dan butuh tontonan offline.
',
   '/assets/blog/youtube-premium-worth-it.jpg', 'youtube-indplan', 'aplikasi', '2026-10-16 19:00:00+07'),
  ('grammarly-vs-quillbot-tugas-kuliah', 'Grammarly vs QuillBot: Teman Menulis Tugas Bahasa Inggris',
   'Grammarly membantu tulisan bebas salah dan enak dibaca, QuillBot membantu memparafrasa dan merangkum. Keduanya berguna, asal dipakai dengan jujur.',
   'Menulis esai atau skripsi dalam bahasa Inggris sering membuat ragu: sudah benar belum grammarnya? Grammarly dan QuillBot bisa membantu, dengan peran yang berbeda.

![Grammarly vs QuillBot](/assets/blog/grammarly-vs-quillbot-tugas-kuliah-info.jpg)

## Grammarly: editor yang teliti

Grammarly memeriksa ejaan, tata bahasa, tanda baca, sampai nada tulisan. Versi Premium memberi saran kejelasan, pilihan kata yang lebih tepat, dan gaya yang lebih formal untuk tulisan akademik.

## QuillBot: membantu mengungkapkan ulang

QuillBot terkenal dengan fitur parafrasa, yaitu menulis ulang kalimat dengan susunan berbeda. Ada juga peringkas teks dan pembuat sitasi yang memudahkan menyusun daftar pustaka.

:::banding kiri="Tidak jujur" kanan="Pemakaian yang benar"
Memparafrasa tulisan orang lain lalu mengakuinya | Parafrasa tulisanmu sendiri agar lebih jelas
Menyalin hasil rangkuman tanpa membaca sumber | Pakai rangkuman untuk memahami, lalu baca sumbernya
Menghapus kutipan supaya lolos cek plagiat | Kutip dan cantumkan sumber dengan benar
:::

## Alur kerja yang disarankan

1. Tulis draf dengan kata-katamu sendiri.
2. Rapikan kalimat yang terasa janggal dengan QuillBot.
3. Periksa ejaan, grammar, dan nada dengan Grammarly.
4. Baca ulang seluruh tulisan sebelum dikumpulkan.

:::peringatan
Setiap kampus punya aturan soal penggunaan alat AI dan parafrasa. Pastikan kamu mengikuti aturan dosen dan kampusmu.
:::
',
   '/assets/blog/grammarly-vs-quillbot-tugas-kuliah.jpg', 'grammarly', 'aplikasi', '2026-10-14 08:30:00+07'),
  ('zoom-pro-kapan-perlu', 'Zoom Pro: Kapan Kamu Benar-Benar Perlu Akun Berbayar?',
   'Batas waktu rapat di akun gratis sering bikin repot. Ini situasi di mana Zoom Pro sepadan, dan kapan aplikasi lain sudah cukup.',
   'Akun Zoom gratis dibatasi durasi rapat, sehingga pertemuan bisa terputus di tengah jalan. Untuk ngobrol singkat mungkin tidak masalah, tapi untuk kelas, rapat organisasi, atau webinar, gangguan ini bisa merepotkan.

![Tanda kamu butuh Zoom Pro](/assets/blog/zoom-pro-kapan-perlu-info.jpg)

## Kapan Zoom Pro sepadan?

- Kamu rutin mengajar les, kelas online, atau mentoring.
- Organisasi kampus atau komunitasmu sering rapat lebih dari 40 menit.
- Kamu menyelenggarakan webinar dan butuh kapasitas peserta yang lebih besar.
- Kamu perlu merekam pertemuan sebagai arsip.

## Kapan cukup dengan alternatif?

Untuk pertemuan singkat dengan sedikit orang, aplikasi rapat lain atau panggilan video di aplikasi chat sudah cukup. Tidak semua kebutuhan harus diselesaikan dengan paket berbayar.

:::checklist id=blog-zoom
Atur jadwal dan kirim tautan rapat minimal sehari sebelumnya
Aktifkan ruang tunggu untuk acara terbuka
Tentukan siapa yang boleh berbagi layar
Uji mikrofon dan kamera 10 menit sebelum mulai
Simpan rekaman di folder yang jelas namanya
:::

:::tips
Untuk webinar terbuka, aktifkan ruang tunggu dan nonaktifkan berbagi layar untuk peserta agar acara tetap tertib.
:::

## Pertanyaan yang sering muncul

**Apa batasan Zoom gratis yang paling terasa?** Durasi rapat. Pada akun gratis, rapat dengan tiga peserta atau lebih dibatasi waktunya, sehingga rapat panjang harus diulang dari awal. Akun Pro membuat rapat bisa berlangsung jauh lebih lama.

**Apakah peserta rapat juga harus punya Pro?** Tidak. Yang perlu akun Pro hanya host atau pembuat rapat. Peserta tetap bisa bergabung dengan akun gratis atau tanpa akun.

**Bagaimana kalau hanya butuh untuk satu acara?** Pilih durasi langganan pendek untuk periode acara saja, lalu atur ulang setelah selesai. Ini lebih hemat daripada langganan panjang yang tidak terpakai.
',
   '/assets/blog/zoom-pro-kapan-perlu.jpg', 'zoom-100', 'aplikasi', '2026-10-12 10:00:00+07'),
  ('microsoft-365-vs-wps-mahasiswa', 'Microsoft 365 vs WPS Office: Mana yang Pas untuk Mahasiswa?',
   'Word, Excel, dan PowerPoint versus WPS yang ringan. Bandingkan dari sisi kebutuhan kuliah, kolaborasi, dan penyimpanan.',
   'Hampir semua tugas kuliah berujung di dokumen, spreadsheet, atau presentasi. Pilihan aplikasinya akan memengaruhi kenyamanan kerjamu selama bertahun-tahun.

![Microsoft 365 vs WPS](/assets/blog/microsoft-365-vs-wps-mahasiswa-info.jpg)

## Microsoft 365: standar kantor dan kampus

Microsoft 365 berisi Word, Excel, PowerPoint, dan penyimpanan OneDrive. Format dokumennya paling umum dipakai dosen dan kantor, dan fitur kolaborasinya memudahkan kerja kelompok secara bersamaan.

## WPS Office: ringan dan praktis

WPS Office ringan dijalankan di HP maupun laptop dengan spesifikasi sederhana, dan bisa membuka file Word, Excel, serta PowerPoint. Versi Pro menghilangkan iklan dan membuka alat PDF yang lengkap, seperti mengubah PDF ke Word atau menggabungkan file.

| Kebutuhan | Pilihan |
|---|---|
| Skripsi dengan format ketat | Microsoft 365 |
| Kerja kelompok di dokumen yang sama | Microsoft 365 |
| Laptop atau HP spesifikasi rendah | WPS |
| Banyak mengolah PDF | WPS Pro |

:::tips
Apa pun aplikasinya, simpan tugas penting di cloud dan buat salinan cadangan. Kehilangan file skripsi karena laptop rusak adalah mimpi buruk yang bisa dicegah.
:::

## Pertanyaan yang sering muncul

**Apakah file dari WPS aman dibuka di Microsoft Word?** Umumnya aman karena WPS bisa menyimpan dalam format .docx, .xlsx, dan .pptx. Tetap periksa ulang tata letak, terutama tabel, nomor halaman, dan rumus, sebelum mengirim tugas penting.

**Apa kelebihan Microsoft 365 selain aplikasinya?** Penyimpanan OneDrive yang besar, sinkronisasi antarperangkat, dan fitur kolaborasi untuk mengedit dokumen bersama secara bersamaan. Ini sangat membantu untuk tugas kelompok.

**Bagaimana kalau kampus memberi akun Microsoft?** Banyak kampus menyediakan akun Microsoft untuk mahasiswa. Cek dulu ke bagian TI kampusmu sebelum berlangganan sendiri.
',
   '/assets/blog/microsoft-365-vs-wps-mahasiswa.jpg', 'ms-365', 'aplikasi', '2026-10-10 09:00:00+07'),
  ('duolingo-super-belajar-bahasa', 'Belajar Bahasa dengan Duolingo: Apakah Perlu Duolingo Super?',
   'Duolingo membuat belajar bahasa terasa seperti main gim. Ini cara memaksimalkannya dan kapan versi Super membantu.',
   'Kunci belajar bahasa adalah **rutin**, bukan lama. Duolingo membantu membangun kebiasaan itu lewat pelajaran singkat, poin, dan streak harian.

![Rutinitas 15 menit sehari](/assets/blog/duolingo-super-belajar-bahasa-info.jpg)

## Memaksimalkan Duolingo

- Pilih target harian yang realistis, misalnya 10–15 menit.
- Jangan hanya mengejar streak. Ulangi pelajaran yang masih sering salah.
- Ucapkan jawaban dengan suara, jangan hanya mengetik.
- Lengkapi dengan menonton atau mendengar konten dalam bahasa yang sedang dipelajari.

## Kapan Duolingo Super membantu?

Versi Super menghilangkan iklan dan memberi lebih banyak keleluasaan berlatih, misalnya tidak terhenti saat kehabisan nyawa atau energi latihan. Kalau kamu belajar setiap hari dan sering terganggu iklan atau batas latihan, Super terasa sepadan.

:::kartu
Pelajar santai | Versi gratis cukup
Belajar setiap hari | Super membuat lebih lancar
Persiapan ujian bahasa | Duolingo + materi ujian khusus
:::

:::tips
Pakai fitur nonton dengan subtitle bahasa target di aplikasi streaming favoritmu. Drama Korea bisa jadi latihan bahasa Korea yang menyenangkan.
:::

## Pertanyaan yang sering muncul

**Apakah Duolingo cukup untuk lancar berbahasa?** Duolingo sangat baik untuk membangun kebiasaan, kosakata, dan dasar tata bahasa. Untuk lancar berbicara, lengkapi dengan latihan percakapan, membaca, dan mendengar konten asli.

**Bagaimana kalau streak putus?** Tidak apa-apa. Yang penting kembali belajar keesokan harinya. Streak hanyalah alat penyemangat, bukan ukuran kemampuanmu.

**Bahasa apa yang cocok dipelajari dulu?** Pilih yang paling sering kamu temui atau butuhkan, misalnya bahasa Inggris untuk kuliah dan kerja, atau bahasa Korea dan Jepang kalau kamu sering menonton drama dan anime. Motivasi pribadi membuatmu lebih konsisten.
',
   '/assets/blog/duolingo-super-belajar-bahasa.jpg', 'duolingo', 'aplikasi', '2026-10-08 07:00:00+07'),
  ('goodnotes-camscanner-scribd-pelajar', 'Goodnotes, CamScanner, dan Scribd: Trio Aplikasi Andalan Pelajar',
   'Mencatat dengan rapi, memindai dokumen jadi PDF, dan mencari bahan bacaan. Ini cara memakai ketiganya dalam satu alur belajar.',
   'Belajar digital paling nyaman kalau alatnya saling melengkapi. Tiga aplikasi ini sering jadi andalan pelajar dan mahasiswa.

![Alur belajar digital](/assets/blog/goodnotes-camscanner-scribd-pelajar-info.jpg)

## Goodnotes: buku catatan digital

Goodnotes memungkinkan kamu menulis tangan di tablet, menandai PDF materi kuliah, dan mencari tulisan tanganmu sendiri. Semua catatan tersusun rapi per folder mata kuliah.

## CamScanner: pemindai di saku

Foto dokumen, handout, atau tulisan di papan tulis bisa diubah menjadi PDF yang rapi dan lurus. Fitur pengenal teks membantu menyalin isi dokumen tanpa mengetik ulang.

## Scribd: perpustakaan dokumen

Scribd berisi banyak dokumen seperti makalah, slide presentasi, dan panduan yang diunggah pengguna. Cocok untuk mencari referensi tambahan. Koleksi ebook dan audiobook kini berada di aplikasi saudaranya, Everand.

:::checklist id=blog-belajar
Buat folder per mata kuliah di Goodnotes
Pindai handout di hari yang sama dengan CamScanner
Simpan sumber referensi beserta tautannya
Rangkum catatan seminggu sekali
:::

:::peringatan
Dokumen di Scribd diunggah oleh pengguna. Periksa kredibilitasnya dan kutip sumber aslinya untuk tugas akademik.
:::

## Pertanyaan yang sering muncul

**Apakah Goodnotes bisa dipakai tanpa stylus?** Bisa untuk mengetik, menandai, dan menyusun catatan, tetapi pengalaman terbaiknya tetap dengan stylus karena dirancang untuk tulisan tangan.

**Bagaimana agar hasil pindaian CamScanner tajam?** Pindai di tempat terang, letakkan dokumen di permukaan yang kontras, dan tahan HP sejajar dengan kertas. Gunakan mode dokumen agar sudut kertas otomatis diluruskan.

**Bagaimana menjaga catatan tidak hilang?** Aktifkan pencadangan otomatis ke layanan cloud dan ekspor catatan penting ke PDF secara berkala, terutama menjelang ujian.
',
   '/assets/blog/goodnotes-camscanner-scribd-pelajar.jpg', 'goodnotes', 'aplikasi', '2026-10-06 18:00:00+07'),
  ('vidio-vs-vision-plus-nonton-olahraga', 'Vidio vs Vision+: Aplikasi Lokal untuk Nonton Olahraga dan TV',
   'Dua platform lokal dengan siaran TV dan olahraga. Ini cara memilih berdasarkan pertandingan dan acara yang ingin kamu tonton.',
   'Untuk penonton di Indonesia, Vidio dan Vision+ punya nilai lebih: siaran kanal TV lokal, acara olahraga, dan konten orisinal berbahasa Indonesia.

![Sebelum berlangganan](/assets/blog/vidio-vs-vision-plus-nonton-olahraga-info.jpg)

## Vidio

Vidio menghadirkan siaran langsung kanal TV nasional, beragam acara olahraga, serta Vidio Original seperti *Main Belakang* yang tayang Oktober ini. Cocok kalau kamu ingin satu aplikasi untuk TV, olahraga, dan serial lokal.

## Vision+

Vision+ juga menyiarkan kanal TV dan punya paket olahraga premium. Pilihan paketnya biasanya dibagi per jenis konten, jadi kamu bisa memilih yang paling sesuai.

:::peringatan
Hak siar olahraga sering berganti dari musim ke musim. Sebelum berlangganan untuk satu liga atau turnamen, pastikan pertandingan itu memang tayang di aplikasi yang kamu pilih pada musim ini.
:::

## Tips nonton siaran langsung tanpa putus

- Gunakan Wi-Fi atau sinyal 4G/5G yang stabil.
- Turunkan kualitas video kalau koneksi tersendat. Lebih baik sedikit buram daripada terus berhenti.
- Tutup aplikasi lain yang memakai internet di latar belakang.
- Untuk TV, sambungkan kabel LAN kalau memungkinkan.

:::tips
Paket olahraga biasanya paling terasa manfaatnya saat musim kompetisi berjalan. Atur durasi langganan mengikuti jadwal turnamen.
:::

## Pertanyaan yang sering muncul

**Kenapa pertandingan yang sama kadang pindah aplikasi?** Hak siar olahraga dibeli per kompetisi dan per musim. Liga yang tahun ini tayang di satu aplikasi bisa pindah ke aplikasi lain pada musim berikutnya, jadi selalu cek jadwal dan pemegang hak siar terbaru.

**Bagaimana agar siaran langsung tidak patah-patah?** Gunakan koneksi yang stabil, tutup aplikasi lain yang memakai internet, dan turunkan kualitas video sedikit saat sinyal melemah. Wi-Fi biasanya lebih stabil daripada data seluler untuk pertandingan panjang.

**Paket mana yang dipilih?** Pastikan paket yang kamu ambil benar-benar mencakup kompetisi yang ingin ditonton. Tidak semua paket membuka semua siaran olahraga.
',
   '/assets/blog/vidio-vs-vision-plus-nonton-olahraga.jpg', 'vidio-platinum', 'aplikasi', '2026-10-04 20:00:00+07'),
  ('nonton-anime-crunchyroll-bstation', 'Nonton Anime Legal: Crunchyroll, Bilibili, dan Netflix',
   'Anime musim gugur 2026 sudah dimulai. Ini perbandingan tempat nonton anime yang legal dengan subtitle dan kualitas yang baik.',
   'Musim anime Oktober 2026 dibuka dengan judul-judul besar seperti *The Apothecary Diaries* musim 3, *Black Clover* musim 2, dan adaptasi baru *Magic Knight Rayearth*. Di mana menontonnya?

![Tempat nonton anime](/assets/blog/nonton-anime-crunchyroll-bstation-info.jpg)

## Crunchyroll

Crunchyroll adalah layanan khusus anime dengan katalog sangat besar dan banyak judul yang tayang tidak lama setelah rilis di Jepang. Pilihan utama untuk penggemar berat anime musiman.

## Bilibili (B-station)

Bilibili juga menayangkan anime musiman di beberapa negara Asia Tenggara, ditambah konten kreator dan video lain. Cocok kalau kamu juga suka menonton video pendek dan komunitasnya.

## Netflix

Netflix punya anime orisinal yang tidak tayang di tempat lain, seperti *Cyberpunk: Edgerunners 2*, *Bass X Machina*, dan *Fool Night*. Kalau kamu sudah berlangganan Netflix untuk film dan serial, anime-anime ini jadi bonus.

:::kartu
Ingin anime musiman paling lengkap | Crunchyroll
Suka anime + video komunitas | Bilibili
Sudah langganan Netflix | Nikmati anime orisinalnya
:::

:::tips
Nonton dari layanan resmi berarti mendukung studio dan animator yang membuatnya, sekaligus mendapat kualitas gambar dan subtitle yang lebih baik.
:::

Jadwal anime terbaru dan sinopsisnya ada di halaman [Info Film](/film/).

## Pertanyaan yang sering muncul

**Apa itu simulcast?** Simulcast berarti episode baru tayang dengan subtitle tidak lama setelah tayang di Jepang. Cocok untuk kamu yang ingin mengikuti anime musiman tanpa menunggu lama.

**Apakah semua judul tersedia di Indonesia?** Tidak selalu. Ketersediaan judul berbeda di setiap negara karena lisensinya. Cek katalog di wilayahmu sebelum berlangganan untuk judul tertentu.

**Mana yang cocok untuk pemula?** Mulai dari judul populer musim ini atau seri yang sudah tamat agar bisa maraton. Halaman [Info Film](/film/) juga memuat beberapa anime yang sedang dan akan tayang.
',
   '/assets/blog/nonton-anime-crunchyroll-bstation.jpg', 'crunchyroll', 'aplikasi', '2026-10-02 21:00:00+07'),
  ('drama-pendek-reelshort-dramabox', 'Kenapa Drama Pendek ReelShort dan DramaBox Begitu Bikin Ketagihan?',
   'Episode satu sampai dua menit, cerita penuh kejutan, dan format vertikal. Ini alasan drama pendek digemari, plus cara menontonnya dengan bijak.',
   'Drama pendek vertikal menjadi salah satu tontonan paling cepat berkembang. ReelShort dan DramaBox termasuk aplikasi yang paling sering muncul di beranda media sosial.

![Resep drama pendek](/assets/blog/drama-pendek-reelshort-dramabox-info.jpg)

## Kenapa bikin ketagihan?

Setiap episode berakhir dengan kejutan kecil, sehingga jari otomatis menekan episode berikutnya. Ceritanya langsung ke inti: pernikahan kontrak, balas dendam, identitas tersembunyi, atau cinta beda status. Format vertikal membuatnya nyaman ditonton sambil rebahan atau di perjalanan.

## Model langganan

Banyak judul membuka beberapa episode awal secara gratis, lalu episode berikutnya dibuka dengan koin atau langganan. Kalau kamu menonton beberapa judul sekaligus, langganan biasanya lebih hemat daripada membeli koin terus-menerus.

:::banding kiri="Bikin boros" kanan="Lebih bijak"
Membeli koin berkali-kali untuk satu judul | Hitung dulu, langganan sering lebih hemat
Menonton sampai larut setiap malam | Tentukan batas episode per hari
Menonton semua judul yang lewat di beranda | Pilih 1–2 judul dan tuntaskan
:::

:::tips
Aktifkan pengingat waktu layar di HP. Episode yang pendek membuat waktu terasa cepat berlalu tanpa disadari.
:::

## Pertanyaan yang sering muncul

**Kenapa drama pendek terasa bikin ketagihan?** Setiap episode hanya sekitar satu sampai beberapa menit dan selalu berhenti di bagian paling menegangkan. Pola ini membuat kita terus ingin membuka episode berikutnya.

**Bagaimana agar tidak boros koin?** Tentukan batas belanja koin per bulan, tonton episode gratis dulu untuk menilai ceritanya, dan pertimbangkan langganan kalau kamu memang rutin menonton banyak judul.

**Apakah aman untuk anak?** Tidak semua judul cocok untuk anak karena banyak tema dewasa. Dampingi anak dan gunakan pengaturan usia bila tersedia.
',
   '/assets/blog/drama-pendek-reelshort-dramabox.jpg', 'reelshort', 'aplikasi', '2026-09-30 19:30:00+07'),
  ('aplikasi-ai-foto-remini-wink-aman', 'Remini, Meitu, dan Wink: Memperjelas Foto dengan AI, Amankah?',
   'Aplikasi AI bisa membuat foto lama jadi tajam dan video jadi jernih. Ini manfaatnya, batasannya, dan hal yang perlu dijaga soal privasi.',
   'Aplikasi seperti Remini, Meitu, dan Wink memakai AI untuk mempertajam foto buram, memperbaiki foto lama, atau menjernihkan video. Hasilnya sering mengejutkan, tapi ada beberapa hal yang perlu kamu pahami.

![Pakai AI foto dengan aman](/assets/blog/aplikasi-ai-foto-remini-wink-aman-info.jpg)

## Manfaatnya

- Memperjelas foto lama keluarga yang buram.
- Memperbaiki foto produk yang kurang tajam.
- Menjernihkan video pendek sebelum diunggah.

## Batasannya

AI tidak benar-benar "mengembalikan" detail yang hilang. Ia **menebak** detail yang masuk akal. Karena itu, wajah bisa sedikit berubah dari aslinya. Untuk foto kenangan, simpan selalu versi aslinya.

## Soal privasi

Sebagian besar proses AI berjalan di server, sehingga fotomu diunggah ke internet. Baca kebijakan privasi aplikasinya, dan jangan mengunggah foto dokumen penting atau foto orang lain tanpa izin.

:::peringatan
Untuk jualan, jangan memakai AI yang mengubah tampilan produk sampai berbeda dari aslinya. Pembeli berhak komplain kalau barang yang diterima tidak sesuai foto.
:::

:::tips
Untuk foto produk, gunakan AI hanya untuk mempertajam, lalu atur warnanya secara manual agar tetap sesuai aslinya.
:::

## Pertanyaan yang sering muncul

**Apakah foto yang diunggah disimpan oleh aplikasi?** Bergantung pada kebijakan masing-masing aplikasi. Baca kebijakan privasinya, terutama bagian penyimpanan data wajah, dan hapus riwayat unggahan bila fiturnya tersedia.

**Kenapa hasil AI kadang terlihat tidak alami?** AI menebak detail yang hilang, sehingga wajah bisa terlihat terlalu halus atau berubah. Gunakan tingkat penyempurnaan yang lebih rendah agar hasilnya tetap mirip aslinya.

**Bolehkah mengedit foto orang lain?** Mintalah izin terlebih dahulu, terutama sebelum mengunggahnya ke media sosial. Jangan memakai AI untuk mengubah foto orang lain menjadi sesuatu yang merugikan atau mempermalukan.
',
   '/assets/blog/aplikasi-ai-foto-remini-wink-aman.jpg', 'remini-web', 'aplikasi', '2026-09-28 11:00:00+07'),
  ('tips-aman-langganan-aplikasi-premium', '8 Tips Aman Membeli dan Memakai Aplikasi Premium',
   'Dari memilih penjual, membaca garansi, sampai menjaga akun tetap aman. Panduan singkat supaya langgananmu awet tanpa drama.',
   'Membeli aplikasi premium lewat reseller memang lebih hemat. Supaya tetap aman dan nyaman, perhatikan beberapa hal berikut.

![Checklist aman](/assets/blog/tips-aman-langganan-aplikasi-premium-info.jpg)

## Sebelum membeli

1. **Pilih penjual yang jelas.** Ada nomor kontak, alamat toko online, dan ulasan pembeli asli.
2. **Baca ketentuan garansi.** Apa yang ditanggung, berapa lama, dan apa yang membuat garansi hangus.
3. **Pahami tipe paket.** Sharing dan private punya aturan berbeda. Baca [perbedaannya di sini](/blog/baca/?p=beda-akun-sharing-dan-private).
4. **Bayar lewat jalur resmi toko**, misalnya QRIS atas nama toko, dan simpan bukti bayarnya.

## Setelah akun aktif

5. **Aktifkan garansi** sesuai prosedur toko, biasanya dengan mengisi formulir dan mengirim bukti sudah bisa masuk.
6. **Patuhi aturan akun.** Jangan mengganti password, email, atau profil orang lain.
7. **Laporkan kendala lewat admin**, jangan mencoba memperbaiki sendiri dengan mengubah pengaturan.
8. **Catat tanggal berakhir** agar kamu bisa memperpanjang tepat waktu.

:::checklist id=blog-aman
Penjual punya kontak dan ulasan asli
Aku sudah membaca syarat garansi
Aku menyimpan bukti pembayaran
Aku tahu tanggal berakhir langganan
:::

:::catatan
Semua paket di IXVII.CO punya ketentuan garansi yang bisa dibaca di halaman [Garansi & Refund](/garansi-refund/).
:::
',
   '/assets/blog/tips-aman-langganan-aplikasi-premium.jpg', null, 'tips', '2026-09-26 09:00:00+07'),
  ('pilih-durasi-langganan-biar-hemat', 'Bulanan atau Tahunan? Cara Memilih Durasi Langganan Biar Hemat',
   'Durasi panjang biasanya lebih murah per bulan, tapi belum tentu lebih hemat. Ini cara menghitungnya dengan sederhana.',
   'Paket 1 tahun hampir selalu terlihat lebih murah per bulan. Tapi kalau aplikasinya hanya terpakai tiga bulan, paket tahunan justru lebih mahal.

![Rumus memilih durasi](/assets/blog/pilih-durasi-langganan-biar-hemat-info.jpg)

## Contoh perhitungan

Misalkan sebuah aplikasi dijual Rp30.000 per bulan dan Rp240.000 per tahun.

| Skenario | Paket bulanan | Paket tahunan |
|---|---|---|
| Dipakai 12 bulan | Rp360.000 | Rp240.000 (lebih hemat) |
| Dipakai 6 bulan | Rp180.000 | Rp240.000 |
| Dipakai 3 bulan | Rp90.000 (lebih hemat) | Rp240.000 |

*Angka di atas hanya contoh untuk latihan berhitung.*

## Kapan memilih durasi panjang

- Aplikasi yang kamu pakai hampir setiap hari, seperti aplikasi kerja, musik, atau AI.
- Aplikasi yang sudah terbukti cocok setelah dicoba beberapa bulan.

## Kapan memilih bulanan

- Aplikasi streaming yang kamu rotasi sesuai judul yang sedang tayang.
- Aplikasi yang baru ingin dicoba.
- Kebutuhan musiman, misalnya paket olahraga saat turnamen.

:::tips
Untuk aplikasi streaming, pola **rotasi bulanan** sering paling hemat: langganan saat ada judul yang ingin ditonton, lalu berhenti saat daftar tontonan habis.
:::

Bundle beberapa aplikasi sekaligus juga bisa lebih hemat. Coba racik sendiri di [Bikin Bundlemu](/rakit/).

## Pertanyaan yang sering muncul

**Bagaimana kalau ragu dengan aplikasi baru?** Ambil durasi terpendek dulu. Kalau ternyata cocok dan sering dipakai, baru pindah ke durasi yang lebih panjang.

**Kapan sebaiknya memperpanjang?** Beberapa hari sebelum masa aktif habis, supaya tidak terputus di tengah tontonan atau pekerjaan. Catat tanggal berakhirnya di kalender HP.

**Apakah durasi panjang selalu lebih hemat?** Biasanya harga per bulannya lebih murah, tetapi hanya hemat kalau aplikasinya benar-benar terpakai sepanjang periode itu.
',
   '/assets/blog/pilih-durasi-langganan-biar-hemat.jpg', null, 'tips', '2026-09-24 10:00:00+07'),
  ('kualitas-streaming-dan-kuota-internet', 'Kualitas Streaming dan Kuota: Berapa yang Terpakai Saat Nonton?',
   'SD, HD, Full HD, atau 4K. Pahami hubungan kualitas video dengan kuota internet supaya maraton serial tidak menguras paket data.',
   'Semakin tinggi kualitas video, semakin besar kuota yang terpakai. Di layar HP, perbedaan Full HD dan 4K sering tidak terlalu terasa, tapi pemakaian datanya bisa berlipat.

![Kualitas vs pemakaian kuota](/assets/blog/kualitas-streaming-dan-kuota-internet-info.jpg)

## Pilih kualitas sesuai layar

- **Layar HP:** HD 720p sudah tajam dan jauh lebih hemat.
- **Laptop atau tablet:** Full HD nyaman untuk mata.
- **TV besar:** Full HD atau 4K, dengan koneksi Wi-Fi yang stabil.

## Cara menghemat kuota

:::checklist id=blog-kuota
Atur kualitas video di pengaturan aplikasi, jangan biarkan otomatis saat memakai data seluler
Unduh episode lewat Wi-Fi untuk ditonton di perjalanan
Matikan putar otomatis video pratinjau di beranda aplikasi
Pantau pemakaian data per aplikasi di pengaturan HP
:::

## Kenapa video tetap buram walau internet kencang?

Beberapa paket aplikasi membatasi resolusi, misalnya paket khusus ponsel. Selain itu, aplikasi akan menurunkan kualitas otomatis saat koneksi tidak stabil. Coba cek pengaturan kualitas di aplikasi dan jenis paket yang kamu pakai.

:::tips
Kalau sering menonton di perjalanan, biasakan mengunduh 2–3 episode di rumah. Selain hemat kuota, tontonan juga tidak terputus di area sinyal lemah.
:::

## Pertanyaan yang sering muncul

**Apakah unduhan offline lebih hemat kuota?** Ya, kalau kamu mengunduh lewat Wi-Fi. Unduh episode di rumah, lalu tonton saat bepergian tanpa memakai data seluler.

**Kenapa video tetap buram walau internet kencang?** Cek pengaturan kualitas di aplikasi, mode hemat data di HP, dan apakah paketmu mendukung resolusi tinggi. Beberapa paket memang dibatasi pada resolusi tertentu.

**Apakah menonton di TV memakai kuota lebih banyak?** Umumnya ya, karena aplikasi di TV cenderung memutar resolusi lebih tinggi. Atur kualitas secara manual kalau kuota internet rumahmu terbatas.
',
   '/assets/blog/kualitas-streaming-dan-kuota-internet.jpg', null, 'tips', '2026-09-22 16:00:00+07'),
  ('bundle-aplikasi-kreator-dan-pelajar', 'Racik Bundle Aplikasi Hemat untuk Kreator Konten dan Pelajar',
   'Menggabungkan beberapa aplikasi dalam satu paket bisa lebih hemat. Ini contoh racikan sesuai kebutuhan kreator, pelajar, dan pencinta hiburan.',
   'Kebanyakan orang tidak hanya memakai satu aplikasi premium. Kreator butuh aplikasi desain dan edit video, pelajar butuh alat menulis dan mencatat. Daripada membeli satu per satu, coba racik dalam satu bundle.

![Ide racikan bundle](/assets/blog/bundle-aplikasi-kreator-dan-pelajar-info.jpg)

## Contoh racikan

:::kartu
Kreator konten | Canva untuk desain, CapCut untuk video, Lightroom untuk foto. Semua kebutuhan konten mingguan tercakup.
Pelajar & mahasiswa | Asisten AI untuk memahami materi, Grammarly untuk tulisan bahasa Inggris, Goodnotes untuk catatan.
Pecinta hiburan | Satu aplikasi streaming sesuai judul bulan ini, ditambah Spotify untuk musik dan podcast.
Pebisnis online | Canva untuk promosi, AI untuk caption dan balasan chat, Zoom untuk rapat dengan klien.
:::

## Prinsip meracik bundle

1. Mulai dari aplikasi yang **pasti dipakai setiap minggu**.
2. Samakan durasi agar tanggal perpanjangan tidak berceceran.
3. Hindari memasukkan aplikasi "siapa tahu terpakai".

:::tips
Di IXVII.CO, kamu bisa meracik sendiri bundle dari paket yang tersedia dan langsung melihat potongannya di halaman [Bikin Bundlemu](/rakit/). Promo bundle yang sedang berjalan ada di halaman [Promo](/promo/).
:::

## Pertanyaan yang sering muncul

**Apakah harus langganan semuanya sekaligus?** Tidak. Mulai dari satu atau dua aplikasi yang paling sering kamu pakai, lalu tambah sesuai kebutuhan. Fitur [Rakit Paket](/rakit/) membantu menghitung kombinasi yang pas.

**Bagaimana kalau masa aktifnya berbeda-beda?** Samakan tanggal perpanjangannya sebisa mungkin, supaya lebih mudah diingat dan tidak ada aplikasi yang tiba-tiba berhenti di tengah pekerjaan.

**Aplikasi mana yang sebaiknya didahulukan?** Yang langsung berdampak pada pekerjaan atau tugasmu, misalnya aplikasi desain untuk kreator atau aplikasi catatan dan dokumen untuk pelajar.
',
   '/assets/blog/bundle-aplikasi-kreator-dan-pelajar.jpg', null, 'tips', '2026-09-20 12:00:00+07'),
  ('tabayyun-saring-sebelum-sharing', 'Tabayyun di Era Media Sosial: Saring Dulu Sebelum Sharing',
   'Satu pesan berantai bisa menyebar ke ribuan orang dalam hitungan menit. Islam sudah lama mengajarkan tabayyun, memeriksa kebenaran berita sebelum menyebarkannya.',
   'Grup keluarga, grup alumni, dan media sosial setiap hari dibanjiri kabar: dari info kesehatan, berita politik, sampai pesan "sebarkan sebelum dihapus". Tidak semuanya benar. Di sinilah ajaran **tabayyun** menjadi sangat relevan.

:::ayat
يَا أَيُّهَا الَّذِينَ آمَنُوا إِنْ جَاءَكُمْ فَاسِقٌ بِنَبَإٍ فَتَبَيَّنُوا أَنْ تُصِيبُوا قَوْمًا بِجَهَالَةٍ فَتُصْبِحُوا عَلَىٰ مَا فَعَلْتُمْ نَادِمِينَ
Wahai orang-orang yang beriman, jika seorang fasik datang kepadamu membawa suatu berita, maka telitilah kebenarannya, agar kamu tidak mencelakakan suatu kaum karena ketidaktahuan, yang akhirnya kamu menyesali perbuatanmu itu.
QS. Al-Hujurat [49]: 6
:::

## Apa itu tabayyun?

Tabayyun berarti mencari kejelasan dan memeriksa kebenaran sebuah berita sebelum mempercayai, apalagi menyebarkannya. Ayat di atas mengingatkan bahwa berita yang tidak diperiksa bisa mencelakakan orang lain, dan penyesalan datang belakangan.

![4 langkah tabayyun digital](/assets/blog/tabayyun-saring-sebelum-sharing-info.jpg)

## Menyebarkan semua yang didengar

Rasulullah ﷺ memberi peringatan yang sangat relevan dengan kebiasaan meneruskan pesan:

:::ayat
كَفَى بِالْمَرْءِ كَذِبًا أَنْ يُحَدِّثَ بِكُلِّ مَا سَمِعَ
Cukuplah seseorang dianggap berdusta apabila ia menceritakan semua yang ia dengar.
HR. Muslim (dalam Muqaddimah Shahih Muslim)
:::

Meneruskan pesan tanpa memeriksa isinya, walaupun niatnya baik, bisa membuat kita ikut menyebarkan kebohongan.

:::banding kiri="Kebiasaan yang perlu ditinggalkan" kanan="Kebiasaan tabayyun"
Langsung meneruskan karena judulnya mengejutkan | Membaca isi lengkap dan mencari sumber aslinya
Percaya karena dikirim orang yang dihormati | Tetap memeriksa, siapa pun pengirimnya
"Sebarkan saja, siapa tahu benar" | "Kalau ragu, lebih baik tidak disebarkan"
:::

## Praktik sederhana

- Cari judul berita yang sama di media atau lembaga resmi.
- Perhatikan tanggal, karena kabar lama sering diedarkan ulang seolah baru.
- Waspadai pesan yang memaksa: "harus disebar", "jangan putus di kamu".
- Kalau ternyata keliru, kabari grup dengan sopan dan sertakan klarifikasinya.

:::kuis
? Kamu menerima pesan berantai tentang obat herbal yang "pasti menyembuhkan". Apa sikap yang paling sesuai dengan tabayyun?
- Langsung diteruskan, karena niatnya membantu
+ Memeriksa sumbernya terlebih dahulu dan tidak menyebarkan kalau tidak jelas
- Meneruskan dengan tambahan "belum tahu benar atau tidak"
> Tabayyun berarti memeriksa dulu. Menambahkan keterangan "belum tentu benar" tetap ikut menyebarkan informasi yang belum jelas.
:::

:::catatan
Tulisan ini adalah renungan umum, bukan fatwa. Untuk persoalan hukum yang spesifik, tanyakan langsung kepada ustadz atau lembaga keagamaan yang kamu percaya. Wallahu a''lam.
:::
',
   '/assets/blog/tabayyun-saring-sebelum-sharing.jpg', null, 'islami', '2026-11-02 05:00:00+07'),
  ('etika-jualan-online-dalam-islam', 'Etika Jualan Online dalam Islam: Jujur, Jelas, dan Saling Rida',
   'Berdagang adalah pekerjaan mulia, termasuk berdagang di media sosial dan marketplace. Islam memberi rambu agar jual beli jujur dan berkah.',
   'Jual beli online sudah menjadi bagian dari keseharian. Meski medianya baru, prinsipnya tetap sama: Islam memuliakan perdagangan yang jujur dan melarang segala bentuk kecurangan.

:::ayat
يَا أَيُّهَا الَّذِينَ آمَنُوا لَا تَأْكُلُوا أَمْوَالَكُمْ بَيْنَكُمْ بِالْبَاطِلِ إِلَّا أَنْ تَكُونَ تِجَارَةً عَنْ تَرَاضٍ مِنْكُمْ
Wahai orang-orang yang beriman, janganlah kamu saling memakan harta sesamamu dengan jalan yang batil, kecuali dalam perdagangan yang berlaku atas dasar suka sama suka di antara kamu.
QS. An-Nisa [4]: 29
:::

![Rambu jual beli online](/assets/blog/etika-jualan-online-dalam-islam-info.jpg)

## Kejujuran membawa berkah

Rasulullah ﷺ menjelaskan bahwa keberkahan jual beli bergantung pada kejujuran kedua belah pihak:

:::ayat
فَإِنْ صَدَقَا وَبَيَّنَا بُورِكَ لَهُمَا فِي بَيْعِهِمَا، وَإِنْ كَتَمَا وَكَذَبَا مُحِقَتْ بَرَكَةُ بَيْعِهِمَا
Jika keduanya jujur dan menjelaskan (keadaan barang), jual beli mereka diberkahi. Jika keduanya menyembunyikan dan berdusta, hilanglah keberkahan jual beli mereka.
HR. Bukhari dan Muslim
:::

## Penerapan di toko online

:::kartu
Foto & deskripsi | Tampilkan barang apa adanya. Edit foto boleh untuk memperjelas, bukan untuk mengubah barang.
Harga coret | Hanya pakai harga normal yang memang pernah berlaku. Diskon palsu termasuk menipu.
Testimoni | Tampilkan ulasan asli, bukan karangan.
Cacat & kekurangan | Sebutkan dengan jelas sebelum pembeli membayar.
Janji pengiriman & garansi | Tepati, atau kabari segera bila ada kendala.
:::

## Larangan menipu

:::ayat
مَنْ غَشَّنَا فَلَيْسَ مِنَّا
Barang siapa menipu kami, maka ia bukan termasuk golongan kami.
HR. Muslim
:::

Hadis ini disampaikan ketika Rasulullah ﷺ mendapati makanan basah yang disembunyikan di bagian bawah tumpukan dagangan. Pelajarannya jelas: menyembunyikan kekurangan barang demi keuntungan adalah bentuk penipuan.

:::tips
Uji dirimu dengan satu pertanyaan: "Kalau aku pembelinya, apakah aku rela diperlakukan seperti ini?" Kalau jawabannya tidak, ada yang perlu diperbaiki.
:::

:::catatan
Tulisan ini adalah renungan umum, bukan fatwa. Untuk persoalan hukum yang spesifik, tanyakan langsung kepada ustadz atau lembaga keagamaan yang kamu percaya. Wallahu a''lam.
:::
',
   '/assets/blog/etika-jualan-online-dalam-islam.jpg', null, 'islami', '2026-10-31 05:00:00+07'),
  ('menjaga-lisan-dan-jempol-di-media-sosial', 'Menjaga Lisan dan Jempol: Adab Bermedia Sosial dalam Islam',
   'Komentar, status, dan pesan yang kita ketik sama nilainya dengan ucapan. Inilah panduan Islam agar jempol membawa kebaikan, bukan dosa.',
   'Dulu, ucapan yang menyakitkan mungkin hanya didengar beberapa orang. Sekarang, satu komentar bisa dibaca ribuan orang dan tersimpan bertahun-tahun. Tulisan di media sosial adalah "ucapan" kita di dunia digital.

:::ayat
مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ
Barang siapa beriman kepada Allah dan hari akhir, hendaklah ia berkata baik atau diam.
HR. Bukhari dan Muslim
:::

![Sebelum menekan ''kirim''](/assets/blog/menjaga-lisan-dan-jempol-di-media-sosial-info.jpg)

## Semua tercatat

:::ayat
مَا يَلْفِظُ مِنْ قَوْلٍ إِلَّا لَدَيْهِ رَقِيبٌ عَتِيدٌ
Tidak ada suatu kata yang diucapkannya melainkan ada di sisinya malaikat pengawas yang selalu siap (mencatat).
QS. Qaf [50]: 18
:::

Jika ucapan saja dicatat, apalagi tulisan yang bisa dibaca ulang, dibagikan, dan disimpan orang lain.

## Yang perlu dihindari

- **Ghibah**: membicarakan keburukan orang lain, termasuk lewat status, utas, atau grup obrolan.
- **Fitnah dan tuduhan tanpa bukti.**
- **Mengolok-olok dan merendahkan**, termasuk lewat meme yang menyasar orang tertentu.
- **Membuka aib orang lain**, misalnya menyebarkan tangkapan layar obrolan pribadi.

:::banding kiri="Jempol yang menjerumuskan" kanan="Jempol yang membawa kebaikan"
Ikut berkomentar pedas di unggahan viral | Melewati, atau menulis nasihat dengan santun
Menyebar tangkapan layar aib orang | Menutup aib dan menasihati secara pribadi
Berdebat sampai saling menghina | Menyampaikan pendapat dengan adab, lalu berhenti
:::

:::tips
Biasakan jeda lima detik sebelum mengirim komentar saat sedang emosi. Seringkali, setelah jeda itu, kita memutuskan untuk tidak jadi mengirimnya.
:::

:::catatan
Tulisan ini adalah renungan umum, bukan fatwa. Untuk persoalan hukum yang spesifik, tanyakan langsung kepada ustadz atau lembaga keagamaan yang kamu percaya. Wallahu a''lam.
:::
',
   '/assets/blog/menjaga-lisan-dan-jempol-di-media-sosial.jpg', null, 'islami', '2026-10-29 05:00:00+07'),
  ('manajemen-waktu-dalam-islam', 'Demi Masa: Manajemen Waktu dan Produktivitas dalam Islam',
   'Waktu luang dan kesehatan adalah dua nikmat yang sering disia-siakan. Bagaimana mengelola waktu di tengah godaan scroll tanpa henti?',
   'Allah bersumpah dengan waktu dalam sebuah surah pendek yang sangat padat maknanya:

:::ayat
وَالْعَصْرِ ۝ إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ ۝ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ
Demi masa. Sungguh, manusia berada dalam kerugian, kecuali orang-orang yang beriman dan mengerjakan kebajikan serta saling menasihati untuk kebenaran dan saling menasihati untuk kesabaran.
QS. Al-''Asr [103]: 1–3
:::

## Dua nikmat yang sering terlupa

:::ayat
نِعْمَتَانِ مَغْبُونٌ فِيهِمَا كَثِيرٌ مِنَ النَّاسِ: الصِّحَّةُ وَالْفَرَاغُ
Ada dua nikmat yang banyak manusia tertipu di dalamnya: kesehatan dan waktu luang.
HR. Bukhari
:::

Di zaman sekarang, waktu luang paling mudah habis di layar: menggulir video pendek, berpindah aplikasi, tanpa terasa satu jam berlalu.

![Ritme harian mengikuti salat](/assets/blog/manajemen-waktu-dalam-islam-info.jpg)

## Salat sebagai jangkar waktu

Salat lima waktu membagi hari menjadi beberapa bagian. Ritme ini bisa dipakai untuk mengatur pekerjaan: tugas yang butuh konsentrasi tinggi setelah Subuh, evaluasi kecil setelah Zuhur, dan perencanaan esok hari setelah Isya.

## Sedikit tapi rutin

Rasulullah ﷺ bersabda bahwa amalan yang paling dicintai Allah adalah yang paling konsisten walaupun sedikit (HR. Bukhari dan Muslim). Prinsip ini berlaku juga untuk kebiasaan baik lainnya: membaca 15 menit setiap hari lebih baik daripada tiga jam sekali sebulan.

:::checklist id=blog-waktu
Aku menulis 3 pekerjaan terpenting hari ini setelah Subuh
Aku memasang batas waktu harian untuk aplikasi media sosial
Aku menyisihkan waktu tetap untuk membaca Al-Qur''an
Aku mengevaluasi hariku sebelum tidur
:::

:::tips
Jadikan aplikasi bermanfaat, seperti Al-Qur''an digital, kajian, atau kursus, sebagai yang paling mudah dijangkau di layar utama HP. Pindahkan aplikasi yang paling banyak menyita waktu ke folder yang lebih jauh.
:::

:::catatan
Tulisan ini adalah renungan umum, bukan fatwa. Untuk persoalan hukum yang spesifik, tanyakan langsung kepada ustadz atau lembaga keagamaan yang kamu percaya. Wallahu a''lam.
:::
',
   '/assets/blog/manajemen-waktu-dalam-islam.jpg', null, 'islami', '2026-10-27 05:00:00+07'),
  ('memilih-tontonan-yang-bermanfaat', 'Memilih Tontonan dengan Bijak: Adab Menonton bagi Seorang Muslim',
   'Streaming membuat tontonan tanpa batas ada di genggaman. Islam mengajarkan agar pendengaran, penglihatan, dan hati dipakai untuk hal yang bermanfaat.',
   'Hiburan bukanlah hal yang terlarang dalam Islam. Yang perlu dijaga adalah **apa** yang kita tonton, **berapa lama**, dan **pengaruhnya** pada hati dan perilaku.

:::ayat
إِنَّ السَّمْعَ وَالْبَصَرَ وَالْفُؤَادَ كُلُّ أُولَٰئِكَ كَانَ عَنْهُ مَسْئُولًا
Sesungguhnya pendengaran, penglihatan, dan hati nurani, semua itu akan diminta pertanggungjawabannya.
QS. Al-Isra [17]: 36
:::

![Pertanyaan sebelum menonton](/assets/blog/memilih-tontonan-yang-bermanfaat-info.jpg)

## Menjaga pandangan

:::ayat
قُلْ لِلْمُؤْمِنِينَ يَغُضُّوا مِنْ أَبْصَارِهِمْ وَيَحْفَظُوا فُرُوجَهُمْ ۚ ذَٰلِكَ أَزْكَىٰ لَهُمْ
Katakanlah kepada laki-laki yang beriman agar mereka menjaga pandangannya dan memelihara kemaluannya; yang demikian itu lebih suci bagi mereka.
QS. An-Nur [24]: 30
:::

Perintah yang serupa juga ditujukan kepada perempuan beriman pada ayat berikutnya. Di era streaming, menjaga pandangan bisa berarti melewati adegan tertentu, memilih judul dengan rating usia yang sesuai, atau berhenti menonton serial yang isinya lebih banyak mudarat.

## Meninggalkan yang tidak bermanfaat

:::ayat
مِنْ حُسْنِ إِسْلَامِ الْمَرْءِ تَرْكُهُ مَا لَا يَعْنِيهِ
Di antara tanda baiknya keislaman seseorang adalah meninggalkan hal yang tidak bermanfaat baginya.
HR. Tirmidzi
:::

## Langkah praktis

- Gunakan fitur **profil anak** dan batasan usia di aplikasi streaming untuk keluarga.
- Baca sinopsis dan rating usia sebelum menonton. Halaman [Info Film](/film/) bisa membantu memilih.
- Hentikan tontonan saat azan, lalu lanjutkan setelah salat.
- Seimbangkan hiburan dengan tontonan bermanfaat: dokumenter alam, sejarah, atau kajian.

:::tips
Batasi maraton serial dengan aturan sederhana: maksimal dua episode per malam, dan tidak menonton setelah jam tidur yang kamu tetapkan.
:::

:::catatan
Tulisan ini adalah renungan umum, bukan fatwa. Untuk persoalan hukum yang spesifik, tanyakan langsung kepada ustadz atau lembaga keagamaan yang kamu percaya. Wallahu a''lam.
:::
',
   '/assets/blog/memilih-tontonan-yang-bermanfaat.jpg', null, 'islami', '2026-10-25 05:00:00+07'),
  ('menuntut-ilmu-di-era-digital', 'Menuntut Ilmu di Era Digital: Peluang Besar, Adab Tetap Utama',
   'Kajian, kursus, dan buku kini ada di genggaman. Islam memuliakan penuntut ilmu, dan mengajarkan adab memilih guru serta sumber yang terpercaya.',
   'Wahyu pertama yang turun kepada Rasulullah ﷺ dimulai dengan perintah membaca:

:::ayat
اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ
Bacalah dengan (menyebut) nama Tuhanmu yang menciptakan.
QS. Al-''Alaq [96]: 1
:::

Hari ini, membaca dan belajar menjadi jauh lebih mudah. Kajian ulama bisa disimak lewat video, buku tersedia dalam bentuk digital, dan kursus bisa diikuti dari rumah.

![Adab belajar online](/assets/blog/menuntut-ilmu-di-era-digital-info.jpg)

## Kewajiban yang dimudahkan

:::ayat
طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ
Menuntut ilmu itu wajib atas setiap muslim.
HR. Ibnu Majah
:::

Allah juga menjanjikan derajat yang tinggi bagi orang yang beriman dan berilmu:

:::ayat
يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنْكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ
Allah akan mengangkat (derajat) orang-orang yang beriman di antaramu dan orang-orang yang diberi ilmu beberapa derajat.
QS. Al-Mujadilah [58]: 11
:::

## Tantangan belajar di internet

Kemudahan juga membawa tantangan: banyak konten agama yang dipotong dari konteksnya, disampaikan oleh orang yang belum jelas keilmuannya, atau sengaja dibuat untuk memancing perdebatan.

:::kartu
Pilih sumber | Belajar dari guru dan lembaga yang jelas keilmuannya.
Lengkapi konteks | Simak kajian secara utuh, bukan hanya potongan video.
Tanyakan langsung | Untuk masalah pribadi, tanyakan kepada ustadz secara langsung.
Jaga adab | Hormati perbedaan pendapat yang punya dasar ilmiah.
:::

:::tips
Gunakan aplikasi pencatat seperti Goodnotes untuk merangkum kajian yang kamu ikuti, lalu ulangi catatanmu seminggu sekali. Ilmu yang dicatat dan diulang lebih mudah melekat.
:::

:::catatan
Tulisan ini adalah renungan umum, bukan fatwa. Untuk persoalan hukum yang spesifik, tanyakan langsung kepada ustadz atau lembaga keagamaan yang kamu percaya. Wallahu a''lam.
:::
',
   '/assets/blog/menuntut-ilmu-di-era-digital.jpg', null, 'islami', '2026-10-23 05:00:00+07'),
  ('rezeki-halal-dan-berkah-bisnis-digital', 'Rezeki Halal dan Berkah di Bisnis Digital',
   'Untung besar belum tentu berkah. Islam mengajarkan bahwa cara mencari rezeki sama pentingnya dengan hasilnya, termasuk dalam bisnis online.',
   'Bisnis digital membuka banyak peluang: jualan produk, jasa desain, menjadi reseller, sampai membuat ebook. Di tengah semangat mencari untung, Islam mengingatkan satu hal penting: **rezeki yang halal dan berkah**.

:::ayat
وَيْلٌ لِلْمُطَفِّفِينَ ۝ الَّذِينَ إِذَا اكْتَالُوا عَلَى النَّاسِ يَسْتَوْفُونَ ۝ وَإِذَا كَالُوهُمْ أَوْ وَزَنُوهُمْ يُخْسِرُونَ
Celakalah orang-orang yang curang (dalam menakar dan menimbang), yaitu orang-orang yang apabila menerima takaran dari orang lain mereka minta dicukupkan, dan apabila mereka menakar atau menimbang untuk orang lain, mereka mengurangi.
QS. Al-Muthaffifin [83]: 1–3
:::

![Tanda bisnis yang sehat](/assets/blog/rezeki-halal-dan-berkah-bisnis-digital-info.jpg)

## "Takaran" di bisnis online

Di toko online, takaran tidak selalu berupa timbangan. Bentuknya bisa berupa isi paket yang sesuai deskripsi, durasi layanan yang sesuai janji, atau kualitas jasa yang sesuai kesepakatan. Mengurangi semua itu diam-diam termasuk curang.

## Kedudukan pedagang yang jujur

:::ayat
التَّاجِرُ الصَّدُوقُ الْأَمِينُ مَعَ النَّبِيِّينَ وَالصِّدِّيقِينَ وَالشُّهَدَاءِ
Pedagang yang jujur lagi terpercaya (akan bersama) para nabi, orang-orang yang jujur, dan para syuhada.
HR. Tirmidzi
:::

:::banding kiri="Untung tapi tidak berkah" kanan="Untung dan berkah"
Menjual produk bajakan atau hasil curian | Menjual produk sendiri atau yang jelas izinnya
Mengurangi isi atau durasi diam-diam | Memberi sesuai janji, atau mengabari bila ada kendala
Menunda hak mitra dan karyawan | Membayar hak orang lain tepat waktu
Iklan yang melebih-lebihkan | Promosi yang jujur dan bisa dipertanggungjawabkan
:::

:::tips
Sisihkan sebagian keuntungan untuk sedekah secara rutin, sekecil apa pun. Selain membersihkan harta, kebiasaan ini mengingatkan bahwa rezeki datang dari Allah.
:::

:::catatan
Tulisan ini adalah renungan umum, bukan fatwa. Untuk persoalan hukum yang spesifik, tanyakan langsung kepada ustadz atau lembaga keagamaan yang kamu percaya. Wallahu a''lam.
:::
',
   '/assets/blog/rezeki-halal-dan-berkah-bisnis-digital.jpg', null, 'islami', '2026-10-21 05:00:00+07'),
  ('amanah-dan-menepati-janji-transaksi', 'Amanah dan Menepati Janji dalam Transaksi Sehari-hari',
   'Pesanan, deadline, dan janji balas chat adalah amanah kecil yang sering diremehkan. Islam menempatkan amanah sebagai tanda keimanan.',
   'Amanah bukan hanya tentang menjaga barang titipan. Dalam kehidupan digital, amanah hadir dalam bentuk yang sangat sehari-hari: janji mengirim pesanan, tenggat pekerjaan freelance, sampai data pribadi pelanggan.

:::ayat
يَا أَيُّهَا الَّذِينَ آمَنُوا أَوْفُوا بِالْعُقُودِ
Wahai orang-orang yang beriman, penuhilah janji-janji (akad).
QS. Al-Ma''idah [5]: 1
:::

![Amanah sehari-hari](/assets/blog/amanah-dan-menepati-janji-transaksi-info.jpg)

## Menyampaikan amanah kepada yang berhak

:::ayat
إِنَّ اللَّهَ يَأْمُرُكُمْ أَنْ تُؤَدُّوا الْأَمَانَاتِ إِلَىٰ أَهْلِهَا
Sesungguhnya Allah menyuruhmu menyampaikan amanat kepada yang berhak menerimanya.
QS. An-Nisa [4]: 58
:::

## Peringatan tentang ingkar janji

:::ayat
آيَةُ الْمُنَافِقِ ثَلَاثٌ: إِذَا حَدَّثَ كَذَبَ، وَإِذَا وَعَدَ أَخْلَفَ، وَإِذَا اؤْتُمِنَ خَانَ
Tanda orang munafik ada tiga: apabila berbicara ia dusta, apabila berjanji ia ingkar, dan apabila dipercaya ia berkhianat.
HR. Bukhari dan Muslim
:::

## Amanah di dunia kerja digital

- **Penjual:** kirim pesanan sesuai janji, dan segera kabari pembeli bila ada keterlambatan.
- **Freelancer:** kerjakan sesuai brief dan tenggat yang disepakati.
- **Admin toko:** jaga data pribadi pelanggan, jangan disebarkan atau dipakai di luar keperluan.
- **Reseller:** sampaikan informasi produk apa adanya, termasuk syarat garansi.

:::tips
Kalau tidak yakin bisa menepati, jangan menjanjikan. Lebih baik berkata "Insyaallah selesai Kamis, nanti aku kabari" lalu benar-benar mengabari, daripada menjanjikan besok lalu menghilang.
:::

:::catatan
Tulisan ini adalah renungan umum, bukan fatwa. Untuk persoalan hukum yang spesifik, tanyakan langsung kepada ustadz atau lembaga keagamaan yang kamu percaya. Wallahu a''lam.
:::
',
   '/assets/blog/amanah-dan-menepati-janji-transaksi.jpg', null, 'islami', '2026-10-19 05:00:00+07'),
  ('sedekah-dan-berbagi-di-era-digital', 'Sedekah di Era Digital: Mudah Dilakukan, Tetap Perlu Dijaga Niatnya',
   'Sedekah kini cukup lewat QRIS atau transfer. Ini keutamaan sedekah, cara memilih lembaga yang terpercaya, dan menjaga keikhlasan di era media sosial.',
   'Dulu bersedekah berarti datang ke masjid atau menitipkan amplop. Kini cukup memindai QRIS atau mentransfer dari aplikasi bank. Kemudahan ini adalah peluang besar untuk berbuat baik.

:::ayat
مَثَلُ الَّذِينَ يُنْفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنْبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنْبُلَةٍ مِائَةُ حَبَّةٍ
Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai, pada setiap tangkai ada seratus biji.
QS. Al-Baqarah [2]: 261
:::

## Sedekah tidak mengurangi harta

:::ayat
مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ
Sedekah tidak akan mengurangi harta.
HR. Muslim
:::

![Sedekah digital yang aman](/assets/blog/sedekah-dan-berbagi-di-era-digital-info.jpg)

## Waspada penipuan berkedok donasi

Kemudahan berdonasi online juga dimanfaatkan oknum tidak bertanggung jawab. Pilih lembaga zakat dan amil yang resmi, periksa nama pemilik rekening, dan waspadai ajakan donasi yang mendesak tanpa kejelasan.

## Menjaga keikhlasan

Media sosial membuat godaan untuk memamerkan kebaikan semakin besar. Al-Qur''an mengingatkan agar sedekah tidak dirusak dengan menyebut-nyebutnya atau menyakiti penerimanya:

:::ayat
لَا تُبْطِلُوا صَدَقَاتِكُمْ بِالْمَنِّ وَالْأَذَىٰ
Janganlah kamu merusak (pahala) sedekahmu dengan menyebut-nyebutnya dan menyakiti (perasaan penerima).
QS. Al-Baqarah [2]: 264
:::

:::tips
Pasang sedekah otomatis bulanan dengan nominal kecil yang terjangkau. Konsisten setiap bulan lebih ringan dijalani dan lebih mudah dijaga keikhlasannya.
:::

:::catatan
Tulisan ini adalah renungan umum, bukan fatwa. Untuk persoalan hukum yang spesifik, tanyakan langsung kepada ustadz atau lembaga keagamaan yang kamu percaya. Wallahu a''lam.
:::
',
   '/assets/blog/sedekah-dan-berbagi-di-era-digital.jpg', null, 'islami', '2026-10-17 05:00:00+07'),
  ('hemat-dan-tidak-boros-belanja-digital', 'Hemat Tanpa Pelit: Mengatur Belanja dan Langganan Digital ala Islam',
   'Langganan yang lupa dimatikan, belanja impulsif, dan koin gim yang tak terasa. Islam mengajarkan sikap pertengahan: tidak boros, tidak pula kikir.',
   'Belanja digital terasa ringan karena tidak melihat uang berpindah tangan. Satu klik untuk langganan baru, satu klik untuk membeli koin, satu klik untuk *checkout*. Tanpa terasa, pengeluaran membengkak.

:::ayat
وَالَّذِينَ إِذَا أَنْفَقُوا لَمْ يُسْرِفُوا وَلَمْ يَقْتُرُوا وَكَانَ بَيْنَ ذَٰلِكَ قَوَامًا
Dan orang-orang yang apabila membelanjakan (harta), mereka tidak berlebihan dan tidak (pula) kikir, dan adalah (pembelanjaan itu) di tengah-tengah antara yang demikian.
QS. Al-Furqan [25]: 67
:::

![Belanja digital yang seimbang](/assets/blog/hemat-dan-tidak-boros-belanja-digital-info.jpg)

## Larangan boros

:::ayat
وَلَا تُبَذِّرْ تَبْذِيرًا ۝ إِنَّ الْمُبَذِّرِينَ كَانُوا إِخْوَانَ الشَّيَاطِينِ
Dan janganlah kamu menghambur-hamburkan (hartamu) secara boros. Sesungguhnya para pemboros itu adalah saudara setan.
QS. Al-Isra [17]: 26–27
:::

## Praktik hemat yang tidak pelit

:::kartu
Audit langganan | Daftar semua aplikasi berbayar. Matikan yang sebulan terakhir tidak dibuka.
Rotasi streaming | Langganan saat ada tontonan yang memang ditunggu, berhenti saat selesai.
Patungan yang jelas | Akun sharing atau paket keluarga dengan aturan yang disepakati bersama.
Hindari koin impulsif | Tentukan batas belanja dalam aplikasi per bulan.
:::

## Bukan berarti pelit

Islam juga mencela sikap kikir. Hemat bukan berarti menahan hak keluarga, menunda kewajiban, atau enggan bersedekah. Sikap yang dipuji adalah pertengahan: membelanjakan harta untuk yang bermanfaat, secukupnya, dan tetap berbagi.

:::checklist id=blog-hemat
Aku sudah mendaftar semua langganan digitalku
Aku mematikan langganan yang tidak terpakai
Aku menetapkan batas belanja impulsif per bulan
Aku menyisihkan tabungan dan sedekah di awal bulan
:::

:::catatan
Tulisan ini adalah renungan umum, bukan fatwa. Untuk persoalan hukum yang spesifik, tanyakan langsung kepada ustadz atau lembaga keagamaan yang kamu percaya. Wallahu a''lam.
:::
',
   '/assets/blog/hemat-dan-tidak-boros-belanja-digital.jpg', null, 'islami', '2026-10-15 05:00:00+07')
) as v(slug, judul, ringkas, isi, sampul, app, topik, terbit)
left join public.apps a on a.slug = v.app
on conflict (slug) do nothing;
