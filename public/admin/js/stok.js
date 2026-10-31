// Menu Stok & harga: jumlah stok (+/−), Tersedia/Habis, harga satuan, tambah & ubah varian.
// Dibuat untuk dipakai di HP: satu varian satu baris kartu, tombol besar.
import { el, isian, q, rp, toast, waktu } from './alat.js';

let saringan = 'semua';
let kataCari = '';

/** "1 Bulan" → 30, "3 Hari" → 3, "2 Minggu" → 14, "1 Tahun" → 365. Null kalau tidak terbaca. */
export function tebakHari(label) {
  const s = String(label ?? '').toLowerCase();
  if (/lifetime|selamanya|permanen/.test(s)) return null;
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(hari|day|minggu|week|bulan|bln|month|tahun|thn|year|b\b)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  const kali = { hari: 1, day: 1, minggu: 7, week: 7, bulan: 30, bln: 30, month: 30, b: 30, tahun: 365, thn: 365, year: 365 }[m[2]];
  return Math.round(n * kali);
}

const hargaMinimum = (hpp, s) => (hpp == null || !s ? null
  : Math.ceil(Math.max(hpp + s.min_margin_rp, hpp / (1 - s.min_margin_pct)) / 500) * 500);
const angka = (v) => { const d = String(v ?? '').replace(/\D/g, ''); return d === '' ? null : Number(d); };

export async function halamanStok(supabase, halaman) {
  let rows, apps, cek, aturan;
  try {
    [rows, apps, cek, aturan] = await Promise.all([
      q(supabase.from('v_katalog_admin')
        .select('code,aplikasi,app_id,tipe,varian,harga,hpp,stok,tampil,stok_jumlah,durasi_hari,stok_diubah')
        .order('sort_kategori').order('sort_aplikasi').order('sort_tipe').order('sort_varian').order('code')),
      q(supabase.from('apps').select('id,name').order('name')),
      q(supabase.from('stock_checks').select('checked_at').eq('id', 1).maybeSingle()),
      q(supabase.from('pricing_settings').select('min_margin_pct,min_margin_rp').eq('id', 1).maybeSingle()),
    ]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Stok & harga butuh migration stok (20261108000000_stok_varian.sql). Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  const segarkan = () => halamanStok(supabase, halaman);
  const editor = el('div');
  const daftar = el('div');
  const tab = el('div', { class: 'row tab', role: 'group', 'aria-label': 'Saring stok' });

  const SARING = [
    ['semua', 'Semua', () => true],
    ['sedikit', 'Sisa ≤ 3', (r) => r.stok_jumlah != null && r.stok_jumlah <= 3 && r.stok !== 'habis'],
    ['habis', 'Habis', (r) => r.stok === 'habis'],
    ['sembunyi', 'Disembunyikan', (r) => !r.tampil],
  ];

  // ---------------------------------------------------------------- satu baris varian
  function baris(r) {
    const kotak = el('div', { class: 'varian-baris' + (r.tampil ? '' : ' redup') });
    const gambarUlang = () => kotak.replaceChildren(...isiBaris(r, kotak, gambarUlang));
    gambarUlang();
    return kotak;
  }

  function isiBaris(r, kotak, gambarUlang) {
    const sibuk = (b, janji) => { b.disabled = true; return janji.finally(() => { b.disabled = false; }); };
    const terapkan = (h) => { r.stok_jumlah = h.jumlah ?? null; r.stok = h.stok; r.stok_diubah = h.diubah || new Date().toISOString(); gambarUlang(); };

    // harga satuan: ketuk untuk mengubah
    const tombolHarga = el('button', { type: 'button', class: 'harga-ubah', 'aria-label': `Ubah harga ${r.tipe} ${r.varian}` }, rp(r.harga), el('span', { 'aria-hidden': 'true' }, ' ✎'));
    tombolHarga.addEventListener('click', () => {
      const inp = el('input', { type: 'text', inputmode: 'numeric', value: String(r.harga), 'aria-label': 'Harga baru', class: 'harga-input' });
      const min = hargaMinimum(r.hpp, aturan);
      const info = el('div', { class: 'muted' }, r.hpp != null ? `HPP ${rp(r.hpp)} · harga aman minimal ${rp(min)}` : 'HPP belum diisi');
      const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
      const batal = el('button', { type: 'button', class: 'kecil sec', onclick: gambarUlang }, 'Batal');
      const kirim = () => {
        const baru = angka(inp.value);
        if (!baru || baru < 1000) return toast('Harga minimal Rp1.000', true);
        if (baru === r.harga) return gambarUlang();
        if (min && baru < min && !confirm(`Rp${baru.toLocaleString('id-ID')} di bawah harga aman ${rp(min)} (HPP + margin minimum). Tetap simpan?`)) return;
        sibuk(simpan, q(supabase.rpc('simpan_varian', { p: { code: r.code, tipe: r.tipe, varian: r.varian, harga: baru, durasi_hari: r.durasi_hari } })))
          .then((h) => { r.harga = h.harga; toast(`${r.aplikasi} ${r.varian}: ${rp(h.harga)}`); gambarUlang(); })
          .catch((err) => toast('Gagal: ' + err.message, true));
      };
      simpan.addEventListener('click', kirim);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') kirim(); if (e.key === 'Escape') gambarUlang(); });
      kotak.querySelector('.kolom-harga').replaceChildren(el('div', { class: 'row' }, inp, simpan, batal), info);
      inp.focus(); inp.select();
    });

    // stok: dihitung (− angka +) atau cukup Tersedia/Habis
    let stok;
    if (r.stok_jumlah != null) {
      const kurang = el('button', { type: 'button', class: 'langkah', 'aria-label': 'Kurangi 1' }, '−');
      const tambah = el('button', { type: 'button', class: 'langkah', 'aria-label': 'Tambah 1' }, '+');
      const jml = el('input', { type: 'text', inputmode: 'numeric', class: 'jumlah', value: String(r.stok_jumlah), 'aria-label': `Sisa stok ${r.tipe} ${r.varian}` });
      kurang.disabled = r.stok_jumlah <= 0;
      const ubah = (b, arg) => sibuk(b, q(supabase.rpc('ubah_jumlah_stok', { p_code: r.code, ...arg }))).then(terapkan)
        .catch((err) => { toast('Gagal: ' + err.message, true); gambarUlang(); });
      kurang.addEventListener('click', () => ubah(kurang, { p_delta: -1 }));
      tambah.addEventListener('click', () => ubah(tambah, { p_delta: 1 }));
      jml.addEventListener('change', () => {
        const n = angka(jml.value);
        if (n == null) return gambarUlang();
        ubah(jml, { p_jumlah: n });
      });
      jml.addEventListener('focus', () => jml.select());
      stok = el('div', { class: 'stok-hitung' },
        el('div', { class: 'stepper' }, kurang, jml, tambah),
        el('span', { class: 'tag ' + (r.stok === 'habis' ? 'merah' : r.stok_jumlah <= 3 ? 'kuning' : 'hijau') }, r.stok === 'habis' ? 'Habis' : `Sisa ${r.stok_jumlah}`));
    } else {
      const saklar = el('button', { type: 'button', class: 'kecil saklar ' + (r.stok === 'habis' ? 'habis' : 'ada') }, r.stok === 'habis' ? 'Habis' : 'Tersedia');
      saklar.addEventListener('click', () => {
        const baru = r.stok === 'habis' ? 'tersedia' : 'habis';
        sibuk(saklar, q(supabase.rpc('ubah_stok', { p_code: r.code, p_stok: baru })))
          .then((h) => { const st = h?.stok ?? baru; terapkan({ jumlah: null, stok: st }); toast(`${r.aplikasi} ${r.varian}: ${st === 'habis' ? 'Habis' : 'Tersedia'}`); })
          .catch((err) => toast('Gagal: ' + err.message, true));
      });
      const hitung = el('button', { type: 'button', class: 'tautan kecil' }, 'Hitung jumlah');
      hitung.addEventListener('click', () => {
        const awal = prompt(`Sisa stok ${r.aplikasi} ${r.tipe} ${r.varian} sekarang berapa?`, r.stok === 'habis' ? '0' : '');
        const n = angka(awal);
        if (n == null) return;
        sibuk(hitung, q(supabase.rpc('ubah_jumlah_stok', { p_code: r.code, p_jumlah: n }))).then(terapkan)
          .catch((err) => toast('Gagal: ' + err.message, true));
      });
      stok = el('div', { class: 'stok-hitung' }, saklar, hitung);
    }

    return [
      el('div', { class: 'kolom-nama' },
        el('b', {}, `${r.tipe} · ${r.varian}`),
        el('div', { class: 'muted' }, `${r.code}${r.durasi_hari ? ` · ${r.durasi_hari} hari` : ''}${r.stok_diubah ? ` · stok diubah ${waktu(r.stok_diubah)}` : ''}`),
        r.tampil ? null : el('span', { class: 'tag' }, 'disembunyikan')),
      el('div', { class: 'kolom-harga' }, tombolHarga),
      stok,
      el('button', { type: 'button', class: 'sec kecil tombol-ubah', onclick: () => buka(r) }, 'Ubah'),
    ];
  }

  // ---------------------------------------------------------------- form tambah / ubah varian
  function buka(r = {}, appAwal = null) {
    const baru = !r.code;
    const app = el('select', { 'aria-label': 'Aplikasi' }, el('option', { value: '' }, '— pilih aplikasi —'),
      apps.map((a) => el('option', { value: a.id, selected: (r.app_id ?? appAwal) === a.id }, a.name)));
    const daftarTipe = el('datalist', { id: 'daftar-tipe' });
    const isiTipe = () => daftarTipe.replaceChildren(...[...new Set(rows.filter((x) => String(x.app_id) === app.value).map((x) => x.tipe))].map((t) => el('option', { value: t })));
    app.addEventListener('change', isiTipe); isiTipe();
    const tipe = el('input', { type: 'text', list: 'daftar-tipe', value: r.tipe || '', maxlength: 60, placeholder: 'mis. Sharing, Private, 1P1U' });
    const varian = el('input', { type: 'text', value: r.varian || '', maxlength: 60, placeholder: 'mis. 1 Bulan' });
    const hari = el('input', { type: 'number', min: 1, max: 36500, value: r.durasi_hari ?? '', placeholder: 'otomatis dari nama' });
    let hariDiubah = !baru;
    hari.addEventListener('input', () => { hariDiubah = true; });
    varian.addEventListener('input', () => { if (!hariDiubah) hari.value = tebakHari(varian.value) ?? ''; });
    const harga = el('input', { type: 'text', inputmode: 'numeric', value: r.harga ?? '', placeholder: 'mis. 45000' });
    const hpp = el('input', { type: 'text', inputmode: 'numeric', value: r.hpp ?? '', placeholder: 'modal per akun (opsional)' });
    const aman = el('div', { class: 'muted' });
    const cekAman = () => {
      const min = hargaMinimum(angka(hpp.value), aturan), h = angka(harga.value);
      aman.textContent = min ? `Harga aman minimal ${rp(min)}${h && h < min ? ' — harga sekarang di bawahnya!' : ''}` : 'Isi HPP supaya diskon & komisi dihitung aman.';
      aman.className = h && min && h < min ? 'msg warn' : 'muted';
    };
    harga.addEventListener('input', cekAman); hpp.addEventListener('input', cekAman); cekAman();
    const hitung = el('input', { type: 'checkbox', id: 'vHitung' });
    hitung.checked = r.stok_jumlah != null;
    const jumlah = el('input', { type: 'text', inputmode: 'numeric', value: r.stok_jumlah ?? '', placeholder: '0' });
    const kotakJumlah = isian('Sisa stok', jumlah);
    const tampilJumlah = () => { kotakJumlah.hidden = !hitung.checked; };
    hitung.addEventListener('change', tampilJumlah); tampilJumlah();
    const tampil = el('input', { type: 'checkbox', id: 'vTampil' });
    tampil.checked = r.tampil !== false;

    const simpan = el('button', { type: 'button' }, baru ? 'Tambah varian' : 'Simpan varian');
    simpan.addEventListener('click', async () => {
      const p = {
        code: r.code || null, app_id: app.value ? Number(app.value) : null, tipe: tipe.value.trim(), varian: varian.value.trim(),
        harga: angka(harga.value), durasi_hari: hari.value ? Number(hari.value) : null, hpp: angka(hpp.value),
        hitung: hitung.checked, jumlah: hitung.checked ? angka(jumlah.value) ?? 0 : null, tampil: tampil.checked,
      };
      if (!p.app_id) return toast('Pilih aplikasinya', true);
      if (!p.tipe || !p.varian) return toast('Isi tipe akun dan nama varian', true);
      if (!p.harga || p.harga < 1000) return toast('Harga minimal Rp1.000', true);
      const min = hargaMinimum(p.hpp, aturan);
      if (min && p.harga < min && !confirm(`Harga di bawah harga aman ${rp(min)}. Tetap simpan?`)) return;
      simpan.disabled = true;
      try {
        const h = await q(supabase.rpc('simpan_varian', { p }));
        toast(h.baru ? `Varian ${h.code} ditambahkan` : 'Varian tersimpan');
        segarkan();
      } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
    });

    editor.replaceChildren(el('div', { class: 'item-form' },
      el('h3', { style: 'margin:0' }, baru ? 'Varian baru' : `Ubah ${r.code}: ${r.aplikasi}`),
      el('div', { class: 'grid2' },
        isian('Aplikasi', app), el('div', {}, isian('Tipe akun', tipe, 'Pilih yang ada atau ketik tipe baru.'), daftarTipe),
        isian('Nama varian', varian), isian('Durasi (hari)', hari, '1 bulan = 30, 1 tahun = 365. Dipakai untuk masa aktif & bonus rakitan.'),
        isian('Harga jual', harga), isian('HPP / modal (opsional, tidak tampil di website)', hpp)),
      aman,
      el('div', { class: 'row', style: 'margin-top:10px' }, hitung, el('label', { for: 'vHitung' }, 'Hitung jumlah stok (otomatis Habis kalau 0)')),
      kotakJumlah,
      el('div', { class: 'row', style: 'margin-top:8px' }, tampil, el('label', { for: 'vTampil' }, 'Tampilkan di website')),
      el('div', { class: 'row', style: 'margin-top:12px' }, simpan, el('button', { type: 'button', class: 'sec', onclick: () => editor.replaceChildren() }, 'Tutup'))));
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    (baru ? (app.value ? tipe : app) : harga).focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- daftar
  const cari = el('input', { type: 'search', placeholder: 'Cari aplikasi atau varian…', 'aria-label': 'Cari', value: kataCari });
  function gambar() {
    tab.replaceChildren(...SARING.map(([k, l, c]) => el('button', {
      type: 'button', class: 'kecil ' + (k === saringan ? '' : 'sec'), 'aria-pressed': String(k === saringan),
      onclick: () => { saringan = k; gambar(); },
    }, `${l} (${rows.filter(c).length})`)));
    const kata = kataCari.trim().toLowerCase();
    const cocok = rows.filter(SARING.find(([k]) => k === saringan)[2])
      .filter((r) => !kata || `${r.aplikasi} ${r.tipe} ${r.varian} ${r.code}`.toLowerCase().includes(kata));
    const perApp = new Map();
    for (const r of cocok) { if (!perApp.has(r.app_id)) perApp.set(r.app_id, []); perApp.get(r.app_id).push(r); }
    daftar.replaceChildren(...(cocok.length ? [...perApp].map(([id, isi]) => el('div', { class: 'app-grup' },
      el('div', { class: 'row', style: 'justify-content:space-between' }, el('h3', {}, isi[0].aplikasi),
        el('button', { type: 'button', class: 'tautan kecil', onclick: () => buka({}, id) }, '+ varian')),
      ...isi.map(baris))) : [el('p', { class: 'muted' }, 'Tidak ada yang cocok.')]));
  }
  cari.addEventListener('input', () => { kataCari = cari.value; gambar(); });

  const cekLagi = el('button', { type: 'button', class: 'sec kecil' }, 'Cek sekarang');
  const infoCek = el('span', { class: 'muted' }, `Stok dicek otomatis tiap 5 jam · terakhir ${waktu(cek?.checked_at)}`);
  cekLagi.addEventListener('click', async () => {
    cekLagi.disabled = true;
    try { const h = await q(supabase.rpc('sinkron_stok')); infoCek.textContent = `Stok dicek otomatis tiap 5 jam · terakhir ${waktu(h.dicek)}`; toast(h.dirapikan ? `${h.dirapikan} status stok dirapikan` : 'Stok sudah cocok semua'); }
    catch (err) { toast('Gagal: ' + err.message, true); }
    finally { cekLagi.disabled = false; }
  });

  gambar();
  halaman.replaceChildren(el('section', { class: 'card' },
    el('h2', {}, 'Stok & harga'),
    el('p', { class: 'sub' }, 'Ubah harga, sisa stok, dan varian langsung dari sini (HP atau laptop). Perubahan langsung tampil di website dan tercatat di Riwayat. Stok yang dihitung otomatis berkurang 1 saat pesanan jadi Aktif dan kembali kalau pesanan dibatalkan.'),
    el('div', { class: 'row' }, infoCek, cekLagi),
    el('div', { class: 'row', style: 'margin-top:10px' }, el('div', { style: 'flex:1 1 220px' }, cari),
      el('button', { type: 'button', onclick: () => buka() }, '+ Varian baru')),
    el('div', { style: 'margin-top:10px' }, tab),
    editor, daftar));
}
