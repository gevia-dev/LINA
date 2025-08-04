import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';

const LinaNode = ({ node, onEventClick, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  // Função auxiliar para determinar estilos baseados na estabilidade
  const getStabilityStyle = (lambda) => {
    const value = lambda ?? 1.0; // Valor padrão caso seja nulo
    if (value >= 2.5) return { color: '#34D399', fontWeight: 600 }; // Verde forte (muito estável)
    if (value >= 1.5) return { color: '#A78BFA' }; // Roxo (estável)
    if (value >= 0.7) return { color: '#FBBF24', opacity: 0.9 }; // Amarelo (média estabilidade)
    return { color: '#F87171', opacity: 0.7 }; // Vermelho (baixa estabilidade)
  };
  
  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleClick = () => {
    // Se não tem filhos, é um evento (nó folha)
    // Se tem filhos, é uma pasta/tópico
    if (!hasChildren && node.id) {
      onEventClick?.(node.id);
    } else if (hasChildren) {
      handleToggle();
    }
  };

  const paddingLeft = level * 16 + 12;

  return (
    <div>
      <div
        className="flex items-center py-2 px-2 rounded-md cursor-pointer transition-colors"
        style={{
          paddingLeft: `${paddingLeft}px`,
          backgroundColor: 'transparent',
          color: 'var(--text-primary)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--primary-green-light)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        onClick={handleClick}
      >
        {/* Ícone de expandir/colapsar */}
        <div className="mr-2 flex-shrink-0">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
            ) : (
              <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
            )
          ) : (
            <div style={{ width: 16 }} />
          )}
        </div>

        {/* Ícone baseado em se tem filhos ou não */}
        <div className="mr-2 flex-shrink-0">
          {hasChildren ? (
            <Folder size={16} style={{ color: 'var(--primary-green)' }} />
          ) : (
            <FileText size={16} style={{ color: 'var(--status-info)' }} />
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div 
            className="text-sm transition-all duration-200 truncate"
            style={getStabilityStyle(node.lambda_persistence)}
          >
            {node.llm_title}
          </div>
          {node.llm_summary && (
            <div 
              className="text-xs mt-1 line-clamp-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {node.llm_summary}
            </div>
          )}
        </div>
      </div>

      {/* Filhos */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <LinaNode
              key={child.id}
              node={child}
              onEventClick={onEventClick}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LinaNode;