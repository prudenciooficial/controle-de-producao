import React, { useState, useEffect } from 'react';
import { FileText, Plus, Printer, Edit, Trash, CheckCircle, Search, Calendar, User, Package, ImagePlus, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

interface ColetaAmostra {
  id: string;
  lote_producao: string;
  data_coleta: string;
  quantidade_total_produzida: number;
  quantidade_amostras: number;
  responsavel_coleta: string;
  observacoes?: string;
  status: 'em_andamento' | 'finalizada' | 'aprovada' | 'reprovada';
  created_at: string;
}

interface AnaliseAmostra {
  id: string;
  coleta_id: string;
  numero_amostra: number;
  umidade?: number;
  ph?: number;
  aspecto?: string;
  cor?: string;
  odor?: string;
  sabor?: string;
  embalagem?: string;
  umidade_conforme?: boolean;
  ph_conforme?: boolean;
  observacoes?: string;
  data_analise: string;
}

interface LaudoLiberacao {
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
  created_at: string;
  updated_at: string;
  revisao: string;
  lote_producao?: string;
}

interface NovoLaudo {
  coleta_id: string;
  marca_produto: string;
  gramatura: string;
  data_fabricacao: string;
  data_validade: string;
  resultado_geral: 'aprovado' | 'reprovado';
  responsavel_liberacao: string;
  observacoes: string;
  data_emissao: string;
  revisao: string;
}

interface ResponsavelTecnico {
  id: string;
  nome: string;
  funcao: string;
  carteira_tecnica: string;
  assinatura_url?: string;
}

interface Produto {
  id: string;
  name: string;
}

// Função utilitária para listar imagens da pasta public/images/assinaturas
function useAssinaturasDisponiveis() {
  const [assinaturas, setAssinaturas] = useState<string[]>([]);
  useEffect(() => {
    fetch('/images/assinaturas/assinaturas.json')
      .then(res => res.json())
      .then(setAssinaturas)
      .catch(() => setAssinaturas([]));
  }, []);
  return assinaturas;
}

export default function Laudos() {
  const [laudos, setLaudos] = useState<LaudoLiberacao[]>([]);
  const [coletasAprovadas, setColetasAprovadas] = useState<ColetaAmostra[]>([]);
  const [analises, setAnalises] = useState<AnaliseAmostra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovoLaudo, setShowNovoLaudo] = useState(false);
  const [editandoLaudo, setEditandoLaudo] = useState<LaudoLiberacao | null>(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const { toast } = useToast();

  // Estados para novo laudo
  const [novoLaudo, setNovoLaudo] = useState<NovoLaudo>({
    coleta_id: '',
    marca_produto: 'MASSA PRONTA PARA TAPIOCA NOSSA GOMA',
    gramatura: '1Kg',
    data_fabricacao: '',
    data_validade: '',
    resultado_geral: 'aprovado',
    responsavel_liberacao: '',
    observacoes: 'São realizadas análises do produto acabado em laboratórios terceirizados de acordo com o plano de amostragem interno da Indústria de Alimentos Ser Bem Ltda., atendendo os respectivos dispositivos legais.',
    data_emissao: '2025-07-03',
    revisao: '7',
  });

  const [responsaveis, setResponsaveis] = useState<ResponsavelTecnico[]>([]);
  const [showModalResponsavel, setShowModalResponsavel] = useState(false);
  const [novoResponsavel, setNovoResponsavel] = useState<Partial<ResponsavelTecnico>>({});
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const assinaturas = useAssinaturasDisponiveis();

  useEffect(() => {
    Promise.all([
      carregarLaudos(),
      carregarColetasAprovadas(),
      carregarResponsaveis(),
      carregarProdutos()
    ]);
  }, []);

  useEffect(() => {
    // Carregar análises quando uma coleta for selecionada
    if (novoLaudo.coleta_id) {
      carregarAnalisesDaColeta(novoLaudo.coleta_id);
    }
  }, [novoLaudo.coleta_id]);

  const carregarLaudos = async () => {
    try {
      const { data, error } = await supabase
        .from('laudos_liberacao')
        .select('*, coleta:coletas_amostras(id, lote_producao)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLaudos((data || []).map((laudo: LaudoLiberacao & { coleta?: { lote_producao?: string } }) => ({
        ...laudo,
        lote_producao: laudo.coleta?.lote_producao || '',
      })));
    } catch (error) {
      console.error('Erro ao carregar laudos:', error);
      toast({
        title: 'Erro ao carregar laudos',
        description: '❌ Não foi possível carregar os laudos.',
        variant: 'destructive',
      });
    }
  };

  const carregarColetasAprovadas = async () => {
    try {
      const { data, error } = await supabase
        .from('coletas_amostras')
        .select('*')
        .in('status', ['finalizada', 'aprovada'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setColetasAprovadas(data || []);
    } catch (error) {
      console.error('Erro ao carregar coletas aprovadas:', error);
      toast({
        title: 'Erro ao carregar coletas',
        description: '❌ Não foi possível carregar as coletas aprovadas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarAnalisesDaColeta = async (coletaId: string) => {
    try {
      const { data, error } = await supabase
        .from('analises_amostras')
        .select('*')
        .eq('coleta_id', coletaId)
        .order('numero_amostra');

      if (error) throw error;
      setAnalises(data || []);

      // Calcular resultado geral automaticamente baseado nas análises
      const todasConformes = (data || []).every((a: AnaliseAmostra) => a.umidade_conforme && a.ph_conforme);
      setNovoLaudo(prev => ({
        ...prev,
        resultado_geral: todasConformes ? 'aprovado' : 'reprovado'
      }));
    } catch (error) {
      console.error('Erro ao carregar análises:', error);
    }
  };

  const selecionarColeta = (coletaId: string) => {
    const coleta = coletasAprovadas.find(c => c.id === coletaId);
    if (!coleta) return;

    // Calcular data de validade (6 meses após fabricação)
    const dataFabricacao = new Date(coleta.data_coleta);
    const dataValidade = new Date(dataFabricacao);
    dataValidade.setMonth(dataValidade.getMonth() + 6);

    setNovoLaudo(prev => ({
      ...prev,
      coleta_id: coletaId,
      data_fabricacao: coleta.data_coleta,
      data_validade: dataValidade.toISOString().split('T')[0],
      responsavel_liberacao: coleta.responsavel_coleta
    }));
  };

  const criarLaudo = async () => {
    if (!novoLaudo.coleta_id || !novoLaudo.marca_produto || !novoLaudo.responsavel_liberacao) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('laudos_liberacao')
        .insert([{ ...novoLaudo }]);

      if (error) throw error;

      // Atualizar status da coleta para 'aprovada'
      await supabase
        .from('coletas_amostras')
        .update({ status: 'aprovada' })
        .eq('id', novoLaudo.coleta_id);

      toast({
        title: 'Laudo criado',
        description: '✅ Laudo criado com sucesso!',
        variant: 'default',
      });

      setShowNovoLaudo(false);
      resetFormulario();
      carregarLaudos();
      carregarColetasAprovadas();
    } catch (error) {
      console.error('Erro ao criar laudo:', error);
      toast({
        title: 'Erro ao criar laudo',
        description: '❌ Erro ao criar laudo',
        variant: 'destructive',
      });
    }
  };

  const editarLaudo = async () => {
    if (!editandoLaudo || !novoLaudo.marca_produto || !novoLaudo.responsavel_liberacao) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('laudos_liberacao')
        .update({
          marca_produto: novoLaudo.marca_produto,
          gramatura: novoLaudo.gramatura,
          data_fabricacao: novoLaudo.data_fabricacao,
          data_validade: novoLaudo.data_validade,
          resultado_geral: novoLaudo.resultado_geral,
          responsavel_liberacao: novoLaudo.responsavel_liberacao,
          observacoes: novoLaudo.observacoes,
          data_emissao: novoLaudo.data_emissao,
          revisao: novoLaudo.revisao,
        })
        .eq('id', editandoLaudo.id);

      if (error) throw error;

      toast({
        title: 'Laudo editado',
        description: '✅ Laudo editado com sucesso!',
        variant: 'default',
      });

      setShowNovoLaudo(false);
      setEditandoLaudo(null);
      resetFormulario();
      carregarLaudos();
    } catch (error) {
      console.error('Erro ao editar laudo:', error);
      toast({
        title: 'Erro ao editar laudo',
        description: '❌ Erro ao editar laudo',
        variant: 'destructive',
      });
    }
  };

  const abrirEdicaoLaudo = (laudo: LaudoLiberacao) => {
    setEditandoLaudo(laudo);
    setNovoLaudo({
      coleta_id: laudo.coleta_id,
      marca_produto: laudo.marca_produto,
      gramatura: laudo.gramatura,
      data_fabricacao: laudo.data_fabricacao,
      data_validade: laudo.data_validade,
      resultado_geral: laudo.resultado_geral,
      responsavel_liberacao: laudo.responsavel_liberacao,
      observacoes: laudo.observacoes || '',
      data_emissao: laudo.data_emissao || '2025-07-03',
      revisao: laudo.revisao || '7',
    });
    setShowNovoLaudo(true);
  };

  const excluirLaudo = async (laudo: LaudoLiberacao) => {
    if (!window.confirm('Tem certeza que deseja excluir este laudo? Esta ação não poderá ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('laudos_liberacao')
        .delete()
        .eq('id', laudo.id);

      if (error) throw error;

      toast({
        title: 'Laudo excluído',
        description: '✅ Laudo excluído com sucesso!',
        variant: 'default',
      });

      carregarLaudos();
    } catch (error) {
      console.error('Erro ao excluir laudo:', error);
      toast({
        title: 'Erro ao excluir laudo',
        description: '❌ Erro ao excluir laudo',
        variant: 'destructive',
      });
    }
  };

  const visualizarLaudo = (laudo: LaudoLiberacao) => {
    window.open(`/print/laudo/${laudo.id}`, '_blank', 'width=800,height=600');
  };

  const resetFormulario = () => {
    setNovoLaudo({
      coleta_id: '',
      marca_produto: 'MASSA PRONTA PARA TAPIOCA NOSSA GOMA',
      gramatura: '1Kg',
      data_fabricacao: '',
      data_validade: '',
      resultado_geral: 'aprovado',
      responsavel_liberacao: '',
      observacoes: 'São realizadas análises do produto acabado em laboratórios terceirizados de acordo com o plano de amostragem interno da Indústria de Alimentos Ser Bem Ltda., atendendo os respectivos dispositivos legais.',
      data_emissao: '2025-07-03',
      revisao: '7',
    });
    setAnalises([]);
    setEditandoLaudo(null);
  };

  // Filtrar laudos
  const laudosFiltrados = laudos.filter(laudo => 
    laudo.numero_laudo.toString().includes(filtroTexto) ||
    laudo.marca_produto.toLowerCase().includes(filtroTexto.toLowerCase()) ||
    laudo.responsavel_liberacao.toLowerCase().includes(filtroTexto.toLowerCase()) ||
    (laudo.lote_producao || '').toLowerCase().includes(filtroTexto.toLowerCase())
  );

  // Calcular estatísticas das análises
  const mediaUmidade = analises.length > 0 ? 
    (analises.reduce((sum, a) => sum + (a.umidade || 0), 0) / analises.length).toFixed(1) : '-';
  const mediaPh = analises.length > 0 ? 
    (analises.reduce((sum, a) => sum + (a.ph || 0), 0) / analises.length).toFixed(2) : '-';

  const carregarResponsaveis = async () => {
    try {
      const { data, error } = await supabase
        .from('responsaveis_tecnicos')
        .select('*')
        .order('nome');
      if (error) throw error;
      setResponsaveis(data || []);
    } catch (error) {
      toast({ title: 'Erro ao carregar responsáveis técnicos', variant: 'destructive' });
    }
  };

  const carregarProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      toast({ title: 'Erro ao carregar produtos', variant: 'destructive' });
    }
  };

  const salvarResponsavel = async () => {
    if (!novoResponsavel.nome || !novoResponsavel.funcao || !novoResponsavel.carteira_tecnica) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase
        .from('responsaveis_tecnicos')
        .insert([{ ...novoResponsavel }]);
      if (error) throw error;
      toast({ title: 'Responsável cadastrado', variant: 'default' });
      setShowModalResponsavel(false);
      setNovoResponsavel({});
      carregarResponsaveis();
    } catch (error) {
      toast({ title: 'Erro ao cadastrar responsável', variant: 'destructive' });
    }
  };

  const excluirResponsavel = async (id: string) => {
    if (!window.confirm('Excluir este responsável técnico?')) return;
    try {
      const { error } = await supabase
        .from('responsaveis_tecnicos')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Responsável excluído', variant: 'default' });
      carregarResponsaveis();
    } catch (error) {
      toast({ title: 'Erro ao excluir responsável', variant: 'destructive' });
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Laudos e Histórico</h1>
          <p className="text-gray-600 dark:text-gray-300">Gerenciamento de laudos de liberação de produto acabado</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowModalResponsavel(true)} className="inline-flex items-center gap-2" variant="outline">
            <UserPlus className="w-4 h-4" />
            Adicionar Responsável Técnico
          </Button>
          <Button onClick={() => setShowNovoLaudo(true)} className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Laudo
          </Button>
        </div>
      </div>

      {/* Filtro */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-300" />
          <Input
            placeholder="Buscar por número do laudo, produto ou responsável..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="flex-1 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
          />
        </div>
      </div>

      {/* Tabela de Laudos */}
      <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Histórico de Laudos ({laudosFiltrados.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Nº Laudo</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Lote</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Produto</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Data Fabricação</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Data Validade</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Resultado</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Responsável</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Data Emissão (Revisão)</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Data Emissão do Laudo</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {laudosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-300">
                    <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <p className="dark:text-gray-200">Nenhum laudo encontrado</p>
                    <p className="text-sm dark:text-gray-400">Clique em "Novo Laudo" para começar</p>
                  </td>
                </tr>
              ) : (
                laudosFiltrados.map((laudo) => (
                  <tr key={laudo.id} className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      #{laudo.numero_laudo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      {laudo.lote_producao || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      <div className="flex flex-col">
                        <span className="font-medium dark:text-gray-100">{laudo.marca_produto}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{laudo.gramatura}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      {new Date(laudo.data_fabricacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      {new Date(laudo.data_validade).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        laudo.resultado_geral === 'aprovado' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                      }`}>
                        {laudo.resultado_geral === 'aprovado' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <span className="w-3 h-3 mr-1">✗</span>
                        )}
                        {laudo.resultado_geral === 'aprovado' ? 'Aprovado' : 'Reprovado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      {laudo.responsavel_liberacao}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      {new Date(laudo.data_emissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      {laudo.created_at ? new Date(laudo.created_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => visualizarLaudo(laudo)}
                          size="sm"
                          variant="outline"
                          className="p-2 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => abrirEdicaoLaudo(laudo)}
                          size="sm"
                          variant="outline"
                          className="p-2 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => excluirLaudo(laudo)}
                          size="sm"
                          variant="outline"
                          className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                          <Trash className="w-4 h-4" />
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

      {/* Modal Responsável Técnico */}
      <Dialog open={showModalResponsavel} onOpenChange={setShowModalResponsavel}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Responsável Técnico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={novoResponsavel.nome || ''} onChange={e => setNovoResponsavel({ ...novoResponsavel, nome: e.target.value })} />
            </div>
            <div>
              <Label>Função/Cargo *</Label>
              <Input value={novoResponsavel.funcao || ''} onChange={e => setNovoResponsavel({ ...novoResponsavel, funcao: e.target.value })} />
            </div>
            <div>
              <Label>Carteira Técnica *</Label>
              <Input value={novoResponsavel.carteira_tecnica || ''} onChange={e => setNovoResponsavel({ ...novoResponsavel, carteira_tecnica: e.target.value })} />
            </div>
            <div>
              <Label>Assinatura</Label>
              <select value={novoResponsavel.assinatura_url} onChange={e => setNovoResponsavel({ ...novoResponsavel, assinatura_url: e.target.value })} className="w-full mt-1 border border-gray-300 rounded dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
                <option value="">Selecione uma assinatura</option>
                {assinaturas.map(img => <option key={img} value={`/images/assinaturas/${img}`}>{img}</option>)}
              </select>
              {novoResponsavel.assinatura_url && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={novoResponsavel.assinatura_url}
                    alt="Prévia da assinatura"
                    style={{ maxWidth: 180, maxHeight: 60, border: '1px solid #eee', background: '#fff', padding: 4 }}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModalResponsavel(false)}>Cancelar</Button>
              <Button onClick={salvarResponsavel}>Salvar</Button>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Responsáveis cadastrados</h4>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {responsaveis.map(r => (
                <li key={r.id} className="flex items-center justify-between border-b pb-1">
                  <span>{r.nome} - {r.funcao} ({r.carteira_tecnica})</span>
                  <button onClick={() => excluirResponsavel(r.id)} className="text-red-500 hover:text-red-700"><Trash size={16} /></button>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Novo/Editar Laudo */}
      <Dialog open={showNovoLaudo} onOpenChange={(open) => {
        setShowNovoLaudo(open);
        if (!open) resetFormulario();
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoLaudo ? 'Editar Laudo' : 'Novo Laudo de Liberação'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Seleção de Coleta */}
            {!editandoLaudo && (
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Selecionar Coleta Aprovada *
                </Label>
                <Select value={novoLaudo.coleta_id} onValueChange={selecionarColeta}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Escolha uma coleta aprovada" />
                  </SelectTrigger>
                  <SelectContent>
                    {coletasAprovadas.map((coleta) => (
                      <SelectItem key={coleta.id} value={coleta.id}>
                        Lote {coleta.lote_producao} - {new Date(coleta.data_coleta).toLocaleDateString('pt-BR')} - {coleta.responsavel_coleta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Resumo das Análises */}
            {analises.length > 0 && (
              <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
                <div className="font-semibold mb-2 text-blue-900 dark:text-blue-300">Resumo das Análises Finalizadas</div>
                <table className="w-full text-xs border dark:border-gray-700">
                  <thead>
                    <tr className="bg-blue-100 dark:bg-blue-900/50">
                      <th className="px-2 py-1 border dark:border-gray-700 dark:text-gray-100">Amostra</th>
                      <th className="px-2 py-1 border dark:border-gray-700 dark:text-gray-100">Umidade (%)</th>
                      <th className="px-2 py-1 border dark:border-gray-700 dark:text-gray-100">pH</th>
                      <th className="px-2 py-1 border dark:border-gray-700 dark:text-gray-100">Aspecto</th>
                      <th className="px-2 py-1 border dark:border-gray-700 dark:text-gray-100">Cor</th>
                      <th className="px-2 py-1 border dark:border-gray-700 dark:text-gray-100">Odor</th>
                      <th className="px-2 py-1 border dark:border-gray-700 dark:text-gray-100">Sabor</th>
                      <th className="px-2 py-1 border dark:border-gray-700 dark:text-gray-100">Embalagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analises.map((a) => (
                      <tr key={a.id || a.numero_amostra}>
                        <td className="px-2 py-1 border text-center dark:border-gray-700 dark:text-gray-200">{a.numero_amostra}</td>
                        <td className="px-2 py-1 border text-center dark:border-gray-700 dark:text-gray-200">{a.umidade ?? '-'}</td>
                        <td className="px-2 py-1 border text-center dark:border-gray-700 dark:text-gray-200">{a.ph ?? '-'}</td>
                        <td className="px-2 py-1 border text-center dark:border-gray-700 dark:text-gray-200">{a.aspecto ?? '-'}</td>
                        <td className="px-2 py-1 border text-center dark:border-gray-700 dark:text-gray-200">{a.cor ?? '-'}</td>
                        <td className="px-2 py-1 border text-center dark:border-gray-700 dark:text-gray-200">{a.odor ?? '-'}</td>
                        <td className="px-2 py-1 border text-center dark:border-gray-700 dark:text-gray-200">{a.sabor ?? '-'}</td>
                        <td className="px-2 py-1 border text-center dark:border-gray-700 dark:text-gray-200">{a.embalagem ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Produto Acabado */}
            <div>
              <Label htmlFor="marca_produto" className="text-sm font-medium text-gray-700">
                Produto Acabado *
              </Label>
              <Select value={novoLaudo.marca_produto} onValueChange={v => setNovoLaudo({ ...novoLaudo, marca_produto: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_fabricacao" className="text-sm font-medium text-gray-700">
                  Data de Fabricação *
                </Label>
                <Input
                  id="data_fabricacao"
                  type="date"
                  value={novoLaudo.data_fabricacao}
                  onChange={(e) => setNovoLaudo({ ...novoLaudo, data_fabricacao: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="data_validade" className="text-sm font-medium text-gray-700">
                  Data de Validade *
                </Label>
                <Input
                  id="data_validade"
                  type="date"
                  value={novoLaudo.data_validade}
                  onChange={(e) => setNovoLaudo({ ...novoLaudo, data_validade: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="data_emissao" className="text-sm font-medium text-gray-700">
                  Data de Emissão da Revisão *
                </Label>
                <Input
                  id="data_emissao"
                  type="date"
                  value={novoLaudo.data_emissao}
                  onChange={(e) => setNovoLaudo({ ...novoLaudo, data_emissao: e.target.value })}
                  className="mt-1"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                  Esta é a data de emissão da revisão do modelo de laudo (não do laudo individual).
                </span>
              </div>
              <div>
                <Label htmlFor="revisao" className="text-sm font-medium text-gray-700">
                  Revisão *
                </Label>
                <Input
                  id="revisao"
                  type="text"
                  value={novoLaudo.revisao}
                  onChange={(e) => setNovoLaudo({ ...novoLaudo, revisao: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Resultado e Responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Resultado Geral *
                </Label>
                <Select value={novoLaudo.resultado_geral} onValueChange={(value: 'aprovado' | 'reprovado') => setNovoLaudo({ ...novoLaudo, resultado_geral: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="responsavel_liberacao" className="text-sm font-medium text-gray-700">
                  Responsável pela Liberação *
                </Label>
                <Select value={novoLaudo.responsavel_liberacao} onValueChange={v => setNovoLaudo({ ...novoLaudo, responsavel_liberacao: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsaveis.map(r => (
                      <SelectItem key={r.id} value={r.nome}>{r.nome} - {r.funcao} ({r.carteira_tecnica})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label htmlFor="observacoes" className="text-sm font-medium text-gray-700">
                Observações
              </Label>
              <Textarea
                id="observacoes"
                value={novoLaudo.observacoes}
                onChange={(e) => setNovoLaudo({ ...novoLaudo, observacoes: e.target.value })}
                rows={6}
                className="mt-1"
                placeholder="Informações regulamentares e observações..."
              />
            </div>

            {/* Exibir data de emissão do laudo individual no modo edição */}
            {editandoLaudo && editandoLaudo.created_at && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Data de Emissão do Laudo</Label>
                <Input value={new Date(editandoLaudo.created_at).toLocaleDateString('pt-BR')} readOnly className="mt-1 bg-gray-100 dark:bg-gray-800 cursor-not-allowed" />
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNovoLaudo(false);
                  resetFormulario();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={editandoLaudo ? editarLaudo : criarLaudo}
                disabled={!novoLaudo.coleta_id || !novoLaudo.marca_produto || !novoLaudo.responsavel_liberacao}
              >
                {editandoLaudo ? 'Salvar Alterações' : 'Criar Laudo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 