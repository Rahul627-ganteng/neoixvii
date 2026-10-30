// "Unduh Excel": isi template-katalog.xlsx (tata letak, rumus, dropdown, warna sudah jadi) dengan data dari database.
// isiTemplate() tidak bergantung pada browser, jadi bisa diuji di Node; unduhExcel() adalah pembungkus untuk halaman admin.

const BARIS_TERAKHIR = 400;            // template menyiapkan baris 2..400 di sheet Katalog
const MAKS_APLIKASI = 150;             // baris 2..151 di sheet Aplikasi
const MAKS_KATEGORI = 19;              // baris 2..20 di sheet Referensi

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function selXml(ref, gaya, nilai) {
  if (nilai == null || nilai === '') return `<c r="${ref}"${gaya}/>`;
  if (typeof nilai === 'number') return `<c r="${ref}"${gaya}><v>${nilai}</v></c>`;
  return `<c r="${ref}"${gaya} t="inlineStr"><is><t xml:space="preserve">${esc(nilai)}</t></is></c>`;
}

/** Isi sel-sel yang sudah ada di XML sheet. `nilai` = Map("B5" -> nilai). */
function isiSheet(xml, nilai) {
  const sisa = new Set(nilai.keys());
  const barisPerlu = new Set([...nilai.keys()].map((k) => +k.replace(/^[A-Z]+/, '')));
  const hasil = xml.replace(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g, (m, r, attr, isi) => {
    if (!barisPerlu.has(+r)) return m;
    const baru = isi.replace(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (cm, ref, cattr) => {
      if (!nilai.has(ref)) return cm;
      sisa.delete(ref);
      const gaya = (cattr.match(/\ss="\d+"/) || [''])[0];
      return selXml(ref, gaya, nilai.get(ref));
    });
    return `<row r="${r}"${attr}>${baru}</row>`;
  });
  if (sisa.size) throw new Error(`Sel template tidak ditemukan: ${[...sisa].slice(0, 5).join(', ')}`);
  return hasil;
}

async function pathSheet(zip) {
  const wb = await zip.file('xl/workbook.xml').async('string');
  const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const target = {};
  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[1])?.[1], t = /\bTarget="([^"]+)"/.exec(m[1])?.[1];
    if (id && t) target[id] = t.replace(/^\/?(xl\/)?/, 'xl/');
  }
  const peta = {};
  for (const m of wb.matchAll(/<sheet\b([^>]*)\/>/g)) {
    const nama = /\bname="([^"]+)"/.exec(m[1])?.[1], rid = /\br:id="([^"]+)"/.exec(m[1])?.[1];
    peta[nama] = target[rid];
  }
  return peta;
}

/**
 * @param JSZip   kelas JSZip
 * @param buf     isi template-katalog.xlsx (ArrayBuffer / Uint8Array / Buffer)
 * @param data    { varian: [baris v_katalog_admin], aplikasi: [{kategori, nama, deskripsi}],
 *                  kategori: [{label, description}], versi: ISO string, info: teks pembuka }
 * @param tipe    'blob' (browser) atau 'uint8array' (Node)
 */
export async function isiTemplate(JSZip, buf, data, tipe = 'blob') {
  if (data.varian.length > BARIS_TERAKHIR - 1) throw new Error(`Katalog berisi ${data.varian.length} varian, template hanya ${BARIS_TERAKHIR - 1} baris.`);
  if (data.aplikasi.length > MAKS_APLIKASI) throw new Error(`Terlalu banyak aplikasi (${data.aplikasi.length}).`);
  if (data.kategori.length > MAKS_KATEGORI) throw new Error(`Terlalu banyak kategori (${data.kategori.length}).`);
  const zip = await JSZip.loadAsync(buf);
  const peta = await pathSheet(zip);
  const ubah = async (namaSheet, fn) => {
    const path = peta[namaSheet];
    if (!path) throw new Error(`Sheet ${namaSheet} tidak ada di template`);
    zip.file(path, fn(await zip.file(path).async('string')));
  };

  const angka = (x) => (x == null || x === '' ? null : Number(x));
  const katalog = new Map();
  data.varian.forEach((v, i) => {
    const r = i + 2;
    const isi = {
      A: v.code, B: v.kategori, C: v.aplikasi, D: v.tipe, E: v.varian,
      F: angka(v.hpp), G: angka(v.markup), H: angka(v.harga_manual), L: angka(v.harga),
      O: v.stok === 'habis' ? 'Habis' : 'Tersedia', P: v.tampil === false ? 'Tidak' : 'Ya', Q: v.catatan || null,
    };
    for (const [kol, nilai] of Object.entries(isi)) katalog.set(`${kol}${r}`, nilai);
  });
  await ubah('Katalog', (x) => isiSheet(x, katalog));

  const aplikasi = new Map();
  data.aplikasi.forEach((a, i) => {
    aplikasi.set(`A${i + 2}`, a.kategori); aplikasi.set(`B${i + 2}`, a.nama); aplikasi.set(`C${i + 2}`, a.deskripsi || null);
  });
  await ubah('Aplikasi', (x) => isiSheet(x, aplikasi));

  const ref = new Map();
  data.kategori.forEach((k, i) => { ref.set(`A${i + 2}`, k.label); ref.set(`B${i + 2}`, k.description || null); });
  await ubah('Referensi', (x) => isiSheet(x, ref).replace('{{VERSI}}', esc(data.versi || '')));
  await ubah('Petunjuk', (x) => x.replace('{{INFO}}', esc(data.info || '')));

  return zip.generateAsync({ type: tipe, compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ---------------------------------------------------------------- browser
function muatJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise((ok, gagal) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.onload = () => ok(window.JSZip);
    s.onerror = () => gagal(new Error('Gagal memuat JSZip. Periksa koneksi internet.'));
    document.head.append(s);
  });
}

/** Ambil data terbaru dari Supabase lalu unduh sebagai Katalog_IXVII_<tanggal>.xlsx */
export async function unduhExcel(supabase) {
  const [JSZip, tpl, varian, apps, kategori, versi] = await Promise.all([
    muatJSZip(),
    fetch('/admin/template-katalog.xlsx').then((r) => { if (!r.ok) throw new Error('Template tidak ditemukan'); return r.arrayBuffer(); }),
    supabase.from('v_katalog_admin')
      .select('code,kategori,aplikasi,tipe,varian,hpp,markup,harga_manual,harga,stok,tampil,catatan')
      .order('sort_kategori').order('sort_aplikasi').order('sort_tipe').order('sort_varian').order('code'),
    supabase.from('apps').select('name,description,sort,categories(label,sort)').order('sort'),
    supabase.from('categories').select('label,description').order('sort'),
    supabase.rpc('versi_katalog'),
  ]);
  for (const r of [varian, apps, kategori, versi]) if (r.error) throw new Error(r.error.message);

  const baris = varian.data;
  const aplikasi = apps.data
    .sort((a, b) => (a.categories?.sort ?? 0) - (b.categories?.sort ?? 0) || a.sort - b.sort)
    .map((a) => ({ kategori: a.categories?.label ?? '', nama: a.name, deskripsi: a.description }));
  const sekarang = new Date();
  const tanggal = sekarang.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
  const info = `Diunduh dari panel admin pada ${tanggal} WIB. Berisi ${baris.length} varian, ` +
    `${baris.filter((b) => b.hpp != null).length} sudah ada HPP-nya. Ubah sheet Katalog, simpan, lalu unggah di halaman Impor Excel.`;

  const blob = await isiTemplate(JSZip, tpl, { varian: baris, aplikasi, kategori: kategori.data, versi: versi.data, info });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Katalog_IXVII_${sekarang.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })}.xlsx`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return { jumlah: baris.length };
}
