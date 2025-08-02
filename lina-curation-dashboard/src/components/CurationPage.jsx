import React from 'react';
import MainSidebar from './MainSidebar';
import EditorPanel from './EditorPanel';
import ContextSidebar from './ContextSidebar';

const CurationPage = () => {
  return (
    <div className="w-full min-h-screen flex" style={{ backgroundColor: '#121212' }}>
      {/* Coluna Esquerda - Navegação */}
      <div className="w-64">
        <MainSidebar />
      </div>
      
      {/* Coluna Central - Editor */}
      <div className="flex-1">
        <EditorPanel />
      </div>
      
      {/* Coluna Direita - Contexto */}
      <div className="w-80">
        <ContextSidebar />
      </div>
    </div>
  );
};

export default CurationPage;