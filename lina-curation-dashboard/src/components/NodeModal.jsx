import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Layers, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';

const NodeModal = ({ isOpen, onClose, nodeData, onSave }) => {
  const [editedContent, setEditedContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState('');

  // Opções de estrutura para nodes de estrutura
  const structureOptions = [
    {
      titulo: "Continua",
      estrutura: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio."
    },
    {
      titulo: "Paragrafos",
      estrutura: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nCurabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum sem, nec luctus est odio sed risus."
    },
    {
      titulo: "Topicos",
      estrutura: "## Topico 1\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n## Topico 2\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\n## Topico 3\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    }
  ];

  // Sincronizar o conteúdo editado quando o modal abrir
  useEffect(() => {
    if (isOpen && nodeData) {
      setEditedContent(nodeData.content || '');
      setHasChanges(false);
      
      // Usar structureType do node se disponível, senão detectar pelo conteúdo
      if (nodeData.structureType) {
        // Mapear structureType para o título da estrutura
        const structureMap = {
          'continua': 'Continua',
          'paragrafos': 'Paragrafos',
          'topicos': 'Topicos'
        };
        setSelectedStructure(structureMap[nodeData.structureType] || 'Continua');
      } else {
        // Detectar qual estrutura está selecionada baseado no conteúdo (fallback)
        const currentStructure = structureOptions.find(option => 
          nodeData.content && nodeData.content.trim() === option.estrutura.trim()
        );
        
        // Se não encontrou correspondência exata, verificar correspondência parcial
        const partialMatch = structureOptions.find(option => 
          nodeData.content && nodeData.content.includes(option.estrutura.substring(0, 50))
        );
        
        // Definir a estrutura selecionada
        const selectedStructureOption = currentStructure || partialMatch || null;
        setSelectedStructure(selectedStructureOption ? selectedStructureOption.titulo : 'Continua');
      }
    }
  }, [isOpen, nodeData]);

  // Detectar mudanças no conteúdo
  useEffect(() => {
    if (nodeData?.content && editedContent !== nodeData.content) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [editedContent, nodeData?.content]);

  const handleSave = () => {
    if (onSave && hasChanges) {
      // Mapear selectedStructure para structureType se for um node de estrutura
      let additionalData = {};
      if (nodeData.type === 'estrutura' || nodeData.isStructureNode) {
        const structureTypeMap = {
          'Continua': 'continua',
          'Paragrafos': 'paragrafos',
          'Topicos': 'topicos'
        };
        additionalData = { structureType: structureTypeMap[selectedStructure] || 'continua' };
      }
      
      onSave(nodeData, editedContent, additionalData);
    }
    setHasChanges(false);
  };

  const handleReset = () => {
    setEditedContent(nodeData?.content || '');
    setHasChanges(false);
  };

  const handleClose = () => {
    setEditedContent('');
    setHasChanges(false);
    onClose();
  };

  // Função para lidar com seleção de estrutura
  const handleStructureSelect = (structure) => {
    setSelectedStructure(structure.titulo);
    setEditedContent(structure.estrutura);
    setHasChanges(true);
    
    // Mapear título para structureType
    const structureTypeMap = {
      'Continua': 'continua',
      'Paragrafos': 'paragrafos',
      'Topicos': 'topicos'
    };
    
    // Atualizar o node com o novo structureType
    if (nodeData && onSave) {
      const newStructureType = structureTypeMap[structure.titulo];
      onSave(nodeData, structure.estrutura, { structureType: newStructureType });
    }
  };

  // Fechar modal ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Função para parse markdown
  const parseMarkdown = (text) => {
    try {
      const renderer = new marked.Renderer();
      renderer.heading = (text, level) => {
        return `<h${level} style="color: #E0E0E0; margin: ${level === 1 ? '16px 0 8px 0' : '12px 0 6px 0'}; font-size: ${level === 1 ? '18px' : level === 2 ? '16px' : '14px'}; font-weight: 600;">${text}</h${level}>`;
      };
      renderer.paragraph = (text) => {
        return `<p style="color: #E0E0E0; margin: 8px 0; line-height: 1.6;">${text}</p>`;
      };
      renderer.strong = (text) => {
        return `<strong style="color: #E0E0E0; font-weight: 600;">${text}</strong>`;
      };
      renderer.em = (text) => {
        return `<em style="color: #E0E0E0; font-style: italic;">${text}</em>`;
      };
      renderer.list = (body, ordered) => {
        const tag = ordered ? 'ol' : 'ul';
        return `<${tag} style="color: #E0E0E0; margin: 8px 0; padding-left: 20px;">${body}</${tag}>`;
      };
      renderer.listitem = (text) => {
        return `<li style="margin: 4px 0; line-height: 1.6;">${text}</li>`;
      };

      marked.setOptions({
        renderer,
        breaks: true,
        gfm: true
      });
      
      return marked.parse(text);
    } catch (error) {
      console.warn('❌ Erro no parsing markdown:', error);
      return String(text || '').replace(/\n/g, '<br>');
    }
  };

  if (!isOpen || !nodeData) return null;

  const isEstruturaNode = nodeData.type === 'estrutura';
  const isMicroDadoNode = nodeData.type === 'micro';
  const nodeColor = isEstruturaNode ? '#F5A623' : '#4A90E2';
  const nodeIcon = isEstruturaNode ? Layers : Database;

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

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden"
        >
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-lg shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#333333]">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {React.createElement(nodeIcon, {
                    size: 24,
                    style: { color: nodeColor }
                  })}
                </motion.div>
                <div>
                  <h2 
                    className="text-[#E0E0E0] text-xl font-semibold"
                    style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}
                  >
                    {nodeData.title}
                  </h2>
                  <p 
                    className="text-sm text-[#A0A0A0]"
                    style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}
                  >
                    {isEstruturaNode ? 'Node de Estrutura' : 'Node de Micro-dado'}
                  </p>
                </div>
              </div>

                             <div className="flex items-center gap-2">
                 {/* Botão de fechar */}
                 <motion.button
                   onClick={handleClose}
                   className="p-2 rounded-lg transition-colors"
                   style={{
                     backgroundColor: 'var(--bg-tertiary)',
                     color: 'var(--text-secondary)',
                     border: '1px solid var(--border-primary)'
                   }}
                   whileHover={{
                     backgroundColor: 'var(--status-error-bg)',
                     color: 'var(--status-error)'
                   }}
                   whileTap={{ scale: 0.95 }}
                   title="Fechar modal"
                 >
                   <X size={18} />
                 </motion.button>
               </div>
            </div>

                         {/* Conteúdo */}
             <div className="flex-1 overflow-y-auto p-6">
               <div className="space-y-4">
                 {/* Dropdown de estrutura (apenas para nodes de estrutura) */}
                 {isEstruturaNode && (
                   <div>
                     <label 
                       className="block text-sm font-medium text-[#A0A0A0] mb-2"
                       style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}
                     >
                       Selecionar Estrutura
                     </label>
                     <div className="grid grid-cols-3 gap-3 mb-4">
                       {structureOptions.map((option, index) => (
                         <motion.button
                           key={option.titulo}
                           onClick={() => handleStructureSelect(option)}
                           className="p-3 rounded-lg border transition-all duration-200 text-left"
                           style={{
                             backgroundColor: selectedStructure === option.titulo 
                               ? `${nodeColor}20` 
                               : 'var(--bg-primary)',
                             borderColor: selectedStructure === option.titulo 
                               ? nodeColor 
                               : 'var(--border-primary)',
                             color: selectedStructure === option.titulo 
                               ? nodeColor 
                               : 'var(--text-secondary)'
                           }}
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                         >
                           <div 
                             className="font-medium mb-2"
                             style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}
                           >
                             {option.titulo}
                           </div>
                           <div 
                             className="text-xs opacity-80 line-clamp-2"
                             style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}
                           >
                             {option.estrutura.split('\n')[0]}...
                           </div>
                         </motion.button>
                       ))}
                     </div>
                   </div>
                 )}

                                   <div>
                    <label 
                      className="block text-sm font-medium text-[#A0A0A0] mb-2"
                      style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}
                    >
                      Conteúdo
                    </label>
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-64 p-4 rounded-lg border outline-none transition-colors resize-none"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                        fontFamily: '"Nunito Sans", "Inter", sans-serif',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}
                      placeholder="Digite o conteúdo do node..."
                    />
                  </div>
               </div>
             </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-[#333333]">
              <div className="flex items-center gap-2">
                <span 
                  className="text-xs text-[#A0A0A0]"
                  style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}
                >
                  ID: {nodeData.itemId}
                </span>
                <span 
                  className="text-xs text-[#A0A0A0]"
                  style={{ fontFamily: '"Nunito Sans", "Inter", sans-serif' }}
                >
                  Tipo: {nodeData.nodeType || nodeData.coreKey}
                </span>
              </div>

                             <div className="flex items-center gap-2">
                 <motion.button
                   onClick={handleReset}
                   className="px-4 py-2 rounded-lg border transition-colors flex items-center gap-2"
                   style={{
                     backgroundColor: 'var(--bg-primary)',
                     borderColor: 'var(--border-primary)',
                     color: 'var(--text-secondary)',
                     fontFamily: '"Nunito Sans", "Inter", sans-serif',
                     fontSize: '14px'
                   }}
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                 >
                   <RotateCcw size={16} />
                   Resetar
                 </motion.button>
                 
                 <motion.button
                   onClick={handleSave}
                   disabled={!hasChanges}
                   className="px-4 py-2 rounded-lg border transition-colors flex items-center gap-2"
                   style={{
                     backgroundColor: hasChanges ? nodeColor : 'var(--bg-primary)',
                     borderColor: hasChanges ? nodeColor : 'var(--border-primary)',
                     color: hasChanges ? 'white' : 'var(--text-secondary)',
                     fontFamily: '"Nunito Sans", "Inter", sans-serif',
                     fontSize: '14px',
                     opacity: hasChanges ? 1 : 0.5,
                     cursor: hasChanges ? 'pointer' : 'not-allowed'
                   }}
                   whileHover={hasChanges ? { scale: 1.02 } : {}}
                   whileTap={hasChanges ? { scale: 0.98 } : {}}
                 >
                   <Save size={16} />
                   Salvar
                 </motion.button>
               </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NodeModal; 