import { supabase } from "@/integrations/supabase/client";
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

  return data || [];
};

export const createFuncionario = async (funcionario: Omit<Funcionario, 'id' | 'created_at' | 'updated_at'>): Promise<Funcionario> => {
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

  return data;
};

export const updateFuncionario = async (id: string, funcionario: Partial<Funcionario>): Promise<Funcionario> => {
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

  return data;
};

export const deleteFuncionario = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('funcionarios')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar funcionário:', error);
    throw error;
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

  return data || [];
};

// Alias para getJornadasTrabalho para compatibilidade
export const getJornadas = getJornadasTrabalho;

export const createJornadaTrabalho = async (jornada: Omit<JornadaTrabalho, 'id' | 'created_at' | 'updated_at'>): Promise<JornadaTrabalho> => {
  const { data, error } = await supabase
    .from('jornadas_trabalho')
    .insert(jornada)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar jornada de trabalho:', error);
    throw error;
  }

  return data;
};

export const updateJornadaTrabalho = async (id: string, jornada: Partial<JornadaTrabalho>): Promise<JornadaTrabalho> => {
  const { data, error } = await supabase
    .from('jornadas_trabalho')
    .update(jornada)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar jornada de trabalho:', error);
    throw error;
  }

  return data;
};

export const deleteJornadaTrabalho = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('jornadas_trabalho')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar jornada de trabalho:', error);
    throw error;
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

  return data || [];
};

export const createFeriado = async (feriado: Omit<Feriado, 'id' | 'created_at' | 'updated_at'>): Promise<Feriado> => {
  const { data, error } = await supabase
    .from('feriados')
    .insert(feriado)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar feriado:', error);
    throw error;
  }

  return data;
};

export const updateFeriado = async (id: string, feriado: Partial<Feriado>): Promise<Feriado> => {
  const { data, error } = await supabase
    .from('feriados')
    .update(feriado)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar feriado:', error);
    throw error;
  }

  return data;
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

// ==================== CONFIGURAÇÕES DA EMPRESA ====================
export const getConfiguracaoEmpresa = async (): Promise<ConfiguracaoEmpresa | null> => {
  const { data, error } = await supabase
    .from('configuracoes_empresa')
    .select('*')
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar configuração da empresa:', error);
    throw error;
  }

  return data;
};

export const updateConfiguracaoEmpresa = async (id: string, config: Partial<ConfiguracaoEmpresa>): Promise<ConfiguracaoEmpresa> => {
  const { data, error } = await supabase
    .from('configuracoes_empresa')
    .update(config)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar configuração da empresa:', error);
    throw error;
  }

  return data;
};
