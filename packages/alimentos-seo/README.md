# alimentos-seo — Astro Static Site

Subprojeto standalone que gera páginas SEO estáticas de alimentos
para `healthy.flavoscompany.xyz/alimentos/[slug]`.

## Estrutura

```
packages/alimentos-seo/
  src/
    data/           <- taco-reference.json (gerado pelo script)
    layouts/        <- BaseLayout.astro
    pages/
      index.astro   <- /alimentos (listagem)
      alimentos/
        [slug].astro <- /alimentos/{slug} (ficha nutricional)
  public/           <- assets estáticos
  astro.config.mjs
  package.json
```

## Fluxo de trabalho

### 1. Exportar dados (sempre que tacoDatabase.ts mudar)
```bash
# Na raiz do projeto principal
node scripts/export-taco-json.mjs
```

### 2. Desenvolvimento local
```bash
cd packages/alimentos-seo
npm run dev
# Acesse http://localhost:4322/alimentos
```

### 3. Build de produção
```bash
cd packages/alimentos-seo
npm run build
# Output em dist/
```

### 4. Integração com o deploy Vercel

O Vercel serve a aplicação React/Vite a partir de `dist/`.
Para que as páginas Astro fiquem em `/alimentos/*`, copiar o output
do Astro (`packages/alimentos-seo/dist/`) para `dist/alimentos/`
antes do deploy. Use o script de build combinado abaixo.

**Script sugerido (`build:all.sh` ou no CI):**

```bash
#!/usr/bin/env bash
set -e

# 1. Exporta os dados nutricionais
node scripts/export-taco-json.mjs

# 2. Constrói o app principal (React/Vite)
npm run build

# 3. Constrói o site SEO (Astro)
cd packages/alimentos-seo
npm install
npm run build
cd ../..

# 4. Copia o output Astro para dist/alimentos/
mkdir -p dist/alimentos
cp -r packages/alimentos-seo/dist/* dist/alimentos/
```

No **Vercel**, configure o comando de build como:
```
bash build:all.sh
```
e o output directory como `dist`.

## SEO implementado

- `<title>` único por alimento com nome + kcal
- `<meta description>` com valores nutricionais reais
- `JSON-LD` Schema.org: `NutritionInformation` + `BreadcrumbList` + `WebPage`
- `Open Graph` e Twitter Card
- `<link rel="canonical">` e `hreflang="pt-BR"`
- Tabela HTML semântica com roles ARIA
- Cache-Control: 1h + stale-while-revalidate configurados no `vercel.json`
- `X-Robots-Tag: index, follow` nas páginas de alimentos

## Dados

Fonte: `utils/tacoDatabase.ts` → exportado via `scripts/export-taco-json.mjs`
Referência: TACO/NEPA-UNICAMP, 4ª edição revisada e ampliada, 2011.
Auditoria: ver `utils/tacoAudit.test.ts`
