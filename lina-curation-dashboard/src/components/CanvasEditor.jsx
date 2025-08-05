import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { CheckSquare, Bold, Italic, Underline, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Componente customizado para nodes de bloco
const BlockNode = ({ data, selected }) => {
  const { id, title, content, minHeight, isEditing, onEdit, onTransfer, hasContent } = data;
  
  const handleClick = useCallback(() => {
    if (onEdit) {
      onEdit(id);
    }
  }, [id, onEdit]);

  const handleTransferClick = useCallback((e) => {
    e.stopPropagation();
    if (onTransfer && hasContent) {
      onTransfer(id, content);
    }
  }, [id, content, onTransfer, hasContent]);

  return (
    <div
      className={`block-node ${selected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
      style={{
        width: '350px',
        minHeight: minHeight || '120px',
        backgroundColor: 'var(--bg-secondary)',
        border: isEditing ? '2px solid var(--primary-green)' : '1px solid var(--border-primary)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: isEditing ? '0 0 0 3px var(--primary-green-transparent)' : selected ? '0 0 0 2px rgba(160, 160, 160, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={handleClick}
    >
      {/* Efeito de brilho no hover */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2BB24C10] to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{
          animation: selected ? 'shimmer 2s ease-in-out infinite' : 'none'
        }}
      />
      
      {/* Header do bloco */}
      <div className="flex justify-between items-center mb-3 relative z-10">
        <h3 
          className="text-base font-medium"
          style={{
            color: 'var(--text-secondary)',
            fontFamily: "'Nunito Sans', 'Inter', sans-serif",
            margin: 0
          }}
        >
          {title}
        </h3>
        
        {/* Botão de transferência */}
        {hasContent && (
          <button
            onClick={handleTransferClick}
            className="transfer-button p-2 rounded-full border text-[#A0A0A0] opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-20"
            style={{
              borderColor: 'var(--primary-green-transparent)',
              backgroundColor: 'transparent'
            }}
          >
            <ArrowLeft size={14} />
          </button>
        )}
      </div>
      
      {/* Conteúdo do bloco */}
      <div
        className="editable-content relative z-10"
        contentEditable={isEditing}
        suppressContentEditableWarning={true}
        style={{
          fontSize: '15px',
          color: 'var(--text-primary)',
          fontFamily: "'Nunito Sans', 'Inter', sans-serif",
          lineHeight: '1.7',
          userSelect: isEditing ? 'text' : 'none',
          WebkitUserSelect: isEditing ? 'text' : 'none',
          minHeight: '60px',
          pointerEvents: isEditing ? 'auto' : 'none',
          outline: 'none'
        }}
        onBlur={() => {
          if (isEditing && onEdit) {
            onEdit(null);
          }
        }}
      >
        {content}
      </div>
      
      {/* Overlay para bloco selecionado */}
      {selected && !isEditing && (
        <div 
          className="block-overlay absolute inset-0 bg-black bg-opacity-15 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg"
          style={{
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
        >
          <div 
            className="text-[#E0E0E0] text-lg font-semibold text-center"
            style={{
              fontFamily: "'Nunito Sans', 'Inter', sans-serif",
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
              letterSpacing: '0.5px'
            }}
          >
            Clique mais uma vez para editar 📝
          </div>
        </div>
      )}
    </div>
  );
};

// Tipos de nodes customizados
const nodeTypes = {
  blockNode: BlockNode,
};

const CanvasEditor = ({ 
  newsId, 
  newsData, 
  newsTitle, 
  isLoading, 
  loadError, 
  selectedBlock, 
  onBlockSelected, 
  onTransferBlock 
}) => {
  // Estados para o sistema de toolbar
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [selectionToolbarPosition, setSelectionToolbarPosition] = useState({ top: 0, left: 0 });
  const [isHoveringSelectionToolbar, setIsHoveringSelectionToolbar] = useState(false);
  
  // Estados para blocos interativos
  const [editingBlock, setEditingBlock] = useState(null);
  
  // Estados do ReactFlow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Ref para o container do ReactFlow
  const reactFlowWrapper = useRef(null);

  // Função para fazer parse dos dados da notícia
  const parseNewsData = useCallback((coreStructure) => {
    if (!coreStructure) return null;
    
    try {
      if (typeof coreStructure === 'string') {
        return JSON.parse(coreStructure);
      } else {
        return coreStructure;
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      return null;
    }
  }, []);

  // Função para obter dados dos blocos
  const getBlockData = useCallback(() => {
    const parsedData = newsData?.core_structure ? parseNewsData(newsData.core_structure) : null;
    
    const introduce = parsedData?.Introduce || 'Clique para selecionar, clique novamente para editar a introdução da notícia...';
    const body = parsedData?.corpos_de_analise || 'Clique para selecionar, clique novamente para editar o corpo da notícia...';
    const conclusion = parsedData?.conclusoes || 'Clique para selecionar, clique novamente para editar a conclusão...';

    return [
      {
        id: 'summary',
        title: 'Introdução',
        content: introduce,
        minHeight: '60px'
      },
      {
        id: 'body',
        title: 'Corpo',
        content: body,
        minHeight: '80px'
      },
      {
        id: 'conclusion',
        title: 'Conclusão',
        content: conclusion,
        minHeight: '60px'
      }
    ];
  }, [newsData, parseNewsData]);

  // Criar nodes do ReactFlow baseado nos dados dos blocos
  const createNodes = useCallback(() => {
    const blockData = getBlockData();
    
    return blockData.map((block, index) => {
      const hasContent = block.content && 
        !block.content.includes('Clique para selecionar') && 
        !block.content.includes('Clique novamente para editar');
        
      return {
        id: block.id,
        type: 'blockNode',
        position: { 
          x: 50, 
          y: 50 + (index * 200) // Espaçamento vertical entre blocos
        },
        data: {
          id: block.id,
          title: block.title,
          content: block.content,
          minHeight: block.minHeight,
          isEditing: editingBlock === block.id,
          hasContent: hasContent,
          onEdit: handleBlockEdit,
          onTransfer: handleTransferBlock
        }
      };
    });
  }, [getBlockData, editingBlock]);

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
  }, [selectedBlock, editingBlock, onBlockSelected]);

  // Função para transferir bloco
  const handleTransferBlock = useCallback((blockId, content) => {
    if (onTransferBlock) {
      onTransferBlock(blockId, content);
    }
  }, [onTransferBlock]);

  // Atualizar nodes quando dados mudarem
  useEffect(() => {
    const newNodes = createNodes();
    setNodes(newNodes);
  }, [createNodes, setNodes]);

  // Função para aplicar formatação na seleção
  const applyTextFormat = useCallback((format) => {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (selectedText.length === 0) return;
    
    try {
      document.execCommand(format, false, null);
      
      if (editingBlock) {
        const editableContent = document.querySelector(`[data-id="${editingBlock}"] .editable-content`);
        if (editableContent) {
          editableContent.focus();
        }
      }
      
      setShowSelectionToolbar(false);
    } catch (error) {
      console.warn('Erro na formatação de texto:', error);
    }
  }, [editingBlock]);

  // Event listeners para detectar seleção de texto
  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      
      if (!editingBlock) {
        setShowSelectionToolbar(false);
        return;
      }
      
      if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const selectedText = range.toString().trim();
        
        if (selectedText.length > 0) {
          const container = reactFlowWrapper.current;
          const containerRect = container?.getBoundingClientRect();
          
          if (containerRect) {
            setSelectionToolbarPosition({
              top: rect.top - containerRect.top - 50,
              left: rect.left - containerRect.left + (rect.width / 2) - 80
            });
            setShowSelectionToolbar(true);
          }
        } else {
          setShowSelectionToolbar(false);
        }
      } else {
        if (!isHoveringSelectionToolbar) {
          setShowSelectionToolbar(false);
        }
      }
    };

    const handleMouseUp = () => {
      setTimeout(handleTextSelection, 10);
    };

    const handleKeyUp = (e) => {
      if (e.shiftKey || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        setTimeout(handleTextSelection, 10);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [editingBlock, isHoveringSelectionToolbar]);

  return (
    <div 
      className="h-screen flex flex-col"
      style={{ 
        backgroundColor: 'var(--bg-primary)'
      }}
    >
      {/* Estilos CSS */}
      <style>{`
        .react-flow__node.selected .block-node {
          border-color: var(--primary-green) !important;
          box-shadow: 0 0 0 2px var(--primary-green-transparent) !important;
        }
        
        .block-node:hover {
          border-color: #2BB24C50 !important;
        }
        
        .block-node:hover .transfer-button {
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
              {newsId ? 'Editando Notícia - Canvas' : 'Nova Notícia - Canvas'}
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
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.5}
          maxZoom={2}
          attributionPosition="bottom-left"
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
              <div>Canvas Interativo</div>
              <div>Arraste os blocos para reorganizar</div>
            </div>
          </Panel>
        </ReactFlow>

        {/* Toolbar de Seleção de Texto */}
        {showSelectionToolbar && (
          <motion.div
            onMouseEnter={() => setIsHoveringSelectionToolbar(true)}
            onMouseLeave={() => setIsHoveringSelectionToolbar(false)}
            className="selection-toolbar absolute z-30 flex gap-1 p-2 rounded-lg border shadow-lg"
            style={{
              top: selectionToolbarPosition.top,
              left: selectionToolbarPosition.left,
              backgroundColor: '#1E1E1E',
              borderColor: '#333333',
              boxShadow: 'rgba(0,0,0,0.3) 0px 4px 12px'
            }}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={() => applyTextFormat('bold')}
              className="p-2 rounded transition-colors"
              style={{ color: '#A0A0A0' }}
            >
              <Bold size={14} />
            </button>
            
            <button
              onClick={() => applyTextFormat('italic')}
              className="p-2 rounded transition-colors"
              style={{ color: '#A0A0A0' }}
            >
              <Italic size={14} />
            </button>
            
            <button
              onClick={() => applyTextFormat('underline')}
              className="p-2 rounded transition-colors"
              style={{ color: '#A0A0A0' }}
            >
              <Underline size={14} />
            </button>
            
            <button
              onClick={() => setShowSelectionToolbar(false)}
              className="p-2 rounded transition-colors ml-2"
              style={{ color: '#A0A0A0', fontSize: '12px' }}
            >
              ×
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CanvasEditor;