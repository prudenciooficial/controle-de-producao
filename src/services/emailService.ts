import { supabase } from '@/integrations/supabase/client';
import { AuditoriaService } from './auditoriaService';
import { EmailRealService } from './emailRealService';

export interface DadosEmail {
  destinatario: string;
  nome_destinatario: string;
  assunto: string;
  conteudo_html: string;
  conteudo_texto: string;
  dados_contexto?: Record<string, any>;
}

export interface EmailAssinaturaExterna {
  contrato_id: string;
  titulo_contrato: string;
  destinatario_nome: string;
  destinatario_email: string;
  token_verificacao: string;
  link_assinatura: string;
  valido_ate: string;
  empresa_nome?: string;
  responsavel_nome?: string;
}

export interface EmailNotificacao {
  contrato_id: string;
  titulo_contrato: string;
  destinatario_nome: string;
  destinatario_email: string;
  tipo_notificacao: 'assinatura_concluida' | 'contrato_finalizado' | 'lembrete_assinatura';
  dados_adicionais?: Record<string, any>;
}

/**
 * Serviço completo de notificações por email
 * Integrado com Supabase Edge Functions para envio real de emails
 */
export class EmailService {

  /**
   * Envia email para assinatura externa com token
   */
  static async enviarEmailAssinaturaExterna(dados: EmailAssinaturaExterna): Promise<void> {
    try {
      const conteudoHtml = this.gerarTemplateAssinaturaExterna(dados);
      const conteudoTexto = this.gerarTextoAssinaturaExterna(dados);

      const emailData: DadosEmail = {
        destinatario: dados.destinatario_email,
        nome_destinatario: dados.destinatario_nome,
        assunto: `Assinatura de Contrato - ${dados.titulo_contrato}`,
        conteudo_html: conteudoHtml,
        conteudo_texto: conteudoTexto,
        dados_contexto: {
          tipo: 'assinatura_externa',
          contrato_id: dados.contrato_id,
          token: dados.token_verificacao
        }
      };

      await this.enviarEmail(emailData);

      // Registrar evento de auditoria
      await AuditoriaService.registrarEvento(
        dados.contrato_id,
        'email_assinatura_enviado',
        `Email de assinatura enviado para ${dados.destinatario_email}`,
        {
          destinatario: dados.destinatario_email,
          token: dados.token_verificacao,
          valido_ate: dados.valido_ate,
          link: dados.link_assinatura
        }
      );

    } catch (error) {
      console.error('Erro ao enviar email de assinatura:', error);
      throw new Error('Erro ao enviar email de assinatura');
    }
  }

  /**
   * Envia notificação de contrato finalizado
   */
  static async enviarNotificacaoContratoFinalizado(dados: EmailNotificacao): Promise<void> {
    try {
      const conteudoHtml = this.gerarTemplateContratoFinalizado(dados);
      const conteudoTexto = this.gerarTextoContratoFinalizado(dados);

      const emailData: DadosEmail = {
        destinatario: dados.destinatario_email,
        nome_destinatario: dados.destinatario_nome,
        assunto: `Contrato Finalizado - ${dados.titulo_contrato}`,
        conteudo_html: conteudoHtml,
        conteudo_texto: conteudoTexto,
        dados_contexto: {
          tipo: 'contrato_finalizado',
          contrato_id: dados.contrato_id
        }
      };

      await this.enviarEmail(emailData);

      // Registrar evento de auditoria
      await AuditoriaService.registrarEvento(
        dados.contrato_id,
        'email_finalizacao_enviado',
        `Email de finalização enviado para ${dados.destinatario_email}`,
        { destinatario: dados.destinatario_email }
      );

    } catch (error) {
      console.error('Erro ao enviar notificação de finalização:', error);
      throw new Error('Erro ao enviar notificação de finalização');
    }
  }

  /**
   * Envia lembrete de assinatura pendente
   */
  static async enviarLembreteAssinatura(dados: EmailNotificacao): Promise<void> {
    try {
      const conteudoHtml = this.gerarTemplateLembrete(dados);
      const conteudoTexto = this.gerarTextoLembrete(dados);

      const emailData: DadosEmail = {
        destinatario: dados.destinatario_email,
        nome_destinatario: dados.destinatario_nome,
        assunto: `Lembrete: Assinatura Pendente - ${dados.titulo_contrato}`,
        conteudo_html: conteudoHtml,
        conteudo_texto: conteudoTexto,
        dados_contexto: {
          tipo: 'lembrete_assinatura',
          contrato_id: dados.contrato_id
        }
      };

      await this.enviarEmail(emailData);

      // Registrar evento de auditoria
      await AuditoriaService.registrarEvento(
        dados.contrato_id,
        'email_lembrete_enviado',
        `Email de lembrete enviado para ${dados.destinatario_email}`,
        { destinatario: dados.destinatario_email }
      );

    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      throw new Error('Erro ao enviar lembrete');
    }
  }

  /**
   * Função principal para envio de email
   */
  private static async enviarEmail(dados: DadosEmail): Promise<void> {
    try {
      console.log('📧 Enviando email real para:', dados.destinatario);

      // Usar o serviço de email real
      const resultado = await EmailRealService.enviarEmail({
        to: dados.destinatario,
        toName: dados.nome_destinatario,
        subject: dados.assunto,
        html: dados.conteudo_html,
        text: dados.conteudo_texto
      });

      if (!resultado.success) {
        throw new Error(resultado.error || 'Erro desconhecido no envio de email');
      }

      console.log('✅ Email enviado com sucesso:', resultado.messageId);

    } catch (error) {
      console.error('❌ Erro no envio de email:', error);
      throw error;
    }
  }

  /**
   * Gera template HTML para email de assinatura externa
   */
  private static gerarTemplateAssinaturaExterna(dados: EmailAssinaturaExterna): string {
    const dataExpiracao = new Date(dados.valido_ate).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Assinatura de Contrato</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #2563eb; margin: 0; font-size: 24px; }
            .content { margin-bottom: 30px; }
            .token-box { background: #f8fafc; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .token { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: monospace; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
            .info-box { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Assinatura Eletrônica</h1>
                <p>Solicitação de Assinatura de Contrato</p>
            </div>
            
            <div class="content">
                <p>Olá, <strong>${dados.destinatario_nome}</strong>!</p>
                
                <p>Você foi convidado(a) para assinar eletronicamente o seguinte contrato:</p>
                
                <div class="info-box">
                    <h3 style="margin-top: 0; color: #0ea5e9;">📄 ${dados.titulo_contrato}</h3>
                    ${dados.responsavel_nome ? `<p><strong>Responsável:</strong> ${dados.responsavel_nome}</p>` : ''}
                    ${dados.empresa_nome ? `<p><strong>Empresa:</strong> ${dados.empresa_nome}</p>` : ''}
                </div>
                
                <h3>🔑 Código de Verificação</h3>
                <p>Para acessar e assinar o contrato, utilize o código de verificação abaixo:</p>
                
                <div class="token-box">
                    <div class="token">${dados.token_verificacao}</div>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">
                        Código válido até: ${dataExpiracao}
                    </p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${dados.link_assinatura}" class="button">
                        ✍️ Acessar e Assinar Contrato
                    </a>
                </div>
                
                <div class="warning">
                    <h4 style="margin-top: 0;">⚠️ Instruções Importantes:</h4>
                    <ul style="margin-bottom: 0;">
                        <li>Este código é válido por 24 horas</li>
                        <li>Use apenas o código fornecido neste email</li>
                        <li>Não compartilhe este código com terceiros</li>
                        <li>Em caso de dúvidas, entre em contato conosco</li>
                    </ul>
                </div>
                
                <h3>📋 Como Assinar:</h3>
                <ol>
                    <li>Clique no botão "Acessar e Assinar Contrato" acima</li>
                    <li>Digite o código de verificação: <strong>${dados.token_verificacao}</strong></li>
                    <li>Leia o contrato completo</li>
                    <li>Confirme sua assinatura eletrônica</li>
                </ol>
            </div>
            
            <div class="footer">
                <p>Este é um email automático do sistema de contratos eletrônicos.</p>
                <p>A assinatura eletrônica tem validade jurídica conforme a Lei nº 14.063/2020.</p>
                <p>Em caso de dúvidas, entre em contato conosco.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Gera versão texto do email de assinatura externa
   */
  private static gerarTextoAssinaturaExterna(dados: EmailAssinaturaExterna): string {
    const dataExpiracao = new Date(dados.valido_ate).toLocaleDateString('pt-BR');
    
    return `
ASSINATURA ELETRÔNICA - ${dados.titulo_contrato}

Olá, ${dados.destinatario_nome}!

Você foi convidado(a) para assinar eletronicamente o contrato: ${dados.titulo_contrato}

CÓDIGO DE VERIFICAÇÃO: ${dados.token_verificacao}
Válido até: ${dataExpiracao}

Para assinar:
1. Acesse: ${dados.link_assinatura}
2. Digite o código: ${dados.token_verificacao}
3. Leia e confirme a assinatura

IMPORTANTE:
- Este código é válido por 24 horas
- Não compartilhe com terceiros
- Em caso de dúvidas, entre em contato

Este email é automático do sistema de contratos eletrônicos.
    `.trim();
  }

  /**
   * Gera template para contrato finalizado
   */
  private static gerarTemplateContratoFinalizado(dados: EmailNotificacao): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Contrato Finalizado</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #10b981; margin: 0; font-size: 24px; }
            .success-box { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Contrato Finalizado</h1>
            </div>
            
            <div class="success-box">
                <h2 style="color: #10b981; margin-top: 0;">🎉 Parabéns!</h2>
                <p>O contrato <strong>"${dados.titulo_contrato}"</strong> foi finalizado com sucesso!</p>
                <p>Todas as assinaturas foram coletadas e o documento está juridicamente válido.</p>
            </div>
            
            <p>Olá, <strong>${dados.destinatario_nome}</strong>!</p>
            
            <p>Informamos que o processo de assinatura do contrato foi concluído com êxito. O documento agora possui validade jurídica plena.</p>
            
            <p>Uma cópia do contrato assinado estará disponível em breve para download.</p>
            
            <div class="footer">
                <p>Este é um email automático do sistema de contratos eletrônicos.</p>
                <p>Obrigado por utilizar nossos serviços!</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Gera versão texto para contrato finalizado
   */
  private static gerarTextoContratoFinalizado(dados: EmailNotificacao): string {
    return `
CONTRATO FINALIZADO - ${dados.titulo_contrato}

Olá, ${dados.destinatario_nome}!

Parabéns! O contrato "${dados.titulo_contrato}" foi finalizado com sucesso.

Todas as assinaturas foram coletadas e o documento possui validade jurídica plena.

Uma cópia do contrato assinado estará disponível em breve.

Obrigado por utilizar nossos serviços!
    `.trim();
  }

  /**
   * Gera template para lembrete
   */
  private static gerarTemplateLembrete(dados: EmailNotificacao): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Lembrete de Assinatura</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #f59e0b; margin: 0; font-size: 24px; }
            .reminder-box { background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⏰ Lembrete de Assinatura</h1>
            </div>
            
            <div class="reminder-box">
                <h3 style="color: #f59e0b; margin-top: 0;">📋 Assinatura Pendente</h3>
                <p>O contrato <strong>"${dados.titulo_contrato}"</strong> ainda está aguardando sua assinatura.</p>
            </div>
            
            <p>Olá, <strong>${dados.destinatario_nome}</strong>!</p>
            
            <p>Este é um lembrete amigável de que você possui um contrato aguardando assinatura eletrônica.</p>
            
            <p>Para evitar atrasos no processo, pedimos que realize a assinatura o quanto antes.</p>
            
            <p>Se você já recebeu o código de verificação por email, utilize-o para acessar e assinar o contrato.</p>
            
            <p>Em caso de dúvidas ou se não recebeu o código, entre em contato conosco.</p>
            
            <div class="footer">
                <p>Este é um email automático do sistema de contratos eletrônicos.</p>
                <p>Agradecemos sua atenção!</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Gera versão texto para lembrete
   */
  private static gerarTextoLembrete(dados: EmailNotificacao): string {
    return `
LEMBRETE - ASSINATURA PENDENTE

Olá, ${dados.destinatario_nome}!

Este é um lembrete de que o contrato "${dados.titulo_contrato}" ainda está aguardando sua assinatura eletrônica.

Para evitar atrasos, pedimos que realize a assinatura o quanto antes.

Se você já recebeu o código de verificação, utilize-o para acessar o contrato.

Em caso de dúvidas, entre em contato conosco.

Agradecemos sua atenção!
    `.trim();
  }
}
