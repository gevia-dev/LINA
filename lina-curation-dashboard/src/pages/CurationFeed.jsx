import React, { useState, useEffect } from 'react';
import { fetchNews } from '../services/contentApi';

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

  // Renderização de estado de carregamento
  if (loading) {
    return <div style={{ color: 'white', padding: '20px' }}>Carregando feed...</div>;
  }

  // Renderização de estado de erro
  if (error) {
    return <div style={{ color: 'red', padding: '20px' }}>{error}</div>;
  }

  // Renderização da lista de notícias
  return (
    <div style={{ color: 'white', fontFamily: 'sans-serif', padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Feed de Curadoria</h1>
      {newsItems.length === 0 ? (
        <p>Nenhuma notícia encontrada.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {newsItems.map((item) => (
            <li key={item.id} style={{ border: '1px solid #444', borderRadius: '8px', padding: '15px', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>{item.title || 'Sem título'}</h3>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#ccc' }}>Status: {item.status || 'N/A'}</span>
                {item.fonte && <span style={{ fontSize: '14px', color: '#ccc', marginLeft: '15px' }}>Fonte: {item.fonte}</span>}
              </div>
              {item.macro_categoria && (
                <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '5px' }}>
                  Categoria: {item.macro_categoria}
                  {item.sub_categoria && ` / ${item.sub_categoria}`}
                </div>
              )}
              {item.step && (
                <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '5px' }}>
                  Step: {item.step}
                </div>
              )}
              <small style={{ color: '#888' }}>ID: {item.id}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CurationFeed;