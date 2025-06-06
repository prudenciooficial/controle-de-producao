
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFuncionarios } from "@/services/hrService";
import { FuncionarioDialog } from "./FuncionarioDialog";
import type { Funcionario } from "@/types/hr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function FuncionariosTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const { toast } = useToast();

  const { data: funcionarios = [], isLoading, refetch } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: getFuncionarios,
  });

  const filteredFuncionarios = funcionarios.filter(funcionario =>
    funcionario.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funcionario.cpf.includes(searchTerm) ||
    funcionario.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingFuncionario(null);
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setIsDialogOpen(false);
    setEditingFuncionario(null);
    refetch();
    toast({
      title: "Sucesso",
      description: editingFuncionario ? "Funcionário atualizado com sucesso!" : "Funcionário criado com sucesso!",
    });
  };

  if (isLoading) {
    return <div>Carregando funcionários...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-80"
          />
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Funcionário
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Admissão</TableHead>
              <TableHead>Jornada</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFuncionarios.map((funcionario) => (
              <TableRow key={funcionario.id}>
                <TableCell className="font-medium">{funcionario.nome_completo}</TableCell>
                <TableCell>{funcionario.cpf}</TableCell>
                <TableCell>{funcionario.cargo}</TableCell>
                <TableCell>
                  {new Date(funcionario.data_admissao).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>{funcionario.jornada?.nome || '-'}</TableCell>
                <TableCell>
                  <Badge variant={funcionario.status === 'ativo' ? 'default' : 'secondary'}>
                    {funcionario.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(funcionario)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredFuncionarios.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          {searchTerm ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}
        </div>
      )}

      <FuncionarioDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        funcionario={editingFuncionario}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
