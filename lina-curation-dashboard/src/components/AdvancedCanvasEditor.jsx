import React, { useRef, useCallback, useEffect, useState } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Panel,
  ConnectionLineType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CheckSquare, Maximize2, RotateCcw, ZoomIn, ZoomOut, Move, Library, Unlink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Importar componentes customizados
import AdvancedCardNode from './AdvancedCardNode';
import ContextLibrary from './ContextLibrary';
import NodeModal from './NodeModal';
import { useAdvancedCanvas } from '../hooks/useAdvancedCanvas';

// Tipos de nodes customizados
const nodeTypes = {
  cardNode: AdvancedCardNode,
};

/**
 * AdvancedCanvasEditor - Editor de canvas avançado com funcionalidades completas:
 * - Sistema de serialização/desserialização com versionamento
 * - Posicionamento livre com pan & zoom
 * - Prevenção de conflitos de eventos
 * - Animações suaves
 * - Gestão de viewport e limites
 */
const AdvancedCanvasEditor = ({ 
  newsId, 
  newsData, 
  newsTitle, 
  isLoading, 
  loadError, 
  selectedBlock, 
  onBlockSelected, 
  onTransferBlock,
  onOpenCardModal
}) => {
  // Estados locais para UI
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [nodeModalData, setNodeModalData] = useState(null);
  const [canvasStats, setCanvasStats] = useState({
    nodeCount: 0,
    zoom: 0.75,
    position: { x: 0, y: 0 }
  });

  // Usar hook avançado do canvas
  const {
    nodes,
    edges,
    viewport,
    isInitialized,
    draggedNode,
    isNodeDragging,
    editingNode,
    viewportConfig,
    interactionConfig,
    canvasLimits,
    reactFlowInstance,
    canvasContainer,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onViewportChange,
    onNodeDragStart,
    onNodeDragStop,
    onNodeEditStart,
    onNodeEditEnd,
    resetViewport,
    focusNode,
    updateNodeContent,
    exportToNewsData,
    animateNodes,
    addNewNode,
    removeNode,
    removeEdge,
    removeAllEdges,
    handleKeyDown,
    setCanvasLimits
  } = useAdvancedCanvas(newsData, newsId);

  // Função para lidar com edição de blocos
  const handleBlockEdit = useCallback((blockId) => {
    if (blockId === editingNode) {
      // Se já está editando este bloco, sair da edição
      onNodeEditEnd();
    } else if (blockId !== editingNode) {
      // Se é um bloco diferente, sair da edição atual e iniciar nova
      onNodeEditEnd();
      onNodeEditStart(blockId);
    }
  }, [editingNode, onNodeEditStart, onNodeEditEnd]);

  // Função para abrir modal de node
  const handleOpenNodeModal = useCallback((modalData) => {
    setNodeModalData(modalData);
    setIsNodeModalOpen(true);
  }, []);

  // Função para fechar modal de node
  const handleCloseNodeModal = useCallback(() => {
    setIsNodeModalOpen(false);
    setNodeModalData(null);
  }, []);

  // Função para salvar conteúdo do node
  const handleSaveNodeContent = useCallback((nodeData, newContent) => {
    updateNodeContent(nodeData.itemId, newContent);
    handleCloseNodeModal();
  }, [updateNodeContent, handleCloseNodeModal]);

  // Função para transferir bloco
  const handleTransferBlock = useCallback((blockId, content) => {
    if (onTransferBlock) {
      onTransferBlock(blockId, content);
    }
  }, [onTransferBlock]);

  // Função para remover node
  const handleRemoveNode = useCallback((nodeId) => {
    removeNode(nodeId);
  }, [removeNode]);

  // Função para inicializar ReactFlow instance
  const onInit = useCallback((instance) => {
    reactFlowInstance.current = instance;
    
    // Animar nodes na inicialização
    setTimeout(() => {
      animateNodes('slideUp');
    }, 100);
    
    // Fit view automático na inicialização
    setTimeout(() => {
      if (instance && nodes.length > 0) {
        instance.fitView({
          padding: 0.1,
          duration: 800,
          includeHiddenNodes: false
        });
      }
    }, 200);
  }, [animateNodes, nodes.length]);

  // Atualizar nodes com callbacks corretos
  const nodesWithCallbacks = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onEdit: handleBlockEdit,
      onTransfer: handleTransferBlock,
      onEditStart: onNodeEditStart,
      onEditEnd: onNodeEditEnd,
      onRemove: handleRemoveNode,
      onOpenModal: handleOpenNodeModal,
      onUpdateContent: updateNodeContent,
      isEditing: editingNode === node.id
    }
  }));

  // Atualizar estatísticas do canvas
  useEffect(() => {
    setCanvasStats({
      nodeCount: nodes.length,
      zoom: viewport.zoom,
      position: { x: viewport.x, y: viewport.y }
    });
  }, [nodes.length, viewport]);

  // Funções de controle do canvas
  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.zoomIn({ duration: 300 });
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.zoomOut({ duration: 300 });
    }
  }, []);

  const handleFitView = useCallback(() => {
    resetViewport();
  }, [resetViewport]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    
    // Usar Fullscreen API se disponível
    if (!isFullscreen) {
      if (canvasContainer.current?.requestFullscreen) {
        canvasContainer.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  const openLibrary = useCallback(() => {
    setIsLibraryOpen(true);
  }, []);

  const closeLibrary = useCallback(() => {
    setIsLibraryOpen(false);
  }, []);

  // Função para remover todas as conexões com confirmação
  const handleRemoveAllConnections = useCallback(() => {
    if (edges.length === 0) {
      return;
    }
    
    const confirmed = window.confirm(
      `Tem certeza que deseja remover todas as ${edges.length} conexão${edges.length !== 1 ? 'ões' : ''}? Esta ação não pode ser desfeita.`
    );
    
    if (confirmed) {
      removeAllEdges();
    }
  }, [edges.length, removeAllEdges]);

  // Função para lidar com transferência de item da biblioteca (lógica aditiva)
  const handleTransferFromLibrary = useCallback((blockId, content) => {
    // Extrair informações do blockId para determinar o tipo e título
    let title = 'Novo Bloco';
    let type = 'custom';
    
    if (blockId.startsWith('complete-')) {
      const section = blockId.split('-')[1];
      switch (section) {
        case 'introducoes':
          title = 'Introdução';
          type = 'introducoes';
          break;
        case 'corpos_de_analise':
          title = 'Corpo de Análise';
          type = 'corpos_de_analise';
          break;
        case 'conclusoes':
          title = 'Conclusão';
          type = 'conclusoes';
          break;
        default:
          title = 'Conteúdo Completo';
          type = section;
      }
    } else if (blockId.startsWith('micro-')) {
      const category = blockId.split('-')[1];
      title = `Citação - ${category.charAt(0).toUpperCase() + category.slice(1)}`;
      type = `micro_${category}`;
    }
    
    // Adicionar novo node ao canvas
    const newNodeId = addNewNode(content, title, type);
    
    // Focar no novo node após um pequeno delay
    setTimeout(() => {
      focusNode(newNodeId);
    }, 500);
    
    // Fechar a biblioteca após adicionar o node
    closeLibrary();
  }, [addNewNode, focusNode, closeLibrary]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDownLocal = (e) => {
      // Não processar alguns atalhos durante edição
      if (editingNode && (e.ctrlKey || e.metaKey)) return;

      // Atalhos com Ctrl/Cmd
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '0':
            e.preventDefault();
            handleFitView();
            break;
          case '=':
          case '+':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case 'f':
            e.preventDefault();
            toggleFullscreen();
            break;
          case 'b':
            e.preventDefault();
            openLibrary();
            break;
        }
      }

      // Escape para sair da edição
      if (e.key === 'Escape' && editingNode) {
        onNodeEditEnd();
        return;
      }

      // Delete/Backspace para remover elementos selecionados (quando não editando)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !editingNode) {
        e.preventDefault();
        handleKeyDown(e);
      }
    };

    document.addEventListener('keydown', handleKeyDownLocal);
    return () => document.removeEventListener('keydown', handleKeyDownLocal);
  }, [editingNode, handleFitView, handleZoomIn, handleZoomOut, toggleFullscreen, openLibrary, onNodeEditEnd, handleKeyDown]);

  return (
    <div 
      className={`h-screen flex flex-col ${isFullscreen ? 'fullscreen-canvas' : ''}`}
      style={{ 
        backgroundColor: 'var(--bg-primary)'
      }}
    >
      {/* Estilos CSS avançados */}
      <style>{`
        /* Prevenção de conflitos de eventos */
        .react-flow__node.dragging {
          /* pointer-events: none; */
        }
        
        .react-flow__node .nopan {
          pointer-events: auto;
        }
        
        .react-flow__node .nowheel {
          scroll-behavior: auto;
        }
        
        .react-flow__node .nodrag {
          cursor: text !important;
        }
        
        .node-editing .react-flow__pane {
          cursor: default !important;
        }
        
        .node-dragging .react-flow__pane {
          cursor: grabbing !important;
        }
        

        
        .advanced-card-node:hover {
          border-color: #2BB24C50 !important;
        }
        
        .advanced-card-node.dragging {
          box-shadow: 0 10px 30px rgba(43, 178, 76, 0.3) !important;
          border-color: var(--primary-green) !important;
          z-index: 1001 !important;
        }
        
        .advanced-card-node.editing {
          z-index: 1000 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        /* Animações personalizadas */
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .selection-toolbar {
          animation: fadeInUp 0.2s ease-out;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Personalizar aparência do ReactFlow */
        .react-flow__background {
          background-color: var(--bg-primary);
        }
        
        .react-flow__controls {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .react-flow__controls button {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-primary);
          transition: all 0.2s ease;
        }
        
        .react-flow__controls button:hover {
          /* Efeito de hover removido */
        }
        
        .react-flow__controls button:last-child {
          border-bottom: none;
        }
        
        .react-flow__minimap {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .react-flow__node {
          background: transparent;
        }

        /* Estilos para conexões e handles */
        .connection-handle {
          z-index: 1000 !important;
          cursor: crosshair !important;
          pointer-events: auto !important;
        }
        

        
        .connection-handle-target:hover {
          transform: translateY(-2px) scale(1.3) !important;
        }
        
        .connection-handle-source:hover {
          transform: translateY(2px) scale(1.3) !important;
        }
        
        /* Handles específicos para estrutura e dados */
        .connection-handle-target:hover {
          opacity: 1 !important;
          transform: scale(1.2) !important;
          box-shadow: 0 0 0 3px rgba(43, 178, 76, 0.3) !important;
          background: #22A043 !important;
        }
        
        /* Estilos para linhas de conexão - melhorados para cliques */
        .react-flow__connection-line {
          stroke: rgba(255, 255, 255, 0.6) !important;
          stroke-width: 4 !important;
          stroke-dasharray: 8, 4 !important;
          opacity: 0.8 !important;
        }
        
        .react-flow__edge-path {
          stroke: rgba(255, 255, 255, 0.6) !important;
          stroke-width: 3 !important;
          opacity: 0.9 !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
        }
        
        .react-flow__edge:hover .react-flow__edge-path {
          stroke: rgba(255, 255, 255, 0.9) !important;
          stroke-width: 5 !important;
          opacity: 1 !important;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3)) !important;
        }
        
        .react-flow__edge-selected .react-flow__edge-path {
          stroke: rgba(255, 255, 255, 1) !important;
          stroke-width: 4 !important;
          opacity: 1 !important;
        }
        
        /* Melhorar seleção de edges */
        .react-flow__edge {
          cursor: pointer !important;
          stroke-width: 12 !important;
          stroke: transparent !important;
        }
        
        .react-flow__edge:hover {
          stroke: rgba(255, 255, 255, 0.2) !important;
        }
        
        .react-flow__edge.selected {
          stroke: rgba(255, 255, 255, 0.3) !important;
        }
        
        .react-flow__edge-path {
          pointer-events: stroke !important;
        }
        
        /* Adicionar tooltip visual para indicar que é clicável */
        .react-flow__edge::before {
          content: "🗑️";
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
          z-index: 1000;
        }
        
        .react-flow__edge:hover::before {
          opacity: 1;
        }
        
        /* Animação para conexão sendo removida */
        .react-flow__edge.removing .react-flow__edge-path {
          animation: removeEdge 0.3s ease-out forwards;
        }
        
        @keyframes removeEdge {
          0% {
            opacity: 1;
            stroke-width: 3;
          }
          50% {
            opacity: 0.5;
            stroke-width: 6;
            stroke: #FF6B6B;
          }
          100% {
            opacity: 0;
            stroke-width: 0;
          }
        }

        /* Fullscreen styles */
        .fullscreen-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
        }

        /* Estilos para formatação de texto */
        .prose h1, .prose h2, .prose h3 { 
          color: #E0E0E0; 
          font-family: "Nunito Sans", "Inter", sans-serif;
        }
        .prose p { 
          color: #E0E0E0; 
          line-height: 1.7;
          font-family: "Nunito Sans", "Inter", sans-serif;
          font-size: 15px;
        }
        .prose strong, .prose b { 
          color: #E0E0E0; 
          font-weight: 600; 
        }
        .prose em, .prose i { 
          color: #E0E0E0; 
          font-style: italic; 
        }
        .prose u { 
          color: #E0E0E0; 
          text-decoration: underline; 
        }
      `}</style>

      {/* Header do Editor */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div 
            className="header-standard flex items-center gap-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CheckSquare 
              size={24} 
              style={{ color: 'var(--primary-green)' }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 
                  className="font-bold"
                  style={{ 
                    fontSize: '24px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontFamily: '"Nunito Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  {newsTitle || (newsId ? 'Editando Notícia' : 'Nova Notícia')}
                </h1>
                {isInitialized && (
                  <motion.div
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: 'var(--primary-green-transparent)',
                      color: 'var(--primary-green)'
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {canvasStats.nodeCount} blocos
                  </motion.div>
                )}
              </div>
              {isLoading && (
                <motion.p 
                  style={{ color: 'var(--text-secondary)', fontSize: '14px', fontFamily: '"Nunito Sans", "Inter", sans-serif', marginTop: '4px' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Carregando dados da notícia...
                </motion.p>
              )}
              {loadError && (
                <motion.p 
                  style={{ color: 'var(--status-error-light)', fontSize: '14px', fontFamily: '"Nunito Sans", "Inter", sans-serif', marginTop: '4px' }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  Erro ao carregar: {loadError}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Área do Canvas */}
      <div className="flex-1 relative" ref={canvasContainer}>
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(event, edge) => {
            event.preventDefault();
            event.stopPropagation();
            
            // Remover conexão diretamente sem confirmação
            removeEdge(edge.id);
          }}
          onViewportChange={onViewportChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onInit={onInit}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          selectNodesOnDrag={false}
          multiSelectionKeyCode="Shift"
          {...viewportConfig}
          {...interactionConfig}
          attributionPosition="bottom-left"
          connectionLineStyle={{
            stroke: 'rgba(255, 255, 255, 0.6)',
            strokeWidth: 3,
            strokeDasharray: '8, 4'
          }}
        >
          <Background 
            variant="dots" 
            gap={20} 
            size={1}
            style={{
              backgroundColor: 'var(--bg-primary)',
              opacity: 0.3
            }}
          />
          
          {/* Controles customizados */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Controls 
                  position="top-left"
                  showZoom={true}
                  showFitView={true}
                  showInteractive={false}
                  style={{
                    button: {
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-primary)'
                    }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <MiniMap 
            position="bottom-right"
            nodeColor={(node) => {
              if (node.data?.isEditing) return '#2BB24C';
              if (node.data?.hasContent) return '#2BB24C80';
              return '#A0A0A0';
            }}
            nodeStrokeWidth={2}
            style={{
              width: 200,
              height: 150
            }}
            pannable
            zoomable
          />
          
          {/* Panel de informações e controles */}
          <Panel position="top-right" className="bg-transparent">
            <motion.div 
              className="flex flex-col gap-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Informações do canvas */}
              <div 
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontFamily: '"Nunito Sans", "Inter", sans-serif'
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Move size={14} style={{ color: 'var(--primary-green)' }} />
                  <span>Canvas Avançado</span>
                </div>
                <div>Zoom: {Math.round(canvasStats.zoom * 100)}%</div>
                <div>Blocos: {canvasStats.nodeCount}</div>
                <div>Conexões: {edges.length}</div>
                {editingNode && (
                  <div style={{ color: 'var(--primary-green)' }}>
                    🖊️ Editando: {editingNode}
                  </div>
                )}
                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                  💡 Arraste das bolinhas verdes para conectar
                </div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>
                  🔵 Azul: Dados | 🟠 Laranja: Estrutura
                </div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>
                  🗑️ Delete: remover selecionados
                </div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>
                  🖱️ Clique nas linhas para remover conexões
                </div>
              </div>

              {/* Controles avançados */}
              <div className="flex flex-col gap-1">
                {[
                  { action: openLibrary, icon: Library, label: 'Biblioteca de Contexto (Ctrl/Cmd + B)', primary: true },
                  { action: handleZoomIn, icon: ZoomIn, label: 'Zoom In (Ctrl/Cmd + +)' },
                  { action: handleZoomOut, icon: ZoomOut, label: 'Zoom Out (Ctrl/Cmd + -)' },
                  { action: handleFitView, icon: RotateCcw, label: 'Fit View (Ctrl/Cmd + 0)' },
                  { action: toggleFullscreen, icon: Maximize2, label: 'Fullscreen (Ctrl/Cmd + F)' },
                  { 
                    action: handleRemoveAllConnections, 
                    icon: Unlink, 
                    label: `Remover Todas as Conexões (${edges.length})`, 
                    danger: true,
                    disabled: edges.length === 0
                  }
                ].map(({ action, icon: Icon, label, primary, danger, disabled }, index) => (
                  <motion.button
                    key={label}
                    onClick={disabled ? undefined : action}
                    disabled={disabled}
                    className="p-2 rounded flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: disabled 
                        ? 'var(--bg-primary)' 
                        : danger 
                          ? '#FF6B6B20' 
                          : primary 
                            ? 'var(--primary-green-transparent)' 
                            : 'var(--bg-secondary)',
                      border: `1px solid ${disabled 
                        ? 'var(--border-primary)' 
                        : danger 
                          ? '#FF6B6B' 
                          : primary 
                            ? 'var(--primary-green)' 
                            : 'var(--border-primary)'}`,
                      color: disabled 
                        ? 'var(--text-secondary)' 
                        : danger 
                          ? '#FF6B6B' 
                          : primary 
                            ? 'var(--primary-green)' 
                            : 'var(--text-secondary)',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1
                    }}
                    whileHover={disabled ? {} : {
                      /* Efeito de hover removido */
                    }}
                    whileTap={disabled ? {} : { scale: 0.95 }}
                    title={label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: disabled ? 0.5 : 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Icon size={16} />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </Panel>

          {/* Indicador de estado global */}
          <Panel position="bottom-left" className="bg-transparent">
            <AnimatePresence>
              {(isNodeDragging || editingNode) && (
                <motion.div
                  className="p-2 rounded-lg flex items-center gap-2"
                  style={{
                    backgroundColor: 'var(--primary-green-transparent)',
                    border: '1px solid var(--primary-green)',
                    color: 'var(--primary-green)',
                    fontSize: '12px',
                    fontFamily: '"Nunito Sans", "Inter", sans-serif'
                  }}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  {isNodeDragging && '🖱️ Arrastando bloco'}
                  {editingNode && '✏️ Modo de edição ativo - ESC para sair'}
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>
        </ReactFlow>
      </div>

      {/* Biblioteca de Contexto Modal */}
      <ContextLibrary
        isOpen={isLibraryOpen}
        onClose={closeLibrary}
        newsData={newsData}
        selectedBlock={selectedBlock}
        onTransferItem={handleTransferFromLibrary}
        onOpenCardModal={onOpenCardModal}
        onAddNode={addNewNode}
      />

      {/* Modal de Node */}
      <NodeModal
        isOpen={isNodeModalOpen}
        onClose={handleCloseNodeModal}
        nodeData={nodeModalData}
        onSave={handleSaveNodeContent}
      />
    </div>
  );
};

export default AdvancedCanvasEditor;