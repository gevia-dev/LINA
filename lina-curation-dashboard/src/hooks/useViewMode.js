import { useState, useEffect } from 'react';

/**
 * Hook customizado para gerenciar modo de visualização (compacto/normal)
 * Persiste a preferência no localStorage
 */
export const useViewMode = () => {
  const [isCompact, setIsCompact] = useState(() => {
    const saved = localStorage.getItem('feedViewMode');
    return saved === 'compact';
  });

  const toggleViewMode = () => {
    setIsCompact(prev => {
      const newMode = !prev;
      localStorage.setItem('feedViewMode', newMode ? 'compact' : 'normal');
      return newMode;
    });
  };

  useEffect(() => {
    localStorage.setItem('feedViewMode', isCompact ? 'compact' : 'normal');
  }, [isCompact]);

  return {
    isCompact,
    toggleViewMode,
    viewMode: isCompact ? 'compact' : 'normal'
  };
};