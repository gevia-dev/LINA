import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  ArrowRight, 
  Plus,
  Layers,
  Database,
  Link,
  Target,
  Monitor,
  Eye
} from 'lucide-react';

/**
 * DefaultNodesLibrary - Biblioteca de nodes padrão para o Advanced Canvas
 * Contém templates pré-definidos de nodes que podem ser arrastados para o canvas
 */
const DefaultNodesLibrary = ({ onAddNode }) => {
  // Definição dos nodes padrão disponíveis
  const defaultNodes = [
    {
      id: 'monitor',
      title: 'Monitor / Preview',
      description: 'Visualiza e combina conteúdo de múltiplos nodes conectados',
      icon: Monitor,
      color: '#2BB24C', // Verde principal
      isSpecial: true, // Indicador de node especial
      template: {
        type: 'monitorNode', // Tipo especial
        data: {
          title: 'Monitor',
          displayMode: 'combined',
          autoRefresh: true,
          showHeaders: true,
          hasContent: false,
          isEditing: false,
          metadata: {
            createdAt: new Date().toISOString(),
            nodeType: 'monitor',
            template: true,
            special: true
          }
        },
        position: { x: 0, y: 0 },
        style: {
          width: 500,
          height: 800
        }
      }
    },
    {
      id: 'estrutura',
      title: 'Estrutura',
      description: 'Node para organizar a estrutura do conteúdo - apenas saída laranja',
      icon: Layers,
      color: '#F5A623', // Laranja para estrutura
      template: {
        type: 'cardNode',
        data: {
          title: 'Estrutura',
          content: '## Estrutura\n\nOrganize aqui a estrutura do seu conteúdo...',
          nodeType: 'estrutura',
          coreKey: 'micro_estrutura', // Para ter estilo de microdado
          hasContent: true,
          isEditing: false,
          isStructureNode: true, // Flag especial para identificar node de estrutura
          structureType: 'continua', // Tipo de estrutura padrão
          metadata: {
            createdAt: new Date().toISOString(),
            nodeType: 'estrutura',
            template: true
          }
        },
        position: { x: 0, y: 0 },
        style: {
          width: 245, // 70% da largura padrão (350px)
          height: 110 // Altura ajustada para radio buttons
        }
      }
    }
  ];

  // Função para adicionar node ao canvas
  const handleAddNode = (nodeTemplate) => {
    if (onAddNode) {
      // Gerar posição aleatória para o novo node
      const randomX = Math.random() * 400 - 200;
      const randomY = Math.random() * 400 - 200;
      
      // Para o MonitorNode, posicionar mais ao centro
      const position = nodeTemplate.id === 'monitor' 
        ? { x: 0, y: 200 } // Posição mais centralizada para o monitor
        : { x: randomX, y: randomY };
      
      const newNode = {
        ...nodeTemplate.template,
        id: `${nodeTemplate.id}-${Date.now()}`,
        position
      };
      
      onAddNode(newNode);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header da seção */}
      <div className="p-4 border-b border-[#333333]">
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Layers 
              size={20} 
              style={{ color: '#F5A623' }}
            />
          </motion.div>
          <div>
            <h3 
              className="text-lg font-semibold"
              style={{ 
                color: 'var(--text-primary)',
                fontFamily: '"Nunito Sans", "Inter", sans-serif'
              }}
            >
              Nodes Padrão
            </h3>
            <p 
              className="text-sm"
              style={{ 
                color: 'var(--text-secondary)',
                fontFamily: '"Nunito Sans", "Inter", sans-serif'
              }}
            >
              Templates pré-definidos para o canvas
            </p>
          </div>
        </div>
      </div>

      {/* Lista de nodes padrão */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {defaultNodes.map((node, index) => (
            <motion.div
              key={node.id}
              className="group relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              {/* Badge para node especial */}
              {node.isSpecial && (
                <motion.div
                  className="absolute -top-2 -right-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <span 
                    className="px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: 'var(--primary-green)',
                      color: 'white'
                    }}
                  >
                    NOVO
                  </span>
                </motion.div>
              )}
              <div 
                className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                  node.isSpecial ? 'ring-2 ring-green-500/20' : ''
                }`}
                style={{
                  backgroundColor: node.isSpecial 
                    ? 'rgba(43, 178, 76, 0.05)' 
                    : 'var(--bg-secondary)',
                  borderColor: node.isSpecial 
                    ? 'var(--primary-green)' 
                    : 'var(--border-primary)',
                  borderLeft: `4px solid ${node.color}`
                }}
                onClick={() => handleAddNode(node)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className={`p-2 rounded-lg ${
                        node.isSpecial ? 'animate-pulse' : ''
                      }`}
                      style={{ 
                        backgroundColor: `${node.color}20`,
                        animation: node.isSpecial ? 'pulse 2s infinite' : 'none'
                      }}
                    >
                      <node.icon 
                        size={18} 
                        style={{ color: node.color }}
                      />
                    </div>
                    <div>
                      <h4 
                        className="font-medium flex items-center gap-2"
                        style={{ 
                          color: 'var(--text-primary)',
                          fontFamily: '"Nunito Sans", "Inter", sans-serif'
                        }}
                      >
                        {node.title}
                        {node.isSpecial && (
                          <Eye size={14} style={{ color: 'var(--primary-green)' }} />
                        )}
                      </h4>
                      <p 
                        className="text-sm"
                        style={{ 
                          color: 'var(--text-secondary)',
                          fontFamily: '"Nunito Sans", "Inter", sans-serif'
                        }}
                      >
                        {node.description}
                      </p>
                    </div>
                  </div>
                  
                  <motion.button
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                    style={{
                      backgroundColor: 'var(--primary-green-transparent)',
                      color: 'var(--primary-green)'
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddNode(node);
                    }}
                    title={`Adicionar ${node.title}`}
                  >
                    <Plus size={16} />
                  </motion.button>
                </div>

                {/* Preview do conteúdo */}
                <div 
                  className="p-3 rounded border text-sm"
                  style={{
                    backgroundColor: node.isSpecial 
                      ? 'rgba(0, 0, 0, 0.5)' 
                      : 'var(--bg-primary)',
                    borderColor: node.isSpecial 
                      ? 'var(--primary-green)' 
                      : 'var(--border-primary)',
                    color: 'var(--text-secondary)',
                    fontFamily: '"Nunito Sans", "Inter", sans-serif',
                    fontSize: '13px',
                    lineHeight: '1.4'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={12} style={{ color: node.color }} />
                    <span style={{ color: node.color, fontWeight: 500 }}>
                      {node.id === 'monitor' ? 'Funcionalidades' : 'Preview do conteúdo'}
                    </span>
                  </div>
                  {node.id === 'monitor' ? (
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>Agrega conteúdo de múltiplos nodes</li>
                      <li>3 modos de visualização</li>
                      <li>Preview em tempo real</li>
                      <li>Exportar e copiar conteúdo</li>
                      <li>Modo tela cheia</li>
                    </ul>
                  ) : (
                    <div className="text-xs opacity-80">
                      {node.template.data.content.split('\n')[0]}...
                    </div>
                  )}
                </div>

                {/* Informações do node */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#333333]">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Database size={12} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {node.template.data.nodeType || node.template.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link size={12} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {node.template.style.width}x{node.template.style.height}
                      </span>
                    </div>
                  </div>
                  
                  <motion.div
                    className="flex items-center gap-1 text-xs"
                    style={{ color: 'var(--primary-green)' }}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                  >
                    <span>Clique para adicionar</span>
                    <ArrowRight size={12} />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mensagem informativa */}
        <motion.div 
          className="mt-6 p-4 rounded-lg border border-dashed"
          style={{
            borderColor: 'var(--primary-green)',
            backgroundColor: 'rgba(43, 178, 76, 0.05)'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-center">
            <Monitor 
              size={24} 
              style={{ color: 'var(--primary-green)', margin: '0 auto 8px' }}
            />
            <p 
              className="text-sm font-medium"
              style={{ 
                color: 'var(--primary-green)',
                fontFamily: '"Nunito Sans", "Inter", sans-serif'
              }}
            >
              💡 Dica: Use o Monitor para visualizar conteúdo agregado
            </p>
            <p 
              className="text-xs mt-1"
              style={{ 
                color: 'var(--text-secondary)',
                opacity: 0.8,
                fontFamily: '"Nunito Sans", "Inter", sans-serif'
              }}
            >
              Conecte múltiplos nodes ao Monitor para ver o conteúdo combinado em tempo real
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DefaultNodesLibrary; 