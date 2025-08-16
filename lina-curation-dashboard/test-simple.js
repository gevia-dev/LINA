// Teste simples para verificar a lógica do quotes_map

const testData = {
  quotes_map: {
    "Header 1": ["Item 1", "Item 2"],
    "Header 2": ["Item 3", "Item 4", "Item 5"]
  }
};

console.log('=== TESTE SIMPLES ===');
console.log('Dados de teste:', testData);

// Simula a lógica de buildHierarchy
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
    console.log('✅ quotes_map encontrado:', quotesMap);
  } else if (normalized.core_quotes?.quotes_map) {
    quotesMap = normalized.core_quotes.quotes_map;
    console.log('✅ quotes_map encontrado em core_quotes:', quotesMap);
  }
  
  // Se encontrou quotes_map, cria nodes de segmentação baseados nos headers
  if (quotesMap && typeof quotesMap === 'object') {
    console.log('🔄 Criando nodes de segmentação baseados nos headers...');
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
      console.log(`  📋 Criado segment: ${segmentId} - "${header}" com ${quotesMap[header].length} sub-items`);
    });
  } else {
    console.log('⚠️  Nenhum quotes_map encontrado, usando fallback padrão');
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
  
  return { categories, counts, segments };
};

// Executa o teste
const result = buildHierarchy(testData);
console.log('\n=== RESULTADO ===');
console.log('Segments criados:', Object.keys(result.segments));
console.log('Detalhes dos segments:');
Object.entries(result.segments).forEach(([key, segment]) => {
  console.log(`  ${key}:`, {
    type: segment.type,
    title: segment.title,
    subItems: segment.subItems
  });
});
