/**
 * Script para atualizar variáveis em modelos existentes
 * Execute este script para detectar e salvar variáveis em modelos que não as possuem
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Extrai variáveis do conteúdo do modelo
 */
function extrairVariaveis(conteudo: string): string[] {
  const regex = /\[([A-Z_]+)\]/g;
  const variaveis: string[] = [];
  let match;
  
  while ((match = regex.exec(conteudo)) !== null) {
    if (!variaveis.includes(match[1])) {
      variaveis.push(match[1]);
    }
  }
  
  return variaveis;
}

/**
 * Processa variáveis detectadas em formato estruturado
 */
function processarVariaveis(variaveisDetectadas: string[]) {
  return variaveisDetectadas.map(nome => ({
    nome,
    rotulo: nome.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()),
    tipo: 'text' as const,
    obrigatorio: true,
    placeholder: `Digite ${nome.replace(/_/g, ' ').toLowerCase()}`
  }));
}

/**
 * Atualiza um modelo específico com suas variáveis detectadas
 */
export async function atualizarVariaveisModelo(modeloId: string, conteudo: string) {
  try {
    const variaveisDetectadas = extrairVariaveis(conteudo);
    const variaveisProcessadas = processarVariaveis(variaveisDetectadas);

    const { error } = await supabase
      .from('modelos_contratos')
      .update({ variaveis: variaveisProcessadas })
      .eq('id', modeloId);

    if (error) throw error;

    return {
      sucesso: true,
      variaveisDetectadas: variaveisDetectadas.length,
      variaveis: variaveisDetectadas
    };

  } catch (error) {
    console.error('Erro ao atualizar variáveis do modelo:', error);
    return {
      sucesso: false,
      erro: error
    };
  }
}

/**
 * Atualiza todos os modelos que não possuem variáveis detectadas
 */
export async function atualizarTodosModelosSemVariaveis() {
  try {
    console.log('🔍 Buscando modelos sem variáveis...');

    // Buscar todos os modelos
    const { data: modelos, error: errorBusca } = await supabase
      .from('modelos_contratos')
      .select('id, nome, conteudo, variaveis')
      .eq('ativo', true);

    if (errorBusca) throw errorBusca;

    if (!modelos || modelos.length === 0) {
      console.log('❌ Nenhum modelo encontrado');
      return { processados: 0, atualizados: 0, erros: 0 };
    }

    console.log(`📋 Encontrados ${modelos.length} modelos`);

    // Filtrar modelos que não têm variáveis ou têm array vazio
    const modelosSemVariaveis = modelos.filter(modelo => 
      !modelo.variaveis || 
      !Array.isArray(modelo.variaveis) || 
      modelo.variaveis.length === 0
    );

    console.log(`🔧 ${modelosSemVariaveis.length} modelos precisam de atualização`);

    let atualizados = 0;
    let erros = 0;

    // Processar cada modelo
    for (const modelo of modelosSemVariaveis) {
      console.log(`\n📝 Processando: ${modelo.nome}`);
      
      const variaveisDetectadas = extrairVariaveis(modelo.conteudo);
      
      if (variaveisDetectadas.length === 0) {
        console.log(`   ⚠️  Nenhuma variável encontrada`);
        continue;
      }

      console.log(`   🔍 Variáveis detectadas: ${variaveisDetectadas.join(', ')}`);

      const resultado = await atualizarVariaveisModelo(modelo.id, modelo.conteudo);
      
      if (resultado.sucesso) {
        console.log(`   ✅ Atualizado com ${resultado.variaveisDetectadas} variáveis`);
        atualizados++;
      } else {
        console.log(`   ❌ Erro na atualização:`, resultado.erro);
        erros++;
      }
    }

    const resultado = {
      processados: modelosSemVariaveis.length,
      atualizados,
      erros,
      total: modelos.length
    };

    console.log('\n📊 RESULTADO FINAL:');
    console.log(`   Total de modelos: ${resultado.total}`);
    console.log(`   Modelos processados: ${resultado.processados}`);
    console.log(`   Modelos atualizados: ${resultado.atualizados}`);
    console.log(`   Erros: ${resultado.erros}`);

    return resultado;

  } catch (error) {
    console.error('❌ Erro geral na atualização:', error);
    throw error;
  }
}

/**
 * Função para executar via console do navegador
 */
export async function executarAtualizacaoVariaveis() {
  try {
    console.log('🚀 Iniciando atualização de variáveis em modelos...');
    
    const resultado = await atualizarTodosModelosSemVariaveis();
    
    if (resultado.atualizados > 0) {
      console.log(`\n🎉 Sucesso! ${resultado.atualizados} modelos foram atualizados.`);
      console.log('💡 Recarregue a página para ver as mudanças.');
    } else {
      console.log('\n✨ Todos os modelos já estão atualizados!');
    }

    return resultado;

  } catch (error) {
    console.error('💥 Erro na execução:', error);
    throw error;
  }
}

// Disponibilizar função globalmente para uso no console
if (typeof window !== 'undefined') {
  (window as any).atualizarVariaveisModelos = executarAtualizacaoVariaveis;
}

/**
 * COMO USAR:
 * 
 * 1. No console do navegador, execute:
 *    atualizarVariaveisModelos()
 * 
 * 2. Ou importe e use em um componente:
 *    import { executarAtualizacaoVariaveis } from '@/utils/atualizarVariaveisModelos';
 *    await executarAtualizacaoVariaveis();
 * 
 * 3. Para atualizar um modelo específico:
 *    import { atualizarVariaveisModelo } from '@/utils/atualizarVariaveisModelos';
 *    await atualizarVariaveisModelo('id-do-modelo', 'conteudo-do-modelo');
 */
