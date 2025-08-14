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
        position: 'absolute',
        right: 8,
        top: topOffset,
        bottom: 8,
        width: 320,
        zIndex: 50,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRight: 'none',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.3)',
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8
      };
    }
    return {
      position: 'absolute',
      top: topOffset,
      right: 0,
      bottom: 0,
      width: 320,
      zIndex: 55,
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
        >
          <div className="h-full flex flex-col">
            <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
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
            <div className="flex-1 overflow-auto p-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
              {isEmpty ? (
                <div className="text-sm opacity-70" style={{ color: 'var(--text-secondary)' }}>Nenhum item ainda. Use o botão + nos cards para adicionar aqui.</div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      draggable
                      onDragStart={(e) => {
                        try {
                          const data = { type: 'canvas-library-item', title: it.title, content: it.content, itemId: it.itemId || it.id };
                          e.dataTransfer.setData('application/json', JSON.stringify(data));
                          e.dataTransfer.setData('text/plain', JSON.stringify(data));
                          if (typeof onCanvasItemDragStart === 'function') onCanvasItemDragStart(data);
                        } catch {}
                      }}
                      className="rounded-md border p-2 cursor-grab active:cursor-grabbing"
                      style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-primary)' }}
                      title="Arraste para o editor"
                    >
                      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{it.title}</div>
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


