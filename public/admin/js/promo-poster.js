// Generator promo dari poster story: unggah poster → dibaca (AI Claude atau OCR gratis) → dicocokkan dengan katalog
// → admin memeriksa & merapikan → disimpan sebagai kampanye promo + bundle (stok, best deal, berakhir otomatis).
import { el, hariIni, isian, q, rp, toast } from './alat.js';
import { bacaTeksPoster, cocokkanVarian, tanggalBerakhir, teksDariTsv, warnaDominan } from './poster-baca.js';

const TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const MAKS_POSTER = 15 * 1024 * 1024;
const MODEL = [['claude-sonnet-5-5', 'Claude Sonnet 5.5 (disarankan, ±Rp600/poster)'], ['claude-haiku-5-5', 'Claude Haiku 5.5 (paling hemat, kurang teliti)'], ['claude-opus-5-5', 'Claude Opus 5.5 (paling teliti, ±Rp1.200/poster)']];
const KELOMPOK = [['', 'Otomatis'], ['editing', 'Aplikasi Editing'], ['ai', 'Aplikasi AI'], ['streaming', 'Aplikasi Streaming'], ['lainnya', 'Lainnya']];
const jeda = (ms) => new Promise((ok) => setTimeout(ok, ms));
const pct = (x) => Math.round(x * 100) + '%';

// ---------------------------------------------------------------- gambar
function muatGambar(file) {
  return new Promise((ok, gagal) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => ok({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); gagal(new Error('File ini bukan gambar yang bisa dibaca')); };
    img.src = url;
  });
}
function kanvas(img, lebar, abu = false) {
  const s = Math.min(1, lebar / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * s);
  c.height = Math.round(img.naturalHeight * s);
  const x = c.getContext('2d', { willReadFrequently: true });
  if (abu) x.filter = 'grayscale(1) contrast(1.15)';
  x.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
const keBlob = (c) => new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.88));

async function muatTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise((ok, gagal) => {
    const s = document.createElement('script');
    s.src = TESSERACT;
    s.onload = ok;
    s.onerror = () => gagal(new Error('Pembaca OCR gagal dimuat. Periksa koneksi internet.'));
    document.head.append(s);
  });
  return window.Tesseract;
}

// ---------------------------------------------------------------- kartu utama
export function kartuGenerator(ctx, statusAi) {
  const { supabase, varian } = ctx;
  const perKode = new Map(varian.map((v) => [v.code, v]));
  const tampil = varian.filter((v) => v.tampil);
  let ai = statusAi;
  let poster = null; // { img, url, file, warna, banner }
  let draf = null;

  const kotakAi = el('div');
  const progres = el('div', { class: 'gen-progres', 'aria-live': 'polite' });
  const editor = el('div');
  const pilihFile = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Pilih poster' });
  const pratinjau = el('div', { class: 'gen-unggah' }, el('span', { class: 'muted' }, 'Belum ada poster'));
  const kelompok = el('select', { 'aria-label': 'Kelompok promo' }, KELOMPOK.map(([k, l]) => el('option', { value: k }, l)));
  const tombolAi = el('button', { type: 'button', disabled: true }, 'Baca dengan AI');
  const tombolOcr = el('button', { type: 'button', class: 'sec', disabled: true }, 'Baca gratis (OCR)');
  const tempel = el('textarea', { placeholder: 'Tempel teks poster di sini (mis. dari caption). Satu baris per baris poster.', rows: 6 });
  const tombolTeks = el('button', { type: 'button', class: 'sec kecil' }, 'Baca teks');

  const tulisProgres = (teks, kelas = '') => progres.replaceChildren(teks ? el('div', { class: 'msg ' + kelas }, teks) : '');
  const sibuk = (ya) => { for (const b of [tombolAi, tombolOcr, tombolTeks, pilihFile]) b.disabled = ya; if (!ya) aturTombol(); };
  const aturTombol = () => { tombolAi.disabled = !poster || !ai?.kunci || !ai?.pg_net; tombolOcr.disabled = !poster; };

  // ---- pengaturan AI
  function gambarAi() {
    const kunci = el('input', { type: 'password', placeholder: ai?.kunci ? `Tersimpan (…${ai.akhir}). Isi untuk mengganti.` : 'sk-ant-api03-…', autocomplete: 'off', 'aria-label': 'API key Claude' });
    const model = el('select', { 'aria-label': 'Model AI' }, MODEL.map(([k, l]) => el('option', { value: k, selected: ai?.model === k }, l)));
    const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
    const hapus = el('button', { type: 'button', class: 'kecil bahaya' }, 'Hapus key');
    simpan.addEventListener('click', async () => {
      try { ai = await q(supabase.rpc('simpan_ai', { p: { kunci: kunci.value.trim(), model: model.value } })); toast('Pengaturan AI tersimpan'); gambarAi(); aturTombol(); }
      catch (err) { toast(err.message, true); }
    });
    hapus.addEventListener('click', async () => {
      if (!confirm('Hapus API key Claude? Generator tetap bisa dipakai dengan OCR gratis.')) return;
      try { ai = await q(supabase.rpc('simpan_ai', { p: { hapus: true } })); toast('API key dihapus'); gambarAi(); aturTombol(); }
      catch (err) { toast(err.message, true); }
    });
    const status = !ai ? el('div', { class: 'msg warn' }, 'Jalankan migration 20261114000000_poster_promo.sql dulu supaya pembaca AI bisa dipakai.')
      : !ai.pg_net ? el('div', { class: 'msg warn' }, 'Ekstensi pg_net belum aktif. Aktifkan di Supabase → Database → Extensions → pg_net.')
        : ai.kunci ? el('div', { class: 'msg ok' }, `Pembaca AI aktif (${(MODEL.find(([k]) => k === ai.model) ?? [, ai.model])[1].split(' (')[0]}). Bulan ini ${ai.bulan_ini} poster dibaca.`)
          : el('div', { class: 'msg warn' }, 'Pembaca AI belum diatur. Tanpa AI, poster dibaca dengan OCR gratis di browser (kurang teliti, hasilnya tetap bisa kamu rapikan).');
    kotakAi.replaceChildren(status, ai ? el('details', { class: 'item-form', open: !ai.kunci && ai.pg_net ? null : null },
      el('summary', {}, ai.kunci ? 'Ubah pengaturan AI' : 'Atur API key Claude'),
      el('p', { class: 'muted' }, 'Buat API key di console.anthropic.com → API Keys, isi saldo kredit, lalu tempel di sini. Key disimpan di database dan tidak bisa dibaca lagi dari website maupun panel.'),
      el('div', { class: 'grid2' }, isian('API key', kunci), isian('Model', model)),
      el('div', { class: 'row', style: 'margin-top:8px' }, simpan, ai.kunci ? hapus : null)) : null);
  }
  gambarAi();

  // ---- pilih poster
  pilihFile.addEventListener('change', async () => {
    const f = pilihFile.files[0];
    if (!f) return;
    if (f.size > MAKS_POSTER) { toast('Poster maksimal 15 MB', true); pilihFile.value = ''; return; }
    try {
      const { img, url } = await muatGambar(f);
      if (poster?.url) URL.revokeObjectURL(poster.url);
      const kecil = kanvas(img, 48);
      poster = { img, url, file: f, banner: null, warna: warnaDominan(kecil.getContext('2d').getImageData(0, 0, kecil.width, kecil.height).data) };
      pratinjau.replaceChildren(el('img', { src: url, alt: 'Poster yang dipilih' }));
      tulisProgres('');
      aturTombol();
    } catch (err) { toast(err.message, true); }
  });

  async function unggahPoster() {
    if (poster.banner) return poster.banner;
    const blob = await keBlob(kanvas(poster.img, 1080));
    const path = `poster-${Date.now()}.jpg`;
    await q(supabase.storage.from('banners').upload(path, blob, { upsert: false, contentType: 'image/jpeg', cacheControl: '31536000' }));
    poster.banner = supabase.storage.from('banners').getPublicUrl(path).data.publicUrl;
    return poster.banner;
  }

  // ---- baca dengan AI
  tombolAi.addEventListener('click', async () => {
    sibuk(true);
    try {
      tulisProgres('Mengunggah poster…');
      const url = await unggahPoster();
      tulisProgres('Claude sedang membaca poster… biasanya 20–60 detik.');
      const id = await q(supabase.rpc('baca_poster', { p_url: url, p_kelompok: kelompok.value || null }));
      const mulai = Date.now();
      let h;
      for (;;) {
        await jeda(2500);
        h = await q(supabase.rpc('hasil_poster', { p_id: id }));
        if (h.status !== 'diproses') break;
        tulisProgres(`Claude sedang membaca poster… ${Math.round((Date.now() - mulai) / 1000)} detik`);
      }
      if (h.status === 'gagal') throw new Error(h.galat || 'Gagal membaca poster');
      bukaEditor(dariAi(h.hasil), 'ai');
      const t = h.pemakaian ? (h.pemakaian.input_tokens || 0) + (h.pemakaian.output_tokens || 0) : 0;
      tulisProgres(`Selesai dibaca AI${t ? ` (${t.toLocaleString('id-ID')} token)` : ''}. Periksa hasilnya di bawah sebelum disimpan.`, 'ok');
    } catch (err) {
      tulisProgres(err.message + ' Kamu bisa mencoba "Baca gratis (OCR)".', 'err');
    }
    sibuk(false);
  });

  // ---- baca gratis (OCR di browser)
  tombolOcr.addEventListener('click', async () => {
    sibuk(true);
    let worker;
    try {
      tulisProgres('Memuat pembaca OCR… (sekali saja, ±10 MB)');
      const T = await muatTesseract();
      worker = await T.createWorker('eng', 1, {
        logger: (m) => { if (m.status === 'recognizing text') tulisProgres(`Membaca teks poster… ${Math.round(m.progress * 100)}%`); },
      });
      const { data } = await worker.recognize(kanvas(poster.img, 1080, true), {}, { text: true, tsv: true });
      const teks = data.tsv ? teksDariTsv(data.tsv) : data.text;
      tempel.value = teks;
      const hasil = dariTeks(teks);
      if (!hasil.bundles.length) throw new Error('Tidak ada paket yang terbaca dari poster ini.');
      bukaEditor(hasil, 'ocr');
      tulisProgres(`${hasil.bundles.length} paket terbaca dengan OCR. Periksa nama, harga, stok, dan isi paketnya — OCR bisa salah baca.`, 'warn');
    } catch (err) {
      tulisProgres(err.message + ' Kamu juga bisa menempel teks poster di bawah.', 'err');
    }
    try { await worker?.terminate(); } catch { /* abaikan */ }
    sibuk(false);
  });

  tombolTeks.addEventListener('click', () => {
    const hasil = dariTeks(tempel.value);
    if (!hasil.bundles.length) return toast('Belum ada paket yang terbaca. Pastikan ada baris "POTONGAN … DARI …".', true);
    bukaEditor(hasil, 'teks');
    tulisProgres(`${hasil.bundles.length} paket terbaca dari teks. Periksa hasilnya di bawah.`, 'ok');
  });

  // ---------------------------------------------------------------- konversi hasil → draf
  function akhirDari(h) {
    if (h.tanggal_normal) return tanggalBerakhir(h.tanggal_normal, hariIni());
    if (h.sampai_tanggal) {
      const [y, m, d] = hariIni().split('-').map(Number);
      const tgl = new Date(Date.UTC(y, h.sampai_tanggal >= d ? m - 1 : m, h.sampai_tanggal));
      return tgl.toISOString().slice(0, 10);
    }
    return /24\s*jam|last day|hari terakhir/i.test(`${h.subjudul} ${h.lencana}`) ? hariIni() : '';
  }
  function bundleBaru(b, items, catatan) {
    const normal = items.reduce((s, i) => s + (perKode.get(i.code)?.harga ?? 0) * i.qty, 0);
    const hpp = items.every((i) => perKode.get(i.code)?.hpp != null) ? items.reduce((s, i) => s + perKode.get(i.code).hpp * i.qty, 0) : null;
    const harga = b.harga || (b.harga_coret && b.potongan ? b.harga_coret - b.potongan : 0) || normal;
    return {
      nama: b.nama || '', nama_en: b.nama_en || '', deskripsi: b.deskripsi || '', deskripsi_en: b.deskripsi_en || '', deskripsi_poster: b.deskripsi_poster || '',
      harga, harga_coret: b.harga_coret || 0, stok: b.stok > 0 ? b.stok : null, stokTerbaca: b.stok > 0, best: !!b.best_deal, aktif: true,
      // pakai harga poster persis, kecuali sudah pasti di bawah modal
      tetap: !(hpp != null && harga < hpp),
      items, catatan: catatan || '',
    };
  }
  function dariTeks(teks) {
    const h = bacaTeksPoster(teks);
    return {
      judul: h.judul || 'Promo', judul_en: '', subjudul: h.subjudul, subjudul_en: '', lencana: h.lencana,
      kelompok: kelompok.value || h.kelompok || '', mulai: hariIni(), sampai: akhirDari(h),
      bundles: h.bundles.map((b) => { const c = cocokkanVarian(b, varian.map((v) => ({ ...v }))); return bundleBaru(b, c.items, c.catatan); }),
    };
  }
  function dariAi(h) {
    return {
      judul: h.judul || 'Promo', judul_en: '', subjudul: h.subjudul || '', subjudul_en: '', lencana: h.lencana || '',
      kelompok: kelompok.value || h.kelompok || '', mulai: hariIni(), sampai: akhirDari(h),
      bundles: (h.bundles || []).map((b) => {
        const semua = (b.isi || []).map((i) => ({ code: String(i.kode || '').toUpperCase().trim(), qty: Math.min(12, Math.max(1, Number(i.qty) || 1)) }));
        let items = semua.filter((i) => perKode.has(i.code));
        let catatan = [b.catatan, semua.length > items.length ? `Kode ${semua.filter((i) => !perKode.has(i.code)).map((i) => i.code).join(', ')} dari AI tidak ada di katalog dan dibuang.` : '']
          .filter(Boolean).join(' ');
        if (!items.length) {
          const c = cocokkanVarian({ nama: b.nama, deskripsi: b.deskripsi_poster || b.deskripsi, harga_coret: b.harga_coret }, varian);
          items = c.items;
          catatan = [catatan, 'Isi paket ditebak otomatis, mohon dicek.'].filter(Boolean).join(' ');
        }
        return bundleBaru(b, items, catatan);
      }),
    };
  }

  // ---------------------------------------------------------------- editor hasil
  const datalist = el('datalist', { id: 'varianPoster' }, tampil.map((v) => el('option', { value: `${v.code} · ${v.aplikasi} · ${v.tipe} · ${v.varian} · ${rp(v.harga)}` })));

  function bukaEditor(d, sumber) {
    draf = { ...d, warna: poster?.warna || '#800203', aktif: true, sumber };
    const judul = el('input', { type: 'text', value: draf.judul, maxlength: 120 });
    const judulEn = el('input', { type: 'text', value: draf.judul_en, placeholder: 'opsional' });
    const sub = el('textarea', { value: draf.subjudul, rows: 2 });
    const subEn = el('textarea', { value: draf.subjudul_en, rows: 2, placeholder: 'opsional' });
    const lencana = el('input', { type: 'text', value: draf.lencana, maxlength: 40, placeholder: 'mis. Last Day Sale!' });
    const kel = el('select', {}, KELOMPOK.map(([k, l]) => el('option', { value: k, selected: k === (draf.kelompok || '') }, l)));
    const mulai = el('input', { type: 'date', value: draf.mulai });
    const sampai = el('input', { type: 'date', value: draf.sampai });
    const warna = el('input', { type: 'color', value: draf.warna, 'aria-label': 'Warna tema' });
    const aktif = el('input', { type: 'checkbox', id: 'genAktif', checked: true });
    const daftar = el('div', { class: 'gen-daftar' });
    const ringkas = el('div', { class: 'muted' });

    const gambarDaftar = () => {
      daftar.replaceChildren(...draf.bundles.map((b, i) => kartuBundleDraf(b, i)));
      const cek = draf.bundles.filter((b) => periksa(b).some(([k]) => k === 'merah')).length;
      ringkas.textContent = `${draf.bundles.length} bundle${cek ? ` · ${cek} perlu diperbaiki` : ''}`;
    };

    function kartuBundleDraf(b, i) {
      const nama = el('input', { type: 'text', value: b.nama, 'aria-label': `Nama bundle ${i + 1}` });
      const best = el('button', { type: 'button', class: 'gen-best', 'aria-pressed': String(b.best), title: 'Tandai BEST DEAL' }, 'BEST DEAL');
      const hapus = el('button', { type: 'button', class: 'kecil bahaya', 'aria-label': `Hapus bundle ${i + 1}` }, 'Hapus');
      const desk = el('textarea', { value: b.deskripsi, rows: 2, 'aria-label': 'Deskripsi' });
      const namaEn = el('input', { type: 'text', value: b.nama_en, placeholder: 'opsional' });
      const deskEn = el('textarea', { value: b.deskripsi_en, rows: 2, placeholder: 'opsional' });
      const harga = el('input', { type: 'number', min: '1000', step: '500', value: b.harga || '', 'aria-label': 'Harga promo' });
      const stok = el('input', { type: 'number', min: '0', max: '9999', step: '1', value: b.stok ?? '', placeholder: 'tanpa batas', 'aria-label': 'Stok' });
      const tetap = el('input', { type: 'checkbox', id: `tetap${i}`, checked: b.tetap });
      const isiKotak = el('div', { class: 'gen-isi' });
      const info = el('div', { class: 'gen-info' });
      const tanda = el('div', { class: 'row', style: 'gap:6px;margin-top:6px' });
      const cari = el('input', { type: 'search', list: 'varianPoster', placeholder: '+ Tambah paket: ketik nama aplikasi atau kode', 'aria-label': 'Tambah paket' });

      const hitung = () => {
        // selama admin belum menyentuh centang "harga persis", ikuti aturan bawaan: persis kecuali di bawah modal
        if (!b.tetapDisentuh) {
          const h0 = hitungBundle({ ...b, tetap: true });
          b.tetap = !(h0.hpp != null && b.harga < h0.hpp);
          tetap.checked = b.tetap;
        }
        const h = hitungBundle(b);
        info.replaceChildren(
          el('span', {}, 'Normal katalog ', el('b', {}, rp(h.normal))),
          el('span', {}, 'Tampil di website ', el('b', {}, rp(h.tampil)), h.normal > h.tampil ? ` (hemat ${pct(1 - h.tampil / h.normal)})` : ''),
          h.hpp != null ? el('span', { class: h.tampil - h.hpp < 0 ? 'rugi' : '' }, 'Modal ', rp(h.hpp), ' → ', h.tampil - h.hpp < 0 ? 'rugi ' : 'untung ', el('b', {}, rp(Math.abs(h.tampil - h.hpp))))
            : el('span', {}, 'Modal: HPP belum lengkap'),
          b.harga_coret ? el('span', {}, 'Poster: dari ', rp(b.harga_coret)) : null);
        tanda.replaceChildren(...periksa(b).map(([k, t]) => el('span', { class: 'tag ' + k }, t)));
        const cek = draf.bundles.filter((x) => periksa(x).some(([k]) => k === 'merah')).length;
        ringkas.textContent = `${draf.bundles.length} bundle${cek ? ` · ${cek} perlu diperbaiki` : ''}`;
      };
      const gambarIsi = () => {
        isiKotak.replaceChildren(...b.items.map((it, j) => {
          const v = perKode.get(it.code);
          const qty = el('input', { type: 'number', min: '1', max: '12', step: '1', value: it.qty, 'aria-label': 'Jumlah', class: 'gen-qty' });
          qty.addEventListener('input', () => { it.qty = Math.min(12, Math.max(1, Math.round(Number(qty.value) || 1))); hitung(); });
          const keluar = el('button', { type: 'button', class: 'kecil bahaya', 'aria-label': 'Keluarkan paket' }, '×');
          keluar.addEventListener('click', () => { b.items.splice(j, 1); gambarIsi(); hitung(); });
          return el('div', { class: 'gen-paket' },
            el('span', { class: 'gen-paket-nama' }, el('b', {}, v ? v.aplikasi : it.code), v ? ` · ${v.tipe} · ${v.varian}` : ' (tidak ada di katalog)',
              el('span', { class: 'muted' }, v ? ` · ${rp(v.harga)}${v.stok === 'habis' ? ' · HABIS' : ''}` : '')),
            el('label', { class: 'row muted', style: 'gap:4px' }, '×', qty), keluar);
        }), cari);
      };
      cari.addEventListener('change', () => {
        const kode = cari.value.split(' · ')[0].trim().toUpperCase();
        cari.value = '';
        if (!perKode.has(kode)) return toast('Kode varian tidak ditemukan', true);
        const ada = b.items.find((x) => x.code === kode);
        if (ada) ada.qty = Math.min(12, ada.qty + 1); else b.items.push({ code: kode, qty: 1 });
        gambarIsi(); hitung();
      });
      nama.addEventListener('input', () => { b.nama = nama.value; });
      desk.addEventListener('input', () => { b.deskripsi = desk.value; });
      namaEn.addEventListener('input', () => { b.nama_en = namaEn.value; });
      deskEn.addEventListener('input', () => { b.deskripsi_en = deskEn.value; });
      harga.addEventListener('input', () => { b.harga = Math.round(Number(harga.value) || 0); hitung(); });
      stok.addEventListener('input', () => { b.stok = stok.value === '' ? null : Math.max(0, Math.round(Number(stok.value))); b.stokTerbaca = true; hitung(); });
      tetap.addEventListener('change', () => { b.tetap = tetap.checked; b.tetapDisentuh = true; hitung(); });
      best.addEventListener('click', () => { b.best = !b.best; best.setAttribute('aria-pressed', String(b.best)); });
      hapus.addEventListener('click', () => { draf.bundles.splice(i, 1); gambarDaftar(); });
      gambarIsi();
      hitung();
      return el('article', { class: 'gen-bundle' },
        el('div', { class: 'gen-kepala' }, el('span', { class: 'gen-no' }, i + 1), el('div', { style: 'flex:1 1 200px' }, nama), best, hapus),
        isian('Deskripsi', desk, b.deskripsi_poster && b.deskripsi_poster !== b.deskripsi ? `Teks asli poster: “${b.deskripsi_poster}”` : null),
        el('label', { class: 'f' }, 'Isi bundle (×2 = durasinya dua kali, mis. 1 Tahun ×2 = 2 tahun)'), isiKotak,
        el('div', { class: 'grid2' }, isian('Harga promo (Rp)', harga), isian('Stok bundle', stok, 'Kosong = tanpa batas. Berkurang otomatis tiap pesanan aktif.')),
        el('div', { class: 'row', style: 'margin-top:8px' }, tetap, el('label', { for: `tetap${i}` }, 'Pakai harga ini persis (boleh di bawah margin minimum)')),
        info, tanda,
        el('details', { style: 'margin-top:8px' }, el('summary', { class: 'muted' }, 'Bahasa Inggris (opsional)'),
          el('div', { class: 'grid2' }, isian('Nama (EN)', namaEn), isian('Deskripsi (EN)', deskEn))));
    }

    const tambah = el('button', { type: 'button', class: 'sec kecil' }, '+ Tambah bundle');
    tambah.addEventListener('click', () => { draf.bundles.push(bundleBaru({ nama: '' }, [], '')); gambarDaftar(); });
    const simpan = el('button', { type: 'button' }, 'Simpan & tampilkan di Promo');
    const draf2 = el('button', { type: 'button', class: 'sec' }, 'Simpan sebagai draf');
    const batal = el('button', { type: 'button', class: 'sec' }, 'Batal');
    batal.addEventListener('click', () => { editor.replaceChildren(); draf = null; });

    async function kirim(tampilkan) {
      const salah = draf.bundles.map((b, i) => [i, periksa(b).filter(([k]) => k === 'merah')]).filter(([, w]) => w.length);
      if (!judul.value.trim()) return toast('Isi judul promo', true);
      if (!draf.bundles.length) return toast('Belum ada bundle', true);
      if (salah.length) return toast(`Bundle ${salah.map(([i]) => i + 1).join(', ')} masih perlu diperbaiki (tanda merah)`, true);
      if (mulai.value && sampai.value && sampai.value < mulai.value) return toast('Tanggal berakhir sebelum tanggal mulai', true);
      const rugi = draf.bundles.filter((b) => { const h = hitungBundle(b); return h.hpp != null && h.tampil < h.hpp; });
      if (rugi.length && !confirm(`${rugi.map((b) => b.nama).join(', ')} dijual di bawah modal. Tetap simpan?`)) return;
      simpan.disabled = draf2.disabled = true;
      try {
        const banner = poster ? await unggahPoster() : null;
        const hasil = await q(supabase.rpc('simpan_kampanye', { p: {
          promo: { title: judul.value.trim(), title_en: judulEn.value.trim(), body: sub.value.trim(), body_en: subEn.value.trim(),
            banner_url: banner, lencana: lencana.value.trim(), warna: warna.value, kelompok: kel.value, starts_on: mulai.value, ends_on: sampai.value,
            is_active: tampilkan && aktif.checked },
          bundles: draf.bundles.map((b) => ({ name: b.nama.trim(), name_en: b.nama_en.trim(), description: b.deskripsi.trim(), description_en: b.deskripsi_en.trim(),
            price: b.harga, harga_tetap: b.tetap, stock_qty: b.stok, best_deal: b.best, is_active: true, items: b.items })),
        } }));
        toast(tampilkan ? 'Promo tersimpan dan tampil di website' : 'Tersimpan sebagai draf');
        ctx.muatUlang?.({ kampanyeBaru: hasil.promo, kelompok: kel.value });
      } catch (err) { toast('Gagal menyimpan: ' + err.message, true); simpan.disabled = draf2.disabled = false; }
    }
    simpan.addEventListener('click', () => kirim(true));
    draf2.addEventListener('click', () => kirim(false));

    gambarDaftar();
    editor.replaceChildren(el('div', { class: 'gen-editor' },
      el('h3', { class: 'judul-kecil' }, `Hasil bacaan ${sumber === 'ai' ? 'AI' : sumber === 'ocr' ? 'OCR' : 'teks'} — periksa sebelum disimpan`),
      el('div', { class: 'gen-tata' },
        el('div', { class: 'gen-poster' }, poster ? el('img', { src: poster.url, alt: 'Poster' }) : el('span', { class: 'muted' }, 'Tanpa poster'),
          el('label', { class: 'row muted', style: 'margin-top:8px' }, warna, 'Warna tema promo')),
        el('div', {},
          el('div', { class: 'grid2' }, isian('Judul promo', judul), isian('Lencana', lencana), isian('Tampil di kelompok', kel)),
          el('div', { class: 'grid2' }, isian('Subjudul', sub), isian('Mulai', mulai), isian('Berakhir (hari terakhir harga promo)', sampai, 'Promo & bundlenya hilang otomatis setelah tanggal ini (WIB).')),
          el('details', {}, el('summary', { class: 'muted' }, 'Judul & subjudul bahasa Inggris (opsional)'),
            el('div', { class: 'grid2' }, isian('Judul (EN)', judulEn), isian('Subjudul (EN)', subEn))))),
      daftar,
      el('div', { class: 'row', style: 'margin-top:10px' }, tambah, ringkas),
      el('div', { class: 'row', style: 'margin-top:14px' }, aktif, el('label', { for: 'genAktif' }, 'Langsung aktif di website')),
      el('div', { class: 'row gen-aksi' }, simpan, draf2, batal)));
    editor.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  function hitungBundle(b) {
    const vs = b.items.map((i) => ({ v: perKode.get(i.code), q: i.qty })).filter((x) => x.v);
    const normal = vs.reduce((s, x) => s + x.v.harga * x.q, 0);
    const hpp = vs.length && vs.every((x) => x.v.hpp != null) ? vs.reduce((s, x) => s + x.v.hpp * x.q, 0) : null;
    const batas = Math.min(normal, Math.ceil(vs.reduce((s, x) => s + (x.v.batas_bundle ?? x.v.harga) * x.q, 0) / 500) * 500);
    const h = b.harga || 0;
    const tampil = b.tetap ? Math.min(normal, h) : Math.min(normal, Math.max(h, batas));
    return { normal, hpp, batas, tampil, vs };
  }
  function periksa(b) {
    const w = [];
    const h = hitungBundle(b);
    if (!b.nama.trim()) w.push(['merah', 'Isi nama bundle']);
    if (!b.items.length) w.push(['merah', 'Pilih paket isinya']);
    if (b.items.some((i) => !perKode.has(i.code))) w.push(['merah', 'Ada kode yang tidak ada di katalog']);
    if (!(b.harga >= 1000)) w.push(['merah', 'Isi harga promo']);
    if (!b.items.length || !(b.harga >= 1000)) return w;
    for (const { v, q: n } of h.vs) {
      if (!v.tampil) w.push(['merah', `${v.aplikasi} ${v.varian} disembunyikan di katalog`]);
      else if (v.stok === 'habis') w.push(['kuning', `${v.aplikasi} ${v.varian} sedang habis — bundle tampil HABIS`]);
      else if (v.stok_jumlah != null && v.stok_jumlah < n) w.push(['kuning', `Stok ${v.aplikasi} ${v.varian} tinggal ${v.stok_jumlah}`]);
    }
    if (b.harga >= h.normal) w.push(['kuning', `Tidak lebih murah dari harga normal katalog (${rp(h.normal)})`]);
    if (b.harga_coret && Math.abs(h.normal - b.harga_coret) / b.harga_coret > 0.03) {
      w.push(['kuning', `Poster bilang "dari ${rp(b.harga_coret)}", katalog ${rp(h.normal)}. Harga coret di website memakai harga katalog.`]);
    }
    if (h.hpp != null && h.tampil < h.hpp) w.push(['rugi', `Di bawah modal: rugi ${rp(h.hpp - h.tampil)}`]);
    else if (h.hpp != null && b.harga < h.hpp) w.push(['kuning', `Harga poster di bawah modal (rugi ${rp(h.hpp - b.harga)}), jadi website memakai ${rp(h.tampil)}`]);
    if (!b.tetap && b.harga < h.batas && !(h.hpp != null && b.harga < h.hpp)) w.push(['kuning', `Website akan memakai ${rp(h.batas)} (batas untung minimum). Centang "Pakai harga ini persis" kalau harga poster yang kamu mau.`]);
    if (h.hpp == null) w.push(['kuning', 'HPP sebagian paket belum diisi, untung belum bisa dihitung']);
    if (!b.stokTerbaca && b.stok == null) w.push(['kuning', 'Stok tidak terbaca dari poster, isi kalau ada batasnya']);
    if (b.catatan) w.push(['biru', b.catatan]);
    return w;
  }

  return el('section', { class: 'card', id: 'generator' },
    el('h2', {}, 'Generator promo dari poster'),
    el('p', { class: 'sub' }, 'Unggah poster story promo. Sistem membaca nama paket, harga, potongan, stok, BEST DEAL, dan tanggal berakhirnya, lalu mencocokkannya dengan katalog. Periksa hasilnya, lalu simpan supaya tampil di halaman Promo lengkap dengan hitung mundur dan sisa stok.'),
    kotakAi,
    el('div', { class: 'gen-langkah' },
      pratinjau,
      el('div', {},
        isian('1. Pilih poster (JPG/PNG/WebP)', pilihFile),
        isian('Kelompok (kosong = ikut poster)', kelompok),
        el('div', { class: 'row', style: 'margin-top:12px' }, tombolAi, tombolOcr),
        el('details', { style: 'margin-top:10px' }, el('summary', { class: 'muted' }, 'Atau tempel teks poster'), tempel,
          el('div', { class: 'row', style: 'margin-top:6px' }, tombolTeks)))),
    progres, datalist, editor);
}
