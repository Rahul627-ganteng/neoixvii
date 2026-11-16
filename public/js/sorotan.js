// Headline beranda: kabar terkini yang berganti otomatis (promo, bundle andalan, kupon, top pick, member, ajak teman,
// affiliate, reseller, film, artikel, dan headline manual dari panel). Urutan & teks diatur di panel → Headline beranda.
import { hitungMundur, promoBerjalan } from './gabung.js';
import { harga, inggris, persen, rupiah, t, tanggal } from './i18n.js';
import { urlBerita } from './blog-kartu.js';
import { el, ikonApp, urlApp } from './ui.js';

const JEDA = 6500;
const pilih = (id, en) => (inggris() && en ? en : id);
const akhirHari = (ymd) => `${ymd}T23:59:59+07:00`;
const hariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
const pc = (n) => persen(Number(n) / 100);
const potongan = (jenis, nilai, maks) => (jenis === 'persen' ? `${Number(nilai)}%` : rupiah(nilai)) + (jenis === 'persen' && maks ? ` (${t('lg.maks', { rp: rupiah(maks) })})` : '');

// ---------------------------------------------------------------- gambar di sisi kanan slide
const visAngka = (besar, kecil) => el('div', { class: 'vis-angka' + (String(besar).length > 5 ? ' panjang' : ''), 'aria-hidden': 'true' },
  el('b', {}, besar), kecil ? el('small', {}, kecil) : null);
const visGambar = (src, kelas = '') => el('div', { class: 'vis-gambar ' + kelas }, el('img', { src, alt: '', loading: 'lazy', decoding: 'async' }));
// ikon aplikasi bertumpuk miring (posisi x, y, putaran untuk 1–4 ikon)
const TUMPUK = [[[0, 0, -6]], [[-34, -14, -8], [34, 14, 7]], [[-50, -26, -9], [44, -6, 8], [-4, 40, -2]], [[-52, -30, -9], [46, -30, 8], [-40, 38, 5], [50, 36, -6]]];
function visLogo(apps) {
  const isi = apps.slice(0, 4);
  const pos = TUMPUK[isi.length - 1] ?? TUMPUK[0];
  return el('div', { class: 'vis-logo', 'aria-hidden': 'true' }, isi.map((a, i) => el('span', {
    style: `transform:translate(-50%,-50%) translate(${pos[i][0]}px,${pos[i][1]}px) rotate(${pos[i][2]}deg);z-index:${10 - i}`,
  }, ikonApp(a, true))));
}
function visTiket(kode, teks) {
  return el('div', { class: 'vis-tiket', 'aria-hidden': 'true' }, el('small', {}, t('sr.kodeKupon')), el('b', {}, kode), el('span', {}, teks));
}

// ---------------------------------------------------------------- isi tiap jenis headline
// Hasil: satu objek slide, beberapa (kupon), atau null kalau datanya kosong.
function susun(s, x) {
  const ganti = (o) => o && ({
    ...o,
    label: s.label || o.label,
    judul: pilih(s.judul, s.judul_en) || o.judul,
    teks: pilih(s.teks, s.teks_en) || o.teks,
    tombol: s.tautan || s.tombol ? [{ teks: pilih(s.tombol, s.tombol_en) || o.tombol?.[0]?.teks || t('sr.lihat'), href: s.tautan || o.tombol?.[0]?.href || '/' }, ...(o.tombol?.slice(1) ?? [])] : o.tombol,
    visual: s.gambar ? visGambar(s.gambar) : o.visual,
  });
  switch (s.jenis) {
    case 'promo': {
      const daftar = (x.promo?.promos ?? []).filter((p) => !p.ends || p.ends >= hariIni())
        .sort((a, b) => (a.ends || '9999').localeCompare(b.ends || '9999'));
      const p = daftar[0];
      if (!p) return null;
      return ganti({
        jenis: 'promo', nada: 'panas', label: p.lencana || t('sr.promoLabel'),
        judul: pilih(p.title, p.title_en), teks: pilih(p.body, p.body_en) || (daftar.length > 1 ? t('sr.promoLain', { n: daftar.length - 1 }) : t('sr.promoTeks')),
        tombol: [{ teks: t('sr.promoTombol'), href: p.link || '/promo/' }],
        mundur: p.ends && p.hitung ? akhirHari(p.ends) : null,
        visual: p.banner ? visGambar(p.banner, 'banner') : visAngka('%', t('sr.promoLabel')),
      });
    }
    case 'bundle': {
      const b = [...(x.promo?.bundles ?? [])].filter((y) => !y.habis).sort((a, c) => (c.best ? 1 : 0) - (a.best ? 1 : 0))[0];
      if (!b) return null;
      const apps = b.items.map((i) => x.bySlug.get(i.slug) ?? { nama: i.app, logo: null, kunciKategori: null });
      const hemat = Number(b.normal) - Number(b.price);
      return ganti({
        jenis: 'bundle', nada: 'maroon', label: b.best ? t('sr.bundleBest') : t('sr.bundleLabel'),
        judul: pilih(b.name, b.name_en),
        teks: t('sr.bundleTeks', { apps: b.items.map((i) => i.app).join(' + '), harga: harga(b.price) }) + (hemat > 0 ? ` ${t('sr.bundleHemat', { rp: harga(hemat) })}` : ''),
        tombol: [{ teks: t('sr.bundleTombol'), href: '/promo/' }],
        mundur: b.ends && b.hitung ? akhirHari(b.ends) : null,
        visual: b.banner ? visGambar(b.banner, 'banner') : visLogo(apps),
      });
    }
    case 'kupon': {
      const kupon = (x.sorotan?.kupon ?? []).slice(0, 3);
      if (!kupon.length) return null;
      return kupon.map((k) => ganti({
        jenis: 'kupon', nada: 'gelap', label: k.member ? t('sr.kuponMember') : t('sr.kuponLabel'),
        judul: t('sr.kuponJudul', { kode: k.kode, potongan: potongan(k.jenis, k.nilai, null) }),
        teks: k.teks || [t('sr.kuponTeks', { potongan: potongan(k.jenis, k.nilai, k.maks) }),
          k.min ? t('lg.kuponMin', { rp: rupiah(k.min) }) : null, k.sampai ? t('lg.kuponSampai', { tgl: tanggal(k.sampai) }) : null].filter(Boolean).join(' · '),
        tombol: [{ teks: t('sr.kuponSalin'), salin: k.kode }, { teks: t('sr.belanja'), href: '/katalog/', garis: true }],
        visual: visTiket(k.kode, potongan(k.jenis, k.nilai, null)),
      }));
    }
    case 'toppick': {
      const laris = (x.terlaris?.apps ?? []).map((a) => x.bySlug.get(a.slug)).filter((a) => a && !a.habisSemua);
      const daftar = laris.length ? laris : x.apps.filter((a) => a.unggulan && !a.habisSemua);
      const a = daftar[0];
      if (!a) return null;
      return ganti({
        jenis: 'toppick', nada: 'gelap', label: laris.length ? t('sr.topLabel') : t('sr.unggulanLabel'),
        judul: laris.length ? t('sr.topJudul', { app: a.nama }) : t('sr.unggulanJudul', { app: a.nama }),
        teks: a.hargaMulai != null ? t('sr.topTeks', { harga: harga(a.hargaMulai), lain: daftar.slice(1, 3).map((b) => b.nama).join(', ') || a.kategori }) : a.desc,
        tombol: [{ teks: t('sr.topTombol', { app: a.nama }), href: urlApp(a.slug) }, { teks: t('beranda.keBundle'), href: '/rakit/', garis: true }],
        visual: visLogo(daftar),
      });
    }
    case 'member': {
      const pr = x.member;
      const hari = hariIni();
      if (!pr?.aktif || Number(pr.diskon_pct) <= 0 || (pr.mulai && pr.mulai > hari) || (pr.sampai && pr.sampai < hari)) return null;
      return ganti({
        jenis: 'member', nada: 'maroon', label: t('sr.memberLabel'),
        judul: t('member.ajakJudul', { pct: pc(pr.diskon_pct) }),
        teks: t('sr.memberTeks', { besar: pc(pr.diskon_besar_pct), min: rupiah(pr.min_besar) }),
        tombol: [{ teks: t('member.ajakTombol'), href: '/member/' }],
        visual: visAngka(pc(pr.diskon_pct), t('sr.memberKecil')),
      });
    }
    case 'ajak': {
      const a = x.sorotan?.ajak;
      if (!a?.aktif) return null;
      return ganti({
        jenis: 'ajak', nada: 'panas', label: t('ajak.label'),
        judul: t('sr.ajakJudul', { hadiah: potongan(a.hadiah_jenis, a.hadiah_nilai, null) }),
        teks: t('sr.ajakTeks', { potongan: potongan(a.jenis, a.nilai, a.maks) }),
        tombol: [{ teks: t('sr.ajakTombol'), href: '/member/' }],
        visual: visAngka('+' + potongan(a.hadiah_jenis, a.hadiah_nilai, null), t('sr.ajakKecil')),
      });
    }
    case 'affiliate': {
      const a = x.sorotan?.affiliate;
      if (!a) return null;
      return ganti({
        jenis: 'affiliate', nada: 'koral', label: t('sr.affLabel'),
        judul: t('sr.affJudul', { pct: `${Number(a.pct)}%` }),
        teks: t('sr.affTeks', { min: rupiah(a.min_tarik) }),
        tombol: [{ teks: t('sr.affTombol'), href: '/affiliate/' }],
        visual: visAngka(`${Number(a.pct)}%`, t('sr.affKecil')),
      });
    }
    case 'reseller': {
      const pr = x.reseller;
      if (!promoBerjalan(pr)) return null;
      return ganti({
        jenis: 'reseller', nada: 'maroon', label: pr.label_promo || t('gabung.resellerLabel'),
        judul: pr.judul || t('sr.resellerJudul'), teks: pr.subjudul || '',
        tombol: [{ teks: t('sr.resellerTombol'), href: '/reseller/' }],
        mundur: pr.sampai || null,
        visual: pr.harga_promo ? visAngka(rupiah(pr.harga_promo), pr.harga_normal > pr.harga_promo ? t('sr.dariHarga', { rp: rupiah(pr.harga_normal) }) : '') : null,
      });
    }
    case 'film': {
      const f = (x.film ?? []).find((y) => y.status === 'sedang' && y.poster) ?? (x.film ?? []).find((y) => y.status === 'sedang');
      if (!f) return null;
      return ganti({
        jenis: 'film', nada: 'gelap', label: t('film.seksi'),
        judul: f.judul, teks: t('sr.filmTeks', { app: f.app }) + (f.genre ? ` · ${f.genre}` : ''),
        tombol: [{ teks: t('sr.filmTombol', { app: f.app }), href: f.slug ? urlApp(f.slug) : '/film/' }, { teks: t('film.lihat'), href: '/film/', garis: true }],
        visual: f.poster ? visGambar(f.poster, 'poster') : null, latar: f.poster,
      });
    }
    case 'blog': {
      const b = (x.berita ?? [])[0];
      if (!b) return null;
      return ganti({
        jenis: 'blog', nada: 'gelap', label: t('sr.blogLabel'),
        judul: pilih(b.title, b.title_en), teks: pilih(b.excerpt, b.excerpt_en) || '',
        tombol: [{ teks: t('sr.blogTombol'), href: urlBerita(b.slug) }],
        visual: b.cover_url ? visGambar(b.cover_url, 'sampul') : null,
      });
    }
    case 'manual':
      return {
        jenis: 'manual', nada: 'maroon', label: s.label || t('sr.kabarLabel'),
        judul: pilih(s.judul, s.judul_en), teks: pilih(s.teks, s.teks_en) || '',
        tombol: s.tautan ? [{ teks: pilih(s.tombol, s.tombol_en) || t('sr.lihat'), href: s.tautan }] : [],
        mundur: s.sampai && Date.parse(s.sampai) - Date.now() < 14 * 864e5 ? s.sampai : null,
        visual: s.gambar ? visGambar(s.gambar) : null,
      };
    default: return null;
  }
}

/** Susun semua slide dari data beranda. */
export function susunSorotan(x) {
  const urutan = x.sorotan?.sorotan?.length ? x.sorotan.sorotan
    : ['promo', 'bundle', 'toppick', 'member', 'affiliate'].map((jenis) => ({ jenis }));   // database lama: urutan bawaan
  return urutan.flatMap((s) => { try { return [].concat(susun(s, x) ?? []); } catch { return []; } }).filter((s) => s?.judul).slice(0, 10);
}

// ---------------------------------------------------------------- carousel
/** Pasang carousel di `wadah`. Tidak tampil kalau tidak ada slide. */
export function pasangSorotan(wadah, slides) {
  if (!slides.length) { wadah.hidden = true; return; }
  const gerakSedikit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let posisi = 0;
  let jalan = null;
  let jeda = false;
  const info = el('p', { class: 'tersembunyi', 'aria-live': 'polite' });

  const elSlide = slides.map((s, i) => {
    const tombol = (s.tombol ?? []).map((b, j) => {
      if (b.salin) {
        const k = el('button', { class: 'tombol ' + (j ? 'garis' : 'putih'), type: 'button' }, b.teks);
        k.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(b.salin); k.textContent = t('sr.disalin', { kode: b.salin }); } catch { k.textContent = b.salin; }
          setTimeout(() => { k.textContent = b.teks; }, 2500);
        });
        return k;
      }
      return el('a', { class: 'tombol ' + (b.garis ? 'garis' : 'putih'), href: b.href }, b.teks);
    });
    return el('article', {
      class: `slide-sorotan nada-${s.nada || 'maroon'} jenis-${s.jenis}`, role: 'group', 'aria-roledescription': t('sr.slide'),
      'aria-label': t('sr.slideKe', { n: i + 1, total: slides.length }), 'aria-hidden': i ? 'true' : null, inert: i ? '' : null,
      style: s.latar ? `--latar-slide:url("${String(s.latar).replace(/"/g, '')}")` : null,
    },
      el('div', { class: 'teks-sorotan' },
        el('span', { class: 'label-sorotan' }, s.label),
        el('h2', {}, s.judul),
        s.teks ? el('p', {}, s.teks) : null,
        s.mundur && Date.parse(s.mundur) > Date.now() ? el('div', { class: 'mundur-sorotan' }, el('small', {}, t('promo.berakhir')), hitungMundur(s.mundur, { kecil: true })) : null,
        tombol.length ? el('div', { class: 'aksi-sorotan' }, tombol) : null),
      s.visual ? el('div', { class: 'visual-sorotan' }, s.visual) : null);
  });

  const titik = slides.map((s, i) => el('button', {
    type: 'button', class: 'titik-sorotan', 'aria-label': t('sr.keSlide', { n: i + 1, judul: s.label }), 'aria-current': i === 0 ? 'true' : null,
    onclick: () => { ke(i); mulai(); },
  }, el('span', { class: 'nama-titik' }, s.label), el('span', { class: 'garis-waktu' }, el('i'))));
  const sebelum = el('button', { type: 'button', class: 'panah-sorotan kiri', 'aria-label': t('sr.sebelumnya'), onclick: () => { ke(posisi - 1); mulai(); } }, '‹');
  const berikut = el('button', { type: 'button', class: 'panah-sorotan kanan', 'aria-label': t('sr.berikutnya'), onclick: () => { ke(posisi + 1); mulai(); } }, '›');
  const jalur = el('div', { class: 'jalur-sorotan' }, elSlide);

  function ke(i) {
    posisi = (i + slides.length) % slides.length;
    jalur.style.transform = `translateX(${-posisi * 100}%)`;
    elSlide.forEach((s, j) => {
      if (j === posisi) { s.removeAttribute('aria-hidden'); s.removeAttribute('inert'); }
      else { s.setAttribute('aria-hidden', 'true'); s.setAttribute('inert', ''); }
    });
    titik.forEach((b, j) => { b.toggleAttribute('aria-current', j === posisi); if (j === posisi) b.setAttribute('aria-current', 'true'); });
    // geser baris label ke label aktif tanpa ikut menggulir halaman
    const baris = titik[posisi].parentElement;
    if (baris && baris.scrollWidth > baris.clientWidth) {
      const b = titik[posisi];
      if (b.offsetLeft < baris.scrollLeft || b.offsetLeft + b.offsetWidth > baris.scrollLeft + baris.clientWidth) {
        baris.scrollTo({ left: b.offsetLeft - 8, behavior: gerakSedikit ? 'auto' : 'smooth' });
      }
    }
    wadah.style.setProperty('--jeda', `${JEDA}ms`);
    wadah.classList.remove('berjalan'); void wadah.offsetWidth; if (jalan) wadah.classList.add('berjalan');
    info.textContent = jalan ? '' : `${slides[posisi].label}: ${slides[posisi].judul}`;
  }
  function mulai() {
    clearInterval(jalan); jalan = null;
    if (gerakSedikit || slides.length < 2 || jeda || document.hidden) { wadah.classList.remove('berjalan'); return; }
    jalan = setInterval(() => ke(posisi + 1), JEDA);
    wadah.classList.remove('berjalan'); void wadah.offsetWidth; wadah.classList.add('berjalan');
  }
  const henti = (b) => { jeda = b; mulai(); };
  wadah.addEventListener('mouseenter', () => henti(true));
  wadah.addEventListener('mouseleave', () => henti(false));
  wadah.addEventListener('focusin', () => henti(true));
  wadah.addEventListener('focusout', (e) => { if (!wadah.contains(e.relatedTarget)) henti(false); });
  document.addEventListener('visibilitychange', mulai);
  wadah.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { ke(posisi + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { ke(posisi - 1); e.preventDefault(); }
  });
  // geser dengan jari
  let awalX = null, awalY = 0;
  jalur.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { awalX = e.clientX; awalY = e.clientY; } });
  jalur.addEventListener('pointerup', (e) => {
    if (awalX == null) return;
    const dx = e.clientX - awalX, dy = e.clientY - awalY;
    awalX = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { ke(posisi + (dx < 0 ? 1 : -1)); mulai(); }
  });
  jalur.addEventListener('pointercancel', () => { awalX = null; });

  wadah.replaceChildren(...[
    el('div', { class: 'bingkai-sorotan' }, jalur, slides.length > 1 ? [sebelum, berikut] : null),
    slides.length > 1 ? el('div', { class: 'titik-titik', role: 'group', 'aria-label': t('sr.pilihKabar') }, titik) : null,
    info].filter(Boolean));
  wadah.hidden = false;
  ke(0);
  mulai();
}

/** Sambutan untuk pengunjung yang datang dari link ajak teman. */
export function sambutanAjak(info, tutup) {
  const teks = t('sr.diajak', { nama: info.nama, potongan: potongan(info.jenis, info.nilai, info.maks) });
  return el('div', { class: 'sambut-ajak', role: 'status' },
    el('span', { class: 'ikon-ajak', 'aria-hidden': 'true' }, '🎁'),
    el('p', {}, el('b', {}, t('sr.diajakJudul', { nama: info.nama })), ' ', teks,
      info.min ? ` ${t('lg.kuponMin', { rp: rupiah(info.min) })}.` : ''),
    el('button', { type: 'button', class: 'tutup-dialog', 'aria-label': t('bagi.tutup'), onclick: tutup }, '×'));
}
