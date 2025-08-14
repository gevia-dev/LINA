import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Save, X } from 'lucide-react';
import CanvasLibraryView from './CanvasLibraryView';
import BlockNoteEditor from './BlockNoteEditor';

const SECTION_TITLES = {
  summary: 'Introdução',
  body: 'Corpo',
  conclusion: 'Conclusão'
};

const NotionLikePage = ({ isOpen = true, onClose, newsData, newsTitle, nodes = [], onSaveNode }) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const rightPaneRef = useRef(null);
  const [activeSection, setActiveSection] = useState('summary');
  const [lastMarkdown, setLastMarkdown] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.62);
  const EDITOR_MIN_PX = 480;
  const LIB_MIN_PX = 360;

  // Monta conteúdo do editor a partir dos nodes principais
  const editorContent = useMemo(() => {
    const findContent = (id) => String(nodes.find((n) => n.id === id)?.data?.content || '');
    const summaryMD = findContent('summary');
    const bodyMD = findContent('body');
    const conclusionMD = findContent('conclusion');
    const parts = [];
    parts.push(`# ${SECTION_TITLES.summary}`);
    if (summaryMD) parts.push(summaryMD.trim());
    parts.push('');
    parts.push(`# ${SECTION_TITLES.body}`);
    if (bodyMD) parts.push(bodyMD.trim());
    parts.push('');
    parts.push(`# ${SECTION_TITLES.conclusion}`);
    if (conclusionMD) parts.push(conclusionMD.trim());
    return parts.join('\n');
  }, [nodes]);

  useEffect(() => {
    setLastMarkdown(editorContent);
  }, [editorContent]);

  const handleScrollSync = useCallback((headingText) => {
    const text = String(headingText || '').trim();
    const map = {
      [SECTION_TITLES.summary]: 'summary',
      [SECTION_TITLES.body]: 'body',
      [SECTION_TITLES.conclusion]: 'conclusion'
    };
    if (map[text]) setActiveSection(map[text]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editorRef.current || typeof editorRef.current.getMarkdown !== 'function') return;
    const markdown = await editorRef.current.getMarkdown();
    setLastMarkdown(markdown);

    // Extrai blocos por headings específicos
    const headingRegex = /^#\s+(Introdução|Corpo|Conclusão)\s*$/gmi;
    const matches = [];
    let m;
    while ((m = headingRegex.exec(markdown)) !== null) {
      matches.push({ title: m[1], index: m.index, endOfLine: headingRegex.lastIndex });
    }
    // Acrescenta sentinela final
    matches.push({ title: '__END__', index: markdown.length, endOfLine: markdown.length });

    const titleToId = {
      Introdução: 'summary',
      Corpo: 'body',
      Conclusão: 'conclusion'
    };

    for (let i = 0; i < matches.length - 1; i += 1) {
      const current = matches[i];
      const next = matches[i + 1];
      const lineEndIdx = markdown.indexOf('\n', current.endOfLine);
      const contentStart = lineEndIdx === -1 ? current.endOfLine : lineEndIdx + 1;
      const content = markdown.slice(contentStart, next.index).trim();
      const sectionId = titleToId[current.title];
      if (sectionId && typeof onSaveNode === 'function') {
        onSaveNode(sectionId, content);
      }
    }
  }, [onSaveNode]);

  const onStartResize = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;
    const handleMouseMove = (e) => {
      const el = rightPaneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let x = e.clientX - rect.left;
      x = Math.max(EDITOR_MIN_PX, Math.min(rect.width - LIB_MIN_PX, x));
      const ratio = x / rect.width;
      setSplitRatio(ratio);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.div
          className="relative w-full h-full flex flex-col"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            /* Aparência do editor BlockNote dentro do container Notion-like */
            .notion-editor { min-height: 100vh; }
            .notion-editor .bn-container,
            .notion-editor .bn-editor,
            .notion-editor .ProseMirror {
              background-color: var(--bg-primary) !important;
              color: var(--text-primary) !important;
              min-height: 100vh !important;
            }
            .notion-editor .ProseMirror {
              padding: 28px 32px !important;
              line-height: 1.7 !important;
              font-family: "Nunito Sans", "Inter", sans-serif !important;
            }
            .notion-editor .bn-side-menu,
            .notion-editor .bn-slash-menu {
              background-color: #0b0b0b !important;
              border: 1px solid var(--border-primary) !important;
            }

            /* Splitter */
            .splitter-handle {
              background-color: #6b7280; /* gray-500 */
            }
            .splitter-handle:hover,
            .splitter-handle.active { background-color: #9ca3af; /* gray-400 */ }
          `}</style>
            {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center gap-3">
              <FileText size={22} style={{ color: 'var(--primary-green)' }} />
                <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>Editor Estruturado</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{newsTitle || ''}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
              <button onClick={handleSave} className="px-3 py-1.5 rounded border" title="Salvar" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
                <div className="flex items-center gap-2"><Save size={16} /><span className="text-sm">Salvar</span></div>
              </button>
              <button onClick={onClose} className="p-2 rounded border" title="Fechar" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
              </div>
            </div>

          {/* Corpo: três painéis com splitter central (restaura funcionalidade) */}
          <div className="flex-1 flex overflow-hidden" ref={containerRef}>
            {/* Painel Esquerdo antigo (restaurado visual) */}
            <motion.div
              className="w-80 min-w-[20rem] border-r overflow-y-auto"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="p-4">
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>Estrutura do Conteúdo</h3>
                <div className="space-y-1">
                  {['summary','body','conclusion'].map((id) => (
                    <button
                      key={id}
                      className="w-full text-left p-3 rounded-lg border"
                      onClick={() => editorRef.current?.scrollToHeading(SECTION_TITLES[id])}
                      style={{
                        backgroundColor: activeSection === id ? 'var(--primary-green-transparent)' : 'var(--bg-primary)',
                        borderColor: activeSection === id ? 'var(--primary-green)' : 'var(--border-primary)',
                        color: activeSection === id ? 'var(--primary-green)' : 'var(--text-primary)'
                      }}
                    >{SECTION_TITLES[id]}</button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Editor + Splitter + Biblioteca */}
            <div className="flex-1 overflow-hidden flex" ref={rightPaneRef}>
              <div className="overflow-hidden" style={{ width: `${Math.round(splitRatio * 100)}%`, minWidth: EDITOR_MIN_PX, backgroundColor: '#000' }}>
                <div className="h-full" style={{ height: '100%' }}>
                  <BlockNoteEditor ref={editorRef} initialContent={editorContent} onChange={setLastMarkdown} onScroll={handleScrollSync} />
                </div>
              </div>

              <div onMouseDown={onStartResize} className={`splitter-handle cursor-col-resize ${isResizing ? 'active' : ''}`} style={{ width: 4, zIndex: 10, backgroundColor: '#6b7280' }} title="Arraste para redimensionar" />

              <div className="overflow-hidden" style={{ width: `${Math.round((1 - splitRatio) * 100)}%`, minWidth: LIB_MIN_PX, backgroundColor: 'var(--bg-secondary)' }}>
                <CanvasLibraryView compact sidebarOnRight enableSidebarToggle newsData={newsData} onTransferItem={() => {}} onOpenCardModal={() => {}} />
              </div>
            </div>
          </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
  );
};

export default NotionLikePage;


