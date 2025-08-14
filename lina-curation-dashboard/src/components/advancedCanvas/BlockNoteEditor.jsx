import React, { useEffect, useMemo, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useCreateBlockNote, BlockNoteViewEditor, FormattingToolbar, BlockTypeSelect, BasicTextStyleButton, CreateLinkButton, ColorStyleButton } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

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

const BlockNoteEditor = forwardRef(({ initialContent = '', onChange, onScroll }, ref) => {
  const scrollRef = useRef(null);

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
    // Dispara uma leitura inicial
    queueMicrotask(onScrollInternal);
    return () => el.removeEventListener('scroll', onScrollInternal);
  }, [onScroll]);

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
    <div ref={scrollRef} className="notion-editor" style={{ height: '100vh', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
      <BlockNoteView
        editor={editor}
        onChange={handleEditorChange}
        formattingToolbar={false}
        sideMenu={false}
        slashMenu={false}
        renderEditor={false}
      >
        <div className="bn-top-toolbar" style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '6px 10px' }}>
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
        <BlockNoteViewEditor />
      </BlockNoteView>
    </div>
  );
});

export default BlockNoteEditor;


