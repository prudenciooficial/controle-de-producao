/*
 * Página de Impressão de Laudo de Qualidade
 * 
 * IMPLEMENTADO:
 * ✅ Interface de impressão com paper timbrado
 * ✅ Botões de imprimir (window.print()) e fechar
 * ✅ Assinatura da Vivian incluída
 * ✅ Layout compatível com A4
 * ✅ Dados mockados para demonstração
 * 
 * TODO: Conectar com dados reais do banco quando tabelas estiverem configuradas
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, Printer, X } from 'lucide-react';
import './print-laudo.css';

// Tipos para o laudo
interface Laudo {
  id: string;
  numero_laudo: number;
  marca_produto: string;
  gramatura: string;
  data_fabricacao: string;
  data_validade: string;
  lote_producao: string;
  responsavel_liberacao: string;
  resultado_geral: 'aprovado' | 'reprovado';
  observacoes: string;
  coleta_id: string;
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

const PrintableLaudoPage = () => {
  const { laudoId } = useParams();
  const [laudo, setLaudo] = useState<Laudo | null>(null);
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [loading, setLoading] = useState(true);

  // Campos editáveis
  const [observacoes, setObservacoes] = useState('São realizadas análises do produto acabado em laboratórios terceirizados de acordo com o plano de amostragem interno da Indústria de Alimentos Ser Bem Ltda., atendendo os respectivos dispositivos legais:');
  const [parecer, setParecer] = useState<'aprovado' | 'reprovado'>('aprovado');

  useEffect(() => {
    const fetchLaudoData = async () => {
      if (!laudoId) return;
      
      try {
        // Por enquanto, usar dados mockados para demonstrar a funcionalidade
        // TODO: Implementar busca real no banco quando as tabelas estiverem corretas
        const mockLaudo: Laudo = {
          id: laudoId,
          numero_laudo: 175,
          marca_produto: 'MASSA PRONTA PARA TAPIOCA NOSSA GOMA',
          gramatura: '1Kg',
          data_fabricacao: '2025-06-26',
          data_validade: '2025-12-26',
          lote_producao: '175',
          responsavel_liberacao: 'Vivian da Costa Patrício da Silva',
          resultado_geral: 'aprovado',
          observacoes: '',
          coleta_id: 'mock-coleta-id'
        };

        const mockAnalises: Analise[] = [
          {
            id: '1',
            numero_amostra: 1,
            umidade: 42.5,
            ph: 4.06,
            aspecto: 'Conforme',
            cor: 'Conforme',
            odor: 'Conforme',
            sabor: 'Conforme',
            embalagem: 'Conforme',
            coleta_id: 'mock-coleta-id'
          },
          {
            id: '2',
            numero_amostra: 2,
            umidade: 43.2,
            ph: 4.15,
            aspecto: 'Conforme',
            cor: 'Conforme',
            odor: 'Conforme',
            sabor: 'Conforme',
            embalagem: 'Conforme',
            coleta_id: 'mock-coleta-id'
          }
        ];
        
        setLaudo(mockLaudo);
        setAnalises(mockAnalises);
        
      } catch (error) {
        console.error("Erro geral:", error);
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
  
  if (!laudo) {
    return (
      <div className="p-8 text-center text-red-500">
        Laudo não encontrado.
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
    <div id="laudo-print-area">
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
      <div className="laudo-a4">
        {/* Marca d'água */}
        <div className="laudo-watermark">INDÚSTRIA DE ALIMENTOS SER BEM LTDA.</div>
        
        {/* Wrapper do conteúdo para não sobrepor o cabeçalho do papel timbrado */}
        <div className="laudo-content-wrapper">
          {/* Título do laudo */}
          <div className="laudo-title">
            LAUDO DE ANÁLISE DE PRODUTO ACABADO Nº {laudo.numero_laudo}
          </div>
          
          {/* Seção de Identificação */}
          <div className="laudo-section-title">
            IDENTIFICAÇÃO
          </div>
          
          {/* Tabela de identificação */}
          <table className="laudo-table-id">
            <tbody>
              <tr>
                <td><strong>DATA DA ANÁLISE:</strong> {new Date().toLocaleDateString('pt-BR')}</td>
                <td><strong>LOTE:</strong> {laudo.lote_producao}</td>
              </tr>
              <tr>
                <td><strong>PRODUTO ACABADO:</strong> {laudo.marca_produto}</td>
                <td><strong>APRESENTAÇÃO:</strong> {laudo.gramatura}</td>
              </tr>
              <tr>
                <td><strong>FABRICAÇÃO:</strong> {new Date(laudo.data_fabricacao).toLocaleDateString('pt-BR')}</td>
                <td><strong>VALIDADE:</strong> {new Date(laudo.data_validade).toLocaleDateString('pt-BR')}</td>
              </tr>
            </tbody>
          </table>
          
          {/* Tabela de parâmetros */}
          <table className="laudo-table-param">
            <thead>
              <tr>
                <th>PARÂMETROS</th>
                <th>ESPECIFICAÇÃO</th>
                <th>RESULTADOS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Ensaios Organolépticos</strong><br />
                  Aspecto<br />
                  Cor<br />
                  Odor<br />
                  Sabor
                </td>
                <td>
                  Fino<br />
                  Branco<br />
                  Característico<br />
                  Peculiar
                </td>
                <td>
                  {aspectoMaisComum('aspecto')}<br />
                  {aspectoMaisComum('cor')}<br />
                  {aspectoMaisComum('odor')}<br />
                  {aspectoMaisComum('sabor')}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Ensaios Físico-Químicos</strong><br />
                  Umidade<br />
                  pH
                </td>
                <td>
                  40-45%<br />
                  3,5 — 5,5
                </td>
                <td>
                  {mediaUmidade}%<br />
                  {mediaPh}
                </td>
              </tr>
            </tbody>
          </table>
          
          {/* Parecer */}
          <div className="laudo-parecer-area">
            <div className="laudo-parecer-label">Parecer</div>
            <label className={`laudo-checkbox-label ${parecer === 'aprovado' ? 'checked' : ''}`}>
              <input 
                type="radio" 
                name="parecer" 
                value="aprovado" 
                checked={parecer === 'aprovado'} 
                onChange={() => setParecer('aprovado')}
                style={{ marginRight: '8px' }}
              /> 
              Aprovado
            </label>
            <label className={`laudo-checkbox-label ${parecer === 'reprovado' ? 'checked' : ''}`}>
              <input 
                type="radio" 
                name="parecer" 
                value="reprovado" 
                checked={parecer === 'reprovado'} 
                onChange={() => setParecer('reprovado')}
                style={{ marginRight: '8px' }}
              /> 
              Reprovado
            </label>
            <div className="laudo-parecer-data">
              Data: {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
          
          {/* Observações */}
          <div className="laudo-observacoes-area">
            <div className="laudo-observacoes-label">Observações:</div>
            <textarea 
              value={observacoes} 
              onChange={e => setObservacoes(e.target.value)} 
              className="laudo-textarea-observacoes" 
              rows={4} 
              placeholder="Observações sobre o laudo..."
            />
            <div className="laudo-observacoes-legislacao">
              <p>RDC nº 724 de 01/07/2022.</p>
              <p>Instrução Normativa nº 161 de 01/07/2022.</p>
              <p>RDC nº 623 de 09/03/2022.</p>
              <p>RDC Nº 722, de 01/07/2022.</p>
              <p>Instrução Normativa Nº 23 DE 14/12/2005 — MAPA.</p>
            </div>
          </div>
          
          {/* Assinatura */}
          <div className="laudo-assinatura-area">
            <img 
              src="/images/ass_vivian.png" 
              alt="Assinatura Vivian" 
              style={{ 
                width: '260px', 
                height: 'auto', 
                marginBottom: '4px',
                maxHeight: '80px',
                objectFit: 'contain'
              }}
            />
            <div className="laudo-assinatura-label">
              Vivian da Costa Patrício da Silva<br />
              Engenheira de Alimentos - CRQ/CE 10300432
            </div>
          </div>
        </div>
        
        {/* Rodapé - fora do wrapper para ficar no final da página */}
        <div className="laudo-footer">
          <div>Código: CQNG-LCQ</div>
          <div>Revisão:06</div>
          <div>Data de emissão: {new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>
    </div>
  );
};

export default PrintableLaudoPage; 