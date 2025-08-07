import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Handle, Position, useNodeConnections, useNodesData, useReactFlow } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  Eye, 
  Layers, 
  FileText, 
  Database,
  Maximize2,
  Minimize2,
  Download,
  Copy,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Link,
  ArrowRight
} from 'lucide-react';
import { marked } from 'marked';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentDisplayMode, setCurrentDisplayMode] = useState(displayMode);
  const [aggregatedContent, setAggregatedContent] = useState('');
  const [contentSections, setContentSections] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

    if (currentDisplayMode === 'structured') {
      return (
        <div className="space-y-4">
          {contentSections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border rounded-lg p-3"
              style={{
                borderColor: 'var(--border-primary)',
                backgroundColor: 'var(--bg-primary)'
              }}
            >
              {showHeaders && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {section.type?.includes('micro') ? (
                      <Database size={14} style={{ color: 'var(--primary-green)' }} />
                    ) : section.type === 'estrutura' ? (
                      <Layers size={14} style={{ color: '#F5A623' }} />
                    ) : (
                      <FileText size={14} style={{ color: 'var(--text-secondary)' }} />
                    )}
                    <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {section.title}
                    </h4>
                    <span 
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--primary-green-transparent)',
                        color: 'var(--primary-green)',
                        fontSize: '10px'
                      }}
                    >
                      #{section.order + 1}
                    </span>
                  </div>
                  {section.isChainNode && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Link size={12} style={{ color: 'var(--primary-green)' }} />
                      <span 
                        className="text-xs"
                        style={{ color: 'var(--primary-green)' }}
                      >
                        Cadeia
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div 
                className="prose prose-sm"
                style={{ 
                  color: 'var(--text-primary)',
                  fontFamily: '"Nunito Sans", "Inter", sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              >
                {section.content}
              </div>
            </motion.div>
          ))}
        </div>
      );
    }

    // Modo combined ou markdown
    if (currentDisplayMode === 'markdown') {
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

        {/* Controles do Monitor */}
        <div className="flex items-center gap-1">
          {/* Seletor de modo de exibição */}
          <select
            value={currentDisplayMode}
            onChange={(e) => setCurrentDisplayMode(e.target.value)}
            className="text-xs px-2 py-1 rounded border nopan nowheel nodrag"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
              fontFamily: '"Nunito Sans", "Inter", sans-serif'
            }}
          >
            <option value="structured">Estruturado</option>
            <option value="combined">Combinado</option>
            <option value="markdown">Markdown</option>
          </select>

          {/* Botões de ação */}
          <motion.button
            onClick={handleRefresh}
            className="p-1.5 rounded transition-colors nopan nowheel nodrag"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)'
            }}
            whileHover={{ backgroundColor: 'var(--bg-tertiary)' }}
            whileTap={{ scale: 0.95 }}
            title="Atualizar conteúdo"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </motion.button>

          <motion.button
            onClick={handleCopy}
            className="p-1.5 rounded transition-colors nopan nowheel nodrag"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)'
            }}
            whileHover={{ backgroundColor: 'var(--bg-tertiary)' }}
            whileTap={{ scale: 0.95 }}
            title="Copiar conteúdo"
          >
            <Copy size={14} />
          </motion.button>

          <motion.button
            onClick={handleDownload}
            className="p-1.5 rounded transition-colors nopan nowheel nodrag"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)'
            }}
            whileHover={{ backgroundColor: 'var(--bg-tertiary)' }}
            whileTap={{ scale: 0.95 }}
            title="Baixar conteúdo"
          >
            <Download size={14} />
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

          <motion.button
            onClick={toggleFullscreen}
            className="p-1.5 rounded transition-colors nopan nowheel nodrag"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)'
            }}
            whileHover={{ backgroundColor: 'var(--bg-tertiary)' }}
            whileTap={{ scale: 0.95 }}
            title="Tela cheia"
          >
            <Eye size={14} />
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
    </motion.div>
  );
};

export default MonitorNode; 