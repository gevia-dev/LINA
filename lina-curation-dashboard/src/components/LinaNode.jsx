import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';

const LinaNode = ({ node, onEventClick, level = 0, isLast = false, parentPath = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  // Função auxiliar para determinar estilos baseados na estabilidade
  const getStabilityStyle = (lambda) => {
    const value = lambda ?? 0.0;
    
    // Sistema de cores dinâmico e perceptível
    if (value >= 3.0) return { 
      color: '#10B981', // Verde esmeralda (muito estável)
      fontWeight: 700,
      textShadow: '0 0 1px rgba(16, 185, 129, 0.3)'
    };
    if (value >= 2.0) return { 
      color: '#34D399', // Verde (estável)
      fontWeight: 600 
    };
    if (value >= 1.5) return { 
      color: '#A78BFA', // Roxo (moderadamente estável)
      fontWeight: 500 
    };
    if (value >= 1.0) return { 
      color: '#FBBF24', // Amarelo (média estabilidade)
      fontWeight: 400 
    };
    if (value >= 0.5) return { 
      color: '#F59E0B', // Laranja (baixa estabilidade)
      fontWeight: 400,
      opacity: 0.8 
    };
    return { 
      color: '#F87171', // Vermelho (muito baixa estabilidade)
      fontWeight: 400,
      opacity: 0.6 
    };
  };

  // Função para gerar linhas-guia visuais
  const getGuideLines = () => {
    const lines = [];
    for (let i = 0; i < level; i++) {
      const isLastInPath = i === level - 1;
      const hasSiblingAfter = !isLastInPath || !isLast;
      
      lines.push(
        <div
          key={i}
          className="absolute"
          style={{
            left: `${i * 16 + 6}px`,
            top: '50%',
            width: '1px',
            height: '100%',
            backgroundColor: hasSiblingAfter ? 'var(--border-secondary)' : 'transparent'
          }}
        />
      );
    }
    return lines;
  };

  // Função para gerar linha horizontal conectando ao pai
  const getHorizontalLine = () => {
    if (level === 0) return null;
    
    return (
      <div
        className="absolute"
        style={{
          left: `${(level - 1) * 16 + 6}px`,
          top: '50%',
          width: '10px',
          height: '1px',
          backgroundColor: 'var(--border-secondary)'
        }}
      />
    );
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
    <div className="relative">
      {/* Linhas-guia verticais */}
      {getGuideLines()}
      
      {/* Linha horizontal conectando ao pai */}
      {getHorizontalLine()}
      
      <div
        className="flex items-center py-2 px-2 rounded-md cursor-pointer transition-all duration-200 relative"
        style={{
          paddingLeft: `${paddingLeft}px`,
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          marginLeft: level > 0 ? '16px' : '0'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--primary-green-light)';
          e.currentTarget.style.transform = 'translateX(2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.transform = 'translateX(0)';
        }}
        onClick={handleClick}
      >
        {/* Ícone de expandir/colapsar */}
        <div className="mr-2 flex-shrink-0">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown 
                size={16} 
                style={{ 
                  color: 'var(--text-secondary)',
                  transition: 'transform 0.2s ease'
                }} 
              />
            ) : (
              <ChevronRight 
                size={16} 
                style={{ 
                  color: 'var(--text-secondary)',
                  transition: 'transform 0.2s ease'
                }} 
              />
            )
          ) : (
            <div style={{ width: 16 }} />
          )}
        </div>

        {/* Ícone baseado em se tem filhos ou não */}
        <div className="mr-2 flex-shrink-0">
          {hasChildren ? (
            <Folder 
              size={16} 
              style={{ 
                color: 'var(--primary-green)',
                filter: 'drop-shadow(0 1px 2px rgba(34, 197, 94, 0.2))'
              }} 
            />
          ) : (
            <FileText 
              size={16} 
              style={{ 
                color: 'var(--status-info)',
                filter: 'drop-shadow(0 1px 2px rgba(59, 130, 246, 0.2))'
              }} 
            />
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div 
            className="text-sm transition-all duration-200 truncate"
            style={{
              ...getStabilityStyle(node.lambda_persistence),
              transition: 'all 0.2s ease'
            }}
          >
            {node.llm_title}
            {/* Indicador de estabilidade */}
            {node.lambda_persistence !== null && node.lambda_persistence !== undefined && (
              <span 
                className="ml-2 text-xs font-mono"
                style={{ 
                  color: 'var(--text-secondary)',
                  opacity: 0.7
                }}
              >
                λ:{node.lambda_persistence.toFixed(1)}
              </span>
            )}
            {/* Indicador de nó promovido pela poda */}
            {node.promotedFromParent && (
              <span 
                className="ml-1 text-xs px-1 rounded"
                style={{ 
                  backgroundColor: 'var(--primary-green-light)',
                  color: 'var(--primary-green)',
                  fontSize: '10px',
                  fontWeight: '500'
                }}
                title="Nó promovido pela poda por relevância"
              >
                ↑
              </span>
            )}
          </div>
          {node.llm_summary && (
            <div 
              className="text-xs mt-1 line-clamp-2"
              style={{ 
                color: 'var(--text-secondary)',
                lineHeight: '1.3'
              }}
            >
              {node.llm_summary}
            </div>
          )}
        </div>
      </div>

      {/* Filhos */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {node.children.map((child, index) => (
            <LinaNode
              key={child.id}
              node={child}
              onEventClick={onEventClick}
              level={level + 1}
              isLast={index === node.children.length - 1}
              parentPath={[...parentPath, node.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LinaNode;