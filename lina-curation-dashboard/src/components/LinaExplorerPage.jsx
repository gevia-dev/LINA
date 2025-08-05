import React, { useState, useEffect, useMemo } from 'react';
import { Search, FileText } from 'lucide-react';
import LinaNode from '../components/LinaNode';
import DetailsSidebar from '../components/DetailsSidebar';
import { fetchLinaHierarchy, fetchNewsByLinaEventId, fetchLinaEventById } from '../services/contentApi';

// 1. Primeira função: Filtra a árvore para manter apenas nós estáveis ou que contenham filhos estáveis.
const getStableHierarchy = (nodes, threshold) => {
  if (!nodes) return [];

  const stableNodes = [];
  for (const node of nodes) {
    const stableChildren = getStableHierarchy(node.children, threshold);
    
    const nodeStability = node.lambda_persistence;
    const hasStableChildren = stableChildren.length > 0;
    
    // Se o threshold é 0, mostra todos os nós (incluindo undefined)
    // Se o threshold > 0, só mostra nós com lambda_persistence definido e >= threshold
    const isNodeStable = threshold === 0 || (nodeStability !== null && nodeStability !== undefined && nodeStability >= threshold);

    // Mantém um nó se ele próprio for estável OU se tiver filhos estáveis.
    if (isNodeStable || hasStableChildren) {
      stableNodes.push({ ...node, children: stableChildren });
    }
  }
  
  // Ordena os nós resultantes pela maior estabilidade
  return stableNodes.sort((a, b) => {
    const aStability = a.lambda_persistence ?? 0;
    const bStability = b.lambda_persistence ?? 0;
    return bStability - aStability;
  });
};

// 2. Segunda função: Algoritmo de poda por limiar de relevância
const pruneHierarchyByRelevance = (nodes, relevanceThreshold) => {
  if (!nodes) return [];

  const prunedNodes = [];
  
  for (const node of nodes) {
    // Se o nó tem filhos, processa recursivamente (abordagem pós-ordem)
    if (node.children && node.children.length > 0) {
      const prunedChildren = pruneHierarchyByRelevance(node.children, relevanceThreshold);
      
      // Verifica se a pasta deve ser podada baseada no limiar de relevância
      if (prunedChildren.length < relevanceThreshold) {
        // Poda a pasta: promove todos os filhos para o nível atual
        prunedNodes.push(...prunedChildren.map(child => ({
          ...child,
          // Marca como promovido para indicador visual
          promotedFromParent: true,
          // Preserva o ID do pai original para referência
          originalParentId: node.id
        })));
      } else {
        // Não é podada, mantém o nó original com filhos processados
        prunedNodes.push({ ...node, children: prunedChildren });
      }
    } else {
      // Nó folha, mantém como está
      prunedNodes.push(node);
    }
  }
  
  return prunedNodes;
};

// 3. Terceira função: Realiza a busca textual na árvore já filtrada e podada.
const searchInHierarchy = (nodes, term) => {
  if (!term) {
    return nodes; // Se a busca estiver vazia, retorna a árvore estável completa.
  }
  if (!nodes) {
    return [];
  }

  const searchResults = [];
  for (const node of nodes) {
    const childrenResults = searchInHierarchy(node.children, term);

    const titleMatch = node.llm_title?.toLowerCase().includes(term.toLowerCase());
    const summaryMatch = node.llm_summary?.toLowerCase().includes(term.toLowerCase());

    // Mantém um nó se o título/resumo corresponder à busca OU se tiver filhos que correspondam.
    if (titleMatch || summaryMatch || childrenResults.length > 0) {
      searchResults.push({ ...node, children: childrenResults });
    }
  }
  return searchResults;
};

const LinaExplorerPage = () => {
  // Estados para a hierarquia
  const [hierarchy, setHierarchy] = useState([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para as notícias do evento selecionado
  const [selectedEventNews, setSelectedEventNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [stabilityThreshold, setStabilityThreshold] = useState(0.0);
  
  // Estado para controle do limiar de relevância da poda
  const [relevanceThreshold, setRelevanceThreshold] = useState(2);

  // Estados para o evento selecionado
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);

  // Carregar hierarquia quando o componente for montado
  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        setLoadingHierarchy(true);
        const data = await fetchLinaHierarchy();
        
        if (data && data.length > 0) {
          // Verificar lambda_persistence no componente
          const lambdaValues = data
            .filter(node => node.lambda_persistence !== null && node.lambda_persistence !== undefined)
            .slice(0, 3)
            .map(node => ({ title: node.llm_title?.substring(0, 30), lambda: node.lambda_persistence }));
        }
        
        setHierarchy(data || []);
      } catch (error) {
        console.error('Erro ao carregar hierarquia:', error);
        setHierarchy([]);
      } finally {
        setLoadingHierarchy(false);
      }
    };

    loadHierarchy();
  }, []);



  // Função para lidar com clique em um evento
  const handleEventClick = async (eventId) => {
    try {
      setLoadingNews(true);
      setLoadingEvent(true);
      
      // Primeiro, encontrar a pasta pai do evento na hierarquia
      const findParentFolder = (nodes, targetEventId, parent = null) => {
        for (const node of nodes) {
          if (node.children) {
            // Verificar se algum filho é o evento alvo
            const hasTargetChild = node.children.some(child => child.id === targetEventId);
            if (hasTargetChild) {
              return node; // Esta é a pasta pai
            }
            // Recursivamente procurar nos filhos
            const found = findParentFolder(node.children, targetEventId, node);
            if (found) return found;
          }
        }
        return null;
      };

      const parentFolder = findParentFolder(hierarchy, eventId);
      
      if (parentFolder) {
        // Buscar todas as notícias relacionadas aos eventos dentro desta pasta
        const allEventIds = [];
        const collectEventIds = (nodes) => {
          for (const node of nodes) {
            if (node.children && node.children.length > 0) {
              collectEventIds(node.children);
            } else {
              // É um evento (nó folha)
              allEventIds.push(node.id);
            }
          }
        };
        
        collectEventIds([parentFolder]);
        
        // Buscar notícias de todos os eventos da pasta
        const newsPromises = allEventIds.map(eventId => fetchNewsByLinaEventId(eventId));
        const allNewsArrays = await Promise.all(newsPromises);
        const allNews = allNewsArrays.flat();
        
        setSelectedEventNews(allNews || []);
        setSelectedEvent(parentFolder);
        setSelectedNews(null);
      } else {
        // Se não encontrar pasta pai, buscar apenas o evento específico
        const [news, eventData] = await Promise.all([
          fetchNewsByLinaEventId(eventId),
          fetchLinaEventById(eventId)
        ]);
        
        setSelectedEventNews(news || []);
        setSelectedEvent(eventData || null);
        setSelectedNews(null);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do evento:', error);
      setSelectedEventNews([]);
      setSelectedEvent(null);
      setSelectedNews(null);
    } finally {
      setLoadingNews(false);
      setLoadingEvent(false);
    }
  };

  // Função para lidar com clique em uma notícia
  const handleNewsClick = (news) => {
    setSelectedNews(news);
  };

  // Função para gerar representação textual da árvore de hierarquia
  const generateTreeText = (nodes, level = 0, prefix = '') => {
    if (!nodes || nodes.length === 0) return '';
    
    let treeText = '';
    const indent = '  '.repeat(level);
    const connector = level === 0 ? '' : '├─ ';
    const lastConnector = level === 0 ? '' : '└─ ';
    
    nodes.forEach((node, index) => {
      const isLast = index === nodes.length - 1;
      const currentPrefix = isLast ? lastConnector : connector;
      const nextPrefix = isLast ? '   ' : '│  ';
      
      // Informações do nó
      const title = node.llm_title || 'Sem título';
      const stability = node.lambda_persistence !== null && node.lambda_persistence !== undefined 
        ? `[λ: ${node.lambda_persistence.toFixed(2)}]` 
        : '[λ: undefined]';
      const hasChildren = node.children && node.children.length > 0;
      const nodeType = hasChildren ? '📁' : '📄';
      
      // Indica se o nó foi promovido pela poda
      const pruningInfo = node.promotedFromParent ? ' [PROMOVIDO]' : '';
      
      treeText += `${indent}${currentPrefix}${nodeType} ${title} ${stability}${pruningInfo}\n`;
      
      // Recursivamente processa filhos
      if (hasChildren) {
        treeText += generateTreeText(node.children, level + 1, prefix + nextPrefix);
      }
    });
    
    return treeText;
  };

  // Função para exportar a árvore como arquivo de texto
  const exportTreeStructure = () => {
    const treeText = generateTreeText(hierarchy);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `lina-hierarchy-${timestamp}.txt`;
    
    const content = `Estrutura da Hierarquia Lina - Exportada em ${new Date().toLocaleString('pt-BR')}
================================================================================

CONFIGURAÇÕES APLICADAS:
- Filtro de Estabilidade: ≥ ${stabilityThreshold.toFixed(1)}
- Poda por Relevância: Limiar de ${relevanceThreshold} filhos mínimos
- Nível de Detalhe: ${relevanceThreshold === 1 ? 'Completo' : relevanceThreshold === 2 ? 'Balanceado' : 'Simplificado'}
- Busca Textual: ${searchTerm ? `"${searchTerm}"` : 'Inativa'}

ESTATÍSTICAS:
- Nós originais: ${countNodes(hierarchy)}
- Nós após filtro de estabilidade: ${countNodes(stableHierarchy)}
- Nós após poda estrutural: ${countNodes(prunedHierarchy)}
- Nós finais (com busca): ${countNodes(filteredHierarchy)}
- Nós com lambda_persistence definido: ${countNodesWithStability(hierarchy)}

================================================================================

${treeText}

================================================================================

LEGENDA:
- 📁 = Pasta (nó com filhos)
- 📄 = Evento (nó folha)
- λ = lambda_persistence (estabilidade)
- [PROMOVIDO] = Nó promovido pela poda por relevância
- undefined = valor não definido

SISTEMA DE CORES DE ESTABILIDADE:
- Verde esmeralda (≥ 3.0): Muito estável
- Verde (≥ 2.0): Estável
- Roxo (≥ 1.5): Moderadamente estável
- Amarelo (≥ 1.0): Média estabilidade
- Laranja (≥ 0.5): Baixa estabilidade
- Vermelho (< 0.5): Muito baixa estabilidade
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Função auxiliar para contar nós
  const countNodes = (nodes) => {
    if (!nodes || nodes.length === 0) return 0;
    return nodes.reduce((count, node) => {
      return count + 1 + countNodes(node.children);
    }, 0);
  };

  // Função auxiliar para contar nós com lambda_persistence definido
  const countNodesWithStability = (nodes) => {
    if (!nodes || nodes.length === 0) return 0;
    return nodes.reduce((count, node) => {
      const hasStability = node.lambda_persistence !== null && node.lambda_persistence !== undefined;
      return count + (hasStability ? 1 : 0) + countNodesWithStability(node.children);
    }, 0);
  };

  // Etapa 1: Filtro de Estabilidade - Gera a árvore com base na estabilidade
  const stableHierarchy = useMemo(
    () => getStableHierarchy(hierarchy, stabilityThreshold),
    [hierarchy, stabilityThreshold]
  );

  // Etapa 2: Poda por Limiar de Relevância - Remove pastas com poucos filhos da árvore já estabilizada
  const prunedHierarchy = useMemo(
    () => pruneHierarchyByRelevance(stableHierarchy, relevanceThreshold),
    [stableHierarchy, relevanceThreshold]
  );

  // Etapa 3: Funcionalidade de Busca - Aplica busca textual na árvore final
  const filteredHierarchy = useMemo(
    () => searchInHierarchy(prunedHierarchy, searchTerm),
    [prunedHierarchy, searchTerm]
  );

  return (
    <div 
      className="w-full min-h-screen p-6"
      style={{ 
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="header-standard">
          <div>
            <h1 
              className="font-bold mb-2"
              style={{ 
                fontSize: '24px', 
                fontWeight: '700',
                color: 'var(--text-primary)'
              }}
            >
              Explorador da Lina
            </h1>
            <p 
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Explore a hierarquia de tópicos e eventos gerados pela Lina
            </p>
          </div>
        </header>

        {/* Layout de três colunas */}
        <div className="flex gap-6 h-[calc(100vh-200px)]">
          {/* Coluna da Esquerda - Hierarquia */}
          <div 
            className="w-[40%] rounded-lg p-6 overflow-hidden flex flex-col"
            style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '8px'
            }}
          >
            <div className="mb-6">
              <h2 
                className="font-semibold mb-4"
                style={{ 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}
              >
                Hierarquia
              </h2>
              
              {/* Campo de busca */}
              <div className="relative">
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2" 
                  size={18} 
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  type="text"
                  placeholder="Buscar tópicos e eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-md border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: '400',
                    borderRadius: '8px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-green)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-primary)';
                  }}
                />
              </div>
              
              {/* Controle de Estabilidade */}
              <div className="mt-4 px-1">
                <label 
                  htmlFor="stability-slider" 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Estabilidade Mínima: <span 
                    className="font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {stabilityThreshold.toFixed(1)}
                  </span>
                </label>
                <input
                  id="stability-slider"
                  type="range"
                  min="0"
                  max="5.0"
                  step="0.1"
                  value={stabilityThreshold}
                  onChange={(e) => setStabilityThreshold(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    accentColor: 'var(--primary-green)'
                  }}
                />
              </div>

              {/* Controle de Nível de Detalhe */}
              <div className="mt-4 px-1">
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Nível de Detalhe: <span 
                    className="font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {relevanceThreshold === 1 ? 'Completo' : 
                     relevanceThreshold === 2 ? 'Balanceado' : 'Simplificado'}
                  </span>
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setRelevanceThreshold(1)}
                    className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                      relevanceThreshold === 1 
                        ? 'text-white' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    style={{
                      backgroundColor: relevanceThreshold === 1 
                        ? 'var(--primary-green)' 
                        : 'var(--bg-tertiary)',
                      borderRadius: '6px'
                    }}
                  >
                    Completo
                  </button>
                  <button
                    onClick={() => setRelevanceThreshold(2)}
                    className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                      relevanceThreshold === 2 
                        ? 'text-white' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    style={{
                      backgroundColor: relevanceThreshold === 2 
                        ? 'var(--primary-green)' 
                        : 'var(--bg-tertiary)',
                      borderRadius: '6px'
                    }}
                  >
                    Balanceado
                  </button>
                  <button
                    onClick={() => setRelevanceThreshold(3)}
                    className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                      relevanceThreshold === 3 
                        ? 'text-white' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    style={{
                      backgroundColor: relevanceThreshold === 3 
                        ? 'var(--primary-green)' 
                        : 'var(--bg-tertiary)',
                      borderRadius: '6px'
                    }}
                  >
                    Simplificado
                  </button>
                </div>
                <p 
                  className="text-xs mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {relevanceThreshold === 1 ? 'Mostra todas as pastas' :
                   relevanceThreshold === 2 ? 'Remove pastas com menos de 2 filhos' :
                   'Remove pastas com menos de 3 filhos'}
                </p>
              </div>


            </div>

            {/* Árvore de hierarquia */}
            <div className="flex-1 overflow-y-auto">
              {loadingHierarchy ? (
                <div 
                  className="text-center py-8"
                  style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: '14px'
                  }}
                >
                  Carregando hierarquia...
                </div>
              ) : filteredHierarchy.length > 0 ? (
                <div className="space-y-1">
                  {filteredHierarchy.map((node, index) => (
                    <LinaNode
                      key={node.id}
                      node={node}
                      onEventClick={handleEventClick}
                      level={0}
                      isLast={index === filteredHierarchy.length - 1}
                      parentPath={[]}
                    />
                  ))}
                </div>
              ) : (
                <div 
                  className="text-center py-8"
                  style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: '14px'
                  }}
                >
                  {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma hierarquia disponível'}
                </div>
              )}
            </div>
          </div>

          {/* Coluna do Meio - Detalhes do Evento e Notícias */}
          <div 
            className="flex-1 rounded-lg p-6 overflow-hidden flex flex-col"
            style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '8px'
            }}
          >
            <div className="mb-6">
              <h2 
                className="font-semibold mb-2"
                style={{ 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}
              >
                {selectedEvent ? 'Detalhes do Tópico' : 'Notícias do Evento'}
              </h2>
              <p 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {selectedEvent ? 'Informações e notícias relacionadas ao tópico selecionado' : 'Selecione um evento na hierarquia para ver as notícias relacionadas'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingEvent || loadingNews ? (
                <div 
                  className="text-center py-8"
                  style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: '14px'
                  }}
                >
                  Carregando...
                </div>
              ) : selectedEvent && selectedEvent.id ? (
                <div className="space-y-6">
                  {/* Seção de detalhes do evento */}
                  <div 
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-primary)',
                      borderRadius: '8px'
                    }}
                  >
                    <h3 
                      className="font-semibold mb-3"
                      style={{ 
                        fontSize: '16px', 
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {selectedEvent.llm_title || 'Tópico sem título'}
                    </h3>
                    
                    {selectedEvent.llm_summary && (
                      <div className="mb-4">
                        <h4 
                          className="font-medium mb-2"
                          style={{ 
                            fontSize: '14px', 
                            fontWeight: '500',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          Resumo do Tópico
                        </h4>
                        <p 
                          className="text-sm leading-relaxed"
                          style={{ 
                            color: 'var(--text-primary)',
                            lineHeight: '1.6'
                          }}
                        >
                          {selectedEvent.llm_summary}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span>
                        Estabilidade: {selectedEvent.lambda_persistence?.toFixed(2) || 'N/A'}
                      </span>
                      {selectedEvent.created_at && (
                        <span>
                          Criado em: {new Date(selectedEvent.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Seção de notícias */}
                  {selectedEventNews && selectedEventNews.length > 0 && (
                    <div>
                      <h4 
                        className="font-medium mb-3"
                        style={{ 
                          fontSize: '14px', 
                          fontWeight: '500',
                          color: 'var(--text-primary)'
                        }}
                      >
                        Notícias do Tópico ({selectedEventNews.length})
                      </h4>
                      <div className="space-y-3">
                        {selectedEventNews.map((news) => (
                          <div
                            key={news.id}
                            className="rounded-lg p-3 border transition-colors cursor-pointer"
                            style={{
                              backgroundColor: selectedNews?.id === news.id ? 'var(--primary-green-light)' : 'var(--bg-tertiary)',
                              borderColor: selectedNews?.id === news.id ? 'var(--primary-green)' : 'var(--border-primary)',
                              borderRadius: '6px'
                            }}
                            onClick={() => handleNewsClick(news)}
                            onMouseEnter={(e) => {
                              if (selectedNews?.id !== news.id) {
                                e.currentTarget.style.borderColor = 'var(--border-secondary)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedNews?.id !== news.id) {
                                e.currentTarget.style.borderColor = 'var(--border-primary)';
                              }
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h5 
                                className="font-medium line-clamp-2 flex-1"
                                style={{ 
                                  fontSize: '14px', 
                                  fontWeight: '500',
                                  color: 'var(--text-primary)'
                                }}
                              >
                                {news.title}
                              </h5>
                              <span 
                                className="ml-3 flex-shrink-0"
                                style={{ 
                                  fontSize: '11px',
                                  color: 'var(--text-secondary)'
                                }}
                              >
                                {new Date(news.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            
                            {news.link && (
                              <a
                                href={news.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mb-2 transition-colors"
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  color: 'var(--primary-green)',
                                  textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.color = 'var(--primary-green-hover)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.color = 'var(--primary-green)';
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Ver link original →
                              </a>
                            )}
                            
                            {news.texto_final && (
                              <p 
                                className="line-clamp-2 text-xs"
                                style={{ 
                                  color: 'var(--text-primary)',
                                  lineHeight: '1.4'
                                }}
                              >
                                {news.texto_final.length > 150 
                                  ? `${news.texto_final.substring(0, 150)}...`
                                  : news.texto_final
                                }
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedEventNews && selectedEventNews.length > 0 ? (
                <div className="space-y-4">
                  {selectedEventNews.map((news) => (
                    <div
                      key={news.id}
                      className="rounded-lg p-4 border transition-colors cursor-pointer"
                      style={{
                        backgroundColor: selectedNews?.id === news.id ? 'var(--primary-green-light)' : 'var(--bg-tertiary)',
                        borderColor: selectedNews?.id === news.id ? 'var(--primary-green)' : 'var(--border-primary)',
                        borderRadius: '8px'
                      }}
                      onClick={() => handleNewsClick(news)}
                      onMouseEnter={(e) => {
                        if (selectedNews?.id !== news.id) {
                          e.currentTarget.style.borderColor = 'var(--border-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedNews?.id !== news.id) {
                          e.currentTarget.style.borderColor = 'var(--border-primary)';
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 
                          className="font-medium line-clamp-2"
                          style={{ 
                            fontSize: '16px', 
                            fontWeight: '500',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {news.title}
                        </h3>
                        <span 
                          className="ml-4 flex-shrink-0"
                          style={{ 
                            fontSize: '12px',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {new Date(news.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      {news.link && (
                        <a
                          href={news.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mb-3 transition-colors"
                          style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--primary-green)',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.color = 'var(--primary-green-hover)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.color = 'var(--primary-green)';
                          }}
                          onClick={(e) => e.stopPropagation()} // Evitar que o clique no link selecione a notícia
                        >
                          Ver link original →
                        </a>
                      )}
                      
                      {news.texto_final && (
                        <p 
                          className="line-clamp-3"
                          style={{ 
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            lineHeight: '1.5'
                          }}
                        >
                          {news.texto_final.length > 200 
                            ? `${news.texto_final.substring(0, 200)}...`
                            : news.texto_final
                          }
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  className="text-center py-12"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <div className="mb-4">
                    <FileText 
                      className="mx-auto" 
                      size={48} 
                      style={{ color: 'var(--text-secondary)' }}
                    />
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '400' }}>
                    Selecione um evento na hierarquia
                  </p>
                  <p 
                    className="mt-1"
                    style={{ 
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    para visualizar as notícias relacionadas
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Coluna da Direita - Detalhes da Notícia Selecionada */}
          <div 
            className="w-[25%] rounded-lg overflow-hidden flex flex-col"
            style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '8px'
            }}
          >
            <DetailsSidebar selectedItem={selectedNews} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinaExplorerPage;