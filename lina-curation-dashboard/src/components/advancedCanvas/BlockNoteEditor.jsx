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
        
        const block = blocks[blockIndex];
        console.log(`✅ Bloco encontrado:`, block);
        
        // DEBUG: Mostrar conteúdo do bloco e offsets
        console.log(`🔍 Conteúdo do bloco:`, block.content);
        console.log(`🔍 Offsets recebidos: start=${startOffset}, end=${endOffset}`);
        
        // Verificar se os offsets fazem sentido
        const totalBlockLength = block.content.reduce((len, inline) => len + (inline.text?.length || 0), 0);
        console.log(`🔍 Tamanho total do bloco: ${totalBlockLength}`);
        
        if (endOffset > totalBlockLength) {
          console.log(`⚠️ AVISO: endOffset (${endOffset}) é maior que o tamanho do bloco (${totalBlockLength})`);
        }
        
        // DEBUG: Mostrar texto exato que será destacado
        let blockText = '';
        let currentPos = 0;
        for (const inline of block.content) {
          const inlineText = inline.text || '';
          if (currentPos + inlineText.length >= startOffset && currentPos < endOffset) {
            const startInInline = Math.max(0, startOffset - currentPos);
            const endInInline = Math.min(inlineText.length, endOffset - currentPos);
            const textToHighlight = inlineText.substring(startInInline, endInInline);
            blockText += `[${textToHighlight}]`;
          } else {
            blockText += inlineText;
          }
          currentPos += inlineText.length;
        }
        console.log(`🔍 Texto que será destacado: "${blockText}"`);
        
        // MÉTODO 1: Usar a API de seleção do BlockNote corretamente
        try {
          // Função auxiliar para calcular posição absoluta no documento TipTap
          const calculateAbsolutePos = (editor, blockId, startOffset, endOffset) => {
            let pos = 0;
            const blocks = editor.document || editor.topLevelBlocks || [];
            
            for (const block of blocks) {
              // O TipTap adiciona 1 de posição para a "abertura" do nó do bloco
              pos++;
              
              if (block.id === blockId) {
                // CORREÇÃO: Os offsets já são posições absolutas dentro do bloco
                // Não precisamos adicionar a posição base do bloco
                const from = pos + startOffset;
                const to = pos + endOffset;
                
                console.log(`📍 Posições calculadas CORRETAMENTE: from=${from}, to=${to}`);
                console.log(`📍 Base do bloco: ${pos}, offsets: ${startOffset}-${endOffset}`);
                console.log(`📍 Range final: ${from}-${to}`);
                
                return { from, to };
              }
              
              // Adiciona o tamanho do conteúdo do bloco
              const blockLength = block.content.reduce((len, inline) => len + (inline.text?.length || 0), 0);
              pos += blockLength;
              
              // O TipTap adiciona 1 de posição para o "fechamento" do nó do bloco
              pos++;
            }
            return null; // Bloco não encontrado
          };
          
          // Calcular posição absoluta no documento
          const range = calculateAbsolutePos(editor, blockId, startOffset, endOffset);
          
          if (range) {
            console.log(`📍 Posições calculadas: from=${range.from}, to=${range.to}`);
            
            // Usar a API do TipTap para selecionar o texto
            if (editor._tiptapEditor) {
              const tiptapEditor = editor._tiptapEditor;
              
              // 1. Selecionar o texto programaticamente usando a API do TipTap
              tiptapEditor.commands.setTextSelection(range);
              
              // 2. Aplicar o estilo usando a API do BlockNote
              if (shouldHighlight) {
                editor.addStyles({
                  backgroundColor: "yellow",
                  textColor: "black" // Garantir contraste
                });
                console.log('✅ Estilo aplicado via BlockNote API + TipTap selection');
              } else {
                // Corrigir: removeStyles espera um objeto, não um array
                editor.removeStyles({
                  backgroundColor: true,
                  textColor: true
                });
                console.log('✅ Estilo removido via BlockNote API + TipTap selection');
              }
              
              // 3. Limpar a seleção - usar comando correto do TipTap
              if (tiptapEditor.commands.clearSelection) {
                tiptapEditor.commands.clearSelection();
              } else if (tiptapEditor.commands.blur) {
                tiptapEditor.commands.blur();
              }
              
          return true;
            }
        } else {
            console.log('❌ Não foi possível calcular posições absolutas');
          }
        } catch (apiError) {
          console.log('⚠️ Método BlockNote API falhou:', apiError);
        }
        
        // MÉTODO 2: Acessar o TipTap editor interno (fallback)
        if (editor._tiptapEditor) {
          try {
            const tiptap = editor._tiptapEditor;
            const doc = tiptap.state.doc;
            
            // Calcular posição absoluta no documento
            let currentPos = 0;
            let targetFromPos = -1;
            let targetToPos = -1;
            
            // Percorrer o documento para encontrar as posições
            doc.descendants((node, pos) => {
              if (targetFromPos >= 0 && targetToPos >= 0) return false;
              
              // Verificar se é o bloco que procuramos
              if (node.type.name === 'blockContainer') {
                const nodeBlockId = node.attrs?.id;
                if (nodeBlockId === blockId) {
                  // Encontramos o bloco
                  targetFromPos = pos + 1 + startOffset; // +1 para pular o próprio node
                  targetToPos = pos + 1 + endOffset;
        return false;
      }
              }
              
              return true;
            });
            
            if (targetFromPos >= 0 && targetToPos >= 0) {
              console.log(`📍 Posições TipTap: from=${targetFromPos}, to=${targetToPos}`);
              
              // Criar transação para aplicar o estilo
              const tr = tiptap.state.tr;
              
              if (shouldHighlight) {
                // Adicionar marca de highlight
                const mark = tiptap.schema.marks.backgroundColor.create({
                  backgroundColor: 'yellow'
                });
                tr.addMark(targetFromPos, targetToPos, mark);
              } else {
                // Remover marca de highlight - usar método correto
                try {
                  tr.removeMark(targetFromPos, targetToPos, tiptap.schema.marks.backgroundColor);
                } catch (markError) {
                  // Fallback: limpar todas as marcas de estilo
                  tr.removeMark(targetFromPos, targetToPos);
                }
              }
              
              // Aplicar a transação
              tiptap.view.dispatch(tr);
              console.log('✅ Estilo aplicado via TipTap');
          return true;
        } else {
              console.log('❌ Não foi possível calcular posições no TipTap');
            }
          } catch (tiptapError) {
            console.log('❌ Método TipTap falhou:', tiptapError);
          }
        }
        
        // MÉTODO 3: Manipulação direta do DOM (último recurso)
        try {
          // Aguardar um tick para garantir que o DOM está atualizado
          setTimeout(() => {
            const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
            if (blockElement) {
              const textNodes = [];
              const walker = document.createTreeWalker(
                blockElement,
                NodeFilter.SHOW_TEXT,
                null,
                false
              );
              
              let node;
              while (node = walker.nextNode()) {
                textNodes.push(node);
              }
              
              // Aplicar highlight nos nodes de texto
              let currentOffset = 0;
              textNodes.forEach(textNode => {
                const nodeLength = textNode.textContent.length;
                const nodeStart = currentOffset;
                const nodeEnd = currentOffset + nodeLength;
                
                if (nodeEnd > startOffset && nodeStart < endOffset) {
                  // Este node está dentro do range
                  const parent = textNode.parentElement;
                  if (shouldHighlight) {
                    parent.style.backgroundColor = 'yellow';
                    parent.style.color = 'black';
                  } else {
                    parent.style.backgroundColor = '';
                    parent.style.color = '';
                  }
                }
                
                currentOffset += nodeLength;
              });
              
              console.log('✅ Estilo aplicado via DOM');
            }
          }, 10);
          
          return true;
        } catch (domError) {
          console.log('❌ Método DOM falhou:', domError);
        }
        
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