# Correção do Título no ReferenceMapping

## 🔍 **Problema Identificado**

O `referenceMapping` estava sendo preenchido **incorretamente**:

- **Título esperado**: "Engajamento nas Redes Sociais" (do `core_quotes`)
- **Título inserido**: "O engajamento nas redes sociais foi limitado pela" (primeiros 50 chars da frase)

## 🛠️ **Causa Raiz**

### **Fluxo Incorreto:**
1. `textInsertionHelpers.js` → Extrai `nodeToInsert.data.title` (correto)
2. `textInsertionHelpers.js` → Passa `textToInsert = nodeToInsert.data.phrase` (frase)
3. `BlockNoteEditor.jsx` → Usa `newText.substring(0, 50)` como título ❌

### **Código Problemático:**
```javascript
// BlockNoteEditor.jsx - INCORRETO
const titleFromText = newText.substring(0, 50).trim();
onReferenceUpdate(marker, titleFromText);
```

## ✅ **Correção Aplicada**

### **1. textInsertionHelpers.js**
```javascript
// ANTES: Callback genérico
onReferenceUpdate,

// DEPOIS: Callback com título correto
(marker, _) => onReferenceUpdate?.(marker, nodeToInsert.data.title)
```

### **2. BlockNoteEditor.jsx**
```javascript
// ANTES: Extrair título do texto
const titleFromText = newText.substring(0, 50).trim();
onReferenceUpdate(marker, titleFromText);

// DEPOIS: Título já vem do callback
onReferenceUpdate(marker, ''); // Título será passado pelo textInsertionHelpers
```

## 📊 **Fluxo Corrigido**

### ✅ **Novo Fluxo:**
1. **Canvas** → Dispara conexão com `nodeToInsert.data.title`
2. **textInsertionHelpers** → Extrai título correto: `nodeToInsert.data.title`
3. **textInsertionHelpers** → Passa título via callback customizado
4. **BlockNoteEditor** → Recebe título correto no `onReferenceUpdate`
5. **referenceMapping** → Armazena mapeamento correto: `[marker] ↔ título`

### ✅ **Resultado Esperado:**
```javascript
// ANTES (incorreto)
referenceMapping.set('[18]', 'O engajamento nas redes sociais foi limitado pela');

// DEPOIS (correto)
referenceMapping.set('[18]', 'Engajamento nas Redes Sociais');
```

## 🧪 **Como Testar**

1. **Inserir elemento** via canvas
2. **Verificar logs**: `🗺️ ReferenceMapping atualizado`
3. **Verificar mapeamento**: Deve mostrar título correto
4. **Fazer hover**: Highlight deve funcionar
5. **Verificar console**: Título deve corresponder ao do canvas

## 🎯 **Impacto da Correção**

- ✅ **Highlight funciona** para novos elementos
- ✅ **Títulos corretos** no referenceMapping
- ✅ **Busca exata** funciona sem precisar de busca flexível
- ✅ **Consistência** entre canvas e editor
- ✅ **Debug mais claro** com títulos legíveis

## 📝 **Arquivos Modificados**

- `textInsertionHelpers.js`: Callback customizado com título correto
- `BlockNoteEditor.jsx`: Removida extração incorreta de título