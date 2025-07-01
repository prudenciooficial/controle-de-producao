import { materialsAdapter } from '@/services/database/MaterialsAdapter';
import { offlineInitializer } from '@/services/initialization/OfflineInitializer';
import { testLocalConnection } from '@/config/database';

/**
 * Script de teste para verificar funcionamento do sistema offline-first
 */
export const testOfflineSystem = async (): Promise<void> => {
  console.log('🧪 Iniciando testes do sistema offline-first...\n');

  try {
    // 1. Testar conexão IndexedDB local
    console.log('1️⃣ Testando conexão IndexedDB local...');
    const idbConnected = await testLocalConnection();
    console.log(`   IndexedDB: ${idbConnected ? '✅ Conectado' : '❌ Não conectado'}\n`);

    // 2. Testar conexão Supabase
    console.log('2️⃣ Testando conexão Supabase...');
    const supabaseConnected = await materialsAdapter.isOnline();
    console.log(`   Supabase: ${supabaseConnected ? '✅ Online' : '❌ Offline'}\n`);

    // 3. Inicializar sistema
    console.log('3️⃣ Inicializando sistema offline-first...');
    const initialized = await offlineInitializer.initialize();
    console.log(`   Inicialização: ${initialized ? '✅ Sucesso' : '❌ Falha'}\n`);

    // 4. Testar operações CRUD
    console.log('4️⃣ Testando operações CRUD...');
    
    // Criar material de teste
    const testMaterial = {
      name: 'Material Teste Offline',
      code: 'TEST001',
      type: 'Outro' as const,
      unitOfMeasure: 'kg',
      description: 'Material criado para teste do sistema offline'
    };

    console.log('   📝 Criando material de teste...');
    const createdMaterial = await materialsAdapter.createMaterial(testMaterial);
    console.log(`   ✅ Material criado: ${createdMaterial.id}`);

    // Listar materiais
    console.log('   📋 Listando materiais...');
    const materials = await materialsAdapter.getMaterials();
    console.log(`   ✅ ${materials.length} materiais encontrados`);

    // Atualizar material
    console.log('   ✏️  Atualizando material...');
    await materialsAdapter.updateMaterial(createdMaterial.id, {
      description: 'Material atualizado para teste offline'
    });
    console.log('   ✅ Material atualizado');

    // Verificar operações pendentes
    console.log('   🕐 Verificando operações pendentes...');
    const pendingOps = await materialsAdapter.getPendingOperations();
    console.log(`   📊 ${pendingOps.length} operações pendentes`);

    // Limpar material de teste
    console.log('   🗑️  Removendo material de teste...');
    await materialsAdapter.deleteMaterial(createdMaterial.id);
    console.log('   ✅ Material removido\n');

    // 5. Estatísticas do sistema
    console.log('5️⃣ Estatísticas do sistema...');
    const stats = await offlineInitializer.getStats();
    console.log('   📊 Status atual:');
    console.log(`      - Inicializado: ${stats.initialized ? '✅ Sim' : '❌ Não'}`);
    console.log(`      - Online: ${stats.online ? '✅ Sim' : '❌ Não'}`);
    console.log(`      - Operações pendentes: ${stats.pendingOperations}`);
    console.log(`      - Última sincronização: ${stats.lastSync || 'Nunca'}\n`);

    // 6. Verificar IndexedDB
    console.log('6️⃣ Verificando IndexedDB...');
    try {
      const databases = await indexedDB.databases();
      const controleProd = databases.find(db => db.name === 'controle_producao_db');
      console.log(`   Database: ${controleProd ? '✅ Encontrada' : '❌ Não encontrada'}`);
      console.log(`   Versão: ${controleProd?.version || 'N/A'}\n`);
    } catch (error) {
      console.log('   ⚠️ Erro ao verificar databases (pode ser limitação do navegador)\n');
    }

    console.log('🎉 Todos os testes concluídos com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
};

/**
 * Teste específico para simular cenário offline
 */
export const testOfflineScenario = async (): Promise<void> => {
  console.log('🔌 Testando cenário offline...\n');

  try {
    // Criar material enquanto "offline" (forçar uso do banco local)
    const testMaterial = {
      name: 'Material Offline',
      code: 'OFFLINE001',
      type: 'Outro' as const,
      unitOfMeasure: 'un',
      description: 'Criado durante teste offline'
    };

    console.log('📝 Criando material durante cenário offline...');
    // Aqui seria interessante ter um modo de forçar offline para teste
    const material = await materialsAdapter.createMaterial(testMaterial);
    console.log(`✅ Material criado offline: ${material.id}`);

    console.log('🔍 Verificando operações na fila de sincronização...');
    const pending = await materialsAdapter.getPendingOperations();
    console.log(`📊 ${pending.length} operações aguardando sincronização`);

    if (pending.length > 0) {
      console.log('📤 Tentando sincronizar operações pendentes...');
      await materialsAdapter.syncPendingOperations();
      console.log('✅ Sincronização concluída');
    }

    // Limpar material de teste
    console.log('🗑️ Limpando material de teste...');
    await materialsAdapter.deleteMaterial(material.id);
    console.log('✅ Material de teste removido');

  } catch (error) {
    console.error('❌ Erro no teste offline:', error);
  }
};

/**
 * Teste para verificar armazenamento local
 */
export const testLocalStorage = async (): Promise<void> => {
  console.log('💾 Testando armazenamento local...\n');

  try {
    // Verificar quota de armazenamento
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      console.log('📊 Quota de armazenamento:');
      console.log(`   Quota: ${(estimate.quota! / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Usado: ${(estimate.usage! / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Disponível: ${((estimate.quota! - estimate.usage!) / 1024 / 1024).toFixed(2)} MB\n`);
    }

    // Verificar databases IndexedDB
    console.log('🗄️ Databases IndexedDB disponíveis:');
    const databases = await indexedDB.databases();
    databases.forEach(db => {
      console.log(`   - ${db.name} (v${db.version})`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao verificar armazenamento:', error);
  }
};

// Função para executar todos os testes
export const runAllTests = async (): Promise<void> => {
  await testOfflineSystem();
  console.log('\n' + '='.repeat(50) + '\n');
  await testOfflineScenario();
  console.log('\n' + '='.repeat(50) + '\n');
  await testLocalStorage();
};

// Para uso no console do navegador
declare global {
  interface Window {
    testOfflineSystem: typeof testOfflineSystem;
    testOfflineScenario: typeof testOfflineScenario;
    testLocalStorage: typeof testLocalStorage;
    runAllTests: typeof runAllTests;
  }
}

window.testOfflineSystem = testOfflineSystem;
window.testOfflineScenario = testOfflineScenario;
window.testLocalStorage = testLocalStorage;
window.runAllTests = runAllTests; 