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
        // Por enquanto, retornar texto simples dos blocos
        if (editor.topLevelBlocks) {
          return editor.topLevelBlocks.map(block => {
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
    getBlocks: () => editor.topLevelBlocks || [],
    insertContent: (content) => {
      try {
        console.log('🔍 BlockNoteEditor - tentando inserir conteúdo:', content);
        // Por enquanto, apenas logar a tentativa de inserção
      } catch (error) {
        console.error('Erro ao inserir conteúdo:', error);
      }
    },
    // EXPOR A INSTÂNCIA DO EDITOR COMPLETA
    editor: editor,
    
    // MÉTODOS ESPECÍFICOS PARA SELEÇÃO DE TEXTO (corrigidos)
    setTextCursor: (selection) => {
      try {
        if (editor.setTextCursor && typeof editor.setTextCursor === 'function') {
          editor.setTextCursor(selection);
          console.log('✅ setTextCursor executado:', selection);
          return true;
        } else {
          console.log('❌ setTextCursor não disponível no editor');
          return false;
        }
      } catch (e) {
        console.error('❌ Erro em setTextCursor:', e);
        return false;
      }
    },
    
    setSelection: (selection) => {
      try {
        if (editor.setSelection && typeof editor.setSelection === 'function') {
          editor.setSelection(selection);
          console.log('✅ setSelection executado:', selection);
          return true;
        } else {
          console.log('❌ setSelection não disponível no editor');
          return false;
        }
      } catch (e) {
        console.error('❌ Erro em setSelection:', e);
        return false;
      }
    },
    
    addStyles: (styles) => {
      try {
        if (editor.addStyles && typeof editor.addStyles === 'function') {
          editor.addStyles(styles);
          console.log('✅ addStyles executado:', styles);
          return true;
        } else {
          console.log('❌ addStyles não disponível no editor');
          return false;
        }
      } catch (e) {
        console.error('❌ Erro em addStyles:', e);
        return false;
      }
    },
    
    removeStyles: (styleNames) => {
      try {
        if (editor.removeStyles && typeof editor.removeStyles === 'function') {
          editor.removeStyles(styleNames);
          console.log('✅ removeStyles executado:', styleNames);
          return true;
        } else {
          console.log('❌ removeStyles não disponível no editor');
          return false;
        }
      } catch (e) {
        console.error('❌ Erro em removeStyles:', e);
        return false;
      }
    },
    
    toggleStyles: (styles) => {
      try {
        if (editor.toggleStyles && typeof editor.toggleStyles === 'function') {
          editor.toggleStyles(styles);
          console.log('✅ toggleStyles executado:', styles);
          return true;
        } else {
          console.log('❌ toggleStyles não disponível no editor');
          return false;
        }
      } catch (e) {
        console.error('❌ Erro em toggleStyles:', e);
        return false;
      }
    },
    
    findTextInBlocks: findTextInBlocks,
    
    // Método de teste para seleção
    testTextSelection: testTextSelection,
    
    // Método para acessar métodos do editor diretamente
    getEditorMethods: () => {
      console.log('🔍 Métodos disponíveis no editor:', Object.keys(editor));
      return {
        setTextCursor: editor.setTextCursor,
        setSelection: editor.setSelection,
        getSelection: editor.getSelection,
        addStyles: editor.addStyles,
        removeStyles: editor.removeStyles,
        toggleStyles: editor.toggleStyles,
        updateBlock: editor.updateBlock,
        insertBlocks: editor.insertBlocks,
        removeBlocks: editor.removeBlocks,
        replaceBlocks: editor.replaceBlocks,
        topLevelBlocks: editor.topLevelBlocks
      };
    },
    
    // Método para debug completo do editor
    debugEditor: () => {
      console.log('🔍 === DEBUG EDITOR BLOCKNOTE (SELEÇÃO) ===');
      console.log('- Editor instance:', editor);
      console.log('- Available methods:', Object.keys(editor));
      console.log('- topLevelBlocks length:', editor.topLevelBlocks?.length || 0);
      
      // Testar métodos de seleção específicos
      const selectionMethods = [
        'setTextCursor', 'setSelection', 'getSelection'
      ];
      
      const styleMethods = [
        'addStyles', 'removeStyles', 'toggleStyles'
      ];
      
      const blockMethods = [
        'updateBlock', 'insertBlocks', 'removeBlocks', 'replaceBlocks'
      ];
      
      console.log('🎯 Métodos de seleção:');
      selectionMethods.forEach(method => {
        console.log(`  - ${method}:`, typeof editor[method], editor[method] ? '✅ Disponível' : '❌ Não disponível');
      });
      
      console.log('🎨 Métodos de estilo:');
      styleMethods.forEach(method => {
        console.log(`  - ${method}:`, typeof editor[method], editor[method] ? '✅ Disponível' : '❌ Não disponível');
      });
      
      console.log('📝 Métodos de bloco:');
      blockMethods.forEach(method => {
        console.log(`  - ${method}:`, typeof editor[method], editor[method] ? '✅ Disponível' : '❌ Não disponível');
      });
      
      if (editor.topLevelBlocks && editor.topLevelBlocks.length > 0) {
        console.log('📄 Primeiro bloco:', editor.topLevelBlocks[0]);
        const firstBlockText = extractTextFromBlock(editor.topLevelBlocks[0]);
        console.log('📝 Texto do primeiro bloco:', `"${firstBlockText}"`);
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