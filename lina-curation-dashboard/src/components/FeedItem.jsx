import React from 'react';
import { Tag } from 'lucide-react';

const FeedItem = ({ item, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="transition-all duration-200 cursor-pointer"
      style={{
        fontFamily: 'Inter',
        padding: '12px', // Style guide: Cards e Inputs: 12px
        borderRadius: '8px', // Style guide: 8px para cards
        backgroundColor: isSelected ? '#2BB24C08' : '#1E1E1E', // Secondary background mais transparente quando selecionado
        border: '1px solid #333333', // Sempre a mesma borda
        boxShadow: 'none'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.target.style.borderColor = 'var(--primary-green-transparent)'; // Usando a variável CSS
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.target.style.borderColor = '#333333';
        }
      }}
    >
      <div className="flex justify-between items-start">
        <h3 
          style={{ 
            color: '#E0E0E0', // Text Primary do style guide
            fontFamily: 'Inter',
            fontWeight: '500', // Medium (500) do style guide
            fontSize: '16px', // Título de Card (H3) do style guide
            paddingRight: '12px',
            marginBottom: '8px'
          }}
        >
          {item.title || 'Sem título'}
        </h3>
      </div>
      
      {/* Preview do texto */}
      {(() => {
        try {
          const structuredSummary = item.structured_summary ? JSON.parse(item.structured_summary) : null;
          const preview = structuredSummary?.motivo_ou_consequencia;
          
          if (preview && preview.trim()) {
            return (
              <div 
                style={{ 
                  color: '#A0A0A0', // Text Secondary do style guide
                  fontFamily: 'Inter',
                  fontSize: '14px', // Corpo do Texto do style guide
                  fontWeight: '400', // Regular (400) do style guide
                  marginTop: '8px',
                  marginBottom: '8px',
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {preview}
              </div>
            );
          }
          return null;
        } catch (error) {
          console.error('Erro ao fazer parse do structured_summary:', error);
          return null;
        }
      })()}
      
      {item.macro_categoria && (
        <div 
          className="flex items-center gap-1.5" 
          style={{ 
            color: '#A0A0A0', // Text Secondary do style guide
            fontFamily: 'Inter',
            fontSize: '12px', // Subtítulo/Metadado do style guide
            fontWeight: '400', // Regular (400) do style guide
            marginTop: '8px'
          }}
        >
          <Tag 
            size={18} // Tamanho Padrão do style guide
            color="#FFFFFF" // Icons do style guide
          />
          {item.macro_categoria}
        </div>
      )}
    </div>
  );
};

export default FeedItem;