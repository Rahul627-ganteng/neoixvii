// Menu Member & kupon: aturan diskon member (persen + masa berlaku), kode kupon, daftar member.
// Diskon dihitung di database saat pesanan dibuat dan tidak pernah membuat harga di bawah HPP.
import { el, isian, q, rapikanWa, rp, tabel, tautanWa, td, toast, waktu } from './alat.js';

let bagian = 'member';
let cari = '';
const angka = (v) => { const d = String(v ?? '').replace(/[^\d]/g, ''); return d === '' ? null : Number(d); };
const keLokal = (d) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const dariLokal = (v) => (v ? new Date(v).toISOString() : null);
const salin = async (teks, pesan) => { try { await navigator.clipboard.writeText(teks); toast(pesan); } catch { prompt('Salin teks ini:', teks); } };
const tglPendek = (d) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');

export async function halamanMember(supabase, halaman) {
  let prog, kupon, members, orders;
  try {
    [prog, kupon, members, orders] = await Promise.all([
      q(supabase.from('member_program').select('*').eq('id', 1).maybeSingle()),
      q(supabase.from('coupons').select('*').order('created_at', { ascending: false })),
      q(supabase.from('members').select('*').order('created_at', { ascending: false }).limit(2000)),
      q(supabase.from('orders').select('id,member_id,coupon_id,customer_wa,status,total,discount,member_discount,coupon_discount,created_at').order('created_at', { ascending: false }).limit(5000)),
    ]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Member & kupon butuh migration 20261113000000_member_kupon_notif.sql. Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  let ajak = null, hadiah = [];
  try {
    [ajak, hadiah] = await Promise.all([
      q(supabase.from('ajak_program').select('*').eq('id', 1).maybeSingle()),
      q(supabase.from('ajak_hadiah').select('id,member_id,order_id,teman,kupon_id,status,created_at').order('created_at', { ascending: false }).limit(500)),
    ]);
  } catch { ajak = null; }
  const kolomBaru = !!ajak;   // migration ajak teman & headline sudah dijalankan
  const kuponAdmin = kupon.filter((k) => (k.sumber ?? 'admin') === 'admin');
  const kuponOtomatis = kupon.filter((k) => (k.sumber ?? 'admin') !== 'admin');
  const segarkan = () => halamanMember(supabase, halaman);
  const sah = orders.filter((o) => o.status !== 'batal');
  const pakaiKupon = new Map();
  for (const o of sah) if (o.coupon_id) pakaiKupon.set(o.coupon_id, (pakaiKupon.get(o.coupon_id) ?? 0) + 1);
  const perMember = new Map();
  for (const o of sah) if (o.member_id) {
    const x = perMember.get(o.member_id) ?? { n: 0, total: 0, hemat: 0 };
    x.n += 1; x.total += o.total; x.hemat += o.member_discount + o.coupon_discount; perMember.set(o.member_id, x);
  }
  const lewatWa = new Map();   // pesanan lama dengan nomor yang sama tapi belum tertaut
  for (const o of orders) if (!o.member_id && o.customer_wa) lewatWa.set(o.customer_wa, (lewatWa.get(o.customer_wa) ?? 0) + 1);
  const hari = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const programJalan = prog?.aktif && (!prog.mulai || prog.mulai <= hari) && (!prog.sampai || prog.sampai >= hari);

  const stat = (n, l, kelas = '') => el('div', { class: 'stat ' + kelas }, el('b', {}, n), el('span', {}, l));
  const stats = el('div', { class: 'stats' },
    stat(members.filter((m) => m.is_active).length, 'member aktif'),
    stat(members.filter((m) => Date.now() - Date.parse(m.created_at) < 30 * 864e5).length, 'member baru 30 hari'),
    stat(sah.filter((o) => o.member_id).length, 'pesanan dari member'),
    stat(rp(sah.reduce((s, o) => s + (o.member_discount || 0), 0)), 'diskon member diberikan'),
    stat(rp(sah.reduce((s, o) => s + (o.coupon_discount || 0), 0)), 'diskon kupon diberikan'),
    stat(programJalan ? `${Number(prog.diskon_pct)}% / ${Number(prog.diskon_besar_pct)}%` : 'Off', programJalan ? 'diskon member berjalan' : 'diskon member tidak berjalan', programJalan ? '' : 'kuning'));

  // ---------------------------------------------------------------- daftar member
  function bagianMember() {
    const fNama = el('input', { type: 'text', placeholder: 'Nama', maxlength: 60 });
    const fWa = el('input', { type: 'tel', placeholder: '08…', inputmode: 'tel' });
    const tambah = el('button', { type: 'button', class: 'kecil' }, '+ Tambah member');
    tambah.addEventListener('click', async () => {
      const wa = rapikanWa(fWa.value);
      if (fNama.value.trim().length < 2 || wa.length < 9) return toast('Isi nama & nomor WhatsApp', true);
      if (members.some((m) => m.wa === wa)) return toast('Nomor itu sudah jadi member', true);
      try { await q(supabase.from('members').insert({ name: fNama.value.trim(), wa, sumber: 'admin' })); toast('Member ditambahkan'); segarkan(); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });
    const kotakCari = el('input', { type: 'search', placeholder: 'Cari nama atau nomor', value: cari, 'aria-label': 'Cari member' });
    const daftar = el('div');
    const linkAkun = (m) => `${location.origin}/member/?k=${m.token}`;
    function gambarDaftar() {
      const k = cari.toLowerCase().replace(/^0/, '62');
      const cocok = members.filter((m) => !k || m.name.toLowerCase().includes(k) || m.wa.includes(k.replace(/\D/g, '') || '#'));
      daftar.replaceChildren(cocok.length ? tabel(['Member', 'WhatsApp', 'Sejak', '>Pesanan', '>Belanja', '>Hemat', 'Aksi'], cocok.slice(0, 300).map((m) => {
        const x = perMember.get(m.id) ?? { n: 0, total: 0, hemat: 0 };
        const lama = lewatWa.get(m.wa) ?? 0;
        const status = el('button', { type: 'button', class: 'sec kecil' }, m.is_active ? 'Nonaktifkan' : 'Aktifkan');
        status.addEventListener('click', async () => {
          try { await q(supabase.from('members').update({ is_active: !m.is_active, updated_at: new Date().toISOString() }).eq('id', m.id)); toast(m.is_active ? 'Member dinonaktifkan' : 'Member aktif lagi'); segarkan(); }
          catch (err) { toast('Gagal: ' + err.message, true); }
        });
        const tautkan = lama ? el('button', { type: 'button', class: 'sec kecil', title: 'Masukkan pesanan lama dengan nomor ini ke riwayat member' }, `Tautkan ${lama} pesanan lama`) : null;
        tautkan?.addEventListener('click', async () => {
          try { const n = await q(supabase.rpc('tautkan_pesanan_member', { p_member: m.id })); toast(`${n} pesanan masuk ke riwayat ${m.name}`); segarkan(); }
          catch (err) { toast('Gagal: ' + err.message, true); }
        });
        return el('tr', {},
          td(el('div', {}, el('b', {}, m.name), ' ', m.is_active ? null : el('span', { class: 'tag merah' }, 'nonaktif'),
            m.sumber === 'admin' ? el('span', { class: 'tag' }, 'dari admin') : null,
            m.kode_ajak ? el('div', { class: 'muted' }, 'kode ajak ', el('b', { class: 'kode-kupon' }, m.kode_ajak)) : null)),
          td(el('a', { href: tautanWa(m.wa), target: '_blank', rel: 'noopener' }, '+' + m.wa)),
          td(tglPendek(m.created_at)), td(x.n, true), td(rp(x.total), true), td(rp(x.hemat), true),
          td(el('div', { class: 'row' },
            m.token ? el('a', { class: 'btn sec kecil', href: tautanWa(m.wa, `Halo ${m.name}! Ini link akun member IXVII.CO kamu (riwayat pembelian & status garansi):\n${linkAkun(m)}\n\nJangan bagikan link ini ke orang lain ya.`), target: '_blank', rel: 'noopener' }, 'Kirim link akun') : null,
            m.token ? el('button', { type: 'button', class: 'sec kecil', onclick: () => salin(linkAkun(m), 'Link akun disalin') }, 'Salin link') : null,
            tautkan, status)));
      })) : el('p', { class: 'muted' }, members.length ? 'Tidak ada yang cocok.' : 'Belum ada member. Pembeli bisa daftar sendiri di halaman /member/.'));
    }
    let jeda;
    kotakCari.addEventListener('input', () => { clearTimeout(jeda); jeda = setTimeout(() => { cari = kotakCari.value.trim(); gambarDaftar(); }, 200); });
    gambarDaftar();
    return [el('section', { class: 'card' },
      el('h2', {}, 'Daftar member'),
      el('p', { class: 'sub' }, 'Pembeli daftar sendiri di ', el('a', { href: '/member/', target: '_blank', rel: 'noopener' }, 'halaman Member ↗'),
        ' cukup dengan nama & nomor WhatsApp. Pesanan dengan nomor member otomatis dapat diskon dan masuk ke riwayatnya (pesanan sebelum daftar bisa ditautkan dengan tombol "Tautkan").'),
      el('div', { class: 'row' }, fNama, fWa, tambah),
      el('div', { class: 'row', style: 'margin:12px 0 4px' }, kotakCari),
      daftar)];
  }

  // ---------------------------------------------------------------- kupon
  function statusKupon(k) {
    const sekarang = Date.now();
    if (!k.is_active) return ['Nonaktif', ''];
    if (k.sampai && Date.parse(k.sampai) < sekarang) return ['Berakhir', 'merah'];
    if (k.kuota && (pakaiKupon.get(k.id) ?? 0) >= k.kuota) return ['Kuota habis', 'merah'];
    if (k.mulai && Date.parse(k.mulai) > sekarang) return ['Terjadwal', 'biru'];
    return ['Berlaku', 'hijau'];
  }
  const teksNilai = (k) => (k.jenis === 'persen' ? `${Number(k.nilai)}%${k.maks_diskon ? ` (maks ${rp(k.maks_diskon)})` : ''}` : rp(k.nilai));
  function formKupon(k, wadah) {
    const kode = el('input', { type: 'text', value: k.code || '', maxlength: 20, placeholder: 'mis. PAYDAY10', style: 'text-transform:uppercase' });
    const acak = el('button', { type: 'button', class: 'sec kecil', onclick: () => { kode.value = 'IX' + Math.random().toString(36).slice(2, 8).toUpperCase(); } }, 'Acak');
    const ket = el('input', { type: 'text', value: k.keterangan || '', maxlength: 120, placeholder: 'mis. Promo payday November' });
    const jenis = el('select', {}, el('option', { value: 'persen', selected: k.jenis !== 'nominal' }, 'Persen (%)'), el('option', { value: 'nominal', selected: k.jenis === 'nominal' }, 'Potongan (Rp)'));
    const nilai = el('input', { type: 'text', inputmode: 'numeric', value: k.nilai ?? '', placeholder: '10' });
    const maks = el('input', { type: 'text', inputmode: 'numeric', value: k.maks_diskon ?? '', placeholder: 'tanpa batas' });
    const min = el('input', { type: 'text', inputmode: 'numeric', value: k.min_belanja ?? 0 });
    const mulai = el('input', { type: 'datetime-local', value: keLokal(k.mulai) });
    const sampai = el('input', { type: 'datetime-local', value: keLokal(k.sampai) });
    const kuota = el('input', { type: 'number', min: 1, value: k.kuota ?? '', placeholder: 'tanpa batas' });
    const perNomor = el('input', { type: 'number', min: 1, value: k.id ? (k.per_nomor ?? '') : 1, placeholder: 'tanpa batas' });
    const cek = (id, label, nilaiAwal) => { const c = el('input', { type: 'checkbox', id }); c.checked = !!nilaiAwal; return [c, el('label', { class: 'row', for: id }, c, label)]; };
    const [cMember, lMember] = cek('kuponMember', 'Khusus member', k.khusus_member);
    const [cGabung, lGabung] = cek('kuponGabung', 'Boleh digabung dengan diskon member', k.gabung_member);
    const [cAktif, lAktif] = cek('kuponAktif', 'Aktif', k.id ? k.is_active : true);
    const [cPublik, lPublik] = cek('kuponPublik', 'Tampilkan di headline beranda', k.tampil_publik);
    const teksPublik = el('input', { type: 'text', value: k.teks_publik || '', maxlength: 140, placeholder: 'mis. Diskon payday untuk semua aplikasi streaming' });
    const segarMaks = () => { maks.disabled = jenis.value !== 'persen'; };
    jenis.addEventListener('change', segarMaks); segarMaks();
    const simpan = el('button', { type: 'button' }, k.id ? 'Simpan kupon' : 'Buat kupon');
    simpan.addEventListener('click', async () => {
      const code = kode.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const v = Number(String(nilai.value).replace(',', '.').replace(/[^\d.]/g, ''));
      if (code.length < 3) return toast('Kode kupon minimal 3 huruf/angka', true);
      if (!(v > 0) || (jenis.value === 'persen' && v > 90)) return toast(jenis.value === 'persen' ? 'Persen diskon 1–90' : 'Isi potongan rupiah', true);
      if (mulai.value && sampai.value && mulai.value >= sampai.value) return toast('Tanggal selesai harus setelah tanggal mulai', true);
      const baris = {
        code, keterangan: ket.value.trim() || null, jenis: jenis.value, nilai: v,
        maks_diskon: jenis.value === 'persen' ? angka(maks.value) : null, min_belanja: angka(min.value) ?? 0,
        mulai: dariLokal(mulai.value), sampai: dariLokal(sampai.value),
        kuota: kuota.value ? Number(kuota.value) : null, per_nomor: perNomor.value ? Number(perNomor.value) : null,
        khusus_member: cMember.checked, gabung_member: cGabung.checked, is_active: cAktif.checked,
        ...(kolomBaru ? { tampil_publik: cPublik.checked, teks_publik: teksPublik.value.trim() || null } : {}),
      };
      simpan.disabled = true;
      try {
        if (k.id) await q(supabase.from('coupons').update(baris).eq('id', k.id));
        else await q(supabase.from('coupons').insert(baris));
        toast('Kupon tersimpan'); segarkan();
      } catch (err) {
        toast(/duplicate|unique/i.test(err.message) ? 'Kode itu sudah dipakai kupon lain' : 'Gagal: ' + err.message, true);
        simpan.disabled = false;
      }
    });
    const hapus = k.id && !pakaiKupon.get(k.id) ? el('button', { type: 'button', class: 'bahaya' }, 'Hapus') : null;
    hapus?.addEventListener('click', async () => {
      if (!confirm(`Hapus kupon ${k.code}?`)) return;
      try { await q(supabase.from('coupons').delete().eq('id', k.id)); toast('Kupon dihapus'); segarkan(); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });
    wadah.replaceChildren(el('div', { class: 'item-form form-kupon' },
      el('h3', { style: 'margin:0 0 8px' }, k.id ? `Ubah kupon ${k.code}` : 'Kupon baru'),
      el('div', { class: 'grid2' },
        isian('Kode kupon', el('div', { class: 'row', style: 'flex-wrap:nowrap' }, kode, acak), 'Huruf & angka saja. Pembeli mengetik kode ini saat memesan.'),
        isian('Keterangan (untuk catatanmu)', ket),
        isian('Jenis diskon', jenis), isian('Besar diskon', nilai, 'Persen (mis. 10) atau rupiah (mis. 5000).'),
        isian('Maksimal potongan (Rp)', maks, 'Hanya untuk diskon persen.'), isian('Minimal belanja (Rp)', min),
        isian('Mulai berlaku', mulai, 'Kosongkan = langsung berlaku.'), isian('Berakhir', sampai, 'Kosongkan = tanpa batas waktu.'),
        isian('Kuota total', kuota, 'Berapa kali kupon bisa dipakai semua pembeli.'), isian('Batas per nomor WhatsApp', perNomor)),
      el('div', { class: 'row', style: 'margin-top:8px;gap:16px' }, lMember, lGabung, lAktif, kolomBaru ? lPublik : null),
      kolomBaru ? isian('Teks di headline beranda (opsional)', teksPublik, 'Kalau dicentang, kode ini tampil di headline beranda selama masih berlaku dan kuotanya belum habis.') : null,
      el('p', { class: 'muted' }, 'Kalau tidak boleh digabung, sistem memakai yang lebih besar: diskon member atau kupon. Diskon tidak pernah membuat harga di bawah HPP.'),
      el('div', { class: 'row', style: 'margin-top:8px' }, simpan, el('button', { type: 'button', class: 'sec', onclick: () => wadah.replaceChildren() }, 'Tutup'), hapus)));
    wadah.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function bagianKupon() {
    const editor = el('div');
    const daftar = kuponAdmin.length ? tabel(['Kode', 'Diskon', 'Syarat', 'Periode', '>Dipakai', 'Status', ''], kuponAdmin.map((k) => {
      const [label, kelas] = statusKupon(k);
      const syarat = [k.min_belanja ? `min. ${rp(k.min_belanja)}` : null, k.khusus_member ? 'khusus member' : null,
        k.per_nomor ? `${k.per_nomor}x per nomor` : null, k.gabung_member ? 'bisa + diskon member' : null].filter(Boolean).join(' · ') || 'tanpa syarat';
      return el('tr', {},
        td(el('div', {}, el('b', { class: 'kode-kupon' }, k.code), k.tampil_publik ? el('span', { class: 'tag biru' }, 'di headline') : null,
          k.keterangan ? el('div', { class: 'muted' }, k.keterangan) : null)),
        td(teksNilai(k)), td(syarat),
        td(`${k.mulai ? waktu(k.mulai) : 'sekarang'} → ${k.sampai ? waktu(k.sampai) : 'tanpa batas'}`),
        td(`${pakaiKupon.get(k.id) ?? 0}${k.kuota ? ` / ${k.kuota}` : ''}`, true),
        td(el('span', { class: 'tag ' + kelas }, label)),
        td(el('div', { class: 'row' },
          el('button', { type: 'button', class: 'sec kecil', onclick: () => formKupon(k, editor) }, 'Ubah'),
          el('button', { type: 'button', class: 'sec kecil', onclick: () => salin(k.code, `Kode ${k.code} disalin`) }, 'Salin kode'))));
    })) : el('p', { class: 'muted' }, 'Belum ada kupon.');
    const SUMBER = { ajak: 'Kode ajak teman', hadiah_ajak: 'Hadiah ajak teman', kembali: 'Ajakan kembali' };
    const namaMember = new Map(members.map((m) => [m.id, m]));
    const otomatis = kuponOtomatis.length ? el('details', { class: 'item-form', style: 'margin-top:14px' },
      el('summary', {}, el('b', {}, `Kupon otomatis (${kuponOtomatis.length})`), ' ', el('span', { class: 'muted' }, 'kode ajak teman, hadiah pengajak, dan kupon ajakan kembali')),
      tabel(['Kode', 'Jenis', 'Untuk', 'Diskon', 'Berlaku sampai', '>Dipakai', 'Status'], kuponOtomatis.slice(0, 300).map((k) => {
        const [label, kelas] = statusKupon(k);
        const m = k.pemilik_member ? namaMember.get(k.pemilik_member) : members.find((x) => x.wa === k.khusus_wa);
        return el('tr', {}, td(el('b', { class: 'kode-kupon' }, k.code)), td(SUMBER[k.sumber] ?? k.sumber),
          td(k.sumber === 'ajak' ? `teman ${m?.name ?? 'member'} (pembelian pertama)` : m ? m.name : k.khusus_wa ? '+' + k.khusus_wa : '–'),
          td(teksNilai(k)), td(k.sampai ? waktu(k.sampai) : 'tanpa batas'), td(`${pakaiKupon.get(k.id) ?? 0}${k.kuota ? ` / ${k.kuota}` : ''}`, true),
          td(el('span', { class: 'tag ' + kelas }, label)));
      }))) : null;
    return [el('section', { class: 'card' },
      el('div', { class: 'row', style: 'justify-content:space-between' }, el('h2', {}, 'Kode kupon'),
        el('button', { type: 'button', class: 'kecil', onclick: () => formKupon({}, editor) }, '+ Kupon baru')),
      el('p', { class: 'sub' }, 'Kupon dipakai pembeli di langkah pemesanan ("Punya kode kupon?"). Atur masa berlaku, kuota, dan syaratnya di sini.'),
      editor, daftar, otomatis)];
  }

  // ---------------------------------------------------------------- ajak teman
  function bagianAjak() {
    if (!ajak) return [el('div', { class: 'msg warn' }, 'Ajak teman butuh migration 20261121000000_langganan_kabari_ajak_sorotan.sql. Jalankan dulu di SQL Editor Supabase.')];
    const pr = ajak;
    const aktif = el('input', { type: 'checkbox', id: 'ajakAktif' }); aktif.checked = !!pr.aktif;
    const kirimWa = el('input', { type: 'checkbox', id: 'ajakWa' }); kirimWa.checked = !!pr.kirim_wa;
    const pilihJenis = (v) => el('select', {}, el('option', { value: 'persen', selected: v === 'persen' }, 'Persen (%)'), el('option', { value: 'nominal', selected: v === 'nominal' }, 'Potongan (Rp)'));
    const tJenis = pilihJenis(pr.teman_jenis), hJenis = pilihJenis(pr.hadiah_jenis);
    const inp = (v, ph) => el('input', { type: 'text', inputmode: 'numeric', value: v ?? '', placeholder: ph });
    const tNilai = inp(Number(pr.teman_nilai)), tMaks = inp(pr.teman_maks, 'tanpa batas'), tMin = inp(pr.teman_min ?? 0);
    const hNilai = inp(Number(pr.hadiah_nilai)), hMaks = inp(pr.hadiah_maks, 'tanpa batas'), hMin = inp(pr.hadiah_min ?? 0);
    const hHari = el('input', { type: 'number', min: 1, max: 365, value: pr.hadiah_hari });
    const batas = el('input', { type: 'number', min: 1, max: 100, value: pr.maks_hadiah_bulan });
    const segarMaks = () => { tMaks.disabled = tJenis.value !== 'persen'; hMaks.disabled = hJenis.value !== 'persen'; };
    tJenis.addEventListener('change', segarMaks); hJenis.addEventListener('change', segarMaks); segarMaks();
    const simpan = el('button', { type: 'button' }, 'Simpan program ajak teman');
    simpan.addEventListener('click', async () => {
      const tv = Number(String(tNilai.value).replace(',', '.')), hv = Number(String(hNilai.value).replace(',', '.'));
      if (!(tv > 0) || (tJenis.value === 'persen' && tv > 50)) return toast('Potongan untuk teman: persen 1–50 atau rupiah', true);
      if (!(hv > 0) || (hJenis.value === 'persen' && hv > 50)) return toast('Hadiah pengajak: persen 1–50 atau rupiah', true);
      simpan.disabled = true;
      try {
        await q(supabase.from('ajak_program').update({
          aktif: aktif.checked, kirim_wa: kirimWa.checked,
          teman_jenis: tJenis.value, teman_nilai: tv, teman_maks: tJenis.value === 'persen' ? angka(tMaks.value) : null, teman_min: angka(tMin.value) ?? 0,
          hadiah_jenis: hJenis.value, hadiah_nilai: hv, hadiah_maks: hJenis.value === 'persen' ? angka(hMaks.value) : null, hadiah_min: angka(hMin.value) ?? 0,
          hadiah_hari: Number(hHari.value) || 60, maks_hadiah_bulan: Number(batas.value) || 10, updated_at: new Date().toISOString(),
        }).eq('id', 1));
        toast('Program ajak teman tersimpan. Semua kode ajak member ikut diperbarui.'); segarkan();
      } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
    });
    const teksP = (jenis, nilai, maks) => (jenis === 'persen' ? `${Number(nilai)}%${maks ? ` (maks ${rp(maks)})` : ''}` : rp(nilai));
    const perMemberAjak = new Map();
    for (const h of hadiah) if (h.status !== 'dibatalkan') perMemberAjak.set(h.member_id, (perMemberAjak.get(h.member_id) ?? 0) + 1);
    const top = [...perMemberAjak].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const byId = new Map(members.map((m) => [m.id, m]));
    const kuponById = new Map(kupon.map((k) => [k.id, k]));
    const ST = { diberikan: ['hadiah diberikan', 'hijau'], batas: ['batas bulanan tercapai', 'kuning'], dibatalkan: ['dibatalkan', 'merah'] };
    return [el('section', { class: 'card' },
      el('h2', {}, 'Program ajak teman'),
      el('p', { class: 'sub' }, 'Setiap member otomatis punya kode ajak (mis. RAHUL27) dan link ajakan di halaman akunnya. Teman yang belum pernah belanja dapat potongan di pembelian pertama. Setelah pesanan teman itu jadi Aktif, pengajak otomatis dapat kupon hadiah pribadi lewat WhatsApp. Diskon tidak pernah membuat harga di bawah HPP.'),
      el('div', { class: 'msg netral' }, `Sekarang: teman dapat potongan ${teksP(pr.teman_jenis, pr.teman_nilai, pr.teman_maks)}${pr.teman_min ? ` (min. belanja ${rp(pr.teman_min)})` : ''}, pengajak dapat kupon ${teksP(pr.hadiah_jenis, pr.hadiah_nilai, pr.hadiah_maks)} berlaku ${pr.hadiah_hari} hari, maksimal ${pr.maks_hadiah_bulan} hadiah per member per bulan.`),
      el('label', { class: 'row', for: 'ajakAktif', style: 'margin:10px 0 4px' }, aktif, 'Program ajak teman aktif'),
      el('h3', { style: 'margin:12px 0 0;font-size:15px' }, 'Untuk teman yang diajak'),
      el('div', { class: 'grid2' }, isian('Jenis potongan', tJenis), isian('Besar potongan', tNilai, 'Persen (mis. 5) atau rupiah (mis. 5000).'),
        isian('Maksimal potongan (Rp)', tMaks, 'Hanya untuk persen.'), isian('Minimal belanja (Rp)', tMin)),
      el('h3', { style: 'margin:16px 0 0;font-size:15px' }, 'Hadiah untuk member yang mengajak'),
      el('div', { class: 'grid2' }, isian('Jenis kupon hadiah', hJenis), isian('Besar kupon', hNilai),
        isian('Maksimal potongan (Rp)', hMaks, 'Hanya untuk persen.'), isian('Minimal belanja (Rp)', hMin),
        isian('Kupon berlaku (hari)', hHari), isian('Maksimal hadiah per member per bulan', batas)),
      el('label', { class: 'row', for: 'ajakWa', style: 'margin-top:10px' }, kirimWa, 'Kirim kupon hadiah ke WhatsApp pengajak (Fonnte)'),
      el('div', { class: 'row', style: 'margin-top:12px' }, simpan)),
    el('section', { class: 'card' },
      el('h2', {}, `Hasil ajak teman (${hadiah.filter((h) => h.status !== 'dibatalkan').length} teman belanja)`),
      top.length ? el('div', {}, el('h3', { style: 'margin:0 0 6px;font-size:14px' }, 'Pengajak terbanyak'),
        el('div', { class: 'row' }, top.map(([id, n]) => el('span', { class: 'tag biru' }, `${byId.get(id)?.name ?? 'member'} · ${n} teman`)))) : null,
      hadiah.length ? el('div', { style: 'margin-top:12px' }, tabel(['Tanggal', 'Pengajak', 'Teman', 'Kupon hadiah', 'Status'], hadiah.slice(0, 200).map((h) => {
        const k = kuponById.get(h.kupon_id);
        const [label, kelas] = ST[h.status] ?? [h.status, ''];
        return el('tr', {}, td(waktu(h.created_at)), td(byId.get(h.member_id)?.name ?? '–'), td(h.teman ?? '–'),
          td(k ? el('span', {}, el('b', { class: 'kode-kupon' }, k.code), ` · ${teksNilai(k)}${pakaiKupon.get(k.id) ? ' · sudah dipakai' : ''}`) : '–'),
          td(el('span', { class: 'tag ' + kelas }, label)));
      }))) : el('p', { class: 'muted' }, 'Belum ada teman yang belanja pakai kode ajak.'))];
  }

  // ---------------------------------------------------------------- program diskon member
  function bagianProgram() {
    const aktif = el('input', { type: 'checkbox', id: 'progAktif' }); aktif.checked = !!prog?.aktif;
    const pct = el('input', { type: 'number', min: 0, max: 50, step: 0.5, value: Number(prog?.diskon_pct ?? 4) });
    const besar = el('input', { type: 'number', min: 0, max: 50, step: 0.5, value: Number(prog?.diskon_besar_pct ?? 10) });
    const min = el('input', { type: 'text', inputmode: 'numeric', value: prog?.min_besar ?? 100000 });
    const mulai = el('input', { type: 'date', value: prog?.mulai ?? '' });
    const sampai = el('input', { type: 'date', value: prog?.sampai ?? '' });
    const contoh = el('div', { class: 'msg netral' });
    const hitung = () => {
      const m = angka(min.value) ?? 0;
      const d = (x, p) => Math.floor((x * p) / 100 / 100) * 100;
      contoh.replaceChildren('Contoh: belanja ', el('b', {}, rp(45000)), ` → hemat ${rp(d(45000, Number(pct.value)))}; belanja `, el('b', {}, rp(Math.max(m, 120000))),
        ` → hemat ${rp(d(Math.max(m, 120000), Number(besar.value)))}. Potongan dibulatkan ke bawah per Rp100 dan tidak pernah membuat harga di bawah HPP.`);
    };
    [pct, besar, min].forEach((x) => x.addEventListener('input', hitung)); hitung();
    const simpan = el('button', { type: 'button' }, 'Simpan program');
    simpan.addEventListener('click', async () => {
      if (mulai.value && sampai.value && mulai.value > sampai.value) return toast('Tanggal selesai harus setelah tanggal mulai', true);
      try {
        await q(supabase.from('member_program').update({
          aktif: aktif.checked, diskon_pct: Number(pct.value) || 0, diskon_besar_pct: Number(besar.value) || 0, min_besar: angka(min.value) ?? 0,
          mulai: mulai.value || null, sampai: sampai.value || null, updated_at: new Date().toISOString(),
        }).eq('id', 1));
        toast('Program member tersimpan'); segarkan();
      } catch (err) { toast('Gagal: ' + err.message, true); }
    });
    return [el('section', { class: 'card' },
      el('h2', {}, 'Program diskon member'),
      el('p', { class: 'sub' }, 'Berlaku untuk semua member. Di luar tanggal berlaku, member tetap terdaftar tapi diskonnya tidak dipakai.'),
      el('label', { class: 'row', for: 'progAktif', style: 'margin-bottom:8px' }, aktif, 'Diskon member aktif'),
      el('div', { class: 'grid2' },
        isian('Diskon biasa (%)', pct), isian('Diskon belanja besar (%)', besar),
        isian('Belanja besar mulai (Rp)', min, 'Total belanja sama dengan atau di atas angka ini dapat diskon besar.'),
        isian('Berlaku mulai', mulai, 'Kosongkan = mulai sekarang.'), isian('Berlaku sampai', sampai, 'Kosongkan = tanpa batas waktu.')),
      contoh, el('div', { class: 'row', style: 'margin-top:10px' }, simpan))];
  }

  const BAGIAN = [['member', `Member (${members.length})`, bagianMember], ['kupon', `Kode kupon (${kuponAdmin.length})`, bagianKupon],
    ['program', 'Program diskon', bagianProgram], ['ajak', 'Ajak teman', bagianAjak]];
  function gambar() {
    const tab = el('div', { class: 'row tab sub-tab', role: 'group', 'aria-label': 'Bagian member' }, BAGIAN.map(([k, l]) => el('button', {
      type: 'button', class: 'kecil ' + (k === bagian ? '' : 'sec'), 'aria-pressed': String(k === bagian), onclick: () => { bagian = k; gambar(); },
    }, l)));
    halaman.replaceChildren(stats, tab, ...BAGIAN.find(([k]) => k === bagian)[2]());
  }
  gambar();
}
