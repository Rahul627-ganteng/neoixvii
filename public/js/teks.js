// Tampilkan teks berformat sederhana tanpa innerHTML (aman dari HTML sisipan):
// "## Judul", "### Subjudul", paragraf, daftar "- …" / "1. …", **tebal**, [teks](https://… atau /…).
const buat = (tag, attrs = {}, ...anak) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.append(...anak);
  return e;
};

/** Teks satu baris → node (tebal & tautan). */
export function sebaris(teks) {
  const hasil = [];
  const pola = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let akhir = 0, m;
  while ((m = pola.exec(teks))) {
    if (m.index > akhir) hasil.push(teks.slice(akhir, m.index));
    if (m[1] != null) hasil.push(buat('strong', {}, m[1]));
    else if (/^(https:\/\/|\/(?!\/)|mailto:)/.test(m[3])) {
      hasil.push(buat('a', /^https:/.test(m[3]) ? { href: m[3], target: '_blank', rel: 'noopener' } : { href: m[3] }, m[2]));
    } else hasil.push(m[2]);
    akhir = pola.lastIndex;
  }
  if (akhir < teks.length) hasil.push(teks.slice(akhir));
  return hasil;
}

/** Teks banyak baris → daftar elemen blok. */
export function tampilkanTeks(teks) {
  const blok = String(teks ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blok.flatMap((b) => {
    const baris = b.split('\n').map((x) => x.trim()).filter(Boolean);
    if (baris.length === 1 && /^###\s+/.test(baris[0])) return [buat('h3', {}, ...sebaris(baris[0].replace(/^###\s+/, '')))];
    if (baris.length === 1 && /^##\s+/.test(baris[0])) return [buat('h2', {}, ...sebaris(baris[0].replace(/^##\s+/, '')))];
    if (baris.every((x) => /^[-*]\s+/.test(x))) return [buat('ul', {}, ...baris.map((x) => buat('li', {}, ...sebaris(x.replace(/^[-*]\s+/, '')))))];
    if (baris.every((x) => /^\d+[.)]\s+/.test(x))) return [buat('ol', {}, ...baris.map((x) => buat('li', {}, ...sebaris(x.replace(/^\d+[.)]\s+/, '')))))];
    // judul diikuti paragraf tanpa baris kosong
    if (/^#{2,3}\s+/.test(baris[0])) return [...tampilkanTeks(baris[0]), ...tampilkanTeks(baris.slice(1).join('\n'))];
    return [buat('p', {}, ...sebaris(baris.join(' ')))];
  });
}
