import supabase from '../lib/supabaseClient.js';

/**
 * Busca as notícias não arquivadas do banco de dados, com paginação.
 * @param {number} page - A página de resultados.
 * @param {number} limit - O número de itens por página.
 */
export const fetchNews = async (page = 0, limit = 50) => {
  const from = page * limit;
  const to = from + limit - 1;

  // Usamos 'count: 'exact'' para obter o número total de itens que correspondem à consulta
  const { data, error, count } = await supabase
    .from('Controle Geral') // Tabela "Controle Geral"
    .select('*', { count: 'exact' })
    .eq('is_archive', false) // Apenas notícias não arquivadas
    .eq('isDone', false) // Apenas notícias que não estão concluídas
    .not('created_at', 'is', null) // Excluir registros com created_at nulo
    .order('created_at', { ascending: false }) // Ordem decrescente por created_at
    .range(from, to);

  if (error) {
    console.error('Error fetching news:', error);
    throw new Error(error.message);
  }

  return { data, error, count };
};

/**
 * Busca notícias pendentes de curadoria.
 * @param {number} page - A página de resultados a ser buscada.
 * @param {number} limit - O número de itens por página.
 */
export const fetchPendingNews = async (page = 0, limit = 20) => {
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('Controle Geral') // Tabela "Controle Geral"
    .select('*')
    .eq('status', 'pending')
    .eq('isDone', false) // Apenas notícias que não estão concluídas
    .not('created_at', 'is', null) // Excluir registros com created_at nulo
    .order('created_at', { ascending: false }) // Ordem decrescente por created_at
    .range(from, to);

  if (error) {
    console.error('Error fetching pending news:', error);
    throw new Error(error.message);
  }

  return { data, error };
};

/**
 * Atualiza o status de um artigo.
 * @param {string} id - O ID do artigo.
 * @param {'approved' | 'rejected'} status - O novo status.
 */
export const updateNewsStatus = async (id, status) => {
  const { data, error } = await supabase
    .from('Controle Geral')
    .update({ status: status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating news status:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Busca uma notícia na tabela lina_news pelo news_id.
 * @param {string} newsId - O ID da notícia da tabela "Controle Geral".
 */
export const fetchLinaNewsByNewsId = async (newsId) => {
  const { data, error } = await supabase
    .from('lina_news')
    .select('id')
    .eq('news_id', newsId)
    .single();

  if (error) {
    console.error('Error fetching lina_news:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Busca notícias que existem na tabela lina_news fazendo join com Controle Geral.
 * @param {number} page - A página de resultados.
 * @param {number} limit - O número de itens por página.
 */
export const fetchNewsFromLinaNews = async (page = 0, limit = 50) => {
  const from = page * limit;
  const to = from + limit - 1;

  // Busca primeiro os news_ids e ids da lina_news
  const { data: linaNewsData, error: linaError } = await supabase
    .from('lina_news')
    .select('id, news_id')
    .range(from, to);

  if (linaError) {
    console.error('Error fetching lina_news:', linaError);
    throw new Error(linaError.message);
  }

  if (!linaNewsData || linaNewsData.length === 0) {
    return { data: [], error: null, count: 0 };
  }

  // Cria um mapa para relacionar news_id com lina_news_id
  const linaNewsMap = {};
  linaNewsData.forEach(item => {
    linaNewsMap[item.news_id] = item.id;
  });

  // Extrai os IDs
  const newsIds = linaNewsData.map(item => item.news_id);

  // Busca as notícias correspondentes na tabela Controle Geral
  const { data, error, count } = await supabase
    .from('Controle Geral')
    .select('*', { count: 'exact' })
    .in('id', newsIds)
    .eq('is_archive', false)
    .eq('isDone', false) // Apenas notícias que não estão concluídas
    .not('created_at', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching news from Controle Geral:', error);
    throw new Error(error.message);
  }

  // Adiciona o lina_news_id a cada notícia
  const enrichedData = data?.map(item => ({
    ...item,
    lina_news_id: linaNewsMap[item.id]
  })) || [];

  return { data: enrichedData, error, count };
};

/**
 * Busca notícias diretamente da tabela lina_news.
 * completed = false: itens pendentes (final_text IS NULL)
 * completed = true: itens concluídos (final_text NOT NULL)
 */
export const fetchLinaNews = async (page = 0, limit = 50, { completed = false } = {}) => {
  const from = page * limit;
  const to = from + limit - 1;

  // Primeiro, tenta filtrar por isPublished (se a coluna existir)
  try {
    const { data, error, count } = await supabase
      .from('lina_news')
      .select('id, created_at, title, link, structured_summary, final_text, original_full_content, macro_tag, sub_tag, category, news_id, isPublished, wellness_data, entities_data, core_quotes', { count: 'exact' })
      .eq('isPublished', completed)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const mapped = (data || []).map(item => ({
      ...item,
      macro_categoria: item.macro_tag
    }));

    return { data: mapped, error: null, count };
  } catch (err) {
    // Fallback: se a coluna isPublished não existir, usar final_text como proxy (antigo comportamento)
    const message = String(err?.message || '').toLowerCase();
    if (!message.includes('ispublished')) {
      console.warn('Fallback para final_text pois ocorreu erro ao usar isPublished:', err);
    }

    let query = supabase
      .from('lina_news')
      .select('id, created_at, title, link, structured_summary, final_text, original_full_content, macro_tag, sub_tag, category, news_id, wellness_data, entities_data, core_quotes', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (completed) {
      query = query.not('final_text', 'is', null);
    } else {
      query = query.is('final_text', null);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Error fetching lina_news (fallback final_text):', error);
      throw new Error(error.message);
    }

    const mapped = (data || []).map(item => ({
      ...item,
      macro_categoria: item.macro_tag
    }));

    return { data: mapped, error: null, count };
  }
};

export const fetchLinaNewsPending = async (page = 0, limit = 50) => {
  return fetchLinaNews(page, limit, { completed: false });
};

export const fetchLinaNewsCompleted = async (page = 0, limit = 50) => {
  return fetchLinaNews(page, limit, { completed: true });
};

/**
 * Atualiza o campo isPublished na tabela lina_news
 */
export const setLinaNewsPublished = async (linaNewsId, isPublished = true) => {
  const { data, error } = await supabase
    .from('lina_news')
    .update({ isPublished })
    .eq('id', linaNewsId)
    .select('id, isPublished')
    .single();

  if (error) {
    console.error('Erro ao atualizar isPublished em lina_news:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Busca dados específicos de uma notícia na tabela lina_news pelo news_id.
 * @param {string} newsId - O ID da notícia na tabela "Controle Geral" (news_id).
 */
export const fetchLinaNewsById = async (newsId) => {
  try {
    console.log('🔍 Buscando dados da tabela lina_news para ID:', newsId);
    
    // Buscar diretamente na tabela lina_news usando o ID
    const { data, error } = await supabase
      .from('lina_news')
      .select('id, title, created_at, final_text, "Post_linkedin_curto", post_linkedin_longo, post_instagram')
      .eq('id', newsId)
      .single();

    if (error) {
      console.error('❌ Error fetching lina_news by ID:', error);
      throw new Error(error.message);
    }

    console.log('✅ Dados retornados da tabela lina_news:', data);
    console.log('🔍 Coluna Post_linkedin_curto:', data?.Post_linkedin_curto);
    
    return data;
  } catch (error) {
    console.error('❌ Erro inesperado em fetchLinaNewsById:', error);
    throw error;
  }
};

/**
 * Busca a hierarquia dos tópicos e eventos da Lina.
 */
export const fetchLinaHierarchy = async () => {
  try {
    // Buscar todos os eventos da tabela lina_events com lambda_persistence
    const { data: events, error: eventsError } = await supabase
      .from('lina_events')
      .select('id, parent_event_id, llm_title, llm_summary, is_event, lambda_persistence, created_at')
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('❌ Erro ao buscar eventos:', eventsError);
      throw eventsError;
    }

    // Verificar se lambda_persistence está presente
    if (events && events.length > 0) {
      const hasLambdaPersistence = events.some(event => 'lambda_persistence' in event);
      
      // Mostrar alguns valores de lambda_persistence
      const lambdaValues = events
        .filter(event => event.lambda_persistence !== null && event.lambda_persistence !== undefined)
        .slice(0, 5)
        .map(event => ({ title: event.llm_title?.substring(0, 30), lambda: event.lambda_persistence }));
    }

    // Construir a hierarquia
    const buildHierarchy = (parentId = null) => {
      const children = events?.filter(event => event.parent_event_id === parentId) || [];
      return children.map(event => ({
        ...event,
        children: buildHierarchy(event.id)
      }));
    };

    const hierarchy = buildHierarchy();
    
    return hierarchy;
  } catch (error) {
    console.error('❌ Erro ao buscar hierarquia:', error);
    throw error;
  }
};

/**
 * Busca notícias relacionadas a um evento específico da Lina.
 * @param {number} eventId - ID do evento
 */
export const fetchNewsByLinaEventId = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('Controle Geral')
      .select('id, title, link, texto_final, created_at')
      .eq('lina_event_id', eventId)
      .eq('isDone', false) // Apenas notícias que não estão concluídas
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar notícias por evento da Lina:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro inesperado ao buscar notícias por evento:', error);
    throw error;
  }
};

/**
 * Busca dados de um evento específico da tabela lina_events.
 * @param {number} eventId - ID do evento
 */
export const fetchLinaEventById = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('lina_events')
      .select('id, llm_title, llm_summary, lambda_persistence, created_at')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Erro ao buscar evento da Lina:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro inesperado ao buscar evento:', error);
    throw error;
  }
};

/**
 * Busca uma notícia específica por ID da tabela "Controle Geral".
 * @param {string} newsId - O ID da notícia.
 */
export const fetchNewsById = async (newsId) => {
  try {
    const { data, error } = await supabase
      .from('Controle Geral')
      .select('*')
      .eq('id', newsId)
      .single();

    if (error) {
      console.error('Erro ao buscar notícia por ID:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro inesperado ao buscar notícia por ID:', error);
    throw error;
  }
};

/**
 * Atualiza o texto de uma notícia na tabela "Controle Geral".
 * @param {string} newsId - O ID da notícia.
 * @param {string} textoFinal - O novo texto da notícia.
 */
export const updateNewsText = async (newsId, textoFinal) => {
  try {
    const { data, error } = await supabase
      .from('Controle Geral')
      .update({ 
        texto_final: textoFinal,
        updated_at: new Date().toISOString()
      })
      .eq('id', newsId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar texto da notícia:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro inesperado ao atualizar texto da notícia:', error);
    throw error;
  }
};

/**
 * Busca as notícias concluídas do banco de dados, com paginação.
 * @param {number} page - A página de resultados.
 * @param {number} limit - O número de itens por página.
 */
export const fetchCompletedNews = async (page = 0, limit = 50) => {
  const from = page * limit;
  const to = from + limit - 1;

  // Busca notícias que estão marcadas como concluídas (isDone == true)
  const { data, error, count } = await supabase
    .from('Controle Geral') // Tabela "Controle Geral"
    .select('*', { count: 'exact' })
    .eq('is_archive', false) // Apenas notícias não arquivadas
    .eq('isDone', true) // Apenas notícias que estão concluídas
    .not('created_at', 'is', null) // Excluir registros com created_at nulo
    .order('created_at', { ascending: false }) // Ordem decrescente por created_at
    .range(from, to);

  if (error) {
    console.error('Error fetching completed news:', error);
    throw new Error(error.message);
  }

  return { data, error, count };
};

/**
 * Busca notícias concluídas que existem na tabela lina_news fazendo join com Controle Geral.
 * @param {number} page - A página de resultados.
 * @param {number} limit - O número de itens por página.
 */
export const fetchCompletedNewsFromLinaNews = async (page = 0, limit = 50) => {
  const from = page * limit;
  const to = from + limit - 1;

  // Busca primeiro os news_ids e ids da lina_news
  const { data: linaNewsData, error: linaError } = await supabase
    .from('lina_news')
    .select('id, news_id')
    .range(from, to);

  if (linaError) {
    console.error('Error fetching lina_news:', linaError);
    throw new Error(linaError.message);
  }

  if (!linaNewsData || linaNewsData.length === 0) {
    return { data: [], error: null, count: 0 };
  }

  // Cria um mapa para relacionar news_id com lina_news_id
  const linaNewsMap = {};
  linaNewsData.forEach(item => {
    linaNewsMap[item.news_id] = item.id;
  });

  // Extrai os IDs
  const newsIds = linaNewsData.map(item => item.news_id);

  // Busca as notícias correspondentes na tabela Controle Geral (apenas concluídas)
  const { data, error, count } = await supabase
    .from('Controle Geral')
    .select('*', { count: 'exact' })
    .in('id', newsIds)
    .eq('is_archive', false)
    .eq('isDone', true) // Apenas notícias que estão concluídas
    .not('created_at', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching completed news from Controle Geral:', error);
    throw new Error(error.message);
  }

  // Adiciona o lina_news_id a cada notícia
  const enrichedData = data?.map(item => ({
    ...item,
    lina_news_id: linaNewsMap[item.id]
  })) || [];

  return { data: enrichedData, error, count };
};

/**
 * Dispara webhook para o N8N quando usuário clica em LinkedIn Post enxuto
 * @param {string|number} newsId - O ID da notícia
 * @param {string} currentContent - Conteúdo atual da coluna Post_linkedin_curto (se existir)
 * @returns {Promise<{success: boolean, markdownContent?: string, alreadyExists?: boolean}>} - Resultado com conteúdo markdown
 */
export const triggerLinkedinWebhook = async (newsId, currentContent = '') => {
  try {
    console.log('🚀 Verificando se precisa disparar webhook para N8N...');
    console.log('🆔 ID da notícia:', newsId);
    console.log('📝 Conteúdo atual recebido:', currentContent);
    console.log('📝 Conteúdo após trim:', currentContent.trim());
    
    // Verificar se já existe conteúdo na coluna Post_linkedin_curto
    if (currentContent && currentContent.trim() !== '') {
      console.log('✅ Conteúdo já existe, não é necessário disparar webhook');
      return { 
        success: true, 
        alreadyExists: true, 
        markdownContent: currentContent,
        message: 'Conteúdo já existe na base de dados'
      };
    }
    
    console.log('🚀 Conteúdo não existe, disparando webhook para N8N...');
    
    const response = await fetch('https://n8n.gevia.co/webhook/eb81e398-5b78-41af-9b89-2a74b0625d76', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: newsId
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Webhook disparado com sucesso:', result);
    
    // Extrair o conteúdo markdown da resposta
    // O N8N retorna um JSON com a chave "Post_linkedin_curto"
    let markdownContent = '';
    
    if (typeof result === 'string') {
      // Se a resposta for diretamente uma string
      markdownContent = result;
    } else if (result && typeof result === 'object') {
      // Processar o formato específico do N8N
      if (result.Post_linkedin_curto) {
        // Extrair o conteúdo da chave Post_linkedin_curto
        markdownContent = result.Post_linkedin_curto;
        
        // Converter quebras de linha \n para quebras de linha reais
        markdownContent = markdownContent.replace(/\\n/g, '\n');
        
        // Processar hashtags para formato markdown
        markdownContent = markdownContent.replace(/#(\w+)/g, '**#$1**');
        
        console.log('📝 Conteúdo processado do N8N:', markdownContent);
      } else {
        // Fallback para outros formatos
        markdownContent = result.content || result.text || result.markdown || result.message || JSON.stringify(result);
      }
    }
    
    return { 
      success: true, 
      data: result,
      markdownContent 
    };
    
  } catch (error) {
    console.error('❌ Erro ao disparar webhook:', error);
    throw new Error(`Falha ao disparar webhook: ${error.message}`);
  }
};