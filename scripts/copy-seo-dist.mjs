import fs from 'fs';
import path from 'path';

const src = path.resolve('packages/alimentos-seo/dist');
const dest = path.resolve('dist/alimentos');

if (fs.existsSync(src)) {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log('✅ Copiado packages/alimentos-seo/dist para dist/alimentos com sucesso!');
} else {
  console.error('❌ Diretório packages/alimentos-seo/dist não foi encontrado.');
  process.exit(1);
}
