import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Save, Send, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

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
}

interface ContratoComercial {
  id?: string;
  modelo_id: string;
  titulo: string;
  conteudo: string;
  dados_variaveis: Record<string, string>;
  assinante_externo_nome: string;
  assinante_externo_email: string;
  assinante_externo_documento: string;
  assinante_interno_id?: string;
  status: string;
}

export default function EditorContratosPage() {
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloContrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [conteudoPreview, setConteudoPreview] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    titulo: '',
    assinante_externo_nome: '',
    assinante_externo_email: '',
    assinante_externo_documento: '',
    dados_variaveis: {} as Record<string, string>
  });

  useEffect(() => {
    loadModelos();
  }, []);

  const loadModelos = async () => {
    try {
      const { data, error } = await supabase
        .from('modelos_contratos')
        .select('*')
        .eq('ativo', true)
        .order('nome');

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

  const handleModeloChange = (modeloId: string) => {
    const modelo = modelos.find(m => m.id === modeloId);
    if (modelo) {
      setModeloSelecionado(modelo);
      
      // Inicializar dados das variáveis
      const dadosIniciais: Record<string, string> = {};
      modelo.variaveis?.forEach(variavel => {
        dadosIniciais[variavel.nome] = '';
      });
      
      setFormData(prev => ({
        ...prev,
        titulo: `Contrato - ${modelo.nome}`,
        dados_variaveis: dadosIniciais
      }));
    }
  };

  const handleVariavelChange = (nomeVariavel: string, valor: string) => {
    setFormData(prev => ({
      ...prev,
      dados_variaveis: {
        ...prev.dados_variaveis,
        [nomeVariavel]: valor
      }
    }));
  };

  const substituirVariaveis = (conteudo: string, dados: Record<string, string>) => {
    let conteudoFinal = conteudo;
    
    Object.entries(dados).forEach(([variavel, valor]) => {
      const regex = new RegExp(`\\[${variavel}\\]`, 'g');
      conteudoFinal = conteudoFinal.replace(regex, valor || `[${variavel}]`);
    });
    
    return conteudoFinal;
  };

  const handlePreview = () => {
    if (!modeloSelecionado) return;
    
    const conteudo = substituirVariaveis(modeloSelecionado.conteudo, formData.dados_variaveis);
    setConteudoPreview(conteudo);
    setPreviewOpen(true);
  };

  const validarFormulario = () => {
    if (!modeloSelecionado) {
      toast({
        variant: "destructive",
        title: "Modelo obrigatório",
        description: "Selecione um modelo de contrato.",
      });
      return false;
    }

    if (!formData.titulo.trim()) {
      toast({
        variant: "destructive",
        title: "Título obrigatório",
        description: "Digite um título para o contrato.",
      });
      return false;
    }

    if (!formData.assinante_externo_nome.trim() || 
        !formData.assinante_externo_email.trim() || 
        !formData.assinante_externo_documento.trim()) {
      toast({
        variant: "destructive",
        title: "Dados do signatário obrigatórios",
        description: "Preencha todos os dados do signatário externo.",
      });
      return false;
    }

    // Validar variáveis obrigatórias
    const variaveisObrigatorias = modeloSelecionado.variaveis?.filter(v => v.obrigatorio) || [];
    const variaveisVazias = variaveisObrigatorias.filter(v => !formData.dados_variaveis[v.nome]?.trim());
    
    if (variaveisVazias.length > 0) {
      toast({
        variant: "destructive",
        title: "Variáveis obrigatórias",
        description: `Preencha as variáveis: ${variaveisVazias.map(v => v.nome).join(', ')}`,
      });
      return false;
    }

    return true;
  };

  const handleSalvarRascunho = async () => {
    if (!validarFormulario()) return;

    setSalvando(true);
    try {
      const user = await supabase.auth.getUser();
      const conteudoFinal = substituirVariaveis(modeloSelecionado!.conteudo, formData.dados_variaveis);

      const contratoData = {
        modelo_id: modeloSelecionado!.id,
        titulo: formData.titulo,
        conteudo: conteudoFinal,
        dados_variaveis: formData.dados_variaveis,
        assinante_externo_nome: formData.assinante_externo_nome,
        assinante_externo_email: formData.assinante_externo_email,
        assinante_externo_documento: formData.assinante_externo_documento,
        assinante_interno_id: user.data.user?.id,
        status: 'editando',
        criado_por: user.data.user?.id
      };

      const { error } = await supabase
        .from('contratos_comerciais')
        .insert([contratoData]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Contrato salvo como rascunho!'
      });

      navigate('/comercial');
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar contrato.",
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleFinalizarEIniciarAssinaturas = async () => {
    if (!validarFormulario()) return;

    setSalvando(true);
    try {
      const user = await supabase.auth.getUser();
      const conteudoFinal = substituirVariaveis(modeloSelecionado!.conteudo, formData.dados_variaveis);

      const contratoData = {
        modelo_id: modeloSelecionado!.id,
        titulo: formData.titulo,
        conteudo: conteudoFinal,
        dados_variaveis: formData.dados_variaveis,
        assinante_externo_nome: formData.assinante_externo_nome,
        assinante_externo_email: formData.assinante_externo_email,
        assinante_externo_documento: formData.assinante_externo_documento,
        assinante_interno_id: user.data.user?.id,
        status: 'aguardando_assinatura_interna',
        criado_por: user.data.user?.id
      };

      const { data: contrato, error } = await supabase
        .from('contratos_comerciais')
        .insert([contratoData])
        .select()
        .single();

      if (error) throw error;

      // Registrar log de auditoria
      await supabase
        .from('logs_auditoria_contratos_comerciais')
        .insert([{
          contrato_id: contrato.id,
          evento: 'contrato_criado',
          descricao: 'Contrato criado e finalizado para assinatura',
          dados_evento: { titulo: formData.titulo, modelo: modeloSelecionado!.nome },
          usuario_id: user.data.user?.id
        }]);

      toast({
        title: 'Sucesso',
        description: 'Contrato finalizado! Processo de assinatura iniciado.'
      });

      navigate('/comercial');
    } catch (error) {
      console.error('Erro ao finalizar contrato:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao finalizar contrato.",
      });
    } finally {
      setSalvando(false);
    }
  };

  const formatarLabel = (nomeVariavel: string) => {
    return nomeVariavel
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
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
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/comercial')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Contrato</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Selecione um modelo e preencha as variáveis para gerar o contrato
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seleção do Modelo */}
          <Card>
            <CardHeader>
              <CardTitle>1. Selecionar Modelo</CardTitle>
              <CardDescription>
                Escolha o modelo de contrato que será usado como base
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="modelo">Modelo de Contrato *</Label>
                  <Select onValueChange={handleModeloChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um modelo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {modelos.map((modelo) => (
                        <SelectItem key={modelo.id} value={modelo.id}>
                          {modelo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {modeloSelecionado && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Descrição:</strong> {modeloSelecionado.descricao || 'Sem descrição'}
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      <strong>Variáveis:</strong> {modeloSelecionado.variaveis?.length || 0} campos para preencher
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dados Básicos */}
          {modeloSelecionado && (
            <Card>
              <CardHeader>
                <CardTitle>2. Dados Básicos do Contrato</CardTitle>
                <CardDescription>
                  Informações gerais sobre o contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="titulo">Título do Contrato *</Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      placeholder="Ex: Contrato de Representação Comercial - Empresa XYZ"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados do Signatário Externo */}
          {modeloSelecionado && (
            <Card>
              <CardHeader>
                <CardTitle>3. Dados do Signatário Externo</CardTitle>
                <CardDescription>
                  Informações da pessoa/empresa que assinará o contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assinante_nome">Nome/Razão Social *</Label>
                    <Input
                      id="assinante_nome"
                      value={formData.assinante_externo_nome}
                      onChange={(e) => setFormData({ ...formData, assinante_externo_nome: e.target.value })}
                      placeholder="Nome completo ou razão social"
                    />
                  </div>
                  <div>
                    <Label htmlFor="assinante_email">E-mail *</Label>
                    <Input
                      id="assinante_email"
                      type="email"
                      value={formData.assinante_externo_email}
                      onChange={(e) => setFormData({ ...formData, assinante_externo_email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="assinante_documento">CPF/CNPJ *</Label>
                    <Input
                      id="assinante_documento"
                      value={formData.assinante_externo_documento}
                      onChange={(e) => setFormData({ ...formData, assinante_externo_documento: e.target.value })}
                      placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar com Variáveis */}
        <div className="space-y-6">
          {modeloSelecionado && modeloSelecionado.variaveis && modeloSelecionado.variaveis.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>4. Variáveis do Contrato</CardTitle>
                <CardDescription>
                  Preencha os campos que serão substituídos no contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modeloSelecionado.variaveis.map((variavel) => (
                    <div key={variavel.nome}>
                      <Label htmlFor={variavel.nome}>
                        {formatarLabel(variavel.nome)}
                        {variavel.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input
                        id={variavel.nome}
                        value={formData.dados_variaveis[variavel.nome] || ''}
                        onChange={(e) => handleVariavelChange(variavel.nome, e.target.value)}
                        placeholder={`Digite ${formatarLabel(variavel.nome).toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          {modeloSelecionado && (
            <Card>
              <CardHeader>
                <CardTitle>5. Ações</CardTitle>
                <CardDescription>
                  Visualize e finalize o contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    className="w-full"
                    disabled={!modeloSelecionado}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar Contrato
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleSalvarRascunho}
                    className="w-full"
                    disabled={salvando}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {salvando ? 'Salvando...' : 'Salvar Rascunho'}
                  </Button>
                  
                  <Button
                    onClick={handleFinalizarEIniciarAssinaturas}
                    className="w-full"
                    disabled={salvando}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {salvando ? 'Finalizando...' : 'Finalizar e Iniciar Assinaturas'}
                  </Button>
                  
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Ao finalizar, o contrato não poderá mais ser editado e o processo de assinatura será iniciado.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog de Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview do Contrato</DialogTitle>
            <DialogDescription>
              Visualização do contrato com as variáveis preenchidas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {conteudoPreview}
              </pre>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
