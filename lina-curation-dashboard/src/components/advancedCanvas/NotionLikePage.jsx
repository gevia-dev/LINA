import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Save, X, Layers as LayersIcon, Quote as QuoteIcon, Braces as BracesIcon, RotateCcw } from 'lucide-react';
import CanvasLibraryView from './CanvasLibraryView';
import BlockNoteEditor from './BlockNoteEditor';
import MainSidebar from '../MainSidebar';
import { cleanText, mapCleanToOriginalIndex } from '../../utils/textHelpers';




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

  // CORREÇÃO: Estado para controlar quando o editor deve ser atualizado
  const [shouldUpdateEditor, setShouldUpdateEditor] = useState(false);

  // KISS: Estados simples para sessão
  const [sessionContent, setSessionContent] = useState(null);
  const [isSessionInitialized, setIsSessionInitialized] = useState(false);
  const [editorFrozen, setEditorFrozen] = useState(false);

  // Estado para armazenar o mapeamento entre marcadores e títulos
  const [referenceMapping, setReferenceMapping] = useState(new Map());

  // NOVO: Função para atualizar o referenceMapping (sistema de sessão)
  const updateReferenceMapping = useCallback((marker, title) => {
    try {
      setReferenceMapping(prevMapping => {
        const newMapping = new Map(prevMapping);

        // Adicionar mapeamento bidirecional
        newMapping.set(marker, title.trim());
        newMapping.set(title.trim(), marker);

        return newMapping;
      });

    } catch (error) {
      console.error('❌ Erro ao atualizar referenceMapping:', error);
    }
  }, []);

  // Função aprimorada para atualizar referenceMapping com ReindexingMap
  const updateReferenceMappingWithReindexing = useCallback((reindexingMap) => {
    try {
      console.log('🔄 Atualizando referenceMapping com ReindexingMap');
      console.log(`📊 Processando ${reindexingMap.length} mudanças de marcadores`);

      setReferenceMapping(prevMapping => {
        const newMapping = new Map(prevMapping);
        const changes = [];
        const errors = [];

        // Processar cada mudança no reindexingMap
        reindexingMap.forEach((mapping, index) => {
          const { oldMarker, newMarker, oldNumber, newNumber } = mapping;

          console.log(`🔄 [${index + 1}/${reindexingMap.length}] Processando: ${oldMarker} -> ${newMarker}`);

          try {
            // Encontrar título associado ao marcador antigo
            const associatedTitle = newMapping.get(oldMarker);

            if (associatedTitle) {
              // Remover mapeamentos antigos
              newMapping.delete(oldMarker);
              newMapping.delete(associatedTitle);

              // Adicionar novos mapeamentos bidirecionais
              newMapping.set(newMarker, associatedTitle);
              newMapping.set(associatedTitle, newMarker);

              changes.push({
                title: associatedTitle,
                oldMarker,
                newMarker,
                oldNumber,
                newNumber,
                action: 'updated'
              });

              console.log(`✅ Mapeamento atualizado: "${associatedTitle}" ${oldMarker} -> ${newMarker}`);

            } else {
              // Marcador não tem título associado - pode ser um novo marcador
              console.log(`ℹ️ Marcador ${oldMarker} não tem título associado (pode ser novo marcador)`);

              changes.push({
                title: null,
                oldMarker,
                newMarker,
                oldNumber,
                newNumber,
                action: 'no_title'
              });
            }

          } catch (mappingError) {
            console.error(`❌ Erro ao processar mapeamento ${oldMarker} -> ${newMarker}:`, mappingError);
            errors.push({
              oldMarker,
              newMarker,
              error: mappingError.message
            });
          }
        });

        // Log detalhado das mudanças
        console.log(`📊 Resumo das mudanças no referenceMapping:`);
        console.log(`  - Total processado: ${reindexingMap.length}`);
        console.log(`  - Atualizações bem-sucedidas: ${changes.filter(c => c.action === 'updated').length}`);
        console.log(`  - Marcadores sem título: ${changes.filter(c => c.action === 'no_title').length}`);
        console.log(`  - Erros: ${errors.length}`);
        console.log(`  - Tamanho final do mapping: ${newMapping.size / 2} referências`);

        // Log detalhado de cada mudança
        changes.forEach((change, index) => {
          if (change.action === 'updated') {
            console.log(`  ${index + 1}. "${change.title}" [${change.oldNumber}] -> [${change.newNumber}]`);
          } else if (change.action === 'no_title') {
            console.log(`  ${index + 1}. Marcador órfão [${change.oldNumber}] -> [${change.newNumber}]`);
          }
        });

        // Log de erros se houver
        if (errors.length > 0) {
          console.error('❌ Erros durante atualização do referenceMapping:');
          errors.forEach((error, index) => {
            console.error(`  ${index + 1}. ${error.oldMarker} -> ${error.newMarker}: ${error.error}`);
          });
        }

        return newMapping;
      });

      console.log('✅ ReferenceMapping atualizado com sucesso após reindexação');

    } catch (error) {
      console.error('❌ Erro crítico ao atualizar referenceMapping com reindexação:', error);
    }
  }, []);

  // Callback para processar notificações de reindexação
  const handleMarkerReindexing = useCallback((reindexingMap) => {
    try {
      console.log('📢 Recebida notificação de reindexação de marcadores');
      console.log(`📊 ReindexingMap recebido:`, reindexingMap);

      if (!reindexingMap || !Array.isArray(reindexingMap)) {
        console.error('❌ ReindexingMap inválido recebido:', reindexingMap);
        return;
      }

      if (reindexingMap.length === 0) {
        console.log('ℹ️ ReindexingMap vazio - nenhuma ação necessária');
        return;
      }

      console.log(`🔄 Processando reindexação de ${reindexingMap.length} marcadores`);

      // Log detalhado do que será processado
      console.log('📋 Detalhes da reindexação:');
      reindexingMap.forEach((mapping, index) => {
        const { oldMarker, newMarker, oldNumber, newNumber, isNewMarker, isExistingMarker } = mapping;
        const type = isNewMarker ? 'NOVO' : isExistingMarker ? 'EXISTENTE' : 'DESCONHECIDO';
        console.log(`  ${index + 1}. [${type}] ${oldMarker} -> ${newMarker} (${oldNumber} -> ${newNumber})`);
      });

      // Atualizar referenceMapping usando a função especializada
      updateReferenceMappingWithReindexing(reindexingMap);

      // Log de conclusão
      console.log('✅ Processamento de reindexação concluído');
      console.log('🔗 ReferenceMapping sincronizado com novos marcadores');

    } catch (error) {
      console.error('❌ Erro ao processar notificação de reindexação:', error);
      console.error('📊 ReindexingMap que causou erro:', reindexingMap);
    }
  }, [updateReferenceMappingWithReindexing]);

  const EDITOR_MIN_PX = 480;
  const LIB_MIN_PX = 360;









  // Função simplificada para extrair texto de blocos
  const extractBlockTextFlat = useCallback((block) => {
    try {
      if (!block || !block.content) return '';

      if (Array.isArray(block.content)) {
        let fullText = '';
        for (const item of block.content) {
          if (typeof item === 'string') {
            fullText += item;
          } else if (item && typeof item === 'object') {
            if (item.text) {
              fullText += item.text;
            } else if (item.content) {
              if (Array.isArray(item.content)) {
                const nestedText = item.content
                  .map(nestedItem => {
                    if (typeof nestedItem === 'string') return nestedItem;
                    if (nestedItem && typeof nestedItem === 'object' && nestedItem.text) return nestedItem.text;
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
    if (!title || !referenceMapping?.size) {
      return null;
    }

    // Normalizar título para busca
    const normalizedTitle = String(title).trim();
    let marker = referenceMapping.get(normalizedTitle);

    // Se não encontrou, tentar busca flexível
    if (!marker) {
      // Normalizar para busca (lowercase, sem acentos, etc)
      const searchTitle = normalizedTitle.toLowerCase().trim();

      for (const [key, value] of referenceMapping.entries()) {
        if (key.startsWith('[')) continue; // Pular marcadores

        const keyLower = key.toLowerCase().trim();

        // Busca bidirecional mais flexível
        if (keyLower.includes(searchTitle) || searchTitle.includes(keyLower)) {
          marker = value;
          break;
        }

        // Busca por palavras-chave principais
        const searchWords = searchTitle.split(' ').filter(w => w.length > 3);
        const keyWords = keyLower.split(' ').filter(w => w.length > 3);

        const matchingWords = searchWords.filter(sw =>
          keyWords.some(kw => kw.includes(sw) || sw.includes(kw))
        );

        if (matchingWords.length >= Math.min(2, searchWords.length)) {
          marker = value;
          break;
        }
      }
    }

    if (!marker) {
      return null;
    }

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
          const endOffset = mapCleanToOriginalIndex(blockText, matchIndex + cleanNeedle.length);
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
    if (!editor || !editorRef.current?.highlightText) {
      console.log('❌ Editor ou highlightText não disponível');
      return;
    }

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

  // FUNÇÃO DE TESTE específica para marcadores - REMOVIDA (não essencial)
  // const testMarkerHighlight = useCallback(() => { ... }, [handleHighlightText, referenceMapping]);

  // FUNÇÃO DE DEBUG PARA SELEÇÃO - REMOVIDA (não essencial)
  // const debugTextSelection = useCallback(() => { ... }, [newsData, extractBlockTextFlat]);

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

  // NOVA: Função para resetar sessão (debug)
  const resetSession = useCallback(() => {
    console.log('🔄 === RESETANDO SESSÃO ===');
    setSessionContent(null);
    setIsSessionInitialized(false);
    setEditorFrozen(false);
    setLastMarkdown('');
    setReferenceMapping(new Map());
    console.log('✅ Sessão resetada e descongelada');
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



  // ULTRA-KISS: Editor congelado após primeira inicialização, MAS permite atualizações via conexões
  const editorContent = useMemo(() => {
    // Se editor está congelado, mas temos lastMarkdown (inserção via conexões), usar lastMarkdown
    if (editorFrozen && lastMarkdown && lastMarkdown.trim()) {
      console.log('🔓 Editor descongelado temporariamente para conexões:', lastMarkdown.length, 'chars');
      return lastMarkdown;
    }
    
    // Se editor está congelado, não mudar mais nada
    if (editorFrozen && sessionContent) {
      return sessionContent;
    }

    // Primeira inicialização
    if (!isSessionInitialized && newsData?.final_text) {
      const { processedText, mapping } = processFinalText(newsData.final_text.trim());

      // Congelar imediatamente
      setSessionContent(processedText);
      setIsSessionInitialized(true);
      setEditorFrozen(true);
      setReferenceMapping(mapping);

      console.log('🔒 Editor inicializado e congelado');
      return processedText;
    }

    return sessionContent || `# Editor carregando...`;
  }, [editorFrozen, sessionContent, isSessionInitialized, newsData?.final_text, processFinalText, lastMarkdown]);

  const sectionMarkdownMap = useMemo(() => {
    // Usar editorContent para processar seções (mas apenas se não for a mensagem de fallback)
    if (editorContent && editorContent.trim() && !editorContent.includes('Se você está vendo esta mensagem')) {
      const lines = editorContent.split('\n');
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

    // Se não tiver conteúdo válido, retornar seções vazias
    return {
      summary: `# ${SECTION_TITLES.summary}`,
      body: `# ${SECTION_TITLES.body}`,
      conclusion: `# ${SECTION_TITLES.conclusion}`
    };
  }, [editorContent]);

  // CORREÇÃO: Preservar conteúdo do editor ao filtrar seções
  const displayContent = useMemo(() => {
    console.log('🔍 NotionLikePage - displayContent recalculado');
    console.log('📊 Debug displayContent inputs:', {
      shouldUpdateEditor,
      hasLastMarkdown: !!lastMarkdown,
      filteredSection,
      hasEditorContent: !!editorContent,
      editorContentPreview: editorContent?.substring(0, 100) || 'N/A'
    });

    // PRIORIDADE 1: Se temos lastMarkdown (conteúdo inserido via conexões), sempre usar
    if (lastMarkdown && lastMarkdown.trim()) {
      if (!filteredSection) {
        console.log('✅ Usando lastMarkdown (conteúdo via conexões)');
        return lastMarkdown;
      }

      // Para seções filtradas, tentar extrair da seção mas preservar o resto
      const sectionContent = sectionMarkdownMap[filteredSection];
      if (sectionContent) {
        console.log('✅ Mostrando seção filtrada:', filteredSection);
        return sectionContent;
      }

      // Se não encontrou a seção, manter conteúdo atual
      console.log('⚠️ Seção não encontrada, mantendo conteúdo atual');
      return lastMarkdown;
    }

    // PRIORIDADE 2: Se o editor deve ser atualizado, usar lastMarkdown
    if (shouldUpdateEditor && lastMarkdown && lastMarkdown.trim()) {
      console.log('✅ Editor marcado para atualização, usando lastMarkdown');
      return lastMarkdown;
    }

    // Fallback para primeira renderização
    console.log('🔄 Primeira renderização - usando editorContent');
    console.log('📄 editorContent sendo usado:', editorContent?.substring(0, 200) + '...');
    if (!filteredSection) return editorContent;
    return sectionMarkdownMap[filteredSection] || editorContent;
  }, [filteredSection, sectionMarkdownMap, editorContent, lastMarkdown, shouldUpdateEditor]);

  // KISS: Sincronizar mudanças para highlight funcionar, MAS preservar conteúdo inserido via conexões
  useEffect(() => {
    if (lastMarkdown && lastMarkdown !== sessionContent) {
      console.log(`🔄 [${new Date().toLocaleTimeString()}] Sync para highlight funcionar`);
      console.log('📊 Diferenças:', {
        lastMarkdownLength: lastMarkdown?.length || 0,
        sessionContentLength: sessionContent?.length || 0,
        areEqual: lastMarkdown === sessionContent
      });
      
      // ATENÇÃO: Não sobrescrever sessionContent se lastMarkdown é maior (inserção via conexões)
      if (lastMarkdown.length > (sessionContent?.length || 0)) {
        console.log('🔒 Preservando sessionContent - lastMarkdown é maior (possível inserção via conexões)');
        return;
      }
      
      setSessionContent(lastMarkdown);
    }
  }, [lastMarkdown, sessionContent]);

  // CORREÇÃO: Resetar shouldUpdateEditor quando o editor for atualizado
  useEffect(() => {
    if (shouldUpdateEditor && lastMarkdown) {
      console.log('🔄 Editor atualizado, resetando shouldUpdateEditor');
      setShouldUpdateEditor(false);
    }
  }, [shouldUpdateEditor, lastMarkdown]);

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

      console.log('📝 Conteúdo adicionado via drag & drop:', { sectionId, dragData });

      // CORREÇÃO: Marcar que o editor deve ser atualizado
      setShouldUpdateEditor(true);

      // Mostrar feedback visual
      setRecentlyAdded({ sectionId, at: Date.now() });
      setTimeout(() => setRecentlyAdded(null), 1200);

      // Chamar callback de link se disponível
      if (typeof onLinkDataToSection === 'function') {
        onLinkDataToSection(sectionId, dragData);
      }
    } catch { }
  }, [onLinkDataToSection]);

  const useDragAndDrop = (onAdd) => {
    const [isActive, setIsActive] = useState(false);
    const onDragEnter = useCallback((e) => {
      try {
        const types = Array.from(e?.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('application/x-lina-item')) {
          setIsActive(true);
        }
      } catch { }
    }, []);
    const onDragOver = useCallback((e) => {
      try {
        const types = Array.from(e?.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('application/x-lina-item')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setIsActive(true);
        }
      } catch { }
    }, []);
    const onDragLeave = useCallback((e) => {
      try {
        setIsActive(false);
      } catch { }
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
          } catch { }
          if (data && data.type === 'canvas-library-item') {
            onAdd?.(data, sectionId);
            console.debug('🧰 Drop (fallback) aplicado na DropZone:', { section: sectionId, data });
          }
        }
      } catch { }
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

  // onChange do editor - SIMPLIFICADO
  const handleEditorChange = useCallback((newMarkdown) => {
    setLastMarkdown(newMarkdown);
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
            try { const data = JSON.parse(json); if (data && data.type === 'canvas-library-item') return data; } catch { }
          }
        }
        if (types.includes('application/x-lina-item')) {
          const raw = dt.getData('application/x-lina-item');
          if (raw) {
            try { const data = JSON.parse(raw); if (data && data.type === 'canvas-library-item') return data; } catch { }
          }
        }
        if (types.includes('text/plain')) {
          const txt = dt.getData('text/plain');
          if (txt) {
            try { const data = JSON.parse(txt); if (data && data.type === 'canvas-library-item') return data; } catch { }
          }
        }
      } catch { }
      return null;
    };

    const onDragOverCapture = (e) => {
      try {
        const types = Array.from(e.dataTransfer?.types || []);
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('application/x-lina-item') || types.includes('text/uri-list')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      } catch { }
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
      } catch { }
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
                 <button
                   onClick={resetSession}
                   className="px-3 py-1.5 rounded border"
                   title="Resetar Sessão (volta ao final_text original)"
                   style={{ backgroundColor: 'red', borderColor: 'red', color: 'white' }}
                 >
                   <div className="flex items-center gap-2"><RotateCcw size={16} /><span className="text-sm">Reset</span></div>
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
                        key="editor-frozen" // KEY fixo - nunca muda
                        ref={editorRef}
                        initialContent={displayContent}
                        onChange={handleEditorChange}
                        onScroll={filteredSection ? undefined : handleScrollSync}
                        onCanvasItemDragStart={(payload) => { try { onCanvasItemDragStart?.(payload); } catch { } }}
                        onReferenceUpdate={updateReferenceMapping}
                        onReindexing={handleMarkerReindexing}
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
                    onTransferItem={() => { }}
                    onOpenCardModal={() => { }}
                    onDragStart={(payload) => { try { onCanvasItemDragStart?.(payload); } catch { } }}
                    onCanvasItemDragStart={() => { }}
                    onAddToNotionSection={(sectionId, payload) => handleContentAdd(payload, sectionId)}
                    editorRef={editorRef}
                    referenceMapping={referenceMapping}
                    onReferenceUpdate={updateReferenceMapping}
                    onReindexing={handleMarkerReindexing}
                  />
                </div>
              </div>
            </div>
          </div>


        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotionLikePage;