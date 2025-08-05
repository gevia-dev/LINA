import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const BubbleChart = ({ data, onBubbleClick }) => {
  const svgRef = useRef(null);
  const dimensions = { width: 800, height: 600 };

  // Escala de cores baseada na estabilidade (lambda_persistence)
  const colorScale = d3.scaleSequential(d3.interpolateViridis)
    .domain([0, 5]);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) {
      console.log('BubbleChart: Dados vazios ou SVG não disponível', { data, svgRef: !!svgRef.current });
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Limpa o SVG anterior

    // Filtra dados inválidos
    const validData = data.filter(d => d && (d.llm_title || d.id));
    
    console.log('BubbleChart: Dados processados', { 
      originalDataLength: data.length, 
      validDataLength: validData.length,
      sampleData: validData.slice(0, 2)
    });
    
    const root = d3.hierarchy({ children: validData })
      .sum(d => d.children ? d.children.length + 1 : 1)
      .sort((a, b) => b.value - a.value);

    const pack = d3.pack()
      .size([dimensions.width, dimensions.height])
      .padding(5);

    const nodes = pack(root).descendants();

    const nodeElements = svg.selectAll('g')
      .data(nodes.slice(1)) // Ignora o nó raiz
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', d => d.children ? 'pointer' : 'default')
      .on('click', (event, d) => {
        if (d.children) {
          onBubbleClick(d.data);
        }
      });

    nodeElements.append('circle')
      .attr('r', d => d.r)
      .attr('fill', d => colorScale(d.data.lambda_persistence ?? 0))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.8);

    nodeElements.append('text')
      .attr('dy', '0.3em')
      .style('text-anchor', 'middle')
      .style('font-size', d => `${Math.max(8, d.r / 4)}px`)
      .style('fill', '#fff')
      .style('pointer-events', 'none')
      .text(d => {
        const title = d.data.llm_title || d.data.id || 'Sem título';
        return title.substring(0, Math.floor(d.r / 3));
      });

  }, [data, dimensions]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
    </div>
  );
};

export default BubbleChart; 