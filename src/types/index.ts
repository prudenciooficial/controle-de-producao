import { DateRange } from "react-day-picker";

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  productionDate: Date;
  productId?: string;
  productName?: string;
  items?: string;
  producedItems: ProducedItem[];
  usedMaterials: UsedMaterial[];
  mixDay: string;
  mixCount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  isMixOnly: boolean; // Deprecated but kept for backward compatibility
  mixProductionBatchId?: string; // Now references mix_batches table
  status: 'complete' | 'rework';
}

export interface ProducedItem {
  id?: string;
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  unitOfMeasure: string;
  remainingQuantity: number;
}

export interface UsedMaterial {
  id: string;
  materialBatchId: string;
  materialName: string;
  materialType: string;
  batchNumber: string;
  quantity: number;
  unitOfMeasure: string;
  mixCountUsed?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Sale {
  id: string;
  date: Date;
  invoiceNumber: string;
  customerName: string;
  type: string;
  notes?: string;
  items: SaleItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  producedItemId: string;
  batchNumber: string;
  quantity: number;
  unitOfMeasure: string;
}

export interface Order {
  id: string;
  date: Date;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  notes?: string;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  materialId: string;
  materialName: string;
  materialType: string;
  quantity: number;
  unitOfMeasure: string;
  batchNumber: string;
  expiryDate: Date;
  hasReport: boolean;
}

export interface Loss {
  id: string;
  date: Date;
  productionBatchId: string;
  batchNumber: string;
  machine: string;
  quantity: number;
  unitOfMeasure: string;
  productType: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  unitOfMeasure: string;
  weightFactor?: number;
  feculaConversionFactor?: number;
  productionPredictionFactor?: number;
  conservantConversionFactor?: number;
  conservantUsageFactor?: number;
  type?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id: string;
  name: string;
  code: string;
  description?: string;
  unitOfMeasure: string;
  type: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contacts?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialBatch {
  id: string;
  materialId: string;
  materialName: string;
  materialType: string;
  supplierId?: string;
  supplierName?: string;
  batchNumber: string;
  quantity: number;
  suppliedQuantity: number;
  unitOfMeasure: string;
  expiryDate?: Date;
  reportUrl?: string;
  hasReport?: boolean;
  remainingQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalProduction: number;
  totalSales: number;
  currentInventory: number;
  averageProfitability: number;
  capacidadeProdutiva?: number;
  totalFeculaInventoryKg?: number;
}

export interface GlobalSettings {
  id: string;
  fecula_conversion_factor: number;
  production_prediction_factor: number;
  conservant_conversion_factor: number;
  conservant_usage_factor: number;
  created_at?: string;
  updated_at?: string;
}

export interface LogEntry {
  id: string;
  created_at: string;
  user_id?: string;
  user_description?: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'OTHER';
  entity_type?: string;
  entity_id?: string;
  details: string | Record<string, any>;
}

// ==================== MÓDULO COMERCIAL ====================

// Tipos para variáveis de contrato
export interface VariavelContrato {
  nome: string;
  rotulo: string;
  tipo: 'text' | 'textarea' | 'date' | 'currency' | 'number' | 'email' | 'select';
  obrigatorio: boolean;
  placeholder?: string;
  opcoes?: string[]; // Para tipo 'select'
  validacao?: string;
}

// Modelo de contrato
export interface ModeloContrato {
  id: string;
  nome: string;
  descricao?: string;
  conteudo: string;
  variaveis: VariavelContrato[];
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string;
}

// Status do contrato
export type StatusContrato = 'rascunho' | 'aguardando_assinatura_interna' | 'aguardando_assinatura_externa' | 'concluido' | 'cancelado';

// Dados de assinatura digital qualificada (ICP-Brasil)
export interface DadosAssinaturaDigital {
  subjectCertificado: string; // Nome do titular
  emissorCertificado: string; // Autoridade certificadora
  numeroSerieCertificado: string;
  validoAPartirDe: string;
  validoAte: string;
  timestampAssinatura: string;
  algoritmoAssinatura: string;
  impressaoDigitalCertificado: string;
  nomeCompleto: string;
  cpf: string;
  email: string;
}

// Dados de assinatura eletrônica simples
export interface DadosAssinaturaSimples {
  enderecoIp: string;
  agenteUsuario: string;
  timestamp: string;
  tokenValidado: boolean;
  horaValidacaoToken: string;
  geolocalizacao?: {
    latitude: number;
    longitude: number;
    precisao: number;
  };
  evidenciasAdicionais?: {
    resolucaoTela: string;
    fusoHorario: string;
    idioma: string;
  };
}

// Contrato principal
export interface Contrato {
  id: string;
  numeroContrato: string;
  modeloId: string;
  titulo: string;
  conteudo: string;
  dadosVariaveis: Record<string, string | number | boolean | Date>;
  status: StatusContrato;
  urlPdf?: string;
  hashDocumento?: string;
  
  // Signatário interno (empresa)
  assinanteInternoId?: string;
  assinanteInternoNome?: string;
  assinanteInternoEmail?: string;
  assinadoInternamenteEm?: Date;
  dadosAssinaturaInterna?: DadosAssinaturaDigital;
  
  // Signatário externo (cliente)
  assinanteExternoNome?: string;
  assinanteExternoEmail: string;
  assinanteExternoDocumento?: string; // CPF/CNPJ
  assinadoExternamenteEm?: Date;
  tokenAssinaturaExterna?: string;
  tokenExpiraEm?: Date;
  dadosAssinaturaExterna?: DadosAssinaturaSimples;
  
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string;
  
  // Relacionamentos
  modelo?: ModeloContrato;
  logsAuditoria?: LogAuditoriaContrato[];
}

// Tipos de eventos de auditoria
export type TipoEventoContrato = 
  | 'contrato_criado'
  | 'contrato_editado'
  | 'assinatura_interna_solicitada'
  | 'assinado_internamente'
  | 'email_externo_enviado'
  | 'token_gerado'
  | 'token_validado'
  | 'assinado_externamente'
  | 'contrato_concluido'
  | 'contrato_cancelado'
  | 'documento_finalizado'
  | 'pdf_gerado'
  | 'hash_calculado';

// Log de auditoria
export interface LogAuditoriaContrato {
  id: string;
  contratoId: string;
  tipoEvento: TipoEventoContrato;
  descricaoEvento: string;
  dadosEvento?: Record<string, unknown>;
  usuarioId?: string;
  enderecoIp?: string;
  agenteUsuario?: string;
  dataHora: Date;
}

// Token de verificação
export interface TokenVerificacaoContrato {
  id: string;
  contratoId: string;
  token: string;
  email: string;
  expiraEm: Date;
  usadoEm?: Date;
  enderecoIp?: string;
  agenteUsuario?: string;
  criadoEm: Date;
}

// Dados para criar novo contrato
export interface DadosCriarContrato {
  modeloId: string;
  titulo: string;
  dadosVariaveis: Record<string, string | number | boolean | Date>;
  assinanteExternoNome: string;
  assinanteExternoEmail: string;
  assinanteExternoDocumento?: string;
  assinanteInternoId?: string;
}

// Dados para finalizar e iniciar assinaturas
export interface DadosFinalizarContrato {
  contratoId: string;
  conteudoFinal: string;
  assinanteInternoId: string;
}

// Resposta da API para contratos
export interface RespostaContratos {
  contratos: Contrato[];
  total: number;
  pagina: number;
  tamanhoPagina: number;
}

// Filtros para busca de contratos
export interface FiltrosContrato {
  status?: StatusContrato[];
  criadoPor?: string;
  intervaloData?: DateRange;
  termoBusca?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

// Estatísticas do módulo comercial
export interface EstatisticasComercial {
  totalContratos: number;
  contratosConcluidos: number;
  assinaturasPendentes: number;
  rascunhos: number;
  crescimentoMensal: number;
  tempoMedioConclusao: number; // em dias
  contratosPorStatus: Record<StatusContrato, number>;
  contratosPorMes: Array<{
    mes: string;
    quantidade: number;
  }>;
}

// Dados para assinatura digital interna
export interface DadosAssinaturaInterna {
  contratoId: string;
  certificadoSelecionado: File | null;
  senhaPrivada: string;
  motivoAssinatura?: string;
}

// Dados para assinatura externa
export interface DadosAssinaturaExterna {
  contratoId: string;
  token: string;
  aceitaTermos: boolean;
  dadosGeolocalizacao?: {
    latitude: number;
    longitude: number;
    precisao: number;
  };
}

// Resultado da validação de token
export interface ResultadoValidacaoToken {
  valido: boolean;
  expirado: boolean;
  jaUsado: boolean;
  contrato?: Contrato;
  mensagem: string;
}

// Dados do relatório de auditoria
export interface RelatorioAuditoria {
  contrato: Contrato;
  logsCompletos: LogAuditoriaContrato[];
  hashDocumento: string;
  timestampGeracao: string;
  assinaturasValidadas: {
    interna: boolean;
    externa: boolean;
  };
  evidenciasColetadas: {
    assinaturaInterna?: DadosAssinaturaDigital;
    assinaturaExterna?: DadosAssinaturaSimples;
  };
}

export interface AnaliseAmostra {
  [key: string]: any; // Add index signature
  id: string;
  coleta_id: string;
  numero_amostra: number;
  data_analise: Date;
  aspecto: string;
  cor: string;
  odor: string;
  sabor: string;
  embalagem: string;
  ph: number;
  ph_conforme: boolean;
  umidade: number;
  umidade_conforme: boolean;
  observacoes: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface NovoLaudo {
  [key: string]: any; // Add index signature
  coleta_id: string;
  data_fabricacao: string;
  data_validade: string;
  gramatura: string;
  marca_produto: string;
  responsavel_liberacao: string;
  observacoes: string;
  resultado_geral: 'aprovado' | 'reprovado';
}

export interface LaudoLiberacao {
  [key: string]: any; // Add index signature
  id: string;
  coleta_id: string;
  numero_laudo: number;
  data_emissao: Date;
  data_fabricacao: Date;
  data_validade: Date;
  gramatura: string;
  marca_produto: string;
  responsavel_liberacao: string;
  observacoes: string;
  resultado_geral: 'aprovado' | 'reprovado';
  revisao: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Update ColetaAmostra to handle string status from database
export interface ColetaAmostra {
  id: string;
  data_coleta: Date;
  lote_producao: string;
  responsavel_coleta: string;
  quantidade_total_produzida: number;
  quantidade_amostras: number;
  observacoes: string;
  status: string; // Changed from specific union to string to handle DB values
  criadoEm: Date;
  atualizadoEm: Date;
}
