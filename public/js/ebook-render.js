// Penampil isi ebook: markdown sederhana + blok interaktif ":::nama … :::".
// Dipakai halaman ebook pembaca dan pratinjau editor di panel admin. Tanpa innerHTML untuk teks dari database.
//
// Blok yang dikenali (satu baris = satu item, pisahkan kolom dengan " | "):
//   :::alur [arah=bawah]      Judul | keterangan          → diagram alur dengan panah
//   :::langkah                kalimat                     → daftar langkah bernomor
//   :::sop id=…               kalimat                     → langkah yang bisa dicentang + progres
//   :::checklist id=… [harian=ya]  kalimat                → checklist tersimpan (harian = mulai ulang tiap hari)
//   :::hitung-hpp hpp=28000 jual=45000                    → kalkulator HPP & margin
//   :::strategi               Nama | HPP | Harga jual     → perbandingan margin
//   :::simulasi margin=17000                              → simulasi untung per hari/minggu/bulan
//   :::kartu                  Judul | teks                → kartu-kartu
//   :::poster                 baris poster                → contoh tata letak poster
//   :::form                   nama kolom                  → contoh formulir
//   :::garis-waktu            Tanggal | kejadian          → garis waktu
//   :::catatan / :::tips / :::peringatan / :::kutipan     → kotak sorotan
// Markdown: ## judul, ### subjudul, - daftar, 1. daftar, | tabel |, ![gambar](/…), > kutipan, **tebal**, [tautan](…)

const buat = (tag, attrs = {}, ...anak) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const a of anak.flat()) if (a != null && a !== false) e.append(a instanceof Node ? a : document.createTextNode(String(a)));
  return e;
};
const rupiah = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
const persen = (x) => (Number.isFinite(x) ? x.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%' : '–');

/** Teks satu baris → node (**tebal**, *miring*, [tautan](url)). */
export function sebaris(teks) {
  const hasil = [];
  const pola = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let akhir = 0, m;
  const s = String(teks ?? '');
  while ((m = pola.exec(s))) {
    if (m.index > akhir) hasil.push(s.slice(akhir, m.index));
    if (m[1] != null) hasil.push(buat('strong', {}, m[1]));
    else if (m[2] != null) hasil.push(buat('em', {}, m[2]));
    else if (/^(https:\/\/|\/(?!\/)|mailto:)/.test(m[4])) hasil.push(buat('a', /^https:/.test(m[4]) ? { href: m[4], target: '_blank', rel: 'noopener' } : { href: m[4] }, m[3]));
    else hasil.push(m[3]);
    akhir = pola.lastIndex;
  }
  if (akhir < s.length) hasil.push(s.slice(akhir));
  return hasil;
}

// ---------------------------------------------------------------- ikon (garis sederhana buatan sendiri)
const JALUR = {
  buku: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7',
  roket: 'M5 15c-1.5 1.5-2 4-2 6 2 0 4.5-.5 6-2M9 13l2 2M14 4c3-1 5-1 6 0 1 1 1 3 0 6l-6 6-6-6zM15 9h.01M8 11l-3 1 2-4h4M13 16l-1 3 4-2v-4',
  alur: 'M3 6h5v4H3zM16 14h5v4h-5zM8 8h4a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2M12 12l2 2-2 2',
  tas: 'M4 8h16v12H4zM9 8V5h6v3M4 13h16M11 13v2h2v-2',
  pesawat: 'M21 3 3 10l7 3 3 7zM10 13l11-10',
  kalkulator: 'M6 3h12v18H6zM9 6h6v3H9zM9 12h.01M12 12h.01M15 12h.01M9 15h.01M12 15h.01M15 15v3M9 18h3',
  megafon: 'M3 10v4h3l7 4V6l-7 4zM16 9a3 3 0 0 1 0 6M6 14l1 5h3l-1-4',
  katalog: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  dompet: 'M3 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-3v3M16 13h.01',
  perisai: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4',
  magnet: 'M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4zM6 8h4M14 8h4',
  perangkat: 'M3 5h13v10H3zM7 19h5M9.5 15v4M17 9h4v11h-4zM19 17h.01',
  rute: 'M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 16V9a3 3 0 0 1 3-3h1M18 8v7a3 3 0 0 1-3 3h-1M12 4l2 2-2 2M12 16l-2 2 2 2',
  gunung: 'M3 20 10 8l4 6 2-3 5 9zM8.5 11 10 13l1.5-2',
  hadiah: 'M4 9h16v4H4zM5 13h14v8H5zM12 9v12M12 9c-1-3-5-4-5-1.5S10 9 12 9c2 0 5-.5 5-1.5S13 6 12 9',
  centang: 'M4 4h16v16H4zM8 12l3 3 5-6',
  koin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2',
  lampu: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  bendera: 'M5 21V4M5 4h12l-2 4 2 4H5',
};
export const DAFTAR_IKON = Object.keys(JALUR);
export function ikon(nama, ukuran = 24) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', ukuran);
  svg.setAttribute('height', ukuran);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', JALUR[nama] || JALUR.buku);
  svg.append(p);
  return svg;
}

// ---------------------------------------------------------------- blok interaktif
const kolom = (baris) => baris.split('|').map((x) => x.trim());
const angka = (v, cadangan = 0) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : cadangan; };

function blokAlur(baris, p) {
  const ke = p.arah === 'bawah' ? ' bawah' : '';
  return buat('div', { class: 'e-alur' + ke, role: 'list' }, baris.flatMap((b, i) => {
    const [judul, ket] = kolom(b);
    const langkah = buat('div', { class: 'e-alur-langkah', role: 'listitem' }, buat('span', { class: 'e-alur-no' }, i + 1),
      buat('div', {}, buat('b', {}, ...sebaris(judul)), ket ? buat('small', {}, ...sebaris(ket)) : null));
    return i < baris.length - 1 ? [langkah, buat('span', { class: 'e-alur-panah', 'aria-hidden': 'true' }, '→')] : [langkah];
  }));
}
const blokLangkah = (baris) => buat('ol', { class: 'e-langkah' }, baris.map((b) => buat('li', {}, ...sebaris(b))));

function blokCentang(baris, p, opsi, sop) {
  const id = p.id || 'daftar';
  const kunci = p.harian === 'ya' ? `${id}@${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })}` : id;
  const terpilih = new Set(opsi.progres?.cek?.[kunci] ?? []);
  const bar = buat('i');
  const hitung = buat('span');
  const kotak = buat('div', { class: 'e-centang' + (sop ? ' sop' : '') });
  const segar = () => {
    const n = baris.filter((_, i) => terpilih.has(i)).length;
    hitung.textContent = sop ? `${n}/${baris.length} langkah` : `${n}/${baris.length} siap`;
    bar.style.width = `${Math.round((n / baris.length) * 100)}%`;
    kotak.classList.toggle('lengkap', n === baris.length);
    const berikut = baris.findIndex((_, i) => !terpilih.has(i));
    kotak.querySelectorAll('li').forEach((li, i) => li.classList.toggle('berikut', sop && i === berikut));
  };
  const daftar = buat('ol', {}, baris.map((b, i) => {
    const c = buat('input', { type: 'checkbox', id: `${kunci}-${i}` });
    c.checked = terpilih.has(i);
    c.addEventListener('change', () => {
      if (c.checked) terpilih.add(i); else terpilih.delete(i);
      segar();
      opsi.simpanCek?.(kunci, [...terpilih].sort((x, y) => x - y));
    });
    return buat('li', {}, c, buat('label', { for: `${kunci}-${i}` }, sop ? buat('span', { class: 'e-sop-no' }, `Step ${i + 1}`) : null, buat('span', {}, ...sebaris(b))));
  }));
  kotak.append(buat('div', { class: 'e-centang-kepala' }, hitung, buat('span', { class: 'e-bar', 'aria-hidden': 'true' }, bar),
    p.harian === 'ya' ? buat('small', {}, 'Mulai ulang setiap hari') : null), daftar);
  segar();
  return kotak;
}

function kolomAngka(label, nilai) {
  const input = buat('input', { type: 'number', min: '0', step: '500', inputmode: 'numeric', value: nilai });
  return { input, el: buat('label', { class: 'e-isian' }, buat('span', {}, label), buat('span', { class: 'e-rp' }, 'Rp', input)) };
}

function blokHitungHpp(p) {
  const hpp = kolomAngka('HPP (harga dari supplier)', angka(p.hpp, 28000));
  const jual = kolomAngka('Harga jual', angka(p.jual, 45000));
  const hasil = buat('div', { class: 'e-hasil' });
  const batang = buat('div', { class: 'e-batang', 'aria-hidden': 'true' });
  const hitung = () => {
    const h = angka(hpp.input.value), j = angka(jual.input.value);
    const m = j - h;
    hasil.replaceChildren(
      buat('div', { class: m < 0 ? 'rugi' : '' }, buat('small', {}, m < 0 ? 'Rugi' : 'Margin kotor'), buat('b', {}, rupiah(Math.abs(m)))),
      buat('div', {}, buat('small', {}, 'Margin dari harga jual'), buat('b', {}, j > 0 ? persen((m / j) * 100) : '–')),
      buat('div', {}, buat('small', {}, 'Markup dari HPP'), buat('b', {}, h > 0 ? persen((m / h) * 100) : '–')));
    const total = Math.max(j, h, 1);
    batang.replaceChildren(buat('span', { class: 'hpp', style: `width:${(Math.min(h, j || h) / total) * 100}%` }, 'HPP'),
      m > 0 ? buat('span', { class: 'untung', style: `width:${(m / total) * 100}%` }, 'Untung') : null);
  };
  hpp.input.addEventListener('input', hitung);
  jual.input.addEventListener('input', hitung);
  hitung();
  return buat('div', { class: 'e-alat' }, buat('div', { class: 'e-alat-judul' }, ikon('kalkulator', 18), 'Kalkulator HPP & margin'),
    buat('div', { class: 'e-dua' }, hpp.el, jual.el), batang, hasil);
}

function blokStrategi(baris) {
  const data = baris.map((b) => { const [nama, h, j] = kolom(b); return { nama, h: angka(h), j: angka(j) }; });
  const maks = Math.max(...data.map((d) => d.j - d.h), 1);
  return buat('div', { class: 'e-strategi' }, data.map((d) => {
    const m = d.j - d.h;
    return buat('div', { class: 'e-strategi-baris' },
      buat('div', { class: 'e-strategi-nama' }, buat('b', {}, ...sebaris(d.nama)), buat('small', {}, `HPP ${rupiah(d.h)} → jual ${rupiah(d.j)}`)),
      buat('div', { class: 'e-strategi-bar' }, buat('i', { style: `width:${Math.max(4, (m / maks) * 100)}%` })),
      buat('div', { class: 'e-strategi-angka' }, buat('b', {}, rupiah(m)), buat('small', {}, d.j ? persen((m / d.j) * 100) : '')));
  }));
}

function blokSimulasi(p) {
  const margin = kolomAngka('Margin kotor per order', angka(p.margin, 17000));
  const geser = buat('input', { type: 'range', min: '1', max: '30', value: '5', 'aria-label': 'Order per hari' });
  const label = buat('b');
  const hasil = buat('div', { class: 'e-hasil tiga' });
  const hitung = () => {
    const m = angka(margin.input.value), n = Number(geser.value);
    label.textContent = `${n} order/hari`;
    hasil.replaceChildren(
      buat('div', {}, buat('small', {}, 'Per hari'), buat('b', {}, rupiah(m * n))),
      buat('div', {}, buat('small', {}, 'Per minggu'), buat('b', {}, rupiah(m * n * 7))),
      buat('div', {}, buat('small', {}, 'Per bulan (30 hari)'), buat('b', {}, rupiah(m * n * 30))));
  };
  margin.input.addEventListener('input', hitung);
  geser.addEventListener('input', hitung);
  hitung();
  return buat('div', { class: 'e-alat' }, buat('div', { class: 'e-alat-judul' }, ikon('koin', 18), 'Simulasi margin kotor'),
    margin.el, buat('label', { class: 'e-geser' }, buat('span', {}, 'Jumlah order per hari ', label), geser), hasil);
}

const blokKartu = (baris) => buat('div', { class: 'e-kartu' }, baris.map((b) => {
  const [judul, teks] = kolom(b);
  const no = judul.match(/^(\d{1,2})\.\s*(.*)$/);
  return buat('div', { class: 'e-kartu-isi' }, no ? buat('span', { class: 'e-kartu-no' }, no[1]) : null,
    buat('b', {}, ...sebaris(no ? no[2] : judul)), teks ? buat('p', {}, ...sebaris(teks)) : null);
}));

function blokPoster(baris) {
  const [judul, sub, harga, ...sisa] = baris;
  const kontak = sisa.length > 1 ? sisa.pop() : null;
  const ajakan = sisa.length > 1 ? sisa.pop() : null;
  return buat('figure', { class: 'e-poster' },
    buat('div', { class: 'e-poster-isi' },
      buat('span', { class: 'e-poster-label' }, 'Contoh tata letak'),
      buat('b', { class: 'e-poster-judul' }, judul),
      sub ? buat('span', { class: 'e-poster-sub' }, sub) : null,
      harga ? buat('span', { class: 'e-poster-harga' }, harga) : null,
      buat('ul', {}, sisa.map((s) => buat('li', {}, s.replace(/^[✓✔-]\s*/, '')))),
      ajakan ? buat('span', { class: 'e-poster-cta' }, ajakan) : null,
      kontak ? buat('span', { class: 'e-poster-kontak' }, kontak) : null),
    buat('figcaption', {}, 'Struktur poster sederhana: judul, harga, 3 poin utama, ajakan, kontak.'));
}

const blokForm = (baris) => buat('div', { class: 'e-form', 'aria-label': 'Contoh formulir' },
  buat('div', { class: 'e-alat-judul' }, ikon('perisai', 18), 'Contoh form aktivasi garansi'),
  baris.map((b) => buat('div', { class: 'e-form-baris' + (/screenshot|bukti|foto/i.test(b) ? ' unggah' : '') }, buat('span', {}, b),
    buat('span', { class: 'e-form-isian' }, /screenshot|bukti|foto/i.test(b) ? 'Unggah gambar' : ''))));

const blokWaktu = (baris) => buat('ol', { class: 'e-waktu' }, baris.map((b) => {
  const [tgl, teks] = kolom(b);
  return buat('li', {}, buat('b', {}, tgl), teks ? buat('span', {}, ...sebaris(teks)) : null);
}));

const SOROT = { catatan: ['Catatan', 'buku'], tips: ['Tips', 'lampu'], peringatan: ['Hati-hati', 'perisai'] };
function blokSorot(jenis, baris) {
  if (jenis === 'kutipan') return buat('blockquote', { class: 'e-kutipan' }, buat('p', {}, ...sebaris(baris.join(' '))));
  const [label, ik] = SOROT[jenis];
  return buat('aside', { class: `e-sorot ${jenis}` }, buat('span', { class: 'e-sorot-label' }, ikon(ik, 16), label),
    ...renderMarkdown(baris.join('\n')));
}

// ---------------------------------------------------------------- markdown
const sahGambar = (src) => /^(\/(?!\/)|https:\/\/)[^\s"'<>]+$/.test(src);
function renderMarkdown(teks) {
  const keping = String(teks ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return keping.flatMap((b) => {
    const baris = b.split('\n').map((x) => x.trim()).filter(Boolean);
    if (baris.every((x) => /^!\[[^\]]*\]\([^)]+\)$/.test(x))) {
      const gambar = baris.map((x) => x.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)).filter((m) => sahGambar(m[2]));
      return [buat('div', { class: 'e-galeri' + (gambar.length > 1 ? ' banyak' : '') }, gambar.map((m) => buat('figure', {},
        buat('img', { src: m[2], alt: m[1], loading: 'lazy', draggable: 'false' }), m[1] ? buat('figcaption', {}, m[1]) : null)))];
    }
    if (baris.every((x) => /^\|.*\|$/.test(x)) && baris.length >= 2) {
      const sel = (x) => x.slice(1, -1).split('|').map((c) => c.trim());
      const isi = baris.filter((x) => !/^\|[\s:|-]+\|$/.test(x)).map(sel);
      const [kepala, ...badan] = isi;
      return [buat('div', { class: 'e-tabel' }, buat('table', {}, buat('thead', {}, buat('tr', {}, kepala.map((c) => buat('th', {}, ...sebaris(c))))),
        buat('tbody', {}, badan.map((r) => buat('tr', {}, r.map((c) => buat('td', {}, ...sebaris(c))))))))];
    }
    if (baris.every((x) => /^>\s?/.test(x))) return [buat('blockquote', { class: 'e-kutipan' }, buat('p', {}, ...sebaris(baris.map((x) => x.replace(/^>\s?/, '')).join(' '))))];
    if (/^###\s+/.test(baris[0])) return [buat('h3', {}, ...sebaris(baris[0].replace(/^###\s+/, ''))), ...renderMarkdown(baris.slice(1).join('\n'))];
    if (/^##\s+/.test(baris[0])) return [buat('h2', {}, ...sebaris(baris[0].replace(/^##\s+/, ''))), ...renderMarkdown(baris.slice(1).join('\n'))];
    if (baris.every((x) => /^[-*•]\s+/.test(x))) return [buat('ul', {}, baris.map((x) => buat('li', {}, ...sebaris(x.replace(/^[-*•]\s+/, '')))))];
    if (baris.every((x) => /^\d+[.)]\s+/.test(x))) return [buat('ol', {}, baris.map((x) => buat('li', {}, ...sebaris(x.replace(/^\d+[.)]\s+/, '')))))];
    return [buat('p', {}, ...sebaris(baris.join(' ')))];
  });
}

/**
 * Isi bab → elemen. opsi: { progres, simpanCek(kunci, daftarIndex) }
 */
export function renderIsi(teks, opsi = {}) {
  const baris = String(teks ?? '').replace(/\r\n?/g, '\n').split('\n');
  const hasil = [];
  let md = [];
  const tutupMd = () => { if (md.length) hasil.push(...renderMarkdown(md.join('\n'))); md = []; };
  for (let i = 0; i < baris.length; i++) {
    const m = baris[i].trim().match(/^:::([a-z-]+)\s*(.*)$/);
    if (!m) { md.push(baris[i]); continue; }
    tutupMd();
    const nama = m[1];
    const p = Object.fromEntries([...m[2].matchAll(/([a-z]+)=("[^"]*"|\S+)/g)].map(([, k, v]) => [k, v.replace(/^"|"$/g, '')]));
    const isi = [];
    for (i += 1; i < baris.length && baris[i].trim() !== ':::'; i++) if (baris[i].trim()) isi.push(baris[i].trim());
    try {
      const blok = {
        alur: () => blokAlur(isi, p), langkah: () => blokLangkah(isi), sop: () => blokCentang(isi, p, opsi, true),
        checklist: () => blokCentang(isi, p, opsi, false), 'hitung-hpp': () => blokHitungHpp(p), strategi: () => blokStrategi(isi),
        simulasi: () => blokSimulasi(p), kartu: () => blokKartu(isi), poster: () => blokPoster(isi), form: () => blokForm(isi),
        'garis-waktu': () => blokWaktu(isi), catatan: () => blokSorot('catatan', isi), tips: () => blokSorot('tips', isi),
        peringatan: () => blokSorot('peringatan', isi), kutipan: () => blokSorot('kutipan', isi),
      }[nama];
      hasil.push(blok ? blok() : buat('div', { class: 'e-sorot peringatan' }, `Blok ":::${nama}" tidak dikenal`));
    } catch (err) {
      hasil.push(buat('div', { class: 'e-sorot peringatan' }, `Blok ":::${nama}" tidak bisa ditampilkan: ${err.message}`));
    }
  }
  tutupMd();
  return hasil;
}
