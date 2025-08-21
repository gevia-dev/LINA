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
    console.log('🔍 Coluna post_linkedin_longo:', data?.post_linkedin_longo);
    console.log('🔍 Coluna post_instagram:', data?.post_instagram);
    
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

export const triggerLinkedinWebhook = async (newsId, type = 'short-li') => {
  try {
    console.log('🚀 Disparando webhook para N8N com ID:', newsId, 'Type:', type);
    
    const response = await fetch('https://n8n.gevia.co/webhook/eb81e398-5b78-41af-9b89-2a74b0625d76', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: newsId,
        type: type
      })
    });

    // Tentar ler o body mesmo se status for 500
    let result;
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = await response.text();
      }
    } catch (parseError) {
      console.error('❌ Erro ao parsear resposta:', parseError);
      throw new Error(`Erro ao processar resposta do N8N: ${response.status}`);
    }

    console.log('📦 Resposta recebida (status ' + response.status + '):', result);
    console.log('🔍 Tipo da resposta:', typeof result);
    console.log('🔍 Propriedades da resposta:', result ? Object.keys(result) : 'null/undefined');
    if (result && typeof result === 'object') {
      console.log('🔍 Propriedade "content":', result.content);
      console.log('🔍 Propriedade "Post_linkedin_curto":', result.Post_linkedin_curto);
      console.log('🔍 Propriedade "post_linkedin_longo":', result.post_linkedin_longo);
      console.log('🔍 Propriedade "post_instagram":', result.post_instagram);
    }
    
    // Extrair conteúdo baseado no tipo
    let content = '';
    if (result && typeof result === 'object') {
      // Primeiro, tentar extrair da propriedade 'content' (resposta direta do N8N)
      if (result.content && typeof result.content === 'string') {
        content = result.content.replace(/\\n/g, '\n');
        console.log('✅ Conteúdo extraído da propriedade "content":', content.substring(0, 100) + '...');
      } else {
        // Fallback: tentar extrair baseado no tipo específico
        const fieldMap = {
          'short-li': 'Post_linkedin_curto',
          'long-li': 'post_linkedin_longo', 
          'insta-default': 'post_instagram'
        };
        
        const fieldName = fieldMap[type];
        if (result[fieldName]) {
          content = result[fieldName].replace(/\\n/g, '\n');
          console.log(`✅ Conteúdo extraído da propriedade "${fieldName}":`, content.substring(0, 100) + '...');
        }
      }
    } else if (typeof result === 'string' && result.trim()) {
      content = result;
      console.log('✅ Conteúdo extraído como string:', content.substring(0, 100) + '...');
    }
    
    console.log('🔍 Conteúdo extraído final:', content);
    console.log('🔍 Conteúdo após trim:', content.trim());
    console.log('🔍 Tamanho do conteúdo:', content.trim().length);
    
    if (content.trim()) {
      console.log('✅ Conteúdo extraído com sucesso (ignorando status ' + response.status + ')');
      return { 
        success: true, 
        content: content.trim()
      };
    }
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }
    
    throw new Error('Resposta do N8N não contém conteúdo válido. Conteúdo extraído: ' + JSON.stringify(content));
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    throw new Error(`Falha no webhook: ${error.message}`);
  }
};