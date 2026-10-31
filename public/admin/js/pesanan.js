// Menu Pesanan: daftar pesanan dari website, ubah status, hubungi pembeli lewat WhatsApp, pantau masa aktif.
import { el, q, rp, toast, waktu, hariIni, tautanWa } from './alat.js';

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

const tanggal = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
/** Sisa hari sampai ends_on (zona waktu WIB). */
export function sisaHari(ends, hari = hariIni()) {
  if (!ends) return null;
  return Math.round((Date.parse(ends + 'T00:00:00Z') - Date.parse(hari + 'T00:00:00Z')) / 86400000);
}
const usd = (n) => (n == null ? '' : ' · ' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n));

export async function halamanPesanan(supabase, halaman) {
  const ambil = (kolom) => q(supabase.from('orders').select(kolom).order('created_at', { ascending: false }).limit(300));
  const dasar = '*,order_items(app_name,plan_label,variant_label,price,duration_days)';
  // kolom ulasan baru ada setelah migration Tahap 8
  const pesanan = await ambil(dasar + ',reviews(rating,status)').catch(() => ambil(dasar));

  const cari = el('input', { type: 'search', placeholder: 'Cari kode, nama, atau nomor WhatsApp…', 'aria-label': 'Cari pesanan' });
  const tab = el('div', { class: 'row tab', role: 'group', 'aria-label': 'Saring pesanan' });
  const daftar = el('div');
  const ringkas = el('div', { class: 'stats' });

  const stat = (angka, label, kelas = '') => el('div', { class: 'stat ' + kelas }, el('b', {}, angka), el('span', {}, label));
  const gambarRingkas = () => {
    const segera = pesanan.filter((o) => o.status === 'aktif' && (sisaHari(o.ends_on) ?? 99) <= 3).length;
    ringkas.replaceChildren(
      stat(pesanan.filter((o) => o.status === 'menunggu_bayar').length, 'menunggu bayar', 'kuning'),
      stat(pesanan.filter((o) => o.status === 'dibayar').length, 'dibayar, belum dikirim'),
      stat(pesanan.filter((o) => o.status === 'aktif').length, 'langganan aktif'),
      stat(segera, 'berakhir ≤ 3 hari (tawarkan perpanjang)', segera ? 'merah' : ''));
  };

  /** Link ulasan sekali pakai (hanya pesanan Aktif/Selesai). */
  const bagianUlasan = (o) => {
    if (o.reviews?.length) {
      const rata = o.reviews.reduce((s, r) => s + r.rating, 0) / o.reviews.length;
      return el('span', { class: 'tag hijau' }, `Sudah diulas ★${rata.toLocaleString('id-ID', { maximumFractionDigits: 1 })}`);
    }
    if (o.status !== 'aktif' && o.status !== 'selesai') return null;
    const wadah = el('div', { class: 'row' });
    const buat = el('button', { type: 'button', class: 'sec kecil' }, 'Buat link ulasan');
    buat.addEventListener('click', async () => {
      buat.disabled = true;
      try {
        const h = await q(supabase.rpc('buat_link_ulasan', { p_kode: o.code }));
        const url = `${location.origin}/ulasan/?t=${h.token}`;
        const teks = o.lang === 'en'
          ? `Hi ${o.customer_name}, thank you for subscribing at IXVII.CO 🙏 Could you leave a short review? This link is only for your order ${o.code} and works once:\n${url}`
          : `Halo ${o.customer_name}, terima kasih sudah berlangganan di IXVII.CO 🙏 Boleh minta ulasan singkatnya? Link ini khusus pesanan ${o.code} dan hanya bisa dipakai sekali:\n${url}`;
        const salin = el('button', { type: 'button', class: 'sec kecil' }, 'Salin link');
        salin.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(url); toast('Link ulasan disalin'); } catch { prompt('Salin link ini:', url); }
        });
        wadah.replaceChildren(el('a', { class: 'btn kecil wa', href: tautanWa(o.customer_wa, teks), target: '_blank', rel: 'noopener' }, 'Kirim link ulasan lewat WhatsApp'), salin);
      } catch (err) { toast('Gagal: ' + err.message, true); buat.disabled = false; }
    });
    wadah.append(buat);
    return wadah;
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
    const sisa = sisaHari(o.ends_on);
    const masa = o.starts_on
      ? el('span', {}, `Masa aktif ${tanggal(o.starts_on)} – ${tanggal(o.ends_on)}`,
        o.status === 'aktif' && sisa != null ? el('span', { class: 'tag ' + (sisa <= 3 ? 'merah' : '') }, sisa < 0 ? `lewat ${-sisa} hari` : `sisa ${sisa} hari`) : null)
      : null;

    return el('article', { class: 'pesanan item-form' },
      el('div', { class: 'row', style: 'justify-content:space-between' },
        el('div', {}, el('b', { class: 'kode' }, o.code), ' ', el('span', { class: 'tag ' + st.kelas }, st.label),
          en ? el('span', { class: 'tag' }, 'EN') : null,
          o.kind === 'bundle' ? el('span', { class: 'tag biru' }, 'Bundle: ' + (o.bundle_name || '–')) : null,
          o.kind === 'rakit' ? el('span', { class: 'tag biru' }, 'Rakitan') : null),
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
      el('div', { style: 'margin-top:8px' }, bagianUlasan(o)));
  };

  const gambarDaftar = () => {
    const s = SARING.find((x) => x.kunci === saringan);
    const kata = cari.value.trim().toLowerCase().replace(/^\+/, '');
    const cocok = pesanan.filter((o) => s.cocok(o) &&
      (!kata || `${o.code} ${o.customer_name} ${o.customer_wa}`.toLowerCase().includes(kata)));
    // pesanan aktif diurutkan dari yang paling cepat berakhir
    if (saringan === 'aktif') cocok.sort((a, b) => (a.ends_on || '9').localeCompare(b.ends_on || '9'));
    tab.replaceChildren(...SARING.map((x) => el('button', {
      type: 'button', class: 'kecil ' + (x.kunci === saringan ? '' : 'sec'), 'aria-pressed': String(x.kunci === saringan),
      onclick: () => { saringan = x.kunci; gambarDaftar(); },
    }, `${x.label} (${pesanan.filter(x.cocok).length})`)));
    daftar.replaceChildren(...(cocok.length ? cocok.map(kartu) : [el('p', { class: 'muted' }, pesanan.length ? 'Tidak ada pesanan di sini.' : 'Belum ada pesanan dari website.')]));
  };
  cari.addEventListener('input', gambarDaftar);
  gambarRingkas();
  gambarDaftar();

  halaman.replaceChildren(ringkas, el('section', { class: 'card' },
    el('h2', {}, 'Pesanan'),
    el('p', { class: 'sub' }, 'Pembeli membuat pesanan di website lalu mengirimnya ke WhatsApp toko. Ubah status setelah pembayaran masuk. Status "Aktif" otomatis mengisi tanggal mulai (hari ini) dan tanggal berakhir sesuai durasi paket.'),
    tab, el('div', { style: 'margin-top:10px' }, cari), daftar));
}
