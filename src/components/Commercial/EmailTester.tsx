import React, { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { EmailRealService } from '@/services/emailRealService';
import { getActiveEmailConfig, validateEmailConfig, EMAIL_SETUP_INSTRUCTIONS } from '@/config/emailConfig';

export default function EmailTester() {
  const [emailTeste, setEmailTeste] = useState('');
  const [assunto, setAssunto] = useState('Teste de Configuração de Email');
  const [mensagem, setMensagem] = useState('Este é um email de teste do sistema de contratos.');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const { toast } = useToast();

  const handleTestarEmail = async () => {
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
      const resultado = await EmailRealService.enviarEmail({
        to: emailTeste,
        subject: assunto,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Teste de Configuração de Email</h2>
            <p>${mensagem}</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              <p><strong>Sistema:</strong> Contratos Comerciais</p>
            </div>
            <p style="color: #666; font-size: 12px;">
              Se você recebeu este email, a configuração está funcionando corretamente!
            </p>
          </div>
        `,
        text: `${mensagem}\n\nData/Hora: ${new Date().toLocaleString('pt-BR')}\nSistema: Contratos Comerciais`
      });

      setResultado(resultado);

      if (resultado.success) {
        toast({
          title: "Email enviado!",
          description: `Email de teste enviado com sucesso para ${emailTeste}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro no envio",
          description: resultado.error || "Erro desconhecido",
        });
      }

    } catch (error) {
      console.error('Erro no teste de email:', error);
      setResultado({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao testar envio de email.",
      });
    } finally {
      setEnviando(false);
    }
  };

  const verificarConfiguracao = () => {
    try {
      const config = getActiveEmailConfig();
      const valida = validateEmailConfig(config);
      
      return {
        configurada: true,
        valida,
        provider: config.provider,
        from: config.from.email,
        smtp: config.smtp.host
      };
    } catch (error) {
      return {
        configurada: false,
        valida: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const statusConfig = verificarConfiguracao();

  return (
    <Card>
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
        {/* Status da Configuração */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
          {statusConfig.configurada && statusConfig.valida ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                Configuração válida ({statusConfig.provider}: {statusConfig.from})
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">
                {statusConfig.erro || 'Configuração inválida'}
              </span>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMostrarConfig(!mostrarConfig)}
            className="ml-auto"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Instruções de Configuração */}
        {mostrarConfig && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Instruções de Configuração</h4>
            <p className="text-sm text-blue-700 mb-3">
              Para configurar o envio de emails, edite o arquivo <code>src/config/emailConfig.ts</code>:
            </p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Configure suas credenciais SMTP no provedor escolhido</li>
              <li>Defina <code>enabled: true</code> na configuração</li>
              <li>Defina <code>DEV_EMAIL_CONFIG.logOnly: false</code></li>
              <li>Faça deploy da Edge Function: <code>npx supabase functions deploy send-email</code></li>
            </ol>
          </div>
        )}

        {/* Formulário de Teste */}
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

          <div>
            <Label htmlFor="assunto">Assunto</Label>
            <Input
              id="assunto"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="mensagem">Mensagem</Label>
            <Textarea
              id="mensagem"
              rows={3}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>

          <Button
            onClick={handleTestarEmail}
            disabled={enviando || !emailTeste}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {enviando ? 'Enviando...' : 'Enviar Email de Teste'}
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
                {resultado.success ? 'Sucesso!' : 'Erro no envio'}
              </span>
            </div>
            
            {resultado.success ? (
              <p className="text-sm text-green-700">
                Email enviado com ID: {resultado.messageId}
              </p>
            ) : (
              <p className="text-sm text-red-700">
                {resultado.error}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
