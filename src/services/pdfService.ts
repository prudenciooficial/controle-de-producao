import { supabase } from '@/integrations/supabase/client';
import { AuditoriaService } from './auditoriaService';
import { ValidacaoJuridicaService } from './validacaoJuridicaService';

export interface DadosContratoPDF {
  id: string;
  titulo: string;
  conteudo: string;
  assinante_externo_nome: string;
  assinante_externo_email: string;
  assinante_externo_documento: string;
  criado_em: string;
  finalizado_em?: string;
  modelo?: {
    nome: string;
  };
  assinaturas?: Array<{
    tipo: string;
    signatario_nome: string;
    assinado_em?: string;
    certificado_dados?: any;
  }>;
}

export interface ResultadoGeracaoPDF {
  pdfUrl: string;
  hashSHA256: string;
  tamanhoBytes: number;
  geradoEm: string;
}

/**
 * Serviço para geração de PDF e cálculo de hash SHA-256
 * 
 * IMPORTANTE: Esta é uma implementação usando bibliotecas web.
 * Em produção, considere usar um serviço backend para:
 * - Melhor performance
 * - Maior segurança
 * - Processamento de documentos grandes
 */
export class PDFService {

  /**
   * Substitui variáveis do template pelos valores reais do contrato
   * Suporta tanto o formato [VARIAVEL] quanto {{VARIAVEL}}
   */
  static substituirVariaveisTemplate(conteudo: string, contrato: DadosContratoPDF): string {
    let conteudoProcessado = conteudo;

    // Se o contrato já tem dados_variaveis preenchidos, usar eles primeiro
    if (contrato.dados_variaveis && typeof contrato.dados_variaveis === 'object') {
      Object.entries(contrato.dados_variaveis).forEach(([chave, valor]) => {
        // Formato [VARIAVEL] usado no editor
        const regexColchetes = new RegExp(`\\[${chave}\\]`, 'g');
        conteudoProcessado = conteudoProcessado.replace(regexColchetes, String(valor || ''));

        // Formato {{VARIAVEL}} alternativo
        const regexChaves = new RegExp(`\\{\\{${chave}\\}\\}`, 'g');
        conteudoProcessado = conteudoProcessado.replace(regexChaves, String(valor || ''));
      });
    }

    // Mapa de variáveis do sistema (sempre disponíveis)
    const variaveisSistema: Record<string, string> = {
      // Informações básicas do contrato
      'TITULO_CONTRATO': contrato.titulo || '',
      'ID_CONTRATO': contrato.id || '',
      'DATA_CRIACAO': contrato.criado_em ? new Date(contrato.criado_em).toLocaleDateString('pt-BR') : '',
      'DATA_ATUAL': new Date().toLocaleDateString('pt-BR'),
      'HORA_ATUAL': new Date().toLocaleTimeString('pt-BR'),
      'DATA_HORA_ATUAL': new Date().toLocaleString('pt-BR'),

      // Informações do signatário externo
      'ASSINANTE_NOME': contrato.assinante_externo_nome || '',
      'ASSINANTE_EMAIL': contrato.assinante_externo_email || '',
      'ASSINANTE_DOCUMENTO': contrato.assinante_externo_documento || '',
      'ASSINANTE_CPF': contrato.assinante_externo_documento || '',
      'ASSINANTE_CNPJ': contrato.assinante_externo_documento || '',

      // Informações do modelo
      'MODELO_NOME': contrato.modelo?.nome || '',
      'MODELO_DESCRICAO': contrato.modelo?.descricao || '',

      // Status e datas
      'STATUS': contrato.status || '',
      'DATA_FINALIZACAO': contrato.finalizado_em ? new Date(contrato.finalizado_em).toLocaleDateString('pt-BR') : '',
      'HORA_FINALIZACAO': contrato.finalizado_em ? new Date(contrato.finalizado_em).toLocaleTimeString('pt-BR') : '',

      // Informações da empresa (configuráveis)
      'EMPRESA_NOME': 'Sua Empresa Ltda',
      'EMPRESA_CNPJ': '00.000.000/0001-00',
      'EMPRESA_ENDERECO': 'Rua da Empresa, 123 - Centro',
      'EMPRESA_CIDADE': 'Sua Cidade - UF',
      'EMPRESA_CEP': '00000-000',
      'EMPRESA_TELEFONE': '(11) 0000-0000',
      'EMPRESA_EMAIL': 'contato@suaempresa.com.br',

      // Valores monetários (se houver)
      'VALOR_TOTAL': 'R$ 0,00',
      'VALOR_EXTENSO': 'zero reais',

      // Prazos e datas específicas
      'PRAZO_DIAS': '30',
      'DATA_VENCIMENTO': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),

      // Informações de assinatura
      'TOTAL_ASSINATURAS': contrato.assinaturas ? contrato.assinaturas.length.toString() : '0'
    };

    // Adicionar informações de assinaturas se existirem
    if (contrato.assinaturas && contrato.assinaturas.length > 0) {
      contrato.assinaturas.forEach((assinatura, index) => {
        const numero = index + 1;
        variaveisSistema[`ASSINATURA_${numero}_NOME`] = assinatura.signatario_nome || '';
        variaveisSistema[`ASSINATURA_${numero}_EMAIL`] = assinatura.signatario_email || '';
        variaveisSistema[`ASSINATURA_${numero}_DATA`] = assinatura.assinado_em ?
          new Date(assinatura.assinado_em).toLocaleDateString('pt-BR') : '';
        variaveisSistema[`ASSINATURA_${numero}_HORA`] = assinatura.assinado_em ?
          new Date(assinatura.assinado_em).toLocaleTimeString('pt-BR') : '';
        variaveisSistema[`ASSINATURA_${numero}_TIPO`] = assinatura.tipo === 'interna_qualificada' ?
          'Digital Qualificada' : 'Eletrônica Simples';
      });
    }

    // Substituir variáveis do sistema
    Object.entries(variaveisSistema).forEach(([chave, valor]) => {
      // Formato [VARIAVEL]
      const regexColchetes = new RegExp(`\\[${chave}\\]`, 'g');
      conteudoProcessado = conteudoProcessado.replace(regexColchetes, valor);

      // Formato {{VARIAVEL}}
      const regexChaves = new RegExp(`\\{\\{${chave}\\}\\}`, 'g');
      conteudoProcessado = conteudoProcessado.replace(regexChaves, valor);
    });

    return conteudoProcessado;
  }

  /**
   * Gera HTML formatado do contrato para impressão/PDF
   */
  static gerarHTMLContrato(contrato: DadosContratoPDF): string {
    const dataAtual = new Date().toLocaleString('pt-BR');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${contrato.titulo}</title>
        <style>
            @page {
                size: A4;
                margin: 2cm;
            }

            body {
                font-family: 'Times New Roman', serif;
                font-size: 12pt;
                line-height: 1.6;
                color: #000;
                margin: 0;
                padding: 0;
            }

            .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
                margin-bottom: 20px;
            }

            .header h1 {
                font-size: 18pt;
                font-weight: bold;
                margin: 0;
                text-transform: uppercase;
            }

            .document-info {
                font-size: 10pt;
                margin-top: 10px;
                display: flex;
                justify-content: space-between;
            }

            .contract-title {
                font-size: 16pt;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
                text-transform: uppercase;
            }

            .contract-info {
                background-color: #f5f5f5;
                padding: 15px;
                border: 1px solid #ddd;
                margin: 20px 0;
            }

            .contract-info h3 {
                margin-top: 0;
                font-size: 14pt;
                color: #333;
            }

            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-top: 10px;
            }

            .info-item {
                font-size: 11pt;
            }

            .info-label {
                font-weight: bold;
                color: #555;
            }

            .contract-content {
                text-align: justify;
                margin: 30px 0;
                white-space: pre-wrap;
            }

            .signatures-section {
                margin-top: 40px;
                border-top: 1px solid #ccc;
                padding-top: 20px;
            }

            .signatures-section h3 {
                font-size: 14pt;
                font-weight: bold;
                margin-bottom: 15px;
                color: #333;
            }

            .signature-item {
                background-color: #f9f9f9;
                border: 1px solid #e0e0e0;
                padding: 15px;
                margin: 10px 0;
                border-radius: 5px;
            }

            .signature-type {
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 8px;
            }

            .signature-details {
                font-size: 11pt;
                color: #555;
            }

            .signature-details div {
                margin: 3px 0;
            }

            .footer {
                position: fixed;
                bottom: 1cm;
                left: 2cm;
                right: 2cm;
                font-size: 9pt;
                color: #666;
                border-top: 1px solid #ccc;
                padding-top: 10px;
                display: flex;
                justify-content: space-between;
            }

            .hash-info {
                font-family: 'Courier New', monospace;
                font-size: 8pt;
                word-break: break-all;
            }

            @media print {
                .no-print {
                    display: none;
                }

                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Contrato Comercial</h1>
            <div class="document-info">
                <span>Documento ID: ${contrato.id}</span>
                <span>Gerado em: ${dataAtual}</span>
            </div>
        </div>

        <div class="contract-title">${contrato.titulo}</div>

        <div class="contract-info">
            <h3>Informações do Contrato</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Modelo:</span> ${contrato.modelo?.nome || 'N/A'}
                </div>
                <div class="info-item">
                    <span class="info-label">Criado em:</span> ${new Date(contrato.criado_em).toLocaleString('pt-BR')}
                </div>
                <div class="info-item">
                    <span class="info-label">Signatário Externo:</span> ${contrato.assinante_externo_nome}
                </div>
                <div class="info-item">
                    <span class="info-label">Email:</span> ${contrato.assinante_externo_email}
                </div>
                <div class="info-item">
                    <span class="info-label">Documento:</span> ${contrato.assinante_externo_documento}
                </div>
                ${contrato.finalizado_em ? `
                <div class="info-item">
                    <span class="info-label">Finalizado em:</span> ${new Date(contrato.finalizado_em).toLocaleString('pt-BR')}
                </div>
                ` : ''}
            </div>
        </div>

        <div class="contract-content">${this.substituirVariaveisTemplate(contrato.conteudo, contrato)}</div>

        ${contrato.assinaturas && contrato.assinaturas.length > 0 ? `
        <div class="signatures-section">
            <h3>Assinaturas Eletrônicas</h3>
            ${contrato.assinaturas.map((assinatura, index) => `
                <div class="signature-item">
                    <div class="signature-type">
                        ${index + 1}. ${assinatura.tipo === 'interna_qualificada' ? 'Assinatura Digital Qualificada' : 'Assinatura Eletrônica Simples'}
                    </div>
                    <div class="signature-details">
                        <div><strong>Signatário:</strong> ${assinatura.signatario_nome}</div>
                        ${assinatura.assinado_em ? `<div><strong>Assinado em:</strong> ${new Date(assinatura.assinado_em).toLocaleString('pt-BR')}</div>` : ''}
                        ${assinatura.certificado_dados ? `
                            <div><strong>Certificado:</strong> ${assinatura.certificado_dados.emissor}</div>
                            <div><strong>Válido até:</strong> ${new Date(assinatura.certificado_dados.valido_ate).toLocaleDateString('pt-BR')}</div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="footer">
            <div>Página 1</div>
            <div class="hash-info">Hash SHA-256: [será calculado após geração]</div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Abre janela para impressão/salvamento como PDF
   */
  static async gerarPDFContrato(contrato: DadosContratoPDF): Promise<ResultadoGeracaoPDF> {
    try {
      // Gerar HTML do contrato
      const htmlContrato = this.gerarHTMLContrato(contrato);

      // Calcular hash do conteúdo HTML
      const encoder = new TextEncoder();
      const data = encoder.encode(htmlContrato);
      const hashSHA256 = await this.calcularHashSHA256(data.buffer);

      // Criar blob do HTML
      const htmlBlob = new Blob([htmlContrato], { type: 'text/html' });
      const htmlUrl = URL.createObjectURL(htmlBlob);

      // Simular URL do PDF (em produção seria o PDF real)
      const pdfUrl = await this.salvarHTMLComoArquivo(htmlBlob, `contrato_${contrato.id}.html`);

      return {
        pdfUrl,
        hashSHA256,
        tamanhoBytes: data.byteLength,
        geradoEm: new Date().toISOString()
      };

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error('Erro ao gerar PDF do contrato');
    }
  }

  /**
   * Abre janela para visualização e impressão
   */
  static abrirParaImpressao(contrato: DadosContratoPDF): void {
    const htmlContrato = this.gerarHTMLContrato(contrato);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContrato);
      printWindow.document.close();

      // Aguardar carregamento e abrir diálogo de impressão
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }
  }

  /**
   * Salva HTML como arquivo no storage
   */
  static async salvarHTMLComoArquivo(htmlBlob: Blob, nomeArquivo: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('contratos-html')
        .upload(nomeArquivo, htmlBlob, {
          contentType: 'text/html',
          upsert: false
        });

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('contratos-html')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro ao salvar HTML:', error);
      throw new Error('Erro ao salvar arquivo no storage');
    }
  }

  /**
   * Calcula hash SHA-256 de um ArrayBuffer
   */
  static async calcularHashSHA256(data: ArrayBuffer): Promise<string> {
    try {
      // Usar Web Crypto API para calcular SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      // Converter para string hexadecimal
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      console.error('Erro ao calcular hash SHA-256:', error);
      throw new Error('Erro ao calcular hash do documento');
    }
  }

  /**
   * Cria bucket no Supabase Storage se não existir
   */
  static async criarBucketSeNecessario(): Promise<void> {
    try {
      // Verificar se bucket existe
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExiste = buckets?.some(bucket => bucket.name === 'contratos-html');

      if (!bucketExiste) {
        // Criar bucket público
        await supabase.storage.createBucket('contratos-html', {
          public: true,
          allowedMimeTypes: ['text/html', 'application/pdf'],
          fileSizeLimit: 10485760 // 10MB
        });
      }
    } catch (error) {
      console.error('Erro ao criar bucket:', error);
    }
  }

  /**
   * Atualiza contrato com dados do PDF gerado
   */
  static async atualizarContratoComPDF(
    contratoId: string, 
    resultadoPDF: ResultadoGeracaoPDF
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('contratos_comerciais')
        .update({
          pdf_url: resultadoPDF.pdfUrl,
          hash_documento: resultadoPDF.hashSHA256,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', contratoId);

      if (error) throw error;

      // Registrar log de auditoria
      await supabase
        .from('logs_auditoria_contratos_comerciais')
        .insert([{
          contrato_id: contratoId,
          evento: 'pdf_gerado',
          descricao: 'PDF do contrato gerado com sucesso',
          dados_evento: {
            hash_sha256: resultadoPDF.hashSHA256,
            tamanho_bytes: resultadoPDF.tamanhoBytes,
            url_pdf: resultadoPDF.pdfUrl,
            gerado_em: resultadoPDF.geradoEm
          },
          timestamp_evento: new Date().toISOString()
        }]);

    } catch (error) {
      console.error('Erro ao atualizar contrato com PDF:', error);
      throw new Error('Erro ao salvar dados do PDF no contrato');
    }
  }

  /**
   * Verifica integridade do PDF usando hash SHA-256
   */
  static async verificarIntegridadePDF(pdfUrl: string, hashEsperado: string): Promise<boolean> {
    try {
      // Baixar PDF
      const response = await fetch(pdfUrl);
      const pdfArrayBuffer = await response.arrayBuffer();
      
      // Calcular hash atual
      const hashAtual = await this.calcularHashSHA256(pdfArrayBuffer);
      
      // Comparar hashes
      return hashAtual === hashEsperado;
    } catch (error) {
      console.error('Erro ao verificar integridade do PDF:', error);
      return false;
    }
  }

  /**
   * Gera PDF completo do contrato (usado após todas as assinaturas)
   */
  static async gerarPDFCompleto(contratoId: string): Promise<ResultadoGeracaoPDF> {
    try {
      // Buscar dados completos do contrato
      const { data: contrato, error } = await supabase
        .from('contratos_comerciais')
        .select(`
          *,
          modelo:modelo_id(nome),
          assinaturas:assinaturas_contratos_comerciais(*)
        `)
        .eq('id', contratoId)
        .single();

      if (error) throw error;
      if (!contrato) throw new Error('Contrato não encontrado');

      // Gerar PDF
      const resultadoPDF = await this.gerarPDFContrato(contrato);

      // Atualizar contrato com dados do PDF
      await this.atualizarContratoComPDF(contratoId, resultadoPDF);

      // Registrar evento de auditoria
      await AuditoriaService.registrarGeracaoPDF(contratoId, resultadoPDF);

      // Coletar evidência de integridade do documento
      await ValidacaoJuridicaService.coletarEvidenciaIntegridade(
        contratoId,
        resultadoPDF.hashSHA256,
        {
          tamanhoBytes: resultadoPDF.tamanhoBytes,
          geradoEm: new Date().toISOString(),
          pdfUrl: resultadoPDF.pdfUrl
        }
      );

      return resultadoPDF;
    } catch (error) {
      console.error('Erro ao gerar PDF completo:', error);
      throw error;
    }
  }
}
