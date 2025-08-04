import React from 'react';
import { NavLink } from 'react-router-dom';
import { List, FileEdit } from 'lucide-react';
import LogoutButton from './LogoutButton';

const MainSidebar = () => {
  const navigationItems = [
    { name: 'Feed', icon: List, path: '/feed' },
    { name: 'Curation', icon: FileEdit, path: '/curation' }
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
      <nav className="space-y-2 flex flex-col flex-1">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center p-3 rounded-md transition-colors duration-200 hover:bg-[#2BB24C33] ${
                    isActive ? 'bg-[#2BB24C33] text-[#2BB24C]' : 'text-[#A0A0A0]'
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
        
        {/* Separador e botão de logout */}
        <div className="mt-auto pt-4">
          <div
            className="mb-4"
            style={{ borderTop: '1px solid #333333' }}
          ></div>
          <LogoutButton />
        </div>
      </nav>
    </div>
  );
};

export default MainSidebar;