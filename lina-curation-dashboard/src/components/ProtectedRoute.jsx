import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading, session } = useAuth();

  console.log('ProtectedRoute - Estado:', { user: !!user, loading, hasSession: !!session });

  if (loading) {
    console.log('ProtectedRoute - Carregando...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - Usuário não autenticado, redirecionando para /login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute - Usuário autenticado, permitindo acesso');
  return children;
};

export default ProtectedRoute;