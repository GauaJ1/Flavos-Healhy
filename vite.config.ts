import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do diretório atual.
  // O terceiro parâmetro '' diz para carregar todas as variáveis, não apenas as que começam com VITE_
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './',
    plugins: [react()],
    publicDir: 'public',
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    // Define variáveis globais para o código do cliente
    define: {
      // Em produção (build final), a chave NUNCA é injetada no bundle do cliente para segurança contra vazamentos no APK.
      // Em desenvolvimento local (mode === 'development'), injetamos a chave para facilitar o desenvolvimento sem proxy local.
      'process.env.API_KEY': JSON.stringify(mode === 'development' ? (env.API_KEY || '') : '')
    }
  };
});