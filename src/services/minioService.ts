/**
 * Serviço para integração com MinIO
 * Configurado para usar o servidor MinIO em nossagoma.com
 * Implementação usando fetch com autenticação S3
 */

// Configurações do MinIO
const MINIO_CONFIG = {
  // Sempre usar MinIO direto
  endpoint: 'https://minio0.nossagoma.com',

  accessKey: 'admin',
  secretKey: 'minha_senha',
  bucket: 'contratos',
  region: 'us-east-1'
};

// Função para criar assinatura AWS4
async function createSignature(
  method: string,
  url: string,
  headers: Record<string, string>,
  payload: string = ''
): Promise<string> {
  // Implementação simplificada - para desenvolvimento
  // Em produção, seria necessária uma implementação completa da assinatura AWS4
  const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const date = timestamp.substr(0, 8);

  return `AWS4-HMAC-SHA256 Credential=${MINIO_CONFIG.accessKey}/${date}/${MINIO_CONFIG.region}/s3/aws4_request, SignedHeaders=host;x-amz-date, Signature=dummy`;
}

export interface MinIOUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export class MinIOService {
  /**
   * Faz upload de um arquivo para o MinIO usando API REST simples
   */
  static async uploadFile(
    file: Blob | File,
    fileName: string,
    contentType: string = 'application/octet-stream'
  ): Promise<MinIOUploadResult> {
    try {
      console.log('📤 Iniciando upload para MinIO:', fileName);

      // URL do upload
      const uploadUrl = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucket}/${fileName}`;

      // Estratégia 1: Tentar com autenticação básica
      console.log('🔐 Tentativa 1: Upload com autenticação básica...');
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Authorization': `Basic ${btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)}`
      };

      // Fazer upload usando PUT
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file
      });

      if (response.ok) {
        const publicUrl = this.getPublicUrl(fileName);
        console.log('✅ Upload concluído (autenticação básica):', publicUrl);
        return {
          success: true,
          url: publicUrl,
          key: fileName
        };
      }

      // Estratégia 2: Tentar sem autenticação
      console.log('🔄 Tentativa 2: Upload sem autenticação...');
      const response2 = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        },
        body: file
      });

      if (response2.ok) {
        const publicUrl = this.getPublicUrl(fileName);
        console.log('✅ Upload concluído (sem autenticação):', publicUrl);
        return {
          success: true,
          url: publicUrl,
          key: fileName
        };
      }

      // Estratégia 3: Headers mínimos
      console.log('🔄 Tentativa 3: Upload com headers mínimos...');
      const response3 = await fetch(uploadUrl, {
        method: 'PUT',
        body: file
      });

      if (response3.ok) {
        const publicUrl = this.getPublicUrl(fileName);
        console.log('✅ Upload concluído (headers mínimos):', publicUrl);
        return {
          success: true,
          url: publicUrl,
          key: fileName
        };
      }

      // Se todas as estratégias falharam
      const errorMsg = `Todas as estratégias de upload falharam. Respostas: ${response.status}, ${response2.status}, ${response3.status}`;
      console.error('❌', errorMsg);

      return {
        success: false,
        error: errorMsg
      };

    } catch (error) {
      console.error('❌ Erro no upload para MinIO:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Faz upload de PDF para MinIO
   */
  static async uploadPDF(pdfBlob: Blob, contratoId: string): Promise<MinIOUploadResult> {
    const fileName = `contrato_${contratoId}_${Date.now()}.pdf`;
    return this.uploadFile(pdfBlob, fileName, 'application/pdf');
  }

  /**
   * Faz upload de HTML para MinIO
   */
  static async uploadHTML(htmlBlob: Blob, contratoId: string): Promise<MinIOUploadResult> {
    const fileName = `contrato_${contratoId}_${Date.now()}.html`;
    return this.uploadFile(htmlBlob, fileName, 'text/html');
  }

  /**
   * Gera URL pública para um arquivo
   */
  static getPublicUrl(fileName: string): string {
    return `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucket}/${fileName}`;
  }

  /**
   * Faz download de um arquivo do MinIO com fallback local
   */
  static async downloadFile(fileName: string): Promise<Blob | null> {
    try {
      // Verificar se existe no storage local primeiro
      const localStorage = (window as any).localPDFStorage;
      if (localStorage && localStorage[fileName]) {
        console.log('📥 Baixando arquivo do storage local:', fileName);
        const response = await fetch(localStorage[fileName]);
        return await response.blob();
      }

      // Tentar baixar do MinIO
      const url = this.getPublicUrl(fileName);
      console.log('📥 Baixando arquivo do MinIO:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)}`
        }
      });

      if (!response.ok) {
        // Tentar sem autenticação se der erro
        const responseNoAuth = await fetch(url, {
          method: 'GET'
        });

        if (!responseNoAuth.ok) {
          console.warn(`⚠️ Download do MinIO falhou: ${responseNoAuth.status} - ${responseNoAuth.statusText}`);
          return null;
        }

        return await responseNoAuth.blob();
      }

      return await response.blob();

    } catch (error) {
      console.error('❌ Erro ao baixar arquivo:', error);
      return null;
    }
  }

  /**
   * Verifica se o bucket existe usando HEAD request
   */
  static async checkBucket(): Promise<boolean> {
    try {
      const response = await fetch(`${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucket}/`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Basic ${btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)}`
        }
      });

      // Se der 401/403, tentar sem autenticação
      if (response.status === 401 || response.status === 403) {
        const responseNoAuth = await fetch(`${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucket}/`, {
          method: 'HEAD'
        });
        return responseNoAuth.ok || responseNoAuth.status === 403; // 403 pode indicar que existe mas não tem permissão
      }

      return response.ok;
    } catch (error) {
      console.warn('Erro ao verificar bucket:', error);
      return false;
    }
  }

  /**
   * Tenta criar o bucket se ele não existir
   */
  static async createBucketIfNotExists(): Promise<boolean> {
    try {
      const bucketExists = await this.checkBucket();

      if (!bucketExists) {
        console.log('📦 Tentando criar bucket:', MINIO_CONFIG.bucket);

        // Tentar criar bucket usando PUT
        const createResponse = await fetch(`${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucket}/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Basic ${btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)}`
          }
        });

        if (createResponse.ok) {
          console.log('✅ Bucket criado com sucesso');

          // Tentar configurar política pública
          try {
            const policyResponse = await fetch(`${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucket}/?policy`, {
              method: 'PUT',
              headers: {
                'Authorization': `Basic ${btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Principal: '*',
                    Action: 's3:GetObject',
                    Resource: `arn:aws:s3:::${MINIO_CONFIG.bucket}/*`
                  }
                ]
              })
            });

            if (policyResponse.ok) {
              console.log('✅ Política pública configurada');
            } else {
              console.warn('⚠️ Não foi possível configurar política pública');
            }
          } catch (policyError) {
            console.warn('⚠️ Erro ao configurar política:', policyError);
          }

          return true;
        } else {
          console.error('❌ Falha ao criar bucket:', createResponse.status, createResponse.statusText);
          return false;
        }
      }

      console.log('✅ Bucket já existe:', MINIO_CONFIG.bucket);
      return true;
    } catch (error) {
      console.error('❌ Erro ao criar bucket:', error);
      return false;
    }
  }



  /**
   * Lista buckets para testar conectividade
   */
  static async listBuckets(): Promise<string[]> {
    try {
      const response = await fetch(`${MINIO_CONFIG.endpoint}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)}`
        }
      });

      if (response.ok) {
        const text = await response.text();
        console.log('📋 Resposta do MinIO:', text);
        // Tentar extrair nomes de buckets da resposta XML
        const bucketMatches = text.match(/<Name>([^<]+)<\/Name>/g);
        if (bucketMatches) {
          return bucketMatches.map(match => match.replace(/<\/?Name>/g, ''));
        }
      }

      return [];
    } catch (error) {
      console.error('Erro ao listar buckets:', error);
      return [];
    }
  }

  /**
   * Teste básico de conectividade
   */
  static async testBasicConnection(): Promise<boolean> {
    try {
      // Primeiro, tentar listar buckets
      const buckets = await this.listBuckets();
      console.log('📋 Buckets encontrados:', buckets);

      if (buckets.length > 0) {
        return true;
      }

      // Se não conseguir listar, tentar HEAD no endpoint
      const response = await fetch(MINIO_CONFIG.endpoint, {
        method: 'HEAD'
      });

      // Qualquer resposta (mesmo 403) indica que o servidor está acessível
      return response.status < 500;
    } catch (error) {
      console.error('Erro na conexão básica:', error);
      return false;
    }
  }

  /**
   * Teste de diferentes métodos de autenticação
   */
  static async testAuthentication(): Promise<{
    method: string;
    success: boolean;
    details?: any;
  }[]> {
    const results = [];

    // Teste 1: Verificar se bucket existe (método mais direto)
    try {
      const response = await fetch(`${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucket}/`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Basic ${btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)}`
        }
      });

      results.push({
        method: 'Bucket Access (Basic Auth)',
        success: response.ok || response.status === 403, // 403 pode indicar que existe mas sem permissão
        details: {
          status: response.status,
          statusText: response.statusText,
          note: response.status === 403 ? 'Bucket existe mas sem permissão de listagem' : ''
        }
      });
    } catch (error) {
      results.push({
        method: 'Bucket Access (Basic Auth)',
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          type: 'CORS ou Network Error'
        }
      });
    }

    // Teste 2: Sem autenticação
    try {
      const response = await fetch(`${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucket}/`, {
        method: 'HEAD'
      });

      results.push({
        method: 'Bucket Access (No Auth)',
        success: response.ok || response.status === 403,
        details: {
          status: response.status,
          statusText: response.statusText,
          note: response.status === 403 ? 'Bucket existe mas sem permissão de listagem' : ''
        }
      });
    } catch (error) {
      results.push({
        method: 'Bucket Access (No Auth)',
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          type: 'CORS ou Network Error'
        }
      });
    }

    return results;
  }

  /**
   * Teste de conectividade com MinIO (simplificado)
   */
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🔍 Testando MinIO através de upload de teste...');

      // Teste direto: tentar fazer upload de um arquivo pequeno
      const testFile = new Blob(['Teste MinIO - ' + new Date().toISOString()], {
        type: 'text/plain'
      });

      const testFileName = `teste_conexao_${Date.now()}.txt`;
      const uploadResult = await this.uploadFile(testFile, testFileName, 'text/plain');

      if (uploadResult.success) {
        return {
          success: true,
          message: 'MinIO funcionando corretamente - upload de teste realizado com sucesso',
          details: {
            endpoint: MINIO_CONFIG.endpoint,
            bucket: MINIO_CONFIG.bucket,
            testFile: testFileName,
            url: uploadResult.url
          }
        };
      } else {
        // Analisar o tipo de erro
        const errorMsg = uploadResult.error || 'Erro desconhecido';

        if (errorMsg.includes('CORS')) {
          return {
            success: false,
            message: 'MinIO bloqueado por CORS - configure CORS no servidor MinIO',
            details: {
              endpoint: MINIO_CONFIG.endpoint,
              bucket: MINIO_CONFIG.bucket,
              problema: 'CORS Policy',
              solucao: 'Configure CORS no MinIO: mc admin config set myminio api cors_allow_origin="*"',
              erro: errorMsg
            }
          };
        } else if (errorMsg.includes('400')) {
          return {
            success: false,
            message: 'MinIO rejeitando requisições - verifique configuração do bucket',
            details: {
              endpoint: MINIO_CONFIG.endpoint,
              bucket: MINIO_CONFIG.bucket,
              problema: 'Bad Request (400)',
              solucao: 'Verifique se o bucket existe e tem permissões corretas',
              erro: errorMsg
            }
          };
        } else {
          return {
            success: false,
            message: 'Falha na conexão com MinIO',
            details: {
              endpoint: MINIO_CONFIG.endpoint,
              bucket: MINIO_CONFIG.bucket,
              erro: errorMsg
            }
          };
        }
      }

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao testar MinIO',
        details: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          endpoint: MINIO_CONFIG.endpoint
        }
      };
    }
  }
}


