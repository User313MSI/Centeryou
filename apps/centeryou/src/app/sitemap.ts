import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/site';
import { PUBLIC_ROUTES } from '../lib/routes';

// contenu public, sans donnée utilisateur : mis en cache 24 h (ISR) côté CDN
export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
