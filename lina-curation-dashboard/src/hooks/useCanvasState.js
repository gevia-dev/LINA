import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Hook para gerenciar estado do canvas ReactFlow
 * Converte newsData.core_structure para nodes/edges e vice-versa
 */
export const useCanvasState = (newsData) => {
  const [editingBlock, setEditingBlock] = useState(null);
  const [nodes, setNodes] = useState([]);

  // Função para fazer parse dos dados da notícia
  const parseNewsData = useCallback((coreStructure) => {
    if (!coreStructure) return null;
    
    try {
      if (typeof coreStructure === 'string') {
        return JSON.parse(coreStructure);
      } else {
        return coreStructure;
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      return null;
    }
  }, []);

  // Função para detectar se o conteúdo é válido (não é placeholder)
  const hasValidContent = useCallback((content) => {
    if (!content) return false;
    
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) return false;
    
    // Verificar se não é um placeholder
    const isPlaceholder = trimmedContent.includes('Clique para selecionar') || 
                         trimmedContent.includes('Clique novamente para editar');
    
    return !isPlaceholder;
  }, []);

  // Função para obter dados dos blocos
  const getBlockData = useCallback(() => {
    const parsedData = newsData?.core_structure ? parseNewsData(newsData.core_structure) : null;
    
    const introduce = parsedData?.Introduce || 'Clique para selecionar, clique novamente para editar a introdução da notícia...';
    const body = parsedData?.corpos_de_analise || 'Clique para selecionar, clique novamente para editar o corpo da notícia...';
    const conclusion = parsedData?.conclusoes || 'Clique para selecionar, clique novamente para editar a conclusão...';

    return [
      {
        id: 'summary',
        title: 'Introdução',
        content: introduce,
        minHeight: '60px',
        coreKey: 'Introduce'
      },
      {
        id: 'body',
        title: 'Corpo',
        content: body,
        minHeight: '80px',
        coreKey: 'corpos_de_analise'
      },
      {
        id: 'conclusion',
        title: 'Conclusão',
        content: conclusion,
        minHeight: '60px',
        coreKey: 'conclusoes'
      }
    ];
  }, [newsData, parseNewsData]);

  // Criar nodes do ReactFlow baseado nos dados dos blocos
  const createNodes = useCallback(() => {
    const blockData = getBlockData();
    
    return blockData.map((block, index) => {
      const hasContent = hasValidContent(block.content);
      
      return {
        id: block.id,
        type: 'cardNode',
        position: { 
          x: 50, 
          y: 50 + (index * 200) // Espaçamento vertical entre blocos
        },
        data: {
          id: block.id,
          title: block.title,
          content: block.content,
          minHeight: block.minHeight,
          coreKey: block.coreKey,
          isEditing: editingBlock === block.id,
          hasContent: hasContent,
          onEdit: (blockId) => {
            if (blockId === editingBlock) {
              setEditingBlock(null);
            } else {
              setEditingBlock(blockId);
            }
          },
          onTransfer: (blockId, content) => {
            // Esta função será fornecida pelo componente pai
        
          }
        }
      };
    });
  }, [getBlockData, editingBlock, hasValidContent]);

  // Converter nodes de volta para newsData
  const convertNodesToNewsData = useCallback((nodesToConvert = nodes) => {
    const coreStructure = {};
    
    nodesToConvert.forEach(node => {
      const { coreKey, content } = node.data;
      if (coreKey && content) {
        coreStructure[coreKey] = content;
      }
    });
    
    return coreStructure;
  }, [nodes]);

  // Atualizar nodes
  const updateNodes = useCallback((newNodes) => {
    setNodes(newNodes);
  }, []);

  // Atualizar conteúdo de um node específico
  const updateNodeContent = useCallback((nodeId, newContent) => {
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId 
          ? { 
              ...node, 
              data: { 
                ...node.data, 
                content: newContent,
                hasContent: hasValidContent(newContent)
              } 
            }
          : node
      )
    );
  }, [hasValidContent]);

  // Atualizar nodes quando dados mudarem
  useEffect(() => {
    const newNodes = createNodes();
    setNodes(newNodes);
  }, [createNodes]);

  // Memoizar valores para evitar re-renders desnecessários
  const memoizedNodes = useMemo(() => nodes, [nodes]);
  const memoizedEditingBlock = useMemo(() => editingBlock, [editingBlock]);

  return {
    nodes: memoizedNodes,
    editingBlock: memoizedEditingBlock,
    setEditingBlock,
    updateNodes,
    updateNodeContent,
    convertNodesToNewsData,
    hasValidContent
  };
}; 