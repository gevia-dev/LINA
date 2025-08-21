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
  referenceMapping = null
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
      if (!currentEdges || !previousEdges || !Array.isArray(currentEdges) || !Array.isArray(previousEdges)) {
        return [];
      }

      const newConnections = [];
      const currentEdgeHashes = new Set();
      const previousEdgeHashes = new Set();

      // 1) Estratégia por id (mais confiável com React Flow)
      const prevIds = new Set(previousEdges.map(e => e && e.id).filter(Boolean));
      const candidatesById = [];
      currentEdges.forEach(edge => {
        if (edge && edge.id && !prevIds.has(edge.id) && !lastProcessedEdges.has(edge.id)) {
          // Verificar se não é uma conexão que já está aguardando
          const isWaiting = Array.from(connectionHistoryRef.current.values()).some(
            history => (history.result?.reason === 'waiting_for_second_connection' || 
                       history.result?.reason === 'waiting_for_system_connection') && 
                      (history.result?.nodeId === edge.source || history.result?.nodeId === edge.target)
          );
          
          if (!isWaiting) {
            candidatesById.push({ edge, hash: edge.id, timestamp: Date.now() });
          } else {
            console.log('⏳ Ignorando nova conexão - node já está aguardando:', edge.id);
          }
        }
      });
      if (candidatesById.length > 0) {
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
          // Verificar se não é uma conexão que já está aguardando
          const isWaiting = Array.from(connectionHistoryRef.current.values()).some(
            history => (history.result?.reason === 'waiting_for_second_connection' || 
                       history.result?.reason === 'waiting_for_system_connection') && 
                      (history.result?.nodeId === edge.source || history.result?.nodeId === edge.target)
          );
          
          if (!isWaiting) {
            newConnections.push({ edge, hash, timestamp: Date.now() });
          } else {
            console.log('⏳ Ignorando nova conexão - node já está aguardando:', hash);
          }
        }
      });

      return newConnections;

    } catch (error) {
      return [];
    }
  }, [generateEdgeHash, lastProcessedEdges, isInitialized]);

  /**
   * NOVA FUNÇÃO INTELIGENTE: Verifica se uma conexão aguardando agora tem conexões suficientes
   */
  const checkWaitingConnections = useCallback((currentEdges) => {
    try {
      const waitingConnections = Array.from(connectionHistoryRef.current.values()).filter(
        history => history.result?.reason === 'waiting_for_second_connection' || 
                   history.result?.reason === 'waiting_for_system_connection'
      );
      
      if (waitingConnections.length === 0) {
        return [];
      }
      
      console.log('🔍 Verificando conexões aguardando:', waitingConnections.length);
      
      const readyConnections = [];
      
      waitingConnections.forEach(history => {
        const { nodeId, reason, requiredConnections, isSystemInsertion } = history.result;
        const nodeConnections = currentEdges.filter(edge => 
          edge.source === nodeId || edge.target === nodeId
        );
        
        console.log(`🔗 Node ${nodeId}: ${nodeConnections.length}/${requiredConnections || 2} conexões (${reason})`);
        
        // Verificar se tem conexões suficientes baseado no tipo de espera
        const hasEnoughConnections = reason === 'waiting_for_system_connection' 
          ? nodeConnections.length >= 1  // Inserção no início/fim precisa apenas de 1
          : nodeConnections.length >= 2; // Inserção no meio precisa de 2
        
        if (hasEnoughConnections) {
          console.log(`✅ Node ${nodeId} agora tem conexões suficientes!`);
          readyConnections.push({
            ...history,
            hash: history.hash,
            timestamp: Date.now(),
            currentConnections: nodeConnections.length,
            requiredConnections: requiredConnections || 2
          });
        }
      });
      
      return readyConnections;
    } catch (error) {
      console.error('❌ Erro ao verificar conexões aguardando:', error);
      return [];
    }
  }, []);

  /**
   * Processa uma conexão individual
   */
  const processConnection = useCallback(async (connectionData) => {
    try {
      const { edge, hash } = connectionData;
      
      // Verificar se esta conexão já foi processada
      if (lastProcessedEdges.has(hash)) {
        console.log('⏭️ Conexão já processada, ignorando:', hash);
        return { success: true, hash, result: { reason: 'already_processed' } };
      }
      
      // NOVA LÓGICA: Processar via helper principal (sem editorRef)
      const result = await handleCanvasConnection(edge, nodes, edges, referenceMapping);
      
      if (result.success) {
        // Se está aguardando segunda conexão, registrar no histórico para monitoramento
        if (result.reason === 'waiting_for_second_connection' || result.reason === 'waiting_for_system_connection') {
          console.log('⏳ Conexão aguardando:', result.reason === 'waiting_for_system_connection' ? 'sistema' : 'segunda conexão');
          console.log('📊 Status:', result.currentConnections, '/', result.requiredConnections);
          
          // Registrar no histórico para monitoramento inteligente
          connectionHistoryRef.current.set(hash, {
            ...connectionData,
            result,
            timestamp: Date.now()
          });
          
          return { success: true, hash, result, waiting: true };
        }
        
        // Se texto já foi inserido, marcar como processado
        if (result.reason === 'text_already_inserted') {
          console.log('🛑 Texto já inserido, marcando como processado:', result.textHash);
          setLastProcessedEdges(prev => new Set([...prev, hash]));
          return { success: true, hash, result, reason: 'text_already_inserted' };
        }
        
        // NOVA LÓGICA: Se está pronto para inserção, retornar informações para o componente pai
        if (result.reason === 'ready_for_insertion') {
          console.log('✅ Conexão pronta para inserção declarativa:', result.insertionInfo);
          
          // Marcar como processada
          setLastProcessedEdges(prev => new Set([...prev, hash]));
          
          // Registrar no histórico
          connectionHistoryRef.current.set(hash, {
            ...connectionData,
            result,
            processedAt: Date.now()
          });
          
          // Retornar informações de inserção para o componente pai processar
          return { 
            success: true, 
            hash, 
            result, 
            readyForInsertion: true,
            insertionData: result.insertionInfo
          };
        }
        
        // Marcar como processada apenas se não estiver aguardando
        setLastProcessedEdges(prev => new Set([...prev, hash]));
        
        // Registrar no histórico
        connectionHistoryRef.current.set(hash, {
          ...connectionData,
          result,
          processedAt: Date.now()
        });
        
        return { success: true, hash, result };
      } else {
        // Adicionar à fila de retry se necessário
        if (result.error !== 'Parâmetros inválidos' && result.error !== 'Nodes não encontrados') {
          setProcessingQueue(prev => [...prev, { ...connectionData, retryCount: (connectionData.retryCount || 0) + 1 }]);
        }
        
        return { success: false, hash, error: result.error };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [nodes, edges, referenceMapping, lastProcessedEdges]);

  /**
   * Processa fila de conexões pendentes
   */
  const processQueue = useCallback(async () => {
    if (isProcessing || processingQueue.length === 0) return;

    try {
      setIsProcessing(true);

      const currentQueue = [...processingQueue];
      setProcessingQueue([]);

      for (const connectionData of currentQueue) {
        if (!isActive) break; // Parar se hook foi desativado

        const result = await processConnection(connectionData);
        
        // NOVA LÓGICA: Verificar se há inserção pendente
        if (result.readyForInsertion) {
          console.log('📝 Inserção pendente detectada na fila:', result.insertionData);
          setPendingInsertion(result.insertionData);
        }
        
        // Aguardar um pouco entre processamentos para não sobrecarregar
        if (currentQueue.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 50)); // Reduzido para 50ms
        }
      }

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
      setIsInitialized(true);
      previousEdgesRef.current = [...edges];
      previousNodesRef.current = [...nodes];
      return;
    }

    // Se ainda não há edges, aguardar a inicialização do canvas
    if (edges.length === 0) {
      return;
    }

    // Se é a primeira vez que temos edges após inicialização, apenas armazenar sem processar
    if (previousEdgesRef.current.length === 0 && edges.length > 0) {
      previousEdgesRef.current = [...edges];
      previousNodesRef.current = [...nodes];
      return;
    }

    // NOVA LÓGICA INTELIGENTE: Primeiro verificar conexões aguardando
    const readyConnections = checkWaitingConnections(edges);
    if (readyConnections.length > 0) {
      console.log('🚀 Processando conexões que agora estão prontas:', readyConnections.length);
      
      // Processar conexões prontas imediatamente
      readyConnections.forEach(connection => {
        const { hash } = connection;
        // Remover do histórico de aguardando
        connectionHistoryRef.current.delete(hash);
        // Marcar como processada
        setLastProcessedEdges(prev => new Set([...prev, hash]));
        // Processar a conexão original
        processConnection(connection);
      });
    }

    // Detectar novas conexões
    const newConnections = detectNewConnections(edges, previousEdgesRef.current);
    
    if (newConnections.length > 0) {
      processNewConnections(newConnections);
    }

    // Atualizar referências para próxima comparação
    previousEdgesRef.current = [...edges];
    previousNodesRef.current = [...nodes];

  }, [edges, nodes, isActive, detectNewConnections, processNewConnections, isInitialized, checkWaitingConnections, processConnection]);

  // Estado para armazenar informações de inserção pendente
  const [pendingInsertion, setPendingInsertion] = useState(null);

  /**
   * Efeito para processar fila quando disponível
   */
  useEffect(() => {
    if (processingQueue.length > 0 && !isProcessing) {
      processQueue();
    }
  }, [processingQueue, isProcessing, processQueue]);

  /**
   * Efeito para processar inserções pendentes
   */
  useEffect(() => {
    if (pendingInsertion) {
      console.log('📝 Inserção pendente detectada:', pendingInsertion);
      // O componente pai deve processar esta inserção
    }
  }, [pendingInsertion]);

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
      
      // Verificar se há inserção pendente
      if (result.readyForInsertion) {
        setPendingInsertion(result.insertionData);
      }
      
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
    setPendingInsertion(null);
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
    const waitingConnections = Array.from(connectionHistoryRef.current.values()).filter(
      history => history.result?.reason === 'waiting_for_second_connection' || 
                 history.result?.reason === 'waiting_for_system_connection'
    );
    
    return {
      isActive,
      isProcessing,
      queueLength: processingQueue.length,
      processedCount: lastProcessedEdges.size,
      historySize: connectionHistoryRef.current.size,
      waitingConnections: waitingConnections.length,
      lastProcessed: Array.from(lastProcessedEdges).slice(-5), // últimas 5 conexões
      waitingNodes: waitingConnections.map(w => w.result?.nodeId).filter(Boolean)
    };
  }, [isActive, isProcessing, processingQueue.length, lastProcessedEdges]);

  /**
   * Função para processar inserção pendente
   */
  const processPendingInsertion = useCallback(() => {
    const insertion = pendingInsertion;
    setPendingInsertion(null);
    return insertion;
  }, [pendingInsertion]);

  return {
    // Estado
    isActive,
    isProcessing,
    queueLength: processingQueue.length,
    pendingInsertion,
    
    // Funções de controle
    toggleSync,
    processConnectionManually,
    clearConnectionHistory,
    getSyncStats,
    processPendingInsertion,
    
    // Debug
    lastProcessedEdges: Array.from(lastProcessedEdges),
    connectionHistory: Array.from(connectionHistoryRef.current.entries())
  };
};
