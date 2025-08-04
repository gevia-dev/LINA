import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, Calendar } from 'lucide-react';

const LinaNode = ({ node, onEventClick, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  
  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleClick = () => {
    if (node.type === 'event') {
      onEventClick?.(node.id);
    } else {
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

        {/* Ícone do tipo */}
        <div className="mr-2 flex-shrink-0">
          {node.type === 'topic' ? (
            <Folder size={16} style={{ color: 'var(--primary-green)' }} />
          ) : (
            <Calendar size={16} style={{ color: 'var(--status-info)' }} />
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div 
            className="font-medium text-sm truncate"
            style={{ color: 'var(--text-primary)' }}
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