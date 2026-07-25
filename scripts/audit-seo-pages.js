import fs from 'fs';
import path from 'path';

const distDir = 'packages/alimentos-seo/dist/alimentos';
const files = [];

function findHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) findHtmlFiles(p);
    else if (f === 'index.html') files.push(p);
  }
}
findHtmlFiles(distDir);
files.push('packages/alimentos-seo/dist/index.html');

console.log('Auditando ' + files.length + ' páginas estáticas geradas...\n');

let passed = 0;
let firstFail = true;

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');

  const hasTitle = /<title>[^<]+<\/title>/.test(html);
  const hasMetaDesc = /<meta name="description" content="[^"]+"/i.test(html);
  const hasViewport = /<meta name="viewport"/.test(html);
  const hasLang = /<html lang="pt-BR"/.test(html);
  const hasCanonical = /<link rel="canonical"/.test(html);
  const hasJsonLd = /application\/ld\+json/.test(html);
  const hasHeader = html.includes('<header');
  const hasMain = html.includes('<main');
  const hasFooter = html.includes('<footer');
  const hasSemantic = hasHeader && hasMain && hasFooter;

  const allOk = hasTitle && hasMetaDesc && hasViewport && hasLang && hasCanonical && hasJsonLd && hasSemantic;

  if (allOk) {
    passed++;
  } else if (firstFail) {
    firstFail = false;
    console.log('FIRST FAILURE: ' + f);
    console.log('  hasTitle:     ' + hasTitle);
    console.log('  hasMetaDesc:  ' + hasMetaDesc);
    console.log('  hasViewport:  ' + hasViewport);
    console.log('  hasLang:      ' + hasLang);
    console.log('  hasCanonical: ' + hasCanonical);
    console.log('  hasJsonLd:    ' + hasJsonLd);
    console.log('  hasHeader:    ' + hasHeader);
    console.log('  hasMain:      ' + hasMain);
    console.log('  hasFooter:    ' + hasFooter);
    console.log('');
  }
}

console.log('Resultado da Auditoria SEO: ' + passed + '/' + files.length + ' páginas passaram em todos os critérios');
