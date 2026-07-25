import fs from 'fs';
import path from 'path';

const tacoJson = JSON.parse(fs.readFileSync('packages/alimentos-seo/src/data/taco-reference.json', 'utf8'));
const SITE = 'https://healthy.flavoscompany.xyz';
const now = new Date().toISOString().split('T')[0];

const urls = [
  { loc: SITE + '/alimentos', priority: '1.0', changefreq: 'weekly' },
  ...tacoJson.map(item => ({
    loc: SITE + '/alimentos/' + item.slug,
    priority: '0.8',
    changefreq: 'monthly'
  }))
];

const xmlBody = urls.map(u => '  <url>\n    <loc>' + u.loc + '</loc>\n    <lastmod>' + now + '</lastmod>\n    <changefreq>' + u.changefreq + '</changefreq>\n    <priority>' + u.priority + '</priority>\n  </url>').join('\n');

const sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + xmlBody + '\n</urlset>\n';

const astroPublic = 'packages/alimentos-seo/public';
fs.mkdirSync(astroPublic, { recursive: true });
fs.writeFileSync(path.join(astroPublic, 'sitemap.xml'), sitemapXml, 'utf8');

const robotsTxt = 'User-agent: *\nAllow: /\nAllow: /alimentos/\nAllow: /api/\n\nSitemap: ' + SITE + '/sitemap.xml\n';

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync(path.join(astroPublic, 'robots.txt'), robotsTxt, 'utf8');
fs.writeFileSync('public/robots.txt', robotsTxt, 'utf8');
console.log('✅ SITEMAP AND ROBOTS GENERATED OK');
