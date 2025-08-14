import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ReactFlow, Controls } from '@xyflow/react';
import { motion } from 'framer-motion';
import { FolderTree, Tags, Quote, ArrowRight, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import dagre from 'dagre';
import VantaBackground from './VantaBackground';

// Utilitário para gerar uma cor em tom pastel a partir de um hex
const toPastelColor = (baseColor) => {
  try {
    const fallback = '#A8D5BA';
    if (!baseColor || typeof baseColor !== 'string') return fallback;
    if (!baseColor.startsWith('#')) return fallback;
    let hex = baseColor.replace('#', '').trim();
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length !== 6) return fallback;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    // mistura com branco para um tom pastel (70% branco, 30% cor)
    const mix = (ch) => Math.round(0.7 * 255 + 0.3 * ch);
    const rp = mix(r);
    const gp = mix(g);
    const bp = mix(b);
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`;
  } catch {
    return '#A8D5BA';
  }
};

// Formata a label da categoria: substitui '_' por espaço e capitaliza palavras
const formatCategoryLabel = (value) => {
  try {
    const raw = String(value || '').trim();
    const withSpaces = raw.replace(/_/g, ' ');
    // Capitaliza cada palavra mantendo acrônimos
    return withSpaces.replace(/\b([a-z])(\w*)/gi, (m, p1, p2) => p1.toUpperCase() + p2.toLowerCase());
  } catch {
    return String(value || '');
  }
};

// Node renderers
const CategoryNode = ({ data }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
      className="rounded-lg"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        width: 200,
        padding: 12,
        borderWidth: 0
      }}
    >
      <div className="flex items-center gap-2">
        <Tags size={16} style={{ color: toPastelColor(data.color) }} />
        <span className="text-sm font-semibold" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{formatCategoryLabel(data.label)}</span>
      </div>
    </motion.div>
  );
};

const KeyNode = ({ data }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className="rounded-lg border"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: data.color || 'var(--border-primary)',
        color: 'var(--text-primary)',
        width: 220,
        padding: 10,
        borderLeft: `4px solid ${data.color || 'var(--primary-green)'}`
      }}
    >
      <div className="flex items-center gap-2">
        <FolderTree size={16} style={{ color: data.color || 'var(--text-secondary)' }} />
        <span className="text-sm font-medium" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{data.label}</span>
      </div>
      {typeof data.count === 'number' && (
        <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>{data.count} itens</div>
      )}
    </motion.div>
  );
};

const ItemNode = ({ data }) => {
  useEffect(() => {
    if (import.meta.env?.DEV) console.debug('[CanvasLibraryView][ItemNode] mounted', { itemId: data?.itemId, title: data?.title, categoryKey: data?.categoryKey });
  }, [data?.itemId, data?.title, data?.categoryKey]);

  const handleOpen = useCallback(() => {
    if (data && typeof data.onOpenCardModal === 'function') {
      data.onOpenCardModal(
        { content: data.phrase, type: 'micro', category: data.categoryKey, itemId: data.itemId },
        [],
        data.index || 0,
        []
      );
    }
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="item-node-card rounded-lg border relative group"
      onDoubleClick={handleOpen}
      onMouseEnter={() => { if (import.meta.env?.DEV) console.debug('[CanvasLibraryView][ItemNode] hover enter', { itemId: data?.itemId }); }}
      onMouseLeave={() => { if (import.meta.env?.DEV) console.debug('[CanvasLibraryView][ItemNode] hover leave', { itemId: data?.itemId }); }}
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-primary)',
        color: 'var(--text-primary)',
        width: 320,
        padding: 12,
        boxShadow: 'none',
        transition: 'transform 20s linear, box-shadow 20s linear, border-color 20s linear'
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100"
        style={{
          boxShadow: '0 10px 28px rgba(255,255,255,0.10)',
          transition: 'opacity 0.2s ease'
        }}
      />
      <div className="flex items-center gap-2 mb-2">
        <Quote size={14} style={{ color: toPastelColor(data.color) }} />
        <span className="text-sm font-semibold truncate" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{data.title}</span>
      </div>
      {/* Tag removida para um visual mais limpo */}
      <p className="text-sm pr-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {data.phrase}
      </p>
      {/* Botão removido conforme solicitação; transferência pode ser acionada via double click (abre modal) e ações subsequentes */}
    </motion.div>
  );
};

const nodeTypes = {
  categoryNode: CategoryNode,
  keyNode: KeyNode,
  itemNode: ItemNode
};

// Parsing util (alinhado com ContextSidebar)
const safeJsonParse = (input) => {
  const normalizeString = (s) => {
    if (typeof s !== 'string') return s;
    let normalized = s.trim();
    const first = normalized.indexOf('{');
    const last = normalized.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      normalized = normalized.slice(first, last + 1);
    }
    normalized = normalized.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    return normalized;
  };
  try {
    if (!input) return null;
    if (typeof input === 'object') {
      const tag = Object.prototype.toString.call(input);
      if (tag === '[object String]') {
        input = String(input.valueOf());
      } else {
        return input;
      }
    }
    if (typeof input === 'string') {
      let current = normalizeString(input);
      for (let i = 0; i < 3; i += 1) {
        try {
          const parsed = JSON.parse(current);
          if (typeof parsed === 'string') {
            current = normalizeString(parsed);
            continue;
          }
          return parsed;
        } catch (e) {
          current = normalizeString(current.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
        }
      }
      return null;
    }
    return null;
  } catch (e) {
    return null;
  }
};

const normalizeCoreQuotes = (core) => {
  if (!core) return null;
  let root = core;
  const rootKeys = Object.keys(root || {});
  if (typeof root === 'object' && rootKeys.length === 1 && typeof root[rootKeys[0]] === 'string') {
    const parsed = safeJsonParse(root[rootKeys[0]]);
    if (parsed && typeof parsed === 'object') {
      root = parsed;
    }
  }
  const result = {};
  Object.entries(root || {}).forEach(([parentKey, childValue]) => {
    let childObj = childValue;
    if (typeof childObj === 'string') {
      const parsed = safeJsonParse(childObj);
      if (parsed) childObj = parsed;
    }
    if (!childObj || typeof childObj !== 'object') return;
    const childEntries = {};
    Object.entries(childObj).forEach(([childKey, items]) => {
      let list = items;
      if (typeof list === 'string') {
        const parsedList = safeJsonParse(list);
        if (parsedList) list = parsedList;
      }
      if (list && !Array.isArray(list) && typeof list === 'object') {
        const values = Object.values(list);
        if (values.length && values.every(v => typeof v === 'object' || typeof v === 'string')) {
          list = values;
        } else {
          list = [list];
        }
      }
      if (!Array.isArray(list)) list = [];
      childEntries[childKey] = list;
    });
    result[parentKey] = childEntries;
  });
  return result;
};

// Build Category (by categoria_funcional) -> Key (parent::child) -> Items
const buildHierarchy = (normalized) => {
  if (!normalized) return { categories: {}, counts: {} };
  const categories = {};
  const counts = {};
  Object.entries(normalized).forEach(([parentKey, childObj]) => {
    Object.entries(childObj || {}).forEach(([childKey, list]) => {
      if (!Array.isArray(list)) return;
      const categoryKey = `${parentKey}::${childKey}`;
      list.forEach((item, index) => {
        const tag = String(item?.categoria_funcional || 'Sem_Tag');
        if (!categories[tag]) categories[tag] = {};
        if (!categories[tag][categoryKey]) categories[tag][categoryKey] = [];
        const nodeItem = {
          index,
          title: String(item?.titulo_frase || 'Sem título'),
          phrase: String(item?.frase_completa || ''),
          categoryKey,
          itemId: `micro-${parentKey}::${childKey}-${index}`
        };
        categories[tag][categoryKey].push(nodeItem);
      });
    });
  });
  // counts
  Object.keys(categories).forEach(tag => {
    counts[tag] = Object.keys(categories[tag]).length;
  });
  return { categories, counts };
};

const CanvasLibraryView = ({ newsData, onTransferItem, onOpenCardModal, compact = false, sidebarOnRight = false, enableSidebarToggle = false, initialSidebarCollapsed = false, transparentSidebar = false }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialSidebarCollapsed);
  const [rfInstance, setRfInstance] = useState(null);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [activeTags, setActiveTags] = useState([]);
  const toggleSidebar = useCallback(() => setIsSidebarCollapsed((v) => !v), []);
  const didInitialCenter = useRef(false);

  // Força recálculo do Vanta quando a sidebar de categorias muda de largura
  useEffect(() => {
    const fire = () => {
      try { window.dispatchEvent(new Event('resize')); } catch {}
    };
    if (typeof window !== 'undefined') {
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(fire);
      } else {
        setTimeout(fire, 0);
      }
      const t1 = setTimeout(fire, 220); // após a transição de width (0.2s)
      const t2 = setTimeout(fire, 450); // garantia tardia
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    return undefined;
  }, [isSidebarCollapsed]);

  const toggleMultiSelect = useCallback(() => {
    setIsMultiSelect((prev) => {
      const next = !prev;
      if (next) setActiveTags([]);
      return next;
    });
  }, []);

  const handleInit = useCallback((instance) => {
    setRfInstance(instance);
    try {
      // Garantir interatividade ligada (evita canvas "travado")
      if (typeof instance.setInteractive === 'function') {
        instance.setInteractive(true);
      }
      if (import.meta.env?.DEV) console.debug('[CanvasLibraryView] onInit', { interactiveForced: true });
    } catch (e) {
      if (import.meta.env?.DEV) console.debug('[CanvasLibraryView] onInit error', e);
    }
  }, []);

  const categoryColorFor = useCallback((tag) => {
    const palette = [
      'var(--primary-green)',
      '#4A90E2',
      '#F5A623',
      '#9B59B6',
      '#E74C3C',
      '#16A085',
      '#E67E22',
      '#2C82C9'
    ];
    let hash = 0;
    const s = String(tag || '');
    for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
    const idx = Math.abs(hash) % palette.length;
    return palette[idx];
  }, []);

  const normalizedCore = useMemo(() => {
    try {
      const raw = newsData?.core_quotes;
      let parsed = null;
      if (typeof raw === 'string' || Object.prototype.toString.call(raw) === '[object String]') {
        parsed = JSON.parse(String(raw.valueOf()));
      } else {
        parsed = raw || null;
      }
      return normalizeCoreQuotes(parsed) || null;
    } catch (e) {
      return normalizeCoreQuotes(safeJsonParse(newsData?.core_quotes));
    }
  }, [newsData]);

  const hierarchy = useMemo(() => buildHierarchy(normalizedCore), [normalizedCore]);
  const allTags = useMemo(() => Object.keys(hierarchy.categories || {}), [hierarchy]);
  const memoNodeTypes = useMemo(() => nodeTypes, []);

  useEffect(() => {
    if (!isMultiSelect && !selectedTag && allTags.length > 0) setSelectedTag(allTags[0]);
  }, [allTags, selectedTag, isMultiSelect]);

  useEffect(() => {
    setIsProcessing(true);
    const { categories, counts } = hierarchy;
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80, marginx: 20, marginy: 20, ranker: 'tight-tree' });
    g.setDefaultEdgeLabel(() => ({}));

    const rfNodes = [];
    const rfEdges = [];

    // helpers to create dagre nodes
    const addGNode = (id, width, height) => {
      if (!g.hasNode(id)) g.setNode(id, { width, height });
    };

    const tagsToRender = isMultiSelect
      ? activeTags.filter((t) => categories[t])
      : (selectedTag && categories[selectedTag]) ? [selectedTag] : [];

    tagsToRender.forEach((tag) => {
      const keyObj = categories[tag];
      if (!keyObj) return;
      const categoryId = `cat-${tag}`;
      const color = categoryColorFor(tag);
      rfNodes.push({
        id: categoryId,
        type: 'categoryNode',
        data: { label: tag, count: counts[tag], color },
        position: { x: 0, y: 0 }
      });
      addGNode(categoryId, 200, 64);

      Object.entries(keyObj).forEach(([k, items]) => {
        items.forEach((item) => {
          const itemId = `item-${tag}-${k}-${item.index}`;
          rfNodes.push({
            id: itemId,
            type: 'itemNode',
            data: {
              title: item.title,
              phrase: item.phrase,
              itemId: item.itemId,
              categoryKey: item.categoryKey,
              index: item.index,
              color,
              onTransferItem,
              onOpenCardModal
            },
            position: { x: 0, y: 0 }
          });
          addGNode(itemId, 320, 130);
        });
      });
    });

    // Layout
    let withPositions = [];
    if (isMultiSelect) {
      // Layout linear por categoria, categorias empilhadas verticalmente
      const categoryWidth = 200;
      const categoryHeight = 64;
      const itemWidth = 320;
      const itemHeight = 130;
      const gapX = 40;
      const gapY = 180;
      const startX = categoryWidth + 60; // início dos itens à direita do título da categoria

      let currentY = 0;
      tagsToRender.forEach((tag) => {
        const catId = `cat-${tag}`;
        const catNode = rfNodes.find((n) => n.id === catId);
        if (catNode) {
          const catY = currentY + (itemHeight - categoryHeight) / 2;
          withPositions.push({ ...catNode, position: { x: 0, y: catY } });
        }
        const children = rfNodes.filter((n) => n.type === 'itemNode' && n.id.startsWith(`item-${tag}-`));
        children.forEach((n, idx) => {
          const x = startX + idx * (itemWidth + gapX);
          const y = currentY;
          withPositions.push({ ...n, position: { x, y }, data: { ...n.data } });
        });
        currentY += itemHeight + gapY;
      });
    } else {
      // Estratégia híbrida para categoria única
      const useRadial = rfNodes.filter(n => n.type === 'itemNode').length >= 6;
      if (useRadial) {
        const centerX = 0;
        const centerY = 0;
        const categoryNode = rfNodes.find(n => n.type === 'categoryNode');
        if (categoryNode) {
          withPositions.push({ ...categoryNode, position: { x: centerX - 100, y: centerY - 40 } });
        }
        const children = rfNodes.filter(n => n.type === 'itemNode');
        const itemsPerRing = 10;
        const ringCount = Math.max(1, Math.ceil(children.length / itemsPerRing));
        const baseRadius = 420;
        const ringGap = 220;
        let placed = 0;
        for (let ring = 0; ring < ringCount; ring += 1) {
          const remaining = children.length - placed;
          const countInRing = Math.min(itemsPerRing, remaining);
          if (countInRing <= 0) break;
          const radius = baseRadius + ring * ringGap;
          const angleStep = (2 * Math.PI) / countInRing;
          const startAngle = -Math.PI / 2 + (ring % 2 === 0 ? 0 : angleStep / 2);
          for (let j = 0; j < countInRing; j += 1) {
            const n = children[placed + j];
            const angle = startAngle + j * angleStep;
            const x = centerX + radius * Math.cos(angle) - 160;
            const y = centerY + radius * Math.sin(angle) - 65;
            withPositions.push({ ...n, position: { x, y }, data: { ...n.data } });
          }
          placed += countInRing;
        }
      } else {
        dagre.layout(g);
        withPositions = rfNodes.map((n) => {
          const gn = g.node(n.id);
          if (!gn) return n;
          return { ...n, position: { x: gn.x - (gn.width / 2), y: gn.y - (gn.height / 2) } };
        });
      }
    }

    const styledEdges = [];

    setNodes(withPositions);
    setEdges(styledEdges);
    if (import.meta.env?.DEV) console.debug('[CanvasLibraryView] nodes/edges', { nodes: withPositions.length, edges: styledEdges.length });
    setIsProcessing(false);
  }, [hierarchy, selectedTag, isMultiSelect, activeTags, onTransferItem, onOpenCardModal, categoryColorFor]);

  const hasData = nodes.length > 0;

  // Ajusta viewport ao finalizar layout
  useEffect(() => {
    if (!rfInstance || isProcessing) return;
    const center = () => {
      try {
        const isFirstCenter = !didInitialCenter.current;
        if (isMultiSelect) {
          if (!nodes.length) return;
          rfInstance.fitView({ padding: 0.2, includeHiddenNodes: false, duration: isFirstCenter ? 0 : 350, maxZoom: 0.75 });
          didInitialCenter.current = true;
          return;
        }
        if (!selectedTag) return;
        const categoryId = `cat-${selectedTag}`;
        const categoryNode = nodes.find(n => n.id === categoryId);
        if (!categoryNode) return;
        if (typeof rfInstance.fitView === 'function') {
          rfInstance.fitView({ nodes: [{ id: categoryId }], padding: 0.2, includeHiddenNodes: false, duration: isFirstCenter ? 0 : 350, maxZoom: 0.75 });
          didInitialCenter.current = true;
          return;
        }
        if (typeof rfInstance.setCenter === 'function') {
          const width = 200;
          const height = 64;
          const cx = categoryNode.position.x + width / 2;
          const cy = categoryNode.position.y + height / 2;
          rfInstance.setCenter(cx, cy, { zoom: 0.75, duration: isFirstCenter ? 0 : 350 });
          didInitialCenter.current = true;
        }
      } catch {}
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(center);
    } else {
      setTimeout(center, 0);
    }
  }, [rfInstance, isMultiSelect, selectedTag, isProcessing, nodes]);

  const handleCategoryClick = useCallback((t) => {
    if (isMultiSelect) {
      setActiveTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
    } else {
      setSelectedTag(t);
    }
  }, [isMultiSelect]);

  return (
    <div className="h-full flex flex-col canvas-library-view" style={{ backgroundColor: transparentSidebar ? 'transparent' : 'var(--bg-primary)' }}>
      <style>{`
        .canvas-library-view .react-flow__handle:hover {
          box-shadow: none !important;
          transform: none !important;
          background: inherit !important;
        }
        /* Garantir que os nodes recebam eventos de hover mesmo se interatividade estiver off */
        .canvas-library-view .react-flow__renderer,
        .canvas-library-view .react-flow__nodes,
        .canvas-library-view .react-flow__node {
          pointer-events: auto !important;
        }
        /* Spotlight hover para nodes de item */
        .canvas-library-view .react-flow__node-itemNode .item-node-card {
          transform-origin: center !important;
          transition: all ease-in-out 12s;
        }
        .canvas-library-view .react-flow__node-itemNode:hover .item-node-card {
          transform: scale(1.15) !important;
          box-shadow: 0 14px 34px rgba(255,255,255,0.12) !important;
          border-color: rgba(255,255,255,0.5) !important;
        }
      `}</style>

      <div className={`flex-1 flex ${sidebarOnRight ? 'flex-row-reverse' : ''}`}>
        <div
          className={`${sidebarOnRight ? 'border-l' : 'border-r'}`}
          style={{
            borderColor: 'var(--border-primary)',
            backgroundColor: transparentSidebar ? 'transparent' : 'var(--bg-secondary)',
            width: isSidebarCollapsed ? 36 : (compact ? 160 : 256),
            transition: 'width 0.2s ease',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div className={`${compact ? 'p-2' : 'p-3'} flex ${sidebarOnRight ? 'justify-start' : 'justify-end'} gap-2`} style={{ alignItems: 'center' }}>
            {enableSidebarToggle && (
              <motion.button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg border transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={`${isSidebarCollapsed ? 'Expandir' : 'Recolher'} categorias`}
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-secondary)'
                }}
              >
                {(isSidebarCollapsed
                  ? (sidebarOnRight ? <ChevronLeft size={16} /> : <ChevronRight size={16} />)
                  : (sidebarOnRight ? <ChevronRight size={16} /> : <ChevronLeft size={16} />))}
              </motion.button>
            )}
            <motion.button
              onClick={toggleMultiSelect}
              className={`p-1.5 rounded-lg border transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={isMultiSelect ? 'Desativar seleção de categorias' : 'Ativar seleção de categorias'}
              style={{
                backgroundColor: isMultiSelect ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
                borderColor: isMultiSelect ? 'var(--primary-green)' : 'var(--border-primary)',
                color: isMultiSelect ? 'var(--primary-green)' : 'var(--text-secondary)'
              }}
            >
              {isMultiSelect ? <CheckSquare size={16} /> : <Square size={16} />}
            </motion.button>
          </div>
          {!isSidebarCollapsed && (
            <div className={`${compact ? 'px-2 pb-2' : 'px-3 pb-3'} overflow-auto`} style={{ flex: 1 }}>
              <div className="text-[11px] uppercase tracking-wide mb-2 opacity-70" style={{ color: 'var(--text-secondary)' }}>Categorias</div>
              {allTags.length > 0 ? (
                allTags.map((t) => {
                  const base = categoryColorFor(t);
                  const pastel = toPastelColor(base);
                  const isSelected = isMultiSelect ? activeTags.includes(t) : (t === selectedTag);
                  return (
                    <motion.button
                      key={t}
                      onClick={() => handleCategoryClick(t)}
                      className={`w-full flex items-center gap-2 ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} rounded text-left mb-1`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                        color: 'var(--text-primary)',
                        border: `1px solid ${isSelected ? pastel : 'var(--border-primary)'}`
                      }}
                      title={t}
                    >
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pastel }} />
                      {isMultiSelect && (
                        isSelected ? <CheckSquare size={14} style={{ color: 'var(--primary-green)' }} /> : <Square size={14} style={{ color: 'var(--text-secondary)' }} />
                      )}
                      <span className={`${compact ? 'text-xs' : 'text-sm'} truncate`} style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{formatCategoryLabel(t)}</span>
                    </motion.button>
                  );
                })
              ) : (
                <div className="text-xs px-2 py-1" style={{ color: 'var(--text-secondary)' }}>Sem categorias</div>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 relative">
          {/* Fundo animado Vanta (padrão: dots branco, sem linhas) */}
          <VantaBackground 
            style={{ opacity: 0.15
             }}
            effect="dots"
            options={{
              backgroundColor: 0x0b0f12,
              color: 0xffffff,
              color2: 0xffffff,
              size: 5.0,
              spacing: 35.0,
              showLines: false
            }}
            enableAnimatedBackground={true}
          />
          {isProcessing ? (
            <div className="h-full flex items-center justify-center relative z-10">
              <motion.div
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: 'var(--primary-green)' }}
                animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              />
            </div>
          ) : hasData ? (
            <ReactFlow
              onInit={handleInit}
              nodes={nodes}
              edges={edges}
              nodeTypes={memoNodeTypes}
              // Sem linhas de conexão e sem interações de conexão
              proOptions={{ hideAttribution: true }}
              fitView
              fitViewOptions={{ padding: 0.2, includeHiddenNodes: false, maxZoom: 0.75 }}
              minZoom={0.2}
              maxZoom={1.5}
              zoomOnScroll
              zoomOnPinch
              panOnScroll
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              className="h-full relative z-10"
              style={{ background: 'transparent' }}
            >
              <Controls position="bottom-right" showInteractive={false} />
            </ReactFlow>
          ) : (
            <div className="h-full flex items-center justify-center relative z-10">
              <div className="text-center">
                <div className="mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Nenhum dado disponível para exibir no Canvas
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Verifique se a notícia possui <code>core_quotes</code> válidos com <code>categoria_funcional</code>.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CanvasLibraryView;


