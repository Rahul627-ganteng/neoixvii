// Membaca balasan WhatsApp "AKTIVASI GARANSI IXVII.CO" secara otomatis, lalu mencari pesanan yang cocok.
// Fungsi murni (tanpa jaringan) supaya mudah diuji.

const ALIAS = {
  nama: ['nama lengkap', 'nama'],
  hp: ['no. hp aktif', 'no hp aktif', 'nomor hp aktif', 'no. hp', 'no hp', 'nomor hp', 'no. wa', 'no wa', 'nomor wa', 'whatsapp', 'nomor', 'hp', 'wa'],
  aplikasi: ['aplikasi', 'nama aplikasi', 'app', 'apk'],
  durasi: ['durasi', 'paket', 'lama langganan', 'masa aktif'],
  tanggal: ['tanggal beli', 'tgl beli', 'tanggal pembelian', 'tgl pembelian', 'tanggal', 'tgl'],
  device: ['device yang dipakai', 'device yang digunakan', 'perangkat yang dipakai', 'hp yang dipakai', 'device', 'perangkat'],
};
// alias terpanjang dicek lebih dulu: "no hp aktif" menang dari "no hp"
const DAFTAR = Object.entries(ALIAS).flatMap(([k, a]) => a.map((x) => [x, k])).sort((a, b) => b[0].length - a[0].length);

const BULAN = {
  jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4,
  mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, agu: 8, agt: 8, ags: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12, december: 12,
};

const iso = (y, m, d) => {
  if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : null;
};

/** "31/10/2026", "31-10-26", "2026-10-31", "31 Okt 2026", "31 oktober" (tahun = tahun ini) → "2026-10-31" */
export function bacaTanggal(teks, tahunIni = new Date().getFullYear()) {
  const s = String(teks ?? '').toLowerCase().trim();
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?/);
  if (m) return iso(m[3] ? +m[3] : tahunIni, +m[2], +m[1]);
  m = s.match(/(\d{1,2})\s*([a-z]+)\.?\s*(\d{2,4})?/);
  if (m && BULAN[m[2]]) return iso(m[3] ? +m[3] : tahunIni, BULAN[m[2]], +m[1]);
  return null;
}

export function rapikanHp(n) {
  let d = String(n ?? '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
}

/** Baca balasan pembeli. Baris template (judul, penjelasan) diabaikan. */
export function bacaBalasanGaransi(teks, tahunIni) {
  const hasil = {};
  for (const mentah of String(teks ?? '').split(/\r?\n/)) {
    const baris = mentah.replace(/[*_~`]/g, '').replace(/^[\s\-–•·>\d.)]+(?=\D)/u, '').trim();
    if (!baris) continue;
    const kecil = baris.toLowerCase();
    // kunci harus diikuti spasi, titik dua, "=", "-", atau akhir baris ("hp" tidak boleh cocok dengan "hpnya")
    const cocok = DAFTAR.find(([alias]) => kecil.startsWith(alias) && /^($|[\s:=\-–.])/.test(kecil.slice(alias.length)));
    if (!cocok) continue;
    const [alias, kunci] = cocok;
    const nilai = baris.slice(alias.length).replace(/^[\s:=\-–.]+/, '').trim();
    if (!nilai || hasil[kunci]) continue;
    hasil[kunci] = nilai;
  }
  return {
    nama: hasil.nama ?? '',
    hp: rapikanHp(hasil.hp),
    aplikasi: hasil.aplikasi ?? '',
    durasi: hasil.durasi ?? '',
    tanggalTeks: hasil.tanggal ?? '',
    tanggal: hasil.tanggal ? bacaTanggal(hasil.tanggal, tahunIni) : null,
    device: hasil.device ?? '',
  };
}

const bersih = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
const tglWib = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
const selisih = (a, b) => Math.abs(Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000;

/**
 * Urutkan pesanan yang paling mungkin cocok dengan balasan.
 * Nomor HP sama = paling kuat; lalu nama aplikasi, tanggal beli (±3 hari), status Aktif, nama pembeli.
 */
export function cocokkanPesanan(data, pesanan) {
  const app = bersih(data.aplikasi);
  const nama = bersih(data.nama).split(' ')[0];
  return pesanan.map((o) => {
    let skor = 0;
    if (data.hp && o.customer_wa === data.hp) skor += 10;
    const apps = (o.order_items ?? []).map((i) => bersih(i.app_name));
    if (app && apps.some((a) => a && (a.includes(app) || app.includes(a)))) skor += 4;
    if (data.tanggal && selisih(tglWib(o.created_at), data.tanggal) <= 3) skor += 2;
    if (o.status === 'aktif') skor += 1;
    if (nama && bersih(o.customer_name).includes(nama)) skor += 2;
    return { o, skor };
  }).filter((x) => x.skor >= 4).sort((a, b) => b.skor - a.skor || Date.parse(b.o.created_at) - Date.parse(a.o.created_at));
}

// ---------------------------------------------------------------- teks pesan WhatsApp ke pembeli
const tglId = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const daftarApp = (o) => [...new Set((o.order_items ?? []).map((i) => i.app_name))].join(', ');
const daftarDurasi = (o) => (o.order_items ?? []).map((i) => `${i.app_name} ${i.variant_label}`).join(', ');

/** Pesan berisi link form aktivasi garansi (dipakai tombol di menu Pesanan). */
export function pesanGaransiLink(o, url) {
  if (o.lang === 'en') {
    return `⚠️ IMPORTANT: IXVII.CO WARRANTY ACTIVATION ⚠️\n\nHi ${o.customer_name}, your ${daftarApp(o)} account has been sent. To start your warranty and get a reminder before your account expires, please fill in the activation form and upload a screenshot showing you are logged in:\n${url}\n\nThe warranty is only active if the form is sent within 24 hours. You can also leave a rating and a short review on the same form. Thank you and enjoy your premium access! ⚡`;
  }
  return `⚠️ PENTING: AKTIVASI GARANSI IXVII.CO ⚠️\n\nHalo Kak ${o.customer_name}, akun ${daftarApp(o)} sudah kami kirim. Biar masa garansi kamu resmi berjalan dan nomor kamu masuk ke database reminder otomatis kami sebelum akun hangus, isi form aktivasi di link ini dan unggah screenshot bukti sudah berhasil login:\n${url}\n\nGaransi hanya aktif jika form dikirim dalam waktu 1x24 jam ya, Kak. Di form yang sama kamu juga bisa kasih rating & ulasan singkat. Thank you and enjoy your premium access! ⚡`;
}

/** Format balasan manual seperti biasa (nama, aplikasi, durasi, tanggal sudah diisi). */
export function pesanGaransiManual(o) {
  return `⚠️ PENTING: AKTIVASI GARANSI IXVII.CO ⚠️\n\nBiar masa garansi kamu resmi berjalan dan nomor kamu masuk ke database reminder otomatis kami sebelum akun hangus, mohon balas pesan ini dengan menyertakan [Screenshot Bukti Sudah Berhasil Login] dan isi data di bawah ini ya\n\nNama: ${o.customer_name ?? ''}\nNo. HP Aktif:\nAplikasi : ${o.order_items ? daftarApp(o) : ''}\nDurasi : ${o.order_items ? daftarDurasi(o) : ''}\nTanggal Beli : ${o.created_at ? tglId(o.created_at) : ''}\nDevice yang Dipakai:\n\nGaransi hanya aktif jika kamu mengirimkan screenshot login beserta format di atas dalam waktu 1x24 jam ya, Kak. Thank you and enjoy your premium access! ⚡`;
}

/** Pengingat sebelum langganan berakhir. */
export function pesanPengingat(nama, app, berakhir, lang) {
  const tgl = berakhir ? tglId(berakhir + 'T00:00:00') : '';
  return lang === 'en'
    ? `Hi ${nama}, your ${app} subscription at IXVII.CO ends on ${tgl}. Would you like to renew? Just reply to this message and we will help you 🙏`
    : `Halo Kak ${nama}, langganan ${app} kamu di IXVII.CO berakhir ${tgl}. Mau diperpanjang? Balas pesan ini ya, nanti kami bantu 🙏`;
}
