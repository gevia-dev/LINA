import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { marked } from 'marked';

// Configura o parser Markdown para respeitar quebras de linha simples e GFM
marked.setOptions({
  gfm: true,
  breaks: true
});

// Converte um texto simples em blocos básicos para o BlockNote
function extractFinalTextMarkdown(item) {
  if (!item) return '';
  if (typeof item.final_text === 'string') return item.final_text;
  return '';
}

const NewsReaderPanel = ({ item, onClose }) => {
  const [title, setTitle] = useState(item?.title || 'Sem título');
  const [markdown, setMarkdown] = useState('');
  const editorRef = useRef(null);

  useEffect(() => {
    setTitle(item?.title || 'Sem título');
    setMarkdown(extractFinalTextMarkdown(item));
  }, [item]);

  return (
    <div
      className="fixed inset-0 z-[1002]"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(2px)'
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Container */}
      <div
        className="absolute inset-0"
        style={{ display: 'flex', justifyContent: 'flex-end' }}
        onClick={(e) => {
          // Evitar fechar ao clicar dentro do conteúdo
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        {/* Sidebar de Leitura */}
        <div
          style={{
            width: 'min(1600px, 80vw)',
            height: '100vh',
            backgroundColor: 'var(--bg-primary)',
            borderLeft: '1px solid var(--border-primary)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
            animation: 'slideInRight 0.3s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between"
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-primary)',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
              <div
                className="truncate"
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: '16px'
                }}
                title={title}
              >
                {title}
              </div>
              {item?.created_at && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'Inter' }}>
                  {new Date(item.created_at).toLocaleString('pt-BR')}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              aria-label="Fechar leitor"
              style={{
                background: 'none',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                marginLeft: '12px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div
            className="flex-1 overflow-auto"
            style={{ padding: '20px' }}
          >
            {/* Título editável */}
            <div
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setTitle(e.currentTarget.textContent || '')}
              style={{
                outline: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: '24px',
                marginBottom: '20px',
                lineHeight: 1.3
              }}
            >
              {title}
            </div>

            {/* Renderização Markdown segura (somente visualização) */}
            <article
              ref={editorRef}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '20px',
                minHeight: '60vh',
                lineHeight: 1.7,
                fontFamily: 'Inter',
                fontSize: '14px'
              }}
              dangerouslySetInnerHTML={{ __html: marked.parse(markdown || '') }}
            />
            <style>{`
              article h1 { font-size: 22px; font-weight: 700; margin: 8px 0 12px; }
              article h2 { font-size: 18px; font-weight: 700; margin: 8px 0 10px; }
              article h3 { font-size: 16px; font-weight: 600; margin: 8px 0 8px; }
              article p { margin: 8px 0; }
              article ul, article ol { margin: 8px 0 8px 20px; }
              article li { margin: 4px 0; }
              article blockquote { border-left: 3px solid var(--border-primary); padding-left: 12px; color: var(--text-secondary); margin: 8px 0; }
              article code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
              article pre { background: rgba(255,255,255,0.06); padding: 12px; border-radius: 6px; overflow: auto; }
              article a { color: var(--primary-green); text-decoration: none; }
              article a:hover { text-decoration: underline; }
              article hr { border: none; border-top: 1px solid var(--border-primary); margin: 12px 0; }
              
              @keyframes slideInRight {
                from {
                  transform: translateX(100%);
                  opacity: 0;
                }
                to {
                  transform: translateX(0);
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsReaderPanel;


