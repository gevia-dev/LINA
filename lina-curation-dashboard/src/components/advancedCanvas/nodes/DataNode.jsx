import React, { useCallback, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from '@xyflow/react';
import { Trash2, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const DataNode = ({ data, selected }) => {
  const { id, animation, coreKey } = data;

  const nodeRef = useRef(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const isStructureNode = data.isStructureNode || coreKey === 'micro_estrutura';

  const getNodeTypeTitle = useCallback(() => {
    if (data.title) return data.title;
    if (isStructureNode) return 'Estrutura';
    if (coreKey && coreKey.startsWith('micro_')) {
      const microType = coreKey.replace('micro_', '');
      return `Micro-${microType.charAt(0).toUpperCase() + microType.slice(1)}`;
    }
    return 'Bloco de Dados';
  }, [data, coreKey, isStructureNode]);

  const handleDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (data.onOpenModal) {
      data.onOpenModal({
        content: data.content || '',
        type: isStructureNode ? 'estrutura' : 'micro',
        nodeType: data.nodeType,
        coreKey: data.coreKey,
        itemId: id,
        title: getNodeTypeTitle(),
        structureType: data.structureType || 'continua'
      });
    }
  }, [data, id, getNodeTypeTitle, isStructureNode]);

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
        width: '245px',
        minHeight: '110px',
        backgroundColor: 'var(--bg-secondary)',
        border: selected ? '2px solid var(--primary-green)' : '1px solid var(--border-primary)',
        borderRadius: '12px',
        padding: '12px',
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
          fontSize: '13px'
        }}>
          <Layers size={12} style={{ color: '#F5A623' }} />
          {getNodeTypeTitle()}
        </h3>
      </div>

      <div className="relative z-1" style={{ 
        fontSize: '13px',
        color: 'var(--text-secondary)', 
        fontFamily: "'Nunito Sans', 'Inter', sans-serif", 
        minHeight: '70px'
      }}>
        {isStructureNode ? (
          <div className="space-y-1">
            {['continua', 'paragrafos', 'topicos'].map((option) => (
              <div key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`${id}-${option}`}
                  name={`structure-type-${id}`}
                  value={option}
                  checked={data.structureType === option}
                  onChange={(e) => {
                    if (data.onUpdateContent) {
                      data.onUpdateContent(id, {
                        ...data,
                        structureType: e.target.value
                      });
                    }
                  }}
                  className="w-3 h-3"
                  style={{
                    accentColor: '#F5A623',
                    cursor: 'default'
                  }}
                />
                <label 
                  htmlFor={`${id}-${option}`}
                  className="text-xs capitalize"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">Clique duplo para editar</div>
        )}
      </div>

      {/* Handles condicionais para Estrutura (laranja) ou Micro (azul) */}
      {isStructureNode ? (
        <Handle
          type="source"
          position={Position.Bottom}
          id="estrutura-output"
          style={{ 
            width: 12, 
            height: 12,
            backgroundColor: '#F5A623',
            border: '2px solid #E59613',
            boxShadow: '0 0 8px rgba(245, 166, 35, 0.4)',
            right: '12px',
            bottom: '12px'
          }}
          className="connection-handle connection-handle-estrutura"
          isConnectable={true}
          title="Saída de Estrutura"
        />
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          id="micro-output"
          style={{ 
            width: 12, 
            height: 12,
            backgroundColor: '#4A90E2',
            border: '2px solid #3A80D2',
            boxShadow: '0 0 8px rgba(74, 144, 226, 0.4)',
            right: '12px',
            bottom: '12px'
          }}
          className="connection-handle connection-handle-dados"
          isConnectable={true}
          title="Saída de Micro-dado"
        />
      )}

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

export default DataNode;




