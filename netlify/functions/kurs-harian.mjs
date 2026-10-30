// Fungsi terjadwal Netlify: memperbarui kurs USD → IDR sekali sehari.
// Sumber: Frankfurter (kurs acuan bank sentral, gratis, tanpa API key).
//
// Butuh environment variable di Netlify (Site configuration → Environment variables):
//   SUPABASE_SECRET_KEY = secret key Supabase (sb_secret_...). JANGAN ditaruh di repo atau di kode website.
// Kalau admin mengisi kurs manual di panel (sumber "manual"), fungsi ini tidak menimpanya.
export const config = { schedule: '@daily' };

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dokzzrrgdjyzxdhmjqkr.supabase.co';
const SUMBER = [
  'https://api.frankfurter.dev/v2/rates?base=usd&quotes=idr',
  'https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR',
];
const BATAS = { min: 5000, maks: 50000 };   // kurs di luar rentang ini dianggap salah

/** Ambil kurs IDR dari jawaban Frankfurter (format v2 berupa daftar, format v1 berupa objek "rates"). */
export function cariKurs(data) {
  for (const d of Array.isArray(data) ? data : [data]) {
    if (!d || typeof d !== 'object') continue;
    if (String(d.quote ?? '').toUpperCase() === 'IDR' && Number(d.rate) > 0) return { kurs: Number(d.rate), tanggal: d.date ?? null };
    const r = Number(d.rates?.IDR ?? d.rates?.idr);
    if (r > 0) return { kurs: r, tanggal: d.date ?? null };
  }
  return null;
}

export const kursMasukAkal = (k) => Number.isFinite(k) && k >= BATAS.min && k <= BATAS.maks;

export default async () => {
  const kunci = process.env.SUPABASE_SECRET_KEY;
  if (!kunci) {
    console.error('SUPABASE_SECRET_KEY belum diisi di Netlify. Kurs tidak diperbarui.');
    return new Response('SUPABASE_SECRET_KEY belum diisi', { status: 500 });
  }

  let hasil = null;
  for (const url of SUMBER) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) { console.warn(`Sumber kurs ${url} menjawab ${res.status}`); continue; }
      hasil = cariKurs(await res.json());
      if (hasil) break;
    } catch (e) {
      console.warn(`Sumber kurs ${url} gagal: ${e.message}`);
    }
  }
  if (!hasil || !kursMasukAkal(hasil.kurs)) {
    console.error('Kurs tidak ditemukan atau tidak masuk akal:', hasil);
    return new Response('kurs tidak valid', { status: 502 });
  }

  const headers = { apikey: kunci, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  if (kunci.startsWith('eyJ')) headers.Authorization = `Bearer ${kunci}`;   // service_role key format lama
  const url = `${SUPABASE_URL}/rest/v1/store_settings?id=eq.1&or=(usd_rate_source.is.null,usd_rate_source.neq.manual)`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ usd_rate: hasil.kurs, usd_rate_source: `Frankfurter ${hasil.tanggal ?? ''}`.trim(), usd_rate_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    console.error(`Gagal menyimpan kurs ke Supabase (${res.status}): ${await res.text()}`);
    return new Response('gagal simpan', { status: 502 });
  }
  const baris = await res.json().catch(() => []);
  console.log(baris.length ? `Kurs diperbarui: 1 USD = Rp${hasil.kurs}` : 'Kurs manual aktif, tidak diubah.');
  return new Response('ok');
};
