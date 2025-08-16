// Arquivo de teste para verificar a implementação do quotes_map
// Este arquivo simula os dados que viriam do banco de dados

const testNewsData = {
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
    ],
    "O 'Efeito Zendaya': uma aula de branding e conexão": [
      "Aumento nas Vendas da On",
      "Métricas de Desempenho da Campanha",
      "Campanha Be Every You e Inclusão",
      "Representação de Diversidade",
      "Recepção Mista do Consumidor",
      "Engajamento nas Redes Sociais"
    ],
    "Não é só sobre tênis: o plano para dominar o seu closet": [
      "Itens de Vestuário Lançados",
      "Fortalecimento do Ecossistema da Marca",
      "Segundo Drop de Calçados",
      "Plano para Retenção de Consumidores"
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
    ],
    "O 'Efeito Zendaya': uma aula de branding e conexão": [
      "Aumento nas Vendas da On",
      "Métricas de Desempenho da Campanha",
      "Campanha Be Every You e Inclusão",
      "Representação de Diversidade",
      "Recepção Mista do Consumidor",
      "Engajamento nas Redes Sociais"
    ],
    "Não é só sobre tênis: o plano para dominar o seu closet": [
      "Itens de Vestuário Lançados",
      "Fortalecimento do Ecossistema da Marca",
      "Segundo Drop de Calçados",
      "Plano para Retenção de Consumidores"
    ]
  }
};

// Função para testar a lógica de buildHierarchy
function testBuildHierarchy() {
  console.log('=== TESTE: buildHierarchy com quotes_map ===');
  
  // Simula a função normalizeCoreQuotes
  const normalizeCoreQuotes = (core) => {
    if (!core) return null;
    let root = core;
    const rootKeys = Object.keys(root || {});
    if (typeof root === 'object' && rootKeys.length === 1 && typeof root[rootKeys[0]] === 'string') {
      const parsed = JSON.parse(root[rootKeys[0]]);
      if (parsed && typeof parsed === 'object') {
        root = parsed;
      }
    }
    const result = {};
    
    // Preserva quotes_map se existir
    if (root.quotes_map) {
      result.quotes_map = root.quotes_map;
    }
    
    Object.entries(root || {}).forEach(([parentKey, childValue]) => {
      // Pula quotes_map pois já foi processado acima
      if (parentKey === 'quotes_map') return;
      
      let childObj = childValue;
      if (typeof childObj === 'string') {
        const parsed = JSON.parse(childObj);
        if (parsed) childObj = parsed;
      }
      if (!childObj || typeof childObj !== 'object') return;
      const childEntries = {};
      Object.entries(childObj).forEach(([childKey, items]) => {
        let list = items;
        if (typeof list === 'string') {
          const parsedList = JSON.parse(list);
          if (parsedList) list = parsedList;
        }
        if (list && !Array.isArray(list) && typeof list === 'object') {
          const values = Object.values(list);
          if (values.length && values.every(v => typeof v === 'object' || typeof v === 'string')) {
            list = values;
          } else {
            list = [list];
          }
        }
        if (!Array.isArray(list)) list = [];
        childEntries[childKey] = list;
      });
      result[parentKey] = childEntries;
    });
    return result;
  };

  // Simula a função buildHierarchy
  const buildHierarchy = (normalized) => {
    if (!normalized) return { categories: {}, counts: {}, segments: {} };
    const categories = {};
    const counts = {};
    const segments = {};
    
    // Busca por quotes_map nos dados para criar nodes de segmentação dinâmicos
    let quotesMap = null;
    
    // Tenta encontrar quotes_map em diferentes locais possíveis
    if (normalized.quotes_map) {
      quotesMap = normalized.quotes_map;
    } else if (normalized.core_quotes?.quotes_map) {
      quotesMap = normalized.core_quotes.quotes_map;
    }
    
    // Se encontrou quotes_map, cria nodes de segmentação baseados nos headers
    if (quotesMap && typeof quotesMap === 'object') {
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
      });
    } else {
      // Fallback para nodes de segmentação padrão se não houver quotes_map
      segments.summary = {
        type: 'summary',
        title: 'Introdução',
        content: '',
        itemId: 'segment-summary'
      };
      segments.body = {
        type: 'body',
        title: 'Corpo',
        content: '',
        itemId: 'segment-body'
      };
      segments.conclusion = {
        type: 'conclusion',
        title: 'Conclusão',
        content: '',
        itemId: 'segment-conclusion'
      };
    }
    
    Object.entries(normalized).forEach(([parentKey, childObj]) => {
      // Pula quotes_map pois já foi processado acima
      if (parentKey === 'quotes_map') return;
      
      // Verifica se childObj é um objeto válido para processar
      if (!childObj || typeof childObj !== 'object') return;
      
      Object.entries(childObj).forEach(([childKey, list]) => {
        if (!Array.isArray(list)) return;
        const categoryKey = `${parentKey}::${childKey}`;
        list.forEach((item, index) => {
          const tag = String(item?.categoria_funcional || 'Sem_Tag');
          if (!categories[tag]) categories[tag] = {};
          if (!categories[tag][categoryKey]) categories[tag][categoryKey] = [];
          const nodeItem = {
            index,
            title: String(item?.titulo_frase || 'Sem título'),
            phrase: String(item?.frase_completa || ''),
            categoryKey,
            itemId: `micro-${parentKey}::${childKey}-${index}`
          };
          categories[tag][categoryKey].push(nodeItem);
        });
      });
    });
    
    // counts
    Object.keys(categories).forEach(tag => {
      counts[tag] = Object.keys(categories[tag]).length;
    });
    return { categories, counts, segments };
  };

  // Testa com dados que incluem quotes_map
  console.log('1. Testando com quotes_map:');
  const normalized1 = normalizeCoreQuotes(testNewsData);
  console.log('Normalized:', normalized1);
  
  const hierarchy1 = buildHierarchy(normalized1);
  console.log('Hierarchy:', hierarchy1);
  console.log('Segments criados:', Object.keys(hierarchy1.segments));
  console.log('Primeiro segment:', hierarchy1.segments[Object.keys(hierarchy1.segments)[0]]);
  
  // Testa com dados que não incluem quotes_map
  console.log('\n2. Testando sem quotes_map:');
  const testDataWithoutQuotesMap = { ...testNewsData };
  delete testDataWithoutQuotesMap.quotes_map;
  
  const normalized2 = normalizeCoreQuotes(testDataWithoutQuotesMap);
  console.log('Normalized (sem quotes_map):', normalized2);
  
  const hierarchy2 = buildHierarchy(normalized2);
  console.log('Hierarchy (sem quotes_map):', hierarchy2);
  console.log('Segments criados:', Object.keys(hierarchy2.segments));
}

// Executa o teste
testBuildHierarchy();
