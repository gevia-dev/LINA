# Diretrizes de Desenvolvimento para a IA

## 1. Princípios Fundamentais
- **Linguagem e Stack:** Este projeto é escrito em JavaScript utilizando React (com JSX) e Vite. A estilização é feita com Tailwind CSS, e as animações são controladas pelo Framer Motion. O backend e a autenticação são gerenciados pelo Supabase.
- **Estilo de Código:** Usamos ESLint para garantir a consistência do código. Siga rigorosamente as regras. Rode `pnpm run lint` para verificar.
- **Princípio KISS (Keep It Simple, Stupid):** Prefira soluções simples e legíveis. Componentes devem ser mantidos com menos de 150 linhas sempre que possível.

## 2. Arquitetura
- Usamos uma arquitetura baseada em componentes com uma separação clara de responsabilidades.
- **`pages/`**: Componentes que representam as rotas principais da aplicação.
- **`components/`**: Componentes reutilizáveis que compõem as páginas.
- **`services/`**: Onde reside a lógica de comunicação com APIs externas, como o Supabase. Abstrai a busca e a manipulação de dados.
- **`hooks/`**: Hooks customizados para encapsular lógica de estado e efeitos colaterais complexos.
- **`context/`**: Para gerenciamento de estado global, como autenticação.
- **`utils/`**: Funções utilitárias puras que podem ser usadas em qualquer parte da aplicação.

## 3. Testes
- **Obrigatório:** Toda nova lógica de negócio e componentes críticos devem ter testes correspondentes usando Vitest com React Testing Library.
- **Localização:** Os testes devem ficar em um diretório `__tests__` dentro da pasta do módulo correspondente (ex: `src/hooks/__tests__/useCanvasState.test.js`).
- **Comandos para rodar testes:**
  - `pnpm test`: Roda os testes em modo watch.
  - `pnpm test:run`: Roda todos os testes uma vez.
  - `pnpm test:ui`: Abre a interface gráfica do Vitest.

## 4. Gerenciamento de Dependências
- Use `pnpm install` para instalar novas dependências. A presença do arquivo `pnpm-lock.yaml` indica que `pnpm` é o gerenciador de pacotes do projeto. Sempre use a versão mais estável.

## 5. Convenções de Nomenclatura
- **Componentes:** `PascalCase` (ex: `FeedItem.jsx`).
- **Hooks:** `camelCase` com prefixo 'use' (ex: `useViewMode.js`).
- **Funções/Utils:** `camelCase` (ex: `textHelpers.js`).
- **Constantes:** `UPPER_SNAKE_CASE`.
- **Variáveis:** `camelCase`.