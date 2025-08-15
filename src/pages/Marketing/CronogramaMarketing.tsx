import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Table, Plus, ChevronLeft, ChevronRight, Edit, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PostagemDialogV2 from '@/components/marketing/PostagemDialogV2';
import { SugestoesIAModal } from '@/components/marketing/SugestoesIAModal';
import { useToast } from '@/hooks/use-toast';
import { createPostagem, deleteDataEspecial, deletePostagem, fetchCronograma, fetchDatasEspeciais, updateDataEspecial, getSugestoesIAMock, type PostagemCronograma, type DataEspecial, type SugestaoIA } from '@/services/marketingService';

const CronogramaMarketing: React.FC = () => {
  const [postagens, setPostagens] = useState<PostagemCronograma[]>([]);
  const [datasEspeciais, setDatasEspeciais] = useState<DataEspecial[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [postagemEditando, setPostagemEditando] = useState<PostagemCronograma | undefined>();
  const [dataInicialDialog, setDataInicialDialog] = useState<Date | undefined>();
  const [modalSugestoesOpen, setModalSugestoesOpen] = useState(false);
  const [sugestoesIA, setSugestoesIA] = useState<SugestaoIA[]>([]);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [datasEspeciaisSemPostagem, setDatasEspeciaisSemPostagem] = useState(0);
  const [modalDataEspecialOpen, setModalDataEspecialOpen] = useState(false);
  const [dataEspecialEditando, setDataEspecialEditando] = useState<DataEspecial | undefined>();
  const [modalPostagemOpen, setModalPostagemOpen] = useState(false);
  const [postagemVisualizando, setPostagemVisualizando] = useState<PostagemCronograma | undefined>();
  const { toast } = useToast();

  const statusColors = useMemo(() => ({
    planejada: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    aprovada: 'bg-blue-100 text-blue-800 border-blue-200',
    publicada: 'bg-green-100 text-green-800 border-green-200',
    cancelada: 'bg-red-100 text-red-800 border-red-200'
  }), []);

  const tipoColors = useMemo(() => ({
    catolica: 'bg-purple-100 text-purple-800',
    comemorativa: 'bg-pink-100 text-pink-800',
    nacional: 'bg-blue-100 text-blue-800',
    internacional: 'bg-green-100 text-green-800',
    empresa: 'bg-orange-100 text-orange-800'
  }), []);

  useEffect(() => { void carregarDados(); }, [mesAtual]);

  async function carregarDados() {
    try {
      setLoading(true);
      const inicioMes = startOfMonth(mesAtual);
      const fimMes = endOfMonth(mesAtual);
      const [posts, datas] = await Promise.all([
        fetchCronograma(format(inicioMes, 'yyyy-MM-dd'), format(fimMes, 'yyyy-MM-dd')),
        fetchDatasEspeciais(format(inicioMes, 'yyyy-MM-dd'), format(fimMes, 'yyyy-MM-dd')),
      ]);
      setPostagens(posts ?? []);
      setDatasEspeciais(datas ?? []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao carregar dados do cronograma', variant: 'destructive' });
    } finally { setLoading(false); }
  }

  function obterPostagensDoDia(data: Date) {
    return postagens.filter(p => isSameDay(parseISO(p.data_postagem), data));
  }

  function obterDataEspecialDoDia(data: Date) {
    return datasEspeciais.find(d => isSameDay(parseISO(d.data_evento), data));
  }

  function contarDatasEspeciaisSemPostagem() {
    const count = datasEspeciais.filter(de => obterPostagensDoDia(parseISO(de.data_evento)).length === 0).length;
    setDatasEspeciaisSemPostagem(count);
  }

  useEffect(() => { if (postagens.length || datasEspeciais.length) contarDatasEspeciaisSemPostagem(); }, [postagens, datasEspeciais]);

  function navegarMes(dir: 'anterior'|'proximo') { setMesAtual(dir === 'anterior' ? subMonths(mesAtual,1) : addMonths(mesAtual,1)); }

  function abrirDialogNovaPostagem(data?: Date) { setPostagemEditando(undefined); setDataInicialDialog(data); setDialogOpen(true); }
  function abrirDialogEditarPostagem(p: PostagemCronograma) { setPostagemEditando(p); setDataInicialDialog(undefined); setDialogOpen(true); }

  async function excluirPostagemConfirmada() {
    if (!postagemVisualizando) return;
    if (!confirm(`Excluir a postagem "${postagemVisualizando.tema}"?`)) return;
    try { await deletePostagem(postagemVisualizando.id); toast({ title:'Sucesso', description:'Postagem excluída!' }); await carregarDados(); setModalPostagemOpen(false); setPostagemVisualizando(undefined);} catch (e:any){ toast({ title:'Erro', description:e.message||'Falha ao excluir', variant:'destructive' }); }
  }

  async function salvarDataEspecial(dados: Partial<DataEspecial>) {
    if (!dataEspecialEditando) return;
    try { await updateDataEspecial(dataEspecialEditando.id, dados); toast({ title:'Sucesso', description:'Data especial atualizada!' }); await carregarDados(); setModalDataEspecialOpen(false); setDataEspecialEditando(undefined);} catch (e:any){ toast({ title:'Erro', description:e.message||'Falha ao atualizar', variant:'destructive' }); }
  }

  async function excluirDataEspecialConfirmada() {
    if (!dataEspecialEditando) return;
    if (!confirm(`Excluir "${dataEspecialEditando.nome}"?`)) return;
    try { await deleteDataEspecial(dataEspecialEditando.id); toast({ title:'Sucesso', description:'Data especial excluída!' }); await carregarDados(); setModalDataEspecialOpen(false); setDataEspecialEditando(undefined);} catch (e:any){ toast({ title:'Erro', description:e.message||'Falha ao excluir', variant:'destructive' }); }
  }

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mesAtual), end: endOfMonth(mesAtual) });
  const gridCalendario = useMemo(() => { const i = startOfMonth(mesAtual); const vazio = Array(i.getDay()).fill(null); return [...vazio, ...diasDoMes]; }, [mesAtual, diasDoMes.length]);

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div><p className="mt-2 text-sm text-muted-foreground">Carregando cronograma...</p></div></div>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cronograma</h1>
          <p className="text-muted-foreground">Gerencie o cronograma mensal de postagens</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={async ()=>{ try{ setLoadingSugestoes(true); setModalSugestoesOpen(true); const s = await getSugestoesIAMock({ mes: mesAtual.getMonth()+1, ano: mesAtual.getFullYear() }); setSugestoesIA(s); } catch(e:any){ toast({ title:'Erro', description:e.message||'Falha ao buscar sugestões', variant:'destructive' }); } finally{ setLoadingSugestoes(false);} }}><Sparkles className="h-4 w-4 mr-2"/>Sugestões IA</Button>
          <Button variant={datasEspeciaisSemPostagem>0?"default":"outline"} className={datasEspeciaisSemPostagem>0?"bg-blue-600 hover:bg-blue-700":""}>
            <Calendar className="h-4 w-4 mr-2"/>Criar Postagens das Datas Especiais
            {datasEspeciaisSemPostagem>0 && (<Badge variant="secondary" className="ml-2">{datasEspeciaisSemPostagem}</Badge>)}
          </Button>
          <Button onClick={()=>abrirDialogNovaPostagem()}><Plus className="h-4 w-4 mr-2"/>Nova Postagem</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={()=>navegarMes('anterior')}><ChevronLeft className="h-4 w-4"/></Button>
            <CardTitle className="text-xl">{format(mesAtual,'MMMM yyyy',{locale:ptBR})}</CardTitle>
            <Button variant="outline" size="sm" onClick={()=>navegarMes('proximo')}><ChevronRight className="h-4 w-4"/></Button>
          </div>
          <CardDescription>{postagens.length} postagem(ns) para este mês</CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={viewMode} onValueChange={(v)=>setViewMode(v as any)}>
        <TabsList>
          <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-2"/>Calendário</TabsTrigger>
          <TabsTrigger value="table"><Table className="h-4 w-4 mr-2"/>Tabela</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-2 mb-4">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=> <div key={d} className="text-center font-medium text-sm text-muted-foreground p-2">{d}</div>)}</div>
              <div className="grid grid-cols-7 gap-2">
                {gridCalendario.map((dia,idx)=>{
                  if(!dia) return <div key={`empty-${idx}`} className="min-h-[100px] p-2 border border-dashed border-gray-200 rounded-lg opacity-30"/>;
                  const posts = obterPostagensDoDia(dia); const de = obterDataEspecialDoDia(dia);
                  return (
                    <div key={dia.toISOString()} className="min-h-[100px] p-2 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={()=>abrirDialogNovaPostagem(dia)}>
                      <div className="text-sm font-medium mb-2">{format(dia,'d')}</div>
                      {de && (
                        <div className="mb-1">
                          <Badge variant="outline" className={`text-xs ${tipoColors[de.tipo as keyof typeof tipoColors]} cursor-pointer hover:opacity-80`} onClick={(e)=>{e.stopPropagation(); setDataEspecialEditando(de); setModalDataEspecialOpen(true);}}>
                            {de.nome}
                          </Badge>
                        </div>
                      )}
                      {posts.map(p=> (
                        <div key={p.id} className={`text-xs p-1 rounded mb-1 border ${statusColors[p.status as keyof typeof statusColors]} cursor-pointer hover:opacity-80`} onClick={(e)=>{e.stopPropagation(); setPostagemVisualizando(p); setModalPostagemOpen(true);}}>
                          <div className="font-medium truncate">{p.tema}</div>
                          {p.eh_sugestao_ia && (<div className="text-xs opacity-75">🤖 IA</div>)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Tema</th>
                      <th className="text-left p-2">Descrição</th>
                      <th className="text-left p-2">Rede Social</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postagens.sort((a,b)=> new Date(a.data_postagem).getTime()-new Date(b.data_postagem).getTime()).map(p=> (
                      <tr key={p.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={()=>abrirDialogEditarPostagem(p)}>
                        <td className="p-2">{format(parseISO(p.data_postagem),'dd/MM/yyyy')}</td>
                        <td className="p-2 font-medium">{p.tema}</td>
                        <td className="p-2 text-sm text-muted-foreground">{p.descricao||'-'}</td>
                        <td className="p-2">{p.rede_social ? (<Badge variant="outline">{p.rede_social}</Badge>) : '-'}</td>
                        <td className="p-2"><Badge variant="outline" className={statusColors[p.status as keyof typeof statusColors]}>{p.status}</Badge></td>
                        <td className="p-2">{p.eh_sugestao_ia ? (<Badge variant="outline" className="bg-purple-100 text-purple-800">🤖 IA</Badge>) : (<Badge variant="outline">Manual</Badge>)}</td>
                      </tr>
                    ))}
                    {postagens.length===0 && (<tr><td colSpan={6} className="text-center p-8 text-muted-foreground">Nenhuma postagem encontrada para este mês</td></tr>)}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Nova/Editar */}
      <PostagemDialogV2 open={dialogOpen} onOpenChange={setDialogOpen} postagem={postagemEditando as any} onSave={carregarDados} dataInicial={dataInicialDialog}/>

      {/* Modal Data Especial */}
      {dataEspecialEditando && (
        <Dialog open={modalDataEspecialOpen} onOpenChange={setModalDataEspecialOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{dataEspecialEditando.nome}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-sm font-medium">Tipo</Label><Badge className={`ml-2 ${tipoColors[dataEspecialEditando.tipo as keyof typeof tipoColors]}`}>{dataEspecialEditando.tipo}</Badge></div>
              <div><Label className="text-sm font-medium">Data</Label><p className="text-sm text-muted-foreground">{format(parseISO(dataEspecialEditando.data_evento),"dd 'de' MMMM 'de' yyyy",{locale:ptBR})}</p></div>
              {dataEspecialEditando.descricao && (<div><Label className="text-sm font-medium">Descrição</Label><p className="text-sm text-muted-foreground">{dataEspecialEditando.descricao}</p></div>)}
              {dataEspecialEditando.sugestao_tema && (<div><Label className="text-sm font-medium">Sugestão de Tema</Label><p className="text-sm text-muted-foreground italic">"{dataEspecialEditando.sugestao_tema}"</p></div>)}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="destructive" size="sm" onClick={excluirDataEspecialConfirmada}><Trash2 className="w-4 h-4 mr-2"/>Excluir</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={()=>setModalDataEspecialOpen(false)}>Fechar</Button>
                <Button size="sm" onClick={()=>{ setModalDataEspecialOpen(false); }}><Edit className="w-4 h-4 mr-2"/>Editar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Visualização Postagem */}
      {postagemVisualizando && (
        <Dialog open={modalPostagemOpen} onOpenChange={setModalPostagemOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2">{postagemVisualizando.tema}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-sm font-medium">Data</Label><p className="text-sm text-muted-foreground">{format(parseISO(postagemVisualizando.data_postagem),"dd 'de' MMMM 'de' yyyy",{locale:ptBR})}</p></div>
              <div><Label className="text-sm font-medium">Rede Social</Label><Badge className="ml-2">{postagemVisualizando.rede_social||'instagram'}</Badge></div>
              <div><Label className="text-sm font-medium">Status</Label><Badge className={`ml-2 ${statusColors[postagemVisualizando.status as keyof typeof statusColors]}`}>{postagemVisualizando.status}</Badge></div>
              {postagemVisualizando.descricao && (<div><Label className="text-sm font-medium">Descrição</Label><p className="text-sm text-muted-foreground">{postagemVisualizando.descricao}</p></div>)}
              {postagemVisualizando.observacoes && (<div><Label className="text-sm font-medium">Observações</Label><p className="text-sm text-muted-foreground">{postagemVisualizando.observacoes}</p></div>)}
              <div className="flex items-center gap-2"><Label className="text-sm font-medium">Origem</Label><Badge variant={postagemVisualizando.eh_sugestao_ia?"secondary":"default"}>{postagemVisualizando.eh_sugestao_ia?"🤖 Sugestão IA":"👤 Manual"}</Badge></div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="destructive" size="sm" onClick={excluirPostagemConfirmada}><Trash2 className="w-4 h-4 mr-2"/>Excluir</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={()=>setModalPostagemOpen(false)}>Fechar</Button>
                <Button size="sm" onClick={()=>{ setModalPostagemOpen(false); setPostagemEditando(postagemVisualizando); setDialogOpen(true); setPostagemVisualizando(undefined); }}><Edit className="w-4 h-4 mr-2"/>Editar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <SugestoesIAModal
        isOpen={modalSugestoesOpen}
        onClose={()=>setModalSugestoesOpen(false)}
        sugestoes={sugestoesIA}
        isLoading={loadingSugestoes}
        onAdicionarSugestao={async (s: SugestaoIA)=>{
          try{
            await createPostagem({
              data_postagem: s.data_postagem,
              tema: s.tema,
              descricao: s.descricao,
              rede_social: s.rede_social as any,
              status: 'planejada',
              eh_sugestao_ia: true,
              observacoes: s.observacoes
            } as any);
            toast({ title:'Sucesso', description:'Sugestão adicionada ao cronograma!' });
            await carregarDados();
          }catch(e:any){
            toast({ title:'Erro', description:e.message||'Falha ao adicionar sugestão', variant:'destructive' });
          }
        }}
      />

    </div>
  );
};

export default CronogramaMarketing;

