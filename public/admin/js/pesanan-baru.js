// Form "Pesanan baru" di menu Pesanan: mencatat penjualan yang tidak lewat website
// (chat WhatsApp, Instagram, TikTok, Shopee, langsung/offline). Dibuat untuk dipakai di HP.
import { el, hariIni, isian, q, rp, toast } from './alat.js';

export const SUMBER = {
  web: 'Website', whatsapp: 'WhatsApp', instagram: 'Instagram', tiktok: 'TikTok', shopee: 'Shopee', offline: 'Langsung / offline', lainnya: 'Lainnya',
};
const angka = (v) => { const d = String(v ?? '').replace(/\D/g, ''); return d === '' ? null : Number(d); };

/** Kembalikan elemen form. selesai(kode) dipanggil setelah pesanan tersimpan. */
export async function formPesananBaru(supabase, { selesai, tutup }) {
  const [katalog, mitra] = await Promise.all([
    q(supabase.from('v_katalog_admin').select('code,aplikasi,tipe,varian,harga,hpp,stok,stok_jumlah,tampil')
      .order('sort_kategori').order('sort_aplikasi').order('sort_tipe').order('sort_varian')),
    q(supabase.from('partners').select('id,name,referral_code,is_active').order('name')).catch(() => []),
  ]);
  const items = [];   // {code?, app, tipe, varian, harga, hpp, hari?, luar}

  const nama = el('input', { type: 'text', maxlength: 60, placeholder: 'Nama pembeli', autocomplete: 'off' });
  const wa = el('input', { type: 'tel', inputmode: 'tel', placeholder: '08… (opsional)' });
  const sumber = el('select', {}, Object.entries(SUMBER).filter(([k]) => k !== 'web').map(([k, l]) => el('option', { value: k }, l)));
  const tanggal = el('input', { type: 'date', value: hariIni(), max: hariIni() });
  const status = el('select', {},
    [['menunggu_bayar', 'Menunggu bayar'], ['dibayar', 'Sudah bayar (akun belum dikirim)'], ['aktif', 'Aktif (akun sudah dikirim)'], ['selesai', 'Selesai']]
      .map(([k, l]) => el('option', { value: k, selected: k === 'aktif' }, l)));
  const diskon = el('input', { type: 'text', inputmode: 'numeric', placeholder: '0' });
  const catatan = el('input', { type: 'text', maxlength: 200, placeholder: 'Opsional' });
  const affiliate = mitra.length ? el('select', {}, el('option', { value: '' }, '— tanpa affiliate —'),
    mitra.filter((m) => m.is_active).map((m) => el('option', { value: m.id }, `${m.name}${m.referral_code ? ` (${m.referral_code})` : ''}`))) : null;

  // ---- cari & tambah varian katalog
  const cari = el('input', { type: 'search', placeholder: 'Cari aplikasi atau paket, mis. "netflix 1 bulan"', 'aria-label': 'Cari paket' });
  const hasilCari = el('div', { class: 'hasil-cari' });
  cari.addEventListener('input', () => {
    const kata = cari.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!kata.length) { hasilCari.replaceChildren(); return; }
    const cocok = katalog.filter((r) => kata.every((k) => `${r.aplikasi} ${r.tipe} ${r.varian} ${r.code}`.toLowerCase().includes(k))).slice(0, 8);
    hasilCari.replaceChildren(...(cocok.length ? cocok.map((r) => el('button', {
      type: 'button', class: 'pilih-paket', onclick: () => {
        items.push({ code: r.code, app: r.aplikasi, tipe: r.tipe, varian: r.varian, harga: r.harga, hpp: r.hpp, hppAsli: r.hpp, stok: r.stok, sisa: r.stok_jumlah });
        cari.value = ''; hasilCari.replaceChildren(); gambar(); cari.focus();
      },
    }, el('span', {}, el('b', {}, r.aplikasi), ` ${r.tipe} · ${r.varian}`,
      r.stok === 'habis' ? el('span', { class: 'tag merah' }, 'habis') : r.stok_jumlah != null ? el('span', { class: 'tag' }, `sisa ${r.stok_jumlah}`) : null,
      r.tampil ? null : el('span', { class: 'tag' }, 'disembunyikan')), el('span', {}, rp(r.harga))))
      : [el('p', { class: 'muted' }, 'Tidak ketemu. Pakai "+ Item di luar katalog".')]));
  });
  const tambahLuar = el('button', { type: 'button', class: 'sec kecil' }, '+ Item di luar katalog');
  tambahLuar.addEventListener('click', () => { items.push({ luar: true, app: '', tipe: '', varian: '', harga: null, hpp: null, hari: null }); gambar(); });

  const daftar = el('div');
  const ringkas = el('div', { class: 'ringkas-pesanan' });
  function hitung() {
    const normal = items.reduce((s, i) => s + (i.harga || 0), 0);
    const d = Math.min(angka(diskon.value) || 0, normal);
    const total = normal - d;
    const hpp = items.reduce((s, i) => s + (i.hpp || 0), 0);
    const kosong = items.filter((i) => i.hpp == null).length;
    ringkas.replaceChildren(...[
      el('div', {}, el('span', {}, 'Total'), el('b', {}, rp(total))),
      el('div', {}, el('span', {}, 'Perkiraan untung'), el('b', {}, rp(total - hpp))),
      kosong ? el('div', { class: 'muted' }, `${kosong} item belum punya HPP, untungnya dihitung tanpa modal.`) : null].filter(Boolean));
  }
  const hppKatalog = (it) => {
    const i = el('input', { type: 'text', inputmode: 'numeric', value: it.hpp ?? '', placeholder: 'belum diisi', 'aria-label': 'HPP' });
    i.addEventListener('input', () => { it.hpp = angka(i.value); hitung(); });
    return i;
  };
  function gambar() {
    daftar.replaceChildren(...items.map((it, i) => {
      const hapus = el('button', { type: 'button', class: 'sec kecil', 'aria-label': 'Hapus item', onclick: () => { items.splice(i, 1); gambar(); } }, 'Hapus');
      const harga = el('input', { type: 'text', inputmode: 'numeric', value: it.harga ?? '', placeholder: 'Harga', 'aria-label': 'Harga' });
      harga.addEventListener('input', () => { it.harga = angka(harga.value); hitung(); });
      if (!it.luar) {
        return el('div', { class: 'item-pesanan' },
          el('div', { class: 'row', style: 'justify-content:space-between' }, el('span', {}, el('b', {}, it.app), ` ${it.tipe} · ${it.varian}`,
            it.stok === 'habis' ? el('span', { class: 'tag merah' }, 'stok habis') : null), hapus),
          el('div', { class: 'grid2' }, isian('Harga jual (boleh diubah)', harga),
            isian('HPP / modal (boleh diubah)', hppKatalog(it), it.hppAsli != null && it.hpp !== it.hppAsli ? `HPP katalog ${rp(it.hppAsli)}` : 'Ubah kalau modalnya beda, mis. saat promo.')));
      }
      const app = el('input', { type: 'text', value: it.app, placeholder: 'Nama item, mis. Jasa setting TV', maxlength: 80 });
      const ket = el('input', { type: 'text', value: it.varian, placeholder: 'Keterangan (opsional)', maxlength: 60 });
      const hpp = el('input', { type: 'text', inputmode: 'numeric', value: it.hpp ?? '', placeholder: 'Modal (opsional)' });
      const hari = el('input', { type: 'number', min: 1, max: 36500, value: it.hari ?? '', placeholder: 'Durasi hari (opsional)' });
      app.addEventListener('input', () => { it.app = app.value; });
      ket.addEventListener('input', () => { it.varian = ket.value; });
      hpp.addEventListener('input', () => { it.hpp = angka(hpp.value); hitung(); });
      hari.addEventListener('input', () => { it.hari = hari.value ? Number(hari.value) : null; });
      return el('div', { class: 'item-pesanan' },
        el('div', { class: 'row', style: 'justify-content:space-between' }, el('b', {}, 'Item di luar katalog'), hapus),
        el('div', { class: 'grid2' }, isian('Nama item', app), isian('Keterangan', ket), isian('Harga jual', harga), isian('HPP / modal', hpp), isian('Durasi (hari)', hari)));
    }));
    if (!items.length) daftar.append(el('p', { class: 'muted' }, 'Belum ada item. Cari paket di atas.'));
    hitung();
  }
  diskon.addEventListener('input', hitung);

  const simpan = el('button', { type: 'button' }, 'Simpan pesanan');
  simpan.addEventListener('click', async () => {
    if (nama.value.trim().length < 2) { nama.focus(); return toast('Isi nama pembeli', true); }
    if (!items.length) return toast('Tambahkan minimal satu item', true);
    if (items.some((i) => i.luar && !i.app.trim())) return toast('Isi nama item di luar katalog', true);
    if (items.some((i) => i.harga == null)) return toast('Isi harga semua item', true);
    const p = {
      nama: nama.value.trim(), wa: wa.value.trim(), channel: sumber.value, status: status.value, tanggal: tanggal.value || hariIni(),
      diskon: angka(diskon.value) || 0, catatan: catatan.value.trim(), partner: affiliate?.value ? Number(affiliate.value) : null,
      items: items.map((i) => (i.luar ? { app: i.app.trim(), varian: i.varian.trim(), harga: i.harga, hpp: i.hpp, hari: i.hari } : { code: i.code, harga: i.harga, hpp: i.hpp })),
    };
    simpan.disabled = true;
    try {
      const h = await q(supabase.rpc('buat_pesanan_admin', { p }));
      toast(`Pesanan ${h.kode} tersimpan · ${rp(h.total)}`);
      selesai(h.kode);
    } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
  });

  gambar();
  return el('section', { class: 'card form-pesanan-baru' },
    el('div', { class: 'row', style: 'justify-content:space-between' }, el('h2', {}, 'Pesanan baru'),
      el('button', { type: 'button', class: 'sec kecil', onclick: tutup }, 'Tutup')),
    el('p', { class: 'sub' }, 'Untuk penjualan yang tidak lewat website. Status Aktif langsung mengisi masa aktif, mengurangi stok, dan mencatat komisi affiliate, sama seperti pesanan dari website.'),
    el('div', { class: 'grid2' }, isian('Nama pembeli', nama), isian('No. WhatsApp', wa, 'Dipakai untuk link garansi & pengingat.'),
      isian('Sumber penjualan', sumber), isian('Tanggal transaksi', tanggal, 'Boleh mundur untuk mencatat penjualan yang terlewat.')),
    el('h3', { class: 'judul-kecil' }, 'Item'),
    cari, hasilCari, daftar, el('div', { class: 'row', style: 'margin-top:8px' }, tambahLuar),
    el('div', { class: 'grid2', style: 'margin-top:8px' }, isian('Diskon (Rp)', diskon), isian('Status', status),
      affiliate ? isian('Affiliate', affiliate) : null, isian('Catatan', catatan)),
    ringkas,
    el('div', { class: 'row', style: 'margin-top:12px' }, simpan));
}
