// Menu Garansi: baca balasan WhatsApp aktivasi garansi secara otomatis, daftar garansi, screenshot login,
// dan pengingat WhatsApp sebelum langganan berakhir.
import { el, hariIni, isian, q, tabel, td, toast, waktu, tautanWa } from './alat.js';
import { bacaBalasanGaransi, cocokkanPesanan, pesanGaransiLink, pesanGaransiManual, pesanPengingat, rapikanHp } from './garansi-baca.js';

const MAKS_SS = 3 * 1024 * 1024;
let saringan = 'semua';

const tgl = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
const sisaHari = (ends) => (ends ? Math.round((Date.parse(ends + 'T00:00:00Z') - Date.parse(hariIni() + 'T00:00:00Z')) / 86400000) : null);
const akhir = (g) => g.orders?.ends_earliest || g.orders?.ends_on;
const keLokal = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

export async function halamanGaransi(supabase, halaman) {
  let garansi, pesanan;
  try {
    [garansi, pesanan] = await Promise.all([
      q(supabase.from('warranties').select('*,orders(code,status,ends_on,ends_earliest,lang,customer_wa)').order('submitted_at', { ascending: false }).limit(500)),
      q(supabase.from('orders').select('id,code,customer_name,customer_wa,status,created_at,delivered_at,ends_on,lang,order_items(app_name,variant_label)')
        .order('created_at', { ascending: false }).limit(500)),
    ]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Garansi butuh migration garansi (20261107000000_garansi.sql). Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  const segarkan = () => halamanGaransi(supabase, halaman);
  halaman.replaceChildren(kartuBelum(supabase, pesanan, garansi), kartuTempel(supabase, pesanan, segarkan), kartuDaftar(supabase, garansi), kartuTemplate());
}

// ---------------------------------------------------------------- pesanan aktif tanpa garansi
function kartuBelum(supabase, pesanan, garansi) {
  const sudah = new Set(garansi.map((g) => g.order_id).filter(Boolean));
  const sekarang = Date.now();
  const daftar = pesanan.filter((o) => o.status === 'aktif' && !sudah.has(o.id))
    .map((o) => ({ o, menunggu: o.delivered_at && sekarang < Date.parse(o.delivered_at) + 864e5 }));
  const baris = ({ o, menunggu }) => {
    const aksi = el('div', { class: 'row' });
    const buat = el('button', { type: 'button', class: 'sec kecil' }, 'Buat link garansi');
    buat.addEventListener('click', async () => {
      buat.disabled = true;
      try {
        const h = await q(supabase.rpc('buat_link_ulasan', { p_kode: o.code }));
        aksi.replaceChildren(el('a', { class: 'btn kecil wa', href: tautanWa(o.customer_wa, pesanGaransiLink(o, `${location.origin}/garansi/?t=${h.token}`)), target: '_blank', rel: 'noopener' }, 'Kirim lewat WhatsApp'));
      } catch (err) { toast('Gagal: ' + err.message, true); buat.disabled = false; }
    });
    aksi.append(buat);
    const jam = menunggu ? Math.max(1, Math.ceil((Date.parse(o.delivered_at) + 864e5 - sekarang) / 36e5)) : 0;
    return el('tr', {}, td(el('b', {}, o.code)), td(o.customer_name), td([...new Set(o.order_items.map((i) => i.app_name))].join(', ')),
      td(o.delivered_at ? waktu(o.delivered_at) : '–'),
      td(el('span', { class: 'tag ' + (menunggu ? 'kuning' : 'merah') }, menunggu ? `Menunggu form · sisa ${jam} jam` : 'Garansi tidak aktif')), td(aksi));
  };
  return el('section', { class: 'card' },
    el('h2', {}, `Pesanan aktif tanpa garansi (${daftar.length})`),
    el('p', { class: 'sub' }, 'Garansi hanya aktif kalau pembeli mengirim form (atau balasan) dalam 1x24 jam sejak akun dikirim. Kuning = masih ditunggu, merah = garansi tidak aktif.'),
    daftar.length ? tabel(['Pesanan', 'Pembeli', 'Aplikasi', 'Akun dikirim', 'Garansi', ''], daftar.map(baris))
      : el('p', { class: 'muted' }, 'Semua pesanan aktif sudah punya garansi.'));
}

// ---------------------------------------------------------------- tempel balasan WhatsApp
function kartuTempel(supabase, pesanan, segarkan) {
  const teks = el('textarea', { rows: 8, placeholder: 'Tempel balasan pembeli di sini, misalnya:\n\nNama: wicak\nNo. HP Aktif: 0812…\nAplikasi : Netflix\nDurasi : 1 bulan\nTanggal Beli : 31/10/2026\nDevice yang Dipakai: iPhone 13' });
  const hasil = el('div');
  const baca = el('button', { type: 'button', class: 'kecil' }, 'Baca otomatis');
  baca.addEventListener('click', () => {
    const d = bacaBalasanGaransi(teks.value);
    if (!d.nama && !d.hp && !d.aplikasi) {
      hasil.replaceChildren(el('div', { class: 'msg warn' }, 'Belum ada data yang terbaca. Pastikan balasan memakai format "Nama: …", "No. HP Aktif: …", dan seterusnya.'));
      return;
    }
    tampilkanHasil(d);
  });

  function tampilkanHasil(d) {
    const f = (v, ph) => el('input', { type: 'text', value: v || '', placeholder: ph });
    const nama = f(d.nama, 'Nama'), hp = f(d.hp, '62812…'), app = f(d.aplikasi, 'Aplikasi'), durasi = f(d.durasi, 'Durasi');
    const tanggal = el('input', { type: 'date', value: d.tanggal || '' });
    const device = f(d.device, 'Device');
    const diterima = el('input', { type: 'datetime-local', value: keLokal(Date.now()) });
    const kandidat = cocokkanPesanan(d, pesanan).slice(0, 8);
    const pilih = el('select', {},
      kandidat.map(({ o }, i) => el('option', { value: o.id, selected: i === 0 },
        `${o.code} · ${o.customer_name} · ${[...new Set(o.order_items.map((x) => x.app_name))].join(', ')} · ${new Date(o.created_at).toLocaleDateString('id-ID')} · ${o.status}`)),
      el('option', { value: '', selected: !kandidat.length }, '— tanpa pesanan (tidak ditemukan) —'));
    const status = el('div', { class: 'muted' });
    const hitungTepat = () => {
      const o = pesanan.find((x) => String(x.id) === pilih.value);
      if (!o?.delivered_at) { status.textContent = 'Waktu kirim akun tidak diketahui, jadi batas 1x24 jam tidak bisa dihitung.'; return null; }
      const tepat = Date.parse(diterima.value) <= Date.parse(o.delivered_at) + 864e5;
      status.textContent = `Akun dikirim ${waktu(o.delivered_at)} → ${tepat ? 'masih dalam 1x24 jam, garansi aktif ✓' : 'lewat 1x24 jam, garansi tersimpan sebagai TIDAK aktif (bisa kamu aktifkan manual)'}`;
      return tepat;
    };
    pilih.addEventListener('change', hitungTepat); diterima.addEventListener('change', hitungTepat);
    hitungTepat();

    let ss = null;
    const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Screenshot bukti login' });
    const infoSs = el('span', { class: 'muted' }, 'Belum ada screenshot');
    file.addEventListener('change', async () => {
      const b = file.files[0];
      if (!b) return;
      try {
        if (!/^image\/(png|jpeg|webp)$/.test(b.type)) throw new Error('Screenshot harus JPG, PNG, atau WebP');
        if (b.size > MAKS_SS) throw new Error('Screenshot maksimal 3 MB');
        const path = `admin/${Date.now()}.${b.type.split('/')[1].replace('jpeg', 'jpg')}`;
        await q(supabase.storage.from('garansi').upload(path, b, { contentType: b.type }));
        ss = path; infoSs.textContent = 'Screenshot terunggah ✓';
      } catch (err) { toast(err.message, true); }
      file.value = '';
    });

    const simpan = el('button', { type: 'button' }, 'Simpan garansi');
    simpan.addEventListener('click', async () => {
      if (!nama.value.trim()) return toast('Nama wajib diisi', true);
      const tepat = hitungTepat();
      const baris = {
        order_id: pilih.value ? Number(pilih.value) : null, customer_name: nama.value.trim(), phone: rapikanHp(hp.value) || null,
        app_name: app.value.trim() || null, duration: durasi.value.trim() || null, purchased_on: tanggal.value || null,
        purchased_text: d.tanggalTeks || null, device: device.value.trim() || null, screenshot_path: ss, source: 'tempel',
        on_time: tepat, status: tepat === false ? 'tidak_aktif' : 'aktif', submitted_at: new Date(diterima.value).toISOString(),
      };
      simpan.disabled = true;
      try { await q(supabase.from('warranties').insert(baris)); toast('Garansi tersimpan'); segarkan(); }
      catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
    });

    hasil.replaceChildren(el('div', { class: 'item-form' },
      el('b', {}, 'Hasil baca otomatis (periksa dan ubah kalau perlu)'),
      el('div', { class: 'grid2' }, isian('Nama', nama), isian('No. HP aktif', hp), isian('Aplikasi', app), isian('Durasi', durasi),
        isian('Tanggal beli', tanggal, d.tanggalTeks && !d.tanggal ? `Tertulis "${d.tanggalTeks}", isi manual` : null), isian('Device', device)),
      isian('Pesanan yang cocok', pilih, kandidat.length ? `${kandidat.length} pesanan cocok, yang paling mirip dipilih otomatis.` : 'Tidak ada pesanan dengan nomor/aplikasi ini. Garansi tetap bisa disimpan tanpa pesanan.'),
      el('div', { class: 'grid2' }, isian('Balasan diterima pada', diterima), el('div', {}, el('label', { class: 'f' }, 'Screenshot bukti login (dari chat WhatsApp)'), file, el('div', {}, infoSs))),
      status,
      el('div', { class: 'row', style: 'margin-top:10px' }, simpan)));
  }

  return el('section', { class: 'card' },
    el('h2', {}, 'Baca balasan garansi dari WhatsApp'),
    el('p', { class: 'sub' }, 'Untuk pembeli yang membalas dengan format teks. Salin balasannya dari WhatsApp, tempel di sini, lalu klik Baca otomatis. Kolom terisi sendiri dan pesanannya dicari dari nomor HP, aplikasi, dan tanggal beli.'),
    teks, el('div', { class: 'row', style: 'margin-top:8px' }, baca), el('div', { style: 'margin-top:10px' }, hasil));
}

// ---------------------------------------------------------------- daftar garansi
function kartuDaftar(supabase, garansi) {
  const tab = el('div', { class: 'row tab', role: 'group', 'aria-label': 'Saring garansi' });
  const daftar = el('div');
  const SARING = [
    ['semua', 'Semua', () => true],
    ['ingat', 'Perlu diingatkan (≤ 3 hari)', (g) => g.status === 'aktif' && akhir(g) && (sisaHari(akhir(g)) ?? 99) <= 3 && sisaHari(akhir(g)) >= -3],
    ['telat', 'Lewat 1x24 jam', (g) => g.on_time === false],
    ['tidak', 'Tidak aktif', (g) => g.status === 'tidak_aktif'],
  ];
  const lihatSs = async (g) => {
    const w = window.open('', '_blank');
    try {
      const { signedUrl } = await q(supabase.storage.from('garansi').createSignedUrl(g.screenshot_path, 600));
      if (w) w.location = signedUrl; else location.href = signedUrl;
    } catch (err) { w?.close(); toast('Gagal membuka screenshot: ' + err.message, true); }
  };
  const ubahStatus = async (g, status) => {
    try { await q(supabase.from('warranties').update({ status }).eq('id', g.id)); g.status = status; toast(`Garansi ${status === 'aktif' ? 'diaktifkan' : 'dinonaktifkan'}`); gambar(); }
    catch (err) { toast('Gagal: ' + err.message, true); }
  };

  function gambar() {
    tab.replaceChildren(...SARING.map(([k, l, c]) => el('button', {
      type: 'button', class: 'kecil ' + (k === saringan ? '' : 'sec'), 'aria-pressed': String(k === saringan),
      onclick: () => { saringan = k; gambar(); },
    }, `${l} (${garansi.filter(c).length})`)));
    const cocok = garansi.filter(SARING.find(([k]) => k === saringan)[2]);
    daftar.replaceChildren(cocok.length ? el('div', {}, cocok.map((g) => {
      const sisa = sisaHari(akhir(g));
      const nomor = g.phone || g.orders?.customer_wa;
      return el('article', { class: 'item-form garansi-admin' },
        el('div', { class: 'row', style: 'justify-content:space-between' },
          el('div', {}, el('b', {}, g.customer_name), ' ',
            el('span', { class: 'tag ' + (g.status === 'aktif' ? 'hijau' : 'merah') }, g.status === 'aktif' ? 'Garansi aktif ✓' : 'Garansi tidak aktif'),
            g.on_time === false ? el('span', { class: 'tag kuning' }, 'lewat 1x24 jam') : g.on_time ? el('span', { class: 'tag' }, 'tepat waktu') : null,
            el('span', { class: 'tag' }, g.source === 'form' ? 'lewat form' : 'dari balasan WA')),
          el('span', { class: 'muted' }, waktu(g.submitted_at))),
        el('div', { class: 'muted', style: 'margin-top:6px' },
          `${g.app_name || '–'}${g.duration ? ` · ${g.duration}` : ''} · device: ${g.device || '–'} · dibeli ${tgl(g.purchased_on) !== '–' ? tgl(g.purchased_on) : g.purchased_text || '–'}`),
        el('div', { class: 'muted' }, nomor ? `+${nomor}` : 'tanpa nomor', g.orders ? ` · pesanan ${g.orders.code}` : ' · tanpa pesanan',
          g.orders?.ends_on ? ` · berakhir ${g.orders.ends_earliest && g.orders.ends_earliest !== g.orders.ends_on ? `${tgl(g.orders.ends_earliest)} s/d ` : ''}${tgl(g.orders.ends_on)}${sisa != null ? ` (${sisa < 0 ? `lewat ${-sisa} hari` : `sisa ${sisa} hari`})` : ''}` : ''),
        el('div', { class: 'row', style: 'margin-top:8px' },
          g.screenshot_path ? el('button', { type: 'button', class: 'sec kecil', onclick: () => lihatSs(g) }, 'Lihat screenshot') : el('span', { class: 'tag kuning' }, 'tanpa screenshot'),
          nomor && g.orders?.ends_on ? el('a', { class: 'btn kecil wa', href: tautanWa(nomor, pesanPengingat(g.customer_name, g.app_name, g.orders.ends_on, g.orders.lang)), target: '_blank', rel: 'noopener' }, 'Kirim pengingat') : null,
          g.status === 'aktif' ? el('button', { type: 'button', class: 'kecil bahaya', onclick: () => ubahStatus(g, 'tidak_aktif') }, 'Nonaktifkan garansi')
            : el('button', { type: 'button', class: 'kecil', onclick: () => ubahStatus(g, 'aktif') }, 'Aktifkan garansi')));
    })) : el('p', { class: 'muted' }, garansi.length ? 'Tidak ada data di sini.' : 'Belum ada garansi yang tercatat.'));
  }
  gambar();
  return el('section', { class: 'card' },
    el('h2', {}, `Garansi tercatat (${garansi.length})`),
    el('p', { class: 'sub' }, 'Dari form aktivasi dan dari balasan WhatsApp yang ditempel. Tab "Perlu diingatkan" berisi langganan yang berakhir dalam 3 hari; klik Kirim pengingat untuk membuka WhatsApp dengan pesan yang sudah terisi.'),
    tab, el('div', { style: 'margin-top:10px' }, daftar));
}

// ---------------------------------------------------------------- template
function kartuTemplate() {
  const contoh = pesanGaransiManual({});
  const salin = el('button', { type: 'button', class: 'sec kecil' }, 'Salin template');
  salin.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(contoh); toast('Template disalin'); } catch { prompt('Salin teks ini:', contoh); }
  });
  return el('section', { class: 'card' },
    el('h2', {}, 'Template balasan manual'),
    el('p', { class: 'sub' }, 'Cara yang lebih praktis: di menu Pesanan, klik "Buat link garansi & ulasan". Pembeli mengisi form sendiri, termasuk screenshot dan rating. Template ini untuk pembeli yang lebih suka membalas lewat chat; tombol "Salin template manual" di Pesanan sudah mengisi nama, aplikasi, durasi, dan tanggal.'),
    el('pre', { class: 'template-garansi' }, contoh), el('div', { class: 'row', style: 'margin-top:8px' }, salin));
}
