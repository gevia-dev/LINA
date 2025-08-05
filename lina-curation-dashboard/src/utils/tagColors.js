/**
 * Utilitários para cores das tags/categorias
 * Baseado no guia de cores do projeto LINA
 */

/**
 * Mapeamento de cores para cada categoria
 * Usando a paleta de cores do projeto para consistência visual
 */
const TAG_COLORS = {
  'business': {
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    borderColor: '#3B82F699'
  },
  'cultura/tendência': {
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    borderColor: '#B39DFF99'
  },
  'ciência': {
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    borderColor: '#2EE59D99'
  }
};

/**
 * Obtém as cores para uma categoria específica
 * @param {string} category - Nome da categoria
 * @returns {Object} - { backgroundColor, color, borderColor }
 */
export const getTagColors = (category) => {
  if (!category) {
    return {
      backgroundColor: 'transparent',
      color: '#FFFFFF',
      borderColor: '#A0A0A099'
    };
  }
  const normalized = category.toLowerCase().trim();
  if (TAG_COLORS[normalized]) return TAG_COLORS[normalized];
  // fallback
  return {
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    borderColor: '#A0A0A099'
  };
};

/**
 * Obtém todas as cores disponíveis
 * @returns {Object} - Mapeamento completo de cores
 */
export const getAllTagColors = () => {
  return TAG_COLORS;
}; 