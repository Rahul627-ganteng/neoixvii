// Alat bantu bersama untuk halaman-halaman panel admin.
export const rp = (n) => (n == null || n === '' ? '–' : 'Rp' + Number(n).toLocaleString('id-ID'));
export const persen = (x) => (x == null ? '–' : (x * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%');
export const waktu = (t) => (t ? new Date(t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '–');
export const hariIni = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

export function el(tag, attrs = {}, ...anak) {
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
}
export function tabel(kepala, baris) {
  const t = el('table', { class: 'kartu-hp' },
    el('thead', {}, el('tr', {}, kepala.map((h) => (h.startsWith('>') ? el('th', { class: 'num' }, h.slice(1)) : el('th', {}, h))))),
    el('tbody', {}, baris));
  // di HP setiap baris tampil sebagai kartu; judul kolom ikut tampil di samping isinya
  const label = kepala.map((h) => h.replace(/^>/, ''));
  for (const tr of t.tBodies[0].rows) [...tr.cells].forEach((c, i) => { if (label[i] && c.colSpan <= 1) c.dataset.label = label[i]; });
  return el('div', { class: 'tablewrap' }, t);
}
export const td = (isi, num) => el('td', num ? { class: 'num' } : {}, isi);
let toastJeda;
export function toast(teks, err = false) {
  document.querySelector('.toast')?.remove();
  const t = el('div', { class: 'toast' + (err ? ' err' : ''), role: 'status' }, teks);
  document.body.append(t);
  clearTimeout(toastJeda);
  toastJeda = setTimeout(() => t.remove(), 3200);
}
export async function q(janji) {
  const { data, error } = await janji;
  if (error) throw new Error(error.message);
  return data;
}
export const memuat = () => el('div', { class: 'card muted' }, 'Memuat…');

/** Kotak isian dengan label di atasnya. */
export const isian = (label, input, catatan) => el('div', {}, el('label', { class: 'f' }, label), input, catatan ? el('div', { class: 'muted' }, catatan) : null);
/** Nomor WhatsApp → format internasional tanpa + (0812… → 62812…). */
export function rapikanWa(n) {
  let d = String(n ?? '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8') && d.length >= 9 && d.length <= 13) d = '62' + d;
  return d;
}
export const tautanWa = (nomor, teks) => `https://wa.me/${String(nomor).replace(/\D/g, '')}${teks ? '?text=' + encodeURIComponent(teks) : ''}`;
