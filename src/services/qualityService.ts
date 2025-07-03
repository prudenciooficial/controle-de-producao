import { supabase } from '@/integrations/supabase/client';
import { logSystemEvent } from '@/services/logService';
import { 
  Reclamacao, 
  ReclamacaoCreate, 
  ReclamacaoUpdate, 
  ReclamacaoFilters,
  ReclamacaoStats,
  ResolucaoData
} from '@/types/quality';

// Função auxiliar para obter usuário atual
const getCurrentUser = () => {
  const user = supabase.auth.getUser();
  return user;
};

// Função para buscar todas as reclamações com filtros
export const fetchReclamacoes = async (filters: ReclamacaoFilters = {}): Promise<Reclamacao[]> => {
  try {
    let query = (supabase as any)
      .from('reclamacoes')
      .select('*')
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.nome_cliente) {
      query = query.ilike('nome_cliente', `%${filters.nome_cliente}%`);
    }
    
    if (filters.supermercado) {
      query = query.ilike('supermercado', `%${filters.supermercado}%`);
    }
    
    if (filters.cidade_estado) {
      query = query.ilike('cidade_estado', `%${filters.cidade_estado}%`);
    }
    
    if (filters.protocolo) {
      query = query.ilike('protocolo', `%${filters.protocolo}%`);
    }
    
    if (filters.data_inicio) {
      query = query.gte('created_at', filters.data_inicio);
    }
    
    if (filters.data_fim) {
      query = query.lte('created_at', filters.data_fim);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar reclamações:', error);
      throw new Error(error.message || 'Falha ao buscar reclamações.');
    }

    return data || [];
  } catch (error) {
    console.error('Erro na função fetchReclamacoes:', error);
    return [];
  }
};

// Função para buscar uma reclamação específica
export const fetchReclamacaoById = async (id: number): Promise<Reclamacao | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from('reclamacoes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar reclamação:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro na função fetchReclamacaoById:', error);
    return null;
  }
};

// Função para criar nova reclamação
export const createReclamacao = async (reclamacao: ReclamacaoCreate): Promise<Reclamacao> => {
  try {
    const { data, error } = await (supabase as any)
      .from('reclamacoes')
      .insert({
        ...reclamacao,
        status: reclamacao.status || 'Nova',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar reclamação:', error);
      throw new Error(error.message || 'Falha ao criar reclamação.');
    }

    // Log da criação
    const user = await getCurrentUser();
    await logSystemEvent({
      userId: user?.data?.user?.id,
      userDisplayName: user?.data?.user?.user_metadata?.full_name || user?.data?.user?.email,
      actionType: 'CREATE',
      entityTable: 'reclamacoes',
      entityId: data.id.toString(),
      newData: data
    });

    return data;
  } catch (error) {
    console.error('Erro na função createReclamacao:', error);
    throw new Error('Falha ao criar reclamação.');
  }
};

// Função para atualizar reclamação
export const updateReclamacao = async (id: number, updates: ReclamacaoUpdate): Promise<Reclamacao> => {
  try {
    // Buscar dados atuais antes da atualização
    const { data: oldData } = await (supabase as any)
      .from('reclamacoes')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await (supabase as any)
      .from('reclamacoes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar reclamação:', error);
      throw new Error(error.message || 'Falha ao atualizar reclamação.');
    }

    // Log da atualização
    const user = await getCurrentUser();
    await logSystemEvent({
      userId: user?.data?.user?.id,
      userDisplayName: user?.data?.user?.user_metadata?.full_name || user?.data?.user?.email,
      actionType: 'UPDATE',
      entityTable: 'reclamacoes',
      entityId: id.toString(),
      oldData: oldData,
      newData: { ...oldData, ...updates }
    });

    return data;
  } catch (error) {
    console.error('Erro na função updateReclamacao:', error);
    throw new Error('Falha ao atualizar reclamação.');
  }
};

// Função para deletar reclamação
export const deleteReclamacao = async (id: number): Promise<void> => {
  try {
    // Buscar dados antes da exclusão
    const { data: oldData } = await (supabase as any)
      .from('reclamacoes')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await (supabase as any)
      .from('reclamacoes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar reclamação:', error);
      throw new Error(error.message || 'Falha ao deletar reclamação.');
    }

    // Log da exclusão
    const user = await getCurrentUser();
    await logSystemEvent({
      userId: user?.data?.user?.id,
      userDisplayName: user?.data?.user?.user_metadata?.full_name || user?.data?.user?.email,
      actionType: 'DELETE',
      entityTable: 'reclamacoes',
      entityId: id.toString(),
      oldData: oldData
    });
  } catch (error) {
    console.error('Erro na função deleteReclamacao:', error);
    throw new Error('Falha ao deletar reclamação.');
  }
};

// Função para buscar estatísticas das reclamações
export const fetchReclamacaoStats = async (filters: ReclamacaoFilters = {}): Promise<ReclamacaoStats> => {
  try {
    let query = (supabase as any).from('reclamacoes').select('*');

    // Aplicar filtros de data se fornecidos
    if (filters.data_inicio) {
      query = query.gte('created_at', filters.data_inicio);
    }
    
    if (filters.data_fim) {
      query = query.lte('created_at', filters.data_fim);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar estatísticas de reclamações:', error);
      throw new Error(error.message || 'Falha ao buscar estatísticas.');
    }

    const reclamacoes = data || [];

    // Calcular estatísticas por status
    const statusCounts: { [key: string]: number } = {};
    reclamacoes.forEach((r: any) => {
      const status = r.status || 'Nova';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Calcular estatísticas
    const stats: ReclamacaoStats = {
      total: reclamacoes.length,
      nova: statusCounts['Nova'] || 0,
      em_analise: statusCounts['Em Análise'] || 0,
      resolvida: statusCounts['Resolvida'] || 0,
      rejeitada: statusCounts['Rejeitada'] || 0,
      arquivada: statusCounts['Arquivada'] || 0,
      por_status: statusCounts
    };

    return stats;
  } catch (error) {
    console.error('Erro na função fetchReclamacaoStats:', error);
    return {
      total: 0,
      nova: 0,
      em_analise: 0,
      resolvida: 0,
      rejeitada: 0,
      arquivada: 0,
      por_status: {}
    };
  }
};

// Função auxiliar para marcar reclamação como resolvida
export const resolverReclamacao = async (id: number, dadosResolucao?: ResolucaoData): Promise<Reclamacao> => {
  const updateData: ReclamacaoUpdate = {
    status: 'Resolvida',
    data_resolucao: new Date().toISOString()
  };

  if (dadosResolucao) {
    updateData.tipo_resolucao = dadosResolucao.tipo_resolucao;
    if (dadosResolucao.valor_ressarcimento) {
      updateData.valor_ressarcimento = dadosResolucao.valor_ressarcimento;
    }
    if (dadosResolucao.tipos_reclamacao) {
      updateData.tipos_reclamacao = dadosResolucao.tipos_reclamacao;
    }
  }

  // Usar updateReclamacao que já tem log
  const result = await updateReclamacao(id, updateData);

  // Log específico da resolução
  const user = await getCurrentUser();
  await logSystemEvent({
    userId: user?.data?.user?.id,
    userDisplayName: user?.data?.user?.user_metadata?.full_name || user?.data?.user?.email,
    actionType: 'OTHER',
    entityTable: 'reclamacoes.resolucao',
    entityId: id.toString(),
    newData: {
      action: 'resolucao',
      tipo_resolucao: dadosResolucao?.tipo_resolucao,
      valor_ressarcimento: dadosResolucao?.valor_ressarcimento,
      tipos_reclamacao: dadosResolucao?.tipos_reclamacao,
      data_resolucao: updateData.data_resolucao
    }
  });

  return result;
};

// Função auxiliar para marcar reclamação em análise
export const analisarReclamacao = async (id: number): Promise<Reclamacao> => {
  const result = await updateReclamacao(id, {
    status: 'Em Análise'
  });

  // Log específico da análise
  const user = await getCurrentUser();
  await logSystemEvent({
    userId: user?.data?.user?.id,
    userDisplayName: user?.data?.user?.user_metadata?.full_name || user?.data?.user?.email,
    actionType: 'OTHER',
    entityTable: 'reclamacoes.analise',
    entityId: id.toString(),
    newData: {
      action: 'iniciou_analise',
      timestamp: new Date().toISOString()
    }
  });

  return result;
};

// Função auxiliar para rejeitar reclamação
export const rejeitarReclamacao = async (id: number): Promise<Reclamacao> => {
  const result = await updateReclamacao(id, {
    status: 'Rejeitada'
  });

  // Log específico da rejeição
  const user = await getCurrentUser();
  await logSystemEvent({
    userId: user?.data?.user?.id,
    userDisplayName: user?.data?.user?.user_metadata?.full_name || user?.data?.user?.email,
    actionType: 'OTHER',
    entityTable: 'reclamacoes.rejeicao',
    entityId: id.toString(),
    newData: {
      action: 'rejeitou_reclamacao',
      timestamp: new Date().toISOString()
    }
  });

  return result;
}; 