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
      
      // Filtrar apenas nodes válidos (IDs padrão: summary, body, conclusion)
      const validNodeIds = ['summary', 'body', 'conclusion'];
      const validNodes = deserializedState.nodes.filter(node => {
        const isValid = validNodeIds.includes(node.id);
        if (!isValid) {
          // Node inválido filtrado
        }
        return isValid;
      });
      

      
      // Se não temos todos os nodes válidos, criar os padrão
      if (validNodes.length < 3) {
        // Nodes insuficientes, criando padrões
        const defaultNodes = createDefaultNodes(newsData);
        return {
          ...deserializedState,
          nodes: defaultNodes
        };
      }
      
      // Atualizar conteúdo dos nodes válidos com dados atuais
      const updatedNodes = validNodes.map(node => {
        const blockData = getBlockDataFromNewsData(newsData, node.id);
        // Migrar tipo antigo 'cardNode' para novos tipos
        let migratedType = node.type;
        if (node.type === 'cardNode') {
          const inferredCoreKey = blockData.coreKey;
          migratedType = (inferredCoreKey === 'micro_estrutura' || (typeof inferredCoreKey === 'string' && inferredCoreKey.startsWith('micro_'))) 
            ? 'dataNode' 
            : 'textSegmentNode';
        }
        return {
          ...node,
          type: migratedType,
          data: {
            ...node.data,
            ...blockData
          }
        };
      });

      // Verificar se existe MonitorNode e criar conexão com conclusão se necessário
      const monitorNode = deserializedState.nodes.find(node => node.type === 'monitorNode');
      const conclusionNode = updatedNodes.find(node => node.id === 'conclusion');
      
      let updatedEdges = deserializedState.edges || [];
      
      if (monitorNode && conclusionNode) {
        // Verificar se já existe conexão entre conclusão e monitor
        const existingConnection = updatedEdges.find(edge => 
          edge.source === 'conclusion' && edge.target === monitorNode.id
        );
        
        if (!existingConnection) {
          // Criar conexão automática entre conclusão e monitor
          const sourceHandleId = (() => {
            const node = updatedNodes.find(n => n.id === 'conclusion');
            if (!node) return null;
            if (node.type === 'textSegmentNode') return 'source';
            if (node.type === 'dataNode') {
              const isStructure = node.data?.isStructureNode || node.data?.coreKey === 'micro_estrutura';
              return isStructure ? 'estrutura-output' : 'micro-output';
            }
            return null;
          })();

          const monitorEdge = {
            id: `edge-conclusion-monitor-default`,
            source: 'conclusion',
            target: monitorNode.id,
            ...(sourceHandleId ? { sourceHandle: sourceHandleId } : {}),
            targetHandle: 'monitor-input',
            type: 'default',
            animated: true,
            style: {
              stroke: 'rgba(255, 255, 255, 0.7)',
              strokeWidth: 2,
            }
          };
          
          updatedEdges.push(monitorEdge);
        }
      }

      const result = {
        ...deserializedState,
        nodes: updatedNodes,
        edges: updatedEdges
      };
      

      return result;
    }

    // Criar novo estado do canvas (apenas os 3 nodes principais por padrão)
    const nodes = createDefaultNodes(newsData);
    const edges = [];
    
    const result = {
      version: CURRENT_SCHEMA_VERSION,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: nodes,
      edges: edges,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        newsId: newsData?.id || null
      }
    };
    

    return result;

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
  
  const nodes = blockIds.map((id, index) => {
    const blockData = getBlockDataFromNewsData(newsData, id);
    
    const node = {
      id: id,
      type: 'textSegmentNode',
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
    
    
    return node;
  });
  

  return nodes;
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
      


    const getContentAsString = (data) => {
      if (typeof data === 'string') {
        return data;
      }
      if (Array.isArray(data)) {
        const result = data.join('\n');
        return result;
      }
      if (typeof data === 'object' && data !== null) {
        const result = JSON.stringify(data, null, 2);
        return result;
      }
      return '';
    };

    const introduceStr = getContentAsString(coreStructure.Introduce).trim();
    const bodyStr = getContentAsString(coreStructure.corpos_de_analise).trim();
    const conclusionStr = getContentAsString(coreStructure.conclusoes).trim();

    const hasAnyCoreContent = Boolean(introduceStr || bodyStr || conclusionStr);

    const loremIntro = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer at arcu euismod, fermentum mi vitae, ultricies nunc. Praesent molestie, urna id pulvinar varius, velit arcu tincidunt elit, a cursus nisl lacus id leo.';
    const loremBody = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras in sem sit amet justo gravida dapibus. Sed fermentum, ipsum a interdum volutpat, lectus neque pharetra velit, ut dignissim nisl ipsum non augue. Curabitur eu efficitur lorem. Vivamus dictum, turpis quis porta malesuada, augue ipsum tempor nunc, sed tristique velit justo a sapien.';
    const loremConclusion = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec nec nisi sed neque ullamcorper imperdiet. Conclusão provisória para orientar a edição do texto.';

    const contentMap = hasAnyCoreContent ? {
      'summary': introduceStr || 'Clique para selecionar, clique novamente para editar a introdução da notícia...',
      'body': bodyStr || 'Clique para selecionar, clique novamente para editar o corpo da notícia...',
      'conclusion': conclusionStr || 'Clique para selecionar, clique novamente para editar a conclusão...'
    } : {
      'summary': loremIntro,
      'body': loremBody,
      'conclusion': loremConclusion
    };


    
    const content = contentMap[blockId] || '';
    const hasContent = Boolean(content) && 
      !content.includes('Clique para selecionar') && 
      !content.includes('Clique novamente para editar');

    const coreKeyMap = {
      'summary': 'Introduce',
      'body': 'corpos_de_analise', 
      'conclusion': 'conclusoes'
    };
    
    const result = {
      content: content,
      hasContent: hasContent,
      minHeight: blockId === 'body' ? '120px' : '80px',
      coreKey: coreKeyMap[blockId] || null
    };
    

    
    return result;

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

/**
 * Limpa o estado salvo do canvas do localStorage
 * @param {string} newsId - ID da notícia (opcional)
 */
export const clearCanvasState = (newsId = null) => {
  try {
    if (newsId) {
      const savedStateKey = `canvas-state-${newsId}`;
      localStorage.removeItem(savedStateKey);

    } else {
      // Limpar todos os estados de canvas
      const keys = Object.keys(localStorage);
      const canvasKeys = keys.filter(key => key.startsWith('canvas-state-'));
      canvasKeys.forEach(key => localStorage.removeItem(key));

    }
  } catch (error) {
    console.error('❌ Erro ao limpar estado do canvas:', error);
  }
};

export { CURRENT_SCHEMA_VERSION };

export default {
  serializeCanvasState,
  deserializeCanvasState,
  convertNewsDataToCanvasState,
  convertCanvasStateToNewsData,
  validateCanvasState,
  clearCanvasState,
  CURRENT_SCHEMA_VERSION
};