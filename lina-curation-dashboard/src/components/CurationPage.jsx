import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import MainSidebar from './MainSidebar';
import EditorPanel from './EditorPanel';
import ContextSidebar from './ContextSidebar';
import { supabase } from '../lib/supabaseClient.js';

const CurationPage = () => {
  const { id } = useParams();
  const [newsData, setNewsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);

  // Função para buscar dados completos da notícia
  const fetchFullNewsData = useCallback(async (newsId) => {
    if (!newsId) return;
    
    setIsLoading(true);
    setLoadError(null);
    
    try {
      // Verificar se há sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📱 Status da sessão:', session ? 'Autenticado' : 'Anônimo');
      console.log('🔍 Buscando dados para ID:', newsId);
      
      // Agora fazer a consulta específica - buscar pelo id correto
      const { data, error } = await supabase
        .from('lina_news')
        .select('core_structure, variant_structure, core_quotes')
        .eq('id', newsId);

      if (error) {
        console.error('❌ Erro na consulta Supabase específica:', error);
        throw error;
      }

      console.log('🔍 Resultado da consulta específica:', data);

      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhum dado encontrado para ID:', newsId);
        setNewsData(null);
        setLoadError(`Notícia com ID ${newsId} não encontrada`);
        return;
      }

      const record = data[0];
      console.log('✅ Dados carregados:', record);
      setNewsData(record);
      
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

  // Função para lidar com seleção de bloco no editor
  const handleBlockSelected = useCallback((blockId) => {
    setSelectedBlock(blockId);
  }, []);

  return (
    <div className="w-full h-screen flex overflow-hidden" style={{ backgroundColor: '#121212' }}>
      {/* Coluna Esquerda - Navegação */}
      <div className="w-64">
        <MainSidebar />
      </div>
      
      {/* Coluna Central - Editor */}
      <div className="flex-1">
        <EditorPanel 
          newsId={id} 
          newsData={newsData}
          isLoading={isLoading}
          loadError={loadError}
          onBlockSelected={handleBlockSelected}
        />
      </div>
      
      {/* Coluna Direita - Contexto */}
      <div className="w-80">
        <ContextSidebar 
          newsData={newsData} 
          selectedBlock={selectedBlock}
        />
      </div>
    </div>
  );
};

export default CurationPage;