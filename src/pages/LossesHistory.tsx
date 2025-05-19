import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, MoreVertical, Eye, Trash, Loader, PencilIcon, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loss } from "../types";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LossesHistory = () => {
  const { losses, deleteLoss, updateLoss, isLoading } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedLoss, setSelectedLoss] = useState<Loss | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Define the form for editing losses
  const form = useForm<Partial<Loss>>({
    defaultValues: {
      date: new Date(),
      batchNumber: "",
      machine: "Outro",
      quantity: 0,
      unitOfMeasure: "kg",
      productType: "Outro",
      notes: ""
    }
  });
  
  const filteredLosses = losses.filter(
    (loss) =>
      loss.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      loss.machine.toLowerCase().includes(search.toLowerCase()) ||
      loss.productType.toLowerCase().includes(search.toLowerCase())
  );
  
  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await deleteLoss(id);
    } catch (error) {
      console.error("Erro ao excluir perda:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao excluir o registro de perda.",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedLoss(null);
    }
  };
  
  const handleEditSubmit = async (values: Partial<Loss>) => {
    if (!selectedLoss) return;
    
    try {
      setIsUpdating(true);
      await updateLoss(selectedLoss.id, values);
      setShowEditDialog(false);
      setSelectedLoss(null);
    } catch (error) {
      console.error("Erro ao atualizar perda:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar o registro de perda.",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const openEditDialog = (loss: Loss) => {
    setSelectedLoss(loss);
    // Reset form with current loss values
    form.reset({
      date: loss.date,
      batchNumber: loss.batchNumber,
      machine: loss.machine,
      quantity: loss.quantity,
      unitOfMeasure: loss.unitOfMeasure,
      productType: loss.productType,
      notes: loss.notes
    });
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (loss: Loss) => {
    setSelectedLoss(loss);
    setShowDeleteDialog(true);
  };
  
  const openDetailsDialog = (loss: Loss) => {
    setSelectedLoss(loss);
    setShowDetailsDialog(true);
  };
  
  const getMachineColor = (machine: string) => {
    switch (machine) {
      case "Moinho":
        return "bg-blue-500";
      case "Mexedor":
        return "bg-green-500";
      case "Tombador":
        return "bg-yellow-500";
      case "Embaladora":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };
  
  const getProductTypeColor = (type: string) => {
    switch (type) {
      case "Goma":
        return "bg-blue-500";
      case "Fécula":
        return "bg-green-500";
      case "Embalagem":
        return "bg-yellow-500";
      case "Sorbato":
        return "bg-purple-500";
      case "Produto Acabado":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate("/perdas")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Histórico de Perdas</h1>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Buscar por lote, máquina ou tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Registros de Perdas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading.losses ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="w-8 h-8 animate-spin" />
              <span className="ml-2">Carregando dados...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Tipo de Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLosses.length > 0 ? (
                  filteredLosses.map((loss) => (
                    <TableRow key={loss.id}>
                      <TableCell>{new Date(loss.date).toLocaleDateString()}</TableCell>
                      <TableCell>{loss.batchNumber}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getMachineColor(loss.machine)}>
                          {loss.machine}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getProductTypeColor(loss.productType)}>
                          {loss.productType}
                        </Badge>
                      </TableCell>
                      <TableCell>{loss.quantity} {loss.unitOfMeasure}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                openDetailsDialog(loss);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Detalhes
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                openEditDialog(loss);
                              }}
                            >
                              <PencilIcon className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                              onClick={() => openDeleteDialog(loss)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Nenhum registro de perda encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        {selectedLoss && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Detalhes da Perda
              </DialogTitle>
              <DialogDescription>
                Data: {new Date(selectedLoss.date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Lote de Produção:</p>
                  <p className="text-sm">{selectedLoss.batchNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Máquina:</p>
                  <Badge variant="secondary" className={getMachineColor(selectedLoss.machine)}>
                    {selectedLoss.machine}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Tipo de Produto:</p>
                  <Badge variant="secondary" className={getProductTypeColor(selectedLoss.productType)}>
                    {selectedLoss.productType}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Quantidade:</p>
                  <p className="text-sm">
                    {selectedLoss.quantity} {selectedLoss.unitOfMeasure}
                  </p>
                </div>
              </div>
              
              {selectedLoss.notes && (
                <div>
                  <p className="text-sm font-medium">Observações:</p>
                  <p className="text-sm">{selectedLoss.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        if (!isUpdating) setShowEditDialog(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Registro de Perda</DialogTitle>
            <DialogDescription>
              Atualize os dados do registro de perda.
            </DialogDescription>
          </DialogHeader>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Alterações nos registros de perdas afetam a análise de eficiência da produção.
            </AlertDescription>
          </Alert>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''} 
                        onChange={(e) => field.onChange(new Date(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Lote</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="machine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máquina</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a máquina" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Moinho">Moinho</SelectItem>
                          <SelectItem value="Mexedor">Mexedor</SelectItem>
                          <SelectItem value="Tombador">Tombador</SelectItem>
                          <SelectItem value="Embaladora">Embaladora</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="productType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Produto</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Goma">Goma</SelectItem>
                          <SelectItem value="Fécula">Fécula</SelectItem>
                          <SelectItem value="Embalagem">Embalagem</SelectItem>
                          <SelectItem value="Sorbato">Sorbato</SelectItem>
                          <SelectItem value="Produto Acabado">Produto Acabado</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="unitOfMeasure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a unidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="l">l</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="un">un</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                  disabled={isUpdating}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog - Using AlertDialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de perda?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedLoss && handleDelete(selectedLoss.id)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LossesHistory;
