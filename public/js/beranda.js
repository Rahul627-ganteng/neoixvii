import { ambilKatalog } from './api.js';
import { el, kartuApp, kerangkaMemuat, pasangKerangka, pasangTilt, pesanGagal } from './ui.js';

pasangKerangka('/');
pasangTilt();

const wadahUnggulan = document.getElementById('unggulan');
const wadahKategori = document.getElementById('daftar-kategori');

async function muat() {
  wadahUnggulan.replaceChildren(...kerangkaMemuat(6));
  try {
    const { kategori, apps } = await ambilKatalog();
    document.getElementById('jumlah-app').textContent = apps.filter((a) => !/^(netflix|chatgpt|canva|spotify)/i.test(a.nama)).length;

    wadahKategori.replaceChildren(...kategori.map((k) =>
      el('a', { class: 'chip', href: `/katalog/?kategori=${encodeURIComponent(k.label)}` }, k.label, el('small', {}, k.jumlah))));

    // Produk unggulan pilihan admin; kalau belum ada, ambil aplikasi pertama dari tiap kategori.
    let pilihan = apps.filter((a) => a.unggulan && !a.habisSemua);
    if (!pilihan.length) pilihan = kategori.map((k) => apps.find((a) => a.kategori === k.label && !a.habisSemua)).filter(Boolean);
    wadahUnggulan.replaceChildren(...pilihan.slice(0, 6).map(kartuApp));
  } catch (err) {
    wadahUnggulan.replaceChildren(pesanGagal('Katalog belum bisa dimuat. Periksa koneksi internet lalu coba lagi.', muat));
  }
}
muat();
