// /robots.txt — mengikuti domain yang sedang dipakai (neoixvii.netlify.app sekarang, ixvii.co nanti).
export const config = { path: '/robots.txt' };

export const isiRobots = (origin) => [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin/',
  'Disallow: /admin-impor/',
  'Disallow: /garansi/',
  'Disallow: /ulasan/',
  'Disallow: /mitra/saldo/',
  '',
  `Sitemap: ${origin}/sitemap.xml`,
  '',
].join('\n');

export default async (req) => new Response(isiRobots(new URL(req.url).origin), {
  headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
});
