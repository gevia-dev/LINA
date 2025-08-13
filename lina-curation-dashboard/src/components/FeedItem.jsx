import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, CheckCircle2, Clock, Sparkles, BookmarkCheck, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SourceAvatar from './SourceAvatar';
import LazyImage from './LazyImage';
import { getRelativeTime, isNewsNew } from '../utils/dateHelpers';
import { calculateReadTime, extractPreview } from '../utils/textHelpers';
import { getContextualIcon, toggleSavedItem } from '../utils/iconHelpers';
import { getTagColors } from '../utils/tagColors';
import linaPfp from '../assets/imgs/lina_pfp.png';

const FeedItem = ({ item, isSelected, onClick, onMarkAsRead, index = 0, isCompact = false }) => {
  const [isRead, setIsRead] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const elementRef = useRef(null);
  const previewRef = useRef(null);

  // Calcular propriedades da notícia
  const isNew = isNewsNew(item.created_at || item.published_at);
  const preview = extractPreview(item.structured_summary, '');
  const readTime = calculateReadTime(item.title + ' ' + preview);
  const relativeTime = getRelativeTime(item.created_at || item.published_at);
  const { Icon: ContextIcon, color: iconColor, tooltip } = getContextualIcon(item);

  // Inicializar estados
  useEffect(() => {
    const readItems = JSON.parse(localStorage.getItem('readNewsItems') || '[]');
    const savedItems = JSON.parse(localStorage.getItem('savedNewsItems') || '[]');
    setIsRead(readItems.includes(item.id));
    setIsSaved(savedItems.includes(item.id));
  }, [item.id]);

  // Verificar se o texto está sendo truncado (apenas quando não está expandido)
  useEffect(() => {
    if (previewRef.current && preview && !isExpanded) {
      const element = previewRef.current;
      setIsTextTruncated(element.scrollHeight > element.clientHeight);
    }
  }, [preview, isExpanded]);

  // Intersection Observer para marcar como lido
  useEffect(() => {
    if (!elementRef.current || isRead) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Marcar como lido após 2 segundos de visualização
            setTimeout(() => {
              if (entry.isIntersecting) {
                const readItems = JSON.parse(localStorage.getItem('readNewsItems') || '[]');
                if (!readItems.includes(item.id)) {
                  readItems.push(item.id);
                  localStorage.setItem('readNewsItems', JSON.stringify(readItems));
                  setIsRead(true);
                  onMarkAsRead?.(item.id);
                  
                  // Animação sutil ao marcar como lido
                  toast.success('Notícia marcada como lida', {
                    duration: 1500,
                    position: 'bottom-right',
                    style: {
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-primary)',
                      fontSize: '12px'
                    }
                  });
                }
              }
            }, 2000);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [item.id, isRead, onMarkAsRead]);

  // Ações
  const handleSave = (e) => {
    e.stopPropagation();
    const newSavedState = toggleSavedItem(item.id);
    setIsSaved(newSavedState);
    
    toast.success(newSavedState ? 'Notícia salva!' : 'Notícia removida dos salvos', {
      duration: 2000,
      position: 'bottom-right',
      style: {
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-primary)',
        fontSize: '12px'
      }
    });
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const shareUrl = item.link || window.location.href;
    const shareTitle = item.title || 'LiNA';
    const shareText = preview || 'Confira esta notícia da LiNA';

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      }

      await navigator.clipboard.writeText(`${shareTitle}\n${shareUrl}`);
      toast.success('Link copiado para a área de transferência', {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)',
          fontSize: '12px'
        }
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      toast.error('Não foi possível compartilhar agora', {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)',
          fontSize: '12px'
        }
      });
    }
  };

  const handlePublishToggle = async (e) => {
    e.stopPropagation();
    try {
      const event = new CustomEvent('toggle-news-published', { detail: { item } });
      window.dispatchEvent(event);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Animações do Framer Motion
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.3,
        delay: index * 0.05,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.01,
      y: -2,
      boxShadow: "0 8px 25px rgba(43, 178, 76, 0.15)",
      transition: { duration: 0.2 }
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  return (
    <motion.div
      ref={elementRef}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      className="cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
      tabIndex={0}
      role="article"
      aria-label={`Notícia: ${item.title}`}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        fontFamily: 'Inter',
        padding: '12px',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: 'none',
        opacity: isRead ? 0.8 : 1,
        position: 'relative',
        height: isCompact ? '60px' : 'auto',
        minHeight: isCompact ? '60px' : '100px',
        marginBottom: '4px'
      }}
    >
      {/* Indicador de "novo" */}
      {isNew && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: 'var(--primary-green)',
          color: 'var(--text-white)',
          fontSize: '10px',
          fontWeight: '600',
          padding: '2px 6px',
          borderRadius: '12px',
          zIndex: 1
        }}>
          <Sparkles size={10} />
          NOVO
        </div>
      )}

      {/* Grid Layout adaptável */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isCompact ? '24px 1fr auto' : '1fr 100px', 
        gap: isCompact ? '8px' : '12px',
        alignItems: isCompact ? 'center' : 'start',
        height: '100%'
      }}>
        {/* Ícone contextual (apenas no modo compacto) */}
        {isCompact && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ContextIcon 
              size={16} 
              color={iconColor}
              title={tooltip}
              style={{ flexShrink: 0 }}
            />
          </div>
        )}

        {/* Conteúdo */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: isCompact ? '2px' : '4px',
            flexWrap: isCompact ? 'nowrap' : 'wrap'
          }}>
            {/* Avatar (apenas no modo normal) */}
            {!isCompact && (
              <SourceAvatar 
                sourceName="LiNA" 
                imageUrl={linaPfp}
                size={20} 
              />
            )}
            
            {/* Nome da fonte */}
            <span style={{
              color: 'var(--text-primary)',
              fontSize: isCompact ? '11px' : '12px',
              fontWeight: '500',
              flexShrink: 0
            }}>
              LiNA
            </span>
            
            {/* Separador */}
            <span style={{ color: 'var(--text-secondary)', fontSize: isCompact ? '11px' : '12px', flexShrink: 0 }}>•</span>
            
            {/* Tempo relativo */}
            <span style={{
              color: 'var(--text-secondary)',
              fontSize: isCompact ? '11px' : '12px',
              fontWeight: '400',
              flexShrink: 0
            }}>
              {relativeTime}
            </span>
            
            {/* Ícone contextual (apenas no modo normal) */}
            {!isCompact && (
              <ContextIcon 
                size={14} 
                color={iconColor}
                title={tooltip}
                style={{ marginLeft: '4px', flexShrink: 0 }}
              />
            )}
            
            {/* Tag da categoria */}
            {item.macro_categoria && (
              <span style={{
                marginLeft: 'auto',
                ...getTagColors(item.macro_categoria),
                fontSize: isCompact ? '9px' : '10px',
                fontWeight: '500',
                padding: isCompact ? '1px 4px' : '2px 6px',
                borderRadius: '4px',
                flexShrink: 0,
                border: `1px solid ${getTagColors(item.macro_categoria).borderColor}`
              }}>
                {item.macro_categoria}
              </span>
            )}
          </div>
          
          {/* Título */}
          <h3 style={{
            color: 'var(--text-primary)',
            fontFamily: 'Inter',
            fontWeight: '600',
            fontSize: isCompact ? '13px' : '15px',
            lineHeight: '1.3',
            margin: '0',
            marginBottom: isCompact ? '0' : '4px',
            display: '-webkit-box',
            WebkitLineClamp: isCompact ? 1 : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: isCompact ? '1' : 'none'
          }}>
          {item.title || 'Sem título'}
        </h3>
          
          {/* Preview (apenas no modo normal) */}
          {!isCompact && preview && (
            <motion.div 
              ref={previewRef}
              style={{
                color: 'var(--text-secondary)',
                fontFamily: 'Inter',
                fontSize: '13px',
                fontWeight: '400',
                marginBottom: '8px',
                lineHeight: '1.4',
                display: isExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: isExpanded ? 'unset' : 2,
                WebkitBoxOrient: isExpanded ? 'unset' : 'vertical',
                overflow: isExpanded ? 'visible' : 'hidden',
                textOverflow: isExpanded ? 'unset' : 'ellipsis'
              }}
              animate={{
                opacity: 1
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {preview}
            </motion.div>
          )}
          
          {/* Botão expandir (apenas quando o texto está sendo truncado e não expandido) */}
          {!isCompact && preview && isTextTruncated && !isExpanded && (
            <motion.button
              onClick={handleExpand}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-green)',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '8px',
                alignSelf: 'flex-start',
                transition: 'all 0.2s ease'
              }}
            >
              <ChevronDown size={12} />
              Ler mais
            </motion.button>
          )}

          {/* Botão recolher (apenas quando expandido) */}
          {!isCompact && preview && isExpanded && (
            <motion.button
              onClick={handleExpand}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-green)',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '8px',
                alignSelf: 'flex-start',
                transition: 'all 0.2s ease'
              }}
            >
              <ChevronUp size={12} />
              Recolher
            </motion.button>
          )}
          
          {/* Footer (apenas no modo normal) */}
          {!isCompact && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'auto'
            }}>
              {/* Tempo de leitura */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: '400'
              }}>
                <Clock size={12} />
                <span>{readTime}</span>
              </div>
              
              {/* Ações */}
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <motion.button
                  onClick={handleSave}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isSaved ? 'var(--primary-green)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px'
                  }}
                  title={isSaved ? 'Remover dos salvos' : 'Salvar notícia'}
                >
                  {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                </motion.button>
                
                <motion.button
                  onClick={handlePublishToggle}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px'
                  }}
                  title="Marcar como publicado"
                >
                  <CheckCircle2 size={14} />
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* Ações compactas (modo compacto) ou Thumbnail (modo normal) */}
        {isCompact ? (
          <div style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <motion.button
              onClick={handleSave}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: 'none',
                border: 'none',
                color: isSaved ? 'var(--primary-green)' : 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '2px'
              }}
              title={isSaved ? 'Remover dos salvos' : 'Salvar notícia'}
            >
              {isSaved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
            </motion.button>
            
            <motion.button
              onClick={handleShare}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
          style={{ 
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '2px'
              }}
              title="Compartilhar notícia"
            >
              <Share2 size={12} />
            </motion.button>
          </div>
        ) : (
          <LazyImage
            src={item.image_url || item.thumbnail_url}
            alt={item.title}
            placeholder="📰"
            style={{
              width: '100px',
              height: '100%',
              borderRadius: '6px',
              flexShrink: 0,
              overflow: 'hidden',
              position: 'relative'
            }}
          />
      )}
    </div>
    </motion.div>
  );
};

export default FeedItem;