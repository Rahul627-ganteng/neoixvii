// Membaca teks poster story promo (hasil OCR atau teks yang ditempel) menjadi data kampanye + bundle,
// lalu mencocokkan tiap bundle dengan varian di katalog. Tanpa dependensi, bisa diuji di Node.

// ---------------------------------------------------------------- angka & tanggal
const SATUAN = { K: 1000, RB: 1000, RIBU: 1000, JT: 1000000, JUTA: 1000000 };

/** "130K" → 130000, "1,5JT" → 1500000, "Rp45.000" → 45000. Null kalau tidak terbaca. */
export function angkaRupiah(teks, satuan) {
  if (teks == null) return null;
  let s = String(teks).toUpperCase().replace(/^RP\.?\s*/, '').trim();
  const mul = SATUAN[(satuan || '').toUpperCase()] || 1;
  if (mul > 1) s = s.replace(',', '.');
  else s = s.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * mul);
}

/** Tanggal terakhir promo (format YYYY-MM-DD) kalau poster bilang "tanggal N balik harga normal". */
export function tanggalBerakhir(tanggalNormal, hariIni) {
  const d = Number(tanggalNormal);
  if (!(d >= 1 && d <= 31)) return null;
  const [y, m, h] = hariIni.split('-').map(Number);
  // tanggal N berikutnya setelah hari ini, lalu mundur satu hari
  let bulan = h < d ? m - 1 : m;
  let tahun = y;
  if (bulan > 11) { bulan = 0; tahun += 1; }
  const normal = new Date(Date.UTC(tahun, bulan, d));
  if (normal.getUTCDate() !== d) normal.setUTCDate(0); // bulan tanpa tanggal 31
  normal.setUTCDate(normal.getUTCDate() - 1);
  return normal.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- huruf
const MEREK = { WETV: 'WeTV', GPT: 'GPT', CGPT: 'ChatGPT', CHATGPT: 'ChatGPT', AI: 'AI', X: 'x', HBO: 'HBO', VIP: 'VIP', TV: 'TV', CAPCUT: 'CapCut', IQIYI: 'iQIYI', YOUTUBE: 'YouTube' };
const AKRONIM = /^(AI|GPT|HBO|VIP|TV|UI|AR|5TB|\d+[A-Z]{1,2}\d*[A-Z]*)$/;

/** "CLAUDE SHARING 3U" → "Claude Sharing 3U", "GEMINI X GPT PLUS" → "Gemini x GPT Plus" */
export function hurufJudul(teks) {
  return String(teks || '').split(/\s+/).filter(Boolean).map((w) => {
    const polos = w.replace(/[^A-Za-z0-9+]/g, '').toUpperCase();
    if (MEREK[polos]) return w.toUpperCase().replace(polos, MEREK[polos]);
    if (/\d/.test(w) || AKRONIM.test(polos)) return w.toUpperCase();
    return w.toLowerCase().replace(/(^|[+\-/])([a-z])/g, (_, a, b) => a + b.toUpperCase());
  }).join(' ');
}

/** Kalimat huruf besar semua → huruf kalimat, kata di "pertahankan" tetap bentuknya. */
export function hurufKalimat(teks, pertahankan = []) {
  let s = String(teks || '').toLowerCase().replace(/\s+/g, ' ').trim();
  s = s.replace(/(^|[.!?]\s+)([a-z])/g, (_, a, b) => a + b.toUpperCase());
  for (const kata of ['AI', 'GPT', 'HBO', 'TV', ...pertahankan]) {
    if (!kata) continue;
    s = s.replace(new RegExp(`\\b${kata.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), kata);
  }
  return s;
}

// OCR sering salah: "Al" (huruf L) untuk "AI"
const rapikanOcr = (s) => s
  .replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/ /g, ' ')
  .replace(/\b(Gemini|GEMINI|Aplikasi|APLIKASI|Meta|META)\s+Al\b/g, '$1 AI')
  .replace(/\bAPLIKASI AL\b/g, 'APLIKASI AI');

// ---------------------------------------------------------------- baca poster
const KAKI = /YOUR DIGITAL APP SOLVER|FULL WARRANTY|TRUSTED|IXVII|^LAST DAY|^SALE!?$|WWW\.|INSTAGRAM\.COM|@\w/i;
const KEPALA = /JAM MENUJU|BALIK HARGA|SEMUA APLIKASI|HARGA NORMAL|COUNTDOWN \d|BERLAKU|SAMPAI TANGGAL/i;
const RE_STOK = /STOK\b/;
const RE_POT = /POTONGAN\s+(?:RP\.?\s*)?[\dOIl][\d.,]*\s*(?:K|RB|RIBU|JT)?\s+DARI/i;
const RE_BEST = /BEST\s*DEAL/i;

const hurufBesarSaja = (s) => {
  const huruf = s.replace(/[^A-Za-z]/g, '');
  if (huruf.length < 3) return false;
  const besar = huruf.replace(/[^A-Z]/g, '').length;
  return besar / huruf.length >= 0.75;
};

// pecah "…harga! STOK SISA 2 BUNDLE! POTONGAN 45K DARI 125K!" menjadi beberapa potong
function potongBaris(baris) {
  const hasil = [];
  for (const b of baris) {
    let s = b;
    const potong = [];
    const re = /(STOK\b|POTONGAN\s+(?:RP\.?\s*)?[\dOIl]|BEST\s*DEAL)/g;
    let m, akhir = 0;
    while ((m = re.exec(s))) {
      if (m.index > akhir) potong.push(s.slice(akhir, m.index));
      akhir = m.index;
    }
    potong.push(s.slice(akhir));
    hasil.push(...potong.map((x) => x.trim()).filter(Boolean));
  }
  return hasil;
}

// buang sisa angka harga raksasa yang salah terbaca di ujung judul ("NETFLIX 2 BULAN #5SK")
const MIRIP_ANGKA = { O: '0', D: '0', Q: '0', I: '1', L: '1', T: '1', S: '5', B: '8', Z: '2', G: '6' };
function sampah(tok) {
  if (/[a-z]/.test(tok)) return true;
  if (/^[^A-Za-z0-9+]+$/.test(tok)) return true;
  const polos = tok.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '');
  if (!polos) return true;
  if (/^K{1,2}$/.test(polos)) return true;
  const angka = polos.replace(/[A-Z]/g, (c) => (c === 'K' ? 'K' : MIRIP_ANGKA[c] ?? c));
  return /^\d{1,4}K$/.test(angka) && polos.length <= 5;
}
export function rapikanJudul(judul) {
  let tok = judul.replace(/\s+/g, ' ').trim().split(' ');
  // setelah token berakhiran koma, sisanya sampah (judul poster tidak memakai koma)
  const koma = tok.findIndex((t, i) => /,$/.test(t) && i < tok.length - 1);
  if (koma >= 0) tok = tok.slice(0, koma + 1);
  // ekor judul yang isinya sampah atau angka pendek, potong mulai sampah pertama
  let j = tok.length;
  while (j > 1 && (sampah(tok[j - 1]) || /^\d{1,2}$/.test(tok[j - 1]))) j--;
  const k = tok.findIndex((t, i) => i >= j && sampah(t));
  if (k > 0) tok = tok.slice(0, k);
  // angka tunggal setelah satuan durasi ("NETFLIX 2 BULAN 4") = sisa harga raksasa
  if (tok.length > 2 && /^\d$/.test(tok.at(-1)) && /^(BULAN|BLN|TAHUN|THN|HARI|MINGGU|\d+[YBMH])$/i.test(tok.at(-2))) tok = tok.slice(0, -1);
  return tok.join(' ')
    .replace(/\bT([YB])\b/g, '1$1')                 // "TY" → "1Y" (angka 1 terbaca T)
    .replace(/[.,;:\s]+$/, '')
    .replace(/^["'#]+/, '')
    .trim();
}

/**
 * Hasil TSV Tesseract → teks per baris. Kata dengan keyakinan sangat rendah dibuang,
 * kecuali kata itu juga muncul di bagian lain poster (mis. judul raksasa "COUNTDOWN").
 */
export function teksDariTsv(tsv) {
  const kata = [];
  for (const baris of String(tsv || '').split(/\r?\n/)) {
    const k = baris.split('\t');
    if (k.length < 12 || k[0] !== '5') continue;
    const teks = k.slice(11).join('\t').trim();
    if (!teks) continue;
    kata.push({ blok: +k[2], par: +k[3], baris: +k[4], conf: Number(k[10]), teks });
  }
  const yakin = new Set(kata.filter((w) => w.conf >= 50).map((w) => w.teks.toUpperCase().replace(/[^A-Z0-9]/g, '')).filter((w) => w.length >= 4));
  const hasil = [];
  let kunci = null, parKunci = null, kini = [];
  const tutup = () => { if (kini.length) hasil.push(kini.join(' ')); kini = []; };
  for (const w of kata) {
    const kb = `${w.blok}.${w.par}.${w.baris}`;
    const kp = `${w.blok}.${w.par}`;
    if (kb !== kunci) { tutup(); if (parKunci && kp !== parKunci) hasil.push(''); kunci = kb; parKunci = kp; }
    const polos = w.teks.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (w.conf < 12 && !(polos.length >= 4 && yakin.has(polos))) continue;
    kini.push(w.teks);
  }
  tutup();
  return hasil.join('\n');
}

function bacaStok(s) {
  const m = s.toUpperCase().replace(/\b[IL]\b/g, '1')
    .match(/STOK\s+(?:TERSISA|SISA|HANYA\s+ADA|TINGGAL|CUMA|ADA)?\s*(\d+)\s*(BUAH|BUNDLE|PAKET|SLOT|AKUN|PCS)?/);
  return m ? Number(m[1]) : null;
}
function bacaPotongan(s) {
  const m = s.toUpperCase().replace(/(\d)O/g, '$10')
    .match(/POTONGAN\s+(?:RP\.?\s*)?([\d.,]+)\s*(K|RB|RIBU|JT)?\s+DARI\s+(?:RP\.?\s*)?([\d.,]+)\s*(K|RB|RIBU|JT)?/);
  if (!m) return null;
  const potongan = angkaRupiah(m[1], m[2] || m[4]);
  const dari = angkaRupiah(m[3], m[4] || m[2]);
  return potongan && dari && dari > potongan ? { potongan, dari } : null;
}

/**
 * Teks poster → { judul, subjudul, lencana, kelompok, tanggal_normal, bundles[] }.
 * Tiap bundle: { nama, deskripsi, harga, potongan, harga_coret, stok, best_deal }.
 */
export function bacaTeksPoster(teksMentah) {
  const teks = rapikanOcr(String(teksMentah || ''));
  const baris = potongBaris(teks.split(/\r?\n/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean));
  const jenis = baris.map((s) => {
    if (RE_BEST.test(s) && s.replace(RE_BEST, '').replace(/[^A-Za-z0-9]/g, '').length <= 2) return 'best';
    if (RE_STOK.test(s) && /^STOK/.test(s)) return 'stok';
    if (RE_POT.test(s)) return 'potongan';
    if (KAKI.test(s)) return 'kaki';
    if (hurufBesarSaja(s)) return 'besar';
    return 'teks';
  });
  const berikut = (i) => { for (let j = i + 1; j < baris.length; j++) if (jenis[j] !== 'best') return j; return -1; };
  const adaPotonganSetelah = (i) => {
    for (let j = i + 1; j < baris.length; j++) {
      if (jenis[j] === 'potongan') return true;
      if (jenis[j] === 'besar' && j > i + 1 && jenis[berikut(j)] === 'teks') return false;
    }
    return false;
  };
  const judulBundle = jenis.map((j, i) => {
    if (j !== 'besar' || KEPALA.test(baris[i])) return false;
    const n = berikut(i);
    return n >= 0 && ['teks', 'stok', 'potongan'].includes(jenis[n]) && adaPotonganSetelah(i);
  });
  const awal = judulBundle.indexOf(true);

  // kepala poster
  const kepala = (awal < 0 ? baris : baris.slice(0, awal)).filter((s, i) => jenis[i] !== 'best' && jenis[i] !== 'kaki');
  const pendek = [];
  const panjang = [];
  for (const s of kepala) (s.split(' ').length <= 3 && !/\d/.test(s) && !KEPALA.test(s) && !panjang.length ? pendek : panjang).push(s);
  const semuaKata = new Set(teks.toUpperCase().split(/[^A-Z0-9]+/).filter((w) => w.length > 3));
  let judul = pendek.join(' ').replace(/['"]/g, '').replace(/\s+/g, ' ').trim();
  // "COUN TDOWN" → "COUNTDOWN" kalau gabungannya ada di bagian lain poster
  const tj = judul.split(' ');
  for (let i = 0; i < tj.length - 1; i++) {
    if (semuaKata.has((tj[i] + tj[i + 1]).toUpperCase())) { tj.splice(i, 2, tj[i] + tj[i + 1]); i--; }
  }
  judul = hurufJudul(tj.join(' '));
  const subjudulBesar = panjang.join(' ');
  const kataJudul = judul.split(' ');
  const subjudul = hurufKalimat(subjudulBesar, [judul, ...kataJudul.slice(1).map((w, i) => `${kataJudul[i]} ${w}`)]);
  const teksBesar = teks.toUpperCase();
  const k = teksBesar.match(/APLIKASI\s+(AI|EDITING|STREAMING|NONTON|DESAIN|MUSIK)\b/);
  const kelompok = k ? ({ AI: 'ai', EDITING: 'editing', DESAIN: 'editing', STREAMING: 'streaming', NONTON: 'streaming', MUSIK: 'streaming' })[k[1]] : '';
  const tgl = teksBesar.match(/TANGGAL\s+(\d{1,2})\s+(?:BALIK|KEMBALI)\s+(?:KE\s+)?HARGA\s+NORMAL/);
  const sampai = teksBesar.match(/(?:SAMPAI|HINGGA|BERAKHIR)\s+TANGGAL\s+(\d{1,2})\b/);
  const lencana = /LAST\s*DAY\s*SALE/.test(teksBesar.replace(/\s+/g, ' ')) || /LAST DAY/.test(teksBesar) ? 'Last Day Sale!'
    : /FLASH\s*SALE/.test(teksBesar) ? 'Flash Sale!' : /24\s*JAM/.test(teksBesar) ? 'Hanya 24 jam!' : '';

  // bundle
  const bundles = [];
  let bestMenunggu = false;
  let kini = null;
  baris.forEach((s, i) => {
    if (jenis[i] === 'best') {
      // label BEST DEAL ada di atas harga, OCR membacanya sebelum judul bundle berikutnya
      bestMenunggu = true;
      return;
    }
    if (judulBundle[i]) {
      kini = { nama: hurufJudul(rapikanJudul(s)), nama_poster: rapikanJudul(s), deskripsi: '', harga: null, potongan: null, harga_coret: null,
        stok: null, best_deal: bestMenunggu };
      bestMenunggu = false;
      bundles.push(kini);
      return;
    }
    if (!kini || i < awal) return;
    if (jenis[i] === 'stok') { kini.stok ??= bacaStok(s); return; }
    if (jenis[i] === 'potongan') {
      const p = bacaPotongan(s);
      if (p && kini.harga_coret == null) Object.assign(kini, { potongan: p.potongan, harga_coret: p.dari, harga: p.dari - p.potongan });
      return;
    }
    if (jenis[i] === 'teks' && kini.harga_coret == null) kini.deskripsi = (kini.deskripsi + ' ' + s).trim();
  });
  for (const b of bundles) {
    b.deskripsi = b.deskripsi.replace(/\s+([!?.,])/g, '$1').replace(/\s+/g, ' ').trim();
    if (b.deskripsi) b.deskripsi = b.deskripsi.charAt(0).toUpperCase() + b.deskripsi.slice(1);
  }
  return { judul, subjudul, subjudul_poster: subjudulBesar, lencana, kelompok, tanggal_normal: tgl ? Number(tgl[1]) : 0,
    sampai_tanggal: sampai ? Number(sampai[1]) : 0, bundles };
}

// ---------------------------------------------------------------- cocokkan dengan katalog
const norm = (s) => String(s || '').toUpperCase().normalize('NFKD').replace(/[^A-Z0-9+]+/g, ' ').trim();
const ANGKA_KATA = { SATU: 1, SE: 1, DUA: 2, TIGA: 3, EMPAT: 4, LIMA: 5, ENAM: 6, TUJUH: 7, DELAPAN: 8, SEMBILAN: 9, SEPULUH: 10, DUABELAS: 12 };

/** Durasi (hari) yang disebut di teks: "18B" → 540, "1Y" → 365, "sebulan" → 30. Null kalau tidak ada. */
export function bacaDurasi(teks) {
  const s = ` ${norm(teks)} `;
  let m = s.match(/\b(\d{1,3})\s*(Y|YR|YEAR|YEARS|TAHUN|THN|TH)\b/);
  if (m) return Number(m[1]) * 365;
  m = s.match(/\b(\d{1,3})\s*(B|BL|BLN|BULAN|M|MO|MONTH|MONTHS)\b/);
  if (m) return Number(m[1]) * 30;
  m = s.match(/\b(\d{1,3})\s*(MINGGU|MGG|W|WEEK|WEEKS)\b/);
  if (m) return Number(m[1]) * 7;
  m = s.match(/\b(\d{1,3})\s*(H|HR|HARI|D|DAY|DAYS)\b/);
  if (m) return Number(m[1]);
  if (/\bSETAHUN\b/.test(s)) return 365;
  if (/\bSEBULAN\b/.test(s)) return 30;
  if (/\bSEMINGGU\b/.test(s)) return 7;
  m = s.match(/\b(SATU|DUA|TIGA|EMPAT|LIMA|ENAM|TUJUH|DELAPAN|SEMBILAN|SEPULUH|DUABELAS)\s+(TAHUN|BULAN|MINGGU|HARI)\b/);
  if (m) return ANGKA_KATA[m[1]] * ({ TAHUN: 365, BULAN: 30, MINGGU: 7, HARI: 1 })[m[2]];
  return null;
}

const KATA_UMUM = new Set(['AI', 'PRO', 'PLUS', 'PREMIUM', 'APP', 'TV', 'STANDAR', 'ULTIMATE', 'WEB', 'GO', 'VIP', 'SPORT', 'PLATINUM', 'INDPLAN']);
const ALIAS_KHUSUS = [
  [/\b(C?GPT|CHAT\s*GPT|CHATGPT)\s+(PLUS)\b/, 'chatgpt plus'],
  [/\b(C?GPT|CHAT\s*GPT|CHATGPT)\s+(GO)\b/, 'chatgpt go'],
  [/\b(C?GPT|CHAT\s*GPT|CHATGPT)\b/, 'chatgpt plus'],
  [/\bDISNEY\s*(\+|PLUS)?/, 'disney'],
  [/\bWE\s*TV\b|\bWETV\b/, 'we tv'],
  [/\bYOUTUBE\b/, 'youtube'],
];

function petaAplikasi(varian) {
  const apps = new Map();
  for (const v of varian) if (!apps.has(v.aplikasi)) apps.set(v.aplikasi, []);
  for (const v of varian) apps.get(v.aplikasi).push(v);
  const kunci = [];
  for (const nama of apps.keys()) {
    const n = norm(nama);
    const kata = n.split(' ').filter((w) => w.length >= 3 && !KATA_UMUM.has(w));
    const alias = new Set([n]);
    if (kata[0]) alias.add(kata[0]);
    if (n.replace(/\s+/g, '').length >= 4) alias.add(n.replace(/\s+/g, ''));
    for (const a of alias) if (/[A-Z]/.test(a)) kunci.push({ alias: a, nama });
  }
  kunci.sort((a, b) => b.alias.length - a.alias.length);
  return { apps, kunci };
}

function cariAplikasi(teks, peta) {
  const s = ` ${norm(teks)} `;
  const ketemu = [];
  const pakai = (nama, posisi) => { if (!ketemu.some((x) => x.nama === nama)) ketemu.push({ nama, posisi }); };
  for (const [re, alias] of ALIAS_KHUSUS) {
    const m = s.match(re);
    if (!m) continue;
    const k = peta.kunci.find((x) => norm(x.alias) === norm(alias) || norm(x.nama).startsWith(norm(alias)));
    if (k) pakai(k.nama, m.index);
  }
  for (const { alias, nama } of peta.kunci) {
    const re = new RegExp(`(^|\\s)${alias.replace(/[+]/g, '\\+')}(?=\\s|$)`);
    const m = s.match(re);
    if (m) pakai(nama, m.index);
  }
  return ketemu.sort((a, b) => a.posisi - b.posisi);
}

const PETUNJUK = ['SHARING', 'PRIVAT', 'PRIVATE', 'SEMIPRIVATE', '1P1U', '1P2U', 'PREM', 'PREMIUM', 'BASIC', 'PRESET', 'HEAD', 'EDU', 'TEAM', 'INVITE', 'PRO', 'DESIGNER'];
function skorVarian(v, konteks, hari) {
  const isi = ` ${norm(v.tipe)} ${norm(v.varian)} `;
  const k = ` ${konteks} `;
  let skor = 0;
  let qty = 1;
  const dv = Number(v.durasi_hari) || null;
  if (hari && dv) {
    if (dv === hari || Math.abs(dv - hari) <= 2) skor += 6;
    else if (dv >= 30 && hari % dv === 0 && hari / dv <= 12) { qty = hari / dv; skor += 4; }
    else skor -= 3;
  } else if (!hari && dv === 30) skor += 1;
  for (const p of PETUNJUK) {
    const di = new RegExp(`\\b${p}`).test(k);
    if (!di) continue;
    if (isi.includes(` ${p}`) || isi.includes(p)) skor += 2;
  }
  if (/\bSHARING\b/.test(k) && /PRIVAT/.test(isi)) skor -= 1;
  if (/\bPRIVAT/.test(k) && /SHARING/.test(isi)) skor -= 1;
  const u = k.match(/\b(\d{1,2})\s*U\b/);
  const uv = isi.match(/\b(\d{1,2})\s*U\b/);
  if (u && uv) skor += u[1] === uv[1] ? 3 : -2;
  if (v.stok === 'habis') skor -= 1;
  return { v, skor, qty };
}

/**
 * Cocokkan satu bundle dengan varian katalog.
 * varian: [{ code, aplikasi, tipe, varian, harga, durasi_hari, stok, tampil }]
 * Hasil: { items: [{ code, qty }], catatan, yakin }
 */
export function cocokkanVarian(bundle, varian) {
  const aktif = varian.filter((v) => v.tampil !== false);
  const peta = petaAplikasi(aktif);
  const judul = bundle.nama_poster || bundle.nama || '';
  const desk = bundle.deskripsi || '';
  let apps = cariAplikasi(judul, peta);
  for (const a of cariAplikasi(desk, peta)) if (!apps.some((x) => x.nama === a.nama)) apps.push({ ...a, dariDeskripsi: true });
  if (!apps.length) return { items: [], catatan: 'Nama aplikasi tidak dikenali. Pilih paketnya sendiri.', yakin: false };

  const nJ = norm(judul);
  const nD = norm(desk);
  const segJudul = nJ.split(/\s(?:X|DAN|AND|&|\+)\s|\s\+|\+\s/);
  const durJudul = bacaDurasi(nJ);
  const durDesk = bacaDurasi(nD);
  const pilihan = apps.slice(0, 4).map((a) => {
    // durasi: dari potongan judul yang memuat aplikasinya, lalu dari kalimat di deskripsi, lalu umum
    const alias = peta.kunci.filter((x) => x.nama === a.nama).map((x) => x.alias);
    const cocok = (s) => alias.some((al) => ` ${s} `.includes(` ${al} `)) || cariAplikasi(s, peta).some((x) => x.nama === a.nama);
    const seg = segJudul.find(cocok) || '';
    // kalimat deskripsi mulai dari nama aplikasi ini sampai nama aplikasi lain berikutnya
    const posisi = cariAplikasi(nD, peta);
    const di = posisi.find((x) => x.nama === a.nama);
    const lanjut = di ? posisi.find((x) => x.posisi > di.posisi) : null;
    const potDesk = di ? ` ${nD} `.slice(di.posisi, lanjut ? lanjut.posisi : undefined) : '';
    const hari = bacaDurasi(seg) ?? bacaDurasi(potDesk) ?? durJudul ?? durDesk;
    const konteks = `${seg} ${potDesk} ${nJ}`;
    const calon = peta.apps.get(a.nama).map((v) => skorVarian(v, konteks, hari)).sort((x, y) => y.skor - x.skor).slice(0, 5);
    return { app: a.nama, hari, calon };
  });

  // kombinasi terbaik: skor petunjuk + kedekatan dengan "harga coret" di poster
  const target = Number(bundle.harga_coret) || 0;
  let terbaik = null;
  const jalan = (i, pilih) => {
    if (i === pilihan.length) {
      const total = pilih.reduce((s, c) => s + c.v.harga * c.qty, 0);
      const skor = pilih.reduce((s, c) => s + c.skor, 0) - (target ? Math.min(2.5, (Math.abs(total - target) / target) * 8) : 0);
      if (!terbaik || skor > terbaik.skor) terbaik = { skor, pilih, total };
      return;
    }
    for (const c of pilihan[i].calon) jalan(i + 1, [...pilih, c]);
  };
  jalan(0, []);
  if (!terbaik) return { items: [], catatan: 'Paket tidak ditemukan di katalog.', yakin: false };
  const catatan = [];
  if (apps.length > 4) catatan.push('Lebih dari 4 aplikasi, cek isinya.');
  if (pilihan.some((p) => !p.hari)) catatan.push('Durasi tidak disebut di poster, dipilih 1 bulan.');
  const selisih = target ? Math.abs(terbaik.total - target) / target : 0;
  if (target && selisih > 0.05) catatan.push('Harga normal di katalog berbeda dari "dari" di poster.');
  const yakin = terbaik.pilih.every((c) => c.skor >= 4) && selisih <= 0.1;
  return { items: terbaik.pilih.map((c) => ({ code: c.v.code, qty: c.qty })), catatan: catatan.join(' '), yakin };
}

/** Warna khas poster: kelompok warna yang paling sering muncul (abaikan hitam pekat & putih), untuk tema kampanye. */
export function warnaDominan(data) {
  // data: Uint8ClampedArray RGBA dari canvas kecil
  const ember = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i], G = data[i + 1], B = data[i + 2];
    const terang = (R + G + B) / 3;
    if (terang < 18 || terang > 225) continue;
    const k = ((R >> 5) << 6) | ((G >> 5) << 3) | (B >> 5);
    const e = ember.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += R; e.g += G; e.b += B;
    ember.set(k, e);
  }
  let top = null;
  for (const e of ember.values()) if (!top || e.n > top.n) top = e;
  if (!top) return null;
  const hex = (x) => Math.round(x / top.n).toString(16).padStart(2, '0');
  return `#${hex(top.r)}${hex(top.g)}${hex(top.b)}`;
}
