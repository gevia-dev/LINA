// src/hooks/useProximityConnections.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStoreApi, useReactFlow, MarkerType } from '@xyflow/react';
import { useDebounce } from './useDebounce'; // Você pode criar ou usar um debounce existente

const PROXIMITY_THRESHOLD = 150; // Distância mínima para conectar
const BRIDGE_THRESHOLD = 200; // Distância para considerar um node como ponte
const CONNECTION_DELAY = 300; // Delay antes de confirmar conexão (ms)

export const useProximityConnections = ({
  enabled = true,
  proximityThreshold = PROXIMITY_THRESHOLD,
  bridgeThreshold = BRIDGE_THRESHOLD,
  onMainLineUpdate = () => {},
  nodeFilter = () => true, // Filtro para decidir quais nodes participam
}) => {
  const store = useStoreApi();
  const { getNodes, getEdges, setEdges, getInternalNode, screenToFlowPosition } = useReactFlow();
  
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [temporaryEdges, setTemporaryEdges] = useState([]);
  const [mainLineNodes, setMainLineNodes] = useState([]);
  const connectionTimeoutRef = useRef(null);
  const lastPositionsRef = useRef(new Map());

  // Calcula distância euclidiana entre dois nodes
  const getDistance = useCallback((node1, node2) => {
    if (!node1?.position || !node2?.position) return Infinity;
    
    const dx = node1.position.x - node2.position.x;
    const dy = node1.position.y - node2.position.y;
    
    // Considera o tamanho dos nodes para calcular distância das bordas
    const node1Width = node1.width || 150;
    const node1Height = node1.height || 50;
    const node2Width = node2.width || 150;
    const node2Height = node2.height || 50;
    
    // Ajusta para considerar o centro dos nodes
    const centerDx = dx + (node1Width - node2Width) / 2;
    const centerDy = dy + (node1Height - node2Height) / 2;
    
    return Math.sqrt(centerDx * centerDx + centerDy * centerDy);
  }, []);

  // Encontra nodes próximos a um node específico
  const findNearbyNodes = useCallback((targetNode, nodes, threshold = proximityThreshold) => {
    if (!targetNode) return [];
    
    return nodes
      .filter(node => 
        node.id !== targetNode.id && 
        nodeFilter(node) &&
        getDistance(targetNode, node) < threshold
      )
      .sort((a, b) => getDistance(targetNode, a) - getDistance(targetNode, b));
  }, [getDistance, nodeFilter, proximityThreshold]);

  // Detecta se um node está entre dois outros (para criar ponte)
  const isNodeBetween = useCallback((nodeA, nodeB, nodeC) => {
    if (!nodeA || !nodeB || !nodeC) return false;
    
    const distAB = getDistance(nodeA, nodeB);
    const distAC = getDistance(nodeA, nodeC);
    const distBC = getDistance(nodeB, nodeC);
    
    // Node C está entre A e B se a soma das distâncias AC + BC é aproximadamente igual a AB
    const tolerance = 50; // Tolerância para considerar "entre"
    return Math.abs((distAC + distBC) - distAB) < tolerance;
  }, [getDistance]);

  // Cria uma edge com estilo apropriado
  const createProximityEdge = useCallback((source, target, isTemporary = false, isBridge = false) => {
    const edgeId = `proximity-${source}-${target}`;
    
    return {
      id: edgeId,
      source,
      target,
      type: 'smoothstep',
      animated: isTemporary,
      style: {
        stroke: isTemporary ? '#2BB24C50' : (isBridge ? '#F5A623' : '#4A90E2'),
        strokeWidth: isTemporary ? 2 : 3,
        strokeDasharray: isTemporary ? '5 5' : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isTemporary ? '#2BB24C50' : (isBridge ? '#F5A623' : '#4A90E2'),
      },
      data: {
        proximity: true,
        temporary: isTemporary,
        bridge: isBridge,
      },
      className: isTemporary ? 'proximity-edge-temp' : 'proximity-edge',
    };
  }, []);

  // Reconstrói a linha principal baseada nas conexões
  const rebuildMainLine = useCallback(() => {
    const nodes = getNodes().filter(nodeFilter);
    const edges = getEdges().filter(e => e.data?.proximity && !e.data?.temporary);
    
    if (nodes.length === 0) {
      setMainLineNodes([]);
      onMainLineUpdate([]);
      return;
    }

    // Encontra node inicial (pode ser customizado - ex: o mais à esquerda)
    const startNode = nodes.reduce((leftmost, node) => 
      !leftmost || node.position.x < leftmost.position.x ? node : leftmost
    , null);

    // Constrói a sequência seguindo as edges
    const visited = new Set();
    const sequence = [];
    const queue = [startNode];
    
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current.id)) continue;
      
      visited.add(current.id);
      sequence.push(current);
      
      // Encontra nodes conectados
      const connected = edges
        .filter(e => e.source === current.id || e.target === current.id)
        .map(e => e.source === current.id ? e.target : e.source)
        .filter(id => !visited.has(id))
        .map(id => nodes.find(n => n.id === id))
        .filter(Boolean);
      
      queue.push(...connected);
    }
    
    setMainLineNodes(sequence);
    onMainLineUpdate(sequence);
  }, [getNodes, getEdges, nodeFilter, onMainLineUpdate]);

  // Atualiza conexões baseadas em proximidade
  const updateProximityConnections = useCallback((skipNode = null) => {
    if (!enabled) return;
    
    const nodes = getNodes().filter(nodeFilter);
    const currentEdges = getEdges();
    const newEdges = [];
    const processedPairs = new Set();
    
    // Para cada node, encontra conexões próximas
    nodes.forEach(node => {
      if (node.id === skipNode) return;
      
      const nearbyNodes = findNearbyNodes(node, nodes);
      
      nearbyNodes.forEach(nearbyNode => {
        const pairKey = [node.id, nearbyNode.id].sort().join('-');
        if (processedPairs.has(pairKey)) return;
        processedPairs.add(pairKey);
        
        // Verifica se já existe edge
        const existingEdge = currentEdges.find(e => 
          (e.source === node.id && e.target === nearbyNode.id) ||
          (e.source === nearbyNode.id && e.target === node.id)
        );
        
        if (!existingEdge) {
          // Verifica se existe um node entre eles (para criar ponte)
          const bridgeNode = nodes.find(n => 
            n.id !== node.id && 
            n.id !== nearbyNode.id &&
            isNodeBetween(node, nearbyNode, n)
          );
          
          if (bridgeNode) {
            // Cria duas edges através do node ponte
            newEdges.push(
              createProximityEdge(node.id, bridgeNode.id, false, true),
              createProximityEdge(bridgeNode.id, nearbyNode.id, false, true)
            );
          } else {
            // Cria edge direta
            newEdges.push(createProximityEdge(node.id, nearbyNode.id));
          }
        }
      });
    });
    
    // Remove edges de nodes que não estão mais próximos
    const validEdges = currentEdges.filter(edge => {
      if (!edge.data?.proximity) return true; // Mantém edges não-proximity
      
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return false;
      
      const distance = getDistance(sourceNode, targetNode);
      return distance < proximityThreshold * 1.2; // Adiciona margem para evitar flicker
    });
    
    // Atualiza edges
    setEdges([...validEdges.filter(e => !e.data?.proximity), ...newEdges]);
    
    // Reconstrói linha principal
    setTimeout(rebuildMainLine, 100);
  }, [enabled, getNodes, getEdges, setEdges, nodeFilter, findNearbyNodes, 
      isNodeBetween, createProximityEdge, proximityThreshold, getDistance, rebuildMainLine]);

  // Handler para início do drag
  const handleNodeDragStart = useCallback((event, node) => {
    if (!enabled || !nodeFilter(node)) return;
    
    setIsDragging(true);
    setDraggedNodeId(node.id);
    
    // Salva posição inicial
    lastPositionsRef.current.set(node.id, { ...node.position });
  }, [enabled, nodeFilter]);

  // Handler para drag em progresso
  const handleNodeDrag = useCallback((event, node) => {
    if (!enabled || !isDragging || node.id !== draggedNodeId) return;
    
    // Limpa timeout anterior
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    // Encontra nodes próximos para preview
    const nodes = getNodes().filter(n => n.id !== node.id && nodeFilter(n));
    const nearbyNodes = findNearbyNodes(node, nodes);
    
    // Cria edges temporárias para visualização
    const tempEdges = nearbyNodes.map(nearby => 
      createProximityEdge(node.id, nearby.id, true)
    );
    
    setTemporaryEdges(tempEdges);
    
    // Agenda atualização de conexões
    connectionTimeoutRef.current = setTimeout(() => {
      updateProximityConnections(node.id);
    }, CONNECTION_DELAY);
  }, [enabled, isDragging, draggedNodeId, getNodes, nodeFilter, 
      findNearbyNodes, createProximityEdge, updateProximityConnections]);

  // Handler para fim do drag
  const handleNodeDragStop = useCallback((event, node) => {
    if (!enabled || !isDragging) return;
    
    setIsDragging(false);
    setDraggedNodeId(null);
    setTemporaryEdges([]);
    
    // Limpa timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    // Atualiza conexões finais
    updateProximityConnections();
  }, [enabled, isDragging, updateProximityConnections]);

  // Adiciona/remove edges temporárias do conjunto de edges
  useEffect(() => {
    if (!isDragging) return;
    
    const currentEdges = getEdges().filter(e => !e.data?.temporary);
    setEdges([...currentEdges, ...temporaryEdges]);
  }, [temporaryEdges, isDragging, getEdges, setEdges]);

  // Inicializa conexões quando habilitado
  useEffect(() => {
    if (enabled) {
      updateProximityConnections();
    }
  }, [enabled]);

  return {
    // Estados
    isDragging,
    draggedNodeId,
    mainLineNodes,
    temporaryEdges,
    
    // Handlers
    onNodeDragStart: handleNodeDragStart,
    onNodeDrag: handleNodeDrag,
    onNodeDragStop: handleNodeDragStop,
    
    // Utilidades
    updateConnections: updateProximityConnections,
    rebuildMainLine,
    findNearbyNodes,
    getDistance,
  };
};

// Hook de debounce auxiliar (se não existir)
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};