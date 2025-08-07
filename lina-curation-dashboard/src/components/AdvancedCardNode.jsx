import React, { useCallback, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from '@xyflow/react';
import { Trash2, Database, Layers, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdvancedCardNode = ({ data, selected }) => {
  const { 
    id, 
    title, 
    minHeight, 
    animation,
    coreKey,
    hasContent
  } = data;
  
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
        case 'micro_estrutura': return 'Estrutura';
        default:
          if (coreKey.startsWith('micro_')) {
            const microType = coreKey.replace('micro_', '');
            return `Micro-${microType.charAt(0).toUpperCase() + microType.slice(1)}`;
          }
          return 'Bloco de Conteúdo';
      }
    }
    return 'Bloco de Conteúdo';
  }, [data, coreKey]);

  // Verificar se é um node de micro-dado
  const isMicroDadoNode = coreKey && coreKey.startsWith('micro_') && coreKey !== 'micro_estrutura';

  const handleDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (data.onOpenModal) {
      data.onOpenModal({
        content: data.content || '',
        type: data.nodeType === 'estrutura' ? 'estrutura' : 'micro',
        nodeType: data.nodeType,
        coreKey: data.coreKey,
        itemId: id,
        title: getNodeTypeTitle(),
        structureType: data.structureType || 'continua' // Passar structureType para o modal
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
        width: (data.isStructureNode || isMicroDadoNode) ? '245px' : '350px', // 70% da largura para estrutura e micro-dados
        minHeight: (data.isStructureNode || isMicroDadoNode) ? '110px' : (minHeight || '120px'), // Altura ajustada para estrutura e micro-dados
        backgroundColor: 'var(--bg-secondary)',
        border: selected ? '2px solid var(--primary-green)' : '1px solid var(--border-primary)',
        borderRadius: '12px',
        padding: (data.isStructureNode || isMicroDadoNode) ? '12px' : '16px', // Padding menor para estrutura e micro-dados
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
          fontSize: (data.isStructureNode || isMicroDadoNode) ? '13px' : '16px' // Texto menor para estrutura e micro-dados
        }}>
          {coreKey === 'micro_estrutura' ? <Layers size={(data.isStructureNode || isMicroDadoNode) ? 12 : 14} style={{ color: '#F5A623' }} /> : <FileText size={(data.isStructureNode || isMicroDadoNode) ? 12 : 14} />}
          {getNodeTypeTitle()}
        </h3>
      </div>
      
      <div className="relative z-1" style={{ 
        fontSize: (data.isStructureNode || isMicroDadoNode) ? '13px' : '15px', // Texto menor para estrutura e micro-dados
        color: 'var(--text-secondary)', 
        fontFamily: "'Nunito Sans', 'Inter', sans-serif", 
        minHeight: (data.isStructureNode || isMicroDadoNode) ? '70px' : '60px' // Altura ajustada para estrutura e micro-dados
      }}>
        {data.isStructureNode ? (
          // Radio buttons para node de estrutura
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
          // Nodes normais: sem texto de "conteúdo carregado"
          <div className="text-xs text-gray-500">Clique duplo para editar</div>
        )}
      </div>

      {/* Handles condicionais baseados no tipo de node */}
      {!data.isStructureNode && !isMicroDadoNode ? (
        <>
          {/* Handles de entrada especializados - canto superior esquerdo */}
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

          {/* Handle de entrada padrão - lado esquerdo */}
          <Handle
            type="target"
            position={Position.Left}
            id="target"
            isConnectable={true}
            title="Entrada Geral"
          />

          {/* Handle de saída padrão - lado direito */}
          <Handle
            type="source"
            position={Position.Right}
            id="source"
            isConnectable={true}
            title="Saída Geral"
          />
        </>
      ) : data.isStructureNode ? (
        <>
          {/* Node de estrutura: apenas saída laranja na parte inferior direita */}
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
              right: '12px', // Posicionar na parte direita
              bottom: '12px' // Posicionar na parte inferior
            }}
            className="connection-handle connection-handle-estrutura"
            isConnectable={true}
            title="Saída de Estrutura"
          />
        </>
      ) : (
        <>
          {/* Node de micro-dado: apenas saída azul na parte inferior direita */}
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
              right: '12px', // Posicionar na parte direita
              bottom: '12px' // Posicionar na parte inferior
            }}
            className="connection-handle connection-handle-dados"
            isConnectable={true}
            title="Saída de Micro-dado"
          />
        </>
      )}

      {showContextMenu && createPortal(
        <motion.div
            className="context-menu fixed z-[9999] p-2 rounded-lg border shadow-lg"
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y, backgroundColor: '#1E1E1E', borderColor: '#333333', minWidth: '160px' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <motion.button onClick={handleRemoveNode} className="flex items-center gap-2 px-3 py-2 rounded w-full text-left" style={{ color: '#FF6B6B' }} whileTap={{ scale: 0.98 }}>
              <Trash2 size={14} />
              <span>Remover bloco</span>
            </motion.button>
          </motion.div>,
        document.body
      )}
    </motion.div>
  );
};

export default AdvancedCardNode;