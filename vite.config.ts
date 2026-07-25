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
    optimizeDeps: {
      entries: ['index.html'],
    },
    server: {
      watch: {
        ignored: ['**/android/**'],
      },
    },
    // Define variáveis globais para o código do cliente (chaves de API NUNCA no frontend)
    define: {}
  };
});