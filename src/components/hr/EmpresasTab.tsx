import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getConfiguracoesEmpresas, deleteConfiguracaoEmpresa } from "@/services/hrService";
import { EmpresaDialog } from "./EmpresaDialog";
import type { ConfiguracaoEmpresa } from "@/types/hr";

export function EmpresasTab() {
  const { toast } = useToast();
  const { user, getUserDisplayName } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<ConfiguracaoEmpresa | undefined>();

  const { data: empresas, isLoading } = useQuery({
    queryKey: ['configuracoes-empresas'],
    queryFn: getConfiguracoesEmpresas,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteConfiguracaoEmpresa(id, user?.id, getUserDisplayName()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-empresas'] });
      toast({
        title: "Sucesso",
        description: "Empresa excluída com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao deletar empresa:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir empresa. Tente novamente.",
      });
    },
  });

  const handleEdit = (empresa: ConfiguracaoEmpresa) => {
    setSelectedEmpresa(empresa);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedEmpresa(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, nomeEmpresa: string) => {
    if (confirm(`Tem certeza que deseja excluir a empresa "${nomeEmpresa}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  if (isLoading) {
    return <div>Carregando empresas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Empresas Cadastradas</h3>
          <p className="text-muted-foreground">
            Gerencie as empresas para controle de ponto
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {empresas?.map((empresa) => (
          <Card key={empresa.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{empresa.nome_empresa}</CardTitle>
                  <CardDescription className="mt-1">
                    CNPJ: {formatCNPJ(empresa.cnpj)}
                  </CardDescription>
                </div>
                <Badge variant={empresa.ativa ? "default" : "secondary"}>
                  {empresa.ativa ? "Ativa" : "Inativa"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Endereço:</strong>
                  <p className="text-muted-foreground">{empresa.endereco}</p>
                </div>
                {empresa.telefone && (
                  <div>
                    <strong>Telefone:</strong>
                    <p className="text-muted-foreground">{empresa.telefone}</p>
                  </div>
                )}
                {empresa.email && (
                  <div>
                    <strong>Email:</strong>
                    <p className="text-muted-foreground">{empresa.email}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(empresa)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(empresa.id, empresa.nome_empresa)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!empresas || empresas.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhuma empresa cadastrada</p>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar Primeira Empresa
            </Button>
          </CardContent>
        </Card>
      )}

      <EmpresaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        empresa={selectedEmpresa}
        onSuccess={() => {
          setDialogOpen(false);
          setSelectedEmpresa(undefined);
        }}
      />
    </div>
  );
} 