import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function DefaultRoute() {
  const { user, hasPermission, hasRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    console.log('🏠 DefaultRoute: Iniciando verificação de redirecionamento');
    console.log('👤 Usuário:', user?.email);
    console.log('🔒 Loading:', loading);

    if (!user) {
      console.log('❌ Sem usuário, redirecionando para /auth');
      navigate('/auth');
      return;
    }

    // Se for admin, pode acessar dashboard
    if (hasRole('admin')) {
      console.log('👑 Admin detectado, redirecionando para /dashboard');
      navigate('/dashboard');
      return;
    }

    // Verificar se tem permissão para dashboard
    const hasDashboardPermission = hasPermission('dashboard', 'view');
    console.log('📊 Permissão Dashboard:', hasDashboardPermission);
    
    if (hasDashboardPermission) {
      console.log('✅ Tem permissão para dashboard, redirecionando para /dashboard');
      navigate('/dashboard');
    } else {
      console.log('❌ Sem permissão para dashboard, redirecionando para /welcome');
      // Se não tem permissão para dashboard, vai para página de apresentação
      navigate('/welcome');
    }
  }, [user, loading, hasPermission, hasRole, navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return null;
} 