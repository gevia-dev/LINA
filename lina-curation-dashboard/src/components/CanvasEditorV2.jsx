import React, { useState, useRef, useCallback } from 'react';
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
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.5}
          maxZoom={2}
          attributionPosition="bottom-left"
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
            nodeColor="#2BB24C"
            nodeStrokeWidth={2}
            style={{
              width: 200,
              height: 150
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
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

export default CanvasEditorV2; 