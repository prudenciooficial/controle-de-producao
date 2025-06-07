import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logSystemEvent } from '@/services/logService';
import { SessionExpiredModal } from '@/components/ui/SessionExpiredModal';

// Estruturas de permissões para referência (devem ser consistentes com UserPermissionsDialog)
interface ModuleActions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}
interface DetailedPermissions {
  system_status: 'active' | 'inactive';
  modules_access: { [moduleKey: string]: boolean };
  module_actions: { [moduleKey: string]: ModuleActions };
  can_view_system_logs?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasPermission: (moduleKey: string, actionKey: string) => boolean;
  hasRole: (role: string) => boolean;
  canViewSystemLogs: () => boolean;
  getSession: () => Promise<Session | null>;
  getUserDisplayName: () => string;
  checkJWTError: (error: any) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const { toast } = useToast();

  // Função para verificar se é erro de JWT expirado
  const checkJWTError = (error: any): boolean => {
    if (error && 
        (error.code === 'PGRST301' || 
         error.message?.includes('JWT expired') ||
         error.message?.includes('jwt expired') ||
         (error.details === null && error.hint === null && error.message === 'JWT expired'))) {
      
      console.log('🔒 JWT expirado detectado:', error);
      setShowSessionExpiredModal(true);
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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          console.log('🔄 Auth state changed:', event);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Se o token foi removido/expirado, esconder o modal
        if (!session) {
          setShowSessionExpiredModal(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: "Email ou senha incorretos.",
        });
      } else {
        toast({
          title: "Login realizado",
          description: "Bem-vindo ao sistema!",
        });
        
        // Log do login
        if (data.user) {
          await logSystemEvent({
            userId: data.user.id,
            userDisplayName: data.user.user_metadata?.full_name || data.user.email || 'Usuário',
            actionType: 'LOGIN',
            entityTable: 'auth_sessions',
            entityId: data.session?.access_token?.substring(0, 10) || 'unknown',
            newData: {
              email: data.user.email,
              login_time: new Date().toISOString()
            }
          });
        }
      }

      return { error };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username,
            role: 'viewer', // Default role
          },
        },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no cadastro",
          description: error.message,
        });
      } else {
        toast({
          title: "Cadastro realizado",
          description: "Conta criada com sucesso!",
        });
      }

      return { error };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Log do logout antes de fazer o signOut
      if (user) {
        await logSystemEvent({
          userId: user.id,
          userDisplayName: user.user_metadata?.full_name || user.email || 'Usuário',
          actionType: 'LOGOUT',
          entityTable: 'auth_sessions',
          entityId: 'logout-' + Date.now(),
          oldData: {
            email: user.email,
            logout_time: new Date().toISOString()
          }
        });
      }
      
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado do sistema.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (moduleKey: string, actionKey: string): boolean => {
    if (!user) return false;

    if (user.user_metadata?.role === 'admin') return true;

    const detailedPermissions = user.user_metadata?.permissions as DetailedPermissions | undefined;
    if (!detailedPermissions || detailedPermissions.system_status !== 'active') {
      return false;
    }

    if (detailedPermissions.modules_access?.[moduleKey] !== true) {
      return false;
    }

    const moduleSpecificActions = detailedPermissions.module_actions?.[moduleKey];

    // Tratar 'view' como sinônimo de 'read'
    const normalizedActionKey = actionKey === 'view' ? 'read' : actionKey;

    if (normalizedActionKey === 'read') { 
      if (!moduleSpecificActions) return true; 
      return moduleSpecificActions.read === true;
    }
    
    if (!moduleSpecificActions || moduleSpecificActions[normalizedActionKey as keyof ModuleActions] !== true) {
      return false;
    }

    return true;
  };

  const hasRole = (role: string): boolean => {
    return user?.user_metadata?.role === role;
  };

  const canViewSystemLogs = (): boolean => {
    if (!user) return false;
    if (user.user_metadata?.role === 'admin') return true;
    const detailedPermissions = user.user_metadata?.permissions as DetailedPermissions | undefined;
    return detailedPermissions?.can_view_system_logs === true;
  };

  const getSession = async (): Promise<Session | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
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
