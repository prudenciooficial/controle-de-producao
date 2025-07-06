import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash, 
  Clock,
  CheckCircle,
  AlertCircle,
  PenTool,
  Download,
  BarChart3,
  Printer,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  buscarContratos,
  buscarModelosContratos,
  criarContrato,
  atualizarContrato,
  excluirContrato,
  buscarEstatisticasComercial,
  finalizarContratoEIniciarAssinaturas,
  assinarInternamente
} from '@/services/commercialService';
import type { 
  Contrato, 
  StatusContrato, 
  FiltrosContrato, 
  EstatisticasComercial,
  ModeloContrato,
  DadosCriarContrato,
  VariavelContrato
} from '@/types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const statusConfig = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800', icon: Edit },
  aguardando_assinatura_interna: { label: 'Aguardando Assinatura Interna', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  aguardando_assinatura_externa: { label: 'Aguardando Assinatura Externa', color: 'bg-blue-100 text-blue-800', icon: PenTool },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: AlertCircle }
};

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasComercial | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosContrato>({});
  const [showNovoContrato, setShowNovoContrato] = useState(false);
  const [showEditarContrato, setShowEditarContrato] = useState(false);
  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null);
  const [showVisualizarContrato, setShowVisualizarContrato] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados para novo contrato
  const [novoContrato, setNovoContrato] = useState<DadosCriarContrato>({
    modeloId: '',
    titulo: '',
    dadosVariaveis: {},
    assinanteExternoNome: '',
    assinanteExternoEmail: '',
    assinanteExternoDocumento: ''
  });

  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloContrato | null>(null);

  useEffect(() => {
    carregarDados();
  }, [filtros]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [contratosData, modelosData, estatisticasData] = await Promise.all([
        buscarContratos(filtros),
        buscarModelosContratos(),
        buscarEstatisticasComercial()
      ]);

      setContratos(contratosData.contratos);
      setModelos(modelosData);
      setEstatisticas(estatisticasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do módulo comercial',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarModelo = (modeloId: string) => {
    const modelo = modelos.find(m => m.id === modeloId);
    if (modelo) {
      setModeloSelecionado(modelo);
      setNovoContrato(prev => ({
        ...prev,
        modeloId,
        titulo: `Contrato - ${modelo.nome}`,
        dadosVariaveis: {}
      }));
    }
  };

  const handleVariavelChange = (nomeVariavel: string, valor: string | number | boolean | Date) => {
    setNovoContrato(prev => ({
      ...prev,
      dadosVariaveis: {
        ...prev.dadosVariaveis,
        [nomeVariavel]: valor
      }
    }));
  };

  const handleCriarContrato = async () => {
    try {
      if (!modeloSelecionado) {
        toast({
          title: 'Erro',
          description: 'Selecione um modelo de contrato',
          variant: 'destructive'
        });
        return;
      }

      // Validar variáveis obrigatórias
      const variaveisObrigatorias = modeloSelecionado.variaveis.filter(v => v.obrigatorio);
      const variaveisFaltando = variaveisObrigatorias.filter(v => !novoContrato.dadosVariaveis[v.nome]);

      if (variaveisFaltando.length > 0) {
        toast({
          title: 'Campos obrigatórios',
          description: `Preencha os campos: ${variaveisFaltando.map(v => v.rotulo).join(', ')}`,
          variant: 'destructive'
        });
        return;
      }

      await criarContrato(novoContrato);
      
      toast({
        title: 'Sucesso',
        description: 'Contrato criado com sucesso!'
      });

      setShowNovoContrato(false);
      setNovoContrato({
        modeloId: '',
        titulo: '',
        dadosVariaveis: {},
        assinanteExternoNome: '',
        assinanteExternoEmail: '',
        assinanteExternoDocumento: ''
      });
      setModeloSelecionado(null);
      carregarDados();
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar contrato',
        variant: 'destructive'
      });
    }
  };

  const handleFinalizarContrato = async (contrato: Contrato) => {
    try {
      // Obter usuário atual para usar como assinante interno se não estiver definido
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Usuário não autenticado',
          variant: 'destructive'
        });
        return;
      }

      await finalizarContratoEIniciarAssinaturas({
        contratoId: contrato.id,
        conteudoFinal: contrato.conteudo,
        assinanteInternoId: contrato.assinanteInternoId || user.id
      });

      toast({
        title: 'Sucesso',
        description: 'Contrato finalizado e enviado para assinatura interna!'
      });

      carregarDados();
    } catch (error) {
      console.error('Erro ao finalizar contrato:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao finalizar contrato',
        variant: 'destructive'
      });
    }
  };

  const handleAssinarInternamente = async (contrato: Contrato) => {
    try {
      await assinarInternamente({
        contratoId: contrato.id,
        certificadoSelecionado: null,
        senhaPrivada: '',
        motivoAssinatura: 'Assinatura interna do contrato'
      });

      toast({
        title: 'Sucesso',
        description: 'Contrato assinado internamente! Token enviado para o cliente.'
      });

      carregarDados();
    } catch (error) {
      console.error('Erro ao assinar contrato:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao assinar contrato',
        variant: 'destructive'
      });
    }
  };

  const handleImprimirContrato = (contratoId: string) => {
    const printUrl = `/print/contrato/${contratoId}`;
    window.open(printUrl, '_blank');
  };

  const handleBaixarContrato = (contratoId: string) => {
    const printUrl = `/print/contrato/${contratoId}`;
    window.open(printUrl, '_blank');
  };

  const handleEditarContrato = (contrato: Contrato) => {
    setContratoSelecionado(contrato);
    setNovoContrato({
      modeloId: contrato.modeloId,
      titulo: contrato.titulo,
      dadosVariaveis: contrato.dadosVariaveis,
      assinanteExternoNome: contrato.assinanteExternoNome || '',
      assinanteExternoEmail: contrato.assinanteExternoEmail,
      assinanteExternoDocumento: contrato.assinanteExternoDocumento || ''
    });
    const modelo = modelos.find(m => m.id === contrato.modeloId);
    if (modelo) {
      setModeloSelecionado(modelo);
    }
    setShowEditarContrato(true);
  };

  const handleAtualizarContrato = async () => {
    try {
      if (!contratoSelecionado || !modeloSelecionado) {
        toast({
          title: 'Erro',
          description: 'Dados do contrato não encontrados',
          variant: 'destructive'
        });
        return;
      }

      // Validar variáveis obrigatórias
      const variaveisObrigatorias = modeloSelecionado.variaveis.filter(v => v.obrigatorio);
      const variaveisFaltando = variaveisObrigatorias.filter(v => !novoContrato.dadosVariaveis[v.nome]);

      if (variaveisFaltando.length > 0) {
        toast({
          title: 'Campos obrigatórios',
          description: `Preencha os campos: ${variaveisFaltando.map(v => v.rotulo).join(', ')}`,
          variant: 'destructive'
        });
        return;
      }

      await atualizarContrato(contratoSelecionado.id, novoContrato);
      
      toast({
        title: 'Sucesso',
        description: 'Contrato atualizado com sucesso!'
      });

      setShowEditarContrato(false);
      setContratoSelecionado(null);
      setNovoContrato({
        modeloId: '',
        titulo: '',
        dadosVariaveis: {},
        assinanteExternoNome: '',
        assinanteExternoEmail: '',
        assinanteExternoDocumento: ''
      });
      setModeloSelecionado(null);
      carregarDados();
    } catch (error) {
      console.error('Erro ao atualizar contrato:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar contrato',
        variant: 'destructive'
      });
    }
  };

  const handleExcluirContrato = async (contrato: Contrato) => {
    if (!confirm(`Tem certeza que deseja excluir o contrato "${contrato.titulo}"?`)) {
      return;
    }

    try {
      await excluirContrato(contrato.id);
      toast({
        title: 'Sucesso',
        description: 'Contrato excluído com sucesso!'
      });
      carregarDados();
    } catch (error: unknown) {
      console.error('Erro ao excluir contrato:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir contrato',
        variant: 'destructive'
      });
    }
  };

  const renderVariavelInput = (variavel: VariavelContrato) => {
    const valor = novoContrato.dadosVariaveis[variavel.nome] || '';

    switch (variavel.tipo) {
      case 'textarea':
        return (
          <Textarea
            value={String(valor)}
            onChange={(e) => handleVariavelChange(variavel.nome, e.target.value)}
            placeholder={variavel.placeholder}
            rows={3}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={String(valor)}
            onChange={(e) => handleVariavelChange(variavel.nome, e.target.value)}
          />
        );
      case 'currency':
        return (
          <Input
            type="number"
            step="0.01"
            value={String(valor)}
            onChange={(e) => handleVariavelChange(variavel.nome, parseFloat(e.target.value) || 0)}
            placeholder={variavel.placeholder}
          />
        );
      case 'select':
        return (
          <Select
            value={String(valor)}
            onValueChange={(value) => handleVariavelChange(variavel.nome, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {variavel.opcoes?.map(opcao => (
                <SelectItem key={opcao} value={opcao}>
                  {opcao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            type={variavel.tipo}
            value={String(valor)}
            onChange={(e) => handleVariavelChange(variavel.nome, e.target.value)}
            placeholder={variavel.placeholder}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Módulo Comercial
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gestão de contratos com assinaturas digitais
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate('/comercial/modelos')}
            className="inline-flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Modelos
          </Button>
          <Button 
            onClick={() => setShowNovoContrato(true)} 
            className="inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Contrato
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Contratos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.totalContratos}</div>
              <p className="text-xs text-muted-foreground">
                +{estatisticas.crescimentoMensal}% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.contratosConcluidos}</div>
              <p className="text-xs text-muted-foreground">
                Tempo médio: {estatisticas.tempoMedioConclusao} dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Assinatura</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.assinaturasPendentes}</div>
              <p className="text-xs text-muted-foreground">
                Requer atenção
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
              <Edit className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.rascunhos}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando finalização
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Número, título ou cliente..."
                  className="pl-10"
                  value={filtros.termoBusca || ''}
                  onChange={(e) => setFiltros(prev => ({ ...prev, termoBusca: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={filtros.status?.[0] || 'todos'}
                onValueChange={(value) => 
                  setFiltros(prev => ({ 
                    ...prev, 
                    status: value === 'todos' ? undefined : [value as StatusContrato] 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="aguardando_assinatura_interna">Aguardando Assinatura Interna</SelectItem>
                  <SelectItem value="aguardando_assinatura_externa">Aguardando Assinatura Externa</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => setFiltros({})}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contratos */}
      <Card>
        <CardHeader>
          <CardTitle>Contratos ({contratos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {contratos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Nenhum contrato encontrado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Comece criando seu primeiro contrato
              </p>
              <Button onClick={() => setShowNovoContrato(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Contrato
              </Button>
            </div>
          ) : (
            <>
              {/* Tabela para desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Número</th>
                      <th className="text-left p-2">Título</th>
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Criado em</th>
                      <th className="text-left p-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contratos.map((contrato) => {
                      const StatusIcon = statusConfig[contrato.status].icon;
                      return (
                        <tr key={contrato.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-2 font-mono text-sm">{contrato.numeroContrato}</td>
                          <td className="p-2 font-medium">{contrato.titulo}</td>
                          <td className="p-2">
                            <div>
                              <div className="font-medium">{contrato.assinanteExternoNome}</div>
                              <div className="text-sm text-gray-500">{contrato.assinanteExternoEmail}</div>
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge className={statusConfig[contrato.status].color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig[contrato.status].label}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm text-gray-500">
                            {contrato.criadoEm.toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => { setContratoSelecionado(contrato); setShowVisualizarContrato(true); }}
                                title="Visualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleImprimirContrato(contrato.id)}
                                title="Imprimir/PDF"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                              {contrato.status === 'rascunho' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="flex-1"
                                    onClick={() => handleFinalizarContrato(contrato)}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Finalizar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => handleExcluirContrato(contrato)}
                                  >
                                    <Trash className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {contrato.status === 'aguardando_assinatura_interna' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleAssinarInternamente(contrato)}
                                  title="Assinar Internamente"
                                >
                                  <PenTool className="w-4 h-4" />
                                </Button>
                              )}
                              {contrato.status === 'concluido' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleBaixarContrato(contrato.id)}
                                  title="Baixar PDF Final"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards para mobile */}
              <div className="md:hidden space-y-4">
                {contratos.map((contrato) => {
                  const StatusIcon = statusConfig[contrato.status].icon;
                  return (
                    <Card key={contrato.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium">{contrato.titulo}</h3>
                            <p className="text-sm text-gray-500 font-mono">{contrato.numeroContrato}</p>
                          </div>
                          <Badge className={statusConfig[contrato.status].color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[contrato.status].label}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Cliente: </span>
                            {contrato.assinanteExternoNome}
                          </div>
                          <div>
                            <span className="font-medium">E-mail: </span>
                            {contrato.assinanteExternoEmail}
                          </div>
                          <div>
                            <span className="font-medium">Criado em: </span>
                            {contrato.criadoEm.toLocaleDateString('pt-BR')}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1" 
                            onClick={() => { setContratoSelecionado(contrato); setShowVisualizarContrato(true); }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleImprimirContrato(contrato.id)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          {contrato.status === 'rascunho' && (
                            <>
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleFinalizarContrato(contrato)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Finalizar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleExcluirContrato(contrato)}
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {contrato.status === 'aguardando_assinatura_interna' && (
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleAssinarInternamente(contrato)}
                            >
                              <PenTool className="w-4 h-4 mr-1" />
                              Assinar
                            </Button>
                          )}
                          {contrato.status === 'concluido' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleBaixarContrato(contrato.id)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Novo Contrato */}
      <Dialog open={showNovoContrato} onOpenChange={setShowNovoContrato}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Seleção de Modelo */}
            <div>
              <Label>Modelo de Contrato *</Label>
              <Select
                value={novoContrato.modeloId}
                onValueChange={handleSelecionarModelo}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {modelos.map(modelo => (
                    <SelectItem key={modelo.id} value={modelo.id}>
                      <div>
                        <div className="font-medium">{modelo.nome}</div>
                        {modelo.descricao && (
                          <div className="text-sm text-gray-500">{modelo.descricao}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dados Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Título do Contrato *</Label>
                <Input
                  value={novoContrato.titulo}
                  onChange={(e) => setNovoContrato(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Contrato de Prestação de Serviços - Cliente X"
                />
              </div>
            </div>

            {/* Dados do Cliente */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados do Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={novoContrato.assinanteExternoNome}
                    onChange={(e) => setNovoContrato(prev => ({ ...prev, assinanteExternoNome: e.target.value }))}
                    placeholder="Nome completo ou razão social"
                  />
                </div>
                <div>
                  <Label>E-mail do Cliente *</Label>
                  <Input
                    type="email"
                    value={novoContrato.assinanteExternoEmail}
                    onChange={(e) => setNovoContrato(prev => ({ ...prev, assinanteExternoEmail: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={novoContrato.assinanteExternoDocumento}
                    onChange={(e) => setNovoContrato(prev => ({ ...prev, assinanteExternoDocumento: e.target.value }))}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>
              </div>
            </div>

            {/* Variáveis do Modelo */}
            {modeloSelecionado && modeloSelecionado.variaveis.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dados do Contrato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modeloSelecionado.variaveis.map(variavel => (
                    <div key={variavel.nome}>
                      <Label>
                        {variavel.rotulo}
                        {variavel.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {renderVariavelInput(variavel)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowNovoContrato(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCriarContrato}
                disabled={!novoContrato.modeloId || !novoContrato.titulo || !novoContrato.assinanteExternoNome || !novoContrato.assinanteExternoEmail}
              >
                Criar Contrato
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar Contrato */}
      <Dialog open={showVisualizarContrato} onOpenChange={setShowVisualizarContrato}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Contrato</DialogTitle>
          </DialogHeader>
          {contratoSelecionado ? (
            <div className="space-y-4">
              <div>
                <strong>Título:</strong> {contratoSelecionado.titulo}
              </div>
              <div>
                <strong>Status:</strong> {statusConfig[contratoSelecionado.status].label}
              </div>
              <div>
                <strong>Conteúdo:</strong>
                <div className="border rounded p-2 bg-gray-50 whitespace-pre-line mt-1">
                  {contratoSelecionado.conteudo}
                </div>
              </div>
              {contratoSelecionado.urlPdf && (
                <div>
                  <a
                    href={contratoSelecionado.urlPdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Baixar PDF
                  </a>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleImprimirContrato(contratoSelecionado.id)}
                  className="inline-flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Visualizar Impressão
                </Button>
              </div>
            </div>
          ) : (
            <div>Selecione um contrato para visualizar.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Editar Contrato */}
      <Dialog open={showEditarContrato} onOpenChange={setShowEditarContrato}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Contrato</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Dados Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Título do Contrato *</Label>
                <Input
                  value={novoContrato.titulo}
                  onChange={(e) => setNovoContrato(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Contrato de Prestação de Serviços - Cliente X"
                />
              </div>
            </div>

            {/* Dados do Cliente */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados do Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={novoContrato.assinanteExternoNome}
                    onChange={(e) => setNovoContrato(prev => ({ ...prev, assinanteExternoNome: e.target.value }))}
                    placeholder="Nome completo ou razão social"
                  />
                </div>
                <div>
                  <Label>E-mail do Cliente *</Label>
                  <Input
                    type="email"
                    value={novoContrato.assinanteExternoEmail}
                    onChange={(e) => setNovoContrato(prev => ({ ...prev, assinanteExternoEmail: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={novoContrato.assinanteExternoDocumento}
                    onChange={(e) => setNovoContrato(prev => ({ ...prev, assinanteExternoDocumento: e.target.value }))}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>
              </div>
            </div>

            {/* Variáveis do Modelo */}
            {modeloSelecionado && modeloSelecionado.variaveis.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dados do Contrato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modeloSelecionado.variaveis.map(variavel => (
                    <div key={variavel.nome}>
                      <Label>
                        {variavel.rotulo}
                        {variavel.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {renderVariavelInput(variavel)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowEditarContrato(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleAtualizarContrato}
                disabled={!novoContrato.titulo || !novoContrato.assinanteExternoNome || !novoContrato.assinanteExternoEmail}
              >
                Atualizar Contrato
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
