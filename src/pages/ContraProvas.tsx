import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Edit, Plus, Calendar, FlaskConical, Eye, Bell, AlertTriangle, Clock } from 'lucide-react';
import { format, addMonths, differenceInDays, parseISO, isToday, isTomorrow, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Interfaces para dados do Supabase
interface SupabaseContraProvaData {
  id: string;
  lote_produto: string;
  product_id: string;
  data_fabricacao: string;
  data_validade: string;
  data_descarte?: string;
  observacoes?: string;
  quantidade_amostras: number;
  created_at: string;
}

interface SupabaseAnaliseData {
  id: string;
  contra_prova_id: string;
  dia_analise: number;
  data_analise: string;
  status_analise: 'pendente' | 'realizada';
  observacoes_analise?: string;
  problemas_encontrados?: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseAnaliseComContraProva {
  id: string;
  contra_prova_id: string;
  dia_analise: number;
  data_analise: string;
  status_analise: string;
  observacoes_analise: string;
  problemas_encontrados: string;
  created_at: string;
  updated_at: string;
  contra_provas: {
    lote_produto: string;
    product_id: string;
    products: {
      name: string;
    };
  };
}

interface ContraProva {
  id: string;
  lote_produto: string;
  product_id: string;
  data_fabricacao: string;
  data_validade: string;
  data_descarte?: string;
  observacoes?: string;
  quantidade_amostras: number;
  created_at: string;
  product_name?: string;
}

interface Product {
  id: string;
  name: string;
}

interface AnaliseContraProva {
  id: string;
  contra_prova_id: string;
  dia_analise: number;
  data_analise: string;
  status_analise: 'pendente' | 'realizada';
  observacoes_analise?: string;
  problemas_encontrados?: string;
  created_at: string;
  updated_at: string;
}

interface NotificacaoAnalise {
  id: string;
  lote_produto: string;
  product_name: string;
  dia_analise: number;
  data_analise: string;
  dias_restantes: number;
  urgencia: 'hoje' | 'amanha' | 'proximos_dias' | 'atrasada';
}

const ContraProvas = () => {
  const [contraProvas, setContraProvas] = useState<ContraProva[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTableMissingAlert, setShowTableMissingAlert] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analisesDialogOpen, setAnalisesDialogOpen] = useState(false);
  const [analiseDialogOpen, setAnaliseDialogOpen] = useState(false);
  const [notificacoesDialogOpen, setNotificacoesDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContraProva | null>(null);
  const [selectedContraProva, setSelectedContraProva] = useState<ContraProva | null>(null);
  const [analises, setAnalises] = useState<AnaliseContraProva[]>([]);
  const [editingAnalise, setEditingAnalise] = useState<AnaliseContraProva | null>(null);
  const [notificacoes, setNotificacoes] = useState<NotificacaoAnalise[]>([]);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Form states
  const [formData, setFormData] = useState({
    lote_produto: '',
    product_id: '',
    data_fabricacao: '',
    data_validade: '',
    quantidade_amostras: '1',
    observacoes: ''
  });

  const [analiseFormData, setAnaliseFormData] = useState({
    observacoes_analise: '',
    problemas_encontrados: [{ id: 1, value: 'nenhuma' }] // Array de problemas
  });

  // Opções de problemas pré-definidas
  const problemasOptions = [
    { value: 'nenhuma', label: 'Nenhuma alteração detectada' },
    { value: 'alteracao_cor', label: 'Alteração de cor' },
    { value: 'alteracao_odor', label: 'Alteração de odor' },
    { value: 'alteracao_textura', label: 'Alteração de textura' },
    { value: 'outros', label: 'Outros problemas' }
  ];

  // Calcular total de páginas
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  
  // Funções de paginação
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Voltar para a primeira página
  };

  // Calcular informações de paginação
  const startRecord = (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, totalRecords);

  // Carregar produtos
  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar produtos.",
      });
    }
  }, []);



  // Criar análises manualmente (sem depender do trigger)
  const criarAnalisesManuais = async (contraProvaId: string, dataFabricacao: string) => {
    const diasAnalise = [30, 60, 90, 120, 150, 180];
    const analises = [];

    for (const dia of diasAnalise) {
      const dataAnalise = new Date(dataFabricacao);
      dataAnalise.setDate(dataAnalise.getDate() + dia);

      analises.push({
        contra_prova_id: contraProvaId,
        dia_analise: dia,
        data_analise: dataAnalise.toISOString().split('T')[0],
        status_analise: 'pendente'
      });
    }

    const { error } = await supabase
      .from('analises_contra_provas')
      .insert(analises);

    if (error) {
      console.error('Erro ao criar análises manuais:', error);
      throw error;
    }

    console.log(`✅ ${analises.length} análises criadas manualmente`);
  };

  // Verificar integridade do sistema de contra-provas
  const verificarIntegridade = async () => {
    try {
      // Verificar contra-provas sem análises
      const { data: contraProvas } = await supabase
        .from('contra_provas')
        .select('id, lote_produto');

      const { data: analises } = await supabase
        .from('analises_contra_provas')
        .select('contra_prova_id');

      if (contraProvas && analises) {
        const contraProvaIds = contraProvas.map(cp => cp.id);
        const analiseContraProvaIds = [...new Set(analises.map(a => a.contra_prova_id))];

        const contraProvasSemAnalises = contraProvas.filter(cp =>
          !analiseContraProvaIds.includes(cp.id)
        );

        if (contraProvasSemAnalises.length > 0) {
          console.warn('⚠️ Contra-provas sem análises:', contraProvasSemAnalises.length);

          // Criar análises para contra-provas órfãs
          for (const contraProva of contraProvasSemAnalises) {
            try {
              const { data: cpCompleta } = await supabase
                .from('contra_provas')
                .select('data_fabricacao')
                .eq('id', contraProva.id)
                .single();

              if (cpCompleta) {
                await criarAnalisesManuais(contraProva.id, cpCompleta.data_fabricacao);
              }
            } catch (error) {
              console.error(`Erro ao criar análises para ${contraProva.id}:`, error);
            }
          }
        }

        // Verificar análises órfãs
        const analiseOrfas = analises.filter(a =>
          !contraProvaIds.includes(a.contra_prova_id)
        );

        if (analiseOrfas.length > 0) {
          console.warn('⚠️ Análises órfãs encontradas:', analiseOrfas.length);
        }
      }

    } catch (error) {
      console.error('Erro ao verificar integridade:', error);
    }
  };

  // Carregar contra-provas
  const loadContraProvas = useCallback(async () => {
    try {
      setIsLoading(true);
      setShowTableMissingAlert(false);

      // Verificar integridade do sistema
      await verificarIntegridade();

      // Primeiro, contar o total de registros
      const { count: totalCount, error: countError } = await supabase
        .from('contra_provas')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        // Verificar se o erro é devido à tabela não existir
        if (countError.message?.includes('relation "contra_provas" does not exist') ||
            countError.code === 'PGRST116') {
          setShowTableMissingAlert(true);
          setContraProvas([]);
          setTotalRecords(0);
          return;
        }
        throw countError;
      }

      setTotalRecords(totalCount || 0);

      // Buscar as contra-provas com paginação
      const { data: contraProvasData, error: contraProvasError } = await supabase
        .from('contra_provas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(itemsPerPage)
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (contraProvasError) {
        // Verificar se o erro é devido à tabela não existir
        if (contraProvasError.message?.includes('relation "contra_provas" does not exist') ||
            contraProvasError.code === 'PGRST116') {
          setShowTableMissingAlert(true);
          setContraProvas([]);
          setTotalRecords(0);
          return;
        }
        throw contraProvasError;
      }
      
      // Verificar se há mais registros além dos 10 mostrados
      // setHasMoreRecords((totalCount || 0) > 10); // This line is no longer needed
      
      // Buscar os nomes dos produtos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name');

      if (productsError) throw productsError;
      
      // Combinar os dados
      const processedData = contraProvasData?.map((item: SupabaseContraProvaData) => {
        const product = productsData?.find(p => p.id === item.product_id);
        return {
          ...item,
          product_name: product?.name || 'Produto não encontrado'
        };
      }) || [];

      setContraProvas(processedData);
    } catch (error) {
      console.error('Erro ao carregar contra-provas:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar contra-provas.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  const loadAnalises = useCallback(async (contraProvaId: string) => {
    try {
      const { data, error } = await supabase
        .from('analises_contra_provas')
        .select('*')
        .eq('contra_prova_id', contraProvaId)
        .order('dia_analise');

      if (error) {
        if (error.message?.includes('relation "analises_contra_provas" does not exist') ||
            error.code === 'PGRST116') {
          setAnalises([]);
          return;
        }
        throw error;
      }
      setAnalises(data as AnaliseContraProva[] || []);
    } catch (error) {
      console.error('Erro ao carregar análises:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar análises.",
      });
    }
  }, []);

  const loadNotificacoes = useCallback(async () => {
    try {
      // Buscar todas as análises pendentes
      const { data: analisesPendentes, error } = await supabase
        .from('analises_contra_provas')
        .select(`
          *,
          contra_prova_id,
          contra_provas!inner(lote_produto, product_id, products(name))
        `)
        .eq('status_analise', 'pendente');

      if (error) {
        if (error.message?.includes('relation "analises_contra_provas" does not exist') ||
            error.code === 'PGRST116') {
          setNotificacoes([]);
          return;
        }
        console.error('Erro ao carregar análises pendentes:', error);
        return;
      }

      const hoje = new Date();
      const notificacoesCalculadas: NotificacaoAnalise[] = [];

      analisesPendentes?.forEach((analise: SupabaseAnaliseComContraProva) => {
        const dataAnalise = parseISO(analise.data_analise);
        const diasRestantes = differenceInDays(dataAnalise, hoje);
        
        // Considerar apenas análises que estão próximas (até 3 dias) ou atrasadas
        if (diasRestantes <= 3) {
          let urgencia: 'hoje' | 'amanha' | 'proximos_dias' | 'atrasada';
          
          if (diasRestantes < 0) {
            urgencia = 'atrasada';
          } else if (isToday(dataAnalise)) {
            urgencia = 'hoje';
          } else if (isTomorrow(dataAnalise)) {
            urgencia = 'amanha';
          } else {
            urgencia = 'proximos_dias';
          }

          notificacoesCalculadas.push({
            id: analise.id,
            lote_produto: analise.contra_provas.lote_produto,
            product_name: analise.contra_provas.products?.name || 'Produto desconhecido',
            dia_analise: analise.dia_analise,
            data_analise: analise.data_analise,
            dias_restantes: diasRestantes,
            urgencia
          });
        }
      });

      // Ordenar por urgência (atrasadas primeiro, depois hoje, amanhã, etc.)
      const ordemUrgencia = { 'atrasada': 0, 'hoje': 1, 'amanha': 2, 'proximos_dias': 3 };
      notificacoesCalculadas.sort((a, b) => ordemUrgencia[a.urgencia] - ordemUrgencia[b.urgencia]);

      setNotificacoes(notificacoesCalculadas);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  }, []);

  // Calcular validade automaticamente (6 meses)
  const calculateExpiryDate = (fabricationDate: string) => {
    if (!fabricationDate) return '';
    const fabrication = parseISO(fabricationDate);
    const expiry = addMonths(fabrication, 6);
    return format(expiry, 'yyyy-MM-dd');
  };

  // Calcular dias restantes
  const getDaysRemaining = (validityDate: string, discardDate?: string) => {
    if (discardDate) return null; // Já foi descartado
    
    const today = new Date();
    const validity = parseISO(validityDate);
    return differenceInDays(validity, today);
  };

  // Status da contra-prova
  const getStatus = (validityDate: string, discardDate?: string) => {
    if (discardDate) return 'descartado';
    
    const daysRemaining = getDaysRemaining(validityDate);
    if (daysRemaining === null) return 'descartado';
    if (daysRemaining < 0) return 'vencido';
    if (daysRemaining <= 30) return 'proximo_vencimento';
    return 'vigente';
  };

  const getStatusBadge = (status: string, daysRemaining: number | null) => {
    switch (status) {
      case 'descartado':
        return (
          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
            Descartado
          </Badge>
        );
      case 'vencido':
        return (
          <Badge className="bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800">
            Vencido
          </Badge>
        );
      case 'proximo_vencimento':
        return (
          <Badge className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
            {daysRemaining} dias restantes
          </Badge>
        );
      case 'vigente':
        return (
          <Badge className="bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800">
            {daysRemaining} dias restantes
          </Badge>
        );
      default:
        return null;
    }
  };

  // Status das análises
  const getAnaliseStatusBadge = (analise: AnaliseContraProva) => {
    const dataAnalise = parseISO(analise.data_analise);
    const hoje = new Date();
    const isPrazoVencido = dataAnalise < hoje;

    if (analise.status_analise === 'realizada') {
      return (
        <Badge className="bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800">
          Realizada
        </Badge>
      );
    } else if (isPrazoVencido) {
      return (
        <Badge className="bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800">
          Atrasada
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          Pendente
        </Badge>
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (contraProvas.length === 0) {
      toast({
        title: "Aviso",
        description: "Execute primeiro o script SQL para criar as tabelas necessárias.",
        variant: "default",
      });
      return;
    }
    
    try {
      if (editingItem) {
        // Atualizar
        const { error } = await supabase
          .from('contra_provas')
          .update({
            lote_produto: formData.lote_produto,
            product_id: formData.product_id,
            data_fabricacao: formData.data_fabricacao,
            data_validade: formData.data_validade,
            quantidade_amostras: parseInt(formData.quantidade_amostras),
            observacoes: formData.observacoes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Contra-prova atualizada com sucesso!",
        });
      } else {
        // Verificar se já existe uma contra-prova com o mesmo lote e produto
        try {
          const { data: existingContraProva, error: checkError } = await supabase
            .from('contra_provas')
            .select('id, lote_produto')
            .eq('lote_produto', formData.lote_produto)
            .eq('product_id', formData.product_id)
            .maybeSingle(); // Use maybeSingle() em vez de single()

          if (checkError) {
            console.warn('⚠️ Erro ao verificar duplicata (continuando):', checkError);
          }

          if (existingContraProva) {
            toast({
              variant: "destructive",
              title: "Contra-prova já existe",
              description: `Já existe uma contra-prova para o lote "${formData.lote_produto}" deste produto.`,
            });
            return;
          }
        } catch (checkError) {
          console.warn('⚠️ Falha na verificação de duplicata, continuando:', checkError);
        }

        // Nota: Limpeza automática removida - use o botão "🧹 Limpar Dados" se necessário

        // Criar nova
        console.log('📝 Dados da contra-prova:', {
          lote_produto: formData.lote_produto,
          product_id: formData.product_id,
          data_fabricacao: formData.data_fabricacao,
          data_validade: formData.data_validade,
          quantidade_amostras: parseInt(formData.quantidade_amostras),
          observacoes: formData.observacoes || null
        });

        // Tentar inserção com tratamento específico para trigger duplicado
        let data, error;

        try {
          // Primeira tentativa: inserção normal
          const result = await supabase
            .from('contra_provas')
            .insert({
              lote_produto: formData.lote_produto,
              product_id: formData.product_id,
              data_fabricacao: formData.data_fabricacao,
              data_validade: formData.data_validade,
              quantidade_amostras: parseInt(formData.quantidade_amostras),
              observacoes: formData.observacoes || null
            })
            .select();

          data = result.data;
          error = result.error;

        } catch (insertError: unknown) {
          // Se der erro de constraint, tentar recuperar
          const insertErrorObj = insertError as { code?: string; message?: string };
          if (insertErrorObj?.code === '23505' && insertErrorObj?.message?.includes('unique_analise_dia')) {
            console.log('🔄 Erro de trigger detectado, tentando recuperação...');

            // Buscar a contra-prova que pode ter sido criada
            const { data: contraProvaExistente } = await supabase
              .from('contra_provas')
              .select('*')
              .eq('lote_produto', formData.lote_produto)
              .eq('product_id', formData.product_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (contraProvaExistente) {
              console.log('✅ Contra-prova encontrada após erro de trigger:', contraProvaExistente.id);
              data = [contraProvaExistente];
              error = null;
            } else {
              throw insertError;
            }
          } else {
            throw insertError;
          }
        }

        if (error) {
          console.error('❌ Erro detalhado ao inserir contra-prova:', error);

          // Se ainda der erro, tentar criação manual (sem trigger)
          if (error?.code === '23505' && error?.message?.includes('unique_analise_dia')) {
            console.log('🔄 Tentando criação manual sem trigger...');

            try {
              // Desabilitar trigger temporariamente não é possível via client
              // Então vamos criar sem trigger e adicionar análises depois
              const { data: manualData, error: manualError } = await supabase
                .from('contra_provas')
                .insert({
                  lote_produto: formData.lote_produto + '_manual_' + Date.now(),
                  product_id: formData.product_id,
                  data_fabricacao: formData.data_fabricacao,
                  data_validade: formData.data_validade,
                  quantidade_amostras: parseInt(formData.quantidade_amostras),
                  observacoes: (formData.observacoes || '') + ' [Criado manualmente devido a erro de trigger]'
                })
                .select();

              if (manualError) throw manualError;

              // Criar análises manualmente
              if (manualData && manualData[0]) {
                await criarAnalisesManuais(manualData[0].id, formData.data_fabricacao);
                data = manualData;
                error = null;

                toast({
                  title: "Contra-prova criada manualmente",
                  description: "Devido a problemas com o trigger, a contra-prova foi criada manualmente com sucesso.",
                });
              }

            } catch (manualError) {
              console.error('❌ Erro na criação manual:', manualError);
              throw error; // Usar erro original
            }
          } else {
            throw error;
          }
        } else {
          console.log('✅ Contra-prova criada:', data);
        }

        toast({
          title: "Sucesso",
          description: "Contra-prova cadastrada com sucesso! As análises programadas foram criadas automaticamente.",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadContraProvas();
    } catch (error: unknown) {
      console.error('❌ Erro completo:', error);

      let errorMessage = "Erro ao salvar contra-prova. Tente novamente.";
      let shouldRetry = false;

      // Tratar erros específicos
      const errorObj = error as { code?: string; message?: string };
      if (errorObj?.code === '23505') {
        if (errorObj?.message?.includes('unique_analise_dia')) {
          errorMessage = "Erro interno: análises duplicadas detectadas. Tentando limpar dados inconsistentes...";
          shouldRetry = true;
        } else {
          errorMessage = "Já existe uma contra-prova com estes dados. Verifique o lote e produto.";
        }
      } else if (errorObj?.code === '23503') {
        errorMessage = "Produto selecionado não é válido. Selecione um produto da lista.";
      } else if (errorObj?.message?.includes('409')) {
        errorMessage = "Conflito de dados. Verifique se não há duplicatas ou dados inconsistentes.";
      } else if (errorObj?.message) {
        errorMessage = `Erro: ${errorObj.message}`;
      }

      // Se for erro de análises duplicadas, sugerir limpeza manual
      if (shouldRetry) {
        toast({
          title: "Dados inconsistentes detectados",
          description: "Clique no botão '🧹 Limpar Dados' e tente novamente.",
        });
        return;
      }

      toast({
        variant: "destructive",
        title: "Erro ao salvar contra-prova",
        description: errorMessage,
      });
    }
  };

  const handleAnaliseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAnalise) return;

    if (contraProvas.length === 0) {
      toast({
        title: "Aviso",
        description: "Execute primeiro o script SQL para criar as tabelas necessárias.",
        variant: "default",
      });
      return;
    }

    try {
      // Preparar o texto dos problemas baseado na seleção
      let problemasTexto = null;
      
      // Filtrar problemas que não são 'nenhuma'
      const problemasValidos = analiseFormData.problemas_encontrados.filter(p => p.value !== 'nenhuma');
      
      if (problemasValidos.length > 0) {
        const problemasLabels = problemasValidos.map(problema => {
          const problemaSelected = problemasOptions.find(p => p.value === problema.value);
          return problemaSelected ? problemaSelected.label : problema.value;
        });
        problemasTexto = problemasLabels.join('; '); // Separar múltiplos problemas com ponto e vírgula
      }

      const { error } = await supabase
        .from('analises_contra_provas')
        .update({
          status_analise: 'realizada',
          observacoes_analise: analiseFormData.observacoes_analise || null,
          problemas_encontrados: problemasTexto,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAnalise.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Análise registrada com sucesso!",
      });

      setAnaliseDialogOpen(false);
      setEditingAnalise(null);
      setAnaliseFormData({ observacoes_analise: '', problemas_encontrados: [{ id: 1, value: 'nenhuma' }] });
      
      if (selectedContraProva) {
        loadAnalises(selectedContraProva.id);
      }
      
      // Recarregar notificações após registrar análise
      loadNotificacoes();
    } catch (error) {
      // Erro ao salvar análise
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar análise. Tente novamente.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (contraProvas.length === 0) {
      toast({
        title: "Aviso",
        description: "Execute primeiro o script SQL para criar as tabelas necessárias.",
        variant: "default",
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta contra-prova?')) return;

    try {
      const { error } = await supabase
        .from('contra_provas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Contra-prova excluída com sucesso!",
      });

      loadContraProvas();
    } catch (error) {
      // Erro ao excluir contra-prova
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir contra-prova. Tente novamente.",
      });
    }
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: ContraProva) => {
    setEditingItem(item);
    setFormData({
      lote_produto: item.lote_produto,
      product_id: item.product_id,
      data_fabricacao: item.data_fabricacao,
      data_validade: item.data_validade,
      quantidade_amostras: item.quantidade_amostras.toString(),
      observacoes: item.observacoes || ''
    });
    setDialogOpen(true);
  };

  const openAnalisesDialog = async (item: ContraProva) => {
    setSelectedContraProva(item);
    await loadAnalises(item.id);
    setAnalisesDialogOpen(true);
  };

  const openAnaliseEditDialog = (analise: AnaliseContraProva) => {
    setEditingAnalise(analise);
    
    // Processar problemas existentes
    let problemasArray = [{ id: 1, value: 'nenhuma' }];
    
    if (analise.problemas_encontrados) {
      // Separar múltiplos problemas por ponto e vírgula
      const problemasTexto = analise.problemas_encontrados.split(';').map(p => p.trim());
      problemasArray = problemasTexto.map((problema, index) => {
        const problemaOption = problemasOptions.find(p => p.label === problema);
        return {
          id: index + 1,
          value: problemaOption ? problemaOption.value : 'outros'
        };
      });
    }
    
    setAnaliseFormData({
      observacoes_analise: analise.observacoes_analise || '',
      problemas_encontrados: problemasArray
    });
    
    setAnaliseDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      lote_produto: '',
      product_id: '',
      data_fabricacao: '',
      data_validade: '',
      quantidade_amostras: '1',
      observacoes: ''
    });
  };

  // Handle fabrication date change
  const handleFabricationDateChange = (date: string) => {
    setFormData(prev => ({
      ...prev,
      data_fabricacao: date,
      data_validade: calculateExpiryDate(date)
    }));
  };

  // Funções para gerenciar múltiplos problemas
  const adicionarProblema = () => {
    const novoId = Math.max(...analiseFormData.problemas_encontrados.map(p => p.id)) + 1;
    setAnaliseFormData(prev => ({
      ...prev,
      problemas_encontrados: [
        ...prev.problemas_encontrados,
        { id: novoId, value: 'nenhuma' }
      ]
    }));
  };

  const removerProblema = (id: number) => {
    if (analiseFormData.problemas_encontrados.length > 1) {
      setAnaliseFormData(prev => ({
        ...prev,
        problemas_encontrados: prev.problemas_encontrados.filter(p => p.id !== id)
      }));
    }
  };

  const atualizarProblema = (id: number, value: string) => {
    setAnaliseFormData(prev => ({
      ...prev,
      problemas_encontrados: prev.problemas_encontrados.map(p =>
        p.id === id ? { ...p, value } : p
      )
    }));
  };

  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia) {
      case 'atrasada':
        return 'bg-red-500 text-white dark:bg-red-600 dark:text-red-100';
      case 'hoje':
        return 'bg-orange-500 text-white dark:bg-orange-600 dark:text-orange-100';
      case 'amanha':
        return 'bg-yellow-500 text-black dark:bg-yellow-600 dark:text-yellow-100';
      case 'proximos_dias':
        return 'bg-blue-500 text-white dark:bg-blue-600 dark:text-blue-100';
      default:
        return 'bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-100';
    }
  };

  const getUrgenciaTexto = (urgencia: string, diasRestantes: number) => {
    switch (urgencia) {
      case 'atrasada':
        return `${Math.abs(diasRestantes)} dia(s) atrasada`;
      case 'hoje':
        return 'Hoje';
      case 'amanha':
        return 'Amanhã';
      case 'proximos_dias':
        return `Em ${diasRestantes} dias`;
      default:
        return '';
    }
  };

  // Carregar dados iniciais quando o componente montar
  useEffect(() => {
    const initializeData = async () => {
      await loadProducts();
      await loadContraProvas();
      await loadNotificacoes();
    };

    initializeData();
  }, [loadProducts, loadContraProvas, loadNotificacoes]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="space-y-8 p-6 lg:p-8">
        {/* Header com título e ações */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Controle de Contra-provas
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Sistema inteligente de controle de qualidade e análises programadas
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Botão de notificações com badge */}
            {notificacoes.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setNotificacoesDialogOpen(true)}
                className="relative border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-950 transition-all duration-200"
              >
                <Bell className="h-4 w-4 mr-2" />
                Notificações
                <Badge className="ml-2 bg-red-500 text-white dark:bg-red-600 dark:text-white text-xs px-2 py-1 animate-pulse">
                  {notificacoes.length}
                </Badge>
              </Button>
            )}
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all duration-200">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Contra-prova
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Alerta para tabelas não existentes */}
        {showTableMissingAlert && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <div className="space-y-2">
                <p className="font-medium">Tabelas de contra-provas não encontradas no banco de dados</p>
                <p className="text-sm">
                  As tabelas necessárias para o sistema de contra-provas ainda não foram criadas. 
                  Execute o script SQL na seção de migrações do Supabase ou contacte o administrador do sistema.
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium hover:text-amber-700 dark:hover:text-amber-300">
                    Ver script SQL necessário
                  </summary>
                  <pre className="mt-2 p-2 bg-amber-100 dark:bg-amber-900 rounded text-xs overflow-x-auto">
{`-- Execute este script no editor SQL do Supabase:
CREATE TABLE contra_provas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lote_produto VARCHAR(255) NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    data_fabricacao DATE NOT NULL,
    data_validade DATE NOT NULL,
    observacoes TEXT,
    quantidade_amostras INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);`}
                  </pre>
                </details>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total de Contra-provas */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total de Contra-provas
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {contraProvas.length}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Amostras em controle
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Análises Pendentes */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Análises Pendentes
                  </p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {notificacoes.length}
                  </p>
                </div>
                <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Requerem atenção
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contra-provas Vigentes */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Vigentes
                  </p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {contraProvas.filter(cp => getStatus(cp.data_validade, cp.data_descarte) === 'vigente').length}
                  </p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Dentro da validade
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Análises Atrasadas */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Atrasadas
                  </p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {notificacoes.filter(n => n.urgencia === 'atrasada').length}
                  </p>
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Análises em atraso
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista Principal */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-700">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-white">
              <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Registro de Contra-provas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                  <span>Carregando contra-provas...</span>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                    <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-transparent">
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100 py-4 px-6">Lote</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100 py-4">Produto</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100 py-4">Qtd. Amostras</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100 py-4">Fabricação</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100 py-4">Validade</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100 py-4">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100 py-4">Observações</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100 py-4 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contraProvas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <FlaskConical className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                            <div className="space-y-1">
                              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                Nenhuma contra-prova cadastrada
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Comece criando sua primeira contra-prova para controle de qualidade
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      contraProvas.map((item, index) => {
                        const status = getStatus(item.data_validade, item.data_descarte);
                        const daysRemaining = getDaysRemaining(item.data_validade, item.data_descarte);
                        
                        return (
                          <TableRow 
                            key={item.id} 
                            className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                          >
                            <TableCell className="font-mono font-medium text-gray-900 dark:text-gray-100 py-4 px-6">
                              {item.lote_produto}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="max-w-xs">
                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {item.product_name}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium">
                                <FlaskConical className="h-3 w-3" />
                                {item.quantidade_amostras}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-gray-700 dark:text-gray-300 py-4">
                              {format(parseISO(item.data_fabricacao), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-medium text-gray-700 dark:text-gray-300 py-4">
                              {format(parseISO(item.data_validade), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="py-4">
                              {getStatusBadge(status, daysRemaining)}
                            </TableCell>
                            <TableCell className="py-4">
                              {item.observacoes ? (
                                <div className="max-w-xs">
                                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate" title={item.observacoes}>
                                    {item.observacoes}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openAnalisesDialog(item)}
                                  title="Ver análises"
                                  className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors duration-150"
                                >
                                  <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(item)}
                                  title="Editar"
                                  className="h-8 w-8 p-0 hover:bg-amber-50 dark:hover:bg-amber-900/50 hover:border-amber-300 dark:hover:border-amber-700 transition-colors duration-150"
                                >
                                  <Edit className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    if (!confirm('Tem certeza que deseja descartar esta contra-prova?')) return;
                                    try {
                                      const { error } = await supabase
                                        .from('contra_provas')
                                        .update({ data_descarte: new Date().toISOString() })
                                        .eq('id', item.id);
                                      if (error) throw error;
                                      toast({
                                        title: 'Sucesso',
                                        description: 'Contra-prova descartada com sucesso!',
                                      });
                                      loadContraProvas();
                                    } catch (error) {
                                      toast({
                                        variant: 'destructive',
                                        title: 'Erro',
                                        description: 'Erro ao descartar contra-prova. Tente novamente.',
                                      });
                                    }
                                  }}
                                  title="Descartar"
                                  className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-colors duration-150"
                                >
                                  <Trash2 className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(item.id)}
                                  title="Excluir"
                                  className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-700 transition-colors duration-150"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Componente de Paginação */}
            {totalRecords > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Informações da página */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      Mostrando {startRecord} a {endRecord} de {totalRecords} contra-provas
                    </span>
                    
                    {/* Seletor de itens por página */}
                    <div className="flex items-center gap-2">
                      <span>Itens por página:</span>
                      <Select 
                        value={itemsPerPage.toString()} 
                        onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Controles de navegação */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="h-8 px-3"
                    >
                      Anterior
                    </Button>
                    
                    {/* Números das páginas */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNumber)}
                            className="h-8 w-8 p-0"
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="h-8 px-3"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog para Notificações */}
        <Dialog open={notificacoesDialogOpen} onOpenChange={setNotificacoesDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Notificações - Análises Pendentes
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {notificacoes.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma análise pendente no momento</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notificacoes.map((notificacao) => (
                    <div
                      key={notificacao.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={getUrgenciaColor(notificacao.urgencia)}>
                              {getUrgenciaTexto(notificacao.urgencia, notificacao.dias_restantes)}
                            </Badge>
                            <span className="font-medium dark:text-white">
                              Análise do {notificacao.dia_analise}º dia
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                            <div>
                              <span className="font-medium">Lote:</span> {notificacao.lote_produto}
                            </div>
                            <div>
                              <span className="font-medium">Produto:</span> {notificacao.product_name}
                            </div>
                            <div>
                              <span className="font-medium">Data programada:</span> {' '}
                              {format(parseISO(notificacao.data_analise), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                            <div className="flex items-center gap-1">
                              {notificacao.urgencia === 'atrasada' && (
                                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                              )}
                              <span className="font-medium">Status:</span>
                              <span className={`font-medium ${
                                notificacao.urgencia === 'atrasada' ? 'text-red-600 dark:text-red-400' : 
                                notificacao.urgencia === 'hoje' ? 'text-orange-600 dark:text-orange-400' :
                                notificacao.urgencia === 'amanha' ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'
                              }`}>
                                {getUrgenciaTexto(notificacao.urgencia, notificacao.dias_restantes)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Encontrar a contra-prova correspondente e abrir o modal de análises
                              const contraProva = contraProvas.find(cp => cp.lote_produto === notificacao.lote_produto);
                              if (contraProva) {
                                setNotificacoesDialogOpen(false);
                                openAnalisesDialog(contraProva);
                              }
                            }}
                          >
                            <FlaskConical className="h-4 w-4 mr-2" />
                            Fazer Análise
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setNotificacoesDialogOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para Análises */}
        <Dialog open={analisesDialogOpen} onOpenChange={setAnalisesDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Análises Programadas - {selectedContraProva?.lote_produto || 'Exemplo'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <span className="text-sm font-medium">Produto:</span>
                  <p className="text-sm">{selectedContraProva?.product_name || 'Produto de Exemplo'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Quantidade:</span>
                  <p className="text-sm">{selectedContraProva?.quantidade_amostras || 1} amostras</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Fabricação:</span>
                  <p className="text-sm">
                    {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Validade:</span>
                  <p className="text-sm">
                    {format(addMonths(new Date(), 6), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Cronograma de Análises</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dia</TableHead>
                        <TableHead>Data Programada</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Observações</TableHead>
                        <TableHead>Problemas</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analises.map((analise) => (
                        <TableRow key={analise.id}>
                          <TableCell className="font-medium">{analise.dia_analise}º dia</TableCell>
                          <TableCell>
                            {format(parseISO(analise.data_analise), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {getAnaliseStatusBadge(analise)}
                          </TableCell>
                          <TableCell>
                            {analise.observacoes_analise ? (
                              <div className="max-w-xs truncate" title={analise.observacoes_analise}>
                                {analise.observacoes_analise}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {analise.problemas_encontrados ? (
                              <div className="max-w-xs truncate" title={analise.problemas_encontrados}>
                                {analise.problemas_encontrados}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAnaliseEditDialog(analise)}
                            >
                              {analise.status_analise === 'realizada' ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para Registrar Análise */}
        <Dialog open={analiseDialogOpen} onOpenChange={setAnaliseDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                {editingAnalise && `Análise do ${editingAnalise.dia_analise}º dia`}
              </DialogTitle>
            </DialogHeader>

            {editingAnalise && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Lote:</span> {selectedContraProva?.lote_produto || 'Exemplo'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Data da análise:</span> {' '}
                    {format(parseISO(editingAnalise.data_analise), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>

                <form onSubmit={handleAnaliseSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="observacoes_analise">Observações da Análise Visual</Label>
                    <Textarea
                      id="observacoes_analise"
                      value={analiseFormData.observacoes_analise}
                      onChange={(e) => setAnaliseFormData(prev => ({ ...prev, observacoes_analise: e.target.value }))}
                      placeholder="Descreva como estava a contra-prova nesta análise..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="problemas_encontrados">Problemas Identificados</Label>
                    
                    {/* Lista de problemas */}
                    <div className="space-y-3">
                      {analiseFormData.problemas_encontrados.map((problema, index) => (
                        <div key={problema.id} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Select 
                              value={problema.value} 
                              onValueChange={(value) => atualizarProblema(problema.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o problema..." />
                              </SelectTrigger>
                              <SelectContent>
                                {problemasOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Botão para remover problema (só mostra se tem mais de 1) */}
                          {analiseFormData.problemas_encontrados.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removerProblema(problema.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Remover problema"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      {/* Botão para adicionar problema */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={adicionarProblema}
                        className="w-full mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar outro problema
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setAnaliseDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Registrar Análise
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog para Cadastro/Edição de Contra-prova */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[700px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-xl">
            <DialogHeader className="space-y-3 pb-6 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {editingItem ? 'Editar Contra-prova' : 'Nova Contra-prova'}
              </DialogTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {editingItem 
                  ? 'Atualize as informações da contra-prova selecionada' 
                  : 'Preencha os dados para cadastrar uma nova contra-prova com análises automáticas'
                }
              </p>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="lote_produto" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lote do Produto *
                  </Label>
                  <Input
                    id="lote_produto"
                    value={formData.lote_produto}
                    onChange={(e) => setFormData(prev => ({ ...prev, lote_produto: e.target.value }))}
                    placeholder="Ex: L240719001"
                    className="h-11 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 transition-colors duration-200"
                    required
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="product_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Produto *
                  </Label>
                  <Select 
                    value={formData.product_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}
                    required
                  >
                    <SelectTrigger className="h-11 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="data_fabricacao" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data de Fabricação *
                  </Label>
                  <Input
                    id="data_fabricacao"
                    type="date"
                    value={formData.data_fabricacao}
                    onChange={(e) => handleFabricationDateChange(e.target.value)}
                    className="h-11 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 transition-colors duration-200"
                    required
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="data_validade" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data de Validade *
                  </Label>
                  <Input
                    id="data_validade"
                    type="date"
                    value={formData.data_validade}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_validade: e.target.value }))}
                    className="h-11 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 transition-colors duration-200"
                    required
                  />
                  {formData.data_fabricacao && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Sugestão: 6 meses após fabricação
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="quantidade_amostras" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Qtd. Amostras *
                  </Label>
                  <Input
                    id="quantidade_amostras"
                    type="number"
                    min="1"
                    value={formData.quantidade_amostras}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantidade_amostras: e.target.value }))}
                    placeholder="1"
                    className="h-11 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 transition-colors duration-200"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="observacoes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Observações
                </Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações gerais sobre a contra-prova..."
                  className="min-h-[100px] border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 transition-colors duration-200 resize-none"
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="px-6 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all duration-200"
                >
                  {editingItem ? 'Atualizar Contra-prova' : 'Cadastrar Contra-prova'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ContraProvas; 