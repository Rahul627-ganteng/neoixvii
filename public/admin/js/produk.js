// Menu Produk digital: produk yang dijual di /produk/ (ebook, template, preset, kelas, lainnya), harga & promo dengan
// hitung mundur, sampul, cara kirim (ebook otomatis ke rak / tautan / manual), antrean iklan mitra, ulasan, dan paket iklan.
// Angka terjual = pesanan web yang dibayar + "terjual di luar website" yang diisi admin (hanya penjualan asli).
import { el, hariIni, isian, q, rp, tabel, td, tautanWa, toast, waktu } from './alat.js';
import { renderIsi } from '/js/ebook-render.js';

const KATEGORI = { ebook: 'Ebook', template: 'Template', preset: 'Preset', kelas: 'Kelas', lainnya: 'Lainnya' };
const STATUS = { tayang: ['Tayang', 'hijau'], draf: ['Draf', ''], menunggu: ['Menunggu', 'kuning'], ditolak: ['Ditolak', 'merah'], berakhir: ['Berakhir', ''] };
const KIRIM = { ebook: 'Ebook → rak pembeli (otomatis)', tautan: 'Tautan unduhan (dikirim otomatis)', manual: 'Dikirim manual oleh admin', luar: 'Dibeli di toko lain (tautan beli)' };
const slugDari = (t) => String(t || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
// tanggal-jam WIB untuk <input type=datetime-local>
const keLokal = (iso) => (iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 16).replace(' ', 'T') : '');
const dariLokal = (v) => (v ? new Date(`${v}:00+07:00`).toISOString() : null);
const tambahHari = (n) => { const d = new Date(`${hariIni()}T12:00:00+07:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export async function halamanProduk(supabase, halaman) {
  let produk, stat, ulasan, paket, setelan, buku, rahasia;
  try {
    [produk, stat, ulasan, paket, setelan, buku, rahasia] = await Promise.all([
      q(supabase.from('produk').select('*').order('pemilik').order('urut').order('id')),
      q(supabase.rpc('produk_statistik')),
      q(supabase.from('produk_ulasan').select('*').order('created_at', { ascending: false }).limit(200)),
      q(supabase.from('iklan_paket').select('*').order('urut').order('id')),
      q(supabase.from('iklan_setelan').select('*').eq('id', 1).single()),
      q(supabase.from('ebook_buku').select('id,slug,judul').order('urut').order('id')),
      q(supabase.from('produk_rahasia').select('*')),
    ]);
  } catch (err) {
    halaman.replaceChildren(el('div', { class: 'card' }, el('h2', {}, 'Produk digital'),
      el('div', { class: 'msg warn' }, 'Jalankan migration 20261116000000_produk_digital.sql (lalu 20261117000000_ebook_koleksi.sql) di Supabase SQL Editor dulu. (', err.message, ')')));
    return;
  }
  const muatUlang = () => halamanProduk(supabase, halaman);
  const namaProduk = new Map(produk.map((p) => [p.id, p.nama]));
  const rahasiaDari = new Map(rahasia.map((r) => [r.produk_id, r]));
  const menunggu = produk.filter((p) => p.status === 'menunggu');
  const milikKita = produk.filter((p) => p.pemilik === 'ixvii');
  const mitra = produk.filter((p) => p.pemilik === 'mitra' && p.status !== 'menunggu');
  const totalOmzet = Object.values(stat).reduce((s, x) => s + Number(x.omzet || 0), 0);
  const totalTerjual = Object.values(stat).reduce((s, x) => s + Number(x.terjual_web || 0), 0);
  const editor = el('div');

  // ---------------------------------------------------------------- antrean iklan
  const kartuAntrean = el('section', { class: 'card' }, el('h2', {}, `Pengajuan iklan mitra (${menunggu.length})`),
    el('p', { class: 'sub' }, 'Periksa produknya (buka tautan toko), pastikan bukan bajakan atau barang terlarang. Setelah disetujui, minta penjual membayar paket tayang lewat WhatsApp. Iklan tampil berlabel "Iklan" dan otomatis turun setelah tanggal tayang habis.'),
    menunggu.length ? el('div', {}, menunggu.map((p) => {
      const pk = paket.find((k) => (p.paket_iklan || '').startsWith(k.nama));
      const sampai = el('input', { type: 'date', value: tambahHari(pk?.hari ?? 7), min: hariIni() });
      const setujui = el('button', { type: 'button', class: 'kecil' }, 'Setujui & tayangkan');
      const tolak = el('button', { type: 'button', class: 'kecil bahaya' }, 'Tolak');
      setujui.addEventListener('click', async () => {
        setujui.disabled = true;
        try { await q(supabase.from('produk').update({ status: 'tayang', iklan_sampai: sampai.value, updated_at: new Date().toISOString() }).eq('id', p.id)); toast('Iklan tayang'); muatUlang(); }
        catch (err) { toast(err.message, true); setujui.disabled = false; }
      });
      tolak.addEventListener('click', async () => {
        if (!confirm(`Tolak iklan "${p.nama}"?`)) return;
        try { await q(supabase.from('produk').update({ status: 'ditolak', updated_at: new Date().toISOString() }).eq('id', p.id)); toast('Iklan ditolak'); muatUlang(); }
        catch (err) { toast(err.message, true); }
      });
      const teksWa = `Halo ${p.penjual_nama}, iklan "${p.nama}" di IXVII.CO sudah kami periksa dan disetujui 🎉\nPaket: ${p.paket_iklan}\nSilakan transfer biaya tayang, lalu kirim bukti bayar di sini. Iklan langsung kami tayangkan.`;
      return el('div', { class: 'item-form' },
        el('div', { class: 'row', style: 'justify-content:space-between;align-items:flex-start' },
          el('div', {}, el('b', {}, p.nama), ' ', el('span', { class: 'tag' }, KATEGORI[p.kategori]), ' ', el('b', {}, rp(p.harga)), el('br'),
            el('span', { class: 'muted' }, `${p.penjual_nama} · `), p.penjual_wa ? el('a', { href: tautanWa(p.penjual_wa), target: '_blank', rel: 'noopener' }, `+${p.penjual_wa}`) : null,
            p.penjual_email ? el('span', { class: 'muted' }, ` · ${p.penjual_email}`) : null, el('br'),
            el('span', { class: 'muted' }, `Paket: ${p.paket_iklan || '–'} · diajukan ${waktu(p.created_at)}`), el('br'),
            el('a', { href: p.tautan_beli, target: '_blank', rel: 'noopener nofollow' }, p.tautan_beli),
            p.catatan_admin ? el('div', { class: 'muted' }, p.catatan_admin) : null),
          el('div', { class: 'row' }, el('label', { class: 'muted' }, 'Tayang sampai ', sampai), setujui, tolak,
            p.penjual_wa ? el('a', { class: 'btn sec kecil', href: tautanWa(p.penjual_wa, teksWa), target: '_blank', rel: 'noopener' }, 'Minta bayar via WA') : null,
            el('button', { type: 'button', class: 'sec kecil', onclick: () => bukaEditor(p) }, 'Ubah dulu'))),
        el('p', { style: 'white-space:pre-line;margin:8px 0 0' }, p.deskripsi || ''));
    })) : el('p', { class: 'muted' }, 'Tidak ada pengajuan baru.'));

  // ---------------------------------------------------------------- daftar produk
  const baris = (p) => {
    const s = stat[p.id] ?? {};
    const [label, kelas] = STATUS[p.status] ?? [p.status, ''];
    const promoAktif = p.harga_promo != null && (!p.promo_mulai || Date.parse(p.promo_mulai) <= Date.now()) && (!p.promo_sampai || Date.parse(p.promo_sampai) > Date.now());
    const iklanHabis = p.pemilik === 'mitra' && p.iklan_sampai && p.iklan_sampai < hariIni();
    return el('tr', {},
      td(el('div', { class: 'row', style: 'gap:10px;flex-wrap:nowrap' },
        el('span', { class: 'adm-sampul kecil' }, p.cover_url ? el('img', { src: p.cover_url, alt: '' }) : null),
        el('span', {}, el('b', {}, p.nama), p.unggulan ? el('span', { class: 'tag biru', style: 'margin-left:6px' }, 'unggulan') : null, el('br'),
          el('span', { class: 'muted' }, `${KATEGORI[p.kategori]} · ${p.pemilik === 'mitra' ? `mitra: ${p.penjual_nama || '–'}` : KIRIM[p.tipe_kirim].split(' (')[0]}`)))),
      td(el('span', {}, promoAktif ? [el('b', {}, rp(p.harga_promo)), ' ', el('s', { class: 'muted' }, rp(p.harga))] : rp(p.harga),
        promoAktif && p.promo_sampai ? [el('br'), el('span', { class: 'muted' }, `promo s/d ${waktu(p.promo_sampai)}${p.hitung_mundur ? ' · ⏱' : ''}`)] : null)),
      td(el('span', { class: 'tag ' + kelas }, label), iklanHabis ? el('span', { class: 'tag merah', style: 'margin-left:4px' }, 'masa tayang habis') : null,
        p.pemilik === 'mitra' && p.iklan_sampai ? el('div', { class: 'muted' }, `tayang s/d ${p.iklan_sampai}`) : null),
      td(`${Number(s.terjual_web || 0) + p.terjual_luar}`, true),
      td(s.rating ? `★ ${String(s.rating).replace('.', ',')} (${s.ulasan})` : '–'),
      td(rp(s.omzet || 0), true),
      td(el('div', { class: 'row', style: 'gap:4px' },
        el('button', { type: 'button', class: 'kecil', onclick: () => bukaEditor(p) }, 'Ubah'),
        p.status === 'tayang' ? el('a', { class: 'btn sec kecil', href: `/produk/?p=${p.slug}`, target: '_blank', rel: 'noopener' }, 'Lihat ↗') : null)));
  };
  const kartuDaftar = el('section', { class: 'card' }, el('h2', {}, 'Produk IXVII.CO'),
    el('p', { class: 'sub' }, 'Produk tampil di halaman Produk Digital kalau statusnya Tayang. Terjual dihitung dari pesanan website yang sudah dibayar ditambah penjualan asli di luar website yang kamu catat. Rating hanya dari ulasan pembeli.'),
    el('div', { class: 'row', style: 'margin-bottom:10px' },
      el('button', { type: 'button', onclick: () => bukaEditor({ pemilik: 'ixvii', kategori: 'ebook', tipe_kirim: 'ebook', status: 'draf', harga: 0, terjual_luar: 0, hitung_mundur: true }) }, '+ Produk baru'),
      el('a', { class: 'btn sec', href: '/produk/', target: '_blank', rel: 'noopener' }, 'Buka halaman Produk Digital ↗')),
    milikKita.length ? tabel(['Produk', 'Harga', 'Status', '>Terjual', 'Rating', '>Omzet', ''], milikKita.map(baris)) : el('p', { class: 'muted' }, 'Belum ada produk.'));
  const kartuMitra = el('section', { class: 'card' }, el('h2', {}, `Iklan mitra (${mitra.length})`),
    mitra.length ? tabel(['Produk', 'Harga', 'Status', '>Terjual', 'Rating', '>Omzet', ''], mitra.map(baris)) : el('p', { class: 'muted' }, 'Belum ada iklan mitra.'));

  // ---------------------------------------------------------------- editor produk
  function bukaEditor(p) {
    const r = rahasiaDari.get(p.id) ?? {};
    const f = {
      nama: el('input', { type: 'text', value: p.nama || '', maxlength: 120 }),
      slug: el('input', { type: 'text', value: p.slug || '', maxlength: 80, placeholder: 'otomatis dari nama' }),
      subjudul: el('input', { type: 'text', value: p.subjudul || '', maxlength: 200 }),
      kategori: el('select', {}, Object.entries(KATEGORI).map(([k, v]) => el('option', { value: k, selected: k === p.kategori }, v))),
      format: el('input', { type: 'text', value: p.format || '', maxlength: 80, placeholder: 'mis. Ebook interaktif · 6 bab' }),
      cover_url: el('input', { type: 'text', value: p.cover_url || '', placeholder: '/assets/produk/… atau https://…' }),
      harga: el('input', { type: 'number', min: 0, step: 1000, value: p.harga ?? 0 }),
      harga_promo: el('input', { type: 'number', min: 0, step: 1000, value: p.harga_promo ?? '', placeholder: 'kosong = tanpa promo' }),
      promo_mulai: el('input', { type: 'datetime-local', value: keLokal(p.promo_mulai) }),
      promo_sampai: el('input', { type: 'datetime-local', value: keLokal(p.promo_sampai) }),
      label_promo: el('input', { type: 'text', value: p.label_promo || '', maxlength: 40, placeholder: 'mis. Harga peluncuran' }),
      hitung_mundur: el('input', { type: 'checkbox', checked: p.hitung_mundur !== false }),
      hpp: el('input', { type: 'number', min: 0, step: 500, value: p.hpp ?? '', placeholder: 'tidak tampil di website' }),
      terjual_luar: el('input', { type: 'number', min: 0, value: p.terjual_luar ?? 0 }),
      tipe_kirim: el('select', {}, Object.entries(KIRIM).map(([k, v]) => el('option', { value: k, selected: k === p.tipe_kirim }, v))),
      buku_id: el('select', {}, el('option', { value: '' }, '– pilih ebook –'), buku.map((k) => el('option', { value: k.id, selected: k.id === p.buku_id }, k.judul))),
      tautan_rahasia: el('input', { type: 'url', value: r.tautan || '', placeholder: 'https://drive.google.com/…' }),
      pesan_rahasia: el('textarea', { rows: 3, maxlength: 1500, value: r.pesan || '', placeholder: 'Pesan tambahan untuk pembeli (cara pakai, kode akses, dsb.)' }),
      tautan_beli: el('input', { type: 'url', value: p.tautan_beli || '', placeholder: 'https://…' }),
      pemilik: el('select', {}, el('option', { value: 'ixvii', selected: p.pemilik !== 'mitra' }, 'IXVII.CO'), el('option', { value: 'mitra', selected: p.pemilik === 'mitra' }, 'Mitra (iklan)')),
      penjual_nama: el('input', { type: 'text', value: p.penjual_nama || '', maxlength: 60 }),
      penjual_wa: el('input', { type: 'tel', value: p.penjual_wa || '' }),
      iklan_sampai: el('input', { type: 'date', value: p.iklan_sampai || '' }),
      status: el('select', {}, Object.entries(STATUS).map(([k, [v]]) => el('option', { value: k, selected: k === p.status }, v))),
      unggulan: el('input', { type: 'checkbox', checked: !!p.unggulan }),
      urut: el('input', { type: 'number', value: p.urut ?? 0 }),
      deskripsi: el('textarea', { class: 'eb-adm-teks', rows: 12, value: p.deskripsi || '', spellcheck: 'false' }),
      isi: el('textarea', { rows: 6, value: p.isi || '', placeholder: 'Satu baris satu poin, mis.\n6 bab bergambar\nKalkulator tarif' }),
    };
    if (!p.id) f.nama.addEventListener('input', () => { if (!f.slug.dataset.diubah) f.slug.value = slugDari(f.nama.value); });
    f.slug.addEventListener('input', () => { f.slug.dataset.diubah = '1'; });
    const contoh = el('div', { class: 'adm-sampul' }, p.cover_url ? el('img', { src: p.cover_url, alt: '' }) : el('span', {}, 'Belum ada sampul'));
    f.cover_url.addEventListener('change', () => contoh.replaceChildren(f.cover_url.value ? el('img', { src: f.cover_url.value, alt: '' }) : el('span', {}, 'Belum ada sampul')));
    const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'hidden' });
    file.addEventListener('change', async () => {
      const x = file.files[0];
      if (!x) return;
      if (x.size > 3 * 1024 * 1024) { file.value = ''; return toast('Gambar maksimal 3 MB', true); }
      try {
        const ext = (x.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `sampul-${slugDari(f.slug.value || f.nama.value) || 'produk'}-${Date.now()}.${ext}`;
        await q(supabase.storage.from('produk').upload(path, x, { contentType: x.type, cacheControl: '31536000' }));
        f.cover_url.value = supabase.storage.from('produk').getPublicUrl(path).data.publicUrl;
        contoh.replaceChildren(el('img', { src: f.cover_url.value, alt: '' }));
        toast('Sampul diunggah');
      } catch (err) { toast('Gagal mengunggah: ' + err.message, true); }
      file.value = '';
    });
    // pratinjau deskripsi (format sama dengan ebook)
    const pratinjau = el('div', { class: 'eb-pratinjau eb-teks' });
    const gambarPratinjau = () => pratinjau.replaceChildren(...renderIsi(f.deskripsi.value, { progres: {} }));
    let jeda;
    f.deskripsi.addEventListener('input', () => { clearTimeout(jeda); jeda = setTimeout(gambarPratinjau, 250); });
    gambarPratinjau();
    // tampilkan kolom sesuai cara kirim & pemilik
    const grupEbook = el('div', {}, isian('Ebook yang masuk rak pembeli', f.buku_id, 'Buat atau ubah isinya di menu Ebook & rak.'));
    const grupTautan = el('div', { class: 'grid2' }, isian('Tautan produk (rahasia, dikirim setelah bayar)', f.tautan_rahasia), isian('Pesan untuk pembeli', f.pesan_rahasia));
    const grupLuar = el('div', {}, isian('Tautan beli (toko penjual / halaman luar)', f.tautan_beli));
    const grupMitra = el('div', { class: 'grid2' }, isian('Nama penjual', f.penjual_nama), isian('WhatsApp penjual', f.penjual_wa), isian('Iklan tayang sampai', f.iklan_sampai));
    const atur = () => {
      const mitraP = f.pemilik.value === 'mitra';
      if (mitraP) f.tipe_kirim.value = 'luar';
      // pakai kelas .hidden: .grid2 punya display:grid yang mengalahkan atribut hidden
      grupEbook.classList.toggle('hidden', f.tipe_kirim.value !== 'ebook');
      grupTautan.classList.toggle('hidden', !['tautan', 'manual'].includes(f.tipe_kirim.value));
      grupLuar.classList.toggle('hidden', f.tipe_kirim.value !== 'luar');
      grupMitra.classList.toggle('hidden', !mitraP);
      f.tipe_kirim.disabled = mitraP;
    };
    f.tipe_kirim.addEventListener('change', atur);
    f.pemilik.addEventListener('change', atur);
    atur();

    const simpan = el('button', { type: 'button' }, p.id ? 'Simpan produk' : 'Buat produk');
    simpan.addEventListener('click', async () => {
      const nama = f.nama.value.trim();
      const slug = slugDari(f.slug.value || nama);
      if (nama.length < 3) return toast('Nama produk minimal 3 huruf', true);
      if (slug.length < 3) return toast('Slug minimal 3 huruf', true);
      const hp = f.harga_promo.value === '' ? null : Number(f.harga_promo.value);
      if (hp != null && hp >= Number(f.harga.value)) return toast('Harga promo harus lebih murah dari harga normal', true);
      if (f.tipe_kirim.value === 'ebook' && !f.buku_id.value) return toast('Pilih ebook yang masuk rak pembeli', true);
      if (f.tipe_kirim.value === 'luar' && !/^https:\/\//.test(f.tautan_beli.value.trim())) return toast('Isi tautan beli yang diawali https://', true);
      const data = {
        nama, slug, subjudul: f.subjudul.value.trim() || null, kategori: f.kategori.value, format: f.format.value.trim() || null,
        cover_url: f.cover_url.value.trim() || null, harga: Number(f.harga.value || 0), harga_promo: hp,
        promo_mulai: dariLokal(f.promo_mulai.value), promo_sampai: dariLokal(f.promo_sampai.value), label_promo: f.label_promo.value.trim() || null,
        hitung_mundur: f.hitung_mundur.checked, hpp: f.hpp.value === '' ? null : Number(f.hpp.value), terjual_luar: Math.max(0, Number(f.terjual_luar.value || 0)),
        tipe_kirim: f.pemilik.value === 'mitra' ? 'luar' : f.tipe_kirim.value, buku_id: f.tipe_kirim.value === 'ebook' ? Number(f.buku_id.value) : null,
        tautan_beli: f.tautan_beli.value.trim() || null, pemilik: f.pemilik.value,
        penjual_nama: f.penjual_nama.value.trim() || null, penjual_wa: f.penjual_wa.value.replace(/\D/g, '').replace(/^0/, '62') || null,
        iklan_sampai: f.iklan_sampai.value || null, status: f.status.value, unggulan: f.unggulan.checked, urut: Number(f.urut.value || 0),
        deskripsi: f.deskripsi.value.trim() || null, isi: f.isi.value.trim() || null, updated_at: new Date().toISOString(),
      };
      simpan.disabled = true;
      try {
        const hasil = p.id ? await q(supabase.from('produk').update(data).eq('id', p.id).select().single())
          : await q(supabase.from('produk').insert(data).select().single());
        if (['tautan', 'manual'].includes(data.tipe_kirim) && (f.tautan_rahasia.value.trim() || f.pesan_rahasia.value.trim() || rahasiaDari.has(hasil.id))) {
          await q(supabase.from('produk_rahasia').upsert({ produk_id: hasil.id, tautan: f.tautan_rahasia.value.trim() || null, pesan: f.pesan_rahasia.value.trim() || null, updated_at: new Date().toISOString() }, { onConflict: 'produk_id' }));
        }
        if (data.unggulan) await q(supabase.from('produk').update({ unggulan: false }).neq('id', hasil.id).eq('unggulan', true));
        toast('Produk tersimpan'); muatUlang();
      } catch (err) { toast('Gagal: ' + err.message, true); simpan.disabled = false; }
    });
    const hapus = el('button', { type: 'button', class: 'bahaya' }, 'Hapus');
    hapus.addEventListener('click', async () => {
      if (!confirm(`Hapus "${p.nama}"? Riwayat pesanan tetap ada. Kalau hanya ingin menyembunyikan, ubah status ke Draf.`)) return;
      try { await q(supabase.from('produk').delete().eq('id', p.id)); toast('Produk dihapus'); muatUlang(); }
      catch (err) { toast(err.message, true); }
    });

    editor.replaceChildren(el('section', { class: 'card', id: 'editorProduk' },
      el('h2', {}, p.id ? `Ubah: ${p.nama}` : 'Produk baru'),
      el('div', { class: 'adm-buku' },
        el('div', {}, contoh, el('button', { type: 'button', class: 'sec kecil', style: 'margin-top:8px', onclick: () => file.click() }, 'Unggah sampul…'), file),
        el('div', { class: 'grid2' }, isian('Nama produk (headline)', f.nama), isian('Slug (alamat halaman)', f.slug), isian('Subjudul', f.subjudul),
          isian('Kategori', f.kategori), isian('Format', f.format), isian('Gambar sampul (3:4)', f.cover_url))),
      el('h3', {}, 'Harga & promo'),
      el('div', { class: 'grid2' }, isian('Harga normal (Rp)', f.harga), isian('Harga promo (Rp)', f.harga_promo, 'Harga coret = harga normal. Pastikan harga normal memang pernah berlaku.'),
        isian('Promo mulai (WIB)', f.promo_mulai, 'Kosong = mulai sekarang'), isian('Promo berakhir (WIB)', f.promo_sampai, 'Kosong = tanpa batas waktu'),
        isian('Label promo', f.label_promo), el('label', { class: 'row muted', style: 'align-self:end' }, f.hitung_mundur, 'Tampilkan hitung mundur promo'),
        isian('HPP / modal (rahasia)', f.hpp), isian('Terjual di luar website', f.terjual_luar, 'Isi hanya penjualan asli di luar website (mis. lewat WA sebelum toko ini dibuka). Pesanan website dihitung otomatis.')),
      el('h3', {}, 'Pengiriman'),
      el('div', { class: 'grid2' }, isian('Pemilik', f.pemilik), isian('Cara kirim', f.tipe_kirim)),
      grupEbook, grupTautan, grupLuar, grupMitra,
      el('h3', {}, 'Tampilan'),
      el('div', { class: 'grid2' }, isian('Status', f.status), isian('Urutan', f.urut), el('label', { class: 'row muted', style: 'align-self:end' }, f.unggulan, 'Jadikan produk unggulan (paling atas)')),
      isian('Yang didapat pembeli (satu baris satu poin)', f.isi),
      el('div', { class: 'eb-adm-dua' },
        el('div', {}, el('label', { class: 'f' }, 'Deskripsi (format sama dengan ebook: ## judul, - daftar, :::kartu, :::tips …)'), f.deskripsi),
        el('div', {}, el('label', { class: 'f' }, 'Pratinjau'), el('div', { class: 'eb-pratinjau-wadah' }, pratinjau))),
      el('div', { class: 'row gen-aksi', style: 'margin-top:12px' }, simpan, p.id ? hapus : null, el('button', { type: 'button', class: 'sec', onclick: () => editor.replaceChildren() }, 'Tutup'))));
    editor.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  // ---------------------------------------------------------------- ulasan
  const fUProduk = el('select', {}, milikKita.map((p) => el('option', { value: p.id }, p.nama)));
  const fUNama = el('input', { type: 'text', maxlength: 60 });
  const fUBintang = el('select', {}, [5, 4, 3, 2, 1].map((n) => el('option', { value: n }, '★'.repeat(n))));
  const fUTeks = el('textarea', { rows: 2, maxlength: 600 });
  const tambahU = el('button', { type: 'button', class: 'kecil' }, 'Tambah ulasan');
  tambahU.addEventListener('click', async () => {
    if (fUNama.value.trim().length < 1) return toast('Isi nama pembeli', true);
    if (!confirm('Pastikan ini ulasan asli dari pembeli (mis. dari chat WhatsApp) dan kamu sudah minta izin menampilkannya.')) return;
    try {
      await q(supabase.from('produk_ulasan').insert({ produk_id: Number(fUProduk.value), nama: fUNama.value.trim(), bintang: Number(fUBintang.value), teks: fUTeks.value.trim() || null, sumber: 'luar' }));
      toast('Ulasan ditambahkan'); muatUlang();
    } catch (err) { toast(err.message, true); }
  });
  const kartuUlasan = el('section', { class: 'card' }, el('h2', {}, `Ulasan produk (${ulasan.length})`),
    el('p', { class: 'sub' }, 'Ulasan dari website hanya bisa ditulis pembeli yang sudah bayar (kode pesanan + nomor WA) dan ditandai "pembeli terverifikasi". Sembunyikan ulasan yang tidak pantas. Ulasan dari luar website ditandai berbeda.'),
    ulasan.length ? tabel(['Produk', 'Ulasan', 'Sumber', 'Tampil', ''], ulasan.map((u) => {
      const tampil = el('input', { type: 'checkbox', checked: u.tampil });
      tampil.addEventListener('change', async () => {
        try { await q(supabase.from('produk_ulasan').update({ tampil: tampil.checked }).eq('id', u.id)); toast(tampil.checked ? 'Ulasan ditampilkan' : 'Ulasan disembunyikan'); }
        catch (err) { toast(err.message, true); tampil.checked = !tampil.checked; }
      });
      const hapus = el('button', { type: 'button', class: 'kecil bahaya' }, 'Hapus');
      hapus.addEventListener('click', async () => { if (confirm('Hapus ulasan ini?')) { try { await q(supabase.from('produk_ulasan').delete().eq('id', u.id)); muatUlang(); } catch (err) { toast(err.message, true); } } });
      return el('tr', {}, td(namaProduk.get(u.produk_id) ?? '–'),
        td(el('span', {}, el('b', {}, '★'.repeat(u.bintang)), ` ${u.nama} · ${waktu(u.created_at)}`, u.teks ? [el('br'), el('span', { class: 'muted' }, u.teks)] : null)),
        td(el('span', { class: 'tag ' + (u.sumber === 'pembeli' ? 'hijau' : '') }, u.sumber === 'pembeli' ? 'pembeli web' : 'di luar web')),
        td(tampil), td(hapus));
    })) : el('p', { class: 'muted' }, 'Belum ada ulasan.'),
    el('details', { class: 'item-form' }, el('summary', {}, 'Tambah ulasan asli dari luar website'),
      el('div', { class: 'grid2', style: 'margin-top:10px' }, isian('Produk', fUProduk), isian('Nama pembeli', fUNama), isian('Bintang', fUBintang), isian('Isi ulasan', fUTeks)),
      el('div', { class: 'row', style: 'margin-top:10px' }, tambahU)));

  // ---------------------------------------------------------------- pengaturan iklan
  const aktifIklan = el('input', { type: 'checkbox', checked: setelan.aktif });
  const syarat = el('textarea', { rows: 5, value: setelan.syarat });
  const simpanSetelan = el('button', { type: 'button', class: 'kecil' }, 'Simpan pengaturan iklan');
  simpanSetelan.addEventListener('click', async () => {
    try { await q(supabase.from('iklan_setelan').update({ aktif: aktifIklan.checked, syarat: syarat.value.trim() }).eq('id', 1)); toast('Pengaturan iklan tersimpan'); }
    catch (err) { toast(err.message, true); }
  });
  const barisPaket = (k) => {
    const nama = el('input', { type: 'text', value: k.nama || '', maxlength: 60 });
    const hari = el('input', { type: 'number', min: 1, max: 365, value: k.hari ?? 7, style: 'width:90px' });
    const harga = el('input', { type: 'number', min: 0, step: 1000, value: k.harga ?? 0, style: 'width:120px' });
    const aktif = el('input', { type: 'checkbox', checked: k.aktif !== false });
    const simpanP = el('button', { type: 'button', class: 'sec kecil' }, k.id ? 'Simpan' : 'Tambah');
    simpanP.addEventListener('click', async () => {
      const d = { nama: nama.value.trim(), hari: Number(hari.value), harga: Number(harga.value), aktif: aktif.checked };
      try {
        if (k.id) await q(supabase.from('iklan_paket').update(d).eq('id', k.id));
        else await q(supabase.from('iklan_paket').insert({ ...d, urut: (paket.at(-1)?.urut ?? 0) + 1 }));
        toast('Paket tersimpan'); muatUlang();
      } catch (err) { toast(err.message, true); }
    });
    return el('tr', {}, td(nama), td(hari), td(harga), td(aktif), td(simpanP));
  };
  const kartuSetelan = el('section', { class: 'card' }, el('h2', {}, 'Pengaturan iklan mitra'),
    el('p', { class: 'sub' }, 'Halaman pengajuan: ', el('a', { href: '/produk/iklan/', target: '_blank', rel: 'noopener' }, `${location.origin}/produk/iklan/`), '. Harga paket di bawah hanya contoh awal, sesuaikan dengan harga yang kamu mau.'),
    el('label', { class: 'row muted' }, aktifIklan, 'Terima pengajuan iklan baru'),
    isian('Syarat iklan (satu baris satu poin)', syarat),
    el('div', { class: 'row', style: 'margin:10px 0 16px' }, simpanSetelan),
    tabel(['Nama paket', 'Hari', 'Harga (Rp)', 'Aktif', ''], [...paket.map(barisPaket), barisPaket({})]));

  halaman.replaceChildren(
    el('div', { class: 'stats' },
      el('div', { class: 'stat' }, el('b', {}, milikKita.filter((p) => p.status === 'tayang').length), el('span', {}, 'Produk tayang')),
      el('div', { class: 'stat' + (menunggu.length ? ' kuning' : '') }, el('b', {}, menunggu.length), el('span', {}, 'Iklan menunggu')),
      el('div', { class: 'stat' }, el('b', {}, totalTerjual), el('span', {}, 'Terjual di website')),
      el('div', { class: 'stat' }, el('b', {}, rp(totalOmzet)), el('span', {}, 'Omzet produk digital'))),
    kartuAntrean, editor, kartuDaftar, kartuMitra, kartuUlasan, kartuSetelan);
}
