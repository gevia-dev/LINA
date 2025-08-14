import React, { useEffect, useMemo, useRef, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import { useCreateBlockNote, BlockNoteViewEditor, FormattingToolbar, BlockTypeSelect, BasicTextStyleButton, CreateLinkButton, ColorStyleButton } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { Library as LibraryIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import InventoryPanel from './InventoryPanel';

// Converte uma string Markdown simples em blocos parciais do BlockNote.
// Suporta headings (#, ##, ###) e parágrafos. Demais sintaxes são tratadas como parágrafos.
const markdownToSimpleBlocks = (markdown) => {
  try {
    const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let paragraphBuffer = [];

    const flushParagraph = () => {
      const text = paragraphBuffer.join('\n').trim();
      if (text) blocks.push({ type: 'paragraph', content: [{ type: 'text', text }] });
      paragraphBuffer = [];
    };

    lines.forEach((raw) => {
      const line = raw || '';
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        const level = Math.min(6, headingMatch[1].length);
        const text = headingMatch[2].trim();
        blocks.push({ type: 'heading', props: { level }, content: [{ type: 'text', text }] });
      } else if (/^\s*$/.test(line)) {
        // linha em branco delimita parágrafos
        flushParagraph();
      } else {
        paragraphBuffer.push(line);
      }
    });
    flushParagraph();
    if (!blocks.length) return [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }];
    return blocks;
  } catch {
    return [{ type: 'paragraph', content: [{ type: 'text', text: String(markdown || '') }] }];
  }
};

// Extrai Markdown simples a partir do DOM renderizado do editor (headings e parágrafos).
const domToMarkdownSimple = (rootEl) => {
  try {
    if (!rootEl) return '';
    const editorRoot = rootEl.querySelector('.ProseMirror') || rootEl;
    const parts = [];
    const children = Array.from(editorRoot.children || []);
    for (const el of children) {
      const tag = String(el.tagName || '').toUpperCase();
      const text = (el.innerText || '').replace(/\u00A0/g, ' ').trim();
      if (!text) {
        continue;
      }
      if (/^H[1-6]$/.test(tag)) {
        const level = Number(tag.slice(1)) || 1;
        parts.push(`${'#'.repeat(Math.min(6, Math.max(1, level)))} ${text}`);
        parts.push('');
      } else if (tag === 'P' || tag === 'DIV' || tag === 'BLOCKQUOTE') {
        parts.push(text);
        parts.push('');
      } else if (tag === 'UL' || tag === 'OL') {
        const items = Array.from(el.querySelectorAll(':scope > li'));
        items.forEach((li, idx) => {
          const t = (li.innerText || '').replace(/\u00A0/g, ' ').trim();
          if (!t) return;
          if (tag === 'UL') parts.push(`- ${t}`);
          else parts.push(`${idx + 1}. ${t}`);
        });
        parts.push('');
      } else {
        parts.push(text);
        parts.push('');
      }
    }
    while (parts.length && parts[parts.length - 1] === '') parts.pop();
    return parts.join('\n');
  } catch {
    return '';
  }
};

const BlockNoteEditor = forwardRef(({ initialContent = '', onChange, onScroll, inventoryItems = [], isInventoryOpen = false, inventoryUnread = 0, onToggleInventory, onCanvasItemDragStart }, ref) => {
  const scrollRef = useRef(null);
  const toolbarRef = useRef(null);
  const [panelTop, setPanelTop] = useState(42);

  // Conteúdo inicial em blocos (parsing simples de markdown -> blocks)
  const initialBlocks = useMemo(() => markdownToSimpleBlocks(initialContent), [initialContent]);

  // Cria editor com conteúdo inicial
  const editor = useCreateBlockNote({ initialContent: initialBlocks });

  // Propaga mudanças do editor em Markdown simples para o pai
  const handleEditorChange = useCallback(async () => {
    try {
      const markdown = domToMarkdownSimple(scrollRef.current);
      if (typeof onChange === 'function') onChange(markdown);
    } catch {}
  }, [editor, onChange]);

  // Observa rolagem para detectar o heading visível no topo do container
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScrollInternal = () => {
      try {
        const containerRect = el.getBoundingClientRect();
        const headings = el.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let current = '';
        let bestTop = Number.POSITIVE_INFINITY;
        headings.forEach((h) => {
          const r = h.getBoundingClientRect();
          const offsetTop = Math.abs(r.top - containerRect.top);
          if (r.bottom >= containerRect.top && r.top <= containerRect.bottom) {
            if (offsetTop < bestTop) {
              bestTop = offsetTop;
              current = (h.textContent || '').trim();
            }
          }
        });
        if (current && typeof onScroll === 'function') onScroll(current);
      } catch {}
    };
    el.addEventListener('scroll', onScrollInternal, { passive: true });
    // Permitir drop sobre o container do editor
    const onDragOver = (e) => {
      try {
        const types = Array.from(e.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      } catch {}
    };
    const onDrop = (e) => {
      try {
        // A lógica final de drop é tratada no NotionLikePage (captura global)
        const types = Array.from(e.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain')) {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch {}
    };
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('drop', onDrop);
    // Dispara uma leitura inicial
    queueMicrotask(onScrollInternal);
    return () => {
      el.removeEventListener('scroll', onScrollInternal);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('drop', onDrop);
    };
  }, [onScroll]);

  // OBS: Drop externo é tratado pelo container NotionLikePage (DropZone)

  // Expor API imperativa
  useImperativeHandle(ref, () => ({
    getMarkdown: async () => {
      try {
        return domToMarkdownSimple(scrollRef.current);
      } catch {
        return '';
      }
    },
    scrollToHeading: (headingText) => {
      try {
        const el = scrollRef.current;
        if (!el) return;
        const headings = el.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (let i = 0; i < headings.length; i += 1) {
          const node = headings[i];
          if ((node.textContent || '').trim() === String(headingText || '').trim()) {
            node.scrollIntoView({ behavior: 'smooth', block: 'start' });
            break;
          }
        }
      } catch {}
    }
  }), [editor]);

  return (
    <div
      ref={scrollRef}
      className="notion-editor"
      style={{ height: '100vh', overflowY: 'auto', backgroundColor: 'var(--bg-primary)', position: 'relative' }}
    >
      <BlockNoteView
        editor={editor}
        onChange={handleEditorChange}
        formattingToolbar={false}
        sideMenu={false}
        slashMenu={false}
        renderEditor={false}
      >
        <div ref={toolbarRef} className="bn-top-toolbar" style={{ position: 'sticky', top: 0, zIndex: 5, borderBottom: '1px solid var(--border-primary)', padding: '6px 10px', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <FormattingToolbar>
                <BlockTypeSelect />
                <BasicTextStyleButton basicTextStyle="bold" />
                <BasicTextStyleButton basicTextStyle="italic" />
                <BasicTextStyleButton basicTextStyle="underline" />
                <BasicTextStyleButton basicTextStyle="strike" />
                <ColorStyleButton />
                <CreateLinkButton />
              </FormattingToolbar>
            </div>
            <motion.button
              onClick={() => onToggleInventory?.()}
              className="p-2 rounded border"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Inventário"
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', position: 'relative' }}
            >
              <LibraryIcon size={16} />
              {inventoryUnread > 0 && (
                <span
                  style={{ position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 9999, backgroundColor: 'var(--status-error)', color: 'white', fontSize: 10, lineHeight: '16px', textAlign: 'center' }}
                >{Math.min(9, inventoryUnread)}{inventoryUnread > 9 ? '+' : ''}</span>
              )}
            </motion.button>
          </div>
        </div>
        <InventoryPanel
          items={inventoryItems}
          isOpen={isInventoryOpen}
          onToggle={() => onToggleInventory?.()}
          onClose={() => onToggleInventory?.()}
          onCanvasItemDragStart={onCanvasItemDragStart}
          topOffset={panelTop}
          variant="inside-editor"
        />
        <BlockNoteViewEditor />
      </BlockNoteView>
    </div>
  );
});

export default BlockNoteEditor;


