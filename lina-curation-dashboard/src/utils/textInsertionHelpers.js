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
export const handleCanvasConnection = async (connectionParams, nodes, edges, editorRef, referenceMapping = null, onReferenceUpdate = null) => {
  const { source, target } = connectionParams;
  
  console.log('🔗 Processando nova conexão do canvas:', connectionParams);
  console.log('📊 Estado atual - Nodes:', nodes.length, 'Edges:', edges.length);
  
  // Encontrar ambos os nodes da conexão
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  
  console.log('🔗 Conexão:', source, '->', target);
  console.log('📝 Source node:', sourceNode?.data?.title || 'não encontrado');
  console.log('📝 Target node:', targetNode?.data?.title || 'não encontrado');
  
  // Verificar qual node tem frase para inserir (priorizar target, depois source)
  let nodeToInsert = null;
  let insertionInfo = null;
  
  if (targetNode && targetNode.type === 'itemNode' && targetNode.data?.phrase) {
    nodeToInsert = targetNode;
    // Inserir após o source node
    if (sourceNode && sourceNode.data) {
      insertionInfo = {
        position: 'after',
        searchText: sourceNode.data.title || sourceNode.data.phrase,
        sourceNode: sourceNode
      };
    } else {
      insertionInfo = { position: 'end', searchText: null };
    }
  } else if (sourceNode && sourceNode.type === 'itemNode' && sourceNode.data?.phrase) {
    nodeToInsert = sourceNode;
    // Inserir antes do target node
    if (targetNode && targetNode.data) {
      insertionInfo = {
        position: 'before', 
        searchText: targetNode.data.title || targetNode.data.phrase,
        targetNode: targetNode
      };
    } else {
      insertionInfo = { position: 'end', searchText: null };
    }
  }
  
  if (!nodeToInsert) {
    console.log('ℹ️ Nenhum itemNode com frase encontrado na conexão');
    return { success: true, message: 'Conexão sem texto para inserir' };
  }
  
  console.log('📝 Node para inserir:', nodeToInsert.data.title);
  console.log('📍 Posição de inserção:', insertionInfo);
  
  // Preparar o texto a ser inserido
  const textToInsert = nodeToInsert.data.phrase;
  
  console.log('✍️ Texto a inserir:', textToInsert);
  
  // Converter título para marcador usando referenceMapping
  let searchText = insertionInfo.searchText;
  if (referenceMapping && searchText) {
    const marker = referenceMapping.get(searchText.trim());
    if (marker) {
      console.log(`🔍 Convertendo título "${searchText}" para marcador "${marker}"`);
      searchText = marker;
    } else {
      console.log(`⚠️ Marcador não encontrado para título "${searchText}"`);
    }
  }
  
  // Inserir no editor usando o método do BlockNoteEditor
  if (editorRef.current && editorRef.current.insertTextAtPosition) {
    try {
      const success = await editorRef.current.insertTextAtPosition(
        searchText,
        textToInsert,
        insertionInfo.position,
        onReferenceUpdate  // Passar callback para atualizar referenceMapping
      );
      
      if (success) {
        console.log('✅ Texto inserido com sucesso no editor');
        return { success: true, message: 'Texto inserido com sucesso' };
      } else {
        console.error('❌ Falha ao inserir texto no editor');
        return { success: false, error: 'Falha na inserção' };
      }
    } catch (error) {
      console.error('❌ Erro durante inserção:', error);
      return { success: false, error: error.message };
    }
  } else {
    console.error('❌ Método insertTextAtPosition não disponível no editor');
    return { success: false, error: 'Editor não disponível' };
  }
};
