import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do diretório atual.
  // O terceiro parâmetro '' diz para carregar todas as variáveis, não apenas as que começam com VITE_
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_BASE || '/',
    plugins: [react()],
    publicDir: 'public',
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    // Define variáveis globais para o código do cliente
    define: {
      // Isso garante que process.env.API_KEY tenha o valor definido no seu arquivo .env ou nas variáveis de ambiente do sistema de deploy
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});