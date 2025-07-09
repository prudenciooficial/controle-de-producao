import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TesteEmailProps {
  className?: string;
}

export function TesteEmail({ className }: TesteEmailProps) {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem: string;
    messageId?: string;
  } | null>(null);

  const enviarEmailTeste = async () => {
    if (!email || !nome) {
      setResultado({
        sucesso: false,
        mensagem: 'Por favor, preencha todos os campos'
      });
      return;
    }

    setEnviando(true);
    setResultado(null);

    try {
      console.log('📧 Testando envio de email via Supabase Edge Function...');

      // Preparar dados para a Edge Function
      const emailData = {
        to: email,
        toName: nome,
        subject: 'Teste de Email - Sistema de Controle de Produção',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🧪 Teste de Email</h2>
            <p>Olá, <strong>${nome}</strong>!</p>
            <p>Este é um email de teste do Sistema de Controle de Produção.</p>
            <p>Se você recebeu este email, significa que a configuração está funcionando corretamente!</p>
            <hr style="margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Email enviado em: ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        `,
        text: `
Teste de Email - Sistema de Controle de Produção

Olá, ${nome}!

Este é um email de teste do Sistema de Controle de Produção.
Se você recebeu este email, significa que a configuração está funcionando corretamente!

Email enviado em: ${new Date().toLocaleString('pt-BR')}
        `.trim(),
        from: {
          name: 'Sistema de Controle de Produção',
          email: 'noreply@sistema.com'
        }
      };

      // Chamar Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailData
      });

      if (error) {
        console.error('❌ Erro na Edge Function:', error);
        setResultado({
          sucesso: false,
          mensagem: `Erro na Edge Function: ${error.message}`
        });
      } else {
        console.log('✅ Email enviado com sucesso:', data);
        setResultado({
          sucesso: true,
          mensagem: 'Email de teste enviado com sucesso!',
          messageId: data?.messageId || `test-${Date.now()}`
        });
      }

    } catch (error) {
      console.error('❌ Erro ao enviar email de teste:', error);
      setResultado({
        sucesso: false,
        mensagem: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setEnviando(false);
    }
  };



  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Teste de Email
        </CardTitle>
        <CardDescription>
          Teste a configuração de envio de emails do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Destinatário</Label>
            <Input
              id="nome"
              type="text"
              placeholder="Digite o nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={enviando}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email do Destinatário</Label>
            <Input
              id="email"
              type="email"
              placeholder="Digite o email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={enviando}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={enviarEmailTeste}
            disabled={enviando || !email || !nome}
            className="w-full"
          >
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Email de Teste
              </>
            )}
          </Button>


        </div>

        {resultado && (
          <Alert className={resultado.sucesso ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-center gap-2">
              {resultado.sucesso ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={resultado.sucesso ? 'text-green-800' : 'text-red-800'}>
                {resultado.mensagem}
                {resultado.messageId && (
                  <div className="mt-1 text-xs opacity-75">
                    ID: {resultado.messageId}
                  </div>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">ℹ️ Informações:</h4>
          <ul className="space-y-1 text-xs">
            <li>• Este teste usa a Supabase Edge Function para envio de emails</li>
            <li>• Verifique a caixa de entrada e spam do email de destino</li>
            <li>• Configure a variável RESEND_API_KEY no Supabase</li>
            <li>• Logs detalhados estão disponíveis no console do navegador</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
