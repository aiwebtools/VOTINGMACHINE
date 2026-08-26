const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://votevault.app';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/auth/callback', '/candidate/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
