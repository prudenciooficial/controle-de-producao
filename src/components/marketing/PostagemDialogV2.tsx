import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { createPostagem, updatePostagem } from '@/services/marketingService';

interface PostagemDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postagem?: any;
  onSave: () => void;
  dataInicial?: Date;
}

const PostagemDialogV2: React.FC<PostagemDialogV2Props> = ({ open, onOpenChange, postagem, onSave, dataInicial }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    data_postagem: '',
    tema: '',
    descricao: '',
    rede_social: '',
    status: 'planejada',
    observacoes: '',
    eh_sugestao_ia: false
  });

  const redesSociais = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' }
  ];

  const statusOptions = [
    { value: 'planejada', label: 'Planejada' },
    { value: 'aprovada', label: 'Aprovada' },
    { value: 'publicada', label: 'Publicada' },
    { value: 'cancelada', label: 'Cancelada' }
  ];

  const temasComuns = [
    'Nossa Goma',
    'Tapioca',
    'Receitas',
    'Tradição Nordestina',
    'Família',
    'Valores Católicos',
    'Saúde e Alimentação',
    'Fotografia',
    'Dia dos Pais',
    'Dia das Mães'
  ];

  useEffect(() => {
    if (postagem) {
      setFormData({
        data_postagem: postagem.data_postagem,
        tema: postagem.tema || '',
        descricao: postagem.descricao || '',
        rede_social: postagem.rede_social || '',
        status: postagem.status || 'planejada',
        observacoes: postagem.observacoes || '',
        eh_sugestao_ia: postagem.eh_sugestao_ia || false
      });
    } else {
      setFormData({
        data_postagem: dataInicial ? format(dataInicial, 'yyyy-MM-dd') : '',
        tema: '',
        descricao: '',
        rede_social: '',
        status: 'planejada',
        observacoes: '',
        eh_sugestao_ia: false
      });
    }
  }, [postagem, dataInicial, open]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data_postagem || !formData.tema) {
      toast({ title: 'Erro', description: 'Data e tema são obrigatórios', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      if (postagem?.id) {
        await updatePostagem(postagem.id, formData);
      } else {
        await createPostagem(formData as any);
      }
      toast({ title: 'Sucesso', description: postagem?.id ? 'Postagem atualizada com sucesso!' : 'Postagem criada com sucesso!' });
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar postagem:', error);
      toast({ title: 'Erro', description: error?.message || 'Erro ao salvar postagem', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{postagem ? 'Editar Postagem' : 'Nova Postagem'}</DialogTitle>
          <DialogDescription>{postagem ? 'Edite os dados da postagem' : 'Crie uma nova postagem para o cronograma'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_postagem">Data da Postagem *</Label>
              <Input id="data_postagem" type="date" value={formData.data_postagem} onChange={(e)=>handleInputChange('data_postagem', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rede_social">Rede Social</Label>
              <Select value={formData.rede_social} onValueChange={(v)=>handleInputChange('rede_social', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione a rede social"/></SelectTrigger>
                <SelectContent>
                  {redesSociais.map(rede => (<SelectItem key={rede.value} value={rede.value}>{rede.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tema">Tema *</Label>
            <Input id="tema" value={formData.tema} onChange={(e)=>handleInputChange('tema', e.target.value)} placeholder="Digite o tema da postagem" required />
            <div className="flex flex-wrap gap-1 mt-2">
              {temasComuns.map(tema => (
                <Button key={tema} type="button" variant="outline" size="sm" onClick={()=>handleInputChange('tema', tema)} className="text-xs">{tema}</Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" value={formData.descricao} onChange={(e)=>handleInputChange('descricao', e.target.value)} placeholder="Descreva o conteúdo da postagem" rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v)=>handleInputChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-center gap-2">
              <Label htmlFor="eh_sugestao_ia">Sugestão de IA</Label>
              <Switch id="eh_sugestao_ia" checked={formData.eh_sugestao_ia} onCheckedChange={(v)=>handleInputChange('eh_sugestao_ia', v)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" value={formData.observacoes} onChange={(e)=>handleInputChange('observacoes', e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={()=>onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : postagem ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PostagemDialogV2;

