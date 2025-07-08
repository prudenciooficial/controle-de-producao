import React, { useState, useEffect } from 'react';
import { Mail, Send, Clock, CheckCircle, AlertTriangle, Settings, Bell, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { EmailService } from '@/services/emailService';
import { supabase } from '@/integrations/supabase/client';

interface NotificacoesManagerProps {
  contratoId: string;
  contratoTitulo: string;
  assinanteExternoNome: string;
  assinanteExternoEmail: string;
  status: string;
}

interface ConfiguracaoNotificacao {
  enviar_lembrete_24h: boolean;
  enviar_lembrete_72h: boolean;
  enviar_notificacao_finalizacao: boolean;
  mensagem_personalizada?: string;
}

export default function NotificacoesManager({
  contratoId,
  contratoTitulo,
  assinanteExternoNome,
  assinanteExternoEmail,
  status
}: NotificacoesManagerProps) {
  const [configuracao, setConfiguracao] = useState<ConfiguracaoNotificacao>({
    enviar_lembrete_24h: true,
    enviar_lembrete_72h: true,
    enviar_notificacao_finalizacao: true
  });
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [historicoEmails, setHistoricoEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    carregarConfiguracoes();
    carregarHistoricoEmails();
  }, [contratoId]);

  const carregarConfiguracoes = async () => {
    try {
      // Carregar configurações salvas (implementar se necessário)
      // Por enquanto, usar configurações padrão
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setLoading(false);
    }
  };

  const carregarHistoricoEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('logs_auditoria_contratos_comerciais')
        .select('*')
        .eq('contrato_id', contratoId)
        .in('evento', ['email_assinatura_enviado', 'email_lembrete_enviado', 'email_finalizacao_enviado'])
        .order('timestamp_evento', { ascending: false });

      if (error) throw error;
      setHistoricoEmails(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de emails:', error);
    }
  };

  const enviarEmailAssinatura = async () => {
    setEnviandoEmail(true);
    try {
      // Gerar token e link (simulado)
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const linkAssinatura = `${window.location.origin}/assinatura-externa/${contratoId}?token=${token}`;
      const validoAte = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await EmailService.enviarEmailAssinaturaExterna({
        contrato_id: contratoId,
        titulo_contrato: contratoTitulo,
        destinatario_nome: assinanteExternoNome,
        destinatario_email: assinanteExternoEmail,
        token_verificacao: token,
        link_assinatura: linkAssinatura,
        valido_ate: validoAte,
        empresa_nome: 'Sua Empresa',
        responsavel_nome: 'Responsável'
      });

      toast({
        title: 'Email enviado!',
        description: `Email de assinatura enviado para ${assinanteExternoEmail}`,
      });

      carregarHistoricoEmails();
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao enviar email de assinatura.",
      });
    } finally {
      setEnviandoEmail(false);
    }
  };

  const enviarLembrete = async () => {
    setEnviandoEmail(true);
    try {
      await EmailService.enviarLembreteAssinatura({
        contrato_id: contratoId,
        titulo_contrato: contratoTitulo,
        destinatario_nome: assinanteExternoNome,
        destinatario_email: assinanteExternoEmail,
        tipo_notificacao: 'lembrete_assinatura'
      });

      toast({
        title: 'Lembrete enviado!',
        description: `Lembrete enviado para ${assinanteExternoEmail}`,
      });

      carregarHistoricoEmails();
    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao enviar lembrete.",
      });
    } finally {
      setEnviandoEmail(false);
    }
  };

  const enviarNotificacaoFinalizacao = async () => {
    setEnviandoEmail(true);
    try {
      await EmailService.enviarNotificacaoContratoFinalizado({
        contrato_id: contratoId,
        titulo_contrato: contratoTitulo,
        destinatario_nome: assinanteExternoNome,
        destinatario_email: assinanteExternoEmail,
        tipo_notificacao: 'contrato_finalizado'
      });

      toast({
        title: 'Notificação enviada!',
        description: `Notificação de finalização enviada para ${assinanteExternoEmail}`,
      });

      carregarHistoricoEmails();
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao enviar notificação.",
      });
    } finally {
      setEnviandoEmail(false);
    }
  };

  const getIconeEvento = (evento: string) => {
    switch (evento) {
      case 'email_assinatura_enviado':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'email_lembrete_enviado':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'email_finalizacao_enviado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatarTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Notificações por Email
        </CardTitle>
        <CardDescription>
          Gerencie o envio de emails e notificações para o signatário externo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informações do destinatário */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Signatário Externo</span>
          </div>
          <div className="text-sm space-y-1">
            <div><strong>Nome:</strong> {assinanteExternoNome}</div>
            <div><strong>Email:</strong> {assinanteExternoEmail}</div>
            <div><strong>Status:</strong> 
              <Badge className="ml-2" variant={status === 'concluido' ? 'default' : 'secondary'}>
                {status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Ações de envio */}
        <div className="space-y-3">
          <h4 className="font-medium">Ações de Email</h4>
          
          {status === 'aguardando_assinatura_externa' && (
            <div className="flex gap-2">
              <Button 
                onClick={enviarEmailAssinatura}
                disabled={enviandoEmail}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {enviandoEmail ? 'Enviando...' : 'Enviar Email de Assinatura'}
              </Button>
              
              <Button 
                onClick={enviarLembrete}
                disabled={enviandoEmail}
                variant="outline"
                className="flex-1"
              >
                <Clock className="h-4 w-4 mr-2" />
                Enviar Lembrete
              </Button>
            </div>
          )}

          {status === 'concluido' && (
            <Button 
              onClick={enviarNotificacaoFinalizacao}
              disabled={enviandoEmail}
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {enviandoEmail ? 'Enviando...' : 'Notificar Finalização'}
            </Button>
          )}
        </div>

        {/* Configurações de notificação */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <h4 className="font-medium">Configurações Automáticas</h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="lembrete-24h" className="text-sm">
                Enviar lembrete após 24h sem assinatura
              </Label>
              <Switch
                id="lembrete-24h"
                checked={configuracao.enviar_lembrete_24h}
                onCheckedChange={(checked) => 
                  setConfiguracao(prev => ({ ...prev, enviar_lembrete_24h: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="lembrete-72h" className="text-sm">
                Enviar lembrete após 72h sem assinatura
              </Label>
              <Switch
                id="lembrete-72h"
                checked={configuracao.enviar_lembrete_72h}
                onCheckedChange={(checked) => 
                  setConfiguracao(prev => ({ ...prev, enviar_lembrete_72h: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-finalizacao" className="text-sm">
                Notificar quando contrato for finalizado
              </Label>
              <Switch
                id="notif-finalizacao"
                checked={configuracao.enviar_notificacao_finalizacao}
                onCheckedChange={(checked) => 
                  setConfiguracao(prev => ({ ...prev, enviar_notificacao_finalizacao: checked }))
                }
              />
            </div>
          </div>
        </div>

        {/* Mensagem personalizada */}
        <div className="space-y-2">
          <Label htmlFor="mensagem-personalizada">Mensagem Personalizada (Opcional)</Label>
          <Textarea
            id="mensagem-personalizada"
            placeholder="Adicione uma mensagem personalizada que será incluída nos emails..."
            value={configuracao.mensagem_personalizada || ''}
            onChange={(e) => 
              setConfiguracao(prev => ({ ...prev, mensagem_personalizada: e.target.value }))
            }
            rows={3}
          />
        </div>

        {/* Histórico de emails */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h4 className="font-medium">Histórico de Emails</h4>
          </div>
          
          {historicoEmails.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum email enviado ainda.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {historicoEmails.map((email) => (
                <div key={email.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  {getIconeEvento(email.evento)}
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {email.evento.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatarTimestamp(email.timestamp_evento)}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Enviado
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
