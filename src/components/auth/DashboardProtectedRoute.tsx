
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardProtectedRouteProps {
  children: React.ReactNode;
}

export function DashboardProtectedRoute({ children }: DashboardProtectedRouteProps) {
  const { user, hasPermission, hasRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    // Se for admin, pode acessar
    if (hasRole('admin')) {
      return;
    }

    // Verificar se tem permissão para dashboard
    const hasDashboardPermission = hasPermission('dashboard', 'page');
    
    if (!hasDashboardPermission) {
      // Se não tem permissão para dashboard, redireciona para welcome
      navigate('/welcome');
    }
  }, [user, loading, hasPermission, hasRole, navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user) {
    return null;
  }

  // Se for admin, sempre permite
  if (hasRole('admin')) {
    return <>{children}</>;
  }

  // Se tem permissão para dashboard, permite
  const hasDashboardPermission = hasPermission('dashboard', 'page');
  if (hasDashboardPermission) {
    return <>{children}</>;
  }

  // Se não tem permissão, não renderiza nada (já foi redirecionado)
  return null;
} 
