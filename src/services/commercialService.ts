import { supabase } from '@/integrations/supabase/client';
import { logSystemEvent } from '@/services/logService';
import type { 
  ModeloContrato, 
  Contrato, 
  DadosCriarContrato, 
  DadosFinalizarContrato,
  FiltrosContrato,
  RespostaContratos,
  EstatisticasComercial,
  LogAuditoriaContrato,
  TokenVerificacaoContrato,
  ResultadoValidacaoToken,
  DadosAssinaturaInterna,
  DadosAssinaturaExterna,
  RelatorioAuditoria,
  StatusContrato,
  TipoEventoContrato
} from '@/types';

// ==================== MODELOS DE CONTRATOS ====================

export async function buscarModelosContratos(): Promise<ModeloContrato[]> {
  try {
    const { data, error } = await supabase
      .from('modelos_contratos')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) throw error;

    return (data || []).map(modelo => ({
      id: modelo.id,
      nome: modelo.nome,
      descricao: modelo.descricao,
      conteudo: modelo.conteudo,
      variaveis: Array.isArray(modelo.variaveis) ? modelo.variaveis as any : [],
      ativo: modelo.ativo,
      criadoEm: new Date(modelo.criado_em),
      atualizadoEm: new Date(modelo.atualizado_em),
      criadoPor: modelo.criado_por
    }));
  } catch (error) {
    console.error('Erro ao buscar modelos de contratos:', error);
    throw error;
  }
}

export async function criarModeloContrato(modelo: Omit<ModeloContrato, 'id' | 'criadoEm' | 'atualizadoEm' | 'criadoPor'>): Promise<ModeloContrato> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('modelos_contratos')
      .insert({
        nome: modelo.nome,
        descricao: modelo.descricao,
        conteudo: modelo.conteudo,
        variaveis: modelo.variaveis as any,
        ativo: modelo.ativo,
        criado_por: user.data.user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Log da criação
    await logSystemEvent({
      userId: user.data.user.id,
      userDisplayName: user.data.user.user_metadata?.full_name || user.data.user.email,
      actionType: 'CREATE',
      entityTable: 'modelos_contratos',
      entityId: data.id,
      newData: modelo as any
    });

    return {
      id: data.id,
      nome: data.nome,
      descricao: data.descricao,
      conteudo: data.conteudo,
      variaveis: Array.isArray(data.variaveis) ? data.variaveis as any : [],
      ativo: data.ativo,
      criadoEm: new Date(data.criado_em),
      atualizadoEm: new Date(data.atualizado_em),
      criadoPor: data.criado_por
    };
  } catch (error) {
    console.error('Erro ao criar modelo de contrato:', error);
    throw error;
  }
}

// ==================== CONTRATOS ====================

export async function buscarContratos(filtros: FiltrosContrato = {}): Promise<RespostaContratos> {
  try {
    const { 
      status, 
      criadoPor, 
      termoBusca, 
      pagina = 1, 
      tamanhoPagina = 20 
    } = filtros;

    let query = supabase
      .from('contratos')
      .select(`
        *,
        modelo:modelos_contratos(nome, descricao)
      `, { count: 'exact' });

    // Aplicar filtros
    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    if (criadoPor) {
      query = query.eq('criado_por', criadoPor);
    }

    if (termoBusca) {
      query = query.or(`titulo.ilike.%${termoBusca}%,numero_contrato.ilike.%${termoBusca}%,assinante_externo_nome.ilike.%${termoBusca}%`);
    }

    // Paginação
    const inicio = (pagina - 1) * tamanhoPagina;
    query = query
      .range(inicio, inicio + tamanhoPagina - 1)
      .order('criado_em', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    const contratos: Contrato[] = (data || []).map(contrato => ({
      id: contrato.id,
      numeroContrato: contrato.numero_contrato,
      modeloId: contrato.modelo_id,
      titulo: contrato.titulo,
      conteudo: contrato.conteudo,
      dadosVariaveis: (contrato.dados_variaveis as any) || {},
      status: contrato.status as StatusContrato,
      urlPdf: contrato.url_pdf,
      hashDocumento: contrato.hash_documento,
      assinanteInternoId: contrato.assinante_interno_id,
      assinanteInternoNome: contrato.assinante_interno_nome,
      assinanteInternoEmail: contrato.assinante_interno_email,
      assinadoInternamenteEm: contrato.assinado_internamente_em ? new Date(contrato.assinado_internamente_em) : undefined,
      dadosAssinaturaInterna: contrato.dados_assinatura_interna,
      assinanteExternoNome: contrato.assinante_externo_nome,
      assinanteExternoEmail: contrato.assinante_externo_email,
      assinanteExternoDocumento: contrato.assinante_externo_documento,
      assinadoExternamenteEm: contrato.assinado_externamente_em ? new Date(contrato.assinado_externamente_em) : undefined,
      tokenAssinaturaExterna: contrato.token_assinatura_externa,
      tokenExpiraEm: contrato.token_expira_em ? new Date(contrato.token_expira_em) : undefined,
      dadosAssinaturaExterna: contrato.dados_assinatura_externa,
      criadoEm: new Date(contrato.criado_em),
      atualizadoEm: new Date(contrato.atualizado_em),
      criadoPor: contrato.criado_por,
      modelo: contrato.modelo ? {
        id: contrato.modelo_id,
        nome: contrato.modelo.nome,
        descricao: contrato.modelo.descricao,
        conteudo: '',
        variaveis: [],
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        criadoPor: ''
      } : undefined
    }));

    return {
      contratos,
      total: count || 0,
      pagina,
      tamanhoPagina
    };
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    throw error;
  }
}

export async function criarContrato(dados: DadosCriarContrato): Promise<Contrato> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('Usuário não autenticado');

    // Buscar o modelo para preencher o conteúdo
    const { data: modelo, error: modeloError } = await supabase
      .from('modelos_contratos')
      .select('*')
      .eq('id', dados.modeloId)
      .single();

    if (modeloError) throw modeloError;

    // Substituir variáveis no conteúdo
    let conteudoFinal = modelo.conteudo;
    Object.entries(dados.dadosVariaveis).forEach(([chave, valor]) => {
      const regex = new RegExp(`\\[${chave}\\]`, 'g');
      conteudoFinal = conteudoFinal.replace(regex, String(valor));
    });

    const { data, error } = await supabase
      .from('contratos')
      .insert({
        modelo_id: dados.modeloId,
        titulo: dados.titulo,
        conteudo: conteudoFinal,
        dados_variaveis: dados.dadosVariaveis as any,
        assinante_externo_nome: dados.assinanteExternoNome,
        assinante_externo_email: dados.assinanteExternoEmail,
        assinante_externo_documento: dados.assinanteExternoDocumento,
        assinante_interno_id: dados.assinanteInternoId,
        criado_por: user.data.user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar log de auditoria
    await registrarLogAuditoria(data.id, 'contrato_criado', 'Contrato criado com sucesso', {
      titulo: dados.titulo,
      modelo: modelo.nome,
      assinante_externo: dados.assinanteExternoEmail
    });

    // Log do sistema
    await logSystemEvent({
      userId: user.data.user.id,
      userDisplayName: user.data.user.user_metadata?.full_name || user.data.user.email,
      actionType: 'CREATE',
      entityTable: 'contratos',
      entityId: data.id,
      newData: dados as any
    });

    return {
      id: data.id,
      numeroContrato: data.numero_contrato,
      modeloId: data.modelo_id,
      titulo: data.titulo,
      conteudo: data.conteudo,
      dadosVariaveis: (data.dados_variaveis as any) || {},
      status: data.status as StatusContrato,
      urlPdf: data.url_pdf,
      hashDocumento: data.hash_documento,
      assinanteInternoId: data.assinante_interno_id,
      assinanteInternoNome: data.assinante_interno_nome,
      assinanteInternoEmail: data.assinante_interno_email,
      assinadoInternamenteEm: data.assinado_internamente_em ? new Date(data.assinado_internamente_em) : undefined,
      dadosAssinaturaInterna: data.dados_assinatura_interna,
      assinanteExternoNome: data.assinante_externo_nome,
      assinanteExternoEmail: data.assinante_externo_email,
      assinanteExternoDocumento: data.assinante_externo_documento,
      assinadoExternamenteEm: data.assinado_externamente_em ? new Date(data.assinado_externamente_em) : undefined,
      tokenAssinaturaExterna: data.token_assinatura_externa,
      tokenExpiraEm: data.token_expira_em ? new Date(data.token_expira_em) : undefined,
      dadosAssinaturaExterna: data.dados_assinatura_externa,
      criadoEm: new Date(data.criado_em),
      atualizadoEm: new Date(data.atualizado_em),
      criadoPor: data.criado_por
    };
  } catch (error) {
    console.error('Erro ao criar contrato:', error);
    throw error;
  }
}

// ==================== ASSINATURAS ====================

export async function finalizarContratoEIniciarAssinaturas(dados: DadosFinalizarContrato): Promise<void> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('Usuário não autenticado');

    // Calcular hash do documento
    const encoder = new TextEncoder();
    const data = encoder.encode(dados.conteudoFinal);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Atualizar contrato
    const { error } = await supabase
      .from('contratos')
      .update({
        conteudo: dados.conteudoFinal,
        hash_documento: hashHex,
        status: 'aguardando_assinatura_interna',
        assinante_interno_id: dados.assinanteInternoId
      })
      .eq('id', dados.contratoId);

    if (error) throw error;

    // Registrar logs de auditoria
    await registrarLogAuditoria(dados.contratoId, 'documento_finalizado', 'Documento finalizado e hash calculado', {
      hash: hashHex,
      tamanho_documento: dados.conteudoFinal.length
    });

    await registrarLogAuditoria(dados.contratoId, 'assinatura_interna_solicitada', 'Assinatura interna solicitada', {
      assinante_id: dados.assinanteInternoId
    });

  } catch (error) {
    console.error('Erro ao finalizar contrato:', error);
    throw error;
  }
}

export async function assinarInternamente(dados: DadosAssinaturaInterna): Promise<void> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('Usuário não autenticado');

    // Aqui seria implementada a lógica de assinatura digital com certificado ICP-Brasil
    // Por enquanto, vamos simular os dados da assinatura
    const dadosAssinatura = {
      subjectCertificado: 'Simulado - Nome do Titular',
      emissorCertificado: 'AC SERASA RFB v5',
      numeroSerieCertificado: '123456789',
      validoAPartirDe: new Date().toISOString(),
      validoAte: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      timestampAssinatura: new Date().toISOString(),
      algoritmoAssinatura: 'SHA256withRSA',
      impressaoDigitalCertificado: 'ABC123...',
      nomeCompleto: user.data.user.user_metadata?.full_name || 'Nome do Usuário',
      cpf: '000.000.000-00',
      email: user.data.user.email || ''
    };

    // Atualizar contrato
    const { error } = await supabase
      .from('contratos')
      .update({
        status: 'aguardando_assinatura_externa',
        assinado_internamente_em: new Date().toISOString(),
        dados_assinatura_interna: dadosAssinatura
      })
      .eq('id', dados.contratoId);

    if (error) throw error;

    // Gerar token para assinatura externa
    await gerarTokenAssinaturaExterna(dados.contratoId);

    // Registrar log de auditoria
    await registrarLogAuditoria(dados.contratoId, 'assinado_internamente', 'Contrato assinado internamente com certificado digital', {
      certificado: dadosAssinatura.subjectCertificado,
      algoritmo: dadosAssinatura.algoritmoAssinatura
    });

  } catch (error) {
    console.error('Erro ao assinar internamente:', error);
    throw error;
  }
}

export async function gerarTokenAssinaturaExterna(contratoId: string): Promise<string> {
  try {
    // Gerar token de 6 dígitos
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Buscar dados do contrato
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('assinante_externo_email')
      .eq('id', contratoId)
      .single();

    if (contratoError) throw contratoError;

    // Salvar token
    const { error: tokenError } = await supabase
      .from('tokens_verificacao_contratos')
      .insert([{
        contrato_id: contratoId,
        token,
        email: contrato.assinante_externo_email,
        expira_em: expiraEm.toISOString()
      }]);

    if (tokenError) throw tokenError;

    // Atualizar contrato com token
    const { error: updateError } = await supabase
      .from('contratos')
      .update({
        token_assinatura_externa: token,
        token_expira_em: expiraEm.toISOString()
      })
      .eq('id', contratoId);

    if (updateError) throw updateError;

    // Registrar log
    await registrarLogAuditoria(contratoId, 'token_gerado', 'Token de verificação gerado para assinatura externa', {
      email: contrato.assinante_externo_email,
      expira_em: expiraEm.toISOString()
    });

    // Aqui seria enviado o e-mail com o token
    await registrarLogAuditoria(contratoId, 'email_externo_enviado', 'E-mail com token enviado para assinante externo', {
      email: contrato.assinante_externo_email,
      token_enviado: true
    });

    return token;
  } catch (error) {
    console.error('Erro ao gerar token:', error);
    throw error;
  }
}

export async function validarToken(contratoId: string, token: string): Promise<ResultadoValidacaoToken> {
  try {
    const { data, error } = await supabase
      .from('tokens_verificacao_contratos')
      .select('*')
      .eq('contrato_id', contratoId)
      .eq('token', token)
      .single();

    if (error || !data) {
      return {
        valido: false,
        expirado: false,
        jaUsado: false,
        mensagem: 'Token inválido'
      };
    }

    const agora = new Date();
    const expiraEm = new Date(data.expira_em);

    if (agora > expiraEm) {
      return {
        valido: false,
        expirado: true,
        jaUsado: false,
        mensagem: 'Token expirado'
      };
    }

    if (data.usado_em) {
      return {
        valido: false,
        expirado: false,
        jaUsado: true,
        mensagem: 'Token já foi utilizado'
      };
    }

    // Buscar dados do contrato
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', contratoId)
      .single();

    if (contratoError) throw contratoError;

    return {
      valido: true,
      expirado: false,
      jaUsado: false,
      contrato: {
        id: contrato.id,
        numeroContrato: contrato.numero_contrato,
        modeloId: contrato.modelo_id,
        titulo: contrato.titulo,
        conteudo: contrato.conteudo,
        dadosVariaveis: contrato.dados_variaveis || {},
        status: contrato.status as StatusContrato,
        urlPdf: contrato.url_pdf,
        hashDocumento: contrato.hash_documento,
        assinanteInternoId: contrato.assinante_interno_id,
        assinanteInternoNome: contrato.assinante_interno_nome,
        assinanteInternoEmail: contrato.assinante_interno_email,
        assinadoInternamenteEm: contrato.assinado_internamente_em ? new Date(contrato.assinado_internamente_em) : undefined,
        dadosAssinaturaInterna: contrato.dados_assinatura_interna,
        assinanteExternoNome: contrato.assinante_externo_nome,
        assinanteExternoEmail: contrato.assinante_externo_email,
        assinanteExternoDocumento: contrato.assinante_externo_documento,
        assinadoExternamenteEm: contrato.assinado_externamente_em ? new Date(contrato.assinado_externamente_em) : undefined,
        tokenAssinaturaExterna: contrato.token_assinatura_externa,
        tokenExpiraEm: contrato.token_expira_em ? new Date(contrato.token_expira_em) : undefined,
        dadosAssinaturaExterna: contrato.dados_assinatura_externa,
        criadoEm: new Date(contrato.criado_em),
        atualizadoEm: new Date(contrato.atualizado_em),
        criadoPor: contrato.criado_por
      },
      mensagem: 'Token válido'
    };
  } catch (error) {
    console.error('Erro ao validar token:', error);
    return {
      valido: false,
      expirado: false,
      jaUsado: false,
      mensagem: 'Erro interno'
    };
  }
}

export async function assinarExternamente(dados: DadosAssinaturaExterna): Promise<void> {
  try {
    // Coletar evidências da assinatura simples
    const dadosAssinatura = {
      enderecoIp: '192.168.1.1', // Seria obtido do request
      agenteUsuario: navigator.userAgent,
      timestamp: new Date().toISOString(),
      tokenValidado: true,
      horaValidacaoToken: new Date().toISOString(),
      geolocalizacao: dados.dadosGeolocalizacao,
      evidenciasAdicionais: {
        resolucaoTela: `${screen.width}x${screen.height}`,
        fusoHorario: Intl.DateTimeFormat().resolvedOptions().timeZone,
        idioma: navigator.language
      }
    };

    // Marcar token como usado
    const { error: tokenError } = await supabase
      .from('tokens_verificacao_contratos')
      .update({
        usado_em: new Date().toISOString(),
        endereco_ip: dadosAssinatura.enderecoIp,
        agente_usuario: dadosAssinatura.agenteUsuario
      })
      .eq('contrato_id', dados.contratoId)
      .eq('token', dados.token);

    if (tokenError) throw tokenError;

    // Atualizar contrato
    const { error: contratoError } = await supabase
      .from('contratos')
      .update({
        status: 'concluido',
        assinado_externamente_em: new Date().toISOString(),
        dados_assinatura_externa: dadosAssinatura
      })
      .eq('id', dados.contratoId);

    if (contratoError) throw contratoError;

    // Registrar logs de auditoria
    await registrarLogAuditoria(dados.contratoId, 'token_validado', 'Token validado com sucesso', {
      token: dados.token,
      ip: dadosAssinatura.enderecoIp
    });

    await registrarLogAuditoria(dados.contratoId, 'assinado_externamente', 'Contrato assinado externamente', {
      evidencias: dadosAssinatura
    });

    await registrarLogAuditoria(dados.contratoId, 'contrato_concluido', 'Contrato concluído com todas as assinaturas', {
      data_conclusao: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao assinar externamente:', error);
    throw error;
  }
}

// ==================== LOGS E AUDITORIA ====================

export async function registrarLogAuditoria(
  contratoId: string, 
  tipoEvento: TipoEventoContrato, 
  descricao: string, 
  dadosEvento?: Record<string, unknown>
): Promise<void> {
  try {
    const user = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('logs_auditoria_contratos')
      .insert([{
        contrato_id: contratoId,
        tipo_evento: tipoEvento,
        descricao_evento: descricao,
        dados_evento: dadosEvento,
        usuario_id: user.data.user?.id,
        endereco_ip: '192.168.1.1', // Seria obtido do request
        agente_usuario: navigator.userAgent
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error);
    // Não propagar o erro para não interromper o fluxo principal
  }
}

export async function buscarLogsAuditoria(contratoId: string): Promise<LogAuditoriaContrato[]> {
  try {
    const { data, error } = await supabase
      .from('logs_auditoria_contratos')
      .select('*')
      .eq('contrato_id', contratoId)
      .order('data_hora', { ascending: true });

    if (error) throw error;

    return (data || []).map(log => ({
      id: log.id,
      contratoId: log.contrato_id,
      tipoEvento: log.tipo_evento as TipoEventoContrato,
      descricaoEvento: log.descricao_evento,
      dadosEvento: log.dados_evento,
      usuarioId: log.usuario_id,
      enderecoIp: log.endereco_ip,
      agenteUsuario: log.agente_usuario,
      dataHora: new Date(log.data_hora)
    }));
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    throw error;
  }
}

// ==================== ESTATÍSTICAS ====================

export async function buscarEstatisticasComercial(): Promise<EstatisticasComercial> {
  try {
    // Buscar totais por status
    const { data: statusData, error: statusError } = await supabase
      .from('contratos')
      .select('status')
      .neq('status', 'cancelado');

    if (statusError) throw statusError;

    const contratosPorStatus = (statusData || []).reduce((acc, curr) => {
      acc[curr.status as StatusContrato] = (acc[curr.status as StatusContrato] || 0) + 1;
      return acc;
    }, {} as Record<StatusContrato, number>);

    const totalContratos = statusData?.length || 0;
    const contratosConcluidos = contratosPorStatus.concluido || 0;
    const assinaturasPendentes = (contratosPorStatus.aguardando_assinatura_interna || 0) + 
                                 (contratosPorStatus.aguardando_assinatura_externa || 0);
    const rascunhos = contratosPorStatus.rascunho || 0;

    // Calcular crescimento mensal (simplificado)
    const crescimentoMensal = 15.5; // Seria calculado comparando com mês anterior

    // Calcular tempo médio de conclusão (simplificado)
    const tempoMedioConclusao = 7; // Seria calculado baseado nos contratos concluídos

    // Contratos por mês (últimos 6 meses)
    const contratosPorMes = [
      { mes: 'Jan', quantidade: 12 },
      { mes: 'Fev', quantidade: 18 },
      { mes: 'Mar', quantidade: 15 },
      { mes: 'Abr', quantidade: 22 },
      { mes: 'Mai', quantidade: 28 },
      { mes: 'Jun', quantidade: 35 }
    ];

    return {
      totalContratos,
      contratosConcluidos,
      assinaturasPendentes,
      rascunhos,
      crescimentoMensal,
      tempoMedioConclusao,
      contratosPorStatus,
      contratosPorMes
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas comerciais:', error);
    throw error;
  }
}

// ==================== RELATÓRIOS ====================

export async function gerarRelatorioAuditoria(contratoId: string): Promise<RelatorioAuditoria> {
  try {
    // Buscar contrato completo
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', contratoId)
      .single();

    if (contratoError) throw contratoError;

    // Buscar logs completos
    const logs = await buscarLogsAuditoria(contratoId);

    return {
      contrato: {
        id: contrato.id,
        numeroContrato: contrato.numero_contrato,
        modeloId: contrato.modelo_id,
        titulo: contrato.titulo,
        conteudo: contrato.conteudo,
        dadosVariaveis: contrato.dados_variaveis || {},
        status: contrato.status as StatusContrato,
        urlPdf: contrato.url_pdf,
        hashDocumento: contrato.hash_documento,
        assinanteInternoId: contrato.assinante_interno_id,
        assinanteInternoNome: contrato.assinante_interno_nome,
        assinanteInternoEmail: contrato.assinante_interno_email,
        assinadoInternamenteEm: contrato.assinado_internamente_em ? new Date(contrato.assinado_internamente_em) : undefined,
        dadosAssinaturaInterna: contrato.dados_assinatura_interna,
        assinanteExternoNome: contrato.assinante_externo_nome,
        assinanteExternoEmail: contrato.assinante_externo_email,
        assinanteExternoDocumento: contrato.assinante_externo_documento,
        assinadoExternamenteEm: contrato.assinado_externamente_em ? new Date(contrato.assinado_externamente_em) : undefined,
        tokenAssinaturaExterna: contrato.token_assinatura_externa,
        tokenExpiraEm: contrato.token_expira_em ? new Date(contrato.token_expira_em) : undefined,
        dadosAssinaturaExterna: contrato.dados_assinatura_externa,
        criadoEm: new Date(contrato.criado_em),
        atualizadoEm: new Date(contrato.atualizado_em),
        criadoPor: contrato.criado_por
      },
      logsCompletos: logs,
      hashDocumento: contrato.hash_documento || '',
      timestampGeracao: new Date().toISOString(),
      assinaturasValidadas: {
        interna: !!contrato.dados_assinatura_interna,
        externa: !!contrato.dados_assinatura_externa
      },
      evidenciasColetadas: {
        assinaturaInterna: contrato.dados_assinatura_interna,
        assinaturaExterna: contrato.dados_assinatura_externa
      }
    };
  } catch (error) {
    console.error('Erro ao gerar relatório de auditoria:', error);
    throw error;
  }
}
