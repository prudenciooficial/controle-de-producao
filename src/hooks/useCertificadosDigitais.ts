import React, { useState, useEffect, useCallback } from 'react';
import { CertificadosReaisService, type CertificadoReal } from '@/utils/certificadosReais';

export interface CertificadoDigital {
  id: string;
  nome: string;
  cpf: string;
  emissor: string;
  validoAte: string;
  tipo: 'A1' | 'A3';
  arquivo?: File;
  thumbprint?: string;
  serialNumber?: string;
}

export interface UseCertificadosDigitaisReturn {
  certificados: CertificadoDigital[];
  loading: boolean;
  error: string | null;
  carregarCertificados: () => Promise<void>;
  selecionarCertificadoArquivo: () => Promise<void>;
  validarCertificado: (certificado: CertificadoDigital, senha: string) => Promise<boolean>;
  assinarDocumento: (certificado: CertificadoDigital, senha: string, documento: string) => Promise<string>;
}

/**
 * Hook para gerenciar certificados digitais ICP-Brasil
 * 
 * IMPORTANTE: Esta é uma implementação simulada para demonstração.
 * Em produção, seria necessário usar bibliotecas específicas como:
 * - Web Crypto API para certificados A1
 * - Bibliotecas nativas para certificados A3 (tokens/cartões)
 * - Integração com provedores de certificação (Serasa, Certisign, etc.)
 */
export function useCertificadosDigitais(): UseCertificadosDigitaisReturn {
  const [certificados, setCertificados] = useState<CertificadoDigital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarCertificados = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Procurando certificados A1 instalados via PFX...');

      const certificadosEncontrados: CertificadoDigital[] = [];

      // Prioridade 1: Tentar carregar certificados do Windows Certificate Store (PFX instalados)
      try {
        console.log('📋 Verificando Windows Certificate Store (certificados PFX)...');
        const certificadosWindows = await CertificadosReaisService.carregarCertificadosWindows();

        if (certificadosWindows.length > 0) {
          const certificadosConvertidos = certificadosWindows.map(cert => ({
            id: cert.id,
            nome: cert.nome,
            cpf: cert.cpf,
            emissor: cert.emissor,
            validoAte: cert.validoAte,
            tipo: cert.tipo,
            thumbprint: cert.thumbprint,
            serialNumber: cert.serialNumber
          }));
          certificadosEncontrados.push(...certificadosConvertidos);
          console.log(`✅ ${certificadosConvertidos.length} certificados PFX encontrados no Windows Store`);
        }
      } catch (error) {
        console.log('⚠️ Windows Certificate Store não acessível:', error);
      }

      // Verificar se encontrou certificados reais
      if (certificadosEncontrados.length > 0) {
        setCertificados(certificadosEncontrados);
        console.log(`🎉 Total de ${certificadosEncontrados.length} certificados PFX carregados!`);
        setError(null);
      } else {
        // Não carregar certificados de teste - solicitar arquivo diretamente
        console.log('📝 Nenhum certificado PFX encontrado no Windows Certificate Store');

        setCertificados([]); // Lista vazia
        setError('Nenhum certificado digital encontrado no sistema. Por favor, selecione seu arquivo .pfx usando o botão "Selecionar Arquivo PFX" abaixo.');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar certificados';
      setError(errorMessage);
      console.error('❌ Erro ao carregar certificados:', err);

      // Fallback final: certificado básico
      setCertificados([{
        id: 'cert-emergencia-001',
        nome: 'Certificado de Emergência',
        cpf: '000.000.000-00',
        emissor: 'Sistema de Fallback',
        validoAte: '2025-12-31',
        tipo: 'A1',
        thumbprint: 'EMERGENCY123456789',
        serialNumber: '999999999'
      }]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Permite ao usuário selecionar um certificado de arquivo (.p12/.pfx)
   */
  const selecionarCertificadoArquivo = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Abrindo seletor de arquivo .pfx/.p12...');

      const certificadoReal = await CertificadosReaisService.solicitarSelecaoCertificado();

      if (certificadoReal) {
        const certificadoConvertido: CertificadoDigital = {
          id: certificadoReal.id,
          nome: certificadoReal.nome,
          cpf: certificadoReal.cpf,
          emissor: certificadoReal.emissor,
          validoAte: certificadoReal.validoAte,
          tipo: certificadoReal.tipo,
          thumbprint: certificadoReal.thumbprint,
          serialNumber: certificadoReal.serialNumber,
          arquivo: certificadoReal.arquivoOriginal
        };

        // Substituir lista de certificados com o arquivo selecionado
        setCertificados([certificadoConvertido]);
        console.log('✅ Certificado PFX carregado:', certificadoConvertido.nome);

        setError(null);
      } else {
        console.log('❌ Nenhum arquivo foi selecionado');
        setError('Nenhum arquivo foi selecionado. Por favor, selecione um arquivo .pfx para continuar.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar arquivo de certificado';
      setError(`Erro ao carregar certificado: ${errorMessage}`);
      console.error('❌ Erro ao selecionar certificado:', err);
    } finally {
      setLoading(false);
    }
  };



  /**
   * Carrega certificados A1 reais do navegador usando Web Crypto API
   */
  const carregarCertificadosA1Reais = async (): Promise<CertificadoDigital[]> => {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API não suportada neste navegador');
    }

    try {
      // Tentar acessar certificados do navegador
      // Nota: Isso requer que o usuário tenha certificados instalados no navegador
      const certificados: CertificadoDigital[] = [];

      // Verificar se há certificados no armazenamento do navegador
      if ('credentials' in navigator) {
        console.log('Verificando certificados no navegador...');

        // Para certificados A1, geralmente são importados no navegador
        // Aqui tentamos detectar se há certificados disponíveis
        try {
          // Tentar gerar uma chave para verificar se o sistema suporta certificados
          const keyPair = await window.crypto.subtle.generateKey(
            {
              name: "RSA-PSS",
              modulusLength: 2048,
              publicExponent: new Uint8Array([1, 0, 1]),
              hash: "SHA-256",
            },
            false,
            ["sign", "verify"]
          );

          if (keyPair) {
            console.log('Sistema suporta certificados digitais');
            // Em um cenário real, aqui consultaríamos o Windows Certificate Store
            // Por enquanto, vamos tentar detectar certificados através de outras APIs
          }
        } catch (error) {
          console.warn('Erro ao verificar suporte a certificados:', error);
        }
      }

      return certificados;
    } catch (error) {
      console.error('Erro ao carregar certificados A1:', error);
      return [];
    }
  };

  /**
   * Carrega certificados A3 reais (tokens/cartões)
   */
  const carregarCertificadosA3Reais = async (): Promise<CertificadoDigital[]> => {
    try {
      console.log('Verificando certificados A3 (tokens/cartões)...');

      // Para certificados A3, precisamos de bibliotecas específicas
      // Como não temos acesso direto via navegador, vamos tentar detectar
      // através de ActiveX (IE/Edge) ou plugins específicos

      const certificados: CertificadoDigital[] = [];

      // Verificar se há suporte a ActiveX (Windows)
      if (typeof window !== 'undefined' && 'ActiveXObject' in window) {
        try {
          // Tentar acessar certificados via CAPICOM (Windows)
          console.log('Tentando acessar certificados via ActiveX...');
          // Nota: Isso só funciona em IE/Edge legado com ActiveX habilitado
        } catch (error) {
          console.warn('ActiveX não disponível:', error);
        }
      }

      // Verificar se há plugins de certificado instalados
      if (navigator.plugins && navigator.plugins.length > 0) {
        for (let i = 0; i < navigator.plugins.length; i++) {
          const plugin = navigator.plugins[i];
          if (plugin.name.toLowerCase().includes('certificado') ||
              plugin.name.toLowerCase().includes('token') ||
              plugin.name.toLowerCase().includes('safenet') ||
              plugin.name.toLowerCase().includes('gemalto')) {
            console.log('Plugin de certificado detectado:', plugin.name);
          }
        }
      }

      return certificados;
    } catch (error) {
      console.error('Erro ao carregar certificados A3:', error);
      return [];
    }
  };

  const validarCertificado = async (
    certificado: CertificadoDigital,
    senha: string
  ): Promise<boolean> => {
    try {
      console.log('Validando certificado:', certificado.tipo, certificado.nome);

      // Simular validação (em produção seria real)
      if (!senha || senha.length < 4) {
        console.error('Senha muito curta');
        return false;
      }

      if (certificado.tipo === 'A1') {
        return await validarCertificadoA1(certificado, senha);
      } else {
        return await validarCertificadoA3(certificado, senha);
      }
    } catch (err) {
      console.error('Erro ao validar certificado:', err);
      return false;
    }
  };

  const validarCertificadoA1 = async (
    certificado: CertificadoDigital, 
    senha: string
  ): Promise<boolean> => {
    // Simular validação de certificado A1
    // Em produção, seria feito através da Web Crypto API
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simular validação (senha deve ter pelo menos 4 caracteres)
        resolve(senha.length >= 4);
      }, 1000);
    });
  };

  const validarCertificadoA3 = async (
    certificado: CertificadoDigital, 
    senha: string
  ): Promise<boolean> => {
    // Simular validação de certificado A3
    // Em produção, seria feito através de bibliotecas específicas para tokens
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simular validação (senha deve ter pelo menos 4 caracteres)
        resolve(senha.length >= 4);
      }, 1500);
    });
  };

  const assinarDocumento = async (
    certificado: CertificadoDigital,
    senha: string,
    documento: string
  ): Promise<string> => {
    console.log('Função assinarDocumento chamada com:', { certificado: certificado.nome, documento });

    try {
      if (certificado.tipo === 'A1') {
        return await assinarComA1(certificado, senha, documento);
      } else {
        return await assinarComA3(certificado, senha, documento);
      }
    } catch (err) {
      console.error('Erro ao assinar documento:', err);
      throw new Error('Erro ao realizar assinatura digital');
    }
  };

  const assinarComA1 = async (
    certificado: CertificadoDigital,
    senha: string,
    documento: string
  ): Promise<string> => {
    console.log('Assinando com certificado A1...');

    // Simular assinatura com certificado A1
    // Em produção, seria feito através da Web Crypto API
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // Simular geração de assinatura digital mais realista
          const timestamp = new Date().toISOString();
          const dadosParaAssinar = `${documento}|${certificado.nome}|${certificado.cpf}|${timestamp}`;

          // Gerar hash SHA-256
          const encoder = new TextEncoder();
          const data = encoder.encode(dadosParaAssinar);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          console.log('Assinatura A1 gerada:', hashHex);
          resolve(hashHex);
        } catch (error) {
          console.error('Erro na assinatura A1:', error);
          reject(error);
        }
      }, 1500);
    });
  };

  const assinarComA3 = async (
    certificado: CertificadoDigital,
    senha: string,
    documento: string
  ): Promise<string> => {
    console.log('Assinando com certificado A3...');

    // Simular assinatura com certificado A3
    // Em produção, seria feito através de bibliotecas específicas para tokens
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // Simular geração de assinatura digital mais realista
          const timestamp = new Date().toISOString();
          const dadosParaAssinar = `${documento}|${certificado.nome}|${certificado.cpf}|${timestamp}|A3`;

          // Gerar hash SHA-256
          const encoder = new TextEncoder();
          const data = encoder.encode(dadosParaAssinar);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          console.log('Assinatura A3 gerada:', hashHex);
          resolve(hashHex);
        } catch (error) {
          console.error('Erro na assinatura A3:', error);
          reject(error);
        }
      }, 2000);
    });
  };

  useEffect(() => {
    carregarCertificados();
  }, []);

  // Usar useCallback para evitar re-renders desnecessários
  const carregarCertificadosCallback = useCallback(carregarCertificados, []);
  const selecionarCertificadoArquivoCallback = useCallback(selecionarCertificadoArquivo, []);
  const validarCertificadoCallback = useCallback(validarCertificado, []);
  const assinarDocumentoCallback = useCallback(assinarDocumento, [validarCertificado]);

  return {
    certificados,
    loading,
    error,
    carregarCertificados: carregarCertificadosCallback,
    selecionarCertificadoArquivo: selecionarCertificadoArquivoCallback,
    validarCertificado: validarCertificadoCallback,
    assinarDocumento: assinarDocumentoCallback
  };
}

/**
 * Utilitários para certificados digitais
 */
export const CertificadoUtils = {
  /**
   * Verifica se um certificado está válido (não expirado)
   */
  isValido: (certificado: CertificadoDigital): boolean => {
    const hoje = new Date();
    const validoAte = new Date(certificado.validoAte);
    return validoAte > hoje;
  },

  /**
   * Verifica se um certificado está próximo do vencimento (30 dias)
   */
  isProximoVencimento: (certificado: CertificadoDigital): boolean => {
    const hoje = new Date();
    const validoAte = new Date(certificado.validoAte);
    const diasRestantes = Math.floor((validoAte.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diasRestantes <= 30 && diasRestantes > 0;
  },

  /**
   * Formata o nome do emissor do certificado
   */
  formatarEmissor: (emissor: string): string => {
    return emissor.replace(/^AC\s/, 'Autoridade Certificadora ');
  },

  /**
   * Gera um resumo do certificado para exibição
   */
  gerarResumo: (certificado: CertificadoDigital): string => {
    return `${certificado.nome} - ${certificado.tipo} (${certificado.emissor})`;
  }
};
