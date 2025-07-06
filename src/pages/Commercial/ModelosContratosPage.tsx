import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash, 
  Eye,
  Save,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { ModeloContrato, VariavelContrato } from '@/types';
import type { Json } from '@/integrations/supabase/types';
import { updateModeloContrato, excluirModeloContrato } from '@/services/commercialService';

const ModelosContratosPage = () => {
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloContrato | null>(null);
  const [novoModelo, setNovoModelo] = useState<Partial<ModeloContrato>>({
    nome: '',
    descricao: '',
    conteudo: '',
    variaveis: [],
    ativo: true
  });
  const [novaVariavel, setNovaVariavel] = useState<VariavelContrato>({
    nome: '',
    rotulo: '',
    tipo: 'text',
    obrigatorio: false,
    placeholder: '',
    opcoes: []
  });
  const { toast } = useToast();

  useEffect(() => {
    carregarModelos();
  }, []);

  const carregarModelos = async () => {
    try {
      const { data, error } = await supabase
        .from('modelos_contratos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const modelosFormatados: ModeloContrato[] = data.map(item => ({
        id: item.id,
        nome: item.nome,
        descricao: item.descricao || '',
        conteudo: item.conteudo,
        variaveis: typeof item.variaveis === 'string' ? (JSON.parse(item.variaveis) as VariavelContrato[]) : (item.variaveis as unknown as VariavelContrato[] || []),
        ativo: item.ativo,
        criadoEm: new Date(item.criado_em || new Date()),
        atualizadoEm: new Date(item.atualizado_em || new Date()),
        criadoPor: item.criado_por || ''
      }));

      setModelos(modelosFormatados);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar modelos de contrato',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarModelo = async () => {
    try {
      const dadosModelo = {
        nome: novoModelo.nome,
        descricao: novoModelo.descricao,
        conteudo: novoModelo.conteudo,
        variaveis: novoModelo.variaveis || [],
        ativo: novoModelo.ativo
      };

      if (editingModelo) {
        await updateModeloContrato(editingModelo.id, dadosModelo);
      } else {
        // Criar novo modelo
        const resultado = await supabase
          .from('modelos_contratos')
          .insert([{
            ...dadosModelo,
            variaveis: novoModelo.variaveis as unknown as Json,
            criado_por: (await supabase.auth.getUser()).data.user?.id
          }]);
        if (resultado.error) throw resultado.error;
      }

      toast({
        title: 'Sucesso',
        description: `Modelo ${editingModelo ? 'atualizado' : 'criado'} com sucesso!`
      });

      setShowModal(false);
      setEditingModelo(null);
      setNovoModelo({
        nome: '',
        descricao: '',
        conteudo: '',
        variaveis: [],
        ativo: true
      });
      carregarModelos();

    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar modelo',
        variant: 'destructive'
      });
    }
  };

  const handleEditarModelo = (modelo: ModeloContrato) => {
    setEditingModelo(modelo);
    setNovoModelo({
      nome: modelo.nome,
      descricao: modelo.descricao,
      conteudo: modelo.conteudo,
      variaveis: modelo.variaveis,
      ativo: modelo.ativo
    });
    setShowModal(true);
  };

  const handleExcluirModelo = async (modelo: ModeloContrato) => {
    if (!confirm(`Tem certeza que deseja excluir o modelo "${modelo.nome}"?`)) {
      return;
    }

    try {
      await excluirModeloContrato(modelo.id);
      toast({
        title: 'Sucesso',
        description: 'Modelo excluído com sucesso!'
      });
      carregarModelos();
    } catch (error: unknown) {
      console.error('Erro ao excluir modelo:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir modelo',
        variant: 'destructive'
      });
    }
  };

  const handleAdicionarVariavel = () => {
    if (!novaVariavel.nome || !novaVariavel.rotulo) {
      toast({
        title: 'Erro',
        description: 'Nome e rótulo da variável são obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    const variaveisAtuais = novoModelo.variaveis || [];
    setNovoModelo({
      ...novoModelo,
      variaveis: [...variaveisAtuais, { ...novaVariavel }]
    });

    // Resetar nova variável
    setNovaVariavel({
      nome: '',
      rotulo: '',
      tipo: 'text',
      obrigatorio: false,
      placeholder: '',
      opcoes: []
    });
  };

  const handleRemoverVariavel = (index: number) => {
    const variaveisAtuais = novoModelo.variaveis || [];
    setNovoModelo({
      ...novoModelo,
      variaveis: variaveisAtuais.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Modelos de Contratos
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie os modelos de contratos disponíveis no sistema
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Modelo
        </Button>
      </div>

      {/* Lista de Modelos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modelos.map((modelo) => (
          <Card key={modelo.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{modelo.nome}</CardTitle>
                  <CardDescription className="mt-1">
                    {modelo.descricao || 'Sem descrição'}
                  </CardDescription>
                </div>
                <Badge variant={modelo.ativo ? "default" : "secondary"}>
                  {modelo.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Variáveis:</strong> {modelo.variaveis.length}</p>
                <p><strong>Criado em:</strong> {modelo.criadoEm.toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleEditarModelo(modelo)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleExcluirModelo(modelo)}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {modelos.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Nenhum modelo encontrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Comece criando seu primeiro modelo de contrato
          </p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Modelo
          </Button>
        </div>
      )}

      {/* Modal para Criar/Editar Modelo */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModelo ? 'Editar Modelo' : 'Novo Modelo de Contrato'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Dados Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome do Modelo *</Label>
                <Input
                  value={novoModelo.nome}
                  onChange={(e) => setNovoModelo({...novoModelo, nome: e.target.value})}
                  placeholder="Ex: Contrato de Prestação de Serviços"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select 
                  value={novoModelo.ativo ? 'true' : 'false'}
                  onValueChange={(value) => setNovoModelo({...novoModelo, ativo: value === 'true'})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={novoModelo.descricao}
                onChange={(e) => setNovoModelo({...novoModelo, descricao: e.target.value})}
                placeholder="Breve descrição do modelo"
              />
            </div>

            {/* Conteúdo do Contrato */}
            <div>
              <Label>Conteúdo do Contrato *</Label>
              <Textarea
                value={novoModelo.conteudo}
                onChange={(e) => setNovoModelo({...novoModelo, conteudo: e.target.value})}
                placeholder="Digite o conteúdo do contrato. Use variáveis como {{NOME_CLIENTE}} para campos que serão preenchidos posteriormente."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use variáveis no formato {"{{NOME_VARIAVEL}}"} para campos que serão preenchidos ao criar o contrato.
              </p>
            </div>

            {/* Seção de Variáveis */}
            <div>
              <Label className="text-lg font-medium">Variáveis do Contrato</Label>
              
              {/* Lista de Variáveis Existentes */}
              {(novoModelo.variaveis || []).length > 0 && (
                <div className="mt-4 space-y-2">
                  {(novoModelo.variaveis || []).map((variavel, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{variavel.rotulo}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({"{{" + variavel.nome + "}}"} - {variavel.tipo})
                          {variavel.obrigatorio && <Badge variant="secondary" className="ml-2">Obrigatório</Badge>}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleRemoverVariavel(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form para Nova Variável */}
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-3">Adicionar Nova Variável</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Nome da Variável</Label>
                    <Input
                      value={novaVariavel.nome}
                      onChange={(e) => setNovaVariavel({...novaVariavel, nome: e.target.value})}
                      placeholder="NOME_CLIENTE"
                    />
                  </div>
                  <div>
                    <Label>Rótulo</Label>
                    <Input
                      value={novaVariavel.rotulo}
                      onChange={(e) => setNovaVariavel({...novaVariavel, rotulo: e.target.value})}
                      placeholder="Nome do Cliente"
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select 
                      value={novaVariavel.tipo}
                      onValueChange={(value) => setNovaVariavel({...novaVariavel, tipo: value as 'text' | 'textarea' | 'date' | 'currency' | 'number' | 'email' | 'select'})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="textarea">Texto Longo</SelectItem>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="currency">Moeda</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="select">Lista de Opções</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Placeholder</Label>
                    <Input
                      value={novaVariavel.placeholder}
                      onChange={(e) => setNovaVariavel({...novaVariavel, placeholder: e.target.value})}
                      placeholder="Digite o nome completo..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={novaVariavel.obrigatorio}
                      onChange={(e) => setNovaVariavel({...novaVariavel, obrigatorio: e.target.checked})}
                    />
                    Campo Obrigatório
                  </label>
                  <Button 
                    size="sm" 
                    onClick={handleAdicionarVariavel}
                    type="button"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSalvarModelo}
                disabled={!novoModelo.nome || !novoModelo.conteudo}
              >
                <Save className="w-4 h-4 mr-2" />
                {editingModelo ? 'Atualizar' : 'Criar'} Modelo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModelosContratosPage;
