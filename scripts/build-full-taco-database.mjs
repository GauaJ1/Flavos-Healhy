import fs from 'fs';
import path from 'path';

// Ler o texto bruto do PDF exportado pelo pdftotext
const rawText = fs.readFileSync('tacotxt.txt', 'utf8');

function parseTacoText(text) {
  // Dividir o texto em blocos de páginas/tabelas
  // O PDF do pdftotext contem quebras de pagina (form feed \x0C)
  const pages = text.split('\x0C');

  // Mapeamento final por número do alimento (1 a 597)
  const foodsMap = new Map();

  // Helper para converter strings da TACO em numeros
  const parseVal = (str) => {
    if (!str) return 0;
    const clean = str.trim();
    if (clean === 'NA' || clean === 'Tr' || clean === '*' || clean === '-') return 0;
    const num = parseFloat(clean.replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  // 1. PRIMEIRA PASSAGEM: Identificar nomes de alimentos e grupos das Tabelas Centesimais
  // Procurar por sequencias numéricas consecutivas seguidas de nomes de alimentos
  // No tacotxt.txt, as listas de nomes aparecem em blocos como:
  // "Arroz, integral, cozido\nArroz, integral, cru\n..."

  // Vamos varrer todas as páginas para extrair os blocos de dados
  let currentGroup = 'geral';

  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i];

    // Verificar se a pagina contem tabela 1 (centesimal)
    if (pageText.includes('Tabela 1. Composição de alimentos por 100 gramas')) {
      const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      // Detectar grupo de alimento na pagina
      const groupMatch = pageText.match(/(Cereais e derivados|Verduras, hortaliças e derivados|Frutas e derivados|Gorduras e óleos|Pescados e frutos do mar|Carnes e derivados|Leite e derivados|Bebidas \(alcoólicas e não alcoólicas\)|Ovos e derivados|Produtos açucarados|Miscelâneas|Outros alimentos industrializados|Alimentos preparados|Leguminosas e derivados|Nozes e sementes)/i);
      if (groupMatch) {
        currentGroup = groupMatch[1];
      }

      // Procurar lista de IDs na página (ex: "1\n2\n3\n... 31")
      // E a lista correspondente de nomes de alimentos
      for (let j = 0; j < lines.length; j++) {
        // Se encontramos o início de uma sequência numérica de alimentos
        if (lines[j] === '1' && lines[j+1] === '2' && lines[j+2] === '3') {
          // Coletar todos os IDs dessa página
          let k = j;
          const pageIds = [];
          while (k < lines.length && /^\d{1,3}$/.test(lines[k])) {
            pageIds.push(parseInt(lines[k]));
            k++;
          }

          // Procurar o bloco de nomes logo após os IDs ou na mesma página
          // Os nomes vem em sequencia de strings
          let nameIdx = k;
          while (nameIdx < lines.length && (lines[nameIdx].startsWith('Tabela') || lines[nameIdx].startsWith('Número') || lines[nameIdx].startsWith('Alimento') || lines[nameIdx].length < 2)) {
            nameIdx++;
          }

          if (nameIdx < lines.length) {
            for (let idx = 0; idx < pageIds.length; idx++) {
              const id = pageIds[idx];
              const foodName = lines[nameIdx + idx];
              if (id && foodName && !foodName.match(/^\d+$/) && !foodName.startsWith('Tabela')) {
                if (!foodsMap.has(id)) {
                  foodsMap.set(id, {
                    id,
                    name: foodName,
                    foodGroup: currentGroup,
                    calories: 0,
                    protein: 0,
                    fat: 0,
                    carbohydrates: 0,
                    fiber: 0,
                    sodium: 0,
                    calcium_mg: 0,
                    magnesium_mg: 0,
                    iron_mg: 0,
                    potassium_mg: 0,
                    zinc_mg: 0,
                    vitaminC_mg: 0,
                    saturatedFat: 0,
                    glycemicIndex: 50,
                    antiInflammatoryScore: 5
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  console.log(`Nomes de alimentos extraídos do TXT: ${foodsMap.size}`);

  // Se a abordagem por blocos do pdftotext pegou parte dos alimentos, vamos completar usando regex em formato de linha
  // Regex para linhas completas de tabela centesimal
  const lineRegex = /^\s*(\d{1,3})\s+([A-Za-zÀ-ÖØ-öø-ÿ\s,\-\(\)\/\.\'\"]{3,70})\s+([\d\.,]+|NA|Tr|\*)\s+([\d\.,]+|NA|Tr|\*)\s+([\d\.,]+|NA|Tr|\*)\s+([\d\.,]+|NA|Tr|\*)\s+([\d\.,]+|NA|Tr|\*)\s+([\d\.,]+|NA|Tr|\*)\s+([\d\.,]+|NA|Tr|\*)\s+([\d\.,]+|NA|Tr|\*)\s+([\d\.,]+|NA|Tr|\*)/gm;
  
  let match;
  while ((match = lineRegex.exec(text)) !== null) {
    const id = parseInt(match[1]);
    const name = match[2].trim();
    if (id >= 1 && id <= 597 && !foodsMap.has(id)) {
      foodsMap.set(id, {
        id,
        name,
        foodGroup: 'geral',
        calories: parseVal(match[4]),
        protein: parseVal(match[6]),
        fat: parseVal(match[7]),
        carbohydrates: parseVal(match[9]),
        fiber: parseVal(match[10]),
        sodium: 0,
        calcium_mg: parseVal(match[12]),
        magnesium_mg: parseVal(match[13]),
        iron_mg: 0,
        potassium_mg: 0,
        zinc_mg: 0,
        vitaminC_mg: 0,
        saturatedFat: Math.round(parseVal(match[7]) * 0.2 * 10) / 10,
        glycemicIndex: 50,
        antiInflammatoryScore: 5
      });
    }
  }

  return foodsMap;
}

const map = parseTacoText(rawText);
console.log(`Total de alimentos catalogados: ${map.size}`);
