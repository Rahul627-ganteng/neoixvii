// Menu Film: info film & serial yang diisi admin (judul, platform, tanggal tayang, sinopsis, poster).
import { el, hariIni, isian, q, tabel, td, toast } from './alat.js';

const MAKS_POSTER = 2 * 1024 * 1024;
const STATUS = {
  sedang: { label: 'Sedang tayang', kelas: 'hijau' },
  akan: { label: 'Akan tayang', kelas: 'biru' },
  selesai: { label: 'Selesai', kelas: '' },
};
let saringan = 'tampil';

/** Sama dengan status_film() di database. */
export function statusFilm(f, hari = hariIni()) {
  if (f.release_on > hari) return 'akan';
  if (f.ends_on && f.ends_on < hari) return 'selesai';
  return 'sedang';
}
const tgl = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');

export async function halamanFilm(supabase, halaman) {
  let film, apps;
  try {
    [film, apps] = await Promise.all([
      q(supabase.from('films').select('*').order('release_on', { ascending: false })),
      q(supabase.from('apps').select('id,name,slug,is_active').order('name')),
    ]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Film butuh migration Tahap 10 (20261106000000_tahap10_film.sql). Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  const namaApp = new Map(apps.map((a) => [a.id, a.name]));
  const tab = el('div', { class: 'row tab', role: 'group', 'aria-label': 'Saring film' });
  const daftar = el('div');
  const editor = el('div');
  const segarkan = () => halamanFilm(supabase, halaman);

  const SARING = [
    ['tampil', 'Tampil di website', (f) => f.is_active && statusFilm(f) !== 'selesai'],
    ['akan', 'Akan tayang', (f) => statusFilm(f) === 'akan'],
    ['selesai', 'Selesai', (f) => statusFilm(f) === 'selesai'],
    ['sembunyi', 'Disembunyikan', (f) => !f.is_active],
    ['semua', 'Semua', () => true],
  ];
  function gambar() {
    tab.replaceChildren(...SARING.map(([k, l, c]) => el('button', {
      type: 'button', class: 'kecil ' + (k === saringan ? '' : 'sec'), 'aria-pressed': String(k === saringan),
      onclick: () => { saringan = k; gambar(); },
    }, `${l} (${film.filter(c).length})`)));
    const cocok = film.filter(SARING.find(([k]) => k === saringan)[2]);
    daftar.replaceChildren(cocok.length ? tabel(['', 'Judul', 'Platform', 'Tayang', 'Status', ''], cocok.map((f) => {
      const s = STATUS[statusFilm(f)];
      return el('tr', {},
        td(f.poster_url ? el('img', { class: 'poster-kecil', src: f.poster_url, alt: '' }) : el('div', { class: 'poster-kecil kosong' }, 'IX')),
        td(el('span', {}, el('b', {}, f.title), el('br'), el('span', { class: 'muted' }, f.kind === 'serial' ? 'Serial' : 'Film', f.genre ? ` · ${f.genre}` : ''))),
        td(namaApp.get(f.app_id) ?? '–'), td(`${tgl(f.release_on)}${f.ends_on ? ' – ' + tgl(f.ends_on) : ''}`),
        td(el('div', { class: 'row', style: 'gap:4px' }, el('span', { class: 'tag ' + s.kelas }, s.label), f.is_active ? null : el('span', { class: 'tag' }, 'disembunyikan'))),
        td(el('button', { type: 'button', class: 'sec kecil', onclick: () => buka(f) }, 'Ubah')));
    })) : el('p', { class: 'muted' }, film.length ? 'Tidak ada film di sini.' : 'Belum ada film. Klik "+ Film baru" untuk menambahkan.'));
  }

  function buka(f) {
    let poster = f.poster_url || null;
    const judul = el('input', { type: 'text', value: f.title || '', maxlength: 120 });
    const jenis = el('select', {}, [['film', 'Film'], ['serial', 'Serial']].map(([k, l]) => el('option', { value: k, selected: (f.kind || 'film') === k }, l)));
    const platform = el('select', {}, el('option', { value: '' }, '— pilih aplikasi —'),
      apps.map((a) => el('option', { value: a.id, selected: f.app_id === a.id }, a.name + (a.is_active ? '' : ' (disembunyikan)'))));
    const rilis = el('input', { type: 'date', value: f.release_on || hariIni() });
    const akhir = el('input', { type: 'date', value: f.ends_on || '' });
    const genre = el('input', { type: 'text', value: f.genre || '', placeholder: 'mis. Drama, Misteri' });
    const hitung = (box, out) => () => { out.textContent = `${box.value.length}/500`; };
    const sinopsis = el('textarea', { rows: 4, maxlength: 500, value: f.synopsis || '', placeholder: 'Tulis dengan kata-katamu sendiri, 2–3 kalimat.' });
    const sinopsisEn = el('textarea', { rows: 4, maxlength: 500, value: f.synopsis_en || '', placeholder: 'Opsional' });
    const n1 = el('small', { class: 'muted' }), n2 = el('small', { class: 'muted' });
    sinopsis.addEventListener('input', hitung(sinopsis, n1)); sinopsisEn.addEventListener('input', hitung(sinopsisEn, n2));
    hitung(sinopsis, n1)(); hitung(sinopsisEn, n2)();
    const trailer = el('input', { type: 'url', value: f.trailer_url || '', placeholder: 'https://www.youtube.com/watch?v=…' });
    const aktif = el('input', { type: 'checkbox', id: 'filmAktif' });
    aktif.checked = f.is_active !== false;

    const pratinjau = el('div', { class: 'poster-pratinjau' });
    const gambarPoster = () => pratinjau.replaceChildren(poster ? el('img', { src: poster, alt: '' }) : el('span', { class: 'muted' }, 'Tanpa gambar: memakai sampul bergaya IXVII.CO'));
    gambarPoster();
    const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Pilih gambar' });
    file.addEventListener('change', async () => {
      const berkas = file.files[0];
      if (!berkas) return;
      try {
        if (!/^image\/(png|jpeg|webp)$/.test(berkas.type)) throw new Error('Gambar harus JPG, PNG, atau WebP');
        if (berkas.size > MAKS_POSTER) throw new Error('Gambar maksimal 2 MB');
        const path = `film-${Date.now()}.${berkas.type.split('/')[1].replace('jpeg', 'jpg')}`;
        await q(supabase.storage.from('posters').upload(path, berkas, { upsert: true, contentType: berkas.type, cacheControl: '3600' }));
        poster = supabase.storage.from('posters').getPublicUrl(path).data.publicUrl;
        gambarPoster(); toast('Gambar terunggah. Klik Simpan untuk memakainya.');
      } catch (err) { toast(err.message, true); }
      file.value = '';
    });

    const simpan = el('button', { type: 'button' }, 'Simpan film');
    simpan.addEventListener('click', async () => {
      if (!judul.value.trim()) return toast('Judul wajib diisi', true);
      if (!rilis.value) return toast('Tanggal tayang wajib diisi', true);
      if (akhir.value && akhir.value < rilis.value) return toast('Tanggal berakhir sebelum tanggal tayang', true);
      if (trailer.value.trim() && !/^https:\/\//.test(trailer.value.trim())) return toast('Link trailer harus diawali https://', true);
      if (!platform.value && !confirm('Belum memilih platform, jadi tombol "Langganan …" tidak muncul. Tetap simpan?')) return;
      const baris = {
        title: judul.value.trim(), kind: jenis.value, app_id: platform.value ? Number(platform.value) : null,
        release_on: rilis.value, ends_on: akhir.value || null, genre: genre.value.trim() || null,
        synopsis: sinopsis.value.trim() || null, synopsis_en: sinopsisEn.value.trim() || null,
        trailer_url: trailer.value.trim() || null, poster_url: poster, is_active: aktif.checked, updated_at: new Date().toISOString(),
      };
      simpan.disabled = true;
      try {
        if (f.id) await q(supabase.from('films').update(baris).eq('id', f.id));
        else await q(supabase.from('films').insert(baris));
        toast('Film tersimpan'); segarkan();
      } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
    });
    const hapus = el('button', { type: 'button', class: 'bahaya' }, 'Hapus film');
    hapus.addEventListener('click', async () => {
      if (!confirm(`Hapus "${f.title}"? Kalau hanya ingin menyembunyikan, hilangkan centang Tampilkan.`)) return;
      try { await q(supabase.from('films').delete().eq('id', f.id)); toast('Film dihapus'); segarkan(); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });

    editor.replaceChildren(el('div', { class: 'item-form' },
      el('h3', { style: 'margin:0' }, f.id ? `Ubah: ${f.title}` : 'Film baru'),
      el('div', { class: 'grid2' }, isian('Judul', judul), isian('Jenis', jenis), isian('Platform (aplikasi di katalog)', platform), isian('Genre (opsional)', genre),
        isian('Tanggal tayang', rilis), isian('Tanggal berakhir (opsional)', akhir, 'Setelah tanggal ini film tidak tampil lagi.')),
      el('div', { class: 'grid2' }, el('div', {}, isian('Sinopsis', sinopsis), n1), el('div', {}, isian('Sinopsis bahasa Inggris', sinopsisEn), n2)),
      isian('Link trailer (opsional)', trailer),
      el('label', { class: 'f' }, 'Gambar (opsional, JPG/PNG/WebP maks. 2 MB; gambar mendatar 16:10 paling pas)'),
      pratinjau,
      el('div', { class: 'row', style: 'margin-top:6px' }, file, poster ? el('button', { type: 'button', class: 'sec kecil', onclick: () => { poster = null; gambarPoster(); } }, 'Pakai sampul bawaan') : null),
      el('p', { class: 'muted' }, 'Pakai gambar yang boleh kamu pakai, misalnya materi promosi resmi dari platform atau desainmu sendiri. Tulis sinopsis dengan kata-katamu sendiri, jangan menyalin dari situs lain.'),
      el('div', { class: 'row', style: 'margin-top:10px' }, aktif, el('label', { for: 'filmAktif' }, 'Tampilkan di website')),
      el('div', { class: 'row', style: 'margin-top:12px' }, simpan, f.id ? hapus : null,
        el('button', { type: 'button', class: 'sec', onclick: () => editor.replaceChildren() }, 'Tutup'))));
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  gambar();
  halaman.replaceChildren(el('section', { class: 'card' },
    el('h2', {}, 'Info film & serial'),
    el('p', { class: 'sub' }, 'Tampil di halaman Info Film, beranda, dan halaman aplikasi platformnya. Status berganti sendiri menurut tanggal: Akan tayang → Sedang tayang → Selesai (tidak tampil). ',
      el('a', { href: '/film/', target: '_blank', rel: 'noopener' }, 'Lihat halaman Info Film ↗')),
    el('div', { class: 'row' }, tab, el('button', { type: 'button', class: 'sec kecil', onclick: () => buka({}) }, '+ Film baru')),
    el('div', { style: 'margin-top:10px' }, daftar), editor));
}
