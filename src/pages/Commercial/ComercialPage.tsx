import React, { useState, useEffect } from 'react';
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Eye, Edit, Trash2, Search, Filter, Calendar, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { TestComercialModule } from '@/utils/testComercialModule';
import { AuditoriaService } from '@/services/auditoriaService';

interface ContratoComercial {
  id: string;
  titulo: string;
  status: string;
  assinante_externo_nome: string;
  assinante_externo_email: string;
  assinante_externo_documento: string;
  criado_em: string;
  atualizado_em: string;
  finalizado_em?: string;
  modelo: {
    nome: string;
  };
  assinante_interno: {
    nome?: string;
    email?: string;
  } | null;
  assinaturas?: Array<{
    tipo: string;
    status: string;
    assinado_em?: string;
  }>;
}

const statusConfig = {
  editando: {
    label: 'Editando',
    color: 'bg-gray-100 text-gray-800',
    icon: Edit
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

export default function ComercialPage() {
  const [contratos, setContratos] = useState<ContratoComercial[]>([]);
  const [contratosFiltrados, setContratosFiltrados] = useState<ContratoComercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [criandoExemplo, setCriandoExemplo] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    editando: 0,
    aguardando_interna: 0,
    aguardando_externa: 0,
    concluidos: 0,
    cancelados: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadContratos();
    diagnosticarModulo();
  }, []);

  const diagnosticarModulo = async () => {
    try {
      const diagnostico = await TestComercialModule.diagnosticar();
      console.log('Diagnóstico do módulo comercial:', diagnostico);

      if (diagnostico.erros.length > 0) {
        console.error('Erros encontrados:', diagnostico.erros);
        toast({
          variant: "destructive",
          title: "Módulo Comercial não configurado",
          description: "Execute a migração SQL no Supabase Dashboard para criar as tabelas necessárias.",
        });
      }
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
    }
  };

  const criarDadosExemplo = async () => {
    setCriandoExemplo(true);
    try {
      await TestComercialModule.criarDadosExemplo();
      toast({
        title: "Dados de exemplo criados!",
        description: "Modelo e contrato de exemplo foram criados com sucesso.",
      });
      loadContratos();
    } catch (error) {
      console.error('Erro ao criar dados de exemplo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar dados de exemplo.",
      });
    } finally {
      setCriandoExemplo(false);
    }
  };

  useEffect(() => {
    filtrarContratos();
  }, [contratos, searchTerm, statusFilter]);

  const filtrarContratos = () => {
    let filtered = [...contratos];

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(contrato =>
        contrato.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrato.assinante_externo_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrato.assinante_externo_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrato.modelo?.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(contrato => contrato.status === statusFilter);
    }

    setContratosFiltrados(filtered);
  };

  const loadContratos = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos_comerciais')
        .select(`
          *,
          modelo:modelo_id(nome),
          assinaturas:assinaturas_contratos_comerciais(
            tipo,
            status,
            assinado_em
          )
        `)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      setContratos(data || []);

      // Calcular estatísticas
      const total = data?.length || 0;
      const editando = data?.filter(c => c.status === 'editando').length || 0;
      const aguardando_interna = data?.filter(c => c.status === 'aguardando_assinatura_interna').length || 0;
      const aguardando_externa = data?.filter(c => c.status === 'aguardando_assinatura_externa').length || 0;
      const concluidos = data?.filter(c => c.status === 'concluido').length || 0;
      const cancelados = data?.filter(c => c.status === 'cancelado').length || 0;

      setStats({
        total,
        editando,
        aguardando_interna,
        aguardando_externa,
        concluidos,
        cancelados
      });

    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar contratos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirContrato = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return;

    try {
      const user = await supabase.auth.getUser();

      const { error } = await supabase
        .from('contratos_comerciais')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Registrar evento de auditoria
      await AuditoriaService.registrarEvento(
        id,
        'contrato_excluido',
        'Contrato removido do sistema',
        { motivo: 'exclusao_usuario' },
        user.data.user?.id
      );

      toast({
        title: 'Sucesso',
        description: 'Contrato excluído com sucesso!'
      });

      loadContratos();
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir contrato.",
      });
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

  const getProgressInfo = (contrato: ContratoComercial) => {
    const steps = [
      { key: 'editando', label: 'Criação' },
      { key: 'aguardando_assinatura_interna', label: 'Assinatura Interna' },
      { key: 'aguardando_assinatura_externa', label: 'Assinatura Externa' },
      { key: 'concluido', label: 'Concluído' }
    ];

    const currentStepIndex = steps.findIndex(step => step.key === contrato.status);
    const progress = contrato.status === 'concluido' ? 100 :
                    contrato.status === 'cancelado' ? 0 :
                    ((currentStepIndex + 1) / steps.length) * 100;

    return { steps, currentStepIndex, progress };
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
          <p className="text-gray-600">Carregando contratos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Módulo Comercial</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie contratos e assinaturas eletrônicas
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/comercial/modelos')}>
            <FileText className="h-4 w-4 mr-2" />
            Modelos
          </Button>
          <Button onClick={() => navigate('/comercial/novo-contrato')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por título, signatário, email ou modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="editando">Editando</SelectItem>
                  <SelectItem value="aguardando_assinatura_interna">Aguard. Interna</SelectItem>
                  <SelectItem value="aguardando_assinatura_externa">Aguard. Externa</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Editando</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.editando}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Aguard. Interna</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.aguardando_interna}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Aguard. Externa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.aguardando_externa}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.concluidos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Cancelados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Contratos */}
      <Card>
        <CardHeader>
          <CardTitle>Contratos</CardTitle>
          <CardDescription>
            Lista de todos os contratos criados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contratosFiltrados.length === 0 && contratos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum contrato encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Comece criando seu primeiro contrato.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate('/comercial/novo-contrato')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Contrato
                </Button>
                <Button
                  variant="outline"
                  onClick={criarDadosExemplo}
                  disabled={criandoExemplo}
                >
                  {criandoExemplo ? 'Criando...' : 'Criar Dados de Exemplo'}
                </Button>
              </div>
            </div>
          ) : contratosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-300">
                Nenhum contrato encontrado com os filtros aplicados.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('todos');
                }}
                className="mt-2"
              >
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {contratosFiltrados.map((contrato) => {
                const progressInfo = getProgressInfo(contrato);
                return (
                <div
                  key={contrato.id}
                  className="border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {contrato.titulo}
                          </h3>
                          {getStatusBadge(contrato.status)}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progresso</span>
                            <span>{Math.round(progressInfo.progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                contrato.status === 'concluido' ? 'bg-green-500' :
                                contrato.status === 'cancelado' ? 'bg-red-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${progressInfo.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span><strong>Modelo:</strong> {contrato.modelo?.nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span><strong>Signatário Externo:</strong> {contrato.assinante_externo_nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <span><strong>Documento:</strong> {contrato.assinante_externo_documento}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span><strong>Criado:</strong> {formatTimeAgo(contrato.criado_em)}</span>
                        </div>
                        {contrato.assinante_interno && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span><strong>Responsável:</strong> {contrato.assinante_interno.nome}</span>
                          </div>
                        )}
                        {contrato.finalizado_em && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span><strong>Finalizado:</strong> {formatTimeAgo(contrato.finalizado_em)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t bg-gray-50 dark:bg-gray-800 px-4 py-3">
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Email: {contrato.assinante_externo_email}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/comercial/contrato/${contrato.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>

                        {contrato.status === 'editando' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/comercial/editar-contrato/${contrato.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        )}

                        {(contrato.status === 'editando' || contrato.status === 'cancelado') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExcluirContrato(contrato.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
