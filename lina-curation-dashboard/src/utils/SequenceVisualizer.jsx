// components/SequenceVisualizer.jsx
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ArrowRight, Hash, Type, Eye, EyeOff } from 'lucide-react';

/**
 * Componente para visualizar e gerenciar a sequência de texto gerada pelas conexões
 */
const SequenceVisualizer = ({ 
  sequences = [], 
  textMapping = new Map(), 
  isVisible = false, 
  onToggleVisibility = () => {},
  onSequenceReorder = () => {},
  className = '' 
}) => {
  const [expandedSegments, setExpandedSegments] = useState(new Set());

  const toggleSegmentExpansion = useCallback((segmentId) => {
    setExpandedSegments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(segmentId)) {
        newSet.delete(segmentId);
      } else {
        newSet.add(segmentId);
      }
      return newSet;
    });
  }, []);

  const SequenceItem = ({ node, index, isLast, segmentId }) => {
    const isSegment = node.type === 'segmentNode';
    const isItem = node.type === 'itemNode';
    
    // Obter marcador de referência se for um item
    const marker = isItem && textMapping.has(node.data.title) 
      ? textMapping.get(node.data.title) 
      : null;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex items-start gap-3 py-2"
      >
        {/* Indicador de posição */}
        <div className="flex flex-col items-center">
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
            style={{
              backgroundColor: isSegment ? 'var(--primary-green)' : 'var(--bg-tertiary)',
              color: isSegment ? 'white' : 'var(--text-secondary)'
            }}
          >
            {isSegment ? '#' : index}
          </div>
          {!isLast && (
            <div 
              className="w-0.5 h-6 mt-1"
              style={{ backgroundColor: 'var(--border-primary)' }}
            />
          )}
        </div>

        {/* Conteúdo do item */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isSegment ? (
              <>
                <Hash size={14} style={{ color: 'var(--primary-green)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {node.data.title}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--primary-green-transparent)', color: 'var(--primary-green)' }}>
                  Seção
                </span>
              </>
            ) : (
              <>
                <Type size={14} style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {node.data.title}
                </span>
                {marker && (
                  <span 
                    className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    {marker}
                  </span>
                )}
              </>
            )}
          </div>
          
          {isItem && node.data.phrase && (
            <p className="text-xs text-gray-500 line-clamp-2">
              {node.data.phrase.length > 100 
                ? `${node.data.phrase.substring(0, 100)}...` 
                : node.data.phrase}
            </p>
          )}
        </div>

        {/* Indicador de próximo item */}
        {!isLast && (
          <ArrowRight 
            size={12} 
            style={{ color: 'var(--text-secondary)', marginTop: 4 }} 
          />
        )}
      </motion.div>
    );
  };

  const SegmentSection = ({ segment, sequence, segmentIndex }) => {
    const isExpanded = expandedSegments.has(segment.segment.id);
    const itemCount = sequence.length - 1; // Excluir o próprio segment

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: segmentIndex * 0.1 }}
        className="border rounded-lg mb-3"
        style={{ 
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)'
        }}
      >
        {/* Header do segment */}
        <button
          onClick={() => toggleSegmentExpansion(segment.segment.id)}
          className="w-full p-3 flex items-center justify-between text-left hover:bg-opacity-80 transition-colors rounded-t-lg"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div className="flex items-center gap-2">
            <Hash size={16} style={{ color: 'var(--primary-green)' }} />
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {segment.segment.data.title}
            </span>
            <span 
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--primary-green-transparent)', color: 'var(--primary-green)' }}
            >
              {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </span>
          </div>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Lista de itens */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-0">
                {sequence.map((node, index) => (
                  <SequenceItem
                    key={`${segment.segment.id}-${node.id}-${index}`}
                    node={node}
                    index={index}
                    isLast={index === sequence.length - 1}
                    segmentId={segment.segment.id}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed bottom-4 right-4 p-3 rounded-full shadow-lg z-30"
        style={{ backgroundColor: 'var(--primary-green)', color: 'white' }}
        title="Mostrar sequência de texto"
      >
        <Eye size={20} />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={`fixed right-4 top-4 bottom-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-30 flex flex-col ${className}`}
      style={{ 
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-primary)',
        border: '1px solid var(--border-primary)'
      }}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Sequência do Texto
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {sequences.length} {sequences.length === 1 ? 'seção' : 'seções'} • {textMapping.size / 2} marcadores
          </p>
        </div>
        <button
          onClick={onToggleVisibility}
          className="p-1 rounded hover:bg-opacity-80"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
          title="Ocultar sequência"
        >
          <EyeOff size={16} />
        </button>
      </div>

      {/* Lista de sequências */}
      <div className="flex-1 overflow-y-auto p-4">
        {sequences.length > 0 ? (
          sequences.map((segment, index) => (
            <SegmentSection
              key={segment.segment.id}
              segment={segment}
              sequence={segment.sequence}
              segmentIndex={index}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <Type size={32} style={{ color: 'var(--text-secondary)', margin: '0 auto 8px' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Nenhuma sequência de conexões encontrada
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Conecte nodes no canvas para gerar texto
            </p>
          </div>
        )}
      </div>

      {/* Footer com estatísticas */}
      {sequences.length > 0 && (
        <div 
          className="p-3 border-t text-xs"
          style={{ 
            borderColor: 'var(--border-primary)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)'
          }}
        >
          <div className="flex justify-between">
            <span>Total de itens:</span>
            <span>{sequences.reduce((acc, seg) => acc + (seg.sequence.length - 1), 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Marcadores:</span>
            <span>{textMapping.size / 2}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SequenceVisualizer;