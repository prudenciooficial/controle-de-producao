import React, { useState, useEffect } from 'react';
import { Plus, FileText, CheckCircle, XCircle, Eye, AlertTriangle, TrendingUp, Clock, Users, Printer, Edit, Trash, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ColetaAmostra {
  [key: string]: unknown;
  id: string;
  lote_producao: string;
  data_coleta: string;
  quantidade_total_produzida: number;
  quantidade_amostras: number;
  responsavel_coleta: string;
  observacoes?: string;
  status: 'em_andamento' | 'finalizada' | 'aprovada' | 'reprovada';
  created_at: string;
  updated_at: string;
}

interface LaudoLiberacao {
  [key: string]: unknown;
  id: string;
  coleta_id: string;
  numero_laudo: number;
  marca_produto: string;
  gramatura: string;
  data_fabricacao: string;
  data_validade: string;
  resultado_geral: 'aprovado' | 'reprovado';
  responsavel_liberacao: string;
  observacoes?: string;
  data_emissao: string;
  revisao?: string;
  created_at?: string;
  updated_at?: string;
}

interface NovoLaudo {
  [key: string]: unknown;
  coleta_id: string;
  marca_produto: string;
  gramatura: string;
  data_fabricacao: string;
  data_validade: string;
  resultado_geral: 'aprovado' | 'reprovado';
  responsavel_liberacao: string;
  observacoes?: string;
}

interface ResponsavelTecnico {
  id?: string;
  nome: string;
  funcao: string;
  carteira_tecnica: string;
  assinatura_url?: string;
}

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendColor }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendColor?: string;
}) => (
  <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {trend && (
            <span className={`text-sm px-2 py-1 rounded-full ${trendColor}`}>
              {trend}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>
      <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    em_andamento: { 
      label: 'Em Andamento', 
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-700' 
    },
    finalizada: { 
      label: 'Finalizada', 
      className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700' 
    },
    aprovada: { 
      label: 'Aprovada', 
      className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700' 
    },
    reprovada: { 
      label: 'Reprovada', 
      className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700' 
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
};

export default function Laudos() {
  const [laudos, setLaudos] = useState<LaudoLiberacao[]>([]);
  const [coletas, setColetas] = useState<ColetaAmostra[]>([]);
  const [responsaveis, setResponsaveis] = useState<ResponsavelTecnico[]>([]);
  const [novoLaudo, setNovoLaudo] = useState<NovoLaudo>({
    coleta_id: '',
    marca_produto: '',
    gramatura: '',
    data_fabricacao: '',
    data_validade: '',
    resultado_geral: 'aprovado',
    responsavel_liberacao: '',
    observacoes: ''
  });
  const [laudoEditando, setLaudoEditando] = useState<LaudoLiberacao | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    carregarLaudos();
    carregarColetas();
    carregarResponsaveisTecnicos();
  }, []);

  const carregarLaudos = async () => {
    try {
      const { data, error } = await supabase
        .from('laudos_liberacao')
        .select(`
          *,
          coleta:coletas_amostras(lote_producao)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const laudosWithColeta = (data || []).map((laudo: any) => ({
        ...laudo,
        lote_producao: laudo.coleta?.lote_producao || 'N/A'
      }));
      
      setLaudos(laudosWithColeta);
    } catch (error) {
      console.error('Erro ao carregar laudos:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar laudos.'
      });
    }
  };

  const carregarColetas = async () => {
    try {
      const { data, error } = await supabase
        .from('coletas_amostras')
        .select('*')
        .eq('status', 'finalizada')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setColetas((data || []) as ColetaAmostra[]);
    } catch (error) {
      console.error('Erro ao carregar coletas:', error);
    }
  };

  const carregarResponsaveisTecnicos = async () => {
    try {
      const { data, error } = await supabase
        .from('responsaveis_tecnicos')
        .select('*')
        .order('nome');

      if (error) throw error;
      setResponsaveis(data || []);
    } catch (error) {
      console.error('Erro ao carregar responsáveis técnicos:', error);
    }
  };

  const criarLaudo = async () => {
    try {
      const laudoData: NovoLaudo = {
        coleta_id: novoLaudo.coleta_id,
        marca_produto: novoLaudo.marca_produto,
        gramatura: novoLaudo.gramatura,
        data_fabricacao: novoLaudo.data_fabricacao,
        data_validade: novoLaudo.data_validade,
        resultado_geral: novoLaudo.resultado_geral,
        responsavel_liberacao: novoLaudo.responsavel_liberacao,
        observacoes: novoLaudo.observacoes
      };

      const { data, error } = await supabase
        .from('laudos_liberacao')
        .insert([laudoData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Laudo criado',
        description: 'Laudo criado com sucesso!',
        variant: 'default',
      });

      setNovoLaudo({
        coleta_id: '',
        marca_produto: '',
        gramatura: '',
        data_fabricacao: '',
        data_validade: '',
        resultado_geral: 'aprovado',
        responsavel_liberacao: '',
        observacoes: ''
      });
      setShowDialog(false);
      carregarLaudos();
    } catch (error) {
      console.error('Erro ao criar laudo:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao criar laudo.',
      });
    }
  };

  const editarLaudo = async () => {
    try {
      if (!laudoEditando) return;

      const laudoData: Partial<LaudoLiberacao> = {
        marca_produto: novoLaudo.marca_produto,
        gramatura: novoLaudo.gramatura,
        data_fabricacao: novoLaudo.data_fabricacao,
        data_validade: novoLaudo.data_validade,
        resultado_geral: novoLaudo.resultado_geral,
        responsavel_liberacao: novoLaudo.responsavel_liberacao,
        observacoes: novoLaudo.observacoes
      };

      const { data, error } = await supabase
        .from('laudos_liberacao')
        .update(laudoData)
        .eq('id', laudoEditando.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Laudo atualizado',
        description: 'Laudo atualizado com sucesso!',
        variant: 'default',
      });

      setLaudoEditando(null);
      setNovoLaudo({
        coleta_id: '',
        marca_produto: '',
        gramatura: '',
        data_fabricacao: '',
        data_validade: '',
        resultado_geral: 'aprovado',
        responsavel_liberacao: '',
        observacoes: ''
      });
      setShowDialog(false);
      carregarLaudos();
    } catch (error) {
      console.error('Erro ao editar laudo:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao editar laudo.',
      });
    }
  };

  const aprovarColeta = async (coletaId: string) => {
    try {
      const laudoData: LaudoLiberacao = {
        id: '',
        coleta_id: coletaId,
        numero_laudo: 0,
        marca_produto: 'Produto Padrão',
        gramatura: '1kg',
        data_fabricacao: new Date().toISOString().split('T')[0],
        data_validade: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        resultado_geral: 'aprovado',
        responsavel_liberacao: 'Sistema',
        data_emissao: new Date().toISOString()
      };

      const { error } = await supabase
        .from('laudos_liberacao')
        .insert([laudoData]);

      if (error) throw error;

      await supabase
        .from('coletas_amostras')
        .update({ status: 'aprovada' })
        .eq('id', coletaId);

      toast({
        title: 'Coleta aprovada',
        description: 'Coleta aprovada e laudo criado com sucesso!',
        variant: 'default',
      });

      carregarLaudos();
      carregarColetas();
    } catch (error) {
      console.error('Erro ao aprovar coleta:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao aprovar coleta.',
      });
    }
  };

  const salvarResponsavelTecnico = async () => {
    try {
      const responsavelData: ResponsavelTecnico = {
        nome: novoResponsavel.nome || '',
        funcao: novoResponsavel.funcao || '',
        carteira_tecnica: novoResponsavel.carteira_tecnica || '',
        assinatura_url: novoResponsavel.assinatura_url
      };

      const { data, error } = await supabase
        .from('responsaveis_tecnicos')
        .insert([responsavelData])
        .select();

      if (error) throw error;

      toast({
        title: 'Responsável técnico salvo',
        description: 'Responsável técnico salvo com sucesso!',
        variant: 'default',
      });

      setNovoResponsavel({
        nome: '',
        funcao: '',
        carteira_tecnica: '',
        assinatura_url: ''
      });
      carregarResponsaveisTecnicos();
    } catch (error) {
      console.error('Erro ao salvar responsável técnico:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao salvar responsável técnico.',
      });
    }
  };

  const [novoResponsavel, setNovoResponsavel] = useState<ResponsavelTecnico>({
    nome: '',
    funcao: '',
    carteira_tecnica: '',
    assinatura_url: ''
  });

  const filteredLaudos = laudos.filter(laudo => {
    const search = searchTerm.toLowerCase();
    return (
      laudo.lote_producao?.toString().toLowerCase().includes(search) ||
      laudo.marca_produto?.toString().toLowerCase().includes(search) ||
      laudo.gramatura?.toString().toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Laudos de Liberação</h1>
          <p className="text-gray-600 dark:text-gray-300">Gerenciamento de laudos e coletas finalizadas</p>
        </div>
        <Button
          onClick={() => {
            setShowDialog(true);
            setLaudoEditando(null);
            setNovoLaudo({
              coleta_id: '',
              marca_produto: '',
              gramatura: '',
              data_fabricacao: '',
              data_validade: '',
              resultado_geral: 'aprovado',
              responsavel_liberacao: '',
              observacoes: ''
            });
          }}
          className="inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Laudo
        </Button>
      </div>

      <div className="mb-4">
        <Input
          type="search"
          placeholder="Buscar por lote, marca ou gramatura..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
          icon={<Search />}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca Produto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gramatura</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Fabricação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Validade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resultado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Emissão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {filteredLaudos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-300">
                    <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <p className="dark:text-gray-200">Nenhum laudo registrado</p>
                    <p className="text-sm dark:text-gray-400">Clique em "Novo Laudo" para começar</p>
                  </td>
                </tr>
              ) : (
                filteredLaudos.map((laudo) => (
                  <tr key={laudo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{laudo.lote_producao}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">{laudo.marca_produto}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">{laudo.gramatura}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">{laudo.data_fabricacao}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">{laudo.data_validade}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {laudo.resultado_geral === 'aprovado' ? (
                        <CheckCircle className="text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="text-red-600 dark:text-red-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">{laudo.responsavel_liberacao}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">{laudo.data_emissao}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setLaudoEditando(laudo);
                            setNovoLaudo({
                              coleta_id: laudo.coleta_id,
                              marca_produto: laudo.marca_produto as string,
                              gramatura: laudo.gramatura as string,
                              data_fabricacao: laudo.data_fabricacao as string,
                              data_validade: laudo.data_validade as string,
                              resultado_geral: laudo.resultado_geral as 'aprovado' | 'reprovado',
                              responsavel_liberacao: laudo.responsavel_liberacao as string,
                              observacoes: laudo.observacoes as string || ''
                            });
                            setShowDialog(true);
                          }}
                          title="Editar Laudo"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (!window.confirm('Tem certeza que deseja excluir este laudo?')) return;
                            try {
                              const { error } = await supabase
                                .from('laudos_liberacao')
                                .delete()
                                .eq('id', laudo.id);
                              if (error) throw error;
                              toast({
                                title: 'Laudo excluído',
                                description: 'Laudo excluído com sucesso!',
                                variant: 'default',
                              });
                              carregarLaudos();
                            } catch (error) {
                              console.error('Erro ao excluir laudo:', error);
                              toast({
                                variant: 'destructive',
                                title: 'Erro',
                                description: 'Erro ao excluir laudo.',
                              });
                            }
                          }}
                          title="Excluir Laudo"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            window.open(`/print/laudo/${laudo.id}`, '_blank', 'width=800,height=600');
                          }}
                          title="Imprimir Laudo"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{laudoEditando ? 'Editar Laudo' : 'Novo Laudo'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (laudoEditando) {
                await editarLaudo();
              } else {
                await criarLaudo();
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="coleta_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Coleta *
              </Label>
              <Select
                value={novoLaudo.coleta_id}
                onValueChange={(value) => setNovoLaudo({ ...novoLaudo, coleta_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma coleta" />
                </SelectTrigger>
                <SelectContent>
                  {coletas.map((coleta) => (
                    <SelectItem key={coleta.id} value={coleta.id}>
                      {coleta.lote_producao} - {format(new Date(coleta.data_coleta), 'dd/MM/yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="marca_produto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Marca do Produto *
              </Label>
              <Input
                id="marca_produto"
                type="text"
                value={novoLaudo.marca_produto}
                onChange={(e) => setNovoLaudo({ ...novoLaudo, marca_produto: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="gramatura" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Gramatura *
              </Label>
              <Input
                id="gramatura"
                type="text"
                value={novoLaudo.gramatura}
                onChange={(e) => setNovoLaudo({ ...novoLaudo, gramatura: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_fabricacao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Data de Fabricação *
                </Label>
                <Input
                  id="data_fabricacao"
                  type="date"
                  value={novoLaudo.data_fabricacao}
                  onChange={(e) => setNovoLaudo({ ...novoLaudo, data_fabricacao: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="data_validade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Data de Validade *
                </Label>
                <Input
                  id="data_validade"
                  type="date"
                  value={novoLaudo.data_validade}
                  onChange={(e) => setNovoLaudo({ ...novoLaudo, data_validade: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="resultado_geral" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Resultado Geral *
              </Label>
              <Select
                value={novoLaudo.resultado_geral}
                onValueChange={(value) => setNovoLaudo({ ...novoLaudo, resultado_geral: value as 'aprovado' | 'reprovado' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="responsavel_liberacao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Responsável pela Liberação *
              </Label>
              <Select
                value={novoLaudo.responsavel_liberacao}
                onValueChange={(value) => setNovoLaudo({ ...novoLaudo, responsavel_liberacao: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis.map((resp) => (
                    <SelectItem key={resp.id} value={resp.nome}>
                      {resp.nome} - {resp.funcao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Observações
              </Label>
              <Textarea
                id="observacoes"
                value={novoLaudo.observacoes}
                onChange={(e) => setNovoLaudo({ ...novoLaudo, observacoes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {laudoEditando ? 'Salvar Alterações' : 'Criar Laudo'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
