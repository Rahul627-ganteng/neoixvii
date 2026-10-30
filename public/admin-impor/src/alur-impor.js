// alur-impor.js — penghubung halaman admin dengan Supabase
//
//   const pratinjau = await siapkanPratinjau(supabase, file)   // baca Excel + bandingkan dengan katalog
//   tampilkan pratinjau.diff (baru / berubah / tidakAdaDiFile) dan pratinjau.hasil.baris[].errors
//   const hasil = await terapkan(supabase, pratinjau)          // satu transaksi di database
//   await batalkan(supabase, hasil.batch_id)                   // kalau perlu membatalkan
//
// `supabase` adalah client yang sudah login sebagai admin (JWT dengan app_metadata.role = 'admin').
// Service role key TIDAK dipakai di browser.

import * as XLSX from 'xlsx'; // SheetJS 0.20.3 dari cdn.sheetjs.com (lihat README)
import { bacaWorkbook, bandingkan, keBarisRpc } from './hpp-import.js';
export { keBarisRpc };

const MAKS_UKURAN = 2 * 1024 * 1024; // 2 MB, katalog ±200 varian biasanya < 100 KB

export async function siapkanPratinjau(supabase, file) {
  if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) throw new Error('Unggah file Excel (.xlsx). CSV/PDF tidak bisa.');
  if (file.size > MAKS_UKURAN) throw new Error('File lebih dari 2 MB. Pastikan ini file katalog yang benar.');

  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const hasil = bacaWorkbook(wb);

  const { data: sekarang, error } = await supabase
    .from('v_katalog_admin')
    .select('code,kategori,aplikasi,tipe,varian,harga,hpp,stok,tampil');
  if (error) throw new Error('Gagal membaca katalog: ' + error.message);

  const diff = bandingkan(hasil.baris, sekarang);
  for (const b of diff.idTidakDikenal)
    b.errors.push({ kolom: 'ID Varian', pesan: `ID ${b.code} tidak ada di katalog. Kosongkan ID untuk varian baru.` });

  const errors = hasil.baris.flatMap((b) => b.errors.map((e) => ({ baris: b.barisExcel, ...e })));
  const warnings = hasil.baris.flatMap((b) => b.warnings.map((w) => ({ baris: b.barisExcel, ...w })));
  return { namaFile: file.name, hasil, diff, errors, warnings, bisaDiterapkan: errors.length === 0 };
}

export async function terapkan(supabase, pratinjau, { nonaktifkanYangTidakAda = false } = {}) {
  if (!pratinjau.bisaDiterapkan) throw new Error('Masih ada error. Perbaiki file lalu unggah ulang.');
  // Kirim teks versi apa adanya: Date di JavaScript memotong mikrodetik, padahal database menyimpannya,
  // sehingga file yang baru diunduh bisa dikira kedaluwarsa.
  const v = pratinjau.hasil.versiData;
  const versi = v && !Number.isNaN(Date.parse(v)) ? v : null;
  const { data, error } = await supabase.rpc('impor_katalog', {
    p_rows: pratinjau.hasil.baris.map(keBarisRpc),
    p_nama_file: pratinjau.namaFile,
    p_versi_data: versi,
    p_nonaktifkan_hilang: nonaktifkanYangTidakAda,
  });
  if (error) throw new Error(error.message);
  return data; // { batch_id, baru, berubah, sama, dinonaktifkan }
}

export async function batalkan(supabase, batchId) {
  const { data, error } = await supabase.rpc('batalkan_impor', { p_batch_id: batchId });
  if (error) throw new Error(error.message);
  return data; // { dikembalikan, konflik }
}
