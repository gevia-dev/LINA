// Teste da funcionalidade de hover e grifo
// Este arquivo demonstra como funciona o sistema de eventos

console.log('🧪 Testando funcionalidade de hover e grifo...');

// Simular evento de hover em um ItemNode
function simulateItemHover(title, phrase) {
  console.log(`🔍 Simulando hover ENTER em: "${title}"`);
  
  const event = new CustomEvent('canvas-item-hover', {
    detail: {
      itemId: 'test-123',
      title: title,
      phrase: phrase,
      action: 'enter'
    }
  });
  
  window.dispatchEvent(event);
}

// Simular evento de saída do hover
function simulateItemLeave() {
  console.log('🔍 Simulando hover LEAVE');
  
  const event = new CustomEvent('canvas-item-hover', {
    detail: {
      itemId: 'test-123',
      title: 'Teste',
      phrase: 'Frase de teste',
      action: 'leave'
    }
  });
  
  window.dispatchEvent(event);
}

// Exemplo de uso
console.log('📝 Para testar:');
console.log('1. simulateItemHover("Título da frase", "Conteúdo da frase")');
console.log('2. simulateItemLeave()');

// Exportar funções para uso no console
window.simulateItemHover = simulateItemHover;
window.simulateItemLeave = simulateItemLeave;

console.log('✅ Funções de teste carregadas!');
