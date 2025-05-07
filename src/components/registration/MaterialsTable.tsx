
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
import { Badge } from "@/components/ui/badge";

const MaterialsTable = () => {
  const { materials } = useData();
  const [search, setSearch] = React.useState("");
  
  const filteredMaterials = materials.filter(
    material => 
      material.name.toLowerCase().includes(search.toLowerCase()) ||
      material.code.toLowerCase().includes(search.toLowerCase()) ||
      material.type.toLowerCase().includes(search.toLowerCase())
  );
  
  const getMaterialTypeColor = (type: string) => {
    switch (type) {
      case "Fécula":
        return "bg-blue-500";
      case "Conservante":
        return "bg-green-500";
      case "Embalagem":
        return "bg-yellow-500";
      case "Saco":
        return "bg-purple-500";
      case "Caixa":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Buscar matérias-primas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Matéria-Prima
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMaterials.length > 0 ? (
            filteredMaterials.map(material => (
              <TableRow key={material.id}>
                <TableCell>{material.name}</TableCell>
                <TableCell>{material.code}</TableCell>
                <TableCell>
                  <Badge className={getMaterialTypeColor(material.type)}>
                    {material.type}
                  </Badge>
                </TableCell>
                <TableCell>{material.unitOfMeasure}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {/* Actions buttons would go here */}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Nenhuma matéria-prima encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {/* Add and Edit dialogs would go here */}
    </div>
  );
};

export default MaterialsTable;
