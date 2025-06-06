
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFeriados } from "@/services/hrService";
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

export function FeriadosTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: feriados = [], isLoading } = useQuery({
    queryKey: ['feriados'],
    queryFn: () => getFeriados(),
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

  if (isLoading) {
    return <div>Carregando feriados...</div>;
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Feriado
        </Button>
      </div>

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
