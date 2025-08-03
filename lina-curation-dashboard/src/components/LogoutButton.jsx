import React from 'react';
import { useAuth } from '../context/AuthContext';

const LogoutButton = ({ className = "" }) => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors ${className}`}
    >
      Sair
    </button>
  );
};

export default LogoutButton;