/**
 * Testes para sistema de error handling e rollback do MarkerReindexingService
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import MarkerReindexingService from '../markerReindexingService.js';

describe('MarkerReindexingService - Error Handling & Rollback', () => {
  let mockEditor;
  let mockReferenceMapping;
  let mockSetReferenceMapping;

  beforeEach(() => {
    // Mock do editor
    mockEditor = {
      getContent: vi.fn(() => 'Texto [1] original [2] conteúdo [3]'),
      replaceContent: vi.fn(() => true),
      getCursorPosition: vi.fn(() => 15),
      scrollTop: 0,
      scrollLeft: 0
    };

    // Mock do referenceMapping
    mockReferenceMapping = new Map([
      ['Título 1', '[1]'],
      ['[1]', 'Título 1'],
      ['Título 2', '[2]'],
      ['[2]', 'Título 2'],
      ['Título 3', '[3]'],
      ['[3]', 'Título 3']
    ]);

    // Mock da função setReferenceMapping
    mockSetReferenceMapping = vi.fn();
  });

  describe('createStateBackup', () => {
    test('deve criar backup completo do estado', () => {
      const backup = MarkerReindexingService.createStateBackup(
        mockEditor, 
        mockReferenceMapping, 
        'test_operation'
      );

      expect(backup).toMatchObject({
        operationId: 'test_operation',
        originalContent: 'Texto [1] original [2] conteúdo [3]',
        cursorPosition: 15,
        contentLength: 35,
        mappingSize: 6
      });

      expect(backup.originalReferenceMapping).toBeInstanceOf(Map);
      expect(backup.originalReferenceMapping.size).toBe(6);
      expect(backup.timestamp).toBeTypeOf('number');
    });

    test('deve criar backup mínimo quando editor é inválido', () => {
      const backup = MarkerReindexingService.createStateBackup(
        null, 
        mockReferenceMapping, 
        'test_operation'
      );

      expect(backup).toMatchObject({
        operationId: 'test_operation',
        originalContent: '',
        cursorPosition: 0,
        contentLength: 0,
        mappingSize: 6
      });
    });

    test('deve lidar com erro durante criação do backup', () => {
      const faultyEditor = {
        getContent: vi.fn(() => { throw new Error('Editor error'); })
      };

      const backup = MarkerReindexingService.createStateBackup(
        faultyEditor, 
        mockReferenceMapping, 
        'test_operation'
      );

      expect(backup.isErrorBackup).toBe(undefined); // O backup não é marcado como erro quando só o editor falha
      expect(backup.originalContent).toBe(''); // Conteúdo vazio quando editor falha
    });
  });

  describe('executeRollback', () => {
    test('deve executar rollback completo com sucesso', () => {
      const backup = {
        operationId: 'test_rollback',
        originalContent: 'Conteúdo original [1] teste [2]',
        originalReferenceMapping: new Map([['Título', '[1]'], ['[1]', 'Título']]),
        cursorPosition: 10,
        editorState: { scrollTop: 0, scrollLeft: 0 }
      };

      const success = MarkerReindexingService.executeRollback(
        backup, 
        mockEditor, 
        mockSetReferenceMapping
      );

      expect(success).toBe(true);
      expect(mockEditor.replaceContent).toHaveBeenCalledWith('Conteúdo original [1] teste [2]');
      expect(mockSetReferenceMapping).toHaveBeenCalledWith(backup.originalReferenceMapping);
    });

    test('deve falhar rollback com backup inválido', () => {
      const invalidBackup = { isErrorBackup: true };

      const success = MarkerReindexingService.executeRollback(
        invalidBackup, 
        mockEditor, 
        mockSetReferenceMapping
      );

      expect(success).toBe(false);
      expect(mockEditor.replaceContent).not.toHaveBeenCalled();
    });

    test('deve lidar com erro durante rollback do conteúdo', () => {
      mockEditor.replaceContent = vi.fn(() => { throw new Error('Rollback error'); });

      const backup = {
        operationId: 'test_rollback',
        originalContent: 'Conteúdo original',
        originalReferenceMapping: new Map(),
        cursorPosition: 0
      };

      const success = MarkerReindexingService.executeRollback(
        backup, 
        mockEditor, 
        mockSetReferenceMapping
      );

      expect(success).toBe(false);
    });
  });

  describe('validatePostReindexingIntegrity', () => {
    test('deve validar integridade completa com sucesso', () => {
      const content = 'Texto [1] original [2] conteúdo [3]';
      const mapping = new Map([
        ['Título 1', '[1]'], ['[1]', 'Título 1'],
        ['Título 2', '[2]'], ['[2]', 'Título 2'],
        ['Título 3', '[3]'], ['[3]', 'Título 3']
      ]);
      const reindexingMap = [];

      const result = MarkerReindexingService.validatePostReindexingIntegrity(
        content, 
        mapping, 
        reindexingMap
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.checks.sequentialIntegrity).toBeDefined();
      expect(result.checks.mappingConsistency).toBeDefined();
      expect(result.checks.contentIntegrity).toBeDefined();
    });

    test('deve detectar problemas de integridade', () => {
      const content = 'Texto [1] original [1] conteúdo [3]'; // Marcador duplicado
      const mapping = new Map([['Título', '[2]'], ['[2]', 'Título']]); // Marcador órfão
      const reindexingMap = [];

      const result = MarkerReindexingService.validatePostReindexingIntegrity(
        content, 
        mapping, 
        reindexingMap
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('preserveBasicFunctionality', () => {
    test('deve preservar funcionalidades básicas após erro', () => {
      const error = new Error('Erro crítico de reindexação');
      const context = { editor: mockEditor };

      const fallbackState = MarkerReindexingService.preserveBasicFunctionality(error, context);

      expect(fallbackState.mode).toBe('fallback');
      expect(fallbackState.originalError).toBe('Erro crítico de reindexação');
      expect(fallbackState.preservedFunctions.basicEditing).toBe(true);
      expect(fallbackState.preservedFunctions.reindexing).toBe(false);
      expect(fallbackState.recommendations).toBeInstanceOf(Array);
    });

    test('deve lidar com erro no próprio sistema de fallback', () => {
      const error = new Error('Erro original');
      const faultyContext = {
        editor: {
          enable: vi.fn(() => { throw new Error('Fallback error'); })
        }
      };

      const fallbackState = MarkerReindexingService.preserveBasicFunctionality(error, faultyContext);

      expect(fallbackState.mode).toBe('fallback');
      expect(fallbackState.preservedFunctions.basicEditing).toBe(false);
    });
  });

  describe('validateWithAutoRecovery', () => {
    test('deve executar validação sem necessidade de correção', () => {
      const content = 'Texto [1] original [2] conteúdo [3]';
      const mapping = new Map([
        ['Título 1', '[1]'], ['[1]', 'Título 1'],
        ['Título 2', '[2]'], ['[2]', 'Título 2'],
        ['Título 3', '[3]'], ['[3]', 'Título 3']
      ]);

      const result = MarkerReindexingService.validateWithAutoRecovery(content, mapping);

      expect(result.isValid).toBe(true);
      expect(result.fixesApplied).toHaveLength(0);
      expect(result.fixAttempts).toBe(0);
      expect(result.autoRecoveryUsed).toBe(undefined); // autoRecoveryUsed não é definido quando não há correções
    });

    test('deve aplicar correções automáticas quando necessário', () => {
      const content = 'Texto [1] original [1] conteúdo [3]'; // Marcador duplicado
      const mapping = new Map();

      const result = MarkerReindexingService.validateWithAutoRecovery(content, mapping, {
        attemptAutoFix: true,
        maxFixAttempts: 2
      });

      expect(result.fixAttempts).toBeGreaterThan(0);
      expect(result.finalContent).toBeDefined();
    });
  });

  describe('fixDuplicateMarkers', () => {
    test('deve remover marcadores duplicados', () => {
      const content = 'Texto [1] original [1] conteúdo [2] mais [2] texto';

      const result = MarkerReindexingService.fixDuplicateMarkers(content);

      expect(result.success).toBe(true);
      expect(result.duplicatesRemoved).toBe(2);
      expect(result.newContent).toBe('Texto [1] original  conteúdo [2] mais  texto');
    });

    test('deve retornar conteúdo inalterado se não há duplicatas', () => {
      const content = 'Texto [1] original [2] conteúdo [3]';

      const result = MarkerReindexingService.fixDuplicateMarkers(content);

      expect(result.success).toBe(true);
      expect(result.duplicatesRemoved).toBe(0);
      expect(result.newContent).toBe(content);
    });
  });

  describe('fixSequenceGaps', () => {
    test('deve corrigir gaps na sequência', () => {
      const content = 'Texto [1] original [5] conteúdo [10]';

      const result = MarkerReindexingService.fixSequenceGaps(content);

      expect(result.success).toBe(true);
      expect(result.gapsFixed).toBe(2);
      expect(result.newContent).toBe('Texto [1] original [2] conteúdo [3]');
    });

    test('deve manter sequência já correta', () => {
      const content = 'Texto [1] original [2] conteúdo [3]';

      const result = MarkerReindexingService.fixSequenceGaps(content);

      expect(result.success).toBe(true);
      expect(result.gapsFixed).toBe(0);
      expect(result.newContent).toBe(content);
    });
  });

  describe('syncReferenceMapping', () => {
    test('deve sincronizar mapping com conteúdo', () => {
      const content = 'Texto [1] original [2]';
      const mapping = new Map([
        ['Título 1', '[1]'], ['[1]', 'Título 1'],
        ['Título 2', '[2]'], ['[2]', 'Título 2'],
        ['Título 3', '[3]'], ['[3]', 'Título 3'] // Órfão
      ]);

      const result = MarkerReindexingService.syncReferenceMapping(content, mapping);

      expect(result.success).toBe(true);
      expect(result.syncedEntries).toBe(2);
      expect(result.removedEntries).toBe(1);
      expect(result.newMapping.has('[3]')).toBe(false);
    });
  });

  describe('reindexWithErrorHandling', () => {
    test('deve executar reindexação com error handling básico', () => {
      const editorContent = 'Texto [1] original [2] conteúdo [3]';
      const insertionContext = {
        needsReindexing: true,
        insertionPosition: 10,
        newMarkerNumber: 2,
        existingMarkers: [
          { number: 1, text: '[1]', position: 6 },
          { number: 2, text: '[2]', position: 18 },
          { number: 3, text: '[3]', position: 30 }
        ]
      };

      // Mock dos métodos internos para simular sucesso
      vi.spyOn(MarkerReindexingService, 'reindexMarkersAfterInsertion')
        .mockReturnValue({
          success: true,
          newContent: 'Texto [1] novo [2] original [3] conteúdo [4]',
          reindexingMap: [{ oldMarker: '[2]', newMarker: '[3]' }]
        });

      vi.spyOn(MarkerReindexingService, 'applyReindexingToEditor')
        .mockReturnValue(true);

      vi.spyOn(MarkerReindexingService, 'updateReferenceMapping')
        .mockReturnValue(new Map());

      vi.spyOn(MarkerReindexingService, 'validatePostReindexingIntegrity')
        .mockReturnValue({ isValid: true, errors: [], warnings: [] });

      const result = MarkerReindexingService.reindexWithErrorHandling(
        editorContent,
        insertionContext,
        mockEditor,
        mockReferenceMapping,
        mockSetReferenceMapping
      );

      expect(result.success).toBe(true);
      expect(result.backup).toBeDefined();
      expect(result.rollback).toBeTypeOf('function');
      expect(result.operationId).toMatch(/^reindex_\d+_/);
    });

    test('deve executar rollback em caso de falha na reindexação', () => {
      const editorContent = 'Texto [1] original [2]';
      const insertionContext = { needsReindexing: true };

      // Mock para simular falha na reindexação
      vi.spyOn(MarkerReindexingService, 'reindexMarkersAfterInsertion')
        .mockReturnValue(null);

      vi.spyOn(MarkerReindexingService, 'executeRollback')
        .mockReturnValue(true);

      const result = MarkerReindexingService.reindexWithErrorHandling(
        editorContent,
        insertionContext,
        mockEditor,
        mockReferenceMapping,
        mockSetReferenceMapping
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.rollbackExecuted).toBe(true);
    });
  });

  describe('executeReindexingWithFullErrorHandling', () => {
    test('deve executar reindexação com sistema completo de error handling', async () => {
      const editorContent = 'Texto [1] original [2]';
      const insertionContext = { needsReindexing: true };

      // Mock para simular sucesso na primeira tentativa
      vi.spyOn(MarkerReindexingService, 'reindexWithErrorHandling')
        .mockReturnValue({
          success: true,
          result: {
            newContent: 'Texto [1] novo [2] original [3]',
            newReferenceMapping: new Map()
          }
        });

      vi.spyOn(MarkerReindexingService, 'validateWithAutoRecovery')
        .mockReturnValue({
          isValid: true,
          autoRecoveryUsed: false,
          fixesApplied: []
        });

      const result = await MarkerReindexingService.executeReindexingWithFullErrorHandling(
        editorContent,
        insertionContext,
        mockEditor,
        mockReferenceMapping,
        mockSetReferenceMapping
      );

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(1);
      expect(result.errorHandlingLevel).toBe('full');
    });

    test('deve tentar múltiplas vezes antes de falhar', async () => {
      const editorContent = 'Texto [1] original [2]';
      const insertionContext = { needsReindexing: true };

      // Mock para simular falha em todas as tentativas
      vi.spyOn(MarkerReindexingService, 'reindexWithErrorHandling')
        .mockReturnValue({
          success: false,
          error: new Error('Falha simulada')
        });

      vi.spyOn(MarkerReindexingService, 'preserveBasicFunctionality')
        .mockReturnValue({
          mode: 'fallback',
          preservedFunctions: { basicEditing: true }
        });

      const result = await MarkerReindexingService.executeReindexingWithFullErrorHandling(
        editorContent,
        insertionContext,
        mockEditor,
        mockReferenceMapping,
        mockSetReferenceMapping,
        { maxRetryAttempts: 1 }
      );

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(2);
      expect(result.functionalityPreserved).toBe(true);
      expect(result.fallbackState).toBeDefined();
    });
  });
});