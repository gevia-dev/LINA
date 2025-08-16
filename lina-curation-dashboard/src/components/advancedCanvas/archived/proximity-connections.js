// ARQUIVADO: Sistema de Proximity Connections
// Substituído por Floating Edges padrão do React Flow

// Constantes para conexão por proximidade
const PROXIMITY_THRESHOLD = 250; // Distância mínima para conectar (aumentado para ser mais realista)
const CONXIMITY_THRESHOLD_SEGMENT = 300; // Threshold específico para segmentos (mais generoso)
const CONNECTION_DELAY = 300; // Delay antes de confirmar conexão (ms)

// Função para calcular distância entre dois nodes
const getDistance = (node1, node2) => {
  if (!node1?.position || !node2?.position) return Infinity;
  
  const dx = node1.position.x - node2.position.x;
  const dy = node1.position.y - node2.position.y;
  
  // Considera o tamanho dos nodes para calcular distância das bordas
  const node1Width = node1.width || 320; // Largura padrão dos ItemNodes
  const node1Height = node1.height || 130; // Altura padrão dos ItemNodes
  const node2Width = node2.width || 200; // Largura padrão dos SegmentNodes
  const node2Height = node2.height || 80; // Altura padrão dos SegmentNodes
  
  // Calcula distância do centro ao centro (mais intuitivo para conexões)
  const centerDx = dx + (node1Width - node2Width) / 2;
  const centerDy = dy + (node1Height - node2Height) / 2;
  
  return Math.sqrt(centerDx * centerDx + centerDy * centerDy);
};

// Função para encontrar a conexão mais próxima (baseada no hook de referência)
const getClosestConnection = (draggedNode, nodes, edges, rfInstance) => {
  if (!rfInstance || !draggedNode) {
    console.log('[DEBUG] getClosestConnection: rfInstance ou draggedNode inválido', { rfInstance: !!rfInstance, draggedNode });
    return null;
  }
  
  console.log('[DEBUG] getClosestConnection: iniciando busca para', draggedNode.id, draggedNode.type);
  
  const draggedPosition = draggedNode.position;
  let closestNode = null;
  let minDistance = Number.MAX_VALUE;
  let connectionType = null;
  
  // Procura por nodes de segmentação para conectar
  const segmentNodes = nodes.filter(n => n.type === 'segmentNode' && n.id !== draggedNode.id);
  console.log('[DEBUG] SegmentNodes disponíveis:', segmentNodes.map(n => ({ id: n.id, type: n.type, position: n.position })));
  
  segmentNodes.forEach((node) => {
    const distance = getDistance(draggedNode, node);
    const threshold = CONXIMITY_THRESHOLD_SEGMENT; // Threshold mais generoso para segmentos
    console.log(`[DEBUG] Distância para ${node.id}:`, distance, 'threshold:', threshold);
    
    if (distance < minDistance && distance < threshold) {
      minDistance = distance;
      closestNode = node;
      connectionType = 'segment';
      console.log(`[DEBUG] Novo node mais próximo encontrado:`, node.id, 'distância:', distance);
    }
  });
  
  // Se não encontrou segmento próximo, procura por outros nodes de dados
  if (!closestNode && draggedNode.type === 'itemNode') {
    const otherDataNodes = nodes.filter(n => n.type === 'itemNode' && n.id !== draggedNode.id);
    console.log('[DEBUG] ItemNodes disponíveis para conexão:', otherDataNodes.map(n => ({ id: n.id, position: n.position })));
    
    otherDataNodes.forEach((node) => {
      const distance = getDistance(draggedNode, node);
      console.log(`[DEBUG] Distância para ItemNode ${node.id}:`, distance);
      
      if (distance < minDistance && distance < PROXIMITY_THRESHOLD) {
        minDistance = distance;
        closestNode = node;
        connectionType = 'data';
        console.log(`[DEBUG] Novo ItemNode mais próximo encontrado:`, node.id, 'distância:', distance);
      }
    });
  }
  
  if (!closestNode) {
    console.log('[DEBUG] Nenhum node próximo encontrado');
    return null;
  }
  
  console.log('[DEBUG] 🎯 CONEXÃO ENCONTRADA! Node mais próximo:', {
    id: closestNode.id,
    type: closestNode.type,
    distance: minDistance,
    connectionType,
    threshold: connectionType === 'segment' ? CONXIMITY_THRESHOLD_SEGMENT : PROXIMITY_THRESHOLD
  });
  
  // Determina a direção da conexão baseada no tipo de node
  if (connectionType === 'segment') {
    // Para conexões com segmentos: permite ambas as direções com proteção
    if (draggedNode.type === 'itemNode') {
      // ItemNode arrastado: pode conectar ao SegmentNode
      // VERIFICA se já existe conexão segment → item entre os mesmos nodes
      const existingSegmentToItem = edges.find(edge => 
        edge.source === closestNode.id && 
        edge.target === draggedNode.id && 
        edge.data?.connectionType === 'segment-to-item'
      );
      
      if (existingSegmentToItem) {
        console.log('[DEBUG] Bloqueando conexão Item → Segmento: já existe conexão Segment → Item');
        return null;
      }
      
      const connection = {
        id: `${draggedNode.id}-${closestNode.id}`,
        source: draggedNode.id, // ItemNode: origem
        target: closestNode.id,  // SegmentNode: destino
        type: 'smoothstep',
        style: { stroke: '#16A085', strokeWidth: 2, strokeDasharray: '5,5' }, // Verde para Item → Segment
        sourceHandle: 'data-output', // ItemNode: handle de saída (baixo)
        targetHandle: 'segment-input', // SegmentNode: handle de entrada (cima)
        data: { proximity: true, connectionType: 'item-to-segment' }
      };
      console.log('[DEBUG] Criando conexão Item → Segmento:', connection);
      return connection;
    } else {
      // SegmentNode arrastado: pode conectar ao ItemNode
      // VERIFICA se já existe conexão item → segment entre os mesmos nodes
      const existingItemToSegment = edges.find(edge => 
        edge.source === closestNode.id && 
        edge.target === draggedNode.id && 
        edge.data?.connectionType === 'item-to-segment'
      );
      
      if (existingItemToSegment) {
        console.log('[DEBUG] Bloqueando conexão Segment → Item: já existe conexão Item → Segment');
        return null;
      }
      
      const connection = {
        id: `${draggedNode.id}-${closestNode.id}`,
        source: draggedNode.id, // SegmentNode: origem
        target: closestNode.id,  // ItemNode: destino
        type: 'smoothstep',
        style: { stroke: '#4A90E2', strokeWidth: 2, strokeDasharray: '5,5' }, // Azul para Segment → Item
        sourceHandle: 'segment-output', // SegmentNode: handle de saída (baixo)
        targetHandle: 'data-input',     // ItemNode: handle de entrada (cima)
        data: { proximity: true, connectionType: 'segment-to-item' }
      };
      console.log('[DEBUG] Criando conexão Segmento → Item:', connection);
      return connection;
    }
  } else if (connectionType === 'data') {
    // Para conexões entre dados: determina direção baseada na posição
    const draggedIsSource = draggedPosition.y < closestNode.position.y;
    const connection = {
      id: draggedIsSource 
        ? `${draggedNode.id}-${closestNode.id}` 
        : `${closestNode.id}-${draggedNode.id}`,
      source: draggedIsSource ? draggedNode.id : closestNode.id,
      target: draggedIsSource ? closestNode.id : draggedNode.id,
      type: 'smoothstep',
      style: { stroke: '#16A085', strokeWidth: 2, strokeDasharray: '5,5' },
      sourceHandle: 'data-output',
      targetHandle: 'data-input',
      data: { proximity: true, connectionType: 'data' }
    };
    console.log('[DEBUG] Criando conexão Item → Item:', connection);
    return connection;
  }
  
  console.log('[DEBUG] Tipo de conexão não reconhecido:', connectionType);
  return null;
};

// Handlers de drag para proximity connections
const createProximityHandlers = (setEdges, edges, getClosestConnection) => {
  const onNodeDrag = (event, draggedNode) => {
    try {
      console.log('[DEBUG] onNodeDrag: iniciado para', draggedNode.id, draggedNode.type);
      
      // Processa nodes de segmentação e dados
      if (draggedNode.type !== 'segmentNode' && draggedNode.type !== 'itemNode') {
        console.log('[DEBUG] onNodeDrag: tipo de node não suportado:', draggedNode.type);
        return;
      }
      
      const closestConnection = getClosestConnection(draggedNode, nodes, edges, rfInstance);
      
      if (closestConnection) {
        console.log('[DEBUG] Conexão encontrada:', {
          draggedNode: draggedNode.id,
          closestNode: closestConnection.target,
          sourceHandle: closestConnection.sourceHandle,
          targetHandle: closestConnection.targetHandle,
          connection: closestConnection
        });
      } else {
        console.log('[DEBUG] Nenhuma conexão encontrada para', draggedNode.id);
      }
      
      setEdges((currentEdges) => {
        console.log('[DEBUG] Edges atuais:', currentEdges.length);
        
        // Remove conexões temporárias anteriores
        const edgesWithoutTemp = currentEdges.filter(edge => edge.className !== 'temp');
        console.log('[DEBUG] Edges sem temporários:', edgesWithoutTemp.length);
        
        if (closestConnection && !edgesWithoutTemp.find(edge => 
          edge.source === closestConnection.source && edge.target === closestConnection.target
        )) {
          // Adiciona conexão temporária
          const tempEdge = { 
            ...closestConnection, 
            className: 'temp',
            data: { ...closestConnection.data, proximity: true, temporary: true }
          };
          console.log('[DEBUG] Adicionando edge temporário:', tempEdge);
          return [...edgesWithoutTemp, tempEdge];
        }
        
        return edgesWithoutTemp;
      });
    } catch (error) {
      console.error('Erro no onNodeDrag:', error);
    }
  };

  const onNodeDragStop = (event, draggedNode) => {
    try {
      console.log('[DEBUG] onNodeDragStop: finalizado para', draggedNode.id, draggedNode.type);
      
      // Processa nodes de segmentação e dados
      if (draggedNode.type !== 'segmentNode' && draggedNode.type !== 'itemNode') {
        console.log('[DEBUG] onNodeDragStop: tipo de node não suportado:', draggedNode.type);
        return;
      }
      
      const closestConnection = getClosestConnection(draggedNode, nodes, edges, rfInstance);
      
      if (closestConnection) {
        console.log('[DEBUG] onNodeDragStop: criando conexão permanente:', closestConnection);
        
        setEdges((currentEdges) => {
          console.log('[DEBUG] onNodeDragStop: edges atuais:', currentEdges.length);
          
          // Remove conexões temporárias
          const edgesWithoutTemp = currentEdges.filter(edge => edge.className !== 'temp');
          console.log('[DEBUG] onNodeDragStop: edges sem temporários:', edgesWithoutTemp.length);
          
          // Adiciona conexão permanente se não existir
          if (!edgesWithoutTemp.find(edge => 
            edge.source === closestConnection.source && edge.target === closestConnection.target
          )) {
            const permanentEdge = { 
              ...closestConnection,
              data: { ...closestConnection.data, proximity: true, temporary: false }
            };
            delete permanentEdge.className; // Remove classe temporária
            console.log('[DEBUG] onNodeDragStop: adicionando edge permanente:', permanentEdge);
            return [...edgesWithoutTemp, permanentEdge];
          } else {
            console.log('[DEBUG] onNodeDragStop: edge já existe, não duplicando');
          }
          
          return edgesWithoutTemp;
        });
      } else {
        console.log('[DEBUG] onNodeDragStop: removendo todas as conexões temporárias');
        
        // Remove todas as conexões temporárias se não há conexão próxima
        setEdges((currentEdges) => {
          const edgesWithoutTemp = currentEdges.filter(edge => edge.className !== 'temp');
          console.log('[DEBUG] onNodeDragStop: edges após remoção de temporários:', edgesWithoutTemp.length);
          return edgesWithoutTemp;
        });
      }
    } catch (error) {
      console.error('Erro no onNodeDragStop:', error);
    }
  };

  return { onNodeDrag, onNodeDragStop };
};

export {
  PROXIMITY_THRESHOLD,
  CONXIMITY_THRESHOLD_SEGMENT,
  CONNECTION_DELAY,
  getDistance,
  getClosestConnection,
  createProximityHandlers
};
