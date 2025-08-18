import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Save, X, Layers as LayersIcon, Quote as QuoteIcon, Braces as BracesIcon, ChevronLeft, ChevronRight, Library as LibraryIcon, Bug, TestTube, Target } from 'lucide-react';
import CanvasLibraryView from './CanvasLibraryView';
import BlockNoteEditor from './BlockNoteEditor';
import MainSidebar from '../MainSidebar';

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

const NotionLikePage = ({ isOpen = true, onClose, newsData, newsTitle, onCanvasItemDragStart, onLinkDataToSection }) => {
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

  const EDITOR_MIN_PX = 480;
  const LIB_MIN_PX = 360;

  // FUNÇÃO HELPER PARA EXTRAIR TEXTO PLANO DE UM BLOCO
  const extractBlockTextFlat = useCallback((block) => {
    try {
      if (!block || !block.content) return '';
      
      if (Array.isArray(block.content)) {
        let fullText = '';
        let currentPos = 0;
        
        // Percorrer cada elemento inline e construir o texto completo
        for (const item of block.content) {
          if (typeof item === 'string') {
            fullText += item;
            currentPos += item.length;
          } else if (item && typeof item === 'object') {
            if (item.text) {
              fullText += item.text;
              currentPos += item.text.length;
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
                currentPos += nestedText.length;
              } else if (typeof item.content === 'string') {
                fullText += item.content;
                currentPos += item.content.length;
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

  // NOVA FUNÇÃO para grifar texto específico no BlockNote
  const highlightSpecificText = useCallback(async (editor, textToHighlight, shouldHighlight) => {
    try {
      console.log(`🎯 Procurando texto específico: "${textToHighlight.substring(0, 100)}..."`);
      console.log(`🔍 Texto completo recebido: "${textToHighlight}"`);
      console.log(`🔍 Tamanho do texto: ${textToHighlight.length}`);
      
      // Acessar o documento diretamente do editor
      const blocks = editor.document || editor.topLevelBlocks || [];
      
      if (!blocks || blocks.length === 0) {
        console.log('❌ Nenhum bloco disponível no editor');
        return false;
      }
      
      // Procurar o texto nos blocos do editor
      for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
        const block = blocks[blockIndex];
        const blockText = extractBlockTextFlat(block);
        
        if (!blockText) continue;
        
        // Buscar pelo texto (matching mais preciso)
        const textLower = textToHighlight.toLowerCase().trim();
        const blockLower = blockText.toLowerCase();
        
        console.log(`🔍 Procurando por: "${textLower}"`);
        console.log(`🔍 No bloco: "${blockLower.substring(0, 200)}..."`);
        
        // Tentar encontrar o texto exato primeiro
        let matchIndex = blockLower.indexOf(textLower);
        
        // Se não encontrar exato, tentar com as primeiras palavras
        if (matchIndex === -1) {
          const searchWords = textLower.split(' ').slice(0, 8).join(' ');
          console.log(`🔍 Tentando com primeiras palavras: "${searchWords}"`);
          matchIndex = blockLower.indexOf(searchWords);
        }
        
        // Se ainda não encontrar, tentar com palavras-chave mais específicas
        if (matchIndex === -1) {
          const keywords = textLower.split(' ').filter(word => word.length > 3).slice(0, 5);
          const searchPhrase = keywords.join(' ');
          console.log(`🔍 Tentando com palavras-chave: "${searchPhrase}"`);
          matchIndex = blockLower.indexOf(searchPhrase);
        }
        
        if (matchIndex !== -1) {
          console.log(`✅ Texto encontrado no bloco ${blockIndex} na posição ${matchIndex}`);
          console.log(`📝 Block ID: ${block.id}`);
          console.log(`📝 Texto do bloco: "${blockText.substring(0, 100)}..."`);
          console.log(`🔍 Estrutura do bloco:`, block);
          console.log(`🔍 Conteúdo do bloco:`, block.content);
          
          // DEBUG: Mostrar estrutura detalhada dos elementos inline
          if (Array.isArray(block.content)) {
            console.log(`🔍 Elementos inline (${block.content.length}):`);
            block.content.forEach((item, index) => {
              console.log(`  [${index}] Tipo: ${typeof item}, Conteúdo:`, item);
              if (item && typeof item === 'object') {
                console.log(`    - Props:`, item.props);
                console.log(`    - Text:`, item.text);
                console.log(`    - Content:`, item.content);
              }
            });
          }
          
          // Calcular as posições exatas para seleção
          // matchIndex é a posição onde o texto foi encontrado no bloco
          const startOffset = matchIndex;
          const endOffset = Math.min(
            matchIndex + textToHighlight.length, // Usar textToHighlight (já limpo)
            blockText.length
          );
          
          console.log(`🔍 matchIndex: ${matchIndex}, textToHighlight length: ${textToHighlight.length}`);
          console.log(`🔍 startOffset: ${startOffset}, endOffset: ${endOffset}`);
          
          console.log(`📍 Aplicando highlight: ${startOffset}-${endOffset} no bloco ${block.id}`);
          
          // USAR O NOVO MÉTODO highlightText DO EDITOR
          if (editorRef.current && editorRef.current.highlightText) {
            const success = editorRef.current.highlightText(
              block.id,
              startOffset,
              endOffset,
              shouldHighlight
            );
            
            if (success) {
              console.log(`✅ Highlight ${shouldHighlight ? 'aplicado' : 'removido'} com sucesso`);
              return true;
            } else {
              console.log(`⚠️ Falha ao aplicar highlight, tentando método alternativo...`);
              
              // Tentar método alternativo
              if (editorRef.current.selectAndHighlight) {
                const altSuccess = editorRef.current.selectAndHighlight(
                  block.id,
                  startOffset,
                  endOffset,
                  shouldHighlight
                );
                
                if (altSuccess) {
                  console.log(`✅ Highlight aplicado via método alternativo`);
                  return true;
                }
              }
            }
          }
          
          // FALLBACK: Tentar acessar o editor interno diretamente
          if (editorRef.current && editorRef.current.editor) {
            const internalEditor = editorRef.current.editor;
            
            // Tentar usar os métodos do BlockNote diretamente
            try {
              // Método 1: Usar setTextCursorPosition com a estrutura correta
              internalEditor.setTextCursorPosition(
                block.id, // ou block se for o objeto completo
                startOffset
              );
              
              // Estender a seleção
              const selection = internalEditor.getSelection();
              if (selection) {
                // Modificar a seleção para incluir o range completo
                internalEditor.updateSelection({
                  ...selection,
                  endOffset: endOffset
                });
              }
              
              // Aplicar estilo
              if (shouldHighlight) {
                internalEditor.addStyles({ backgroundColor: "yellow" });
              } else {
                internalEditor.removeStyles(["backgroundColor"]);
              }
              
              console.log(`✅ Highlight aplicado via editor interno`);
              return true;
              
            } catch (fallbackError) {
              console.log('❌ Fallback também falhou:', fallbackError);
              
              // Último recurso: tentar via TipTap se disponível
              if (internalEditor._tiptapEditor) {
                try {
                  const tiptap = internalEditor._tiptapEditor;
                  
                  // Calcular posição absoluta no documento
                  let absoluteStart = 0;
                  for (let i = 0; i < blockIndex; i++) {
                    const prevBlock = blocks[i];
                    const prevText = extractBlockTextFlat(prevBlock);
                    absoluteStart += prevText.length + 1; // +1 para quebra de linha
                  }
                  absoluteStart += startOffset;
                  
                  // Aplicar seleção no TipTap
                  tiptap.commands.setTextSelection({
                    from: absoluteStart,
                    to: absoluteStart + (endOffset - startOffset)
                  });
                  
                  // Aplicar marca de highlight
                  if (shouldHighlight) {
                    tiptap.commands.setMark('highlight', { color: 'yellow' });
                  } else {
                    tiptap.commands.unsetMark('highlight');
                  }
                  
                  console.log(`✅ Highlight aplicado via TipTap`);
                  return true;
                } catch (tiptapError) {
                  console.log('❌ TipTap também falhou:', tiptapError);
                }
              }
            }
          }
          
          console.log(`❌ Todos os métodos de highlight falharam para o bloco ${blockIndex}`);
          return false;
        }
      }
      
      console.log(`❌ Texto não encontrado em nenhum bloco do editor`);
      return false;
      
    } catch (error) {
      console.error('❌ Erro ao aplicar highlight específico:', error);
      return false;
    }
  }, [extractBlockTextFlat]);

  // FUNÇÃO PRINCIPAL CORRIGIDA - Grifo por marcadores
  const handleHighlightText = useCallback(async (title, phrase, action) => {
    console.log(`🎨 Grifo por Marcadores: ${action} - title: "${title}"`);
    
    // Verificar se o editor está disponível
    if (!editorRef.current) {
      console.log('❌ EditorRef não disponível');
      return;
    }
    
    // Acessar o editor interno do BlockNote
    const editor = editorRef.current.editor;
    if (!editor) {
      console.log('❌ Editor interno não disponível');
      return;
    }
    
    try {
      // PASSO 1: Encontrar o marcador no final_text
      const finalText = newsData?.final_text;
      if (!finalText || typeof finalText !== 'string') {
        console.log('❌ final_text não disponível');
        return;
      }
      
      console.log(`🔍 Procurando marcador para: "${title}"`);
      
      // Buscar pelo marcador ///<título>///
      const markerPattern = `///<${title}>///`;
      const markerIndex = finalText.indexOf(markerPattern);
      
      if (markerIndex === -1) {
        console.log(`❌ Marcador "${markerPattern}" não encontrado no final_text`);
        return;
      }
      
      console.log(`✅ Marcador encontrado na posição: ${markerIndex}`);
      
      // PASSO 2: Encontrar o texto que VEM ANTES do marcador
      const textBeforeMarker = finalText.substring(0, markerIndex);
      
      // Encontrar o início do texto a ser grifado
      // Procurar pelo marcador anterior ou início do parágrafo
      let textStart = 0;
      
      // Procurar o último marcador antes do atual
      const lastMarkerMatch = textBeforeMarker.lastIndexOf('///');
      if (lastMarkerMatch !== -1 && lastMarkerMatch < markerIndex - 3) {
        // Se encontrou um marcador anterior, começar logo após ele
        textStart = lastMarkerMatch + 3;
        // Pular espaços em branco após o marcador anterior
        while (textStart < markerIndex && /\s/.test(finalText[textStart])) {
          textStart++;
        }
      } else {
        // Se não há marcador anterior, procurar pelo início do parágrafo
        const lastDoubleNewline = textBeforeMarker.lastIndexOf('\n\n');
        const lastSingleNewline = textBeforeMarker.lastIndexOf('\n');
        
        if (lastDoubleNewline !== -1) {
          textStart = lastDoubleNewline + 2;
        } else if (lastSingleNewline !== -1) {
          textStart = lastSingleNewline + 1;
        } else {
          textStart = 0;
        }
      }
      
      // PASSO 3: Extrair o texto específico a ser grifado
      const textToHighlight = finalText.substring(textStart, markerIndex).trim();
      
      console.log(`🎯 Texto a ser grifado (${textStart}-${markerIndex}): "${textToHighlight}"`);
      
      if (!textToHighlight || textToHighlight.length < 5) {
        console.log(`❌ Texto muito curto ou vazio para grifo: "${textToHighlight}"`);
        return;
      }
      
      // IMPORTANTE: Remover marcadores do texto processado antes de procurar
      // Porque o editor mostra o texto processado (sem marcadores)
      const processedFinalText = finalText.replace(/\/\/\/<[^>]+>\/\/\//g, (match, offset) => {
        // Substituir marcadores por espaço para manter offsets aproximados
        return offset < markerIndex ? '' : match;
      });
      
      // Ajustar o texto a procurar removendo possíveis artefatos
      const cleanTextToHighlight = textToHighlight.replace(/\[[\d]+\]/g, '').trim();
      
      console.log(`🔍 Texto limpo para busca: "${cleanTextToHighlight}"`);
      
      // PASSO 4: Encontrar esse texto específico no editor BlockNote
      const success = await highlightSpecificText(editor, cleanTextToHighlight, action === 'enter');
      
      if (success) {
        console.log(`✅ Grifo ${action === 'enter' ? 'aplicado' : 'removido'} com sucesso para: "${title}"`);
      } else {
        console.log(`❌ Falha ao ${action === 'enter' ? 'aplicar' : 'remover'} grifo para: "${title}"`);
      }
      
    } catch (error) {
      console.error('❌ Erro no grifo por marcadores:', error);
    }
    
  }, [newsData, highlightSpecificText]);

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

  // Monta conteúdo do editor - sempre priorizar final_text do banco
  const editorContent = useMemo(() => {
    // Debug: verificar se final_text está sendo recebido
    console.log('🔍 NotionLikePage - newsData:', newsData);
    console.log('🔍 NotionLikePage - final_text:', newsData?.final_text);
    
    // SEMPRE usar final_text do banco de dados se disponível
    if (newsData?.final_text && typeof newsData.final_text === 'string' && newsData.final_text.trim()) {
      console.log('✅ Usando final_text do banco de dados');
      const { processedText, mapping } = processFinalText(newsData.final_text.trim());
      
      // Armazenar o mapeamento no estado
      setReferenceMapping(mapping);
      
      console.log('🔍 NotionLikePage - texto processado:', processedText);
      console.log('🔍 NotionLikePage - mapeamento criado:', mapping);
      
      return processedText;
    }
    
    // Se não tiver final_text, mostrar mensagem informativa
    console.log('⚠️ final_text não disponível - mostrando mensagem informativa');
    setReferenceMapping(new Map()); // Limpar mapeamento
    return `# Editor Estruturado

Este editor está configurado para mostrar o conteúdo da coluna "final_text" do banco de dados.

Se você está vendo esta mensagem, significa que:
- A coluna "final_text" não está preenchida para esta notícia, ou
- Houve um problema ao carregar os dados do banco

Verifique o console para mais detalhes sobre o carregamento dos dados.

Para testar o highlighting por marcadores, clique no botão "Teste Marcador".`;
  }, [newsData?.final_text, processFinalText]);

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
      
      console.log(`🖱️ Canvas hover ${action}:`, { title, phrase });
      
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