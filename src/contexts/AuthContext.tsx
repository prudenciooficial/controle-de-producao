import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
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

    if (actionKey === 'read') { 
      if (!moduleSpecificActions) return true; 
      return moduleSpecificActions.read === true;
    }
    
    if (!moduleSpecificActions || moduleSpecificActions[actionKey as keyof ModuleActions] !== true) {
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
    return !!detailedPermissions?.can_view_system_logs;
  };

  const getSession = async (): Promise<Session | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error getting session:", error);
      return null;
    }
    return data.session;
  };

  const value: AuthContextType = {
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");

  // Helper para obter o nome de exibição do usuário autenticado
  const getUserDisplayName = () => {
    const { user } = context;
    if (!user) return undefined;
    // Tenta pegar o full_name, depois username, depois email, depois id
    return (
      user.user_metadata?.full_name ||
      user.user_metadata?.username ||
      user.email ||
      user.id
    );
  };

  return { ...context, getUserDisplayName };
}
