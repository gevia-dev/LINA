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
 * Busca a hierarquia dos tópicos e eventos da Lina.
 */
export const fetchLinaHierarchy = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('get-lina-hierarchy');
    if (error) {
      console.error('Erro ao buscar hierarquia da Lina:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Erro ao invocar a função da Lina:', error);
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