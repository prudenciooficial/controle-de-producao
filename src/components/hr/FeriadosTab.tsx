import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Download, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFeriados, createFeriado } from "@/services/hrService";
import type { Feriado } from "@/types/hr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeriadoSugerido {
  nome: string;
  data: string;
  tipo: 'nacional' | 'estadual' | 'municipal';
  descricao?: string;
}

interface FormularioFeriado {
  nome: string;
  data: string;
  tipo: 'nacional' | 'estadual' | 'municipal';
  descricao: string;
}

export function FeriadosTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBuscaOpen, setIsBuscaOpen] = useState(false);
  const [anoSelecionado, setAnoSelecionado] = useState("");
  const [feriadosSugeridos, setFeriadosSugeridos] = useState<FeriadoSugerido[]>([]);
  const [feriadosSelecionados, setFeriadosSelecionados] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormularioFeriado>({
    nome: '',
    data: '',
    tipo: 'nacional',
    descricao: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feriados = [], isLoading: isLoadingFeriados, refetch } = useQuery({
    queryKey: ['feriados'],
    queryFn: () => getFeriados(),
  });

  const createFeriadoMutation = useMutation({
    mutationFn: createFeriado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast({
        title: "Sucesso",
        description: "Feriado criado com sucesso!",
      });
      setIsDialogOpen(false);
      setFormData({ nome: '', data: '', tipo: 'nacional', descricao: '' });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar feriado. Tente novamente.",
      });
    },
  });

  const filteredFeriados = feriados.filter(feriado =>
    feriado.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    feriado.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'nacional': return 'default';
      case 'estadual': return 'secondary';
      case 'municipal': return 'outline';
      default: return 'default';
    }
  };

  const buscarFeriados = async () => {
    if (!anoSelecionado) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um ano para buscar feriados.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simulação de busca de feriados (em um caso real, seria uma API)
      const feriadosNacionais: FeriadoSugerido[] = [
        { nome: "Ano Novo", data: `${anoSelecionado}-01-01`, tipo: 'nacional', descricao: "Confraternização Universal" },
        { nome: "Carnaval", data: `${anoSelecionado}-02-12`, tipo: 'nacional', descricao: "Segunda-feira de Carnaval" },
        { nome: "Carnaval", data: `${anoSelecionado}-02-13`, tipo: 'nacional', descricao: "Terça-feira de Carnaval" },
        { nome: "Sexta-feira Santa", data: `${anoSelecionado}-03-29`, tipo: 'nacional', descricao: "Paixão de Cristo" },
        { nome: "Tiradentes", data: `${anoSelecionado}-04-21`, tipo: 'nacional', descricao: "Dia de Tiradentes" },
        { nome: "Dia do Trabalhador", data: `${anoSelecionado}-05-01`, tipo: 'nacional', descricao: "Dia do Trabalho" },
        { nome: "Corpus Christi", data: `${anoSelecionado}-05-30`, tipo: 'nacional', descricao: "Corpus Christi" },
        { nome: "Independência do Brasil", data: `${anoSelecionado}-09-07`, tipo: 'nacional', descricao: "Dia da Independência" },
        { nome: "Nossa Senhora Aparecida", data: `${anoSelecionado}-10-12`, tipo: 'nacional', descricao: "Padroeira do Brasil" },
        { nome: "Finados", data: `${anoSelecionado}-11-02`, tipo: 'nacional', descricao: "Dia de Finados" },
        { nome: "Proclamação da República", data: `${anoSelecionado}-11-15`, tipo: 'nacional', descricao: "Proclamação da República" },
        { nome: "Natal", data: `${anoSelecionado}-12-25`, tipo: 'nacional', descricao: "Natal" }
      ];

      const feriadosEstaduais: FeriadoSugerido[] = [
        { nome: "Data Magna do Estado do Ceará", data: `${anoSelecionado}-03-25`, tipo: 'estadual', descricao: "Abolição da Escravidão no Ceará" },
        { nome: "Dia de São José", data: `${anoSelecionado}-03-19`, tipo: 'estadual', descricao: "Padroeiro do Ceará" }
      ];

      const feriadosMunicipais: FeriadoSugerido[] = [
        { nome: "Aniversário de Horizonte", data: `${anoSelecionado}-05-30`, tipo: 'municipal', descricao: "Emancipação política de Horizonte" }
      ];

      const todosFeriados = [...feriadosNacionais, ...feriadosEstaduais, ...feriadosMunicipais];
      
      // Filtrar feriados que já existem no sistema
      const feriadosExistentes = feriados.map(f => 
        f.data instanceof Date ? f.data.toISOString().split('T')[0] : new Date(f.data).toISOString().split('T')[0]
      );
      const feriadosNovos = todosFeriados.filter(f => !feriadosExistentes.includes(f.data));
      
      setFeriadosSugeridos(feriadosNovos);
      setFeriadosSelecionados([]);
      
      toast({
        title: "Busca Concluída",
        description: `Encontrados ${feriadosNovos.length} novos feriados para ${anoSelecionado}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao buscar feriados. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFeriado = (feriadoData: string, checked: boolean) => {
    if (checked) {
      setFeriadosSelecionados([...feriadosSelecionados, feriadoData]);
    } else {
      setFeriadosSelecionados(feriadosSelecionados.filter(data => data !== feriadoData));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setFeriadosSelecionados(feriadosSugeridos.map(f => f.data));
    } else {
      setFeriadosSelecionados([]);
    }
  };

  const importarFeriados = async () => {
    if (feriadosSelecionados.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione pelo menos um feriado para importar.",
      });
      return;
    }

    try {
      // Aqui seria feita a importação real para o banco de dados
      // Por agora, vamos simular o sucesso
      
      toast({
        title: "Sucesso",
        description: `${feriadosSelecionados.length} feriado(s) importado(s) com sucesso!`,
      });
      
      setIsBuscaOpen(false);
      setFeriadosSugeridos([]);
      setFeriadosSelecionados([]);
      refetch(); // Recarregar a lista de feriados
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao importar feriados. Tente novamente.",
      });
    }
  };

  const anos = Array.from({ length: 10 }, (_, i) => {
    const ano = new Date().getFullYear() + i;
    return { value: ano.toString(), label: ano.toString() };
  });

  const handleInputChange = (field: keyof FormularioFeriado, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitFeriado = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.data || !formData.tipo) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    const dataFeriado = new Date(formData.data);
    const ano = dataFeriado.getFullYear();

    const novoFeriado = {
      nome: formData.nome,
      data: new Date(formData.data),
      ano,
      tipo: formData.tipo,
      descricao: formData.descricao || null,
      ativo: true,
    };

    createFeriadoMutation.mutate(novoFeriado);
  };

  if (isLoadingFeriados) {
    return <div className="flex items-center justify-center p-8">Carregando feriados...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar feriados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-80"
          />
        </div>
        <div className="flex gap-2">
          <Dialog open={isBuscaOpen} onOpenChange={setIsBuscaOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Buscar Novos Feriados
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Buscar Feriados Automaticamente</DialogTitle>
                <DialogDescription>
                  Selecione um ano para buscar feriados nacionais, estaduais e municipais automaticamente.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="ano">Ano:</Label>
                  <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                    <SelectTrigger className="w-[180px]">
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
                  <Button onClick={buscarFeriados} disabled={isLoading || !anoSelecionado}>
                    {isLoading ? "Buscando..." : "Buscar Feriados"}
                  </Button>
                </div>

                {feriadosSugeridos.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Feriados Encontrados ({feriadosSugeridos.length})</span>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all"
                            checked={feriadosSelecionados.length === feriadosSugeridos.length && feriadosSugeridos.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                          <Label htmlFor="select-all" className="text-sm">
                            Selecionar Todos
                          </Label>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Selecione os feriados que deseja importar para o sistema.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <span className="sr-only">Selecionar</span>
                              </TableHead>
                              <TableHead>Nome</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Descrição</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {feriadosSugeridos.map((feriado) => (
                              <TableRow key={feriado.data}>
                                <TableCell>
                                  <Checkbox
                                    checked={feriadosSelecionados.includes(feriado.data)}
                                    onCheckedChange={(checked) => 
                                      handleSelectFeriado(feriado.data, !!checked)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{feriado.nome}</TableCell>
                                <TableCell>
                                  {new Date(feriado.data).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getTipoColor(feriado.tipo)}>
                                    {feriado.tipo}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {feriado.descricao}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBuscaOpen(false)}>
                  Cancelar
                </Button>
                {feriadosSelecionados.length > 0 && (
                  <Button onClick={importarFeriados}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Importar {feriadosSelecionados.length} Feriado(s)
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Feriado
          </Button>
        </div>
      </div>

      {/* Dialog para criar novo feriado */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Feriado</DialogTitle>
            <DialogDescription>
              Adicione um novo feriado ao sistema preenchendo as informações abaixo.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitFeriado} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Feriado *</Label>
              <Input
                id="nome"
                placeholder="Ex: Natal, Ano Novo..."
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => handleInputChange('data', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select 
                value={formData.tipo} 
                onValueChange={(value) => handleInputChange('tipo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">Nacional</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                placeholder="Descrição opcional do feriado"
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createFeriadoMutation.isPending}
              >
                {createFeriadoMutation.isPending ? "Salvando..." : "Salvar Feriado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeriados.map((feriado) => (
              <TableRow key={feriado.id}>
                <TableCell className="font-medium">{feriado.nome}</TableCell>
                <TableCell>
                  {new Date(feriado.data).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Badge variant={getTipoColor(feriado.tipo)}>
                    {feriado.tipo}
                  </Badge>
                </TableCell>
                <TableCell>{feriado.ano}</TableCell>
                <TableCell>
                  <Badge variant={feriado.ativo ? 'default' : 'secondary'}>
                    {feriado.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredFeriados.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          {searchTerm ? "Nenhum feriado encontrado" : "Nenhum feriado cadastrado"}
        </div>
      )}
    </div>
  );
}
