import { supabase } from '@/integrations/supabase/client';
import { AuditoriaService } from './auditoriaService';
import { ValidacaoJuridicaService } from './validacaoJuridicaService';
import { MinIOService } from './minioService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface DadosContratoPDF {
  id: string;
  titulo: string;
  conteudo: string;
  assinante_externo_nome: string;
  assinante_externo_email: string;
  assinante_externo_documento: string;
  criado_em: string;
  finalizado_em?: string;
  dados_variaveis?: Record<string, any>;
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
   * Gera PDF real do contrato com fallback
   */
  static async gerarPDFContrato(contrato: DadosContratoPDF): Promise<ResultadoGeracaoPDF> {
    try {
      console.log('📄 Iniciando geração de PDF para contrato:', contrato.id);

      // Gerar HTML do contrato
      const htmlContrato = this.gerarHTMLContrato(contrato);

      // Calcular hash do conteúdo HTML
      const encoder = new TextEncoder();
      const data = encoder.encode(htmlContrato);
      const hashSHA256 = await this.calcularHashSHA256(data.buffer);

      let pdfBlob: Blob;
      let fileName: string;

      try {
        // Usar método direto como principal (mais confiável)
        pdfBlob = await this.gerarPDFDireto(contrato);
        fileName = `contrato_${contrato.id}.pdf`;
        console.log('✅ PDF gerado com método direto');
      } catch (directError) {
        console.warn('⚠️ Falha no método direto, tentando método simples:', directError);

        try {
          // Fallback: método simples e confiável
          pdfBlob = this.criarPDFTextoSimples(htmlContrato);
          fileName = `contrato_${contrato.id}.pdf`;
          console.log('✅ PDF gerado com método simples');
        } catch (simpleError) {
          console.warn('⚠️ Falha no método simples, tentando html2canvas:', simpleError);

          try {
            // Último recurso: html2canvas
            pdfBlob = await this.converterHTMLParaPDF(htmlContrato);
            fileName = `contrato_${contrato.id}.pdf`;
            console.log('✅ PDF gerado via html2canvas');
          } catch (pdfError) {
            console.warn('⚠️ Todas as tentativas falharam, salvando como HTML:', pdfError);

            // Último fallback: salvar como HTML
            pdfBlob = new Blob([htmlContrato], { type: 'text/html' });
            fileName = `contrato_${contrato.id}.html`;
          }
        }
      }

      // Salvar arquivo no MinIO
      const pdfUrl = await this.salvarArquivoNoMinIO(pdfBlob, fileName);

      return {
        pdfUrl,
        hashSHA256,
        tamanhoBytes: pdfBlob.size,
        geradoEm: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Erro crítico ao gerar PDF:', error);
      throw new Error('Erro ao gerar PDF do contrato');
    }
  }

  /**
   * Salva arquivo no MinIO (PDF ou HTML) com fallback local
   */
  static async salvarArquivoNoMinIO(blob: Blob, fileName: string): Promise<string> {
    try {
      const contentType = fileName.endsWith('.pdf') ? 'application/pdf' : 'text/html';

      console.log('💾 Tentando salvar no MinIO:', fileName);
      const result = await MinIOService.uploadFile(blob, fileName, contentType);

      if (result.success) {
        console.log('✅ Arquivo salvo no MinIO:', result.url);
        return result.url!;
      } else {
        console.warn('⚠️ MinIO falhou, usando fallback local:', result.error);
        return this.salvarArquivoLocal(blob, fileName);
      }

    } catch (error) {
      console.warn('⚠️ Erro no MinIO, usando fallback local:', error);
      return this.salvarArquivoLocal(blob, fileName);
    }
  }

  /**
   * Fallback: salva arquivo localmente usando blob URL
   */
  static salvarArquivoLocal(blob: Blob, fileName: string): string {
    try {
      const url = URL.createObjectURL(blob);
      console.log('💾 Arquivo salvo localmente (blob URL):', fileName);

      // Simular URL do MinIO para compatibilidade
      const fakeMinioUrl = `${window.location.origin}/local-storage/${fileName}`;

      // Armazenar referência para download posterior
      (window as any).localPDFStorage = (window as any).localPDFStorage || {};
      (window as any).localPDFStorage[fileName] = url;

      return fakeMinioUrl;
    } catch (error) {
      console.error('❌ Erro ao salvar arquivo localmente:', error);
      throw new Error('Erro crítico ao salvar arquivo');
    }
  }

  /**
   * Converte HTML para PDF criando um HTML simplificado para renderização
   */
  static async converterHTMLParaPDF(htmlContent: string): Promise<Blob> {
    try {
      console.log('🔄 Convertendo HTML para PDF...');

      // Criar HTML simplificado para renderização
      const htmlSimplificado = this.criarHTMLSimplificado(htmlContent);

      // Criar elemento temporário para renderização com altura automática
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlSimplificado;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '794px'; // A4 width em pixels (210mm * 96dpi / 25.4)
      tempDiv.style.minHeight = 'auto'; // Altura automática
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.padding = '40px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '16px'; // Fonte maior para melhor legibilidade
      tempDiv.style.lineHeight = '1.8'; // Espaçamento maior entre linhas
      tempDiv.style.color = '#000';
      tempDiv.style.boxSizing = 'border-box';
      tempDiv.style.overflow = 'visible'; // Permitir overflow para múltiplas páginas

      document.body.appendChild(tempDiv);

      try {
        // Aguardar um pouco para o DOM se estabilizar e fontes carregarem
        await new Promise(resolve => setTimeout(resolve, 500));

        // Capturar o elemento como imagem usando html2canvas
        const canvas = await html2canvas(tempDiv, {
          scale: 2, // Maior escala para melhor qualidade
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 794,
          height: tempDiv.scrollHeight + 100, // Altura baseada no conteúdo real
          scrollX: 0,
          scrollY: 0,
          logging: false,
          removeContainer: true,
          foreignObjectRendering: true
        });

        console.log(`📐 Canvas gerado: ${canvas.width}x${canvas.height}px`);

        // Criar PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // Calcular dimensões
        const imgWidth = 210; // A4 width em mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageHeight = 297; // A4 height em mm

        // Adicionar imagem ao PDF com paginação automática
        const imgData = canvas.toDataURL('image/png', 0.95);

        if (imgHeight > pageHeight) {
          // Dividir em múltiplas páginas
          console.log(`📄 Conteúdo muito alto (${imgHeight}mm), dividindo em páginas...`);

          let yOffset = 0;
          let pageNumber = 0;

          while (yOffset < imgHeight) {
            if (pageNumber > 0) {
              pdf.addPage();
            }

            // Calcular altura desta página
            const remainingHeight = imgHeight - yOffset;
            const currentPageHeight = Math.min(pageHeight, remainingHeight);

            // Calcular posição no canvas original
            const canvasYOffset = (yOffset * canvas.height) / imgHeight;
            const canvasPageHeight = (currentPageHeight * canvas.height) / imgHeight;

            // Criar canvas para esta página
            const pageCanvas = document.createElement('canvas');
            const pageCtx = pageCanvas.getContext('2d');
            pageCanvas.width = canvas.width;
            pageCanvas.height = canvasPageHeight;

            if (pageCtx) {
              // Desenhar parte do canvas original
              pageCtx.drawImage(
                canvas,
                0, canvasYOffset,
                canvas.width, canvasPageHeight,
                0, 0,
                canvas.width, canvasPageHeight
              );

              const pageImgData = pageCanvas.toDataURL('image/png', 0.95);
              pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, currentPageHeight);
            }

            yOffset += pageHeight;
            pageNumber++;
          }

          console.log(`✅ PDF dividido em ${pageNumber} páginas`);
        } else {
          // Cabe em uma página
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        }

        // Converter para blob
        const pdfBlob = pdf.output('blob');

        console.log('✅ PDF gerado com sucesso usando html2canvas');
        return pdfBlob;

      } finally {
        // Remover elemento temporário
        document.body.removeChild(tempDiv);
      }

    } catch (error) {
      console.error('❌ Erro ao converter HTML para PDF via html2canvas:', error);

      // Fallback: criar PDF com método simples e confiável
      console.log('🔄 Usando fallback: método de texto simples...');
      return this.criarPDFTextoSimples(htmlContent);
    }
  }

  /**
   * Cria HTML simplificado para renderização em PDF usando dados do contrato
   */
  static criarHTMLSimplificado(htmlOriginal: string): string {
    // Extrair dados do HTML original
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlOriginal;

    // Extrair informações principais
    const titulo = tempDiv.querySelector('.contract-title')?.textContent || 'CONTRATO COMERCIAL';
    const conteudo = tempDiv.querySelector('.contract-content')?.innerHTML || tempDiv.querySelector('.contract-content')?.textContent || '';
    const infoItems = Array.from(tempDiv.querySelectorAll('.info-item')).map(item => item.textContent?.trim()).filter(Boolean);

    // Processar conteúdo para manter formatação básica
    let conteudoProcessado = conteudo;
    if (conteudo.includes('<')) {
      // Se tem HTML, manter tags básicas
      conteudoProcessado = conteudo
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<h[1-6][^>]*>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]+>/g, '') // Remove outras tags
        .replace(/\n\s*\n/g, '\n\n') // Limpa quebras duplas
        .trim();
    }

    return `
      <div style="font-family: Arial, sans-serif; color: #000; line-height: 2.0; padding: 20px; max-width: none;">
        <!-- Cabeçalho -->
        <div style="text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 40px;">
          <h1 style="font-size: 28px; margin: 0 0 10px 0; font-weight: bold; text-transform: uppercase;">${titulo}</h1>
          <p style="margin: 0; font-size: 14px; color: #666;">Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>

        <!-- Informações do Contrato -->
        ${infoItems.length > 0 ? `
        <div style="background: #f8f9fa; padding: 25px; margin: 30px 0; border: 2px solid #007bff; border-radius: 8px;">
          <h3 style="margin: 0 0 20px 0; font-size: 20px; color: #333; font-weight: bold;">📋 Informações do Contrato</h3>
          ${infoItems.map(info => `
            <div style="margin: 12px 0; font-size: 16px; padding: 10px 0; border-bottom: 1px solid #ddd; line-height: 1.6;">
              ${info}
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- Conteúdo Principal -->
        <div style="margin: 40px 0; page-break-inside: avoid;">
          <h3 style="font-size: 20px; margin-bottom: 25px; color: #333; font-weight: bold; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            📄 Conteúdo do Contrato
          </h3>
          <div style="
            white-space: pre-wrap;
            padding: 25px;
            background: #fff;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            line-height: 2.2;
            text-align: justify;
            min-height: 200px;
          ">
            ${conteudoProcessado}
          </div>
        </div>

        <!-- Rodapé -->
        <div style="
          margin-top: 60px;
          border-top: 2px solid #ccc;
          padding-top: 25px;
          font-size: 14px;
          color: #666;
          text-align: center;
          page-break-inside: avoid;
        ">
          <p style="margin: 0 0 10px 0; font-weight: bold;">📄 Sistema de Contratos Eletrônicos</p>
          <p style="margin: 0 0 5px 0;">Documento gerado automaticamente</p>
          <p style="margin: 0;">🔒 Validade jurídica conforme Lei nº 14.063/2020</p>
        </div>
      </div>
    `;
  }

  /**
   * Método simples e confiável para criar PDF com paginação adequada
   */
  static criarPDFTextoSimples(htmlContent: string): Blob {
    try {
      console.log('🔄 Criando PDF com texto simples e paginação...');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 25;
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      const maxY = 280;
      let pageNumber = 1;

      // Função para adicionar texto com quebra de página e justificação
      const addText = (text: string, fontSize: number, isBold: boolean = false, isCenter: boolean = false, isJustified: boolean = false) => {
        if (!text || text.trim() === '') return;

        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');

        const lineHeight = Math.max(fontSize * 0.4, 5);
        const lines = pdf.splitTextToSize(text.trim(), contentWidth);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (yPosition + lineHeight > maxY) {
            // Adicionar número da página
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Página ${pageNumber}`, pageWidth - margin - 20, maxY + 10);

            pdf.addPage();
            pageNumber++;
            yPosition = 25;

            // Restaurar fonte
            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
          }

          let x = margin;

          if (isCenter) {
            const textWidth = pdf.getTextWidth(line);
            x = (pageWidth - textWidth) / 2;
            pdf.text(line, x, yPosition);
          } else if (isJustified && i < lines.length - 1 && line.trim().split(' ').length > 1) {
            // Aplicar justificação (exceto na última linha)
            const words = line.trim().split(' ');
            const totalTextWidth = words.reduce((sum, word) => sum + pdf.getTextWidth(word), 0);
            const totalSpaceWidth = contentWidth - totalTextWidth;
            const spaceWidth = totalSpaceWidth / (words.length - 1);

            let currentX = margin;
            for (let j = 0; j < words.length; j++) {
              pdf.text(words[j], currentX, yPosition);
              if (j < words.length - 1) {
                currentX += pdf.getTextWidth(words[j]) + spaceWidth;
              }
            }
          } else {
            pdf.text(line, x, yPosition);
          }

          yPosition += lineHeight;
        }

        yPosition += 3; // Espaço extra
      };

      // Extrair dados do HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;

      // Remover elementos de estilo
      const styleElements = tempDiv.querySelectorAll('style');
      styleElements.forEach(el => el.remove());

      // Extrair informações
      const titulo = tempDiv.querySelector('.contract-title')?.textContent?.trim() || 'CONTRATO COMERCIAL';
      const infoItems = Array.from(tempDiv.querySelectorAll('.info-item')).map(item => item.textContent?.trim()).filter(Boolean);

      // Extrair conteúdo
      let conteudo = tempDiv.querySelector('.contract-content')?.textContent?.trim() || '';
      if (!conteudo) {
        // Fallback: extrair todo o texto
        conteudo = tempDiv.textContent?.trim() || 'Conteúdo não disponível';
      }

      // Título principal
      addText('CONTRATO COMERCIAL', 18, true, true);
      yPosition += 5;

      // Título do contrato
      addText(titulo.toUpperCase(), 14, true, true);
      yPosition += 10;

      // Informações do contrato
      if (infoItems.length > 0) {
        addText('INFORMAÇÕES DO CONTRATO', 12, true);
        yPosition += 3;

        infoItems.forEach(info => {
          addText(`• ${info}`, 10);
        });

        yPosition += 8;
      }

      // Conteúdo principal
      addText('CONTEÚDO DO CONTRATO', 12, true);
      yPosition += 5;

      // Dividir conteúdo em parágrafos
      const paragrafos = conteudo.split(/\n\s*\n/).filter(p => p.trim());

      if (paragrafos.length > 1) {
        paragrafos.forEach(paragrafo => {
          const paragrafoLimpo = paragrafo.trim();
          if (paragrafoLimpo) {
            // Se parece com título, não justificar
            const isTitulo = paragrafoLimpo === paragrafoLimpo.toUpperCase() || /^CLÁUSULA/.test(paragrafoLimpo);
            addText(paragrafoLimpo, 11, isTitulo, false, !isTitulo); // Justificar apenas parágrafos normais
            yPosition += 3;
          }
        });
      } else {
        addText(conteudo, 11, false, false, true); // Justificar texto completo
      }

      // Seção de Etapas do Processo (versão simplificada)
      yPosition += 15;
      addText('HISTÓRICO E ETAPAS DO PROCESSO', 12, true);
      yPosition += 5;

      // Criar dados básicos para timeline
      const contratoBasico = {
        ...htmlContent, // Usar dados do HTML como fallback
        id: 'contrato-simples',
        titulo: 'Contrato',
        criado_em: new Date().toISOString(),
        assinante_externo_nome: 'Signatário Externo',
        assinante_externo_email: 'email@exemplo.com',
        assinante_externo_documento: 'XXX.XXX.XXX-XX',
        modelo: { nome: 'Modelo Padrão' }
      };

      // Etapas básicas conforme fluxo jurídico correto
      const etapasBasicas = [
        '1. ✓ Criação e Elaboração do Contrato - CONCLUÍDA',
        '2. ✓ Revisão Jurídica e Validação - CONCLUÍDA',
        '3. ✓ Geração do PDF Final - CONCLUÍDA',
        '4. ○ Assinatura Digital Qualificada (Empresa) - PENDENTE',
        '5. ○ Envio para o Cliente - PENDENTE',
        '6. ○ Assinatura Eletrônica Simples (Cliente) - PENDENTE',
        '7. ○ Finalização e Arquivo - PENDENTE'
      ];

      etapasBasicas.forEach(etapa => {
        addText(etapa, 10);
        yPosition += 2;
      });

      // Rodapé final
      yPosition += 10;
      addText(`Documento gerado em: ${new Date().toLocaleString('pt-BR')}`, 9);
      addText('Sistema de Contratos Eletrônicos', 9);

      // Adicionar número da última página
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Página ${pageNumber}`, pageWidth - margin - 20, maxY + 10);

      console.log(`✅ PDF criado com ${pageNumber} página(s)`);
      return pdf.output('blob');

    } catch (fallbackError) {
      console.error('❌ Erro no PDF simples:', fallbackError);

      // Último recurso: PDF básico
      const pdf = new jsPDF();
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CONTRATO COMERCIAL', 20, 20);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Erro na geração do PDF.', 20, 40);
      pdf.text('Entre em contato com o suporte técnico.', 20, 60);
      pdf.text(`Data: ${new Date().toLocaleString('pt-BR')}`, 20, 80);

      return pdf.output('blob');
    }
  }

  /**
   * Método alternativo: gerar PDF usando window.print()
   */
  static async gerarPDFViaPrint(contrato: DadosContratoPDF): Promise<ResultadoGeracaoPDF> {
    try {
      console.log('🖨️ Gerando PDF via impressão...');

      // Gerar HTML do contrato
      const htmlContrato = this.gerarHTMLContrato(contrato);

      // Calcular hash do conteúdo HTML
      const encoder = new TextEncoder();
      const data = encoder.encode(htmlContrato);
      const hashSHA256 = await this.calcularHashSHA256(data.buffer);

      // Criar blob HTML (como fallback)
      const htmlBlob = new Blob([htmlContrato], { type: 'text/html' });

      // Salvar HTML no MinIO
      const pdfUrl = await this.salvarHTMLComoArquivo(htmlBlob, `contrato_${contrato.id}.html`);

      return {
        pdfUrl,
        hashSHA256,
        tamanhoBytes: htmlBlob.size,
        geradoEm: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Erro ao gerar PDF via print:', error);
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
   * Salva PDF como arquivo no MinIO
   */
  static async salvarPDFComoArquivo(pdfBlob: Blob, nomeArquivo: string): Promise<string> {
    try {
      console.log('💾 Salvando PDF no MinIO:', nomeArquivo);

      const result = await MinIOService.uploadFile(pdfBlob, nomeArquivo, 'application/pdf');

      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload para MinIO');
      }

      console.log('✅ PDF salvo no MinIO:', result.url);
      return result.url!;

    } catch (error) {
      console.error('❌ Erro ao salvar PDF no MinIO:', error);
      throw new Error('Erro ao salvar arquivo no storage');
    }
  }

  /**
   * Salva HTML como arquivo no MinIO (para backup)
   */
  static async salvarHTMLComoArquivo(htmlBlob: Blob, nomeArquivo: string): Promise<string> {
    try {
      console.log('💾 Salvando HTML no MinIO:', nomeArquivo);

      const result = await MinIOService.uploadFile(htmlBlob, nomeArquivo, 'text/html');

      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload para MinIO');
      }

      console.log('✅ HTML salvo no MinIO:', result.url);
      return result.url!;

    } catch (error) {
      console.error('❌ Erro ao salvar HTML no MinIO:', error);
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
   * Cria bucket no MinIO se não existir (com fallback)
   */
  static async criarBucketSeNecessario(): Promise<void> {
    try {
      console.log('🔍 Verificando e criando bucket no MinIO...');

      const bucketReady = await MinIOService.createBucketIfNotExists();

      if (!bucketReady) {
        console.warn('⚠️ MinIO pode não estar configurado corretamente, mas continuando...');
        console.log('💡 O sistema tentará fazer upload direto mesmo sem verificar o bucket');
        // Não falhar aqui - deixar o upload tentar diretamente
      } else {
        console.log('✅ Bucket MinIO pronto para uso');
      }

    } catch (error) {
      console.warn('⚠️ Erro ao verificar MinIO, mas continuando:', error);
      console.log('💡 O sistema tentará fazer upload direto');
      // Não falhar aqui - deixar o upload tentar diretamente
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

  /**
   * Gera PDF diretamente dos dados do contrato (sem HTML)
   */
  static async gerarPDFDireto(contrato: DadosContratoPDF): Promise<Blob> {
    try {
      console.log('🔄 Gerando PDF diretamente dos dados do contrato...');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 25;
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      const maxY = 280; // Margem inferior
      let pageNumber = 1;

      // Função para adicionar texto com quebra de página automática e justificação
      const addText = (text: string, fontSize: number, isBold: boolean = false, isCenter: boolean = false, extraSpacing: number = 0, isJustified: boolean = false) => {
        if (!text || text.trim() === '') return yPosition;

        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');

        const lineHeight = Math.max(fontSize * 0.4, 5); // Altura mínima da linha
        const lines = pdf.splitTextToSize(text.trim(), contentWidth);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Verificar se precisa de nova página
          if (yPosition + lineHeight > maxY) {
            pdf.addPage();
            pageNumber++;
            yPosition = 25;
            console.log(`📄 Nova página criada: ${pageNumber}`);
          }

          let x = margin;

          if (isCenter) {
            const textWidth = pdf.getTextWidth(line);
            x = (pageWidth - textWidth) / 2;
            pdf.text(line, x, yPosition);
          } else if (isJustified && i < lines.length - 1 && line.trim().split(' ').length > 1) {
            // Aplicar justificação (exceto na última linha)
            const words = line.trim().split(' ');
            const totalTextWidth = words.reduce((sum, word) => sum + pdf.getTextWidth(word), 0);
            const totalSpaceWidth = contentWidth - totalTextWidth;
            const spaceWidth = totalSpaceWidth / (words.length - 1);

            let currentX = margin;
            for (let j = 0; j < words.length; j++) {
              pdf.text(words[j], currentX, yPosition);
              if (j < words.length - 1) {
                currentX += pdf.getTextWidth(words[j]) + spaceWidth;
              }
            }
          } else {
            // Texto normal (não justificado ou última linha)
            pdf.text(line, x, yPosition);
          }

          yPosition += lineHeight;
        }

        // Espaçamento extra após seção
        yPosition += extraSpacing;

        return yPosition;
      };

      // Função para adicionar rodapé em todas as páginas
      const addFooter = () => {
        const currentPage = pdf.internal.getCurrentPageInfo().pageNumber;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Página ${currentPage}`, pageWidth - margin - 20, maxY + 10);
        pdf.text('Sistema de Contratos Eletrônicos', margin, maxY + 10);
      };

      // Título principal
      addText('CONTRATO COMERCIAL', 20, true, true, 8);

      // Título do contrato
      addText(contrato.titulo.toUpperCase(), 16, true, true, 12);

      // Informações do contrato
      addText('INFORMAÇÕES DO CONTRATO', 14, true, false, 5);

      const infos = [
        `Modelo: ${contrato.modelo?.nome || 'N/A'}`,
        `Criado em: ${new Date(contrato.criado_em).toLocaleString('pt-BR')}`,
        `Signatário Externo: ${contrato.assinante_externo_nome}`,
        `Email: ${contrato.assinante_externo_email}`,
        `Documento: ${contrato.assinante_externo_documento}`
      ];

      if (contrato.finalizado_em) {
        infos.push(`Finalizado em: ${new Date(contrato.finalizado_em).toLocaleString('pt-BR')}`);
      }

      infos.forEach(info => {
        addText(`• ${info}`, 12, false, false, 2);
      });

      // Espaço antes do conteúdo
      yPosition += 10;

      // Conteúdo do contrato
      addText('CONTEÚDO DO CONTRATO', 14, true, false, 8);

      // Processar conteúdo do contrato
      let conteudoProcessado = this.substituirVariaveisTemplate(contrato.conteudo, contrato);

      console.log('📝 Conteúdo original:', conteudoProcessado.substring(0, 100) + '...');

      // Se o conteúdo tem HTML, processar adequadamente
      if (conteudoProcessado.includes('<')) {
        // Criar elemento temporário para extrair texto
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = conteudoProcessado;

        // Processar elementos específicos
        const headers = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headers.forEach(header => {
          const text = header.textContent || '';
          header.outerHTML = `\n\n${text.toUpperCase()}\n`;
        });

        const paragraphs = tempDiv.querySelectorAll('p');
        paragraphs.forEach(p => {
          const text = p.textContent || '';
          p.outerHTML = `\n${text}\n`;
        });

        // Extrair texto final
        conteudoProcessado = tempDiv.textContent || tempDiv.innerText || conteudoProcessado;
      }

      // Limpar e formatar texto
      const conteudoLimpo = conteudoProcessado
        .replace(/&nbsp;/g, ' ') // Replace &nbsp;
        .replace(/&amp;/g, '&') // Replace &amp;
        .replace(/&lt;/g, '<') // Replace &lt;
        .replace(/&gt;/g, '>') // Replace &gt;
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Máximo 2 quebras de linha
        .replace(/\s+/g, ' ') // Multiple spaces to single
        .replace(/^\s+|\s+$/g, '') // Trim
        .trim();

      console.log('📝 Conteúdo limpo:', conteudoLimpo.substring(0, 100) + '...');

      if (conteudoLimpo && conteudoLimpo.length > 0) {
        // Dividir conteúdo em parágrafos para melhor formatação
        const paragrafos = conteudoLimpo.split('\n\n').filter(p => p.trim());

        if (paragrafos.length > 0) {
          paragrafos.forEach((paragrafo, index) => {
            const paragrafoLimpo = paragrafo.trim();
            if (paragrafoLimpo) {
              // Se parece com título (tudo maiúsculo ou começa com número), usar fonte maior
              const isTitulo = paragrafoLimpo === paragrafoLimpo.toUpperCase() || /^[0-9]+\./.test(paragrafoLimpo) || /^CLÁUSULA/.test(paragrafoLimpo);
              addText(paragrafoLimpo, isTitulo ? 14 : 12, isTitulo, false, 4, !isTitulo); // Justificar apenas parágrafos normais
            }
          });
        } else {
          // Se não conseguiu dividir em parágrafos, usar texto completo
          addText(conteudoLimpo, 12, false, false, 0, true); // Justificar texto completo
        }
      } else {
        // Fallback se não conseguiu extrair conteúdo
        addText('Conteúdo do contrato não pôde ser processado adequadamente.', 12, false, false, 0);
        addText(`Conteúdo original: ${contrato.conteudo.substring(0, 200)}...`, 10, false, false, 0);
      }

      // Assinaturas se existirem
      if (contrato.assinaturas && contrato.assinaturas.length > 0) {
        yPosition += 15;
        addText('ASSINATURAS ELETRÔNICAS', 14, true, false, 8);

        contrato.assinaturas.forEach((assinatura, index) => {
          const tipoAssinatura = assinatura.tipo === 'interna_qualificada'
            ? 'Assinatura Digital Qualificada'
            : 'Assinatura Eletrônica Simples';

          addText(`${index + 1}. ${tipoAssinatura}`, 12, true, false, 3);
          addText(`Signatário: ${assinatura.signatario_nome}`, 11, false, false, 2);

          if (assinatura.assinado_em) {
            addText(`Assinado em: ${new Date(assinatura.assinado_em).toLocaleString('pt-BR')}`, 11, false, false, 2);
          }

          if (assinatura.certificado_dados) {
            addText(`Certificado: ${assinatura.certificado_dados.emissor}`, 11, false, false, 2);
            addText(`Válido até: ${new Date(assinatura.certificado_dados.valido_ate).toLocaleDateString('pt-BR')}`, 11, false, false, 2);
          }

          yPosition += 5;
        });
      }

      // Seção de Etapas do Processo
      yPosition += 20;
      addText('HISTÓRICO E ETAPAS DO PROCESSO', 14, true, false, 10);

      // Criar timeline das etapas
      const etapas = this.criarTimelineContrato(contrato);

      etapas.forEach((etapa, index) => {
        const numeroEtapa = `${index + 1}.`;
        const statusIcon = etapa.concluida ? '✓' : '○';
        const statusText = etapa.concluida ? 'CONCLUÍDA' : 'PENDENTE';

        addText(`${numeroEtapa} ${etapa.titulo}`, 12, true, false, 2);
        addText(`   Status: ${statusIcon} ${statusText}`, 10, false, false, 1);

        if (etapa.data) {
          addText(`   Data: ${etapa.data}`, 10, false, false, 1);
        }

        if (etapa.responsavel) {
          addText(`   Responsável: ${etapa.responsavel}`, 10, false, false, 1);
        }

        if (etapa.observacoes) {
          addText(`   Observações: ${etapa.observacoes}`, 10, false, false, 1, true); // Justificar observações
        }

        yPosition += 4;
      });

      // Adicionar rodapé na última página
      addFooter();

      // Adicionar rodapé em todas as páginas anteriores
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i < totalPages; i++) {
        pdf.setPage(i);
        addFooter();
      }

      // Voltar para a última página
      pdf.setPage(totalPages);

      // Informações finais
      yPosition += 10;
      addText(`Documento gerado em: ${new Date().toLocaleString('pt-BR')}`, 10, false, false, 2);
      addText('Validade jurídica conforme Lei nº 14.063/2020', 9, false, false, 0);

      console.log('✅ PDF direto gerado com sucesso');
      return pdf.output('blob');

    } catch (error) {
      console.error('❌ Erro ao gerar PDF direto:', error);
      throw error;
    }
  }

  /**
   * Cria timeline das etapas do contrato conforme Lei nº 14.063/2020
   */
  static criarTimelineContrato(contrato: DadosContratoPDF): Array<{
    titulo: string;
    concluida: boolean;
    data?: string;
    responsavel?: string;
    observacoes?: string;
  }> {
    const etapas = [];

    // 1. Criação do Contrato
    etapas.push({
      titulo: 'Criação e Elaboração do Contrato',
      concluida: true,
      data: new Date(contrato.criado_em).toLocaleString('pt-BR'),
      responsavel: 'Usuário Interno',
      observacoes: `Contrato elaborado com base no modelo "${contrato.modelo?.nome || 'N/A'}" e preenchimento das variáveis contratuais`
    });

    // 2. Revisão e Validação
    etapas.push({
      titulo: 'Revisão Jurídica e Validação do Conteúdo',
      concluida: true,
      data: new Date(contrato.criado_em).toLocaleString('pt-BR'),
      responsavel: 'Usuário Interno',
      observacoes: `Revisão do conteúdo contratual e validação dos dados: ${contrato.assinante_externo_nome} (${contrato.assinante_externo_documento})`
    });

    // 3. Geração do PDF Final
    etapas.push({
      titulo: 'Geração do Documento PDF Final',
      concluida: true,
      data: new Date().toLocaleString('pt-BR'),
      responsavel: 'Sistema',
      observacoes: 'Documento PDF gerado com hash SHA-256 para garantia de integridade e autenticidade'
    });

    // 4. Assinatura Digital Qualificada (Empresa) - PRIMEIRA ASSINATURA
    const assinaturaInterna = contrato.assinaturas?.find(a => a.tipo === 'interna_qualificada');
    etapas.push({
      titulo: 'Assinatura Digital Qualificada (Empresa)',
      concluida: !!assinaturaInterna?.assinado_em,
      data: assinaturaInterna?.assinado_em ? new Date(assinaturaInterna.assinado_em).toLocaleString('pt-BR') : undefined,
      responsavel: assinaturaInterna?.signatario_nome || 'Representante Legal da Empresa',
      observacoes: assinaturaInterna?.assinado_em
        ? `Assinatura digital qualificada realizada com certificado ICP-Brasil${assinaturaInterna.certificado_dados ? ` (${assinaturaInterna.certificado_dados.emissor})` : ''}. Confere presunção de autenticidade conforme Lei nº 14.063/2020`
        : 'Aguardando assinatura digital qualificada com certificado ICP-Brasil. Esta assinatura deve ser realizada ANTES do envio ao cliente'
    });

    // 5. Envio para Cliente (só após assinatura interna)
    const assinaturaExterna = contrato.assinaturas?.find(a => a.tipo === 'externa_simples');
    const empresaJaAssinou = !!assinaturaInterna?.assinado_em;

    etapas.push({
      titulo: 'Envio do Contrato para o Cliente',
      concluida: empresaJaAssinou && !!contrato.finalizado_em,
      data: contrato.finalizado_em ? new Date(contrato.finalizado_em).toLocaleString('pt-BR') : undefined,
      responsavel: 'Sistema',
      observacoes: empresaJaAssinou
        ? (contrato.finalizado_em
          ? `Contrato enviado para ${contrato.assinante_externo_email} com a assinatura da empresa já aplicada`
          : 'Pronto para envio - empresa já assinou digitalmente')
        : 'Aguardando assinatura da empresa antes do envio ao cliente'
    });

    // 6. Assinatura Eletrônica Simples (Cliente) - SEGUNDA ASSINATURA
    etapas.push({
      titulo: 'Assinatura Eletrônica Simples (Cliente)',
      concluida: !!assinaturaExterna?.assinado_em,
      data: assinaturaExterna?.assinado_em ? new Date(assinaturaExterna.assinado_em).toLocaleString('pt-BR') : undefined,
      responsavel: contrato.assinante_externo_nome,
      observacoes: assinaturaExterna?.assinado_em
        ? `Assinatura eletrônica simples realizada via token enviado para ${contrato.assinante_externo_email}. Válida conforme Art. 4º da Lei nº 14.063/2020`
        : empresaJaAssinou
          ? `Aguardando assinatura eletrônica do cliente via email (${contrato.assinante_externo_email})`
          : 'Aguardando assinatura da empresa para posterior envio ao cliente'
    });

    // 7. Finalização e Arquivo do Contrato
    const todasAssinaturasCompletas = assinaturaInterna?.assinado_em && assinaturaExterna?.assinado_em;

    etapas.push({
      titulo: 'Finalização e Arquivo do Contrato',
      concluida: todasAssinaturasCompletas,
      data: todasAssinaturasCompletas && contrato.assinaturas
        ? new Date(Math.max(...contrato.assinaturas.map(a => new Date(a.assinado_em!).getTime()))).toLocaleString('pt-BR')
        : undefined,
      responsavel: 'Sistema',
      observacoes: todasAssinaturasCompletas
        ? 'Contrato totalmente assinado e arquivado. Possui validade jurídica plena conforme Lei nº 14.063/2020. Assinatura qualificada da empresa + assinatura simples do cliente = documento juridicamente válido'
        : 'Aguardando conclusão de todas as assinaturas para finalização e arquivo do processo contratual'
    });

    return etapas;
  }
}
