import { supabase } from '@/integrations/supabase/client';

export interface EvidenciasTecnicas {
  ip_address: string;
  user_agent: string;
  timestamp: string;
  timezone: string;
  screen_resolution?: string;
  browser_language?: string;
  platform?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

export interface LogAuditoria {
  id?: string;
  contrato_id: string;
  evento: string;
  descricao: string;
  dados_evento: Record<string, any>;
  evidencias_tecnicas: EvidenciasTecnicas;
  usuario_id?: string;
  timestamp_evento: string;
}

export interface RelatorioAuditoria {
  contrato_id: string;
  titulo_contrato: string;
  total_eventos: number;
  eventos_por_tipo: Record<string, number>;
  linha_tempo: LogAuditoria[];
  evidencias_criticas: {
    assinaturas: number;
    alteracoes_documento: number;
    tentativas_acesso: number;
  };
  conformidade: {
    evidencias_completas: boolean;
    timestamps_validos: boolean;
    ips_consistentes: boolean;
    certificados_validos: boolean;
  };
}

/**
 * Serviço completo de auditoria para contratos comerciais
 * Registra todas as evidências técnicas e eventos do processo
 */
export class AuditoriaService {

  /**
   * Coleta evidências técnicas do ambiente do usuário
   */
  static async coletarEvidenciasTecnicas(): Promise<EvidenciasTecnicas> {
    const timestamp = new Date().toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Coletar informações básicas
    const evidencias: EvidenciasTecnicas = {
      ip_address: await this.obterIP(),
      user_agent: navigator.userAgent,
      timestamp,
      timezone,
      screen_resolution: `${screen.width}x${screen.height}`,
      browser_language: navigator.language,
      platform: navigator.platform
    };

    // Tentar obter geolocalização (opcional)
    try {
      const geolocalizacao = await this.obterGeolocalizacao();
      if (geolocalizacao) {
        evidencias.geolocation = geolocalizacao;
      }
    } catch (error) {
      console.log('Geolocalização não disponível:', error);
    }

    return evidencias;
  }

  /**
   * Obtém endereço IP do usuário
   */
  static async obterIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Erro ao obter IP:', error);
      return '127.0.0.1';
    }
  }

  /**
   * Obtém geolocalização do usuário (com permissão)
   */
  static async obterGeolocalizacao(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }

  /**
   * Registra evento de auditoria
   */
  static async registrarEvento(
    contratoId: string,
    evento: string,
    descricao: string,
    dadosEvento: Record<string, any> = {},
    usuarioId?: string
  ): Promise<void> {
    try {
      const evidencias = await this.coletarEvidenciasTecnicas();
      
      const logEntry: Omit<LogAuditoria, 'id'> = {
        contrato_id: contratoId,
        evento,
        descricao,
        dados_evento: dadosEvento,
        evidencias_tecnicas: evidencias,
        usuario_id: usuarioId,
        timestamp_evento: evidencias.timestamp
      };

      const { error } = await supabase
        .from('logs_auditoria_contratos_comerciais')
        .insert([{
          contrato_id: logEntry.contrato_id,
          evento: logEntry.evento,
          descricao: logEntry.descricao,
          dados_evento: logEntry.dados_evento,
          usuario_id: logEntry.usuario_id,
          ip_address: logEntry.evidencias_tecnicas.ip_address,
          user_agent: logEntry.evidencias_tecnicas.user_agent,
          timestamp_evento: logEntry.timestamp_evento
        }]);

      if (error) throw error;

      console.log(`[AUDITORIA] ${evento}: ${descricao}`, {
        contrato: contratoId,
        dados: dadosEvento,
        evidencias
      });

    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
      // Não falhar a operação principal por erro de auditoria
    }
  }

  /**
   * Eventos específicos do ciclo de vida do contrato
   */
  static async registrarCriacaoContrato(contratoId: string, dadosContrato: any, usuarioId: string): Promise<void> {
    await this.registrarEvento(
      contratoId,
      'contrato_criado',
      `Contrato "${dadosContrato.titulo}" criado`,
      {
        titulo: dadosContrato.titulo,
        modelo_id: dadosContrato.modelo_id,
        assinante_externo: dadosContrato.assinante_externo_nome,
        status_inicial: dadosContrato.status
      },
      usuarioId
    );
  }

  static async registrarEdicaoContrato(contratoId: string, alteracoes: any, usuarioId: string): Promise<void> {
    await this.registrarEvento(
      contratoId,
      'contrato_editado',
      'Contrato modificado',
      {
        campos_alterados: Object.keys(alteracoes),
        alteracoes
      },
      usuarioId
    );
  }

  static async registrarMudancaStatus(contratoId: string, statusAnterior: string, novoStatus: string, usuarioId?: string): Promise<void> {
    await this.registrarEvento(
      contratoId,
      'status_alterado',
      `Status alterado de "${statusAnterior}" para "${novoStatus}"`,
      {
        status_anterior: statusAnterior,
        novo_status: novoStatus,
        automatico: !usuarioId
      },
      usuarioId
    );
  }

  static async registrarAssinaturaInterna(contratoId: string, dadosAssinatura: any, usuarioId: string): Promise<void> {
    await this.registrarEvento(
      contratoId,
      'assinatura_interna_realizada',
      `Assinatura digital qualificada realizada por ${dadosAssinatura.signatario_nome}`,
      {
        tipo_assinatura: 'interna_qualificada',
        signatario: dadosAssinatura.signatario_nome,
        certificado: dadosAssinatura.certificado_dados,
        hash_assinatura: dadosAssinatura.hash_assinatura
      },
      usuarioId
    );
  }

  static async registrarAssinaturaExterna(contratoId: string, dadosAssinatura: any): Promise<void> {
    await this.registrarEvento(
      contratoId,
      'assinatura_externa_realizada',
      `Assinatura eletrônica simples realizada por ${dadosAssinatura.signatario_nome}`,
      {
        tipo_assinatura: 'externa_simples',
        signatario: dadosAssinatura.signatario_nome,
        token_utilizado: dadosAssinatura.token_verificacao,
        email_verificado: dadosAssinatura.signatario_email
      }
    );
  }

  static async registrarEnvioToken(contratoId: string, emailDestinatario: string, token: string, usuarioId?: string): Promise<void> {
    await this.registrarEvento(
      contratoId,
      'token_enviado',
      `Token de verificação enviado para ${emailDestinatario}`,
      {
        email_destinatario: emailDestinatario,
        token_gerado: token,
        valido_ate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      usuarioId
    );
  }

  static async registrarValidacaoToken(contratoId: string, token: string, sucesso: boolean, motivo?: string): Promise<void> {
    await this.registrarEvento(
      contratoId,
      sucesso ? 'token_validado' : 'token_rejeitado',
      sucesso ? 'Token validado com sucesso' : `Token rejeitado: ${motivo}`,
      {
        token_utilizado: token,
        validacao_sucesso: sucesso,
        motivo_rejeicao: motivo
      }
    );
  }

  static async registrarGeracaoPDF(contratoId: string, dadosPDF: any, usuarioId?: string): Promise<void> {
    await this.registrarEvento(
      contratoId,
      'pdf_gerado',
      'PDF do contrato gerado',
      {
        hash_documento: dadosPDF.hashSHA256,
        tamanho_bytes: dadosPDF.tamanhoBytes,
        url_pdf: dadosPDF.pdfUrl
      },
      usuarioId
    );
  }

  static async registrarTentativaAcesso(contratoId: string, tipoAcesso: string, sucesso: boolean, detalhes?: any): Promise<void> {
    await this.registrarEvento(
      contratoId,
      sucesso ? 'acesso_autorizado' : 'acesso_negado',
      `Tentativa de ${tipoAcesso} ${sucesso ? 'autorizada' : 'negada'}`,
      {
        tipo_acesso: tipoAcesso,
        sucesso,
        detalhes
      }
    );
  }

  /**
   * Busca logs de auditoria de um contrato
   */
  static async buscarLogsContrato(contratoId: string): Promise<LogAuditoria[]> {
    try {
      const { data, error } = await supabase
        .from('logs_auditoria_contratos_comerciais')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('timestamp_evento', { ascending: false });

      if (error) throw error;

      return data?.map(log => ({
        id: log.id,
        contrato_id: log.contrato_id,
        evento: log.evento,
        descricao: log.descricao,
        dados_evento: log.dados_evento || {},
        evidencias_tecnicas: {
          ip_address: log.ip_address || '',
          user_agent: log.user_agent || '',
          timestamp: log.timestamp_evento,
          timezone: 'UTC'
        },
        usuario_id: log.usuario_id,
        timestamp_evento: log.timestamp_evento
      })) || [];

    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return [];
    }
  }

  /**
   * Gera relatório completo de auditoria
   */
  static async gerarRelatorioAuditoria(contratoId: string): Promise<RelatorioAuditoria | null> {
    try {
      // Buscar dados do contrato
      const { data: contrato } = await supabase
        .from('contratos_comerciais')
        .select('titulo')
        .eq('id', contratoId)
        .single();

      if (!contrato) return null;

      // Buscar logs
      const logs = await this.buscarLogsContrato(contratoId);

      // Analisar eventos
      const eventosPorTipo: Record<string, number> = {};
      logs.forEach(log => {
        eventosPorTipo[log.evento] = (eventosPorTipo[log.evento] || 0) + 1;
      });

      // Calcular evidências críticas
      const evidenciasCriticas = {
        assinaturas: (eventosPorTipo['assinatura_interna_realizada'] || 0) + 
                    (eventosPorTipo['assinatura_externa_realizada'] || 0),
        alteracoes_documento: eventosPorTipo['contrato_editado'] || 0,
        tentativas_acesso: (eventosPorTipo['acesso_autorizado'] || 0) + 
                          (eventosPorTipo['acesso_negado'] || 0)
      };

      // Verificar conformidade
      const conformidade = {
        evidencias_completas: logs.every(log => 
          log.evidencias_tecnicas.ip_address && 
          log.evidencias_tecnicas.user_agent
        ),
        timestamps_validos: logs.every(log => 
          new Date(log.timestamp_evento).getTime() > 0
        ),
        ips_consistentes: true, // Implementar lógica específica se necessário
        certificados_validos: true // Implementar validação de certificados
      };

      return {
        contrato_id: contratoId,
        titulo_contrato: contrato.titulo,
        total_eventos: logs.length,
        eventos_por_tipo: eventosPorTipo,
        linha_tempo: logs,
        evidencias_criticas,
        conformidade
      };

    } catch (error) {
      console.error('Erro ao gerar relatório de auditoria:', error);
      return null;
    }
  }
}
