# Implementation Plan

- [x] 1. Criar MarkerReindexingService com funcionalidades core





  - Implementar classe MarkerReindexingService em src/utils/markerReindexingService.js
  - Criar método detectInsertionBetweenMarkers para identificar quando inserção ocorre entre marcadores existentes
  - Implementar método reindexMarkersAfterInsertion para executar reindexação automática
  - Adicionar método updateReferenceMapping para sincronizar mapeamento título ↔ marcador
  - _Requirements: 1.1, 2.1, 5.1_
-


- [x] 2. Implementar detecção automática de inserções entre marcadores



  - Criar função para extrair todos os marcadores [n] de um texto
  - Implementar algoritmo para determinar posição de inserção relativa aos marcadores existentes
  - Adicionar lógica para identificar range de marcadores que precisam ser reindexados
  - Criar estrutura InsertionContext para armazenar contexto da inserção
  - _Requirements: 1.1, 6.3_

- [x] 3. Desenvolver algoritmo de reindexação sequencial





  - Implementar lógica para reindexar apenas marcadores >= posição de inserção
  - Criar função para gerar novo conteúdo com marcadores reindexados
  - Adicionar validação para garantir sequência numérica correta
  - Implementar mapeamento entre marcadores antigos e novos (ReindexingMap)
  - _Requirements: 1.1, 1.2, 6.3_

- [x] 4. Integrar MarkerReindexingService com BlockNoteEditor





  - Modificar método insertTextAtPosition em BlockNoteEditor.jsx para usar MarkerReindexingService
  - Adicionar detecção automática após cada inserção de texto
  - Implementar callback onReindexing para notificar sobre reindexações
  - Integrar aplicação de mudanças no editor TipTap
  - _Requirements: 2.1, 2.2, 5.2_


- [x] 5. Implementar atualização automática do referenceMapping




  - Modificar updateReferenceMapping em NotionLikePage.jsx para receber ReindexingMap
  - Criar callback handleMarkerReindexing para processar notificações de reindexação
  - Implementar sincronização bidirecional do mapeamento título ↔ marcador
  - Adicionar logs detalhados das mudanças no referenceMapping
  - _Requirements: 1.2, 4.4, 5.1_
- [x] 6. Desenvolver sistema de error handling e rollback










- [ ] 6. Desenvolver sistema de error handling e rollback

  - Implementar backup do estado antes da reindexação
  - Criar função de rollback automático em caso de erro
  - Adicionar validação de integridade após reindexação
  - Implementar tratamento de erros com preservação da funcionalidade básica
  - _Requirements: 3.4, 5.3, 5.4_

- [x] 7. Criar testes unitários para MarkerReindexingService






  - Escrever testes para detectInsertionBetweenMarkers com diferentes cenários
  - Criar testes para reindexMarkersAfterInsertion verificando sequência correta
  - Implementar testes para updateReferenceMapping validando sincronização
  - Adicionar testes para casos edge (primeiro marcador, último marcador, sem marcadores)
  - _Requirements: 1.1, 1.2, 6.1, 6.2_,
-

- [x] 8. Implementar testes de integração com BlockNoteEditor





  - Criar testes para verificar que inserção entre marcadores dispara reindexação
  - Testar que inserção no início/fim não dispara reindexação desnecessária
  - Verificar que múltiplas inserções são processadas corretamente
  - Testar que erros na reindexação não quebram o editor
  - _Requirements: 2.1, 2.2, 2.3, 3.4_

- [x] 9. Desenvolver testes E2E para sistema completo










  - Criar teste simulando inserção via drag & drop do canvas
  - Verificar que grifos continuam funcionando após reindexação
  - Testar que referenceMapping permanece sincronizado
  - Implementar teste de performance com documentos grandes (50+ marcadores)
  - _Requirements: 1.3, 1.4, 3.1, 3.2_

- [ ] 10. Implementar otimizações de performance



  - Adicionar cache de posições de marcadores para detecção eficiente
  - Implementar processamento apenas da região afetada pela inserção
  - Criar debounce para múltiplas inserções rápidas
  - Otimizar batch updates no editor para reduzir re-renders
  - _Requirements: 3.1, 3.2_


- [ ] 11. Adicionar sistema de logging e monitoramento


  - Implementar logs detalhados com níveis DEBUG, INFO, WARN, ERROR
  - Adicionar métricas de tempo de execução da reindexação
  - Criar logs para rastreamento de mudanças no referenceMapping
  - Implementar logging de erros com contexto detalhado para debug
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 12. Integrar com sistema de grifos existente






  - Verificar compatibilidade com getMarkerSentenceRange em NotionLikePage.jsx
  - Testar que handleHighlightText continua funcionando após reindexação
  - Validar que eventos de hover do canvas ainda disparam grifos corretos
  - Garantir que CanvasLibraryView.jsx continua funcionando sem modificações
  - _Requirements: 1.3, 5.3_

- [ ] 13. Implementar validação e testes de integridade



  - Criar função para validar que não há marcadores duplicados após reindexação
  - Implementar verificação de que todos os marcadores estão em sequência
  - Adicionar validação de correspondência no referenceMapping
  - Criar teste automático de integridade executado após cada reindexação
  - _Requirements: 1.1, 1.4, 6.4_

- [ ] 14. Otimizar experiência do usuário durante reindexação

  - Garantir que processo de reindexação execute em menos de 500ms
  - Preservar posição do cursor durante reindexação
  - Implementar feedback visual discreto durante operação (se necessário)
  - Testar que usuário pode continuar editando imediatamente após reindexação
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 15. Criar documentação e ferramentas de debug
  - Documentar API do MarkerReindexingService com exemplos de uso
  - Criar guia de troubleshooting para problemas comuns
  - Implementar ferramentas de debug para visualizar referenceMapping
  - Adicionar comentários detalhados no código para manutenção futura
  - _Requirements: 4.1, 4.2, 4.3, 5.1_