// Menu Affiliate: komisi dari untung, saldo tiap affiliate, catat penjualan (tempel teks), penarikan, daftar harga + komisi.
// Data tersimpan di Supabase, jadi sama di HP dan laptop.
import { el, hariIni, isian, q, rapikanWa, rp, tabel, tautanWa, td, toast } from './alat.js';
import { buatPembaca, komisiDari, pesanSaldo, tanggalBayar } from './affiliate-baca.js';

let bagian = 'saldo';
let buka = null;          // affiliate yang rinciannya terbuka
let draft = [];           // hasil baca penjualan yang belum disimpan
let isiTempel = '';

const tgl = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
const selisih = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
const angka = (v) => { const d = String(v ?? '').replace(/[^\d]/g, ''); return d === '' ? null : Number(d); };
const salin = async (teks, pesan) => { try { await navigator.clipboard.writeText(teks); toast(pesan); } catch { prompt('Salin teks ini:', teks); } };

export async function halamanAffiliate(supabase, halaman) {
  let set, saldo, tarik, katalog;
  try {
    [set, saldo, tarik, katalog] = await Promise.all([
      q(supabase.from('affiliate_settings').select('*').eq('id', 1).maybeSingle()),
      q(supabase.from('v_saldo_affiliate').select('*').order('tersedia', { ascending: false })),
      q(supabase.from('affiliate_withdrawals').select('*').order('requested_on', { ascending: false }).limit(300)),
      q(supabase.from('v_katalog_admin').select('code,kategori,aplikasi,tipe,varian,harga,hpp,tampil')
        .order('sort_kategori').order('sort_aplikasi').order('sort_tipe').order('sort_varian')),
    ]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Affiliate butuh migration affiliate (20261109000000_affiliate.sql). Jalankan dulu di SQL Editor Supabase.'));
    return;
  }
  const segarkan = () => halamanAffiliate(supabase, halaman);
  const hari = hariIni();
  const affiliate = saldo.filter((a) => a.kind === 'affiliator' || a.n > 0 || a.commission_pct != null);
  const byId = new Map(saldo.map((a) => [a.partner_id, a]));
  const items = katalog.map((r) => ({ a: r.aplikasi, k: r.tipe, d: r.varian, p: r.harga, h: r.hpp, c: r.kategori, code: r.code }));
  const pembaca = buatPembaca(items);
  const linkSaldo = (token) => `${location.origin}/mitra/saldo/?k=${token}`;
  const pilihAffiliate = (nilai, opsi = {}) => el('select', { 'aria-label': 'Affiliate', ...opsi },
    affiliate.length ? affiliate.map((a) => el('option', { value: a.partner_id, selected: a.partner_id === nilai }, `${a.name} (${Number(a.rate_pct)}%)`))
      : el('option', { value: '' }, 'Belum ada affiliate'));

  // ---------------------------------------------------------------- 1. affiliate & saldo
  function bagianSaldo() {
    const menunggu = tarik.filter((w) => w.status === 'dijadwalkan');
    const telat = menunggu.filter((w) => w.scheduled_on && w.scheduled_on < hari);
    const segera = menunggu.filter((w) => w.scheduled_on && w.scheduled_on >= hari && selisih(w.scheduled_on, hari) <= 3);
    const siap = affiliate.filter((a) => a.tersedia >= set.min_withdraw && !menunggu.some((w) => w.partner_id === a.partner_id));
    const jml = (xs, f) => xs.reduce((s, x) => s + (Number(f(x)) || 0), 0);
    const peringatan = [
      telat.length ? el('div', { class: 'msg err' }, el('b', {}, `${telat.length} penarikan lewat jatuh tempo`), `, total ${rp(jml(telat, (w) => w.amount))}. Bayar hari ini supaya affiliate tidak menagih duluan.`) : null,
      segera.length ? el('div', { class: 'msg warn' }, el('b', {}, `${segera.length} penarikan jatuh tempo ≤ 3 hari`), `, total ${rp(jml(segera, (w) => w.amount))}.`) : null,
      siap.length ? el('div', { class: 'msg' , style: 'background:#f2f2f4' }, `${siap.length} affiliate saldonya sudah lewat ${rp(set.min_withdraw)} tapi belum mengajukan: ${siap.map((a) => a.name).join(', ')}. Kirim pesan saldo supaya mereka memilih tarik atau kumpulkan dulu.`) : null,
    ];
    const stat = (n, l, kelas = '') => el('div', { class: 'stat ' + kelas }, el('b', {}, n), el('span', {}, l));
    const stats = el('div', { class: 'stats' },
      stat(jml(affiliate, (a) => a.n), 'penjualan lewat affiliate'), stat(rp(jml(affiliate, (a) => a.omzet)), 'omzet dari affiliate'),
      stat(rp(jml(affiliate, (a) => a.komisi)), 'komisi keluar'), stat(rp(jml(affiliate, (a) => Math.max(0, a.tersedia))), 'saldo affiliate', 'kuning'),
      stat(rp(jml(menunggu, (w) => w.amount)), 'penarikan menunggu'), stat(rp(jml(affiliate, (a) => a.untung_owner)), 'sisa untung untukmu'));

    // tambah affiliate cepat
    const fNama = el('input', { type: 'text', placeholder: 'Nama affiliate', maxlength: 80 });
    const fWa = el('input', { type: 'tel', inputmode: 'tel', placeholder: '08…' });
    const fRate = el('input', { type: 'text', inputmode: 'decimal', placeholder: `${Number(set.rate_pct)} (bawaan)` });
    const fBayar = el('input', { type: 'text', placeholder: 'Dana 0812…, BCA 123…', maxlength: 120 });
    const fTambah = el('button', { type: 'button' }, 'Tambah affiliate');
    fTambah.addEventListener('click', async () => {
      if (fNama.value.trim().length < 2) return toast('Isi nama affiliate', true);
      const rate = fRate.value.trim() ? Number(fRate.value.replace(',', '.')) : null;
      if (rate != null && !(rate >= 0 && rate <= 90)) return toast('Komisi 0 sampai 90%', true);
      fTambah.disabled = true;
      try {
        await q(supabase.from('partners').insert({ name: fNama.value.trim(), kind: 'affiliator', whatsapp: rapikanWa(fWa.value) || null,
          commission_pct: rate, payout_to: fBayar.value.trim() || null }));
        toast('Affiliate ditambahkan'); segarkan();
      } catch (err) { toast('Gagal: ' + err.message, true); fTambah.disabled = false; }
    });
    const formTambah = el('details', { class: 'item-form' }, el('summary', {}, el('b', {}, '+ Affiliate baru')),
      el('div', { class: 'grid2' }, isian('Nama', fNama), isian('Nomor WhatsApp', fWa), isian('Komisi (% dari untung)', fRate, 'Kosongkan untuk memakai komisi bawaan.'),
        isian('Tujuan bayar', fBayar, 'Hanya terlihat oleh admin dan affiliate itu sendiri.')),
      el('p', { class: 'muted' }, 'Affiliate juga muncul di menu Mitra & profil (kode referral dibuat otomatis). Foto, kota, dan izin tampil kontak diatur di sana.'),
      el('div', { class: 'row', style: 'margin-top:8px' }, fTambah));

    const kartu = (a) => {
      const cukup = a.tersedia >= set.min_withdraw;
      const aksi = el('div', { class: 'row', style: 'margin-top:10px' });
      const rinci = el('div');
      const kirimWa = el('button', { type: 'button', class: 'kecil wa-tombol' }, 'Kirim saldo (WA)');
      kirimWa.addEventListener('click', async () => {
        const w = window.open('', '_blank');
        try {
          const token = await q(supabase.rpc('buat_link_saldo', { p_partner: a.partner_id }));
          const teks = pesanSaldo(a, set, hari, linkSaldo(token));
          const url = a.whatsapp ? tautanWa(a.whatsapp, teks) : `https://wa.me/?text=${encodeURIComponent(teks)}`;
          if (w) w.location = url; else location.href = url;
        } catch (err) { w?.close(); toast('Gagal: ' + err.message, true); }
      });
      const link = el('button', { type: 'button', class: 'sec kecil' }, 'Salin link saldo');
      link.addEventListener('click', async () => {
        try { const token = await q(supabase.rpc('buat_link_saldo', { p_partner: a.partner_id })); salin(linkSaldo(token), 'Link halaman saldo disalin'); }
        catch (err) { toast('Gagal: ' + err.message, true); }
      });
      aksi.append(...[kirimWa, link,
        cukup ? el('button', { type: 'button', class: 'kecil', onclick: () => { bagian = 'tarik'; ajukanUntuk = a.partner_id; gambar(); } }, 'Ajukan tarik') : null,
        el('button', { type: 'button', class: 'sec kecil', onclick: () => { buka = buka === a.partner_id ? null : a.partner_id; gambar(); } }, buka === a.partner_id ? 'Tutup rincian' : 'Rincian & atur')].filter(Boolean));
      if (buka === a.partner_id) muatRincian(a, rinci);
      const angkaBaris = (l, v, kuat) => el('div', { class: 'angka-aff' + (kuat ? ' kuat' : '') }, el('span', {}, l), el('b', {}, v));
      return el('article', { class: 'item-form kartu-aff' },
        el('div', { class: 'row', style: 'justify-content:space-between' },
          el('div', {}, el('b', { style: 'font-size:16px' }, a.name), ' ', el('span', { class: 'tag' }, `${Number(a.rate_pct)}%${a.commission_pct == null ? ' (bawaan)' : ''}`),
            a.is_active ? null : el('span', { class: 'tag' }, 'nonaktif')),
          el('span', { class: 'muted' }, [a.referral_code, a.payout_to].filter(Boolean).join(' · '))),
        el('div', { class: 'grid-aff' },
          angkaBaris('Penjualan', a.n), angkaBaris('Komisi total', rp(a.komisi)), angkaBaris('Sudah dibayar', rp(a.dibayar)),
          angkaBaris('Diproses', rp(a.ditahan)), angkaBaris(cukup ? 'Saldo · bisa ditarik' : `Saldo · min ${rp(set.min_withdraw)}`, rp(a.tersedia), cukup),
          angkaBaris('Untung kamu', rp(a.untung_owner))),
        aksi, rinci);
    };
    return [el('section', { class: 'card' },
      el('h2', {}, 'Affiliate & saldo'),
      el('p', { class: 'sub' }, `Komisi dihitung dari untung (harga jual − HPP), bukan dari harga jual. Bawaan ${Number(set.rate_pct)}%, dan untungmu tidak pernah di bawah ${Number(set.min_owner_pct)}% atau ${rp(set.min_owner_rp)} per transaksi.`),
      ...peringatan.filter(Boolean), stats, formTambah,
      affiliate.length ? el('div', {}, affiliate.map(kartu)) : el('p', { class: 'muted', style: 'margin-top:12px' }, 'Belum ada affiliate. Tambahkan lewat "+ Affiliate baru".'),
      el('div', { class: 'row', style: 'margin-top:14px' }, el('button', { type: 'button', class: 'sec kecil', onclick: unduhCsv }, 'Unduh semua penjualan (CSV)')))];
  }

  async function muatRincian(a, wadah) {
    wadah.replaceChildren(el('p', { class: 'muted' }, 'Memuat…'));
    let jual;
    try { jual = await q(supabase.from('affiliate_sales').select('*').eq('partner_id', a.partner_id).order('sold_on', { ascending: false }).limit(200)); }
    catch (err) { wadah.replaceChildren(el('div', { class: 'msg err' }, err.message)); return; }
    // atur komisi & tujuan bayar
    const rate = el('input', { type: 'text', inputmode: 'decimal', value: a.commission_pct ?? '', placeholder: `${Number(set.rate_pct)} (bawaan)` });
    const bayar = el('input', { type: 'text', value: a.payout_to ?? '', maxlength: 120, placeholder: 'Dana 0812…, BCA 123…' });
    const lama = el('input', { type: 'checkbox', id: `lama-${a.partner_id}` });
    const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
    simpan.addEventListener('click', async () => {
      const r = rate.value.trim() ? Number(rate.value.replace(',', '.')) : null;
      if (r != null && !(r >= 0 && r <= 90)) return toast('Komisi 0 sampai 90%', true);
      simpan.disabled = true;
      try {
        await q(supabase.from('partners').update({ payout_to: bayar.value.trim() || null, updated_at: new Date().toISOString() }).eq('id', a.partner_id));
        if (r !== (a.commission_pct == null ? null : Number(a.commission_pct)) || lama.checked) {
          const h = await q(supabase.rpc('ubah_komisi_affiliate', { p_partner: a.partner_id, p_rate: r, p_lama: lama.checked }));
          toast(`Komisi ${a.name} jadi ${Number(h.rate)}%${h.dihitung_ulang ? `, ${h.dihitung_ulang} penjualan dihitung ulang` : ''}`);
        } else toast('Tersimpan');
        segarkan();
      } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
    });
    const hapus = async (s) => {
      if (!confirm(`Hapus penjualan ${s.app_name} ${s.variant_label ?? ''} (komisi ${rp(s.commission)})?`)) return;
      try { await q(supabase.from('affiliate_sales').delete().eq('id', s.id)); toast('Penjualan dihapus'); segarkan(); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    };
    wadah.replaceChildren(
      el('div', { class: 'grid2', style: 'margin-top:10px' }, isian('Komisi (% dari untung)', rate, 'Kosongkan untuk komisi bawaan.'), isian('Tujuan bayar', bayar)),
      el('div', { class: 'row', style: 'margin-top:8px' }, lama, el('label', { for: `lama-${a.partner_id}` }, 'Terapkan juga ke penjualan yang sudah tercatat'), simpan),
      el('h3', { class: 'judul-kecil' }, `Penjualan oleh ${a.name} (${jual.length})`),
      jual.length ? tabel(['Tanggal', 'Produk', 'Pembeli', '>Harga', '>HPP', '>Komisi', '>Untung kamu', ''], jual.map((s) => el('tr', {},
        td(tgl(s.sold_on)), td(`${s.app_name}${s.plan_label ? ' ' + s.plan_label : ''}${s.variant_label ? ' · ' + s.variant_label : ''}`),
        td(s.buyer_name || '–'), td(rp(s.price), true), td(s.hpp == null ? el('span', { class: 'tag kuning' }, 'kosong') : rp(s.hpp), true),
        td(rp(s.commission), true), td(rp(s.price - (s.hpp ?? s.price) - s.commission), true),
        td(el('button', { type: 'button', class: 'kecil bahaya', onclick: () => hapus(s) }, 'Hapus')))))
        : el('p', { class: 'muted' }, 'Belum ada penjualan.'));
  }

  async function unduhCsv() {
    try {
      const jual = await q(supabase.from('affiliate_sales').select('*').order('sold_on', { ascending: false }).limit(5000));
      const k = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const baris = [['Tanggal', 'Affiliate', 'Kode', 'Pembeli', 'Aplikasi', 'Kategori', 'Tipe akun', 'Varian', 'Harga jual', 'HPP', 'Untung', 'Komisi %', 'Komisi', 'Untung kamu', 'Sumber'].join(',')]
        .concat(jual.map((s) => { const a = byId.get(s.partner_id) || {};
          return [s.sold_on, a.name, a.referral_code, s.buyer_name, s.app_name, s.category, s.plan_label, s.variant_label, s.price, s.hpp,
            s.hpp == null ? '' : s.price - s.hpp, s.rate_pct, s.commission, s.hpp == null ? '' : s.price - s.hpp - s.commission, s.source].map(k).join(','); }));
      const url = URL.createObjectURL(new Blob(['﻿' + baris.join('\n')], { type: 'text/csv;charset=utf-8' }));
      const a = el('a', { href: url, download: `penjualan-affiliate-ixvii-${hari}.csv` }); document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) { toast('Gagal: ' + err.message, true); }
  }

  // ---------------------------------------------------------------- 2. catat penjualan (tempel teks)
  function bagianCatat() {
    const kotak = el('textarea', { rows: 7, placeholder: 'Netflix 1P1U 1 Bulan\nCapcut sharing 1 bulan\nchatgpt 1 bln\n\natau tempel form garansi lengkap:\nNama: Rani\nAplikasi : Netflix\nDurasi : 1 Bulan\nTanggal Beli : 10/09/2026', value: isiTempel });
    kotak.addEventListener('input', () => { isiTempel = kotak.value; });
    const info = el('div', { class: 'muted', style: 'margin-top:6px' }, 'Satu baris satu produk. Harga jual dan HPP dicari dari katalog, komisinya langsung terhitung.');
    const wadahDraft = el('div');
    const pilih = pilihAffiliate(affiliate[0]?.partner_id);
    const tanggal = el('input', { type: 'date', value: hari });
    const pembeli = el('input', { type: 'text', placeholder: 'Opsional', maxlength: 80 });
    const rateSekarang = () => Number(byId.get(Number(pilih.value))?.rate_pct ?? set.rate_pct);

    const baca = el('button', { type: 'button' }, 'Baca penjualan');
    baca.addEventListener('click', () => {
      if (!kotak.value.trim()) { info.textContent = 'Kotaknya masih kosong. Tempel dulu laporan penjualannya.'; info.className = 'msg warn'; return; }
      const h = pembaca.baca(kotak.value);
      draft = h.rows.map((r, i) => ({ id: `d${Date.now()}${i}`, app: r.item.a, tipe: r.item.k, varian: r.item.d, kategori: r.item.c, kode: r.item.code,
        harga: r.item.p, hpp: r.item.h, yakin: r.yakin, raw: r.raw }));
      if (h.nama) pembeli.value = h.nama;
      const tglBaca = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(h.tglTeks);
      if (tglBaca) { const y = +tglBaca[3] < 100 ? 2000 + +tglBaca[3] : +tglBaca[3]; tanggal.value = `${y}-${tglBaca[2].padStart(2, '0')}-${tglBaca[1].padStart(2, '0')}`; }
      const aff = pembaca.cariAffiliate(h.affHint, affiliate);
      if (aff) pilih.value = aff.partner_id;
      const pas = draft.filter((d) => d.yakin === 'pas').length;
      info.textContent = draft.length ? `${draft.length} produk terbaca, ${pas} cocok persis${h.gagal.length ? `. Tidak dikenali: ${h.gagal.slice(0, 3).join(', ')}` : ''}`
        : 'Tidak ada produk yang cocok dengan katalog. Tulis nama aplikasinya lebih lengkap.';
      info.className = !draft.length || h.gagal.length ? 'msg warn' : 'msg ok';
      gambarDraft();
    });
    const kosongkan = el('button', { type: 'button', class: 'sec kecil', onclick: () => { kotak.value = ''; isiTempel = ''; draft = []; gambarDraft(); } }, 'Kosongkan');

    const simpanSemua = el('button', { type: 'button' }, 'Simpan penjualan');
    simpanSemua.addEventListener('click', async () => {
      if (!pilih.value) return toast('Pilih affiliate dulu', true);
      if (!draft.length) return toast('Belum ada produk yang dibaca', true);
      simpanSemua.disabled = true;
      try {
        const h = await q(supabase.rpc('catat_penjualan_affiliate', { p_partner: Number(pilih.value), p_tanggal: tanggal.value || hari, p_pembeli: pembeli.value.trim() || null,
          p_rows: draft.map((d) => ({ app: d.app, tipe: d.tipe, varian: d.varian, kode: d.kode, kategori: d.kategori, harga: d.harga, hpp: d.hpp })) }));
        toast(`${h.n} penjualan dicatat untuk ${byId.get(Number(pilih.value)).name}, komisi ${rp(h.komisi)}`);
        draft = []; isiTempel = ''; segarkan();
      } catch (err) { toast('Gagal: ' + err.message, true); simpanSemua.disabled = false; }
    });
    const barisSimpan = el('div', { class: 'item-form' },
      el('div', { class: 'grid2' }, isian('Penjualan atas nama', pilih), isian('Tanggal', tanggal, 'Dipakai untuk semua baris di atas.'), isian('Nama pembeli', pembeli)),
      el('div', { class: 'row', style: 'margin-top:10px' }, simpanSemua));
    pilih.addEventListener('change', () => gambarDraft());

    function gambarDraft() {
      barisSimpan.hidden = !draft.length;
      if (!draft.length) { wadahDraft.replaceChildren(); return; }
      const rate = rateSekarang();
      let tH = 0, tU = 0, tK = 0;
      const baris = draft.map((d) => {
        const c = komisiDari(d.harga, d.hpp, rate, set);
        tH += d.harga || 0; tU += c.untung || 0; tK += c.k;
        const inp = (k, ph, mode) => {
          const i = el('input', { type: 'text', value: d[k] ?? '', placeholder: ph, inputmode: mode });
          i.addEventListener('change', () => {
            if (k === 'harga' || k === 'hpp') d[k] = angka(i.value);
            else {
              d[k] = i.value;
              const m = pembaca.cocokkan(`${d.app} ${d.tipe} ${d.varian}`);
              if (m) Object.assign(d, { harga: m.item.p, hpp: m.item.h, kategori: m.item.c, kode: m.item.code });
            }
            gambarDraft();
          });
          return i;
        };
        const label = { pas: 'cocok persis', dekat: 'cocok', tebak: 'tebakan' }[d.yakin];
        return el('div', { class: 'draft-baris' },
          el('div', { class: 'row' }, el('b', {}, d.app), el('span', { class: 'tag ' + (d.yakin === 'pas' ? 'hijau' : d.yakin === 'dekat' ? 'biru' : 'kuning') }, label),
            el('span', { class: 'muted', style: 'flex:1;font-style:italic' }, `dari: ${d.raw}`),
            el('button', { type: 'button', class: 'sec kecil', onclick: () => { draft = draft.filter((x) => x !== d); gambarDraft(); } }, 'Hapus')),
          el('div', { class: 'grid-draft' }, isian('Aplikasi', inp('app')), isian('Tipe akun', inp('tipe')), isian('Varian', inp('varian')),
            isian('Harga jual', inp('harga', '0', 'numeric')), isian('HPP', inp('hpp', 'kosong', 'numeric'))),
          el('div', { class: 'muted', style: 'margin-top:6px' }, 'Untung ', el('b', {}, rp(c.untung)), ' · komisi ', el('b', { style: 'color:var(--maroon)' }, rp(c.k)),
            ' · sisa untukmu ', el('b', {}, rp(c.untung == null ? null : c.untung - c.k))),
          c.potong ? el('div', { class: 'muted', style: 'color:var(--maroon)' }, `Komisi dipotong dari ${rp(c.penuh)} supaya untungmu tidak turun di bawah batas.`) : null,
          d.hpp == null ? el('div', { class: 'msg warn' }, 'HPP produk ini belum diisi, jadi komisinya 0. Isi HPP-nya dulu.') : null);
      });
      wadahDraft.replaceChildren(el('div', { class: 'item-form' },
        el('div', { class: 'row', style: 'justify-content:space-between' }, el('b', {}, `${draft.length} produk · komisi ${rate}%`),
          el('span', { class: 'muted' }, `Omzet ${rp(tH)} · untung ${rp(tU)} · komisi ${rp(tK)} · sisa untukmu ${rp(tU - tK)}`)), ...baris));
    }
    gambarDraft();
    return [el('section', { class: 'card' },
      el('h2', {}, 'Catat penjualan dari affiliate'),
      el('p', { class: 'sub' }, 'Tempel apa pun bentuknya: form garansi lengkap, satu baris nama produk, atau daftar beberapa penjualan sekaligus. Untuk pesanan dari website, cukup pilih affiliate di menu Pesanan: komisinya tercatat otomatis saat pesanan Aktif.'),
      kotak, el('div', { class: 'row', style: 'margin-top:8px' }, baca, kosongkan), info, wadahDraft, barisSimpan)];
  }

  // ---------------------------------------------------------------- 3. penarikan
  let ajukanUntuk = null;
  function bagianTarik() {
    const pilih = pilihAffiliate(ajukanUntuk ?? affiliate[0]?.partner_id);
    const jumlah = el('input', { type: 'text', inputmode: 'numeric', placeholder: '0' });
    const jadwal = el('input', { type: 'date', value: tanggalBayar(set.payday, hari) });
    const catatan = el('input', { type: 'text', placeholder: 'Opsional', maxlength: 200 });
    const hint = el('div', { class: 'muted', style: 'margin-top:6px' });
    const isiHint = () => {
      const a = byId.get(Number(pilih.value));
      if (!a) { hint.textContent = 'Tambahkan affiliate dulu.'; return; }
      const j = angka(jumlah.value);
      hint.textContent = `${a.name} punya saldo ${rp(a.tersedia)}. Minimum penarikan ${rp(set.min_withdraw)}.`
        + (j && j > a.tersedia ? ' Jumlah melebihi saldonya.' : j && j < set.min_withdraw ? ' Jumlah di bawah minimum.' : '')
        + (a.payout_to ? ` Tujuan bayar: ${a.payout_to}.` : '');
    };
    if (ajukanUntuk) { jumlah.value = String(Math.max(0, byId.get(ajukanUntuk)?.tersedia ?? 0)); ajukanUntuk = null; }
    pilih.addEventListener('change', isiHint); jumlah.addEventListener('input', isiHint); isiHint();
    const ajukan = el('button', { type: 'button' }, 'Ajukan');
    ajukan.addEventListener('click', async () => {
      ajukan.disabled = true;
      try {
        await q(supabase.rpc('ajukan_penarikan', { p_partner: Number(pilih.value), p_jumlah: angka(jumlah.value), p_jadwal: jadwal.value || null, p_catatan: catatan.value.trim() || null }));
        toast(`Penarikan dijadwalkan ${tgl(jadwal.value)}`); segarkan();
      } catch (err) { toast(err.message, true); ajukan.disabled = false; }
    });
    const ubah = async (w, nilai, pesan) => {
      try { await q(supabase.from('affiliate_withdrawals').update(nilai).eq('id', w.id)); toast(pesan); segarkan(); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    };
    const urut = tarik.slice().sort((a, b) => (a.status === 'dijadwalkan' ? 0 : 1) - (b.status === 'dijadwalkan' ? 0 : 1) || String(a.scheduled_on).localeCompare(String(b.scheduled_on)));
    const daftar = urut.length ? tabel(['Affiliate', 'Diajukan', 'Dibayar tanggal', '>Jumlah', 'Tujuan', 'Status', ''], urut.map((w) => {
      const a = byId.get(w.partner_id) || { name: '(dihapus)' };
      const sisa = w.scheduled_on ? selisih(w.scheduled_on, hari) : null;
      const status = w.status === 'dibayar' ? el('span', { class: 'tag hijau' }, `Dibayar ${tgl(w.paid_on)}`)
        : sisa < 0 ? el('span', { class: 'tag merah' }, `Telat ${-sisa} hari`) : el('span', { class: 'tag kuning' }, sisa === 0 ? 'Jatuh tempo hari ini' : `${sisa} hari lagi`);
      const geser = el('input', { type: 'date', value: w.scheduled_on || '', 'aria-label': 'Ubah tanggal bayar', style: 'width:auto' });
      geser.addEventListener('change', () => ubah(w, { scheduled_on: geser.value || null }, 'Tanggal bayar diubah'));
      return el('tr', {}, td(el('span', {}, el('b', {}, a.name), w.note ? el('div', { class: 'muted' }, w.note) : null)), td(tgl(w.requested_on)),
        td(w.status === 'dibayar' ? tgl(w.scheduled_on) : geser), td(rp(w.amount), true), td(a.payout_to || '–'), td(status),
        td(el('div', { class: 'row' },
          w.status === 'dijadwalkan' ? el('button', { type: 'button', class: 'kecil', onclick: () => { if (confirm(`Tandai penarikan ${a.name} ${rp(w.amount)} sudah dibayar?`)) ubah(w, { status: 'dibayar', paid_on: hari }, 'Ditandai sudah dibayar'); } }, 'Tandai dibayar') : null,
          el('button', { type: 'button', class: 'sec kecil', onclick: async () => {
            if (!confirm(w.status === 'dijadwalkan' ? 'Batalkan penarikan ini? Saldonya kembali tersedia.' : 'Hapus catatan penarikan yang sudah dibayar? Saldo affiliate akan bertambah lagi.')) return;
            try { await q(supabase.from('affiliate_withdrawals').delete().eq('id', w.id)); toast('Penarikan dihapus'); segarkan(); } catch (err) { toast('Gagal: ' + err.message, true); }
          } }, w.status === 'dijadwalkan' ? 'Batal' : 'Hapus'))));
    })) : el('p', { class: 'muted' }, 'Belum ada penarikan.');
    return [el('section', { class: 'card' },
      el('h2', {}, 'Penarikan'),
      el('p', { class: 'sub' }, `Ajukan atas nama affiliate waktu dia bilang mau tarik. Jumlahnya ditahan dari saldo sampai kamu tandai sudah dibayar. Jadwal bayar tiap tanggal ${set.payday}.`),
      el('div', { class: 'grid2' }, isian('Affiliate', pilih), isian('Jumlah', jumlah), isian('Dibayar tanggal', jadwal), isian('Catatan', catatan)),
      hint, el('div', { class: 'row', style: 'margin-top:10px' }, ajukan),
      el('div', { style: 'margin-top:14px' }, daftar))];
  }

  // ---------------------------------------------------------------- 4. daftar harga + komisi
  let hargaAff = null, hargaKat = '', hargaCari = '';
  function bagianHarga() {
    const pilih = pilihAffiliate(hargaAff ?? affiliate[0]?.partner_id);
    const kat = el('select', { 'aria-label': 'Kategori' }, el('option', { value: '' }, 'Semua kategori'),
      [...new Set(katalog.map((r) => r.kategori))].map((k) => el('option', { value: k, selected: k === hargaKat }, k)));
    const cari = el('input', { type: 'search', placeholder: 'Cari aplikasi', value: hargaCari });
    const wadah = el('div');
    const baris = () => katalog.filter((r) => r.tampil && (!hargaKat || r.kategori === hargaKat)
      && (!hargaCari || `${r.aplikasi} ${r.tipe} ${r.varian}`.toLowerCase().includes(hargaCari.toLowerCase())));
    const rate = () => Number(byId.get(Number(pilih.value))?.rate_pct ?? set.rate_pct);
    const gambarHarga = () => {
      const rs = baris(), r = rate();
      wadah.replaceChildren(el('p', { class: 'muted' }, `${rs.length} produk · komisi ${r}% dari untung`),
        rs.length ? tabel(['Aplikasi', 'Tipe', 'Varian', '>Harga jual', '>Komisi', '>Untung kamu'], rs.slice(0, 250).map((x) => {
          const c = komisiDari(x.harga, x.hpp, r, set);
          return el('tr', {}, td(x.aplikasi), td(x.tipe), td(x.varian), td(rp(x.harga), true), td(rp(c.k), true),
            td(x.hpp == null ? el('span', { class: 'tag kuning' }, 'HPP kosong') : rp(c.untung - c.k), true));
        })) : el('p', { class: 'muted' }, 'Tidak ada yang cocok.'));
    };
    pilih.addEventListener('change', () => { hargaAff = Number(pilih.value); gambarHarga(); });
    kat.addEventListener('change', () => { hargaKat = kat.value; gambarHarga(); });
    cari.addEventListener('input', () => { hargaCari = cari.value; gambarHarga(); });
    const salinWa = el('button', { type: 'button', class: 'sec kecil' }, 'Salin untuk WhatsApp');
    salinWa.addEventListener('click', () => {
      const a = byId.get(Number(pilih.value));
      if (!a) return toast('Tambahkan affiliate dulu', true);
      const r = rate();
      const teks = `DAFTAR HARGA & KOMISI IXVII.CO\nUntuk ${a.name}, komisi ${r}% dari margin\n\n`
        + baris().slice(0, 150).map((x) => `${x.aplikasi} ${x.tipe} ${x.varian} — jual ${rp(x.harga)}, komisi ${rp(komisiDari(x.harga, x.hpp, r, set).k)}`).join('\n')
        + `\n\nKomisi dihitung setelah pembeli terkonfirmasi. Order tetap lewat admin.${a.referral_code ? ` Sebut kode ${a.referral_code} saat order.` : ''}`;
      salin(teks, 'Daftar harga disalin, tinggal tempel di WhatsApp');
    });
    gambarHarga();
    return [el('section', { class: 'card' },
      el('h2', {}, 'Daftar harga & komisi'),
      el('p', { class: 'sub' }, 'Yang ikut tersalin hanya harga jual dan komisi. HPP dan untungmu hanya untuk dilihat di sini.'),
      el('div', { class: 'grid2' }, pilih, kat, cari), el('div', { class: 'row', style: 'margin-top:8px' }, salinWa), wadah)];
  }

  // ---------------------------------------------------------------- 5. aturan komisi
  function bagianAturan() {
    const f = (k, l, catatan, extra = {}) => { const i = el('input', { type: 'text', inputmode: 'decimal', value: set[k], ...extra }); i.dataset.k = k; return isian(l, i, catatan); };
    const bulat = el('select', {}, [[100, 'Ratusan'], [500, 'Lima ratusan'], [1000, 'Ribuan'], [1, 'Tanpa pembulatan']].map(([v, l]) => el('option', { value: v, selected: Number(set.round_to) === v }, l)));
    bulat.dataset.k = 'round_to';
    const form = el('div', { class: 'grid2' },
      f('rate_pct', 'Komisi bawaan (%)', 'Persen dari untung tiap transaksi.'),
      f('min_owner_pct', 'Bagian minimum untukmu (%)', 'Persen untung yang tidak boleh diserahkan.'),
      f('min_owner_rp', 'Untung minimum untukmu (Rp)', 'Per transaksi.'),
      isian('Pembulatan komisi', bulat, 'Selalu dibulatkan ke bawah.'),
      f('min_withdraw', 'Minimum penarikan (Rp)', 'Saldo di bawah ini belum bisa ditarik.'),
      f('payday', 'Tanggal bayar tiap bulan', '1 sampai 28.'));
    const contoh = el('div', { class: 'msg', style: 'background:#f2f2f4' });
    const baca = () => Object.fromEntries([...form.querySelectorAll('[data-k]')].map((i) => [i.dataset.k, Number(String(i.value).replace(',', '.'))]));
    const isiContoh = () => { const s = baca(); const c = komisiDari(45000, 33000, s.rate_pct, s); contoh.textContent = `Contoh: jual Rp45.000, HPP Rp33.000 (untung Rp12.000) → komisi ${rp(c.k)}, untukmu ${rp(12000 - c.k)}.`; };
    form.addEventListener('input', isiContoh); form.addEventListener('change', isiContoh); isiContoh();
    const simpan = el('button', { type: 'button' }, 'Simpan aturan');
    simpan.addEventListener('click', async () => {
      const s = baca();
      if (!(s.rate_pct >= 0 && s.rate_pct <= 90) || !(s.min_owner_pct >= 0 && s.min_owner_pct <= 100) || !(s.payday >= 1 && s.payday <= 28)) return toast('Periksa angkanya lagi', true);
      simpan.disabled = true;
      try { await q(supabase.from('affiliate_settings').update({ ...s, updated_at: new Date().toISOString() }).eq('id', 1)); toast('Aturan komisi tersimpan. Berlaku untuk penjualan berikutnya.'); segarkan(); }
      catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
    });
    return [el('section', { class: 'card' },
      el('h2', {}, 'Aturan komisi'),
      el('p', { class: 'sub' }, 'Komisi dihitung dari untung, bukan dari harga jual. Berapa pun tipisnya margin sebuah produk, bagianmu tidak pernah habis. Perubahan berlaku untuk penjualan berikutnya.'),
      form, contoh, el('div', { class: 'row', style: 'margin-top:10px' }, simpan))];
  }

  // ---------------------------------------------------------------- susun
  const BAGIAN = [['saldo', 'Saldo', bagianSaldo], ['catat', 'Catat penjualan', bagianCatat], ['tarik', 'Penarikan', bagianTarik],
    ['harga', 'Daftar harga', bagianHarga], ['aturan', 'Aturan komisi', bagianAturan]];
  function gambar() {
    const menunggu = tarik.filter((w) => w.status === 'dijadwalkan').length;
    const tab = el('div', { class: 'row tab sub-tab', role: 'group', 'aria-label': 'Bagian affiliate' }, BAGIAN.map(([k, l]) => el('button', {
      type: 'button', class: 'kecil ' + (k === bagian ? '' : 'sec'), 'aria-pressed': String(k === bagian), onclick: () => { bagian = k; gambar(); },
    }, l, k === 'tarik' && menunggu ? ` (${menunggu})` : '')));
    halaman.replaceChildren(tab, ...BAGIAN.find(([k]) => k === bagian)[2]());
  }
  gambar();
}
