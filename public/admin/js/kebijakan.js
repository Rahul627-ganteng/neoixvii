// Kartu "Halaman kebijakan" di menu Toko & konten: syarat layanan, kebijakan privasi, garansi & refund.
import { el, isian, q, toast, waktu } from './alat.js';
import { tampilkanTeks } from '/js/teks.js';

const NAMA = { syarat: ['Syarat layanan', '/syarat/'], privasi: ['Kebijakan privasi', '/privasi/'], garansi: ['Garansi & refund', '/garansi-refund/'] };
let pilihan = 'syarat';

export async function kartuKebijakan(supabase) {
  const kartu = el('section', { class: 'card' });
  let halaman;
  try { halaman = await q(supabase.from('site_pages').select('*')); }
  catch {
    kartu.append(el('h2', {}, 'Halaman kebijakan'), el('div', { class: 'msg warn' }, 'Butuh migration 20261110000000_kebijakan.sql. Jalankan dulu di SQL Editor Supabase.'));
    return kartu;
  }
  const isi = el('div');
  const tab = el('div', { class: 'row tab', role: 'group', 'aria-label': 'Pilih halaman' });

  function gambar() {
    tab.replaceChildren(...Object.entries(NAMA).map(([k, [l]]) => el('button', {
      type: 'button', class: 'kecil ' + (k === pilihan ? '' : 'sec'), 'aria-pressed': String(k === pilihan), onclick: () => { pilihan = k; gambar(); },
    }, l)));
    const h = halaman.find((x) => x.slug === pilihan) || { slug: pilihan, title: NAMA[pilihan][0], body: '' };
    const judul = el('input', { type: 'text', value: h.title || '', maxlength: 80 });
    const judulEn = el('input', { type: 'text', value: h.title_en || '', maxlength: 80 });
    const badan = el('textarea', { rows: 16, value: h.body || '', maxlength: 20000 });
    const badanEn = el('textarea', { rows: 16, value: h.body_en || '', maxlength: 20000, placeholder: 'Opsional. Kosong = memakai versi Indonesia.' });
    const pratinjau = el('article', { class: 'pratinjau-kebijakan' });
    const segarPratinjau = () => pratinjau.replaceChildren(...tampilkanTeks(badan.value));
    badan.addEventListener('input', segarPratinjau); segarPratinjau();
    const simpan = el('button', { type: 'button' }, 'Simpan halaman');
    simpan.addEventListener('click', async () => {
      if (judul.value.trim().length < 2) return toast('Judul wajib diisi', true);
      simpan.disabled = true;
      try {
        const baris = { slug: pilihan, title: judul.value.trim(), title_en: judulEn.value.trim() || null, body: badan.value.trim(),
          body_en: badanEn.value.trim() || null, updated_at: new Date().toISOString() };
        await q(supabase.from('site_pages').upsert(baris, { onConflict: 'slug' }));
        const i = halaman.findIndex((x) => x.slug === pilihan);
        if (i >= 0) halaman[i] = baris; else halaman.push(baris);
        toast(`${baris.title} tersimpan`); gambar();
      } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
    });
    isi.replaceChildren(
      el('p', { class: 'muted' }, h.updated_at ? `Terakhir diubah ${waktu(h.updated_at)} · ` : '', el('a', { href: NAMA[pilihan][1], target: '_blank', rel: 'noopener' }, 'Lihat halaman ↗')),
      el('div', { class: 'grid2' }, isian('Judul', judul), isian('Judul bahasa Inggris', judulEn)),
      isian('Isi', badan, 'Format: "## Judul bagian", baris kosong untuk paragraf baru, "- " untuk daftar, "1. " untuk langkah, **tebal**, [teks](https://…).'),
      el('details', { class: 'item-form' }, el('summary', {}, el('b', {}, 'Pratinjau')), pratinjau),
      isian('Isi bahasa Inggris', badanEn),
      el('div', { class: 'row', style: 'margin-top:10px' }, simpan));
  }
  gambar();
  kartu.append(el('h2', {}, 'Halaman kebijakan'),
    el('p', { class: 'sub' }, 'Syarat layanan, kebijakan privasi, serta garansi & refund. Tampil di footer semua halaman. Isi awalnya draf: baca dan sesuaikan dengan aturan tokomu, terutama bagian refund.'),
    tab, isi);
  return kartu;
}
