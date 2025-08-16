import React from 'react';
import { getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';
import { Trash2 } from 'lucide-react';

const FloatingEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determina a cor baseada no tipo de conexão
  const getEdgeColor = () => {
    if (data?.connectionType === 'item-to-segment') {
      return '#16A085'; // Verde para Item → Segment
    } else if (data?.connectionType === 'segment-to-item') {
      return '#4A90E2'; // Azul para Segment → Item
    } else if (data?.connectionType === 'item-to-item') {
      return '#16A085'; // Verde para Item → Item
    }
    return '#4A90E2'; // Azul padrão
  };

  const edgeColor = getEdgeColor();

  // Função para remover a edge
  const onEdgeDelete = () => {
    if (data?.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: 2,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Botão de remoção flutuante */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
                     <button
             onClick={onEdgeDelete}
             className="edge-delete-button"
             style={{
               background: 'var(--bg-secondary)',
               border: '1px solid var(--border-primary)',
               borderRadius: '50%',
               width: '24px',
               height: '24px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               cursor: 'pointer',
               opacity: selected ? 1 : 0.4,
               transition: 'all 0.2s ease',
               boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
             }}
             onMouseEnter={(e) => {
               e.target.style.opacity = '1';
               e.target.style.transform = 'scale(1.1)';
               e.target.style.background = 'var(--bg-primary)';
               e.target.style.borderColor = 'var(--primary-red)';
             }}
             onMouseLeave={(e) => {
               e.target.style.opacity = selected ? '1' : '0.4';
               e.target.style.transform = 'scale(1)';
               e.target.style.background = 'var(--bg-secondary)';
               e.target.style.borderColor = 'var(--border-primary)';
             }}
             title="Remover conexão"
           >
             <Trash2 size={12} style={{ color: 'var(--text-secondary)' }} />
           </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default FloatingEdge;
