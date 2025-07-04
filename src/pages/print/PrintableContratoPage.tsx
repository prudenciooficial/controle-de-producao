import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader } from 'lucide-react';
import type { 
  Contrato, 
  StatusContrato, 
  DadosAssinaturaDigital, 
  DadosAssinaturaSimples 
} from '@/types';

const PrintableContratoPage = () => {
  const { id } = useParams<{ id: string }>();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchContrato();
    }
  }, [id]);

  const fetchContrato = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const contratoFormatted: Contrato = {
        id: data.id,
        numeroContrato: data.numero_contrato,
        modeloId: data.modelo_id,
        titulo: data.titulo,
        conteudo: data.conteudo,
        dadosVariaveis: (data.dados_variaveis as any) || {},
        status: data.status as StatusContrato,
        urlPdf: data.url_pdf,
        hashDocumento: data.hash_documento,
        assinanteInternoId: data.assinante_interno_id,
        assinanteInternoNome: data.assinante_interno_nome,
        assinanteInternoEmail: data.assinante_interno_email,
        assinadoInternamenteEm: data.assinado_internamente_em ? new Date(data.assinado_internamente_em) : undefined,
        dadosAssinaturaInterna: data.dados_assinatura_interna as DadosAssinaturaDigital,
        assinanteExternoNome: data.assinante_externo_nome,
        assinanteExternoEmail: data.assinante_externo_email,
        assinanteExternoDocumento: data.assinante_externo_documento,
        assinadoExternamenteEm: data.assinado_externamente_em ? new Date(data.assinado_externamente_em) : undefined,
        tokenAssinaturaExterna: data.token_assinatura_externa,
        tokenExpiraEm: data.token_expira_em ? new Date(data.token_expira_em) : undefined,
        dadosAssinaturaExterna: data.dados_assinatura_externa as DadosAssinaturaSimples,
        criadoEm: new Date(data.criado_em),
        atualizadoEm: new Date(data.atualizado_em),
        criadoPor: data.criado_por,
      };

      setContrato(contratoFormatted);
    } catch (error) {
      console.error('Erro ao buscar contrato:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Contrato não encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white print:p-0">
      <h1 className="text-3xl font-bold text-center mb-8">{contrato.titulo}</h1>

      <div className="mb-4">
        <p className="text-gray-700">
          <strong>Número do Contrato:</strong> {contrato.numeroContrato}
        </p>
        <p className="text-gray-700">
          <strong>Status:</strong> {contrato.status}
        </p>
        <p className="text-gray-700">
          <strong>Criado em:</strong> {format(new Date(contrato.criadoEm), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Assinatura Interna</h2>
        {contrato.dadosAssinaturaInterna ? (
          <>
            <p className="text-gray-700">
              <strong>Nome:</strong> {contrato.assinanteInternoNome}
            </p>
            <p className="text-gray-700">
              <strong>Email:</strong> {contrato.assinanteInternoEmail}
            </p>
            <p className="text-gray-700">
              <strong>Assinado em:</strong> {contrato.assinadoInternamenteEm ? format(contrato.assinadoInternamenteEm, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Não assinado'}
            </p>
          </>
        ) : (
          <p className="text-gray-700">Não assinado internamente</p>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Assinatura Externa</h2>
        {contrato.dadosAssinaturaExterna ? (
          <>
            <p className="text-gray-700">
              <strong>Nome:</strong> {contrato.assinanteExternoNome}
            </p>
            <p className="text-gray-700">
              <strong>Email:</strong> {contrato.assinanteExternoEmail}
            </p>
            <p className="text-gray-700">
              <strong>Assinado em:</strong> {contrato.assinadoExternamenteEm ? format(contrato.assinadoExternamenteEm, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Não assinado'}
            </p>
          </>
        ) : (
          <p className="text-gray-700">Não assinado externamente</p>
        )}
      </div>

      <div className="text-gray-800 leading-relaxed whitespace-pre-line">
        {contrato.conteudo}
      </div>
    </div>
  );
};

export default PrintableContratoPage;
