import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
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
    return (
      <div style={{ padding: '24px' }}> {/* Seções Principais: 24px do style guide */}
        <div style={{ textAlign: 'center', padding: '96px 0' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px', color: '#A0A0A0' }}>📋</div>
          <p 
            style={{ 
              color: '#A0A0A0', // Text Secondary do style guide
              fontFamily: 'Inter',
              fontSize: '14px', // Corpo do Texto do style guide
              fontWeight: '400' // Regular (400) do style guide
            }}
          >
            Selecione uma notícia para ver os detalhes
          </p>
        </div>
      </div>
    );
  }

  const DetailItem = ({ label, children }) => (
    <div style={{ marginBottom: '16px' }}> {/* Múltiplo de 8px */}
      <h3 
        style={{ 
          color: '#A0A0A0', // Text Secondary do style guide
          fontFamily: 'Inter',
          fontWeight: '500', // Medium (500) do style guide
          fontSize: '12px', // Subtítulo/Metadado do style guide
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
        <h2 
          style={{ 
            color: '#E0E0E0', // Text Primary do style guide
            fontFamily: 'Inter',
            fontWeight: '600', // SemiBold (600) do style guide
            fontSize: '18px', // Título de Seção (H2) do style guide
            marginBottom: '24px'
          }}
        >
          Detalhes da Notícia
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
         {/* Dados da notícia original */}
         {selectedItem.link && (
           <DetailItem label="Link Original">
                           <a 
                href={selectedItem.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#2BB24C', // Accent color do style guide
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                  whiteSpace: 'nowrap'
                }}
                title={selectedItem.link}
              >
                {selectedItem.link}
              </a>
           </DetailItem>
         )}
         
                   {selectedItem.created_at && (
            <DetailItem label="Data de Criação">
              {new Date(selectedItem.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </DetailItem>
          )}
         
         <DetailItem label="Título">
           {selectedItem.title || 'Sem título'}
         </DetailItem>
        
        {/* Structured Summary */}
        {(() => {
          try {
            const structuredSummary = selectedItem.structured_summary ? JSON.parse(selectedItem.structured_summary) : null;
            
            if (structuredSummary) {
              return (
                                 <>
                   {structuredSummary.resumo_vetorial && (
                     <DetailItem label="Resumo">
                       {structuredSummary.resumo_vetorial}
                     </DetailItem>
                   )}
                   
                   {structuredSummary.motivo_ou_consequencia && (
                     <DetailItem label="Motivo / Consequência">
                       {structuredSummary.motivo_ou_consequencia}
                     </DetailItem>
                   )}
                   
                   {structuredSummary.quem && Array.isArray(structuredSummary.quem) && structuredSummary.quem.length > 0 && (
                     <DetailItem label="Entidades">
                       <ul style={{ 
                         listStyle: 'none', 
                         padding: 0, 
                         margin: 0,
                         display: 'flex',
                         flexDirection: 'column',
                         gap: '4px'
                       }}>
                         {structuredSummary.quem.map((entidade, index) => (
                           <li 
                             key={index}
                             style={{
                               padding: '4px 8px',
                               backgroundColor: '#2A2A2A',
                               borderRadius: '4px',
                               fontSize: '12px',
                               color: '#E0E0E0',
                               fontFamily: 'Inter',
                               fontWeight: '400'
                             }}
                           >
                             {entidade.trim()}
                           </li>
                         ))}
                       </ul>
                     </DetailItem>
                   )}
                 </>
              );
            }
            return null;
          } catch (error) {
            console.error('Erro ao fazer parse do structured_summary:', error);
            return null;
                     }
         })()}
       </div>
      </div>

      {/* Barra Sticky - Criar Notícia */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        backgroundColor: '#1E1E1E',
        borderTop: '1px solid #333333',
        padding: '16px 24px',
        zIndex: 10
      }}>
                 <button
           onClick={handleCreateNews}
           disabled={isLoading}
           style={{
             width: '100%',
             padding: '12px 16px',
             backgroundColor: isLoading ? '#666666' : '#2BB24C',
             color: 'white',
             border: 'none',
             borderRadius: '6px',
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
               e.target.style.backgroundColor = '#25A043';
             }
           }}
           onMouseLeave={(e) => {
             if (!isLoading) {
               e.target.style.backgroundColor = '#2BB24C';
             }
           }}
         >
           <FileText size={16} />
           {isLoading ? 'Buscando...' : 'Criar a Notícia'}
         </button>
      </div>
    </div>
  );
};

export default DetailsSidebar;