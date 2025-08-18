// hooks/useTextSequenceSync.js
import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  getOrderedSequenceFromConnections, 
  reconstructFinalText, 
  detectInsertionPoint,
  insertNodeInSequence 
} from './connectionMappingUtils';

/**
 * Hook para sincronizar as conexões do React Flow com o texto do editor
 * @param {Object} options - Opções de configuração
 * @returns {Object} Funções e estados para gerenciar a sincronização
 */
export const useTextSequenceSync = ({
  nodes = [],
  edges = [],
  onTextUpdate = () => {},
  onMappingUpdate = () => {},
  editorRef = null,
  initialMapping = new Map()
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSequences, setCurrentSequences] = useState([]);
  const [textMapping, setTextMapping] = useState(initialMapping);
  const lastProcessedStateRef = useRef('');

  // Estado para detectar mudanças nas conexões
  const connectionStateRef = useRef({
    nodeCount: 0,
    edgeCount: 0,
    lastEdgeHash: ''
  });

  /**
   * Gera hash das edges para detectar mudanças
   */
  const generateEdgeHash = useCallback((edges) => {
    return edges
      .map(e => `${e.source}->${e.target}`)
      .sort()
      .join('|');
  }, []);

  /**
   * Verifica se houve mudanças significativas nas conexões
   */
  const hasConnectionChanges = useCallback(() => {
    const currentState = {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      lastEdgeHash: generateEdgeHash(edges)
    };

    const hasChanges = (
      currentState.nodeCount !== connectionStateRef.current.nodeCount ||
      currentState.edgeCount !== connectionStateRef.current.edgeCount ||
      currentState.lastEdgeHash !== connectionStateRef.current.lastEdgeHash
    );

    connectionStateRef.current = currentState;
    return hasChanges;
  }, [nodes, edges, generateEdgeHash]);

  /**
   * Reconstrói o texto baseado nas conexões atuais
   */
  const rebuildTextFromConnections = useCallback(async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      console.log('🔄 Reconstruindo texto a partir das conexões...');

      // 1. Mapear sequência ordenada das conexões
      const sequencesBySegment = getOrderedSequenceFromConnections(nodes, edges);
      
      if (sequencesBySegment.length === 0) {
        console.log('ℹ️ Nenhuma sequência de conexões encontrada');
        setIsProcessing(false);
        return;
      }

      console.log(`✅ ${sequencesBySegment.length} sequências encontradas:`, sequencesBySegment);

      // 2. Reconstruir o texto
      const { finalText, newMapping } = reconstructFinalText(sequencesBySegment, textMapping);

      // 3. Verificar se houve mudanças reais no texto
      const newStateHash = `${finalText.length}-${newMapping.size}`;
      if (newStateHash === lastProcessedStateRef.current) {
        console.log('ℹ️ Nenhuma mudança detectada no texto');
        setIsProcessing(false);
        return;
      }

      lastProcessedStateRef.current = newStateHash;

      // 4. Atualizar estados
      setCurrentSequences(sequencesBySegment);
      setTextMapping(newMapping);

      // 5. Notificar componentes pai
      onTextUpdate(finalText);
      onMappingUpdate(newMapping);

      // 6. Atualizar editor se disponível
      if (editorRef?.current?.editor) {
        try {
          // Aqui você pode implementar a lógica para atualizar o editor
          // Por exemplo, usando o método de inserção de conteúdo do BlockNote
          console.log('📝 Atualizando editor com novo texto...');
          
          // Se o editor tem método para substituir conteúdo completo
          if (editorRef.current.replaceContent) {
            editorRef.current.replaceContent(finalText);
          } else if (editorRef.current.insertContent) {
            editorRef.current.insertContent(finalText);
          }
        } catch (error) {
          console.error('❌ Erro ao atualizar editor:', error);
        }
      }

      console.log('✅ Texto reconstruído com sucesso:', {
        textLength: finalText.length,
        mappingSize: newMapping.size,
        sequences: sequencesBySegment.length
      });

    } catch (error) {
      console.error('❌ Erro ao reconstruir texto das conexões:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [nodes, edges, textMapping, onTextUpdate, onMappingUpdate, editorRef, isProcessing]);

  /**
   * Manipula a adição de uma nova conexão
   */
  const handleNewConnection = useCallback(async (connectionParams) => {
    try {
      console.log('🔗 Nova conexão detectada:', connectionParams);

      // Detectar ponto de inserção do novo node
      const insertionPoint = detectInsertionPoint(connectionParams.target, edges);
      
      console.log('📍 Ponto de inserção detectado:', insertionPoint);

      // Reconstruir texto com a nova conexão
      await rebuildTextFromConnections();

      return {
        success: true,
        insertionPoint
      };
    } catch (error) {
      console.error('❌ Erro ao processar nova conexão:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }, [edges, rebuildTextFromConnections]);

  /**
   * Manipula a remoção de uma conexão
   */
  const handleConnectionRemoval = useCallback(async (edgeId) => {
    try {
      console.log('🗑️ Conexão removida:', edgeId);

      // Reconstruir texto após remoção
      await rebuildTextFromConnections();

      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao processar remoção de conexão:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }, [rebuildTextFromConnections]);

  /**
   * Força uma reconstrução manual do texto
   */
  const forceRebuild = useCallback(() => {
    lastProcessedStateRef.current = ''; // Reset para forçar rebuild
    return rebuildTextFromConnections();
  }, [rebuildTextFromConnections]);

  // Effect para detectar mudanças nas conexões automaticamente
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (hasConnectionChanges()) {
        console.log('🔄 Mudanças nas conexões detectadas, reconstruindo texto...');
        rebuildTextFromConnections();
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, hasConnectionChanges, rebuildTextFromConnections]);

  return {
    // Estados
    isProcessing,
    currentSequences,
    textMapping,
    
    // Funções
    handleNewConnection,
    handleConnectionRemoval,
    rebuildTextFromConnections,
    forceRebuild,
    
    // Utilitários
    hasConnectionChanges: hasConnectionChanges()
  };
};