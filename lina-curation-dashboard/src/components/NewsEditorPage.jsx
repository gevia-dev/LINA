import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchNewsById, updateNewsText } from '../services/dataService';
import { ArrowLeft } from 'lucide-react';
import { marked } from 'marked';
import AddBlockButton from '../components/AddBlockButton';
import MarkdownToolbar from '../components/MarkdownToolbar';
import SelectionToolbar from '../components/SelectionToolbar';

const NewsEditorPage = () => {
  const { newsId } = useParams();
  const navigate = useNavigate();
  
  const [news, setNews] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // Estados para o sistema de toolbar
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

  const editorRef = useRef(null);

  // Configurar marked para um renderização mais limpa
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Função para converter markdown para HTML
  const convertMarkdownToHtml = (markdownText) => {
    if (!markdownText) return 'Clique aqui para começar a editar...';
    try {
      return marked(markdownText);
    } catch (error) {
      console.error('Erro ao converter markdown:', error);
      return markdownText; // Retorna o texto original se houver erro
    }
  };

  // Função para converter HTML de volta para markdown (melhorada)
  const convertHtmlToMarkdown = (htmlContent) => {
    if (!htmlContent) return '';
    
    // Remove elementos de toolbar que possam ter sido inseridos
    let cleanHtml = htmlContent
      .replace(/<span class="notion-add-btn-wrapper"[^>]*>.*?<\/span>/gi, '')
      .replace(/<div class="notion-add-menu-popup"[^>]*>.*?<\/div>/gi, '');
    
    // Conversão de HTML para markdown
    let markdown = cleanHtml
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
      .replace(/\n{3,}/g, '\n\n'); // Remove múltiplas quebras de linha
    
    return markdown.trim();
  };

  // Função para detectar hover sobre linhas e mostrar botão +
  const handleEditorMouseMove = useCallback((e) => {
    if (!editorRef.current || showToolbar || isReadOnly) return;

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
  }, [showToolbar, isReadOnly]);

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
    if (isReadOnly) return; // Não mostrar toolbar de seleção em modo somente leitura
    
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
  }, [isHoveringSelectionToolbar, isReadOnly]);

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

    // Garantir que o editor tenha foco
    editorRef.current.focus();

    // Salvar posição do cursor
    const selection = window.getSelection();
    const cursorOffset = selection.rangeCount > 0 ? 
      selection.getRangeAt(0).startOffset : 0;

    // Selecionar todo o elemento atual
    const range = document.createRange();
    range.selectNode(currentLineElement);
    selection.removeAllRanges();
    selection.addRange(range);

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

    // Método que preserva o histórico de undo
    try {
      // Primeira tentativa: formatBlock (padrão e compatível com undo)
      const success = document.execCommand('formatBlock', false, `<${tagName}>`);
      
      if (!success) {
        // Segunda tentativa: insertHTML (também preserva undo)
        const currentText = currentLineElement.textContent || '';
        const newHTML = `<${tagName}>${currentText}</${tagName}>`;
        document.execCommand('insertHTML', false, newHTML);
      }
    } catch (error) {
      console.warn('Fallback para método manual:', error);
      
      // Fallback: método manual mais compatível
      const currentText = currentLineElement.textContent || '';
      const newHTML = `<${tagName}>${currentText}</${tagName}>`;
      
      // Inserir e remover para manter o histórico
      document.execCommand('insertHTML', false, newHTML);
    }

    // Restaurar cursor na posição aproximada
    setTimeout(() => {
      try {
        const newElement = editorRef.current.querySelector(`${tagName}:last-of-type`) ||
                          editorRef.current.querySelector(tagName);
        
        if (newElement && newElement.firstChild) {
          const newRange = document.createRange();
          const newSelection = window.getSelection();
          
          // Tentar posicionar o cursor na posição original
          const textNode = newElement.firstChild;
          const maxOffset = textNode.textContent ? textNode.textContent.length : 0;
          const targetOffset = Math.min(cursorOffset, maxOffset);
          
          newRange.setStart(textNode, targetOffset);
          newRange.collapse(true);
          newSelection.removeAllRanges();
          newSelection.addRange(newRange);
        }
      } catch (e) {
        // Se falhar, apenas posicionar no final
        const newElement = editorRef.current.querySelector(`${tagName}:last-of-type`);
        if (newElement) {
          const finalRange = document.createRange();
          finalRange.selectNodeContents(newElement);
          finalRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(finalRange);
        }
      }
    }, 50);

    handleCloseToolbar();
  }, [currentLineElement, handleCloseToolbar]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const currentHtmlContent = editorRef.current.innerHTML;
      const markdownContent = convertHtmlToMarkdown(currentHtmlContent);
      await updateNewsText(newsId, markdownContent);
      setContent(currentHtmlContent); // Atualiza o state após salvar
      setMessage('Salvo com sucesso!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }, [newsId]);

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      try {
        const data = await fetchNewsById(newsId);
        setNews(data);
        const htmlContent = convertMarkdownToHtml(data.texto_final);
        setContent(htmlContent);
        // Verificar se a notícia está marcada como concluída
        setIsReadOnly(data.isDone === true);
      } catch (err) {
        setError('Falha ao carregar a notícia.');
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, [newsId]);

  // Event listeners para detectar seleção de texto
  useEffect(() => {
    // Não adicionar event listeners se estiver em modo somente leitura
    if (isReadOnly) return;
    
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
  }, [handleTextSelection, isReadOnly]);

  // Adicionar suporte para atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Só permitir atalhos se não estiver em modo somente leitura
      if (isReadOnly) return;
      
      // Ctrl/Cmd + S para salvar
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, isReadOnly]);

  if (loading) return <div className="text-center py-20 text-white">Carregando editor...</div>;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;

  return (
    <div className="w-full min-h-screen bg-black text-text-primary p-4 sm:p-8 flex flex-col items-center">
      <style>{`
        .prose h1 { 
          font-size: 2.25rem; 
          font-weight: 700; 
          color: #ffffff; 
          margin: 1.5rem 0 1rem 0; 
          line-height: 1.2;
        }
        .prose h2 { 
          font-size: 1.875rem; 
          font-weight: 600; 
          color: #ffffff; 
          margin: 1.25rem 0 0.75rem 0; 
          line-height: 1.3;
        }
        .prose h3 { 
          font-size: 1.5rem; 
          font-weight: 600; 
          color: #ffffff; 
          margin: 1rem 0 0.5rem 0; 
          line-height: 1.4;
        }
        .prose p { 
          margin: 0.75rem 0; 
          color: #d1d5db; 
          line-height: 1.7;
        }
        .prose strong, .prose b { 
          color: #ffffff; 
          font-weight: 600; 
        }
        .prose em, .prose i { 
          color: #d1d5db; 
          font-style: italic; 
        }
        .prose ul, .prose ol { 
          margin: 1rem 0; 
          padding-left: 1.5rem; 
        }
        .prose li { 
          margin: 0.25rem 0; 
          color: #d1d5db; 
        }
        /* Melhorar área de hover para botões */
        .add-block-button {
          pointer-events: auto;
        }
        
        /* Estilos para formatação de texto */
        .prose u { 
          color: #d1d5db; 
          text-decoration: underline; 
        }
        .prose s, .prose del { 
          color: #d1d5db; 
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
      <div className="w-full max-w-4xl mx-auto">
        <header className="header-standard flex items-center justify-between">
          <button onClick={() => navigate(isReadOnly ? '/concluded-news' : '/outputs')} className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors">
            <ArrowLeft size={16} />
            {isReadOnly ? 'Voltar para Notícias Concluídas' : 'Voltar para Notícias'}
          </button>
          <div className="flex items-center gap-4">
            {isReadOnly && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
                Modo Somente Leitura
              </div>
            )}
            {message && <span className="text-green-400 text-sm">{message}</span>}
            {!isReadOnly && (
              <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 rounded-md bg-white text-black font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50">
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        </header>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 border-b border-border-default pb-4">
          {news.title}
        </h1>
        {isReadOnly && (
          <div className="mb-6 p-4 rounded-lg border border-yellow-400/30 bg-yellow-400/10">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">Notícia Concluída</span>
            </div>
            <p className="text-text-secondary text-sm mt-1">
              Esta notícia já foi marcada como concluída e está em modo somente leitura. Não é possível fazer edições.
            </p>
          </div>
        )}
        <div className="relative">
          {/* Container estendido para capturar hover à esquerda */}
          {!isReadOnly && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                left: '-80px', // Estende 80px para a esquerda
                pointerEvents: 'auto',
              }}
              onMouseMove={handleEditorMouseMove}
              onMouseLeave={handleContainerMouseLeave}
            />
          )}
          
          <div
            ref={editorRef}
            contentEditable={!isReadOnly}
            suppressContentEditableWarning={true}
            className={`prose prose-invert max-w-none w-full text-lg text-gray-300 leading-relaxed relative z-10 ${
              !isReadOnly ? 'focus:outline-none' : 'cursor-default'
            } ${isReadOnly ? 'opacity-90' : ''}`}
            dangerouslySetInnerHTML={{ __html: content }}
            onMouseMove={!isReadOnly ? handleEditorMouseMove : undefined}
            onMouseLeave={!isReadOnly ? handleEditorMouseLeave : undefined}
            style={{ 
              minHeight: '60vh',
              '--tw-prose-headings': '#ffffff',
              '--tw-prose-body': '#d1d5db',
              '--tw-prose-bold': '#ffffff',
              '--tw-prose-links': '#60a5fa',
            }}
          />
          
          {!isReadOnly && (
            <>
              <AddBlockButton
                position={addButtonPosition}
                isVisible={showAddButton}
                onClick={handleAddButtonClick}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              />
              
              <MarkdownToolbar
                position={toolbarPosition}
                isVisible={showToolbar}
                onSelectOption={setBlockType}
                onClose={handleCloseToolbar}
                onMouseEnter={handleToolbarMouseEnter}
                onMouseLeave={handleToolbarMouseLeave}
              />
              
              <SelectionToolbar
                position={selectionToolbarPosition}
                isVisible={showSelectionToolbar}
                onClose={handleCloseSelectionToolbar}
                onMouseEnter={handleSelectionToolbarMouseEnter}
                onMouseLeave={handleSelectionToolbarMouseLeave}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsEditorPage; 