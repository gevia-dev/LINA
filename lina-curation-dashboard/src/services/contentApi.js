import { supabase } from '../lib/supabaseClient';

/**
 * Busca notícias pendentes de curadoria.
 * @param {number} page - A página de resultados a ser buscada.
 * @param {number} limit - O número de itens por página.
 */
export const fetchPendingNews = async (page = 0, limit = 20) => {
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('articles') // 'articles' é um exemplo, ajuste para o nome da sua tabela
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
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
    .from('articles')
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