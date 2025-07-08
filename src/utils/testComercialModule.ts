import { supabase } from '@/integrations/supabase/client';

/**
 * Utilitário para testar e configurar o módulo comercial
 */
export class TestComercialModule {
  
  /**
   * Verifica se as tabelas do módulo comercial existem
   */
  static async verificarTabelas(): Promise<{
    modelos_contratos: boolean;
    contratos_comerciais: boolean;
    assinaturas_contratos_comerciais: boolean;
    logs_auditoria_contratos_comerciais: boolean;
    tokens_verificacao_contratos: boolean;
  }> {
    const tabelas = {
      modelos_contratos: false,
      contratos_comerciais: false,
      assinaturas_contratos_comerciais: false,
      logs_auditoria_contratos_comerciais: false,
      tokens_verificacao_contratos: false
    };

    try {
      // Testar cada tabela
      const { error: errorModelos } = await supabase
        .from('modelos_contratos')
        .select('id')
        .limit(1);
      tabelas.modelos_contratos = !errorModelos;

      const { error: errorContratos } = await supabase
        .from('contratos_comerciais')
        .select('id')
        .limit(1);
      tabelas.contratos_comerciais = !errorContratos;

      const { error: errorAssinaturas } = await supabase
        .from('assinaturas_contratos_comerciais')
        .select('id')
        .limit(1);
      tabelas.assinaturas_contratos_comerciais = !errorAssinaturas;

      const { error: errorLogs } = await supabase
        .from('logs_auditoria_contratos_comerciais')
        .select('id')
        .limit(1);
      tabelas.logs_auditoria_contratos_comerciais = !errorLogs;

      const { error: errorTokens } = await supabase
        .from('tokens_verificacao_contratos')
        .select('id')
        .limit(1);
      tabelas.tokens_verificacao_contratos = !errorTokens;

    } catch (error) {
      console.error('Erro ao verificar tabelas:', error);
    }

    return tabelas;
  }

  /**
   * Cria dados de exemplo para teste
   */
  static async criarDadosExemplo(): Promise<void> {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      // 1. Criar modelo de exemplo
      const { data: modelo, error: errorModelo } = await supabase
        .from('modelos_contratos')
        .insert([{
          nome: 'Contrato de Representação Comercial',
          descricao: 'Modelo padrão para contratos de representação comercial',
          conteudo: `CONTRATO DE REPRESENTAÇÃO COMERCIAL

Na qualidade de "REPRESENTANTE", e doravante assim denominada, [NOME_REPRESENTANTE], 
inscrita no CNPJ nº [CNPJ_REPRESENTANTE], com sede na [ENDERECO_REPRESENTANTE], 
e-mail: [EMAIL_REPRESENTANTE], neste ato representado por seu titular/proprietário, 
[NOME_TITULAR_REPRESENTANTE], representante comercial, inscrito no CPF/MF sob o nº [CPF_TITULAR_REPRESENTANTE].

E na qualidade de "REPRESENTADA", e doravante assim denominada, [NOME_EMPRESA], 
inscrita no CNPJ nº [CNPJ_EMPRESA], com sede na [ENDERECO_EMPRESA].

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a representação comercial dos produtos da REPRESENTADA.

CLÁUSULA 2ª - DA COMISSÃO
A comissão será de [PERCENTUAL_COMISSAO]% sobre o valor líquido das vendas.

CLÁUSULA 3ª - DO PRAZO
Este contrato terá vigência de [PRAZO_VIGENCIA] meses, iniciando em [DATA_INICIO].

Local e data: [LOCAL_DATA]

_________________________                    _________________________
REPRESENTANTE                                REPRESENTADA`,
          ativo: true,
          criado_por: userId
        }])
        .select()
        .single();

      if (errorModelo) throw errorModelo;

      console.log('Modelo criado:', modelo);

      // 2. Criar contrato de exemplo
      const { data: contrato, error: errorContrato } = await supabase
        .from('contratos_comerciais')
        .insert([{
          modelo_id: modelo.id,
          titulo: 'Contrato - João Silva Representações',
          conteudo: `CONTRATO DE REPRESENTAÇÃO COMERCIAL

Na qualidade de "REPRESENTANTE", e doravante assim denominada, João Silva Representações Ltda, 
inscrita no CNPJ nº 12.345.678/0001-90, com sede na Rua das Flores, 123, São Paulo/SP, 
e-mail: joao@representacoes.com, neste ato representado por seu titular/proprietário, 
João Silva, representante comercial, inscrito no CPF/MF sob o nº 123.456.789-00.

E na qualidade de "REPRESENTADA", e doravante assim denominada, Empresa Exemplo Ltda, 
inscrita no CNPJ nº 98.765.432/0001-10, com sede na Av. Principal, 456, Rio de Janeiro/RJ.

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a representação comercial dos produtos da REPRESENTADA.

CLÁUSULA 2ª - DA COMISSÃO
A comissão será de 5% sobre o valor líquido das vendas.

CLÁUSULA 3ª - DO PRAZO
Este contrato terá vigência de 12 meses, iniciando em 01/12/2024.

Local e data: São Paulo, 07 de dezembro de 2024

_________________________                    _________________________
REPRESENTANTE                                REPRESENTADA`,
          dados_variaveis: {
            NOME_REPRESENTANTE: 'João Silva Representações Ltda',
            CNPJ_REPRESENTANTE: '12.345.678/0001-90',
            ENDERECO_REPRESENTANTE: 'Rua das Flores, 123, São Paulo/SP',
            EMAIL_REPRESENTANTE: 'joao@representacoes.com',
            NOME_TITULAR_REPRESENTANTE: 'João Silva',
            CPF_TITULAR_REPRESENTANTE: '123.456.789-00',
            NOME_EMPRESA: 'Empresa Exemplo Ltda',
            CNPJ_EMPRESA: '98.765.432/0001-10',
            ENDERECO_EMPRESA: 'Av. Principal, 456, Rio de Janeiro/RJ',
            PERCENTUAL_COMISSAO: '5',
            PRAZO_VIGENCIA: '12',
            DATA_INICIO: '01/12/2024',
            LOCAL_DATA: 'São Paulo, 07 de dezembro de 2024'
          },
          assinante_externo_nome: 'João Silva',
          assinante_externo_email: 'joao@representacoes.com',
          assinante_externo_documento: '123.456.789-00',
          assinante_interno_id: userId,
          status: 'editando',
          criado_por: userId
        }])
        .select()
        .single();

      if (errorContrato) throw errorContrato;

      console.log('Contrato criado:', contrato);

      // 3. Criar log de auditoria
      await supabase
        .from('logs_auditoria_contratos_comerciais')
        .insert([{
          contrato_id: contrato.id,
          evento: 'contrato_criado',
          descricao: 'Contrato de exemplo criado para teste do sistema',
          dados_evento: {
            titulo: contrato.titulo,
            modelo: modelo.nome,
            tipo: 'exemplo'
          },
          usuario_id: userId
        }]);

      console.log('Dados de exemplo criados com sucesso!');

    } catch (error) {
      console.error('Erro ao criar dados de exemplo:', error);
      throw error;
    }
  }

  /**
   * Limpa todos os dados de teste
   */
  static async limparDadosExemplo(): Promise<void> {
    try {
      // Deletar em ordem devido às foreign keys
      await supabase.from('tokens_verificacao_contratos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('logs_auditoria_contratos_comerciais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('assinaturas_contratos_comerciais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('contratos_comerciais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('modelos_contratos').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      console.log('Dados de exemplo removidos com sucesso!');
    } catch (error) {
      console.error('Erro ao limpar dados de exemplo:', error);
      throw error;
    }
  }

  /**
   * Executa diagnóstico completo do módulo
   */
  static async diagnosticar(): Promise<{
    tabelas: any;
    contadores: any;
    erros: string[];
  }> {
    const erros: string[] = [];
    
    try {
      // Verificar tabelas
      const tabelas = await this.verificarTabelas();
      
      // Contar registros
      const contadores = {
        modelos: 0,
        contratos: 0,
        assinaturas: 0,
        logs: 0,
        tokens: 0
      };

      if (tabelas.modelos_contratos) {
        const { count } = await supabase
          .from('modelos_contratos')
          .select('*', { count: 'exact', head: true });
        contadores.modelos = count || 0;
      }

      if (tabelas.contratos_comerciais) {
        const { count } = await supabase
          .from('contratos_comerciais')
          .select('*', { count: 'exact', head: true });
        contadores.contratos = count || 0;
      }

      if (tabelas.assinaturas_contratos_comerciais) {
        const { count } = await supabase
          .from('assinaturas_contratos_comerciais')
          .select('*', { count: 'exact', head: true });
        contadores.assinaturas = count || 0;
      }

      if (tabelas.logs_auditoria_contratos_comerciais) {
        const { count } = await supabase
          .from('logs_auditoria_contratos_comerciais')
          .select('*', { count: 'exact', head: true });
        contadores.logs = count || 0;
      }

      if (tabelas.tokens_verificacao_contratos) {
        const { count } = await supabase
          .from('tokens_verificacao_contratos')
          .select('*', { count: 'exact', head: true });
        contadores.tokens = count || 0;
      }

      // Verificar se todas as tabelas existem
      const todasTabelasExistem = Object.values(tabelas).every(existe => existe);
      if (!todasTabelasExistem) {
        erros.push('Nem todas as tabelas do módulo comercial foram criadas');
      }

      return { tabelas, contadores, erros };

    } catch (error) {
      erros.push(`Erro durante diagnóstico: ${error}`);
      return { 
        tabelas: {}, 
        contadores: {}, 
        erros 
      };
    }
  }
}

// Função para uso no console do navegador
(window as any).testComercial = TestComercialModule;
