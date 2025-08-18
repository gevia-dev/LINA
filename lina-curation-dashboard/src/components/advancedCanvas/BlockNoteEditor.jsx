import React, { forwardRef, useImperativeHandle, useEffect, useRef, useState, useCallback } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

const BlockNoteEditor = forwardRef(({ initialContent = '', onChange, onScroll, onCanvasItemDragStart }, ref) => {
  console.log('🔍 BlockNoteEditor - renderizando com initialContent:', initialContent);
  
  // Converter texto markdown simples para blocos BlockNote
  const convertMarkdownToBlocks = (markdown) => {
    if (!markdown || typeof markdown !== 'string') return [];
    
    console.log('🔍 BlockNoteEditor - convertendo markdown para blocos:', markdown);
    
    const lines = markdown.split('\n');
    const blocks = [];
    
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
    
    console.log('🔍 BlockNoteEditor - blocos criados:', blocks);
    return blocks;
  };

  // Criar editor com configuração para highlighting de seleção
  const editor = useCreateBlockNote({ 
    initialContent: initialContent ? convertMarkdownToBlocks(initialContent) : undefined,
    
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
      console.log('🔍 BlockNoteEditor - editor criado:', editor);
      console.log('🔍 BlockNoteEditor - métodos de seleção disponíveis:');
      console.log('  - setTextCursor:', typeof editor.setTextCursor);
      console.log('  - setSelection:', typeof editor.setSelection);
      console.log('  - getSelection:', typeof editor.getSelection);
      console.log('  - addStyles:', typeof editor.addStyles);
      console.log('  - removeStyles:', typeof editor.removeStyles);
      console.log('  - toggleStyles:', typeof editor.toggleStyles);
      console.log('🔍 BlockNoteEditor - topLevelBlocks:', editor.topLevelBlocks?.length || 0);
    }
  }, [editor]);

  // Diagnóstico do schema TipTap para identificar problemas
  useEffect(() => {
    if (!editor) return;

    const tiptap = editor._tiptapEditor;
    console.log('[BN] Editor pronto?', !!tiptap);

    if (!tiptap) return;

    try {
      const nodeNames = Object.keys(tiptap.schema.nodes || {});
      const markNames = Object.keys(tiptap.schema.marks || {});
      console.log('[BN] Schema nodes:', nodeNames);
      console.log('[BN] Schema marks:', markNames);

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
          console.log(`✅ Texto encontrado no bloco ${i}: "${blockText.substring(0, 100)}..."`);
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
      console.log('🧪 === TESTE DE SELEÇÃO DE TEXTO ===');
      
      if (!editor || !editor.topLevelBlocks) {
        console.log('❌ Editor não disponível');
        return;
      }
      
      const blocks = editor.topLevelBlocks;
      console.log(`📄 Total de blocos: ${blocks.length}`);
      
      // Procurar texto nos blocos
      let found = false;
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const blockText = extractTextFromBlock(block);
        
        if (blockText && blockText.toLowerCase().includes(testText.toLowerCase())) {
          console.log(`✅ Texto "${testText}" encontrado no bloco ${i}`);
          console.log(`📝 Conteúdo do bloco: "${blockText}"`);
          
          const textIndex = blockText.toLowerCase().indexOf(testText.toLowerCase());
          
          if (textIndex !== -1) {
            console.log(`📍 Posição no texto: ${textIndex}-${textIndex + testText.length}`);
            
            // Testar setTextCursor
            if (editor.setTextCursor) {
              const selection = {
                blockId: block.id,
                startOffset: textIndex,
                endOffset: textIndex + testText.length
              };
              
              console.log(`🎯 Tentando setTextCursor:`, selection);
              editor.setTextCursor(selection);
              
              // Aguardar e tentar aplicar estilo
              setTimeout(() => {
                if (editor.addStyles) {
                  editor.addStyles({
                    backgroundColor: "yellow",
                    textColor: "default"
                  });
                  console.log(`✅ Estilo aplicado via addStyles`);
                  
                  // Limpar após 2 segundos
                  setTimeout(() => {
                    if (editor.removeStyles) {
                      editor.removeStyles(["backgroundColor"]);
                      console.log(`🧹 Estilo removido`);
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
      
      console.log('🧪 === FIM TESTE ===');
      
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
    
    // EXPOR A INSTÂNCIA DO EDITOR COMPLETA
    editor: editor,
    
        // MÉTODO PRINCIPAL PARA HIGHLIGHT - VERSÃO CORRIGIDA
    highlightText: (blockId, startOffset, endOffset, shouldHighlight = true) => {
      try {
        if (!editor) {
          console.log('❌ Editor não disponível');
          return false;
        }
        
        console.log(`🎯 highlightText chamado: block=${blockId}, range=${startOffset}-${endOffset}, highlight=${shouldHighlight}`);
        
        // Verificar se o bloco existe
        const blocks = editor.document || editor.topLevelBlocks || [];
        const blockIndex = blocks.findIndex(b => b.id === blockId);
        
        if (blockIndex === -1) {
          console.log(`❌ Bloco ${blockId} não encontrado`);
          return false;
        }
        
        let block = blocks[blockIndex];
        console.log(`✅ Bloco encontrado:`, block);
        
        // DEBUG: Mostrar conteúdo do bloco e offsets
        console.log(`🔍 Conteúdo do bloco:`, block.content);
        console.log(`🔍 Offsets recebidos: start=${startOffset}, end=${endOffset}`);

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
        console.log(`🔍 Tamanho total do bloco após normalização: ${totalLen}`);
        console.log(`🔍 Offsets após clamp: start=${a}, end=${b}`);
        
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
        console.log(`🔍 Texto que será destacado: "${blockText}"`);
        
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
          console.log('✅ Estilo aplicado via TipTap + BlockNote (com corpo resegmentado)');
        } else {
          editor.removeStyles({ backgroundColor: true, textColor: true });
          console.log('✅ Estilo removido via TipTap + BlockNote');
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
    
    // Método de debug
    debugEditor: () => {
      console.log('🔍 === DEBUG EDITOR BLOCKNOTE ===');
      console.log('- Editor instance:', editor);
      console.log('- Document:', editor.document || editor.topLevelBlocks);
      console.log('- TipTap Editor:', editor._tiptapEditor);
      console.log('- Available methods:', Object.keys(editor));
      
      // Testar cálculo de posições absolutas
      if (editor.document && editor.document.length > 0) {
        const firstBlock = editor.document[0];
        console.log('- First block:', firstBlock);
        console.log('- First block ID:', firstBlock.id);
        console.log('- First block content:', extractTextFromBlock(firstBlock));
        
        // Calcular posição absoluta do primeiro bloco
        let pos = 0;
        for (const block of editor.document) {
          pos++; // Abertura do nó
          if (block.id === firstBlock.id) {
            console.log(`- Posição absoluta do primeiro bloco: ${pos}`);
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
    }
  }), [editor, findTextInBlocks, testTextSelection, extractTextFromBlock]);

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