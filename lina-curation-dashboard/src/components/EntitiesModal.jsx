import React, { useMemo, useState, useEffect } from 'react';

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
  transform: 'scale(1)',
};

const Section = ({ label, children }) => (
  <div style={{ marginBottom: 32 }}>
    <div style={{
      color: '#A0A0A0',
      fontFamily: 'Inter',
      fontWeight: 600,
      fontSize: 16,
      letterSpacing: '0.3px',
      marginBottom: 14,
    }}>{label}</div>
    <div style={{
      backgroundColor: 'rgba(42,42,42,0.3)',
      border: '1px solid #333333',
      borderRadius: 12,
      padding: 24,
      color: 'var(--text-primary)',
      lineHeight: 1.9,
      fontSize: 15,
      fontFamily: 'Inter',
    }}>{children}</div>
  </div>
);

const EntitiesModal = ({ isOpen, onClose, entitiesList, initialIndex = 0 }) => {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [contentVisible, setContentVisible] = useState(true);

  useEffect(() => {
    if (isOpen) setSelectedIndex(initialIndex);
  }, [isOpen, initialIndex]);

  useEffect(() => {
    // animação de entrada do conteúdo quando troca de entidade
    setContentVisible(false);
    const t = setTimeout(() => setContentVisible(true), 20);
    return () => clearTimeout(t);
  }, [selectedIndex]);

  const selected = useMemo(() => {
    if (!entitiesList || entitiesList.length === 0) return null;
    return entitiesList[Math.min(selectedIndex, entitiesList.length - 1)];
  }, [entitiesList, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div style={{
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
          height: '90vh',
          maxWidth: 1100,
          maxHeight: '90vh',
          overflow: 'auto',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 14,
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
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
          }}>
            Entidades identificadas
          </div>
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

        {/* Chips */}
        <div style={{ padding: '20px 24px 8px 24px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {entitiesList?.map((ent, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={`${ent.type}-${idx}-${ent.name}`}
                  onClick={() => setSelectedIndex(idx)}
                  style={{
                    ...chipBaseStyle,
                    backgroundColor: isSelected ? '#333333' : 'rgba(42,42,42,0.3)',
                    borderColor: isSelected ? '#666666' : '#333333',
                    transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                    boxShadow: isSelected ? '0 6px 16px rgba(0,0,0,0.35)' : 'none',
                  }}
                  title={ent.name}
                >
                  {ent.name}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body com animação de fade/slide */}
        <div
          style={{
            padding: '12px 24px 24px 24px',
            opacity: contentVisible ? 1 : 0,
            transform: contentVisible ? 'translateY(0px)' : 'translateY(6px)',
            transition: 'opacity 180ms ease, transform 180ms ease',
          }}
        >
          {selected && (
            <>
              {/* o_que_e */}
              {selected.o_que_e && (
                <Section label="O que é ?">
                  {selected.o_que_e}
                </Section>
              )}

              {/* relevancia_noticia para principal */}
              {selected.type === 'principal' && selected.relevancia_noticia && (
                <Section label="Qual a relavância na notícia?">
                  {selected.relevancia_noticia}
                </Section>
              )}

              {/* papel_noticia para complementar */}
              {selected.type === 'complementar' && selected.papel_noticia && (
                <Section label="Qual papel tem na notícia?">
                  {selected.papel_noticia}
                </Section>
              )}

              {/* contexto_essencial para principal */}
              {selected.type === 'principal' && selected.contexto_essencial && (
                <Section label="Contexto essencial">
                  {selected.contexto_essencial}
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntitiesModal;
