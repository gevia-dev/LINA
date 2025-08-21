// BlockNoteEditor.jsx
import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';

import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

const BlockNoteEditor = forwardRef(({ initialContent = '', onChange }, ref) => {
  const editor = useCreateBlockNote();

  useEffect(() => {
    if (editor?.isMounted && typeof initialContent === 'string') {
      const blocks = editor.tryParseMarkdownToBlocks(initialContent);
      if (Array.isArray(blocks)) {
        editor.replaceBlocks(editor.topLevelBlocks, blocks);
      }
    }
  }, [editor, initialContent, editor?.isMounted]);

  useEffect(() => {
    if (!editor) return;
    const unsubscribe = editor.onEditorContentChange(() => {
      const markdown = editor.blocksToMarkdownLossy(editor.topLevelBlocks);
      onChange(markdown);
    });
    return unsubscribe;
  }, [editor, onChange]);

  useImperativeHandle(ref, () => ({
    getMarkdown: () => editor?.blocksToMarkdownLossy(editor.topLevelBlocks) || '',
    getBlocks: () => editor?.topLevelBlocks || [],
    editor: editor,
  }));

  if (!editor) {
    return <div>Carregando editor...</div>;
  }

  return (
    <div className="notion-editor w-full h-full overflow-hidden">
      <BlockNoteView editor={editor} theme="dark" editable={true} />
    </div>
  );
});

BlockNoteEditor.displayName = 'BlockNoteEditor';
export default BlockNoteEditor;