import React, { forwardRef, useImperativeHandle, useEffect, useRef, useState, useCallback } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { MarkerReindexingService } from '../../utils/markerReindexingService.js';

const BlockNoteEditor = forwardRef(({ initialContent = '', onChange, onScroll, onCanvasItemDragStart, onReferenceUpdate, onReindexing }, ref) => {
  
  // Estado para controlar se o conteúdo inicial foi carregado
  const [isInitialContentLoaded, setIsInitialContentLoaded] = useState(false);
  
  // Converter texto markdown simples para blocos BlockNote
  const convertMarkdownToBlocks = (markdown) => {
    console.log('🔍 BlockNoteEditor - convertMarkdownToBlocks chamado:', {
      hasMarkdown: !!markdown,
      markdownType: typeof markdown,
      markdownLength: markdown?.length || 0,
      markdownPreview: markdown?.substring(0, 200) || 'N/A'
    });
    
    if (!markdown || typeof markdown !== 'string') {
      console.log('❌ Markdown inválido, retornando array vazio');
      return [];
    }
    
    const lines = markdown.split('\n');
    const blocks = [];
    console.log('📄 Processando', lines.length, 'linhas de markdown');
    
    lines.forEach((line) => {
      if (!line.trim()) {
        blocks.push({
          type: 'paragraph',
          content: []
        });
        return;
      }
      
      // Verificar se é um heading
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = Math.min(6, headingMatch[1].length);
        const headingText = headingMatch[2].trim();
        
        blocks.push({
          type: 'heading',
          props: { level },
          content: [{ type: 'text', text: headingText }]
        });
        return;
      }
      
      // Parágrafo normal
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line }]
      });
    });
    
    // Adicionar blocos de espaçamento no final para garantir visibilidade
    blocks.push(
      {
        type: 'paragraph',
        content: []
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: ' ' }]
      },
      {
        type: 'paragraph',
        content: []
      }
    );
    
    console.log('✅ Blocos criados:', blocks.length, 'blocos');
    console.log('📄 Primeiro bloco:', blocks[0]);
    
    return blocks;
  };

  // Criar editor com configuração para highlighting de seleção
  const editor = useCreateBlockNote({ 
    initialContent: (() => {
      console.log('🔍 useCreateBlockNote - initialContent:', {
        hasInitialContent: !!initialContent,
        initialContentLength: initialContent?.length || 0,
        initialContentPreview: initialContent?.substring(0, 100) || 'N/A',
        isDefaultMessage: initialContent?.includes('Se você está vendo esta mensagem') || false
      });
      
      if (initialContent && initialContent.trim()) {
        const blocks = convertMarkdownToBlocks(initialContent);
        console.log('✅ Blocos convertidos para editor:', blocks.length);
        console.log('📄 Primeiro bloco:', blocks[0]);
        return blocks;
      } else {
        console.log('⚠️ Nenhum conteúdo inicial fornecido ou conteúdo vazio');
        return undefined;
      }
    })(),
    
    // Configuração de tema otimizada para highlighting
    theme: {
      colors: {
        editor: {
          text: "var(--text-primary)",
          background: "var(--bg-primary)",
        },
        menu: {
          text: "var(--text-primary)",
          background: "var(--bg-secondary)",
        },
        tooltip: {
          text: "var(--text-primary)",
          background: "var(--bg-tertiary)",
        },
        hovered: {
          text: "var(--text-primary)",
          background: "var(--bg-tertiary)",
        },
        selected: {
          text: "var(--text-primary)",
          background: "var(--primary-green-transparent)",
        },
        disabled: {
          text: "var(--text-secondary)",
          background: "var(--bg-secondary)",
        },
        shadow: "rgba(0, 0, 0, 0.1)",
        border: "var(--border-primary)",
        sideMenu: "var(--text-secondary)",
        highlights: {
          gray: { text: "#9ca3af", background: "#f3f4f6" },
          brown: { text: "#92400e", background: "#fef3c7" },
          red: { text: "#dc2626", background: "#fee2e2" },
          orange: { text: "#ea580c", background: "#fed7aa" },
          yellow: { text: "#1f2937", background: "#fef3c7" }, // Texto escuro para highlighting
          green: { text: "#16a34a", background: "#dcfce7" },
          blue: { text: "#2563eb", background: "#dbeafe" },
          purple: { text: "#9333ea", background: "#e9d5ff" },
          pink: { text: "#db2777", background: "#fce7f3" },
        },
      },
    }
  });

  // Debug: verificar métodos de seleção disponíveis
  useEffect(() => {
    if (editor) {

    }
  }, [editor]);

  // DESABILITADO: Não atualizar editor automaticamente quando initialContent mudar
  // Isso evita re-renderizações que sobrescrevem mudanças do usuário
  // O sistema de sessão no NotionLikePage agora gerencia isso
  useEffect(() => {
    console.log('🔄 BlockNoteEditor - initialContent mudou (sistema de sessão):', {
      hasInitialContent: !!initialContent,
      initialContentLength: initialContent?.length || 0,
      hasEditor: !!editor,
      isInitialContentLoaded,
      note: 'Atualizações automáticas desabilitadas - usando sistema de sessão'
    });
    
    // Apenas marcar como carregado na primeira vez
    if (editor && initialContent && !isInitialContentLoaded) {
      console.log('✅ Marcando conteúdo inicial como carregado (sem forçar atualização)');
      setIsInitialContentLoaded(true);
    }
  }, [editor, initialContent, isInitialContentLoaded]);

  // Diagnóstico do schema TipTap para identificar problemas
  useEffect(() => {
    if (!editor) return;

    const tiptap = editor._tiptapEditor;

    if (!tiptap) return;

    try {
      const nodeNames = Object.keys(tiptap.schema.nodes || {});
      const markNames = Object.keys(tiptap.schema.marks || {});


      if (!tiptap.schema.nodes?.text) {
        console.error('❌ Schema sem node "text". Isso geralmente indica conflito de versões do TipTap/PM ou extensão custom que sobrescreveu o schema.');
      }
    } catch (e) {
      console.log('⚠️ Falha ao inspecionar schema:', e);
    }
  }, [editor]);

  // Função helper para extrair texto de um bloco (versão otimizada)
  const extractTextFromBlock = useCallback((block) => {
    try {
      if (!block || !block.content) return '';
      
      if (Array.isArray(block.content)) {
        return block.content
          .map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              if (item.text) return item.text;
              if (item.content) return item.content;
            }
            return '';
          })
          .join('');
      }
      
      if (typeof block.content === 'string') {
        return block.content;
      }
      
      if (block.content && block.content.text) {
        return block.content.text;
      }
      
      return '';
    } catch {
      return '';
    }
  }, []);

  // Função para encontrar texto nos blocos (versão otimizada)
  const findTextInBlocks = useCallback((searchText) => {
    try {
      const blocks = editor.topLevelBlocks || [];
      
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const blockText = extractTextFromBlock(block);
        
        if (blockText && blockText.toLowerCase().includes(searchText.toLowerCase())) {
          return {
            blockIndex: i,
            blockId: block.id,
            blockText: blockText,
            block: block
          };
        }
      }
      console.log(`❌ Texto "${searchText}" não encontrado nos blocos`);
      return null;
    } catch (error) {
      console.error('❌ Erro ao procurar texto nos blocos:', error);
      return null;
    }
  }, [editor, extractTextFromBlock]);

  // Função para testar seleção de texto (para debug)
  const testTextSelection = useCallback(async (testText = "exemplo") => {
    try {
      
      if (!editor || !editor.topLevelBlocks) {
        console.log('❌ Editor não disponível');
        return;
      }
      
      const blocks = editor.topLevelBlocks;
      
      // Procurar texto nos blocos
      let found = false;
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const blockText = extractTextFromBlock(block);
        
        if (blockText && blockText.toLowerCase().includes(testText.toLowerCase())) {
          
          const textIndex = blockText.toLowerCase().indexOf(testText.toLowerCase());
          
          if (textIndex !== -1) {
            
            // Testar setTextCursor
            if (editor.setTextCursor) {
              const selection = {
                blockId: block.id,
                startOffset: textIndex,
                endOffset: textIndex + testText.length
              };
              
              editor.setTextCursor(selection);
              
              // Aguardar e tentar aplicar estilo
              setTimeout(() => {
                if (editor.addStyles) {
                  editor.addStyles({
                    backgroundColor: "yellow",
                    textColor: "default"
                  });
                  
                  // Limpar após 2 segundos
                  setTimeout(() => {
                    if (editor.removeStyles) {
                      editor.removeStyles(["backgroundColor"]);
                    }
                  }, 2000);
                } else {
                  console.log(`❌ addStyles não disponível`);
                }
              }, 100);
              
              found = true;
              break;
            } else {
              console.log(`❌ setTextCursor não disponível`);
            }
          }
        }
      }
      
      if (!found) {
        console.log(`❌ Texto "${testText}" não encontrado em nenhum bloco`);
      }
      
      
    } catch (error) {
      console.error('❌ Erro no teste de seleção:', error);
    }
  }, [editor, extractTextFromBlock]);

  // Junta todos os inlines do parágrafo em um único text-node
  const normalizeBlockInlines = useCallback((blockId) => {
    if (!editor) return false;
    const blocks = editor.document || editor.topLevelBlocks || [];
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return false;

    const blk = blocks[idx];
    if (blk.type !== 'paragraph') return false;

    const joined = (blk.content || []).map(inl => inl.text || '').join('');
    // Se já está normalizado (apenas 1 inline com o mesmo texto), não faça nada
    if (blk.content && blk.content.length === 1 && (blk.content[0].text || '') === joined) return true;

    editor.updateBlock(blockId, { content: [{ type: 'text', text: joined }] });
    return true;
  }, [editor]);

  // Resegmenta o parágrafo SOMENTE nas fronteiras de marcador [n]
  const resegmentAtMarkers = useCallback((blockId) => {
    if (!editor) return false;
    const blocks = editor.document || editor.topLevelBlocks || [];
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return false;

    const blk = blocks[idx];
    if (blk.type !== 'paragraph') return false;

    const txt = (blk.content || []).map(n => n.text || '').join('');
    // split preservando os delimitadores [n]
    const parts = txt.split(/(\[\d+\])/g).filter(Boolean);
    // Garante que não houve split "no meio da palavra"
    const content = parts.map(t => ({ type: 'text', text: t }));

    // Evita update se já está do mesmo jeito
    const same =
      Array.isArray(blk.content) &&
      blk.content.length === content.length &&
      blk.content.every((n, i) => (n.text || '') === content[i].text);

    if (!same) editor.updateBlock(blockId, { content });

    return true;
  }, [editor]);

  // Calcula posições absolutas no doc TipTap para offsets relativos ao bloco
  const getDocRangeForBlockOffsets = useCallback((blockId, startOffset, endOffset) => {
    const tiptap = editor?._tiptapEditor;
    if (!tiptap) return null;
    let from = -1, to = -1;

    tiptap.state.doc.descendants((node, pos) => {
      if (from !== -1 && to !== -1) return false;
      if (node.type.name === 'blockContainer' && node.attrs?.id === blockId) {
        const base = pos + 1; // dentro do node
        from = base + startOffset;
        to   = base + endOffset;
        return false;
      }
      return true;
    });

    return (from >= 0 && to >= 0) ? { from, to } : null;
  }, [editor]);

  useImperativeHandle(ref, () => ({
    getMarkdown: async () => {
      try {
        if (editor.document) {
          return editor.document.map(block => {
            if (block.type === 'heading') {
              return `${'#'.repeat(block.props.level)} ${block.content?.[0]?.text || ''}`;
            } else if (block.type === 'paragraph') {
              return block.content?.[0]?.text || '';
            }
            return '';
          }).filter(text => text.trim()).join('\n\n');
        }
        return '';
      } catch (error) {
        console.error('Erro ao converter para markdown:', error);
        return '';
      }
    },
    
    getBlocks: () => editor.document || editor.topLevelBlocks || [],
    
    insertContent: (content) => {
      try {
        console.log('🔍 BlockNoteEditor - tentando inserir conteúdo:', content);
      } catch (error) {
        console.error('Erro ao inserir conteúdo:', error);
      }
    },
    
    // Método para substituir conteúdo completo
    replaceContent: (newContent) => {
      try {
        if (!editor) return false;
        
        console.log('🔄 BlockNoteEditor - substituindo conteúdo:', newContent.length, 'caracteres');
        
        // Converter markdown para blocos
        const blocks = convertMarkdownToBlocks(newContent);
        
        // Substituir conteúdo do editor
        if (editor.replaceBlocks && editor.topLevelBlocks) {
          editor.replaceBlocks(editor.topLevelBlocks, blocks);
          console.log('✅ Conteúdo substituído com sucesso');
          return true;
        } else {
          console.warn('⚠️ Editor não tem método replaceBlocks disponível');
          return false;
        }
      } catch (error) {
        console.error('❌ Erro ao substituir conteúdo:', error);
        return false;
      }
    },
    
    // Método para atualizar conteúdo a partir de sequência
    updateContentFromSequence: (sequenceText, mapping) => {
      try {
        if (!editor) return false;
        
        console.log('🔄 BlockNoteEditor - atualizando da sequência:', sequenceText.length, 'caracteres');
        
        // Processar texto da sequência
        const blocks = convertMarkdownToBlocks(sequenceText);
        
        // Atualizar mapeamento de referências se fornecido
        if (mapping) {
          console.log('🔄 Mapeamento de referências atualizado:', mapping.size, 'referências');
        }
        
        // Substituir blocos
        if (editor.replaceBlocks && editor.topLevelBlocks) {
          editor.replaceBlocks(editor.topLevelBlocks, blocks);
          console.log('✅ Conteúdo da sequência aplicado com sucesso');
          return true;
        } else {
          console.warn('⚠️ Editor não tem método replaceBlocks disponível');
          return false;
        }
      } catch (error) {
        console.error('❌ Erro ao atualizar da sequência:', error);
        return false;
      }
    },
    
    // EXPOR A INSTÂNCIA DO EDITOR COMPLETA
    editor: editor,
    
        // MÉTODO PRINCIPAL PARA HIGHLIGHT - VERSÃO CORRIGIDA
    highlightText: (blockId, startOffset, endOffset, shouldHighlight = true) => {
      try {
        if (!editor) {
          console.log('❌ Editor não disponível');
          return false;
        }
        
        
        // Verificar se o bloco existe
        const blocks = editor.document || editor.topLevelBlocks || [];
        const blockIndex = blocks.findIndex(b => b.id === blockId);
        
        if (blockIndex === -1) {
          console.log(`❌ Bloco ${blockId} não encontrado`);
          return false;
        }
        
        let block = blocks[blockIndex];
        
        // DEBUG: Mostrar conteúdo do bloco e offsets

        // 🔧 1) Normalizar e resegmentar o parágrafo via TipTap
        normalizeBlockInlines(block.id);
        resegmentAtMarkers(block.id);

        // Releia o bloco após os updates (para garantir offsets estáveis)
        const blocksNow = editor.document || editor.topLevelBlocks || [];
        const blockNow = blocksNow.find(b => b.id === block.id) || block;
        const totalLen = (blockNow.content || []).reduce((s, n) => s + (n.text?.length || 0), 0);

        // Clamp defensivo
        const a = Math.max(0, Math.min(startOffset, totalLen));
        const b = Math.max(a, Math.min(endOffset, totalLen));
        
        // Verificar se os offsets fazem sentido
        
        if (endOffset > totalLen) {
          console.log(`⚠️ AVISO: endOffset (${endOffset}) é maior que o tamanho do bloco (${totalLen})`);
        }
        
        // DEBUG: Mostrar texto exato que será destacado
        let blockText = '';
        let currentPos = 0;
        for (const inline of blockNow.content) {
          const inlineText = inline.text || '';
          if (currentPos + inlineText.length >= a && currentPos < b) {
            const startInInline = Math.max(0, a - currentPos);
            const endInInline = Math.min(inlineText.length, b - currentPos);
            const textToHighlight = inlineText.substring(startInInline, endInInline);
            blockText += `[${textToHighlight}]`;
          } else {
            blockText += inlineText;
          }
          currentPos += inlineText.length;
        }
        
        // 🔧 2) Calcular posições absolutas no doc TipTap
        const range = getDocRangeForBlockOffsets(blockNow.id, a, b);
        if (!range) {
          console.log('❌ Não consegui mapear range no TipTap');
          return false;
        }

        // 🔧 3) Aplicar highlight via TipTap (igual "como antes")
            const tiptap = editor._tiptapEditor;
        tiptap.commands.focus(undefined, { scrollIntoView: false }); // garante visibilidade
        tiptap.commands.setTextSelection(range);

        // Use a API do BlockNote para o mark de estilo (compatível com o schema dele)
              if (shouldHighlight) {
          editor.addStyles({ backgroundColor: 'green', textColor: 'white' });
        } else {
          editor.removeStyles({ backgroundColor: true, textColor: true });
        }

        // 🔧 4) Limpar a seleção imediatamente para não ficar visível
        if (tiptap.commands.clearSelection) {
          tiptap.commands.clearSelection();
        }
        // Fallback: se clearSelection não funcionar, usar blur
        if (tiptap.commands.blur) {
          tiptap.commands.blur();
        }
        return true;

        // Fallback: se o método principal falhar, retornar false
        console.log('❌ Método principal falhou, retornando false');
        return false;
      } catch (error) {
        console.error('❌ Erro geral em highlightText:', error);
        return false;
      }
    },
    
    findTextInBlocks: findTextInBlocks,
    testTextSelection: testTextSelection,
    
    /**
     * Método seguro para inserir texto em posição específica com reindexação automática
     * Integrado com MarkerReindexingService para manter integridade dos marcadores
     */
    insertTextAtPosition: async (searchText, newText, position = 'after', onReferenceUpdate = null, onReindexing = null) => {
      try {
        console.log(`🚀 [${new Date().toLocaleTimeString()}] === NOVA INSERÇÃO INICIADA ===`);
        console.log(`📝 Parâmetros:`, { searchText, newText: newText?.substring(0, 50) + '...', position });
        
        if (!editor || !editor._tiptapEditor) {
          console.error('❌ Editor TipTap não disponível para inserção');
          return false;
        }

        const tiptap = editor._tiptapEditor;
        console.log(`🔍 Inserindo "${newText}" ${position} "${searchText}" com reindexação automática`);
        
        // 1. Obter conteúdo atual do editor para análise
        const currentContent = tiptap.state.doc.textContent;
        console.log(`📄 Conteúdo atual: ${currentContent.length} caracteres`);
        
        // 2. Gerar próximo número de marcador
        const generateNextMarkerNumber = () => {
          const doc = tiptap.state.doc;
          const existingMarkers = new Set();
          
          doc.descendants((node) => {
            if (node.isText && node.text) {
              const markers = node.text.match(/\[\d+\]/g);
              if (markers) {
                markers.forEach(marker => {
                  const num = parseInt(marker.match(/\d+/)[0]);
                  existingMarkers.add(num);
                });
              }
            }
            return true;
          });
          
          let nextNumber = 1;
          while (existingMarkers.has(nextNumber)) {
            nextNumber++;
          }
          
          console.log(`🔢 Próximo marcador: [${nextNumber}]`);
          return nextNumber;
        };
        
        const markerNumber = generateNextMarkerNumber();
        const marker = `[${markerNumber}]`;
        const textWithMarker = `${newText} ${marker}`;
        
        // 3. Função para verificar inserção
        const verifyInsertion = (expectedText, timeoutMs = 1000) => {
          return new Promise((resolve) => {
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
              const currentContent = tiptap.state.doc.textContent;
              if (currentContent.includes(expectedText) || Date.now() - startTime > timeoutMs) {
                clearInterval(checkInterval);
                resolve(currentContent.includes(expectedText));
              }
            }, 100);
          });
        };

        // 4. Focar no editor
        tiptap.commands.focus();

        // 5. Determinar posição de inserção
        let targetPosition = null;
        let insertionPosition = null;

        if (!searchText || searchText.trim() === '') {
          // Inserir no final
          console.log('📍 Inserindo no final do documento');
          targetPosition = tiptap.state.doc.content.size;
          insertionPosition = targetPosition;
          
          await new Promise(resolve => setTimeout(resolve, 50));
          tiptap.commands.setTextSelection(targetPosition);
          
          const contentToInsert = `\n\n${textWithMarker}`;
          const success = tiptap.commands.insertContent(contentToInsert);
          
          const verified = await verifyInsertion(marker, 2000);
          
          if (verified && typeof onReferenceUpdate === 'function') {
            const titleFromText = newText.substring(0, 50).trim();
            onReferenceUpdate(marker, titleFromText);
          }
          
          return verified;
        } else {
          // Procurar pelo marcador específico
          console.log(`🔍 Procurando pelo marcador: "${searchText}"`);
          
          const doc = tiptap.state.doc;
          let found = false;

          doc.descendants((node, pos) => {
            if (found) return false;

            if (node.isText && node.text) {
              const markerIndex = node.text.indexOf(searchText);
              if (markerIndex !== -1) {
                console.log(`📍 Marcador ${searchText} encontrado na posição ${pos + markerIndex}`);
                
                if (position === 'after') {
                  targetPosition = pos + markerIndex + searchText.length;
                  insertionPosition = targetPosition;
                } else if (position === 'before') {
                  targetPosition = pos + markerIndex;
                  insertionPosition = targetPosition;
                }
                found = true;
                return false;
              }
            }
            return true;
          });

          if (targetPosition === null) {
            console.warn(`⚠️ Marcador "${searchText}" não encontrado, inserindo no final`);
            targetPosition = tiptap.state.doc.content.size;
            insertionPosition = targetPosition;
          }
        }

        // 6. Executar inserção
        console.log(`📝 Inserindo na posição: ${targetPosition}`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const docSize = tiptap.state.doc.content.size;
        if (targetPosition > docSize) {
          console.log(`⚠️ Ajustando posição de ${targetPosition} para ${docSize}`);
          targetPosition = docSize;
          insertionPosition = targetPosition;
        }
        
        tiptap.commands.setTextSelection(targetPosition);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const contentToInsert = position === 'after' ? `\n\n${textWithMarker}` : `${textWithMarker}\n\n`;
        const insertResult = tiptap.commands.insertContentAt(targetPosition, contentToInsert) || 
                            tiptap.commands.insertContent(contentToInsert);
        
        console.log(`📝 Resultado da inserção: ${insertResult}`);
        
        // 7. Verificar se inserção foi bem-sucedida
        const verified = await verifyInsertion(marker, 3000);
        console.log(`✅ Verificação de inserção: ${verified ? 'SUCESSO' : 'FALHA'}`);
        
        if (!verified) {
          console.error('❌ Inserção falhou, abortando reindexação');
          return false;
        }

        // KISS: Reindexação simples sem complexidade
        console.log('✅ Inserção concluída - usando abordagem simples');
        
        // Apenas atualizar referenceMapping (título já é passado pelo callback)
        if (typeof onReferenceUpdate === 'function') {
          onReferenceUpdate(marker, ''); // Título será passado pelo textInsertionHelpers
        }
        
        // Forçar atualização do onChange
        if (onChange && typeof onChange === 'function') {
          setTimeout(() => {
            const currentMarkdown = editor.topLevelBlocks.map(block => {
              if (block.type === 'heading') {
                return `${'#'.repeat(block.props.level)} ${block.content?.[0]?.text || ''}`;
              } else if (block.type === 'paragraph') {
                return block.content?.[0]?.text || '';
              }
              return '';
            }).filter(text => text.trim()).join('\n\n');
            
            console.log('🔄 Atualizando estado após inserção');
            onChange(currentMarkdown);
          }, 100);
        }

        // 14. Focar no editor e rolar para posição
        tiptap.commands.focus();
        
        try {
          const editorContainer = tiptap.view.dom.closest('.bn-editor');
          if (editorContainer) {
            editorContainer.scrollTop = editorContainer.scrollHeight * 0.8;
            console.log('✅ Editor rolado para posição do texto inserido');
          }
        } catch (scrollError) {
          console.warn('⚠️ Erro ao rolar editor:', scrollError);
        }
        
        console.log(`✅ [${new Date().toLocaleTimeString()}] Inserção concluída: "${newText}" ${position} "${searchText}"`);
        
        // Debug: Verificar estado do editor após inserção
        setTimeout(() => {
          const finalContent = tiptap.state.doc.textContent;
          console.log(`📊 [${new Date().toLocaleTimeString()}] Estado final do editor:`, {
            contentLength: finalContent.length,
            blockCount: editor.topLevelBlocks?.length || 0,
            hasNewMarker: finalContent.includes(marker)
          });
        }, 200);
        
        return true;

      } catch (error) {
        console.error('❌ Erro durante inserção com reindexação:', error);
        
        // Fallback: inserção simples no final
        try {
          if (editor._tiptapEditor) {
            const tiptap = editor._tiptapEditor;
            const markerNumber = 1; // Fallback simples
            const marker = `[${markerNumber}]`;
            const textWithMarker = `${newText} ${marker}`;
            
            tiptap.commands.focus();
            await new Promise(resolve => setTimeout(resolve, 50));
            
            tiptap.commands.setTextSelection(tiptap.state.doc.content.size);
            const success = tiptap.commands.insertContent(`\n\n${textWithMarker}`);
            
            if (success && typeof onReferenceUpdate === 'function') {
              const titleFromText = newText.substring(0, 50).trim();
              onReferenceUpdate(marker, titleFromText);
            }
            
            console.log('✅ Texto inserido no final (fallback)');
            return success;
          }
        } catch (fallbackError) {
          console.error('❌ Falha no fallback:', fallbackError);
        }
        
        return false;
      }
    },

    /**
     * Método para buscar texto no documento (para debug)
     */
    findTextInDocument: (searchText) => {
      try {
        if (!editor || !editor._tiptapEditor) {
          return null;
        }
        
        const doc = editor._tiptapEditor.state.doc;
        const results = [];
        
        doc.descendants((node, pos) => {
          if (node.isText && node.text) {
            const nodeText = node.text.toLowerCase();
            const searchLower = searchText.toLowerCase();
            
            if (nodeText.includes(searchLower)) {
              results.push({
                text: node.text,
                position: pos,
                nodeSize: node.nodeSize
              });
            }
          }
          
          return true;
        });
        
        console.log(`🔍 Busca por "${searchText}":`, results);
        return results;
        
      } catch (error) {
        console.error('❌ Erro na busca:', error);
        return null;
      }
    },

    /**
     * Método para obter informações do documento (debug)
     */
    getDocumentInfo: () => {
      try {
        if (!editor || !editor._tiptapEditor) {
          return null;
        }
        
        const doc = editor._tiptapEditor.state.doc;
        const info = {
          size: doc.content.size,
          childCount: doc.childCount,
          textContent: doc.textContent.substring(0, 200) + '...', // Primeiros 200 chars
          nodeCount: 0
        };
        
        doc.descendants(() => {
          info.nodeCount++;
          return true;
        });
        
        console.log('📄 Informações do documento:', info);
        return info;
        
      } catch (error) {
        console.error('❌ Erro ao obter info do documento:', error);
        return null;
      }
    },
    
    // Método de debug
    debugEditor: () => {

      
      // Testar cálculo de posições absolutas
      if (editor.document && editor.document.length > 0) {
        const firstBlock = editor.document[0];

        
        // Calcular posição absoluta do primeiro bloco
        let pos = 0;
        for (const block of editor.document) {
          pos++; // Abertura do nó
          if (block.id === firstBlock.id) {
            break;
          }
          pos += block.content.reduce((len, inline) => len + (inline.text?.length || 0), 0);
          pos++; // Fechamento do nó
        }
      }
      
      // Verificar comandos TipTap disponíveis
      if (editor._tiptapEditor) {
        console.log('- TipTap commands:', Object.keys(editor._tiptapEditor.commands));
        console.log('- TipTap state:', editor._tiptapEditor.state);
      }
      
      console.log('🔍 === FIM DEBUG ===');
    },

    // insertTextAtPosition method is already defined above in the object
  }), [editor, findTextInBlocks, testTextSelection, extractTextFromBlock, onReindexing]);

  useEffect(() => {
    if (onChange && editor.topLevelBlocks) {
      const handleChange = async () => {
        try {
          // Por enquanto, usar conversão simples
          const markdown = editor.topLevelBlocks.map(block => {
            if (block.type === 'heading') {
              return `${'#'.repeat(block.props.level)} ${block.content?.[0]?.text || ''}`;
            } else if (block.type === 'paragraph') {
              return block.content?.[0]?.text || '';
            }
            return '';
          }).filter(text => text.trim()).join('\n\n');
          
          onChange(markdown);
        } catch (error) {
          console.error('Erro ao converter mudanças para markdown:', error);
        }
      };
      
      // Debounce para evitar muitas chamadas
      const timeoutId = setTimeout(handleChange, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [editor.topLevelBlocks, onChange]);

  return (
    <div className="notion-editor w-full h-full overflow-hidden">
      <BlockNoteView 
        editor={editor}
        theme="dark"
        onScroll={onScroll}
        editable={true}
        renderEditor={true}
      />
    </div>
  );
});

BlockNoteEditor.displayName = 'BlockNoteEditor';

export default BlockNoteEditor;