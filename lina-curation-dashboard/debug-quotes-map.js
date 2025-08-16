// Debug para verificar a estrutura dos dados do quotes_map

console.log('=== DEBUG: Estrutura dos Dados ===');

// Simula os dados que vêm do banco
const mockNewsData = {
  core_quotes: {
    "Zendaya e On: a jogada de mestre que une performance e lifestyle": [
      "Lançamento do Tênis Cloudzone Moon",
      "Parceria com Zendaya e Law Roach",
      "Impacto da Colaboração com Zendaya",
      "Tendência de Parcerias com Celebridades"
    ],
    "Mas afinal, o que esse tênis tem de tão especial?": [
      "Peso e Design do Tênis",
      "Tecnologia na Sola e Materiais",
      "Combinação de Tecnologia e Conforto",
      "Dual-Density Midsole no Cloudzone Moon",
      "Sistema CloudTec® para Amortecimento Adaptável",
      "Flexibilidade do Speedboard®"
    ]
  },
  quotes_map: {
    "Zendaya e On: a jogada de mestre que une performance e lifestyle": [
      "Lançamento do Tênis Cloudzone Moon",
      "Parceria com Zendaya e Law Roach",
      "Impacto da Colaboração com Zendaya",
      "Tendência de Parcerias com Celebridades"
    ],
    "Mas afinal, o que esse tênis tem de tão especial?": [
      "Peso e Design do Tênis",
      "Tecnologia na Sola e Materiais",
      "Combinação de Tecnologia e Conforto",
      "Dual-Density Midsole no Cloudzone Moon",
      "Sistema CloudTec® para Amortecimento Adaptável",
      "Flexibilidade do Speedboard®"
    ]
  }
};

console.log('1. Mock newsData:', mockNewsData);
console.log('2. quotes_map disponível:', mockNewsData.quotes_map);
console.log('3. Tipo do quotes_map:', typeof mockNewsData.quotes_map);
console.log('4. É objeto?', typeof mockNewsData.quotes_map === 'object');
console.log('5. Chaves do quotes_map:', Object.keys(mockNewsData.quotes_map));

// Simula a lógica do CanvasLibraryView
const normalizedCore = (() => {
  try {
    let combined = {};
    
    console.log('\n=== PROCESSAMENTO ===');
    console.log('6. quotes_map disponível:', mockNewsData?.quotes_map);
    
    // Adiciona quotes_map se disponível
    if (mockNewsData?.quotes_map) {
      combined.quotes_map = mockNewsData.quotes_map;
      console.log('7. quotes_map adicionado ao combined:', combined.quotes_map);
    }
    
    console.log('8. combined final:', combined);
    return Object.keys(combined).length > 0 ? combined : null;
  } catch (e) {
    console.warn('Erro:', e);
    return null;
  }
})();

console.log('\n=== RESULTADO ===');
console.log('9. normalizedCore:', normalizedCore);

// Simula buildHierarchy
const buildHierarchy = (normalized) => {
  if (!normalized) return { categories: {}, counts: {}, segments: {} };
  
  const segments = {};
  let quotesMap = null;
  
  console.log('\n=== BUILD HIERARCHY ===');
  console.log('10. normalized recebido:', normalized);
  console.log('11. normalized.quotes_map:', normalized.quotes_map);
  
  if (normalized.quotes_map) {
    quotesMap = normalized.quotes_map;
    console.log('12. quotes_map encontrado:', quotesMap);
  }
  
  if (quotesMap && typeof quotesMap === 'object') {
    console.log('13. Criando nodes baseados em quotes_map');
    Object.keys(quotesMap).forEach((header, index) => {
      const segmentId = `segment-header-${index}`;
      segments[segmentId] = {
        type: 'header',
        title: header,
        content: '',
        itemId: segmentId,
        headerIndex: index,
        subItems: quotesMap[header] || []
      };
      console.log(`14. Criado segment: ${segmentId} - "${header}"`);
    });
  } else {
    console.log('15. Usando fallback padrão');
  }
  
  console.log('16. segments finais:', segments);
  return { categories: {}, counts: {}, segments };
};

const result = buildHierarchy(normalizedCore);
console.log('\n=== RESULTADO FINAL ===');
console.log('17. Resultado:', result);
