// Menu Laporan: omzet, HPP, komisi affiliate, dan profit per hari / minggu / bulan.
// Dihitung dari pesanan berstatus Dibayar, Aktif, atau Selesai pada tanggal dibayar (WIB).
import { el, hariIni, isian, q, rp, tabel, td, toast } from './alat.js';
import { SUMBER } from './pesanan-baru.js';

const WARNA = { omzet: '#3d6fb4', profit: '#a3262d' };   // tervalidasi CVD (dataviz validate_palette)
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const SATUAN = { hari: ['Harian', 30], minggu: ['Mingguan', 12], bulan: ['Bulanan', 12] };
let satuan = 'hari';
let rentang = null;   // {dari, sampai} pilihan sendiri

const iso = (d) => d.toISOString().slice(0, 10);
const geser = (s, hari) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + hari); return iso(d); };
const awalMinggu = (s) => { const d = new Date(s + 'T00:00:00Z'); return geser(s, -((d.getUTCDay() + 6) % 7)); };
const awalBulan = (s, mundur = 0) => { const d = new Date(s + 'T00:00:00Z'); return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - mundur, 1))); };
const pendek = (n) => {
  const a = Math.abs(n), t = n < 0 ? '−' : '';
  if (a >= 1e9) return `${t}Rp${(a / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })}M`;
  if (a >= 1e6) return `${t}Rp${(a / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`;
  if (a >= 1e3) return `${t}Rp${Math.round(a / 1e3)}rb`;
  return `${t}Rp${a}`;
};
const persen = (a, b) => (b ? `${((a / b) * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%` : '–');
export function labelPeriode(p, s, panjang = false) {
  const d = new Date(p + 'T00:00:00Z');
  const tgl = `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`;
  if (s === 'bulan') return panjang ? `${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}` : `${BULAN[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
  if (s === 'minggu') return panjang ? `${tgl} – ${(() => { const e = new Date(geser(p, 6) + 'T00:00:00Z'); return `${e.getUTCDate()} ${BULAN[e.getUTCMonth()]}`; })()}` : tgl;
  return panjang ? `${tgl} ${d.getUTCFullYear()}` : tgl;
}
function rentangBawaan(s, hari) {
  if (s === 'hari') return { dari: geser(hari, -29), sampai: hari };
  if (s === 'minggu') return { dari: geser(awalMinggu(hari), -7 * 11), sampai: hari };
  return { dari: awalBulan(hari, 11), sampai: hari };
}

export async function halamanLaporan(supabase, halaman) {
  const hari = hariIni();
  const lap = (s, dari, sampai) => q(supabase.rpc('laporan_penjualan', { p_satuan: s, p_dari: dari, p_sampai: sampai }));
  let ringkas;
  try {
    ringkas = await Promise.all([
      lap('hari', geser(hari, -1), hari), lap('minggu', geser(awalMinggu(hari), -7), hari), lap('bulan', awalBulan(hari, 1), hari)]);
  } catch {
    halaman.replaceChildren(el('div', { class: 'msg warn' }, 'Menu Laporan butuh migration 20261111000000_pesanan_admin_laporan.sql. Jalankan dulu di SQL Editor Supabase.'));
    return;
  }

  // ---- kartu hari ini / minggu ini / bulan ini
  const kartuRingkas = el('div', { class: 'stats laporan-ringkas' }, ringkas.map((r, i) => {
    const [lalu, kini] = [r.periode[0] ?? {}, r.periode[1] ?? {}];
    const [judul, banding] = [['Hari ini', 'kemarin'], ['Minggu ini', 'minggu lalu'], ['Bulan ini', 'bulan lalu']][i];
    return el('div', { class: 'stat' },
      el('span', {}, judul), el('b', {}, rp(kini.omzet ?? 0)),
      el('div', { class: 'baris-kecil' }, 'Profit ', el('strong', {}, rp(kini.profit ?? 0)), ` · ${kini.pesanan ?? 0} pesanan`),
      el('div', { class: 'muted' }, `${banding}: ${rp(lalu.omzet ?? 0)} · profit ${rp(lalu.profit ?? 0)}`));
  }));

  // ---- pilihan periode
  const isi = el('div');
  const tab = el('div', { class: 'row tab', role: 'group', 'aria-label': 'Satuan laporan' });
  const dari = el('input', { type: 'date', max: hari, 'aria-label': 'Dari tanggal' });
  const sampai = el('input', { type: 'date', max: hari, 'aria-label': 'Sampai tanggal' });
  const terapkan = el('button', { type: 'button', class: 'sec kecil' }, 'Terapkan');
  terapkan.addEventListener('click', () => {
    if (!dari.value || !sampai.value || sampai.value < dari.value) return toast('Periksa tanggalnya', true);
    rentang = { dari: dari.value, sampai: sampai.value }; muat();
  });

  async function muat() {
    tab.replaceChildren(...Object.entries(SATUAN).map(([k, [l]]) => el('button', {
      type: 'button', class: 'kecil ' + (k === satuan ? '' : 'sec'), 'aria-pressed': String(k === satuan),
      onclick: () => { satuan = k; rentang = null; muat(); },
    }, l)));
    const r = rentang ?? rentangBawaan(satuan, hari);
    dari.value = r.dari; sampai.value = r.sampai;
    isi.replaceChildren(el('p', { class: 'muted' }, 'Memuat…'));
    let d;
    try { d = await lap(satuan, r.dari, r.sampai); } catch (err) { isi.replaceChildren(el('div', { class: 'msg err' }, err.message)); return; }
    gambar(d);
  }

  function gambar(d) {
    const t = d.total;
    const stat = (n, l, kelas = '') => el('div', { class: 'stat ' + kelas }, el('b', {}, n), el('span', {}, l));
    const peringatan = [
      t.tanpa_hpp ? el('div', { class: 'msg warn' }, `${t.tanpa_hpp} item terjual belum punya HPP, jadi profitnya dihitung tanpa modal (terlihat lebih besar). Isi HPP-nya di menu Stok & harga.`) : null,
      d.affiliate_luar?.n ? el('div', { class: 'msg', style: 'background:#f2f2f4' }, `Di luar laporan ini: ${d.affiliate_luar.n} penjualan affiliate yang dicatat lewat tempel teks (omzet ${rp(d.affiliate_luar.omzet)}, komisi ${rp(d.affiliate_luar.komisi)}). Supaya ikut terhitung, catat penjualan seperti itu lewat "+ Pesanan baru".`) : null,
    ].filter(Boolean);
    const baris = d.periode.slice().reverse().filter((p) => p.pesanan > 0);   // periode kosong hanya tampil di grafik
    isi.replaceChildren(
      el('div', { class: 'stats stats-laporan' }, stat(rp(t.omzet), 'omzet'), stat(rp(t.profit), 'profit', t.profit < 0 ? 'merah' : ''), stat(persen(t.profit, t.omzet), 'margin profit'),
        stat(t.pesanan, 'pesanan'), stat(rp(t.hpp), 'HPP / modal'), stat(rp(t.komisi), 'komisi affiliate')),
      ...peringatan,
      grafik(d.periode, satuan),
      el('h3', { class: 'judul-kecil' }, 'Per periode'),
      baris.length ? tabel(['Periode', '>Pesanan', '>Omzet', '>HPP', '>Komisi', '>Profit', '>Margin'], baris.map((p) => el('tr', {},
        td(labelPeriode(p.periode, satuan, true)), td(p.pesanan, true), td(rp(p.omzet), true), td(rp(p.hpp), true), td(rp(p.komisi), true),
        td(el('b', { style: p.profit < 0 ? 'color:var(--red)' : '' }, rp(p.profit)), true), td(persen(p.profit, p.omzet), true))))
        : el('p', { class: 'muted' }, 'Belum ada penjualan di rentang ini.'),
      el('h3', { class: 'judul-kecil' }, 'Per aplikasi (profit terbesar)'),
      d.aplikasi.length ? tabel(['Aplikasi', '>Terjual', '>Omzet', '>HPP', '>Profit'], d.aplikasi.slice(0, 15).map((a) => el('tr', {},
        td(el('span', {}, a.aplikasi, a.tanpa_hpp ? el('span', { class: 'tag kuning', style: 'margin-left:6px' }, `${a.tanpa_hpp} tanpa HPP`) : null)),
        td(a.item, true), td(rp(a.omzet), true), td(rp(a.hpp), true), td(el('b', {}, rp(a.profit)), true)))) : el('p', { class: 'muted' }, '–'),
      el('h3', { class: 'judul-kecil' }, 'Per sumber penjualan'),
      d.sumber.length ? tabel(['Sumber', '>Pesanan', '>Omzet', '>Profit'], d.sumber.map((s) => el('tr', {},
        td(SUMBER[s.sumber] || s.sumber), td(s.pesanan, true), td(rp(s.omzet), true), td(rp(s.profit), true)))) : el('p', { class: 'muted' }, '–'),
      el('div', { class: 'row', style: 'margin-top:12px' }, el('button', { type: 'button', class: 'sec kecil', onclick: () => unduh(d) }, 'Unduh CSV')),
      el('p', { class: 'muted', style: 'margin-top:8px' }, 'Profit = omzet (sudah dikurangi diskon) − HPP saat pesanan dibuat − komisi affiliate. Pesanan dihitung pada tanggal dibayar; pesanan menunggu bayar dan batal tidak ikut.'));
  }

  function unduh(d) {
    const k = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const isiCsv = [['Periode', 'Pesanan', 'Item', 'Omzet', 'HPP', 'Komisi affiliate', 'Profit', 'Item tanpa HPP'].join(',')]
      .concat(d.periode.map((p) => [labelPeriode(p.periode, satuan, true), p.pesanan, p.item, p.omzet, p.hpp, p.komisi, p.profit, p.tanpa_hpp].map(k).join(',')));
    const url = URL.createObjectURL(new Blob(['﻿' + isiCsv.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = el('a', { href: url, download: `laporan-${satuan}-${d.dari}-${d.sampai}.csv` }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  halaman.replaceChildren(kartuRingkas, el('section', { class: 'card' },
    el('h2', {}, 'Omzet & profit'),
    el('p', { class: 'sub' }, 'Dari semua pesanan yang sudah dibayar, termasuk pesanan yang kamu catat sendiri di menu Pesanan.'),
    tab, el('div', { class: 'row', style: 'margin-top:8px' }, isian('Dari', dari), isian('Sampai', sampai), el('div', { style: 'align-self:end' }, terapkan)),
    el('div', { style: 'margin-top:10px' }, isi)));
  await muat();
}

// ---------------------------------------------------------------- grafik batang omzet & profit
function grafik(periode, s) {
  const wadah = el('div', { class: 'grafik-laporan' });
  const legenda = el('div', { class: 'legenda' },
    el('span', {}, el('i', { style: `background:${WARNA.omzet}` }), 'Omzet'), el('span', {}, el('i', { style: `background:${WARNA.profit}` }), 'Profit'));
  const tip = el('div', { class: 'tip-grafik', role: 'status', hidden: true });
  const kanvas = el('div', { class: 'kanvas-grafik' });
  wadah.append(legenda, kanvas, tip);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

  function lukis() {
    const W = Math.max(300, kanvas.clientWidth || 600), H = 220, kiri = 52, bawah = 26, atas = 8;
    const maks = Math.max(1, ...periode.map((p) => Math.max(p.omzet, p.profit)));
    const min = Math.min(0, ...periode.map((p) => p.profit));
    const skala = (v) => atas + (H - atas - bawah) * (1 - (v - min) / (maks - min));
    const nol = skala(0);
    const kolom = (W - kiri) / periode.length;
    const lebarBatang = Math.max(2, Math.min(18, (kolom - 6) / 2));
    const s2 = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Grafik omzet dan profit per periode' });
    // garis bantu
    for (let i = 0; i <= 3; i++) {
      const v = min + ((maks - min) * i) / 3, y = skala(v);
      s2.append(svg('line', { x1: kiri, x2: W, y1: y, y2: y, stroke: i === 0 && min === 0 ? '#c9c9ce' : '#ececef', 'stroke-width': 1 }));
      const lbl = svg('text', { x: kiri - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#6b6b70' }); lbl.textContent = pendek(v); s2.append(lbl);
    }
    if (min < 0) s2.append(svg('line', { x1: kiri, x2: W, y1: nol, y2: nol, stroke: '#c9c9ce', 'stroke-width': 1 }));
    const batang = (x, v, warna) => {
      const y = skala(v), h = Math.abs(nol - y), r = Math.min(4, h, lebarBatang / 2);
      if (h < 0.5) return null;
      const naik = v >= 0, y0 = naik ? y : nol, y1 = naik ? nol : y;
      // ujung data membulat 4px, menempel ke garis nol
      const d = naik ? `M${x},${y1} V${y0 + r} Q${x},${y0} ${x + r},${y0} H${x + lebarBatang - r} Q${x + lebarBatang},${y0} ${x + lebarBatang},${y0 + r} V${y1} Z`
        : `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + lebarBatang - r} Q${x + lebarBatang},${y1} ${x + lebarBatang},${y1 - r} V${y0} Z`;
      return svg('path', { d, fill: warna });
    };
    const tiap = Math.max(1, Math.ceil(48 / kolom));
    periode.forEach((p, i) => {
      const x0 = kiri + i * kolom, tengah = x0 + kolom / 2;
      const g = svg('g', { class: 'kolom-grafik' });
      const sorot = svg('rect', { x: x0, y: atas, width: kolom, height: H - atas - bawah, fill: 'transparent', class: 'sorot' });
      g.append(sorot);
      const a = batang(tengah - lebarBatang - 1, p.omzet, WARNA.omzet), b = batang(tengah + 1, p.profit, p.profit < 0 ? '#b42318' : WARNA.profit);
      if (a) g.append(a); if (b) g.append(b);
      if (i % tiap === 0 || i === periode.length - 1) {
        const lbl = svg('text', { x: tengah, y: H - 8, 'text-anchor': 'middle', 'font-size': 11, fill: '#6b6b70' });
        lbl.textContent = labelPeriode(p.periode, s); g.append(lbl);
      }
      const tampil = () => {
        tip.hidden = false;
        tip.replaceChildren(el('b', {}, labelPeriode(p.periode, s, true)), el('div', {}, `Omzet ${rp(p.omzet)}`), el('div', {}, `Profit ${rp(p.profit)}`),
          el('div', { class: 'muted' }, `${p.pesanan} pesanan · HPP ${rp(p.hpp)}${p.komisi ? ` · komisi ${rp(p.komisi)}` : ''}`));
        const kiriTip = Math.min(Math.max(0, tengah - 90), W - 180);
        tip.style.left = `${kiriTip}px`;
        sorot.setAttribute('fill', 'rgba(0,0,0,.04)');
      };
      const sembunyi = () => { tip.hidden = true; sorot.setAttribute('fill', 'transparent'); };
      g.addEventListener('pointerenter', tampil); g.addEventListener('pointerleave', sembunyi);
      g.addEventListener('click', tampil);
      s2.append(g);
    });
    kanvas.replaceChildren(s2);
  }
  requestAnimationFrame(lukis);
  const ro = new ResizeObserver(() => { if (!kanvas.isConnected) { ro.disconnect(); return; } lukis(); });
  ro.observe(kanvas);
  return wadah;
}
