import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';

/*
 * BubbleChart - Componente de visualização hierárquica com D3.js
 * 
 * Eventos emitidos:
 * - bubbleChart:leafClick: Clique em nó folha (notícia individual)
 * - bubbleChart:clusterClick: Clique em cluster (grupo de notícias)
 * - bubbleChart:hover: Hover sobre qualquer nó
 * - bubbleChart:navigationComplete: Após completar animação de navegação
 */

// Constantes configuráveis para o BubbleChart
const BUBBLE_PADDING = 5;
const MIN_BUBBLE_SIZE = 20;
const MAX_BUBBLE_SIZE = 100;
const COLOR_SCHEME = d3.interpolateBlues;

// Constantes para animações
const TRANSITION_DURATION = 750;
const ZOOM_SCALE_FACTOR = 0.8; // 80% da viewport para o cluster focado

// Constantes para sistema de rótulos
const MIN_RADIUS_FOR_LABEL = 30;
const TEXT_ANIMATION_DURATION = 300;

// Constantes para otimizações de performance
const HOVER_DEBOUNCE_DELAY = 100;
const ZOOM_THROTTLE_DELAY = 16; // 60fps

const BubbleChart = ({ data }) => {
  const svgRef = useRef(null);
  const dimensions = { width: 800, height: 600 };

  // Estado para controlar transições
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  
  // Estados para otimizações de performance
  const [currentZoom, setCurrentZoom] = useState({ k: 1, x: 0, y: 0 });
  const [visibleNodes, setVisibleNodes] = useState([]);
  
  // Refs para debounce e throttle
  const hoverTimeoutRef = useRef(null);
  const zoomTimeoutRef = useRef(null);
  
  // Função helper para obter caminho na hierarquia
  const getNodePath = (node) => {
    const path = [];
    let current = node;
    while (current.parent) {
      path.unshift({
        id: current.data.id || current.data.llm_title,
        title: current.data.llm_title || 'Sem título',
        depth: current.depth
      });
      current = current.parent;
    }
    return path;
  };
  
  // Sistema de eventos customizados
  const dispatchNodeEvent = useCallback((eventType, nodeData, additionalData = {}) => {
    const event = new CustomEvent(eventType, {
      detail: {
        node: nodeData.data,
        hierarchyNode: nodeData,
        timestamp: Date.now(),
        path: getNodePath(nodeData),
        ...additionalData
      }
    });
    window.dispatchEvent(event);
  }, []);
  
  // Função de debounce para hover
  const debouncedHover = useCallback((callback, delay) => {
    return (...args) => {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => callback(...args), delay);
    };
  }, []);
  
  // Função de throttle para zoom
  const throttledZoom = useCallback((callback, delay) => {
    return (...args) => {
      if (!zoomTimeoutRef.current) {
        callback(...args);
        zoomTimeoutRef.current = setTimeout(() => {
          zoomTimeoutRef.current = null;
        }, delay);
      }
    };
  }, []);
  
  // Função para detectar nós visíveis usando quadtree
  const getVisibleNodes = useCallback((nodes, zoom) => {
    if (!nodes || nodes.length === 0) return [];
    
    const viewport = {
      x: -zoom.x / zoom.k,
      y: -zoom.y / zoom.k,
      width: dimensions.width / zoom.k,
      height: dimensions.height / zoom.k
    };
    
    // Cria quadtree para busca eficiente
    const quadtree = d3.quadtree()
      .x(d => d.x)
      .y(d => d.y)
      .addAll(nodes);
    
    const visibleNodes = [];
    
    // Busca nós na viewport com margem
    const margin = 50 / zoom.k;
    quadtree.visit((node, x1, y1, x2, y2) => {
      if (!node.length) {
        const d = node.data;
        const nodeRadius = d.r;
        
        // Verifica se o nó está visível (com margem)
        if (d.x + nodeRadius >= viewport.x - margin &&
            d.x - nodeRadius <= viewport.x + viewport.width + margin &&
            d.y + nodeRadius >= viewport.y - margin &&
            d.y - nodeRadius <= viewport.y + viewport.height + margin) {
          visibleNodes.push(d);
        }
      }
      
      // Continua a busca se o quadrante intersecta com a viewport
      return x1 >= viewport.x + viewport.width + margin ||
             y1 >= viewport.y + viewport.height + margin ||
             x2 < viewport.x - margin ||
             y2 < viewport.y - margin;
    });
    
    return visibleNodes;
  }, [dimensions]);
  
  // Função para truncamento inteligente de texto
  const getTruncatedText = (text, radius) => {
    const maxChars = Math.floor(radius / 3);
    return text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
  };
  
  // Função para determinar se deve mostrar rótulo
  const shouldShowLabel = (node) => {
    return node.r >= MIN_RADIUS_FOR_LABEL;
  };
  
  // Função para calcular tamanho da fonte baseado na hierarquia
  const getFontSize = (node) => {
    const baseSize = Math.max(8, node.r / 4);
    const isParent = node.children && node.children.length > 0;
    return isParent ? Math.max(baseSize, 12) : baseSize;
  };
  
  // Função para calcular peso da fonte baseado na hierarquia
  const getFontWeight = (node) => {
    const isParent = node.children && node.children.length > 0;
    return isParent ? 'bold' : 'normal';
  };
  
  // Função para calcular contraste de cor do texto (memoizada)
  const getTextColor = useMemo(() => {
    const cache = new Map();
    return (backgroundColor) => {
      if (cache.has(backgroundColor)) {
        return cache.get(backgroundColor);
      }
      
      // Converte cor D3 para RGB e calcula luminância
      const rgb = d3.color(backgroundColor);
      if (!rgb) return '#fff';
      
      const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      const textColor = luminance > 0.5 ? '#000' : '#fff';
      
      cache.set(backgroundColor, textColor);
      return textColor;
    };
  }, []);
  
  // Memoização da hierarquia processada
  const processedHierarchy = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    console.log('BubbleChart: Processando hierarquia (memoizado)', { dataLength: data.length });

    // Filtra dados inválidos
    const validData = data.filter(d => d && (d.llm_title || d.id));
    
    // Cria hierarquia usando lambda_persistence como métrica principal para tamanho
    const root = d3.hierarchy({ children: validData })
      .sum(d => d.lambda_persistence || 1)
      .sort((a, b) => b.value - a.value);

    // Calcula profundidade máxima para escala de cores
    const maxDepth = d3.max(root.descendants(), d => d.depth);
    
    // Escala de cores baseada na profundidade hierárquica
    const colorScale = d3.scaleSequential(COLOR_SCHEME)
      .domain([0, maxDepth || 1]);
    
    const pack = d3.pack()
      .size([dimensions.width, dimensions.height])
      .padding(BUBBLE_PADDING);

    const nodes = pack(root).descendants();

    return {
      root,
      nodes: nodes.slice(1), // Remove nó raiz
      colorScale,
      validDataLength: validData.length
    };
  }, [data, dimensions]);
  
  // Função para animação de zoom semântico
  const animateTransition = (targetNode) => {
    if (isTransitioning) return; // Previne múltiplas transições simultâneas
    
    setIsTransitioning(true);
    const svg = d3.select(svgRef.current);
    
    // Calcula nova viewport baseada no nó alvo
    const targetX = targetNode.x;
    const targetY = targetNode.y;
    const targetRadius = targetNode.r;
    
    // Calcula escala para que o cluster ocupe 80% da viewport
    const scale = Math.min(
      (dimensions.width * ZOOM_SCALE_FACTOR) / (targetRadius * 2),
      (dimensions.height * ZOOM_SCALE_FACTOR) / (targetRadius * 2)
    );
    
    // Calcula translação para centralizar o nó
    const translateX = dimensions.width / 2 - targetX * scale;
    const translateY = dimensions.height / 2 - targetY * scale;
    
    // Aplicar transformação de zoom com transição suave
    const transition = svg.transition()
      .duration(TRANSITION_DURATION)
      .ease(d3.easeCubicInOut)
      .on('end', () => {
        setIsTransitioning(false);
        // Emite evento de navegação completa
        dispatchNodeEvent('bubbleChart:navigationComplete', targetNode, {
          scale,
          translateX,
          translateY
        });
      });
    
    // Fade out dos nós que saem de foco
    svg.selectAll('g')
      .transition(transition)
      .style('opacity', d => {
        // Mantém visibilidade dos nós próximos ao alvo
        const distance = Math.sqrt(
          Math.pow(d.x - targetX, 2) + Math.pow(d.y - targetY, 2)
        );
        return distance <= targetRadius * 2 ? 1 : 0.3;
      });
      
    // Aplicar zoom transform
    svg.select('.zoom-group')
      .transition(transition)
      .attr('transform', `translate(${translateX},${translateY}) scale(${scale})`);
  };

  useEffect(() => {
    if (!processedHierarchy || !svgRef.current) {
      console.log('BubbleChart: Hierarquia não processada ou SVG não disponível');
      return;
    }

    const { nodes, colorScale, validDataLength } = processedHierarchy;
    
    console.log('BubbleChart: Renderizando com hierarquia memoizada', { 
      validDataLength,
      nodesLength: nodes.length
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Limpa o SVG anterior
    
    // Cria grupo principal para zoom
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');
    
    // Atualiza nós visíveis na inicialização
    const initialVisibleNodes = getVisibleNodes(nodes, currentZoom);
    setVisibleNodes(initialVisibleNodes);

    const nodeElements = zoomGroup.selectAll('g')
      .data(nodes.slice(1)) // Ignora o nó raiz
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', d => {
        if (isTransitioning) return 'wait';
        return d.children ? 'pointer' : 'default';
      })
      .on('click', (event, d) => {
        if (isTransitioning) return; // Desabilita cliques durante transição
        
        // Determina tipo do nó e emite evento apropriado
        if (d.children && d.children.length > 0) {
          // É um cluster - emite evento de cluster e inicia animação
          dispatchNodeEvent('bubbleChart:clusterClick', d);
          animateTransition(d);
        } else {
          // É uma folha (notícia individual) - emite evento de folha
          dispatchNodeEvent('bubbleChart:leafClick', d);
        }
      })
      .on('mouseenter', debouncedHover((event, d) => {
        if (isTransitioning) return;
        
        setHoveredNode(d);
        
        // Prepara dados do tooltip
        const tooltip = {
          title: d.data.llm_title || d.data.id || 'Sem título',
          summary: d.data.llm_summary ? 
            d.data.llm_summary.substring(0, 100) + (d.data.llm_summary.length > 100 ? '...' : '') : 
            'Sem resumo disponível',
          lambda_persistence: d.data.lambda_persistence || 0,
          childrenCount: d.children ? d.children.length : 0,
          depth: d.depth,
          x: event.pageX,
          y: event.pageY
        };
        
        setTooltipData(tooltip);
        
        // Emite evento de hover
        dispatchNodeEvent('bubbleChart:hover', d, {
          isEntering: true,
          mousePosition: { x: event.pageX, y: event.pageY }
        });
        
        // Mostra rótulo temporário se não estava visível
        if (!shouldShowLabel(d)) {
          const textElement = d3.select(event.currentTarget).select('text');
          textElement
            .style('opacity', 0)
            .style('display', 'block')
            .transition()
            .duration(TEXT_ANIMATION_DURATION)
            .style('opacity', 1);
        }
      }, HOVER_DEBOUNCE_DELAY))
      .on('mouseleave', (event, d) => {
        if (isTransitioning) return;
        
        setHoveredNode(null);
        setTooltipData(null);
        
        // Emite evento de hover (saindo)
        dispatchNodeEvent('bubbleChart:hover', d, {
          isEntering: false,
          mousePosition: { x: event.pageX, y: event.pageY }
        });
        
        // Esconde rótulo temporário se não deveria estar visível
        if (!shouldShowLabel(d)) {
          const textElement = d3.select(event.currentTarget).select('text');
          textElement
            .transition()
            .duration(TEXT_ANIMATION_DURATION)
            .style('opacity', 0)
            .on('end', function() {
              d3.select(this).style('display', 'none');
            });
        }
      })
      .on('mousemove', (event) => {
        if (tooltipData) {
          setTooltipData(prev => ({
            ...prev,
            x: event.pageX,
            y: event.pageY
          }));
        }
      });

    // Adiciona círculos com animação fade-in
    nodeElements.append('circle')
      .attr('r', d => Math.max(MIN_BUBBLE_SIZE, Math.min(MAX_BUBBLE_SIZE, d.r))) // Aplica limites de tamanho
      .attr('fill', d => colorScale(d.depth)) // Usa profundidade para cor em vez de lambda_persistence
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0) // Inicia invisível
      .transition()
      .duration(TRANSITION_DURATION / 2)
      .ease(d3.easeQuadOut)
      .attr('opacity', 0.8); // Fade in suave

    // Adiciona texto com sistema inteligente de rótulos
    nodeElements.append('text')
      .attr('dy', '0.3em')
      .style('text-anchor', 'middle')
      .style('font-size', d => `${getFontSize(d)}px`)
      .style('font-weight', d => getFontWeight(d))
      .style('fill', d => getTextColor(colorScale(d.depth)))
      .style('pointer-events', 'none')
      .style('opacity', 0) // Inicia invisível
      .style('display', d => shouldShowLabel(d) ? 'block' : 'none') // Controla visibilidade inicial
      .text(d => {
        const title = d.data.llm_title || d.data.id || 'Sem título';
        return getTruncatedText(title, d.r);
      })
      .transition()
      .duration(TRANSITION_DURATION / 2)
      .delay(TRANSITION_DURATION / 4) // Delay para texto aparecer após círculos
      .ease(d3.easeQuadOut)
      .style('opacity', d => shouldShowLabel(d) ? 1 : 0); // Fade in apenas para rótulos visíveis

  }, [processedHierarchy, currentZoom, getVisibleNodes]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      position: 'relative'
    }}>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
      
      {/* Indicador de transição */}
      {isTransitioning && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #fff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Navegando...
        </div>
      )}
      
      {/* Tooltip Rico */}
      {tooltipData && (
        <div style={{
          position: 'fixed',
          left: `${tooltipData.x + 10}px`,
          top: `${tooltipData.y - 10}px`,
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '12px',
          maxWidth: '250px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'tooltipFadeIn 0.2s ease-out',
          pointerEvents: 'none'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '6px',
            fontSize: '13px',
            color: '#4FC3F7'
          }}>
            {tooltipData.title}
          </div>
          
          <div style={{ 
            marginBottom: '8px',
            lineHeight: '1.4',
            color: '#E0E0E0'
          }}>
            {tooltipData.summary}
          </div>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            fontSize: '11px',
            color: '#B0B0B0'
          }}>
            <div>
              <strong>Estabilidade:</strong><br />
              {tooltipData.lambda_persistence.toFixed(3)}
            </div>
            <div>
              <strong>Filhos:</strong><br />
              {tooltipData.childrenCount}
            </div>
            <div>
              <strong>Profundidade:</strong><br />
              {tooltipData.depth}
            </div>
            <div>
              <strong>Tipo:</strong><br />
              {tooltipData.childrenCount > 0 ? 'Cluster' : 'Folha'}
            </div>
          </div>
        </div>
      )}
      
      {/* CSS para animações */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes tooltipFadeIn {
          0% { 
            opacity: 0; 
            transform: translateY(5px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  );
};

// Componente memoizado para evitar re-renderizações desnecessárias
export default React.memo(BubbleChart, (prevProps, nextProps) => {
  // Comparação customizada para otimizar re-renderizações
  return (
    prevProps.data === nextProps.data ||
    (Array.isArray(prevProps.data) && Array.isArray(nextProps.data) &&
     prevProps.data.length === nextProps.data.length &&
     prevProps.data.every((item, index) => item === nextProps.data[index]))
  );
}); 