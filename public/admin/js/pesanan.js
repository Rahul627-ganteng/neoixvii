// Menu Pesanan: daftar pesanan dari website, ubah status, hubungi pembeli lewat WhatsApp, pantau masa aktif.
import { el, q, rp, toast, waktu, hariIni, tautanWa } from './alat.js';
import { pesanGaransiLink, pesanGaransiManual } from './garansi-baca.js';
import { formPesananBaru, SUMBER } from './pesanan-baru.js';
import { formGaransiManual } from './garansi-manual.js';

export const STATUS = {
  menunggu_bayar: { label: 'Menunggu bayar', kelas: 'kuning' },
  dibayar: { label: 'Dibayar', kelas: 'biru' },
  aktif: { label: 'Aktif', kelas: 'hijau' },
  selesai: { label: 'Selesai', kelas: '' },
  batal: { label: 'Batal', kelas: 'merah' },
};
const SARING = [
  { kunci: 'proses', label: 'Perlu diproses', cocok: (o) => o.status === 'menunggu_bayar' || o.status === 'dibayar' },
  { kunci: 'aktif', label: 'Aktif', cocok: (o) => o.status === 'aktif' },
  { kunci: 'selesai', label: 'Selesai / batal', cocok: (o) => o.status === 'selesai' || o.status === 'batal' },
  { kunci: 'semua', label: 'Semua', cocok: () => true },
];
let saringan = 'proses';

// saringan tambahan: aplikasi, kategori, periode tanggal, dan urutan (bertahan selama panel terbuka)
const PERIODE = [
  ['semua', 'Semua waktu'], ['hari', 'Hari ini'], ['7', '7 hari terakhir'], ['30', '30 hari terakhir'],
  ['bulan', 'Bulan ini'], ['bulan-lalu', 'Bulan lalu'], ['pilih', 'Pilih tanggal…'],
];
const URUT = [
  ['baru', 'Terbaru dulu'], ['lama', 'Terlama dulu'], ['total', 'Total terbesar'], ['akhir', 'Paling cepat berakhir'],
  ['g-tanggal', 'Kelompokkan per tanggal'], ['g-app', 'Kelompokkan per aplikasi'], ['g-kategori', 'Kelompokkan per kategori'],
];
const KATEGORI_PRODUK = { ebook: 'Ebook', template: 'Template', preset: 'Preset', kelas: 'Kelas', lainnya: 'Produk digital' };
const BATAS = 300;            // tanpa periode: 300 pesanan terbaru
const BATAS_PERIODE = 1000;   // dengan periode: sampai 1000 pesanan di rentang itu
const pilihan = { app: '', kategori: '', periode: 'semua', dari: '', sampai: '', urut: '' };

const geserHari = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
/** Tanggal (WIB) sebuah waktu, format YYYY-MM-DD. */
const tglWib = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
/** Rentang tanggal WIB { dari, sampai } (keduanya ikut) untuk pilihan periode; null = semua waktu. */
export function rentangPeriode(p, dari = '', sampai = '', hari = hariIni()) {
  switch (p) {
    case 'hari': return { dari: hari, sampai: hari };
    case '7': return { dari: geserHari(hari, -6), sampai: hari };
    case '30': return { dari: geserHari(hari, -29), sampai: hari };
    case 'bulan': return { dari: hari.slice(0, 8) + '01', sampai: hari };
    case 'bulan-lalu': { const akhir = geserHari(hari.slice(0, 8) + '01', -1); return { dari: akhir.slice(0, 8) + '01', sampai: akhir }; }
    case 'pilih': {
      if (!dari && !sampai) return null;
      return dari && sampai && dari > sampai ? { dari: sampai, sampai: dari } : { dari: dari || null, sampai: sampai || null };
    }
    default: return null;
  }
}

/**
 * Pemeta item pesanan → { app, kategori }: lewat varian katalog (varian → tipe → aplikasi → kategori),
 * produk digital (kategori produk), atau nama item manual ("Canva 2 Tahun" → Canva, sama seperti cocokkan_app di database).
 */
export function buatPemetaItem({ apps = [], grup = [], varian = [], produk = [] }) {
  const appById = new Map(apps.map((a) => [a.id, { app: a.name, kategori: a.categories?.label || 'Lainnya' }]));
  const appDariGrup = new Map(grup.map((g) => [g.id, g.app_id]));
  const lewatId = new Map(); const lewatKode = new Map();
  for (const v of varian) {
    const a = appById.get(appDariGrup.get(v.group_id));
    if (a) { lewatId.set(v.id, a); if (v.code) lewatKode.set(v.code, a); }
  }
  const katProduk = new Map(produk.map((p) => [p.id, KATEGORI_PRODUK[p.kategori] || 'Produk digital']));
  const norm = (x) => String(x ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const panjangDulu = [...appById.values()].sort((a, b) => b.app.length - a.app.length);
  return (i) => {
    if (i.produk_id) return { app: i.app_name, kategori: katProduk.get(i.produk_id) || 'Produk digital' };
    const a = lewatId.get(i.variant_id) || lewatKode.get(i.variant_code);
    if (a) return a;
    const n = norm(i.app_name);
    return panjangDulu.find((x) => n === norm(x.app) || n.startsWith(norm(x.app) + ' ')) || { app: i.app_name || 'Lainnya', kategori: 'Lainnya' };
  };
}

const tanggal = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
/** Tanggal paling awal akun bisa berakhir (1 bulan = 27–30 hari). */
const akhirAwal = (o) => o.ends_earliest || o.ends_on;
/** Status garansi pesanan: aktif / menunggu form (≤ 24 jam) / tidak aktif. */
export function statusGaransi(o, sekarang = Date.now()) {
  const g = o.warranties?.[0];
  if (g) return g.status === 'aktif' ? { kunci: 'aktif', label: 'Garansi aktif ✓', kelas: 'hijau' }
    : { kunci: 'tidak', label: g.on_time === false ? 'Garansi tidak aktif · form lewat 24 jam' : 'Garansi tidak aktif', kelas: 'merah' };
  if (o.status !== 'aktif' && o.status !== 'selesai') return null;
  if (!('warranties' in o)) return null;   // migration garansi belum dijalankan
  const batas = o.delivered_at ? Date.parse(o.delivered_at) + 864e5 : null;
  if (batas && sekarang < batas) {
    const jam = Math.max(1, Math.ceil((batas - sekarang) / 36e5));
    return { kunci: 'menunggu', label: `Menunggu form garansi · sisa ${jam} jam`, kelas: 'kuning' };
  }
  return { kunci: 'tidak', label: 'Garansi tidak aktif · belum isi form', kelas: 'merah' };
}

/** Sisa hari sampai ends_on (zona waktu WIB). */
export function sisaHari(ends, hari = hariIni()) {
  if (!ends) return null;
  return Math.round((Date.parse(ends + 'T00:00:00Z') - Date.parse(hari + 'T00:00:00Z')) / 86400000);
}
const usd = (n) => (n == null ? '' : ' · ' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n));

export async function halamanPesanan(supabase, halaman) {
  const ambil = (kolom, rentang) => {
    let r = supabase.from('orders').select(kolom).order('created_at', { ascending: false });
    if (rentang?.dari) r = r.gte('created_at', rentang.dari + 'T00:00:00+07:00');
    if (rentang?.sampai) r = r.lt('created_at', geserHari(rentang.sampai, 1) + 'T00:00:00+07:00');
    return q(r.limit(rentang ? BATAS_PERIODE : BATAS));
  };
  const dasar = '*,order_items(app_name,plan_label,variant_label,price,duration_days)';
  const item = 'id,app_name,plan_label,variant_label,price,duration_days,hpp,variant_id,variant_code';
  const lengkap = ',reviews(rating,status),warranties(id,on_time,status)';
  // kolom ulasan, garansi, HPP, dan produk digital baru ada setelah migration Tahap 8 / garansi / pesanan_admin_laporan / produk_digital
  let kolomDipakai = null;
  const daftarKolom = [`*,order_items(${item},produk_id)${lengkap}`, `*,order_items(${item})${lengkap}`,
    `*,order_items(id,app_name,plan_label,variant_label,price,duration_days,hpp)${lengkap}`,
    dasar + lengkap, dasar + ',reviews(rating,status)', dasar];
  const muat = async (rentang) => {
    if (kolomDipakai) return ambil(kolomDipakai, rentang);
    let galat;
    for (const k of daftarKolom) {
      try { const r = await ambil(k, rentang); kolomDipakai = k; return r; } catch (e) { galat = e; }
    }
    throw galat;
  };
  // katalog untuk menentukan aplikasi & kategori setiap item (sekali per halaman)
  const [apps, grup, varian, produk, awal] = await Promise.all([
    q(supabase.from('apps').select('id,name,categories(label)')).catch(() => []),
    q(supabase.from('plan_groups').select('id,app_id')).catch(() => []),
    q(supabase.from('variants').select('id,code,group_id')).catch(() => []),
    q(supabase.from('produk').select('id,kategori')).catch(() => []),
    muat(rentangPeriode(pilihan.periode, pilihan.dari, pilihan.sampai)),
  ]);
  const petakan = buatPemetaItem({ apps, grup, varian, produk });
  // semua pesanan yang sudah dimuat (id → pesanan); periode yang dipilih menambah pesanan lama ke sini
  const semua = new Map();
  let pesanan = [];
  let penuh = false;   // hasil terakhir terpotong batas
  const tambah = (rows, rentang) => {
    for (const o of rows) {
      if (semua.has(o.id)) continue;
      o._tgl = tglWib(o.created_at);
      o._isi = (o.order_items || []).map((i) => ({ ...petakan(i), harga: Number(i.price) || 0 }));
      o._app = [...new Set(o._isi.map((x) => x.app))];
      o._kat = [...new Set(o._isi.map((x) => x.kategori))];
      semua.set(o.id, o);
    }
    pesanan = [...semua.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    penuh = rows.length >= (rentang ? BATAS_PERIODE : BATAS);
  };
  tambah(awal, rentangPeriode(pilihan.periode, pilihan.dari, pilihan.sampai));
  // affiliate (setelah migration affiliate): pesanan bisa diatasnamakan affiliate → komisi otomatis saat Aktif
  const mitra = pesanan.some((o) => 'partner_id' in o)
    ? await q(supabase.from('partners').select('id,name,kind,referral_code,is_active').order('name')).catch(() => []) : [];

  const cari = el('input', { type: 'search', placeholder: 'Cari kode, nama, nomor WhatsApp, atau aplikasi…', 'aria-label': 'Cari pesanan' });
  const tab = el('div', { class: 'row tab', role: 'group', 'aria-label': 'Saring pesanan' });
  const daftar = el('div');
  const ringkas = el('div', { class: 'stats' });

  // ---------------------------------------------------------------- saringan aplikasi / kategori / tanggal / urutan
  const pilihApp = el('select', { 'aria-label': 'Saring aplikasi' });
  const pilihKat = el('select', { 'aria-label': 'Saring kategori' });
  const pilihPeriode = el('select', { 'aria-label': 'Periode tanggal pesanan' },
    PERIODE.map(([k, l]) => el('option', { value: k, selected: k === pilihan.periode }, l)));
  const tglDari = el('input', { type: 'date', value: pilihan.dari, max: hariIni(), 'aria-label': 'Dari tanggal' });
  const tglSampai = el('input', { type: 'date', value: pilihan.sampai, max: hariIni(), 'aria-label': 'Sampai tanggal' });
  const wadahTgl = el('div', { class: 'row tgl-pesanan' + (pilihan.periode === 'pilih' ? '' : ' hidden') },
    el('span', { class: 'muted' }, 'dari'), tglDari, el('span', { class: 'muted' }, 'sampai'), tglSampai);
  const pilihUrut = el('select', { 'aria-label': 'Urutkan pesanan' }, URUT.map(([k, l]) => el('option', { value: k }, l)));
  const reset = el('button', { type: 'button', class: 'sec kecil' }, 'Reset saringan');
  const infoHasil = el('p', { class: 'muted info-hasil' });
  const label = (teks, kontrol) => el('label', { class: 'saring-pesanan-isi' }, el('span', {}, teks), kontrol);
  const saringBar = el('div', { class: 'saring-pesanan' },
    label('Aplikasi', pilihApp), label('Kategori', pilihKat), label('Tanggal', pilihPeriode), label('Urutkan', pilihUrut),
    wadahTgl, el('div', { class: 'row' }, reset));

  /** Isi pilihan aplikasi & kategori dari pesanan yang sudah dimuat (dengan jumlah pesanan). */
  const isiPilihan = () => {
    const hitung = (f) => { const m = new Map(); for (const o of pesanan) for (const k of f(o)) m.set(k, (m.get(k) || 0) + 1); return m; };
    const opsi = (m, semuaLabel, dipilih) => {
      if (dipilih && !m.has(dipilih)) m.set(dipilih, 0);
      return [el('option', { value: '' }, semuaLabel),
        ...[...m].sort((a, b) => a[0].localeCompare(b[0], 'id')).map(([k, n]) => el('option', { value: k, selected: k === dipilih }, `${k} (${n})`))];
    };
    pilihApp.replaceChildren(...opsi(hitung((o) => o._app), 'Semua aplikasi', pilihan.app));
    pilihKat.replaceChildren(...opsi(hitung((o) => o._kat), 'Semua kategori', pilihan.kategori));
  };
  /** Periode berubah: ambil pesanan di rentang itu dari database (pesanan lama ikut termuat). */
  const muatPeriode = async () => {
    const r = rentangPeriode(pilihan.periode, pilihan.dari, pilihan.sampai);
    for (const c of [pilihPeriode, tglDari, tglSampai]) c.disabled = true;
    infoHasil.textContent = 'Memuat pesanan…';
    try { tambah(await muat(r), r); }
    catch (err) { toast('Gagal memuat: ' + err.message, true); }
    finally { for (const c of [pilihPeriode, tglDari, tglSampai]) c.disabled = false; }
    isiPilihan(); gambarRingkas(); gambarDaftar();
  };
  pilihApp.addEventListener('change', () => { pilihan.app = pilihApp.value; gambarDaftar(); });
  pilihKat.addEventListener('change', () => { pilihan.kategori = pilihKat.value; gambarDaftar(); });
  pilihUrut.addEventListener('change', () => { pilihan.urut = pilihUrut.value; gambarDaftar(); });
  pilihPeriode.addEventListener('change', () => {
    pilihan.periode = pilihPeriode.value;
    wadahTgl.classList.toggle('hidden', pilihan.periode !== 'pilih');
    if (pilihan.periode === 'pilih' && !pilihan.dari && !pilihan.sampai) { tglDari.focus(); gambarDaftar(); return; }
    muatPeriode();
  });
  for (const [input, kunci] of [[tglDari, 'dari'], [tglSampai, 'sampai']]) {
    input.addEventListener('change', () => { pilihan[kunci] = input.value; muatPeriode(); });
  }
  reset.addEventListener('click', () => {
    const tadi = pilihan.periode;
    Object.assign(pilihan, { app: '', kategori: '', periode: 'semua', dari: '', sampai: '', urut: '' });
    pilihPeriode.value = 'semua'; tglDari.value = ''; tglSampai.value = ''; cari.value = '';
    wadahTgl.classList.add('hidden');
    if (tadi !== 'semua') muatPeriode(); else { isiPilihan(); gambarDaftar(); }
  });

  const stat = (angka, label, kelas = '') => el('div', { class: 'stat ' + kelas }, el('b', {}, angka), el('span', {}, label));
  const gambarRingkas = () => {
    const segera = pesanan.filter((o) => o.status === 'aktif' && (sisaHari(akhirAwal(o)) ?? 99) <= 3).length;
    const tanpaGaransi = pesanan.filter((o) => statusGaransi(o)?.kunci === 'tidak').length;
    ringkas.replaceChildren(
      stat(pesanan.filter((o) => o.status === 'menunggu_bayar').length, 'menunggu bayar', 'kuning'),
      stat(pesanan.filter((o) => o.status === 'dibayar').length, 'dibayar, belum dikirim'),
      stat(pesanan.filter((o) => o.status === 'aktif').length, 'langganan aktif'),
      stat(segera, 'berakhir ≤ 3 hari (tawarkan perpanjang)', segera ? 'merah' : ''),
      stat(tanpaGaransi, 'aktif tapi garansi tidak aktif', tanpaGaransi ? 'kuning' : ''));
  };

  /** Garansi & ulasan: link form aktivasi garansi (sekaligus rating & ulasan) untuk pesanan Aktif/Selesai. */
  const salinTeks = async (teks, pesan) => {
    try { await navigator.clipboard.writeText(teks); toast(pesan); } catch { prompt('Salin teks ini:', teks); }
  };
  const bagianUlasan = (o) => {
    const tag = [];
    const g = o.warranties?.[0];
    const sg = statusGaransi(o);
    if (sg) tag.push(el('span', { class: 'tag ' + sg.kelas }, sg.label));
    if (o.reviews?.length) {
      const rata = o.reviews.reduce((s, r) => s + r.rating, 0) / o.reviews.length;
      tag.push(el('span', { class: 'tag hijau' }, `Sudah diulas ★${rata.toLocaleString('id-ID', { maximumFractionDigits: 1 })}`));
    }
    if (o.status !== 'aktif' && o.status !== 'selesai') return tag.length ? el('div', { class: 'row' }, tag) : null;
    const wadah = el('div', { class: 'row' }, tag);
    const slot = el('div');
    const luar = el('div', {}, wadah, slot);
    // admin mengaktifkan garansi sendiri (data dari pesanan, screenshot bisa ditempel)
    if ('warranties' in o && (!g || g.status !== 'aktif')) {
      wadah.append(el('button', { type: 'button', class: 'kecil', onclick: () => {
        slot.replaceChildren(formGaransiManual(supabase, o, {
          selesai: (h) => { o.warranties = [{ id: h.id, on_time: h.tepat_waktu, status: 'aktif' }]; gambarRingkas(); gambarDaftar(); },
          tutup: () => slot.replaceChildren(),
        }));
      } }, 'Aktifkan garansi'));
    }
    if (g && o.reviews?.length) return luar;
    // tanpa migration garansi: tetap link ulasan seperti sebelumnya
    const ulasanSaja = !!g || !('warranties' in o);
    const buat = el('button', { type: 'button', class: 'sec kecil' }, ulasanSaja ? 'Buat link ulasan' : 'Buat link garansi & ulasan');
    buat.addEventListener('click', async () => {
      buat.disabled = true;
      try {
        const h = await q(supabase.rpc('buat_link_ulasan', { p_kode: o.code }));
        const url = `${location.origin}/${ulasanSaja ? 'ulasan' : 'garansi'}/?t=${h.token}`;
        const teks = ulasanSaja
          ? (o.lang === 'en'
            ? `Hi ${o.customer_name}, thank you for subscribing at IXVII.CO 🙏 Could you leave a short review? This link is only for your order ${o.code} and works once:\n${url}`
            : `Halo ${o.customer_name}, terima kasih sudah berlangganan di IXVII.CO 🙏 Boleh minta ulasan singkatnya? Link ini khusus pesanan ${o.code} dan hanya bisa dipakai sekali:\n${url}`)
          : pesanGaransiLink(o, url);
        wadah.replaceChildren(...tag,
          el('a', { class: 'btn kecil wa', href: tautanWa(o.customer_wa, teks), target: '_blank', rel: 'noopener' }, ulasanSaja ? 'Kirim link ulasan lewat WhatsApp' : 'Kirim link garansi lewat WhatsApp'),
          el('button', { type: 'button', class: 'sec kecil', onclick: () => salinTeks(url, 'Link disalin') }, 'Salin link'));
      } catch (err) { toast('Gagal: ' + err.message, true); buat.disabled = false; }
    });
    wadah.append(buat);
    if (!ulasanSaja) wadah.append(el('button', { type: 'button', class: 'sec kecil', title: 'Format balasan teks seperti biasa; balasan pembeli bisa ditempel di menu Garansi',
      onclick: () => salinTeks(pesanGaransiManual(o), 'Template garansi disalin') }, 'Salin template manual'));
    return luar;
  };

  /** Ubah HPP item pesanan (misalnya modal promo). Komisi affiliate pesanan ikut dihitung ulang. */
  const bagianHpp = (o) => {
    const items = o.order_items ?? [];
    if (!items.length || !items.every((i) => 'hpp' in i && i.id)) return null;
    const total = Number(o.total) || 0;
    const untung = () => total - items.reduce((s, i) => s + (Number(i.hpp) || 0), 0);
    const ringkas = el('span', { class: 'muted' });
    const tulis = () => { const kosong = items.filter((i) => i.hpp == null).length; ringkas.textContent = `HPP ${rp(items.reduce((s, i) => s + (Number(i.hpp) || 0), 0))} · untung ${rp(untung())}${kosong ? ` · ${kosong} item tanpa HPP` : ''}`; };
    tulis();
    const slot = el('div');
    const tombol = el('button', { type: 'button', class: 'sec kecil' }, 'Ubah HPP');
    tombol.addEventListener('click', () => {
      const input = items.map((i) => el('input', { type: 'text', inputmode: 'numeric', value: i.hpp ?? '', placeholder: 'kosong', 'aria-label': `HPP ${i.app_name}` }));
      const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan HPP');
      simpan.addEventListener('click', async () => {
        const baru = items.map((i, k) => ({ id: i.id, hpp: input[k].value.replace(/\D/g, '') === '' ? null : Number(input[k].value.replace(/\D/g, '')) }));
        simpan.disabled = true;
        try {
          const h = await q(supabase.rpc('ubah_hpp_pesanan', { p_kode: o.code, p_items: baru }));
          baru.forEach((b, k) => { items[k].hpp = b.hpp; });
          tulis(); slot.replaceChildren();
          toast(`HPP ${o.code} tersimpan${h.komisi ? ` · komisi affiliate jadi ${rp(h.komisi)}` : ''}`);
        } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
      });
      slot.replaceChildren(el('div', { class: 'item-form' },
        el('p', { class: 'muted', style: 'margin:0 0 6px' }, 'HPP saat penjualan ini (misalnya modal promo). Laporan profit & komisi affiliate memakai angka ini.'),
        ...items.map((i, k) => el('div', { class: 'row baris-hpp' }, el('span', { style: 'flex:1 1 160px' }, `${i.app_name} · ${i.variant_label}`, el('br'), el('span', { class: 'muted' }, `harga ${rp(i.price)}`)), input[k])),
        el('div', { class: 'row', style: 'margin-top:8px' }, simpan, el('button', { type: 'button', class: 'sec kecil', onclick: () => slot.replaceChildren() }, 'Batal'))));
    });
    return el('div', { style: 'margin-top:6px' }, el('div', { class: 'row' }, ringkas, tombol), slot);
  };

  const kartu = (o) => {
    const st = STATUS[o.status] ?? { label: o.status, kelas: '' };
    const pilihStatus = el('select', { 'aria-label': `Status ${o.code}` },
      Object.entries(STATUS).map(([k, v]) => el('option', { value: k, selected: k === o.status }, v.label)));
    const catatan = el('input', { type: 'text', placeholder: 'Catatan admin (mis. email akun yang dikirim)', value: o.admin_note || '', 'aria-label': `Catatan ${o.code}` });
    const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
    simpan.addEventListener('click', async () => {
      simpan.disabled = true;
      try {
        const baru = await q(supabase.rpc('ubah_status_pesanan', { p_kode: o.code, p_status: pilihStatus.value, p_catatan: catatan.value.trim() }));
        Object.assign(o, baru);
        toast(`${o.code}: ${STATUS[o.status].label}`);
        gambarRingkas(); gambarDaftar();
      } catch (err) { toast('Gagal: ' + err.message, true); }
      finally { simpan.disabled = false; }
    });

    const en = o.lang === 'en';
    const sapa = en ? `Hi ${o.customer_name}, this is IXVII.CO about your order ${o.code}.` : `Halo ${o.customer_name}, ini admin IXVII.CO soal pesanan ${o.code}.`;
    const sisa = sisaHari(akhirAwal(o));
    const masa = o.starts_on
      ? el('span', {}, `Masa aktif ${tanggal(o.starts_on)} – ${o.ends_earliest && o.ends_earliest !== o.ends_on ? `${tanggal(o.ends_earliest)} s/d ` : ''}${tanggal(o.ends_on)}`,
        o.status === 'aktif' && sisa != null ? el('span', { class: 'tag ' + (sisa <= 3 ? 'merah' : '') }, sisa < 0 ? `lewat ${-sisa} hari` : `sisa ${sisa} hari`) : null)
      : null;

    return el('article', { class: 'pesanan item-form' },
      el('div', { class: 'row', style: 'justify-content:space-between' },
        el('div', {}, el('b', { class: 'kode' }, o.code), ' ', el('span', { class: 'tag ' + st.kelas }, st.label),
          en ? el('span', { class: 'tag' }, 'EN') : null,
          o.kind === 'bundle' ? el('span', { class: 'tag biru' }, 'Bundle: ' + (o.bundle_name || '–')) : null,
          o.kind === 'rakit' ? el('span', { class: 'tag biru' }, 'Rakitan') : null,
          o.channel && o.channel !== 'web' ? el('span', { class: 'tag' }, SUMBER[o.channel] || o.channel) : null,
          o.member_id ? el('span', { class: 'tag hijau' }, o.member_discount ? `Member -${rp(o.member_discount)}` : 'Member') : null,
          o.coupon_code ? el('span', { class: 'tag kuning' }, `Kupon ${o.coupon_code} -${rp(o.coupon_discount)}`) : null),
        el('span', { class: 'muted' }, waktu(o.created_at))),
      el('div', { class: 'row', style: 'margin-top:6px' },
        el('span', {}, o.customer_name), el('span', { class: 'muted' }, '+' + o.customer_wa),
        el('a', { class: 'btn kecil wa', href: tautanWa(o.customer_wa, sapa), target: '_blank', rel: 'noopener' }, 'Chat WhatsApp')),
      el('ul', { class: 'isi-pesanan' }, (o.order_items || []).map((i) =>
        el('li', {}, `${i.app_name} · ${i.plan_label} · ${i.variant_label}`, el('span', { class: 'num' }, rp(i.price))))),
      el('div', { class: 'row', style: 'justify-content:space-between' },
        el('b', {}, 'Total ', rp(o.total), el('span', { class: 'muted' }, usd(o.total_usd)),
          o.discount ? el('span', { class: 'muted' }, ` · diskon ${rp(o.discount)}`) : null), masa),
      el('div', { class: 'row atur', style: 'margin-top:8px' }, pilihStatus, catatan, simpan),
      bagianHpp(o),
      bagianAffiliate(o),
      el('div', { style: 'margin-top:8px' }, bagianUlasan(o)));
  };

  function bagianAffiliate(o) {
    if (!('partner_id' in o) || !mitra.length || o.status === 'batal') return null;
    const pilih = el('select', { 'aria-label': `Affiliate pesanan ${o.code}` }, el('option', { value: '' }, '— tanpa affiliate —'),
      mitra.filter((m) => m.is_active || m.id === o.partner_id).map((m) => el('option', { value: m.id, selected: m.id === o.partner_id },
        `${m.name}${m.referral_code ? ` (${m.referral_code})` : ''}${m.kind === 'reseller' ? ' · reseller' : ''}`)));
    const info = el('span', { class: 'muted' }, o.partner_id ? (o.status === 'aktif' || o.status === 'selesai' ? 'komisi tercatat' : 'komisi tercatat saat Aktif') : '');
    pilih.addEventListener('change', async () => {
      pilih.disabled = true;
      try {
        const h = await q(supabase.rpc('atur_affiliate_pesanan', { p_kode: o.code, p_partner: pilih.value ? Number(pilih.value) : null }));
        o.partner_id = h.partner;
        const nama = mitra.find((m) => m.id === h.partner)?.name;
        info.textContent = !h.partner ? '' : h.komisi ? `komisi ${rp(h.komisi)}` : 'komisi tercatat saat Aktif';
        toast(!h.partner ? 'Affiliate dilepas dari pesanan' : h.komisi ? `Komisi ${rp(h.komisi)} untuk ${nama}` : `Pesanan atas nama ${nama}. Komisi tercatat saat pesanan Aktif.`);
      } catch (err) { toast('Gagal: ' + err.message, true); pilih.value = o.partner_id ?? ''; }
      finally { pilih.disabled = false; }
    });
    return el('div', { class: 'row atur', style: 'margin-top:8px' }, el('span', { class: 'muted' }, 'Affiliate'), pilih, info);
  }

  const tanggalPanjang = (d) => new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const gambarDaftar = () => {
    const s = SARING.find((x) => x.kunci === saringan);
    const kata = cari.value.trim().toLowerCase().replace(/^\+/, '');
    const r = rentangPeriode(pilihan.periode, pilihan.dari, pilihan.sampai);
    // semua saringan selain tab status (supaya angka di tab ikut menyesuaikan)
    const lolos = pesanan.filter((o) =>
      (!pilihan.app || o._app.includes(pilihan.app)) &&
      (!pilihan.kategori || o._kat.includes(pilihan.kategori)) &&
      (!r || ((!r.dari || o._tgl >= r.dari) && (!r.sampai || o._tgl <= r.sampai))) &&
      (!kata || `${o.code} ${o.customer_name} ${o.customer_wa} ${o._app.join(' ')}`.toLowerCase().includes(kata)));
    const cocok = lolos.filter(s.cocok);
    // pesanan aktif bawaannya diurutkan dari yang paling cepat berakhir
    const urut = pilihan.urut || (saringan === 'aktif' ? 'akhir' : 'baru');
    pilihUrut.value = urut;
    const waktuO = (o) => Date.parse(o.created_at);
    const pembanding = {
      lama: (a, b) => waktuO(a) - waktuO(b),
      total: (a, b) => (Number(b.total) || 0) - (Number(a.total) || 0) || waktuO(b) - waktuO(a),
      akhir: (a, b) => (akhirAwal(a) || '9').localeCompare(akhirAwal(b) || '9') || waktuO(b) - waktuO(a),
    }[urut] || ((a, b) => waktuO(b) - waktuO(a));
    cocok.sort(pembanding);

    tab.replaceChildren(...SARING.map((x) => el('button', {
      type: 'button', class: 'kecil ' + (x.kunci === saringan ? '' : 'sec'), 'aria-pressed': String(x.kunci === saringan),
      onclick: () => { saringan = x.kunci; gambarDaftar(); },
    }, `${x.label} (${lolos.filter(x.cocok).length})`)));

    // ringkasan hasil: jumlah pesanan & nilai (pesanan batal tidak dihitung)
    const hidup = cocok.filter((o) => o.status !== 'batal');
    const nilaiItem = (o, f) => o._isi.filter(f).reduce((t, x) => t + x.harga, 0);
    const sempit = pilihan.app ? (x) => x.app === pilihan.app : pilihan.kategori ? (x) => x.kategori === pilihan.kategori : null;
    const aktif = pilihan.app || pilihan.kategori || r || kata;
    infoHasil.replaceChildren(
      el('b', {}, `${cocok.length} pesanan`), ` · total ${rp(hidup.reduce((t, o) => t + (Number(o.total) || 0), 0))}`,
      sempit ? ` · penjualan ${pilihan.app || pilihan.kategori} ${rp(hidup.reduce((t, o) => t + nilaiItem(o, sempit), 0))}` : '',
      r ? ` · ${r.dari ? tanggal(r.dari) : 'awal'} – ${r.sampai ? tanggal(r.sampai) : 'hari ini'}` : '',
      penuh ? el('span', { class: 'tag kuning' }, r ? `hanya ${BATAS_PERIODE} pesanan terbaru di periode ini` : `${BATAS} pesanan terbaru · pilih periode untuk yang lebih lama`) : '');
    reset.classList.toggle('hidden', !aktif && !pilihan.urut);

    if (!cocok.length) {
      daftar.replaceChildren(el('p', { class: 'muted' }, pesanan.length ? (aktif ? 'Tidak ada pesanan yang cocok dengan saringan ini.' : 'Tidak ada pesanan di sini.') : 'Belum ada pesanan dari website.'));
      return;
    }
    if (!urut.startsWith('g-')) { daftar.replaceChildren(...cocok.map(kartu)); return; }

    // kelompok per tanggal / aplikasi / kategori. Pesanan berisi beberapa aplikasi muncul di setiap kelompoknya.
    const kelompok = new Map();
    for (const o of cocok) {
      const kunci = urut === 'g-tanggal' ? [o._tgl] : urut === 'g-app' ? o._app : o._kat;
      for (const k of kunci.length ? kunci : ['Lainnya']) {
        if (urut === 'g-app' && pilihan.app && k !== pilihan.app) continue;
        if (urut === 'g-kategori' && pilihan.kategori && k !== pilihan.kategori) continue;
        if (!kelompok.has(k)) kelompok.set(k, []);
        kelompok.get(k).push(o);
      }
    }
    const nilai = (k, os) => os.filter((o) => o.status !== 'batal').reduce((t, o) => t + (urut === 'g-tanggal' ? Number(o.total) || 0
      : nilaiItem(o, (x) => (urut === 'g-app' ? x.app : x.kategori) === k)), 0);
    const urutan = [...kelompok].sort(urut === 'g-tanggal' ? (a, b) => b[0].localeCompare(a[0])
      : (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'id'));
    daftar.replaceChildren(...urutan.map(([k, os]) => el('section', { class: 'grup-pesanan' },
      el('h3', {}, urut === 'g-tanggal' ? tanggalPanjang(k) : k,
        el('span', { class: 'muted' }, ` · ${os.length} pesanan · ${rp(nilai(k, os))}`)),
      ...os.map(kartu))));
  };
  cari.addEventListener('input', gambarDaftar);
  isiPilihan();
  gambarRingkas();
  gambarDaftar();

  // pesanan dari panel admin (setelah migration pesanan_admin_laporan)
  const wadahBaru = el('div');
  const tombolBaru = el('button', { type: 'button' }, '+ Pesanan baru');
  tombolBaru.addEventListener('click', async () => {
    tombolBaru.disabled = true;
    try {
      wadahBaru.replaceChildren(await formPesananBaru(supabase, {
        selesai: (kode) => { saringan = 'semua'; halamanPesanan(supabase, halaman).then(() => document.querySelector(`article.pesanan .kode`)?.scrollIntoView({ block: 'center' })); },
        tutup: () => { wadahBaru.replaceChildren(); tombolBaru.disabled = false; },
      }));
      wadahBaru.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { toast('Gagal membuka form: ' + err.message, true); tombolBaru.disabled = false; }
  });
  halaman.replaceChildren(ringkas, wadahBaru, el('section', { class: 'card' },
    el('div', { class: 'row', style: 'justify-content:space-between' }, el('h2', {}, 'Pesanan'), 'channel' in (pesanan[0] ?? { channel: 1 }) ? tombolBaru : null),
    el('p', { class: 'sub' }, 'Pembeli membuat pesanan di website lalu mengirimnya ke WhatsApp toko. Ubah status setelah pembayaran masuk. Status "Aktif" otomatis mengisi tanggal mulai (hari ini) dan tanggal berakhir sesuai durasi paket.'),
    tab, el('div', { style: 'margin-top:10px' }, cari), saringBar, infoHasil, daftar));
}
