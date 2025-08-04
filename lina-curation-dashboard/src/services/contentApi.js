import { supabase } from '../lib/supabaseClient';

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
 * Por enquanto, retorna dados mockados até implementarmos as tabelas reais.
 */
export const fetchLinaHierarchy = async () => {
  // Mock data - substituir por consulta real quando as tabelas existirem
  const mockData = [
    {
      id: 1,
      llm_title: "Política Brasileira",
      llm_summary: "Eventos políticos importantes do Brasil",
      type: "topic",
      children: [
        {
          id: 2,
          llm_title: "Eleições 2024",
          llm_summary: "Cobertura das eleições municipais",
          type: "event",
          children: []
        },
        {
          id: 3,
          llm_title: "Decisões do STF",
          llm_summary: "Principais julgamentos do Supremo",
          type: "event",
          children: []
        }
      ]
    },
    {
      id: 4,
      llm_title: "Economia",
      llm_summary: "Notícias econômicas e mercado financeiro",
      type: "topic",
      children: [
        {
          id: 5,
          llm_title: "Taxa de Juros",
          llm_summary: "Decisões do Banco Central sobre SELIC",
          type: "event",
          children: []
        }
      ]
    }
  ];

  // Simular um delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockData;
};

/**
 * Busca notícias relacionadas a um evento específico da Lina.
 * @param {number} eventId - ID do evento
 */
export const fetchNewsByLinaEventId = async (eventId) => {
  // Mock data - substituir por consulta real
  const mockNews = {
    2: [ // Eleições 2024
      {
        id: 1,
        title: "Candidatos apresentam propostas para educação",
        link: "https://example.com/news1",
        texto_final: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        title: "Pesquisa eleitoral mostra empate técnico",
        link: "https://example.com/news2",
        texto_final: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    3: [ // Decisões STF
      {
        id: 3,
        title: "STF julga caso sobre marco temporal",
        link: "https://example.com/news3",
        texto_final: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ],
    5: [ // Taxa de Juros
      {
        id: 4,
        title: "Banco Central mantém taxa de juros em 10,75%",
        link: "https://example.com/news4",
        texto_final: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        created_at: new Date(Date.now() - 259200000).toISOString()
      }
    ]
  };

  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockNews[eventId] || [];
};