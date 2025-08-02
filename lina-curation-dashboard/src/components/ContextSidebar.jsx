import React, { useState } from 'react';
import { Clock, FileText, User, Settings } from 'lucide-react';

const ContextSidebar = () => {
  const [activeTab, setActiveTab] = useState('info');

  const tabs = [
    { id: 'info', label: 'Info', icon: FileText },
    { id: 'settings', label: 'Config', icon: Settings }
  ];

  return (
    <div 
      className="h-full p-6"
      style={{ 
        backgroundColor: '#1E1E1E',
        borderLeft: '1px solid #333333'
      }}
    >
      {/* Título H2 */}
      <h2 
        className="font-semibold mb-6"
        style={{ 
          fontSize: '18px',
          fontWeight: '600',
          color: '#E0E0E0',
          fontFamily: 'Inter'
        }}
      >
        Contexto
      </h2>
      
      {/* Abas */}
      <div className="mb-6">
        <div className="flex border-b" style={{ borderColor: '#333333' }}>
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-3 border-b-2 transition-colors"
                style={{
                  borderBottomColor: isActive ? '#2BB24C' : 'transparent',
                  color: isActive ? '#2BB24C' : '#A0A0A0',
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <IconComponent size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* Card de Metadados */}
          <div 
            className="p-3 rounded-lg"
            style={{ 
              backgroundColor: '#121212',
              border: '1px solid #333333'
            }}
          >
            <h3 
              className="font-medium mb-3"
              style={{ 
                fontSize: '16px',
                fontWeight: '500',
                color: '#E0E0E0',
                fontFamily: 'Inter'
              }}
            >
              Metadados
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock size={14} style={{ color: '#A0A0A0' }} />
                <div>
                  <p 
                    style={{ 
                      fontSize: '14px',
                      color: '#E0E0E0',
                      fontFamily: 'Inter',
                      margin: 0
                    }}
                  >
                    Última edição
                  </p>
                  <p 
                    style={{ 
                      fontSize: '12px',
                      color: '#A0A0A0',
                      fontFamily: 'Inter',
                      margin: 0
                    }}
                  >
                    Há 2 minutos
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <User size={14} style={{ color: '#A0A0A0' }} />
                <div>
                  <p 
                    style={{ 
                      fontSize: '14px',
                      color: '#E0E0E0',
                      fontFamily: 'Inter',
                      margin: 0
                    }}
                  >
                    Editor
                  </p>
                  <p 
                    style={{ 
                      fontSize: '12px',
                      color: '#A0A0A0',
                      fontFamily: 'Inter',
                      margin: 0
                    }}
                  >
                    João Silva
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card de Status */}
          <div 
            className="p-3 rounded-lg"
            style={{ 
              backgroundColor: '#121212',
              border: '1px solid #333333'
            }}
          >
            <h3 
              className="font-medium mb-3"
              style={{ 
                fontSize: '16px',
                fontWeight: '500',
                color: '#E0E0E0',
                fontFamily: 'Inter'
              }}
            >
              Status da Estruturação
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span 
                  style={{ 
                    fontSize: '14px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter'
                  }}
                >
                  Resumo
                </span>
                <span 
                  style={{ 
                    fontSize: '12px',
                    color: '#2BB24C',
                    fontFamily: 'Inter'
                  }}
                >
                  Completo
                </span>
              </div>
              
              <div className="flex justify-between">
                <span 
                  style={{ 
                    fontSize: '14px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter'
                  }}
                >
                  Corpo
                </span>
                <span 
                  style={{ 
                    fontSize: '12px',
                    color: '#A0A0A0',
                    fontFamily: 'Inter'
                  }}
                >
                  Em progresso
                </span>
              </div>
              
              <div className="flex justify-between">
                <span 
                  style={{ 
                    fontSize: '14px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter'
                  }}
                >
                  Conclusão
                </span>
                <span 
                  style={{ 
                    fontSize: '12px',
                    color: '#A0A0A0',
                    fontFamily: 'Inter'
                  }}
                >
                  Pendente
                </span>
              </div>
            </div>
          </div>

          {/* Card de Estatísticas */}
          <div 
            className="p-3 rounded-lg"
            style={{ 
              backgroundColor: '#121212',
              border: '1px solid #333333'
            }}
          >
            <h3 
              className="font-medium mb-3"
              style={{ 
                fontSize: '16px',
                fontWeight: '500',
                color: '#E0E0E0',
                fontFamily: 'Inter'
              }}
            >
              Estatísticas
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span 
                  style={{ 
                    fontSize: '14px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter'
                  }}
                >
                  Palavras
                </span>
                <span 
                  style={{ 
                    fontSize: '12px',
                    color: '#A0A0A0',
                    fontFamily: 'Inter'
                  }}
                >
                  245
                </span>
              </div>
              
              <div className="flex justify-between">
                <span 
                  style={{ 
                    fontSize: '14px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter'
                  }}
                >
                  Caracteres
                </span>
                <span 
                  style={{ 
                    fontSize: '12px',
                    color: '#A0A0A0',
                    fontFamily: 'Inter'
                  }}
                >
                  1,458
                </span>
              </div>
              
              <div className="flex justify-between">
                <span 
                  style={{ 
                    fontSize: '14px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter'
                  }}
                >
                  Parágrafos
                </span>
                <span 
                  style={{ 
                    fontSize: '12px',
                    color: '#A0A0A0',
                    fontFamily: 'Inter'
                  }}
                >
                  8
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Card de Configurações */}
          <div 
            className="p-3 rounded-lg"
            style={{ 
              backgroundColor: '#121212',
              border: '1px solid #333333'
            }}
          >
            <h3 
              className="font-medium mb-3"
              style={{ 
                fontSize: '16px',
                fontWeight: '500',
                color: '#E0E0E0',
                fontFamily: 'Inter'
              }}
            >
              Preferências
            </h3>
            
            <div className="space-y-4">
              <div>
                <label 
                  style={{ 
                    fontSize: '14px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter',
                    display: 'block',
                    marginBottom: '8px'
                  }}
                >
                  Formato de saída
                </label>
                <select 
                  className="w-full p-2 rounded-lg border focus:outline-none"
                  style={{ 
                    backgroundColor: '#1E1E1E',
                    borderColor: '#333333',
                    color: '#E0E0E0',
                    fontFamily: 'Inter',
                    fontSize: '14px'
                  }}
                >
                  <option>Markdown</option>
                  <option>HTML</option>
                  <option>Plain Text</option>
                </select>
              </div>
              
              <div>
                <label 
                  style={{ 
                    fontSize: '14px',
                    color: '#E0E0E0',
                    fontFamily: 'Inter',
                    display: 'block',
                    marginBottom: '8px'
                  }}
                >
                  Auto-save
                </label>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    defaultChecked 
                    className="mr-2"
                    style={{ accentColor: '#2BB24C' }}
                  />
                  <span 
                    style={{ 
                      fontSize: '12px',
                      color: '#A0A0A0',
                      fontFamily: 'Inter'
                    }}
                  >
                    Salvar automaticamente a cada 30s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão GENERATE - Botão Primário */}
      <div className="mt-8">
        <button
          className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: '#2BB24C',
            color: '#FFFFFF',
            fontFamily: 'Inter',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            borderRadius: '6px'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#25A043';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#2BB24C';
          }}
        >
          GENERATE
        </button>
      </div>
    </div>
  );
};

export default ContextSidebar;