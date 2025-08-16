import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Library as LibraryIcon } from 'lucide-react';

/**
 * InventoryPanel
 * Painel de inventário reutilizável para arrastar itens ao editor.
 *
 * Props:
 * - items: Array<{ id, title, content, itemId, categoryKey, nodeType }>
 * - isOpen: boolean
 * - onToggle: () => void
 * - onClose: () => void
 * - onCanvasItemDragStart: (payload) => void
 * - topOffset: number (px) – posição superior quando usado dentro do editor
 * - variant: 'inside-editor' | 'overlay-right'
 */
const InventoryPanel = ({
  items = [],
  isOpen = false,
  onToggle,
  onClose,
  onCanvasItemDragStart,
  topOffset = 56,
  variant = 'inside-editor'
}) => {
  const isEmpty = useMemo(() => !items || items.length === 0, [items]);

  const containerStyle = useMemo(() => {
    if (variant === 'inside-editor') {
      return {
        position: 'fixed',
        right: 8,
        top: topOffset,
        bottom: 8,
        width: 320,
        zIndex: 9999,
        pointerEvents: 'none',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRight: 'none',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.3)',
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8
      };
    }
    return {
      position: 'fixed',
      top: topOffset,
      right: 0,
      bottom: 0,
      width: 320,
      zIndex: 9999,
      pointerEvents: 'none',
      backgroundColor: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-primary)',
      boxShadow: '-8px 0 24px rgba(0,0,0,0.3)'
    };
  }, [topOffset, variant]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="inventory-panel"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          style={containerStyle}
          onDragOver={(e) => {
            try {
              // Evita reflow e repaints desnecessários no painel durante drag
              e.preventDefault();
            } catch {}
          }}
        >
          <div className="h-full flex flex-col">
            <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)', pointerEvents: 'auto' }}>
              <div className="flex items-center gap-2">
                <LibraryIcon size={16} style={{ color: 'var(--primary-green)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>Inventário</span>
                <span className="text-xs opacity-70" style={{ color: 'var(--text-secondary)' }}>({items?.length || 0})</span>
              </div>
              <button
                className="px-2 py-1 rounded border"
                onClick={onClose || onToggle}
                style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Fechar
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3" style={{ backgroundColor: 'var(--bg-primary)', pointerEvents: 'auto' }}>
              {isEmpty ? (
                <div className="text-sm opacity-70" style={{ color: 'var(--text-secondary)' }}>Nenhum item ainda. Use o botão + nos cards para adicionar aqui.</div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      draggable
                      onDragEnter={(e) => { try { e.preventDefault(); } catch {} }}
                      onDragOver={(e) => { try { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } catch {} }}
                      onDragStart={(e) => {
                        try {
                          const data = { type: 'canvas-library-item', title: it.title, content: it.content, itemId: it.itemId || it.id };
                          e.dataTransfer.effectAllowed = 'copy';
                          e.dataTransfer.setData('application/json', JSON.stringify(data));
                          e.dataTransfer.setData('text/plain', JSON.stringify(data));
                          // Imagem customizada de drag
                          const preview = document.createElement('div');
                          preview.style.position = 'fixed';
                          preview.style.top = '-1000px';
                          preview.style.left = '-1000px';
                          preview.style.pointerEvents = 'none';
                          preview.style.background = 'var(--bg-secondary)';
                          preview.style.border = '1px solid var(--border-primary)';
                          preview.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
                          preview.style.borderRadius = '8px';
                          preview.style.padding = '8px 10px';
                          preview.style.fontSize = '12px';
                          preview.style.color = 'var(--text-primary)';
                          preview.style.fontFamily = '"Nunito Sans", "Inter", sans-serif';
                          preview.textContent = String(it.title || 'Item');
                          document.body.appendChild(preview);
                          try { e.dataTransfer.setDragImage(preview, 12, 12); } catch {}
                          // Cleanup no fim do drag
                          const removePreview = () => {
                            try { if (preview && preview.parentNode) preview.parentNode.removeChild(preview); } catch {}
                          };
                          e.currentTarget.__linaPreview = removePreview;
                          console.log('🚀 Drag iniciado:', data);
                          // Evita re-render síncrono que cancela o drag nativo
                          if (typeof onCanvasItemDragStart === 'function') {
                            const cb = () => { try { onCanvasItemDragStart(data); } catch {} };
                            if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) requestAnimationFrame(cb); else setTimeout(cb, 0);
                          }
                        } catch {}
                      }}
                      onDragEnd={(e) => {
                        try { e.currentTarget.__linaPreview?.(); } catch {}
                        try { e.currentTarget.__linaPreview = undefined; } catch {}
                        try { console.debug('🛑 Drag finalizado'); } catch {}
                      }}
                      className="rounded-md border p-2 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-[0_0_0_2px_var(--primary-green-transparent)] hover:border-[var(--primary-green)]"
                      style={{
                        borderColor: 'var(--border-primary)',
                        backgroundColor: 'var(--bg-primary)',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        transition: 'box-shadow 150ms ease, border-color 150ms ease'
                      }}
                      title="Arraste para o editor"
                    >
                      <div className="text-xs font-semibold mb-1 hover:text-[var(--primary-green)]" style={{ color: 'var(--text-primary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{it.title}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {it.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InventoryPanel;


