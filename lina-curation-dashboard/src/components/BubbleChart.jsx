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
  
  // Estados para zoom semântico
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: dimensions.width, height: dimensions.height });
  const [scale, setScale] = useState(1);
  const [focusedNode, setFocusedNode] = useState(null);
  
  // Estados para otimizações de performance
  const [currentZoom, setCurrentZoom] = useState({ k: 1, x: 0, y: 0 });
  const [visibleNodes, setVisibleNodes] = useState([]);
  
  // Refs para debounce e throttle
  const hoverTimeoutRef = useRef(null);
  const zoomTimeoutRef = useRef(null);
  const tooltipRef = useRef(null);
  
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
  
  // Função para determinar se deve mostrar rótulo (refinada)
  const shouldShowLabel = (node) => {
    return node.r > 25; // Mostrar apenas em bolhas grandes
  };
  
  // Função para criar tooltip detalhado
  const createTooltip = useCallback(() => {
    // Remove tooltip anterior se existir
    d3.select('body').selectAll('.bubble-tooltip').remove();
    
    // Criar container do tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'bubble-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('padding', '10px')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', 'white')
      .style('border-radius', '8px')
      .style('pointer-events', 'none')
      .style('font-size', '12px')
      .style('max-width', '250px')
      .style('z-index', '1000')
      .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)');
    
    tooltipRef.current = tooltip;
    return tooltip;
  }, []);
  
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
    
    // Calcula profundidade máxima para escala de cores baseada apenas nos filhos diretos
    const directChildren = root.children || [];
    const maxDepth = directChildren.length > 0 ? 
      d3.max(directChildren, d => d.depth) : 0;
    
    // Escala de cores baseada na profundidade hierárquica com cores mais saturadas
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, Math.max(maxDepth, 1)])
      .range(['#BBDEFB', '#1565C0']); // Azul mais saturado
    
    const pack = d3.pack()
      .size([dimensions.width, dimensions.height])
      .padding(BUBBLE_PADDING);
    
    // Aplica pack layout no nó raiz
    const packedRoot = pack(root);
    
    // Renderizar apenas os filhos diretos do nó atual
    const nodesToRender = packedRoot.children || [];
    
    // Debug: verificar estrutura dos dados
    console.log('BubbleChart: Estrutura dos dados', {
      packedRoot: {
        hasChildren: !!packedRoot.children,
        childrenCount: packedRoot.children ? packedRoot.children.length : 0
      },
      nodesToRender: nodesToRender.map(n => ({
        title: n.data.llm_title,
        hasChildren: !!n.children,
        childrenCount: n.children ? n.children.length : 0,
        dataKeys: Object.keys(n.data || {})
      }))
    });
    
    console.log('BubbleChart: Nós para renderizar', { 
      totalChildren: nodesToRender.length,
      sampleNodes: nodesToRender.slice(0, 3).map(n => ({
        title: n.data.llm_title,
        hasChildren: !!n.children,
        radius: n.r
      }))
    });
    
    return {
      root: packedRoot,
      nodes: nodesToRender, // Apenas filhos diretos
      colorScale,
      validDataLength: validData.length
    };
  }, [data, dimensions]);
  
  // Função para zoom semântico com transição suave
  const zoomToNode = useCallback((node) => {
    if (isTransitioning) return;
    
    console.log('BubbleChart: Iniciando zoom para nó', node);
    
    setIsTransitioning(true);
    setFocusedNode(node);
    
    const svg = d3.select(svgRef.current);
    
    // Calcular bounds do nó alvo com padding maior
    const padding = node.r * 0.5; // Padding de 50% para melhor visualização
    const newViewBox = {
      x: node.x - node.r - padding,
      y: node.y - node.r - padding,
      width: (node.r * 2) + (padding * 2),
      height: (node.r * 2) + (padding * 2)
    };
    
    console.log('BubbleChart: Novo viewBox', newViewBox);
    
    // Fade out dos nós atuais
    svg.selectAll('.node-group')
      .transition()
      .duration(TRANSITION_DURATION / 3)
      .style('opacity', 0);
    
    // Animar transição do viewBox
    svg.transition()
      .duration(TRANSITION_DURATION)
      .ease(d3.easeCubicInOut)
      .attr('viewBox', `${newViewBox.x} ${newViewBox.y} ${newViewBox.width} ${newViewBox.height}`)
      .on('start', () => {
        console.log('BubbleChart: Iniciando animação de zoom');
        // Desabilitar interações durante animação
        svg.style('pointer-events', 'none');
      })
      .on('end', () => {
        console.log('BubbleChart: Animação de zoom concluída');
        // Re-habilitar interações
        svg.style('pointer-events', 'auto');
        setIsTransitioning(false);
        
        // Atualizar estado do viewBox
        setViewBox(newViewBox);
        setScale(dimensions.width / newViewBox.width);
        
        // Disparar evento de navegação completa
        dispatchNodeEvent('bubbleChart:navigationComplete', node, {
          viewBox: newViewBox,
          scale: dimensions.width / newViewBox.width
        });
      });
  }, [dimensions, isTransitioning, dispatchNodeEvent]);
  
  // Função para reset do zoom
  const resetZoom = useCallback(() => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setFocusedNode(null);
    
    const svg = d3.select(svgRef.current);
    const defaultViewBox = { x: 0, y: 0, width: dimensions.width, height: dimensions.height };
    
    svg.transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
      .on('end', () => {
        setIsTransitioning(false);
        setViewBox(defaultViewBox);
        setScale(1);
      });
  }, [dimensions, isTransitioning]);

  useEffect(() => {
    if (!processedHierarchy || !svgRef.current) {
      console.log('BubbleChart: Hierarquia não processada ou SVG não disponível');
      return;
    }

    const { nodes, colorScale, validDataLength } = processedHierarchy;
    
    console.log('BubbleChart: Renderizando com hierarquia memoizada', { 
      validDataLength,
      nodesLength: nodes.length,
      sampleNodes: nodes.slice(0, 3).map(n => ({
        title: n.data.llm_title,
        hasChildren: !!n.children,
        childrenCount: n.children ? n.children.length : 0,
        radius: n.r,
        depth: n.depth
      }))
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Limpa o SVG anterior
    
    // Configura viewBox inicial
    svg.attr('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    
    // Cria grupo principal para zoom
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');
    
    // Cria tooltip
    const tooltip = createTooltip();
    
    // Atualiza nós visíveis na inicialização
    const initialVisibleNodes = getVisibleNodes(nodes, currentZoom);
    setVisibleNodes(initialVisibleNodes);

    const nodeElements = zoomGroup.selectAll('g')
      .data(nodes) // Usar apenas filhos diretos, não slice(1)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('class', d => {
        const baseClass = 'node-group';
        const typeClass = d.children && d.children.length > 0 ? 'cluster-node' : 'leaf-node';
        return `${baseClass} ${typeClass}`;
      })
      .style('cursor', d => {
        if (isTransitioning) return 'wait';
        return d.children && d.children.length > 0 ? 'pointer' : 'default';
      })
      .on('click', (event, d) => {
        if (isTransitioning) return; // Desabilita cliques durante transição
        
        console.log('BubbleChart: Clique detectado no nó', d);
        
        // Determina tipo do nó e emite evento apropriado
        const hasChildren = d.children && d.children.length > 0;
        const hasDataChildren = d.data && d.data.children && d.data.children.length > 0;
        console.log('BubbleChart: Nó tem filhos?', { 
          hasChildren, 
          hasDataChildren, 
          children: d.children,
          dataChildren: d.data?.children 
        });
        
        if (hasChildren || hasDataChildren) {
          // É um cluster - emite evento de cluster e inicia zoom
          event.stopPropagation();
          console.log('BubbleChart: Clique em cluster, iniciando zoom');
          dispatchNodeEvent('bubbleChart:clusterClick', d);
          zoomToNode(d); // Usar zoom animado em vez de callback direto
        } else {
          // É uma folha (notícia individual) - emite evento de folha
          console.log('BubbleChart: Clique em folha');
          dispatchNodeEvent('bubbleChart:leafClick', d);
        }
      })
      .on('mouseover', (event, d) => {
        if (isTransitioning) return;
        
        setHoveredNode(d);
        
        // Mostrar tooltip apenas para nós pequenos ou ao segurar Shift
        if (d.r <= 25 || event.shiftKey) {
          tooltip.transition().duration(200).style('opacity', 0.9);
          
          const content = `
            <strong>${d.data.llm_title || 'Sem título'}</strong><br/>
            ${d.data.llm_summary ? d.data.llm_summary.substring(0, 100) + '...' : 'Sem resumo disponível'}<br/>
            <hr style="margin: 5px 0; opacity: 0.3; border-color: rgba(255,255,255,0.3)"/>
            <span style="color: #4FC3F7;">Estabilidade:</span> ${(d.data.lambda_persistence || 0).toFixed(2)}<br/>
            <span style="color: #4FC3F7;">${d.children ? `Contém ${d.children.length} itens` : 'Item individual'}</span>
          `;
          
          tooltip.html(content)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        }
        
        // Emite evento de hover
        dispatchNodeEvent('bubbleChart:hover', d, {
          isEntering: true,
          mousePosition: { x: event.pageX, y: event.pageY }
        });
        
        // Mostra rótulo temporário se não estava visível
        if (!shouldShowLabel(d)) {
          const textElement = d3.select(event.currentTarget).select('.node-label');
          if (!textElement.empty()) {
            textElement
              .style('opacity', 0)
              .style('display', 'block')
              .transition()
              .duration(TEXT_ANIMATION_DURATION)
              .style('opacity', 1);
          }
        }
      })
      .on('mouseout', (event, d) => {
        if (isTransitioning) return;
        
        setHoveredNode(null);
        
        // Esconde tooltip
        tooltip.transition().duration(500).style('opacity', 0);
        
        // Emite evento de hover (saindo)
        dispatchNodeEvent('bubbleChart:hover', d, {
          isEntering: false,
          mousePosition: { x: event.pageX, y: event.pageY }
        });
        
        // Esconde rótulo temporário se não deveria estar visível
        if (!shouldShowLabel(d)) {
          const textElement = d3.select(event.currentTarget).select('.node-label');
          if (!textElement.empty()) {
            textElement
              .transition()
              .duration(TEXT_ANIMATION_DURATION)
              .style('opacity', 0)
              .on('end', function() {
                d3.select(this).style('display', 'none');
              });
          }
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
      .attr('stroke-width', d => d.children && d.children.length > 0 ? 2 : 1) // Borda mais grossa para clusters
      .attr('opacity', 0) // Inicia invisível
      .transition()
      .duration(TRANSITION_DURATION / 2)
      .ease(d3.easeQuadOut)
      .attr('opacity', 1.0) // Opacidade total - sem transparência para evitar sobreposição
      .on('end', function() {
        // Adicionar hover effect após animação
        d3.select(this)
          .on('mouseenter', function() {
            d3.select(this).attr('stroke-width', d => (d.children && d.children.length > 0 ? 3 : 2));
          })
          .on('mouseleave', function() {
            d3.select(this).attr('stroke-width', d => (d.children && d.children.length > 0 ? 2 : 1));
          });
      });

    // Sistema de rótulos adaptativos
    nodeElements
      .filter(shouldShowLabel)
      .append('text')
      .attr('class', 'node-label')
      .attr('dy', '0.3em')
      .style('text-anchor', 'middle')
      .style('font-size', d => {
        // Tamanho adaptativo baseado no raio
        const size = Math.min(16, Math.max(10, d.r / 4));
        return `${size}px`;
      })
      .style('font-weight', d => d.children && d.children.length > 0 ? 'bold' : 'normal')
      .style('fill', d => getTextColor(colorScale(d.depth)))
      .style('pointer-events', 'none')
      .text(d => {
        const title = d.data.llm_title || d.data.id || '';
        const maxChars = Math.floor(d.r / 4);
        return title.length > maxChars ? 
          title.substring(0, maxChars - 2) + '...' : 
          title;
      })
      .style('opacity', 0)
      .transition()
      .duration(300)
      .style('opacity', 1);
    
    // Adicionar indicadores visuais para clusters navegáveis
    nodeElements
      .filter(d => d.children && d.children.length > 0)
      .append('text')
      .attr('class', 'cluster-indicator')
      .attr('dy', d => d.r * 0.7)
      .style('text-anchor', 'middle')
      .style('font-size', d => `${Math.max(8, d.r / 3)}px`)
      .style('fill', 'rgba(255,255,255,0.6)')
      .style('pointer-events', 'none')
      .text('▼') // Indicador de que pode expandir
      .style('opacity', 0)
      .transition()
      .duration(400)
      .delay(200)
      .style('opacity', 1);

    // Cleanup no useEffect
    return () => {
      d3.select('body').selectAll('.bubble-tooltip').remove();
    };
  }, [processedHierarchy, currentZoom, getVisibleNodes, viewBox, createTooltip, zoomToNode]);

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
      
      {/* Botão de Reset Zoom */}
      {focusedNode && !isTransitioning && (
        <button
          onClick={resetZoom}
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.8)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.7)'}
        >
          ↗ Zoom Out
        </button>
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