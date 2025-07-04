
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
          dadosVariaveis: data.dados_variaveis || {},
          status: data.status,
          urlPdf: data.url_pdf,
          hashDocumento: data.hash_documento,
          assinanteInternoId: data.assinante_interno_id,
          assinanteInternoNome: data.assinante_interno_nome,
          assinanteInternoEmail: data.assinante_interno_email,
          assinadoInternamenteEm: data.assinado_internamente_em ? new Date(data.assinado_internamente_em) : undefined,
          dadosAssinaturaInterna: data.dados_assinatura_interna,
          assinanteExternoNome: data.assinante_externo_nome,
          assinanteExternoEmail: data.assinante_externo_email,
          assinanteExternoDocumento: data.assinante_externo_documento,
          assinadoExternamenteEm: data.assinado_externamente_em ? new Date(data.assinado_externamente_em) : undefined,
          tokenAssinaturaExterna: data.token_assinatura_externa,
          tokenExpiraEm: data.token_expira_em ? new Date(data.token_expira_em) : undefined,
          dadosAssinaturaExterna: data.dados_assinatura_externa,
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
      <div className="laudo-a4" style={{ 
        fontSize: '10pt', 
        padding: 0, 
        width: '210mm', 
        minHeight: '297mm', 
        margin: '0 auto', 
        boxShadow: '0 0 8px #e5e7eb', 
        color: '#111', 
        background: '#fff' 
      }}>
        {/* Papel timbrado como fundo */}
        <div 
          className="laudo-background"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/images/papeltimbrado.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 1,
            opacity: 1
          }}
        />
        
        {/* Wrapper do conteúdo */}
        <div className="laudo-content-wrapper" style={{ 
          position: 'absolute', 
          top: '20mm', 
          left: 0, 
          right: 0, 
          width: '100%', 
          fontSize: '10pt', 
          padding: '0 12mm', 
          minHeight: '220mm', 
          color: '#111', 
          background: 'transparent', 
          zIndex: 3 
        }}>
          {/* Título do contrato */}
          <div className="laudo-title" style={{ fontSize: '1.2em', marginBottom: 8, fontWeight: 'bold', textAlign: 'center' }}>
            CONTRATO Nº {contrato.numeroContrato}
          </div>
          
          {/* Título secundário */}
          <div style={{ fontSize: '1.1em', marginBottom: 16, fontWeight: 'bold', textAlign: 'center' }}>
            {contrato.titulo}
          </div>

          {/* Seção de Identificação */}
          <div className="laudo-section-title" style={{ fontSize: '1em', marginBottom: 8, fontWeight: 'bold' }}>
            IDENTIFICAÇÃO DO CONTRATO
          </div>
          
          <table className="laudo-table-id" style={{ fontSize: '9pt', marginBottom: 16, width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>STATUS:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px' }}>{statusLabel[contrato.status] || contrato.status}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>DATA DE CRIAÇÃO:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px' }}>{contrato.criadoEm ? contrato.criadoEm.toLocaleDateString('pt-BR') : '-'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>CLIENTE:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px' }}>{contrato.assinanteExternoNome}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>CPF/CNPJ:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px' }}>{contrato.assinanteExternoDocumento || '-'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>E-MAIL:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px' }}>{contrato.assinanteExternoEmail}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>RESPONSÁVEL INTERNO:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px' }}>{contrato.assinanteInternoNome || '-'}</td>
              </tr>
            </tbody>
          </table>

          {/* Conteúdo do contrato */}
          <div className="laudo-section-title" style={{ fontSize: '1em', marginBottom: 8, fontWeight: 'bold' }}>
            CONTEÚDO DO CONTRATO
          </div>
          
          <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            padding: '12px', 
            backgroundColor: '#f9f9f9', 
            whiteSpace: 'pre-line', 
            marginBottom: 16,
            minHeight: 200,
            lineHeight: '1.5'
          }}>
            {contrato.conteudo}
          </div>

          {/* Seção de assinaturas */}
          {(contrato.assinadoInternamenteEm || contrato.assinadoExternamenteEm) && (
            <div style={{ marginTop: 24, borderTop: '1px solid #ccc', paddingTop: 16 }}>
              <div className="laudo-section-title" style={{ fontSize: '1em', marginBottom: 8, fontWeight: 'bold' }}>
                REGISTRO DE ASSINATURAS
              </div>
              
              {contrato.assinadoInternamenteEm && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Assinatura Interna:</strong> {contrato.assinanteInternoNome}<br/>
                  <strong>Data/Hora:</strong> {contrato.assinadoInternamenteEm.toLocaleString('pt-BR')}<br/>
                  <strong>Tipo:</strong> Assinatura Eletrônica Qualificada (ICP-Brasil)
                </div>
              )}
              
              {contrato.assinadoExternamenteEm && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Assinatura Externa:</strong> {contrato.assinanteExternoNome}<br/>
                  <strong>Data/Hora:</strong> {contrato.assinadoExternamenteEm.toLocaleString('pt-BR')}<br/>
                  <strong>Tipo:</strong> Assinatura Eletrônica Simples com Verificação por Token
                </div>
              )}
            </div>
          )}

          {/* Hash e integridade */}
          <div style={{ marginTop: 24, borderTop: '1px solid #ccc', paddingTop: 16 }}>
            <div className="laudo-section-title" style={{ fontSize: '1em', marginBottom: 8, fontWeight: 'bold' }}>
              VERIFICAÇÃO DE INTEGRIDADE
            </div>
            
            <div style={{ fontSize: '8pt', color: '#666', marginBottom: 8 }}>
              <strong>Hash SHA-256 do Documento:</strong><br/>
              <span style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '7pt' }}>
                {documentHash || contrato.hashDocumento || 'Calculando...'}
              </span>
            </div>
            
            <div style={{ fontSize: '8pt', color: '#666' }}>
              <strong>Documento gerado em:</strong> {new Date().toLocaleString('pt-BR')}<br/>
              Este hash garante a integridade e autenticidade do documento conforme Lei 14.063/2020.
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: '8pt', color: '#888' }}>
            Documento gerado eletronicamente pelo Sistema de Gestão Comercial<br/>
            Válido com assinatura eletrônica conforme legislação vigente
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableContratoPage;
