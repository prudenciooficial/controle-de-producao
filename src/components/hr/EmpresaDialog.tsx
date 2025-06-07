import React from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { createConfiguracaoEmpresa, updateConfiguracaoEmpresa } from "@/services/hrService";
import type { ConfiguracaoEmpresa } from "@/types/hr";

interface EmpresaForm {
  nome_empresa: string;
  cnpj: string;
  endereco: string;
  telefone?: string;
  email?: string;
  ativa: boolean;
}

interface EmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: ConfiguracaoEmpresa;
  onSuccess: () => void;
}

export function EmpresaDialog({ open, onOpenChange, empresa, onSuccess }: EmpresaDialogProps) {
  const { toast } = useToast();
  const { user, getUserDisplayName } = useAuth();
  const queryClient = useQueryClient();

  const isEdit = Boolean(empresa);

  const createMutation = useMutation({
    mutationFn: (data: Omit<ConfiguracaoEmpresa, 'id' | 'created_at' | 'updated_at'>) =>
      createConfiguracaoEmpresa(data, user?.id, getUserDisplayName()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-empresas'] });
      toast({
        title: "Sucesso",
        description: "Empresa cadastrada com sucesso!",
      });
      onSuccess();
    },
    onError: (error) => {
      console.error('Erro ao criar empresa:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao cadastrar empresa. Tente novamente.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ConfiguracaoEmpresa> }) =>
      updateConfiguracaoEmpresa(id, data, user?.id, getUserDisplayName()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-empresas'] });
      toast({
        title: "Sucesso",
        description: "Empresa atualizada com sucesso!",
      });
      onSuccess();
    },
    onError: (error) => {
      console.error('Erro ao atualizar empresa:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar empresa. Tente novamente.",
      });
    },
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<EmpresaForm>({
    defaultValues: {
      nome_empresa: empresa?.nome_empresa || '',
      cnpj: empresa?.cnpj || '',
      endereco: empresa?.endereco || '',
      telefone: empresa?.telefone || '',
      email: empresa?.email || '',
      ativa: empresa?.ativa ?? true,
    },
  });

  React.useEffect(() => {
    if (empresa) {
      reset({
        nome_empresa: empresa.nome_empresa,
        cnpj: empresa.cnpj,
        endereco: empresa.endereco,
        telefone: empresa.telefone || '',
        email: empresa.email || '',
        ativa: empresa.ativa,
      });
    } else {
      reset({
        nome_empresa: '',
        cnpj: '',
        endereco: '',
        telefone: '',
        email: '',
        ativa: true,
      });
    }
  }, [empresa, reset]);

  const onSubmit = async (data: EmpresaForm) => {
    if (isEdit && empresa) {
      updateMutation.mutate({
        id: empresa.id,
        data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCNPJ = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatTelefone = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const ativaValue = watch('ativa');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Empresa' : 'Nova Empresa'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Edite as informações da empresa abaixo.'
              : 'Preencha as informações para cadastrar uma nova empresa.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
              <Input
                id="nome_empresa"
                {...register('nome_empresa', { required: 'Nome da empresa é obrigatório' })}
              />
              {errors.nome_empresa && (
                <p className="text-sm text-red-500">{errors.nome_empresa.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
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
              <Label htmlFor="endereco">Endereço Completo *</Label>
              <Textarea
                id="endereco"
                {...register('endereco', { required: 'Endereço é obrigatório' })}
                rows={3}
              />
              {errors.endereco && (
                <p className="text-sm text-red-500">{errors.endereco.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                {...register('telefone')}
                onChange={(e) => {
                  e.target.value = formatTelefone(e.target.value);
                }}
                maxLength={15}
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="empresa@exemplo.com"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativa"
                checked={ativaValue}
                onCheckedChange={(checked) => setValue('ativa', checked)}
              />
              <Label htmlFor="ativa">Empresa ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending 
                ? 'Salvando...' 
                : isEdit ? 'Atualizar' : 'Cadastrar'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 