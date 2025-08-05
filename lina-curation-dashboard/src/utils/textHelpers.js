/**
 * Utilitários para manipulação e formatação de texto
 */

/**
 * Calcula tempo estimado de leitura
 * @param {string} text - Texto para calcular
 * @param {number} wordsPerMinute - Palavras por minuto (padrão: 200)
 * @returns {string} - Tempo formatado (ex: "3 min", "1 min")
 */
export const calculateReadTime = (text, wordsPerMinute = 200) => {
  if (!text || typeof text !== 'string') return '1 min';
  
  // Contar palavras (aproximação simples)
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  
  return `${minutes} min`;
};

/**
 * Gera cor consistente baseada no nome
 * @param {string} name - Nome para gerar a cor
 * @returns {string} - Código hexadecimal da cor
 */
export const generateAvatarColor = (name) => {
  if (!name || typeof name !== 'string') return '#2BB24C';
  
  // Cores predefinidas que funcionam bem com texto branco
  const colors = [
    '#2BB24C', // Verde principal
    '#3B82F6', // Azul
    '#8B5CF6', // Roxo
    '#F59E0B', // Amarelo
    '#EF4444', // Vermelho
    '#10B981', // Verde esmeralda
    '#F97316', // Laranja
    '#6366F1', // Índigo
    '#EC4899', // Rosa
    '#84CC16', // Lima
    '#06B6D4', // Ciano
    '#8B5A2B'  // Marrom
  ];
  
  // Gerar hash simples do nome
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Usar hash para selecionar cor
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

/**
 * Extrai iniciais de um nome
 * @param {string} name - Nome para extrair iniciais
 * @param {number} maxInitials - Máximo de iniciais (padrão: 2)
 * @returns {string} - Iniciais em maiúsculo
 */
export const getInitials = (name, maxInitials = 2) => {
  if (!name || typeof name !== 'string') return 'TN';
  
  const words = name.trim().split(/\s+/);
  const initials = words
    .slice(0, maxInitials)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  return initials || 'TN';
};

/**
 * Trunca texto com ellipsis
 * @param {string} text - Texto para truncar
 * @param {number} maxLength - Comprimento máximo
 * @returns {string} - Texto truncado
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || typeof text !== 'string') return '';
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Remove HTML tags de um texto
 * @param {string} html - HTML para limpar
 * @returns {string} - Texto limpo
 */
export const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  return html.replace(/<[^>]*>/g, '').trim();
};

/**
 * Extrai preview de um texto estruturado
 * @param {string|object} structuredData - Dados estruturados
 * @param {string} fallbackText - Texto de fallback
 * @returns {string} - Preview extraído
 */
export const extractPreview = (structuredData, fallbackText = '') => {
  if (!structuredData) return fallbackText;
  
  try {
    // Se já for objeto, usar diretamente
    const data = typeof structuredData === 'string' 
      ? JSON.parse(structuredData) 
      : structuredData;
    
    // Priorizar campos mais descritivos
    const preview = data?.motivo_ou_consequencia || 
                   data?.resumo || 
                   data?.summary || 
                   data?.description ||
                   fallbackText;
    
    return stripHtml(preview);
  } catch (error) {
    console.error('Erro ao extrair preview:', error);
    return fallbackText;
  }
};