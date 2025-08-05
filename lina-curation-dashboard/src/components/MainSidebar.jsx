// src/components/MainSidebar.jsx

import React, { useState } from 'react';
import { Plus, FileText, Network, Droplets } from 'lucide-react'; // Mudança: BarChart2 -> Droplets
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import LogoutButton from './LogoutButton';
import logo from '../assets/imgs/logo_semfundo_branco.png';

const MainSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determinar item ativo baseado na rota atual
  const getActiveItem = () => {
    if (location.pathname.startsWith('/feed')) return 'Feed';
    if (location.pathname.startsWith('/curation')) return 'Create';
    if (location.pathname.startsWith('/explorer')) return 'Explorer';
    if (location.pathname.startsWith('/bubble-explorer')) return 'Bubbles'; // Adicione o novo item
    return 'Feed';
  };

  const navigationItems = [
    { name: 'Feed', icon: FileText, path: '/feed' },
    { name: 'Create', icon: Plus, path: '/curation' },
    { name: 'Explorer', icon: Network, path: '/explorer' },
    { name: 'Bubbles', icon: Droplets, path: '/bubble-explorer' } // Mudança: BarChart2 -> Droplets 
  ];

  return (
    <div 
      className="h-screen flex flex-col"
      style={{ 
        backgroundColor: '#1E1E1E',
        borderRight: '1px solid #333333'
      }}
    >
      {/* Seção do Logo - Topo */}
      <div className="header-sidebar">
        <div className="flex justify-start">
          <motion.button
            onClick={() => navigate('/feed')}
            className="flex items-center justify-center w-20 h-20 rounded-lg transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Voltar para o Feed"
          >
            <img 
              src={logo} 
              alt="LINA Logo" 
              className="w-16 h-16 object-contain"
            />
          </motion.button>
        </div>
      </div>

      {/* Seção de Navegação - Meio */}
      <div className="flex-1 px-6 py-8">
        <nav className="space-y-3">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            // A lógica de ativação agora usa o novo `getActiveItem`
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
        </nav>
      </div>
      
      {/* Seção do Logout - Base */}
      <div className="px-6 pt-4 border-t border-[#333333]">
        <LogoutButton />
      </div>
    </div>
  );
};

export default MainSidebar;