import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { fetchLinaNewsByNewsId } from '../services/contentApi';
import EntitiesModal from './EntitiesModal';
import CoreQuotesModal from './CoreQuotesModal';

const DetailsSidebar = ({ selectedItem }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isEntitiesModalOpen, setIsEntitiesModalOpen] = useState(false);
  const [entitiesModalIndex, setEntitiesModalIndex] = useState(0);
  const [isQuotesModalOpen, setIsQuotesModalOpen] = useState(false);
  const [quotesForSection, setQuotesForSection] = useState([]);
  const [quotesModalTitle, setQuotesModalTitle] = useState('Citações');

  // Garantir que o modal de entidades e o de citações não permaneçam abertos ao trocar de notícia
  React.useEffect(() => {
    setIsEntitiesModalOpen(false);
    setEntitiesModalIndex(0);
    setIsQuotesModalOpen(false);
    setQuotesForSection([]);
  }, [selectedItem?.id]);

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

  // Função para renderizar seções com estilo consistente
  const DetailSection = ({ label, children, hasBackground = false }) => (
    <div style={{ marginBottom: '24px' }}>
      <h3 
        style={{ 
          color: '#A0A0A0',
          fontFamily: 'Inter',
          fontWeight: '500',
          fontSize: '14px',
          letterSpacing: '0.5px',
          marginBottom: '12px'
        }}
      >
        {label}
      </h3>
      <div 
        style={{ 
          color: 'var(--text-primary)',
          fontFamily: 'Inter',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: '1.8',
          ...(hasBackground && {
            backgroundColor: '#2A2A2A',
            border: '1px solid #333333',
            borderRadius: '6px',
            padding: '20px'
          })
        }}
      >
        {children}
      </div>
    </div>
  );

  // Função para renderizar entidades como botões/tags
  const renderWellnessEntities = (entities, onEntityClick) => {
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return <div style={{ color: '#A0A0A0', fontStyle: 'italic' }}>Nenhuma entidade disponível</div>;
    }
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px'
      }}>
        {entities.map((entidade, index) => (
          <div 
            key={index}
            style={{
              padding: '10px 12px',
              backgroundColor: '#2A2A2A',
              border: '1px solid #444444',
              borderRadius: '10px',
              fontSize: '13px',
              color: '#E0E0E0',
              fontFamily: 'Inter',
              fontWeight: 600,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={entidade.trim()}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#3A3A3A';
              e.target.style.borderColor = '#666666';
              e.target.style.transform = 'translateY(-2px) scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#2A2A2A';
              e.target.style.borderColor = '#444444';
              e.target.style.transform = 'translateY(0) scale(1)';
            }}
            onClick={() => onEntityClick && onEntityClick(index)}
          >
            {entidade.trim()}
          </div>
        ))}
      </div>
    );
  };

  // Extrair dados do wellness_data
  const getWellnessData = () => {
    try {
      return selectedItem.wellness_data ? JSON.parse(selectedItem.wellness_data) : null;
    } catch (error) {
      console.error('Erro ao fazer parse do wellness_data:', error);
      return null;
    }
  };

  // Extrair dados do entities_data
  const getEntitiesData = () => {
    try {
      return selectedItem.entities_data ? JSON.parse(selectedItem.entities_data) : null;
    } catch (error) {
      console.error('Erro ao fazer parse do entities_data:', error);
      return null;
    }
  };

  // Extrair dados do structured_summary (mantido para compatibilidade)
  const getStructuredData = () => {
    try {
      return selectedItem.structured_summary ? JSON.parse(selectedItem.structured_summary) : null;
    } catch (error) {
      console.error('Erro ao fazer parse do structured_summary:', error);
      return null;
    }
  };

  // Extrair core_quotes
  const getCoreQuotes = () => {
    try {
      return selectedItem.core_quotes ? JSON.parse(selectedItem.core_quotes) : null;
    } catch (error) {
      console.error('Erro ao fazer parse do core_quotes:', error);
      return null;
    }
  };

  const wellnessData = getWellnessData();
  const entitiesData = getEntitiesData();
  const structuredData = getStructuredData();
  const coreQuotes = getCoreQuotes();

  // Preparar lista de entidades combinando principal e complementares
  const getAllEntityNames = () => {
    const names = [];
    
    if (entitiesData?.entidade_principal?.nome) {
      names.push(entitiesData.entidade_principal.nome);
    }
    
    if (entitiesData?.entidades_complementares && Array.isArray(entitiesData.entidades_complementares)) {
      entitiesData.entidades_complementares.forEach(ent => {
        if (ent.nome) names.push(ent.nome);
      });
    }
    
    return names;
  };

  const buildEntitiesList = () => {
    const list = [];
    if (entitiesData?.entidade_principal) {
      list.push({
        type: 'principal',
        name: entitiesData.entidade_principal.nome || 'Entidade principal',
        o_que_e: entitiesData.entidade_principal.o_que_e || '',
        relevancia_noticia: entitiesData.entidade_principal.relevancia_noticia || '',
        contexto_essencial: entitiesData.entidade_principal.contexto_essencial || '',
      });
    }
    if (Array.isArray(entitiesData?.entidades_complementares)) {
      entitiesData.entidades_complementares.forEach((e) => {
        list.push({
          type: 'complementar',
          name: e.nome || 'Entidade',
          o_que_e: e.o_que_e || '',
          papel_noticia: e.papel_noticia || '',
        });
      });
    }
    return list;
  };

  const entityNames = getAllEntityNames();

  const openEntitiesModalAt = (index) => {
    setEntitiesModalIndex(index);
    setIsEntitiesModalOpen(true);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      position: 'relative',
      backgroundColor: 'var(--bg-secondary)',
      color: 'var(--text-primary)'
    }}>
      {/* Conteúdo principal */}
      <div style={{ 
        padding: '24px', 
        flex: 1,
        overflowY: 'auto'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* TOP SECTION - Topline Summary (ESQUERDA) e Título/Link (DIREITA) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '24px',
            alignItems: 'start'
          }}>
            
            {/* ESQUERDA - Topline Summary */}
            <div>
              {wellnessData?.wellness_focus?.topline_summary && (
                <DetailSection label="O que aconteceu?" hasBackground={true}>
                  <div
                    onClick={() => {
                      // filtrar core_quotes categoria funcional: Fato_Central
                      try {
                        const bucket = coreQuotes?.search_quotes || {};
                        const allLists = Object.values(bucket).flat();
                        const filtered = allLists.filter((item) => item?.categoria_funcional === 'Fato_Central');
                        setQuotesForSection(filtered || []);
                        setQuotesModalTitle('O que aconteceu? • Fato Central');
                        setIsQuotesModalOpen(true);
                      } catch (e) {
                        setQuotesForSection([]);
                        setIsQuotesModalOpen(true);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Clique para ver exemplos de citações deste bloco"
                  >
                    {wellnessData.wellness_focus.topline_summary}
                  </div>
                </DetailSection>
              )}
            </div>
            
            {/* DIREITA - Título e Link */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Título */}
              <DetailSection label="Titulo">
                {selectedItem.title || 'Sem título disponível'}
              </DetailSection>
              
              {/* Link */}
              {selectedItem.link && (
                <DetailSection label="Link">
                  <a 
                    href={selectedItem.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#2BB24C',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontFamily: 'Inter',
                      fontWeight: '400',
                      lineHeight: '1.4',
                      display: 'block',
                      wordBreak: 'break-all'
                    }}
                    title={selectedItem.link}
                  >
                    {selectedItem.link}
                  </a>
                </DetailSection>
              )}
            </div>
          </div>

          {/* MIDDLE SECTION (2 colunas lado a lado - SEM BACKGROUND) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '24px'
          }}>
            
            {/* ESQUERDA - Tipo da noticia (provido por entities_data) */}
            <div>
              {(entitiesData?.analise_entidades?.resumo_analise?.tipo_noticia || entitiesData?.resumo_analise?.tipo_noticia) && (
                <DetailSection label="Tipo da noticia" hasBackground={false}>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    lineHeight: '1.4'
                  }}>
                    {entitiesData?.analise_entidades?.resumo_analise?.tipo_noticia || entitiesData?.resumo_analise?.tipo_noticia}
                  </div>
                </DetailSection>
              )}
            </div>
            
            {/* DIREITA - Setores impactados (sem background, fonte maior) */}
            <div>
              {wellnessData?.metadata?.subsetores_impactados && (
                <DetailSection label="Setores impactados" hasBackground={false}>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    lineHeight: '1.4'
                  }}>
                    {wellnessData.metadata.subsetores_impactados}
                  </div>
                </DetailSection>
              )}
            </div>
          </div>

          {/* BOTTOM SECTIONS - Relevância de Mercado e Entities Data (grid 2x2) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '24px'
          }}>
            
            {/* ESQUERDA - Relevância de Mercado */}
            <div>
              {wellnessData?.relevance_market_trends?.relevancia_mercado && (
                <DetailSection label="Por que isso importa?" hasBackground={true}>
                  <div
                    onClick={() => {
                      try {
                        const bucket = coreQuotes?.search_quotes || {};
                        const allLists = Object.values(bucket).flat();
                        const filtered = allLists.filter((item) => item?.categoria_funcional === 'Causas_Motivacoes');
                        setQuotesForSection(filtered || []);
                        setQuotesModalTitle('Por que isso importa? • Causas e Motivações');
                        setIsQuotesModalOpen(true);
                      } catch (e) {
                        setQuotesForSection([]);
                        setIsQuotesModalOpen(true);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Clique para ver exemplos de citações deste bloco"
                  >
                    {wellnessData.relevance_market_trends.relevancia_mercado}
                  </div>
                </DetailSection>
              )}
            </div>
            
            {/* DIREITA - Entities Data (ocupa metade do espaço) */}
            <div>
              <DetailSection label="Entidades identificadas">
                {renderWellnessEntities(entityNames, openEntitiesModalAt)}
              </DetailSection>
            </div>
          </div>

          {/* BOTTOM SECTIONS - Impacto Futuro, Oportunidades e Motivo/Consequência */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '24px'
          }}>
            
            {/* ESQUERDA - Motivo / Consequência */}
            <div>
              {structuredData?.motivo_ou_consequencia && (
                <DetailSection label="Motivo / Consequência" hasBackground={true}>
                  <div
                    onClick={() => {
                      try {
                        const bucket = coreQuotes?.search_quotes || {};
                        const allLists = Object.values(bucket).flat();
                        const filtered = allLists.filter((item) => item?.categoria_funcional === 'Impactos_Consequencias');
                        setQuotesForSection(filtered || []);
                        setQuotesModalTitle('Motivo / Consequência • Impactos e Consequências');
                        setIsQuotesModalOpen(true);
                      } catch (e) {
                        setQuotesForSection([]);
                        setIsQuotesModalOpen(true);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Clique para ver exemplos de citações deste bloco"
                  >
                    {structuredData.motivo_ou_consequencia}
                  </div>
                </DetailSection>
              )}
            </div>
            
            {/* MEIO - Possiveis oportunidades */}
            <div>
              {wellnessData?.metadata?.oportunidades_identificadas && (
                <DetailSection label="Possiveis oportunidades" hasBackground={true}>
                  <div
                    onClick={() => {
                      try {
                        const bucket = coreQuotes?.search_quotes || {};
                        const allLists = Object.values(bucket).flat();
                        const filtered = allLists.filter((item) => item?.categoria_funcional === 'Desafios_Oportunidades');
                        setQuotesForSection(filtered || []);
                        setQuotesModalTitle('Possiveis oportunidades • Desafios e Oportunidades');
                        setIsQuotesModalOpen(true);
                      } catch (e) {
                        setQuotesForSection([]);
                        setIsQuotesModalOpen(true);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Clique para ver exemplos de citações deste bloco"
                  >
                    {wellnessData.metadata.oportunidades_identificadas}
                  </div>
                </DetailSection>
              )}
            </div>
            
            {/* DIREITA - Impacto Futuro */}
            <div>
              {wellnessData?.relevance_market_trends?.impacto_futuro && (
                <DetailSection label="Impacto futuro" hasBackground={true}>
                  <div
                    onClick={() => {
                      try {
                        const bucket = coreQuotes?.search_quotes || {};
                        const allLists = Object.values(bucket).flat();
                        const filtered = allLists.filter((item) => item?.categoria_funcional === 'Projecoes_Futuro');
                        setQuotesForSection(filtered || []);
                        setQuotesModalTitle('Impacto futuro • Projeções de Futuro');
                        setIsQuotesModalOpen(true);
                      } catch (e) {
                        setQuotesForSection([]);
                        setIsQuotesModalOpen(true);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Clique para ver exemplos de citações deste bloco"
                  >
                    {wellnessData.relevance_market_trends.impacto_futuro}
                  </div>
                </DetailSection>
              )}
            </div>
          </div>

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

      {/* Modal de Entidades */}
      <EntitiesModal
        isOpen={isEntitiesModalOpen}
        onClose={() => setIsEntitiesModalOpen(false)}
        entitiesList={buildEntitiesList()}
        initialIndex={entitiesModalIndex}
      />

      <CoreQuotesModal
        isOpen={isQuotesModalOpen}
        onClose={() => setIsQuotesModalOpen(false)}
        quotes={quotesForSection}
        title={quotesModalTitle}
      />
    </div>
  );
};

export default DetailsSidebar;