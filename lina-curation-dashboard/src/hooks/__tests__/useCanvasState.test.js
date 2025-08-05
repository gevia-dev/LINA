import { renderHook, act } from '@testing-library/react';
import { useCanvasState } from '../useCanvasState';

// Mock dos dados de teste
const mockNewsData = {
  core_structure: JSON.stringify({
    Introduce: "Esta é uma introdução de teste",
    corpos_de_analise: "Este é o corpo da análise",
    conclusoes: "Esta é a conclusão"
  })
};

const mockEmptyNewsData = {
  core_structure: null
};

const mockInvalidNewsData = {
  core_structure: "invalid json"
};

describe('useCanvasState', () => {
  describe('Conversão de newsData para nodes', () => {
    it('deve converter newsData válido para nodes do ReactFlow', () => {
      const { result } = renderHook(() => useCanvasState(mockNewsData));
      
      expect(result.current.nodes).toHaveLength(3);
      
      // Verificar se os nodes têm as propriedades corretas
      const summaryNode = result.current.nodes.find(node => node.id === 'summary');
      const bodyNode = result.current.nodes.find(node => node.id === 'body');
      const conclusionNode = result.current.nodes.find(node => node.id === 'conclusion');
      
      expect(summaryNode).toBeDefined();
      expect(summaryNode.type).toBe('cardNode');
      expect(summaryNode.data.title).toBe('Introdução');
      expect(summaryNode.data.content).toBe('Esta é uma introdução de teste');
      expect(summaryNode.data.hasContent).toBe(true);
      
      expect(bodyNode).toBeDefined();
      expect(bodyNode.type).toBe('cardNode');
      expect(bodyNode.data.title).toBe('Corpo');
      expect(bodyNode.data.content).toBe('Este é o corpo da análise');
      expect(bodyNode.data.hasContent).toBe(true);
      
      expect(conclusionNode).toBeDefined();
      expect(conclusionNode.type).toBe('cardNode');
      expect(conclusionNode.data.title).toBe('Conclusão');
      expect(conclusionNode.data.content).toBe('Esta é a conclusão');
      expect(conclusionNode.data.hasContent).toBe(true);
    });

    it('deve usar placeholders quando newsData está vazio', () => {
      const { result } = renderHook(() => useCanvasState(mockEmptyNewsData));
      
      expect(result.current.nodes).toHaveLength(3);
      
      const summaryNode = result.current.nodes.find(node => node.id === 'summary');
      expect(summaryNode.data.content).toContain('Clique para selecionar');
      expect(summaryNode.data.hasContent).toBe(false);
    });

    it('deve lidar com JSON inválido graciosamente', () => {
      const { result } = renderHook(() => useCanvasState(mockInvalidNewsData));
      
      expect(result.current.nodes).toHaveLength(3);
      
      const summaryNode = result.current.nodes.find(node => node.id === 'summary');
      expect(summaryNode.data.content).toContain('Clique para selecionar');
      expect(summaryNode.data.hasContent).toBe(false);
    });

    it('deve posicionar os nodes nas posições corretas', () => {
      const { result } = renderHook(() => useCanvasState(mockNewsData));
      
      const summaryNode = result.current.nodes.find(node => node.id === 'summary');
      const bodyNode = result.current.nodes.find(node => node.id === 'body');
      const conclusionNode = result.current.nodes.find(node => node.id === 'conclusion');
      
      // Verificar posições verticais (y deve aumentar)
      expect(summaryNode.position.y).toBeLessThan(bodyNode.position.y);
      expect(bodyNode.position.y).toBeLessThan(conclusionNode.position.y);
      
      // Verificar posições horizontais (x deve ser consistente)
      expect(summaryNode.position.x).toBe(bodyNode.position.x);
      expect(bodyNode.position.x).toBe(conclusionNode.position.x);
    });
  });

  describe('Conversão bidirecional', () => {
    it('deve converter nodes de volta para newsData', () => {
      const { result } = renderHook(() => useCanvasState(mockNewsData));
      
      const updatedNodes = result.current.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          content: `Updated ${node.data.content}`
        }
      }));
      
      act(() => {
        result.current.updateNodes(updatedNodes);
      });
      
      const convertedData = result.current.convertNodesToNewsData(updatedNodes);
      
      expect(convertedData.Introduce).toBe('Updated Esta é uma introdução de teste');
      expect(convertedData.corpos_de_analise).toBe('Updated Este é o corpo da análise');
      expect(convertedData.conclusoes).toBe('Updated Esta é a conclusão');
    });

    it('deve preservar estrutura quando não há mudanças', () => {
      const { result } = renderHook(() => useCanvasState(mockNewsData));
      
      const convertedData = result.current.convertNodesToNewsData(result.current.nodes);
      
      expect(convertedData.Introduce).toBe('Esta é uma introdução de teste');
      expect(convertedData.corpos_de_analise).toBe('Este é o corpo da análise');
      expect(convertedData.conclusoes).toBe('Esta é a conclusão');
    });
  });

  describe('Detecção de conteúdo', () => {
    it('deve detectar conteúdo válido corretamente', () => {
      const { result } = renderHook(() => useCanvasState(mockNewsData));
      
      const summaryNode = result.current.nodes.find(node => node.id === 'summary');
      expect(summaryNode.data.hasContent).toBe(true);
    });

    it('deve detectar placeholders como conteúdo inválido', () => {
      const { result } = renderHook(() => useCanvasState(mockEmptyNewsData));
      
      const summaryNode = result.current.nodes.find(node => node.id === 'summary');
      expect(summaryNode.data.hasContent).toBe(false);
    });

    it('deve detectar strings vazias como conteúdo inválido', () => {
      const newsDataWithEmptyContent = {
        core_structure: JSON.stringify({
          Introduce: "",
          corpos_de_analise: "   ",
          conclusoes: null
        })
      };
      
      const { result } = renderHook(() => useCanvasState(newsDataWithEmptyContent));
      
      const summaryNode = result.current.nodes.find(node => node.id === 'summary');
      const bodyNode = result.current.nodes.find(node => node.id === 'body');
      const conclusionNode = result.current.nodes.find(node => node.id === 'conclusion');
      
      expect(summaryNode.data.hasContent).toBe(false);
      expect(bodyNode.data.hasContent).toBe(false);
      expect(conclusionNode.data.hasContent).toBe(false);
    });
  });

  describe('Estados de edição', () => {
    it('deve gerenciar estado de edição corretamente', () => {
      const { result } = renderHook(() => useCanvasState(mockNewsData));
      
      expect(result.current.editingBlock).toBeNull();
      
      act(() => {
        result.current.setEditingBlock('summary');
      });
      
      expect(result.current.editingBlock).toBe('summary');
      
      act(() => {
        result.current.setEditingBlock(null);
      });
      
      expect(result.current.editingBlock).toBeNull();
    });

    it('deve atualizar nodes quando editingBlock muda', () => {
      const { result } = renderHook(() => useCanvasState(mockNewsData));
      
      act(() => {
        result.current.setEditingBlock('body');
      });
      
      const bodyNode = result.current.nodes.find(node => node.id === 'body');
      expect(bodyNode.data.isEditing).toBe(true);
      
      const summaryNode = result.current.nodes.find(node => node.id === 'summary');
      expect(summaryNode.data.isEditing).toBe(false);
    });
  });
}); 