import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit, Clock, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getJornadasTrabalho, createJornadaTrabalho, updateJornadaTrabalho } from "@/services/hrService";
import type { JornadaTrabalho, HorarioDia, HorariosEstruturados } from "@/types/hr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DIAS_SEMANA = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

interface JornadaFormData {
  nome: string;
  descricao_impressao: string;
  horarios: HorariosEstruturados;
}

export function JornadasTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJornada, setEditingJornada] = useState<JornadaTrabalho | null>(null);
  const [formData, setFormData] = useState<JornadaFormData>({
    nome: "",
    descricao_impressao: "",
    horarios: DIAS_SEMANA.reduce((acc, dia) => ({
      ...acc,
      [dia.key]: { entrada1: "", saida1: "", entrada2: "", saida2: "" }
    }), {} as HorariosEstruturados)
  });
  const { toast } = useToast();
  const { user, getUserDisplayName } = useAuth();

  const { data: jornadas = [], isLoading, refetch } = useQuery({
    queryKey: ['jornadas'],
    queryFn: getJornadasTrabalho,
  });

  const filteredJornadas = jornadas.filter((jornada: any) =>
    jornada.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao_impressao: "",
      horarios: DIAS_SEMANA.reduce((acc, dia) => ({
        ...acc,
        [dia.key]: { entrada1: "", saida1: "", entrada2: "", saida2: "" }
      }), {} as HorariosEstruturados)
    });
    setEditingJornada(null);
  };

  const handleOpenDialog = (jornada?: JornadaTrabalho) => {
    if (jornada) {
      setEditingJornada(jornada);
      setFormData({
        nome: jornada.nome,
        descricao_impressao: jornada.descricao_impressao,
        horarios: jornada.horarios_estruturados
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleHorarioChange = (dia: string, campo: keyof HorarioDia, valor: string) => {
    setFormData(prev => ({
      ...prev,
      horarios: {
        ...prev.horarios,
        [dia]: {
          ...prev.horarios[dia],
          [campo]: valor
        }
      }
    }));
  };

  const copiarHorariosPara = (diaOrigem: string, diasDestino: string[]) => {
    const horarioOrigem = formData.horarios[diaOrigem];
    const novosHorarios = { ...formData.horarios };
    
    diasDestino.forEach(dia => {
      if (dia !== diaOrigem) {
        novosHorarios[dia] = { ...horarioOrigem };
      }
    });
    
    setFormData(prev => ({ ...prev, horarios: novosHorarios }));
  };

  const aplicarHorarioPadrao = () => {
    const horarioPadrao = {
      entrada1: "08:00",
      saida1: "12:00",
      entrada2: "13:00",
      saida2: "17:00"
    };
    
    const novoHorario = DIAS_SEMANA.reduce((acc, dia) => {
      if (dia.key === 'sabado' || dia.key === 'domingo') {
        return {
          ...acc,
          [dia.key]: { entrada1: "", saida1: "", entrada2: "", saida2: "" }
        };
      }
      return {
        ...acc,
        [dia.key]: { ...horarioPadrao }
      };
    }, {} as HorariosEstruturados);
    
    setFormData(prev => ({ ...prev, horarios: novoHorario }));
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome da jornada é obrigatório.",
      });
      return;
    }

    if (!formData.descricao_impressao.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Descrição para impressão é obrigatória.",
      });
      return;
    }

    try {
      const jornadaData = {
        nome: formData.nome.trim(),
        descricao_impressao: formData.descricao_impressao.trim(),
        horarios_estruturados: formData.horarios
      };

      if (editingJornada) {
        await updateJornadaTrabalho(
          editingJornada.id, 
          jornadaData,
          user?.id,
          getUserDisplayName()
        );
      } else {
        await createJornadaTrabalho(
          jornadaData,
          user?.id,
          getUserDisplayName()
        );
      }

      toast({
        title: "Sucesso",
        description: editingJornada ? "Jornada atualizada com sucesso!" : "Jornada criada com sucesso!",
      });
      
      handleCloseDialog();
      refetch();
    } catch (error) {
      console.error('Erro ao salvar jornada:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar jornada. Tente novamente.",
      });
    }
  };

  const calcularHorasDia = (horario: HorarioDia): string => {
    const { entrada1, saida1, entrada2, saida2 } = horario;
    
    if (!entrada1 || !saida1) return "0h";
    
    const calcularMinutos = (inicio: string, fim: string): number => {
      if (!inicio || !fim) return 0;
      const [hi, mi] = inicio.split(':').map(Number);
      const [hf, mf] = fim.split(':').map(Number);
      return (hf * 60 + mf) - (hi * 60 + mi);
    };
    
    const minutosPeriodo1 = calcularMinutos(entrada1, saida1);
    const minutosPeriodo2 = entrada2 && saida2 ? calcularMinutos(entrada2, saida2) : 0;
    
    const totalMinutos = minutosPeriodo1 + minutosPeriodo2;
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    
    return `${horas}h${minutos > 0 ? `${minutos}m` : ''}`;
  };

  const formatarHorario = (horario: HorarioDia): string => {
    const { entrada1, saida1, entrada2, saida2 } = horario;
    
    if (!entrada1 || !saida1) return "Folga";
    
    let formatted = `${entrada1} às ${saida1}`;
    if (entrada2 && saida2) {
      formatted += ` / ${entrada2} às ${saida2}`;
    }
    
    return formatted;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Carregando jornadas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar jornadas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Jornada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {editingJornada ? 'Editar Jornada' : 'Nova Jornada de Trabalho'}
              </DialogTitle>
              <DialogDescription>
                Configure os horários de trabalho para cada dia da semana e a descrição que aparecerá na folha de ponto.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Dados Básicos */}
              <Card>
                <CardHeader>
                  <CardTitle>Dados Básicos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome da Jornada *</Label>
                      <Input
                        id="nome"
                        placeholder="Ex: Jornada Padrão 44h"
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição para Impressão *</Label>
                      <Textarea
                        id="descricao"
                        placeholder="Ex: SEGUNDA A SÁBADO 07:00 AS 12:00 / 13:00 AS 15:20"
                        value={formData.descricao_impressao}
                        onChange={(e) => setFormData(prev => ({ ...prev, descricao_impressao: e.target.value }))}
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        Esta descrição aparecerá nas folhas de controle de ponto impressas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Configuração de Horários */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span>Horários por Dia da Semana</span>
                    <Button variant="outline" size="sm" onClick={aplicarHorarioPadrao} className="w-full sm:w-auto">
                      Aplicar Horário Comercial
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Configure os horários de entrada e saída para cada dia. Use dois períodos para jornadas com intervalo de almoço.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {DIAS_SEMANA.map((dia) => (
                      <div key={dia.key} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{dia.label}</h4>
                            <Badge variant="outline">
                              {calcularHorasDia(formData.horarios[dia.key])}
                            </Badge>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copiarHorariosPara(dia.key, ['segunda', 'terca', 'quarta', 'quinta', 'sexta'])}
                              className="text-xs w-full sm:w-auto"
                            >
                              Copiar para Úteis
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copiarHorariosPara(dia.key, DIAS_SEMANA.map(d => d.key))}
                              className="text-xs w-full sm:w-auto"
                            >
                              Copiar para Todos
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">1ª Entrada</Label>
                            <Input
                              type="time"
                              value={formData.horarios[dia.key].entrada1}
                              onChange={(e) => handleHorarioChange(dia.key, 'entrada1', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">1ª Saída</Label>
                            <Input
                              type="time"
                              value={formData.horarios[dia.key].saida1}
                              onChange={(e) => handleHorarioChange(dia.key, 'saida1', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">2ª Entrada</Label>
                            <Input
                              type="time"
                              value={formData.horarios[dia.key].entrada2}
                              onChange={(e) => handleHorarioChange(dia.key, 'entrada2', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">2ª Saída</Label>
                            <Input
                              type="time"
                              value={formData.horarios[dia.key].saida2}
                              onChange={(e) => handleHorarioChange(dia.key, 'saida2', e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-2 text-sm text-muted-foreground">
                          {formatarHorario(formData.horarios[dia.key])}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto">
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                {editingJornada ? 'Atualizar' : 'Salvar'} Jornada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nome</TableHead>
                <TableHead className="whitespace-nowrap max-w-xs">Descrição para Impressão</TableHead>
                <TableHead className="whitespace-nowrap">Resumo Semanal</TableHead>
                <TableHead className="whitespace-nowrap">Total Horas/Semana</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJornadas.map((jornada) => {
                const totalSemanal = DIAS_SEMANA.reduce((total, dia) => {
                  const horario = jornada.horarios_estruturados[dia.key];
                  const horas = calcularHorasDia(horario);
                  const match = horas.match(/(\d+)h(\d+)?m?/);
                  if (match) {
                    return total + parseInt(match[1]) + (match[2] ? parseInt(match[2]) / 60 : 0);
                  }
                  return total;
                }, 0);

                return (
                  <TableRow key={jornada.id}>
                    <TableCell className="font-medium whitespace-nowrap">{jornada.nome}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={jornada.descricao_impressao}>
                        {jornada.descricao_impressao}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm whitespace-nowrap">
                        {DIAS_SEMANA.slice(0, 5).map(dia => {
                          const horario = jornada.horarios_estruturados[dia.key];
                          return horario.entrada1 ? calcularHorasDia(horario) : '0h';
                        }).join(' + ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {Math.round(totalSemanal)}h/sem
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleOpenDialog(jornada)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredJornadas.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          {searchTerm ? "Nenhuma jornada encontrada" : "Nenhuma jornada cadastrada"}
        </div>
      )}
    </div>
  );
}
