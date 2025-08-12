import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Grid3X3, List, Loader2, X } from 'lucide-react';
import { fetchLinaNewsPending, fetchLinaNewsCompleted } from '../services/contentApi';
import FeedItem from '../components/FeedItem';
import FeedItemSkeleton from '../components/FeedItemSkeleton';
import DetailsSidebar from '../components/DetailsSidebar';
import NewsReaderPanel from '../components/NewsReaderPanel';
import { groupNewsByDate } from '../utils/dateHelpers';
import { useViewMode } from '../hooks/useViewMode';
import { setLinaNewsPublished } from '../services/contentApi';

// Dados de exemplo para teste
const sampleWellnessItem = {
  id: 1,
  title: "Vacinas de Herpes e VSR Seriam Aliadas Contra Demência Aponta Estudo",
  link: "https://www1.folha.uol.com.br/equilibrioesaude/2025/08/vacinas-de-herpes-e-vsr-seriam-aliadas-contra-demencia-aponta-estudo.shtml",
  created_at: "2025-08-11T16:01:00Z",
  wellness_data: JSON.stringify({
    wellness_focus: {
      topline_summary: "A study from Oxford shows that vaccines for VZV and VSR, featuring the AS01 adjuvant, reduce dementia risk by minimizing amyloid plaques in the brain, advancing preventive health measures for longevity.",
      categoria_wellness: "Longevity Science"
    },
    relevance_market_trends: {
      relevancia_mercado: "This research emphasizes how vaccine adjuvants can extend beyond infection prevention to influence cognitive health and aging.",
      impacto_futuro: "Such findings may drive more integrated health tech solutions for anti-aging. Future innovations could personalize vaccines for enhanced longevity outcomes."
    },
    metadata: {
      subsetores_impactados: "Longevity Science, Medical Innovation",
      oportunidades_identificadas: "This opens avenues for investment in adjuvant technologies and vaccine development for brain health. Partnerships in biotechnology could accelerate anti-dementia products"
    }
  }),
  entities_data: JSON.stringify({
    entidade_principal: {
      nome: "AS01 Adjuvante"
    },
    entidades_complementares: [
      { nome: "Varicela-Zóster" },
      { nome: "Universidade de Oxford" },
      { nome: "NPJ Vaccine" },
      { nome: "TriNetx" },
      { nome: "Livia Almeida" }
    ]
  }),
  structured_summary: JSON.stringify({
    motivo_ou_consequencia: "A pesquisa demonstra que vacinas existentes podem ter benefícios inesperados na prevenção de demência.",
    resumo_vetorial: "Estudo da Universidade de Oxford revela que vacinas contra herpes e VSR podem reduzir significativamente o risco de demência."
  })
};

const CurationFeed = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [readerItem, setReaderItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  // Feed utiliza exclusivamente lina_news
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' ou 'completed'
  const [readItems, setReadItems] = useState(new Set());
  const [visibleItemsCount, setVisibleItemsCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const feedContainerRef = useRef(null);
  const { isCompact, toggleViewMode } = useViewMode();

  // Função para carregar notícias baseado no filtro e aba ativa
  const loadNews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let result;
      if (activeTab === 'completed') {
        result = await fetchLinaNewsCompleted(0, 100);
      } else {
        result = await fetchLinaNewsPending(0, 100);
      }
      
      if (result.data) {
        setNewsItems(result.data);
      }
    } catch (err) {
      setError('Não foi possível carregar as notícias.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [activeTab]); // Recarrega quando a aba ativa muda

  // Filtrar notícias baseado nos filtros selecionados (exceto lina_news que já é filtrado no carregamento)
  const filteredNews = newsItems.filter(item => {
    const categoryMatch = filterCategory === 'all' || item.macro_categoria === filterCategory;
    return categoryMatch;
  });

  // Obter categorias únicas para o filtro
  const uniqueCategories = [...new Set(newsItems.map(item => item.macro_categoria).filter(Boolean))];

  const handleNewsSelect = (news) => {
    setSelectedNews(news);
    setSidebarVisible(true);
  };

  const handleMarkAsRead = (newsId) => {
    setReadItems(prev => new Set([...prev, newsId]));
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
    setTimeout(() => setSelectedNews(null), 300);
  };

  // Inicializar itens lidos do localStorage
  useEffect(() => {
    const savedReadItems = JSON.parse(localStorage.getItem('readNewsItems') || '[]');
    setReadItems(new Set(savedReadItems));
  }, []);

  // Listener para abrir o leitor notion-like via evento customizado
  useEffect(() => {
    const openReader = (e) => {
      const item = e.detail?.item;
      if (item) setReaderItem(item);
    };
    window.addEventListener('open-news-reader', openReader);
    return () => window.removeEventListener('open-news-reader', openReader);
  }, []);

  // Listener para toggle de publicado
  useEffect(() => {
    const togglePublished = async (e) => {
      const item = e.detail?.item;
      if (!item) return;
      try {
        const linaId = item.id;
        await setLinaNewsPublished(linaId, true);
        setNewsItems(prev => prev.map(n => n.id === linaId ? { ...n, isPublished: true } : n));
      } catch (err) {
        console.error('Erro ao marcar como publicado:', err);
      }
    };
    window.addEventListener('toggle-news-published', togglePublished);
    return () => window.removeEventListener('toggle-news-published', togglePublished);
  }, []);

  // Função para carregar mais itens quando fazer scroll
  const handleScroll = useCallback(() => {
    if (!feedContainerRef.current || isLoadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = feedContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Carregar mais itens quando estiver a 200px do final
    if (distanceFromBottom < 200 && visibleItemsCount < filteredNews.length) {
      setIsLoadingMore(true);
      
      // Simular delay de carregamento para UX
      setTimeout(() => {
        setVisibleItemsCount(prev => Math.min(prev + 10, filteredNews.length));
        setIsLoadingMore(false);
      }, 300);
    }
  }, [visibleItemsCount, filteredNews.length, isLoadingMore]);

  // Adicionar listener de scroll
  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Reset visible items when filters change
  useEffect(() => {
    setVisibleItemsCount(20);
  }, [filterCategory, activeTab]);

  // Listener para ESC key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && sidebarVisible) {
        closeSidebar();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarVisible]);



  // Agrupar notícias filtradas por data
  const groupedNews = groupNewsByDate(filteredNews, 'created_at');
  
  // Limitar itens visíveis para performance
  const limitedGroupedNews = useMemo(() => {
    let itemCount = 0;
    const limited = [];
    
    for (const group of groupedNews) {
      if (itemCount >= visibleItemsCount) break;
      
      const remainingItems = visibleItemsCount - itemCount;
      const groupItems = group.items.slice(0, remainingItems);
      
      if (groupItems.length > 0) {
        limited.push({
          ...group,
          items: groupItems
        });
        itemCount += groupItems.length;
      }
    }
    
    return limited;
  }, [groupedNews, visibleItemsCount]);

  // Renderização de estado de carregamento
  if (loading) {
    return (
      <div className="w-full h-screen flex" style={{ backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
        {/* Coluna Central - Lista de Notícias */}
        <div className="flex-[0_0_70%] min-w-0 flex flex-col">
          {/* Header do Feed */}
          <div className="header-standard" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
            <div className="flex flex-col gap-3">
            </div>
          </div>

          {/* Lista de Skeletons */}
          <div 
            className="flex-1 overflow-y-auto"
            style={{
              padding: '16px 24px'
            }}
          >
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Array.from({ length: 5 }, (_, index) => (
                  <FeedItemSkeleton key={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Coluna Direita */}
        <div 
          className="flex-[0_0_30%] flex-shrink-0"
          style={{ 
            borderLeft: '1px solid var(--border-primary)',
            backgroundColor: 'var(--bg-secondary)',
            overflow: 'auto'
          }}
        >
          <DetailsSidebar selectedItem={null} />
        </div>
      </div>
    );
  }

  // Renderização de estado de erro
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="text-6xl mb-4" style={{ color: 'var(--status-error)' }}>⚠️</div>
          <p style={{ color: 'var(--status-error)', fontFamily: 'Inter', fontSize: '18px' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', overflow: 'hidden', position: 'relative', minWidth: '0', width: '100%' }}>
      {/* Header Global do Feed */}
      <div className="header-standard" style={{ 
        paddingTop: '12px', 
        paddingBottom: '12px',
        paddingLeft: '24px',
        paddingRight: '24px',
        width: '100%',
        minWidth: '0',
        flexShrink: 0
      }}>
        <div className="flex flex-col gap-3">
          {/* Filtros em linha horizontal compacta */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
            {/* Toggle de modo de visualização */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <motion.button
                onClick={toggleViewMode}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  backgroundColor: !isCompact ? 'var(--primary-green)' : 'var(--bg-secondary)',
                  color: !isCompact ? 'var(--text-white)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  width: '32px',
                  height: '32px'
                }}
                title="Modo normal"
              >
                <Grid3X3 size={14} />
              </motion.button>
              
              <motion.button
                onClick={toggleViewMode}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  backgroundColor: isCompact ? 'var(--primary-green)' : 'var(--bg-secondary)',
                  color: isCompact ? 'var(--text-white)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  width: '32px',
                  height: '32px'
                }}
                title="Modo compacto"
              >
                <List size={14} />
              </motion.button>
            </div>

            {/* Feed já utiliza lina_news por padrão */}

            {/* Filtro de categorias no canto direito */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
                fontFamily: 'Inter',
                fontSize: '13px',
                fontWeight: '400',
                borderRadius: '6px',
                padding: '8px 12px',
                height: '32px',
                minWidth: '140px'
              }}
            >
              <option value="all">Todas as categorias</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sistema de Abas - fora do header */}
      <div style={{ 
        width: '100%',
        backgroundColor: 'var(--bg-primary)',
        paddingLeft: '0px',
        paddingRight: '24px',
        paddingTop: '0px',
        paddingBottom: '12px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: '0px', alignItems: 'end' }}>
          <motion.button
            onClick={() => setActiveTab('pending')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: activeTab === 'pending' ? 'var(--primary-green)' : 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
              borderTop: '1px solid var(--bg-primary)',
              borderBottom: activeTab === 'pending' ? '1px solid var(--primary-green)' : '1px solid var(--border-primary)',
              borderRadius: '0 0 0 0',
              padding: '12px 24px 12px 24px',
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: activeTab === 'pending' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Notícias Pendentes
          </motion.button>
          
          <motion.button
            onClick={() => setActiveTab('completed')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: activeTab === 'completed' ? 'var(--primary-green)' : 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
              borderTop: '1px solid var(--bg-primary)',
              borderBottom: activeTab === 'completed' ? '1px solid var(--primary-green)' : '1px solid var(--border-primary)',
              borderRadius: '0 0 12px 0',
              padding: '12px 24px 12px 24px',
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: activeTab === 'completed' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginLeft: '-1px'
            }}
          >
            Notícias Concluídas
          </motion.button>
        </div>
      </div>

      {/* Container Principal com Lista de Notícias */}
      <div className="flex-1 flex" style={{ overflow: 'hidden', minWidth: '0', width: '100%' }}>
        {/* Coluna Central - Lista de Notícias */}
        <div className="flex-1 flex flex-col" style={{ minWidth: '0', width: '100%' }}>

                  {/* Lista de Notícias */}
        <div 
          ref={feedContainerRef}
          className="flex-1 overflow-y-auto"
          style={{
            padding: '24px',
            paddingTop: '0px',
            width: '100%',
            minWidth: '0'
          }}
        >
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 0', width: '100%' }}>
            {limitedGroupedNews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '96px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  {activeTab === 'completed' ? '✅' : '📰'}
                </div>
                <p 
                  style={{ 
                    color: 'var(--text-secondary)', // Text Secondary do style guide
                    fontFamily: 'Inter',
                    fontSize: '18px', // Título de Seção (H2) do style guide
                    fontWeight: '600' // SemiBold (600) do style guide
                  }}
                >
                  {activeTab === 'completed' 
                    ? 'Nenhuma notícia concluída encontrada.'
                    : 'Nenhuma notícia pendente encontrada.'
                  }
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
                  {limitedGroupedNews.map((group, groupIndex) => (
                    <div key={group.date.toISOString()} style={{ marginBottom: '16px' }}>
                      {/* Header da data - sticky */}
                      <div 
                        style={{
                          position: 'sticky',
                          top: '0',
                          zIndex: 10,
                          backgroundColor: 'var(--bg-primary)',
                          padding: '12px 0 8px 0',
                          marginBottom: '12px',
                          borderBottom: '1px solid var(--border-primary)',
                          backdropFilter: 'blur(8px)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        <h2 style={{
                          color: 'var(--text-primary)',
                          fontFamily: 'Inter',
                          fontSize: '16px',
                          fontWeight: '600',
                          margin: '0'
                        }}>
                          {group.label}
                        </h2>
                        <p style={{
                          color: 'var(--text-secondary)',
                          fontFamily: 'Inter',
                          fontSize: '12px',
                          fontWeight: '400',
                          margin: '2px 0 0 0'
                        }}>
                          {group.items.length} notícia{group.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                                          {/* Notícias do grupo */}
                    <motion.div 
                      style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '8px' : '12px' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AnimatePresence>
                        {group.items.map((item, itemIndex) => (
                          <FeedItem
                            key={item.id}
                            item={item}
                            isSelected={selectedNews?.id === item.id}
                            onClick={() => handleNewsSelect(item)}
                            onMarkAsRead={handleMarkAsRead}
                            index={itemIndex}
                            isCompact={isCompact}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                    </div>
                  ))}
                </div>
                
                {/* Indicador de mais itens para carregar */}
                {(visibleItemsCount < filteredNews.length || isLoadingMore) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ 
                      textAlign: 'center', 
                      padding: '24px 0',
                      color: 'var(--text-secondary)',
                      fontFamily: 'Inter',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Loader2 
                      size={16} 
                      style={{ 
                        animation: isLoadingMore ? 'spin 1s linear infinite' : 'none' 
                      }} 
                    />
                    {isLoadingMore ? 'Carregando mais notícias...' : 'Role para carregar mais'}
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      </div>
      
      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
            fontSize: '14px',
            fontFamily: 'Inter'
          },
                      success: {
              iconTheme: {
                primary: 'var(--primary-green)',
                secondary: 'var(--text-white)',
              },
            },
        }}
      />

      {/* Backdrop - aparece quando sidebar está visível */}
      {sidebarVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 999,
            animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(2px)'
          }}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Container */}
      <div
                  style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '85%',
            backgroundColor: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border-primary)',
          zIndex: 1001,
          transform: sidebarVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: sidebarVisible ? '-8px 0 32px rgba(0, 0, 0, 0.3)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          willChange: 'transform'
        }}
      >
        {/* Header da Sidebar com botão de fechar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-primary)',
            backgroundColor: 'var(--bg-secondary)',
            position: 'sticky',
            top: 0,
            zIndex: 1002,
            flexShrink: 0
          }}
        >
          <h2
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'Inter',
              fontWeight: '600',
              fontSize: '18px',
              margin: 0
            }}
          >
            Detalhes da Notícia
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Botão de teste para dados de exemplo */}
            <button
              onClick={() => {
                setSelectedNews(sampleWellnessItem);
                setSidebarVisible(true);
              }}
              style={{
                background: '#2BB24C',
                border: 'none',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontWeight: '500'
              }}
              title="Carregar dados de exemplo para teste"
            >
              Teste
            </button>
            <button
              onClick={closeSidebar}
              aria-label="Fechar detalhes da notícia"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'var(--text-secondary)';
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Container para conteúdo da sidebar */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <DetailsSidebar selectedItem={selectedNews} />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      {readerItem && (
        <NewsReaderPanel item={readerItem} onClose={() => setReaderItem(null)} />
      )}
    </div>
  );
};

// Exportação padrão do componente
export default CurationFeed;