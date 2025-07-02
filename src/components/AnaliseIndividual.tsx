import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, ArrowLeft, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AnaliseAmostra {
  id?: string;
  coleta_id: string;
  numero_amostra: number;
  umidade?: number;
  ph?: number;
  aspecto?: string;
  cor?: string;
  odor?: string;
  sabor?: string;
  embalagem?: string;
  umidade_conforme?: boolean;
  ph_conforme?: boolean;
  observacoes?: string;
  data_analise?: string;
}

interface Props {
  analises: AnaliseAmostra[];
  coletaId: string;
  onSalvarAnalise: (analise: Partial<AnaliseAmostra>) => void;
  onVoltar: () => void;
}

export default function AnaliseIndividual({ 
  analises, 
  coletaId, 
  onSalvarAnalise, 
  onVoltar
}: Props) {
  const [analiseAtual, setAnaliseAtual] = useState(1);
  const [dadosAnalise, setDadosAnalise] = useState<Partial<AnaliseAmostra>>({});
  const [laudoGerado, setLaudoGerado] = useState(false);

  useEffect(() => {
    const analise = analises.find(a => a.numero_amostra === analiseAtual);
    if (analise) {
      setDadosAnalise(analise);
    } else {
      setDadosAnalise({
        coleta_id: coletaId,
        numero_amostra: analiseAtual
      });
    }
  }, [analiseAtual, analises, coletaId]);

  useEffect(() => {
    if (todasAnalisesPreenchidas() && !laudoGerado) {
      setLaudoGerado(true);
    }
    if (!todasAnalisesPreenchidas() && laudoGerado) {
      setLaudoGerado(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analises]);

  const salvar = () => {
    onSalvarAnalise(dadosAnalise);
  };

  const proximaAmostra = () => {
    if (analiseAtual < analises.length) {
      setAnaliseAtual(analiseAtual + 1);
    }
  };

  const amostraAnterior = () => {
    if (analiseAtual > 1) {
      setAnaliseAtual(analiseAtual - 1);
    }
  };

  const isUmidadeConforme = (umidade?: number) => {
    if (!umidade) return null;
    return umidade >= 40 && umidade <= 45;
  };

  const isPhConforme = (ph?: number) => {
    if (!ph) return null;
    return ph >= 3.6 && ph <= 5.6;
  };

  const ConformeIcon = ({ conforme }: { conforme: boolean | null }) => {
    if (conforme === null) return null;
    return conforme ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const analisePreenchida = (numeroAmostra: number) => {
    const analise = analises.find(a => a.numero_amostra === numeroAmostra);
    return analise && (analise.umidade || analise.ph || analise.aspecto);
  };

  const todasAnalisesPreenchidas = () => {
    return analises.every(analise => 
      analise.umidade && analise.ph && analise.aspecto && 
      analise.cor && analise.odor && analise.sabor && analise.embalagem
    );
  };

  const analisesCompletas = analises.filter(a => analisePreenchida(a.numero_amostra)).length;
  const progresso = (analisesCompletas / analises.length) * 100;

  return (
    <Dialog open={true} onOpenChange={onVoltar}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Análises das Amostras</DialogTitle>
        </DialogHeader>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Análises das Amostras</h2>
              <p className="text-gray-600 mt-1">Amostra {analiseAtual} de {analises.length}</p>
            </div>
            <Button
              onClick={onVoltar}
              variant="ghost"
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Barra de progresso */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progresso das análises</span>
              <span>{analisesCompletas}/{analises.length} completas</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        </div>

        {/* Navegador de amostras */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Selecionar Amostra</h3>
            <div className="flex items-center gap-2">
              <Button
                onClick={amostraAnterior}
                disabled={analiseAtual === 1}
                variant="outline"
                className="p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={proximaAmostra}
                disabled={analiseAtual === analises.length}
                variant="outline"
                className="p-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-13 gap-2">
            {Array.from({ length: analises.length }, (_, index) => {
              const numeroAmostra = index + 1;
              const preenchida = analisePreenchida(numeroAmostra);
              return (
                <Button
                  key={numeroAmostra}
                  onClick={() => setAnaliseAtual(numeroAmostra)}
                  variant={analiseAtual === numeroAmostra ? "default" : preenchida ? "secondary" : "outline"}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all ${analiseAtual === numeroAmostra ? 'shadow-lg' : ''}`}
                >
                  {numeroAmostra}
                  {preenchida && analiseAtual !== numeroAmostra && (
                    <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 text-green-500 bg-white rounded-full" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Formulário da análise - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Parâmetros Físico-Químicos */}
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Parâmetros Físico-Químicos
                </h3>
                <p className="text-blue-700 text-sm mt-1">Medições precisas obrigatórias</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Umidade (%) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Conforme: 40% a 45%</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={dadosAnalise.umidade || ''}
                      onChange={(e) => setDadosAnalise({
                        ...dadosAnalise,
                        umidade: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 42.5"
                    />
                    <div className="w-8 h-8 flex items-center justify-center">
                      <ConformeIcon conforme={isUmidadeConforme(dadosAnalise.umidade)} />
                    </div>
                  </div>
                  {dadosAnalise.umidade && !isUmidadeConforme(dadosAnalise.umidade) && (
                    <p className="text-red-600 text-xs mt-1">⚠️ Valor fora da faixa conforme (40-45%)</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    pH <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Conforme: 3,6 a 5,6</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="14"
                      value={dadosAnalise.ph || ''}
                      onChange={(e) => setDadosAnalise({
                        ...dadosAnalise,
                        ph: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 4.06"
                    />
                    <div className="w-8 h-8 flex items-center justify-center">
                      <ConformeIcon conforme={isPhConforme(dadosAnalise.ph)} />
                    </div>
                  </div>
                  {dadosAnalise.ph && !isPhConforme(dadosAnalise.ph) && (
                    <p className="text-red-600 text-xs mt-1">⚠️ Valor fora da faixa conforme (3,6-5,6)</p>
                  )}
                </div>
              </div>
            </div>

            {/* Parâmetros Organolépticos */}
            <div className="space-y-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Parâmetros Organolépticos
                </h3>
                <p className="text-green-700 text-sm mt-1">Avaliação sensorial</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aspecto <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dadosAnalise.aspecto || ''}
                    onChange={(e) => setDadosAnalise({
                      ...dadosAnalise,
                      aspecto: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Conforme">Conforme</option>
                    <option value="Fino">Fino</option>
                    <option value="Grosso">Grosso</option>
                    <option value="Irregular">Irregular</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dadosAnalise.cor || ''}
                    onChange={(e) => setDadosAnalise({
                      ...dadosAnalise,
                      cor: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Conforme">Conforme</option>
                    <option value="Branco">Branco</option>
                    <option value="Amarelado">Amarelado</option>
                    <option value="Acinzentado">Acinzentado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Odor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dadosAnalise.odor || ''}
                    onChange={(e) => setDadosAnalise({
                      ...dadosAnalise,
                      odor: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Conforme">Conforme</option>
                    <option value="Característico">Característico</option>
                    <option value="Azedo">Azedo</option>
                    <option value="Rançoso">Rançoso</option>
                    <option value="Estranho">Estranho</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sabor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dadosAnalise.sabor || ''}
                    onChange={(e) => setDadosAnalise({
                      ...dadosAnalise,
                      sabor: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Conforme">Conforme</option>
                    <option value="Característico">Característico</option>
                    <option value="Amargo">Amargo</option>
                    <option value="Azedo">Azedo</option>
                    <option value="Estranho">Estranho</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Embalagem <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dadosAnalise.embalagem || ''}
                    onChange={(e) => setDadosAnalise({
                      ...dadosAnalise,
                      embalagem: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="Conforme">Conforme</option>
                    <option value="Íntegra">Íntegra</option>
                    <option value="Danificada">Danificada</option>
                    <option value="Furada">Furada</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="mt-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={dadosAnalise.observacoes || ''}
              onChange={(e) => setDadosAnalise({
                ...dadosAnalise,
                observacoes: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Observações sobre esta amostra..."
            />
          </div>
        </div>

        {/* Footer com ações */}
        <div className="mt-8 flex justify-between items-center bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">
            <strong>{analisesCompletas}</strong> de <strong>{analises.length}</strong> análises completas
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onVoltar}
            >
              Voltar
            </Button>
            <Button
              onClick={salvar}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Análise
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 