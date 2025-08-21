import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { marked } from 'marked';
import { fetchLinaNewsById, triggerLinkedinWebhook } from '../services/contentApi';
import { toast } from 'react-hot-toast';

// Configura o parser Markdown para respeitar quebras de linha simples e GFM
marked.setOptions({
  gfm: true,
  breaks: true
});

// Converte um texto simples em blocos básicos para o BlockNote
function extractFinalTextMarkdown(item) {
  if (!item) return '';
  if (typeof item.final_text === 'string') return item.final_text;
  return '';
}

const NewsReaderPanel = ({ item, onClose }) => {
  const [title, setTitle] = useState(item?.title || 'Sem título');
  const [markdown, setMarkdown] = useState('');
  const [selectedButton, setSelectedButton] = useState('blog'); // Estado para controlar botão selecionado
  const [linkedinContent, setLinkedinContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    setTitle(item?.title || 'Sem título');
    setMarkdown(extractFinalTextMarkdown(item));
    setSelectedButton('blog');
    setLinkedinContent('');
    setHasContent(false);
    setIsGenerating(false);
    setIsCheckingExisting(false);
  }, [item]);

  useEffect(() => {
    if (['linkedin-enxuto', 'linkedin-informativo', 'instagram'].includes(selectedButton)) {
      checkExistingContent();
    }
  }, [selectedButton, item?.id]);

  const handleGenerateLinkedinPost = async () => {
    if (!item?.id || isGenerating) return;
    
    const typeMap = {
      'linkedin-enxuto': 'short-li',
      'linkedin-informativo': 'long-li',
      'instagram': 'insta-default'
    };
    
    const fieldMap = {
      'linkedin-enxuto': 'Post_linkedin_curto',
      'linkedin-informativo': 'post_linkedin_longo',
      'instagram': 'post_instagram'
    };
    
    const webhookType = typeMap[selectedButton];
    const fieldName = fieldMap[selectedButton];
    
    if (!webhookType || !fieldName) return;
    
    try {
      setIsGenerating(true);
      
      // 1. Verificar se já existe conteúdo na coluna específica
      const existingData = await fetchLinaNewsById(item.id);
      if (existingData?.[fieldName]?.trim()) {
        setLinkedinContent(existingData[fieldName]);
        setHasContent(true);
        toast.success(`Conteúdo carregado da coluna ${fieldName} do banco de dados`);
        console.log(`✅ Conteúdo existente carregado da coluna ${fieldName}:`, existingData[fieldName]);
        return;
      }
      
      // 2. Disparar webhook e aguardar resposta
      const result = await triggerLinkedinWebhook(item.id, webhookType);
      
      // 3. Exibir resultado
      if (result.success && result.content) {
        setLinkedinContent(result.content);
        setHasContent(true);
        toast.success('Conteúdo gerado com sucesso!');
      } else {
        throw new Error('Resposta inválida do N8N');
      }
      
    } catch (error) {
      console.error('Erro ao gerar post:', error);
      toast.error('Erro ao gerar conteúdo: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const checkExistingContent = async () => {
    if (!item?.id) return;
    
    const typeMap = {
      'linkedin-enxuto': 'Post_linkedin_curto',
      'linkedin-informativo': 'post_linkedin_longo',
      'instagram': 'post_instagram'
    };
    
    const fieldName = typeMap[selectedButton];
    if (!fieldName) return;
    
    try {
      setIsCheckingExisting(true);
      const existingData = await fetchLinaNewsById(item.id);
      
      // Verificar se existe conteúdo na coluna específica do banco
      if (existingData?.[fieldName]?.trim()) {
        setLinkedinContent(existingData[fieldName]);
        setHasContent(true);
        console.log(`✅ Conteúdo encontrado na coluna ${fieldName}:`, existingData[fieldName]);
      } else {
        setHasContent(false);
        setLinkedinContent('');
        console.log(`❌ Nenhum conteúdo encontrado na coluna ${fieldName}`);
      }
    } catch (error) {
      console.error('Erro ao verificar conteúdo existente:', error);
      setHasContent(false);
    } finally {
      setIsCheckingExisting(false);
    }
  };

  // Função para renderizar conteúdo baseado no botão selecionado
  const renderContent = () => {
    switch (selectedButton) {
      case 'blog':
        return (
          <>
            {/* Título editável */}
            <div
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setTitle(e.currentTarget.textContent || '')}
              style={{
                outline: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: '24px',
                marginBottom: '20px',
                lineHeight: 1.3
              }}
            >
              {title}
            </div>

            {/* Renderização Markdown segura (somente visualização) */}
            <article
              ref={editorRef}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '20px',
                minHeight: '45vh',
                lineHeight: 1.7,
                fontFamily: 'Inter',
                fontSize: '16px'
              }}
              dangerouslySetInnerHTML={{ __html: marked.parse(markdown || '') }}
            />
          </>
        );
      
      case 'linkedin-enxuto':
        return (
          <div style={{ height: '45vh', display: 'flex', flexDirection: 'column' }}>
            {isCheckingExisting ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)',
                fontFamily: 'Inter',
                fontSize: '16px'
              }}>
                Verificando conteúdo existente...
              </div>
            ) : !hasContent ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '20px'
              }}>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontFamily: 'Inter',
                  fontSize: '16px',
                  textAlign: 'center',
                  maxWidth: '300px'
                }}>
                  Gere um post enxuto para LinkedIn usando IA da LINA
                </div>
                
                <button
                  onClick={handleGenerateLinkedinPost}
                  disabled={isGenerating}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: isGenerating ? '#666' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '150px'
                  }}
                >
                  {isGenerating ? 'Gerando...' : 'Gerar com LINA'}
                </button>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '20px',
                height: '100%',
                overflow: 'auto'
              }}>
                <div style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter',
                  fontWeight: '600',
                  fontSize: '18px',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--border-primary)',
                  paddingBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>LinkedIn Post (enxuto)</span>
                  <button
                    onClick={() => {
                      setHasContent(false);
                      setLinkedinContent('');
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Gerar Novo
                  </button>
                </div>
                <div style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {linkedinContent}
                </div>
              </div>
            )}
          </div>
        );
      
      case 'linkedin-informativo':
        return (
          <div style={{ height: '45vh', display: 'flex', flexDirection: 'column' }}>
            {isCheckingExisting ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)',
                fontFamily: 'Inter',
                fontSize: '16px'
              }}>
                Verificando conteúdo existente...
              </div>
            ) : !hasContent ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '20px'
              }}>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontFamily: 'Inter',
                  fontSize: '16px',
                  textAlign: 'center',
                  maxWidth: '300px'
                }}>
                  Gere um post informativo para LinkedIn usando IA da LINA
                </div>
                
                <button
                  onClick={handleGenerateLinkedinPost}
                  disabled={isGenerating}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: isGenerating ? '#666' : '#0077b5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '150px'
                  }}
                >
                  {isGenerating ? 'Gerando...' : 'Gerar com LINA'}
                </button>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '20px',
                height: '100%',
                overflow: 'auto'
              }}>
                <div style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: '18px',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--border-primary)',
                  paddingBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>LinkedIn Post (informativo)</span>
                  <button
                    onClick={() => {
                      setHasContent(false);
                      setLinkedinContent('');
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Gerar Novo
                  </button>
                </div>
                <div style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter',
                  fontSize: '16px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {linkedinContent}
                </div>
              </div>
            )}
          </div>
        );
      
      case 'instagram':
        return (
          <div style={{ height: '45vh', display: 'flex', flexDirection: 'column' }}>
            {isCheckingExisting ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)',
                fontFamily: 'Inter',
                fontSize: '16px'
              }}>
                Verificando conteúdo existente...
              </div>
            ) : !hasContent ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '20px'
              }}>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontFamily: 'Inter',
                  fontSize: '16px',
                  textAlign: 'center',
                  maxWidth: '300px'
                }}>
                  Gere um post para Instagram usando IA da LINA
                </div>
                
                <button
                  onClick={handleGenerateLinkedinPost}
                  disabled={isGenerating}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: isGenerating ? '#666' : '#E4405F',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '150px'
                  }}
                >
                  {isGenerating ? 'Gerando...' : 'Gerar com LINA'}
                </button>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '20px',
                height: '100%',
                overflow: 'auto'
              }}>
                <div style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: '18px',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--border-primary)',
                  paddingBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Instagram Post</span>
                  <button
                    onClick={() => {
                      setHasContent(false);
                      setLinkedinContent('');
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Gerar Novo
                  </button>
                </div>
                <div style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter',
                  fontSize: '16px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {linkedinContent}
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1002]"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(2px)'
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Container */}
      <div
        className="absolute inset-0"
        style={{ display: 'flex', justifyContent: 'flex-end' }}
        onClick={(e) => {
          // Evitar fechar ao clicar dentro do conteúdo
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        {/* Sidebar de Leitura */}
        <div
          style={{
            width: 'min(1700px, 82vw)',
            height: '100vh',
            backgroundColor: 'var(--bg-primary)',
            borderLeft: '1px solid var(--border-primary)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
            animation: 'slideInRight 0.3s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Content */}
          <div
            className="flex-1 overflow-auto"
            style={{ padding: '20px', position: 'relative' }}
          >
            {/* Botão de fechar discreto */}
            <button
              onClick={onClose}
              aria-label="Fechar leitor"
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                zIndex: 10,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
              }}
            >
              <X size={16} />
            </button>
            <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
              {/* Caixa de texto principal - reduzida para criar espaço livre */}
              <div style={{ flex: 1, minWidth: 0, maxWidth: 'calc(100% - 300px)' }}>
                {renderContent()}
              </div>

              {/* Botões à direita */}
              <div style={{ 
                width: '200px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px',
                flexShrink: 0
              }}>
                <div style={{
                  color: '#A0A0A0',
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 14,
                  marginBottom: 8,
                }}>
                  Ações
                </div>
                
                {/* Botão Blog Post */}
                <button
                  onClick={() => setSelectedButton('blog')}
                  style={{
                    padding: '14px 18px',
                    backgroundColor: selectedButton === 'blog' ? '#333333' : '#2A2A2A',
                    border: `1px solid ${selectedButton === 'blog' ? '#666666' : '#333333'}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: selectedButton === 'blog' ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: selectedButton === 'blog' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  Blog Post
                </button>

                {/* Botão LinkedIn Post (enxuto) */}
                <button
                  onClick={() => setSelectedButton('linkedin-enxuto')}
                  style={{
                    padding: '14px 18px',
                    backgroundColor: selectedButton === 'linkedin-enxuto' ? '#333333' : '#2A2A2A',
                    border: `1px solid ${selectedButton === 'linkedin-enxuto' ? '#666666' : '#333333'}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: selectedButton === 'linkedin-enxuto' ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: selectedButton === 'linkedin-enxuto' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                    position: 'relative',
                  }}
                >
                  LinkedIn Post (enxuto)
                </button>

                {/* Botão LinkedIn Post (informativo) */}
                <button
                  onClick={() => setSelectedButton('linkedin-informativo')}
                  style={{
                    padding: '14px 18px',
                    backgroundColor: selectedButton === 'linkedin-informativo' ? '#333333' : '#2A2A2A',
                    border: `1px solid ${selectedButton === 'linkedin-informativo' ? '#666666' : '#333333'}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: selectedButton === 'linkedin-informativo' ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: selectedButton === 'linkedin-informativo' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  LinkedIn Post (informativo)
                </button>

                {/* Botão Instagram Post */}
                <button
                  onClick={() => setSelectedButton('instagram')}
                  style={{
                    padding: '14px 18px',
                    backgroundColor: selectedButton === 'instagram' ? '#333333' : '#2A2A2A',
                    border: `1px solid ${selectedButton === 'instagram' ? '#666666' : '#333333'}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: selectedButton === 'instagram' ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: selectedButton === 'instagram' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  Instagram Post
                </button>
              </div>
            </div>
            <style>{`
              article h1 { font-size: 22px; font-weight: 700; margin: 8px 0 12px; }
              article h2 { font-size: 18px; font-weight: 700; margin: 8px 0 10px; }
              article h3 { font-size: 16px; font-weight: 600; margin: 8px 0 8px; }
              article p { margin: 8px 0; }
              article ul, article ol { margin: 8px 0 8px 20px; }
              article li { margin: 4px 0; }
              article blockquote { border-left: 3px solid var(--border-primary); padding-left: 12px; color: var(--text-secondary); margin: 8px 0; }
              article code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
              article pre { background: rgba(255,255,255,0.06); padding: 12px; border-radius: 6px; overflow: auto; }
              article a { color: var(--primary-green); text-decoration: none; }
              article a:hover { text-decoration: underline; }
              article hr { border: none; border-top: 1px solid var(--border-primary); margin: 12px 0; }
              
              @keyframes slideInRight {
                from {
                  transform: translateX(100%);
                  opacity: 0;
                }
                to {
                  transform: translateX(0);
                  opacity: 1;
                }
              }
              
              @keyframes pulse {
                0%, 100% {
                  opacity: 1;
                  transform: scale(1);
                }
                50% {
                  opacity: 0.7;
                  transform: scale(1.1);
                }
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsReaderPanel;


