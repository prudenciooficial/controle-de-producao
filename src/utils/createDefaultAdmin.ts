
import { supabase } from '@/integrations/supabase/client';

export const createDefaultAdmin = async () => {
  try {
    // Verificar se já existe um usuário admin
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .limit(1);

    if (checkError) {
      console.error('Erro ao verificar usuários admin existentes:', checkError);
      return;
    }

    // Se já existe um admin, não criar outro
    if (existingUsers && existingUsers.length > 0) {
      console.log('Usuário admin já existe');
      return;
    }

    // Criar o usuário admin padrão
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@admin',
      password: 'admin@123',
    });

    if (authError) {
      console.error('Erro ao criar usuário auth:', authError);
      return;
    }

    if (authData.user) {
      // Inserir o usuário na tabela users com role admin
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: 'admin@admin',
          name: 'Administrador',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Erro ao inserir usuário na tabela users:', insertError);
        return;
      }

      console.log('Usuário admin padrão criado com sucesso');
    }
  } catch (error) {
    console.error('Erro ao criar usuário admin padrão:', error);
  }
};
