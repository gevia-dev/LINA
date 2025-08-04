import React from 'react';
import StatusBadge from './StatusBadge';

const DetailsSidebar = ({ selectedItem }) => {
  if (!selectedItem) {
    return (
      <div style={{ padding: '24px' }}> {/* Seções Principais: 24px do style guide */}
        <div style={{ textAlign: 'center', padding: '96px 0' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px', color: '#A0A0A0' }}>📋</div>
          <p 
            style={{ 
              color: '#A0A0A0', // Text Secondary do style guide
              fontFamily: 'Inter',
              fontSize: '14px', // Corpo do Texto do style guide
              fontWeight: '400' // Regular (400) do style guide
            }}
          >
            Selecione uma notícia para ver os detalhes
          </p>
        </div>
      </div>
    );
  }

  const DetailItem = ({ label, children }) => (
    <div style={{ marginBottom: '16px' }}> {/* Múltiplo de 8px */}
      <h3 
        style={{ 
          color: '#A0A0A0', // Text Secondary do style guide
          fontFamily: 'Inter',
          fontWeight: '500', // Medium (500) do style guide
          fontSize: '12px', // Subtítulo/Metadado do style guide
          marginBottom: '8px'
        }}
      >
        {label}
      </h3>
      <div 
        style={{ 
          color: '#E0E0E0', // Text Primary do style guide
          fontFamily: 'Inter',
          fontSize: '14px', // Corpo do Texto do style guide
          fontWeight: '400' // Regular (400) do style guide
        }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px' }}> {/* Seções Principais: 24px do style guide */}
      <h2 
        style={{ 
          color: '#E0E0E0', // Text Primary do style guide
          fontFamily: 'Inter',
          fontWeight: '600', // SemiBold (600) do style guide
          fontSize: '18px', // Título de Seção (H2) do style guide
          marginBottom: '24px'
        }}
      >
        Detalhes da Notícia
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <DetailItem label="Título">
          {selectedItem.title || 'Sem título'}
        </DetailItem>
        
        <DetailItem label="Status">
          <StatusBadge status={selectedItem.status} />
        </DetailItem>
        
        {selectedItem.fonte && (
          <DetailItem label="Fonte">
            {selectedItem.fonte}
          </DetailItem>
        )}
        
        {selectedItem.macro_categoria && (
          <DetailItem label="Categoria">
            {selectedItem.macro_categoria}
            {selectedItem.sub_categoria && ` / ${selectedItem.sub_categoria}`}
          </DetailItem>
        )}
        
        {selectedItem.step && (
          <DetailItem label="Step">
            {selectedItem.step}
          </DetailItem>
        )}
        
        <DetailItem label="ID">
          <span 
            className="font-mono"
            style={{ 
              color: '#A0A0A0',
              fontFamily: 'monospace'
            }}
          >
            {selectedItem.id}
          </span>
        </DetailItem>
      </div>
    </div>
  );
};

export default DetailsSidebar;