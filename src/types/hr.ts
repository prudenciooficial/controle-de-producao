export interface Funcionario {
  id: string;
  nome_completo: string;
  cpf: string;
  cargo: string;
  setor: 'Produção' | 'Administrativo';
  data_admissao: string;
  jornada_id?: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
  // Dados relacionados
  jornada?: JornadaTrabalho;
}

export interface JornadaTrabalho {
  id: string;
  nome: string;
  descricao_impressao: string;
  horarios_estruturados: HorariosEstruturados;
  created_at: Date;
  updated_at: Date;
}

export interface HorariosEstruturados {
  segunda: HorarioDia;
  terca: HorarioDia;
  quarta: HorarioDia;
  quinta: HorarioDia;
  sexta: HorarioDia;
  sabado: HorarioDia;
  domingo: HorarioDia;
}

export interface HorarioDia {
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
}

export interface Feriado {
  id: string;
  nome: string;
  data: Date;
  tipo: 'nacional' | 'estadual' | 'municipal';
  ano: number;
  ativo: boolean;
  descricao?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ConfiguracaoEmpresa {
  id: string;
  nome_empresa: string;
  cnpj: string;
  endereco: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ControlePontoData {
  funcionario: Funcionario;
  mes: number;
  ano: number;
  feriados: Feriado[];
  configuracao_empresa: ConfiguracaoEmpresa;
}
