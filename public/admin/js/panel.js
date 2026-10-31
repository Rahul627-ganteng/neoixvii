// Panel admin IXVII.CO: ringkasan, pesanan, stok cepat, data aplikasi (logo, unggulan, deskripsi, FAQ, harga resmi),
// pengaturan toko & konten (WhatsApp, pembayaran, kurs, FAQ beranda, penjelasan tipe paket), margin, dan riwayat impor.
// Semua akses dijaga RLS: hanya akun dengan role admin yang bisa mengubah data.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '/js/config.js';
import { unduhExcel } from './ekspor.js';
import { el, hariIni, memuat, persen, q, rp, tabel, td, toast, waktu } from './alat.js';
import { halamanPesanan } from './pesanan.js';
import { halamanToko } from './toko.js';
import { halamanPromo } from './promo.js';
import { halamanUlasan } from './ulasan.js';
import { halamanMitra } from './mitra.js';
import { halamanFilm } from './film.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const halaman = $('halaman');

const urutKatalog = (x) => x.order('sort_kategori').order('sort_aplikasi').order('sort_tipe').order('sort_varian').order('code');

function ikon(app, besar = false) {
  const kelas = 'ikon' + (besar ? ' besar' : '');
  if (app.logo_url) return el('div', { class: kelas }, el('img', { src: app.logo_url, alt: '' }));
  const kata = app.name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
  return el('div', { class: kelas, 'aria-hidden': 'true' }, (kata.length > 1 ? kata[0][0] + kata[1][0] : kata[0].slice(0, 2)).toUpperCase());
}

// ---------------------------------------------------------------- login
function pesan(id, teks, jenis = 'err') { $(id).replaceChildren(teks ? el('div', { class: `msg ${jenis}` }, teks) : ''); }

$('formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  pesan('pesanLogin', '');
  const { error } = await supabase.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
  if (error) pesan('pesanLogin', 'Gagal masuk: ' + error.message);
});
$('tombolKeluar').addEventListener('click', () => supabase.auth.signOut());

let siap = false;
function mulai(session) {
  const masuk = !!session;
  const admin = session?.user?.app_metadata?.role === 'admin';
  $('kartuLogin').classList.toggle('hidden', masuk);
  $('akun').classList.toggle('hidden', !masuk);
  $('menu').classList.toggle('hidden', !admin);
  if (!masuk) { siap = false; halaman.replaceChildren(); return; }
  $('namaAkun').textContent = session.user.email;
  if (!admin) {
    siap = false;
    halaman.replaceChildren(el('div', { class: 'msg err' }, 'Akun ini belum admin. Jalankan perintah admin di SQL Editor (Tahap 3), lalu keluar dan masuk lagi.'));
    return;
  }
  if (!siap) { siap = true; rute(); }
}
// jangan memanggil fungsi Supabase lain langsung di dalam callback ini (saran resmi supabase-js)
supabase.auth.onAuthStateChange((_e, session) => setTimeout(() => mulai(session), 0));

// ---------------------------------------------------------------- router
const RUTE = {
  ringkasan, stok, aplikasi, margin, riwayat,
  pesanan: () => halamanPesanan(supabase, halaman),
  toko: () => halamanToko(supabase, halaman),
  promo: () => halamanPromo(supabase, halaman),
  ulasan: () => halamanUlasan(supabase, halaman),
  mitra: () => halamanMitra(supabase, halaman),
  film: () => halamanFilm(supabase, halaman),
};
async function rute() {
  if (!siap) return;
  const nama = RUTE[location.hash.slice(1)] ? location.hash.slice(1) : 'ringkasan';
  for (const a of document.querySelectorAll('nav.menu a')) a.setAttribute('aria-current', a.getAttribute('href') === '#' + nama ? 'page' : 'false');
  halaman.replaceChildren(memuat());
  try { await RUTE[nama](); }
  catch (err) { halaman.replaceChildren(el('div', { class: 'msg err' }, 'Gagal memuat: ' + err.message)); }
}
window.addEventListener('hashchange', rute);

// ---------------------------------------------------------------- unduh excel
function tombolUnduh() {
  const b = el('button', { type: 'button' }, 'Unduh Excel');
  b.addEventListener('click', async () => {
    b.disabled = true; b.textContent = 'Menyiapkan file…';
    try { const h = await unduhExcel(supabase); toast(`File berisi ${h.jumlah} varian sudah diunduh`); }
    catch (err) { toast('Gagal mengunduh: ' + err.message, true); }
    finally { b.disabled = false; b.textContent = 'Unduh Excel'; }
  });
  return b;
}

// ---------------------------------------------------------------- 1. ringkasan
async function ringkasan() {
  const rows = await q(urutKatalog(supabase.from('v_katalog_admin')
    .select('code,aplikasi,tipe,varian,harga,hpp,margin_pct,harga_minimum,stok,tampil')));
  const tampil = rows.filter((r) => r.tampil);
  const masalah = [];
  for (const r of tampil) {
    if (r.hpp != null && r.hpp > 0 && r.harga <= r.hpp) masalah.push({ r, n: 0, teks: 'Rugi / impas', kelas: 'merah' });
    else if (r.harga_minimum != null && r.hpp > 0 && r.harga < r.harga_minimum) masalah.push({ r, n: 1, teks: `Di bawah harga minimum ${rp(r.harga_minimum)}`, kelas: 'kuning' });
    else if (r.hpp == null) masalah.push({ r, n: 2, teks: 'HPP belum diisi', kelas: '' });
    else if (r.hpp === 0) masalah.push({ r, n: 3, teks: 'HPP tertulis 0', kelas: '' });
  }
  masalah.sort((a, b) => a.n - b.n);
  const hitung = (n) => masalah.filter((m) => m.n === n).length;
  const stat = (angka, label, kelas = '') => el('div', { class: 'stat ' + kelas }, el('b', {}, angka), el('span', {}, label));

  halaman.replaceChildren(
    el('div', { class: 'stats' },
      stat(tampil.length, 'varian tampil di web'),
      stat(hitung(0), 'rugi / impas', hitung(0) ? 'merah' : ''),
      stat(hitung(1), 'di bawah margin minimum', hitung(1) ? 'kuning' : ''),
      stat(hitung(2), 'HPP belum diisi', hitung(2) ? 'kuning' : ''),
      stat(tampil.filter((r) => r.stok === 'habis').length, 'stok habis')),
    el('section', { class: 'card' },
      el('h2', {}, 'Ubah harga lewat Excel'),
      el('p', { class: 'sub' }, 'Unduh file terbaru, ubah HPP/markup/stok di sheet Katalog, lalu unggah di halaman Impor Excel.'),
      el('div', { class: 'row' }, tombolUnduh(), el('a', { class: 'btn sec', href: '/admin-impor/' }, 'Buka Impor Excel'))),
    el('section', { class: 'card' },
      el('h2', {}, `Perlu perhatian (${masalah.length})`),
      el('p', { class: 'sub' }, 'Hanya varian yang tampil di web. Batas margin diatur di menu Margin.'),
      masalah.length ? tabel(['ID', 'Aplikasi', 'Tipe · Varian', '>Harga', '>HPP', '>Margin', 'Catatan'],
        masalah.map(({ r, teks, kelas }) => el('tr', {}, td(r.code), td(r.aplikasi), td(`${r.tipe} · ${r.varian}`),
          td(rp(r.harga), true), td(rp(r.hpp), true), td(persen(r.margin_pct), true), td(el('span', { class: 'tag ' + kelas }, teks)))))
        : el('p', { class: 'muted' }, 'Tidak ada. Semua varian punya HPP dan marginnya aman.')));
}

// ---------------------------------------------------------------- 2. stok
async function stok() {
  const rows = await q(urutKatalog(supabase.from('v_katalog_admin').select('code,aplikasi,tipe,varian,harga,stok,tampil')));
  const cari = el('input', { type: 'search', placeholder: 'Cari aplikasi atau varian…', 'aria-label': 'Cari' });
  const saring = el('select', { 'aria-label': 'Saring stok' },
    el('option', { value: 'semua' }, 'Semua'), el('option', { value: 'tersedia' }, 'Tersedia'), el('option', { value: 'habis' }, 'Habis'));
  const daftar = el('div');

  const saklar = (r) => {
    const b = el('button', { type: 'button', class: 'kecil saklar' });
    const gambar = () => { b.className = 'kecil saklar ' + (r.stok === 'habis' ? 'habis' : 'ada'); b.textContent = r.stok === 'habis' ? 'Habis' : 'Tersedia'; };
    gambar();
    b.addEventListener('click', async () => {
      const baru = r.stok === 'habis' ? 'tersedia' : 'habis';
      b.disabled = true;
      try { await q(supabase.rpc('ubah_stok', { p_code: r.code, p_stok: baru })); r.stok = baru; gambar(); toast(`${r.aplikasi} ${r.varian}: ${baru === 'habis' ? 'Habis' : 'Tersedia'}`); }
      catch (err) { toast('Gagal: ' + err.message, true); }
      finally { b.disabled = false; }
    });
    return b;
  };

  const gambarDaftar = () => {
    const kata = cari.value.trim().toLowerCase();
    const cocok = rows.filter((r) => (saring.value === 'semua' || r.stok === saring.value) &&
      (!kata || `${r.aplikasi} ${r.tipe} ${r.varian}`.toLowerCase().includes(kata)));
    const perApp = new Map();
    for (const r of cocok) { if (!perApp.has(r.aplikasi)) perApp.set(r.aplikasi, []); perApp.get(r.aplikasi).push(r); }
    daftar.replaceChildren(...(cocok.length ? [...perApp].map(([app, isi]) => el('div', { class: 'app-grup' },
      el('h3', {}, app),
      tabel(['ID', 'Tipe · Varian', '>Harga', 'Stok'], isi.map((r) => el('tr', {},
        td(r.code), td(`${r.tipe} · ${r.varian}`, false), td(rp(r.harga), true),
        td(el('div', { class: 'row' }, saklar(r), r.tampil ? null : el('span', { class: 'tag' }, 'disembunyikan')))))))) : [el('p', { class: 'muted' }, 'Tidak ada yang cocok.')]));
  };
  cari.addEventListener('input', gambarDaftar);
  saring.addEventListener('change', gambarDaftar);
  gambarDaftar();
  halaman.replaceChildren(el('section', { class: 'card' },
    el('h2', {}, 'Stok cepat'),
    el('p', { class: 'sub' }, 'Klik tombol untuk mengganti Tersedia ↔ Habis. Langsung berlaku di website dan tercatat di Riwayat.'),
    el('div', { class: 'grid2' }, cari, saring), daftar));
}

// ---------------------------------------------------------------- 3. aplikasi
let pilihApp = null;
async function aplikasi() {
  const apps = (await q(supabase.from('apps').select('id,name,slug,description,description_en,logo_url,is_featured,is_active,sort,categories(label,sort)').order('sort')))
    .sort((a, b) => (a.categories?.sort ?? 0) - (b.categories?.sort ?? 0) || a.sort - b.sort);
  if (!apps.length) { halaman.replaceChildren(el('p', { class: 'muted' }, 'Belum ada aplikasi.')); return; }
  if (!apps.some((a) => a.id === pilihApp)) pilihApp = apps[0].id;

  const cari = el('input', { type: 'search', placeholder: 'Cari aplikasi…', 'aria-label': 'Cari aplikasi' });
  const scroll = el('div', { class: 'scroll' });
  const editor = el('div');
  const gambarDaftar = () => {
    const kata = cari.value.trim().toLowerCase();
    scroll.replaceChildren(...apps.filter((a) => !kata || a.name.toLowerCase().includes(kata)).map((a) =>
      el('button', { type: 'button', class: 'item', 'aria-current': String(a.id === pilihApp), onclick: () => { pilihApp = a.id; gambarDaftar(); bukaEditor(a); } },
        ikon(a), el('span', {}, a.name, el('br'), el('span', { class: 'muted' }, a.categories?.label ?? '')))));
  };
  const bukaEditor = (a) => editorApp(a, editor, gambarDaftar).catch((err) => editor.replaceChildren(el('div', { class: 'msg err' }, err.message)));
  cari.addEventListener('input', gambarDaftar);
  gambarDaftar();
  halaman.replaceChildren(el('div', { class: 'tata-aplikasi' },
    el('section', { class: 'card daftar-app' }, el('h2', {}, 'Aplikasi'), cari, scroll), editor));
  bukaEditor(apps.find((a) => a.id === pilihApp));
}

async function editorApp(app, wadah, segarkanDaftar) {
  wadah.replaceChildren(memuat());
  const [faqs, resmi] = await Promise.all([
    q(supabase.from('app_faqs').select('id,question,answer,question_en,answer_en,sort').eq('app_id', app.id).order('sort').order('id')),
    q(supabase.from('official_prices').select('id,label,price,duration_days,note,checked_at,sort').eq('app_id', app.id).order('sort').order('id')),
  ]);
  const ikonBesar = el('div', {}, ikon(app, true));
  const gantiIkon = () => { ikonBesar.replaceChildren(ikon(app, true)); segarkanDaftar(); };

  // logo
  const fileLogo = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml', 'aria-label': 'Pilih file logo' });
  fileLogo.addEventListener('change', async () => {
    const f = fileLogo.files[0];
    if (!f) return;
    if (f.size > 1024 * 1024) { toast('Logo maksimal 1 MB', true); fileLogo.value = ''; return; }
    try {
      const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${app.slug}-${Date.now()}.${ext}`;
      await q(supabase.storage.from('logos').upload(path, f, { upsert: true, contentType: f.type, cacheControl: '3600' }));
      const url = supabase.storage.from('logos').getPublicUrl(path).data.publicUrl;
      await q(supabase.from('apps').update({ logo_url: url }).eq('id', app.id));
      app.logo_url = url; gantiIkon(); toast('Logo tersimpan');
    } catch (err) { toast('Gagal mengunggah: ' + err.message, true); }
    fileLogo.value = '';
  });
  const hapusLogo = el('button', { type: 'button', class: 'sec kecil' }, 'Hapus logo');
  hapusLogo.addEventListener('click', async () => {
    try { await q(supabase.from('apps').update({ logo_url: null }).eq('id', app.id)); app.logo_url = null; gantiIkon(); toast('Logo dihapus'); }
    catch (err) { toast('Gagal: ' + err.message, true); }
  });

  // unggulan & deskripsi
  const unggul = el('input', { type: 'checkbox', id: 'unggul' });
  unggul.checked = !!app.is_featured;
  unggul.addEventListener('change', async () => {
    try { await q(supabase.from('apps').update({ is_featured: unggul.checked }).eq('id', app.id)); app.is_featured = unggul.checked; toast(unggul.checked ? 'Tampil di beranda' : 'Tidak lagi di beranda'); }
    catch (err) { unggul.checked = !unggul.checked; toast('Gagal: ' + err.message, true); }
  });
  const desk = el('textarea', { 'aria-label': 'Deskripsi aplikasi', value: app.description || '' });
  const deskEn = el('textarea', { 'aria-label': 'Deskripsi aplikasi (Inggris)', value: app.description_en || '' });
  const simpanDesk = el('button', { type: 'button', class: 'kecil' }, 'Simpan deskripsi');
  simpanDesk.addEventListener('click', async () => {
    const isi = { description: desk.value.trim() || null, description_en: deskEn.value.trim() || null };
    try { await q(supabase.from('apps').update(isi).eq('id', app.id)); Object.assign(app, isi); toast('Deskripsi tersimpan'); }
    catch (err) { toast('Gagal: ' + err.message, true); }
  });

  // daftar FAQ & harga resmi (pola sama: satu form per baris, Simpan/Hapus)
  const daftarFaq = el('div');
  const formFaq = (f) => {
    const tanya = el('input', { type: 'text', 'aria-label': 'Pertanyaan', placeholder: 'Pertanyaan', value: f.question || '' });
    const jawab = el('textarea', { 'aria-label': 'Jawaban', placeholder: 'Jawaban', value: f.answer || '' });
    const tanyaEn = el('input', { type: 'text', 'aria-label': 'Pertanyaan (Inggris)', placeholder: 'Question (opsional)', value: f.question_en || '' });
    const jawabEn = el('textarea', { 'aria-label': 'Jawaban (Inggris)', placeholder: 'Answer (opsional)', value: f.answer_en || '' });
    const kotak = el('div', { class: 'item-form' }, el('div', { class: 'grid2' },
      el('div', {}, el('label', { class: 'f' }, 'Indonesia'), tanya, el('div', { style: 'height:6px' }), jawab),
      el('div', {}, el('label', { class: 'f' }, 'Inggris (kalau kosong, versi Indonesia yang tampil)'), tanyaEn, el('div', { style: 'height:6px' }), jawabEn)));
    const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
    const hapus = el('button', { type: 'button', class: 'kecil bahaya' }, 'Hapus');
    simpan.addEventListener('click', async () => {
      if (!tanya.value.trim() || !jawab.value.trim()) return toast('Pertanyaan dan jawaban wajib diisi', true);
      const isi = { question: tanya.value.trim(), answer: jawab.value.trim(), question_en: tanyaEn.value.trim() || null,
        answer_en: jawabEn.value.trim() || null, updated_at: new Date().toISOString() };
      try {
        if (f.id) await q(supabase.from('app_faqs').update(isi).eq('id', f.id));
        else Object.assign(f, await q(supabase.from('app_faqs').insert({ ...isi, app_id: app.id, sort: (faqs.length + 1) * 10 }).select('id').single()));
        toast('FAQ tersimpan');
      } catch (err) { toast('Gagal: ' + err.message, true); }
    });
    hapus.addEventListener('click', async () => {
      if (f.id && !confirm('Hapus pertanyaan ini?')) return;
      try { if (f.id) await q(supabase.from('app_faqs').delete().eq('id', f.id)); kotak.remove(); toast('FAQ dihapus'); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });
    kotak.append(el('div', { class: 'row', style: 'margin-top:8px' }, simpan, hapus));
    return kotak;
  };
  daftarFaq.append(...faqs.map(formFaq));
  const tambahFaq = el('button', { type: 'button', class: 'sec kecil', onclick: () => { const f = {}; faqs.push(f); daftarFaq.append(formFaq(f)); } }, '+ Tambah pertanyaan');

  const daftarResmi = el('div');
  const formResmi = (h) => {
    const label = el('input', { type: 'text', placeholder: 'Nama paket resmi, mis. Netflix Premium', value: h.label || '' });
    const harga = el('input', { type: 'number', min: '1', step: '1', placeholder: 'Harga resmi (Rp)', value: h.price ?? '' });
    const durasi = el('input', { type: 'number', min: '1', step: '1', placeholder: 'Durasi (hari)', value: h.duration_days ?? 30 });
    const catatan = el('input', { type: 'text', placeholder: 'Catatan (opsional)', value: h.note || '' });
    const dicek = el('input', { type: 'date', value: h.checked_at || hariIni() });
    const kotak = el('div', { class: 'item-form' },
      el('div', { class: 'grid2' },
        el('div', {}, el('label', { class: 'f' }, 'Paket resmi'), label),
        el('div', {}, el('label', { class: 'f' }, 'Harga resmi (Rp)'), harga),
        el('div', {}, el('label', { class: 'f' }, 'Durasi (hari)'), durasi),
        el('div', {}, el('label', { class: 'f' }, 'Dicek tanggal'), dicek)),
      el('label', { class: 'f' }, 'Catatan'), catatan);
    const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
    const hapus = el('button', { type: 'button', class: 'kecil bahaya' }, 'Hapus');
    simpan.addEventListener('click', async () => {
      const p = Math.round(Number(harga.value)), d = Math.round(Number(durasi.value));
      if (!label.value.trim() || !(p > 0) || !(d > 0)) return toast('Isi nama paket, harga, dan durasi dengan benar', true);
      const isi = { label: label.value.trim(), price: p, duration_days: d, note: catatan.value.trim() || null, checked_at: dicek.value || null, updated_at: new Date().toISOString() };
      try {
        if (h.id) await q(supabase.from('official_prices').update(isi).eq('id', h.id));
        else Object.assign(h, await q(supabase.from('official_prices').insert({ ...isi, app_id: app.id, sort: (resmi.length + 1) * 10 }).select('id').single()));
        toast('Harga resmi tersimpan');
      } catch (err) { toast('Gagal: ' + err.message, true); }
    });
    hapus.addEventListener('click', async () => {
      if (h.id && !confirm('Hapus harga resmi ini?')) return;
      try { if (h.id) await q(supabase.from('official_prices').delete().eq('id', h.id)); kotak.remove(); toast('Harga resmi dihapus'); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });
    kotak.append(el('div', { class: 'row', style: 'margin-top:8px' }, simpan, hapus));
    return kotak;
  };
  daftarResmi.append(...resmi.map(formResmi));
  const tambahResmi = el('button', { type: 'button', class: 'sec kecil', onclick: () => { const h = {}; resmi.push(h); daftarResmi.append(formResmi(h)); } }, '+ Tambah harga resmi');

  wadah.replaceChildren(
    el('section', { class: 'card' },
      el('div', { class: 'row', style: 'gap:14px' }, ikonBesar,
        el('div', {}, el('h2', {}, app.name), el('div', { class: 'muted' }, app.categories?.label ?? '',
          app.is_active ? ' · ' : ' · disembunyikan · ', el('a', { href: `/aplikasi/?app=${encodeURIComponent(app.slug)}`, target: '_blank', rel: 'noopener' }, 'lihat di web ↗')))),
      el('label', { class: 'f' }, 'Logo (PNG, JPG, WebP, atau SVG, maks. 1 MB; sebaiknya kotak)'),
      el('div', { class: 'row' }, fileLogo, app.logo_url ? hapusLogo : null),
      el('div', { class: 'row', style: 'margin-top:14px' }, unggul, el('label', { for: 'unggul' }, 'Tampilkan di "Pilihan untukmu" di beranda')),
      el('div', { class: 'grid2' },
        el('div', {}, el('label', { class: 'f' }, 'Deskripsi (tampil di katalog)'), desk),
        el('div', {}, el('label', { class: 'f' }, 'Deskripsi bahasa Inggris'), deskEn)),
      el('div', { class: 'row', style: 'margin-top:8px' }, simpanDesk)),
    el('section', { class: 'card' },
      el('h2', {}, 'Bandingkan dengan harga resmi'),
      el('p', { class: 'sub' }, 'Website membandingkan harga resmi dengan paket IXVII.CO termurah yang durasinya sama, lalu menampilkan persen hematnya.'),
      daftarResmi, el('div', { class: 'row', style: 'margin-top:10px' }, tambahResmi)),
    el('section', { class: 'card' },
      el('h2', {}, 'Tanya jawab (FAQ)'),
      el('p', { class: 'sub' }, 'Tampil di halaman aplikasi, di bawah tanya jawab otomatis (paket, harga termurah, cara pesan). Tulis jawaban sesuai aturan tokomu, misalnya soal garansi dan cara aktivasi.'),
      daftarFaq, el('div', { class: 'row', style: 'margin-top:10px' }, tambahFaq)));
}

// ---------------------------------------------------------------- 4. margin
async function margin() {
  const s = await q(supabase.from('pricing_settings').select('*').eq('id', 1).single());
  const pct = el('input', { type: 'number', min: '0', max: '90', step: '0.5', value: +(s.min_margin_pct * 100).toFixed(2) });
  const rpMin = el('input', { type: 'number', min: '0', step: '500', value: s.min_margin_rp });
  const fb = el('input', { type: 'number', min: '0', max: '50', step: '0.5', value: +(s.bundle_fallback_pct * 100).toFixed(2) });
  const contoh = el('p', { class: 'muted' });
  const hitung = () => {
    const p = Number(pct.value) / 100, r = Number(rpMin.value), hpp = 30000;
    const min = p < 1 ? Math.ceil(Math.max(hpp + r, hpp / (1 - p)) / 500) * 500 : null;
    contoh.textContent = min ? `Contoh: HPP Rp30.000 → harga setelah diskon bundle tidak boleh di bawah ${rp(min)}.` : '';
  };
  [pct, rpMin].forEach((i) => i.addEventListener('input', hitung));
  hitung();
  const simpan = el('button', { type: 'button' }, 'Simpan pengaturan');
  simpan.addEventListener('click', async () => {
    const p = Number(pct.value), r = Number(rpMin.value), f = Number(fb.value);
    if (!(p >= 0 && p < 90) || !(r >= 0) || !(f >= 0 && f <= 50)) return toast('Periksa lagi angkanya', true);
    try { await q(supabase.from('pricing_settings').update({ min_margin_pct: p / 100, min_margin_rp: Math.round(r), bundle_fallback_pct: f / 100 }).eq('id', 1)); toast('Pengaturan margin tersimpan'); }
    catch (err) { toast('Gagal: ' + err.message, true); }
  });
  halaman.replaceChildren(el('section', { class: 'card', style: 'max-width:640px' },
    el('h2', {}, 'Batas aman margin'),
    el('p', { class: 'sub' }, 'Dipakai Custom Bundling Builder (Tahap 7) supaya diskon tidak pernah membuat rugi. Ini keputusan bisnismu; angka awal 15% dan Rp2.000 hanya contoh.'),
    el('label', { class: 'f' }, 'Margin minimum (% dari harga jual)'), pct,
    el('label', { class: 'f' }, 'Untung minimum per varian (Rp)'), rpMin,
    contoh,
    el('label', { class: 'f' }, 'Diskon maksimal untuk varian yang belum punya HPP (%)'), fb,
    el('p', { class: 'muted' }, 'Biarkan 0 supaya varian tanpa HPP tidak ikut diskon bundle.'),
    el('div', { class: 'row', style: 'margin-top:10px' }, simpan)));
}

// ---------------------------------------------------------------- 5. riwayat
const NAMA_FIELD = { dibuat: 'Dibuat', harga: 'Harga', hpp: 'HPP', stok: 'Stok', tampil: 'Tampil', label: 'Nama varian' };
const nilaiField = (f, v) => (v == null ? '–' : (f === 'harga' || f === 'hpp' || f === 'dibuat') && /^\d+$/.test(v) ? rp(v)
  : f === 'tampil' ? (v === 'true' ? 'Ya' : 'Tidak') : f === 'stok' ? (v === 'habis' ? 'Habis' : 'Tersedia') : v);
const barisRiwayat = (h) => el('tr', {}, td(waktu(h.changed_at)), td(h.variants ? `${h.variants.code} · ${h.variants.label}` : '–'),
  td(NAMA_FIELD[h.field] || h.field), td(el('span', {}, el('span', { class: 'muted' }, nilaiField(h.field, h.old_value)), ' → ', el('b', {}, nilaiField(h.field, h.new_value)))));

async function riwayat() {
  const [batches, manual] = await Promise.all([
    q(supabase.from('import_batches').select('id,created_at,file_name,summary,status,rolled_back_at').order('created_at', { ascending: false }).limit(50)),
    q(supabase.from('price_history').select('field,old_value,new_value,changed_at,variants(code,label)').is('batch_id', null).order('changed_at', { ascending: false }).limit(50)),
  ]);
  const kartuBatch = (b) => {
    const s = b.summary || {};
    const isi = el('div', { class: 'muted' }, 'Klik untuk melihat rinciannya.');
    const det = el('details', { class: 'batch item-form' },
      el('summary', {}, el('b', {}, b.file_name || 'Tanpa nama'), ' · ', waktu(b.created_at), ' · ',
        `${s.berubah ?? 0} berubah, ${s.baru ?? 0} baru, ${s.sama ?? 0} sama`, ' ',
        el('span', { class: 'tag ' + (b.status === 'rolled_back' ? 'kuning' : 'hijau') }, b.status === 'rolled_back' ? 'dibatalkan' : 'diterapkan')),
      isi);
    let dimuat = false;
    det.addEventListener('toggle', async () => {
      if (!det.open || dimuat) return;
      dimuat = true;
      try {
        const rinci = await q(supabase.from('price_history').select('field,old_value,new_value,changed_at,variants(code,label)').eq('batch_id', b.id).order('id'));
        isi.replaceChildren(rinci.length ? tabel(['Waktu', 'Varian', 'Kolom', 'Lama → baru'], rinci.map(barisRiwayat)) : el('p', { class: 'muted' }, 'Tidak ada nilai yang berubah di unggahan ini.'));
        if (b.status === 'applied' && rinci.length) {
          const batal = el('button', { type: 'button', class: 'kecil bahaya' }, 'Batalkan unggahan ini');
          batal.addEventListener('click', async () => {
            if (!confirm('Kembalikan harga, HPP, dan stok ke sebelum unggahan ini?')) return;
            try { const h = await q(supabase.rpc('batalkan_impor', { p_batch_id: b.id })); toast(`Dikembalikan ${h.dikembalikan} nilai` + (h.konflik ? `, ${h.konflik} dilewati` : '')); rute(); }
            catch (err) { toast('Gagal: ' + err.message, true); }
          });
          isi.append(el('div', { class: 'row', style: 'margin-top:10px' }, batal));
        }
      } catch (err) { isi.replaceChildren(el('div', { class: 'msg err' }, err.message)); }
    });
    return det;
  };
  halaman.replaceChildren(
    el('section', { class: 'card' }, el('h2', {}, 'Riwayat impor Excel'),
      el('p', { class: 'sub' }, 'Setiap unggahan bisa dibatalkan. Nilai yang sudah diubah lagi oleh unggahan berikutnya tidak ditimpa.'),
      batches.length ? batches.map(kartuBatch) : el('p', { class: 'muted' }, 'Belum ada unggahan.')),
    el('section', { class: 'card' }, el('h2', {}, 'Perubahan stok manual'),
      el('p', { class: 'sub' }, '50 perubahan terakhir dari menu Stok.'),
      manual.length ? tabel(['Waktu', 'Varian', 'Kolom', 'Lama → baru'], manual.map(barisRiwayat)) : el('p', { class: 'muted' }, 'Belum ada.')));
}
