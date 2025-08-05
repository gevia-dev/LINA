import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import { 
  serializeCanvasState, 
  deserializeCanvasState, 
  convertNewsDataToCanvasState,
  convertCanvasStateToNewsData,
  validateCanvasState 
} from '../utils/canvasSerializer';

/**
 * Hook avançado para gerenciar canvas ReactFlow com funcionalidades avançadas:
 * - Serialização/desserialização com versionamento
 * - Posicionamento livre com pan & zoom
 * - Prevenção de conflitos de eventos
 * - Gestão de viewport e limites
 * - Animações suaves
 */
export const useAdvancedCanvas = (newsData, newsId) => {
  // Estados básicos do ReactFlow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Estados para viewport e gestão avançada
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [canvasLimits, setCanvasLimits] = useState({
    minZoom: 0.1,
    maxZoom: 4,
    panOnDrag: true,
    zoomOnScroll: true,
    zoomOnPinch: true,
    panOnScrollMode: 'free'
  });
  
  // Estados para gestão de conflitos e interações
  const [draggedNode, setDraggedNode] = useState(null);
  const [isNodeDragging, setIsNodeDragging] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  
  // Refs para controle de elementos
  const reactFlowInstance = useRef(null);
  const canvasContainer = useRef(null);
  const animationFrame = useRef(null);
  
  // Configurações de viewport com limites seguros
  const viewportConfig = useMemo(() => ({
    minZoom: canvasLimits.minZoom,
    maxZoom: canvasLimits.maxZoom,
    onlyRenderVisibleElements: true,
    defaultViewport: viewport,
    fitViewOptions: {
      padding: 0.1,
      includeHiddenNodes: false,
      maxZoom: 1.5,
      duration: 800
    }
  }), [canvasLimits, viewport]);

  // Configurações de interação para prevenir conflitos
  const interactionConfig = useMemo(() => ({
    nodesDraggable: !editingNode,
    nodesConnectable: false,
    elementsSelectable: !editingNode,
    panOnDrag: canvasLimits.panOnDrag && !isNodeDragging && !editingNode,
    zoomOnScroll: canvasLimits.zoomOnScroll && !editingNode,
    zoomOnPinch: canvasLimits.zoomOnPinch && !editingNode,
    panOnScrollMode: canvasLimits.panOnScrollMode,
    preventScrolling: editingNode !== null
  }), [canvasLimits, isNodeDragging, editingNode]);

  // Inicialização do canvas com dados da notícia
  useEffect(() => {
    if (newsData && !isInitialized) {
      try {
        // Tentar carregar estado salvo (localStorage temporário para demo)
        const savedStateKey = `canvas_state_${newsId}`;
        const savedState = localStorage.getItem(savedStateKey);
        
        // Converter newsData para estado do canvas
        const canvasState = convertNewsDataToCanvasState(newsData, savedState);
        
        if (validateCanvasState(canvasState)) {
          setNodes(canvasState.nodes);
          setEdges(canvasState.edges || []);
          setViewport(canvasState.viewport);
          setIsInitialized(true);
          
          console.log('✅ Canvas inicializado com estado:', canvasState);
        } else {
          console.warn('⚠️ Estado do canvas inválido, usando padrão');
          initializeDefaultCanvas();
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar canvas:', error);
        initializeDefaultCanvas();
      }
    }
  }, [newsData, newsId, isInitialized]);

  // Função para inicializar canvas com valores padrão
  const initializeDefaultCanvas = useCallback(() => {
    const defaultState = convertNewsDataToCanvasState(newsData);
    setNodes(defaultState.nodes);
    setEdges(defaultState.edges);
    setViewport(defaultState.viewport);
    setIsInitialized(true);
  }, [newsData]);

  // Salvar estado do canvas (debounced)
  const saveCanvasState = useCallback(() => {
    if (!isInitialized || !newsId) return;

    try {
      const currentState = {
        viewport,
        nodes,
        edges,
        metadata: {
          newsId,
          updatedAt: new Date().toISOString()
        }
      };

      const serializedState = serializeCanvasState(currentState, newsId);
      const savedStateKey = `canvas_state_${newsId}`;
      
      // Salvar no localStorage (temporário para demo)
      localStorage.setItem(savedStateKey, serializedState);
      
      console.log('💾 Estado do canvas salvo');
    } catch (error) {
      console.error('❌ Erro ao salvar estado do canvas:', error);
    }
  }, [viewport, nodes, edges, newsId, isInitialized]);

  // Debounced save - salva 1 segundo após última mudança
  useEffect(() => {
    if (animationFrame.current) {
      clearTimeout(animationFrame.current);
    }
    
    animationFrame.current = setTimeout(saveCanvasState, 1000);
    
    return () => {
      if (animationFrame.current) {
        clearTimeout(animationFrame.current);
      }
    };
  }, [saveCanvasState]);

  // Gerenciar mudanças de viewport
  const handleViewportChange = useCallback((newViewport) => {
    // Aplicar limites de zoom
    const clampedZoom = Math.max(
      canvasLimits.minZoom, 
      Math.min(canvasLimits.maxZoom, newViewport.zoom)
    );
    
    // Aplicar limites de pan (opcional)
    const clampedViewport = {
      ...newViewport,
      zoom: clampedZoom
    };
    
    setViewport(clampedViewport);
  }, [canvasLimits]);

  // Gerenciar início de drag de node
  const handleNodeDragStart = useCallback((event, node) => {
    setDraggedNode(node);
    setIsNodeDragging(true);
    
    // Adicionar classes para prevenir conflitos
    if (canvasContainer.current) {
      canvasContainer.current.classList.add('node-dragging');
    }
  }, []);

  // Gerenciar fim de drag de node
  const handleNodeDragStop = useCallback((event, node) => {
    setDraggedNode(null);
    setIsNodeDragging(false);
    
    // Remover classes de prevenção de conflitos
    if (canvasContainer.current) {
      canvasContainer.current.classList.remove('node-dragging');
    }
  }, []);

  // Gerenciar início de edição de node
  const handleNodeEditStart = useCallback((nodeId) => {
    setEditingNode(nodeId);
    
    // Desabilitar interações do canvas durante edição
    if (canvasContainer.current) {
      canvasContainer.current.classList.add('node-editing', 'nopan', 'nowheel');
    }
  }, []);

  // Gerenciar fim de edição de node
  const handleNodeEditEnd = useCallback(() => {
    setEditingNode(null);
    
    // Reabilitar interações do canvas
    if (canvasContainer.current) {
      canvasContainer.current.classList.remove('node-editing', 'nopan', 'nowheel');
    }
  }, []);

  // Função para resetar viewport
  const resetViewport = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView({
        padding: 0.1,
        duration: 800
      });
    }
  }, []);

  // Função para centralizar em um node específico
  const focusNode = useCallback((nodeId) => {
    if (reactFlowInstance.current) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        reactFlowInstance.current.setCenter(
          node.position.x + 175, // Metade da largura do node
          node.position.y + 100, // Metade da altura do node
          { zoom: 1.2, duration: 600 }
        );
      }
    }
  }, [nodes]);

  // Função para atualizar conteúdo de um node
  const updateNodeContent = useCallback((nodeId, newContent) => {
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId 
          ? { 
              ...node, 
              data: { 
                ...node.data, 
                content: newContent,
                hasContent: newContent && 
                  !newContent.includes('Clique para selecionar') &&
                  !newContent.includes('Clique novamente para editar')
              } 
            }
          : node
      )
    );
  }, [setNodes]);

  // Função para converter estado atual para newsData
  const exportToNewsData = useCallback(() => {
    const currentState = { viewport, nodes, edges };
    return convertCanvasStateToNewsData(currentState);
  }, [viewport, nodes, edges]);

  // Função para adicionar animações suaves aos nodes
  const animateNodes = useCallback((animationType = 'fadeIn') => {
    const animations = {
      fadeIn: { opacity: [0, 1], scale: [0.8, 1] },
      slideUp: { y: [50, 0], opacity: [0, 1] },
      bounce: { scale: [0.8, 1.1, 1], transition: { type: 'spring' } }
    };

    const animation = animations[animationType] || animations.fadeIn;
    
    setNodes(prevNodes => 
      prevNodes.map((node, index) => ({
        ...node,
        data: {
          ...node.data,
          animation: {
            ...animation,
            transition: {
              duration: 0.6,
              delay: index * 0.1,
              ease: 'easeOut'
            }
          }
        }
      }))
    );
  }, [setNodes]);

  // Função para adicionar novo node ao canvas
  const addNewNode = useCallback((content, title = 'Novo Bloco', type = 'custom') => {
    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calcular posição baseada no viewport atual e número de nodes existentes
    const newNodePosition = {
      x: viewport.x + 100 + (nodes.length * 50),
      y: viewport.y + 100 + (nodes.length * 30)
    };
    
    const newNode = {
      id: newNodeId,
      type: 'cardNode',
      position: newNodePosition,
      data: {
        id: newNodeId,
        title: title,
        content: content,
        minHeight: '120px',
        coreKey: type,
        isEditing: false,
        hasContent: content && content.trim().length > 0,
        onEdit: () => {}, // Será configurado pelo componente pai
        onTransfer: () => {}, // Será configurado pelo componente pai
        onEditStart: () => {}, // Será configurado pelo componente pai
        onEditEnd: () => {}, // Será configurado pelo componente pai
        animation: {
          opacity: [0, 1],
          scale: [0.8, 1],
          transition: {
            duration: 0.4,
            ease: 'easeOut'
          }
        }
      }
    };
    
    setNodes(prevNodes => [...prevNodes, newNode]);
    
    // Animar o novo node
    setTimeout(() => {
      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.id === newNodeId 
            ? { ...node, data: { ...node.data, animation: null } }
            : node
        )
      );
    }, 400);
    
    return newNodeId;
  }, [nodes.length, viewport, setNodes]);

  // Limpar animação frame ao desmontar
  useEffect(() => {
    return () => {
      if (animationFrame.current) {
        clearTimeout(animationFrame.current);
      }
    };
  }, []);

  return {
    // Estados básicos
    nodes,
    edges,
    viewport,
    isInitialized,
    
    // Estados de interação
    draggedNode,
    isNodeDragging,
    editingNode,
    
    // Configurações
    viewportConfig,
    interactionConfig,
    canvasLimits,
    
    // Refs
    reactFlowInstance,
    canvasContainer,
    
    // Handlers do ReactFlow
    onNodesChange,
    onEdgesChange,
    onViewportChange: handleViewportChange,
    onNodeDragStart: handleNodeDragStart,
    onNodeDragStop: handleNodeDragStop,
    
    // Handlers customizados
    onNodeEditStart: handleNodeEditStart,
    onNodeEditEnd: handleNodeEditEnd,
    
    // Funções utilitárias
    resetViewport,
    focusNode,
    updateNodeContent,
    exportToNewsData,
    animateNodes,
    saveCanvasState,
    addNewNode,
    
    // Setters
    setNodes,
    setEdges,
    setViewport,
    setCanvasLimits
  };
};