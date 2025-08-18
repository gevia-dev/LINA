import React, { forwardRef, useImperativeHandle, useEffect, useRef, useState, useCallback } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';



const BlockNoteEditor = forwardRef(({ initialContent = '', onChange, onScroll, onCanvasItemDragStart }, ref) => {

  
  // Converter texto markdown simples para blocos BlockNote
  const convertMarkdownToBlocks = (markdown) => {
    if (!markdown || typeof markdown !== 'string') return [];
    
  
    
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
    },
    // Adiciona plugin ProseMirror para ocultar spans que representam [n]
    domAttributes: {},
    slashMenuItems: undefined
  });



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





  // Regex pega clusters também: " [15] [16] " (com ou sem espaços)
  const REF_RE = /\s*\[\d+\]\s*/g;

  // Converte offsets relativos ao bloco -> posições absolutas no doc TipTap
  const getDocRangeForBlockOffsets = useCallback((blockId, startOffset, endOffset) => {
    const tiptap = editor?._tiptapEditor;
    if (!tiptap) return null;

    let from = -1, to = -1;
    tiptap.state.doc.descendants((node, pos) => {
      if (from !== -1 && to !== -1) return false;
      if (node.type.name === 'blockContainer' && node.attrs?.id === blockId) {
        const base = pos + 1; // início do conteúdo do bloco
        from = base + startOffset;
        to   = base + endOffset;
        return false;
      }
      return true;
    });
    return (from >= 0 && to >= 0) ? { from, to } : null;
  }, [editor]);

  // Aplica "invisibilidade" só nos trechos que são [n] (clusters ou isolados)
  const hideMarkersInBlock = useCallback((block) => {
    try {
      if (!editor || !block || block.type !== 'paragraph') return;
      const tiptap = editor._tiptapEditor;
      if (!tiptap) return;

      // Texto flatten do bloco (não altera conteúdo)
      const flat = (block.content || []).map(n => n?.text || '').join('');
      REF_RE.lastIndex = 0;

      let m;
      while ((m = REF_RE.exec(flat)) !== null) {
        const start = m.index;
        const end   = start + m[0].length;

        const abs = getDocRangeForBlockOffsets(block.id, start, end);
        if (!abs) continue;

        // Seleciona exatamente o [n] (ou cluster) e aplica estilo invisível
        tiptap.commands.setTextSelection(abs);
        // textColor aceita CSS válido; rgba(0,0,0,0) fica invisível em qualquer tema
        editor.addStyles({ textColor: 'rgba(0,0,0,0)' });
      }

      // limpa seleção (para não "ficar selecionado" visualmente)
      if (tiptap.commands.clearSelection) {
        tiptap.commands.clearSelection();
      } else {
        tiptap.commands.setTextSelection({ from: 0, to: 0 });
      }
    } catch (e) {
      console.log('⚠️ hideMarkersInBlock falhou:', e);
    }
  }, [editor, getDocRangeForBlockOffsets]);

  // Aplica em todos os parágrafos do doc (chamar uma vez após montar)
  const hideMarkersInAllBlocks = useCallback(() => {
    try {
      if (!editor) return;
      const blocks = editor.document || editor.topLevelBlocks || [];
      for (const b of blocks) {
        hideMarkersInBlock(b);
      }
    } catch (e) {
      console.log('⚠️ hideMarkersInAllBlocks falhou:', e);
    }
  }, [editor, hideMarkersInBlock]);

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
        
    
        
        // Verificar se o bloco existe
        const blocks = editor.document || editor.topLevelBlocks || [];
        const blockIndex = blocks.findIndex(b => b.id === blockId);
        
        if (blockIndex === -1) {
  
          return false;
        }
        
                let block = blocks[blockIndex];

        // Reaplicar invisibilidade dos [n] deste bloco, para evitar "piscar" em re-renders
        try { hideMarkersInBlock(block); } catch {}


        // Releia o bloco após os updates (para garantir offsets estáveis)
        const blocksNow = editor.document || editor.topLevelBlocks || [];
        const blockNow = blocksNow.find(b => b.id === block.id) || block;
        const totalLen = (blockNow.content || []).reduce((s, n) => s + (n.text?.length || 0), 0);

        // Clamp defensivo
        const a = Math.max(0, Math.min(startOffset, totalLen));
        const b = Math.max(a, Math.min(endOffset, totalLen));
        

        
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
          return false;
        }

        // 🔧 3) Aplicar highlight via TipTap (igual "como antes")
            const tiptap = editor._tiptapEditor;
        tiptap.commands.focus(undefined, { scrollIntoView: false }); // garante visibilidade
        tiptap.commands.setTextSelection(range);

        // Use a API do BlockNote para o mark de estilo (compatível com o schema dele)
              if (shouldHighlight) {
          editor.addStyles({ backgroundColor: 'yellow', textColor: 'black' });
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
        
        return false;
      } catch (error) {

        return false;
      }
    },
    

  }), [editor, extractTextFromBlock]);

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

  // Oculta marcadores [n] após o editor estar pronto
  useEffect(() => {
    if (!editor || !editor._tiptapEditor) return;

    // Oculta todos os marcadores na UI (sem mudar o conteúdo)
    hideMarkersInAllBlocks();

    // Se o doc mudar (ex.: setar novo conteúdo), reaplica
    const interval = setInterval(() => {
      try { hideMarkersInAllBlocks(); } catch {}
    }, 300); // leve "watcher" (idempotente)

    return () => clearInterval(interval);
  }, [editor, hideMarkersInAllBlocks]);



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