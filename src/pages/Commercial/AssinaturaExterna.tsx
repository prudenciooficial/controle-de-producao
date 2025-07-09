import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  MapPin,
  Clock,
  User,
  Mail,
  FileCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TokenVerificacaoService, type ResultadoValidacaoToken } from '@/services/tokenVerificacaoService';
import type {
  Contrato
} from '@/types/index';

export default function AssinaturaExterna() {
  const { contratoId } = useParams<{ contratoId: string }>();
  const [searchParams] = useSearchParams();
  const tokenUrl = searchParams.get('token');
  
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [token, setToken] = useState(tokenUrl || '');
  const [tokenValidado, setTokenValidado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assinando, setAssinando] = useState(false);
  const [mostrarContrato, setMostrarContrato] = useState(false);
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [geolocalizacao, setGeolocalizacao] = useState<{
    latitude: number;
    longitude: number;
    precisao: number;
  } | null>(null);
  const [contratoAssinado, setContratoAssinado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tempoRestante, setTempoRestante] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
    // Solicitar geolocalização (opcional)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocalizacao({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            precisao: position.coords.accuracy
          });
        },
        (error) => {
          console.log('Geolocalização não disponível:', error);
        }
      );
    }
  }, []);

  const handleValidarToken = async () => {
    if (!contratoId || !token) {
      setErro('Token ou ID do contrato não fornecido');
      return;
    }

    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      setErro('Token deve conter exatamente 6 dígitos');
      return;
    }

    try {
      setLoading(true);
      setErro(null);
      
      // Obter IP e user agent
      const ipAddress = await TokenVerificacaoService.obterIP();
      const userAgent = navigator.userAgent;

      const resultado: ResultadoValidacaoToken = await TokenVerificacaoService.validarToken(
        contratoId,
        token,
        ipAddress,
        userAgent
      );
      
      if (resultado.valido) {
        // Buscar dados do contrato
        const contratoData = await TokenVerificacaoService.buscarContratoPorId(contratoId);

        if (contratoData) {
          setTokenValidado(true);
          setContrato(contratoData);
          setMostrarContrato(true);
          toast({
            title: 'Token válido!',
            description: 'Você pode agora visualizar e assinar o contrato.'
          });
        } else {
          setErro('Contrato não encontrado ou não disponível para assinatura');
          toast({
            title: 'Contrato não encontrado',
            description: 'O contrato não está disponível para assinatura.',
            variant: 'destructive'
          });
        }
      } else {
        setErro(resultado.erro || 'Token inválido');
        toast({
          title: 'Token inválido',
          description: resultado.erro || 'Token inválido',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      setErro('Erro interno. Tente novamente.');
      toast({
        title: 'Erro',
        description: 'Erro ao validar token. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssinarContrato = async () => {
    if (!contratoId || !token || !contrato || !aceitaTermos) {
      toast({
        title: 'Erro',
        description: 'Você deve aceitar os termos para assinar o contrato',
        variant: 'destructive'
      });
      return;
    }

    try {
      setAssinando(true);
      
      // Obter dados para assinatura
      const ipAddress = await TokenVerificacaoService.obterIP();
      const userAgent = navigator.userAgent;

      await TokenVerificacaoService.registrarAssinaturaExterna(contratoId, {
        signatario_nome: contrato.assinante_externo_nome,
        signatario_email: contrato.assinante_externo_email,
        signatario_documento: contrato.assinante_externo_documento,
        ip_address: ipAddress,
        user_agent: userAgent,
        token_validado: token
      });

      setContratoAssinado(true);
      toast({
        title: 'Contrato assinado!',
        description: 'Sua assinatura foi registrada com sucesso. O contrato foi concluído.'
      });
    } catch (error) {
      console.error('Erro ao assinar contrato:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao assinar contrato. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setAssinando(false);
    }
  };

  if (contratoAssinado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Contrato Assinado!
            </h2>
            <p className="text-gray-600 mb-4">
              Sua assinatura foi registrada com sucesso. O contrato foi concluído e todas as partes foram notificadas.
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300">
              <p><strong>Contrato:</strong> {contrato?.numero_contrato || contrato?.numeroContrato || 'N/A'}</p>
              <p><strong>Data:</strong> {new Date().toLocaleString('pt-BR')}</p>
              <p><strong>Status:</strong> Concluído</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Assinatura de Contrato
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema de assinatura eletrônica segura
          </p>
        </div>

        {/* Validação de Token */}
        {!tokenValidado && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Validação de Segurança
              </CardTitle>
              <CardDescription>
                Para acessar o contrato, insira o código de verificação de 6 dígitos enviado para seu e-mail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="token">Código de Verificação</Label>
                  <Input
                    id="token"
                    type="text"
                    placeholder="000000"
                    value={token}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setToken(valor);
                      setErro(null);
                    }}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Digite o código de 6 dígitos recebido por e-mail
                  </p>
                </div>

                {erro && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{erro}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleValidarToken}
                  disabled={loading || token.length !== 6}
                  className="w-full"
                >
                  {loading ? 'Validando...' : 'Validar Código'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações do Contrato */}
        {tokenValidado && contrato && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5" />
                  Informações do Contrato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Número do Contrato</Label>
                    <p className="font-mono text-lg dark:text-gray-100">
                      {contrato.numero_contrato || contrato.numeroContrato || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Título</Label>
                    <p className="font-medium dark:text-gray-100">{contrato.titulo}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</Label>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="dark:text-gray-100">
                        {contrato.assinante_externo_nome || contrato.assinanteExternoNome || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">E-mail</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="dark:text-gray-100">
                        {contrato.assinante_externo_email || contrato.assinanteExternoEmail || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</Label>
                    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      Aguardando sua assinatura
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Criação</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="dark:text-gray-100">
                        {(contrato.criado_em || contrato.criadoEm)
                          ? new Date(contrato.criado_em || contrato.criadoEm).toLocaleDateString('pt-BR')
                          : 'Data não disponível'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visualização do Contrato */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Conteúdo do Contrato</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMostrarContrato(!mostrarContrato)}
                  >
                    {mostrarContrato ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {mostrarContrato && (
                <CardContent>
                  <div className="bg-white border rounded-lg p-6 max-h-96 overflow-y-auto">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {contrato.conteudo}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Termos e Assinatura */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Assinatura Eletrônica
                </CardTitle>
                <CardDescription>
                  Ao assinar este contrato, você concorda com todos os termos e condições apresentados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Informações de Segurança */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Informações de Segurança</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• Sua assinatura será registrada com data e hora exatas</p>
                      <p>• Serão coletadas evidências técnicas (IP, navegador, etc.)</p>
                      <p>• O documento possui hash de integridade para verificação</p>
                      {geolocalizacao && (
                        <p className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Localização confirmada para maior segurança
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Aceite de Termos */}
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="aceita-termos"
                      checked={aceitaTermos}
                      onCheckedChange={(checked) => setAceitaTermos(checked === true)}
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="aceita-termos"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Aceito os termos e condições deste contrato
                      </Label>
                      <p className="text-xs text-gray-500">
                        Declaro que li, compreendi e aceito todos os termos apresentados neste contrato. 
                        Entendo que esta assinatura eletrônica tem validade jurídica equivalente à assinatura manuscrita.
                      </p>
                    </div>
                  </div>

                  {/* Botão de Assinatura */}
                  <Button
                    onClick={handleAssinarContrato}
                    disabled={!aceitaTermos || assinando}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    {assinando ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processando Assinatura...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Assinar Contrato Eletronicamente
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Esta assinatura está protegida por tecnologia de segurança avançada e 
                    atende aos requisitos da Lei 14.063/2020 sobre assinaturas eletrônicas.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
} 