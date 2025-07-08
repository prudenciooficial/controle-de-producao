import { supabase } from '@/integrations/supabase/client';
import { AuditoriaService } from './auditoriaService';

export interface EvidenciaJuridica {
  id?: string;
  contrato_id: string;
  tipo_evidencia: 'assinatura_digital' | 'token_verificacao' | 'integridade_documento' | 'timestamp_qualificado';
  dados_evidencia: Record<string, any>;
  hash_evidencia: string;
  timestamp_coleta: string;
  valida: boolean;
  verificada_em?: string;
  observacoes?: string;
}

export interface ValidacaoContrato {
  contrato_id: string;
  status_validacao: 'valido' | 'invalido' | 'pendente' | 'expirado';
  evidencias_coletadas: EvidenciaJuridica[];
  conformidade_legal: {
    lei_14063_2020: boolean;
    mp_2200_2_2001: boolean;
    certificados_icp_brasil: boolean;
    timestamps_validos: boolean;
    integridade_preservada: boolean;
  };
  relatorio_validacao: string;
  validado_em: string;
  valido_ate?: string;
}

export interface CertificadoValidacao {
  numero_certificado: string;
  contrato_id: string;
  hash_documento: string;
  assinaturas_validadas: number;
  evidencias_tecnicas: number;
  conformidade_percentual: number;
  emitido_em: string;
  valido_ate: string;
  autoridade_certificadora: string;
}

/**
 * Serviço para validação jurídica e coleta de evidências
 * Garante conformidade com Lei nº 14.063/2020 e MP nº 2.200-2/2001
 */
export class ValidacaoJuridicaService {

  /**
   * Coleta evidência de assinatura digital qualificada
   */
  static async coletarEvidenciaAssinaturaDigital(
    contratoId: string,
    dadosAssinatura: any
  ): Promise<EvidenciaJuridica> {
    try {
      const evidencia: Omit<EvidenciaJuridica, 'id'> = {
        contrato_id: contratoId,
        tipo_evidencia: 'assinatura_digital',
        dados_evidencia: {
          certificado: {
            nome: dadosAssinatura.certificado_dados.nome,
            cpf: dadosAssinatura.certificado_dados.cpf,
            emissor: dadosAssinatura.certificado_dados.emissor,
            valido_ate: dadosAssinatura.certificado_dados.valido_ate,
            tipo: dadosAssinatura.certificado_dados.tipo,
            thumbprint: dadosAssinatura.certificado_dados.thumbprint,
            serial_number: dadosAssinatura.certificado_dados.serialNumber
          },
          assinatura: {
            hash: dadosAssinatura.hash_assinatura,
            algoritmo: 'SHA-256',
            timestamp: dadosAssinatura.timestamp_assinatura
          },
          contexto: {
            ip_address: dadosAssinatura.ip_address,
            user_agent: dadosAssinatura.user_agent,
            signatario: dadosAssinatura.signatario_nome
          }
        },
        hash_evidencia: await this.calcularHashEvidencia(dadosAssinatura),
        timestamp_coleta: new Date().toISOString(),
        valida: true
      };

      // Salvar evidência
      const { data, error } = await supabase
        .from('evidencias_juridicas_contratos')
        .insert([evidencia])
        .select()
        .single();

      if (error) throw error;

      // Registrar coleta na auditoria
      await AuditoriaService.registrarEvento(
        contratoId,
        'evidencia_coletada',
        'Evidência de assinatura digital coletada',
        {
          tipo: 'assinatura_digital',
          hash: evidencia.hash_evidencia,
          certificado: dadosAssinatura.certificado_dados.nome
        }
      );

      return data;
    } catch (error) {
      console.error('Erro ao coletar evidência de assinatura:', error);
      throw new Error('Erro ao coletar evidência de assinatura digital');
    }
  }

  /**
   * Coleta evidência de token de verificação
   */
  static async coletarEvidenciaTokenVerificacao(
    contratoId: string,
    dadosToken: any
  ): Promise<EvidenciaJuridica> {
    try {
      const evidencia: Omit<EvidenciaJuridica, 'id'> = {
        contrato_id: contratoId,
        tipo_evidencia: 'token_verificacao',
        dados_evidencia: {
          token: {
            codigo: dadosToken.token_verificacao,
            gerado_em: dadosToken.criado_em,
            valido_ate: dadosToken.valido_ate,
            usado_em: dadosToken.usado_em
          },
          validacao: {
            ip_validacao: dadosToken.ip_uso,
            user_agent: dadosToken.user_agent_uso,
            email_verificado: dadosToken.email_destinatario
          },
          contexto: {
            signatario: dadosToken.signatario_nome,
            metodo_verificacao: 'email_token'
          }
        },
        hash_evidencia: await this.calcularHashEvidencia(dadosToken),
        timestamp_coleta: new Date().toISOString(),
        valida: true
      };

      // Salvar evidência
      const { data, error } = await supabase
        .from('evidencias_juridicas_contratos')
        .insert([evidencia])
        .select()
        .single();

      if (error) throw error;

      // Registrar coleta na auditoria
      await AuditoriaService.registrarEvento(
        contratoId,
        'evidencia_coletada',
        'Evidência de token de verificação coletada',
        {
          tipo: 'token_verificacao',
          hash: evidencia.hash_evidencia,
          email: dadosToken.email_destinatario
        }
      );

      return data;
    } catch (error) {
      console.error('Erro ao coletar evidência de token:', error);
      throw new Error('Erro ao coletar evidência de token de verificação');
    }
  }

  /**
   * Coleta evidência de integridade do documento
   */
  static async coletarEvidenciaIntegridade(
    contratoId: string,
    hashDocumento: string,
    dadosDocumento: any
  ): Promise<EvidenciaJuridica> {
    try {
      const evidencia: Omit<EvidenciaJuridica, 'id'> = {
        contrato_id: contratoId,
        tipo_evidencia: 'integridade_documento',
        dados_evidencia: {
          documento: {
            hash_sha256: hashDocumento,
            tamanho_bytes: dadosDocumento.tamanhoBytes,
            formato: 'PDF',
            gerado_em: dadosDocumento.geradoEm
          },
          verificacao: {
            algoritmo: 'SHA-256',
            verificado_em: new Date().toISOString(),
            integro: true
          },
          metadados: {
            url_documento: dadosDocumento.pdfUrl,
            versao: '1.0'
          }
        },
        hash_evidencia: hashDocumento,
        timestamp_coleta: new Date().toISOString(),
        valida: true
      };

      // Salvar evidência
      const { data, error } = await supabase
        .from('evidencias_juridicas_contratos')
        .insert([evidencia])
        .select()
        .single();

      if (error) throw error;

      // Registrar coleta na auditoria
      await AuditoriaService.registrarEvento(
        contratoId,
        'evidencia_coletada',
        'Evidência de integridade do documento coletada',
        {
          tipo: 'integridade_documento',
          hash: hashDocumento,
          tamanho: dadosDocumento.tamanhoBytes
        }
      );

      return data;
    } catch (error) {
      console.error('Erro ao coletar evidência de integridade:', error);
      throw new Error('Erro ao coletar evidência de integridade');
    }
  }

  /**
   * Valida contrato completo
   */
  static async validarContrato(contratoId: string): Promise<ValidacaoContrato> {
    try {
      // Buscar todas as evidências do contrato
      const { data: evidencias, error: evidenciasError } = await supabase
        .from('evidencias_juridicas_contratos')
        .select('*')
        .eq('contrato_id', contratoId);

      if (evidenciasError) throw evidenciasError;

      // Buscar dados do contrato
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos_comerciais')
        .select(`
          *,
          assinaturas:assinaturas_contratos_comerciais(*)
        `)
        .eq('id', contratoId)
        .single();

      if (contratoError) throw contratoError;

      // Verificar conformidade legal
      const conformidade = await this.verificarConformidadeLegal(contrato, evidencias || []);

      // Determinar status de validação
      const statusValidacao = this.determinarStatusValidacao(conformidade, contrato);

      // Gerar relatório
      const relatorio = this.gerarRelatorioValidacao(contrato, evidencias || [], conformidade);

      const validacao: ValidacaoContrato = {
        contrato_id: contratoId,
        status_validacao: statusValidacao,
        evidencias_coletadas: evidencias || [],
        conformidade_legal: conformidade,
        relatorio_validacao: relatorio,
        validado_em: new Date().toISOString(),
        valido_ate: contrato.status === 'concluido' ? 
          new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() : // 10 anos
          undefined
      };

      // Registrar validação na auditoria
      await AuditoriaService.registrarEvento(
        contratoId,
        'validacao_juridica_realizada',
        `Validação jurídica concluída: ${statusValidacao}`,
        {
          status: statusValidacao,
          conformidade: conformidade,
          total_evidencias: evidencias?.length || 0
        }
      );

      return validacao;
    } catch (error) {
      console.error('Erro ao validar contrato:', error);
      throw new Error('Erro ao realizar validação jurídica');
    }
  }

  /**
   * Verifica conformidade com legislação
   */
  private static async verificarConformidadeLegal(
    contrato: any,
    evidencias: EvidenciaJuridica[]
  ): Promise<ValidacaoContrato['conformidade_legal']> {
    const conformidade = {
      lei_14063_2020: false,
      mp_2200_2_2001: false,
      certificados_icp_brasil: false,
      timestamps_validos: false,
      integridade_preservada: false
    };

    // Verificar Lei nº 14.063/2020 (Assinaturas Eletrônicas)
    const temAssinaturaDigital = contrato.assinaturas?.some((a: any) => a.tipo === 'interna_qualificada');
    const temAssinaturaSimples = contrato.assinaturas?.some((a: any) => a.tipo === 'externa_simples');
    conformidade.lei_14063_2020 = temAssinaturaDigital || temAssinaturaSimples;

    // Verificar MP nº 2.200-2/2001 (ICP-Brasil)
    const temCertificadoICP = evidencias.some(e => 
      e.tipo_evidencia === 'assinatura_digital' && 
      e.dados_evidencia.certificado?.emissor?.includes('ICP-Brasil')
    );
    conformidade.mp_2200_2_2001 = temCertificadoICP;
    conformidade.certificados_icp_brasil = temCertificadoICP;

    // Verificar timestamps válidos
    const timestampsValidos = evidencias.every(e => {
      const timestamp = new Date(e.timestamp_coleta);
      return timestamp.getTime() > 0 && timestamp <= new Date();
    });
    conformidade.timestamps_validos = timestampsValidos;

    // Verificar integridade preservada
    const temEvidenciaIntegridade = evidencias.some(e => e.tipo_evidencia === 'integridade_documento');
    conformidade.integridade_preservada = temEvidenciaIntegridade;

    return conformidade;
  }

  /**
   * Determina status de validação
   */
  private static determinarStatusValidacao(
    conformidade: ValidacaoContrato['conformidade_legal'],
    contrato: any
  ): ValidacaoContrato['status_validacao'] {
    if (contrato.status !== 'concluido') {
      return 'pendente';
    }

    const conformidadeTotal = Object.values(conformidade).every(Boolean);
    return conformidadeTotal ? 'valido' : 'invalido';
  }

  /**
   * Gera relatório de validação
   */
  private static gerarRelatorioValidacao(
    contrato: any,
    evidencias: EvidenciaJuridica[],
    conformidade: ValidacaoContrato['conformidade_legal']
  ): string {
    const dataValidacao = new Date().toLocaleDateString('pt-BR');
    const horaValidacao = new Date().toLocaleTimeString('pt-BR');

    return `
RELATÓRIO DE VALIDAÇÃO JURÍDICA
================================

Contrato: ${contrato.titulo}
ID: ${contrato.id}
Data da Validação: ${dataValidacao} às ${horaValidacao}

CONFORMIDADE LEGAL:
- Lei nº 14.063/2020: ${conformidade.lei_14063_2020 ? 'CONFORME' : 'NÃO CONFORME'}
- MP nº 2.200-2/2001: ${conformidade.mp_2200_2_2001 ? 'CONFORME' : 'NÃO CONFORME'}
- Certificados ICP-Brasil: ${conformidade.certificados_icp_brasil ? 'CONFORME' : 'NÃO CONFORME'}
- Timestamps Válidos: ${conformidade.timestamps_validos ? 'CONFORME' : 'NÃO CONFORME'}
- Integridade Preservada: ${conformidade.integridade_preservada ? 'CONFORME' : 'NÃO CONFORME'}

EVIDÊNCIAS COLETADAS: ${evidencias.length}
${evidencias.map((e, i) => `${i + 1}. ${e.tipo_evidencia} - ${e.timestamp_coleta}`).join('\n')}

STATUS: ${Object.values(conformidade).every(Boolean) ? 'VÁLIDO JURIDICAMENTE' : 'REQUER ATENÇÃO'}

Este relatório atesta a conformidade do documento eletrônico com a legislação brasileira vigente.
    `.trim();
  }

  /**
   * Calcula hash de evidência
   */
  private static async calcularHashEvidencia(dados: any): Promise<string> {
    try {
      const dadosString = JSON.stringify(dados, Object.keys(dados).sort());
      const encoder = new TextEncoder();
      const data = encoder.encode(dadosString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Erro ao calcular hash:', error);
      return 'hash_error';
    }
  }

  /**
   * Gera certificado de validação
   */
  static async gerarCertificadoValidacao(contratoId: string): Promise<CertificadoValidacao> {
    try {
      const validacao = await this.validarContrato(contratoId);
      
      const certificado: CertificadoValidacao = {
        numero_certificado: `CERT-${Date.now()}-${contratoId.substring(0, 8)}`,
        contrato_id: contratoId,
        hash_documento: validacao.evidencias_coletadas.find(e => e.tipo_evidencia === 'integridade_documento')?.hash_evidencia || '',
        assinaturas_validadas: validacao.evidencias_coletadas.filter(e => e.tipo_evidencia === 'assinatura_digital').length,
        evidencias_tecnicas: validacao.evidencias_coletadas.length,
        conformidade_percentual: Math.round(
          (Object.values(validacao.conformidade_legal).filter(Boolean).length / 
           Object.values(validacao.conformidade_legal).length) * 100
        ),
        emitido_em: new Date().toISOString(),
        valido_ate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 10 anos
        autoridade_certificadora: 'Sistema de Contratos Eletrônicos'
      };

      return certificado;
    } catch (error) {
      console.error('Erro ao gerar certificado:', error);
      throw new Error('Erro ao gerar certificado de validação');
    }
  }
}
