# Requirements Document

## Introduction

O sistema atual de marcadores no editor BlockNote+TipTap apresenta um problema crítico de reindexação quando novo texto é inserido entre marcadores existentes. Atualmente, quando texto é inserido entre marcadores [16] e [17], o novo texto recebe o próximo marcador disponível [18], mas os marcadores subsequentes não são reindexados, causando quebra na funcionalidade de grifos. Esta spec define os requisitos para implementar um sistema automático de reindexação que mantenha a integridade dos marcadores e preserve a funcionalidade dos grifos.

## Requirements

### Requirement 1

**User Story:** Como um editor de conteúdo, eu quero que os marcadores sejam automaticamente reindexados quando insiro texto entre marcadores existentes, para que todos os grifos continuem funcionando corretamente.

#### Acceptance Criteria

1. WHEN um novo texto é inserido entre dois marcadores existentes THEN o sistema SHALL reindexar automaticamente todos os marcadores subsequentes
2. WHEN a reindexação ocorre THEN o referenceMapping SHALL ser atualizado para manter a correspondência título ↔ marcador
3. WHEN um marcador é reindexado THEN todos os nodes do canvas que referenciam esse marcador SHALL continuar grifando o texto correto
4. WHEN a inserção de texto é concluída THEN o sistema SHALL preservar a funcionalidade de grifos existentes sem interrupção

### Requirement 2

**User Story:** Como desenvolvedor, eu quero uma função de reindexação que seja chamada automaticamente após cada inserção de texto via canvas, para que não seja necessário intervenção manual.

#### Acceptance Criteria

1. WHEN a função insertTextAtPosition é executada THEN o sistema SHALL detectar automaticamente se a inserção ocorreu entre marcadores existentes
2. WHEN inserção entre marcadores é detectada THEN o sistema SHALL executar a reindexação automaticamente
3. WHEN a reindexação é executada THEN o sistema SHALL atualizar o conteúdo do editor com os novos marcadores
4. WHEN a reindexação é concluída THEN o sistema SHALL notificar o referenceMapping sobre as mudanças

### Requirement 3

**User Story:** Como usuário do sistema, eu quero que a reindexação seja transparente e não interfira na minha experiência de edição, para que eu possa continuar trabalhando sem interrupções.

#### Acceptance Criteria

1. WHEN a reindexação ocorre THEN o processo SHALL ser executado em menos de 500ms
2. WHEN a reindexação está em andamento THEN o cursor do usuário SHALL permanecer na posição correta
3. WHEN a reindexação é concluída THEN o usuário SHALL poder continuar editando imediatamente
4. IF ocorrer erro na reindexação THEN o sistema SHALL manter o estado anterior e exibir mensagem de erro apropriada

### Requirement 4

**User Story:** Como administrador do sistema, eu quero logs detalhados do processo de reindexação, para que eu possa monitorar e debugar problemas quando necessário.

#### Acceptance Criteria

1. WHEN a reindexação é iniciada THEN o sistema SHALL registrar log com marcadores antes da reindexação
2. WHEN a reindexação é concluída THEN o sistema SHALL registrar log com marcadores após a reindexação
3. WHEN erro ocorre na reindexação THEN o sistema SHALL registrar log detalhado do erro
4. WHEN referenceMapping é atualizado THEN o sistema SHALL registrar log das mudanças no mapeamento

### Requirement 5

**User Story:** Como desenvolvedor, eu quero que o sistema de reindexação seja compatível com a arquitetura existente, para que não seja necessário refatorar componentes existentes.

#### Acceptance Criteria

1. WHEN a reindexação é implementada THEN o sistema SHALL manter compatibilidade com NotionLikePage.jsx
2. WHEN a reindexação é implementada THEN o sistema SHALL manter compatibilidade com BlockNoteEditor.jsx
3. WHEN a reindexação é implementada THEN o sistema SHALL manter compatibilidade com CanvasLibraryView.jsx
4. WHEN a reindexação é implementada THEN o sistema SHALL utilizar as funções existentes em textHelpers.js

### Requirement 6

**User Story:** Como usuário, eu quero que o sistema detecte corretamente a posição de inserção e determine quais marcadores precisam ser reindexados, para que apenas os marcadores necessários sejam alterados.

#### Acceptance Criteria

1. WHEN texto é inserido antes do primeiro marcador THEN nenhuma reindexação SHALL ser necessária
2. WHEN texto é inserido após o último marcador THEN nenhuma reindexação SHALL ser necessária  
3. WHEN texto é inserido entre marcadores [n] e [n+1] THEN apenas marcadores >= [n+1] SHALL ser reindexados
4. WHEN múltiplas inserções ocorrem rapidamente THEN o sistema SHALL processar cada inserção corretamente