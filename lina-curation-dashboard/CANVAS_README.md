# 🎨 Sistema de Canvas Interativo - LINA

## 📋 Visão Geral

Este sistema implementa um editor de canvas interativo usando **ReactFlow** (@xyflow/react) que substitui o EditorPanel tradicional, mantendo todas as funcionalidades existentes e adicionando recursos de drag & drop, zoom e reorganização visual.

## 🚀 Componentes Principais

### 1. **CardNode.jsx** - Nó Customizado
- Renderiza blocos (summary, body, conclusion) como nós do ReactFlow
- Preserva funcionalidades de edição inline do EditorPanel original
- Implementa toolbar de formatação (Bold, Italic, Underline)
- Mantém botão de transferência para ContextSidebar
- Inclui handles de conexão (top/bottom) para futuras funcionalidades

### 2. **useCanvasState.js** - Hook Customizado
- Converte `newsData.core_structure` para formato de nodes/edges do ReactFlow
- Implementa conversão bidirecional entre estrutura atual e formato canvas
- Gerencia estados de edição e seleção
- Detecta conteúdo válido vs placeholders
- Memoiza valores para performance

### 3. **CanvasEditorV2.jsx** - Editor Principal
- Integra ReactFlow com Background, Controls e MiniMap
- Usa CardNode como tipo de nó customizado
- Mantém compatibilidade total com props do EditorPanel original
- Implementa posicionamento automático dos blocos

## 🧪 Testes Implementados

### Testes Unitários (11 testes)
- ✅ Conversão de newsData para nodes
- ✅ Detecção de conteúdo válido/inválido
- ✅ Conversão bidirecional
- ✅ Gerenciamento de estados de edição
- ✅ Tratamento de JSON inválido

### Testes de Integração (9 testes)
- ✅ Renderização com dados reais
- ✅ Funcionalidades de edição e transferência
- ✅ Estados de carregamento e erro
- ✅ Componentes do ReactFlow

## 📦 Instalação e Configuração

### Dependências
```bash
pnpm add @xyflow/react
pnpm add -D @testing-library/react @testing-library/jest-dom vitest jsdom
```

### Configuração de Testes
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    css: true,
  },
});
```

## 🔧 Como Usar

### 1. Substituir EditorPanel por CanvasEditorV2

```javascript
// Em CurationPage.jsx
import CanvasEditorV2 from './CanvasEditorV2';

// Substituir:
<EditorPanel 
  newsId={id} 
  newsData={newsData}
  // ... outras props
/>

// Por:
<CanvasEditorV2 
  newsId={id} 
  newsData={newsData}
  // ... mesmas props
/>
```

### 2. Usar CurationPageWithCanvas (Exemplo Completo)

```javascript
import CurationPageWithCanvas from './CurationPageWithCanvas';

// Usar diretamente ou adicionar à rota
<Route path="/curation/:id" element={<CurationPageWithCanvas />} />
```

## 🎯 Funcionalidades Preservadas

### ✅ Sistema de Edição Inline
- Click para selecionar bloco
- Duplo click para editar
- Toolbar de formatação (Bold, Italic, Underline)
- Detecção de seleção de texto

### ✅ Transferência de Blocos
- Botão ArrowLeft para transferir para ContextSidebar
- Preservação de conteúdo existente
- Integração com sistema Supabase

### ✅ Estados Visuais
- Selected state com overlay
- Editing state com borda verde
- Hover effects e animações
- Placeholders para conteúdo vazio

### ✅ Compatibilidade
- Mesmas props do EditorPanel original
- Integração com ContextSidebar
- Compatibilidade com newsData existente
- Sistema de cores e tipografia preservado

## 🆕 Funcionalidades Adicionadas

### 🎨 Canvas Interativo
- **Drag & Drop**: Arrastar e reorganizar blocos
- **Zoom**: Suporte a zoom de 0.5x a 2x
- **Pan**: Navegação pelo canvas
- **MiniMap**: Visão geral no canto inferior direito
- **Controls**: Botões de zoom, fit view e reset

### 🔗 Handles de Conexão
- Handles no topo e base de cada nó
- Preparado para futuras funcionalidades de conexão
- Estilo consistente com design system

### 📱 Responsividade
- Adaptação automática ao tamanho da tela
- Fit view automático na inicialização
- Panel informativo com instruções

## 🧪 Executar Testes

```bash
# Executar todos os testes
pnpm test:run

# Executar testes em modo watch
pnpm test

# Executar testes com UI
pnpm test:ui
```

## 📁 Estrutura de Arquivos

```
src/
├── components/
│   ├── CardNode.jsx              # Nó customizado do ReactFlow
│   ├── CanvasEditorV2.jsx        # Editor principal com canvas
│   ├── CurationPageWithCanvas.jsx # Exemplo de integração
│   └── __tests__/
│       └── CanvasEditorV2.test.jsx
├── hooks/
│   ├── useCanvasState.js         # Hook para gerenciar estado do canvas
│   └── __tests__/
│       └── useCanvasState.test.js
└── test/
    └── setup.js                  # Configuração de testes
```

## 🎨 Design System

### Cores
- **Primary Green**: `#2BB24C` (botões, seleção)
- **Background**: `var(--bg-primary)` e `var(--bg-secondary)`
- **Text**: `var(--text-primary)` e `var(--text-secondary)`
- **Borders**: `var(--border-primary)`

### Tipografia
- **Font Family**: `'Nunito Sans', 'Inter', sans-serif`
- **Sizes**: 15px para conteúdo, 16px para títulos
- **Line Height**: 1.7 para melhor legibilidade

### Animações
- **Framer Motion**: Transições suaves
- **Hover Effects**: Scale e translateY
- **Shimmer**: Efeito de brilho em blocos selecionados

## 🔮 Próximos Passos

### Funcionalidades Futuras
1. **Conexões entre Blocos**: Usar handles para conectar blocos
2. **Templates**: Salvar layouts de canvas
3. **Undo/Redo**: Histórico de mudanças
4. **Export**: Exportar canvas como imagem
5. **Collaboration**: Edição colaborativa em tempo real

### Melhorias Técnicas
1. **Performance**: Virtualização para muitos nós
2. **Accessibility**: Suporte completo a acessibilidade
3. **Mobile**: Otimização para dispositivos móveis
4. **Offline**: Funcionalidade offline com sync

## 🐛 Troubleshooting

### Problemas Comuns

1. **Nodes não aparecem**
   - Verificar se `newsData` está sendo passado corretamente
   - Confirmar se `nodeTypes` está configurado

2. **Toolbar de formatação não funciona**
   - Verificar se `isEditing` está true
   - Confirmar se seleção está dentro do node correto

3. **Erro de import do ReactFlow**
   - Verificar se `@xyflow/react` está instalado
   - Confirmar se CSS está importado: `@xyflow/react/dist/style.css`

### Logs de Debug
```javascript
// Adicionar logs para debug
console.log('Nodes:', nodes);
console.log('NewsData:', newsData);
console.log('Editing Block:', editingBlock);
```

## 📄 Licença

Este sistema segue as mesmas diretrizes do projeto LINA e mantém compatibilidade total com o sistema existente. 