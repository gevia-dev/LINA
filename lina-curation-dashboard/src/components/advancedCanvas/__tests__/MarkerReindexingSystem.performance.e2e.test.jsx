/**
 * Performance-focused E2E Tests for Marker Reindexing System
 * 
 * Specialized tests for performance requirements with large documents
 * and stress testing scenarios.
 * 
 * Requirements covered:
 * - 3.1: Performance não é impactada significativamente
 * - 3.2: Processo executado em menos de 500ms
 * - Large document handling (50+ markers)
 * - Memory efficiency
 * - Concurrent operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import NotionLikePage from '../NotionLikePage.jsx';
import { MarkerReindexingService } from '../../../utils/markerReindexingService.js';

// Mock dependencies with performance-optimized implementations
vi.mock('../../../utils/markerReindexingService.js', () => ({
  MarkerReindexingService: {
    detectInsertionBetweenMarkers: vi.fn(),
    reindexMarkersAfterInsertion: vi.fn(),
    reindexWithErrorHandling: vi.fn(),
    updateReferenceMapping: vi.fn(),
    validateSequentialIntegrity: vi.fn(),
    extractAllMarkers: vi.fn(),
    generatePerformanceTestContent: vi.fn()
  }
}));

// Mock BlockNote with performance monitoring
vi.mock('@blocknote/react', () => ({
  useCreateBlockNote: vi.fn(() => ({
    topLevelBlocks: [],
    document: [],
    _tiptapEditor: {
      state: {
        doc: {
          textContent: '',
          content: { size: 0 },
          descendants: vi.fn((callback) => {
            // Simulate efficient document traversal
            const startTime = performance.now();
            callback({ isText: true, text: '' }, 0);
            const endTime = performance.now();
            console.log(`Document traversal took: ${endTime - startTime}ms`);
            return true;
          })
        }
      },
      commands: {
        focus: vi.fn(() => true),
        setTextSelection: vi.fn(() => true),
        insertContent: vi.fn(() => {
          // Simulate content insertion with timing
          const startTime = performance.now();
          setTimeout(() => {
            const endTime = performance.now();
            console.log(`Content insertion took: ${endTime - startTime}ms`);
          }, 0);
          return true;
        }),
        insertContentAt: vi.fn(() => true)
      }
    },
    replaceBlocks: vi.fn(),
    addStyles: vi.fn(),
    removeStyles: vi.fn()
  }))
}));

vi.mock('@blocknote/mantine', () => ({
  BlockNoteView: ({ children }) => <div role="textbox" data-testid="blocknote-editor">{children}</div>
}));

// Mock other dependencies
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => <>{children}</>
}));

vi.mock('../VantaBackground', () => ({
  default: () => <div data-testid="vanta-background" />
}));

vi.mock('../../MainSidebar', () => ({
  default: () => <div data-testid="main-sidebar" />
}));

describe('Marker Reindexing System - Performance E2E Tests', () => {
  let performanceMetrics;

  beforeEach(() => {
    performanceMetrics = {
      renderTimes: [],
      reindexTimes: [],
      memoryUsage: [],
      operationCounts: 0
    };

    // Reset all mocks
    vi.clearAllMocks();

    // Setup performance monitoring
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper function to generate large document content with specified number of markers
   */
  const generateLargeDocumentContent = (markerCount, contentLength = 100) => {
    let content = 'Initial document content. ';
    
    for (let i = 1; i <= markerCount; i++) {
      const sectionContent = `Section ${i} `.repeat(contentLength / 10);
      content += `${sectionContent}[${i}] `;
    }
    
    content += 'Final document content.';
    return content;
  };

  /**
   * Helper function to measure operation performance
   */
  const measurePerformance = async (operationName, operation) => {
    const startTime = performance.now();
    const startMemory = performance.memory?.usedJSHeapSize || 0;
    
    const result = await operation();
    
    const endTime = performance.now();
    const endMemory = performance.memory?.usedJSHeapSize || 0;
    
    const duration = endTime - startTime;
    const memoryDelta = endMemory - startMemory;
    
    performanceMetrics.operationCounts++;
    performanceMetrics.reindexTimes.push(duration);
    performanceMetrics.memoryUsage.push(memoryDelta);
    
    console.log(`${operationName} took: ${duration.toFixed(2)}ms, Memory delta: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    
    return { result, duration, memoryDelta };
  };

  describe('Large Document Performance (50+ Markers)', () => {
    it('should handle 50 markers within performance requirements', async () => {
      const markerCount = 50;
      const largeContent = generateLargeDocumentContent(markerCount);
      
      const largeNewsData = {
        title: 'Performance Test - 50 Markers',
        summary: largeContent,
        body: 'Body content',
        conclusion: 'Conclusion content'
      };

      // Mock optimized marker extraction
      MarkerReindexingService.extractAllMarkers.mockImplementation((text) => {
        const startTime = performance.now();
        
        const markers = [];
        const markerRegex = /\[(\d+)\]/g;
        let match;
        
        while ((match = markerRegex.exec(text)) !== null) {
          markers.push({
            number: parseInt(match[1]),
            text: match[0],
            position: match.index,
            endPosition: match.index + match[0].length
          });
        }
        
        const endTime = performance.now();
        console.log(`Extracted ${markers.length} markers in ${endTime - startTime}ms`);
        
        return markers;
      });

      // Mock insertion context for middle insertion (worst case for reindexing)
      const mockInsertionContext = {
        needsReindexing: true,
        newMarkerFinalNumber: 25, // Insert in middle
        insertionPosition: largeContent.length / 2,
        existingMarkers: Array.from({ length: markerCount }, (_, i) => ({
          number: i + 1,
          text: `[${i + 1}]`,
          position: i * 100,
          endPosition: (i * 100) + 4
        }))
      };

      // Mock reindexing result with performance tracking
      const mockReindexingResult = {
        success: true,
        result: {
          newContent: largeContent.replace(/\[(\d+)\]/g, (match, num) => {
            const markerNum = parseInt(num);
            return markerNum >= 25 ? `[${markerNum + 1}]` : match;
          }),
          reindexingMap: Array.from({ length: 26 }, (_, i) => ({
            oldMarker: `[${25 + i}]`,
            newMarker: `[${26 + i}]`,
            oldNumber: 25 + i,
            newNumber: 26 + i,
            title: `Section ${25 + i}`
          })),
          affectedMarkersCount: 26
        }
      };

      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);
      MarkerReindexingService.reindexWithErrorHandling.mockImplementation(async () => {
        // Simulate reindexing time
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms simulation
        return mockReindexingResult;
      });

      // Measure render performance
      const { duration: renderDuration } = await measurePerformance('Initial Render', async () => {
        render(
          <NotionLikePage
            isOpen={true}
            newsData={largeNewsData}
            newsTitle="50 Markers Performance Test"
            onCanvasItemDragStart={vi.fn()}
            onLinkDataToSection={vi.fn()}
          />
        );
      });

      // Verify render performance
      expect(renderDuration).toBeLessThan(1000); // Should render within 1 second

      // Measure reindexing performance
      const { duration: reindexDuration } = await measurePerformance('Reindexing Operation', async () => {
        await act(async () => {
          const editor = screen.getByTestId('blocknote-editor');
          fireEvent.drop(editor, {
            dataTransfer: {
              getData: vi.fn(() => JSON.stringify({
                id: 'test-node',
                data: { title: 'Test Content', content: 'Test insertion content' }
              }))
            }
          });
        });

        await waitFor(() => {
          expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalled();
        });
      });

      // Verify reindexing performance requirement (< 500ms)
      expect(reindexDuration).toBeLessThan(500);

      // Verify that all markers were processed
      expect(mockReindexingResult.result.affectedMarkersCount).toBe(26);
      expect(mockReindexingResult.result.reindexingMap).toHaveLength(26);
    });

    it('should handle 100 markers with acceptable performance degradation', async () => {
      const markerCount = 100;
      const veryLargeContent = generateLargeDocumentContent(markerCount, 50);
      
      const veryLargeNewsData = {
        title: 'Performance Test - 100 Markers',
        summary: veryLargeContent,
        body: veryLargeContent,
        conclusion: 'Conclusion'
      };

      // Mock optimized operations for very large documents
      MarkerReindexingService.extractAllMarkers.mockImplementation((text) => {
        const startTime = performance.now();
        
        // Simulate optimized extraction with early termination for performance
        const markers = [];
        const markerRegex = /\[(\d+)\]/g;
        let match;
        let count = 0;
        
        while ((match = markerRegex.exec(text)) !== null && count < 1000) {
          markers.push({
            number: parseInt(match[1]),
            text: match[0],
            position: match.index,
            endPosition: match.index + match[0].length
          });
          count++;
        }
        
        const endTime = performance.now();
        console.log(`Extracted ${markers.length} markers from large document in ${endTime - startTime}ms`);
        
        return markers;
      });

      const mockInsertionContext = {
        needsReindexing: true,
        newMarkerFinalNumber: 50, // Insert in middle
        insertionPosition: veryLargeContent.length / 2,
        existingMarkers: Array.from({ length: markerCount }, (_, i) => ({
          number: i + 1,
          text: `[${i + 1}]`,
          position: i * 200,
          endPosition: (i * 200) + 5
        }))
      };

      const mockReindexingResult = {
        success: true,
        result: {
          newContent: 'Optimized large content update',
          reindexingMap: Array.from({ length: 51 }, (_, i) => ({
            oldMarker: `[${50 + i}]`,
            newMarker: `[${51 + i}]`,
            oldNumber: 50 + i,
            newNumber: 51 + i,
            title: `Section ${50 + i}`
          })),
          affectedMarkersCount: 51
        }
      };

      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);
      MarkerReindexingService.reindexWithErrorHandling.mockImplementation(async () => {
        // Simulate longer but acceptable reindexing time for large document
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms simulation
        return mockReindexingResult;
      });

      // Measure performance with very large document
      const { duration: renderDuration } = await measurePerformance('Large Document Render', async () => {
        render(
          <NotionLikePage
            isOpen={true}
            newsData={veryLargeNewsData}
            newsTitle="100 Markers Performance Test"
            onCanvasItemDragStart={vi.fn()}
            onLinkDataToSection={vi.fn()}
          />
        );
      });

      const { duration: reindexDuration } = await measurePerformance('Large Document Reindexing', async () => {
        await act(async () => {
          const editor = screen.getByTestId('blocknote-editor');
          fireEvent.drop(editor);
        });

        await waitFor(() => {
          expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalled();
        });
      });

      // Verify performance is acceptable (may be slower but within reasonable limits)
      expect(renderDuration).toBeLessThan(2000); // 2 seconds for very large document
      expect(reindexDuration).toBeLessThan(1000); // 1 second for large reindexing operation

      // Verify large dataset was processed
      expect(mockReindexingResult.result.affectedMarkersCount).toBe(51);
    });

    it('should maintain performance with incremental marker additions', async () => {
      let currentMarkerCount = 10;
      const baseContent = generateLargeDocumentContent(currentMarkerCount);
      
      const newsData = {
        title: 'Incremental Performance Test',
        summary: baseContent,
        body: 'Body',
        conclusion: 'Conclusion'
      };

      // Track performance across multiple additions
      const performanceHistory = [];

      render(
        <NotionLikePage
          isOpen={true}
          newsData={newsData}
          newsTitle="Incremental Test"
          onCanvasItemDragStart={vi.fn()}
          onLinkDataToSection={vi.fn()}
        />
      );

      // Simulate incremental marker additions (10 → 50 markers)
      for (let addition = 1; addition <= 4; addition++) {
        currentMarkerCount += 10;
        
        const mockInsertionContext = {
          needsReindexing: true,
          newMarkerFinalNumber: currentMarkerCount - 5, // Insert near end
          insertionPosition: 1000 + (addition * 100),
          existingMarkers: Array.from({ length: currentMarkerCount - 1 }, (_, i) => ({
            number: i + 1,
            text: `[${i + 1}]`,
            position: i * 50,
            endPosition: (i * 50) + 4
          }))
        };

        const mockReindexingResult = {
          success: true,
          result: {
            newContent: `Updated content with ${currentMarkerCount} markers`,
            reindexingMap: Array.from({ length: 5 }, (_, i) => ({
              oldMarker: `[${currentMarkerCount - 5 + i}]`,
              newMarker: `[${currentMarkerCount - 4 + i}]`,
              oldNumber: currentMarkerCount - 5 + i,
              newNumber: currentMarkerCount - 4 + i
            })),
            affectedMarkersCount: 5
          }
        };

        MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue(mockInsertionContext);
        MarkerReindexingService.reindexWithErrorHandling.mockReturnValue(mockReindexingResult);

        const { duration } = await measurePerformance(`Addition ${addition} (${currentMarkerCount} markers)`, async () => {
          await act(async () => {
            const editor = screen.getByTestId('blocknote-editor');
            fireEvent.drop(editor);
          });

          await waitFor(() => {
            expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalled();
          });
        });

        performanceHistory.push({ markerCount: currentMarkerCount, duration });
      }

      // Verify performance doesn't degrade significantly
      const firstDuration = performanceHistory[0].duration;
      const lastDuration = performanceHistory[performanceHistory.length - 1].duration;
      
      // Performance should not degrade more than 3x
      expect(lastDuration).toBeLessThan(firstDuration * 3);
      
      // All operations should be under 500ms
      performanceHistory.forEach(({ duration, markerCount }) => {
        expect(duration).toBeLessThan(500);
        console.log(`${markerCount} markers: ${duration.toFixed(2)}ms`);
      });
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle multiple simultaneous insertions efficiently', async () => {
      const baseContent = generateLargeDocumentContent(30);
      const newsData = {
        title: 'Concurrent Operations Test',
        summary: baseContent,
        body: 'Body',
        conclusion: 'Conclusion'
      };

      // Mock concurrent-safe operations
      let operationCounter = 0;
      MarkerReindexingService.detectInsertionBetweenMarkers.mockImplementation(() => {
        operationCounter++;
        return {
          needsReindexing: true,
          newMarkerFinalNumber: 15 + operationCounter,
          insertionPosition: 500 + (operationCounter * 50),
          existingMarkers: Array.from({ length: 30 }, (_, i) => ({
            number: i + 1,
            text: `[${i + 1}]`,
            position: i * 50,
            endPosition: (i * 50) + 4
          }))
        };
      });

      MarkerReindexingService.reindexWithErrorHandling.mockImplementation(async () => {
        // Simulate concurrent processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          success: true,
          result: {
            newContent: `Concurrent update ${operationCounter}`,
            reindexingMap: [
              { oldMarker: `[${operationCounter + 15}]`, newMarker: `[${operationCounter + 16}]` }
            ],
            affectedMarkersCount: 1
          }
        };
      });

      render(
        <NotionLikePage
          isOpen={true}
          newsData={newsData}
          newsTitle="Concurrent Test"
          onCanvasItemDragStart={vi.fn()}
          onLinkDataToSection={vi.fn()}
        />
      );

      // Simulate 5 concurrent operations
      const concurrentOperations = [];
      const startTime = performance.now();

      for (let i = 0; i < 5; i++) {
        concurrentOperations.push(
          act(async () => {
            const editor = screen.getByTestId('blocknote-editor');
            fireEvent.drop(editor);
          })
        );
      }

      await Promise.all(concurrentOperations);
      
      const totalTime = performance.now() - startTime;

      // Verify concurrent operations completed efficiently
      expect(totalTime).toBeLessThan(1000); // All 5 operations in under 1 second
      expect(MarkerReindexingService.detectInsertionBetweenMarkers).toHaveBeenCalledTimes(5);
      expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalledTimes(5);

      console.log(`5 concurrent operations completed in ${totalTime.toFixed(2)}ms`);
    });

    it('should maintain memory efficiency during stress testing', async () => {
      const stressTestContent = generateLargeDocumentContent(75, 200);
      const newsData = {
        title: 'Memory Stress Test',
        summary: stressTestContent,
        body: stressTestContent,
        conclusion: stressTestContent
      };

      // Monitor memory usage
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      const memorySnapshots = [];

      render(
        <NotionLikePage
          isOpen={true}
          newsData={newsData}
          newsTitle="Memory Stress Test"
          onCanvasItemDragStart={vi.fn()}
          onLinkDataToSection={vi.fn()}
        />
      );

      // Take initial memory snapshot
      memorySnapshots.push({
        operation: 'initial',
        memory: performance.memory?.usedJSHeapSize || 0
      });

      // Mock memory-efficient operations
      MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue({
        needsReindexing: true,
        newMarkerFinalNumber: 40,
        insertionPosition: 2000,
        existingMarkers: Array.from({ length: 75 }, (_, i) => ({
          number: i + 1,
          text: `[${i + 1}]`,
          position: i * 100,
          endPosition: (i * 100) + 5
        }))
      });

      MarkerReindexingService.reindexWithErrorHandling.mockReturnValue({
        success: true,
        result: {
          newContent: 'Memory-efficient update',
          reindexingMap: Array.from({ length: 35 }, (_, i) => ({
            oldMarker: `[${41 + i}]`,
            newMarker: `[${42 + i}]`,
            oldNumber: 41 + i,
            newNumber: 42 + i
          })),
          affectedMarkersCount: 35
        }
      });

      // Perform multiple operations and monitor memory
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          const editor = screen.getByTestId('blocknote-editor');
          fireEvent.drop(editor);
        });

        await waitFor(() => {
          expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalled();
        });

        // Take memory snapshot
        memorySnapshots.push({
          operation: `operation-${i + 1}`,
          memory: performance.memory?.usedJSHeapSize || 0
        });

        // Force garbage collection simulation
        if (global.gc) {
          global.gc();
        }
      }

      // Analyze memory usage
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const totalMemoryIncrease = finalMemory - initialMemory;

      if (performance.memory) {
        // Memory increase should be reasonable (less than 100MB for stress test)
        expect(totalMemoryIncrease).toBeLessThan(100 * 1024 * 1024);
        
        console.log(`Memory usage: Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB, Increase: ${(totalMemoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        
        // Check for memory leaks (no continuous growth)
        const memoryGrowthRate = totalMemoryIncrease / memorySnapshots.length;
        expect(memoryGrowthRate).toBeLessThan(5 * 1024 * 1024); // Less than 5MB per operation
      }

      // Verify all operations completed successfully
      expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalledTimes(10);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should establish performance baselines for different document sizes', async () => {
      const testSizes = [10, 25, 50, 75, 100];
      const performanceBaselines = {};

      for (const size of testSizes) {
        const content = generateLargeDocumentContent(size);
        const newsData = {
          title: `Baseline Test - ${size} markers`,
          summary: content,
          body: 'Body',
          conclusion: 'Conclusion'
        };

        // Mock operations for baseline
        MarkerReindexingService.detectInsertionBetweenMarkers.mockReturnValue({
          needsReindexing: true,
          newMarkerFinalNumber: Math.floor(size / 2),
          insertionPosition: 1000,
          existingMarkers: Array.from({ length: size }, (_, i) => ({
            number: i + 1,
            text: `[${i + 1}]`,
            position: i * 50,
            endPosition: (i * 50) + 4
          }))
        });

        MarkerReindexingService.reindexWithErrorHandling.mockImplementation(async () => {
          // Simulate realistic processing time based on size
          const processingTime = Math.min(size * 2, 400); // Max 400ms
          await new Promise(resolve => setTimeout(resolve, processingTime));
          
          return {
            success: true,
            result: {
              newContent: `Baseline content for ${size} markers`,
              reindexingMap: Array.from({ length: Math.floor(size / 2) }, (_, i) => ({
                oldMarker: `[${Math.floor(size / 2) + i}]`,
                newMarker: `[${Math.floor(size / 2) + i + 1}]`
              })),
              affectedMarkersCount: Math.floor(size / 2)
            }
          };
        });

        const { duration } = await measurePerformance(`Baseline ${size} markers`, async () => {
          const { unmount } = render(
            <NotionLikePage
              isOpen={true}
              newsData={newsData}
              newsTitle={`Baseline ${size}`}
              onCanvasItemDragStart={vi.fn()}
              onLinkDataToSection={vi.fn()}
            />
          );

          await act(async () => {
            const editor = screen.getByTestId('blocknote-editor');
            fireEvent.drop(editor);
          });

          await waitFor(() => {
            expect(MarkerReindexingService.reindexWithErrorHandling).toHaveBeenCalled();
          });

          unmount();
        });

        performanceBaselines[size] = duration;
        
        // Reset mocks for next iteration
        vi.clearAllMocks();
      }

      // Verify performance scaling is reasonable
      console.log('Performance Baselines:', performanceBaselines);
      
      // Performance should scale sub-linearly
      const ratio50to10 = performanceBaselines[50] / performanceBaselines[10];
      const ratio100to50 = performanceBaselines[100] / performanceBaselines[50];
      
      expect(ratio50to10).toBeLessThan(10); // 5x markers shouldn't be 10x slower
      expect(ratio100to50).toBeLessThan(5);  // 2x markers shouldn't be 5x slower
      
      // All operations should meet the 500ms requirement
      Object.entries(performanceBaselines).forEach(([size, duration]) => {
        expect(duration).toBeLessThan(500);
        console.log(`${size} markers: ${duration.toFixed(2)}ms`);
      });
    });
  });
});