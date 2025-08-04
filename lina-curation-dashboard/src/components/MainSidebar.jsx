import React, { useState } from 'react';
import { Plus, FileText, Network } from 'lucide-react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import LogoutButton from './LogoutButton';

const MainSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determinar item ativo baseado na rota atual
  const getActiveItem = () => {
    if (location.pathname === '/feed') return 'Feed';
    if (location.pathname === '/curation') return 'Create';
    if (location.pathname === '/explorer') return 'Explorer';
    return 'Feed';
  };

  const navigationItems = [
    { name: 'Feed', icon: FileText, path: '/feed' },
    { name: 'Create', icon: Plus, path: '/curation' },
    { name: 'Explorer', icon: Network, path: '/explorer' }
  ];

  return (
    <div 
      className="h-screen p-6 flex flex-col"
      style={{ 
        backgroundColor: '#1E1E1E',
        borderRight: '1px solid #333333'
      }}
    >
      {/* Lista de Navegação */}
      <nav className="space-y-2 flex-1">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = getActiveItem() === item.name;
            
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => 
                  `w-full flex items-center p-3 rounded-lg transition-colors duration-200 hover:bg-opacity-20 ${
                    isActive ? 'bg-green-500/20 text-green-500' : 'text-gray-400 hover:text-white'
                  }`
                }
                style={{ 
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {({ isActive }) => (
                  <>
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
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
      
      {/* Botão de logout na parte inferior */}
      <div className="mt-auto">
        <div
          className="mb-4"
          style={{ borderTop: '1px solid #333333' }}
        ></div>
        <LogoutButton />
      </div>
    </div>
  );
};

export default MainSidebar;