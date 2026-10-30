import { ambilDetail, ambilKatalog } from './api.js';
import { el, ikonApp, kartuApp, pasangKerangka, pasangTilt, pesanGagal, rp } from './ui.js';

pasangKerangka('/katalog/');
pasangTilt();

const isi = document.getElementById('isi');
const slug = new URLSearchParams(location.search).get('app') || '';

function tidakDitemukan() {
  document.title = 'Aplikasi tidak ditemukan — IXVII.CO';
  isi.replaceChildren(el('div', { class: 'kosong kaca', style: 'margin-top:32px' },
    el('h1', { style: 'font-size:22px;margin:0 0 8px' }, 'Aplikasi tidak ditemukan'),
    el('p', { class: 'redup' }, 'Mungkin namanya berubah atau sedang tidak dijual.'),
    el('a', { class: 'tombol', href: '/katalog/' }, 'Kembali ke katalog')));
}

// Bagian perbandingan harga resmi vs IXVII.CO (paket dengan durasi sama, harga termurah yang tersedia).
function bagianBanding(app, resmi) {
  if (!resmi.length) return null;
  const baris = resmi.map((r) => {
    const sama = app.varian.filter((v) => v.s !== 0 && v.h === r.duration_days);
    const termurah = sama.length ? sama.reduce((a, b) => (b.p < a.p ? b : a)) : null;
    const hemat = termurah && termurah.p < r.price ? Math.round((1 - termurah.p / r.price) * 100) : null;
    return el('tr', {},
      el('td', {}, r.label, r.note ? el('div', { class: 'redup', style: 'font-size:12px' }, r.note) : null),
      el('td', { class: 'angka' }, rp(r.price)),
      el('td', { class: 'angka' }, termurah ? rp(termurah.p) : '–',
        termurah ? el('div', { class: 'redup', style: 'font-size:12px' }, `${termurah.tipe} · ${termurah.d}`) : null),
      el('td', { class: 'angka' }, hemat != null ? el('span', { class: 'hemat' }, `${hemat}%`) : '–'));
  });
  const dicek = resmi.map((r) => r.checked_at).filter(Boolean).sort().at(-1);
  return el('section', { class: 'grup kaca' },
    el('h2', {}, 'Bandingkan dengan harga resmi'),
    el('div', { style: 'overflow-x:auto' }, el('table', { class: 'banding' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Paket resmi'), el('th', { class: 'angka' }, 'Harga resmi'),
        el('th', { class: 'angka' }, 'Di IXVII.CO'), el('th', { class: 'angka' }, 'Hemat'))),
      el('tbody', {}, baris))),
    dicek ? el('p', { class: 'redup', style: 'font-size:12px;margin:10px 0 0' },
      `Harga resmi dicek ${new Date(dicek).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`) : null);
}

function bagianFaq(faqs) {
  if (!faqs.length) return null;
  return el('section', { class: 'grup kaca faq' },
    el('h2', {}, 'Tanya jawab'),
    faqs.map((f) => el('details', {}, el('summary', {}, f.question), el('p', {}, f.answer))));
}

function tampilkan(app, semua, detail) {
  document.title = `${app.nama} — IXVII.CO`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', `${app.nama} di IXVII.CO: ${app.desc}`);

  // ringkasan pilihan
  const namaPilihan = el('div', { class: 'redup' }, 'Belum ada paket dipilih.');
  const total = el('div', { class: 'total' }, '–');
  const tombol = el('button', { class: 'tombol', type: 'button', disabled: true }, 'Pesan sekarang');
  const ringkasan = el('aside', { class: 'ringkasan kaca', 'aria-label': 'Ringkasan pilihan' },
    el('h2', {}, 'Pilihanmu'), el('div', { class: 'pilihan' }, namaPilihan), total, tombol,
    el('p', { class: 'catatan' }, 'Pemesanan segera dibuka. Sementara ini, simpan dulu paket yang kamu incar.'));

  const pilih = (v) => {
    namaPilihan.textContent = `${v.tipe} · ${v.d}`;
    total.textContent = rp(v.p);
  };

  const grup = app.grup.map((g, gi) => el('section', { class: 'grup kaca' },
    el('h2', { id: `grup-${gi}` }, g.label),
    el('div', { class: 'paket', role: 'radiogroup', 'aria-labelledby': `grup-${gi}` },
      g.items.map((v) => {
        const habis = v.s === 0;
        const data = { ...v, tipe: g.label };
        return el('label', { class: 'opsi' + (habis ? ' habis' : '') },
          el('input', { type: 'radio', name: 'paket', value: v.id, disabled: habis, onchange: () => pilih(data) }),
          el('span', {}, el('span', { class: 'lbl' }, v.d), el('br'),
            el('span', { class: 'lencana ' + (habis ? 'habis' : 'ada') }, habis ? 'Habis' : 'Tersedia')),
          el('span', { class: 'hrg' }, rp(v.p)));
      }))));

  const lain = semua.filter((a) => a.kategori === app.kategori && a.slug !== app.slug && !a.habisSemua).slice(0, 4);

  isi.replaceChildren(
    el('nav', { class: 'remah', 'aria-label': 'Lokasi halaman' },
      el('a', { href: '/katalog/' }, 'Katalog'), ' / ',
      el('a', { href: `/katalog/?kategori=${encodeURIComponent(app.kategori)}` }, app.kategori), ' / ', app.nama),
    el('div', { class: 'kepala-app' }, ikonApp(app, true),
      el('div', {}, el('a', { class: 'kat', href: `/katalog/?kategori=${encodeURIComponent(app.kategori)}` }, app.kategori),
        el('h1', {}, app.nama))),
    el('p', { class: 'desk-app redup' }, app.desc),
    el('div', { class: 'tata-detail' },
      el('div', {}, grup, bagianBanding(app, detail.resmi), bagianFaq(detail.faqs)),
      ringkasan),
    lain.length ? el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, `${app.kategori} lainnya`),
        el('a', { href: `/katalog/?kategori=${encodeURIComponent(app.kategori)}` }, 'Lihat semua →')),
      el('div', { class: 'grid' }, lain.map(kartuApp))) : null);

  // pilih otomatis paket tersedia termurah
  const termurah = app.varian.filter((v) => v.s !== 0).sort((a, b) => a.p - b.p)[0];
  if (termurah) {
    const r = isi.querySelector(`input[value="${CSS.escape(termurah.id)}"]`);
    if (r) { r.checked = true; pilih(termurah); }
  }
}

async function muat() {
  isi.replaceChildren(el('div', { class: 'memuat', style: 'margin-top:32px;height:280px' }));
  try {
    const { apps } = await ambilKatalog();
    const app = apps.find((a) => a.slug === slug);
    if (!app) return tidakDitemukan();
    const detail = await ambilDetail(app.id);
    tampilkan(app, apps, detail);
  } catch {
    isi.replaceChildren(pesanGagal('Data aplikasi belum bisa dimuat. Periksa koneksi internet lalu coba lagi.', muat));
  }
}
muat();
