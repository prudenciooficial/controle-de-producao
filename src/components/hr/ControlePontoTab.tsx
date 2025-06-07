import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Search, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFuncionarios, getFeriados, getConfiguracaoEmpresa, getConfiguracoesEmpresas } from "@/services/hrService";
import { generateControlePontoPDF } from "@/utils/controlePontoPDF";
import type { Funcionario } from "@/types/hr";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';

export function ControlePontoTab() {
  const [funcionariosSelecionados, setFuncionariosSelecionados] = useState<string[]>([]);
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedAno, setSelectedAno] = useState<string>("");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas"); // Filtro de empresa
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: getFuncionarios,
  });

  const { data: configuracao } = useQuery({
    queryKey: ['configuracao-empresa'],
    queryFn: getConfiguracaoEmpresa,
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['configuracoes-empresas'],
    queryFn: getConfiguracoesEmpresas,
  });

  const funcionariosAtivos = funcionarios.filter(f => f.status === 'ativo');
  
  // Filtrar funcionários por empresa selecionada
  const funcionariosFiltrados = funcionariosAtivos.filter(funcionario => {
    const matchSearch = funcionario.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       funcionario.cargo.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchEmpresa = false;
    
    if (filtroEmpresa === "todas") {
      matchEmpresa = true;
    } else if (filtroEmpresa === "sem-empresa") {
      matchEmpresa = !funcionario.empresa_id;
    } else {
      matchEmpresa = funcionario.empresa_id === filtroEmpresa;
    }
    
    return matchSearch && matchEmpresa;
  });

  const meses = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const anos = Array.from({ length: 5 }, (_, i) => {
    const ano = new Date().getFullYear() - 2 + i;
    return { value: ano.toString(), label: ano.toString() };
  });

  const handleSelectFuncionario = (funcionarioId: string, checked: boolean) => {
    if (checked) {
      setFuncionariosSelecionados([...funcionariosSelecionados, funcionarioId]);
    } else {
      setFuncionariosSelecionados(funcionariosSelecionados.filter(id => id !== funcionarioId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setFuncionariosSelecionados(funcionariosFiltrados.map(f => f.id));
    } else {
      setFuncionariosSelecionados([]);
    }
  };

  const handleGerar = () => {
    if (funcionariosSelecionados.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione pelo menos um funcionário",
      });
      return;
    }

    if (!selectedMes || !selectedAno) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione o período (mês e ano)",
      });
      return;
    }

    // Verificar se todos os funcionários selecionados têm empresa vinculada
    const funcionariosSemEmpresa = funcionarios.filter(f => 
      funcionariosSelecionados.includes(f.id) && !f.empresa_id
    );

    if (funcionariosSemEmpresa.length > 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Os seguintes funcionários não têm empresa vinculada: ${funcionariosSemEmpresa.map(f => f.nome_completo).join(', ')}. Edite-os para vincular uma empresa.`,
      });
      return;
    }

    // Navegar para a página de impressão - cada funcionário usará sua própria empresa
    const funcionarioIds = funcionariosSelecionados.join(',');
    const url = `/print/folha-ponto?funcionarios=${funcionarioIds}&mes=${selectedMes}&ano=${selectedAno}&modo=auto`;
    
    // Abrir em nova aba para impressão
    window.open(url, '_blank');
  };

  // Contar funcionários por empresa no filtro atual
  const contarFuncionariosPorEmpresa = () => {
    const contadores: {[key: string]: number} = {};
    funcionariosAtivos.forEach(f => {
      if (f.empresa_id) {
        contadores[f.empresa_id] = (contadores[f.empresa_id] || 0) + 1;
      } else {
        contadores['sem-empresa'] = (contadores['sem-empresa'] || 0) + 1;
      }
    });
    return contadores;
  };

  const contadorEmpresas = contarFuncionariosPorEmpresa();

  return (
    <div className="space-y-6">
      {/* Configurações de Período */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Período</CardTitle>
          <CardDescription>
            Selecione o período para gerar as folhas de controle de ponto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mes">Mês</Label>
              <Select value={selectedMes} onValueChange={setSelectedMes}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ano">Ano</Label>
              <Select value={selectedAno} onValueChange={setSelectedAno}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((ano) => (
                    <SelectItem key={ano.value} value={ano.value}>
                      {ano.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtro e Seleção de Funcionários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Seleção de Funcionários
            {funcionariosSelecionados.length > 0 && (
              <Badge variant="secondary">
                {funcionariosSelecionados.length} selecionado(s)
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Filtre por empresa e selecione os funcionários para gerar as folhas de controle de ponto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="space-y-2 w-full sm:w-auto">
              <Label htmlFor="filtro-empresa">Filtrar por Empresa</Label>
              <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">
                    Todas as Empresas ({funcionariosAtivos.length})
                  </SelectItem>
                  {empresas.filter(empresa => empresa.ativa).map((empresa) => {
                    const count = contadorEmpresas[empresa.id] || 0;
                    return (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome_empresa} ({count})
                      </SelectItem>
                    );
                  })}
                  {contadorEmpresas['sem-empresa'] > 0 && (
                    <SelectItem value="sem-empresa">
                      Sem Empresa Vinculada ({contadorEmpresas['sem-empresa']})
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionários por nome ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Seleção rápida */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={
                funcionariosFiltrados.length > 0 && 
                funcionariosFiltrados.every(f => funcionariosSelecionados.includes(f.id))
              }
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all" className="text-sm font-medium">
              Selecionar Todos os Filtrados ({funcionariosFiltrados.length})
            </Label>
          </div>

          {/* Lista de funcionários */}
          <div className="max-h-[300px] overflow-y-auto border rounded-md p-2">
            <div className="space-y-2">
              {funcionariosFiltrados.map((funcionario) => (
                <div
                  key={funcionario.id}
                  className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50"
                >
                  <Checkbox
                    id={funcionario.id}
                    checked={funcionariosSelecionados.includes(funcionario.id)}
                    onCheckedChange={(checked) => 
                      handleSelectFuncionario(funcionario.id, !!checked)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={funcionario.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {funcionario.nome_completo}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {funcionario.cargo} • Jornada: {funcionario.jornada?.nome || 'Não definida'}
                      {funcionario.empresa && (
                        <> • Empresa: {funcionario.empresa.nome_empresa}</>
                      )}
                      {!funcionario.empresa_id && (
                        <span className="text-orange-600"> • ⚠️ Sem empresa vinculada</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {funcionario.empresa && (
                      <Badge variant="secondary" className="text-xs">
                        {funcionario.empresa.nome_empresa}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {funcionariosFiltrados.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm || filtroEmpresa !== "todas" 
                ? "Nenhum funcionário encontrado com os filtros aplicados" 
                : "Nenhum funcionário ativo cadastrado"
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão de Gerar */}
      <div className="flex justify-center">
        <Button 
          onClick={handleGerar} 
          disabled={isGenerating || funcionariosSelecionados.length === 0 || !selectedMes || !selectedAno}
          size="lg"
          className="w-full sm:w-auto sm:min-w-[250px]"
        >
          {isGenerating ? (
            <>Gerando...</>
          ) : (
            <>
              <FileText className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">
                Gerar {funcionariosSelecionados.length > 0 && `${funcionariosSelecionados.length} `}
                Folha{funcionariosSelecionados.length !== 1 ? 's' : ''} de Ponto
              </span>
              <span className="sm:hidden">
                Gerar {funcionariosSelecionados.length > 0 && `(${funcionariosSelecionados.length}) `}
                Folhas
              </span>
            </>
          )}
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground px-4">
        <p>As folhas serão geradas automaticamente com os dados da empresa vinculada a cada funcionário.</p>
        {funcionariosSelecionados.length > 1 && (
          <>
            <br />
            <span className="text-primary font-medium">
              Serão gerados {funcionariosSelecionados.length} arquivos PDF, cada um com os dados da empresa do respectivo funcionário.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
