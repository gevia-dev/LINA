// hooks/useSimplifiedTextSync.js
import { useState, useCallback, useEffect, useRef } from 'react';
import { handleCanvasConnection } from './textInsertionHelpers';

/**
 * Hook para sincronização simplificada de texto baseada em conexões do canvas
 * Detecta automaticamente novas edges e coordena a inserção de texto
 * @param {Object} options - Opções de configuração
 * @returns {Object} Estado e funções de controle da sincronização
 */
export const useSimplifiedTextSync = ({ 
  nodes = [], 
  edges = [], 
  editorRef = null,
  referenceMapping = null,
  onReferenceUpdate = null,
  onReindexing = null
}) => {
  // Estado da sincronização
  const [isActive, setIsActive] = useState(true);
  const [lastProcessedEdges, setLastProcessedEdges] = useState(new Set());
  const [processingQueue, setProcessingQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // Novo estado para controle de inicialização

  // Refs para controle de estado
  const previousEdgesRef = useRef([]);
  const previousNodesRef = useRef([]);
  const connectionHistoryRef = useRef(new Map());
  const processingTimeoutRef = useRef(null);

  /**
   * Gera hash único para uma edge baseado em seus parâmetros
   */
  const generateEdgeHash = useCallback((edge) => {
    // Prioriza id da edge para distinguir duplicatas com mesmos endpoints
    if (edge && edge.id) return String(edge.id);
    return `${edge.source}:${edge.target}:${edge.sourceHandle || ''}:${edge.targetHandle || ''}`;
  }, []);

  /**
   * Detecta novas conexões comparando arrays de edges
   */
  const detectNewConnections = useCallback((currentEdges, previousEdges) => {
    try {
      // Se ainda não foi inicializado, não processar conexões existentes
      if (!isInitialized) {
        console.log('⏳ Hook ainda não inicializado, ignorando conexões existentes');
        return [];
      }

      console.log('🔍 Detectando novas conexões...');
      console.log('📊 Edges atuais:', currentEdges.length, 'Edges anteriores:', previousEdges.length);

      const newConnections = [];
      const currentEdgeHashes = new Set();
      const previousEdgeHashes = new Set();

      // 1) Estratégia por id (mais confiável com React Flow)
      const prevIds = new Set(previousEdges.map(e => e && e.id).filter(Boolean));
      const candidatesById = [];
      currentEdges.forEach(edge => {
        if (edge && edge.id && !prevIds.has(edge.id) && !lastProcessedEdges.has(edge.id)) {
          candidatesById.push({ edge, hash: edge.id, timestamp: Date.now() });
        }
      });
      if (candidatesById.length > 0) {
        console.log(`🆕 Novas conexões por id detectadas: ${candidatesById.length}`);
        return candidatesById;
      }

      // 2) Fallback: Estratégia por hash (endpoints/handles)
      currentEdges.forEach(edge => {
        const hash = generateEdgeHash(edge);
        currentEdgeHashes.add(hash);
      });

      // Gerar hashes para edges anteriores
      previousEdges.forEach(edge => {
        const hash = generateEdgeHash(edge);
        previousEdgeHashes.add(hash);
      });

      // Encontrar edges que são novas (estão em current mas não em previous)
      currentEdges.forEach(edge => {
        const hash = generateEdgeHash(edge);
        if (!previousEdgeHashes.has(hash) && !lastProcessedEdges.has(hash)) {
          console.log('🆕 Nova conexão detectada (hash):', { id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle });
          newConnections.push({ edge, hash, timestamp: Date.now() });
        }
      });

      console.log(`✅ ${newConnections.length} novas conexões detectadas`);
      return newConnections;

    } catch (error) {
      console.error('❌ Erro ao detectar novas conexões:', error);
      return [];
    }
  }, [generateEdgeHash, lastProcessedEdges, isInitialized]);

  /**
   * Processa uma conexão individual
   */
  const processConnection = useCallback(async (connectionData) => {
    try {
      console.log('⚙️ Processando conexão:', connectionData.edge);
      
      const { edge, hash } = connectionData;
      
      // Marcar como processada
      setLastProcessedEdges(prev => new Set([...prev, hash]));
      
      // Processar via helper principal
      const result = await handleCanvasConnection(edge, nodes, edges, editorRef, referenceMapping, onReferenceUpdate, onReindexing);
      
      if (result.success) {
        console.log('✅ Conexão processada com sucesso:', result.message);
        
        // Registrar no histórico
        connectionHistoryRef.current.set(hash, {
          ...connectionData,
          result,
          processedAt: Date.now()
        });
        
        return { success: true, hash, result };
      } else {
        console.error('❌ Falha ao processar conexão:', result.error);
        
        // Adicionar à fila de retry se necessário
        if (result.error !== 'Parâmetros inválidos' && result.error !== 'Nodes não encontrados') {
          setProcessingQueue(prev => [...prev, { ...connectionData, retryCount: 0 }]);
        }
        
        return { success: false, hash, error: result.error };
      }

    } catch (error) {
      console.error('❌ Erro interno ao processar conexão:', error);
      return { success: false, error: error.message };
    }
  }, [nodes, edges, editorRef, referenceMapping, onReferenceUpdate]);

  /**
   * Processa fila de conexões pendentes
   */
  const processQueue = useCallback(async () => {
    if (isProcessing || processingQueue.length === 0) return;

    try {
      setIsProcessing(true);
      console.log(`🔄 Processando fila de ${processingQueue.length} conexões...`);

      const currentQueue = [...processingQueue];
      setProcessingQueue([]);

      for (const connectionData of currentQueue) {
        if (!isActive) break; // Parar se hook foi desativado

        const result = await processConnection(connectionData);
        
        // Aguardar um pouco entre processamentos para não sobrecarregar
        if (currentQueue.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log('✅ Fila de processamento concluída');

    } catch (error) {
      console.error('❌ Erro ao processar fila:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, processingQueue, isActive, processConnection]);

  /**
   * Processa novas conexões detectadas
   */
  const processNewConnections = useCallback(async (newConnections) => {
    if (!isActive || newConnections.length === 0) return;

    console.log(`🚀 Processando ${newConnections.length} novas conexões...`);

    // Adicionar à fila de processamento
    setProcessingQueue(prev => [...prev, ...newConnections]);

    // Processar fila se não estiver sendo processada
    if (!isProcessing) {
      // Usar timeout para evitar processamento síncrono excessivo
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      processingTimeoutRef.current = setTimeout(() => {
        processQueue();
      }, 50);
    }
  }, [isActive, isProcessing, processQueue]);

  /**
   * Efeito principal para detectar mudanças nas conexões
   */
  useEffect(() => {
    if (!isActive) return;

    // Na primeira execução, apenas marcar como inicializado sem processar
    if (!isInitialized) {
      console.log('🚀 Hook inicializado, armazenando estado inicial das conexões');
      setIsInitialized(true);
      previousEdgesRef.current = [...edges];
      previousNodesRef.current = [...nodes];
      return;
    }

    // Se ainda não há edges, aguardar a inicialização do canvas
    if (edges.length === 0) {
      console.log('⏳ Canvas ainda não inicializado, aguardando...');
      return;
    }

    // Se é a primeira vez que temos edges após inicialização, apenas armazenar sem processar
    if (previousEdgesRef.current.length === 0 && edges.length > 0) {
      console.log('📊 Primeira carga de conexões do canvas, armazenando estado inicial');
      previousEdgesRef.current = [...edges];
      previousNodesRef.current = [...nodes];
      return;
    }

    console.log('👀 Monitorando mudanças nas conexões...');

    // Detectar novas conexões
    const newConnections = detectNewConnections(edges, previousEdgesRef.current);
    
    if (newConnections.length > 0) {
      processNewConnections(newConnections);
    }

    // Atualizar referências para próxima comparação
    previousEdgesRef.current = [...edges];
    previousNodesRef.current = [...nodes];

  }, [edges, nodes, isActive, detectNewConnections, processNewConnections, isInitialized]);

  /**
   * Efeito para processar fila quando disponível
   */
  useEffect(() => {
    if (processingQueue.length > 0 && !isProcessing) {
      processQueue();
    }
  }, [processingQueue, isProcessing, processQueue]);

  /**
   * Limpeza ao desmontar
   */
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Função para processar conexão manualmente
   */
  const processConnectionManually = useCallback(async (connectionParams) => {
    try {
      console.log('🔧 Processamento manual de conexão:', connectionParams);
      
      const result = await processConnection({
        edge: connectionParams,
        hash: generateEdgeHash(connectionParams),
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.error('❌ Erro no processamento manual:', error);
      return { success: false, error: error.message };
    }
  }, [processConnection, generateEdgeHash]);

  /**
   * Função para limpar histórico de conexões processadas
   */
  const clearConnectionHistory = useCallback(() => {
    console.log('🧹 Limpando histórico de conexões...');
    setLastProcessedEdges(new Set());
    connectionHistoryRef.current.clear();
    setProcessingQueue([]);
  }, []);

  /**
   * Função para pausar/retomar sincronização
   */
  const toggleSync = useCallback(() => {
    const newState = !isActive;
    setIsActive(newState);
    console.log(newState ? '▶️ Sincronização ativada' : '⏸️ Sincronização pausada');
  }, [isActive]);

  /**
   * Função para obter estatísticas da sincronização
   */
  const getSyncStats = useCallback(() => {
    return {
      isActive,
      isProcessing,
      queueLength: processingQueue.length,
      processedCount: lastProcessedEdges.size,
      historySize: connectionHistoryRef.current.size,
      lastProcessed: Array.from(lastProcessedEdges).slice(-5) // últimas 5 conexões
    };
  }, [isActive, isProcessing, processingQueue.length, lastProcessedEdges]);

  return {
    // Estado
    isActive,
    isProcessing,
    queueLength: processingQueue.length,
    
    // Funções de controle
    toggleSync,
    processConnectionManually,
    clearConnectionHistory,
    getSyncStats,
    
    // Debug
    lastProcessedEdges: Array.from(lastProcessedEdges),
    connectionHistory: Array.from(connectionHistoryRef.current.entries())
  };
};
