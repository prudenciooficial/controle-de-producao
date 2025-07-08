import React, { useState, useEffect } from 'react';
import { Mail, Settings, TestTube, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { EmailRealService } from '@/services/emailRealService';
import { EMAIL_CONFIGS, ACTIVE_EMAIL_PROVIDER, EMAIL_SETUP_INSTRUCTIONS, getActiveEmailConfig } from '@/config/emailConfig';

export default function EmailConfigViewer() {
  const [testando, setTestando] = useState(false);
  const [estatisticas, setEstatisticas] = useState<any>(null);
  const [configStatus, setConfigStatus] = useState<'loading' | 'valid' | 'invalid' | 'disabled'>('loading');
  const { toast } = useToast();

  useEffect(() => {
    verificarConfiguracao();
    carregarEstatisticas();
  }, []);

  const verificarConfiguracao = async () => {
    try {
      const config = getActiveEmailConfig();
      setConfigStatus('valid');
    } catch (error) {
      console.error('Erro na configuração:', error);
      setConfigStatus('invalid');
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const stats = await EmailRealService.obterEstatisticas();
      setEstatisticas(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const testarEmail = async () => {
    setTestando(true);
    try {
      const resultado = await EmailRealService.testarConfiguracao();
      
      toast({
        title: resultado.success ? "Teste bem-sucedido!" : "Teste falhou",
        description: resultado.message,
        variant: resultado.success ? "default" : "destructive"
      });

      if (resultado.success) {
        await carregarEstatisticas();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no teste",
        description: "Erro ao executar teste de email.",
      });
    } finally {
      setTestando(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800';
      case 'invalid': return 'bg-red-100 text-red-800';
      case 'disabled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'disabled': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const activeConfig = EMAIL_CONFIGS[ACTIVE_EMAIL_PROVIDER];
  const setupInstructions = EMAIL_SETUP_INSTRUCTIONS[ACTIVE_EMAIL_PROVIDER];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Configuração de Email
        </CardTitle>
        <CardDescription>
          Configure e teste o envio de emails do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="teste">Teste</TabsTrigger>
            <TabsTrigger value="instrucoes">Instruções</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(configStatus)}
                    <Badge className={getStatusColor(configStatus)}>
                      {configStatus === 'valid' ? 'Configurado' : 
                       configStatus === 'invalid' ? 'Não Configurado' : 'Carregando...'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">Status da Configuração</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {activeConfig?.provider.toUpperCase() || 'N/A'}
                  </div>
                  <p className="text-sm text-gray-600">Provedor Ativo</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">
                    {estatisticas?.total_enviados || 0}
                  </div>
                  <p className="text-sm text-gray-600">Emails Enviados</p>
                </CardContent>
              </Card>
            </div>

            {configStatus === 'invalid' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Configuração necessária:</strong> O sistema de email não está configurado. 
                  Configure suas credenciais no arquivo <code>src/config/emailConfig.ts</code> 
                  e ative o provedor desejado.
                </AlertDescription>
              </Alert>
            )}

            {estatisticas && (
              <div className="space-y-2">
                <h4 className="font-medium">Estatísticas de Envio</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-green-600">{estatisticas.sucessos}</div>
                    <div className="text-gray-600">Sucessos</div>
                  </div>
                  <div>
                    <div className="font-medium text-red-600">{estatisticas.falhas}</div>
                    <div className="text-gray-600">Falhas</div>
                  </div>
                  <div className="col-span-2">
                    <div className="font-medium">
                      {estatisticas.ultimo_envio ? 
                        new Date(estatisticas.ultimo_envio).toLocaleString('pt-BR') : 
                        'Nunca'
                      }
                    </div>
                    <div className="text-gray-600">Último Envio</div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            {activeConfig ? (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Configuração Atual ({ACTIVE_EMAIL_PROVIDER})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Servidor SMTP:</strong> {activeConfig.smtp.host}:{activeConfig.smtp.port}
                    </div>
                    <div>
                      <strong>Seguro:</strong> {activeConfig.smtp.secure ? 'Sim' : 'Não'}
                    </div>
                    <div>
                      <strong>Usuário:</strong> {activeConfig.smtp.auth.user}
                    </div>
                    <div>
                      <strong>Remetente:</strong> {activeConfig.from.name} &lt;{activeConfig.from.email}&gt;
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge variant={activeConfig.enabled ? "default" : "destructive"}>
                      {activeConfig.enabled ? "Habilitado" : "Desabilitado"}
                    </Badge>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Para alterar a configuração, edite o arquivo <code>src/config/emailConfig.ts</code> 
                    e configure suas credenciais reais. Nunca commite senhas no código!
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma configuração encontrada para o provedor: {ACTIVE_EMAIL_PROVIDER}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="teste" className="space-y-4">
            <div className="text-center">
              <Button 
                onClick={testarEmail} 
                disabled={testando || configStatus !== 'valid'}
                size="lg"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testando ? 'Testando...' : 'Testar Envio de Email'}
              </Button>
              
              {configStatus !== 'valid' && (
                <p className="text-sm text-gray-500 mt-2">
                  Configure o email antes de testar
                </p>
              )}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                O teste enviará um email de exemplo para verificar se a configuração está funcionando. 
                Em modo de desenvolvimento, o email será apenas logado no console.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="instrucoes" className="space-y-4">
            {setupInstructions ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{setupInstructions.title}</h3>
                
                <div>
                  <h4 className="font-medium mb-2">Passos para Configuração:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {setupInstructions.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Observações Importantes:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {setupInstructions.notes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Segurança:</strong> Sempre use senhas de aplicativo ou tokens específicos. 
                    Nunca use sua senha pessoal em aplicações. Configure variáveis de ambiente 
                    para credenciais sensíveis.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <p className="text-gray-600">Instruções não disponíveis para este provedor.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
