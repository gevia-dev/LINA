import { vi } from 'vitest';
import {
  serializeCanvasState,
  deserializeCanvasState,
  convertNewsDataToCanvasState,
  convertCanvasStateToNewsData,
  validateCanvasState,
  CURRENT_SCHEMA_VERSION
} from '../canvasSerializer';

// Mock dados para testes
const mockNewsData = {
  id: '123',
  core_structure: JSON.stringify({
    Introduce: "Esta é uma introdução de teste",
    corpos_de_analise: "Este é o corpo da análise",
    conclusoes: "Esta é a conclusão"
  })
};

const mockCanvasState = {
  version: CURRENT_SCHEMA_VERSION,
  viewport: { x: 100, y: 50, zoom: 1.2 },
  nodes: [
    {
      id: 'summary',
      type: 'cardNode',
      position: { x: 100, y: 100 },
      data: {
        id: 'summary',
        title: 'Introdução',
        content: 'Conteúdo da introdução',
        hasContent: true,
        coreKey: 'Introduce'
      }
    },
    {
      id: 'body',
      type: 'cardNode',
      position: { x: 100, y: 350 },
      data: {
        id: 'body',
        title: 'Corpo',
        content: 'Conteúdo do corpo',
        hasContent: true,
        coreKey: 'corpos_de_analise'
      }
    },
    {
      id: 'conclusion',
      type: 'cardNode',
      position: { x: 100, y: 600 },
      data: {
        id: 'conclusion',
        title: 'Conclusão',
        content: 'Conteúdo da conclusão',
        hasContent: true,
        coreKey: 'conclusoes'
      }
    }
  ],
  edges: [],
  metadata: {
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T01:00:00.000Z',
    newsId: '123'
  }
};

describe('canvasSerializer', () => {
  describe('serializeCanvasState', () => {
    it('deve serializar estado do canvas corretamente', () => {
      const serialized = serializeCanvasState(mockCanvasState, '123');
      const parsed = JSON.parse(serialized);
      
      expect(parsed.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(parsed.viewport).toEqual(mockCanvasState.viewport);
      expect(parsed.nodes).toEqual(mockCanvasState.nodes);
      expect(parsed.metadata.newsId).toBe('123');
    });

    it('deve lidar com estado inválido graciosamente', () => {
      const serialized = serializeCanvasState(null);
      const parsed = JSON.parse(serialized);
      
      expect(parsed.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(parsed.nodes).toEqual([]);
      expect(parsed.edges).toEqual([]);
    });

    it('deve atualizar timestamp ao serializar', () => {
      const before = new Date();
      const serialized = serializeCanvasState(mockCanvasState, '123');
      const parsed = JSON.parse(serialized);
      const after = new Date();
      
      const updatedAt = new Date(parsed.metadata.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('deserializeCanvasState', () => {
    it('deve desserializar estado do canvas corretamente', () => {
      const serialized = JSON.stringify(mockCanvasState);
      const deserialized = deserializeCanvasState(serialized);
      
      expect(deserialized.version).toBe(mockCanvasState.version);
      expect(deserialized.viewport).toEqual(mockCanvasState.viewport);
      expect(deserialized.nodes).toEqual(mockCanvasState.nodes);
      expect(deserialized.metadata.newsId).toBe(mockCanvasState.metadata.newsId);
    });

    it('deve retornar schema padrão para dados nulos', () => {
      const deserialized = deserializeCanvasState(null);
      
      expect(deserialized.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(deserialized.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
      expect(deserialized.nodes).toEqual([]);
      expect(deserialized.edges).toEqual([]);
    });

    it('deve lidar com JSON inválido graciosamente', () => {
      const deserialized = deserializeCanvasState('invalid json');
      
      expect(deserialized.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(deserialized.nodes).toEqual([]);
    });

    it('deve migrar dados de versões antigas', () => {
      const oldData = {
        version: '0.9.0',
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: []
      };
      
      const deserialized = deserializeCanvasState(JSON.stringify(oldData));
      
      expect(deserialized.version).toBe(CURRENT_SCHEMA_VERSION);
    });
  });

  describe('convertNewsDataToCanvasState', () => {
    it('deve converter newsData para canvas state', () => {
      const canvasState = convertNewsDataToCanvasState(mockNewsData);
      
      expect(canvasState.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(canvasState.nodes).toHaveLength(3);
      
      const summaryNode = canvasState.nodes.find(node => node.id === 'summary');
      expect(summaryNode).toBeDefined();
      expect(summaryNode.data.content).toBe('Esta é uma introdução de teste');
      expect(summaryNode.data.hasContent).toBe(true);
    });

    it('deve usar estado salvo quando fornecido', () => {
      const savedState = JSON.stringify(mockCanvasState);
      const canvasState = convertNewsDataToCanvasState(mockNewsData, savedState);
      
      expect(canvasState.viewport).toEqual(mockCanvasState.viewport);
      expect(canvasState.nodes[0].position).toEqual(mockCanvasState.nodes[0].position);
    });

    it('deve criar posicionamento padrão para novos nodes', () => {
      const canvasState = convertNewsDataToCanvasState(mockNewsData);
      
      const summaryNode = canvasState.nodes.find(node => node.id === 'summary');
      const bodyNode = canvasState.nodes.find(node => node.id === 'body');
      
      expect(summaryNode.position).toBeDefined();
      expect(bodyNode.position).toBeDefined();
      expect(summaryNode.position.y).toBeLessThan(bodyNode.position.y);
    });

    it('deve detectar conteúdo válido vs placeholders', () => {
      const emptyNewsData = { core_structure: null };
      const canvasState = convertNewsDataToCanvasState(emptyNewsData);
      
      const summaryNode = canvasState.nodes.find(node => node.id === 'summary');
      expect(summaryNode.data.hasContent).toBe(false);
      expect(summaryNode.data.content).toContain('Clique para selecionar');
    });
  });

  describe('convertCanvasStateToNewsData', () => {
    it('deve converter canvas state de volta para newsData', () => {
      const newsData = convertCanvasStateToNewsData(mockCanvasState);
      
      expect(newsData.Introduce).toBe('Conteúdo da introdução');
      expect(newsData.corpos_de_analise).toBe('Conteúdo do corpo');
      expect(newsData.conclusoes).toBe('Conteúdo da conclusão');
    });

    it('deve ignorar placeholders na conversão', () => {
      const stateWithPlaceholder = {
        ...mockCanvasState,
        nodes: [
          {
            ...mockCanvasState.nodes[0],
            data: {
              ...mockCanvasState.nodes[0].data,
              content: 'Clique para selecionar...',
              coreKey: 'Introduce'
            }
          }
        ]
      };
      
      const newsData = convertCanvasStateToNewsData(stateWithPlaceholder);
      expect(newsData.Introduce).toBeUndefined();
    });

    it('deve preservar dados válidos apenas', () => {
      const stateWithMixedContent = {
        ...mockCanvasState,
        nodes: [
          {
            id: 'summary',
            data: {
              content: 'Conteúdo válido',
              coreKey: 'Introduce'
            }
          },
          {
            id: 'body',
            data: {
              content: 'Clique para selecionar...',
              coreKey: 'corpos_de_analise'
            }
          }
        ]
      };
      
      const newsData = convertCanvasStateToNewsData(stateWithMixedContent);
      expect(newsData.Introduce).toBe('Conteúdo válido');
      expect(newsData.corpos_de_analise).toBeUndefined();
    });
  });

  describe('validateCanvasState', () => {
    it('deve validar estado válido', () => {
      expect(validateCanvasState(mockCanvasState)).toBe(true);
    });

    it('deve rejeitar estado nulo ou inválido', () => {
      expect(validateCanvasState(null)).toBe(false);
      expect(validateCanvasState({})).toBe(false);
      expect(validateCanvasState('string')).toBe(false);
    });

    it('deve rejeitar estado sem propriedades obrigatórias', () => {
      const invalidState = {
        version: CURRENT_SCHEMA_VERSION
        // viewport e nodes ausentes
      };
      
      expect(validateCanvasState(invalidState)).toBe(false);
    });

    it('deve rejeitar viewport inválido', () => {
      const invalidState = {
        ...mockCanvasState,
        viewport: { x: 'invalid', y: 0, zoom: 1 }
      };
      
      expect(validateCanvasState(invalidState)).toBe(false);
    });

    it('deve rejeitar nodes inválidos', () => {
      const invalidState = {
        ...mockCanvasState,
        nodes: 'not an array'
      };
      
      expect(validateCanvasState(invalidState)).toBe(false);
    });

    it('deve rejeitar se nodes obrigatórios estão ausentes', () => {
      const invalidState = {
        ...mockCanvasState,
        nodes: [
          { id: 'summary', data: {} }
          // body e conclusion ausentes
        ]
      };
      
      expect(validateCanvasState(invalidState)).toBe(false);
    });
  });

  describe('Versionamento', () => {
    it('deve manter versão atual constante', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe('1.0.0');
    });

    it('deve incluir versão em estados serializados', () => {
      const serialized = serializeCanvasState(mockCanvasState);
      const parsed = JSON.parse(serialized);
      
      expect(parsed.version).toBeDefined();
      expect(typeof parsed.version).toBe('string');
    });

    it('deve incluir metadata completo', () => {
      const serialized = serializeCanvasState(mockCanvasState, '123');
      const parsed = JSON.parse(serialized);
      
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.createdAt).toBeDefined();
      expect(parsed.metadata.updatedAt).toBeDefined();
      expect(parsed.metadata.newsId).toBe('123');
    });
  });
});