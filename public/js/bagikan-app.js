// Bagikan halaman aplikasi: (1) link + ajakan beli di website & daftar member, (2) gambar pricelist siap kirim.
// Gambar dibuat di browser (canvas), jadi tidak perlu screenshot manual.
import { ambilProgramMember } from './api.js';
import { harga, inggris, labelTipe, labelVarian, persen, rupiah, t, tanggal } from './i18n.js';
import { el } from './ui.js';

const ASAL = location.origin;
const urlApp = (app) => `${ASAL}/aplikasi/?app=${encodeURIComponent(app.slug)}`;
const URL_MEMBER = `${ASAL}/member/`;
const hariIni = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
const pct = (n) => persen(Number(n) / 100);

/** Program member yang sedang berlaku, atau null. */
async function programMember() {
  const pr = await ambilProgramMember().catch(() => null);
  const hari = hariIni();
  if (!pr?.aktif || Number(pr.diskon_pct) <= 0 || (pr.mulai && pr.mulai > hari) || (pr.sampai && pr.sampai < hari)) return null;
  return pr;
}

/** Harga termurah yang tersedia per tipe paket. */
function mulaiPerTipe(app) {
  return app.grup.map((g) => {
    const ada = g.items.filter((v) => v.s !== 0);
    return ada.length ? { tipe: labelTipe(g.label), p: Math.min(...ada.map((v) => v.p)) } : null;
  }).filter(Boolean);
}

/** Teks ajakan untuk WhatsApp / media sosial. */
export function teksAjakan(app, member) {
  const mulai = mulaiPerTipe(app);
  const bagian = [];
  if (mulai.length) {
    bagian.push(t('bagi.teksPembuka', { app: app.nama }) + '\n' + mulai.map((m) => `• ${t('bagi.teksMulai', { tipe: m.tipe, harga: harga(m.p) })}`).join('\n'));
    bagian.push(`${t('bagi.teksPesan')}\n${urlApp(app)}`);
  } else {
    bagian.push(`${t('bagi.teksHabis', { app: app.nama })}\n${urlApp(app)}`);
  }
  if (member) {
    const besar = Number(member.diskon_besar_pct) > Number(member.diskon_pct) && member.min_besar
      ? t('bagi.teksMemberBesar', { pct: pct(member.diskon_besar_pct), min: rupiah(member.min_besar) }) : '';
    bagian.push(`${t('bagi.teksMember', { pct: pct(member.diskon_pct), besar })}\n${URL_MEMBER}`);
  }
  return bagian.join('\n\n');
}

// ---------------------------------------------------------------- gambar pricelist (canvas)
const TEMA = {
  gelap: { latar: ['#1a0405', '#3b0608', '#120203'], panel: 'rgba(255,255,255,.06)', panelGaris: 'rgba(255,255,255,.10)', teks: '#ffffff',
    redup: 'rgba(255,255,255,.66)', aksen: '#ff6b72', garis: 'rgba(255,255,255,.16)', chip: 'rgba(255,255,255,.12)', habis: 'rgba(255,255,255,.38)',
    ikon: '#800203', emblem: '/assets/brand/emblem-putih.png', hadiah: 'rgba(255,107,114,.16)' },
  terang: { latar: ['#ffffff', '#f6eeee', '#efe3e4'], panel: '#ffffff', panelGaris: 'rgba(22,22,26,.08)', teks: '#16161a',
    redup: '#5f5f66', aksen: '#800203', garis: 'rgba(22,22,26,.12)', chip: 'rgba(128,2,3,.08)', habis: 'rgba(22,22,26,.38)',
    ikon: '#800203', emblem: '/assets/brand/emblem-maroon.png', hadiah: 'rgba(128,2,3,.07)' },
};
const JUDUL = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const ISI = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const W = 1080, PAD = 72;

const muatGambar = (src, cors) => new Promise((ok) => {
  const img = new Image();
  if (cors) img.crossOrigin = 'anonymous';
  img.onload = () => ok(img);
  img.onerror = () => ok(null);
  img.src = src;
});

function kotakBulat(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
/** Potong teks dengan "…" supaya muat. */
function pas(c, teks, maks) {
  if (c.measureText(teks).width <= maks) return teks;
  let s = teks;
  while (s.length > 1 && c.measureText(s + '…').width > maks) s = s.slice(0, -1);
  return s.trimEnd() + '…';
}
/** Pecah teks jadi beberapa baris (maks n baris). */
function bungkus(c, teks, maks, n = 2) {
  const kata = String(teks).split(/\s+/);
  const out = [];
  let baris = '';
  for (const k of kata) {
    const coba = baris ? `${baris} ${k}` : k;
    if (c.measureText(coba).width <= maks || !baris) baris = coba;
    else { out.push(baris); baris = k; }
  }
  if (baris) out.push(baris);
  if (out.length > n) { out.length = n; out[n - 1] = pas(c, out[n - 1] + ' …', maks); }
  return out;
}
const inisial = (nama) => {
  const kata = nama.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
  return (kata.length > 1 && !/^\d/.test(kata[1]) ? kata[0][0] + kata[1][0] : kata[0].slice(0, 2)).toUpperCase();
};

/**
 * Gambar pricelist satu aplikasi. Mengembalikan canvas.
 * opsi: { tema: 'gelap' | 'terang', habis: tampilkan paket habis, member, toko, logo: Image | null }
 */
export function gambarPricelist(app, opsi = {}) {
  const T = TEMA[opsi.tema] || TEMA.gelap;
  const grup = app.grup.map((g) => ({ label: labelTipe(g.label), items: g.items.filter((v) => opsi.habis || v.s !== 0) }))
    .filter((g) => g.items.length);
  const semuaHabis = !grup.length;
  const tampil = semuaHabis ? app.grup.map((g) => ({ label: labelTipe(g.label), items: g.items })) : grup;

  const kanvas = document.createElement('canvas');
  const c = kanvas.getContext('2d');
  // dua kali jalan: pertama mengukur tinggi, kedua menggambar
  const susun = (gambar) => {
    let y = PAD;
    // kepala: emblem + merek + label PRICELIST
    if (gambar) {
      if (opsi.emblem) c.drawImage(opsi.emblem, PAD, y, 66, 66 * opsi.emblem.height / opsi.emblem.width);
      c.fillStyle = T.teks; c.font = `700 30px ${JUDUL}`; c.textBaseline = 'middle';
      c.fillText('IXVII.CO', PAD + 84, y + 22);
      c.fillStyle = T.aksen; c.font = `700 22px ${ISI}`; c.textAlign = 'right';
      c.fillText(t('bagi.gPricelist').split('').join(String.fromCharCode(8202)), W - PAD, y + 22);
      c.textAlign = 'left';
    }
    y += 44 + 52;

    // aplikasi: logo/inisial + kategori + nama + rating
    const IK = 148;
    if (gambar) {
      kotakBulat(c, PAD, y, IK, IK, 36);
      if (opsi.logo) {
        c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(PAD, y, IK, IK);
        const s = Math.min(IK / opsi.logo.width, IK / opsi.logo.height);
        c.drawImage(opsi.logo, PAD + (IK - opsi.logo.width * s) / 2, y + (IK - opsi.logo.height * s) / 2, opsi.logo.width * s, opsi.logo.height * s);
        c.restore();
      } else {
        const g = c.createLinearGradient(PAD, y, PAD + IK, y + IK);
        g.addColorStop(0, '#a3141b'); g.addColorStop(1, '#4a0305');
        c.fillStyle = g; c.fill();
        c.fillStyle = '#fff'; c.font = `700 58px ${JUDUL}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(inisial(app.nama), PAD + IK / 2, y + IK / 2 + 2); c.textAlign = 'left';
      }
    }
    const xT = PAD + IK + 36, lebarT = W - PAD - xT;
    c.font = `600 26px ${ISI}`;
    let yT = y + 8;
    if (gambar) { c.fillStyle = T.redup; c.textBaseline = 'top'; c.fillText(pas(c, app.kategori.toUpperCase(), lebarT), xT, yT); }
    yT += 40;
    let ukuran = 72;
    c.font = `700 ${ukuran}px ${JUDUL}`;
    while (ukuran > 46 && c.measureText(app.nama).width > lebarT * 1.6) { ukuran -= 4; c.font = `700 ${ukuran}px ${JUDUL}`; }
    const namaBaris = bungkus(c, app.nama, lebarT, 2);
    if (gambar) { c.fillStyle = T.teks; namaBaris.forEach((b, i) => c.fillText(b, xT, yT + i * ukuran * 1.05)); }
    yT += namaBaris.length * ukuran * 1.05 + 6;
    if (app.rating) {
      if (gambar) {
        c.font = `600 26px ${ISI}`; c.fillStyle = T.aksen; c.textBaseline = 'top';
        const nilai = `★ ${Number(app.rating.rata).toLocaleString(inggris() ? 'en-US' : 'id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
        c.fillText(nilai, xT, yT);
        c.fillStyle = T.redup;
        c.fillText(t('bagi.gUlasan', { n: app.rating.jumlah }), xT + c.measureText(nilai).width + 10, yT);
      }
      yT += 40;
    }
    y = Math.max(y + IK, yT) + 48;

    // daftar harga per tipe
    const BARIS = 70;
    for (const g of tampil) {
      // judul tipe
      if (gambar) {
        c.font = `700 30px ${JUDUL}`; c.textBaseline = 'middle';
        const lebar = c.measureText(g.label).width + 44;
        kotakBulat(c, PAD, y, lebar, 52, 26); c.fillStyle = T.chip; c.fill();
        c.fillStyle = T.teks; c.fillText(g.label, PAD + 22, y + 27);
        const ada = g.items.filter((v) => v.s !== 0);
        if (ada.length) {
          c.font = `500 24px ${ISI}`; c.fillStyle = T.redup; c.textAlign = 'right';
          c.fillText(t('bagi.gMulai', { harga: harga(Math.min(...ada.map((v) => v.p))) }), W - PAD, y + 27);
          c.textAlign = 'left';
        }
      }
      y += 52 + 14;
      const tinggiPanel = g.items.length * BARIS + 12;
      if (gambar) {
        kotakBulat(c, PAD, y, W - PAD * 2, tinggiPanel, 24);
        c.fillStyle = T.panel; c.fill(); c.strokeStyle = T.panelGaris; c.lineWidth = 2; c.stroke();
      }
      let yb = y + 6;
      g.items.forEach((v, i) => {
        if (gambar) {
          const habis = v.s === 0;
          const tengah = yb + BARIS / 2;
          c.textBaseline = 'middle';
          c.font = `700 32px ${JUDUL}`;
          const teksHarga = habis ? t('bagi.gHabis') : harga(v.p);
          if (habis) c.font = `700 24px ${ISI}`;
          const lebarHarga = c.measureText(teksHarga).width;
          c.fillStyle = habis ? T.habis : T.teks;
          c.textAlign = 'right'; c.fillText(teksHarga, W - PAD - 28, tengah); c.textAlign = 'left';
          c.font = `500 30px ${ISI}`;
          const label = pas(c, labelVarian(v.d), W - PAD * 2 - 56 - lebarHarga - 40);
          c.fillStyle = habis ? T.habis : T.teks;
          c.fillText(label, PAD + 28, tengah);
          // titik-titik penghubung
          const awal = PAD + 28 + c.measureText(label).width + 16, akhir = W - PAD - 28 - lebarHarga - 16;
          if (akhir - awal > 20) {
            c.fillStyle = T.garis;
            for (let x = awal; x < akhir; x += 12) { c.beginPath(); c.arc(x, tengah + 4, 2, 0, Math.PI * 2); c.fill(); }
          }
          if (habis) { c.strokeStyle = T.habis; c.lineWidth = 2; c.beginPath(); c.moveTo(PAD + 28, tengah); c.lineTo(PAD + 28 + c.measureText(label).width, tengah); c.stroke(); }
          if (i < g.items.length - 1) { c.fillStyle = T.panelGaris; c.fillRect(PAD + 28, yb + BARIS, W - PAD * 2 - 56, 1); }
        }
        yb += BARIS;
      });
      y += tinggiPanel + 34;
    }

    // ajakan member
    if (opsi.member) {
      const tinggi = 118;
      if (gambar) {
        kotakBulat(c, PAD, y, W - PAD * 2, tinggi, 24); c.fillStyle = T.hadiah; c.fill();
        c.strokeStyle = T.aksen; c.lineWidth = 2; c.setLineDash([10, 8]); c.stroke(); c.setLineDash([]);
        // lencana persen
        c.fillStyle = T.aksen; c.beginPath(); c.arc(PAD + 58, y + tinggi / 2, 30, 0, Math.PI * 2); c.fill();
        c.fillStyle = opsi.tema === 'terang' ? '#fff' : '#1a0405'; c.font = `700 32px ${JUDUL}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('%', PAD + 58, y + tinggi / 2 + 1); c.textAlign = 'left';
        c.textBaseline = 'top'; c.fillStyle = T.teks; c.font = `700 30px ${JUDUL}`;
        c.fillText(pas(c, t('bagi.gMember', { pct: pct(opsi.member.diskon_pct) }), W - PAD * 2 - 140), PAD + 104, y + 26);
        c.font = `500 24px ${ISI}`; c.fillStyle = T.redup;
        c.fillText(pas(c, t('bagi.gMemberSub', { url: URL_MEMBER.replace(/^https?:\/\//, '') }), W - PAD * 2 - 140), PAD + 104, y + 68);
      }
      y += tinggi + 34;
    }

    // kaki: cara pesan + WhatsApp + tanggal harga
    if (gambar) {
      c.fillStyle = T.garis; c.fillRect(PAD, y, W - PAD * 2, 2);
      c.textBaseline = 'top';
      c.font = `500 24px ${ISI}`; c.fillStyle = T.redup; c.fillText(t('bagi.gPesan'), PAD, y + 30);
      c.font = `700 30px ${JUDUL}`; c.fillStyle = T.teks;
      c.fillText(pas(c, urlApp(app).replace(/^https?:\/\//, ''), W - PAD * 2), PAD, y + 64);
      let yk = y + 112;
      if (opsi.toko?.whatsapp_number) {
        c.font = `600 26px ${ISI}`; c.fillStyle = T.aksen;
        c.fillText(t('bagi.gWa', { wa: formatWa(opsi.toko.whatsapp_number) }), PAD, yk);
        yk += 42;
      }
      c.font = `400 22px ${ISI}`; c.fillStyle = T.redup;
      c.fillText(t('bagi.gTanggal', { tgl: tanggal(hariIni() + 'T00:00:00') }), PAD, yk);
    }
    y += 112 + (opsi.toko?.whatsapp_number ? 42 : 0) + 30 + PAD;
    return Math.ceil(y);
  };

  kanvas.width = W;
  kanvas.height = 10;
  const tinggi = susun(false);
  kanvas.height = tinggi;
  // latar
  const g = c.createLinearGradient(0, 0, W * .4, tinggi);
  T.latar.forEach((w, i) => g.addColorStop(i / (T.latar.length - 1), w));
  c.fillStyle = g; c.fillRect(0, 0, W, tinggi);
  const sinar = c.createRadialGradient(W * .9, 0, 0, W * .9, 0, W * .9);
  sinar.addColorStop(0, opsi.tema === 'terang' ? 'rgba(128,2,3,.10)' : 'rgba(192,38,45,.35)'); sinar.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = sinar; c.fillRect(0, 0, W, tinggi);
  susun(true);
  return kanvas;
}

/** 6281234567890 → 0812-3456-7890 */
function formatWa(n) {
  const d = String(n).replace(/\D/g, '').replace(/^62/, '0');
  return d.replace(/^(\d{4})(\d{4})(\d+)$/, '$1-$2-$3');
}

// ---------------------------------------------------------------- dialog bagikan
const salinTeks = async (teks) => {
  try { await navigator.clipboard.writeText(teks); return true; }
  catch {
    const ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = teks; document.body.append(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
};

/**
 * Tombol "Bagikan link" & "Gambar pricelist" untuk halaman aplikasi.
 * konteks: { toko } — nomor WhatsApp toko ikut tercantum di gambar.
 */
export function tombolBagikan(app, konteks = {}) {
  const buka = (tab) => bukaDialog(app, konteks, tab);
  return el('div', { class: 'aksi-bagikan' },
    el('button', { type: 'button', class: 'tombol garis kecil', onclick: () => buka('link') }, ikonBagikan(), t('bagi.tombolLink')),
    el('button', { type: 'button', class: 'tombol garis kecil', onclick: () => buka('gambar') }, ikonGambar(), t('bagi.tombolGambar')));
}

const svgIkon = (d) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'ikon-bagi');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2');
  p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
  s.append(p);
  return s;
};
const ikonBagikan = () => svgIkon('M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13');
const ikonGambar = () => svgIkon('M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 8.5h.01');

async function bukaDialog(app, konteks, tabAwal) {
  const member = await programMember();
  const d = el('dialog', { class: 'dialog-bagikan', 'aria-labelledby': 'judul-bagikan' });
  const tutup = el('button', { type: 'button', class: 'tutup-dialog', 'aria-label': t('bagi.tutup'), onclick: () => d.close() }, '×');
  const tabLink = el('button', { type: 'button', role: 'tab' }, t('bagi.tabLink'));
  const tabGambar = el('button', { type: 'button', role: 'tab' }, t('bagi.tabGambar'));
  const panel = el('div', { class: 'panel-bagikan' });
  const info = el('p', { class: 'info-bagikan', role: 'status' });
  const kabar = (teks) => { info.textContent = teks; clearTimeout(kabar.j); kabar.j = setTimeout(() => { info.textContent = ''; }, 3500); };

  // ---- link & ajakan
  const teks = el('textarea', { rows: 10, 'aria-label': t('bagi.tabLink') });
  teks.value = teksAjakan(app, member);
  const panelLink = el('div', {},
    el('p', { class: 'redup' }, t('bagi.bisaUbah')), teks,
    el('div', { class: 'baris-tombol' },
      el('a', { class: 'tombol wa', target: '_blank', rel: 'noopener', href: '#',
        onclick: (e) => { e.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(teks.value)}`; } }, t('bagi.wa')),
      navigator.share ? el('button', { type: 'button', class: 'tombol garis', onclick: async () => {
        try { await navigator.share({ title: `${app.nama} — IXVII.CO`, text: teks.value }); } catch { /* dibatalkan */ }
      } }, t('bagi.lain')) : null,
      el('button', { type: 'button', class: 'tombol garis', onclick: async () => kabar(await salinTeks(teks.value) ? t('bagi.tersalin') : t('bagi.gagalSalin')) }, t('bagi.salin'))));

  // ---- gambar pricelist
  let tema = document.documentElement.getAttribute('data-tema') === 'terang' ? 'terang' : 'gelap';
  const pilihTema = el('div', { class: 'pilih-tema', role: 'group', 'aria-label': t('bagi.tema') });
  const habis = el('input', { type: 'checkbox' });
  const pratinjau = el('div', { class: 'pratinjau-pricelist' }, el('div', { class: 'memuat', style: 'height:320px' }));
  let berkas = null;
  const tombolBagiGambar = el('button', { type: 'button', class: 'tombol', hidden: true }, t('bagi.bagikanGambar'));
  const tombolUnduh = el('button', { type: 'button', class: 'tombol garis' }, t('bagi.unduh'));
  const tombolSalin = window.ClipboardItem && navigator.clipboard?.write ? el('button', { type: 'button', class: 'tombol garis' }, t('bagi.salinGambar')) : null;
  const gambarIni = { emblemGelap: null, emblemTerang: null, logo: null };
  const siapkanGambar = (async () => {
    // logo aplikasi dari server lain butuh izin CORS; kalau ditolak, inisial dipakai sebagai gantinya
    const [gelap, terang, logo] = await Promise.all([
      muatGambar(TEMA.gelap.emblem), muatGambar(TEMA.terang.emblem), app.logo ? muatGambar(app.logo, true) : null,
      document.fonts?.load(`700 30px ${ISI}`).catch(() => null), document.fonts?.load(`500 30px ${ISI}`).catch(() => null)]);
    Object.assign(gambarIni, { emblemGelap: gelap, emblemTerang: terang, logo });
  })();
  const render = async () => {
    await siapkanGambar;
    const buat = (logo) => gambarPricelist(app, { tema, habis: habis.checked, member, toko: konteks.toko, logo,
      emblem: tema === 'terang' ? gambarIni.emblemTerang : gambarIni.emblemGelap });
    let kanvas = buat(gambarIni.logo);
    let blob = await new Promise((ok) => { try { kanvas.toBlob(ok, 'image/png'); } catch { ok(null); } });
    if (!blob && gambarIni.logo) { gambarIni.logo = null; kanvas = buat(null); blob = await new Promise((ok) => kanvas.toBlob(ok, 'image/png')); }
    if (!blob) { pratinjau.replaceChildren(el('p', { class: 'galat' }, t('bagi.gagalGambar'))); return; }
    berkas = new File([blob], `pricelist-${app.slug}-ixvii.png`, { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const img = el('img', { src: url, alt: t('bagi.altGambar', { app: app.nama }), width: kanvas.width, height: kanvas.height });
    img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    pratinjau.replaceChildren(img);
    tombolBagiGambar.hidden = !(navigator.canShare && navigator.canShare({ files: [berkas] }));
  };
  const gambarTema = () => pilihTema.replaceChildren(...['gelap', 'terang'].map((k) => el('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(k === tema), onclick: () => { tema = k; gambarTema(); render(); },
  }, t('bagi.' + k))));
  gambarTema();
  habis.addEventListener('change', render);
  tombolBagiGambar.addEventListener('click', async () => {
    if (!berkas) return;
    try { await navigator.share({ files: [berkas], title: `${app.nama} — IXVII.CO`, text: urlApp(app) }); } catch { /* dibatalkan */ }
  });
  tombolUnduh.addEventListener('click', () => {
    if (!berkas) return;
    const url = URL.createObjectURL(berkas);
    const a = el('a', { href: url, download: berkas.name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
  tombolSalin?.addEventListener('click', async () => {
    if (!berkas) return;
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': berkas })]); kabar(t('bagi.gambarTersalin')); }
    catch { kabar(t('bagi.gagalSalin')); }
  });
  const panelGambar = el('div', {},
    el('div', { class: 'atur-pricelist' }, el('span', { class: 'redup' }, t('bagi.tema')), pilihTema,
      el('label', { class: 'centang' }, habis, t('bagi.habis'))),
    pratinjau,
    el('div', { class: 'baris-tombol' }, tombolBagiGambar, tombolUnduh, tombolSalin));

  let renderAwal = false;
  const pilihTab = (k) => {
    tabLink.setAttribute('aria-selected', String(k === 'link'));
    tabGambar.setAttribute('aria-selected', String(k === 'gambar'));
    panel.replaceChildren(k === 'link' ? panelLink : panelGambar);
    if (k === 'gambar' && !renderAwal) { renderAwal = true; render(); }
  };
  tabLink.addEventListener('click', () => pilihTab('link'));
  tabGambar.addEventListener('click', () => pilihTab('gambar'));

  d.append(el('div', { class: 'kepala-dialog' }, el('h2', { id: 'judul-bagikan' }, t('bagi.judul', { app: app.nama })), tutup),
    el('div', { class: 'tab-bagikan', role: 'tablist' }, tabLink, tabGambar), panel, info);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });   // klik latar menutup
  document.body.append(d);
  pilihTab(tabAwal === 'gambar' ? 'gambar' : 'link');
  d.showModal();
}
