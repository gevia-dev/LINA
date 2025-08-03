import React, { useState } from 'react';
import { FileText, Database, ChevronDown, ChevronUp } from 'lucide-react';

const ContextSidebar = ({ newsData, selectedBlock }) => {
  const [activeTab, setActiveTab] = useState('complete');
  const [expandedItems, setExpandedItems] = useState({});

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

  return (
    <div className="h-screen bg-[#1E1E1E] border-l border-[#333333] font-inter flex flex-col">
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
              {selectedBlock && (
                <span className="ml-1 px-2 py-1 rounded-full bg-[#2BB24C] text-white text-xs">
                  {selectedBlock === 'summary' ? 'Intro' : 
                   selectedBlock === 'body' ? 'Corpo' : 
                   selectedBlock === 'conclusion' ? 'Concl' : ''}
                </span>
              )}
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
        </div>
      </div>

      {/* Conteúdo das Abas */}
      <div className="px-6 flex-1 overflow-y-auto custom-scrollbar">
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
                      {sectionData.map((item, index) => {
                        const text = typeof item === 'string' ? item : (item.text || item.content || 'Sem conteúdo');
                        const itemId = `complete-${section.key}-${index}`;
                        const isExpanded = expandedItems[itemId];
                        const shouldTruncate = text.length > 150;
                        
                        return (
                          <div 
                            key={index}
                            className="p-3 rounded-lg bg-[#121212] border border-[#333333] relative"
                          >
                            {shouldTruncate && (
                              <button
                                onClick={() => toggleExpansion(itemId)}
                                className="absolute top-2 right-2 p-1 rounded text-[#A0A0A0] hover:text-[#E0E0E0] hover:bg-[#2A2A2A] transition-colors"
                                title={isExpanded ? "Recolher" : "Expandir"}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                            <p className="text-[#E0E0E0] text-sm leading-relaxed pr-8">
                              {shouldTruncate && !isExpanded ? truncateText(text) : text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                }).filter(Boolean);
                
                // Se um bloco específico foi selecionado mas não há dados, mostrar mensagem
                if (selectedBlock && renderedSections.length === 0) {
                  const selectedSection = sections.find(s => s.blockId === selectedBlock);
                  return (
                    <p className="text-[#A0A0A0] text-sm">
                      Nenhum dado disponível para {selectedSection?.title.toLowerCase()}.
                    </p>
                  );
                }
                
                // Se nenhum bloco está selecionado, mostrar todas as seções
                if (!selectedBlock && renderedSections.length === 0) {
                  return (
                    <p className="text-[#A0A0A0] text-sm">
                      Nenhum dado completo disponível.
                    </p>
                  );
                }
                
                return renderedSections;
              })()
            ) : (
              <p className="text-[#A0A0A0] text-sm">
                Nenhum dado completo disponível.
              </p>
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
                    <p className="text-[#A0A0A0] text-sm">
                      Micro dados inválidos ou não encontrados.
                    </p>
                  );
                }
                
                return Object.entries(coreQuotes).map(([category, quotes]) => (
                  <div key={category}>
                    <h3 className="text-[#A0A0A0] font-semibold text-sm uppercase tracking-wider mb-2">
                      {formatCategory(category)}
                    </h3>
                    <div className="space-y-2">
                      {Array.isArray(quotes) ? quotes.map((quote, index) => {
                        const itemId = `micro-${category}-${index}`;
                        const isExpanded = expandedItems[itemId];
                        const shouldTruncate = quote.length > 150;
                        
                        return (
                          <div 
                            key={index}
                            className="p-3 rounded-lg bg-[#121212] border border-[#333333] text-[#E0E0E0] text-sm hover:bg-[#1A1A1A] transition-colors relative"
                          >
                            {shouldTruncate && (
                              <button
                                onClick={() => toggleExpansion(itemId)}
                                className="absolute top-2 right-2 p-1 rounded text-[#A0A0A0] hover:text-[#E0E0E0] hover:bg-[#2A2A2A] transition-colors"
                                title={isExpanded ? "Recolher" : "Expandir"}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                            <div className="pr-8">
                              {shouldTruncate && !isExpanded ? truncateText(quote) : quote}
                            </div>
                          </div>
                        );
                      }) : (() => {
                        const itemId = `micro-${category}-single`;
                        const isExpanded = expandedItems[itemId];
                        const shouldTruncate = quotes.length > 150;
                        
                        return (
                          <div className="p-3 rounded-lg bg-[#121212] border border-[#333333] text-[#E0E0E0] text-sm relative">
                            {shouldTruncate && (
                              <button
                                onClick={() => toggleExpansion(itemId)}
                                className="absolute top-2 right-2 p-1 rounded text-[#A0A0A0] hover:text-[#E0E0E0] hover:bg-[#2A2A2A] transition-colors"
                                title={isExpanded ? "Recolher" : "Expandir"}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                            <div className="pr-8">
                              {shouldTruncate && !isExpanded ? truncateText(quotes) : quotes}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ));
              })()
            ) : (
              <p className="text-[#A0A0A0] text-sm">
                Nenhum micro dado disponível.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Botão GENERATE - Fixo no fundo */}
      <div className="p-6 pt-0 flex-shrink-0">
        <button
          className="w-full py-3 px-4 rounded-md font-medium transition-all duration-200 hover:scale-105 bg-[#2BB24C] text-white text-sm hover:bg-[#25A043]"
        >
          GENERATE
        </button>
      </div>
    </div>
  );
};

export default ContextSidebar;