/*
 * Página de Impressão de Laudo de Qualidade
 * 
 * IMPLEMENTADO:
 * ✅ Interface de impressão com paper timbrado
 * ✅ Botões de imprimir (window.print()) e fechar
 * ✅ Assinatura da Vivian incluída
 * ✅ Layout compatível com A4
 * ✅ Dados reais do banco de dados
 * 
 * ATUALIZADO: Conecta com dados reais do Supabase
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, Printer, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import './print-laudo.css';

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

const PrintableLaudoPage = () => {
  const { laudoId } = useParams();
  const [laudo, setLaudo] = useState<Laudo | null>(null);
  const [coleta, setColeta] = useState<Coleta | null>(null);
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responsavel, setResponsavel] = useState<ResponsavelTecnico | null>(null);

  useEffect(() => {
    const fetchLaudoData = async () => {
      if (!laudoId) {
        setError('ID do laudo não fornecido');
        setLoading(false);
        return;
      }
      
      try {
        // Buscar o laudo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: laudoData, error: laudoError } = await (supabase as any)
          .from('laudos_liberacao')
          .select('*')
          .eq('id', laudoId)
          .single();

        if (laudoError) {
          console.error('Erro ao buscar laudo:', laudoError);
          setError('Laudo não encontrado');
          setLoading(false);
          return;
        }

        setLaudo(laudoData);

        // Buscar a coleta relacionada
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: coletaData, error: coletaError } = await (supabase as any)
          .from('coletas_amostras')
          .select('*')
          .eq('id', laudoData.coleta_id)
          .single();

        if (coletaError) {
          console.error('Erro ao buscar coleta:', coletaError);
          setError('Coleta não encontrada');
          setLoading(false);
          return;
        }

        setColeta(coletaData);

        // Buscar análises da coleta
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: analisesData, error: analisesError } = await (supabase as any)
          .from('analises_amostras')
          .select('*')
          .eq('coleta_id', laudoData.coleta_id)
          .order('numero_amostra');

        if (analisesError) {
          console.error('Erro ao buscar análises:', analisesError);
          setError('Análises não encontradas');
          setLoading(false);
          return;
        }

        setAnalises(analisesData || []);
        
        // Buscar responsável técnico pelo nome salvo no laudo
        if (laudoData.responsavel_liberacao) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: respData, error: respError } = await (supabase as any)
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
  }, [laudoId]);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin mr-2" /> 
        Carregando Laudo...
      </div>
    );
  }
  
  if (error || !laudo || !coleta) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-xl font-bold mb-2">Erro ao carregar laudo</h2>
        <p>{error || 'Laudo não encontrado.'}</p>
        <button 
          onClick={handleClose}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Fechar
        </button>
      </div>
    );
  }

  const mediaUmidade = analises.length > 0 ? 
    (analises.map(a => a.umidade).reduce((a, b) => a + b, 0) / analises.length).toFixed(1) : '-';
  const mediaPh = analises.length > 0 ? 
    (analises.map(a => a.ph).reduce((a, b) => a + b, 0) / analises.length).toFixed(2) : '-';
  
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

  return (
    <div id="laudo-print-area" style={{ color: '#111', background: '#fff' }}>
      {/* Botões de controle - só aparecem na tela */}
      <div className="no-print absolute top-4 right-4 flex gap-2 z-50">
        <button 
          onClick={handlePrint} 
          className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        >
          <Printer size={20} />
        </button>
        <button 
          onClick={handleClose} 
          className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
        >
          <X size={20} />
        </button>
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
          {/* Tabela de identificação */}
          <table className="laudo-table-id" style={{ fontSize: '9pt', marginBottom: 8 }}>
            <tbody>
              <tr>
                <td><strong>DATA DA ANÁLISE:</strong> {laudo.created_at ? new Date(laudo.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                <td><strong>LOTE:</strong> {coleta.lote_producao}</td>
              </tr>
              <tr>
                <td><strong>PRODUTO ACABADO:</strong> {laudo.marca_produto}</td>
              </tr>
              <tr>
                <td><strong>FABRICAÇÃO:</strong> {new Date(laudo.data_fabricacao).toLocaleDateString('pt-BR')}</td>
                <td><strong>VALIDADE:</strong> {new Date(laudo.data_validade).toLocaleDateString('pt-BR')}</td>
              </tr>
            </tbody>
          </table>
          {/* Tabela de parâmetros */}
          <table className="laudo-table-param" style={{ fontSize: '9pt', marginBottom: 8 }}>
            <thead>
              <tr>
                <th>PARÂMETRO</th>
                <th>ESPECIFICAÇÃO</th>
                <th>RESULTADO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'left', background: '#f1f5f9' }}>Ensaios Organolépticos</td>
              </tr>
              <tr>
                <td>Aspecto</td>
                <td>Fino</td>
                <td>{aspectoMaisComum('aspecto')}</td>
              </tr>
              <tr>
                <td>Cor</td>
                <td>Branco</td>
                <td>{aspectoMaisComum('cor')}</td>
              </tr>
              <tr>
                <td>Odor</td>
                <td>Característico</td>
                <td>{aspectoMaisComum('odor')}</td>
              </tr>
              <tr>
                <td>Sabor</td>
                <td>Peculiar</td>
                <td>{aspectoMaisComum('sabor')}</td>
              </tr>
              <tr>
                <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'left', background: '#f1f5f9' }}>Ensaios Físico-Químicos</td>
              </tr>
              <tr>
                <td>Umidade</td>
                <td>40-45%</td>
                <td>{mediaUmidade}%</td>
              </tr>
              <tr>
                <td>pH</td>
                <td>3,5 — 5,5</td>
                <td>{mediaPh}</td>
              </tr>
            </tbody>
          </table>
          {/* Parecer */}
          <div className="laudo-parecer-area" style={{ gap: 0, fontSize: '9pt', marginBottom: 4 }}>
            <div className="laudo-parecer-label">Parecer:</div>
            <span style={{ fontWeight: 600, color: laudo.resultado_geral === 'aprovado' ? '#16a34a' : '#dc2626', marginLeft: 8 }}>
              {laudo.resultado_geral === 'aprovado' ? 'Aprovado' : 'Reprovado'}
            </span>
            <div className="laudo-parecer-data" style={{ marginLeft: 'auto' }}>
              Data do Parecer: {laudo.created_at ? new Date(laudo.created_at).toLocaleDateString('pt-BR') : '-'}
            </div>
          </div>
          {/* Observações */}
          <div className="laudo-observacoes-area" style={{ fontSize: '9pt', marginBottom: 8 }}>
            <div className="laudo-observacoes-label">Observações:</div>
            <div className="laudo-observacoes-text" style={{ fontSize: '9pt', color: '#1e293b', marginBottom: 4 }}>
              {laudo.observacoes}
            </div>
            <div className="laudo-observacoes-legislacao" style={{ fontSize: '8pt', marginBottom: 8 }}>
              <p>RDC nº 724 de 01/07/2022.</p>
              <p>Instrução Normativa nº 161 de 01/07/2022.</p>
              <p>RDC nº 623 de 09/03/2022.</p>
              <p>RDC Nº 722, de 01/07/2022.</p>
              <p>Instrução Normativa Nº 23 DE 14/12/2005 — MAPA.</p>
            </div>
            {/* Informações de código, revisão e data de emissão */}
            <div className="laudo-infos-final" style={{ fontSize: '8pt', color: '#64748b', marginTop: 8, textAlign: 'left' }}>
              <div>Código: CQNG-LCQ</div>
              <div>Revisão: {laudo.revisao || '7'}</div>
              <div>Data de emissão da revisão: {new Date(laudo.data_emissao).toLocaleDateString('pt-BR')}</div>
              <div>Data de emissão do laudo: {laudo.created_at ? new Date(laudo.created_at).toLocaleDateString('pt-BR') : '-'}</div>
            </div>
          </div>
          {/* Assinatura */}
          <div className="laudo-assinatura-area" style={{ marginTop: 16 }}>
            {responsavel?.assinatura_url && (
              <img
                src={responsavel.assinatura_url}
                alt={`Assinatura de ${responsavel.nome}`}
                style={{ width: '180px', height: 'auto', marginBottom: '2px', maxHeight: '50px', objectFit: 'contain' }}
              />
            )}
            <div className="laudo-assinatura-label" style={{ fontSize: '9pt', color: '#334155', textAlign: 'right', lineHeight: 1.2 }}>
              {responsavel?.nome}<br />
              {responsavel?.funcao}{responsavel?.carteira_tecnica ? ` - ${responsavel.carteira_tecnica}` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableLaudoPage; 