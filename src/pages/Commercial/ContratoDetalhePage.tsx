import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, Calendar, Shield, Clock, CheckCircle, AlertCircle, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AssinaturaInternaModal from '@/components/Commercial/AssinaturaInternaModal';
import PDFViewer from '@/components/Commercial/PDFViewer';
import AuditoriaViewer from '@/components/Commercial/AuditoriaViewer';
import NotificacoesManager from '@/components/Commercial/NotificacoesManager';
import ValidacaoJuridicaViewer from '@/components/Commercial/ValidacaoJuridicaViewer';
// Componentes de teste removidos - movidos para Administrador > Configurações de Email
// import SMTPTester from '@/components/Commercial/SMTPTester';

import { TokenVerificacaoService } from '@/services/tokenVerificacaoService';
import { PDFService } from '@/services/pdfService';
import { AuditoriaService } from '@/services/auditoriaService';

interface ContratoDetalhes {
  id: string;
  titulo: string;
  conteudo: string;
  status: string;
  assinante_externo_nome: string;
  assinante_externo_email: string;
  assinante_externo_documento: string;
  criado_em: string;
  atualizado_em: string;
  finalizado_em?: string;
  modelo: {
    nome: string;
    descricao?: string;
  };
  assinante_interno: {
    nome?: string;
    email?: string;
  } | null;
  assinaturas: Array<{
    id: string;
    tipo: string;
    status: string;
    signatario_nome: string;
    assinado_em?: string;
    certificado_dados?: any;
  }>;
  logs: Array<{
    id: string;
    evento: string;
    descricao: string;
    timestamp_evento: string;
    usuario_id?: string;
  }>;
}

const statusConfig = {
  editando: {
    label: 'Editando',
    color: 'bg-gray-100 text-gray-800',
    icon: FileText
  },
  aguardando_assinatura_interna: {
    label: 'Aguardando Assinatura Interna',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  aguardando_assinatura_externa: {
    label: 'Aguardando Assinatura Externa',
    color: 'bg-blue-100 text-blue-800',
    icon: Clock
  },
  concluido: {
    label: 'Concluído',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle
  }
};

export default function ContratoDetalhePage() {
  const { contratoId } = useParams<{ contratoId: string }>();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState<ContratoDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [assinaturaModalOpen, setAssinaturaModalOpen] = useState(false);
  const [enviandoToken, setEnviandoToken] = useState(false);
  const [pdfGerado, setPdfGerado] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (contratoId) {
      loadContrato();
    }
  }, [contratoId]);

  const loadContrato = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos_comerciais')
        .select(`
          *,
          modelo:modelo_id(nome, descricao),
          assinaturas:assinaturas_contratos_comerciais(*),
          logs:logs_auditoria_contratos_comerciais(*)
        `)
        .eq('id', contratoId)
        .single();

      if (error) throw error;

      setContrato(data);
    } catch (error) {
      console.error('Erro ao carregar contrato:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar detalhes do contrato.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssinaturaInterna = () => {
    setAssinaturaModalOpen(true);
    // Registrar tentativa de acesso
    AuditoriaService.registrarTentativaAcesso(
      contrato!.id,
      'assinatura_interna',
      true,
      { usuario_autorizado: true }
    );
  };

  const handleEnviarAssinaturaExterna = async () => {
    if (!contrato) return;

    setEnviandoToken(true);
    try {
      // Gerar token de verificação
      const token = await TokenVerificacaoService.criarToken(
        contrato.id,
        contrato.assinante_externo_email
      );

      // Gerar link de assinatura
      const linkAssinatura = TokenVerificacaoService.gerarLinkAssinatura(contrato.id);

      // Preparar dados para envio do email
      const dadosEmail = {
        contratoId: contrato.id,
        emailDestinatario: contrato.assinante_externo_email,
        nomeDestinatario: contrato.assinante_externo_nome,
        tituloContrato: contrato.titulo,
        linkAssinatura,
        token,
        validoAte: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
      };

      // Enviar email com token
      await TokenVerificacaoService.enviarEmailVerificacao(dadosEmail);

      toast({
        title: 'Email enviado com sucesso!',
        description: `Token de verificação enviado para ${contrato.assinante_externo_email}. Válido por 24 horas.`
      });

      loadContrato();
    } catch (error) {
      console.error('Erro ao enviar token:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao enviar email com token de verificação.",
      });
    } finally {
      setEnviandoToken(false);
    }
  };

  const handlePDFGerado = async (resultado: any) => {
    setPdfGerado(resultado);

    // Atualizar contrato com dados do PDF
    try {
      await PDFService.atualizarContratoComPDF(contrato!.id, resultado);
      loadContrato(); // Recarregar dados do contrato
    } catch (error) {
      console.error('Erro ao atualizar contrato com PDF:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Há poucos minutos';
    if (diffInHours < 24) return `Há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Contrato não encontrado
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          O contrato solicitado não foi encontrado ou você não tem permissão para visualizá-lo.
        </p>
        <Button onClick={() => navigate('/comercial')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/comercial')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{contrato.titulo}</h1>
            {getStatusBadge(contrato.status)}
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Modelo: {contrato.modelo?.nome}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detalhes do Contrato */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Signatário Externo:</strong>
                  <p>{contrato.assinante_externo_nome}</p>
                </div>
                <div>
                  <strong>Email:</strong>
                  <p>{contrato.assinante_externo_email}</p>
                </div>
                <div>
                  <strong>Documento:</strong>
                  <p>{contrato.assinante_externo_documento}</p>
                </div>
                <div>
                  <strong>Criado em:</strong>
                  <p>{formatTimeAgo(contrato.criado_em)}</p>
                </div>
                {contrato.assinante_interno && (
                  <div>
                    <strong>Responsável Interno:</strong>
                    <p>{contrato.assinante_interno.nome}</p>
                  </div>
                )}
                {contrato.finalizado_em && (
                  <div>
                    <strong>Finalizado em:</strong>
                    <p>{formatTimeAgo(contrato.finalizado_em)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Conteúdo do Contrato */}
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {contrato.conteudo}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Assinaturas */}
          <Card>
            <CardHeader>
              <CardTitle>Assinaturas</CardTitle>
            </CardHeader>
            <CardContent>
              {contrato.assinaturas.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhuma assinatura realizada ainda.</p>
              ) : (
                <div className="space-y-3">
                  {contrato.assinaturas.map((assinatura) => (
                    <div key={assinatura.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{assinatura.signatario_nome}</span>
                        </div>
                        <Badge variant={assinatura.status === 'assinado' ? 'default' : 'secondary'}>
                          {assinatura.tipo === 'interna_qualificada' ? 'Assinatura Qualificada' : 'Assinatura Simples'}
                        </Badge>
                      </div>
                      {assinatura.assinado_em && (
                        <p className="text-sm text-gray-600">
                          Assinado em: {formatTimeAgo(assinatura.assinado_em)}
                        </p>
                      )}
                      {assinatura.certificado_dados && (
                        <div className="text-xs text-gray-500 mt-1">
                          Certificado: {assinatura.certificado_dados.emissor} - Válido até {new Date(assinatura.certificado_dados.valido_ate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visualizador de PDF */}
          <PDFViewer
            contrato={contrato}
            onPDFGerado={handlePDFGerado}
          />

          {/* Gerenciador de Notificações */}
          <NotificacoesManager
            contratoId={contrato.id}
            contratoTitulo={contrato.titulo}
            assinanteExternoNome={contrato.assinante_externo_nome}
            assinanteExternoEmail={contrato.assinante_externo_email}
            status={contrato.status}
          />

          {/* Seções de teste removidas - movidas para Administrador > Configurações de Email */}

          {/* Validação Jurídica */}
          <ValidacaoJuridicaViewer
            contratoId={contrato.id}
            contratoTitulo={contrato.titulo}
            status={contrato.status}
          />

          {/* Log de Auditoria */}
          <AuditoriaViewer
            contratoId={contrato.id}
            mostrarRelatorio={true}
          />
        </div>

        {/* Sidebar com Ações */}
        <div className="space-y-6">
          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contrato.status === 'aguardando_assinatura_interna' && (
                  <Button onClick={handleAssinaturaInterna} className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Assinar Digitalmente
                  </Button>
                )}

                {contrato.status === 'aguardando_assinatura_externa' && (
                  <Button
                    onClick={handleEnviarAssinaturaExterna}
                    className="w-full"
                    disabled={enviandoToken}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {enviandoToken ? 'Enviando...' : 'Enviar Token de Verificação'}
                  </Button>
                )}


              </div>
            </CardContent>
          </Card>

          {/* Log de Atividades */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              {contrato.logs.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhuma atividade registrada.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {contrato.logs
                    .sort((a, b) => new Date(b.timestamp_evento).getTime() - new Date(a.timestamp_evento).getTime())
                    .map((log) => (
                    <div key={log.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="font-medium">{log.evento.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-gray-600 text-xs ml-5">{log.descricao}</p>
                      <p className="text-gray-400 text-xs ml-5">{formatTimeAgo(log.timestamp_evento)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Assinatura Interna */}
      <AssinaturaInternaModal
        open={assinaturaModalOpen}
        onOpenChange={setAssinaturaModalOpen}
        contratoId={contrato.id}
        contratoTitulo={contrato.titulo}
        onAssinaturaCompleta={loadContrato}
      />
    </div>
  );
}
