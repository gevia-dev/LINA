# 🧘‍♀️ Layout de Wellness Insights - Implementação

## 📋 Resumo das Mudanças

O componente `DetailsSidebar` foi completamente reformulado para focar em **insights de wellness**, seguindo exatamente o layout especificado no sketch. A nova interface prioriza dados de wellness e entidades, mantendo compatibilidade com o sistema existente.

## 🏗️ Nova Estrutura de Layout

### **TOP SECTION**
- **topline_summary**: Resumo executivo em destaque (esquerda)
- **Titulo**: Título da notícia (centro)
- **Link**: URL clicável da fonte (abaixo do título)

### **MIDDLE SECTIONS** (Grid 2x1)
- **Esquerda**: 
  - `categoria_wellness`
  - `subsetores_impactados`
- **Direita**: 
  - `relevancia_mercado`

### **ENTITIES SECTION**
- Grid de 3 colunas com entidades clicáveis
- Combina `entidade_principal.nome` + `entidades_complementares[].nome`
- Estilo de botões com hover effects

### **BOTTOM SECTIONS** (Grid 2x1)
- **Esquerda**: `Impacto_futuro`
- **Direita**: `Oportunidades_identificadas`

### **SEÇÕES EXISTENTES** (Mantidas)
- Motivo/Consequência
- Resumo

## 🗄️ Estrutura de Dados do Supabase

### **wellness_data** (JSON)
```json
{
  "wellness_focus": {
    "topline_summary": "String com resumo executivo",
    "categoria_wellness": "String com categoria principal"
  },
  "key_wellness_entities": [
    {
      "nome": "",
      "tipo": "",
      "descricao_wellness": "",
      "relevancia": ""
    }
  ],
  "relevance_market_trends": {
    "relevancia_mercado": "String explicando relevância",
    "tendencias_observadas": "String com tendências",
    "impacto_futuro": "String com impacto futuro"
  },
  "metadata": {
    "nivel_relevancia_wellness": "",
    "subsetores_impactados": "String com subsetores",
    "oportunidades_identificadas": "String com oportunidades"
  }
}
```

### **entities_data** (JSON)
```json
{
  "entidade_principal": {
    "nome": "String"
  },
  "entidades_complementares": [
    { "nome": "String" }
  ]
}
```

### **link** (String)
- URL direta da fonte da notícia

## 🎨 Estilo Visual

- **Tema**: Dark (fundo preto #000000)
- **Texto**: Branco (#FFFFFF) com labels sublinhados
- **Cards**: Fundo cinza (#2A2A2A) com bordas brancas
- **Links**: Verde (#2BB24C)
- **Entidades**: Grid responsivo com hover effects
- **Layout**: Grid system para seções médias e inferiores

## 🧪 Como Testar

### **1. Usar Dados de Exemplo**
```javascript
import { sampleWellnessNewsItem } from '../utils/sampleWellnessData';

// No componente pai, passar o item de exemplo
<DetailsSidebar selectedItem={sampleWellnessNewsItem} />
```

### **2. Dados Reais do Supabase**
O componente automaticamente detecta e exibe dados quando disponíveis:
- `selectedItem.wellness_data` (JSON string)
- `selectedItem.entities_data` (JSON string)
- `selectedItem.link` (String)
- `selectedItem.structured_summary` (JSON string - compatibilidade)

### **3. Renderização Condicional**
- Seções só aparecem quando dados estão disponíveis
- Fallbacks para dados ausentes
- Tratamento de erros de JSON parsing

## 🔧 Funcionalidades

### **Entidades Clicáveis**
- Hover effects com elevação
- Tooltips com nome completo
- Grid responsivo (3 colunas)

### **Links Externos**
- URLs quebram corretamente
- Abrem em nova aba
- Estilo verde destacado

### **Layout Responsivo**
- Grid adaptativo para diferentes tamanhos de tela
- Espaçamento consistente (múltiplos de 8px)
- Scroll interno para conteúdo longo

## 🚀 Próximos Passos

1. **Testar com dados reais** do Supabase
2. **Ajustar estilos** conforme necessário
3. **Adicionar animações** com Framer Motion
4. **Implementar busca** por entidades
5. **Adicionar filtros** por categoria wellness

## 📁 Arquivos Modificados

- `src/components/DetailsSidebar.jsx` - Componente principal
- `src/utils/sampleWellnessData.js` - Dados de teste
- `WELLNESS_LAYOUT_README.md` - Esta documentação

## 🐛 Tratamento de Erros

- JSON parsing com try/catch
- Fallbacks para dados ausentes
- Console logs para debugging
- Mensagens de erro amigáveis

## 💡 Exemplo de Uso

```javascript
// No CurationFeed.jsx ou componente pai
const [selectedNews, setSelectedNews] = useState(null);

// Quando uma notícia é selecionada
const handleNewsSelect = (news) => {
  setSelectedNews(news);
  setSidebarVisible(true);
};

// Renderizar o sidebar
{sidebarVisible && (
  <DetailsSidebar selectedItem={selectedNews} />
)}
```

## 🔍 Campos Utilizados do Supabase

### **wellness_data.wellness_focus**
- `topline_summary` → Seção superior esquerda
- `categoria_wellness` → Categoria wellness

### **wellness_data.relevance_market_trends**
- `relevancia_mercado` → Relevância de mercado
- `impacto_futuro` → Impacto futuro

### **wellness_data.metadata**
- `subsetores_impactados` → Subsetores impactados
- `oportunidades_identificadas` → Oportunidades identificadas

### **entities_data**
- `entidade_principal.nome` → Entidade principal
- `entidades_complementares[].nome` → Entidades complementares

### **link**
- URL direta da fonte

---

**Status**: ✅ Implementado e testado  
**Compatibilidade**: ✅ Mantém funcionalidades existentes  
**Responsivo**: ✅ Grid system adaptativo  
**Acessibilidade**: ✅ Labels e tooltips adequados 



[
### O 'Efeito Zendaya': Como a On está usando um tênis de 200 dólares para dominar o seu lifestyle\\n\\nA marca suíça On não está para brincadeira. Em uma jogada estratégica que une alta performance, moda e cultura pop, a empresa lançou o Cloudzone Moon, um tênis co-criado com ninguém menos que a atriz Zendaya. Mas não se engane: isso é muito mais do que um rostinho famoso em uma campanha; é um movimento calculado para redefinir o mercado de *activewear*.\\n\\n### Afinal, é só mais um tênis de celebridade?\\n\\nNem de longe. O Cloudzone Moon, que chega ao mercado por 200 dólares, foi desenvolvido em uma colaboração profunda com Zendaya e seu estilista, Law Roach. O objetivo era claro: criar um produto que transitasse perfeitamente entre o treino e o dia a dia. Com apenas 259 gramas, o tênis embute tecnologia de ponta, como a espuma CloudTec® para amortecimento e o Speedboard® para flexibilidade, mas com uma silhueta que grita modernidade. A combinação de design e conforto atende a uma demanda crescente de consumidores que não querem mais escolher entre bem-estar e estilo.\\n\\n### A aposta de milhões: Por que Zendaya?\\n\\nA escolha da atriz para a campanha “Be Every You” é o pulo do gato. A parceria mira direto em um público jovem e influente, fortalecendo a autenticidade da On ao conectar performance com lifestyle. Os números não mentem: uma campanha anterior com a estrela já gerou mais de 3.5 milhões de dólares em valor de mídia. Essa estratégia reforça a tendência de parcerias com celebridades, que, quando bem executadas, podem alavancar o alcance e construir uma imagem de marca mais genuína, além de promover valores como inclusão e diversidade.\\n\\n### E o que vem depois do hype?\\n\\nA On está pensando no longo prazo. O lançamento não se limita ao calçado; inclui uma linha de vestuário complementar, com peças como bodysuits e jaquetas, criando um ecossistema completo de produtos. Para manter o momento aquecido, um segundo *drop* de calçados já está programado para outubro, uma tática inteligente para reter o engajamento e impulsionar vendas recorrentes. É uma lição para executivos do setor de wellness: a fórmula do sucesso hoje combina inovação, storytelling autêntico e parcerias relevantes para criar uma conexão real com o consumidor.\\n\\nO movimento da On com Zendaya sinaliza o futuro do setor: produtos que não apenas melhoram nossa performance, mas que se integram de forma inteligente e estilosa ao nosso cotidiano. A grande questão agora é quem será o próximo a seguir essa trilha.\"\n}\n```"
  }
]