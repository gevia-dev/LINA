# Projeto: Sistema de Linha Principal para Canvas Library

## Contexto
- React 18+ com hooks modernos
- React Flow (@xyflow/react) para canvas
- Framer Motion para animações
- TailwindCSS para estilos
- Arquitetura baseada em componentes reutilizáveis

## Padrões de Código
- Use functional components com hooks
- Evite classes, prefira composição
- Nomeie arquivos: PascalCase para componentes, camelCase para hooks
- Sempre use useCallback e useMemo para otimização
- Mantenha componentes < 200 linhas

## Não faça
- NÃO use localStorage/sessionStorage (não funciona no Claude.ai)
- NÃO modifique arquivos existentes sem necessidade
- NÃO remova comentários de documentação
- NÃO quebre funcionalidades existentes

## Teste sempre
- Verifique se o canvas renderiza
- Teste drag & drop de nodes
- Valide sincronização editor-canvas

