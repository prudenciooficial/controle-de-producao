import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, FileText, Key, User, Calendar, Building, RefreshCw, Upload } from 'lucide-react';
import InstrucoesCertificados from './InstrucoesCertificados';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCertificadosDigitais, CertificadoDigital, CertificadoUtils } from '@/hooks/useCertificadosDigitais';
import { ValidacaoJuridicaService } from '@/services/validacaoJuridicaService';



interface AssinaturaInternaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoId: string;
  contratoTitulo: string;
  onAssinaturaCompleta: () => void;
}

export default function AssinaturaInternaModal({
  open,
  onOpenChange,
  contratoId,
  contratoTitulo,
  onAssinaturaCompleta
}: AssinaturaInternaModalProps) {
  const [etapa, setEtapa] = useState<'selecao' | 'senha' | 'assinando' | 'concluido'>('selecao');
  const [certificadoSelecionado, setCertificadoSelecionado] = useState<CertificadoDigital | null>(null);
  const [senha, setSenha] = useState('');
  const [motivoAssinatura, setMotivoAssinatura] = useState('');
  const [assinaturaDigital, setAssinaturaDigital] = useState<string>('');
  const { toast } = useToast();

  // Hook para gerenciar certificados digitais
  const {
    certificados,
    loading: loadingCertificados,
    error: errorCertificados,
    carregarCertificados,
    selecionarCertificadoArquivo,
    validarCertificado,
    assinarDocumento
  } = useCertificadosDigitais();

  useEffect(() => {
    if (open) {
      resetarEstado();
      carregarCertificados();
    }
  }, [open, carregarCertificados]);

  const resetarEstado = () => {
    setEtapa('selecao');
    setCertificadoSelecionado(null);
    setSenha('');
    setMotivoAssinatura('');
    setAssinaturaDigital('');
  };

  const handleSelecionarCertificado = (certificado: CertificadoDigital) => {
    // Verificar se o certificado está válido
    if (!CertificadoUtils.isValido(certificado)) {
      toast({
        variant: "destructive",
        title: "Certificado expirado",
        description: "Este certificado digital está expirado e não pode ser usado.",
      });
      return;
    }

    // Verificar se está próximo do vencimento
    if (CertificadoUtils.isProximoVencimento(certificado)) {
      toast({
        title: "Certificado próximo do vencimento",
        description: "Este certificado expira em menos de 30 dias. Considere renová-lo.",
      });
    }

    setCertificadoSelecionado(certificado);
    setEtapa('senha');
  };

  const validarDados = () => {
    if (!certificadoSelecionado || !senha) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Selecione um certificado e digite a senha.",
      });
      return false;
    }

    if (senha.length < 4) {
      toast({
        variant: "destructive",
        title: "Senha inválida",
        description: "A senha do certificado deve ter pelo menos 4 caracteres.",
      });
      return false;
    }

    return true;
  };

  const realizarAssinatura = async () => {
    if (!validarDados()) return;

    setEtapa('assinando');

    try {
      console.log('Iniciando processo de assinatura...');
      const user = await supabase.auth.getUser();

      if (!user.data.user) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Validando certificado...');
      // Validar certificado com a senha
      const certificadoValido = await validarCertificado(certificadoSelecionado!, senha);
      if (!certificadoValido) {
        console.error('Certificado inválido');
        toast({
          variant: "destructive",
          title: "Certificado inválido",
          description: "Senha incorreta ou certificado inválido.",
        });
        setEtapa('senha');
        return;
      }

      console.log('Realizando assinatura digital...');
      // Realizar assinatura digital
      const assinatura = await assinarDocumento(
        certificadoSelecionado!,
        senha,
        contratoTitulo
      );
      setAssinaturaDigital(assinatura);
      console.log('Assinatura gerada:', assinatura);

      // Coletar evidências técnicas
      console.log('Coletando evidências técnicas...');
      const evidencias = {
        ip_address: await obterIP(),
        user_agent: navigator.userAgent,
        timestamp_assinatura: new Date().toISOString(),
        certificado_dados: {
          nome: certificadoSelecionado!.nome,
          cpf: certificadoSelecionado!.cpf,
          emissor: certificadoSelecionado!.emissor,
          valido_ate: certificadoSelecionado!.validoAte,
          tipo: certificadoSelecionado!.tipo,
          thumbprint: certificadoSelecionado!.thumbprint || 'N/A',
          serialNumber: certificadoSelecionado!.serialNumber || 'N/A'
        },
        assinatura_digital: assinatura
      };
      console.log('Evidências coletadas:', evidencias);

      // Registrar assinatura
      console.log('Registrando assinatura no banco...');
      const dadosAssinatura = {
        contrato_id: contratoId,
        tipo: 'interna_qualificada',
        signatario_nome: certificadoSelecionado!.nome,
        signatario_email: user.data.user?.email || '',
        signatario_documento: certificadoSelecionado!.cpf,
        certificado_dados: evidencias.certificado_dados,
        certificado_valido_ate: certificadoSelecionado!.validoAte,
        ip_address: evidencias.ip_address,
        user_agent: evidencias.user_agent,
        timestamp_assinatura: evidencias.timestamp_assinatura,
        status: 'assinado',
        assinado_em: new Date().toISOString(),
        hash_assinatura: assinatura
      };

      console.log('Dados da assinatura:', dadosAssinatura);

      const { error: assinaturaError } = await supabase
        .from('assinaturas_contratos_comerciais')
        .insert([dadosAssinatura]);

      if (assinaturaError) {
        console.error('Erro ao registrar assinatura:', assinaturaError);
        throw assinaturaError;
      }
      console.log('Assinatura registrada com sucesso');

      // Atualizar status do contrato
      console.log('Atualizando status do contrato...');
      const { error: contratoError } = await supabase
        .from('contratos_comerciais')
        .update({
          status: 'aguardando_assinatura_externa',
          atualizado_em: new Date().toISOString()
        })
        .eq('id', contratoId);

      if (contratoError) {
        console.error('Erro ao atualizar contrato:', contratoError);
        throw contratoError;
      }
      console.log('Status do contrato atualizado');

      // Registrar log de auditoria
      await supabase
        .from('logs_auditoria_contratos_comerciais')
        .insert([{
          contrato_id: contratoId,
          evento: 'assinado_internamente',
          descricao: `Contrato assinado digitalmente por ${certificadoSelecionado!.nome} usando certificado ${certificadoSelecionado!.tipo}`,
          dados_evento: {
            certificado: evidencias.certificado_dados,
            motivo: motivoAssinatura || 'Assinatura digital qualificada'
          },
          ip_address: evidencias.ip_address,
          user_agent: evidencias.user_agent,
          usuario_id: user.data.user?.id
        }]);

      // Coletar evidência jurídica da assinatura digital
      console.log('Coletando evidência jurídica...');
      await ValidacaoJuridicaService.coletarEvidenciaAssinaturaDigital(contratoId, {
        certificado_dados: evidencias.certificado_dados,
        hash_assinatura: assinatura,
        timestamp_assinatura: evidencias.timestamp_assinatura,
        ip_address: evidencias.ip_address,
        user_agent: evidencias.user_agent,
        signatario_nome: certificadoSelecionado!.nome
      });
      console.log('Evidência jurídica coletada');

      setEtapa('concluido');
      
      toast({
        title: 'Assinatura realizada com sucesso!',
        description: 'O contrato foi assinado digitalmente e está aguardando assinatura externa.'
      });

      // Aguardar um pouco antes de fechar e notificar
      setTimeout(() => {
        onAssinaturaCompleta();
        onOpenChange(false);
      }, 2000);

    } catch (error) {
      console.error('Erro ao realizar assinatura:', error);
      toast({
        variant: "destructive",
        title: "Erro na assinatura",
        description: error instanceof Error ? error.message : "Erro ao realizar assinatura digital.",
      });
      setEtapa('senha');
    }
  };

  const obterIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '127.0.0.1';
    }
  };

  const renderEtapaSelecao = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Shield className="h-12 w-12 text-blue-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold">Assinatura Digital Qualificada</h3>
        <p className="text-sm text-gray-600">
          Selecione seu certificado digital ICP-Brasil para assinar o contrato
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-blue-800 dark:text-blue-200">Contrato:</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">{contratoTitulo}</p>
      </div>

      {loadingCertificados ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando certificados digitais...</p>
          <p className="text-sm text-gray-500 mt-1">
            Aguarde enquanto verificamos os certificados disponíveis
          </p>
        </div>
      ) : certificados.length === 0 ? (
        <div className="text-center py-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
              Selecione seu Certificado Digital
            </h3>

            {/* Mostrar mensagem de erro se houver */}
            {errorCertificados && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  {errorCertificados}
                </p>
              </div>
            )}

            <p className="text-blue-700 dark:text-blue-300 mb-4">
              {errorCertificados
                ? 'Por favor, selecione seu arquivo .pfx para continuar:'
                : 'Nenhum certificado foi encontrado automaticamente no sistema. Por favor, selecione seu arquivo .pfx para continuar:'
              }
            </p>

            <div className="space-y-3">
              <Button
                onClick={selecionarCertificadoArquivo}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                disabled={loadingCertificados}
              >
                <Upload className="h-4 w-4 mr-2" />
                {loadingCertificados ? 'Carregando...' : 'Selecionar Arquivo .PFX'}
              </Button>

              <div className="text-xs text-blue-600 dark:text-blue-400">
                <p>Formatos aceitos: .pfx, .p12</p>
              </div>

              <Button
                onClick={carregarCertificados}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-300"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Detectar Novamente
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Informações sobre os certificados carregados */}
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="text-green-800 dark:text-green-200 font-medium">
                  Certificados Digitais Carregados
                </p>
                <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                  {certificados.some(cert => cert.id.startsWith('file-') || cert.id.startsWith('pfx-'))
                    ? 'Certificados carregados de arquivo. Use a senha real do seu certificado .pfx.'
                    : 'Certificados detectados no sistema. Use a senha real do seu certificado digital.'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Certificados Disponíveis ({certificados.length})</Label>
              <div className="flex gap-2">
                <InstrucoesCertificados />
                <Button
                  onClick={selecionarCertificadoArquivo}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Adicionar Arquivo
                </Button>
              </div>
            </div>
            {certificados.map((cert) => (
            <div
              key={cert.id}
              className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              onClick={() => handleSelecionarCertificado(cert)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{cert.nome}</span>
                    <Badge variant={cert.tipo === 'A3' ? 'default' : 'secondary'}>
                      {cert.tipo}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Key className="h-3 w-3" />
                      <span>CPF: {cert.cpf}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-3 w-3" />
                      <span>Emissor: {cert.emissor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Válido até: {new Date(cert.validoAte).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderEtapaSenha = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Key className="h-12 w-12 text-green-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold">Autenticação do Certificado</h3>
        <p className="text-sm text-gray-600">
          {errorCertificados ?
            'Digite a senha do certificado (para teste, use: 123456)' :
            'Digite a senha real do seu certificado digital'
          }
        </p>
      </div>

      {certificadoSelecionado && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-800 dark:text-green-200">Certificado Selecionado:</span>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300">
            {certificadoSelecionado.nome} - {certificadoSelecionado.tipo}
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="senha">Senha do Certificado *</Label>
        <Input
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Digite a senha do certificado"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="motivo">Motivo da Assinatura (Opcional)</Label>
        <Textarea
          id="motivo"
          value={motivoAssinatura}
          onChange={(e) => setMotivoAssinatura(e.target.value)}
          placeholder="Ex: Aprovação de contrato comercial"
          rows={3}
          className="mt-1"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => setEtapa('selecao')} className="flex-1">
          Voltar
        </Button>
        <Button onClick={realizarAssinatura} disabled={!senha} className="flex-1">
          Assinar Digitalmente
        </Button>
      </div>
    </div>
  );

  const renderEtapaAssinando = () => (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <h3 className="text-lg font-semibold mb-2">Realizando Assinatura Digital</h3>
      <p className="text-sm text-gray-600">
        Processando certificado e aplicando assinatura qualificada...
      </p>
    </div>
  );

  const renderEtapaConcluido = () => (
    <div className="text-center py-8">
      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-green-800 mb-2">Assinatura Realizada com Sucesso!</h3>
      <p className="text-sm text-gray-600 mb-4">
        O contrato foi assinado digitalmente e está aguardando assinatura externa.
      </p>
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <p className="text-sm text-green-700 dark:text-green-300">
          Um email será enviado automaticamente para o signatário externo com as instruções para assinatura.
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assinatura Digital Interna</DialogTitle>
          <DialogDescription>
            Assinatura eletrônica qualificada com certificado digital ICP-Brasil
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {etapa === 'selecao' && renderEtapaSelecao()}
          {etapa === 'senha' && renderEtapaSenha()}
          {etapa === 'assinando' && renderEtapaAssinando()}
          {etapa === 'concluido' && renderEtapaConcluido()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
