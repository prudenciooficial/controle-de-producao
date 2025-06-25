export interface Reclamacao {
  id: number;
  created_at: string;
  protocolo?: string;                // ID do usuário do ManyChat (user_id)
  nome_cliente?: string;             // Nome completo do cliente
  supermercado?: string;             // Nome do supermercado
  cidade_estado?: string;            // Localização
  url_foto_lote?: string;           // URL da foto do lote
  url_foto_problema?: string;       // URL da foto do problema
  descricao_reclamacao?: string;    // Descrição do problema relatado
  contato_wa?: string;              // Número do WhatsApp
  link_contato_wa?: string;         // Link direto para WhatsApp
  status: string;                   // Status da reclamação (Nova, Em Análise, Resolvida, etc.)
  tipo_resolucao?: string;          // Como foi resolvida: Ressarcimento via pix, Envio de produto, Outros
  valor_ressarcimento?: number;     // Valor do ressarcimento (se aplicável)
  data_resolucao?: string;          // Data quando foi resolvida
  lote?: string;                    // Lote do produto da reclamação
}

export interface ReclamacaoCreate {
  protocolo?: string;
  nome_cliente?: string;
  supermercado?: string;
  cidade_estado?: string;
  url_foto_lote?: string;
  url_foto_problema?: string;
  descricao_reclamacao?: string;
  contato_wa?: string;
  link_contato_wa?: string;
  status?: string;
  tipo_resolucao?: string;
  valor_ressarcimento?: number;
  data_resolucao?: string;
  lote?: string;
}

export interface ReclamacaoUpdate {
  status?: string;
  tipo_resolucao?: string;
  valor_ressarcimento?: number;
  data_resolucao?: string;
  lote?: string;
  // Outros campos podem ser atualizados se necessário
}

export interface ReclamacaoFilters {
  status?: string;
  nome_cliente?: string;
  supermercado?: string;
  cidade_estado?: string;
  protocolo?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface ReclamacaoStats {
  total: number;
  nova: number;
  em_analise: number;
  resolvida: number;
  rejeitada: number;
  arquivada: number;
  por_status: {
    [key: string]: number;
  };
}

export interface ResolucaoData {
  tipo_resolucao: string;
  valor_ressarcimento?: number;
} 