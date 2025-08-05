import React from 'react';
import { generateAvatarColor, getInitials } from '../utils/textHelpers';

/**
 * Componente de avatar para fontes de notícias
 * @param {Object} props
 * @param {string} props.sourceName - Nome da fonte
 * @param {string} props.imageUrl - URL da imagem (opcional)
 * @param {number} props.size - Tamanho do avatar em pixels (padrão: 20)
 * @param {string} props.className - Classes CSS adicionais
 * @param {Object} props.style - Estilos inline adicionais
 */
const SourceAvatar = ({ 
  sourceName = 'TechNews', 
  imageUrl, 
  size = 20, 
  className = '', 
  style = {} 
}) => {
  const initials = getInitials(sourceName);
  const backgroundColor = generateAvatarColor(sourceName);
  
  const baseStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${Math.max(8, size * 0.4)}px`,
    fontWeight: '600',
    fontFamily: 'Inter',
    flexShrink: 0,
    userSelect: 'none',
    ...style
  };

  // Se tiver imagem, usar como background
  if (imageUrl) {
    return (
      <div
        className={className}
        style={{
          ...baseStyle,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: backgroundColor, // Fallback
        }}
        title={sourceName}
        onError={(e) => {
          // Em caso de erro na imagem, mostrar iniciais
          e.target.style.backgroundImage = 'none';
          e.target.textContent = initials;
          e.target.style.color = '#FFFFFF';
        }}
      />
    );
  }

  // Avatar com iniciais
  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        backgroundColor,
        color: '#FFFFFF',
      }}
      title={sourceName}
    >
      {initials}
    </div>
  );
};

export default SourceAvatar;