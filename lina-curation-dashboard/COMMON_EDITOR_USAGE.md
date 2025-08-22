# CommonTextEditor - Componente Comum de Editor de Texto

## Visão Geral

O `CommonTextEditor` é um componente reutilizável que unifica a experiência de edição de texto para todas as plataformas (Instagram, LinkedIn e Blog) no projeto LINA. Ele substitui os editores individuais anteriores e oferece uma interface consistente baseada no BlockNote.

## Características

- **Editor Unificado**: Usa o mesmo editor BlockNote para todas as plataformas
- **Interface Consistente**: Mesma aparência e comportamento em todos os contextos
- **Modo Visualização/Edição**: Alterna entre visualização e edição com botões intuitivos
- **Cores por Plataforma**: Cada plataforma tem sua cor característica
- **Responsivo**: Adapta-se a diferentes tamanhos de tela
- **Acessibilidade**: Suporte completo a navegação por teclado e leitores de tela

## Uso Básico

```jsx
import CommonTextEditor from './components/CommonTextEditor';

// Editor para Instagram
<CommonTextEditor
  content={instagramContent}
  platform="instagram"
  isEditing={isEditing}
  onEditToggle={setIsEditing}
  onSave={handleSave}
  onCancel={handleCancel}
  placeholder="Comece a escrever seu post Instagram..."
/>

// Editor para LinkedIn
<CommonTextEditor
  content={linkedinContent}
  platform="linkedin"
  isEditing={isEditing}
  onEditToggle={setIsEditing}
  onSave={handleSave}
  onCancel={handleCancel}
  placeholder="Comece a escrever seu post LinkedIn..."
/>

// Editor para Blog
<CommonTextEditor
  content={blogContent}
  platform="blog"
  isEditing={isEditing}
  onEditToggle={setIsEditing}
  onSave={handleSave}
  onCancel={handleCancel}
  placeholder="Comece a escrever seu post de blog..."
/>
```

## Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `content` | string | `''` | Conteúdo atual do editor |
| `onSave` | function | - | Função chamada ao salvar (recebe o novo conteúdo) |
| `onCancel` | function | - | Função chamada ao cancelar edição |
| `isEditing` | boolean | `false` | Controla se está em modo de edição |
| `onEditToggle` | function | - | Função para alternar modo de edição |
| `platform` | string | `'blog'` | Plataforma: `'blog'`, `'instagram'`, `'linkedin'` |
| `placeholder` | string | `'Comece a escrever...'` | Texto de placeholder quando vazio |
| `className` | string | `''` | Classes CSS adicionais |
| `style` | object | `{}` | Estilos inline adicionais |

## Estados

### Modo Visualização
- Exibe o conteúdo em formato legível
- Botão "Editar" para iniciar edição
- Cores e estilos específicos da plataforma

### Modo Edição
- Editor BlockNote ativo
- Botões "Salvar" e "Cancelar"
- Toolbar de formatação integrada
- Validação e feedback visual

## Funcionalidades do Editor

### BlockNote Features
- **Formatação de Texto**: Negrito, itálico, sublinhado
- **Cabeçalhos**: H1, H2, H3
- **Listas**: Ordenadas e não ordenadas
- **Citações**: Blocos de citação
- **Links**: Inserção e edição de URLs
- **Imagens**: Upload e inserção de imagens

### Atalhos de Teclado
- `Ctrl/Cmd + B`: Negrito
- `Ctrl/Cmd + I`: Itálico
- `Ctrl/Cmd + K`: Inserir link
- `Ctrl/Cmd + Shift + L`: Lista não ordenada
- `Ctrl/Cmd + Shift + O`: Lista ordenada

## Integração com o Sistema

### NewsReaderPanel
O `CommonTextEditor` foi integrado ao `NewsReaderPanel` para substituir os editores individuais:

- **LinkedIn Enxuto**: `platform="linkedin"`
- **LinkedIn Informativo**: `platform="linkedin"`
- **Instagram**: `platform="instagram"`

### Persistência de Dados
- O conteúdo é salvo localmente no estado do componente
- Funções `onSave` permitem integração com APIs externas
- Suporte a diferentes formatos de conteúdo

## Estilos e Temas

### Cores por Plataforma
```css
:root {
  --linkedin-primary: #0077B5;  /* Azul LinkedIn */
  --instagram-primary: #E4405F; /* Rosa Instagram */
  --primary-green: #2BB24C;     /* Verde Blog (padrão) */
}
```

### Variáveis CSS Utilizadas
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--text-primary`, `--text-secondary`, `--text-white`
- `--border-primary`, `--border-secondary`

## Responsividade

O componente se adapta automaticamente a diferentes tamanhos de tela:

- **Desktop**: Largura máxima de 800px
- **Tablet**: Padding reduzido e scroll otimizado
- **Mobile**: Layout vertical e botões empilhados

## Acessibilidade

- **Navegação por Teclado**: Tab, Enter, Escape
- **ARIA Labels**: Descrições para leitores de tela
- **Contraste**: Cores otimizadas para legibilidade
- **Foco Visual**: Indicadores claros de foco

## Logs e Debug

O componente inclui logs detalhados para facilitar o desenvolvimento:

```javascript
console.log('✅ Post LinkedIn enxuto salvo:', newContent);
console.log('✅ Post Instagram salvo:', newContent);
```

## Exemplo de Implementação Completa

```jsx
import React, { useState } from 'react';
import CommonTextEditor from './components/CommonTextEditor';

const MyEditor = () => {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async (newContent) => {
    try {
      // Salvar no banco de dados
      await saveToDatabase(newContent);
      setContent(newContent);
      toast.success('Conteúdo salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar conteúdo');
      console.error('Erro:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <CommonTextEditor
      content={content}
      platform="instagram"
      isEditing={isEditing}
      onEditToggle={setIsEditing}
      onSave={handleSave}
      onCancel={handleCancel}
      placeholder="Digite seu post aqui..."
    />
  );
};
```

## Benefícios da Unificação

1. **Consistência**: Mesma experiência em todas as plataformas
2. **Manutenibilidade**: Código centralizado e reutilizável
3. **Performance**: Menos re-renderizações e melhor otimização
4. **UX**: Interface familiar para os usuários
5. **Desenvolvimento**: Menos código duplicado e bugs

## Migração

Para migrar editores existentes para o `CommonTextEditor`:

1. Substituir imports dos editores antigos
2. Atualizar props para usar a nova interface
3. Implementar funções `onSave` e `onCancel`
4. Remover código duplicado de edição
5. Testar funcionalidades específicas da plataforma

## Suporte

Para dúvidas ou problemas com o `CommonTextEditor`:

1. Verificar logs no console
2. Validar props obrigatórias
3. Testar em diferentes plataformas
4. Verificar integração com BlockNote
5. Consultar documentação do BlockNote se necessário
