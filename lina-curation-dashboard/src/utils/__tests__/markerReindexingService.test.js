/**
 * Testes unitários para MarkerReindexingService
 * Foco no algoritmo de reindexação sequencial (Task 3)
 */

import { describe, test, expect, beforeEach } from 'vitest';
import MarkerReindexingService from '../markerReindexingService.js';

describe('MarkerReindexingService - Sequential Reindexing Algorit () => {
  
  describe('generateSequentialReindexin=> {
    test('deve gerar mapeamento correto para inserção entre marc
      // Cenário: inserção entre [16] e [17]
      const existingMarkers = [
      
        { number: 17, text: '[17]', po },
        { number: 18, text: '[18]': 304 }
      ];
      
      const insertio[17]
      const newMarkerNel
      
      const result = MarkerReindexap(
        existingMa
        insertionPoson, 
        newMarkerNumber
      );
      
      expect(result).toHaveLength(xados
      
      // Verificar mdor
      const newMarker
      expect(newMarkerMual({
        o]',
       
    
        newNumber: 17,
        isNewMarker: true,
        position: insertionPosition
      });
      
      // Verificar mapeamento dos marcadores existentes
      const existingMappings = result.fier);
      expect(existingMappings).toHaveLen
      
      el({
    ]',
        newMarker: '[18]',
        oldNumber: 17,
        newNumber: 18,
       200,
        isExistingMarker: true
      });
      
      expect(existingMappings[1]).toEqual({
        oldMarker: '[18]',
        newMarker: '[19]',
      18,
        newNumber: 19,
        position: 300,
        isExistingMarker: true
      });
    
    
    test('deve retornar array vazio quando inserção
      const existingMarkers = [
      ,
        { number: 17, text: '[17]', po04 }
      ];
      
    r
      const newMarkerNumber = 18;
      
      const result = MarkerReindexingService.generateSequentialReindexingMap(
        existingMarkers, 
       on, 
     
  ;
      
      expect(res
    );
    
    test('deve reindexar todos os marcadores quando inserção {
      const exist
        { number: 1, text: '[1]', position: 100, endPosition: 103 
        { number: 2, text: '[2]', position: 200, endPosition: 203 
        { number: 3, text: '[3]', position: 300, endPosition: 303 }
      ];
      
    cador
      const newMarkerNumber = 4;
      
      Map(
        existingMarkers, 
        insertionPosition, 
        newMarkerNumber
      );
      
      e
    
      // Novo marcador deve ser [1]
      const newMarkerMapping = result.find(m => m.isNewMarker);
      ;
      
      // Marcadores existentes devem ser increme
      const existingMappings = result.filter(m => m.iser);
      expect(existingMappings[0].oldNumber).toBe(1);
      expect(existingMappings[0].newNumber).toBe(2);
      e);
    
      expect(existingMappings[2].oldNumber).toBe(3);
      expect(existingMappings[2].newNumber).toBe(4);
    });
  });
  
  describe('generateReindexedContent', () => {
    test('deve gerar conteúdo com marcadores
      c fim';
    = [
        { oldMarker: '[17]', newMarker: '[18]', oldNumber: 17
        { oldMarker: '[18]', newMarker: '[19]', oldNumber: 18, newNumber: 19 }
      
      
      const result = MarkerReindexingService.genent(
        originalContent, 
        reindexingMap
      );
      
    (true);
      expect(result.newContent).toBe('Texto [16] meio [18] f');
      expect(result.replacements).toBe(2);
      h(2);
    });
    
    tes) => {
     fim';
  [
        { oldMarker: '[1]', newMarker: '[2]', 2 },
        { oldMar
     }
      ];
      
      const result = MarkerReindexingService.generateReindexedCont
        originalContent, 
        reindexingMap
      );
      
    );
      expect(result.newContent).toBe('Texto [2] meio [3] final [4] fim');
      expect(result.replaceme(3);
    });
    
    test('deve retornar conteúdo
      co
      [];
      
      (
        originalContent, 
        reindexingMap
      );
      
      expect(result.success).toBe(true);
      et);
    
    });
    
    test('deve lidar com marcado
      const originalContent = ]';
      const reindexingMap = [
        4 }
      ;
      
      t(
        originalContent, 
        reindexingMap
      );
      
      expect(result.success).toBe(true);
      e;
    e(0);
      expect(result.processedMarkers[0].processed).toBe(false);
      expect(result.processed);
    });
  });
  
  desc
    test('deve validar sequência correta', () => {
      ;
      
      const result = MarkerReindexingService.validcontent);
      
     Be(true);
  ngth(0);
      expect(result.markerCount).toBe(3);
      expect(result.sequence).toEqual([1, 2, 3]);
      expect(result.gaps).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
    });
    
    test('deve detectar marcadores duplicados', () => {
      fim';
      
      const result = MarkerReindexingService.vali
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Marcador [2;
      expect(result.duplicates).toEqual([2]);
    });
    
    test('deve detectar gaps na sequência', () => {
      const content = 'Texto [1] meio [3] final [5] 
      
      const result = MarkerReit);
      
      expect(result.isValid).toBe(false);
      th(2);
      expect(result.gaps[0].missing).;
      expect(result.gaps[1].missing).toEqual([4])
    });
    
    test('deve detectar sequência que não começa e {
      const content = 'Texto [2] meio [3] final ';
      
    
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sequência deve começar em );
      expect(result.firstMarkeoBe(2);
    });
    
    te => {
      const content = 'Texto [1] im';
      
    lse);
      
      expect(result.isValid).toBe(true); // N
      expect(result.warnings.length
    });
    
    test('deve retornar válido para conteúdo sem marcadores', () => {
      res';
      
      cnt);
    
      expect(result.isValid).toBe(true);
      expect(result.markerCount).toBe(0);
      expect(result.message).toBe('Nenhum marcador enc');
    });
  });
  
  desc => {
    test('deve executar reindexação s {
      const editorContent = 'Texto [16] meio [17]] fim';
      const insertionContext = {
       
    19,
        needsReindexing: true,
        existingMarkers: [
          { number: 16, text: '[16]},
          { number: 17, text: '[174 },
      }
        ]
      };
      
      cn(
    Content, 
        insertionContext
      );
      
      rue);
      expect(result.newContent).tom');
      expect(result.reindexingMap)
      e
     e);
  );
    
    test('deve retornar sucesso quando não há reindexação necessária
      const editorContent = 'Texto [1] [2] [3]';
      const insertionContext = {
        insertionPosition: 400,
      
        needsReindexing: false,
      : []
      };
      
      c
    ent, 
        insertionContext
      );
      
      expect(result.success).toBe;
      
      expect(result.reindexingMap).toHaveLength(0);
      
    });
    
    test('deve retornar null para parâmetros inválidos=> {
      c);
    
    });
  });
  
  describe('Integração com validate {
    tes) => {
      const content = '
      
      const result = MarkerReindexingService.validateMarkerSequence(content);
      
      ;
      expect(result.errors).toHaveLength(0);
      (3);
      expect(result.sequence).toEqual
      
      // Verificar campos adicionais do novo método
      e();
     ();
   ;});
})  });
  );
  ined(s).toBeDefplicatet(result.du  expec 