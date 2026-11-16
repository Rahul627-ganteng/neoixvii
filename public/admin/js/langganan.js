// Menu Masa langganan: kolom "Hampir habis", "Sudah lewat", dan "Diperpanjang"; pengingat WhatsApp otomatis
// (beberapa hari sebelum berakhir, hari terakhir, kupon ajakan kembali), kirim manual, tandai sudah/tidak perpanjang.
import { el, isian, q, toast, waktu, tautanWa } from './alat.js';

let kolomHp = 'hampir';
let cari = '';
let saringApp = '';
let jendela = 7;

const tgl = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
const tglPendek = (t) => (t ? new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '');
const angka = (v) => { const d = String(v ?? '').replace(/[^\d]/g, ''); return d === '' ? null : Number(d); };
const salin = async (teks, pesan) => { try { await navigator.clipboard.writeText(teks); toast(pesan); } catch { prompt('Salin teks ini:', teks); } };

export async function halamanLangganan(supabase, halaman) {
  let rows, setelan, log;
  try {
    [rows, setelan, log] = await Promise.all([
      q(supabase.from('v_langganan').select('*').gte('sisa_hari', -60).order('berakhir')),
      q(supabase.from('pengingat_setelan').select('*').eq('id', 1).maybeSingle()),
      q(supabase.from('pengingat_log').select('id,order_id,app_key,jenis,status,created_at').order('created_at', { ascending: false }).limit(200)),
    ]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Masa langganan butuh migration 20261121000000_langganan_kabari_ajak_sorotan.sql. Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  let notif = null;
  try { notif = await q(supabase.rpc('status_notif')); } catch { /* menu Notifikasi belum ada */ }
  const segarkan = () => halamanLangganan(supabase, halaman);
  const waSiap = !!(notif?.fonnte && notif?.pg_net);

  // ---------------------------------------------------------------- kelompok
  const masuk = (r) => {
    if (r.keadaan === 'diperpanjang') return r.sisa_hari >= -30 ? 'perpanjang' : null;
    if (r.sisa_hari < 0) return 'lewat';
    if (r.sisa_hari <= jendela) return 'hampir';
    return 'aktif';
  };
  const cocok = (r) => (!saringApp || r.app_key === saringApp)
    && (!cari || `${r.customer_name} ${r.customer_wa} ${r.app_name} ${r.code}`.toLowerCase().includes(cari.toLowerCase().replace(/^0/, '62')));

  // ---------------------------------------------------------------- ringkasan
  const stat = (n, l, kelas = '') => el('div', { class: 'stat ' + kelas }, el('b', {}, n), el('span', {}, l));
  function gambarStat() {
    const berakhir30 = rows.filter((r) => r.sisa_hari < 0 && r.sisa_hari >= -30);
    const pulang = berakhir30.filter((r) => r.keadaan === 'diperpanjang').length;
    const seminggu = log.filter((l) => l.status === 'dikirim' && Date.now() - Date.parse(l.created_at) < 7 * 864e5).length;
    const hampir = rows.filter((r) => masuk(r) === 'hampir').length;
    const lewat = rows.filter((r) => masuk(r) === 'lewat' && r.keadaan !== 'tidak').length;
    return el('div', { class: 'stats' },
      stat(hampir, `hampir habis (≤ ${jendela} hari)`, hampir ? 'kuning' : ''),
      stat(lewat, 'sudah lewat, belum perpanjang', lewat ? 'merah' : ''),
      stat(rows.filter((r) => masuk(r) === 'perpanjang').length, 'diperpanjang 30 hari terakhir'),
      stat(berakhir30.length ? `${Math.round((pulang / berakhir30.length) * 100)}%` : '–', 'tingkat perpanjang (berakhir 30 hari)'),
      stat(seminggu, 'pengingat terkirim 7 hari'));
  }

  // ---------------------------------------------------------------- satu kartu langganan
  function kartu(r) {
    const kotak = el('article', { class: 'kartu-langganan' + (r.keadaan === 'tidak' ? ' redup' : '') });
    const sisa = r.sisa_hari;
    const lencana = r.keadaan === 'diperpanjang' ? el('span', { class: 'tag hijau' }, '✓ diperpanjang')
      : r.keadaan === 'memesan' ? el('span', { class: 'tag biru' }, 'sedang memesan lagi')
        : r.keadaan === 'tidak' ? el('span', { class: 'tag' }, 'tidak perpanjang')
          : sisa < 0 ? el('span', { class: 'tag merah' }, `lewat ${-sisa} hari`)
            : sisa === 0 ? el('span', { class: 'tag merah' }, 'berakhir hari ini')
              : el('span', { class: 'tag ' + (sisa <= 3 ? 'kuning' : '') }, `sisa ${sisa} hari`);
    const jejak = [
      r.sebelum_at ? `H-${Math.max(1, Math.round((Date.parse(r.berakhir + 'T00:00:00+07:00') - Date.parse(r.sebelum_at)) / 864e5))} ${tglPendek(r.sebelum_at)}` : null,
      r.hari_h_at ? `hari terakhir ${tglPendek(r.hari_h_at)}` : null,
      r.kembali_at ? `kupon ajakan ${tglPendek(r.kembali_at)}` : null,
      r.manual_at ? `manual ${tglPendek(r.manual_at)}` : null,
    ].filter(Boolean);

    const aksi = el('div', { class: 'row aksi-langganan' });
    const sibuk = (b, janji) => { b.disabled = true; return janji.finally(() => { b.disabled = false; }); };
    if (r.keadaan !== 'diperpanjang') {
      if (waSiap) {
        const kirim = el('button', { type: 'button', class: 'kecil wa-tombol' }, 'Kirim pengingat');
        kirim.addEventListener('click', () => sibuk(kirim, q(supabase.rpc('pengingat_manual', { p_order: r.order_id, p_app_key: r.app_key, p_kirim: true })))
          .then((h) => { toast(h.terkirim ? `Pengingat terkirim ke ${r.customer_name}` : 'Gagal mengirim, cek riwayat di menu Notifikasi', !h.terkirim); r.manual_at = new Date().toISOString(); gambarUlang(); })
          .catch((err) => toast('Gagal: ' + err.message, true)));
        aksi.append(kirim);
      }
      const dariHp = el('button', { type: 'button', class: 'kecil sec' }, waSiap ? 'WA dari HP' : 'Kirim pengingat (WA)');
      dariHp.addEventListener('click', () => {
        const w = window.open('', '_blank');
        sibuk(dariHp, q(supabase.rpc('pengingat_manual', { p_order: r.order_id, p_app_key: r.app_key, p_kirim: false })))
          .then((h) => { const url = tautanWa(h.wa, h.pesan); if (w) w.location = url; else location.href = url; r.manual_at = new Date().toISOString(); gambarUlang(); })
          .catch((err) => { w?.close(); toast('Gagal: ' + err.message, true); });
      });
      aksi.append(dariHp);
    }
    const link = el('button', { type: 'button', class: 'kecil sec' }, 'Salin link Langganan saya');
    link.addEventListener('click', () => sibuk(link, q(supabase.rpc('link_langganan', { p_wa: r.customer_wa })))
      .then((u) => salin(u, 'Link Langganan saya disalin')).catch((err) => toast('Gagal: ' + err.message, true)));
    aksi.append(link);
    const tandai = (status, label) => {
      const b = el('button', { type: 'button', class: 'kecil sec' }, label);
      b.addEventListener('click', () => sibuk(b, q(supabase.rpc('tandai_langganan', { p_order: r.order_id, p_app_key: r.app_key, p_status: status })))
        .then(() => {
          r.tandai = status;
          r.keadaan = status === 'diperpanjang' ? 'diperpanjang' : status === 'tidak' ? 'tidak' : r.baru_kode ? r.keadaan : r.sisa_hari < 0 ? 'lewat' : 'aktif';
          toast(status ? 'Tersimpan' : 'Tanda dihapus'); gambar();
        }).catch((err) => toast('Gagal: ' + err.message, true)));
      return b;
    };
    if (r.tandai) aksi.append(tandai(null, 'Hapus tanda'));
    else if (r.keadaan !== 'diperpanjang') aksi.append(tandai('diperpanjang', 'Sudah perpanjang'), tandai('tidak', 'Tidak perpanjang'));

    function gambarUlang() {
      kotak.replaceChildren(...[
        el('div', { class: 'row', style: 'justify-content:space-between;align-items:flex-start' },
          el('div', {}, el('b', {}, r.customer_name), el('div', { class: 'muted' }, `+${r.customer_wa}`)), lencana),
        el('div', { class: 'app-langganan' },
          r.logo_url ? el('img', { src: r.logo_url, alt: '', width: 28, height: 28, loading: 'lazy' }) : el('span', { class: 'inisial', 'aria-hidden': 'true' }, r.app_name.slice(0, 2).toUpperCase()),
          el('div', {}, el('b', {}, r.app_name), el('div', { class: 'muted' }, `${r.plan_label} · ${r.variant_label} · ${r.code}`))),
        el('div', { class: 'muted' }, r.keadaan === 'diperpanjang' && r.baru_kode ? `Berakhir ${tgl(r.berakhir)} · diperpanjang lewat ${r.baru_kode}`
          : `Berakhir ${tgl(r.berakhir)}${r.berakhir_awal && r.berakhir_awal !== r.berakhir ? ` (paling cepat ${tgl(r.berakhir_awal)})` : ''}`
            + (r.keadaan === 'memesan' && r.baru_kode ? ` · pesanan baru ${r.baru_kode} belum dibayar` : '')),
        jejak.length ? el('div', { class: 'jejak-pengingat' }, ...jejak.map((j) => el('span', { class: 'tag' }, '✓ ', j))) : null,
        aksi].filter(Boolean));
    }
    gambarUlang();
    return kotak;
  }

  // ---------------------------------------------------------------- papan kolom
  const KOLOM = [
    ['hampir', 'Hampir habis', 'Berakhir dalam beberapa hari. Pengingat otomatis dikirim sebelum hari terakhir.'],
    ['lewat', 'Sudah lewat masa aktif', 'Berakhir dan belum diperpanjang (60 hari terakhir).'],
    ['perpanjang', 'Sudah diperpanjang', 'Pembeli memesan lagi aplikasi yang sama (30 hari terakhir).'],
  ];
  const wadahPapan = el('div');
  const ringkas = el('div');
  function gambar() {
    ringkas.replaceChildren(gambarStat());
    const isi = rows.filter(cocok);
    const per = Object.fromEntries(KOLOM.map(([k]) => [k, []]));
    for (const r of isi) { const k = masuk(r); if (per[k]) per[k].push(r); }
    per.lewat.sort((a, b) => (a.keadaan === 'tidak') - (b.keadaan === 'tidak') || b.berakhir.localeCompare(a.berakhir));
    per.perpanjang.sort((a, b) => b.berakhir.localeCompare(a.berakhir));
    const tabHp = el('div', { class: 'row tab tab-kolom', role: 'group', 'aria-label': 'Pilih kolom' }, KOLOM.map(([k, l]) => el('button', {
      type: 'button', class: 'kecil ' + (k === kolomHp ? '' : 'sec'), 'aria-pressed': String(k === kolomHp), onclick: () => { kolomHp = k; gambar(); },
    }, `${l} (${per[k].length})`)));
    wadahPapan.replaceChildren(tabHp, el('div', { class: 'papan-langganan' }, KOLOM.map(([k, l, ket]) => el('section', {
      class: 'kolom-langganan kolom-' + k + (k === kolomHp ? ' dipilih' : ''), 'aria-label': l,
    },
      el('div', { class: 'kepala-kolom' }, el('h3', {}, l), el('span', { class: 'tag' }, per[k].length)),
      el('p', { class: 'muted', style: 'margin:0 0 8px' }, ket),
      per[k].length ? per[k].slice(0, 150).map(kartu) : el('p', { class: 'muted kosong-kolom' }, 'Tidak ada.'),
      per[k].length > 150 ? el('p', { class: 'muted' }, `+${per[k].length - 150} lainnya, persempit dengan pencarian.`) : null))));
  }

  // saringan
  const kotakCari = el('input', { type: 'search', placeholder: 'Cari nama, nomor, aplikasi, kode pesanan', value: cari, 'aria-label': 'Cari langganan' });
  let jeda;
  kotakCari.addEventListener('input', () => { clearTimeout(jeda); jeda = setTimeout(() => { cari = kotakCari.value.trim(); gambar(); }, 200); });
  const daftarApp = [...new Map(rows.map((r) => [r.app_key, r.app_name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const pilihApp = el('select', { 'aria-label': 'Saring aplikasi' }, el('option', { value: '' }, 'Semua aplikasi'),
    daftarApp.map(([k, n]) => el('option', { value: k, selected: k === saringApp }, n)));
  pilihApp.addEventListener('change', () => { saringApp = pilihApp.value; gambar(); });
  const pilihJendela = el('select', { 'aria-label': 'Batas hampir habis' }, [3, 7, 14, 30].map((n) => el('option', { value: n, selected: n === jendela }, `Hampir habis: ≤ ${n} hari`)));
  pilihJendela.addEventListener('change', () => { jendela = Number(pilihJendela.value); gambar(); });

  gambar();
  halaman.replaceChildren(
    ringkas,
    kartuSetelan(supabase, setelan, notif, waSiap, segarkan),
    el('section', { class: 'card' },
      el('h2', {}, 'Masa langganan pembeli'),
      el('p', { class: 'sub' }, 'Dihitung dari tanggal mulai (saat pesanan jadi Aktif) + durasi tiap paket. Kalau pembeli memesan aplikasi yang sama lagi, langganannya otomatis pindah ke kolom "Sudah diperpanjang". Pesanan di luar website bisa ditandai manual.'),
      el('div', { class: 'saring-langganan' }, kotakCari, pilihApp, pilihJendela),
      wadahPapan),
    kartuRiwayat(rows, log));
}

// ---------------------------------------------------------------- pengaturan pengingat otomatis
function kartuSetelan(supabase, s, notif, waSiap, segarkan) {
  const cek = (id, label, nilai) => { const c = el('input', { type: 'checkbox', id }); c.checked = !!nilai; return [c, el('label', { class: 'row', for: id }, c, label)]; };
  const [aktif, lAktif] = cek('pAktif', 'Kirim pengingat otomatis lewat WhatsApp (Fonnte)', s.aktif);
  const hariSebelum = el('input', { type: 'number', min: 1, max: 14, value: s.hari_sebelum });
  const [hariH, lHariH] = cek('pHariH', 'Kirim juga di hari terakhir', s.kirim_hari_h);
  const [kembali, lKembali] = cek('pKembali', 'Kirim kupon ajakan kembali kalau belum perpanjang', s.ajak_kembali);
  const hariKembali = el('input', { type: 'number', min: 1, max: 60, value: s.hari_kembali });
  const jenis = el('select', {}, el('option', { value: 'persen', selected: s.kupon_jenis === 'persen' }, 'Persen (%)'), el('option', { value: 'nominal', selected: s.kupon_jenis === 'nominal' }, 'Potongan (Rp)'));
  const nilai = el('input', { type: 'text', inputmode: 'numeric', value: Number(s.kupon_nilai) });
  const maks = el('input', { type: 'text', inputmode: 'numeric', value: s.kupon_maks ?? '', placeholder: 'tanpa batas' });
  const berlaku = el('input', { type: 'number', min: 1, max: 90, value: s.kupon_hari });
  const jamMulai = el('input', { type: 'number', min: 0, max: 23, value: s.jam_mulai });
  const jamSelesai = el('input', { type: 'number', min: 0, max: 23, value: s.jam_selesai });
  const perJam = el('input', { type: 'number', min: 1, max: 100, value: s.maks_per_jam });
  const segarMaks = () => { maks.disabled = jenis.value !== 'persen'; };
  jenis.addEventListener('change', segarMaks); segarMaks();

  const simpan = el('button', { type: 'button' }, 'Simpan pengaturan');
  simpan.addEventListener('click', async () => {
    const v = Number(String(nilai.value).replace(',', '.'));
    if (!(v > 0) || (jenis.value === 'persen' && v > 50)) return toast(jenis.value === 'persen' ? 'Persen kupon 1–50' : 'Isi potongan rupiah', true);
    if (Number(jamMulai.value) > Number(jamSelesai.value)) return toast('Jam mulai harus sebelum jam selesai', true);
    simpan.disabled = true;
    try {
      await q(supabase.from('pengingat_setelan').update({
        aktif: aktif.checked, hari_sebelum: Number(hariSebelum.value) || 3, kirim_hari_h: hariH.checked, ajak_kembali: kembali.checked,
        hari_kembali: Number(hariKembali.value) || 7, kupon_jenis: jenis.value, kupon_nilai: v,
        kupon_maks: jenis.value === 'persen' ? angka(maks.value) : null, kupon_hari: Number(berlaku.value) || 14,
        jam_mulai: Number(jamMulai.value), jam_selesai: Number(jamSelesai.value), maks_per_jam: Number(perJam.value) || 15,
        updated_at: new Date().toISOString(),
      }).eq('id', 1));
      toast('Pengaturan pengingat tersimpan');
    } catch (err) { toast('Gagal: ' + err.message, true); }
    simpan.disabled = false;
  });
  const jalankan = el('button', { type: 'button', class: 'sec' }, 'Kirim pengingat sekarang');
  jalankan.disabled = !waSiap;
  jalankan.addEventListener('click', async () => {
    if (!confirm('Kirim semua pengingat yang sudah waktunya sekarang (tanpa menunggu jadwal jam berikutnya)?')) return;
    jalankan.disabled = true;
    try {
      const h = await q(supabase.rpc('kirim_pengingat_otomatis', { p_paksa: true }));
      toast(h.alasan ? h.alasan : `${h.terkirim} pengingat terkirim${h.stok_dikabari ? `, ${h.stok_dikabari} kabar stok` : ''}${h.gagal ? `, ${h.gagal} gagal` : ''}`, !!h.alasan);
      if (h.terkirim) segarkan();
    } catch (err) { toast('Gagal: ' + err.message, true); }
    jalankan.disabled = false;
  });

  const status = !waSiap
    ? el('div', { class: 'msg warn' }, 'WhatsApp otomatis belum tersambung (token Fonnte belum diisi atau ekstensi pg_net belum aktif). Pengingat tetap bisa dikirim manual dengan tombol "Kirim pengingat (WA)". Sambungkan di ', el('a', { href: '#notifikasi' }, 'menu Notifikasi'), '.')
    : el('div', { class: 'msg ' + (s.aktif ? 'ok' : 'warn') }, s.aktif
      ? `Pengingat otomatis aktif. Dicek tiap jam, dikirim pukul ${String(s.jam_mulai).padStart(2, '0')}.00–${String(s.jam_selesai).padStart(2, '0')}.59 WIB, paling banyak ${s.maks_per_jam} pesan per jam.${s.terakhir_jalan ? ` Terakhir dicek ${waktu(s.terakhir_jalan)}.` : ' Belum pernah jalan (butuh ekstensi pg_cron).'}`
      : 'Pengingat otomatis sedang dimatikan.');

  return el('details', { class: 'card setelan-pengingat', open: !waSiap || !s.aktif || null },
    el('summary', {}, el('h2', { style: 'display:inline' }, 'Pengingat otomatis'), ' ',
      el('span', { class: 'tag ' + (waSiap && s.aktif ? 'hijau' : 'kuning') }, waSiap && s.aktif ? 'aktif' : 'belum aktif')),
    status,
    el('p', { class: 'sub', style: 'margin-top:10px' }, 'Pesan berisi link "Langganan saya" pembeli: sisa masa aktif, status garansi, dan tombol perpanjang. Satu pembeli paling banyak satu pesan per jam; beberapa aplikasi yang berakhir berdekatan digabung dalam satu pesan. Isi pesan bisa diubah di ', el('a', { href: '#notifikasi' }, 'menu Notifikasi'), '.'),
    lAktif,
    el('div', { class: 'grid2' },
      isian('Kirim berapa hari sebelum berakhir', hariSebelum, 'Untuk paket 7 hari ke atas. 3 = H-3.'),
      el('div', { style: 'padding-top:28px' }, lHariH)),
    el('div', { style: 'margin-top:10px' }, lKembali),
    el('div', { class: 'grid2' },
      isian('Kirim kupon setelah berapa hari lewat', hariKembali),
      isian('Jenis kupon', jenis), isian('Besar kupon', nilai, 'Persen (mis. 5) atau rupiah (mis. 5000). Tidak pernah membuat harga di bawah HPP.'),
      isian('Maksimal potongan (Rp)', maks, 'Hanya untuk kupon persen.'), isian('Kupon berlaku (hari)', berlaku)),
    el('div', { class: 'grid2' },
      isian('Jam mulai kirim (WIB)', jamMulai), isian('Jam selesai kirim (WIB)', jamSelesai),
      isian('Maksimal pesan per jam', perJam, 'Supaya nomor WhatsApp toko aman dari pemblokiran.')),
    el('div', { class: 'row', style: 'margin-top:12px' }, simpan, jalankan));
}

// ---------------------------------------------------------------- riwayat
function kartuRiwayat(rows, log) {
  const NAMA = { sebelum: 'Sebelum berakhir', hari_h: 'Hari terakhir', kembali: 'Kupon ajakan kembali', manual: 'Manual (Fonnte)', manual_wa: 'Manual (WA dari HP)' };
  const peta = new Map(rows.map((r) => [`${r.order_id}|${r.app_key}`, r]));
  const baris = log.slice(0, 30);
  return el('section', { class: 'card' },
    el('h2', {}, 'Riwayat pengingat'),
    el('p', { class: 'sub' }, 'Pengingat yang terakhir dikirim. Balasan pembeli masuk ke WhatsApp toko seperti biasa.'),
    baris.length ? el('div', { class: 'tablewrap' }, el('table', {},
      el('thead', {}, el('tr', {}, el('th', {}, 'Waktu'), el('th', {}, 'Pembeli'), el('th', {}, 'Aplikasi'), el('th', {}, 'Jenis'), el('th', {}, 'Status'))),
      el('tbody', {}, baris.map((l) => {
        const r = peta.get(`${l.order_id}|${l.app_key}`);
        return el('tr', {}, el('td', {}, waktu(l.created_at)), el('td', {}, r?.customer_name ?? '–'), el('td', {}, r?.app_name ?? '–'),
          el('td', {}, NAMA[l.jenis] ?? l.jenis), el('td', {}, el('span', { class: 'tag ' + (l.status === 'dikirim' ? 'hijau' : 'merah') }, l.status)));
      })))) : el('p', { class: 'muted' }, 'Belum ada pengingat yang dikirim.'));
}
