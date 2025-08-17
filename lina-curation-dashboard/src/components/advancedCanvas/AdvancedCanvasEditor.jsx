import React, { useCallback, useEffect, useState } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Panel,
  ConnectionLineType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CheckSquare, Maximize2, RotateCcw, Library, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Importar componentes customizados
import TextSegmentNode from './nodes/TextSegmentNode';
import DataNode from './nodes/DataNode';
import MonitorNode from './nodes/MonitorNode';
import ContextLibrary from './ContextLibrary';
import CardModal from './modals/CardModal';
import NotionLikePage from './NotionLikePage';
import { useAdvancedCanvas } from '../../hooks/useAdvancedCanvas';

// Tipos de nodes customizados
const nodeTypes = {
  textSegmentNode: TextSegmentNode,
  dataNode: DataNode,
  monitorNode: MonitorNode,
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
  const [isNotionPageOpen, setIsNotionPageOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
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



  // Função para abrir modal de node usando CardModal
  const handleOpenNodeModal = useCallback((modalData) => {
    // Função auxiliar para fazer parse seguro de JSON
    const safeJsonParse = (jsonString) => {
      try {
        return jsonString ? JSON.parse(jsonString) : null;
      } catch (error) {
        console.warn('❌ Erro ao fazer parse do JSON:', error);
        return null;
      }
    };

    // Determinar o tipo e seção baseado no node
    let type = 'complete';
    let section = null;
    let category = null;
    
    if (modalData.coreKey) {
      switch (modalData.coreKey) {
        case 'Introduce':
        case 'introducoes':
          type = 'complete';
          section = 'introducoes';
          break;
        case 'corpos_de_analise':
          type = 'complete';
          section = 'corpos_de_analise';
          break;
        case 'conclusoes':
          type = 'complete';
          section = 'conclusoes';
          break;
        case 'micro_estrutura':
          type = 'complete';
          section = 'estrutura';
          break;
        default:
          if (modalData.coreKey.startsWith('micro_')) {
            type = 'micro';
            category = modalData.coreKey.replace('micro_', '');
          } else {
            type = 'complete';
            section = modalData.coreKey;
          }
      }
    } else if (modalData.type === 'estrutura') {
      type = 'complete';
      section = 'estrutura';
    } else if (modalData.nodeType === 'estrutura') {
      type = 'complete';
      section = 'estrutura';
    }

    // Adaptar dados do node para o formato do CardModal
    const cardData = {
      content: modalData.content || '',
      type,
      section,
      category,
      itemId: modalData.itemId,
      title: modalData.title || 'Editar Conteúdo'
    };

    // Coletar todos os cards disponíveis para navegação
    let allCardsData = [];
    let microDataArray = [];
    
    if (type === 'complete' && section && newsData?.variant_structure) {
      // Para dados completos, coletar todos os cards da seção atual
      const variantData = safeJsonParse(newsData.variant_structure);
      if (variantData && variantData[section]) {
        allCardsData = variantData[section].map((item, idx) => ({
          content: typeof item === 'string' ? item : (item.text || item.content || ''),
          type: 'complete',
          section,
          itemId: `complete-${section}-${idx}`
        }));
      }
    } else if (type === 'micro' && category && newsData?.core_quotes) {
      // Para micro dados, coletar todos os cards da subcategoria atual (parent::child)
      console.log("!!!!!!!!!!!!!CORE QUOTES: \n", newsData.coreQuotes)
      const coreQuotes = safeJsonParse(newsData.core_quotes);
      if (coreQuotes && typeof coreQuotes === 'object') {
        const [parentKey, childKey] = String(category).split('::');
        const list = coreQuotes?.[parentKey]?.[childKey];
        if (Array.isArray(list)) {
          allCardsData = list.map((item, idx) => ({
            content: typeof item === 'string' ? item : (item.frase_completa || item.titulo_frase || ''),
            type: 'micro',
            category,
            itemId: `micro-${parentKey}::${childKey}-${idx}`
          }));
        }
      }
    }
    
    // Coletar todos os micro dados para o carrossel (apenas quando necessário)
    if (type === 'complete' && newsData?.core_quotes) {
      const allCoreQuotes = safeJsonParse(newsData.core_quotes);
      if (allCoreQuotes && typeof allCoreQuotes === 'object') {
        Object.entries(allCoreQuotes).forEach(([parentKey, childObj]) => {
          if (childObj && typeof childObj === 'object') {
            Object.entries(childObj).forEach(([childKey, list]) => {
              if (Array.isArray(list)) {
                list.forEach((item, idx) => {
                  microDataArray.push({
                    content: typeof item === 'string' ? item : (item.frase_completa || item.titulo_frase || ''),
                    category: `${parentKey}::${childKey}`,
                    itemId: `micro-${parentKey}::${childKey}-${idx}`
                  });
                });
              }
            });
          }
        });
      }
    }

    // Encontrar o índice do card atual
    const currentIndex = allCardsData.findIndex(card => 
      card.content === modalData.content || card.itemId === modalData.itemId
    );
    
    setNodeModalData({
      cardData,
      allCards: allCardsData,
      currentIndex: currentIndex >= 0 ? currentIndex : 0,
      microData: microDataArray
    });
    setIsNodeModalOpen(true);
  }, [newsData]);

  // Função para fechar modal de node
  const handleCloseNodeModal = useCallback(() => {
    setIsNodeModalOpen(false);
    setNodeModalData(null);
  }, []);

  // Função para salvar conteúdo do node
  const handleSaveNodeContent = useCallback((cardData, newContent) => {
    // Extrair o itemId do cardData para atualizar o node correto
    const nodeId = cardData.itemId;
    if (nodeId) {
      updateNodeContent(nodeId, { content: newContent });
    }
    // Não fechar o modal automaticamente para permitir navegação
  }, [updateNodeContent]);

  // Função para salvar e fechar modal
  const handleSaveAndClose = useCallback((cardData, newContent) => {
    // Extrair o itemId do cardData para atualizar o node correto
    const nodeId = cardData.itemId;
    if (nodeId) {
      updateNodeContent(nodeId, { content: newContent });
    }
    handleCloseNodeModal();
  }, [updateNodeContent, handleCloseNodeModal]);

  // Função para navegar entre cards
  const handleNavigateCard = useCallback((newIndex) => {
    if (nodeModalData && nodeModalData.allCards && nodeModalData.allCards[newIndex]) {
      const newCard = nodeModalData.allCards[newIndex];
      setNodeModalData(prev => ({
        ...prev,
        cardData: newCard,
        currentIndex: newIndex
      }));
    }
  }, [nodeModalData]);

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
  }, [animateNodes]);

  // Atualizar nodes com callbacks corretos
  const nodesWithCallbacks = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onTransfer: handleTransferBlock,
      onRemove: handleRemoveNode,
      onOpenModal: handleOpenNodeModal,
      onUpdateContent: updateNodeContent
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

  const openNotionPage = useCallback(() => {
    setIsNotionPageOpen(true);
  }, []);

  const closeNotionPage = useCallback(() => {
    setIsNotionPageOpen(false);
  }, []);

  const handleCanvasDragStart = useCallback((dragData) => {
    setIsDragActive(true);
  }, []);

  useEffect(() => {
    const resetDrag = () => setIsDragActive(false);
    window.addEventListener('dragend', resetDrag);
    window.addEventListener('drop', resetDrag);
    return () => {
      window.removeEventListener('dragend', resetDrag);
      window.removeEventListener('drop', resetDrag);
    };
  }, []);

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
      // Ex.: blockId = "micro-parent::child-3" → usamos apenas o child para exibição
      const category = blockId.split('-')[1]; // parent::child
      const [_, childKey] = String(category).split('::');
      const rawLabel = (childKey || category || '').replace(/_/g, ' ').trim();
      const formattedLabel = rawLabel
        ? rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
        : 'Citação';
      // Exibir apenas o nome amigável da subcategoria
      title = formattedLabel;
      // type mantém a referência completa parent::child para o coreKey
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

  // Vincula um micro dado a uma seção (como se conectasse micro-output -> dados)
  const handleLinkDataToSection = useCallback((sectionId, payload) => {
    try {
      const title = String(payload?.title || 'Citação');
      const content = String(payload?.content || '');
      // Cria um DataNode e em seguida conecta à seção
      const newNodeId = addNewNode({
        type: 'dataNode',
        data: {
          title,
          content,
          coreKey: 'micro_adicionado',
          isStructureNode: false
        }
      });
      if (newNodeId) {
        onConnect({
          source: newNodeId,
          target: sectionId,
          sourceHandle: 'micro-output',
          targetHandle: 'dados'
        });
        // opcional: focar no node
        setTimeout(() => {
          try { focusNode(newNodeId); } catch {}
        }, 300);
      }
    } catch {}
  }, [addNewNode, onConnect, focusNode]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDownLocal = (e) => {
      // Evitar interferir em inputs/editors (permite apagar texto normalmente)
      const target = e.target;
      const tag = target?.tagName;
      const isEditable = (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        target?.isContentEditable === true ||
        (typeof target?.closest === 'function' && target.closest('.notion-editor'))
      );
      if (isEditable) return;


      // Atalhos com Ctrl/Cmd
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '0':
            e.preventDefault();
            handleFitView();
            break;
          case 'f':
            e.preventDefault();
            toggleFullscreen();
            break;
          case 'b':
            e.preventDefault();
            openLibrary();
            break;
          case 'n':
            e.preventDefault();
            openNotionPage();
            break;
        }
      }

      // Delete/Backspace para remover elementos selecionados
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleKeyDown(e);
      }
    };

    document.addEventListener('keydown', handleKeyDownLocal);
    return () => document.removeEventListener('keydown', handleKeyDownLocal);
  }, [handleFitView, toggleFullscreen, openLibrary, openNotionPage, handleKeyDown]);

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
          cursor: default !important;
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

        /* Estilos para feedback visual dos handles */
        .react-flow__handle {
          opacity: 0.8 !important;
          transition: all 0.2s ease !important;
        }

        .react-flow__handle:hover {
          opacity: 1 !important;
          transform: scale(1.3) !important;
        }

        .connection-handle-dados:hover {
          box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.4) !important;
          background: #3A80D2 !important;
        }

        .connection-handle-estrutura:hover {
          box-shadow: 0 0 0 4px rgba(245, 166, 35, 0.4) !important;
          background: #E59613 !important;
        }

        .connection-handle-source:hover {
           box-shadow: 0 0 0 4px rgba(43, 178, 76, 0.4) !important;
           background: var(--primary-green-hover) !important;
        }

        .react-flow__connection-line {
          stroke-width: 3 !important;
          stroke-dasharray: 8, 4 !important;
          opacity: 0.9 !important;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3)) !important;
        }
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
          transform: scale(1.3) !important;
          box-shadow: 0 0 0 4px rgba(43, 178, 76, 0.4) !important;
          background: var(--primary-green-hover) !important;
        }
        
        .connection-handle-dados:hover {
          opacity: 1 !important;
          transform: scale(1.3) !important;
          box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.4) !important;
          background: #3A80D2 !important;
        }
        
        .connection-handle-estrutura:hover {
          opacity: 1 !important;
          transform: scale(1.3) !important;
          box-shadow: 0 0 0 4px rgba(245, 166, 35, 0.4) !important;
          background: #E59613 !important;
        }
        
        /* Handles do MonitorNode */
        .connection-handle-monitor:hover {
          opacity: 1 !important;
          transform: scale(1.3) !important;
          box-shadow: 0 0 0 4px rgba(43, 178, 76, 0.4) !important;
          background: var(--primary-green-hover) !important;
        }
        
        .connection-handle-monitor-left:hover {
          opacity: 1 !important;
          transform: scale(1.3) !important;
          box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.4) !important;
          background: #3A80D2 !important;
        }
        
        .connection-handle-monitor-right:hover {
          opacity: 1 !important;
          transform: scale(1.3) !important;
          box-shadow: 0 0 0 4px rgba(245, 166, 35, 0.4) !important;
          background: #E59613 !important;
        }
        
        /* Estilos para handles - seguindo padrão ReactFlow */
        .react-flow__handle {
          opacity: 1 !important;
          transition: all 0.2s ease !important;
        }
        
        .connection-handle {
          opacity: 1 !important;
          transition: all 0.2s ease !important;
        }
        

        
        /* Estilos para linhas de conexão - melhorados para cliques */
        .react-flow__connection-line {
          stroke: var(--primary-green) !important;
          stroke-width: 5 !important;
          stroke-dasharray: 8, 4 !important;
          opacity: 0.9 !important;
          filter: drop-shadow(0 0 4px rgba(43, 178, 76, 0.3)) !important;
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

          connectionMode="loose"
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
              if (node.type === 'dataNode') return '#4A90E2';
              if (node.type === 'monitorNode') return '#2BB24C';
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
          
          {/* Panel de controles simplificado */}
          <Panel position="top-right" className="bg-transparent">
            <motion.div 
              className="flex flex-col gap-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Controles essenciais */}
              <div className="flex flex-col gap-1">
                {[ 
                  { action: openNotionPage, icon: FileText, label: 'Editor Estruturado (Ctrl/Cmd + N)', primary: true, special: true },
                  { action: openLibrary, icon: Library, label: 'Biblioteca de Contexto (Ctrl/Cmd + B)', primary: true },
                  { action: handleFitView, icon: RotateCcw, label: 'Fit View (Ctrl/Cmd + 0)' },
                  { action: toggleFullscreen, icon: Maximize2, label: 'Fullscreen (Ctrl/Cmd + F)' }
                ].map(({ action, icon: Icon, label, primary, special }, index) => (
                  <motion.button
                    key={label}
                    onClick={action}
                    className="p-2 rounded flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: primary 
                        ? (special ? 'var(--primary-green)' : 'var(--primary-green-transparent)')
                        : 'var(--bg-secondary)',
                      border: `1px solid ${primary 
                        ? 'var(--primary-green)' 
                        : 'var(--border-primary)'}`,
                      color: primary 
                        ? (special ? 'white' : 'var(--primary-green)')
                        : 'var(--text-secondary)',
                      cursor: 'pointer',
                      boxShadow: special ? '0 0 10px rgba(43, 178, 76, 0.3)' : 'none'
                    }}
                    whileTap={{ scale: 0.95 }}
                    title={label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
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
              {isNodeDragging && (
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
                  🖱️ Arrastando bloco
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
        onCanvasDragStart={handleCanvasDragStart}
      />

      {/* Modal de Node usando CardModal */}
      <CardModal
        isOpen={isNodeModalOpen}
        onClose={handleCloseNodeModal}
        cardData={nodeModalData?.cardData}
        onSave={handleSaveAndClose}
        allCards={nodeModalData?.allCards || []}
        currentCardIndex={nodeModalData?.currentIndex || 0}
        onNavigate={handleNavigateCard}
        microData={nodeModalData?.microData || []}
      />

      {/* Editor Estruturado estilo Notion */}
      {console.log('🔍 AdvancedCanvasEditor - newsData sendo passado para NotionLikePage:', newsData)}
      <NotionLikePage
        isOpen={isNotionPageOpen}
        onClose={closeNotionPage}
        newsData={newsData}
        newsTitle={newsTitle}
        onCanvasItemDragStart={handleCanvasDragStart}
        onLinkDataToSection={handleLinkDataToSection}
      />

      {/* Indicador visual global de drag ativo */}
      {isDragActive && (
        <div
          className="fixed pointer-events-none"
          style={{ top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10000 }}
        >
          <div
            className="px-3 py-1.5 rounded-lg border"
            style={{ backgroundColor: 'var(--primary-green-transparent)', borderColor: 'var(--primary-green)', color: 'var(--primary-green)', fontFamily: '"Nunito Sans", "Inter", sans-serif', fontSize: 12 }}
          >
            Arraste para o Editor para adicionar
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedCanvasEditor;



