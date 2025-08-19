import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ContentTypeSelection = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const handleContentTypeSelect = (contentType) => {
    // Por enquanto, todos levam para a mesma tela de criação
    // Depois vamos direcionar para páginas específicas
    navigate(`/news/${id}`);
  };

  const contentTypes = [
    { id: 'newsletter', label: 'Newsletter' },
    { id: 'linkedin', label: 'Linkedin post' },
    { id: 'blog', label: 'Blog article' },
    { id: 'instagram', label: 'Instagram copy' }
  ];

  return (
    <div style={{
      backgroundColor: '#000000',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#000000',
        padding: '40px',
        maxWidth: '90vw',
        width: '100%',
        height: '90vh'
      }}>
        {/* Header */}
        <h1 style={{
          color: '#FFFFFF',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '28px',
          fontWeight: '600',
          marginBottom: '40px',
          textAlign: 'left'
        }}>
          O que você deseja criar?
        </h1>

        {/* Grid de opções - botões muito maiores */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          height: 'calc(100% - 120px)'
        }}>
          {contentTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleContentTypeSelect(type.id)}
              style={{
                backgroundColor: '#000000',
                border: '1px solid #FFFFFF',
                borderRadius: '16px',
                padding: '60px 40px',
                color: '#FFFFFF',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '24px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                width: '100%',
                height: '100%',
                minHeight: '200px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#1A1A1A';
                e.target.style.borderColor = '#CCCCCC';
                e.target.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#000000';
                e.target.style.borderColor = '#FFFFFF';
                e.target.style.transform = 'scale(1)';
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContentTypeSelection;
