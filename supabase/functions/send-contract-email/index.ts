
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContractEmailRequest {
  contratoId: string;
  tipoEmail: 'assinatura_externa' | 'contrato_concluido';
  destinatario: string;
  nomeDestinatario: string;
  numeroContrato: string;
  token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { contratoId, tipoEmail, destinatario, nomeDestinatario, numeroContrato, token }: ContractEmailRequest = await req.json();

    let emailResponse;

    if (tipoEmail === 'assinatura_externa') {
      // E-mail para assinatura externa com token
      const linkAssinatura = `${Deno.env.get('SITE_URL') || 'http://localhost:8080'}/assinatura/${contratoId}?token=${token}`;
      
      emailResponse = await resend.emails.send({
        from: "Contratos <onboarding@resend.dev>",
        to: [destinatario],
        subject: `Assinatura Eletrônica - Contrato ${numeroContrato}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin-bottom: 10px;">Solicitação de Assinatura Eletrônica</h1>
              <p style="color: #666; font-size: 16px;">Contrato ${numeroContrato}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0;"><strong>Prezado(a) ${nomeDestinatario},</strong></p>
              <p style="margin: 0 0 10px 0;">Você foi convidado(a) para assinar digitalmente o contrato ${numeroContrato}.</p>
              <p style="margin: 0;"><strong>Código de Verificação:</strong> <span style="background: #007bff; color: white; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 18px; font-weight: bold;">${token}</span></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${linkAssinatura}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Acessar e Assinar Contrato
              </a>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #856404;">Instruções Importantes:</h3>
              <ol style="margin: 0; padding-left: 20px; color: #856404;">
                <li>Clique no link acima para acessar o documento</li>
                <li>Insira o código de verificação de 6 dígitos fornecido neste e-mail</li>
                <li>Leia o contrato na íntegra</li>
                <li>Clique em "Assinar Documento" para finalizar</li>
              </ol>
            </div>
            
            <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #17a2b8; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #0c5460;">Segurança:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
                <li>Este código é único e tem validade de 24 horas</li>
                <li>Sua assinatura será registrada com data, hora e IP</li>
                <li>O documento possui certificação digital</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 12px;">
                Este e-mail foi enviado automaticamente pelo Sistema de Gestão Comercial.<br/>
                Se você não solicitou esta assinatura, entre em contato conosco.
              </p>
            </div>
          </div>
        `,
      });
    } else if (tipoEmail === 'contrato_concluido') {
      // E-mail de notificação de contrato concluído
      const linkContrato = `${Deno.env.get('SITE_URL') || 'http://localhost:8080'}/print/contrato/${contratoId}`;
      
      emailResponse = await resend.emails.send({
        from: "Contratos <onboarding@resend.dev>",
        to: [destinatario],
        subject: `Contrato Concluído - ${numeroContrato}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #28a745; margin-bottom: 10px;">✓ Contrato Concluído</h1>
              <p style="color: #666; font-size: 16px;">Contrato ${numeroContrato}</p>
            </div>
            
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0;"><strong>Prezado(a) ${nomeDestinatario},</strong></p>
              <p style="margin: 0;">O contrato ${numeroContrato} foi assinado por todas as partes e está oficialmente concluído!</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${linkContrato}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Baixar Contrato Final
              </a>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Informações do Contrato:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #555;">
                <li>Número: ${numeroContrato}</li>
                <li>Status: Concluído e Assinado</li>
                <li>Data de Conclusão: ${new Date().toLocaleDateString('pt-BR')}</li>
                <li>Validade Jurídica: Conforme Lei 14.063/2020</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 12px;">
                Guarde este documento em local seguro. Ele possui validade jurídica plena.<br/>
                Sistema de Gestão Comercial - Assinaturas Eletrônicas
              </p>
            </div>
          </div>
        `,
      });
    }

    // Registrar o envio no log de auditoria
    await supabase.from('logs_auditoria_contratos').insert({
      contrato_id: contratoId,
      tipo_evento: tipoEmail === 'assinatura_externa' ? 'email_externo_enviado' : 'email_conclusao_enviado',
      descricao_evento: `E-mail de ${tipoEmail} enviado para ${destinatario}`,
      dados_evento: { 
        destinatario, 
        numeroContrato, 
        token: token || null,
        emailId: emailResponse?.data?.id 
      },
      endereco_ip: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown',
      agente_usuario: req.headers.get('user-agent') || 'system'
    });

    console.log("E-mail enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse?.data?.id,
      message: 'E-mail enviado com sucesso' 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    
  } catch (error: any) {
    console.error("Erro ao enviar e-mail:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
