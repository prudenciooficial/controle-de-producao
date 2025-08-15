import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  MapPin,
  Building,
  Image,
  Eye,
  ExternalLink,
  Archive,
  Edit,
  MoreVertical
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchReclamacoes, 
  fetchReclamacaoStats, 
  updateReclamacao,
  resolverReclamacao,
  analisarReclamacao,
  rejeitarReclamacao
} from '@/services/qualityService';
import { Reclamacao, ReclamacaoUpdate, ResolucaoData } from '@/types/quality';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Reclamacoes: React.FC = () => {
  const [reclamacoes, setReclamacoes] = useState<Reclamacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReclamacao, setSelectedReclamacao] = useState<Reclamacao | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReclamacao, setEditingReclamacao] = useState<Reclamacao | null>(null);
  const [activeTab, setActiveTab] = useState('pendentes');
  const [resolverDialogOpen, setResolverDialogOpen] = useState(false);
  const [reclamacaoParaResolver, setReclamacaoParaResolver] = useState<Reclamacao | null>(null);
  const [tipoResolucao, setTipoResolucao] = useState('');
  const [tiposReclamacao, setTiposReclamacao] = useState<string[]>([]);
  const [valorRessarcimento, setValorRessarcimento] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const { toast } = useToast();
  const [tipoReclamacaoFiltro, setTipoReclamacaoFiltro] = useState('all');

  // Carregar dados
  useEffect(() => {
    loadReclamacoes();
  }, []);

  const loadReclamacoes = async () => {
    try {
      setLoading(true);
      const data = await fetchReclamacoes();
      setReclamacoes(data);
    } catch (error) {
      console.error('Erro ao carregar reclamações:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar reclamações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Separar reclamações por status
  const reclamacoesPendentes = useMemo(() => {
    return reclamacoes.filter(r => ['Nova', 'Em Análise'].includes(r.status));
  }, [reclamacoes]);

  const reclamacoesResolvidas = useMemo(() => {
    return reclamacoes.filter(r => ['Resolvida', 'Rejeitada', 'Arquivada'].includes(r.status));
  }, [reclamacoes]);

  // Filtrar reclamações baseado na tab ativa
  const getFilteredReclamacoes = (reclamacoesList: Reclamacao[]) => {
    return reclamacoesList.filter(reclamacao => {
      const matchesSearch = searchTerm === '' || 
        (reclamacao.nome_cliente && reclamacao.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (reclamacao.descricao_reclamacao && reclamacao.descricao_reclamacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (reclamacao.supermercado && reclamacao.supermercado.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (reclamacao.protocolo && reclamacao.protocolo.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || reclamacao.status === statusFilter;
      const matchesTipo = tipoReclamacaoFiltro === 'all' || (reclamacao.tipos_reclamacao && reclamacao.tipos_reclamacao.includes(tipoReclamacaoFiltro));
      return matchesSearch && matchesStatus && matchesTipo;
    });
  };

  const filteredReclamacoesPendentes = useMemo(() => getFilteredReclamacoes(reclamacoesPendentes), [reclamacoesPendentes, searchTerm, statusFilter, tipoReclamacaoFiltro]);
  const filteredReclamacoesResolvidas = useMemo(() => getFilteredReclamacoes(reclamacoesResolvidas), [reclamacoesResolvidas, searchTerm, statusFilter, tipoReclamacaoFiltro]);

  // Função para paginar reclamações
  const getPaginatedReclamacoes = (reclamacoesList: Reclamacao[]) => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return reclamacoesList.slice(startIndex, endIndex);
  };

  // Calcular total de páginas
  const getTotalPages = (reclamacoesList: Reclamacao[]) => {
    return Math.ceil(reclamacoesList.length / recordsPerPage);
  };

  // Reclamações paginadas para a tab ativa
  const paginatedReclamacoesPendentes = useMemo(() => 
    getPaginatedReclamacoes(filteredReclamacoesPendentes), 
    [filteredReclamacoesPendentes, currentPage, recordsPerPage]
  );
  
  const paginatedReclamacoesResolvidas = useMemo(() => 
    getPaginatedReclamacoes(filteredReclamacoesResolvidas), 
    [filteredReclamacoesResolvidas, currentPage, recordsPerPage]
  );

  // Reset página quando mudar tab ou filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, statusFilter, tipoReclamacaoFiltro]);

  // Estatísticas
  const stats = useMemo(() => {
    return {
      total: reclamacoes.length,
      nova: reclamacoes.filter(r => r.status === 'Nova').length,
      em_analise: reclamacoes.filter(r => r.status === 'Em Análise').length,
      resolvida: reclamacoes.filter(r => r.status === 'Resolvida').length,
      rejeitada: reclamacoes.filter(r => r.status === 'Rejeitada').length,
      arquivada: reclamacoes.filter(r => r.status === 'Arquivada').length,
    };
  }, [reclamacoes]);

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Nova': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'Em Análise': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'Resolvida': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'Rejeitada': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'Arquivada': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Nova': return <Clock className="h-4 w-4" />;
      case 'Em Análise': return <AlertTriangle className="h-4 w-4" />;
      case 'Resolvida': return <CheckCircle className="h-4 w-4" />;
      case 'Rejeitada': return <XCircle className="h-4 w-4" />;
      case 'Arquivada': return <Archive className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleViewDetails = (reclamacao: Reclamacao) => {
    setSelectedReclamacao(reclamacao);
    setDialogOpen(true);
  };

  const handleEdit = (reclamacao: Reclamacao) => {
    setEditingReclamacao({ ...reclamacao });
    setEditDialogOpen(true);
  };

  const handleResolverClick = (reclamacao: Reclamacao) => {
    setReclamacaoParaResolver(reclamacao);
    setTipoResolucao('');
    setValorRessarcimento('');
    setTiposReclamacao([]);
    setResolverDialogOpen(true);
  };

  const handleResolverConfirm = async () => {
    if (!reclamacaoParaResolver || !tipoResolucao) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione o tipo de resolução.',
        variant: 'destructive',
      });
      return;
    }
    if (tiposReclamacao.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um tipo de reclamação.',
        variant: 'destructive',
      });
      return;
    }
    if (tipoResolucao === 'Ressarcimento via pix' && !valorRessarcimento) {
      toast({
        title: 'Erro',
        description: 'Por favor, informe o valor do ressarcimento.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const dadosResolucao: ResolucaoData = {
        tipo_resolucao: tipoResolucao,
        tipos_reclamacao: tiposReclamacao,
      };

      if (tipoResolucao === 'Ressarcimento via pix') {
        dadosResolucao.valor_ressarcimento = parseFloat(valorRessarcimento.replace(/[^0-9,.]/g, ''));
      }

      const updatedReclamacao = await resolverReclamacao(reclamacaoParaResolver.id, dadosResolucao);

      setReclamacoes(prev => 
        prev.map(r => r.id === reclamacaoParaResolver.id ? updatedReclamacao : r)
      );

      setResolverDialogOpen(false);
      setReclamacaoParaResolver(null);
      setTipoResolucao('');
      setValorRessarcimento('');
      setTiposReclamacao([]);

      toast({
        title: 'Sucesso',
        description: 'Reclamação resolvida com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao resolver reclamação:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao resolver reclamação.',
        variant: 'destructive',
      });
    }
  };

  const handleAction = async (type: 'resolver' | 'analisar' | 'rejeitar' | 'arquivar', reclamacao: Reclamacao) => {
    if (type === 'resolver') {
      handleResolverClick(reclamacao);
      return;
    }

    try {
      let updatedReclamacao;
      
      switch (type) {
        case 'analisar':
          updatedReclamacao = await analisarReclamacao(reclamacao.id);
          break;
        case 'rejeitar':
          updatedReclamacao = await rejeitarReclamacao(reclamacao.id);
          break;
        case 'arquivar':
          updatedReclamacao = await updateReclamacao(reclamacao.id, { status: 'Arquivada' });
          break;
      }

      // Atualizar lista local
      setReclamacoes(prev => 
        prev.map(r => r.id === reclamacao.id ? updatedReclamacao : r)
      );

      const actionMessage = {
        analisar: 'marcada para análise',
        rejeitar: 'rejeitada',
        arquivar: 'arquivada'
      };

      toast({
        title: 'Sucesso',
        description: `Reclamação ${actionMessage[type]} com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar reclamação:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar reclamação.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingReclamacao) return;

    try {
      // Montar objeto de atualização com campos editáveis
      const fieldsToUpdate: ReclamacaoUpdate = {
        status: editingReclamacao.status,
        protocolo: editingReclamacao.protocolo,
        nome_cliente: editingReclamacao.nome_cliente,
        supermercado: editingReclamacao.supermercado,
        cidade_estado: editingReclamacao.cidade_estado,
        url_foto_lote: editingReclamacao.url_foto_lote,
        url_foto_problema: editingReclamacao.url_foto_problema,
        descricao_reclamacao: editingReclamacao.descricao_reclamacao,
        contato_wa: editingReclamacao.contato_wa,
        link_contato_wa: editingReclamacao.link_contato_wa,
        lote: editingReclamacao.lote,
        tipos_reclamacao: editingReclamacao.tipos_reclamacao,
      };

      const updatedReclamacao = await updateReclamacao(editingReclamacao.id, fieldsToUpdate);

      setReclamacoes(prev => 
        prev.map(r => r.id === editingReclamacao.id ? updatedReclamacao : r)
      );

      setEditDialogOpen(false);
      setEditingReclamacao(null);

      toast({
        title: 'Sucesso',
        description: 'Reclamação atualizada com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao atualizar reclamação:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar reclamação.',
        variant: 'destructive',
      });
    }
  };

  const renderPagination = (totalRecords: number) => {
    const totalPages = getTotalPages(totalRecords > 0 ? Array(totalRecords) : []);
    
    if (totalPages <= 1) return null;

    const showPages = 5; // Máximo de páginas para mostrar
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    const endPage = Math.min(totalPages, startPage + showPages - 1);

    if (endPage - startPage + 1 < showPages) {
      startPage = Math.max(1, endPage - showPages + 1);
    }

    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          &lt;&lt;
        </Button>

        {pageNumbers.map(page => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentPage(page)}
            className={currentPage === page ? "bg-blue-600 text-white" : ""}
          >
            {page}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          &gt;&gt;
        </Button>

        <span className="text-sm text-gray-600 dark:text-gray-400 ml-4">
          Página {currentPage} de {totalPages} ({totalRecords} registros)
        </span>
      </div>
    );
  };

  const renderReclamacoesList = (reclamacoesList: Reclamacao[]) => {
    // Pegar lista total para paginação (filtrada, mas não paginada)
    const totalFilteredRecords = activeTab === 'pendentes' ? 
      filteredReclamacoesPendentes.length : 
      filteredReclamacoesResolvidas.length;

    if (reclamacoesList.length === 0 && totalFilteredRecords === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Nenhuma reclamação encontrada
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar os filtros para encontrar reclamações.'
                : 'Não há reclamações nesta categoria no momento.'}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reclamacoesList.map((reclamacao) => (
            <motion.div
              key={reclamacao.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Badge className={getStatusColor(reclamacao.status)}>
                        {getStatusIcon(reclamacao.status)}
                        <span className="ml-1">{reclamacao.status}</span>
                      </Badge>
                      {reclamacao.protocolo && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Protocolo: {reclamacao.protocolo}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(reclamacao)}
                        aria-label="Ver Detalhes"
                        className="hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(reclamacao)}
                        aria-label="Editar"
                        className="hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {reclamacao.status !== 'Resolvida' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction('resolver', reclamacao)}
                          aria-label="Marcar como Resolvida"
                          className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {reclamacao.status !== 'Arquivada' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction('arquivar', reclamacao)}
                          aria-label="Arquivar"
                          className="text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Cliente */}
                  {reclamacao.nome_cliente && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-sm truncate">{reclamacao.nome_cliente}</span>
                    </div>
                  )}

                  {/* Supermercado e Localização */}
                  <div className="space-y-1">
                    {reclamacao.supermercado && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Building className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{reclamacao.supermercado}</span>
                      </div>
                    )}
                    {reclamacao.cidade_estado && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{reclamacao.cidade_estado}</span>
                      </div>
                    )}
                  </div>

                  {/* Lote do Produto */}
                  {reclamacao.lote && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800">
                        Lote: {reclamacao.lote}
                      </Badge>
                    </div>
                  )}

                  {/* Descrição */}
                  {reclamacao.descricao_reclamacao && (
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <p className="line-clamp-3 break-words">{reclamacao.descricao_reclamacao}</p>
                    </div>
                  )}

                  {/* Anexos */}
                  {(reclamacao.url_foto_lote || reclamacao.url_foto_problema) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {reclamacao.url_foto_lote && (
                        /^(https?:\/\/|www\.)/i.test(String(reclamacao.url_foto_lote).trim()) ? (
                          <Badge variant="outline" className="text-xs">
                            <Image className="h-3 w-3 mr-1" />
                            Foto Lote
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-600 dark:text-gray-400">Lote: {reclamacao.url_foto_lote}</span>
                        )
                      )}
                      {reclamacao.url_foto_problema && (
                        /^(https?:\/\/|www\.)/i.test(String(reclamacao.url_foto_problema).trim()) ? (
                          <Badge variant="outline" className="text-xs">
                            <Image className="h-3 w-3 mr-1" />
                            Foto Problema
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-600 dark:text-gray-400">Problema: {reclamacao.url_foto_problema}</span>
                        )
                      )}
                    </div>
                  )}

                  {/* Contato WhatsApp */}
                  {reclamacao.contato_wa && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate flex-1">{reclamacao.contato_wa}</span>
                      {reclamacao.link_contato_wa && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-6 px-2 flex-shrink-0"
                        >
                          <a href={reclamacao.link_contato_wa} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Data */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(reclamacao.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>

                  {/* Botões de Ação Rápida */}
                  <div className="flex gap-2 pt-2">
                    {reclamacao.status === 'Nova' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('analisar', reclamacao)}
                          className="flex-1 text-xs"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Analisar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAction('resolver', reclamacao)}
                          className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolver
                        </Button>
                      </>
                    )}

                    {reclamacao.status === 'Em Análise' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAction('resolver', reclamacao)}
                          className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('rejeitar', reclamacao)}
                          className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Paginação */}
        {renderPagination(totalFilteredRecords)}
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Reclamações
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie reclamações recebidas via WhatsApp, Site, Instagram e Facebook.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadReclamacoes} variant="outline">
            Atualizar
          </Button>
          <Button
            asChild
            variant="secondary"
            className="bg-[#2563eb] text-white hover:bg-[#1e40af]"
          >
            <a
              href="https://chat.nossagoma.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir chatwoot
            </a>
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Novas</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.nova}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Resolvidas</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.resolvida}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Cliente, descrição, supermercado, protocolo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Nova">Nova</SelectItem>
                  <SelectItem value="Em Análise">Em Análise</SelectItem>
                  <SelectItem value="Resolvida">Resolvida</SelectItem>
                  <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                  <SelectItem value="Arquivada">Arquivada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Reclamação</Label>
              <Select value={tipoReclamacaoFiltro} onValueChange={setTipoReclamacaoFiltro}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Cor">Cor</SelectItem>
                  <SelectItem value="Odor">Odor</SelectItem>
                  <SelectItem value="Sabor">Sabor</SelectItem>
                  <SelectItem value="Aspecto">Aspecto</SelectItem>
                  <SelectItem value="Matéria-estranha">Matéria-estranha</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTipoReclamacaoFiltro('all');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para separar reclamações */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-1 sm:grid-cols-2 w-full h-auto">
          <TabsTrigger 
            value="pendentes" 
            className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-800 data-[state=active]:border-yellow-300 dark:data-[state=active]:bg-yellow-900/20 dark:data-[state=active]:text-yellow-300"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Reclamações Recebidas</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                <Clock className="h-3 w-3 mr-1" />
                {reclamacoesPendentes.length} pendente{reclamacoesPendentes.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="resolvidas" 
            className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-green-100 data-[state=active]:text-green-800 data-[state=active]:border-green-300 dark:data-[state=active]:bg-green-900/20 dark:data-[state=active]:text-green-300"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Reclamações Resolvidas</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                {reclamacoesResolvidas.length} resolvida{reclamacoesResolvidas.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="mt-6">
          {renderReclamacoesList(paginatedReclamacoesPendentes)}
        </TabsContent>

        <TabsContent value="resolvidas" className="mt-6">
          {renderReclamacoesList(paginatedReclamacoesResolvidas)}
        </TabsContent>
      </Tabs>

      {/* Dialog de Detalhes */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Reclamação</DialogTitle>
            <DialogDescription>
              Informações completas sobre a reclamação
            </DialogDescription>
          </DialogHeader>
          
          {selectedReclamacao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Status</Label>
                  <Badge className={`${getStatusColor(selectedReclamacao.status)} mt-1`}>
                    {getStatusIcon(selectedReclamacao.status)}
                    <span className="ml-1">{selectedReclamacao.status}</span>
                  </Badge>
                </div>
                {selectedReclamacao.protocolo && (
                  <div>
                    <Label className="font-medium">Protocolo</Label>
                    <p className="mt-1">{selectedReclamacao.protocolo}</p>
                  </div>
                )}
              </div>

              {selectedReclamacao.nome_cliente && (
                <div>
                  <Label className="font-medium">Cliente</Label>
                  <p className="mt-1">{selectedReclamacao.nome_cliente}</p>
                  {selectedReclamacao.contato_wa && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        <Phone className="h-3 w-3 mr-1" />
                        {selectedReclamacao.contato_wa}
                      </Badge>
                      {selectedReclamacao.link_contato_wa && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="ml-2"
                        >
                          <a href={selectedReclamacao.link_contato_wa} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Abrir no Chatwoot
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedReclamacao.supermercado && (
                  <div>
                    <Label className="font-medium">Supermercado</Label>
                    <p className="mt-1">{selectedReclamacao.supermercado}</p>
                  </div>
                )}
                {selectedReclamacao.cidade_estado && (
                  <div>
                    <Label className="font-medium">Localização</Label>
                    <p className="mt-1">{selectedReclamacao.cidade_estado}</p>
                  </div>
                )}
              </div>

              {/* Lote do Produto */}
              {selectedReclamacao.lote && (
                <div>
                  <Label className="font-medium">Lote do Produto</Label>
                  <Badge variant="secondary" className="mt-1 bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800">
                    {selectedReclamacao.lote}
                  </Badge>
                </div>
              )}

              {selectedReclamacao.descricao_reclamacao && (
                <div>
                  <Label className="font-medium">Descrição da Reclamação</Label>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{selectedReclamacao.descricao_reclamacao}</p>
                </div>
              )}

              {/* Informações de Resolução */}
              {selectedReclamacao.status === 'Resolvida' && (selectedReclamacao.tipo_resolucao || selectedReclamacao.data_resolucao) && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <Label className="font-medium text-green-800 dark:text-green-300">Informações da Resolução</Label>
                  <div className="mt-2 space-y-2">
                    {selectedReclamacao.tipo_resolucao && (
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Tipo de Resolução:</p>
                        <p className="text-sm text-green-600 dark:text-green-400">{selectedReclamacao.tipo_resolucao}</p>
                      </div>
                    )}
                    {selectedReclamacao.valor_ressarcimento && (
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Valor do Ressarcimento:</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          R$ {selectedReclamacao.valor_ressarcimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    {selectedReclamacao.data_resolucao && (
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Data da Resolução:</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {new Date(selectedReclamacao.data_resolucao).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(selectedReclamacao.url_foto_lote || selectedReclamacao.url_foto_problema) && (
                <div>
                  <Label className="font-medium">Anexos</Label>
                  <div className="mt-2 space-y-2">
                    {selectedReclamacao.url_foto_lote && (
                      <div>
                        <p className="text-sm font-medium">Foto do Lote:</p>
                        {/^(https?:\/\/|www\.)/i.test(String(selectedReclamacao.url_foto_lote).trim()) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={selectedReclamacao.url_foto_lote} target="_blank" rel="noopener noreferrer">
                              <Image className="h-4 w-4 mr-1" />
                              Ver Foto do Lote
                            </a>
                          </Button>
                        ) : (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{selectedReclamacao.url_foto_lote}</p>
                        )}
                      </div>
                    )}
                    {selectedReclamacao.url_foto_problema && (
                      <div>
                        <p className="text-sm font-medium">Foto do Problema:</p>
                        {/^(https?:\/\/|www\.)/i.test(String(selectedReclamacao.url_foto_problema).trim()) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={selectedReclamacao.url_foto_problema} target="_blank" rel="noopener noreferrer">
                              <Image className="h-4 w-4 mr-1" />
                              Ver Foto do Problema
                            </a>
                          </Button>
                        ) : (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{selectedReclamacao.url_foto_problema}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500">
                <Label className="font-medium">Data de Criação</Label>
                <p className="mt-1">{new Date(selectedReclamacao.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Resolução */}
      <Dialog open={resolverDialogOpen} onOpenChange={setResolverDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolver Reclamação</DialogTitle>
            <DialogDescription>
              Como esta reclamação foi resolvida?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Tipo(s) de Reclamação *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Cor', 'Odor', 'Sabor', 'Aspecto', 'Matéria-estranha', 'Outros'].map((tipo) => (
                  <Button
                    key={tipo}
                    type="button"
                    variant={tiposReclamacao.includes(tipo) ? 'default' : 'outline'}
                    className={tiposReclamacao.includes(tipo) ? 'bg-blue-600 text-white' : ''}
                    onClick={() => {
                      setTiposReclamacao((prev) =>
                        prev.includes(tipo)
                          ? prev.filter((t) => t !== tipo)
                          : [...prev, tipo]
                      );
                    }}
                  >
                    {tipo}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Tipo de Resolução *</Label>
              <Select value={tipoResolucao} onValueChange={setTipoResolucao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione como foi resolvida" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ressarcimento via pix">Ressarcimento via pix</SelectItem>
                  <SelectItem value="Envio de produto">Envio de produto</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoResolucao === 'Ressarcimento via pix' && (
              <div>
                <Label>Valor do Ressarcimento *</Label>
                <Input
                  type="text"
                  placeholder="Ex: 25,90"
                  value={valorRessarcimento}
                  onChange={(e) => {
                    // Permitir apenas números, vírgula e ponto
                    const value = e.target.value.replace(/[^0-9,.]/g, '');
                    setValorRessarcimento(value);
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite o valor em reais (use vírgula para centavos)
                </p>
              </div>
            )}

            {reclamacaoParaResolver && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Cliente:</strong> {reclamacaoParaResolver.nome_cliente || 'Não informado'}
                </p>
                {reclamacaoParaResolver.protocolo && (
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Protocolo:</strong> {reclamacaoParaResolver.protocolo}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolverDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResolverConfirm} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-1" />
              Resolver Reclamação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição Completa */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Reclamação</DialogTitle>
            <DialogDescription>
              Edite os dados da reclamação
            </DialogDescription>
          </DialogHeader>
          
          {editingReclamacao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status *</Label>
                  <Select 
                    value={editingReclamacao.status} 
                    onValueChange={(value) => setEditingReclamacao({...editingReclamacao, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nova">Nova</SelectItem>
                      <SelectItem value="Em Análise">Em Análise</SelectItem>
                      <SelectItem value="Resolvida">Resolvida</SelectItem>
                      <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                      <SelectItem value="Arquivada">Arquivada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Protocolo</Label>
                  <Input
                    value={editingReclamacao.protocolo || ''}
                    onChange={(e) => setEditingReclamacao({...editingReclamacao, protocolo: e.target.value})}
                    placeholder="Protocolo da reclamação"

                  />
                </div>
              </div>

              <div>
                <Label>Nome do Cliente</Label>
                <Input
                  value={editingReclamacao.nome_cliente || ''}
                  onChange={(e) => setEditingReclamacao({...editingReclamacao, nome_cliente: e.target.value})}
                  placeholder="Nome completo do cliente"

                />
              </div>

              {/* Lote do Produto */}
              {editingReclamacao.lote && (
                <div>
                  <Label>Lote do Produto</Label>
                  <Input
                    value={editingReclamacao.lote || ''}
                    placeholder="Lote do produto"

                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Supermercado</Label>
                  <Input
                    value={editingReclamacao.supermercado || ''}
                    onChange={(e) => setEditingReclamacao({...editingReclamacao, supermercado: e.target.value})}
                    placeholder="Nome do supermercado"

                  />
                </div>
                
                <div>
                  <Label>Cidade/Estado</Label>
                  <Input
                    value={editingReclamacao.cidade_estado || ''}
                    onChange={(e) => setEditingReclamacao({...editingReclamacao, cidade_estado: e.target.value})}
                    placeholder="Localização"

                  />
                </div>
              </div>

              <div>
                <Label>Descrição da Reclamação</Label>
                <Textarea
                  value={editingReclamacao.descricao_reclamacao || ''}
                  onChange={(e) => setEditingReclamacao({...editingReclamacao, descricao_reclamacao: e.target.value})}
                  placeholder="Descrição detalhada do problema"
                  className="min-h-[100px]"

                />
              </div>

              <div>
                <Label>Contato WhatsApp</Label>
                <Input
                  value={editingReclamacao.contato_wa || ''}
                  onChange={(e) => setEditingReclamacao({...editingReclamacao, contato_wa: e.target.value})}
                  placeholder="Número do WhatsApp"

                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>URL Foto do Lote</Label>
                  <Input
                    value={editingReclamacao.url_foto_lote || ''}
                    onChange={(e) => setEditingReclamacao({...editingReclamacao, url_foto_lote: e.target.value})}
                    placeholder="Link da foto do lote"

                  />
                </div>
                
                <div>
                  <Label>URL Foto do Problema</Label>
                  <Input
                    value={editingReclamacao.url_foto_problema || ''}
                    onChange={(e) => setEditingReclamacao({...editingReclamacao, url_foto_problema: e.target.value})}
                    placeholder="Link da foto do problema"

                  />
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Nota:</strong> Você pode editar todos os campos desta reclamação. Alguns dados podem ter sido importados do Chatwoot e podem ser ajustados conforme necessário.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reclamacoes; 