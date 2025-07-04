import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader, Plus, Search, FileText, Eye, Edit, Trash, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logSystemEvent } from "@/services/logService";

interface AnaliseAmostra {
  id: string;
  coleta_id: string;
  numero_amostra: number;
  data_analise: Date;
  aspecto?: string;
  cor?: string;
  odor?: string;
  sabor?: string;
  embalagem?: string;
  umidade?: number;
  umidade_conforme?: boolean;
  ph?: number;
  ph_conforme?: boolean;
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}

interface LaudoLiberacao {
  id: string;
  coleta_id: string;
  numero_laudo: number;
  marca_produto: string;
  gramatura: string;
  data_fabricacao: string;
  data_validade: string;
  revisao?: string;
  data_emissao: Date;
  responsavel_liberacao: string;
  resultado_geral: "aprovado" | "reprovado";
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}

interface ColetaAmostra {
  id: string;
  lote_producao: string;
  data_coleta: string;
  responsavel_coleta: string;
  quantidade_total_produzida: number;
  quantidade_amostras: number;
  status: "em_andamento" | "finalizada" | "aprovada" | "reprovada";
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}

interface NovoLaudo {
  coleta_id: string;
  marca_produto: string;
  gramatura: string;
  data_fabricacao: string;
  data_validade: string;
  revisao?: string;
  responsavel_liberacao: string;
  resultado_geral: "aprovado" | "reprovado";
  observacoes?: string;
}

interface ResponsavelTecnico {
  id?: string;
  nome: string;
  funcao: string;
  carteira_tecnica: string;
  assinatura_url?: string;
  created_at?: Date;
}

const formSchema = z.object({
  coleta_id: z.string().min(1, { message: "Selecione a coleta" }),
  marca_produto: z.string().min(2, { message: "Marca do produto é obrigatória" }),
  gramatura: z.string().min(1, { message: "Gramatura é obrigatória" }),
  data_fabricacao: z.string().min(1, { message: "Data de fabricação é obrigatória" }),
  data_validade: z.string().min(1, { message: "Data de validade é obrigatória" }),
  revisao: z.string().optional(),
  responsavel_liberacao: z.string().min(2, { message: "Responsável pela liberação é obrigatório" }),
  resultado_geral: z.enum(["aprovado", "reprovado"], {
    required_error: "Resultado geral é obrigatório.",
  }),
  observacoes: z.string().optional(),
});

type NovoLaudoValues = z.infer<typeof formSchema>;

const Laudos = () => {
  const [laudos, setLaudos] = useState<LaudoLiberacao[]>([]);
  const [coletas, setColetas] = useState<ColetaAmostra[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingResponsaveis, setIsCreatingResponsaveis] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLaudo, setSelectedLaudo] = useState<LaudoLiberacao | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<NovoLaudoValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coleta_id: "",
      marca_produto: "",
      gramatura: "",
      data_fabricacao: "",
      data_validade: "",
      revisao: "",
      responsavel_liberacao: "",
      resultado_geral: "aprovado",
      observacoes: "",
    },
  });

  useEffect(() => {
    fetchLaudos();
    fetchColetas();
  }, []);

  const fetchLaudos = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('laudos_liberacao')
        .select(`
          *,
          coleta:coletas_amostras(lote_producao)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const laudosFormatted = (data || []).map((laudo: any) => ({
        lote_producao: laudo.coleta?.lote_producao || 'N/A',
        id: laudo.id,
        coleta_id: laudo.coleta_id,
        numero_laudo: laudo.numero_laudo,
        marca_produto: laudo.marca_produto,
        gramatura: laudo.gramatura,
        data_fabricacao: laudo.data_fabricacao,
        data_validade: laudo.data_validade,
        revisao: laudo.revisao,
        data_emissao: laudo.data_emissao,
        responsavel_liberacao: laudo.responsavel_liberacao,
        resultado_geral: laudo.resultado_geral as "aprovado" | "reprovado",
        observacoes: laudo.observacoes,
        created_at: laudo.created_at,
        updated_at: laudo.updated_at,
        coleta: laudo.coleta
      }));

      setLaudos(laudosFormatted);
    } catch (error) {
      console.error('Erro ao buscar laudos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar laudos de liberação.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchColetas = async () => {
    try {
      const { data, error } = await supabase
        .from('coletas_amostras')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const coletasFormatted = (data || []).map((coleta: any) => ({
        ...coleta,
        status: coleta.status as "em_andamento" | "finalizada" | "aprovada" | "reprovada"
      }));

      setColetas(coletasFormatted);
    } catch (error) {
      console.error('Erro ao buscar coletas:', error);
    }
  };

  const filteredLaudos = laudos.filter((laudo) =>
    laudo.marca_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (laudo as any).lote_producao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    laudo.numero_laudo.toString().includes(searchTerm)
  );

  const handleCreateLaudo = async (data: NovoLaudo) => {
    try {
      setIsCreating(true);
      
      const { error } = await supabase
        .from('laudos_liberacao')
        .insert([{
          ...data as any,
          data_emissao: new Date().toISOString(),
        }]);

      if (error) throw error;

      toast({
        title: "Laudo Criado",
        description: "Laudo de liberação criado com sucesso.",
      });

      await logSystemEvent({
        actionType: 'CREATE',
        entityTable: 'laudos_liberacao',
        newData: data as any
      });

      setIsCreateDialogOpen(false);
      form.reset();
      fetchLaudos();
    } catch (error) {
      console.error('Erro ao criar laudo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao criar laudo de liberação.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateLaudo = async (data: NovoLaudo) => {
    if (!selectedLaudo) return;

    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('laudos_liberacao')
        .update(data as any)
        .eq('id', selectedLaudo.id);

      if (error) throw error;

      toast({
        title: "Laudo Atualizado",
        description: "Laudo de liberação atualizado com sucesso.",
      });

      await logSystemEvent({
        actionType: 'UPDATE',
        entityTable: 'laudos_liberacao',
        entityId: selectedLaudo.id,
        newData: data as any
      });

      setIsEditDialogOpen(false);
      setSelectedLaudo(null);
      fetchLaudos();
    } catch (error) {
      console.error('Erro ao atualizar laudo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao atualizar laudo de liberação.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteLaudo = async (laudo: LaudoLiberacao) => {
    try {
      // Implemente a lógica para excluir o laudo
      console.log('Excluindo laudo:', laudo.id);
    } catch (error) {
      console.error('Erro ao excluir laudo:', error);
    }
  };

  const handleViewLaudo = async (laudo: LaudoLiberacao) => {
    try {
      // Implemente a lógica para visualizar o laudo
      console.log('Visualizando laudo:', laudo.id);
    } catch (error) {
      console.error('Erro ao visualizar laudo:', error);
    }
  };

  const handleEditLaudo = (laudo: LaudoLiberacao) => {
    setSelectedLaudo(laudo);
    form.setValue("coleta_id", laudo.coleta_id);
    form.setValue("marca_produto", laudo.marca_produto);
    form.setValue("gramatura", laudo.gramatura);
    form.setValue("data_fabricacao", laudo.data_fabricacao);
    form.setValue("data_validade", laudo.data_validade);
    form.setValue("revisao", laudo.revisao || "");
    form.setValue("responsavel_liberacao", laudo.responsavel_liberacao);
    form.setValue("resultado_geral", laudo.resultado_geral);
    form.setValue("observacoes", laudo.observacoes || "");
    setIsEditDialogOpen(true);
  };

  const handlePrintLaudo = async (laudo: LaudoLiberacao) => {
    try {
      // Implemente a lógica para imprimir o laudo
      console.log('Imprimindo laudo:', laudo.id);
    } catch (error) {
      console.error('Erro ao imprimir laudo:', error);
    }
  };

  const handleBulkInsertResponsaveis = async () => {
    try {
      setIsCreatingResponsaveis(true);

      const responsaveisIniciais: Omit<ResponsavelTecnico, 'id' | 'created_at'>[] = [
        {
          nome: "João da Silva",
          funcao: "Técnico em Alimentos",
          carteira_tecnica: "CRQ-0123456",
        },
        {
          nome: "Maria Souza",
          funcao: "Engenheira Química",
          carteira_tecnica: "CREA-9876543",
        },
      ];

      // Inserir cada responsável técnico no banco de dados
      for (const responsavel of responsaveisIniciais) {
        const { data, error } = await supabase
          .from('responsaveis_tecnicos')
          .insert([responsavel]);

        if (error) {
          console.error("Erro ao inserir responsável técnico:", error);
          toast({
            variant: "destructive",
            title: "Erro",
            description: `Falha ao inserir responsável técnico: ${responsavel.nome}.`,
          });
          continue; // Continue para o próximo responsável em caso de erro
        }

        console.log("Responsável técnico inserido com sucesso:", data);
      }

      toast({
        title: "Responsáveis Técnicos Criados",
        description: "Responsáveis técnicos padrão criados com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao criar responsáveis técnicos padrão:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao criar responsáveis técnicos padrão.",
      });
    } finally {
      setIsCreatingResponsaveis(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laudos de Liberação</h1>
          <p className="text-muted-foreground">Gerencie os laudos de liberação dos produtos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Laudo
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Buscar por lote, marca ou número do laudo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Loader className="w-8 h-8 animate-spin" />
          <span className="ml-2">Carregando laudos...</span>
        </div>
      ) : filteredLaudos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhum laudo encontrado
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Tente ajustar os filtros de busca." : "Comece criando um novo laudo de liberação."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Laudo</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Marca/Produto</TableHead>
                  <TableHead>Data Fabricação</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLaudos.map((laudo) => (
                  <TableRow key={laudo.id}>
                    <TableCell className="font-medium">{laudo.numero_laudo}</TableCell>
                    <TableCell>{(laudo as any).lote_producao}</TableCell>
                    <TableCell>{laudo.marca_produto}</TableCell>
                    <TableCell>
                      {format(new Date(laudo.data_fabricacao), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={laudo.resultado_geral === 'aprovado' ? 'default' : 'destructive'}>
                        {laudo.resultado_geral === 'aprovado' ? 'Aprovado' : 'Reprovado'}
                      </Badge>
                    </TableCell>
                    <TableCell>{laudo.responsavel_liberacao}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewLaudo(laudo)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditLaudo(laudo)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handlePrintLaudo(laudo)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bulk Insert Responsible Technical Members */}
      <Card>
        <CardHeader>
          <CardTitle>Responsáveis Técnicos</CardTitle>
          <CardDescription>
            Gerencie os responsáveis técnicos para os laudos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={handleBulkInsertResponsaveis}
              disabled={isCreatingResponsaveis}
            >
              {isCreatingResponsaveis ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Criar Responsáveis Técnicos Padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Laudo de Liberação</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para criar um novo laudo
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateLaudo)} className="space-y-4">
              <FormField
                control={form.control}
                name="coleta_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coleta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a coleta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {coletas.map((coleta) => (
                          <SelectItem key={coleta.id} value={coleta.id}>
                            {coleta.lote_producao} - {format(new Date(coleta.data_coleta), "dd/MM/yyyy", { locale: ptBR })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="marca_produto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca/Produto</FormLabel>
                      <FormControl>
                        <Input placeholder="Marca do produto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gramatura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gramatura</FormLabel>
                      <FormControl>
                        <Input placeholder="Gramatura" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_fabricacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Fabricação</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_validade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Validade</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="revisao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revisão</FormLabel>
                    <FormControl>
                      <Input placeholder="Revisão (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsavel_liberacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável pela Liberação</FormLabel>
                    <FormControl>
                      <Input placeholder="Responsável pela liberação" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="resultado_geral"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resultado Geral</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o resultado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="reprovado">Reprovado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações (opcional)"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Criar Laudo
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Laudo de Liberação</DialogTitle>
            <DialogDescription>
              Edite os campos abaixo para atualizar o laudo
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateLaudo)} className="space-y-4">
              <FormField
                control={form.control}
                name="coleta_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coleta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a coleta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {coletas.map((coleta) => (
                          <SelectItem key={coleta.id} value={coleta.id}>
                            {coleta.lote_producao} - {format(new Date(coleta.data_coleta), "dd/MM/yyyy", { locale: ptBR })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="marca_produto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca/Produto</FormLabel>
                      <FormControl>
                        <Input placeholder="Marca do produto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gramatura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gramatura</FormLabel>
                      <FormControl>
                        <Input placeholder="Gramatura" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_fabricacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Fabricação</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_validade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Validade</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="revisao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revisão</FormLabel>
                    <FormControl>
                      <Input placeholder="Revisão (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsavel_liberacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável pela Liberação</FormLabel>
                    <FormControl>
                      <Input placeholder="Responsável pela liberação" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="resultado_geral"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resultado Geral</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o resultado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="reprovado">Reprovado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações (opcional)"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Edit className="mr-2 h-4 w-4" />
                )}
                Atualizar Laudo
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Laudos;
