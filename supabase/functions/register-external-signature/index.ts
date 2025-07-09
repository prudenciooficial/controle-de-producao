import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExternalSignatureRequest {
  contratoId: string;
  dadosAssinatura: {
    signatario_nome: string;
    signatario_email: string;
    signatario_documento: string;
    ip_address: string;
    user_agent: string;
    token_validado: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Usar service role key para bypassar RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contratoId, dadosAssinatura }: ExternalSignatureRequest = await req.json();
    const timestamp = new Date().toISOString();

    console.log('🔐 Registrando assinatura externa para contrato:', contratoId);

    // 1. Registrar assinatura
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

    if (assinaturaError) {
      console.error('Erro ao registrar assinatura:', assinaturaError);
      throw assinaturaError;
    }

    // 2. Atualizar status do contrato
    const { error: contratoError } = await supabase
      .from('contratos_comerciais')
      .update({
        status: 'concluido',
        finalizado_em: timestamp,
        atualizado_em: timestamp
      })
      .eq('id', contratoId);

    if (contratoError) {
      console.error('Erro ao atualizar contrato:', contratoError);
      throw contratoError;
    }

    // 3. Registrar log de auditoria
    try {
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
          usuario_id: null, // Assinatura externa não tem usuário autenticado
          ip_address: dadosAssinatura.ip_address,
          user_agent: dadosAssinatura.user_agent,
          timestamp_evento: timestamp
        }]);
    } catch (auditoriaError) {
      console.warn('Erro ao registrar auditoria (não crítico):', auditoriaError);
    }

    // 4. Registrar evidência jurídica
    try {
      // Buscar dados do token para evidências
      const { data: tokenData } = await supabase
        .from('tokens_verificacao_contratos')
        .select('*')
        .eq('token', dadosAssinatura.token_validado)
        .single();

      if (tokenData) {
        // Calcular hash da evidência
        const evidenciaData = {
          token_verificacao: dadosAssinatura.token_validado,
          criado_em: tokenData.criado_em,
          valido_ate: tokenData.valido_ate,
          usado_em: timestamp,
          ip_uso: dadosAssinatura.ip_address,
          user_agent_uso: dadosAssinatura.user_agent,
          email_destinatario: tokenData.email_destinatario,
          signatario_nome: dadosAssinatura.signatario_nome
        };

        const hashEvidencia = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(JSON.stringify(evidenciaData))
        );
        const hashHex = Array.from(new Uint8Array(hashEvidencia))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        await supabase
          .from('evidencias_juridicas_contratos')
          .insert([{
            contrato_id: contratoId,
            tipo_evidencia: 'token_verificacao',
            dados_evidencia: {
              token: {
                codigo: dadosAssinatura.token_validado,
                gerado_em: tokenData.criado_em,
                valido_ate: tokenData.valido_ate,
                usado_em: timestamp
              },
              validacao: {
                ip_validacao: dadosAssinatura.ip_address,
                user_agent: dadosAssinatura.user_agent,
                email_verificado: tokenData.email_destinatario
              },
              contexto: {
                signatario: dadosAssinatura.signatario_nome,
                metodo_verificacao: 'email_token'
              }
            },
            hash_evidencia: hashHex,
            timestamp_coleta: timestamp,
            valida: true
          }]);

        console.log('✅ Evidência jurídica registrada');
      }
    } catch (evidenciaError) {
      console.warn('Erro ao registrar evidência (não crítico):', evidenciaError);
    }

    console.log('✅ Assinatura externa registrada com sucesso');

    return new Response(JSON.stringify({
      success: true,
      message: 'Assinatura registrada com sucesso',
      contratoId,
      timestamp
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("❌ Erro ao registrar assinatura externa:", error);
    
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
