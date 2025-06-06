
import React from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createFuncionario, updateFuncionario, getJornadasTrabalho } from "@/services/hrService";
import type { Funcionario } from "@/types/hr";

interface FuncionarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionario?: Funcionario | null;
  onSuccess: () => void;
}

interface FuncionarioForm {
  nome_completo: string;
  cpf: string;
  cargo: string;
  data_admissao: string;
  jornada_id: string;
  status: 'ativo' | 'inativo';
}

export function FuncionarioDialog({ open, onOpenChange, funcionario, onSuccess }: FuncionarioDialogProps) {
  const { toast } = useToast();
  const isEditing = !!funcionario;

  const { data: jornadas = [] } = useQuery({
    queryKey: ['jornadas-trabalho'],
    queryFn: getJornadasTrabalho,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FuncionarioForm>({
    defaultValues: {
      nome_completo: funcionario?.nome_completo || '',
      cpf: funcionario?.cpf || '',
      cargo: funcionario?.cargo || '',
      data_admissao: funcionario?.data_admissao ? new Date(funcionario.data_admissao).toISOString().split('T')[0] : '',
      jornada_id: funcionario?.jornada_id || '',
      status: funcionario?.status || 'ativo',
    },
  });

  React.useEffect(() => {
    if (funcionario) {
      reset({
        nome_completo: funcionario.nome_completo,
        cpf: funcionario.cpf,
        cargo: funcionario.cargo,
        data_admissao: new Date(funcionario.data_admissao).toISOString().split('T')[0],
        jornada_id: funcionario.jornada_id,
        status: funcionario.status,
      });
    } else {
      reset({
        nome_completo: '',
        cpf: '',
        cargo: '',
        data_admissao: '',
        jornada_id: '',
        status: 'ativo',
      });
    }
  }, [funcionario, reset]);

  const onSubmit = async (data: FuncionarioForm) => {
    try {
      const funcionarioData = {
        ...data,
        data_admissao: new Date(data.data_admissao),
      };

      if (isEditing) {
        await updateFuncionario(funcionario.id, funcionarioData);
      } else {
        await createFuncionario(funcionarioData);
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar funcionário. Tente novamente.",
      });
    }
  };

  const formatCPF = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setValue('cpf', formatted);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Funcionário' : 'Novo Funcionário'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_completo">Nome Completo</Label>
            <Input
              id="nome_completo"
              {...register('nome_completo', { required: 'Nome é obrigatório' })}
              error={errors.nome_completo?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              {...register('cpf', { required: 'CPF é obrigatório' })}
              onChange={handleCPFChange}
              maxLength={14}
              error={errors.cpf?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input
              id="cargo"
              {...register('cargo', { required: 'Cargo é obrigatório' })}
              error={errors.cargo?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_admissao">Data de Admissão</Label>
            <Input
              id="data_admissao"
              type="date"
              {...register('data_admissao', { required: 'Data de admissão é obrigatória' })}
              error={errors.data_admissao?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jornada_id">Jornada de Trabalho</Label>
            <Select
              value={watch('jornada_id')}
              onValueChange={(value) => setValue('jornada_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma jornada" />
              </SelectTrigger>
              <SelectContent>
                {jornadas.map((jornada) => (
                  <SelectItem key={jornada.id} value={jornada.id}>
                    {jornada.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(value: 'ativo' | 'inativo') => setValue('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
