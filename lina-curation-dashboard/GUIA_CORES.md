# Guia de Variáveis CSS - Projeto LINA

## 🎨 Sistema de Cores Organizado

As cores do projeto agora estão organizadas em variáveis CSS para facilitar a manutenção e mudanças de tema.

### ✅ Como usar

**Antes (cores hard-coded):**
```jsx
<div style={{ backgroundColor: '#121212', color: '#E0E0E0' }}>
  Conteúdo
</div>
```

**Depois (usando variáveis):**
```jsx
<div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
  Conteúdo
</div>
```

## 📋 Referência Rápida de Variáveis

### Backgrounds
- `var(--bg-primary)` → `#121212` (fundo principal)
- `var(--bg-secondary)` → `#1E1E1E` (cards, painéis)
- `var(--bg-tertiary)` → `#2A2A2A` (elementos destacados)

### Texto
- `var(--text-primary)` → `#E0E0E0` (texto principal)
- `var(--text-secondary)` → `#A0A0A0` (texto secundário)
- `var(--text-white)` → `#FFFFFF` (branco puro)

### Verde Principal
- `var(--primary-green)` → `#2BB24C`
- `var(--primary-green-hover)` → `#25A043`
- `var(--primary-green-transparent)` → `#2BB24C50`
- `var(--primary-green-light)` → `#2BB24C10`

### Bordas
- `var(--border-primary)` → `#333333`
- `var(--border-secondary)` → `#666666`

### Status
- `var(--status-error)` → `#EF4444`
- `var(--status-success)` → `#10B981`
- `var(--status-warning)` → `#F59E0B`

## 🔧 Exemplos Práticos

### 1. Substituir cores em componentes:

```jsx
// ANTES
style={{ 
  backgroundColor: '#1E1E1E',
  border: '1px solid #333333',
  color: '#E0E0E0'
}}

// DEPOIS
style={{ 
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-primary)',
  color: 'var(--text-primary)'
}}
```

### 2. Usar em CSS classes:

```css
.meu-componente {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.botao-primary {
  background-color: var(--primary-green);
  color: var(--text-white);
}

.botao-primary:hover {
  background-color: var(--primary-green-hover);
}
```

## 🎯 Próximos Passos

Para aplicar em outros componentes, procure por:

1. **Backgrounds**: `#121212`, `#1E1E1E`, `#2A2A2A`
2. **Texto**: `#E0E0E0`, `#A0A0A0`, `#FFFFFF`
3. **Verde**: `#2BB24C`, `#25A043`
4. **Bordas**: `#333333`, `#666666`
5. **Status**: `#EF4444`, `#10B981`, `#F59E0B`

## 💡 Benefícios

- ✅ **Consistência**: Todas as cores padronizadas
- ✅ **Manutenção**: Mudança em um local afeta todo o projeto
- ✅ **Temas**: Facilita criação de temas alternativos
- ✅ **Legibilidade**: Nomes descritivos em vez de códigos hex

---
**Arquivo criado para organizar as cores do projeto LINA - CurationPage já refatorado! 🎨**