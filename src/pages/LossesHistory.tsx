
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, MoreVertical, Eye, Trash, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loss } from "../types";
import { Badge } from "@/components/ui/badge";

const LossesHistory = () => {
  const { losses, deleteLoss, isLoading } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedLoss, setSelectedLoss] = useState<Loss | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const filteredLosses = losses.filter(
    (loss) =>
      loss.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      loss.machine.toLowerCase().includes(search.toLowerCase()) ||
      loss.productType.toLowerCase().includes(search.toLowerCase())
  );
  
  const handleDelete = async (id: string) => {
    try {
      await deleteLoss(id);
      setShowDeleteDialog(false);
      toast({
        title: "Perda excluída",
        description: "O registro de perda foi excluído com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir perda:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao excluir o registro de perda.",
      });
    }
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
                            <Dialog>
                              <DialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setSelectedLoss(loss);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Detalhes
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>
                                    Detalhes da Perda
                                  </DialogTitle>
                                  <DialogDescription>
                                    Data: {new Date(loss.date).toLocaleDateString()}
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="grid gap-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Lote de Produção:</p>
                                      <p className="text-sm">{loss.batchNumber}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Máquina:</p>
                                      <Badge variant="secondary" className={getMachineColor(loss.machine)}>
                                        {loss.machine}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Tipo de Produto:</p>
                                      <Badge variant="secondary" className={getProductTypeColor(loss.productType)}>
                                        {loss.productType}
                                      </Badge>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Quantidade:</p>
                                      <p className="text-sm">
                                        {loss.quantity} {loss.unitOfMeasure}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {loss.notes && (
                                    <div>
                                      <p className="text-sm font-medium">Observações:</p>
                                      <p className="text-sm">{loss.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                              onClick={() => {
                                setSelectedLoss(loss);
                                setShowDeleteDialog(true);
                              }}
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este registro de perda?
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => selectedLoss && handleDelete(selectedLoss.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LossesHistory;
