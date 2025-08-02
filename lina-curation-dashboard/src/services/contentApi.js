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