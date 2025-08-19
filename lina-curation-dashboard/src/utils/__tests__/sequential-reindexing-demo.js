/**
 * Demonstração do Algoritmo de Reindexação Sequencial
 * Task 3: Desenvolver algoritmo de reindexação sequencial
 */

import MarkerReindexingService from '../markerReindexingService.js';

console.log('🚀 Demonstração do Algoritmo de Reindexação Sequencial\n');

// Cenário 1: Inserção entre marcadores
console.log('📝 Cenário 1: Inserção entre marcadores [16] e [17]');
console.log('Conteúdo original: "Texto [16] meio [17] final [18] fim"');
console.log('Inserção na posição 150 (entre [16] e [17])');
console.log('Novo marcador gerado: [19]\n');

const content1 = 'Texto [16] meio [17] final [18] fim';
const existingMarkers1 = [
  { number: 16, text: '[16]', position: 100, endPosition: 104 },
  { number: 17, text: '[17]', position: 200, endPosition: 204 },
  { number: 18, text: '[18]', position: 300, endPosition: 304 }
];

// 1. Gerar mapeamento sequencial
const reindexingMap1 = MarkerReindexingService.generateSequentialReindexingMap(
  existingMarkers1, 
  150, 
  19
);

console.log('🔄 Mapeamento de reindexação gerado:');
reindexingMap1.forEach((mapping, index) => {
  console.log(`  ${index + 1}. ${mapping.oldMarker} → ${mapping.newMarker} ${mapping.isNewMarker ? '(novo)' : '(existente)'}`);
});

// 2. Gerar conteúdo reindexado
const contentResult1 = MarkerReindexingService.generateReindexedContent(content1, reindexingMap1);

console.log(`\n📝 Resultado da reindexação:`);
console.log(`  Original: "${content1}"`);
console.log(`  Reindexado: "${contentResult1.newContent}"`);
console.log(`  Substituições: ${contentResult1.replacements}`);

// 3. Validar integridade
const validation1 = MarkerReindexingService.validateSequentialIntegrity(contentResult1.newContent, false);
console.log(`\n✅ Validação: ${validation1.isValid ? 'Aprovada' : 'Com avisos'}`);
if (validation1.warnings.length > 0) {
  console.log(`  Avisos: ${validation1.warnings.join(', ')}`);
}

console.log('\n' + '='.repeat(80) + '\n');

// Cenário 2: Inserção no início
console.log('📝 Cenário 2: Inserção antes do primeiro marcador');
console.log('Conteúdo original: "Texto [2] meio [3] final [4] fim"');
console.log('Inserção na posição 50 (antes de [2])');
console.log('Novo marcador gerado: [5]\n');

const content2 = 'Texto [2] meio [3] final [4] fim';
const existingMarkers2 = [
  { number: 2, text: '[2]', position: 100, endPosition: 103 },
  { number: 3, text: '[3]', position: 200, endPosition: 203 },
  { number: 4, text: '[4]', position: 300, endPosition: 303 }
];

const reindexingMap2 = MarkerReindexingService.generateSequentialReindexingMap(
  existingMarkers2, 
  50, 
  5
);

console.log('🔄 Mapeamento de reindexação gerado:');
if (reindexingMap2.length === 0) {
  console.log('  Nenhuma reindexação necessária');
} else {
  reindexingMap2.forEach((mapping, index) => {
    console.log(`  ${index + 1}. ${mapping.oldMarker} → ${mapping.newMarker} ${mapping.isNewMarker ? '(novo)' : '(existente)'}`);
  });
}

const contentResult2 = MarkerReindexingService.generateReindexedContent(content2, reindexingMap2);

console.log(`\n📝 Resultado da reindexação:`);
console.log(`  Original: "${content2}"`);
console.log(`  Reindexado: "${contentResult2.newContent}"`);
console.log(`  Substituições: ${contentResult2.replacements}`);

console.log('\n' + '='.repeat(80) + '\n');

// Cenário 3: Sequência perfeita
console.log('📝 Cenário 3: Inserção em sequência perfeita [1][2][3]');
console.log('Conteúdo original: "Texto [1] meio [2] final [3] fim"');
console.log('Inserção na posição 150 (entre [1] e [2])');
console.log('Novo marcador gerado: [4]\n');

const content3 = 'Texto [1] meio [4] novo [2] final [3] fim';
const insertionContext3 = {
  insertionPosition: 150,
  newMarkerNumber: 4,
  needsReindexing: true,
  existingMarkers: [
    { number: 1, text: '[1]', position: 100, endPosition: 103 },
    { number: 2, text: '[2]', position: 200, endPosition: 203 },
    { number: 3, text: '[3]', position: 300, endPosition: 303 }
  ]
};

const fullResult3 = MarkerReindexingService.reindexMarkersAfterInsertion(content3, insertionContext3);

console.log('🔄 Resultado completo da reindexação:');
console.log(`  Sucesso: ${fullResult3.success}`);
console.log(`  Marcadores processados: ${fullResult3.affectedMarkersCount}`);
console.log(`  Substituições: ${fullResult3.totalReplacements}`);
console.log(`  Original: "${content3}"`);
console.log(`  Final: "${fullResult3.newContent}"`);

const validation3 = fullResult3.validation;
console.log(`\n✅ Validação final: ${validation3.isValid ? 'Aprovada' : 'Com avisos'}`);
console.log(`  Marcadores encontrados: [${validation3.sequence.join(', ')}]`);
if (validation3.errors.length > 0) {
  console.log(`  Erros: ${validation3.errors.join(', ')}`);
}

console.log('\n🎉 Demonstração concluída!');
console.log('\n📊 Resumo das funcionalidades implementadas:');
console.log('  ✅ Lógica para reindexar apenas marcadores >= posição de inserção');
console.log('  ✅ Função para gerar novo conteúdo com marcadores reindexados');
console.log('  ✅ Validação para garantir sequência numérica correta');
console.log('  ✅ Mapeamento entre marcadores antigos e novos (ReindexingMap)');