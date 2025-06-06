
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFuncionarios, getFeriados, getConfiguracaoEmpresa } from "@/services/hrService";
import { generateControlePontoPDF } from "@/utils/controlePontoPDF";
import type { Funcionario } from "@/types/hr";

export function ControlePontoTab() {
  const [selectedFuncionario, setSelectedFuncionario] = useState<string>("");
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedAno, setSelectedAno] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: getFuncionarios,
  });

  const { data: configuracao } = useQuery({
    queryKey: ['configuracao-empresa'],
    queryFn: getConfiguracaoEmpresa,
  });

  const funcionariosAtivos = funcionarios.filter(f => f.status === 'ativo');

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

  const handleGeneratePDF = async () => {
    if (!selectedFuncionario || !selectedMes || !selectedAno) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione funcionário, mês e ano para gerar a folha de ponto.",
      });
      return;
    }

    if (!configuracao) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Configure os dados da empresa antes de gerar relatórios.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const funcionario = funcionarios.find(f => f.id === selectedFuncionario);
      if (!funcionario) throw new Error('Funcionário não encontrado');

      const ano = parseInt(selectedAno);
      const feriados = await getFeriados(ano);

      const data = {
        funcionario,
        mes: parseInt(selectedMes),
        ano,
        feriados,
        configuracao_empresa: configuracao,
      };

      await generateControlePontoPDF(data);

      toast({
        title: "Sucesso",
        description: "Folha de controle de ponto gerada com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao gerar folha de ponto. Tente novamente.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="funcionario">Funcionário</Label>
          <Select value={selectedFuncionario} onValueChange={setSelectedFuncionario}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um funcionário" />
            </SelectTrigger>
            <SelectContent>
              {funcionariosAtivos.map((funcionario) => (
                <SelectItem key={funcionario.id} value={funcionario.id}>
                  {funcionario.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

      <div className="flex justify-center">
        <Button 
          onClick={handleGeneratePDF} 
          disabled={isGenerating || !selectedFuncionario || !selectedMes || !selectedAno}
          size="lg"
        >
          {isGenerating ? (
            <>Gerando...</>
          ) : (
            <>
              <FileText className="h-5 w-5 mr-2" />
              Gerar Folha de Controle de Ponto
            </>
          )}
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        A folha de controle de ponto será gerada em formato PDF com os feriados do período selecionado.
      </div>
    </div>
  );
}
