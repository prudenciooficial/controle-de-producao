import React, { useState, useEffect } from 'react';
import { Shield, Clock, User, Globe, Monitor, MapPin, FileText, Download, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { AuditoriaService, type LogAuditoria, type RelatorioAuditoria } from '@/services/auditoriaService';

interface AuditoriaViewerProps {
  contratoId: string;
  mostrarRelatorio?: boolean;
}

export default function AuditoriaViewer({ 
  contratoId, 
  mostrarRelatorio = true 
}: AuditoriaViewerProps) {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioAuditoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    carregarDadosAuditoria();
  }, [contratoId]);

  const carregarDadosAuditoria = async () => {
    setLoading(true);
    try {
      const [logsData, relatorioData] = await Promise.all([
        AuditoriaService.buscarLogsContrato(contratoId),
        mostrarRelatorio ? AuditoriaService.gerarRelatorioAuditoria(contratoId) : Promise.resolve(null)
      ]);

      setLogs(logsData);
      setRelatorio(relatorioData);
    } catch (error) {
      console.error('Erro ao carregar dados de auditoria:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados de auditoria.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventoIcon = (evento: string) => {
    const iconMap: Record<string, any> = {
      'contrato_criado': FileText,
      'contrato_editado': FileText,
      'status_alterado': Clock,
      'assinatura_interna_realizada': Shield,
      'assinatura_externa_realizada': Shield,
      'token_enviado': Globe,
      'token_validado': CheckCircle,
      'token_rejeitado': AlertTriangle,
      'pdf_gerado': Download,
      'acesso_autorizado': CheckCircle,
      'acesso_negado': AlertTriangle
    };

    const IconComponent = iconMap[evento] || Clock;
    return <IconComponent className="h-4 w-4" />;
  };

  const getEventoColor = (evento: string): string => {
    const colorMap: Record<string, string> = {
      'contrato_criado': 'bg-blue-100 text-blue-800',
      'contrato_editado': 'bg-yellow-100 text-yellow-800',
      'status_alterado': 'bg-purple-100 text-purple-800',
      'assinatura_interna_realizada': 'bg-green-100 text-green-800',
      'assinatura_externa_realizada': 'bg-green-100 text-green-800',
      'token_enviado': 'bg-blue-100 text-blue-800',
      'token_validado': 'bg-green-100 text-green-800',
      'token_rejeitado': 'bg-red-100 text-red-800',
      'pdf_gerado': 'bg-indigo-100 text-indigo-800',
      'acesso_autorizado': 'bg-green-100 text-green-800',
      'acesso_negado': 'bg-red-100 text-red-800'
    };

    return colorMap[evento] || 'bg-gray-100 text-gray-800';
  };

  const formatarTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatarIP = (ip: string): string => {
    // Mascarar parte do IP por privacidade
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return ip;
  };

  const exportarRelatorio = () => {
    if (!relatorio) return;

    const dadosExportacao = {
      contrato: relatorio.titulo_contrato,
      gerado_em: new Date().toISOString(),
      total_eventos: relatorio.total_eventos,
      eventos_por_tipo: relatorio.eventos_por_tipo,
      evidencias_criticas: relatorio.evidencias_criticas,
      conformidade: relatorio.conformidade,
      linha_tempo: logs.map(log => ({
        timestamp: log.timestamp_evento,
        evento: log.evento,
        descricao: log.descricao,
        ip: log.evidencias_tecnicas.ip_address,
        user_agent: log.evidencias_tecnicas.user_agent
      }))
    };

    const blob = new Blob([JSON.stringify(dadosExportacao, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_contrato_${contratoId}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Relatório exportado",
      description: "Arquivo de auditoria baixado com sucesso.",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando dados de auditoria...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Log de Auditoria
            </CardTitle>
            <CardDescription>
              Registro completo de todas as ações e evidências técnicas
            </CardDescription>
          </div>
          {relatorio && (
            <Button onClick={exportarRelatorio} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
            {relatorio && <TabsTrigger value="relatorio">Relatório</TabsTrigger>}
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Nenhum evento registrado ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getEventoIcon(log.evento)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getEventoColor(log.evento)}>
                              {log.evento.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatarTimestamp(log.timestamp_evento)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            {log.descricao}
                          </p>
                          
                          {/* Evidências técnicas resumidas */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              <span>IP: {formatarIP(log.evidencias_tecnicas.ip_address)}</span>
                            </div>
                            {log.usuario_id && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>Usuário autenticado</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id!)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Detalhes expandidos */}
                    {expandedLog === log.id && (
                      <div className="mt-4 pt-4 border-t bg-gray-50 dark:bg-gray-900 rounded p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium mb-2">Evidências Técnicas</h4>
                            <div className="space-y-1 text-xs">
                              <div><strong>IP:</strong> {log.evidencias_tecnicas.ip_address}</div>
                              <div><strong>User Agent:</strong> {log.evidencias_tecnicas.user_agent}</div>
                              <div><strong>Timestamp:</strong> {log.evidencias_tecnicas.timestamp}</div>
                              <div><strong>Timezone:</strong> {log.evidencias_tecnicas.timezone}</div>
                            </div>
                          </div>
                          
                          {Object.keys(log.dados_evento).length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Dados do Evento</h4>
                              <div className="text-xs">
                                <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-2 rounded">
                                  {JSON.stringify(log.dados_evento, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {relatorio && (
            <TabsContent value="relatorio" className="space-y-4">
              {/* Estatísticas gerais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{relatorio.total_eventos}</div>
                    <p className="text-sm text-gray-600">Total de Eventos</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">{relatorio.evidencias_criticas.assinaturas}</div>
                    <p className="text-sm text-gray-600">Assinaturas Realizadas</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">{relatorio.evidencias_criticas.alteracoes_documento}</div>
                    <p className="text-sm text-gray-600">Alterações no Documento</p>
                  </CardContent>
                </Card>
              </div>

              {/* Status de conformidade */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status de Conformidade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(relatorio.conformidade).map(([chave, valor]) => (
                      <div key={chave} className="flex items-center gap-2">
                        {valor ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {chave.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                        </span>
                        <Badge variant={valor ? "default" : "destructive"}>
                          {valor ? "Conforme" : "Não conforme"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Eventos por tipo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Eventos por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(relatorio.eventos_por_tipo).map(([evento, quantidade]) => (
                      <div key={evento} className="flex items-center justify-between">
                        <span className="text-sm">{evento.replace(/_/g, ' ')}</span>
                        <Badge variant="outline">{quantidade}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
