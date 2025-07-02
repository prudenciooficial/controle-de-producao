import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFuncionarios, getFeriados, getConfiguracaoEmpresa, getConfiguracoesEmpresas } from '@/services/hrService';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Funcionario, Feriado, ConfiguracaoEmpresa } from '@/types/hr';
import './folha-ponto.css';

interface FolhaPontoData {
  funcionario: Funcionario;
  mes: number;
  ano: number;
  feriados: Feriado[];
  configuracao_empresa: ConfiguracaoEmpresa;
}

const mesesNomes = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

// Definir tipo auxiliar para jornada
interface JornadaParcial { horarios_estruturados?: Record<string, any> }

export function FolhaPontoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [folhasData, setFolhasData] = useState<FolhaPontoData[]>([]);
  
  const funcionarioIds = useMemo(() => searchParams.get('funcionarios')?.split(',') || [], [searchParams]);
  const mes = parseInt(searchParams.get('mes') || '0');
  const ano = parseInt(searchParams.get('ano') || '0');
  const empresaId = searchParams.get('empresa') || '';
  const modo = searchParams.get('modo') || 'manual'; // 'auto' ou 'manual'

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: getFuncionarios,
  });

  const { data: feriados = [] } = useQuery({
    queryKey: ['feriados'],
    queryFn: () => getFeriados(),
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['configuracoes-empresas'],
    queryFn: getConfiguracoesEmpresas,
  });

  useEffect(() => {
    if (funcionarios.length && empresas.length && funcionarioIds.length) {
      const funcionariosSelecionados = funcionarios.filter(f => 
        funcionarioIds.includes(f.id)
      );
      
      const dadosFolhas: FolhaPontoData[] = [];
      
      funcionariosSelecionados.forEach(funcionario => {
        let empresaParaUsar: ConfiguracaoEmpresa | undefined;
        
        if (modo === 'auto') {
          empresaParaUsar = empresas.find(e => e.id === funcionario.empresa_id);
          if (!empresaParaUsar) {
            console.warn(`Funcionário ${funcionario.nome_completo} não tem empresa vinculada ou empresa não encontrada`);
            return;
          }
        } else {
          empresaParaUsar = empresas.find(e => e.id === empresaId);
          if (!empresaParaUsar) {
            empresaParaUsar = empresas.find(e => e.ativa);
          }
          if (!empresaParaUsar) {
            console.warn('Nenhuma empresa disponível para o funcionário');
            return;
          }
        }
        dadosFolhas.push({
          funcionario,
          mes,
          ano,
          feriados,
          configuracao_empresa: empresaParaUsar,
        });
      });
      setFolhasData(dadosFolhas);
    }
  }, [funcionarios, empresas, feriados, funcionarioIds, mes, ano, empresaId, modo]);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  const getDiasDoMes = (mes: number, ano: number) => {
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const dias = [];
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(ano, mes - 1, dia);
      const diaSemana = data.getDay();
      
      // Normalizar a data para comparação
      const dataFormatada = data.toISOString().split('T')[0];
      
      const feriado = feriados.find(f => {
        try {
          let feriadoData;
          if (f.data instanceof Date) {
            feriadoData = f.data.toISOString().split('T')[0];
          } else {
            feriadoData = new Date(f.data).toISOString().split('T')[0];
          }
          
          // Comparar data completa (ano-mês-dia)
          return feriadoData === dataFormatada;
        } catch (error) {
          return false;
        }
      });
      
      dias.push({
        dia,
        diaSemana,
        data: dataFormatada,
        feriado: feriado?.nome,
        isFeriado: !!feriado,
        isDomingo: diaSemana === 0,
        isSabado: diaSemana === 6,
      });
    }
    
    return dias;
  };

  const formatarPeriodo = (mes: number, ano: number) => {
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);
    return `${primeiroDia.toLocaleDateString('pt-BR')} a ${ultimoDia.toLocaleDateString('pt-BR')}`;
  };

  const getHorarioJornada = (jornada: unknown) => {
    if (!jornada || typeof jornada !== 'object' || !(jornada as JornadaParcial).horarios_estruturados) return 'Não definido';
    const horarios = (jornada as JornadaParcial).horarios_estruturados!;
    const diasUteis = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
    const horarioSegunda = horarios.segunda;
    if (horarioSegunda?.entrada1 && horarioSegunda?.saida1) {
      let horarioTexto = `SEGUNDA A `;
      const sabado = horarios.sabado;
      if (sabado?.entrada1) {
        horarioTexto += `SÁBADO ${horarioSegunda.entrada1} ÀS ${horarioSegunda.saida1}`;
        if (horarioSegunda.entrada2 && horarioSegunda.saida2) {
          horarioTexto += ` / ${horarioSegunda.entrada2} ÀS ${horarioSegunda.saida2}`;
        }
      } else {
        horarioTexto += `SEXTA ${horarioSegunda.entrada1} ÀS ${horarioSegunda.saida1}`;
        if (horarioSegunda.entrada2 && horarioSegunda.saida2) {
          horarioTexto += ` / ${horarioSegunda.entrada2} ÀS ${horarioSegunda.saida2}`;
        }
      }
      return horarioTexto;
    }
    return 'Não definido';
  };

  const getHorarioAlmoco = (jornada: unknown, diaSemana: number) => {
    if (!jornada || typeof jornada !== 'object' || !(jornada as JornadaParcial).horarios_estruturados) {
      return { saida: '', retorno: '' };
    }
    const diasNomes = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const nomesDia = diasNomes[diaSemana];
    const horarios = (jornada as JornadaParcial).horarios_estruturados!;
    const horarioDia = horarios[nomesDia];
    if (!horarioDia?.entrada1 || !horarioDia?.saida1) {
      return { saida: '', retorno: '' };
    }
    if (horarioDia.entrada2 && horarioDia.saida2) {
      return {
        saida: horarioDia.saida1,
        retorno: horarioDia.entrada2
      };
    }
    return { saida: '', retorno: '' };
  };

  const trabalhaNoSabado = (jornada: unknown) => {
    if (!jornada || typeof jornada !== 'object' || !(jornada as JornadaParcial).horarios_estruturados) return false;
    const horarios = (jornada as JornadaParcial).horarios_estruturados!;
    const sabado = horarios.sabado;
    return !!(sabado?.entrada1 && sabado?.saida1);
  };

  const getSetorFuncionario = (funcionario: Funcionario) => {
    // Usar o setor diretamente do banco de dados
    return funcionario.setor || 'Produção';
  };

  if (!folhasData.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Carregando folhas de ponto...</h2>
          <p className="text-muted-foreground">Preparando documentos para impressão</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Controles de impressão - só aparecem na tela */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" onClick={handleClose}>
          <X className="h-4 w-4 mr-2" />
          Fechar
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Container das folhas */}
      <div id="print-area" className="print-container">
        {folhasData.map((data, index) => {
          const dias = getDiasDoMes(data.mes, data.ano);
          
          return (
            <div key={data.funcionario.id} className="folha-ponto">
              {/* Cabeçalho centralizado */}
              <div className="cabecalho-principal">
                <h1>CONTROLE DE FREQUÊNCIA</h1>
              </div>

              {/* Informações da empresa */}
              <div className="info-empresa">
                <div className="linha-info">
                  <span className="label">EMPREGADOR:</span>
                  <span className="valor">{data.configuracao_empresa.nome_empresa}</span>
                  <span className="cnpj">CNPJ: {data.configuracao_empresa.cnpj}</span>
                </div>
                <div className="endereco">
                  ENDEREÇO: {data.configuracao_empresa.endereco}
                </div>
              </div>

              {/* Período e horário */}
              <div className="info-periodo">
                <div className="linha-periodo">
                  <span className="label">PERÍODO:</span>
                  <span className="valor">{formatarPeriodo(data.mes, data.ano)}</span>
                </div>
              </div>

              {/* Funcionário */}
              <div className="info-funcionario">
                <div className="linha-funcionario-completa">
                  <span className="label">FUNCIONÁRIO:</span>
                  <span className="nome-funcionario">{data.funcionario.nome_completo}</span>
                  <span className="separador">|</span>
                  <span className="label">CARGO:</span>
                  <span className="cargo-funcionario">{data.funcionario.cargo}</span>
                  <span className="separador">|</span>
                  <span className="label">SETOR:</span>
                  <span className="setor-funcionario">{getSetorFuncionario(data.funcionario)}</span>
                </div>
                <div className="mes-ano-direita">
                  {mesesNomes[data.mes]}, {data.ano}
                </div>
              </div>

              {/* Tabela principal */}
              <table className="tabela-ponto">
                <thead>
                  <tr>
                    <th rowSpan={2} className="col-dia">DIA</th>
                    <th rowSpan={2} className="col-entrada">ENTRADA</th>
                    <th colSpan={2} className="header-almoco">ALMOÇO</th>
                    <th rowSpan={2} className="col-saida">SAÍDA</th>
                    <th colSpan={2} className="header-extras">EXTRAS</th>
                    <th rowSpan={2} className="col-assinatura">ASSINATURA</th>
                  </tr>
                  <tr>
                    <th className="sub-header col-saida-almoco">SAÍDA</th>
                    <th className="sub-header col-retorno-almoco">RETORNO</th>
                    <th className="sub-header col-entrada-extra">ENTRADA</th>
                    <th className="sub-header col-saida-extra">SAÍDA</th>
                  </tr>
                </thead>
                <tbody>
                  {dias.map((diaInfo) => {
                    // Se for administrativo, sábado é sempre não-util (escuro)
                    const isAdministrativo = data.funcionario.setor === 'Administrativo';
                    const trabalhaNoSab = !isAdministrativo && trabalhaNoSabado(data.funcionario.jornada);
                    const isNaoUtil = diaInfo.isDomingo || diaInfo.isFeriado || (diaInfo.isSabado && (!trabalhaNoSab || isAdministrativo));
                    const horarioAlmoco = getHorarioAlmoco(data.funcionario.jornada, diaInfo.diaSemana);
                    
                    return (
                      <tr 
                        key={diaInfo.dia}
                        className={`
                          ${diaInfo.isDomingo ? 'linha-domingo' : ''}
                          ${(diaInfo.isSabado && !trabalhaNoSab) ? 'linha-sabado' : ''}
                          ${diaInfo.isFeriado ? 'linha-feriado' : ''}
                          ${isNaoUtil ? 'linha-nao-util' : ''}
                        `}
                      >
                        <td className="dia-numero">
                          <div className="dia-container">
                            <span className="numero">{diaInfo.dia}</span>
                            <span className="dia-semana">{diasSemana[diaInfo.diaSemana]}</span>
                          </div>
                        </td>
                        <td className="celula-hora"></td>
                        <td className="celula-hora">
                          {horarioAlmoco.saida && (
                            <span className="horario-preenchido">{horarioAlmoco.saida}</span>
                          )}
                        </td>
                        <td className="celula-hora">
                          {horarioAlmoco.retorno && (
                            <span className="horario-preenchido">{horarioAlmoco.retorno}</span>
                          )}
                        </td>
                        <td className="celula-hora"></td>
                        <td className="celula-hora"></td>
                        <td className="celula-hora"></td>
                        <td className="celula-assinatura">
                          {diaInfo.isFeriado && (
                            <div className="feriado-texto-destaque">{diaInfo.feriado?.toUpperCase()}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Rodapé com assinatura */}
              <div className="rodape-assinatura">
                <div className="data-local">
                  _______ de {mesesNomes[data.mes].toLowerCase()} de {data.ano}
                </div>
                <div className="linha-assinatura-funcionario">
                  <div className="linha"></div>
                  <div className="texto-assinatura">Assinatura do Empregado</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
