// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

// Executa o dotenv para carregar as variáveis do .env.local para o process.env do Node
dotenv.config({ path: './.env.local' });

export default defineConfig({
  plugins: [react()],
  // Injeta as variáveis do process.env no código do cliente
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },
  optimizeDeps: {
    include: ['@blocknote/react', '@blocknote/core']
  }
});