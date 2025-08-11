// src/components/MainSidebar.jsx

import React, { useState, useEffect } from 'react';
import { FileText, LogOut, ChevronLeft, ChevronRight, Search, CircleDot } from 'lucide-react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/imgs/logo_semfundo_branco.png';

const MainSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user, profile } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Persistir estado colapsado
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      const collapsed = JSON.parse(savedState);
      setIsCollapsed(collapsed);
    
    } else {
      // Estado padrão: colapsado
      setIsCollapsed(true);
      localStorage.setItem('sidebarCollapsed', JSON.stringify(true));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Simular loading dos contadores
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Determinar item ativo baseado na rota atual
  const getActiveItem = () => {
    if (location.pathname.startsWith('/feed')) return 'Feed';
    if (location.pathname.startsWith('/curation')) return 'Create';
    if (location.pathname.startsWith('/explorer')) return 'Explorer';
    if (location.pathname.startsWith('/bubble-explorer')) return 'Bubbles';
    return 'Feed';
  };

  const mainItems = [
    { name: 'Feed', icon: FileText, path: '/feed', shortcut: 'Alt+1' },
    { name: 'Explorer', icon: Search, path: '/explorer', shortcut: 'Alt+2' },
    { name: 'Bubbles', icon: CircleDot, path: '/bubble-explorer', shortcut: 'Alt+3' }
  ];

  const toolsItems = [];

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);

  };

  // Função para gerar iniciais do nome
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Função para obter nome de exibição
  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Usuário';
  };

  // Função para obter email de exibição
  const getDisplayEmail = () => {
    if (profile?.email) return profile.email;
    if (user?.email) return user.email;
    return '';
  };

  const NavigationItem = ({ item, isActive }) => {
    const IconComponent = item.icon;
    const [showSettings, setShowSettings] = useState(false);

    return (
      <motion.div
        className="relative group"
        onMouseEnter={() => setShowSettings(true)}
        onMouseLeave={() => setShowSettings(false)}
        whileTap={{ scale: 0.98 }}
        role="menuitem"
        aria-label={`${item.name} (${item.shortcut})`}
      >
        <NavLink
          to={item.path}
          className={({ isActive }) =>
            `flex items-center w-full py-2 rounded-lg transition-all duration-200 ${isActive
              ? 'text-green-500'
              : isCollapsed 
                ? 'text-gray-400 hover:text-gray-200' 
                : 'text-gray-400 hover:text-white'
            }`
          }
          style={{
            fontFamily: 'Inter',
            fontSize: '13px',
            fontWeight: '500',
            minHeight: '36px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            paddingLeft: isCollapsed ? '0px' : '0px',
            paddingRight: isCollapsed ? '0px' : '0px'
          }}

          title={isCollapsed ? `${item.name} (${item.shortcut})` : item.shortcut}
        >
          {({ isActive }) => (
            <>
              <div className="relative flex-shrink-0">
                <IconComponent
                  size={16}
                  className={`${isCollapsed ? "" : "mr-3"} ${
                    isActive 
                      ? 'text-green-500' 
                      : isCollapsed 
                        ? 'text-gray-400 group-hover:text-gray-200' 
                        : 'text-gray-400 group-hover:text-white'
                  }`}
                  style={{
                    transition: 'color 0.2s ease',
                    marginRight: isCollapsed ? '0px' : '12px'
                  }}
                />
              </div>

              {!isCollapsed && (
                <span className="flex-1 truncate">
                  {item.name}
                </span>
              )}
            </>
          )}
        </NavLink>


      </motion.div>
    );
  };

  // Mobile bottom navigation
  if (isMobile) {
    return (
      <motion.nav
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          height: '56px',
          backgroundColor: '#1E1E1E',
          borderTop: '1px solid #333333'
        }}
        role="navigation"
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-around h-full px-4">
          {[...mainItems, ...toolsItems].map((item) => {
            const IconComponent = item.icon;
            const isActive = getActiveItem() === item.name;

            return (
              <motion.button
                key={item.name}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200"
                style={{
                  color: isActive ? '#2BB24C' : '#FFFFFF',
                  opacity: isActive ? 1 : 0.7
                }}
                whileTap={{ scale: 0.95 }}
                title={`${item.name} (${item.shortcut})`}
                role="menuitem"
                aria-label={item.name}
              >
                <div className="relative">
                  <IconComponent size={20} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.nav>
    );
  }

  return (
    <>
      {/* CSS para animações */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <motion.div
        className="h-screen flex flex-col flex-shrink-0"
        style={{
          backgroundColor: '#1E1E1E',
          borderRight: '1px solid #333333',
          width: isCollapsed ? '80px' : '240px',
          position: 'relative',
          minWidth: isCollapsed ? '80px' : '240px'
        }}
        transition={{ width: { duration: 0.3, ease: 'easeInOut' } }}
        role="navigation"
        aria-label="Barra lateral de navegação"
      >
        {/* Seção do Logo - Topo */}
        <div className="flex-shrink-0" style={{ padding: isCollapsed ? '12px' : '14px' }}>
          <div 
            className={`flex ${isCollapsed ? 'flex-col' : 'flex-row items-center justify-between'}`}
            style={{ alignItems: isCollapsed ? 'center' : 'center' }}
          >
            <button
              onClick={() => navigate('/feed')}
              className="flex items-center justify-start w-12 h-12 rounded-lg transition-all duration-200 hover:opacity-80"
              style={{
                justifyContent: isCollapsed ? 'center' : 'flex-start'
              }}
              title="Voltar para o Feed"
            >
              <img
                src={logo}
                alt="LINA Logo"
                className="w-10 h-10 object-contain"
                style={{ transition: 'opacity 0.2s ease' }}
              />
            </button>

            {/* Botão de toggle */}
            <button
              onClick={toggleCollapse}
              className={`${isCollapsed ? 'mt-4' : ''} flex items-center justify-start w-12 h-12 rounded-lg transition-all duration-200 ${
                isCollapsed 
                  ? 'text-gray-400 hover:text-gray-200' 
                  : 'text-white hover:text-gray-300'
              }`}
                          style={{ 
              justifyContent: isCollapsed ? 'center' : 'flex-end'
            }}
              title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
              aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
            {isCollapsed ? (
              <ChevronRight 
                size={16} 
                className="text-gray-400 hover:text-gray-200"
                style={{ 
                  transition: 'color 0.2s ease' 
                }}
              />
            ) : (
              <ChevronLeft 
                size={16} 
                className="text-white hover:text-gray-300"
                style={{ 
                  transition: 'color 0.2s ease' 
                }}
              />
            )}
          </button>
        </div>

        {/* Linha divisória */}
        <div
          className="mt-4"
          style={{
            height: '1px',
            background: 'linear-gradient(to right, transparent, #333333, transparent)'
          }}
        />
      </div>

        {/* Seção de Navegação - Meio */}
        <div className="flex-1 overflow-y-auto">
          <div style={{ padding: isCollapsed ? '12px 12px 16px 12px' : '14px 14px 16px 14px' }}>
            <nav className="space-y-1" role="menu" style={{ paddingLeft: '0px', paddingRight: '0px' }}>
              {/* Seção MAIN */}
              {mainItems.map((item) => (
                <NavigationItem key={item.name} item={item} />
              ))}

              {/* Separador */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: '1px' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      backgroundColor: '#333333',
                      margin: '16px 0'
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Seção TOOLS */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      fontSize: '11px',
                      color: '#666666',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                      paddingLeft: '12px'
                    }}
                  >
                    TOOLS
                  </motion.div>
                )}
              </AnimatePresence>
              {toolsItems.map((item) => (
                <NavigationItem key={item.name} item={item} />
              ))}

              {/* Separador */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: '1px' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      backgroundColor: '#333333',
                      margin: '16px 0'
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Seção FAVORITES */}
              <AnimatePresence>
                {!isCollapsed && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        fontSize: '11px',
                        color: '#666666',
                        fontWeight: '600',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                        paddingLeft: '12px'
                      }}
                    >
                      FAVORITES
                    </motion.div>
                    <motion.div
                      className="py-2 px-3 text-gray-500 italic"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        fontSize: '13px'
                      }}
                    >
                      Em breve...
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </nav>
          </div>
        </div>

        {/* Seção do Usuário e Logout - Base */}
        <div className="flex-shrink-0 border-t border-gray-700" style={{ padding: isCollapsed ? '12px' : '14px' }}>
          {/* Informações do usuário */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                className="mb-4 rounded-lg"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  borderRadius: '8px',
                  padding: '12px 12px 12px 0px'
                }}
              >
                <div className="flex items-center justify-start">
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center mr-3 flex-shrink-0"
                    style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: '#2BB24C',
                      borderRadius: '50%',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    {getInitials(getDisplayName())}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-white truncate"
                      style={{
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      {getDisplayName()}
                    </div>
                    <div
                      className="truncate"
                      style={{
                        fontSize: '10px',
                        color: '#666666'
                      }}
                    >
                      {getDisplayEmail()}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botão de Logout */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center py-2 rounded-lg transition-all duration-200 ${
              isCollapsed 
                ? 'text-gray-400 hover:text-red-300' 
                : 'text-gray-400 hover:text-red-400'
            }`}
            style={{
              fontFamily: 'Inter',
              fontSize: '13px',
              fontWeight: '500',
              minHeight: '36px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              paddingLeft: isCollapsed ? '0px' : '0px',
              paddingRight: isCollapsed ? '0px' : '0px'
            }}
            title="Fazer logout"
            aria-label="Fazer logout"
          >
            <LogOut
              size={16}
              className="text-gray-400 hover:text-red-400"
              style={{
                transition: 'color 0.2s ease'
              }}
            />
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default MainSidebar;