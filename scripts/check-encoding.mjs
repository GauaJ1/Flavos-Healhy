import fs from 'fs';

const sampleFiles = [
  'packages/alimentos-seo/dist/alimentos/arroz-branco-cozido/index.html',
  'packages/alimentos-seo/dist/alimentos/feijao-carioquinha-cozido/index.html',
  'packages/alimentos-seo/dist/alimentos/pao-frances/index.html',
  'packages/alimentos-seo/dist/alimentos/suco-de-laranja/index.html',
  'packages/alimentos-seo/dist/index.html'
];

sampleFiles.forEach(f => {
  if (fs.existsSync(f)) {
    const html = fs.readFileSync(f, 'utf8');
    const hasBadChar = html.includes('\uFFFD') || html.includes('Ã');
    console.log(f + ' -> BadChars: ' + hasBadChar);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) console.log('  Title: ' + titleMatch[1]);
  } else {
    console.log('Missing: ' + f);
  }
});