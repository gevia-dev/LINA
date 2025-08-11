import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import BubbleChart from '../components/BubbleChart';
import ArticleDetailsSidebar from '../components/ArticleDetailsSidebar';
import { fetchLinaHierarchy } from '../services/contentApi';

// Funções de processamento da árvore
const getStableHierarchy = (nodes, threshold) => {
  if (!nodes) return [];
  const stableNodes = [];
  for (const node of nodes) {
    const stableChildren = getStableHierarchy(node.children, threshold);
    const nodeStability = node.lambda_persistence;
    const hasStableChildren = stableChildren.length > 0;
    const isNodeStable = threshold === 0 || (nodeStability != null && nodeStability >= threshold);
    if (isNodeStable || hasStableChildren) {
      stableNodes.push({ ...node, children: stableChildren });
    }
  }
  return stableNodes.sort((a, b) => (b.lambda_persistence ?? 0) - (a.lambda_persistence ?? 0));
};

const pruneHierarchyByRelevance = (nodes, relevanceThreshold) => {
    if (!nodes) return [];
    const prunedNodes = [];
    for (const node of nodes) {
        if (node.children && node.children.length > 0) {
        const prunedChildren = pruneHierarchyByRelevance(node.children, relevanceThreshold);
        if (prunedChildren.length < relevanceThreshold) {
            prunedNodes.push(...prunedChildren.map(child => ({ ...child, promotedFromParent: true, originalParentId: node.id })));
        } else {
            prunedNodes.push({ ...node, children: prunedChildren });
        }
        } else {
        prunedNodes.push(node);
        }
    }
    return prunedNodes;
};

const searchInHierarchy = (nodes, term) => {
    if (!term) return nodes;
    if (!nodes) return [];
    const searchResults = [];
    for (const node of nodes) {
        const childrenResults = searchInHierarchy(node.children, term);
        const titleMatch = node.llm_title?.toLowerCase().includes(term.toLowerCase());
        const summaryMatch = node.llm_summary?.toLowerCase().includes(term.toLowerCase());
        if (titleMatch || summaryMatch || childrenResults.length > 0) {
        searchResults.push({ ...node, children: childrenResults });
        }
    }
    return searchResults;
};

// Componente de Breadcrumbs
const Breadcrumbs = ({ stack, onNavigate }) => (
    <nav className="flex items-center text-sm mb-4" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">
                <button onClick={() => onNavigate(-1)} className="inline-flex items-center text-gray-400 hover:text-white">
                    Raiz
                </button>
            </li>
            {stack.map((item, index) => (
                <li key={item.id}>
                    <div className="flex items-center">
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                        <button onClick={() => onNavigate(index)} className="ml-1 text-gray-400 hover:text-white md:ml-2">
                            {item.llm_title}
                        </button>
                    </div>
                </li>
            ))}
        </ol>
    </nav>
);

const LinaBubbleExplorerPage = () => {
    const [rawHierarchy, setRawHierarchy] = useState([]);
    const [loadingHierarchy, setLoadingHierarchy] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stabilityThreshold, setStabilityThreshold] = useState(0.0);
    const [relevanceThreshold, setRelevanceThreshold] = useState(2);

    // Estados para navegação
    const [navigationStack, setNavigationStack] = useState([]);
    const [currentView, setCurrentView] = useState({ id: 'root', llm_title: 'Raiz', children: [] });

    useEffect(() => {
        const loadHierarchy = async () => {
            try {
                setLoadingHierarchy(true);
                const data = await fetchLinaHierarchy();
                setRawHierarchy(data || []);
            } catch (error) {
                console.error('Erro ao carregar hierarquia:', error);
            } finally {
                setLoadingHierarchy(false);
            }
        };
        loadHierarchy();
    }, []);

    const processedHierarchy = useMemo(() => {
        const stable = getStableHierarchy(rawHierarchy, stabilityThreshold);
        const pruned = pruneHierarchyByRelevance(stable, relevanceThreshold);
        return searchInHierarchy(pruned, searchTerm);
    }, [rawHierarchy, stabilityThreshold, relevanceThreshold, searchTerm]);

    useEffect(() => {
        setCurrentView({ id: 'root', llm_title: 'Raiz', children: processedHierarchy });
        setNavigationStack([]);
    }, [processedHierarchy]);

    // Event listeners para comunicação com BubbleChart
    useEffect(() => {
        const handleClusterClick = (event) => {
            const { node } = event.detail;
        
            
            setNavigationStack([...navigationStack, currentView]);
            setCurrentView(node);
        };

        const handleNavigationComplete = (event) => {
            const { node } = event.detail;
        
        };

        window.addEventListener('bubbleChart:clusterClick', handleClusterClick);
        window.addEventListener('bubbleChart:navigationComplete', handleNavigationComplete);

        return () => {
            window.removeEventListener('bubbleChart:clusterClick', handleClusterClick);
            window.removeEventListener('bubbleChart:navigationComplete', handleNavigationComplete);
        };
    }, [navigationStack, currentView]);

    const handleBreadcrumbNavigate = (index) => {
        if (index === -1) {
            setCurrentView({ id: 'root', llm_title: 'Raiz', children: processedHierarchy });
            setNavigationStack([]);
        } else {
            const newStack = navigationStack.slice(0, index + 1);
            setCurrentView(newStack.pop());
            setNavigationStack(newStack);
        }
    };

    return (
        <div className="w-full min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-3rem)]">
                <header className="header-standard">
                    <div>
                        <h1 className="font-bold mb-2 text-2xl">Explorador de Clusters</h1>
                        <Breadcrumbs stack={navigationStack.map(s => s.llm_title).concat(currentView.llm_title).filter(t => t !== 'Raiz').map((title, i) => ({id: i, llm_title: title}))} onNavigate={handleBreadcrumbNavigate} />
                    </div>
                </header>
                
                {/* Controles de Pruning */}
                <div className="flex items-center gap-4 p-4 rounded-lg mb-4" 
                     style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  
                  {/* Controle de Threshold de Relevância */}
                  <div className="flex items-center gap-2">
                    <label 
                      className="text-sm text-gray-400 cursor-help" 
                      title="Remove clusters intermediários com poucos filhos para reduzir complexidade visual"
                    >
                      Nível de Detalhe:
                    </label>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setRelevanceThreshold(1)}
                        className={`px-3 py-1 rounded transition-colors ${
                          relevanceThreshold === 1 ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        Alto (1)
                      </button>
                      <button 
                        onClick={() => setRelevanceThreshold(2)}
                        className={`px-3 py-1 rounded transition-colors ${
                          relevanceThreshold === 2 ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        Médio (2)
                      </button>
                      <button 
                        onClick={() => setRelevanceThreshold(3)}
                        className={`px-3 py-1 rounded transition-colors ${
                          relevanceThreshold === 3 ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        Baixo (3+)
                      </button>
                    </div>
                  </div>
                  
                  {/* Controle de Estabilidade */}
                  <div className="flex items-center gap-2">
                    <label 
                      className="text-sm text-gray-400 cursor-help"
                      title="Filtra clusters por estabilidade mínima (lambda persistence)"
                    >
                      Estabilidade Mínima:
                    </label>
                    <input 
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={stabilityThreshold}
                      onChange={(e) => setStabilityThreshold(parseFloat(e.target.value))}
                      className="w-32 accent-blue-600"
                    />
                    <span className="text-sm text-gray-300 min-w-[2rem]">
                      {stabilityThreshold.toFixed(1)}
                    </span>
                  </div>
                  
                  {/* Campo de Busca */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-400">
                      Buscar:
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Título ou resumo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1 w-48 rounded bg-gray-700 text-gray-300 placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  {/* Botão de Reset */}
                  <button 
                    onClick={() => {
                      setRelevanceThreshold(2);
                      setStabilityThreshold(0.0);
                      setSearchTerm('');
                      handleBreadcrumbNavigate(-1); // Voltar à raiz
                    }}
                    className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                  >
                    Resetar
                  </button>
                  
                  {/* Indicador de quantidade de nós */}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      {currentView.children?.length || 0} clusters visíveis
                    </span>
                    
                    {/* Badge de filtros ativos */}
                    {(stabilityThreshold > 0 || relevanceThreshold !== 2 || searchTerm) && (
                      <span className="px-2 py-1 rounded bg-orange-600 text-orange-100 text-xs">
                        Filtros ativos
                      </span>
                    )}
                    
                    {/* Alerta quando poucos nós visíveis */}
                    {(currentView.children?.length || 0) < 3 && (currentView.children?.length || 0) > 0 && (
                      <span className="px-2 py-1 rounded bg-yellow-600 text-yellow-100 text-xs">
                        Poucos clusters
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 rounded-lg p-4 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)'}}>
                    {loadingHierarchy ? (
                        <p>Carregando Hierarquia...</p>
                    ) : (
                        <BubbleChart data={currentView.children || []} />
                    )}
                </div>
            </div>
            
            {/* Sidebar de detalhes do artigo */}
            <ArticleDetailsSidebar />
        </div>
    );
};

export default LinaBubbleExplorerPage;