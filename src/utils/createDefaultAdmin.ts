
import { supabase } from '@/integrations/supabase/client';

export const createDefaultAdmin = async () => {
  try {
    // Verifica se já existe um admin
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Erro ao verificar usuários existentes:', listError);
      return;
    }

    // Verifica se já existe um usuário com role admin
    const adminExists = existingUsers.users.some(user => 
      user.user_metadata?.role === 'admin'
    );

    if (adminExists) {
      console.log('Usuário admin já existe');
      return;
    }

    // Cria o usuário admin padrão
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@admin',
      password: 'admin@123',
      user_metadata: {
        full_name: 'Administrador do Sistema',
        username: 'admin',
        role: 'admin',
      },
      email_confirm: true, // Confirma o email automaticamente
    });

    if (error) {
      console.error('Erro ao criar usuário admin:', error);
    } else {
      console.log('Usuário admin criado com sucesso:', data);
    }
  } catch (error) {
    console.error('Erro no processo de criação do admin:', error);
  }
};
