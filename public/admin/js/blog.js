// Menu Blog: tulis berita aplikasi (judul, ringkasan, isi, sampul, aplikasi terkait), simpan sebagai draf atau terbitkan.
import { el, isian, q, toast, waktu } from './alat.js';
import { tampilkanTeks } from '/js/teks.js';

const MAKS_SAMPUL = 2 * 1024 * 1024;
let saringan = 'semua';

/** "Netflix Naik Harga!" → "netflix-naik-harga" */
export function buatSlug(teks) {
  return String(teks ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
}
const keLokal = (d) => { const x = new Date(d || Date.now()); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

export async function halamanBlog(supabase, halaman) {
  let posts, apps;
  try {
    [posts, apps] = await Promise.all([
      q(supabase.from('posts').select('*').order('published_at', { ascending: false }).limit(300)),
      q(supabase.from('apps').select('id,name').order('name')),
    ]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Blog butuh migration 20261112000000_revisi_blog_qris.sql. Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  const namaApp = new Map(apps.map((a) => [a.id, a.name]));
  const segarkan = () => halamanBlog(supabase, halaman);
  const daftar = el('div');
  const editor = el('div');
  const tab = el('div', { class: 'row tab', role: 'group', 'aria-label': 'Saring berita' });
  const sekarang = Date.now();
  const SARING = [
    ['semua', 'Semua', () => true],
    ['terbit', 'Terbit', (p) => p.is_published && Date.parse(p.published_at) <= sekarang],
    ['jadwal', 'Terjadwal', (p) => p.is_published && Date.parse(p.published_at) > sekarang],
    ['draf', 'Draf', (p) => !p.is_published],
  ];
  const status = (p) => (!p.is_published ? ['Draf', 'kuning'] : Date.parse(p.published_at) > sekarang ? ['Terjadwal', 'biru'] : ['Terbit', 'hijau']);

  function gambar() {
    tab.replaceChildren(...SARING.map(([k, l, c]) => el('button', {
      type: 'button', class: 'kecil ' + (k === saringan ? '' : 'sec'), 'aria-pressed': String(k === saringan), onclick: () => { saringan = k; gambar(); },
    }, `${l} (${posts.filter(c).length})`)));
    const cocok = posts.filter(SARING.find(([k]) => k === saringan)[2]);
    daftar.replaceChildren(...(cocok.length ? cocok.map((p) => {
      const [label, kelas] = status(p);
      return el('article', { class: 'item-form baris-berita' },
        p.cover_url ? el('img', { class: 'sampul-kecil', src: p.cover_url, alt: '' }) : el('div', { class: 'sampul-kecil kosong' }, 'IX'),
        el('div', { style: 'min-width:0;flex:1' },
          el('b', {}, p.title), el('div', { class: 'muted' }, `${namaApp.get(p.app_id) ?? 'Umum'} · ${waktu(p.published_at)}`),
          el('div', { class: 'row', style: 'gap:4px;margin-top:4px' }, el('span', { class: 'tag ' + kelas }, label))),
        el('div', { class: 'row' },
          p.is_published ? el('a', { class: 'btn sec kecil', href: `/blog/baca/?p=${encodeURIComponent(p.slug)}`, target: '_blank', rel: 'noopener' }, 'Lihat ↗') : null,
          el('button', { type: 'button', class: 'sec kecil', onclick: () => buka(p) }, 'Ubah')));
    }) : [el('p', { class: 'muted' }, posts.length ? 'Tidak ada berita di sini.' : 'Belum ada berita. Klik "+ Berita baru".')]));
  }

  function buka(p) {
    let sampul = p.cover_url || null;
    let slugManual = !!p.id;
    const judul = el('input', { type: 'text', value: p.title || '', maxlength: 140, placeholder: 'mis. Netflix menaikkan harga paket di Indonesia' });
    const slug = el('input', { type: 'text', value: p.slug || '', maxlength: 80, placeholder: 'otomatis dari judul' });
    judul.addEventListener('input', () => { if (!slugManual) slug.value = buatSlug(judul.value); });
    slug.addEventListener('input', () => { slugManual = true; });
    const app = el('select', {}, el('option', { value: '' }, '— umum (tidak terkait aplikasi) —'),
      apps.map((a) => el('option', { value: a.id, selected: p.app_id === a.id }, a.name)));
    const ringkas = el('textarea', { rows: 2, maxlength: 300, value: p.excerpt || '', placeholder: '1–2 kalimat yang tampil di kartu berita' });
    const badan = el('textarea', { rows: 14, maxlength: 40000, value: p.body || '', placeholder: 'Tulis dengan kata-katamu sendiri.\n\n## Subjudul\n\nParagraf…\n\n- poin\n- poin' });
    const pratinjau = el('article', { class: 'pratinjau-kebijakan' });
    const segarPratinjau = () => pratinjau.replaceChildren(...tampilkanTeks(badan.value));
    badan.addEventListener('input', segarPratinjau); segarPratinjau();
    const sumber = el('input', { type: 'url', value: p.source_url || '', placeholder: 'https://… (opsional)' });
    const judulEn = el('input', { type: 'text', value: p.title_en || '', maxlength: 140 });
    const ringkasEn = el('textarea', { rows: 2, maxlength: 300, value: p.excerpt_en || '' });
    const badanEn = el('textarea', { rows: 8, maxlength: 40000, value: p.body_en || '' });
    const terbit = el('input', { type: 'checkbox', id: 'beritaTerbit' });
    terbit.checked = !!p.is_published;
    const tanggal = el('input', { type: 'datetime-local', value: keLokal(p.published_at) });

    const kotakSampul = el('div', { class: 'poster-pratinjau' });
    const gambarSampul = () => kotakSampul.replaceChildren(sampul ? el('img', { src: sampul, alt: '' }) : el('span', { class: 'muted' }, 'Tanpa gambar: memakai sampul bergaya IXVII.CO'));
    gambarSampul();
    const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Pilih gambar sampul' });
    file.addEventListener('change', async () => {
      const b = file.files[0];
      if (!b) return;
      try {
        if (!/^image\/(png|jpeg|webp)$/.test(b.type)) throw new Error('Gambar harus JPG, PNG, atau WebP');
        if (b.size > MAKS_SAMPUL) throw new Error('Gambar maksimal 2 MB');
        const path = `berita-${Date.now()}.${b.type.split('/')[1].replace('jpeg', 'jpg')}`;
        await q(supabase.storage.from('blog').upload(path, b, { upsert: true, contentType: b.type, cacheControl: '3600' }));
        sampul = supabase.storage.from('blog').getPublicUrl(path).data.publicUrl;
        gambarSampul(); toast('Gambar terunggah. Klik Simpan untuk memakainya.');
      } catch (err) { toast(err.message, true); }
      file.value = '';
    });

    const simpan = el('button', { type: 'button' }, p.id ? 'Simpan berita' : 'Simpan');
    simpan.addEventListener('click', async () => {
      const s = buatSlug(slug.value || judul.value);
      if (judul.value.trim().length < 3) return toast('Judul minimal 3 huruf', true);
      if (s.length < 3) return toast('Alamat (slug) minimal 3 huruf', true);
      if (sumber.value.trim() && !/^https:\/\//.test(sumber.value.trim())) return toast('Link sumber harus diawali https://', true);
      const baris = {
        title: judul.value.trim(), slug: s, app_id: app.value ? Number(app.value) : null, excerpt: ringkas.value.trim() || null,
        body: badan.value.trim(), source_url: sumber.value.trim() || null, cover_url: sampul,
        title_en: judulEn.value.trim() || null, excerpt_en: ringkasEn.value.trim() || null, body_en: badanEn.value.trim() || null,
        is_published: terbit.checked, published_at: new Date(tanggal.value || Date.now()).toISOString(), updated_at: new Date().toISOString(),
      };
      simpan.disabled = true;
      try {
        if (p.id) await q(supabase.from('posts').update(baris).eq('id', p.id));
        else await q(supabase.from('posts').insert(baris));
        toast(baris.is_published ? 'Berita diterbitkan' : 'Draf tersimpan'); segarkan();
      } catch (err) {
        toast(/duplicate|unique/i.test(err.message) ? 'Alamat (slug) itu sudah dipakai berita lain. Ubah sedikit.' : 'Gagal: ' + err.message, true);
        simpan.disabled = false;
      }
    });
    const hapus = p.id ? el('button', { type: 'button', class: 'bahaya' }, 'Hapus berita') : null;
    hapus?.addEventListener('click', async () => {
      if (!confirm(`Hapus "${p.title}"? Kalau hanya ingin menyembunyikan, hilangkan centang Terbitkan.`)) return;
      try { await q(supabase.from('posts').delete().eq('id', p.id)); toast('Berita dihapus'); segarkan(); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });

    editor.replaceChildren(el('div', { class: 'item-form' },
      el('h3', { style: 'margin:0' }, p.id ? `Ubah: ${p.title}` : 'Berita baru'),
      el('div', { class: 'grid2' }, isian('Judul', judul), isian('Alamat (slug)', slug, 'Muncul di link: /blog/baca/?p=…'),
        isian('Aplikasi terkait', app, 'Berita tampil juga di halaman aplikasi ini.'), isian('Link sumber (opsional)', sumber)),
      isian('Ringkasan', ringkas),
      isian('Isi berita', badan, 'Format: "## Subjudul", baris kosong untuk paragraf baru, "- " untuk daftar, **tebal**, [teks](https://…).'),
      el('details', { class: 'item-form' }, el('summary', {}, el('b', {}, 'Pratinjau')), pratinjau),
      el('label', { class: 'f' }, 'Gambar sampul (opsional, JPG/PNG/WebP maks. 2 MB; mendatar 16:9 paling pas)'), kotakSampul,
      el('div', { class: 'row', style: 'margin-top:6px' }, file, sampul ? el('button', { type: 'button', class: 'sec kecil', onclick: () => { sampul = null; gambarSampul(); } }, 'Pakai sampul bawaan') : null),
      el('details', { class: 'item-form' }, el('summary', {}, el('b', {}, 'Versi bahasa Inggris (opsional)')),
        isian('Judul bahasa Inggris', judulEn), isian('Ringkasan bahasa Inggris', ringkasEn), isian('Isi bahasa Inggris', badanEn)),
      el('p', { class: 'muted' }, 'Tulis dengan kata-katamu sendiri dan cantumkan link sumber. Pakai gambar milikmu atau materi promosi resmi.'),
      el('div', { class: 'grid2' }, el('div', { class: 'row', style: 'align-self:end' }, terbit, el('label', { for: 'beritaTerbit' }, 'Terbitkan di website')),
        isian('Tanggal terbit', tanggal, 'Isi tanggal nanti untuk menjadwalkan.')),
      el('div', { class: 'row', style: 'margin-top:12px' }, simpan, el('button', { type: 'button', class: 'sec', onclick: () => editor.replaceChildren() }, 'Tutup'), hapus)));
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  gambar();
  halaman.replaceChildren(el('section', { class: 'card' },
    el('h2', {}, 'Blog berita aplikasi'),
    el('p', { class: 'sub' }, 'Berita tampil di halaman Blog dan di halaman aplikasi terkait. ', el('a', { href: '/blog/', target: '_blank', rel: 'noopener' }, 'Lihat Blog ↗')),
    el('div', { class: 'row' }, tab, el('button', { type: 'button', class: 'kecil', onclick: () => buka({}) }, '+ Berita baru')),
    editor, el('div', { style: 'margin-top:10px' }, daftar)));
}
