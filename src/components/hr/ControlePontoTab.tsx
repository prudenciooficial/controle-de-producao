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
import { getFuncionarios, getFeriados, getConfiguracaoEmpresa } from "@/services/hrService";
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

  const funcionariosAtivos = funcionarios.filter(f => f.status === 'ativo');
  
  const filteredFuncionarios = funcionariosAtivos.filter(funcionario =>
    funcionario.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funcionario.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      setFuncionariosSelecionados(filteredFuncionarios.map(f => f.id));
    } else {
      setFuncionariosSelecionados([]);
    }
  };

  const handleGerar = () => {
    if (funcionariosSelecionados.length === 0) {
      alert('Selecione pelo menos um funcionário');
      return;
    }

    if (!selectedMes || !selectedAno) {
      alert('Selecione o período (mês e ano)');
      return;
    }

    // Navegar para a página de impressão
    const funcionarioIds = funcionariosSelecionados.join(',');
    const url = `/print/folha-ponto?funcionarios=${funcionarioIds}&mes=${selectedMes}&ano=${selectedAno}`;
    
    // Abrir em nova aba para impressão
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Configurações de Período */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Período</CardTitle>
          <CardDescription>
            Selecione o mês e ano para gerar as folhas de controle de ponto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Seleção de Funcionários */}
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
            Selecione os funcionários para gerar as folhas de controle de ponto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca de funcionários */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionários por nome ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={
                  filteredFuncionarios.length > 0 && 
                  filteredFuncionarios.every(f => funcionariosSelecionados.includes(f.id))
                }
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm font-medium">
                Selecionar Todos ({filteredFuncionarios.length})
              </Label>
            </div>
          </div>

          {/* Lista de funcionários */}
          <div className="max-h-[300px] overflow-y-auto border rounded-md p-2">
            <div className="space-y-2">
              {filteredFuncionarios.map((funcionario) => (
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
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {funcionario.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {filteredFuncionarios.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm ? "Nenhum funcionário encontrado" : "Nenhum funcionário ativo cadastrado"}
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
          className="min-w-[250px]"
        >
          {isGenerating ? (
            <>Gerando...</>
          ) : (
            <>
              <FileText className="h-5 w-5 mr-2" />
              Gerar {funcionariosSelecionados.length > 0 && `${funcionariosSelecionados.length} `}
              Folha{funcionariosSelecionados.length !== 1 ? 's' : ''} de Ponto
            </>
          )}
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        As folhas de controle de ponto serão geradas em formato PDF com os feriados do período selecionado.
        {funcionariosSelecionados.length > 1 && (
          <>
            <br />
            <span className="text-primary font-medium">
              Serão gerados {funcionariosSelecionados.length} arquivos PDF, um para cada funcionário.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
