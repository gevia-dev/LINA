import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  addEdge,
  ConnectionLineType,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';

// Importar componentes customizados
import CardNode from './CardNode';
import { useCanvasState } from '../hooks/useCanvasState';

// Tipos de nodes customizados
const nodeTypes = {
  cardNode: CardNode,
};

const CanvasEditorV2 = ({ 
  newsId, 
  newsData, 
  newsTitle, 
  isLoading, 
  loadError, 
  selectedBlock, 
  onBlockSelected, 
  onTransferBlock 
}) => {
  // Usar o hook customizado para gerenciar estado do canvas
  const {
    nodes,
    editingBlock,
    setEditingBlock,
    updateNodes,
    updateNodeContent,
    convertNodesToNewsData,
    hasValidContent
  } = useCanvasState(newsData);

  // Estados do ReactFlow
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Ref para o container do ReactFlow
  const reactFlowWrapper = useRef(null);

  // Função para lidar com mudanças nos nodes
  const onNodesChange = useCallback((changes) => {
    // Atualizar nodes usando o hook customizado
    const updatedNodes = changes.reduce((acc, change) => {
      if (change.type === 'position' && change.position) {
        return acc.map(node => 
          node.id === change.id 
            ? { ...node, position: change.position }
            : node
        );
      }
      return acc;
    }, nodes);
    
    updateNodes(updatedNodes);
  }, [nodes, updateNodes]);

  // Função para lidar com edição de blocos
  const handleBlockEdit = useCallback((blockId) => {
    if (blockId === selectedBlock && blockId !== editingBlock) {
      // Se o bloco já está selecionado, ativar edição
      if (onBlockSelected) {
        onBlockSelected(null);
      }
      setEditingBlock(blockId);
    } else if (blockId !== editingBlock) {
      // Se é um bloco diferente, selecionar
      setEditingBlock(null);
      if (onBlockSelected) {
        onBlockSelected(blockId);
      }
    } else if (blockId === null) {
      // Sair do modo de edição
      setEditingBlock(null);
    }
  }, [selectedBlock, editingBlock, onBlockSelected, setEditingBlock]);

  // Função para transferir bloco
  const handleTransferBlock = useCallback((blockId, content) => {
    if (onTransferBlock) {
      onTransferBlock(blockId, content);
    }
  }, [onTransferBlock]);

  // Callback para quando conecta start (debug)
  const onConnectStart = useCallback((event, { nodeId, handleType }) => {

  }, []);

  // Callback para quando conecta end (debug)
  const onConnectEnd = useCallback((event) => {

  }, []);

  // Função para lidar com novas conexões
  const onConnect = useCallback((connection) => {

    
    // Validações de conexão
    if (!connection.source || !connection.target) {
      console.warn('❌ Conexão inválida: origem ou destino ausente');
      return;
    }
    
    // Prevenir auto-conexão (loop direto)
    if (connection.source === connection.target) {
      console.warn('❌ Conexão rejeitada: não é possível conectar um node a si mesmo');
      return;
    }
    
    // Verificar se a conexão já existe
    const connectionExists = edges.some(edge => 
      edge.source === connection.source && 
      edge.target === connection.target
    );
    
    if (connectionExists) {
      console.warn('❌ Conexão rejeitada: conexão já existe');
      return;
    }
    
    // Adicionar a nova conexão com estilo customizado
    const newEdge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}`,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: '#2BB24C',
        strokeWidth: 3,
        filter: 'drop-shadow(0 0 4px rgba(43, 178, 76, 0.4))'
      },
      markerEnd: {
        type: 'arrowclosed',
        color: '#2BB24C',
        width: 20,
        height: 20
      },
    };
    
    setEdges((eds) => addEdge(newEdge, eds));
    
  }, [edges, setEdges]);

  // Função para validar conexões (evitar loops complexos)
  const isValidConnection = useCallback((connection) => {
    // Verificar loops mais complexos usando DFS
    const checkForCycle = (sourceId, targetId, visitedNodes = new Set()) => {
      if (visitedNodes.has(sourceId)) {
        return true; // Ciclo detectado
      }
      
      visitedNodes.add(sourceId);
      
      // Encontrar todas as conexões saindo do node atual
      const outgoingEdges = edges.filter(edge => edge.source === sourceId);
      
      for (const edge of outgoingEdges) {
        if (edge.target === targetId || checkForCycle(edge.target, targetId, new Set(visitedNodes))) {
          return true;
        }
      }
      
      return false;
    };
    
    return !checkForCycle(connection.target, connection.source);
  }, [edges]);

  // Função para salvar estado do canvas
  const saveCanvasState = useCallback((nodesToSave, edgesToSave) => {
    if (!newsId) return; // Só salvar se tiver um ID da notícia
    
    try {
      const canvasState = {
        nodes: nodesToSave.map(node => ({
          id: node.id,
          position: node.position,
          data: {
            title: node.data.title,
            content: node.data.content
          }
        })),
        edges: edgesToSave.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type
        })),
        timestamp: Date.now()
      };
      
      const storageKey = `canvas_state_${newsId}`;
      localStorage.setItem(storageKey, JSON.stringify(canvasState));

    } catch (error) {
      console.warn('Erro ao salvar estado do canvas:', error);
    }
  }, [newsId]);

  // Função para carregar estado do canvas
  const loadCanvasState = useCallback(() => {
    if (!newsId) return null;
    
    try {
      const storageKey = `canvas_state_${newsId}`;
      const saved = localStorage.getItem(storageKey);
      
      if (saved) {
        const canvasState = JSON.parse(saved);
  
        return canvasState;
      }
    } catch (error) {
      console.warn('Erro ao carregar estado do canvas:', error);
    }
    
    return null;
  }, [newsId]);

  // Auto-save quando nodes ou edges mudam
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (nodes.length > 0) {
        saveCanvasState(nodes, edges);
      }
    }, 1000); // Salvar após 1 segundo de inatividade

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, saveCanvasState]);

  // Carregar estado salvo ao montar o componente
  useEffect(() => {
    const savedState = loadCanvasState();
    if (savedState && savedState.nodes.length > 0) {
      // Aplicar posições salvas aos nodes existentes
      const updatedNodes = nodes.map(node => {
        const savedNode = savedState.nodes.find(saved => saved.id === node.id);
        if (savedNode) {
          return {
            ...node,
            position: savedNode.position
          };
        }
        return node;
      });
      
      updateNodes(updatedNodes);
      
      // Restaurar edges se existirem
      if (savedState.edges.length > 0) {
        setEdges(savedState.edges.map(edge => ({
          ...edge,
          animated: true,
          style: { stroke: '#2BB24C', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#2BB24C' }
        })));
      }
    }
  }, [newsId]); // Executar apenas quando newsId mudar

  // Atualizar nodes com callbacks corretos
  const nodesWithCallbacks = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onEdit: handleBlockEdit,
      onTransfer: handleTransferBlock
    }
  }));

  return (
    <div 
      className="h-screen flex flex-col"
      style={{ 
        backgroundColor: 'var(--bg-primary)'
      }}
    >
      {/* Estilos CSS */}
      <style>{`
        .react-flow__node.selected .card-node {
          border-color: var(--primary-green) !important;
          box-shadow: 0 0 0 2px var(--primary-green-transparent) !important;
        }
        
        .card-node:hover {
          border-color: #2BB24C50 !important;
        }
        
        .card-node:hover .transfer-button {
          opacity: 1 !important;
        }
        
        .transfer-button:hover {
          background-color: var(--primary-green) !important;
          color: white !important;
          transform: scale(1.1);
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
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
        }
        
        .react-flow__controls button {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-primary);
        }
        
        .react-flow__controls button:hover {
          background: var(--primary-green-transparent);
        }
        
        .react-flow__minimap {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
        }
        
        .react-flow__node {
          background: transparent;
        }

        /* Estilos para handles de conexão */
        .connection-handle {
          z-index: 1000 !important;
          cursor: crosshair !important;
          pointer-events: auto !important;
        }
        
        .connection-handle:hover {
          opacity: 1 !important;
          transform: scale(1.3) !important;
          box-shadow: 0 0 0 4px rgba(43, 178, 76, 0.4) !important;
          background: #22A043 !important;
        }
        
        .connection-handle-target:hover {
          transform: translateY(-2px) scale(1.3) !important;
        }
        
        .connection-handle-source:hover {
          transform: translateY(2px) scale(1.3) !important;
        }
        
        /* Desabilitar hover para handles especializados */
        .connection-handle-dados:hover,
        .connection-handle-estrutura:hover {
          opacity: inherit !important;
          transform: none !important;
          box-shadow: none !important;
          background: inherit !important;
        }
        
        /* Estilos para handles especializados - sem animações */
        .connection-handle-dados,
        .connection-handle-estrutura {
          transition: none !important;
        }
        
        /* Estilos para linhas de conexão - simplificados */
        .react-flow__connection-line {
          stroke: #2BB24C !important;
          stroke-width: 4 !important;
          stroke-dasharray: 8, 4 !important;
          opacity: 0.8 !important;
        }
        
        .react-flow__edge-path {
          stroke: #2BB24C !important;
          stroke-width: 3 !important;
          opacity: 0.9 !important;
        }
        
        .react-flow__edge:hover .react-flow__edge-path {
          stroke: #22A043 !important;
          stroke-width: 4 !important;
          opacity: 1 !important;
        }
        
        .react-flow__edge-selected .react-flow__edge-path {
          stroke: #1E8E3E !important;
          stroke-width: 4 !important;
          opacity: 1 !important;
        }
        
        /* Estilos para conexões especializadas */
        .react-flow__edge[data-source-handle="dados"] .react-flow__edge-path,
        .react-flow__edge[data-target-handle="dados"] .react-flow__edge-path {
          stroke: #4A90E2 !important;
          stroke-width: 3 !important;
          stroke-dasharray: 5, 5 !important;
        }
        
        .react-flow__edge[data-source-handle="estrutura"] .react-flow__edge-path,
        .react-flow__edge[data-target-handle="estrutura"] .react-flow__edge-path {
          stroke: #F5A623 !important;
          stroke-width: 3 !important;
          stroke-dasharray: 10, 5 !important;
        }
        
        .react-flow__edge[data-source-handle="dados"]:hover .react-flow__edge-path,
        .react-flow__edge[data-target-handle="dados"]:hover .react-flow__edge-path {
          /* Removida animação de hover */
        }
        
        .react-flow__edge[data-source-handle="estrutura"]:hover .react-flow__edge-path,
        .react-flow__edge[data-target-handle="estrutura"]:hover .react-flow__edge-path {
          /* Removida animação de hover */
        }
        
        /* Melhorar visibilidade da linha sendo arrastada */
        .react-flow__connection {
          pointer-events: none !important;
          z-index: 1001 !important;
        }
        
        .react-flow__connectionpath {
          stroke: #2BB24C !important;
          stroke-width: 4 !important;
          stroke-dasharray: 8, 4 !important;
          opacity: 0.9 !important;
        }

        /* Garantir que a linha de conexão seja sempre visível */
        .react-flow__viewport {
          position: relative;
        }
        
        .react-flow__edges {
          z-index: 998 !important;
        }
        
        .react-flow__nodes {
          z-index: 999 !important;
        }

        /* Estilos para formatação de texto */
        .prose h1 { 
          font-size: 2.25rem; 
          font-weight: 600; 
          color: #E0E0E0; 
          margin: 1.5rem 0 1rem 0; 
          line-height: 1.2;
          font-family: "Nunito Sans", "Inter", sans-serif;
        }
        .prose h2 { 
          font-size: 1.875rem; 
          font-weight: 600; 
          color: #E0E0E0; 
          margin: 1.25rem 0 0.75rem 0; 
          line-height: 1.3;
          font-family: "Nunito Sans", "Inter", sans-serif;
        }
        .prose h3 { 
          font-size: 1.5rem; 
          font-weight: 600; 
          color: #E0E0E0; 
          margin: 1rem 0 0.5rem 0; 
          line-height: 1.4;
          font-family: "Nunito Sans", "Inter", sans-serif;
        }
        .prose p { 
          margin: 0.75rem 0; 
          color: #E0E0E0; 
          line-height: 1.7;
          font-family: "Nunito Sans", "Inter", sans-serif;
          font-size: 15px;
          font-weight: 400;
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
        .prose s, .prose del { 
          color: #E0E0E0; 
          text-decoration: line-through; 
        }
      `}</style>

      {/* Header do Editor */}
      <div className="header-standard flex items-center gap-3">
        <CheckSquare 
          size={24} 
          style={{ color: 'var(--primary-green)' }}
        />
        <div className="flex-1">
          <div className="flex items-center">
            <h1 
              className="font-bold"
              style={{ 
                fontSize: '24px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontFamily: '"Nunito Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
            >
              {newsId ? 'Editando Notícia - Canvas V2' : 'Nova Notícia - Canvas V2'}
            </h1>
          </div>
          {newsTitle && (
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '16px', 
              fontFamily: '"Nunito Sans", "Inter", sans-serif', 
              marginTop: '8px',
              fontWeight: '500',
              lineHeight: '1.4'
            }}>
              {newsTitle}
            </p>
          )}
          {isLoading && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontFamily: '"Nunito Sans", "Inter", sans-serif', marginTop: '4px' }}>
              Carregando dados da notícia...
            </p>
          )}
          {loadError && (
            <p style={{ color: 'var(--status-error-light)', fontSize: '14px', fontFamily: '"Nunito Sans", "Inter", sans-serif', marginTop: '4px' }}>
              Erro ao carregar: {loadError}
            </p>
          )}
        </div>
      </div>
      
      {/* Área do Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}

          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.5}
          maxZoom={2}
          attributionPosition="bottom-left"
          snapToGrid={false}
          snapGrid={[15, 15]}
          connectOnClick={false}
          fitView
          fitViewOptions={{ padding: 0.2 }}
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
          <Controls 
            position="top-left"
            showZoom={true}
            showFitView={true}
            showInteractive={true}
          />
          <MiniMap 
            position="bottom-right"
            nodeColor={(node) => {
              // Colorir nodes baseado no tipo e status
              const hasContent = node.data?.hasContent;
              const contentLength = node.data?.content?.length || 0;
              
              if (!hasContent) return '#FF6B6B'; // Vermelho para vazio
              if (contentLength > 100) return '#2BB24C'; // Verde para completo
              if (contentLength > 50) return '#FFA500'; // Laranja para médio
              return '#FFD700'; // Amarelo para básico
            }}
            nodeStrokeWidth={2}
            style={{
              width: 220,
              height: 160,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px'
            }}
          />
          
          {/* Panel para informações adicionais */}
          <Panel position="top-right" className="bg-transparent">
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
              <div>Canvas Interativo V2</div>
              <div>Arraste os blocos para reorganizar</div>
              <div>Clique para selecionar, duplo clique para editar</div>
              <div>🎯 Enter: editar | Delete: remover | Esc: sair</div>
              <div>🔗 Arraste das bolinhas verdes para conectar blocos</div>
              <div>🖱️ Cursor crosshair = área conectável</div>
              <div>💾 Auto-save ativo | {edges.length} conexão{edges.length !== 1 ? 'ões' : ''}</div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

export default CanvasEditorV2; 