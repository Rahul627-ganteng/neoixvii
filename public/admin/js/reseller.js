// Menu Reseller: atur halaman /reseller/ (harga, periode & hitung mundur, benefit) dan kelola booking slot.
import { el, isian, q, rp, tabel, tautanWa, td, toast, waktu } from './alat.js';

let saringan = 'aktif';
const angka = (v) => { const d = String(v ?? '').replace(/[^\d]/g, ''); return d === '' ? null : Number(d); };
const keLokal = (d) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const STATUS = { baru: ['Baru', 'kuning'], dihubungi: ['Sudah dihubungi', 'biru'], lunas: ['Lunas', 'hijau'], batal: ['Batal', 'merah'] };

export async function halamanReseller(supabase, halaman) {
  let pr, booking;
  try {
    [pr, booking] = await Promise.all([
      q(supabase.from('reseller_program').select('*').eq('id', 1).maybeSingle()),
      q(supabase.from('reseller_bookings').select('*').order('created_at', { ascending: false }).limit(500)),
    ]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Reseller butuh migration 20261113000000_member_kupon_notif.sql. Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  const segarkan = () => halamanReseller(supabase, halaman);

  // ---------------------------------------------------------------- booking slot
  const SARING = [['aktif', 'Perlu ditindak', (b) => ['baru', 'dihubungi'].includes(b.status)], ['lunas', 'Lunas', (b) => b.status === 'lunas'],
    ['batal', 'Batal', (b) => b.status === 'batal'], ['semua', 'Semua', () => true]];
  const daftar = el('div');
  const tab = el('div', { class: 'row tab', role: 'group', 'aria-label': 'Saring booking' });
  function gambarBooking() {
    tab.replaceChildren(...SARING.map(([k, l, f]) => el('button', { type: 'button', class: 'kecil ' + (k === saringan ? '' : 'sec'), 'aria-pressed': String(k === saringan),
      onclick: () => { saringan = k; gambarBooking(); } }, `${l} (${booking.filter(f).length})`)));
    const cocok = booking.filter(SARING.find(([k]) => k === saringan)[2]);
    daftar.replaceChildren(cocok.length ? tabel(['Pendaftar', 'WhatsApp', 'Harga', 'Masuk', 'Status', ''], cocok.map((b) => {
      const pilih = el('select', { 'aria-label': 'Status booking' }, Object.entries(STATUS).map(([k, [l]]) => el('option', { value: k, selected: k === b.status }, l)));
      pilih.addEventListener('change', async () => {
        try { await q(supabase.from('reseller_bookings').update({ status: pilih.value, updated_at: new Date().toISOString() }).eq('id', b.id)); b.status = pilih.value; toast('Status booking diperbarui'); gambarBooking(); }
        catch (err) { toast('Gagal: ' + err.message, true); }
      });
      const [label, kelas] = STATUS[b.status] ?? [b.status, ''];
      const pesan = `Halo ${b.name}! Terima kasih sudah booking slot Reseller IXVII.CO${b.harga ? ` (${rp(b.harga)})` : ''}. `;
      return el('tr', {},
        td(el('div', {}, el('b', {}, b.name), b.kota ? el('div', { class: 'muted' }, b.kota) : null, b.catatan ? el('div', { class: 'muted' }, `“${b.catatan}”`) : null)),
        td(el('a', { href: tautanWa(b.wa), target: '_blank', rel: 'noopener' }, '+' + b.wa)),
        td(b.harga ? rp(b.harga) : el('span', { class: 'muted' }, 'di luar promo')), td(waktu(b.created_at)),
        td(el('span', { class: 'tag ' + kelas }, label)),
        td(el('div', { class: 'row' }, pilih, el('a', { class: 'btn sec kecil', href: tautanWa(b.wa, pesan), target: '_blank', rel: 'noopener' }, 'Chat'))));
    })) : el('p', { class: 'muted' }, booking.length ? 'Tidak ada booking di sini.' : 'Belum ada booking. Pendaftar dari halaman /reseller/ akan muncul di sini.'));
  }
  gambarBooking();

  // ---------------------------------------------------------------- pengaturan halaman
  const aktif = el('input', { type: 'checkbox', id: 'resAktif' }); aktif.checked = !!pr?.aktif;
  const judul = el('input', { type: 'text', value: pr?.judul ?? '', maxlength: 90 });
  const sub = el('textarea', { rows: 2, maxlength: 240, value: pr?.subjudul ?? '' });
  const label = el('input', { type: 'text', value: pr?.label_promo ?? '', maxlength: 40, placeholder: 'mis. Flash Sale Payday' });
  const periode = el('input', { type: 'text', value: pr?.periode_teks ?? '', maxlength: 80, placeholder: 'mis. Spesial Payday Sale November' });
  const normal = el('input', { type: 'text', inputmode: 'numeric', value: pr?.harga_normal ?? '' });
  const promo = el('input', { type: 'text', inputmode: 'numeric', value: pr?.harga_promo ?? '' });
  const mulai = el('input', { type: 'datetime-local', value: keLokal(pr?.mulai) });
  const sampai = el('input', { type: 'datetime-local', value: keLokal(pr?.sampai) });
  const slot = el('input', { type: 'text', value: pr?.slot_teks ?? '', maxlength: 120, placeholder: 'mis. Update slot 5 Nov: sisa 5 slot lagi' });
  const benefit = el('textarea', { rows: 12, value: pr?.benefit ?? '' });
  const cocok = el('textarea', { rows: 4, value: pr?.cocok ?? '' });
  const simpan = el('button', { type: 'button' }, 'Simpan halaman reseller');
  simpan.addEventListener('click', async () => {
    if (judul.value.trim().length < 5) return toast('Isi judul', true);
    if (mulai.value && sampai.value && mulai.value >= sampai.value) return toast('Akhir promo harus setelah mulai promo', true);
    try {
      await q(supabase.from('reseller_program').update({
        aktif: aktif.checked, judul: judul.value.trim(), subjudul: sub.value.trim(), label_promo: label.value.trim() || 'Flash Sale',
        periode_teks: periode.value.trim() || null, harga_normal: angka(normal.value) ?? 0, harga_promo: angka(promo.value) ?? 0,
        mulai: mulai.value ? new Date(mulai.value).toISOString() : null, sampai: sampai.value ? new Date(sampai.value).toISOString() : null,
        slot_teks: slot.value.trim() || null, benefit: benefit.value.trim(), cocok: cocok.value.trim(), updated_at: new Date().toISOString(),
      }).eq('id', 1));
      try { sessionStorage.removeItem('ixvii-reseller-v1'); } catch { /* abaikan */ }
      toast('Halaman reseller tersimpan'); segarkan();
    } catch (err) { toast('Gagal: ' + err.message, true); }
  });
  const sekarang = Date.now();
  const berjalan = pr?.aktif && (!pr.mulai || Date.parse(pr.mulai) <= sekarang) && (!pr.sampai || Date.parse(pr.sampai) >= sekarang);

  halaman.replaceChildren(
    el('section', { class: 'card' },
      el('h2', {}, 'Booking slot reseller'),
      el('p', { class: 'sub' }, 'Masuk dari ', el('a', { href: '/reseller/', target: '_blank', rel: 'noopener' }, 'halaman Reseller ↗'),
        '. Kamu juga dapat notifikasi WhatsApp & email setiap ada booking (atur di menu Notifikasi).'),
      tab, el('div', { style: 'margin-top:10px' }, daftar)),
    el('section', { class: 'card' },
      el('h2', {}, 'Halaman & harga reseller'),
      el('div', { class: berjalan ? 'msg ok' : 'msg warn', style: 'margin:0 0 12px' }, berjalan
        ? `Promo sedang berjalan: ${rp(pr.harga_promo)}${pr.sampai ? `, hitung mundur sampai ${waktu(pr.sampai)}` : ''}.`
        : 'Promo tidak sedang berjalan. Pengunjung melihat "Daftar tunggu batch berikutnya" dan booking masuk tanpa harga.'),
      el('label', { class: 'row', for: 'resAktif', style: 'margin-bottom:8px' }, aktif, 'Pendaftaran reseller dibuka'),
      el('div', { class: 'grid2' },
        isian('Judul besar', judul), isian('Label promo', label, 'Muncul di pita kecil di atas judul & di kartu beranda.'),
        isian('Harga normal / worth (dicoret)', normal), isian('Harga promo', promo),
        isian('Promo mulai', mulai), isian('Promo berakhir (hitung mundur)', sampai, 'Hitung mundur di beranda & halaman reseller berhenti di waktu ini.'),
        isian('Teks periode', periode), isian('Teks slot', slot, 'mis. jumlah slot tersisa. Kosongkan kalau tidak perlu.')),
      isian('Kalimat di bawah judul', sub),
      el('div', { class: 'grid2' },
        isian('Benefit (satu baris satu benefit)', benefit, 'Awali dengan "- " untuk sub-poin. Apit dengan **…** untuk teks tebal.'),
        isian('Cocok untuk (satu baris satu)', cocok)),
      el('div', { class: 'row', style: 'margin-top:10px' }, simpan, el('a', { class: 'btn sec', href: '/reseller/', target: '_blank', rel: 'noopener' }, 'Lihat halaman ↗'))));
}
