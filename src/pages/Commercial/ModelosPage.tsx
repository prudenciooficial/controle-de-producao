import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, FileText, Save, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { atualizarTodosModelosSemVariaveis } from '@/utils/atualizarVariaveisModelos';

interface ModeloContrato {
  id: string;
  nome: string;
  descricao?: string;
  conteudo: string;
  variaveis: Array<{
    nome: string;
    label: string;
    tipo: string;
    obrigatorio: boolean;
  }>;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export default function ModelosPage() {
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloContrato | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewModelo, setPreviewModelo] = useState<ModeloContrato | null>(null);
  const [atualizandoVariaveis, setAtualizandoVariaveis] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
    ativo: true
  });

  useEffect(() => {
    loadModelos();
  }, []);

  const loadModelos = async () => {
    try {
      const { data, error } = await supabase
        .from('modelos_contratos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setModelos(data || []);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar modelos de contratos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarModelo = async () => {
    try {
      if (!formData.nome.trim() || !formData.conteudo.trim()) {
        toast({
          variant: "destructive",
          title: "Campos obrigatórios",
          description: "Nome e conteúdo são obrigatórios.",
        });
        return;
      }

      // Extrair e processar variáveis do conteúdo
      const variaveisDetectadas = extrairVariaveis(formData.conteudo);
      const variaveisProcessadas = variaveisDetectadas.map(nome => ({
        nome,
        rotulo: nome.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()),
        tipo: 'text',
        obrigatorio: true,
        placeholder: `Digite ${nome.replace(/_/g, ' ').toLowerCase()}`
      }));

      const dadosModelo = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        conteudo: formData.conteudo,
        variaveis: variaveisProcessadas,
        ativo: formData.ativo
      };

      if (editingModelo) {
        const { error } = await supabase
          .from('modelos_contratos')
          .update(dadosModelo)
          .eq('id', editingModelo.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('modelos_contratos')
          .insert([{
            ...dadosModelo,
            criado_por: (await supabase.auth.getUser()).data.user?.id
          }]);

        if (error) throw error;
      }

      toast({
        title: 'Sucesso',
        description: `Modelo ${editingModelo ? 'atualizado' : 'criado'} com sucesso!`
      });

      setDialogOpen(false);
      resetForm();
      loadModelos();
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar modelo.",
      });
    }
  };

  const handleExcluirModelo = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

    try {
      const { error } = await supabase
        .from('modelos_contratos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Modelo excluído com sucesso!'
      });

      loadModelos();
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir modelo.",
      });
    }
  };

  const openEditDialog = (modelo: ModeloContrato) => {
    setEditingModelo(modelo);
    setFormData({
      nome: modelo.nome,
      descricao: modelo.descricao || '',
      conteudo: modelo.conteudo,
      ativo: modelo.ativo
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      conteudo: '',
      ativo: true
    });
    setEditingModelo(null);
  };

  const openPreview = (modelo: ModeloContrato) => {
    setPreviewModelo(modelo);
    setPreviewOpen(true);
  };

  const extrairVariaveis = (conteudo: string) => {
    const regex = /\[([A-Z_]+)\]/g;
    const variaveis = [];
    let match;

    while ((match = regex.exec(conteudo)) !== null) {
      if (!variaveis.includes(match[1])) {
        variaveis.push(match[1]);
      }
    }

    return variaveis;
  };

  const atualizarVariaveisModelo = async (modelo: any) => {
    try {
      const variaveisDetectadas = extrairVariaveis(modelo.conteudo);
      const variaveisProcessadas = variaveisDetectadas.map(nome => ({
        nome,
        rotulo: nome.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()),
        tipo: 'text',
        obrigatorio: true,
        placeholder: `Digite ${nome.replace(/_/g, ' ').toLowerCase()}`
      }));

      const { error } = await supabase
        .from('modelos_contratos')
        .update({ variaveis: variaveisProcessadas })
        .eq('id', modelo.id);

      if (error) throw error;

      toast({
        title: 'Variáveis atualizadas',
        description: `${variaveisDetectadas.length} variáveis detectadas e salvas no modelo.`
      });

      loadModelos(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao atualizar variáveis:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar variáveis do modelo.",
      });
    }
  };

  const atualizarTodosModelos = async () => {
    setAtualizandoVariaveis(true);
    try {
      const resultado = await atualizarTodosModelosSemVariaveis();

      toast({
        title: 'Variáveis atualizadas!',
        description: `${resultado.atualizados} modelos foram atualizados com suas variáveis.`
      });

      loadModelos(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao atualizar modelos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar variáveis dos modelos.",
      });
    } finally {
      setAtualizandoVariaveis(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando modelos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modelos de Contratos</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie modelos de contratos com variáveis substituíveis
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={atualizarTodosModelos}
            disabled={atualizandoVariaveis}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${atualizandoVariaveis ? 'animate-spin' : ''}`} />
            {atualizandoVariaveis ? 'Atualizando...' : 'Detectar Variáveis'}
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Modelo
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingModelo ? 'Editar Modelo' : 'Novo Modelo de Contrato'}
              </DialogTitle>
              <DialogDescription>
                Crie modelos com variáveis no formato [NOME_VARIAVEL] que serão substituídas ao gerar contratos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome do Modelo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Contrato de Representação Comercial"
                  />
                </div>
                <div>
                  <Label htmlFor="ativo">Status</Label>
                  <select
                    id="ativo"
                    value={formData.ativo ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional do modelo"
                />
              </div>

              <div>
                <Label htmlFor="conteudo">Conteúdo do Contrato *</Label>
                <Textarea
                  id="conteudo"
                  value={formData.conteudo}
                  onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                  placeholder="Digite o conteúdo do contrato usando variáveis como [NOME_REPRESENTANTE], [CNPJ_REPRESENTANTE], etc."
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use variáveis no formato [NOME_VARIAVEL]. Exemplo: [NOME_REPRESENTANTE], [CNPJ_REPRESENTANTE]
                </p>
              </div>

              {formData.conteudo && (
                <div>
                  <Label>Variáveis Detectadas</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {extrairVariaveis(formData.conteudo).map((variavel) => (
                      <Badge key={variavel} variant="secondary">
                        {variavel}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSalvarModelo}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingModelo ? 'Atualizar' : 'Criar'} Modelo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
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
                <p><strong>Variáveis:</strong> {modelo.variaveis?.length || 0}</p>
                <p><strong>Criado em:</strong> {new Date(modelo.criado_em).toLocaleDateString('pt-BR')}</p>
                
                {modelo.variaveis && modelo.variaveis.length > 0 && (
                  <div>
                    <p><strong>Variáveis detectadas:</strong></p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {modelo.variaveis.slice(0, 3).map((variavel) => (
                        <Badge key={variavel.nome} variant="outline" className="text-xs">
                          {variavel.nome}
                        </Badge>
                      ))}
                      {modelo.variaveis.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{modelo.variaveis.length - 3} mais
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPreview(modelo)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(modelo)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExcluirModelo(modelo.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Botão para atualizar variáveis se não existirem */}
              {(!modelo.variaveis || modelo.variaveis.length === 0) && (
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => atualizarVariaveisModelo(modelo)}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Detectar Variáveis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {modelos.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum modelo encontrado
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Comece criando seu primeiro modelo de contrato.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Modelo
          </Button>
        </div>
      )}

      {/* Dialog de Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewModelo?.nome}</DialogTitle>
            <DialogDescription>
              Visualização do modelo de contrato
            </DialogDescription>
          </DialogHeader>

          {previewModelo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Status:</strong> {previewModelo.ativo ? 'Ativo' : 'Inativo'}
                </div>
                <div>
                  <strong>Variáveis:</strong> {previewModelo.variaveis?.length || 0}
                </div>
              </div>

              {previewModelo.variaveis && previewModelo.variaveis.length > 0 && (
                <div>
                  <Label>Variáveis do Modelo</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewModelo.variaveis.map((variavel) => (
                      <Badge key={variavel.nome} variant="secondary">
                        {variavel.nome}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Conteúdo do Contrato</Label>
                <div className="mt-2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {previewModelo.conteudo}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
