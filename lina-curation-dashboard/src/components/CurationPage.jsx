import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import AdvancedCanvasEditor from './advancedCanvas/AdvancedCanvasEditor';
import supabase from '../lib/supabaseClient.js';

const CurationPage = () => {
  const { id } = useParams();
  const [newsData, setNewsData] = useState(null);
  const [newsTitle, setNewsTitle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  
  
  // Ref para o painel do editor
  const editorPanelRef = useRef(null);

  // Função para buscar dados completos da notícia
  const fetchFullNewsData = useCallback(async (newsId) => {
    if (!newsId) return;
    
    setIsLoading(true);
    setLoadError(null);
    
    try {
      // Verificar se há sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      
      // Primeiro, buscar o news_id na tabela lina_news
      const { data: linaNewsData, error: linaNewsError } = await supabase
        .from('lina_news')
        .select('news_id, core_structure, variant_structure, core_quotes')
        .eq('id', newsId);

      if (linaNewsError) {
        console.error('❌ Erro na consulta lina_news:', linaNewsError);
        throw linaNewsError;
      }

      if (!linaNewsData || linaNewsData.length === 0) {
        console.warn('⚠️ Nenhum dado encontrado na tabela lina_news para ID:', newsId);
        setNewsData(null);
        setLoadError(`Notícia com ID ${newsId} não encontrada na tabela lina_news`);
        return;
      }

      const linaRecord = linaNewsData[0];

      // Agora usar o news_id para buscar o título na tabela "Controle Geral"
      if (linaRecord.news_id) {
        const { data: controleGeralData, error: controleGeralError } = await supabase
          .from('Controle Geral')
          .select('title')
          .eq('id', linaRecord.news_id);

        if (controleGeralError) {
          console.error('❌ Erro na consulta Controle Geral:', controleGeralError);
          // Não vamos falhar aqui, apenas logar o erro
        } else if (controleGeralData && controleGeralData.length > 0) {
          setNewsTitle(controleGeralData[0].title);
        } else {
          console.warn('⚠️ Título não encontrado na tabela Controle Geral para news_id:', linaRecord.news_id);
        }
      }

      // Definir os dados da notícia com os dados da tabela lina_news
      setNewsData(linaRecord);
      
    } catch (error) {
      console.error('Erro ao carregar dados da notícia:', error);
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar dados quando o ID mudar
  useEffect(() => {
    if (id) {
      fetchFullNewsData(id);
    }
  }, [id, fetchFullNewsData]);

  

  return (
    <div className="w-full h-screen" style={{ backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
      <div className="w-full h-full" ref={editorPanelRef}>
        <AdvancedCanvasEditor 
          newsId={id} 
          newsData={newsData}
          newsTitle={newsTitle}
          isLoading={isLoading}
          loadError={loadError}
        />
      </div>
    </div>
  );
};

export default CurationPage;