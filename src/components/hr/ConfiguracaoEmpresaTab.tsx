import React from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getConfiguracaoEmpresa, updateConfiguracaoEmpresa } from "@/services/hrService";
import type { ConfiguracaoEmpresa } from "@/types/hr";

interface ConfigForm {
  nome_empresa: string;
  cnpj: string;
  endereco: string;
}

export function ConfiguracaoEmpresaTab() {
  const { toast } = useToast();
  const { user, getUserDisplayName } = useAuth();
  const queryClient = useQueryClient();

  const { data: configuracao, isLoading } = useQuery({
    queryKey: ['configuracao-empresa'],
    queryFn: getConfiguracaoEmpresa,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ConfiguracaoEmpresa> }) =>
      updateConfiguracaoEmpresa(id, data, user?.id, getUserDisplayName()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracao-empresa'] });
      toast({
        title: "Sucesso",
        description: "Configurações da empresa atualizadas com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar configurações. Tente novamente.",
      });
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ConfigForm>({
    defaultValues: {
      nome_empresa: configuracao?.nome_empresa || '',
      cnpj: configuracao?.cnpj || '',
      endereco: configuracao?.endereco || '',
    },
  });

  React.useEffect(() => {
    if (configuracao) {
      reset({
        nome_empresa: configuracao.nome_empresa,
        cnpj: configuracao.cnpj,
        endereco: configuracao.endereco,
      });
    }
  }, [configuracao, reset]);

  const onSubmit = async (data: ConfigForm) => {
    if (!configuracao?.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "ID da configuração não encontrado.",
      });
      return;
    }

    updateMutation.mutate({
      id: configuracao.id,
      data,
    });
  };

  const formatCNPJ = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  if (isLoading) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome_empresa">Nome da Empresa</Label>
            <Input
              id="nome_empresa"
              {...register('nome_empresa', { required: 'Nome da empresa é obrigatório' })}
            />
            {errors.nome_empresa && (
              <p className="text-sm text-red-500">{errors.nome_empresa.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              {...register('cnpj', { required: 'CNPJ é obrigatório' })}
              onChange={(e) => {
                e.target.value = formatCNPJ(e.target.value);
              }}
              maxLength={18}
            />
            {errors.cnpj && (
              <p className="text-sm text-red-500">{errors.cnpj.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço Completo</Label>
            <Textarea
              id="endereco"
              {...register('endereco', { required: 'Endereço é obrigatório' })}
              rows={3}
            />
            {errors.endereco && (
              <p className="text-sm text-red-500">{errors.endereco.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting || updateMutation.isPending} className="w-full sm:w-auto">
            {isSubmitting || updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
}
