import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/site';

// contenu public, sans donnée utilisateur : mis en cache 24 h (ISR) côté CDN
export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
