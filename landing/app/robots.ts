import type { MetadataRoute } from 'next';

// Allow indexing of the landing; point crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://arsenaldating.com/sitemap.xml',
    host: 'https://arsenaldating.com',
  };
}
