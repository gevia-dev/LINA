import React, { useCallback, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from '@xyflow/react';
import { Bold, Italic, Underline, Edit3, Trash2, Link, List, Hash, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';

/**
 * AdvancedCardNode - Versão avançada do CardNode com funcionalidades aprimoradas:
 * - Animações suaves com framer-motion
 * - Prevenção de conflitos de eventos
 * - Indicadores visuais de estado
 * - Gestão avançada de interações
 * - Suporte especial para nodes "micro-dado":
 *   * Tamanho compacto (250px vs 350px de largura)
 *   * Sem handles de entrada (apenas saída na direita)
 *   * Indicador visual com ícone de banco de dados
 *   * Fonte e padding reduzidos
 *   * Botão "Ler mais" adaptado para tamanho menor
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
    animation,
    coreKey
  } = data;
  
  // Detectar se é um node "micro-dado" baseado no coreKey
  const isMicroDado = coreKey?.startsWith('micro_');
  
  const editableRef = useRef(null);
  const nodeRef = useRef(null);
  
  // DEBUG: Log das props recebidas
  console.log({
    id, 
    title, 
    content, 
    contentType: typeof content,
    hasContent,
    data: data 
  });
  
  // Estados locais para interações
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [isHoveringToolbar, setIsHoveringToolbar] = useState(false);
  const [rawContent, setRawContent] = useState(content || '');
  const [parsedContent, setParsedContent] = useState('');
  
  // Estados para expansão de conteúdo
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const previewContentRef = useRef(null);
  
  // Estados para menu de contexto
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Ref para calcular tamanhos dos menus
  const toolbarRef = useRef(null);
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

  // Função para calcular posição da toolbar de formatação
  const calculateToolbarPosition = useCallback((selectionRect) => {
    const toolbarSize = { width: 280, height: 50 }; // Tamanho aproximado da toolbar
    const offset = { x: -140, y: -60 }; // Centralizar toolbar acima da seleção
    
    return calculateMenuPosition(selectionRect, toolbarSize, offset);
  }, [calculateMenuPosition]);

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

  // Função simplificada para alternar modo de edição
  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Sair do modo de edição
      if (onEditEnd) {
        onEditEnd();
      }
    } else {
      // Entrar no modo de edição
      if (onEdit) {
      onEdit(id);
      }
      if (onEditStart) {
        onEditStart(id);
      }
      
      // Focar no elemento editável após um pequeno delay
      setTimeout(() => {
        if (editableRef.current) {
          editableRef.current.focus();
        }
      }, 100);
    }
  }, [id, onEdit, onEditStart, onEditEnd, isEditing]);

  // Função para alternar expansão de conteúdo
  const handleExpand = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Função para parsing markdown em tempo real
  const parseMarkdown = useCallback((text) => {
    
    try {
      // Garantir que text é uma string
      if (typeof text !== 'string') {
        return String(text || '').replace(/\n/g, '<br>');
      }
      
      // Configurar marked para renderização inline
      const renderer = new marked.Renderer();
      
      // Personalizar renderização de headers
      renderer.heading = (text, level) => {
        const sizes = {
          1: 'text-2xl font-bold',
          2: 'text-xl font-semibold', 
          3: 'text-lg font-medium'
        };
        return `<h${level} class="${sizes[level] || 'text-base'} mb-2 mt-4">${text}</h${level}>`;
      };
      
      // Personalizar renderização de parágrafos
      renderer.paragraph = (text) => {
        return `<p class="mb-2 leading-relaxed">${text}</p>`;
      };
      
      // Personalizar renderização de listas
      renderer.list = (body, ordered) => {
        const tag = ordered ? 'ol' : 'ul';
        return `<${tag} class="mb-2 ml-4 ${ordered ? 'list-decimal' : 'list-disc'}">${body}</${tag}>`;
      };
      
      // Configurar marked
      marked.setOptions({
        renderer,
        breaks: true,
        gfm: true
      });
      
      const result = marked.parse(text);

      return result;
    } catch (error) {
      const fallback = String(text || '').replace(/\n/g, '<br>');

      return fallback;
    }
  }, []);

  // Função para lidar com double-click (abrir modal)
  const handleDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Não abrir modal durante edição
    if (isEditing) return;
    
    // Verificar se é um node de estrutura ou microdado
    const isEstruturaNode = data.nodeType === 'estrutura';
    const isMicroDadoNode = data.coreKey?.startsWith('micro_');
    
    if (isEstruturaNode || isMicroDadoNode) {
      // Preparar dados para o modal
      const modalData = {
        content: data.content || '',
        type: isEstruturaNode ? 'estrutura' : 'micro',
        nodeType: data.nodeType,
        coreKey: data.coreKey,
        itemId: id,
        title: data.title || (isEstruturaNode ? 'Estrutura' : 'Micro-dado')
      };
      
      // Chamar função para abrir modal (será passada via props)
      if (data.onOpenModal) {
        data.onOpenModal(modalData);
      }
    }
  }, [isEditing, data, id]);

  // Função para lidar com clique direito (menu de contexto)
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Não mostrar menu durante edição
    if (isEditing) return;
    
    // Calcular posição inteligente baseada no clique
    const position = calculateContextMenuPosition(e);
    setContextMenuPosition(position);
    setShowContextMenu(true);
  }, [isEditing, calculateContextMenuPosition]);

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



  // Função para lidar com mudanças no conteúdo durante edição
  const handleContentChange = useCallback((e) => {
    const newContent = e.target.textContent || '';
    setRawContent(newContent);
    
    // Parse markdown em tempo real para preview
    if (!isEditing) {
      const parsed = parseMarkdown(newContent);
      setParsedContent(parsed);
    }
  }, [isEditing, parseMarkdown]);

  // Função para detectar padrões markdown durante digitação
  const handleKeyDown = useCallback((e) => {
    if (!isEditing) return;
    
    // Atalho Enter para sair da edição
    if (e.key === 'Escape') {
      e.preventDefault();
      handleEditToggle();
      return;
    }
    
    // Detectar padrões markdown
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textBefore = range.startContainer.textContent?.substring(0, range.startOffset) || '';
      
      // Detectar headers (# ## ###)
      if (e.key === ' ' && /^#{1,3}$/.test(textBefore.trim())) {
        e.preventDefault();
        const headerLevel = textBefore.trim().length;
        const headerTag = `h${headerLevel}`;
        
        // Substituir # por tag de header
        range.startContainer.textContent = range.startContainer.textContent?.replace(/^#{1,3}/, '') || '';
        
        // Aplicar formatação de header
        document.execCommand('formatBlock', false, headerTag);
      }
      
      // Detectar bold (**texto**)
      if (e.key === '*' && textBefore.endsWith('*')) {
        const doubleAsterisk = textBefore.endsWith('**');
        if (doubleAsterisk) {
          e.preventDefault();
          document.execCommand('bold', false, null);
        }
      }
    }
  }, [isEditing, handleEditToggle]);

  // Função para aplicar formatação na seleção
  const applyTextFormat = useCallback((format, value = null) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    try {
      // Para comandos que requerem valores (como formatBlock e createLink)
      if (value !== null) {
        document.execCommand(format, false, value);
      } else {
        // Para comandos simples (bold, italic, etc)
        if (selection.isCollapsed && format !== 'formatBlock') return;
      document.execCommand(format, false, null);
      }
      
      // Restaurar foco no elemento editável
      if (editableRef.current) {
        editableRef.current.focus();
      }
      
      // Atualizar conteúdo após formatação
      setTimeout(() => {
        if (editableRef.current) {
          const newContent = editableRef.current.textContent || '';
          setRawContent(newContent);
        }
      }, 10);
      
      // Não fechar o tooltip imediatamente - deixar o usuário continuar formatando
      // setShowToolbar(false);
    } catch (error) {
      // Erro na formatação de texto
    }
  }, []);

  // Effect para detectar se o texto está sendo truncado
  useEffect(() => {
    if (previewContentRef.current && content && !isExpanded && !isEditing) {
      const element = previewContentRef.current;
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        setIsTextTruncated(element.scrollHeight > element.clientHeight);
      }, 100);
    }
  }, [content, isExpanded, isEditing]);

  // Effect para inicializar conteúdo markdown
  useEffect(() => {
    
    if (content !== undefined && content !== rawContent) {

      setRawContent(content || '');
      if (!isEditing) {
        const parsed = parseMarkdown(content || '');

        setParsedContent(parsed);
      }
    }
  }, [content, isEditing, parseMarkdown]);

  // Effect para focar no editor quando entrar em modo de edição
  useEffect(() => {
    if (isEditing && editableRef.current) {
      // Definir conteúdo inicial se necessário
      if (editableRef.current.textContent !== rawContent) {
        editableRef.current.textContent = rawContent;
      }
      
      // Focar no final do conteúdo
      setTimeout(() => {
        if (editableRef.current) {
          editableRef.current.focus();
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(editableRef.current);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }, 100);
    }
  }, [isEditing, rawContent]);

  // Event listeners para detectar seleção de texto
  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      
      if (!isEditing) {
        setShowToolbar(false);
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
          // Calcular posição inteligente da toolbar
          const position = calculateToolbarPosition(rect);
          setToolbarPosition(position);
          setShowToolbar(true);
        } else {
          setShowToolbar(false);
        }
      } else {
        // Só fechar se não estiver hover na toolbar e não estiver editando
        if (!isHoveringToolbar && !isEditing) {
          setShowToolbar(false);
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
  }, [isEditing, isHoveringToolbar]);

  // Detectar fim da edição quando clica fora
  useEffect(() => {
    const handleBlur = (e) => {
      if (isEditing && !nodeRef.current?.contains(e.target)) {
        // Verificar se o clique foi em elementos do sistema de edição
        const isFormattingToolbar = e.target.closest('.formatting-toolbar');
        const isContextMenu = e.target.closest('.context-menu');
        const isEditableContent = e.target.closest('.editable-content');
        
        // Não fechar se clicou em elementos do sistema de edição
        if (isFormattingToolbar || isContextMenu || isEditableContent) {
          return;
        }
        
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

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Atalho Enter para entrar em modo de edição (apenas se selecionado)
      if (e.key === 'Enter' && selected && !isEditing) {
        e.preventDefault();
        handleEditToggle();
        return;
      }
      
      // Atalho Delete para remover node selecionado
      if (e.key === 'Delete' && selected && !isEditing) {
        e.preventDefault();
        if (data.onRemove) {
          data.onRemove(id);
        }
        return;
      }
      
      // Atalho Escape para sair do modo de edição
      if (e.key === 'Escape' && isEditing) {
        e.preventDefault();
        handleEditToggle();
        return;
      }
      
      // Atalhos de formatação durante edição
      if (isEditing && (e.ctrlKey || e.metaKey)) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            applyTextFormat('bold');
            break;
          case 'i':
            e.preventDefault();
            applyTextFormat('italic');
            break;
          case 'u':
            e.preventDefault();
            applyTextFormat('underline');
            break;
          default:
            break;
        }
      }
    };

    // Adicionar listener apenas se este node está selecionado ou editando
    if (selected || isEditing) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selected, isEditing, handleEditToggle, data.onRemove, id, applyTextFormat]);

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
        width: isMicroDado ? '250px' : '350px', // Mais largo para micro-dados (era 175px)
        minHeight: isMicroDado ? '60px' : (minHeight || '120px'), // 50% menor para micro-dados
        backgroundColor: 'var(--bg-secondary)',
        border: isEditing 
          ? '2px solid var(--primary-green)' 
          : '1px solid var(--border-primary)',
        borderRadius: '12px',
        padding: isMicroDado ? '8px' : '16px', // Padding reduzido para micro-dados
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default'
      }}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
            {/* Botão de edição explícito - Posicionado na direita */}
      <motion.button
        className={`absolute ${isMicroDado ? 'top-2 right-2 p-1' : 'top-3 right-3 p-2'} rounded-lg opacity-70 hover:opacity-100 transition-all duration-200 nopan nowheel nodrag`}
        style={{
          backgroundColor: isEditing ? 'var(--primary-green)' : 'var(--bg-primary)',
          color: isEditing ? 'white' : 'var(--text-secondary)',
          border: '1px solid var(--border-primary)',
          zIndex: 20
        }}
        onClick={handleEditToggle}
        whileHover={{ 
          /* Efeito de hover removido */
        }}
        whileTap={{ scale: 0.95 }}
        title={isEditing ? 'Finalizar edição (Esc)' : 'Editar bloco (Enter)'}
      >
        <Edit3 size={isMicroDado ? 10 : 14} />
      </motion.button>



      {/* Header do bloco */}
      <div className="flex justify-between items-center mb-3 relative z-10">
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
          {isEditing && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Edit3 size={isMicroDado ? 12 : 14} style={{ color: 'var(--primary-green)' }} />
            </motion.div>
          )}
        </motion.h3>
        

      </div>
      
      {/* Conteúdo do bloco */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {isEditing ? (
          <div
        ref={editableRef}
            className="editable-content nopan nowheel nodrag"
            contentEditable={true}
        suppressContentEditableWarning={true}
                    style={{
              fontSize: isMicroDado ? '12px' : '15px',
              color: 'var(--text-primary)',
              fontFamily: "'Nunito Sans', 'Inter', sans-serif",
              lineHeight: '1.7',
              minHeight: isMicroDado ? '30px' : '60px',
              outline: 'none',
              padding: isMicroDado ? '6px' : '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              whiteSpace: 'pre-wrap'
            }}
            onInput={handleContentChange}
            onKeyDown={handleKeyDown}
          >
            {rawContent}
          </div>
        ) : (
          <>
            <div
              ref={previewContentRef}
              className="markdown-preview"
              style={{
                fontSize: isMicroDado ? '12px' : '15px',
                color: 'var(--text-primary)',
                fontFamily: "'Nunito Sans', 'Inter', sans-serif",
                lineHeight: '1.7',
                minHeight: isMicroDado ? '30px' : '60px',
                padding: isMicroDado ? '6px' : '12px',
                whiteSpace: 'pre-wrap',
                // Lógica de truncamento igual ao FeedItem
                display: isExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: isExpanded ? 'unset' : (isMicroDado ? 2 : 3), // Menos linhas para micro-dados
                WebkitBoxOrient: isExpanded ? 'unset' : 'vertical',
                overflow: isExpanded ? 'visible' : 'hidden',
                textOverflow: isExpanded ? 'unset' : 'ellipsis'
              }}
            >
              {/* Renderização segura do conteúdo */}
              {(() => {
                const safeContent = String(content || '');
                
                // Detectar se é um node de estrutura e mostrar radio buttons
                const isEstruturaNode = data.nodeType === 'estrutura' || data.coreKey === 'micro_estrutura';
                
                if (isEstruturaNode) {
                  // Definir as opções de estrutura
                  const structureOptions = [
                    {
                      titulo: "Continua",
                      estrutura: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio."
                    },
                    {
                      titulo: "Paragrafos",
                      estrutura: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nCurabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum sem, nec luctus est odio sed risus."
                    },
                    {
                      titulo: "Topicos",
                      estrutura: "## Topico 1\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n## Topico 2\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\n## Topico 3\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
                    }
                  ];
                  
                  // Encontrar qual estrutura está selecionada baseado no conteúdo
                  const selectedStructure = structureOptions.find(option => 
                    safeContent.trim() === option.estrutura.trim()
                  );
                  
                  // Se não encontrou correspondência exata, verificar se contém o conteúdo de alguma estrutura
                  const partialMatch = structureOptions.find(option => 
                    safeContent.includes(option.estrutura.substring(0, 50))
                  );
                  
                  const currentStructure = selectedStructure || partialMatch || structureOptions[0];
                  
                  // Função para trocar estrutura
                  const handleStructureChange = (structure) => {

                    // Atualizar o conteúdo local imediatamente
                    setRawContent(structure.estrutura);
                    // Chamar função de atualização se disponível
                    if (data.onUpdateContent) {
                      data.onUpdateContent(id, structure.estrutura);
                    }
                  };
                  
                  return (
                    <div className="space-y-2">
                      <div 
                        className="text-sm font-medium mb-2"
                        style={{ 
                          color: 'var(--text-secondary)',
                          fontFamily: '"Nunito Sans", "Inter", sans-serif'
                        }}
                      >
                        📋 Estrutura
                      </div>
                      <div className="space-y-1">
                        {structureOptions.map((option) => {
                          const isSelected = currentStructure.titulo === option.titulo;
                          return (
                            <motion.label
                              key={option.titulo}
                              className="flex items-center gap-2 nopan nowheel nodrag"
                              style={{ cursor: 'pointer !important' }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStructureChange(option);
                              }}
                            >
                              <div
                                className="w-3 h-3 rounded-full border-2 flex items-center justify-center"
                                style={{
                                  borderColor: isSelected ? '#F5A623' : 'var(--border-primary)',
                                  backgroundColor: isSelected ? '#F5A623' : 'transparent'
                                }}
                              >
                                {isSelected && (
                                  <motion.div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: 'white' }}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                  />
                                )}
                              </div>
                              <span
                                className="text-xs"
                                style={{
                                  color: isSelected ? '#F5A623' : 'var(--text-secondary)',
                                  fontFamily: '"Nunito Sans", "Inter", sans-serif',
                                  fontWeight: isSelected ? '600' : '400'
                                }}
                              >
                                {option.titulo}
                              </span>
                            </motion.label>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                

                
                return safeContent;
              })()}
            </div>
            
            {/* Botão Ler mais (quando truncado e não expandido) */}
            {isTextTruncated && !isExpanded && (
              <motion.button
                onClick={handleExpand}
                className="nopan nowheel nodrag"
                whileHover={{ /* Efeito de hover removido */ }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-green)',
                  cursor: 'pointer',
                  padding: isMicroDado ? '2px 6px' : '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMicroDado ? '2px' : '4px',
                  borderRadius: '4px',
                  fontSize: isMicroDado ? '10px' : '12px',
                  fontWeight: '500',
                  marginTop: isMicroDado ? '4px' : '8px',
                  alignSelf: 'flex-start',
                  transition: 'all 0.2s ease'
                }}
              >
                <ChevronDown size={isMicroDado ? 10 : 12} />
                Ler mais
              </motion.button>
            )}
            
            {/* Botão Ler menos (quando expandido) */}
            {isExpanded && (
              <motion.button
                onClick={handleExpand}
                className="nopan nowheel nodrag"
                whileHover={{ /* Efeito de hover removido */ }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-green)',
                  cursor: 'pointer',
                  padding: isMicroDado ? '2px 6px' : '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMicroDado ? '2px' : '4px',
                  borderRadius: '4px',
                  fontSize: isMicroDado ? '10px' : '12px',
                  fontWeight: '500',
                  marginTop: isMicroDado ? '4px' : '8px',
                  alignSelf: 'flex-start',
                  transition: 'all 0.2s ease'
                }}
              >
                <ChevronUp size={isMicroDado ? 10 : 12} />
                Ler menos
              </motion.button>
            )}
          </>
        )}
        
        {/* Dica de markdown quando editando */}
        {isEditing && (
          <motion.div
            className="absolute bottom-2 left-2 text-xs opacity-60"
            style={{ 
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontFamily: "'Nunito Sans', 'Inter', sans-serif"
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.5 }}
          >
            Use: # Header, **bold**, *italic*, Esc para sair
          </motion.div>
        )}
      </motion.div>
      


      {/* Toolbar de Formatação Notion-like - Renderizada via Portal */}
      {showToolbar && createPortal(
      <AnimatePresence>
          <motion.div
            ref={toolbarRef}
            onMouseEnter={() => setIsHoveringToolbar(true)}
            onMouseLeave={() => setIsHoveringToolbar(false)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="formatting-toolbar fixed z-[9999] flex gap-1 p-2 rounded-lg border shadow-lg"
            style={{
              left: toolbarPosition.x,
              top: toolbarPosition.y,
              backgroundColor: '#1E1E1E',
              borderColor: '#333333',
              boxShadow: 'rgba(0,0,0,0.4) 0px 12px 28px',
              pointerEvents: 'auto'
            }}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Formatação básica */}
            {[
              { format: 'bold', icon: Bold, label: 'Negrito (Ctrl+B)' },
              { format: 'italic', icon: Italic, label: 'Itálico (Ctrl+I)' },
              { format: 'underline', icon: Underline, label: 'Sublinhado (Ctrl+U)' }
            ].map(({ format, icon: Icon, label }) => (
              <motion.button
                key={format}
                onClick={(e) => {
                  e.stopPropagation();
                  applyTextFormat(format);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-2 rounded transition-colors"
                style={{ color: '#A0A0A0' }}
                whileHover={{ 
                  /* Efeito de hover removido */
                }}
                whileTap={{ scale: 0.95 }}
                title={label}
              >
                <Icon size={14} />
              </motion.button>
            ))}
            
            {/* Separador */}
            <div style={{ 
              width: '1px', 
              height: '20px', 
              backgroundColor: '#333333', 
              margin: '6px 4px' 
            }} />
            
            {/* Headers */}
            {[
              { format: 'h1', icon: Hash, label: 'Título 1 (#)' },
              { format: 'h2', icon: Hash, label: 'Título 2 (##)', size: 12 },
              { format: 'h3', icon: Hash, label: 'Título 3 (###)', size: 10 }
            ].map(({ format, icon: Icon, label, size = 14 }) => (
              <motion.button
                key={format}
                onClick={(e) => {
                  e.stopPropagation();
                  applyTextFormat('formatBlock', format);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-2 rounded transition-colors"
                style={{ color: '#A0A0A0' }}
                whileHover={{ 
                  /* Efeito de hover removido */
                }}
                whileTap={{ scale: 0.95 }}
                title={label}
              >
                <Icon size={size} />
              </motion.button>
            ))}
            
            {/* Separador */}
            <div style={{ 
              width: '1px', 
              height: '20px', 
              backgroundColor: '#333333', 
              margin: '6px 4px' 
            }} />
            
            {/* Lista */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                applyTextFormat('insertUnorderedList');
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-2 rounded transition-colors"
              style={{ color: '#A0A0A0' }}
              whileHover={{ 
                /* Efeito de hover removido */
              }}
              whileTap={{ scale: 0.95 }}
              title="Lista com marcadores (-)"
            >
              <List size={14} />
            </motion.button>
            
            {/* Link */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                const url = prompt('Digite a URL:');
                if (url) {
                  applyTextFormat('createLink', url);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-2 rounded transition-colors"
              style={{ color: '#A0A0A0' }}
              whileHover={{ 
                /* Efeito de hover removido */
              }}
              whileTap={{ scale: 0.95 }}
              title="Adicionar link"
            >
              <Link size={14} />
            </motion.button>
            
            {/* Fechar */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setShowToolbar(false);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-2 rounded transition-colors ml-2"
              style={{ color: '#A0A0A0', fontSize: '12px' }}
              whileHover={{ 
                /* Efeito de hover removido */
              }}
              whileTap={{ scale: 0.95 }}
              title="Fechar toolbar"
            >
              ×
            </motion.button>
          </motion.div>
        </AnimatePresence>,
        document.body
        )}

      {/* Handles de conexão do ReactFlow */}
      {/* Para micro-dados: apenas saída, sem entradas */}
      {!isMicroDado && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            id="target"
            style={{
              background: '#2BB24C',
              width: 14,
              height: 14,
              border: '3px solid #1a1a1a',
              cursor: 'crosshair !important',
              opacity: isEditing ? 0.4 : 0.9,
              transition: 'all 0.2s ease',
              transform: 'translateY(-2px)',
              zIndex: 1000,
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(43, 178, 76, 0.4)'
            }}
            className="connection-handle connection-handle-target"
            isConnectable={!isEditing}
            title="Entrada Geral"
          />

          {/* Handles de entrada especializados - Lado esquerdo */}
          <Handle
            type="target"
            position={Position.Left}
            id="dados"
            style={{
              background: '#4A90E2',
              width: 12,
              height: 12,
              border: '2px solid #1a1a1a',
              cursor: 'crosshair !important',
              opacity: isEditing ? 0.4 : 0.8,
              transform: 'translateX(-2px) translateY(-20px)',
              zIndex: 1000,
              borderRadius: '50%',
              boxShadow: '0 2px 6px rgba(74, 144, 226, 0.4)'
            }}
            className="connection-handle connection-handle-dados"
            isConnectable={!isEditing}
            title="Entrada de Dados"
          />
          
          <Handle
            type="target"
            position={Position.Left}
            id="estrutura"
            style={{
              background: '#F5A623',
              width: 12,
              height: 12,
              border: '2px solid #1a1a1a',
              cursor: 'crosshair !important',
              opacity: isEditing ? 0.4 : 0.8,
              transform: 'translateX(-2px) translateY(20px)',
              zIndex: 1000,
              borderRadius: '50%',
              boxShadow: '0 2px 6px rgba(245, 166, 35, 0.4)'
            }}
            className="connection-handle connection-handle-estrutura"
            isConnectable={!isEditing}
            title="Entrada de Estrutura"
          />
        </>
      )}
      
      {/* Handle de saída - sempre presente */}
      <Handle
        type="source"
        position={isMicroDado ? Position.Right : Position.Bottom}
        id="source"
        style={{
          background: '#2BB24C',
          width: isMicroDado ? 10 : 14,
          height: isMicroDado ? 10 : 14,
          border: isMicroDado ? '2px solid #1a1a1a' : '3px solid #1a1a1a',
          cursor: 'crosshair !important',
          opacity: isEditing ? 0.4 : 0.9,
          transition: 'all 0.2s ease',
          transform: isMicroDado ? 'translateX(1px)' : 'translateY(2px)',
          zIndex: 1000,
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(43, 178, 76, 0.4)'
        }}
        className="connection-handle connection-handle-source"
        isConnectable={!isEditing}
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
              whileHover={{ 
                /* Efeito de hover removido */
              }}
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