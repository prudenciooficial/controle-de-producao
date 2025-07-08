/**
 * Configurações de email para envio real
 * Configure com suas credenciais e servidor SMTP
 */

export interface EmailConfig {
  // Configurações do servidor SMTP
  smtp: {
    host: string;
    port: number;
    secure: boolean; // true para 465, false para outras portas
    auth: {
      user: string;
      pass: string;
    };
  };
  
  // Configurações do remetente
  from: {
    name: string;
    email: string;
  };
  
  // Configurações específicas
  provider: 'gmail' | 'outlook' | 'custom';
  enabled: boolean;
}

/**
 * Configurações de email por provedor
 * IMPORTANTE: Configure com suas credenciais reais
 */
export const EMAIL_CONFIGS: Record<string, EmailConfig> = {
// Configuração Google Workspace
gmail: {
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: 'marketing@nossagoma.com.br',
      pass: 'jwdb brja pkhb msee'
    }
  },
  from: {
    name: 'Sistema de Contratos - Nossa Goma',
    email: 'marketing@nossagoma.com.br'
  },
  provider: 'gmail',
  enabled: true // IMPORTANTE: Configuração ativa
},

  // Outlook/Hotmail
  outlook: {
    smtp: {
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: {
        user: 'seu-email@outlook.com', // CONFIGURE AQUI
        pass: 'sua-senha' // CONFIGURE AQUI
      }
    },
    from: {
      name: 'Sistema de Contratos',
      email: 'seu-email@outlook.com' // CONFIGURE AQUI
    },
    provider: 'outlook',
    enabled: false // MUDE PARA true APÓS CONFIGURAR
  },

  // Servidor personalizado
  custom: {
    smtp: {
      host: 'mail.seudominio.com.br', // CONFIGURE AQUI
      port: 587,
      secure: false,
      auth: {
        user: 'contratos@seudominio.com.br', // CONFIGURE AQUI
        pass: 'sua-senha' // CONFIGURE AQUI
      }
    },
    from: {
      name: 'Sistema de Contratos - Sua Empresa',
      email: 'contratos@seudominio.com.br' // CONFIGURE AQUI
    },
    provider: 'custom',
    enabled: false // MUDE PARA true APÓS CONFIGURAR
  }
};

/**
 * Configuração ativa (escolha qual usar)
 * Opções: 'gmail', 'outlook', 'custom'
 */
export const ACTIVE_EMAIL_PROVIDER = 'gmail'; // CONFIGURE AQUI

/**
 * Obtém a configuração de email ativa
 */
export function getActiveEmailConfig(): EmailConfig {
  const config = EMAIL_CONFIGS[ACTIVE_EMAIL_PROVIDER];
  
  if (!config) {
    throw new Error(`Configuração de email não encontrada para: ${ACTIVE_EMAIL_PROVIDER}`);
  }
  
  if (!config.enabled) {
    throw new Error(`Configuração de email não está habilitada para: ${ACTIVE_EMAIL_PROVIDER}`);
  }
  
  return config;
}

/**
 * Valida se a configuração de email está completa
 */
export function validateEmailConfig(config: EmailConfig): boolean {
  return !!(
    config.smtp.host &&
    config.smtp.port &&
    config.smtp.auth.user &&
    config.smtp.auth.pass &&
    config.from.email &&
    config.from.name
  );
}

/**
 * Instruções de configuração por provedor
 */
export const EMAIL_SETUP_INSTRUCTIONS = {
  gmail: {
    title: 'Configuração Google Workspace',
    steps: [
      '1. Acesse sua conta Google Workspace (admin.google.com)',
      '2. Vá em "Segurança" > "Verificação em duas etapas"',
      '3. Ative a verificação em duas etapas para sua conta',
      '4. Vá em "Senhas de aplicativo"',
      '5. Gere uma senha de aplicativo para "Email"',
      '6. Configure no arquivo emailConfig.ts:',
      '   - user: seu-email@seudominio.com.br',
      '   - pass: senha-de-aplicativo-gerada',
      '   - from.email: seu-email@seudominio.com.br',
      '7. Mude enabled: true'
    ],
    notes: [
      'Funciona com qualquer domínio gerenciado pelo Google Workspace',
      'Use sempre senhas de aplicativo, nunca sua senha pessoal',
      'Verifique se SMTP está habilitado no admin do Workspace',
      'Teste primeiro com um cliente de email como Outlook'
    ]
  },
  
  outlook: {
    title: 'Configuração Outlook',
    steps: [
      '1. Acesse sua conta Microsoft',
      '2. Vá em "Segurança"',
      '3. Ative a "Verificação em duas etapas"',
      '4. Gere uma "Senha de aplicativo"',
      '5. Use essa senha na configuração'
    ],
    notes: [
      'Funciona com @outlook.com, @hotmail.com, @live.com',
      'Use sempre senhas de aplicativo',
      'Verifique se SMTP está habilitado'
    ]
  },
  
  custom: {
    title: 'Servidor Personalizado',
    steps: [
      '1. Obtenha as configurações SMTP do seu provedor',
      '2. Configure host, porta e credenciais',
      '3. Teste a conexão antes de usar',
      '4. Verifique se o domínio está configurado corretamente'
    ],
    notes: [
      'Consulte seu provedor de hospedagem',
      'Verifique configurações de SPF e DKIM',
      'Teste com um cliente de email primeiro'
    ]
  }
};

/**
 * Configurações de desenvolvimento/teste
 */
export const DEV_EMAIL_CONFIG = {
  // Para desenvolvimento, usar serviços como Mailtrap, Ethereal, etc.
  enabled: false, // Desabilitado para envio real
  testMode: false,
  logOnly: false // Enviar emails reais
};
