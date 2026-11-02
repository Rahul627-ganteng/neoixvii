// Menu Promo & bundle: generator dari poster, bundle harga tetap, promo/kampanye, dan aturan diskon Rakit Bundle.
import { el, isian, q, rp, tabel, td, toast } from './alat.js';
import { kartuGenerator } from './promo-poster.js';

const pct = (x) => (x == null ? '–' : (Number(x) * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%');
const MAKS_BANNER = 2 * 1024 * 1024;

export async function halamanPromo(supabase, halaman, opsi = {}) {
  const [aturan, durasi, setelan, bundles, ringkas, items, promos, varian, statusAi] = await Promise.all([
    q(supabase.from('bundle_rules').select('*').order('min_apps')),
    q(supabase.from('bundle_duration_rules').select('*').order('min_days')),
    q(supabase.from('pricing_settings').select('*').eq('id', 1).single()),
    q(supabase.from('bundles').select('*').order('sort').order('id')),
    q(supabase.from('v_bundle_admin').select('*')),
    // kolom qty ada sejak migration poster_promo; panel lama tetap jalan tanpa itu
    q(supabase.from('bundle_items').select('bundle_id,variant_id,qty')).catch(() => q(supabase.from('bundle_items').select('bundle_id,variant_id'))),
    q(supabase.from('promos').select('*').order('sort').order('id')),
    q(supabase.from('v_katalog_admin').select('code,aplikasi,tipe,varian,harga,hpp,harga_minimum,batas_bundle,batas_diskon_manual,stok,tampil,durasi_hari,stok_jumlah')
      .order('sort_kategori').order('sort_aplikasi').order('sort_tipe').order('sort_varian')),
    q(supabase.rpc('status_ai')).catch(() => null),
  ]);
  const idVarian = await q(supabase.from('variants').select('id,code'));
  const ctx = { supabase, halaman, setelan, varian, promos, kodeKeId: new Map(idVarian.map((v) => [v.code, v.id])), idKeKode: new Map(idVarian.map((v) => [v.id, v.code])) };
  ctx.muatUlang = (o) => halamanPromo(supabase, halaman, o);
  const berhasil = opsi.kampanyeBaru ? el('div', { class: 'msg ok', style: 'margin:0 0 16px' },
    'Kampanye tersimpan. ', el('a', { href: `/promo/?k=${opsi.kelompok || ''}`, target: '_blank', rel: 'noopener' }, 'Lihat di halaman Promo ↗')) : null;
  halaman.replaceChildren(...[
    berhasil,
    kartuGenerator(ctx, statusAi),
    kartuBundle(ctx, bundles, ringkas, items),
    kartuPromoList(ctx, promos, bundles),
    kartuAturan(ctx, aturan, durasi),
    kartuBatas(ctx)].filter(Boolean));
  if (berhasil) berhasil.scrollIntoView({ block: 'start' });
}

// ---------------------------------------------------------------- unggah banner
// Kelompok di halaman Promo Terkini (kosong = otomatis dari kategori aplikasinya)
const KELOMPOK = [['', 'Otomatis (dari kategori aplikasi)'], ['editing', 'Aplikasi Editing'], ['ai', 'Aplikasi AI'], ['streaming', 'Aplikasi Streaming'], ['lainnya', 'Lainnya']];
const pilihKelompok = (nilai) => el('select', { 'aria-label': 'Kelompok promo' }, KELOMPOK.map(([k, l]) => el('option', { value: k, selected: (nilai || '') === k }, l)));

function pilihBanner(supabase, awalan, saatBerubah, urlAwal) {
  let url = urlAwal || null;
  const pratinjau = el('div', { class: 'banner-pratinjau' });
  const gambar = () => pratinjau.replaceChildren(url ? el('img', { src: url, alt: '' }) : el('span', { class: 'muted' }, 'Belum ada banner'));
  gambar();
  const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Pilih banner' });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    if (f.size > MAKS_BANNER) { toast('Banner maksimal 2 MB', true); file.value = ''; return; }
    try {
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${awalan}-${Date.now()}.${ext}`;
      await q(supabase.storage.from('banners').upload(path, f, { upsert: true, contentType: f.type, cacheControl: '3600' }));
      url = supabase.storage.from('banners').getPublicUrl(path).data.publicUrl;
      gambar(); saatBerubah(url); toast('Banner terunggah. Klik Simpan untuk memakainya.');
    } catch (err) { toast('Gagal mengunggah: ' + err.message, true); }
    file.value = '';
  });
  const hapus = el('button', { type: 'button', class: 'sec kecil', onclick: () => { url = null; gambar(); saatBerubah(null); } }, 'Hapus banner');
  return el('div', {}, el('label', { class: 'f' }, 'Banner (opsional, JPG/PNG/WebP maks. 2 MB, ukuran disarankan 1600×700)'),
    pratinjau, el('div', { class: 'row', style: 'margin-top:6px' }, file, hapus));
}

// ---------------------------------------------------------------- 1. aturan diskon
function kartuAturan(ctx, aturan, durasi) {
  const { supabase, setelan } = ctx;
  const daftar = el('div');
  const baris = (r) => {
    const min = el('input', { type: 'number', min: '2', max: '20', step: '1', value: r.min_apps ?? '', 'aria-label': 'Jumlah aplikasi minimum' });
    const persen = el('input', { type: 'number', min: '0.5', max: '50', step: '0.5', value: r.discount_pct != null ? +(r.discount_pct * 100).toFixed(2) : '', 'aria-label': 'Diskon (%)' });
    const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
    const hapus = el('button', { type: 'button', class: 'kecil bahaya' }, 'Hapus');
    const kotak = el('div', { class: 'row aturan' }, el('label', { class: 'row muted' }, 'Mulai', min, 'aplikasi →'),
      el('label', { class: 'row muted' }, 'diskon hingga', persen, '%'), simpan, hapus);
    simpan.addEventListener('click', async () => {
      const m = Math.round(Number(min.value)), p = Number(persen.value);
      if (!(m >= 2 && m <= 20) || !(p > 0 && p <= 50)) return toast('Isi 2–20 aplikasi dan diskon 0,5–50%', true);
      const isi = { min_apps: m, discount_pct: p / 100, updated_at: new Date().toISOString() };
      try {
        Object.assign(r, r.id ? await q(supabase.from('bundle_rules').update(isi).eq('id', r.id).select().single())
          : await q(supabase.from('bundle_rules').insert(isi).select().single()));
        toast('Aturan diskon tersimpan');
      } catch (err) { toast(/duplicate|unique/i.test(err.message) ? 'Sudah ada aturan untuk jumlah aplikasi itu' : 'Gagal: ' + err.message, true); }
    });
    hapus.addEventListener('click', async () => {
      if (r.id && !confirm('Hapus aturan ini?')) return;
      try { if (r.id) await q(supabase.from('bundle_rules').delete().eq('id', r.id)); kotak.remove(); toast('Aturan dihapus'); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });
    return kotak;
  };
  daftar.append(...aturan.map(baris));
  const tambah = el('button', { type: 'button', class: 'sec kecil', onclick: () => daftar.append(baris({})) }, '+ Tambah tingkat');

  // simulasi
  const kode = el('input', { type: 'text', placeholder: 'Kode varian, mis. V0004, V0171, V0097', 'aria-label': 'Kode varian untuk simulasi' });
  const hasil = el('div', { class: 'muted' });
  const hitung = el('button', { type: 'button', class: 'sec kecil' }, 'Hitung');
  hitung.addEventListener('click', async () => {
    const daftarKode = kode.value.toUpperCase().split(/[\s,]+/).filter(Boolean);
    if (!daftarKode.length) return;
    try {
      const h = await q(supabase.rpc('bundle_quote', { p_codes: daftarKode }));
      hasil.replaceChildren(`${h.jumlah_app} aplikasi · normal ${rp(h.total_normal)} · diskon ${rp(h.diskon)} (aturan ${pct(h.persen)}${Number(h.bonus_durasi) ? ` + bonus durasi s.d. ${pct(h.bonus_durasi)}` : ''}) · total ${rp(h.total)}`);
    } catch (err) { hasil.replaceChildren(el('span', { style: 'color:var(--red)' }, err.message)); }
  });

  // bonus durasi
  const daftarDurasi = el('div');
  const barisDurasi = (r) => {
    const hari = el('select', { 'aria-label': 'Durasi minimum' },
      [[30, '1 bulan'], [60, '2 bulan'], [90, '3 bulan'], [180, '6 bulan'], [365, '1 tahun'], [730, '2 tahun']].map(([h, l]) =>
        el('option', { value: h, selected: Number(r.min_days ?? 90) === h }, l)));
    if (r.min_days && ![30, 60, 90, 180, 365, 730].includes(r.min_days)) hari.append(el('option', { value: r.min_days, selected: true }, `${r.min_days} hari`));
    const persen = el('input', { type: 'number', min: '0.5', max: '30', step: '0.5', value: r.extra_pct != null ? +(r.extra_pct * 100).toFixed(2) : '', 'aria-label': 'Bonus (%)' });
    const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
    const hapus = el('button', { type: 'button', class: 'kecil bahaya' }, 'Hapus');
    const kotak = el('div', { class: 'row aturan' }, el('label', { class: 'row muted' }, 'Paket mulai', hari, '→'),
      el('label', { class: 'row muted' }, 'bonus +', persen, '%'), simpan, hapus);
    simpan.addEventListener('click', async () => {
      const p = Number(persen.value);
      if (!(p > 0 && p <= 30)) return toast('Bonus harus 0,5–30%', true);
      const isi = { min_days: Number(hari.value), extra_pct: p / 100, updated_at: new Date().toISOString() };
      try {
        Object.assign(r, r.id ? await q(supabase.from('bundle_duration_rules').update(isi).eq('id', r.id).select().single())
          : await q(supabase.from('bundle_duration_rules').insert(isi).select().single()));
        toast('Bonus durasi tersimpan');
      } catch (err) { toast(/duplicate|unique/i.test(err.message) ? 'Sudah ada bonus untuk durasi itu' : 'Gagal: ' + err.message, true); }
    });
    hapus.addEventListener('click', async () => {
      if (r.id && !confirm('Hapus bonus ini?')) return;
      try { if (r.id) await q(supabase.from('bundle_duration_rules').delete().eq('id', r.id)); kotak.remove(); toast('Bonus dihapus'); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });
    return kotak;
  };
  daftarDurasi.append(...durasi.map(barisDurasi));
  const tambahDurasi = el('button', { type: 'button', class: 'sec kecil', onclick: () => daftarDurasi.append(barisDurasi({})) }, '+ Tambah bonus durasi');

  return el('section', { class: 'card' },
    el('h2', {}, 'Diskon Rakit Bundle'),
    el('p', { class: 'sub' }, 'Diskon tiap paket = diskon jumlah aplikasi + bonus durasi. Makin banyak aplikasi dan makin panjang durasinya, makin besar diskonnya. Angka awal hanya contoh, ubah sesuai keputusanmu.'),
    el('div', { class: 'msg warn', style: 'margin:0 0 10px' },
      `Kamu tidak akan pernah rugi: diskon tiap paket berhenti di harga minimum (HPP + margin minimum ${pct(setelan.min_margin_pct)} / ${rp(setelan.min_margin_rp)} di menu Margin). `,
      `Paket tanpa HPP memakai batas di kartu "Batas diskon paket tanpa HPP" di bawah.`),
    el('h3', { class: 'judul-kecil' }, 'Menurut jumlah aplikasi'),
    daftar, el('div', { class: 'row', style: 'margin-top:10px' }, tambah),
    el('h3', { class: 'judul-kecil' }, 'Bonus durasi panjang (ditambahkan ke diskon jumlah aplikasi)'),
    daftarDurasi, el('div', { class: 'row', style: 'margin-top:10px' }, tambahDurasi),
    el('label', { class: 'f' }, 'Simulasi (pakai aturan yang sudah tersimpan)'),
    el('div', { class: 'row' }, el('div', { style: 'flex:1 1 260px' }, kode), hitung), hasil);
}

// ---------------------------------------------------------------- batas diskon paket tanpa HPP
function kartuBatas(ctx) {
  const { supabase, setelan, varian, kodeKeId } = ctx;
  const rows = varian.filter((v) => !(v.hpp > 0) || v.batas_diskon_manual != null);
  const baris = (v) => {
    const persen = el('input', { type: 'number', min: '0', max: '50', step: '0.5', style: 'width:80px',
      value: v.batas_diskon_manual != null ? +(v.batas_diskon_manual * 100).toFixed(2) : '', placeholder: (+(setelan.bundle_fallback_pct * 100).toFixed(2)).toString(),
      'aria-label': `Batas diskon ${v.code}` });
    const terendah = el('span', { class: 'muted' });
    const hitung = () => {
      const p = persen.value === '' ? Number(setelan.bundle_fallback_pct) : Number(persen.value) / 100;
      const batas = v.hpp > 0 ? v.batas_bundle : v.harga - Math.floor(v.harga * p);
      terendah.textContent = rp(batas);
    };
    persen.addEventListener('input', hitung);
    hitung();
    const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
    simpan.addEventListener('click', async () => {
      const kosong = persen.value === '';
      const p = Number(persen.value);
      if (!kosong && !(p >= 0 && p <= 50)) return toast('Isi 0–50%, atau kosongkan untuk memakai pengaturan umum', true);
      try {
        await q(supabase.from('variant_costs').upsert({ variant_id: kodeKeId.get(v.code), bundle_max_pct: kosong ? null : p / 100 }, { onConflict: 'variant_id' }));
        v.batas_diskon_manual = kosong ? null : p / 100;
        toast(`${v.aplikasi} ${v.varian}: batas diskon tersimpan`);
      } catch (err) { toast('Gagal: ' + err.message, true); }
    });
    return el('tr', {}, td(v.code), td(`${v.aplikasi} · ${v.tipe} · ${v.varian}`), td(rp(v.harga), true),
      td(v.hpp == null ? el('span', { class: 'tag kuning' }, 'kosong') : v.hpp === 0 ? el('span', { class: 'tag kuning' }, '0') : rp(v.hpp), true),
      td(el('label', { class: 'row muted' }, persen, '%')), td(terendah, true), td(simpan));
  };
  return el('section', { class: 'card' },
    el('h2', {}, 'Batas diskon paket tanpa HPP'),
    el('p', { class: 'sub' }, `Paket ini belum punya HPP (atau HPP-nya 0), jadi sistem tidak bisa menghitung batas untungnya sendiri. `,
      `Isi berapa persen paket ini boleh dipotong di bundle. Kosong = pakai pengaturan umum di menu Margin (sekarang ${pct(setelan.bundle_fallback_pct)}). `,
      `Kalau nanti HPP-nya diisi lewat Excel, batas dari HPP yang dipakai.`),
    rows.length ? tabel(['Kode', 'Paket', '>Harga', '>HPP', 'Boleh dipotong', '>Harga terendah', ''], rows.map(baris))
      : el('p', { class: 'muted' }, 'Semua paket sudah punya HPP.'));
}

// ---------------------------------------------------------------- 2. bundle harga tetap
function kartuBundle(ctx, bundles, ringkas, items) {
  const { supabase, varian, idKeKode } = ctx;
  const perKode = new Map(varian.map((v) => [v.code, v]));
  const editor = el('div');
  const daftar = el('div');

  const namaKampanye = new Map((ctx.promos || []).map((p) => [p.id, p.title]));
  const peringatan = (r) => {
    if (!r) return [];
    const w = [];
    if (r.jumlah_item < 1) w.push(['merah', 'Belum ada paket']);
    if (r.jumlah_item && r.price < r.batas_aman && !r.harga_tetap) w.push(['merah', `Di bawah batas untung, website memakai ${rp(r.harga_tampil)}`]);
    if (r.jumlah_item && r.harga_tetap && r.ada_hpp_kosong === false && r.price < r.total_hpp) w.push(['merah', `Di bawah modal (rugi ${rp(r.total_hpp - r.price)})`]);
    if (r.total_normal && r.price >= r.total_normal) w.push(['kuning', 'Tidak lebih murah dari harga normal']);
    if (r.jumlah_item && !r.semua_tersedia) w.push(['kuning', 'Ada paket habis/tersembunyi']);
    if (r.stock_qty === 0) w.push(['merah', 'Stok habis']);
    if (b0(r) && r.berlaku === false && r.is_active) w.push(['kuning', 'Tidak tampil (di luar tanggal / kampanye mati)']);
    return w;
  };
  const b0 = (r) => r && 'berlaku' in r;
  const gambarDaftar = () => {
    daftar.replaceChildren(bundles.length ? tabel(['Bundle', '>Harga', '>Normal', '>Stok', 'Status', ''],
      bundles.map((b) => {
        const r = ringkas.find((x) => x.id === b.id);
        return el('tr', {}, td(el('span', {}, el('b', {}, b.name), b.best_deal ? el('span', { class: 'tag merah', style: 'margin-left:6px' }, 'BEST') : null, el('br'),
          el('span', { class: 'muted' }, `${r?.jumlah_item ?? 0} paket${b.promo_id && namaKampanye.has(b.promo_id) ? ` · ${namaKampanye.get(b.promo_id)}` : ''}`))),
          td(el('span', {}, rp(r?.harga_tampil ?? b.price), r && r.harga_tampil !== b.price ? el('span', { class: 'muted' }, el('br'), `diisi ${rp(b.price)}`) : null), true),
          td(rp(r?.total_normal), true),
          td(b.stock_qty == null ? '∞' : `${b.stock_qty}${b.stock_awal ? `/${b.stock_awal}` : ''}`, true),
          td(el('div', { class: 'row', style: 'gap:4px' }, el('span', { class: 'tag ' + (b.is_active ? 'hijau' : '') }, b.is_active ? 'aktif' : 'draf'),
            peringatan(r).map(([k, t]) => el('span', { class: 'tag ' + k }, t)))),
          td(el('button', { type: 'button', class: 'sec kecil', onclick: () => buka(b) }, 'Ubah')));
      })) : el('p', { class: 'muted' }, 'Belum ada bundle.'));
  };

  function buka(b) {
    const terpilih = items.filter((i) => i.bundle_id === b.id).map((i) => ({ code: idKeKode.get(i.variant_id), qty: i.qty ?? 1 })).filter((i) => i.code);
    let banner = b.banner_url || null;
    const nama = el('input', { type: 'text', value: b.name || '', placeholder: 'mis. Nonton Hemat' });
    const namaEn = el('input', { type: 'text', value: b.name_en || '', placeholder: 'mis. Binge Saver' });
    const kelompokB = pilihKelompok(b.kelompok);
    const desk = el('textarea', { value: b.description || '' });
    const deskEn = el('textarea', { value: b.description_en || '' });
    const harga = el('input', { type: 'number', min: '1000', step: '500', value: b.price ?? '' });
    const stok = el('input', { type: 'number', min: '0', max: '9999', step: '1', value: b.stock_qty ?? '', placeholder: 'tanpa batas' });
    const best = el('input', { type: 'checkbox', id: 'bundleBest', checked: !!b.best_deal });
    const tetap = el('input', { type: 'checkbox', id: 'bundleTetap', checked: !!b.harga_tetap });
    const kampanye = el('select', { 'aria-label': 'Kampanye' }, el('option', { value: '' }, 'Tidak ada (bundle biasa)'),
      (ctx.promos || []).map((p) => el('option', { value: p.id, selected: b.promo_id === p.id }, p.title)));
    const mulai = el('input', { type: 'date', value: b.starts_on || '' });
    const selesai = el('input', { type: 'date', value: b.ends_on || '' });
    const aktif = el('input', { type: 'checkbox', id: 'bundleAktif' });
    aktif.checked = !!b.is_active;
    const daftarIsi = el('div');
    const hitungan = el('div', { class: 'msg', style: 'margin-top:8px' });

    const cari = el('input', { type: 'search', list: 'daftarVarian', placeholder: 'Ketik nama aplikasi atau kode, lalu pilih', 'aria-label': 'Tambah paket' });
    const datalist = el('datalist', { id: 'daftarVarian' }, varian.filter((v) => v.tampil).map((v) =>
      el('option', { value: `${v.code} · ${v.aplikasi} · ${v.tipe} · ${v.varian} · ${rp(v.harga)}` })));
    cari.addEventListener('change', () => {
      const kode = cari.value.split(' · ')[0].trim().toUpperCase();
      cari.value = '';
      if (!perKode.has(kode)) return toast('Kode varian tidak ditemukan', true);
      const ada = terpilih.find((x) => x.code === kode);
      if (ada) ada.qty = Math.min(12, ada.qty + 1); else terpilih.push({ code: kode, qty: 1 });
      gambarIsi();
    });

    function gambarIsi() {
      const rows = terpilih.map((t) => ({ ...perKode.get(t.code), t })).filter((v) => v.code);
      daftarIsi.replaceChildren(rows.length ? tabel(['Kode', 'Paket', 'Jumlah', '>Harga', '>Harga terendah', 'Stok', ''], rows.map((v) => {
        const qty = el('input', { type: 'number', min: '1', max: '12', step: '1', value: v.t.qty, style: 'width:64px', 'aria-label': `Jumlah ${v.code}` });
        qty.addEventListener('change', () => { v.t.qty = Math.min(12, Math.max(1, Math.round(Number(qty.value) || 1))); gambarIsi(); });
        return el('tr', {},
          td(v.code), td(`${v.aplikasi} · ${v.tipe} · ${v.varian}`), td(el('label', { class: 'row muted', style: 'gap:4px' }, '×', qty)),
          td(rp(v.harga * v.t.qty), true), td(rp(v.batas_bundle * v.t.qty), true),
          td(el('span', { class: 'tag ' + (v.stok === 'habis' || !v.tampil ? 'merah' : 'hijau') }, !v.tampil ? 'tersembunyi' : v.stok === 'habis' ? 'habis' : 'tersedia')),
          td(el('button', { type: 'button', class: 'kecil bahaya', onclick: () => { terpilih.splice(terpilih.indexOf(v.t), 1); gambarIsi(); } }, 'Keluarkan')));
      }))
        : el('p', { class: 'muted' }, 'Belum ada paket. Tambahkan minimal 1.'));
      const normal = rows.reduce((s, v) => s + v.harga * v.t.qty, 0);
      const batas = rows.length ? Math.min(normal, Math.ceil(rows.reduce((s, v) => s + v.batas_bundle * v.t.qty, 0) / 500) * 500) : null;
      const modal = rows.length && rows.every((v) => v.hpp != null) ? rows.reduce((s, v) => s + v.hpp * v.t.qty, 0) : null;
      const h = Number(harga.value);
      const teks = [`Harga normal ${rp(normal)}`];
      let kelas = 'ok';
      if (batas != null) teks.push(`harga terendah yang masih untung ${rp(batas)}`);
      if (h > 0 && normal) {
        teks.push(`harga bundle ${rp(h)} (hemat ${pct(1 - h / normal)})`);
        if (batas != null && h < batas && !tetap.checked) { kelas = 'err'; teks.push(`DI BAWAH BATAS UNTUNG: website akan memakai ${rp(batas)}`); }
        if (modal != null && h < modal && tetap.checked) { kelas = 'err'; teks.push(`DI BAWAH MODAL: rugi ${rp(modal - h)}`); }
        if (h >= normal) { kelas = 'warn'; teks.push('tidak lebih murah dari harga normal'); }
      }
      hitungan.className = 'msg ' + kelas;
      hitungan.textContent = teks.join(' · ');
    }
    harga.addEventListener('input', gambarIsi);
    tetap.addEventListener('change', gambarIsi);
    gambarIsi();

    const simpan = el('button', { type: 'button' }, 'Simpan bundle');
    simpan.addEventListener('click', async () => {
      const h = Math.round(Number(harga.value));
      if (!nama.value.trim() || !(h >= 1000)) return toast('Isi nama dan harga bundle', true);
      if (terpilih.length < 1) return toast('Bundle butuh minimal 1 paket', true);
      if (hitungan.classList.contains('err') && !confirm(tetap.checked ? 'Harga ini di bawah modal. Tetap simpan?' : 'Harga ini di bawah batas untung, jadi website otomatis memakai harga terendah yang masih untung. Lanjut simpan?')) return;
      const isi = {
        name: nama.value.trim(), name_en: namaEn.value.trim() || null, kelompok: kelompokB.value || null, description: desk.value.trim() || null, description_en: deskEn.value.trim() || null,
        price: h, starts_on: mulai.value || null, ends_on: selesai.value || null, is_active: aktif.checked, banner_url: banner, updated_at: new Date().toISOString(),
        stock_qty: stok.value === '' ? null : Math.max(0, Math.round(Number(stok.value))), best_deal: best.checked, harga_tetap: tetap.checked,
        promo_id: kampanye.value ? Number(kampanye.value) : null,
      };
      simpan.disabled = true;
      try {
        const baru = b.id ? await q(supabase.from('bundles').update(isi).eq('id', b.id).select().single())
          : await q(supabase.from('bundles').insert({ ...isi, sort: (bundles.length + 1) * 10 }).select().single());
        await q(supabase.from('bundle_items').delete().eq('bundle_id', baru.id));
        await q(supabase.from('bundle_items').insert(terpilih.map((t) => ({ bundle_id: baru.id, variant_id: ctx.kodeKeId.get(t.code), qty: t.qty }))));
        toast('Bundle tersimpan');
        halamanPromo(supabase, ctx.halaman);
      } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
    });
    const hapus = el('button', { type: 'button', class: 'bahaya' }, 'Hapus bundle');
    hapus.addEventListener('click', async () => {
      if (!b.id || !confirm(`Hapus bundle "${b.name}"?`)) return;
      try { await q(supabase.from('bundles').delete().eq('id', b.id)); toast('Bundle dihapus'); halamanPromo(supabase, ctx.halaman); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });

    editor.replaceChildren(el('div', { class: 'item-form' },
      el('h3', { style: 'margin:0' }, b.id ? `Ubah: ${b.name}` : 'Bundle baru'),
      el('div', { class: 'grid2' }, isian('Nama bundle', nama), isian('Nama bahasa Inggris (opsional)', namaEn), isian('Tampil di kelompok', kelompokB)),
      el('div', { class: 'grid2' }, isian('Deskripsi', desk), isian('Deskripsi bahasa Inggris', deskEn)),
      el('label', { class: 'f' }, 'Isi bundle'), daftarIsi, el('div', { style: 'margin-top:8px' }, cari), datalist,
      el('div', { class: 'grid2' }, isian('Harga bundle (Rp)', harga), isian('Stok bundle', stok, 'Kosong = tanpa batas'), isian('Bagian dari kampanye', kampanye)),
      el('div', { class: 'grid2' }, isian('Mulai tanggal (opsional)', mulai), isian('Sampai tanggal (opsional)', selesai)),
      el('div', { class: 'row', style: 'margin-top:10px' }, tetap, el('label', { for: 'bundleTetap' }, 'Pakai harga ini persis (boleh di bawah margin minimum)')),
      el('div', { class: 'row', style: 'margin-top:6px' }, best, el('label', { for: 'bundleBest' }, 'Tandai BEST DEAL')),
      hitungan,
      pilihBanner(supabase, 'bundle', (u) => { banner = u; }, banner),
      el('div', { class: 'row', style: 'margin-top:12px' }, aktif, el('label', { for: 'bundleAktif' }, 'Aktif (tampil di halaman Promo)')),
      el('div', { class: 'row', style: 'margin-top:12px' }, simpan, b.id ? hapus : null,
        el('button', { type: 'button', class: 'sec', onclick: () => editor.replaceChildren() }, 'Tutup'))));
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  gambarDaftar();
  return el('section', { class: 'card' },
    el('h2', {}, 'Bundle harga tetap'),
    el('p', { class: 'sub' }, 'Paket gabungan atau paket promo dengan satu harga. Bundle yang stoknya habis tampil dengan tanda HABIS; bundle hilang dari website kalau ada paket yang disembunyikan atau kampanyenya selesai.'),
    daftar, el('div', { class: 'row', style: 'margin-top:10px' }, el('button', { type: 'button', class: 'sec kecil', onclick: () => buka({}) }, '+ Bundle baru')),
    editor);
}

// ---------------------------------------------------------------- 3. promo
function kartuPromoList(ctx, promos, bundles = []) {
  const { supabase } = ctx;
  const daftar = el('div');
  const form = (p) => {
    let banner = p.banner_url || null;
    const isiKampanye = bundles.filter((b) => b.promo_id && b.promo_id === p.id);
    const lencana = el('input', { type: 'text', value: p.lencana || '', maxlength: 40, placeholder: 'mis. Last Day Sale!' });
    const warna = el('input', { type: 'color', value: p.warna || '#800203', 'aria-label': 'Warna tema' });
    const judul = el('input', { type: 'text', value: p.title || '', placeholder: 'Judul promo' });
    const judulEn = el('input', { type: 'text', value: p.title_en || '', placeholder: 'Title (opsional)' });
    const kelompokP = pilihKelompok(p.kelompok);
    const isi = el('textarea', { value: p.body || '', placeholder: 'Keterangan singkat' });
    const isiEn = el('textarea', { value: p.body_en || '', placeholder: 'Short description (opsional)' });
    const tautan = el('input', { type: 'text', value: p.link_url || '', placeholder: 'mis. /rakit/ atau /aplikasi/?app=netflix' });
    const mulai = el('input', { type: 'date', value: p.starts_on || '' });
    const selesai = el('input', { type: 'date', value: p.ends_on || '' });
    const aktif = el('input', { type: 'checkbox' });
    aktif.checked = p.is_active !== false;
    const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
    const hapus = el('button', { type: 'button', class: 'kecil bahaya' }, 'Hapus');
    const kotak = el('div', { class: 'item-form' },
      isiKampanye.length ? el('div', { class: 'msg ok', style: 'margin:0 0 6px' }, `Kampanye dengan ${isiKampanye.length} bundle: ${isiKampanye.map((b) => b.name).join(', ')}. Mematikan promo ini ikut menyembunyikan bundlenya.`) : null,
      el('div', { class: 'grid2' }, isian('Judul', judul), isian('Judul bahasa Inggris', judulEn), isian('Tampil di kelompok', kelompokP)),
      el('div', { class: 'grid2' }, isian('Keterangan', isi), isian('Keterangan bahasa Inggris', isiEn)),
      el('div', { class: 'grid2' }, isian('Lencana (opsional)', lencana), isian('Warna tema', warna)),
      el('div', { class: 'grid2' }, isian('Tautan tombol "Lihat" (opsional)', tautan, 'Awali dengan / untuk halaman di website ini, atau https://'),
        isian('Mulai tanggal (opsional)', mulai), isian('Sampai tanggal (opsional)', selesai)),
      pilihBanner(supabase, 'promo', (u) => { banner = u; }, banner),
      el('div', { class: 'row', style: 'margin-top:10px' }, el('label', { class: 'row muted' }, aktif, 'Aktif'), simpan, hapus));
    simpan.addEventListener('click', async () => {
      const link = tautan.value.trim();
      if (!judul.value.trim()) return toast('Judul wajib diisi', true);
      if (link && !/^(\/|https:\/\/)/.test(link)) return toast('Tautan harus diawali / atau https://', true);
      if (mulai.value && selesai.value && selesai.value < mulai.value) return toast('Tanggal selesai sebelum tanggal mulai', true);
      const baris = {
        title: judul.value.trim(), title_en: judulEn.value.trim() || null, kelompok: kelompokP.value || null, body: isi.value.trim() || null, body_en: isiEn.value.trim() || null,
        link_url: link || null, starts_on: mulai.value || null, ends_on: selesai.value || null, is_active: aktif.checked, banner_url: banner,
        updated_at: new Date().toISOString(),
      };
      if ('lencana' in p || isiKampanye.length || lencana.value.trim()) Object.assign(baris, { lencana: lencana.value.trim() || null, warna: warna.value });
      try {
        Object.assign(p, p.id ? await q(supabase.from('promos').update(baris).eq('id', p.id).select().single())
          : await q(supabase.from('promos').insert({ ...baris, sort: (promos.length + 1) * 10 }).select().single()));
        toast('Promo tersimpan');
      } catch (err) { toast('Gagal: ' + err.message, true); }
    });
    hapus.addEventListener('click', async () => {
      if (p.id && !confirm(isiKampanye.length ? `Hapus promo ini beserta ${isiKampanye.length} bundlenya?` : 'Hapus promo ini?')) return;
      try {
        if (p.id && isiKampanye.length) { await q(supabase.rpc('hapus_kampanye', { p_promo: p.id })); toast('Kampanye dihapus'); return ctx.muatUlang(); }
        if (p.id) await q(supabase.from('promos').delete().eq('id', p.id));
        kotak.remove(); toast('Promo dihapus');
      } catch (err) { toast('Gagal: ' + err.message, true); }
    });
    return kotak;
  };
  daftar.append(...promos.map(form));
  return el('section', { class: 'card' },
    el('h2', {}, 'Promo & kampanye'),
    el('p', { class: 'sub' }, 'Pengumuman promo di halaman Promo. Kampanye dari generator poster tampil sebagai satu blok dengan hitung mundur dan bundlenya. Promo dengan tanggal selesai otomatis hilang setelah lewat tanggalnya.'),
    daftar, el('div', { class: 'row', style: 'margin-top:10px' },
      el('button', { type: 'button', class: 'sec kecil', onclick: () => { const p = {}; promos.push(p); daftar.append(form(p)); } }, '+ Tambah promo')));
}
