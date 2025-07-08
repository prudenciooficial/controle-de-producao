import React, { useState } from 'react';
import { Mail, Settings, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function GoogleWorkspaceSetup() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [configuracaoGerada, setConfiguracaoGerada] = useState('');
  const { toast } = useToast();

  const gerarConfiguracao = () => {
    if (!email || !senha || !nomeEmpresa) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para gerar a configuração.",
      });
      return;
    }

    const config = `// Configuração Google Workspace
gmail: {
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: '${email}',
      pass: '${senha}'
    }
  },
  from: {
    name: 'Sistema de Contratos - ${nomeEmpresa}',
    email: '${email}'
  },
  provider: 'gmail',
  enabled: true // IMPORTANTE: Configuração ativa
},`;

    setConfiguracaoGerada(config);
    
    toast({
      title: "Configuração gerada!",
      description: "Copie o código e cole no arquivo emailConfig.ts",
    });
  };

  const copiarConfiguracao = () => {
    navigator.clipboard.writeText(configuracaoGerada);
    toast({
      title: "Copiado!",
      description: "Configuração copiada para a área de transferência.",
    });
  };

  const passos = [
    {
      numero: 1,
      titulo: "Gerar Senha de Aplicativo",
      descricao: "Acesse sua conta Google e gere uma senha de aplicativo",
      link: "https://myaccount.google.com/security",
      detalhes: [
        "Vá em Segurança > Verificação em duas etapas",
        "Ative a verificação em duas etapas (se não estiver ativa)",
        "Clique em 'Senhas de aplicativo'",
        "Selecione App = Email, Dispositivo = Outro",
        "Digite 'Sistema de Contratos' como nome",
        "Copie a senha gerada (16 caracteres)"
      ]
    },
    {
      numero: 2,
      titulo: "Configurar no Sistema",
      descricao: "Use o formulário abaixo para gerar a configuração",
      detalhes: [
        "Digite seu email do Google Workspace",
        "Cole a senha de aplicativo gerada",
        "Digite o nome da sua empresa",
        "Clique em 'Gerar Configuração'"
      ]
    },
    {
      numero: 3,
      titulo: "Aplicar Configuração",
      descricao: "Substitua a configuração no arquivo emailConfig.ts",
      detalhes: [
        "Abra o arquivo src/config/emailConfig.ts",
        "Localize a seção 'gmail:'",
        "Substitua pela configuração gerada",
        "Salve o arquivo"
      ]
    },
    {
      numero: 4,
      titulo: "Deploy e Teste",
      descricao: "Faça deploy da Edge Function e teste",
      detalhes: [
        "Execute: npx supabase functions deploy send-email",
        "Use o componente 'Teste de Email'",
        "Verifique se o email chegou",
        "Monitore os logs no console"
      ]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Configuração Google Workspace
        </CardTitle>
        <CardDescription>
          Configure seu domínio do Google Workspace para envio de emails
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="passos" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="passos">Passo a Passo</TabsTrigger>
            <TabsTrigger value="configurador">Configurador</TabsTrigger>
          </TabsList>

          <TabsContent value="passos" className="space-y-4">
            {passos.map((passo) => (
              <div key={passo.numero} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                    {passo.numero}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{passo.titulo}</h4>
                      {passo.link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(passo.link, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{passo.descricao}</p>
                    <ul className="text-sm space-y-1">
                      {passo.detalhes.map((detalhe, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span>{detalhe}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="configurador" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email do Google Workspace</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu-email@seudominio.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="senha">Senha de Aplicativo</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="abcd efgh ijkl mnop"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use a senha de aplicativo gerada, não sua senha pessoal
                </p>
              </div>

              <div>
                <Label htmlFor="empresa">Nome da Empresa</Label>
                <Input
                  id="empresa"
                  placeholder="Sua Empresa Ltda"
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                />
              </div>

              <Button onClick={gerarConfiguracao} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Gerar Configuração
              </Button>

              {configuracaoGerada && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Configuração Gerada</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copiarConfiguracao}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <Textarea
                    value={configuracaoGerada}
                    readOnly
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800">Próximos passos:</p>
                        <ol className="mt-1 space-y-1 text-yellow-700">
                          <li>1. Copie a configuração acima</li>
                          <li>2. Abra o arquivo <code>src/config/emailConfig.ts</code></li>
                          <li>3. Substitua a seção <code>gmail:</code> pela configuração gerada</li>
                          <li>4. Execute: <code>npx supabase functions deploy send-email</code></li>
                          <li>5. Teste usando o componente "Teste de Email"</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
