import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://healthy.flavoscompany.xyz',
  build: {
    assets: '_astro',
  },
  compressHTML: true,
});
