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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)'
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Container */}
      <div
        className="absolute inset-0"
        style={{ display: 'flex', flexDirection: 'column' }}
        onClick={(e) => {
          // Evitar fechar ao clicar dentro do conteúdo
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-primary)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <div
              className="truncate"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: '14px'
              }}
              title={title}
            >
              {title}
            </div>
            {item?.created_at && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'Inter' }}>
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
              borderRadius: '6px'
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
          style={{ backgroundColor: 'var(--bg-primary)', padding: '16px' }}
        >
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
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
                fontSize: '22px',
                marginBottom: '12px'
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
                padding: '16px',
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
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsReaderPanel;


