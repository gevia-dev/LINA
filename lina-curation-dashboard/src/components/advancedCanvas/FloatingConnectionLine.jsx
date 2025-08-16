import React from 'react';
import { getSmoothStepPath } from '@xyflow/react';

const FloatingConnectionLine = ({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  toPosition,
}) => {
  const [edgePath] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  return (
    <g>
      <path
        fill="none"
        stroke="#4A90E2"
        strokeWidth={2}
        d={edgePath}
      />
    </g>
  );
};

export default FloatingConnectionLine;
