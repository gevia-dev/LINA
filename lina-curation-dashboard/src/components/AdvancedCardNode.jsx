import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bold, Italic, Underline, Move, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AdvancedCardNode - Versão avançada do CardNode com funcionalidades aprimoradas:
 * - Animações suaves com framer-motion
 * - Prevenção de conflitos de eventos
 * - Indicadores visuais de estado
 * - Gestão avançada de interações
 */
const AdvancedCardNode = ({ data, selected, dragging }) => {
  const { 
    id, 
    title, 
    content, 
    minHeight, 
    isEditing, 
    hasContent, 
    onEdit, 
    onTransfer,
    onEditStart,
    onEditEnd,
    animation
  } = data;
  
  const editableRef = useRef(null);
  const nodeRef = useRef(null);
  
  // Estados locais para interações
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [selectionToolbarPosition, setSelectionToolbarPosition] = useState({ top: 0, left: 0 });
  const [isHoveringSelectionToolbar, setIsHoveringSelectionToolbar] = useState(false);
  const [isHoveringNode, setIsHoveringNode] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);

  // Função para lidar com clique no bloco - ativa edição diretamente
  const handleClick = useCallback((e) => {
    // Prevenir clique durante drag
    if (dragging || isDragMode) {
      e.stopPropagation();
      return;
    }

    // Não processar clique se clicou em botões ou área editável
    if (e.target.closest('.transfer-button') || 
        e.target.closest('.drag-handle') ||
        e.target.closest('.selection-toolbar')) {
      e.stopPropagation();
      return;
    }
    
    // Se já está em modo de edição, sair
    if (isEditing && onEditEnd) {
      onEditEnd();
      return;
    }

    // Ativar edição diretamente
    if (onEdit && !isEditing) {
      onEdit(id);
      
      // Notificar sobre início da edição
      if (onEditStart) {
        onEditStart(id);
      }
    }
  }, [id, onEdit, onEditStart, onEditEnd, isEditing, dragging, isDragMode]);



  // Função para entrar em modo drag
  const handleDragModeStart = useCallback((e) => {
    e.stopPropagation();
    setIsDragMode(true);
    
    // Adicionar classe para prevenir conflitos
    if (nodeRef.current) {
      nodeRef.current.classList.add('drag-active');
    }
  }, []);

  // Função para sair do modo drag
  const handleDragModeEnd = useCallback(() => {
    setIsDragMode(false);
    
    // Remover classe de drag
    if (nodeRef.current) {
      nodeRef.current.classList.remove('drag-active');
    }
  }, []);

  // Função para aplicar formatação na seleção
  const applyTextFormat = useCallback((format) => {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (selectedText.length === 0) return;
    
    try {
      document.execCommand(format, false, null);
      
      // Restaurar foco no elemento editável
      if (editableRef.current) {
        editableRef.current.focus();
      }
      
      setShowSelectionToolbar(false);
    } catch (error) {
      console.warn('Erro na formatação de texto:', error);
    }
  }, []);

  // Event listeners para detectar seleção de texto
  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      
      if (!isEditing) {
        setShowSelectionToolbar(false);
        return;
      }
      
      if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const selectedText = range.toString().trim();
        
        // Verificar se a seleção está dentro deste node
        const nodeElement = editableRef.current?.closest('.react-flow__node');
        const isInThisNode = nodeElement && nodeElement.contains(range.commonAncestorContainer);
        
        if (selectedText.length > 0 && isInThisNode) {
          const nodeRect = nodeElement.getBoundingClientRect();
          
          setSelectionToolbarPosition({
            top: rect.top - nodeRect.top - 50,
            left: rect.left - nodeRect.left + (rect.width / 2) - 80
          });
          setShowSelectionToolbar(true);
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

    if (isEditing) {
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('keyup', handleKeyUp);
    }

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyUp', handleKeyUp);
    };
  }, [isEditing, isHoveringSelectionToolbar]);

  // Detectar fim da edição quando clica fora
  useEffect(() => {
    const handleBlur = (e) => {
      if (isEditing && !nodeRef.current?.contains(e.target)) {
        if (onEditEnd) {
          onEditEnd();
        }
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleBlur);
    }

    return () => {
      document.removeEventListener('mousedown', handleBlur);
    };
  }, [isEditing, onEditEnd]);

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
    // hover: { 
    //   scale: 1.02,
    //   y: -3,
    //   transition: { 
    //     duration: 0.2,
    //     ease: "easeOut"
    //   }
    // },
    editing: {
      opacity: 1,
      scale: 1.05,
      boxShadow: "0 0 0 3px var(--primary-green-transparent)",
      transition: { duration: 0.3 }
    },
    dragging: {
      scale: 1.02,
      boxShadow: "0 8px 25px rgba(43, 178, 76, 0.2)",
      transition: { duration: 0.2 }
    }
  };

  // Determinar estado atual da animação
  const currentVariant = isEditing ? 'editing' : 'animate';

  return (
    <motion.div
      ref={nodeRef}
      className={`advanced-card-node group ${isEditing ? 'editing' : ''}`}
      variants={nodeVariants}
      initial="initial"
      animate={currentVariant}
      exit="initial"
      // onMouseEnter={() => setIsHoveringNode(true)}
      // onMouseLeave={() => setIsHoveringNode(false)}
      style={{
        width: '350px',
        minHeight: minHeight || '120px',
        backgroundColor: 'var(--bg-secondary)',
        border: isEditing 
          ? '2px solid var(--primary-green)' 
          : '1px solid var(--border-primary)',
        borderRadius: '12px',
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
        cursor: isEditing ? 'text' : 'pointer'
      }}
      onClick={handleClick}
    >
      {/* Indicador de modo drag */}
      <AnimatePresence>
        {isDragMode && !isEditing && (
          <motion.div
            className="drag-handle absolute top-2 left-2 p-1 rounded cursor-move"
            style={{
              backgroundColor: 'var(--primary-green-transparent)',
              color: 'var(--primary-green)'
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onMouseDown={handleDragModeStart}
            onMouseUp={handleDragModeEnd}
            title="Arrastar para mover"
          >
            <Move size={12} />
          </motion.div>
        )}
      </AnimatePresence>



      {/* Header do bloco */}
      <div className="flex justify-between items-center mb-3 relative z-10">
        <motion.h3 
          className="text-base font-medium pointer-events-none flex items-center gap-2"
          style={{
            color: 'var(--text-secondary)',
            fontFamily: "'Nunito Sans', 'Inter', sans-serif",
            margin: 0
          }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {title}
          {isEditing && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Edit3 size={14} style={{ color: 'var(--primary-green)' }} />
            </motion.div>
          )}
        </motion.h3>
        

      </div>
      
      {/* Conteúdo do bloco */}
      <motion.div
        ref={editableRef}
        className={`editable-content relative z-10 ${isEditing ? 'nopan nowheel nodrag' : ''}`}
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
          outline: 'none',
          padding: '8px',
          borderRadius: '6px',
          backgroundColor: isEditing ? 'var(--bg-primary)' : 'transparent',
          transition: 'all 0.3s ease'
        }}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        onBlur={() => {
          if (isEditing && onEditEnd) {
            onEditEnd();
          }
        }}
      >
        {content}
      </motion.div>
      


      {/* Toolbar de Seleção de Texto */}
      <AnimatePresence>
        {showSelectionToolbar && (
          <motion.div
            onMouseEnter={() => setIsHoveringSelectionToolbar(true)}
            onMouseLeave={() => setIsHoveringSelectionToolbar(false)}
            className="selection-toolbar absolute z-50 flex gap-1 p-2 rounded-lg border shadow-lg nopan nowheel nodrag"
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
            {[
              { format: 'bold', icon: Bold, label: 'Negrito' },
              { format: 'italic', icon: Italic, label: 'Itálico' },
              { format: 'underline', icon: Underline, label: 'Sublinhado' }
            ].map(({ format, icon: Icon, label }) => (
              <motion.button
                key={format}
                onClick={() => applyTextFormat(format)}
                className="p-2 rounded transition-colors"
                style={{ color: '#A0A0A0' }}
                whileHover={{ 
                  backgroundColor: '#2BB24C33',
                  color: '#2BB24C',
                  scale: 1.05
                }}
                whileTap={{ scale: 0.95 }}
                title={label}
              >
                <Icon size={14} />
              </motion.button>
            ))}
            
            <motion.button
              onClick={() => setShowSelectionToolbar(false)}
              className="p-2 rounded transition-colors ml-2"
              style={{ color: '#A0A0A0', fontSize: '12px' }}
              whileHover={{ 
                backgroundColor: '#2BB24C33',
                color: '#2BB24C',
                scale: 1.05
              }}
              whileTap={{ scale: 0.95 }}
              title="Fechar"
            >
              ×
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Handles de conexão do ReactFlow */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: 'var(--primary-green)',
          width: '8px',
          height: '8px',
          border: '2px solid var(--bg-secondary)',
          opacity: 0.3,
          transition: 'opacity 0.2s ease'
        }}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: 'var(--primary-green)',
          width: '8px',
          height: '8px',
          border: '2px solid var(--bg-secondary)',
          opacity: 0.3,
          transition: 'opacity 0.2s ease'
        }}
      />

      {/* Indicador de status */}
      <motion.div
        className="absolute bottom-2 right-2 w-2 h-2 rounded-full"
        style={{
          backgroundColor: hasContent ? 'var(--primary-green)' : 'var(--text-secondary)',
          opacity: 0.6
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
        title={hasContent ? 'Conteúdo válido' : 'Conteúdo vazio'}
      />
    </motion.div>
  );
};

export default AdvancedCardNode;