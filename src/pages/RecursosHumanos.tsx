import React from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, Settings, FileText } from "lucide-react";
import { FuncionariosTab } from "@/components/hr/FuncionariosTab";
import { JornadasTab } from "@/components/hr/JornadasTab";
import { FeriadosTab } from "@/components/hr/FeriadosTab";
import { ConfiguracaoEmpresaTab } from "@/components/hr/ConfiguracaoEmpresaTab";
import { ControlePontoTab } from "@/components/hr/ControlePontoTab";

const RecursosHumanos = () => {
  return (
    <ProtectedRoute requiredModule="human_resources" requiredPermission="view">
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Recursos Humanos</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gestão de funcionários, jornadas de trabalho e controle de ponto
            </p>
          </div>
        </div>

        <Tabs defaultValue="funcionarios" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-5 min-w-[600px] h-auto">
              <TabsTrigger value="funcionarios" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Funcionários</span>
                <span className="sm:hidden">Func.</span>
              </TabsTrigger>
              <TabsTrigger value="jornadas" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Jornadas</span>
                <span className="sm:hidden">Jorn.</span>
              </TabsTrigger>
              <TabsTrigger value="feriados" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Feriados</span>
                <span className="sm:hidden">Fer.</span>
              </TabsTrigger>
              <TabsTrigger value="controle-ponto" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Controle de Ponto</span>
                <span className="sm:hidden">Ponto</span>
              </TabsTrigger>
              <TabsTrigger value="configuracoes" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configurações</span>
                <span className="sm:hidden">Config.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="funcionarios">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Funcionários</CardTitle>
                <CardDescription>
                  Cadastre e gerencie os funcionários da empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <FuncionariosTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jornadas">
            <Card>
              <CardHeader>
                <CardTitle>Jornadas de Trabalho</CardTitle>
                <CardDescription>
                  Configure os modelos de jornadas de trabalho
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <JornadasTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feriados">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Feriados</CardTitle>
                <CardDescription>
                  Cadastre e gerencie feriados nacionais, estaduais e municipais
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <FeriadosTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controle-ponto">
            <Card>
              <CardHeader>
                <CardTitle>Controle de Ponto</CardTitle>
                <CardDescription>
                  Gere folhas de controle de ponto para os funcionários
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <ControlePontoTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuracoes">
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Empresa</CardTitle>
                <CardDescription>
                  Configure os dados da empresa para relatórios
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <ConfiguracaoEmpresaTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
};

export default RecursosHumanos;
