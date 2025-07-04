import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logSystemEvent } from '@/services/logService';
import { SessionExpiredModal } from '@/components/ui/SessionExpiredModal';

// Definir permissões padrão
const defaultPermissions = {
  system_status: 'active' as const,
  modules_access: {
    dashboard: false,
    production: false,
    human_resources: false,
    quality: false,
    administrator: false
  },
  pages_access: {
    dashboard: false,
    mexida: false,
    producao: false,
    vendas: false,
    pedidos: false,
    estoque: false,
    perdas: false,
    cadastro: false,
    recursos_humanos: false,
    reclamacoes: false,
    contra_provas: false,
    rastreabilidade: false,
    usuarios: false,
    logs: false,
    debug_permissions: false
  },
  can_view_system_logs: false
};

// Estruturas de permissões para referência (devem ser consistentes com UserPermissionsDialog)
interface NewDetailedPermissions {
  system_status: 'active' | 'inactive';
  modules_access: { [moduleKey: string]: boolean };
  pages_access: { [pageKey: string]: boolean };
  can_view_system_logs?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  hasPermission: (permissionKey: string, permissionType?: 'module' | 'page') => boolean;
  hasRole: (role: string) => boolean;
  canViewSystemLogs: () => boolean;
  getSession: () => Promise<Session | null>;
  getUserDisplayName: () => string;
  checkJWTError: (error: AuthError | Error | unknown) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const { toast } = useToast();

  // Função para verificar se é erro de JWT expirado
  const checkJWTError = (error: AuthError | Error | unknown): boolean => {
    const errorObj = error as { message?: string };
    if (errorObj && errorObj.message?.toLowerCase().includes('jwt expired')) {
      toast({
        title: 'Sessão expirada',
        description: 'Sua sessão expirou, faça login novamente.',
        variant: 'destructive',
      });
      supabase.auth.signOut().finally(() => {
        setUser(null);
        setSession(null);
        window.location.href = '/login';
      });
      return true;
    }
    return false;
  };

  // Função para reconectar
  const handleReconnect = async () => {
    setShowSessionExpiredModal(false);
    setLoading(true);
    
    try {
      // Fazer sign out completo primeiro
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      
      // Redirecionar para a página de login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Forçar redirecionamento mesmo com erro
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Auth state changed
      
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setSession(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session.user);
        setSession(session);
        // Adicionar log de login (não bloquear o fluxo)
        logSystemEvent({
          userId: session.user.id,
          userDisplayName: session.user.user_metadata?.full_name || session.user.email,
          actionType: 'LOGIN',
          entityTable: 'auth.users',
          entityId: session.user.id,
          newData: {
            email: session.user.email,
            login_time: new Date().toISOString(),
          },
        }).catch(e => {
          // Não bloquear login por erro de log
          console.error('Erro ao registrar log de login:', e);
        });
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username,
            role: 'user',
            permissions: defaultPermissions,
          },
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
    } catch (error) {
      // Erro ao fazer logout
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permissionKey: string, permissionType?: 'module' | 'page'): boolean => {
    if (!user) return false;

    if (user.user_metadata?.role === 'admin') return true;

    const detailedPermissions = user.user_metadata?.permissions as NewDetailedPermissions | undefined;
    if (!detailedPermissions || detailedPermissions.system_status !== 'active') {
      return false;
    }

    if (permissionType === 'module') {
      if (detailedPermissions.modules_access?.[permissionKey] !== true) {
        return false;
      }
    } else if (permissionType === 'page') {
      if (detailedPermissions.pages_access?.[permissionKey] !== true) {
        return false;
      }
    }

    return true;
  };

  const hasRole = (role: string): boolean => {
    return user?.user_metadata?.role === role;
  };

  const canViewSystemLogs = (): boolean => {
    if (!user) return false;
    if (user.user_metadata?.role === 'admin') return true;
    const detailedPermissions = user.user_metadata?.permissions as NewDetailedPermissions | undefined;
    return detailedPermissions?.can_view_system_logs === true;
  };

  const getSession = async (): Promise<Session | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        return null;
      }
      return session;
    } catch (error) {
      return null;
    }
  };

  const getUserDisplayName = () => {
    if (!user) return 'Usuário';
    return user.user_metadata?.full_name || user.user_metadata?.username || user.email || 'Usuário';
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
    hasRole,
    canViewSystemLogs,
    getSession,
    getUserDisplayName,
    checkJWTError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* Modal de Sessão Expirada */}
      <SessionExpiredModal 
        open={showSessionExpiredModal}
        onReconnect={handleReconnect}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const getUserDisplayName = () => {
    const { user } = context;
    if (!user) return 'Usuário';
    return user.user_metadata?.full_name || user.user_metadata?.username || user.email || 'Usuário';
  };

  return {
    ...context,
    getUserDisplayName,
  };
}
