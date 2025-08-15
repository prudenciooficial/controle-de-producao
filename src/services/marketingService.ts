import { supabase } from "@/integrations/supabase/client";

export type RedeSocial = 'instagram'|'facebook'|'whatsapp'|'linkedin'|'tiktok'|'youtube';
export type StatusPost = 'planejada'|'aprovada'|'publicada'|'cancelada';

export interface PostagemCronograma {
  id: string;
  data_postagem: string; // yyyy-mm-dd
  tema: string;
  descricao?: string;
  rede_social?: RedeSocial;
  status: StatusPost;
  eh_sugestao_ia: boolean;
  observacoes?: string;
  data_criacao?: string;
  data_atualizacao?: string;
  criado_por?: string;
}

export interface DataEspecial {
  id: string;
  nome: string;
  data_evento: string; // yyyy-mm-dd
  tipo: 'catolica'|'comemorativa'|'nacional'|'internacional'|'empresa';
  descricao?: string;
  sugestao_tema?: string;
  recorrente?: boolean;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const fetchCronograma = async (inicioISO: string, fimISO: string): Promise<PostagemCronograma[]> => {
  const { data, error } = await supabase
    .from('cronograma_postagens')
    .select('*')
    .gte('data_postagem', inicioISO)
    .lte('data_postagem', fimISO)
    .order('data_postagem', { ascending: true });
  if (error) throw error;
  return data as PostagemCronograma[];
};

export const createPostagem = async (payload: Omit<PostagemCronograma, 'id'|'data_criacao'|'data_atualizacao'|'criado_por'>) => {
  const { data, error } = await supabase
    .from('cronograma_postagens')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as PostagemCronograma;
};

export const updatePostagem = async (id: string, updates: Partial<PostagemCronograma>) => {
  const { data, error } = await supabase
    .from('cronograma_postagens')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PostagemCronograma;
};

export const deletePostagem = async (id: string) => {
  const { error } = await supabase
    .from('cronograma_postagens')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const fetchDatasEspeciais = async (inicioISO: string, fimISO: string): Promise<DataEspecial[]> => {
  const { data, error } = await supabase
    .from('datas_especiais')
    .select('*')
    .gte('data_evento', inicioISO)
    .lte('data_evento', fimISO)
    .order('data_evento', { ascending: true });
  if (error) throw error;
  return data as DataEspecial[];
};

export const updateDataEspecial = async (id: string, updates: Partial<DataEspecial>) => {
  const { data, error } = await supabase
    .from('datas_especiais')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DataEspecial;
};

export const deleteDataEspecial = async (id: string) => {
  const { error } = await supabase
    .from('datas_especiais')
    .delete()
    .eq('id', id);
  if (error) throw error;
};


export interface SugestaoIA {
  data_postagem: string;
  tema: string;
  descricao: string;
  rede_social: RedeSocial | string;
  status: StatusPost | string;
  eh_sugestao_ia: boolean;
  observacoes?: string;
}

export const getSugestoesIAMock = async (params?: { mes?: number; ano?: number; canais?: string[] }) => {
  const { data, error } = await supabase.functions.invoke('sugestoes-marketing', { body: params || {} });
  if (error) throw error;
  return data as SugestaoIA[];
};
