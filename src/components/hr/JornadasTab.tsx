
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getJornadasTrabalho } from "@/services/hrService";
import type { JornadaTrabalho } from "@/types/hr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function JornadasTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: jornadas = [], isLoading } = useQuery({
    queryKey: ['jornadas-trabalho'],
    queryFn: getJornadasTrabalho,
  });

  const filteredJornadas = jornadas.filter(jornada =>
    jornada.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    jornada.descricao_impressao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div>Carregando jornadas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar jornadas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-80"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Jornada
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição para Impressão</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJornadas.map((jornada) => (
              <TableRow key={jornada.id}>
                <TableCell className="font-medium">{jornada.nome}</TableCell>
                <TableCell>{jornada.descricao_impressao}</TableCell>
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

      {filteredJornadas.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          {searchTerm ? "Nenhuma jornada encontrada" : "Nenhuma jornada cadastrada"}
        </div>
      )}
    </div>
  );
}
