
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface InventoryItem {
  id: string;
  productName?: string;
  materialName?: string;
  batchNumber: string;
  quantity: number;
  remainingQuantity: number;
  unitOfMeasure: string;
  expiryDate?: Date;
  hasReport?: boolean;
}

interface InventoryDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  type: "product" | "material";
  batches: InventoryItem[];
}

export function InventoryDetailsDialog({
  open,
  onOpenChange,
  item,
  type,
  batches
}: InventoryDetailsDialogProps) {
  if (!item) return null;

  const name = type === "product" ? item.productName : item.materialName;
  
  // Format expiry date as a string
  const formatExpiryDate = (date: Date | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  // Get expiry badge
  const getExpiryBadge = (expiryDate: Date | undefined) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (diffDays <= 30) {
      return <Badge variant="destructive">Vence em {diffDays} dias</Badge>;
    } else if (diffDays <= 90) {
      return <Badge className="bg-yellow-500">Vence em {diffDays} dias</Badge>;
    } else {
      return <Badge variant="outline">{formatExpiryDate(expiryDate)}</Badge>;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detalhes do {type === "product" ? "Produto" : "Material"}</DialogTitle>
          <DialogDescription>
            {name || "Item"} - Detalhes de Lotes Disponíveis
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Un.</TableHead>
                {type === "material" && <TableHead>Validade</TableHead>}
                {type === "material" && <TableHead>Laudo</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length > 0 ? (
                batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>{batch.batchNumber}</TableCell>
                    <TableCell>{batch.remainingQuantity}</TableCell>
                    <TableCell>{batch.unitOfMeasure}</TableCell>
                    {type === "material" && (
                      <TableCell>{getExpiryBadge(batch.expiryDate)}</TableCell>
                    )}
                    {type === "material" && (
                      <TableCell>
                        {batch.hasReport ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                            Não
                          </Badge>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={type === "material" ? 5 : 3} className="text-center py-4">
                    Nenhum lote disponível.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
