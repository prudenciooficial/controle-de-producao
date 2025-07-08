import React, { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, Settings, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function SMTPTester() {
  const [emailTeste, setEmailTeste] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [configuracao, setConfiguracao] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: 'marketing@nossagoma.com.br',
    pass: 'jwdb brja pkhb msee'
  });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const { toast } = useToast();

  const testarSMTP = async () => {
    if (!emailTeste) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Digite um email para teste.",
      });
      return;
    }

    setEnviando(true);
    setResultado(null);

    try {
      console.log('🧪 Testando SMTP diretamente...');
      
      const emailData = {
        to: emailTeste,
        toName: 'Teste SMTP',
        subject: 'Teste de Configuração SMTP - Nossa Goma',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Teste de Configuração SMTP</h2>
            <p>Este é um email de teste enviado via SMTP do Google Workspace.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              <p><strong>Servidor:</strong> ${configuracao.host}:${configuracao.port}</p>
              <p><strong>Remetente:</strong> ${configuracao.user}</p>
              <p><strong>Segurança:</strong> ${configuracao.secure ? 'SSL' : 'STARTTLS'}</p>
            </div>
            <p style="color: #666; font-size: 12px;">
              Se você recebeu este email, a configuração SMTP está funcionando corretamente!
            </p>
          </div>
        `,
        text: `Teste de Configuração SMTP\n\nData/Hora: ${new Date().toLocaleString('pt-BR')}\nServidor: ${configuracao.host}:${configuracao.port}\nRemetente: ${configuracao.user}`,
        from: {
          name: 'Sistema de Contratos - Nossa Goma',
          email: configuracao.user
        },
        smtp: {
          host: configuracao.host,
          port: configuracao.port,
          secure: configuracao.secure,
          auth: {
            user: configuracao.user,
            pass: configuracao.pass
          }
        }
      };

      console.log('📤 Enviando via Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailData
      });

      if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
      }

      setResultado({
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Teste enviado!",
        description: `Email de teste enviado para ${emailTeste}`,
      });

    } catch (error) {
      console.error('❌ Erro no teste SMTP:', error);
      
      setResultado({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      
      toast({
        variant: "destructive",
        title: "Erro no teste",
        description: "Verifique os logs no console para mais detalhes.",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Teste SMTP Real
        </CardTitle>
        <CardDescription>
          Teste direto da configuração SMTP do Google Workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuração SMTP Atual */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-3">Configuração SMTP Atual</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium">Servidor:</span> {configuracao.host}:{configuracao.port}
            </div>
            <div>
              <span className="font-medium">Segurança:</span> {configuracao.secure ? 'SSL' : 'STARTTLS'}
            </div>
            <div>
              <span className="font-medium">Usuário:</span> {configuracao.user}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Senha:</span> 
              <span className="font-mono">
                {mostrarSenha ? configuracao.pass : '••••••••••••••••'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarSenha(!mostrarSenha)}
              >
                {mostrarSenha ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Teste */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="email-teste">Email de Destino</Label>
            <Input
              id="email-teste"
              type="email"
              placeholder="seu-email@exemplo.com"
              value={emailTeste}
              onChange={(e) => setEmailTeste(e.target.value)}
            />
          </div>

          <Button
            onClick={testarSMTP}
            disabled={enviando || !emailTeste}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {enviando ? 'Testando SMTP...' : 'Testar Envio SMTP Real'}
          </Button>
        </div>

        {/* Resultado do Teste */}
        {resultado && (
          <div className={`p-4 rounded-lg border ${
            resultado.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {resultado.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`font-medium ${
                resultado.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {resultado.success ? 'SMTP Funcionando!' : 'Erro no SMTP'}
              </span>
            </div>
            
            {resultado.success ? (
              <div className="text-sm text-green-700">
                <p>✅ Email enviado com sucesso!</p>
                <p>📧 Verifique sua caixa de entrada (e spam)</p>
                {resultado.data?.messageId && (
                  <p>🆔 ID: {resultado.data.messageId}</p>
                )}
              </div>
            ) : (
              <div className="text-sm text-red-700">
                <p>❌ {resultado.error}</p>
                <p className="mt-2 font-medium">Possíveis soluções:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Verificar se a senha de aplicativo está correta</li>
                  <li>Confirmar que a verificação em duas etapas está ativa</li>
                  <li>Gerar nova senha de aplicativo</li>
                  <li>Verificar se o email está correto</li>
                </ul>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              Teste realizado em: {new Date(resultado.timestamp).toLocaleString('pt-BR')}
            </p>
          </div>
        )}

        {/* Instruções */}
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-2">💡 Como funciona:</h4>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li>Este teste usa sua configuração SMTP real</li>
            <li>Envia via Edge Function do Supabase</li>
            <li>Se funcionar, todos os emails do sistema funcionarão</li>
            <li>Verifique os logs no console para detalhes</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
