import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Clock, User, Tag } from 'lucide-react';

const ArticleDetailsSidebar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handleLeafClick = (event) => {
      const { node, path } = event.detail;
    
      
      setSelectedArticle({
        ...node,
        hierarchyPath: path
      });
      
      // Animação de entrada
      setIsAnimating(true);
      setIsVisible(true);
      
      setTimeout(() => setIsAnimating(false), 300);
    };

    const handleClusterClick = (event) => {
      const { node } = event.detail;
    
      
      // Fecha sidebar ao navegar para cluster
      if (isVisible) {
        handleClose();
      }
    };

    const handleHover = (event) => {
      const { node, isEntering } = event.detail;
      
      if (isEntering && !node.children) {
        // Pré-carrega dados do artigo no hover de folhas
    
      }
    };

    // Registra event listeners
    window.addEventListener('bubbleChart:leafClick', handleLeafClick);
    window.addEventListener('bubbleChart:clusterClick', handleClusterClick);
    window.addEventListener('bubbleChart:hover', handleHover);

    return () => {
      window.removeEventListener('bubbleChart:leafClick', handleLeafClick);
      window.removeEventListener('bubbleChart:clusterClick', handleClusterClick);
      window.removeEventListener('bubbleChart:hover', handleHover);
    };
  }, [isVisible]);

  const handleClose = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setSelectedArticle(null);
      setIsAnimating(false);
    }, 300);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Data inválida';
    }
  };

  if (!isVisible || !selectedArticle) return null;

  return (
    <>
      {/* Overlay para fechar ao clicar fora */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
        style={{
          animation: isAnimating ? 'fadeIn 0.3s ease-out' : 'none'
        }}
      />
      
      {/* Sidebar */}
      <div 
        className="fixed right-0 top-0 h-full w-96 z-50 shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          transform: isAnimating ? 'translateX(0)' : 'translateX(0)',
          animation: isAnimating ? 'slideInRight 0.3s ease-out' : 'none'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className="text-lg font-semibold">Detalhes do Artigo</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Breadcrumb do caminho hierárquico */}
        {selectedArticle.hierarchyPath && selectedArticle.hierarchyPath.length > 0 && (
          <div className="p-4 border-b border-gray-600 bg-gray-800">
            <div className="text-xs text-gray-400 mb-2">Caminho na hierarquia:</div>
            <div className="flex flex-wrap gap-1 text-xs">
              {selectedArticle.hierarchyPath.map((pathItem, index) => (
                <span key={index} className="flex items-center">
                  <span className="bg-blue-600 px-2 py-1 rounded text-white">
                    {pathItem.title}
                  </span>
                  {index < selectedArticle.hierarchyPath.length - 1 && (
                    <span className="mx-1 text-gray-500">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Título */}
          <div>
            <h3 className="text-xl font-bold mb-2 leading-tight">
              {selectedArticle.llm_title || selectedArticle.id || 'Título não disponível'}
            </h3>
            
            {/* Metadados */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
              {selectedArticle.published_date && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(selectedArticle.published_date)}
                </div>
              )}
              
              {selectedArticle.source && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {selectedArticle.source}
                </div>
              )}
              
              {selectedArticle.lambda_persistence && (
                <div className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  Estabilidade: {selectedArticle.lambda_persistence.toFixed(3)}
                </div>
              )}
            </div>
          </div>
          
          {/* Resumo */}
          {selectedArticle.llm_summary && (
            <div>
              <h4 className="font-semibold mb-2 text-blue-300">Resumo</h4>
              <p className="text-gray-300 leading-relaxed">
                {selectedArticle.llm_summary}
              </p>
            </div>
          )}
          
          {/* URL original */}
          {selectedArticle.url && (
            <div>
              <h4 className="font-semibold mb-2 text-blue-300">Link Original</h4>
              <a
                href={selectedArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ver artigo completo
              </a>
            </div>
          )}
          
          {/* Dados técnicos */}
          <div>
            <h4 className="font-semibold mb-2 text-blue-300">Dados Técnicos</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">ID:</span>
                <span className="font-mono text-xs">{selectedArticle.id || 'N/A'}</span>
              </div>
              
              {selectedArticle.lambda_persistence && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Lambda Persistence:</span>
                  <span>{selectedArticle.lambda_persistence.toFixed(6)}</span>
                </div>
              )}
              
              {selectedArticle.cluster_id && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Cluster ID:</span>
                  <span className="font-mono text-xs">{selectedArticle.cluster_id}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS para animações */}
      <style>{`
        @keyframes slideInRight {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(0);
          }
        }
        
        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default ArticleDetailsSidebar;