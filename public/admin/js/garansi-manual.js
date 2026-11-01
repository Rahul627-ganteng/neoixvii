// Aktifkan garansi langsung dari pesanan (tanpa pembeli mengisi form).
// Data diambil dari pesanan; screenshot login bisa dipilih dari galeri, diseret, atau ditempel (Ctrl+V).
import { el, isian, q, toast, waktu } from './alat.js';

const MAKS = 8 * 1024 * 1024;

/** Kecilkan gambar ke sisi terpanjang 1600 px, JPEG ~82%, supaya cepat terunggah dari HP. */
async function kecilkan(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, gagal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = gagal; i.src = url; });
    const skala = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * skala); c.height = Math.round(img.naturalHeight * skala);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
  } finally { URL.revokeObjectURL(url); }
}

/** o = baris pesanan (code, customer_name, customer_wa, created_at, delivered_at, order_items). */
export function formGaransiManual(supabase, o, { selesai, tutup }) {
  let ss = null;
  const apps = [...new Set((o.order_items ?? []).map((i) => i.app_name))].join(', ');
  const tepat = o.delivered_at ? Date.now() <= Date.parse(o.delivered_at) + 864e5 : null;
  const device = el('input', { type: 'text', maxlength: 120, placeholder: 'mis. iPhone 13, Smart TV (opsional)' });
  const catatan = el('input', { type: 'text', maxlength: 200, placeholder: 'Opsional' });
  const pratinjau = el('img', { class: 'ss-admin', alt: 'Screenshot login', hidden: true });
  const info = el('span', { class: 'muted' }, 'Belum ada screenshot (opsional)');
  const file = el('input', { type: 'file', accept: 'image/*', class: 'tersembunyi', 'aria-label': 'Pilih screenshot login' });
  const zona = el('div', { class: 'zona-ss', tabindex: '0', role: 'button', 'aria-label': 'Tempel, seret, atau pilih screenshot login' },
    el('b', {}, 'Screenshot login'), el('span', {}, 'Ketuk untuk pilih dari galeri, seret gambar ke sini, atau tempel (Ctrl+V)'), info, pratinjau);

  async function pakai(berkas) {
    if (!berkas || !/^image\//.test(berkas.type)) return toast('Itu bukan gambar', true);
    if (berkas.size > MAKS) return toast('Gambar maksimal 8 MB', true);
    try {
      ss = await kecilkan(berkas);
      pratinjau.src = URL.createObjectURL(ss); pratinjau.hidden = false;
      info.textContent = `Siap diunggah (${Math.round(ss.size / 1024)} KB)`;
    } catch { toast('Gambar tidak bisa dibaca', true); }
  }
  zona.addEventListener('click', () => file.click());
  zona.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  file.addEventListener('change', () => { pakai(file.files[0]); file.value = ''; });
  zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('aktif'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('aktif'));
  zona.addEventListener('drop', (e) => { e.preventDefault(); zona.classList.remove('aktif'); pakai(e.dataTransfer.files[0]); });
  // tempel dari clipboard selama form terbuka
  const tempel = (e) => {
    if (!kotak.isConnected) { document.removeEventListener('paste', tempel); return; }
    const gambar = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
    if (gambar) { e.preventDefault(); pakai(gambar.getAsFile()); }
  };
  document.addEventListener('paste', tempel);

  const simpan = el('button', { type: 'button' }, 'Aktifkan garansi');
  simpan.addEventListener('click', async () => {
    simpan.disabled = true;
    try {
      let path = null;
      if (ss) {
        simpan.textContent = 'Mengunggah screenshot…';
        path = `admin/${o.code}-${Date.now()}.jpg`;
        await q(supabase.storage.from('garansi').upload(path, ss, { contentType: 'image/jpeg' }));
      }
      simpan.textContent = 'Menyimpan…';
      const h = await q(supabase.rpc('aktifkan_garansi_admin', { p_kode: o.code, p_device: device.value.trim() || null, p_screenshot: path, p_catatan: catatan.value.trim() || null }));
      toast(`Garansi ${o.code} aktif ✓`);
      document.removeEventListener('paste', tempel);
      selesai?.(h);
    } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; simpan.textContent = 'Aktifkan garansi'; }
  });

  const kotak = el('div', { class: 'item-form form-garansi-manual' },
    el('div', { class: 'row', style: 'justify-content:space-between' }, el('b', {}, `Aktifkan garansi ${o.code}`),
      el('button', { type: 'button', class: 'sec kecil', onclick: () => { document.removeEventListener('paste', tempel); tutup?.(); } }, 'Batal')),
    el('div', { class: 'muted', style: 'margin-top:4px' }, `${o.customer_name}${o.customer_wa ? ` · +${o.customer_wa}` : ''} · ${apps}`),
    el('div', { class: 'muted' }, o.delivered_at ? `Akun dikirim ${waktu(o.delivered_at)} · ${tepat ? 'masih dalam 1x24 jam' : 'sudah lewat 1x24 jam (tetap bisa kamu aktifkan)'}` : 'Waktu kirim akun tidak tercatat'),
    el('div', { class: 'grid2', style: 'margin-top:6px' }, isian('Device yang dipakai', device), isian('Catatan', catatan)),
    zona, file,
    el('div', { class: 'row', style: 'margin-top:10px' }, simpan));
  return kotak;
}
