// src/components/advancedCanvas/NotionLikePageWithMainLine.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Save, X, Layers as LayersIcon, Zap, Link } from 'lucide-react';
import CanvasLibraryViewWithProximity from './CanvasLibraryViewWithProximity';
import BlockNoteEditor from './BlockNoteEditor';

const SECTION_TITLES = {
  summary: 'Introdução',
  body: 'Corpo',
  conclusion: 'Conclusão'
};

const NotionLikePageWithMainLine = ({ 
  isOpen = true, 
  onClose, 
  newsData, 
  newsTitle, 
  nodes = [], 
  edges = [], 
  onSaveNode, 
  onCanvasItemDragStart, 
  onLinkDataToSection 
}) => {
  const editorRef = useRef(null);
  const [activeSection, setActiveSection] = useState('summary');
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [mainLineNodes, setMainLineNodes] = useState([]);
  const [isMainLineActive, setIsMainLineActive] = useState(true);
  const [editorContent, setEditorContent] = useState('');

  // Sincroniza a linha principal com o conteúdo do editor
  const handleMainLineUpdate = useCallback((mainLine) => {
    console.log('📝 Linha principal atualizada:', mainLine);
    setMainLineNodes(mainLine);
    
    // Reconstrói o conteúdo do editor baseado na linha principal
    if (mainLine.length > 0 && isMainLineActive) {
      const contentParts = [];
      
      // Agrupa nodes por segmento
      const segments = {
        intro: [],
        body: [],
        conclusion: []
      };
      
      mainLine.forEach(node => {
        if (node.data?.segment) {
          const segment = node.data.segment;
          if (segments[segment]) {
            segments[segment].push(node);
          }
        }
      });
      
      // Constrói o markdown
      if (segments.intro.length > 0) {
        contentParts.push(`# ${SECTION_TITLES.summary}`);
        segments.intro.forEach(node => {
          if (node.data?.content) {
            contentParts.push(node.data.content);
          }
        });
        contentParts.push('');
      }
      
      if (segments.body.length > 0) {
        contentParts.push(`# ${SECTION_TITLES.body}`);
        segments.body.forEach(node => {
          if (node.data?.content) {
            contentParts.push(node.data.content);
          }
        });
        contentParts.push('');
      }
      
      if (segments.conclusion.length > 0) {
        contentParts.push(`# ${SECTION_TITLES.conclusion}`);
        segments.conclusion.forEach(node => {
          if (node.data?.content) {
            contentParts.push(node.data.content);
          }
        });
      }
      
      const newContent = contentParts.join('\n');
      setEditorContent(newContent);
      
      // Notifica mudança para componentes externos
      if (onSaveNode) {
        // Salva cada seção
        Object.entries(segments).forEach(([segmentKey, segmentNodes]) => {
          const sectionId = segmentKey === 'intro' ? 'summary' : segmentKey;
          const sectionContent = segmentNodes
            .map(n => n.data?.content || '')
            .filter(Boolean)
            .join('\n\n');
          
          if (sectionContent) {
            onSaveNode(sectionId, sectionContent);
          }
        });
      }
    }
  }, [isMainLineActive, onSaveNode]);

  // Handler para mudanças no editor
  const handleEditorChange = useCallback((markdown) => {
    setEditorContent(markdown);
    
    // Se a linha principal não está ativa, salva normalmente
    if (!isMainLineActive) {
      // Parse do markdown para extrair seções
      const sections = parseMarkdownSections(markdown);
      Object.entries(sections).forEach(([sectionId, content]) => {
        if (onSaveNode) {
          onSaveNode(sectionId, content);
        }
      });
    }
  }, [isMainLineActive, onSaveNode]);

  // Parse de markdown em seções
  const parseMarkdownSections = (markdown) => {
    const sections = {
      summary: '',
      body: '',
      conclusion: ''
    };
    
    const lines = markdown.split('\n');
    let currentSection = null;
    let sectionContent = [];
    
    lines.forEach(line => {
      if (line.startsWith('# ')) {
        // Salva seção anterior
        if (currentSection && sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n').trim();
        }
        
        // Identifica nova seção
        const title = line.substring(2).trim();
        if (title === SECTION_TITLES.summary) {
          currentSection = 'summary';
        } else if (title === SECTION_TITLES.body) {
          currentSection = 'body';
        } else if (title === SECTION_TITLES.conclusion) {
          currentSection = 'conclusion';
        }
        
        sectionContent = [];
      } else if (currentSection) {
        sectionContent.push(line);
      }
    });
    
    // Salva última seção
    if (currentSection && sectionContent.length > 0) {
      sections[currentSection] = sectionContent.join('\n').trim();
    }
    
    return sections;
  };

  // Toggle linha principal
  const toggleMainLine = useCallback(() => {
    setIsMainLineActive(prev => !prev);
  }, []);

  if (!isOpen) return null;

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <motion.div
        className="relative w-full h-full flex flex-col"
        style={{ 
          backgroundColor: 'var(--bg-primary)', 
          border: '1px solid var(--border-primary)' 
        }}
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" 
             style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-3">
            <FileText size={22} style={{ color: 'var(--primary-green)' }} />
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Editor com Linha Principal
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {newsTitle || 'Documento'}
              </div>
            </div>
            
            {/* Indicador de linha principal */}
            {isMainLineActive && mainLineNodes.length > 0 && (
              <motion.div
                className="flex items-center gap-2 px-2 py-1 rounded-lg"
                style={{ 
                  backgroundColor: 'var(--primary-green-transparent)',
                  color: 'var(--primary-green)'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <Zap size={12} />
                <span className="text-xs">{mainLineNodes.length} nodes conectados</span>
              </motion.div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Toggle linha principal */}
            <motion.button
              onClick={toggleMainLine}
              className="px-3 py-1.5 rounded border flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title={isMainLineActive ? 'Desativar linha principal' : 'Ativar linha principal'}
              style={{ 
                backgroundColor: isMainLineActive ? 'var(--primary-green)' : 'var(--bg-tertiary)', 
                borderColor: isMainLineActive ? 'var(--primary-green)' : 'var(--border-primary)', 
                color: isMainLineActive ? 'white' : 'var(--text-secondary)' 
              }}
            >
              <Link size={14} />
              <span className="text-sm">Linha Principal</span>
            </motion.button>
            
            <button 
              onClick={() => handleEditorChange(editorContent)} 
              className="px-3 py-1.5 rounded border"
              title="Salvar"
              style={{ 
                backgroundColor: 'var(--bg-tertiary)', 
                borderColor: 'var(--border-primary)', 
                color: 'var(--text-secondary)' 
              }}
            >
              <div className="flex items-center gap-2">
                <Save size={16} />
                <span className="text-sm">Salvar</span>
              </div>
            </button>
            
            <button 
              onClick={onClose} 
              className="p-2 rounded border"
              title="Fechar"
              style={{ 
                backgroundColor: 'var(--bg-tertiary)', 
                borderColor: 'var(--border-primary)', 
                color: 'var(--text-secondary)' 
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Corpo: Editor + Canvas */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div 
            className="overflow-hidden"
            style={{ 
              width: `${Math.round(splitRatio * 100)}%`,
              minWidth: 400,
              backgroundColor: 'var(--bg-primary)'
            }}
          >
            <div className="h-full relative">
              {/* Indicador visual quando linha principal está ativa */}
              {isMainLineActive && (
                <div 
                  className="absolute top-0 left-0 right-0 h-1 z-10"
                  style={{ 
                    background: 'linear-gradient(90deg, var(--primary-green) 0%, transparent 100%)'
                  }}
                />
              )}
              
              <BlockNoteEditor
                ref={editorRef}
                initialContent={editorContent}
                onChange={handleEditorChange}
                inventoryItems={inventoryItems}
                isInventoryOpen={isInventoryOpen}
                inventoryUnread={0}
                onToggleInventory={() => setIsInventoryOpen(v => !v)}
                onCanvasItemDragStart={onCanvasItemDragStart}
              />
            </div>
          </div>

          {/* Splitter */}
          <div 
            className="cursor-col-resize hover:bg-gray-600"
            style={{ width: 4, backgroundColor: '#6b7280' }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startRatio = splitRatio;
              
              const handleMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                const containerWidth = e.currentTarget?.parentElement?.offsetWidth || window.innerWidth;
                const deltaRatio = deltaX / containerWidth;
                const newRatio = Math.max(0.3, Math.min(0.7, startRatio + deltaRatio));
                setSplitRatio(newRatio);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />

          {/* Canvas com proximidade */}
          <div 
            className="overflow-hidden"
            style={{ 
              width: `${Math.round((1 - splitRatio) * 100)}%`,
              minWidth: 400,
              backgroundColor: 'var(--bg-primary)'
            }}
          >
            <CanvasLibraryViewWithProximity
              compact
              sidebarOnRight
              enableSidebarToggle
              transparentSidebar
              newsData={newsData}
              onTransferItem={() => {}}
              onOpenCardModal={() => {}}
              onDragStart={onCanvasItemDragStart}
              onCanvasItemDragStart={() => {}}
              onAddToNotionSection={(sectionId, payload) => {
                // Adiciona ao editor
                const sections = parseMarkdownSections(editorContent);
                sections[sectionId] = sections[sectionId] 
                  ? `${sections[sectionId]}\n\n${payload.content}`
                  : payload.content;
                
                // Reconstrói o markdown
                const newContent = [
                  `# ${SECTION_TITLES.summary}`,
                  sections.summary,
                  '',
                  `# ${SECTION_TITLES.body}`,
                  sections.body,
                  '',
                  `# ${SECTION_TITLES.conclusion}`,
                  sections.conclusion
                ].filter(Boolean).join('\n');
                
                setEditorContent(newContent);
              }}
              onAddToInventory={(payload) => {
                setInventoryItems(prev => [payload, ...prev]);
              }}
              enableProximityConnections={true}
              onMainLineUpdate={handleMainLineUpdate}
            />
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="px-4 py-2 border-t flex items-center justify-between text-xs"
             style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-4">
            <span>
              {isMainLineActive ? '🟢 Linha principal ativa' : '⚪ Linha principal inativa'}
            </span>
            {mainLineNodes.length > 0 && (
              <span>
                {mainLineNodes.length} nodes na sequência
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>Arraste nodes próximos para conectar automaticamente</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NotionLikePageWithMainLine;