import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckSquare, Bold, Italic, Underline } from 'lucide-react';

const EditorPanel = ({ newsId, newsData: externalNewsData, isLoading: externalIsLoading, loadError: externalLoadError, onBlockSelected }) => {
  
  // Estados para o sistema de toolbar (removidos estados relacionados ao botão +)
  
  // Estados para o SelectionToolbar
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [selectionToolbarPosition, setSelectionToolbarPosition] = useState({ top: 0, left: 0 });
  const [isHoveringSelectionToolbar, setIsHoveringSelectionToolbar] = useState(false);
  
  // Estados para blocos interativos
  const [editingBlock, setEditingBlock] = useState(null); // 'summary', 'body', ou 'conclusion'
  const [selectedBlock, setSelectedBlock] = useState(null);
  
  // Estados para dados da notícia (agora usando props)
  const newsData = externalNewsData;
  const isLoading = externalIsLoading;
  const loadError = externalLoadError;
  
  const [isInitialized, setIsInitialized] = useState(false);

  const editorRef = useRef(null);

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

  // Conteúdo inicial placeholder seguindo style guide
  const getInitialContent = () => {
    // Fazer parse dos dados se disponíveis
    const parsedData = newsData?.core_structure ? parseNewsData(newsData.core_structure) : null;
    
    // Se há dados carregados, usar eles; senão usar placeholder
    const introduce = parsedData?.Introduce || 'Clique para selecionar, clique novamente para editar a introdução da notícia...';
    const body = parsedData?.corpos_de_analise || 'Clique para selecionar, clique novamente para editar o corpo da notícia...';
    const conclusion = parsedData?.conclusoes || 'Clique para selecionar, clique novamente para editar a conclusão...';

    return `
    <div data-block-id="summary" class="block-wrapper p-4 rounded-lg cursor-pointer" style="background-color: #1E1E1E; border: 1px solid #333333; margin-bottom: 24px;">
      <h3 class="text-base font-medium mb-3 pointer-events-none" style="color: #A0A0A0; font-family: 'Nunito Sans', 'Inter', sans-serif; margin: 0 0 12px 0;">Introdução</h3>
      <div class="editable-content" contenteditable="false" style="font-size: 15px; color: #E0E0E0; font-family: 'Nunito Sans', 'Inter', sans-serif; line-height: 1.7; user-select: none; -webkit-user-select: none; min-height: 60px;">
        ${introduce}
      </div>
      <div class="block-overlay" style="display: none;">
        <button class="block-overlay-close" title="Desselecionar">×</button>
        <div class="block-overlay-text">
          Clique mais uma vez para editar 📝
        </div>
      </div>
    </div>

    <div data-block-id="body" class="block-wrapper mt-6 p-4 rounded-lg cursor-pointer" style="background-color: #1E1E1E; border: 1px solid #333333; margin-bottom: 24px;">
      <h3 class="text-base font-medium mb-3 pointer-events-none" style="color: #A0A0A0; font-family: 'Nunito Sans', 'Inter', sans-serif; margin: 0 0 12px 0;">Corpo</h3>
      <div class="editable-content" contenteditable="false" style="font-size: 15px; color: #E0E0E0; font-family: 'Nunito Sans', 'Inter', sans-serif; line-height: 1.7; user-select: none; -webkit-user-select: none; min-height: 80px;">
        ${body}
      </div>
      <div class="block-overlay" style="display: none;">
        <button class="block-overlay-close" title="Desselecionar">×</button>
        <div class="block-overlay-text">
          Clique mais uma vez para editar 📝
        </div>
      </div>
    </div>

    <div data-block-id="conclusion" class="block-wrapper mt-6 p-4 rounded-lg cursor-pointer" style="background-color: #1E1E1E; border: 1px solid #333333; margin-bottom: 24px;">
      <h3 class="text-base font-medium mb-3 pointer-events-none" style="color: #A0A0A0; font-family: 'Nunito Sans', 'Inter', sans-serif; margin: 0 0 12px 0;">Conclusão</h3>
      <div class="editable-content" contenteditable="false" style="font-size: 15px; color: #E0E0E0; font-family: 'Nunito Sans', 'Inter', sans-serif; line-height: 1.7; user-select: none; -webkit-user-select: none; min-height: 60px;">
        ${conclusion}
      </div>
      <div class="block-overlay" style="display: none;">
        <button class="block-overlay-close" title="Desselecionar">×</button>
        <div class="block-overlay-text">
          Clique mais uma vez para editar 📝
        </div>
      </div>
    </div>
  `;
  };

  // Função removida - funcionalidade do botão + foi removida

  // Funções relacionadas ao botão + foram removidas

  // Funções relacionadas ao toolbar foram removidas

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
      
      // Verificar se a seleção está dentro do editor
      const isInEditor = editorRef.current && editorRef.current.contains(range.commonAncestorContainer);
      
      // Verificar se a seleção está dentro do bloco que está sendo editado
      const editingBlockElement = editorRef.current?.querySelector(`[data-block-id="${editingBlock}"]`);
      const isInEditingBlock = editingBlockElement && editingBlockElement.contains(range.commonAncestorContainer);
      
      // Verificar se há texto selecionado
      const selectedText = range.toString().trim();
      
      if (isInEditor && isInEditingBlock && selectedText.length > 0) {
        const editorRect = editorRef.current.getBoundingClientRect();
        
        setSelectionToolbarPosition({
          top: rect.top - editorRect.top - 50, // 50px acima da seleção
          left: rect.left - editorRect.left + (rect.width / 2) - 80 // Centralizado (assumindo toolbar de ~160px)
        });
        setShowSelectionToolbar(true);
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

  // Função setBlockType foi removida

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
        const blockWrapper = editorRef.current?.querySelector(`[data-block-id="${editingBlock}"]`);
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
      if (target.closest('.block-wrapper.selected') || target.hasAttribute('data-protected')) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('selectstart', handleSelectStart);
    
    // Adicionar listener específico para elementos editáveis
    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('mouseup', handleMouseUpInEditor);
    }
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('selectstart', handleSelectStart);
      if (editor) {
        editor.removeEventListener('mouseup', handleMouseUpInEditor);
      }
    };
  }, [handleTextSelection]);

  // Reinicializar conteúdo quando os dados mudarem
  useEffect(() => {
    if (editorRef.current && (newsData || !newsId)) {
      editorRef.current.innerHTML = getInitialContent();
      setIsInitialized(true);
    }
  }, [newsData, newsId, parseNewsData]);

  // Inicializar conteúdo apenas uma vez (para editor vazio)
  useEffect(() => {
    if (editorRef.current && !isInitialized && !newsId) {
      editorRef.current.innerHTML = getInitialContent();
      setIsInitialized(true);
    }
  }, [isInitialized, newsId]);

  // Event listeners para blocos interativos (apenas click)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleClick = (e) => {
      // Verificar se clicou no botão de fechar
      if (e.target.classList.contains('block-overlay-close')) {
        e.stopPropagation();
        setSelectedBlock(null);
        setEditingBlock(null);
        // Comunicar que nenhum bloco está selecionado
        if (onBlockSelected) {
          onBlockSelected(null);
        }
        return;
      }
      
      const blockWrapper = e.target.closest('.block-wrapper');
      
      if (blockWrapper) {
        const blockId = blockWrapper.getAttribute('data-block-id');
        
        // Se o bloco já está selecionado, ativar edição
        if (blockId === selectedBlock && blockId !== editingBlock) {
          setSelectedBlock(null);
          setEditingBlock(blockId);
        } 
        // Se é um bloco diferente ou nenhum estava selecionado, selecionar
        else if (blockId !== editingBlock) {
          setSelectedBlock(blockId);
          setEditingBlock(null);
          // Comunicar seleção para componente pai
          if (onBlockSelected) {
            onBlockSelected(blockId);
          }
        }
      } else {
        // Clicou fora de qualquer bloco
        setSelectedBlock(null);
        // Comunicar que nenhum bloco está selecionado
        if (onBlockSelected) {
          onBlockSelected(null);
        }
      }
    };

    editor.addEventListener('click', handleClick);

    return () => {
      editor.removeEventListener('click', handleClick);
    };
  }, [editingBlock, selectedBlock, onBlockSelected]);

  // Gerenciar contentEditable dinamicamente
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Encontrar todos os divs editáveis
    const editableContents = editor.querySelectorAll('.editable-content');
    
    // Colocar todos em contentEditable="false" primeiro
    editableContents.forEach(content => {
      content.contentEditable = 'false';
    });

    // Se há um bloco sendo editado, torná-lo editável e focar
    if (editingBlock) {
      const blockWrapper = editor.querySelector(`[data-block-id="${editingBlock}"]`);
      if (blockWrapper) {
        const editableContent = blockWrapper.querySelector('.editable-content');
        if (editableContent) {
          editableContent.contentEditable = 'true';
          
          // Focar no elemento editável
          editableContent.focus();
          
          // Posicionar o cursor no final do texto se não houver seleção
          const selection = window.getSelection();
          if (selection.rangeCount === 0 || selection.isCollapsed) {
            const range = document.createRange();
            
            // Verificar se o conteúdo é apenas o placeholder
            const textContent = editableContent.textContent.trim();
            const isPlaceholder = textContent.includes('Clique para selecionar') || 
                                 textContent.includes('Clique duas vezes para editar');
            
            if (isPlaceholder) {
              // Se for placeholder, posicionar no início e limpar o conteúdo
              range.setStart(editableContent, 0);
              range.collapse(true);
              editableContent.textContent = '';
            } else {
              // Se já tem conteúdo, posicionar no final
              range.selectNodeContents(editableContent);
              range.collapse(false); // false = colapsar no final
            }
            
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    }
  }, [editingBlock]);

  // Aplicar estilos de estado dinâmicos
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const blockWrappers = editor.querySelectorAll('.block-wrapper');
    
    blockWrappers.forEach(wrapper => {
      const blockId = wrapper.getAttribute('data-block-id');
      const editableContent = wrapper.querySelector('.editable-content');
      const overlay = wrapper.querySelector('.block-overlay');
      
      // Remover todas as classes de estado primeiro
      wrapper.classList.remove('ring-2', 'ring-border-hover', 'ring-accent', 'selected');
      
      // Esconder todos os overlays primeiro
      if (overlay) {
        overlay.style.display = 'none';
      }
      
      // Aplicar classes baseadas no estado
      if (blockId === editingBlock) {
        wrapper.classList.add('ring-2');
        wrapper.style.borderColor = '#2BB24C';
        wrapper.style.boxShadow = '0 0 0 2px #2BB24C';
        // Permitir seleção de texto apenas no modo de edição
        if (editableContent) {
          editableContent.style.userSelect = 'text';
          editableContent.style.webkitUserSelect = 'text';
          editableContent.style.mozUserSelect = 'text';
          editableContent.style.msUserSelect = 'text';
          editableContent.style.pointerEvents = 'auto';
          editableContent.contentEditable = 'true';
          // Remover proteção
          editableContent.removeAttribute('data-protected');
        }
      } else if (blockId === selectedBlock) {
        wrapper.classList.add('ring-2', 'selected');
        wrapper.style.borderColor = '#333333';
        wrapper.style.boxShadow = '0 0 0 2px rgba(160, 160, 160, 0.3)';
        // Mostrar overlay quando bloco está selecionado (mas não editando)
        if (overlay) {
          overlay.style.display = 'flex';
        }
        // Completamente desabilitar interação com o conteúdo no modo selecionado
        if (editableContent) {
          editableContent.style.userSelect = 'none';
          editableContent.style.webkitUserSelect = 'none';
          editableContent.style.mozUserSelect = 'none';
          editableContent.style.msUserSelect = 'none';
          editableContent.style.pointerEvents = 'none';
          editableContent.contentEditable = 'false';
          // Forçar proteção adicional
          editableContent.setAttribute('data-protected', 'true');
        }
      } else {
        // Estado padrão - não permitir seleção de texto
        wrapper.style.borderColor = '#333333';
        wrapper.style.boxShadow = 'none';
        if (editableContent) {
          editableContent.style.userSelect = 'none';
          editableContent.style.webkitUserSelect = 'none';
          editableContent.style.mozUserSelect = 'none';
          editableContent.style.msUserSelect = 'none';
          editableContent.style.pointerEvents = 'none';
          editableContent.contentEditable = 'false';
          // Remover proteção
          editableContent.removeAttribute('data-protected');
        }
      }
    });
  }, [selectedBlock, editingBlock]);

  return (
    <div 
      className="h-screen flex flex-col"
      style={{ 
        backgroundColor: '#121212'
      }}
    >
      {/* Estilos CSS similares ao NewsEditorPage */}
      <style>{`
        /* Esconder scrollbars */
        .custom-scrollbar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* Internet Explorer e Edge */
        }
        .custom-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari e Opera */
        }
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
        
        .block-overlay-close {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          color: #333;
          transition: all 0.2s ease;
          pointer-events: auto;
          z-index: 20;
        }
        
        .block-overlay-close:hover {
          background: rgba(255, 255, 255, 1);
          transform: scale(1.1);
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
      <div 
        className="p-6 border-b flex items-center gap-3 flex-shrink-0"
        style={{ 
          borderColor: '#333333'
        }}
      >
        <CheckSquare 
          size={24} 
          style={{ color: '#2BB24C' }}
        />
        <div className="flex-1">
          <h1 
            className="font-bold"
            style={{ 
              fontSize: '24px',
              fontWeight: '600',
              color: '#E0E0E0',
              fontFamily: '"Nunito Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            {newsId ? `Editando Notícia #${newsId}` : 'Nova Notícia'}
          </h1>
          {isLoading && (
            <p style={{ color: '#A0A0A0', fontSize: '14px', fontFamily: '"Nunito Sans", "Inter", sans-serif', marginTop: '4px' }}>
              Carregando dados da notícia...
            </p>
          )}
          {loadError && (
            <p style={{ color: '#ff6b6b', fontSize: '14px', fontFamily: '"Nunito Sans", "Inter", sans-serif', marginTop: '4px' }}>
              Erro ao carregar: {loadError}
            </p>
          )}
        </div>
      </div>
      
      {/* Área de Conteúdo */}
      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="relative">
          {/* Editor contentEditable */}
          <div
            ref={editorRef}
            contentEditable={true}
            suppressContentEditableWarning={true}
            className="prose prose-invert max-w-none w-full text-lg leading-relaxed relative z-10 focus:outline-none"
            onBlur={(e) => {
              // Só sair do modo de edição se o foco não foi para a toolbar
              const relatedTarget = e.relatedTarget;
              if (!relatedTarget || 
                  (!relatedTarget.closest('.selection-toolbar') && 
                   !relatedTarget.closest('.markdown-toolbar'))) {
                setEditingBlock(null);
              }
            }}
            style={{ 
              fontFamily: '"Nunito Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              '--tw-prose-headings': '#E0E0E0',
              '--tw-prose-body': '#E0E0E0',
              '--tw-prose-bold': '#E0E0E0',
              '--tw-prose-links': '#2BB24C',
            }}
          />
          


          {/* Toolbar de Seleção de Texto */}
          {showSelectionToolbar && (
            <div
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;