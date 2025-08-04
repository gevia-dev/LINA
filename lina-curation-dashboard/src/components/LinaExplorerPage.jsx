import React, { useState, useEffect } from 'react';
import { Search, FileText } from 'lucide-react';
import LinaNode from '../components/LinaNode';
import { fetchLinaHierarchy, fetchNewsByLinaEventId } from '../services/contentApi';

const LinaExplorerPage = () => {
  // Estados para a hierarquia
  const [hierarchy, setHierarchy] = useState([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para as notícias do evento selecionado
  const [selectedEventNews, setSelectedEventNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);

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

  // Função para filtrar a hierarquia com base no termo de busca
  const filterHierarchy = (nodes, term) => {
    if (!term) return nodes;

    const filteredNodes = [];
    
    for (const node of nodes) {
      const titleMatch = node.llm_title?.toLowerCase().includes(term.toLowerCase());
      const summaryMatch = node.llm_summary?.toLowerCase().includes(term.toLowerCase());
      
      let filteredChildren = [];
      if (node.children) {
        filteredChildren = filterHierarchy(node.children, term);
      }
      
      // Incluir o nó se ele mesmo corresponde ou se tem filhos que correspondem
      if (titleMatch || summaryMatch || filteredChildren.length > 0) {
        filteredNodes.push({
          ...node,
          children: filteredChildren
        });
      }
    }
    
    return filteredNodes;
  };

  // Função para lidar com clique em um evento
  const handleEventClick = async (eventId) => {
    try {
      setLoadingNews(true);
      const news = await fetchNewsByLinaEventId(eventId);
      setSelectedEventNews(news || []);
    } catch (error) {
      console.error('Erro ao carregar notícias do evento:', error);
      setSelectedEventNews([]);
    } finally {
      setLoadingNews(false);
    }
  };

  // Filtrar hierarquia com base no termo de busca
  const filteredHierarchy = filterHierarchy(hierarchy, searchTerm);

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

        {/* Layout de duas colunas */}
        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
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

          {/* Coluna da Direita - Notícias do Evento */}
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
                Notícias do Evento
              </h2>
              <p 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Selecione um evento na hierarquia para ver as notícias relacionadas
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingNews ? (
                <div 
                  className="text-center py-8"
                  style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: '14px'
                  }}
                >
                  Carregando notícias...
                </div>
              ) : selectedEventNews.length > 0 ? (
                <div className="space-y-4">
                  {selectedEventNews.map((news) => (
                    <div
                      key={news.id}
                      className="rounded-lg p-4 border transition-colors cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-primary)',
                        borderRadius: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-primary)';
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
        </div>
      </div>
    </div>
  );
};

export default LinaExplorerPage;