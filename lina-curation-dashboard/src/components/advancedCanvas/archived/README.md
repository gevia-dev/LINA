# Componentes Arquivados

## InventoryPanel.jsx

**Status:** Arquivado em 2025

**Descrição:** Painel de inventário para drag & drop de itens ao editor.

**Funcionalidades que tinha:**
- Painel lateral com lista de itens salvos
- Sistema de drag & drop para transferir itens ao editor
- Contador de itens não lidos
- Botão de toggle para abrir/fechar
- Variantes de posicionamento (inside-editor, overlay-right)

**Motivo do arquivamento:** 
- Funcionalidade não estava sendo utilizada ativamente
- Simplificação da interface do usuário
- Foco nas funcionalidades principais do canvas

**Dependências removidas:**
- Estados: `inventoryItems`, `isInventoryOpen`, `inventoryUnread`
- Funções: `handleAddToInventory`, `onToggleInventory`
- Props: `onAddToInventory` em vários componentes
- Estilos CSS relacionados ao inventário
- Botões e controles de UI do inventário

**Arquivos afetados:**
- `CanvasLibraryView.jsx` - Removidas props e lógica do inventário
- `BlockNoteEditor.jsx` - Removido painel e controles
- `NotionLikePage.jsx` - Removidos estados e funções
- `index.css` - Removidos estilos CSS

**Como restaurar (se necessário):**
1. Mover `InventoryPanel.jsx` de volta para `src/components/advancedCanvas/`
2. Restaurar imports nos arquivos
3. Restaurar props e estados relacionados
4. Restaurar estilos CSS
5. Restaurar botões e controles de UI
