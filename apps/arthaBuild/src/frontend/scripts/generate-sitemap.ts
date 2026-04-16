import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { blogPosts } from '../src/data/blogPosts';
import { industrySolutions } from '../src/data/industrySolutions';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://artha.build';

function url(path: string, priority: string, lastmod?: string) {
  return `  <url>
    <loc>${BASE_URL}${path}</loc>
    <priority>${priority}</priority>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
  </url>`;
}

const today = new Date().toISOString().split('T')[0];

const urls = [
  url('/', '1.0', today),
  url('/blog', '0.9', today),
  url('/solutions', '0.9', today),
  url('/privacy', '0.5'),
  url('/terms', '0.5'),
  ...blogPosts.map(p => url(`/blog/${p.slug}`, '0.8', p.publishedAt)),
  ...industrySolutions.map(i => url(`/solutions/${i.slug}`, '0.9', today)),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

const outPath = resolve(__dirname, '../dist/sitemap.xml');
writeFileSync(outPath, sitemap);
console.log(`✅ Sitemap generated: ${urls.length} URLs → dist/sitemap.xml`);
