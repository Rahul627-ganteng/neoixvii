// Menu Pesanan: daftar pesanan dari website, ubah status, hubungi pembeli lewat WhatsApp, pantau masa aktif.
import { el, q, rp, toast, waktu, hariIni, tautanWa } from './alat.js';
import { pesanGaransiLink, pesanGaransiManual } from './garansi-baca.js';

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
  const ambil = (kolom) => q(supabase.from('orders').select(kolom).order('created_at', { ascending: false }).limit(300));
  const dasar = '*,order_items(app_name,plan_label,variant_label,price,duration_days)';
  // kolom ulasan & garansi baru ada setelah migration Tahap 8 / garansi
  const pesanan = await ambil(dasar + ',reviews(rating,status),warranties(id,on_time,status)')
    .catch(() => ambil(dasar + ',reviews(rating,status)')).catch(() => ambil(dasar));
  // affiliate (setelah migration affiliate): pesanan bisa diatasnamakan affiliate → komisi otomatis saat Aktif
  const mitra = pesanan.some((o) => 'partner_id' in o)
    ? await q(supabase.from('partners').select('id,name,kind,referral_code,is_active').order('name')).catch(() => []) : [];

  const cari = el('input', { type: 'search', placeholder: 'Cari kode, nama, atau nomor WhatsApp…', 'aria-label': 'Cari pesanan' });
  const tab = el('div', { class: 'row tab', role: 'group', 'aria-label': 'Saring pesanan' });
  const daftar = el('div');
  const ringkas = el('div', { class: 'stats' });

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
    if (g && o.reviews?.length) return wadah;
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

  const gambarDaftar = () => {
    const s = SARING.find((x) => x.kunci === saringan);
    const kata = cari.value.trim().toLowerCase().replace(/^\+/, '');
    const cocok = pesanan.filter((o) => s.cocok(o) &&
      (!kata || `${o.code} ${o.customer_name} ${o.customer_wa}`.toLowerCase().includes(kata)));
    // pesanan aktif diurutkan dari yang paling cepat berakhir
    if (saringan === 'aktif') cocok.sort((a, b) => (akhirAwal(a) || '9').localeCompare(akhirAwal(b) || '9'));
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
