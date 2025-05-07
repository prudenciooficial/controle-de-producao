
import React from "react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";

const SuppliersTable = () => {
  const { suppliers } = useData();
  const [search, setSearch] = React.useState("");
  
  const filteredSuppliers = suppliers.filter(
    supplier => 
      supplier.name.toLowerCase().includes(search.toLowerCase()) ||
      supplier.code.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Buscar fornecedores..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Contatos</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSuppliers.length > 0 ? (
            filteredSuppliers.map(supplier => (
              <TableRow key={supplier.id}>
                <TableCell>{supplier.name}</TableCell>
                <TableCell>{supplier.code}</TableCell>
                <TableCell>{supplier.contacts || "-"}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {/* Actions buttons would go here */}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                Nenhum fornecedor encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {/* Add and Edit dialogs would go here */}
    </div>
  );
};

export default SuppliersTable;
