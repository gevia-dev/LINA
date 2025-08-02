import { createClient } from '@supabase/supabase-js';

// Para projetos Vite, as variáveis de ambiente devem começar com VITE_ e estar definidas no .env.local
// Certifique-se de que o arquivo .env.local está na raiz do projeto e contém:
// VITE_SUPABASE_URL=suasupabaseurl
// VITE_SUPABASE_ANON_KEY=suachaveanonima


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Debug - Variáveis de ambiente:');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não encontrada');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Definida' : '❌ Não encontrada');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase URL ou Anon Key não encontradas. Verifique o arquivo .env.local");
  console.error("URL:", supabaseUrl);
  console.error("Key:", supabaseAnonKey ? 'Definida' : 'Não encontrada');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);