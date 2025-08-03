import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!supabase) {
        setError("Cliente Supabase não configurado. Verifique suas variáveis de ambiente.");
        setLoading(false);
        return;
      }

      console.log('Tentando fazer login com:', email);

      // Login com Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha,
      });

      console.log('Resultado do login:', { data, signInError });

      if (signInError) {
        console.error('Erro de login:', signInError);
        setError(`Erro: ${signInError.message}`);
      } else if (data?.user) {
        console.log('Login bem-sucedido! Usuário:', data.user);
        // Login bem-sucedido - redirecionar
        navigate('/feed');
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form
        onSubmit={onSubmit}
        className="glass-pane bg-card/80 border border-border-default rounded-2xl px-8 py-10 w-full max-w-sm flex flex-col gap-7 shadow-glow"
        style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.45)' }}
      >
        <h2 className="text-3xl font-bold text-center text-white mb-4 tracking-tight">Login</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-text-secondary text-sm mb-1">Email</label>
          <input
            id="email"
            type="email"
            className="bg-card border border-border-default rounded-md px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-white transition w-full"
            placeholder="Digite seu email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="username"
            disabled={loading}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="senha" className="text-text-secondary text-sm mb-1">Senha</label>
          <input
            id="senha"
            type="password"
            className="bg-card border border-border-default rounded-md px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-white transition w-full"
            placeholder="Digite sua senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
        </div>
        {error && <div className="text-red-400 text-sm text-center -mt-3">{error}</div>}
        <div className="text-right -mt-4">
            <Link to="/forgot-password" className="text-blue-400 hover:underline text-sm">Esqueci minha senha</Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-white text-black font-semibold hover:bg-gray-200 transition-colors mt-2 shadow disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <div className="text-center mt-2">
          <span className="text-text-secondary text-sm">Não tem conta? </span>
          <Link to="/signup" className="text-blue-400 hover:underline text-sm">Criar Conta</Link>
        </div>
      </form>
    </div>
  );
};

export default Login;