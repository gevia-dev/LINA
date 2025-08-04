import React, { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Função para buscar o perfil do usuário
    const fetchUserProfile = async (userId) => {
      try {
        console.log('Buscando perfil para o usuário:', userId);
        const { data, error } = await supabase
          .from('profiles')
          .select('permission_level, email, full_name, avatar_url')
          .eq('id', userId)
          .single();

        if (error) {
          console.warn('Erro ao buscar perfil do usuário (ignorando):', error.message);
          // Não falhar a autenticação se o perfil não existir
          return null;
        }
        console.log('Perfil encontrado:', data);
        return data;
      } catch (err) {
        console.warn('Erro inesperado ao buscar perfil (ignorando):', err);
        return null;
      }
    };

    // Pega a sessão inicial e escuta mudanças de autenticação
    let unsub = null;
    const getAndListenSession = async () => {
      try {
        console.log('Verificando sessão inicial...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Sessão encontrada:', session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('Usuário autenticado:', session.user.email);
          fetchUserProfile(session.user.id).then((userProfile) => {
            setProfile(userProfile);
          }).catch(err => {
            console.warn('Erro ao buscar perfil (ignorando):', err);
            setProfile(null);
          });
        } else {
          console.log('Nenhum usuário autenticado');
          setProfile(null);
        }
        setLoading(false);
        
        // Escuta mudanças
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Evento de auth:', event, session);
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
              console.log('Usuário logou:', session.user.email);
              fetchUserProfile(session.user.id).then((userProfile) => {
                setProfile(userProfile);
              }).catch(err => {
                console.warn('Erro ao buscar perfil (ignorando):', err);
                setProfile(null);
              });
            } else {
              console.log('Usuário deslogou');
              setProfile(null);
            }
            setLoading(false);
          }
        );
        unsub = authListener.subscription.unsubscribe;
      } catch (err) {
        console.error('Erro ao configurar autenticação:', err);
        setLoading(false);
      }
    };
    
    getAndListenSession();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const value = {
    session,
    user,
    profile,
    loading,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};