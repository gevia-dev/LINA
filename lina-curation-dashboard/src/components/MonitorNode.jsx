import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useNodeConnections, useNodesData, useReactFlow } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers as LayersIcon, Quote as QuoteIcon, Braces as BracesIcon } from 'lucide-react';
import { useMonitorHierarchy } from '../hooks/useMonitorHierarchy';
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
import * as BlockNote from '@blocknote/react';
const { BlockNoteView, useCreateBlockNote } = BlockNote;
import '@blocknote/react/style.css';

/**
 * MonitorNode - Node especial que agrega e exibe conteúdo de todos os nodes conectados
 * Funciona como uma "tela" dentro do canvas que combina conteúdos em tempo real
 */
const MonitorNode = ({ data, selected }) => {
  const { 
    id,
    title = 'Monitor',
    displayMode = 'structured', // 'structured', 'combined', 'markdown'
    autoRefresh = true,
    showHeaders = true
  } = data;

  // Estados locais
  const [isExpanded, setIsExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentDisplayMode] = useState('structured');
  const [aggregatedContent, setAggregatedContent] = useState('');
  const [contentSections, setContentSections] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeEditorSection, setActiveEditorSection] = useState('Introdução');
  const [drafts, setDrafts] = useState({});

  // Obter conexões de entrada (nodes que estão conectados a este monitor)
  const connections = useNodeConnections({
    nodeId: id,
    handleType: 'target'
  });

  // Extrair IDs dos nodes conectados
  const connectedNodeIds = useMemo(() => {
    return connections.map(conn => conn.source);
  }, [connections]);

  // Obter dados de todos os nodes conectados
  const connectedNodesData = useNodesData(connectedNodeIds);
  
  // Hook para acessar o ReactFlow instance
  const { getNodes, getEdges } = useReactFlow();

  // Função para rastrear cadeia de conexões (do início até o node atual)
  const traceConnectionChain = useCallback((endNodeId, visited = new Set()) => {
    if (visited.has(endNodeId)) return [];
    
    visited.add(endNodeId);
    const chain = [];
    
    // Obter todas as edges do ReactFlow
    const edges = getEdges();
    const nodes = getNodes();
    
    // Encontrar o node atual
    const currentNode = nodes.find(node => node.id === endNodeId);
    if (!currentNode) return chain;
    
    // Encontrar edges que chegam neste node (target)
    const incomingEdges = edges.filter(edge => edge.target === endNodeId);
    
    // Para cada edge de entrada, rastrear a cadeia primeiro
    for (const edge of incomingEdges) {
      const previousChain = traceConnectionChain(edge.source, new Set(visited));
      chain.unshift(...previousChain);
    }
    
    // Adicionar o node atual no final da cadeia
    chain.push({
      id: currentNode.id,
      data: currentNode.data,
      order: chain.length
    });
    
    return chain;
  }, [getNodes, getEdges]);

  // Função para ordenar nodes baseado na hierarquia de conexões
  const getOrderedNodes = useCallback(() => {
    if (!connectedNodesData || connectedNodesData.length === 0) {
      return [];
    }

    const allChains = [];
    const processedNodes = new Set();

    // Para cada node conectado ao monitor, rastrear sua cadeia
    connectedNodesData.forEach(nodeData => {
      if (!nodeData?.id || processedNodes.has(nodeData.id)) return;
      
      const chain = traceConnectionChain(nodeData.id);
      if (chain.length > 0) {
        allChains.push(chain);
        chain.forEach(node => processedNodes.add(node.id));
      }
    });

    // Combinar todas as cadeias e remover duplicatas
    const orderedNodes = [];
    const seenNodes = new Set();

    allChains.forEach(chain => {
      chain.forEach(node => {
        if (!seenNodes.has(node.id)) {
          seenNodes.add(node.id);
          orderedNodes.push({
            ...node,
            order: orderedNodes.length
          });
        }
      });
    });

    return orderedNodes;
  }, [connectedNodesData, traceConnectionChain]);

  // Função para processar e agregar conteúdo
  const processContent = useCallback(() => {
    const orderedNodes = getOrderedNodes();
    
    if (orderedNodes.length === 0) {
      setAggregatedContent('');
      setContentSections([]);
      return;
    }

    const sections = [];
    let combinedContent = '';

    // Processar cada node na ordem da cadeia
    orderedNodes.forEach((nodeData, index) => {
      if (!nodeData?.data) return;

      const { content, title: nodeTitle, nodeType, coreKey } = nodeData.data;
      
      if (!content) return;

      // Criar seção para este node
      const section = {
        id: nodeData.id,
        title: nodeTitle || `Bloco ${index + 1}`,
        content: content,
        type: nodeType || coreKey || 'default',
        order: index,
        isChainNode: true
      };

      sections.push(section);

      // Adicionar ao conteúdo combinado baseado no modo
      if (currentDisplayMode === 'combined') {
        // Modo combinado: juntar tudo em um texto contínuo
        combinedContent += content + '\n\n';
      } else if (currentDisplayMode === 'structured') {
        // Modo estruturado: adicionar com headers
        if (showHeaders) {
          combinedContent += `### ${section.title}\n\n`;
        }
        combinedContent += content + '\n\n---\n\n';
      } else if (currentDisplayMode === 'markdown') {
        // Modo markdown: processar e combinar
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

  // Processar conteúdo quando nodes conectados mudarem
  useEffect(() => {
    if (autoRefresh) {
      processContent();
    }
  }, [connectedNodesData, processContent, autoRefresh]);

  // Função para refresh manual
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    processContent();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [processContent]);

  // Função para copiar conteúdo
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(aggregatedContent);
    // Poderia adicionar um toast de confirmação aqui
  }, [aggregatedContent]);

  // Função para download do conteúdo
  const handleDownload = useCallback(() => {
    const blob = new Blob([aggregatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitor-content-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [aggregatedContent]);

  // Função para alternar fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Função para alternar expansão
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Renderização de conteúdo baseada no modo
  const renderContent = () => {
    if (currentDisplayMode === 'structured') {
      // Novo modo estruturado: grupos por seção com chips compactos
      return <StructuredMonitorView connectionsCount={connections.length} />;
    }

    if (!aggregatedContent) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] opacity-50">
          <Monitor size={48} style={{ color: 'var(--text-secondary)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Conecte nodes para visualizar conteúdo
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {connections.length} conexão{connections.length !== 1 ? 'ões' : ''}
          </p>
          <div className="mt-4 p-3 rounded-lg border border-dashed" style={{ borderColor: 'var(--primary-green)' }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--primary-green)' }}>
              <Link size={12} />
              <span>Detecta automaticamente cadeias de conexões</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
              Ex: Introdução → Corpo → Conclusão
            </p>
          </div>
        </div>
      );
    }


    // Modo combined ou markdown
    if (false) {
      return (
        <div 
          className="prose"
          style={{ 
            color: 'var(--text-primary)',
            fontFamily: '"Nunito Sans", "Inter", sans-serif',
            fontSize: '16px',
            lineHeight: '1.8',
            maxWidth: 'none'
          }}
          dangerouslySetInnerHTML={{ __html: marked.parse(aggregatedContent) }}
        />
      );
    }

    // Modo combined
    return (
      <div 
        className="prose"
        style={{ 
          color: 'var(--text-primary)',
          fontFamily: '"Nunito Sans", "Inter", sans-serif',
          fontSize: '16px',
          lineHeight: '1.8',
          maxWidth: 'none'
        }}
      >
        {aggregatedContent}
      </div>
    );
  };

  // Calcular dimensões baseadas no estado
  const nodeWidth = isFullscreen ? '90vw' : isExpanded ? '800px' : '500px';
  const nodeMaxHeight = isFullscreen ? '90vh' : isExpanded ? '1200px' : '800px';

  return (
    <motion.div
      className={`monitor-node ${isFullscreen ? 'fullscreen-monitor' : ''}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        width: nodeWidth,
        minHeight: '600px',
        maxHeight: nodeMaxHeight,
        backgroundColor: '#0A0A0A',
        border: selected ? '2px solid var(--primary-green)' : '1px solid #2A2A2A',
        borderRadius: '12px',
        overflow: 'hidden',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? '50%' : 'auto',
        left: isFullscreen ? '50%' : 'auto',
        transform: isFullscreen ? 'translate(-50%, -50%)' : 'none',
        zIndex: isFullscreen ? 9999 : 1,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header do Monitor */}
      <div 
        className="monitor-header flex items-center justify-between p-3 border-b"
        style={{
          backgroundColor: '#141414',
          borderColor: '#2A2A2A'
        }}
      >
        <div className="flex items-center gap-2">
          <Monitor size={18} style={{ color: 'var(--primary-green)' }} />
          <h3 
            className="font-medium text-sm"
            style={{ 
              color: 'var(--text-primary)',
              fontFamily: '"Nunito Sans", "Inter", sans-serif'
            }}
          >
            {title}
          </h3>
          <span 
            className="text-xs px-2 py-1 rounded-full"
            style={{
              backgroundColor: 'var(--primary-green-transparent)',
              color: 'var(--primary-green)'
            }}
          >
            {connections.length} fonte{connections.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Controles do Monitor - expandir/retrair + editor */}
        <div className="flex items-center gap-1">
          <motion.button
            onClick={() => {
              try {
                // Preparar rascunhos com conteúdo atual das seções
                const nodes = getNodes();
                const parents = nodes.filter((n) =>
                  n.id === 'summary' || n.id === 'body' || n.id === 'conclusion' ||
                  n?.data?.title === 'Introdução' || n?.data?.title === 'Corpo' || n?.data?.title === 'Conclusão'
                );
                const newDrafts = {};
                parents.forEach((p) => {
                  newDrafts[p.id] = p?.data?.content || '';
                });
                setDrafts(newDrafts);
                setActiveEditorSection('Introdução');
              } catch {}
              setIsEditorOpen(true);
            }}
            className="p-1.5 rounded transition-colors nopan nowheel nodrag"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)'
            }}
            whileHover={{ backgroundColor: 'var(--bg-tertiary)' }}
            whileTap={{ scale: 0.95 }}
            title="Editar conteúdo"
          >
            <FileText size={14} />
          </motion.button>

          <motion.button
            onClick={toggleExpanded}
            className="p-1.5 rounded transition-colors nopan nowheel nodrag"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)'
            }}
            whileHover={{ backgroundColor: 'var(--bg-tertiary)' }}
            whileTap={{ scale: 0.95 }}
            title={isExpanded ? "Minimizar" : "Expandir"}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </motion.button>
        </div>
      </div>

      {/* Área de conteúdo */}
      <div 
        className="monitor-content flex-1 overflow-auto p-6"
        style={{
          backgroundColor: '#0F0F0F'
        }}
      >
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>

      {/* Footer com informações */}
      <div 
        className="monitor-footer px-3 py-2 border-t text-xs"
        style={{
          backgroundColor: '#141414',
          borderColor: '#2A2A2A',
          color: 'var(--text-secondary)',
          fontFamily: '"Nunito Sans", "Inter", sans-serif'
        }}
      >
        <div className="flex items-center justify-between">
          <span>
            {aggregatedContent.length} caracteres • {contentSections.length} seções
            {contentSections.some(s => s.isChainNode) && (
              <span className="ml-2 flex items-center gap-1">
                <Link size={10} style={{ color: 'var(--primary-green)' }} />
                <span style={{ color: 'var(--primary-green)', fontSize: '10px' }}>
                  Cadeia detectada
                </span>
              </span>
            )}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={12} />
            Preview ao vivo
            {autoRefresh && (
              <span className="ml-1" style={{ color: 'var(--primary-green)' }}>
                • Auto
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Handle de conexão - canto superior esquerdo */}
      <Handle
        type="target"
        position={Position.Top}
        id="monitor-input"
        title="Conecte nodes para visualizar"
        style={{
          left: '10px',
          right: 'auto',
          top: '65px'
        }}
      />

      {/* Estilos adicionais */}
      <style>{`
        .monitor-node {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .fullscreen-monitor {
          box-shadow: 0 0 100px rgba(43, 178, 76, 0.2);
        }
        
        .monitor-content::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .monitor-content::-webkit-scrollbar-track {
          background: #1A1A1A;
        }
        
        .monitor-content::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        
        .monitor-content::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <EditorDrawer
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        drafts={drafts}
        setDrafts={setDrafts}
        getNodes={getNodes}
        activeSection={activeEditorSection}
        setActiveSection={setActiveEditorSection}
      />
    </motion.div>
  );
};

export default MonitorNode; 

// --------- Auxiliares do modo estruturado (hierarquia e chips) ---------

function ChildChip({ node }) {
  const role = node?.data?.nodeType || node?.data?.coreKey || node?.type;
  const isStructure = role === 'estrutura' || node?.data?.nodeType === 'estrutura' || node?.data?.coreKey === 'micro_estrutura';

  const getStructureLabel = (value) => {
    const map = {
      continua: 'Continua',
      paragrafos: 'Paragrafos',
      topicos: 'Topicos',
    };
    return map[(value || '').toLowerCase()] || 'Estrutura';
  };

  const label = isStructure
    ? getStructureLabel(node?.data?.structureType)
    : (
        node?.data?.title ||
        node?.data?.label ||
        node?.data?.name ||
        node?.type ||
        'Item'
      );

  const Icon =
    isStructure ? LayersIcon :
    (typeof role === 'string' && role.toLowerCase().includes('micro')) ? QuoteIcon :
    BracesIcon;

  const isMicro = !isStructure && typeof role === 'string' && role.toLowerCase().includes('micro');
  const chipBorderColor = isStructure
    ? '#F5A623' // laranja para estrutura
    : isMicro
      ? '#4A90E2' // azul para micro-dados
      : 'var(--border-primary)';

  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-4 max-w-full"
      style={{ borderColor: chipBorderColor, color: 'var(--text-secondary)' }}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function StructuredMonitorView({ connectionsCount }) {
  const groups = useMonitorHierarchy();

  if (!groups?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] opacity-50">
        <Monitor size={48} style={{ color: 'var(--text-secondary)' }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Conecte nodes para visualizar conteúdo
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          {connectionsCount} conexão{connectionsCount !== 1 ? 'ões' : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(({ parent, children }) => (
        <div key={parent.id} className="rounded-lg border p-2" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="text-xs font-semibold opacity-80" style={{ color: 'var(--text-primary)' }}>
            {parent?.data?.title ?? 'Seção'}
          </div>

          {children.length === 0 ? (
            <div className="mt-1 text-[11px] opacity-60" style={{ color: 'var(--text-secondary)' }}>Sem itens</div>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {children.map((child) => (
                <ChildChip key={child.id} node={child} />
              ))}
            </div>
          )}

          {/* Conteúdo do pai sempre visível se existir (Introdução, Corpo, Conclusão) */}
          {(() => {
            const parentContent = parent?.data?.content;
            const isPlaceholder = typeof parentContent === 'string' && parentContent.includes('Clique para selecionar');
            if (!parentContent || isPlaceholder) return null;
            return (
              <div 
                className="mt-2 prose prose-sm"
                style={{ 
                  color: 'var(--text-primary)',
                  fontFamily: '"Nunito Sans", "Inter", sans-serif',
                  fontSize: '13px',
                  lineHeight: '1.6'
                }}
              >
                {parentContent}
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
}

// --------- Drawer de Edição (portaled) ---------
function EditorDrawer({ isOpen, onClose, drafts, setDrafts, getNodes, activeSection, setActiveSection }) {
  if (!isOpen) return null;
  const sections = [
    { id: 'summary', title: 'Introdução' },
    { id: 'body', title: 'Corpo' },
    { id: 'conclusion', title: 'Conclusão' }
  ];

  // Estados Notion-like
  const [showAddButton, setShowAddButton] = React.useState(false);
  const [addButtonPosition, setAddButtonPosition] = React.useState({ top: 0, left: 0 });
  const [showToolbar, setShowToolbar] = React.useState(false);
  const [toolbarPosition, setToolbarPosition] = React.useState({ top: 0, left: 0 });
  const [currentLineElement, setCurrentLineElement] = React.useState(null);
  const [isHoveringButton, setIsHoveringButton] = React.useState(false);
  const [isHoveringToolbar, setIsHoveringToolbar] = React.useState(false);
  const [showSelectionToolbar, setShowSelectionToolbar] = React.useState(false);
  const [selectionToolbarPosition, setSelectionToolbarPosition] = React.useState({ top: 0, left: 0 });
  const [isHoveringSelectionToolbar, setIsHoveringSelectionToolbar] = React.useState(false);
  const [showSlashMenu, setShowSlashMenu] = React.useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = React.useState({ top: 0, left: 0 });
  const editorRef = React.useRef(null);

  // Handlers inspirados no NewsEditorPage
  const handleEditorMouseMove = React.useCallback((e) => {
    if (!editorRef.current || showToolbar) return;

    const editor = editorRef.current;
    const editorRect = editor.getBoundingClientRect();
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const extendedLeftBound = editorRect.left - 80;
    const isInExtendedArea = mouseX >= extendedLeftBound && mouseX <= editorRect.right && mouseY >= editorRect.top && mouseY <= editorRect.bottom;
    if (!isInExtendedArea) {
      setShowAddButton(false);
      setCurrentLineElement(null);
      return;
    }

    let elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
    let lineElement = null;
    if (mouseX < editorRect.left) {
      elementAtPoint = document.elementFromPoint(editorRect.left + 10, mouseY);
    }
    if (elementAtPoint && editor.contains(elementAtPoint)) {
      lineElement = elementAtPoint;
      while (lineElement && lineElement !== editor) {
        if (['P', 'H1', 'H2', 'H3', 'DIV', 'LI'].includes(lineElement.tagName)) break;
        lineElement = lineElement.parentElement;
      }
    }
    if (!lineElement || lineElement === editor) {
      const allLines = editor.querySelectorAll('p, h1, h2, h3, div, li');
      let closestLine = null;
      let closestDistance = Infinity;
      allLines.forEach((line) => {
        const lineRect = line.getBoundingClientRect();
        if (mouseY >= lineRect.top && mouseY <= lineRect.bottom) {
          const distance = Math.abs(mouseX - lineRect.left);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestLine = line;
          }
        }
      });
      lineElement = closestLine;
    }
    if (lineElement && lineElement !== editor) {
      const lineRect = lineElement.getBoundingClientRect();
      setCurrentLineElement(lineElement);
      setAddButtonPosition({ top: lineRect.top - editorRect.top + 2, left: -40 });
      setShowAddButton(true);
    } else {
      setShowAddButton(false);
      setCurrentLineElement(null);
    }
  }, [showToolbar]);

  const handleAddButtonClick = React.useCallback(() => {
    if (!currentLineElement || !editorRef.current) return;
    const lineRect = currentLineElement.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    setToolbarPosition({ top: lineRect.top - editorRect.top, left: 40 });
    setShowToolbar(true);
  }, [currentLineElement]);

  const handleCloseToolbar = React.useCallback(() => {
    setShowToolbar(false);
    setShowAddButton(false);
    setCurrentLineElement(null);
  }, []);

  const setBlockType = React.useCallback((type) => {
    if (!currentLineElement || !editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    const cursorOffset = selection.rangeCount > 0 ? selection.getRangeAt(0).startOffset : 0;
    const range = document.createRange();
    range.selectNode(currentLineElement);
    selection.removeAllRanges();
    selection.addRange(range);
    let tagName = 'p';
    if (type === 'h1') tagName = 'h1';
    else if (type === 'h2') tagName = 'h2';
    else if (type === 'h3') tagName = 'h3';
    try {
      const success = document.execCommand('formatBlock', false, `<${tagName}>`);
      if (!success) {
        const currentText = currentLineElement.textContent || '';
        const newHTML = `<${tagName}>${currentText}</${tagName}>`;
        document.execCommand('insertHTML', false, newHTML);
      }
    } catch {
      const currentText = currentLineElement.textContent || '';
      const newHTML = `<${tagName}>${currentText}</${tagName}>`;
      document.execCommand('insertHTML', false, newHTML);
    }
    setTimeout(() => {
      try {
        const newElement = editorRef.current.querySelector(`${tagName}:last-of-type`) || editorRef.current.querySelector(tagName);
        if (newElement && newElement.firstChild) {
          const newRange = document.createRange();
          const newSelection = window.getSelection();
          const textNode = newElement.firstChild;
          const maxOffset = textNode.textContent ? textNode.textContent.length : 0;
          const targetOffset = Math.min(cursorOffset, maxOffset);
          newRange.setStart(textNode, targetOffset);
          newRange.collapse(true);
          newSelection.removeAllRanges();
          newSelection.addRange(newRange);
        }
      } catch {}
    }, 50);
    handleCloseToolbar();
  }, [currentLineElement, handleCloseToolbar]);

  // Selection toolbar básica (B/I)
  const handleTextSelection = React.useCallback(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        const editorRect = editorRef.current.getBoundingClientRect();
        const rect = range.getBoundingClientRect();
        setSelectionToolbarPosition({ top: rect.top - editorRect.top - 40, left: rect.left - editorRect.left });
        setShowSelectionToolbar(true);
      }
    } else if (!isHoveringSelectionToolbar) {
      setShowSelectionToolbar(false);
    }
  }, [isHoveringSelectionToolbar]);

  // Fechar com ESC e atalhos comuns
  React.useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowToolbar(false);
        setShowSelectionToolbar(false);
        setShowSlashMenu(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        document.execCommand('bold');
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        document.execCommand('italic');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  React.useEffect(() => {
    const handleMouseUp = () => setTimeout(handleTextSelection, 10);
    const handleKeyUp = (e) => {
      if (e.shiftKey || ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) setTimeout(handleTextSelection, 10);
    };
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    return () => { document.removeEventListener('mouseup', handleMouseUp); document.removeEventListener('keyup', handleKeyUp); };
  }, [handleTextSelection]);

  const handleSave = () => {
    const nodes = getNodes();
    sections.forEach(({ id }) => {
      const node = nodes.find((n) => n.id === id);
      if (node && typeof node?.data?.onUpdateContent === 'function') {
        const newContent = drafts[id] ?? '';
        node.data.onUpdateContent(id, { content: newContent });
      }
    });
    onClose();
  };

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-start" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      {/* Drawer */}
      <motion.div
        initial={{ opacity: 0, x: '-100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative h-full flex flex-col"
        style={{ width: '70vw', maxWidth: '1280px', backgroundColor: 'var(--bg-primary)', borderRight: '1px solid var(--border-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>
            <FileText size={18} style={{ color: 'var(--primary-green)' }} />
            <span className="text-sm font-medium">Editor</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded text-xs"
              style={{ backgroundColor: 'var(--primary-green)', color: 'white' }}
            >
              Salvar
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              title="Fechar editor"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs das seções */}
        <div className="p-3 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
          <div className="flex gap-2">
            {sections.map(({ id, title }) => (
              <button
                key={id}
                onClick={() => setActiveSection(title)}
                className="px-3 py-1.5 rounded border text-xs"
                style={{
                  backgroundColor: activeSection === title ? 'var(--primary-green)' : 'var(--bg-primary)',
                  borderColor: activeSection === title ? 'var(--primary-green)' : 'var(--border-primary)',
                  color: activeSection === title ? 'white' : 'var(--text-secondary)'
                }}
              >
                {title}
              </button>
            ))}
          </div>
        </div>

        {/* Área de edição inspirada no NewsEditorPage */}
        <div className="flex-1 overflow-hidden">
          <div className="relative h-full">
            {/* Área estendida para hover do botão + */}
            <div className="absolute inset-0 pointer-events-none" style={{ left: '-80px', pointerEvents: 'auto' }} onMouseMove={handleEditorMouseMove} />

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="prose prose-invert max-w-none w-full h-full p-6 text-gray-300 leading-relaxed focus:outline-none relative z-10"
              style={{ 
                '--tw-prose-headings': '#ffffff',
                '--tw-prose-body': '#d1d5db',
                '--tw-prose-bold': '#ffffff',
                '--tw-prose-links': '#60a5fa',
                fontFamily: '"Nunito Sans", "Inter", sans-serif'
              }}
              onInput={(e) => {
                const html = e.currentTarget.innerHTML;
                // Para simplicidade, armazenamos HTML como rascunho da seção ativa
                const currentId = sections.find((s) => s.title === activeSection)?.id;
                if (currentId) setDrafts((d) => ({ ...d, [currentId]: html }));
              }}
          onKeyDown={(e) => {
            if (e.key === '/' && !showSlashMenu) {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                const rect = sel.getRangeAt(0).getBoundingClientRect();
                const editorRect = editorRef.current.getBoundingClientRect();
                setSlashMenuPosition({ top: rect.top - editorRect.top + 20, left: rect.left - editorRect.left });
                setShowSlashMenu(true);
              }
            }
          }}
              dangerouslySetInnerHTML={{ __html: drafts[sections.find((s) => s.title === activeSection)?.id] ?? '' }}
            />

            {/* Botão + */}
            {showAddButton && (
              <button
                className="add-block-button absolute -left-8 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ top: addButtonPosition.top, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                onClick={handleAddButtonClick}
                onMouseEnter={() => setIsHoveringButton(true)}
                onMouseLeave={() => setIsHoveringButton(false)}
                title="Adicionar/Transformar bloco"
              >
                +
              </button>
            )}

            {/* Toolbar de tipo de bloco */}
            {showToolbar && (
              <div
                className="markdown-toolbar absolute rounded-lg border p-2 flex gap-2"
                style={{ top: toolbarPosition.top, left: toolbarPosition.left, backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                onMouseEnter={() => setIsHoveringToolbar(true)}
                onMouseLeave={() => { setIsHoveringToolbar(false); handleCloseToolbar(); }}
              >
                {[
                  { id: 'text', label: 'Texto' },
                  { id: 'h1', label: 'H1' },
                  { id: 'h2', label: 'H2' },
                  { id: 'h3', label: 'H3' },
                  { id: 'ul', label: 'Lista' },
                  { id: 'quote', label: 'Citação' }
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    className="px-2 py-1 text-xs rounded border"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                    onClick={() => {
                      if (id === 'ul') {
                        document.execCommand('insertUnorderedList');
                      } else if (id === 'quote') {
                        document.execCommand('formatBlock', false, '<blockquote>');
                      } else {
                        setBlockType(id);
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Slash menu */}
            {showSlashMenu && (
              <div
                className="absolute rounded-lg border p-2 flex gap-2"
                style={{ top: slashMenuPosition.top, left: slashMenuPosition.left, backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                onMouseLeave={() => setShowSlashMenu(false)}
              >
                {[
                  { id: 'text', label: 'Texto' },
                  { id: 'h1', label: 'H1' },
                  { id: 'h2', label: 'H2' },
                  { id: 'h3', label: 'H3' },
                  { id: 'ul', label: 'Lista' },
                  { id: 'quote', label: 'Citação' }
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    className="px-2 py-1 text-xs rounded border"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                    onClick={() => {
                      if (id === 'ul') {
                        document.execCommand('insertUnorderedList');
                      } else if (id === 'quote') {
                        document.execCommand('formatBlock', false, '<blockquote>');
                      } else {
                        setBlockType(id);
                      }
                      setShowSlashMenu(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Selection toolbar (B/I) */}
            {showSelectionToolbar && (
              <div
                className="selection-toolbar absolute rounded-lg border p-2 flex gap-2"
                style={{ top: selectionToolbarPosition.top, left: selectionToolbarPosition.left, backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                onMouseEnter={() => setIsHoveringSelectionToolbar(true)}
                onMouseLeave={() => setIsHoveringSelectionToolbar(false)}
              >
                <button className="px-2 py-1 text-xs rounded border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }} onClick={() => document.execCommand('bold')}>Negrito</button>
                <button className="px-2 py-1 text-xs rounded border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }} onClick={() => document.execCommand('italic')}>Itálico</button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(
    <AnimatePresence>{content}</AnimatePresence>,
    document.body
  );
}