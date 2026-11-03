// Ebook Panduan Reseller: masuk dengan email + password (akses disetujui admin), isi diambil dari database setelah masuk.
// Tidak ada tombol unduh; salin, klik kanan, cetak, dan simpan halaman dimatikan; tiap halaman diberi tanda air pembacanya.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { ikon, renderIsi } from './ebook-render.js';

const akar = document.getElementById('ebook');
// buku yang dibuka: ?b=slug di /ebook/, atau bawaan halaman (mis. /reseller/ebook/ → panduan-reseller)
const BUKU_HALAMAN = document.body.dataset.buku || null;
let buku = new URLSearchParams(location.search).get('b') || BUKU_HALAMAN;
const K_SESI = 'ixvii-ebook-sesi';
const K_PERANGKAT = 'ixvii-ebook-perangkat';
const K_TEMA = 'ixvii-tema';

const baca = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const tulis = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* mode privat */ } };

const el = (tag, attrs = {}, ...anak) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'value') e.value = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const a of anak.flat()) if (a != null && a !== false) e.append(a instanceof Node ? a : document.createTextNode(String(a)));
  return e;
};

function idPerangkat() {
  let id = baca(K_PERANGKAT);
  if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
    id = 'eb-' + (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join(''));
    tulis(K_PERANGKAT, id);
  }
  return id;
}

async function rpc(nama, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nama}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message?.replace(/^.*?ERROR:\s*/, '') || `Gagal (${res.status})`);
  return data;
}

// ---------------------------------------------------------------- tema
function tombolTema() {
  const b = el('button', { type: 'button', class: 'eb-ikon-tombol', 'aria-label': 'Ganti tema terang/gelap' });
  const gambar = () => b.replaceChildren(el('span', { 'aria-hidden': 'true' }, document.documentElement.dataset.tema === 'terang' ? '☾' : '☀'));
  b.addEventListener('click', () => {
    const terang = document.documentElement.dataset.tema !== 'terang';
    if (terang) document.documentElement.dataset.tema = 'terang'; else delete document.documentElement.dataset.tema;
    tulis(K_TEMA, terang ? 'terang' : 'gelap');
    gambar();
  });
  gambar();
  return b;
}
const logo = () => el('picture', { class: 'eb-logo' },
  el('img', { class: 'hanya-gelap', src: '/assets/brand/logo-putih.png', alt: 'IXVII.CO', draggable: 'false' }),
  el('img', { class: 'hanya-terang', src: '/assets/brand/logo-maroon.png', alt: 'IXVII.CO', draggable: 'false' }));

// ---------------------------------------------------------------- perlindungan isi
let pasangSekali = false;
function pasangPerlindungan() {
  if (pasangSekali) return;
  pasangSekali = true;
  const diIsian = (t) => t instanceof Element && t.closest('input, textarea, select');
  const tegur = () => {
    document.querySelector('.eb-tegur')?.remove();
    const t = el('div', { class: 'eb-tegur', role: 'status' }, 'Isi ebook ini dilindungi dan tidak bisa disalin, dicetak, atau diunduh.');
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
  };
  for (const ev of ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart']) {
    document.addEventListener(ev, (e) => { if (!diIsian(e.target) && document.body.classList.contains('eb-terbuka')) { e.preventDefault(); if (ev !== 'selectstart' && ev !== 'dragstart') tegur(); } });
  }
  document.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('eb-terbuka')) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 's', 'p', 'u', 'a'].includes(k) && !diIsian(e.target)) { e.preventDefault(); tegur(); }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c', 's'].includes(k)) e.preventDefault();
    if (e.key === 'PrintScreen') { samarkan(true); tegur(); setTimeout(() => samarkan(false), 1500); }
  });
  window.addEventListener('beforeprint', () => document.body.classList.add('eb-cetak'));
  window.addEventListener('afterprint', () => document.body.classList.remove('eb-cetak'));
  // isi disamarkan saat pindah aplikasi/tab (pratinjau di pengalih aplikasi ikut tersamar)
  document.addEventListener('visibilitychange', () => samarkan(document.hidden));
  window.addEventListener('blur', () => samarkan(true));
  window.addEventListener('focus', () => samarkan(false));
}
const samarkan = (ya) => document.body.classList.toggle('eb-samar', ya && document.body.classList.contains('eb-terbuka'));

function tandaAir(p) {
  const aman = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const teks = aman(`${p.nama} · ${p.email} · ID ${p.id}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="240"><text x="20" y="150" transform="rotate(-22 230 120)" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="600" fill="#888" fill-opacity="0.16">${teks}</text></svg>`;
  return el('div', { class: 'eb-tanda-air', 'aria-hidden': 'true', style: `background-image:url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")` });
}

// ---------------------------------------------------------------- layar masuk & minta akses
function layarMasuk(pesan) {
  document.body.classList.remove('eb-terbuka');
  let mode = 'masuk';
  const kotak = el('div', { class: 'eb-form-isi' });
  const tab = el('div', { class: 'eb-tab', role: 'tablist' });
  const gambar = () => {
    tab.hidden = BUKU_HALAMAN !== 'panduan-reseller';
    tab.replaceChildren(...[['masuk', 'Masuk'], ['minta', 'Minta akses']].map(([k, l]) =>
      el('button', { type: 'button', role: 'tab', 'aria-selected': String(mode === k), onclick: () => { mode = k; gambar(); } }, l)));
    kotak.replaceChildren(mode === 'masuk' ? formMasuk() : formMinta());
  };
  const galat = (teks, ok = false) => el('div', { class: 'eb-pesan' + (ok ? ' ok' : ''), role: ok ? 'status' : 'alert' }, teks);

  function formMasuk() {
    const email = el('input', { type: 'email', name: 'email', autocomplete: 'email', required: true, placeholder: 'email@kamu.com' });
    const sandi = el('input', { type: 'password', name: 'password', autocomplete: 'current-password', required: true, minlength: 8 });
    const info = el('div', {}, pesan ? galat(pesan) : null);
    const kirim = el('button', { type: 'submit', class: 'eb-tombol' }, 'Masuk & baca');
    const f = el('form', { class: 'eb-form', novalidate: true },
      el('label', {}, 'Email', email), el('label', {}, 'Password', sandi), info, kirim,
      el('p', { class: 'eb-kecil' }, 'Password dikirim lewat WhatsApp/email setelah pembayaranmu dikonfirmasi. Lupa password atau ganti HP? Hubungi admin IXVII.CO, nanti dibantu reset.'),
      BUKU_HALAMAN !== 'panduan-reseller' ? el('p', { class: 'eb-kecil' }, 'Belum punya ebook? ', el('a', { href: '/produk/?k=ebook' }, 'Lihat koleksi ebook IXVII.CO')) : null);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!email.value.trim() || !sandi.value) return info.replaceChildren(galat('Isi email dan password.'));
      kirim.disabled = true; kirim.textContent = 'Memeriksa…';
      try {
        const r = await rpc('ebook_masuk', { p_email: email.value.trim(), p_sandi: sandi.value, p_perangkat: idPerangkat() });
        if (r.galat) throw new Error(r.galat);
        tulis(K_SESI, r.token);
        await buka();
      } catch (err) { info.replaceChildren(galat(err.message)); kirim.disabled = false; kirim.textContent = 'Masuk & baca'; }
    });
    return f;
  }

  function formMinta() {
    const nama = el('input', { type: 'text', name: 'name', autocomplete: 'name', required: true, maxlength: 60 });
    const email = el('input', { type: 'email', name: 'email', autocomplete: 'email', required: true, placeholder: 'email@kamu.com' });
    const wa = el('input', { type: 'tel', name: 'tel', autocomplete: 'tel', inputmode: 'tel', required: true, placeholder: '08xxxxxxxxxx' });
    const sandi = el('input', { type: 'password', autocomplete: 'new-password', required: true, minlength: 8 });
    const ulang = el('input', { type: 'password', autocomplete: 'new-password', required: true, minlength: 8 });
    const setuju = el('input', { type: 'checkbox', id: 'ebSetuju' });
    const info = el('div');
    const kirim = el('button', { type: 'submit', class: 'eb-tombol' }, 'Kirim permintaan');
    const f = el('form', { class: 'eb-form', novalidate: true },
      el('label', {}, 'Nama', nama), el('label', {}, 'Email', email), el('label', {}, 'Nomor WhatsApp', wa),
      el('div', { class: 'eb-dua' }, el('label', {}, 'Buat password', sandi), el('label', {}, 'Ulangi password', ulang)),
      el('div', { class: 'eb-setuju' }, setuju, el('label', { for: 'ebSetuju' }, 'Ebook ini untuk saya pribadi. Saya tidak akan menyebarkan, membagikan akun, atau menjual kembali isinya.')),
      info, kirim);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (nama.value.trim().length < 2) return info.replaceChildren(galat('Isi nama kamu.'));
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) return info.replaceChildren(galat('Email tidak valid.'));
      if (wa.value.replace(/\D/g, '').length < 9) return info.replaceChildren(galat('Nomor WhatsApp tidak valid.'));
      if (sandi.value.length < 8) return info.replaceChildren(galat('Password minimal 8 karakter.'));
      if (sandi.value !== ulang.value) return info.replaceChildren(galat('Password dan ulangannya tidak sama.'));
      if (!setuju.checked) return info.replaceChildren(galat('Centang persetujuan dulu ya.'));
      kirim.disabled = true; kirim.textContent = 'Mengirim…';
      try {
        await rpc('ebook_minta_akses', { p_nama: nama.value.trim(), p_email: email.value.trim(), p_wa: wa.value, p_sandi: sandi.value });
        kotak.replaceChildren(el('div', { class: 'eb-terkirim' },
          el('div', { class: 'eb-terkirim-ikon' }, ikon('centang', 30)),
          el('h2', {}, 'Permintaan terkirim'),
          el('p', {}, 'Admin IXVII.CO akan memeriksa pembelian program reseller kamu. Setelah disetujui, kamu dikabari lewat WhatsApp, lalu bisa masuk dengan email dan password yang baru kamu buat.'),
          el('button', { type: 'button', class: 'eb-tombol garis', onclick: () => { mode = 'masuk'; gambar(); } }, 'Ke halaman masuk')));
      } catch (err) { info.replaceChildren(galat(err.message)); kirim.disabled = false; kirim.textContent = 'Kirim permintaan'; }
    });
    return f;
  }

  gambar();
  akar.replaceChildren(el('main', { class: 'eb-masuk' },
    el('div', { class: 'eb-masuk-atas' }, logo(), tombolTema()),
    el('section', { class: 'eb-masuk-kartu' },
      BUKU_HALAMAN === 'panduan-reseller' ? el('div', { class: 'eb-masuk-sampul' },
        el('span', { class: 'eb-label' }, 'Khusus member program reseller'),
        el('h1', {}, 'Ebook Panduan Reseller'),
        el('p', {}, 'Mulai dari nol, bangun sistem jualan, dan dapatkan pembeli pertama. Lengkap dengan kalkulator HPP, simulasi untung, checklist, dan SOP jualan.'),
        el('ul', { class: 'eb-ciri' }, ['18 bab bergambar & interaktif', 'Progres checklist tersimpan', 'Dibuka di maksimal 2 perangkat'].map((x) => el('li', {}, x))))
      : el('div', { class: 'eb-masuk-sampul' },
        el('span', { class: 'eb-label' }, 'Rak ebook IXVII.CO'),
        el('h1', {}, 'Masuk ke rak ebookmu'),
        el('p', {}, 'Semua ebook yang kamu beli di IXVII.CO ada di satu rak. Interaktif, bergambar, dan progres bacamu tersimpan.'),
        el('ul', { class: 'eb-ciri' }, ['Kalkulator, kuis, dan checklist di dalam bab', 'Bisa dibuka di HP dan laptop', 'Tidak bisa diunduh atau dibagikan'].map((x) => el('li', {}, x)))),
      el('div', { class: 'eb-masuk-form' }, tab, kotak))));
}

// ---------------------------------------------------------------- pembaca
let data = null;
let progres = {};
let jedaSimpan;
function simpanProgres() {
  clearTimeout(jedaSimpan);
  jedaSimpan = setTimeout(() => {
    rpc('ebook_simpan_progres', { p_token: baca(K_SESI), p_perangkat: idPerangkat(), p_data: progres, p_buku: data?.info?.slug }).catch((err) => {
      if (/Sesi berakhir|tidak aktif/.test(err.message)) { tulis(K_SESI, null); layarMasuk(err.message); }
    });
  }, 1200);
}

async function buka() {
  const token = baca(K_SESI);
  if (!token) return layarMasuk();
  akar.replaceChildren(el('p', { class: 'eb-memuat' }, 'Membuka ebook…'));
  try {
    data = await rpc('ebook_isi', { p_token: token, p_perangkat: idPerangkat(), p_buku: buku });
  } catch (err) {
    if (/Sesi berakhir|tidak aktif/.test(err.message)) { tulis(K_SESI, null); return layarMasuk(err.message); }
    if (/belum ada di rakmu/.test(err.message) && buku) { buku = null; history.replaceState(null, '', '/ebook/'); return buka().then(() => tegurRak(err.message)); }
    akar.replaceChildren(el('div', { class: 'eb-masuk' }, el('div', { class: 'eb-pesan' }, err.message),
      el('button', { type: 'button', class: 'eb-tombol', onclick: buka }, 'Coba lagi')));
    return;
  }
  pasangPerlindungan();
  document.body.classList.add('eb-terbuka');
  if (!data.info) return gambarRak();
  progres = { dibaca: [], cek: {}, ...(data.progres || {}) };
  if (data.info.warna) document.documentElement.style.setProperty('--buku', data.info.warna);
  gambarPembaca();
}
const tegurRak = (teks) => { const t = el('div', { class: 'eb-tegur', role: 'status' }, teks); document.body.append(t); setTimeout(() => t.remove(), 3500); };

// ---------------------------------------------------------------- rak ebook
function gambarRak() {
  const p = data.pembaca;
  window.onhashchange = null;
  const menuAkun = el('details', { class: 'eb-akun' },
    el('summary', { 'aria-label': 'Akun' }, el('span', { class: 'eb-avatar' }, p.nama.trim().charAt(0).toUpperCase())),
    el('div', { class: 'eb-akun-isi' }, el('b', {}, p.nama), el('small', {}, p.email),
      el('button', { type: 'button', class: 'eb-tombol garis kecil', onclick: gantiSandi }, 'Ganti password'),
      el('button', { type: 'button', class: 'eb-tombol garis kecil', onclick: keluar }, 'Keluar')));
  const kartu = (b) => {
    const pct = b.bab ? Math.round((Math.min(b.dibaca, b.bab) / b.bab) * 100) : 0;
    return el('a', { class: 'eb-rak-buku', href: `/ebook/?b=${encodeURIComponent(b.slug)}`, style: b.warna ? `--buku:${b.warna}` : null },
      b.sampul ? el('img', { src: b.sampul, alt: '', draggable: 'false', loading: 'lazy' }) : el('span', { class: 'eb-rak-sampul' }, b.judul),
      el('div', { class: 'eb-rak-isi' },
        el('b', {}, b.judul), b.subjudul ? el('small', {}, b.subjudul) : null,
        el('span', { class: 'eb-bar lebar' }, el('i', { style: `width:${pct}%` })),
        el('span', { class: 'eb-rak-progres' }, pct >= 100 ? 'Selesai dibaca ✓' : b.dibaca ? `${b.dibaca}/${b.bab} bab dibaca` : `${b.bab} bab · belum dibaca`),
        el('span', { class: 'eb-tombol kecil' }, b.dibaca ? 'Lanjut baca' : 'Mulai baca')));
  };
  akar.replaceChildren(
    el('header', { class: 'eb-kepala' }, el('a', { href: '/ebook/', class: 'eb-kepala-judul' }, logo(), el('span', {}, 'Rak ebook')), tombolTema(), menuAkun),
    el('main', { class: 'eb-utama' }, el('div', { class: 'eb-isi' },
      el('header', { class: 'eb-rak-kepala' }, el('span', { class: 'eb-label' }, `Halo, ${p.nama.split(' ')[0]}`), el('h1', {}, 'Rak ebookmu'),
        el('p', {}, data.rak.length ? `${data.rak.length} ebook siap dibaca. Progres dan checklist tersimpan di akunmu.` : 'Belum ada ebook di rakmu.')),
      data.rak.length ? el('div', { class: 'eb-rak' }, data.rak.map(kartu))
        : el('div', { class: 'eb-pesan ok' }, 'Ebook yang kamu beli akan muncul di sini setelah pembayaran dikonfirmasi.'),
      el('div', { class: 'eb-cara' }, el('h2', {}, 'Cari ebook lain'), el('p', { style: 'margin:0' }, 'Koleksi ebook tentang personal branding, freelance, desain, editing, AI, dan jualan online. ',
        el('a', { href: '/produk/?k=ebook' }, 'Lihat semua di Produk Digital →'))))),
    tandaAir(p));
}

function gambarPembaca() {
  const bab = data.bab;
  const p = data.pembaca;
  const isi = el('article', { class: 'eb-isi', tabindex: '-1' });
  const daftar = el('nav', { class: 'eb-daftar', 'aria-label': 'Daftar isi' });
  const latar = el('div', { class: 'eb-latar', onclick: () => tutupDaftar() });
  const bar = el('i');
  const persenDibaca = el('span');
  const tutupDaftar = () => document.body.classList.remove('eb-daftar-buka');

  const gambarDaftar = (aktif) => {
    daftar.replaceChildren(
      el('div', { class: 'eb-daftar-kepala' }, el('b', {}, 'Daftar isi'), el('button', { type: 'button', class: 'eb-ikon-tombol eb-hp', 'aria-label': 'Tutup daftar isi', onclick: tutupDaftar }, '×')),
      el('a', { href: '#sampul', class: 'eb-daftar-item' + (aktif === 'sampul' ? ' aktif' : '') }, el('span', { class: 'eb-daftar-label' }, '★'), el('span', {}, 'Sampul & cara memakai')),
      ...bab.map((b) => el('a', { href: `#${b.slug}`, class: 'eb-daftar-item' + (aktif === b.slug ? ' aktif' : '') + (progres.dibaca?.includes(b.slug) ? ' selesai' : '') },
        el('span', { class: 'eb-daftar-label' }, b.label), el('span', {}, b.judul))));
    const n = bab.filter((b) => progres.dibaca?.includes(b.slug)).length;
    bar.style.width = `${bab.length ? Math.round((n / bab.length) * 100) : 0}%`;
    persenDibaca.textContent = `${n}/${bab.length} bab`;
  };

  const sampul = () => [
    el('header', { class: 'eb-sampul' + (data.info.sampul ? ' bergambar' : ''), style: data.info.warna ? `--buku:${data.info.warna}` : null },
      data.info.sampul ? el('img', { class: 'eb-sampul-gambar', src: data.info.sampul, alt: '', draggable: 'false' }) : null,
      el('span', { class: 'eb-label' }, data.info.label),
      el('h1', {}, data.info.judul),
      el('p', { class: 'eb-sampul-sub' }, data.info.subjudul),
      el('div', { class: 'eb-sampul-milik' }, 'Lisensi pribadi untuk ', el('b', {}, p.nama), ` (${p.email})`)),
    el('section', { class: 'eb-cara' },
      el('h2', {}, 'Cara memakai ebook ini'),
      el('ul', {},
        el('li', {}, 'Baca berurutan dari Bab 01, atau lompat lewat daftar isi.'),
        el('li', {}, 'Angka di kalkulator dan simulasi bisa kamu ubah sendiri.'),
        el('li', {}, 'Checklist dan SOP yang kamu centang tersimpan di akunmu.'),
        el('li', {}, 'Ebook ini bisa dibuka di maksimal 2 perangkat. Tidak bisa diunduh, dicetak, atau disalin.'))),
    el('div', { class: 'eb-bab-grid' }, bab.map((b) => el('a', { href: `#${b.slug}`, class: 'eb-bab-kartu' + (progres.dibaca?.includes(b.slug) ? ' selesai' : '') },
      el('span', { class: 'eb-bab-ikon' }, ikon(b.ikon, 22)), el('span', { class: 'eb-bab-no' }, b.label), el('b', {}, b.judul), b.ringkas ? el('small', {}, b.ringkas) : null))),
    el('div', { class: 'eb-navigasi' }, el('span'), bab[0] ? el('a', { class: 'eb-tombol', href: `#${progres.bab && bab.some((b) => b.slug === progres.bab) ? progres.bab : bab[0].slug}` },
      progres.bab ? 'Lanjut membaca →' : 'Mulai membaca →') : null),
  ];

  function tampil() {
    const slug = decodeURIComponent(location.hash.slice(1)) || 'sampul';
    const i = bab.findIndex((b) => b.slug === slug);
    gambarDaftar(i < 0 ? 'sampul' : slug);
    tutupDaftar();
    if (i < 0) {
      isi.replaceChildren(...sampul());
    } else {
      const b = bab[i];
      const sebelum = bab[i - 1], sesudah = bab[i + 1];
      const kaki = el('footer', { class: 'eb-kaki-bab' },
        el('p', { class: 'eb-lisensi' }, `Lisensi pribadi untuk ${p.nama} (${p.email}). Dilarang menyebarkan, membagikan akun, atau menjual kembali isi ebook ini. © IXVII.CO`),
        el('div', { class: 'eb-navigasi' },
          sebelum ? el('a', { class: 'eb-tombol garis', href: `#${sebelum.slug}` }, '← ', sebelum.label) : el('a', { class: 'eb-tombol garis', href: '#sampul' }, '← Sampul'),
          sesudah ? el('a', { class: 'eb-tombol', href: `#${sesudah.slug}` }, `${sesudah.label} · ${sesudah.judul} →`) : el('a', { class: 'eb-tombol', href: '#sampul' }, 'Selesai ✓')));
      isi.replaceChildren(
        el('header', { class: 'eb-bab-kepala' },
          el('div', { class: 'eb-bab-no-besar', 'aria-hidden': 'true' }, b.label),
          el('span', { class: 'eb-bab-ikon besar' }, ikon(b.ikon, 30)),
          el('div', {}, el('span', { class: 'eb-label' }, /^\d+$/.test(b.label) ? `Bab ${b.label}` : b.label), el('h1', {}, b.judul), b.ringkas ? el('p', {}, b.ringkas) : null)),
        el('div', { class: 'eb-teks' }, renderIsi(b.isi, {
          progres,
          simpanCek: (kunci, daftarCek) => { progres.cek = { ...(progres.cek || {}), [kunci]: daftarCek }; simpanProgres(); },
        })),
        kaki);
      progres.bab = b.slug;
      // bab dianggap selesai dibaca kalau bagian bawahnya sudah terlihat
      new IntersectionObserver((entri, o) => {
        if (entri.some((x) => x.isIntersecting)) {
          o.disconnect();
          if (!progres.dibaca.includes(b.slug)) { progres.dibaca = [...progres.dibaca, b.slug]; gambarDaftar(b.slug); }
          simpanProgres();
        }
      }).observe(kaki);
      simpanProgres();
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    isi.focus({ preventScroll: true });
  }

  const tombolDaftar = el('button', { type: 'button', class: 'eb-ikon-tombol', 'aria-label': 'Buka daftar isi', onclick: () => document.body.classList.add('eb-daftar-buka') }, '☰');
  const menuAkun = el('details', { class: 'eb-akun' },
    el('summary', { 'aria-label': 'Akun' }, el('span', { class: 'eb-avatar' }, p.nama.trim().charAt(0).toUpperCase())),
    el('div', { class: 'eb-akun-isi' },
      el('b', {}, p.nama), el('small', {}, p.email),
      el('button', { type: 'button', class: 'eb-tombol garis kecil', onclick: gantiSandi }, 'Ganti password'),
      el('button', { type: 'button', class: 'eb-tombol garis kecil', onclick: keluar }, 'Keluar')));

  akar.replaceChildren(
    el('header', { class: 'eb-kepala' },
      tombolDaftar, el('a', { href: '#sampul', class: 'eb-kepala-judul' }, logo(), el('span', {}, data.info.judul)),
      data.rak?.length > 1 || !BUKU_HALAMAN ? el('a', { href: '/ebook/', class: 'eb-tombol garis kecil eb-ke-rak' }, 'Rak') : null,
      el('div', { class: 'eb-progres', title: 'Bab yang sudah dibaca' }, el('span', { class: 'eb-bar' }, bar), persenDibaca),
      tombolTema(), menuAkun),
    el('div', { class: 'eb-tata' }, daftar, latar, el('main', { class: 'eb-utama' }, isi)),
    tandaAir(p));
  window.onhashchange = tampil;
  tampil();
  if (!panahTerpasang) {
    panahTerpasang = true;
    document.addEventListener('keydown', (e) => {
      if (!data?.bab || (e.target instanceof Element && e.target.closest('input, textarea'))) return;
      const daftarBab = data.bab;
      const i = daftarBab.findIndex((b) => b.slug === location.hash.slice(1));
      if (e.key === 'ArrowRight' && daftarBab[i + 1]) location.hash = daftarBab[i + 1].slug;
      if (e.key === 'ArrowLeft' && i >= 0) location.hash = i > 0 ? daftarBab[i - 1].slug : 'sampul';
    });
  }
}
let panahTerpasang = false;

async function keluar() {
  const token = baca(K_SESI);
  tulis(K_SESI, null);
  try { await rpc('ebook_keluar', { p_token: token }); } catch { /* tetap keluar */ }
  location.hash = '';
  layarMasuk('Kamu sudah keluar.');
}

function gantiSandi() {
  const lama = el('input', { type: 'password', autocomplete: 'current-password' });
  const baru = el('input', { type: 'password', autocomplete: 'new-password', minlength: 8 });
  const info = el('div');
  const d = el('dialog', { class: 'eb-dialog' });
  const f = el('form', { class: 'eb-form', method: 'dialog' },
    el('h2', {}, 'Ganti password'), el('label', {}, 'Password lama', lama), el('label', {}, 'Password baru (min. 8)', baru), info,
    el('div', { class: 'eb-navigasi' }, el('button', { type: 'button', class: 'eb-tombol garis', onclick: () => d.close() }, 'Batal'),
      el('button', { type: 'submit', class: 'eb-tombol' }, 'Simpan')));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await rpc('ebook_ganti_sandi', { p_token: baca(K_SESI), p_perangkat: idPerangkat(), p_lama: lama.value, p_baru: baru.value });
      info.replaceChildren(el('div', { class: 'eb-pesan ok' }, 'Password diganti. Perangkat lain perlu masuk ulang.'));
      setTimeout(() => d.close(), 1400);
    } catch (err) { info.replaceChildren(el('div', { class: 'eb-pesan' }, err.message)); }
  });
  d.append(f);
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
}

buka();
