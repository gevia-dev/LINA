/**
 * Sistema de serialização/desserialização com versionamento de schema
 * para o estado do canvas ReactFlow
 */

// Versão atual do schema
const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * Schema padrão para o canvas
 */
const DEFAULT_CANVAS_SCHEMA = {
  version: CURRENT_SCHEMA_VERSION,
  viewport: {
    x: 0,
    y: 0,
    zoom: 1
  },
  nodes: [],
  edges: [],
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    newsId: null
  }
};

/**
 * Migrators para diferentes versões do schema
 */
const schemaMigrators = {
  '1.0.0': (data) => data, // Versão atual, sem migração necessária
  // Futuras versões serão adicionadas aqui
  // '1.1.0': (data) => migrateFrom1_0_0To1_1_0(data),
};

/**
 * Serializa o estado do canvas para armazenamento
 * @param {Object} canvasState - Estado atual do canvas
 * @param {string} newsId - ID da notícia
 * @returns {string} Estado serializado como JSON
 */
export const serializeCanvasState = (canvasState, newsId = null) => {
  try {
    const state = canvasState || {};
    const serializedState = {
      version: CURRENT_SCHEMA_VERSION,
      viewport: state.viewport || DEFAULT_CANVAS_SCHEMA.viewport,
      nodes: state.nodes || [],
      edges: state.edges || [],
      metadata: {
        createdAt: state.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        newsId: newsId
      }
    };

    return JSON.stringify(serializedState);
  } catch (error) {
    console.error('Erro ao serializar estado do canvas:', error);
    return JSON.stringify(DEFAULT_CANVAS_SCHEMA);
  }
};

/**
 * Desserializa o estado do canvas do armazenamento
 * @param {string} serializedData - Dados serializados
 * @returns {Object} Estado do canvas desserializado
 */
export const deserializeCanvasState = (serializedData) => {
  try {
    if (!serializedData) {
      return DEFAULT_CANVAS_SCHEMA;
    }

    const data = typeof serializedData === 'string' 
      ? JSON.parse(serializedData) 
      : serializedData;

    // Verificar se precisa migrar o schema
    const version = data.version || '1.0.0';
    
    if (version !== CURRENT_SCHEMA_VERSION) {
      return migrateSchema(data, version);
    }

    // Validar estrutura mínima
    return {
      version: data.version || CURRENT_SCHEMA_VERSION,
      viewport: {
        x: data.viewport?.x || 0,
        y: data.viewport?.y || 0,
        zoom: data.viewport?.zoom || 1
      },
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      edges: Array.isArray(data.edges) ? data.edges : [],
      metadata: {
        createdAt: data.metadata?.createdAt || new Date().toISOString(),
        updatedAt: data.metadata?.updatedAt || new Date().toISOString(),
        newsId: data.metadata?.newsId || null
      }
    };

  } catch (error) {
    console.error('Erro ao desserializar estado do canvas:', error);
    return DEFAULT_CANVAS_SCHEMA;
  }
};

/**
 * Migra dados de versões antigas para a versão atual
 * @param {Object} data - Dados na versão antiga
 * @param {string} fromVersion - Versão de origem
 * @returns {Object} Dados migrados para versão atual
 */
const migrateSchema = (data, fromVersion) => {
  try {
    let migratedData = { ...data };
    
    // Aplicar migrations sequenciais se necessário
    const versions = Object.keys(schemaMigrators).sort();
    const fromIndex = versions.indexOf(fromVersion);
    
    if (fromIndex === -1) {
      console.warn(`Versão ${fromVersion} não reconhecida, usando schema padrão`);
      return DEFAULT_CANVAS_SCHEMA;
    }

    // Aplicar migrators em sequência
    for (let i = fromIndex; i < versions.length; i++) {
      const version = versions[i];
      const migrator = schemaMigrators[version];
      if (migrator) {
        migratedData = migrator(migratedData);
        migratedData.version = version;
      }
    }

    console.log(`Schema migrado de ${fromVersion} para ${CURRENT_SCHEMA_VERSION}`);
    return migratedData;

  } catch (error) {
    console.error('Erro na migração do schema:', error);
    return DEFAULT_CANVAS_SCHEMA;
  }
};

/**
 * Converte newsData para formato de canvas com posicionamento otimizado
 * @param {Object} newsData - Dados da notícia
 * @param {Object} savedCanvasState - Estado salvo do canvas (opcional)
 * @returns {Object} Estado do canvas
 */
export const convertNewsDataToCanvasState = (newsData, savedCanvasState = null) => {
  try {
    // Se há estado salvo, usar ele como base
    if (savedCanvasState) {
      const deserializedState = deserializeCanvasState(savedCanvasState);
      
      // Atualizar conteúdo dos nodes com dados atuais
      const updatedNodes = deserializedState.nodes.map(node => {
        const blockData = getBlockDataFromNewsData(newsData, node.id);
        return {
          ...node,
          data: {
            ...node.data,
            ...blockData
          }
        };
      });

      return {
        ...deserializedState,
        nodes: updatedNodes
      };
    }

    // Criar novo estado do canvas
    const nodes = createDefaultNodes(newsData);
    
    return {
      version: CURRENT_SCHEMA_VERSION,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: nodes,
      edges: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        newsId: newsData?.id || null
      }
    };

  } catch (error) {
    console.error('Erro ao converter newsData para canvas:', error);
    return DEFAULT_CANVAS_SCHEMA;
  }
};

/**
 * Cria nodes padrão baseados nos dados da notícia
 * @param {Object} newsData - Dados da notícia
 * @returns {Array} Array de nodes
 */
const createDefaultNodes = (newsData) => {
  const blockIds = ['summary', 'body', 'conclusion'];
  const blockTitles = ['Introdução', 'Corpo', 'Conclusão'];
  
  return blockIds.map((id, index) => {
    const blockData = getBlockDataFromNewsData(newsData, id);
    
    return {
      id: id,
      type: 'cardNode',
      position: {
        x: 100, // Manter todos na mesma coluna
        y: 100 + index * 250 // Espaçamento vertical progressivo
      },
      data: {
        id: id,
        title: blockTitles[index],
        ...blockData
      }
    };
  });
};

/**
 * Extrai dados de um bloco específico do newsData
 * @param {Object} newsData - Dados da notícia
 * @param {string} blockId - ID do bloco
 * @returns {Object} Dados do bloco
 */
const getBlockDataFromNewsData = (newsData, blockId) => {
  try {
    const coreStructure = newsData?.core_structure 
      ? JSON.parse(newsData.core_structure) 
      : {};

    const contentMap = {
      'summary': coreStructure.Introduce || 'Clique para selecionar, clique novamente para editar a introdução da notícia...',
      'body': coreStructure.corpos_de_analise || 'Clique para selecionar, clique novamente para editar o corpo da notícia...',
      'conclusion': coreStructure.conclusoes || 'Clique para selecionar, clique novamente para editar a conclusão...'
    };

    const content = contentMap[blockId] || '';
    const hasContent = content && 
      !content.includes('Clique para selecionar') && 
      !content.includes('Clique novamente para editar');

    return {
      content: content,
      hasContent: hasContent,
      minHeight: blockId === 'body' ? '120px' : '80px',
      coreKey: blockId === 'summary' ? 'Introduce' : 
               blockId === 'body' ? 'corpos_de_analise' : 'conclusoes'
    };

  } catch (error) {
    console.error('Erro ao extrair dados do bloco:', error);
    return {
      content: 'Erro ao carregar conteúdo',
      hasContent: false,
      minHeight: '80px',
      coreKey: null
    };
  }
};

/**
 * Converte estado do canvas de volta para newsData
 * @param {Object} canvasState - Estado do canvas
 * @returns {Object} Estrutura core_structure para newsData
 */
export const convertCanvasStateToNewsData = (canvasState) => {
  try {
    const coreStructure = {};
    
    canvasState.nodes.forEach(node => {
      const { coreKey, content } = node.data;
      if (coreKey && content && !content.includes('Clique para selecionar')) {
        coreStructure[coreKey] = content;
      }
    });
    
    return coreStructure;

  } catch (error) {
    console.error('Erro ao converter canvas para newsData:', error);
    return {};
  }
};

/**
 * Valida se o estado do canvas é válido
 * @param {Object} canvasState - Estado do canvas
 * @returns {boolean} True se válido
 */
export const validateCanvasState = (canvasState) => {
  try {
    if (!canvasState || typeof canvasState !== 'object') {
      return false;
    }

    // Verificações básicas
    if (!canvasState.version || !canvasState.viewport || !Array.isArray(canvasState.nodes)) {
      return false;
    }

    // Verificar viewport
    const { viewport } = canvasState;
    if (typeof viewport.x !== 'number' || typeof viewport.y !== 'number' || typeof viewport.zoom !== 'number') {
      return false;
    }

    // Verificar nodes básicos
    const requiredNodeIds = ['summary', 'body', 'conclusion'];
    const nodeIds = canvasState.nodes.map(node => node.id);
    
    for (const requiredId of requiredNodeIds) {
      if (!nodeIds.includes(requiredId)) {
        return false;
      }
    }

    return true;

  } catch (error) {
    console.error('Erro ao validar estado do canvas:', error);
    return false;
  }
};

export { CURRENT_SCHEMA_VERSION };

export default {
  serializeCanvasState,
  deserializeCanvasState,
  convertNewsDataToCanvasState,
  convertCanvasStateToNewsData,
  validateCanvasState,
  CURRENT_SCHEMA_VERSION
};