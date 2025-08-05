import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CanvasEditorV2 from '../CanvasEditorV2';

// Mock do ReactFlow
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, nodes, onNodesChange }) => (
    <div data-testid="react-flow">
      {nodes?.map(node => (
        <div key={node.id} data-testid={`node-${node.id}`}>
          <div data-testid={`node-title-${node.id}`}>{node.data.title}</div>
          <div data-testid={`node-content-${node.id}`}>{node.data.content}</div>
          <div data-testid={`node-editing-${node.id}`}>{node.data.isEditing ? 'editing' : 'not-editing'}</div>
          <button 
            data-testid={`node-edit-${node.id}`}
            onClick={() => node.data.onEdit(node.id)}
          >
            Edit
          </button>
          <button 
            data-testid={`node-transfer-${node.id}`}
            onClick={() => node.data.onTransfer(node.id, node.data.content)}
          >
            Transfer
          </button>
        </div>
      ))}
      {children}
    </div>
  ),
  Background: ({ children }) => <div data-testid="background">{children}</div>,
  Controls: ({ children }) => <div data-testid="controls">{children}</div>,
  MiniMap: ({ children }) => <div data-testid="minimap">{children}</div>,
  Panel: ({ children }) => <div data-testid="panel">{children}</div>,
  useNodesState: () => [[], vi.fn(), vi.fn()],
  useEdgesState: () => [[], vi.fn(), vi.fn()],
  addEdge: vi.fn(),
  ConnectionLineType: { SmoothStep: 'smoothstep' }
}));

// Mock do Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  }
}));

// Dados de teste reais
const mockNewsData = {
  core_structure: JSON.stringify({
    Introduce: "Esta é uma introdução real de teste com conteúdo válido",
    corpos_de_analise: "Este é o corpo da análise com informações importantes",
    conclusoes: "Esta é a conclusão final do artigo"
  })
};

const mockEmptyNewsData = {
  core_structure: null
};

const defaultProps = {
  newsId: '123',
  newsTitle: 'Notícia de Teste',
  isLoading: false,
  loadError: null,
  selectedBlock: null,
  onBlockSelected: vi.fn(),
  onTransferBlock: vi.fn()
};

describe('CanvasEditorV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar com dados válidos', () => {
    render(<CanvasEditorV2 {...defaultProps} newsData={mockNewsData} />);
    
    expect(screen.getByText('Editando Notícia - Canvas V2')).toBeInTheDocument();
    expect(screen.getByText('Notícia de Teste')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('deve renderizar nodes com dados corretos', () => {
    render(<CanvasEditorV2 {...defaultProps} newsData={mockNewsData} />);
    
    // Verificar se os nodes foram criados
    expect(screen.getByTestId('node-summary')).toBeInTheDocument();
    expect(screen.getByTestId('node-body')).toBeInTheDocument();
    expect(screen.getByTestId('node-conclusion')).toBeInTheDocument();
    
    // Verificar títulos
    expect(screen.getByTestId('node-title-summary')).toHaveTextContent('Introdução');
    expect(screen.getByTestId('node-title-body')).toHaveTextContent('Corpo');
    expect(screen.getByTestId('node-title-conclusion')).toHaveTextContent('Conclusão');
    
    // Verificar conteúdo
    expect(screen.getByTestId('node-content-summary')).toHaveTextContent('Esta é uma introdução real de teste com conteúdo válido');
    expect(screen.getByTestId('node-content-body')).toHaveTextContent('Este é o corpo da análise com informações importantes');
    expect(screen.getByTestId('node-content-conclusion')).toHaveTextContent('Esta é a conclusão final do artigo');
  });

  it('deve renderizar placeholders quando não há dados', () => {
    render(<CanvasEditorV2 {...defaultProps} newsData={mockEmptyNewsData} />);
    
    expect(screen.getByTestId('node-content-summary')).toHaveTextContent('Clique para selecionar');
    expect(screen.getByTestId('node-content-body')).toHaveTextContent('Clique para selecionar');
    expect(screen.getByTestId('node-content-conclusion')).toHaveTextContent('Clique para selecionar');
  });

  it('deve chamar onBlockSelected quando botão de edição é clicado', () => {
    render(<CanvasEditorV2 {...defaultProps} newsData={mockNewsData} />);
    
    const editButton = screen.getByTestId('node-edit-summary');
    fireEvent.click(editButton);
    
    expect(defaultProps.onBlockSelected).toHaveBeenCalledWith('summary');
  });

  it('deve chamar onTransferBlock quando botão de transferência é clicado', () => {
    render(<CanvasEditorV2 {...defaultProps} newsData={mockNewsData} />);
    
    const transferButton = screen.getByTestId('node-transfer-summary');
    fireEvent.click(transferButton);
    
    expect(defaultProps.onTransferBlock).toHaveBeenCalledWith(
      'summary', 
      'Esta é uma introdução real de teste com conteúdo válido'
    );
  });

  it('deve mostrar estado de carregamento', () => {
    render(<CanvasEditorV2 {...defaultProps} newsData={mockNewsData} isLoading={true} />);
    
    expect(screen.getByText('Carregando dados da notícia...')).toBeInTheDocument();
  });

  it('deve mostrar erro quando há loadError', () => {
    const errorMessage = 'Erro ao carregar dados';
    render(<CanvasEditorV2 {...defaultProps} newsData={mockNewsData} loadError={errorMessage} />);
    
    expect(screen.getByText(`Erro ao carregar: ${errorMessage}`)).toBeInTheDocument();
  });

  it('deve renderizar componentes do ReactFlow', () => {
    render(<CanvasEditorV2 {...defaultProps} newsData={mockNewsData} />);
    
    expect(screen.getByTestId('background')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    expect(screen.getByTestId('minimap')).toBeInTheDocument();
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('deve mostrar informações no panel', () => {
    render(<CanvasEditorV2 {...defaultProps} newsData={mockNewsData} />);
    
    expect(screen.getByText('Canvas Interativo V2')).toBeInTheDocument();
    expect(screen.getByText('Arraste os blocos para reorganizar')).toBeInTheDocument();
    expect(screen.getByText('Clique para selecionar, duplo clique para editar')).toBeInTheDocument();
  });
}); 