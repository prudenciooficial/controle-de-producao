import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle, XCircle, Search } from 'lucide-react';
import { EmailRealService } from '@/services/emailRealService';
import { diagnosticarEmail, formatarResultadosDiagnostico } from '@/utils/emailDiagnostic';

interface TesteEmailProps {
  className?: string;
}

export function TesteEmail({ className }: TesteEmailProps) {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem: string;
    messageId?: string;
  } | null>(null);
  const [diagnostico, setDiagnostico] = useState<string | null>(null);

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
      const response = await EmailRealService.enviarEmail({
        to: email,
        toName: nome,
        subject: 'Teste de Email - Sistema de Contratos',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0ea5e9;">🧪 Teste de Email</h2>
            <p>Olá, <strong>${nome}</strong>!</p>
            <p>Este é um email de teste do sistema de contratos.</p>
            <p>Se você recebeu este email, significa que a configuração está funcionando corretamente!</p>
            <hr style="margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Email enviado em: ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        `,
        text: `
Teste de Email - Sistema de Contratos

Olá, ${nome}!

Este é um email de teste do sistema de contratos.
Se você recebeu este email, significa que a configuração está funcionando corretamente!

Email enviado em: ${new Date().toLocaleString('pt-BR')}
        `.trim()
      });

      if (response.success) {
        setResultado({
          sucesso: true,
          mensagem: 'Email de teste enviado com sucesso!',
          messageId: response.messageId
        });
      } else {
        setResultado({
          sucesso: false,
          mensagem: response.error || 'Erro desconhecido ao enviar email'
        });
      }

    } catch (error) {
      console.error('Erro no teste de email:', error);
      setResultado({
        sucesso: false,
        mensagem: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setEnviando(false);
    }
  };

  const executarDiagnostico = async () => {
    setDiagnosticando(true);
    setDiagnostico(null);

    try {
      console.log('🔍 Iniciando diagnóstico de email...');
      const resultados = await diagnosticarEmail();
      const relatorio = formatarResultadosDiagnostico(resultados);
      setDiagnostico(relatorio);
      console.log('📊 Diagnóstico concluído:', resultados);
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      setDiagnostico(`❌ Erro no diagnóstico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setDiagnosticando(false);
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

          <Button
            onClick={executarDiagnostico}
            disabled={diagnosticando}
            variant="outline"
            className="w-full"
          >
            {diagnosticando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Diagnosticando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Diagnosticar Configuração
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

        {diagnostico && (
          <Alert className="border-blue-200 bg-blue-50">
            <Search className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="font-medium mb-2">Resultado do Diagnóstico:</div>
              <pre className="text-xs bg-white p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                {diagnostico}
              </pre>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">ℹ️ Informações:</h4>
          <ul className="space-y-1 text-xs">
            <li>• Este teste usa a mesma configuração dos emails de contrato</li>
            <li>• Verifique a caixa de entrada e spam do email de destino</li>
            <li>• Se o teste falhar, verifique as configurações em emailConfig.ts</li>
            <li>• Logs detalhados estão disponíveis no console do navegador</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
