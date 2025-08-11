import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useNodeConnections, useNodesData, useReactFlow } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers as LayersIcon, Quote as QuoteIcon, Braces as BracesIcon } from 'lucide-react';
import { 
  Monitor, 
  Eye,
  Layers, 
  FileText, 
  Database,
  Maximize2,
  Minimize2,
  Link,
  X
} from 'lucide-react';
import { marked } from 'marked';
import '@blocknote/react/style.css';
import { useMonitorHierarchy } from '../../../hooks/useMonitorHierarchy';

const MonitorNode = ({ data, selected }) => {
  const { 
    id,
    title = 'Monitor',
    displayMode = 'structured',
    autoRefresh = true,
    showHeaders = true
  } = data;

  const [isExpanded, setIsExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentDisplayMode] = useState('structured');
  const [aggregatedContent, setAggregatedContent] = useState('');
  const [contentSections, setContentSections] = useState([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeEditorSection, setActiveEditorSection] = useState('Introdução');
  const [drafts, setDrafts] = useState({});

  const connections = useNodeConnections({ nodeId: id, handleType: 'target' });
  const connectedNodeIds = useMemo(() => connections.map(conn => conn.source), [connections]);
  const connectedNodesData = useNodesData(connectedNodeIds);
  const { getNodes, getEdges } = useReactFlow();

  const traceConnectionChain = useCallback((endNodeId, visited = new Set()) => {
    if (visited.has(endNodeId)) return [];
    visited.add(endNodeId);
    const chain = [];
    const edges = getEdges();
    const nodes = getNodes();
    const currentNode = nodes.find(node => node.id === endNodeId);
    if (!currentNode) return chain;
    const incomingEdges = edges.filter(edge => edge.target === endNodeId);
    for (const edge of incomingEdges) {
      const previousChain = traceConnectionChain(edge.source, new Set(visited));
      chain.unshift(...previousChain);
    }
    chain.push({ id: currentNode.id, data: currentNode.data, order: chain.length });
    return chain;
  }, [getNodes, getEdges]);

  const getOrderedNodes = useCallback(() => {
    if (!connectedNodesData || connectedNodesData.length === 0) return [];
    const allChains = [];
    const processedNodes = new Set();
    connectedNodesData.forEach(nodeData => {
      if (!nodeData?.id || processedNodes.has(nodeData.id)) return;
      const chain = traceConnectionChain(nodeData.id);
      if (chain.length > 0) {
        allChains.push(chain);
        chain.forEach(node => processedNodes.add(node.id));
      }
    });
    const orderedNodes = [];
    const seenNodes = new Set();
    allChains.forEach(chain => {
      chain.forEach(node => {
        if (!seenNodes.has(node.id)) {
          seenNodes.add(node.id);
          orderedNodes.push({ ...node, order: orderedNodes.length });
        }
      });
    });
    return orderedNodes;
  }, [connectedNodesData, traceConnectionChain]);

  const processContent = useCallback(() => {
    const orderedNodes = getOrderedNodes();
    if (orderedNodes.length === 0) {
      setAggregatedContent('');
      setContentSections([]);
      return;
    }
    const sections = [];
    let combinedContent = '';
    orderedNodes.forEach((nodeData, index) => {
      if (!nodeData?.data) return;
      const { content, title: nodeTitle, nodeType, coreKey } = nodeData.data;
      if (!content) return;
      const section = {
        id: nodeData.id,
        title: nodeTitle || `Bloco ${index + 1}`,
        content,
        type: nodeType || coreKey || 'default',
        order: index,
        isChainNode: true
      };
      sections.push(section);
      if (currentDisplayMode === 'combined') {
        combinedContent += content + '\n\n';
      } else if (currentDisplayMode === 'structured') {
        if (showHeaders) combinedContent += `### ${section.title}\n\n`;
        combinedContent += content + '\n\n---\n\n';
      } else if (currentDisplayMode === 'markdown') {
        try {
          const parsed = marked.parse(content);
          combinedContent += parsed + '\n';
        } catch {
          combinedContent += content + '\n\n';
        }
      }
    });
    setContentSections(sections);
    setAggregatedContent(combinedContent.trim());
  }, [getOrderedNodes, currentDisplayMode, showHeaders]);

  useEffect(() => { if (autoRefresh) processContent(); }, [connectedNodesData, processContent, autoRefresh]);
  const toggleExpanded = useCallback(() => setIsExpanded(v => !v), []);

  const renderContent = () => {
    if (currentDisplayMode === 'structured') return <StructuredMonitorView connectionsCount={connections.length} />;
    if (!aggregatedContent) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] opacity-50">
          <Monitor size={48} style={{ color: 'var(--text-secondary)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Conecte nodes para visualizar conteúdo</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{connections.length} conexão{connections.length !== 1 ? 'ões' : ''}</p>
          <div className="mt-4 p-3 rounded-lg border border-dashed" style={{ borderColor: 'var(--primary-green)' }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--primary-green)' }}>
              <Link size={12} />
              <span>Detecta automaticamente cadeias de conexões</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>Ex: Introdução → Corpo → Conclusão</p>
          </div>
        </div>
      );
    }
    return (
      <div className="prose" style={{ color: 'var(--text-primary)', fontFamily: '"Nunito Sans", "Inter", sans-serif', fontSize: '16px', lineHeight: '1.8', maxWidth: 'none' }}>
        {aggregatedContent}
      </div>
    );
  };

  const nodeWidth = isFullscreen ? '90vw' : isExpanded ? '800px' : '500px';
  const nodeMaxHeight = isFullscreen ? '90vh' : isExpanded ? '1200px' : '800px';

  return (
    <motion.div className={`monitor-node ${isFullscreen ? 'fullscreen-monitor' : ''}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
      style={{ width: nodeWidth, minHeight: '600px', maxHeight: nodeMaxHeight, backgroundColor: '#0A0A0A', border: selected ? '2px solid var(--primary-green)' : '1px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden', position: isFullscreen ? 'fixed' : 'relative', top: isFullscreen ? '50%' : 'auto', left: isFullscreen ? '50%' : 'auto', transform: isFullscreen ? 'translate(-50%, -50%)' : 'none', zIndex: isFullscreen ? 9999 : 1, display: 'flex', flexDirection: 'column' }}>
      <div className="monitor-header flex items-center justify-between p-3 border-b" style={{ backgroundColor: '#141414', borderColor: '#2A2A2A' }}>
        <div className="flex items-center gap-2">
          <Monitor size={18} style={{ color: 'var(--primary-green)' }} />
          <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{title}</h3>
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--primary-green-transparent)', color: 'var(--primary-green)' }}>{connections.length} fonte{connections.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <motion.button onClick={() => { try { const nodes = getNodes(); const parents = nodes.filter((n) => n.id === 'summary' || n.id === 'body' || n.id === 'conclusion' || n?.data?.title === 'Introdução' || n?.data?.title === 'Corpo' || n?.data?.title === 'Conclusão'); const newDrafts = {}; parents.forEach((p) => { newDrafts[p.id] = p?.data?.content || ''; }); setDrafts(newDrafts); setActiveEditorSection('Introdução'); } catch {} setIsEditorOpen(true); }} className="p-1.5 rounded transition-colors nopan nowheel nodrag" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }} whileHover={{ backgroundColor: 'var(--bg-tertiary)' }} whileTap={{ scale: 0.95 }} title="Editar conteúdo">
            <FileText size={14} />
          </motion.button>
          <motion.button onClick={toggleExpanded} className="p-1.5 rounded transition-colors nopan nowheel nodrag" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }} whileHover={{ backgroundColor: 'var(--bg-tertiary)' }} whileTap={{ scale: 0.95 }} title={isExpanded ? 'Minimizar' : 'Expandir'}>
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </motion.button>
        </div>
      </div>
      <div className="monitor-content flex-1 overflow-auto p-6" style={{ backgroundColor: '#0F0F0F' }}>
        <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      </div>
      <div className="monitor-footer px-3 py-2 border-t text-xs" style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: 'var(--text-secondary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
        <div className="flex items-center justify-between">
          <span>{aggregatedContent.length} caracteres • {contentSections.length} seções</span>
          <span className="flex items-center gap-1"><Eye size={12} />Preview ao vivo</span>
        </div>
      </div>
      <Handle type="target" position={Position.Top} id="monitor-input" title="Conecte nodes para visualizar" style={{ left: '10px', right: 'auto', top: '65px' }} />
      <style>{`
        .monitor-node { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); }
        .fullscreen-monitor { box-shadow: 0 0 100px rgba(43, 178, 76, 0.2); }
        .monitor-content::-webkit-scrollbar { width: 8px; height: 8px; }
        .monitor-content::-webkit-scrollbar-track { background: #1A1A1A; }
        .monitor-content::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .monitor-content::-webkit-scrollbar-thumb:hover { background: #444; }
      `}</style>
      {createPortal(
        <AnimatePresence>
          {isEditorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-start" onClick={() => setIsEditorOpen(false)}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, x: '-100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative h-full flex flex-col" style={{ width: '70vw', maxWidth: '1280px', backgroundColor: 'var(--bg-primary)', borderRight: '1px solid var(--border-primary)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
                    <FileText size={18} style={{ color: 'var(--primary-green)' }} />
                    <span className="text-sm font-medium">Editor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditorOpen(false)} className="p-2 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }} title="Fechar editor"><X size={16} /></button>
                  </div>
                </div>
                <div className="p-3 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                  <div className="flex gap-2">
                    {[
                      { id: 'summary', title: 'Introdução' },
                      { id: 'body', title: 'Corpo' },
                      { id: 'conclusion', title: 'Conclusão' }
                    ].map(({ id, title }) => (
                      <button key={id} onClick={() => setActiveEditorSection(title)} className="px-3 py-1.5 rounded border text-xs" style={{ backgroundColor: activeEditorSection === title ? 'var(--primary-green)' : 'var(--bg-primary)', borderColor: activeEditorSection === title ? 'var(--primary-green)' : 'var(--border-primary)', color: activeEditorSection === title ? 'white' : 'var(--text-secondary)' }}>{title}</button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="relative h-full">
                    <div className="absolute inset-0 pointer-events-none" style={{ left: '-80px', pointerEvents: 'auto' }} />
                    <div className="prose prose-invert max-w-none w-full h-full p-6 text-gray-300 leading-relaxed" style={{ '--tw-prose-headings': '#ffffff', '--tw-prose-body': '#d1d5db', '--tw-prose-bold': '#ffffff', '--tw-prose-links': '#60a5fa', fontFamily: '"Nunito Sans", "Inter", sans-serif' }} />
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

export default MonitorNode;

function ChildChip({ node }) {
  const role = node?.data?.nodeType || node?.data?.coreKey || node?.type;
  const isStructure = role === 'estrutura' || node?.data?.nodeType === 'estrutura' || node?.data?.coreKey === 'micro_estrutura';
  const getStructureLabel = (value) => ({ continua: 'Continua', paragrafos: 'Paragrafos', topicos: 'Topicos' }[(value || '').toLowerCase()] || 'Estrutura');
  const label = isStructure ? getStructureLabel(node?.data?.structureType) : (node?.data?.title || node?.data?.label || node?.data?.name || node?.type || 'Item');
  const Icon = isStructure ? LayersIcon : ((typeof role === 'string' && role.toLowerCase().includes('micro')) ? QuoteIcon : BracesIcon);
  const isMicro = !isStructure && typeof role === 'string' && role.toLowerCase().includes('micro');
  const chipBorderColor = isStructure ? '#F5A623' : isMicro ? '#4A90E2' : 'var(--border-primary)';
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-4 max-w-full" style={{ borderColor: chipBorderColor, color: 'var(--text-secondary)' }}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function StructuredMonitorView({ connectionsCount }) {
  const groups = useMonitorHierarchy();
  // Quando o monitor não está conectado, não exibir conteúdo algum
  if (!connectionsCount || connectionsCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] opacity-50">
        <Monitor size={48} style={{ color: 'var(--text-secondary)' }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Conecte nodes para visualizar conteúdo</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>0 conexões</p>
      </div>
    );
  }
  if (!groups?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] opacity-50">
        <Monitor size={48} style={{ color: 'var(--text-secondary)' }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Conecte nodes para visualizar conteúdo</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{connectionsCount} conexão{connectionsCount !== 1 ? 'ões' : ''}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {groups.map(({ parent, children }) => {
        const sectionContent = (parent?.data?.content || '').toString().trim();
        const hasSectionContent = sectionContent.length > 0;
        return (
          <div key={parent.id} className="rounded-lg border p-2" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-xs font-semibold opacity-80" style={{ color: 'var(--text-primary)' }}>{parent?.data?.title ?? 'Seção'}</div>
            {/* Conteúdo do próprio bloco de seção (quando houver) */}
            {hasSectionContent && (
              <div className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {sectionContent}
              </div>
            )}
            {/* Itens conectados como filhos (chips) */}
            {children.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {children.map((child) => (<ChildChip key={child.id} node={child} />))}
              </div>
            ) : !hasSectionContent ? (
              <div className="mt-1 text-[11px] opacity-60" style={{ color: 'var(--text-secondary)' }}>Sem itens</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}


