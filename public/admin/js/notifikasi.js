// Menu Notifikasi: sambungkan WhatsApp (Fonnte) & email (Resend), pilih notifikasi yang dikirim,
// uji kirim, lihat riwayat kiriman, dan ubah isi pesan otomatis (affiliate, member, reseller).
// Token tidak pernah ditampilkan lagi setelah disimpan (hanya 4 huruf terakhir).
import { el, isian, q, toast, waktu } from './alat.js';

const NAMA_ACARA = {
  pesanan_baru: 'Pesanan baru', member_baru: 'Member baru', affiliate_baru: 'Pendaftar affiliate', reseller_baru: 'Booking reseller',
  affiliate_aturan: 'Ke affiliate: aturan main', affiliate_alur: 'Ke affiliate: alur kerja', member_selamat: 'Ke member: sambutan',
  member_link: 'Ke member: link akun', reseller_sambutan: 'Ke reseller: sambutan', tes: 'Tes',
};

export async function halamanNotifikasi(supabase, halaman) {
  let s, log, templat;
  try {
    [s, log, templat] = await Promise.all([
      q(supabase.rpc('status_notif')),
      q(supabase.rpc('log_notif', { p_batas: 40 })),
      q(supabase.from('pesan_otomatis').select('*').order('kunci')),
    ]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Notifikasi butuh migration 20261113000000_member_kupon_notif.sql. Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  const segarkan = () => halamanNotifikasi(supabase, halaman);

  // ---------------------------------------------------------------- status & sambungan
  const status = (ok, teksOk, teksBelum) => el('span', { class: 'tag ' + (ok ? 'hijau' : 'kuning') }, ok ? teksOk : teksBelum);
  const ownerWa = el('input', { type: 'tel', inputmode: 'tel', value: s.owner_wa ?? '', placeholder: '0812…' });
  const ownerEmail = el('input', { type: 'email', value: s.owner_email ?? '', placeholder: 'kamu@gmail.com' });
  const fonnte = el('input', { type: 'password', autocomplete: 'off', placeholder: s.fonnte ? `tersimpan (…${s.fonnte_akhir}), isi untuk mengganti` : 'tempel token Fonnte' });
  const resend = el('input', { type: 'password', autocomplete: 'off', placeholder: s.resend ? `tersimpan (…${s.resend_akhir}), isi untuk mengganti` : 're_…' });
  const dari = el('input', { type: 'text', value: s.email_from ?? '' });
  const situs = el('input', { type: 'url', value: s.site_url ?? '' });
  const saklar = (kunci, label) => { const c = el('input', { type: 'checkbox', id: 'n-' + kunci }); c.checked = !!s[kunci]; c.dataset.kunci = kunci; return el('label', { class: 'row', for: 'n-' + kunci }, c, label); };
  const pilihan = [
    saklar('wa_pesanan', 'WhatsApp ke aku setiap ada pesanan baru'), saklar('email_pesanan', 'Email ke aku setiap ada pesanan baru'),
    saklar('wa_daftar', 'WhatsApp ke aku saat ada member / affiliate / reseller baru'), saklar('email_daftar', 'Email ke aku saat ada member / affiliate / reseller baru'),
    saklar('auto_affiliate', 'Kirim otomatis aturan main & alur kerja ke pendaftar affiliate'),
    saklar('auto_member', 'Kirim otomatis sambutan + link akun ke member baru'),
    saklar('auto_reseller', 'Kirim otomatis sambutan ke pendaftar reseller')];
  const simpan = el('button', { type: 'button' }, 'Simpan pengaturan');
  simpan.addEventListener('click', async () => {
    const p = { owner_wa: ownerWa.value, owner_email: ownerEmail.value.trim(), email_from: dari.value.trim(), site_url: situs.value.trim() };
    if (fonnte.value.trim()) p.fonnte_token = fonnte.value.trim();
    if (resend.value.trim()) p.resend_key = resend.value.trim();
    for (const l of pilihan) { const c = l.querySelector('input'); p[c.dataset.kunci] = c.checked; }
    simpan.disabled = true;
    try { await q(supabase.rpc('simpan_notif', { p })); toast('Pengaturan notifikasi tersimpan'); segarkan(); }
    catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
  });
  const hapusToken = (kunci, nama) => el('button', { type: 'button', class: 'sec kecil', onclick: async () => {
    if (!confirm(`Hapus ${nama}? Notifikasi lewat ${nama.split(' ')[1]} berhenti.`)) return;
    try { await q(supabase.rpc('simpan_notif', { p: { [kunci]: '' } })); toast(`${nama} dihapus`); segarkan(); } catch (err) { toast('Gagal: ' + err.message, true); }
  } }, 'Hapus');
  const tes = el('button', { type: 'button', class: 'sec' }, 'Kirim tes ke WA & email-ku');
  tes.addEventListener('click', async () => {
    tes.disabled = true; tes.textContent = 'Mengirim…';
    try { await q(supabase.rpc('tes_notif')); toast('Tes dikirim. Cek WhatsApp & email, lalu lihat riwayat di bawah.'); setTimeout(segarkan, 4000); }
    catch (err) { toast('Gagal: ' + err.message, true); tes.disabled = false; tes.textContent = 'Kirim tes ke WA & email-ku'; }
  });

  const panduan = el('details', { class: 'item-form', open: !(s.fonnte || s.resend) },
    el('summary', {}, el('b', {}, 'Cara menyambungkan (sekali saja)')),
    el('ol', { class: 'langkah-panduan' },
      el('li', {}, el('b', {}, 'WhatsApp (Fonnte): '), 'daftar di ', el('a', { href: 'https://fonnte.com', target: '_blank', rel: 'noopener' }, 'fonnte.com'),
        ' → menu Device → Add device (isi nomor WhatsApp yang akan MENGIRIM pesan, sebaiknya nomor toko) → Connect → scan QR dari WhatsApp di HP (Perangkat tertaut). Salin Token device, tempel di kolom "Token Fonnte".'),
      el('li', {}, el('b', {}, 'Email (Resend): '), 'daftar di ', el('a', { href: 'https://resend.com', target: '_blank', rel: 'noopener' }, 'resend.com'),
        ' memakai Gmail yang sama dengan "Email penerima" → API Keys → Create API Key (Sending access) → salin (diawali re_), tempel di kolom "API key Resend".'),
      el('li', {}, 'Klik Simpan, lalu "Kirim tes". Kalau WA & email masuk, semuanya sudah tersambung.'),
      el('li', {}, 'Kalau riwayat menulis "pg_net belum aktif": Supabase → Database → Extensions → cari pg_net → aktifkan.')),
    el('p', { class: 'muted', style: 'margin:6px 0 0' }, 'Fonnte memakai WhatsApp biasa lewat perangkat tertaut, jadi jangan dipakai kirim pesan massal supaya nomor tidak diblokir WhatsApp. Notifikasi di sini hanya untukmu dan pendaftar, jumlahnya kecil.'));

  const kartuSambungan = el('section', { class: 'card' },
    el('h2', {}, 'Notifikasi WhatsApp & email'),
    el('p', { class: 'sub' }, 'Dapat kabar setiap ada pesanan, member, affiliate, atau reseller baru. Pesan otomatis untuk pendaftar juga dikirim dari sini.'),
    el('div', { class: 'row', style: 'margin-bottom:10px' },
      status(s.pg_net, 'Database siap kirim', 'pg_net belum aktif'), status(s.fonnte, `WhatsApp tersambung (…${s.fonnte_akhir})`, 'WhatsApp belum disambungkan'),
      status(s.resend, `Email tersambung (…${s.resend_akhir})`, 'Email belum disambungkan')),
    panduan,
    el('div', { class: 'grid2', style: 'margin-top:10px' },
      isian('Nomor WhatsApp penerima (nomormu)', ownerWa, 'Notifikasi pesanan & pendaftar dikirim ke nomor ini.'),
      isian('Email penerima (Gmail-mu)', ownerEmail, 'Untuk akun Resend gratis tanpa domain, harus sama dengan email akun Resend.'),
      el('div', {}, isian('Token Fonnte', fonnte), s.fonnte ? hapusToken('fonnte_token', 'Token Fonnte') : null),
      el('div', {}, isian('API key Resend', resend), s.resend ? hapusToken('resend_key', 'API key Resend') : null),
      isian('Pengirim email', dari, 'Biarkan onboarding@resend.dev kalau belum memverifikasi domain di Resend.'),
      isian('Alamat website', situs, 'Dipakai untuk link di pesan (link akun member, link panel).')),
    el('div', { class: 'pilihan-notif' }, pilihan),
    el('div', { class: 'row', style: 'margin-top:12px' }, simpan, tes));

  // ---------------------------------------------------------------- riwayat
  const kartuLog = el('section', { class: 'card' },
    el('div', { class: 'row', style: 'justify-content:space-between' }, el('h2', {}, 'Riwayat kiriman'),
      el('button', { type: 'button', class: 'sec kecil', onclick: segarkan }, 'Muat ulang')),
    el('p', { class: 'sub' }, '"Jawaban server" berasal dari Fonnte/Resend dan hanya tersimpan beberapa jam. Fonnte menjawab "status":true kalau pesan masuk antrean kirim.'),
    log.length ? el('div', { class: 'tablewrap' }, el('table', { class: 'kartu-hp' },
      el('thead', {}, el('tr', {}, ['Waktu', 'Acara', 'Ke', 'Status', 'Jawaban server'].map((h) => el('th', {}, h)))),
      el('tbody', {}, log.map((l) => el('tr', {},
        el('td', { 'data-label': 'Waktu' }, waktu(l.waktu)),
        el('td', { 'data-label': 'Acara' }, `${NAMA_ACARA[l.acara] ?? l.acara} · ${l.saluran === 'wa' ? 'WhatsApp' : 'Email'}`, el('div', { class: 'muted' }, l.ringkas)),
        el('td', { 'data-label': 'Ke' }, l.tujuan ?? '–'),
        el('td', { 'data-label': 'Status' }, el('span', { class: 'tag ' + (l.status === 'dikirim' ? (l.http && l.http >= 400 ? 'merah' : 'hijau') : l.status === 'gagal' ? 'merah' : 'kuning') },
          l.status === 'dikirim' ? (l.http ? `dikirim · ${l.http}` : 'dikirim') : l.status), l.alasan ? el('div', { class: 'muted' }, l.alasan) : null),
        el('td', { 'data-label': 'Jawaban server' }, el('code', { class: 'jawaban' }, l.jawaban ?? '–'))))))) : el('p', { class: 'muted' }, 'Belum ada kiriman.'));

  // ---------------------------------------------------------------- pesan otomatis
  const kartuTemplat = el('section', { class: 'card' },
    el('h2', {}, 'Isi pesan otomatis'),
    el('p', { class: 'sub' }, 'Dikirim ke pendaftar lewat WhatsApp, dan pesan affiliate juga tampil di layar setelah mereka daftar. Kata dalam kurung kurawal diganti otomatis: ',
      el('code', {}, '{salam}'), ' (Selamat pagi/siang/sore/malam), ', el('code', {}, '{nama}'), ', ', el('code', {}, '{kode}'), ' (kode affiliate), ',
      el('code', {}, '{link}'), ' (link akun member), ', el('code', {}, '{harga}'), ', ', el('code', {}, '{pct}'), ', ', el('code', {}, '{pct_besar}'), ', ', el('code', {}, '{min}'),
      '. Format WhatsApp: *tebal*, _miring_.'),
    templat.map((tp) => {
      const isi = el('textarea', { rows: Math.min(18, Math.max(5, tp.isi.split('\n').length + 1)), maxlength: 6000, value: tp.isi });
      const simpanT = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
      simpanT.addEventListener('click', async () => {
        if (!isi.value.trim()) return toast('Pesan tidak boleh kosong', true);
        try { await q(supabase.from('pesan_otomatis').update({ isi: isi.value, updated_at: new Date().toISOString() }).eq('kunci', tp.kunci)); toast(`"${tp.judul}" tersimpan`); }
        catch (err) { toast('Gagal: ' + err.message, true); }
      });
      return el('details', { class: 'item-form' }, el('summary', {}, el('b', {}, tp.judul), ' ', el('span', { class: 'muted' }, `diubah ${waktu(tp.updated_at)}`)),
        isi, el('div', { class: 'row', style: 'margin-top:8px' }, simpanT));
    }));

  halaman.replaceChildren(kartuSambungan, kartuLog, kartuTemplat);
}
