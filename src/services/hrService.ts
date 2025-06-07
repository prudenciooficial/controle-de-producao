import { supabase } from "@/integrations/supabase/client";
import { logSystemEvent } from "@/services/logService";
import type { Funcionario, JornadaTrabalho, Feriado, ConfiguracaoEmpresa } from "@/types/hr";

// ==================== FUNCIONÁRIOS ====================
export const getFuncionarios = async (): Promise<Funcionario[]> => {
  const { data, error } = await supabase
    .from('funcionarios')
    .select(`
      *,
      jornada:jornadas_trabalho(*)
    `)
    .order('nome_completo');

  if (error) {
    console.error('Erro ao buscar funcionários:', error);
    throw error;
  }

  return (data || []) as unknown as Funcionario[];
};

export const createFuncionario = async (
  funcionario: Omit<Funcionario, 'id' | 'created_at' | 'updated_at'>,
  userId?: string,
  userDisplayName?: string
): Promise<Funcionario> => {
  const { data, error } = await supabase
    .from('funcionarios')
    .insert(funcionario)
    .select(`
      *,
      jornada:jornadas_trabalho(*)
    `)
    .single();

  if (error) {
    console.error('Erro ao criar funcionário:', error);
    throw error;
  }

  // Registrar log da criação
  if (userId && userDisplayName) {
    try {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'CREATE',
        entityTable: 'funcionarios',
        entityId: data.id,
        newData: {
          nome_completo: data.nome_completo,
          cpf: data.cpf,
          cargo: data.cargo,
          setor: data.setor,
          status: data.status,
          data_admissao: data.data_admissao,
          jornada_id: data.jornada_id
        }
      });
    } catch (logError) {
      console.warn('Erro ao registrar log de criação de funcionário:', logError);
    }
  }

  return data as unknown as Funcionario;
};

export const updateFuncionario = async (
  id: string, 
  funcionario: Partial<Funcionario>,
  userId?: string,
  userDisplayName?: string
): Promise<Funcionario> => {
  // Buscar dados originais para o log
  let originalData = null;
  try {
    const { data: originalFuncionario } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('id', id)
      .single();
    originalData = originalFuncionario;
  } catch (error) {
    console.warn('Não foi possível buscar dados originais do funcionário para log:', error);
  }

  const { data, error } = await supabase
    .from('funcionarios')
    .update(funcionario)
    .eq('id', id)
    .select(`
      *,
      jornada:jornadas_trabalho(*)
    `)
    .single();

  if (error) {
    console.error('Erro ao atualizar funcionário:', error);
    throw error;
  }

  // Registrar log da atualização
  if (userId && userDisplayName) {
    try {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'UPDATE',
        entityTable: 'funcionarios',
        entityId: id,
        oldData: originalData ? {
          nome_completo: originalData.nome_completo,
          cpf: originalData.cpf,
          cargo: originalData.cargo,
          setor: originalData.setor,
          status: originalData.status,
          data_admissao: originalData.data_admissao,
          jornada_id: originalData.jornada_id
        } : undefined,
        newData: {
          nome_completo: data.nome_completo,
          cpf: data.cpf,
          cargo: data.cargo,
          setor: data.setor,
          status: data.status,
          data_admissao: data.data_admissao,
          jornada_id: data.jornada_id
        }
      });
    } catch (logError) {
      console.warn('Erro ao registrar log de atualização de funcionário:', logError);
    }
  }

  return data as unknown as Funcionario;
};

export const deleteFuncionario = async (
  id: string,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  // Buscar dados do funcionário antes de deletar para o log
  let funcionarioData = null;
  try {
    const { data: funcionario } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('id', id)
      .single();
    funcionarioData = funcionario;
  } catch (error) {
    console.warn('Não foi possível buscar dados do funcionário para log:', error);
  }

  const { error } = await supabase
    .from('funcionarios')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar funcionário:', error);
    throw error;
  }

  // Registrar log da exclusão
  if (userId && userDisplayName && funcionarioData) {
    try {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'DELETE',
        entityTable: 'funcionarios',
        entityId: id,
        oldData: {
          nome_completo: funcionarioData.nome_completo,
          cpf: funcionarioData.cpf,
          cargo: funcionarioData.cargo,
          setor: funcionarioData.setor,
          status: funcionarioData.status,
          data_admissao: funcionarioData.data_admissao,
          jornada_id: funcionarioData.jornada_id
        }
      });
    } catch (logError) {
      console.warn('Erro ao registrar log de exclusão de funcionário:', logError);
    }
  }
};

// ==================== JORNADAS DE TRABALHO ====================
export const getJornadasTrabalho = async (): Promise<JornadaTrabalho[]> => {
  const { data, error } = await supabase
    .from('jornadas_trabalho')
    .select('*')
    .order('nome');

  if (error) {
    console.error('Erro ao buscar jornadas de trabalho:', error);
    throw error;
  }

  return (data || []) as unknown as JornadaTrabalho[];
};

// Alias para getJornadasTrabalho para compatibilidade
export const getJornadas = getJornadasTrabalho;

export const createJornadaTrabalho = async (
  jornada: Omit<JornadaTrabalho, 'id' | 'created_at' | 'updated_at'>,
  userId?: string,
  userDisplayName?: string
): Promise<JornadaTrabalho> => {
  const { data, error } = await supabase
    .from('jornadas_trabalho')
    .insert(jornada as any)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar jornada de trabalho:', error);
    throw error;
  }

  // Registrar log da criação
  if (userId && userDisplayName) {
    try {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'CREATE',
        entityTable: 'jornadas_trabalho',
        entityId: data.id,
        newData: {
          nome: data.nome,
          descricao_impressao: data.descricao_impressao,
          horarios_estruturados: data.horarios_estruturados
        }
      });
    } catch (logError) {
      console.warn('Erro ao registrar log de criação de jornada:', logError);
    }
  }

  return data as unknown as JornadaTrabalho;
};

export const updateJornadaTrabalho = async (
  id: string, 
  jornada: Partial<JornadaTrabalho>,
  userId?: string,
  userDisplayName?: string
): Promise<JornadaTrabalho> => {
  // Buscar dados originais para o log
  let originalData = null;
  try {
    const { data: originalJornada } = await supabase
      .from('jornadas_trabalho')
      .select('*')
      .eq('id', id)
      .single();
    originalData = originalJornada;
  } catch (error) {
    console.warn('Não foi possível buscar dados originais da jornada para log:', error);
  }

  const { data, error } = await supabase
    .from('jornadas_trabalho')
    .update(jornada as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar jornada de trabalho:', error);
    throw error;
  }

  // Registrar log da atualização
  if (userId && userDisplayName) {
    try {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'UPDATE',
        entityTable: 'jornadas_trabalho',
        entityId: id,
        oldData: originalData ? {
          nome: originalData.nome,
          descricao_impressao: originalData.descricao_impressao,
          horarios_estruturados: originalData.horarios_estruturados
        } : undefined,
        newData: {
          nome: data.nome,
          descricao_impressao: data.descricao_impressao,
          horarios_estruturados: data.horarios_estruturados
        }
      });
    } catch (logError) {
      console.warn('Erro ao registrar log de atualização de jornada:', logError);
    }
  }

  return data as unknown as JornadaTrabalho;
};

export const deleteJornadaTrabalho = async (
  id: string,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  // Buscar dados da jornada antes de deletar para o log
  let jornadaData = null;
  try {
    const { data: jornada } = await supabase
      .from('jornadas_trabalho')
      .select('*')
      .eq('id', id)
      .single();
    jornadaData = jornada;
  } catch (error) {
    console.warn('Não foi possível buscar dados da jornada para log:', error);
  }

  const { error } = await supabase
    .from('jornadas_trabalho')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar jornada de trabalho:', error);
    throw error;
  }

  // Registrar log da exclusão
  if (userId && userDisplayName && jornadaData) {
    try {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'DELETE',
        entityTable: 'jornadas_trabalho',
        entityId: id,
        oldData: {
          nome: jornadaData.nome,
          descricao_impressao: jornadaData.descricao_impressao,
          horarios_estruturados: jornadaData.horarios_estruturados
        }
      });
    } catch (logError) {
      console.warn('Erro ao registrar log de exclusão de jornada:', logError);
    }
  }
};

// ==================== FERIADOS ====================
export const getFeriados = async (ano?: number): Promise<Feriado[]> => {
  let query = supabase
    .from('feriados')
    .select('*')
    .eq('ativo', true)
    .order('data');

  if (ano) {
    query = query.eq('ano', ano);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar feriados:', error);
    throw error;
  }

  // Converter strings de data para Date objects
  return (data || []).map(feriado => ({
    ...feriado,
    data: new Date(feriado.data),
    created_at: new Date(feriado.created_at),
    updated_at: new Date(feriado.updated_at),
  })) as Feriado[];
};

export const createFeriado = async (
  feriado: Omit<Feriado, 'id' | 'created_at' | 'updated_at'>,
  userId?: string,
  userDisplayName?: string
): Promise<Feriado> => {
  // Converter Date para string para o banco
  const feriadoForDB = {
    ...feriado,
    data: feriado.data instanceof Date ? feriado.data.toISOString().split('T')[0] : feriado.data,
  };

  const { data, error } = await supabase
    .from('feriados')
    .insert(feriadoForDB)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar feriado:', error);
    throw error;
  }

  // Registrar log da criação
  if (userId && userDisplayName) {
    try {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'CREATE',
        entityTable: 'feriados',
        entityId: data.id,
        newData: {
          nome: data.nome,
          data: data.data,
          tipo: data.tipo,
          ano: data.ano,
          ativo: data.ativo,
          descricao: data.descricao
        }
      });
    } catch (logError) {
      console.warn('Erro ao registrar log de criação de feriado:', logError);
    }
  }

  // Converter string de volta para Date no retorno
  return {
    ...data,
    data: new Date(data.data),
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
  } as Feriado;
};

export const updateFeriado = async (
  id: string, 
  feriado: Partial<Feriado>,
  userId?: string,
  userDisplayName?: string
): Promise<Feriado> => {
  // Buscar dados originais para o log
  let originalData = null;
  try {
    const { data: originalFeriado } = await supabase
      .from('feriados')
      .select('*')
      .eq('id', id)
      .single();
    originalData = originalFeriado;
  } catch (error) {
    console.warn('Não foi possível buscar dados originais do feriado para log:', error);
  }

  // Converter Date para string se necessário e remover campos de data de criação/atualização
  const { created_at, updated_at, ...feriadoWithoutDates } = feriado;
  const feriadoForDB = {
    ...feriadoWithoutDates,
    ...(feriado.data && {
      data: feriado.data instanceof Date ? feriado.data.toISOString().split('T')[0] : feriado.data,
    }),
  };

  const { data, error } = await supabase
    .from('feriados')
    .update(feriadoForDB)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar feriado:', error);
    throw error;
  }

  // Registrar log da atualização
  if (userId && userDisplayName) {
    try {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'UPDATE',
        entityTable: 'feriados',
        entityId: id,
        oldData: originalData ? {
          nome: originalData.nome,
          data: originalData.data,
          tipo: originalData.tipo,
          ano: originalData.ano,
          ativo: originalData.ativo,
          descricao: originalData.descricao
        } : undefined,
        newData: {
          nome: data.nome,
          data: data.data,
          tipo: data.tipo,
          ano: data.ano,
          ativo: data.ativo,
          descricao: data.descricao
        }
      });
    } catch (logError) {
      console.warn('Erro ao registrar log de atualização de feriado:', logError);
    }
  }

  // Converter string de volta para Date no retorno
  return {
    ...data,
    data: new Date(data.data),
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
  } as Feriado;
};

export const deleteFeriado = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('feriados')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar feriado:', error);
    throw error;
  }
};

// ==================== CONFIGURAÇÃO DA EMPRESA ====================
export const getConfiguracaoEmpresa = async (): Promise<ConfiguracaoEmpresa | null> => {
  const { data, error } = await supabase
    .from('configuracoes_empresa')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Nenhum registro encontrado
      return null;
    }
    console.error('Erro ao buscar configuração da empresa:', error);
    throw error;
  }

  return data as unknown as ConfiguracaoEmpresa;
};

export const updateConfiguracaoEmpresa = async (
  id: string, 
  config: Partial<ConfiguracaoEmpresa>,
  userId?: string,
  userDisplayName?: string
): Promise<ConfiguracaoEmpresa> => {
  // Buscar dados originais para o log
  let originalData = null;
  try {
    const { data: originalConfig } = await supabase
      .from('configuracoes_empresa')
      .select('*')
      .eq('id', id)
      .single();
    originalData = originalConfig;
  } catch (error) {
    console.warn('Não foi possível buscar dados originais da configuração para log:', error);
  }

  // Remover campos de data que podem causar conflito de tipos
  const { created_at, updated_at, ...configForDB } = config;
  
  const { data, error } = await supabase
    .from('configuracoes_empresa')
    .update(configForDB)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar configuração da empresa:', error);
    throw error;
  }

  // Registrar log da atualização
  if (userId && userDisplayName) {
    try {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'UPDATE',
        entityTable: 'configuracoes_empresa',
        entityId: id,
        oldData: originalData ? {
          nome_empresa: originalData.nome_empresa,
          cnpj: originalData.cnpj,
          endereco: originalData.endereco
        } : undefined,
        newData: {
          nome_empresa: data.nome_empresa,
          cnpj: data.cnpj,
          endereco: data.endereco
        }
      });
    } catch (logError) {
      console.warn('Erro ao registrar log de atualização de configuração da empresa:', logError);
    }
  }

  return data as unknown as ConfiguracaoEmpresa;
};
