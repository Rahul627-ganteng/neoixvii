// Menu Mitra & profil: profil owner (halaman Tentang), daftar mitra resmi, dan tambah banyak mitra
// sekaligus dari teks yang dikirim mitra atau dari file Excel.
import { el, isian, q, tabel, td, toast } from './alat.js';
import { barisExcelKeMitra, bacaTeksMitra, cocokkan, keBaris } from './mitra-baca.js';

const AVATAR = '/assets/brand/avatar-anonim.svg';
const FOTO_OWNER = '/assets/owner/rahul-paris.webp';
const MAKS_FOTO = 2 * 1024 * 1024;
const SHEETJS = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
const JENIS = { reseller: 'Reseller', affiliator: 'Affiliator' };

export async function halamanMitra(supabase, halaman) {
  let profil, mitra;
  try {
    [profil, mitra] = await Promise.all([
      q(supabase.from('owner_profile').select('*').eq('id', 1).maybeSingle()),
      q(supabase.from('partners').select('*').order('sort').order('name')),
    ]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu ini butuh migration Tahap 9 (20261105000000_tahap9_profil_mitra.sql). Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  const ctx = { supabase, halaman, mitra, segarkan: () => halamanMitra(supabase, halaman) };
  halaman.replaceChildren(kartuProfil(ctx, profil ?? { id: 1 }), kartuDaftar(ctx), kartuTambahBanyak(ctx));
}

// ---------------------------------------------------------------- unggah foto
async function unggahFoto(supabase, file, awalan) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Foto harus JPG, PNG, atau WebP');
  if (file.size > MAKS_FOTO) throw new Error('Foto maksimal 2 MB');
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${awalan}-${Date.now()}.${ext}`;
  await q(supabase.storage.from('profiles').upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' }));
  return supabase.storage.from('profiles').getPublicUrl(path).data.publicUrl;
}

function pilihFoto(supabase, awalan, urlAwal, cadangan, saatBerubah) {
  let url = urlAwal || null;
  const img = el('img', { class: 'foto-pratinjau', alt: '' });
  const gambar = () => { img.src = url || cadangan; };
  gambar();
  const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Pilih foto' });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    try { url = await unggahFoto(supabase, f, awalan); gambar(); saatBerubah(url); toast('Foto terunggah. Klik Simpan untuk memakainya.'); }
    catch (err) { toast(err.message, true); }
    file.value = '';
  });
  const hapus = el('button', { type: 'button', class: 'sec kecil', onclick: () => { url = null; gambar(); saatBerubah(null); } },
    cadangan === AVATAR ? 'Pakai foto anonim' : 'Pakai foto bawaan');
  return el('div', { class: 'row', style: 'align-items:center;gap:12px' }, img, el('div', {}, file, el('div', { style: 'margin-top:6px' }, hapus)));
}

// ---------------------------------------------------------------- profil owner
function kartuProfil(ctx, p) {
  const { supabase } = ctx;
  let foto = p.photo_url || null;
  const f = (nilai, ph, area) => el(area ? 'textarea' : 'input', area ? { value: nilai || '', placeholder: ph, rows: 5 } : { type: 'text', value: nilai || '', placeholder: ph });
  const nama = f(p.name, 'Nama tampil'), lengkap = f(p.full_name, 'Nama lengkap');
  const peran = f(p.role, 'Peran'), peranEn = f(p.role_en, 'Role');
  const kota = f(p.city, 'Kota'), kotaEn = f(p.city_en, 'City');
  const kutipan = f(p.quote, 'Kutipan / slogan');
  const tentang = f(p.about, 'Tentang (pisahkan paragraf dengan baris kosong)', true), tentangEn = f(p.about_en, 'About', true);
  const minat = f((p.interests ?? []).join(', '), 'Dipisah koma'), minatEn = f((p.interests_en ?? []).join(', '), 'Comma separated');
  const sorotan = (Array.isArray(p.highlights) ? p.highlights : []).concat([{}, {}, {}]).slice(0, 3).map((s) => ({
    judul: f(s.title, 'Judul'), judulEn: f(s.title_en, 'Title'), isi: f(s.body, 'Penjelasan singkat'), isiEn: f(s.body_en, 'Short description'),
  }));
  const simpan = el('button', { type: 'button' }, 'Simpan profil');
  simpan.addEventListener('click', async () => {
    if (!nama.value.trim()) return toast('Nama tampil wajib diisi', true);
    const daftar = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
    const baris = {
      id: 1, name: nama.value.trim(), full_name: lengkap.value.trim() || null, role: peran.value.trim() || null, role_en: peranEn.value.trim() || null,
      city: kota.value.trim() || null, city_en: kotaEn.value.trim() || null, quote: kutipan.value.trim() || null,
      about: tentang.value.trim() || null, about_en: tentangEn.value.trim() || null,
      highlights: sorotan.filter((s) => s.judul.value.trim()).map((s) => ({
        title: s.judul.value.trim(), title_en: s.judulEn.value.trim() || null, body: s.isi.value.trim(), body_en: s.isiEn.value.trim() || null })),
      interests: daftar(minat.value), interests_en: daftar(minatEn.value), photo_url: foto, updated_at: new Date().toISOString(),
    };
    simpan.disabled = true;
    try { await q(supabase.from('owner_profile').upsert(baris)); toast('Profil tersimpan'); }
    catch (err) { toast('Gagal: ' + err.message, true); }
    finally { simpan.disabled = false; }
  });
  return el('section', { class: 'card' },
    el('h2', {}, 'Profil owner (halaman Tentang)'),
    el('p', { class: 'sub' }, el('a', { href: '/tentang/', target: '_blank', rel: 'noopener' }, 'Lihat halaman Tentang ↗')),
    el('label', { class: 'f' }, 'Foto (JPG/PNG/WebP maks. 2 MB, sebaiknya potret 4:5)'),
    pilihFoto(supabase, 'owner', foto, FOTO_OWNER, (u) => { foto = u; }),
    el('div', { class: 'grid2' }, isian('Nama tampil', nama), isian('Nama lengkap', lengkap)),
    el('div', { class: 'grid2' }, isian('Peran', peran), isian('Peran (Inggris)', peranEn), isian('Kota', kota), isian('Kota (Inggris)', kotaEn)),
    isian('Kutipan', kutipan),
    el('div', { class: 'grid2' }, isian('Tentang', tentang), isian('Tentang (Inggris)', tentangEn)),
    el('label', { class: 'f' }, 'Fokus (3 kartu)'),
    sorotan.map((s, i) => el('div', { class: 'item-form' }, el('b', {}, `Kartu ${i + 1}`),
      el('div', { class: 'grid2' }, isian('Judul', s.judul), isian('Judul (Inggris)', s.judulEn), isian('Isi', s.isi), isian('Isi (Inggris)', s.isiEn)))),
    el('div', { class: 'grid2' }, isian('Di luar kerja', minat), isian('Di luar kerja (Inggris)', minatEn)),
    el('div', { class: 'row', style: 'margin-top:12px' }, simpan));
}

// ---------------------------------------------------------------- daftar mitra
function kartuDaftar(ctx) {
  const { supabase, mitra } = ctx;
  const cari = el('input', { type: 'search', placeholder: 'Cari nama, kota, atau kode…', 'aria-label': 'Cari mitra' });
  const daftar = el('div');
  const editor = el('div');

  const gambar = () => {
    const kata = cari.value.trim().toLowerCase();
    const cocok = mitra.filter((m) => !kata || `${m.name} ${m.city ?? ''} ${m.referral_code}`.toLowerCase().includes(kata));
    daftar.replaceChildren(cocok.length ? tabel(['', 'Nama', 'Jenis', 'Kota', 'Kode', 'Status', ''], cocok.map((m) => el('tr', {},
      td(el('img', { class: 'avatar-kecil', src: m.photo_url || AVATAR, alt: '' })),
      td(el('b', {}, m.name)), td(JENIS[m.kind]), td(m.city || '–'), td(m.referral_code),
      td(el('div', { class: 'row', style: 'gap:4px' },
        el('span', { class: 'tag ' + (m.is_active ? 'hijau' : '') }, m.is_active ? 'aktif' : 'nonaktif'),
        m.is_verified ? el('span', { class: 'tag biru' }, 'terverifikasi') : null,
        m.show_contact ? el('span', { class: 'tag' }, 'kontak tampil') : null)),
      td(el('button', { type: 'button', class: 'sec kecil', onclick: () => buka(m) }, 'Ubah')))))
      : el('p', { class: 'muted' }, mitra.length ? 'Tidak ada yang cocok.' : 'Belum ada mitra. Tambahkan satu per satu, tempel teks dari mitra, atau impor Excel di bawah.'));
  };
  cari.addEventListener('input', gambar);

  function buka(m) {
    let foto = m.photo_url || null;
    const nama = el('input', { type: 'text', value: m.name || '', maxlength: 80 });
    const jenis = el('select', {}, Object.entries(JENIS).map(([k, l]) => el('option', { value: k, selected: (m.kind || 'reseller') === k }, l)));
    const kota = el('input', { type: 'text', value: m.city || '' });
    const wa = el('input', { type: 'tel', value: m.whatsapp || '', placeholder: '0812… atau 62812…' });
    const ig = el('input', { type: 'text', value: m.instagram || '', placeholder: 'username, tanpa @' });
    const kode = el('input', { type: 'text', value: m.referral_code || '', placeholder: 'Kosongkan untuk dibuat otomatis' });
    const bio = el('textarea', { value: m.bio || '', maxlength: 200, rows: 2, placeholder: 'Opsional, maks. 200 huruf' });
    const sejak = el('input', { type: 'date', value: m.joined_on || '' });
    const catatan = el('input', { type: 'text', value: m.admin_note || '', placeholder: 'Hanya terlihat admin' });
    const cek = (id, label, nilai) => { const c = el('input', { type: 'checkbox', id }); c.checked = nilai; return [c, el('label', { class: 'row', style: 'gap:6px' }, c, label)]; };
    const [aktif, lAktif] = cek('mAktif', 'Aktif (tampil di halaman Mitra)', m.is_active !== false);
    const [verif, lVerif] = cek('mVerif', 'Terverifikasi', m.is_verified !== false);
    const [kontak, lKontak] = cek('mKontak', 'Tampilkan WA & Instagram (hanya dengan izin mitra)', !!m.show_contact);
    const simpan = el('button', { type: 'button' }, 'Simpan mitra');
    simpan.addEventListener('click', async () => {
      if (nama.value.trim().length < 2) return toast('Nama minimal 2 huruf', true);
      const baris = {
        name: nama.value, kind: jenis.value, city: kota.value || null, whatsapp: wa.value || null, instagram: ig.value || null,
        referral_code: kode.value || null, bio: bio.value || null, joined_on: sejak.value || null, admin_note: catatan.value.trim() || null,
        is_active: aktif.checked, is_verified: verif.checked, show_contact: kontak.checked, photo_url: foto,
      };
      simpan.disabled = true;
      try {
        if (m.id) await q(supabase.from('partners').update(baris).eq('id', m.id));
        else await q(supabase.from('partners').insert(baris));
        toast('Mitra tersimpan'); ctx.segarkan();
      } catch (err) {
        toast(/duplicate|unique/i.test(err.message) ? 'Kode referral sudah dipakai mitra lain' : 'Gagal: ' + err.message, true);
        simpan.disabled = false;
      }
    });
    const hapus = el('button', { type: 'button', class: 'bahaya' }, 'Hapus mitra');
    hapus.addEventListener('click', async () => {
      if (!confirm(`Hapus ${m.name} dari daftar mitra? Kalau hanya berhenti sementara, cukup hilangkan centang Aktif.`)) return;
      try { await q(supabase.from('partners').delete().eq('id', m.id)); toast('Mitra dihapus'); ctx.segarkan(); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });
    editor.replaceChildren(el('div', { class: 'item-form' },
      el('h3', { style: 'margin:0' }, m.id ? `Ubah: ${m.name}` : 'Mitra baru'),
      el('label', { class: 'f' }, 'Foto (opsional; tanpa foto memakai avatar anonim)'),
      pilihFoto(supabase, `mitra-${m.id ?? 'baru'}`, foto, AVATAR, (u) => { foto = u; }),
      el('div', { class: 'grid2' }, isian('Nama', nama), isian('Jenis', jenis), isian('Kota', kota), isian('Kode referral', kode),
        isian('Nomor WhatsApp', wa), isian('Instagram', ig), isian('Mitra sejak', sejak), isian('Catatan admin', catatan)),
      isian('Bio singkat', bio),
      el('div', { style: 'display:grid;gap:6px;margin-top:10px' }, lAktif, lVerif, lKontak),
      el('div', { class: 'row', style: 'margin-top:12px' }, simpan, m.id ? hapus : null,
        el('button', { type: 'button', class: 'sec', onclick: () => editor.replaceChildren() }, 'Tutup'))));
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  gambar();
  return el('section', { class: 'card' },
    el('h2', {}, `Mitra resmi (${mitra.length})`),
    el('p', { class: 'sub' }, 'Reseller & affiliator di halaman Mitra. Nomor WA dan Instagram baru tampil kalau "Tampilkan kontak" dicentang. ',
      el('a', { href: '/mitra/', target: '_blank', rel: 'noopener' }, 'Lihat halaman Mitra ↗')),
    el('div', { class: 'row' }, el('div', { style: 'flex:1 1 240px' }, cari), el('button', { type: 'button', class: 'sec kecil', onclick: () => buka({}) }, '+ Mitra baru')),
    el('div', { style: 'margin-top:10px' }, daftar), editor);
}

// ---------------------------------------------------------------- tambah banyak: tempel teks / Excel
function kartuTambahBanyak(ctx) {
  const { supabase, mitra } = ctx;
  const pratinjau = el('div');
  let calon = [];

  function tampilkanPratinjau(baru) {
    calon = cocokkan(baru, mitra);
    if (!calon.length) { pratinjau.replaceChildren(el('div', { class: 'msg warn' }, 'Tidak ada data mitra yang terbaca. Pastikan ada baris seperti "Nama: …" atau judul kolom "Nama" di Excel.')); return; }
    const bisa = calon.filter((m) => m.nama.length >= 2);
    const simpan = el('button', { type: 'button' }, `Simpan ${bisa.length} mitra`);
    simpan.addEventListener('click', async () => {
      simpan.disabled = true;
      try {
        const baruSaja = bisa.filter((m) => !m.lama).map((m) => keBaris(m, { baru: true }));
        if (baruSaja.length) await q(supabase.from('partners').insert(baruSaja));
        for (const m of bisa.filter((x) => x.lama)) await q(supabase.from('partners').update(keBaris(m, { baru: false })).eq('id', m.lama.id));
        toast(`${bisa.length} mitra tersimpan`); ctx.segarkan();
      } catch (err) {
        toast(/duplicate|unique/i.test(err.message) ? 'Ada kode referral yang sudah dipakai mitra lain' : 'Gagal: ' + err.message, true);
        simpan.disabled = false;
      }
    });
    pratinjau.replaceChildren(
      tabel(['Status', 'Nama', 'Jenis', 'Kota', 'WA', 'Instagram', 'Kode', 'Kontak tampil', 'Catatan'], calon.map((m) => el('tr', {},
        td(m.nama.length < 2 ? el('span', { class: 'tag merah' }, 'dilewati') : m.lama ? el('span', { class: 'tag kuning' }, `ubah ${m.lama.name}`) : el('span', { class: 'tag hijau' }, 'baru')),
        td(m.nama || '–'), td(JENIS[m.jenis]), td(m.kota || '–'), td(m.wa || '–'), td(m.ig ? '@' + m.ig : '–'), td(m.kode || 'otomatis'),
        td(m.kontak == null ? (m.lama ? 'tetap' : 'tidak') : m.kontak ? 'ya' : 'tidak'), td(m.catatan.join('; ') || '–')))),
      el('p', { class: 'muted' }, 'Mitra yang cocok (kode referral sama, atau nama + jenis sama) akan diperbarui; kolom yang kosong tidak menghapus data lama.'),
      el('div', { class: 'row', style: 'margin-top:8px' }, simpan));
  }

  // tempel teks
  const teks = el('textarea', { rows: 9, placeholder: 'Tempel pesan dari mitra, misalnya:\n\nNama: Budi Santoso\nDaftar sebagai: Reseller\nKota: Malang\nNo WA: 0812xxxxxxx\nInstagram: @budisantoso\nTampilkan kontak: ya\n\nBeberapa mitra boleh ditempel sekaligus.' });
  const baca = el('button', { type: 'button', class: 'sec kecil', onclick: () => tampilkanPratinjau(bacaTeksMitra(teks.value)) }, 'Baca teks');

  // Excel
  const file = el('input', { type: 'file', accept: '.xlsx,.xls,.csv', 'aria-label': 'Pilih file Excel mitra' });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    try {
      const XLSX = await import(SHEETJS);
      const wb = XLSX.read(await f.arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames.find((n) => /mitra/i.test(n)) ?? wb.SheetNames[0]];
      tampilkanPratinjau(barisExcelKeMitra(XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })));
    } catch (err) { toast('Gagal membaca file: ' + err.message, true); }
    file.value = '';
  });
  const template = el('button', { type: 'button', class: 'sec kecil' }, 'Unduh template Excel');
  template.addEventListener('click', async () => {
    try {
      const XLSX = await import(SHEETJS);
      const wb = XLSX.utils.book_new();
      const judul = ['Nama', 'Jenis', 'Kota', 'WhatsApp', 'Instagram', 'Kode Referral', 'Tampilkan Kontak', 'Bio', 'Aktif'];
      const data = XLSX.utils.aoa_to_sheet([judul, ...mitra.map((m) => [m.name, JENIS[m.kind], m.city ?? '', m.whatsapp ?? '', m.instagram ?? '',
        m.referral_code, m.show_contact ? 'Ya' : 'Tidak', m.bio ?? '', m.is_active ? 'Ya' : 'Tidak'])]);
      data['!cols'] = [22, 12, 16, 16, 18, 14, 16, 36, 8].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, data, 'Mitra');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Petunjuk'],
        ['Satu baris = satu mitra. Jenis: Reseller atau Affiliator.'],
        ['Kode Referral boleh dikosongkan, nanti dibuat otomatis.'],
        ['Tampilkan Kontak: Ya hanya kalau mitra mengizinkan nomor WA & Instagram tampil di website.'],
        ['Mitra yang kode referral-nya sama (atau nama + jenis sama) akan diperbarui, bukan dibuat dobel.'],
      ]), 'Petunjuk');
      XLSX.writeFile(wb, `Mitra_IXVII_${new Date().toLocaleDateString('sv-SE')}.xlsx`);
    } catch (err) { toast('Gagal membuat template: ' + err.message, true); }
  });

  return el('section', { class: 'card' },
    el('h2', {}, 'Tambah banyak mitra sekaligus'),
    el('p', { class: 'sub' }, 'Pilih salah satu: tempel teks yang dikirim mitra lewat WhatsApp, atau isi template Excel lalu unggah. Data dicek dulu di pratinjau sebelum disimpan.'),
    el('div', { class: 'grid2' },
      el('div', {}, el('label', { class: 'f' }, 'Tempel teks dari mitra'), teks, el('div', { class: 'row', style: 'margin-top:8px' }, baca)),
      el('div', {}, el('label', { class: 'f' }, 'Impor Excel'),
        el('p', { class: 'muted', style: 'margin:0 0 8px' }, 'Template berisi semua mitra yang sudah ada, jadi bisa dipakai untuk mengubah data sekaligus.'),
        el('div', { class: 'row' }, template), el('div', { style: 'margin-top:10px' }, file))),
    el('div', { style: 'margin-top:12px' }, pratinjau));
}
