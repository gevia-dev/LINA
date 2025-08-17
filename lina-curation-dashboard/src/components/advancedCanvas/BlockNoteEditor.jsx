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

  const editor = useCreateBlockNote({ 
    initialContent: initialContent ? convertMarkdownToBlocks(initialContent) : undefined 
  });

  // Debug: verificar métodos disponíveis no editor
  useEffect(() => {
    if (editor) {
      console.log('🔍 BlockNoteEditor - editor criado:', editor);
      console.log('🔍 BlockNoteEditor - métodos disponíveis:', Object.getOwnPropertyNames(editor));
      console.log('🔍 BlockNoteEditor - topLevelBlocks:', editor.topLevelBlocks);
    }
  }, [editor]);

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
    // ADICIONADO: Expor a instância do editor para uso no NotionLikePage
    editor: editor
  }), [editor]);

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