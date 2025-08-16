// src/components/advancedCanvas/CanvasLibraryViewWithProximity.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ReactFlow, Controls, applyNodeChanges, applyEdgeChanges, ReactFlowProvider, Background, Handle, Position } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderTree, Tags, Quote, ArrowRight, ChevronLeft, ChevronRight, CheckSquare, Square, Edit3, Save, Plus, Link, Zap, FileText } from 'lucide-react';
import dagre from 'dagre';
import VantaBackground from './VantaBackground';
import { useProximityConnections } from '../../hooks/useProximityConnections';

// Formatadores e utilitários (mantém os existentes)
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

const formatCategoryLabel = (value) => {
  try {
    const raw = String(value || '').trim();
    const withSpaces = raw.replace(/_/g, ' ');
    return withSpaces.replace(/\b([a-z])(\w*)/gi, (m, p1, p2) => p1.toUpperCase() + p2.toLowerCase());
  } catch {
    return String(value || '');
  }
};

// Node Segmentado Principal - Representa seções do texto
const SegmentNode = ({ data, selected }) => {
  const isMainLine = data.isMainLine || false;
  const segment = data.segment || 'intro';
  const order = data.order || 0;
  
  const segmentColors = {
    intro: '#2BB24C',
    body: '#4A90E2', 
    conclusion: '#F5A623'
  };
  
  const color = segmentColors[segment] || '#A0A0A0';
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
      className={`rounded-lg border-2 ${isMainLine ? 'ring-2 ring-offset-2' : ''}`}
      style={{
        backgroundColor: isMainLine ? 'var(--bg-primary)' : 'var(--bg-secondary)',
        borderColor: color,
        color: 'var(--text-primary)',
        width: 280,
        minHeight: 120,
        padding: 16,
        ringColor: isMainLine ? color : 'transparent',
        ringOffsetColor: 'var(--bg-primary)',
        boxShadow: selected ? `0 0 20px ${color}40` : 'none'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText size={16} style={{ color }} />
          <span className="text-sm font-semibold" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
            {data.label || `Segmento ${order + 1}`}
          </span>
        </div>
        {isMainLine && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Zap size={14} style={{ color }} />
          </motion.div>
        )}
      </div>
      
      {data.content && (
        <div className="text-xs mt-2 p-2 rounded" style={{ 
          backgroundColor: 'var(--bg-tertiary)', 
          color: 'var(--text-secondary)',
          maxHeight: 60,
          overflow: 'hidden'
        }}>
          {data.content.substring(0, 100)}...
        </div>
      )}
      
      <div className="flex justify-between items-center mt-3">
        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {data.wordCount || 0} palavras
        </span>
        {data.connected && (
          <Link size={12} style={{ color: 'var(--primary-green)' }} />
        )}
      </div>
      
      {/* Handles para conexões */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ backgroundColor: color }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ backgroundColor: color }}
      />
    </motion.div>
  );
};

// Mantém os nodes existentes e adiciona o novo
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
        <span className="text-sm font-semibold" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
          {formatCategoryLabel(data.label)}
        </span>
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
        <span className="text-sm font-medium" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
          {data.label}
        </span>
      </div>
      {typeof data.count === 'number' && (
        <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          {data.count} itens
        </div>
      )}
    </motion.div>
  );
};

const ItemNode = React.memo(({ data }) => {
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

  const [showPicker, setShowPicker] = React.useState(false);
  const popoverRef = React.useRef(null);
  const buttonRef = React.useRef(null);

  React.useEffect(() => {
    if (!showPicker) return undefined;
    const handleDocClick = (e) => {
      try {
        const target = e.target;
        if (popoverRef.current && popoverRef.current.contains(target)) return;
        if (buttonRef.current && buttonRef.current.contains(target)) return;
        setShowPicker(false);
      } catch {}
    };
    document.addEventListener('mousedown', handleDocClick, true);
    document.addEventListener('touchstart', handleDocClick, true);
    return () => {
      document.removeEventListener('mousedown', handleDocClick, true);
      document.removeEventListener('touchstart', handleDocClick, true);
    };
  }, [showPicker]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="item-node-card rounded-lg border relative group"
      onDoubleClick={handleOpen}
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-primary)',
        color: 'var(--text-primary)',
        width: 320,
        padding: 12,
        boxShadow: 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
      }}
    >
      {(typeof data?.onAddToInventory === 'function' || typeof data?.onAddToNotionSection === 'function') && (
        <div className="absolute top-2 right-2 z-20 pointer-events-auto">
          <motion.button
            ref={buttonRef}
            onMouseDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => {
              try {
                e.stopPropagation();
                if (typeof data?.onAddToInventory === 'function') {
                  data.onAddToInventory({
                    title: data.title,
                    content: data.phrase,
                    itemId: data.itemId,
                    categoryKey: data.categoryKey,
                    nodeType: 'micro'
                  });
                  return;
                }
                setShowPicker((v) => !v);
              } catch {}
            }}
            className="p-2.5 rounded-md border opacity-0 group-hover:opacity-100 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={typeof data?.onAddToInventory === 'function' ? 'Adicionar ao Inventário' : 'Adicionar ao Editor'}
            style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
          >
            <Plus size={14} />
          </motion.button>
        </div>
      )}
      
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="rf-node-drag-area">
        <div className="flex items-center gap-2 mb-2">
          <Quote size={14} style={{ color: toPastelColor(data.color) }} />
          <span className="text-sm font-semibold truncate" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
            {data.title}
          </span>
        </div>
        <p className="text-sm pr-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {data.phrase}
        </p>
      </div>
    </motion.div>
  );
});

const nodeTypes = {
  categoryNode: CategoryNode,
  keyNode: KeyNode,
  itemNode: ItemNode,
  segmentNode: SegmentNode,
};

// Componente principal com proximidade
const CanvasLibraryViewWithProximity = ({ 
  newsData, 
  onTransferItem, 
  onOpenCardModal,
  onCanvasItemDragStart,
  onDragStart,
  onAddToNotionSection,
  onAddToInventory,
  onMainLineUpdate, // Novo callback para sincronizar com editor
  compact = false,
  sidebarOnRight = false,
  enableSidebarToggle = false,
  initialSidebarCollapsed = false,
  transparentSidebar = false,
  enableProximityConnections = true, // Nova prop
}) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialSidebarCollapsed);
  const [rfInstance, setRfInstance] = useState(null);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [activeTags, setActiveTags] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showMainLine, setShowMainLine] = useState(true);
  
  const onAddToNotionSectionRef = useRef(onAddToNotionSection);
  const onAddToInventoryRef = useRef(onAddToInventory);
  const savedPositionsRef = useRef(new Map());
  const skipAutoCenterRef = useRef(false);
  const skipTimerRef = useRef(null);
  
  useEffect(() => { onAddToNotionSectionRef.current = onAddToNotionSection; }, [onAddToNotionSection]);
  useEffect(() => { onAddToInventoryRef.current = onAddToInventory; }, [onAddToInventory]);

  // Parsing e normalização (mantém o existente)
  const safeJsonParse = (input) => {
    const normalizeString = (s) => {
      if (typeof s !== 'string') return s;
      let normalized = s.trim();
      const first = normalized.indexOf('{');
      const last = normalized.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        normalized = normalized.slice(first, last + 1);
      }
      normalized = normalized.replace(/[""]/g, '"').replace(/['']/g, "'");
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
    Object.keys(categories).forEach(tag => {
      counts[tag] = Object.keys(categories[tag]).length;
    });
    return { categories, counts };
  };

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

  // Adiciona nodes de segmento para linha principal
  const createMainLineNodes = useCallback(() => {
    if (!showMainLine) return [];
    
    const segments = [
      { id: 'main-intro', segment: 'intro', label: 'Introdução', order: 0 },
      { id: 'main-body-1', segment: 'body', label: 'Desenvolvimento 1', order: 1 },
      { id: 'main-body-2', segment: 'body', label: 'Desenvolvimento 2', order: 2 },
      { id: 'main-conclusion', segment: 'conclusion', label: 'Conclusão', order: 3 }
    ];
    
    return segments.map((seg, idx) => ({
      id: seg.id,
      type: 'segmentNode',
      data: {
        ...seg,
        isMainLine: true,
        content: '',
        wordCount: 0,
        connected: false
      },
      position: { x: 100 + idx * 350, y: 50 },
      draggable: true
    }));
  }, [showMainLine]);

  // Build nodes layout
  useEffect(() => {
    setIsProcessing(true);
    const { categories, counts } = hierarchy;
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80, marginx: 20, marginy: 20, ranker: 'tight-tree' });
    g.setDefaultEdgeLabel(() => ({}));

    const rfNodes = [];
    const rfEdges = [];

    // Adiciona nodes da linha principal
    if (showMainLine) {
      const mainLineNodes = createMainLineNodes();
      rfNodes.push(...mainLineNodes);
    }

    // Adiciona nodes existentes
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
        position: { x: 0, y: 200 }
      });

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
              onOpenCardModal,
              onAddToNotionSection: (sectionId, payload) => {
                try {
                  const fn = onAddToNotionSectionRef.current;
                  if (typeof fn === 'function') { fn(sectionId, payload); }
                } catch {}
              },
              onAddToInventory: (payload) => {
                try {
                  const fn = onAddToInventoryRef.current;
                  if (typeof fn === 'function') { fn(payload); }
                } catch {}
              }
            },
            position: { x: 0, y: 350 + items.indexOf(item) * 150 },
            draggable: true
          });
        });
      });
    });

    setNodes(rfNodes);
    setEdges(rfEdges);
    setIsProcessing(false);
  }, [hierarchy, selectedTag, isMultiSelect, activeTags, categoryColorFor, showMainLine, createMainLineNodes]);

  const onNodesChange = useCallback((changes) => {
    try {
      setNodes((nds) => applyNodeChanges(changes, nds));
      changes.forEach((c) => {
        if (c.type === 'position' && c.id && c.position) {
          savedPositionsRef.current.set(c.id, c.position);
        }
      });
    } catch {}
  }, []);

  const onEdgesChange = useCallback((changes) => {
    try {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    } catch {}
  }, []);

  const handleInit = useCallback((instance) => {
    setRfInstance(instance);
    try {
      if (typeof instance.setInteractive === 'function') {
        instance.setInteractive(true);
      }
    } catch (e) {
      console.debug('[CanvasLibraryView] onInit error', e);
    }
  }, []);

  const hasData = nodes.length > 0;

  return (
    <ReactFlowProvider>
      <div className="h-full flex flex-col canvas-library-view" style={{ backgroundColor: transparentSidebar ? 'transparent' : 'var(--bg-primary)' }}>
        <style>{`
          .canvas-library-view .react-flow__edge.proximity-edge {
            cursor: pointer !important;
          }
          .canvas-library-view .react-flow__edge.proximity-edge-temp {
            opacity: 0.5 !important;
            animation: pulse 1s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.7; }
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
                  onClick={() => setIsSidebarCollapsed(v => !v)}
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
                onClick={() => setShowMainLine(v => !v)}
                className="p-1.5 rounded-lg border transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={showMainLine ? 'Ocultar linha principal' : 'Mostrar linha principal'}
                style={{
                  backgroundColor: showMainLine ? 'var(--primary-green-transparent)' : 'var(--bg-tertiary)',
                  borderColor: showMainLine ? 'var(--primary-green)' : 'var(--border-primary)',
                  color: showMainLine ? 'var(--primary-green)' : 'var(--text-secondary)'
                }}
              >
                <Zap size={16} />
              </motion.button>
              
              <motion.button
                onClick={() => setIsMultiSelect(v => !v)}
                className={`p-1.5 rounded-lg border transition-colors`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isMultiSelect ? 'Desativar seleção múltipla' : 'Ativar seleção múltipla'}
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: isMultiSelect ? 'var(--primary-green)' : 'var(--border-primary)',
                  color: isMultiSelect ? 'var(--primary-green)' : 'var(--text-secondary)'
                }}
              >
                {isMultiSelect ? <CheckSquare size={16} /> : <Square size={16} />}
              </motion.button>
            </div>
            
            {!isSidebarCollapsed && (
              <div className={`${compact ? 'px-2 pb-2' : 'px-3 pb-3'} overflow-auto`} style={{ flex: 1 }}>
                <div className="text-[11px] uppercase tracking-wide mb-2 opacity-70" style={{ color: 'var(--text-secondary)' }}>
                  Categorias
                </div>
                {allTags.length > 0 ? (
                  allTags.map((t) => {
                    const base = categoryColorFor(t);
                    const pastel = toPastelColor(base);
                    const isSelected = isMultiSelect ? activeTags.includes(t) : (t === selectedTag);
                    return (
                      <motion.button
                        key={t}
                        onClick={() => {
                          if (isMultiSelect) {
                            setActiveTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
                          } else {
                            setSelectedTag(t);
                          }
                        }}
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
                        <span className={`${compact ? 'text-xs' : 'text-sm'} truncate`} style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
                          {formatCategoryLabel(t)}
                        </span>
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
            <VantaBackground 
              style={{ opacity: 0.15 }}
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
            
            <div className="absolute top-2 left-2 z-20 flex gap-2">
              <motion.button
                onClick={() => setIsEditMode((v) => !v)}
                className="p-2 rounded-lg border"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isEditMode ? 'Sair do modo edição' : 'Ativar modo edição'}
                style={{
                  backgroundColor: isEditMode ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
                  borderColor: isEditMode ? 'var(--primary-green)' : 'var(--border-primary)',
                  color: isEditMode ? 'var(--primary-green)' : 'var(--text-secondary)'
                }}
              >
                {isEditMode ? <Save size={16} /> : <Edit3 size={16} />}
              </motion.button>
              
              {enableProximityConnections && (
                <motion.button
                  className="p-2 rounded-lg border"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Conexões por proximidade ativas"
                  style={{
                    backgroundColor: 'var(--primary-green-transparent)',
                    borderColor: 'var(--primary-green)',
                    color: 'var(--primary-green)'
                  }}
                >
                  <Link size={16} />
                </motion.button>
              )}
            </div>

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
              <ProximityFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={memoNodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onInit={handleInit}
                isEditMode={isEditMode}
                enableProximityConnections={enableProximityConnections}
                onMainLineUpdate={onMainLineUpdate}
              />
            ) : (
              <div className="h-full flex items-center justify-center relative z-10">
                <div className="text-center">
                  <div className="mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Nenhum dado disponível para exibir no Canvas
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
};

// Componente interno do ReactFlow com proximidade
const ProximityFlow = ({ 
  nodes, 
  edges, 
  nodeTypes, 
  onNodesChange, 
  onEdgesChange,
  onInit,
  isEditMode,
  enableProximityConnections,
  onMainLineUpdate
}) => {
  // Hook de proximidade
  const {
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    mainLineNodes
  } = useProximityConnections({
    enabled: enableProximityConnections,
    proximityThreshold: 200,
    bridgeThreshold: 250,
    onMainLineUpdate: (mainLine) => {
      console.log('Linha principal atualizada:', mainLine);
      if (onMainLineUpdate) onMainLineUpdate(mainLine);
    },
    nodeFilter: (node) => {
      // Filtra apenas nodes que devem participar das conexões
      return node.type === 'segmentNode' || node.type === 'itemNode';
    }
  });

  useEffect(() => {
    // Destaca nodes da linha principal
    if (mainLineNodes.length > 0) {
      console.log('Nodes na linha principal:', mainLineNodes.map(n => n.id));
    }
  }, [mainLineNodes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onInit={onInit}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStart={enableProximityConnections ? onNodeDragStart : undefined}
      onNodeDrag={enableProximityConnections ? onNodeDrag : undefined}
      onNodeDragStop={enableProximityConnections ? onNodeDragStop : undefined}
      fitView
      fitViewOptions={{ padding: 0.2, includeHiddenNodes: false, maxZoom: 0.75 }}
      minZoom={0.2}
      maxZoom={1.5}
      zoomOnScroll
      zoomOnPinch
      panOnScroll
      panOnDrag={!isEditMode}
      nodesDraggable={isEditMode || enableProximityConnections}
      nodesConnectable={false}
      elementsSelectable={isEditMode}
      className="h-full relative z-10"
      style={{ background: 'transparent' }}
    >
      <Background variant="dots" gap={20} size={1} />
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  );
};

export default CanvasLibraryViewWithProximity;