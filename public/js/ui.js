// Komponen tampilan yang dipakai ulang semua halaman publik.

export const rp = (n) => (n == null ? '–' : 'Rp' + Number(n).toLocaleString('id-ID'));

/** Membuat elemen dengan aman: teks selalu dimasukkan sebagai teks, bukan HTML. */
export function el(tag, attrs = {}, ...anak) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const a of anak.flat()) if (a != null && a !== false) e.append(a instanceof Node ? a : document.createTextNode(String(a)));
  return e;
}

const HALAMAN = [
  { href: '/', label: 'Beranda' },
  { href: '/katalog/', label: 'Katalog' },
];

/** Pasang header & footer ke elemen #kepala dan #kaki. */
export function pasangKerangka(aktif) {
  const kepala = document.getElementById('kepala');
  if (kepala) {
    kepala.replaceChildren(el('div', { class: 'wadah' },
      el('a', { class: 'merek', href: '/', 'aria-label': 'IXVII.CO, ke beranda' },
        el('img', { src: '/assets/brand/emblem-putih.png', alt: '', width: 274, height: 183 }),
        el('span', {}, 'IXVII.CO')),
      el('nav', { class: 'nav', 'aria-label': 'Menu utama' },
        HALAMAN.map((h) => el('a', { href: h.href, 'aria-current': h.href === aktif ? 'page' : null }, h.label)))));
  }
  const kaki = document.getElementById('kaki');
  if (kaki) {
    kaki.replaceChildren(el('div', { class: 'wadah' },
      el('span', {}, `© ${new Date().getFullYear()} IXVII.CO · Your App Solver`),
      el('span', {}, 'Harga dan stok diperbarui langsung dari katalog kami.')));
  }
}

/** Ikon aplikasi: logo kalau ada, kalau belum ada pakai inisial. */
export function ikonApp(app, besar = false) {
  const kelas = 'ikon-app' + (besar ? ' besar' : '');
  if (app.logo) return el('div', { class: kelas }, el('img', { src: app.logo, alt: '', loading: 'lazy' }));
  const kata = app.nama.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
  const inisial = (kata.length > 1 ? kata[0][0] + kata[1][0] : kata[0].slice(0, 2)).toUpperCase();
  return el('div', { class: kelas, 'aria-hidden': 'true' }, inisial);
}

/** Kartu aplikasi untuk grid beranda & katalog. */
export function kartuApp(app) {
  const tipe = [...new Set(app.tipe)].slice(0, 3);
  return el('a', { class: 'kartu-app kaca kartu-3d', href: `/aplikasi/?app=${encodeURIComponent(app.slug)}` },
    el('div', { class: 'atas' }, ikonApp(app),
      el('div', {}, el('h3', {}, app.nama), el('div', { class: 'kat' }, app.kategori))),
    el('p', {}, app.desc),
    el('div', { class: 'tipe' }, tipe.map((t) => el('span', { class: 'lencana' }, t))),
    el('div', { class: 'bawah' },
      app.habisSemua
        ? el('span', { class: 'lencana habis' }, 'Stok habis')
        : el('div', { class: 'harga-mulai' }, el('small', {}, 'mulai'), el('b', {}, rp(app.hargaMulai))),
      el('span', { class: 'lencana' }, `${app.varian.length} paket`)));
}

export function kerangkaMemuat(jumlah = 6) {
  return Array.from({ length: jumlah }, () => el('div', { class: 'memuat', 'aria-hidden': 'true' }));
}

export function pesanGagal(teks, ulang) {
  return el('div', { class: 'kosong kaca' },
    el('p', {}, teks),
    el('button', { class: 'tombol garis', type: 'button', onclick: ulang }, 'Coba lagi'));
}

/** Efek miring 3D halus saat kursor di atas kartu (mati di layar sentuh & saat pengguna minta gerak dikurangi). */
export function pasangTilt(root = document) {
  const boleh = matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!boleh) return;
  root.addEventListener('pointermove', (e) => {
    const k = e.target.closest?.('.kartu-3d');
    if (!k) return;
    const r = k.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    k.style.transform = `perspective(800px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-2px)`;
  });
  root.addEventListener('pointerout', (e) => {
    const k = e.target.closest?.('.kartu-3d');
    if (k && !k.contains(e.relatedTarget)) k.style.transform = '';
  });
}
