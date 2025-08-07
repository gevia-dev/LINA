import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Library, 
  Search, 
  Filter, 
  ArrowRight, 
  BookOpen, 
  FileText, 
  Quote, 
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Layers
} from 'lucide-react';
import ContextSidebar from './ContextSidebar';
import DefaultNodesLibrary from './DefaultNodesLibrary';

/**
 * ContextLibrary - Versão modal/drawer do ContextSidebar
 * Permite acessar a biblioteca de contexto através de um modal overlay
 */
const ContextLibrary = ({ 
  isOpen, 
  onClose, 
  newsData, 
  selectedBlock, 
  onTransferItem, 
  onOpenCardModal,
  onAddNode
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('context');

  // Efeito para desabilitar scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Fechar modal com ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Variantes de animação
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      x: '100%',
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: { 
      opacity: 0, 
      x: '100%',
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const modalWidth = isExpanded ? 'w-full' : 'w-1/2';
  const modalMaxWidth = isExpanded ? 'max-w-none' : 'max-w-2xl';

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-end"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className={`relative ${modalWidth} ${modalMaxWidth} h-full flex flex-col`}
            style={{ 
              backgroundColor: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border-primary)'
            }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header da Biblioteca */}
            <div 
              className="flex items-center justify-between p-6 border-b"
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)'
              }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Library 
                    size={24} 
                    style={{ color: 'var(--primary-green)' }}
                  />
                </motion.div>
                <div>
                  <h2 
                    className="text-xl font-semibold"
                    style={{ 
                      color: 'var(--text-primary)',
                      fontFamily: '"Nunito Sans", "Inter", sans-serif'
                    }}
                  >
                    Biblioteca
                  </h2>
                  <p 
                    className="text-sm"
                    style={{ 
                      color: 'var(--text-secondary)',
                      fontFamily: '"Nunito Sans", "Inter", sans-serif'
                    }}
                  >
                    Explore conteúdo e nodes padrão
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Botão de expandir/minimizar */}
                <motion.button
                  onClick={toggleExpanded}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)'
                  }}
                  whileHover={{
                    backgroundColor: 'var(--primary-green-transparent)',
                    color: 'var(--primary-green)'
                  }}
                  whileTap={{ scale: 0.95 }}
                  title={isExpanded ? "Minimizar" : "Maximizar"}
                >
                  {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </motion.button>

                {/* Botão de fechar */}
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)'
                  }}
                  whileHover={{
                    backgroundColor: 'var(--status-error-bg)',
                    color: 'var(--status-error)'
                  }}
                  whileTap={{ scale: 0.95 }}
                  title="Fechar biblioteca"
                >
                  <X size={18} />
                </motion.button>
              </div>
            </div>

            {/* Abas da biblioteca */}
            <motion.div 
              className="p-4 border-b"
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)'
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'context', label: 'Contexto', icon: FileText },
                  { id: 'nodes', label: 'Nodes Padrão', icon: Layers }
                ].map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                      activeTab === id ? 'bg-green text-white' : ''
                    }`}
                    style={{
                      backgroundColor: activeTab === id 
                        ? 'var(--primary-green)' 
                        : 'var(--bg-primary)',
                      borderColor: activeTab === id 
                        ? 'var(--primary-green)' 
                        : 'var(--border-primary)',
                      color: activeTab === id 
                        ? 'white' 
                        : 'var(--text-secondary)',
                      fontFamily: '"Nunito Sans", "Inter", sans-serif',
                      fontSize: '14px'
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon size={16} />
                    {label}
                  </motion.button>
                ))}
              </div>

              {/* Barra de busca e filtros (apenas para aba de contexto) */}
              {activeTab === 'context' && (
                <div className="flex gap-3">
                  {/* Campo de busca */}
                  <div className="flex-1 relative">
                    <Search 
                      size={18} 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2"
                      style={{ color: 'var(--text-secondary)' }}
                    />
                    <input
                      type="text"
                      placeholder="Buscar na biblioteca..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                        fontFamily: '"Nunito Sans", "Inter", sans-serif'
                      }}
                    />
                  </div>

                  {/* Filtros */}
                  <div className="flex gap-2">
                    {[
                      { id: 'all', label: 'Todos', icon: FileText },
                      { id: 'quotes', label: 'Citações', icon: Quote },
                      { id: 'content', label: 'Conteúdo', icon: BookOpen }
                    ].map(({ id, label, icon: Icon }) => (
                      <motion.button
                        key={id}
                        onClick={() => setActiveFilter(id)}
                        className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                          activeFilter === id ? 'bg-green text-white' : ''
                        }`}
                        style={{
                          backgroundColor: activeFilter === id 
                            ? 'var(--primary-green)' 
                            : 'var(--bg-primary)',
                          borderColor: activeFilter === id 
                            ? 'var(--primary-green)' 
                            : 'var(--border-primary)',
                          color: activeFilter === id 
                            ? 'white' 
                            : 'var(--text-secondary)',
                          fontFamily: '"Nunito Sans", "Inter", sans-serif',
                          fontSize: '14px'
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={14} />
                        {label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Conteúdo da biblioteca */}
            <motion.div 
              className="flex-1 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <AnimatePresence mode="wait">
                {activeTab === 'context' && (
                  <motion.div
                    key="context"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    <ContextSidebar
                      newsData={newsData}
                      selectedBlock={selectedBlock}
                      onTransferItem={onTransferItem}
                      onOpenCardModal={onOpenCardModal}
                      isLibraryMode={true}
                      searchTerm={searchTerm}
                      activeFilter={activeFilter}
                    />
                  </motion.div>
                )}
                
                {activeTab === 'nodes' && (
                  <motion.div
                    key="nodes"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    <DefaultNodesLibrary
                      onAddNode={onAddNode}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Footer com informações */}
            <motion.div 
              className="p-4 border-t"
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)'
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>
                  {activeTab === 'context' ? (
                    <>Use os botões <ArrowRight size={14} className="inline mx-1" /> para transferir conteúdo</>
                  ) : (
                    <>Clique nos nodes para adicioná-los ao canvas</>
                  )}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  ESC para fechar
                </span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContextLibrary;