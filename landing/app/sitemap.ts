import type { MetadataRoute } from 'next';

// Three routes worth indexing today: the home/waitlist page, plus the two
// legal pages. The waitlist + contact form sit on `/`.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://arsenaldating.com';
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
