/**
 * Certificados digitais de teste para demonstração
 * Estes certificados são fictícios e servem apenas para testar o sistema
 */

export interface CertificadoTeste {
  id: string;
  nome: string;
  cpf: string;
  cnpj?: string;
  emissor: string;
  validade: string;
  tipo: 'A1' | 'A3';
  thumbprint: string;
  serialNumber: string;
  empresa?: string;
  cargo?: string;
}

/**
 * Lista de certificados de teste para demonstração
 */
export const certificadosTeste: CertificadoTeste[] = [
  {
    id: 'cert-teste-001',
    nome: 'João Silva Santos',
    cpf: '123.456.789-00',
    emissor: 'AC SERASA RFB v5 (TESTE)',
    validade: '2025-12-31',
    tipo: 'A1',
    thumbprint: 'A1B2C3D4E5F6789012345678901234567890ABCD',
    serialNumber: '1234567890123456789',
    empresa: 'Empresa Teste LTDA',
    cargo: 'Diretor'
  },
  {
    id: 'cert-teste-002',
    nome: 'Maria Oliveira Costa',
    cpf: '987.654.321-00',
    emissor: 'AC CERTISIGN RFB G5 (TESTE)',
    validade: '2025-06-30',
    tipo: 'A3',
    thumbprint: 'B2C3D4E5F6789012345678901234567890ABCDE1',
    serialNumber: '9876543210987654321',
    empresa: 'Consultoria ABC LTDA',
    cargo: 'Sócia-Administradora'
  },
  {
    id: 'cert-teste-003',
    nome: 'Carlos Eduardo Pereira',
    cpf: '456.789.123-00',
    emissor: 'AC SOLUTI RFB v1 (TESTE)',
    validade: '2025-09-15',
    tipo: 'A1',
    thumbprint: 'C3D4E5F6789012345678901234567890ABCDEF12',
    serialNumber: '4567891234567891234',
    empresa: 'Indústria XYZ S.A.',
    cargo: 'Gerente Financeiro'
  },
  {
    id: 'cert-teste-004',
    nome: 'Ana Paula Rodrigues',
    cpf: '321.654.987-00',
    emissor: 'AC VALID RFB v5 (TESTE)',
    validade: '2025-11-20',
    tipo: 'A3',
    thumbprint: 'D4E5F6789012345678901234567890ABCDEF123',
    serialNumber: '3216549873216549873',
    empresa: 'Advocacia & Consultoria',
    cargo: 'Advogada'
  },
  {
    id: 'cert-teste-005',
    nome: 'Roberto Almeida Junior',
    cpf: '789.123.456-00',
    emissor: 'AC DIGITALSIGN RFB (TESTE)',
    validade: '2025-08-10',
    tipo: 'A1',
    thumbprint: 'E5F6789012345678901234567890ABCDEF1234',
    serialNumber: '7891234567891234567',
    empresa: 'Tecnologia & Inovação LTDA',
    cargo: 'CTO'
  },
  {
    id: 'cert-teste-006',
    nome: 'Fernanda Lima Souza',
    cpf: '654.321.789-00',
    cnpj: '12.345.678/0001-90',
    emissor: 'AC SAFEWEB RFB v3 (TESTE)',
    validade: '2025-10-05',
    tipo: 'A3',
    thumbprint: 'F6789012345678901234567890ABCDEF12345',
    serialNumber: '6543217896543217896',
    empresa: 'Comércio Digital EIRELI',
    cargo: 'Empresária'
  },
  {
    id: 'cert-teste-007',
    nome: 'Pedro Henrique Oliveira',
    cpf: '147.258.369-00',
    emissor: 'AC IMPRENSA OFICIAL SP RFB (TESTE)',
    validade: '2025-07-25',
    tipo: 'A1',
    thumbprint: 'G789012345678901234567890ABCDEF123456',
    serialNumber: '1472583691472583691',
    empresa: 'Startup Inovadora LTDA',
    cargo: 'CEO'
  },
  {
    id: 'cert-teste-008',
    nome: 'Juliana Santos Ferreira',
    cpf: '258.369.147-00',
    emissor: 'AC FENACON CERTISIGN RFB G3 (TESTE)',
    validade: '2025-12-01',
    tipo: 'A3',
    thumbprint: 'H89012345678901234567890ABCDEF1234567',
    serialNumber: '2583691472583691472',
    empresa: 'Contabilidade Moderna S.S.',
    cargo: 'Contadora'
  }
];

/**
 * Busca um certificado de teste por ID
 */
export function buscarCertificadoPorId(id: string): CertificadoTeste | undefined {
  return certificadosTeste.find(cert => cert.id === id);
}

/**
 * Busca certificados de teste por CPF
 */
export function buscarCertificadosPorCpf(cpf: string): CertificadoTeste[] {
  return certificadosTeste.filter(cert => cert.cpf === cpf);
}

/**
 * Busca certificados de teste por tipo
 */
export function buscarCertificadosPorTipo(tipo: 'A1' | 'A3'): CertificadoTeste[] {
  return certificadosTeste.filter(cert => cert.tipo === tipo);
}

/**
 * Busca certificados de teste por emissor
 */
export function buscarCertificadosPorEmissor(emissor: string): CertificadoTeste[] {
  return certificadosTeste.filter(cert => 
    cert.emissor.toLowerCase().includes(emissor.toLowerCase())
  );
}

/**
 * Valida se um certificado de teste está dentro da validade
 */
export function validarCertificado(certificado: CertificadoTeste): boolean {
  const hoje = new Date();
  const validade = new Date(certificado.validade);
  return validade > hoje;
}

/**
 * Retorna certificados válidos (não expirados)
 */
export function obterCertificadosValidos(): CertificadoTeste[] {
  return certificadosTeste.filter(validarCertificado);
}

/**
 * Simula a validação de senha para um certificado
 */
export function validarSenhaCertificado(certificado: CertificadoTeste, senha: string): boolean {
  // Para certificados de teste, aceitar senhas simples
  const senhasValidas = ['123456', 'teste123', 'certificado', senha];
  return senhasValidas.includes(senha) && senha.length >= 4;
}

/**
 * Simula a assinatura digital com um certificado de teste
 */
export async function assinarComCertificadoTeste(
  certificado: CertificadoTeste,
  documento: string,
  senha: string
): Promise<string> {
  // Validar senha
  if (!validarSenhaCertificado(certificado, senha)) {
    throw new Error('Senha inválida para o certificado');
  }

  // Validar certificado
  if (!validarCertificado(certificado)) {
    throw new Error('Certificado expirado');
  }

  // Simular tempo de processamento
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Gerar assinatura simulada
  const timestamp = new Date().toISOString();
  const dadosParaAssinar = `${documento}|${certificado.nome}|${certificado.cpf}|${timestamp}|${certificado.tipo}`;

  // Gerar hash SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(dadosParaAssinar);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return `ASSINATURA_TESTE_${certificado.tipo}_${hashHex.substring(0, 32)}`;
}

/**
 * Informações sobre os certificados de teste
 */
export const infoTeste = {
  descricao: 'Certificados digitais fictícios para demonstração do sistema',
  senhasValidas: ['123456', 'teste123', 'certificado'],
  observacoes: [
    'Estes certificados são apenas para teste e demonstração',
    'Não possuem validade jurídica real',
    'Em produção, usar certificados ICP-Brasil válidos',
    'As assinaturas geradas são simuladas'
  ],
  totalCertificados: certificadosTeste.length,
  tiposDisponiveis: ['A1', 'A3'],
  emissoresSimulados: [
    'AC SERASA RFB v5',
    'AC CERTISIGN RFB G5',
    'AC SOLUTI RFB v1',
    'AC VALID RFB v5',
    'AC DIGITALSIGN RFB',
    'AC SAFEWEB RFB v3',
    'AC IMPRENSA OFICIAL SP RFB',
    'AC FENACON CERTISIGN RFB G3'
  ]
};

/**
 * Exporta tudo para facilitar importação
 */
export default {
  certificadosTeste,
  buscarCertificadoPorId,
  buscarCertificadosPorCpf,
  buscarCertificadosPorTipo,
  buscarCertificadosPorEmissor,
  validarCertificado,
  obterCertificadosValidos,
  validarSenhaCertificado,
  assinarComCertificadoTeste,
  infoTeste
};
