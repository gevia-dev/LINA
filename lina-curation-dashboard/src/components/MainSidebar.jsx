import React, { useState } from 'react';
import { Home, Plus, Upload, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import LogoutButton from './LogoutButton';

const MainSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determinar item ativo baseado na rota atual
  const getActiveItem = () => {
    if (location.pathname === '/feed') return 'Feed';
    if (location.pathname === '/curation') return 'Create';
    if (location.pathname === '/') return 'Home';
    return 'Home';
  };

  const navigationItems = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Feed', icon: FileText, path: '/feed' },
    { name: 'Create', icon: Plus, path: '/curation' },
    { name: 'Upload', icon: Upload, path: '/upload' }
  ];

  return (
    <div 
      className="h-screen p-6 flex flex-col"
      style={{ 
        backgroundColor: '#1E1E1E',
        borderRight: '1px solid #333333'
      }}
    >
      {/* Logo/Título IIA */}
      <div className="mb-8">
        <h1 
          className="font-bold"
          style={{ 
            fontSize: '24px',
            fontWeight: '700',
            color: '#E0E0E0',
            fontFamily: 'Inter'
          }}
        >
          IIA
        </h1>
      </div>
      
      {/* Lista de Navegação */}
      <nav className="space-y-2 flex flex-col flex-1">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = getActiveItem() === item.name;
            
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center p-3 rounded-lg transition-colors duration-200 hover:bg-opacity-20"
                style={{ 
                  backgroundColor: isActive ? '#2BB24C33' : 'transparent',
                  color: isActive ? '#2BB24C' : '#A0A0A0',
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = '#2BB24C33';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <IconComponent 
                  size={18} 
                  className="mr-3"
                  style={{ 
                    color: isActive ? '#2BB24C' : '#FFFFFF'
                  }}
                />
                <span>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Separador e botão de logout */}
        <div className="mt-auto pt-4">
          <div className="border-t border-gray-600 mb-4"></div>
          <LogoutButton className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-3 transition-colors" />
        </div>
      </nav>
    </div>
  );
};

export default MainSidebar;