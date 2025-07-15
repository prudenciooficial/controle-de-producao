/*
 * Página de Visualização Pública de Laudo
 * 
 * Esta página permite visualizar laudos através de link único
 * sem necessidade de autenticação
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, Printer, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import '@/pages/print/print-laudo.css';

// Tipos para o laudo
interface Laudo {
  id: string;
  coleta_id: string;
  numero_laudo: number;
  marca_produto: string;
  gramatura: string;
  data_fabricacao: string;
  data_validade: string;
  resultado_geral: 'aprovado' | 'reprovado';
  responsavel_liberacao: string;
  observacoes?: string;
  data_emissao: string;
  created_at: string;
  revisao?: string;
}

interface Coleta {
  id: string;
  lote_producao: string;
  data_coleta: string;
  quantidade_total_produzida: number;
  quantidade_amostras: number;
  responsavel_coleta: string;
  observacoes?: string;
  status: string;
}

interface Analise {
  id: string;
  numero_amostra: number;
  umidade: number;
  ph: number;
  aspecto: string;
  cor: string;
  odor: string;
  sabor: string;
  embalagem: string;
  coleta_id: string;
}

interface ResponsavelTecnico {
  id: string;
  nome: string;
  funcao: string;
  carteira_tecnica: string;
  assinatura_url?: string;
}

export default function LaudoPublicoPage() {
  const { linkPublico } = useParams<{ linkPublico: string }>();
  const [laudo, setLaudo] = useState<Laudo | null>(null);
  const [coleta, setColeta] = useState<Coleta | null>(null);
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [responsavel, setResponsavel] = useState<ResponsavelTecnico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDateToBR = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  useEffect(() => {
    const fetchLaudoData = async () => {
      if (!linkPublico) {
        setError('Link público não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Buscar laudo pelo link público
        const { data: laudoData, error: laudoError } = await supabase
          .from('laudos_liberacao')
          .select('*')
          .eq('link_publico', linkPublico)
          .single();

        if (laudoError) {
          console.error("Erro ao buscar laudo:", laudoError);
          if (laudoError.code === 'PGRST116') {
            setError('Laudo não encontrado ou link inválido');
          } else if (laudoError.code === '42501' || laudoError.message?.includes('permission denied') || laudoError.message?.includes('RLS')) {
            setError('Acesso negado: As políticas de segurança do banco de dados não permitem acesso público aos laudos. Entre em contato com o administrador do sistema para configurar o acesso público.');
          } else {
            setError(`Erro ao buscar laudo: ${laudoError.message || 'Erro desconhecido'}`);
          }
          setLoading(false);
          return;
        }

        setLaudo(laudoData);

        // Buscar dados da coleta
        const { data: coletaData, error: coletaError } = await supabase
          .from('coletas_amostras')
          .select('*')
          .eq('id', laudoData.coleta_id)
          .single();

        if (coletaError) {
          console.error("Erro ao buscar coleta:", coletaError);
        } else {
          setColeta(coletaData);
        }

        // Buscar análises da coleta
        const { data: analisesData, error: analisesError } = await supabase
          .from('analises_amostras')
          .select('*')
          .eq('coleta_id', laudoData.coleta_id)
          .order('numero_amostra');

        if (analisesError) {
          console.error("Erro ao buscar análises:", analisesError);
        } else {
          console.log("Análises carregadas:", analisesData);
          setAnalises(analisesData || []);
        }
        
        // Buscar responsável técnico pelo nome salvo no laudo
        if (laudoData.responsavel_liberacao) {
          const { data: respData, error: respError } = await supabase
            .from('responsaveis_tecnicos')
            .select('*')
            .ilike('nome', laudoData.responsavel_liberacao)
            .single();
          if (!respError && respData) {
            setResponsavel(respData);
          } else {
            setResponsavel(null);
          }
        }
      } catch (error) {
        console.error("Erro geral:", error);
        setError('Erro ao carregar dados do laudo');
      } finally {
        setLoading(false);
      }
    };

    fetchLaudoData();
  }, [linkPublico]);

  const handlePrint = () => {
    window.print();
  };

  // Calcular médias e aspectos mais comuns
  const mediaUmidade = analises.length > 0 ?
    (analises.map(a => a.umidade || 0).reduce((a, b) => a + b, 0) / analises.length).toFixed(1) : '-';
  const mediaPh = analises.length > 0 ?
    (analises.map(a => a.ph || 0).reduce((a, b) => a + b, 0) / analises.length).toFixed(2) : '-';

  const aspectoMaisComum = (campo: keyof Pick<Analise, 'aspecto' | 'cor' | 'odor' | 'sabor'>) => {
    if (analises.length === 0) return 'Conforme';

    const valores = analises.map(a => a[campo]);
    const contador: { [key: string]: number } = {};

    valores.forEach(valor => {
      if (valor) {
        contador[valor] = (contador[valor] || 0) + 1;
      }
    });

    const maisComum = Object.entries(contador)
      .sort(([,a], [,b]) => b - a)[0];

    return maisComum ? maisComum[0] : 'Conforme';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando laudo...</p>
        </div>
      </div>
    );
  }

  if (error || !laudo) {
    const isPermissionError = error?.includes('Acesso negado') || error?.includes('políticas de segurança');

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-2xl mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isPermissionError ? 'Configuração Necessária' : 'Laudo não encontrado'}
          </h1>
          <p className="text-gray-600 mb-4">
            {error || 'O link fornecido não é válido ou o laudo não existe.'}
          </p>

          {isPermissionError && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Para o Administrador do Sistema:</h3>
              <p className="text-blue-800 text-sm mb-2">
                Execute a migração SQL para habilitar acesso público aos laudos:
              </p>
              <ol className="text-blue-800 text-sm list-decimal list-inside space-y-1">
                <li>Acesse o painel do Supabase</li>
                <li>Vá para "SQL Editor"</li>
                <li>Execute o arquivo: <code className="bg-blue-100 px-1 rounded">supabase/migrations/add_public_access_policies.sql</code></li>
              </ol>
            </div>
          )}

          <p className="text-sm text-gray-500">
            {isPermissionError
              ? 'Após a configuração, este link funcionará normalmente.'
              : 'Verifique se o link está correto ou entre em contato com quem compartilhou este laudo.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="laudo-print-area" style={{ color: '#111', background: '#fff' }}>
      {/* Botão de impressão - só aparece na tela */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button 
          onClick={handlePrint} 
          className="bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          title="Imprimir laudo"
        >
          <Printer size={24} />
        </button>
      </div>

      {/* Banner de acesso público */}
      <div className="no-print bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-blue-400 mr-2" />
          <div>
            <p className="text-sm text-blue-700">
              <strong>Laudo Público Verificado</strong> - Este é um laudo oficial da Indústria de Alimentos Ser Bem Ltda.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Laudo Nº {laudo.numero_laudo} • Emitido em {formatDateToBR(laudo.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo do laudo */}
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
        {/* Marca d'água */}
        <div className="laudo-watermark" style={{ position: 'relative', zIndex: 2 }}>INDÚSTRIA DE ALIMENTOS SER BEM LTDA.</div>
        {/* Wrapper do conteúdo para não sobrepor o cabeçalho do papel timbrado */}
        <div className="laudo-content-wrapper" style={{ position: 'absolute', top: '20mm', left: 0, right: 0, width: '100%', fontSize: '10pt', padding: '0 12mm', minHeight: '220mm', color: '#111', background: 'transparent', zIndex: 3 }}>
          {/* Título do laudo */}
          <div className="laudo-title" style={{ fontSize: '1.1em', marginBottom: 8 }}>
            LAUDO DE ANÁLISE DE PRODUTO ACABADO Nº {laudo.numero_laudo}
          </div>
          {/* Seção de Identificação */}
          <div className="laudo-section-title" style={{ fontSize: '1em', marginBottom: 4 }}>
            IDENTIFICAÇÃO
          </div>

          <div className="laudo-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: 12 }}>
            <div className="laudo-info-item">
              <span className="laudo-label">Produto:</span>
              <span className="laudo-value">{laudo.marca_produto}</span>
            </div>
            <div className="laudo-info-item">
              <span className="laudo-label">Gramatura:</span>
              <span className="laudo-value">{laudo.gramatura}</span>
            </div>
            <div className="laudo-info-item">
              <span className="laudo-label">Lote de Produção:</span>
              <span className="laudo-value">{coleta?.lote_producao || '-'}</span>
            </div>
            <div className="laudo-info-item">
              <span className="laudo-label">Data de Fabricação:</span>
              <span className="laudo-value">{formatDateToBR(laudo.data_fabricacao)}</span>
            </div>
            <div className="laudo-info-item">
              <span className="laudo-label">Data de Validade:</span>
              <span className="laudo-value">{formatDateToBR(laudo.data_validade)}</span>
            </div>
            <div className="laudo-info-item">
              <span className="laudo-label">Data da Coleta:</span>
              <span className="laudo-value">{coleta ? formatDateToBR(coleta.data_coleta) : '-'}</span>
            </div>
          </div>

          {/* Seção de Análises */}
          <div className="laudo-section-title" style={{ fontSize: '1em', marginBottom: 4, marginTop: 16 }}>
            RESULTADOS DAS ANÁLISES
          </div>

          {analises.length > 0 ? (
            <div className="laudo-analises" style={{ marginBottom: 12 }}>
              <table className="laudo-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Parâmetro</th>
                    <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Especificação</th>
                    <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'left', background: '#f1f5f9', border: '1px solid #ddd', padding: '6px' }}>Ensaios Organolépticos</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '6px' }}>Aspecto</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Fino</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{aspectoMaisComum('aspecto')}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '6px' }}>Cor</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Branco</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{aspectoMaisComum('cor')}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '6px' }}>Odor</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Característico</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{aspectoMaisComum('odor')}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '6px' }}>Sabor</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Peculiar</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{aspectoMaisComum('sabor')}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'left', background: '#f1f5f9', border: '1px solid #ddd', padding: '6px' }}>Ensaios Físico-Químicos</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '6px' }}>Umidade</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>40-45%</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{mediaUmidade}%</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '6px' }}>pH</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>3,5 — 5,5</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{mediaPh}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: '9pt', fontStyle: 'italic', marginBottom: 12 }}>Nenhuma análise disponível para este laudo.</p>
          )}

          {/* Resultado Geral */}
          <div className="laudo-section-title" style={{ fontSize: '1em', marginBottom: 4, marginTop: 16 }}>
            RESULTADO GERAL
          </div>

          <div className="laudo-resultado" style={{
            padding: '8px',
            backgroundColor: laudo.resultado_geral === 'aprovado' ? '#d4edda' : '#f8d7da',
            border: `1px solid ${laudo.resultado_geral === 'aprovado' ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            marginBottom: 12,
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            {laudo.resultado_geral === 'aprovado' ? (
              <span style={{ color: '#155724' }}>✓ PRODUTO APROVADO</span>
            ) : (
              <span style={{ color: '#721c24' }}>✗ PRODUTO REPROVADO</span>
            )}
          </div>

          {/* Observações */}
          {laudo.observacoes && (
            <>
              <div className="laudo-section-title" style={{ fontSize: '1em', marginBottom: 4, marginTop: 16 }}>
                OBSERVAÇÕES
              </div>
              <div className="laudo-observacoes" style={{ fontSize: '9pt', lineHeight: 1.4, marginBottom: 12 }}>
                {laudo.observacoes}
              </div>
            </>
          )}

          {/* Responsável Técnico */}
          <div className="laudo-section-title" style={{ fontSize: '1em', marginBottom: 4, marginTop: 16 }}>
            RESPONSÁVEL TÉCNICO
          </div>

          <div className="laudo-responsavel" style={{ marginBottom: 12 }}>
            <div className="laudo-info-item" style={{ marginBottom: 4 }}>
              <span className="laudo-label">Nome:</span>
              <span className="laudo-value">{laudo.responsavel_liberacao}</span>
            </div>
            {responsavel && (
              <>
                <div className="laudo-info-item" style={{ marginBottom: 4 }}>
                  <span className="laudo-label">Função:</span>
                  <span className="laudo-value">{responsavel.funcao}</span>
                </div>
                <div className="laudo-info-item" style={{ marginBottom: 4 }}>
                  <span className="laudo-label">Carteira Técnica:</span>
                  <span className="laudo-value">{responsavel.carteira_tecnica}</span>
                </div>
              </>
            )}
          </div>

          {/* Rodapé com informações do laudo */}
          <div className="laudo-footer" style={{
            position: 'absolute',
            bottom: '15mm',
            left: '12mm',
            right: '12mm',
            borderTop: '1px solid #ddd',
            paddingTop: '8px',
            fontSize: '8pt',
            color: '#666'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <strong>Data de Emissão:</strong> {formatDateToBR(laudo.data_emissao)}
              </div>
              <div>
                <strong>Revisão:</strong> {laudo.revisao || '-'}
              </div>
              <div>
                <strong>Data do Laudo:</strong> {formatDateToBR(laudo.created_at)}
              </div>
              <div>
                <strong>Documento Verificado</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para impressão */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }

          @page {
            size: A4;
            margin: 0;
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
        }

        .laudo-label {
          font-weight: bold;
          margin-right: 8px;
        }

        .laudo-value {
          color: #333;
        }

        .laudo-info-item {
          font-size: 9pt;
          line-height: 1.3;
        }

        .laudo-section-title {
          font-weight: bold;
          text-decoration: underline;
          color: #333;
        }

        .laudo-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 48pt;
          color: rgba(0, 0, 0, 0.05);
          font-weight: bold;
          z-index: 2;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
