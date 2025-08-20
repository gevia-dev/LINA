import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ReactFlow, Controls, applyNodeChanges, Handle, Position, addEdge, ConnectionLineType, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import { motion } from 'framer-motion';
import { FolderTree, Tags, Quote, ArrowRight, ChevronLeft, ChevronRight, CheckSquare, Square, Edit3, Save, Trash2 } from 'lucide-react';
import dagre from 'dagre';
import VantaBackground from './VantaBackground';
import { useSimplifiedTextSync } from '../../utils/useSimplifiedTextSync';

// Componente de edge customizado com botão de lixeira
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determina a cor baseada no tipo de conexão
  const getEdgeColor = () => {
    if (data?.connectionType === 'item-to-segment') {
      return '#16A085'; // Verde para Item → Segment
    } else if (data?.connectionType === 'segment-to-item') {
      return '#4A90E2'; // Azul para Segment → Item
    } else if (data?.connectionType === 'item-to-item') {
      return '#16A085'; // Verde para Item → Item
    } else if (data?.connectionType === 'start-to-segment') {
      return '#059669'; // Verde escuro para Start → Segment
    } else if (data?.connectionType === 'start-to-item') {
      return '#059669'; // Verde escuro para Start → Item
    } else if (data?.connectionType === 'segment-to-end') {
      return '#7C3AED'; // Roxo para Segment → End
    } else if (data?.connectionType === 'item-to-end') {
      return '#7C3AED'; // Roxo para Item → End
    }
    return '#4A90E2'; // Azul padrão
  };

  const edgeColor = getEdgeColor();

  // Função para remover a edge
  const onEdgeDelete = () => {
    if (data?.onDelete && typeof data.onDelete === 'function') {
      data.onDelete(id);
    } else {
      console.warn('[DEBUG] data.onDelete não encontrado ou não é função para edge:', id, data);
    }
  };

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: 2,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Botão de remoção flutuante */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
            zIndex: 1000,
          }}
          className="nodrag nopan"
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdgeDelete();
            }}
            className="edge-delete-button"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: selected ? 1 : 0.7,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: 1001,
              position: 'relative',
              pointerEvents: 'all',
            }}
            onMouseEnter={(e) => {
              e.target.style.opacity = '1';
              e.target.style.transform = 'scale(1.1)';
              e.target.style.background = 'var(--bg-primary)';
              e.target.style.borderColor = 'var(--primary-red)';
              e.target.style.zIndex = '1002';
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = selected ? '1' : '0.7';
              e.target.style.transform = 'scale(1)';
              e.target.style.background = 'var(--bg-secondary)';
              e.target.style.borderColor = 'var(--border-primary)';
              e.target.style.zIndex = '1001';
            }}
            title="Remover conexão"
          >
            <Trash2 size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

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

// Novo node para segmentação (headers dinâmicos ou padrão)
const SegmentNode = ({ data }) => {
  const getSegmentIcon = (type) => {
    switch (type) {
      case 'summary': return '📝';
      case 'body': return '📄';
      case 'conclusion': return '✅';
      case 'header': return '📋';
      default: return '📋';
    }
  };

  const getSegmentLabel = (type) => {
    switch (type) {
      case 'summary': return 'Introdução';
      case 'body': return 'Corpo';
      case 'conclusion': return 'Conclusão';
      case 'header': return 'Header';
      default: return 'Seção';
    }
  };

  return (
    <div
      className="rounded-lg border"
      style={{
        backgroundColor: '#1e1e1eb0',
        borderColor: 'var(--border-primary)',
        color: 'var(--text-primary)',
        width: 420,
        padding: 16,
        position: 'relative'
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          {getSegmentIcon(data.type)}
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
            {data.title}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {getSegmentLabel(data.type)}
          </div>
        </div>
      </div>
      
      <div className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {data.content ? (
          <div className="max-h-20 overflow-hidden">
            {data.content.length > 120 ? `${data.content.substring(0, 120)}...` : data.content}
          </div>
        ) : (
          <div className="italic opacity-60">Conecte para editar o conteúdo</div>
        )}
      </div>



      {/* Handle de entrada na parte superior */}
      <Handle
        type="target"
        position={Position.Top}
        id="segment-input"
        style={{
          width: 12,
          height: 12,
          backgroundColor: 'var(--primary-green)',
          border: '2px solid var(--bg-secondary)',
          borderRadius: '50%'
        }}
        className="segment-connection-handle"
        isConnectable={true}
        title={`Receber conexão em ${data.title}`}
        onConnect={(params) => {
        }}
      />

      {/* Handle de saída na parte inferior */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="segment-output"
        style={{
          width: 12,
          height: 12,
          backgroundColor: 'var(--primary-green)',
          border: '2px solid var(--bg-secondary)',
          borderRadius: '50%'
        }}
        className="segment-connection-handle"
        isConnectable={true}
        title={`Conectar ${data.title}`}
        onConnect={(params) => {
        }}
      />
    </div>
  );
};

// Node de Início (sempre no topo)
const StartNode = ({ data }) => {
  return (
    <div
      className="rounded-lg border"
      style={{
        backgroundColor: '#0f5132b0', // Verde mais escuro para diferenciar
        borderColor: 'var(--primary-green)',
        color: 'var(--text-primary)',
        width: 420,
        padding: 16,
        position: 'relative'
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
          style={{ backgroundColor: 'var(--primary-green)' }}
        >
          🚀
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
            Início do Texto
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Ponto de partida
          </div>
        </div>
      </div>
      
      <div className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        <div className="italic opacity-60">Conecte para começar a estrutura</div>
      </div>

      {/* Handle de saída na parte inferior (não tem entrada) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="start-output"
        style={{
          width: 12,
          height: 12,
          backgroundColor: 'var(--primary-green)',
          border: '2px solid var(--bg-secondary)',
          borderRadius: '50%'
        }}
        className="start-connection-handle"
        isConnectable={true}
        title="Conectar início do texto"
        onConnect={(params) => {
        }}
      />
    </div>
  );
};

// Node de Fim (sempre na base)
const EndNode = ({ data }) => {
  return (
    <div
      className="rounded-lg border"
      style={{
        backgroundColor: '#581c87b0', // Roxo para diferenciar
        borderColor: '#a855f7',
        color: 'var(--text-primary)',
        width: 420,
        padding: 16,
        position: 'relative'
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
          style={{ backgroundColor: '#a855f7' }}
        >
          🎯
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
            Fim do Texto
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Ponto de chegada
          </div>
        </div>
      </div>
      
      <div className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        <div className="italic opacity-60">Conecte para finalizar a estrutura</div>
      </div>

      {/* Handle de entrada na parte superior (não tem saída) */}
      <Handle
        type="target"
        position={Position.Top}
        id="end-input"
        style={{
          width: 12,
          height: 12,
          backgroundColor: '#a855f7',
          border: '2px solid var(--bg-secondary)',
          borderRadius: '50%'
        }}
        className="end-connection-handle"
        isConnectable={true}
        title="Receber conexão para finalizar"
        onConnect={(params) => {
        }}
      />
    </div>
  );
};

const ItemNode = React.memo(({ data }) => {
  const [isHovered, setIsHovered] = useState(false);
  
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
      onMouseEnter={() => { 
        setIsHovered(true);

        // Disparar evento customizado para grifar texto no editor
        const event = new CustomEvent('canvas-item-hover', { 
          detail: { 
            itemId: data?.itemId, 
            title: data?.title, 
            phrase: data?.phrase,
            action: 'enter'
          } 
        });
        window.dispatchEvent(event);
      }}
      onMouseLeave={() => { 
        setIsHovered(false);
        // Disparar evento customizado para remover grifo do texto no editor
        const event = new CustomEvent('canvas-item-hover', { 
          detail: { 
            itemId: data?.itemId, 
            title: data?.title, 
            phrase: data?.phrase,
            action: 'leave'
          } 
        });
        window.dispatchEvent(event);
      }}
      style={{
        backgroundColor: isHovered ? '#1a1a1a' : '#1212127a',
        borderColor: 'var(--border-primary)',
        color: 'var(--text-primary)',
        width: 420,
        padding: 16,
        boxShadow: isHovered ? '0 0 20px rgba(22, 163, 74, 0.4)' : 'none',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)'
      }}
    >

      <div className="rf-node-drag-area">
        <div
          className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100"
          style={{
            boxShadow: '0 10px 28px rgba(255,255,255,0.10)',
            transition: 'opacity 0.2s ease'
          }}
        />
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold truncate" style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{data.title}</span>
        </div>
        {/* Tag removida para um visual mais limpo */}
        <p className="text-sm pr-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {data.phrase}
        </p>
      </div>
      {/* Botão removido conforme solicitação; transferência pode ser acionada via double click (abre modal) e ações subsequentes */}
      
      {/* Handle de entrada na parte superior */}
              <Handle
          type="target"
          position={Position.Top}
          id="data-input"
          style={{
            width: 10,
            height: 10,
            backgroundColor: '#16a34a',
            border: '2px solid var(--bg-primary)',
            borderRadius: '50%'
        }}
        className="item-connection-handle item-connection-handle-input"
        isConnectable={true}
        title="Entrada de Dados"
        onConnect={(params) => {
        }}
      />

      {/* Handle de saída na parte inferior */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="data-output"
        style={{
          width: 10,
          height: 10,
          backgroundColor: 'var(--border-primary)',
          border: '2px solid var(--bg-primary)',
          borderRadius: '50%'
        }}
        className="item-connection-handle item-connection-handle-output"
        isConnectable={true}
        title="Saída de Dados"
        onConnect={(params) => {
        }}
      />
    </motion.div>
  );
});

const nodeTypes = {
  keyNode: KeyNode,
  itemNode: ItemNode,
  segmentNode: SegmentNode,
  startNode: StartNode,
  endNode: EndNode
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
  
  // Preserva quotes_map se existir
  if (root.quotes_map) {
    result.quotes_map = root.quotes_map;
  }
  
  Object.entries(root || {}).forEach(([parentKey, childValue]) => {
    // Pula quotes_map pois já foi processado acima
    if (parentKey === 'quotes_map') return;
    
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
  if (!normalized) return { categories: {}, segments: {} };
  const categories = {};
  const segments = {};
  
  // Busca por quotes_map nos dados para criar nodes de segmentação dinâmicos
  let quotesMap = null;
  
  
  // Tenta encontrar quotes_map em diferentes locais possíveis
  if (normalized.quotes_map) {
    // Se quotes_map é uma string JSON, faz o parse
    if (typeof normalized.quotes_map === 'string') {
      try {
        quotesMap = JSON.parse(normalized.quotes_map);
      } catch (e) {
        quotesMap = null;
      }
    } else {
      quotesMap = normalized.quotes_map;
    }
  } else if (normalized.core_quotes?.quotes_map) {
    quotesMap = normalized.core_quotes.quotes_map;
  }
  
  // Se encontrou quotes_map, cria nodes de segmentação baseados nos headers

  if (quotesMap && typeof quotesMap === 'object' && Object.keys(quotesMap).length > 0) {
    Object.keys(quotesMap).forEach((header, index) => {
      const segmentId = `segment-header-${index}`;
      segments[segmentId] = {
        type: 'header',
        title: header,
        content: '',
        itemId: segmentId,
        headerIndex: index,
        subItems: quotesMap[header] || [],
        // Adiciona informações para conexão automática
        connectedItems: [], // Será preenchido depois
        headerTitle: header // Título exato para matching
      };
    });
  } else {

    // Fallback para nodes de segmentação padrão se não houver quotes_map
  segments.summary = {
    type: 'summary',
    title: 'Introdução',
    content: '',
    itemId: 'segment-summary'
  };
  segments.body = {
    type: 'body',
    title: 'Corpo',
    content: '',
    itemId: 'segment-body'
  };
  segments.conclusion = {
    type: 'conclusion',
    title: 'Conclusão',
    content: '',
    itemId: 'segment-conclusion'
  };
  }
  
  // ADICIONAR: Nodes de início e fim sempre presentes
  segments.start = {
    type: 'start',
    title: 'Início do Texto',
    content: '',
    itemId: 'segment-start',
    headerIndex: -1, // Antes de todos os outros
    isSystemNode: true
  };
  
  segments.end = {
    type: 'end',
    title: 'Fim do Texto',
    content: '',
    itemId: 'segment-end',
    headerIndex: 999, // Depois de todos os outros
    isSystemNode: true
  };

  
  Object.entries(normalized).forEach(([parentKey, childObj]) => {
    // Pula quotes_map pois já foi processado acima
    if (parentKey === 'quotes_map') return;

    // Verifica se childObj é um objeto válido para processar
    if (!childObj || typeof childObj !== 'object') return;
  
    Object.entries(childObj).forEach(([childKey, list]) => {
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

  
  // FASE 2: Conectar automaticamente ItemNodes aos SegmentNodes baseado no título das frases
  if (quotesMap && typeof quotesMap === 'object' && Object.keys(quotesMap).length > 0) {
    
    // Criar mapa de títulos para busca eficiente e precisa
    const titleToItemMap = new Map();
    Object.entries(categories).forEach(([tag, categoryData]) => {
      Object.entries(categoryData).forEach(([categoryKey, items]) => {
        items.forEach((item) => {
          // A premissa é que os títulos são únicos
          titleToItemMap.set(item.title, {
            ...item,
            tag,
            categoryKey: `${tag}::${categoryKey}`
          });
        });
      });
    });
    
    
    // Para cada segment, encontrar os ItemNodes que pertencem a ele
    Object.entries(segments).forEach(([segmentKey, segment]) => {
      if (segment.type === 'header' && segment.subItems && segment.subItems.length > 0) {
        
        // Para cada sub-item do segment, procurar ItemNodes com título correspondente
        segment.subItems.forEach((subItemTitle, subItemIndex) => {
          // Busca direta e muito mais rápida/segura no Mapa
          const itemNode = titleToItemMap.get(subItemTitle);
          
          if (itemNode) {
            const foundItem = {
              ...itemNode,
              segmentKey,
              subItemIndex,
              connectionOrder: subItemIndex,
              categoryKey: itemNode.categoryKey
            };
            
            if (!segment.connectedItems) segment.connectedItems = [];
            segment.connectedItems.push(foundItem);
          } else {
            console.log(`[DEBUG] buildHierarchy - ⚠️ ItemNode não encontrado para: "${subItemTitle}"`);
          }
        });
        
      }
    });
  }
  
  
  return { categories, segments };
};

const CanvasLibraryView = ({ 
  newsData, 
  onTransferItem, 
  onOpenCardModal, 
  onCanvasItemDragStart, 
  onDragStart, 
  onAddToNotionSection, 
  compact = false, 
  sidebarOnRight = false, 
  enableSidebarToggle = false, 
  initialSidebarCollapsed = false, 
  transparentSidebar = false,
  editorRef = null,
  referenceMapping = null,
  onReferenceUpdate = null,
  onReindexing = null
}) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialSidebarCollapsed);
  const [rfInstance, setRfInstance] = useState(null);
  // const [isMultiSelect, setIsMultiSelect] = useState(false);
  // const [activeTags, setActiveTags] = useState([]);
  const [availableNodesByCategory, setAvailableNodesByCategory] = useState({});
  const [usedItemIds, setUsedItemIds] = useState(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [showEditModeNotification, setShowEditModeNotification] = useState(false);
  const onAddToNotionSectionRef = useRef(onAddToNotionSection);

  const savedPositionsRef = useRef(new Map());
  const skipAutoCenterRef = useRef(false);
  const skipTimerRef = useRef(null);
  
  // Hook de sincronização simplificado
  const textSync = useSimplifiedTextSync({
    nodes,
    edges,
    editorRef,
    referenceMapping,
    onReferenceUpdate: onReferenceUpdate,
    onReindexing: onReindexing
  });
  
  useEffect(() => { onAddToNotionSectionRef.current = onAddToNotionSection; }, [onAddToNotionSection]);


  const blockAutoCenter = useCallback(() => {
    try {
      skipAutoCenterRef.current = true;
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
      skipTimerRef.current = setTimeout(() => {
        skipAutoCenterRef.current = false;
        skipTimerRef.current = null;
      }, 800);
    } catch {}
  }, []);

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
    // setIsMultiSelect((prev) => {
    //   const next = !prev;
    //   if (next) setActiveTags([]);
    //   return next;
    // });
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
      // Combina core_quotes e quotes_map se disponíveis
      let combined = {};
      
      
      // Processa core_quotes
      const raw = newsData?.core_quotes;
      if (raw) {
      let parsed = null;
      if (typeof raw === 'string' || Object.prototype.toString.call(raw) === '[object String]') {
        parsed = JSON.parse(String(raw.valueOf()));
      } else {
          parsed = raw;
        }
        if (parsed) {
          combined = { ...combined, ...normalizeCoreQuotes(parsed) };
        }
      }
      
      // Adiciona quotes_map se disponível
      if (newsData?.quotes_map) {
        combined.quotes_map = newsData.quotes_map;
      }
      
      return Object.keys(combined).length > 0 ? combined : null;
    } catch (e) {
      console.warn('[CanvasLibraryView] Erro ao processar dados:', e);
      return null;
    }
  }, [newsData]);

  const hierarchy = useMemo(() => buildHierarchy(normalizedCore), [normalizedCore]);
  const allTags = useMemo(() => Object.keys(hierarchy.categories || {}), [hierarchy]);
  const memoNodeTypes = useMemo(() => nodeTypes, []);

  // Comentado para evitar inicialização automática que quebra a visualização
  // useEffect(() => {
  //   if (!isMultiSelect && !selectedTag && allTags.length > 0) setSelectedTag(allTags[0]);
  // }, [allTags, selectedTag, isMultiSelect]);

  useEffect(() => {
    setIsProcessing(true);
    const { categories, segments } = hierarchy;
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80, marginx: 20, marginy: 20, ranker: 'tight-tree' });
    g.setDefaultEdgeLabel(() => ({}));

    const rfNodes = [];
    const rfEdges = [];

    // Variáveis de layout (declaradas no início para evitar erros de referência)
    const categoryWidth = 200;
    const categoryHeight = 64;
    const itemWidth = 320;
    const gapY = 40; // Espaçamento vertical entre elementos
    const categoryGap = 120; // Espaçamento entre diferentes categorias
    const categoryHorizontalGap = 80; // Espaçamento horizontal entre elementos

    // helpers to create dagre nodes
    const addGNode = (id, width, height) => {
      if (!g.hasNode(id)) g.setNode(id, { width, height });
    };

    // Adiciona nodes de segmentação primeiro (posicionados verticalmente)
    const segmentKeys = Object.keys(segments);
    
    segmentKeys.forEach((segmentKey, index) => {
      const segment = segments[segmentKey];
      if (segment) {
        const segmentId = segment.itemId;
        const nodeData = {
          id: segmentId,
          type: segment.type === 'start' ? 'startNode' : segment.type === 'end' ? 'endNode' : 'segmentNode',
          data: {
            type: segment.type,
            title: segment.title,
            content: segment.content,
            itemId: segment.itemId,
            headerIndex: segment.headerIndex,
            subItems: segment.subItems || [],
            connectedItems: segment.connectedItems || [],
            isSystemNode: segment.isSystemNode || false
          },
          position: { x: 0, y: 0 }
        };
        rfNodes.push(nodeData);
        addGNode(segmentId, 420, 120);
        
        // Criar edges automáticas para ItemNodes conectados (apenas para segments normais)
        if (segment.type !== 'start' && segment.type !== 'end' && segment.connectedItems && segment.connectedItems.length > 0) {
          
          // 1. Conecta o SegmentNode ao primeiro ItemNode
          const firstItem = segment.connectedItems[0];
          if (firstItem) {
            const edgeId = `edge-${segmentId}-${firstItem.itemId}`;
            const edge = {
              id: edgeId,
              source: segmentId,
              target: firstItem.itemId,
              sourceHandle: 'segment-output',
              targetHandle: 'data-input',
              type: 'custom',
              data: { 
                connectionType: 'segment-to-item',
                onDelete: onEdgeDelete
              },
              style: { strokeWidth: 2 }
            };
            
            rfEdges.push(edge);
          }

          // 2. Conecta os ItemNodes em sequência (em cadeia) - CORREÇÃO AQUI
          for (let i = 0; i < segment.connectedItems.length - 1; i++) {
            const currentItem = segment.connectedItems[i];
            const nextItem = segment.connectedItems[i + 1];

            if (currentItem && nextItem) {
              const edgeId = `edge-${currentItem.itemId}-${nextItem.itemId}`;
              const edge = {
                id: edgeId,
                source: currentItem.itemId,
                target: nextItem.itemId,
                sourceHandle: 'data-output', // CORRIGIDO: era 'segment-output', agora é 'data-output'
                targetHandle: 'data-input',
                type: 'custom',
                data: { 
                  connectionType: 'item-to-item',
                  onDelete: onEdgeDelete
                },
                style: { strokeWidth: 2 }
              };
              
              rfEdges.push(edge);
            }
          }
          
          // 3. ADICIONAL: Conecta o último ItemNode ao próximo SegmentNode (se houver)
          const lastItem = segment.connectedItems[segment.connectedItems.length - 1];
          const nextSegmentIndex = segment.headerIndex + 1;
          const nextSegmentId = `segment-header-${nextSegmentIndex}`;
          
          // Verifica se existe o próximo segment
          if (lastItem && segments[nextSegmentId]) {
            const edgeId = `edge-${lastItem.itemId}-${nextSegmentId}`;
            const edge = {
              id: edgeId,
              source: lastItem.itemId,
              target: nextSegmentId,
              sourceHandle: 'data-output',
              targetHandle: 'segment-input',
              type: 'custom',
              data: { 
                connectionType: 'item-to-segment',
                onDelete: onEdgeDelete
              },
              style: { strokeWidth: 2 }
            };
            
            rfEdges.push(edge);
          }
        }
      }
    });

    // NOVA LÓGICA: Criar conexões automáticas com nodes de início e fim
    const startNodeId = 'segment-start';
    const endNodeId = 'segment-end';
    
    // Conectar o node de início ao primeiro segment (se houver)
    const firstSegmentKey = Object.keys(segments).find(key => 
      segments[key].type !== 'start' && segments[key].type !== 'end'
    );
    
    if (firstSegmentKey && segments[firstSegmentKey]) {
      const firstSegment = segments[firstSegmentKey];
      const edgeId = `edge-${startNodeId}-${firstSegment.itemId}`;
      const edge = {
        id: edgeId,
        source: startNodeId,
        target: firstSegment.itemId,
        sourceHandle: 'start-output',
        targetHandle: 'segment-input',
        type: 'custom',
        data: { 
          connectionType: 'start-to-segment',
          onDelete: onEdgeDelete
        },
        style: { strokeWidth: 2 }
      };
      
      rfEdges.push(edge);
    }
    
    // Conectar o último segment ao node de fim (se houver)
    const lastSegmentKey = Object.keys(segments).find(key => 
      segments[key].type !== 'start' && segments[key].type !== 'end'
    );
    
    if (lastSegmentKey && segments[lastSegmentKey]) {
      const lastSegment = segments[lastSegmentKey];
      const edgeId = `edge-${lastSegment.itemId}-${endNodeId}`;
      const edge = {
        id: edgeId,
        source: lastSegment.itemId,
        target: endNodeId,
        sourceHandle: 'segment-output',
        targetHandle: 'end-input',
        type: 'custom',
        data: { 
          connectionType: 'segment-to-end',
          onDelete: onEdgeDelete
        },
        style: { strokeWidth: 2 }
      };
      
      rfEdges.push(edge);
    }

      // Exibir todos os nós quando nenhuma tag estiver selecionada (visualização inicial completa)
  const tagsToRender = Object.keys(hierarchy.categories || []); // Sempre mostrar todas as categorias
      
  // Log para debug: verificar por que tagsToRender está vazio


    // FILTRO: Só criar ItemNodes que estão conectados aos segments
    const connectedItemIds = new Set();

    // Coletar todos os IDs dos items que estão conectados aos segments
    Object.values(segments).forEach(segment => {
      if (segment.connectedItems && segment.connectedItems.length > 0) {
        segment.connectedItems.forEach(connectedItem => {
          connectedItemIds.add(connectedItem.itemId);
        });
      }
    });


    tagsToRender.forEach((tag) => {
      const keyObj = categories[tag];
      if (!keyObj) return;
      
      const categoryId = `cat-${tag}`;
      const color = categoryColorFor(tag);
      


      Object.entries(keyObj).forEach(([k, items]) => {
        items.forEach((item) => {
          // FILTRO: Só criar ItemNodes que estão conectados aos segments
          if (connectedItemIds.has(item.itemId)) {
            
            rfNodes.push({
              id: item.itemId,
              type: 'itemNode',
              data: {
                title: item.title,
                phrase: item.phrase,
                itemId: item.itemId,
                categoryKey: item.categoryKey,
                index: item.index,
                color,
                isConnected: true, // Marcar como conectado
                onTransferItem,
                onOpenCardModal,
                onAddToNotionSection: (sectionId, payload) => {
                  try {
                    const fn = onAddToNotionSectionRef.current;
                    if (typeof fn === 'function') { fn(sectionId, payload); }
                  } catch {}
                },
              },
              position: { x: 0, y: 0 }
            });
            addGNode(item.itemId, 420, 130);
          } else {
          }
        });
      });
    });
    
    // Log para debug: mostrar todos os IDs dos ItemNodes criados
    const itemNodeIds = rfNodes.filter(n => n.type === 'itemNode').map(n => n.id);
    
    // Log para debug: mostrar todas as edges criadas

    // Layout simplificado: todos os nodes em linha vertical
    let withPositions = [];

    // Configurações de layout vertical
    const nodeWidth = 420; // Largura padrão para todos os nodes (1.5x mais largo)
    const segmentHeight = 120; // Altura dos SegmentNodes
    const itemHeight = 130; // Altura dos ItemNodes
    const marginY = 120; // Margin vertical entre nodes (aumentado para 120px)
    const startX = 0; // Todos os nodes no mesmo eixo X
    let currentY = 0; // Posição Y atual

    // Obter segments ordenados por headerIndex
    const sortedSegmentKeys = Object.keys(segments).sort((a, b) => {
      const segmentA = segments[a];
      const segmentB = segments[b];
      return (segmentA.headerIndex || 0) - (segmentB.headerIndex || 0);
    });


    // Posicionar cada segment seguido dos seus ItemNodes conectados
    sortedSegmentKeys.forEach((segmentKey) => {
      const segment = segments[segmentKey];
      if (!segment) return;

      const segmentId = segment.itemId;
      
      // 1. Posicionar o SegmentNode
      const segmentNode = rfNodes.find(n => n.id === segmentId);
      if (segmentNode) {
        const positionedSegment = { 
          ...segmentNode, 
          position: { x: startX, y: currentY } 
        };
        withPositions.push(positionedSegment);
        
        // Avançar Y para o próximo elemento
        currentY += segmentHeight + marginY;
      }

      // 2. Posicionar os ItemNodes conectados em sequência vertical
      if (segment.connectedItems && segment.connectedItems.length > 0) {
        
        segment.connectedItems.forEach((connectedItem, itemIndex) => {
          const itemId = connectedItem.itemId;
          
          const itemNode = rfNodes.find(n => n.id === itemId);
          
          if (itemNode) {
            const positionedItem = { 
              ...itemNode, 
              position: { x: startX, y: currentY },
              data: { ...itemNode.data }
            };
            withPositions.push(positionedItem);
            
            
            // Avançar Y para o próximo elemento
            currentY += itemHeight + marginY;
          } else {
          }
        });
      }
    });

    // ADICIONAR: Posicionar node de início no topo
    const startNode = rfNodes.find(n => n.id === 'segment-start');
    if (startNode) {
      const positionedStart = { 
        ...startNode, 
        position: { x: startX, y: -segmentHeight - marginY } // Acima de tudo
      };
      withPositions.unshift(positionedStart); // Adiciona no início do array
    }
    
    // ADICIONAR: Posicionar node de fim na base
    const endNode = rfNodes.find(n => n.id === 'segment-end');
    if (endNode) {
      const positionedEnd = { 
        ...endNode, 
        position: { x: startX, y: currentY } // Após todos os outros
      };
      withPositions.push(positionedEnd);
    }


    // Adicionar ItemNodes independentes que não estão conectados a segments
    const independentItems = rfNodes.filter(n => 
      n.type === 'itemNode' && 
      !withPositions.find(positioned => positioned.id === n.id)
    );
    independentItems.forEach((itemNode) => {
      const positionedItem = { 
        ...itemNode, 
        position: { x: startX + nodeWidth + 100, y: currentY }, // Posiciona à direita
        data: { ...itemNode.data }
      };
      withPositions.push(positionedItem);
      currentY += itemHeight + marginY;
    });


    // Preserva posições arrastadas manualmente quando em modo edição
    const positioned = withPositions.map((n) => {
      if (isEditMode) {
        const saved = savedPositionsRef.current.get(n.id);
        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
          return { ...n, position: saved };
        }
      }
      return n;
    });

    const styledEdges = rfEdges;

    // Evita re-render cascata após pequenos updates (como add ao editor)
    setNodes((prev) => {
      const same = prev.length === positioned.length && prev.every((p, i) => p.id === positioned[i].id && p.position.x === positioned[i].position.x && p.position.y === positioned[i].position.y);
      return same ? prev : positioned;
    });
    setEdges((prev) => {
      const same = prev.length === styledEdges.length;
      return same ? prev : styledEdges;
    });
    if (import.meta.env?.DEV) console.debug('[CanvasLibraryView] nodes/edges', { nodes: withPositions.length, edges: styledEdges.length });
    setIsProcessing(false);
  }, [hierarchy, selectedTag, categoryColorFor]);

  const hasData = nodes.length > 0;
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

  // Handler padrão de conexão do React Flow
  const onConnect = useCallback(async (params) => {
    
    // Determina o tipo de conexão baseado nos handles
    let connectionType = 'default';
    if (params.sourceHandle === 'data-output' && params.targetHandle === 'segment-input') {
      connectionType = 'item-to-segment';
    } else if (params.sourceHandle === 'segment-output' && params.targetHandle === 'data-input') {
      connectionType = 'segment-to-item';
    } else if (params.sourceHandle === 'data-output' && params.targetHandle === 'data-input') {
      connectionType = 'item-to-item';
    } else if (params.sourceHandle === 'start-output' && params.targetHandle === 'segment-input') {
      connectionType = 'start-to-segment';
    } else if (params.sourceHandle === 'start-output' && params.targetHandle === 'data-input') {
      connectionType = 'start-to-item';
    } else if (params.sourceHandle === 'segment-output' && params.targetHandle === 'end-input') {
      connectionType = 'segment-to-end';
    } else if (params.sourceHandle === 'data-output' && params.targetHandle === 'end-input') {
      connectionType = 'item-to-end';
    }
    
    const newEdge = addEdge(
      {
        ...params,
        type: 'custom',
        data: { 
          connectionType,
          onDelete: onEdgeDelete // Passa a função de remoção
        },
        style: { strokeWidth: 2 }
      },
      edges
    );
    
    setEdges(newEdge);
    
    // SIMPLIFICADO: O hook já detecta e processa automaticamente
  }, [edges]);

  // Handler para remover edges
  const onEdgeDelete = useCallback(async (edgeId) => {
    
    setEdges((currentEdges) => {
      const filtered = currentEdges.filter(edge => edge.id !== edgeId);
      return filtered;
    });
    
    // SIMPLIFICADO: O hook já processa automaticamente
  }, [edges]);



  // Ajusta viewport ao finalizar layout (APENAS na inicialização)
  useEffect(() => {
    if (!rfInstance || isProcessing) return;
    const center = () => {
      try {
        if (isEditMode || skipAutoCenterRef.current) return;
        const isFirstCenter = !didInitialCenter.current;
        
        // SÓ centraliza na primeira vez, não após adicionar nodes
        if (!isFirstCenter) return;
        
        // Centralização unificada para layout vertical
        const segmentNodes = nodes.filter(n => n.type === 'segmentNode');
        const hasSegments = segmentNodes.length > 0;
        
        if (!hasSegments) return;
        
        // Coleta todos os nodes para centralizar
        const allNodesToCenter = [];
        
        // Adiciona nodes de segmentação (headers dinâmicos ou padrão)
        if (hasSegments) {
          allNodesToCenter.push(...segmentNodes);
        }
        
        // Adiciona alguns nodes de dados para melhor centralização
        const itemNodes = nodes.filter(n => n.type === 'itemNode');
        if (itemNodes.length > 0) {
          // Adiciona apenas alguns nodes de dados para não sobrecarregar a visualização
          const sampleItems = itemNodes.slice(0, Math.min(3, itemNodes.length));
          allNodesToCenter.push(...sampleItems);
        }
        
        if (allNodesToCenter.length > 0) {
          if (typeof rfInstance.fitView === 'function') {
            // Ajusta padding baseado no modo de seleção
            const padding = 0.4;
            const maxZoom = 0.8;
            
            rfInstance.fitView({ 
              nodes: allNodesToCenter, 
              padding: padding, 
              includeHiddenNodes: false, 
              duration: 0, // Sem animação para primeira centralização
              maxZoom: maxZoom 
            });
            didInitialCenter.current = true;
            return;
          }
        }
      } catch {}
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(center);
    } else {
      setTimeout(center, 0);
    }
  }, [rfInstance, selectedTag, isProcessing, nodes, isEditMode]);

  const handleCategoryClick = useCallback(async (categoryTag) => {
    if (!rfInstance) return;
    
    try {
      // Verificar se já existem nodes desta categoria no canvas
      const existingCategoryNodes = nodes.filter(node => 
        node.type === 'itemNode' && 
        node.data.categoryKey && 
        (node.data.categoryKey.includes(categoryTag) || node.data.categoryTag === categoryTag) &&
        node.data.isFromLibrary // Só considerar os que vieram da biblioteca
      );
      
      const hasNodesInCanvas = existingCategoryNodes.length > 0;
      
      if (hasNodesInCanvas) {
        // REMOVER: Se já tem nodes da categoria no canvas, remove todos
        setNodes(prevNodes => {
          const filtered = prevNodes.filter(node => 
            !(node.type === 'itemNode' && 
              node.data.categoryKey && 
              (node.data.categoryKey.includes(categoryTag) || node.data.categoryTag === categoryTag) &&
              node.data.isFromLibrary)
          );
          return filtered;
        });
        
        // Atualizar set de IDs usados
        setUsedItemIds(prev => {
          const newSet = new Set(prev);
          existingCategoryNodes.forEach(node => newSet.delete(node.data.itemId));
          return newSet;
        });
        
        return;
      }
      
      // ADICIONAR: Se não tem nodes no canvas, adiciona os disponíveis
      const viewport = rfInstance.getViewport();
      const zoom = viewport.zoom;
      
      // Calcular posição central do viewport visível
      const centerX = (-viewport.x + (window.innerWidth * 0.6) / 2) / zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / zoom;
      
      // Obter nodes disponíveis desta categoria
      const categoryData = hierarchy.categories[categoryTag];
      if (!categoryData) return;
      
      const availableNodes = [];
      const currentUsedIds = new Set();
      
      // Coletar IDs dos nodes já posicionados no canvas
      nodes.forEach(node => {
        if (node.type === 'itemNode') {
          currentUsedIds.add(node.data.itemId);
        }
      });
      
      // Encontrar nodes não utilizados desta categoria
      Object.entries(categoryData).forEach(([categoryKey, items]) => {
        items.forEach((item) => {
          if (!currentUsedIds.has(item.itemId)) {
            availableNodes.push({
              ...item,
              categoryTag,
              categoryKey,
              color: categoryColorFor(categoryTag)
            });
          }
        });
      });
      
      if (availableNodes.length === 0) {
        return;
      }
      
      // Criar novos nodes posicionados em grid
      const newNodes = [];
      const gridCols = Math.ceil(Math.sqrt(availableNodes.length));
      const nodeSpacing = 460;
      const startX = centerX - ((gridCols - 1) * nodeSpacing) / 2;
      const startY = centerY - ((Math.ceil(availableNodes.length / gridCols) - 1) * nodeSpacing) / 2;
      
      availableNodes.forEach((item, index) => {
        const col = index % gridCols;
        const row = Math.floor(index / gridCols);
        const x = startX + col * nodeSpacing;
        const y = startY + row * nodeSpacing;
        
        const newNode = {
          id: item.itemId,
          type: 'itemNode',
          data: {
            title: item.title,
            phrase: item.phrase,
            itemId: item.itemId,
            categoryKey: item.categoryKey,
            index: item.index,
            color: item.color,
            isFromLibrary: true, // Marcar como vindo da biblioteca
            categoryTag: categoryTag, // Adicionar referência à categoria
            onTransferItem,
            onOpenCardModal,
            onAddToNotionSection: (sectionId, payload) => {
              try {
                const fn = onAddToNotionSectionRef.current;
                if (typeof fn === 'function') { fn(sectionId, payload); }
              } catch {}
            },
          },
          position: { x, y }
        };
        
        newNodes.push(newNode);
      });
      
      // Adicionar novos nodes ao canvas
      setNodes(prevNodes => [...prevNodes, ...newNodes]);
      
      // Atualizar set de IDs usados
      setUsedItemIds(prev => {
        const newSet = new Set(prev);
        availableNodes.forEach(item => newSet.add(item.itemId));
        return newSet;
      });
      
      // ATIVAR MODO DE EDIÇÃO automaticamente quando adicionar nodes
      setIsEditMode(true);
      
      // Mostrar notificação temporária
      setShowEditModeNotification(true);
      setTimeout(() => setShowEditModeNotification(false), 3000); // Esconder após 3 segundos
      
    } catch (error) {
      console.error('[DEBUG] Erro ao processar categoria:', error);
    }
  }, [rfInstance, hierarchy, nodes, categoryColorFor, onTransferItem, onOpenCardModal, onAddToNotionSectionRef]);



  // Modificar o estilo do botão de categoria para detectar estado no canvas
  const getCategoryButtonStyle = useCallback((categoryTag) => {
    const categoryData = hierarchy.categories[categoryTag];
    if (!categoryData) return { available: 0, total: 0, inCanvas: false };
    
    let total = 0;
    let available = 0;
    
    // Verificar se há nodes desta categoria no canvas
    const hasNodesInCanvas = nodes.some(node => 
      node.type === 'itemNode' && 
      node.data.categoryKey && 
      (node.data.categoryKey.includes(categoryTag) || node.data.categoryTag === categoryTag) &&
      node.data.isFromLibrary
    );
    
    Object.entries(categoryData).forEach(([categoryKey, items]) => {
      items.forEach((item) => {
        total++;
        if (!usedItemIds.has(item.itemId)) {
          available++;
        }
      });
    });
    
    return { available, total, inCanvas: hasNodesInCanvas };
  }, [hierarchy.categories, usedItemIds, nodes]);

  // Adicionar useEffect para atualizar nodes usados
  useEffect(() => {
    const currentUsedIds = new Set();
    nodes.forEach(node => {
      if (node.type === 'itemNode') {
        currentUsedIds.add(node.data.itemId);
      }
    });
    setUsedItemIds(currentUsedIds);
  }, [nodes]);

  return (
    <div className={`h-full flex flex-col canvas-library-view ${isEditMode ? 'is-edit-mode' : ''}`} style={{ backgroundColor: transparentSidebar ? 'transparent' : 'var(--bg-primary)' }}>
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
          box-shadow: 0 14px 34px rgba(22, 163, 74, 0.25) !important;
        }
        /* Nodes de segmentação sem animações */
        .canvas-library-view .react-flow__node-segmentNode {
          transform-origin: center !important;
        }
        
        /* Estilos para handles de conexão */
        .canvas-library-view .segment-connection-handle {
          transition: all 0.2s ease;
        }
        
        .canvas-library-view .segment-connection-handle:hover {
          transform: scale(1.2);
          box-shadow: 0 0 8px rgba(16, 160, 133, 0.6);
        }
        
        /* Estilos para handles dos ItemNodes */
        .canvas-library-view .item-connection-handle {
          transition: all 0.2s ease;
        }
        
        .canvas-library-view .item-connection-handle:hover {
          transform: scale(1.2);
        }
        
        .canvas-library-view .item-connection-handle-input:hover {
          box-shadow: 0 0 8px rgba(16, 160, 133, 0.6);
        }
        
        .canvas-library-view .item-connection-handle-output:hover {
          box-shadow: 0 0 8px rgba(156, 163, 175, 0.6);
        }
        
        /* Estilos para o botão de remoção de edges */
        .canvas-library-view .edge-delete-button {
          z-index: 1000 !important;
          pointer-events: all !important;
          position: relative !important;
          cursor: pointer !important;
        }
        
        .canvas-library-view .edge-delete-button:hover {
          background: var(--bg-primary) !important;
          border-color: var(--primary-red) !important;
          box-shadow: 0 0 8px rgba(220, 53, 69, 0.3) !important;
          z-index: 1002 !important;
        }
        
        .canvas-library-view .edge-delete-button:hover svg {
          color: #ffffff !important;
        }
        
        /* Forçar interatividade do botão */
        .canvas-library-view .edge-delete-button:active {
          transform: scale(0.95) !important;
        }
        
        /* Garantir que o EdgeLabelRenderer tenha prioridade */
        .canvas-library-view .react-flow__edge-label-renderer {
          z-index: 999 !important;
          pointer-events: all !important;
        }
        
        /* Prevenir interferência do React Flow */
        .canvas-library-view .react-flow__edge {
          pointer-events: none !important;
        }
        
        .canvas-library-view .react-flow__edge-path {
          pointer-events: none !important;
        }
        
        /* Garantir que o botão seja clicável */
        .canvas-library-view .edge-delete-button,
        .canvas-library-view .edge-delete-button * {
          pointer-events: all !important;
          user-select: none !important;
        }
        
        /* Garantir que o EdgeLabelRenderer seja interativo */
        .canvas-library-view .react-flow__edge-label-renderer {
          pointer-events: all !important;
        }
        
        /* Prevenir interferência do React Flow nas edges */
        .canvas-library-view .react-flow__edge {
          pointer-events: none !important;
        }
        
        .canvas-library-view .react-flow__edge-path {
          pointer-events: none !important;
        }
        
        /* Popup hover opções */
        .canvas-library-view .popup-menu button:hover {
          background-color: var(--bg-tertiary) !important;
        }
        
        /* Estilos para handles dos nodes de início e fim */
        .canvas-library-view .start-connection-handle {
          transition: all 0.2s ease;
        }
        
        .canvas-library-view .start-connection-handle:hover {
          transform: scale(1.2);
          box-shadow: 0 0 8px rgba(5, 150, 105, 0.6);
        }
        
        .canvas-library-view .end-connection-handle {
          transition: all 0.2s ease;
        }
        
        .canvas-library-view .end-connection-handle:hover {
          transform: scale(1.2);
          box-shadow: 0 0 8px rgba(124, 58, 237, 0.6);
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
            {/* Botão de toggle multiselect removido/comentado */}
            {/*
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
            */}
          </div>
          {!isSidebarCollapsed && (
            <div className={`${compact ? 'px-2 pb-2' : 'px-3 pb-3'} overflow-auto`} style={{ flex: 1 }}>
              <div className="text-[11px] uppercase tracking-wide mb-2 opacity-70" style={{ color: 'var(--text-secondary)' }}>Categorias</div>
              {allTags.length > 0 ? (
                allTags.map((t) => {
                  const base = categoryColorFor(t);
                  const pastel = toPastelColor(base);
                  const { available, total, inCanvas } = getCategoryButtonStyle(t);
                  const hasAvailable = available > 0;
                  const canInteract = hasAvailable || inCanvas;
                  
                  return (
                    <motion.button
                      key={t}
                      onClick={() => handleCategoryClick(t)}
                      disabled={!canInteract}
                      className={`w-full flex items-center gap-2 ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} rounded text-left mb-1`}
                      whileHover={canInteract ? { scale: 1.01 } : {}}
                      whileTap={canInteract ? { scale: 0.98 } : {}}
                      style={{
                        backgroundColor: inCanvas ? 'var(--primary-green-transparent)' : (hasAvailable ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'),
                        color: inCanvas ? 'var(--primary-green)' : (hasAvailable ? 'var(--text-primary)' : 'var(--text-secondary)'),
                        border: `1px solid ${inCanvas ? 'var(--primary-green)' : (hasAvailable ? pastel : 'var(--border-primary)')}`,
                        opacity: canInteract ? 1 : 0.5,
                        cursor: canInteract ? 'pointer' : 'not-allowed'
                      }}
                      title={
                        inCanvas 
                          ? `Clique para remover categoria do canvas`
                          : (hasAvailable 
                              ? `Clique para adicionar ${available} nodes disponíveis` 
                              : `Todos os ${total} nodes já estão no canvas`
                            )
                      }
                    >
                      <span 
                        className="inline-block w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: pastel }} 
                      />
                      <span 
                        className={`${compact ? 'text-xs' : 'text-sm'} truncate flex-1`} 
                        style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}
                      >
                        {formatCategoryLabel(t)}
                      </span>
                      {inCanvas ? (
                        <span 
                          className="text-xs px-1.5 py-0.5 rounded-full" 
                          style={{ 
                            backgroundColor: 'var(--primary-green)',
                            color: 'white'
                          }}
                        >
                          ativo
                        </span>
                      ) : (
                        <span 
                          className="text-xs px-1.5 py-0.5 rounded-full" 
                          style={{ 
                            backgroundColor: hasAvailable ? 'var(--primary-green-transparent)' : 'var(--bg-primary)',
                          color: hasAvailable ? 'var(--primary-green)' : 'var(--text-secondary)'
                          }}
                        >
                          {available}/{total}
                        </span>
                      )}
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
          {/* Botão de modo edição (canto superior esquerdo) */}
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
            
            {/* Indicador de sincronização simplificado */}
            <motion.div
              className="p-2 rounded-lg border flex items-center gap-2"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: textSync.isProcessing ? 'var(--primary-green)' : 'var(--border-primary)',
                color: textSync.isProcessing ? 'var(--primary-green)' : 'var(--text-secondary)'
              }}
              title={textSync.isProcessing ? 'Inserindo texto...' : 'Pronto'}
            >
              <div 
                className={`w-2 h-2 rounded-full ${textSync.isProcessing ? 'animate-pulse' : ''}`}
                style={{ 
                  backgroundColor: textSync.isProcessing ? 'var(--primary-green)' : 'var(--text-secondary)' 
                }}
              />
              <span className="text-xs font-medium">
                {textSync.isProcessing ? 'Inserindo' : 'Pronto'}
              </span>
            </motion.div>
            
            {/* Notificação de modo de edição ativado automaticamente */}
            {isEditMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-12 left-0 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                style={{ zIndex: 30 }}
              >
                Modo de edição ativo
              </motion.div>
            )}
            
            {/* Notificação temporária quando ativado automaticamente */}
            {showEditModeNotification && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-12 left-0 bg-blue-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
                style={{ zIndex: 40 }}
              >
                ✨ Modo de edição ativado automaticamente!
              </motion.div>
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
            <>
              <ReactFlow
              onInit={handleInit}
              nodes={nodes}
              edges={edges}
              nodeTypes={memoNodeTypes}
              edgeTypes={{ custom: CustomEdge }}
              connectionLineType={ConnectionLineType.SmoothStep}
              defaultEdgeOptions={{
                type: 'custom',
                style: { strokeWidth: 2, stroke: '#4A90E2' }
              }}
              proOptions={{ hideAttribution: true }}
              fitView
              fitViewOptions={{ padding: 0.2, includeHiddenNodes: false, maxZoom: 0.75 }}
              minZoom={0.2}
              maxZoom={1.5}
              zoomOnScroll
              zoomOnPinch
              panOnScroll
              panOnDrag={!isEditMode}
              nodesDraggable={isEditMode}
              nodesConnectable={true}
              elementsSelectable={isEditMode}
              edgesFocusable={true}
              edgesUpdatable={false}
              className="h-full relative z-10"
              style={{ background: 'transparent' }}
              onNodesChange={onNodesChange}
              onConnect={onConnect}
              onEdgeClick={(e, edge) => {
                console.log('[DEBUG] Edge clicada:', edge.id);
                console.log('[DEBUG] Edge data:', edge.data);
                console.log('[DEBUG] Edge event:', e);
              }}
              onNodeDrag={(e, node) => {
                blockAutoCenter();
                savedPositionsRef.current.set(node.id, node.position);
                setNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, position: node.position } : n));
              }}
              onNodeDragStop={(e, node) => {
                blockAutoCenter();
                savedPositionsRef.current.set(node.id, node.position);
                setNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, position: node.position } : n));
              }}
            >
              <Controls position="bottom-right" showInteractive={false} />
            </ReactFlow>
            </>
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


