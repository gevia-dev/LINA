import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckSquare, Bold, Italic, Underline, Type, Heading1, Heading2, Heading3 } from 'lucide-react';

const EditorPanel = () => {
  // Estados para o sistema de toolbar (copiados do NewsEditorPage)
  const [showAddButton, setShowAddButton] = useState(false);
  const [addButtonPosition, setAddButtonPosition] = useState({ top: 0, left: 0 });
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [currentLineElement, setCurrentLineElement] = useState(null);
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  const [isHoveringToolbar, setIsHoveringToolbar] = useState(false);
  
  // Estados para o SelectionToolbar
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [selectionToolbarPosition, setSelectionToolbarPosition] = useState({ top: 0, left: 0 });
  const [isHoveringSelectionToolbar, setIsHoveringSelectionToolbar] = useState(false);
  
  const [isInitialized, setIsInitialized] = useState(false);

  const editorRef = useRef(null);

  // Conteúdo inicial placeholder seguindo style guide
  const getInitialContent = () => `
    <div class="summary-block" style="background-color: #1E1E1E; padding: 12px; border-radius: 8px; border: 1px solid #333333; margin-bottom: 24px;">
      <h3 style="font-size: 16px; font-weight: 500; color: #E0E0E0; font-family: Inter; margin: 0 0 8px 0;">Resumo</h3>
      <p style="font-size: 14px; color: #A0A0A0; font-family: Inter; margin: 0;">Clique aqui para adicionar o resumo da notícia...</p>
    </div>
    
    <h3 style="font-size: 16px; font-weight: 500; color: #E0E0E0; font-family: Inter; margin: 24px 0 12px 0;">Corpo</h3>
    <p style="font-size: 14px; color: #E0E0E0; font-family: Inter; margin: 0 0 24px 0;">Clique aqui para desenvolver o corpo da notícia...</p>
    
    <h3 style="font-size: 16px; font-weight: 500; color: #E0E0E0; font-family: Inter; margin: 24px 0 12px 0;">Conclusão</h3>
    <p style="font-size: 14px; color: #E0E0E0; font-family: Inter; margin: 0;">Clique aqui para adicionar a conclusão...</p>
  `;

  // Função para detectar hover sobre linhas e mostrar botão + (copiada do NewsEditorPage)
  const handleEditorMouseMove = useCallback((e) => {
    if (!editorRef.current || showToolbar) return;

    const editor = editorRef.current;
    const editorRect = editor.getBoundingClientRect();
    
    // Verificar se o mouse está dentro da área estendida do editor (incluindo margem à esquerda)
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const extendedLeftBound = editorRect.left - 80; // Estender 80px para a esquerda
    const isInExtendedArea = mouseX >= extendedLeftBound && 
                            mouseX <= editorRect.right && 
                            mouseY >= editorRect.top && 
                            mouseY <= editorRect.bottom;
    
    if (!isInExtendedArea) {
      setShowAddButton(false);
      setCurrentLineElement(null);
      return;
    }

    // Primeiro, tentar encontrar elemento diretamente no ponto do mouse
    let elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
    let lineElement = null;

    // Se o mouse está na área estendida à esquerda, procurar a linha mais próxima
    if (mouseX < editorRect.left) {
      // Buscar elemento na borda esquerda do editor na mesma altura Y
      elementAtPoint = document.elementFromPoint(editorRect.left + 10, mouseY);
    }

    // Se encontrou um elemento, procurar a linha pai
    if (elementAtPoint && editor.contains(elementAtPoint)) {
      lineElement = elementAtPoint;
      while (lineElement && lineElement !== editor) {
        if (['P', 'H1', 'H2', 'H3', 'DIV', 'LI'].includes(lineElement.tagName)) {
          break;
        }
        lineElement = lineElement.parentElement;
      }
    }

    // Se não encontrou linha ainda, procurar por todas as linhas do editor
    if (!lineElement || lineElement === editor) {
      const allLines = editor.querySelectorAll('p, h1, h2, h3, div, li');
      let closestLine = null;
      let closestDistance = Infinity;

      allLines.forEach(line => {
        const lineRect = line.getBoundingClientRect();
        const lineTop = lineRect.top;
        const lineBottom = lineRect.bottom;
        
        // Verificar se o mouse está na altura desta linha
        if (mouseY >= lineTop && mouseY <= lineBottom) {
          const distance = Math.abs(mouseX - lineRect.left);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestLine = line;
          }
        }
      });

      lineElement = closestLine;
    }

    if (lineElement && lineElement !== editor) {
      const lineRect = lineElement.getBoundingClientRect();
      
      setCurrentLineElement(lineElement);
      setAddButtonPosition({
        top: lineRect.top - editorRect.top + 2, // Alinhado no início da linha
        left: -40
      });
      setShowAddButton(true);
    } else {
      setShowAddButton(false);
      setCurrentLineElement(null);
    }
  }, [showToolbar]);

  // Função para esconder o botão quando sair do editor (com delay para permitir clique)
  const handleEditorMouseLeave = useCallback((e) => {
    // Se o toolbar está aberto, não esconder nada
    if (showToolbar) return;
    
    // Verificar se o mouse está indo para o botão ou toolbar
    const relatedTarget = e.relatedTarget;
    
    // Se o mouse está indo para o botão ou toolbar, não esconder
    if (relatedTarget && (
      relatedTarget.closest('.add-block-button') || 
      relatedTarget.closest('.markdown-toolbar')
    )) {
      return;
    }
    
    // Adicionar um pequeno delay para permitir movimento do mouse para o botão
    setTimeout(() => {
      if (!showToolbar && !isHoveringButton && !isHoveringToolbar) {
        setShowAddButton(false);
        setCurrentLineElement(null);
      }
    }, 300);
  }, [showToolbar, isHoveringButton, isHoveringToolbar]);

  // Função adicional para detectar mouse deixando a área estendida
  const handleContainerMouseLeave = useCallback((e) => {
    // Se o toolbar está aberto, não esconder nada
    if (showToolbar) return;
    
    const relatedTarget = e.relatedTarget;
    
    // Se o mouse está indo para o botão ou toolbar, não esconder
    if (relatedTarget && (
      relatedTarget.closest('.add-block-button') || 
      relatedTarget.closest('.markdown-toolbar')
    )) {
      return;
    }
    
    // Delay menor para a área estendida
    setTimeout(() => {
      if (!showToolbar && !isHoveringButton && !isHoveringToolbar) {
        setShowAddButton(false);
        setCurrentLineElement(null);
      }
    }, 200);
  }, [showToolbar, isHoveringButton, isHoveringToolbar]);

  // Função para mostrar o toolbar
  const handleAddButtonClick = useCallback(() => {
    if (!currentLineElement) return;
    
    const lineRect = currentLineElement.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    
    setToolbarPosition({
      top: lineRect.top - editorRect.top,
      left: 40
    });
    setShowToolbar(true);
  }, [currentLineElement]);

  // Função para fechar o toolbar
  const handleCloseToolbar = useCallback(() => {
    setShowToolbar(false);
    setShowAddButton(false);
    setCurrentLineElement(null);
    setIsHoveringButton(false);
    setIsHoveringToolbar(false);
  }, []);

  // Handlers para manter visibilidade durante hover
  const handleButtonMouseEnter = useCallback(() => {
    setIsHoveringButton(true);
  }, []);

  const handleButtonMouseLeave = useCallback(() => {
    setIsHoveringButton(false);
    setTimeout(() => {
      if (!showToolbar && !isHoveringToolbar) {
        setShowAddButton(false);
        setCurrentLineElement(null);
      }
    }, 100);
  }, [showToolbar, isHoveringToolbar]);

  const handleToolbarMouseEnter = useCallback(() => {
    setIsHoveringToolbar(true);
  }, []);

  const handleToolbarMouseLeave = useCallback(() => {
    setIsHoveringToolbar(false);
  }, []);

  // Funções para o SelectionToolbar
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Verificar se a seleção está dentro do editor
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        const editorRect = editorRef.current.getBoundingClientRect();
        
        setSelectionToolbarPosition({
          top: rect.top - editorRect.top - 50, // 50px acima da seleção
          left: rect.left - editorRect.left + (rect.width / 2) - 80 // Centralizado (assumindo toolbar de ~160px)
        });
        setShowSelectionToolbar(true);
      }
    } else {
      // Se não há seleção ou está vazia, esconder o toolbar
      if (!isHoveringSelectionToolbar) {
        setShowSelectionToolbar(false);
      }
    }
  }, [isHoveringSelectionToolbar]);

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

  // Função para transformar o tipo de bloco (compatível com undo/redo)
  const setBlockType = useCallback((type) => {
    if (!currentLineElement || !editorRef.current) return;

    // Salvar a posição do cursor atual
    const selection = window.getSelection();
    let cursorOffset = 0;
    let textNode = null;

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      cursorOffset = range.startOffset;
      textNode = range.startContainer;
    }

    // Determinar a tag de destino
    let tagName;
    switch (type) {
      case 'text':
        tagName = 'p';
        break;
      case 'h1':
        tagName = 'h1';
        break;
      case 'h2':
        tagName = 'h2';
        break;
      case 'h3':
        tagName = 'h3';
        break;
      default:
        handleCloseToolbar();
        return;
    }

    // Focar no editor antes de fazer alterações
    editorRef.current.focus();

    // Usar execCommand formatBlock que é mais estável
    try {
      // Posicionar cursor no elemento antes da transformação
      const range = document.createRange();
      range.selectNodeContents(currentLineElement);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      // Executar o comando
      document.execCommand('formatBlock', false, `<${tagName}>`);
      
    } catch (error) {
      console.warn('Erro na transformação de bloco:', error);
    }

    handleCloseToolbar();
  }, [currentLineElement, handleCloseToolbar]);

  // Função para aplicar formatação na seleção
  const applyTextFormat = useCallback((format) => {
    if (!editorRef.current) return;
    
    // Focar no editor primeiro
    editorRef.current.focus();
    
    // Aplicar formatação
    document.execCommand(format, false, null);
    
    // Manter foco no editor
    editorRef.current.focus();
  }, []);

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

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleTextSelection]);

  // Inicializar conteúdo apenas uma vez
  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = getInitialContent();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  return (
    <div 
      className="h-full"
      style={{ 
        backgroundColor: '#121212'
      }}
    >
      {/* Estilos CSS similares ao NewsEditorPage */}
      <style>{`
        .prose h1 { 
          font-size: 2.25rem; 
          font-weight: 700; 
          color: #E0E0E0; 
          margin: 1.5rem 0 1rem 0; 
          line-height: 1.2;
          font-family: Inter;
        }
        .prose h2 { 
          font-size: 1.875rem; 
          font-weight: 600; 
          color: #E0E0E0; 
          margin: 1.25rem 0 0.75rem 0; 
          line-height: 1.3;
          font-family: Inter;
        }
        .prose h3 { 
          font-size: 1.5rem; 
          font-weight: 600; 
          color: #E0E0E0; 
          margin: 1rem 0 0.5rem 0; 
          line-height: 1.4;
          font-family: Inter;
        }
        .prose p { 
          margin: 0.75rem 0; 
          color: #E0E0E0; 
          line-height: 1.7;
          font-family: Inter;
          font-size: 14px;
        }
        .prose strong, .prose b { 
          color: #E0E0E0; 
          font-weight: 600; 
        }
        .prose em, .prose i { 
          color: #E0E0E0; 
          font-style: italic; 
        }
        /* Melhorar área de hover para botões */
        .add-block-button {
          pointer-events: auto;
        }
        .markdown-toolbar {
          pointer-events: auto;
        }
        
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
        className="p-6 border-b flex items-center gap-3"
        style={{ 
          borderColor: '#333333'
        }}
      >
        <CheckSquare 
          size={24} 
          style={{ color: '#2BB24C' }}
        />
        <h1 
          className="font-bold"
          style={{ 
            fontSize: '24px',
            fontWeight: '700',
            color: '#E0E0E0',
            fontFamily: 'Inter'
          }}
        >
          Estruturação - notícia 'x'
        </h1>
      </div>
      
      {/* Área de Conteúdo */}
      <div className="p-6">
        <div className="relative">
          {/* Container estendido para capturar hover à esquerda */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              left: '-80px', // Estende 80px para a esquerda
              pointerEvents: 'auto',
            }}
            onMouseMove={handleEditorMouseMove}
            onMouseLeave={handleContainerMouseLeave}
          />
          
          {/* Editor contentEditable */}
          <div
            ref={editorRef}
            contentEditable={true}
            suppressContentEditableWarning={true}
            className="prose prose-invert max-w-none w-full text-lg leading-relaxed relative z-10 focus:outline-none"
            onMouseMove={handleEditorMouseMove}
            onMouseLeave={handleEditorMouseLeave}
            style={{ 
              minHeight: '500px',
              fontFamily: 'Inter',
              '--tw-prose-headings': '#E0E0E0',
              '--tw-prose-body': '#E0E0E0',
              '--tw-prose-bold': '#E0E0E0',
              '--tw-prose-links': '#2BB24C',
            }}
          />
          
          {/* Botão Add (+) */}
          {showAddButton && (
            <button
              onClick={handleAddButtonClick}
              onMouseEnter={handleButtonMouseEnter}
              onMouseLeave={handleButtonMouseLeave}
              className="add-block-button absolute pointer-events-auto transition-all duration-200 hover:scale-110"
              style={{
                top: addButtonPosition.top,
                left: addButtonPosition.left,
                backgroundColor: '#1E1E1E',
                border: '1px solid #333333',
                borderRadius: '6px',
                padding: '6px',
                color: '#A0A0A0',
                zIndex: 20
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          )}
          
          {/* Toolbar de Tipos de Bloco */}
          {showToolbar && (
            <div
              onMouseEnter={handleToolbarMouseEnter}
              onMouseLeave={handleToolbarMouseLeave}
              className="markdown-toolbar absolute z-30 flex gap-1 p-2 rounded-lg border shadow-lg"
              style={{
                top: toolbarPosition.top,
                left: toolbarPosition.left,
                backgroundColor: '#1E1E1E',
                borderColor: '#333333',
                boxShadow: 'rgba(0,0,0,0.3) 0px 4px 12px'
              }}
            >
              <button
                onClick={() => setBlockType('text')}
                className="flex items-center gap-2 p-2 rounded transition-colors"
                style={{ color: '#A0A0A0', fontFamily: 'Inter', fontSize: '14px' }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2BB24C33';
                  e.target.style.color = '#2BB24C';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#A0A0A0';
                }}
              >
                <Type size={14} />
                Texto
              </button>
              
              <button
                onClick={() => setBlockType('h1')}
                className="flex items-center gap-2 p-2 rounded transition-colors"
                style={{ color: '#A0A0A0', fontFamily: 'Inter', fontSize: '14px' }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2BB24C33';
                  e.target.style.color = '#2BB24C';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#A0A0A0';
                }}
              >
                <Heading1 size={14} />
                H1
              </button>
              
              <button
                onClick={() => setBlockType('h2')}
                className="flex items-center gap-2 p-2 rounded transition-colors"
                style={{ color: '#A0A0A0', fontFamily: 'Inter', fontSize: '14px' }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2BB24C33';
                  e.target.style.color = '#2BB24C';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#A0A0A0';
                }}
              >
                <Heading2 size={14} />
                H2
              </button>
              
              <button
                onClick={() => setBlockType('h3')}
                className="flex items-center gap-2 p-2 rounded transition-colors"
                style={{ color: '#A0A0A0', fontFamily: 'Inter', fontSize: '14px' }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2BB24C33';
                  e.target.style.color = '#2BB24C';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#A0A0A0';
                }}
              >
                <Heading3 size={14} />
                H3
              </button>
              
              <button
                onClick={handleCloseToolbar}
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