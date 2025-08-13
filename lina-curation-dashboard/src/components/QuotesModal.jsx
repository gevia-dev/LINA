import React from 'react';
import { X } from 'lucide-react';

const QuotesModal = ({ isOpen, onClose, title, quotes = [] }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-primary)',
            backgroundColor: 'var(--bg-primary)'
          }}
        >
          <h2
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'Inter',
              fontWeight: '600',
              fontSize: '18px',
              margin: 0
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px'
          }}
        >
          {quotes.length === 0 ? (
            <div
              style={{
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '40px 20px'
              }}
            >
              Nenhuma frase encontrada para esta categoria.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {quotes.map((quote, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    padding: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'var(--primary-green)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'var(--border-primary)';
                  }}
                >
                  {quote.titulo_frase && (
                    <h4
                      style={{
                        color: 'var(--text-primary)',
                        fontFamily: 'Inter',
                        fontWeight: '600',
                        fontSize: '14px',
                        margin: '0 0 8px 0'
                      }}
                    >
                      {quote.titulo_frase}
                    </h4>
                  )}
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontFamily: 'Inter',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      margin: 0
                    }}
                  >
                    {quote.frase_completa}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotesModal;
