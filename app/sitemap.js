const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://votevault.app';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const now = new Date();
  const routes = [
    { url: `${SITE_URL}/`, changeFrequency: 'hourly', priority: 1 },
  ];
  try {
    const res = await fetch(`${SITE_URL}/api/elections`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      for (const e of (data.elections || [])) {
        routes.push({
          url: `${SITE_URL}/election/${e.slug}`,
          lastModified: e.ends_at ? new Date(e.ends_at) : now,
          changeFrequency: e.status === 'open' ? 'hourly' : 'weekly',
          priority: e.status === 'open' ? 0.9 : 0.6,
        });
      }
    }
  } catch {}
  return routes.map(r => ({ lastModified: now, ...r }));
}
