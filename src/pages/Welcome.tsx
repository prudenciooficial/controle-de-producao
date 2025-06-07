import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, User, Calendar, ShieldCheck } from 'lucide-react';

export default function Welcome() {
  const { user, getUserDisplayName } = useAuth();

  const userPermissions = user?.user_metadata?.permissions;
  const userRole = user?.user_metadata?.role;

  // Obter módulos disponíveis para o usuário
  const getAvailableModules = () => {
    if (!userPermissions?.modules_access) return [];
    
    const moduleNames: { [key: string]: string } = {
      dashboard: 'Dashboard',
      production: 'Produção',
      sales: 'Vendas',
      orders: 'Pedidos',
      inventory: 'Estoque',
      losses: 'Perdas',
      traceability: 'Rastreabilidade',
      general_settings: 'Cadastro',
      human_resources: 'Recursos Humanos',
      user_management: 'Gerenciamento de Usuários'
    };

    return Object.entries(userPermissions.modules_access)
      .filter(([_, hasAccess]) => hasAccess)
      .map(([moduleKey, _]) => moduleNames[moduleKey] || moduleKey);
  };

  const availableModules = getAvailableModules();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <img 
            src="/images/NossaGoma.png" 
            alt="Nossa Goma Logo"
            className="h-16 w-auto"
          />
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Bem-vindo ao Sistema de Controle de Produção
        </h1>
        <p className="text-lg text-muted-foreground">
          Nossa Goma - Gestão Inteligente de Processos
        </p>
      </div>

      <Separator className="my-8" />

      {/* User Info Card */}
      <Card className="shadow-sm">
        <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl">
            <User className="h-5 w-5" />
            Informações do Usuário
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Detalhes da sua conta e permissões de acesso
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nome</p>
                <p className="font-semibold">{getUserDisplayName()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Perfil</p>
                <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
                  {userRole === 'admin' ? 'Administrador' : 
                   userRole === 'editor' ? 'Editor' : 
                   userRole === 'viewer' ? 'Visualizador' : 'Usuário'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Último Acesso</p>
                <p className="font-semibold">
                  {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                <p className="font-semibold">Nossa Goma</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Modules Card */}
      <Card className="shadow-sm">
        <CardHeader className="bg-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl">
            <ShieldCheck className="h-5 w-5" />
            Módulos Disponíveis
          </CardTitle>
          <CardDescription className="text-green-100">
            Funcionalidades que você tem permissão para acessar
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {availableModules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableModules.map((module, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="p-3 text-center justify-center font-medium"
                >
                  {module}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-lg">
                Nenhum módulo disponível. Entre em contato com o administrador do sistema.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="shadow-sm">
        <CardHeader className="bg-orange-500 text-white rounded-t-lg">
          <CardTitle className="text-xl">Como usar o sistema</CardTitle>
          <CardDescription className="text-orange-100">
            Navegue pelos módulos disponíveis usando o menu lateral
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-muted-foreground">
                <strong>Menu Lateral:</strong> Use o menu à esquerda para navegar entre os módulos disponíveis para seu perfil.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-muted-foreground">
                <strong>Permissões:</strong> Você só verá os módulos para os quais tem permissão de acesso.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-muted-foreground">
                <strong>Suporte:</strong> Em caso de dúvidas ou necessidade de novas permissões, entre em contato com o administrador do sistema.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-muted-foreground text-sm pt-4">
        <p>&copy; 2024 Nossa Goma. Todos os direitos reservados.</p>
        <p>Sistema de Controle de Produção v1.0</p>
      </div>
    </div>
  );
} 