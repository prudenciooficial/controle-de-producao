/**
 * Utilitário para diagnóstico de configuração de email
 */

import { getActiveEmailConfig, validateEmailConfig } from '@/config/emailConfig';
import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticResult {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

/**
 * Executa diagnóstico completo da configuração de email
 */
export async function diagnosticarEmail(): Promise<DiagnosticResult[]> {
  const resultados: DiagnosticResult[] = [];

  // 1. Verificar configuração local
  try {
    const config = getActiveEmailConfig();
    resultados.push({
      step: 'Configuração Local',
      status: 'success',
      message: `Configuração ${config.provider} carregada com sucesso`,
      details: {
        provider: config.provider,
        host: config.smtp.host,
        port: config.smtp.port,
        from: config.from.email,
        enabled: config.enabled
      }
    });

    // Validar configuração
    const isValid = validateEmailConfig(config);
    if (!isValid) {
      resultados.push({
        step: 'Validação da Configuração',
        status: 'error',
        message: 'Configuração inválida - campos obrigatórios faltando'
      });
    } else {
      resultados.push({
        step: 'Validação da Configuração',
        status: 'success',
        message: 'Configuração válida'
      });
    }

  } catch (error) {
    resultados.push({
      step: 'Configuração Local',
      status: 'error',
      message: `Erro ao carregar configuração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    });
  }

  // 2. Verificar conectividade com Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      resultados.push({
        step: 'Conectividade Supabase',
        status: 'success',
        message: 'Conectado ao Supabase com sucesso',
        details: { userId: user.id }
      });
    } else {
      resultados.push({
        step: 'Conectividade Supabase',
        status: 'warning',
        message: 'Usuário não autenticado'
      });
    }
  } catch (error) {
    resultados.push({
      step: 'Conectividade Supabase',
      status: 'error',
      message: `Erro de conectividade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    });
  }

  // 3. Verificar Edge Function
  try {
    console.log('🔍 Testando Edge Function...');
    
    const testPayload = {
      to: 'teste@exemplo.com',
      subject: 'Teste de Diagnóstico',
      html: '<p>Teste</p>',
      text: 'Teste',
      from: { name: 'Teste', email: 'teste@exemplo.com' },
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: 'teste', pass: 'teste' }
      }
    };

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: testPayload
    });

    if (error) {
      resultados.push({
        step: 'Edge Function',
        status: 'error',
        message: `Erro na Edge Function: ${error.message}`,
        details: error
      });
    } else {
      resultados.push({
        step: 'Edge Function',
        status: 'success',
        message: 'Edge Function respondeu com sucesso',
        details: data
      });
    }

  } catch (error) {
    resultados.push({
      step: 'Edge Function',
      status: 'error',
      message: `Erro ao chamar Edge Function: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    });
  }

  // 4. Verificar variáveis de ambiente (simulado)
  resultados.push({
    step: 'Variáveis de Ambiente',
    status: 'warning',
    message: 'Verifique se RESEND_API_KEY está configurada no Supabase',
    details: {
      note: 'Esta verificação deve ser feita manualmente no dashboard do Supabase'
    }
  });

  return resultados;
}

/**
 * Formata resultados do diagnóstico para exibição
 */
export function formatarResultadosDiagnostico(resultados: DiagnosticResult[]): string {
  let output = '📊 DIAGNÓSTICO DE EMAIL\n';
  output += '========================\n\n';

  resultados.forEach((resultado, index) => {
    const icon = resultado.status === 'success' ? '✅' : 
                 resultado.status === 'warning' ? '⚠️' : '❌';
    
    output += `${index + 1}. ${icon} ${resultado.step}\n`;
    output += `   ${resultado.message}\n`;
    
    if (resultado.details) {
      output += `   Detalhes: ${JSON.stringify(resultado.details, null, 2)}\n`;
    }
    
    output += '\n';
  });

  return output;
}

/**
 * Executa teste rápido de conectividade
 */
export async function testeRapidoEmail(email: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const config = getActiveEmailConfig();
    
    // Simular envio (não enviar email real no diagnóstico)
    console.log('🧪 Teste rápido de email:', {
      to: email,
      config: config.provider,
      from: config.from.email
    });

    return {
      success: true,
      message: 'Configuração parece estar correta',
      details: {
        provider: config.provider,
        from: config.from.email,
        smtp_host: config.smtp.host
      }
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      details: error
    };
  }
}
