import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  ArrowRight, 
  Plus,
  Layers,
  Database,
  Link,
  Target
} from 'lucide-react';

/**
 * DefaultNodesLibrary - Biblioteca de nodes padrão para o Advanced Canvas
 * Contém templates pré-definidos de nodes que podem ser arrastados para o canvas
 */
const DefaultNodesLibrary = ({ onAddNode }) => {
  // Definição dos nodes padrão disponíveis
  const defaultNodes = [
    {
      id: 'estrutura',
      title: 'Estrutura',
      description: 'Node para organizar a estrutura do conteúdo',
      icon: Layers,
      color: '#F5A623', // Laranja para estrutura
      template: {
        type: 'cardNode',
        data: {
          content: '## Estrutura\n\nOrganize aqui a estrutura do seu conteúdo...',
          nodeType: 'estrutura',
          coreKey: 'micro_estrutura', // Para ter estilo de microdado
          hasContent: true,
          isEditing: false,
          metadata: {
            createdAt: new Date().toISOString(),
            nodeType: 'estrutura',
            template: true
          }
        },
        position: { x: 0, y: 0 },
        style: {
          width: 250, // Largura de microdado
          height: 120 // Altura de microdado
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
      
      const newNode = {
        ...nodeTemplate.template,
        id: `${nodeTemplate.id}-${Date.now()}`,
        position: { x: randomX, y: randomY }
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
              <div 
                className="p-4 rounded-lg border transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-primary)',
                  borderLeft: `4px solid ${node.color}`
                }}
                onClick={() => handleAddNode(node)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${node.color}20` }}
                    >
                      <node.icon 
                        size={18} 
                        style={{ color: node.color }}
                      />
                    </div>
                    <div>
                      <h4 
                        className="font-medium"
                        style={{ 
                          color: 'var(--text-primary)',
                          fontFamily: '"Nunito Sans", "Inter", sans-serif'
                        }}
                      >
                        {node.title}
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
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-secondary)',
                    fontFamily: '"Nunito Sans", "Inter", sans-serif',
                    fontSize: '13px',
                    lineHeight: '1.4'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={12} style={{ color: node.color }} />
                    <span style={{ color: node.color, fontWeight: 500 }}>
                      Preview do conteúdo
                    </span>
                  </div>
                  <div className="text-xs opacity-80">
                    {node.template.data.content.split('\n')[0]}...
                  </div>
                </div>

                {/* Informações do node */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#333333]">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Database size={12} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {node.template.data.nodeType}
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
            borderColor: 'var(--border-primary)',
            backgroundColor: 'var(--bg-primary)'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-center">
            <FileText 
              size={24} 
              style={{ color: 'var(--text-secondary)', margin: '0 auto 8px' }}
            />
            <p 
              className="text-sm"
              style={{ 
                color: 'var(--text-secondary)',
                fontFamily: '"Nunito Sans", "Inter", sans-serif'
              }}
            >
              Clique em qualquer node para adicioná-lo ao canvas
            </p>
            <p 
              className="text-xs mt-1"
              style={{ 
                color: 'var(--text-secondary)',
                opacity: 0.7,
                fontFamily: '"Nunito Sans", "Inter", sans-serif'
              }}
            >
              Os nodes serão posicionados automaticamente
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DefaultNodesLibrary; 