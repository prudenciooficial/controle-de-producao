import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, Printer, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import '@/pages/print/print-laudo.css';
import type { Database } from '@/integrations/supabase/types';
import type { Contrato as ContratoCustom } from '@/types';

const statusLabel: Record<string, string> = {
  rascunho: 'Rascunho',
  aguardando_assinatura_interna: 'Aguardando Assinatura Interna',
  aguardando_assinatura_externa: 'Aguardando Assinatura Externa',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

// Função para calcular hash SHA-256
const calculateSHA256 = async (content: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const PrintableContratoPage = () => {
  const { contratoId } = useParams();
  const [contrato, setContrato] = useState<ContratoCustom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentHash, setDocumentHash] = useState<string>('');

  useEffect(() => {
    const fetchContrato = async () => {
      if (!contratoId) {
        setError('ID do contrato não fornecido');
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('contratos')
          .select('*')
          .eq('id', contratoId)
          .single();
          
        if (error || !data) {
          setError('Contrato não encontrado');
          setLoading(false);
          return;
        }

        const contrato: ContratoCustom = {
          id: data.id,
          numeroContrato: data.numero_contrato,
          modeloId: data.modelo_id,
          titulo: data.titulo,
          conteudo: data.conteudo,
          dadosVariaveis: typeof data.dados_variaveis === 'string' ? JSON.parse(data.dados_variaveis) : (data.dados_variaveis as Record<string, string | number | boolean | Date> || {}),
          status: data.status as 'rascunho' | 'aguardando_assinatura_interna' | 'aguardando_assinatura_externa' | 'concluido' | 'cancelado',
          urlPdf: data.url_pdf,
          hashDocumento: data.hash_documento,
          assinanteInternoId: data.assinante_interno_id,
          assinanteInternoNome: data.assinante_interno_nome,
          assinanteInternoEmail: data.assinante_interno_email,
          assinadoInternamenteEm: data.assinado_internamente_em ? new Date(data.assinado_internamente_em) : undefined,
          dadosAssinaturaInterna: typeof data.dados_assinatura_interna === 'string' ? JSON.parse(data.dados_assinatura_interna) : (data.dados_assinatura_interna as unknown),
          assinanteExternoNome: data.assinante_externo_nome,
          assinanteExternoEmail: data.assinante_externo_email,
          assinanteExternoDocumento: data.assinante_externo_documento,
          assinadoExternamenteEm: data.assinado_externamente_em ? new Date(data.assinado_externamente_em) : undefined,
          tokenAssinaturaExterna: data.token_assinatura_externa,
          tokenExpiraEm: data.token_expira_em ? new Date(data.token_expira_em) : undefined,
          dadosAssinaturaExterna: typeof data.dados_assinatura_externa === 'string' ? JSON.parse(data.dados_assinatura_externa) : (data.dados_assinatura_externa as unknown),
          criadoEm: new Date(data.criado_em || new Date()),
          atualizadoEm: new Date(data.atualizado_em || new Date()),
          criadoPor: data.criado_por || '',
        };
        
        setContrato(contrato);
        
        // Calcular hash do documento
        const contentForHash = `${contrato.numeroContrato}-${contrato.titulo}-${contrato.conteudo}`;
        const hash = await calculateSHA256(contentForHash);
        setDocumentHash(hash);
        
      } catch (e) {
        console.error('Erro ao buscar contrato:', e);
        setError('Erro ao buscar contrato');
      } finally {
        setLoading(false);
      }
    };

    fetchContrato();
  }, [contratoId]);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  const handleDownloadPDF = async () => {
    if (!contrato) return;
    
    try {
      // Criar PDF usando a API do navegador
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Contrato ${contrato.numeroContrato}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .content { line-height: 1.6; }
                .signature-section { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; }
                .hash { font-family: monospace; word-break: break-all; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>CONTRATO Nº ${contrato.numeroContrato}</h1>
                <h2>${contrato.titulo}</h2>
              </div>
              <div class="content">
                ${contrato.conteudo.replace(/\n/g, '<br>')}
              </div>
              <div class="signature-section">
                <h3>Informações de Integridade</h3>
                <p><strong>Hash SHA-256:</strong> <span class="hash">${documentHash}</span></p>
                <p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin mr-2" /> Carregando Contrato...
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-xl font-bold mb-2">Erro ao carregar contrato</h2>
        <p>{error || 'Contrato não encontrado.'}</p>
        <button 
          onClick={handleClose} 
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div id="contrato-print-area" style={{ color: '#111', background: '#fff' }}>
      {/* Botões de controle - só aparecem na tela */}
      <div className="no-print absolute top-4 right-4 flex gap-2 z-50">
        <button 
          onClick={handlePrint} 
          className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          title="Imprimir"
        >
          <Printer size={20} />
        </button>
        <button 
          onClick={handleDownloadPDF} 
          className="bg-green-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors"
          title="Baixar PDF"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <button 
          onClick={handleClose} 
          className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
          title="Fechar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Conteúdo do contrato */}
      <div className="laudo-a4">
        {/* Cabeçalho */}
        <div className="contract-header">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {contrato.titulo}
          </h1>
          <p className="text-sm text-gray-600">
            Contrato Nº: {contrato.numeroContrato}
          </p>
        </div>

        {/* Conteúdo do contrato */}
        <div className="contract-content">
          {contrato.conteudo.split('\n\n').map((paragrafo, index) => {
            if (paragrafo.trim() === '') return null;
            
            return (
              <p key={index} className="contract-paragraph">
                {paragrafo}
              </p>
            );
          })}
        </div>

        {/* Rodapé */}
        <div className="contract-footer">
          <p>Este documento foi gerado eletronicamente em {new Date().toLocaleString('pt-BR')}</p>
          <p>Hash do documento: {contrato.hashDocumento || 'Não disponível'}</p>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            font-family: 'Times New Roman', serif;
          }
          
          @page {
            size: A4;
            margin: 15mm 20mm 20mm 20mm;
            background-image: url('/images/papeltimbrado.jpg');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          }
          
          .no-print {
            display: none !important;
          }
          
          .laudo-a4 {
            width: 100%;
            margin: 0;
            padding: 0;
            background: transparent;
            box-shadow: none;
            min-height: auto;
          }
          
          .contract-header {
            text-align: center;
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          
          .contract-content {
            font-size: 12pt;
            color: #333;
            text-align: justify;
            margin-bottom: 40px;
          }
          
          .contract-paragraph {
            margin-bottom: 1em;
            text-indent: 2em;
            orphans: 3;
            widows: 3;
          }
          
          .contract-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 5px;
            background: white;
          }
        }
        
        @media screen {
          .laudo-a4 {
            width: 210mm;
            min-height: auto;
            margin: 0 auto;
            padding: 20mm;
            background: white;
            box-shadow: 0 0 8px #e5e7eb;
            position: relative;
            background-image: url('/images/papeltimbrado.jpg');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            position: relative;
          }
          
          .contract-header {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
            z-index: 2;
            background: rgba(255, 255, 255, 0.9);
            padding: 15px;
            border-radius: 5px;
          }
          
          .contract-content {
            position: relative;
            z-index: 2;
            background: rgba(255, 255, 255, 0.9);
            padding: 20px;
            border-radius: 5px;
            line-height: 1.6;
            text-align: justify;
          }
          
          .contract-paragraph {
            margin-bottom: 1em;
            text-indent: 2em;
          }
          
          .contract-footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
            position: relative;
            z-index: 2;
            background: rgba(255, 255, 255, 0.9);
            padding: 10px;
            border-radius: 5px;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintableContratoPage;
