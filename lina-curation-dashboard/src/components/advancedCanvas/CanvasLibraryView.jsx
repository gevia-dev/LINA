import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, ConnectionLineType } from '@xyflow/react';
import { motion } from 'framer-motion';
import { FolderTree, Tags, Quote, ArrowRight } from 'lucide-react';
import dagre from 'dagre';

// Node renderers
const CategoryNode = ({ data }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
      className="rounded-lg border shadow-sm"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: data.color || 'var(--primary-green)',
        color: 'var(--text-primary)',
        width: 200,
        padding: 12,
        borderWidth: 2
      }}
    >
      <div className="flex items-center gap-2">
        <Tags size={16} style={{ color: data.color || 'var(--primary-green)' }} />
        <span className="text-sm font-semibold" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{data.label}</span>
      </div>
      {typeof data.count === 'number' && (
        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{data.count} chaves</div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        style={{ left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, background: data.color || 'var(--primary-green)', border: 'none' }}
      />
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
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        style={{ left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, background: data.color || 'var(--primary-green)', border: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        style={{ left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, background: data.color || 'var(--primary-green)', border: 'none' }}
      />
    </motion.div>
  );
};

const ItemNode = ({ data, sourcePosition, targetPosition }) => {
  const handleTransfer = useCallback((e) => {
    e.stopPropagation();
    if (data && typeof data.onTransferItem === 'function') {
      if (import.meta.env?.DEV) console.debug('[CanvasLibraryView] transfer', { itemId: data.itemId });
      data.onTransferItem(data.itemId, data.phrase);
    }
  }, [data]);

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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border relative group"
      onDoubleClick={handleOpen}
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: data.color || 'var(--border-primary)',
        color: 'var(--text-primary)',
        width: 320,
        padding: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Quote size={14} style={{ color: data.color || 'var(--primary-green)' }} />
        <span className="text-sm font-semibold truncate" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{data.title}</span>
      </div>
      <div className="mb-1">
        {data.categoryKey && (
          (() => {
            const parts = String(data.categoryKey).split('::');
            const child = parts[1] || data.categoryKey;
            return (
              <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--primary-green-transparent)', color: 'var(--text-secondary)' }}>
                {child}
              </span>
            );
          })()
        )}
      </div>
      <p className="text-xs pr-10" style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        {data.phrase}
      </p>
      <motion.button
        onClick={handleTransfer}
        className="absolute right-2 bottom-2 p-2 rounded-full border opacity-0 group-hover:opacity-100"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        title="Transferir"
        style={{ borderColor: data.color || 'var(--primary-green)', color: data.color || 'var(--primary-green)', backgroundColor: 'var(--primary-green-transparent)' }}
      >
        <ArrowRight size={16} />
      </motion.button>
      <Handle
        type="source"
        position={sourcePosition ?? Position.Right}
        id="out"
        style={{ width: 8, height: 8, background: data.color || 'var(--primary-green)', border: 'none' }}
      />
      <Handle
        type="target"
        position={targetPosition ?? Position.Top}
        id="in"
        style={{ width: 8, height: 8, background: data.color || 'var(--primary-green)', border: 'none' }}
      />
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

const CanvasLibraryView = ({ newsData, onTransferItem, onOpenCardModal }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');

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

  useEffect(() => {
    if (!selectedTag && allTags.length > 0) setSelectedTag(allTags[0]);
  }, [allTags, selectedTag]);

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

    if (selectedTag && categories[selectedTag]) {
      const tag = selectedTag;
      const keyObj = categories[tag];
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
          g.setEdge(categoryId, itemId);
        });
      });
    }

    // Layout
    // Estratégia híbrida: se o número de filhos for grande, usar radial; senão, usar dagre (top-bottom)
    const useRadial = rfNodes.filter(n => n.type === 'itemNode').length >= 6;
    let withPositions = [];
    if (useRadial) {
      // Centro para a categoria
      const centerX = 0;
      const centerY = 0;
      const categoryNode = rfNodes.find(n => n.type === 'categoryNode');
      if (categoryNode) {
        withPositions.push({ ...categoryNode, position: { x: centerX - 100, y: centerY - 40 } });
      }
      const children = rfNodes.filter(n => n.type === 'itemNode');
      const itemsPerRing = 10; // mais espaçado por anel
      const ringCount = Math.max(1, Math.ceil(children.length / itemsPerRing));
      const baseRadius = 420; // mais afastado do centro
      const ringGap = 220; // distância entre anéis

      let placed = 0;
      for (let ring = 0; ring < ringCount; ring += 1) {
        const remaining = children.length - placed;
        const countInRing = Math.min(itemsPerRing, remaining);
        if (countInRing <= 0) break;

        const radius = baseRadius + ring * ringGap;
        const angleStep = (2 * Math.PI) / countInRing;
        const startAngle = -Math.PI / 2 + (ring % 2 === 0 ? 0 : angleStep / 2); // alterna offset por anel

        for (let j = 0; j < countInRing; j += 1) {
          const n = children[placed + j];
          const angle = startAngle + j * angleStep;
          const x = centerX + radius * Math.cos(angle) - 160; // 320/2 largura
          const y = centerY + radius * Math.sin(angle) - 65;  // altura aprox 130/2

          // Ângulo em graus normalizado para (-180, 180]
          let angleDeg = (angle * 180) / Math.PI;
          if (angleDeg > 180) angleDeg -= 360;
          if (angleDeg <= -180) angleDeg += 360;

          // Mapeamento de ângulo para posições dos handles
          let sourcePos = Position.Left;
          let targetPos = Position.Right;
          if (angleDeg >= 45 && angleDeg <= 135) {
            sourcePos = Position.Top;
            targetPos = Position.Bottom;
          } else if (angleDeg > 135 || angleDeg <= -135) {
            sourcePos = Position.Right;
            targetPos = Position.Left;
          } else if (angleDeg >= -135 && angleDeg <= -45) {
            sourcePos = Position.Bottom;
            targetPos = Position.Top;
          } else {
            sourcePos = Position.Left;
            targetPos = Position.Right;
          }

          withPositions.push({
            ...n,
            position: { x, y },
            // Passar também via props do node para o componente
            sourcePosition: sourcePos,
            targetPosition: targetPos,
            data: { ...n.data }
          });
        }
        placed += countInRing;
      }
    } else {
      dagre.layout(g);
      withPositions = rfNodes.map((n) => {
        const gn = g.node(n.id);
        if (!gn) return n;
        return {
          ...n,
          position: { x: gn.x - (gn.width / 2), y: gn.y - (gn.height / 2) }
        };
      });
    }

    const styledEdges = rfEdges.length > 0 ? rfEdges : (() => {
      const edgesArr = Array.from(g.edges && typeof g.edges === 'function' ? g.edges() : []);
      const hasGraphEdges = edgesArr.length > 0;
      const pairs = hasGraphEdges ? edgesArr.map(e => [e.v, e.w]) : (() => {
        const cat = withPositions.find(n => n.type === 'categoryNode');
        const items = withPositions.filter(n => n.type === 'itemNode');
        return cat ? items.map(it => [cat.id, it.id]) : [];
      })();
      return pairs.map(([src, dst], idx) => ({
        id: `e-${src}-${dst}-${idx}`,
        source: src,
        target: dst,
        sourceHandle: 'out',
        targetHandle: 'in',
        type: 'default',
        animated: true,
        style: { stroke: 'rgba(255, 255, 255, 0.7)', strokeWidth: 2 }
      }));
    })();

    setNodes(withPositions);
    setEdges(styledEdges);
    if (import.meta.env?.DEV) console.debug('[CanvasLibraryView] nodes/edges', { nodes: withPositions.length, edges: styledEdges.length });
    setIsProcessing(false);
  }, [hierarchy, selectedTag, onTransferItem, onOpenCardModal, categoryColorFor]);

  const hasData = nodes.length > 0;

  return (
    <div className="h-full flex flex-col canvas-library-view" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <style>{`
        .canvas-library-view .react-flow__handle:hover {
          box-shadow: none !important;
          transform: none !important;
          background: inherit !important;
        }
      `}</style>
      <div className="p-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-2">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <FolderTree size={18} style={{ color: 'var(--primary-green)' }} />
          </motion.div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>Visão em Canvas</span>
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="ml-3 text-xs px-2 py-1 rounded border"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
            >
              {allTags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="flex-1">
        {isProcessing ? (
          <div className="h-full flex items-center justify-center">
            <motion.div
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: 'var(--primary-green)' }}
              animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
          </div>
        ) : hasData ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
            minZoom={0.2}
            maxZoom={1.5}
            zoomOnScroll
            zoomOnPinch
            panOnScroll
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            className="h-full"
            style={{ background: 'var(--bg-primary)' }}
          >
            <Background color="var(--border-primary)" gap={16} />
            <MiniMap
              nodeStrokeColor={() => 'var(--primary-green)'}
              nodeColor={() => 'var(--bg-secondary)'}
              maskColor="rgba(0,0,0,0.2)"
            />
            <Controls position="bottom-right" />
          </ReactFlow>
        ) : (
          <div className="h-full flex items-center justify-center">
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
  );
};

export default CanvasLibraryView;


