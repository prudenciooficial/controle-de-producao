import { supabase } from '@/integrations/supabase/client';
import { AuditoriaService } from './auditoriaService';
import { EmailService } from './emailService';
import { NotificacaoAutomaticaService } from './notificacaoAutomaticaService';
import { ValidacaoJuridicaService } from './validacaoJuridicaService';

export interface TokenVerificacao {
  id: string;
  contrato_id: string;
  token: string;
  email_destinatario: string;
  valido_ate: string;
  usado_em?: string;
  ip_uso?: string;
  user_agent_uso?: string;
  criado_em: string;
}

export interface ResultadoValidacaoToken {
  valido: boolean;
  token?: TokenVerificacao;
  erro?: string;
  motivo?: 'token_invalido' | 'token_expirado' | 'token_ja_usado' | 'contrato_nao_encontrado';
}

export interface DadosEnvioEmail {
  contratoId: string;
  emailDestinatario: string;
  nomeDestinatario: string;
  tituloContrato: string;
  linkAssinatura: string;
  token: string;
  validoAte: string;
}

/**
 * Serviço para gerenciar tokens de verificação para assinatura externa
 */
export class TokenVerificacaoService {
  
  /**
   * Gera um token de 6 dígitos único
   */
  static gerarToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Cria um novo token de verificação para um contrato
   */
  static async criarToken(contratoId: string, emailDestinatario: string): Promise<string> {
    try {
      // Invalidar tokens anteriores para o mesmo contrato
      await this.invalidarTokensAnteriores(contratoId);

      // Gerar novo token
      const token = this.gerarToken();
      const validoAte = new Date();
      validoAte.setHours(validoAte.getHours() + 24); // Válido por 24 horas

      // Inserir no banco
      const { error } = await supabase
        .from('tokens_verificacao_contratos')
        .insert([{
          contrato_id: contratoId,
          token,
          email_destinatario: emailDestinatario,
          valido_ate: validoAte.toISOString()
        }]);

      if (error) throw error;

      // Registrar evento de auditoria
      await AuditoriaService.registrarEnvioToken(contratoId, emailDestinatario, token);

      // Agendar lembretes automáticos
      await NotificacaoAutomaticaService.agendarLembretes(contratoId);

      return token;
    } catch (error) {
      console.error('Erro ao criar token:', error);
      throw new Error('Erro ao gerar token de verificação');
    }
  }

  /**
   * Invalida tokens anteriores para um contrato
   */
  static async invalidarTokensAnteriores(contratoId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tokens_verificacao_contratos')
        .update({ usado_em: new Date().toISOString() })
        .eq('contrato_id', contratoId)
        .is('usado_em', null);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao invalidar tokens anteriores:', error);
    }
  }

  /**
   * Valida um token de verificação
   */
  static async validarToken(
    contratoId: string, 
    token: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<ResultadoValidacaoToken> {
    try {
      // Buscar token no banco
      const { data: tokenData, error } = await supabase
        .from('tokens_verificacao_contratos')
        .select('*')
        .eq('contrato_id', contratoId)
        .eq('token', token)
        .single();

      if (error || !tokenData) {
        await AuditoriaService.registrarValidacaoToken(contratoId, token, false, 'Token não encontrado');
        return {
          valido: false,
          erro: 'Token não encontrado',
          motivo: 'token_invalido'
        };
      }

      // Verificar se já foi usado
      if (tokenData.usado_em) {
        await AuditoriaService.registrarValidacaoToken(contratoId, token, false, 'Token já foi utilizado');
        return {
          valido: false,
          erro: 'Token já foi utilizado',
          motivo: 'token_ja_usado'
        };
      }

      // Verificar se expirou
      const agora = new Date();
      const validoAte = new Date(tokenData.valido_ate);
      if (agora > validoAte) {
        await AuditoriaService.registrarValidacaoToken(contratoId, token, false, 'Token expirado');
        return {
          valido: false,
          erro: 'Token expirado',
          motivo: 'token_expirado'
        };
      }

      // Marcar token como usado
      await supabase
        .from('tokens_verificacao_contratos')
        .update({
          usado_em: agora.toISOString(),
          ip_uso: ipAddress,
          user_agent_uso: userAgent
        })
        .eq('id', tokenData.id);

      // Registrar validação bem-sucedida
      await AuditoriaService.registrarValidacaoToken(contratoId, token, true);

      return {
        valido: true,
        token: tokenData
      };

    } catch (error) {
      console.error('Erro ao validar token:', error);
      return {
        valido: false,
        erro: 'Erro interno do servidor',
        motivo: 'token_invalido'
      };
    }
  }

  /**
   * Busca contrato por ID para assinatura externa
   */
  static async buscarContratoPorId(contratoId: string) {
    try {
      const { data, error } = await supabase
        .from('contratos_comerciais')
        .select(`
          *,
          modelo:modelos_contratos(nome, descricao)
        `)
        .eq('id', contratoId)
        .eq('status', 'aguardando_assinatura_externa')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar contrato:', error);
      return null;
    }
  }

  /**
   * Registra assinatura externa
   */
  static async registrarAssinaturaExterna(
    contratoId: string,
    dadosAssinatura: {
      signatario_nome: string;
      signatario_email: string;
      signatario_documento: string;
      ip_address: string;
      user_agent: string;
      token_validado: string;
    }
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();

      // Registrar assinatura
      const { error: assinaturaError } = await supabase
        .from('assinaturas_contratos_comerciais')
        .insert([{
          contrato_id: contratoId,
          tipo: 'externa_simples',
          signatario_nome: dadosAssinatura.signatario_nome,
          signatario_email: dadosAssinatura.signatario_email,
          signatario_documento: dadosAssinatura.signatario_documento,
          ip_address: dadosAssinatura.ip_address,
          user_agent: dadosAssinatura.user_agent,
          timestamp_assinatura: timestamp,
          status: 'assinado',
          assinado_em: timestamp,
          token_verificacao: dadosAssinatura.token_validado,
          token_validado_em: timestamp
        }]);

      if (assinaturaError) throw assinaturaError;

      // Atualizar status do contrato
      const { error: contratoError } = await supabase
        .from('contratos_comerciais')
        .update({
          status: 'concluido',
          finalizado_em: timestamp,
          atualizado_em: timestamp
        })
        .eq('id', contratoId);

      if (contratoError) throw contratoError;

      // Coletar evidência jurídica da assinatura externa
      await ValidacaoJuridicaService.coletarEvidenciaTokenVerificacao(contratoId, {
        token_verificacao: token,
        criado_em: tokenData.criado_em,
        valido_ate: tokenData.valido_ate,
        usado_em: timestamp,
        ip_uso: evidencias.ip_address,
        user_agent_uso: evidencias.user_agent,
        email_destinatario: tokenData.email_destinatario,
        signatario_nome: dadosAssinatura.signatario_nome
      });

      // Notificar finalização e cancelar lembretes
      await NotificacaoAutomaticaService.notificarFinalizacaoContrato(contratoId);

      // Registrar log de auditoria
      await supabase
        .from('logs_auditoria_contratos_comerciais')
        .insert([{
          contrato_id: contratoId,
          evento: 'assinado_externamente',
          descricao: `Contrato assinado por ${dadosAssinatura.signatario_nome} via token de verificação`,
          dados_evento: {
            signatario: dadosAssinatura.signatario_nome,
            email: dadosAssinatura.signatario_email,
            documento: dadosAssinatura.signatario_documento,
            token_usado: dadosAssinatura.token_validado,
            ip: dadosAssinatura.ip_address,
            user_agent: dadosAssinatura.user_agent
          },
          ip_address: dadosAssinatura.ip_address,
          user_agent: dadosAssinatura.user_agent,
          timestamp_evento: timestamp
        }]);

    } catch (error) {
      console.error('Erro ao registrar assinatura externa:', error);
      throw new Error('Erro ao registrar assinatura');
    }
  }

  /**
   * Envia email com token de verificação
   */
  static async enviarEmailVerificacao(dados: DadosEnvioEmail): Promise<void> {
    try {
      // Usar o serviço de email integrado
      await EmailService.enviarEmailAssinaturaExterna({
        contrato_id: dados.contratoId,
        titulo_contrato: dados.tituloContrato,
        destinatario_nome: dados.nomeDestinatario,
        destinatario_email: dados.emailDestinatario,
        token_verificacao: dados.token,
        link_assinatura: dados.linkAssinatura,
        valido_ate: dados.validoAte,
        empresa_nome: 'Sua Empresa', // Configurar conforme necessário
        responsavel_nome: 'Sistema' // Configurar conforme necessário
      });

    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw new Error('Erro ao enviar email de verificação');
    }
  }

  /**
   * Obtém endereço IP do cliente
   */
  static async obterIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '127.0.0.1';
    }
  }

  /**
   * Gera link de assinatura externa
   */
  static gerarLinkAssinatura(contratoId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/assinatura-externa/${contratoId}`;
  }

  /**
   * Formata data para exibição
   */
  static formatarDataExpiracao(dataString: string): string {
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Calcula tempo restante para expiração
   */
  static calcularTempoRestante(validoAte: string): {
    expirado: boolean;
    horas: number;
    minutos: number;
    texto: string;
  } {
    const agora = new Date();
    const expiracao = new Date(validoAte);
    const diffMs = expiracao.getTime() - agora.getTime();

    if (diffMs <= 0) {
      return {
        expirado: true,
        horas: 0,
        minutos: 0,
        texto: 'Expirado'
      };
    }

    const horas = Math.floor(diffMs / (1000 * 60 * 60));
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let texto = '';
    if (horas > 0) {
      texto = `${horas}h ${minutos}m restantes`;
    } else {
      texto = `${minutos}m restantes`;
    }

    return {
      expirado: false,
      horas,
      minutos,
      texto
    };
  }
}
