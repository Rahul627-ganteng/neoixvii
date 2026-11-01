// Ajakan jadi Reseller & Affiliate (kartu merah di beranda), perbandingan keduanya, dan hitung mundur promo.
import { rupiah, t, tanggal } from './i18n.js';
import { el } from './ui.js';

/** Promo reseller sedang berjalan? */
export function promoBerjalan(pr, sekarang = Date.now()) {
  if (!pr?.aktif) return false;
  return (!pr.mulai || Date.parse(pr.mulai) <= sekarang) && (!pr.sampai || Date.parse(pr.sampai) >= sekarang);
}

/** Hitung mundur hari:jam:menit:detik sampai `sampai`. selesai() dipanggil sekali saat waktunya habis. */
export function hitungMundur(sampai, { kecil = false, selesai } = {}) {
  const target = Date.parse(sampai);
  const kotak = ['hari', 'jam', 'menit', 'detik'].map((k) => {
    const angka = el('b', {}, '00');
    return { angka, e: el('span', { class: 'hm-kotak' }, angka, el('small', {}, t('hm.' + k))) };
  });
  const wadah = el('div', { class: 'hitung-mundur' + (kecil ? ' kecil' : ''), role: 'timer', 'aria-label': t('hm.label', { tgl: tanggal(sampai) }) },
    ...kotak.map((k) => k.e));
  let jalan;
  let pernah = false;
  const tulis = () => {
    const sisa = Math.max(0, target - Date.now());
    const d = Math.floor(sisa / 864e5), h = Math.floor(sisa / 36e5) % 24, m = Math.floor(sisa / 6e4) % 60, s = Math.floor(sisa / 1e3) % 60;
    [d, h, m, s].forEach((n, i) => { kotak[i].angka.textContent = String(n).padStart(2, '0'); });
    if (!sisa) { clearInterval(jalan); selesai?.(); }
  };
  tulis();
  // berhenti sendiri kalau elemennya sudah dilepas dari halaman
  jalan = setInterval(() => { if (wadah.isConnected) pernah = true; else if (pernah) { clearInterval(jalan); return; } tulis(); }, 1000);
  return wadah;
}

const centang = (teks) => el('li', {}, el('span', { class: 'tanda', 'aria-hidden': 'true' }, '✓'), teks);

/** Dua kartu merah: Reseller (berbayar, dengan harga & hitung mundur) dan Affiliate (gratis). */
export function kartuGabung(pr) {
  const promo = promoBerjalan(pr);
  const reseller = el('a', { class: 'kartu-gabung reseller', href: '/reseller/' },
    el('div', { class: 'gabung-label' }, promo ? (pr.label_promo || t('gabung.flash')) : t('gabung.resellerLabel')),
    el('h3', {}, t('gabung.resellerJudul')),
    el('p', {}, t('gabung.resellerTeks')),
    el('ul', { class: 'gabung-poin' }, ['gabung.r1', 'gabung.r2', 'gabung.r3', 'gabung.r4'].map((k) => centang(t(k)))),
    el('div', { class: 'gabung-harga' },
      pr.harga_normal > (promo ? pr.harga_promo : 0) ? el('s', {}, t('gabung.worth', { rp: rupiah(pr.harga_normal) })) : null,
      el('b', {}, rupiah(promo ? pr.harga_promo : pr.harga_normal)),
      promo && pr.periode_teks ? el('small', {}, pr.periode_teks) : null),
    promo && pr.sampai ? el('div', { class: 'gabung-hm' }, el('small', {}, t('gabung.berakhir')), hitungMundur(pr.sampai, { kecil: true })) : null,
    el('span', { class: 'gabung-cta' }, t('gabung.resellerCta')));
  const affiliate = el('a', { class: 'kartu-gabung affiliate', href: '/affiliate/' },
    el('div', { class: 'gabung-label' }, t('gabung.affiliateLabel')),
    el('h3', {}, t('gabung.affiliateJudul')),
    el('p', {}, t('gabung.affiliateTeks')),
    el('ul', { class: 'gabung-poin' }, ['gabung.a1', 'gabung.a2', 'gabung.a3', 'gabung.a4'].map((k) => centang(t(k)))),
    el('div', { class: 'gabung-harga' }, el('b', {}, t('gabung.gratis')), el('small', {}, t('gabung.tanpaBiaya'))),
    el('span', { class: 'gabung-cta' }, t('gabung.affiliateCta')));
  return [reseller, affiliate];
}

/** "Reseller vs Affiliate di IXVII.CO: Bedanya Apa?" */
export function bandingGabung(pr) {
  const promo = promoBerjalan(pr);
  const hargaTeks = pr ? `${promo ? (pr.label_promo || t('gabung.flash')) : t('gabung.hargaNormal')} ${rupiah(promo ? pr.harga_promo : pr.harga_normal)}` : '';
  const kolom = (jenis, judul, sub, baris, href, cta) => el('div', { class: 'banding-kolom ' + jenis },
    el('h4', {}, judul, el('small', {}, sub)),
    el('dl', {}, baris.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)])),
    el('a', { class: 'tombol kecil' + (jenis === 'affiliate' ? ' garis' : ''), href }, cta));
  return el('article', { class: 'banding kaca' },
    el('h3', {}, t('banding.judul'), ' ', el('span', { 'aria-hidden': 'true' }, '🤔💡')),
    el('p', { class: 'redup' }, t('banding.intro')),
    el('div', { class: 'banding-grid' },
      kolom('reseller', t('banding.r'), t('banding.rSub'), [
        [t('banding.modal'), t('banding.rModal', { harga: hargaTeks })],
        [t('banding.cara'), t('banding.rCara')],
        [t('banding.untung'), t('banding.rUntung')]], '/reseller/', t('banding.rCta')),
      kolom('affiliate', t('banding.a'), t('banding.aSub'), [
        [t('banding.modal'), t('banding.aModal')],
        [t('banding.cara'), t('banding.aCara')],
        [t('banding.untung'), t('banding.aUntung')]], '/affiliate/', t('banding.aCta'))),
    el('div', { class: 'banding-singkat' },
      el('b', {}, t('banding.singkat')),
      el('p', {}, el('span', { 'aria-hidden': 'true' }, '💡 '), t('banding.pilihR')),
      el('p', {}, el('span', { 'aria-hidden': 'true' }, '💡 '), t('banding.pilihA'))),
    el('p', { class: 'banding-tagline' }, t('banding.tagline')));
}

/** Teks benefit dari admin: satu baris satu poin; baris diawali "- " jadi sub-poin; **tebal**. */
export function daftarBenefit(teks) {
  const ul = el('ul', { class: 'daftar-benefit' });
  let induk = null;
  const isi = (s) => s.split(/\*\*(.+?)\*\*/g).map((b, i) => (i % 2 ? el('b', {}, b) : b));
  for (const baris of String(teks ?? '').split('\n').map((x) => x.trimEnd()).filter((x) => x.trim())) {
    if (/^\s*[-•]\s+/.test(baris) && induk) {
      let sub = induk.querySelector('ul');
      if (!sub) { sub = el('ul', {}); induk.append(sub); }
      sub.append(el('li', {}, ...isi(baris.replace(/^\s*[-•]\s+/, ''))));
    } else {
      induk = el('li', {}, ...isi(baris.trim()));
      ul.append(induk);
    }
  }
  return ul;
}
