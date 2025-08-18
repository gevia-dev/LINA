// utils/connectionMappingUtils.js

/**
 * Encontra a sequência ordenada de nodes baseada nas conexões do React Flow
 * @param {Array} nodes - Array de nodes do React Flow
 * @param {Array} edges - Array de edges do React Flow
 * @returns {Array} Array ordenado de nodes representando a sequência do texto
 */
export const getOrderedSequenceFromConnections = (nodes, edges) => {
  try {
    // 1. Separar nodes por tipo
    const segmentNodes = nodes.filter(n => n.type === 'segmentNode');
    const itemNodes = nodes.filter(n => n.type === 'itemNode');
    
    // 2. Criar mapa de adjacência das conexões
    const adjacencyMap = new Map();
    const incomingConnections = new Map();
    
    edges.forEach(edge => {
      if (!adjacencyMap.has(edge.source)) {
        adjacencyMap.set(edge.source, []);
      }
      adjacencyMap.get(edge.source).push(edge.target);
      
      // Mapear conexões de entrada para cada node
      if (!incomingConnections.has(edge.target)) {
        incomingConnections.set(edge.target, []);
      }
      incomingConnections.get(edge.target).push(edge.source);
    });
    
    // 3. Encontrar sequências por segment
    const sequencesBySegment = [];
    
    segmentNodes
      .sort((a, b) => (a.data.headerIndex || 0) - (b.data.headerIndex || 0))
      .forEach(segment => {
        const sequence = buildSequenceFromSegment(segment, adjacencyMap, nodes);
        if (sequence.length > 0) {
          sequencesBySegment.push({
            segment,
            sequence
          });
        }
      });
    
    return sequencesBySegment;
  } catch (error) {
    console.error('❌ Erro ao mapear sequência de conexões:', error);
    return [];
  }
};

/**
 * Constroi a sequência de nodes a partir de um segment
 * @param {Object} segmentNode - O node de segment inicial
 * @param {Map} adjacencyMap - Mapa de adjacência das conexões
 * @param {Array} allNodes - Todos os nodes do React Flow
 * @returns {Array} Sequência ordenada de nodes conectados ao segment
 */
const buildSequenceFromSegment = (segmentNode, adjacencyMap, allNodes) => {
  const sequence = [segmentNode];
  const visited = new Set([segmentNode.id]);
  
  let currentNodeId = segmentNode.id;
  
  // Seguir a cadeia de conexões
  while (adjacencyMap.has(currentNodeId)) {
    const connections = adjacencyMap.get(currentNodeId);
    
    // Pegar a primeira conexão não visitada
    const nextNodeId = connections.find(nodeId => !visited.has(nodeId));
    
    if (!nextNodeId) break;
    
    const nextNode = allNodes.find(n => n.id === nextNodeId);
    if (!nextNode) break;
    
    sequence.push(nextNode);
    visited.add(nextNodeId);
    currentNodeId = nextNodeId;
  }
  
  return sequence;
};

/**
 * Reconstroi o final_text baseado na sequência ordenada de nodes
 * @param {Array} sequencesBySegment - Array de sequências organizadas por segment
 * @param {Map} existingMapping - Mapeamento existente de referências
 * @returns {Object} { finalText, newMapping }
 */
export const reconstructFinalText = (sequencesBySegment, existingMapping = new Map()) => {
  try {
    let finalText = '';
    const newMapping = new Map();
    let referenceCounter = 1;
    
    sequencesBySegment.forEach(({ segment, sequence }) => {
      // Adicionar header da seção
      if (segment.data.title) {
        finalText += `## ${segment.data.title}\n\n`;
      }
      
      // Processar cada node na sequência (exceto o primeiro que é o segment)
      sequence.slice(1).forEach(node => {
        if (node.type === 'itemNode') {
          const title = node.data.title;
          const phrase = node.data.phrase;
          
          if (title && phrase) {
            // Criar marcador de referência
            const marker = `[${referenceCounter}]`;
            
            // Adicionar ao mapeamento
            newMapping.set(marker, title);
            newMapping.set(title, marker);
            
            // Adicionar frase ao texto
            finalText += `${phrase} ${marker}\n\n`;
            
            referenceCounter++;
          }
        }
      });
    });
    
    return {
      finalText: finalText.trim(),
      newMapping
    };
  } catch (error) {
    console.error('❌ Erro ao reconstruir final_text:', error);
    return {
      finalText: '',
      newMapping: new Map()
    };
  }
};

/**
 * Detecta onde inserir um novo node na sequência
 * @param {String} newNodeId - ID do novo node a ser inserido
 * @param {Array} edges - Array de edges do React Flow
 * @returns {Object} { position: 'start'|'middle'|'end', afterNodeId?, beforeNodeId? }
 */
export const detectInsertionPoint = (newNodeId, edges) => {
  try {
    // Encontrar conexões que envolvem o novo node
    const incomingEdges = edges.filter(e => e.target === newNodeId);
    const outgoingEdges = edges.filter(e => e.source === newNodeId);
    
    // Se não tem conexões de entrada, está no início
    if (incomingEdges.length === 0) {
      return { position: 'start' };
    }
    
    // Se não tem conexões de saída, está no fim
    if (outgoingEdges.length === 0) {
      return { 
        position: 'end', 
        afterNodeId: incomingEdges[0]?.source 
      };
    }
    
    // Se tem ambas, está no meio
    return {
      position: 'middle',
      afterNodeId: incomingEdges[0]?.source,
      beforeNodeId: outgoingEdges[0]?.target
    };
  } catch (error) {
    console.error('❌ Erro ao detectar ponto de inserção:', error);
    return { position: 'end' };
  }
};

/**
 * Atualiza a sequência adicionando um novo node na posição correta
 * @param {Array} currentSequence - Sequência atual de nodes
 * @param {Object} newNode - Novo node a ser inserido
 * @param {Object} insertionPoint - Ponto de inserção detectado
 * @returns {Array} Nova sequência com o node inserido
 */
export const insertNodeInSequence = (currentSequence, newNode, insertionPoint) => {
  try {
    const newSequence = [...currentSequence];
    
    switch (insertionPoint.position) {
      case 'start':
        // Inserir no início (após segment nodes)
        const firstItemIndex = newSequence.findIndex(n => n.type === 'itemNode');
        const insertIndex = firstItemIndex !== -1 ? firstItemIndex : newSequence.length;
        newSequence.splice(insertIndex, 0, newNode);
        break;
        
      case 'end':
        // Inserir no fim
        newSequence.push(newNode);
        break;
        
      case 'middle':
        // Inserir entre nodes específicos
        const afterIndex = newSequence.findIndex(n => n.id === insertionPoint.afterNodeId);
        if (afterIndex !== -1) {
          newSequence.splice(afterIndex + 1, 0, newNode);
        } else {
          newSequence.push(newNode);
        }
        break;
        
      default:
        newSequence.push(newNode);
    }
    
    return newSequence;
  } catch (error) {
    console.error('❌ Erro ao inserir node na sequência:', error);
    return currentSequence;
  }
};