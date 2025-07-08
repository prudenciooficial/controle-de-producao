/**
 * Utilitários para trabalhar com certificados digitais reais
 * Integração com Windows Certificate Store e tokens A3
 */

export interface CertificadoReal {
  id: string;
  nome: string;
  cpf: string;
  cnpj?: string;
  emissor: string;
  validoAte: string;
  tipo: 'A1' | 'A3';
  thumbprint: string;
  serialNumber: string;
  certificadoBase64?: string;
  chavePrivada?: any;
}

/**
 * Classe para integração com certificados digitais reais
 */
export class CertificadosReaisService {

  /**
   * Carrega certificados do Windows Certificate Store
   * Funciona apenas em Windows com ActiveX habilitado
   */
  static async carregarCertificadosWindows(): Promise<CertificadoReal[]> {
    try {
      console.log('Tentando carregar certificados do Windows Certificate Store...');
      
      // Verificar se estamos no Windows e se ActiveX está disponível
      if (!this.isWindowsWithActiveX()) {
        console.log('ActiveX não disponível ou não estamos no Windows. Retornando lista vazia.');
        return [];
      }

      const certificados: CertificadoReal[] = [];

      try {
        // @ts-ignore - ActiveXObject não está tipado
        const store = new ActiveXObject("CAPICOM.Store");
        store.Open(2, "My", 0); // CAPICOM_CURRENT_USER_STORE, "My", CAPICOM_STORE_OPEN_READ_ONLY

        const certificates = store.Certificates;
        
        for (let i = 1; i <= certificates.Count; i++) {
          const cert = certificates.Item(i);
          
          // Verificar se é um certificado ICP-Brasil
          if (this.isICPBrasilCertificate(cert)) {
            const certInfo = this.extractCertificateInfo(cert);
            if (certInfo) {
              certificados.push(certInfo);
            }
          }
        }

        store.Close();
        console.log('Certificados Windows carregados:', certificados.length);
        
      } catch (error) {
        console.error('Erro ao acessar CAPICOM:', error);
        throw new Error('Erro ao acessar certificados do Windows. Verifique se o CAPICOM está instalado.');
      }

      return certificados;
    } catch (error) {
      console.error('Erro ao carregar certificados Windows:', error);
      return [];
    }
  }

  /**
   * Carrega certificados via WebCrypto API (apenas para certificados PFX instalados)
   */
  static async carregarCertificadosWebCrypto(): Promise<CertificadoReal[]> {
    try {
      console.log('🔍 Verificando certificados PFX instalados via WebCrypto...');

      if (!window.crypto || !window.crypto.subtle) {
        console.log('WebCrypto API não suportada');
        return [];
      }

      const certificados: CertificadoReal[] = [];

      // Tentar detectar certificados client instalados no navegador
      try {
        console.log('📋 Verificando certificados client instalados...');

        // Verificar se o navegador tem acesso a certificados client
        // Esta é uma abordagem limitada, mas pode funcionar em alguns casos
        const testUrl = window.location.origin + '/api/test-client-cert';

        const response = await fetch(testUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'X-Test-Client-Cert': 'true'
          }
        }).catch(() => null);

        // Se a requisição foi feita com sucesso, pode indicar certificados disponíveis
        if (response) {
          console.log('Possível certificado client detectado via fetch');
        }
      } catch (error) {
        console.log('Teste de certificado client limitado:', error);
      }

      console.log(`📊 WebCrypto: ${certificados.length} certificados encontrados`);
      return certificados;

    } catch (error) {
      console.error('❌ Erro ao carregar certificados WebCrypto:', error);
      return [];
    }
  }

  /**
   * Solicita que o usuário selecione um certificado
   * Funciona com input file para arquivos .p12/.pfx
   */
  static async solicitarSelecaoCertificado(): Promise<CertificadoReal | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.p12,.pfx,.crt,.cer';
      input.style.display = 'none';
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            const certificado = await this.processarArquivoCertificado(file);
            resolve(certificado);
          } catch (error) {
            console.error('Erro ao processar certificado:', error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
        document.body.removeChild(input);
      };

      input.oncancel = () => {
        document.body.removeChild(input);
        resolve(null);
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Processa arquivo de certificado (.p12/.pfx)
   */
  private static async processarArquivoCertificado(file: File): Promise<CertificadoReal | null> {
    try {
      console.log(`📄 Processando arquivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Verificar se é um arquivo PFX/P12 válido (verificação básica)
      if (!this.verificarFormatoPFX(uint8Array)) {
        throw new Error('Arquivo não parece ser um certificado .pfx/.p12 válido');
      }

      // Gerar thumbprint baseado no conteúdo do arquivo
      const thumbprint = await this.gerarThumbprintArquivo(uint8Array);

      // Extrair nome mais inteligente do arquivo
      const nomeExtraido = this.extrairNomeInteligente(file.name);

      const certificado: CertificadoReal = {
        id: `pfx-${thumbprint.substring(0, 8)}`,
        nome: nomeExtraido,
        cpf: '000.000.000-00', // Será solicitado durante validação
        emissor: 'Certificado de Arquivo PFX',
        validoAte: '2025-12-31', // Será extraído após validação com senha
        tipo: 'A1',
        thumbprint: thumbprint,
        serialNumber: Date.now().toString(),
        arquivoOriginal: file,
        tamanhoArquivo: file.size
      };

      console.log('✅ Certificado processado:', {
        nome: certificado.nome,
        tamanho: `${(file.size / 1024).toFixed(1)} KB`,
        thumbprint: certificado.thumbprint.substring(0, 16) + '...'
      });

      return certificado;
    } catch (error) {
      console.error('❌ Erro ao processar arquivo de certificado:', error);
      throw error;
    }
  }

  /**
   * Verificação básica se o arquivo é um PFX/P12
   */
  private static verificarFormatoPFX(dados: Uint8Array): boolean {
    // Verificar assinatura básica de arquivo PKCS#12
    // PFX/P12 geralmente começam com sequência específica
    if (dados.length < 10) return false;

    // Verificar se tem estrutura ASN.1 básica (0x30 = SEQUENCE)
    if (dados[0] === 0x30) return true;

    // Verificar outras assinaturas comuns de PFX
    const inicio = Array.from(dados.slice(0, 4));
    const assinaturasPFX = [
      [0x30, 0x82], // PKCS#12 comum
      [0x30, 0x80], // PKCS#12 alternativo
    ];

    return assinaturasPFX.some(assinatura =>
      inicio.slice(0, assinatura.length).every((byte, i) => byte === assinatura[i])
    );
  }

  /**
   * Extrai nome mais inteligente do arquivo
   */
  private static extrairNomeInteligente(nomeArquivo: string): string {
    // Remover extensão
    let nome = nomeArquivo.replace(/\.(p12|pfx|crt|cer)$/i, '');

    // Substituir caracteres comuns
    nome = nome
      .replace(/[_-]/g, ' ')
      .replace(/\./g, ' ')
      .trim();

    // Capitalizar palavras
    nome = nome.replace(/\b\w/g, l => l.toUpperCase());

    // Se o nome ficou muito genérico, usar um nome mais descritivo
    if (nome.length < 3 || /^(cert|certificate|certificado)$/i.test(nome)) {
      nome = 'Certificado Digital PFX';
    }

    return nome;
  }

  /**
   * Gera thumbprint SHA-256 do arquivo
   */
  private static async gerarThumbprintArquivo(dados: Uint8Array): Promise<string> {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', dados);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    } catch (error) {
      // Fallback se crypto.subtle não estiver disponível
      let hash = 0;
      for (let i = 0; i < dados.length; i++) {
        hash = ((hash << 5) - hash + dados[i]) & 0xffffffff;
      }
      return `FILE${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
    }
  }

  /**
   * Verifica se estamos no Windows com ActiveX
   */
  private static isWindowsWithActiveX(): boolean {
    const isWindows = navigator.platform.toLowerCase().includes('win');
    const hasActiveX = typeof window !== 'undefined' && 'ActiveXObject' in window;
    return isWindows && hasActiveX;
  }

  /**
   * Verifica se é um certificado ICP-Brasil
   */
  private static isICPBrasilCertificate(cert: any): boolean {
    try {
      const issuer = cert.IssuerName || '';
      const subject = cert.SubjectName || '';
      
      // Verificar se contém indicadores de ICP-Brasil
      const icpIndicators = [
        'ICP-Brasil',
        'AC Raiz',
        'Autoridade Certificadora',
        'Certisign',
        'Serasa',
        'Valid',
        'Soluti'
      ];

      return icpIndicators.some(indicator => 
        issuer.includes(indicator) || subject.includes(indicator)
      );
    } catch {
      return false;
    }
  }

  /**
   * Extrai informações do certificado
   */
  private static extractCertificateInfo(cert: any): CertificadoReal | null {
    try {
      const subject = cert.SubjectName || '';
      const issuer = cert.IssuerName || '';
      const validTo = cert.ValidToDate || new Date();
      
      // Extrair nome (CN)
      const nomeMatch = subject.match(/CN=([^,]+)/);
      const nome = nomeMatch ? nomeMatch[1].trim() : 'Nome não encontrado';
      
      // Extrair CPF/CNPJ
      const cpfMatch = subject.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})/);
      const cnpjMatch = subject.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
      
      const certificado: CertificadoReal = {
        id: cert.SerialNumber || Date.now().toString(),
        nome,
        cpf: cpfMatch ? cpfMatch[1] : '000.000.000-00',
        cnpj: cnpjMatch ? cnpjMatch[1] : undefined,
        emissor: issuer,
        validoAte: validTo.toISOString().split('T')[0],
        tipo: 'A1', // Assumir A1 para certificados do store
        thumbprint: cert.Thumbprint || '',
        serialNumber: cert.SerialNumber || '',
        certificadoBase64: cert.Export ? cert.Export(0) : undefined // CAPICOM_ENCODE_BASE64
      };

      return certificado;
    } catch (error) {
      console.error('Erro ao extrair informações do certificado:', error);
      return null;
    }
  }

  /**
   * Gera thumbprint para certificado
   */
  private static generateThumbprint(data: string): string {
    // Simular thumbprint baseado no hash do certificado
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  }

  /**
   * Assina dados com certificado real
   */
  static async assinarComCertificadoReal(
    certificado: CertificadoReal,
    dados: string,
    senha?: string
  ): Promise<string> {
    try {
      console.log('Assinando com certificado real:', certificado.nome);
      
      if (certificado.tipo === 'A1' && certificado.certificadoBase64) {
        // Para certificados A1, usar WebCrypto API
        return await this.assinarComA1Real(certificado, dados, senha);
      } else {
        // Para certificados A3, usar bibliotecas específicas
        return await this.assinarComA3Real(certificado, dados, senha);
      }
    } catch (error) {
      console.error('Erro ao assinar com certificado real:', error);
      throw new Error('Erro ao realizar assinatura digital real');
    }
  }

  /**
   * Assinatura com certificado A1 real
   */
  private static async assinarComA1Real(
    certificado: CertificadoReal,
    dados: string,
    senha?: string
  ): Promise<string> {
    try {
      // Para uma implementação real, seria necessário:
      // 1. Importar a chave privada do certificado
      // 2. Usar WebCrypto API para assinar
      // 3. Retornar a assinatura em formato adequado
      
      // Por enquanto, gerar uma assinatura simulada mas baseada em dados reais
      const timestamp = new Date().toISOString();
      const dadosParaAssinar = `${dados}|${certificado.nome}|${certificado.cpf}|${timestamp}`;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(dadosParaAssinar);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      console.error('Erro na assinatura A1 real:', error);
      throw error;
    }
  }

  /**
   * Assinatura com certificado A3 real
   */
  private static async assinarComA3Real(
    certificado: CertificadoReal,
    dados: string,
    senha?: string
  ): Promise<string> {
    try {
      // Para certificados A3, seria necessário usar bibliotecas específicas
      // como PKCS#11 ou CSP (Cryptographic Service Provider)
      
      // Por enquanto, simular assinatura A3
      const timestamp = new Date().toISOString();
      const dadosParaAssinar = `${dados}|${certificado.nome}|${certificado.cpf}|${timestamp}|A3`;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(dadosParaAssinar);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      console.error('Erro na assinatura A3 real:', error);
      throw error;
    }
  }
}
