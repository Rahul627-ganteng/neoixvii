// Menu Toko & konten: nomor WhatsApp, cara bayar, kurs dolar, buka/tutup pesanan,
// FAQ beranda, dan penjelasan tipe paket (Sharing, Private, ...).
import { el, isian, q, rapikanWa, rp, toast, waktu } from './alat.js';

const kata = (s) => String(s ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
/** Sama dengan pencocokan di website: kata kunci harus cocok utuh per kata. */
export const cocokKunci = (label, kunci) => ` ${kata(label).join(' ')} `.includes(` ${kata(kunci).join(' ')} `);

export async function halamanToko(supabase, halaman) {
  const [toko, faqs, tipe, grup] = await Promise.all([
    q(supabase.from('store_settings').select('*').eq('id', 1).maybeSingle()),
    q(supabase.from('site_faqs').select('*').order('sort').order('id')),
    q(supabase.from('plan_type_info').select('*').order('sort').order('id')),
    q(supabase.from('plan_groups').select('label,apps(name)')),
  ]);
  halaman.replaceChildren(kartuToko(supabase, toko ?? { id: 1, orders_open: true }), kartuFaq(supabase, faqs), kartuTipe(supabase, tipe, grup));
}

// ---------------------------------------------------------------- pengaturan toko
function kartuToko(supabase, s) {
  const wa = el('input', { type: 'tel', inputmode: 'tel', placeholder: '6281234567890', value: s.whatsapp_number || '' });
  const buka = el('input', { type: 'checkbox', id: 'pesananBuka' });
  buka.checked = s.orders_open !== false;
  const bayar = el('textarea', { placeholder: 'Contoh:\nTransfer BCA 1234567890 a.n. Nama\nQRIS / DANA / OVO 0812…\nKirim bukti transfer di chat ini.', value: s.payment_info || '' });
  const bayarEn = el('textarea', { placeholder: 'Opsional. Kalau kosong, versi Indonesia yang dikirim.', value: s.payment_info_en || '' });

  const manual = s.usd_rate_source === 'manual';
  const otomatis = el('input', { type: 'checkbox', id: 'kursOtomatis' });
  otomatis.checked = !manual;
  const kurs = el('input', { type: 'number', min: '1000', step: '1', value: s.usd_rate ?? '', disabled: !manual, 'aria-label': 'Kurs manual' });
  otomatis.addEventListener('change', () => { kurs.disabled = otomatis.checked; });
  const infoKurs = s.usd_rate
    ? `Sekarang 1 USD = ${rp(Math.round(s.usd_rate))} · sumber ${s.usd_rate_source || '–'} · diperbarui ${waktu(s.usd_rate_at)}`
    : 'Kurs belum ada. Isi manual dulu, atau tunggu fungsi kurs harian berjalan (butuh SUPABASE_SECRET_KEY di Netlify).';

  const simpan = el('button', { type: 'button' }, 'Simpan pengaturan toko');
  simpan.addEventListener('click', async () => {
    const nomor = rapikanWa(wa.value);
    if (nomor && (nomor.length < 9 || nomor.length > 15)) return toast('Nomor WhatsApp belum benar', true);
    const isi = {
      whatsapp_number: nomor || null,
      orders_open: buka.checked,
      payment_info: bayar.value.trim() || null,
      payment_info_en: bayarEn.value.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (!otomatis.checked) {
      const k = Number(kurs.value);
      if (!(k >= 5000 && k <= 50000)) return toast('Kurs manual harus antara 5.000 dan 50.000', true);
      Object.assign(isi, { usd_rate: k, usd_rate_source: 'manual', usd_rate_at: new Date().toISOString() });
    } else if (s.usd_rate_source === 'manual') {
      isi.usd_rate_source = 'otomatis (menunggu pembaruan harian)';
    }
    simpan.disabled = true;
    try {
      Object.assign(s, await q(supabase.from('store_settings').upsert({ id: 1, ...isi }).select().single()));
      wa.value = s.whatsapp_number || '';
      toast('Pengaturan toko tersimpan');
    } catch (err) { toast('Gagal: ' + err.message, true); }
    finally { simpan.disabled = false; }
  });

  return el('section', { class: 'card' },
    el('h2', {}, 'Pengaturan toko'),
    el('p', { class: 'sub' }, 'Tombol "Pesan sekarang" di website baru aktif setelah nomor WhatsApp diisi dan pemesanan dibuka.'),
    el('div', { class: 'grid2' },
      isian('Nomor WhatsApp toko', wa, 'Format internasional. 0812… otomatis diubah jadi 62812….'),
      el('div', {}, el('label', { class: 'f' }, 'Pemesanan'), el('div', { class: 'row' }, buka, el('label', { for: 'pesananBuka' }, 'Buka pemesanan di website')))),
    el('div', { class: 'grid2' },
      isian('Cara bayar (dikirim setelah pembeli membuat pesanan)', bayar),
      isian('Cara bayar, bahasa Inggris', bayarEn)),
    el('label', { class: 'f' }, 'Kurs dolar (untuk tampilan harga bahasa Inggris)'),
    el('div', { class: 'row' }, otomatis, el('label', { for: 'kursOtomatis' }, 'Perbarui otomatis setiap hari')),
    el('div', { class: 'grid2', style: 'margin-top:6px' }, isian('Kurs manual (Rp per 1 USD)', kurs, 'Hanya dipakai kalau pembaruan otomatis dimatikan.')),
    el('p', { class: 'muted' }, infoKurs),
    el('div', { class: 'row', style: 'margin-top:10px' }, simpan));
}

// ---------------------------------------------------------------- FAQ beranda
function kartuFaq(supabase, faqs) {
  const daftar = el('div');
  const form = (f) => {
    const tanya = el('input', { type: 'text', placeholder: 'Pertanyaan', value: f.question || '', 'aria-label': 'Pertanyaan' });
    const jawab = el('textarea', { placeholder: 'Jawaban', value: f.answer || '', 'aria-label': 'Jawaban' });
    const tanyaEn = el('input', { type: 'text', placeholder: 'Question', value: f.question_en || '', 'aria-label': 'Pertanyaan (Inggris)' });
    const jawabEn = el('textarea', { placeholder: 'Answer', value: f.answer_en || '', 'aria-label': 'Jawaban (Inggris)' });
    const urut = el('input', { type: 'number', step: '1', value: f.sort ?? (faqs.length + 1) * 10, style: 'width:90px', 'aria-label': 'Urutan' });
    const tampil = el('input', { type: 'checkbox', 'aria-label': 'Tampilkan di website' });
    tampil.checked = !!f.is_published;
    const status = el('span', { class: 'tag' });
    const gambarStatus = () => { status.className = 'tag ' + (f.is_published ? 'hijau' : 'kuning'); status.textContent = f.is_published ? 'tampil' : 'draf'; };
    gambarStatus();
    const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
    const hapus = el('button', { type: 'button', class: 'kecil bahaya' }, 'Hapus');
    const kotak = el('div', { class: 'item-form' },
      el('div', { class: 'row', style: 'justify-content:space-between' }, status,
        el('label', { class: 'row muted' }, tampil, 'Tampilkan di beranda'),
        el('label', { class: 'row muted' }, 'Urutan', urut)),
      el('div', { class: 'grid2' },
        el('div', {}, el('label', { class: 'f' }, 'Indonesia'), tanya, el('div', { style: 'height:6px' }), jawab),
        el('div', {}, el('label', { class: 'f' }, 'Inggris (opsional)'), tanyaEn, el('div', { style: 'height:6px' }), jawabEn)),
      el('div', { class: 'row', style: 'margin-top:8px' }, simpan, hapus));
    simpan.addEventListener('click', async () => {
      if (!tanya.value.trim()) return toast('Pertanyaan wajib diisi', true);
      if (tampil.checked && !jawab.value.trim()) return toast('Isi jawabannya dulu sebelum ditampilkan', true);
      const isi = {
        question: tanya.value.trim(), answer: jawab.value.trim(), question_en: tanyaEn.value.trim() || null, answer_en: jawabEn.value.trim() || null,
        sort: Math.round(Number(urut.value) || 0), is_published: tampil.checked, updated_at: new Date().toISOString(),
      };
      try {
        Object.assign(f, f.id ? await q(supabase.from('site_faqs').update(isi).eq('id', f.id).select().single())
          : await q(supabase.from('site_faqs').insert(isi).select().single()));
        gambarStatus();
        toast('FAQ tersimpan');
      } catch (err) { toast('Gagal: ' + err.message, true); }
    });
    hapus.addEventListener('click', async () => {
      if (f.id && !confirm('Hapus pertanyaan ini?')) return;
      try { if (f.id) await q(supabase.from('site_faqs').delete().eq('id', f.id)); kotak.remove(); toast('FAQ dihapus'); }
      catch (err) { toast('Gagal: ' + err.message, true); }
    });
    return kotak;
  };
  daftar.append(...faqs.map(form));
  const tambah = el('button', { type: 'button', class: 'sec kecil', onclick: () => { const f = {}; faqs.push(f); daftar.append(form(f)); } }, '+ Tambah pertanyaan');
  const draf = faqs.filter((f) => !f.is_published).length;
  return el('section', { class: 'card' },
    el('h2', {}, 'FAQ beranda'),
    el('p', { class: 'sub' }, 'Pertanyaan umum di halaman depan. ', draf ? el('b', {}, `${draf} draf menunggu jawabanmu`) : null,
      draf ? ' (soal pembayaran, pengiriman, dan garansi bergantung aturan tokomu, jadi sengaja dikosongkan).' : null),
    daftar, el('div', { class: 'row', style: 'margin-top:10px' }, tambah));
}

// ---------------------------------------------------------------- penjelasan tipe paket
function kartuTipe(supabase, tipe, grup) {
  const daftar = el('div');
  const belum = el('div', { class: 'row' });
  const gambarBelum = () => {
    const per = new Map();
    for (const g of grup) {
      if (tipe.some((t) => t.id && t.is_published && (t.keywords || []).some((k) => cocokKunci(g.label, k)))) continue;
      if (!per.has(g.label)) per.set(g.label, []);
      per.get(g.label).push(g.apps?.name);
    }
    belum.replaceChildren(...(per.size ? [...per].sort().map(([l, apps]) => el('span', { class: 'tag', title: apps.filter(Boolean).join(', ') }, l))
      : [el('span', { class: 'muted' }, 'Semua tipe paket sudah punya penjelasan.')]));
  };

  const form = (t) => {
    const kunci = el('input', { type: 'text', placeholder: 'mis. sharing, sharing 3u', value: (t.keywords || []).join(', '), 'aria-label': 'Kata kunci' });
    const f = (nama, ph, area = false) => el(area ? 'textarea' : 'input', area ? { placeholder: ph, value: t[nama] || '' } : { type: 'text', placeholder: ph, value: t[nama] || '' });
    const judul = f('title', 'Judul, mis. Sharing (akun bersama)'), judulEn = f('title_en', 'Title');
    const isi = f('body', 'Penjelasan singkat', true), isiEn = f('body_en', 'Short explanation', true);
    const plus = f('pros', 'Kelebihan, satu per baris', true), plusEn = f('pros_en', 'Pros, one per line', true);
    const min = f('cons', 'Kekurangan, satu per baris', true), minEn = f('cons_en', 'Cons, one per line', true);
    const tampil = el('input', { type: 'checkbox' });
    tampil.checked = t.is_published !== false;
    const simpan = el('button', { type: 'button', class: 'kecil' }, 'Simpan');
    const hapus = el('button', { type: 'button', class: 'kecil bahaya' }, 'Hapus');
    const kotak = el('div', { class: 'item-form' },
      el('div', { class: 'grid2' },
        isian('Kata kunci (dipisah koma)', kunci, 'Cocok kalau nama tipe paket mengandung kata ini secara utuh. "private" cocok dengan "Private (5 Profile)", tapi tidak dengan "Semiprivate".'),
        el('div', {}, el('label', { class: 'f' }, 'Tampil'), el('label', { class: 'row muted' }, tampil, 'Tampilkan di halaman aplikasi'))),
      el('div', { class: 'grid2' },
        el('div', {}, el('label', { class: 'f' }, 'Indonesia'), judul, el('div', { style: 'height:6px' }), isi,
          el('label', { class: 'f' }, 'Kelebihan'), plus, el('label', { class: 'f' }, 'Kekurangan'), min),
        el('div', {}, el('label', { class: 'f' }, 'Inggris (opsional)'), judulEn, el('div', { style: 'height:6px' }), isiEn,
          el('label', { class: 'f' }, 'Pros'), plusEn, el('label', { class: 'f' }, 'Cons'), minEn)),
      el('div', { class: 'row', style: 'margin-top:8px' }, simpan, hapus));
    simpan.addEventListener('click', async () => {
      const kk = kunci.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
      if (!kk.length || !judul.value.trim() || !isi.value.trim()) return toast('Isi kata kunci, judul, dan penjelasan', true);
      const baris = {
        keywords: kk, title: judul.value.trim(), title_en: judulEn.value.trim() || null, body: isi.value.trim(), body_en: isiEn.value.trim() || null,
        pros: plus.value.trim() || null, pros_en: plusEn.value.trim() || null, cons: min.value.trim() || null, cons_en: minEn.value.trim() || null,
        is_published: tampil.checked, updated_at: new Date().toISOString(),
      };
      try {
        Object.assign(t, t.id ? await q(supabase.from('plan_type_info').update(baris).eq('id', t.id).select().single())
          : await q(supabase.from('plan_type_info').insert({ ...baris, sort: (tipe.length + 1) * 10 }).select().single()));
        gambarBelum();
        toast('Penjelasan tersimpan');
      } catch (err) { toast('Gagal: ' + err.message, true); }
    });
    hapus.addEventListener('click', async () => {
      if (t.id && !confirm('Hapus penjelasan ini?')) return;
      try {
        if (t.id) await q(supabase.from('plan_type_info').delete().eq('id', t.id));
        tipe.splice(tipe.indexOf(t), 1); kotak.remove(); gambarBelum(); toast('Penjelasan dihapus');
      } catch (err) { toast('Gagal: ' + err.message, true); }
    });
    return kotak;
  };
  daftar.append(...tipe.map(form));
  gambarBelum();
  const tambah = el('button', { type: 'button', class: 'sec kecil', onclick: () => { const t = {}; tipe.push(t); daftar.append(form(t)); } }, '+ Tambah penjelasan');
  return el('section', { class: 'card' },
    el('h2', {}, 'Penjelasan tipe paket'),
    el('p', { class: 'sub' }, 'Tampil di halaman aplikasi bagian "Tentang tipe paket", lengkap dengan kelebihan dan kekurangannya.'),
    el('label', { class: 'f' }, 'Tipe paket yang belum punya penjelasan (arahkan kursor untuk melihat aplikasinya)'), belum,
    daftar, el('div', { class: 'row', style: 'margin-top:10px' }, tambah));
}
