// Menu Ebook & rak baca: persetujuan akses (panduan reseller), pembaca & ebook di raknya, perangkat, reset password,
// dan editor isi setiap ebook (sampul, bab, pratinjau langsung). Ebook yang dibeli di Produk Digital masuk rak otomatis.
import { el, isian, q, tabel, td, tautanWa, toast, waktu } from './alat.js';
import { DAFTAR_IKON, ikon, renderIsi } from '/js/ebook-render.js';

const STATUS = { menunggu: ['Menunggu', 'kuning'], aktif: ['Aktif', 'hijau'], ditolak: ['Ditolak', 'merah'], dicabut: ['Dicabut', 'merah'] };
const ACARA = {
  minta: 'Minta akses', disetujui: 'Disetujui', ditolak: 'Ditolak', dicabut: 'Dicabut', diberi_akses: 'Diberi akses admin', masuk: 'Masuk',
  perangkat_baru: 'Masuk dari perangkat baru', ditolak_perangkat: 'Ditolak: batas perangkat', gagal: 'Gagal masuk', reset_perangkat: 'Perangkat direset',
  reset_sandi: 'Password direset', ganti_sandi: 'Ganti password',
};
const BLOK = [
  ['Alur', ':::alur\nLangkah pertama | keterangan\nLangkah kedua | keterangan\nLangkah ketiga | keterangan\n:::'],
  ['Langkah', ':::langkah\nKalimat langkah pertama.\nKalimat langkah kedua.\n:::'],
  ['SOP dicentang', ':::sop id=sop-baru\nLangkah pertama.\nLangkah kedua.\n:::'],
  ['Checklist', ':::checklist id=daftar-baru\nHal pertama\nHal kedua\n:::'],
  ['Kalkulator HPP', ':::hitung-hpp hpp=28000 jual=45000\n:::'],
  ['Strategi harga', ':::strategi\nHarga murah | 28000 | 35000\nHarga menengah | 28000 | 45000\n:::'],
  ['Simulasi untung', ':::simulasi margin=17000\n:::'],
  ['Kartu', ':::kartu\nJudul kartu | Penjelasan singkat.\nJudul kartu | Penjelasan singkat.\n:::'],
  ['Contoh poster', ':::poster\nNAMA APLIKASI\nPremium Access\n1 Bulan • RpXX.XXX\nFitur premium\nGaransi sesuai ketentuan\nORDER NOW\nContact: @username\n:::'],
  ['Form', ':::form judul="Contoh formulir"\nNama\nNo. HP Aktif\nScreenshot bukti\n:::'],
  ['Banding', ':::banding kiri="Hindari" kanan="Lakukan"\nYang salah | Yang benar\n:::'],
  ['Palet warna', ':::palet\n#800203 | Maroon | Warna utama\n#FFB84D | Kuning | Aksen\n:::'],
  ['Chat WA', ':::chat\nPembeli: Halo kak, ini masih ada?\nKamu: Masih, Kak! Mau yang mana?\n:::'],
  ['Profil IG', ':::profil\n@namaakun\nKategori\nBaris bio pertama\nBaris bio kedua\ncontoh.com\n:::'],
  ['Kalender', ':::kalender id=kalender-baru\nSenin | Edukasi | Ide konten\nSelasa | Cerita | Ide konten\n:::'],
  ['Kalkulator tarif', ':::tarif target=5000000 biaya=500000 jam=25\n:::'],
  ['Simulasi komisi', ':::komisi harga=150000 persen=5 konversi=1\n:::'],
  ['Kuis', ':::kuis\n? Pertanyaan?\n- Jawaban salah\n+ Jawaban benar\n> Penjelasan singkat.\n:::'],
  ['Garis waktu', ':::garis-waktu\n1 September | Kejadian\n1 Oktober | Kejadian\n:::'],
  ['Tips', ':::tips\nIsi tips.\n:::'],
  ['Peringatan', ':::peringatan\nIsi peringatan.\n:::'],
  ['Kutipan', ':::kutipan\nKalimat kutipan.\n:::'],
  ['Tabel', '| Kolom 1 | Kolom 2 |\n|---|---|\n| isi | isi |'],
];
const slugDari = (t) => String(t || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bab';

export async function halamanEbook(supabase, halaman) {
  let daftar, bab, info, log, buku;
  try {
    [daftar, bab, info, log, buku] = await Promise.all([
      q(supabase.rpc('ebook_daftar_akses')),
      q(supabase.from('ebook_bab').select('*').order('urut').order('id')),
      q(supabase.from('ebook_info').select('*').eq('id', 1).single()),
      q(supabase.from('ebook_log').select('id,akses_id,acara,detail,ua,created_at').order('created_at', { ascending: false }).limit(40)),
      q(supabase.from('ebook_buku').select('*').order('urut').order('id')),
    ]);
  } catch (err) {
    halaman.replaceChildren(el('div', { class: 'card' }, el('h2', {}, 'Ebook & rak baca'),
      el('div', { class: 'msg warn' }, 'Jalankan migration 20261115000000_ebook_reseller.sql lalu 20261116000000_produk_digital.sql di Supabase SQL Editor dulu. (', err.message, ')')));
    return;
  }
  const muatUlang = () => halamanEbook(supabase, halaman);
  const akses = daftar.akses;
  const nama = new Map(akses.map((a) => [a.id, a]));
  const menunggu = akses.filter((a) => a.status === 'menunggu');
  const aktif = akses.filter((a) => a.status === 'aktif');
  const lain = akses.filter((a) => !['menunggu', 'aktif'].includes(a.status));
  const ditolak = akses.reduce((s, a) => s + Number(a.ditolak_7h || 0), 0);

  const aksi = async (tombol, janji, pesan) => {
    tombol.disabled = true;
    try { const r = await q(janji); toast(pesan(r)); muatUlang(); return r; }
    catch (err) { toast(err.message, true); tombol.disabled = false; }
  };
  const kabar = (r) => (r?.wa || r?.email ? ` (dikabari lewat ${[r.wa && 'WhatsApp', r.email && 'email'].filter(Boolean).join(' & ')})` : ' (notifikasi WA/email belum aktif, kabari manual)');
  const tampilSandi = (a, sandi, wadah = hasilSandi, slugBuku = 'panduan-reseller') => {
    const tautan = slugBuku === 'panduan-reseller' ? `${location.origin}/reseller/ebook/` : `${location.origin}/ebook/`;
    const pesanWa = `Halo ${a.nama}! Akses ebook IXVII.CO kamu sudah aktif.\n\nBuka: ${tautan}\nEmail: ${a.email}\nPassword: ${sandi}\n\nEbook ini khusus untukmu, maksimal ${info.maks_perangkat} perangkat, dan tidak boleh disebarkan atau dijual kembali.`;
    wadah.replaceChildren(el('div', { class: 'msg ok' },
      el('b', {}, `Password untuk ${a.email}: `), el('code', { class: 'sandi' }, sandi), el('br'),
      'Password ini hanya ditampilkan sekali. ',
      el('div', { class: 'row', style: 'margin-top:8px' },
        a.wa ? el('a', { class: 'btn kecil wa', href: tautanWa(a.wa, pesanWa), target: '_blank', rel: 'noopener' }, 'Kirim manual lewat WhatsApp') : null,
        el('button', { type: 'button', class: 'sec kecil', onclick: muatUlang }, 'Selesai, muat ulang daftar'))));
    wadah.scrollIntoView({ block: 'center' });
  };
  const hasilSandi = el('div');

  // ---- permintaan
  const kartuMinta = el('section', { class: 'card' }, el('h2', {}, `Permintaan akses (${menunggu.length})`),
    el('p', { class: 'sub' }, 'Cocokkan dengan data pembeli program reseller sebelum menyetujui. Setelah disetujui, pembeli dikabari lewat WhatsApp/email dan bisa masuk dengan password yang ia buat.'),
    menunggu.length ? el('div', { class: 'eb-adm-daftar' }, menunggu.map((a) => {
      const setujui = el('button', { type: 'button', class: 'kecil' }, 'Setujui');
      const tolak = el('button', { type: 'button', class: 'kecil bahaya' }, 'Tolak');
      setujui.addEventListener('click', () => aksi(setujui, supabase.rpc('ebook_setujui', { p_id: a.id }), (r) => `${a.nama} disetujui${kabar(r)}`));
      tolak.addEventListener('click', () => { if (confirm(`Tolak permintaan ${a.nama}?`)) aksi(tolak, supabase.rpc('ebook_tolak', { p_id: a.id }), () => 'Permintaan ditolak'); });
      return el('div', { class: 'item-form row', style: 'justify-content:space-between' },
        el('div', {}, el('b', {}, a.nama), el('br'), el('span', { class: 'muted' }, `${a.email} · `),
          a.wa ? el('a', { href: tautanWa(a.wa), target: '_blank', rel: 'noopener' }, `+${a.wa}`) : null,
          el('br'), el('span', { class: 'muted' }, `Diminta ${waktu(a.dibuat)}`)),
        el('div', { class: 'row' }, setujui, tolak));
    })) : el('p', { class: 'muted' }, 'Tidak ada permintaan baru.'));

  // ---- pembaca
  const barisAkses = (a) => {
    const [label, kelas] = STATUS[a.status] ?? [a.status, ''];
    const reset = el('button', { type: 'button', class: 'sec kecil', title: 'Hapus perangkat terdaftar supaya bisa masuk dari HP baru' }, 'Reset perangkat');
    const sandi = el('button', { type: 'button', class: 'sec kecil' }, 'Reset password');
    const cabut = el('button', { type: 'button', class: 'kecil bahaya' }, a.status === 'aktif' ? 'Cabut' : 'Aktifkan');
    reset.addEventListener('click', () => { if (confirm(`Reset perangkat ${a.nama}? Ia perlu masuk ulang.`)) aksi(reset, supabase.rpc('ebook_reset_perangkat', { p_id: a.id }), () => 'Perangkat direset'); });
    sandi.addEventListener('click', async () => {
      if (!confirm(`Buat password baru untuk ${a.nama}? Password lama tidak berlaku lagi.`)) return;
      sandi.disabled = true;
      try { const r = await q(supabase.rpc('ebook_reset_sandi', { p_id: a.id })); tampilSandi(a, r.sandi); toast(`Password baru dibuat${kabar(r)}`); }
      catch (err) { toast(err.message, true); }
      sandi.disabled = false;
    });
    cabut.addEventListener('click', () => {
      if (a.status === 'aktif') { if (confirm(`Cabut akses ${a.nama}? Ia langsung keluar dari semua perangkat.`)) aksi(cabut, supabase.rpc('ebook_cabut', { p_id: a.id }), () => 'Akses dicabut'); }
      else aksi(cabut, supabase.rpc('ebook_setujui', { p_id: a.id }), (r) => `Akses diaktifkan${kabar(r)}`);
    });
    const rakBuku = el('div', { class: 'row', style: 'gap:4px' }, (a.buku || []).map((k) => {
      const x = el('button', { type: 'button', class: 'tag-x', 'aria-label': `Cabut ${k.judul} dari rak ${a.nama}`, title: 'Cabut ebook ini dari raknya' }, '×');
      x.addEventListener('click', () => { if (confirm(`Cabut "${k.judul}" dari rak ${a.nama}?`)) aksi(x, supabase.rpc('ebook_cabut_buku', { p_akses: a.id, p_buku: k.slug }), () => 'Ebook dicabut dari rak'); });
      return el('span', { class: 'tag', title: `Sumber: ${k.sumber}` }, k.judul.length > 28 ? k.judul.slice(0, 26) + '…' : k.judul, ' ', x);
    }));
    const perangkat = a.perangkat.length
      ? el('span', { title: a.perangkat.map((p) => `${p.ua || 'perangkat'} · terakhir ${waktu(p.terakhir)}`).join('\n') }, `${a.perangkat.length}/${a.maks}`)
      : `0/${a.maks}`;
    return el('tr', {},
      td(el('span', {}, el('b', {}, a.nama), el('br'), el('span', { class: 'muted' }, a.email), a.wa ? el('span', { class: 'muted' }, ` · +${a.wa}`) : null)),
      td(el('div', { class: 'row', style: 'gap:4px' }, el('span', { class: 'tag ' + kelas }, label),
        Number(a.ditolak_7h) ? el('span', { class: 'tag merah', title: 'Ada percobaan masuk dari perangkat lain dalam 7 hari' }, `${a.ditolak_7h}× perangkat ke-${a.maks + 1}`) : null,
        a.terkunci ? el('span', { class: 'tag kuning' }, 'terkunci 15 menit') : null)),
      td(rakBuku), td(perangkat, true), td(a.terakhir ? waktu(a.terakhir) : '–'),
      td(el('div', { class: 'row', style: 'gap:6px' }, reset, sandi, cabut)));
  };
  const maks = el('input', { type: 'number', min: '1', max: '5', value: info.maks_perangkat, style: 'width:80px' });
  const simpanMaks = el('button', { type: 'button', class: 'sec kecil' }, 'Simpan');
  simpanMaks.addEventListener('click', async () => {
    try {
      info = await q(supabase.from('ebook_info').update({ maks_perangkat: Math.min(5, Math.max(1, Number(maks.value) || 2)), updated_at: new Date().toISOString() }).eq('id', 1).select().single());
      toast('Batas perangkat tersimpan');
    } catch (err) { toast(err.message, true); }
  });
  const kartuPembaca = el('section', { class: 'card' }, el('h2', {}, `Pembaca (${aktif.length} aktif)`),
    el('p', { class: 'sub' }, `Satu akun bisa dibuka di ${daftar.maks_perangkat} perangkat. Kalau pembeli ganti HP atau browser, klik Reset perangkat. Kamu dapat notifikasi setiap ada percobaan masuk dari perangkat lebih dari batas. Ebook yang dibeli di halaman Produk Digital otomatis masuk ke rak pembeli setelah pesanan ditandai dibayar.`),
    el('div', { class: 'row', style: 'margin-bottom:12px' }, el('span', { class: 'muted' }, 'Maksimal perangkat per pembaca'), maks, simpanMaks),
    hasilSandi,
    aktif.length || lain.length ? tabel(['Pembaca', 'Status', 'Ebook di rak', '>Perangkat', 'Terakhir masuk', ''], [...aktif, ...lain].map(barisAkses)) : el('p', { class: 'muted' }, 'Belum ada pembaca.'));

  // ---- beri akses langsung
  const fNama = el('input', { type: 'text', placeholder: 'Nama pembeli' });
  const fEmail = el('input', { type: 'email', placeholder: 'email@pembeli.com' });
  const fWa = el('input', { type: 'tel', placeholder: '08…' });
  const fCatatan = el('input', { type: 'text', placeholder: 'mis. bayar reseller 2 Nov' });
  const fBuku = el('select', {}, buku.map((k) => el('option', { value: k.slug }, k.judul)));
  const beri = el('button', { type: 'button' }, 'Beri akses & buat password');
  beri.addEventListener('click', async () => {
    if (fNama.value.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fEmail.value.trim())) return toast('Isi nama dan email yang benar', true);
    beri.disabled = true;
    try {
      const r = await q(supabase.rpc('ebook_beri_akses', { p: { nama: fNama.value.trim(), email: fEmail.value.trim(), wa: fWa.value, catatan: fCatatan.value, buku: fBuku.value } }));
      toast(`"${r.buku}" masuk rak ${fNama.value.trim()}${kabar(r)}`);
      const a = { nama: fNama.value.trim(), email: fEmail.value.trim().toLowerCase(), wa: fWa.value.replace(/\D/g, '').replace(/^0/, '62') };
      if (r.sandi) tampilSandi(a, r.sandi, tampilSandiBaru, fBuku.value);
      else tampilSandiBaru.replaceChildren(el('div', { class: 'msg ok' }, `Akun ${a.email} sudah ada, jadi password tidak berubah. "${r.buku}" sudah ditambahkan ke raknya.`,
        el('div', { class: 'row', style: 'margin-top:8px' }, el('button', { type: 'button', class: 'sec kecil', onclick: muatUlang }, 'Muat ulang daftar'))));
    } catch (err) { toast(err.message, true); }
    beri.disabled = false;
  });
  const tampilSandiBaru = el('div');
  const kartuBeri = el('section', { class: 'card' }, el('h2', {}, 'Tambahkan ebook ke rak pembeli'),
    el('p', { class: 'sub' }, 'Untuk pembeli yang bayar di luar website atau belum mengisi permintaan. Kalau emailnya belum terdaftar, password dibuat otomatis, dikirim ke WA/email pembeli, dan ditampilkan sekali di sini. Kalau sudah terdaftar, ebook langsung ditambahkan ke raknya.'),
    el('div', { class: 'grid2' }, isian('Ebook', fBuku), isian('Nama', fNama), isian('Email (dipakai untuk masuk)', fEmail), isian('WhatsApp', fWa), isian('Catatan (opsional)', fCatatan)),
    el('div', { class: 'row', style: 'margin-top:12px' }, beri), tampilSandiBaru);

  // ---- editor isi
  const kartuIsi = el('section', { class: 'card', id: 'isiEbook' });
  const editor = el('div');
  let bukuAktif = buku.find((k) => k.slug === sessionStorage.getItem('ixvii-admin-buku')) ?? buku[0];
  const babBuku = () => bab.filter((b) => b.buku_id === bukuAktif?.id).sort((x, y) => x.urut - y.urut || x.id - y.id);
  function gambarIsi() {
    if (!bukuAktif) { kartuIsi.replaceChildren(el('h2', {}, 'Isi ebook'), el('p', { class: 'muted' }, 'Belum ada ebook.')); return; }
    const pilihBuku = el('select', {}, buku.map((k) => el('option', { value: k.slug, selected: k.id === bukuAktif.id }, `${k.judul}${k.tampil ? '' : ' (disembunyikan)'}`)));
    pilihBuku.addEventListener('change', () => {
      bukuAktif = buku.find((k) => k.slug === pilihBuku.value);
      try { sessionStorage.setItem('ixvii-admin-buku', bukuAktif.slug); } catch { /* abaikan */ }
      editor.replaceChildren(); gambarIsi();
    });
    const bukuBaru = el('button', { type: 'button', class: 'sec kecil' }, '+ Ebook baru');
    bukuBaru.addEventListener('click', async () => {
      const j = prompt('Judul ebook baru:');
      if (!j || j.trim().length < 2) return;
      let slug = slugDari(j);
      if (buku.some((k) => k.slug === slug)) slug += '-' + Date.now().toString(36).slice(-4);
      try {
        const k = await q(supabase.from('ebook_buku').insert({ slug, judul: j.trim(), label: 'Ebook interaktif', warna: '#800203', tampil: true, urut: (buku.at(-1)?.urut ?? 0) + 1 }).select().single());
        buku.push(k); bukuAktif = k; gambarIsi();
        toast('Ebook dibuat. Tambahkan bab, lalu jual lewat menu Produk digital (tipe kirim: ebook).');
      } catch (err) { toast(err.message, true); }
    });
    const judul = el('input', { type: 'text', value: bukuAktif.judul || '' });
    const sub = el('input', { type: 'text', value: bukuAktif.subjudul || '' });
    const label = el('input', { type: 'text', value: bukuAktif.label || '' });
    const warna = el('input', { type: 'color', value: bukuAktif.warna || '#800203' });
    const sampulUrl = el('input', { type: 'text', value: bukuAktif.sampul_url || '', placeholder: '/assets/produk/… atau https://…' });
    const tampilBuku = el('input', { type: 'checkbox', checked: bukuAktif.tampil });
    const sampulFile = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'hidden' });
    const contohSampul = el('div', { class: 'adm-sampul' }, bukuAktif.sampul_url ? el('img', { src: bukuAktif.sampul_url, alt: '' }) : el('span', {}, 'Belum ada sampul'));
    sampulFile.addEventListener('change', async () => {
      const f = sampulFile.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) { sampulFile.value = ''; return toast('Gambar maksimal 3 MB', true); }
      try {
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `sampul-${bukuAktif.slug}-${Date.now()}.${ext}`;
        await q(supabase.storage.from('produk').upload(path, f, { contentType: f.type, cacheControl: '31536000' }));
        sampulUrl.value = supabase.storage.from('produk').getPublicUrl(path).data.publicUrl;
        contohSampul.replaceChildren(el('img', { src: sampulUrl.value, alt: '' }));
        toast('Sampul diunggah. Klik Simpan info ebook.');
      } catch (err) { toast('Gagal mengunggah: ' + err.message, true); }
      sampulFile.value = '';
    });
    const simpanInfo = el('button', { type: 'button', class: 'kecil' }, 'Simpan info ebook');
    simpanInfo.addEventListener('click', async () => {
      try {
        Object.assign(bukuAktif, await q(supabase.from('ebook_buku').update({ judul: judul.value.trim(), subjudul: sub.value.trim() || null, label: label.value.trim() || null,
          warna: warna.value, sampul_url: sampulUrl.value.trim() || null, tampil: tampilBuku.checked, updated_at: new Date().toISOString() }).eq('id', bukuAktif.id).select().single()));
        if (bukuAktif.slug === 'panduan-reseller') {
          info = await q(supabase.from('ebook_info').update({ judul: bukuAktif.judul, subjudul: bukuAktif.subjudul || '', label: bukuAktif.label || '', updated_at: new Date().toISOString() }).eq('id', 1).select().single());
        }
        toast('Info ebook tersimpan'); gambarIsi();
      } catch (err) { toast(err.message, true); }
    });
    const bab = babBuku();
    const baris = bab.map((b, i) => {
      const tampil = el('input', { type: 'checkbox', checked: b.tampil, 'aria-label': `Tampilkan ${b.judul}` });
      tampil.addEventListener('change', async () => {
        try { await q(supabase.from('ebook_bab').update({ tampil: tampil.checked }).eq('id', b.id)); b.tampil = tampil.checked; toast(tampil.checked ? 'Bab ditampilkan' : 'Bab disembunyikan'); }
        catch (err) { toast(err.message, true); tampil.checked = !tampil.checked; }
      });
      const geser = (arah) => async () => {
        const j = i + arah;
        if (j < 0 || j >= bab.length) return;
        const [x, y] = [bab[i], bab[j]];
        try {
          await q(supabase.from('ebook_bab').update({ urut: y.urut }).eq('id', x.id));
          await q(supabase.from('ebook_bab').update({ urut: x.urut }).eq('id', y.id));
          [x.urut, y.urut] = [y.urut, x.urut];
          gambarIsi();
        } catch (err) { toast(err.message, true); }
      };
      return el('tr', {},
        td(el('span', { class: 'row', style: 'gap:8px;flex-wrap:nowrap' }, el('span', { class: 'eb-adm-ikon' }, ikon(b.ikon, 18)), el('b', {}, b.label))),
        td(el('span', {}, b.judul, el('br'), el('span', { class: 'muted' }, `${(b.isi || '').length.toLocaleString('id-ID')} huruf`))),
        td(el('label', { class: 'row muted' }, tampil, 'tampil')),
        td(el('div', { class: 'row', style: 'gap:4px' },
          el('button', { type: 'button', class: 'sec kecil', 'aria-label': 'Naikkan', onclick: geser(-1) }, '↑'),
          el('button', { type: 'button', class: 'sec kecil', 'aria-label': 'Turunkan', onclick: geser(1) }, '↓'),
          el('button', { type: 'button', class: 'kecil', onclick: () => bukaBab(b) }, 'Ubah'))));
    });
    kartuIsi.replaceChildren(
      el('h2', {}, 'Isi ebook (bisa diedit)'),
      el('p', { class: 'sub' }, 'Semua bab tersimpan di database dan langsung tampil di ebook pembaca setelah disimpan. Teks memakai format sederhana: ## judul, - daftar, **tebal**, plus blok interaktif (:::alur, :::checklist, :::kuis, :::chat, dan lainnya) yang bisa disisipkan dari tombol di editor.'),
      el('div', { class: 'row', style: 'margin-bottom:12px' }, el('label', { class: 'f', style: 'margin:0' }, 'Ebook'), el('div', { style: 'flex:1;min-width:220px' }, pilihBuku), bukuBaru),
      el('div', { class: 'adm-buku' }, el('div', {}, contohSampul, el('button', { type: 'button', class: 'sec kecil', style: 'margin-top:8px', onclick: () => sampulFile.click() }, 'Ganti sampul…'), sampulFile),
        el('div', { class: 'grid2' }, isian('Judul ebook', judul), isian('Subjudul', sub), isian('Label di sampul', label),
          isian('Gambar sampul (3:4)', sampulUrl), isian('Warna ebook', warna), el('label', { class: 'row muted', style: 'align-self:end' }, tampilBuku, 'Tampil di rak pembaca'))),
      el('div', { class: 'row', style: 'margin:10px 0 14px' }, simpanInfo,
        el('a', { class: 'btn sec kecil', href: bukuAktif.slug === 'panduan-reseller' ? '/reseller/ebook/' : `/ebook/?b=${bukuAktif.slug}`, target: '_blank', rel: 'noopener' }, 'Buka di pembaca ↗')),
      tabel(['Bab', 'Judul', 'Tampil', ''], baris),
      el('div', { class: 'row', style: 'margin-top:10px' }, el('button', { type: 'button', class: 'sec kecil', onclick: () => bukaBab({ label: String(babBuku().length + 1).padStart(2, '0'), judul: '', isi: '', ikon: 'buku', tampil: true }) }, '+ Bab baru')),
      editor);
  }

  function bukaBab(b) {
    const label = el('input', { type: 'text', value: b.label || '', maxlength: 12 });
    const judul = el('input', { type: 'text', value: b.judul || '', maxlength: 120 });
    const ringkas = el('input', { type: 'text', value: b.ringkas || '', maxlength: 300 });
    const pilihIkon = el('select', {}, DAFTAR_IKON.map((k) => el('option', { value: k, selected: k === (b.ikon || 'buku') }, k)));
    const contohIkon = el('span', { class: 'eb-adm-ikon besar' }, ikon(b.ikon || 'buku', 22));
    pilihIkon.addEventListener('change', () => contohIkon.replaceChildren(ikon(pilihIkon.value, 22)));
    const teks = el('textarea', { class: 'eb-adm-teks', value: b.isi || '', spellcheck: 'false', 'aria-label': 'Isi bab' });
    const pratinjau = el('div', { class: 'eb-pratinjau eb-teks' });
    const gambarPratinjau = () => pratinjau.replaceChildren(...renderIsi(teks.value, { progres: {} }));
    let jeda;
    teks.addEventListener('input', () => { clearTimeout(jeda); jeda = setTimeout(gambarPratinjau, 250); });
    gambarPratinjau();
    const sisip = (isi) => {
      const awal = teks.selectionStart ?? teks.value.length;
      const sebelum = teks.value.slice(0, awal), sesudah = teks.value.slice(teks.selectionEnd ?? awal);
      const pisah = sebelum && !sebelum.endsWith('\n\n') ? (sebelum.endsWith('\n') ? '\n' : '\n\n') : '';
      teks.value = `${sebelum}${pisah}${isi}\n\n${sesudah.replace(/^\n+/, '')}`;
      teks.focus();
      gambarPratinjau();
    };
    const gambarFile = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'hidden' });
    gambarFile.addEventListener('change', async () => {
      const f = gambarFile.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) { gambarFile.value = ''; return toast('Gambar maksimal 3 MB', true); }
      try {
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `ebook-${Date.now()}.${ext}`;
        await q(supabase.storage.from('banners').upload(path, f, { contentType: f.type, cacheControl: '31536000' }));
        sisip(`![Keterangan gambar](${supabase.storage.from('banners').getPublicUrl(path).data.publicUrl})`);
        toast('Gambar disisipkan. Ganti "Keterangan gambar" sesuai isinya.');
      } catch (err) { toast('Gagal mengunggah: ' + err.message, true); }
      gambarFile.value = '';
    });
    const alat = el('div', { class: 'eb-adm-alat' },
      el('span', { class: 'muted' }, 'Sisipkan:'),
      el('button', { type: 'button', class: 'sec kecil', onclick: () => sisip('## Subjudul') }, 'Subjudul'),
      el('button', { type: 'button', class: 'sec kecil', onclick: () => sisip('- Poin pertama\n- Poin kedua') }, 'Daftar'),
      BLOK.map(([n, isi]) => el('button', { type: 'button', class: 'sec kecil', onclick: () => sisip(isi) }, n)),
      el('button', { type: 'button', class: 'sec kecil', onclick: () => gambarFile.click() }, 'Gambar…'), gambarFile);

    const simpan = el('button', { type: 'button' }, 'Simpan bab');
    simpan.addEventListener('click', async () => {
      if (!judul.value.trim() || !label.value.trim()) return toast('Isi label dan judul bab', true);
      const isi = { label: label.value.trim(), judul: judul.value.trim(), ringkas: ringkas.value.trim() || null, ikon: pilihIkon.value, isi: teks.value, updated_at: new Date().toISOString() };
      simpan.disabled = true;
      try {
        if (b.id) Object.assign(b, await q(supabase.from('ebook_bab').update(isi).eq('id', b.id).select().single()));
        else {
          let slug = slugDari(isi.judul);
          const diBuku = babBuku();
          if (diBuku.some((x) => x.slug === slug)) slug += '-' + Date.now().toString(36).slice(-4);
          const baru = await q(supabase.from('ebook_bab').insert({ ...isi, slug, buku_id: bukuAktif.id, tampil: true, urut: (diBuku.at(-1)?.urut ?? 0) + 10 }).select().single());
          bab.push(baru);
        }
        toast('Bab tersimpan dan langsung tampil di ebook');
        editor.replaceChildren();
        gambarIsi();
      } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
    });
    const hapus = el('button', { type: 'button', class: 'bahaya' }, 'Hapus bab');
    hapus.addEventListener('click', async () => {
      if (!confirm(`Hapus bab "${b.judul}"? Tidak bisa dibatalkan. Kalau hanya ingin menyembunyikan, hilangkan centang "tampil".`)) return;
      try { await q(supabase.from('ebook_bab').delete().eq('id', b.id)); bab.splice(bab.indexOf(b), 1); editor.replaceChildren(); gambarIsi(); toast('Bab dihapus'); }
      catch (err) { toast(err.message, true); }
    });
    editor.replaceChildren(el('div', { class: 'item-form' },
      el('h3', { style: 'margin:0' }, b.id ? `Ubah: ${b.label} · ${b.judul}` : 'Bab baru'),
      el('div', { class: 'grid2' }, isian('Label (mis. 05 atau Bonus)', label), isian('Judul bab', judul), isian('Ringkasan (tampil di daftar isi)', ringkas),
        el('div', {}, el('label', { class: 'f' }, 'Ikon'), el('div', { class: 'row' }, contohIkon, el('div', { style: 'flex:1' }, pilihIkon)))),
      alat,
      el('div', { class: 'eb-adm-dua' },
        el('div', {}, el('label', { class: 'f' }, 'Isi bab'), teks),
        el('div', {}, el('label', { class: 'f' }, 'Pratinjau (seperti yang dilihat pembaca)'), el('div', { class: 'eb-pratinjau-wadah' }, pratinjau))),
      el('div', { class: 'row gen-aksi' }, simpan, b.id ? hapus : null, el('button', { type: 'button', class: 'sec', onclick: () => editor.replaceChildren() }, 'Tutup'))));
    editor.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  gambarIsi();

  // ---- riwayat
  const kartuLog = el('section', { class: 'card' }, el('h2', {}, 'Riwayat akses terbaru'),
    log.length ? tabel(['Waktu', 'Pembaca', 'Kejadian', 'Perangkat'], log.map((l) => el('tr', {},
      td(waktu(l.created_at)), td(nama.get(l.akses_id)?.nama ?? '–'),
      td(el('span', { class: 'tag ' + (/ditolak|gagal|dicabut/.test(l.acara) ? 'merah' : l.acara === 'perangkat_baru' ? 'kuning' : '') }, ACARA[l.acara] ?? l.acara)),
      td(el('span', { class: 'muted', title: l.ua || '' }, (l.ua || '').slice(0, 60)))))) : el('p', { class: 'muted' }, 'Belum ada riwayat.'));

  halaman.replaceChildren(
    el('div', { class: 'stats' },
      el('div', { class: 'stat' + (menunggu.length ? ' kuning' : '') }, el('b', {}, menunggu.length), el('span', {}, 'Menunggu persetujuan')),
      el('div', { class: 'stat' }, el('b', {}, aktif.length), el('span', {}, 'Pembaca aktif')),
      el('div', { class: 'stat' + (ditolak ? ' merah' : '') }, el('b', {}, ditolak), el('span', {}, 'Percobaan perangkat berlebih (7 hari)')),
      el('div', { class: 'stat' }, el('b', {}, buku.length), el('span', {}, 'Ebook'))),
    el('div', { class: 'msg', style: 'margin:0 0 16px;background:var(--surface);border:1px solid var(--line)' },
      'Rak ebook pembeli: ', el('a', { href: '/ebook/', target: '_blank', rel: 'noopener' }, `${location.origin}/ebook/`),
      ' · Panduan reseller: ', el('a', { href: '/reseller/ebook/', target: '_blank', rel: 'noopener' }, `${location.origin}/reseller/ebook/`),
      '. Ebook dijual lewat menu Produk digital.'),
    kartuMinta, kartuPembaca, kartuBeri, kartuIsi, kartuLog);
}
