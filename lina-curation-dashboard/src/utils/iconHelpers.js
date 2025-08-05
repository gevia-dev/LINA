import { FileText, TrendingUp, Clock, Bookmark } from 'lucide-react';

/**
 * Utilitários para determinar ícones contextuais baseados no conteúdo da notícia
 */

/**
 * Determina o ícone contextual apropriado para uma notícia
 * @param {Object} newsItem - Item de notícia
 * @returns {Object} - { Icon, color, tooltip }
 */
export const getContextualIcon = (newsItem) => {
  // Verifica se é trending (ex: muitas interações, recente e popular)
  if (istrending(newsItem)) {
    return {
      Icon: TrendingUp,
      color: '#F59E0B', // Amarelo/dourado
      tooltip: 'Tendência'
    };
  }

  // Verifica se é recente (menos de 2 horas)
  if (isRecent(newsItem)) {
    return {
      Icon: Clock,
      color: '#10B981', // Verde esmeralda
      tooltip: 'Recente'
    };
  }

  // Verifica se está salvo
  if (isSaved(newsItem)) {
    return {
      Icon: Bookmark,
      color: '#2BB24C', // Verde principal
      tooltip: 'Salvo'
    };
  }

  // Padrão: notícia normal
  return {
    Icon: FileText,
    color: '#A0A0A0', // Cinza
    tooltip: 'Notícia'
  };
};

/**
 * Verifica se uma notícia é trending
 * @param {Object} newsItem 
 * @returns {boolean}
 */
const istrending = (newsItem) => {
  // Lógica simplificada - pode ser expandida com métricas reais
  const hasHighEngagement = newsItem.engagement_score > 80;
  const isRecentAndPopular = isRecent(newsItem) && newsItem.views > 1000;
  
  return hasHighEngagement || isRecentAndPopular;
};

/**
 * Verifica se uma notícia é recente (< 2 horas)
 * @param {Object} newsItem 
 * @returns {boolean}
 */
const isRecent = (newsItem) => {
  if (!newsItem.created_at && !newsItem.published_at) return false;
  
  const newsDate = new Date(newsItem.created_at || newsItem.published_at);
  const now = new Date();
  const diffInHours = (now - newsDate) / (1000 * 60 * 60);
  
  return diffInHours < 2;
};

/**
 * Verifica se uma notícia está salva
 * @param {Object} newsItem 
 * @returns {boolean}
 */
const isSaved = (newsItem) => {
  const savedItems = JSON.parse(localStorage.getItem('savedNewsItems') || '[]');
  return savedItems.includes(newsItem.id);
};

/**
 * Salva/remove uma notícia dos salvos
 * @param {string} newsId 
 * @returns {boolean} - novo estado (true = salvo, false = removido)
 */
export const toggleSavedItem = (newsId) => {
  const savedItems = JSON.parse(localStorage.getItem('savedNewsItems') || '[]');
  const isCurrentlySaved = savedItems.includes(newsId);
  
  let newSavedItems;
  if (isCurrentlySaved) {
    newSavedItems = savedItems.filter(id => id !== newsId);
  } else {
    newSavedItems = [...savedItems, newsId];
  }
  
  localStorage.setItem('savedNewsItems', JSON.stringify(newSavedItems));
  return !isCurrentlySaved;
};