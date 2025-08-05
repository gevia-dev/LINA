/**
 * Utilitários para manipulação e formatação de datas
 */

/**
 * Retorna tempo relativo em formato amigável
 * @param {Date|string} date - Data para calcular o tempo relativo
 * @returns {string} - Tempo relativo formatado (ex: "agora", "5m", "2h", "3d")
 */
export const getRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const inputDate = new Date(date);
  const diffInMs = now - inputDate;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInMinutes < 1) return 'agora';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays < 7) return `${diffInDays}d`;
  if (diffInWeeks < 4) return `${diffInWeeks} sem`;
  if (diffInMonths < 12) return `${diffInMonths} mês${diffInMonths > 1 ? 'es' : ''}`;
  return `${diffInYears} ano${diffInYears > 1 ? 's' : ''}`;
};

/**
 * Formata data para header de agrupamento
 * @param {Date|string} date - Data para formatar
 * @returns {string} - Data formatada (ex: "Hoje", "Ontem", "Segunda-feira")
 */
export const formatDateHeader = (date) => {
  if (!date) return '';
  
  const inputDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Normalizar datas para comparação (ignorar horas)
  const inputDateNormalized = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayNormalized = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  
  if (inputDateNormalized.getTime() === todayNormalized.getTime()) {
    return 'Hoje';
  }
  
  if (inputDateNormalized.getTime() === yesterdayNormalized.getTime()) {
    return 'Ontem';
  }
  
  // Para datas da semana atual
  const diffInDays = Math.floor((todayNormalized - inputDateNormalized) / (1000 * 60 * 60 * 24));
  if (diffInDays <= 7 && diffInDays > 0) {
    const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return weekdays[inputDate.getDay()];
  }
  
  // Para datas mais antigas
  const options = { 
    day: 'numeric', 
    month: 'long',
    year: inputDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  };
  
  return inputDate.toLocaleDateString('pt-BR', options);
};

/**
 * Verifica se uma notícia é "nova" (menos de 2 horas)
 * @param {Date|string} date - Data da notícia
 * @returns {boolean} - True se a notícia for nova
 */
export const isNewsNew = (date) => {
  if (!date) return false;
  
  const now = new Date();
  const newsDate = new Date(date);
  const diffInHours = (now - newsDate) / (1000 * 60 * 60);
  
  return diffInHours < 2;
};

/**
 * Agrupa notícias por data
 * @param {Array} newsItems - Array de notícias
 * @param {string} dateField - Campo da data na notícia (padrão: 'created_at')
 * @returns {Array} - Array de grupos { date, label, items }
 */
export const groupNewsByDate = (newsItems, dateField = 'created_at') => {
  if (!Array.isArray(newsItems)) return [];
  
  const groups = {};
  
  newsItems.forEach(item => {
    const date = item[dateField];
    if (!date) return;
    
    const inputDate = new Date(date);
    const dateKey = inputDate.toDateString(); // Agrupa por dia
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: inputDate,
        label: formatDateHeader(inputDate),
        items: []
      };
    }
    
    groups[dateKey].items.push(item);
  });
  
  // Converter para array e ordenar por data (mais recente primeiro)
  return Object.values(groups).sort((a, b) => b.date - a.date);
};