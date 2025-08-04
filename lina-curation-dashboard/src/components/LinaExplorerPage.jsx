import React, { useState, useEffect } from 'react';
import { Search, FileText } from 'lucide-react';
import LinaNode from '../components/LinaNode';
import DetailsSidebar from '../components/DetailsSidebar';
import { fetchLinaHierarchy, fetchNewsByLinaEventId, fetchLinaEventById } from '../services/contentApi';

const LinaExplorerPage = () => {
  // Estados para a hierarquia
  const [hierarchy, setHierarchy] = useState([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para as notícias do evento selecionado
  const [selectedEventNews, setSelectedEventNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [stabilityThreshold, setStabilityThreshold] = useState(1.0);

  // Estados para o evento selecionado
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);

  // Carregar hierarquia quando o componente for montado
  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        setLoadingHierarchy(true);
        const data = await fetchLinaHierarchy();
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

  // Função para processar hierarquia: filtrar, ordenar e buscar
  const processHierarchy = (nodes, term, threshold) => {
    if (!nodes) return [];

    return nodes.reduce((acc, node) => {
      // 1. Processa os filhos recursivamente PRIMEIRO
      const processedChildren = processHierarchy(node.children, term, threshold);

      const isStable = (node.lambda_persistence ?? 1.0) >= threshold;
      const titleMatch = term ? node.llm_title?.toLowerCase().includes(term.toLowerCase()) : true;
      const summaryMatch = term ? node.llm_summary?.toLowerCase().includes(term.toLowerCase()) : true;

      // 2. Condições para manter o nó:
      // - Se não houver busca, manter se for estável ou tiver filhos estáveis.
      // - Se houver busca, manter se corresponder ao termo E (for estável ou tiver filhos que correspondem).
      const hasVisibleChildren = processedChildren.length > 0;
      const matchesSearch = titleMatch || summaryMatch;

      if (isStable && matchesSearch) {
        acc.push({ ...node, children: processedChildren });
      } else if (hasVisibleChildren) {
        // Se o nó em si não corresponde mas tem filhos que correspondem (e são estáveis),
        // mantém o nó pai para preservar a estrutura da árvore.
        acc.push({ ...node, children: processedChildren });
      }

      return acc;
    }, []).sort((a, b) => (b.lambda_persistence ?? 0) - (a.lambda_persistence ?? 0)); // Mantém a ordenação por estabilidade
  };

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

  // Processar hierarquia com filtros de estabilidade e busca
  const filteredHierarchy = processHierarchy(hierarchy, searchTerm, stabilityThreshold);

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
        <header className="mb-8">
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
        </header>

        {/* Layout de três colunas */}
        <div className="grid grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Coluna da Esquerda - Hierarquia */}
          <div 
            className="col-span-1 rounded-lg p-6 overflow-hidden flex flex-col"
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
                  {filteredHierarchy.map((node) => (
                    <LinaNode
                      key={node.id}
                      node={node}
                      onEventClick={handleEventClick}
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
            className="col-span-2 rounded-lg p-6 overflow-hidden flex flex-col"
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
            className="col-span-1 rounded-lg overflow-hidden flex flex-col"
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