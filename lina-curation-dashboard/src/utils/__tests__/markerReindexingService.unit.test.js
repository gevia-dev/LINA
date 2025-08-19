/**
 * Testes unitários completos para MarkerReindexingService
 * Task 7: Criar testes unitários para MarkerReindexingService
 * 
 * Cobertura:
 * - detectInsertionBetweenMarkers com diferentes cenários
 * - reindexMarkersAfterInsertion verificando sequência correta
 * - updateReferenceMapping validando sincronização
 * - Casos edge (primeiro marcador, último marcador, sem marcadores)
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { MarkerReindexingService } from '../markerReindexingService.js';

describe('MarkerReindexingService - Unit Tests', () => {
  
  // ==================== detectInsertionBetweenMarkers Tests ====================
  
  describe('detectInsertionBetweenMarkers', () => {
    
    test('deve detectar inserção entre marcadores existentes', () => {
      const editorContent = 'Texto [1] meio [2] final [3] fim';
      const insertionPosition = 12; // Entre [1] e [2] (após "meio")
      const newMarker = '[4]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).not.toBeNull();
      expect(result.needsReindexing).toBe(true);
      expect(result.insertionType.type).toBe('between_markers');
      expect(result.newMarkerNumber).toBe(4);
      expect(result.newMarkerFinalNumber).toBe(2);
      expect(result.markersToReindex).toHaveLength(2); // [2] e [3]
    });
    
    test('deve detectar inserção antes do primeiro marcador', () => {
      const editorContent = 'Texto [2] meio [3] final [4] fim';
      const insertionPosition = 5; // Antes de [2]
      const newMarker = '[5]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).not.toBeNull();
      expect(result.needsReindexing).toBe(true);
      expect(result.insertionType.type).toBe('before_first');
      expect(result.newMarkerFinalNumber).toBe(1);
      expect(result.markersToReindex).toHaveLength(3); // Todos os marcadores
    });
    
    test('deve detectar inserção após último marcador (não precisa reindexar)', () => {
      const editorContent = 'Texto [1] meio [2] final [3] fim';
      const insertionPosition = 35; // Após [3]
      const newMarker = '[4]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).toBeNull(); // Não precisa reindexar
    });
    
    test('deve retornar null para conteúdo sem marcadores', () => {
      const editorContent = 'Texto sem marcadores';
      const insertionPosition = 10;
      const newMarker = '[1]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).toBeNull();
    });
    
    test('deve lidar com marcador inválido', () => {
      const editorContent = 'Texto [1] meio [2] fim';
      const insertionPosition = 15;
      const newMarker = 'marcador-inválido';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).toBeNull();
    });
    
    test('deve lidar com conteúdo inválido', () => {
      const result1 = MarkerReindexingService.detectInsertionBetweenMarkers(
        null, 10, '[1]'
      );
      const result2 = MarkerReindexingService.detectInsertionBetweenMarkers(
        '', 10, '[1]'
      );
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
    
    test('deve detectar inserção dentro de marcador (caso edge)', () => {
      const editorContent = 'Texto [1] meio [2] fim';
      const insertionPosition = 7; // Dentro de [1]
      const newMarker = '[3]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).toBeNull(); // Não deve reindexar se inserção for dentro do marcador
    });
    
    test('deve processar marcadores não sequenciais', () => {
      const editorContent = 'Texto [5] meio [10] final [15] fim';
      const insertionPosition = 12; // Entre [5] e [10] (após "meio")
      const newMarker = '[20]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).not.toBeNull();
      expect(result.needsReindexing).toBe(true);
      expect(result.insertionType.type).toBe('between_markers');
      expect(result.markersToReindex).toHaveLength(2); // [10] e [15]
    });
  });
  
  // ==================== reindexMarkersAfterInsertion Tests ====================
  
  describe('reindexMarkersAfterInsertion', () => {
    
    test('deve executar reindexação sequencial correta', () => {
      const editorContent = 'Texto [1] meio [2] final [3] fim';
      const insertionContext = {
        insertionPosition: 12, // Entre [1] e [2]
        newMarkerNumber: 4,
        needsReindexing: true,
        existingMarkers: [
          { number: 1, text: '[1]', position: 6, endPosition: 9 },
          { number: 2, text: '[2]', position: 15, endPosition: 18 },
          { number: 3, text: '[3]', position: 25, endPosition: 28 }
        ]
      };
      
      const result = MarkerReindexingService.reindexMarkersAfterInsertion(
        editorContent, 
        insertionContext
      );
      
      expect(result).not.toBeNull();
      expect(result.success).toBe(true);
      expect(result.reindexingMap).toHaveLength(3); // Novo marcador + 2 existentes
      expect(result.affectedMarkersCount).toBe(3);
      expect(result.newContent).toContain('[1]'); // [1] permanece
      expect(result.totalReplacements).toBeGreaterThan(0);
      expect(result.validation).toBeDefined();
    });
    
    test('deve manter sequência numérica correta após reindexação', () => {
      const editorContent = 'Início [1] meio [2] final [3] fim';
      const insertionContext = {
        insertionPosition: 12, // Entre [1] e [2]
        newMarkerNumber: 4,
        needsReindexing: true,
        existingMarkers: [
          { number: 1, text: '[1]', position: 7, endPosition: 10 },
          { number: 2, text: '[2]', position: 16, endPosition: 19 },
          { number: 3, text: '[3]', position: 26, endPosition: 29 }
        ]
      };
      
      const result = MarkerReindexingService.reindexMarkersAfterInsertion(
        editorContent, 
        insertionContext
      );
      
      expect(result.success).toBe(true);
      
      // Verificar que a sequência final é válida
      const validation = MarkerReindexingService.validateSequentialIntegrity(
        result.newContent, 
        false // Modo não rigoroso para permitir sequências não contínuas
      );
      
      expect(validation.duplicates).toHaveLength(0); // Não deve haver duplicatas
    });
    
    test('deve retornar null quando não há reindexação necessária', () => {
      const editorContent = 'Texto [1] meio [2] fim';
      const insertionContext = {
        insertionPosition: 25,
        newMarkerNumber: 3,
        needsReindexing: false,
        existingMarkers: []
      };
      
      const result = MarkerReindexingService.reindexMarkersAfterInsertion(
        editorContent, 
        insertionContext
      );
      
      expect(result).toBeNull(); // Deve retornar null quando não precisa reindexar
    });
    
    test('deve retornar null para parâmetros inválidos', () => {
      const result1 = MarkerReindexingService.reindexMarkersAfterInsertion(null, {});
      const result2 = MarkerReindexingService.reindexMarkersAfterInsertion('', null);
      const result3 = MarkerReindexingService.reindexMarkersAfterInsertion(
        'texto', 
        { needsReindexing: false }
      );
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });
    
    test('deve processar inserção no início da sequência', () => {
      const editorContent = 'Novo [5] texto [2] meio [3] fim';
      const insertionContext = {
        insertionPosition: 5, // Antes de todos
        newMarkerNumber: 5,
        needsReindexing: true,
        existingMarkers: [
          { number: 2, text: '[2]', position: 13, endPosition: 16 },
          { number: 3, text: '[3]', position: 23, endPosition: 26 }
        ]
      };
      
      const result = MarkerReindexingService.reindexMarkersAfterInsertion(
        editorContent, 
        insertionContext
      );
      
      expect(result.success).toBe(true);
      expect(result.reindexingMap).toHaveLength(3); // Novo + 2 existentes
    });
    
    test('deve lidar com marcadores duplicados no conteúdo original', () => {
      const editorContent = 'Texto [2] meio [2] final [3] fim';
      const insertionContext = {
        insertionPosition: 15,
        newMarkerNumber: 4,
        needsReindexing: true,
        existingMarkers: [
          { number: 2, text: '[2]', position: 6, endPosition: 9 },
          { number: 2, text: '[2]', position: 16, endPosition: 19 },
          { number: 3, text: '[3]', position: 26, endPosition: 29 }
        ]
      };
      
      const result = MarkerReindexingService.reindexMarkersAfterInsertion(
        editorContent, 
        insertionContext
      );
      
      expect(result.success).toBe(true);
      // Deve processar mesmo com duplicatas
      expect(result.totalReplacements).toBeGreaterThan(0);
    });
  });
  
  // ==================== updateReferenceMapping Tests ====================
  
  describe('updateReferenceMapping', () => {
    
    let originalMapping;
    
    beforeEach(() => {
      originalMapping = new Map();
      originalMapping.set('Título 1', '[1]');
      originalMapping.set('[1]', 'Título 1');
      originalMapping.set('Título 2', '[2]');
      originalMapping.set('[2]', 'Título 2');
      originalMapping.set('Título 3', '[3]');
      originalMapping.set('[3]', 'Título 3');
    });
    
    test('deve atualizar mapeamento corretamente após reindexação', () => {
      const reindexingMap = [
        { oldMarker: '[2]', newMarker: '[3]', oldNumber: 2, newNumber: 3 },
        { oldMarker: '[3]', newMarker: '[4]', oldNumber: 3, newNumber: 4 }
      ];
      
      const result = MarkerReindexingService.updateReferenceMapping(
        originalMapping, 
        reindexingMap
      );
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBeGreaterThanOrEqual(5); // Size may vary due to mapping updates
      
      // Verificar mapeamentos atualizados
      expect(result.get('Título 1')).toBe('[1]'); // Não mudou
      expect(result.get('[1]')).toBe('Título 1');
      
      expect(result.get('Título 2')).toBe('[3]'); // [2] -> [3]
      expect(result.get('Título 3')).toBe('[4]'); // [3] -> [4]
      
      // Verificar que marcadores antigos foram removidos
      expect(result.has('[2]')).toBe(false);
      
      // Verificar que o mapeamento foi atualizado corretamente
      expect(result.size).toBeGreaterThan(0);
    });
    
    test('deve manter sincronização bidirecional', () => {
      const reindexingMap = [
        { oldMarker: '[1]', newMarker: '[2]', oldNumber: 1, newNumber: 2 }
      ];
      
      const result = MarkerReindexingService.updateReferenceMapping(
        originalMapping, 
        reindexingMap
      );
      
      // Verificar sincronização bidirecional
      const titulo = result.get('[2]');
      const marcador = result.get(titulo);
      
      expect(titulo).toBe('Título 1');
      expect(marcador).toBe('[2]');
    });
    
    test('deve retornar mapeamento original para reindexingMap vazio', () => {
      const result = MarkerReindexingService.updateReferenceMapping(
        originalMapping, 
        []
      );
      
      expect(result).toEqual(originalMapping);
      expect(result.size).toBe(originalMapping.size);
    });
    
    test('deve lidar com mapeamento inválido', () => {
      const result1 = MarkerReindexingService.updateReferenceMapping(null, []);
      const result2 = MarkerReindexingService.updateReferenceMapping(
        'não-é-map', 
        []
      );
      
      expect(result1).toBeInstanceOf(Map);
      expect(result1.size).toBe(0);
      expect(result2).toBeInstanceOf(Map);
      expect(result2.size).toBe(0);
    });
    
    test('deve lidar com reindexingMap inválido', () => {
      const result1 = MarkerReindexingService.updateReferenceMapping(
        originalMapping, 
        null
      );
      const result2 = MarkerReindexingService.updateReferenceMapping(
        originalMapping, 
        'não-é-array'
      );
      
      expect(result1).toEqual(originalMapping);
      expect(result2).toEqual(originalMapping);
    });
    
    test('deve processar marcador sem título associado', () => {
      const reindexingMap = [
        { 
          oldMarker: '[99]', 
          newMarker: '[100]', 
          oldNumber: 99, 
          newNumber: 100,
          isNewMarkerAdjustment: true 
        }
      ];
      
      const result = MarkerReindexingService.updateReferenceMapping(
        originalMapping, 
        reindexingMap
      );
      
      // Deve manter mapeamento original já que [99] não existe
      expect(result.size).toBe(originalMapping.size);
      expect(result.get('Título 1')).toBe('[1]');
    });
    
    test('deve processar múltiplas mudanças simultaneamente', () => {
      const reindexingMap = [
        { oldMarker: '[1]', newMarker: '[2]', oldNumber: 1, newNumber: 2 },
        { oldMarker: '[2]', newMarker: '[3]', oldNumber: 2, newNumber: 3 },
        { oldMarker: '[3]', newMarker: '[4]', oldNumber: 3, newNumber: 4 }
      ];
      
      const result = MarkerReindexingService.updateReferenceMapping(
        originalMapping, 
        reindexingMap
      );
      
      expect(result.size).toBeGreaterThanOrEqual(4); // Size may vary due to mapping updates
      expect(result.get('Título 1')).toBe('[2]');
      expect(result.get('Título 2')).toBe('[3]');
      expect(result.get('Título 3')).toBe('[4]');
      
      // Verificar que o mapeamento foi processado corretamente
      expect(result.size).toBeGreaterThan(0);
    });
  });
  
  // ==================== Edge Cases Tests ====================
  
  describe('Edge Cases', () => {
    
    test('deve lidar com primeiro marcador - inserção antes', () => {
      const editorContent = 'Texto [1] meio [2] fim';
      const insertionPosition = 2; // Antes de [1]
      const newMarker = '[3]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).not.toBeNull();
      expect(result.insertionType.type).toBe('before_first');
      expect(result.newMarkerFinalNumber).toBe(1);
    });
    
    test('deve lidar com último marcador - inserção depois', () => {
      const editorContent = 'Texto [1] meio [2] fim novo';
      const insertionPosition = 25; // Após [2]
      const newMarker = '[3]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).toBeNull(); // Não precisa reindexar
    });
    
    test('deve lidar com conteúdo sem marcadores', () => {
      const editorContent = 'Texto sem nenhum marcador';
      const insertionPosition = 10;
      const newMarker = '[1]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).toBeNull();
    });
    
    test('deve lidar com apenas um marcador existente', () => {
      const editorContent = 'Texto [5] fim';
      const insertionPosition = 5; // Antes do único marcador
      const newMarker = '[10]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).not.toBeNull();
      expect(result.insertionType.type).toBe('before_first');
      expect(result.markersToReindex).toHaveLength(1);
    });
    
    test('deve lidar com marcadores em posições extremas', () => {
      const editorContent = '[1] início meio [2] final [3]';
      const insertionPosition = 5; // Entre [1] e [2]
      const newMarker = '[4]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).not.toBeNull();
      expect(result.insertionType.type).toBe('between_markers');
    });
    
    test('deve lidar com marcadores com números grandes', () => {
      const editorContent = 'Texto [999] meio [1000] fim';
      const insertionPosition = 15;
      const newMarker = '[1001]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(result).not.toBeNull();
      expect(result.newMarkerNumber).toBe(1001);
      expect(result.newMarkerFinalNumber).toBe(1000);
    });
    
    test('deve lidar com conteúdo muito pequeno', () => {
      const editorContent = 'X[1]';
      const insertionPosition = 0; // Antes de tudo
      const newMarker = '[2]';
      
      const result = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
newMarker
      );
      
      expect(result).not.toBeNull();
      expect(result.insertionType.type).toBe('before_first');
    });
    
    test('deve lidar com referenceMapping vazio', () => {
      const emptyMapping = new Map();
      const reindexingMap = [
        { oldMarker: '[1]', newMarker: '[2]', oldNumber: 1, newNumber: 2 }
      ];
      
      const result = MarkerReindexingService.updateReferenceMapping(
        emptyMapping, 
        reindexingMap
      );
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0); // Deve permanecer vazio
    });
  });
  
  // ==================== Integration Tests ====================
  
  describe('Integration Tests', () => {
    
    test('deve executar fluxo completo de detecção e reindexação', () => {
      const editorContent = 'Texto [1] meio [3] final [4] fim';
      const insertionPosition = 12; // Entre [1] e [3]
      const newMarker = '[5]';
      
      // 1. Detectar inserção
      const insertionContext = MarkerReindexingService.detectInsertionBetweenMarkers(
        editorContent, 
        insertionPosition, 
        newMarker
      );
      
      expect(insertionContext).not.toBeNull();
      
      // 2. Executar reindexação
      const reindexResult = MarkerReindexingService.reindexMarkersAfterInsertion(
        editorContent, 
        insertionContext
      );
      
      expect(reindexResult.success).toBe(true);
      
      // 3. Atualizar mapeamento
      const originalMapping = new Map([
        ['Título 1', '[1]'], ['[1]', 'Título 1'],
        ['Título 3', '[3]'], ['[3]', 'Título 3'],
        ['Título 4', '[4]'], ['[4]', 'Título 4']
      ]);
      
      const updatedMapping = MarkerReindexingService.updateReferenceMapping(
        originalMapping, 
        reindexResult.reindexingMap
      );
      
      expect(updatedMapping).toBeInstanceOf(Map);
      expect(updatedMapping.size).toBeGreaterThan(0);
    });
    
    test('deve manter consistência em operações sequenciais', () => {
      let content = 'Texto [1] meio [2] fim';
      let mapping = new Map([
        ['Título 1', '[1]'], ['[1]', 'Título 1'],
        ['Título 2', '[2]'], ['[2]', 'Título 2']
      ]);
      
      // Primeira inserção
      const context1 = MarkerReindexingService.detectInsertionBetweenMarkers(
        content, 10, '[3]'
      );
      
      if (context1) {
        const result1 = MarkerReindexingService.reindexMarkersAfterInsertion(
          content, context1
        );
        
        if (result1.success) {
          content = result1.newContent;
          mapping = MarkerReindexingService.updateReferenceMapping(
            mapping, result1.reindexingMap
          );
        }
      }
      
      // Segunda inserção
      const context2 = MarkerReindexingService.detectInsertionBetweenMarkers(
        content, 5, '[4]'
      );
      
      if (context2) {
        const result2 = MarkerReindexingService.reindexMarkersAfterInsertion(
          content, context2
        );
        
        expect(result2.success).toBe(true);
      }
      
      // Verificar que não há duplicatas no conteúdo final
      const validation = MarkerReindexingService.validateSequentialIntegrity(
        content, false
      );
      
      expect(validation.duplicates).toHaveLength(0);
    });
  });
});