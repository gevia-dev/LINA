// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
console.log("oi: ", supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase URL ou Anon Key não encontradas. Verifique o arquivo .env.local");
  console.error("URL:", supabaseUrl);
  console.error("Key:", supabaseAnonKey ? 'Definida' : 'Não encontrada');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
