// Menu Ulasan: moderasi ulasan Verified Purchase (tampilkan / sembunyikan / hapus).
import { el, q, toast, waktu } from './alat.js';

const STATUS = {
  menunggu: { label: 'Menunggu', kelas: 'kuning' },
  tampil: { label: 'Tampil', kelas: 'hijau' },
  disembunyikan: { label: 'Disembunyikan', kelas: '' },
};
let saringan = 'menunggu';
const bintang = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export async function halamanUlasan(supabase, halaman) {
  let ulasan;
  try {
    ulasan = await q(supabase.from('reviews')
      .select('id,app_name,rating,body,display_name,lang,purchased_on,status,created_at,orders(code,customer_name)')
      .order('created_at', { ascending: false }).limit(500));
  } catch (err) {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Ulasan butuh migration Tahap 8 (20261104000000_tahap8_ulasan.sql). Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  const tab = el('div', { class: 'row tab', role: 'group', 'aria-label': 'Saring ulasan' });
  const daftar = el('div');

  const ubah = async (u, status) => {
    try {
      await q(supabase.from('reviews').update({ status, updated_at: new Date().toISOString() }).eq('id', u.id));
      u.status = status; toast(`Ulasan ${u.app_name}: ${STATUS[status].label}`); gambar();
    } catch (err) { toast('Gagal: ' + err.message, true); }
  };
  const hapus = async (u) => {
    if (!confirm('Hapus ulasan ini untuk selamanya? Kalau hanya tidak ingin ditampilkan, pilih Sembunyikan.')) return;
    try { await q(supabase.from('reviews').delete().eq('id', u.id)); ulasan.splice(ulasan.indexOf(u), 1); toast('Ulasan dihapus'); gambar(); }
    catch (err) { toast('Gagal: ' + err.message, true); }
  };

  const kartu = (u) => el('article', { class: 'item-form ulasan-admin' },
    el('div', { class: 'row', style: 'justify-content:space-between' },
      el('div', {}, el('b', {}, u.app_name), ' ', el('span', { class: 'bintang-admin', 'aria-label': `${u.rating} dari 5 bintang` }, bintang(u.rating)), ' ',
        el('span', { class: 'tag ' + STATUS[u.status].kelas }, STATUS[u.status].label), u.lang === 'en' ? el('span', { class: 'tag' }, 'EN') : null),
      el('span', { class: 'muted' }, waktu(u.created_at))),
    el('p', { style: 'margin:8px 0;white-space:pre-line' }, u.body || el('span', { class: 'muted' }, '(tanpa tulisan, hanya bintang)')),
    el('div', { class: 'muted' }, `Tampil sebagai "${u.display_name}" · dibeli ${new Date(u.purchased_on + 'T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
      u.orders ? ` · pesanan ${u.orders.code} (${u.orders.customer_name})` : ''),
    el('div', { class: 'row', style: 'margin-top:8px' },
      u.status !== 'tampil' ? el('button', { type: 'button', class: 'kecil', onclick: () => ubah(u, 'tampil') }, 'Tampilkan') : null,
      u.status !== 'disembunyikan' ? el('button', { type: 'button', class: 'sec kecil', onclick: () => ubah(u, 'disembunyikan') }, 'Sembunyikan') : null,
      el('button', { type: 'button', class: 'kecil bahaya', onclick: () => hapus(u) }, 'Hapus')));

  function gambar() {
    const pilihan = [...Object.entries(STATUS).map(([k, v]) => [k, v.label]), ['semua', 'Semua']];
    tab.replaceChildren(...pilihan.map(([k, l]) => el('button', {
      type: 'button', class: 'kecil ' + (k === saringan ? '' : 'sec'), 'aria-pressed': String(k === saringan),
      onclick: () => { saringan = k; gambar(); },
    }, `${l} (${k === 'semua' ? ulasan.length : ulasan.filter((u) => u.status === k).length})`)));
    const cocok = saringan === 'semua' ? ulasan : ulasan.filter((u) => u.status === saringan);
    daftar.replaceChildren(...(cocok.length ? cocok.map(kartu) : [el('p', { class: 'muted' }, ulasan.length ? 'Tidak ada ulasan di sini.' : 'Belum ada ulasan. Kirim link ulasan dari menu Pesanan untuk pesanan yang sudah Aktif atau Selesai.')]));
  }
  gambar();
  halaman.replaceChildren(el('section', { class: 'card' },
    el('h2', {}, 'Ulasan pembeli'),
    el('p', { class: 'sub' }, 'Ulasan baru masuk sebagai "Menunggu" dan baru tampil di website setelah kamu klik Tampilkan. Hanya pembeli dengan link dari menu Pesanan yang bisa menulis ulasan. Jangan menulis ulasan sendiri: label Verified Purchase harus berarti pembeli sungguhan.'),
    tab, el('div', { style: 'margin-top:10px' }, daftar)));
}
