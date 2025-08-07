import React, { useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bold, Italic, Underline, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Componente CardNode - Nó customizado do ReactFlow para blocos de conteúdo
 * Preserva todas as funcionalidades do EditorPanel: edição inline, formatação, transferência
 */
const CardNode = ({ data, selected }) => {
  const { 
    id, 
    title, 
    content, 
    minHeight, 
    isEditing, 
    hasContent, 
    onEdit, 
    onTransfer 
  } = data;
  
  const editableRef = useRef(null);
  const [showSelectionToolbar, setShowSelectionToolbar] = React.useState(false);
  const [selectionToolbarPosition, setSelectionToolbarPosition] = React.useState({ top: 0, left: 0 });
  const [isHoveringSelectionToolbar, setIsHoveringSelectionToolbar] = React.useState(false);

  // Função para lidar com clique no bloco
  const handleClick = useCallback((e) => {
    // Não processar clique se clicou no botão de transferir
    if (e.target.closest('.transfer-button')) {
      e.stopPropagation();
      return;
    }
    
    if (onEdit) {
      onEdit(id);
    }
  }, [id, onEdit]);

  // Função para lidar com clique no botão de transferência
  const handleTransferClick = useCallback((e) => {
    e.stopPropagation();
    if (onTransfer && hasContent) {
      onTransfer(id, content);
    }
  }, [id, content, onTransfer, hasContent]);

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
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isEditing, isHoveringSelectionToolbar]);

  return (
    <motion.div
      className={`card-node ${selected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
      style={{
        width: '350px',
        minHeight: minHeight || '120px',
        backgroundColor: 'var(--bg-secondary)',
        border: isEditing ? '2px solid var(--primary-green)' : '1px solid var(--border-primary)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: isEditing 
          ? '0 0 0 3px var(--primary-green-transparent)' 
          : selected 
            ? '0 0 0 2px rgba(160, 160, 160, 0.3)' 
            : '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={handleClick}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.95 }}
      transition={{ 
        duration: 0.4, 
        ease: "easeOut",
        delay: id === 'summary' ? 0 : id === 'body' ? 0.1 : 0.2
      }}
      whileHover={{ 
        scale: 1.01,
        y: -2,
        transition: { duration: 0.2 }
      }}
    >
      {/* Efeito de brilho no hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2BB24C10] to-transparent"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{
          animation: selected ? 'shimmer 2s ease-in-out infinite' : 'none'
        }}
      />

      {/* Header do bloco */}
      <div className="flex justify-between items-center mb-3 relative z-10">
        <h3 
          className="text-base font-medium pointer-events-none"
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
          <motion.button
            onClick={handleTransferClick}
            className="transfer-button p-2 rounded-full border text-[#A0A0A0] opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-20"
            style={{
              borderColor: 'var(--primary-green-transparent)',
              backgroundColor: 'transparent'
            }}
            whileHover={{ 
              scale: 1.1,
              backgroundColor: 'var(--primary-green)',
              color: 'white'
            }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowLeft size={14} />
          </motion.button>
        )}
      </div>
      
      {/* Conteúdo do bloco */}
      <div
        ref={editableRef}
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
        <motion.div 
          className="block-overlay absolute inset-0 bg-black bg-opacity-15 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          <div 
            className="block-overlay-text"
            style={{
              color: '#E0E0E0',
              fontSize: '18px',
              fontWeight: '600',
              textAlign: 'center',
              fontFamily: "'Nunito Sans', 'Inter', sans-serif",
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
              letterSpacing: '0.5px',
              pointerEvents: 'none'
            }}
          >
            Clique mais uma vez para editar 📝
          </div>
        </motion.div>
      )}

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
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2BB24C33';
              e.target.style.color = '#2BB24C';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#A0A0A0';
            }}
          >
            <Bold size={14} />
          </button>
          
          <button
            onClick={() => applyTextFormat('italic')}
            className="p-2 rounded transition-colors"
            style={{ color: '#A0A0A0' }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2BB24C33';
              e.target.style.color = '#2BB24C';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#A0A0A0';
            }}
          >
            <Italic size={14} />
          </button>
          
          <button
            onClick={() => applyTextFormat('underline')}
            className="p-2 rounded transition-colors"
            style={{ color: '#A0A0A0' }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2BB24C33';
              e.target.style.color = '#2BB24C';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#A0A0A0';
            }}
          >
            <Underline size={14} />
          </button>
          
          <button
            onClick={() => setShowSelectionToolbar(false)}
            className="p-2 rounded transition-colors ml-2"
            style={{ color: '#A0A0A0', fontSize: '12px' }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2BB24C33';
              e.target.style.color = '#2BB24C';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#A0A0A0';
            }}
          >
            ×
          </button>
        </motion.div>
      )}

      {/* Handles de conexão do ReactFlow */}
      <Handle
        type="target"
        position={Position.Top}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
      />
    </motion.div>
  );
};

export default CardNode; 