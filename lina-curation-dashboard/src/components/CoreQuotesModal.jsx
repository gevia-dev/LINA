import React from 'react';

const Wrapper = ({ children, onClose }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.08)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}
    onClick={onClose}
  >
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '80%',
        height: '80vh',
        maxWidth: 1100,
        maxHeight: '80vh',
        overflow: 'auto',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 14,
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
      }}
    >
      {children}
    </div>
  </div>
);

const Title = ({ text }) => (
  <div style={{
    position: 'sticky',
    top: 0,
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 24px',
    zIndex: 1,
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 18,
    color: 'var(--text-primary)'
  }}>{text}</div>
);

const QuoteCard = ({ titulo, frase }) => (
  <div style={{
    backgroundColor: '#2A2A2A',
    border: '1px solid #333333',
    borderRadius: 12,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  }}>
    <div style={{ color: 'var(--text-primary)', fontFamily: 'Inter', fontWeight: 600, fontSize: 15 }}>{titulo}</div>
    <div style={{ color: 'var(--text-primary)', fontFamily: 'Inter', fontSize: 14, lineHeight: 1.8 }}>{frase}</div>
  </div>
);

const CoreQuotesModal = ({ isOpen, onClose, quotes = [], title = 'Citações' }) => {
  if (!isOpen) return null;

  return (
    <Wrapper onClose={onClose}>
      <Title text={title} />
      <div style={{ padding: '16px 24px 24px 24px', display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {quotes.length === 0 && (
          <div style={{ color: '#A0A0A0', fontFamily: 'Inter' }}>Nenhuma citação disponível para esta seção.</div>
        )}
        {quotes.map((q, idx) => (
          <QuoteCard key={idx} titulo={q.titulo_frase || 'Sem título'} frase={q.frase_completa || ''} />
        ))}
      </div>
    </Wrapper>
  );
};

export default CoreQuotesModal;
