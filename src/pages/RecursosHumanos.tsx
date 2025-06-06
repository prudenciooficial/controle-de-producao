
import React from "react";
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Recursos Humanos</h1>
          <p className="text-muted-foreground">
            Gestão de funcionários, jornadas de trabalho e controle de ponto
          </p>
        </div>
      </div>

      <Tabs defaultValue="funcionarios" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="funcionarios" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Funcionários
          </TabsTrigger>
          <TabsTrigger value="jornadas" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Jornadas
          </TabsTrigger>
          <TabsTrigger value="feriados" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Feriados
          </TabsTrigger>
          <TabsTrigger value="controle-ponto" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Controle de Ponto
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funcionarios">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Funcionários</CardTitle>
              <CardDescription>
                Cadastre e gerencie os funcionários da empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            <CardContent>
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
            <CardContent>
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
            <CardContent>
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
            <CardContent>
              <ConfiguracaoEmpresaTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RecursosHumanos;
