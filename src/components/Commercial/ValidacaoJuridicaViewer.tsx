import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, FileText, Download, Award, Scale, Clock, Hash } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ValidacaoJuridicaService, type ValidacaoContrato, type EvidenciaJuridica, type CertificadoValidacao } from '@/services/validacaoJuridicaService';

interface ValidacaoJuridicaViewerProps {
  contratoId: string;
  contratoTitulo: string;
  status: string;
}

export default function ValidacaoJuridicaViewer({
  contratoId,
  contratoTitulo,
  status
}: ValidacaoJuridicaViewerProps) {
  const [validacao, setValidacao] = useState<ValidacaoContrato | null>(null);
  const [certificado, setCertificado] = useState<CertificadoValidacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [validando, setValidando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (status === 'concluido') {
      carregarValidacao();
    } else {
      setLoading(false);
    }
  }, [contratoId, status]);

  const carregarValidacao = async () => {
    setLoading(true);
    try {
      const validacaoData = await ValidacaoJuridicaService.validarContrato(contratoId);
      setValidacao(validacaoData);

      if (validacaoData.status_validacao === 'valido') {
        const certificadoData = await ValidacaoJuridicaService.gerarCertificadoValidacao(contratoId);
        setCertificado(certificadoData);
      }
    } catch (error) {
      console.error('Erro ao carregar validação:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar validação jurídica.",
      });
    } finally {
      setLoading(false);
    }
  };

  const executarValidacao = async () => {
    setValidando(true);
    try {
      await carregarValidacao();
      toast({
        title: "Validação concluída",
        description: "Validação jurídica executada com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao executar validação.",
      });
    } finally {
      setValidando(false);
    }
  };

  const baixarRelatorio = () => {
    if (!validacao) return;

    const blob = new Blob([validacao.relatorio_validacao], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_validacao_${contratoId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Relatório baixado",
      description: "Relatório de validação jurídica baixado com sucesso.",
    });
  };

  const baixarCertificado = () => {
    if (!certificado) return;

    const certificadoTexto = `
CERTIFICADO DE VALIDAÇÃO JURÍDICA
=================================

Número do Certificado: ${certificado.numero_certificado}
Contrato: ${contratoTitulo}
ID do Contrato: ${certificado.contrato_id}

Hash do Documento: ${certificado.hash_documento}
Assinaturas Validadas: ${certificado.assinaturas_validadas}
Evidências Técnicas: ${certificado.evidencias_tecnicas}
Conformidade: ${certificado.conformidade_percentual}%

Emitido em: ${new Date(certificado.emitido_em).toLocaleString('pt-BR')}
Válido até: ${new Date(certificado.valido_ate).toLocaleString('pt-BR')}
Autoridade: ${certificado.autoridade_certificadora}

Este certificado atesta que o documento eletrônico está em conformidade
com a legislação brasileira vigente sobre assinaturas eletrônicas.
    `.trim();

    const blob = new Blob([certificadoTexto], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificado_${certificado.numero_certificado}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Certificado baixado",
      description: "Certificado de validação baixado com sucesso.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valido': return 'text-green-600 bg-green-100';
      case 'invalido': return 'text-red-600 bg-red-100';
      case 'pendente': return 'text-yellow-600 bg-yellow-100';
      case 'expirado': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEvidenciaIcon = (tipo: string) => {
    switch (tipo) {
      case 'assinatura_digital': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'token_verificacao': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'integridade_documento': return <Hash className="h-4 w-4 text-purple-500" />;
      case 'timestamp_qualificado': return <Clock className="h-4 w-4 text-orange-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (status !== 'concluido') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Validação Jurídica
          </CardTitle>
          <CardDescription>
            Validação jurídica disponível apenas para contratos finalizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              A validação jurídica será executada automaticamente quando o contrato for finalizado.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando validação jurídica...</p>
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
              <Scale className="h-5 w-5" />
              Validação Jurídica
            </CardTitle>
            <CardDescription>
              Conformidade legal e evidências técnicas do contrato
            </CardDescription>
          </div>
          {!validacao && (
            <Button onClick={executarValidacao} disabled={validando}>
              {validando ? 'Validando...' : 'Executar Validação'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!validacao ? (
          <div className="text-center py-8">
            <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Clique em "Executar Validação" para verificar a conformidade jurídica do contrato.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="conformidade">Conformidade</TabsTrigger>
              <TabsTrigger value="evidencias">Evidências</TabsTrigger>
              <TabsTrigger value="certificado">Certificado</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(validacao.status_validacao)}>
                        {validacao.status_validacao.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Status de Validação</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {validacao.evidencias_coletadas.length}
                    </div>
                    <p className="text-sm text-gray-600">Evidências Coletadas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round((Object.values(validacao.conformidade_legal).filter(Boolean).length / 
                                  Object.values(validacao.conformidade_legal).length) * 100)}%
                    </div>
                    <p className="text-sm text-gray-600">Conformidade</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button onClick={baixarRelatorio} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Relatório
                </Button>
                {certificado && (
                  <Button onClick={baixarCertificado}>
                    <Award className="h-4 w-4 mr-2" />
                    Baixar Certificado
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="conformidade" className="space-y-4">
              <div className="space-y-3">
                {Object.entries(validacao.conformidade_legal).map(([chave, conforme]) => (
                  <div key={chave} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      {conforme ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">
                        {chave.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                      </span>
                    </div>
                    <Badge variant={conforme ? "default" : "destructive"}>
                      {conforme ? "Conforme" : "Não Conforme"}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Conformidade Geral</span>
                  <span className="text-sm text-gray-600">
                    {Math.round((Object.values(validacao.conformidade_legal).filter(Boolean).length / 
                                Object.values(validacao.conformidade_legal).length) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={Math.round((Object.values(validacao.conformidade_legal).filter(Boolean).length / 
                                    Object.values(validacao.conformidade_legal).length) * 100)} 
                  className="h-2"
                />
              </div>
            </TabsContent>

            <TabsContent value="evidencias" className="space-y-4">
              {validacao.evidencias_coletadas.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Nenhuma evidência coletada.</p>
              ) : (
                <div className="space-y-3">
                  {validacao.evidencias_coletadas.map((evidencia) => (
                    <div key={evidencia.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {getEvidenciaIcon(evidencia.tipo_evidencia)}
                        <div className="flex-1">
                          <div className="font-medium">
                            {evidencia.tipo_evidencia.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                          </div>
                          <div className="text-sm text-gray-500">
                            Coletada em: {new Date(evidencia.timestamp_coleta).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <Badge variant={evidencia.valida ? "default" : "destructive"}>
                          {evidencia.valida ? "Válida" : "Inválida"}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        Hash: {evidencia.hash_evidencia.substring(0, 32)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="certificado" className="space-y-4">
              {!certificado ? (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Certificado disponível apenas para contratos válidos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-6 rounded-lg border">
                    <div className="flex items-center gap-3 mb-4">
                      <Award className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200">
                          Certificado de Validação Jurídica
                        </h3>
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          Nº {certificado.numero_certificado}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Assinaturas Validadas:</strong> {certificado.assinaturas_validadas}
                      </div>
                      <div>
                        <strong>Evidências Técnicas:</strong> {certificado.evidencias_tecnicas}
                      </div>
                      <div>
                        <strong>Conformidade:</strong> {certificado.conformidade_percentual}%
                      </div>
                      <div>
                        <strong>Válido até:</strong> {new Date(certificado.valido_ate).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  <Button onClick={baixarCertificado} className="w-full">
                    <Award className="h-4 w-4 mr-2" />
                    Baixar Certificado Oficial
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
