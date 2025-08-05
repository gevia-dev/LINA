import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import BubbleChart from '../components/BubbleChart';
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

    const handleBubbleClick = (node) => {
        setNavigationStack([...navigationStack, currentView]);
        setCurrentView(node);
    };

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
                <div className="flex-1 rounded-lg p-4 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)'}}>
                    {loadingHierarchy ? (
                        <p>Carregando Hierarquia...</p>
                    ) : (
                        <>
                            {console.log('LinaBubbleExplorerPage: Dados para BubbleChart', { 
                                childrenLength: currentView.children?.length,
                                children: currentView.children 
                            })}
                            <BubbleChart data={currentView.children || []} onBubbleClick={handleBubbleClick} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LinaBubbleExplorerPage;