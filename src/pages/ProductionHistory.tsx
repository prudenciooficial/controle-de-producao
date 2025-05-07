
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, MoreVertical, Eye, Pen, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductionBatch } from "../types";

const ProductionHistory = () => {
  const { productionBatches, deleteProductionBatch } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const filteredBatches = productionBatches.filter(
    (batch) =>
      batch.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      batch.producedItems.some((item) =>
        item.productName.toLowerCase().includes(search.toLowerCase())
      )
  );
  
  const handleDelete = (id: string) => {
    deleteProductionBatch(id);
    setShowDeleteDialog(false);
    toast({
      title: "Produção excluída",
      description: "O registro de produção foi excluído com sucesso.",
    });
  };
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate("/producao")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Histórico de Produção</h1>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Buscar por lote ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Registros de Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Quantidade Total</TableHead>
                <TableHead>Dia da Mexida</TableHead>
                <TableHead>Qtd. Mexidas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.length > 0 ? (
                filteredBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>{batch.batchNumber}</TableCell>
                    <TableCell>
                      {new Date(batch.productionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {batch.producedItems
                        .map((item) => item.productName)
                        .join(", ")}
                    </TableCell>
                    <TableCell>
                      {batch.producedItems.reduce(
                        (total, item) => total + item.quantity,
                        0
                      )}{" "}
                      kg
                    </TableCell>
                    <TableCell>{batch.mixDay}</TableCell>
                    <TableCell>{batch.mixCount}</TableCell>
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
                                  setSelectedBatch(batch);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Detalhes
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Detalhes da Produção - Lote {batch.batchNumber}
                                </DialogTitle>
                                <DialogDescription>
                                  Data: {new Date(batch.productionDate).toLocaleDateString()}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="grid gap-6">
                                <div>
                                  <h3 className="text-lg font-medium mb-2">
                                    Informações Gerais
                                  </h3>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Dia da Mexida:</p>
                                      <p className="text-sm">{batch.mixDay}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Qtd. de Mexidas:</p>
                                      <p className="text-sm">{batch.mixCount}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h3 className="text-lg font-medium mb-2">
                                    Produtos Produzidos
                                  </h3>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Produto</TableHead>
                                        <TableHead>Lote</TableHead>
                                        <TableHead>Quantidade</TableHead>
                                        <TableHead>Un.</TableHead>
                                        <TableHead>Estoque Atual</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {batch.producedItems.map((item) => (
                                        <TableRow key={item.id}>
                                          <TableCell>{item.productName}</TableCell>
                                          <TableCell>{item.batchNumber}</TableCell>
                                          <TableCell>{item.quantity}</TableCell>
                                          <TableCell>{item.unitOfMeasure}</TableCell>
                                          <TableCell>{item.remainingQuantity}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                                
                                <div>
                                  <h3 className="text-lg font-medium mb-2">
                                    Insumos Utilizados
                                  </h3>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Insumo</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Lote</TableHead>
                                        <TableHead>Quantidade</TableHead>
                                        <TableHead>Un.</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {batch.usedMaterials.map((material) => (
                                        <TableRow key={material.id}>
                                          <TableCell>{material.materialName}</TableCell>
                                          <TableCell>{material.materialType}</TableCell>
                                          <TableCell>{material.batchNumber}</TableCell>
                                          <TableCell>{material.quantity}</TableCell>
                                          <TableCell>{material.unitOfMeasure}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                                
                                {batch.notes && (
                                  <div>
                                    <h3 className="text-lg font-medium mb-2">
                                      Observações
                                    </h3>
                                    <p className="text-sm">{batch.notes}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive"
                            onClick={() => {
                              setSelectedBatch(batch);
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
                  <TableCell colSpan={7} className="text-center py-4">
                    Nenhum registro de produção encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta produção?
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
              onClick={() => selectedBatch && handleDelete(selectedBatch.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionHistory;
