import { useState } from 'react';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, Eye, EyeOff, PackageSearch } from 'lucide-react';

export default function Auth() {
  const { user, signIn, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    await signIn(email, password);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Painel Esquerdo (Visual) - Visível em telas grandes */}
      <div className="hidden lg:flex lg:flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-sky-100 dark:from-slate-900 dark:to-sky-800 p-12 border-r dark:border-slate-800">
        <div className="text-center">
          <PackageSearch className="mx-auto h-24 w-24 text-primary mb-6" /> 
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
            Bem-vindo ao Sistema de Produção
          </h1>
          <p className="text-lg text-muted-foreground">
            Gerencie sua produção de forma eficiente e integrada.
          </p>
          {/* Você pode adicionar mais elementos aqui, como um carrossel de features ou depoimentos */}
        </div>
      </div>

      {/* Painel Direito (Formulário) */}
      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-background lg:bg-transparent dark:lg:bg-transparent">
        <Card className="w-full max-w-md shadow-xl border-border/40 dark:border-border/20 lg:border-none lg:shadow-none dark:lg:border-none">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold tracking-tight">
              Sistema de Produção
            </CardTitle>
            <CardDescription className="pt-1">
              Acesse sua conta para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 px-6 sm:px-8">
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    disabled={isSubmitting}
                    className="pl-10 h-12 rounded-md"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password">Senha</Label>
                  <RouterLink 
                    to="#"
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </RouterLink>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    disabled={isSubmitting}
                    className="pl-10 pr-10 h-12 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground h-7 w-7 flex items-center justify-center"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold bg-primary hover:bg-primary/90 active:scale-[0.98]" 
                disabled={isSubmitting || loading}
              >
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
