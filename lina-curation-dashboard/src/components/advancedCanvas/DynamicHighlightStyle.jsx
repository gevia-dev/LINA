import React from 'react';

const DynamicHighlightStyle = ({ highlightedIds = [] }) => {
  // Estilos base para fazer os links parecerem texto normal
  const baseStyle = `
    .ProseMirror a[data-source-ids] {
      color: inherit !important;
      text-decoration: none !important;
      cursor: default !important;
    }
  `;

  // Gera as regras de CSS dinâmicas para o highlight
  const dynamicRules = highlightedIds
    .map(id => 
      `a[data-source-ids~="${id}"] {
          position: relative;
          background-color: rgba(52, 211, 153, 0.2);
          border-radius: 3px;
          transition: background-color 0.2s ease;
      }`
    )
    .join('\n');

  return <style>{baseStyle + '\n' + dynamicRules}</style>;
};

export default DynamicHighlightStyle;

