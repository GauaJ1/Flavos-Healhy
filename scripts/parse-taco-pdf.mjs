import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const pdfPath = 'taco_4_edicao_ampliada_e_revisada.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
  console.log('Total páginas:', data.numpages);
  console.log('Tamanho texto:', data.text.length);
  fs.writeFileSync('scripts/extracted-taco-text.txt', data.text, 'utf8');
  console.log('Texto salvo em scripts/extracted-taco-text.txt');
}).catch(err => {
  console.error('Erro ao ler PDF:', err);
});
