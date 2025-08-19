// utils/textInsertionHelpers.js

/**
 * Encontra a posição ideal para inserir texto baseado nas conexões do canvas
 * @param {string} newNodeId - ID do novo node sendo inserido
 * @param {Array} nodes - Array de nodes do React Flow
 * @param {Array} edges - Array de edges do React Flow
 * @returns {Object} Informações sobre a posição de inserção
 */
export const findInsertionPosition = (newNodeId, nodes, edges) => {
  try {
    console.log('🔍 Procurando posição de inserção para node:', newNodeId);
    console.log('📊 Total de nodes:', nodes.length, 'Total de edges:', edges.length);

    // Encontrar o node que está sendo inserido
    const targetNode = nodes.find(n => n.id === newNodeId);
    if (!targetNode) {
      console.error('❌ Node não encontrado:', newNodeId);
      return null;
    }

    console.log('🎯 Node alvo encontrado:', targetNode);

    // Encontrar conexões relacionadas ao novo node
    const incomingEdges = edges.filter(e => e.target === newNodeId);
    const outgoingEdges = edges.filter(e => e.source === newNodeId);

    console.log('📥 Conexões de entrada:', incomingEdges.length);
    console.log('📤 Conexões de saída:', outgoingEdges.length);

    // Determinar posição de inserção baseada no contexto
    let insertionInfo = {
      position: 'end', // padrão
      referenceText: '',
      searchText: '',
      offset: 0
    };

    if (incomingEdges.length > 0) {
      // Node tem conexões de entrada - inserir APÓS o último node conectado
      const lastIncomingNode = nodes.find(n => n.id === incomingEdges[incomingEdges.length - 1].source);
      if (lastIncomingNode) {
        insertionInfo.position = 'after';
        insertionInfo.referenceText = lastIncomingNode.data?.content || lastIncomingNode.data?.text || '';
        insertionInfo.searchText = lastIncomingNode.data?.content || lastIncomingNode.data?.text || '';
        console.log('📍 Inserir APÓS node:', lastIncomingNode.id);
      }
    } else if (outgoingEdges.length > 0) {
      // Node tem apenas conexões de saída - inserir ANTES do primeiro node conectado
      const firstOutgoingNode = nodes.find(n => n.id === outgoingEdges[0].target);
      if (firstOutgoingNode) {
        insertionInfo.position = 'before';
        insertionInfo.referenceText = firstOutgoingNode.data?.content || firstOutgoingNode.data?.text || '';
        insertionInfo.searchText = firstOutgoingNode.data?.content || firstOutgoingNode.data?.text || '';
        console.log('📍 Inserir ANTES do node:', firstOutgoingNode.id);
      }
    } else {
      // Node isolado - inserir no final
      console.log('📍 Node isolado - inserir no final do documento');
    }

    console.log('✅ Informações de inserção determinadas:', insertionInfo);
    return insertionInfo;

  } catch (error) {
    console.error('❌ Erro ao encontrar posição de inserção:', error);
    return null;
  }
};

/**
 * Insere texto de forma segura usando a API nativa do TipTap
 * @param {Object} editor - Referência do editor TipTap
 * @param {Object} insertionInfo - Informações sobre onde inserir o texto
 * @param {string} newText - Texto a ser inserido
 * @returns {boolean} Sucesso da operação
 */
export const insertTextAtPosition = (editor, insertionInfo, newText) => {
  try {
    console.log('✏️ Iniciando inserção de texto:', { insertionInfo, newText });

    if (!editor || !editor._tiptapEditor) {
      console.error('❌ Editor TipTap não disponível');
      return false;
    }

    const tiptap = editor._tiptapEditor;
    console.log('🔧 Editor TipTap disponível, comandos:', Object.keys(tiptap.commands));

    if (!insertionInfo || !newText) {
      console.error('❌ Informações de inserção ou texto inválidos');
      return false;
    }

    // Buscar texto de referência no documento
    let searchPosition = null;
    const searchText = insertionInfo.searchText.toLowerCase();

    if (searchText) {
      console.log('🔍 Procurando texto de referência:', searchText);
      
      // Buscar no documento TipTap
      tiptap.state.doc.descendants((node, pos) => {
        if (node.isText && node.text.toLowerCase().includes(searchText)) {
          searchPosition = pos;
          console.log('✅ Texto encontrado na posição:', pos);
          return false; // parar busca
        }
      });
    }

    if (searchPosition === null && insertionInfo.position !== 'end') {
      console.log('⚠️ Texto de referência não encontrado, inserindo no final');
      insertionInfo.position = 'end';
    }

    // Aplicar inserção baseada na posição
    let success = false;

    switch (insertionInfo.position) {
      case 'after':
        if (searchPosition !== null) {
          const insertPos = searchPosition + (insertionInfo.referenceText?.length || 0);
          console.log('📍 Inserindo APÓS posição:', insertPos);
          success = tiptap.commands.insertContentAt(insertPos, newText);
        }
        break;

      case 'before':
        if (searchPosition !== null) {
          console.log('📍 Inserindo ANTES da posição:', searchPosition);
          success = tiptap.commands.insertContentAt(searchPosition, newText);
        }
        break;

      case 'end':
      default:
        console.log('📍 Inserindo no FINAL do documento');
        success = tiptap.commands.insertContent(newText);
        break;
    }

    if (success) {
      console.log('✅ Texto inserido com sucesso');
      // Focar no editor após inserção
      tiptap.commands.focus();
      return true;
    } else {
      console.error('❌ Falha ao inserir texto via TipTap');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro ao inserir texto:', error);
    return false;
  }
};

/**
 * Coordenador principal do sistema de conexões do canvas
 * @param {Object} connectionParams - Parâmetros da conexão
 * @param {Array} nodes - Array atual de nodes
 * @param {Array} edges - Array atual de edges
 * @param {Object} editorRef - Referência do editor
 * @param {Map} referenceMapping - Mapeamento de títulos para marcadores [n]
 * @param {Function} onReferenceUpdate - Callback para atualizar referenceMapping
 * @returns {Object} Resultado da operação
 */
export const handleCanvasConnection = async (connectionParams, nodes, edges, editorRef, referenceMapping = null, onReferenceUpdate = null, onReindexing = null) => {
  const { source, target } = connectionParams;
  
  console.log('🔍 === DEBUG INSERÇÃO ===');
  console.log('📊 Parâmetros:', { source, target });
  console.log('📊 Nodes disponíveis:', nodes.map(n => ({ id: n.id, type: n.type, title: n.data?.title, hasPhrase: !!n.data?.phrase })));
  
  // Encontrar ambos os nodes da conexão
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  
  console.log('🔍 Source Node:', sourceNode ? { id: sourceNode.id, type: sourceNode.type, title: sourceNode.data?.title, hasPhrase: !!sourceNode.data?.phrase } : 'NÃO ENCONTRADO');
  console.log('🔍 Target Node:', targetNode ? { id: targetNode.id, type: targetNode.type, title: targetNode.data?.title, hasPhrase: !!targetNode.data?.phrase } : 'NÃO ENCONTRADO');
  
  // Verificar qual node tem frase para inserir (priorizar target, depois source)
  let nodeToInsert = null;
  let insertionInfo = null;
  
  if (targetNode && targetNode.type === 'itemNode' && targetNode.data?.phrase) {
    nodeToInsert = targetNode;
    console.log('✅ Target node selecionado para inserção');
    // Inserir após o source node
    if (sourceNode && sourceNode.data) {
      insertionInfo = {
        position: 'after',
        searchText: sourceNode.data.title || sourceNode.data.phrase,
        sourceNode: sourceNode
      };
      console.log('📍 Inserir APÓS source:', insertionInfo.searchText);
    } else {
      insertionInfo = { position: 'end', searchText: null };
      console.log('📍 Inserir no FINAL (source sem dados)');
    }
  } else if (sourceNode && sourceNode.type === 'itemNode' && sourceNode.data?.phrase) {
    nodeToInsert = sourceNode;
    console.log('✅ Source node selecionado para inserção');
    // Inserir antes do target node
    if (targetNode && targetNode.data) {
      insertionInfo = {
        position: 'before', 
        searchText: targetNode.data.title || targetNode.data.phrase,
        targetNode: targetNode
      };
      console.log('📍 Inserir ANTES de target:', insertionInfo.searchText);
    } else {
      insertionInfo = { position: 'end', searchText: null };
      console.log('📍 Inserir no FINAL (target sem dados)');
    }
  } else {
    console.log('❌ Nenhum node com frase encontrado para inserção');
  }
  
  if (!nodeToInsert) {
    console.log('❌ Retornando: Conexão sem texto para inserir');
    return { success: true, message: 'Conexão sem texto para inserir' };
  }
  
  console.log('📝 Node para inserir:', { title: nodeToInsert.data.title, phrase: nodeToInsert.data.phrase });
  console.log('📝 Info de inserção:', insertionInfo);
  
  // SOLUÇÃO KISS/DRY: Se ambos os nodes já estão mapeados, não fazer nada
  if (insertionInfo.searchText && referenceMapping) {
    const searchMarker = referenceMapping.get(insertionInfo.searchText.trim());
    console.log('🔍 Verificando mapeamento para:', insertionInfo.searchText.trim());
    console.log('🔍 Marcador encontrado:', searchMarker);
    
    if (searchMarker) {
      const sourceTitle = sourceNode?.data?.title?.trim();
      const targetTitle = targetNode?.data?.title?.trim();
      const sourceMapped = sourceTitle && referenceMapping.get(sourceTitle);
      const targetMapped = targetTitle && referenceMapping.get(targetTitle);
      
      console.log('🔍 Verificando se ambos estão mapeados:');
      console.log('  - Source mapeado:', sourceMapped);
      console.log('  - Target mapeado:', targetMapped);
      
      if (sourceMapped && targetMapped) {
        console.log('🛑 AMBOS OS NODES JÁ MAPEADOS - Conexão ignorada');
        return { 
          success: true, 
          message: 'Conexão entre nodes já mapeados ignorada (texto não alterado)',
          reason: 'both_nodes_already_mapped'
        };
      }
      
      console.log('✅ Pelo menos um node não está mapeado - continuando inserção');
    }
  }
  
  // Preparar o texto a ser inserido
  const textToInsert = nodeToInsert.data.phrase;
  console.log('✍️ Texto a inserir:', textToInsert);
  
  // Converter título para marcador usando referenceMapping
  let searchText = insertionInfo.searchText;
  let insertionStrategy = 'normal';
  
  if (referenceMapping && searchText) {
    const marker = referenceMapping.get(searchText.trim());
    if (marker) {
      searchText = marker;
      console.log('🔍 Convertendo título para marcador:', marker);
      
      // CORREÇÃO: Usar estratégia normal para inserções entre marcadores
      // A estratégia safe_append estava sempre inserindo no final
      insertionStrategy = 'normal';
      console.log('🔄 Usando estratégia normal (inserir entre marcadores)');
    }
  }
  
  console.log('🎯 Estratégia final:', insertionStrategy);
  console.log('🎯 SearchText final:', searchText);
  console.log('🎯 Posição final:', insertionInfo.position);
  
  // Inserir no editor usando o método do BlockNoteEditor
  if (editorRef.current && editorRef.current.insertTextAtPosition) {
    console.log('✅ Editor disponível, chamando insertTextAtPosition');
    try {
      // CORREÇÃO: Usar parâmetros originais para inserção entre marcadores
      const finalPosition = insertionInfo.position;
      const finalSearchText = searchText;
      
      console.log('🚀 Chamando insertTextAtPosition com:', {
        searchText: finalSearchText,
        textToInsert,
        position: finalPosition
      });
      
      const success = await editorRef.current.insertTextAtPosition(
        finalSearchText,
        textToInsert,
        finalPosition,
        (marker, _) => onReferenceUpdate?.(marker, nodeToInsert.data.title),
        onReindexing
      );
      
      console.log('📊 Resultado da inserção:', success);
      
      if (success) {
        const message = 'Texto inserido com sucesso entre marcadores';
        console.log('✅ Inserção bem-sucedida:', message);
        return { success: true, message };
      } else {
        console.log('❌ Falha na inserção');
        return { success: false, error: 'Falha na inserção' };
      }
    } catch (error) {
      console.log('❌ Erro na inserção:', error.message);
      return { success: false, error: error.message };
    }
  } else {
    console.log('❌ Editor não disponível');
    return { success: false, error: 'Editor não disponível' };
  }
};
