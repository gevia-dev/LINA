import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, PenTool, Linkedin, Instagram, Loader2, FileText, Sparkles, Edit, Save, X as XIcon } from 'lucide-react';
import { marked } from 'marked';
import { fetchLinaNewsById, triggerLinkedinWebhook } from '../services/contentApi';
import { toast } from 'react-hot-toast';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

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

// Componente Skeleton para loading
const ContentSkeleton = React.memo(() => (
  <div style={{ padding: '24px' }}>
    <div style={{
      height: '32px',
      backgroundColor: 'var(--bg-tertiary)',
      borderRadius: '6px',
      marginBottom: '16px',
      animation: 'pulse 1.5s ease-in-out infinite',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }} />
    <div style={{
      height: '16px',
      backgroundColor: 'var(--bg-tertiary)',
      borderRadius: '4px',
      marginBottom: '12px',
      width: '80%',
      animation: 'pulse 1.5s ease-in-out infinite 0.2s',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    }} />
    <div style={{
      height: '16px',
      backgroundColor: 'var(--bg-tertiary)',
      borderRadius: '4px',
      marginBottom: '12px',
      width: '90%',
      animation: 'pulse 1.5s ease-in-out infinite 0.4s',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    }} />
    <div style={{
      height: '16px',
      backgroundColor: 'var(--bg-tertiary)',
      borderRadius: '4px',
      marginBottom: '12px',
      width: '70%',
      animation: 'pulse 1.5s ease-in-out infinite 0.6s',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    }} />
  </div>
));

ContentSkeleton.displayName = 'ContentSkeleton';

// Componente Empty State
const EmptyState = React.memo(({ icon: Icon, title, description, buttonText, onAction, isLoading, buttonColor = 'var(--primary-green)' }) => (
  <div 
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '24px',
      padding: '32px',
      textAlign: 'center'
    }}
    role="region"
    aria-label={`Estado vazio para ${title}`}
  >
    <div style={{
      width: '64px',
      height: '64px',
      backgroundColor: 'var(--bg-tertiary)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-secondary)',
      marginBottom: '8px',
      animation: 'fadeIn 0.5s ease-out',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      <Icon size={32} aria-hidden="true" />
    </div>
    
    <h2 style={{
      color: 'var(--text-primary)',
      fontFamily: 'Inter',
      fontWeight: '600',
      fontSize: '18px',
      margin: 0,
      lineHeight: 1.3
    }}>
      {title}
    </h2>
    
    <p style={{
      color: 'var(--text-secondary)',
      fontFamily: 'Inter',
      fontSize: '14px',
      maxWidth: '300px',
      lineHeight: '1.5',
      margin: 0
    }}>
      {description}
    </p>
    
    <button
      onClick={onAction}
      disabled={isLoading}
      aria-label={isLoading ? 'Gerando conteúdo...' : buttonText}
      style={{
        padding: '16px 24px',
        backgroundColor: isLoading ? 'var(--bg-tertiary)' : buttonColor,
        color: 'var(--text-white)',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        minWidth: '150px',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transform: 'scale(1)',
        animation: 'fadeIn 0.5s ease-out 0.2s both',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        outline: 'none'
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid var(--primary-green)';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
          Gerando...
        </>
      ) : (
        <>
          <Sparkles size={16} aria-hidden="true" />
          {buttonText}
        </>
      )}
    </button>
  </div>
));

EmptyState.displayName = 'EmptyState';

const NewsReaderPanel = ({ item, onClose }) => {
  const [title, setTitle] = useState(item?.title || 'Sem título');
  const [markdown, setMarkdown] = useState('');
  const [selectedButton, setSelectedButton] = useState('blog');
  const [linkedinContent, setLinkedinContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [isEditingInstagram, setIsEditingInstagram] = useState(false);
  const [isEditingLinkedinShort, setIsEditingLinkedinShort] = useState(false);
  const [isEditingLinkedinLong, setIsEditingLinkedinLong] = useState(false);
  const editorRef = useRef(null);

  // Cria o editor BlockNote com configuração básica
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Start writing..."
      }
    ]
  });

  // Memoização das configurações das tabs
  const tabs = useMemo(() => [
    { id: 'blog', label: 'Blog Post', icon: FileText, description: 'Visualizar e editar conteúdo do blog' },
    { id: 'linkedin-enxuto', label: 'LinkedIn Short', icon: Linkedin, description: 'Gerar post enxuto para LinkedIn' },
    { id: 'linkedin-informativo', label: 'LinkedIn Long', icon: Linkedin, description: 'Gerar post informativo para LinkedIn' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, description: 'Gerar post para Instagram' }
  ], []);

  // Função para determinar a cor da linha indicadora baseada na plataforma
  const getIndicatorColor = useCallback((selectedTab) => {
    if (selectedTab.startsWith('linkedin')) {
      return 'var(--linkedin-primary)';
    } else if (selectedTab === 'instagram') {
      return 'var(--instagram-primary)';
    } else {
      return 'var(--primary-green)'; // Cor padrão para blog
    }
  }, []);

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

  const handleGenerateLinkedinPost = useCallback(async () => {
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
  }, [item?.id, selectedButton, isGenerating]);

  const checkExistingContent = useCallback(async () => {
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
  }, [item?.id, selectedButton]);

  const handleTabChange = useCallback((tabId) => {
    setSelectedButton(tabId);
  }, []);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Função para renderizar conteúdo baseado no botão selecionado
  const renderContent = useCallback(() => {
    console.log('🔍 renderContent: selectedButton:', selectedButton);
    console.log('🔍 renderContent: isEditing:', isEditing);
    console.log('🔍 renderContent: hasContent:', hasContent);
    switch (selectedButton) {
      case 'blog':
        return (
          <main style={{ animation: 'fadeIn 0.3s ease-out' }}>
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
                marginBottom: '24px',
                lineHeight: 1.3,
                minHeight: '32px'
              }}
              role="textbox"
              aria-label="Título do artigo"
              tabIndex={0}
            >
              {title}
            </div>

            {/* Renderização Markdown segura */}
            <article
              ref={editorRef}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '40px',
                maxWidth: '800px',
                margin: '0 auto',
                lineHeight: 1.8,
                fontFamily: 'Inter',
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflowY: 'auto',
                maxHeight: '70vh'
              }}
              dangerouslySetInnerHTML={{ __html: marked.parse(markdown || '') }}
            />
          </main>
        );
      
      case 'linkedin-enxuto':
        return (
          <main style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {isCheckingExisting ? (
              <ContentSkeleton />
            ) : !hasContent ? (
              <EmptyState
                icon={Linkedin}
                title="LinkedIn Post Enxuto"
                description="Gere um post conciso e impactante para LinkedIn usando a IA da LINA. Perfeito para engajamento rápido."
                buttonText="Gerar com LINA"
                onAction={handleGenerateLinkedinPost}
                isLoading={isGenerating}
                buttonColor="var(--linkedin-primary)"
              />
            ) : (
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '40px',
                maxWidth: '800px',
                margin: '0 auto',
                height: '100%',
                overflow: 'auto',
                animation: 'fadeIn 0.3s ease-out',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflowY: 'auto',
                maxHeight: '70vh'
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
                      setIsEditing(true);
                      setEditingContent(linkedinContent);
                      // Configurar o editor com o conteúdo atual
                      editor.replaceBlocks(
                        editor.document,
                        [
                          {
                            type: "paragraph",
                            content: linkedinContent || "Start writing..."
                          }
                        ]
                      );
                    }}
                    aria-label="Editar post enxuto"
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minHeight: '32px',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = '2px solid var(--linkedin-primary)';
                      e.currentTarget.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                    }}
                  >
                    <Edit size={14} aria-hidden="true" />
                    Editar
                  </button>
                </div>
                {isEditing ? (
                  <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '8px',
                    padding: '20px',
                    maxHeight: '70vh',
                    overflowY: 'auto'
                  }}>
                    {/* Controles do Editor */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '16px',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={() => setIsEditing(false)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Salvar conteúdo editado
                          const newContent = editor.document.map(block => 
                            block.content?.map(item => item.text).join('')
                          ).join('\n');
                          setLinkedinContent(newContent);
                          setIsEditing(false);
                          toast.success('Conteúdo salvo com sucesso!');
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--linkedin-primary)',
                          color: 'var(--text-white)',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--linkedin-hover)';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--linkedin-primary)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        Salvar
                      </button>
                    </div>

                    {/* Editor BlockNote */}
                    <div style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: '8px',
                      maxHeight: '60vh',
                      overflowY: 'auto'
                    }}>
                      <BlockNoteView 
                        editor={editor} 
                        theme="dark"
                        style={{
                          backgroundColor: 'var(--bg-primary)'
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    color: 'var(--text-primary)',
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {linkedinContent}
                  </div>
                )}
              </div>
            )}
          </main>
        );
      
      case 'linkedin-informativo':
        return (
          <main style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {isCheckingExisting ? (
              <ContentSkeleton />
            ) : !hasContent ? (
              <EmptyState
                icon={Linkedin}
                title="LinkedIn Post Informativo"
                description="Crie posts detalhados e educativos para LinkedIn que demonstrem expertise e gerem discussões profundas."
                buttonText="Gerar com LINA"
                onAction={handleGenerateLinkedinPost}
                isLoading={isGenerating}
                buttonColor="var(--linkedin-primary)"
              />
            ) : (
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '40px',
                maxWidth: '800px',
                margin: '0 auto',
                height: '100%',
                overflow: 'auto',
                animation: 'fadeIn 0.3s ease-out',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflowY: 'auto',
                maxHeight: '70vh'
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
                      setIsEditing(true);
                      setEditingContent(linkedinContent);
                      // Configurar o editor com o conteúdo atual
                      editor.replaceBlocks(
                        editor.document,
                        [
                          {
                            type: "paragraph",
                            content: linkedinContent || "Start writing..."
                          }
                        ]
                      );
                    }}
                    aria-label="Editar post informativo"
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minHeight: '32px',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = '2px solid var(--linkedin-primary)';
                      e.currentTarget.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                    }}
                  >
                    <Edit size={14} aria-hidden="true" />
                    Editar
                  </button>
                </div>
                <div style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap'
                }}>
                  {linkedinContent}
                </div>
              </div>
            )}
          </main>
        );
      
      case 'instagram':
        return (
          <main style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {isCheckingExisting ? (
              <ContentSkeleton />
            ) : !hasContent ? (
              <EmptyState
                icon={Instagram}
                title="Instagram Post"
                description="Crie posts visuais e envolventes para Instagram que capturem a atenção e aumentem o engajamento."
                buttonText="Gerar com LINA"
                onAction={handleGenerateLinkedinPost}
                isLoading={isGenerating}
                buttonColor="var(--instagram-primary)"
              />
            ) : (
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '40px',
                maxWidth: '800px',
                margin: '0 auto',
                height: '100%',
                overflow: 'auto',
                animation: 'fadeIn 0.3s ease-out',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflowY: 'auto',
                maxHeight: '70vh'
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
                      console.log('🔍 Instagram: Botão Editar clicado');
                      console.log('🔍 Instagram: Estado atual isEditingInstagram:', isEditingInstagram);
                      setIsEditingInstagram(true);
                      setEditingContent(linkedinContent);
                      console.log('🔍 Instagram: Estado após setIsEditingInstagram:', true);
                      // Configurar o editor com o conteúdo atual
                      editor.replaceBlocks(
                        editor.document,
                        [
                          {
                            type: "paragraph",
                            content: linkedinContent || "Start writing..."
                          }
                        ]
                      );
                    }}
                    aria-label="Editar post para Instagram"
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minHeight: '32px',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = '2px solid var(--instagram-primary)';
                      e.currentTarget.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                    }}
                  >
                    <Edit size={14} aria-hidden="true" />
                    Editar
                  </button>
                </div>
                {console.log('🔍 Instagram: Renderizando conteúdo, isEditingInstagram:', isEditingInstagram)}
                {isEditingInstagram ? (
                  <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '8px',
                    padding: '20px',
                    maxHeight: '70vh',
                    overflowY: 'auto'
                  }}>
                    {/* Controles do Editor */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '16px',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={() => setIsEditingInstagram(false)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Salvar conteúdo editado
                          const newContent = editor.document.map(block => 
                            block.content?.map(item => item.text).join('')
                          ).join('\n');
                          setLinkedinContent(newContent);
                          setIsEditingInstagram(false);
                          toast.success('Conteúdo salvo com sucesso!');
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--instagram-primary)',
                          color: 'var(--text-white)',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--instagram-hover)';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--instagram-primary)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        Salvar
                      </button>
                    </div>

                    {/* Editor BlockNote */}
                    <div style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: '8px',
                      maxHeight: '60vh',
                      overflowY: 'auto'
                    }}>
                      <BlockNoteView 
                        editor={editor} 
                        theme="dark"
                        style={{
                          backgroundColor: 'var(--bg-primary)'
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    color: 'var(--text-primary)',
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {linkedinContent}
                  </div>
                )}
              </div>
            )}
          </main>
        );
      
      default:
        return null;
    }
  }, [selectedButton, isCheckingExisting, hasContent, isGenerating, title, markdown, linkedinContent, handleGenerateLinkedinPost, isEditing, editingContent, isEditingInstagram, isEditingLinkedinShort, isEditingLinkedinLong]);

  return (
    <div
      className="fixed inset-0 z-[1002]"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(2px)'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-title"
    >
      {/* Container */}
      <div
        className="absolute inset-0"
        style={{ display: 'flex', justifyContent: 'flex-end' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        {/* Sidebar de Leitura */}
        <div
          style={{
            width: 'min(1700px, 95vw)',
            maxWidth: '95vw',
            height: '100vh',
            backgroundColor: 'var(--bg-primary)',
            borderLeft: '1px solid var(--border-primary)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.3)',
            animation: 'slideInRight 0.3s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header com título e botão de fechar */}
          <header
            style={{
              padding: '24px 24px 16px 24px',
              borderBottom: '1px solid var(--border-primary)',
              backgroundColor: 'var(--bg-primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <h1
              id="reader-title"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: '24px',
                margin: 0,
                lineHeight: 1.2
              }}
            >
              Leitor de Notícias
            </h1>
            
            <button
              onClick={handleClose}
              aria-label="Fechar leitor de notícias"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '44px',
                minWidth: '44px',
                outline: 'none'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--border-secondary)';
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'var(--border-primary)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid var(--primary-green)';
                e.currentTarget.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          {/* Tabs horizontais */}
          <nav
            style={{
              padding: '0 24px',
              borderBottom: '1px solid var(--border-primary)',
              backgroundColor: 'var(--bg-primary)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            role="tablist"
            aria-label="Navegação por abas de conteúdo"
          >
            <div
              style={{
                display: 'flex',
                gap: '6px',
                padding: '16px 8px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={selectedButton === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  onClick={() => handleTabChange(tab.id)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: selectedButton === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                    border: `1px solid ${selectedButton === tab.id ? 
                      (tab.id.startsWith('linkedin') ? 'var(--linkedin-primary)' : 
                       tab.id === 'instagram' ? 'var(--instagram-primary)' : 
                       'var(--border-secondary)') : 
                      'var(--border-primary)'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: selectedButton === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontFamily: 'Inter',
                    fontWeight: selectedButton === tab.id ? '500' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    minWidth: '120px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    outline: 'none',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (selectedButton !== tab.id) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                      // Usar cor da plataforma para o hover se for LinkedIn ou Instagram
                      if (tab.id.startsWith('linkedin')) {
                        e.currentTarget.style.borderColor = 'var(--linkedin-primary)';
                      } else if (tab.id === 'instagram') {
                        e.currentTarget.style.borderColor = 'var(--instagram-primary)';
                      } else {
                        e.currentTarget.style.borderColor = 'var(--border-secondary)';
                      }
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedButton !== tab.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.borderColor = 'var(--border-primary)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                >
                  {tab.icon && <tab.icon size={16} aria-hidden="true" />}
                  <span>{tab.label}</span>
                  {selectedButton === tab.id && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-1px',
                        left: '0',
                        right: '0',
                        height: '2px',
                        backgroundColor: getIndicatorColor(selectedButton),
                        borderRadius: '1px',
                        animation: 'slideInUp 0.3s ease-out'
                      }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div
            className="flex-1 overflow-auto"
            style={{ 
              padding: '24px', 
              position: 'relative',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--border-primary) var(--bg-primary)'
            }}
            role="tabpanel"
            id={`panel-${selectedButton}`}
            aria-labelledby={`tab-${selectedButton}`}
          >
            {renderContent()}
            
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
              
              /* Responsive breakpoints */
              @media (max-width: 768px) {
                .fixed { width: 100vw !important; }
                .fixed > div { width: 100% !important; }
                .fixed header { padding: 16px !important; }
                .fixed nav { padding: 0 16px !important; }
                .fixed > div > div:last-child { padding: 16px !important; }
              }
              
              @media (max-width: 480px) {
                .fixed header { padding: 12px !important; }
                .fixed nav { padding: 0 12px !important; }
                .fixed > div > div:last-child { padding: 12px !important; }
                .fixed h1 { font-size: 20px !important; }
              }
              
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
              
              @keyframes fadeIn {
                from {
                  opacity: 0;
                  transform: translateY(8px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              
              @keyframes slideInUp {
                from {
                  transform: translateY(100%);
                  opacity: 0;
                }
                to {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
              
              @keyframes pulse {
                0%, 100% {
                  opacity: 0.6;
                }
                50% {
                  opacity: 1;
                }
              }
              
              @keyframes spin {
                from {
                  transform: rotate(0deg);
                }
                to {
                  transform: rotate(360deg);
                }
              }
              
              /* Custom scrollbar */
              ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
              
              ::-webkit-scrollbar-track {
                background: var(--bg-primary);
              }
              
              ::-webkit-scrollbar-thumb {
                background: var(--border-primary);
                border-radius: 4px;
              }
              
              ::-webkit-scrollbar-thumb:hover {
                background: var(--border-secondary);
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsReaderPanel;


