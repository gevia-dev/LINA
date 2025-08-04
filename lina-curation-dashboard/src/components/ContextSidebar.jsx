import React, { useState, useRef } from 'react';
import { FileText, Database, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ContextSidebar = ({ newsData, selectedBlock, onTransferItem, onOpenCardModal }) => {
  const [activeTab, setActiveTab] = useState('complete');
  const [expandedItems, setExpandedItems] = useState({});
  
  // Ref para container de scroll
  const scrollContainerRef = useRef(null);

  // Função para formatar categorias
  const formatCategory = (category) => {
    return category.replace(/_/g, ' ');
  };

  // Função para fazer parse seguro do JSON
  const safeJsonParse = (jsonString) => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Erro ao fazer parse do JSON:', error);
      return null;
    }
  };

  // Função para truncar texto
  const truncateText = (text, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Função para alternar expansão de item
  const toggleExpansion = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Função para transferir item
  const handleTransferItem = (itemId, content) => {
    if (onTransferItem) {
      onTransferItem(itemId, content);
    }
  };

  // Função para abrir modal do card
  const handleCardClick = (content, type, section = null, category = null, index = 0) => {
    if (onOpenCardModal) {
      const cardData = {
        content,
        type, // 'complete' ou 'micro'
        section, // para dados completos (introducoes, corpos_de_analise, conclusoes)
        category, // para micro dados (categoria das quotes)
        itemId: type === 'complete' ? `complete-${section}` : `micro-${category}`
      };

      // Coletar todos os cards disponíveis para navegação
      let allCardsData = [];
      
      if (type === 'complete') {
        // Para dados completos, coletar todos os cards da seção atual
        const variantData = safeJsonParse(newsData?.variant_structure);
        if (variantData && variantData[section]) {
          allCardsData = variantData[section].map((item, idx) => ({
            content: typeof item === 'string' ? item : (item.text || item.content || ''),
            type: 'complete',
            section,
            itemId: `complete-${section}-${idx}`
          }));
        }
      } else if (type === 'micro') {
        // Para micro dados, coletar todos os cards da categoria atual
        const coreQuotes = safeJsonParse(newsData?.core_quotes);
        if (coreQuotes && coreQuotes[category]) {
          const quotes = Array.isArray(coreQuotes[category]) ? coreQuotes[category] : [coreQuotes[category]];
          allCardsData = quotes.map((quote, idx) => ({
            content: quote,
            type: 'micro',
            category,
            itemId: `micro-${category}-${idx}`
          }));
        }
      }
      
      // Coletar todos os micro dados para o carrossel
      let microDataArray = [];
      const allCoreQuotes = safeJsonParse(newsData?.core_quotes);
      if (allCoreQuotes) {
        Object.entries(allCoreQuotes).forEach(([category, quotes]) => {
          if (Array.isArray(quotes)) {
            quotes.forEach((quote, idx) => {
              microDataArray.push({
                content: quote,
                category,
                itemId: `micro-${category}-${idx}`
              });
            });
          } else {
            microDataArray.push({
              content: quotes,
              category,
              itemId: `micro-${category}-0`
            });
          }
        });
      }

      onOpenCardModal(cardData, allCardsData, index, microDataArray);
    }
  };

  return (
    <div className="h-screen bg-[#1E1E1E] border-l border-[#333333] font-inter flex flex-col" style={{ overflow: 'visible' }}>
      {/* Estilos para esconder scrollbars */}
      <style>{`
        .custom-scrollbar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* Internet Explorer e Edge */
        }
        .custom-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari e Opera */
        }
      `}</style>
      {/* Título H2 */}
      <div className="p-6 pb-0 flex-shrink-0">
        <h2 className="text-[#E0E0E0] text-lg font-semibold mb-6">
          Contexto
        </h2>
        
        {/* Abas */}
        <div className="mb-6">
          <div className="flex border-b border-[#333333]">
            <button
              onClick={() => setActiveTab('complete')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium ${
                activeTab === 'complete'
                  ? 'border-[#2BB24C] text-[#2BB24C]'
                  : 'border-transparent text-[#A0A0A0] hover:text-[#E0E0E0]'
              }`}
            >
              <FileText size={16} />
              <span>Dados Completos</span>
            </button>
            
            <button
              onClick={() => setActiveTab('micro')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium ${
                activeTab === 'micro'
                  ? 'border-[#2BB24C] text-[#2BB24C]'
                  : 'border-transparent text-[#A0A0A0] hover:text-[#E0E0E0]'
              }`}
            >
              <Database size={16} />
              <span>Micro Dados</span>
            </button>
          </div>
          {selectedBlock && (
            <div className="mt-2">
              <span className="px-2 py-1 rounded-full bg-[#2BB24C] text-white text-xs">
                {selectedBlock === 'summary' ? 'Intro' : 
                 selectedBlock === 'body' ? 'Corpo' : 
                 selectedBlock === 'conclusion' ? 'Concl' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo das Abas */}
      <div 
        ref={scrollContainerRef}
        className="px-6 flex-1 overflow-y-auto custom-scrollbar"
      >
        {/* Aba Dados Completos */}
        {activeTab === 'complete' && (
          <div className="space-y-4">
            {newsData && newsData.variant_structure ? (
              (() => {
                const variantData = safeJsonParse(newsData.variant_structure);
                if (!variantData || typeof variantData !== 'object') {
                  return (
                    <p className="text-[#A0A0A0] text-sm">
                      Estrutura de dados inválida ou não encontrada.
                    </p>
                  );
                }
                
                const sections = [
                  { key: 'introducoes', title: 'Introduções', blockId: 'summary' },
                  { key: 'corpos_de_analise', title: 'Corpos de Análise', blockId: 'body' },
                  { key: 'conclusoes', title: 'Conclusões', blockId: 'conclusion' }
                ];
                
                // Filtrar seções baseado no bloco selecionado
                let filteredSections;
                if (selectedBlock) {
                  // Se há um bloco selecionado, filtrar apenas essa seção
                  filteredSections = sections.filter(section => section.blockId === selectedBlock);
                } else {
                  // Se nenhum bloco está selecionado, mostrar todas as seções
                  filteredSections = sections;
                }
                
                const renderedSections = filteredSections.map((section) => {
                  const sectionData = variantData[section.key];
                  if (!Array.isArray(sectionData) || sectionData.length === 0) {
                    return null;
                  }
                  
                  return (
                    <div key={section.key} className="space-y-2">
                      <h3 className="text-[#A0A0A0] font-semibold text-sm uppercase tracking-wider mb-2">
                        {section.title}
                      </h3>
                      <AnimatePresence>
                        {sectionData.map((item, index) => {
                          const text = typeof item === 'string' ? item : (item.text || item.content || 'Sem conteúdo');
                          const itemId = `complete-${section.key}-${index}`;
                          const isExpanded = expandedItems[itemId];
                          const shouldTruncate = text.length > 150;
                          
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.95 }}
                              transition={{ 
                                duration: 0.3, 
                                ease: "easeOut",
                                delay: index * 0.05 
                              }}
                              whileHover={{ 
                                scale: 1.02,
                                y: -2,
                                transition: { duration: 0.2 }
                              }}
                              className="group"
                            >
                              <div 
                                className="p-3 rounded-lg bg-[#1E1E1E] border border-[#333333] relative overflow-hidden hover:border-[#2BB24C50] transition-all duration-200 cursor-pointer"
                                onClick={() => handleCardClick(text, 'complete', section.key, null, index)}
                              >
                                {/* Botão de expandir/recolher */}
                                {shouldTruncate && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpansion(itemId);
                                    }}
                                    className="absolute top-2 right-2 p-2 rounded-full border text-[#A0A0A0] transition-all duration-300 hover:scale-110 z-10"
                                    style={{
                                      borderColor: 'var(--primary-green-transparent)',
                                      backgroundColor: 'transparent'
                                    }}
                                    title={isExpanded ? "Recolher" : "Expandir"}
                                  >
                                    <motion.div
                                      animate={{ rotate: isExpanded ? 180 : 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <ChevronDown size={14} />
                                    </motion.div>
                                  </button>
                                )}
                                
                                {/* Botão de transferência */}
                                <motion.button
                                  onClick={() => handleTransferItem(itemId, text)}
                                  className="absolute bottom-2 right-2 p-2 rounded-full border text-[#A0A0A0] opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-10"
                                  style={{
                                    borderColor: 'var(--primary-green-transparent)',
                                    backgroundColor: 'transparent'
                                  }}
                                  whileHover={{ 
                                    scale: 1.1,
                                    backgroundColor: 'var(--primary-green)',
                                    color: 'white'
                                  }}
                                  whileTap={{ scale: 0.95 }}
                                  initial={{ scale: 0.8 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ArrowRight size={14} />
                                </motion.button>
                                
                                {/* Efeito de brilho no hover */}
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2BB24C10] to-transparent"
                                  initial={{ x: '-100%' }}
                                  whileHover={{ x: '100%' }}
                                  transition={{ duration: 0.6, ease: "easeInOut" }}
                                />
                                
                                <p className="text-[#E0E0E0] text-sm leading-relaxed pr-8 relative z-5">
                                  {shouldTruncate && !isExpanded ? truncateText(text) : text}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  );
                }).filter(Boolean);
                
                // Se um bloco específico foi selecionado mas não há dados, mostrar mensagem
                if (selectedBlock && renderedSections.length === 0) {
                  const selectedSection = sections.find(s => s.blockId === selectedBlock);
                  return (
                    <motion.p 
                      className="text-[#A0A0A0] text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      Nenhum dado disponível para {selectedSection?.title.toLowerCase()}.
                    </motion.p>
                  );
                }
                
                // Se nenhum bloco está selecionado, mostrar todas as seções
                if (!selectedBlock && renderedSections.length === 0) {
                  return (
                    <motion.p 
                      className="text-[#A0A0A0] text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      Nenhum dado completo disponível.
                    </motion.p>
                  );
                }
                
                return renderedSections;
              })()
            ) : (
              <motion.p 
                className="text-[#A0A0A0] text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                Nenhum dado completo disponível.
              </motion.p>
            )}
          </div>
        )}

        {/* Aba Micro Dados */}
        {activeTab === 'micro' && (
          <div className="space-y-4">
            {newsData && newsData.core_quotes ? (
              (() => {
                const coreQuotes = safeJsonParse(newsData.core_quotes);
                if (!coreQuotes || typeof coreQuotes !== 'object') {
                  return (
                    <motion.p 
                      className="text-[#A0A0A0] text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      Micro dados inválidos ou não encontrados.
                    </motion.p>
                  );
                }
                
                return Object.entries(coreQuotes).map(([category, quotes], categoryIndex) => (
                  <motion.div 
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: categoryIndex * 0.1 }}
                  >
                    <h3 className="text-[#A0A0A0] font-semibold text-sm uppercase tracking-wider mb-2">
                      {formatCategory(category)}
                    </h3>
                    <div className="space-y-2">
                      <AnimatePresence>
                        {Array.isArray(quotes) ? quotes.map((quote, index) => {
                          const itemId = `micro-${category}-${index}`;
                          const isExpanded = expandedItems[itemId];
                          const shouldTruncate = quote.length > 150;
                          
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.95 }}
                              transition={{ 
                                duration: 0.3, 
                                ease: "easeOut",
                                delay: index * 0.05 
                              }}
                              whileHover={{ 
                                scale: 1.02,
                                y: -2,
                                transition: { duration: 0.2 }
                              }}
                              className="group"
                            >
                              <div 
                                className="p-3 rounded-lg bg-[#1E1E1E] border border-[#333333] text-[#E0E0E0] text-sm relative overflow-hidden hover:border-[#2BB24C50] transition-all duration-200 cursor-pointer"
                                onClick={() => handleCardClick(quote, 'micro', null, category, index)}
                              >
                                {/* Botão de expandir/recolher */}
                                {shouldTruncate && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpansion(itemId);
                                    }}
                                    className="absolute top-2 right-2 p-2 rounded-full border text-[#A0A0A0] transition-all duration-300 hover:scale-110 z-10"
                                    style={{
                                      borderColor: 'var(--primary-green-transparent)',
                                      backgroundColor: 'transparent'
                                    }}
                                    title={isExpanded ? "Recolher" : "Expandir"}
                                  >
                                    <motion.div
                                      animate={{ rotate: isExpanded ? 180 : 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <ChevronDown size={14} />
                                    </motion.div>
                                  </button>
                                )}
                                
                                {/* Botão de transferência */}
                                <motion.button
                                  onClick={() => handleTransferItem(itemId, quote)}
                                  className="absolute bottom-2 right-2 p-2 rounded-full border text-[#A0A0A0] opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-10"
                                  style={{
                                    borderColor: 'var(--primary-green-transparent)',
                                    backgroundColor: 'transparent'
                                  }}
                                  whileHover={{ 
                                    scale: 1.1,
                                    backgroundColor: 'var(--primary-green)',
                                    color: 'white'
                                  }}
                                  whileTap={{ scale: 0.95 }}
                                  initial={{ scale: 0.8 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ArrowRight size={14} />
                                </motion.button>
                                
                                {/* Efeito de brilho no hover */}
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2BB24C10] to-transparent"
                                  initial={{ x: '-100%' }}
                                  whileHover={{ x: '100%' }}
                                  transition={{ duration: 0.6, ease: "easeInOut" }}
                                />
                                
                                <div className="pr-8 relative z-5">
                                  {shouldTruncate && !isExpanded ? truncateText(quote) : quote}
                                </div>
                              </div>
                            </motion.div>
                          );
                        }) : (() => {
                          const itemId = `micro-${category}-single`;
                          const isExpanded = expandedItems[itemId];
                          const shouldTruncate = quotes.length > 150;
                          
                          return (
                            <motion.div
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.95 }}
                              transition={{ 
                                duration: 0.3, 
                                ease: "easeOut"
                              }}
                              whileHover={{ 
                                scale: 1.02,
                                y: -2,
                                transition: { duration: 0.2 }
                              }}
                              className="group"
                            >
                              <div 
                                className="p-3 rounded-lg bg-[#1E1E1E] border border-[#333333] text-[#E0E0E0] text-sm relative overflow-hidden hover:border-[#2BB24C50] transition-all duration-200 cursor-pointer"
                                onClick={() => handleCardClick(quotes, 'micro', null, category, 0)}
                              >
                                {/* Botão de expandir/recolher */}
                                {shouldTruncate && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpansion(itemId);
                                    }}
                                    className="absolute top-2 right-2 p-2 rounded-full border text-[#A0A0A0] transition-all duration-300 hover:scale-110 z-10"
                                    style={{
                                      borderColor: 'var(--primary-green-transparent)',
                                      backgroundColor: 'transparent'
                                    }}
                                    title={isExpanded ? "Recolher" : "Expandir"}
                                  >
                                    <motion.div
                                      animate={{ rotate: isExpanded ? 180 : 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <ChevronDown size={14} />
                                    </motion.div>
                                  </button>
                                )}
                                
                                {/* Botão de transferência */}
                                <motion.button
                                  onClick={() => handleTransferItem(itemId, quotes)}
                                  className="absolute bottom-2 right-2 p-2 rounded-full border text-[#A0A0A0] opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-10"
                                  style={{
                                    borderColor: 'var(--primary-green-transparent)',
                                    backgroundColor: 'transparent'
                                  }}
                                  whileHover={{ 
                                    scale: 1.1,
                                    backgroundColor: 'var(--primary-green)',
                                    color: 'white'
                                  }}
                                  whileTap={{ scale: 0.95 }}
                                  initial={{ scale: 0.8 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ArrowRight size={14} />
                                </motion.button>
                                
                                {/* Efeito de brilho no hover */}
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2BB24C10] to-transparent"
                                  initial={{ x: '-100%' }}
                                  whileHover={{ x: '100%' }}
                                  transition={{ duration: 0.6, ease: "easeInOut" }}
                                />
                                
                                <div className="pr-8 relative z-5">
                                  {shouldTruncate && !isExpanded ? truncateText(quotes) : quotes}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })()}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ));
              })()
            ) : (
              <motion.p 
                className="text-[#A0A0A0] text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                Nenhum micro dado disponível.
              </motion.p>
            )}
          </div>
        )}
      </div>

      {/* Botão GENERATE - Fixo no fundo */}
      <div className="p-6 pt-0 flex-shrink-0">
        <motion.button
          className="w-full py-3 px-4 rounded-md font-medium transition-all duration-200 bg-[#2BB24C] text-white text-sm hover:bg-[#25A043]"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          GENERATE
        </motion.button>
      </div>
    </div>
  );
};

export default ContextSidebar;