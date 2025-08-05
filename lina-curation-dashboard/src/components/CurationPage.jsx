import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import AdvancedCanvasEditor from './AdvancedCanvasEditor';
import CardModal from './CardModal';
import supabase from '../lib/supabaseClient.js';

const CurationPage = () => {
  const { id } = useParams();
  const [newsData, setNewsData] = useState(null);
  const [newsTitle, setNewsTitle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  
  // Estados do modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCardData, setSelectedCardData] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [microData, setMicroData] = useState([]);
  
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

  // Função para lidar com seleção de bloco no editor
  const handleBlockSelected = useCallback((blockId) => {
    setSelectedBlock(blockId);
  }, []);

  // Função para transferir bloco do editor para o context sidebar
  const transferBlockToContext = useCallback((blockId, content) => {
    if (!newsData) return;

    try {
      // Parse da estrutura atual
      const coreStructure = newsData.core_structure ? JSON.parse(newsData.core_structure) : {};
      const variantStructure = newsData.variant_structure ? JSON.parse(newsData.variant_structure) : {};

      // Remover do core_structure baseado no blockId
      if (blockId === 'summary' && coreStructure.Introduce) {
        delete coreStructure.Introduce;
      } else if (blockId === 'body' && coreStructure.corpos_de_analise) {
        delete coreStructure.corpos_de_analise;
      } else if (blockId === 'conclusion' && coreStructure.conclusoes) {
        delete coreStructure.conclusoes;
      }

      // Adicionar ao variant_structure
      const sectionKey = blockId === 'summary' ? 'introducoes' : 
                        blockId === 'body' ? 'corpos_de_analise' : 'conclusoes';
      
      if (!variantStructure[sectionKey]) {
        variantStructure[sectionKey] = [];
      }
      variantStructure[sectionKey].push(content);

      // Atualizar o estado local
      setNewsData(prevData => ({
        ...prevData,
        core_structure: JSON.stringify(coreStructure),
        variant_structure: JSON.stringify(variantStructure)
      }));

      // Desselecionar o bloco que foi movido
      setSelectedBlock(null);
      
    } catch (error) {
      console.error('❌ Erro ao transferir bloco:', error);
    }
  }, [newsData]);

  // Função para transferir item do context sidebar para o editor
  const transferContextItemToEditor = useCallback((itemId, content) => {
    if (!newsData) return;

    try {
      // Parse da estrutura atual
      const coreStructure = newsData.core_structure ? JSON.parse(newsData.core_structure) : {};
      const variantStructure = newsData.variant_structure ? JSON.parse(newsData.variant_structure) : {};

      // Determinar de qual seção vem o item baseado no ID
      let sourceSection = null;
      let targetCoreKey = null;

      if (itemId.includes('introducoes') || itemId.includes('summary')) {
        sourceSection = 'introducoes';
        targetCoreKey = 'Introduce';
      } else if (itemId.includes('corpos_de_analise') || itemId.includes('body')) {
        sourceSection = 'corpos_de_analise';
        targetCoreKey = 'corpos_de_analise';
      } else if (itemId.includes('conclusoes') || itemId.includes('conclusion')) {
        sourceSection = 'conclusoes';
        targetCoreKey = 'conclusoes';
      }

      if (!sourceSection || !targetCoreKey) {
        console.warn('❌ Não foi possível determinar a seção de origem');
        return;
      }

      // PRESERVAR CONTEÚDO EXISTENTE: Se já existe conteúdo no editor, movê-lo para o variant_structure
      if (coreStructure[targetCoreKey] && coreStructure[targetCoreKey].trim() !== '') {
        const existingContent = coreStructure[targetCoreKey];
        
        // Verificar se não é um placeholder
        const isPlaceholder = existingContent.includes('Clique para selecionar') || 
                             existingContent.includes('Clique novamente para editar');
        
        if (!isPlaceholder) {
          // Adicionar o conteúdo existente ao variant_structure
          if (!variantStructure[sourceSection]) {
            variantStructure[sourceSection] = [];
          }
          variantStructure[sourceSection].push(existingContent);
        }
      }

      // Remover do variant_structure
      if (variantStructure[sourceSection] && Array.isArray(variantStructure[sourceSection])) {
        const index = variantStructure[sourceSection].findIndex(item => item === content);
        if (index !== -1) {
          variantStructure[sourceSection].splice(index, 1);
          
          // Se o array ficou vazio, remover a chave
          if (variantStructure[sourceSection].length === 0) {
            delete variantStructure[sourceSection];
          }
        }
      }

      // Adicionar o novo conteúdo ao core_structure
      coreStructure[targetCoreKey] = content;

      // Atualizar o estado local
      setNewsData(prevData => ({
        ...prevData,
        core_structure: JSON.stringify(coreStructure),
        variant_structure: JSON.stringify(variantStructure)
      }));

      // Desselecionar o bloco para remover o blur e permitir visualização do conteúdo
      setSelectedBlock(null);
      
    } catch (error) {
      console.error('❌ Erro ao transferir item do contexto:', error);
    }
  }, [newsData]);

  // Funções do modal
  const handleOpenCardModal = useCallback((cardData, allCardsData = [], cardIndex = 0, microDataArray = []) => {
    setSelectedCardData(cardData);
    setAllCards(allCardsData);
    setCurrentCardIndex(cardIndex);
    setMicroData(microDataArray);
    setIsModalOpen(true);
  }, []);

  const handleNavigateCard = useCallback((newIndex) => {
    if (allCards[newIndex]) {
      setSelectedCardData(allCards[newIndex]);
      setCurrentCardIndex(newIndex);
    }
  }, [allCards]);

  const handleCloseCardModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedCardData(null);
  }, []);

  const handleSaveCardContent = useCallback((cardData, newContent) => {
    if (!newsData) return;

    try {
      // Parse da estrutura atual
      let targetStructure = null;
      let structureKey = null;

      // Determinar qual estrutura atualizar baseado no tipo do card
      if (cardData.type === 'complete') {
        targetStructure = newsData.variant_structure ? JSON.parse(newsData.variant_structure) : {};
        structureKey = 'variant_structure';
      } else if (cardData.type === 'micro') {
        targetStructure = newsData.core_quotes ? JSON.parse(newsData.core_quotes) : {};
        structureKey = 'core_quotes';
      }

      if (!targetStructure || !structureKey) {
        console.warn('❌ Não foi possível determinar a estrutura para atualização');
        return;
      }

      // Atualizar o conteúdo baseado no cardData
      if (cardData.type === 'complete') {
        // Para dados completos, atualizar o item específico no array
        if (targetStructure[cardData.section] && Array.isArray(targetStructure[cardData.section])) {
          const itemIndex = targetStructure[cardData.section].findIndex(item => {
            const itemText = typeof item === 'string' ? item : (item.text || item.content || '');
            return itemText === cardData.content;
          });
          
          if (itemIndex !== -1) {
            targetStructure[cardData.section][itemIndex] = newContent;
          }
        }
      } else if (cardData.type === 'micro') {
        // Para micro dados, atualizar quote específica
        if (targetStructure[cardData.category] && Array.isArray(targetStructure[cardData.category])) {
          const quoteIndex = targetStructure[cardData.category].findIndex(quote => quote === cardData.content);
          if (quoteIndex !== -1) {
            targetStructure[cardData.category][quoteIndex] = newContent;
          }
        }
      }

      // Atualizar o estado local
      setNewsData(prevData => ({
        ...prevData,
        [structureKey]: JSON.stringify(targetStructure)
      }));
      
    } catch (error) {
      console.error('❌ Erro ao salvar conteúdo do card:', error);
    }
  }, [newsData]);

  return (
    <div className="w-full h-screen" style={{ backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Canvas Editor - Tela Cheia */}
      <div className="w-full h-full" ref={editorPanelRef}>
        <AdvancedCanvasEditor 
          newsId={id} 
          newsData={newsData}
          newsTitle={newsTitle}
          isLoading={isLoading}
          loadError={loadError}
          selectedBlock={selectedBlock}
          onBlockSelected={handleBlockSelected}
          onTransferBlock={transferBlockToContext}
          onOpenCardModal={handleOpenCardModal}
        />
      </div>
      
      {/* Modal */}
      <CardModal
        isOpen={isModalOpen}
        onClose={handleCloseCardModal}
        cardData={selectedCardData}
        onSave={handleSaveCardContent}
        allCards={allCards}
        currentCardIndex={currentCardIndex}
        onNavigate={handleNavigateCard}
        microData={microData}
      />
    </div>
  );
};

export default CurationPage;