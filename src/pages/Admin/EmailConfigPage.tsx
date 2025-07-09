import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Mail, Settings, Database, FileText } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Importar componentes que foram movidos
import { TesteMinIO } from '@/components/admin/TesteMinIO';
import TesteMinIODiagnostico from '@/components/admin/TesteMinIODiagnostico';
import { TestePDF } from '@/components/admin/TestePDF';

import InstrucoesTabelaJobs from '@/components/admin/InstrucoesTabelaJobs';
import EmailConfigViewer from '@/components/Commercial/EmailConfigViewer';

export default function EmailConfigPage() {
  const [activeTab, setActiveTab] = useState('configuracao');

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Testes
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Teste e configure os sistemas de email, MinIO e certificados
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configuracao" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="minio" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              MinIO
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              PDF
            </TabsTrigger>
          </TabsList>

          {/* Configuração de Email */}
          <TabsContent value="configuracao" className="space-y-6">
            <InstrucoesTabelaJobs />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuração do Sistema de Email
                </CardTitle>
                <CardDescription>
                  Visualize e gerencie as configurações de email do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmailConfigViewer />
              </CardContent>
            </Card>
          </TabsContent>

          {/* MinIO Storage */}
          <TabsContent value="minio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Teste de Conectividade MinIO
                </CardTitle>
                <CardDescription>
                  Verifique a conectividade e teste o upload de arquivos no servidor MinIO
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TesteMinIO />
                <TesteMinIODiagnostico />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teste de PDF */}
          <TabsContent value="pdf" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Teste de Geração de PDF
                </CardTitle>
                <CardDescription>
                  Teste a funcionalidade de geração e download de PDFs de contratos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestePDF />
              </CardContent>
            </Card>
          </TabsContent>



        </Tabs>

        {/* Informações Adicionais */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Informações Importantes
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• <strong>Configuração:</strong> Visualize e gerencie as configurações de email do sistema</li>
                  <li>• <strong>MinIO:</strong> Teste a conectividade e upload de arquivos para o servidor de armazenamento</li>
                  <li>• <strong>PDF:</strong> Teste a geração de documentos PDF dos contratos</li>
                  <li>• Todas as configurações são aplicadas automaticamente ao sistema</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
