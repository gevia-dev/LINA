import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Edit, Save, X } from 'lucide-react';
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { toast } from 'react-hot-toast';
import { marked } from 'marked';

// Configura o parser Markdown para respeitar quebras de linha simples e GFM
marked.setOptions({
  gfm: true,
  breaks: true
});

/**
 * Componente comum de editor de texto para Instagram, LinkedIn e Blog
 * Baseado no BlockNote para consistência com o NewsReaderPanel
 */
const CommonTextEditor = ({ 
  content = '', 
  onSave, 
  onCancel,
  isEditing = false,
  onEditToggle,
  platform = 'blog', // 'blog', 'instagram', 'linkedin'
  placeholder = 'Comece a escrever...',
  className = '',
  style = {}
}) => {
  const [localContent, setLocalContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef(null);

  // Função para converter markdown em blocos BlockNote com tipos corretos
  const convertMarkdownToBlocks = useCallback((markdownText) => {
    if (!markdownText) return [{ type: "paragraph", content: placeholder }];
    
    return markdownText.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const trimmedLine = line.trim();
        
        // Detecta headings
        if (trimmedLine.startsWith('###### ')) {
          return { type: "heading", content: trimmedLine.substring(7), props: { level: 6 } };
        } else if (trimmedLine.startsWith('##### ')) {
          return { type: "heading", content: trimmedLine.substring(6), props: { level: 5 } };
        } else if (trimmedLine.startsWith('#### ')) {
          return { type: "heading", content: trimmedLine.substring(5), props: { level: 4 } };
        } else if (trimmedLine.startsWith('### ')) {
          return { type: "heading", content: trimmedLine.substring(4), props: { level: 3 } };
        } else if (trimmedLine.startsWith('## ')) {
          return { type: "heading", content: trimmedLine.substring(3), props: { level: 2 } };
        } else if (trimmedLine.startsWith('# ')) {
          return { type: "heading", content: trimmedLine.substring(2), props: { level: 1 } };
        }
        
        // Detecta listas
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          return { type: "bulletListItem", content: trimmedLine.substring(2) };
        }
        
        if (trimmedLine.match(/^\d+\.\s/)) {
          return { type: "numberedListItem", content: trimmedLine.replace(/^\d+\.\s/, '') };
        }
        
        // Detecta blockquotes
        if (trimmedLine.startsWith('> ')) {
          return { type: "quote", content: trimmedLine.substring(2) };
        }
        
        // Padrão: parágrafo
        return { type: "paragraph", content: trimmedLine };
      });
  }, [placeholder]);

  // Cria o editor BlockNote com configuração básica
  const editor = useCreateBlockNote({
    initialContent: convertMarkdownToBlocks(content)
  });

  // Atualiza o conteúdo local quando o prop content mudar
  useEffect(() => {
    if (content !== localContent) {
      setLocalContent(content);
      // Atualiza o editor com o novo conteúdo
      if (content) {
        editor.replaceBlocks(
          editor.document,
          convertMarkdownToBlocks(content)
        );
      }
    }
  }, [content, editor]);

  // Função para salvar o conteúdo
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      
      // Obtém o conteúdo do editor
      const editorContent = editor.document
        .map(block => block.content?.map(item => item.text).join('') || '')
        .join('\n')
        .trim();
      
      setLocalContent(editorContent);
      
      if (onSave) {
        await onSave(editorContent);
      }
      
      // Fecha o modo de edição
      if (onEditToggle) {
        onEditToggle(false);
      }
      
    } catch (error) {
      console.error('Erro ao salvar conteúdo:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editor, onSave, onEditToggle]);

  // Função para cancelar edição
  const handleCancel = useCallback(() => {
    // Restaura o conteúdo original
    setLocalContent(content);
    
    // Atualiza o editor com o conteúdo original
    if (content) {
      editor.replaceBlocks(
        editor.document,
        convertMarkdownToBlocks(content)
      );
    } else {
      editor.replaceBlocks(
        editor.document,
        [
          {
            type: "paragraph",
            content: placeholder
          }
        ]
      );
    }
    
    // Fecha o modo de edição
    if (onEditToggle) {
      onEditToggle(false);
    }
  }, [content, editor, placeholder, onEditToggle]);

  // Função para iniciar edição
  const handleStartEdit = useCallback(() => {
    if (onEditToggle) {
      onEditToggle(true);
    }
  }, [onEditToggle]);

  // Determina a cor da plataforma
  const getPlatformColor = useCallback(() => {
    switch (platform) {
      case 'instagram':
        return 'var(--instagram-primary, #E4405F)';
      case 'linkedin':
        return 'var(--linkedin-primary, #0077B5)';
      case 'blog':
      default:
        return 'var(--primary-green, #2BB24C)';
    }
  }, [platform]);

  // Determina o nome da plataforma
  const getPlatformName = useCallback(() => {
    switch (platform) {
      case 'instagram':
        return 'Instagram';
      case 'linkedin':
        return 'LinkedIn';
      case 'blog':
      default:
        return 'Blog';
    }
  }, [platform]);

  // Renderiza o modo de visualização
  if (!isEditing) {
    return (
      <div 
        className={`common-text-editor-view ${className}`}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          padding: '40px',
          maxWidth: '800px',
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.3s ease-out',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          ...style
        }}
      >
        {/* Header com título e botão de editar */}
        <div style={{
          color: 'var(--text-primary)',
          fontFamily: 'Inter',
          fontWeight: '600',
          fontSize: '18px',
          marginBottom: '16px',
          borderBottom: '1px solid var(--border-primary)',
          paddingBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{getPlatformName()} Post</span>
          <button
            onClick={handleStartEdit}
            aria-label={`Editar post para ${getPlatformName()}`}
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '32px',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid ${getPlatformColor()}`;
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <Edit size={14} aria-hidden="true" />
            Editar
          </button>
        </div>

        {/* Conteúdo em modo de visualização com Markdown renderizado */}
        <div 
          className="markdown-content"
          style={{
            color: 'var(--text-white)',
            fontFamily: 'Inter',
            fontSize: '16px',
            lineHeight: '1.6',
            padding: '2px 44px',
            flex: 1,
            overflowY: 'auto'
          }}
          dangerouslySetInnerHTML={{
            __html: localContent ? (() => {
              console.log('🔍 CommonTextEditor - Conteúdo Markdown original:', localContent);
              try {
                const rendered = marked.parse(localContent);
                console.log('🔍 CommonTextEditor - HTML renderizado:', rendered);
                return rendered;
              } catch (error) {
                console.error('❌ Erro ao renderizar Markdown:', error);
                return localContent; // Fallback para texto simples
              }
            })() : placeholder
          }}
        />
      </div>
    );
  }

  // Renderiza o modo de edição
  return (
    <div 
      className={`common-text-editor-edit ${className}`}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: '8px',
        padding: '40px',
        maxWidth: '1200px',
        margin: '0 auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.3s ease-out',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        ...style
      }}
    >
      {/* Header com título e botões de ação */}
      <div style={{
        color: 'var(--text-primary)',
        fontFamily: 'Inter',
        fontWeight: '600',
        fontSize: '18px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border-primary)',
        paddingBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Editando {getPlatformName()} Post</span>
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            aria-label="Salvar alterações"
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: getPlatformColor(),
              border: 'none',
              color: 'var(--text-white)',
              borderRadius: '6px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '32px',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isSaving ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid ${getPlatformColor()}`;
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <Save size={14} aria-hidden="true" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            aria-label="Cancelar edição"
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '32px',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid ${getPlatformColor()}`;
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <X size={14} aria-hidden="true" />
            Cancelar
          </button>
        </div>
      </div>

      {      /* Editor BlockNote */}
      <div ref={editorRef} style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0
      }}>
        <div 
          style={{
            flex: 1,
            overflow: 'auto',
            minHeight: '200px',
            maxHeight: '100%'
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = 'rgba(43, 178, 76, 0.1)';
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = 'transparent';
            
            try {
              const jsonData = e.dataTransfer.getData('application/json');
              if (jsonData) {
                const data = JSON.parse(jsonData);
                console.log('📥 Drop recebido:', data);
                
                // Insere o conteúdo no editor
                if (editor && data.content) {
                  // Adiciona espaço antes do conteúdo para evitar texto grudado
                  const contentWithSpace = ` ${data.content}`;
                  
                  // Insere o texto inline na posição atual do cursor
                  editor.insertInlineContent(contentWithSpace);
                  
                  // Feedback visual
                  toast.success(`Conteúdo inserido: ${data.title || 'Card'}`);
                }
              } else {
                // Fallback para texto simples
                const textData = e.dataTransfer.getData('text/plain');
                if (textData && editor) {
                  // Adiciona espaço antes do texto para evitar grudamento
                  const textWithSpace = ` ${textData}`;
                  
                  // Insere o texto inline na posição atual do cursor
                  editor.insertInlineContent(textWithSpace);
                  toast.success('Texto inserido no editor!');
                }
              }
            } catch (error) {
              console.error('❌ Erro ao processar drop:', error);
              toast.error('Erro ao inserir conteúdo');
            }
          }}
        >
          <BlockNoteView 
            editor={editor} 
            theme="dark"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0',
              padding: '0',
              minHeight: '200px',
              fontFamily: 'Inter',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CommonTextEditor;

// Estilos CSS para elementos Markdown renderizados
const markdownStyles = `
  .markdown-content h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 24px 0 16px 0;
    color: var(--text-primary);
    line-height: 1.2;
  }
  
  .markdown-content h2 {
    font-size: 24px;
    font-weight: 600;
    margin: 20px 0 14px 0;
    color: var(--text-primary);
    line-height: 1.3;
  }
  
  .markdown-content h3 {
    font-size: 20px;
    font-weight: 600;
    margin: 16px 0 12px 0;
    color: var(--text-primary);
    line-height: 1.3;
  }
  
  .markdown-content h4 {
    font-size: 18px;
    font-weight: 600;
    margin: 14px 0 10px 0;
    color: var(--text-primary);
    line-height: 1.3;
  }
  
  .markdown-content h5 {
    font-size: 16px;
    font-weight: 600;
    margin: 12px 0 8px 0;
    color: var(--text-primary);
    line-height: 1.3;
  }
  
  .markdown-content h6 {
    font-size: 14px;
    font-weight: 600;
    margin: 10px 0 6px 0;
    color: var(--text-primary);
    line-height: 1.3;
  }
  
  .markdown-content p {
    margin: 12px 0;
    line-height: 1.6;
    color: var(--text-white);
  }
  
  .markdown-content ul, .markdown-content ol {
    margin: 12px 0 12px 20px;
    padding-left: 0;
  }
  
  .markdown-content li {
    margin: 6px 0;
    line-height: 1.5;
    color: var(--text-white);
  }
  
  .markdown-content blockquote {
    border-left: 4px solid var(--primary-green);
    padding-left: 16px;
    margin: 16px 0;
    color: var(--text-secondary);
    font-style: italic;
    background: rgba(43, 178, 76, 0.05);
    padding: 12px 16px;
    border-radius: 0 6px 6px 0;
  }
  
  .markdown-content code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 14px;
    color: var(--text-white);
  }
  
  .markdown-content pre {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;
    border: 1px solid var(--border-primary);
  }
  
  .markdown-content pre code {
    background: transparent;
    padding: 0;
    border-radius: 0;
  }
  
  .markdown-content a {
    color: var(--primary-green);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s ease;
  }
  
  .markdown-content a:hover {
    border-bottom-color: var(--primary-green);
  }
  
  .markdown-content hr {
    border: none;
    border-top: 2px solid var(--border-primary);
    margin: 24px 0;
    opacity: 0.6;
  }
  
  .markdown-content strong {
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .markdown-content em {
    font-style: italic;
    color: var(--text-secondary);
  }
  
  .markdown-content img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 16px 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .markdown-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    overflow: hidden;
  }
  
  .markdown-content th,
  .markdown-content td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-primary);
  }
  
  .markdown-content th {
    background: rgba(255, 255, 255, 0.05);
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .markdown-content td {
    color: var(--text-white);
  }
`;

// Adiciona os estilos ao DOM
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = markdownStyles;
  document.head.appendChild(styleElement);
}
