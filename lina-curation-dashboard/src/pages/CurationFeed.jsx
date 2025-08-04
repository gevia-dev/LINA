import React, { useState, useEffect } from 'react';
import { fetchNews } from '../services/contentApi';
import MainSidebar from '../components/MainSidebar';
import { NavLink } from 'react-router-dom';

const CurationFeed = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadInitialNews = async () => {
      try {
        setLoading(true);
        const { data } = await fetchNews(0, 100); // Carrega os 100 primeiros itens
        if (data) {
          setNewsItems(data);
        }
      } catch (err) {
        setError('Não foi possível carregar as notícias.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialNews();
  }, []);

  // Função para renderizar o conteúdo do feed
  const renderFeedContent = () => {
    if (loading) {
      return <div className="text-[#A0A0A0] p-8">Carregando feed...</div>;
    }

    if (error) {
      return <div className="text-red-500 p-8">{error}</div>;
    }

    return (
      <div className="p-8 font-inter">
        <h1
          className="font-bold mb-6"
          style={{ fontSize: '24px', color: '#E0E0E0' }}
        >
          Feed de Curadoria
        </h1>
        {newsItems.length === 0 ? (
          <p style={{ color: '#A0A0A0' }}>Nenhuma notícia encontrada.</p>
        ) : (
          <ul className="space-y-4">
            {newsItems.map((item) => (
              <li
                key={item.id}
                className="p-4 rounded-lg transition-colors hover:bg-[#2BB24C33]"
                style={{
                  backgroundColor: '#1E1E1E',
                  border: '1px solid #333333'
                }}
              >
                <NavLink to={`/news/${item.id}`} className="block">
                  <h3
                    className="font-medium mb-2"
                    style={{ fontSize: '16px', color: '#E0E0E0' }}
                  >
                    {item.title || 'Sem título'}
                  </h3>
                  <div className="flex items-center text-sm mb-2" style={{ color: '#A0A0A0' }}>
                    <span className="px-2 py-1 text-xs rounded-full" style={{backgroundColor: '#333333', color: '#E0E0E0'}}>
                      {item.status || 'N/A'}
                    </span>
                    {item.fonte && <span className="ml-4">Fonte: {item.fonte}</span>}
                  </div>
                  {(item.macro_categoria || item.step) && (
                    <div className="text-xs" style={{ color: '#A0A0A0' }}>
                      {item.macro_categoria}
                      {item.sub_categoria && ` / ${item.sub_categoria}`}
                      {item.step && ` • Step: ${item.step}`}
                    </div>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex overflow-hidden" style={{ backgroundColor: '#121212' }}>
      <MainSidebar />
      <main className="flex-1 overflow-y-auto">
        {renderFeedContent()}
      </main>
    </div>
  );
};

export default CurationFeed;