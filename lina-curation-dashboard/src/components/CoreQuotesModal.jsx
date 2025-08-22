import React, { useEffect, useMemo, useState } from 'react';

const chipBaseStyle = {
  padding: '10px 14px',
  backgroundColor: '#2A2A2A',
  border: '1px solid #333333',
  borderRadius: '12px',
  fontSize: '14px',
  color: '#E0E0E0',
  fontFamily: 'Inter',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
  transform: 'scale(1)'
};

const Wrapper = ({ children, onClose }) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(42,42,42,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}
    onClick={onClose}
  >
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '80%',
        height: '65vh',
        maxWidth: 1100,
        maxHeight: '65vh',
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

const TitleBar = ({ text, onClose }) => (
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
  }}>
    <div style={{
      fontFamily: 'Inter',
      fontWeight: 700,
      fontSize: 18,
      color: 'var(--text-primary)'
    }}>{text}</div>
    <button
      onClick={onClose}
      aria-label="Fechar"
      style={{
        background: 'transparent',
        border: '1px solid #333333',
        color: 'var(--text-primary)',
        borderRadius: 8,
        padding: '8px 12px',
        cursor: 'pointer'
      }}
    >
      Fechar
    </button>
  </div>
);

const PhraseCard = ({ frase }) => (
  <div style={{
    backgroundColor: 'rgba(42,42,42,0.3)',
    border: '1px solid #333333',
    borderRadius: 12,
    padding: 28,
    color: 'var(--text-primary)',
    lineHeight: 1.9,
    fontSize: 18,
    fontFamily: 'Inter',
  }}>
    {frase}
  </div>
);

const CoreQuotesModal = ({ isOpen, onClose, quotes = [], title = 'Citações' }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex(0);
    setVisible(true);
  }, [isOpen]);

  // animação quando troca o índice
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [selectedIndex]);

  const selected = useMemo(() => {
    if (!quotes || quotes.length === 0) return null;
    return quotes[Math.min(selectedIndex, quotes.length - 1)];
  }, [quotes, selectedIndex]);

  if (!isOpen) return null;

  return (
    <Wrapper onClose={onClose}>
      <TitleBar text={title} onClose={onClose} />

      {/* Chips de títulos */}
      <div style={{ padding: '20px 24px 8px 24px' }}>
        {quotes.length === 0 ? (
          <div style={{ color: '#A0A0A0', fontFamily: 'Inter' }}>Nenhuma citação disponível para esta seção.</div>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {quotes.map((q, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={`quote-chip-${idx}`}
                  onClick={() => setSelectedIndex(idx)}
                  style={{
                    ...chipBaseStyle,
                    backgroundColor: isSelected ? '#333333' : 'rgba(42,42,42,0.3)',
                    borderColor: isSelected ? '#666666' : '#333333',
                    transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                    boxShadow: isSelected ? '0 6px 16px rgba(0,0,0,0.35)' : 'none',
                  }}
                  title={q.titulo_frase || 'Título'}
                >
                  {q.titulo_frase || 'Título'}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Frase selecionada */}
      <div
        style={{
          padding: '12px 24px 24px 24px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0px)' : 'translateY(6px)',
          transition: 'opacity 180ms ease, transform 180ms ease',
        }}
      >
        {selected && (
          <PhraseCard frase={selected.frase_completa || ''} />
        )}
      </div>
    </Wrapper>
  );
};

export default CoreQuotesModal;
