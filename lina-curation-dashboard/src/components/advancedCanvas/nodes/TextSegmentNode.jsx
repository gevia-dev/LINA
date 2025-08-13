import React, { useCallback, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from '@xyflow/react';
import { Trash2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const TextSegmentNode = ({ data, selected }) => {
  const { id, minHeight, animation, coreKey } = data;

  const nodeRef = useRef(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const getNodeTypeTitle = useCallback(() => {
    if (data.title) return data.title;
    if (coreKey) {
      switch (coreKey) {
        case 'Introduce': return 'Introdução';
        case 'corpos_de_analise': return 'Corpo de Análise';
        case 'conclusoes': return 'Conclusão';
        default:
          return 'Bloco de Conteúdo';
      }
    }
    return 'Bloco de Conteúdo';
  }, [data, coreKey]);

  const handleDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (data.onOpenModal) {
      data.onOpenModal({
        content: data.content || '',
        coreKey: data.coreKey,
        itemId: id,
        title: getNodeTypeTitle(),
      });
    }
  }, [data, id, getNodeTypeTitle]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const position = { x: e.clientX, y: e.clientY };
    setContextMenuPosition(position);
    setShowContextMenu(true);
  }, []);

  const handleRemoveNode = useCallback((e) => {
    e.stopPropagation();
    if (data.onRemove) {
      data.onRemove(id);
    }
    setShowContextMenu(false);
  }, [id, data.onRemove]);

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showContextMenu]);

  return (
    <motion.div
      ref={nodeRef}
      className={`advanced-card-node group ${selected ? 'selected' : ''}`}
      variants={animation}
      initial="initial"
      animate="animate"
      exit="initial"
      style={{
        width: '350px',
        minHeight: minHeight || '120px',
        backgroundColor: 'var(--bg-secondary)',
        border: selected ? '2px solid var(--primary-green)' : '1px solid var(--border-primary)',
        borderRadius: '12px',
        padding: '16px',
        position: 'relative',
        overflow: 'visible',
        cursor: 'default',
        boxShadow: selected ? '0 0 0 3px var(--primary-green-transparent)' : '0 4px 12px rgba(0,0,0,0.2)'
      }}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex justify-between items-center mb-3 relative z-1">
        <h3 className="font-medium pointer-events-none flex items-center gap-2" style={{ 
          color: 'var(--text-secondary)', 
          fontFamily: "'Nunito Sans', 'Inter', sans-serif", 
          margin: 0,
          fontSize: '16px'
        }}>
          <FileText size={14} />
          {getNodeTypeTitle()}
        </h3>
      </div>

      <div className="relative z-1" style={{ 
        fontSize: '15px',
        color: 'var(--text-secondary)', 
        fontFamily: "'Nunito Sans', 'Inter', sans-serif", 
        minHeight: '60px'
      }}>
        <div className="text-xs text-gray-500">Clique duplo para editar</div>
      </div>

      {/* Handles padrão e especializados para nodes de texto */}
      <>
        <Handle
          type="target"
          position={Position.Top}
          id="dados"
          style={{ left: '15%', width: 8, height: 8 }}
          className="connection-handle connection-handle-dados"
          isConnectable={true}
          title="Entrada de Dados"
        />

        <Handle
          type="target"
          position={Position.Top}
          id="estrutura"
          style={{ left: '35%', width: 8, height: 8 }}
          className="connection-handle connection-handle-estrutura"
          isConnectable={true}
          title="Entrada de Estrutura"
        />

        <Handle
          type="target"
          position={Position.Left}
          id="target"
          isConnectable={true}
          title="Entrada Geral"
        />

        <Handle
          type="source"
          position={Position.Right}
          id="source"
          isConnectable={true}
          title="Saída Geral"
        />
      </>

      {showContextMenu && createPortal(
        <div
          className="context-menu fixed z-[9999] p-2 rounded-lg border shadow-lg"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y, backgroundColor: '#1E1E1E', borderColor: '#333333', minWidth: '160px' }}
        >
          <button onClick={handleRemoveNode} className="flex items-center gap-2 px-3 py-2 rounded w-full text-left" style={{ color: '#FF6B6B' }}>
            <Trash2 size={14} />
            <span>Remover bloco</span>
          </button>
        </div>,
        document.body
      )}
    </motion.div>
  );
};

export default TextSegmentNode;




