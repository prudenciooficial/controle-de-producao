import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'editor' | 'viewer';
  requiredModule?: string;
  requiredPermission?: 'view' | 'create' | 'edit' | 'delete';
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredModule, 
  requiredPermission 
}: ProtectedRouteProps) {
  const { user, hasPermission, hasRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!loading && user && requiredRole && !hasRole(requiredRole)) {
      navigate('/welcome');
      return;
    }

    if (!loading && user && requiredModule && requiredPermission) {
      const hasAccess = hasPermission(requiredModule, requiredPermission);
      if (!hasAccess) {
        navigate('/welcome');
      }
    }
  }, [user, loading, requiredRole, requiredModule, requiredPermission, navigate, hasPermission, hasRole]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
