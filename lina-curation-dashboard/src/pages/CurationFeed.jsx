import React, { useState, useEffect } from 'react';
import { fetchNews, fetchNewsFromLinaNews } from '../services/contentApi';
import FeedItem from '../components/FeedItem';
import DetailsSidebar from '../components/DetailsSidebar';

const CurationFeed = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLinaNews, setFilterLinaNews] = useState(false);

  // Função para carregar notícias baseado no filtro
  const loadNews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let result;
      if (filterLinaNews) {
        // Carrega apenas notícias que existem na lina_news
        result = await fetchNewsFromLinaNews(0, 100);
      } else {
        // Carrega todas as notícias normalmente
        result = await fetchNews(0, 100);
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
  }, [filterLinaNews]); // Recarrega quando o filtro muda

  // Filtrar notícias baseado nos filtros selecionados (exceto lina_news que já é filtrado no carregamento)
  const filteredNews = newsItems.filter(item => {
    const statusMatch = filterStatus === 'all' || item.status === filterStatus;
    const categoryMatch = filterCategory === 'all' || item.macro_categoria === filterCategory;
    return statusMatch && categoryMatch;
  });

  // Obter categorias únicas para o filtro
  const uniqueCategories = [...new Set(newsItems.map(item => item.macro_categoria).filter(Boolean))];
  const uniqueStatuses = [...new Set(newsItems.map(item => item.status).filter(Boolean))];

  const handleNewsSelect = (news) => {
    setSelectedNews(news);
  };



  // Renderização de estado de carregamento
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#121212' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#2BB24C' }}></div>
          <p style={{ color: '#A0A0A0', fontFamily: 'Inter' }}>Carregando feed...</p>
        </div>
      </div>
    );
  }

  // Renderização de estado de erro
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#121212' }}>
        <div className="text-center">
          <div className="text-6xl mb-4" style={{ color: '#EF4444' }}>⚠️</div>
          <p style={{ color: '#EF4444', fontFamily: 'Inter', fontSize: '18px' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex" style={{ backgroundColor: '#121212', overflow: 'hidden' }}>
      {/* Coluna Central - Lista de Notícias */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header do Feed */}
        <div className="header-standard">
          <div className="flex items-center justify-between">
            <div>
              <h1 
                style={{ 
                  color: '#E0E0E0', // Text Primary do style guide
                  fontFamily: 'Inter',
                  fontWeight: '700', // Bold (700) do style guide
                  fontSize: '24px', // Título Principal (H1) do style guide
                  marginBottom: '8px'
                }}
              >
                Feed de Curadoria
              </h1>
              <p 
                style={{ 
                  color: '#A0A0A0', // Text Secondary do style guide
                  fontFamily: 'Inter',
                  fontSize: '12px', // Subtítulo/Metadado do style guide
                  fontWeight: '400' // Regular (400) do style guide
                }}
              >
                {filteredNews.length} de {newsItems.length} notícias
                {filterLinaNews && ' (apenas da lina_news)'}
              </p>
            </div>
            
            {/* Filtros */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  backgroundColor: '#1E1E1E', // Secondary Background do style guide
                  color: '#E0E0E0', // Text Primary do style guide
                  border: '1px solid #333333', // Borders/Dividers do style guide
                  fontFamily: 'Inter',
                  fontSize: '14px', // Corpo do Texto do style guide
                  fontWeight: '400', // Regular (400) do style guide
                  borderRadius: '6px', // 6px para botões do style guide
                  padding: '12px' // Cards e Inputs: 12px do style guide
                }}
              >
                <option value="all">Todos os status</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  backgroundColor: '#1E1E1E', // Secondary Background do style guide
                  color: '#E0E0E0', // Text Primary do style guide
                  border: '1px solid #333333', // Borders/Dividers do style guide
                  fontFamily: 'Inter',
                  fontSize: '14px', // Corpo do Texto do style guide
                  fontWeight: '400', // Regular (400) do style guide
                  borderRadius: '6px', // 6px para botões do style guide
                  padding: '12px' // Cards e Inputs: 12px do style guide
                }}
              >
                <option value="all">Todas as categorias</option>
                {uniqueCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {/* Filtro temporário para lina_news */}
              <label 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#E0E0E0',
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: '400',
                  cursor: 'pointer',
                  padding: '12px',
                  backgroundColor: '#1E1E1E',
                  border: '1px solid #333333',
                  borderRadius: '6px'
                }}
              >
                <input
                  type="checkbox"
                  checked={filterLinaNews}
                  onChange={(e) => setFilterLinaNews(e.target.checked)}
                  style={{
                    accentColor: '#2BB24C',
                    cursor: 'pointer'
                  }}
                />
                Apenas notícias na lina_news
              </label>
            </div>
          </div>
        </div>

        {/* Lista de Notícias */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{
            padding: '24px 260px' // Seções Principais: 24px do style guide + margens laterais aumentadas
          }}
        >
          {filteredNews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '96px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', color: '#A0A0A0' }}>📰</div>
              <p 
                style={{ 
                  color: '#A0A0A0', // Text Secondary do style guide
                  fontFamily: 'Inter',
                  fontSize: '18px', // Título de Seção (H2) do style guide
                  fontWeight: '600' // SemiBold (600) do style guide
                }}
              >
                Nenhuma notícia encontrada.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredNews.map((item) => (
                <FeedItem
                  key={item.id}
                  item={item}
                  isSelected={selectedNews?.id === item.id}
                  onClick={() => handleNewsSelect(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Coluna Direita - Detalhes da Notícia Selecionada */}
      <div 
        className="w-1/4 flex-shrink-0"
        style={{ 
          borderLeft: '1px solid #333333', // Borders/Dividers do style guide
          backgroundColor: '#1E1E1E', // Secondary Background do style guide
          overflow: 'auto'
        }}
      >
        <DetailsSidebar selectedItem={selectedNews} />
      </div>
    </div>
  );
};

export default CurationFeed;