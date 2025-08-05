import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckSquare, Bold, Italic, Underline, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EditorPanel = ({ newsId, newsData: externalNewsData, newsTitle, isLoading: externalIsLoading, loadError: externalLoadError, selectedBlock: externalSelectedBlock, onBlockSelected, onTransferBlock }) => {
  
  // Estados para o sistema de toolbar (removidos estados relacionados ao botão +)
  
  // Estados para o SelectionToolbar
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [selectionToolbarPosition, setSelectionToolbarPosition] = useState({ top: 0, left: 0 });
  const [isHoveringSelectionToolbar, setIsHoveringSelectionToolbar] = useState(false);
  
  // Estados para blocos interativos
  const [editingBlock, setEditingBlock] = useState(null); // 'summary', 'body', ou 'conclusion'
  
  // Usar selectedBlock vindo das props (controlado pela CurationPage)
  const selectedBlock = externalSelectedBlock;
  
  // Estados para dados da notícia (agora usando props)
  const newsData = externalNewsData;
  const isLoading = externalIsLoading;
  const loadError = externalLoadError;
  


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
  const getBlockData = () => {
    // Fazer parse dos dados se disponíveis
    const parsedData = newsData?.core_structure ? parseNewsData(newsData.core_structure) : null;
    
    // Se há dados carregados, usar eles; senão usar placeholder
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
  };

  // Função para transferir bloco para o contexto
  const handleTransferBlock = (blockId, content) => {
    if (onTransferBlock) {
      onTransferBlock(blockId, content);
    }
  };

  // Função para renderizar um bloco individual
  const renderBlock = (blockData) => {
    const { id, title, content, minHeight } = blockData;
    const isSelected = selectedBlock === id;
    const isEditing = editingBlock === id;
    const hasContent = content && !content.includes('Clique para selecionar') && !content.includes('Clique novamente para editar');

    return (
      <motion.div
        key={id}
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
        data-block-id={id}
        className={`block-wrapper p-4 rounded-lg cursor-pointer group ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
        style={{
          position: 'relative',
          backgroundColor: 'var(--bg-secondary)',
          border: isEditing ? '1px solid var(--primary-green)' : '1px solid var(--border-primary)',
          boxShadow: isEditing ? '0 0 0 2px var(--primary-green)' : isSelected ? '0 0 0 2px rgba(160, 160, 160, 0.3)' : 'none',
          marginBottom: '24px',
          marginTop: id === 'body' ? '24px' : '0px',
          transition: 'all 0.2s ease',
          overflow: 'hidden'
        }}
        onClick={(e) => {
          // Verificar se clicou no botão de transferir
          if (e.target.closest('.transfer-button')) {
            e.stopPropagation();
            return;
          }
          
          // Se o bloco já está selecionado, ativar edição
          if (id === selectedBlock && id !== editingBlock) {
            if (onBlockSelected) {
              onBlockSelected(null);
            }
            setEditingBlock(id);
          } 
          // Se é um bloco diferente ou nenhum estava selecionado, selecionar
          else if (id !== editingBlock) {
            setEditingBlock(null);
            if (onBlockSelected) {
              onBlockSelected(id);
            }
          }
        }}
      >
        {/* Efeito de brilho no hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2BB24C10] to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />

        <h3 
          className="text-base font-medium mb-3 pointer-events-none relative z-10"
          style={{
            color: 'var(--text-secondary)',
            fontFamily: "'Nunito Sans', 'Inter', sans-serif",
            margin: '0 0 12px 0'
          }}
        >
          {title}
        </h3>
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
            minHeight: minHeight,
            pointerEvents: isEditing ? 'auto' : 'none'
          }}
          onBlur={() => {
            if (isEditing) {
              setEditingBlock(null);
            }
          }}
        >
          {content}
        </div>
        
        {/* Botão de transferência - aparece quando há conteúdo */}
        {hasContent && (
          <motion.button
            onClick={() => handleTransferBlock(id, content)}
            className="transfer-button absolute top-4 right-4 p-2 rounded-full border text-[#A0A0A0] opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-20"
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
        
        {isSelected && !isEditing && (
          <motion.div 
            className="block-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.15)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              pointerEvents: 'auto',
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
                userSelect: 'none',
                WebkitUserSelect: 'none',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                letterSpacing: '0.5px',
                pointerEvents: 'none'
              }}
            >
          Clique mais uma vez para editar 📝
        </div>
      </motion.div>
        )}
      </motion.div>
    );
  };

  // Funções para o SelectionToolbar
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    
    // Só permitir toolbar de seleção se estivermos no modo de edição
    if (!editingBlock) {
      setShowSelectionToolbar(false);
      return;
    }
    
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Verificar se a seleção está dentro do bloco que está sendo editado
      const editingBlockElement = document.querySelector(`[data-block-id="${editingBlock}"]`);
      const isInEditingBlock = editingBlockElement && editingBlockElement.contains(range.commonAncestorContainer);
      
      // Verificar se há texto selecionado
      const selectedText = range.toString().trim();
      
      if (isInEditingBlock && selectedText.length > 0) {
        const editorContainer = document.querySelector('.p-6.flex-1.overflow-y-auto');
        const editorRect = editorContainer?.getBoundingClientRect();
        
        if (editorRect) {
        setSelectionToolbarPosition({
          top: rect.top - editorRect.top - 50, // 50px acima da seleção
          left: rect.left - editorRect.left + (rect.width / 2) - 80 // Centralizado (assumindo toolbar de ~160px)
        });
        setShowSelectionToolbar(true);
        }
      } else {
        setShowSelectionToolbar(false);
      }
    } else {
      // Se não há seleção ou está vazia, esconder o toolbar
      if (!isHoveringSelectionToolbar) {
        setShowSelectionToolbar(false);
      }
    }
  }, [isHoveringSelectionToolbar, editingBlock]);

  const handleSelectionToolbarMouseEnter = useCallback(() => {
    setIsHoveringSelectionToolbar(true);
  }, []);

  const handleSelectionToolbarMouseLeave = useCallback(() => {
    setIsHoveringSelectionToolbar(false);
    // Verificar se ainda há seleção ativa
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection.rangeCount || selection.isCollapsed) {
        setShowSelectionToolbar(false);
      }
    }, 100);
  }, []);

  const handleCloseSelectionToolbar = useCallback(() => {
    setShowSelectionToolbar(false);
    setIsHoveringSelectionToolbar(false);
  }, []);

  // Função para aplicar formatação na seleção
  const applyTextFormat = useCallback((format) => {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;
    
    // Verificar se há texto selecionado
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (selectedText.length === 0) return;
    
    try {
      // Aplicar formatação usando execCommand
      document.execCommand(format, false, null);
      
      // Restaurar foco no elemento editável atual se estiver em edição
      if (editingBlock) {
        const blockWrapper = document.querySelector(`[data-block-id="${editingBlock}"]`);
        const editableContent = blockWrapper?.querySelector('.editable-content');
        if (editableContent) {
          editableContent.focus();
        }
      }
      
      // Esconder a toolbar após aplicar formatação
      setShowSelectionToolbar(false);
    } catch (error) {
      console.warn('Erro na formatação de texto:', error);
    }
  }, [editingBlock]);

  // Event listeners para detectar seleção de texto
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleTextSelection, 10); // Pequeno delay para garantir que a seleção seja processada
    };

    const handleKeyUp = (e) => {
      // Detectar seleção via teclado (Shift + setas)
      if (e.shiftKey || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        setTimeout(handleTextSelection, 10);
      }
    };

    const handleMouseUpInEditor = (e) => {
      // Verificar se o evento ocorreu dentro de um elemento editável
      const editableContent = e.target.closest('.editable-content');
      if (editableContent) {
        setTimeout(handleTextSelection, 10);
      }
    };

    // Prevenir seleção em elementos protegidos
    const handleSelectStart = (e) => {
      const target = e.target;
      // Verifica se target é um elemento antes de chamar closest
      if (target instanceof Element && (target.closest('.block-wrapper.selected') || target.hasAttribute('data-protected'))) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('selectstart', handleSelectStart);
    
    // Adicionar listener específico para elementos editáveis
    document.addEventListener('mouseup', handleMouseUpInEditor);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('mouseup', handleMouseUpInEditor);
    };
  }, [handleTextSelection]);

  // Event listeners para blocos interativos (apenas click)
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Se clicou fora de qualquer bloco, desselecionar
      if (!e.target.closest('.block-wrapper')) {
        if (onBlockSelected) {
          onBlockSelected(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onBlockSelected]);





  return (
    <div 
      className="h-screen flex flex-col"
      style={{ 
        backgroundColor: 'var(--bg-primary)'
      }}
    >
      {/* Estilos CSS similares ao NewsEditorPage */}
      <style>{`
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
        /* Estilos para formatação de texto */
        
        /* Estilos para formatação de texto */
        .prose u { 
          color: #E0E0E0; 
          text-decoration: underline; 
        }
        .prose s, .prose del { 
          color: #E0E0E0; 
          text-decoration: line-through; 
        }
        
        /* Toolbar de seleção */
        .selection-toolbar {
          animation: fadeInUp 0.2s ease-out;
        }
        
        /* Melhorar aparência dos blocos */
        .block-wrapper {
          transition: all 0.2s ease;
          position: relative;
        }
        
        .block-wrapper.selected {
          pointer-events: none;
        }
        
        .block-wrapper.selected .block-overlay {
          pointer-events: auto;
        }
        
        .block-wrapper.selected .editable-content {
          pointer-events: none !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        
        .block-wrapper:hover {
          border-color: #2BB24C50 !important;
        }
        
        /* Overlay para bloco selecionado */
        .block-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          pointer-events: auto;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        
        .block-overlay-text {
          color: #E0E0E0;
          font-size: 18px;
          font-weight: 600;
          text-align: center;
          font-family: "Nunito Sans", "Inter", sans-serif;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
          letter-spacing: 0.5px;
          pointer-events: none;
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
              {newsId ? 'Editando Notícia' : 'Nova Notícia'}
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
      
      {/* Área de Conteúdo */}
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="relative">
          {/* Editor com blocos renderizados dinamicamente */}
          <div
            className="prose prose-invert max-w-none w-full text-lg leading-relaxed relative z-10 focus:outline-none"
            style={{ 
              fontFamily: '"Nunito Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              '--tw-prose-headings': '#E0E0E0',
              '--tw-prose-body': '#E0E0E0',
              '--tw-prose-bold': '#E0E0E0',
              '--tw-prose-links': '#2BB24C',
            }}
          >
            <AnimatePresence>
              {getBlockData().map(renderBlock)}
            </AnimatePresence>
          </div>
          


          {/* Toolbar de Seleção de Texto */}
          {showSelectionToolbar && (
            <motion.div
              onMouseEnter={handleSelectionToolbarMouseEnter}
              onMouseLeave={handleSelectionToolbarMouseLeave}
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
                style={{ color: '#A0A0A0', fontFamily: 'Inter' }}
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
                style={{ color: '#A0A0A0', fontFamily: 'Inter' }}
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
                style={{ color: '#A0A0A0', fontFamily: 'Inter' }}
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
                onClick={handleCloseSelectionToolbar}
                className="p-2 rounded transition-colors ml-2"
                style={{ color: '#A0A0A0', fontFamily: 'Inter', fontSize: '12px' }}
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
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;