import React, { useState, useEffect } from 'react';
import { Plus, FileText, CheckCircle, XCircle, Eye, AlertTriangle, TrendingUp, Clock, Users, Printer, Edit, Trash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AnaliseIndividual from '../components/AnaliseIndividual';
import { useToast } from '@/components/ui/use-toast';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

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
}

interface DadosLaudo {
  marca_produto: string;
  gramatura: string;
  data_fabricacao: string;
  data_validade: string;
  responsavel_liberacao: string;
  observacoes: string;
  numero_laudo?: number;
  resultado_geral: 'aprovado' | 'reprovado';
}

// Componente de Card de Estatística Moderno
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

// Componente de Badge de Status Moderno
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

export default function AnaliseQualidade() {
  const [coletas, setColetas] = useState<ColetaAmostra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovaColeta, setShowNovaColeta] = useState(false);
  const [showAnalises, setShowAnalises] = useState<string | null>(null);
  const { toast } = useToast();

  // Estados para nova coleta
  const [novaColeta, setNovaColeta] = useState({
    lote_producao: '',
    data_coleta: new Date().toISOString().split('T')[0],
    quantidade_total_produzida: '',
    quantidade_amostras: 13,
    responsavel_coleta: '',
    observacoes: ''
  });

  // Estados para análises
  const [analises, setAnalises] = useState<AnaliseAmostra[]>([]);
  const [coletaSelecionada, setColetaSelecionada] = useState<ColetaAmostra | null>(null);
  const [editandoColeta, setEditandoColeta] = useState<ColetaAmostra | null>(null);

  const [coletasComLaudo, setColetasComLaudo] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    carregarColetas();
  }, []);

  useEffect(() => {
    // Após carregar coletas, verificar quais têm laudo
    const verificarLaudos = async () => {
      if (coletas.length === 0) {
        setColetasComLaudo({});
        return;
      }
      const ids = coletas.map(c => c.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('laudos_liberacao')
        .select('id,coleta_id')
        .in('coleta_id', ids);
      if (error) {
        toast({
          title: 'Erro ao buscar laudos',
          description: 'Não foi possível verificar os laudos das coletas.',
          variant: 'destructive',
        });
        setColetasComLaudo({});
        return;
      }
      const laudos: { [key: string]: boolean } = {};
      (data || []).forEach((laudo: { id: string; coleta_id: string }) => {
        laudos[laudo.coleta_id] = true;
      });
      setColetasComLaudo(laudos);
    };
    verificarLaudos();
  }, [coletas]);

  const carregarColetas = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('coletas_amostras')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar coletas:', error);
        if (error.code === '42P01') {
          toast({
            title: 'Erro ao carregar coletas',
            description: '⚠️ As tabelas de análise de qualidade ainda não foram criadas no banco de dados. Execute o SQL da migração primeiro.',
            variant: 'destructive',
          });
        }
        return;
      }
      setColetas(data || []);
    } catch (error) {
      console.error('Erro ao carregar coletas:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarNovaColeta = async () => {
    if (!novaColeta.lote_producao || !novaColeta.quantidade_total_produzida || !novaColeta.responsavel_coleta) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('coletas_amostras')
        .insert([{
          ...novaColeta,
          quantidade_total_produzida: parseFloat(novaColeta.quantidade_total_produzida)
        }])
        .select()
        .single();

      if (error) throw error;

      // Criar registros vazios para as análises
      const analisesPadrao = Array.from({ length: novaColeta.quantidade_amostras }, (_, index) => ({
        coleta_id: data.id,
        numero_amostra: index + 1,
        data_analise: new Date().toISOString()
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('analises_amostras')
        .insert(analisesPadrao);

      toast({
        title: 'Coleta criada',
        description: '✅ Coleta criada com sucesso!',
        variant: 'default',
      });
      setShowNovaColeta(false);
      setNovaColeta({
        lote_producao: '',
        data_coleta: new Date().toISOString().split('T')[0],
        quantidade_total_produzida: '',
        quantidade_amostras: 13,
        responsavel_coleta: '',
        observacoes: ''
      });
      carregarColetas();
    } catch (error) {
      console.error('Erro ao criar coleta:', error);
      toast({
        title: 'Erro ao criar coleta',
        description: '❌ Erro ao criar coleta',
        variant: 'destructive',
      });
    }
  };

  const carregarAnalises = async (coletaId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('analises_amostras')
        .select('*')
        .eq('coleta_id', coletaId)
        .order('numero_amostra');

      if (error) throw error;
      setAnalises(data || []);
    } catch (error) {
      console.error('Erro ao carregar análises:', error);
    }
  };

  const areAllAnalysesComplete = (analyses: AnaliseAmostra[]): boolean => {
    return analyses.length > 0 && analyses.every(analise => 
      analise.umidade !== null && analise.umidade !== undefined &&
      analise.ph !== null && analise.ph !== undefined &&
      analise.aspecto && analise.cor && analise.odor && analise.sabor &&
      analise.umidade_conforme !== null && analise.umidade_conforme !== undefined &&
      analise.ph_conforme !== null && analise.ph_conforme !== undefined
    );
  };

  const salvarAnalise = async (analise: Partial<AnaliseAmostra>) => {
    try {
      // Remover campos gerados do objeto antes de enviar ao Supabase
      const { umidade_conforme, ph_conforme, ...analiseSemGerados } = analise;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('analises_amostras')
        .upsert(analiseSemGerados, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista de análises local
      setAnalises(prev => {
        const updated = prev.map(a => a.id === data.id ? data : a);
        return updated.some(a => a.id === data.id) ? updated : [...prev, data];
      });

      toast({
        title: 'Análise salva',
        description: '✅ Análise salva com sucesso!',
        variant: 'default',
      });

      // Buscar todas as análises atualizadas para verificar se estão completas
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updatedAnalyses, error: fetchError } = await (supabase as any)
        .from('analises_amostras')
        .select('*')
        .eq('coleta_id', analise.coleta_id)
        .order('numero_amostra');

      if (fetchError) throw fetchError;

      // Verificar se todas as análises estão completas
      if (coletaSelecionada && areAllAnalysesComplete(updatedAnalyses || [])) {
        // Atualizar o status da coleta para 'finalizada'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('coletas_amostras')
          .update({ status: 'finalizada' })
          .eq('id', coletaSelecionada.id);

        toast({
          title: 'Coleta finalizada!',
          description: '✅ Todas as análises foram completadas. A coleta agora pode ser aprovada e um laudo pode ser gerado na página de Laudos.',
          variant: 'default',
        });

        // Atualizar a lista de coletas local
        setColetas(prevColetas =>
          prevColetas.map(c =>
            c.id === coletaSelecionada.id
              ? { ...c, status: 'finalizada' }
              : c
          )
        );

        setShowAnalises(null); // Fechar modal após finalização
      }
    } catch (error) {
      console.error('Erro ao salvar análise:', error);
      toast({
        title: 'Erro ao salvar análise',
        description: '❌ Erro ao salvar análise',
        variant: 'destructive',
      });
    }
  };

  const visualizarLaudo = async (coletaId: string) => {
    try {
      // Buscar o laudo da coleta
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: laudo, error } = await (supabase as any)
        .from('laudos_liberacao')
        .select('id')
        .eq('coleta_id', coletaId)
        .limit(1);

      if (error) {
        console.error('Erro ao buscar laudo:', error);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Erro ao buscar laudo para impressão.'
        });
        return;
      }

      if (!laudo || laudo.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Laudo não encontrado',
          description: 'Não foi encontrado um laudo para esta coleta. Crie um laudo na página de Laudos primeiro.'
        });
        return;
      }

      // Abrir página de impressão em nova janela
      const laudoId = laudo[0].id;
      window.open(`/print/laudo/${laudoId}`, '_blank', 'width=800,height=600');
      
    } catch (error) {
      console.error('Erro:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro inesperado ao tentar visualizar o laudo.'
      });
    }
  };

  const abrirEdicaoColeta = (coleta: ColetaAmostra) => {
    setEditandoColeta(coleta);
    setNovaColeta({
      lote_producao: coleta.lote_producao,
      data_coleta: coleta.data_coleta,
      quantidade_total_produzida: coleta.quantidade_total_produzida.toString(),
      quantidade_amostras: coleta.quantidade_amostras,
      responsavel_coleta: coleta.responsavel_coleta,
      observacoes: coleta.observacoes || ''
    });
    setShowNovaColeta(true);
  };

  const salvarEdicaoColeta = async () => {
    if (!editandoColeta) return;
    if (!novaColeta.lote_producao || !novaColeta.quantidade_total_produzida || !novaColeta.responsavel_coleta) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('coletas_amostras')
        .update({
          lote_producao: novaColeta.lote_producao,
          data_coleta: novaColeta.data_coleta,
          quantidade_total_produzida: parseFloat(novaColeta.quantidade_total_produzida),
          quantidade_amostras: novaColeta.quantidade_amostras,
          responsavel_coleta: novaColeta.responsavel_coleta,
          observacoes: novaColeta.observacoes
        })
        .eq('id', editandoColeta.id);
      if (error) throw error;

      // Sincronizar quantidade de análises com a nova quantidade de amostras
      const { data: analisesExistentes, error: errorAnalises } = await (supabase as SupabaseClient<Database>)
        .from('analises_amostras')
        .select('*')
        .eq('coleta_id', editandoColeta.id)
        .order('numero_amostra');
      if (errorAnalises) throw errorAnalises;
      const quantidadeAtual = (analisesExistentes as AnaliseAmostra[]).length;
      const novaQuantidade = novaColeta.quantidade_amostras;
      if (novaQuantidade > quantidadeAtual) {
        // Adicionar novas análises
        const novasAnalises = Array.from({ length: novaQuantidade - quantidadeAtual }, (_, i) => ({
          coleta_id: editandoColeta.id,
          numero_amostra: quantidadeAtual + i + 1,
          data_analise: new Date().toISOString()
        }));
        if (novasAnalises.length > 0) {
          await (supabase as SupabaseClient<Database>)
            .from('analises_amostras')
            .insert(novasAnalises);
        }
      } else if (novaQuantidade < quantidadeAtual) {
        // Remover análises excedentes
        const idsParaRemover = (analisesExistentes as AnaliseAmostra[])
          .filter((a) => a.numero_amostra > novaQuantidade)
          .map((a) => a.id);
        if (idsParaRemover.length > 0) {
          await (supabase as SupabaseClient<Database>)
            .from('analises_amostras')
            .delete()
            .in('id', idsParaRemover);
        }
      }

      toast({
        title: 'Coleta editada',
        description: '✅ Coleta editada com sucesso!',
        variant: 'default',
      });
      setShowNovaColeta(false);
      setEditandoColeta(null);
      setNovaColeta({
        lote_producao: '',
        data_coleta: new Date().toISOString().split('T')[0],
        quantidade_total_produzida: '',
        quantidade_amostras: 13,
        responsavel_coleta: '',
        observacoes: ''
      });
      carregarColetas();
    } catch (error) {
      console.error('Erro ao editar coleta:', error);
      toast({
        title: 'Erro ao editar coleta',
        description: '❌ Erro ao editar coleta',
        variant: 'destructive',
      });
    }
  };

  const apagarColeta = async (coleta: ColetaAmostra) => {
    if (!window.confirm('Tem certeza que deseja apagar esta coleta? Esta ação não poderá ser desfeita.')) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('coletas_amostras')
        .delete()
        .eq('id', coleta.id);
      if (error) throw error;
      toast({
        title: 'Coleta apagada',
        description: '✅ Coleta apagada com sucesso!',
        variant: 'default',
      });
      carregarColetas();
    } catch (error) {
      console.error('Erro ao apagar coleta:', error);
      toast({
        title: 'Erro ao apagar coleta',
        description: '❌ Erro ao apagar coleta',
        variant: 'destructive',
      });
    }
  };

  // Calcular estatísticas
  const stats = {
    totalColetas: coletas.length,
    coletasAndamento: coletas.filter(c => c.status === 'em_andamento').length,
    coletasAprovadas: coletas.filter(c => c.status === 'aprovada').length,
    coletasReprovadas: coletas.filter(c => c.status === 'reprovada').length
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Análise de Qualidade</h1>
          <p className="text-gray-600 dark:text-gray-300">Gerenciamento de coletas e análises de amostras</p>
        </div>
        <Button
          onClick={() => setShowNovaColeta(true)}
          className="inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Coleta
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Coletas"
          value={stats.totalColetas}
          subtitle="Coletas registradas"
          icon={FileText}
        />
        <StatCard
          title="Em Andamento"
          value={stats.coletasAndamento}
          subtitle="Aguardando análises"
          icon={Clock}
          trend={stats.coletasAndamento > 0 ? `${stats.coletasAndamento} ativo${stats.coletasAndamento > 1 ? 's' : ''}` : 'Nenhuma'}
          trendColor="bg-yellow-100 text-yellow-800"
        />
        <StatCard
          title="Aprovadas"
          value={stats.coletasAprovadas}
          subtitle="Conformes"
          icon={CheckCircle}
          trend={`${((stats.coletasAprovadas / (stats.totalColetas || 1)) * 100).toFixed(1)}%`}
          trendColor="bg-green-100 text-green-800"
        />
        <StatCard
          title="Reprovadas"
          value={stats.coletasReprovadas}
          subtitle="Não conformes"
          icon={AlertTriangle}
          trend={`${((stats.coletasReprovadas / (stats.totalColetas || 1)) * 100).toFixed(1)}%`}
          trendColor="bg-red-100 text-red-800"
        />
      </div>

      {/* Tabela de Coletas - Design Moderno */}
      <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Histórico de Coletas</h3>
        </div>
        {/* Tabela tradicional para telas médias/grandes */}
        <div className="overflow-x-auto hidden sm:block">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Lote</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Data Coleta</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Produção (kg)</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Amostras</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Responsável</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Status</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="dark:text-gray-200">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {coletas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-300">
                    <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <p className="dark:text-gray-200">Nenhuma coleta registrada</p>
                    <p className="text-sm dark:text-gray-400">Clique em "Nova Coleta" para começar</p>
                  </td>
                </tr>
              ) : (
                coletas.map((coleta) => (
                  <tr key={coleta.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {coleta.lote_producao}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      {new Date(coleta.data_coleta).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      {coleta.quantidade_total_produzida.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      {coleta.quantidade_amostras}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      {coleta.responsavel_coleta}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={coleta.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setShowAnalises(coleta.id);
                            setColetaSelecionada(coleta);
                            carregarAnalises(coleta.id);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors"
                          title="Ver Análises"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => abrirEdicaoColeta(coleta)}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/50 transition-colors"
                          title="Editar Coleta"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => apagarColeta(coleta)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                          title="Apagar Coleta"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                        {coletasComLaudo[coleta.id] && (
                          <button
                            onClick={() => visualizarLaudo(coleta.id)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors"
                            title="Visualizar Laudo"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Cards para mobile */}
        <div className="block sm:hidden space-y-4 p-4">
          {coletas.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-300">
              <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="dark:text-gray-200">Nenhuma coleta registrada</p>
              <p className="text-sm dark:text-gray-400">Clique em "Nova Coleta" para começar</p>
            </div>
          ) : (
            coletas.map((coleta) => (
              <div key={coleta.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-base">Lote: {coleta.lote_producao}</span>
                  <StatusBadge status={coleta.status} />
                </div>
                <div className="flex flex-wrap gap-2 text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Data Coleta:</span>
                  <span className="text-gray-900 dark:text-gray-100">{new Date(coleta.data_coleta).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Produção (kg):</span>
                  <span className="text-gray-900 dark:text-gray-100">{coleta.quantidade_total_produzida.toLocaleString('pt-BR')}</span>
                  <span className="text-gray-700 dark:text-gray-200 font-medium ml-4">Amostras:</span>
                  <span className="text-gray-900 dark:text-gray-100">{coleta.quantidade_amostras}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Responsável:</span>
                  <span className="text-gray-900 dark:text-gray-100">{coleta.responsavel_coleta}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      setShowAnalises(coleta.id);
                      setColetaSelecionada(coleta);
                      carregarAnalises(coleta.id);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors"
                    title="Ver Análises"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => abrirEdicaoColeta(coleta)}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/50 transition-colors"
                    title="Editar Coleta"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => apagarColeta(coleta)}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                    title="Apagar Coleta"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                  {coletasComLaudo[coleta.id] && (
                    <button
                      onClick={() => visualizarLaudo(coleta.id)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors"
                      title="Visualizar Laudo"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Análises */}
      {showAnalises && coletaSelecionada && (
        <AnaliseIndividual
          analises={analises}
          coletaId={showAnalises}
          onSalvarAnalise={salvarAnalise}
          onVoltar={() => setShowAnalises(null)}
        />
      )}

      {/* Modal Nova Coleta usando Dialog do sistema */}
      <Dialog open={showNovaColeta} onOpenChange={(open) => {
        setShowNovaColeta(open);
        if (!open) setEditandoColeta(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editandoColeta ? 'Editar Coleta de Amostras' : 'Nova Coleta de Amostras'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="lote_producao" className="text-sm font-medium text-gray-700">
                Lote de Produção *
              </Label>
              <Input
                id="lote_producao"
                type="text"
                value={novaColeta.lote_producao}
                onChange={(e) => setNovaColeta({ ...novaColeta, lote_producao: e.target.value })}
                placeholder="Ex: 2025001"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_coleta" className="text-sm font-medium text-gray-700">
                  Data da Coleta *
                </Label>
                <Input
                  id="data_coleta"
                  type="date"
                  value={novaColeta.data_coleta}
                  onChange={(e) => setNovaColeta({ ...novaColeta, data_coleta: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="quantidade_amostras" className="text-sm font-medium text-gray-700">
                  Quantidade de Amostras
                </Label>
                <Input
                  id="quantidade_amostras"
                  type="number"
                  value={novaColeta.quantidade_amostras}
                  onChange={(e) => setNovaColeta({ ...novaColeta, quantidade_amostras: parseInt(e.target.value) })}
                  min="1"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="quantidade_total_produzida" className="text-sm font-medium text-gray-700">
                Quantidade Produzida (kg) *
              </Label>
              <Input
                id="quantidade_total_produzida"
                type="number"
                value={novaColeta.quantidade_total_produzida}
                onChange={(e) => setNovaColeta({ ...novaColeta, quantidade_total_produzida: e.target.value })}
                placeholder="Ex: 20000"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="responsavel_coleta" className="text-sm font-medium text-gray-700">
                Responsável pela Coleta *
              </Label>
              <Input
                id="responsavel_coleta"
                type="text"
                value={novaColeta.responsavel_coleta}
                onChange={(e) => setNovaColeta({ ...novaColeta, responsavel_coleta: e.target.value })}
                placeholder="Nome do responsável"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="observacoes" className="text-sm font-medium text-gray-700">
                Observações
              </Label>
              <Textarea
                id="observacoes"
                value={novaColeta.observacoes}
                onChange={(e) => setNovaColeta({ ...novaColeta, observacoes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => {
                setShowNovaColeta(false);
                setEditandoColeta(null);
              }}>
                Cancelar
              </Button>
              <Button onClick={editandoColeta ? salvarEdicaoColeta : criarNovaColeta}>
                {editandoColeta ? 'Salvar Alterações' : 'Criar Coleta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 