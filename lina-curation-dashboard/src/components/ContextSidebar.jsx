import React, { useState, useRef, useEffect } from 'react';
import { Database, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ContextSidebar = ({ 
  newsData, 
  selectedBlock, 
  onTransferItem, 
  onOpenCardModal, 
  isLibraryMode = false, 
  searchTerm = '', 
  activeFilter = 'all' 
}) => {
  const [activeTab, setActiveTab] = useState('micro');
  const [expandedItems, setExpandedItems] = useState({});
  
  // Ref para container de scroll
  const scrollContainerRef = useRef(null);

  // Função para formatar rótulos exibidos (substitui underline por espaço)
  const formatCategory = (category) => {
    return String(category).replace(/_/g, ' ');
  };

  // Função para fazer parse seguro do JSON (aceita string ou objeto)
  const safeJsonParse = (input) => {
    // Tenta normalizar strings "quase JSON" e camadas de stringificação
    const normalizeString = (s) => {
      if (typeof s !== 'string') return s;
      let normalized = s.trim();
      // Remover lixo antes/depois das chaves
      const first = normalized.indexOf('{');
      const last = normalized.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        normalized = normalized.slice(first, last + 1);
      }
      // Normalizar aspas curvas
      normalized = normalized
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");
      return normalized;
    };
    try {
      if (!input) {
        // Em render inicial pode vir vazio
        return null;
      }
      // Caso especial: String objeto (ex.: new String('...'))
      if (typeof input === 'object') {
        const tag = Object.prototype.toString.call(input);
        if (tag === '[object String]') {
          input = String(input.valueOf());
        } else {
          // Se não é String-objeto, retornar como está (já é objeto JSON)
          return input;
        }
      }
      // Se for string, tentar múltiplas tentativas de parse
      if (typeof input === 'string') {
        let current = normalizeString(input);
        for (let i = 0; i < 3; i += 1) {
          try {
            const parsed = JSON.parse(current);
            if (typeof parsed === 'string') {
              current = normalizeString(parsed);
              continue;
            }
            return parsed;
          } catch (e) {
            // Tenta corrigir vírgulas finais simples
            current = normalizeString(current.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
          }
        }
        return null;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // Removidos logs iniciais
  useEffect(() => {}, [newsData]);

  // Função para truncar texto
  const truncateText = (text, maxLength = 200) => {
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



  // Pré-parse do core_quotes

  // Caminho 1: tente JSON.parse direto; se falhar, parser tolerante
  let coreQuotesParsed = null;
  try {
    const raw = newsData?.core_quotes;
    if (typeof raw === 'string' || Object.prototype.toString.call(raw) === '[object String]') {
      coreQuotesParsed = JSON.parse(String(raw.valueOf()));
    } else {
      coreQuotesParsed = raw || null;
    }
  } catch (e) {
    coreQuotesParsed = safeJsonParse(newsData?.core_quotes);
  }

  // Normalização: lida com stringificação dupla e filhos em string
  const normalizeCoreQuotesInternal = (core) => {
    if (!core) return null;
    let root = core;

    // Caso edge: objeto com único campo string contendo todo o JSON
    const rootKeys = Object.keys(root || {});
    if (typeof root === 'object' && rootKeys.length === 1 && typeof root[rootKeys[0]] === 'string') {
      const parsed = safeJsonParse(root[rootKeys[0]]);
      if (parsed && typeof parsed === 'object') {
        root = parsed;
      }
    }

    // Percorrer pais
    const result = {};
    Object.entries(root || {}).forEach(([parentKey, childValue]) => {
      let childObj = childValue;
      // Se o filho veio como string, tentar parsear
      if (typeof childObj === 'string') {
        const parsed = safeJsonParse(childObj);
        if (parsed) childObj = parsed;
      }
      // Se não é objeto, ignorar
      if (!childObj || typeof childObj !== 'object') return;

      const childEntries = {};
      Object.entries(childObj).forEach(([childKey, items]) => {
        let list = items;
        if (typeof list === 'string') {
          const parsedList = safeJsonParse(list);
          if (parsedList) list = parsedList;
        }
        // Se veio objeto único, transformar em array
        if (list && !Array.isArray(list) && typeof list === 'object') {
          // Se parecer um mapa de itens, transformar em array de valores
          const values = Object.values(list);
          if (values.length && values.every(v => typeof v === 'object' || typeof v === 'string')) {
            list = values;
          } else {
            list = [list];
          }
        }
        // Garantir array
        if (!Array.isArray(list)) list = [];
        childEntries[childKey] = list;
      });
      result[parentKey] = childEntries;
    });

    return result;
  };

  const normalizedCoreQuotes = normalizeCoreQuotesInternal(coreQuotesParsed);
  const hasCoreObject = normalizedCoreQuotes && typeof normalizedCoreQuotes === 'object' && Object.keys(normalizedCoreQuotes).length > 0;

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
        // Para micro dados, coletar todos os cards da subcategoria atual (parent::child)
        const coreQuotes = normalizedCoreQuotes;
        if (coreQuotes && typeof coreQuotes === 'object' && typeof category === 'string') {
          const [parentKey, childKey] = category.split('::');
          const list = coreQuotes?.[parentKey]?.[childKey];
          if (Array.isArray(list)) {
            allCardsData = list.map((item, idx) => ({
              content: typeof item === 'string' ? item : (item.frase_completa || item.titulo_frase || ''),
              type: 'micro',
              category,
              itemId: `micro-${parentKey}::${childKey}-${idx}`
            }));
          }
        }
      }
      
      // Coletar todos os micro dados para o carrossel (apenas quando necessário)
      let microDataArray = [];
      const allCoreQuotes = normalizedCoreQuotes;
      if (allCoreQuotes && typeof allCoreQuotes === 'object') {
        Object.entries(allCoreQuotes).forEach(([parentKey, childObj]) => {
          if (childObj && typeof childObj === 'object') {
            Object.entries(childObj).forEach(([childKey, list]) => {
              if (Array.isArray(list)) {
                list.forEach((item, idx) => {
                  microDataArray.push({
                    content: typeof item === 'string' ? item : (item.frase_completa || item.titulo_frase || ''),
                    category: `${parentKey}::${childKey}`,
                    itemId: `micro-${parentKey}::${childKey}-${idx}`
                  });
                });
              }
            });
          }
        });
      }

      onOpenCardModal(cardData, allCardsData, index, microDataArray);
    }
  };

  return (
    <div className="h-screen bg-[#1E1E1E] border-l border-[#333333] font-inter flex flex-col" style={{ overflow: 'visible' }}>

      {/* Título H2 */}
      <div className="px-10 pt-6 pb-0 flex-shrink-0">
        <h2 className="text-[#E0E0E0] text-lg font-semibold mb-6">
          Contexto
        </h2>
        
        {/* Abas */}
        <div className="mb-6">
          <div className="flex border-b border-[#333333]">
            <button
              onClick={() => setActiveTab('micro')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium ${
                activeTab === 'micro'
                  ? 'border-[#2BB24C] text-[#2BB24C]'
                  : 'border-transparent text-[#A0A0A0] hover:text-[#E0E0E0]'
              }`}
            >
              <Database size={16} />
              <span>Dados</span>
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
        className="px-10 flex-1 overflow-y-auto"
      >
        {/* (Aba "Dados Completos" removida) */}

        {/* Aba Dados (antes Micro Dados) */}
        {activeTab === 'micro' && (
          <div className="space-y-6 pt-4">
            {hasCoreObject ? (
              (() => {
                const coreQuotes = normalizedCoreQuotes;
                // Nova estrutura: { parentKey: { childKey: [ { titulo_frase, frase_completa, categoria_funcional }, ... ] } }
                return Object.entries(coreQuotes).map(([parentKey, childObj], parentIndex) => (
                  <motion.div
                    key={parentKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: parentIndex * 0.05 }}
                  >
                    {/* Divisória: chave pai */}
                    <div className="flex items-center gap-3 mb-2 mt-6">
                      <h3 className="text-[#E0E0E0] font-bold text-sm uppercase tracking-wider">
                        {formatCategory(parentKey)}
                      </h3>
                      <div className="flex-1 h-px bg-gradient-to-r from-[#2BB24C] to-transparent"></div>
                    </div>
                    
                    {/* Pastas por chave filha (colapsadas por padrão) */}
                    {childObj && typeof childObj === 'object' && Object.entries(childObj).map(([childKey, items], childIndex) => {
                      const folderId = `folder-${parentKey}-${childKey}`;
                      const isFolderOpen = !!expandedItems[folderId];
                      const itemsCount = Array.isArray(items) ? items.length : 0;
                      return (
                        <div key={`${parentKey}-${childKey}`} className="mb-4">
                          {/* Cabeçalho da pasta */}
                          <button
                            onClick={() => toggleExpansion(folderId)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-md border hover:border-[#2BB24C80] transition-colors"
                            style={{
                              backgroundColor: '#1E1E1E',
                              borderColor: '#333333',
                              color: '#E0E0E0'
                            }}
                          >
                            <div className="flex items-center gap-2 text-sm">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm border" style={{ borderColor: 'var(--primary-green-transparent)' }}>
                                {isFolderOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </span>
                              <span className="uppercase tracking-wide">{formatCategory(childKey)}</span>
                            </div>
                            <span className="text-xs text-[#A0A0A0]">{itemsCount} itens</span>
                          </button>
                          
                          {/* Conteúdo da pasta */}
                          <AnimatePresence>
                            {isFolderOpen && Array.isArray(items) && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="mt-3 space-y-3"
                              >
                                {items.map((item, index) => {
                                  const title = formatCategory(item?.titulo_frase || 'Sem título');
                                  const phrase = item?.frase_completa || '';
                                  const tag = item?.categoria_funcional || '';
                                  const itemId = `micro-${parentKey}::${childKey}-${index}`;
                                  const isExpanded = !!expandedItems[itemId];
                                  const shouldTruncate = phrase.length > 200;
                                  const categoryKey = `${parentKey}::${childKey}`;
                                  
                                  return (
                                    <motion.div
                                      key={itemId}
                                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -12, scale: 0.98 }}
                                      transition={{ duration: 0.25, ease: 'easeOut' }}
                                      className="group"
                                    >
                                      <div
                                        className="p-4 rounded-lg bg-[#1A1A1A] border border-[#333333] relative overflow-hidden hover:border-[#2BB24C50] transition-all duration-200 cursor-grab active:cursor-grabbing"
                                        draggable={true}
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData('text/plain', phrase);
                                          e.dataTransfer.setData('application/json', JSON.stringify({
                                            content: phrase,
                                            title: title,
                                            category: categoryKey,
                                            type: 'micro'
                                          }));
                                          e.currentTarget.style.opacity = '0.5';
                                        }}
                                        onDragEnd={(e) => {
                                          e.currentTarget.style.opacity = '1';
                                        }}
                                        onDoubleClick={() => handleCardClick(phrase, 'micro', null, categoryKey, index)}
                                      >
                                        {/* Botão de expandir/recolher subtexto */}
                                        {shouldTruncate && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleExpansion(itemId);
                                            }}
                                            className="absolute top-3 right-3 p-2 rounded-full border text-[#A0A0A0] transition-all duration-300 hover:scale-110 z-10"
                                            style={{
                                              borderColor: 'var(--primary-green-transparent)',
                                              backgroundColor: 'transparent'
                                            }}
                                            title={isExpanded ? 'Recolher' : 'Expandir'}
                                          >
                                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                              <ChevronDown size={16} />
                                            </motion.div>
                                          </button>
                                        )}
                                        

                                        
                                        {/* Conteúdo do card */}
                                        <div className="pr-4">
                                          <div className="flex items-center justify-between gap-3 mb-1">
                                            <p className="text-[#E0E0E0] text-sm font-semibold leading-snug">{title}</p>
                                            {tag && (
                                              <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--primary-green-transparent)', color: '#A0A0A0' }}>
                                                {tag}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[#CFCFCF] text-sm leading-relaxed">
                                            {shouldTruncate && !isExpanded ? truncateText(phrase, 200) : phrase}
                                          </p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
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
                Nenhum dado disponível.
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