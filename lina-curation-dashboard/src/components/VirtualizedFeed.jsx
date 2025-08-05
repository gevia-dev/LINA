import React, { useMemo, useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import FeedItem from './FeedItem';
import FeedItemSkeleton from './FeedItemSkeleton';

/**
 * Componente virtualizado para o feed de notícias
 * Renderiza apenas os itens visíveis para otimizar performance
 */
const VirtualizedFeed = ({ 
  groupedNews, 
  selectedNews, 
  onNewsSelect, 
  onMarkAsRead,
  containerHeight,
  containerWidth 
}) => {
  const listRef = useRef(null);

  // Flatten dos dados para virtualização
  const flattenedItems = useMemo(() => {
    const items = [];
    
    groupedNews.forEach((group) => {
      // Adicionar header do grupo
      items.push({
        type: 'header',
        data: group,
        id: `header-${group.date.toISOString()}`
      });
      
      // Adicionar itens do grupo
      group.items.forEach((item) => {
        items.push({
          type: 'item',
          data: item,
          id: item.id
        });
      });
    });
    
    return items;
  }, [groupedNews]);

  // Função para calcular altura dinâmica dos itens
  const getItemSize = (index) => {
    const item = flattenedItems[index];
    
    if (!item) return 100;
    
    if (item.type === 'header') {
      return 60; // Altura do header da data
    }
    
    // Altura estimada do FeedItem baseada no conteúdo
    const newsItem = item.data;
    let height = 80; // Base height (padding, título, footer)
    
    // Adicionar altura do preview se existir
    if (newsItem.structured_summary) {
      try {
        const summary = JSON.parse(newsItem.structured_summary);
        if (summary?.motivo_ou_consequencia) {
          height += 35; // ~2 lines of preview text
        }
      } catch (error) {
        // Ignorar erro
      }
    }
    
    return Math.max(100, height);
  };

  // Componente para renderizar cada item
  const ItemRenderer = ({ index, style }) => {
    const item = flattenedItems[index];
    
    if (!item) {
      return (
        <div style={style}>
          <FeedItemSkeleton />
        </div>
      );
    }
    
    if (item.type === 'header') {
      const group = item.data;
      return (
        <div style={{
          ...style,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: '#121212',
          borderBottom: '1px solid #333333',
          padding: '12px 0'
        }}>
          <h2 style={{
            color: '#E0E0E0',
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 4px 0'
          }}>
            {group.label}
          </h2>
          <p style={{
            color: '#A0A0A0',
            fontFamily: 'Inter',
            fontSize: '12px',
            fontWeight: '400',
            margin: '0'
          }}>
            {group.items.length} notícia{group.items.length !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    
    // Render do FeedItem
    const newsItem = item.data;
    return (
      <div style={{
        ...style,
        paddingBottom: '8px' // Gap entre items
      }}>
        <FeedItem
          item={newsItem}
          isSelected={selectedNews?.id === newsItem.id}
          onClick={() => onNewsSelect(newsItem)}
          onMarkAsRead={onMarkAsRead}
        />
      </div>
    );
  };

  if (flattenedItems.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '96px 0',
        height: containerHeight,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', color: '#A0A0A0' }}>📰</div>
        <p style={{ 
          color: '#A0A0A0',
          fontFamily: 'Inter',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          Nenhuma notícia encontrada.
        </p>
      </div>
    );
  }

  return (
    <List
      ref={listRef}
      height={containerHeight}
      width={containerWidth}
      itemCount={flattenedItems.length}
      itemSize={getItemSize}
      itemData={flattenedItems}
      overscanCount={5} // Buffer de itens para renderizar fora da tela
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#666 #2A2A2A'
      }}
    >
      {ItemRenderer}
    </List>
  );
};

export default VirtualizedFeed;