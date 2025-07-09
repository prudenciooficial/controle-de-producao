import { supabase } from '@/integrations/supabase/client';
import { PDFService } from './pdfService';

export interface JobPDF {
  id: string;
  contrato_id: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  pdf_url?: string;
  hash_sha256?: string;
  tamanho_bytes?: number;
  erro_mensagem?: string;
  tentativas: number;
  max_tentativas: number;
  criado_em: string;
  atualizado_em: string;
  processado_em?: string;
}

/**
 * Serviço para processar jobs de geração de PDF automaticamente
 */
export class JobsPDFService {
  private static processandoJobs = false;
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Inicia o processamento automático de jobs
   */
  static iniciarProcessamento(intervalMs: number = 30000) {
    if (this.intervalId) {
      console.log('⚠️ Processamento de jobs já está ativo');
      return;
    }

    console.log('🚀 Iniciando processamento automático de jobs PDF...');
    
    // Processar imediatamente
    this.processarJobsPendentes();
    
    // Configurar intervalo
    this.intervalId = setInterval(() => {
      this.processarJobsPendentes();
    }, intervalMs);
  }

  /**
   * Para o processamento automático
   */
  static pararProcessamento() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Processamento automático de jobs parado');
    }
  }

  /**
   * Processa jobs pendentes
   */
  static async processarJobsPendentes() {
    if (this.processandoJobs) {
      console.log('⏳ Jobs já estão sendo processados...');
      return;
    }

    this.processandoJobs = true;

    try {
      console.log('🔍 Verificando jobs pendentes...');

      // Buscar jobs pendentes
      const { data: jobs, error } = await supabase
        .from('jobs_pdf_contratos')
        .select('*')
        .eq('status', 'pendente')
        .lt('tentativas', 3) // Máximo 3 tentativas
        .order('criado_em', { ascending: true })
        .limit(5); // Processar até 5 jobs por vez

      if (error) {
        console.error('❌ Erro ao buscar jobs:', error);
        return;
      }

      if (!jobs || jobs.length === 0) {
        console.log('✅ Nenhum job pendente encontrado');
        return;
      }

      console.log(`📋 ${jobs.length} job(s) pendente(s) encontrado(s)`);

      // Processar cada job
      for (const job of jobs) {
        await this.processarJob(job);
      }

    } catch (error) {
      console.error('❌ Erro no processamento de jobs:', error);
    } finally {
      this.processandoJobs = false;
    }
  }

  /**
   * Processa um job específico
   */
  static async processarJob(job: JobPDF) {
    try {
      console.log(`🔄 Processando job ${job.id} para contrato ${job.contrato_id}`);

      // Marcar como processando
      await this.atualizarStatusJob(job.id, 'processando');

      // Buscar dados do contrato
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos_comerciais')
        .select(`
          *,
          modelo:modelos_contratos(nome)
        `)
        .eq('id', job.contrato_id)
        .single();

      if (contratoError || !contrato) {
        throw new Error(`Contrato não encontrado: ${contratoError?.message}`);
      }

      // Verificar se já tem PDF
      if (contrato.pdf_url) {
        console.log(`✅ Contrato ${job.contrato_id} já possui PDF, marcando job como concluído`);
        await this.marcarJobConcluido(job.id, contrato.pdf_url, contrato.hash_documento, 0);
        return;
      }

      // Gerar PDF
      const dadosContratoPDF = {
        id: contrato.id,
        titulo: contrato.titulo,
        conteudo: contrato.conteudo,
        assinante_externo_nome: contrato.assinante_externo_nome,
        assinante_externo_email: contrato.assinante_externo_email,
        assinante_externo_documento: contrato.assinante_externo_documento,
        criado_em: contrato.criado_em,
        dados_variaveis: contrato.dados_variaveis,
        modelo: contrato.modelo
      };

      const resultadoPDF = await PDFService.gerarPDFContrato(dadosContratoPDF);

      // Atualizar contrato com dados do PDF
      await PDFService.atualizarContratoComPDF(job.contrato_id, resultadoPDF);

      // Marcar job como concluído
      await this.marcarJobConcluido(
        job.id,
        resultadoPDF.pdfUrl,
        resultadoPDF.hashSHA256,
        resultadoPDF.tamanhoBytes
      );

      console.log(`✅ Job ${job.id} processado com sucesso`);

    } catch (error) {
      console.error(`❌ Erro ao processar job ${job.id}:`, error);
      await this.marcarJobComErro(job.id, error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }

  /**
   * Atualiza status do job
   */
  static async atualizarStatusJob(jobId: string, status: JobPDF['status']) {
    const { error } = await supabase
      .from('jobs_pdf_contratos')
      .update({ 
        status,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Erro ao atualizar status do job:', error);
    }
  }

  /**
   * Marca job como concluído
   */
  static async marcarJobConcluido(
    jobId: string,
    pdfUrl: string,
    hashSha256: string,
    tamanhoBytes: number
  ) {
    const { error } = await supabase
      .from('jobs_pdf_contratos')
      .update({
        status: 'concluido',
        pdf_url: pdfUrl,
        hash_sha256: hashSha256,
        tamanho_bytes: tamanhoBytes,
        processado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Erro ao marcar job como concluído:', error);
    }
  }

  /**
   * Marca job com erro
   */
  static async marcarJobComErro(jobId: string, mensagemErro: string) {
    // Incrementar tentativas
    const { data: job } = await supabase
      .from('jobs_pdf_contratos')
      .select('tentativas, max_tentativas')
      .eq('id', jobId)
      .single();

    const novasTentativas = (job?.tentativas || 0) + 1;
    const maxTentativas = job?.max_tentativas || 3;

    const { error } = await supabase
      .from('jobs_pdf_contratos')
      .update({
        status: novasTentativas >= maxTentativas ? 'erro' : 'pendente',
        erro_mensagem: mensagemErro,
        tentativas: novasTentativas,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Erro ao marcar job com erro:', error);
    }
  }

  /**
   * Busca jobs por status
   */
  static async buscarJobsPorStatus(status: JobPDF['status']): Promise<JobPDF[]> {
    const { data, error } = await supabase
      .from('jobs_pdf_contratos')
      .select('*')
      .eq('status', status)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar jobs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Reprocessar job com erro
   */
  static async reprocessarJob(jobId: string) {
    const { error } = await supabase
      .from('jobs_pdf_contratos')
      .update({
        status: 'pendente',
        tentativas: 0,
        erro_mensagem: null,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Erro ao reprocessar job:', error);
      throw error;
    }

    console.log(`🔄 Job ${jobId} marcado para reprocessamento`);
  }

  /**
   * Estatísticas dos jobs
   */
  static async obterEstatisticas() {
    const { data, error } = await supabase
      .from('jobs_pdf_contratos')
      .select('status')
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }

    const stats = {
      total: data?.length || 0,
      pendente: data?.filter(j => j.status === 'pendente').length || 0,
      processando: data?.filter(j => j.status === 'processando').length || 0,
      concluido: data?.filter(j => j.status === 'concluido').length || 0,
      erro: data?.filter(j => j.status === 'erro').length || 0
    };

    return stats;
  }
}
