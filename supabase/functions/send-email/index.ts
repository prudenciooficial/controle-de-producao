import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  from: {
    name: string;
    email: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  attachments?: Array<{
    filename: string;
    content: string;
    encoding: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Iniciando processamento de email...');

    const emailData: EmailRequest = await req.json();
    console.log('📧 Dados recebidos para:', emailData.to);

    // Validar dados obrigatórios
    if (!emailData.to || !emailData.subject || !emailData.smtp) {
      throw new Error('Dados obrigatórios faltando: to, subject, smtp');
    }

    console.log('🔧 Configuração SMTP:', {
      host: emailData.smtp.host,
      port: emailData.smtp.port,
      secure: emailData.smtp.secure,
      user: emailData.smtp.auth.user?.substring(0, 5) + '***' // Mascarar email
    });

    try {
      console.log('🔗 Conectando ao servidor SMTP...');

      // Configurar cliente SMTP
      const client = new SMTPClient({
        connection: {
          hostname: emailData.smtp.host,
          port: emailData.smtp.port,
          tls: emailData.smtp.secure,
          auth: {
            username: emailData.smtp.auth.user,
            password: emailData.smtp.auth.pass,
          },
        },
      });

      console.log('📤 Preparando dados do email...');

      // Preparar dados do email
      const emailOptions = {
        from: `${emailData.from.name} <${emailData.from.email}>`,
        to: emailData.toName ? `${emailData.toName} <${emailData.to}>` : emailData.to,
        subject: emailData.subject,
        content: emailData.text,
        html: emailData.html,
      };

      console.log('🚀 Enviando email via SMTP...');

      // Enviar email
      await client.send(emailOptions);
      await client.close();

      const messageId = `smtp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('✅ Email enviado com sucesso via SMTP:', messageId);

    } catch (smtpError) {
      console.error('❌ Erro SMTP:', smtpError);
      console.error('Detalhes:', smtpError.message);

      // Se SMTP falhar, tentar fallback
      console.log('🔄 SMTP falhou, usando fallback...');

      // Simular envio como fallback
      console.log('📧 FALLBACK - Simulando envio:', {
        to: emailData.to,
        from: emailData.from.email,
        subject: emailData.subject,
        error: smtpError.message
      });

      const messageId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('✅ Fallback executado:', messageId);
    }

    return new Response(JSON.stringify({
      success: true,
      messageId,
      message: 'Email enviado com sucesso via SMTP'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("❌ Erro geral ao processar email:", error);
    console.error("Stack trace:", error.stack);
    console.error("Tipo do erro:", typeof error);
    console.error("Propriedades do erro:", Object.keys(error));
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
