import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CardModal = ({ isOpen, onClose, cardData, onSave, allCards = [], currentCardIndex = 0, onNavigate, microData = [] }) => {
  const [editedContent, setEditedContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  // Organizar micro dados por categoria (parent::child => exibir como Parent / Child)
  const microDataByCategory = microData.reduce((acc, item) => {
    const raw = item.category || 'Sem Categoria';
    const [parent, child] = String(raw).split('::');
    const label = child ? `${parent.replace(/_/g, ' ')} / ${child.replace(/_/g, ' ')}` : parent.replace(/_/g, ' ');
    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {});

  // Lista de categorias ordenadas
  const categoryKeys = Object.keys(microDataByCategory);
  const currentCategory = categoryKeys[currentCategoryIndex] || '';
  const currentCategoryData = microDataByCategory[currentCategory] || [];

  // Mostrar micro dados apenas quando o card atual for um "dado completo"
  const shouldShowMicroData = cardData?.type === 'complete' && microData.length > 0;

  // Sincronizar o conteúdo editado quando o modal abrir
  useEffect(() => {
    if (isOpen && cardData?.content) {
      setEditedContent(cardData.content);
      setHasChanges(false);
    }
  }, [isOpen, cardData]);

  // Detectar mudanças no conteúdo
  useEffect(() => {
    if (cardData?.content && editedContent !== cardData.content) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [editedContent, cardData?.content]);

  const handleSave = () => {
    if (onSave && hasChanges) {
      onSave(cardData, editedContent);
    }
    onClose();
  };

  const handleReset = () => {
    setEditedContent(cardData?.content || '');
    setHasChanges(false);
  };

  const handleClose = () => {
    setEditedContent('');
    setHasChanges(false);
    onClose();
  };

  // Funções de navegação
  const handlePreviousCard = () => {
    if (hasChanges) {
      // Salvar alterações antes de navegar
      if (onSave) {
        onSave(cardData, editedContent);
      }
    }
    
    if (onNavigate && currentCardIndex > 0) {
      onNavigate(currentCardIndex - 1);
    }
  };

  const handleNextCard = () => {
    if (hasChanges) {
      // Salvar alterações antes de navegar
      if (onSave) {
        onSave(cardData, editedContent);
      }
    }
    
    if (onNavigate && currentCardIndex < allCards.length - 1) {
      onNavigate(currentCardIndex + 1);
    }
  };

  // Fechar modal ao pressionar ESC e navegação com setas
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      } else if (event.key === 'ArrowLeft' && isOpen) {
        handlePreviousCard();
      } else if (event.key === 'ArrowRight' && isOpen) {
        handleNextCard();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevenir scroll do body
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, hasChanges, editedContent]);



  if (!isOpen || !cardData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
          onClick={handleClose}
        />

                         {/* Navegação lateral */}
        {allCards.length > 1 && (
          <>
            {/* Seta Esquerda */}
            {currentCardIndex > 0 && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={handlePreviousCard}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-50 p-3 rounded-full border text-[#A0A0A0] transition-all duration-300 hover:scale-110"
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
              >
                <ChevronLeft size={24} />
              </motion.button>
            )}

            {/* Seta Direita */}
            {currentCardIndex < allCards.length - 1 && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={handleNextCard}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-50 p-3 rounded-full border text-[#A0A0A0] transition-all duration-300 hover:scale-110"
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
              >
                <ChevronRight size={24} />
              </motion.button>
            )}
          </>
        )}

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-4xl mx-4 max-h-[90vh]"
        >
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-lg shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#333333]">
              <div>
                                 <h2 className="text-[#E0E0E0] text-xl font-semibold">
                   Editar Conteúdo
                 </h2>
                 <p className="text-[#A0A0A0] text-sm mt-1">
                  {(() => {
                    if (!cardData.category) return 'Dados Completos';
                    const [p,c] = String(cardData.category).split('::');
                    return c ? `${p.replace(/_/g,' ')} / ${c.replace(/_/g,' ')}` : p.replace(/_/g,' ');
                  })()}
                   {cardData.section && ` - ${cardData.section}`}
                   {allCards.length > 1 && ` (${currentCardIndex + 1} de ${allCards.length})`}
                 </p>
              </div>
              
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleReset}
                    className="p-2 rounded-lg bg-[rgba(42,42,42,0.3)] text-[#A0A0A0] hover:text-[#E0E0E0] hover:bg-[#333333] transition-all duration-200"
                    title="Resetar alterações"
                  >
                    <RotateCcw size={18} />
                  </motion.button>
                )}
                
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg bg-[rgba(42,42,42,0.3)] text-[#A0A0A0] hover:text-[#E0E0E0] hover:bg-[#333333] transition-all duration-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

                                                  {/* Content */}
             <div className="flex-1 flex flex-col overflow-hidden">
               <div className="flex-1 p-6 overflow-y-auto modal-content">
                 {/* Edit Area */}
                 <div className="mb-6">
                   <h3 className="text-[#A0A0A0] text-sm font-semibold mb-3 uppercase tracking-wider">
                     Área de Edição
                   </h3>
                   <div className="flex flex-col">
                     <textarea
                       value={editedContent}
                       onChange={(e) => setEditedContent(e.target.value)}
                       className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg p-4 text-[#E0E0E0] text-sm leading-relaxed resize-none focus:outline-none focus:border-[#2BB24C] transition-colors duration-200"
                       placeholder="Digite seu conteúdo aqui..."
                       style={{ minHeight: '200px' }}
                     />
                     
                     {/* Character count and status */}
                     <div className="flex items-center justify-between mt-3 text-xs text-[#A0A0A0]">
                       <span>{editedContent.length} caracteres</span>
                       {hasChanges && (
                         <motion.span
                           initial={{ opacity: 0, x: 10 }}
                           animate={{ opacity: 1, x: 0 }}
                           className="text-[#2BB24C]"
                         >
                           ● Alterações não salvas
                         </motion.span>
                       )}
                     </div>
                   </div>
                                   </div>

                  {/* Micro Data Carousel - Apenas para dados completos */}
                  {shouldShowMicroData && (
                    <div>
                      <h3 className="text-[#A0A0A0] text-sm font-semibold mb-3 uppercase tracking-wider">
                        Dados
                      </h3>
                      <div className="flex flex-col">
                        {/* Category Navigation */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => setCurrentCategoryIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentCategoryIndex === 0}
                            className={`p-2 rounded-full border text-[#A0A0A0] transition-all duration-300 hover:scale-110 ${
                              currentCategoryIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            style={{
                              borderColor: 'var(--primary-green-transparent)',
                              backgroundColor: 'transparent'
                            }}
                          >
                            <ChevronLeft size={16} />
                          </button>
                          
                          <div className="text-center">
                            <div className="text-[#E0E0E0] text-sm font-medium">
                              {currentCategory.replace(/_/g, ' ')}
                            </div>
                            <div className="text-[#A0A0A0] text-xs">
                              Categoria {currentCategoryIndex + 1} de {categoryKeys.length} • {currentCategoryData.length} itens
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setCurrentCategoryIndex(prev => Math.min(categoryKeys.length - 1, prev + 1))}
                            disabled={currentCategoryIndex >= categoryKeys.length - 1}
                            className={`p-2 rounded-full border text-[#A0A0A0] transition-all duration-300 hover:scale-110 ${
                              currentCategoryIndex >= categoryKeys.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            style={{
                              borderColor: 'var(--primary-green-transparent)',
                              backgroundColor: 'transparent'
                            }}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                        
                        {/* Category Content - Grid flexível */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-64 overflow-y-auto modal-content">
                          {currentCategoryData.map((item, index) => (
                            <div 
                              key={item.itemId || index} 
                              className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-3 min-h-[80px] flex flex-col"
                            >
                              <div className="text-[#E0E0E0] text-xs leading-relaxed flex-1 overflow-hidden">
                                <div className="line-clamp-4 break-words">
                                  {item.content}
                                </div>
                              </div>
                              {item.category && (
                                <div className="mt-2 text-[#A0A0A0] text-xs font-medium flex-shrink-0">
                                  {item.category.replace(/_/g, ' ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#333333] bg-[#1A1A1A]">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-[rgba(42,42,42,0.3)] text-[#A0A0A0] hover:text-[#E0E0E0] hover:bg-[#333333] transition-all duration-200 text-sm font-medium"
              >
                Cancelar
              </button>
              
              <motion.button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  hasChanges
                    ? 'bg-[#2BB24C] text-white hover:bg-[#25A043]'
                    : 'bg-[rgba(42,42,42,0.3)] text-[#666666] cursor-not-allowed'
                }`}
                whileHover={hasChanges ? { scale: 1.02 } : {}}
                whileTap={hasChanges ? { scale: 0.98 } : {}}
              >
                <Save size={16} />
                {hasChanges ? 'Salvar Alterações' : 'Sem Alterações'}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Estilos para CSS variables */}
        <style>{`
          :root {
            --primary-green: #2BB24C;
            --primary-green-transparent: rgba(43, 178, 76, 0.3);
          }
          
          /* Esconder scrollbar em todos os navegadores */
          .modal-content::-webkit-scrollbar {
            display: none;
          }
          
          .modal-content {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
};

export default CardModal;