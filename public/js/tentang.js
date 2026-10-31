// Halaman Tentang: profil owner IXVII.CO (diatur dari panel admin → Mitra & profil).
import { ambilProfil, ambilToko } from './api.js';
import { inggris, t } from './i18n.js';
import { el, pasangKerangka, pesanGagal, tautanWa } from './ui.js';

pasangKerangka('/tentang/');

const isi = document.getElementById('isi');
const pilih = (id, en) => (inggris() && en ? en : id);
const FOTO_AWAL = '/assets/owner/rahul-paris.webp';

function tampilkan(p, toko) {
  const foto = p.photo_url || FOTO_AWAL;
  const sorotan = Array.isArray(p.highlights) ? p.highlights : [];
  const minat = (inggris() && p.interests_en?.length ? p.interests_en : p.interests) ?? [];
  const tentang = pilih(p.about, p.about_en) || '';
  isi.replaceChildren(
    el('section', { class: 'profil' },
      el('figure', { class: 'profil-foto' },
        el('img', { src: foto, alt: p.full_name || p.name, width: 720, height: 900, fetchpriority: 'high',
          onerror: (e) => { if (!e.target.src.endsWith('.jpg') && foto === FOTO_AWAL) e.target.src = '/assets/owner/rahul-paris.jpg'; } }),
        el('img', { class: 'emblem', src: '/assets/brand/emblem-putih.png', alt: '', width: 274, height: 183 })),
      el('div', { class: 'profil-teks' },
        el('p', { class: 'label' }, t('tentang.label')),
        el('h1', {}, p.name),
        p.full_name && p.full_name !== p.name ? el('p', { class: 'nama-lengkap' }, p.full_name) : null,
        el('div', { class: 'meta' },
          pilih(p.role, p.role_en) ? el('span', { class: 'lencana' }, pilih(p.role, p.role_en)) : null,
          pilih(p.city, p.city_en) ? el('span', { class: 'lencana' }, '📍 ', pilih(p.city, p.city_en)) : null),
        p.quote ? el('blockquote', { class: 'kutipan' }, `“${p.quote}”`) : null,
        el('div', { class: 'aksi' },
          toko?.whatsapp_number ? el('a', { class: 'tombol wa', href: tautanWa(toko.whatsapp_number, t('tentang.waPesan')), target: '_blank', rel: 'noopener' }, t('tentang.chat')) : null,
          el('a', { class: 'tombol garis', href: '/mitra/' }, t('tentang.mitra'))))),
    tentang ? el('section', { class: 'seksi profil-tentang' }, tentang.split(/\n{2,}/).map((para) => el('p', {}, para))) : null,
    sorotan.length ? el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, t('tentang.fokus'))),
      el('div', { class: 'poin fokus' }, sorotan.map((s, i) => el('div', { class: 'kaca' },
        el('span', { class: 'nomor' }, String(i + 1).padStart(2, '0')),
        el('h3', {}, pilih(s.title, s.title_en)), el('p', { class: 'redup' }, pilih(s.body, s.body_en)))))) : null,
    minat.length ? el('section', { class: 'seksi' },
      el('div', { class: 'seksi-kepala' }, el('h2', {}, t('tentang.luar'))),
      el('div', { class: 'minat' }, minat.map((m) => el('span', {}, m)))) : null);
}

async function muat() {
  isi.replaceChildren(el('div', { class: 'memuat', style: 'margin-top:40px;height:420px' }));
  try {
    const [profil, toko] = await Promise.all([ambilProfil(), ambilToko()]);
    if (!profil) { isi.replaceChildren(el('div', { class: 'kosong kaca', style: 'margin-top:40px' }, el('p', {}, t('tentang.kosong')))); return; }
    tampilkan(profil, toko);
  } catch (err) {
    console.error(err);
    isi.replaceChildren(pesanGagal(t('gagal.katalog'), muat));
  }
}
muat();
