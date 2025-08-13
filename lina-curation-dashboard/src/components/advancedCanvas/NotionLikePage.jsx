import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FileText, 
  Circle,
  CheckCircle,
  ArrowDown,
  Edit3,
  Save,
  Eye,
  Maximize2,
  Minimize2,
  Quote as QuoteIcon,
  Layers as LayersIcon,
  Braces as BracesIcon
} from 'lucide-react';
import CanvasLibraryView from './CanvasLibraryView';
// Observação: BlockNote foi temporariamente substituído por textarea para evitar
// problemas de build. Podemos reativar quando a exportação estiver estável.

/**
 * NotionLikePage - Página estilo Notion para visualizar e editar frases completas
 * com timeline de checkpoints à esquerda
 */
const NotionLikePage = ({ 
  isOpen, 
  onClose, 
  newsData, 
  newsTitle,
  nodes = [],
  edges = [],
  onSaveNode
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingSection, setEditingSection] = useState(null);
  const [activeSections, setActiveSections] = useState(new Set());
  const [activeSection, setActiveSection] = useState(null);
  // Splitter state: proporção editor/library
  const [splitRatio, setSplitRatio] = useState(0.6); // 60% editor / 40% library
  const [isResizing, setIsResizing] = useState(false);
  const rightPaneRef = useRef(null);
  const EDITOR_MIN_PX = 480;
  const LIB_MIN_PX = 360;

  const onStartResize = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      const el = rightPaneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let x = e.clientX - rect.left;
      // Respeitar mínimos
      x = Math.max(EDITOR_MIN_PX, Math.min(rect.width - LIB_MIN_PX, x));
      const ratio = x / rect.width;
      setSplitRatio(ratio);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Construir visualização a partir dos nodes do canvas (summary, body, conclusion)
  const processedData = useMemo(() => {
    try {
      if (!Array.isArray(nodes) || nodes.length === 0) return [];

      // Mapear nodes principais e qualquer outro `textSegmentNode`
      const sectionOrder = ['summary', 'body', 'conclusion'];
      const titleMap = { summary: 'Introdução', body: 'Corpo', conclusion: 'Conclusão' };

      // Helper: encontrar nodes conectados (source -> target textSegment)
      const getConnectedToSegment = (segmentId) => {
        const inbound = edges.filter((e) => e.target === segmentId);
        // Retornar resumo dos nodes conectados
        return inbound
          .map((e) => nodes.find((n) => n.id === e.source))
          .filter(Boolean)
          .map((n) => ({
            id: n.id,
            title: n.data?.title || n.id,
            content: n.data?.content || '',
            coreKey: n.data?.coreKey || '',
            type: n.type,
            structureType: n.data?.structureType || '',
            isStructure: (n.data?.nodeType === 'estrutura') || (n.data?.coreKey === 'micro_estrutura')
          }));
      };

      const sections = sectionOrder
        .map((id) => nodes.find((n) => n.id === id))
        .filter(Boolean)
        .map((node) => ({
          id: node.id,
          title: titleMap[node.id] || (node.data?.title || node.id),
          phrases: getConnectedToSegment(node.id).map((cn, idx) => ({
            id: `${cn.id}-${idx}`,
            titulo_frase: cn.title,
            frase_completa: cn.content,
            categoria_funcional: cn.coreKey,
            nodeId: cn.id,
            nodeType: cn.type,
            structureType: cn.structureType,
            isStructure: cn.isStructure
          }))
        }));

      // Incluir quaisquer outros nodes de texto como seções adicionais
      const extraTextNodes = nodes
        .filter((n) => n.type === 'textSegmentNode' && !sectionOrder.includes(n.id))
        .map((node) => ({
          id: node.id,
          title: node.data?.title || node.id,
          phrases: getConnectedToSegment(node.id).map((cn, idx) => ({
            id: `${cn.id}-${idx}`,
            titulo_frase: cn.title,
            frase_completa: cn.content,
            categoria_funcional: cn.coreKey,
            nodeId: cn.id,
            nodeType: cn.type,
            structureType: cn.structureType,
            isStructure: cn.isStructure
          }))
        }));

      return [...sections, ...extraTextNodes];
    } catch (error) {
      console.error('Erro ao montar dados do NotionLikePage:', error);
      return [];
    }
  }, [nodes, edges]);

  // Fechar modal ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Evitar scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const toggleExpanded = () => setIsExpanded(prev => !prev);
  const modalWidth = isExpanded ? 'w-full' : 'w-5/6';
  const modalMaxWidth = isExpanded ? 'max-w-none' : 'max-w-6xl';

  const toggleSectionActive = (sectionId) => {
    setActiveSections(prev => {
      const newSet = new Set(prev);
      // Botão ativo/desativo: todos começam ativos; clique desativa/ativa
      if (newSet.has(sectionId)) newSet.delete(sectionId); else newSet.add(sectionId);
      return newSet;
    });
  };

  const getCategoryColor = (categoria) => {
    const colors = {
      'Tendencias_Padroes': '#4A90E2',
      'Contextualizacao': '#F5A623',
      'Impactos_Consequencias': '#E94E77',
      'Desafios_Oportunidades': '#2BB24C',
      'default': '#9CA3AF'
    };
    return colors[categoria] || colors.default;
  };

  // Rotulo amigável para tipo de estrutura
  const getStructureLabel = (value) => ({
    continua: 'Continua',
    paragrafos: 'Paragrafos',
    parágrafos: 'Paragrafos',
    topicos: 'Topicos',
    tópicos: 'Topicos'
  }[(value || '').toString().toLowerCase()] || 'Estrutura');

  // Inicialmente todas as seções ativas quando abrir
  useEffect(() => {
    if (isOpen && processedData.length) {
      setActiveSections(new Set(processedData.map(s => s.id)));
    }
  }, [isOpen, processedData]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .notion-editor .bn-container {
          background-color: var(--bg-primary) !important;
          color: var(--text-primary) !important;
        }
        
        .notion-editor .bn-editor {
          background-color: transparent !important;
          color: var(--text-primary) !important;
        }
        
        .notion-editor .ProseMirror {
          background-color: transparent !important;
          color: var(--text-primary) !important;
          padding: 12px !important;
          font-family: "Nunito Sans", "Inter", sans-serif !important;
          line-height: 1.6 !important;
        }
        
        .notion-editor .ProseMirror p {
          color: var(--text-primary) !important;
          margin: 0.5em 0 !important;
        }
        
        .notion-editor .bn-side-menu {
          background-color: var(--bg-secondary) !important;
          border: 1px solid var(--border-primary) !important;
        }
        
        .notion-editor .bn-drag-handle {
          color: var(--text-secondary) !important;
        }
        
        .notion-editor .bn-slash-menu {
          background-color: var(--bg-secondary) !important;
          border: 1px solid var(--border-primary) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        
        .notion-editor .bn-slash-menu-item {
          color: var(--text-primary) !important;
        }
        
        .notion-editor .bn-slash-menu-item:hover {
          background-color: var(--primary-green-transparent) !important;
        }
        
        .notion-editor .bn-slash-menu-item[data-selected="true"] {
          background-color: var(--primary-green-transparent) !important;
        }
        
        /* Splitter vertical entre editor e canvas library */
        .splitter-handle {
          background-color: var(--border-primary);
          transition: background-color 0.15s ease, width 0.15s ease;
        }
        .splitter-handle:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
        .splitter-handle.active {
          background-color: rgba(255, 255, 255, 0.45);
        }
      `}</style>
      
      <AnimatePresence mode="wait">
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
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
              borderRadius: isExpanded ? '0' : '12px',
              border: '1px solid var(--border-primary)',
              maxHeight: isExpanded ? '100vh' : '95vh'
            }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 border-b"
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
                  <FileText size={24} style={{ color: 'var(--primary-green)' }} />
                </motion.div>
                <div>
                  <h2 
                    className="text-xl font-semibold"
                    style={{ 
                      color: 'var(--text-primary)', 
                      fontFamily: '"Nunito Sans", "Inter", sans-serif' 
                    }}
                  >
                    Editor Estruturado
                  </h2>
                  <p 
                    className="text-sm"
                    style={{ 
                      color: 'var(--text-secondary)', 
                      fontFamily: '"Nunito Sans", "Inter", sans-serif' 
                    }}
                  >
                    {newsTitle || 'Editando frases completas'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
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
                  title={isExpanded ? 'Minimizar' : 'Maximizar'}
                >
                  {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </motion.button>
                
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
                  title="Fechar editor"
                >
                  <X size={18} />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Timeline Sidebar */}
              <motion.div
                className="w-80 min-w-[20rem] border-r overflow-y-auto"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderColor: 'var(--border-primary)' 
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="p-4">
                  <h3 
                    className="text-sm font-medium mb-4"
                    style={{ 
                      color: 'var(--text-primary)', 
                      fontFamily: '"Nunito Sans", "Inter", sans-serif' 
                    }}
                  >
                    Estrutura do Conteúdo
                  </h3>
                  
                  <div className="space-y-1">
                    {processedData.map((section, sectionIndex) => (
                      <div key={section.id} className="relative">
                        {/* Section Title */}
                        <motion.div
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            activeSection === section.id ? 'ring-1 ring-green-500' : ''
                          }`}
                          style={{
                            backgroundColor: activeSection === section.id 
                              ? 'var(--primary-green-transparent)' 
                              : 'var(--bg-primary)',
                            borderColor: 'var(--border-primary)'
                          }}
                          onClick={() => setActiveSection(section.id)}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + sectionIndex * 0.1 }}
                        >
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSectionActive(section.id);
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title={activeSections.has(section.id) ? 'Desativar seção' : 'Ativar seção'}
                          >
                            {activeSections.has(section.id) ? (
                              <CheckCircle size={16} style={{ color: 'var(--primary-green)' }} />
                            ) : (
                              <Circle size={16} style={{ color: 'var(--text-secondary)' }} />
                            )}
                          </motion.button>
                          
                          <div className="flex-1 min-w-0">
                            <p 
                              className="text-sm font-medium truncate"
                              style={{ 
                                color: activeSection === section.id 
                                  ? 'var(--primary-green)' 
                                  : 'var(--text-primary)' 
                              }}
                            >
                              {section.title}
                            </p>
                            <p 
                              className="text-xs"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {section.phrases.length} frases
                            </p>
                          </div>
                        </motion.div>

                        {/* Timeline connector */}
                        {sectionIndex < processedData.length - 1 && (
                          <div 
                            className="absolute left-6 w-0.5 h-4 -bottom-1"
                            style={{ backgroundColor: 'var(--border-primary)' }}
                          />
                        )}

                        {/* Phrases list when section is active */}
                        <AnimatePresence>
                          {(activeSections.has(section.id) || activeSection === section.id) && (
                            <motion.div
                              className="ml-8 mt-2 space-y-2"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              {section.phrases.map((phrase, phraseIndex) => {
                                const role = (phrase.categoria_funcional || '').toString();
                                const isStructure = role === 'estrutura' || role === 'micro_estrutura' || role.includes('estrutura');
                                const isMicro = !isStructure && role.toLowerCase().includes('micro');
                                const borderColor = isStructure ? '#F5A623' : '#4A90E2';
                                const IconComp = isStructure ? LayersIcon : (isMicro ? QuoteIcon : BracesIcon);
                                const chipText = isStructure ? getStructureLabel(phrase.structureType) : phrase.titulo_frase;
                                return (
                                  <motion.div
                                    key={phrase.id}
                                    className="inline-flex max-w-full"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: phraseIndex * 0.05 }}
                                  >
                                    <span
                                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[12px] leading-4 max-w-full"
                                      style={{ borderColor, color: 'var(--text-secondary)' }}
                                      title={chipText}
                                    >
                                      <IconComp className="h-3.5 w-3.5" />
                                      <span className="truncate max-w-[220px]">{chipText}</span>
                                    </span>
                                  </motion.div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Main Content Area (Editor + Canvas Library ao lado direito) */}
              <motion.div
                className="flex-1 overflow-hidden flex"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                ref={rightPaneRef}
              >
                <div
                  className="overflow-y-auto"
                  style={{
                    width: `${Math.round(splitRatio * 100)}%`,
                    minWidth: EDITOR_MIN_PX
                  }}
                >
                  {activeSection ? (
                    <ActiveSectionEditor 
                      section={processedData.find(s => s.id === activeSection)}
                      getCategoryColor={getCategoryColor}
                      getStructureLabel={getStructureLabel}
                      onSaveNode={onSaveNode}
                    />
                  ) : (
                    <div className="p-6 space-y-8">
                      {processedData
                        .filter((s) => activeSections.has(s.id))
                        .map((s) => (
                          <ActiveSectionEditor
                            key={s.id}
                            section={s}
                            getCategoryColor={getCategoryColor}
                            getStructureLabel={getStructureLabel}
                            onSaveNode={onSaveNode}
                          />
                        ))}
                    </div>
                  )}
                </div>
                {/* Splitter handle */}
                <div
                  onMouseDown={onStartResize}
                  className={`splitter-handle cursor-col-resize ${isResizing ? 'active' : ''}`}
                  style={{
                    width: 5,
                    zIndex: 10
                  }}
                  title="Arraste para redimensionar"
                />
                <div
                  className="overflow-hidden"
                  style={{
                    width: `${Math.round((1 - splitRatio) * 100)}%`,
                    minWidth: LIB_MIN_PX,
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                >
                  <CanvasLibraryView compact sidebarOnRight enableSidebarToggle newsData={newsData} onTransferItem={() => {}} onOpenCardModal={() => {}} />
                </div>
              </motion.div>
            </div>

            {/* Footer */}
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
                  {processedData.length} seções • {processedData.reduce((acc, section) => acc + section.phrases.length, 0)} frases
                </span>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--text-secondary)' }}>{activeSections.size}/{processedData.length} ativas</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    ESC para fechar
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

// Componente para estado vazio
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full opacity-50">
    <FileText size={64} style={{ color: 'var(--text-secondary)' }} />
    <p 
      className="mt-4 text-lg font-medium"
      style={{ color: 'var(--text-secondary)' }}
    >
      Selecione uma seção
    </p>
    <p 
      className="text-sm mt-2"
      style={{ color: 'var(--text-secondary)' }}
    >
      Escolha uma seção na timeline para começar a editar
    </p>
  </div>
);

// Componente para editar seção ativa
const ActiveSectionEditor = ({ section, getCategoryColor, getStructureLabel, onSaveNode }) => {
  const [editingPhrase, setEditingPhrase] = useState(null);
  const isStructurePhrase = (p) => {
    return p.isStructure === true || Boolean(p.structureType);
  };
  const structurePhrases = Array.isArray(section?.phrases) ? section.phrases.filter(isStructurePhrase) : [];
  const contentPhrases = Array.isArray(section?.phrases) ? section.phrases.filter((p) => !isStructurePhrase(p)) : [];
  
  if (!section) return <EmptyState />;

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 
          className="text-2xl font-bold"
          style={{ 
            color: 'var(--text-primary)', 
            fontFamily: '"Nunito Sans", "Inter", sans-serif' 
          }}
        >
          {section.title}
        </h2>
        {structurePhrases.length > 0 && (
          <div className="mt-2 mb-6 flex flex-wrap gap-2">
            {structurePhrases.map((phrase) => (
              <span key={phrase.id} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[12px] leading-4" style={{ borderColor: '#F5A623', color: 'var(--text-secondary)' }} title={getStructureLabel(phrase.structureType)}>
                <LayersIcon className="h-3.5 w-3.5" />
                <span>{getStructureLabel(phrase.structureType)}</span>
              </span>
            ))}
          </div>
        )}

        <div className="space-y-6">
          {contentPhrases.map((phrase, index) => (
            <motion.div
              key={phrase.id}
              className="group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PhraseEditor 
                phrase={phrase}
                getCategoryColor={getCategoryColor}
                isEditing={editingPhrase === phrase.id}
                onEditToggle={() => setEditingPhrase(
                  editingPhrase === phrase.id ? null : phrase.id
                )}
                onSaveNode={onSaveNode}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// Componente para editar uma frase individual
const PhraseEditor = ({ phrase, getCategoryColor, isEditing, onEditToggle, onSaveNode }) => {
  const [content, setContent] = useState(phrase.frase_completa);

  const handleSave = () => {
    // Aqui você pode implementar a lógica de salvar
    console.log('Salvando:', content);
    if (onSaveNode && phrase.nodeId) {
      onSaveNode(phrase.nodeId, content);
    }
    onEditToggle();
  };

  return (
    <div 
      className="p-4 rounded-lg border"
      style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderColor: 'var(--border-primary)',
        borderLeft: `4px solid ${getCategoryColor(phrase.categoria_funcional)}`
      }}
    >
      {/* Header da frase */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 
            className="font-medium"
            style={{ 
              color: 'var(--text-primary)', 
              fontFamily: '"Nunito Sans", "Inter", sans-serif' 
            }}
          >
            {phrase.titulo_frase}
          </h3>
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <>
              <motion.button
                onClick={handleSave}
                className="p-1.5 rounded transition-colors"
                style={{ 
                  backgroundColor: 'var(--primary-green-transparent)', 
                  color: 'var(--primary-green)' 
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Salvar"
              >
                <Save size={14} />
              </motion.button>
              <motion.button
                onClick={onEditToggle}
                className="p-1.5 rounded transition-colors"
                style={{ 
                  backgroundColor: 'var(--bg-tertiary)', 
                  color: 'var(--text-secondary)' 
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Cancelar"
              >
                <X size={14} />
              </motion.button>
            </>
          ) : (
            <motion.button
              onClick={onEditToggle}
              className="p-1.5 rounded transition-colors"
              style={{ 
                backgroundColor: 'var(--bg-tertiary)', 
                color: 'var(--text-secondary)' 
              }}
              whileHover={{ 
                backgroundColor: 'var(--primary-green-transparent)', 
                color: 'var(--primary-green)' 
              }}
              whileTap={{ scale: 0.95 }}
              title="Editar"
            >
              <Edit3 size={14} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Conteúdo editável */}
      <div className="notion-editor">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Digite aqui..."
            style={{
              width: '100%',
              minHeight: '150px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: '"Nunito Sans", "Inter", sans-serif',
              lineHeight: '1.6',
              resize: 'vertical'
            }}
            onKeyDown={(e) => {
              // permitir deletar/backspace sem interferência
              // e salvar com Ctrl/Cmd+S
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        ) : (
          <div 
            className="p-3 rounded border cursor-pointer transition-colors hover:bg-opacity-50"
            style={{ 
              backgroundColor: 'var(--bg-primary)', 
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
              fontFamily: '"Nunito Sans", "Inter", sans-serif',
              lineHeight: '1.6'
            }}
            onClick={onEditToggle}
          >
            {phrase.frase_completa}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotionLikePage;


