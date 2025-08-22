import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, PenTool, Linkedin, Instagram, Loader2, FileText, Sparkles, Edit, Save, X as XIcon } from 'lucide-react';
import { marked } from 'marked';
import { fetchLinaNewsById, triggerLinkedinWebhook } from '../services/contentApi';
import { toast } from 'react-hot-toast';
import CommonTextEditor from './CommonTextEditor';
import ContextSidebar from './ContextSidebar';

// Configura o parser Markdown para respeitar quebras de linha simples e GFM
marked.setOptions({
  gfm: true,
  breaks: true
});

console.log('🔍 NewsReaderPanel - Configurações do marked aplicadas:', marked.getDefaults());

// Converte um texto simples em blocos básicos para o BlockNote
function extractFinalTextMarkdown(item) {
  if (!item) return '';
  if (typeof item.final_text === 'string') {
    console.log('🔍 NewsReaderPanel - final_text original:', item.final_text);
    // Correção inteligente de markdown: adiciona espaço após hashtags de headings
    const correctedMarkdown = item.final_text.replace(/(#{1,6})([^#\s])/g, '$1 $2');
    console.log('🔍 NewsReaderPanel - final_text corrigido:', correctedMarkdown);
    return correctedMarkdown;
  }
  return '';
}

// Componente Skeleton para loading
const ContentSkeleton = React.memo(() => (
  <div style={{ 
    padding: '24px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  }}>
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
      textAlign: 'center',
      flex: 1
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
  const [showContextLibrary, setShowContextLibrary] = useState(false);
  const editorRef = useRef(null);

  // Memoização das configurações das tabs
  const tabs = useMemo(() => [
    { id: 'blog', label: 'Blog Post', icon: FileText, description: 'Visualizar e editar conteúdo do blog' },
    { 
      id: 'linkedin', 
      label: 'LinkedIn', 
      icon: Linkedin, 
      description: 'Posts para LinkedIn',
      isGroup: true,
      subTabs: [
        { id: 'linkedin-enxuto', label: 'Short', description: 'Post enxuto para LinkedIn' },
        { id: 'linkedin-informativo', label: 'Long', description: 'Post informativo para LinkedIn' }
      ]
    },
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

  // Função para determinar a cor do subtítulo baseada na plataforma
  const getPlatformColor = useCallback((tabId) => {
    if (tabId.startsWith('linkedin')) {
      return 'var(--linkedin-primary)';
    } else if (tabId === 'instagram') {
      return 'var(--instagram-primary)';
    } else if (tabId === 'blog') {
      return 'var(--primary-green)';
    } else {
      return 'var(--text-secondary)'; // Cor padrão
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

  const handleEditToggle = useCallback((editing) => {
    setIsEditing(editing);
    setShowContextLibrary(editing); // Mostra a biblioteca quando estiver editando
  }, []);

  // Função para renderizar conteúdo baseado no botão selecionado
  const renderContent = useCallback(() => {
    console.log('🔍 renderContent: selectedButton:', selectedButton);
    console.log('🔍 renderContent: isEditing:', isEditing);
    console.log('🔍 renderContent: hasContent:', hasContent);
    switch (selectedButton) {
      case 'blog':
        return (
          <main style={{ 
            animation: 'fadeIn 0.3s ease-out',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              overflow: 'auto'
            }}>
              <CommonTextEditor
                content={markdown}
                platform="blog"
                isEditing={isEditing}
                onEditToggle={handleEditToggle}
                onSave={async (newContent) => {
                  setMarkdown(newContent);
                  toast.success('Blog post salvo com sucesso!');
                  console.log('✅ Blog post salvo:', newContent);
                }}
                onCancel={() => {
                  setIsEditing(false);
                  setEditingContent(markdown);
                }}
                placeholder="Comece a escrever seu blog post..."
              />
            </div>
          </main>
        );// a
      
      case 'linkedin-enxuto':
        return (
          <main style={{ 
            animation: 'fadeIn 0.3s ease-out',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
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
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'auto'
              }}>
                <CommonTextEditor
                  content={linkedinContent}
                  platform="linkedin"
                  isEditing={isEditing}
                  onEditToggle={handleEditToggle}
                  onSave={async (newContent) => {
                    setLinkedinContent(newContent);
                    toast.success('Post LinkedIn enxuto salvo com sucesso!');
                    console.log('✅ Post LinkedIn enxuto salvo:', newContent);
                  }}
                  onCancel={() => {
                           setIsEditing(false);
                           setEditingContent(linkedinContent);
                  }}
                  placeholder="Comece a escrever seu post LinkedIn enxuto..."
                />
              </div>
            )}
          </main>
        );
      
      case 'linkedin-informativo':
        return (
          <main style={{ 
            animation: 'fadeIn 0.3s ease-out',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
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
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'auto'
              }}>
                <CommonTextEditor
                  content={linkedinContent}
                  platform="linkedin"
                  isEditing={isEditing}
                  onEditToggle={handleEditToggle}
                  onSave={async (newContent) => {
                    setLinkedinContent(newContent);
                    toast.success('Post LinkedIn informativo salvo com sucesso!');
                    console.log('✅ Post LinkedIn informativo salvo:', newContent);
                  }}
                  onCancel={() => {
                           setIsEditing(false);
                           setEditingContent(linkedinContent);
                  }}
                  placeholder="Comece a escrever seu post LinkedIn informativo..."
                />
              </div>
            )}
          </main>
        );
      
      case 'instagram':
        return (
          <main style={{ 
            animation: 'fadeIn 0.3s ease-out',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
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
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'auto'
              }}>
                <CommonTextEditor
                  content={linkedinContent}
                  platform="instagram"
                  isEditing={isEditing}
                  onEditToggle={handleEditToggle}
                  onSave={async (newContent) => {
                    setLinkedinContent(newContent);
                    toast.success('Post Instagram salvo com sucesso!');
                    console.log('✅ Post Instagram salvo:', newContent);
                  }}
                  onCancel={() => {
                    setIsEditing(false);
                           setEditingContent(linkedinContent);
                  }}
                  placeholder="Comece a escrever seu post Instagram..."
                />
              </div>
            )}
          </main>
        );
      
      default:
        return null;
    }
  }, [selectedButton, isCheckingExisting, hasContent, isGenerating, title, markdown, linkedinContent, handleGenerateLinkedinPost, isEditing, editingContent, handleEditToggle]);

  return (
    <>
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
          style={{ 
            display: 'flex', 
            justifyContent: isEditing ? 'center' : 'flex-end',
            alignItems: isEditing ? 'center' : 'stretch' 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          {/* Sidebar de Leitura */}
          <div
            style={{
              width: isEditing ? '100vw' : 'min(1700px, 95vw)',
              maxWidth: isEditing ? '100vw' : '95vw',
              height: '100vh',
              backgroundColor: 'var(--bg-primary)',
              borderLeft: isEditing ? 'none' : '1px solid var(--border-primary)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isEditing ? 'none' : '-8px 0 32px rgba(0, 0, 0, 0.3)',
              animation: 'slideInRight 0.15s ease-in-out',
              transition: 'all 0.3s ease-in-out'
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
                  fontWeight: '700',
                  fontSize: '24px',
                  margin: 0,
                  lineHeight: '1.2'
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

            {/* Content principal com tabs integradas */}
            <div
              className="flex-1 overflow-hidden"
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
              {/* Container do conteúdo com tabs integradas */}
              <div style={{ display: 'flex', gap: '24px', height: '100%', alignItems: 'flex-start' }}>
                {/* Área principal do conteúdo */}
                <div style={{ 
                  flex: 1, 
                  minWidth: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  {renderContent()}
                </div>

                {/* Barra lateral com tabs integrada ao painel */}
                <div
                  style={{
                    width: showContextLibrary ? '600px' : '280px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    flexShrink: 0,
                    height: '100%',
                    transition: 'width 0.3s ease-in-out'
                  }}
                >
                  {showContextLibrary ? (
                    /* Biblioteca de Contexto - ContextSidebar integrado */
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <ContextSidebar
                        newsData={item}
                        selectedBlock={null}
                        onTransferItem={(itemId, content) => {
                          console.log('Transferindo item:', itemId, content);
                          toast.success('Item transferido para o editor!');
                        }}
                        onOpenCardModal={(cardData, allCardsData, index, microDataArray) => {
                          console.log('Abrindo modal do card:', cardData);
                        }}
                        isLibraryMode={true}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Título da seção de tabs */}
                      <div
                        style={{
                          padding: '20px 20px 16px 20px',
                          borderBottom: '1px solid var(--border-primary)',
                          backgroundColor: 'var(--bg-secondary)',
                          borderTopLeftRadius: '8px',
                          borderTopRightRadius: '8px'
                        }}
                      >
                        <h2
                          style={{
                            color: 'var(--text-primary)',
                            fontFamily: 'Inter',
                            fontWeight: '600',
                            fontSize: '16px',
                            margin: 0,
                            lineHeight: '1.2'
                          }}
                        >
                          Categorias de Conteúdo
                        </h2>
                      </div>

                      {/* Tabs verticais */}
                      <nav
                        style={{
                          padding: '12px 8px',
                          flex: 1,
                          backgroundColor: 'var(--bg-secondary)',
                          borderBottomLeftRadius: '8px',
                          borderBottomRightRadius: '8px'
                        }}
                        role="tablist"
                        aria-label="Navegação por abas de conteúdo"
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          {tabs.map((tab, index) => (
                            <div key={tab.id}>
                              {tab.isGroup ? (
                                // Tab agrupada (LinkedIn)
                                <div>
                                  {/* Tab principal do grupo */}
                                  <button
                                    role="tab"
                                    aria-selected={selectedButton.startsWith('linkedin')}
                                    aria-controls={`panel-${tab.id}`}
                                    id={`tab-${tab.id}`}
                                    onClick={() => {
                                      // Se clicar na tab principal do LinkedIn, seleciona a primeira subaba
                                      if (selectedButton === 'linkedin') {
                                        handleTabChange('linkedin-enxuto');
                                      } else if (selectedButton.startsWith('linkedin')) {
                                        // Se já está em uma subaba do LinkedIn, expande/colapsa
                                        setSelectedButton('linkedin');
                                      } else {
                                        handleTabChange('linkedin-enxuto');
                                      }
                                    }}
                                    style={{
                                      padding: '12px 16px',
                                      backgroundColor: selectedButton.startsWith('linkedin') ? 'var(--bg-tertiary)' : 'transparent',
                                      border: '1px solid var(--border-primary)',
                                      borderRadius: '6px',
                                      fontSize: '13px',
                                      color: selectedButton.startsWith('linkedin') ? 'var(--text-primary)' : 'var(--text-secondary)',
                                      fontFamily: 'Inter',
                                      fontWeight: selectedButton.startsWith('linkedin') ? '500' : '400',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      position: 'relative',
                                      width: '100%',
                                      minHeight: '44px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      outline: 'none',
                                      textAlign: 'left',
                                      justifyContent: 'space-between'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!selectedButton.startsWith('linkedin')) {
                                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                        e.currentTarget.style.transform = 'scale(1.02)';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!selectedButton.startsWith('linkedin')) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                        e.currentTarget.style.borderColor = 'var(--border-primary)';
                                        e.currentTarget.style.transform = 'scale(1)';
                                      }
                                    }}
                                    onFocus={(e) => {
                                      e.currentTarget.style.outline = 'none';
                                    }}
                                    onBlur={(e) => {
                                      e.currentTarget.style.outline = 'none';
                                    }}
                                  >
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px'
                                    }}>
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '20px',
                                        height: '20px',
                                        flexShrink: 0
                                      }}>
                                        {tab.icon && <tab.icon size={18} aria-hidden="true" />}
                                      </div>
                                      <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: '1px'
                                      }}>
                                        <span style={{ fontWeight: 'inherit' }}>{tab.label}</span>
                                        <span style={{
                                          fontSize: '11px',
                                          color: selectedButton.startsWith('linkedin') ? 'var(--linkedin-primary)' : 'var(--text-tertiary)',
                                          lineHeight: '1.2'
                                        }}>
                                          {tab.description}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Ícone de expansão/colapso */}
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '18px',
                                      height: '18px',
                                      transition: 'transform 0.2s ease',
                                      transform: selectedButton.startsWith('linkedin') && selectedButton !== 'linkedin' ? 'rotate(90deg)' : 'rotate(0deg)'
                                    }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9,18 15,12 9,6"></polyline>
                                      </svg>
                                    </div>
                                  </button>
                                  
                                  {/* Subabas do LinkedIn */}
                                  {selectedButton.startsWith('linkedin') && (
                                    <div style={{
                                      marginLeft: '16px',
                                      marginTop: '6px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      animation: 'slideInDown 0.15s ease-out'
                                    }}>
                                      {tab.subTabs.map((subTab) => (
                                        <button
                                          key={subTab.id}
                                          role="tab"
                                          aria-selected={selectedButton === subTab.id}
                                          aria-controls={`panel-${subTab.id}`}
                                          id={`tab-${subTab.id}`}
                                          onClick={() => handleTabChange(subTab.id)}
                                          style={{
                                            padding: '8px 12px',
                                            backgroundColor: selectedButton === subTab.id ? 'var(--bg-tertiary)' : 'transparent',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: '5px',
                                            fontSize: '12px',
                                            color: selectedButton === subTab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontFamily: 'Inter',
                                            fontWeight: selectedButton === subTab.id ? '500' : '400',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            position: 'relative',
                                            width: '100%',
                                            minHeight: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            outline: 'none',
                                            textAlign: 'left',
                                            justifyContent: 'flex-start'
                                          }}
                                          onMouseEnter={(e) => {
                                            if (selectedButton !== subTab.id) {
                                              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                              e.currentTarget.style.color = 'var(--text-primary)';
                                              e.currentTarget.style.transform = 'scale(1.02)';
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (selectedButton !== subTab.id) {
                                              e.currentTarget.style.backgroundColor = 'transparent';
                                              e.currentTarget.style.color = 'var(--text-secondary)';
                                              e.currentTarget.style.borderColor = 'var(--border-primary)';
                                              e.currentTarget.style.transform = 'scale(1)';
                                            }
                                          }}
                                          onFocus={(e) => {
                                            e.currentTarget.style.outline = 'none';
                                          }}
                                          onBlur={(e) => {
                                            e.currentTarget.style.outline = 'none';
                                          }}
                                        >
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '16px',
                                            height: '16px',
                                            flexShrink: 0
                                          }}>
                                            <div style={{
                                              width: '6px',
                                              height: '6px',
                                              borderRadius: '50%',
                                              backgroundColor: selectedButton === subTab.id ? 'var(--linkedin-primary)' : 'var(--text-tertiary)'
                                            }} />
                                          </div>
                                          <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start',
                                            gap: '1px'
                                          }}>
                                            <span style={{ fontWeight: 'inherit' }}>{subTab.label}</span>
                                            <span style={{
                                              fontSize: '10px',
                                              color: selectedButton === subTab.id ? getPlatformColor(subTab.id) : 'var(--text-tertiary)',
                                              lineHeight: '1.2'
                                            }}>
                                              {subTab.description}
                                            </span>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // Tab normal (Blog e Instagram)
                                <button
                                  role="tab"
                                  aria-selected={selectedButton === tab.id}
                                  aria-controls={`panel-${tab.id}`}
                                  id={`tab-${tab.id}`}
                                  onClick={() => handleTabChange(tab.id)}
                                  style={{
                                    padding: '12px 16px',
                                    backgroundColor: selectedButton === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: selectedButton === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontFamily: 'Inter',
                                    fontWeight: selectedButton === tab.id ? '500' : '400',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                    width: '100%',
                                    minHeight: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    outline: 'none',
                                    textAlign: 'left',
                                    justifyContent: 'flex-start'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (selectedButton !== tab.id) {
                                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                      e.currentTarget.style.color = 'var(--text-primary)';
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
                                  onFocus={(e) => {
                                    e.currentTarget.style.outline = 'none';
                                  }}
                                  onBlur={(e) => {
                                    e.currentTarget.style.outline = 'none';
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '20px',
                                    height: '20px',
                                    flexShrink: 0
                                  }}>
                                    {tab.icon && <tab.icon size={18} aria-hidden="true" />}
                                  </div>
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: '1px'
                                  }}>
                                    <span style={{ fontWeight: 'inherit' }}>{tab.label}</span>
                                    <span style={{
                                      fontSize: '11px',
                                      color: selectedButton === tab.id ? getPlatformColor(tab.id) : 'var(--text-tertiary)',
                                      lineHeight: '1.2'
                                    }}>
                                      {tab.description}
                                    </span>
                                  </div>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </nav>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
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
        
        /* Responsive breakpoints */
        @media (max-width: 768px) {
          .fixed { width: 100vw !important; }
          .fixed > div { width: 100% !important; }
          .fixed header { padding: 16px !important; }
          .fixed > div > div:last-child { padding: 16px !important; }
        }
        
        @media (max-width: 480px) {
          .fixed header { padding: 12px !important; }
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
        
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideInDown {
          from {
            transform: translateY(-20px);
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
    </>
  );
};

export default NewsReaderPanel;


