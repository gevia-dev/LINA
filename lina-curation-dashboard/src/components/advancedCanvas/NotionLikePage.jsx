import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Save, X, Layers as LayersIcon, Quote as QuoteIcon, Braces as BracesIcon, ChevronLeft, ChevronRight, Library as LibraryIcon } from 'lucide-react';
import CanvasLibraryView from './CanvasLibraryView';
import BlockNoteEditor from './BlockNoteEditor';
import MainSidebar from '../MainSidebar';

const SECTION_TITLES = {
  summary: 'Introdução',
  body: 'Corpo',
  conclusion: 'Conclusão'
};

const NotionLikePage = ({ isOpen = true, onClose, newsData, newsTitle, nodes = [], edges = [], onSaveNode, onCanvasItemDragStart, onLinkDataToSection }) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const rightPaneRef = useRef(null);
  const lastDropRef = useRef({ itemId: null, sectionId: null, at: 0 });
  const [activeSection, setActiveSection] = useState('summary');
  const [lastMarkdown, setLastMarkdown] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.4);
  const [filteredSection, setFilteredSection] = useState(null);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [dragState, setDragState] = useState({ active: false });
  const [recentlyAdded, setRecentlyAdded] = useState(null);

  const EDITOR_MIN_PX = 480;
  const LIB_MIN_PX = 360;

  // Chips com o mesmo visual do MonitorNode (azul para dados, laranja para estrutura)
  const SidebarChip = useCallback(({ node }) => {
    const role = node?.data?.nodeType || node?.data?.coreKey || node?.type;
    const isStructure = (
      role === 'estrutura' ||
      node?.data?.nodeType === 'estrutura' ||
      node?.data?.coreKey === 'micro_estrutura' ||
      node?.data?.isStructureNode === true
    );
    const getStructureLabel = (value) => ({
      continua: 'Continua',
      paragrafos: 'Paragrafos',
      topicos: 'Topicos'
    }[(String(value || '')).toLowerCase()] || 'Estrutura');
    const label = isStructure
      ? getStructureLabel(node?.data?.structureType)
      : (node?.data?.title || node?.data?.label || node?.data?.name || node?.type || 'Item');
    const Icon = isStructure
      ? LayersIcon
      : ((typeof role === 'string' && role.toLowerCase().includes('micro')) ? QuoteIcon : BracesIcon);
    const isMicro = !isStructure && typeof role === 'string' && role.toLowerCase().includes('micro');
    const chipBorderColor = isStructure ? '#F5A623' : isMicro ? '#4A90E2' : 'var(--border-primary)';
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-4 max-w-full"
        style={{ borderColor: chipBorderColor, color: 'var(--text-secondary)' }}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    );
  }, []);

  // Mapeia filhos conectados (dados/estrutura) por seção de texto
  const sectionChildren = useMemo(() => {
    const sectionIds = ['summary', 'body', 'conclusion'];
    const map = { summary: [], body: [], conclusion: [] };
    try {
      if (!Array.isArray(edges) || !Array.isArray(nodes)) return map;
      const idToNode = new Map(nodes.map((n) => [n.id, n]));
      edges.forEach((e) => {
        if (sectionIds.includes(e?.target)) {
          const child = idToNode.get(e.source);
          if (child) map[e.target].push(child);
        }
      });
    } catch {}
    return map;
  }, [nodes, edges]);

  const sortedSectionChildren = useMemo(() => {
    const isStructureNode = (n) => {
      const role = n?.data?.nodeType || n?.data?.coreKey || n?.type;
      return role === 'estrutura' || n?.data?.nodeType === 'estrutura' || n?.data?.coreKey === 'micro_estrutura' || n?.data?.isStructureNode === true;
    };
    const sortFn = (a, b) => Number(isStructureNode(b)) - Number(isStructureNode(a));
    return {
      summary: [...(sectionChildren.summary || [])].sort(sortFn),
      body: [...(sectionChildren.body || [])].sort(sortFn),
      conclusion: [...(sectionChildren.conclusion || [])].sort(sortFn)
    };
  }, [sectionChildren]);

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

  const sectionMarkdownMap = useMemo(() => {
    const findContent = (id) => String(nodes.find((n) => n.id === id)?.data?.content || '');
    return {
      summary: [`# ${SECTION_TITLES.summary}`, findContent('summary').trim()].filter(Boolean).join('\n'),
      body: [`# ${SECTION_TITLES.body}`, findContent('body').trim()].filter(Boolean).join('\n'),
      conclusion: [`# ${SECTION_TITLES.conclusion}`, findContent('conclusion').trim()].filter(Boolean).join('\n')
    };
  }, [nodes]);

  const displayContent = useMemo(() => {
    if (!filteredSection) return editorContent;
    return sectionMarkdownMap[filteredSection] || editorContent;
  }, [filteredSection, sectionMarkdownMap, editorContent]);

  useEffect(() => {
    setLastMarkdown(editorContent);
  }, [editorContent]);

  const handleContentAdd = useCallback((dragData, sectionId) => {
    try {
      if (!dragData || !sectionId) return;
      const currentNode = nodes.find((n) => n.id === sectionId);
      const current = String(currentNode?.data?.content || '');
      const title = String(dragData?.title || '').trim();
      const content = String(dragData?.content || '').trim();
      const addition = [title && `### ${title}`, content].filter(Boolean).join('\n\n');
      const updated = current ? `${current}\n\n${addition}` : addition;
      // Evita chamadas múltiplas síncronas que causam re-render em cascata
      Promise.resolve().then(() => {
        try { if (typeof onSaveNode === 'function') onSaveNode(sectionId, updated); } catch {}
        try { if (typeof onLinkDataToSection === 'function') onLinkDataToSection(sectionId, dragData); } catch {}
        setRecentlyAdded({ sectionId, at: Date.now() });
        setTimeout(() => setRecentlyAdded(null), 1200);
      });
    } catch {}
  }, [nodes, onSaveNode, onLinkDataToSection]);

  // Inventário: adicionar sem abrir painel; mostra badge no botão




  const useDragAndDrop = (onAdd) => {
    const [isActive, setIsActive] = useState(false);
    const onDragEnter = useCallback((e) => {
      try {
        const types = Array.from(e?.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('application/x-lina-item')) {
          setIsActive(true);
        }
      } catch {}
    }, []);
    const onDragOver = useCallback((e) => {
      try {
        const types = Array.from(e?.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('application/x-lina-item')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setIsActive(true);
        }
      } catch {}
    }, []);
    const onDragLeave = useCallback((e) => {
      try {
        setIsActive(false);
      } catch {}
    }, []);
    const onDrop = useCallback((e, sectionId) => {
      try {
        const types = Array.from(e?.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('application/x-lina-item')) {
          e.preventDefault();
          setIsActive(false);
          let data = null;
          try {
            let json = e.dataTransfer.getData('application/json');
            if (!json) json = e.dataTransfer.getData('application/x-lina-item');
            if (!json) json = e.dataTransfer.getData('text/plain');
            if (json) data = JSON.parse(json);
          } catch {}
          if (data && data.type === 'canvas-library-item') {
            onAdd?.(data, sectionId);
            console.debug('🧰 Drop (fallback) aplicado na DropZone:', { section: sectionId, data });
          }
        }
      } catch {}
    }, [onAdd]);
    return { isActive, onDragEnter, onDragOver, onDragLeave, onDrop };
  };

  const DropZone = ({ sectionId, children }) => {
    const dnd = useDragAndDrop((data) => handleContentAdd(data, sectionId));
    return (
      <div
        onDragEnter={dnd.onDragEnter}
        onDragOver={dnd.onDragOver}
        onDragLeave={dnd.onDragLeave}
        onDrop={(e) => dnd.onDrop(e, sectionId)}
        style={{
          position: 'relative',
          border: dnd.isActive ? '2px dashed var(--primary-green)' : '2px solid transparent',
          borderRadius: 8
        }}
      >
        {children}
      </div>
    );
  };

  const handleScrollSync = useCallback((headingText) => {
    const text = String(headingText || '').trim();
    const map = {
      [SECTION_TITLES.summary]: 'summary',
      [SECTION_TITLES.body]: 'body',
      [SECTION_TITLES.conclusion]: 'conclusion'
    };
    if (map[text] && !filteredSection) setActiveSection(map[text]);
  }, [filteredSection]);

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

  // Captura global de dragover/drop para permitir soltar no editor (ProseMirror intercepta eventos)
  useEffect(() => {
    const parseDragData = (dt) => {
      try {
        if (!dt) return null;
        const types = Array.from(dt.types || []);
        if (types.includes('application/json')) {
          const json = dt.getData('application/json');
          if (json) {
            try { const data = JSON.parse(json); if (data && data.type === 'canvas-library-item') return data; } catch {}
          }
        }
        if (types.includes('application/x-lina-item')) {
          const raw = dt.getData('application/x-lina-item');
          if (raw) {
            try { const data = JSON.parse(raw); if (data && data.type === 'canvas-library-item') return data; } catch {}
          }
        }
        if (types.includes('text/plain')) {
          const txt = dt.getData('text/plain');
          if (txt) {
            try { const data = JSON.parse(txt); if (data && data.type === 'canvas-library-item') return data; } catch {}
          }
        }
      } catch {}
      return null;
    };

    const onDragOverCapture = (e) => {
      try {
        const types = Array.from(e.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('application/x-lina-item') || types.includes('text/uri-list')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          // Mantido leve para performance; logs removidos para evitar travamentos ao arrastar
        }
      } catch {}
    };

    const onDropCapture = (e) => {
      try {
        const data = parseDragData(e.dataTransfer);
        if (data) {
          e.preventDefault();
          e.stopPropagation();
          const targetSection = filteredSection || activeSection || 'summary';
          // Deduplica múltiplos drops do mesmo item em curto intervalo
          const now = Date.now();
          const isDuplicate = (
            lastDropRef.current &&
            lastDropRef.current.itemId === (data.itemId || data.id) &&
            lastDropRef.current.sectionId === targetSection &&
            (now - lastDropRef.current.at) < 800
          );
          if (isDuplicate) {
            console.debug('⏭️ Drop duplicado ignorado');
            return;
          }
          lastDropRef.current = { itemId: (data.itemId || data.id), sectionId: targetSection, at: now };
          handleContentAdd(data, targetSection);
          console.log('✅ Drop capturado com sucesso:', { section: targetSection, data });
        } else {
          const types = Array.from(e.dataTransfer?.types || []);
          console.debug('⚠️ Drop ignorado (tipos não suportados ou payload inválido):', types);
        }
      } catch {}
    };

    document.addEventListener('dragover', onDragOverCapture, true);
    document.addEventListener('drop', onDropCapture, true);
    return () => {
      document.removeEventListener('dragover', onDragOverCapture, true);
      document.removeEventListener('drop', onDropCapture, true);
    };
  }, [filteredSection, activeSection, handleContentAdd]);

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
          className="relative w-full h-full flex"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* MainSidebar na esquerda */}
          <MainSidebar />
          
          {/* Container principal do editor */}
          <div className="flex-1 flex flex-col">
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
              /* Oculta side menu e slash menu (substituídos por toolbar superior) */
              .notion-editor .bn-side-menu,
              .notion-editor .bn-slash-menu,
              .notion-editor .bn-floating-toolbar {
                display: none !important;
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

            {/* Corpo: dois painéis com splitter central */}
            <div className="flex-1 flex overflow-hidden" ref={containerRef}>
              {/* Editor + Splitter + Biblioteca */}
              <div className="flex-1 overflow-hidden flex" ref={rightPaneRef}>
                <div className="overflow-hidden" style={{ width: `${Math.round(splitRatio * 100)}%`, minWidth: EDITOR_MIN_PX, backgroundColor: '#000' }}>
                  <div className="h-full" style={{ height: '100%' }}>
                    <DropZone sectionId={filteredSection || activeSection}>
                      <BlockNoteEditor
                        key={`bn-${filteredSection || 'all'}-${displayContent.length}`}
                        ref={editorRef}
                        initialContent={displayContent}
                        onChange={setLastMarkdown}
                        onScroll={filteredSection ? undefined : handleScrollSync}
                        
                        onCanvasItemDragStart={(payload) => { try { onCanvasItemDragStart?.(payload); } catch {} }}
                      />
                    </DropZone>
                  </div>
                </div>

                <div onMouseDown={onStartResize} className={`splitter-handle cursor-col-resize ${isResizing ? 'active' : ''}`} style={{ width: 4, zIndex: 10, backgroundColor: '#6b7280' }} title="Arraste para redimensionar" />

                <div className="overflow-hidden" style={{ width: `${Math.round((1 - splitRatio) * 100)}%`, minWidth: LIB_MIN_PX, backgroundColor: 'var(--bg-primary)' }}>
                  <CanvasLibraryView
                    compact
                    sidebarOnRight
                    enableSidebarToggle
                    transparentSidebar
                    newsData={newsData}
                    onTransferItem={() => {}}
                    onOpenCardModal={() => {}}
                    onDragStart={(payload) => { try { onCanvasItemDragStart?.(payload); } catch {} }}
                    onCanvasItemDragStart={() => {}}
                    onAddToNotionSection={(sectionId, payload) => handleContentAdd(payload, sectionId)}
            
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotionLikePage;


