# Debug: Elementos Subsequentes Não Funcionam

## 🔍 **Problema Relatado**

- ✅ **Primeiro elemento**: Funciona (adiciona tag + grifo funciona)
- ❌ **Elementos subsequentes**: Não funcionam (nem adiciona tag nem grifo funciona)

## 🛠️ **Logs Adicionados para Debug**

### 1. **updateReferenceMapping**
```javascript
console.log(`🗺️ [${timestamp}] Atualizando referenceMapping: ${marker} <-> "${title}"`);
console.log(`📋 Marcadores atuais:`, Array.from(newMapping.keys()).filter(k => k.startsWith('[')));
```

### 2. **onChange do Editor**
```javascript
console.log(`📝 [${timestamp}] Editor changed:`, newMarkdown?.length || 0, 'chars');
console.log('📄 Novo conteúdo (preview):', newMarkdown?.substring(0, 200) + '...');
```

### 3. **Sincronização de Sessão**
```javascript
console.log(`🔄 [${timestamp}] Sync para highlight funcionar`);
console.log('📊 Diferenças:', { lastMarkdownLength, sessionContentLength, areEqual });
```

### 4. **insertTextAtPosition**
```javascript
console.log(`🚀 [${timestamp}] === NOVA INSERÇÃO INICIADA ===`);
console.log(`📊 [${timestamp}] Estado final do editor:`, { contentLength, blockCount, hasNewMarker });
```

## 🧪 **Como Usar o Debug**

### **Teste com 2 elementos:**

1. **Inserir primeiro elemento** via canvas
   - Verificar logs: `🚀 === NOVA INSERÇÃO INICIADA ===`
   - Verificar: `🗺️ Atualizando referenceMapping`
   - Verificar: `📝 Editor changed`
   - Verificar: `🔄 Sync para highlight funcionar`

2. **Inserir segundo elemento** via canvas
   - **Se não aparecer** `🚀 === NOVA INSERÇÃO INICIADA ===` → Problema no canvas/textInsertionHelpers
   - **Se aparecer mas não** `🗺️ Atualizando referenceMapping` → Problema no callback
   - **Se aparecer mas não** `📝 Editor changed` → Problema no editor não disparar onChange
   - **Se aparecer mas não** `🔄 Sync` → Problema na sincronização

## 🔍 **Possíveis Cenários**

### **Cenário A: Canvas não dispara segunda inserção**
```
❌ Não aparece: 🚀 === NOVA INSERÇÃO INICIADA ===
→ Problema: useSimplifiedTextSync ou CanvasLibraryView
```

### **Cenário B: Inserção inicia mas falha**
```
✅ Aparece: 🚀 === NOVA INSERÇÃO INICIADA ===
❌ Não aparece: 📊 Estado final do editor
→ Problema: insertTextAtPosition falha internamente
```

### **Cenário C: Inserção funciona mas não atualiza mapping**
```
✅ Aparece: 🚀 === NOVA INSERÇÃO INICIADA ===
✅ Aparece: 📊 Estado final do editor
❌ Não aparece: 🗺️ Atualizando referenceMapping
→ Problema: onReferenceUpdate não é chamado
```

### **Cenário D: Mapping atualiza mas editor não sincroniza**
```
✅ Aparece: 🗺️ Atualizando referenceMapping
❌ Não aparece: 📝 Editor changed
→ Problema: onChange não é disparado
```

## 📊 **Próximos Passos**

1. **Executar teste** com 2 elementos
2. **Analisar logs** no console
3. **Identificar cenário** baseado nos logs
4. **Aplicar correção** específica para o cenário identificado

## 🎯 **Correções Prováveis**

- **Cenário A**: Verificar se canvas permite múltiplas conexões
- **Cenário B**: Verificar se editor está em estado válido para segunda inserção
- **Cenário C**: Verificar se callback está sendo passado corretamente
- **Cenário D**: Verificar se editor congelado está impedindo onChange