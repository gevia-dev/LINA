import React, { useCallback, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from '@xyflow/react';
import { Trash2, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AdvancedCardNode - Versão simplificada sem edição inline:
 * - Modal abre com double click
 * - Sem visualização de conteúdo no node
 * - Sem edição inline
 * - Suporte especial para nodes "micro-dado"
 */
const AdvancedCardNode = ({ data, selected }) => {
  const { 
    id, 
    title, 
    minHeight, 
    animation,
    coreKey
  } = data;
  
  // Detectar se é um node "micro-dado" baseado no coreKey
  const isMicroDado = coreKey?.startsWith('micro_');
  
  const nodeRef = useRef(null);
  
  // Estados para menu de contexto
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Ref para calcular tamanhos dos menus
  const contextMenuRef = useRef(null);

  // Função para posicionamento inteligente de menus
  const calculateMenuPosition = useCallback((triggerRect, menuSize, offset = { x: 0, y: 0 }) => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    let x = triggerRect.left + scrollLeft + offset.x;
    let y = triggerRect.bottom + scrollTop + offset.y;
    
    // Ajustar se sair da direita
    if (x + menuSize.width > viewport.width + scrollLeft) {
      x = viewport.width + scrollLeft - menuSize.width - 10;
    }
    
    // Ajustar se sair da esquerda
    if (x < scrollLeft) {
      x = scrollLeft + 10;
    }
    
    // Ajustar se sair de baixo - colocar acima do trigger
    if (y + menuSize.height > viewport.height + scrollTop) {
      y = triggerRect.top + scrollTop - menuSize.height - 10;
    }
    
    // Ajustar se ainda sair do topo
    if (y < scrollTop) {
      y = scrollTop + 10;
    }
    
    return { x, y };
  }, []);

  // Função para calcular posição do menu de contexto
  const calculateContextMenuPosition = useCallback((clickEvent) => {
    const triggerRect = {
      left: clickEvent.clientX,
      right: clickEvent.clientX,
      top: clickEvent.clientY,
      bottom: clickEvent.clientY
    };
    
    const menuSize = { width: 160, height: 50 }; // Tamanho aproximado do menu
    const offset = { x: 0, y: 5 };
    
    return calculateMenuPosition(triggerRect, menuSize, offset);
  }, [calculateMenuPosition]);

  // Função para obter título descritivo do tipo de node
  const getNodeTypeTitle = useCallback(() => {
    const { coreKey, nodeType, title } = data;
    
    // Se já tem um título definido, usar ele
    if (title) return title;
    
    // Mapear coreKey para títulos descritivos
    if (coreKey) {
      switch (coreKey) {
        case 'Introduce':
          return 'Introdução';
        case 'corpos_de_analise':
          return 'Corpo de Análise';
        case 'conclusoes':
          return 'Conclusão';
        case 'micro_estrutura':
          return 'Estrutura';
        case 'micro_dados':
          return 'Dados';
        case 'micro_citacao':
          return 'Citação';
        case 'micro_estatistica':
          return 'Estatística';
        case 'micro_fato':
          return 'Fato';
        case 'micro_contexto':
          return 'Contexto';
        default:
          // Se começa com 'micro_', extrair o tipo
          if (coreKey.startsWith('micro_')) {
            const microType = coreKey.replace('micro_', '');
            return `Micro-${microType.charAt(0).toUpperCase() + microType.slice(1)}`;
          }
          return 'Bloco de Conteúdo';
      }
    }
    
    // Mapear nodeType para títulos
    if (nodeType) {
      switch (nodeType) {
        case 'estrutura':
          return 'Estrutura';
        case 'introducoes':
          return 'Introdução';
        case 'corpos_de_analise':
          return 'Corpo de Análise';
        case 'conclusoes':
          return 'Conclusão';
        default:
          return 'Bloco de Conteúdo';
      }
    }
    
    return 'Bloco de Conteúdo';
  }, [data]);

  // Função para lidar com double-click (abrir modal)
  const handleDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Preparar dados para o modal
    const modalData = {
      content: data.content || '',
      type: data.nodeType === 'estrutura' ? 'estrutura' : 'micro',
      nodeType: data.nodeType,
      coreKey: data.coreKey,
      itemId: id,
      title: data.title || (data.nodeType === 'estrutura' ? 'Estrutura' : 'Micro-dado')
    };
    
    // Chamar função para abrir modal
    if (data.onOpenModal) {
      data.onOpenModal(modalData);
    }
  }, [data, id]);

  // Função para lidar com clique direito (menu de contexto)
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calcular posição inteligente baseada no clique
    const position = calculateContextMenuPosition(e);
    setContextMenuPosition(position);
    setShowContextMenu(true);
  }, [calculateContextMenuPosition]);

  // Função para fechar menu de contexto
  const closeContextMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);

  // Função para remover node
  const handleRemoveNode = useCallback((e) => {
    e.stopPropagation();
    if (data.onRemove) {
      data.onRemove(id);
    }
    closeContextMenu();
  }, [id, data.onRemove, closeContextMenu]);

  // Fechar menu de contexto quando clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      if (showContextMenu) {
        closeContextMenu();
      }
    };

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [showContextMenu, closeContextMenu]);

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Atalho Delete para remover node selecionado
      if (e.key === 'Delete' && selected) {
        e.preventDefault();
        if (data.onRemove) {
          data.onRemove(id);
        }
        return;
      }
    };

    // Adicionar listener apenas se este node está selecionado
    if (selected) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selected, data.onRemove, id]);

  // Log para debugging de handles
  useEffect(() => {
    if (selected) {
      console.log('🎯 Node selecionado:', {
        id,
        isMicroDado,
        title: getNodeTypeTitle(),
        handles: {
          target: !isMicroDado ? 'Top' : 'N/A',
          dados: !isMicroDado ? 'Left (30%)' : 'N/A',
          estrutura: !isMicroDado ? 'Left (70%)' : 'N/A',
          source: isMicroDado ? 'Right' : 'Bottom'
        }
      });
    }
  }, [selected, id, isMicroDado, getNodeTypeTitle]);

  // Variantes de animação para diferentes estados
  const nodeVariants = {
    initial: { 
      opacity: 0, 
      scale: 0.8, 
      y: 20 
    },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        delay: id === 'summary' ? 0 : id === 'body' ? 0.1 : 0.2,
        ...animation?.transition
      }
    },
    dragging: {
      scale: 1.02,
      boxShadow: "0 8px 25px rgba(43, 178, 76, 0.2)",
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div
      ref={nodeRef}
      className="advanced-card-node group"
      variants={nodeVariants}
      initial="initial"
      animate="animate"
      exit="initial"
      style={{
        width: isMicroDado ? '250px' : '350px',
        minHeight: isMicroDado ? '60px' : (minHeight || '120px'),
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: '12px',
        padding: isMicroDado ? '8px' : '16px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default'
      }}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      {/* Header do bloco */}
      <div className="flex justify-between items-center mb-3 relative z-1">
        <motion.h3 
          className={`${isMicroDado ? 'text-sm' : 'text-base'} font-medium pointer-events-none flex items-center gap-2`}
          style={{
            color: 'var(--text-secondary)',
            fontFamily: "'Nunito Sans', 'Inter', sans-serif",
            margin: 0
          }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {isMicroDado && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              title="Micro-dado"
            >
              <Database size={isMicroDado ? 10 : 12} style={{ color: 'var(--primary-green)' }} />
            </motion.div>
          )}
          {title}
        </motion.h3>
      </div>
      
      {/* Conteúdo do bloco - Apenas indicador visual */}
      <motion.div
        className="relative z-1"
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div
          style={{
            fontSize: isMicroDado ? '12px' : '15px',
            color: 'var(--text-secondary)',
            fontFamily: "'Nunito Sans', 'Inter', sans-serif",
            lineHeight: '1.7',
            minHeight: isMicroDado ? '30px' : '60px',
            padding: isMicroDado ? '6px' : '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            opacity: 0.6
          }}
        >
          <span>{getNodeTypeTitle()}</span>
        </div>
      </motion.div>

      {/* Handles de conexão do ReactFlow */}
      {/* Para micro-dados: apenas saída, sem entradas */}
      {!isMicroDado && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            id="target"
            style={{
              background: 'var(--primary-green)',
              width: 14,
              height: 14,
              border: '3px solid var(--bg-secondary)',
              cursor: 'crosshair',
              opacity: 1,
              transition: 'all 0.2s ease',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(43, 178, 76, 0.4)'
            }}
            className="connection-handle connection-handle-target"
            isConnectable={true}
            title="Entrada Geral"
          />

          {/* Handle de entrada - lado esquerdo */}
          <Handle
            type="target"
            position={Position.Left}
            id="target-left"
            style={{
              background: 'var(--primary-green)',
              width: 14,
              height: 14,
              border: '3px solid var(--bg-secondary)',
              cursor: 'crosshair',
              opacity: 1,
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(43, 178, 76, 0.4)'
            }}
            className="connection-handle"
            isConnectable={true}
            title="Entrada"
          />
        </>
      )}
      
      {/* Handle de saída - sempre presente */}
      <Handle
        type="source"
        position={isMicroDado ? Position.Right : Position.Bottom}
        id="source"
        style={{
          background: 'var(--primary-green)',
          width: isMicroDado ? 10 : 14,
          height: isMicroDado ? 10 : 14,
          border: isMicroDado ? '2px solid var(--bg-secondary)' : '3px solid var(--bg-secondary)',
          cursor: 'crosshair',
          opacity: 1,
          transition: 'all 0.2s ease',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(43, 178, 76, 0.4)'
        }}
        className="connection-handle connection-handle-source"
        isConnectable={true}
        title={isMicroDado ? "Saída de Micro-dado" : "Saída Geral"}
      />

      {/* Menu de Contexto - Renderizado via Portal */}
      {showContextMenu && createPortal(
        <AnimatePresence>
          <motion.div
            ref={contextMenuRef}
            className="context-menu fixed z-[9999] flex flex-col gap-1 p-2 rounded-lg border shadow-lg"
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
              backgroundColor: '#1E1E1E',
              borderColor: '#333333',
              boxShadow: 'rgba(0,0,0,0.4) 0px 12px 32px',
              minWidth: '160px',
              pointerEvents: 'auto'
            }}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              onClick={handleRemoveNode}
              className="flex items-center gap-2 px-3 py-2 rounded transition-colors text-left w-full"
              style={{ color: '#FF6B6B' }}
              whileTap={{ scale: 0.98 }}
              title="Remover bloco do canvas"
            >
              <Trash2 size={14} />
              <span style={{ fontSize: '13px', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
                Remover bloco
              </span>
            </motion.button>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

export default AdvancedCardNode;