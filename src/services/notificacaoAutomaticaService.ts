import { supabase } from '@/integrations/supabase/client';
import { EmailService } from './emailService';
import { AuditoriaService } from './auditoriaService';

export interface AgendamentoLembrete {
  id?: string;
  contrato_id: string;
  tipo_lembrete: 'lembrete_24h' | 'lembrete_72h' | 'lembrete_semanal';
  agendado_para: string;
  enviado: boolean;
  enviado_em?: string;
  tentativas: number;
  criado_em: string;
}

/**
 * Serviço para gerenciar notificações automáticas
 * Agenda e envia lembretes baseados em regras de negócio
 */
export class NotificacaoAutomaticaService {

  /**
   * Agenda lembretes automáticos para um contrato
   */
  static async agendarLembretes(contratoId: string): Promise<void> {
    try {
      const agora = new Date();
      
      // Lembrete após 24 horas
      const lembrete24h = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
      
      // Lembrete após 72 horas
      const lembrete72h = new Date(agora.getTime() + 72 * 60 * 60 * 1000);
      
      // Lembrete semanal
      const lembreteSemanl = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);

      const lembretes: Omit<AgendamentoLembrete, 'id'>[] = [
        {
          contrato_id: contratoId,
          tipo_lembrete: 'lembrete_24h',
          agendado_para: lembrete24h.toISOString(),
          enviado: false,
          tentativas: 0,
          criado_em: agora.toISOString()
        },
        {
          contrato_id: contratoId,
          tipo_lembrete: 'lembrete_72h',
          agendado_para: lembrete72h.toISOString(),
          enviado: false,
          tentativas: 0,
          criado_em: agora.toISOString()
        },
        {
          contrato_id: contratoId,
          tipo_lembrete: 'lembrete_semanal',
          agendado_para: lembreteSemanl.toISOString(),
          enviado: false,
          tentativas: 0,
          criado_em: agora.toISOString()
        }
      ];

      // Salvar agendamentos (simulado - em produção usar tabela específica)
      console.log('Lembretes agendados para contrato:', contratoId, lembretes);

      // Registrar evento de auditoria
      await AuditoriaService.registrarEvento(
        contratoId,
        'lembretes_agendados',
        'Lembretes automáticos agendados',
        {
          total_lembretes: lembretes.length,
          tipos: lembretes.map(l => l.tipo_lembrete),
          agendamentos: lembretes.map(l => ({
            tipo: l.tipo_lembrete,
            agendado_para: l.agendado_para
          }))
        }
      );

    } catch (error) {
      console.error('Erro ao agendar lembretes:', error);
      throw new Error('Erro ao agendar lembretes automáticos');
    }
  }

  /**
   * Cancela lembretes pendentes para um contrato
   */
  static async cancelarLembretes(contratoId: string, motivo: string = 'contrato_finalizado'): Promise<void> {
    try {
      // Em produção, atualizar registros na tabela de agendamentos
      console.log('Lembretes cancelados para contrato:', contratoId, 'Motivo:', motivo);

      // Registrar evento de auditoria
      await AuditoriaService.registrarEvento(
        contratoId,
        'lembretes_cancelados',
        `Lembretes automáticos cancelados: ${motivo}`,
        { motivo }
      );

    } catch (error) {
      console.error('Erro ao cancelar lembretes:', error);
    }
  }

  /**
   * Processa lembretes pendentes (seria executado por um cron job)
   */
  static async processarLembretesPendentes(): Promise<void> {
    try {
      // Em produção, buscar da tabela de agendamentos
      const agora = new Date();
      
      console.log('Processando lembretes pendentes...', agora.toISOString());

      // Simular busca de lembretes pendentes
      const lembretesPendentes = await this.buscarLembretesPendentes();

      for (const lembrete of lembretesPendentes) {
        try {
          await this.enviarLembrete(lembrete);
        } catch (error) {
          console.error(`Erro ao enviar lembrete ${lembrete.id}:`, error);
          // Incrementar tentativas e reagendar se necessário
          await this.incrementarTentativas(lembrete.id!);
        }
      }

    } catch (error) {
      console.error('Erro ao processar lembretes pendentes:', error);
    }
  }

  /**
   * Busca lembretes que devem ser enviados
   */
  private static async buscarLembretesPendentes(): Promise<AgendamentoLembrete[]> {
    // Em produção, fazer query na tabela de agendamentos
    // Por enquanto, retornar array vazio
    return [];
  }

  /**
   * Envia um lembrete específico
   */
  private static async enviarLembrete(lembrete: AgendamentoLembrete): Promise<void> {
    try {
      // Buscar dados do contrato
      const { data: contrato, error } = await supabase
        .from('contratos_comerciais')
        .select('*')
        .eq('id', lembrete.contrato_id)
        .single();

      if (error || !contrato) {
        throw new Error('Contrato não encontrado');
      }

      // Verificar se ainda precisa de assinatura
      if (contrato.status !== 'aguardando_assinatura_externa') {
        console.log('Contrato não precisa mais de lembrete:', lembrete.contrato_id);
        await this.marcarLembreteComoCancelado(lembrete.id!);
        return;
      }

      // Enviar email de lembrete
      await EmailService.enviarLembreteAssinatura({
        contrato_id: contrato.id,
        titulo_contrato: contrato.titulo,
        destinatario_nome: contrato.assinante_externo_nome,
        destinatario_email: contrato.assinante_externo_email,
        tipo_notificacao: 'lembrete_assinatura',
        dados_adicionais: {
          tipo_lembrete: lembrete.tipo_lembrete,
          tentativa: lembrete.tentativas + 1
        }
      });

      // Marcar como enviado
      await this.marcarLembreteComoEnviado(lembrete.id!);

      console.log(`Lembrete ${lembrete.tipo_lembrete} enviado para contrato ${lembrete.contrato_id}`);

    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      throw error;
    }
  }

  /**
   * Marca lembrete como enviado
   */
  private static async marcarLembreteComoEnviado(lembreteId: string): Promise<void> {
    // Em produção, atualizar registro na tabela
    console.log('Lembrete marcado como enviado:', lembreteId);
  }

  /**
   * Marca lembrete como cancelado
   */
  private static async marcarLembreteComoCancelado(lembreteId: string): Promise<void> {
    // Em produção, atualizar registro na tabela
    console.log('Lembrete marcado como cancelado:', lembreteId);
  }

  /**
   * Incrementa contador de tentativas
   */
  private static async incrementarTentativas(lembreteId: string): Promise<void> {
    // Em produção, incrementar tentativas na tabela
    console.log('Tentativas incrementadas para lembrete:', lembreteId);
  }

  /**
   * Envia notificação quando contrato é finalizado
   */
  static async notificarFinalizacaoContrato(contratoId: string): Promise<void> {
    try {
      console.log('📧 Notificando finalização do contrato:', contratoId);

      // Buscar dados do contrato (incluindo contratos já concluídos)
      const { data: contrato, error } = await supabase
        .from('contratos_comerciais')
        .select('*')
        .eq('id', contratoId)
        .single();

      if (error || !contrato) {
        console.warn('Contrato não encontrado para notificação:', contratoId, error);
        // Não falhar a operação principal por erro de notificação
        return;
      }

      // Cancelar lembretes pendentes
      await this.cancelarLembretes(contratoId, 'contrato_finalizado');

      // Enviar notificação de finalização
      await EmailService.enviarNotificacaoContratoFinalizado({
        contrato_id: contrato.id,
        titulo_contrato: contrato.titulo,
        destinatario_nome: contrato.assinante_externo_nome,
        destinatario_email: contrato.assinante_externo_email,
        tipo_notificacao: 'contrato_finalizado'
      });

      console.log('Notificação de finalização enviada para contrato:', contratoId);

    } catch (error) {
      console.error('Erro ao notificar finalização:', error);
      throw error;
    }
  }

  /**
   * Configura processamento automático de lembretes
   * Em produção, seria configurado como um cron job ou função serverless
   */
  static configurarProcessamentoAutomatico(): void {
    // Processar lembretes a cada hora
    setInterval(async () => {
      try {
        await this.processarLembretesPendentes();
      } catch (error) {
        console.error('Erro no processamento automático:', error);
      }
    }, 60 * 60 * 1000); // 1 hora

    console.log('Processamento automático de lembretes configurado');
  }

  /**
   * Envia lembrete manual para um contrato específico
   */
  static async enviarLembreteManual(contratoId: string): Promise<void> {
    try {
      const { data: contrato, error } = await supabase
        .from('contratos_comerciais')
        .select('*')
        .eq('id', contratoId)
        .single();

      if (error || !contrato) {
        throw new Error('Contrato não encontrado');
      }

      if (contrato.status !== 'aguardando_assinatura_externa') {
        throw new Error('Contrato não está aguardando assinatura externa');
      }

      await EmailService.enviarLembreteAssinatura({
        contrato_id: contrato.id,
        titulo_contrato: contrato.titulo,
        destinatario_nome: contrato.assinante_externo_nome,
        destinatario_email: contrato.assinante_externo_email,
        tipo_notificacao: 'lembrete_assinatura',
        dados_adicionais: {
          tipo_lembrete: 'manual',
          enviado_por: 'usuario'
        }
      });

    } catch (error) {
      console.error('Erro ao enviar lembrete manual:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de notificações para um contrato
   */
  static async obterEstatisticasNotificacoes(contratoId: string): Promise<{
    total_emails_enviados: number;
    lembretes_enviados: number;
    ultimo_email: string | null;
    proximos_lembretes: AgendamentoLembrete[];
  }> {
    try {
      // Buscar logs de emails enviados
      const { data: logs, error } = await supabase
        .from('logs_auditoria_contratos_comerciais')
        .select('*')
        .eq('contrato_id', contratoId)
        .in('evento', ['email_assinatura_enviado', 'email_lembrete_enviado', 'email_finalizacao_enviado'])
        .order('timestamp_evento', { ascending: false });

      if (error) throw error;

      const totalEmails = logs?.length || 0;
      const lembretes = logs?.filter(log => log.evento === 'email_lembrete_enviado').length || 0;
      const ultimoEmail = logs?.[0]?.timestamp_evento || null;

      // Em produção, buscar próximos lembretes da tabela de agendamentos
      const proximosLembretes: AgendamentoLembrete[] = [];

      return {
        total_emails_enviados: totalEmails,
        lembretes_enviados: lembretes,
        ultimo_email: ultimoEmail,
        proximos_lembretes: proximosLembretes
      };

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        total_emails_enviados: 0,
        lembretes_enviados: 0,
        ultimo_email: null,
        proximos_lembretes: []
      };
    }
  }
}
