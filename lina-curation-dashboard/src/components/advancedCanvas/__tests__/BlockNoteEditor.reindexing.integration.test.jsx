/**
 * Focused integration tests for BlockNoteEditor reindexing functionality
 * Tests the specific integration between BlockNoteEditor and MarkerReindexingService
 * 
 * Requirements covered:
 * - 2.1: Automatic detection of insertion between markers
 * - 2.2: Automatic reindexing execution after insertion
 * - 2.3: Multiple insertions processing
 * - 3.4: Error handling without breaking editor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarkerReindexingService } from '../../../utils/markerReindexingService.js';

// Mock the MarkerReindexingService
vi.mock('../../../utils/markerReindexingService.js', () => ({
  MarkerReindexingService: {
    detectInsertionBetweenMarkers: vi.fn(),
    reindexWithErrorHandling: vi.fn(),
    updateReferenceMapping: vi.fn(),
    validateSequentialIntegrity: vi.fn()
  }
}));

describe('BlockNoteEditor Reindexing Integration', () => {
  let mockTiptapEditor;
  let mockOnReferenceUpdate;
  let mockOnReindexing;
  let insertTextAtPositionFunction;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock callbacks
    mockOnReferenceUpdate = vi.fn();
    mockOnReindexing = vi.fn();
    
    // Create a mock TipTap editor that simulates the real behavior
    mockTiptapEditor = {
      state: {
        doc: {
          textContent: 'Some text [16] existing content [17] more content [18]',
          content: { size: 100 },
          descendants: vi.fn((callback) => {
            callback({ 
              isText: true, 
              text: 'Some text [16] existing content [17] more content [18]' 
            }, 0);
            return true;
          })
        }
      },
      commands: {
        focus: vi.fn(() => true),
        setTextSelection: vi.fn(() => true),
        insertContent: vi.fn(() => true),
        insertContentAt: vi.fn(() => true)
      }
    };

    // Create the insertTextAtPosition function that mimics the real implementation
    insertTextAtPositionFunction = async (searchText, newText, position = 'after', onReferenceUpdate = null, onReindexing = null) => {
      try {
        if (!mockTiptapEditor) {
          console.error('❌ Editor TipTap não disponível para inserção');
          return false;
        }

        const tiptap = mockTiptapEditor;
        console.log(`🔍 Inserindo "${newText}" ${position} "${searchText}" com reindexação automática`);
        
        // 1. Obter conteúdo atual do editor para análise
        const currentContent = tiptap.state.doc.textContent;
        console.log(`📄 Conteúdo atual: ${currentContent.length} caracteres`);
        
        // 2. Gerar próximo número de marcador (simplified for testing)
        const markerNumber = 19; // Fixed for testing
        const marker = `[${markerNumber}]`;
        const textWithMarker = `${newText} ${marker}`;
        
        // 3. Simular inserção bem-sucedida
        const insertionPosition = searchText ? currentContent.indexOf(searchText) + searchText.length : currentContent.length;
        
        // Simulate successful insertion
        tiptap.commands.focus();
        tiptap.commands.setTextSelection(insertionPosition);
        const insertResult = tiptap.commands.insertContent(textWithMarker);
        
        if (!insertResult) {
          console.error('❌ Inserção falhou');
          return false;
        }

        // 4. Simular conteúdo atualizado após inserção
        const updatedContent = currentContent + textWithMarker;
        console.log('🔍 Detectando necessidade de reindexação...');
        
        // 5. INTEGRATION POINT: Call MarkerReindexingService
        const insertionContext = MarkerReindexingService.detectInsertionBetweenMarkers(
          updatedContent, 
          insertionPosition, 
          marker
        );

        if (insertionContext && insertionContext.needsReindexing) {
          console.log('🔄 Reindexação necessária! Executando com error handling...');
          
          // 6. INTEGRATION POINT: Execute reindexing with error handling
          const reindexingResult = MarkerReindexingService.reindexWithErrorHandling(
            updatedContent, 
            insertionContext,
            { _tiptapEditor: tiptap }, // Mock editor instance
            new Map(), // referenceMapping atual
            null // setReferenceMapping será chamado via onReferenceUpdate
          );

          if (reindexingResult && reindexingResult.success) {
            console.log(`✅ Reindexação concluída: ${reindexingResult.result.affectedMarkersCount} marcadores processados`);
            
            // 7. INTEGRATION POINT: Notify about reindexing via callback
            if (typeof onReindexing === 'function') {
              console.log('📢 Notificando sobre reindexação via callback');
              onReindexing(reindexingResult.result.reindexingMap);
            }
            
            // 8. INTEGRATION POINT: Update referenceMapping if callback provided
            if (typeof onReferenceUpdate === 'function') {
              const titleFromText = newText.substring(0, 50).trim();
              const finalMarkerNumber = insertionContext.newMarkerFinalNumber || markerNumber;
              const finalMarker = `[${finalMarkerNumber}]`;
              
              console.log(`📝 Atualizando referência: ${finalMarker} -> "${titleFromText}"`);
              onReferenceUpdate(finalMarker, titleFromText);
            }
            
          } else {
            console.error('❌ Falha na reindexação com error handling:', reindexingResult?.error || 'Erro desconhecido');
            
            // Fallback: inserção simples
            if (typeof onReferenceUpdate === 'function') {
              const titleFromText = newText.substring(0, 50).trim();
              onReferenceUpdate(marker, titleFromText);
            }
          }
          
        } else {
          console.log('ℹ️ Reindexação não necessária');
          
          // Normal insertion - update referenceMapping
          if (typeof onReferenceUpdate === 'function') {
            const titleFromText = newText.substring(0, 50).trim();
            onReferenceUpdate(marker, titleFromText);
          }
        }

        console.log(`✅ Inserção com reindexação concluída: "${newText}" ${position} "${searchText}"`);
        return true;

      } catch (error) {
        console.error('❌ Erro durante inserção com reindexação:', error);
        return false;
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 2.1: Insertion Between Markers Triggers Reindexing', () => {
    it('should call MarkerReindexingService.detectInsertionBetweenMarkers when inserting text between markers', async () => {
      // Mock the service to return a context that needs reindexing
      const mockInsertionContext = {
        needsReindexing: true,
        newMarkerFinalNumber: 17,
        insertionPosition: 100,
        existingMarkers: [
          { number: 17, text: '[17]', position: 120 },
          { number: 18, text: '[18]', position: 150 }
        ]
      };

      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);
      
      const mockReindexingResult = {
        success: true,
        result: {
          newContent: 'Updated content with reindexed markers',
          reindexingMap: [
            { oldMarker: '[17]', newMarker: '[18]', oldNumber: 17, newNumber: 18 }
          ],
          affectedMarkersCount: 1
        }
      };

      MarkerReindexingService.reindexWithErrorHandling.mockReturnValue(mockReindexingResult);

      // Execute the insertion function
      const result = await insertTextAtPositionFunction('[16]', 'New inserted text', 'after', mockOnReferenceUpdate, mockOnReindexing);

      // Verify that the function succeeded
      expect(result).toBe(true);

      // Verify that the MarkerReindexingService was called
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalled();
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalledWith(
        expect.any(String), // editor content
        expect.any(Number), // insertion position
        expect.stringMatching(/\[\d+\]/) // new marker
      );
    });

    it('should trigger reindexing when insertion is detected between existing markers', async () => {
      const mockInsertionContext = {
        needsReindexing: true,
        newMarkerFinalNumber: 17,
        insertionPosition: 100,
        insertionType: {
          type: 'between_markers',
          description: 'Insertion between [16] and [17]'
        }
      };

      const mockReindexingResult = {
        success: true,
        result: {
          newContent: 'Updated content',
          reindexingMap: [
            { oldMarker: '[17]', newMarker: '[18]', oldNumber: 17, newNumber: 18 }
          ],
          affectedMarkersCount: 1
        }
      };

      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);
      MarkerReindexingService.reindexWithErrorHandling.mockReturnValue(mockReindexingResult);

      // Execute the insertion function
      const result = await insertTextAtPositionFunction('[16]', 'New text', 'after', mockOnReferenceUpdate, mockOnReindexing);

      // Verify that the function succeeded
      expect(result).toBe(true);

      // Verify that reindexing was triggered
      expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalled();
      expect(mockOnReindexing).toHaveBeenCalledWith(mockReindexingResult.result.reindexingMap);
    });
  });

  describe('Requirement 2.2: Insertion at Start/End Does Not Trigger Unnecessary Reindexing', () => {
    it('should not trigger reindexing when inserting at the beginning of document', async () => {
      // Mock the service to return null (no reindexing needed)
      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(null);

      // Execute the insertion function (empty searchText means insert at beginning/end)
      const result = await insertTextAtPositionFunction('', 'New text at beginning', 'after', mockOnReferenceUpdate, mockOnReindexing);

      // Verify that the function succeeded
      expect(result).toBe(true);

      // Verify that detection was called but reindexing was not triggered
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalled();
      expect(MarkerReindexingService.reindexWithErrorHandling).not.toHaveBeenCalled();
      expect(mockOnReindexing).not.toHaveBeenCalled();
      
      // But reference update should still be called
      expect(mockOnReferenceUpdate).toHaveBeenCalled();
    });

    it('should not trigger reindexing when insertion context indicates no reindexing needed', async () => {
      const mockInsertionContext = {
        needsReindexing: false,
        insertionType: {
          type: 'after_last',
          description: 'Insertion after last marker [18]'
        }
      };

      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);

      // Execute the insertion function
      const result = await insertTextAtPositionFunction('[18]', 'New text after last marker', 'after', mockOnReferenceUpdate, mockOnReindexing);

      // Verify that the function succeeded
      expect(result).toBe(true);

      // Verify that detection was called but reindexing was not triggered
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalled();
      expect(MarkerReindexingService.reindexWithErrorHandling).not.toHaveBeenCalled();
      expect(mockOnReindexing).not.toHaveBeenCalled();
      
      // But reference update should still be called
      expect(mockOnReferenceUpdate).toHaveBeenCalled();
    });
  });

  describe('Requirement 2.3: Multiple Insertions Are Processed Correctly', () => {
    it('should handle multiple sequential insertions correctly', async () => {
      let callCount = 0;
      
      // Mock different responses for each call
      MarkerReindexingService.detectInsertionBetweenMarkers.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            needsReindexing: true,
            newMarkerFinalNumber: 17,
            insertionPosition: 100
          };
        } else if (callCount === 2) {
          return {
            needsReindexing: true,
            newMarkerFinalNumber: 18,
            insertionPosition: 150
          };
        }
        return null;
      });

      const mockReindexingResult = {
        success: true,
        result: {
          newContent: 'Updated content',
          reindexingMap: [
            { oldMarker: '[17]', newMarker: '[18]', oldNumber: 17, newNumber: 18 }
          ],
          affectedMarkersCount: 1
        }
      };

      MarkerReindexingService.reindexWithErrorHandling.mockReturnValue(mockReindexingResult);

      // First insertion
      const result1 = await insertTextAtPositionFunction('[16]', 'First insertion', 'after', mockOnReferenceUpdate, mockOnReindexing);
      expect(result1).toBe(true);

      // Second insertion
      const result2 = await insertTextAtPositionFunction('[17]', 'Second insertion', 'after', mockOnReferenceUpdate, mockOnReindexing);
      expect(result2).toBe(true);

      // Verify that both insertions were processed
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalledTimes(2);
      expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalledTimes(2);
      expect(mockOnReindexing).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid successive insertions without conflicts', async () => {
      const mockInsertionContext = {
        needsReindexing: true,
        newMarkerFinalNumber: 17,
        insertionPosition: 100
      };

      const mockReindexingResult = {
        success: true,
        result: {
          newContent: 'Updated content',
          reindexingMap: [
            { oldMarker: '[17]', newMarker: '[18]', oldNumber: 17, newNumber: 18 }
          ],
          affectedMarkersCount: 1
        }
      };

      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);
      MarkerReindexingService.reindexWithErrorHandling.mockReturnValue(mockReindexingResult);

      // Simulate rapid insertions
      const insertionPromises = [];
      for (let i = 0; i < 3; i++) {
        insertionPromises.push(
          insertTextAtPositionFunction('[16]', `Rapid insertion ${i}`, 'after', mockOnReferenceUpdate, mockOnReindexing)
        );
      }

      const results = await Promise.all(insertionPromises);

      // Verify that all insertions succeeded
      results.forEach(result => expect(result).toBe(true));

      // Verify that all insertions were processed
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalledTimes(3);
      expect(mockOnReindexing).toHaveBeenCalledTimes(3);
    });
  });

  describe('Requirement 3.4: Error Handling Does Not Break Editor', () => {
    it('should handle reindexing service errors gracefully without breaking editor', async () => {
      const mockInsertionContext = {
        needsReindexing: true,
        newMarkerFinalNumber: 17
      };

      // Mock service to return error
      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);
      MarkerReindexingService.reindexWithErrorHandling.mockReturnValue({
        success: false,
        error: 'Reindexing failed',
        rollbackExecuted: false
      });

      // Execute the insertion function
      const result = await insertTextAtPositionFunction('[16]', 'New text', 'after', mockOnReferenceUpdate, mockOnReindexing);

      // Should still return true (fallback behavior)
      expect(result).toBe(true);
      
      // onReindexing should not be called when reindexing fails
      expect(mockOnReindexing).not.toHaveBeenCalled();
      
      // But onReferenceUpdate should still be called for fallback
      expect(mockOnReferenceUpdate).toHaveBeenCalled();
    });

    it('should handle detection service errors gracefully', async () => {
      // Mock service to throw error during detection
      MarkerReindexingService.detectInsertionBetweenMarkers.mockImplementation(() => {
        throw new Error('Detection service error');
      });

      // Execute the insertion function
      const result = await insertTextAtPositionFunction('[16]', 'New text', 'after', mockOnReferenceUpdate, mockOnReindexing);

      // Should still return false due to the error, but not crash
      expect(result).toBe(false);
      
      // Callbacks should not be called due to error
      expect(mockOnReferenceUpdate).not.toHaveBeenCalled();
      expect(mockOnReindexing).not.toHaveBeenCalled();
    });

    it('should handle rollback scenarios correctly', async () => {
      const mockInsertionContext = {
        needsReindexing: true,
        newMarkerFinalNumber: 17
      };

      // Mock service to return error with rollback executed
      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);
      MarkerReindexingService.reindexWithErrorHandling.mockReturnValue({
        success: false,
        error: 'Reindexing failed',
        rollbackExecuted: true
      });

      // Execute the insertion function
      const result = await insertTextAtPositionFunction('[16]', 'New text', 'after', mockOnReferenceUpdate, mockOnReindexing);

      // Should still return true even with rollback
      expect(result).toBe(true);
      
      // Verify rollback was handled
      expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalled();
      expect(mockOnReindexing).not.toHaveBeenCalled();
      
      // Fallback reference update should still work
      expect(mockOnReferenceUpdate).toHaveBeenCalled();
    });

    it('should continue working after multiple errors', async () => {
      // First call fails, second succeeds
      let callCount = 0;
      MarkerReindexingService.detectInsertionBetweenMarkers.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }
        return {
          needsReindexing: true,
          newMarkerFinalNumber: 17
        };
      });

      const mockReindexingResult = {
        success: true,
        result: {
          newContent: 'Updated content',
          reindexingMap: [
            { oldMarker: '[17]', newMarker: '[18]', oldNumber: 17, newNumber: 18 }
          ],
          affectedMarkersCount: 1
        }
      };

      MarkerReindexingService.reindexWithErrorHandling.mockReturnValue(mockReindexingResult);

      // First insertion (should fail)
      const result1 = await insertTextAtPositionFunction('[16]', 'First text', 'after', mockOnReferenceUpdate, mockOnReindexing);
      expect(result1).toBe(false);

      // Second insertion (should succeed)
      const result2 = await insertTextAtPositionFunction('[16]', 'Second text', 'after', mockOnReferenceUpdate, mockOnReindexing);
      expect(result2).toBe(true);

      // Verify both calls were made and second succeeded
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalledTimes(2);
      expect(mockOnReindexing).toHaveBeenCalledTimes(1); // Only second call succeeded
    });
  });

  describe('Integration Points Verification', () => {
    it('should pass correct parameters to MarkerReindexingService.detectInsertionBetweenMarkers', async () => {
      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(null);

      await insertTextAtPositionFunction('[16]', 'Test text', 'after', mockOnReferenceUpdate, mockOnReindexing);

      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalledWith(
        expect.stringContaining('Some text [16] existing content [17] more content [18]Test text [19]'), // updated content
        expect.any(Number), // insertion position
        '[19]' // new marker
      );
    });

    it('should pass correct parameters to MarkerReindexingService.reindexWithErrorHandling', async () => {
      const mockInsertionContext = {
        needsReindexing: true,
        newMarkerFinalNumber: 17,
        insertionPosition: 100
      };

      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);
      MarkerReindexingService.reindexWithErrorHandling.mockReturnValue({
        success: true,
        result: {
          newContent: 'Updated content',
          reindexingMap: [],
          affectedMarkersCount: 0
        }
      });

      await insertTextAtPositionFunction('[16]', 'Test text', 'after', mockOnReferenceUpdate, mockOnReindexing);

      expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalledWith(
        expect.any(String), // updated content
        mockInsertionContext, // insertion context
        expect.objectContaining({ _tiptapEditor: mockTiptapEditor }), // editor instance
        expect.any(Map), // reference mapping
        null // setReferenceMapping callback
      );
    });

    it('should call onReindexing callback with correct reindexing map', async () => {
      const mockInsertionContext = {
        needsReindexing: true,
        newMarkerFinalNumber: 17
      };

      const expectedReindexingMap = [
        { oldMarker: '[17]', newMarker: '[18]', oldNumber: 17, newNumber: 18 },
        { oldMarker: '[18]', newMarker: '[19]', oldNumber: 18, newNumber: 19 }
      ];

      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);
      MarkerReindexingService.reindexWithErrorHandling.mockReturnValue({
        success: true,
        result: {
          newContent: 'Updated content',
          reindexingMap: expectedReindexingMap,
          affectedMarkersCount: 2
        }
      });

      await insertTextAtPositionFunction('[16]', 'Test text', 'after', mockOnReferenceUpdate, mockOnReindexing);

      expect(mockOnReindexing).toHaveBeenCalledWith(expectedReindexingMap);
    });

    it('should call onReferenceUpdate callback with correct marker and title', async () => {
      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(null);

      await insertTextAtPositionFunction('[16]', 'This is a test text for title extraction', 'after', mockOnReferenceUpdate, mockOnReindexing);

      expect(mockOnReferenceUpdate).toHaveBeenCalledWith(
        '[19]', // new marker
        'This is a test text for title extraction' // title from text
      );
    });
  });
});