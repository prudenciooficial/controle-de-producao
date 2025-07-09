# 📧 Configuração de Email com Resend

## 🎯 Problema Identificado
O sistema está configurado para usar Gmail SMTP, mas pode haver problemas de conectividade ou autenticação. O Resend é uma alternativa mais confiável para envio de emails transacionais.

## 🔧 Solução Recomendada: Usar Resend

### Passo 1: Criar Conta no Resend
1. Acesse: https://resend.com
2. Crie uma conta gratuita
3. Verifique seu domínio (ou use o domínio de teste)

### Passo 2: Obter API Key
1. No dashboard do Resend, vá em "API Keys"
2. Clique em "Create API Key"
3. Dê um nome (ex: "Sistema Contratos")
4. Copie a API Key gerada

### Passo 3: Configurar no Supabase
1. Acesse o dashboard do Supabase
2. Vá em "Settings" > "Environment Variables"
3. Adicione a variável:
   - Nome: `RESEND_API_KEY`
   - Valor: sua API key do Resend

### Passo 4: Testar
1. Use o componente "Teste de Email" na página de usuários
2. Verifique os logs no console do navegador
3. Confirme se o email chegou na caixa de entrada

## 🔄 Fallback Atual
O sistema está configurado com múltiplos fallbacks:

1. **Resend API** (recomendado)
2. **Gmail SMTP** (atual)
3. **Simulação** (desenvolvimento)

## 📋 Configuração Atual do Gmail
```typescript
gmail: {
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'marketing@nossagoma.com.br',
      pass: 'jwdb brja pkhb msee' // Senha de aplicativo
    }
  },
  from: {
    name: 'Sistema de Contratos - Nossa Goma',
    email: 'marketing@nossagoma.com.br'
  },
  provider: 'gmail',
  enabled: true
}
```

## 🚨 Possíveis Problemas com Gmail
1. **Senha de aplicativo expirada**
2. **Verificação em duas etapas desabilitada**
3. **Conta bloqueada por atividade suspeita**
4. **Configurações de segurança do Google Workspace**

## ✅ Vantagens do Resend
- ✅ Mais confiável para emails transacionais
- ✅ Melhor deliverability
- ✅ API simples e robusta
- ✅ Logs detalhados
- ✅ Suporte a domínios personalizados
- ✅ Gratuito até 3.000 emails/mês

## 🔍 Diagnóstico
Para diagnosticar problemas:

1. **Verifique os logs** no console do navegador
2. **Use o componente de teste** na página de usuários
3. **Verifique as variáveis de ambiente** no Supabase
4. **Confirme se a Edge Function** está deployada

## 📞 Próximos Passos
1. Configure o Resend (recomendado)
2. OU verifique/renove a senha de aplicativo do Gmail
3. Teste o envio usando o componente de teste
4. Monitore os logs para identificar problemas específicos
