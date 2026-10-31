// Affiliate: baca teks penjualan (tempel dari WhatsApp) → produk di katalog, hitung komisi, teks pesan saldo.
// Fungsi murni supaya mudah diuji. Cara mencocokkan diambil dari prototipe penghitung affiliate IXVII.CO.

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const squash = (s) => norm(s).replace(/\s/g, '');

/** Komisi = persen dari untung, untung owner tidak turun di bawah batas, dibulatkan ke bawah. Sama dengan komisi_affiliate() di database. */
export function komisiDari(harga, hpp, rate, set) {
  if (hpp == null || harga == null) return { k: 0, untung: null, penuh: 0, potong: false };
  const untung = harga - hpp;
  if (untung <= 0 || !(rate > 0)) return { k: 0, untung, penuh: 0, potong: false };
  const penuh = Math.round((untung * rate) / 100);
  const batas = Math.min(Math.max(0, untung - (set.min_owner_rp || 0)), untung * (1 - (set.min_owner_pct || 0) / 100));
  const k = Math.max(0, Math.floor(Math.min(penuh, batas) / (set.round_to || 1)) * (set.round_to || 1));
  // "potong" = dibatasi bagian minimum owner (bukan sekadar pembulatan)
  return { k, untung, penuh, potong: batas < penuh };
}

/** Tanggal bayar berikutnya (tiap tanggal X, maksimal 28). dari = 'YYYY-MM-DD'. */
export function tanggalBayar(payday, dari) {
  const [y, m, d] = dari.split('-').map(Number);
  const hari = Math.min(Math.max(Number(payday) || 28, 1), 28);
  const iso = (yy, mm) => new Date(Date.UTC(yy, mm - 1, hari)).toISOString().slice(0, 10);
  return hari >= d ? iso(y, m) : m === 12 ? iso(y + 1, 1) : iso(y, m + 1);
}

function bulanDari(s) {
  const t = norm(s);
  if (/lifetime|permanen|selamanya/.test(t)) return 'life';
  let m = t.match(/(\d+)\s*(tahun|thn|th|year)/); if (m) return +m[1] * 12;
  m = t.match(/(\d+)\s*(bulan|bln|bulanan|month|mo)/); if (m) return +m[1];
  m = t.match(/(\d+)\s*(minggu|pekan|week)/); if (m) return +m[1] / 4;
  m = t.match(/(\d+)\s*(hari|day|days)/); if (m) return +m[1] / 30;
  m = t.match(/(?:^|\s)(\d+)\s*b(?:\s|$)/); if (m) return +m[1];
  if (/sebulan/.test(t)) return 1;
  if (/setahun/.test(t)) return 12;
  return null;
}

function punya(t, ts, w) {
  if (w.length >= 4) return t.includes(w) || ts.includes(w);
  return new RegExp('(^|[^a-z0-9])' + w + '([^a-z0-9]|$)').test(t) || ts.includes(w);
}

/**
 * Pembaca untuk satu katalog. items: [{a: aplikasi, k: tipe, d: varian, p: harga, h: hpp, c: kategori, code}]
 */
export function buatPembaca(items) {
  // indeks aplikasi, dipecah per kata supaya "chatgpt" tetap ketemu "Chatgpt Plus"
  const idx = [...new Set(items.map((i) => i.a))].map((a) => {
    const toks = norm(a).split(' ').filter(Boolean);
    return { a, s: squash(a), toks, inti: toks.filter((w) => w.length >= 4) };
  });

  function skorApp(line) {
    const t = norm(line), ts = squash(line);
    const out = [];
    for (const x of idx) {
      let s = 0;
      const wajib = x.inti.length ? x.inti : x.toks;
      const kena = wajib.filter((w) => punya(t, ts, w));
      kena.forEach((w) => { s += w.length; });
      const semua = kena.length === wajib.length;
      if (x.inti.length ? kena.length === 0 : !semua) continue;
      if (ts.includes(x.s)) s += 12;
      if (semua) s += 4;
      x.toks.forEach((w) => { if (!wajib.includes(w) && punya(t, ts, w)) s += 1; });
      out.push({ a: x.a, s, sig: kena.slice().sort().join('+') });
    }
    return out.sort((p, q) => q.s - p.s);
  }

  function cocokkan(line) {
    const apps = skorApp(line);
    if (!apps.length) return null;
    const batas = apps[0].s - 3;
    const dipakai = apps.filter((x) => x.s >= batas || x.sig === apps[0].sig).slice(0, 5);
    const t = norm(line), ts = squash(line);
    const bln = bulanDari(line);
    let best = null, bestScore = -1, bestApp = 0;
    for (const ap of dipakai) {
      for (const i of items.filter((x) => x.a === ap.a)) {
        let s = 0;
        const dn = norm(i.d), ds = squash(i.d), kn = norm(i.k), ks = squash(i.k);
        if (dn && (t.includes(dn) || ts.includes(ds))) s += 6;
        const ib = bulanDari(i.d);
        if (bln !== null && ib !== null && bln === ib) s += 5;
        if (kn && (t.includes(kn) || ts.includes(ks))) s += 4;
        if (kn) kn.split(' ').forEach((w) => { if (w.length >= 4 && t.includes(w.slice(0, 4))) s += 1; });
        const total = s + (ap.s - apps[0].s);
        if (total > bestScore) { bestScore = total; best = i; bestApp = s; }
      }
    }
    if (!best) return null;
    if (bestApp <= 0) {
      const kand = items.filter((i) => i.a === dipakai[0].a);
      const bulanan = kand.filter((i) => bulanDari(i.d) === 1);
      best = (bulanan.length ? bulanan : kand).slice().sort((x, y) => x.p - y.p)[0];
    }
    const ambigu = apps.filter((x) => x.sig === apps[0].sig).length > 1;
    const yakin = bestApp >= 10 && !ambigu ? 'pas' : bestApp >= 5 ? 'dekat' : 'tebak';
    return { item: best, yakin };
  }

  const LABEL = [[/^nama/, 'nama'], [/^(aplikasi|apk|app|produk)/, 'app'], [/^(durasi|masa|lama|paket)/, 'dur'],
    [/^(tanggal|tgl)/, 'tgl'], [/^(affiliate|afiliasi|reseller|kode|sales|ref)/, 'aff']];

  /** Baca teks: form garansi berlabel, satu baris satu produk, atau campuran. */
  function baca(raw) {
    const baris = String(raw || '').split(/\r?\n/).map((x) => x.replace(/[*_~`]/g, '').trim()).filter(Boolean);
    const label = {};
    let adaLabel = false;
    for (const l of baris) {
      const i = l.indexOf(':');
      if (i < 1) continue;
      const key = l.slice(0, i).toLowerCase().replace(/[^a-z\s]/g, '').trim();
      const val = l.slice(i + 1).trim();
      if (!val) continue;
      for (const [re, f] of LABEL) if (re.test(key) && !label[f]) { label[f] = val; adaLabel = true; break; }
    }
    const hasil = { rows: [], gagal: [], nama: label.nama || '', tglTeks: label.tgl || '', affHint: label.aff || '' };
    if (adaLabel && label.app) {
      const m = cocokkan(label.app + ' ' + (label.dur || ''));
      if (m) hasil.rows.push({ ...m, raw: (label.app + ' ' + (label.dur || '')).trim() });
      else hasil.gagal.push(label.app);
      return hasil;
    }
    for (const l of baris) {
      if (/^(nama|no|hp|device|tanggal|tgl|garansi|biar|thank|terima)\b/i.test(l) || /^[⚠️\s]*penting/i.test(l)) continue;
      const m = cocokkan(l);
      if (m) hasil.rows.push({ ...m, raw: l });
      else if (norm(l).length > 2) hasil.gagal.push(l);
    }
    return hasil;
  }

  return { baca, cocokkan, cariAffiliate: (hint, daftar) => {
    const h = norm(hint);
    if (!h) return null;
    return daftar.find((a) => norm(a.referral_code) === h.replace(/\s/g, '')) || daftar.find((a) => norm(a.name).includes(h)) || null;
  } };
}

// ---------------------------------------------------------------- pesan WhatsApp ke affiliate
const rpTeks = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
const tglTeks = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

/** Update saldo untuk dikirim lewat WA. a = baris v_saldo_affiliate, set = affiliate_settings. */
export function pesanSaldo(a, set, hariIni, link) {
  const bayar = tanggalBayar(set.payday, hariIni);
  const sisa = Math.round((Date.parse(bayar) - Date.parse(hariIni)) / 864e5);
  const bisa = a.tersedia >= (set.min_withdraw || 0);
  return `Halo ${a.name}, ini update komisi kamu di IXVII.CO.\n\n`
    + `Penjualan tercatat: ${a.n}\nSaldo komisi kamu: ${rpTeks(a.tersedia)}\n`
    + (a.ditahan ? `Sedang diproses: ${rpTeks(a.ditahan)}\n` : '')
    + (a.dibayar ? `Sudah dibayar sebelumnya: ${rpTeks(a.dibayar)}\n` : '')
    + `\nMinimum penarikan ${rpTeks(set.min_withdraw)}. `
    + (bisa ? 'Saldo kamu sudah cukup untuk ditarik.' : `Kurang ${rpTeks((set.min_withdraw || 0) - a.tersedia)} lagi supaya bisa ditarik.`)
    + `\n\nJadwal pembayaran tiap tanggal ${set.payday}. Berikutnya ${tglTeks(bayar)}, ${sisa === 0 ? 'hari ini' : `tinggal ${sisa} hari lagi`}.\n\n`
    + (bisa ? 'Kalau mau ikut jadwal itu, balas TARIK paling lambat 2 hari sebelumnya. Kalau mau dikumpulkan dulu, balas NANTI.'
      : 'Kumpulkan dulu ya, nanti aku kabari lagi kalau sudah lewat minimum.')
    + (link ? `\n\nCek saldo & riwayat komisimu kapan saja di sini:\n${link}` : '')
    + (a.payout_to ? `\n\nTujuan bayar yang aku simpan: ${a.payout_to}` : '\n\nKirim nomor rekening atau e-wallet kamu ya.');
}
