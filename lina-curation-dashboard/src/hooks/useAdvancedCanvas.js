import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';
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
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 0.75 });
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
      maxZoom: 0.75,
      duration: 800
    }
  }), [canvasLimits, viewport]);

  // Configurações de interação para prevenir conflitos
  const interactionConfig = useMemo(() => ({
    nodesDraggable: !editingNode,
    nodesConnectable: !editingNode,
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
          
      
        } else {
          // Estado do canvas inválido, usando padrão
          initializeDefaultCanvas();
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar canvas:', error);
        initializeDefaultCanvas();
      }
    }
  }, [newsData, newsId, isInitialized]);

  // Função para resetar viewport
  const resetViewport = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView({
        padding: 0.1,
        duration: 800
      });
      
      // Aplicar zoom de 75% após o fit view
      setTimeout(() => {
        if (reactFlowInstance.current) {
          reactFlowInstance.current.setViewport({
            x: reactFlowInstance.current.getViewport().x,
            y: reactFlowInstance.current.getViewport().y,
            zoom: 0.75
          }, { duration: 400 });
        }
      }, 850);
    }
  }, []);

  // Fit view automático quando o canvas é inicializado
  useEffect(() => {
    if (isInitialized && reactFlowInstance.current) {
      // Pequeno delay para garantir que os nodes foram renderizados
      const timer = setTimeout(() => {
        resetViewport();
    
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialized, resetViewport]);

  // Função para lidar com novas conexões
  const onConnect = useCallback((connection) => {
    
    // Determinar estilo baseado no tipo de handle
    let edgeStyle = {
      stroke: 'rgba(255, 255, 255, 0.6)',
      strokeWidth: 2,
    };
    let markerColor = 'rgba(255, 255, 255, 0.6)';
    
    // Estilos específicos para handles especializados
    if (connection.sourceHandle === 'dados' || connection.targetHandle === 'dados') {
      edgeStyle = {
        stroke: '#4A90E2',
        strokeWidth: 3,
        strokeDasharray: '5, 5',
      };
      markerColor = '#4A90E2';
    } else if (connection.sourceHandle === 'estrutura' || connection.targetHandle === 'estrutura') {
      edgeStyle = {
        stroke: '#F5A623',
        strokeWidth: 3,
        strokeDasharray: '10, 5',
      };
      markerColor = '#F5A623';
    }
    
    // Estilo customizado para a nova aresta
    const newEdge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}-${connection.sourceHandle || 'default'}-${connection.targetHandle || 'default'}`,
      type: 'smoothstep',
      animated: true,
      style: edgeStyle,
      markerEnd: {
        type: 'arrowclosed',
        color: markerColor,
      },
      data: {
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: connection.sourceHandle || connection.targetHandle || 'default'
      },
      // Adicionar atributos data para CSS targeting
      'data-source-handle': connection.sourceHandle || 'default',
      'data-target-handle': connection.targetHandle || 'default'
    };
    
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

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

  // Função para calcular posição inteligente para novos nodes
  const calculateSmartPosition = useCallback(() => {
    if (nodes.length === 0) {
      // Se não há nodes, posicionar no centro da tela
      return { x: 0, y: 0 };
    }
    
    // Calcular o centro dos nodes existentes
    const centerX = nodes.reduce((sum, node) => sum + node.position.x, 0) / nodes.length;
    const centerY = nodes.reduce((sum, node) => sum + node.position.y, 0) / nodes.length;
    
    // Calcular a posição do novo node em um padrão espiral
    const angle = (nodes.length * 137.5) * (Math.PI / 180); // Ângulo dourado
    const radius = 200 + (nodes.length * 20); // Distância crescente
    
    const offsetX = Math.cos(angle) * radius;
    const offsetY = Math.sin(angle) * radius;
    
    let newPosition = {
      x: centerX + offsetX,
      y: centerY + offsetY
    };
    
    // Garantir que o novo node esteja na área visível
    if (reactFlowInstance.current) {
      const viewport = reactFlowInstance.current.getViewport();
      const container = reactFlowInstance.current.getViewport();
      
      // Converter coordenadas do mundo para coordenadas da tela
      const screenX = (newPosition.x - viewport.x) * viewport.zoom;
      const screenY = (newPosition.y - viewport.y) * viewport.zoom;
      
      // Se estiver muito longe da área visível, ajustar para próximo ao centro da tela
      if (Math.abs(screenX) > 800 || Math.abs(screenY) > 600) {
        newPosition = {
          x: viewport.x + (Math.random() - 0.5) * 400,
          y: viewport.y + (Math.random() - 0.5) * 300
        };
      }
    }
    
    return newPosition;
  }, [nodes]);

  // Função para adicionar novo node ao canvas
  const addNewNode = useCallback((nodeOrContent, title = 'Novo Bloco', type = 'custom') => {
    
    // Se for um objeto node completo (da biblioteca de nodes padrão)
    if (typeof nodeOrContent === 'object' && nodeOrContent.type) {
      const newNode = {
        ...nodeOrContent,
        id: nodeOrContent.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: nodeOrContent.position || calculateSmartPosition(),
        data: {
          ...nodeOrContent.data,
          id: nodeOrContent.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          isEditing: false,
          onEdit: () => {}, // Será configurado pelo componente pai
          onTransfer: () => {}, // Será configurado pelo componente pai
          onEditStart: () => {}, // Será configurado pelo componente pai
          onEditEnd: () => {}, // Será configurado pelo componente pai
          onRemove: () => {}, // Será configurado pelo componente pai
          onOpenModal: () => {}, // Será configurado pelo componente pai
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
      

      setNodes(prevNodes => {
        const updatedNodes = [...prevNodes, newNode];

        return updatedNodes;
      });
      
      // Animar o novo node
      setTimeout(() => {
        setNodes(prevNodes => 
          prevNodes.map(node => 
            node.id === newNode.id 
              ? { ...node, data: { ...node.data, animation: null } }
              : node
          )
        );
      }, 400);
      
      return newNode.id;
    }
    
    // Se for apenas conteúdo (compatibilidade com código existente)
    const content = nodeOrContent;
    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calcular posição inteligente próxima aos nodes existentes
    const newNodePosition = calculateSmartPosition();
    
    // Mapear tipo para coreKey correto
    const coreKeyMapping = {
      'introducoes': 'Introduce',
      'corpos_de_analise': 'corpos_de_analise',
      'conclusoes': 'conclusoes'
    };
    
    const coreKey = coreKeyMapping[type] || type;


    const newNode = {
      id: newNodeId,
      type: 'cardNode',
      position: newNodePosition,
      data: {
        id: newNodeId,
        title: title,
        content: content,
        minHeight: '120px',
        coreKey: coreKey,
        isEditing: false,
        hasContent: content && content.trim().length > 0,
        onEdit: () => {}, // Será configurado pelo componente pai
        onTransfer: () => {}, // Será configurado pelo componente pai
        onEditStart: () => {}, // Será configurado pelo componente pai
        onEditEnd: () => {}, // Será configurado pelo componente pai
        onRemove: () => {}, // Será configurado pelo componente pai
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
    

    setNodes(prevNodes => {
      const updatedNodes = [...prevNodes, newNode];

      return updatedNodes;
    });
    
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
  }, [nodes, calculateSmartPosition, setNodes]);

  // Função para remover node do canvas
  const removeNode = useCallback((nodeId) => {
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
    setEdges(prevEdges => prevEdges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
  }, [setNodes, setEdges]);

  // Função para remover uma conexão específica
  const removeEdge = useCallback((edgeId) => {
    // Primeiro, marcar a edge para animação de remoção
    setEdges(prevEdges => 
      prevEdges.map(edge => 
        edge.id === edgeId 
          ? { ...edge, className: 'removing' }
          : edge
      )
    );
    
    // Aguardar a animação terminar antes de remover
    setTimeout(() => {
      setEdges(prevEdges => prevEdges.filter(edge => edge.id !== edgeId));

    }, 300);
  }, [setEdges]);

  // Função para remover todas as conexões
  const removeAllEdges = useCallback(() => {
    const edgeCount = edges.length;
    setEdges([]);

  }, [setEdges, edges.length]);

  // Função para lidar com elementos selecionados e tecla Delete
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Pegar elementos selecionados do ReactFlow
      if (reactFlowInstance.current) {
        const selectedNodes = reactFlowInstance.current.getNodes().filter(node => node.selected);
        const selectedEdges = reactFlowInstance.current.getEdges().filter(edge => edge.selected);
        
        // Remover nodes selecionados
        selectedNodes.forEach(node => {
          removeNode(node.id);
        });
        
        // Remover edges selecionadas
        selectedEdges.forEach(edge => {
          removeEdge(edge.id);
        });
        

      }
    }
  }, [removeNode, removeEdge]);

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
    onConnect,
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
    removeNode,
    removeEdge,
    removeAllEdges,
    handleKeyDown,
    
    // Setters
    setNodes,
    setEdges,
    setViewport,
    setCanvasLimits
  };
};