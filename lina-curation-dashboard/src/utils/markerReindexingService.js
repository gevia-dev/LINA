/**
 * MarkerReindexingService - Sistema automático de reindexação de marcadores
 * 
 * Este serviço detecta quando texto é inserido entre marcadores existentes
 * e executa reindexação automática para manter a integridade da sequência numérica.
 * 
 * Funcionalidades principais:
 * - Detectar inserções entre marcadores existentes
 * - Executar reindexação automática de marcadores subsequentes
 * - Atualizar referenceMapping para manter sincronização título ↔ marcador
 * - Aplicar mudanças no editor de forma segura
 */

/**
 * Estrutura de dados para contexto de inserção
 * @typedef {Object} InsertionContext
 * @property {number} insertionPosition - Posição onde texto foi inserido
 * @property {string} newMarker - Novo marcador gerado
 * @property {number} newMarkerNumber - Número do novo marcador
 * @property {Array} existingMarkers - Marcadores existentes no texto
 * @property {boolean} needsReindexing - Se reindexação é necessária
 * @property {Object} affectedRange - Range de marcadores afetados
 * @property {Object} insertionType - Tipo de inserção detectada
 * @property {Array} markersToReindex - Lista específica de marcadores que precisam ser reindexados
 */

/**
 * Estrutura de dados para marcador extraído
 * @typedef {Object} ExtractedMarker
 * @property {number} number - Número do marcador
 * @property {string} text - Texto completo do marcador (ex: "[17]")
 * @property {number} position - Posição no texto onde o marcador foi encontrado
 * @property {number} endPosition - Posição final do marcador no texto
 */

/**
 * Estrutura de dados para mapeamento de reindexação
 * @typedef {Object} ReindexingMap
 * @property {string} oldMarker - Marcador antigo (ex: "[17]")
 * @property {string} newMarker - Marcador novo (ex: "[18]")
 * @property {string} title - Título do conteúdo
 * @property {number} position - Posição no texto
 */

/**
 * Estrutura de dados para backup do estado
 * @typedef {Object} StateBackup
 * @property {string} originalContent - Conteúdo original do editor
 * @property {Map} originalReferenceMapping - Mapeamento original título ↔ marcador
 * @property {number} cursorPosition - Posição original do cursor
 * @property {number} timestamp - Timestamp do backup
 * @property {string} operationId - ID único da operação
 * @property {Object} editorState - Estado adicional do editor
 */

/**
 * Estrutura de dados para resultado de operação com rollback
 * @typedef {Object} RollbackableResult
 * @property {boolean} success - Se a operação foi bem-sucedida
 * @property {*} result - Resultado da operação (se sucesso)
 * @property {Error} error - Erro ocorrido (se falha)
 * @property {StateBackup} backup - Backup do estado para rollback
 * @property {Function} rollback - Função para reverter a operação
 * @property {Object} validation - Resultado da validação pós-operação
 */

export class MarkerReindexingService {
  
  /**
   * Extrai todos os marcadores [n] de um texto
   * @param {string} text - Texto para extrair marcadores
   * @returns {Array<ExtractedMarker>} Array de marcadores extraídos
   */
  static extractAllMarkers(text) {
    try {
      console.log('🔍 Extraindo todos os marcadores do texto');
      
      if (!text || typeof text !== 'string') {
        console.log('❌ Texto inválido para extração de marcadores');
        return [];
      }
      
      const markerRegex = /\[(\d+)\]/g;
      const extractedMarkers = [];
      let match;
      
      while ((match = markerRegex.exec(text)) !== null) {
        const markerNumber = parseInt(match[1]);
        const markerText = match[0]; // "[n]"
        const startPosition = match.index;
        const endPosition = match.index + match[0].length;
        
        extractedMarkers.push({
          number: markerNumber,
          text: markerText,
          position: startPosition,
          endPosition: endPosition
        });
      }
      
      // Ordenar marcadores por posição no texto
      extractedMarkers.sort((a, b) => a.position - b.position);
      
      console.log(`📊 ${extractedMarkers.length} marcadores extraídos:`);
      extractedMarkers.forEach((marker, index) => {
        console.log(`  ${index + 1}. ${marker.text} (número: ${marker.number}, posição: ${marker.position}-${marker.endPosition})`);
      });
      
      return extractedMarkers;
      
    } catch (error) {
      console.error('❌ Erro ao extrair marcadores:', error);
      return [];
    }
  }
  
  /**
   * Determina posição de inserção relativa aos marcadores existentes
   * @param {number} insertionPosition - Posição onde texto foi inserido
   * @param {Array<ExtractedMarker>} existingMarkers - Marcadores existentes ordenados por posição
   * @returns {Object} Informações sobre a posição relativa da inserção
   */
  static determineInsertionPosition(insertionPosition, existingMarkers) {
    try {
      console.log(`🎯 Determinando posição relativa da inserção na posição ${insertionPosition}`);
      
      if (!existingMarkers || existingMarkers.length === 0) {
        return {
          type: 'no_markers',
          description: 'Nenhum marcador existente',
          beforeMarker: null,
          afterMarker: null,
          needsReindexing: false
        };
      }
      
      // Verificar se inserção ocorreu antes do primeiro marcador
      const firstMarker = existingMarkers[0];
      if (insertionPosition < firstMarker.position) {
        console.log(`📍 Inserção antes do primeiro marcador ${firstMarker.text}`);
        return {
          type: 'before_first',
          description: `Inserção antes do primeiro marcador ${firstMarker.text}`,
          beforeMarker: null,
          afterMarker: firstMarker,
          needsReindexing: true,
          affectedMarkers: existingMarkers // Todos os marcadores precisam ser reindexados
        };
      }
      
      // Verificar se inserção ocorreu após o último marcador
      const lastMarker = existingMarkers[existingMarkers.length - 1];
      if (insertionPosition > lastMarker.endPosition) {
        console.log(`📍 Inserção após o último marcador ${lastMarker.text}`);
        return {
          type: 'after_last',
          description: `Inserção após o último marcador ${lastMarker.text}`,
          beforeMarker: lastMarker,
          afterMarker: null,
          needsReindexing: false
        };
      }
      
      // Verificar se inserção ocorreu entre dois marcadores
      for (let i = 0; i < existingMarkers.length - 1; i++) {
        const currentMarker = existingMarkers[i];
        const nextMarker = existingMarkers[i + 1];
        
        if (insertionPosition > currentMarker.endPosition && insertionPosition < nextMarker.position) {
          console.log(`📍 Inserção entre ${currentMarker.text} e ${nextMarker.text}`);
          
          // Marcadores que precisam ser reindexados (a partir do próximo marcador)
          const affectedMarkers = existingMarkers.slice(i + 1);
          
          return {
            type: 'between_markers',
            description: `Inserção entre ${currentMarker.text} e ${nextMarker.text}`,
            beforeMarker: currentMarker,
            afterMarker: nextMarker,
            needsReindexing: true,
            affectedMarkers: affectedMarkers
          };
        }
      }
      
      // Verificar se inserção ocorreu dentro de um marcador (caso edge)
      for (const marker of existingMarkers) {
        if (insertionPosition >= marker.position && insertionPosition <= marker.endPosition) {
          console.log(`⚠️ Inserção dentro do marcador ${marker.text} - caso especial`);
          return {
            type: 'inside_marker',
            description: `Inserção dentro do marcador ${marker.text}`,
            beforeMarker: marker,
            afterMarker: marker,
            needsReindexing: false, // Não reindexar se inserção for dentro do marcador
            warning: 'Inserção dentro de marcador pode causar problemas'
          };
        }
      }
      
      console.log('❓ Posição de inserção não classificada - assumindo sem reindexação');
      return {
        type: 'unclassified',
        description: 'Posição de inserção não classificada',
        beforeMarker: null,
        afterMarker: null,
        needsReindexing: false
      };
      
    } catch (error) {
      console.error('❌ Erro ao determinar posição de inserção:', error);
      return {
        type: 'error',
        description: 'Erro ao determinar posição',
        needsReindexing: false,
        error: error.message
      };
    }
  }
  
  /**
   * Identifica range de marcadores que precisam ser reindexados
   * @param {Array<ExtractedMarker>} existingMarkers - Marcadores existentes
   * @param {Object} insertionInfo - Informações sobre a posição de inserção
   * @param {number} newMarkerNumber - Número do novo marcador
   * @returns {Object} Range de marcadores para reindexação
   */
  static identifyReindexingRange(existingMarkers, insertionInfo, newMarkerNumber) {
    try {
      console.log('📊 Identificando range de marcadores para reindexação');
      
      if (!insertionInfo.needsReindexing) {
        console.log('ℹ️ Reindexação não necessária');
        return {
          needsReindexing: false,
          startNumber: null,
          endNumber: null,
          markersToReindex: [],
          newMarkerFinalNumber: newMarkerNumber
        };
      }
      
      const { type, affectedMarkers } = insertionInfo;
      
      if (!affectedMarkers || affectedMarkers.length === 0) {
        console.log('ℹ️ Nenhum marcador afetado');
        return {
          needsReindexing: false,
          startNumber: null,
          endNumber: null,
          markersToReindex: [],
          newMarkerFinalNumber: newMarkerNumber
        };
      }
      
      // Determinar números inicial e final do range
      const markerNumbers = affectedMarkers.map(m => m.number).sort((a, b) => a - b);
      const startNumber = Math.min(...markerNumbers);
      const endNumber = Math.max(...markerNumbers);
      
      // Determinar número final correto para o novo marcador
      let newMarkerFinalNumber;
      
      if (type === 'before_first') {
        // Novo marcador deve ser [1], todos os outros incrementam
        newMarkerFinalNumber = 1;
      } else if (type === 'between_markers') {
        // Novo marcador deve ocupar a posição do próximo marcador
        newMarkerFinalNumber = startNumber;
      } else {
        // Manter número original se não há conflito
        newMarkerFinalNumber = newMarkerNumber;
      }
      
      console.log(`📊 Range identificado:`);
      console.log(`  - Tipo de inserção: ${type}`);
      console.log(`  - Marcadores afetados: ${markerNumbers.join(', ')}`);
      console.log(`  - Range numérico: ${startNumber} até ${endNumber}`);
      console.log(`  - Novo marcador: [${newMarkerNumber}] -> [${newMarkerFinalNumber}]`);
      
      return {
        needsReindexing: true,
        startNumber,
        endNumber,
        markersToReindex: affectedMarkers,
        newMarkerFinalNumber,
        insertionType: type,
        totalAffected: affectedMarkers.length
      };
      
    } catch (error) {
      console.error('❌ Erro ao identificar range de reindexação:', error);
      return {
        needsReindexing: false,
        error: error.message
      };
    }
  }
  
  /**
   * Detecta se inserção ocorreu entre marcadores existentes
   * @param {string} editorContent - Conteúdo atual do editor
   * @param {number} insertionPosition - Posição onde texto foi inserido
   * @param {string} newMarker - Novo marcador gerado (ex: "[18]")
   * @returns {InsertionContext|null} Contexto da inserção ou null se não precisa reindexar
   */
  static detectInsertionBetweenMarkers(editorContent, insertionPosition, newMarker) {
    try {
      console.log('🔍 MarkerReindexingService - Detectando inserção entre marcadores');
      console.log(`📍 Posição de inserção: ${insertionPosition}, Novo marcador: ${newMarker}`);
      
      if (!editorContent || typeof editorContent !== 'string') {
        console.log('❌ Conteúdo do editor inválido');
        return null;
      }
      
      // Extrair número do novo marcador
      const newMarkerMatch = newMarker.match(/\[(\d+)\]/);
      if (!newMarkerMatch) {
        console.log('❌ Formato de marcador inválido:', newMarker);
        return null;
      }
      
      const newMarkerNumber = parseInt(newMarkerMatch[1]);
      console.log(`🔢 Número do novo marcador: ${newMarkerNumber}`);
      
      // 1. Extrair todos os marcadores existentes no texto
      const existingMarkers = this.extractAllMarkers(editorContent);
      
      if (existingMarkers.length === 0) {
        console.log('ℹ️ Nenhum marcador existente - reindexação não necessária');
        return null;
      }
      
      // 2. Determinar posição de inserção relativa aos marcadores existentes
      const insertionInfo = this.determineInsertionPosition(insertionPosition, existingMarkers);
      
      if (!insertionInfo.needsReindexing) {
        console.log(`ℹ️ ${insertionInfo.description} - reindexação não necessária`);
        return null;
      }
      
      // 3. Identificar range de marcadores que precisam ser reindexados
      const reindexingRange = this.identifyReindexingRange(existingMarkers, insertionInfo, newMarkerNumber);
      
      if (!reindexingRange.needsReindexing) {
        console.log('ℹ️ Range de reindexação vazio - reindexação não necessária');
        return null;
      }
      
      // 4. Criar estrutura InsertionContext completa
      const insertionContext = {
        insertionPosition,
        newMarker,
        newMarkerNumber,
        existingMarkers,
        needsReindexing: true,
        affectedRange: {
          start: reindexingRange.startNumber,
          end: reindexingRange.endNumber
        },
        insertionType: {
          type: insertionInfo.type,
          description: insertionInfo.description,
          beforeMarker: insertionInfo.beforeMarker,
          afterMarker: insertionInfo.afterMarker
        },
        markersToReindex: reindexingRange.markersToReindex,
        newMarkerFinalNumber: reindexingRange.newMarkerFinalNumber,
        totalAffectedMarkers: reindexingRange.totalAffected
      };
      
      console.log('✅ Contexto de inserção completo criado:');
      console.log(`  - Tipo: ${insertionContext.insertionType.type}`);
      console.log(`  - Descrição: ${insertionContext.insertionType.description}`);
      console.log(`  - Marcadores a reindexar: ${insertionContext.totalAffectedMarkers}`);
      console.log(`  - Range afetado: [${insertionContext.affectedRange.start}] até [${insertionContext.affectedRange.end}]`);
      console.log(`  - Novo marcador: [${newMarkerNumber}] -> [${insertionContext.newMarkerFinalNumber}]`);
      
      return insertionContext;
      
    } catch (error) {
      console.error('❌ Erro ao detectar inserção entre marcadores:', error);
      return null;
    }
  }
  
  /**
   * Implementa lógica para reindexar apenas marcadores >= posição de inserção
   * @param {Array<ExtractedMarker>} existingMarkers - Marcadores existentes ordenados
   * @param {number} insertionPosition - Posição onde texto foi inserido
   * @param {number} newMarkerNumber - Número do novo marcador
   * @returns {Array<ReindexingMap>} Array com mapeamento de reindexação
   */
  static generateSequentialReindexingMap(existingMarkers, insertionPosition, newMarkerNumber) {
    try {
      console.log('🔢 Gerando mapeamento sequencial de reindexação');
      console.log(`📍 Posição de inserção: ${insertionPosition}, Novo marcador: [${newMarkerNumber}]`);
      
      if (!existingMarkers || existingMarkers.length === 0) {
        console.log('ℹ️ Nenhum marcador existente para reindexar');
        return [];
      }
      
      const reindexingMap = [];
      
      // Encontrar marcadores que precisam ser reindexados (>= posição de inserção)
      const markersToReindex = existingMarkers.filter(marker => {
        // Marcadores que estão na posição de inserção ou depois dela
        return marker.position >= insertionPosition;
      });
      
      console.log(`📊 ${markersToReindex.length} marcadores precisam ser reindexados`);
      
      if (markersToReindex.length === 0) {
        console.log('ℹ️ Nenhum marcador >= posição de inserção');
        return [];
      }
      
      // Ordenar marcadores por número para garantir sequência correta
      markersToReindex.sort((a, b) => a.number - b.number);
      
      // Determinar o número inicial correto para o novo marcador
      const firstMarkerToReindex = markersToReindex[0];
      const newMarkerFinalNumber = firstMarkerToReindex.number;
      
      console.log(`🎯 Novo marcador [${newMarkerNumber}] será reindexado para [${newMarkerFinalNumber}]`);
      
      // Adicionar mapeamento para o novo marcador se necessário
      if (newMarkerNumber !== newMarkerFinalNumber) {
        reindexingMap.push({
          oldMarker: `[${newMarkerNumber}]`,
          newMarker: `[${newMarkerFinalNumber}]`,
          oldNumber: newMarkerNumber,
          newNumber: newMarkerFinalNumber,
          isNewMarker: true,
          position: insertionPosition
        });
      }
      
      // Gerar mapeamento para marcadores existentes (incrementar em 1)
      markersToReindex.forEach((marker, index) => {
        const oldNumber = marker.number;
        const newNumber = marker.number + 1; // Incrementar em 1
        
        reindexingMap.push({
          oldMarker: `[${oldNumber}]`,
          newMarker: `[${newNumber}]`,
          oldNumber,
          newNumber,
          position: marker.position,
          isExistingMarker: true
        });
        
        console.log(`🔄 Mapeamento: [${oldNumber}] -> [${newNumber}] (posição: ${marker.position})`);
      });
      
      console.log(`✅ Mapeamento sequencial gerado: ${reindexingMap.length} entradas`);
      return reindexingMap;
      
    } catch (error) {
      console.error('❌ Erro ao gerar mapeamento sequencial:', error);
      return [];
    }
  }
  
  /**
   * Cria função para gerar novo conteúdo com marcadores reindexados
   * @param {string} originalContent - Conteúdo original
   * @param {Array<ReindexingMap>} reindexingMap - Mapeamento de reindexação
   * @returns {Object} Resultado com novo conteúdo e estatísticas
   */
  static generateReindexedContent(originalContent, reindexingMap) {
    try {
      console.log('📝 Gerando novo conteúdo com marcadores reindexados');
      
      if (!originalContent || typeof originalContent !== 'string') {
        console.error('❌ Conteúdo original inválido');
        return { success: false, error: 'Conteúdo inválido' };
      }
      
      if (!reindexingMap || !Array.isArray(reindexingMap) || reindexingMap.length === 0) {
        console.log('ℹ️ Nenhuma reindexação necessária');
        return { 
          success: true, 
          newContent: originalContent, 
          replacements: 0,
          processedMarkers: []
        };
      }
      
      let newContent = originalContent;
      const processedMarkers = [];
      let totalReplacements = 0;
      
      // Processar mapeamentos em ordem decrescente de número antigo para evitar conflitos
      const sortedMap = [...reindexingMap].sort((a, b) => b.oldNumber - a.oldNumber);
      
      console.log(`🔄 Processando ${sortedMap.length} mapeamentos em ordem decrescente`);
      
      sortedMap.forEach((mapping, index) => {
        const { oldMarker, newMarker, oldNumber, newNumber } = mapping;
        
        console.log(`🔄 [${index + 1}/${sortedMap.length}] Processando: ${oldMarker} -> ${newMarker}`);
        
        // Criar regex para substituição exata do marcador
        const regex = new RegExp(`\\[${oldNumber}\\]`, 'g');
        const beforeReplace = newContent;
        
        // Realizar substituição
        newContent = newContent.replace(regex, newMarker);
        
        // Contar substituições realizadas
        const replacements = (beforeReplace.match(regex) || []).length;
        totalReplacements += replacements;
        
        if (replacements > 0) {
          console.log(`✅ ${replacements} ocorrência(s) de ${oldMarker} substituída(s) por ${newMarker}`);
          
          processedMarkers.push({
            ...mapping,
            replacements,
            processed: true
          });
        } else {
          console.warn(`⚠️ Nenhuma ocorrência encontrada para ${oldMarker}`);
          
          processedMarkers.push({
            ...mapping,
            replacements: 0,
            processed: false,
            warning: 'Marcador não encontrado no conteúdo'
          });
        }
      });
      
      console.log(`✅ Conteúdo reindexado gerado. Total de substituições: ${totalReplacements}`);
      
      return {
        success: true,
        newContent,
        replacements: totalReplacements,
        processedMarkers,
        originalLength: originalContent.length,
        newLength: newContent.length
      };
      
    } catch (error) {
      console.error('❌ Erro ao gerar conteúdo reindexado:', error);
      return { 
        success: false, 
        error: error.message,
        newContent: originalContent 
      };
    }
  }
  
  /**
   * Adiciona validação para garantir sequência numérica correta
   * @param {string} content - Conteúdo para validar
   * @param {boolean} strictMode - Se deve usar validação rigorosa
   * @returns {Object} Resultado detalhado da validação
   */
  static validateSequentialIntegrity(content, strictMode = true) {
    try {
      console.log('🔍 Validando integridade sequencial dos marcadores');
      
      if (!content || typeof content !== 'string') {
        return {
          isValid: false,
          errors: ['Conteúdo inválido para validação'],
          warnings: [],
          markerCount: 0,
          sequence: [],
          gaps: [],
          duplicates: []
        };
      }
      
      // Extrair todos os marcadores
      const markerRegex = /\[(\d+)\]/g;
      const foundMarkers = [];
      let match;
      
      while ((match = markerRegex.exec(content)) !== null) {
        foundMarkers.push({
          number: parseInt(match[1]),
          text: match[0],
          position: match.index
        });
      }
      
      if (foundMarkers.length === 0) {
        return {
          isValid: true,
          errors: [],
          warnings: [],
          markerCount: 0,
          sequence: [],
          gaps: [],
          duplicates: [],
          message: 'Nenhum marcador encontrado'
        };
      }
      
      // Ordenar marcadores por número
      const sortedMarkers = foundMarkers.sort((a, b) => a.number - b.number);
      const markerNumbers = sortedMarkers.map(m => m.number);
      
      console.log(`📊 ${foundMarkers.length} marcadores encontrados: [${markerNumbers.join(', ')}]`);
      
      const errors = [];
      const warnings = [];
      const gaps = [];
      const duplicates = [];
      
      // Verificar duplicatas
      const numberCounts = {};
      markerNumbers.forEach(num => {
        numberCounts[num] = (numberCounts[num] || 0) + 1;
      });
      
      Object.entries(numberCounts).forEach(([num, count]) => {
        if (count > 1) {
          duplicates.push(parseInt(num));
          errors.push(`Marcador [${num}] aparece ${count} vezes`);
        }
      });
      
      // Verificar se sequência começa em 1
      const firstMarker = Math.min(...markerNumbers);
      if (strictMode && firstMarker !== 1) {
        if (firstMarker > 1) {
          errors.push(`Sequência deve começar em [1], mas começa em [${firstMarker}]`);
        } else {
          errors.push(`Marcador inválido [${firstMarker}] - números devem ser >= 1`);
        }
      }
      
      // Verificar continuidade da sequência
      const uniqueNumbers = [...new Set(markerNumbers)].sort((a, b) => a - b);
      
      for (let i = 0; i < uniqueNumbers.length - 1; i++) {
        const current = uniqueNumbers[i];
        const next = uniqueNumbers[i + 1];
        const expectedNext = current + 1;
        
        if (next !== expectedNext) {
          const gap = { start: current, end: next, missing: [] };
          
          // Identificar números faltantes
          for (let missing = expectedNext; missing < next; missing++) {
            gap.missing.push(missing);
          }
          
          gaps.push(gap);
          
          if (strictMode) {
            errors.push(`Gap na sequência: após [${current}] esperado [${expectedNext}], encontrado [${next}]`);
          } else {
            warnings.push(`Gap na sequência: números faltantes ${gap.missing.map(n => `[${n}]`).join(', ')}`);
          }
        }
      }
      
      // Verificar ordem no texto (marcadores devem aparecer em ordem crescente)
      const markersInTextOrder = foundMarkers.sort((a, b) => a.position - b.position);
      
      for (let i = 0; i < markersInTextOrder.length - 1; i++) {
        const current = markersInTextOrder[i];
        const next = markersInTextOrder[i + 1];
        
        if (current.number > next.number) {
          warnings.push(`Ordem no texto: [${current.number}] (pos: ${current.position}) aparece antes de [${next.number}] (pos: ${next.position})`);
        }
      }
      
      const isValid = errors.length === 0;
      
      console.log(`${isValid ? '✅' : '❌'} Validação ${isValid ? 'aprovada' : 'reprovada'}`);
      if (errors.length > 0) {
        console.log('❌ Erros encontrados:', errors);
      }
      if (warnings.length > 0) {
        console.log('⚠️ Avisos:', warnings);
      }
      
      return {
        isValid,
        errors,
        warnings,
        markerCount: foundMarkers.length,
        sequence: markerNumbers,
        uniqueSequence: uniqueNumbers,
        gaps,
        duplicates,
        firstMarker,
        lastMarker: Math.max(...markerNumbers),
        expectedCount: uniqueNumbers.length > 0 ? Math.max(...markerNumbers) : 0
      };
      
    } catch (error) {
      console.error('❌ Erro na validação sequencial:', error);
      return {
        isValid: false,
        errors: [`Erro na validação: ${error.message}`],
        warnings: [],
        markerCount: 0,
        sequence: [],
        gaps: [],
        duplicates: []
      };
    }
  }
  
  /**
   * Executa reindexação automática dos marcadores após inserção
   * @param {string} editorContent - Conteúdo atual do editor
   * @param {InsertionContext} insertionContext - Contexto da inserção
   * @returns {Object} Resultado da reindexação com novo conteúdo e mapeamento
   */
  static reindexMarkersAfterInsertion(editorContent, insertionContext) {
    try {
      console.log('🔄 MarkerReindexingService - Executando reindexação sequencial automática');
      
      if (!editorContent || !insertionContext || !insertionContext.needsReindexing) {
        console.log('❌ Parâmetros inválidos para reindexação');
        return null;
      }
      
      const { insertionPosition, newMarkerNumber, existingMarkers } = insertionContext;
      
      console.log(`🔄 Iniciando reindexação sequencial:`);
      console.log(`  - Posição de inserção: ${insertionPosition}`);
      console.log(`  - Novo marcador: [${newMarkerNumber}]`);
      console.log(`  - Marcadores existentes: ${existingMarkers.length}`);
      
      // 1. Gerar mapeamento sequencial de reindexação
      const reindexingMap = this.generateSequentialReindexingMap(
        existingMarkers, 
        insertionPosition, 
        newMarkerNumber
      );
      
      if (reindexingMap.length === 0) {
        console.log('ℹ️ Nenhuma reindexação necessária');
        return {
          success: true,
          newContent: editorContent,
          reindexingMap: [],
          affectedMarkersCount: 0,
          validation: { isValid: true, message: 'Nenhuma alteração necessária' }
        };
      }
      
      // 2. Gerar novo conteúdo com marcadores reindexados
      const contentResult = this.generateReindexedContent(editorContent, reindexingMap);
      
      if (!contentResult.success) {
        console.error('❌ Falha ao gerar conteúdo reindexado:', contentResult.error);
        return null;
      }
      
      // 3. Validar integridade da sequência após reindexação
      const validationResult = this.validateSequentialIntegrity(contentResult.newContent, true);
      
      if (!validationResult.isValid) {
        console.warn('⚠️ Sequência com problemas após reindexação:', validationResult.errors);
        // Continuar mesmo com warnings - pode ser válido dependendo do contexto
      }
      
      console.log(`✅ Reindexação sequencial concluída:`);
      console.log(`  - Marcadores processados: ${reindexingMap.length}`);
      console.log(`  - Substituições realizadas: ${contentResult.replacements}`);
      console.log(`  - Validação: ${validationResult.isValid ? 'Aprovada' : 'Com avisos'}`);
      
      return {
        success: true,
        newContent: contentResult.newContent,
        reindexingMap,
        affectedMarkersCount: reindexingMap.length,
        totalReplacements: contentResult.replacements,
        processedMarkers: contentResult.processedMarkers,
        validation: validationResult,
        sequentialIntegrity: validationResult.isValid
      };
      
    } catch (error) {
      console.error('❌ Erro durante reindexação sequencial automática:', error);
      return null;
    }
  }
  
  /**
   * Atualiza referenceMapping para sincronizar mapeamento título ↔ marcador
   * @param {Map} oldMapping - Mapeamento atual (bidirecional)
   * @param {Array} reindexingMap - Array com mapeamento de reindexação
   * @returns {Map} Novo mapeamento atualizado
   */
  static updateReferenceMapping(oldMapping, reindexingMap) {
    try {
      console.log('🗺️ MarkerReindexingService - Atualizando referenceMapping');
      
      if (!oldMapping || !(oldMapping instanceof Map)) {
        console.log('❌ ReferenceMapping inválido');
        return new Map();
      }
      
      if (!reindexingMap || !Array.isArray(reindexingMap)) {
        console.log('❌ ReindexingMap inválido');
        return oldMapping;
      }
      
      // Criar novo mapeamento baseado no antigo
      const newMapping = new Map(oldMapping);
      
      console.log(`📊 Processando ${reindexingMap.length} mudanças no mapeamento`);
      console.log(`📊 Mapeamento atual tem ${oldMapping.size} entradas`);
      
      // Processar cada mudança no mapeamento
      reindexingMap.forEach((change, index) => {
        const { oldMarker, newMarker, isNewMarkerAdjustment } = change;
        
        console.log(`🔄 [${index + 1}/${reindexingMap.length}] Processando: ${oldMarker} -> ${newMarker}`);
        
        // Encontrar título associado ao marcador antigo
        let titleForMarker = null;
        
        // Buscar título que mapeia para o marcador antigo
        for (const [key, value] of oldMapping.entries()) {
          if (value === oldMarker) {
            titleForMarker = key;
            break;
          }
        }
        
        if (titleForMarker) {
          console.log(`📝 Título encontrado para ${oldMarker}: "${titleForMarker}"`);
          
          // Remover mapeamento antigo (título -> marcador)
          newMapping.delete(titleForMarker);
          
          // Remover mapeamento reverso antigo (marcador -> título)
          newMapping.delete(oldMarker);
          
          // Adicionar novos mapeamentos
          newMapping.set(titleForMarker, newMarker); // título -> novo marcador
          newMapping.set(newMarker, titleForMarker); // novo marcador -> título
          
          console.log(`✅ Mapeamento atualizado: "${titleForMarker}" <-> ${newMarker}`);
        } else {
          console.log(`⚠️ Título não encontrado para marcador ${oldMarker}`);
          
          // Se é ajuste do novo marcador, pode não ter título ainda
          if (isNewMarkerAdjustment) {
            console.log('ℹ️ Ajuste de novo marcador - título será adicionado posteriormente');
          }
        }
      });
      
      console.log(`✅ ReferenceMapping atualizado. Entradas: ${oldMapping.size} -> ${newMapping.size}`);
      
      // Log detalhado das mudanças
      const addedEntries = [];
      const removedEntries = [];
      const changedEntries = [];
      
      // Identificar entradas removidas
      for (const [key, value] of oldMapping.entries()) {
        if (!newMapping.has(key)) {
          removedEntries.push(`${key} -> ${value}`);
        } else if (newMapping.get(key) !== value) {
          changedEntries.push(`${key}: ${value} -> ${newMapping.get(key)}`);
        }
      }
      
      // Identificar entradas adicionadas
      for (const [key, value] of newMapping.entries()) {
        if (!oldMapping.has(key)) {
          addedEntries.push(`${key} -> ${value}`);
        }
      }
      
      if (removedEntries.length > 0) {
        console.log('🗑️ Entradas removidas:', removedEntries);
      }
      if (addedEntries.length > 0) {
        console.log('➕ Entradas adicionadas:', addedEntries);
      }
      if (changedEntries.length > 0) {
        console.log('🔄 Entradas modificadas:', changedEntries);
      }
      
      return newMapping;
      
    } catch (error) {
      console.error('❌ Erro ao atualizar referenceMapping:', error);
      return oldMapping; // Retornar mapeamento original em caso de erro
    }
  }
  
  /**
   * Valida integridade da sequência de marcadores (método legado - usa validateSequentialIntegrity)
   * @param {string} content - Conteúdo para validar
   * @returns {Object} Resultado da validação
   */
  static validateMarkerSequence(content) {
    try {
      // Usar o novo método de validação mais robusto
      const detailedValidation = this.validateSequentialIntegrity(content, true);
      
      // Converter para formato legado para compatibilidade
      return {
        isValid: detailedValidation.isValid,
        errors: detailedValidation.errors,
        markerCount: detailedValidation.markerCount,
        sequence: detailedValidation.sequence,
        // Campos adicionais do novo método
        warnings: detailedValidation.warnings,
        gaps: detailedValidation.gaps,
        duplicates: detailedValidation.duplicates
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: [`Erro na validação: ${error.message}`],
        markerCount: 0,
        sequence: []
      };
    }
  }
  
  /**
   * Aplica mudanças de reindexação no editor de forma segura
   * @param {Object} editor - Instância do editor
   * @param {string} newContent - Novo conteúdo com marcadores reindexados
   * @param {Array} reindexingMap - Mapeamento de reindexação
   * @returns {boolean} Sucesso da operação
   */
  static applyReindexingToEditor(editor, newContent, reindexingMap) {
    try {
      console.log('📝 MarkerReindexingService - Aplicando reindexação no editor');
      
      if (!editor || !editor.replaceContent) {
        console.error('❌ Editor não disponível ou sem método replaceContent');
        return false;
      }
      
      if (!newContent || typeof newContent !== 'string') {
        console.error('❌ Novo conteúdo inválido');
        return false;
      }
      
      console.log(`📝 Aplicando novo conteúdo (${newContent.length} caracteres)`);
      console.log(`🔄 Processando ${reindexingMap.length} mudanças de marcadores`);
      
      // Aplicar novo conteúdo no editor
      const success = editor.replaceContent(newContent);
      
      if (success) {
        console.log('✅ Conteúdo aplicado com sucesso no editor');
        
        // Log das mudanças aplicadas
        reindexingMap.forEach((change, index) => {
          console.log(`✅ [${index + 1}] ${change.oldMarker} -> ${change.newMarker}`);
        });
        
        return true;
      } else {
        console.error('❌ Falha ao aplicar conteúdo no editor');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Erro ao aplicar reindexação no editor:', error);
      return false;
    }
  }

  // ==================== ERROR HANDLING & ROLLBACK SYSTEM ====================

  /**
   * Cria backup completo do estado antes da reindexação
   * @param {Object} editor - Instância do editor
   * @param {Map} referenceMapping - Mapeamento atual título ↔ marcador
   * @param {string} operationId - ID único da operação
   * @returns {StateBackup} Backup do estado atual
   */
  static createStateBackup(editor, referenceMapping, operationId = null) {
    try {
      console.log('💾 Criando backup do estado antes da reindexação');
      
      const timestamp = Date.now();
      const backupId = operationId || `reindex_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Obter conteúdo atual do editor
      let originalContent = '';
      let cursorPosition = 0;
      let editorState = {};
      
      if (editor) {
        try {
          // Tentar diferentes métodos para obter conteúdo
          if (typeof editor.getContent === 'function') {
            originalContent = editor.getContent();
          } else if (typeof editor.getText === 'function') {
            originalContent = editor.getText();
          } else if (editor.content) {
            originalContent = editor.content;
          } else if (editor.innerHTML) {
            originalContent = editor.innerHTML;
          }
          
          // Tentar obter posição do cursor
          if (typeof editor.getCursorPosition === 'function') {
            cursorPosition = editor.getCursorPosition();
          } else if (editor.selectionStart !== undefined) {
            cursorPosition = editor.selectionStart;
          }
          
          // Capturar estado adicional do editor
          editorState = {
            scrollTop: editor.scrollTop || 0,
            scrollLeft: editor.scrollLeft || 0,
            selection: editor.getSelection ? editor.getSelection() : null,
            focus: document.activeElement === editor
          };
          
        } catch (editorError) {
          console.warn('⚠️ Erro ao capturar estado do editor:', editorError.message);
        }
      }
      
      // Criar cópia profunda do referenceMapping
      let originalReferenceMapping = new Map();
      if (referenceMapping && referenceMapping instanceof Map) {
        try {
          originalReferenceMapping = new Map(referenceMapping);
        } catch (mappingError) {
          console.warn('⚠️ Erro ao copiar referenceMapping:', mappingError.message);
        }
      }
      
      const backup = {
        operationId: backupId,
        timestamp,
        originalContent,
        originalReferenceMapping,
        cursorPosition,
        editorState,
        contentLength: originalContent.length,
        mappingSize: originalReferenceMapping.size
      };
      
      console.log(`💾 Backup criado com sucesso:`);
      console.log(`  - ID: ${backupId}`);
      console.log(`  - Conteúdo: ${originalContent.length} caracteres`);
      console.log(`  - Mapeamento: ${originalReferenceMapping.size} entradas`);
      console.log(`  - Cursor: posição ${cursorPosition}`);
      
      return backup;
      
    } catch (error) {
      console.error('❌ Erro ao criar backup do estado:', error);
      
      // Retornar backup mínimo em caso de erro
      return {
        operationId: operationId || `error_backup_${Date.now()}`,
        timestamp: Date.now(),
        originalContent: '',
        originalReferenceMapping: new Map(),
        cursorPosition: 0,
        editorState: {},
        error: error.message,
        isErrorBackup: true
      };
    }
  }

  /**
   * Executa rollback automático para estado anterior
   * @param {StateBackup} backup - Backup do estado para restaurar
   * @param {Object} editor - Instância do editor
   * @param {Function} setReferenceMapping - Função para atualizar referenceMapping
   * @returns {boolean} Sucesso do rollback
   */
  static executeRollback(backup, editor, setReferenceMapping) {
    try {
      console.log('🔄 Executando rollback automático');
      console.log(`🔄 Restaurando estado da operação: ${backup.operationId}`);
      
      if (!backup || backup.isErrorBackup) {
        console.error('❌ Backup inválido ou corrompido para rollback');
        return false;
      }
      
      let rollbackSuccess = true;
      const errors = [];
      
      // 1. Restaurar conteúdo do editor
      if (editor && backup.originalContent !== undefined) {
        try {
          console.log(`📝 Restaurando conteúdo do editor (${backup.originalContent.length} caracteres)`);
          
          if (typeof editor.replaceContent === 'function') {
            const contentRestored = editor.replaceContent(backup.originalContent);
            if (!contentRestored) {
              errors.push('Falha ao restaurar conteúdo via replaceContent');
            }
          } else if (typeof editor.setContent === 'function') {
            editor.setContent(backup.originalContent);
          } else if (editor.innerHTML !== undefined) {
            editor.innerHTML = backup.originalContent;
          } else {
            errors.push('Método para restaurar conteúdo não encontrado');
          }
          
          console.log('✅ Conteúdo do editor restaurado');
          
        } catch (contentError) {
          errors.push(`Erro ao restaurar conteúdo: ${contentError.message}`);
          rollbackSuccess = false;
        }
      }
      
      // 2. Restaurar referenceMapping
      if (setReferenceMapping && typeof setReferenceMapping === 'function') {
        try {
          console.log(`🗺️ Restaurando referenceMapping (${backup.originalReferenceMapping.size} entradas)`);
          
          setReferenceMapping(backup.originalReferenceMapping);
          console.log('✅ ReferenceMapping restaurado');
          
        } catch (mappingError) {
          errors.push(`Erro ao restaurar referenceMapping: ${mappingError.message}`);
          rollbackSuccess = false;
        }
      }
      
      // 3. Restaurar posição do cursor
      if (editor && backup.cursorPosition !== undefined) {
        try {
          if (typeof editor.setCursorPosition === 'function') {
            editor.setCursorPosition(backup.cursorPosition);
          } else if (editor.selectionStart !== undefined) {
            editor.selectionStart = backup.cursorPosition;
            editor.selectionEnd = backup.cursorPosition;
          }
          
          console.log(`✅ Posição do cursor restaurada: ${backup.cursorPosition}`);
          
        } catch (cursorError) {
          console.warn('⚠️ Erro ao restaurar cursor:', cursorError.message);
          // Não considerar erro crítico
        }
      }
      
      // 4. Restaurar estado adicional do editor
      if (editor && backup.editorState) {
        try {
          const { scrollTop, scrollLeft, focus } = backup.editorState;
          
          if (scrollTop !== undefined) editor.scrollTop = scrollTop;
          if (scrollLeft !== undefined) editor.scrollLeft = scrollLeft;
          if (focus && typeof editor.focus === 'function') editor.focus();
          
          console.log('✅ Estado adicional do editor restaurado');
          
        } catch (stateError) {
          console.warn('⚠️ Erro ao restaurar estado adicional:', stateError.message);
          // Não considerar erro crítico
        }
      }
      
      if (rollbackSuccess && errors.length === 0) {
        console.log('✅ Rollback executado com sucesso');
        return true;
      } else {
        console.error('❌ Rollback parcialmente falhou:', errors);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Erro crítico durante rollback:', error);
      return false;
    }
  }

  /**
   * Valida integridade completa após reindexação
   * @param {string} content - Conteúdo após reindexação
   * @param {Map} referenceMapping - Mapeamento após reindexação
   * @param {Array} reindexingMap - Mapeamento de mudanças aplicadas
   * @returns {Object} Resultado detalhado da validação
   */
  static validatePostReindexingIntegrity(content, referenceMapping, reindexingMap) {
    try {
      console.log('🔍 Validando integridade completa após reindexação');
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        checks: {
          sequentialIntegrity: null,
          mappingConsistency: null,
          reindexingAccuracy: null,
          contentIntegrity: null
        }
      };
      
      // 1. Validar integridade sequencial dos marcadores
      console.log('🔍 Verificando integridade sequencial...');
      const sequentialCheck = this.validateSequentialIntegrity(content, true);
      validationResult.checks.sequentialIntegrity = sequentialCheck;
      
      if (!sequentialCheck.isValid) {
        validationResult.isValid = false;
        validationResult.errors.push(...sequentialCheck.errors);
      }
      if (sequentialCheck.warnings.length > 0) {
        validationResult.warnings.push(...sequentialCheck.warnings);
      }
      
      // 2. Validar consistência do referenceMapping
      console.log('🔍 Verificando consistência do mapeamento...');
      const mappingCheck = this.validateReferenceMappingConsistency(content, referenceMapping);
      validationResult.checks.mappingConsistency = mappingCheck;
      
      if (!mappingCheck.isValid) {
        validationResult.isValid = false;
        validationResult.errors.push(...mappingCheck.errors);
      }
      if (mappingCheck.warnings.length > 0) {
        validationResult.warnings.push(...mappingCheck.warnings);
      }
      
      // 3. Validar precisão da reindexação
      console.log('🔍 Verificando precisão da reindexação...');
      const reindexingCheck = this.validateReindexingAccuracy(content, reindexingMap);
      validationResult.checks.reindexingAccuracy = reindexingCheck;
      
      if (!reindexingCheck.isValid) {
        validationResult.isValid = false;
        validationResult.errors.push(...reindexingCheck.errors);
      }
      if (reindexingCheck.warnings.length > 0) {
        validationResult.warnings.push(...reindexingCheck.warnings);
      }
      
      // 4. Validar integridade geral do conteúdo
      console.log('🔍 Verificando integridade geral do conteúdo...');
      const contentCheck = this.validateContentIntegrity(content);
      validationResult.checks.contentIntegrity = contentCheck;
      
      if (!contentCheck.isValid) {
        validationResult.isValid = false;
        validationResult.errors.push(...contentCheck.errors);
      }
      if (contentCheck.warnings.length > 0) {
        validationResult.warnings.push(...contentCheck.warnings);
      }
      
      // Resumo da validação
      const totalErrors = validationResult.errors.length;
      const totalWarnings = validationResult.warnings.length;
      
      console.log(`${validationResult.isValid ? '✅' : '❌'} Validação pós-reindexação:`);
      console.log(`  - Integridade sequencial: ${sequentialCheck.isValid ? '✅' : '❌'}`);
      console.log(`  - Consistência do mapeamento: ${mappingCheck.isValid ? '✅' : '❌'}`);
      console.log(`  - Precisão da reindexação: ${reindexingCheck.isValid ? '✅' : '❌'}`);
      console.log(`  - Integridade do conteúdo: ${contentCheck.isValid ? '✅' : '❌'}`);
      console.log(`  - Total de erros: ${totalErrors}`);
      console.log(`  - Total de avisos: ${totalWarnings}`);
      
      return validationResult;
      
    } catch (error) {
      console.error('❌ Erro durante validação pós-reindexação:', error);
      return {
        isValid: false,
        errors: [`Erro na validação: ${error.message}`],
        warnings: [],
        checks: {}
      };
    }
  }

  /**
   * Valida consistência entre conteúdo e referenceMapping
   * @param {string} content - Conteúdo para validar
   * @param {Map} referenceMapping - Mapeamento título ↔ marcador
   * @returns {Object} Resultado da validação de consistência
   */
  static validateReferenceMappingConsistency(content, referenceMapping) {
    try {
      console.log('🔍 Validando consistência do referenceMapping');
      
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        stats: {
          markersInContent: 0,
          markersInMapping: 0,
          orphanedMarkers: [],
          missingMarkers: [],
          bidirectionalErrors: []
        }
      };
      
      if (!referenceMapping || !(referenceMapping instanceof Map)) {
        result.errors.push('ReferenceMapping inválido ou não é uma instância de Map');
        result.isValid = false;
        return result;
      }
      
      // Extrair marcadores do conteúdo
      const contentMarkers = this.extractAllMarkers(content);
      const contentMarkerTexts = contentMarkers.map(m => m.text);
      result.stats.markersInContent = contentMarkers.length;
      
      // Extrair marcadores do mapping
      const mappingMarkers = [];
      const titles = [];
      
      for (const [key, value] of referenceMapping.entries()) {
        if (typeof key === 'string' && key.match(/^\[(\d+)\]$/)) {
          // key é um marcador
          mappingMarkers.push(key);
        } else if (typeof value === 'string' && value.match(/^\[(\d+)\]$/)) {
          // value é um marcador
          mappingMarkers.push(value);
          titles.push(key);
        }
      }
      
      const uniqueMappingMarkers = [...new Set(mappingMarkers)];
      result.stats.markersInMapping = uniqueMappingMarkers.length;
      
      // Verificar marcadores órfãos (no conteúdo mas não no mapping)
      contentMarkerTexts.forEach(marker => {
        if (!uniqueMappingMarkers.includes(marker)) {
          result.stats.orphanedMarkers.push(marker);
          result.warnings.push(`Marcador ${marker} existe no conteúdo mas não no referenceMapping`);
        }
      });
      
      // Verificar marcadores faltantes (no mapping mas não no conteúdo)
      uniqueMappingMarkers.forEach(marker => {
        if (!contentMarkerTexts.includes(marker)) {
          result.stats.missingMarkers.push(marker);
          result.warnings.push(`Marcador ${marker} existe no referenceMapping mas não no conteúdo`);
        }
      });
      
      // Verificar integridade bidirecional do mapping
      for (const [key, value] of referenceMapping.entries()) {
        if (typeof value === 'string' && value.match(/^\[(\d+)\]$/)) {
          // key é título, value é marcador
          const reverseValue = referenceMapping.get(value);
          if (reverseValue !== key) {
            result.stats.bidirectionalErrors.push({ title: key, marker: value, reverseValue });
            result.errors.push(`Mapeamento bidirecional quebrado: "${key}" -> ${value}, mas ${value} -> "${reverseValue}"`);
            result.isValid = false;
          }
        }
      }
      
      console.log(`📊 Consistência do mapeamento:`);
      console.log(`  - Marcadores no conteúdo: ${result.stats.markersInContent}`);
      console.log(`  - Marcadores no mapping: ${result.stats.markersInMapping}`);
      console.log(`  - Marcadores órfãos: ${result.stats.orphanedMarkers.length}`);
      console.log(`  - Marcadores faltantes: ${result.stats.missingMarkers.length}`);
      console.log(`  - Erros bidirecionais: ${result.stats.bidirectionalErrors.length}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Erro na validação de consistência:', error);
      return {
        isValid: false,
        errors: [`Erro na validação: ${error.message}`],
        warnings: [],
        stats: {}
      };
    }
  }

  /**
   * Valida se a reindexação foi aplicada corretamente
   * @param {string} content - Conteúdo após reindexação
   * @param {Array} reindexingMap - Mapeamento de mudanças aplicadas
   * @returns {Object} Resultado da validação de precisão
   */
  static validateReindexingAccuracy(content, reindexingMap) {
    try {
      console.log('🔍 Validando precisão da reindexação');
      
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        stats: {
          expectedChanges: reindexingMap.length,
          appliedChanges: 0,
          failedChanges: [],
          unexpectedMarkers: []
        }
      };
      
      if (!reindexingMap || !Array.isArray(reindexingMap)) {
        result.warnings.push('ReindexingMap não fornecido - validação de precisão ignorada');
        return result;
      }
      
      // Verificar se cada mudança foi aplicada corretamente
      reindexingMap.forEach((change, index) => {
        const { oldMarker, newMarker } = change;
        
        // Verificar se o marcador antigo não existe mais no conteúdo
        const escapedOldMarker = oldMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const oldMarkerRegex = new RegExp(escapedOldMarker, 'g');
        const oldMarkerMatches = (content.match(oldMarkerRegex) || []).length;
        
        // Verificar se o novo marcador existe no conteúdo
        const escapedNewMarker = newMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const newMarkerRegex = new RegExp(escapedNewMarker, 'g');
        const newMarkerMatches = (content.match(newMarkerRegex) || []).length;
        
        if (oldMarkerMatches > 0) {
          result.stats.failedChanges.push({
            change,
            issue: 'old_marker_still_exists',
            oldMarkerCount: oldMarkerMatches
          });
          result.errors.push(`Marcador antigo ${oldMarker} ainda existe no conteúdo (${oldMarkerMatches} ocorrências)`);
          result.isValid = false;
        }
        
        if (newMarkerMatches === 0) {
          result.stats.failedChanges.push({
            change,
            issue: 'new_marker_not_found',
            newMarkerCount: newMarkerMatches
          });
          result.errors.push(`Novo marcador ${newMarker} não encontrado no conteúdo`);
          result.isValid = false;
        } else {
          result.stats.appliedChanges++;
        }
      });
      
      // Verificar se há marcadores inesperados no conteúdo
      const allMarkers = this.extractAllMarkers(content);
      const expectedMarkers = reindexingMap.map(change => change.newMarker);
      
      allMarkers.forEach(marker => {
        const wasExpected = expectedMarkers.includes(marker.text) || 
                           reindexingMap.some(change => change.oldMarker === marker.text);
        
        if (!wasExpected) {
          result.stats.unexpectedMarkers.push(marker.text);
          result.warnings.push(`Marcador inesperado encontrado: ${marker.text}`);
        }
      });
      
      console.log(`📊 Precisão da reindexação:`);
      console.log(`  - Mudanças esperadas: ${result.stats.expectedChanges}`);
      console.log(`  - Mudanças aplicadas: ${result.stats.appliedChanges}`);
      console.log(`  - Mudanças falhadas: ${result.stats.failedChanges.length}`);
      console.log(`  - Marcadores inesperados: ${result.stats.unexpectedMarkers.length}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Erro na validação de precisão:', error);
      return {
        isValid: false,
        errors: [`Erro na validação: ${error.message}`],
        warnings: [],
        stats: {}
      };
    }
  }

  /**
   * Valida integridade geral do conteúdo
   * @param {string} content - Conteúdo para validar
   * @returns {Object} Resultado da validação de integridade
   */
  static validateContentIntegrity(content) {
    try {
      console.log('🔍 Validando integridade geral do conteúdo');
      
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        stats: {
          contentLength: content ? content.length : 0,
          markerCount: 0,
          malformedMarkers: [],
          duplicateMarkers: [],
          emptyContent: false
        }
      };
      
      if (typeof content !== 'string') {
        result.errors.push('Conteúdo inválido');
        result.isValid = false;
        return result;
      }
      
      // Verificar se conteúdo está vazio
      if (content.length === 0) {
        result.warnings.push('Conteúdo está vazio');
        result.stats.emptyContent = true;
      }
      
      // Verificar marcadores malformados
      const allMarkerMatches = content.match(/\[[^\]]*\]/g) || [];
      const validMarkerMatches = content.match(/\[\d+\]/g) || [];
      
      result.stats.markerCount = validMarkerMatches.length;
      
      allMarkerMatches.forEach(match => {
        if (!match.match(/^\[\d+\]$/)) {
          result.stats.malformedMarkers.push(match);
          result.warnings.push(`Marcador malformado encontrado: ${match}`);
        }
      });
      
      // Verificar marcadores duplicados
      const markerCounts = {};
      validMarkerMatches.forEach(marker => {
        markerCounts[marker] = (markerCounts[marker] || 0) + 1;
      });
      
      Object.entries(markerCounts).forEach(([marker, count]) => {
        if (count > 1) {
          result.stats.duplicateMarkers.push({ marker, count });
          result.errors.push(`Marcador duplicado: ${marker} aparece ${count} vezes`);
          result.isValid = false;
        }
      });
      

      
      console.log(`📊 Integridade do conteúdo:`);
      console.log(`  - Tamanho: ${result.stats.contentLength} caracteres`);
      console.log(`  - Marcadores válidos: ${result.stats.markerCount}`);
      console.log(`  - Marcadores malformados: ${result.stats.malformedMarkers.length}`);
      console.log(`  - Marcadores duplicados: ${result.stats.duplicateMarkers.length}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Erro na validação de integridade:', error);
      return {
        isValid: false,
        errors: [`Erro na validação: ${error.message}`],
        warnings: [],
        stats: {}
      };
    }
  }

  /**
   * Preserva funcionalidade básica em caso de erro crítico
   * @param {Error} error - Erro ocorrido
   * @param {Object} context - Contexto da operação
   * @returns {Object} Estado de fallback seguro
   */
  static preserveBasicFunctionality(error, context = {}) {
    try {
      console.log('🛡️ Preservando funcionalidade básica após erro crítico');
      console.error('❌ Erro original:', error.message);
      
      const fallbackState = {
        mode: 'fallback',
        timestamp: Date.now(),
        originalError: error.message,
        context,
        preservedFunctions: {
          basicEditing: true,
          markerDetection: false,
          reindexing: false,
          grifos: 'limited'
        },
        recommendations: [
          'Recarregar a página para restaurar funcionalidade completa',
          'Verificar console para detalhes do erro',
          'Salvar trabalho atual antes de continuar'
        ]
      };
      
      // Tentar preservar funcionalidades críticas
      try {
        // Manter editor funcionando para edição básica
        if (context.editor && typeof context.editor.enable === 'function') {
          context.editor.enable();
        }
        
        // Desabilitar funcionalidades que podem causar mais erros
        if (context.editor && typeof context.editor.disableReindexing === 'function') {
          context.editor.disableReindexing();
        }
        
        fallbackState.preservedFunctions.basicEditing = true;
        
      } catch (preservationError) {
        console.error('❌ Erro ao preservar funcionalidades básicas:', preservationError);
        fallbackState.preservedFunctions.basicEditing = false;
      }
      
      console.log('🛡️ Estado de fallback configurado:', fallbackState);
      return fallbackState;
      
    } catch (fallbackError) {
      console.error('❌ Erro crítico no sistema de fallback:', fallbackError);
      return {
        mode: 'critical_failure',
        timestamp: Date.now(),
        errors: [error.message, fallbackError.message]
      };
    }
  }

  /**
   * Executa validação de integridade com recuperação automática
   * @param {string} content - Conteúdo para validar
   * @param {Map} referenceMapping - Mapeamento para validar
   * @param {Object} options - Opções de validação
   * @returns {Object} Resultado com tentativas de correção automática
   */
  static validateWithAutoRecovery(content, referenceMapping, options = {}) {
    try {
      console.log('🔍 Executando validação com recuperação automática');
      
      const {
        attemptAutoFix = true,
        strictMode = false,
        maxFixAttempts = 3
      } = options;
      
      let currentContent = content;
      let currentMapping = referenceMapping;
      let fixAttempts = 0;
      let fixesApplied = [];
      
      while (fixAttempts < maxFixAttempts) {
        // Executar validação completa
        const validation = this.validatePostReindexingIntegrity(
          currentContent, 
          currentMapping, 
          []
        );
        
        if (validation.isValid || !attemptAutoFix) {
          return {
            isValid: validation.isValid,
            errors: validation.errors,
            warnings: validation.warnings,
            fixesApplied,
            fixAttempts,
            finalContent: currentContent,
            finalMapping: currentMapping
          };
        }
        
        // Tentar correções automáticas
        console.log(`🔧 Tentativa de correção automática ${fixAttempts + 1}/${maxFixAttempts}`);
        
        let fixApplied = false;
        
        // Correção 1: Remover marcadores duplicados
        if (validation.checks.sequentialIntegrity && 
            validation.checks.sequentialIntegrity.duplicates.length > 0) {
          
          console.log('🔧 Corrigindo marcadores duplicados...');
          const fixResult = this.fixDuplicateMarkers(currentContent);
          if (fixResult.success) {
            currentContent = fixResult.newContent;
            fixesApplied.push('duplicate_markers_removed');
            fixApplied = true;
          }
        }
        
        // Correção 2: Corrigir gaps na sequência
        if (validation.checks.sequentialIntegrity && 
            validation.checks.sequentialIntegrity.gaps.length > 0 && 
            !strictMode) {
          
          console.log('🔧 Corrigindo gaps na sequência...');
          const fixResult = this.fixSequenceGaps(currentContent);
          if (fixResult.success) {
            currentContent = fixResult.newContent;
            fixesApplied.push('sequence_gaps_fixed');
            fixApplied = true;
          }
        }
        
        // Correção 3: Sincronizar referenceMapping
        if (validation.checks.mappingConsistency && 
            !validation.checks.mappingConsistency.isValid) {
          
          console.log('🔧 Sincronizando referenceMapping...');
          const fixResult = this.syncReferenceMapping(currentContent, currentMapping);
          if (fixResult.success) {
            currentMapping = fixResult.newMapping;
            fixesApplied.push('mapping_synchronized');
            fixApplied = true;
          }
        }
        
        if (!fixApplied) {
          console.log('⚠️ Nenhuma correção automática disponível');
          break;
        }
        
        fixAttempts++;
      }
      
      // Validação final
      const finalValidation = this.validatePostReindexingIntegrity(
        currentContent, 
        currentMapping, 
        []
      );
      
      return {
        isValid: finalValidation.isValid,
        errors: finalValidation.errors,
        warnings: finalValidation.warnings,
        fixesApplied,
        fixAttempts,
        finalContent: currentContent,
        finalMapping: currentMapping,
        autoRecoveryUsed: fixesApplied.length > 0
      };
      
    } catch (error) {
      console.error('❌ Erro durante validação com recuperação automática:', error);
      return {
        isValid: false,
        errors: [`Erro na validação: ${error.message}`],
        warnings: [],
        fixesApplied: [],
        fixAttempts: 0
      };
    }
  }

  /**
   * Corrige marcadores duplicados no conteúdo
   * @param {string} content - Conteúdo com possíveis duplicatas
   * @returns {Object} Resultado da correção
   */
  static fixDuplicateMarkers(content) {
    try {
      console.log('🔧 Corrigindo marcadores duplicados');
      
      const markers = this.extractAllMarkers(content);
      const markerCounts = {};
      
      // Contar ocorrências de cada marcador
      markers.forEach(marker => {
        markerCounts[marker.text] = (markerCounts[marker.text] || 0) + 1;
      });
      
      // Identificar duplicatas
      const duplicates = Object.entries(markerCounts)
        .filter(([marker, count]) => count > 1)
        .map(([marker, count]) => ({ marker, count }));
      
      if (duplicates.length === 0) {
        return { success: true, newContent: content, duplicatesRemoved: 0 };
      }
      
      let newContent = content;
      let duplicatesRemoved = 0;
      
      // Remover duplicatas (manter apenas a primeira ocorrência)
      duplicates.forEach(({ marker }) => {
        const regex = new RegExp(`\\${marker}`, 'g');
        let firstOccurrence = true;
        
        newContent = newContent.replace(regex, (match) => {
          if (firstOccurrence) {
            firstOccurrence = false;
            return match; // Manter primeira ocorrência
          } else {
            duplicatesRemoved++;
            return ''; // Remover duplicatas
          }
        });
      });
      
      console.log(`✅ ${duplicatesRemoved} marcadores duplicados removidos`);
      
      return {
        success: true,
        newContent,
        duplicatesRemoved,
        duplicatesFixed: duplicates.length
      };
      
    } catch (error) {
      console.error('❌ Erro ao corrigir marcadores duplicados:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Corrige gaps na sequência de marcadores
   * @param {string} content - Conteúdo com possíveis gaps
   * @returns {Object} Resultado da correção
   */
  static fixSequenceGaps(content) {
    try {
      console.log('🔧 Corrigindo gaps na sequência');
      
      const markers = this.extractAllMarkers(content);
      if (markers.length === 0) {
        return { success: true, newContent: content, gapsFixed: 0 };
      }
      
      // Ordenar marcadores por posição no texto
      const sortedMarkers = markers.sort((a, b) => a.position - b.position);
      
      let newContent = content;
      let gapsFixed = 0;
      
      // Renumerar sequencialmente a partir de 1
      sortedMarkers.forEach((marker, index) => {
        const expectedNumber = index + 1;
        const currentNumber = marker.number;
        
        if (currentNumber !== expectedNumber) {
          const oldMarker = `[${currentNumber}]`;
          const newMarker = `[${expectedNumber}]`;
          
          // Substituir apenas a primeira ocorrência na posição correta
          const beforeMarker = newContent.substring(0, marker.position);
          const afterMarker = newContent.substring(marker.position + oldMarker.length);
          
          newContent = beforeMarker + newMarker + afterMarker;
          gapsFixed++;
          
          console.log(`🔧 Gap corrigido: ${oldMarker} -> ${newMarker}`);
        }
      });
      
      console.log(`✅ ${gapsFixed} gaps na sequência corrigidos`);
      
      return {
        success: true,
        newContent,
        gapsFixed,
        totalMarkers: sortedMarkers.length
      };
      
    } catch (error) {
      console.error('❌ Erro ao corrigir gaps na sequência:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sincroniza referenceMapping com o conteúdo atual
   * @param {string} content - Conteúdo atual
   * @param {Map} referenceMapping - Mapeamento atual
   * @returns {Object} Resultado da sincronização
   */
  static syncReferenceMapping(content, referenceMapping) {
    try {
      console.log('🔧 Sincronizando referenceMapping com conteúdo');
      
      const markers = this.extractAllMarkers(content);
      const contentMarkers = markers.map(m => m.text);
      
      const newMapping = new Map();
      let syncedEntries = 0;
      let removedEntries = 0;
      
      // Manter apenas entradas que correspondem a marcadores no conteúdo
      for (const [key, value] of referenceMapping.entries()) {
        if (typeof value === 'string' && value.match(/^\[(\d+)\]$/)) {
          // key é título, value é marcador
          if (contentMarkers.includes(value)) {
            newMapping.set(key, value);
            newMapping.set(value, key);
            syncedEntries++;
          } else {
            removedEntries++;
            console.log(`🗑️ Removendo entrada órfã: "${key}" -> ${value}`);
          }
        }
      }
      
      console.log(`✅ ReferenceMapping sincronizado:`);
      console.log(`  - Entradas mantidas: ${syncedEntries}`);
      console.log(`  - Entradas removidas: ${removedEntries}`);
      
      return {
        success: true,
        newMapping,
        syncedEntries,
        removedEntries
      };
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar referenceMapping:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Executa reindexação com sistema completo de error handling e rollback
   * @param {string} editorContent - Conteúdo atual do editor
   * @param {InsertionContext} insertionContext - Contexto da inserção
   * @param {Object} editor - Instância do editor
   * @param {Map} referenceMapping - Mapeamento atual título ↔ marcador
   * @param {Function} setReferenceMapping - Função para atualizar referenceMapping
   * @returns {RollbackableResult} Resultado com capacidade de rollback
   */
  static reindexWithErrorHandling(editorContent, insertionContext, editor, referenceMapping, setReferenceMapping) {
    const operationId = `reindex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('🛡️ Iniciando reindexação com sistema de error handling');
      console.log(`🆔 ID da operação: ${operationId}`);
      
      // 1. Criar backup do estado atual
      console.log('💾 Criando backup do estado...');
      const backup = this.createStateBackup(editor, referenceMapping, operationId);
      
      // 2. Executar reindexação normal
      console.log('🔄 Executando reindexação...');
      const reindexResult = this.reindexMarkersAfterInsertion(editorContent, insertionContext);
      
      if (!reindexResult || !reindexResult.success) {
        console.error('❌ Falha na reindexação - executando rollback');
        
        const rollbackSuccess = this.executeRollback(backup, editor, setReferenceMapping);
        
        return {
          success: false,
          error: new Error('Falha na reindexação de marcadores'),
          backup,
          rollback: () => this.executeRollback(backup, editor, setReferenceMapping),
          rollbackExecuted: rollbackSuccess,
          operationId
        };
      }
      
      // 3. Aplicar mudanças no editor
      console.log('📝 Aplicando mudanças no editor...');
      const editorSuccess = this.applyReindexingToEditor(editor, reindexResult.newContent, reindexResult.reindexingMap);
      
      if (!editorSuccess) {
        console.error('❌ Falha ao aplicar mudanças no editor - executando rollback');
        
        const rollbackSuccess = this.executeRollback(backup, editor, setReferenceMapping);
        
        return {
          success: false,
          error: new Error('Falha ao aplicar mudanças no editor'),
          backup,
          rollback: () => this.executeRollback(backup, editor, setReferenceMapping),
          rollbackExecuted: rollbackSuccess,
          operationId
        };
      }
      
      // 4. Atualizar referenceMapping
      console.log('🗺️ Atualizando referenceMapping...');
      let newReferenceMapping;
      try {
        newReferenceMapping = this.updateReferenceMapping(referenceMapping, reindexResult.reindexingMap);
        if (setReferenceMapping && typeof setReferenceMapping === 'function') {
          setReferenceMapping(newReferenceMapping);
        }
      } catch (mappingError) {
        console.error('❌ Falha ao atualizar referenceMapping - executando rollback');
        
        const rollbackSuccess = this.executeRollback(backup, editor, setReferenceMapping);
        
        return {
          success: false,
          error: mappingError,
          backup,
          rollback: () => this.executeRollback(backup, editor, setReferenceMapping),
          rollbackExecuted: rollbackSuccess,
          operationId
        };
      }
      
      // 5. Validar integridade pós-reindexação
      console.log('🔍 Validando integridade pós-reindexação...');
      const validation = this.validatePostReindexingIntegrity(
        reindexResult.newContent, 
        newReferenceMapping, 
        reindexResult.reindexingMap
      );
      
      // 6. Verificar se validação passou ou se deve fazer rollback
      if (!validation.isValid && validation.errors.length > 0) {
        console.error('❌ Validação pós-reindexação falhou - executando rollback');
        console.error('❌ Erros de validação:', validation.errors);
        
        const rollbackSuccess = this.executeRollback(backup, editor, setReferenceMapping);
        
        return {
          success: false,
          error: new Error(`Validação falhou: ${validation.errors.join(', ')}`),
          backup,
          rollback: () => this.executeRollback(backup, editor, setReferenceMapping),
          rollbackExecuted: rollbackSuccess,
          validation,
          operationId
        };
      }
      
      // 7. Sucesso - retornar resultado com capacidade de rollback
      console.log('✅ Reindexação concluída com sucesso');
      
      return {
        success: true,
        result: {
          ...reindexResult,
          newReferenceMapping,
          validation
        },
        backup,
        rollback: () => this.executeRollback(backup, editor, setReferenceMapping),
        validation,
        operationId
      };
      
    } catch (error) {
      console.error('❌ Erro crítico durante reindexação com error handling:', error);
      
      // Tentar rollback mesmo em caso de erro crítico
      try {
        const backup = this.createStateBackup(editor, referenceMapping, operationId);
        const rollbackSuccess = this.executeRollback(backup, editor, setReferenceMapping);
        
        return {
          success: false,
          error,
          backup,
          rollback: () => this.executeRollback(backup, editor, setReferenceMapping),
          rollbackExecuted: rollbackSuccess,
          operationId
        };
      } catch (rollbackError) {
        console.error('❌ Erro crítico também no rollback:', rollbackError);
        
        return {
          success: false,
          error,
          rollbackError,
          operationId
        };
      }
    }
  }

  /**
   * Método principal com sistema completo de error handling, rollback e recuperação
   * @param {string} editorContent - Conteúdo atual do editor
   * @param {InsertionContext} insertionContext - Contexto da inserção
   * @param {Object} editor - Instância do editor
   * @param {Map} referenceMapping - Mapeamento atual título ↔ marcador
   * @param {Function} setReferenceMapping - Função para atualizar referenceMapping
   * @param {Object} options - Opções de configuração
   * @returns {RollbackableResult} Resultado completo com todas as funcionalidades
   */
  static executeReindexingWithFullErrorHandling(editorContent, insertionContext, editor, referenceMapping, setReferenceMapping, options = {}) {
    const operationId = `full_reindex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('🛡️ Executando reindexação com sistema completo de error handling');
      console.log(`🆔 ID da operação: ${operationId}`);
      
      const {
        enableAutoRecovery = true,
        strictValidation = true,
        preserveFunctionality = true,
        maxRetryAttempts = 2
      } = options;
      
      let attempt = 0;
      let lastError = null;
      
      while (attempt <= maxRetryAttempts) {
        try {
          console.log(`🔄 Tentativa ${attempt + 1}/${maxRetryAttempts + 1}`);
          
          // Executar reindexação com error handling básico
          const result = this.reindexWithErrorHandling(
            editorContent, 
            insertionContext, 
            editor, 
            referenceMapping, 
            setReferenceMapping
          );
          
          if (result.success) {
            // Validação adicional com recuperação automática se habilitada
            if (enableAutoRecovery) {
              console.log('🔍 Executando validação com recuperação automática...');
              
              const recoveryResult = this.validateWithAutoRecovery(
                result.result.newContent,
                result.result.newReferenceMapping,
                { 
                  attemptAutoFix: true, 
                  strictMode: strictValidation,
                  maxFixAttempts: 3
                }
              );
              
              if (recoveryResult.autoRecoveryUsed) {
                console.log('🔧 Recuperação automática aplicada');
                
                // Aplicar correções se necessário
                if (recoveryResult.finalContent !== result.result.newContent) {
                  this.applyReindexingToEditor(editor, recoveryResult.finalContent, []);
                }
                
                if (recoveryResult.finalMapping !== result.result.newReferenceMapping) {
                  setReferenceMapping(recoveryResult.finalMapping);
                }
                
                // Atualizar resultado com correções
                result.result.newContent = recoveryResult.finalContent;
                result.result.newReferenceMapping = recoveryResult.finalMapping;
                result.autoRecoveryApplied = recoveryResult.fixesApplied;
              }
              
              result.validation = recoveryResult;
            }
            
            console.log('✅ Reindexação concluída com sucesso (com error handling completo)');
            
            return {
              ...result,
              operationId,
              attempt: attempt + 1,
              totalAttempts: maxRetryAttempts + 1,
              errorHandlingLevel: 'full'
            };
          }
          
          lastError = result.error;
          console.warn(`⚠️ Tentativa ${attempt + 1} falhou:`, result.error.message);
          
          // Se não é a última tentativa, aguardar um pouco antes de tentar novamente
          if (attempt < maxRetryAttempts) {
            console.log('⏳ Aguardando antes da próxima tentativa...');
            // Usar setTimeout síncrono para evitar async/await
            const delay = 100 * (attempt + 1);
            const start = Date.now();
            while (Date.now() - start < delay) {
              // Busy wait para simular delay
            }
          }
          
        } catch (attemptError) {
          lastError = attemptError;
          console.error(`❌ Erro na tentativa ${attempt + 1}:`, attemptError);
        }
        
        attempt++;
      }
      
      // Todas as tentativas falharam
      console.error('❌ Todas as tentativas de reindexação falharam');
      
      if (preserveFunctionality) {
        console.log('🛡️ Preservando funcionalidade básica...');
        
        const fallbackState = this.preserveBasicFunctionality(lastError, {
          editor,
          referenceMapping,
          editorContent,
          insertionContext
        });
        
        return {
          success: false,
          error: lastError,
          fallbackState,
          operationId,
          totalAttempts: attempt,
          errorHandlingLevel: 'full',
          functionalityPreserved: true
        };
      }
      
      return {
        success: false,
        error: lastError,
        operationId,
        totalAttempts: attempt,
        errorHandlingLevel: 'full',
        functionalityPreserved: false
      };
      
    } catch (criticalError) {
      console.error('❌ Erro crítico no sistema de error handling completo:', criticalError);
      
      if (preserveFunctionality) {
        const fallbackState = this.preserveBasicFunctionality(criticalError, {
          editor,
          referenceMapping,
          editorContent,
          insertionContext
        });
        
        return {
          success: false,
          error: criticalError,
          fallbackState,
          operationId,
          errorHandlingLevel: 'critical_failure',
          functionalityPreserved: true
        };
      }
      
      return {
        success: false,
        error: criticalError,
        operationId,
        errorHandlingLevel: 'critical_failure',
        functionalityPreserved: false
      };
    }
  }
}

export default MarkerReindexingService;