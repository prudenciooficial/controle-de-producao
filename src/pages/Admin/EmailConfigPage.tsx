import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Mail, Settings, Database, FileText } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

import { TesteEmail } from '@/components/admin/TesteEmail';

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
              Teste e configure o sistema de email
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="configuracao" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuração de Email
            </TabsTrigger>
          </TabsList>

          {/* Configuração de Email */}
          <TabsContent value="configuracao" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Teste de Email
                </CardTitle>
                <CardDescription>
                  Teste o envio de emails do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TesteEmail />
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
                  <li>• <strong>Teste de Email:</strong> Verifique se o sistema de email está funcionando corretamente</li>
                  <li>• Configure as credenciais de email nas variáveis de ambiente</li>
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
