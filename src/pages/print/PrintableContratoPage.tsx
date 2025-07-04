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

const PrintableContratoPage = () => {
  const { contratoId } = useParams();
  const [contrato, setContrato] = useState<ContratoCustom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (error || !data || !('numero_contrato' in data)) {
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
          criadoEm: new Date(data.criado_em),
          atualizadoEm: new Date(data.atualizado_em),
          criadoPor: data.criado_por,
        };
        setContrato(contrato);
      } catch (e) {
        setError('Erro ao buscar contrato');
      } finally {
        setLoading(false);
      }
    };
    fetchContrato();
  }, [contratoId]);

  const handlePrint = () => window.print();
  const handleClose = () => window.close();

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
        <button onClick={handleClose} className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Fechar</button>
      </div>
    );
  }

  return (
    <div id="contrato-print-area" style={{ color: '#111', background: '#fff' }}>
      {/* Botões de controle - só aparecem na tela */}
      <div className="no-print absolute top-4 right-4 flex gap-2 z-50">
        <button onClick={handlePrint} className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors">
          <Printer size={20} />
        </button>
        <button onClick={handleClose} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors">
          <X size={20} />
        </button>
      </div>
      {/* Conteúdo do contrato */}
      <div className="laudo-a4" style={{ fontSize: '10pt', padding: 0, width: '210mm', minHeight: '297mm', margin: '0 auto', boxShadow: '0 0 8px #e5e7eb', color: '#111', background: '#fff' }}>
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
        {/* Wrapper do conteúdo para não sobrepor o cabeçalho do papel timbrado */}
        <div className="laudo-content-wrapper" style={{ position: 'absolute', top: '20mm', left: 0, right: 0, width: '100%', fontSize: '10pt', padding: '0 12mm', minHeight: '220mm', color: '#111', background: 'transparent', zIndex: 3 }}>
          {/* Título do contrato */}
          <div className="laudo-title" style={{ fontSize: '1.1em', marginBottom: 8 }}>
            CONTRATO Nº {contrato.numeroContrato}
          </div>
          {/* Seção de Identificação */}
          <div className="laudo-section-title" style={{ fontSize: '1em', marginBottom: 4 }}>
            IDENTIFICAÇÃO
          </div>
          <table className="laudo-table-id" style={{ fontSize: '9pt', marginBottom: 8 }}>
            <tbody>
              <tr>
                <td><strong>TÍTULO:</strong> {contrato.titulo}</td>
                <td><strong>STATUS:</strong> {statusLabel[contrato.status] || contrato.status}</td>
              </tr>
              <tr>
                <td><strong>CLIENTE:</strong> {contrato.assinanteExternoNome}</td>
                <td><strong>CPF/CNPJ:</strong> {contrato.assinanteExternoDocumento || '-'}</td>
              </tr>
              <tr>
                <td><strong>E-MAIL:</strong> {contrato.assinanteExternoEmail}</td>
                <td><strong>DATA DE CRIAÇÃO:</strong> {contrato.criadoEm ? contrato.criadoEm.toLocaleDateString('pt-BR') : '-'}</td>
              </tr>
              <tr>
                <td><strong>ASSINANTE INTERNO:</strong> {contrato.assinanteInternoNome || '-'}</td>
                <td><strong>ASSINANTE EXTERNO:</strong> {contrato.assinanteExternoNome || '-'}</td>
              </tr>
            </tbody>
          </table>
          {/* Conteúdo do contrato */}
          <div className="laudo-section-title" style={{ fontSize: '1em', marginBottom: 4 }}>
            CONTEÚDO DO CONTRATO
          </div>
          <div className="border rounded p-2 bg-gray-50 whitespace-pre-line mt-1" style={{ minHeight: 200 }}>
            {contrato.conteudo}
          </div>
          {/* Hash e PDF */}
          <div className="mt-4 text-xs text-gray-500">
            {contrato.hashDocumento && <div><strong>Hash SHA-256:</strong> {contrato.hashDocumento}</div>}
            {contrato.urlPdf && (
              <div>
                <a href={contrato.urlPdf} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Baixar PDF Final</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableContratoPage; 