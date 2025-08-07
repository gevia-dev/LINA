import React, { useState, useRef, useEffect } from 'react';

/**
 * Componente para lazy loading de imagens
 * @param {Object} props
 * @param {string} props.src - URL da imagem
 * @param {string} props.alt - Texto alternativo
 * @param {string} props.placeholder - Emoji ou texto para placeholder
 * @param {Object} props.style - Estilos CSS
 * @param {string} props.className - Classes CSS
 * @param {Function} props.onLoad - Callback quando a imagem carregar
 * @param {Function} props.onError - Callback quando houver erro
 */
const LazyImage = ({ 
  src, 
  alt = '', 
  placeholder = '📰',
  style = {},
  className = '',
  onLoad,
  onError 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer para detectar quando a imagem entra na viewport
  useEffect(() => {
    if (!imgRef.current || !src) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px' // Começar a carregar 50px antes de aparecer na tela
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    transition: 'opacity 0.3s ease',
    ...style
  };

  return (
    <div
      ref={imgRef}
      className={className}
      style={baseStyle}
    >
      {!src || hasError ? (
        // Placeholder quando não há src ou erro
        <div style={{
          color: '#666666',
          fontSize: style.width ? `${Math.min(24, parseInt(style.width) * 0.24)}px` : '24px',
          fontFamily: 'Inter'
        }}>
          {placeholder}
        </div>
      ) : isInView ? (
        // Renderizar imagem apenas quando está na viewport
        <>
          {!isLoaded && (
            // Shimmer loading enquanto carrega
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, #2A2A2A 25%, #333333 50%, #2A2A2A 75%)',
              backgroundSize: '200px 100%',
              animation: 'shimmer 1.5s infinite linear',
              borderRadius: 'inherit'
            }} />
          )}
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
              borderRadius: 'inherit'
            }}
          />
        </>
      ) : (
        // Placeholder enquanto não está na viewport
        <div style={{
          color: '#666666',
          fontSize: style.width ? `${Math.min(24, parseInt(style.width) * 0.24)}px` : '24px',
          fontFamily: 'Inter'
        }}>
          {placeholder}
        </div>
      )}
      
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: calc(200px + 100%) 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LazyImage;