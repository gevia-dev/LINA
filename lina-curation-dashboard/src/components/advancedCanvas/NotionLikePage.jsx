import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Save, X, Layers as LayersIcon, Quote as QuoteIcon, Braces as BracesIcon, ChevronLeft, ChevronRight, Library as LibraryIcon, Bug, TestTube, Target, Eye, EyeOff } from 'lucide-react';
import CanvasLibraryView from './CanvasLibraryView';
import BlockNoteEditor from './BlockNoteEditor';
import MainSidebar from '../MainSidebar';
import { cleanText, mapCleanToOriginalIndex } from '../../utils/textHelpers';
import SequenceVisualizer from '../../utils/SequenceVisualizer';
import { getOrderedSequenceFromConnections, reconstructFinalText } from '../../utils/connectionMappingUtils';



// Estilos CSS para os marcadores de referência e grifo
const referenceMarkerStyles = `
  /* Estilos para os marcadores de referência simples */
  .ProseMirror {
    font-family: 'Inter', 'Nunito Sans', sans-serif;
  }
  
  /* Estilizar números entre colchetes para parecerem marcadores de referência */
  .ProseMirror p:contains('['), .ProseMirror h1:contains('['), .ProseMirror h2:contains('['), .ProseMirror h3:contains('[') {
    line-height: 1.6;
  }
  
  /* Adicionar espaçamento extra após marcadores de referência */
  .ProseMirror p:contains('[') {
    margin-bottom: 1em;
  }
  
  /* Garantir que seleções sejam visíveis */
  .ProseMirror ::selection {
    background-color: rgba(254, 243, 199, 0.8) !important;
  }
  
  /* Estilos para texto com background aplicado via API do BlockNote */
  .ProseMirror span[style*="background-color"] {
    border-radius: 3px !important;
    padding: 1px 2px !important;
    transition: all 0.3s ease !important;
  }
  
  /* Estilos para marcadores de referência quando grifados */
  .ProseMirror .reference-marker-highlighted {
    background-color: #32CD32 !important;
    color: #000 !important;
    font-weight: bold;
    border-radius: 3px;
    padding: 1px 3px;
    transition: all 0.3s ease;
  }
`;

const SECTION_TITLES = {
  summary: 'Introdução',
  body: 'Corpo',
  conclusion: 'Conclusão'
};

const NotionLikePage = ({ 
  isOpen = true, 
  onClose, 
  newsData, 
  newsTitle, 
  onCanvasItemDragStart, 
  onLinkDataToSection,
  nodes = [],
  edges = []
}) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const rightPaneRef = useRef(null);
  const lastDropRef = useRef({ itemId: null, sectionId: null, at: 0 });
  const [activeSection, setActiveSection] = useState('summary');
  const [lastMarkdown, setLastMarkdown] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.4);
  const [filteredSection, setFilteredSection] = useState(null);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [dragState, setDragState] = useState({ active: false });
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  
  // Estado para armazenar o mapeamento entre marcadores e títulos
  const [referenceMapping, setReferenceMapping] = useState(new Map());
  
  // Estados para sincronização de texto com conexões
  const [dynamicText, setDynamicText] = useState('');
  const [isDynamicMode, setIsDynamicMode] = useState(false);
  const [textMapping, setTextMapping] = useState(new Map());
  const [showSequenceVisualizer, setShowSequenceVisualizer] = useState(false);
  
  // Estado para conteúdo derivado do canvas
  const [canvasDerivedContent, setCanvasDerivedContent] = useState(null);

  const EDITOR_MIN_PX = 480;
  const LIB_MIN_PX = 360;
  

  
  // Handler para atualizações de mapeamento
  const handleMappingUpdate = useCallback((newMapping) => {
    console.log('🔄 Mapeamento atualizado:', newMapping.size, 'referências');
    setTextMapping(newMapping);
    setReferenceMapping(newMapping); // Sincronizar com mapeamento existente
  }, []);
  
  // Estado para armazenar sequências atuais
  const [currentSequences, setCurrentSequences] = useState([]);
  
  // Handler para atualizações de sequências
  const handleSequencesUpdate = useCallback((sequences) => {
    console.log('🔄 Sequências atualizadas:', sequences.length, 'seções');
    setCurrentSequences(sequences);
  }, []);
  
  // Função para detectar e aplicar mudanças específicas no texto
  const applyCanvasChangesToText = useCallback((canvasNodes, canvasEdges, currentText) => {
    try {
      // Validação e conversão segura do texto atual
      const safeCurrentText = String(currentText || '').trim();
      
      if (!canvasNodes || canvasNodes.length === 0) {
        console.log('ℹ️ Nenhum node no canvas para aplicar mudanças');
        return { hasChanges: false, updatedText: safeCurrentText };
      }
      
      // 1. Obter sequência ordenada das conexões
      const sequencesBySegment = getOrderedSequenceFromConnections(canvasNodes, canvasEdges);
      
      if (sequencesBySegment.length === 0) {
        console.log('ℹ️ Nenhuma sequência de conexões encontrada no canvas');
        return { hasChanges: false, updatedText: safeCurrentText };
      }
      
      // 2. Gerar novo texto baseado nas conexões
      const { finalText: newText, newMapping } = reconstructFinalText(sequencesBySegment, textMapping);
      
      // 3. Atualizar o mapeamento
      setTextMapping(newMapping);
      setReferenceMapping(newMapping);
      
      // VERIFICAÇÃO CRÍTICA: Se o texto atual está vazio ou é muito diferente, pode ser carregamento inicial
      if (!safeCurrentText || safeCurrentText.length < 100) {
        console.log('🚀 Possível carregamento inicial - texto atual muito pequeno ou vazio');
        console.log('📝 Configurando texto base sem marcar como "mudança"');
        
        return { 
          hasChanges: false, 
          updatedText: newText,
          isInitialSetup: true 
        };
      }
      
      // 4. Comparar com texto atual para detectar mudanças específicas
      const changes = detectTextChanges(safeCurrentText, newText, sequencesBySegment);
      
      if (changes.hasChanges) {
        console.log('🔄 Mudanças detectadas:', changes.summary);
        return {
          hasChanges: true,
          updatedText: applySelectiveChanges(currentText, changes),
          changes
        };
      } else {
        console.log('ℹ️ Nenhuma mudança detectada no texto');
        return { hasChanges: false, updatedText: currentText };
      }
      
    } catch (error) {
      console.error('❌ Erro ao aplicar mudanças do canvas:', error);
      return { hasChanges: false, updatedText: currentText };
    }
  }, [textMapping]);
  
  // Função para detectar mudanças específicas entre textos
  const detectTextChanges = useCallback((oldText, newText, sequences) => {
    const changes = {
      hasChanges: false,
      additions: [],
      removals: [],
      modifications: [],
      summary: ''
    };
    
    try {
      // Validação e conversão segura dos textos
      const safeOldText = String(oldText || '').trim();
      const safeNewText = String(newText || '').trim();
      
      // Se ambos os textos estão vazios, não há mudanças
      if (!safeOldText && !safeNewText) {
        console.log('ℹ️ Ambos os textos estão vazios, nenhuma mudança detectada');
        return changes;
      }
      
      // Se apenas um dos textos está vazio, tudo é considerado mudança
      if (!safeOldText && safeNewText) {
        console.log('ℹ️ Texto antigo vazio, novo texto presente - considerando tudo como adição');
        changes.additions = safeNewText.split('\n').filter(line => line.trim()).map((line, index) => ({
          line,
          index,
          type: 'addition',
          context: { before: [], after: [], section: null }
        }));
        changes.hasChanges = true;
        changes.summary = `+${changes.additions.length}`;
        return changes;
      }
      
      if (safeOldText && !safeNewText) {
        console.log('ℹ️ Texto antigo presente, novo texto vazio - considerando tudo como remoção');
        changes.removals = safeOldText.split('\n').filter(line => line.trim()).map((line, index) => ({
          line,
          index,
          type: 'removal',
          context: { before: [], after: [], section: null }
        }));
        changes.hasChanges = true;
        changes.summary = `-${changes.removals.length}`;
        return changes;
      }
      
      // Dividir textos em linhas para comparação
      const oldLines = safeOldText.split('\n').filter(line => line.trim());
      const newLines = safeNewText.split('\n').filter(line => line.trim());
      
      // Detectar adições (novas linhas)
      newLines.forEach((line, index) => {
        // Verificar se a linha é realmente nova (não apenas reordenada)
        const isNewLine = !oldLines.some(oldLine => {
          // Comparação inteligente: ignorar espaços extras e diferenças menores
          const normalizedOld = oldLine.trim().toLowerCase();
          const normalizedNew = line.trim().toLowerCase();
          
          // Se for uma linha muito similar, considerar como existente
          if (normalizedOld === normalizedNew) return true;
          
          // Se uma linha contém a outra (com tolerância), considerar como existente
          if (normalizedOld.includes(normalizedNew) || normalizedNew.includes(normalizedOld)) {
            // Mas verificar se não é apenas uma parte muito pequena
            const minLength = Math.min(normalizedOld.length, normalizedNew.length);
            const maxLength = Math.max(normalizedOld.length, normalizedNew.length);
            const similarityRatio = minLength / maxLength;
            
            // Se a similaridade for muito alta (>90%), considerar como existente
            return similarityRatio > 0.9;
          }
          
          // VERIFICAÇÃO CRÍTICA: Se a linha contém marcadores de referência similares
          const oldMarkers = oldLine.match(/\[(\d+)\]/g) || [];
          const newMarkers = line.match(/\[(\d+)\]/g) || [];
          
          if (oldMarkers.length > 0 && newMarkers.length > 0) {
            // Se ambas têm marcadores, verificar se são similares
            const oldMarkerSet = new Set(oldMarkers);
            const newMarkerSet = new Set(newMarkers);
            const commonMarkers = [...oldMarkerSet].filter(m => newMarkerSet.has(m));
            
            if (commonMarkers.length > 0) {
              console.log('🔍 Marcadores similares detectados:', commonMarkers);
              return true; // Considerar como existente
            }
          }
          
          return false;
        });
        
        if (isNewLine) {
          changes.additions.push({
            line,
            index,
            type: 'addition',
            context: getLineContext(line, newLines, index)
          });
        }
      });
      
      // Detectar remoções (linhas que não existem mais)
      oldLines.forEach((line, index) => {
        const isRemovedLine = !newLines.some(newLine => {
          const normalizedOld = line.trim().toLowerCase();
          const normalizedNew = newLine.trim().toLowerCase();
          
          // Se for uma linha muito similar, considerar como existente
          if (normalizedOld === normalizedNew) return true;
          
          // Se uma linha contém a outra (com tolerância), considerar como existente
          if (normalizedOld.includes(normalizedNew) || normalizedNew.includes(normalizedOld)) {
            // Mas verificar se não é apenas uma parte muito pequena
            const minLength = Math.min(normalizedOld.length, normalizedNew.length);
            const maxLength = Math.max(normalizedOld.length, normalizedNew.length);
            const similarityRatio = minLength / maxLength;
            
            // Se a similaridade for muito alta (>90%), considerar como existente
            return similarityRatio > 0.9;
          }
          
          return false;
        });
        
        if (isRemovedLine) {
          changes.removals.push({
            line,
            index,
            type: 'removal',
            context: getLineContext(line, oldLines, index)
          });
        }
      });
      
      // Detectar modificações (linhas com conteúdo similar mas diferente)
      if (sequences && sequences.length > 0) {
        sequences.forEach(({ segment, sequence }) => {
          sequence.slice(1).forEach(node => {
            if (node.type === 'itemNode') {
              const oldLine = oldLines.find(line => 
                line.includes(node.data.title) || line.includes(node.data.phrase)
              );
              const newLine = newLines.find(line => 
                line.includes(node.data.title) || line.includes(node.data.phrase)
              );
              
              if (oldLine && newLine && oldLine !== newLine) {
                changes.modifications.push({
                  oldLine,
                  newLine,
                  nodeTitle: node.data.title,
                  type: 'modification'
                });
              }
            }
          });
        });
      }
      
      // Resumo das mudanças
      changes.hasChanges = changes.additions.length > 0 || 
                          changes.removals.length > 0 || 
                          changes.modifications.length > 0;
      
      if (changes.hasChanges) {
        changes.summary = `+${changes.additions.length} -${changes.removals.length} ~${changes.modifications.length}`;
        
        console.log('🔍 Resumo das mudanças detectadas:');
        console.log('  ➕ Adições:', changes.additions.length);
        console.log('  🗑️ Remoções:', changes.removals.length);
        console.log('  ✏️ Modificações:', changes.modifications.length);
        

      }
      
    } catch (error) {
      console.error('❌ Erro ao detectar mudanças:', error);
    }
    
    return changes;
  }, []);
  
  // Função auxiliar para obter contexto de uma linha
  const getLineContext = useCallback((line, allLines, lineIndex) => {
    try {
      const context = {
        before: [],
        after: [],
        section: null
      };
      
      // Obter linhas antes e depois
      if (lineIndex > 0) {
        context.before = allLines.slice(Math.max(0, lineIndex - 2), lineIndex);
      }
      if (lineIndex < allLines.length - 1) {
        context.after = allLines.slice(lineIndex + 1, Math.min(allLines.length, lineIndex + 3));
      }
      
      // Identificar seção (header mais próximo)
      for (let i = lineIndex; i >= 0; i--) {
        if (allLines[i].startsWith('#')) {
          context.section = allLines[i];
          break;
        }
      }
      
      return context;
    } catch (error) {
      return { before: [], after: [], section: null };
    }
  }, []);
  
  // Função para aplicar mudanças seletivas no texto
  const applySelectiveChanges = useCallback((currentText, changes) => {
    try {
      // Validação e conversão segura do texto atual
      const safeCurrentText = String(currentText || '').trim();
      if (!safeCurrentText) {
        console.log('⚠️ Texto atual vazio, retornando texto vazio');
        return '';
      }
      
      let updatedText = safeCurrentText;
      const lines = updatedText.split('\n');
      
      console.log('🔍 Aplicando mudanças seletivas:', {
        totalLines: lines.length,
        additions: changes.additions.length,
        removals: changes.removals.length,
        modifications: changes.modifications.length
      });
      
      // ESTRATÉGIA SIMPLES: Inserir apenas a frase nova na posição correta
      if (changes.additions.length > 0) {
        console.log('🎯 Modo: Inserir frase nova na posição correta');
        
        // 1. Preservar texto original
        const originalLines = lines.filter(line => line.trim());
        
        // 2. Para cada adição, encontrar a posição correta baseada na conexão do canvas
        changes.additions.forEach(addition => {
          // Encontrar o node que foi adicionado (baseado na frase)
          const newNode = nodes.find(node => 
            node.data?.phrase === addition.line || 
            node.data?.title === addition.line
          );
          
          if (newNode) {
            // Encontrar posição de inserção baseada na conexão
            const insertInfo = findInsertPositionFromCanvasConnection(newNode, nodes, edges);
            
            if (insertInfo && insertInfo.searchText) {
              // Encontrar a linha no editor que contém o texto de busca
              const targetLineIndex = originalLines.findIndex(line => 
                line.toLowerCase().includes(insertInfo.searchText.toLowerCase())
              );
              
              if (targetLineIndex !== -1) {
                // Inserir a nova frase após a linha encontrada
                const insertIndex = targetLineIndex + 1;
                originalLines.splice(insertIndex, 0, addition.line);
                console.log('✅ Frase inserida na posição correta:', insertIndex);
              } else {
                // Se não encontrar, inserir no final
                originalLines.push(addition.line);
                console.log('⚠️ Posição não encontrada, inserindo no final');
              }
            } else {
              // Se não conseguir determinar posição, inserir no final
              originalLines.push(addition.line);
              console.log('⚠️ Posição não determinada, inserindo no final');
            }
          }
        });
        
        const result = originalLines.join('\n');
        console.log('✅ Frase nova inserida na posição correta');
        return result;
        
      } else {
        // Se não há adições, aplicar remoções e modificações normalmente
        console.log('🔧 Modo: Aplicar remoções e modificações apenas');
        
        // Aplicar remoções primeiro (para não interferir nos índices)
        changes.removals.forEach(({ line, context }) => {
          const lineIndex = findBestMatchLine(lines, line, context);
          if (lineIndex !== -1) {
            console.log(`🗑️ Removendo linha ${lineIndex}: "${line.trim()}"`);
            lines.splice(lineIndex, 1);
          }
        });
        
        // Aplicar modificações
        changes.modifications.forEach(({ oldLine, newLine }) => {
          const lineIndex = lines.findIndex(l => l.includes(oldLine.trim()));
          if (lineIndex !== -1) {
            console.log(`✏️ Modificando linha ${lineIndex}: "${oldLine.trim()}" → "${newLine.trim()}"`);
            lines[lineIndex] = newLine;
          }
        });
        
        updatedText = lines.join('\n');
        console.log('✅ Mudanças seletivas aplicadas com sucesso (modo modificação)');
        return updatedText;
      }
      
    } catch (error) {
      console.error('❌ Erro ao aplicar mudanças seletivas:', error);
      return currentText;
    }
  }, []);
  
  // Função para encontrar a melhor linha para remoção
  const findBestMatchLine = useCallback((lines, targetLine, context) => {
    try {
      // Buscar por correspondência exata primeiro
      let lineIndex = lines.findIndex(l => l.trim() === targetLine.trim());
      if (lineIndex !== -1) return lineIndex;
      
      // Buscar por correspondência parcial
      lineIndex = lines.findIndex(l => l.includes(targetLine.trim()));
      if (lineIndex !== -1) return lineIndex;
      
      // Buscar por contexto (linhas próximas)
      if (context && context.before.length > 0) {
        for (let i = 0; i < lines.length; i++) {
          const beforeLines = lines.slice(Math.max(0, i - 2), i);
          const hasContext = context.before.some(ctxLine => 
            beforeLines.some(line => line.includes(ctxLine.trim()))
          );
          if (hasContext) return i;
        }
      }
      
      return -1;
    } catch (error) {
      return -1;
    }
  }, []);
  
  // Função para encontrar a posição de inserção baseada na conexão do canvas
  const findInsertPositionFromCanvasConnection = useCallback((newNode, nodes, edges) => {
    try {
      if (!newNode || !edges || edges.length === 0) return 0;
      
      // Encontrar a conexão que envolve o novo node
      const connection = edges.find(edge => 
        edge.source === newNode.id || edge.target === newNode.id
      );
      
      if (!connection) return 0;
      
      // Determinar se é source ou target
      const isSource = connection.source === newNode.id;
      const connectedNodeId = isSource ? connection.target : connection.source;
      
      // Encontrar o node conectado
      const connectedNode = nodes.find(n => n.id === connectedNodeId);
      if (!connectedNode) return 0;
      
      // Buscar a posição no editor baseada no título/frase do node conectado
      const searchText = connectedNode.data?.title || connectedNode.data?.phrase || '';
      if (!searchText) return 0;
      
      console.log('🔍 Procurando posição para inserir após:', searchText);
      
      // Retornar a posição para inserção (será usada pelo TipTap)
      return { searchText, position: 'after' };
      
    } catch (error) {
      console.warn('⚠️ Erro ao encontrar posição de inserção:', error);
      return 0;
    }
  }, []);
  

  
  // Função para encontrar a melhor posição de inserção
  const findBestInsertPosition = useCallback((lines, newLine, context) => {
    try {
      // Se for um header de seção, inserir antes da próxima seção
      if (newLine.startsWith('#')) {
        const sectionTitle = newLine.replace(/^#+\s*/, '').trim();
        
        // Buscar seção similar para inserir próxima
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('#')) {
            const currentSection = lines[i].replace(/^#+\s*/, '').trim();
            if (currentSection.toLowerCase().includes(sectionTitle.toLowerCase()) ||
                sectionTitle.toLowerCase().includes(currentSection.toLowerCase())) {
              return i + 1; // Inserir após a seção atual
            }
          }
        }
        
        // Se não encontrar seção similar, inserir no final
        return lines.length;
      }
      
      // Se for uma frase/citação, inserir na seção apropriada
      if (context && context.section) {
        const sectionHeader = context.section;
        const sectionIndex = lines.findIndex(l => l.includes(sectionHeader));
        if (sectionIndex !== -1) {
          // Encontrar o final da seção (próximo header ou fim do texto)
          let endIndex = lines.length;
          for (let i = sectionIndex + 1; i < lines.length; i++) {
            if (lines[i].startsWith('#')) {
              endIndex = i;
              break;
            }
          }
          return endIndex;
        }
      }
      
      // Padrão: inserir no final
      return lines.length;
      
    } catch (error) {
      return lines.length;
    }
  }, []);
  
  // Effect para aplicar mudanças seletivas quando canvas mudar
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {

      // Obter texto atual do editor ou do estado
      let currentText = '';
      
      try {
        // Tentar obter do editor primeiro
        if (editorRef.current?.getMarkdown) {
          // Como getMarkdown é async, vamos usar o fallback direto por enquanto
          currentText = canvasDerivedContent || newsData?.final_text || '';
        } else {
          currentText = canvasDerivedContent || newsData?.final_text || '';
        }
        
        // Fallback para estados se o editor não retornar nada
        if (!currentText) {
          currentText = canvasDerivedContent || newsData?.final_text || '';
        }
      } catch (error) {
        console.warn('⚠️ Erro ao obter texto do editor, usando fallback:', error);
        currentText = canvasDerivedContent || newsData?.final_text || '';
      }
      
      // VERIFICAÇÃO CRÍTICA: É a primeira vez que o canvas carrega?
      const isInitialLoad = !canvasDerivedContent && nodes.length > 0 && edges.length > 0;
      
      if (isInitialLoad) {
        console.log('🚀 CARREGAMENTO INICIAL DETECTADO - Configurando estado base');
        
        // 1. Gerar texto baseado nas conexões existentes
        const sequencesBySegment = getOrderedSequenceFromConnections(nodes, edges);
        if (sequencesBySegment.length > 0) {
          const { finalText: baseText, newMapping } = reconstructFinalText(sequencesBySegment, textMapping);
          
          // 2. Configurar estado base sem marcar como "mudança"
          setCanvasDerivedContent(baseText);
          setTextMapping(newMapping);
          setReferenceMapping(newMapping);
          setIsDynamicMode(true);
          
          console.log('✅ Estado base configurado com', sequencesBySegment.length, 'sequências');
          
          // 3. Atualizar editor com o texto base
          if (editorRef.current?.replaceContent) {
            editorRef.current.replaceContent(baseText);
            console.log('✅ Editor atualizado com estado base do canvas');
          }
          
          return; // Sair sem processar como "mudança"
        }
      }
      
      // Aplicar mudanças seletivas apenas se não for carregamento inicial
      const result = applyCanvasChangesToText(nodes, edges, currentText);
      
      if (result.isInitialSetup) {
        console.log('🚀 Configuração inicial detectada - configurando estado base');
        setCanvasDerivedContent(result.updatedText);
        setIsDynamicMode(true);
        
        // Atualizar editor com o texto base
        if (editorRef.current?.replaceContent) {
          editorRef.current.replaceContent(result.updatedText);
        }
      } else if (result.hasChanges) {
        console.log('🔄 Aplicando mudanças seletivas:', result.changes.summary);
        
        // Atualizar estado com texto modificado
        setCanvasDerivedContent(result.updatedText);
        setIsDynamicMode(true);
        
        // Atualizar editor se disponível
        if (editorRef.current) {
          try {
            if (editorRef.current.replaceContent) {
              editorRef.current.replaceContent(result.updatedText);
            }
          } catch (error) {
            console.error('❌ Erro ao atualizar editor com mudanças seletivas:', error);
          }
        }
      }
    }
  }, [nodes, edges, applyCanvasChangesToText, canvasDerivedContent, newsData?.final_text, textMapping]);

  // FUNÇÃO HELPER PARA EXTRAIR TEXTO PLANO DE UM BLOCO - VERSÃO MELHORADA
  const extractBlockTextFlat = useCallback((block) => {
    try {
      if (!block || !block.content) return '';
      
      if (Array.isArray(block.content)) {
        let fullText = '';
        
        // Percorrer cada elemento inline e construir o texto completo
        // PRESERVANDO a estrutura interna para mapeamento correto
        for (const item of block.content) {
          if (typeof item === 'string') {
            fullText += item;
          } else if (item && typeof item === 'object') {
            if (item.text) {
              fullText += item.text;
            } else if (item.content) {
              // Se o item tem conteúdo aninhado, extrair recursivamente
              if (Array.isArray(item.content)) {
                const nestedText = item.content
                  .map(nestedItem => {
                    if (typeof nestedItem === 'string') return nestedItem;
                    if (nestedItem && nestedItem.text) return nestedItem.text;
                    return '';
                  })
                  .join('');
                fullText += nestedText;
              } else if (typeof item.content === 'string') {
                fullText += item.content;
              }
            }
          }
        }
        
        return fullText;
      }
      
      if (typeof block.content === 'string') {
        return block.content;
      }
      
      if (block.content && block.content.text) {
        return block.content.text;
      }
      
      return '';
    } catch (error) {
      console.error('❌ Erro ao extrair texto do bloco:', error);
      return '';
    }
  }, []);

  // Remove um heading inicial (ex.: "## Título\n") do texto
  const stripLeadingHeadingLines = (s = "") =>
    s.replace(/^\s*#{1,6}\s+.*(\r?\n)+/g, '').trim();

  // --- utils de sentença / cluster ---

  // separador decimal (35.7 / 3,5)
  const isDecimalSepAt = (s, i) => {
    const c = s[i];
    if (c !== '.' && c !== ',') return false;
    const prev = s[i - 1], next = s[i + 1];
    return /\d/.test(prev || '') && /\d/.test(next || '');
  };

  // procura o delimitador REAL de sentença para trás (., !, ?, …, \n)
  // ignora decimais; NÃO considera ':' nem ';'
  const findPrevSentenceDelimiter = (s, from) => {
    for (let k = from; k >= 0; k--) {
      if (isDecimalSepAt(s, k)) continue;
      const ch = s[k];
      if (ch === '.' || ch === '!' || ch === '?' || ch === '…' || ch === '\n') return k;
    }
    return -1;
  };

  // acha o primeiro [n] do cluster que termina em 'idx' (ex.: "... [5] [6]" com idx em "[6]" → posição de "[5]")
  const findFirstMarkerInCluster = (text, idx) => {
    const left = text.slice(0, idx);
    const m = left.match(/(\s*\[\d+\]\s*)+$/);
    if (!m) return idx; // sem cluster à esquerda
    const tail = m[0]; // " [5] " ou " [5] [6] "
    const firstBracketOffset = tail.search(/\[/);
    return left.length - tail.length + (firstBracketOffset >= 0 ? firstBracketOffset : 0);
  };

  // pula prefixos inocentes no começo da sentença (espaços / aspas / parênteses)
  const skipSentencePrefix = (text, start, hardEnd) => {
    let i = start;
    while (i < hardEnd && /\s/.test(text[i])) i++;
    while (i < hardEnd && /[""'\(]/.test(text[i])) i++;
    return i;
  };

  // range [start, end) da sentença "alvo do cluster" cujo primeiro marcador começa em clusterStartIdx
  const getSentenceRangeByClusterStart = (text, clusterStartIdx) => {
    // andar para trás a partir do caractere antes do cluster,
    // pulando espaços/fechamentos e a pontuação final da frase atual (., !, ?, …)
    let j = clusterStartIdx - 1;
    while (j >= 0 && /\s/.test(text[j])) j--;
    while (j >= 0 && /['"")')\]]/.test(text[j])) j--;
    while (j >= 0 && (text[j] === '.' || text[j] === '!' || text[j] === '?' || text[j] === '…')) j--;

    // agora sim: procurar o delimitador da sentença ANTERIOR
    const prevDelim = findPrevSentenceDelimiter(text, j);
    let start = (prevDelim >= 0) ? prevDelim + 1 : 0;
    start = skipSentencePrefix(text, start, clusterStartIdx);

    const end = clusterStartIdx; // fim comum do cluster
    return [start, end];
  };

  // API principal: dado idx do "[n]" atual, devolve [start, end) unificado do cluster
  const getSentenceRangeForMarker = (text, idx) => {
    const clusterStartIdx = findFirstMarkerInCluster(text, idx);
    return getSentenceRangeByClusterStart(text, clusterStartIdx);
  };

  // Encontra o bloco alvo para um determinado marcador [n]:
  // - Procura o bloco que contém o marcador
  // - Retorna o bloco-parágrafo imediatamente anterior (não-vazio)
  const findBlockForMarker = useCallback((editor, marker) => {
    const blocks = editor.topLevelBlocks || [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const text = extractBlockTextFlat(block);
      if (!text) continue;

      const idx = text.indexOf(marker);
      if (idx !== -1) {
        // subir para o parágrafo anterior não vazio, ignorando headings
        let j = i - 1;
        while (j >= 0) {
          const prev = blocks[j];
          const prevText = extractBlockTextFlat(prev).trim();
          if (prevText && prev.type !== 'heading') {
            return { block: prev, start: 0, end: prevText.length };
          }
          j--;
        }
        // fallback: dentro do próprio bloco, destacar o texto antes do marcador
        if (idx > 0) {
          return { block, start: 0, end: idx };
        }
        return null;
      }
    }
    return null;
  }, [extractBlockTextFlat]);

  // Retorna { block, start, end } para o título -> [n], destacando somente a sentença antes do [n]
  const getMarkerSentenceRange = useCallback((editor, title) => {
    if (!title || !referenceMapping?.size) return null;
    const marker = referenceMapping.get(String(title).trim()); // ex.: "[1]"
    if (!marker) return null;

    const blocks = editor.topLevelBlocks || [];
    for (const block of blocks) {
      // flatten seguro do bloco (usa sua extractBlockTextFlat)
      const flat = extractBlockTextFlat(block) || '';
      const idx = flat.indexOf(marker);
      if (idx === -1) continue;

      // flat = texto flatten do bloco; idx = posição do "[n]" atual
      const [start, end] = getSentenceRangeForMarker(flat, idx);

      return { block, start, end };
    }
    return null;
  }, [referenceMapping, extractBlockTextFlat, getSentenceRangeForMarker]);

  // NOVA FUNÇÃO para grifar texto específico no BlockNote - VERSÃO DEFINITIVA
  const highlightSpecificText = useCallback(async (editor, textToHighlight, shouldHighlight) => {
    if (!editor || !textToHighlight) return false;
    if (!editorRef.current || !editorRef.current.highlightText) { console.error("❌ EditorRef ou método highlightText não disponível"); return false; }

    const blocks = editor.topLevelBlocks;
    const cleanNeedle = cleanText(String(textToHighlight)).toLowerCase();
    if (!cleanNeedle) return false;

    for (const block of blocks) {
      const blockText = extractBlockTextFlat(block);
      if (!blockText) continue;
      const cleanBlockText = cleanText(blockText);
      const cleanBlockLower = cleanBlockText.toLowerCase();

      let matchIndex = -1;
      matchIndex = cleanBlockLower.indexOf(cleanNeedle);

      if (matchIndex === -1) {
        const flexibleSearchText = cleanNeedle.replace(/\s+/g, ' ').trim();
        const flexibleCleanBlock = cleanBlockLower.replace(/\s+/g, ' ').trim();
        matchIndex = flexibleCleanBlock.indexOf(flexibleSearchText);
      }

      if (matchIndex !== -1) {
        try {
          console.log(`✅ Texto encontrado no bloco ${block.id} na posição ${matchIndex} (versão limpa)`);
          const startOffset = mapCleanToOriginalIndex(blockText, matchIndex);
          const endOffset   = mapCleanToOriginalIndex(blockText, matchIndex + cleanNeedle.length);
          console.log(`🔍 Posições mapeadas: start=${startOffset}, end=${endOffset}`);
          const success = editorRef.current.highlightText(block.id, startOffset, endOffset, shouldHighlight);
          if (success) return true;
        } catch (error) {
          console.error("Erro ao aplicar highlight:", error);
          return false;
        }
      }
    }
    console.log('❌ Texto não encontrado em nenhum bloco');
    return false;
  }, [extractBlockTextFlat]);

  // FUNÇÃO PRINCIPAL CORRIGIDA - Grifo por marcadores
  const handleHighlightText = useCallback(async (title, phrase, action) => {
    const editor = editorRef.current?.editor;
    if (!editor || !editorRef.current?.highlightText) return;

    // 1) Caminho novo: título -> [n] -> bloco -> sentença anterior
    const target = getMarkerSentenceRange(editor, title);
    if (target) {
      const { block, start, end } = target;
      editorRef.current.highlightText(block.id, start, end, action === 'enter');
      return;
    }

    // 2) Fallback antigo (mantém se quiser cobrir casos sem marcador)
    try {
      const finalText = newsData?.final_text;
      if (!finalText || typeof finalText !== 'string') return;

      const markerPattern = `///<${title}>///`;
      const markerIndex = finalText.indexOf(markerPattern);
      if (markerIndex === -1) return;

      // ... seu cálculo antigo de textStart/textToHighlight ...
      // await highlightSpecificText(editor, cleanTextToHighlight, action === 'enter');
    } catch (err) {
      console.error('❌ Erro no grifo por marcadores:', err);
    }
  }, [newsData, getMarkerSentenceRange]);

  // FUNÇÃO DE TESTE específica para marcadores
  const testMarkerHighlight = useCallback(() => {
    console.log('🧪 === TESTE DE GRIFO POR MARCADORES ===');
    
    // Simular hover com um título real do exemplo
    const testTitle = "Lançamento do Tênis Cloudzone Moon";
    
    console.log(`🧪 Testando grifo para título: "${testTitle}"`);
    
    handleHighlightText(testTitle, "", "enter");
    
    // Remover após 3 segundos
    setTimeout(() => {
      console.log(`🧪 Removendo grifo de teste...`);
      handleHighlightText(testTitle, "", "leave");
    }, 3000);
    
    console.log('🧪 === FIM TESTE MARCADORES ===');
  }, [handleHighlightText]);

  // FUNÇÃO DE DEBUG PARA SELEÇÃO
  const debugTextSelection = useCallback(() => {
    if (!editorRef.current || !editorRef.current.editor) {
      console.log('❌ Editor não disponível para debug');
      return;
    }
    
    const editor = editorRef.current.editor;
    
    console.log('🔍 === DEBUG TEXT SELECTION ===');
    
    // Verificar métodos de seleção
    console.log('🎯 Métodos de seleção disponíveis:');
    console.log('- setTextCursor:', typeof editorRef.current.setTextCursor, editorRef.current.setTextCursor ? '✅' : '❌');
    console.log('- setSelection:', typeof editorRef.current.setSelection, editorRef.current.setSelection ? '✅' : '❌');
    console.log('- getSelection:', typeof editor.getSelection, editor.getSelection ? '✅' : '❌');
    
    // Verificar métodos de estilo
    console.log('🎨 Métodos de estilo disponíveis:');
    console.log('- addStyles:', typeof editorRef.current.addStyles, editorRef.current.addStyles ? '✅' : '❌');
    console.log('- removeStyles:', typeof editorRef.current.removeStyles, editorRef.current.removeStyles ? '✅' : '❌');
    console.log('- toggleStyles:', typeof editorRef.current.toggleStyles, editorRef.current.toggleStyles ? '✅' : '❌');
    
    // Verificar blocos
    console.log('📄 Blocos disponíveis:');
    const blocks = editor.topLevelBlocks || [];
    console.log(`- Total de blocos: ${blocks.length}`);
    
    if (blocks.length > 0) {
      const firstBlock = blocks[0];
      const blockText = extractBlockTextFlat(firstBlock);
      console.log(`- Primeiro bloco ID: ${firstBlock.id}`);
      console.log(`- Primeiro bloco texto: "${blockText.substring(0, 100)}..."`);
      console.log(`- Primeiro bloco length: ${blockText.length}`);
    }
    
    // Verificar final_text e marcadores
    console.log('🗺️ Verificação de marcadores:');
    const finalText = newsData?.final_text;
    if (finalText) {
      console.log(`- final_text length: ${finalText.length}`);
      const markers = finalText.match(/\/\/\/<[^>]+>\/\/\//g);
      console.log(`- Marcadores encontrados: ${markers ? markers.length : 0}`);
      if (markers && markers.length > 0) {
        console.log(`- Primeiro marcador: ${markers[0]}`);
      }
    }
    
    console.log('🔍 === FIM DEBUG ===');
  }, [newsData, extractBlockTextFlat]);

  // FUNÇÃO DE TESTE SIMPLES
  const testSimpleHighlight = useCallback(async () => {
    console.log('🧪 === TESTE SIMPLES DE HIGHLIGHT ===');
    
    if (!editorRef.current || !editorRef.current.editor) {
      console.log('❌ Editor não disponível');
      return;
    }
    
    // Usar método de teste do editor
    if (editorRef.current.testTextSelection) {
      await editorRef.current.testTextSelection("texto");
    } else {
      console.log('❌ testTextSelection não disponível');
    }
    
    console.log('🧪 === FIM TESTE ===');
  }, []);

  // Chips com o mesmo visual do MonitorNode (azul para dados, laranja para estrutura)
  const SidebarChip = useCallback(({ node }) => {
    const role = node?.data?.nodeType || node?.data?.coreKey || node?.type;
    const isStructure = (
      role === 'estrutura' ||
      node?.data?.nodeType === 'estrutura' ||
      node?.data?.coreKey === 'micro_estrutura' ||
      node?.data?.isStructureNode === true
    );
    const getStructureLabel = (value) => ({
      continua: 'Continua',
      paragrafos: 'Paragrafos',
      topicos: 'Topicos'
    }[(String(value || '')).toLowerCase()] || 'Estrutura');
    const label = isStructure
      ? getStructureLabel(node?.data?.structureType)
      : (node?.data?.title || node?.data?.label || node?.data?.name || node?.type || 'Item');
    const Icon = isStructure
      ? LayersIcon
      : ((typeof role === 'string' && role.toLowerCase().includes('micro')) ? QuoteIcon : BracesIcon);
    const isMicro = !isStructure && typeof role === 'string' && role.toLowerCase().includes('micro');
    const chipBorderColor = isStructure ? '#F5A623' : isMicro ? '#4A90E2' : 'var(--border-primary)';
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-4 max-w-full"
        style={{ borderColor: chipBorderColor, color: 'var(--text-secondary)' }}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    );
  }, []);

  // Como agora sempre priorizamos final_text, não precisamos mais mapear filhos dos nodes
  const sectionChildren = useMemo(() => {
    return { summary: [], body: [], conclusion: [] };
  }, []);

  // Como não temos mais filhos dos nodes, retornar arrays vazios
  const sortedSectionChildren = useMemo(() => {
    return {
      summary: [],
      body: [],
      conclusion: []
    };
  }, []);

  // Função CORRIGIDA para processar o texto mantendo mapeamento das referências
  const processFinalText = useCallback((text) => {
    if (!text || typeof text !== 'string') return { processedText: text, mapping: new Map() };
    
    // Regex para encontrar trechos ///<texto>///
    const regex = /\/\/\/<([^>]+)>\/\/\//g;
    let processedText = text;
    let referenceNumber = 1;
    const mapping = new Map();
    
    // Substituir cada trecho marcado por um marcador visual simples E guardar o mapeamento
    processedText = processedText.replace(regex, (fullMatch, content) => {
      const marker = `[${referenceNumber}]`;
      
      // IMPORTANTE: Guardar o mapeamento entre o marcador e o conteúdo original
      mapping.set(marker, content.trim());
      mapping.set(content.trim(), marker); // Mapeamento bidirecional
      
      console.log(`📍 Mapeamento criado: ${marker} <-> "${content.trim()}"`);
      
      referenceNumber++;
      return marker;
    });
    
    console.log(`🗺️ Mapeamento total criado com ${mapping.size / 2} referências`);
    
    return { processedText, mapping };
  }, []);
  
  // Handler para atualizações de sequência de texto
  const handleTextSequenceUpdate = useCallback((newText) => {
    console.log('🔄 Atualização de sequência de texto recebida:', newText ? newText.length : 0, 'caracteres');
    setDynamicText(newText);
    
    // Obter texto atual para comparação
    let currentText = '';
    
          try {
        // Tentar obter do editor primeiro
        if (editorRef.current?.getMarkdown) {
          // Como getMarkdown é async, vamos usar o fallback direto por enquanto
          currentText = canvasDerivedContent || newsData?.final_text || '';
        } else {
          currentText = canvasDerivedContent || newsData?.final_text || '';
        }
        
        // Fallback para estados se o editor não retornar nada
        if (!currentText) {
          currentText = canvasDerivedContent || newsData?.final_text || '';
        }
      } catch (error) {
        console.warn('⚠️ Erro ao obter texto do editor para comparação, usando fallback:', error);
        currentText = canvasDerivedContent || newsData?.final_text || '';
      }
    
    // Detectar mudanças específicas
    const changes = detectTextChanges(currentText, newText, []);
    
    if (changes.hasChanges) {
      console.log('🔄 Mudanças detectadas na sequência:', changes.summary);
      
      // Aplicar mudanças seletivas
      const updatedText = applySelectiveChanges(currentText, changes);
      setCanvasDerivedContent(updatedText);
      
      // Atualizar editor se disponível
      if (editorRef.current) {
        try {
          if (editorRef.current.replaceContent) {
            editorRef.current.replaceContent(updatedText);
            console.log('✅ Editor atualizado com mudanças seletivas da sequência');
          } else if (editorRef.current.updateContentFromSequence) {
            editorRef.current.updateContentFromSequence(updatedText, textMapping);
            console.log('✅ Editor atualizado via sequência com mudanças seletivas');
          } else {
            console.log('ℹ️ Editor atualizado via estado (canvasDerivedContent)');
          }
        } catch (error) {
          console.error('❌ Erro ao atualizar editor:', error);
        }
      }
    } else {
      console.log('ℹ️ Nenhuma mudança detectada na sequência');
      setCanvasDerivedContent(newText);
    }
    
    setIsDynamicMode(true);
  }, [textMapping, detectTextChanges, applySelectiveChanges, canvasDerivedContent, newsData?.final_text]);

  // Monta conteúdo do editor - priorizar conteúdo do canvas se disponível
  const editorContent = useMemo(() => {
    // Debug: verificar fontes de conteúdo
    console.log('🔍 NotionLikePage - newsData:', newsData);
    console.log('🔍 NotionLikePage - final_text:', newsData?.final_text);
    console.log('🔍 NotionLikePage - canvasDerivedContent:', canvasDerivedContent ? 'disponível' : 'não disponível');
    
    // 1. PRIORIDADE: Conteúdo derivado do canvas (estado atual das conexões)
    if (canvasDerivedContent) {
      console.log('✅ Usando conteúdo derivado do canvas (estado atual das conexões)');
      return canvasDerivedContent;
    }
    
    // 2. FALLBACK: final_text do banco de dados (estado inicial)
    if (newsData?.final_text && typeof newsData.final_text === 'string' && newsData.final_text.trim()) {
      console.log('✅ Usando final_text do banco de dados como estado inicial');
      const { processedText, mapping } = processFinalText(newsData.final_text.trim());
      
      // Armazenar o mapeamento no estado
      setReferenceMapping(mapping);
      setTextMapping(mapping);
      
      console.log('🔍 NotionLikePage - texto processado:', processedText);
      console.log('🔍 NotionLikePage - mapeamento criado:', mapping);
      
      return processedText;
    }
    
    // 3. FALLBACK: Mensagem informativa se nada estiver disponível
    console.log('⚠️ Nenhum conteúdo disponível - mostrando mensagem informativa');
    setReferenceMapping(new Map()); // Limpar mapeamento
    setTextMapping(new Map());
    return `# Editor Estruturado

Este editor está configurado para mostrar o conteúdo da coluna "final_text" do banco de dados.

Se você está vendo esta mensagem, significa que:
- A coluna "final_text" não está preenchida para esta notícia, ou
- Houve um problema ao carregar os dados do banco

Verifique o console para mais detalhes sobre o carregamento dos dados.

Para testar o highlighting por marcadores, clique no botão "Teste Marcador".`;
  }, [canvasDerivedContent, newsData?.final_text, processFinalText]);

  const sectionMarkdownMap = useMemo(() => {
    // SEMPRE usar final_text se disponível
    if (newsData?.final_text && typeof newsData.final_text === 'string' && newsData.final_text.trim()) {
      const { processedText } = processFinalText(newsData.final_text.trim());
      const lines = processedText.split('\n');
      const sections = { summary: '', body: '', conclusion: '' };
      let currentSection = null;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Detectar seções por diferentes formatos de heading
        if (trimmedLine === '# Introdução' || trimmedLine === '## Introdução' || trimmedLine === '### Introdução') {
          currentSection = 'summary';
        } else if (trimmedLine === '# Corpo' || trimmedLine === '## Corpo' || trimmedLine === '### Corpo') {
          currentSection = 'body';
        } else if (trimmedLine === '# Conclusão' || trimmedLine === '## Conclusão' || trimmedLine === '### Conclusão') {
          currentSection = 'conclusion';
        } else if (currentSection && trimmedLine) {
          // Adicionar linha ao conteúdo da seção atual
          sections[currentSection] += (sections[currentSection] ? '\n' : '') + line;
        }
      }
      
      // Processar cada seção
      const processedSections = {};
      Object.keys(sections).forEach(sectionKey => {
        if (sections[sectionKey]) {
          processedSections[sectionKey] = `# ${SECTION_TITLES[sectionKey]}\n${sections[sectionKey].trim()}`;
        } else {
          processedSections[sectionKey] = `# ${SECTION_TITLES[sectionKey]}`;
        }
      });
      
      return processedSections;
    }
    
    // Se não tiver final_text, retornar seções vazias
    return {
      summary: `# ${SECTION_TITLES.summary}`,
      body: `# ${SECTION_TITLES.body}`,
      conclusion: `# ${SECTION_TITLES.conclusion}`
    };
  }, [newsData?.final_text, processFinalText]);

  const displayContent = useMemo(() => {
    if (!filteredSection) return editorContent;
    return sectionMarkdownMap[filteredSection] || editorContent;
  }, [filteredSection, sectionMarkdownMap, editorContent]);

  useEffect(() => {
    setLastMarkdown(editorContent);
  }, [editorContent]);

  // Escutar eventos de hover do canvas
  useEffect(() => {
    const handleCanvasItemHover = (event) => {
      const { action, title, phrase } = event.detail;
      
      
      if (title) {
        handleHighlightText(title, phrase, action);
      }
    };

    window.addEventListener('canvas-item-hover', handleCanvasItemHover);
    
    return () => {
      window.removeEventListener('canvas-item-hover', handleCanvasItemHover);
    };
  }, [handleHighlightText]);

  const handleContentAdd = useCallback((dragData, sectionId) => {
    try {
      if (!dragData || !sectionId) return;
      
      // Como agora sempre priorizamos final_text, não vamos mais salvar nos nodes
      // Apenas logar a ação para debug
      console.log('📝 Conteúdo adicionado via drag & drop:', { sectionId, dragData });
      
      // Mostrar feedback visual
      setRecentlyAdded({ sectionId, at: Date.now() });
      setTimeout(() => setRecentlyAdded(null), 1200);
      
      // Chamar callback de link se disponível
      if (typeof onLinkDataToSection === 'function') {
        onLinkDataToSection(sectionId, dragData);
      }
    } catch {}
  }, [onLinkDataToSection]);

  const useDragAndDrop = (onAdd) => {
    const [isActive, setIsActive] = useState(false);
    const onDragEnter = useCallback((e) => {
      try {
        const types = Array.from(e?.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('application/x-lina-item')) {
          setIsActive(true);
        }
      } catch {}
    }, []);
    const onDragOver = useCallback((e) => {
      try {
        const types = Array.from(e?.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('application/x-lina-item')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setIsActive(true);
        }
      } catch {}
    }, []);
    const onDragLeave = useCallback((e) => {
      try {
        setIsActive(false);
      } catch {}
    }, []);
    const onDrop = useCallback((e, sectionId) => {
      try {
        const types = Array.from(e?.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('application/x-lina-item')) {
          e.preventDefault();
          setIsActive(false);
          let data = null;
          try {
            let json = e.dataTransfer.getData('application/json');
            if (!json) json = e.dataTransfer.getData('application/x-lina-item');
            if (!json) json = e.dataTransfer.getData('text/plain');
            if (json) data = JSON.parse(json);
          } catch {}
          if (data && data.type === 'canvas-library-item') {
            onAdd?.(data, sectionId);
            console.debug('🧰 Drop (fallback) aplicado na DropZone:', { section: sectionId, data });
          }
        }
      } catch {}
    }, [onAdd]);
    return { isActive, onDragEnter, onDragOver, onDragLeave, onDrop };
  };

  const DropZone = ({ sectionId, children, className = '' }) => {
    const dnd = useDragAndDrop((data) => handleContentAdd(data, sectionId));
    return (
      <div
        className={`drop-zone ${className}`}
        onDragEnter={dnd.onDragEnter}
        onDragOver={dnd.onDragOver}
        onDragLeave={dnd.onDragLeave}
        onDrop={(e) => dnd.onDrop(e, sectionId)}
        style={{
          position: 'relative',
          border: dnd.isActive ? '2px dashed var(--primary-green)' : '2px solid transparent',
          borderRadius: 8
        }}
      >
        {children}
      </div>
    );
  };

  const handleScrollSync = useCallback((headingText) => {
    const text = String(headingText || '').trim();
    const map = {
      [SECTION_TITLES.summary]: 'summary',
      [SECTION_TITLES.body]: 'body',
      [SECTION_TITLES.conclusion]: 'conclusion'
    };
    if (map[text] && !filteredSection) setActiveSection(map[text]);
  }, [filteredSection]);

  const handleSave = useCallback(async () => {
    if (!editorRef.current || typeof editorRef.current.getMarkdown !== 'function') return;
    const markdown = await editorRef.current.getMarkdown();
    setLastMarkdown(markdown);

    // Como agora sempre priorizamos final_text, não salvamos mais nos nodes
    console.log('💾 Conteúdo do editor salvo (apenas em memória):', markdown);
    
    // Mostrar feedback visual
    alert('Conteúdo salvo em memória. Para persistir no banco, use a coluna "final_text" da tabela "Controle Geral".');
  }, []);

  // Forçar atualização do layout quando o splitter mudar
  useEffect(() => {
    // Pequeno delay para garantir que o DOM foi atualizado
    const timer = setTimeout(() => {
      if (editorRef.current) {
        // Forçar reflow do editor
        const editorElement = document.querySelector('.notion-editor');
        if (editorElement) {
          editorElement.style.display = 'none';
          editorElement.offsetHeight; // Força reflow
          editorElement.style.display = 'flex';
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [splitRatio]);

  // Captura global de dragover/drop para permitir soltar no editor (ProseMirror intercepta eventos)
  useEffect(() => {
    const parseDragData = (dt) => {
      try {
        if (!dt) return null;
        const types = Array.from(dt.types || []);
        if (types.includes('application/json')) {
          const json = dt.getData('application/json');
          if (json) {
            try { const data = JSON.parse(json); if (data && data.type === 'canvas-library-item') return data; } catch {}
          }
        }
        if (types.includes('application/x-lina-item')) {
          const raw = dt.getData('application/x-lina-item');
          if (raw) {
            try { const data = JSON.parse(raw); if (data && data.type === 'canvas-library-item') return data; } catch {}
          }
        }
        if (types.includes('text/plain')) {
          const txt = dt.getData('text/plain');
          if (txt) {
            try { const data = JSON.parse(txt); if (data && data.type === 'canvas-library-item') return data; } catch {}
          }
        }
      } catch {}
      return null;
    };

    const onDragOverCapture = (e) => {
      try {
        const types = Array.from(e.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('application/x-lina-item') || types.includes('text/uri-list')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      } catch {}
    };

    const onDropCapture = (e) => {
      try {
        const data = parseDragData(e.dataTransfer);
        if (data) {
          e.preventDefault();
          e.stopPropagation();
          const targetSection = filteredSection || activeSection || 'summary';
          // Deduplica múltiplos drops do mesmo item em curto intervalo
          const now = Date.now();
          const isDuplicate = (
            lastDropRef.current &&
            lastDropRef.current.itemId === (data.itemId || data.id) &&
            lastDropRef.current.sectionId === targetSection &&
            (now - lastDropRef.current.at) < 800
          );
          if (isDuplicate) {
            console.debug('⏭️ Drop duplicado ignorado');
            return;
          }
          lastDropRef.current = { itemId: (data.itemId || data.id), sectionId: targetSection, at: now };
          handleContentAdd(data, targetSection);
          console.log('✅ Drop capturado com sucesso:', { section: targetSection, data });
        } else {
          const types = Array.from(e.dataTransfer?.types || []);
          console.debug('⚠️ Drop ignorado (tipos não suportados ou payload inválido):', types);
        }
      } catch {}
    };

    document.addEventListener('dragover', onDragOverCapture, true);
    document.addEventListener('drop', onDropCapture, true);
    return () => {
      document.removeEventListener('dragover', onDragOverCapture, true);
      document.removeEventListener('drop', onDropCapture, true);
    };
  }, [filteredSection, activeSection, handleContentAdd]);

  const onStartResize = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;
    const handleMouseMove = (e) => {
      const el = rightPaneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let x = e.clientX - rect.left;
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.div
          className="relative w-full h-full flex"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* MainSidebar na esquerda */}
          <MainSidebar />
          
          {/* Container principal do editor */}
          <div className="flex-1 flex flex-col">
            <style>{`
              /* Aparência do editor BlockNote dentro do container Notion-like */
              .notion-editor { min-height: 100vh; }
              .notion-editor .bn-container,
              .notion-editor .bn-editor,
              .notion-editor .ProseMirror {
                background-color: var(--bg-primary) !important;
                color: var(--text-primary) !important;
                min-height: 100vh !important;
              }
              .notion-editor .ProseMirror {
                padding: 28px 32px !important;
                line-height: 1.7 !important;
                font-family: "Nunito Sans", "Inter", sans-serif !important;
              }
              /* Oculta side menu e slash menu (substituídos por toolbar superior) */
              .notion-editor .bn-side-menu,
              .notion-editor .bn-slash-menu,
              .notion-editor .bn-floating-toolbar {
                display: none !important;
              }

              /* Splitter */
              .splitter-handle {
                background-color: #6b7280; /* gray-500 */
              }
              .splitter-handle:hover,
              .splitter-handle.active { background-color: #9ca3af; /* gray-400 */ }

              /* Estilos para highlighting por marcadores */
              ${referenceMarkerStyles}

              /* Estilos para o scroll do editor BlockNote */
              .notion-editor {
                height: 100%;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                flex: 1;
                min-height: 0;
              }
              
              .notion-editor .bn-container {
                height: 100%;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                flex: 1;
                min-height: 0;
              }
              
              .notion-editor .bn-editor {
                height: 100%;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                scrollbar-width: thin;
                scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
                flex: 1;
                min-height: 0;
                max-height: none !important;
              }
              
              .notion-editor .bn-editor::-webkit-scrollbar {
                width: 8px;
              }
              
              .notion-editor .bn-editor::-webkit-scrollbar-track {
                background: transparent;
              }
              
              .notion-editor .bn-editor::-webkit-scrollbar-thumb {
                background: rgba(156, 163, 175, 0.5);
                border-radius: 4px;
              }
              
              .notion-editor .bn-editor::-webkit-scrollbar-thumb:hover {
                background: rgba(156, 163, 175, 0.7);
              }
              
              .notion-editor .ProseMirror {
                min-height: 100%;
                padding: 28px 32px;
                line-height: 1.7;
                font-family: "Nunito Sans", "Inter", sans-serif;
              }
              
              /* Garantir que o container do editor tenha altura adequada */
              .notion-editor .bn-container .bn-editor {
                height: 100% !important;
                max-height: none !important;
              }
              
              /* Forçar scroll quando necessário */
              .notion-editor .bn-editor .ProseMirror {
                overflow: visible;
              }
              
              /* Garantir que o DropZone se comporte corretamente com flexbox */
              .drop-zone {
                display: flex;
                flex-direction: column;
                flex: 1;
                min-height: 0;
                height: 100%;
              }
              
              /* Garantir que o editor se adapte ao tamanho do container */
              .notion-editor {
                width: 100%;
                height: 100%;
                max-height: none;
                position: relative;
              }
              
              /* Garantir que o container do editor se adapte ao splitter */
              .notion-editor .bn-container {
                position: relative;
                width: 100%;
                height: 100%;
                max-height: none;
              }
              
              /* Garantir que o editor interno se adapte ao tamanho disponível */
              .notion-editor .bn-editor {
                position: relative;
                width: 100%;
                height: 100%;
                max-height: none;
                overflow-y: auto !important;
                overflow-x: hidden !important;
              }
              
              /* Sobrescrever estilos padrão do BlockNote que podem interferir no scroll */
              .notion-editor .bn-container {
                max-height: none !important;
                height: 100% !important;
              }
              
              .notion-editor .bn-editor {
                max-height: none !important;
                height: 100% !important;
                overflow-y: auto !important;
              }
              
              /* Garantir que o conteúdo interno tenha altura adequada */
              .notion-editor .bn-editor .ProseMirror {
                min-height: 100%;
                padding-bottom: 120px;
                margin-bottom: 80px;
              }
              
              /* Adicionar espaço extra após o último elemento para garantir visibilidade */
              .notion-editor .bn-editor .ProseMirror > *:last-child {
                margin-bottom: 100px !important;
              }
              
              /* Garantir que parágrafos tenham espaçamento adequado */
              .notion-editor .bn-editor .ProseMirror p {
                margin-bottom: 1.5em;
              }
              
              /* Garantir que headings tenham espaçamento adequado */
              .notion-editor .bn-editor .ProseMirror h1,
              .notion-editor .bn-editor .ProseMirror h2,
              .notion-editor .bn-editor .ProseMirror h3,
              .notion-editor .bn-editor .ProseMirror h4,
              .notion-editor .bn-editor .ProseMirror h5,
              .notion-editor .bn-editor .ProseMirror h6 {
                margin-bottom: 1em;
                margin-top: 1.5em;
              }
              
              /* Garantir que o último parágrafo tenha espaçamento extra */
              .notion-editor .bn-editor .ProseMirror p:last-child {
                margin-bottom: 120px !important;
                min-height: 120px;
              }
              
              /* Garantir que o último heading tenha espaçamento extra */
              .notion-editor .bn-editor .ProseMirror h1:last-child,
              .notion-editor .bn-editor .ProseMirror h2:last-child,
              .notion-editor .bn-editor .ProseMirror h3:last-child,
              .notion-editor .bn-editor .ProseMirror h4:last-child,
              .notion-editor .bn-editor .ProseMirror h5:last-child,
              .notion-editor .bn-editor .ProseMirror h6:last-child {
                margin-bottom: 120px !important;
                min-height: 120px;
              }
              
              /* Estilos para o scrollbar personalizado */
              .notion-editor .bn-editor::-webkit-scrollbar {
                width: 12px;
                background: transparent;
              }
              
              .notion-editor .bn-editor::-webkit-scrollbar-thumb {
                background: rgba(156, 163, 175, 0.6);
                border-radius: 6px;
                border: 2px solid transparent;
                background-clip: content-box;
              }
              
              .notion-editor .bn-editor::-webkit-scrollbar-thumb:hover {
                background: rgba(156, 163, 175, 0.8);
                background-clip: content-box;
              }

            `}</style>
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center gap-3">
                <FileText size={22} style={{ color: 'var(--primary-green)' }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>Editor com Grifo por Marcadores</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: '"Nunito Sans", "Inter", sans-serif' }}>{newsTitle || ''}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Indicador de modo dinâmico */}
                {isDynamicMode && (
                  <div className="px-3 py-1.5 rounded border flex items-center gap-2" style={{ backgroundColor: 'var(--primary-green-transparent)', borderColor: 'var(--primary-green)', color: 'var(--primary-green)' }}>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary-green)' }} />
                    <span className="text-sm font-medium">
                      {canvasDerivedContent ? 'Mudanças Seletivas' : 'Modo Dinâmico'}
                    </span>
                  </div>
                )}
                
                {/* Botão para visualizar sequência */}
                <button 
                  onClick={() => setShowSequenceVisualizer(v => !v)} 
                  className="px-3 py-1.5 rounded border flex items-center gap-2" 
                  title={showSequenceVisualizer ? 'Ocultar sequência' : 'Mostrar sequência'}
                  style={{ 
                    backgroundColor: showSequenceVisualizer ? 'var(--primary-green)' : 'var(--bg-tertiary)', 
                    borderColor: showSequenceVisualizer ? 'var(--primary-green)' : 'var(--border-primary)', 
                    color: showSequenceVisualizer ? 'white' : 'var(--text-secondary)' 
                  }}
                >
                  {showSequenceVisualizer ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span className="text-sm">Sequência</span>
                </button>
                
                <button 
                  onClick={testMarkerHighlight} 
                  className="px-3 py-1.5 rounded border" 
                  title="Teste Grifo por Marcadores"
                  style={{ backgroundColor: 'purple', borderColor: 'purple', color: 'white' }}
                >
                  <div className="flex items-center gap-2"><Target size={16} /><span className="text-sm">Teste Marcador</span></div>
                </button>
                <button 
                  onClick={testSimpleHighlight} 
                  className="px-3 py-1.5 rounded border" 
                  title="Teste Simples de Seleção"
                  style={{ backgroundColor: 'green', borderColor: 'green', color: 'white' }}
                >
                  <div className="flex items-center gap-2"><TestTube size={16} /><span className="text-sm">Teste</span></div>
                </button>
                <button 
                  onClick={debugTextSelection} 
                  className="px-3 py-1.5 rounded border" 
                  title="Debug Métodos de Seleção"
                  style={{ backgroundColor: 'blue', borderColor: 'blue', color: 'white' }}
                >
                  <div className="flex items-center gap-2"><Bug size={16} /><span className="text-sm">Debug</span></div>
                </button>
                <button onClick={handleSave} className="px-3 py-1.5 rounded border" title="Salvar" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-2"><Save size={16} /><span className="text-sm">Salvar</span></div>
                </button>
                <button onClick={onClose} className="p-2 rounded border" title="Fechar" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Corpo: dois painéis com splitter central */}
            <div className="flex-1 flex overflow-hidden" ref={containerRef}>
              {/* Editor + Splitter + Biblioteca */}
              <div className="flex-1 overflow-hidden flex" ref={rightPaneRef}>
                <div className="overflow-hidden flex flex-col" style={{ width: `${Math.round(splitRatio * 100)}%`, minWidth: EDITOR_MIN_PX, backgroundColor: '#000' }}>
                  <div className="flex-1 min-h-0 flex flex-col" style={{ height: '100%' }}>
                    <DropZone sectionId={filteredSection || activeSection} className="flex-1 min-h-0">
                      <BlockNoteEditor
                        key={`bn-${filteredSection || 'all'}-${displayContent.length}`}
                        ref={editorRef}
                        initialContent={displayContent}
                        onChange={setLastMarkdown}
                        onScroll={filteredSection ? undefined : handleScrollSync}
                        onCanvasItemDragStart={(payload) => { try { onCanvasItemDragStart?.(payload); } catch {} }}
                      />
                    </DropZone>
                  </div>
                </div>

                <div onMouseDown={onStartResize} className={`splitter-handle cursor-col-resize ${isResizing ? 'active' : ''}`} style={{ width: 4, zIndex: 10, backgroundColor: '#6b7280' }} title="Arraste para redimensionar" />

                <div className="overflow-hidden" style={{ width: `${Math.round((1 - splitRatio) * 100)}%`, minWidth: LIB_MIN_PX, backgroundColor: 'var(--bg-primary)' }}>
                  <CanvasLibraryView
                    compact
                    sidebarOnRight
                    enableSidebarToggle
                    transparentSidebar
                    newsData={newsData}
                    onTransferItem={() => {}}
                    onOpenCardModal={() => {}}
                    onDragStart={(payload) => { try { onCanvasItemDragStart?.(payload); } catch {} }}
                    onCanvasItemDragStart={() => {}}
                    onAddToNotionSection={(sectionId, payload) => handleContentAdd(payload, sectionId)}
                    onTextSequenceUpdate={handleTextSequenceUpdate}
                    onSequencesUpdate={handleSequencesUpdate}
                    editorRef={editorRef}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Visualizador de Sequência */}
          <SequenceVisualizer
            sequences={currentSequences}
            textMapping={textMapping}
            isVisible={showSequenceVisualizer}
            onToggleVisibility={() => setShowSequenceVisualizer(v => !v)}
            className="z-50"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotionLikePage;