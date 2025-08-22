import React from 'react';

/**
 * Componente skeleton para simular o FeedItem durante carregamento
 */
const FeedItemSkeleton = () => {
  // Keyframes para animação shimmer
  const shimmerKeyframes = `
    @keyframes shimmer {
      0% {
        background-position: -200px 0;
      }
      100% {
        background-position: calc(200px + 100%) 0;
      }
    }
  `;

  const shimmerStyle = {
    background: 'linear-gradient(90deg, rgba(42,42,42,0.3) 25%, #333333 50%, rgba(42,42,42,0.3) 75%)',
    backgroundSize: '200px 100%',
    animation: 'shimmer 1.5s infinite linear',
    borderRadius: '4px'
  };

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        style={{
          fontFamily: 'Inter',
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: '#1E1E1E',
          border: '1px solid #333333',
          height: '100px',
          minHeight: '100px',
          marginBottom: '4px'
        }}
      >
        {/* Grid Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 100px', 
          gap: '12px',
          alignItems: 'start',
          height: '100%'
        }}>
          {/* Conteúdo */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '6px'
            }}>
              {/* Avatar skeleton */}
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                ...shimmerStyle
              }} />
              
              {/* Nome da fonte skeleton */}
              <div style={{
                width: '80px',
                height: '12px',
                ...shimmerStyle
              }} />
              
              {/* Separador */}
              <div style={{ color: '#A0A0A0', fontSize: '12px' }}>•</div>
              
              {/* Tempo skeleton */}
              <div style={{
                width: '50px',
                height: '12px',
                ...shimmerStyle
              }} />
              
              {/* Tag skeleton */}
              <div style={{
                marginLeft: 'auto',
                width: '60px',
                height: '16px',
                borderRadius: '4px',
                ...shimmerStyle
              }} />
            </div>
            
            {/* Título skeleton */}
            <div style={{ marginBottom: '6px' }}>
              <div style={{
                width: '100%',
                height: '15px',
                marginBottom: '4px',
                ...shimmerStyle
              }} />
              <div style={{
                width: '75%',
                height: '15px',
                ...shimmerStyle
              }} />
            </div>
            
            {/* Preview skeleton */}
            <div style={{ marginBottom: '8px', flex: 1 }}>
              <div style={{
                width: '100%',
                height: '13px',
                marginBottom: '4px',
                ...shimmerStyle
              }} />
              <div style={{
                width: '85%',
                height: '13px',
                ...shimmerStyle
              }} />
            </div>
            
            {/* Footer skeleton */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'auto'
            }}>
              {/* Tempo de leitura skeleton */}
              <div style={{
                width: '50px',
                height: '12px',
                ...shimmerStyle
              }} />
              
              {/* Ações skeleton */}
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '2px',
                  ...shimmerStyle
                }} />
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '2px',
                  ...shimmerStyle
                }} />
              </div>
            </div>
          </div>
          
          {/* Thumbnail skeleton */}
          <div style={{
            width: '100px',
            height: '75px',
            borderRadius: '6px',
            ...shimmerStyle
          }} />
        </div>
      </div>
    </>
  );
};

export default FeedItemSkeleton;