/**
 * Integration tests for BlockNoteEditor with MarkerReindexingService
 * Tests the integration between BlockNoteEditor and automatic marker reindexing
 * 
 * Requirements covered:
 * - 2.1: Automatic detection of insertion between markers
 * - 2.2: Automatic reindexing execution after insertion
 * - 2.3: Multiple insertions processing
 * - 3.4: Error handling without breaking editor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import BlockNoteEditor from '../BlockNoteEditor.jsx';
import { MarkerReindexingService } from '../../../utils/markerReindexingService.js';

// Mock the MarkerReindexingService
vi.mock('../../../utils/markerReindexingService.js', () => ({
  MarkerReindexingService: {
    detectInsertionBetweenMarkers: vi.fn(),
    reindexMarkersAfterInsertion: vi.fn(),
    reindexWithErrorHandling: vi.fn(),
    updateReferenceMapping: vi.fn(),
    validateSequentialIntegrity: vi.fn()
  }
}));

// Mock BlockNote dependencies with more realistic behavior
vi.mock('@blocknote/react', () => ({
  useCreateBlockNote: vi.fn(() => {
    const mockEditor = {
      topLevelBlocks: [
        {
          id: 'block1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Some text [16] existing content [17] more content [18]' }]
        }
      ],
      document: [
        {
          id: 'block1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Some text [16] existing content [17] more content [18]' }]
        }
      ],
      _tiptapEditor: {
        state: {
          doc: {
            textContent: 'Some text [16] existing content [17] more content [18]',
            content: { size: 100 },
            descendants: vi.fn((callback) => {
              // Simulate document traversal
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
      },
      replaceBlocks: vi.fn(),
      addStyles: vi.fn(),
      removeStyles: vi.fn()
    };
    return mockEditor;
  })
}));

vi.mock('@blocknote/mantine', () => ({
  BlockNoteView: ({ children }) => <div role="textbox" data-testid="blocknote-editor">{children}</div>
}));

describe('BlockNoteEditor Integration with MarkerReindexingService', () => {
  let mockOnChange;
  let mockOnReferenceUpdate;
  let mockOnReindexing;
  let editorRef;
  let mockEditor;

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockOnReferenceUpdate = vi.fn();
    mockOnReindexing = vi.fn();
    editorRef = React.createRef();
    
    // Create a more complete mock editor
    mockEditor = {
      topLevelBlocks: [
        {
          id: 'block1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Some text [16] existing content [17] more content [18]' }]
        }
      ],
      document: [
        {
          id: 'block1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Some text [16] existing content [17] more content [18]' }]
        }
      ],
      _tiptapEditor: {
        state: {
          doc: {
            textContent: 'Some text [16] existing content [17] more content [18]',
            content: { size: 100 },
            descendants: vi.fn((callback) => {
              // Simulate document traversal
              callback({ isText: true, text: 'Some text [16] existing content [17] more content [18]' }, 0);
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
      },
      replaceBlocks: vi.fn(),
      addStyles: vi.fn(),
      removeStyles: vi.fn()
    };
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Integration Setup', () => {
    it('should accept onReindexing callback as prop', () => {
      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent=""
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      // Component should render without errors
      expect(screen.getByTestId('blocknote-editor')).toBeInTheDocument();
    });

    it('should expose insertTextAtPosition method through ref', async () => {
      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent=""
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
        expect(editorRef.current.insertTextAtPosition).toBeDefined();
        expect(typeof editorRef.current.insertTextAtPosition).toBe('function');
      });
    });
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

      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent="Some text [16] existing content [17] more content [18]"
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      // Wait for editor to be ready
      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });

      // Simulate text insertion between markers
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          await editorRef.current.insertTextAtPosition('[16]', 'New inserted text', 'after', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

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

      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent="Test content [16] [17]"
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });

      // Simulate text insertion that triggers reindexing
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          await editorRef.current.insertTextAtPosition('[16]', 'New text', 'after', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

      // Verify that reindexing was triggered
      expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalled();
      expect(mockOnReindexing).toHaveBeenCalledWith(mockReindexingResult.result.reindexingMap);
    });
  });

  describe('Requirement 2.2: Insertion at Start/End Does Not Trigger Unnecessary Reindexing', () => {
    it('should not trigger reindexing when inserting at the beginning of document', async () => {
      // Mock the service to return null (no reindexing needed)
      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(null);

      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent="Test content [16] [17]"
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });

      // Simulate text insertion at beginning (no search text)
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          await editorRef.current.insertTextAtPosition('', 'New text at beginning', 'after', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

      // Verify that reindexing was not triggered
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalled();
      expect(mockOnReindexing).not.toHaveBeenCalled();
    });

    it('should not trigger reindexing when inserting after the last marker', async () => {
      const mockInsertionContext = {
        needsReindexing: false,
        insertionType: {
          type: 'after_last',
          description: 'Insertion after last marker [18]'
        }
      };

      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);

      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent="Test content [16] [17] [18]"
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });

      // Simulate text insertion after last marker
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          await editorRef.current.insertTextAtPosition('[18]', 'New text after last marker', 'after', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

      // Verify that reindexing was not triggered
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalled();
      expect(MarkerReindexingService.reindexWithErrorHandling).not.toHaveBeenCalled();
      expect(mockOnReindexing).not.toHaveBeenCalled();
    });

    it('should not trigger reindexing when inserting before the first marker', async () => {
      const mockInsertionContext = {
        needsReindexing: false,
        insertionType: {
          type: 'before_first',
          description: 'Insertion before first marker [16]'
        }
      };

      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);

      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent="[16] Test content [17] [18]"
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });

      // Simulate text insertion before first marker
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          await editorRef.current.insertTextAtPosition('', 'New text before first marker', 'before', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

      // Verify that reindexing was not triggered
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalled();
      expect(mockOnReindexing).not.toHaveBeenCalled();
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

      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent="Test content [16] [17] [18]"
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });

      // First insertion
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          await editorRef.current.insertTextAtPosition('[16]', 'First insertion', 'after', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

      // Second insertion
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          await editorRef.current.insertTextAtPosition('[17]', 'Second insertion', 'after', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

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

      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent="Test content [16] [17] [18]"
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });

      // Simulate rapid insertions
      const insertionPromises = [];
      for (let i = 0; i < 3; i++) {
        insertionPromises.push(
          act(async () => {
            if (editorRef.current && editorRef.current.insertTextAtPosition) {
              await editorRef.current.insertTextAtPosition('[16]', `Rapid insertion ${i}`, 'after', mockOnReferenceUpdate, mockOnReindexing);
            }
          })
        );
      }

      await Promise.all(insertionPromises);

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

      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent="Test content [16] [17]"
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });

      // Simulate text insertion that causes reindexing error
      let insertionResult;
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          insertionResult = await editorRef.current.insertTextAtPosition('[16]', 'New text', 'after', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

      // Should still return true (fallback behavior)
      expect(insertionResult).toBe(true);
      
      // onReindexing should not be called when reindexing fails
      expect(mockOnReindexing).not.toHaveBeenCalled();
      
      // But onReferenceUpdate should still be called for fallback
      expect(mockOnReferenceUpdate).toHaveBeenCalled();
      
      // Editor should still be functional
      expect(editorRef.current.insertTextAtPosition).toBeDefined();
    });

    it('should handle detection service errors gracefully', async () => {
      // Mock service to throw error during detection
      MarkerReindexingService.detectInsertionBetweenMarkers.mockImplementation(() => {
        throw new Error('Detection service error');
      });

      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent="Test content [16] [17]"
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });

      // Simulate text insertion that causes detection error
      let insertionResult;
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          insertionResult = await editorRef.current.insertTextAtPosition('[16]', 'New text', 'after', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

      // Should still return true (fallback behavior)
      expect(insertionResult).toBe(true);
      
      // Callbacks should still work for fallback
      expect(mockOnReferenceUpdate).toHaveBeenCalled();
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

      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent="Test content [16] [17]"
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });

      // Simulate text insertion that triggers rollback
      let insertionResult;
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          insertionResult = await editorRef.current.insertTextAtPosition('[16]', 'New text', 'after', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

      // Should still return true even with rollback
      expect(insertionResult).toBe(true);
      
      // Verify rollback was handled
      expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalled();
      expect(mockOnReindexing).not.toHaveBeenCalled();
      
      // Editor should remain functional after rollback
      expect(editorRef.current.insertTextAtPosition).toBeDefined();
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

      render(
        <BlockNoteEditor
          ref={editorRef}
          initialContent="Test content [16] [17]"
          onChange={mockOnChange}
          onReferenceUpdate={mockOnReferenceUpdate}
          onReindexing={mockOnReindexing}
        />
      );

      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });

      // First insertion (should fail)
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          await editorRef.current.insertTextAtPosition('[16]', 'First text', 'after', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

      // Second insertion (should succeed)
      await act(async () => {
        if (editorRef.current && editorRef.current.insertTextAtPosition) {
          await editorRef.current.insertTextAtPosition('[16]', 'Second text', 'after', mockOnReferenceUpdate, mockOnReindexing);
        }
      });

      // Verify both calls were made and second succeeded
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalledTimes(2);
      expect(mockOnReindexing).toHaveBeenCalledTimes(1); // Only second call succeeded
    });
  });
});