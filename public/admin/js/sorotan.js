// Menu Headline beranda: susunan headline yang berganti otomatis di bagian atas beranda.
// Headline otomatis mengambil isi dari data toko (promo, bundle, kupon, top pick, member, ajak teman, affiliate,
// reseller, film, blog); judul/teks bisa diganti. Headline manual untuk kabar lain.
import { el, isian, q, toast, waktu } from './alat.js';

const JENIS = {
  promo: ['Promo berlangsung', 'Promo yang sedang berjalan (paling dekat berakhir) dengan hitung mundur. Tidak tampil kalau tidak ada promo.'],
  bundle: ['Bundle andalan', 'Bundle bertanda "Terbaik", atau bundle aktif pertama, lengkap dengan harga hematnya.'],
  kupon: ['Kupon promo', 'Kode kupon yang dicentang "Tampilkan di headline beranda" di menu Member & kupon.'],
  toppick: ['Top pick', 'Aplikasi paling laku bulan ini (atau aplikasi unggulan kalau penjualan belum cukup).'],
  member: ['Daftar member', 'Ajakan daftar member gratis + besar diskonnya dari menu Member & kupon.'],
  ajak: ['Ajak teman', 'Ajak teman dapat kupon (aturan di menu Member & kupon → Ajak teman).'],
  affiliate: ['Join affiliate', 'Ajakan jadi affiliate + besar komisi dari menu Affiliate.'],
  reseller: ['Program reseller', 'Harga promo & hitung mundur program reseller.'],
  film: ['Film baru tayang', 'Film atau serial terbaru yang sedang tayang di aplikasi yang dijual.'],
  blog: ['Artikel terbaru', 'Artikel blog terbaru.'],
  manual: ['Headline manual', 'Headline buatanmu sendiri: judul, teks, tombol, dan link bebas.'],
};
const keLokal = (d) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const dariLokal = (v) => (v ? new Date(v).toISOString() : null);

export async function halamanSorotan(supabase, halaman) {
  let rows, kupon;
  try {
    [rows, kupon] = await Promise.all([
      q(supabase.from('sorotan').select('*').order('urutan').order('id')),
      q(supabase.from('coupons').select('code,tampil_publik,is_active,sampai,sumber').eq('sumber', 'admin').eq('tampil_publik', true)),
    ]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Headline beranda butuh migration 20261121000000_langganan_kabari_ajak_sorotan.sql. Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  const segarkan = () => halamanSorotan(supabase, halaman);
  const editor = el('div');

  async function tukar(a, b) {
    try {
      await q(supabase.from('sorotan').update({ urutan: b.urutan, updated_at: new Date().toISOString() }).eq('id', a.id));
      await q(supabase.from('sorotan').update({ urutan: a.urutan, updated_at: new Date().toISOString() }).eq('id', b.id));
      segarkan();
    } catch (err) { toast('Gagal: ' + err.message, true); }
  }
  // urutan unik dulu supaya naik/turun selalu bisa ditukar
  if (new Set(rows.map((r) => r.urutan)).size !== rows.length) {
    rows.forEach((r, i) => { r.urutan = (i + 1) * 10; });
    await Promise.all(rows.map((r) => q(supabase.from('sorotan').update({ urutan: r.urutan }).eq('id', r.id)))).catch(() => {});
  }

  function form(r) {
    const manual = r.jenis === 'manual';
    const f = (nilai, max, ph) => el('input', { type: 'text', value: nilai ?? '', maxlength: max, placeholder: ph });
    const label = f(r.label, 30, manual ? 'mis. KABAR BARU' : 'otomatis');
    const judul = f(r.judul, 90, manual ? 'mis. Stok Netflix Private datang!' : 'kosong = judul otomatis');
    const teks = el('textarea', { rows: 2, maxlength: 220, placeholder: manual ? 'Satu-dua kalimat' : 'kosong = teks otomatis', value: r.teks ?? '' });
    const tombol = f(r.tombol, 30, manual ? 'mis. Lihat sekarang' : 'kosong = otomatis');
    const tautan = f(r.tautan, 300, manual ? '/aplikasi/?app=netflix' : 'kosong = otomatis');
    const gambar = f(r.gambar_url, 500, '/assets/… atau https://… (opsional)');
    const judulEn = f(r.judul_en, 90, 'English title (optional)');
    const teksEn = el('textarea', { rows: 2, maxlength: 220, placeholder: 'English text (optional)', value: r.teks_en ?? '' });
    const tombolEn = f(r.tombol_en, 30, 'English button (optional)');
    const mulai = el('input', { type: 'datetime-local', value: keLokal(r.mulai) });
    const sampai = el('input', { type: 'datetime-local', value: keLokal(r.sampai) });
    const simpan = el('button', { type: 'button' }, r.id ? 'Simpan headline' : 'Tambah headline');
    simpan.addEventListener('click', async () => {
      const kosong = (x) => x.value.trim() || null;
      const baris = {
        label: kosong(label), judul: kosong(judul), teks: kosong(teks), tombol: kosong(tombol), tautan: kosong(tautan), gambar_url: kosong(gambar),
        judul_en: kosong(judulEn), teks_en: kosong(teksEn), tombol_en: kosong(tombolEn), mulai: dariLokal(mulai.value), sampai: dariLokal(sampai.value),
        updated_at: new Date().toISOString(),
      };
      if (manual && !baris.judul) return toast('Headline manual wajib punya judul', true);
      for (const u of [baris.tautan, baris.gambar_url]) if (u && !/^(\/|https:\/\/)/.test(u)) return toast('Link & gambar harus diawali / atau https://', true);
      if (baris.mulai && baris.sampai && baris.mulai >= baris.sampai) return toast('Tanggal selesai harus setelah tanggal mulai', true);
      simpan.disabled = true;
      try {
        if (r.id) await q(supabase.from('sorotan').update(baris).eq('id', r.id));
        else await q(supabase.from('sorotan').insert({ ...baris, jenis: 'manual', aktif: true, urutan: Math.min(0, ...rows.map((x) => x.urutan)) - 10 }));
        toast('Headline tersimpan'); segarkan();
      } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
    });
    const hapus = r.id && manual ? el('button', { type: 'button', class: 'bahaya' }, 'Hapus') : null;
    hapus?.addEventListener('click', async () => {
      if (!confirm(`Hapus headline "${r.judul}"?`)) return;
      try { await q(supabase.from('sorotan').delete().eq('id', r.id)); toast('Headline dihapus'); segarkan(); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });
    editor.replaceChildren(el('div', { class: 'item-form' },
      el('h3', { style: 'margin:0 0 4px' }, r.id ? `Ubah: ${JENIS[r.jenis][0]}` : 'Headline manual baru'),
      el('p', { class: 'muted', style: 'margin:0' }, manual ? 'Muncul di urutan paling atas. Pakai tanggal mulai/selesai untuk kabar yang sementara.' : `${JENIS[r.jenis][1]} Kosongkan kolom untuk memakai teks otomatis yang selalu mengikuti data terbaru.`),
      el('div', { class: 'grid2' },
        isian('Label kecil', label), isian('Judul', judul), isian('Teks', teks), isian('Tulisan tombol', tombol),
        isian('Link tombol', tautan), isian('Gambar (opsional)', gambar, 'Rasio lebar, mis. 1200×630. Kosong = gambar otomatis.')),
      el('details', { style: 'margin-top:10px' }, el('summary', {}, 'Versi bahasa Inggris'),
        el('div', { class: 'grid2' }, isian('Title', judulEn), isian('Text', teksEn), isian('Button', tombolEn))),
      el('div', { class: 'grid2' }, isian('Tampil mulai', mulai, 'Kosongkan = langsung tampil.'), isian('Tampil sampai', sampai, 'Kosongkan = tanpa batas.')),
      el('div', { class: 'row', style: 'margin-top:10px' }, simpan, el('button', { type: 'button', class: 'sec', onclick: () => editor.replaceChildren() }, 'Tutup'), hapus)));
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const sekarang = Date.now();
  const daftar = el('div', { class: 'daftar-sorotan' }, rows.map((r, i) => {
    const [nama, ket] = JENIS[r.jenis] ?? [r.jenis, ''];
    const terjadwal = r.mulai && Date.parse(r.mulai) > sekarang;
    const lewat = r.sampai && Date.parse(r.sampai) < sekarang;
    const saklar = el('button', { type: 'button', class: 'kecil saklar ' + (r.aktif ? 'ada' : 'habis'), 'aria-pressed': String(r.aktif), 'aria-label': `${r.aktif ? 'Sembunyikan' : 'Tampilkan'} ${nama}` }, r.aktif ? 'Tampil' : 'Disembunyikan');
    saklar.addEventListener('click', async () => {
      saklar.disabled = true;
      try { await q(supabase.from('sorotan').update({ aktif: !r.aktif, updated_at: new Date().toISOString() }).eq('id', r.id)); toast(r.aktif ? `${nama} disembunyikan` : `${nama} tampil`); segarkan(); }
      catch (err) { toast('Gagal: ' + err.message, true); saklar.disabled = false; }
    });
    const naik = el('button', { type: 'button', class: 'sec kecil', 'aria-label': `Naikkan ${nama}`, disabled: i === 0 }, '↑');
    const turun = el('button', { type: 'button', class: 'sec kecil', 'aria-label': `Turunkan ${nama}`, disabled: i === rows.length - 1 }, '↓');
    naik.addEventListener('click', () => tukar(r, rows[i - 1]));
    turun.addEventListener('click', () => tukar(r, rows[i + 1]));
    const catatan = r.jenis === 'kupon' && !kupon.length ? el('span', { class: 'tag kuning' }, 'belum ada kupon yang dicentang') : null;
    return el('div', { class: 'baris-sorotan' + (r.aktif ? '' : ' redup') },
      el('span', { class: 'nomor-sorotan', 'aria-hidden': 'true' }, i + 1),
      el('div', { class: 'isi-sorotan' },
        el('div', {}, el('b', {}, r.jenis === 'manual' ? r.judul : nama), ' ',
          el('span', { class: 'tag' }, r.jenis === 'manual' ? 'manual' : 'otomatis'),
          r.judul && r.jenis !== 'manual' ? el('span', { class: 'tag biru' }, 'judul diganti') : null,
          terjadwal ? el('span', { class: 'tag biru' }, `mulai ${waktu(r.mulai)}`) : null,
          lewat ? el('span', { class: 'tag merah' }, 'sudah lewat') : r.sampai ? el('span', { class: 'tag' }, `sampai ${waktu(r.sampai)}`) : null, catatan),
        el('div', { class: 'muted' }, r.jenis === 'manual' ? (r.teks || ket) : r.judul ? `"${r.judul}"` : ket)),
      el('div', { class: 'row' }, naik, turun, saklar, el('button', { type: 'button', class: 'sec kecil', onclick: () => form(r) }, 'Ubah')));
  }));

  halaman.replaceChildren(el('section', { class: 'card' },
    el('div', { class: 'row', style: 'justify-content:space-between' }, el('h2', {}, 'Headline beranda'),
      el('div', { class: 'row' }, el('a', { class: 'btn sec', href: '/', target: '_blank', rel: 'noopener' }, 'Lihat beranda ↗'),
        el('button', { type: 'button', onclick: () => form({ jenis: 'manual' }) }, '+ Headline manual'))),
    el('p', { class: 'sub' }, 'Kabar terkini yang berganti otomatis di bagian paling atas beranda, untuk pengunjung yang baru pertama datang. Headline otomatis selalu mengikuti data terbaru dan tidak tampil kalau datanya kosong (misalnya tidak ada promo yang berjalan). Atur urutan dengan ↑ ↓.'),
    editor, daftar));
}
