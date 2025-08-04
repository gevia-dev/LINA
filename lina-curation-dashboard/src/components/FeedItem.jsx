import React from 'react';
import { Hash, Tag, Layers } from 'lucide-react';
import StatusBadge from './StatusBadge';

const FeedItem = ({ item, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="transition-all duration-200 cursor-pointer"
      style={{
        fontFamily: 'Inter',
        padding: '12px', // Style guide: Cards e Inputs: 12px
        borderRadius: '8px', // Style guide: 8px para cards
        backgroundColor: isSelected ? '#2BB24C10' : '#1E1E1E', // Secondary background
        border: isSelected ? '2px solid #2BB24C' : '1px solid #333333', // Borders/Dividers
        boxShadow: isSelected ? '0 0 0 2px #2BB24C33' : 'none'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.target.style.borderColor = '#2BB24C'; // Borda verde no hover
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
        <StatusBadge status={item.status} />
      </div>
      
      <div 
        className="flex items-center gap-4" 
        style={{ 
          color: '#A0A0A0', // Text Secondary do style guide
          fontFamily: 'Inter',
          fontSize: '12px', // Subtítulo/Metadado do style guide
          fontWeight: '400', // Regular (400) do style guide
          marginTop: '8px'
        }}
      >
        <span className="flex items-center gap-1.5">
          <Hash 
            size={18} // Tamanho Padrão do style guide
            color="#FFFFFF" // Icons do style guide
          />
          {item.id}
        </span>
        
        {item.macro_categoria && (
          <span className="flex items-center gap-1.5">
            <Tag 
              size={18} // Tamanho Padrão do style guide
              color="#FFFFFF" // Icons do style guide
            />
            {item.macro_categoria}
          </span>
        )}
        
        {item.step && (
          <span className="flex items-center gap-1.5">
            <Layers 
              size={18} // Tamanho Padrão do style guide
              color="#FFFFFF" // Icons do style guide
            />
            Step: {item.step}
          </span>
        )}
      </div>
    </div>
  );
};

export default FeedItem;