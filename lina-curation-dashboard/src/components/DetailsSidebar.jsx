import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { fetchLinaNewsByNewsId } from '../services/contentApi';

const DetailsSidebar = ({ selectedItem }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateNews = async () => {
    if (!selectedItem?.id) return;
    
    setIsLoading(true);
    try {
      // Se já temos o lina_news_id (quando vem do filtro), usar diretamente
      if (selectedItem.lina_news_id) {
        navigate(`/news/${selectedItem.lina_news_id}`);
        return;
      }
      // Quando o item já é da tabela lina_news, navegar usando o próprio id
      if (Object.prototype.hasOwnProperty.call(selectedItem, 'news_id')) {
        navigate(`/news/${selectedItem.id}`);
        return;
      }
      
      // Caso contrário, buscar na tabela lina_news usando o news_id
      const linaNews = await fetchLinaNewsByNewsId(selectedItem.id);
      
      if (linaNews?.id) {
        // Redirecionar usando o id da lina_news
        navigate(`/news/${linaNews.id}`);
      } else {
        console.error('Notícia não encontrada na tabela lina_news');
        alert('Esta notícia ainda não foi processada para a lina_news. Tente novamente mais tarde.');
      }
    } catch (error) {
      console.error('Erro ao buscar notícia:', error);
      alert('Erro ao buscar notícia na lina_news. Esta notícia pode não ter sido processada ainda.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedItem) {
    return null;
  }

  const DetailItem = ({ label, children }) => (
    <div style={{ marginBottom: '16px' }}> {/* Múltiplo de 8px */}
      <h3 
        style={{ 
          color: '#A0A0A0',
          fontFamily: 'Inter',
          fontWeight: '500',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '8px'
        }}
      >
        {label}
      </h3>
      <div 
        style={{ 
          color: '#E0E0E0', // Text Primary do style guide
          fontFamily: 'Inter',
          fontSize: '14px', // Corpo do Texto do style guide
          fontWeight: '400' // Regular (400) do style guide
        }}
      >
        {children}
      </div>
    </div>
  );

  // Função para renderizar entidades em grid de 4 por linha
  const renderEntities = (entities) => {
    if (!entities || !Array.isArray(entities) || entities.length === 0) return null;
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px'
      }}>
        {entities.map((entidade, index) => (
          <div 
            key={index}
            style={{
              padding: '6px 8px',
              backgroundColor: '#2A2A2A',
              border: '1px solid #333333',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#E0E0E0',
              fontFamily: 'Inter',
              fontWeight: '500',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={entidade.trim()}
          >
            {entidade.trim()}
          </div>
        ))}
      </div>
    );
  };

  // Extrair dados do structured_summary
  const getStructuredData = () => {
    try {
      return selectedItem.structured_summary ? JSON.parse(selectedItem.structured_summary) : null;
    } catch (error) {
      console.error('Erro ao fazer parse do structured_summary:', error);
      return null;
    }
  };

  const structuredData = getStructuredData();

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      position: 'relative'
    }}>
      {/* Conteúdo principal */}
      <div style={{ 
        padding: '24px', 
        flex: 1,
        overflowY: 'auto'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 1. Link para notícia original - sem card/background */}
          {selectedItem.link && (
            <DetailItem label="Fonte">
              <a 
                href={selectedItem.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#2BB24C',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontFamily: 'Inter',
                  fontWeight: '400',
                  lineHeight: '1.4',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={selectedItem.link}
              >
                {selectedItem.link}
              </a>
            </DetailItem>
          )}
          
          {/* 2. Título da notícia - sem card/background */}
          <DetailItem label="Título">
            <div style={{
              color: '#E0E0E0',
              fontSize: '13px',
              fontFamily: 'Inter',
              fontWeight: '400',
              lineHeight: '1.4',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {selectedItem.title || 'Sem título'}
            </div>
            {selectedItem.created_at && (
              <div style={{
                fontFamily: 'Monaco, Menlo, Consolas, monospace',
                fontSize: '11px',
                color: '#A0A0A0',
                marginTop: '4px'
              }}>
                {new Date(selectedItem.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
          </DetailItem>
          
          {/* 3. Motivo ou consequência */}
          {structuredData?.motivo_ou_consequencia && (
            <DetailItem label="Motivo / Consequência">
              <div style={{
                backgroundColor: '#2A2A2A',
                border: '1px solid #333333',
                borderRadius: '6px',
                padding: '12px',
                lineHeight: '1.6'
              }}>
                {structuredData.motivo_ou_consequencia}
              </div>
            </DetailItem>
          )}
          
          {/* 4. Entidades - 4 cards por linha, mesma cor dos outros */}
          {structuredData?.quem && (
            <DetailItem label="Entidades">
              {renderEntities(structuredData.quem)}
            </DetailItem>
          )}
          
          {/* 5. Resumo */}
          {structuredData?.resumo_vetorial && (
            <DetailItem label="Resumo">
              <div style={{
                backgroundColor: '#2A2A2A',
                border: '1px solid #333333',
                borderRadius: '6px',
                padding: '12px',
                lineHeight: '1.6'
              }}>
                {structuredData.resumo_vetorial}
              </div>
            </DetailItem>
          )}
          

        </div>
      </div>

      {/* Barra Sticky - Botões Ler e Criar */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        backgroundColor: '#1E1E1E',
        borderTop: '1px solid #333333',
        padding: '16px 24px',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          {/* Botão Ler */}
          <button
            onClick={() => {
              const event = new CustomEvent('open-news-reader', { detail: { item: selectedItem } });
              window.dispatchEvent(event);
            }}
            style={{
              flex: 1,
              padding: '14px 20px',
              backgroundColor: '#2A2A2A',
              color: '#E0E0E0',
              border: '1px solid #333333',
              borderRadius: '8px',
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#333333';
              e.target.style.borderColor = '#666666';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#2A2A2A';
              e.target.style.borderColor = '#333333';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Ler
          </button>

                     {/* Botão Criar */}
           <button
             onClick={handleCreateNews}
             disabled={isLoading}
             style={{
               flex: 1,
               padding: '14px 20px',
               backgroundColor: isLoading ? '#666666' : '#2A2A2A',
               color: '#E0E0E0',
               border: isLoading ? '1px solid #666666' : '1px solid var(--primary-green-transparent)',
               borderRadius: '8px',
               fontFamily: 'Inter',
               fontSize: '14px',
               fontWeight: '500',
               cursor: isLoading ? 'not-allowed' : 'pointer',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               gap: '8px',
               transition: 'all 0.2s ease',
               opacity: isLoading ? 0.7 : 1
             }}
             onMouseEnter={(e) => {
               if (!isLoading) {
                 e.target.style.backgroundColor = '#333333';
                 e.target.style.borderColor = 'var(--primary-green)';
                 e.target.style.transform = 'translateY(-1px)';
               }
             }}
             onMouseLeave={(e) => {
               if (!isLoading) {
                 e.target.style.backgroundColor = '#2A2A2A';
                 e.target.style.borderColor = 'var(--primary-green-transparent)';
                 e.target.style.transform = 'translateY(0)';
               }
             }}
           >
                           <Sparkles size={16} />
              {isLoading ? 'Buscando...' : 'Criar'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default DetailsSidebar;